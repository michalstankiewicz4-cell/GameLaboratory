// Bryły zderzeń zazębienia (środowisko ląd, tryb „Fizyka” laboratorium mechaniki). Ząb koła to wielokąt wypukły
// (zarys ewolwentowy odcięty cięciwą na kole stóp — MechKit.toothHulls), koło w płaszczyźnie obrotu — z zębów,
// test zderzenia — osie rozdzielające (SAT) między zębami dwóch kół. Z tego, a nie ze wzoru, wychodzi strefa swobody
// zazębienia: dla kąta koła a szukamy, o ile można obrócić koło b w przód i w tył od położenia nominalnego, zanim
// ząb dotknie zęba (połowienie przedziału do 10⁻⁸ rad). Wynik — tabela [lo, hi] po fazie koła a w obrębie jednej
// podziałki (wzór powtarza się co ząb), czyli luz razem z jego zmiennością wzdłuż przyporu (zarys z odcinków).
//
//   const map = planeMap(spinA, spinB)   // płaszczyzna koła b → płaszczyzna koła a (osie równoległe)
//   const z = meshZone({ hullsA, hullsB, za, zb, map, rel, samples })
//   z.zone(θa, out) → out.lo, out.hi (C = θb − rel(θa) w [lo, hi] — zęby się nie dotykają)
//   z.hit(θa, θb) → czy bryły zębów się przenikają;  z.pen — ile próbek nominalnych już się przenikało (0 = dobrze)
//   const c = contactPair({ hullsA, hullsB, za, zb, map }) — samo zderzenie i odstęp (gap) dla par bez wiązania
//   (satelity przekładni planetarnej ze słonecznym i koroną)

const TAU = Math.PI * 2;

// ---------------- zderzenie brył (3D): punkty powierzchni jednej części wewnątrz zamkniętej siatki drugiej ----------------
// Punkty — wierzchołki siatek A; liczy się punkt wewnątrz B głębiej niż `inset` (wewnątrz są też punkty przesunięte
// o ±inset wzdłuż każdej osi), żeby powierzchnie stykające się z założenia (kubek w otworze oczka) nie liczyły się
// jako przenikanie; wnętrze — nieparzysta liczba przecięć promienia z trójkątami B (Möller–Trumbore). Sprawdzane
// w obie strony. Siatki muszą być zamknięte (bryły).
const _ray = [0.5773, 0.5774, 0.5772];
function worldTris(obj) {
  const out = [];
  obj.updateWorldMatrix(true, true);
  obj.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return; const g = o.geometry, pa = g.attributes.position, ix = g.index, n = ix ? ix.count : pa.count, e = o.matrixWorld.elements;
    for (let i = 0; i < n; i += 3) for (let k = 0; k < 3; k++) {
      const j = ix ? ix.getX(i + k) : i + k, x = pa.getX(j), y = pa.getY(j), z = pa.getZ(j);
      out.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
    }
  });
  const T = Float64Array.from(out), bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = 0; i < T.length; i += 3) for (let k = 0; k < 3; k++) { bb[k] = Math.min(bb[k], T[i + k]); bb[k + 3] = Math.max(bb[k + 3], T[i + k]); }
  return { T, bb };
}
function worldPoints(obj) {
  const out = [];
  obj.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return; const g = o.geometry, pa = g.attributes.position, e = o.matrixWorld.elements;
    for (let j = 0; j < pa.count; j++) {
      const x = pa.getX(j), y = pa.getY(j), z = pa.getZ(j);
      out.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
    }
  });
  return out;
}
function inside(px, py, pz, { T, bb }) {
  if (px < bb[0] || py < bb[1] || pz < bb[2] || px > bb[3] || py > bb[4] || pz > bb[5]) return false;
  const [dx, dy, dz] = _ray; let hits = 0;
  for (let i = 0; i < T.length; i += 9) {
    const e1x = T[i + 3] - T[i], e1y = T[i + 4] - T[i + 1], e1z = T[i + 5] - T[i + 2], e2x = T[i + 6] - T[i], e2y = T[i + 7] - T[i + 1], e2z = T[i + 8] - T[i + 2];
    const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x, a = e1x * hx + e1y * hy + e1z * hz;
    if (Math.abs(a) < 1e-14) continue;
    const f = 1 / a, sx = px - T[i], sy = py - T[i + 1], sz = pz - T[i + 2], u = f * (sx * hx + sy * hy + sz * hz); if (u < 0 || u > 1) continue;
    const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, w = f * (dx * qx + dy * qy + dz * qz); if (w < 0 || u + w > 1) continue;
    if (f * (e2x * qx + e2y * qy + e2z * qz) > 1e-9) hits++;
  }
  return (hits & 1) === 1;
}
// meshClash(A, B) → liczba punktów jednej części wewnątrz drugiej (0 = bez przenikania)
export function meshClash(A, B, { inset = 3e-4 } = {}) {   // inset 0,3 mm: mniej niż to — styk (siatki z wielokątów nie są idealnymi walcami)
  const tA = worldTris(A), tB = worldTris(B);
  if (tA.bb[3] < tB.bb[0] || tB.bb[3] < tA.bb[0] || tA.bb[4] < tB.bb[1] || tB.bb[4] < tA.bb[1] || tA.bb[5] < tB.bb[2] || tB.bb[5] < tA.bb[2]) return 0;
  let n = 0;
  const deep = (x, y, z, M) => inside(x, y, z, M) && inside(x + inset, y, z, M) && inside(x - inset, y, z, M) && inside(x, y + inset, z, M) && inside(x, y - inset, z, M) && inside(x, y, z + inset, M) && inside(x, y, z - inset, M);
  for (const [P, M] of [[worldPoints(A), tB], [worldPoints(B), tA]]) for (let i = 0; i < P.length; i += 3) if (deep(P[i], P[i + 1], P[i + 2], M)) n++;
  return n;
}

