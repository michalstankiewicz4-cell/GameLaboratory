// CityKit — budynki Warszawy z OpenStreetMap (osm-data.js, tools/city-osm.mjs): bryła z mapy (obrys budynku i jego
// części z wysokością, początkiem nad gruntem, kształtem i wysokością dachu, kolorami — Simple 3D Buildings),
// wygląd z CityKit (styl budynku: mur, okna, parter, gzymsy — fasady siatką z bliska i wypalone z paralaksą z daleka).
// Dane © współtwórcy OpenStreetMap (ODbL).
// buildLandmark(id, { detail, style, ppm }) → { group, spec, info, stats, tiles, parts, setLit, dispose }
//   style — opis budynku CityKit (types.js) nadpisujący styl budynku; obrys, kondygnacje i dachy są z mapy
import * as THREE from '../../../../vendor/three/three.module.js';
import DATA, { OSM_SOURCE } from './osm-data.js';
import { TYPES, normalizeSpec } from '../types.js';
import { PRESETS as MAT } from '../../../render/materials/matkit.js';
import { cleanPolygon } from '../footprint.js';

export { OSM_SOURCE };
const mat = (id, over) => ({ ...MAT[id], ...over });
const glassTower = (glass, frame, extra = {}) => ({
  type: 'tower', floorH: 3.7, groundH: 6, bay: 1.6, wall: mat('aluminium', { color: frame, tile: 2 }),
  window: { ...TYPES.tower.window, glass, frame }, ground: { front: 'glass', sides: 'glass', entrances: 1, door: '#2a2f33' },
  roof: { ...TYPES.tower.roof, parapet: 1 }, lit: 0.5, ...extra,
});
// styl każdego budynku (rodzaj z types.js i to, czym się różni) — wygląd „po naszemu”, bryła z mapy
const STYLES = {
  pkin: {
    type: 'tenement', floorH: 3.6, groundH: 5.2, bay: 2.4, module: ['window'], wall: mat('plaster', { color: '#d6c9ab', tile: 2, trowel: 0.3 }),
    window: { style: 'punched', w: 1.0, h: 2.0, sill: 0.9, mullions: 1, transom: true, depth: 0.32, frame: '#e9e2d1', glass: '#36434d' },
    ground: { front: 'window', sides: 'window', entrances: 3, door: '#3b2c22' },
    bands: { plinth: 0.9, cornice: true, floors: false, top: true }, roof: { type: 'flat', color: '#6a645b', parapet: 0.6, overhang: 0 }, lit: 0.35,
  },
  centralna: {
    type: 'office', floorH: 4.5, groundH: 6, bay: 2.2, module: ['window'], wall: mat('concrete', { color: '#b9b7af', tile: 3 }),
    window: { style: 'curtain', w: 2.2, h: 4, sill: 0, mullions: 1, transom: false, depth: 0.14, frame: '#2b3034', glass: '#30424e' },
    ground: { front: 'glass', sides: 'glass', entrances: 4, door: '#2a2f33' },
    bands: { plinth: 0, cornice: false, floors: false, top: true }, roof: { type: 'flat', color: '#4d4f50', parapet: 0.5, overhang: 0 }, lit: 0.7,
  },
  zlota44: glassTower('#3e5767', '#c9ced2'),
  intercontinental: glassTower('#2c3e4a', '#6e7377'),
  varso: glassTower('#4a6274', '#9aa3a8'),
  spire: glassTower('#38596f', '#a3abb0'),
  rondo1: glassTower('#24323c', '#3c4247'),
  cosmopolitan: glassTower('#4c606d', '#d8dcdf'),
  wtt: glassTower('#1f2a33', '#2a2f33'),
};
export const LANDMARK_IDS = Object.keys(DATA).filter((id) => STYLES[id]);
export const landmarkInfo = (id) => DATA[id] ? { id, name: DATA[id].name, osm: DATA[id].osm, osmName: DATA[id].osmName, lat: DATA[id].lat, lon: DATA[id].lon, parts: Math.max(1, DATA[id].parts.length) } : null;
export const landmarkStyle = (id) => JSON.parse(JSON.stringify(STYLES[id] || {}));

