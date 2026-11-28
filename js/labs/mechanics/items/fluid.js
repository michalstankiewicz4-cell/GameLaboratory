// Przepływ i transport (kategoria 4) oraz pomiar ciśnienia (kategoria 5): rury i węże, pompy (zębata, tłokowa,
// odśrodkowa), zawory (kulowy, zwrotny, dławiący, bezpieczeństwa), rozdzielacz 4/3, siłownik, zbiornik, akumulator
// pęcherzowy, dysza, przenośnik taśmowy, manometr, przetwornik ciśnienia. Obliczenia: js/behaviors/land/mech/fluid.js.
// Przedmiot: { id, name, group, params, build(p) → { group, update(θ), tick?, info, live?, warn?, ports } } (opis w ../items.js).
import * as THREE from '../../../../vendor/three/three.module.js';
import * as FK from '../../../models/mech/fluid/index.js';
import * as FL from '../../../behaviors/land/mech/fluid.js';
import { createConveyor } from '../../../behaviors/land/mech/conveyor.js';
import { createJet } from '../../../render/fluid/liquid.js';
import { T } from '../lang.js';
import { mm, kg, num, portsOf } from './util.js';

const { BAR, G, FLUIDS } = FL;
const lpm = (Q) => `${num(Q * 60000, 2)} l/min`, bar = (p, d = 2) => `${num(p / BAR, d)} bar`, W = (P) => `${num(P, P < 10 ? 2 : 0)} W`;
const FLUID_OPT = [['oil', 'olej hydrauliczny HLP 46'], ['water', 'woda']];
const REGIME = { laminar: ['laminarny', 'laminar'], turbulent: ['burzliwy', 'turbulent'], transition: ['przejściowy', 'transitional'] };
const reg = (r) => T(...REGIME[r]);

