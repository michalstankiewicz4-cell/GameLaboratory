// Model doctor — przedmioty laboratorium mechaniki (z Tornado.io): katalog js/labs/mechanics/items.js (MechKit,
// ControlKit), ustawienia domyślne i warianty skrajne (MECH_VARIANTS), kąt podglądu 0,4 rad. planeEps 0,2 mm (skala
// przedmiotów); stojące na blacie (rest) — grunt pod spodem.
import * as THREE from '../../../vendor/three/three.module.js';
import { countDraw } from './common.js';
import { ITEMS } from '../../../js/labs/mechanics/items.js';

const done = (root, opts = {}) => { root.updateMatrixWorld(true); return { root, measured: countDraw(root), opts: { planeEps: 0.01, ...opts } }; };
const G = (...objs) => { const g = new THREE.Group(); objs.forEach((o) => g.add(o)); return g; };

// przedmioty mechaniczne: ustawienia domyślne i warianty (krańce zakresów, inne rodzaje); kąt podglądu 0,4 rad
const MECH_VARIANTS = {
  gear: [{}, { z: 9, m: 0.001 }, { z: 120, m: 0.008, w: 0.08 }, { alpha: 14.5, holes: false, hub: false }],
  pair: [{}, { z1: 10, z2: 120, m: 0.005 }], planet: [{}, { n: 4, zp: 18 }, { zs: 12, zp: 60, n: 2 }], ring: [{}, { z: 160, m: 0.003 }],
  sprocket: [{}, { z: 9, type: '06B' }, { z: 60, type: '12A' }], chain: [{}, { z1: 9, z2: 80, type: '12A', a: 0.8 }],
  pulley: [{}, { d: 0.05, profile: 'SPZ' }, { d: 0.4, profile: 'SPB', grooves: 5 }], belt: [{}, { d1: 0.063, d2: 0.4, profile: 'SPB', grooves: 4, a: 0.2 }],
  shaft: [{}, { len: 0.1, d: 0.05, key: false }], bearing: [{}, { d: 0.04, h: 0.6 }], jaw: [{}, { r: 0.12, spider: '64D' }], flange: [{}, { d: 0.2, bolts: 8 }],
  cardan: [{}, { beta: 0 }, { beta: 45, double: true }],
  switch: [{}, { kind: 'main' }, { kind: 'lever', poles: 1 }], estop: [{}], lamp: [{}, { color: 'red' }], selector: [{}, { positions: '0-I', handle: 'long' }], limit: [{}, { actuator: 'plunger' }], contactor: [{}, { amps: 32, coil: '24DC' }],
  wire: [{}, { mm2: 16, color: 'pe', len: 3 }, { mm2: 0.5, color: 'black', len: 0.1 }], ac: [{}, { phases: 3, volts: 400 }], dc: [{}, { volts: 60, amps: 20 }], pot: [{}, { taper: 'log', knob: 'red' }], button: [{}, { lit: true, mode: 'latch' }, { mushroom: true, color: 'red', contact: 'NC' }], vfd: [{}, { kW: 7.5 }, { kW: 0.18 }], motor: [{}, { kW: 0.18, poles: 2 }, { kW: 7.5, poles: 6, paint: 'paintRed' }], brake: [{}, { d: 0.35, t: 0.02, vents: 24 }],
};
export const models = [];
for (const def of ITEMS) (MECH_VARIANTS[def.id] || [{}]).forEach((v, k) => models.push({
  id: `mech/${def.id}${k ? '-' + k : ''}`, label: def.name + (k ? ' (' + Object.entries(v).map(([a, b]) => `${a}=${b}`).join(', ') + ')' : ''), sub: 'land · MechKit / ControlKit', family: 'mech',
  build: () => {
    const p = {}; for (const q of def.params) p[q.key] = v[q.key] ?? q.def;
    const it = def.build(p); it.update(0.4);
    // próg „tej samej płaszczyzny” w skali przedmiotów (mm), nie ulic (domyślne 0,01 m łączyło ścianki odległe o kilka mm)
    const o = { planeEps: 0.0002 }; if (it.rest) o.ground = new THREE.Box3().setFromObject(it.group).min.y;
    return done(G(it.group), o);
  },
}));