// macierz płaszczyzny: punkt (u, v) koła b (lokalne y, z części wirującej przy θ = 0) → (y, z) w układzie koła a
export function planeMap(spinA, spinB, { slideB = null } = {}) {   // slideB: oś przesuwu części b ('x' | 'y' | 'z') — zero przesuwu zamiast zera kąta
  const base = (s, ax) => { const r = ax ? s.position[ax] : s.rotation.x; if (ax) s.position[ax] = 0; else s.rotation.x = 0; s.updateWorldMatrix(true, false); const m = s.matrixWorld.clone(); if (ax) s.position[ax] = r; else s.rotation.x = r; s.updateWorldMatrix(true, false); return m; };
  const M = base(spinA).invert().multiply(base(spinB, slideB)), e = M.elements;   // kolumnami: e[4..6] — oś y koła b, e[8..10] — oś z, e[12..14] — początek
  return { a00: e[5], a01: e[9], a10: e[6], a11: e[10], tx: e[13], ty: e[14], parallel: Math.abs(Math.abs(e[0]) - 1) < 1e-6, dx: e[12] };
}

// rzut wielokąta na oś — przedział
function proj(P, n, nx, ny, out) { let lo = Infinity, hi = -Infinity; for (let i = 0; i < n; i += 2) { const d = P[i] * nx + P[i + 1] * ny; if (d < lo) lo = d; if (d > hi) hi = d; } out[0] = lo; out[1] = hi; }
const IA = [0, 0], IB = [0, 0];
function separated(P, np, Q, nq) {   // oś rozdzielająca wśród normalnych krawędzi P (bez założeń o kierunku obiegu)
  for (let i = 0; i < np; i += 2) {
    const j = (i + 2) % np, nx = P[j + 1] - P[i + 1], ny = P[i] - P[j];
    proj(P, np, nx, ny, IA); proj(Q, nq, nx, ny, IB);
    if (IB[0] > IA[1] || IA[0] > IB[1]) return true;
  }
  return false;
}
const overlap = (P, np, Q, nq) => !separated(P, np, Q, nq) && !separated(Q, nq, P, np);

