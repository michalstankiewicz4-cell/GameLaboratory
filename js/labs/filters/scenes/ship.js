// Scena: okręt z ShipKit morskiego (ORP Błyskawica, ORP Orzeł) na falach, z kołysaniem (sprężyny tłumione, jak w
// laboratorium wyglądu).
import * as THREE from '../../../../vendor/three/three.module.js';
import { buildShip, SHIPS } from '../../../models/ships-sea/index.js';

export function shipScene(id) {
  return {
    id: 'sea/' + id, label: SHIPS[id].info.name, surface: 'sea',
    build(stage) {
      const model = buildShip(id, { detail: 1 }), root = new THREE.Group(); root.add(model.group);
      root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      stage.setShip(SHIPS[id].lines, model.beam);
      const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()).length();
      const m = { h: 0, p: 0, r: 0, vh: 0, vp: 0, vr: 0 }, half = (SHIPS[id].lines.zBow - SHIPS[id].lines.zStern) / 2, b = model.beam / 2;
      return {
        root, size, target: new THREE.Vector3(0, box.getCenter(new THREE.Vector3()).y * 0.6, 0),
        update(dt) {
          const h = stage.heightAt, hb = h(0, half), hs = h(0, -half), hp = h(-b, 0), hst = h(b, 0);
          const sp = (x, v, tg, T, z) => { const w = 2 * Math.PI / T, a = w * w * (tg - x) - 2 * z * w * v; return [x + (v + a * dt) * dt, v + a * dt]; };
          [m.h, m.vh] = sp(m.h, m.vh, (hb + hs + hp + hst) / 4 - 0.05, 5.5, 0.55);
          [m.p, m.vp] = sp(m.p, m.vp, Math.atan((hb - hs) / (2 * half)), 4.8, 0.5);
          [m.r, m.vr] = sp(m.r, m.vr, Math.atan((hst - hp) / (2 * b)) * 1.3, 8.5, 0.12);
          root.position.y = m.h; root.rotation.set(-m.p, 0, m.r);
        },
        dispose() { stage.setShip(null); },
      };
    },
  };
}
