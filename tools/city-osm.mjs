// Budynki Warszawy z OpenStreetMap do laboratorium miasta (CityKit): obrys budynku i jego części (Simple 3D Buildings:
// building:part z wysokością, min_height, kształtem dachu, kolorem) w metrach od środka budynku. Wynik:
// js/models/city/landmarks/osm-data.js (moduł ES, bez pobierania w trakcie działania). Dane © współtwórcy OpenStreetMap
// (ODbL). Uruchamiane w GitHub Actions (.github/workflows/city-osm.yml — stąd jest dostęp do Overpass) albo lokalnie:
//   node tools/city-osm.mjs            (dopisuje brakujące; FORCE=1 — pobiera wszystkie od nowa)
// Budynek: nazwa (wyrażenie), punkt i promień szukania; części — building:part, których środek leży w obrysie budynku.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const LANDMARKS = [
  { id: 'pkin', name: 'Pałac Kultury i Nauki', re: 'Pałac Kultury', lat: 52.23175, lon: 21.00586, r: 220 },
  { id: 'centralna', name: 'Warszawa Centralna (dworzec)', re: 'Warszawa Centralna|Dworzec Centralny', lat: 52.22880, lon: 21.00330, r: 260 },
  { id: 'zlota44', name: 'Złota 44', re: 'Złota 44', lat: 52.22975, lon: 21.00290, r: 160 },
  { id: 'intercontinental', name: 'InterContinental', re: 'InterContinental', lat: 52.23140, lon: 21.00290, r: 160 },
  { id: 'varso', name: 'Varso Tower', re: 'Varso Tower|Varso Place|Varso 3|Varso III', lat: 52.22890, lon: 20.99780, r: 260 },
  { id: 'spire', name: 'Warsaw Spire', re: 'Warsaw Spire|Spire', lat: 52.23270, lon: 20.98380, r: 220 },
  { id: 'rondo1', name: 'Rondo 1', re: 'Rondo 1', lat: 52.23380, lon: 21.00050, r: 180 },
  { id: 'cosmopolitan', name: 'Cosmopolitan', re: 'Cosmopolitan', lat: 52.23490, lon: 21.00180, r: 180 },
  { id: 'wtt', name: 'Warsaw Trade Tower', re: 'Warsaw Trade Tower|WTT', lat: 52.23830, lon: 20.98250, r: 600 },
];
const KEEP = ['name', 'building', 'building:part', 'height', 'min_height', 'building:levels', 'building:min_level', 'roof:shape', 'roof:height', 'roof:levels', 'roof:colour', 'building:colour', 'building:material', 'roof:material'];
const UA = 'GameLaboratory-city/1.0 (+https://github.com/michalstankiewicz4-cell/GameLaboratory)';
const SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

async function overpass(q) {
  for (const url of SERVERS) {
    try {
      const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, signal: AbortSignal.timeout(120000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return (await r.json()).elements;
    } catch (e) { console.warn('Overpass', url, e.message); }
  }
  throw new Error('Overpass: no server answered');
}

// pierścienie z odcinków dróg relacji (łączenie końcami)
function rings(ways) {
  const segs = ways.map((w) => w.slice()), out = [];
  const same = (a, b) => a.lat === b.lat && a.lon === b.lon;
  while (segs.length) {
    let r = segs.pop();
    for (let guard = 0; !same(r[0], r[r.length - 1]) && guard < 1000; guard++) {
      const i = segs.findIndex((s) => same(s[0], r[r.length - 1]) || same(s[s.length - 1], r[r.length - 1]));
      if (i < 0) break;
      let s = segs.splice(i, 1)[0]; if (!same(s[0], r[r.length - 1])) s = s.reverse();
      r = r.concat(s.slice(1));
    }
    if (r.length > 3 && same(r[0], r[r.length - 1])) out.push(r);
  }
  return out;
}
const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > pt[1]) !== (zj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - zi) / (zj - zi) + xi) c = !c; } return c; };
const centroid = (p) => { let x = 0, z = 0; for (const q of p) { x += q[0]; z += q[1]; } return [x / p.length, z / p.length]; };

// element z geometrią (out geom) → { outer: [[x, z]…], holes } w metrach od punktu lat0, lon0 (północ = −z)
function shapeOf(el, lat0, lon0) {
  const KX = 111320 * Math.cos(lat0 * Math.PI / 180), KY = 110574;
  const xz = (g) => g.map((n) => [(n.lon - lon0) * KX, -(n.lat - lat0) * KY]);
  if (el.type === 'way' && el.geometry) { const p = xz(el.geometry); p.pop(); return [{ outer: p, holes: [] }]; }
  if (el.type !== 'relation' || !el.members) return [];
  const outs = rings(el.members.filter((m) => m.type === 'way' && m.geometry && m.role !== 'inner').map((m) => m.geometry)).map((r) => { const p = xz(r); p.pop(); return p; });
  const ins = rings(el.members.filter((m) => m.type === 'way' && m.geometry && m.role === 'inner').map((m) => m.geometry)).map((r) => { const p = xz(r); p.pop(); return p; });
  return outs.map((o) => ({ outer: o, holes: ins.filter((h) => inside(centroid(h), o)) }));
}
const tagsOf = (t = {}) => Object.fromEntries(KEEP.filter((k) => t[k] != null).map((k) => [k, t[k]]));
const r2 = (p) => p.map(([x, z]) => [Math.round(x * 100) / 100, Math.round(z * 100) / 100]);

