// Laboratorium pojazdów — rodzina „złomowisko”: przeładowarka z chwytakiem z JunkKit (js/models/junkyard/, z gry
// Złomowisko, z historią) z zachowaniem „przeładowarka” (js/behaviors/land/grapple.js, środowisko ląd): jazda siłami
// (land/drive.js), hydraulika ramienia, chwytak na przegubie kulowym (wahadło), szczęki z silnikami i kontaktem —
// przedmioty ze złomowiska (JunkKit) leżą przed nią do chwytania. Sterowanie jak w grze: W/S jazda, A/D skręt,
// ←/→ obrót nadwozia, ↑/↓ wysięgnik, R/F ramię, Spacja chwytak.
import { build as buildTruck, LAYOUT } from "../../models/junkyard/vehicle/grapple-truck.js";
import { itemKit } from "../../models/junkyard/properties.js";
import { applyTextures, setAnisotropy } from "../../models/junkyard/textures.js";
import { createGrapple } from "../../behaviors/land/grapple.js";
const THREE = window.THREE;

const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
// przedmioty do chwytania: [id, x, z, obrót] przed przeładowarką (przód +z)
const PILE = [["tire-car", -1.4, 8.2, 0], ["tire-car", 1.6, 9.6, 0.4], ["barrel", 0.2, 9.0, 0], ["barrel", -2.6, 10.4, 0.9], ["newspapers", 2.8, 7.6, 0.3],
  ["box", -0.6, 11.2, 0.2], ["tire-tractor", 3.6, 11.6, 0], ["pot", -3.2, 7.4, 0]];

