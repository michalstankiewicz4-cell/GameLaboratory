// Ruch i sterowanie (kategoria 3) oraz optyka i sygnały (kategoria 5) — etap 3: czujniki (indukcyjny, enkoder,
// bariera optyczna), przekaźnik czasowy, regulator PID z obiektem (silnik z falownikiem), regulator odśrodkowy Watta.
// Przedmiot: { id, name, group, params, build(p) → { group, update(θ), tick?, info, live?, warn?, ports } } (opis w ../items.js).
import * as THREE from '../../../../vendor/three/three.module.js';
import * as MK from '../../../models/mech/mechkit.js';
import * as CK from '../../../models/mech/controls.js';
import * as SN from '../../../models/mech/sensors/index.js';
import * as RL from '../../../models/mech/relays/index.js';
import * as RG from '../../../models/mech/regulators/index.js';
import { materials as clockMats } from '../../../models/mech/common.js';
import { createInductive, createEncoder, createBarrier, TARGETS, profileRadius } from '../../../behaviors/land/mech/sensors.js';
import { createTimerRelay, FUNCTIONS } from '../../../behaviors/land/mech/timer-relay.js';
import { createPID } from '../../../behaviors/land/mech/pid.js';
import { createGovernor } from '../../../behaviors/land/mech/governor.js';
import { createRelay } from '../../../behaviors/land/mech/relay.js';
import { T } from '../lang.js';
import { TAU, mm, kg, P, num, portsOf } from './util.js';

// profil zarysu koła zębatego w funkcji kąta — do odległości czoła czujnika od zębów
function gearRadiusFn(z, m) { const o = MK.involuteOutline(z, m); return { fn: profileRadius(o.pts), ra: o.ra, rf: o.rf }; }
const onOff = (b) => (b ? T('24 V (wykryto)', '24 V (detected)') : '0 V');

