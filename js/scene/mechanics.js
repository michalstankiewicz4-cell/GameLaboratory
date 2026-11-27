// Układ silnika w scenie (prefabrykat mech/machine i zachowanie „mechanics”, środowisko ląd; z laboratorium mechaniki):
// maszyna na żeliwnym łożu (js/labs/mechanics/machine.js — bez posadzki i lamp hali) z instalacją elektryczną i regulatorem
// (js/labs/mechanics/physics-mode.js — tryb Fizyka bez okien). W ▶ Graj ta sama fizyka co w trybie Fizyka laboratorium:
// obwód (wyłącznik, stycznik, przyciski, grzybek, przełącznik I-0-II, potencjometr), falownik, silnik z poślizgiem,
// luz z brył zębów, sprężystość, poślizg pasa, straty; hamulec 20 N·m na wyjściu. Obsługa myszą na modelach: klik —
// wyłącznik, przycisk, przełącznik; przeciąganie w górę / w dół — pokrętło (pointer() — wywołuje gra, js/scene/behaviors.js).
//   buildEngineLayout() → { root, kit: { mc, reg, ELEC, phys, … } }    prefabrykat
//   mechanicsBehavior                                                 wpis zachowania (BEHAVIORS.mechanics)
// Opis: docs/scene/README.md („Układ silnika w scenie”).
import * as THREE from '../../vendor/three/three.module.js';
import * as MK from '../models/mech/mechkit.js';
import { buildMachine } from '../labs/mechanics/machine.js';
import { createPhysicsMode } from '../labs/mechanics/physics-mode.js';

const TAU = Math.PI * 2, BRAKE = 20;   // N·m na wale wyjściowym (jak domyślnie w laboratorium)

export function buildEngineLayout() {
  const group = new THREE.Group(), root = new THREE.Group(); group.add(root);
  const M = MK.materials();
  const mc = buildMachine({ scene: group, root, M, hall: false });
  const S = { mode: 'physics', hit: false, brake: BRAKE };
  const ui = { fmt: (v, d = 0) => v.toFixed(d), rpmOf: (w) => w * 60 / TAU, dirOf: () => '', select() {}, showSel() {}, sel: null };
  const pm = createPhysicsMode({ scene: group, root, M, S, save() {}, $: () => null, el: () => null, mc, ui });
  pm.reg.group.visible = true; pm.elecG.visible = true; pm.hitG.visible = false;
  mc.applyAngles();
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root: group, kit: { mc, ...pm } };
}

export const mechanicsBehavior = {
  label: 'Machine: physics and wiring', labelPl: 'Maszyna: fizyka i obwód', env: 'land', throttle: [0, 0], lodFree: true,
  fits: (prefabId) => prefabId === 'mech/machine',
  keys: 'mouse: click switches and buttons, drag the knobs up / down', keysPl: 'myszą: klik — wyłączniki i przyciski, przeciąganie w górę / w dół — pokrętła',
  create(obj, built) {
    const k = built.kit || {}; if (!k.phys || !k.ELEC) return null;
    const { mc, reg, ELEC, phys } = k, ray = new THREE.Raycaster();
    let ctl = null;
    // urządzenie pod promieniem: część z userData.control w jednym z urządzeń instalacji (jak w laboratorium)
    function controlAt(origin, dir) {
      ray.set(origin, dir);
      const h = ray.intersectObjects(ELEC.devices.map((d) => d.group), true)[0]; let o = h && h.object;
      while (o && !o.userData.control) o = o.parent;
      if (!o) return null;
      const d = ELEC.devices.find((t) => { for (let p = o; p; p = p.parent) if (p === t.group) return true; return false; });
      return d ? { name: o.userData.control, api: d.api } : null;
    }
    return {
      state: {},
      step(dt) {
        dt = Math.min(0.05, dt);
        ELEC.tick(dt); reg.api.tick(dt);
        const on = reg.api.powered && (reg.api.run || Math.abs(reg.api.f) > 0.05);
        phys.step(dt, { w0: reg.api.f * Math.PI, brake: BRAKE, on });   // silnik 4-biegunowy: ω_syn = 4π f / p
        ELEC.power(phys.state.Tm, phys.state.omega, on); mc.applyAngles();
      },
      // mysz w grze: 'down' (promień) → czy coś złapano; 'move' (przesunięcie w pikselach w dół); 'up' — puszczenie
      pointer(type, origin, dir, dy) {
        if (type === 'down') { const c = controlAt(origin, dir); if (!c) return false; ctl = c; c.api.press(c.name); return true; }
        if (!ctl) return false;
        if (type === 'move') ctl.api.drag(ctl.name, dy);
        else { ctl.api.release(ctl.name); ctl = null; }
        return true;
      },
      hover: (origin, dir) => !!controlAt(origin, dir),
      hud: () => ({ speed: 0, unit: '', throttle: 0, machine: [['motor', `${Math.round(phys.state.omega * 60 / TAU)} rpm`], ['inverter', `${reg.api.f.toFixed(1)} Hz`], ['power', reg.api.powered ? 'on' : 'off']] }),
      reset() { if (ctl) { ctl.api.release(ctl.name); ctl = null; } },
    };
  },
};
