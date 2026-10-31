// Skład: pojazdy jeden za drugim, zderzaki stykają się talerzami; łańcuch
// zawieszony między jarzmem a hakiem. Domyślny skład jak w aTrain: lokomotywa,
// wagon drewniany (sprzęg kłowy z lokomotywą), wagon stalowy (łańcuch na haku).
import { BUF_Y, HOOK_EXT, SLACK, CH } from "./data.js";
import { trainMaterials } from "./materials.js";
import { buildVehicle } from "./vehicle.js";
import { chainLinkGeometry } from "./parts/couplers.js";
const THREE = window.THREE;

export const DEFAULT_TRAIN = [
  { body: "loco", front: "plain", rear: "knuckle" },
  { body: "woodVan", front: "knuckle", rear: "shackle" },
  { body: "steelVan", front: "hook", rear: "plain", last: true },
];

export function buildTrain(composition = DEFAULT_TRAIN, opts = {}) {
  const root = new THREE.Group(); root.name = "skład";
  const vehicles = [];
  let x = 0;
  composition.forEach((c, i) => {
    const v = buildVehicle(c.body, Object.assign({}, c, opts));
    if (i > 0) x -= v.userData.halfLength;
    v.position.x = x; x -= v.userData.halfLength;
    root.add(v); vehicles.push(v);
  });
  // łańcuchy: tył pojazdu z jarzmem → przód następnego z hakiem
  const links = [];
  for (let i = 0; i + 1 < vehicles.length; i++) {
    const A = vehicles[i], B = vehicles[i + 1];
    if (A.userData.rear !== "shackle" || B.userData.front !== "hook") continue;
    const pa = new THREE.Vector3(A.position.x - (A.userData.def.Lb / 2 + HOOK_EXT), BUF_Y, 0);
    const pb = new THREE.Vector3(B.position.x + (B.userData.def.Lb / 2 + HOOK_EXT), BUF_Y, 0);
    const L = pa.distanceTo(pb), pitch = (L + SLACK - (CH.N + 1) * CH.g) / CH.N, geo = chainLinkGeometry(pitch);
    for (let k = 0; k < CH.N; k++) {
      const m = new THREE.Mesh(geo, trainMaterials().steel); m.name = "ogniwo";
      m.position.lerpVectors(pa, pb, (k + 0.5) / CH.N);
      if (k % 2) m.rotation.x = Math.PI / 2;
      m.castShadow = true; root.add(m); links.push(m);
    }
  }
  root.userData = { vehicles, links, length: -x };
  return root;
}
