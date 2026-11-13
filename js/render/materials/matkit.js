// MatKit — biblioteka materiałów (laboratorium materiałów: labs/materials.html, opis docs/labs/materials.md).
// Materiał to dane (JSON): rodzaj powierzchni, barwy, wielkość wzoru, szorstkość, metaliczność, nierówność i starzenie
// (zużycie, brud, rdza). Generator robi z nich bezszwowe mapy (kafelek powtarza się bez łączeń): barwę, wysokość →
// mapę normalnych, szorstkość, metaliczność i zacienienie zagłębień (AO), a z map — materiał PBR Three.js.
// Ten sam opis z tym samym ziarnem daje ten sam materiał. Wspólna warstwa: modele, laboratorium sztuki i teren mogą
// brać materiały stąd (przenoszone stopniowo — plan w docs/labs/materials.md).
//
//   KINDS                      rodzaje powierzchni i ich pola
//   PRESETS                    gotowe materiały (blacha, stal szczotkowana, rdza, drewno, skała, beton, cegła…)
//   DEFAULTS, normalize(def)   pola wspólne i sprawdzenie opisu
//   generate(def, res) → { res, albedo: Uint8ClampedArray RGBA, height, rough, metal, ao: Float32Array }
//   makeMaterial(def, { res, tile }) → { material: MeshStandardMaterial, textures, maps, dispose() }
//     tile — ile metrów ma jeden kafelek (domyślnie def.tile); materiał.userData.tile — do ustawienia powtórzeń UV
//   canvases(maps) → { albedo, normal, rough, metal, ao } — podglądy map (canvas 2D)
import * as THREE from '../../../vendor/three/three.module.js';

