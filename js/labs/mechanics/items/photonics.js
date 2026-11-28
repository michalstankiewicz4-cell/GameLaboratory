// Optyka i sygnały (kategoria 5, etap 5): soczewka, pryzmat, laser, źródło LED ze szczeliną, fotodioda, ekran.
// Promienie śledzone fizycznie (js/behaviors/land/mech/raytrace.js: Snell, Fresnel, Sellmeier), wiązki — js/render/optics/beams.js.
// Przedmiot: { id, name, group, params, build(p) → { group, update(θ), tick?, info, live?, warn?, ports } } (opis w ../items.js).
import * as THREE from '../../../../vendor/three/three.module.js';
import * as OK from '../../../models/mech/optics/index.js';
import * as RT from '../../../behaviors/land/mech/raytrace.js';
import { createBeams } from '../../../render/optics/beams.js';
import { T } from '../lang.js';
import { mm, kg, num, portsOf } from './util.js';

const GL_OPT = Object.entries(RT.GLASS).map(([k, v]) => [k, v.name]);
const deg = (r) => `${num(r * 180 / Math.PI, 2)}°`;
// śledzenie w układzie przedmiotu (grupa podglądu przesuwa się po budowie — liczymy przy grupie w zerze)
function local(g, fn) { const p = g.position.clone(), q = g.quaternion.clone(); g.position.set(0, 0, 0); g.quaternion.identity(); g.updateMatrixWorld(true); const r = fn(); g.position.copy(p); g.quaternion.copy(q); g.updateMatrixWorld(true); return r; }
// wiązka równoległa (wachlarz w płaszczyźnie poziomej) wzdłuż +z na wysokości osi
const fan = (n, w, z0, nms) => { const out = []; for (const nm of nms) for (let i = 0; i < n; i++) { const x = n > 1 ? -w / 2 + w * i / (n - 1) : 0; out.push({ o: new THREE.Vector3(x, OK.AXIS_Y, z0), d: new THREE.Vector3(0, 0, 1), I: 1, nm, x }); } return out; };
// przecięcie promienia wychodzącego z osią (x = 0) w płaszczyźnie poziomej
function axisCross(res) { const s = res.path.filter((q) => q[2] > 0.3).pop(); if (!s) return NaN; const d = s[1].clone().sub(s[0]); if (Math.abs(d.x) < 1e-9) return Infinity; return s[0].z - s[0].x * d.z / d.x; }

