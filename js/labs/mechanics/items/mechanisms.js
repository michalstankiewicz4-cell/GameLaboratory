// Ruch i sterowanie (kategoria 3) — mechanizmy: dźwignia (trzy rodzaje), zatrzask z wyzwalaczem (ramię ze sprężyną
// skrętną, zapadka, elektromagnes) liczony fizycznie na żywo.
// Przedmiot: { id, name, group, params, build(p) → { group, update(θ), tick?, info, live?, warn?, ports } } (opis w ../items.js).
import * as THREE from '../../../../vendor/three/three.module.js';
import * as MC from '../../../models/mech/mechanisms/index.js';
import { materials } from '../../../models/mech/common.js';
import { createLatch } from '../../../behaviors/land/mech/latch.js';
import { T } from '../lang.js';
import { mm, kg, num, portsOf } from './util.js';

export const MECHANISMS = [
  {
    id: 'lever', name: 'Dźwignia', group: 'Dźwignie',
    params: [
      { key: 'cls', label: 'Rodzaj', type: 'select', options: [[1, '1 — podpora między siłą a obciążeniem'], [2, '2 — obciążenie między podporą a siłą'], [3, '3 — siła między podporą a obciążeniem']], def: 1 },
      { key: 'a', label: 'Ramię siły a', type: 'range', min: 0.05, max: 0.5, step: 0.01, unit: 'mm', def: 0.3 },
      { key: 'b', label: 'Ramię obciążenia b', type: 'range', min: 0.02, max: 0.4, step: 0.01, unit: 'mm', def: 0.1 },
      { key: 'F', label: 'Obciążenie', type: 'range', min: 10, max: 2000, step: 10, unit: 'N', def: 300 },
    ],
    build(p) {
      const cls = +p.cls, a = cls === 3 ? Math.min(p.a, p.b - 0.01) : p.a, b = cls === 2 ? Math.min(p.b, a - 0.01) : p.b;
      const L = MC.lever({ a, b, cls }), u = L.userData, g = new THREE.Group(); g.add(L);
      // ciężar na haku pod sworzniem obciążenia (żeliwo, wielkość z masy)
      const m = p.F / 9.81, s = Math.cbrt(m / 7200), M = materials(), wt = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), M.iron), rod = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.06, 8), M.steel);
      g.add(wt, rod);
      const MA = a / b, Fe = p.F / MA, R = cls === 1 ? p.F + Fe : Math.abs(p.F - Fe);
      let th = 0;
      const live = () => [['Kąt dźwigni', `${num(th * 180 / Math.PI, 1)}°`], ['Przesunięcie rączki', mm(Math.abs(a * th), 1)], ['Przesunięcie obciążenia', mm(Math.abs(b * th), 1)]];
      return { group: g, rest: false, view: { yaw: 0.2, pitch: 0.15 }, live,
        update: (t) => { th = 0.25 * Math.sin(t); u.setAngle(th); const q = u.at(th).load; rod.position.set(q.x, q.y - 0.03, 0); wt.position.set(q.x, q.y - 0.06 - s / 2, 0); },
        info: [['Przełożenie siły a / b', `${num(MA, 2)} : 1`], ['Siła na rączce F·b / a', `${num(Fe, 1)} N`], ['Reakcja podpory', `${num(R, 1)} N`], ['Przełożenie drogi', `rączka przesuwa się ${num(MA, 2)} razy dalej niż obciążenie`], ['Praca', 'ta sama po obu stronach (bez tarcia): F·s = Fe·se'], ['Masa dźwigni', kg(u.mass)], ...live()],
        ports: portsOf(L) };
    },
  },
  {
    id: 'latch', name: 'Zatrzask z wyzwalaczem', group: 'Mechanizmy zapadkowe',
    params: [
      { key: 'k', label: 'Sztywność sprężyny skrętnej', type: 'range', min: 0.1, max: 5, step: 0.1, unit: 'N·m/rad', def: 0.8 },
      { key: 'thz', label: 'Kąt napięcia', type: 'range', min: 30, max: 120, step: 5, unit: '°', def: 70 },
      { key: 'sear', label: 'Kąt zaczepu', type: 'range', min: 0, max: 30, step: 1, unit: '°', def: 10 },
      { key: 'mu', label: 'Tarcie zaczep — zapadka μ', type: 'range', min: 0.05, max: 0.4, step: 0.01, def: 0.15 },
    ],
    build(p) {
      const U = MC.latchUnit(), u = U.userData, g = new THREE.Group(); g.add(U);
      const lt = createLatch({ k: p.k, thz: p.thz * Math.PI / 180, sear: p.sear * Math.PI / 180, mu: p.mu }), S = lt.state;
      let lift = 0, cock = 0, plg = 0;
      for (const o of [u.arm]) o.traverse((m) => { if (m.isMesh) m.userData.control = 'cock'; });
      const api = { press: (n) => { if (n === 'trigger') lift = 0.25; if (n === 'cock') cock = 0.6; }, release() {}, drag() {}, tick() {} };
      const live = () => [['Stan', S.engaged ? T('napięty — zapadka w zaczepie', 'cocked — sear engaged') : S.th > -0.2 ? T('w ruchu', 'moving') : T('zwolniony — na zderzaku', 'released — on the stop')], ['Kąt ramienia', `${num(S.th * 180 / Math.PI, 1)}°`], ['Prędkość ramienia', `${num(S.w, 1)} rad/s`], ['Uderzenia w zderzak', String(S.hits)], ['Energia uderzenia w zderzak', `${num(S.Ehit, 3)} J`]];
      return { group: g, controls: true, api, rest: true, view: { yaw: 0.1, pitch: 0.1 }, live, update() {},
        tick: (dt) => {
          if (lift > 0) lift -= dt; if (cock > 0) cock -= dt;
          const push = cock > 0 ? -0.25 + (p.thz * Math.PI / 180 + 0.08 + 0.25) * Math.min(1, (0.6 - cock) / 0.4) : -Infinity;
          plg += ((lift > 0 ? 1 : 0) - plg) * Math.min(1, dt / 0.015);
          lt.step(dt, { lift: plg > 0.5, push }); u.pose(S.th, S.engaged ? 0 : plg, plg);
        },
        info: [['Obsługa', 'klik ramienia — napnij (dźwignią), klik cewki — wyzwól'], ['Siła na zapadce', `${num(lt.hold(), 1)} N`], ['Siła wyzwalania (z tarciem i kątem zaczepu)', `${num(lt.trigger(), 1)} N`], ['Energia sprężyny do uwolnienia', `${num(lt.energy(), 3)} J`], ['Elektromagnes', '24 V DC, ok. 20 W, skok 6 mm'], ...live()],
        ports: portsOf(U) };
    },
  },
];
