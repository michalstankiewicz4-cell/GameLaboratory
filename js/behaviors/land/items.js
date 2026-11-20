// Zachowanie „przedmioty na lądzie” (środowisko: ląd) — luźne przedmioty jako bryły sztywne: grawitacja, grunt,
// zderzenia ze sobą, z zderzaczami nieruchomymi (budowle, maszyny) i ruchomymi (pojazd, tłok, tygiel), tarcie i obroty
// od uderzeń (przewracanie się, toczenie po krawędzi). Wspólne dla przeładowarki (land/grapple.js) i maszyn złomowiska
// (land/machines/). W grze Złomowisko liczył to Rapier; tu własny, prosty silnik:
//   - bryła: prostopadłościan albo walec (graniastosłup o 8–16 ścianach bocznych — opona, beczka, puszka, garnek
//     toczą się po obwodzie; pierścień opony jako walec o bezwładności pierścienia), półwymiary przedmiotu (zderzacz
//     gry — Items.halfExtents), masa i tensor bezwładności bryły, położenie, obrót (kwaternion), prędkość i prędkość
//     kątowa;
//   - kontakty: grunt (wierzchołki pod gruntem), bryły wypukłe ze sobą i z prostopadłościanami nieruchomymi i ruchomymi
//     (SAT — oś najmniejszego wnikania spośród normalnych ścian i iloczynów krawędzi, punkty kontaktu: wierzchołki
//     jednej bryły w drugiej);
//   - rozwiązywanie: impulsy sekwencyjne (8 przejść) z odbiciem 0,1, tarciem Coulomba (guma μ 0,9, reszta 0,55 — jak
//     w grze) i korektą położenia (Baumgarte 0,2, luz 2 mm); krok 1/240 s; bryły w spoczynku zasypiają;
//   - zgniatanie: setScale — półwymiary maleją wzdłuż osi (masa bez zmian, jak w grze; zgnieciony walec — eliptyczny);
//   - odrzut: bryły ruchome zbierają impulsy, które dały przedmiotom (o.J, o.T — moment względem o.c, z poprzedniego
//     kroku) — właściciel (pojazd) oddaje je sobie (land/grapple.js).

// createItems({ ground }) → W
//   W.add({ mesh, mass, half, shape, name, kind, at, q, rubber, anchor, meshScale, onRemove }) → przedmiot { p, q, v, w, half,
//     mass, mesh, held, heat, temp, … }; anchor — gdzie siatka ma początek (ułamek półwymiarów, np. [0, −1, 0] — spód),
//     meshScale — skala siatki poza zgnieceniem, onRemove(it) — zamiast odpięcia siatki (np. edytor: ukrycie);
//     shape: { type: 'box' } (domyślnie) albo { type: 'cyl', hollow: rWew/rZew } — oś walca to y przedmiotu
//   W.remove(it), W.setScale(it, [sx, sy, sz]), W.statics(lista OBB) / W.addStatics(lista) → odpięcie,
//   W.kinematic(lista OBB z prędkością v) / W.addKinematic(lista) → odpięcie
//   W.step(dt), W.sync() — siatki z brył; W.list — przedmioty
//   W.hook(f) — f(h) na początku każdego kroku 1/240 s (pojazdy i maszyny liczą się w tym samym rytmie); zwraca odpięcie
//   przedmiot trzymany (it.held = true) porusza ktoś inny (chwytak): ma nieskończoną masę wobec reszty
// OBB: { c: Vector3, ax: [3 × Vector3], e: [3 półwymiary], v?: Vector3 (prędkość — ruchome), skip?: przedmiot,
//   z którym się nie zderza (np. głowica chwytaka z tym, co ściska), J, T — odrzut (ruchome) }
import * as THREE from '../../../vendor/three/three.module.js';

export const ENVIRONMENTS = ['land'];
const G = 9.81, STEP = 1 / 240, ITER = 8, SLOP = 0.002, BETA = 0.2, REST = 0.1;
const V = () => new THREE.Vector3();

