// Laboratorium mechaniki — fontanna na łożu (etap 4, tryby Maszyna i Fizyka): zbiornik z akrylu z wodą, pompa odśrodkowa
// M4 (ssanie przez ściankę zbiornika), zawór zwrotny na pionie, zawór kulowy nad zbiornikiem, rura z łukami i dysza Ø 8
// skierowana w górę — strumień spada z powrotem do zbiornika.
// Fizyka: punkt pracy pompy z równowagi wysokości pompy i oporów instalacji (behaviors/mech/fountain.js), rozruch silnika,
// strumień z prędkości wylotu dyszy (krople na torze balistycznym). S7 — pompa (zatrzask), klik dźwigni zaworu — 0° / 45° / 90°.
// Maszyna: pompa pracuje, zawór otwarty.
// createFountainStation(ctx) → { parts, devices, step(dt), rows(R), state }
import * as THREE from '../../../vendor/three/three.module.js';
import * as CK from '../../models/mech/controls.js';
import * as FK from '../../models/mech/fluid/index.js';
import { BAR, mains, overflowQ, rotameterFor } from '../../behaviors/land/mech/fluid.js';
import { T } from './lang.js';
import { createJet } from '../../render/fluid/liquid.js';
import { createFountain } from '../../behaviors/land/mech/fountain.js';

