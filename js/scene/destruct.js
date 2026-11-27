// Zniszczenie w scenie (zachowanie „destruct”, środowisko ląd): budynki z części (rodzina houses — HouseKit i budynki
// Warszawy z części) w jednym świecie DestructKit na scenę (js/behaviors/land/destruct/world.js). Silnik, wspólny dla
// edytora (▶ Graj) i gier. Trąba powietrzna / tornado z pogody sceny (stage.tornado, stage.windAt) niszczy części
// w promieniu 3 rdzeni, a lekkie odłamki unosi; część bez podparcia spada. Do pierwszego uszkodzenia widać model
// prefabrykatu (houseModel z js/models/houses/house-model.js albo budynek CityKit), potem części świata (onReveal chowa model).
//   createSceneDestruct({ scene, groundAt, windAt, tornado }) → { addHouse(house, built, { x, z, rot }), hud(bld), frame(dt), stop() }
//   destructBehavior                       wpis zachowania dla js/scene/behaviors.js (BEHAVIORS.destruct)
// Opis: docs/scene/README.md („Zniszczenie w scenie”).
import { createWorld } from '../behaviors/land/destruct/world.js';

const D2R = Math.PI / 180;

export function createSceneDestruct({ scene, groundAt, windAt, tornado }) {
  const world = createWorld(scene, { ground: (x, z) => { const h = groundAt(x, z); return h == null ? 0 : h; }, wind: (x, y, z, out) => windAt(x, y, z, out) });
  const shown = new Map();   // budynek świata → model prefabrykatu (chowany przy odsłonięciu)
  world.onReveal((bld) => { const b = shown.get(bld); if (b) b.root.visible = false; });
  return {
    world,
    addHouse(house, built, { x = 0, z = 0, rot = 0 } = {}) { const bld = world.addHouse(house, { x, z, rot, hidden: true }); shown.set(bld, built); return bld; },
    // linia stanu: ile części stoi i ile budynku zniszczono
    hud(bld) {
      const intact = bld.parts.filter((p) => p.state === 'intact').length;
      return [['parts', `${intact}/${bld.parts.length}`], ['destroyed', `${Math.round(100 * (bld.vol0 ? bld.volGone / bld.vol0 : 0))}%`]];
    },
    frame(dt) {
      const T = tornado();
      world.tornadoDamage(T, windAt, dt);   // DestructKit: części w promieniu 3 rdzeni, gruz się budzi
      if (dt > 0) world.update(dt);
    },
    stop() { world.dispose(); for (const b of shown.values()) b.root.visible = true; shown.clear(); },
  };
}

export const destructBehavior = {
  label: 'Destruction (breaks as it is built)', labelPl: 'Zniszczenie (pęka tak, jak jest zbudowany)', env: 'land', throttle: [0, 0], lodFree: true,
  fits: (prefabId) => prefabId.startsWith('houses/'),
  keys: 'the tornado from the scene\'s weather breaks it', keysPl: 'niszczy go tornado z pogody sceny',
  // world.destruct — wspólny świat zniszczeń sceny (createSceneDestruct; tworzy go gra przy pierwszym budynku)
  create(obj, built, world) {
    const k = built.kit || {}, D = world.destruct; if (!k.house || !D) return null;
    const bld = D.addHouse(k.house, built, { x: obj.pos[0], z: obj.pos[2], rot: ((obj.rot && obj.rot[1]) || 0) * D2R });
    return { state: {}, step() {}, hud: () => ({ speed: 0, unit: '', throttle: 0, machine: D.hud(bld) }), reset() {} };
  },
};
