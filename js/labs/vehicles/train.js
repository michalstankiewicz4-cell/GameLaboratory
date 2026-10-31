// Laboratorium pojazdów — rodzina „pociąg”: skład z TrainKit (js/models/train) na
// odcinku toru (js/models/structures/railway). Na razie model w spoczynku; jazda
// przyjdzie z zachowaniem „koło na szynie” (środowisko ląd).
import { buildTrain, DEFAULT_TRAIN, BODIES, data } from "../../models/train/trainkit.js";
import { buildTrack } from "../../models/structures/railway/track.js";
import { trainMaterials } from "../../models/train/materials.js";
const THREE = window.THREE;

function start(lab) {
  let train = null;
  lab.addMode({
    name: "Train", tabName: "Train", role: "Rail: a shunting diesel and two covered wagons, coupled by a knuckle coupler and a chain on a hook. Still model — the rail behaviour comes next.",
    target: [-10, 1.6, 0], camera: [8, 6, 16],
    build() {
      const g = new THREE.Group(); g.name = "pociąg na torze";
      const flat = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), trainMaterials().ground);
      flat.rotation.x = -Math.PI / 2; flat.position.y = -0.45; flat.receiveShadow = true; g.add(flat);
      const track = buildTrack({ length: 75, railLength: 25 }); track.position.x = -60; g.add(track);
      train = buildTrain(DEFAULT_TRAIN); g.add(train);
      return g;
    },
    rows() {
      const v = train ? train.userData : null;
      const tris = (o) => { let n = 0; o.traverse((m) => { if (m.isMesh && m.geometry) { const gg = m.geometry; n += (gg.index ? gg.index.count : gg.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1); } }); return n; };
      return [["Vehicles", DEFAULT_TRAIN.map((c) => BODIES[c.body].name).join(" · ")],
        ["Length over buffers", v ? v.length.toFixed(2) + " m" : "–"],
        ["Gauge", "1435 mm"], ["Wheels (loco / wagon)", "Ø " + 2 * data.VEH.loco.Rw * 1000 + " / " + 2 * data.VEH.wagon.Rw * 1000 + " mm"],
        ["Couplers", "knuckle · chain on hook"], ["Triangles", v ? Math.round(tris(train)).toLocaleString("en-US") : "–"]];
    },
  });
}
if (window.vehicleLab) start(window.vehicleLab); else window.addEventListener("vehiclelab:ready", () => start(window.vehicleLab), { once: true });