export const FLUID = [
  /* ---------------- rury i węże ---------------- */
  {
    id: 'pipe', name: 'Rura', group: 'Rury i węże',
    params: [
      { key: 'd', label: 'Średnica zewnętrzna', type: 'select', options: [[0.008, '8 × 1'], [0.01, '10 × 1,5'], [0.012, '12 × 1,5'], [0.016, '16 × 2'], [0.02, '20 × 2'], [0.025, '25 × 3']], def: 0.012 },
      { key: 'L', label: 'Długość', type: 'range', min: 0.5, max: 30, step: 0.5, unit: 'm', def: 3 },
      { key: 'Q', label: 'Przepływ', type: 'range', min: 1, max: 120, step: 1, unit: 'l/min', def: 20 },
      { key: 'fluid', label: 'Ciecz', type: 'select', options: FLUID_OPT, def: 'oil' },
      { key: 'T', label: 'Temperatura', type: 'range', min: 0, max: 80, step: 5, unit: '°C', def: 40 },
    ],
    build(p) {
      const wall = { 0.008: 0.001, 0.01: 0.0015, 0.012: 0.0015, 0.016: 0.002, 0.02: 0.002, 0.025: 0.003 }[p.d] || 0.0015, di = p.d - 2 * wall, fl = FLUIDS[p.fluid], Q = p.Q / 60000;
      const pts = [[-0.16, 0, 0], [0.02, 0, 0], [0.02, 0.1, 0], [0.16, 0.1, 0]];
      const P = FK.pipe({ points: pts, d: p.d, wall }), g = new THREE.Group(); g.add(P);
      const r = FL.pipe(Q, { d: di, L: p.L, fluid: fl, T: p.T }), r1 = FL.pipe(Q, { d: di, L: 1, fluid: fl, T: p.T });
      const lim = p.fluid === 'oil' ? 5 : 2, warn = [];
      if (r.v > lim) warn.push(T(`Prędkość ${num(r.v, 2)} m/s powyżej zalecanej ${lim} m/s — hałas, straty, uderzenia ciśnienia.`, `Speed ${num(r.v, 2)} m/s above the recommended ${lim} m/s — noise, losses, pressure surges.`));
      return { group: g, rest: false, view: { yaw: 0.3, pitch: 0.25 }, warn, update() {},
        info: [['Średnica wewnętrzna', mm(di, 1)], ['Prędkość średnia v = Q / A', `${num(r.v, 2)} m/s`], ['Lepkość kinematyczna', `${num(r.nu * 1e6, 2)} mm²/s`], ['Liczba Reynoldsa Re = v·d / ν', num(r.Re)], ['Przepływ', reg(r.regime)],
          ['Współczynnik tarcia λ', num(r.f, 4)], ['Spadek ciśnienia Δp = λ·L/d·ρv²/2', bar(r.dp)], ['Spadek na metr', bar(r1.dp, 3)], ['Strata mocy Δp·Q', W(r.dp * Q)], ['Zalecane prędkości (olej)', T('ssanie 0,5–1,5 · powrót 2–3 · tłoczenie 3–5 m/s', 'suction 0.5–1.5 · return 2–3 · pressure 3–5 m/s')], ['Masa (1 m)', kg(P.userData.mass / P.userData.L)]],
        ports: portsOf(P) };
    },
  },
  {
    id: 'hose', name: 'Wąż hydrauliczny', group: 'Rury i węże',
    params: [
      { key: 'dn', label: 'Średnica wewnętrzna DN', type: 'select', options: [[6, 'DN 6 (1/4")'], [8, 'DN 8 (5/16")'], [10, 'DN 10 (3/8")'], [12, 'DN 12 (1/2")'], [16, 'DN 16 (5/8")']], def: 10 },
      { key: 'std', label: 'Typ (EN 853)', type: 'select', options: [['1SN', '1SN — jeden oplot stalowy'], ['2SN', '2SN — dwa oploty stalowe']], def: '2SN' },
      { key: 'p', label: 'Ciśnienie robocze', type: 'range', min: 10, max: 400, step: 10, unit: 'bar', def: 160 },
      { key: 'Q', label: 'Przepływ', type: 'range', min: 1, max: 100, step: 1, unit: 'l/min', def: 20 },
      { key: 'L', label: 'Długość', type: 'range', min: 0.3, max: 10, step: 0.1, unit: 'm', def: 1 },
    ],
    build(p) {
      const tab = { 6: [225, 400, 0.0134, 0.1, 0.1], 8: [215, 350, 0.0152, 0.115, 0.115], 10: [180, 330, 0.0176, 0.13, 0.13], 12: [160, 275, 0.0208, 0.18, 0.18], 16: [130, 250, 0.0239, 0.2, 0.2] }[p.dn];
      const rated = (p.std === '1SN' ? tab[0] : tab[1]) * BAR, od = tab[2] + (p.std === '2SN' ? 0.002 : 0), bend = p.std === '2SN' ? tab[4] : tab[3] * 0.9, di = p.dn / 1000, Q = p.Q / 60000;
      const H = FK.hose({ a: [-0.14, 0, 0], da: [1, 0, 0], b: [0.14, 0.06, 0], db: [1, 0, 0], d: od, di, bendR: bend * 0.5 }), g = new THREE.Group(); g.add(H);
      const r = FL.pipe(Q, { d: di, L: p.L, eps: 0.0016e-3, fluid: FLUIDS.oil });
      const warn = [];
      if (p.p * BAR > rated) warn.push(T(`Ciśnienie ${p.p} bar powyżej dopuszczalnego ${num(rated / BAR)} bar dla ${p.std} DN ${p.dn}.`, `Pressure ${p.p} bar above the allowed ${num(rated / BAR)} bar for ${p.std} DN ${p.dn}.`));
      if (r.v > 5) warn.push(T(`Prędkość ${num(r.v, 2)} m/s — za mały przekrój węża.`, `Speed ${num(r.v, 2)} m/s — hose bore too small.`));
      return { group: g, rest: false, view: { yaw: 0.2, pitch: 0.3 }, warn, update() {},
        info: [['Ciśnienie dopuszczalne', bar(rated, 0)], ['Ciśnienie rozrywające (4 × dop.)', bar(4 * rated, 0)], ['Średnica zewnętrzna', mm(od, 1)], ['Najmniejszy promień gięcia', mm(bend, 0)], ['Prędkość v', `${num(r.v, 2)} m/s`], ['Liczba Reynoldsa', num(r.Re)], ['Przepływ', reg(r.regime)], ['Spadek ciśnienia', bar(r.dp, 3)], ['Zakuwki', T('nakrętka DKOL + tulejka karbowana', 'DKOL nut + crimped ferrule')]],
        ports: portsOf(H) };
    },
  },
  {
    id: 'clearHose', name: 'Wąż przezroczysty', group: 'Rury i węże',
    params: [
      { key: 'di', label: 'Średnica wewnętrzna', type: 'select', options: [[0.006, '6 × 2'], [0.01, '10 × 3'], [0.013, '13 × 3'], [0.019, '19 × 3,5']], def: 0.013 },
      { key: 'L', label: 'Długość', type: 'range', min: 0.2, max: 10, step: 0.1, unit: 'm', def: 1 },
      { key: 'Q', label: 'Przepływ', type: 'range', min: 0, max: 40, step: 0.5, unit: 'l/min', def: 4 },
      { key: 'fluid', label: 'Ciecz', type: 'select', options: FLUID_OPT, def: 'water' },
      { key: 'full', label: 'Wypełniony cieczą', type: 'check', def: true },
    ],
    build(p) {
      const wall = p.di < 0.008 ? 0.002 : p.di > 0.015 ? 0.0035 : 0.003;
      const H = FK.clearHose({ a: [-0.15, 0, 0], da: [1, 0, 0], b: [0.15, 0.04, 0], db: [1, 0, 0], di: p.di, wall, fluid: p.fluid }), u = H.userData, g = new THREE.Group(); g.add(H);
      const Q = p.Q / 60000, fl = FLUIDS[p.fluid], r = FL.pipe(Q, { d: p.di, L: p.L, eps: 0.0015e-3, fluid: fl, T: 20 }), pmax = { 0.006: 12, 0.01: 10, 0.013: 8, 0.019: 6 }[p.di] || 8;
      u.setFlow(p.full ? r.v : 0, p.full);
      const warn = r.v > 3 ? [T(`Prędkość ${num(r.v, 2)} m/s — wąż PCV na małe ciśnienia, za mały przekrój.`, `Speed ${num(r.v, 2)} m/s — low-pressure PVC hose, bore too small.`)] : [];
      return { group: g, rest: false, view: { yaw: 0.15, pitch: 0.3 }, warn, update() {}, tick: (dt) => u.tick(dt),
        info: [['Prędkość cieczy (pęcherzyki płyną z nią)', `${num(r.v, 3)} m/s`], ['Liczba Reynoldsa', num(r.Re)], ['Przepływ', reg(r.regime)], ['Spadek ciśnienia', bar(r.dp, 3)], ['Ciśnienie robocze (20 °C)', `${pmax} bar`], ['Ścianka', T('PCV z oplotem poliestrowym, przezroczysta', 'PVC with polyester braid, transparent')], ['Połączenia', T('króćce z karbami, opaski ślimakowe', 'hose barbs, worm-drive clamps')], ['Masa (1 m)', kg(u.mass / u.L)]],
        ports: portsOf(H) };
    },
  },
  /* ---------------- pompy ---------------- */
  {
    id: 'gearPump', name: 'Pompa zębata', group: 'Pompy',
    params: [
      { key: 'z', label: 'Liczba zębów', type: 'range', min: 8, max: 16, step: 1, def: 10 },
      { key: 'm', label: 'Moduł', type: 'select', options: [[0.0015, '1,5 mm'], [0.002, '2 mm'], [0.0025, '2,5 mm'], [0.003, '3 mm']], def: 0.002 },
      { key: 'b', label: 'Szerokość kół', type: 'range', min: 0.006, max: 0.03, step: 0.001, unit: 'mm', def: 0.008 },
      { key: 'n', label: 'Prędkość obrotowa', type: 'range', min: 500, max: 3000, step: 50, unit: 'obr/min', def: 1450 },
      { key: 'p', label: 'Ciśnienie tłoczenia', type: 'range', min: 0, max: 250, step: 5, unit: 'bar', def: 100 },
      { key: 'cut', label: 'Przekrój (korpus przezroczysty)', type: 'check', def: true },
    ],
    build(p) {
      const M = FK.gearPump({ m: p.m, z: p.z, b: p.b, cut: p.cut }), u = M.userData, g = new THREE.Group(); g.add(M);
      const P = FL.gearPump({ m: p.m, z: p.z, b: p.b }), dp = p.p * BAR, Qt = P.Vg * p.n / 60, Q = P.Q(p.n, dp), Tq = P.T(dp), Pin = Tq * p.n * 2 * Math.PI / 60;
      return { group: g, rest: false, view: { yaw: 0.6, pitch: 0.25 }, update: (t) => u.setAngle(t),
        info: [['Objętość robocza Vg ≈ 2π·m²·z·b', `${num(P.Vg * 1e6, 2)} cm³/obr`], ['Wydajność teoretyczna Vg·n', lpm(Qt)], ['Wydajność rzeczywista (przecieki ∝ Δp)', lpm(Q)], ['Sprawność objętościowa ηv', `${num(Q / Qt * 100, 1)} %`],
          ['Moment na wale Vg·Δp / (2π·ηhm)', `${num(Tq, 2)} N·m`], ['Moc na wale', W(Pin)], ['Moc hydrauliczna Δp·Q', W(dp * Q)], ['Sprawność całkowita', `${num(Pin > 0 ? dp * Q / Pin * 100 : 0, 1)} %`], ['Częstotliwość pulsacji z·n / 60', `${num(p.z * p.n / 60)} Hz`], ['Masa', kg(u.mass)]],
        ports: portsOf(M) };
    },
  },
  {
    id: 'pistonPump', name: 'Pompa tłokowa', group: 'Pompy',
    params: [
      { key: 'z', label: 'Liczba tłoczków', type: 'range', min: 1, max: 5, step: 1, def: 3 },
      { key: 'D', label: 'Średnica tłoczka', type: 'range', min: 0.008, max: 0.025, step: 0.001, unit: 'mm', def: 0.012 },
      { key: 's', label: 'Skok', type: 'range', min: 0.006, max: 0.02, step: 0.001, unit: 'mm', def: 0.012 },
      { key: 'n', label: 'Prędkość obrotowa', type: 'range', min: 100, max: 1500, step: 50, unit: 'obr/min', def: 900 },
      { key: 'p', label: 'Ciśnienie tłoczenia', type: 'range', min: 0, max: 300, step: 10, unit: 'bar', def: 150 },
      { key: 'cut', label: 'Przekrój (skrzynia przezroczysta)', type: 'check', def: true },
    ],
    build(p) {
      const M = FK.pistonPump({ D: p.D, s: p.s, z: p.z, cut: p.cut }), u = M.userData, g = new THREE.Group(); g.add(M);
      const P = FL.pistonPump({ D: p.D, s: p.s, z: p.z }), dp = p.p * BAR, Q = P.Q(p.n), Tq = P.T(dp);
      let th = 0; const w = p.n * 2 * Math.PI / 60;
      const live = () => [['Wydajność chwilowa', lpm(P.inst(th, w))]];
      return { group: g, rest: true, view: { yaw: 0.5, pitch: 0.2 }, live, update: (t) => { th = t; u.setAngle(t); },
        info: [['Objętość robocza z·A·s', `${num(P.Vg * 1e6, 2)} cm³/obr`], ['Wydajność średnia', lpm(Q)], ['Nierównomierność wydajności', `${num(P.ripple * 100, 1)} % (${p.z} ${T('tłoczki', 'plungers')})`], ['Moment na wale', `${num(Tq, 2)} N·m`], ['Moc na wale', W(Tq * w)], ['Siła na tłoczku p·A', `${num(dp * P.A, 0)} N`], ['Masa', kg(u.mass)], ...live()],
        ports: portsOf(M) };
    },
  },
  {
    id: 'centrifugal', name: 'Pompa odśrodkowa', group: 'Pompy',
    params: [
      { key: 'D2', label: 'Średnica wirnika', type: 'range', min: 0.03, max: 0.12, step: 0.005, unit: 'mm', def: 0.04 },
      { key: 'n', label: 'Prędkość obrotowa', type: 'range', min: 1000, max: 3000, step: 50, unit: 'obr/min', def: 2850 },
      { key: 'Hst', label: 'Wysokość podnoszenia instalacji (statyczna)', type: 'range', min: 0, max: 15, step: 0.1, unit: 'm', def: 0.5 },
      { key: 'k', label: 'Opory instalacji (otwarcie zaworu)', type: 'range', min: 5, max: 100, step: 5, unit: '%', def: 60 },
      { key: 'cut', label: 'Przekrój (spirala przezroczysta)', type: 'check', def: true },
    ],
    build(p) {
      const M = FK.centrifugalPump({ D2: p.D2, cut: p.cut }), u = M.userData, g = new THREE.Group(); g.add(M);
      const P = FL.centrifugal({ D2: p.D2, etaMax: 0.35 + 0.3 * Math.min(1, (p.D2 - 0.03) / 0.09) });
      const kSys = P.H0 / (P.Qb * P.Qb) * 0.4 / (p.k / 100) ** 2;                        // krzywa instalacji H = Hst + k·Q²
      const op = FL.operatingPoint(P, p.n, p.Hst, (Q) => kSys * Q * Q), eta = op.Q > 0 ? P.eta(op.Q, p.n) : 0, Pw = op.Q > 0 ? P.P(op.Q, p.n) : 0;
      const warn = op.Q <= 0 ? [T('Pompa nie pokona wysokości statycznej — przepływ zero (praca na zamkniętym zaworze grzeje wodę).', 'The pump cannot overcome the static head — zero flow (running against a closed valve heats the water).')] : [];
      return { group: g, rest: true, view: { yaw: 0.9, pitch: 0.2 }, warn, update: (t) => u.setAngle(t * 4),
        info: [['Prędkość obwodowa wirnika u₂', `${num(P.u2 * p.n / P.n0, 2)} m/s`], ['Wysokość przy zamkniętym zaworze H₀', `${num(P.H0 * (p.n / P.n0) ** 2, 2)} m`], ['Punkt najlepszej sprawności', `${lpm(P.Qb * p.n / P.n0)} · ${num(P.Hb * (p.n / P.n0) ** 2, 2)} m`],
          ['Punkt pracy — przepływ', lpm(op.Q)], ['Punkt pracy — wysokość', `${num(op.H, 2)} m (${bar(op.H * 998 * G, 3)})`], ['Sprawność', `${num(eta * 100, 1)} %`], ['Moc na wale', W(Pw)],
          ['Prawa podobieństwa', T('Q ~ n, H ~ n², P ~ n³', 'Q ~ n, H ~ n², P ~ n³')], ['Masa', kg(u.mass)]],
        ports: portsOf(M) };
    },
  },
  /* ---------------- zawory ---------------- */
  {
    id: 'ballValve', name: 'Zawór kulowy', group: 'Zawory',
    params: [
      { key: 'dn', label: 'Średnica nominalna', type: 'select', options: [[10, 'DN 10 (3/8")'], [15, 'DN 15 (1/2")'], [20, 'DN 20 (3/4")'], [25, 'DN 25 (1")']], def: 15 },
      { key: 'ang', label: 'Kąt dźwigni', type: 'range', min: 0, max: 90, step: 5, unit: '°', def: 30 },
      { key: 'dp', label: 'Różnica ciśnień', type: 'range', min: 0.1, max: 6, step: 0.1, unit: 'bar', def: 1 },
      { key: 'cut', label: 'Przekrój (korpus przezroczysty)', type: 'check', def: false },
    ],
    build(p) {
      const M = FK.ballValve({ dn: p.dn, cut: p.cut }), u = M.userData, g = new THREE.Group(); g.add(M);
      const d = p.dn / 1000, a = p.ang * Math.PI / 180, A = FL.ballArea(d, a), Q = FL.orifice(p.dp * BAR, A, 0.8, 998, 0.01 * BAR), Kv = Q * 3600 / Math.sqrt(p.dp);
      u.setAngle(a);
      return { group: g, rest: true, view: { yaw: 0.5, pitch: 0.45 }, update() {},
        info: [['Przelot (część wspólna otworu kuli i gniazda)', `${num(A * 1e6, 1)} mm² (${num(A / (Math.PI * d * d / 4) * 100, 1)} %)`], ['Przepływ wody', lpm(Q)], ['Współczynnik Kv', `${num(Kv, 2)} m³/h`], ['Kąt', T(p.ang === 0 ? 'otwarty (dźwignia wzdłuż rury)' : p.ang >= 90 ? 'zamknięty (dźwignia w poprzek)' : 'dławienie', p.ang === 0 ? 'open (lever along the pipe)' : p.ang >= 90 ? 'closed (lever across)' : 'throttling')], ['Masa', kg(u.mass)]],
        ports: portsOf(M) };
    },
  },
  {
    id: 'checkValve', name: 'Zawór zwrotny', group: 'Zawory',
    params: [
      { key: 'dn', label: 'Średnica nominalna', type: 'select', options: [[10, 'DN 10'], [15, 'DN 15'], [20, 'DN 20']], def: 15 },
      { key: 'pc', label: 'Ciśnienie otwarcia', type: 'range', min: 0.02, max: 1, step: 0.02, unit: 'bar', def: 0.1 },
      { key: 'cut', label: 'Przekrój (korpus przezroczysty)', type: 'check', def: false },
    ],
    build(p) {
      const M = FK.checkValve({ dn: p.dn, cut: p.cut }), u = M.userData, g = new THREE.Group(); g.add(M);
      const d = p.dn / 1000, CV = FL.check({ pc: p.pc * BAR, dpFull: 0.3 * BAR + p.pc * BAR, Amax: Math.PI * d * d / 4 * 0.6 });
      let dp = 0;
      const live = () => [['Różnica ciśnień (podgląd)', bar(dp, 2)], ['Przepływ wody', lpm(Math.max(0, CV.Q(dp, 998)))], ['Stan', dp > p.pc * BAR ? T('otwarty', 'open') : dp < 0 ? T('zamknięty — ciśnienie wsteczne dociska grzybek', 'closed — back pressure seats the disc') : T('zamknięty (poniżej ciśnienia otwarcia)', 'closed (below cracking pressure)')]];
      return { group: g, rest: true, view: { yaw: 0.4, pitch: 0.3 }, live, update: (t) => { dp = Math.sin(t * 0.5) * 1.2 * BAR; u.setOpen(Math.min(1, Math.max(0, (dp - p.pc * BAR) / (0.3 * BAR + p.pc * BAR)))); },
        info: [['Ciśnienie otwarcia', bar(p.pc * BAR)], ['Przepływ przy 0,5 bar', lpm(CV.Q(0.5 * BAR, 998))], ['Przepływ wsteczny', T('zero (grzybek na gnieździe)', 'zero (disc on the seat)')], ...live()],
        ports: portsOf(M) };
    },
  },
  {
    id: 'throttleValve', name: 'Zawór dławiący', group: 'Zawory',
    params: [
      { key: 'turns', label: 'Otwarcie (obroty pokrętła)', type: 'range', min: 0, max: 4, step: 0.25, def: 1 },
      { key: 'dp', label: 'Różnica ciśnień', type: 'range', min: 1, max: 100, step: 1, unit: 'bar', def: 20 },
      { key: 'check', label: 'Z zaworem zwrotnym (dławienie w jedną stronę)', type: 'check', def: true },
    ],
    build(p) {
      const M = FK.throttleValve({ check: p.check }), u = M.userData, g = new THREE.Group(); g.add(M);
      const h = p.turns * 0.0005, A = FL.needleArea(0.004, h), Q = FL.orifice(p.dp * BAR, A, 0.7, 870), CV = FL.check({ pc: 0.3 * BAR, Amax: 12e-6 }), Qr = Q + (p.check ? CV.Q(p.dp * BAR, 870) : 0);
      u.setOpen(p.turns / 4);
      return { group: g, rest: true, view: { yaw: 0.3, pitch: 0.35 }, update() {},
        info: [['Wysunięcie iglicy (skok gwintu 0,5 mm)', mm(h, 2)], ['Przelot szczeliny', `${num(A * 1e6, 2)} mm²`], ['Przepływ — kierunek dławiony', lpm(Q)], ['Przepływ — kierunek swobodny', p.check ? lpm(Qr) : lpm(Q)], ['Zależność', T('Q ~ √Δp — prędkość siłownika zależy od obciążenia', 'Q ~ √Δp — cylinder speed depends on the load')]],
        ports: portsOf(M) };
    },
  },
  {
    id: 'reliefValve', name: 'Zawór bezpieczeństwa', group: 'Zawory',
    params: [
      { key: 'pc', label: 'Ciśnienie otwarcia', type: 'range', min: 10, max: 250, step: 5, unit: 'bar', def: 60 },
      { key: 'Q', label: 'Wydajność pompy (przelew całej)', type: 'range', min: 1, max: 40, step: 0.5, unit: 'l/min', def: 3 },
      { key: 'V', label: 'Objętość oleju w zbiorniku', type: 'range', min: 5, max: 200, step: 5, unit: 'l', def: 15 },
    ],
    build(p) {
      const M = FK.reliefValve({ pc: p.pc }), g = new THREE.Group(); g.add(M);
      const RV = FL.relief({ pc: p.pc * BAR, dpFull: 8 * BAR, Amax: 8e-6 * Math.max(1, p.Q / 4) }), Q = p.Q / 60000;
      let lo = RV.pc, hi = RV.pc + 200 * BAR; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (RV.Q(m) < Q) lo = m; else hi = m; }
      const pr = (lo + hi) / 2, Ph = pr * Q, dT = Ph / (870 * FLUIDS.oil.cp * p.V / 1000) * 60;
      return { group: g, rest: true, view: { yaw: 0.4, pitch: 0.2 }, update() {},
        info: [['Ciśnienie przy przelewie całej wydajności', bar(pr, 1)], ['Przyrost ciśnienia ponad otwarcie (sprężyna)', bar(pr - RV.pc, 1)], ['Moc zamieniana w ciepło p·Q', W(Ph)], ['Wzrost temperatury oleju', `${num(dT, 2)} K/min (${T('bez chłodzenia', 'no cooling')})`], ['Nastawa', T('śruba z przeciwnakrętką, kołpak plombowany', 'screw with lock nut, sealed cap')]],
        ports: portsOf(M) };
    },
  },
  {
    id: 'dirValve', name: 'Rozdzielacz 4/3', group: 'Rozdzielacze',
    params: [
      { key: 'Q', label: 'Przepływ', type: 'range', min: 1, max: 60, step: 1, unit: 'l/min', def: 10 },
      { key: 'U', label: 'Napięcie cewek', type: 'select', options: [[24, '24 V DC'], [230, '230 V AC (z prostownikiem w wtyczce)']], def: 24 },
    ],
    build(p) {
      const M = FK.directionalValve({}), u = M.userData, mf = FK.manifold({}), g = new THREE.Group(); g.add(mf); M.position.y = mf.userData.H; g.add(M);
      let s = 0, held = 0; const Q = p.Q / 60000, dpPA = 870 / 2 * (Q / (0.7 * 9e-6 * 4)) ** 2;
      const api = { press: (n) => { if (n === 'a') held = 1; if (n === 'b') held = -1; }, release: () => { held = 0; }, drag() {}, tick() {} };
      const live = () => [['Położenie suwaka', s > 0.5 ? T('a: P→A, B→T', 'a: P→A, B→T') : s < -0.5 ? T('b: P→B, A→T', 'b: P→B, A→T') : T('0 (tandem): P→T, A i B zamknięte', '0 (tandem): P→T, A and B blocked')]];
      return { group: g, controls: true, api, rest: true, view: { yaw: 0.35, pitch: 0.4 }, live, update() {},
        tick: (dt) => { s += (held - s) * Math.min(1, dt / 0.03); u.setSpool(s); },   // czas przełączenia ok. 30 ms, sprężyny centrują
        info: [['Obsługa', T('przytrzymaj cewkę a albo b (albo czerwony przycisk awaryjny)', 'hold coil a or b (or the red manual override)')], ['Spadek ciśnienia P→A przy przepływie', bar(dpPA, 2)], ['Moc cewki', '30 W'], ['Czas przełączenia', '≈ 30 ms'], ['Przyłącza', T('CETOP 3 (NG6) — P, A, B, T w płaszczyźnie montażowej', 'CETOP 3 (NG6) — P, A, B, T in the mounting face')], ['Masa', kg(u.mass + mf.userData.mass)], ...live()],
        ports: portsOf(M, mf) };
    },
  },
  /* ---------------- siłownik ---------------- */
  {
    id: 'hydCylinder', name: 'Siłownik hydrauliczny', group: 'Siłowniki',
    params: [
      { key: 'D', label: 'Średnica tłoka', type: 'select', options: [[0.025, 'Ø 25'], [0.032, 'Ø 32'], [0.04, 'Ø 40'], [0.05, 'Ø 50'], [0.063, 'Ø 63']], def: 0.032 },
      { key: 'phi', label: 'Średnica tłoczyska', type: 'select', options: [[0.56, T('mała (φ ≈ 1,4)', 'small (φ ≈ 1.4)')], [0.7, T('duża (φ ≈ 2)', 'large (φ ≈ 2)')]], def: 0.56 },
      { key: 'stroke', label: 'Skok', type: 'range', min: 0.05, max: 0.5, step: 0.01, unit: 'mm', def: 0.15 },
      { key: 'p', label: 'Ciśnienie', type: 'range', min: 10, max: 160, step: 5, unit: 'bar', def: 60 },
      { key: 'Q', label: 'Przepływ', type: 'range', min: 0.5, max: 30, step: 0.5, unit: 'l/min', def: 3 },
      { key: 'mount', label: 'Mocowanie (wyboczenie)', type: 'select', options: [['pivot', 'przegubowe oba końce'], ['guided', 'łapy + prowadzony koniec'], ['fixed', 'utwierdzony + prowadzony']], def: 'guided' },
      { key: 'cut', label: 'Przekrój (tuleja przezroczysta)', type: 'check', def: false },
    ],
    build(p) {
      const d = Math.round(p.D * p.phi * 1000) / 1000, M = FK.hydCylinder({ D: p.D, d, stroke: p.stroke, cut: p.cut }), u = M.userData, g = new THREE.Group(); g.add(M);
      const C = FL.cylinder({ D: p.D, d, stroke: p.stroke, mount: p.mount }), dp = p.p * BAR, Q = p.Q / 60000, vo = C.vOut(Q), vi = C.vIn(Q);
      let x = 0, dir = 1;
      const warn = C.Fout(dp) > C.Fbuckle / 3.5 ? [T(`Siła wysuwu ${num(C.Fout(dp) / 1000, 1)} kN powyżej 1/3,5 siły wyboczenia (${num(C.Fbuckle / 1000, 1)} kN) — za cienkie tłoczysko.`, `Push force ${num(C.Fout(dp) / 1000, 1)} kN above 1/3.5 of the buckling load (${num(C.Fbuckle / 1000, 1)} kN) — rod too thin.`)] : [];
      const live = () => [['Wysuw', mm(x, 0)], ['Ruch', dir > 0 ? `${T('wysuw', 'extending')} ${num(vo * 1000, 0)} mm/s` : `${T('wsuw', 'retracting')} ${num(vi * 1000, 0)} mm/s`]];
      return { group: g, rest: true, view: { yaw: 0.25, pitch: 0.25 }, warn, live, update() {},
        tick: (dt) => { x += dir * (dir > 0 ? vo : vi) * dt; if (x >= p.stroke) { x = p.stroke; dir = -1; } if (x <= 0) { x = 0; dir = 1; } u.setStroke(x); },
        info: [['Pole tłoka A₁', `${num(C.A1 * 1e4, 2)} cm²`], ['Pole pierścienia A₂', `${num(C.A2 * 1e4, 2)} cm²`], ['Przełożenie powierzchni φ', num(C.phi, 2)], ['Siła wysuwu p·A₁', `${num(C.Fout(dp) / 1000, 2)} kN`], ['Siła wsuwu p·A₂', `${num(C.Fin(dp) / 1000, 2)} kN`],
          ['Prędkość wysuwu Q / A₁', `${num(vo * 1000, 0)} mm/s`], ['Prędkość wsuwu Q / A₂', `${num(vi * 1000, 0)} mm/s`], ['Czas cyklu', `${num(p.stroke / vo + p.stroke / vi, 2)} s`], ['Objętość oleju na cykl', `${num(C.Vfill * 1e6, 0)} cm³`], ['Siła wyboczenia (Euler)', `${num(C.Fbuckle / 1000, 1)} kN · Lk ${mm(C.Lk, 0)}`], ['Masa', kg(u.mass)], ...live()],
        ports: portsOf(M) };
    },
  },
  /* ---------------- zbiorniki ---------------- */
  {
    id: 'reservoir', name: 'Zbiornik hydrauliczny', group: 'Zbiorniki',
    params: [
      { key: 'V', label: 'Pojemność', type: 'range', min: 5, max: 100, step: 5, unit: 'l', def: 15 },
      { key: 'Q', label: 'Wydajność pompy', type: 'range', min: 1, max: 40, step: 0.5, unit: 'l/min', def: 3 },
      { key: 'Ploss', label: 'Moc strat (ciepło)', type: 'range', min: 10, max: 2000, step: 10, unit: 'W', def: 150 },
    ],
    build(p) {
      const k = Math.cbrt(p.V / 15), M = FK.reservoir({ L: 0.42 * k, W: 0.22 * k, H: 0.2 * k }), u = M.userData, g = new THREE.Group(); g.add(M);
      const A = 2 * (u.L * u.H + u.W * u.H) + u.L * u.W, dT = p.Ploss / (15 * A);
      const warn = p.V < 3 * p.Q ? [T(`Pojemność ${p.V} l mniejsza niż 3 × wydajność na minutę (${num(3 * p.Q, 1)} l) — olej nie zdąży się uspokoić i odpowietrzyć.`, `Capacity ${p.V} l below 3 × flow per minute (${num(3 * p.Q, 1)} l) — the oil has no time to settle and de-aerate.`)] : [];
      if (dT > 30) warn.push(T(`Przyrost temperatury ${num(dT, 0)} K — potrzebna chłodnica.`, `Temperature rise ${num(dT, 0)} K — a cooler is needed.`));
      return { group: g, rest: true, view: { yaw: 0.5, pitch: 0.3 }, warn, update() {},
        info: [['Zalecana pojemność (3–5 × Q na minutę)', `${num(3 * p.Q, 1)}–${num(5 * p.Q, 1)} l`], ['Czas przebywania oleju V / Q', `${num(p.V / p.Q * 60, 0)} s`], ['Powierzchnia oddająca ciepło', `${num(A, 2)} m²`], ['Ustalony przyrost temperatury P / (k·A)', `${num(dT, 1)} K (k = 15 W/m²K)`], ['Wymiary', `${num(u.L * 1000)} × ${num(u.W * 1000)} × ${num(u.H * 1000)} mm`], ['Masa (pusty)', kg(u.mass)]],
        ports: portsOf(M) };
    },
  },
  {
    id: 'accumulator', name: 'Akumulator hydrauliczny', group: 'Zbiorniki',
    params: [
      { key: 'V0', label: 'Pojemność', type: 'select', options: [[0.32e-3, '0,32 l'], [0.7e-3, '0,7 l'], [1.4e-3, '1,4 l'], [2.5e-3, '2,5 l']], def: 0.7e-3 },
      { key: 'p0', label: 'Ciśnienie wstępne azotu p₀', type: 'range', min: 5, max: 150, step: 5, unit: 'bar', def: 40 },
      { key: 'p1', label: 'Ciśnienie minimalne p₁', type: 'range', min: 10, max: 200, step: 5, unit: 'bar', def: 50 },
      { key: 'p2', label: 'Ciśnienie maksymalne p₂', type: 'range', min: 20, max: 250, step: 5, unit: 'bar', def: 100 },
    ],
    build(p) {
      const M = FK.accumulator({ V0: p.V0 }), g = new THREE.Group(); g.add(M);
      const A = FL.accumulator({ V0: p.V0, p0: p.p0 * BAR }), p1 = Math.max(p.p1, p.p0) * BAR, p2 = Math.max(p.p2, p1 / BAR + 5) * BAR;
      const dVi = A.useful(p1, p2, 1), dVa = A.useful(p1, p2, 1.4), E = (p2 * A.gasV(p2, 1.4) - p1 * A.gasV(p1, 1.4)) / 0.4;
      const warn = []; if (p.p0 > 0.9 * p.p1) warn.push(T('Ciśnienie wstępne powyżej 0,9 p₁ — pęcherz uderza o zawór przy rozładowaniu.', 'Pre-charge above 0.9 p₁ — the bladder hits the poppet when discharging.')); if (p.p2 > 4 * p.p0) warn.push(T('p₂ > 4 p₀ — pęcherz za mocno ściśnięty (krótka trwałość).', 'p₂ > 4 p₀ — bladder compressed too much (short life).'));
      return { group: g, rest: true, view: { yaw: 0.4, pitch: 0.2 }, warn, update() {},
        info: [['Objętość użyteczna — izotermicznie (n = 1)', `${num(dVi * 1e6, 0)} cm³`], ['Objętość użyteczna — adiabatycznie (n = 1,4)', `${num(dVa * 1e6, 0)} cm³`], ['Energia oddana (adiabatycznie)', `${num(E, 0)} J`], ['Gaz przy p₂', `${num(A.gasV(p2, 1.4) * 1e6, 0)} cm³`], ['Prawo gazu', 'p·Vⁿ = const'], ['Masa', kg(M.userData.mass)]],
        ports: portsOf(M) };
    },
  },
  {
    id: 'floatGauge', name: 'Wskaźnik poziomu z pływakiem', group: 'Zbiorniki',
    params: [
      { key: 'R', label: 'Średnica pływaka', type: 'select', options: [[0.01, 'Ø 20'], [0.014, 'Ø 28'], [0.02, 'Ø 40']], def: 0.014 },
      { key: 'rho', label: 'Gęstość cieczy', type: 'select', options: [[998, 'woda 998 kg/m³'], [870, 'olej HLP 46 870 kg/m³'], [1030, 'woda morska 1030 kg/m³']], def: 998 },
    ],
    build(p) {
      const T0 = FK.waterTank({ L: 0.2, W: 0.14, H: 0.2 }), tu = T0.userData, fg = FK.floatGauge({ H: 0.194, R: p.R }), fu = fg.userData, g = new THREE.Group(); g.add(T0); fg.position.set(-0.06, 0.006, 0.03); g.add(fg);
      const sub = fu.m / (p.rho * fu.V);   // zanurzona część objętości kuli (pływanie: m = ρ·V_zan)
      let lvl = 0.6;
      const live = () => [['Poziom (podgląd: napełnianie i opróżnianie)', `${num(lvl * 100, 0)} % · ${mm(lvl * 0.194, 0)}`]];
      return { group: g, rest: true, view: { yaw: 0.4, pitch: 0.2 }, live, update: (t) => { lvl = 0.5 + 0.35 * Math.sin(t * 0.3); tu.setLevel(lvl); fg.userData.setLevel(lvl * 0.194); },
        info: [['Objętość pływaka', `${num(fu.V * 1e6, 1)} cm³`], ['Masa pływaka', `${num(fu.m * 1000, 1)} g`], ['Zanurzenie (część objętości)', `${num(sub * 100, 0)} %`], ['Siła wyporu przy pełnym zanurzeniu', `${num(p.rho * fu.V * G, 3)} N`], ['Zasada', T('pływak unosi się na powierzchni — Archimedes: ρ·g·V_zan = m·g', 'the float rides on the surface — Archimedes: ρ·g·V_sub = m·g')], ...live()],
        ports: portsOf(fg) };
    },
  },
  {
    id: 'bucket', name: 'Wiadro', group: 'Zbiorniki',
    params: [
      { key: 'V', label: 'Pojemność', type: 'select', options: [[0.005, '5 l'], [0.01, '10 l'], [0.012, '12 l']], def: 0.01 },
      { key: 'mat', label: 'Materiał', type: 'select', options: [['zinc', 'blacha ocynkowana'], ['plastic', 'polipropylen']], def: 'zinc' },
      { key: 'fill', label: 'Napełnienie', type: 'range', min: 0, max: 100, step: 5, unit: '%', def: 70 },
    ],
    build(p) {
      const M = FK.bucket({ V: p.V, mat: p.mat }), u = M.userData, g = new THREE.Group(); g.add(M);
      u.setLevel(p.fill / 100); const Vw = u.vol(p.fill / 100), m = Vw * 998;
      return { group: g, rest: true, view: { yaw: 0.3, pitch: 0.35 }, update() {},
        info: [['Woda w wiadrze', `${num(Vw * 1000, 2)} l`], ['Masa wody', kg(m)], ['Masa razem', kg(m + u.mass)], ['Siła na kabłąku (niesione)', `${num((m + u.mass) * G, 1)} N`], ['Ciśnienie na dnie ρ·g·h', `${num(998 * G * (u.H - 0.0155) * p.fill / 100, 0)} Pa`], ['Masa wiadra', kg(u.mass)]],
        ports: portsOf(M) };
    },
  },
  /* ---------------- dysza ---------------- */
  {
    id: 'nozzle', name: 'Dysza', group: 'Dysze',
    params: [
      { key: 'd', label: 'Średnica otworu', type: 'range', min: 0.002, max: 0.016, step: 0.0005, unit: 'mm.1', def: 0.008 },
      { key: 'dp', label: 'Ciśnienie przed dyszą', type: 'range', min: 0.01, max: 6, step: 0.01, unit: 'bar', def: 0.05 },
    ],
    build(p) {
      const M = FK.nozzle({ d: p.d }), g = new THREE.Group(); g.add(M);
      const N = FL.nozzle({ d: p.d }), dp = p.dp * BAR, v = N.v(dp), Q = N.Q(dp), h = N.h(dp), H0 = M.userData.H;
      // strumień: ciągła struga w górę, rozpad na krople przy wierzchołku, kręgi i rozbryzg na blacie (LiquidKit)
      const jet = createJet({ d: p.d }); g.add(jet.group);
      const origin = new THREE.Vector3(0, H0, 0), up = new THREE.Vector3(0, 1, 0);
      return { group: g, rest: true, view: { yaw: 0.3, pitch: 0.1 }, update() {},
        tick: (dt) => jet.update(dt, { origin, dir: up, v, floorY: 0.0005 }),
        info: [['Prędkość strumienia v = Cv·√(2Δp/ρ)', `${num(v, 2)} m/s`], ['Wydatek Q = Cd·A·√(2Δp/ρ)', lpm(Q)], ['Siła odrzutu F = ρ·Q·v', `${num(998 * Q * v, 3)} N`], ['Wysokość strumienia pionowego v² / 2g', mm(h, 0)], ['Zasięg pod kątem 45°', mm(v * v / G, 0)], ['Współczynniki', 'Cd 0,9 · Cv 0,97']],
        ports: portsOf(M) };
    },
  },
  /* ---------------- transport ---------------- */
  {
    id: 'conveyor', name: 'Przenośnik taśmowy', group: 'Transport',
    params: [
      { key: 'L', label: 'Długość', type: 'range', min: 0.4, max: 1.2, step: 0.05, unit: 'mm', def: 0.7 },
      { key: 'v', label: 'Prędkość taśmy', type: 'range', min: 0.02, max: 0.5, step: 0.01, unit: 'm/s', def: 0.12 },
      { key: 'm', label: 'Masa ładunku (karton)', type: 'range', min: 0.1, max: 5, step: 0.1, unit: 'kg', def: 0.4 },
      { key: 'mu', label: 'Tarcie taśmy o ślizg μ', type: 'range', min: 0.1, max: 0.5, step: 0.05, def: 0.3 },
    ],
    build(p) {
      const M = FK.beltConveyor({ L: p.L }), u = M.userData, g = new THREE.Group(); g.add(M);
      const s = 0.06, cv = createConveyor({ xFeed: 0.04, beltX0: 0, beltX1: p.L, s, m: p.m, n: 0 });
      const cs = []; for (let i = 0; i < 4; i++) { const c = FK.carton({ s }); g.add(c); cs.push(c); cv.boxes.push({ x: 0.04 + i * 0.16, y: 0, v: 0, vy: 0, st: 'line', t: 0 }); }
      let belt = 0;
      const nOn = () => cv.boxes.filter((b) => b.st === 'line').length, Pd = () => (nOn() * p.m * G * p.mu * p.v + 4) / 0.6;   // ładunek + opory taśmy i bębnów, motoreduktor η 0,6
      const live = () => [['Kartony na taśmie', String(nOn())], ['Moc napędu', W(Pd())], ['Dostarczono', String(cv.state.delivered)]];
      const place = () => cv.boxes.forEach((b, i) => { if (b.st === 'chute') { b.st = 'line'; b.x = 0.04; b.y = 0; } cs[i].position.set(b.x, b.st === 'line' ? u.top : u.top + b.y, 0); cs[i].visible = b.st !== 'bin'; });
      place();
      return { group: g, rest: true, view: { yaw: 0.35, pitch: 0.35 }, live, update() {},
        tick: (dt) => { belt += p.v * dt; u.setBelt(belt); cv.step(dt, { vBelt: p.v }); place(); },
        info: [['Wydajność (odstęp 2 kartony)', `${num(p.v / (2 * s) * 3600, 0)} ${T('szt./h', 'pcs/h')}`], ['Siła na taśmie na karton μ·m·g', `${num(p.mu * p.m * G, 2)} N`], ['Przyspieszenie kartonu na taśmie (tarcie 0,6)', `${num(0.6 * G, 2)} m/s²`], ['Średnica bębna', mm(2 * u.r, 0)], ['Obroty bębna', `${num(p.v / u.r * 60 / (2 * Math.PI), 1)} obr/min`], ...live()],
        ports: portsOf(M) };
    },
  },
  {
    id: 'revCounter', name: 'Licznik obrotów z obrotomierzem', group: 'Czujniki',
    params: [{ key: 'max', label: 'Zakres obrotomierza', type: 'select', options: [[120, '0–120 obr/min'], [600, '0–600 obr/min'], [3000, '0–3000 obr/min']], def: 120 }],
    build(p) {
      const M = FK.revCounter({ max: p.max }), u = M.userData, g = new THREE.Group(); g.add(M);
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.06, 16).rotateX(Math.PI / 2), FK.fluidMaterials().steel); sh.position.z = -0.03; g.add(sh);
      let th0 = null, n = 0, rpm = 0, nPrev = 0;
      const live = () => [['Obroty', num(Math.floor(n))], ['Prędkość', `${num(rpm, 1)} obr/min`]];
      return { group: g, rest: false, view: { yaw: 0.2, pitch: 0.1 }, live,
        update: (t) => { if (th0 === null) th0 = t; sh.rotation.z = t; n = (t - th0) / (2 * Math.PI); },
        tick: (dt) => { if (dt > 0) rpm += ((n - nPrev) / dt * 60 - rpm) * Math.min(1, dt * 4); nPrev = n; u.setCount(n); u.setRpm(rpm); },
        info: [['Liczydło', T('6 bębenków (ostatni czerwony), przekładnia ślimakowa 1 : 1', '6 drums (last one red), 1 : 1 worm drive')], ['Obrotomierz', T('wirujący magnes i tarcza z sprężynką (prądy wirowe)', 'spinning magnet and spring-loaded drag cup (eddy currents)')], ['Napęd', T('wałek Ø 8 przez sprzęgło z wałem', 'Ø 8 input shaft via a coupling')], ...live()],
        ports: portsOf(M) };
    },
  },
  {
    id: 'rotameter', name: 'Przepływomierz (rotametr)', group: 'Czujniki',
    params: [
      { key: 'Qmax', label: 'Zakres', type: 'select', options: [[2, '0–2 l/min'], [6, '0–6 l/min'], [12, '0–12 l/min'], [25, '0–25 l/min']], def: 12 },
      { key: 'Q', label: 'Przepływ średni', type: 'range', min: 0, max: 25, step: 0.1, unit: 'l/min', def: 7 },
      { key: 'rhoF', label: 'Pływak', type: 'select', options: [[7900, 'stal nierdzewna 7900 kg/m³'], [2700, 'aluminium 2700 kg/m³'], [1380, 'PVDF 1380 kg/m³']], def: 7900 },
    ],
    build(p) {
      const R = FL.rotameterFor(p.Qmax / 60000, { rhoF: p.rhoF }), scale = []; for (let i = 0; i <= 5; i++) { const q = p.Qmax * i / 5; scale.push([Math.round(q * 10) / 10, R.h(q / 60000)]); }
      const M = FK.rotameter({ L: R.L, Df: R.Df, scale, Qmax: p.Qmax }), u = M.userData, g = new THREE.Group(); g.add(M);
      let q = 0;
      const warn = p.Q > p.Qmax ? [T('Przepływ powyżej zakresu — pływak oparty o górny ogranicznik, odczyt niemożliwy.', 'Flow above the range — the float rests on the top stop, no reading.')] : [];
      const live = () => [['Przepływ (podgląd — wahania)', lpm(q)], ['Wysokość pływaka', mm(R.h(q), 1)]];
      return { group: g, rest: true, view: { yaw: 0.2, pitch: 0.1 }, warn, live, update: (t) => { q = Math.max(0, p.Q / 60000 * (1 + 0.15 * Math.sin(t * 0.7))); u.setFloat(R.h(q)); },
        info: [['Zasada', T('pływak unosi się, aż szczelina wokół niego przepuści przepływ — Δp stałe, równe ciężarowi pływaka w cieczy na jego przekroju', 'the float rises until the gap around it passes the flow — constant Δp equal to the float weight in liquid over its area')], ['Spadek ciśnienia na pływaku', `${num(R.dp, 0)} Pa`], ['Zbieżność rurki (połowa kąta)', `${num(R.alpha * 180 / Math.PI, 2)}°`], ['Montaż', T('pionowo, przepływ od dołu', 'vertical, flow from below')], ['Dokładność', T('± 2,5 % zakresu (wzorcowany dla wody 20 °C)', '± 2.5 % of range (calibrated for water at 20 °C)')], ...live()],
        ports: portsOf(M) };
    },
  },
  /* ---------------- pomiar ciśnienia ---------------- */
  {
    id: 'pressureSensor', name: 'Przetwornik ciśnienia i manometr', group: 'Czujniki',
    params: [
      { key: 'range', label: 'Zakres', type: 'select', options: [[10, '0–10 bar'], [100, '0–100 bar'], [160, '0–160 bar'], [250, '0–250 bar']], def: 100 },
      { key: 'p', label: 'Ciśnienie średnie', type: 'range', min: 0, max: 250, step: 1, unit: 'bar', def: 40 },
    ],
    build(p) {
      const g = new THREE.Group(), F = FK.fluidMaterials();
      const blk = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.03), F.alu); blk.position.y = 0.015; g.add(blk);
      const ga = FK.gauge({ range: p.range }); ga.position.set(-0.022, 0.03, 0); g.add(ga);
      const se = FK.pressureSensor({ range: p.range }); se.position.set(0.028, 0.03, 0); g.add(se);
      let pr = 0;
      const live = () => [['Ciśnienie (podgląd — pulsacja pompy)', bar(pr * BAR, 1)], ['Prąd wyjściowy 4 + 16·p / zakres', `${num(4 + 16 * Math.min(1, pr / p.range), 2)} mA`]];
      return { group: g, rest: true, view: { yaw: 0.2, pitch: 0.15 }, live, update: (t) => { pr = Math.max(0, Math.min(p.range * 1.04, p.p * (1 + 0.04 * Math.sin(t * 6)) )); ga.userData.setValue(pr); },
        info: [['Manometr', T(`Ø 63, gliceryna, klasa 1,6 (± ${num(0.016 * p.range, 2)} bar)`, `Ø 63, glycerine, class 1.6 (± ${num(0.016 * p.range, 2)} bar)`)], ['Przetwornik', T('4–20 mA, dokładność 0,5 %, M12', '4–20 mA, accuracy 0.5 %, M12')], ['Zalecany zakres', T('ciśnienie robocze w 1/3–2/3 skali', 'working pressure within 1/3–2/3 of the scale')], ...live()],
        ports: [...portsOf(ga), ...portsOf(se)] };
    },
  },
  /* ---------------- źródła płynu ---------------- */
  {
    id: 'fluidSource', name: 'Źródło płynu', group: 'Źródła płynu',
    params: [
      { key: 'kind', label: 'Rodzaj', type: 'select', options: [['mains', 'sieć wodociągowa z reduktorem ciśnienia'], ['gravity', 'zbiornik na wieży (spływ grawitacyjny)']], def: 'mains' },
      { key: 'p0', label: 'Ciśnienie w sieci', type: 'range', min: 1, max: 8, step: 0.1, unit: 'bar', def: 5 },
      { key: 'pReg', label: 'Nastawa reduktora', type: 'range', min: 1, max: 6, step: 0.1, unit: 'bar', def: 3 },
      { key: 'L', label: 'Długość przyłącza', type: 'range', min: 1, max: 50, step: 1, unit: 'm', def: 15 },
      { key: 'tap', label: 'Otwarcie kranu', type: 'range', min: 0, max: 100, step: 5, unit: '%', def: 40 },
    ],
    build(p) {
      const M = FK.waterSupply({ kind: p.kind, pReg: p.pReg }), u = M.userData, g = new THREE.Group(); g.add(M);
      const grav = p.kind === 'gravity', h = grav ? u.head - u.outlet.y : 0;
      const src = grav ? FL.mains({ p0: 998 * G * h, d: 0.022, L: u.head, zeta: 3 }) : FL.mains({ p0: p.p0 * BAR, d: 0.025, L: p.L, pReg: p.pReg * BAR });
      const tap = p.tap / 100, Q = src.Q(tap), dS = u.dSpout, v = Q / (Math.PI * dS * dS / 4) ;
      u.setTap(tap);
      const jet = createJet({ d: dS * 0.9 }); g.add(jet.group);
      const bk = FK.bucket({ handleUp: false }), bu = bk.userData; bk.position.set(u.outlet.x, 0, 0); g.add(bk);   // wiadro pod kranem — napełnia się z wydatku
      let vol = 0, inB = 0;
      const live = () => [['Licznik wodomierza', `${num(vol * 1000, 2)} l`], ['W wiadrze', `${num(inB * 1000, 2)} l`]];
      return { group: g, rest: true, view: { yaw: 0.6, pitch: 0.15 }, live, update() {},
        tick: (dt) => {
          vol += Q * dt; inB += Q * dt; if (inB > bu.Vfull) inB = 0;   // pełne wiadro — wylane, od nowa
          let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (bu.vol(m) < inB) lo = m; else hi = m; } bu.setLevel(lo);
          u.setMeter(vol); jet.update(dt, { origin: u.outlet, dir: u.outletDir, v: Math.max(v, Q > 0 ? 0.3 : 0), floorY: 0.0055 + lo * (bu.H - 0.0155) });
        },
        info: [['Ciśnienie statyczne', grav ? `${bar(998 * G * h, 3)} (ρ·g·h, h = ${mm(h, 0)})` : bar(Math.min(p.p0, p.pReg) * BAR, 2)], ['Ciśnienie przed kranem przy wypływie', bar(src.pAfter(Q), 2)], ['Wydatek', lpm(Q)], ['Prędkość wypływu z wylewki', `${num(v, 2)} m/s`],
          ['Reduktor', grav ? T('brak — ciśnienie z wysokości słupa wody', 'none — pressure from the water column height') : (p.p0 < p.pReg ? T('nie redukuje (sieć poniżej nastawy)', 'not reducing (mains below the setting)') : T(`redukuje ${num(p.p0, 1)} → ${num(p.pReg, 1)} bar (spadek z przepływem)`, `reduces ${num(p.p0, 1)} → ${num(p.pReg, 1)} bar (droop with flow)`))], ['Napełnienie wiadra 10 l', Q > 0 ? `${num(0.01 / Q, 0)} s` : '—'], ...live()],
        ports: portsOf(M) };
    },
  },
];
