// Laboratorium pojazdów — rodzina „złomowisko”: przeładowarka z chwytakiem z JunkKit (js/models/junkyard/, z gry
// Złomowisko, z historią). Model w prawdziwej skali z ruchomymi grupami (nadwozie, wysięgnik, ramię, chwytak, szczęki):
// tu poruszane suwakami, bez jazdy (jazda i chwytanie przez fizykę zostały w grze — zachowanie do przeniesienia później).
import { build as buildTruck, LAYOUT } from "../../models/junkyard/vehicle/grapple-truck.js";
import { applyTextures, setAnisotropy } from "../../models/junkyard/textures.js";
const THREE = window.THREE;

const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

function start(lab) {
  let truck = null, g = null;
  const J = { slew: 0, boom: 0.55, stick: 1.35, rot: 0, jaws: 0.5 };
  const panel = el("div", "hidden"), ui = {};
  function slider(key, label, min, max, step, fmt) {
    const l = el("label", "sl"), b = el("b"); l.append(el("span", null, label), b);
    const r = Object.assign(el("input"), { type: "range", min, max, step, value: J[key] });
    const show = () => { b.textContent = fmt(+r.value); if (window.LabKit) LabKit.paintSlider(r); };
    r.addEventListener("input", () => { J[key] = +r.value; show(); pose(); });
    show(); ui[key] = r; panel.append(l, r); return r;
  }
  const deg = (v) => Math.round(v * 57.2958) + "°";
  panel.append(el("div", "secHd", "WORK"));
  slider("slew", "Slew (upper body)", -Math.PI, Math.PI, 0.01, deg);
  slider("boom", "Boom", 0.1, 1.1, 0.01, deg);
  slider("stick", "Stick", 0.5, 2.3, 0.01, deg);
  slider("rot", "Grapple rotation", -Math.PI, Math.PI, 0.01, deg);
  slider("jaws", "Jaws open", 0, 1, 0.01, (v) => Math.round(v * 100) + "%");
  const note = el("p", "note", "The loader's moving parts as the junkyard game drives them: the upper body slews, the boom and the stick swing, the grapple hangs plumb and rotates, four jaws open and close. Driving is not here yet.");
  panel.append(note);

  // the joints: the grapple hangs plumb (the game sets it by physics; here the boom and stick angles are compensated)
  function pose() {
    if (!truck) return;
    const up = truck.getObjectByName("nadwozie"), bm = truck.getObjectByName("wysięgnik"), st = truck.getObjectByName("ramię"), gr = truck.getObjectByName("chwytak");
    up.rotation.y = J.slew; bm.rotation.x = -J.boom; st.rotation.x = J.stick;
    gr.rotation.set(-(bm.rotation.x + st.rotation.x), J.rot, 0, "XYZ");
    for (let k = 0; k < LAYOUT.jaws; k++) truck.getObjectByName("szczęka " + k).rotation.x = LAYOUT.jawClosed + (LAYOUT.jawOpen - LAYOUT.jawClosed) * J.jaws;
  }

  lab.addMode({
    name: "Grapple loader", tabName: "Junkyard · grapple loader",
    role: "A wheeled scrap loader from the junkyard game (JunkKit): four industrial tyres, outriggers, a slewing upper body with a raised cab, a box boom, a stick and an orange-peel grapple with four jaws.",
    target: [0, 3.2, 1.5], camera: [12, 7.5, 13],
    panel,
    build() {
      g = new THREE.Group();
      setAnisotropy(lab.renderer ? lab.renderer.capabilities.getMaxAnisotropy() : 8);
      truck = buildTruck(0); applyTextures();
      truck.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const flat = new THREE.Mesh(new THREE.CircleGeometry(600, 96).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6b604e, roughness: 0.97 }));
      flat.receiveShadow = true; g.add(flat, truck);
      pose();
      return g;
    },
    rows() {
      let n = 0; if (truck) truck.traverse((m) => { if (m.isMesh) n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
      return [["Mass", (LAYOUT.mass / 1000).toFixed(0) + " t"], ["Wheelbase / track", (LAYOUT.wheels[0][2] * 2).toFixed(2) + " / " + (LAYOUT.wheels[1][0] * 2).toFixed(2) + " m"],
        ["Tyres", "industrial 18-19.5, Ø " + Math.round(LAYOUT.wheelRadius * 2000) + " mm"], ["Boom / stick", LAYOUT.boomLen + " / " + LAYOUT.stickLen + " m"],
        ["Grapple", LAYOUT.jaws + " jaws (orange peel)"], ["Triangles", Math.round(n).toLocaleString("en-US")]];
    },
    update() {
      if (lab.sun) { lab.sun.position.set(30, 40, 20); lab.sun.target.position.set(0, 0, 0); lab.sun.target.updateMatrixWorld(); }
      const $ = (id) => document.getElementById(id);
      $("nowSpeed").textContent = "0 km/h (standing)"; $("nowTilt").textContent = "0° / 0°";
    },
  });
}
if (window.vehicleLab) start(window.vehicleLab); else window.addEventListener("vehiclelab:ready", () => start(window.vehicleLab), { once: true });