export const KINDS = {
  metal: { label: 'Metal (smooth or brushed)', fields: ['brushed'] },
  plate: { label: 'Steel plate (panels, seams, rivets)', fields: ['panels', 'rivets'] },
  paint: { label: 'Painted metal (chips show the metal)', fields: ['brushed'] },
  wood: { label: 'Wood (planks, grain)', fields: ['planks', 'grain'] },
  rock: { label: 'Rock (cracks, grains)', fields: ['cracks', 'grains'] },
  concrete: { label: 'Concrete (pores, speckle)', fields: ['pores'] },
  brick: { label: 'Brick wall (bricks, mortar)', fields: ['bricks'] },
  paper: { label: 'Paper (fibres)', fields: ['fibres'] },
  fabric: { label: 'Fabric (weave)', fields: ['threads'] },
  plaster: { label: 'Plaster (trowel marks)', fields: ['trowel'] },
  ice: { label: 'Ice (cracks, bubbles)', fields: ['cracks'] },
};
export const FIELDS = {   // pola rodzajów: [opis, min, max, krok, domyślnie]
  brushed: ['Brushed (streaks)', 0, 1, 0.05, 0], panels: ['Panels per tile', 1, 6, 1, 2], rivets: ['Rivets', 0, 1, 1, 1],
  planks: ['Planks per tile', 1, 10, 1, 4], grain: ['Grain', 0, 1, 0.05, 0.6], cracks: ['Cracks', 0, 1, 0.05, 0.4],
  grains: ['Grains', 0, 1, 0.05, 0.5], pores: ['Pores', 0, 1, 0.05, 0.4], bricks: ['Brick rows per tile', 2, 16, 1, 8],
  fibres: ['Fibres', 0, 1, 0.05, 0.5], threads: ['Threads per tile', 8, 96, 4, 48], trowel: ['Trowel marks', 0, 1, 0.05, 0.5],
};
export const DEFAULTS = {
  kind: 'plate', color: '#7c8388', color2: '#3d4246', tile: 2, seed: 1,
  roughness: 0.55, metalness: 0.8, bump: 1, wear: 0.15, dirt: 0.2, rust: 0,
};
export const PRESETS = {
  plate: { label: 'Steel plate', kind: 'plate', color: '#7c8388', color2: '#3d4246', tile: 2, roughness: 0.5, metalness: 0.85, wear: 0.2, dirt: 0.25, panels: 2, rivets: 1 },
  brushed: { label: 'Brushed steel', kind: 'metal', color: '#b9bec2', tile: 1, roughness: 0.35, metalness: 1, brushed: 0.9, wear: 0.1, dirt: 0.05 },
  rusty: { label: 'Rusty steel', kind: 'plate', color: '#6d6a66', color2: '#3a2f28', tile: 2, roughness: 0.6, metalness: 0.7, wear: 0.4, dirt: 0.4, rust: 0.7, panels: 3 },
  hull: { label: 'Painted hull (grey)', kind: 'paint', color: '#8e9497', color2: '#5a5f63', tile: 3, roughness: 0.55, metalness: 0.3, wear: 0.25, dirt: 0.3, rust: 0.2 },
  aluminium: { label: 'Aluminium', kind: 'metal', color: '#c9cdd1', tile: 1, roughness: 0.3, metalness: 1, brushed: 0.3, wear: 0.05, dirt: 0.05 },
  copper: { label: 'Copper', kind: 'metal', color: '#c27a4a', tile: 1, roughness: 0.3, metalness: 1, brushed: 0.2, wear: 0.1, dirt: 0.15 },
  gold: { label: 'Gold', kind: 'metal', color: '#e2b65a', tile: 1, roughness: 0.2, metalness: 1, wear: 0.05, dirt: 0.05 },
  planks: { label: 'Wooden planks', kind: 'wood', color: '#8a6a4a', color2: '#4e3826', tile: 2, roughness: 0.75, metalness: 0, planks: 5, grain: 0.7, wear: 0.2, dirt: 0.2 },
  deck: { label: 'Ship deck (teak)', kind: 'wood', color: '#a58561', color2: '#2a2018', tile: 2, roughness: 0.8, metalness: 0, planks: 8, grain: 0.5, wear: 0.3, dirt: 0.3 },
  granite: { label: 'Rock (granite)', kind: 'rock', color: '#8b8781', color2: '#4b4844', tile: 3, roughness: 0.85, metalness: 0, cracks: 0.4, grains: 0.8, dirt: 0.2 },
  sandstone: { label: 'Rock (sandstone)', kind: 'rock', color: '#c4a57c', color2: '#8a6a48', tile: 4, roughness: 0.9, metalness: 0, cracks: 0.25, grains: 0.4, dirt: 0.15 },
  concrete: { label: 'Concrete', kind: 'concrete', color: '#a9a69c', color2: '#7c7a73', tile: 3, roughness: 0.9, metalness: 0, pores: 0.5, wear: 0.1, dirt: 0.35 },
  brick: { label: 'Brick wall', kind: 'brick', color: '#9a4b35', color2: '#bdb6a6', tile: 2, roughness: 0.85, metalness: 0, bricks: 8, wear: 0.15, dirt: 0.25 },
  paper: { label: 'Paper', kind: 'paper', color: '#ece6d6', color2: '#cbbfa3', tile: 0.5, roughness: 0.9, metalness: 0, fibres: 0.6, wear: 0, dirt: 0.1 },
  canvas: { label: 'Fabric (canvas)', kind: 'fabric', color: '#cdbf9e', color2: '#9f9273', tile: 0.25, roughness: 0.95, metalness: 0, threads: 40, dirt: 0.1 },
  plaster: { label: 'Plaster', kind: 'plaster', color: '#d9d3c7', color2: '#b8b0a2', tile: 2, roughness: 0.9, metalness: 0, trowel: 0.6, dirt: 0.2 },
  ice: { label: 'Ice', kind: 'ice', color: '#bcd7e6', color2: '#7aa3bd', tile: 3, roughness: 0.12, metalness: 0, cracks: 0.5, dirt: 0 },
};