export const newObb = () => ({ c: V(), ax: [V(), V(), V()], e: [0, 0, 0], v: V(), J: V(), T: V() });
// OBB z macierzy świata części i opisu w jej układzie (środek, półwymiary, obrót [rx, ry, rz])
export function obbFrom(matrix, center, half, rot, out = newObb()) {
  const m = new THREE.Matrix4();
  if (rot) m.makeRotationFromEuler(new THREE.Euler(...rot)); else m.identity();
  m.setPosition(...center); m.premultiply(matrix);
  out.c.setFromMatrixPosition(m);
  for (let i = 0; i < 3; i++) out.ax[i].setFromMatrixColumn(m, i).normalize();
  // skala części (obiekt sceny w skali s): półwymiary rosną z długością kolumn macierzy
  for (let i = 0; i < 3; i++) out.e[i] = half[i] * tmpS.setFromMatrixColumn(m, i).length();
  return out;
}
const tmpS = new THREE.Vector3();

const axisT = V(), dT = V();
/** Najmniejsze wnikanie B w A (SAT, 15 osi) dla dwóch OBB: głębokość albo null; nOut — normalna od A do B. */
export function sat(A, B, nOut) {
  let best = Infinity;
  dT.copy(B.c).sub(A.c);
  const test = (L) => {
    const len = L.length(); if (len < 1e-6) return true;
    L.multiplyScalar(1 / len);
    let ra = 0, rb = 0;
    for (let i = 0; i < 3; i++) { ra += A.e[i] * Math.abs(A.ax[i].dot(L)); rb += B.e[i] * Math.abs(B.ax[i].dot(L)); }
    const d = dT.dot(L), o = ra + rb - Math.abs(d);
    if (o < 0) return false;
    if (o < best) { best = o; nOut.copy(L).multiplyScalar(d < 0 ? -1 : 1); }
    return true;
  };
  for (let i = 0; i < 3; i++) if (!test(axisT.copy(A.ax[i]))) return null;
  for (let i = 0; i < 3; i++) if (!test(axisT.copy(B.ax[i]))) return null;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (!test(axisT.crossVectors(A.ax[i], B.ax[j]))) return null;
  return best;
}

// Bryła wypukła w świecie: { c, verts: [Vector3], faces: [Vector3] (normalne ścian, po jednej z każdej pary
// równoległych — bryła to przecięcie warstw między skrajnymi rzutami), edges: [Vector3] (kierunki krawędzi), lo, hi
// (rzuty skrajne na faces), r (promień kuli opisanej) }
const newHull = (nv, nf, ne) => ({ c: V(), verts: Array.from({ length: nv }, V), faces: Array.from({ length: nf }, V), edges: Array.from({ length: ne }, V), lo: new Float64Array(nf), hi: new Float64Array(nf), r: 0, n: nv });
function slabs(H) {
  for (let k = 0; k < H.faces.length; k++) {
    let lo = Infinity, hi = -Infinity; const f = H.faces[k];
    for (let i = 0; i < H.n; i++) { const d = H.verts[i].dot(f); if (d < lo) lo = d; if (d > hi) hi = d; }
    H.lo[k] = lo; H.hi[k] = hi;
  }
  return H;
}
/** Prostopadłościan (OBB) jako bryła wypukła. */
function hullOfObb(o, H = newHull(8, 3, 3)) {
  H.c.copy(o.c); let k = 0;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) H.verts[k++].copy(o.c).addScaledVector(o.ax[0], sx * o.e[0]).addScaledVector(o.ax[1], sy * o.e[1]).addScaledVector(o.ax[2], sz * o.e[2]);
  for (let i = 0; i < 3; i++) { H.faces[i].copy(o.ax[i]); H.edges[i].copy(o.ax[i]); }
  H.r = Math.hypot(o.e[0], o.e[1], o.e[2]);
  return slabs(H);
}
const projMin = (H, L) => { let m = Infinity; for (let i = 0; i < H.n; i++) { const d = H.verts[i].dot(L); if (d < m) m = d; } return m; };
const projMax = (H, L) => { let m = -Infinity; for (let i = 0; i < H.n; i++) { const d = H.verts[i].dot(L); if (d > m) m = d; } return m; };
/** Najmniejsze wnikanie dwóch brył wypukłych (SAT): głębokość albo null; nOut — normalna od A do B. */
function satHull(A, B, nOut) {
  let best = Infinity;
  const test = (L) => {
    const len = L.length(); if (len < 1e-6) return true;
    L.multiplyScalar(1 / len);
    const aMin = projMin(A, L), aMax = projMax(A, L), bMin = projMin(B, L), bMax = projMax(B, L);
    const o1 = aMax - bMin, o2 = bMax - aMin;   // B po stronie +L / −L
    if (o1 < 0 || o2 < 0) return false;
    const o = Math.min(o1, o2);
    if (o < best) { best = o; nOut.copy(L).multiplyScalar(o1 <= o2 ? 1 : -1); }
    return true;
  };
  for (const f of A.faces) if (!test(axisT.copy(f))) return null;
  for (const f of B.faces) if (!test(axisT.copy(f))) return null;
  for (const ea of A.edges) for (const eb of B.edges) if (!test(axisT.crossVectors(ea, eb))) return null;
  return best;
}
const insideHull = (H, p, tol) => { for (let k = 0; k < H.faces.length; k++) { const d = p.dot(H.faces[k]); if (d < H.lo[k] - tol || d > H.hi[k] + tol) return false; } return true; };

