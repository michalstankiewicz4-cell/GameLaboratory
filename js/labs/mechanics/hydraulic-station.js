// Laboratorium mechaniki — stanowisko hydrauliczne na łożu (etap 4, tryby Maszyna i Fizyka):
//   zasilacz: zbiornik 15 l, silnik M2 0,37 kW → latarnia → pompa zębata 2 cm³/obr; płyta NG6 z zaworem bezpieczeństwa
//   60 bar, manometrem P1 i przetwornikiem ciśnienia B4; rozdzielacz 4/3 (tandem) z cewkami Y3a / Y3b; zawór dławiąco-
//   zwrotny na linii B (dławienie wypływu przy wysuwie); węże do siłownika Ø32/18 × 150 z popychaczem
//   podajnik: magazyn grawitacyjny kartonów → stół → przenośnik taśmowy M3 → pojemnik (karton wraca do magazynu)
// Fizyka: sieć hydrauliczna z ciśnieniami węzłów (behaviors/mech/hydraulic-axis.js), tłoczysko z sił, kartony z tarcia
// (behaviors/mech/conveyor.js). AUTO (S5): wysuw do wzrostu ciśnienia B4 (koniec skoku), wsuw do zera — sterowanie
// sygnałem z przetwornika. Ręcznie: przytrzymaj przycisk awaryjny cewki a (wysuw) albo b (wsuw). Maszyna: cykl kinematyczny.
// createHydraulicStation(ctx) → { parts, devices, step(dt), rows(R), state }
import * as THREE from '../../../vendor/three/three.module.js';
import * as MK from '../../models/mech/mechkit.js';
import * as CK from '../../models/mech/controls.js';
import * as FK from '../../models/mech/fluid/index.js';
import { BAR } from '../../behaviors/land/mech/fluid.js';
import { createHydraulicAxis } from '../../behaviors/land/mech/hydraulic-axis.js';
import { createConveyor } from '../../behaviors/land/mech/conveyor.js';
import { T } from './lang.js';

