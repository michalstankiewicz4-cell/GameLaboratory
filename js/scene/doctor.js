// Lekarz sceny: sprawdza układ sceny — to, czego nie widać w pojedynczym modelu (doktor modeli: tools/doctor.html).
// Silnik, bez Three.js i bez DOM: dostaje scenę jako dane (js/scene/scene-data.js) i pomiary z świata (nieobowiązkowe),
// więc działa w edytorze, w API dla AI i w grach. Jak doktor modeli: uniwersalny, zgłasza i proponuje poprawki
// (polecenia API — js/scene/api.js), niczego nie przestawia sam. Opis: docs/scene/doctor.md.
//
// checkScene(scene, ctx) → { issues: [{ code, level, object?, name?, text, fix? }], counts, cost?, skipped }
//   level: 'error' (scena nie zadziała tak, jak wygląda), 'warn' (prawdopodobnie błąd), 'info' (do wiadomości)
//   fix: polecenie albo lista poleceń API ({ cmd: 'set', id, pos: […] } …) — proponowana poprawka, do wykonania osobno
// ctx:
//   prefab(id) → { id, label, family, surface } | null      (js/scene/prefabs.js)
//   behaviorsFor(prefabId) → [id], behaviorOf(obj, surface) → id | '', behaviorEnv(id) → 'water' | 'land' | 'space'
//   bodyRank(prefabId) → ranga ciała niebieskiego (−1 — nie ciało)                    (js/scene/behaviors.js)
//   assets: { list(kind) → nazwy }, lights: [nazwy], skyPresets: [id]                 (js/scene/assets.js, space.js)
//   probe (nieobowiązkowe, świat): { groundAt(x, z), isWater(x, z, depth), waterLevel(x, z) }   (scena bazowa)
//   boxOf(obj) → { min: [x, y, z], max: [x, y, z] } | null — obrys w świecie z danych obiektu (pos, rot, scale)
//   costOf(obj) → { tris, draws } | null — koszt zbudowanego modelu
//   budget: { tris, draws } — budżet sceny (domyślnie BUDGET)

export const BUDGET = { tris: 2_000_000, draws: 1500 };
// odstęp od gruntu, który jeszcze nie jest „pod gruntem” ani „w powietrzu” [m] (nierówny teren, podpory, koła)
const GROUND_TOL = 0.6, WATER_TOL = 1.5;
const ENV_OF = { sea: 'water', land: 'land', space: 'space', underground: 'land' };   // podziemie: prawa lądu
const ENV_NAME = { water: 'water', land: 'land', space: 'space' };
const fmt = (v) => +v.toFixed(2);

