// Zderzaki boczne: tuleja (stała) i nurnik z talerzem (ruchomy, userData.x0 = pozycja
// bez ugięcia). Z aTrain (js/app.js: buildBody). sx: +1 przód, −1 tył pudła.
import { BUF_EXT, BUF_Y, BUF_Z } from "../data.js";
import { trainMaterials, cylX } from "../materials.js";
const THREE = window.THREE;

export function buffers(g, Lb, sx, y) {
  const mat = trainMaterials(), heads = [];
  for (const sz of [1, -1]) {
    cylX(g, mat.frame, 0.12, 0.30, sx * (Lb / 2 + 0.15), y(BUF_Y), sz * BUF_Z);
    const head = new THREE.Group(); head.name = "talerz zderzaka"; g.add(head);
    cylX(head, mat.steel, 0.075, 0.32, -sx * 0.18, 0, 0);
    cylX(head, mat.steel, 0.2, 0.04, -sx * 0.02, 0, 0, 28);
    head.userData = { sx, sz, x0: sx * (Lb / 2 + BUF_EXT) };
    head.position.set(head.userData.x0, y(BUF_Y), sz * BUF_Z);
    heads.push(head);
  }
  return heads;
}

// ugięcie zderzaka [m]
export function setBuffer(head, comp) { head.position.x = head.userData.x0 - head.userData.sx * comp; }