export const PHOTONICS = [
  {
    id: 'lens', name: 'Soczewka', group: 'Optyka',
    params: [
      { key: 'kind', label: 'Rodzaj', type: 'select', options: [['biconvex', 'dwuwypukła'], ['planoconvex', 'płasko-wypukła'], ['planoconcave', 'płasko-wklęsła'], ['biconcave', 'dwuwklęsła']], def: 'biconvex' },
      { key: 'f', label: 'Ogniskowa', type: 'range', min: 0.05, max: 0.3, step: 0.01, unit: 'mm', def: 0.1 },
      { key: 'D', label: 'Średnica', type: 'select', options: [[0.0127, 'Ø 12,7 mm (1/2")'], [0.0254, 'Ø 25,4 mm (1")']], def: 0.0254 },
      { key: 'glass', label: 'Szkło', type: 'select', options: GL_OPT, def: 'bk7' },
      { key: 'w', label: 'Szerokość wiązki', type: 'range', min: 0.002, max: 0.024, step: 0.001, unit: 'mm', def: 0.018 },
      { key: 'light', label: 'Światło', type: 'select', options: [[633, '633 nm (czerwień)'], ['rgb', 'białe: 486 · 587 · 656 nm (F, d, C)']], def: 633 },
    ],
    build(p) {
      const L = OK.lens({ kind: p.kind, f: p.f, D: p.D, glass: p.glass }), u = L.userData, O = u.optics, g = new THREE.Group(); g.add(L);
      const beams = createBeams({ max: 400 }); g.add(beams.group);
      const nms = p.light === 'rgb' ? [486.1, 587.6, 656.3] : [+p.light], w = Math.min(p.w, p.D - 0.002), conc = p.kind.includes('concave');
      const det = OK.screen({}); det.position.z = conc ? 0.12 : Math.min(0.35, p.f * 1.6); g.add(det);
      const res = local(g, () => { const S = RT.sceneOf([L, det]); const segs = [], spots = [], focus = {}; for (const r of fan(9, w, -0.15, nms)) { const t = RT.trace(S, r); t.path.forEach((s) => segs.push({ a: s[0], b: s[1], I: s[2], nm: s[3] })); t.hits.forEach((h) => spots.push(h)); if (Math.abs(r.x) > 1e-9) (focus[r.nm] = focus[r.nm] || []).push([Math.abs(r.x), axisCross(t)]); } return { segs, spots, focus }; });
      beams.set(res.segs, res.spots);
      const fz = (nm, which) => { const a = (res.focus[nm] || []).sort((x, y) => x[0] - y[0]); return a.length ? (which === 'in' ? a[0][1] : a[a.length - 1][1]) : NaN; };
      const nm0 = nms[Math.floor(nms.length / 2)], bfl = fz(nm0, 'in') - O.tc / 2, sa = fz(nm0, 'in') - fz(nm0, 'out');
      const info = [['Promienie krzywizny R₁ / R₂', `${Number.isFinite(O.R1) ? mm(O.R1, 1) : '∞'} / ${Number.isFinite(O.R2) ? mm(O.R2, 1) : '∞'}`], ['Grubość środkowa', mm(O.tc, 2)], ['Współczynnik załamania n_d (587,6 nm)', num(RT.nGlass(p.glass, 587.6), 5)], ['Liczba Abbego V_d', num(RT.abbe(p.glass), 1)],
        ['Ogniskowa (soczewka cienka)', `${mm(p.f * (conc ? -1 : 1), 1)}`], [conc ? 'Ognisko pozorne (przedłużenia promieni)' : 'Tylna odległość ogniskowa (z promieni)', mm(Math.abs(bfl), 2)], ['Aberracja sferyczna (podłużna)', `${mm(Math.abs(sa), 2)} ${T('dla wiązki', 'for a beam of')} ${mm(w, 0)}`]];
      if (nms.length === 3) info.push(['Aberracja chromatyczna f(C) − f(F)', mm(Math.abs(fz(656.3, 'in') - fz(486.1, 'in')), 2)]);
      info.push(['Odbicie na powierzchniach (Fresnel, bez powłoki)', `${num(RT.fresnel(1, RT.nGlass(p.glass, nm0), 1) * 100, 2)} % ${T('na każdej', 'on each')}`], ['Masa (z oprawką)', kg(u.mass)]);
      return { group: g, rest: true, view: { yaw: 1.1, pitch: 0.55 }, update() {}, info, ports: portsOf(L) };
    },
  },
  {
    id: 'prism', name: 'Pryzmat', group: 'Optyka',
    params: [
      { key: 'type', label: 'Rodzaj', type: 'select', options: [['equilateral', 'równoboczny 60°'], ['rightangle', 'prostokątny 45°-90°-45°']], def: 'equilateral' },
      { key: 'glass', label: 'Szkło', type: 'select', options: GL_OPT, def: 'f2' },
      { key: 'rot', label: 'Obrót stolika', type: 'range', min: -60, max: 60, step: 0.5, unit: '°', def: -24 },
      { key: 'light', label: 'Światło', type: 'select', options: [['white', 'białe (LED)'], [650, 'laser 650 nm'], [532, 'laser 532 nm'], [405, 'laser 405 nm']], def: 'white' },
    ],
    build(p) {
      const Pm = OK.prism({ type: p.type, glass: p.glass }), u = Pm.userData, g = new THREE.Group(); g.add(Pm); u.setAngle(p.rot * Math.PI / 180);
      const beams = createBeams({ max: 600 }); g.add(beams.group);
      const nms = p.light === 'white' ? RT.WHITE_LED.map((q) => q[0]) : [+p.light];
      const res = local(g, () => { const S = RT.sceneOf([Pm]); const segs = [], dev = {}; for (const nm of nms) for (const y of [-0.002, 0, 0.002]) { const t = RT.trace(S, { o: new THREE.Vector3(0, OK.AXIS_Y + y, -0.12), d: new THREE.Vector3(0, 0, 1), I: 1, nm }, { maxLen: 0.25 }); t.path.forEach((s) => segs.push({ a: s[0], b: s[1], I: s[2], nm })); const out = t.path.filter((s) => s[2] > 0.4).pop(); if (y === 0 && out && t.path.length > 1) { const d = out[1].clone().sub(out[0]).normalize(); dev[nm] = Math.acos(Math.max(-1, Math.min(1, d.z))); } } return { segs, dev }; });
      beams.set(res.segs, []);
      const n = (nm) => RT.nGlass(p.glass, nm), A = p.type === 'equilateral' ? Math.PI / 3 : Math.PI / 4, Dmin = 2 * Math.asin(Math.min(1, n(587.6) * Math.sin(A / 2))) - A;
      const ds = Object.values(res.dev), spread = ds.length > 1 ? Math.max(...ds) - Math.min(...ds) : 0;
      const warn = !ds.length ? [T('Światło nie wychodzi przez drugą ścianę (całkowite wewnętrzne odbicie albo chybienie) — obróć stolik.', 'Light does not exit through the second face (total internal reflection or a miss) — rotate the table.')] : [];
      return { group: g, rest: true, view: { yaw: 0.0, pitch: 1.1 }, warn, update() {},
        info: [['n przy 486 / 587,6 / 656 nm', `${num(n(486.1), 4)} / ${num(n(587.6), 4)} / ${num(n(656.3), 4)}`], ['Liczba Abbego', num(RT.abbe(p.glass), 1)], ['Kąt łamiący', deg(A)], ['Odchylenie najmniejsze (587,6 nm)', deg(Dmin)],
          ['Odchylenie wiązki (śledzone)', ds.length ? (nms.length > 1 ? `${deg(Math.min(...ds))} … ${deg(Math.max(...ds))}` : deg(ds[0])) : '—'], ['Rozszczepienie (450–680 nm)', nms.length > 1 ? deg(spread) : '—'], ['Kąt graniczny (całkowite odbicie)', deg(Math.asin(1 / n(587.6)))], ['Masa (ze stolikiem)', kg(u.mass)]],
        ports: portsOf(Pm) };
    },
  },
  {
    id: 'laser', name: 'Laser', group: 'Optyka',
    params: [
      { key: 'nm', label: 'Długość fali', type: 'select', options: [[405, '405 nm (fiolet)'], [520, '520 nm (zieleń)'], [650, '650 nm (czerwień)'], [850, '850 nm (podczerwień)']], def: 650 },
      { key: 'mW', label: 'Moc', type: 'select', options: [[0.5, '0,5 mW'], [1, '1 mW'], [5, '5 mW']], def: 1 },
    ],
    build(p) {
      const Lz = OK.laser({ nm: +p.nm, mW: +p.mW }), u = Lz.userData, g = new THREE.Group(); g.add(Lz); u.setOn(true);
      const sc = OK.screen({}); sc.position.z = 0.4; g.add(sc);
      const beams = createBeams({}); g.add(beams.group);
      const r = local(g, () => RT.simulate(RT.sceneOf([sc]), [u.emitter])); beams.set(r.segs, r.spots);
      const E = 6.626e-34 * 2.998e8 / (p.nm * 1e-9), cls = p.mW <= 1 ? '2' : '3R';
      const warn = p.nm > 750 ? [T('Podczerwień — wiązki nie widać, a oko nie zamyka się odruchowo: niebezpieczna nawet przy małej mocy.', 'Infrared — the beam is invisible and the blink reflex does not help: dangerous even at low power.')] : [];
      return { group: g, rest: true, view: { yaw: 1.2, pitch: 0.45 }, warn, update() {},
        info: [['Klasa lasera (EN 60825-1)', cls], ['Średnica wiązki (1/e²)', mm(2 * u.emitter.w0, 1)], ['Rozbieżność (połowa kąta)', `${num(u.emitter.div * 1000, 2)} mrad`], ['Średnica plamki w 1 m', mm(2 * (u.emitter.w0 + u.emitter.div), 1)], ['Energia fotonu', `${num(E / 1.602e-19, 2)} eV`], ['Strumień fotonów', `${num(p.mW / 1000 / E / 1e15, 2)} · 10¹⁵ /s`]],
        ports: portsOf(Lz) };
    },
  },
  {
    id: 'ledSource', name: 'Źródło LED ze szczeliną', group: 'Optyka',
    params: [{ key: 'color', label: 'Światło', type: 'select', options: [['white', 'białe (niebieski chip + luminofor)'], [470, '470 nm'], [590, '590 nm'], [630, '630 nm']], def: 'white' }],
    build(p) {
      const white = p.color === 'white', S = OK.ledSource({ color: white ? 'white' : 'mono', nm: white ? 590 : +p.color }), u = S.userData, g = new THREE.Group(); g.add(S); u.setOn(true);
      const sc = OK.screen({}); sc.position.z = 0.25; g.add(sc);
      const beams = createBeams({}); g.add(beams.group);
      const r = local(g, () => RT.simulate(RT.sceneOf([sc]), [u.emitter])); beams.set(r.segs, r.spots);
      return { group: g, rest: true, view: { yaw: 1.2, pitch: 0.4 }, update() {},
        info: [['Szczelina', '1 × 6 mm'], ['Widmo', white ? T('szczyt 450 nm (chip) + szerokie 530–620 nm (luminofor)', 'peak 450 nm (chip) + broad 530–620 nm (phosphor)') : `${p.color} nm (± 15 nm)`], ['Moc elektryczna', '3 W'], ['Moc w wiązce za szczeliną', `${num(u.emitter.P * 1000, 2)} mW`]],
        ports: portsOf(S) };
    },
  },
  {
    id: 'photodiode', name: 'Fotodioda z miernikiem', group: 'Optyka',
    params: [
      { key: 'nm', label: 'Długość fali lasera', type: 'select', options: [[405, '405 nm'], [520, '520 nm'], [650, '650 nm'], [850, '850 nm']], def: 650 },
      { key: 'mW', label: 'Moc lasera', type: 'select', options: [[0.5, '0,5 mW'], [1, '1 mW'], [5, '5 mW']], def: 1 },
      { key: 'Rf', label: 'Wzmacniacz transimpedancyjny', type: 'select', options: [[1e3, '1 kΩ'], [1e4, '10 kΩ'], [1e5, '100 kΩ']], def: 1e4 },
    ],
    build(p) {
      const Lz = OK.laser({ nm: +p.nm, mW: +p.mW }), pd = OK.photodiode({}), g = new THREE.Group(); g.add(Lz, pd); pd.position.z = 0.25; Lz.userData.setOn(true);
      const beams = createBeams({}); g.add(beams.group);
      const r = local(g, () => RT.simulate(RT.sceneOf([pd]), [Lz.userData.emitter])); beams.set(r.segs, r.spots);
      const P = r.power.get(pd) || 0, R = RT.siResponsivity(+p.nm), I = R * P, V = I * p.Rf; pd.userData.setReading(P, I);
      const warn = V > 10 ? [T(`Napięcie wyjściowe ${num(V, 1)} V — wzmacniacz w nasyceniu (zasilanie ±12 V), zmniejsz wzmocnienie.`, `Output ${num(V, 1)} V — amplifier saturated (±12 V supply), reduce the gain.`)] : [];
      return { group: g, rest: true, view: { yaw: 1.2, pitch: 0.45 }, warn, update() {},
        info: [['Moc padająca (okienko 10 × 10 mm)', `${num(P * 1e6, 1)} µW`], ['Czułość krzemu przy tej fali', `${num(R, 3)} A/W`], ['Fotoprąd I = R·P', `${num(I * 1e6, 1)} µA`], ['Napięcie wyjścia U = I·Rf', `${num(V, 3)} V`], ['Odbicie na okienku (Fresnel)', T('ok. 4 % (szkło bez powłoki)', 'approx. 4 % (uncoated glass)')], ['Prąd ciemny', '≈ 1 nA (20 °C)']],
        ports: [...portsOf(Lz), ...portsOf(pd)] };
    },
  },
];
