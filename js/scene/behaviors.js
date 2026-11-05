// Zachowania w scenie: podpięcie zachowań z js/behaviors/ do obiektów sceny (prefabrykatów). Silnik, wspólny dla edytora
// i gier. Obiekt sceny wybiera zachowanie polem `behavior` (id stąd); bez niego stoi w miejscu.
// Adapter: create(obj, built, world) → { step(dt, input, t), state, hud(), reset() }; built — model w scenie ({ root, kit }:
// root — grupa obiektu, kit — to, co zwrócił kit), world — { surface, waves } ze sceny bazowej, t — czas fal. Adapter ustawia root (położenie, obrót)
// i ruchome części modelu; dane sceny (pos, rot) zostają nietknięte — po „Stop” obiekt wraca na swoje miejsce.
// Sterowanie (input): { throttle, rudder, elevator, aileron, flaps, gear, brake } z klawiatury gracza; obiekty, którymi
// gracz nie steruje, dostają {} (silnik bez mocy, stery na środku).
import * as THREE from '../../vendor/three/three.module.js';
import { createShip, shipDef } from '../behaviors/water/ship.js';
import { createFlight } from '../behaviors/air/flight.js';

const D2R = Math.PI / 180;
const quatOf = (q, o = new THREE.Quaternion()) => o.set(q[1], q[2], q[3], q[0]);   // [w, x, y, z] → THREE

// liczby ruchu okrętów (gdy model ich nie podaje): masa [kg], moc na śrubach [W], prędkość maksymalna [m/s]
const SHIP_NUMBERS = {
  'sea/blyskawica': { mass: 2.14e6, power: 40.3e6, vmax: 20.3 },   // 2144 t, 54 000 shp, 39,5 w
  'sea/orzel': { mass: 1.1e6, power: 3.5e6, vmax: 10.2 },          // 1100 t na powierzchni, 2 × 2370 KM, 19,8 w
};

export const BEHAVIORS = {
  ship: {
    label: 'Ship on water', labelPl: 'Okręt na wodzie', env: 'water', throttle: [-0.4, 1],
    fits: (prefabId) => prefabId.startsWith('sea/'),
    keys: 'W / S: throttle · A / D: rudder',
    keysPl: 'W / S: maszyny · A / D: ster',
    create(obj, built, world) {
      const k = built.kit || {}, def = shipDef(k, SHIP_NUMBERS[obj.prefab] || {});
      const sim = createShip(def, { x: obj.pos[0], z: obj.pos[2], th: obj.rot[1] * D2R });
      const s = sim.state, root = built.root;
      return {
        state: s,
        step(dt, c, t) {
          sim.step(dt, { throttle: c.throttle || 0, rudder: c.rudder || 0 }, world.waves, t, () => world.surface === 'sea');
          root.position.set(s.x, s.heave + obj.pos[1], s.z);
          root.rotation.set(-s.pitch, s.th, s.roll, 'YXZ');
        },
        hud: () => ({ speed: s.vf * 1.94384, unit: 'kn', throttle: s.throttle, aground: s.aground }),
        reset() {},
      };
    },
  },
  flight: {
    label: 'Flight in the atmosphere', labelPl: 'Lot w atmosferze', env: 'land', throttle: [0, 1],
    fits: (prefabId) => prefabId.startsWith('air/'),
    keys: 'W / S: throttle · ↑ ↓: elevator (take-off: hold ↓ on the roll) · ← →: ailerons · Q / E: rudder · B: brakes · G: gear · F: flaps',
    keysPl: 'W / S: gaz · ↑ ↓: ster wysokości (start: na rozbiegu trzymaj ↓) · ← →: lotki · Q / E: ster kierunku · B: hamulce · G: podwozie · F: klapy',
    create(obj, built, world) {
      const k = built.kit || {}, info = k.def || k.info || {};
      const F = info.flight, mass = info.mass || 2700;
      if (!F) return null;
      const rest = info.rest || { y: 2, pitch: 0 }, onGround = obj.pos[1] < 3;
      const sim = createFlight(F, mass, { p: [obj.pos[0], onGround ? rest.y : obj.pos[1], obj.pos[2]], yaw: obj.rot[1] * D2R, pitch: onGround ? -rest.pitch : 0 });
      const s = sim.state, root = built.root;
      if (!onGround) { const fwd = sim.qRot(s.q, [0, 0, 1]), v0 = (info.maxSpeed || 120) * 0.6; s.v = fwd.map((x) => x * v0); }   // w powietrzu: start w locie
      let thr = onGround ? 0 : 0.7, tAcc = 0;
      return {
        state: s,
        step(dt, c) {
          if (c.throttle != null) thr = Math.max(0, Math.min(1, c.throttle));
          const ctrl = { throttle: thr, elevator: c.elevator || 0, aileron: c.aileron || 0, rudder: c.rudder || 0, flaps: c.flaps ? 1 : 0, gear: c.gear === false ? 0 : 1, brake: c.brake || 0 };
          const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;   // stały mały krok fizyki
          for (let i = 0; i < n; i++) sim.step(h, ctrl, () => 0);
          root.position.fromArray(s.p); quatOf(s.q, root.quaternion);
          tAcc += dt; if (k.update) k.update(tAcc, dt, { ...ctrl, gear: ctrl.gear === 1, speed: s.V });   // śmigło, stery, podwozie
        },
        // po „Stop”: części modelu jak na postoju (podwozie wypuszczone, klapy schowane, śmigło stoi)
        reset() { if (k.update) for (let i = 0; i < 200; i++) k.update(0, 0.05, { throttle: 0, gear: true, flaps: 0 }); },
        hud: () => ({ speed: s.ias * 3.6, unit: 'km/h', alt: s.p[1], throttle: thr, stall: s.stall, crashed: s.crashed, onGround: s.onGround }),
      };
    },
  },
};

// zachowania, które pasują do prefabrykatu (lista w oknie Właściwości)
export const behaviorsFor = (prefabId) => Object.entries(BEHAVIORS).filter(([, b]) => b.fits(prefabId)).map(([id]) => id);
// zachowanie domyślne nowego obiektu: pierwsze pasujące albo żadne
export const defaultBehavior = (prefabId) => behaviorsFor(prefabId)[0] || '';
// zachowanie obiektu w grze: pole behavior albo domyślne; tylko takie, które pasuje do prefabrykatu
export function behaviorOf(obj) {
  const id = obj.behavior == null ? defaultBehavior(obj.prefab) : obj.behavior;
  return id && BEHAVIORS[id] && BEHAVIORS[id].fits(obj.prefab) ? id : '';
}
