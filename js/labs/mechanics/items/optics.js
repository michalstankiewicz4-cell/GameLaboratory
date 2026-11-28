// Optyka i sygnały (kategoria 5): lustro.
// Przedmiot: { id, name, group, params, build(p) → { group, update(θ), info, live?, warn?, ports } } (opis w ../items.js).
import * as THREE from '../../../../vendor/three/three.module.js';
import * as OK from '../../../models/mech/optics.js';
import { reflect, closest, waveColor } from '../../../behaviors/land/mech/optics.js';
import { T } from '../lang.js';
import { Y, mm, kg, P, num } from './util.js';

export const OPTICS = [
  {
    id: 'mirror', name: 'Lustro', group: 'Optyka',
    params: [
      { key: 'shape', label: 'Kształt', type: 'select', options: [['flat', 'płaskie'], ['concave', 'wklęsłe (sferyczne)'], ['convex', 'wypukłe (sferyczne)']], def: 'concave' },
      { key: 'D', label: 'Średnica', type: 'select', options: [[0.0127, 'Ø 12,7 mm (1/2")'], [0.0254, 'Ø 25,4 mm (1")'], [0.0508, 'Ø 50,8 mm (2")']], def: 0.0254 },
      { key: 'R', label: 'Promień krzywizny', type: 'range', min: 0.1, max: 1, step: 0.05, unit: 'mm', def: 0.2 },
      { key: 'coating', label: 'Powłoka', type: 'select', options: Object.entries(OK.COATINGS).map(([k, v]) => [k, v.name]), def: 'al' },
      { key: 'substrate', label: 'Podłoże', type: 'select', options: Object.entries(OK.SUBSTRATES).map(([k, v]) => [k, v.name]), def: 'bk7' },
      { key: 'angle', label: 'Kąt obrotu lustra', type: 'range', min: 0, max: 60, step: 1, unit: '°', def: 10 },
      { key: 'nm', label: 'Długość fali', type: 'select', options: [[405, '405 nm (fiolet)'], [532, '532 nm (zieleń)'], [633, '633 nm (czerwień, HeNe)'], [1064, '1064 nm (podczerwień)']], def: 633 },
      { key: 'w', label: 'Szerokość wiązki', type: 'range', min: 0.002, max: 0.05, step: 0.001, unit: 'mm', def: 0.018 },
      { key: 'n', label: 'Liczba promieni', type: 'range', min: 3, max: 15, step: 2, def: 9 },
    ],
    build(p) {
      const m = OK.mirror({ shape: p.shape, D: p.D, R: p.R, coating: p.coating, substrate: p.substrate }), u = m.userData, O = u.optics;
      const th = p.angle * Math.PI / 180; u.api.setAngle(th);
      const g = new THREE.Group(); g.add(m); g.updateMatrixWorld(true);
      const frame = O.surface.matrixWorld.clone(), yc = u.axisY, Z0 = 0.32, col = waveColor(p.nm), ir = p.nm > 750;
      const beam = new THREE.Group(); beam.userData.doctorOk = 'floating'; g.add(beam);   // promienie i ognisko — obraz, nie część modelu
      const mat = (o) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: o * (ir ? 0.35 : 1), depthWrite: false });
      const matV = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, depthWrite: false });
      const seg = (a, b, mt, r = 0.00035) => { const L = a.distanceTo(b); if (L < 1e-6) return; const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 6, 1, true), mt); c.position.copy(a).add(b).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(Y, b.clone().sub(a).normalize()); beam.add(c); };
      const dash = (a, b, mt, step = 0.006) => { const L = a.distanceTo(b), d = b.clone().sub(a).normalize(); for (let s = 0; s < L; s += step * 2) seg(a.clone().addScaledVector(d, s), a.clone().addScaledVector(d, Math.min(L, s + step)), mt, 0.0003); };
      const w = Math.min(p.w, 0.06), N = p.n, hits = [];
      let miss = 0;
      for (let i = 0; i < N; i++) {
        const x = N > 1 ? -w / 2 + w * i / (N - 1) : 0, o = new THREE.Vector3(x, yc, Z0), h = reflect({ o, d: new THREE.Vector3(0, 0, -1), I: 1 }, O, frame, p.nm);
        if (!h) { miss++; seg(o, new THREE.Vector3(x, yc, -0.12), mat(0.5)); continue; }
        seg(o, h.p, mat(0.95)); hits.push({ x, ...h });
      }
      // ognisko z promieni: zbliżenie każdego promienia odbitego z promieniem środkowym (płaszczyzna padania)
      const chief = hits.reduce((a, h) => (!a || Math.abs(h.x) < Math.abs(a.x) ? h : a), null);
      const cr = chief && Number.isFinite(O.R) ? hits.filter((h) => h !== chief).map((h) => ({ x: Math.abs(h.x), c: closest(chief.p, chief.d, h.p, h.d) })).filter((q) => q.c) : [];
      const sorted = cr.sort((a, b) => a.x - b.x), fIn = sorted.length ? sorted[0].c.s : NaN, fs = sorted.map((q) => q.c.s), spread = fs.length ? Math.max(...fs) - Math.min(...fs) : 0;
      const Lr = Number.isFinite(fIn) ? Math.max(0.15, Math.abs(fIn) * 1.5) : 0.3;
      for (const h of hits) {
        seg(h.p, h.p.clone().addScaledVector(h.d, Lr), mat(0.95 * h.I));
        if (fIn < 0) dash(h.p, h.p.clone().addScaledVector(h.d, fIn * 1.3), matV);   // przedłużenie wstecz — ognisko pozorne za lustrem
      }
      if (chief) dash(chief.p, chief.p.clone().addScaledVector(chief.n, 0.07), new THREE.MeshBasicMaterial({ color: 0x9aa3ab, transparent: true, opacity: 0.6 }), 0.004);   // normalna w punkcie padania
      if (chief && Number.isFinite(fIn)) {
        const F = chief.p.clone().addScaledVector(chief.d, fIn), mk = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 16, 12), fIn > 0 ? new THREE.MeshBasicMaterial({ color: 0xffffff }) : new THREE.MeshBasicMaterial({ color: col, wireframe: true }));
        mk.position.copy(F); beam.add(mk);
      }
      const R633 = O.refl(p.nm), f = O.f, ft = f * Math.cos(th), fsag = f / Math.cos(th);
      const kind = { flat: 'lustro płaskie', concave: 'lustro wklęsłe sferyczne', convex: 'lustro wypukłe sferyczne' }[p.shape];
      const warn = [];
      if (miss) warn.push(`Część wiązki mija lustro (${miss} ${T('z', 'of')} ${N} promieni) — wiązka szersza niż lustro widziane pod kątem.`);
      if (Number.isFinite(f) && p.angle > 5) warn.push(`Lustro sferyczne pod kątem ${p.angle}° — astygmatyzm: ognisko w płaszczyźnie padania f·cos θ = ${mm(Math.abs(ft))}, w płaszczyźnie prostopadłej f / cos θ = ${mm(Math.abs(fsag))}.`);
      if (ir) warn.push('Podczerwień — wiązki nie widać gołym okiem (pokazana umownie, przygaszona).');
      if (R633 < 0.8) warn.push(`Powłoka słabo odbija przy ${p.nm} nm (${num(R633 * 100, 1)} %) — reszta jest pochłaniana albo przechodzi.`);
      const fmtF = (v) => (Number.isFinite(v) ? `${mm(Math.abs(v))} (${v > 0 ? 'rzeczywista, przed lustrem' : 'pozorna, za lustrem'})` : '∞ (wiązka równoległa zostaje równoległa)');
      return { group: g, rest: true, warn, update: () => {}, view: { yaw: 0.9, pitch: 0.75 },
        info: [['Rodzaj', kind], ['Średnica', mm(p.D)], ['Grubość', mm(O.t)], ['Promień krzywizny', Number.isFinite(O.R) ? mm(Math.abs(O.R)) : '∞'], ['Ogniskowa f = R/2', fmtF(f)], ['Strzałka czaszy', Number.isFinite(O.R) ? `${num(Math.abs(O.sag) * 1e6, 1)} µm` : '0'],
          ['Powłoka', OK.COATINGS[p.coating].name], ['Odbicie', `${num(R633 * 100, 1)} % przy ${p.nm} nm`], ['Podłoże', OK.SUBSTRATES[p.substrate].name], ['Płaskość powierzchni', O.flatness],
          ['Kąt padania = kąt odbicia', `${p.angle}°`], ['Odchylenie wiązki', `${2 * p.angle}° (2 × kąt obrotu lustra)`],
          ...(Number.isFinite(f) ? [['Ognisko z promieni', `${Number.isFinite(fIn) ? mm(Math.abs(fIn), 2) : '—'} od lustra (teoria f·cos θ = ${mm(Math.abs(ft), 2)})`], ['Aberracja (rozrzut ognisk)', `${mm(spread, 2)} dla wiązki ${mm(w, 0)}`]] : []),
          ['Masa szkła', kg(u.glassMass)], ['Masa z uchwytem (ok.)', kg(u.mass)]],
        ports: [P('in', 'Promień padający', 'światło'), P('out', 'Promień odbity', 'światło'), P('mount', 'Podstawa (mocowanie, śruba M6)', 'obrót')] };
    },
  },
];
