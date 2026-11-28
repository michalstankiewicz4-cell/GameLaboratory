// Układ silnika — fizyka (środowisko ląd; z laboratorium mechaniki, z Tornado.io): luz zazębień ze stref swobody brył
// zębów (contact.js), sztywności skrętne części (userData.phys), nierówny bieg łańcucha (efekt wielokąta), poślizg pasa
// (Euler–Eytelwein), opór łożysk — napęd fizyczny (physics.js) na porcie maszyny (js/models/mech/assemblies/engine-layout/); listwa z zębnikiem, korbowód i śruba kulowa (sztywności), luz krzyżaków Cardana; śruby
// mocujące (odkręcanie, animacja) i luźne części (przewracanie od momentu reakcji, wahadło obudowy na wałach), siły
// promieniowe w łożyskach (zazębienie, łańcuch, pas, ciężar) i przesuw luźnych opraw ze skutkami (napięcie pasa, przeskok
// łańcucha, wyjście zębów z przyporu).
//   createEngineLayoutPhysics({ mc }) → { phys, ZONES, SUP, step(dt, { reg, ELEC, brake }), fixtureStep(dt, physics),
//     toggleBolt(b), resetBolts(), brakeLoose() }
import * as THREE from '../../../../vendor/three/three.module.js';
import * as MK from '../../../models/mech/mechkit.js';
import { createPhysics } from './physics.js';
import { meshZone, planeMap } from './contact.js';

const TAU = Math.PI * 2;
export const ENVIRONMENTS = ['land'];

