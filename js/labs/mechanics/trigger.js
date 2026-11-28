// Laboratorium mechaniki — stanowisko wyzwalania na łożu (tryby Maszyna i Fizyka): dźwignia, sprężyna skrętna,
// zatrzask z wyzwalaczem, przekaźnik sygnałowy, akumulator.
//   G1 — akumulator 24 V (2 × 12 V AGM 7 Ah) zasila obwód sygnałowy
//   S4 — przycisk WYZWÓL → cewka przekaźnika K2 (24 V DC); styk K2 11–14 → elektromagnes Y1 → podnosi zapadkę
//   ramię (młotek) ze sprężyną skrętną uderza w zderzak; dźwignia (rodzaju 1, na sworzniu ramienia) napina je
//   z powrotem — zapadka wskakuje w zaczep i trzyma
// Fizyka: obwód prądu stałego (createCircuit), akumulator z OCV i rezystancją wewnętrzną (prąd z cewek), przekaźnik
// z czasami zadziałania, ramię — dynamika ze sprężyną i zapadką (behaviors/mech/latch.js). Maszyna: cykl kinematyczny.
// createTrigger(ctx) → { parts, devices, step(dt), rows(R), state }
import * as THREE from '../../../vendor/three/three.module.js';
import * as CK from '../../models/mech/controls.js';
import * as MC from '../../models/mech/mechanisms/index.js';
import * as RL from '../../models/mech/relays/index.js';
import * as PW from '../../models/mech/power/index.js';
import { materials } from '../../models/mech/common.js';
import { createCircuit } from '../../behaviors/land/mech/circuit.js';
import { createBattery } from '../../behaviors/land/mech/battery.js';
import { createRelay } from '../../behaviors/land/mech/relay.js';
import { createLatch } from '../../behaviors/land/mech/latch.js';