export function createFountainStation({ root, S, fmt, BED_TOP }) {
  const F = FK.fluidMaterials(), top = BED_TOP + 0.01, add = (o, x, y, z) => { o.position.set(x, y, z); root.add(o); return o; };
  const plate = new THREE.Mesh(new THREE.BoxGeometry(1.045, 0.01, 0.27), F.steel); plate.castShadow = plate.receiveShadow = true; add(plate, -3.1025, BED_TOP + 0.005, -0.175);
  const XF = -3.05, ZF = -0.18, tank = add(FK.waterTank({ L: 0.32, W: 0.22, H: 0.2 }), XF, top, ZF), tu = tank.userData;
  const pump = add(FK.centrifugalPump({ D2: 0.04, kW: 0.18 }), XF - 0.16 - 0.012 - 0.03 - 0.091, top, ZF), pu = pump.userData;
  const pIn = pu.portAt.in.clone().add(pump.position), pOut = pu.portAt.out.clone().add(pump.position);
  // ssanie: od pompy do ścianki zbiornika (przepust); tłoczenie: pion z zaworem zwrotnym, poziom z kulowym, łuk w górę, dysza
  root.add(FK.pipe({ points: [pIn, new THREE.Vector3(XF - 0.16, pIn.y, pIn.z)], d: 0.02, wall: 0.002 }));
  const d = 0.016, yH = top + 0.5, cvL = FK.checkValve({ dn: 15 }), cvLen = cvL.userData.L, yC = pOut.y + 0.03 + cvLen / 2;
  cvL.rotation.z = Math.PI / 2; add(cvL, pOut.x, yC, pOut.z);   // przepływ w górę (strzałka +x → +y)
  root.add(FK.pipe({ points: [pOut, new THREE.Vector3(pOut.x, yC - cvLen / 2, pOut.z)], d, wall: 0.0015 }));
  // przepływomierz (rotametr 0–12 l/min) na pionie nad zaworem zwrotnym
  const RM = rotameterFor(12 / 60000), rmScale = []; for (let i = 0; i <= 6; i++) rmScale.push([i * 2, RM.h(i * 2 / 60000)]);
  const rm = FK.rotameter({ L: RM.L, Df: RM.Df, scale: rmScale, Qmax: 12 }), yR = yC + cvLen / 2 + 0.035; add(rm, pOut.x, yR, pOut.z);
  root.add(FK.pipe({ points: [new THREE.Vector3(pOut.x, yC + cvLen / 2, pOut.z), new THREE.Vector3(pOut.x, yR, pOut.z)], d, wall: 0.0015 }));
  const bv = FK.ballValve({ dn: 15 }), bvL = bv.userData.L, xBV = XF - 0.14; add(bv, xBV, yH, pOut.z);
  root.add(FK.pipe({ points: [new THREE.Vector3(pOut.x, yR + rm.userData.H, pOut.z), new THREE.Vector3(pOut.x, yH, pOut.z), new THREE.Vector3(xBV - bvL / 2, yH, pOut.z)], d, wall: 0.0015, R: 0.03 }));
  const nzBase = new THREE.Vector3(XF, yH + 0.05, pOut.z);
  root.add(FK.pipe({ points: [new THREE.Vector3(xBV + bvL / 2, yH, pOut.z), new THREE.Vector3(XF, yH, pOut.z), nzBase], d, wall: 0.0015, R: 0.03 }));
  const nz = add(FK.nozzle({ d: 0.008 }), nzBase.x, nzBase.y, nzBase.z), yJet = nzBase.y + nz.userData.H;
  const s7 = add(CK.pushButton({ color: 'green', mode: 'latch', contact: 'NO', lit: true }), -3.53, top, -0.1), k7 = s7.userData.api;
  // strumień fontanny: ciągła struga, rozpad przy wierzchołku, krople i kręgi na wodzie (LiquidKit)
  const jet = createJet({ d: 0.008 }); jet.group.userData.doctorOk = 'clash'; root.add(jet.group);
  // przyłącze wodociągowe z reduktorem, kran nad zbiornikiem (dolewanie), przelew przez ściankę → wąż przezroczysty → wiadro
  const sup = add(FK.waterSupply({ kind: 'mains', pReg: 3 }), -2.81, top, -0.25), su = sup.userData, tapOut = su.outlet.clone().add(sup.position);
  const tapJet = createJet({ d: su.dSpout * 0.9 }); root.add(tapJet.group);
  const hO = 0.14, dO = 0.025, inH = tu.H - 0.006, area = tu.inner[0] * tu.inner[1], yFloor = top + 0.006;
  const ovA = new THREE.Vector3(-2.92, yFloor + hO + dO / 2, ZF - tu.W / 2);
  const bk = add(FK.bucket({ handleUp: false }), -2.68, top, -0.15), bu = bk.userData, hoseB = new THREE.Vector3(-2.68, top + bu.H + 0.035, -0.15);
  const ovHose = FK.clearHose({ a: ovA, da: [0, 0, -1], b: hoseB, db: [0, -1, 0], di: dO, wall: 0.003, reach: 0.07 }); root.add(ovHose);
  const ovJet = createJet({ d: dO * 0.7 }); root.add(ovJet.group);
  const fg = add(FK.floatGauge({ H: inH, R: 0.014, reach: 0.045 }), XF - 0.12, yFloor, ZF + 0.08);
  /* ---------------- logika ---------------- */
  const src = mains({ p0: 5 * BAR, d: 0.025, L: 15, pReg: 3 * BAR });
  let level = 0.6 * inH, tap = 0, inBucket = 0, metered = 0;
  const tapApi = { press: (n) => { if (n === 'tap') tap = tap >= 1 ? 0 : tap + 0.5; }, release() {}, drag() {}, tick() {} };
  const ft = createFountain({ D2: 0.04, nozzleD: 0.008, pipe: { d: 0.013, L: 1.0 }, lift: yJet - yFloor - level }), Fs = ft.state;
  let ang = 0, angT = 0, th = 0; const st = { Qin: 0, Qov: 0, level: 0 };
  const bvApi = { press: (n) => { if (n === 'valve') angT = angT >= Math.PI / 2 - 1e-3 ? 0 : angT + Math.PI / 4; }, release() {}, drag() {}, tick() {} };
  function step(dt) {
    const phy = S.mode === 'physics';
    if (phy) k7.tick(dt);
    ang += Math.max(-dt * 3, Math.min(dt * 3, angT - ang));
    // poziom w zbiorniku: dopływ z kranu, odpływ przelewem (pompa tylko krąży wodę)
    const u = phy ? tap : 0, Qin = src.Q(u), Qov = overflowQ(level - hO, dO);
    level = Math.max(0.02, Math.min(inH - 0.002, level + (Qin - Qov) * dt / area)); metered += Qin * dt;
    inBucket += Qov * dt; if (inBucket > bu.Vfull) inBucket = 0;   // pełne wiadro wylane
    let lo = 0, hi = 1; for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (bu.vol(m) < inBucket) lo = m; else hi = m; } bu.setLevel(lo);
    const yWater = yFloor + level; tu.setLevel(level / inH); fg.userData.setLevel(level); su.setTap(u); su.setMeter(metered);
    ft.step(dt, { motorOn: phy ? k7.pressed : true, valveAngle: phy ? ang : 0, lift: yJet - yWater });
    if (!phy) ang = 0;
    bv.userData.setAngle(ang); cvL.userData.setOpen(Math.min(1, Fs.Q * 60000 / 8)); rm.userData.setFloat(RM.h(Fs.Q));
    th += Fs.n * 2 * Math.PI / 60 * dt; pu.setAngle(th);
    jet.update(dt, { origin: new THREE.Vector3(nzBase.x, yJet, nzBase.z), dir: new THREE.Vector3(0, 1, 0), v: Fs.v, floorY: yWater, on: Fs.v > 0.05 });
    tapJet.update(dt, { origin: tapOut, dir: su.outletDir, v: Qin > 0 ? Math.max(0.3, Qin / (Math.PI * su.dSpout ** 2 / 4)) : 0, floorY: yWater, on: Qin > 0 });
    const vOv = Qov / (Math.PI * dO * dO / 4); ovHose.userData.setFlow(vOv * 3, Qov > 1e-7); ovHose.userData.tick(dt);   // przepływ niepełnym przekrojem — szybszy niż przy pełnym
    ovJet.update(dt, { origin: hoseB, dir: new THREE.Vector3(0, -1, 0), v: Math.max(0.3, vOv), floorY: top + 0.0055 + lo * (bu.H - 0.0155), on: Qov > 1e-7 });
    st.Qin = Qin; st.Qov = Qov; st.level = level;
    for (const e of list) { if (e.key === 'pump') { e.omega = Fs.n * 2 * Math.PI / 60; e.T = Fs.Tl; } }
  }
  function rows(R) {
    R.push(['Fontanna — pompa M4', `${fmt(Fs.n, 0)} obr/min · ${fmt(Fs.Q * 60000, 2)} l/min · wysokość ${fmt(Fs.H, 2)} m · moc ${fmt(Fs.P, 1)} W · sprawność ${fmt(Fs.eta * 100, 1)} %`]);
    R.push(['Fontanna — zbiornik', T(`poziom ${fmt(st.level * 1000, 0)} mm (krawędź przelewu ${fmt(hO * 1000, 0)} mm) · dopływ z kranu ${fmt(st.Qin * 60000, 2)} l/min · odpływ przelewem ${fmt(st.Qov * 60000, 2)} l/min · wiadro ${fmt(inBucket * 1000, 1)} l`, `level ${fmt(st.level * 1000, 0)} mm (overflow edge ${fmt(hO * 1000, 0)} mm) · tap inflow ${fmt(st.Qin * 60000, 2)} l/min · overflow ${fmt(st.Qov * 60000, 2)} l/min · bucket ${fmt(inBucket * 1000, 1)} l`) + (S.mode === 'physics' ? T(' — klik pokrętła kranu: 0 → ½ → pełny', ' — click the tap knob: 0 → ½ → full') : '')]);
    R.push(['Fontanna — strumień', `v ${fmt(Fs.v, 2)} m/s · wysokość ${fmt(Fs.h * 1000, 0)} mm · zawór kulowy ${fmt(ang * 180 / Math.PI, 0)}° · Re ${fmt(Fs.Re, 0)}${S.mode === 'physics' ? ' — zielony S7: pompa, klik dźwigni: zawór' : ''}`]);
  }
  const el0 = (key, id, name, group, props, ports) => ({ key, id, name, group, props, ports: ports.map(([pid, pn, kind]) => ({ id: pid, name: pn, kind })), theta: 0, omega: 0, T: 0, eta: 1, r: 0, dof: 'rot', clock: true });
  const list = [
    el0('tank', 'FT-tank', 'Zbiornik wody (akryl, 14 l)', tank, [['Poziom wody', '60 %']], [['out', 'Przepust ssawny', 'płyn']]),
    el0('pump', 'FT-pump', 'Pompa odśrodkowa M4 (wirnik Ø 40)', pump, [['Wysokość przy zamkniętym zaworze', `${fmt(ft.pump.H0, 2)} m`], ['Punkt najlepszej sprawności', `${fmt(ft.pump.Qb * 60000, 1)} l/min`]], [['in', 'Ssanie ← zbiornik', 'płyn'], ['out', 'Tłoczenie → zawór zwrotny', 'płyn']]),
    el0('check', 'FT-check', 'Zawór zwrotny DN 15 (pion)', cvL, [['Ciśnienie otwarcia', '0,05 bar']], [['a', 'Wlot (pompa)', 'płyn'], ['b', 'Wylot (w górę)', 'płyn']]),
    el0('ball', 'FT-ball', 'Zawór kulowy DN 15', bv, [['Obsługa', 'klik dźwigni: 0° → 45° → 90° → 0°']], [['a', 'Wlot', 'płyn'], ['b', 'Wylot → dysza', 'płyn']]),
    el0('nozzle', 'FT-nozzle', 'Dysza Ø 8 mm (pionowa)', nz, [['Współczynniki', 'Cd 0,9 · Cv 0,97']], [['in', 'Wlot', 'płyn'], ['jet', 'Strumień → zbiornik', 'płyn']]),
    el0('supply', 'FT-supply', 'Przyłącze wodociągowe z reduktorem (kran nad zbiornikiem)', sup, [['Ciśnienie w sieci', '5 bar'], ['Reduktor', 'nastawa 3 bar'], ['Wodomierz', 'skrzydełkowy, Q3 2,5 m³/h']], [['mains', 'Sieć wodociągowa', 'płyn'], ['out', 'Kran → zbiornik', 'płyn']]),
    el0('overflow', 'FT-overflow', 'Przelew Ø25 i wąż przezroczysty do wiadra', ovHose, [['Krawędź przelewu', '140 mm nad dnem'], ['Wydatek', 'przelew kołowy: Q = ⅔·Cd·π·d·√(2g)·h^1,5']], [['a', 'Przepust w ściance', 'płyn'], ['b', 'Wylot → wiadro', 'płyn']]),
    el0('flow', 'FT-flowmeter', 'Przepływomierz — rotametr 0–12 l/min (pion)', rm, [['Zasada', 'pływak w stożkowej rurce'], ['Spadek ciśnienia', `${fmt(RM.dp, 0)} Pa`]], [['in', 'Wlot (zawór zwrotny)', 'płyn'], ['out', 'Wylot → zawór kulowy', 'płyn']]),
    el0('float', 'FT-float', 'Wskaźnik poziomu z pływakiem', fg, [['Pływak', 'kula PP Ø 28, zanurzona ok. 40 %']], [['level', 'Poziom wody', 'płyn']]),
    el0('bucket', 'FT-bucket', 'Wiadro 10 l (odbiór przelewu)', bk, [['Pojemność', '10 l']], [['top', 'Otwór — wąż przelewowy', 'płyn']]),
    el0('s7', 'FT-button', 'Przycisk S7 (pompa, z podświetleniem)', s7, [['Styk', 'NO, z zatrzaskiem']], [['a', 'Zasilanie M4', 'prąd']]),
  ];
  for (const e of list) e.group.userData.el = e;
  return { parts: list, devices: [{ group: bv, api: bvApi }, { group: s7, api: k7 }, { group: sup, api: tapApi }], step, rows, state: { Fs, st } };
}