export const SIGNALS = [
  {
    id: 'inductive', name: 'Czujnik indukcyjny', group: 'Czujniki',
    params: [
      { key: 'size', label: 'Rozmiar', type: 'select', options: [['M8', 'M8'], ['M12', 'M12'], ['M18', 'M18'], ['M30', 'M30']], def: 'M12' },
      { key: 'flush', label: 'Montaż równy z powierzchnią (flush)', type: 'check', def: true },
      { key: 'target', label: 'Materiał celu (koło)', type: 'select', options: Object.entries(TARGETS).map(([k, v]) => [k, v.name]), def: 'steel' },
      { key: 'gap', label: 'Odstęp od wierzchołków zębów', type: 'range', min: 0.0002, max: 0.012, step: 0.0001, unit: 'mm.1', def: 0.001 },
      { key: 'z', label: 'Liczba zębów koła', type: 'range', min: 10, max: 60, step: 1, def: 20 },
    ],
    build(p) {
      const s = SN.inductiveSensor({ size: p.size, flush: p.flush }), u = s.userData, gear = MK.gear({ z: p.z, m: 0.004, w: 0.03, mat: p.target === 'brass' ? 'brass' : p.target === 'aluminium' ? 'alu' : 'gear' }), G = gearRadiusFn(p.z, 0.004);
      const logic = createInductive({ size: p.size, flush: p.flush, target: p.target }), L = logic.state;
      const g = new THREE.Group(); gear.position.x = -0.015; g.add(gear); s.position.set(0, G.ra + p.gap, 0); g.add(s);
      let th = 0, prev = 0, dist = p.gap;
      const warn = [];
      if (p.gap > L.sr) warn.push(T(`Odstęp ${mm(p.gap, 1)} większy niż zasięg rzeczywisty ${mm(L.sr, 2)} — czujnik nie widzi zębów.`, `Gap ${mm(p.gap, 1)} larger than the real sensing range ${mm(L.sr, 2)} — the sensor does not see the teeth.`));
      if (p.gap + (G.ra - G.rf) < L.sr * 1.1) warn.push(T('Wręby za płytkie dla tego zasięgu — czujnik widzi koło cały czas (brak impulsów).', 'Tooth spaces too shallow for this range — the sensor sees the wheel all the time (no pulses).'));
      const live = () => [['Odległość czoła od zarysu', mm(dist, 2)], ['Wyjście (PNP NO)', onOff(L.on)], ['Impulsy', String(L.edges)], ['Częstotliwość impulsów', `${num(L.freq, 1)} Hz`], ['Obroty z impulsów', `${num(L.freq / p.z * 60, 1)} obr/min`]];
      return { group: g, rest: false, view: { yaw: 0.2, pitch: 0.25 }, live,
        update: (t) => { th = t; gear.userData.spin.rotation.x = t; },
        tick: (dt) => { const d = th - prev, n = Math.min(400, Math.max(1, Math.ceil(Math.abs(d) / (TAU / p.z / 8)))); for (let i = 1; i <= n; i++) { dist = s.position.y - G.fn(-(prev + d * i / n)); logic.update(dist, dt / n); } u.setOn(L.on); if (L.freq > u.fmax) warn.length < 3 && warn.push(T('Za szybko: częstotliwość powyżej granicznej czujnika.', 'Too fast: frequency above the sensor limit.')); prev = th; },
        warn,
        info: [['Zasięg znamionowy sn', mm(L.sn, 1)], ['Współczynnik materiału', `${num(TARGETS[p.target].k, 2)} (${TARGETS[p.target].name})`], ['Zasięg rzeczywisty sr', mm(L.sr, 2)], ['Histereza', '10 % (EN 60947-5-2)'], ['Częstotliwość przełączania maks.', `${num(u.fmax)} Hz`], ['Wyjście', 'PNP NO, 24 V DC, maks. 200 mA, dioda żółta'], ['Wysokość zęba', mm(G.ra - G.rf, 1)], ...live()],
        ports: portsOf(s) };
    },
  },
  {
    id: 'encoder', name: 'Enkoder inkrementalny', group: 'Czujniki',
    params: [{ key: 'ppr', label: 'Rozdzielczość', type: 'select', options: [[100, '100 imp/obr'], [360, '360 imp/obr'], [1024, '1024 imp/obr'], [2048, '2048 imp/obr'], [5000, '5000 imp/obr']], def: 1024 }],
    build(p) {
      const e = SN.encoder({ ppr: p.ppr }), u = e.userData, logic = createEncoder({ ppr: p.ppr }), L = logic.state, g = new THREE.Group(); g.add(e);
      const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 20).rotateZ(Math.PI / 2), clockMats().steelP); stub.position.x = -0.04; g.add(stub);
      let th = 0;
      const live = () => [['Kanał A / B / Z', `${L.A} / ${L.B} / ${L.Z}`], ['Licznik (×4)', String(L.count)], ['Kierunek', L.dir > 0 ? T('w przód (A wyprzedza B)', 'forward (A leads B)') : L.dir < 0 ? T('wstecz (B wyprzedza A)', 'reverse (B leads A)') : '—'], ['Obroty (okno 100 ms)', `${num(L.rpm, 1)} obr/min`], ['Częstotliwość A', `${num(L.f)} Hz`]];
      return { group: g, rest: false, view: { yaw: 0.9, pitch: 0.3 }, live,
        update: (t) => { th = t; u.setAngle(t); stub.rotation.x = t; }, tick: (dt) => logic.update(th, dt),
        info: [['Zasada', 'tarcza kodowa ze szkła, odczyt fotoelektryczny, dwa kanały przesunięte o 90°'], ['Rozdzielczość po zliczaniu ×4', `${num(p.ppr * 4)} stanów/obr = ${num(360 / p.ppr / 4, 4)}°`], ['Wyjście', 'HTL 24 V, push-pull, A B Z i negacje'], ['Częstotliwość maks.', '300 kHz'], ['Obroty maks.', '6000 obr/min (mechanicznie)'], ['Masa', kg(u.mass)], ...live()],
        ports: portsOf(e) };
    },
  },
  {
    id: 'barrier', name: 'Bariera optyczna', group: 'Czujniki',
    params: [{ key: 'span', label: 'Odległość nadajnik — odbiornik', type: 'range', min: 0.1, max: 0.6, step: 0.01, unit: 'mm', def: 0.24 }],
    build(p) {
      const b = SN.opticalBarrier({ span: p.span }), u = b.userData, logic = createBarrier({}), L = logic.state, g = new THREE.Group(); g.add(b);
      // obracająca się chorągiewka (blacha na wałku) przecina wiązkę
      const M = clockMats(), flag = new THREE.Group(); flag.position.set(p.span / 2, -0.06, 0); g.add(flag);
      flag.userData.doctorOk = 'floating';   // chorągiewka na wałku (wałek poza podglądem)
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.09, 0.03), M.steel); plate.position.y = 0.053; flag.add(plate);   // od piasty (r 8 mm)
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 20).rotateX(Math.PI / 2), M.steelP); flag.add(hub);
      const ray = new THREE.Raycaster(); let hit = null;
      const live = () => [['Wiązka', L.blocked ? T('przerwana', 'blocked') : T('wolna', 'clear')], ['Wyjście (załącza przy przerwaniu)', onOff(L.out)], ['Przerwania', String(L.count)]];
      return { group: g, rest: false, view: { yaw: 0.25, pitch: 0.2 }, live,
        update: (t) => { flag.rotation.z = -t; },
        tick: (dt) => { g.updateMatrixWorld(true); const a = b.localToWorld(u.beamFrom.clone()), c = b.localToWorld(u.beamTo.clone()); ray.set(a, c.clone().sub(a).normalize()); ray.far = a.distanceTo(c); hit = ray.intersectObject(plate, false)[0]; logic.update(!!hit, dt); u.setBeam(hit ? hit.distance + 0.0105 : null); },
        info: [['Światło', 'czerwone 660 nm, modulowane (odporne na światło otoczenia)'], ['Zasięg maks.', '10 m'], ['Czas odpowiedzi', '1 ms'], ['Wyjście', 'PNP, ciemno-załączające (24 V, gdy wiązka przerwana)'], ['Najmniejszy wykrywany przedmiot', 'Ø 12 mm (średnica soczewki)'], ...live()],
        ports: portsOf(b) };
    },
  },
  {
    id: 'timer', name: 'Przekaźnik czasowy', group: 'Przekaźniki',
    params: [
      { key: 'fn', label: 'Funkcja', type: 'select', options: Object.entries(FUNCTIONS), def: 'E' },
      { key: 'T', label: 'Czas', type: 'range', min: 0.1, max: 10, step: 0.1, unit: 's', def: 2 },
    ],
    build(p) {
      const r = RL.timerRelay({ fn: p.fn, T: p.T }), ra = r.userData.api, logic = createTimerRelay({ fn: p.fn, T: p.T, Un: 230 }), L = logic.state;
      const g = new THREE.Group(); g.add(r);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.0075), clockMats().steel); rail.position.set(0.03, 0.045, -0.002); g.add(rail);
      const bS = CK.pushButton({ color: 'green', mode: 'latch', contact: 'NO', lit: false }), bB = CK.pushButton({ color: 'black', mode: 'momentary', contact: 'NO' });
      for (const [btn, name, x] of [[bS, 'supply', 0.06], [bB, 'b1', 0.155]]) { btn.position.set(x, 0, 0.02); btn.userData.doctorOk = 'floating'; btn.traverse((o) => { if (o.userData.control) o.userData.control = name; }); g.add(btn); }   // puszki 70 mm z łapami — osobne urządzenia na stole, obok przekaźnika i obok siebie
      const api = { press: (n) => (n === 'supply' ? bS.userData.api.press('button') : n === 'b1' ? bB.userData.api.press('button') : ra.press(n)), release: (n) => (n === 'supply' ? bS.userData.api.release('button') : n === 'b1' ? bB.userData.api.release('button') : ra.release(n)), drag: (n, dy) => ra.drag(n, dy), tick: (dt) => { bS.userData.api.tick(dt); bB.userData.api.tick(dt); } };
      const live = () => [['Funkcja (pokrętło)', `${L.fn} — ${FUNCTIONS[L.fn]}`], ['Czas (pokrętło)', `${num(L.T, 1)} s`], ['Zasilanie A1–A2', L.powered ? '230 V' : '0 V'], ['Wejście B1', L.b1 ? '230 V' : '0 V'], ['Stan', L.phase], ['Pozostało', `${num(logic.remaining(), 1)} s`], ['Styk 15–18', L.closed ? T('zamknięty', 'closed') : T('otwarty', 'open')]];
      return { group: g, controls: true, api, rest: true, view: { yaw: 0.2, pitch: 0.2 }, live, update() {},
        tick: (dt) => { api.tick(dt); if (ra.fn !== L.fn || Math.abs(ra.T - L.T) > 1e-6) { L.fn = ra.fn; L.T = ra.T; } logic.tick(dt, bS.userData.api.closed ? 230 : 0, bB.userData.api.closed); r.userData.setLeds(L.powered, L.closed); },
        info: [['Obsługa', 'zielony przycisk — zasilanie A1–A2, czarny — wejście B1; klik pokrętła funkcji — następna, przeciąganie pokrętła czasu'], ['Zakres czasu', '0,1–10 s'], ['Dokładność powtarzania', '±0,2 %'], ['Styk', '1 przełączny 16 A / 250 V AC'], ['Szerokość', '17,5 mm (1 moduł)'], ...live()],
        ports: [P('coil', 'Zasilanie A1–A2', 'prąd'), P('b1', 'Wejście sterujące B1', 'sygnał'), P('out', 'Styk 15–16 / 15–18', 'prąd'), P('rail', 'Szyna DIN 35 mm (mocowanie)', 'mocowanie')] };
    },
  },
  {
    id: 'relay', name: 'Przekaźnik sygnałowy', group: 'Przekaźniki',
    params: [{ key: 'U', label: 'Napięcie zasilania cewki', type: 'range', min: 0, max: 30, step: 0.5, unit: 'V', def: 24 }],
    build(p) {
      const r = RL.signalRelay(), logic = createRelay({ Un: 24 }), L = logic.state, g = new THREE.Group(); g.add(r);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, 0.0075), clockMats().steel); rail.position.set(0.02, 0.04, -0.004); g.add(rail);
      const btn = CK.pushButton({ color: 'black', mode: 'momentary', contact: 'NO' }); btn.position.set(0.06, 0, 0.02); btn.userData.doctorOk = 'floating'; btn.traverse((o) => { if (o.userData.control) o.userData.control = 'coil'; }); g.add(btn);   // puszka z łapą obok gniazda — osobne urządzenie na stole
      const api = { press: (n) => (n === 'coil' || n === 'test') && btn.userData.api.press('button'), release: (n) => (n === 'coil' || n === 'test') && btn.userData.api.release('button'), drag() {}, tick: (dt) => btn.userData.api.tick(dt) };
      const warn = [];
      if (p.U < 0.7 * 24) warn.push(T(`Napięcie ${num(p.U, 1)} V poniżej napięcia zadziałania ${num(0.7 * 24, 1)} V — przekaźnik nie zadziała.`, `Voltage ${num(p.U, 1)} V below the pick-up voltage ${num(0.7 * 24, 1)} V — the relay will not operate.`));
      if (p.U > 1.1 * 24) warn.push(T('Napięcie powyżej 110 % znamionowego — cewka się przegrzeje.', 'Voltage above 110 % of rated — the coil will overheat.'));
      const live = () => [['Napięcie na cewce', `${num(L.U, 1)} V`], ['Prąd cewki', `${num(L.I * 1000, 1)} mA`], ['Stan', L.phase], ['Liczba zadziałań', String(L.ops)]];
      return { group: g, controls: true, api, rest: true, view: { yaw: 0.25, pitch: 0.2 }, live, update() {},
        tick: (dt) => { api.tick(dt); logic.tick(dt, btn.userData.api.closed ? p.U : 0); r.userData.setState(L.U > 0.1, L.on); },
        info: [['Obsługa', 'przytrzymaj przycisk — napięcie na cewkę'], ['Cewka', `24 V DC, ${num(logic.Rc)} Ω, ${num(logic.P, 2)} W`], ['Zadziałanie / odpadanie', '≥ 70 % / ≤ 10 % Un'], ['Czas zadziałania / odpadania', '8 ms / 4 ms'], ['Styk', '1 przełączny, 6 A / 250 V AC, złocony (sygnały)'], ['Trwałość mechaniczna', '10 mln zadziałań'], ...live()],
        ports: portsOf(r) };
    },
  },
  {
    id: 'pid', name: 'Regulator PID', group: 'Regulatory',
    params: [
      { key: 'Kp', label: 'Wzmocnienie Kp', type: 'range', min: 0.0005, max: 0.03, step: 0.0005, unit: 'V/(obr/min)', def: 0.004 },
      { key: 'Ti', label: 'Czas zdwojenia Ti', type: 'range', min: 0.1, max: 10, step: 0.1, unit: 's', def: 1.2 },
      { key: 'Td', label: 'Czas wyprzedzenia Td', type: 'range', min: 0, max: 1, step: 0.01, unit: 's', def: 0 },
      { key: 'load', label: 'Obciążenie silnika (obiekt)', type: 'range', min: 0, max: 7, step: 0.1, unit: 'N·m', def: 3 },
    ],
    build(p) {
      const c = RG.pidController(), pid = createPID({ Kp: p.Kp, Ti: p.Ti, Td: p.Td, sv: 1200 }), S = pid.state, g = new THREE.Group(); g.add(c);
      // płyta z wycięciem 45,5 × 45,5 mm (DIN 43700) — korpus przechodzi przez otwór, ramka przylega z przodu
      const ps = new THREE.Shape(); ps.moveTo(-0.05, -0.05); ps.lineTo(0.05, -0.05); ps.lineTo(0.05, 0.05); ps.lineTo(-0.05, 0.05); ps.closePath();
      const ph = new THREE.Path(); ph.moveTo(-0.02275, -0.02275); ph.lineTo(-0.02275, 0.02275); ph.lineTo(0.02275, 0.02275); ph.lineTo(0.02275, -0.02275); ph.closePath(); ps.holes.push(ph);
      const panel = new THREE.Mesh(new THREE.ExtrudeGeometry(ps, { depth: 0.003, bevelEnabled: false }).translate(0, 0, -0.003), clockMats().paintGrey); g.add(panel);
      // obiekt: falownik (rampa 10 Hz/s, 0–10 V → 0–50 Hz) i silnik 4-biegunowy 1,1 kW (poślizg proporcjonalny do momentu, stała czasowa 0,25 s)
      const plant = { f: 0, n: 0 };
      S.auto = true; S.manual = 4;
      const api = { press: (n) => { if (n === 'am') S.auto = !S.auto; if (n === 'up') S.sv = Math.min(1500, S.sv + 50); if (n === 'down') S.sv = Math.max(0, S.sv - 50); if (n === 'up' && !S.auto) S.manual = Math.min(10, S.manual + 0.5); if (n === 'down' && !S.auto) S.manual = Math.max(0, S.manual - 0.5); }, release() {}, drag() {}, tick() {} };
      const live = () => [['Tryb', S.auto ? T('automatyczny (A)', 'automatic (A)') : T('ręczny (M)', 'manual (M)')], ['Zadana SV', `${num(S.sv)} obr/min`], ['Mierzona PV', `${num(S.pv)} obr/min`], ['Uchyb e', `${num(S.e, 1)} obr/min`], ['Wyjście (do falownika AI)', `${num(S.out, 2)} V → ${num(S.out * 5, 1)} Hz`], ['Człony P / I / D', `${num(S.P, 2)} / ${num(S.I, 2)} / ${num(S.D, 2)} V`], ['Częstotliwość falownika', `${num(plant.f, 1)} Hz`]];
      return { group: g, controls: true, api, rest: false, view: { yaw: 0, pitch: 0.05 }, live, update() {},
        tick: (dt) => {
          const fref = S.out * 5; plant.f += Math.max(-10 * dt, Math.min(10 * dt, fref - plant.f));
          const nTarget = Math.max(0, plant.f * 30 - p.load / 7.4 * 50); plant.n += (nTarget - plant.n) * Math.min(1, dt / 0.25);
          pid.step(plant.n, dt); c.userData.show(S.pv, S.sv, S.out, S.auto);
        },
        info: [['Obsługa', 'A/M — tryb, ▲ ▼ — zadana (automatyczny) albo wyjście (ręczny)'], ['Algorytm', 'PID równoległy, różniczkowanie wartości mierzonej z filtrem, całkowanie warunkowe (anti-windup), przejście bezuderzeniowe'], ['Obiekt', 'falownik (rampa 10 Hz/s) + silnik 1,1 kW 4-biegunowy (poślizg 50 obr/min przy 7,4 N·m)'], ...live()],
        ports: portsOf(c) };
    },
  },
  {
    id: 'governor', name: 'Regulator odśrodkowy Watta', group: 'Regulatory',
    params: [
      { key: 'n', label: 'Prędkość wrzeciona', type: 'range', min: 0, max: 300, step: 5, unit: 'obr/min', def: 140 },
      { key: 'L', label: 'Długość ramion', type: 'range', min: 0.06, max: 0.2, step: 0.005, unit: 'mm', def: 0.12 },
    ],
    build(p) {
      const gv = RG.governor({ L: p.L, a: p.L / 2, l: p.L / 2 }), u = gv.userData, dyn = createGovernor({ L: p.L, a: p.L / 2, l: p.L / 2 }), D = dyn.state, g = new THREE.Group(); g.add(gv);
      let th = 0;
      const w = p.n * TAU / 60, n0 = dyn.omega0 * 60 / TAU;
      const live = () => [['Kąt ramion φ', `${num(D.phi * 180 / Math.PI, 1)}°`], ['Promień kul', mm(p.L * Math.sin(D.phi), 0)], ['Podniesienie tulei', mm(D.lift, 1)], ['Siła odśrodkowa na kulę', `${num(u.ballMass * w * w * p.L * Math.sin(D.phi), 1)} N`]];
      return { group: g, rest: true, view: { yaw: 0.4, pitch: 0.2 }, live,
        update: () => {}, tick: (dt) => { th += w * dt; dyn.step(w, dt); u.pose(D.phi, th); },
        info: [['Zasada', 'wahadło stożkowe: cos φ = g / (ω²·L) — im szybciej, tym wyżej kule i tuleja (przymyka przepustnicę)'], ['Prędkość progowa ω₀ = √(g/L)', `${num(n0)} obr/min (poniżej kule wiszą)`], ['Kąt w równowadze', `${num(dyn.equilibrium(w) * 180 / Math.PI, 1)}°`], ['Masa kuli', kg(u.ballMass)], ...live()],
        ports: portsOf(gv) };
    },
  },
];