function start(lab) {
  let truck = null, g = null, grab = null, world = null;
  const keys = {}, panel = el("div", "hidden"), ui = {};
  const readout = (key, label) => { const r = el("div", "row"), b = el("b", null, "–"); r.append(el("span", null, label), b); ui[key] = b; panel.append(r); };
  panel.append(el("div", "secHd", "DRIVE AND WORK"));
  panel.append(el("p", "note", "W / S drive, A / D steer · ← / → slew · ↑ / ↓ boom · R / F stick · Space opens and closes the grapple."));
  const jawBtn = el("button", "tBtn", "CLOSE THE GRAPPLE"), resetBtn = el("button", "tBtn", "PUT IT ALL BACK");
  const two = el("div", "twoBtns"); two.append(jawBtn, resetBtn); panel.append(two);
  readout("speed", "Speed"); readout("jaws", "Grapple"); readout("payload", "Load"); readout("sag", "Boom / stick bend");
  readout("tilt", "Pitch / roll"); readout("wheels", "Wheel loads (FR · FL · RR · RL)");
  panel.append(el("p", "note", "Physics in GameLaboratory: driving by forces (land/drive.js) with the game's numbers, the grapple as a pendulum on a ball joint, the jaws on motors pressing on what they hold — it stays in the grapple while friction carries its weight. The chassis rides on four springs (the game's suspension numbers) and leans under the counterweight, the load and the driving; the items are rigid bodies (land/items.js): they collide with each other, with the loader and with the ground, stack, topple and tumble from impacts, and tyres, drums and pots roll. What the loader hits pushes back on it (speed, turn, springs, the grapple's swing), and the boom and the stick bend in an arc under the load."));
  jawBtn.addEventListener("click", () => { if (grab) { grab.toggleJaws(); jawBtn.blur(); } });
  resetBtn.addEventListener("click", () => { resetBtn.blur(); placePile(); });

  let active = false;
  const typing = (e) => e.target.closest && e.target.closest("input, textarea, select");
  addEventListener("keydown", (e) => {
    if (!active || typing(e)) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "Space" && !e.repeat && grab) grab.toggleJaws();
    keys[e.code] = true;
  });
  addEventListener("keyup", (e) => { keys[e.code] = false; });
  addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
  const axis = (a, b) => (keys[a] ? 1 : 0) - (keys[b] ? 1 : 0);

  // przedmioty JunkKit jako bryły świata przedmiotów (półwymiary zderzacza gry — js/models/junkyard/properties.js)
  let kit = null;
  async function loadItems() { if (!kit) kit = await itemKit(); }
  const Y = new THREE.Vector3(0, 1, 0);
  function placePile() {
    if (!grab) return;
    for (const it of [...grab.held]) it.held = false;
    grab.held.clear();
    for (const it of [...grab.items.list]) grab.items.remove(it);
    for (const [id, x, z, yaw] of PILE) kit.spawn(grab.items, id, { at: [x, null, z], q: new THREE.Quaternion().setFromAxisAngle(Y, yaw), parent: world });
    grab.items.sync(); applyTextures();
  }

  lab.addMode({
    name: "Grapple loader", tabName: "Junkyard · grapple loader",
    role: "A wheeled scrap loader from the junkyard game (JunkKit) with its behaviour: it drives by forces, slews, swings the boom and the stick, and picks up the junkyard's items with a four-jaw grapple hanging on a ball joint.",
    target: [0, 2.5, 4], camera: [11, 8, -6],
    panel,
    async prepare() { await loadItems(); },
    build() {
      world = new THREE.Group();
      setAnisotropy(lab.renderer ? lab.renderer.capabilities.getMaxAnisotropy() : 8);
      truck = buildTruck(0); applyTextures();
      truck.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const flat = new THREE.Mesh(new THREE.CircleGeometry(600, 96).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6b604e, roughness: 0.97 }));
      flat.receiveShadow = true; world.add(flat, truck);
      if (grab) grab.dispose();
      grab = createGrapple(truck, { scene: world });
      g = grab; window.__grapple = grab;   // (testy)
      placePile(); grab.sync();
      return world;
    },
    rows() {
      let n = 0; if (truck) world.traverse((m) => { if (m.isMesh) n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
      return [["Mass", (LAYOUT.mass / 1000).toFixed(0) + " t"], ["Wheelbase / track", (LAYOUT.wheels[0][2] * 2).toFixed(2) + " / " + (LAYOUT.wheels[1][0] * 2).toFixed(2) + " m"],
        ["Drive", "26 kN at start · up to 14 m/s"], ["Tyres", "industrial 18-19.5, Ø " + Math.round(LAYOUT.wheelRadius * 2000) + " mm"],
        ["Boom / stick", LAYOUT.boomLen + " / " + LAYOUT.stickLen + " m"], ["Grapple", LAYOUT.jaws + " jaws (orange peel)"], ["Triangles", Math.round(n).toLocaleString("en-US")]];
    },
    update(dt) {
      active = true;
      if (!g) return;
      const s0x = g.drive.state.x, s0z = g.drive.state.z;
      g.step(Math.min(dt, 0.05), { throttle: axis("KeyW", "KeyS"), steer: axis("KeyA", "KeyD"), slew: axis("ArrowLeft", "ArrowRight"), boom: axis("ArrowUp", "ArrowDown"), stick: axis("KeyF", "KeyR") });
      g.sync();
      // kamera jedzie z pojazdem
      const dx = g.drive.state.x - s0x, dz = g.drive.state.z - s0z;
      if (lab.controls) { lab.controls.target.x += dx; lab.controls.target.z += dz; lab.camera.position.x += dx; lab.camera.position.z += dz; }
      if (lab.sun) { lab.sun.position.set(g.drive.state.x + 30, 40, g.drive.state.z + 20); lab.sun.target.position.set(g.drive.state.x, 0, g.drive.state.z); lab.sun.target.updateMatrixWorld(); }
      const $ = (id) => document.getElementById(id), kmh = (g.drive.state.u * 3.6).toFixed(1) + " km/h";
      const tilt = (g.susp.th * 57.2958).toFixed(1) + "° / " + (g.susp.ph * 57.2958).toFixed(1) + "°";
      $("nowSpeed").textContent = kmh; $("nowTilt").textContent = tilt;
      ui.tilt.textContent = tilt;
      ui.wheels.textContent = g.susp.F.map((f) => (f / 1000).toFixed(0)).join(" · ") + " kN";
      ui.speed.textContent = kmh;
      ui.jaws.textContent = (g.closed ? "closed" : "open") + (g.held.size ? " · holding " + [...g.held].map((it) => it.name).join(", ") : "");
      ui.payload.textContent = Math.round(g.payload) + " kg";
      ui.sag.textContent = (g.arm.sagB * LAYOUT.boomLen * 100).toFixed(1) + " / " + (g.arm.sagS * LAYOUT.stickLen * 100).toFixed(1) + " cm";
      jawBtn.textContent = g.closed ? "OPEN THE GRAPPLE" : "CLOSE THE GRAPPLE";
    },
    leave() { active = false; for (const k in keys) keys[k] = false; },
  });
}
if (window.vehicleLab) start(window.vehicleLab); else window.addEventListener("vehiclelab:ready", () => start(window.vehicleLab), { once: true });
