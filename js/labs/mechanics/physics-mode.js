// Laboratorium mechaniki — tryb Fizyka (z Tornado.io): regulator przy silniku (falownik), obwód elektryczny
// (js/behaviors/land/mech/circuit.js), napęd fizyczny (physics.js: luz, sprężystość, poślizg pasa, straty), bryły
// zderzeń zębów (contact.js) i ich kontrole, hitboksy.
//   createPhysicsMode({ scene, root, M, S, save, $, el, mc, ui }) → { reg, ELEC, phys, physStats, hitG, elecG, setHit, syncHit }
//   mc — maszyna (machine.js); ui — { fmt, rpmOf, dirOf, select, showSel, sel } z głównego skryptu
import * as THREE from '../../../vendor/three/three.module.js';
import * as MK from '../../models/mech/mechkit.js';
import * as CK from '../../models/mech/controls.js';
import { createPhysics } from '../../behaviors/land/mech/physics.js';
import { meshZone, planeMap, contactPair } from '../../behaviors/land/mech/contact.js';
import { createCircuit } from '../../behaviors/land/mech/circuit.js';

const TAU = Math.PI * 2, X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);

export function createPhysicsMode({ scene, root, M, S, save, $, el, mc, ui }) {
  const { BED_TOP, CH, P, Y0, YS5, ZPL, ZR, ZS, belt, chain, cross1, cross2, drive, eC1, eDisc, eSun, motorG, parts, planets, ring } = mc;
  const { fmt, rpmOf, dirOf, select, showSel } = ui;
/* ---------------- tryb „Fizyka”: regulator przy silniku, napęd fizyczny, hitboksy ---------------- */
// regulator prędkości: falownik z pokrętłem, RUN / STOP i FWD / REV na łożu przed silnikiem (obsługa na modelu)
const reg = (() => { const g = CK.inverter({ kW: 1.1, fmax: 50, ramp: 4 }); g.position.set(-6.3, BED_TOP, 0.4); scene.add(g); g.visible = false; return { group: g, api: g.userData.api }; })();
/* ---------------- punkt 5 — obwód elektryczny ---------------- */
// Zasilanie silnika jak w prawdziwej maszynie: źródło 3 × 400/230 V (TN-S) → wyłącznik główny Q1 → stycznik K1 →
// falownik (zadawanie z potencjometru R1, wejście AI 0–10 V) → silnik. Sterowanie stycznikiem 230 V: L1 → grzybek
// S0 (NC) → STOP S1 (NC) → START S2 (NO) ∥ styk pomocniczy K1 13-14 (podtrzymanie) → cewka K1 → N; lampka H1
// „praca” równolegle do cewki. Elementy obsługiwane na modelach; kable z prawdziwymi przekrojami i długościami.
const elecG = new THREE.Group(); elecG.visible = false; scene.add(elecG);
reg.api.reference('ai'); reg.api.control('terminal'); reg.api.power(false);   // falownik zasilany dopiero przez stycznik K1
const ELEC = (() => {
  const put = (g, x, y, z) => { g.position.set(x, y, z); elecG.add(g); return { group: g, api: g.userData.api, name: '' }; };
  const X0 = put(CK.powerSource({ kind: 'AC', volts: 400, phases: 3, amps: 16 }), -6.5, BED_TOP, 0.4);
  const Q1 = put(CK.switchUnit({ kind: 'main', poles: 3, amps: 25 }), -6.16, BED_TOP, 0.42);
  // płyta montażowa z szyną DIN i stycznikiem (stoi na łożu, front w +z)
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.01), M.steel); board.position.set(-6.0, BED_TOP + 0.1, 0.415); board.castShadow = true; elecG.add(board);
  const K1 = put(CK.contactor({ amps: 12, coil: '230AC', aux: '1NO' }), -6.0, BED_TOP + 0.06, 0.42);
  const S0 = put(CK.eStop(), -6.52, BED_TOP, 0.62);
  const S1 = put(CK.pushButton({ color: 'red', contact: 'NC' }), -6.42, BED_TOP, 0.62);
  const S2 = put(CK.pushButton({ color: 'green', contact: 'NO' }), -6.33, BED_TOP, 0.62);
  const H1 = put(CK.pilotLamp({ color: 'green', volts: '230AC' }), -6.24, BED_TOP, 0.62);
  const R1 = put(CK.potentiometer({ ohms: 10000, taper: 'lin' }), -6.14, BED_TOP, 0.62);
  const S3 = put(CK.selector({ positions: 'I-0-II', handle: 'long' }), -6.04, BED_TOP, 0.62);   // praca: I — w przód, 0 — stop, II — wstecz
  Object.assign(X0, { name: 'Zasilanie X0' }); Object.assign(Q1, { name: 'Wyłącznik główny Q1' }); Object.assign(K1, { name: 'Stycznik K1' });
  Object.assign(S0, { name: 'Grzybek S0' }); Object.assign(S1, { name: 'STOP S1' }); Object.assign(S2, { name: 'START S2' }); Object.assign(H1, { name: 'Lampka H1' }); Object.assign(R1, { name: 'Potencjometr R1' }); Object.assign(S3, { name: 'Przełącznik kierunku S3' });
  X0.api.press('power'); Q1.api.press('toggle');   // na starcie: zasilanie i wyłącznik główny włączone, stycznik czeka na START
  // kable: dławik z tyłu urządzenia (albo od dołu), przez łoże do drugiego urządzenia
  elecG.updateWorldMatrix(true, true); reg.group.updateWorldMatrix(true, true);
  const back = (g, dx = 0) => { const b = new THREE.Box3().setFromObject(g), c = b.getCenter(new THREE.Vector3()); return { p: new THREE.Vector3(c.x + dx, BED_TOP + 0.025, b.min.z - 0.002), n: new THREE.Vector3(0, 0, -1) }; };
  const under = (g, dx = 0) => { const b = new THREE.Box3().setFromObject(g), c = b.getCenter(new THREE.Vector3()); return { p: new THREE.Vector3(c.x + dx, b.min.y + 0.006, b.max.z - 0.012), n: new THREE.Vector3(0, -1, 0) }; };
  motorG.updateWorldMatrix(true, true);
  const mb = motorG.userData, tbox = { p: motorG.localToWorld(new THREE.Vector3(-0.15, mb.H + 0.11, 0.052)), n: new THREE.Vector3(0, 0, 1) };
  const cables = {};
  const lay = (key, A, B, o) => {
    const D0 = 0.012, a1 = A.p.clone().addScaledVector(A.n, 0.04), b1 = B.p.clone().addScaledVector(B.n, 0.04);
    const mid = a1.clone().lerp(b1, 0.5); mid.y = BED_TOP + D0 / 2;
    const pts = [A.p, a1, mid, b1, B.p];
    if (a1.y > BED_TOP + 0.03) pts.splice(2, 0, new THREE.Vector3(a1.x, BED_TOP + D0 / 2, a1.z).lerp(mid, 0.3));
    if (b1.y > BED_TOP + 0.03) pts.splice(pts.length - 2, 0, new THREE.Vector3(b1.x, BED_TOP + D0 / 2, b1.z).lerp(mid, 0.3));
    const c = CK.cable({ points: pts, ...o }); elecG.add(c); cables[key] = c; return c;
  };
  lay('W1', back(X0.group), back(Q1.group), { cores: 5, mm2: 2.5, color: 'black', name: 'W1 — zasilanie 5G2,5' });
  lay('W2', back(Q1.group, 0.02), under(K1.group, -0.012), { cores: 5, mm2: 2.5, color: 'black', name: 'W2 — Q1 → K1 5G2,5' });
  lay('W3', under(K1.group, 0.012), back(reg.group, 0.02), { cores: 4, mm2: 2.5, color: 'black', name: 'W3 — K1 → falownik 4G2,5' });
  lay('W4', back(reg.group, -0.02), tbox, { cores: 4, mm2: 1.5, color: 'orange', name: 'W4 — falownik → silnik 4G1,5 (ekranowany)' });
  lay('W5', back(S2.group), under(K1.group, 0), { cores: 5, mm2: 1, color: 'grey', name: 'W5 — sterowanie 5×1' });
  lay('W6', back(R1.group), back(reg.group, 0), { cores: 3, mm2: 0.5, color: 'grey', name: 'W6 — potencjometr 3×0,5' });
  lay('W7', back(S3.group), back(reg.group, -0.035), { cores: 4, mm2: 0.5, color: 'grey', name: 'W7 — praca / kierunek 4×0,5 (24 V DC)' });
  for (const [a, b] of [[S0, S1], [S1, S2], [S2, H1]]) lay(`J${a.name}`, back(a.group, 0.02), back(b.group, -0.02), { cores: 2, mm2: 1, color: 'grey', name: 'mostek w kasecie 2×1' });
  // lista połączeń (schemat)
  // dane elektryczne z urządzeń (userData.elec — ControlKit.ELEC, MechKit.MOTOR_ELEC); tu tylko schemat połączeń
  const eX = X0.group.userData.elec, eK = K1.group.userData.elec, eH = H1.group.userData.elec, eV = reg.group.userData.elec, eM = motorG.userData.elec;
  const c = createCircuit(), Rw = (k) => cables[k].userData.R, UF = eX.Uph;   // napięcie fazowe (400 / √3 = 230,9 V)
  c.source('X0', { L1: [UF, 0], L2: [UF, -120], L3: [UF, 120], N: [0, 0], PE: [0, 0] }, () => X0.api.on);
  for (const [f, t] of [['L1', '1'], ['L2', '3'], ['L3', '5'], ['N', 'N1'], ['PE', 'PE']]) c.wire(`X0:${f}`, `Q1:${t}`, { R: Rw('W1'), name: 'W1' });
  for (const [a, b] of [['1', '2'], ['3', '4'], ['5', '6']]) c.contact(`Q1:${a}`, `Q1:${b}`, () => Q1.api.on, 'Q1');
  c.wire('Q1:N1', 'Q1:N2', { name: 'Q1 N (bez rozłączania)' }).wire('Q1:PE', 'K1:PE', { R: Rw('W2'), name: 'W2' });
  for (const [f, t] of [['2', '1'], ['4', '3'], ['6', '5']]) c.wire(`Q1:${f}`, `K1:${t}`, { R: Rw('W2'), name: 'W2' });
  c.wire('Q1:N2', 'K1:N', { R: Rw('W2'), name: 'W2' });
  for (const [a, b] of [['1', '2'], ['3', '4'], ['5', '6'], ['13', '14']]) c.contact(`K1:${a}`, `K1:${b}`, () => K1.api.on, 'K1');
  c.wire('K1:14', 'K1:A1', { name: 'mostek K1 14–A1' }).wire('K1:A2', 'K1:N', { name: 'mostek K1 A2–N' });
  for (const [f, t] of [['2', 'L1'], ['4', 'L2'], ['6', 'L3']]) c.wire(`K1:${f}`, `VFD:${t}`, { R: Rw('W3'), name: 'W3' });
  c.wire('K1:1', 'S0:11', { R: Rw('W5'), name: 'W5 żyła 1' }).wire('S1:12', 'K1:13', { R: Rw('W5'), name: 'W5 żyła 2' }).wire('S2:14', 'K1:A1', { R: Rw('W5'), name: 'W5 żyła 3' }).wire('K1:N', 'H1:X2', { R: Rw('W5'), name: 'W5 żyła 4' });
  c.wire('S0:12', 'S1:11', { name: 'mostek' }).wire('S1:12', 'S2:13', { name: 'mostek' }).wire('S2:14', 'H1:X1', { name: 'mostek' });
  c.contact('S0:11', 'S0:12', () => S0.api.closed, 'S0').contact('S1:11', 'S1:12', () => S1.api.closed, 'S1').contact('S2:13', 'S2:14', () => S2.api.closed, 'S2');
  // sterowanie falownikiem 24 V DC (zasilacz wewnętrzny falownika, działa przy zasilonym falowniku): +24 V → S3 → DI1 / DI2
  c.source('VFD24', { P: [eV.supply, 0], COM: [0, 0] }, () => reg.api.powered);
  c.wire('VFD24:P', 'VFD:+24', { name: 'falownik +24 V' }).wire('VFD24:COM', 'VFD:COM', { name: 'falownik COM' });
  c.wire('VFD:+24', 'S3:C', { R: Rw('W7'), name: 'W7 żyła 1' }).wire('S3:13', 'VFD:DI1', { R: Rw('W7'), name: 'W7 żyła 2' }).wire('S3:23', 'VFD:DI2', { R: Rw('W7'), name: 'W7 żyła 3' });
  c.contact('S3:C', 'S3:13', () => S3.api.pos === 'I', 'S3 I').contact('S3:C', 'S3:23', () => S3.api.pos === 'II', 'S3 II');
  c.load('DI1', ['VFD:DI1', 'VFD:COM'], { Un: eV.supply }).load('DI2', ['VFD:DI2', 'VFD:COM'], { Un: eV.supply });
  c.load('K1', ['K1:A1', 'K1:A2'], { Un: eK.coilU }).load('H1', ['H1:X1', 'H1:X2'], { Un: eH.U }).load('VFD', ['VFD:L1', 'VFD:L2', 'VFD:L3'], { Un: eV.Uin });
  const st = { kOn: false, kT: 0, r: null, uK: 0, uH: 0, uV: 0, Pin: 0, I: 0, Im: 0, Uout: 0, Pel: 0, dU: 0 };
  const In = eM.In, Rline = Rw('W1') + Rw('W2') + Rw('W3');
  // co klatkę: obwód → stycznik (zadziała przy ≥ 85 % Un po 20 ms, odpada < 60 % Un), lampka, zasilanie falownika
  function tick(dt) {
    const r = c.solve(); st.r = r; st.uK = r.U('K1'); st.uH = r.U('H1'); st.uV = r.U('VFD');
    if (!st.kOn) { st.kT = st.uK >= eK.pullIn * eK.coilU ? st.kT + dt : 0; if (st.kT >= eK.tClose) st.kOn = true; } else if (st.uK < eK.dropOut * eK.coilU) { st.kOn = false; st.kT = 0; }
    K1.api.coil(st.kOn); H1.api.power(st.uH / eH.U);
    const was = reg.api.powered; reg.api.power(st.uV >= 0.85 * eV.Uin); reg.api.ai(eV.aiMax * R1.api.ratio());
    const r2 = was === reg.api.powered ? r : c.solve();   // zasilanie falownika się zmieniło — jego 24 V też
    st.uDI1 = r2.U('DI1'); st.uDI2 = r2.U('DI2'); reg.api.inputs(st.uDI1 >= eV.diOn, st.uDI2 >= eV.diOn);   // wejście aktywne ≥ 15 V (IEC 61131-2, typ 1)
    for (const d of [X0, Q1, K1, S0, S1, S2, H1, R1, S3]) d.api.tick(dt);
  }
  // moce i prądy z momentu silnika (sprawność i cos φ silnika, sprawność, pobór jałowy i cos φ wejścia falownika — z danych urządzeń)
  function power(Tm, omega, on) {
    const Pm = Tm * omega, Pel = on ? (Pm >= 0 ? Pm / eM.eta : Pm * eM.eta) + eM.p0 * eM.kW * 1000 * Math.min(1, Math.abs(reg.api.f) / eM.f) : 0;
    st.Pel = Pel; st.Pin = reg.api.powered ? eV.standby + Math.max(0, Pel) / eV.eta : 0;
    st.I = st.uV > 1 ? st.Pin / (Math.sqrt(3) * st.uV * eV.pfIn) : 0;
    const Tn = motorG.userData.Tn || 7.4, k0 = eM.k0; st.Im = on ? In * Math.sqrt(k0 * k0 + (1 - k0 * k0) * Math.min(4, (Tm / Tn) ** 2)) : 0;
    st.Uout = on ? Math.min(eM.U, eM.U * Math.abs(reg.api.f) / eM.f) : 0; st.dU = Math.sqrt(3) * st.I * Rline;
  }
  return { X0, Q1, K1, S0, S1, S2, H1, R1, S3, devices: [reg, X0, Q1, K1, S0, S1, S2, H1, R1, S3], circuit: c, cables, st, tick, power, In, Rline };
})();
reg.name = 'Falownik';
// punkt 4 — bryły zderzeń zębów (wielokąty wypukłe z zarysu, ten sam co model) i strefa swobody zazębienia z nich:
// luz i jego zmienność wzdłuż przyporu wychodzą ze zderzeń zębów, nie ze wzoru (oba koła cieńsze o 0,04·m → ok. 0,08·m)
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
function physStats() {
  const st = phys.state, f1 = (v) => fmt(v, 1), a = reg.api;
  const rows = [['Regulator', `${a.run ? 'RUN' : 'STOP'} · ${a.dir > 0 ? 'FWD' : 'REV'} · ${f1(Math.abs(a.f))} Hz (zadana ${f1(a.set)} Hz)`], ['Silnik', `${dirOf(st.omega)} ${fmt(Math.abs(rpmOf(st.omega)))} obr/min (synchr. ${fmt(Math.abs(30 * a.f))})`], ['Moment silnika', `${f1(st.Tm)} N·m`],
    ['Wyjście', `${dirOf(eDisc.omega)} ${f1(Math.abs(rpmOf(eDisc.omega)))} obr/min`], ['Moment hamulca', `${f1(Math.abs(st.Tb))} N·m`]];
  // punkt 5 — obwód elektryczny
  { const E = ELEC, es = E.st, onoff = (v) => (v ? 'zamknięty' : 'otwarty');
    rows.push(['Zasilanie X0', `${E.X0.api.on ? 'WŁ' : 'WYŁ'} · 3 × 400/230 V, 50 Hz (TN-S)${es.r && es.r.shorts.length ? ` · ZWARCIE: ${es.r.shorts.join(', ')}` : ''}`]);
    rows.push(['Wyłącznik główny Q1', E.Q1.api.on ? 'I (załączony)' : '0 (wyłączony)']);
    rows.push(['Sterowanie 230 V', `S0 grzybek ${E.S0.api.latched ? 'WCIŚNIĘTY (styk otwarty)' : onoff(true)} · S1 STOP ${onoff(E.S1.api.closed)} · S2 START ${onoff(E.S2.api.closed)}`]);
    rows.push(['Stycznik K1', `${E.K1.api.on ? 'załączony' : 'wyłączony'}${E.K1.api.test ? ' (test ręczny)' : ''} · cewka ${fmt(es.uK)} V (zadziała ≥ ${fmt(E.K1.group.userData.elec.pullIn * E.K1.group.userData.elec.coilU)} V, odpada < ${fmt(E.K1.group.userData.elec.dropOut * E.K1.group.userData.elec.coilU)} V) · podtrzymanie 13-14 ${onoff(E.K1.api.on)}`]);
    rows.push(['Lampka H1', `${es.uH > E.H1.group.userData.elec.on * E.H1.group.userData.elec.U ? 'świeci' : 'zgaszona'} (${fmt(es.uH)} V)`]);
    rows.push(['Falownik — zasilanie', reg.api.powered ? `${fmt(es.uV)} V · pobór ${fmt(es.Pin)} W · ${fmt(es.I, 2)} A na fazę` : `bez zasilania (${fmt(es.uV)} V) — silnik wybiega`]);
    rows.push(['Praca / kierunek (S3 → DI)', `S3 w położeniu ${E.S3.api.pos} · DI1 (w przód) ${fmt(es.uDI1 || 0)} V, DI2 (wstecz) ${fmt(es.uDI2 || 0)} V · ${reg.api.run ? (reg.api.dir > 0 ? 'praca w przód' : 'praca wstecz') : !reg.api.armed && (reg.api.di[0] || reg.api.di[1]) ? 'BLOKADA — przestaw S3 na 0 (ochrona przed samoczynnym startem)' : 'stop'}`]);
    rows.push(['Zadawanie (R1 → AI)', `${fmt(reg.api.ain, 2)} V → ${fmt(reg.api.set, 1)} Hz (potencjometr 10 kΩ liniowy, 0–10 V = 0–50 Hz)`]);
    rows.push(['Silnik — zasilanie', es.Uout ? `${fmt(es.Uout)} V (U/f) · ${fmt(es.Im, 2)} A (znam. ${fmt(E.In, 2)} A) · ${fmt(es.Pel)} W` : 'bez napięcia']);
    rows.push(['Spadek napięcia W1–W3', `${fmt(es.dU * 1000, 1)} mV (${fmt(es.dU / 4, 4)} %) · ${fmt(E.Rline * 1000, 1)} mΩ na żyłę (2,5 mm² Cu, ${fmt(['W1', 'W2', 'W3'].reduce((a, k) => a + E.cables[k].userData.len, 0), 2)} m)`]);
  }
  // sprężyste połączenia: skręcenie (poza luzem) i moment — miękkie na liście (sztywność poniżej 10⁵ N·m/rad)
  for (const c of phys.edges) if (c.k < 1e5) rows.push([`Sprężystość: ${c.name}`, `${fmt(c.twist * 180 / Math.PI, 3)}° · ${fmt(Math.abs(c.T), 2)} N·m · k = ${fmt(c.k)} N·m/rad`]);
  // punkt 3: straty, pas, łańcuch
  const loss = phys.edges.reduce((a, c) => a + Math.abs(c.Tl * c.e.b.omega), 0);
  rows.push(['Straty tarcia w połączeniach', `${fmt(loss, 1)} W (sprawność ${fmt(st.P > 0.5 ? (st.Pout || 0) / st.P * 100 : 0, 1)} %)`]);
  // poślizg pasa mierzony jak na prawdziwym napędzie: s = 1 − ω₂ / (ω₁·d₁/d₂) (średnie prędkości z klatki) — pełzanie
  // sprężyste i poślizg całkowity (pas chwyta i zrywa się co kilkadziesiąt ms) w jednej liczbie
  for (const c of phys.edges) if (c.belt) {
    const w1 = c.e.a.omega, w2 = c.e.b.omega, sl = Math.abs(w1) > 1 ? 1 - w2 / (w1 * 0.16 / 0.08) : 0, full = sl > 0.05;
    rows.push(['Pas — poślizg', `${full ? 'POŚLIZG ' : ''}${fmt(sl * 100, 2)} %${full ? ' — pas ślizga się w rowku (moment graniczny przekroczony)' : ' — pełzanie sprężyste'} · moment ${fmt(Math.abs(c.T), 1)} N·m, graniczny ${fmt(c.belt.Tmax, 1)} N·m (napięcie 2 × ${BELT_F0} N, opasanie ${Math.round(BELT_WRAP * 180 / Math.PI)}°)`]);
  }
  for (const c of phys.edges) if (c.e.type === 'chain') rows.push(['Łańcuch — efekt wielokąta', `prędkość koła biernego waha się o ±${fmt((1 - Math.cos(Math.PI / 18)) * 50, 2)} % (z = 18)${Math.abs(c.e.a.omega) > 0.5 ? ` · teraz ${fmt(c.e.b.omega / c.e.a.omega * 27 / 18 * 100 - 100, 2)} %` : ''}`]);
  for (const c of phys.edges) if (c.dead) {
    const ga = c.e.a.group.userData, gb = c.e.b.group.userData, Z = ZONES.get(`${ga.z}:${gb.z}`), mm = (x) => fmt(x * gb.rp * 1000, 3);
    const zone = Z ? `z brył zębów ${mm(c.hi - c.lo)} mm (wzdłuż przyporu ${mm(Z.z.width.min)}–${mm(Z.z.width.max)})` : `${fmt((ga.phys.luz + gb.phys.luz) * 1000, 2)} mm`;
    rows.push([`Luz ${ga.z} : ${gb.z}`, `${zone} · ${c.contact > 0 ? 'przylega flanką przednią' : c.contact < 0 ? 'przylega flanką tylną' : 'w luzie — zęby się nie dotykają'}`]);
  }
  // bryły zderzeń bez wiązania (co 0,5 s): satelity, rolki łańcucha; zahaczenia części obrotowych (raz, przy starcie)
  const now = performance.now();
  if (!LIVE || now - LIVE.t > 500) LIVE = { t: now, ...liveChecks() };
  const mmS = (x) => fmt(Math.abs(x) * 1000, 3);
  LIVE.planets.forEach((p, k) => rows.push([`Satelita ${k + 1} — zęby`, ['sun', 'ring'].map((key) => `${key === 'sun' ? 'ze słonecznym' : 'z koroną'} ${p[key].pen ? 'PRZENIKANIE' : `luz −${mmS(p[key].lo)} / +${mmS(p[key].hi)} mm`}`).join(' · ')]));
  for (const r of LIVE.rollers) rows.push([`Rolki łańcucha — ${r.name}`, `${r.near} rolek na kole · ${r.pen ? `PRZENIKANIE ${r.pen} rolek` : 'bez przenikania (zarys ISO 606: gniazdo, bok r_e, głowa)'}`]);
  rows.push(['Zahaczenia o obudowy i łożyska', CLASHES.length ? CLASHES.map((c) => `${c.part} × ${c.fixed} ${mmS(c.depth)} mm`).join('; ') : `brak (sprawdzone ${parts.filter((e) => e.spin).length} części obrotowych, dla każdego kąta)`]);
  $('bDrive').replaceChildren(...rows.flatMap(([x, y]) => [el('span', { textContent: x }), el('b', { textContent: y })]));
  $('bList').replaceChildren(...parts.flatMap((e) => { const sp = el('span', { textContent: e.name }); sp.onclick = () => select(e); return [sp, el('b', { textContent: `${dirOf(e.omega)} ${fmt(Math.abs(rpmOf(e.omega)), 1)} obr/min · ${fmt(e.T, 1)} N·m` })]; }));
  if (ui.sel) showSel();
  if (window.LabPerf) window.LabPerf.modelRows([['Stopnie swobody', String(phys.nodes.length)], ['Wiązania', String(phys.edges.length)], ['Zazębienia z luzem', String(phys.edges.filter((c) => c.dead).length)], ['Bryły zderzeń zębów', `${[...ZONES.values()].reduce((a, v) => a + v.ua.z + v.ub.z, 0)} wielokątów wypukłych (${ZONES.size} zazębienia)`]]);
}
// hitboksy z geometrii (ogólnie, bez ręcznych wymiarów): zębatka — bryły zderzeń zębów (wielokąty wypukłe z zarysu),
// walec stóp i walce piast; inna część obrotowa — walec wzdłuż osi (obraca się z częścią); część nieruchoma —
// prostopadłościan; siatki druciane rysowane przez wszystko
const hitG = new THREE.Group(); scene.add(hitG); hitG.visible = false;
const HM = { clash: new THREE.LineBasicMaterial({ color: 0xff4a4a, transparent: true, opacity: 0.95, depthTest: false }), spin: new THREE.LineBasicMaterial({ color: 0x4ad2ff, transparent: true, opacity: 0.85, depthTest: false }), fixed: new THREE.LineBasicMaterial({ color: 0xffc14a, transparent: true, opacity: 0.7, depthTest: false }) };
let hitItems = null;
// wierzchołki siatek poddrzewa w układzie części wirującej `sp` (bez poddrzew innych zębatek — mają własne bryły)
function eachVert(sp, fn, skipGears) {
  const inv = new THREE.Matrix4().copy(sp.matrixWorld).invert(), v = new THREE.Vector3(), gears = [];
  const walk = (o) => {
    if (skipGears && o !== sp && isToothed(o.userData) && o.userData.spin) { gears.push(o); return; }
    if (o.isMesh && !o.isInstancedMesh && o.geometry.attributes.position) { const pa = o.geometry.attributes.position; for (let i = 0; i < pa.count; i += 3) fn(v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv)); }
    for (const c of o.children) walk(c);
  };
  walk(sp); return gears;
}
function cylLines(r, x0, x1) { const c = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(r, r, x1 - x0, 20, 1).rotateZ(-Math.PI / 2), 1), HM.spin); c.position.x = (x0 + x1) / 2; c.renderOrder = 20; return c; }
// bryły zębów części z zębami: zębatka, koło łańcuchowe (ząb podzielony na części wypukłe), koło koronowe (zęby
// wewnętrzne); każda część wypukła — obie ściany i krawędzie przy skrajnych punktach zęba
const isToothed = (u) => isGear(u) || (u && u.sprocket) || (u && u.internal);
function hullsOf(u) {
  if (u.sprocket) return MK.sprocketHulls(u.z, u.p, u.d1);
  if (u.internal) return MK.ringHulls(u.z, u.m);
  return MK.toothHulls(u.z, u.m, { alpha: u.alpha });
}
function gearHit(g) {
  const u = g.userData, sp = u.spin, h = u.w / 2, pts = [], holder = new THREE.Group();
  for (const t of hullsOf(u)) {
    const parts = Array.isArray(t) ? [t] : t.parts, all = parts.flat();
    for (const q of parts) for (const x of [-h, h]) for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; pts.push(x, a[0], a[1], x, b[0], b[1]); }
    const ang = (p) => Math.atan2(p[1], p[0]), c = ang(all.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0])), d = (p) => Math.atan2(Math.sin(ang(p) - c), Math.cos(ang(p) - c));
    const ext = [all.reduce((a, p) => (d(p) < d(a) ? p : a)), all.reduce((a, p) => (d(p) > d(a) ? p : a)), all.reduce((a, p) => (Math.hypot(...p) > Math.hypot(...a) ? p : a))];
    for (const p of ext) pts.push(-h, p[0], p[1], h, p[0], p[1]);
    hitStat.parts += parts.length;
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const teeth = new THREE.LineSegments(lg, HM.spin); teeth.renderOrder = 20; holder.add(teeth);
  if (u.internal) holder.add(cylLines(u.ra + 0.5 * u.m, -h, h), cylLines(u.R, -h, h));   // wieniec korony
  else holder.add(cylLines(u.sprocket ? u.R - u.rs : u.rf, -h, h));   // walec pod zębami
  sp.updateWorldMatrix(true, true);
  const side = { [-1]: { r: 0, x: 0 }, [1]: { r: 0, x: 0 } };
  eachVert(sp, (v) => { if (Math.abs(v.x) <= h + 1e-4) return; const s = side[Math.sign(v.x)]; s.r = Math.max(s.r, Math.hypot(v.y, v.z)); s.x = Math.max(s.x, Math.abs(v.x)); }, true);
  for (const sg of [-1, 1]) if (side[sg].r > 0) holder.add(cylLines(side[sg].r, sg < 0 ? -side[sg].x : h, sg < 0 ? -h : side[sg].x));
  hitG.add(holder); hitItems.push({ holder, src: sp }); hitStat.teeth += u.z; hitStat.gears++;
}
const hitStat = { teeth: 0, gears: 0, parts: 0 };
// rolki łańcucha — walce (Ø d₁, szerokość wewnętrzna), położenia z fazy łańcucha, odświeżane z obrazem
let rollHit = null;
function chainHit() {
  const N = chain.userData.N, r = chain.userData.d1 / 2, seg = 12, hw = 0.0039, pos = new Float32Array(N * seg * 3 * 2 * 2);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(lg, HM.spin); lines.renderOrder = 20; lines.frustumCulled = false; lines.matrixAutoUpdate = false;
  hitG.add(lines);
  rollHit = () => {
    chain.updateWorldMatrix(true, false); lines.matrix.copy(chain.matrixWorld);
    let k = 0; const put = (x, y, z) => { pos[k++] = x; pos[k++] = y; pos[k++] = z; };
    for (const [x, y, z] of chain.userData.rollers(chainPhase())) for (const sx of [-hw, hw]) for (let i = 0; i < seg; i++) {
      const a = i * TAU / seg, b = (i + 1) * TAU / seg; put(x + sx, y + r * Math.cos(a), z + r * Math.sin(a)); put(x + sx, y + r * Math.cos(b), z + r * Math.sin(b));
    }
    lg.attributes.position.needsUpdate = true;
  };
  rollHit();
}

