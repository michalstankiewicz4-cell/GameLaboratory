// Układ silnika — fizyka (środowisko ląd; z laboratorium mechaniki, z Tornado.io): luz zazębień ze stref swobody brył
// zębów (contact.js), sztywności skrętne części (userData.phys), nierówny bieg łańcucha (efekt wielokąta), poślizg pasa
// (Euler–Eytelwein), opór łożysk — napęd fizyczny (physics.js) na porcie maszyny (js/models/mech/assemblies/engine-layout/).
//   createEngineLayoutPhysics({ mc }) → { phys, ZONES, isGear, BELT_F0, BELT_WRAP, step(dt, { reg, ELEC, brake }) }
import * as MK from '../../../models/mech/mechkit.js';
import { createPhysics } from './physics.js';
import { meshZone, planeMap } from './contact.js';

const TAU = Math.PI * 2;
export const ENVIRONMENTS = ['land'];

export function createEngineLayoutPhysics({ mc }) {
  const { CH, Y0, YS5, belt, chain, cross1, drive, ring } = mc;
const isGear = (u) => u && u.z && u.m && u.rf && u.rb && !u.internal;
const ZONES = new Map();
function BACKLASH(e) {
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
  // klatka: obwód, regulator, napęd (silnik 4-biegunowy: ω_syn = 4π f / p), moc pobrana, kąty części
  function step(dt, { reg, ELEC, brake }) {
    ELEC.tick(dt); reg.api.tick(dt);
    const on = reg.api.powered && (reg.api.run || Math.abs(reg.api.f) > 0.05);
    phys.step(dt, { w0: reg.api.f * 4 * Math.PI / 4, brake, on }); ELEC.power(phys.state.Tm, phys.state.omega, on); mc.applyAngles();
  }
  return { phys, ZONES, isGear, BELT_F0, BELT_WRAP, step };
}
