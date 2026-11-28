// Laboratorium mechaniki — etap 3 w maszynie (tryby Maszyna i Fizyka): czujniki, przekaźnik czasowy, regulator PID.
//   B1 — czujnik indukcyjny M12 nad zębami koła 1 (z = 20, stal): impulsy z zębów → obroty wału 1
//   B2 — enkoder inkrementalny 1024 imp/obr na tylnym końcu wału silnika (przez osłonę wentylatora): obroty silnika
//   B3 — bariera optyczna okraczająca tarczę hamulca: impulsy z otworów wentylacyjnych → obroty wału wyjściowego
//   KT1 — przekaźnik czasowy (funkcja E, 2 s) na szynie przy styczniku: falownik dostaje RUN dopiero po czasie od
//         START (obwód w mechanics.js: +24 V falownika → KT1 15–18 → S3), lampka H1 świeci od razu — ostrzeżenie
//   U1 — regulator PID w skrzynce przy pulpicie: PV z enkodera B2, wyjście 0–10 V na wejście AI falownika; A/M —
//         ręcznie (zadawanie z potencjometru R1, wyjście regulatora śledzi R1) albo automatycznie (zadana SV na U1)
// createAutomation(ctx) → { pid, kt, devices, step(dt), rows(R), parts, sig }
import * as THREE from '../../../vendor/three/three.module.js';
import * as MK from '../../models/mech/mechkit.js';
import * as SN from '../../models/mech/sensors/index.js';
import * as RL from '../../models/mech/relays/index.js';
import * as RG from '../../models/mech/regulators/index.js';
import { materials } from '../../models/mech/common.js';
import { createInductive, createEncoder, createBarrier, profileRadius } from '../../behaviors/land/mech/sensors.js';
import { createTimerRelay, FUNCTIONS } from '../../behaviors/land/mech/timer-relay.js';
import { createPID } from '../../behaviors/land/mech/pid.js';
import { createSignals } from '../../behaviors/land/mech/signal.js';