/* ---------------- punkt 4 — kontrole brył zderzeń (statyczne i na żywo) ---------------- */
const chainPhase = () => eC1.theta * 18 / TAU;
// zderzenia par bez wiązania: satelity ze słonecznym i z koroną (położenia z modelu), rolki łańcucha z zębami kół
const HULL = { sun: hullsOf(eSun.group.userData), ring: hullsOf(ring.userData), pl: hullsOf(planets[0].userData) }, PL_RP = planets[0].userData.rp;
const ROLLER_POLY = (() => { const r = chain.userData.d1 / 2, q = []; for (let i = 0; i < 24; i++) q.push([r * Math.cos(i * TAU / 24), r * Math.sin(i * TAU / 24)]); return q; })();
const SPROCKETS = parts.filter((e) => e.group.userData.sprocket).map((e) => ({ e, hulls: hullsOf(e.group.userData), u: e.group.userData }));
function liveChecks() {
  const out = { planets: [], rollers: [] };
  // satelity: odstęp w obie strony od położenia z modelu (obrót satelity do dotyku), przenikanie
  for (const pl of planets) {
    const tp = pl.userData.spin.rotation.x, res = {};
    for (const [key, A, ta] of [['sun', eSun.spin, eSun.spin.rotation.x], ['ring', ring.userData.spin, ring.userData.spin.rotation.x]]) {
      const pair = contactPair({ hullsA: HULL[key], hullsB: HULL.pl, za: key === 'sun' ? ZS : ZR, zb: ZPL, map: planeMap(A, pl.userData.spin) });
      const pen = pair.hit(ta, tp);
      res[key] = pen ? { pen } : { pen, lo: pair.gap(ta, tp, -1) * PL_RP, hi: pair.gap(ta, tp, 1) * PL_RP };
    }
    out.planets.push(res);
  }
  // rolki łańcucha: wielokąt rolki w płaszczyźnie koła łańcuchowego, z częściami wypukłymi zębów (SAT)
  chain.updateWorldMatrix(true, false);
  const R = chain.userData.rollers(chainPhase()), v = new THREE.Vector3(), inv = new THREE.Matrix4();
  for (const S of SPROCKETS) {
    const sp = S.e.spin; sp.updateWorldMatrix(true, false); inv.copy(sp.matrixWorld).invert();
    let near = 0, pen = 0;
    for (const [x, y, z] of R) {
      v.set(x, y, z).applyMatrix4(chain.matrixWorld).applyMatrix4(inv);
      if (Math.hypot(v.y, v.z) > S.u.R + S.u.d1) continue;
      near++;
      const pair = contactPair({ hullsA: S.hulls, hullsB: [ROLLER_POLY], za: S.u.z, zb: 1, map: { a00: 1, a01: 0, a10: 0, a11: 1, tx: v.y, ty: v.z } });
      if (pair.hit(0, 0)) pen++;
    }
    out.rollers.push({ name: S.e.name, near, pen });
  }
  return out;
}
// części obrotowe a nieruchome (obudowy, łożyska, podpory, łoże): część obrotowa zakreśla bryłę obrotową — jej obrys
// promieniowy po osi (co 1 mm, z krawędzi trójkątów) nie zależy od kąta, więc kontrola raz wystarcza dla każdego
// położenia. Trójkąt części nieruchomej przecięty płaszczyzną x = środek przedziału daje odcinek; jego odległość od osi
// mniejsza niż obrys o więcej niż 0,05 mm = zahaczenie. Pomijane: łańcuch i pas (cięgna — kontrola rolek), koło
// koronowe (zęby — kontrola satelitów), krzyżaki przegubów (ruchome).
const CLASH = new Map(), CLASH_TOL = 0.00005;
let LIVE = null;
function interference() {
  const isPart = (o) => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.el) return true; return false; };
  const fixed = [];
  for (const o of root.children) if (!isPart(o) && !o.isLight && o.visible && o !== chain && o !== belt && o !== ring && o !== cross1 && o !== cross2) fixed.push({ o, name: o.name || 'podpora' });
  for (const e of parts) for (const c of e.group.children) if (c !== e.spin) fixed.push({ o: c, name: `${e.name} — część stała` });
  for (const o of [reg.group, ...elecG.children]) fixed.push({ o, name: o.name || (ELEC.devices.find((d) => d.group === o) || {}).name || 'instalacja elektryczna' });
  elecG.updateWorldMatrix(true, true); reg.group.updateWorldMatrix(true, true);
  root.updateWorldMatrix(true, true);
  const res = [], inv = new THREE.Matrix4(), A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), q = [A, B, C];
  for (const e of parts) {
    const sp = e.spin; if (!sp) continue;
    inv.copy(sp.matrixWorld).invert();
    // obrys promieniowy części (z krawędzi trójkątów, liniowo po x)
    let x0 = Infinity, x1 = -Infinity;
    const tris = [];
    sp.traverse((o) => { if (!o.isMesh || o.isInstancedMesh) return; const g = o.geometry, pa = g.attributes.position, ix = g.index, n = ix ? ix.count : pa.count;
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < n; i += 3) { const t = []; for (let k = 0; k < 3; k++) { const v = new THREE.Vector3().fromBufferAttribute(pa, ix ? ix.getX(i + k) : i + k).applyMatrix4(m); t.push(v); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); } tris.push(t); } });
    if (!(x1 > x0)) continue;
    const BIN = 0.001, nb = Math.ceil((x1 - x0) / BIN) + 1, env = new Float64Array(nb);
    for (const t of tris) for (let k = 0; k < 3; k++) {
      const a = t[k], b = t[(k + 1) % 3], ra = Math.hypot(a.y, a.z), rb = Math.hypot(b.y, b.z);
      const i0 = Math.round((Math.min(a.x, b.x) - x0) / BIN), i1 = Math.round((Math.max(a.x, b.x) - x0) / BIN);
      for (let i = i0; i <= i1; i++) { const u = b.x === a.x ? 0 : Math.min(1, Math.max(0, (x0 + i * BIN - a.x) / (b.x - a.x))); env[i] = Math.max(env[i], ra + (rb - ra) * u); }
    }
    const rmax = Math.max(...env);
    for (const f of fixed) {
      let depth = 0;
      f.o.traverse((o) => { if (!o.isMesh || o.isInstancedMesh) return; const g = o.geometry, pa = g.attributes.position, ix = g.index, n = ix ? ix.count : pa.count;
        const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
        for (let i = 0; i < n; i += 3) {
          for (let k = 0; k < 3; k++) q[k].fromBufferAttribute(pa, ix ? ix.getX(i + k) : i + k).applyMatrix4(m);
          const tx0 = Math.min(A.x, B.x, C.x), tx1 = Math.max(A.x, B.x, C.x);
          if (tx1 < x0 || tx0 > x1) continue;
          if (Math.min(A.y, B.y, C.y) > rmax || Math.max(A.y, B.y, C.y) < -rmax || Math.min(A.z, B.z, C.z) > rmax || Math.max(A.z, B.z, C.z) < -rmax) continue;
          const i0 = Math.max(0, Math.ceil((tx0 - x0) / BIN)), i1 = Math.min(nb - 1, Math.floor((tx1 - x0) / BIN));
          for (let bi = i0; bi <= i1; bi++) {
            if (!env[bi]) continue;
            const X = x0 + bi * BIN, P = [];
            for (let k = 0; k < 3; k++) { const a = q[k], b = q[(k + 1) % 3]; if ((a.x - X) * (b.x - X) <= 0 && a.x !== b.x) { const u = (X - a.x) / (b.x - a.x); P.push([a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u]); } }
            if (P.length < 2) continue;
            // odległość osi (początek układu) od odcinka P0–P1
            const [p0, p1] = P, dy = p1[0] - p0[0], dz = p1[1] - p0[1], L = dy * dy + dz * dz, u = L ? Math.max(0, Math.min(1, -(p0[0] * dy + p0[1] * dz) / L)) : 0;
            const d = Math.hypot(p0[0] + dy * u, p0[1] + dz * u), pen = env[bi] - d;
            if (pen > depth) depth = pen;
          }
        } });
      if (depth > CLASH_TOL) { res.push({ part: e.name, fixed: f.name, depth }); CLASH.set(f.o, Math.max(CLASH.get(f.o) || 0, depth)); }
    }
  }
  return res;
}
const t0Clash = performance.now(), CLASHES = interference();
console.info(`Kontrola zahaczeń: ${CLASHES.length ? CLASHES.map((c) => `${c.part} × ${c.fixed} ${(c.depth * 1000).toFixed(2)} mm`).join('; ') : 'brak'} (${Math.round(performance.now() - t0Clash)} ms)`);