export function createTrigger({ root, S, fmt, BED_TOP }) {
  const M = materials(), X0 = -5.15, Z0 = 0.5;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.01, 0.3), M.steel); base.position.set(X0 + 0.1, BED_TOP + 0.005, Z0); base.castShadow = base.receiveShadow = true; root.add(base);
  const top = BED_TOP + 0.01;
  // zatrzask (płyta pionowa, front +z) z ramieniem; dźwignia współosiowo z ramieniem, przed sprężyną
  const lu = MC.latchUnit(); lu.position.set(X0, top + 0.115, Z0 - 0.08); root.add(lu);
  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.06), M.steel); brace.position.set(X0 + 0.04, top + 0.04, Z0 - 0.08 - 0.038); brace.castShadow = true; root.add(brace);   // wspornik płyty
  const lv = MC.lever({ a: 0.15, b: 0.07, cls: 1, bracket: false, pinLen: 0.03 }); lv.position.set(X0, top + 0.115, Z0 - 0.08 + 0.042); root.add(lv);
  const pinX = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.03, 16).rotateX(Math.PI / 2), M.steelP); pinX.position.set(X0, top + 0.115, Z0 - 0.08 + 0.04); pinX.userData.doctorOk = 'clash'; root.add(pinX);   // sworzeń przez oczko dźwigni   // przedłużenie sworznia ramienia pod dźwignię
  // akumulator, przekaźnik na szynie, przycisk
  const g1 = PW.battery({ chem: 'agm', series: 2, Ah: 7 }); g1.position.set(X0 + 0.27, top, Z0 + 0.03); root.add(g1);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.0075, 0.035), M.steel); rail.position.set(X0 + 0.12, top + 0.00375, Z0 + 0.06); root.add(rail);
  const k2 = RL.signalRelay(); k2.rotation.x = -Math.PI / 2; k2.position.set(X0 + 0.12, top + 0.0075, Z0 + 0.06 + 0.04); root.add(k2);   // gniazdo leży na szynie, front w górę
  const s4 = CK.pushButton({ color: 'yellow', mode: 'momentary', contact: 'NO' }); s4.position.set(X0 + 0.02, top, Z0 + 0.1); root.add(s4);
  const ka = s4.userData.api;
  // logika
  const bat = createBattery({ chem: 'agm', series: 2, Ah: 7, soc: 0.95 }), B = bat.state, rel = createRelay({ Un: 24 }), R = rel.state;
  const lt = createLatch({ k: 0.8, thz: 70 * Math.PI / 180 }), L = lt.state;
  const c = createCircuit(); let uBat = bat.U(0);
  c.source('G1', { P: [24, 0], N: [0, 0] }, () => !B.cut).wire('G1:P', 'S4:13', { name: 'G1 +' }).contact('S4:13', 'S4:14', () => ka.closed, 'S4').wire('S4:14', 'K2:A1', { name: 'S4 → K2' }).wire('K2:A2', 'G1:N', { name: 'K2 → G1 −' });
  c.wire('G1:P', 'K2:11', { name: 'G1 + → K2 11' }).contact('K2:11', 'K2:14', () => R.on, 'K2').wire('K2:14', 'Y1:1', { name: 'K2 14 → Y1' }).wire('Y1:2', 'G1:N', { name: 'Y1 → G1 −' });
  c.load('K2', ['K2:A1', 'K2:A2'], { Un: 24 }).load('Y1', ['Y1:1', 'Y1:2'], { Un: 24 });
  const RY = 24 * 24 / 20;   // elektromagnes 20 W
  let lev = -0.6, levT = 0, plg = 0, t = 0, cycle = 0;
  const lvApi = { press: (n) => { if (n === 'lever' && levT <= 0) levT = 1; }, release() {}, drag() {}, tick() {} };
  function step(dt) {
    t += dt;
    const phy = S.mode === 'physics';
    let uK = 0, uY = 0;
    if (phy) {
      ka.tick(dt);
      const r = c.solve(), k = uBat / 24; uK = r.U('K2') * k; uY = r.U('Y1') * k;   // napięcie akumulatora pod obciążeniem (z poprzedniej klatki)
      rel.tick(dt, uK);
      const I = uK / rel.Rc + uY / RY; bat.step(dt, I); uBat = B.U;
    } else {   // maszyna: cykl 5 s — napinanie (0–1 s), trzymanie, wyzwolenie w 3. sekundzie
      cycle = (cycle + dt) % 5; if (cycle < dt) levT = 1;
      uY = cycle > 3 && cycle < 3.2 ? 24 : 0; R.on = uY > 0;
    }
    // dźwignia: 0,5 s napinanie (do kąta napięcia + 5°), 0,5 s powrót (sprężyna powrotna dźwigni)
    if (levT > 0) { levT -= dt; const f = 1 - Math.max(0, levT); lev = f < 0.5 ? -0.6 + (70 * Math.PI / 180 + 0.09 + 0.6) * (f / 0.5) : 70 * Math.PI / 180 + 0.09 - (70 * Math.PI / 180 + 0.69) * ((f - 0.5) / 0.5); } else lev = -0.6;
    plg += ((uY >= 0.85 * 24 ? 1 : 0) - plg) * Math.min(1, dt / 0.015);
    const delta = (0.006 + 0.008) / 0.07;   // sworzeń dźwigni pod ramieniem (promień sworznia + pół grubości ramienia)
    lt.step(dt, { lift: plg > 0.5, push: lev + delta });
    lu.userData.pose(L.th, L.engaged ? 0 : plg, plg); lv.userData.setAngle(lev);
    k2.userData.setState(uK > 0.5 || (!phy && R.on), R.on);
    for (const e of list) { const v = e.key === 'lev' ? lev : e.key === 'arm' ? L.th : 0; e.omega = (v - e.theta) / Math.max(dt, 1e-6); e.theta = v; }
  }
  function rows(Rr) {
    const phy = S.mode === 'physics';
    Rr.push(['Stanowisko — zatrzask', `${L.engaged ? 'napięty (zapadka w zaczepie)' : L.th > -0.2 ? 'ramię w ruchu' : 'zwolniony'} · ramię ${fmt(L.th * 180 / Math.PI)}° · uderzenia ${L.hits} · energia uderzenia ${fmt(L.Ehit, 3)} J`]);
    if (phy) {
      Rr.push(['Stanowisko — akumulator G1', `${fmt(B.U, 2)} V · ${fmt(B.I, 2)} A · SoC ${fmt(B.soc * 100, 2)} %${B.cut ? ' · ODCIĘTY' : ''}`]);
      Rr.push(['Stanowisko — przekaźnik K2', `${R.phase} · cewka ${fmt(R.U, 1)} V, ${fmt(R.I * 1000, 1)} mA · elektromagnes Y1 ${plg > 0.5 ? 'wciągnięty' : 'zwolniony'} — przytrzymaj żółty S4 (WYZWÓL), klik dźwigni — napnij`]);
    }
  }
  const el0 = (key, id, name, group, props, ports) => ({ key, id, name, group, props, ports: ports.map(([pid, pn, kind]) => ({ id: pid, name: pn, kind })), theta: 0, omega: 0, T: 0, eta: 1, r: 0, dof: 'rot', clock: true });
  const list = [
    el0('lev', 'TR-lever', 'Dźwignia napinająca (rodzaju 1)', lv, [['Ramię siły / obciążenia', '150 mm / 70 mm (przełożenie 2,14 : 1)'], ['Siła na rączce przy napiętej sprężynie', `${fmt(Math.abs(0.8 * (70 * Math.PI / 180 + 0.3)) / 0.15, 1)} N`]], [['effort', 'Rączka (siła)', 'obrót'], ['load', 'Sworzeń — ramię zatrzasku', 'obrót']]),
    el0('arm', 'TR-latch', 'Zatrzask z wyzwalaczem i ramieniem', lu, [['Sprężyna skrętna', 'k = 0,8 N·m/rad, napięcie do 70°'], ['Siła na zapadce', `${fmt(lt.hold(), 1)} N`], ['Siła wyzwalania', `${fmt(lt.trigger(), 1)} N (elektromagnes Y1, 20 W)`], ['Energia sprężyny', `${fmt(lt.energy(), 3)} J`]], [['cock', 'Ramię — dźwignia', 'obrót'], ['trigger', 'Cewka Y1 24 V DC', 'prąd']]),
    el0('k2', 'TR-relay', 'Przekaźnik sygnałowy K2', k2, [['Cewka', `24 V DC, ${fmt(rel.Rc)} Ω`], ['Styk 11–14', '→ elektromagnes Y1']], [['coil', 'Cewka A1–A2 (z S4)', 'sygnał'], ['out', 'Styk 11–14 → Y1', 'prąd']]),
    el0('g1', 'TR-battery', 'Akumulator G1 (2 × 12 V AGM 7 Ah)', g1, [['Napięcie znamionowe', '24 V'], ['Rezystancja wewnętrzna', `${fmt(bat.R * 1000, 1)} mΩ`], ['Energia', `${fmt(bat.energy)} Wh`]], [['plus', 'Biegun + → S4, K2 11', 'prąd'], ['minus', 'Biegun − → K2 A2, Y1', 'prąd']]),
    el0('s4', 'TR-button', 'Przycisk S4 (WYZWÓL)', s4, [['Styk', 'NO 13–14, chwilowy']], [['a', 'Zacisk 13 (G1 +)', 'prąd'], ['b', 'Zacisk 14 (K2 A1)', 'prąd']]),
  ];
  for (const e of list) e.group.userData.el = e;
  return { parts: list, devices: [{ group: lv, api: lvApi }, { group: s4, api: ka }, { group: lu, api: { press: (n) => { if (n === 'cock') lvApi.press('lever'); }, release() {}, drag() {}, tick() {} } }], step, rows, state: { L, B, R } };
}
