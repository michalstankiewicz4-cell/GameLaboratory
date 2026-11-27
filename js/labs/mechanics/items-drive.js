// Laboratorium mechaniki — przedmioty transmisji ruchu: zębatki i przekładnie, łańcuchy, pasy, wały i łożyska, sprzęgła, napęd.
import * as THREE from '../../../vendor/three/three.module.js';
import * as MK from '../../models/mech/mechkit.js';
import { createDrive } from '../../behaviors/land/mech/drive.js';
import { TAU, X, Y, mm, kg, kgcm2, P, MATS, matName, CHAINS, shaftBit, spinAll, contactRatio } from './items-common.js';

export const DRIVE_ITEMS = [
  {
    id: 'gear', name: 'Zębatka walcowa', group: 'Zębatki i przekładnie',
    params: [
      { key: 'z', label: 'Liczba zębów', type: 'range', min: 9, max: 120, step: 1, def: 32 },
      { key: 'm', label: 'Moduł', type: 'select', options: [[0.001, '1 mm'], [0.0015, '1,5 mm'], [0.002, '2 mm'], [0.0025, '2,5 mm'], [0.003, '3 mm'], [0.004, '4 mm'], [0.005, '5 mm'], [0.006, '6 mm'], [0.008, '8 mm']], def: 0.003 },
      { key: 'alpha', label: 'Kąt przyporu', type: 'select', options: [[14.5, '14,5°'], [20, '20° (ISO)'], [25, '25°']], def: 20 },
      { key: 'w', label: 'Szerokość wieńca', type: 'range', min: 0.008, max: 0.08, step: 0.002, unit: 'mm', def: 0.03 },
      { key: 'bore', label: 'Otwór', type: 'select', options: [[0.005, 'Ø 10'], [0.0075, 'Ø 15'], [0.0125, 'Ø 25'], [0.0175, 'Ø 35'], [0.025, 'Ø 50']], def: 0.0125 },
      { key: 'mat', label: 'Materiał', type: 'select', options: MATS, def: 'gear' },
      { key: 'holes', label: 'Otwory odciążające', type: 'check', def: true },
      { key: 'hub', label: 'Piasta', type: 'check', def: true },
    ],
    build(p) {
      const warn = [];
      if (p.bore * 2 > p.m * p.z - 2.5 * p.m - 0.006) { warn.push('Otwór za duży do tej zębatki — zmniejszony.'); p = { ...p, bore: Math.max(0.003, (p.m * p.z - 2.5 * p.m - 0.006) / 2.4) }; }
      const zmin = Math.ceil(2 / Math.sin(p.alpha * Math.PI / 180) ** 2);
      if (p.z < zmin) warn.push(`Mniej niż ${zmin} zębów przy α = ${String(p.alpha).replace('.', ',')}° — podcięcie stopy zęba przy obróbce obwiedniowej.`);
      const g = MK.gear(p), u = g.userData;
      return { group: g, update: spinAll(g), warn,
        info: [['Średnica podziałowa', mm(u.rp * 2)], ['Średnica wierzchołków', mm(u.ra * 2)], ['Średnica stóp', mm(u.rf * 2)], ['Średnica zasadnicza', mm(u.rb * 2)], ['Podziałka', mm(Math.PI * p.m, 2)], ['Grubość zęba (na podziałowym)', mm(Math.PI * p.m / 2, 2)], ['Materiał', matName(p.mat)], ['Masa', kg(u.mass)], ['Bezwładność', kgcm2(u.J)]],
        ports: [P('bore', 'Otwór z wpustem (wał)'), P('mesh', 'Zazębienie — z zębatką o tym samym module')] };
    },
  },
  {
    id: 'pair', name: 'Para zębatek', group: 'Zębatki i przekładnie',
    params: [
      { key: 'z1', label: 'Zęby — zębnik', type: 'range', min: 10, max: 60, step: 1, def: 18 },
      { key: 'z2', label: 'Zęby — koło', type: 'range', min: 10, max: 120, step: 1, def: 45 },
      { key: 'm', label: 'Moduł', type: 'select', options: [[0.0015, '1,5 mm'], [0.002, '2 mm'], [0.003, '3 mm'], [0.004, '4 mm'], [0.005, '5 mm']], def: 0.003 },
      { key: 'w', label: 'Szerokość', type: 'range', min: 0.01, max: 0.06, step: 0.002, unit: 'mm', def: 0.026 },
      { key: 'mat2', label: 'Materiał koła', type: 'select', options: MATS, def: 'brass' },
    ],
    build(p) {
      const g = new THREE.Group(), a = MK.gear({ z: p.z1, m: p.m, w: p.w, mat: 'gear', bore: Math.min(0.0125, p.m * p.z1 * 0.2) }), b = MK.gear({ z: p.z2, m: p.m, w: p.w, mat: p.mat2, bore: Math.min(0.0125, p.m * p.z2 * 0.2) });
      const a0 = p.m * (p.z1 + p.z2) / 2; a.position.set(0, 0, -a0 / 2); b.position.set(0, 0, a0 / 2); g.add(a, b);
      // kąty z napędu (to samo zazębienie co w maszynie)
      const d = createDrive(), ea = d.add({ id: 'a', J: 0, frame: { o: a.position.clone(), axis: X, ref: Y } }), eb = d.add({ id: 'b', J: 0, frame: { o: b.position.clone(), axis: X, ref: Y } });
      d.connect('a', 'mesh', 'b', 'mesh', 'mesh', { za: p.z1, zb: p.z2 }); d.solve('a');
      return { group: g, view: { yaw: 1.2, pitch: 0.25 }, update: (t) => { d.pose(t); a.userData.spin.rotation.x = ea.theta; b.userData.spin.rotation.x = eb.theta; },
        info: [['Przełożenie', `i = ${p.z2}/${p.z1} = ${(p.z2 / p.z1).toLocaleString('pl', { maximumFractionDigits: 3 })}`], ['Odległość osi', mm(a0)], ['Kierunek', 'przeciwny'], ['Wskaźnik przyporu (ok.)', contactRatio(p.z1, p.z2).toLocaleString('pl', { maximumFractionDigits: 2 })], ['Masa razem', kg(a.userData.mass + b.userData.mass)]],
        ports: [P('in', 'Wał zębnika (wejście)'), P('out', 'Wał koła (wyjście)')] };
    },
  },
  {
    id: 'planet', name: 'Przekładnia planetarna', group: 'Zębatki i przekładnie',
    params: [
      { key: 'zs', label: 'Zęby — słoneczne', type: 'range', min: 12, max: 60, step: 1, def: 24 },
      { key: 'zp', label: 'Zęby — satelity', type: 'range', min: 12, max: 60, step: 1, def: 24 },
      { key: 'n', label: 'Liczba satelitów', type: 'select', options: [[2, '2'], [3, '3'], [4, '4'], [5, '5']], def: 3 },
      { key: 'm', label: 'Moduł', type: 'select', options: [[0.001, '1 mm'], [0.0015, '1,5 mm'], [0.002, '2 mm'], [0.003, '3 mm']], def: 0.002 },
      { key: 'w', label: 'Szerokość', type: 'range', min: 0.01, max: 0.04, step: 0.002, unit: 'mm', def: 0.02 },
    ],
    build(p) {
      const g = MK.planetary(p), u = g.userData, warn = [];
      if (!u.assemblyOk) warn.push(`(zs + zr) / n = ${u.assembly.toLocaleString('pl', { maximumFractionDigits: 2 })} — niecałkowite: satelitów nie da się rozstawić równo.`);
      if (!u.clearanceOk) warn.push('Satelity zachodzą na siebie — za dużo satelitów albo za duże.');
      return { group: g, warn, view: { yaw: -0.9, pitch: 0.25 }, update: (t) => u.update(t),
        info: [['Koło koronowe', `${u.zr} zębów (zr = zs + 2·zp)`], ['Przełożenie (korona stała)', `i = 1 + zr/zs = ${u.ratio.toLocaleString('pl', { maximumFractionDigits: 3 })}`], ['Kierunek wyjścia', 'ten sam co wejście'], ['Promień jarzma', mm(u.RC)], ['Średnica zewnętrzna', mm(u.R * 2)], ['Masa', kg(u.mass)]],
        ports: [P('sun', 'Koło słoneczne (wejście)'), P('ring', 'Koło koronowe', 'podparcie'), P('carrier', 'Jarzmo (wyjście)')] };
    },
  },
  {
    id: 'ring', name: 'Koło koronowe', group: 'Zębatki i przekładnie',
    params: [
      { key: 'z', label: 'Liczba zębów', type: 'range', min: 36, max: 160, step: 1, def: 72 },
      { key: 'm', label: 'Moduł', type: 'select', options: [[0.001, '1 mm'], [0.0015, '1,5 mm'], [0.002, '2 mm'], [0.003, '3 mm']], def: 0.002 },
      { key: 'w', label: 'Szerokość', type: 'range', min: 0.01, max: 0.05, step: 0.002, unit: 'mm', def: 0.02 },
      { key: 'rim', label: 'Grubość wieńca', type: 'range', min: 0.006, max: 0.03, step: 0.001, unit: 'mm', def: 0.012 },
      { key: 'mat', label: 'Materiał', type: 'select', options: MATS, def: 'brass' },
    ],
    build(p) {
      const g = MK.ringGear(p), u = g.userData;
      return { group: g, update: spinAll(g), info: [['Średnica podziałowa', mm(u.rp * 2)], ['Średnica zewnętrzna', mm(u.R * 2)], ['Materiał', matName(p.mat)], ['Masa', kg(u.mass)], ['Bezwładność', kgcm2(u.J)]],
        ports: [P('mesh', 'Uzębienie wewnętrzne'), P('body', 'Wieniec (mocowanie / obrót)')] };
    },
  },
  {
    id: 'sprocket', name: 'Koło łańcuchowe', group: 'Łańcuchy',
    params: [
      { key: 'z', label: 'Liczba zębów', type: 'range', min: 9, max: 60, step: 1, def: 18 },
      { key: 'type', label: 'Łańcuch', type: 'select', options: [['06B', '06B (9,525 mm)'], ['08A', '08A / ANSI 40 (12,7 mm)'], ['10A', '10A / ANSI 50 (15,875 mm)'], ['12A', '12A / ANSI 60 (19,05 mm)']], def: '08A' },
      { key: 'mat', label: 'Materiał', type: 'select', options: MATS, def: 'dark' },
    ],
    build(p) {
      const C = CHAINS[p.type], g = MK.sprocket({ z: p.z, p: C.p, d1: C.d1, w: C.p * 0.57, mat: p.mat }), u = g.userData;
      return { group: g, update: spinAll(g), info: [['Podziałka', mm(C.p, 3)], ['Średnica podziałowa', mm(u.R * 2)], ['Rolka', `Ø ${mm(C.d1, 2)}`], ['Materiał', matName(p.mat)], ['Masa', kg(u.mass)]],
        warn: p.z < 13 ? ['Mniej niż 13 zębów — duża nierównomierność biegu łańcucha (efekt wielokąta).'] : [],
        ports: [P('bore', 'Otwór (wał)'), P('chain', 'Łańcuch')] };
    },
  },
  {
    id: 'chain', name: 'Napęd łańcuchowy', group: 'Łańcuchy',
    params: [
      { key: 'z1', label: 'Zęby — koło czynne', type: 'range', min: 9, max: 40, step: 1, def: 15 },
      { key: 'z2', label: 'Zęby — koło bierne', type: 'range', min: 9, max: 80, step: 1, def: 32 },
      { key: 'type', label: 'Łańcuch', type: 'select', options: [['06B', '06B'], ['08A', '08A'], ['10A', '10A'], ['12A', '12A']], def: '08A' },
      { key: 'a', label: 'Odległość osi (ok.)', type: 'range', min: 0.15, max: 0.8, step: 0.01, unit: 'mm', def: 0.35 },
    ],
    build(p) {
      const C = CHAINS[p.type], D = MK.chainDistance(p.z1, p.z2, C.p, Math.max(p.a, (C.p / (2 * Math.sin(Math.PI / p.z1)) + C.p / (2 * Math.sin(Math.PI / p.z2))) * 1.3));
      const g = new THREE.Group(), s1 = MK.sprocket({ z: p.z1, p: C.p, d1: C.d1, w: C.p * 0.57 }), s2 = MK.sprocket({ z: p.z2, p: C.p, d1: C.d1, w: C.p * 0.57 });
      s1.position.set(0, -D.D / 2, 0); s2.position.set(0, D.D / 2, 0); g.add(s1, s2);
      const path = MK.loopPath({ y: -D.D / 2, z: 0, r: D.R1, k: p.z1 / TAU }, { y: D.D / 2, z: 0, r: D.R2, k: p.z2 / TAU }, C.p);
      s1.userData.spin.children.forEach((c) => { c.rotation.x = path.a1; }); s2.userData.spin.children.forEach((c) => { c.rotation.x = path.a2 - path.U2 * TAU / p.z2; });
      const ch = MK.chainLoop(path, D.N, { p: C.p, d1: C.d1, type: p.type }); g.add(ch);
      return { group: g, view: { yaw: 1.25, pitch: 0.2 }, update: (t) => { s1.userData.spin.rotation.x = t; s2.userData.spin.rotation.x = t * p.z1 / p.z2 + path.seat.phase2; ch.userData.update(t * p.z1 / TAU); },
        info: [['Przełożenie', `i = ${p.z2}/${p.z1} = ${(p.z2 / p.z1).toLocaleString('pl', { maximumFractionDigits: 3 })}`], ['Kierunek', 'ten sam'], ['Liczba ogniw', `${D.N} (parzysta — bez ogniwa przejściowego)`], ['Odległość osi (dobrana)', mm(D.D)], ['Długość łańcucha', mm(D.N * C.p, 0)], ['Masa łańcucha', kg(ch.userData.mass)]],
        ports: [P('in', 'Wał koła czynnego (wejście)'), P('out', 'Wał koła biernego (wyjście)')] };
    },
  },
  {
    id: 'pulley', name: 'Koło pasowe', group: 'Pasy',
    params: [
      { key: 'd', label: 'Średnica skuteczna', type: 'range', min: 0.05, max: 0.4, step: 0.005, unit: 'mm', def: 0.16 },
      { key: 'profile', label: 'Profil rowka', type: 'select', options: [['SPZ', 'SPZ'], ['SPA', 'SPA'], ['SPB', 'SPB']], def: 'SPA' },
      { key: 'grooves', label: 'Liczba rowków', type: 'range', min: 1, max: 5, step: 1, def: 1 },
      { key: 'mat', label: 'Materiał', type: 'select', options: MATS, def: 'iron' },
    ],
    build(p) {
      const g = MK.pulley(p), u = g.userData, dmin = { SPZ: 0.063, SPA: 0.09, SPB: 0.14 }[p.profile];
      return { group: g, update: spinAll(g), warn: p.d < dmin ? [`Średnica poniżej najmniejszej zalecanej dla ${p.profile} (${mm(dmin, 0)}) — pas szybko się zużyje.`] : [],
        info: [['Szerokość wieńca', mm(u.w)], ['Ramiona', u.spokes ? `${u.spokes}` : 'tarcza pełna'], ['Materiał', matName(p.mat)], ['Masa', kg(u.mass)], ['Bezwładność', kgcm2(u.J)]],
        ports: [P('bore', 'Otwór (wał)'), P('belt', `Pas ${p.profile}${p.grooves > 1 ? ` × ${p.grooves}` : ''}`)] };
    },
  },
  {
    id: 'belt', name: 'Napęd pasowy', group: 'Pasy',
    params: [
      { key: 'd1', label: 'Koło czynne', type: 'range', min: 0.063, max: 0.3, step: 0.005, unit: 'mm', def: 0.1 },
      { key: 'd2', label: 'Koło bierne', type: 'range', min: 0.063, max: 0.4, step: 0.005, unit: 'mm', def: 0.2 },
      { key: 'profile', label: 'Profil', type: 'select', options: [['SPZ', 'SPZ'], ['SPA', 'SPA'], ['SPB', 'SPB']], def: 'SPA' },
      { key: 'grooves', label: 'Liczba pasów', type: 'range', min: 1, max: 4, step: 1, def: 2 },
      { key: 'a', label: 'Odległość osi', type: 'range', min: 0.2, max: 0.8, step: 0.01, unit: 'mm', def: 0.4 },
    ],
    build(p) {
      const g = new THREE.Group(), a = Math.max(p.a, (p.d1 + p.d2) * 0.6), q1 = MK.pulley({ d: p.d1, profile: p.profile, grooves: p.grooves }), q2 = MK.pulley({ d: p.d2, profile: p.profile, grooves: p.grooves });
      q1.position.set(0, -a / 2, 0); q2.position.set(0, a / 2, 0); g.add(q1, q2);
      const path = MK.loopPath({ y: -a / 2, z: 0, r: p.d1 / 2, k: p.d1 / 2 }, { y: a / 2, z: 0, r: p.d2 / 2, k: p.d2 / 2 }, 1);
      const L = Math.round(path.L * 1000), belt = MK.beltLoop(path, { profile: p.profile, grooves: p.grooves, label: `${p.profile} ${L} Lw` }); g.add(belt);
      const wrap = Math.PI - 2 * Math.asin((p.d2 - p.d1) / (2 * a));
      return { group: g, view: { yaw: 1.25, pitch: 0.2 }, update: (t) => { q1.userData.spin.rotation.x = t; q2.userData.spin.rotation.x = t * p.d1 / p.d2; belt.userData.update(t * p.d1 / 2); },
        warn: wrap < 120 * Math.PI / 180 ? ['Kąt opasania koła czynnego poniżej 120° — pas może się ślizgać.'] : [],
        info: [['Przełożenie', `i = ${Math.round(p.d2 * 1000)}/${Math.round(p.d1 * 1000)} = ${(p.d2 / p.d1).toLocaleString('pl', { maximumFractionDigits: 3 })}`], ['Kierunek', 'ten sam'], ['Długość pasa (skuteczna)', `${L} mm`], ['Kąt opasania (koło czynne)', `${Math.round(wrap * 180 / Math.PI)}°`], ['Masa pasów', kg(belt.userData.mass)]],
        ports: [P('in', 'Wał koła czynnego (wejście)'), P('out', 'Wał koła biernego (wyjście)')] };
    },
  },
  {
    id: 'shaft', name: 'Wał', group: 'Wały i łożyska',
    params: [
      { key: 'len', label: 'Długość', type: 'range', min: 0.1, max: 1.5, step: 0.01, unit: 'mm', def: 0.6 },
      { key: 'd', label: 'Średnica', type: 'select', options: [[0.012, 'Ø 12'], [0.02, 'Ø 20'], [0.025, 'Ø 25'], [0.03, 'Ø 30'], [0.04, 'Ø 40'], [0.05, 'Ø 50']], def: 0.025 },
      { key: 'mat', label: 'Materiał', type: 'select', options: MATS, def: 'steel' },
      { key: 'key', label: 'Rowek wpustu', type: 'check', def: true },
    ],
    build(p) {
      const g = MK.shaft({ len: p.len, r: p.d / 2, mat: p.mat, key: p.key }); g.position.x = -p.len / 2; const h = new THREE.Group(); h.add(g); const u = g.userData;
      const kt = u.phys.k;   // G·J_p / L — z danych wału (MechKit.PHYS, G wg materiału)
      return { group: h, update: spinAll(g), info: [['Masa', kg(u.mass)], ['Bezwładność', kgcm2(u.J)], ['Materiał', matName(p.mat)], ['Sztywność skrętna', `${Math.round(kt).toLocaleString('pl')} N·m/rad (${(kt * Math.PI / 180).toLocaleString('pl', { maximumFractionDigits: 1 })} N·m na 1°)`], ['Smukłość l/d', Math.round(p.len / p.d).toString()]],
        ports: [P('a', 'Koniec A'), P('b', 'Koniec B'), P('mid', 'Osadzenie (koła, sprzęgła, łożyska)')] };
    },
  },
  {
    id: 'bearing', name: 'Łożysko w oprawie', group: 'Wały i łożyska',
    params: [
      { key: 'd', label: 'Otwór (wał)', type: 'select', options: [[0.02, 'Ø 20 (UCP204)'], [0.025, 'Ø 25 (UCP205)'], [0.03, 'Ø 30 (UCP206)'], [0.04, 'Ø 40 (UCP208)']], def: 0.025 },
      { key: 'h', label: 'Wysokość osi', type: 'range', min: 0.03, max: 0.6, step: 0.005, unit: 'mm', def: 0.12 },
    ],
    build(p) {
      const g = MK.pillowBlock({ h: Math.max(p.h, p.d / 0.025 * 0.034), r: p.d / 2, name: 'Łożysko UCP' }), s = shaftBit(0.3, p.d / 2); s.position.y = g.userData.h; g.add(s);
      return { group: g, rest: true, update: (t) => { s.userData.spin.rotation.x = t; }, info: [['Oprawa', 'żeliwo, stojąca, z otworami pod śruby'], ['Łożysko', 'kulkowe zwykłe, wkładka z wkrętami'], ['Wysokość osi', mm(g.userData.h)], ['Masa (ok.)', kg(g.userData.mass)]],
        ports: [P('shaft', 'Wał (podparcie obrotowe)', 'podparcie'), P('base', 'Podstawa (mocowanie)', 'mocowanie')] };
    },
  },
  {
    id: 'jaw', name: 'Sprzęgło kłowe', group: 'Sprzęgła',
    params: [
      { key: 'r', label: 'Średnica zewnętrzna', type: 'range', min: 0.03, max: 0.12, step: 0.002, unit: 'mm×2', def: 0.064 },
      { key: 'spider', label: 'Gwiazda', type: 'select', options: Object.entries(MK.SPIDER).map(([k, v]) => [k, v.name]), def: '92A' },
    ],
    build(p) {
      const r = p.r / 2, c = MK.jawCoupling({ r, bore: Math.min(0.0125, r * 0.4), spider: p.spider }), g = new THREE.Group(), spin = new THREE.Group(); g.add(spin); spin.add(c.a, c.spider, c.b);
      const sa = shaftBit(0.12, Math.min(0.0125, r * 0.4)), sb = shaftBit(0.12, Math.min(0.0125, r * 0.4)); sa.position.x = -0.12 - 0.04; sb.position.x = 0.04; g.add(sa, sb);
      return { group: g, update: (t) => { spin.rotation.x = t; sa.userData.spin.rotation.x = t; sb.userData.spin.rotation.x = t; },
        info: [['Rodzaj', 'podatne, kłowe (3 kły na piaście)'], ['Gwiazda', MK.SPIDER[p.spider].name], ['Sztywność skrętna (wielkość 19)', `${c.phys.k.toLocaleString('pl')} N·m/rad`], ['Tłumienie', p.spider === '64D' ? 'małe (twarda)' : 'duże (miękka)'], ['Kompensuje', 'niewspółosiowość, tłumi drgania'], ['Masa', kg(c.mass)]],
        ports: [P('a', 'Piasta A'), P('b', 'Piasta B')] };
    },
  },
  {
    id: 'flange', name: 'Sprzęgło kołnierzowe', group: 'Sprzęgła',
    params: [
      { key: 'd', label: 'Średnica kołnierza', type: 'range', min: 0.07, max: 0.2, step: 0.005, unit: 'mm', def: 0.11 },
      { key: 'bolts', label: 'Liczba śrub', type: 'select', options: [[3, '3'], [4, '4'], [6, '6'], [8, '8']], def: 6 },
    ],
    build(p) {
      const c = MK.flangeCoupling({ r: p.d / 2, bolts: p.bolts }), g = new THREE.Group(), spin = new THREE.Group(); g.add(spin); spin.add(c.a, c.b, c.bolts);
      const sa = shaftBit(0.12), sb = shaftBit(0.12); sa.position.x = -0.12 - 0.045; sb.position.x = 0.045; g.add(sa, sb);
      return { group: g, update: (t) => { spin.rotation.x = t; sa.userData.spin.rotation.x = t; sb.userData.spin.rotation.x = t; },
        info: [['Rodzaj', 'sztywne — wymaga współosiowości'], ['Śruby', `${p.bolts} × M8, klasa 8.8`], ['Masa', kg(c.mass)]],
        ports: [P('a', 'Kołnierz A'), P('b', 'Kołnierz B')] };
    },
  },
  {
    id: 'cardan', name: 'Przegub Cardana', group: 'Sprzęgła',
    params: [
      { key: 'beta', label: 'Kąt łamania', type: 'range', min: 0, max: 45, step: 1, unit: '°', def: 30 },
      { key: 'double', label: 'Podwójny (układ Z)', type: 'check', def: false },
    ],
    build(p) {
      const b = p.beta * Math.PI / 180, g = new THREE.Group(), dir = new THREE.Vector3(Math.cos(b), 0, Math.sin(b)), q = new THREE.Quaternion().setFromUnitVectors(X, dir), L = 0.35;
      const zq = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
      // wał czynny wzdłuż x, kończy się przegubem w (0, 0, 0); widełki — sworznie wzdłuż y
      const sA = MK.shaft({ len: 0.3 }); sA.position.x = -0.35; { const y = MK.yoke(); y.position.x = 0.35; sA.userData.spin.add(y); } g.add(sA);
      // wał za przegubem (pochylony o β): pojedynczy — wał bierny, podwójny — wał pośredni z drugimi widełkami
      const sB = MK.shaft({ len: (p.double ? L : 0.3) - 0.1, r: p.double ? 0.015 : 0.0125 }); sB.userData.spin.children.forEach((c) => { c.position.x += 0.05; }); sB.quaternion.copy(q); g.add(sB);
      { const y = MK.yoke(); y.rotation.set(Math.PI / 2, Math.PI, 0); sB.userData.spin.add(y); }
      const cr1 = MK.cross(); g.add(cr1);
      const d = createDrive(), e = { a: d.add({ id: 'a', J: 0, frame: { o: new THREE.Vector3(), axis: X, ref: Y } }), b: d.add({ id: 'b', J: 0, frame: { o: new THREE.Vector3(), axis: dir, ref: Y } }) };
      d.connect('a', 'out', 'b', 'in', 'ujoint', { pinA: Y.clone(), pinB: zq.clone() });
      let sC = null, cr2 = null;
      if (p.double) {
        const J2 = dir.clone().multiplyScalar(L);
        { const y = MK.yoke(); y.rotation.x = Math.PI / 2; y.position.x = L; sB.userData.spin.add(y); }   // widełki w tej samej płaszczyźnie (układ Z)
        sC = MK.shaft({ len: 0.3 }); sC.position.copy(J2); { const y = MK.yoke(); y.rotation.y = Math.PI; sC.userData.spin.add(y); } g.add(sC);
        cr2 = MK.cross(); cr2.position.copy(J2); g.add(cr2);
        e.c = d.add({ id: 'c', J: 0, frame: { o: J2.clone(), axis: X, ref: Y } });
        d.connect('b', 'out', 'c', 'in', 'ujoint', { pinA: zq.clone(), pinB: Y.clone() });
      }
      d.solve('a');
      const pose = (cr, pinA, ta, axA, pinB, tb, axB) => {
        const a = pinA.clone().applyAxisAngle(axA, ta), bb = pinB.clone().applyAxisAngle(axB, tb); bb.addScaledVector(a, -bb.dot(a)).normalize();
        cr.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(a, bb), a, bb));
      };
      const out = p.double ? e.c : e.b, f3 = (v) => v.toLocaleString('pl', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
      const info = () => [['Kąt łamania', `${p.beta}°`], ['Przełożenie chwilowe', `ω₂/ω₁ = ${f3(Math.abs(out.r || 1))}`], ['Wał pośredni / bierny (pojedynczy)', `${f3(Math.cos(b))} … ${f3(1 / Math.cos(b))} × ω₁`], ['Wyjście', p.double ? 'równomierne — układ Z znosi nierównomierność' : 'nierównomierne — przyspiesza i zwalnia 2 razy na obrót']];
      return { group: g, live: info, info: info(), view: { yaw: 0.35, pitch: 0.55 }, ports: [P('in', 'Wał czynny'), P('out', 'Wał bierny')],
        update: (t) => {
          d.pose(t); sA.userData.spin.rotation.x = e.a.theta; sB.userData.spin.rotation.x = e.b.theta;
          pose(cr1, Y, e.a.theta, X, zq, e.b.theta, dir);
          if (p.double) { sC.userData.spin.rotation.x = e.c.theta; pose(cr2, zq, e.b.theta, dir, Y, e.c.theta, X); }
        } };
    },
  },
  {
    id: 'motor', name: 'Silnik elektryczny', group: 'Napęd',
    params: [
      { key: 'kW', label: 'Moc', type: 'select', options: MK.MOTORS.map((m) => [m.kW, `${String(m.kW).replace('.', ',')} kW (wielkość ${m.frame})`]), def: 1.1 },
      { key: 'poles', label: 'Liczba biegunów', type: 'select', options: [[2, '2 — 3000 obr/min'], [4, '4 — 1500 obr/min'], [6, '6 — 1000 obr/min']], def: 4 },
      { key: 'paint', label: 'Kolor', type: 'select', options: [['paintBlue', 'niebieski RAL 5010'], ['paintGrey', 'szary RAL 7031'], ['paintRed', 'czerwony RAL 3000']], def: 'paintBlue' },
    ],
    build(p) {
      const g = MK.motor(p), u = g.userData, h = new THREE.Group(); g.position.y = -u.H; h.add(g);
      return { group: h, rest: true, update: spinAll(g),
        info: [['Wielkość mechaniczna', `${u.spec.frame} (oś ${mm(u.H, 0)} nad łapami)`], ['Obroty synchroniczne', `${Math.round(u.nSync)} obr/min`], ['Obroty znamionowe (ok.)', `${Math.round(u.nRated)} obr/min`], ['Moment znamionowy', `${u.Tn.toLocaleString('pl', { maximumFractionDigits: 1 })} N·m`], ['Wał', `Ø ${mm(u.shaftD, 0)} × ${mm(u.shaftL, 0)}`], ['Masa', kg(u.mass)], ['Bezwładność wirnika', kgcm2(u.J)]],
        ports: [P('out', 'Wał wyjściowy'), P('power', 'Zasilanie 3 × 400 V', 'energia elektryczna'), P('base', 'Łapy (mocowanie)', 'mocowanie')] };
    },
  },
  {
    id: 'brake', name: 'Hamulec tarczowy', group: 'Napęd',
    params: [
      { key: 'd', label: 'Średnica tarczy', type: 'range', min: 0.1, max: 0.35, step: 0.005, unit: 'mm', def: 0.2 },
      { key: 't', label: 'Grubość', type: 'range', min: 0.004, max: 0.02, step: 0.001, unit: 'mm', def: 0.008 },
      { key: 'vents', label: 'Otwory', type: 'range', min: 0, max: 24, step: 1, def: 12 },
    ],
    build(p) {
      const g = MK.discBrake(p), u = g.userData, s = shaftBit(0.3); g.userData.spin.add(s);
      return { group: g, update: spinAll(g), info: [['Masa tarczy', kg(u.mass)], ['Bezwładność', kgcm2(u.J)], ['Zacisk', 'jednotłoczkowy, pływający']],
        ports: [P('shaft', 'Wał (obciążenie)', 'obciążenie'), P('ctl', 'Docisk zacisku', 'sterowanie')] };
    },
  },
];