// kształt przedmiotu w jego układzie: wierzchołki, normalne ścian i kierunki krawędzi (z półwymiarów)
function localShape(it) {
  const [hx, hy, hz] = it.half;
  if (it.shape.type !== 'cyl') {
    const verts = []; for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) verts.push(new THREE.Vector3(sx * hx, sy * hy, sz * hz));
    const ax = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
    return { verts, faces: ax, edges: ax.map((a) => a.clone()) };
  }
  const n = it.shape.n, ring = [];
  for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n; ring.push(new THREE.Vector3(hx * Math.cos(a), 0, hz * Math.sin(a))); }
  const verts = []; for (const sy of [-1, 1]) for (const r of ring) verts.push(r.clone().setY(sy * hy));
  const Y = new THREE.Vector3(0, 1, 0), faces = [Y.clone()], edges = [Y.clone()];
  for (let i = 0; i < n / 2; i++) {   // n parzyste: przeciwległe ściany równoległe
    const e = ring[(i + 1) % n].clone().sub(ring[i]).normalize();
    edges.push(e); faces.push(new THREE.Vector3().crossVectors(e, Y).normalize());
  }
  return { verts, faces, edges };
}

export function createItems({ ground = null } = {}) {
  const gh = (x, z) => (ground && ground.height ? ground.height(x, z) : 0);
  const list = [], statics = [], moving = [], hooks = [];
  let acc = 0;
  const contacts = [];
  const obbHulls = new WeakMap();   // bryła wypukła prostopadłościanu nieruchomego / ruchomego (przeliczana co krok)

  function inertia(it) {   // tensor bryły (w jej układzie, przekątny) — odwrotność
    const [hx, hy, hz] = it.half, m = it.mass;
    if (it.shape.type === 'cyl') {
      // walec eliptyczny (zgnieciony) o osi y; pierścień (opona): wnętrze puste od hollow · r
      const k = 1 + (it.shape.hollow || 0) ** 2, h2 = (2 * hy) ** 2;
      it.invI = [1 / (m * (k * hz * hz / 4 + h2 / 12)), 1 / (m * k * (hx * hx + hz * hz) / 4), 1 / (m * (k * hx * hx / 4 + h2 / 12))];
    } else {
      const [a, b, c] = it.half.map((h) => 2 * h);
      it.invI = [12 / (m * (b * b + c * c)), 12 / (m * (a * a + c * c)), 12 / (m * (a * a + b * b))];
    }
    it.shapeL = localShape(it);
    it.hull = newHull(it.shapeL.verts.length, it.shapeL.faces.length, it.shapeL.edges.length);
  }
  // bryła przedmiotu w świecie (it.hull) i jego prostopadłościan opisany (it.box — dla maszyn i chwytaka)
  function box(it) {
    const o = it.box; o.c.copy(it.p);
    o.ax[0].set(1, 0, 0).applyQuaternion(it.q); o.ax[1].set(0, 1, 0).applyQuaternion(it.q); o.ax[2].set(0, 0, 1).applyQuaternion(it.q);
    o.e[0] = it.half[0]; o.e[1] = it.half[1]; o.e[2] = it.half[2]; o.v.copy(it.v);
    const H = it.hull, L = it.shapeL; H.c.copy(it.p);
    for (let i = 0; i < H.n; i++) H.verts[i].copy(L.verts[i]).applyQuaternion(it.q).add(it.p);
    for (let i = 0; i < L.faces.length; i++) H.faces[i].copy(L.faces[i]).applyQuaternion(it.q);
    for (let i = 0; i < L.edges.length; i++) H.edges[i].copy(L.edges[i]).applyQuaternion(it.q);
    H.r = Math.hypot(it.half[0], it.half[1], it.half[2]);
    slabs(H);
    return o;
  }
  function hullOf(o) { let H = obbHulls.get(o); if (!H) { H = newHull(8, 3, 3); obbHulls.set(o, H); } return hullOfObb(o, H); }
  // odwrotność bezwładności w świecie razy wektor: R · I⁻¹ · Rᵀ · x
  const qi = new THREE.Quaternion(), tmpI = V();
  function invIw(it, x, out) {
    if (!dyn(it)) return out.set(0, 0, 0);
    qi.copy(it.q).invert(); tmpI.copy(x).applyQuaternion(qi);
    tmpI.x *= it.invI[0]; tmpI.y *= it.invI[1]; tmpI.z *= it.invI[2];
    return out.copy(tmpI).applyQuaternion(it.q);
  }
  const dyn = (it) => it && !it.held && !it.fixed && !it.sleep2;   // śpiący: nieruchomy w kontakcie (stos stoi)

  function addContact(a, b, p, n, depth, vA, obb) {   // a: przedmiot albo null (nieruchome / ruchome obb), b: przedmiot; n od a do b
    const mu = Math.sqrt((a && a.rubber ? 0.9 : 0.55) * (b.rubber ? 0.9 : 0.55));
    contacts.push({ a, b, p: p.clone(), n: n.clone(), depth, vA: vA ? vA.clone() : null, obb, mu, jn: 0, jt: [0, 0] });
  }
  const nT = V(), nnT = V();
  // HA: bryła A (przedmiotu albo prostopadłościanu), Bit: przedmiot (jego it.hull już policzone)
  function collideHulls(HA, Bit, aIt, vA, obb) {
    const HB = Bit.hull, r = HA.r + HB.r;
    if (HA.c.distanceToSquared(HB.c) > r * r) return;   // szybki test kul
    const d = satHull(HA, HB, nT); if (d === null) return;
    // punkty kontaktu: wierzchołki B w A i wierzchołki A w B (głębokość wzdłuż n)
    let found = 0;
    const sA = projMax(HA, nT);
    for (let i = 0; i < HB.n; i++) { const p = HB.verts[i]; if (insideHull(HA, p, 0.004)) { addContact(aIt, Bit, p, nT, Math.max(0, Math.min(d, sA - p.dot(nT))), vA, obb); found++; } }
    nnT.copy(nT).negate(); const sB = projMax(HB, nnT);
    for (let i = 0; i < HA.n; i++) { const p = HA.verts[i]; if (insideHull(HB, p, 0.004)) { addContact(aIt, Bit, p, nT, Math.max(0, Math.min(d, sB - p.dot(nnT))), vA, obb); found++; } }
    if (!found) addContact(aIt, Bit, HB.c.clone().addScaledVector(nT, -(sB - nnT.dot(HB.c)) + d / 2), nT, d, vA, obb);   // krawędź o krawędź
  }
  function collideObb(o, Bit, vA) { if (o.skip === Bit) return; collideHulls(hullOf(o), Bit, null, vA, o); }

  const up = new THREE.Vector3(0, 1, 0), ra = V(), rb = V(), va = V(), vb = V(), t1 = V(), t2 = V(), tmp = V(), tmp2 = V();
  function relVel(c) {
    rb.copy(c.p).sub(c.b.p); vb.copy(c.b.v).add(tmp.crossVectors(c.b.w, rb));
    if (c.a) { ra.copy(c.p).sub(c.a.p); va.copy(c.a.v).add(tmp.crossVectors(c.a.w, ra)); } else va.copy(c.vA || tmp.set(0, 0, 0));
    return vb.sub(va);
  }
  const Jc = V();
  function applyImpulse(c, J0) {
    const J = Jc.copy(J0);
    if (c.obb && c.obb.J) { c.obb.J.sub(J); c.obb.T.sub(tmp.copy(c.p).sub(c.obb.c).cross(J)); }   // odrzut bryły ruchomej
    if (dyn(c.b)) { c.b.v.addScaledVector(J, 1 / c.b.mass); c.b.w.add(invIw(c.b, tmp.crossVectors(rb.copy(c.p).sub(c.b.p), J), tmp2)); }
    if (dyn(c.a)) { c.a.v.addScaledVector(J, -1 / c.a.mass); c.a.w.sub(invIw(c.a, tmp.crossVectors(ra.copy(c.p).sub(c.a.p), J), tmp2)); }
  }
  function kEff(c, d) {   // masa efektywna w kierunku d
    let k = 0;
    if (dyn(c.b)) { rb.copy(c.p).sub(c.b.p); k += 1 / c.b.mass + d.dot(tmp.crossVectors(invIw(c.b, tmp2.crossVectors(rb, d), V()), rb)); }
    if (dyn(c.a)) { ra.copy(c.p).sub(c.a.p); k += 1 / c.a.mass + d.dot(tmp.crossVectors(invIw(c.a, tmp2.crossVectors(ra, d), V()), ra)); }
    return k;
  }

  function substep(h) {
    for (const f of hooks) f(h);
    for (const o of moving) if (o.J) { o.J.set(0, 0, 0); o.T.set(0, 0, 0); }
    // grawitacja; śpiące stoją
    for (const it of list) { if (it.sleep2) { it.v.set(0, 0, 0); it.w.set(0, 0, 0); } else if (dyn(it)) it.v.y -= G * h; }
    contacts.length = 0;
    for (const it of list) {
      box(it);
      if (it.held) continue;
      if (it.sleep2) { for (const o of moving) collideObb(o, it, o.v); continue; }   // śpiący: budzi go tylko to, co się rusza
      // grunt
      const g0 = gh(it.p.x, it.p.z), H = it.hull;
      for (let i = 0; i < H.n; i++) { const p = H.verts[i]; if (p.y < g0) addContact(null, it, p, up, g0 - p.y, null); }
      for (const o of statics) collideObb(o, it, null);
      for (const o of moving) collideObb(o, it, o.v);
    }
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const A = list[i], B = list[j];
      if ((A.held || A.sleep2) && (B.held || B.sleep2)) continue;
      if (A.held && B.held) continue;
      // szybki test kul
      const r = Math.hypot(...A.half) + Math.hypot(...B.half); if (A.p.distanceToSquared(B.p) > r * r) continue;
      if (B.held) collideHulls(B.hull, A, B, B.v); else collideHulls(A.hull, B, A, null);
    }
    // impulsy
    for (const c of contacts) { c.k = kEff(c, c.n); const vn = relVel(c).dot(c.n); c.bias = BETA / h * Math.max(0, c.depth - SLOP) - (vn < -0.5 ? REST * vn : 0);
      t1.copy(Math.abs(c.n.y) < 0.9 ? up : tmp.set(1, 0, 0)).cross(c.n).normalize(); c.t1 = t1.clone(); c.t2 = t2.crossVectors(c.n, c.t1).clone();
      c.k1 = kEff(c, c.t1); c.k2 = kEff(c, c.t2); }
    for (let it = 0; it < ITER; it++) for (const c of contacts) {
      if (!(c.k > 0)) continue;
      const vr = relVel(c), vn = vr.dot(c.n);
      let dj = (-vn + c.bias) / c.k; const j0 = c.jn; c.jn = Math.max(0, j0 + dj); dj = c.jn - j0;
      applyImpulse(c, tmp2.copy(c.n).multiplyScalar(dj));
      // tarcie (dwie styczne), najwyżej μ·jn
      for (const [t, k, s] of [[c.t1, c.k1, 0], [c.t2, c.k2, 1]]) {
        if (!(k > 0)) continue;
        const vt = relVel(c).dot(t); let djt = -vt / k; const jt0 = c.jt[s], max = c.mu * c.jn;
        c.jt[s] = Math.max(-max, Math.min(max, jt0 + djt)); djt = c.jt[s] - jt0;
        applyImpulse(c, V().copy(t).multiplyScalar(djt));
      }
    }
    // ruch i usypianie (bryła w spoczynku przez 0,5 s)
    for (const it of list) {
      if (!dyn(it)) continue;
      it.p.addScaledVector(it.v, h);
      const wl = it.w.length();
      if (wl > 1e-9) it.q.premultiply(new THREE.Quaternion().setFromAxisAngle(tmp.copy(it.w).multiplyScalar(1 / wl), wl * h)).normalize();
      it.w.multiplyScalar(Math.exp(-0.15 * h)); it.v.multiplyScalar(Math.exp(-0.05 * h));   // tłumienie jak w grze (Rapier: 0,15 / 0,05)
      if (it.v.lengthSq() < 0.0025 && it.w.lengthSq() < 0.01) { it.sleep += h; if (it.sleep > 0.5) { it.sleep2 = true; it.v.set(0, 0, 0); it.w.set(0, 0, 0); } } else it.sleep = 0;
    }
    // budzenie: kontakt z czymś, co się rusza
    for (const c of contacts) {
      const am = c.a ? (!c.a.sleep2 && (c.a.v.lengthSq() > 0.04 || c.a.held)) : (c.vA && c.vA.lengthSq() > 1e-6);
      if (am && c.b.sleep2) { c.b.sleep2 = false; c.b.sleep = 0; }
      if (c.a && c.a.sleep2 && !c.b.sleep2 && c.b.v.lengthSq() > 0.04) { c.a.sleep2 = false; c.a.sleep = 0; }
    }
  }

  const drop = (arr, l) => { for (const o of l) { const i = arr.indexOf(o); if (i >= 0) arr.splice(i, 1); } };
  const W = {
    list,
    add({ mesh, mass, half, shape = null, name, kind, at, q, rubber, variant = 0, anchor = null, meshScale = 1, onRemove = null }) {
      // walec: 16 ścian bocznych dla dużych (opona, beczka), 8 dla małych (puszka, garnek)
      const sh = shape && shape.type === 'cyl' ? { type: 'cyl', hollow: shape.hollow || 0, n: shape.n || (Math.max(half[0], half[2]) > 0.15 ? 16 : 8) } : { type: 'box' };
      const it = { mesh, mass, half: half.slice(), half0: half.slice(), shape: sh, scale: [1, 1, 1], name: name || kind, kind: kind || name, variant, rubber: !!rubber, anchor, meshScale, onRemove,
        p: new THREE.Vector3(...at), q: q ? q.clone() : (mesh ? mesh.quaternion.clone() : new THREE.Quaternion()), v: V(), w: V(), box: newObb(),
        held: false, fixed: false, sleep: 0, sleep2: false, heat: 0, temp: 20 };
      if (at[1] == null || at.length < 3) it.p.y = gh(it.p.x, it.p.z) + half[1];
      inertia(it); box(it); list.push(it); return it;
    },
    remove(it) {
      const i = list.indexOf(it); if (i >= 0) list.splice(i, 1); it.removed = true; it.held = false;
      if (it.onRemove) it.onRemove(it); else if (it.mesh && it.mesh.parent) it.mesh.parent.remove(it.mesh);
    },
    setScale(it, s) {
      it.scale = s.slice(); it.half = it.half0.map((h, k) => h * s[k]); inertia(it); box(it); it.sleep2 = false; it.sleep = 0;
      if (it.mesh) it.mesh.scale.set(s[0] * it.meshScale, s[1] * it.meshScale, s[2] * it.meshScale);
    },
    wake(it) { it.sleep2 = false; it.sleep = 0; },
    hook(f) { hooks.push(f); return () => { const i = hooks.indexOf(f); if (i >= 0) hooks.splice(i, 1); }; },
    get moving() { return moving; },
    statics(l) { statics.length = 0; statics.push(...l); },
    addStatics(l) { statics.push(...l); return () => drop(statics, l); },
    kinematic(l) { moving.length = 0; moving.push(...l); },
    addKinematic(l) { moving.push(...l); return () => drop(moving, l); },   // kilku właścicieli (pojazd, tłok, tygiel)
    box,
    step(dt) {
      acc += Math.min(dt, 0.1);
      while (acc >= STEP) { acc -= STEP; substep(STEP); }
    },
    stepFixed(h) { substep(h); },
    // siatka: środek bryły albo punkt anchor (ułamek półwymiarów w układzie bryły, np. [0, −1, 0] — spód)
    sync() {
      for (const it of list) if (it.mesh) {
        it.mesh.position.copy(it.p); it.mesh.quaternion.copy(it.q);
        if (it.anchor) it.mesh.position.add(tmp.set(it.anchor[0] * it.half[0], it.anchor[1] * it.half[1], it.anchor[2] * it.half[2]).applyQuaternion(it.q));
      }
    },
  };
  return W;
}