function buildHit() {
  hitItems = [];
  for (const e of parts) {   // walec: zasięg wzdłuż osi (x lokalne) i największy promień w płaszczyźnie (y, z) części wirującej
    if (isToothed(e.group.userData) && e.spin) { gearHit(e.group); continue; }
    const sp = e.spin || e.group; sp.updateWorldMatrix(true, true);
    let x0 = Infinity, x1 = -Infinity, r = 0;
    const gears = eachVert(sp, (v) => { x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); r = Math.max(r, Math.hypot(v.y, v.z)); }, true);
    for (const g of gears) gearHit(g);
    if (!(x1 > x0)) continue;
    const holder = new THREE.Group(); holder.add(cylLines(r, x0, x1)); hitG.add(holder); hitItems.push({ holder, src: sp });
  }
  const isPart = (o) => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.el) return true; return false; };
  for (const o of root.children) {   // nieruchome: łożyska, obudowy, silnik (korpus), podpory, łoże
    if (isPart(o) || o.isLight || !o.visible) continue;
    if (isToothed(o.userData) && o.userData.spin) { gearHit(o); continue; }   // koło koronowe — bryły zębów wewnętrznych
    if (o === chain) { chainHit(); continue; }
    const bb = new THREE.Box3().setFromObject(o); if (bb.isEmpty()) continue;
    const bx = new THREE.Box3Helper(bb, 0xffc14a); bx.material = CLASH.has(o) ? HM.clash : HM.fixed; bx.renderOrder = 20; hitG.add(bx);
  }
  { const bb = new THREE.Box3().setFromObject(motorG.children.find((c) => c !== motorG.userData.spin) || motorG); const bx = new THREE.Box3Helper(bb, 0xffc14a); bx.material = HM.fixed; hitG.add(bx); }
  for (const o of [reg.group, ...elecG.children]) { if (o.isGroup && o.userData.cores) continue; const bb = new THREE.Box3().setFromObject(o); const bx = new THREE.Box3Helper(bb, 0xffc14a); bx.material = CLASH.has(o) ? HM.clash : HM.fixed; bx.userData.reg = true; hitG.add(bx); }
}
function syncHit() { if (rollHit) rollHit(); for (const h of hitItems) { h.src.updateWorldMatrix(true, false); h.holder.matrixAutoUpdate = false; h.holder.matrix.copy(h.src.matrixWorld); } for (const c of hitG.children) if (c.userData.reg) c.visible = S.mode === 'physics'; }
function setHit(on) { S.hit = on; save(); if (on && !hitItems) buildHit(); hitG.visible = on && S.mode !== 'items'; }
$('hit').checked = S.hit; $('hit').onchange = () => setHit($('hit').checked);

  return { reg, ELEC, phys, physStats, hitG, elecG, setHit, syncHit };
}