export function createHydraulicStation({ root, S, fmt, BED_TOP }) {
  const F = FK.fluidMaterials(), top = BED_TOP + 0.01, add = (o, x, y, z) => { o.position.set(x, y, z); root.add(o); return o; };
  const plate = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.01, 0.33), F.steel); plate.castShadow = plate.receiveShadow = true; add(plate, -3.77, BED_TOP + 0.005, 0.58);
  // zasilacz
  const XU = -4.42, ZU = 0.555, res = add(FK.reservoir({ L: 0.56, W: 0.26, H: 0.16 }), XU, top, ZU), yT = top + res.userData.top;
  const zM = 0.5, xm = XU - 0.28 + 0.012 + 0.292;
  const mot = add(MK.motor({ kW: 0.37, paint: 'paintBlue', name: 'Silnik M2 0,37 kW (zasilacz)' }), xm, yT, zM), axY = yT + mot.userData.spin.position.y;
  const bell = add(FK.bellHousing({ d1: 0.105, d2: 0.07, len: 0.075 }), xm, axY, zM);
  const pump = add(FK.gearPump({ m: 0.002, z: 10, b: 0.008 }), xm + 0.075, axY, zM);
  const xMan = -4.175, zMan = 0.6, man = add(FK.manifold({ W: 0.11 }), xMan, yT, zMan), at = (k) => man.userData.at[k].clone().add(man.position);
  const valve = add(FK.directionalValve({}), at('valve').x, at('valve').y, at('valve').z);
  const rv = FK.reliefValve({ pc: 60 }); rv.rotation.z = -Math.PI / 2; add(rv, at('relief').x, at('relief').y, at('relief').z);
  const riserTop = at('gauge').clone().setY(yT + 0.16), riser = FK.pipe({ points: [at('gauge'), riserTop], d: 0.008, wall: 0.001 }); root.add(riser);
  const gaugeM = add(FK.gauge({ range: 100 }), riserTop.x, riserTop.y, riserTop.z);
  const b4 = add(FK.pressureSensor({ range: 100 }), at('sensor').x, at('sensor').y, at('sensor').z);
  // zawór dławiąco-zwrotny wkręcony w przyłącze B płyty (oś wzdłuż +z, pokrętło w −x)
  const thrW = new THREE.Group(), thr = FK.throttleValve({ check: true }); thr.rotation.x = Math.PI / 2; thrW.add(thr); thrW.rotation.y = -Math.PI / 2;
  const thrL = thr.userData.L; add(thrW, at('B').x, at('B').y, at('B').z + thrL / 2);
  // przewody zasilacza: ssanie (rura do zbiornika), tłoczenie (wąż pompa → P), powrót (rura T → zbiornik)
  const pin = pump.userData.portAt.in.clone().add(pump.position), pout = pump.userData.portAt.out.clone().add(pump.position);
  root.add(FK.pipe({ points: [pin, pin.clone().setZ(pin.z - 0.03), new THREE.Vector3(pin.x, yT, pin.z - 0.03)], d: 0.012, wall: 0.0015, R: 0.02 }));
  root.add(FK.hose({ a: pout, da: [0, 0, 1], b: at('P'), db: [1, 0, 0], d: 0.01, di: 0.006, reach: 0.04 }));
  const tP = at('T'), retHose = FK.clearHose({ a: tP, da: [-1, 0, 0], b: new THREE.Vector3(tP.x - 0.06, yT, tP.z), db: [0, -1, 0], di: 0.01, wall: 0.003, fluid: 'oil', reach: 0.03 }); root.add(retHose);   // powrót — wąż przezroczysty, widać płynący olej
  // siłownik na podstawie, popychacz; stół, magazyn, przenośnik, pojemnik
  const s = 0.06, ZL = 0.62, xc0 = -4.03, convTop = top + 0.1;
  const hA = (0.032 + 0.022) / 2 + 0.008;   // wysokość osi siłownika nad łapami (jak w FK.hydCylinder)
  // popychacz: płytka nad stołem (spód 6 mm nad blatem), oś siłownika na wysokości środka kartonu
  const cylG = FK.hydCylinder({ D: 0.032, d: 0.018, stroke: 0.15, pusher: { w: 0.07, h: s * 0.8, y0: hA - s / 2 + 0.006 } }), cu = cylG.userData;
  const hAx = convTop + s / 2, base = hAx - cu.hA;
  add(cylG, xc0, base, ZL);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(cu.L0, base - top, 0.08), F.steel); stand.castShadow = stand.receiveShadow = true; add(stand, xc0 + cu.L0 / 2, (base + top) / 2, ZL);
  const xFeed = xc0 + cu.front + 0.002 + s / 2, xB0 = xFeed + s / 2 + 0.02, tableX0 = xc0 + cu.L0 + 0.015;
  const table = add(FK.feedTable({ L: xB0 - 0.015 - tableX0, w: 0.1, top: convTop - top }), tableX0, top, ZL);
  const mag = add(FK.magazine({ s, n: 4 }), xFeed, convTop, ZL);
  const conv = add(FK.beltConveyor({ L: 0.7, w: 0.1, top: convTop - top }), xB0, top, ZL), xB1 = xB0 + 0.7;
  const binM = add(FK.bin({ L: 0.15, W: 0.14, H: 0.05 }), xB1 + 0.045, top, ZL);
  const rc = FK.revCounter({ max: 120 }); add(rc, xB1, convTop - 0.0215, ZL + 0.077);   // licznik obrotów bębna zwrotnego przenośnika (koniec osi)
  const cartons = []; for (let i = 0; i < 4; i++) cartons.push(add(FK.carton({ s }), xFeed, convTop + i * s, ZL));
  // węże A, B do siłownika
  const cA = cu.portAt.A.clone().add(cylG.position), cB = cu.portAt.B.clone().add(cylG.position), thrOut = at('B').clone().setZ(at('B').z + thrL);
  root.add(FK.hose({ a: at('A'), da: [0, 0, 1], b: cA, db: [0, -1, 0], d: 0.01, di: 0.006, reach: 0.06 }));
  root.add(FK.hose({ a: thrOut, da: [0, 0, 1], b: cB, db: [0, -1, 0], d: 0.01, di: 0.006, reach: 0.04 }));
  // przycisk AUTO na pokrywie
  const s5 = add(CK.pushButton({ color: 'green', mode: 'latch', contact: 'NO', lit: true }), XU - 0.235, yT, 0.6), k5 = s5.userData.api;

  /* ---------------- logika ---------------- */
  const ax = createHydraulicAxis({ cyl: { D: 0.032, d: 0.018, stroke: 0.15 }, pc: 60 * BAR }), A = ax.state;
  const cv = createConveyor({ xFeed: 0, beltX0: xB0 - xFeed, beltX1: xB1 - xFeed, s, m: 0.4, n: 4, binY: top + 0.004 - convTop, binX: 0.06 }), C = cv.state;
  let held = 0, auto = 'wait', load = { mPush: 0, Fpush: 0 }, belt = 0, tM = 0, wait = 0;
  const vBelt = 0.12, xr0 = cu.front - xFeed + xc0;   // przód popychacza (wsunięty) względem gniazda magazynu
  const valveApi = { press: (n) => { if (n === 'a') held = 1; if (n === 'b') held = -1; }, release: () => { held = 0; }, drag() {}, tick() {} };
  function step(dt) {
    const phy = S.mode === 'physics';
    let spool = 0;
    if (phy) {
      k5.tick(dt);
      if (held) spool = held;
      else if (k5.pressed) {   // AUTO: sygnał B4 > 45 bar przy końcu skoku → przełącz
        if (auto === 'wait') { wait += dt; if (wait > 0.6) { auto = 'out'; wait = 0; } }
        if (auto === 'out') { spool = 1; if (A.p.P > 45 * BAR && A.x > 0.14) auto = 'in'; }
        else if (auto === 'in') { spool = -1; if (A.p.P > 45 * BAR && A.x < 0.003) auto = 'wait'; }
      } else auto = 'wait';
      ax.step(dt, { spool, Fext: load.Fpush, mExt: load.mPush, motorOn: true });
    } else {   // maszyna: cykl 6 s — wysuw 2,5 s, wsuw 2,5 s, postój
      tM = (tM + dt) % 6; const xk = tM < 2.5 ? 0.15 * tM / 2.5 : tM < 5 ? 0.15 * (1 - (tM - 2.5) / 2.5) : 0;
      A.v = (xk - A.x) / Math.max(dt, 1e-6); A.x = xk; A.n = 1450; spool = tM < 2.5 ? 1 : tM < 5 ? -1 : 0;
    }
    load = cv.step(dt, { xPusher: xr0 + A.x, vPusher: A.v, vBelt });
    belt += vBelt * dt;
    // rysowanie
    cu.setStroke(A.x); valve.userData.setSpool(phy ? spool : spool); conv.userData.setBelt(belt);
    pump.userData.setAngle((pump.userData._th = (pump.userData._th || 0) + A.n * 2 * Math.PI / 60 * dt)); mot.userData.spin.rotation.x = pump.userData._th;
    gaugeM.userData.setValue(phy ? A.p.P / BAR : 8 + (spool ? 4 : 0));
    const q = ax.net.q, Qt = phy ? Math.max(0, q.AT + q.BT + q.PT + q.relief) : 2.9 / 60000; retHose.userData.setFlow(Qt / (Math.PI * 0.01 * 0.01 / 4), true); retHose.userData.tick(dt);
    rc.userData.setCount(belt / (conv.userData.r * 2 * Math.PI)); rc.userData.setRpm(vBelt / conv.userData.r * 60 / (2 * Math.PI));
    cv.boxes.forEach((b, i) => { cartons[i].position.set(xFeed + b.x, convTop + b.y, ZL); cartons[i].visible = b.st !== 'bin' || b.t < 1.4; });
    for (const e of list) { if (e.key === 'cyl') { e.omega = A.v; e.theta = A.x; e.T = A.Fp; } if (e.key === 'pump') { e.omega = A.n * 2 * Math.PI / 60; e.T = ax.pump.T(A.p.P); } if (e.key === 'conv') { e.omega = vBelt; e.theta = belt; } }
  }
  function rows(R) {
    const phy = S.mode === 'physics';
    R.push(['Stanowisko hydrauliczne — siłownik', `x ${fmt(A.x * 1000, 1)} mm · v ${fmt(A.v * 1000, 0)} mm/s · ${A.v > 0.005 ? 'wysuw' : A.v < -0.005 ? 'wsuw' : 'postój'} · kartony dostarczone ${C.delivered}`]);
    if (phy) {
      R.push(['Stanowisko hydrauliczne — ciśnienia', `P ${fmt(A.p.P / BAR, 1)} bar · A ${fmt(A.p.A / BAR, 1)} bar · B ${fmt(A.p.B / BAR, 1)} bar · przetwornik B4 ${fmt(4 + 16 * Math.min(1, A.p.P / (100 * BAR)), 2)} mA`]);
      R.push(['Stanowisko hydrauliczne — zasilacz', `pompa ${fmt(A.n, 0)} obr/min · ${fmt(A.Qp * 60000, 2)} l/min · przelew ${fmt(A.Qrel * 60000, 2)} l/min · moc ${fmt(A.Phyd, 0)} W · ciepło ${fmt(A.Ploss, 0)} W · AUTO ${k5.pressed ? T('wł.', 'on') : T('wył.', 'off')} — zielony S5, ręcznie: przytrzymaj cewkę a / b rozdzielacza`]);
    }
  }
  const el0 = (key, id, name, group, props, ports, dof = 'rot') => ({ key, id, name, group, props, ports: ports.map(([pid, pn, kind]) => ({ id: pid, name: pn, kind })), theta: 0, omega: 0, T: 0, eta: 1, r: 0, dof, clock: true });
  const list = [
    el0('unit', 'HY-unit', `Zbiornik zasilacza (HLP 46, ${fmt(res.userData.V * 1000, 0)} l)`, res, [['Pojemność', `${fmt(res.userData.V * 1000, 0)} l`], ['Olej', 'HLP 46 (ISO VG 46)']], [['suction', 'Ssanie pompy', 'płyn'], ['ret', 'Powrót T', 'płyn']]),
    el0('pump', 'HY-pump', 'Pompa zębata 2 cm³/obr (silnik M2 0,37 kW)', pump, [['Objętość robocza', `${fmt(ax.pump.Vg * 1e6, 2)} cm³/obr`], ['Wydajność przy 1450 obr/min', `${fmt(ax.pump.Q(1450, 0) * 60000, 2)} l/min`]], [['shaft', 'Wał ← latarnia ← silnik M2', 'obrót'], ['out', 'Tłoczenie → P płyty', 'płyn']]),
    el0('relief', 'HY-relief', 'Zawór bezpieczeństwa 60 bar', rv, [['Ciśnienie otwarcia', '60 bar'], ['Pełne otwarcie', '68 bar']], [['p', 'P (płyta)', 'płyn'], ['t', 'T (zbiornik)', 'płyn']]),
    el0('valve', 'HY-valve', 'Rozdzielacz 4/3 NG6 (Y3a / Y3b, tandem)', valve, [['Położenia', 'a: P→A, B→T · 0: P→T · b: P→B, A→T'], ['Cewki', '24 V DC, 30 W']], [['P', 'P', 'płyn'], ['A', 'A → siłownik', 'płyn'], ['B', 'B → dławik → siłownik', 'płyn'], ['T', 'T → zbiornik', 'płyn']]),
    el0('thr', 'HY-throttle', 'Zawór dławiąco-zwrotny (linia B)', thrW, [['Dławienie', 'wypływ przy wysuwie (stała prędkość pod obciążeniem)'], ['Zwrotny', 'swobodny przepływ przy wsuwie']], [['a', 'Od rozdzielacza B', 'płyn'], ['b', 'Do siłownika B', 'płyn']]),
    el0('cyl', 'HY-cylinder', 'Siłownik Ø32/18 × 150 z popychaczem', cylG, [['Siła wysuwu przy 60 bar', `${fmt(ax.cyl.Fout(60 * BAR), 0)} N`], ['Siła wsuwu przy 60 bar', `${fmt(ax.cyl.Fin(60 * BAR), 0)} N`]], [['A', 'A — strona tłoka', 'płyn'], ['B', 'B — strona tłoczyska', 'płyn'], ['rod', 'Popychacz → karton', 'przesuw']], 'lin'),
    el0('gauge', 'HY-gauge', 'Manometr P1 0–100 bar', gaugeM, [['Klasa', '1,6'], ['Przyłącze', 'G 1/4 na rurce nad płytą']], [['p', 'Ciśnienie P', 'płyn']]),
    el0('b4', 'HY-sensor', 'Przetwornik ciśnienia B4 (4–20 mA)', b4, [['Zakres', '0–100 bar'], ['Wyjście', '4–20 mA → AUTO (próg 45 bar)']], [['p', 'Ciśnienie P', 'płyn'], ['out', 'Sygnał 4–20 mA', 'sygnał']]),
    el0('conv', 'HY-conveyor', 'Przenośnik taśmowy M3 (0,12 m/s)', conv, [['Taśma', 'PVC, 100 mm'], ['Prędkość', '0,12 m/s']], [['load', 'Taśma — kartony', 'przesuw']], 'lin'),
    el0('mag', 'HY-magazine', 'Magazyn grawitacyjny (4 kartony)', mag, [['Karton', '60 mm, 0,4 kg']], [['out', 'Dolny karton → popychacz', 'przesuw']], 'lin'),
    el0('rc', 'HY-counter', 'Licznik obrotów bębna przenośnika', rc, [['Zakres', '0–120 obr/min'], ['Liczydło', '6 bębenków']], [['shaft', 'Oś bębna zwrotnego', 'obrót']]),
    el0('ret', 'HY-return', 'Powrót T — wąż przezroczysty (olej)', retHose, [['Średnica', '10 × 3'], ['Ciecz', 'olej HLP 46 — widać przepływ']], [['a', 'T płyty', 'płyn'], ['b', 'Zbiornik', 'płyn']]),
    el0('s5', 'HY-button', 'Przycisk S5 (AUTO, z podświetleniem)', s5, [['Styk', 'NO, z zatrzaskiem']], [['a', 'Sterowanie AUTO', 'sygnał']]),
  ];
  for (const e of list) e.group.userData.el = e;
  return { parts: list, devices: [{ group: valve, api: valveApi }, { group: s5, api: k5 }], step, rows, state: { A, C } };
}
