// Ruch i sterowanie (kategoria 3) — mechanizmy zegarowe: zapadka z kołem zapadkowym, wychwyt Grahama z wahadłem.
// Przedmiot: { id, name, group, params, build(p) → { group, update(θ), info, live?, warn?, ports } } (opis w ../items.js).
import * as THREE from '../../../../vendor/three/three.module.js';
import * as CL from '../../../models/mech/clock/index.js';
import { escapementGeometry, createEscapement } from '../../../behaviors/land/mech/escapement.js';
import { TAU, mm, kg, P, num, portsOf } from './util.js';

export const TIMEKEEPING = [
  {
    id: 'ratchet', name: 'Zapadka z kołem zapadkowym', group: 'Mechanizmy zapadkowe',
    params: [
      { key: 'z', label: 'Liczba zębów', type: 'range', min: 8, max: 60, step: 1, def: 24 },
      { key: 'R', label: 'Promień wierzchołków', type: 'range', min: 0.01, max: 0.08, step: 0.002, unit: 'mm', def: 0.03 },
      { key: 't', label: 'Szerokość koła', type: 'range', min: 0.002, max: 0.02, step: 0.001, unit: 'mm', def: 0.006 },
    ],
    build(p) {
      const r = CL.ratchet({ z: p.z, R: p.R, t: p.t }), u = r.userData, tauA = 200e6, F = tauA * p.t * u.R * u.step * 0.5, Tm = F * (u.R - u.h);
      const g = new THREE.Group(); g.add(r);
      let beta = 0, prevB = 0, clicks = 0;
      const live = () => [['Kąt zapadki', `${num(beta * 180 / Math.PI, 1)}°`], ['Przeskoki (kliknięcia)', String(clicks)]];
      return { group: g, rest: false, view: { yaw: 0, pitch: 0.1 }, live,
        update: (t) => { u.setAngle(t); beta = u.pawlAngle(t); if (beta - prevB < -0.02) clicks++; prevB = beta; },
        info: [['Działanie', 'obrót przeciwny do zegara — zapadka przeskakuje po grzbietach; wstecz — zapadka blokuje na czole zęba'], ['Podziałka kątowa', `${num(360 / p.z, 2)}°`], ['Wysokość zęba', mm(u.h, 2)], ['Luz (ruch wstecz do zablokowania)', `do ${num(360 / p.z, 1)}°`],
          ['Moment trzymania (ok., ścinanie zęba, τ = 200 MPa)', `${num(Tm, 1)} N·m`], ['Materiał', 'koło — stal hartowana polerowana, zapadka — stal oksydowana'], ['Masa koła', kg(u.mass)], ...live()],
        ports: portsOf(r) };
    },
  },
  {
    id: 'escapement', name: 'Wychwyt Grahama z wahadłem', group: 'Wahadła i wychwyty',
    params: [
      { key: 'L', label: 'Długość wahadła', type: 'select', options: [[0.248, '0,248 m (okres 1 s)'], [0.5, '0,5 m'], [0.994, '0,994 m (sekundowe, okres 2 s)']], def: 0.248 },
      { key: 'mb', label: 'Masa soczewki', type: 'range', min: 0.2, max: 3, step: 0.1, unit: 'kg', def: 0.8 },
      { key: 'Te', label: 'Moment na kole wychwytowym', type: 'range', min: 0.1, max: 3, step: 0.05, unit: 'mN·m', def: 0.8 },
      { key: 'Q', label: 'Dobroć wahadła Q', type: 'range', min: 200, max: 6000, step: 100, def: 1500 },
      { key: 'lift', label: 'Kąt podnoszenia (impuls)', type: 'range', min: 0.6, max: 3, step: 0.1, unit: '°', def: 1.4 },
      { key: 'lock', label: 'Kąt spoczynku', type: 'range', min: 0.2, max: 1.5, step: 0.1, unit: '°', def: 0.6 },
    ],
    build(p) {
      const Gm = escapementGeometry({ z: 30, Re: 0.03, liftDeg: p.lift, lockDeg: p.lock }), M = CL.materials();
      const g = new THREE.Group(), wheel = CL.escapeWheel(Gm), anc = CL.anchor(Gm), Lb = p.L * 0.97, pend = CL.pendulum({ L: Lb, bobR: Math.min(0.075, 0.028 * Math.cbrt(p.mb / 0.15)), bobT: 0.03, mass: p.mb });
      const Hb = p.L + 0.2, A = [0, Hb - 0.06], E = [0, A[1] - Gm.H];
      wheel.position.set(E[0], E[1], 0.03); anc.position.set(A[0], A[1], 0.03); pend.position.set(A[0], A[1], 0.012); g.add(wheel, anc, pend);
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.16, Hb - 0.03, 0.018), M.walnut); board.position.set(0, 0.03 + (Hb - 0.03) / 2, -0.012); const base = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.2), M.walnut); base.position.set(0, 0.015, 0.03);
      const cock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.05), M.brassF); cock.position.set(0, A[1] + 0.012, 0.018);
      const arb = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.05, 12).rotateX(Math.PI / 2), M.steelP); arb.position.set(E[0], E[1], 0.015); const arb2 = arb.clone(); arb2.position.set(A[0], A[1], 0.015);
      for (const o of [board, base, cock]) { o.castShadow = o.receiveShadow = true; } g.add(board, base, cock, arb, arb2);
      const rho = 8100, mr = rho * Math.PI * 0.003 ** 2 * (Lb + 0.06), Jp = p.mb * Lb * Lb + mr * (Lb + 0.06) ** 2 / 3, mgl = 9.81 * (p.mb * Lb + mr * (Lb + 0.06) / 2);
      const Je = wheel.userData.J + 2e-6, esc = createEscapement(Gm, { Jp, mgl, Q: p.Q, Je, phi0: Math.max(0.035, (p.lift + p.lock) * Math.PI / 180 * 1.6), theta0: 0.01 });
      const T0 = TAU * Math.sqrt(Jp / mgl);
      let t = 0, amp = 0, lastW = 0, lastCross = null, period = NaN, beats = 0;
      const sync = () => { anc.rotation.z = esc.state.phi; pend.rotation.z = esc.state.phi; wheel.rotation.z = esc.state.theta; };
      sync();
      const live = () => [['Amplituda wahadła', `±${num(amp * 180 / Math.PI, 2)}°`], ['Okres zmierzony', Number.isFinite(period) ? `${num(period, 4)} s` : '—'], ['Chód względem wahadła swobodnego', Number.isFinite(period) ? `${num((T0 - period) / T0 * 86400, 1)} s/dobę` : '—'],
        ['Kontakt', esc.state.contact ? `${esc.state.contact === 'left' ? 'paleta wejściowa' : 'paleta wyjściowa'} — ${{ lock: 'spoczynek (koło stoi)', impulse: 'impuls (ząb pcha pochylnię)', back: 'tył palety' }[esc.state.face] || ''}` : 'spadek (koło wolne)'], ['Uderzenia (półokresy)', String(beats)], ['Koło wychwytowe', t > 2 ? `${num(-esc.state.theta / TAU / t * 60, 2)} obr/min (średnio)` : '—']];
      const warn = [];
      if (p.lift + p.lock > 4) warn.push('Duży kąt podnoszenia i spoczynku — wahadło musi mieć dużą amplitudę, błąd okręgu rośnie.');
      return { group: g, rest: true, warn, view: { yaw: 0.35, pitch: 0.2 }, live,
        update: () => {},
        tick: (dt) => {
          const s = esc.step(dt, -p.Te / 1000); t += dt; sync();
          if (Math.sign(s.omega) !== Math.sign(lastW) && lastW !== 0) amp = Math.abs(s.phi);
          if (lastW > 0 && s.omega <= 0) { if (lastCross !== null) period = t - lastCross; lastCross = t; }
          lastW = s.omega; beats = s.beats;
        },
        info: [['Koło wychwytowe', `30 zębów, Ø ${mm(Gm.Re * 2, 0)}, mosiądz`], ['Kotwica', 'stal hartowana, palety z rubinu syntetycznego; obejmuje 7,5 podziałki'], ['Szerokość palety', `${mm(Gm.w, 2)} (pół podziałki − spadek ${mm(Gm.drop, 2)})`], ['Okres wahadła swobodnego', `${num(T0, 4)} s`],
          ['Rodzaj', 'bezodbojowy (Graham, 1715): na łuku spoczynkowym koło stoi, impuls tylko na pochylni'], ...live()],
        ports: [P('wheel', 'Koło wychwytowe (napęd z przekładni)'), P('susp', 'Zawieszenie wahadła (mocowanie)', 'mocowanie')] };
    },
  },
];