/* ---------------- narzędzia ---------------- */
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const hex = (h) => { const n = parseInt(String(h).replace('#', ''), 16) || 0; return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
// szum wartości zawinięty: siatka P × P (na cały kafelek), więc szum łączy się na brzegach kafelka
function tileNoise(seed, P) {
  const r = rng(seed), t = new Float32Array(P * P); for (let i = 0; i < t.length; i++) t[i] = r();
  return (u, v) => {   // u, v w komórkach siatki (0…P)
    const x = Math.floor(u), y = Math.floor(v), fx = u - x, fy = v - y, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const i0 = ((x % P) + P) % P, j0 = ((y % P) + P) % P, i1 = (i0 + 1) % P, j1 = (j0 + 1) % P;
    const a = t[j0 * P + i0], b = t[j0 * P + i1], c = t[j1 * P + i0], d = t[j1 * P + i1];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}
// fbm zawinięty: oktawy o okresach P, 2P, 4P… (u, v w ułamkach kafelka 0…1)
function makeFbm(seed, P, oct = 4) {
  const ns = Array.from({ length: oct }, (_, i) => tileNoise(seed + i * 101, P << i));
  return (u, v, o = oct) => { let s = 0, a = 0.5, n = 0; for (let i = 0; i < o; i++) { const p = P << i; s += ns[i](u * p, v * p) * a; n += a; a *= 0.5; } return s / n; };
}
// komórki Woronoja zawinięte (spękania): odległość do krawędzi komórki (u, v w ułamkach kafelka)
function makeCells(seed, N) {
  const r = rng(seed), pts = []; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) pts.push([(i + r()) / N, (j + r()) / N]);
  return (u, v) => {
    const ci = Math.floor(u * N), cj = Math.floor(v * N); let d1 = 9, d2 = 9;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      // komórka sąsiednia zawinięta na kafelku; punkt przesunięty o tyle kafelków, o ile wyszła poza brzeg
      const ii = ((ci + di) % N + N) % N, jj = ((cj + dj) % N + N) % N, p = pts[jj * N + ii];
      const dx = p[0] + ((ci + di) - ii) / N - u, dy = p[1] + ((cj + dj) - jj) / N - v, d = Math.hypot(dx, dy);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    return (d2 - d1) * N;   // 0 na krawędzi, ok. 0,5 w środku komórki
  };
}

export function normalize(def = {}) {
  const k = KINDS[def.kind] ? def.kind : DEFAULTS.kind, d = { ...DEFAULTS, ...def, kind: k };
  for (const f of KINDS[k].fields) { const [, lo, hi, , dv] = FIELDS[f]; d[f] = clamp(+(d[f] ?? dv), lo, hi); }
  for (const f of ['roughness', 'metalness', 'wear', 'dirt', 'rust']) d[f] = clamp(+d[f] || 0);
  d.bump = clamp(+d.bump, 0, 3); d.tile = clamp(+d.tile || 1, 0.05, 50); d.seed = Math.max(1, Math.round(+d.seed || 1));
  if (!/^#[0-9a-f]{6}$/i.test(d.color)) d.color = DEFAULTS.color;
  if (!/^#[0-9a-f]{6}$/i.test(d.color2)) d.color2 = DEFAULTS.color2;
  return d;
}

/* ---------------- generator ---------------- */
export function generate(def0, res = 512) {
  const d = normalize(def0), N = res * res, S = d.seed * 7919;
  const H = new Float32Array(N), R = new Float32Array(N), M = new Float32Array(N), C = new Float32Array(N * 3);
  const c1 = hex(d.color), c2 = hex(d.color2), fbm = makeFbm(S, 4), fine = makeFbm(S + 31, 32, 3), r = rng(S + 5);
  const put = (i, col, h, ro, me) => { C[i * 3] = col[0]; C[i * 3 + 1] = col[1]; C[i * 3 + 2] = col[2]; H[i] = h; R[i] = ro; M[i] = me; };
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const cells = d.kind === 'rock' || d.kind === 'ice' ? makeCells(S + 77, d.kind === 'ice' ? 5 : 4) : null;
  for (let y = 0, i = 0; y < res; y++) for (let x = 0; x < res; x++, i++) {
    const u = x / res, v = y / res, n = fbm(u, v), f = fine(u, v);
    switch (d.kind) {
      case 'metal': case 'paint': {
        const streak = d.brushed ? fine(u * 0.02, v * 4, 3) * d.brushed : 0;
        const col = shade(c1, 0.92 + n * 0.14 - streak * 0.12);
        put(i, col, 0.5 + (f - 0.5) * 0.08 + streak * 0.15, d.roughness * (0.85 + streak * 0.4 + (n - 0.5) * 0.2), d.metalness);
        break;
      }
      case 'plate': {   // panele z fugami i nitami
        const P = d.panels, pu = (u * P) % 1, pv = (v * P) % 1, e = Math.min(pu, 1 - pu, pv, 1 - pv) * res / P;   // piksele od fugi
        const seam = clamp(1 - e / 1.5), cellId = Math.floor(u * P) + Math.floor(v * P) * 7, tint = 0.9 + ((cellId * 0.6180339) % 1) * 0.16;
        let h = 0.55 - seam * 0.4 + (f - 0.5) * 0.04;
        if (d.rivets) {   // nity co 1/8 panelu wzdłuż brzegów
          const s = 1 / (P * 8), ru = (u % s) / s - 0.5, rv = (v % s) / s - 0.5, nearEdge = Math.min(pu, 1 - pu, pv, 1 - pv) < 0.05;
          const rd = Math.hypot(ru, rv); if (nearEdge && rd < 0.28) h += (0.28 - rd) * 1.2;
        }
        put(i, shade(mix(c1, c2, seam * 0.6), tint * (0.94 + n * 0.12)), h, d.roughness * (0.9 + (n - 0.5) * 0.3), d.metalness);
        break;
      }
      case 'wood': {    // deski: słoje wzdłuż u, przesunięte łączenia
        const P = d.planks, row = Math.floor(v * P), pv = (v * P) % 1, off = ((row * 0.37) % 1), pu = (u + off) % 1;
        const joint = Math.min(pv, 1 - pv) < 0.025 || (Math.min(pu % 0.5, 0.5 - (pu % 0.5)) < 0.004) ? 1 : 0;
        const ring = 0.5 + 0.5 * Math.sin((v * P * 9 + fbm(u * 0.25 + row * 0.13, v, 3) * 6 + row * 3.1) * Math.PI * 2 * d.grain);
        const plank = 0.85 + ((row * 0.618) % 1) * 0.3;
        put(i, joint ? shade(c2, 0.6) : shade(mix(c1, c2, ring * 0.45 * d.grain + (1 - plank) * 0.5), plank), joint ? 0.15 : 0.55 + ring * 0.05 + (f - 0.5) * 0.05, d.roughness * (joint ? 1.1 : 0.95 + ring * 0.1), d.metalness);
        break;
      }
      case 'rock': {
        const e = cells(u, v), crack = clamp(1 - e / (0.04 + 0.08 * (1 - d.cracks))) * d.cracks, g = fine(u * 2, v * 2) * d.grains;
        const col = shade(mix(c1, c2, clamp(n * 0.9 + g * 0.5 - 0.2)), 0.85 + f * 0.3 - crack * 0.5);
        put(i, col, n * 0.7 + g * 0.25 - crack * 0.5, d.roughness * (0.95 + g * 0.1), d.metalness);
        break;
      }
      case 'concrete': {
        const pore = fine(u * 4, v * 4) > 1 - d.pores * 0.18 ? 1 : 0, speck = r() < 0.03 ? (r() - 0.5) * 0.3 : 0;
        put(i, shade(mix(c1, c2, n * 0.6), 0.95 + speck - pore * 0.35), 0.55 + (n - 0.5) * 0.2 - pore * 0.4, d.roughness, d.metalness);
        break;
      }
      case 'brick': {   // cegły w wiązaniu (co drugi rząd przesunięty o pół), zaprawa w fugach
        const P = d.bricks, row = Math.floor(v * P), bv = (v * P) % 1, bu = (u * P / 2 + (row % 2) * 0.5) % 1;
        const mortar = bv < 0.12 || bu < 0.06;
        const id = Math.floor(u * P / 2 + (row % 2) * 0.5) * 13 + row * 7, t = 0.82 + ((id * 0.618) % 1) * 0.3;
        if (mortar) put(i, shade(c2, 0.9 + f * 0.2), 0.25 + f * 0.1, 0.95, 0);
        else put(i, shade(mix(c1, shade(c1, 0.7), n), t), 0.6 + (f - 0.5) * 0.15, d.roughness, d.metalness);
        break;
      }
      case 'paper': {
        const fib = fine(u * 0.5, v * 8, 3) * d.fibres + fine(u * 8, v * 0.5, 3) * d.fibres * 0.5;
        put(i, shade(mix(c1, c2, n * 0.4 + fib * 0.15), 1 - fib * 0.04), 0.5 + fib * 0.12, d.roughness, d.metalness);
        break;
      }
      case 'fabric': {  // splot płócienny: nitki na zmianę wierzchem
        const T = d.threads, cu = Math.floor(u * T), cv = Math.floor(v * T), fu = (u * T) % 1, fv = (v * T) % 1, over = (cu + cv) & 1;
        const h = over ? Math.sin(fu * Math.PI) : Math.sin(fv * Math.PI);
        put(i, shade(mix(c1, c2, (1 - h) * 0.5 + n * 0.2), 0.9 + h * 0.15), h * 0.6 + n * 0.1, d.roughness, d.metalness);
        break;
      }
      case 'plaster': {
        const tr = fbm(u * 0.5 + fine(u, v, 2) * 0.3, v * 0.5, 3) * d.trowel;
        put(i, shade(mix(c1, c2, tr * 0.6 + n * 0.2), 0.95 + f * 0.08), 0.5 + tr * 0.3 + (f - 0.5) * 0.08, d.roughness * (0.9 + tr * 0.2), d.metalness);
        break;
      }
      case 'ice': {
        const e = cells(u, v), crack = clamp(1 - e / 0.05) * d.cracks, bub = fine(u * 3, v * 3) > 0.82 ? 1 : 0;
        put(i, shade(mix(c1, c2, n * 0.5 + crack * 0.6), 1 + bub * 0.15), 0.5 + (n - 0.5) * 0.15 - crack * 0.25, d.roughness + crack * 0.4, d.metalness);
        break;
      }
    }
  }
  // starzenie: zużycie (odpryski farby albo rysy), brud w zagłębieniach, rdza z zaciekami
  const wn = makeFbm(S + 211, 8, 4), dn = makeFbm(S + 307, 4, 4), rn = makeFbm(S + 401, 4, 5);
  const metalUnder = hex('#8a8f93');
  if (d.wear > 0 && r) {   // rysy: krótkie odcinki jaśniejsze i gładsze
    const n = Math.round(d.wear * res * 0.6);
    for (let k = 0; k < n; k++) {
      let x = r() * res, y = r() * res; const a = r() * Math.PI, len = 4 + r() * res * 0.06;
      for (let s = 0; s < len; s++) { x += Math.cos(a); y += Math.sin(a); const i = ((Math.floor(y) % res + res) % res) * res + ((Math.floor(x) % res + res) % res); H[i] -= 0.04; R[i] *= 0.75; C[i * 3] = lerp(C[i * 3], 1, 0.15); C[i * 3 + 1] = lerp(C[i * 3 + 1], 1, 0.15); C[i * 3 + 2] = lerp(C[i * 3 + 2], 1, 0.15); }
    }
  }
  for (let y = 0, i = 0; y < res; y++) for (let x = 0; x < res; x++, i++) {
    const u = x / res, v = y / res;
    if (d.kind === 'paint' && d.wear > 0) {   // odprysk: pod farbą goły metal
      const w = wn(u, v); if (w > 1 - d.wear * 0.45) { C[i * 3] = metalUnder[0]; C[i * 3 + 1] = metalUnder[1]; C[i * 3 + 2] = metalUnder[2]; M[i] = 0.9; R[i] = 0.35; H[i] -= 0.06; }
    }
    if (d.rust > 0) {   // rdza: plamy z fbm i zacieki w dół (v rośnie w dół kafelka)
      let ru = rn(u, v); const drip = rn(u * 1, v * 0.15, 3); ru = Math.max(ru, drip * 0.95 * (0.6 + 0.4 * dn(u, v)));
      const t = clamp((ru - (1 - d.rust * 0.55)) * 6);
      if (t > 0) {
        const rc = mix(hex('#7a3b1c'), hex('#b5642d'), dn(u * 3, v * 3));
        C[i * 3] = lerp(C[i * 3], rc[0], t); C[i * 3 + 1] = lerp(C[i * 3 + 1], rc[1], t); C[i * 3 + 2] = lerp(C[i * 3 + 2], rc[2], t);
        R[i] = lerp(R[i], 0.92, t); M[i] = lerp(M[i], 0.1, t); H[i] += t * 0.04 * (fine(u * 4, v * 4) - 0.3);
      }
    }
    if (d.dirt > 0) {   // brud: tam, gdzie nisko, i plamami
      const t = clamp((1 - H[i]) * 0.9 + dn(u * 2, v * 2) - 0.9) * d.dirt * 1.4;
      C[i * 3] *= 1 - t * 0.55; C[i * 3 + 1] *= 1 - t * 0.58; C[i * 3 + 2] *= 1 - t * 0.62; R[i] = lerp(R[i], 0.95, t * 0.7);
    }
  }
  // zacienienie zagłębień (AO) z wysokości: różnica z rozmytą wysokością sąsiedztwa
  const AO = new Float32Array(N), K = Math.max(2, Math.round(res / 128));
  for (let y = 0, i = 0; y < res; y++) for (let x = 0; x < res; x++, i++) {
    let s = 0; for (const [dx, dy] of [[K, 0], [-K, 0], [0, K], [0, -K], [K, K], [-K, -K], [K, -K], [-K, K]]) s += H[((y + dy + res) % res) * res + ((x + dx + res) % res)];
    AO[i] = clamp(1 - Math.max(0, s / 8 - H[i]) * 4 * d.bump);
  }
  const albedo = new Uint8ClampedArray(N * 4);
  for (let i = 0; i < N; i++) { albedo[i * 4] = clamp(C[i * 3]) * 255; albedo[i * 4 + 1] = clamp(C[i * 3 + 1]) * 255; albedo[i * 4 + 2] = clamp(C[i * 3 + 2]) * 255; albedo[i * 4 + 3] = 255; R[i] = clamp(R[i], 0.03, 1); M[i] = clamp(M[i]); }
  return { res, def: d, albedo, height: H, rough: R, metal: M, ao: AO };
}

// mapa normalnych z wysokości (zawinięta), siła = bump; RGBA (styczna przestrzeń, OpenGL)
function normalData(m) {
  const { res, height: H } = m, s = m.def.bump * res / 64, out = new Uint8Array(res * res * 4);
  for (let y = 0, i = 0; y < res; y++) for (let x = 0; x < res; x++, i++) {
    const hl = H[y * res + (x - 1 + res) % res], hr = H[y * res + (x + 1) % res], hd = H[((y - 1 + res) % res) * res + x], hu = H[((y + 1) % res) * res + x];
    const nx = (hl - hr) * s, ny = (hu - hd) * s, l = Math.hypot(nx, ny, 1);
    out[i * 4] = (nx / l * 0.5 + 0.5) * 255; out[i * 4 + 1] = (ny / l * 0.5 + 0.5) * 255; out[i * 4 + 2] = (1 / l * 0.5 + 0.5) * 255; out[i * 4 + 3] = 255;
  }
  return out;
}
// AO, szorstkość, metaliczność w jednej teksturze (R, G, B — tak czyta je Three.js)
function ormData(m) {
  const N = m.res * m.res, out = new Uint8Array(N * 4);
  for (let i = 0; i < N; i++) { out[i * 4] = m.ao[i] * 255; out[i * 4 + 1] = m.rough[i] * 255; out[i * 4 + 2] = m.metal[i] * 255; out[i * 4 + 3] = 255; }
  return out;
}
const dataTex = (data, res, srgb) => {
  const t = new THREE.DataTexture(data, res, res, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
};

export function makeMaterial(def, { res = 512, tile } = {}) {
  const maps = generate(def, res), d = maps.def;
  const map = dataTex(new Uint8Array(maps.albedo.buffer.slice(0)), res, true), normalMap = dataTex(normalData(maps), res), orm = dataTex(ormData(maps), res);
  const material = new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap: orm, metalnessMap: orm, aoMap: orm, roughness: 1, metalness: 1, aoMapIntensity: 1 });
  material.userData.tile = tile || d.tile; material.userData.matDef = d;
  const textures = { map, normalMap, orm };
  return { material, textures, maps, dispose() { material.dispose(); Object.values(textures).forEach((t) => t.dispose()); } };
}

// podglądy map jako canvas 2D (okno Mapy w laboratorium, eksport PNG)
export function canvases(m) {
  const { res } = m, mk = (fill) => { const c = document.createElement('canvas'); c.width = c.height = res; const g = c.getContext('2d'), img = g.createImageData(res, res); fill(img.data); g.putImageData(img, 0, 0); return c; };
  const gray = (src) => (dst) => { for (let i = 0; i < src.length; i++) { dst[i * 4] = dst[i * 4 + 1] = dst[i * 4 + 2] = clamp(src[i]) * 255; dst[i * 4 + 3] = 255; } };
  const nd = normalData(m);
  return { albedo: mk((dst) => dst.set(m.albedo)), normal: mk((dst) => dst.set(nd)), rough: mk(gray(m.rough)), metal: mk(gray(m.metal)), ao: mk(gray(m.ao)), height: mk(gray(m.height)) };
}
