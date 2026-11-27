// Układ silnika — instalacja elektryczna i regulator (z laboratorium mechaniki, z Tornado.io): falownik przy silniku,
// źródło X0, wyłącznik główny Q1, stycznik K1, grzybek S0, STOP S1, START S2, lampka H1, potencjometr R1, przełącznik S3
// (ControlKit) na wspólnej płycie, kable z przekrojem i długością z ułożenia, lista połączeń zacisków dla obwodu
// (js/behaviors/land/mech/circuit.js — rozwiązuje go zachowanie). Urządzenia obsługiwane na modelu (userData.control).
//   buildInstallation({ scene, mc, M }) → { reg, elecG, ELEC }    mc — maszyna (machine.js), M — materiały MechKit
import * as THREE from '../../../../../vendor/three/three.module.js';
import * as CK from '../../controls.js';
import { createCircuit } from '../../../../behaviors/land/mech/circuit.js';

export function buildInstallation({ scene, mc, M }) {
  const { BED_TOP, P, motorG } = mc;
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
  return { reg, elecG, ELEC };
}
