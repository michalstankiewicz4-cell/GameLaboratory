// Podgląd zasięgu dźwięku (jak hitbox): przy zaznaczonym obiekcie z dźwiękiem (pole „sound”) dwie kule — wewnętrzna:
// pełna głośność (zasięg, js/scene/sounds.js rangeOf), zewnętrzna: granica słyszalności (10% głośności, mixer.audible).
// Tylko w edycji (w ▶ Graj schowane); kule poza world.root — nie łapią kliknięć.
import * as THREE from '../../../vendor/three/three.module.js';
import { rangeOf } from '../../../js/scene/sounds.js';
import { audible } from '../../../js/audio/mixer.js';

const COLOR = 0x9a8cff;   // --sound (ui/style/tokens.css)
function sphere(opacity, wire) {
  const g = new THREE.Group();
  const fill = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), new THREE.MeshBasicMaterial({ color: COLOR, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  const lines = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(1, 24, 12)), new THREE.LineBasicMaterial({ color: COLOR, transparent: true, opacity: wire, depthWrite: false }));
  fill.renderOrder = lines.renderOrder = 10; g.add(fill, lines); g.visible = false;
  return g;
}
export function createSoundRange(world, store) {
  const inner = sphere(0.1, 0.45), outer = sphere(0.035, 0.14);
  inner.name = 'sound range (full volume)'; outer.name = 'sound range (audible)';
  world.scene.add(inner, outer);
  let shown = true;
  return {
    get shown() { return shown; }, set shown(v) { shown = !!v; },
    // co klatkę: zaznaczony obiekt, jego zasięg i położenie modelu (uchwyt rusza nim na żywo)
    frame(playing) {
      const o = store.selected, r = o && !playing && shown ? rangeOf(o) : null, root = r && world.objectRoot(o.id);
      inner.visible = outer.visible = !!root;
      if (!root) return;
      root.getWorldPosition(inner.position); outer.position.copy(inner.position);
      inner.scale.setScalar(r); outer.scale.setScalar(audible(r));
    },
  };
}