const num = (v) => { const x = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(x) ? x : NaN; };
const ROOFS = { pyramidal: 'pyramid', spire: 'pyramid', cone: 'pyramid', conical: 'pyramid', dome: 'dome', onion: 'dome', hipped: 'hip', gabled: 'gable', mansard: 'mansard' };
// kolor z mapy: #rgb, #rrggbb, rrggbb albo nazwa CSS; inne (np. „Sandstone”) — kolor stylu
const colour = (s, fb) => {
  if (!s) return fb;
  const v = String(s).trim().replace(/_/g, '').toLowerCase(), hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
  if (hex) return '#' + new THREE.Color('#' + hex[1]).getHexString();
  return THREE.Color.NAMES[v] != null ? '#' + new THREE.Color(THREE.Color.NAMES[v]).getHexString() : fb;
};

/** Opis CityKit części budynku z mapy: wysokości z tagów (jak w grze CityExplorer), wygląd ze stylu. */
export function partSpec(part, style) {
  const t = part.tags || {}, S = normalizeSpec(style), outer = cleanPolygon(part.outer, { center: false, minArea: 0.05 });
  if (!outer) return null;
  const lv = num(t['building:levels']), rl = num(t['roof:levels']);
  let h = num(t.height), rh = num(t['roof:height']), minH = num(t.min_height);
  if (isNaN(minH)) { const ml = num(t['building:min_level']); minH = isNaN(ml) ? 0 : ml * 3.2; }
  if (isNaN(h)) h = !isNaN(lv) ? lv * 3.2 + (isNaN(num(t['roof:height'])) ? 0 : num(t['roof:height'])) : 14;
  // zadaszenie (building:part=roof) bez początku nad gruntem: płyta dachu 1,2 m pod górą, jak w grze
  if ((t['building:part'] === 'roof' || t.building === 'roof') && isNaN(num(t.min_height)) && isNaN(num(t['building:min_level']))) minH = Math.max(minH, h - 1.2);
  if (isNaN(rh)) rh = isNaN(rl) ? NaN : rl * 3.2;
  if (h <= minH) h = minH + 1;
  const type = ROOFS[(t['roof:shape'] || '').toLowerCase()] || 'flat', holes = (part.holes || []).filter((q) => q.length >= 3);
  let maxR = 0; const c = outer.reduce((a, p) => [a[0] + p[0] / outer.length, a[1] + p[1] / outer.length], [0, 0]);
  for (const p of outer) maxR = Math.max(maxR, Math.hypot(p[0] - c[0], p[1] - c[1]));
  if (type === 'flat' || holes.length) rh = 0;
  else if (isNaN(rh)) rh = type === 'hip' || type === 'gable' || type === 'mansard' ? Math.min(maxR * 0.4, 4) : Math.min(maxR * (type === 'dome' ? 0.9 : 1.2), (h - minH) * 0.6);
  rh = Math.min(rh, (h - minH) * 0.95);
  // kondygnacje stylu (parter części nad gruntem — jak piętro), reszta wysokości ścian — pas bez okien nad ostatnią
  // kondygnacją (poddasze); tak części mają wspólne kafelki fasady. Niższa od parteru — sam parter (co 0,1 m w górę).
  const wallH = Math.max(0.3, h - minH - rh), raised = minH > 0.5, fh = S.floorH, g0 = raised ? fh : S.groundH;
  let floors = 1, gh = g0, attic = 0;
  if (wallH < g0) gh = Math.ceil(wallH * 10) / 10;
  else { floors = 1 + Math.floor((wallH - g0) / fh + 1e-6); attic = Math.max(0, wallH - g0 - (floors - 1) * fh); if (attic < 0.05) attic = 0; }
  // front: najdłuższa ściana (wejścia); część nad gruntem — bez wejść, witryn i cokołu
  let front = 0, best = 0;
  outer.forEach((p, i) => { const q = outer[(i + 1) % outer.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l > best) { best = l; front = i; } });
  const area = Math.abs(outer.reduce((s, p, i) => { const q = outer[(i + 1) % outer.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
  return normalizeSpec({
    ...S, footprint: { shape: 'custom', points: outer, holes, fixed: true }, base: minH, floors, floorH: fh, groundH: gh, attic, front, edgeBase: style.edgeBase || 0,
    wall: { ...S.wall, color: colour(t['building:colour'], S.wall.color) },
    ground: raised ? { ...S.ground, front: 'window', sides: 'window', entrances: 0 } : S.ground,
    bands: raised ? { ...S.bands, plinth: 0 } : S.bands,
    roof: { ...S.roof, type, height: rh, overhang: 0, parapet: type === 'flat' && area > 60 ? S.roof.parapet : 0, color: colour(t['roof:colour'], S.roof.color) },
  });
}

/** Budynek z mapy: części jako budynki CityKit w jednej grupie (środek obrysu w 0, 0; północ na −z). */
export function buildLandmark(id, { detail = 1, style, ppm = 64, build } = {}) {
  const d = DATA[id]; if (!d) throw new Error('unknown landmark: ' + id);
  const t0 = performance.now(), st = normalizeSpec({ ...(STYLES[id] || {}), ...(style || {}) });
  // części; gdy te przy gruncie nie pokrywają połowy obrysu (np. Warsaw Spire: w mapie tylko korona), także sam budynek
  const ringArea = (o) => Math.abs(o.reduce((s, p, i) => { const q = o[(i + 1) % o.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
  const low = d.parts.filter((p) => !(num(p.tags && p.tags.min_height) > 0.5) && !(num(p.tags && p.tags['building:min_level']) > 0)).reduce((s, p) => s + ringArea(p.outer), 0);
  const parts0 = low < ringArea(d.outer) * 0.5 ? [{ outer: d.outer, holes: d.holes, tags: d.tags }, ...d.parts] : d.parts;
  const group = new THREE.Group(); group.name = 'landmark: ' + id;
  const parts = [], tiles = {}, mats = new Map();
  let eb = 0;
  for (const p of parts0) {
    const sp = partSpec(p, { ...st, edgeBase: eb }); if (!sp) continue;
    eb += 64;   // ściany kolejnych części — inne liczby z ziarna (inne świecące okna)
    const b = build(sp, { detail, ppm, mats }); parts.push(b);
    if (b.tiles) Object.entries(b.tiles).forEach(([k, v]) => { if (!Object.values(tiles).includes(v)) tiles[k + (tiles[k] ? ' ' + parts.length : '')] = v; });
  }
  // części scalone: jedna siatka na materiał (wysokość części wpisana w wierzchołki)
  const byMat = new Map();
  for (const b of parts) { b.group.updateMatrixWorld(true); b.group.traverse((o) => { if (o.isMesh) { let a = byMat.get(o.material); if (!a) byMat.set(o.material, a = []); a.push(o.geometry.clone().applyMatrix4(o.matrixWorld)); } }); b.dispose(); }
  for (const [m, geos] of byMat) {
    const mesh = new THREE.Mesh(mergeGeos(geos), m); mesh.name = geos.length > 1 ? (m.name || 'merged') : 'part'; mesh.castShadow = mesh.receiveShadow = true;
    geos.forEach((g) => g.dispose()); group.add(mesh);
  }
  const box = new THREE.Box3().setFromObject(group), size = box.getSize(new THREE.Vector3());
  let tris = 0, calls = 0; const used = new Set();
  group.traverse((o) => { if (!o.isMesh) return; tris += o.geometry.attributes.position.count / 3; calls++; used.add(o.material); });
  const sum = (k) => parts.reduce((s, b) => s + (b.stats[k] || 0), 0);
  const area = Math.abs(d.outer.reduce((s, p, i) => { const q = d.outer[(i + 1) % d.outer.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
  return {
    group, spec: { ...st, landmark: id }, tiles, parts, layout: parts[0] ? parts[0].layout : null,
    info: { type: st.type, landmark: id, name: d.name, osm: d.osm, size: size.toArray(), height: box.max.y, roofTop: box.max.y, floors: Math.max(...parts.map((b) => b.spec.floors)), area, walls: parts.reduce((s, b) => s + b.info.walls, 0), modules: parts.reduce((s, b) => s + b.info.modules, 0), windows: parts.reduce((s, b) => s + b.info.windows, 0), parts: parts.length, far: detail < 0.75, source: OSM_SOURCE },
    stats: { triangles: Math.round(tris), drawCalls: calls, materials: used.size, buildMs: Math.round(performance.now() - t0), bakeMs: sum('bakeMs'), textureBytes: Object.values(tiles).reduce((s, x) => s + x.w * x.h * 12, 0) },
    setLit(k) { for (const m of mats.values()) m.userData.city.uLit.value = k; },
    dispose() { group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); mats.forEach((m) => m.dispose()); },
  };
}

// geometrie bez indeksów z tymi samymi atrybutami (position, normal, uv, aCell) → jedna
function mergeGeos(geos) {
  const out = new THREE.BufferGeometry();
  for (const name of Object.keys(geos[0].attributes)) {
    if (!geos.every((g) => g.attributes[name])) continue;
    const size = geos[0].attributes[name].itemSize, arr = new Float32Array(geos.reduce((s, g) => s + g.attributes[name].array.length, 0));
    let o = 0; for (const g of geos) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  out.computeBoundingSphere(); return out;
}
