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
import { createThrust } from '../behaviors/space/thrust.js';
import { createDrive, driveDef } from '../behaviors/land/drive.js';

const D2R = Math.PI / 180;
const quatOf = (q, o = new THREE.Quaternion()) => o.set(q[1], q[2], q[3], q[0]);   // [w, x, y, z] → THREE

// liczby ruchu okrętów (gdy model ich nie podaje): masa [kg], moc na śrubach [W], prędkość maksymalna [m/s]
const SHIP_NUMBERS = {
  'sea/blyskawica': { mass: 2.14e6, power: 40.3e6, vmax: 20.3 },   // 2144 t, 54 000 shp, 39,5 w
  'sea/orzel': { mass: 1.1e6, power: 3.5e6, vmax: 10.2 },          // 1100 t na powierzchni, 2 × 2370 KM, 19,8 w
};

// liczby statków kosmicznych — ZAŁOŻONE (statki są wymyślone, nie mają danych): masa [kg], ciąg główny i wsteczny [N],
// moment silniczków manewrowych [N·m], moment bezwładności [kg·m²]; Codewing ok. 2 g, dron zwinniejszy, rojowiec lżejszy
const SPACE_NUMBERS = {
  'space/codewing': { mass: 2.0e4, thrust: 4.0e5, reverse: 1.0e5, torque: 1.2e5, inertia: 4.0e5 },
  'space/scribe': { mass: 2.0e3, thrust: 3.0e4, reverse: 1.5e4, torque: 1.0e4, inertia: 1.5e4 },
  'space/swarmer': { mass: 6.0e3, thrust: 1.5e5, reverse: 4.0e4, torque: 4.0e4, inertia: 8.0e4 },
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
          sim.step(dt, { throttle: c.throttle || 0, rudder: c.rudder || 0 }, world.waves, t, (x, z) => (world.isWater ? world.isWater(x, z) : world.surface === 'sea'));   // teren z laboratorium lądu: mielizny i brzeg
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
          const gh = world.groundAt || (() => 0);   // teren z laboratorium lądu albo poziom 0
          for (let i = 0; i < n; i++) sim.step(h, ctrl, gh);
          root.position.fromArray(s.p); quatOf(s.q, root.quaternion);
          tAcc += dt; if (k.update) k.update(tAcc, dt, { ...ctrl, gear: ctrl.gear === 1, speed: s.V });   // śmigło, stery, podwozie
        },
        // po „Stop”: części modelu jak na postoju (podwozie wypuszczone, klapy schowane, śmigło stoi)
        reset() { if (k.update) for (let i = 0; i < 200; i++) k.update(0, 0.05, { throttle: 0, gear: true, flaps: 0 }); },
        hud: () => ({ speed: s.ias * 3.6, unit: 'km/h', alt: s.p[1], throttle: thr, stall: s.stall, crashed: s.crashed, onGround: s.onGround }),
      };
    },
  },
  drive: {
    label: 'Driving on land', labelPl: 'Jazda po lądzie', env: 'land', throttle: [-1, 1], lever: false,
    fits: (prefabId) => prefabId.startsWith('road/'),
    keys: 'W / S: accelerate / brake and reverse · A / D: steer',
    keysPl: 'W / S: gaz / hamulec i wsteczny · A / D: skręt',
    create(obj, built, world) {
      const k = built.kit || {}, sim = createDrive(driveDef(k.def || {}), { x: obj.pos[0], z: obj.pos[2], yaw: obj.rot[1] * D2R });
      const s = sim.state, root = built.root;
      // grunt i woda ze sceny bazowej: teren z laboratorium lądu, płaski grunt; na morzu dno głęboko — auto tonie i staje
      const ground = { height: (x, z) => { const h = world.terrainAt ? world.terrainAt(x, z) : 0; return h == null ? 0 : h; }, water: (x, z) => (world.waterLevel ? world.waterLevel(x, z) : null) };
      let tAcc = 0, pedal = 0;
      return {
        state: s,
        step(dt, c) {
          const yaw0 = s.yaw, input = { throttle: c.throttle || 0, steer: -(c.rudder || 0) };   // D — w prawo
          pedal = input.throttle;
          sim.step(dt, input, ground);
          const gy = ground.height(s.x, s.z);
          root.position.set(s.x, gy, s.z); root.rotation.set(0, s.yaw, 0, 'YXZ');
          const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
          tAcc += dt;
          if (k.update) k.update(tAcc, dt, { speed: s.speed, steer: input.steer, turn: (s.yaw - yaw0) / Math.max(1e-4, dt),
            contact: (x, z) => ground.height(s.x + x * cy + z * sy, s.z - x * sy + z * cy) - gy });   // koła, zawieszenie, światła hamowania
        },
        hud: () => ({ speed: s.speed * 3.6, unit: 'km/h', throttle: pedal, aground: s.depth > 0.5 }),   // aground: w wodzie
        reset() { if (k.update) k.update(0, 0.05, { speed: 0, steer: 0, turn: 0 }); },
      };
    },
  },
  thrust: {
    label: 'Thrust in vacuum', labelPl: 'Ciąg w próżni', env: 'space', throttle: [-1, 1],
    fits: (prefabId) => !!SPACE_NUMBERS[prefabId],
    keys: 'W / S: main engine / reverse (lever) · ↑ ↓: pitch · ← →: yaw · Q / E: roll · nothing pressed: thrusters stop the rotation',
    keysPl: 'W / S: silnik główny / wsteczny (dźwignia) · ↑ ↓: pochylenie · ← →: kurs · Q / E: przechył · bez klawiszy: silniczki zatrzymują obrót',
    create(obj, built) {
      const k = built.kit || {}, sim = createThrust(SPACE_NUMBERS[obj.prefab], { p: [...obj.pos], yaw: obj.rot[1] * D2R, pitch: -obj.rot[0] * D2R });
      const s = sim.state, root = built.root;
      let tAcc = 0;
      return {
        state: s,
        step(dt, c) {
          const thr = c.throttle || 0;
          sim.step(dt, { throttle: thr, pitch: c.elevator || 0, yaw: -(c.aileron || 0), roll: c.rudder || 0 });   // ↓ — nos w górę (jak w samolocie), → — kurs w prawo
          root.position.fromArray(s.p); quatOf(s.q, root.quaternion);
          tAcc += dt; if (k.update) k.update(tAcc, dt, { power: Math.max(0, thr) });   // płomienie silników
        },
        hud: () => ({ speed: s.speed, unit: 'm/s', throttle: s.thrust >= 0 ? s.thrust / sim.def.thrust : s.thrust / sim.def.reverse }),
        reset() { if (k.update) k.update(0, 0.05, { power: 0 }); },
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