export function checkScene(scene, ctx) {
  const issues = [], skipped = new Set(), S = scene, surf = S.env.surface;
  const add = (level, code, o, text, fix) => issues.push({ code, level, ...(o ? { object: o.id, name: o.name } : {}), text, ...(fix ? { fix } : {}) });
  const P = (o) => ctx.prefab(o.prefab);
  // podziemie: dno jaskini ma wiele poziomów — bez sprawdzania gruntu po wysokości (jak w kosmosie)
  const ground = ctx.probe && surf !== 'space' && surf !== 'underground' ? (x, z) => ctx.probe.groundAt(x, z) : null;
  const water = surf === 'underground' ? () => false : ctx.probe ? (x, z, d = 0.5) => ctx.probe.isWater(x, z, d) : () => surf === 'sea';
  const boxes = new Map();
  for (const o of S.objects) { const b = ctx.boxOf ? ctx.boxOf(o) : null; if (b) boxes.set(o.id, b); else if (ctx.boxOf) skipped.add('box'); }

  /* ---- środowisko: zasoby z nazwą ---- */
  const A = ctx.assets || { list: () => [] };
  const asset = (field, kind, lab, ok = () => false) => {
    const n = S.env[field]; if (!n || ok(n)) return;
    if (!A.list(kind).includes(n)) add('error', 'missing-asset', null, `Environment ${field}: no ${kind} asset "${n}" (save one in the ${lab}; "" — the default)`, { cmd: 'env', [field]: '' });
  };
  asset('land', 'land', 'land lab');
  asset('sea', 'sea', 'water lab');
  asset('look', 'look', 'filters lab');
  asset('ui', 'ui', 'game UI lab');
  if (surf === 'underground') asset('cave', 'cave', 'cave lab');
  asset('sky', 'sky', 'celestial bodies lab', (n) => n === 'day' || (n.startsWith('preset:') && (!(ctx.skyPresets || []).length || ctx.skyPresets.includes(n.slice(7)))));
  if (S.env.light && !(ctx.lights || []).includes(S.env.light) && !A.list('weather').includes(S.env.light))
    add('error', 'missing-asset', null, `Environment light: no ready light or weather asset "${S.env.light}" (save one in the look lab)`, { cmd: 'env', light: (ctx.lights || ['afternoon'])[0] });
  if (S.env.land && surf !== 'land') add('info', 'unused-asset', null, `The land "${S.env.land}" is set, but the surface is ${surf}: it is not shown`);

  /* ---- obiekty ---- */
  const names = new Map(), want = [];   // want: powierzchnia, której potrzebuje obiekt w złym środowisku
  for (const o of S.objects) {
    names.set(o.name.toLowerCase(), (names.get(o.name.toLowerCase()) || 0) + 1);
    const p = P(o);
    if (!p) { add('error', 'unknown-prefab', o, `Unknown model "${o.prefab}": it is not built`, { cmd: 'remove', id: o.id }); continue; }
    const [x, y, z] = o.pos, at = `at (${fmt(x)}, ${fmt(z)})`;
    // zasób modelu (pole „asset”, np. bryła z laboratorium bloków): nie ma go w tej przeglądarce — stoi model domyślny
    if (o.asset && p.assetKind && !A.list(p.assetKind).includes(o.asset))
      add('error', 'missing-asset', o, `No ${p.assetKind} asset "${o.asset}" (save one in ${p.lab}): the default model stands instead`, { cmd: 'set', id: o.id, asset: '' });

    // zachowanie: wybrane, a nie pasuje do modelu; działa w innym środowisku niż scena
    if (o.behavior && !ctx.behaviorsFor(o.prefab).includes(o.behavior))
      add('error', 'behavior-misfit', o, `The behaviour "${o.behavior}" does not fit ${p.label} (fits: ${ctx.behaviorsFor(o.prefab).join(', ') || 'none'})`, { cmd: 'set', id: o.id, behavior: '' });
    // model w złym środowisku: okręt na lądzie, drzewo na morzu, łazik w kosmosie, samolot bez powietrza
    const hasBeh = ctx.behaviorsFor(o.prefab).length > 0, n0 = issues.length, bid = ctx.behaviorOf(o, surf);
    if (p.surface === 'sea') {
      if (surf === 'space') { add('error', 'wrong-env', o, `${p.label} floats on water, the scene is space`); want.push('sea'); }
      else if (surf === 'land' && !water(x, z, 0.5)) { add('error', 'wrong-env', o, `${p.label} stands on dry land ${at}: it needs water (the land map has none here)`); want.push('sea'); }
      else if (surf === 'underground') { add('warn', 'wrong-env', o, `${p.label} floats on water, the scene is a cave (only its lakes)`); want.push('sea'); }
    } else if (p.surface === 'land') {
      if (surf === 'space') { add('error', 'wrong-env', o, `${p.label} needs ground, the scene is space`); want.push('land'); }
      else if (surf === 'sea' || water(x, z, 0.5)) { add('error', 'wrong-env', o, `${p.label} stands in water ${at}: it belongs on land`); want.push('land'); }
    } else if (p.surface === 'air') {
      if (surf === 'space') { add('error', 'wrong-env', o, `${p.label} flies in the atmosphere, the scene is space (no air)`); want.push('land'); }
      else if (surf === 'underground') { add('warn', 'wrong-env', o, `${p.label} flies in the open air, the scene is a cave`); want.push('land'); }
    } else if (p.surface === 'space') {
      if (ctx.bodyRank(o.prefab) >= 0 && surf !== 'space') { add('warn', 'wrong-env', o, `${p.label} (a celestial body) stands in a ${surf} scene`); want.push('space'); }
      else if (hasBeh && !bid) add('warn', 'wrong-env', o, `${p.label} has no behaviour for a ${surf} scene: it will stand still`);
    }

    // (jedno zgłoszenie środowiska na obiekt: model w złym środowisku już mówi, że zachowanie tu nie zadziała)
    const benv = bid ? ctx.behaviorEnv(bid) : null;
    if (issues.length === n0 && bid && benv && benv !== ENV_OF[surf]) {
      const fit = ctx.behaviorsFor(o.prefab).find((b) => ctx.behaviorEnv(b) === ENV_OF[surf]);
      add('warn', 'behavior-env', o, `The behaviour "${bid}" works on ${ENV_NAME[benv]}, the scene is ${surf}: in play it will not move as it should`,
        fit ? { cmd: 'set', id: o.id, behavior: fit } : null);
    }

    // pod gruntem, w powietrzu, nie na linii wody (dane obiektu; zachowania w grze ustawiają pozę same)
    // punkt zaczepienia modelu stoi na gruncie (tak stawia edytor; korzenie i fundamenty bywają niżej — obrys tu nie służy)
    const box = boxes.get(o.id), bottom = box ? box.min[1] : y;
    if (ground && p.surface === 'land' && !water(x, z, 0.5)) {
      const g = ground(x, z), fix = { cmd: 'set', id: o.id, pos: [x, fmt(g), z] };
      if (y < g - GROUND_TOL) add('warn', 'under-ground', o, `${p.label} is ${fmt(g - y)} m under the ground ${at}`, fix);
      else if (y > g + GROUND_TOL && p.family !== 'caves') add('warn', 'floating', o, `${p.label} hangs ${fmt(y - g)} m above the ground ${at}`, fix);
    }
    if (p.surface === 'sea' && surf !== 'space' && water(x, z, 0.5) && Math.abs(y) > WATER_TOL)
      add('warn', y > 0 ? 'floating' : 'under-ground', o, `${p.label} is ${fmt(Math.abs(y))} m ${y > 0 ? 'above' : 'below'} the waterline (its origin is the waterline)`, { cmd: 'set', id: o.id, pos: [x, 0, z] });
    if (p.surface === 'air' && ground && box && bottom < ground(x, z) - GROUND_TOL)
      add('warn', 'under-ground', o, `${p.label} is under the ground ${at}`, { cmd: 'set', id: o.id, pos: [x, fmt(y + ground(x, z) - bottom + 30), z] });

    // orbita: środek, którego nie ma; nie ma cięższego ciała
    if (bid === 'orbit') {
      const ar = o.orbit && o.orbit.around;
      if (ar && !S.objects.some((q) => q.id === ar)) add('error', 'orbit', o, `The orbit is around an object that is not in the scene ("${ar}")`, { cmd: 'set', id: o.id, orbit: { around: '' } });
      else if (!ar && !S.objects.some((q) => q !== o && ctx.bodyRank(q.prefab) > Math.max(-1, ctx.bodyRank(o.prefab))))
        add('warn', 'orbit', o, `Nothing heavier to orbit: ${p.label} will stand still`);
    }
    if (o.scale > 50 || o.scale < 0.02) add('info', 'scale', o, `Unusual scale ×${o.scale}: the behaviours count in real metres`);
  }
  // cała scena w złym środowisku (każdy obiekt potrzebuje tej samej innej powierzchni): jedna poprawka — zmiana powierzchni
  if (want.length && want.length === S.objects.length && want.every((w) => w === want[0]))
    add('error', 'wrong-surface', null, `Every model here belongs on ${want[0]}, the scene is ${surf}`, { cmd: 'env', surface: want[0] });
  for (const [n, k] of names) if (k > 1) add('info', 'duplicate-name', null, `${k} objects are named "${n}": the API needs their id`);

  /* ---- obiekty wchodzące jeden w drugi (obrysy) ---- */
  const list = S.objects.filter((o) => boxes.has(o.id) && P(o));
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j], A1 = boxes.get(a.id), B1 = boxes.get(b.id);
    const ov = [0, 1, 2].map((k) => Math.min(A1.max[k], B1.max[k]) - Math.max(A1.min[k], B1.min[k]));
    if (ov.some((v) => v <= 0)) continue;
    const vol = (q) => (q.max[0] - q.min[0]) * (q.max[1] - q.min[1]) * (q.max[2] - q.min[2]) || 1e-9;
    const frac = (ov[0] * ov[1] * ov[2]) / Math.min(vol(A1), vol(B1));
    if (frac < 0.15) continue;   // obrysy osiowe obróconych modeli są większe niż modele — małe zachodzenie pomijamy
    const pa = P(a), pb = P(b), cave = pa.family === 'caves' || pb.family === 'caves';
    // odsuń mniejszy wzdłuż osi najmniejszego zachodzenia (w poziomie)
    const small = vol(A1) <= vol(B1) ? a : b, big = small === a ? b : a, k = ov[0] <= ov[2] ? 0 : 2, sB = boxes.get(small.id), bB = boxes.get(big.id);
    const dir = (sB.min[k] + sB.max[k]) >= (bB.min[k] + bB.max[k]) ? 1 : -1, pos = small.pos.slice(); pos[k] = fmt(pos[k] + dir * (ov[k] + 1));
    add(cave ? 'info' : 'warn', 'overlap', small, `${small.name} goes into ${big.name} (${Math.round(frac * 100)} % of the smaller one's outline)`, { cmd: 'set', id: small.id, pos });
  }

  /* ---- koszt sceny ---- */
  let cost = null;
  if (ctx.costOf) {
    const B = { ...BUDGET, ...(ctx.budget || {}) }, per = [];
    cost = { tris: 0, draws: 0, budget: B };
    for (const o of S.objects) { const c = ctx.costOf(o); if (!c) { skipped.add('cost'); continue; } cost.tris += c.tris; cost.draws += c.draws; per.push([o, c]); }
    per.sort((a, b) => b[1].tris - a[1].tris);
    const top = per.slice(0, 3).map(([o, c]) => `${o.name} ${Math.round(c.tris / 1000)}k / ${c.draws}`).join(', ');
    if (cost.tris > B.tris) add('warn', 'cost', null, `${Math.round(cost.tris / 1000)}k triangles, the budget is ${Math.round(B.tris / 1000)}k (the heaviest: ${top})`);
    if (cost.draws > B.draws) add('warn', 'cost', null, `${cost.draws} draw calls, the budget is ${B.draws} (the heaviest: ${top})`);
  }
  if (skipped.has('box')) add('info', 'not-built', null, 'Some models are not built yet (kits still loading): their outlines and cost are left out');

  const counts = { error: 0, warn: 0, info: 0 }; issues.forEach((q) => counts[q.level]++);
  const order = { error: 0, warn: 1, info: 2 }; issues.sort((a, b) => order[a.level] - order[b.level]);
  return { issues, counts, ...(cost ? { cost } : {}), skipped: [...skipped] };
}

// obrys w świecie z obrysu modelu w jego układzie (min, max) i danych obiektu: pos, rot (stopnie, kolejność YXZ jak
// w edytorze), scale — obrys osiowy ośmiu obróconych narożników
export function worldBox(local, o) {
  const D = Math.PI / 180, [ax, ay, az] = o.rot.map((v) => v * D), s = o.scale;
  const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
  // R = Ry · Rx · Rz (Euler 'YXZ')
  const R = [
    [cy * cz + sy * sx * sz, -cy * sz + sy * sx * cz, sy * cx],
    [cx * sz, cx * cz, -sx],
    [-sy * cz + cy * sx * sz, sy * sz + cy * sx * cz, cy * cx],
  ];
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < 8; i++) {
    const p = [i & 1 ? local.max[0] : local.min[0], i & 2 ? local.max[1] : local.min[1], i & 4 ? local.max[2] : local.min[2]].map((v) => v * s);
    for (let k = 0; k < 3; k++) { const v = R[k][0] * p[0] + R[k][1] * p[1] + R[k][2] * p[2] + o.pos[k]; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v; }
  }
  return { min, max };
}