const TAU = Math.PI * 2;
export function createAutomation({ root, elecG, S, fmt, BED_TOP, Y0, motorG, eMotor, g1, eG1, disc, eDisc }) {
  const M = materials(), sig = createSignals();
  sig.define('B1', { kind: 'digital', label: 'B1' }).define('B2A', { kind: 'digital' }).define('B3', { kind: 'digital' }).define('U1', { kind: 'analog', unit: 'V' });
  root.updateMatrixWorld(true);
  // B1 — nad kołem 1, odstęp 1 mm od wierzchołków (zasięg M12 flush: 2 mm, stal)
  const u1 = g1.userData, o = MK.involuteOutline(u1.z, u1.m), rAt = profileRadius(o.pts);
  const gb = new THREE.Box3().setFromObject(g1), gx = (gb.min.x + gb.max.x) / 2;
  const b1 = SN.inductiveSensor({ size: 'M12', flush: true }), gap = 0.001; b1.position.set(gx, Y0 + o.ra + gap, 0); root.add(b1);
  { const yA = b1.position.y + 0.027, post = new THREE.Mesh(new THREE.BoxGeometry(0.02, yA + 0.002 - BED_TOP, 0.008), M.steel); post.position.set(gx, (BED_TOP + yA + 0.002) / 2, -0.071);
    // ramię z otworem Ø 12,2 — czujnik przechodzi przez otwór, dwie nakrętki zaciskają ramię
    const sh = new THREE.Shape(); sh.moveTo(-0.01, -0.075); sh.lineTo(0.01, -0.075); sh.lineTo(0.01, 0.01); sh.lineTo(-0.01, 0.01); sh.closePath(); const hp = new THREE.Path(); hp.absarc(0, 0, 0.0061, 0, Math.PI * 2, true); sh.holes.push(hp);
    const arm = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: false, curveSegments: 24 }).rotateX(Math.PI / 2), M.steel); arm.position.set(gx, yA + 0.002, 0); const foot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.006, 0.04), M.steel); foot.position.set(gx, BED_TOP + 0.003, -0.07); for (const m of [post, arm, foot]) { m.castShadow = m.receiveShadow = true; root.add(m); } }
  const B1 = createInductive({ size: 'M12', flush: true, target: 'steel' });
  // B2 — enkoder za osłoną wentylatora silnika (wałek przedłużony przez osłonę, ramię reakcyjne do osłony)
  const mbb = new THREE.Box3().setFromObject(motorG), b2 = SN.encoder({ ppr: 1024, cut: false }); b2.rotation.y = Math.PI; b2.position.set(mbb.min.x - 0.0205, Y0, 0); root.add(b2);   // piasta sprzęgła przy osłonie wentylatora
  { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.08, 0.02), M.steel); arm.position.set(mbb.min.x - 0.048, Y0 + 0.068, 0); root.add(arm); }   // ramię reakcyjne enkodera
  const B2 = createEncoder({ ppr: 1024 });
  // B3 — bariera jednodrożna okraczająca tarczę hamulca na promieniu otworów wentylacyjnych (pod osią, naprzeciw zacisku):
  // wiązka wzdłuż osi przechodzi przez otwór, tarcza ją przerywa — impulsy z otworów → obroty wału wyjściowego
  const du = disc.userData, rv = du.d / 2 * 0.72, dx = disc.position.x, span = du.t + 0.002 + 0.036, b3 = SN.opticalBarrier({ span });
  b3.position.set(dx - span / 2, Y0 - rv, disc.position.z); root.add(b3);
  for (const x of [0, span]) { const h = Y0 - rv - 0.028 - BED_TOP, st = new THREE.Mesh(new THREE.BoxGeometry(0.018, h, 0.03), M.steel); st.position.set(b3.position.x + x + (x ? 0.006 : -0.006), BED_TOP + h / 2, disc.position.z); st.castShadow = true; root.add(st); }
  const blk = disc;
  const B3 = createBarrier({}), ray = new THREE.Raycaster(); B3.freq = 0;
  // KT1 — na szynie obok stycznika; U1 — w skrzynce przy pulpicie
  const kt1 = RL.timerRelay({ fn: 'E', T: 2 }); kt1.position.set(-5.963, BED_TOP + 0.06, 0.42); elecG.add(kt1);
  const KT1 = createTimerRelay({ fn: 'E', T: 2, Un: 230 });
  // skrzynka z blachy 1,5 mm (dno, ściany, tył, daszek) i przednia ścianka z otworem 45 × 45 mm pod regulator
  const box = new THREE.Group(); box.position.set(-5.9, BED_TOP, 0.6); elecG.add(box);
  { const W = 0.075, H = 0.075, D = 0.1, t = 0.0015, pl = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.paintGrey); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; box.add(m); };
    pl(W, t, D, 0, t / 2, 0); pl(W, t, D, 0, H - t / 2, 0); pl(t, H - 2 * t, D, -W / 2 + t / 2, H / 2, 0); pl(t, H - 2 * t, D, W / 2 - t / 2, H / 2, 0); pl(W - 2 * t, H - 2 * t, t, 0, H / 2, -D / 2 + t / 2);
    const fs = new THREE.Shape(); fs.moveTo(-W / 2 + t, t); fs.lineTo(W / 2 - t, t); fs.lineTo(W / 2 - t, H - t); fs.lineTo(-W / 2 + t, H - t); fs.closePath(); const hp = new THREE.Path(); hp.moveTo(-0.0225, 0.04 - 0.0225); hp.lineTo(-0.0225, 0.04 + 0.0225); hp.lineTo(0.0225, 0.04 + 0.0225); hp.lineTo(0.0225, 0.04 - 0.0225); hp.closePath(); fs.holes.push(hp);
    const fm = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: t, bevelEnabled: false }), M.paintGrey); fm.position.z = D / 2 - t; fm.castShadow = true; box.add(fm); }
  const u1g = RG.pidController(); u1g.position.set(-5.9, BED_TOP + 0.04, 0.65); elecG.add(u1g);   // ramka na przedniej ściance (z = 0,65), korpus w otworze
  const pid = createPID({ Kp: 0.004, Ti: 1.2, Td: 0, sv: 1200 }), P = pid.state;
  const u1api = { press: (n) => { if (n === 'am') P.auto = !P.auto; if (P.auto && n === 'up') P.sv = Math.min(1500, P.sv + 50); if (P.auto && n === 'down') P.sv = Math.max(0, P.sv - 50); }, release() {}, drag() {}, tick() {} };
  const devices = [{ group: kt1, api: kt1.userData.api }, { group: u1g, api: u1api }];
  let t = 0, lastTh1 = null, lastB3 = null;
  function step(dt) {
    t += dt;
    // zęby mijają czujnik szybciej niż klatki (196 Hz przy 588 obr/min) — ruch między klatkami dzielony na kroki ≤ 1/8 podziałki
    const th1 = eG1.theta, d1 = th1 - (lastTh1 ?? th1), n1 = Math.min(400, Math.max(1, Math.ceil(Math.abs(d1) / (TAU / u1.z / 8))));
    for (let i = 1; i <= n1; i++) B1.update(b1.position.y - Y0 - rAt(-(th1 - d1 + d1 * i / n1)), dt / n1);   // czoło nad osią koła minus promień zarysu pod czujnikiem
    lastTh1 = th1; b1.userData.setOn(B1.state.on); sig.set('B1', B1.state.on, t);
    B2.update(eMotor.theta, dt); b2.userData.setAngle(eMotor.theta); sig.set('B2A', B2.state.A, t);
    root.updateMatrixWorld(true);
    const a = b3.localToWorld(b3.userData.beamFrom.clone()), c = b3.localToWorld(b3.userData.beamTo.clone());
    ray.set(a, c.clone().sub(a).normalize()); ray.far = a.distanceTo(c);
    const h = ray.intersectObject(blk, true)[0], was = B3.state.count; B3.update(!!h, dt);
    if (B3.state.count > was) { if (lastB3 !== null) B3.freq = B3.freq ? B3.freq * 0.7 + 0.3 / (t - lastB3) : 1 / (t - lastB3); lastB3 = t; } else if (lastB3 !== null && t - lastB3 > 2) B3.freq = 0; b3.userData.setBeam(h ? h.distance + 0.0105 : null); sig.set('B3', B3.state.out, t);
  }
  // obwód (mechanics.js) wywołuje: ktTick(dt, U A1–A2) przed rozwiązaniem obwodu; aiOut(R1·10 V) — napięcie na AI falownika
  function ktTick(dtt, U) { const ra = kt1.userData.api; KT1.state.fn = ra.fn; KT1.state.T = ra.T; KT1.tick(dtt, U); kt1.userData.setLeds(KT1.state.powered, KT1.state.closed); return KT1.state.closed; }
  function aiOut(uR1, dtt) {
    if (!P.auto) P.manual = uR1;   // ręcznie: wyjście śledzi potencjometr (przejście bezuderzeniowe)
    pid.step(B2.state.rpm, dtt); sig.set('U1', P.out, t);
    u1g.userData.show(B2.state.rpm, P.auto ? P.sv : P.out * 150, P.out, P.auto);
    return P.out;
  }
  const on = (b) => (b ? '24 V' : '0 V');
  function rows(Rr) {
    Rr.push(['Czujnik B1 (indukcyjny, zęby koła 1)', `${on(B1.state.on)} · impulsy ${B1.state.edges} · ${fmt(B1.state.freq, 1)} Hz → ${fmt(B1.state.freq / u1.z * 60, 1)} obr/min wału 1`]);
    Rr.push(['Enkoder B2 (silnik, 1024 imp/obr)', `A ${B2.state.A} B ${B2.state.B} · licznik ${B2.state.count} · ${fmt(B2.state.rpm, 1)} obr/min`]);
    Rr.push(['Bariera B3 (otwory tarczy hamulca)', `${B3.state.blocked ? 'wiązka przerwana' : 'wiązka wolna'} · ${on(B3.state.out)} · impulsy ${B3.state.count} · ${fmt(B3.freq, 1)} Hz → ${fmt(B3.freq / du.vents * 60, 1)} obr/min wału wyjściowego`]);
    if (S.mode === 'physics') {
      Rr.push(['Przekaźnik czasowy KT1', `${KT1.state.fn} (${FUNCTIONS[KT1.state.fn]}), ${fmt(KT1.state.T, 1)} s · ${KT1.state.phase}${KT1.state.powered && !KT1.state.closed ? ` · zostało ${fmt(KT1.remaining(), 1)} s` : ''} · styk 15–18 ${KT1.state.closed ? 'zamknięty' : 'otwarty'}`]);
      Rr.push(['Regulator U1 (PID)', `${P.auto ? 'automatycznie' : 'ręcznie (R1)'} · SV ${fmt(P.sv)} obr/min · PV ${fmt(P.pv)} obr/min · wyjście ${fmt(P.out, 2)} V → ${fmt(P.out * 5, 1)} Hz · P ${fmt(P.P, 2)} I ${fmt(P.I, 2)} V — kliknij A/M, ▲ ▼ na regulatorze`]);
    }
  }
  // elementy do wybierania (okno Element)
  const el0 = (id, name, group, props, ports) => ({ id, name, group, props, ports: ports.map(([pid_, pn, kind]) => ({ id: pid_, name: pn, kind })), theta: 0, omega: 0, T: 0, eta: 1, r: 0, dof: 'rot', clock: true });
  const parts = [
    el0('B1', 'Czujnik indukcyjny B1 (M12, PNP NO)', b1, [['Zasięg', `sn = ${fmt(B1.state.sn * 1000, 1)} mm (stal, flush)`], ['Odstęp od zębów', `${fmt(gap * 1000, 1)} mm`], ['Cel', `koło 1, z = ${u1.z}, wysokość zęba ${fmt((o.ra - o.rf) * 1000, 1)} mm`]], [['sense', 'Czoło — zęby koła 1', 'obrót'], ['out', 'Wyjście PNP NO', 'sygnał']]),
    el0('B2', 'Enkoder B2 (1024 imp/obr)', b2, [['Montaż', 'tylny koniec wału silnika, sprzęgło mieszkowe, ramię reakcyjne'], ['Wyjście', 'A, B, Z — HTL 24 V'], ['Pomiar obrotów', 'okno 100 ms, zliczanie ×4']], [['shaft', 'Wałek — wał silnika', 'obrót'], ['out', 'Kanały A, B, Z → regulator U1', 'sygnał']]),
    el0('B3', 'Bariera optyczna B3', b3, [['Położenie', `okracza tarczę hamulca na promieniu ${fmt(rv * 1000)} mm (otwory wentylacyjne: ${du.vents})`], ['Światło', 'czerwone 660 nm'], ['Wyjście', 'PNP, załącza przy przerwaniu']], [['light', 'Wiązka — otwory tarczy', 'światło'], ['out', 'Wyjście PNP', 'sygnał']]),
    el0('KT1', 'Przekaźnik czasowy KT1', kt1, [['Funkcja', 'E — opóźnione załączenie (zmiana: klik pokrętła)'], ['Zasilanie', 'A1 z K1 14 (230 V, gdy stycznik załączony)'], ['Styk 15–18', '+24 V falownika → przełącznik S3 (RUN po czasie)']], [['coil', 'Zasilanie A1–A2', 'prąd'], ['out', 'Styk 15–18', 'prąd']]),
    el0('U1', 'Regulator U1 (PID 48 × 48)', u1g, [['Wejście PV', 'enkoder B2 (obroty silnika)'], ['Wyjście', '0–10 V → wejście AI falownika'], ['Nastawy', `Kp ${fmt(P.Kp, 3)} V/(obr/min), Ti ${fmt(P.Ti, 1)} s`]], [['pv', 'Wejście impulsowe (B2)', 'sygnał'], ['out', 'Wyjście 0–10 V (AI falownika)', 'sygnał']]),
  ];
  for (const e of parts) e.group.userData.el = e;
  return { pid, kt: KT1, devices, step, rows, parts, sig, ktTick, aiOut, B1, B2, B3 };
}