// para kół (zęby jako części wypukłe): hit(θa, θb) — czy bryły się przenikają; gap(θa, θb0, ±1) — o ile można
// obrócić koło b od θb0 w danym kierunku do pierwszego dotyku (rad). Zęby: wielokąt [[x, y]…] (wypukły, środek
// i·2π/z) albo { parts: [wielokąty wypukłe], ang }. Wybór par: zęby a blisko osi b, zęby b, których okrąg
// opisany zachodzi na okrąg zęba a — działa i dla zazębienia zewnętrznego, i wewnętrznego (koło koronowe).
function teeth(h, z) {
  return h.map((t, i) => {
    const parts = (Array.isArray(t) ? [t] : t.parts).map((q) => Float64Array.from(q.flat())), all = parts.flatMap((q) => Array.from(q));
    let cx = 0, cy = 0; for (let k = 0; k < all.length; k += 2) { cx += all[k]; cy += all[k + 1]; } cx /= all.length / 2; cy /= all.length / 2;
    let r = 0, ro = 0; for (let k = 0; k < all.length; k += 2) { r = Math.max(r, Math.hypot(all[k] - cx, all[k + 1] - cy)); ro = Math.max(ro, Math.hypot(all[k], all[k + 1])); }
    return { parts, buf: parts.map((q) => new Float64Array(q.length)), cx, cy, r, ro, wx: 0, wy: 0, placed: false };
  });
}
export function contactPair({ hullsA, hullsB, za, zb, map, slideB = false, pitchB: pB }) {   // slideB: część b przesuwa się wzdłuż swojego u (listwa), tb w metrach
  const { a00, a01, a10, a11, tx, ty } = map;
  const TA = teeth(hullsA, za), TB = teeth(hullsB, zb), roB = Math.max(...TB.map((t) => t.ro)), rtA = Math.max(...TA.map((t) => t.r));
  const pickA = [];
  function hit(ta, tb) {
    const ca = Math.cos(ta), sa = Math.sin(ta), cb = slideB ? 1 : Math.cos(tb), sb = slideB ? 0 : Math.sin(tb), db = slideB ? tb : 0;
    pickA.length = 0;
    for (const t of TA) {
      t.wx = t.cx * ca - t.cy * sa; t.wy = t.cx * sa + t.cy * ca;
      if (Math.hypot(t.wx - tx, t.wy - ty) > roB + t.r) continue;
      t.parts.forEach((q, n) => { const d = t.buf[n]; for (let k = 0; k < q.length; k += 2) { d[k] = q[k] * ca - q[k + 1] * sa; d[k + 1] = q[k] * sa + q[k + 1] * ca; } });
      pickA.push(t);
    }
    if (!pickA.length) return false;
    for (const t of TB) {
      const u = t.cx * cb - t.cy * sb + db, v = t.cx * sb + t.cy * cb; t.wx = a00 * u + a01 * v + tx; t.wy = a10 * u + a11 * v + ty; t.placed = false;
      for (const s of pickA) {
        if (Math.hypot(s.wx - t.wx, s.wy - t.wy) > s.r + t.r) continue;
        if (!t.placed) { t.parts.forEach((q, n) => { const d = t.buf[n]; for (let k = 0; k < q.length; k += 2) { const x = q[k] * cb - q[k + 1] * sb + db, y = q[k] * sb + q[k + 1] * cb; d[k] = a00 * x + a01 * y + tx; d[k + 1] = a10 * x + a11 * y + ty; } }); t.placed = true; }
        for (const P of s.buf) for (const Q of t.buf) if (overlap(P, P.length, Q, Q.length)) return true;
      }
    }
    return false;
  }
  const pitchB = pB || TAU / zb;
  function gap(ta, tb0, s) {   // krok po kroku, potem połowienie przedziału do ~10⁻⁸ rad
    const step = pitchB / 64; let a = 0, b = 0;
    for (let d = step; d <= pitchB; d += step) { if (hit(ta, tb0 + s * d)) { b = d; break; } a = d; }
    if (!b) return s * pitchB;   // nie dotknął w całej podziałce
    for (let k = 0; k < 26; k++) { const m = (a + b) / 2; if (hit(ta, tb0 + s * m)) b = m; else a = m; }
    return s * a;
  }
  return { hit, gap, parts: TA.reduce((n, t) => n + t.parts.length, 0) + TB.reduce((n, t) => n + t.parts.length, 0), rtA };
}

export function meshZone({ hullsA, hullsB, za, zb, map, rel, samples = 48, slideB = false, pitchB }) {
  const pair = contactPair({ hullsA, hullsB, za, zb, map, slideB, pitchB }), { hit, gap } = pair;
  const { tx, ty } = map;
  // strefa swobody z brył: od położenia nominalnego w przód / w tył do dotyku zębów
  const period = TAU / za, lo = new Float64Array(samples), hi = new Float64Array(samples);
  let pen = 0;
  for (let k = 0; k < samples; k++) {
    const ta = k * period / samples, tb0 = rel(ta, 0);
    if (hit(ta, tb0)) { pen++; lo[k] = hi[k] = 0; continue; }
    hi[k] = gap(ta, tb0, 1); lo[k] = gap(ta, tb0, -1);
  }
  const stat = (arr) => ({ min: Math.min(...arr), max: Math.max(...arr) });
  const width = Array.from(hi, (h, k) => h - lo[k]);
  function zone(ta, out) {
    let f = (ta / period) % 1; if (f < 0) f += 1;
    const x = f * samples, i = Math.floor(x) % samples, j = (i + 1) % samples, u = x - Math.floor(x);
    out.lo = lo[i] + (lo[j] - lo[i]) * u; out.hi = hi[i] + (hi[j] - hi[i]) * u;
    return out;
  }
  return { zone, hit, lo, hi, pen, samples, parts: pair.parts, width: { ...stat(width), mean: width.reduce((a, b) => a + b, 0) / samples }, hi0: stat(hi), lo0: stat(lo), center: Math.hypot(tx, ty) };
}