export function createEngineLayoutPhysics({ mc }) {
  const { CH, Y0, YS5, belt, chain, cross1, drive, ring, RK, ZB, scrG, slG, pinion, rod, parts, root, FIXT, boltG, eCar } = mc;
const isGear = (u) => u && u.z && u.m && u.rf && u.rb && !u.internal;
const ZONES = new Map();
// listwa (a, przesuw x) → zębnik (b, kąt θ): strefa z brył liczona jak dla koła z listwą (zębnik obraca się, listwa
// przesuwa — contact.js, slideB), potem przeliczona na C = θ − f⁻¹(x) wiązania suwak → śruba
function rackZone(e) {
  const g = e.rel.geom, f = (t) => g.x0 + g.s * g.rp * t;
  const hullsB = MK.rackHulls(RK.m, RK.n).map((q) => q.map(([y, z]) => [y + RK.y0, z + RK.z]));
  const z = meshZone({ hullsA: MK.toothHulls(ZB.z, ZB.m), hullsB, za: ZB.z, zb: RK.n, map: planeMap(scrG.userData.spin, slG.userData.slide, { slideB: 'y' }), rel: f, slideB: true, pitchB: g.p });
  ZONES.set('rack', { z, rp: g.rp });
  if (z.pen) console.warn(`Listwa z zębnikiem: zęby przenikają się w ${z.pen} z ${z.samples} położeń nominalnych`);
  const k = -1 / (g.s * g.rp), tmp = {};
  return { zone: (x, out) => { z.zone((x - g.x0) / (g.s * g.rp), tmp); const a = tmp.lo * k, b = tmp.hi * k; out.lo = Math.min(a, b); out.hi = Math.max(a, b); return out; } };
}
function BACKLASH(e) {
  if (e.type === 'rack') return rackZone(e);
  if (e.type === 'ujoint') { const q = cross1.userData.phys; return 2 * q.clear / q.R; }   // luz łożysk igiełkowych krzyżaka (dwie pary czopów)
  if (e.type !== 'mesh') return 0;
  const ua = e.a.group && e.a.group.userData, ub = e.b.group && e.b.group.userData;
  if (!isGear(ua) || !isGear(ub) || !e.a.spin || !e.b.spin) return 0;
  const map = planeMap(e.a.spin, e.b.spin);
  if (!map.parallel) return (ua.phys.luz + ub.phys.luz) / ub.rp;   // osie nierównoległe — bez brył płaskich
  const z = meshZone({ hullsA: MK.toothHulls(ua.z, ua.m, { alpha: ua.alpha }), hullsB: MK.toothHulls(ub.z, ub.m, { alpha: ub.alpha }), za: ua.z, zb: ub.z, map, rel: e.rel });
  ZONES.set(`${ua.z}:${ub.z}`, { z, ua, ub });
  if (z.pen) console.warn(`Zazębienie ${ua.z} : ${ub.z}: zęby przenikają się w ${z.pen} z ${z.samples} położeń nominalnych`);
  return z.pen ? (ua.phys.luz + ub.phys.luz) / ub.rp : z;
}
// punkt 2 — sztywności skrętne połączeń (N·m/rad kąta koła b) i tłumienie ζ:
//   wał: G·J_p / L (stal G = 80 GPa, J_p = π d⁴ / 32); gwiazda sprzęgła kłowego — wg twardości (katalog, wielkość 19);
//   zazębienie: sztywność zęba c ≈ 20 N/(mm·µm) × szerokość, sprowadzona na koło zasadnicze (k = c·b·r_b²);
//   łańcuch i pas: sztywność cięgna EA / L (łańcuch 08A ≈ 2 MN, pas SPA ≈ 40 kN na pas) × r²
// dane z części (userData.phys — MechKit.PHYS); tu tylko geometria połączenia (szerokość wspólna, odległość osi, promienie)
function STIFF(e) {
  const ua = e.a.group && e.a.group.userData, ub = e.b.group && e.b.group.userData, pa = ua && ua.phys, pb = ub && ub.phys;
  if (e.type === 'shaft' && e.a.type === 'shaft' && pa && pa.k) { const d = ua.r * 2; return { k: pa.k, zeta: pa.zeta, name: `${e.a.name} (Ø ${Math.round(d * 1000)}, ${Math.round(ua.len * 1000)} mm)` }; }
  if (e.type === 'coupling' && e.a.id === 'jaw' && pa) return { k: pa.k, zeta: pa.zeta, name: `Gwiazda sprzęgła kłowego ${pa.spider.replace('A', ' Sh A').replace('D', ' Sh D')}` };
  if (e.type === 'coupling') return pa && pa.k ? { k: pa.k, zeta: pa.zeta, name: e.a.name } : null;   // sztywność ma połączenie wychodzące ze sprzęgła; wejście (piasta na wale) — sztywno
  if (e.type === 'mesh' && pb) { const b = Math.min(ua.w, ub.w), rb = ub.rb || ub.rp * Math.cos(20 * Math.PI / 180); return { k: pb.c * b * rb * rb, zeta: pb.zeta, name: `Zazębienie ${ua.z} : ${ub.z}` }; }
  if (e.type === 'chain') { const q = chain.userData.phys; return { k: q.EA / CH.D * CH.R2 * CH.R2, zeta: q.zeta, name: 'Łańcuch 08A' }; }
  if (e.type === 'belt') { const q = belt.userData.phys, r = ub.rp || 0.04; return { k: q.EA / Math.hypot(YS5 - Y0, 0) * r * r, zeta: q.zeta, name: 'Pas klinowy SPA' }; }
  if (e.type === 'ujoint') { const q = cross1.userData.phys; return { k: q.k, zeta: q.zeta, name: 'Przegub Cardana' }; }
  if (e.type === 'planetary') { const q = ring.userData.phys; return { k: q.k, zeta: q.zeta, name: 'Przekładnia planetarna' }; }
  // zamiana ruchu: C liczone na b — listwa → zębnik (rad): k = c·b·r_p²; korba → suwak, śruba → nakrętka (m): sztywność osiowa
  if (e.type === 'rack') { const q = slG.userData.phys, rp = ZB.m * ZB.z / 2, b = Math.min(RK.w, pinion.userData.w); return { k: q.c * b * rp * rp, zeta: q.zeta, name: 'Listwa zębata z zębnikiem' }; }
  if (e.type === 'crank') { const q = rod.userData.phys; return { k: q.k, zeta: q.zeta, name: 'Korbowód' }; }
  if (e.type === 'screw') { const q = scrG.userData.phys; return { k: q.k, zeta: q.zeta, name: 'Śruba kulowa — nakrętka' }; }
  return null;   // wpust (koło na wale) — sztywno
}
// punkt 3 — pas klinowy: moment graniczny na małym kole (Euler–Eytelwein): F1/F2 = e^(μ'θ), μ' = μ / sin(β/2) (rowek 36°),
// F1 + F2 = 2·F0 (napięcie wstępne) → T_maks = 2·F0·r·(e^(μ'θ) − 1)/(e^(μ'θ) + 1); ślizg — tarcie kinetyczne 0,85 T_maks;
// pełzanie sprężyste do 1,5 % przy T_maks. Łańcuch — efekt wielokąta: prędkość cięgna v = ω·R·cos φ, φ ∈ [−π/z, π/z]
const BP = belt.userData.phys, BELT_F0 = BP.F0, BELT_MU = BP.mu, BELT_WRAP = Math.PI - 2 * Math.asin((0.08 - 0.04) / Math.hypot(YS5 - Y0, 0));
const BELT_MUE = BELT_MU / Math.sin(BP.groove / 2 * Math.PI / 180), BELT_E = Math.exp(BELT_MUE * BELT_WRAP), BELT_TMAX = 2 * BELT_F0 * 0.04 * (BELT_E - 1) / (BELT_E + 1);
function polygon(z) { const p = TAU / z, s2 = 2 * Math.sin(p / 2); return (t) => { const n = Math.floor(t / p), u = t - n * p; return n * p + p * (Math.sin(u - p / 2) + Math.sin(p / 2)) / s2; }; }
const MODIFY = (e) => { if (e.type !== 'chain') return null; const G = polygon(18), k = 18 / 27, r0 = e.rel; return (ta, tb) => r0(ta, tb) + k * (G(ta) - ta); };
const BELT = (e) => (e.type === 'belt' ? { Tmax: BELT_TMAX, kinetic: BP.kinetic, creep: BP.creep } : null);
const phys = createPhysics(drive, { motorId: 'motor', brakeId: 'disc', backlash: BACKLASH, stiffness: STIFF, modify: MODIFY, belt: BELT, bearing: MK.PHYS.bearing.drag });
// mocowania z modelu (FIXT): moment reakcji i skutek poluzowania wg roli części
let brakeLoose = false;
const ROLE = {
  motor: { tau: () => -phys.state.Tm, effect: (loose) => phys.setBroken((e) => e.type === 'coupling' && e.a.id === 'motor', loose) },
  planet: { tau: () => { const c = phys.edges.find((q) => q.e.type === 'planetary'); return c ? 0.75 * c.T * Math.sign(eCar.omega || 1) : 0; }, effect: (loose) => phys.setBroken((e) => e.type === 'planetary', loose) },
  brake: { tau: () => phys.state.Tb, effect: (loose) => { brakeLoose = loose; } },
};
for (const f of FIXT) if (f.phys && ROLE[f.phys.role]) Object.assign(f.phys, ROLE[f.phys.role]);
const X = new THREE.Vector3(1, 0, 0);
const G = 9.81;

/* ---------------- siły promieniowe w łożyskach i luźne oprawy ---------------- */
// Siły na kołach z fizyki napędu (moment w połączeniu c.T): zazębienie — obwodowa F_t = T / r_p i rozpór F_r = F_t·tg 20°
// (odpycha koła od siebie), łańcuch — cięgno czynne T / R ciągnie koła ku sobie, pas — 2·F0 (napięcie wstępne)
// ciągnie koła ku sobie; do tego ciężar wału i kół. Siła na kole przechodzi na łożyska jego wału (dźwignia między dwoma
// najbliższymi podporami). Oprawa luźna: trzyma ją ciężar i tarcie o łoże (μ = 0,2); siła większa — przesuwa się
// (albo unosi, gdy ciągnie w górę mocniej, niż waży), a z nią wał i koła. Skutki: pas — mniejszy rozstaw osi zmniejsza
// napięcie (EA·2Δa / L), a z nim moment graniczny (poślizg); łańcuch — luz cięgna ponad 4 mm — przeskakuje po zębach;
// zazębienie — rozsunięcie ponad 1,2·m — zęby wychodzą z przyporu.
const SUP = (() => {
  const shaftOf = new Map();   // element (koło) → wał, na którym siedzi
  for (const d of drive.edges) if (d.type === 'shaft') { const [sh, o] = d.a.type === 'shaft' ? [d.a, d.b] : d.b.type === 'shaft' ? [d.b, d.a] : [null, null]; if (sh && o.type !== 'shaft' && !shaftOf.has(o)) shaftOf.set(o, sh); }
  const shafts = new Map();   // wał → { supports: [{ x, fix | null, obj }], mass }
  const axisX = (e, P) => P.clone().sub(e.frame.o).dot(e.frame.axis), off = (e, P) => { const v = P.clone().sub(e.frame.o); return v.addScaledVector(e.frame.axis, -v.dot(e.frame.axis)).length(); };
  const cands = [];
  for (const f of FIXT) { const o = f.objs[0]; if (!f.phys && o.userData.mounts && o.userData.h) cands.push({ fix: f, obj: o, P: o.position.clone().add(new THREE.Vector3(0, o.userData.h, 0)) }); }
  for (const o of root.children) if (/^Łożysko 6205/.test(o.name || '')) cands.push({ fix: null, obj: o, P: o.position.clone() });
  for (const e of parts) if (e.type === 'shaft' && e.group.userData.len) {
    const L = e.group.userData.len, sup = cands.filter((c) => off(e, c.P) < 0.004 && axisX(e, c.P) > -0.01 && axisX(e, c.P) < L + 0.01).map((c) => ({ ...c, x: axisX(e, c.P), d: new THREE.Vector3(), v: new THREE.Vector3(), L: new THREE.Vector3() }));
    if (sup.length) { shafts.set(e, { sup, mass: e.group.userData.mass || 0 }); sup.filter((q) => q.fix).sort((p, q) => p.x - q.x).forEach((q, k) => { q.fix.name = `Oprawa łożyska ${k + 1} — ${e.name}`; }); }
  }
  for (const [o, sh] of shaftOf) { const S0 = shafts.get(sh); if (S0) S0.mass += o.group.userData.mass || 0; }
  // grupy przesuwane z wałem (wał, koła na nim) — położenia bazowe
  const movers = new Map();
  for (const [sh] of shafts) movers.set(sh, [sh, ...[...shaftOf].filter(([, s2]) => s2 === sh).map(([o]) => o)].map((el) => ({ el, p: el.group.position.clone(), x: axisX(sh, el.group.position) })));
  const belt0 = { F0: BELT_F0, L: belt.userData.L || 1.2 };
  return { shaftOf, shafts, movers, axisX, belt0, broken: { chain: false, mesh: new Set() }, F0: BELT_F0 };
})();
const _f = new THREE.Vector3(), _u = new THREE.Vector3(), _t = new THREE.Vector3();
function bearingStep(dt) {
  for (const [, S0] of SUP.shafts) for (const sp of S0.sup) sp.L.set(0, 0, 0);
  // siła na kole → łożyska jego wału (dźwignia), w płaszczyźnie ⟂ osi
  const apply = (el, F) => {
    const sh = SUP.shaftOf.get(el), S0 = sh && SUP.shafts.get(sh); if (!S0) return;
    const sup = S0.sup, x = SUP.axisX(sh, el.group.position);
    if (sup.length === 1) { sup[0].L.add(F); return; }
    const srt = [...sup].sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x)), [p1, p2] = srt;
    const w2 = (x - p1.x) / ((p2.x - p1.x) || 1e-9); p1.L.addScaledVector(F, 1 - w2); p2.L.addScaledVector(F, w2);
  };
  const posOf = (el) => el.group.position;
  for (const c of phys.edges) {
    if (c.broken) continue;
    const A = c.e.a, B = c.e.b, T = c.T || 0;
    if (c.e.type === 'mesh') {
      const ub = B.group.userData; _u.subVectors(posOf(B), posOf(A)); _u.x = 0; _u.normalize(); _t.crossVectors(X, _u).negate();
      const Ft = T / ub.rp; _f.copy(_t).multiplyScalar(Ft).addScaledVector(_u, Math.abs(Ft) * Math.tan(20 * Math.PI / 180)); apply(B, _f.clone()); apply(A, _f.clone().negate());
    } else if (c.e.type === 'chain' || c.e.type === 'belt') {
      _u.subVectors(posOf(B), posOf(A)); _u.x = 0; _u.normalize();
      const F = c.e.type === 'chain' ? Math.abs(T) / (B.group.userData.R || 0.05) : 2 * SUP.F0;
      apply(A, _u.clone().multiplyScalar(F)); apply(B, _u.clone().multiplyScalar(-F));
    }
  }
  // ciężar wału z kołami — po połowie na skrajne podpory
  for (const [, S0] of SUP.shafts) { const w = S0.mass * G / S0.sup.length; for (const sp of S0.sup) sp.L.y -= w; }
  // luźne oprawy: ruch pełzający (tłumienie C_D — tarcie i opory przesuwu duże w stosunku do mas): v = F_wypadkowa / C_D,
  // F_wypadkowa = siła z łożyska + ciężar oprawy, na łożu pomniejszona o tarcie μ·N (μ = 0,2); wał przesuwa się za podporami
  const MU = 0.2, C_D = 4000, n = 6, h = dt / n;
  for (const [sh, S0] of SUP.shafts) {
    for (const sp of S0.sup) {
      if (!sp.fix || !sp.fix.loose) { sp.d.set(0, 0, 0); sp.v.set(0, 0, 0); continue; }
      const mb = sp.obj.userData.mass || 1;
      for (let k = 0; k < n; k++) {
        const Fy = sp.L.y - mb * G;
        if (sp.d.y <= 1e-6 && Fy <= 0) { const fr = MU * -Fy; sp.v.set(0, 0, Math.abs(sp.L.z) > fr ? (sp.L.z - fr * Math.sign(sp.L.z)) / C_D : 0); }   // leży: tarcie
        else sp.v.set(0, Fy / C_D, sp.L.z / C_D);   // uniesiona: bez tarcia
        sp.d.addScaledVector(sp.v, h); if (sp.d.y < 0) sp.d.y = 0; sp.d.clampLength(0, 0.05);
      }
    }
    // położenia: oprawa, wał i koła (interpolacja przesunięcia po osi między podporami)
    const sup = S0.sup, dAt = (x) => { if (sup.length === 1) return sup[0].d; const srt = [...sup].sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x)), [p1, p2] = srt, w = (x - p1.x) / ((p2.x - p1.x) || 1e-9); return p1.d.clone().multiplyScalar(1 - w).addScaledVector(p2.d, w); };
    for (const sp of sup) if (sp.fix) { const b0 = sp.fix.base[0]; sp.obj.position.copy(b0.p).add(sp.d); }
    for (const mv of SUP.movers.get(sh)) mv.el.group.position.copy(mv.p).add(mv.el.type === 'shaft' ? dAt((sup[0].x + sup[sup.length - 1].x) / 2) : dAt(mv.x));
  }
  // skutki: rozstaw osi pasa, łańcucha i zazębień z przesunięć kół
  const shift = (el) => el.group.position.clone().sub(SUP.movers.get(SUP.shaftOf.get(el)) ? SUP.movers.get(SUP.shaftOf.get(el)).find((q) => q.el === el).p : el.group.position);
  for (const c of phys.edges) {
    const A = c.e.a, B = c.e.b; if (!['mesh', 'chain', 'belt'].includes(c.e.type)) continue;
    _u.subVectors(B.group.position, A.group.position); _u.x = 0; const a1 = _u.length();
    const da = shift(B).sub(shift(A)); da.x = 0; const a0 = _u.clone().sub(da).length(), dA = a1 - a0;
    c.da = dA;
    if (c.e.type === 'belt') { SUP.F0 = Math.max(0, BELT_F0 + BP.EA * 2 * dA / SUP.belt0.L); const E = Math.exp(BELT_MUE * BELT_WRAP); c.belt.Tmax = 2 * SUP.F0 * 0.04 * (E - 1) / (E + 1); }
    if (c.e.type === 'chain' && dA < -0.004 && !SUP.broken.chain) { SUP.broken.chain = true; phys.setBroken((e) => e.type === 'chain', true); }
    if (c.e.type === 'mesh' && dA > 1.2 * B.group.userData.m && !SUP.broken.mesh.has(c)) { SUP.broken.mesh.add(c); c.broken = true; }
  }
}
function bearingReset() {
  for (const [sh, S0] of SUP.shafts) { for (const sp of S0.sup) { sp.d.set(0, 0, 0); sp.v.set(0, 0, 0); } for (const mv of SUP.movers.get(sh)) mv.el.group.position.copy(mv.p); }
  SUP.F0 = BELT_F0; for (const c of phys.edges) if (c.belt) c.belt.Tmax = BELT_TMAX;
  if (SUP.broken.chain) phys.setBroken((e) => e.type === 'chain', false);
  for (const c of SUP.broken.mesh) phys.setBroken((e) => e === (c.e.base || c.e), false);
  SUP.broken.chain = false; SUP.broken.mesh.clear();
}
// odkręcenie / dokręcenie śruby (animacja: obrót i wysunięcie na długość gwintu)
function toggleBolt(b) { b.userData.target = b.userData.target ? 0 : 1; }
function resetBolts() {
  for (const b of boltG.children) { b.userData.target = 0; b.userData.out = 0; b.position.copy(b.userData.home); b.rotation.set(0, 0, 0); }
  bearingReset();
  for (const f of FIXT) { f.phi = 0; f.om = 0; f.side = 0; f.tilt = 0; for (const s0 of f.base) { s0.o.position.copy(s0.p); s0.o.quaternion.copy(s0.q); } if (f.phys) f.phys.effect(false); }
}
const _R = new THREE.Quaternion(), _v = new THREE.Vector3(), XA = new THREE.Vector3(1, 0, 0);
function fixtureStep(dt, physics = true) {   // physics: false — tryb kinematyczny (tylko animacja śrub, bez momentów)
  for (const b of boltG.children) {   // animacja śrub
    const u = b.userData; if (u.out === u.target) continue;
    u.out = u.target ? Math.min(1, u.out + dt * 1.5) : Math.max(0, u.out - dt * 1.5);
    b.position.copy(u.home); b.position.y += u.out * (u.len + 0.004); b.rotation.y = -u.out * TAU * (u.len / 0.0015) / 6;   // gwint 1,5 mm — obroty skrócone ×6
  }
  for (const f of FIXT) {
    // luźna, gdy odkręcony jest cały jeden zestaw śrub (np. oprawa od słupka albo słupek od łoża)
    const sets = new Set(f.bolts.map((b) => b.userData.set)), loose = [...sets].some((st) => f.bolts.filter((b) => b.userData.set === st).every((b) => b.userData.target === 1 && b.userData.out === 1));
    f.loose = loose;
    if (!f.phys) continue;
    const P = f.phys, tau = physics ? P.tau() : 0, resist = P.axis ? 0 : P.m * G * P.b;
    f.tau = tau; f.resist = resist;
    if (!loose && f.phi === 0 && !f.om) continue;
    if (P.axis) {   // wahadło na osi wałów: I·φ'' = τ − m·g·d·sin φ − tłumienie łożysk; obraca się bez końca, gdy τ > m·g·d
      const I = P.m * (P.d * P.d * 1.5 + 0.004), n = 8, h = dt / n;
      for (let k = 0; k < n; k++) { const tq = (loose ? tau : 0) - P.m * G * P.d * Math.sin(f.phi) - 0.05 * f.om; f.om += tq / I * h; f.phi += f.om * h; }
      if (!loose) { const back = Math.round(f.phi / TAU) * TAU; if (Math.abs(f.phi - back) < 0.002 && Math.abs(f.om) < 0.05) { f.phi = 0; f.om = 0; } }
      _R.setFromAxisAngle(XA, f.phi);
      for (const s0 of f.base) { _v.copy(s0.p); _v.y -= P.y; _v.z -= P.z; _v.applyQuaternion(_R); s0.o.position.set(_v.x, _v.y + P.y, _v.z + P.z); s0.o.quaternion.copy(_R).multiply(s0.q); }
      for (const b of f.bolts) { b.position.copy(b.userData.home).add(new THREE.Vector3(0, b.userData.out * (b.userData.len + 0.004), 0)); if (b.userData.out < 1) { _v.copy(b.position); _v.y -= P.y; _v.z -= P.z; _v.applyQuaternion(_R); b.position.set(_v.x, _v.y + P.y, _v.z + P.z); } }
      const ang = Math.abs(Math.atan2(Math.sin(f.phi), Math.cos(f.phi)));
      P.effect(ang > P.limit || Math.abs(f.om) > 0.5); f.tilt = ang;
      continue;
    }
    // przewracanie wokół krawędzi: I·φ'' = τ − m·g·(b·cos φ − h·sin φ); I ≈ m·(b² + h²)·1,2 (bryła)
    const I = P.m * (P.b * P.b + P.h * P.h) * 1.2, n = 8, h = dt / n;
    if (f.phi === 0) { if (!loose || Math.abs(tau) <= resist) continue; f.side = Math.sign(tau); }
    for (let k = 0; k < n; k++) {
      const a = Math.abs(f.phi), tq = (loose ? f.side * tau : 0) - P.m * G * (P.b * Math.cos(a) - P.h * Math.sin(a));
      f.om += tq / I * h; f.phi = Math.max(0, Math.min(Math.PI / 2, a + f.om * h)) * 1;
      if (f.phi <= 0) { f.phi = 0; f.om = Math.abs(f.om) > 0.3 ? -f.om * 0.2 : 0; if (!f.om) break; }   // opada na stopę (odbicie 0,2)
      if (f.phi >= Math.PI / 2) { f.phi = Math.PI / 2; f.om = 0; }   // leży na boku
    }
    // położenie: obrót wokół krawędzi podstawy (oś x przez punkt (·, y, z ± b))
    const ang = f.side * f.phi, pz = P.z + f.side * P.b, py = P.y;
    _R.setFromAxisAngle(XA, ang);
    for (const s0 of f.base) { _v.copy(s0.p); _v.y -= py; _v.z -= pz; _v.applyQuaternion(_R); s0.o.position.set(_v.x, _v.y + py, _v.z + pz); s0.o.quaternion.copy(_R).multiply(s0.q); }
    for (const b of f.bolts) b.position.copy(b.userData.home).add(new THREE.Vector3(0, b.userData.out * (b.userData.len + 0.004), 0));
    P.effect(f.phi > P.limit); f.tilt = f.phi;
  }
}
  // klatka: obwód, regulator, napęd (silnik 4-biegunowy: ω_syn = 4π f / p), moc pobrana, kąty części, luźne części
  // i siły w łożyskach; zacisk hamulca zszedł z tarczy (wspornik luźny) — hamulec nie działa
  function step(dt, { reg, ELEC, brake }) {
    ELEC.tick(dt); reg.api.tick(dt);
    const on = reg.api.powered && (reg.api.run || Math.abs(reg.api.f) > 0.05);
    phys.step(dt, { w0: reg.api.f * 4 * Math.PI / 4, brake: brakeLoose ? 0 : brake, on }); ELEC.power(phys.state.Tm, phys.state.omega, on); mc.applyAngles();
    fixtureStep(dt, true); bearingStep(dt);
  }
  return { phys, ZONES, isGear, BELT_F0, BELT_WRAP, BELT_TMAX, SUP, G, step, fixtureStep, toggleBolt, resetBolts, brakeLoose: () => brakeLoose };
}