async function landmark(L) {
  const q = `[out:json][timeout:90];(nwr["building"](around:${L.r},${L.lat},${L.lon});nwr["building:part"](around:${L.r},${L.lat},${L.lon}););out geom;`;
  const els = await overpass(q), re = new RegExp(L.re, 'i');
  const named = els.filter((e) => e.tags && e.tags.building && re.test(e.tags.name || ''));
  if (!named.length) throw new Error(`${L.id}: no building named /${L.re}/ (found: ${[...new Set(els.filter((e) => e.tags && e.tags.name).map((e) => e.tags.name))].slice(0, 30).join(' | ')})`);
  // najwyższy pasujący budynek (przy tej samej wysokości — największy)
  let main = null, mainShape = null, best = 0, bestK = -1;
  for (const e of named) for (const s of shapeOf(e, L.lat, L.lon)) {
    const a = Math.abs(area(s.outer)), k = (parseFloat(e.tags.height) || 0) * 1e7 + a;
    if (k > bestK) { bestK = k; best = a; main = e; mainShape = s; }
  }
  // części: building:part ze środkiem w obrysie (i nie większe od budynku)
  const parts = [];
  for (const e of els) {
    if (!e.tags || !e.tags['building:part'] || e.tags['building:part'] === 'no') continue;
    for (const s of shapeOf(e, L.lat, L.lon)) {
      if (Math.abs(area(s.outer)) > best * 1.05 || !inside(centroid(s.outer), mainShape.outer)) continue;
      parts.push({ osm: `${e.type}/${e.id}`, tags: tagsOf(e.tags), ...s });
    }
  }
  // środek: środek prostokąta otaczającego obrys budynku
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of mainShape.outer) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, sh = (p) => r2(p.map(([x, z]) => [x - cx, z - cz]));
  const fix = (s) => ({ ...s, outer: sh(s.outer), holes: s.holes.map(sh) });
  console.log(`${L.id}: ${main.type}/${main.id} "${main.tags.name}", ${Math.round(best)} m², ${parts.length} parts`);
  return {
    name: L.name, osm: `${main.type}/${main.id}`, osmName: main.tags.name, tags: tagsOf(main.tags),
    lat: Math.round((L.lat - cz / 110574) * 1e6) / 1e6, lon: Math.round((L.lon + cx / (111320 * Math.cos(L.lat * Math.PI / 180))) * 1e6) / 1e6,
    ...fix(mainShape), parts: parts.map(fix),
  };
}

// to, co już pobrane, zostaje (Overpass bywa przeciążony — kolejne uruchomienie dopisuje brakujące)
const FILE = 'js/models/city/landmarks/osm-data.js';
const old = existsSync(FILE) && !process.env.FORCE ? (await import(pathToFileURL(FILE).href)).default : {};
const out = {}, errors = [];
for (const L of LANDMARKS) {
  const query = { re: L.re, lat: L.lat, lon: L.lon, r: L.r };
  if (old[L.id] && JSON.stringify(old[L.id].query) === JSON.stringify(query)) { out[L.id] = old[L.id]; continue; }   // zmieniony wpis — od nowa
  let last = null;
  for (let k = 0; k < 3 && !out[L.id]; k++) {
    try { out[L.id] = { ...(await landmark(L)), query }; } catch (e) { last = e; console.error(e.message); if (/no building named/.test(e.message)) break; await new Promise((r) => setTimeout(r, 20000)); }
  }
  if (!out[L.id] && old[L.id] && !/no building named/.test(String(last && last.message))) out[L.id] = old[L.id];   // nie odpowiedział — zostaje to, co było
  if (!out[L.id] && last) errors.push(L.id + ': ' + last.message);
  await new Promise((r) => setTimeout(r, 3000));
}
mkdirSync('js/models/city/landmarks', { recursive: true });
writeFileSync(FILE, `// Budynki Warszawy z OpenStreetMap (tools/city-osm.mjs) — dane © współtwórcy OpenStreetMap, licencja ODbL
// (https://www.openstreetmap.org/copyright). Metry od środka budynku, x na wschód, z na południe; pobrane ${new Date().toISOString().slice(0, 10)}.
// Plik generowany — nie edytować ręcznie.
export const OSM_SOURCE = '© OpenStreetMap contributors (ODbL)';
export const OSM_ERRORS = ${JSON.stringify(errors)};
export default ${JSON.stringify(out)};
`);
console.log('written js/models/city/landmarks/osm-data.js:', Object.keys(out).join(', '), errors.length ? `· errors: ${errors.length}` : '');
