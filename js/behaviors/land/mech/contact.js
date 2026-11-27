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

// macierz płaszczyzny: punkt (u, v) koła b (lokalne y, z części wirującej przy θ = 0) → (y, z) w układzie koła a
export function planeMap(spinA, spinB) {
  const base = (s) => { const r = s.rotation.x; s.rotation.x = 0; s.updateWorldMatrix(true, false); const m = s.matrixWorld.clone(); s.rotation.x = r; s.updateWorldMatrix(true, false); return m; };
  const M = base(spinA).invert().multiply(base(spinB)), e = M.elements;   // kolumnami: e[4..6] — oś y koła b, e[8..10] — oś z, e[12..14] — początek
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
export function contactPair({ hullsA, hullsB, za, zb, map }) {
  const { a00, a01, a10, a11, tx, ty } = map;
  const TA = teeth(hullsA, za), TB = teeth(hullsB, zb), roB = Math.max(...TB.map((t) => t.ro)), rtA = Math.max(...TA.map((t) => t.r));
  const pickA = [];
  function hit(ta, tb) {
    const ca = Math.cos(ta), sa = Math.sin(ta), cb = Math.cos(tb), sb = Math.sin(tb);
    pickA.length = 0;
    for (const t of TA) {
      t.wx = t.cx * ca - t.cy * sa; t.wy = t.cx * sa + t.cy * ca;
      if (Math.hypot(t.wx - tx, t.wy - ty) > roB + t.r) continue;
      t.parts.forEach((q, n) => { const d = t.buf[n]; for (let k = 0; k < q.length; k += 2) { d[k] = q[k] * ca - q[k + 1] * sa; d[k + 1] = q[k] * sa + q[k + 1] * ca; } });
      pickA.push(t);
    }
    if (!pickA.length) return false;
    for (const t of TB) {
      const u = t.cx * cb - t.cy * sb, v = t.cx * sb + t.cy * cb; t.wx = a00 * u + a01 * v + tx; t.wy = a10 * u + a11 * v + ty; t.placed = false;
      for (const s of pickA) {
        if (Math.hypot(s.wx - t.wx, s.wy - t.wy) > s.r + t.r) continue;
        if (!t.placed) { t.parts.forEach((q, n) => { const d = t.buf[n]; for (let k = 0; k < q.length; k += 2) { const x = q[k] * cb - q[k + 1] * sb, y = q[k] * sb + q[k + 1] * cb; d[k] = a00 * x + a01 * y + tx; d[k + 1] = a10 * x + a11 * y + ty; } }); t.placed = true; }
        for (const P of s.buf) for (const Q of t.buf) if (overlap(P, P.length, Q, Q.length)) return true;
      }
    }
    return false;
  }
  const pitchB = TAU / zb;
  function gap(ta, tb0, s) {   // krok po kroku, potem połowienie przedziału do ~10⁻⁸ rad
    const step = pitchB / 64; let a = 0, b = 0;
    for (let d = step; d <= pitchB; d += step) { if (hit(ta, tb0 + s * d)) { b = d; break; } a = d; }
    if (!b) return s * pitchB;   // nie dotknął w całej podziałce
    for (let k = 0; k < 26; k++) { const m = (a + b) / 2; if (hit(ta, tb0 + s * m)) b = m; else a = m; }
    return s * a;
  }
  return { hit, gap, parts: TA.reduce((n, t) => n + t.parts.length, 0) + TB.reduce((n, t) => n + t.parts.length, 0), rtA };
}

export function meshZone({ hullsA, hullsB, za, zb, map, rel, samples = 48 }) {
  const pair = contactPair({ hullsA, hullsB, za, zb, map }), { hit, gap } = pair;
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
