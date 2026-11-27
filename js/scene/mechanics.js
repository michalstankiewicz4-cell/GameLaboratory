// Układ silnika w scenie (prefabrykat mech/machine i zachowanie „mechanics”, środowisko ląd; z laboratorium mechaniki):
// model układu (js/models/mech/assemblies/engine-layout/ — maszyna, instalacja, regulator; bez posadzki i lamp hali)
// i fizyka układu (js/behaviors/land/mech/engine-layout.js). W ▶ Graj ta sama fizyka co w trybie Fizyka laboratorium:
// obwód (wyłącznik, stycznik, przyciski, grzybek, przełącznik I-0-II, potencjometr), falownik, silnik z poślizgiem,
// luz z brył zębów, sprężystość, poślizg pasa, straty; hamulec 20 N·m na wyjściu. Obsługa myszą na modelach: klik —
// wyłącznik, przycisk, przełącznik; przeciąganie w górę / w dół — pokrętło (pointer() — wywołuje gra, js/scene/behaviors.js).
//   buildEngineLayout() → { root, kit: { group, mc, reg, elecG, ELEC, physics } }    prefabrykat
//   mechanicsBehavior                                                 wpis zachowania (BEHAVIORS.mechanics)
// Opis: docs/scene/README.md („Układ silnika w scenie”).
import * as THREE from '../../vendor/three/three.module.js';
import { buildEngineLayout as buildModel } from '../models/mech/assemblies/engine-layout/engine-layout.js';
import { createEngineLayoutPhysics } from '../behaviors/land/mech/engine-layout.js';

const TAU = Math.PI * 2, BRAKE = 20;   // N·m na wale wyjściowym (jak domyślnie w laboratorium)

// prefabrykat: model układu (bez posadzki i lamp hali — stoi na gruncie sceny); fizyka układu tworzona raz, przy
// pierwszym ▶ Graj (kit.physics)
export function buildEngineLayout() {
  const m = buildModel({ hall: false });
  m.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  let P = null;
  return { root: m.group, kit: { ...m, get physics() { return P || (P = createEngineLayoutPhysics({ mc: m.mc })); } } };
}

export const mechanicsBehavior = {
  label: 'Machine: physics and wiring', labelPl: 'Maszyna: fizyka i obwód', env: 'land', throttle: [0, 0], lodFree: true,
  fits: (prefabId) => prefabId === 'mech/machine',
  keys: 'mouse: click switches and buttons, drag the knobs up / down', keysPl: 'myszą: klik — wyłączniki i przyciski, przeciąganie w górę / w dół — pokrętła',
  create(obj, built) {
    const k = built.kit || {}; if (!k.mc || !k.ELEC) return null;
    const { reg, ELEC } = k, P = k.physics, phys = P.phys, ray = new THREE.Raycaster();
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
        P.step(Math.min(0.05, dt), { reg, ELEC, brake: BRAKE });
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
