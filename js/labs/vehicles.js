// The vehicle lab's land page (vehicles.html): its scene and panels, wired to the kits'
// public APIs. Moved out of the page (2026-10-03) so the page is markup and styles.
// The list: VehicleKit's rovers and MarineKit's amphibian (moved here from the sea lab: on land it drives on its
// wheels; where there is water it floats). The train is another family (js/labs/vehicles/train.js).
(() => {
"use strict";
const $ = (id) => document.getElementById(id);
const VK = window.VehicleKit, MK = window.MarineKit;
const LIST = VK.VEHICLES.map((def) => ({ def, kit: "vk" })).concat(MK ? MK.VESSELS.filter((d) => d.id === "amphibian").map((def) => ({ def, kit: "mk" })) : []);
const NO_WATER = () => -1e9;   // the water's height where there is none
const view = $("view");
const renderer = new THREE.WebGLRenderer({ canvas: view, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const env = ShipKit.makeEnvironment(renderer);
scene.environment = env;
const DAY_BG = new THREE.Color(0x9a7a62), NIGHT_BG = new THREE.Color(0x03050b);
scene.background = DAY_BG.clone();
scene.fog = new THREE.Fog(DAY_BG.clone(), 90, 260);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1200);
camera.position.set(9, 4.5, -10);
const controls = new THREE.OrbitControls(camera, view);
controls.enableDamping = true; controls.maxPolarAngle = 1.45; controls.minDistance = 5; controls.maxDistance = 80;
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2 * THREE.LIGHT_SCALE);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 160 });
const hemi = new THREE.HemisphereLight(0xcfa98a, 0x2a1d14, 0.55 * THREE.LIGHT_SCALE);
scene.add(sun, sun.target, hemi);

// ---------- the ground: hills + bumps, the same function for the mesh and the wheels ----------
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
const G = { hills: 0.4, bumps: 0.4 };
function heightAt(x, z) {
  let h = (vnoise(x / 60, z / 60) * 6 + vnoise(x / 25 + 7, z / 25) * 2.5) * G.hills;
  h += (vnoise(x / 6 + 3, z / 6) * 0.45 + vnoise(x / 2.2, z / 2.2 + 5) * 0.18) * G.bumps;
  // a few rocks: sharp, short bumps
  const rk = vnoise(x / 3.1 + 11, z / 3.1 - 4);
  h += Math.max(0, rk - 0.55) * 1.6 * G.bumps;
  return h;
}
// the ground can come from the land lab instead (OPTIONS: Ground → Land lab; js/labs/vehicles/landsource.js): its
// terrain, its sea and its weather; the amphibian floats where there is water, the rovers stop at it
let world = null;
const groundAt = (x, z) => (world ? world.heightAt(x, z) : heightAt(x, z));
const home = { x: 0, z: 0 };             // where AUTO turns back to
const groundTex = (() => {
  const S = 512, [c, ctx] = ShipKit.util.canvas(S, S), r = ShipKit.util.rng(5);
  ctx.fillStyle = "#6e5642"; ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) { ctx.fillStyle = `rgba(${r() < 0.5 ? "255,236,214" : "20,10,0"},${0.04 + r() * 0.07})`; ctx.fillRect(r() * S, r() * S, 1 + r() * 4, 1 + r() * 4); }
  ctx.strokeStyle = "rgba(79,227,198,0.10)"; ctx.lineWidth = 2;
  for (let k = 0; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(k * S / 4, 0); ctx.lineTo(k * S / 4, S); ctx.moveTo(0, k * S / 4); ctx.lineTo(S, k * S / 4); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 40); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
})();
const groundGeo = new THREE.PlaneGeometry(400, 400, 320, 320);
groundGeo.rotateX(-Math.PI / 2);
const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 }));
ground.receiveShadow = true; scene.add(ground);
function rebuildGround() {
  const p = groundGeo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
  p.needsUpdate = true; groundGeo.computeVertexNormals();
}

// ---------- the vehicle ----------
const state = { index: 0, auto: true, autoSpeed: 0.5, night: false, dust: true, work: false, keys: {} };
const drv = { x: 0, z: 0, yaw: 0, speed: 0 };
let veh = null;
const dust = VK.makeDust(0xc9a27c); scene.add(dust.points);
// other model families (e.g. the train, js/labs/vehicles/train.js) show here instead
// of a VehicleKit vehicle: { name, role, build(scene) → group, rows(), target, camera,
// panel (their own controls, in place of DRIVE / GROUND), update(dt, t) (their behaviour, each frame) }
let mode = null;
const modes = [];
function setMode(m) {
  if (mode && mode.group) mode.group.visible = false;
  mode = m;
  const on = !!m;
  ground.visible = !on && !world; if (world) world.group.visible = !on; dust.points.visible = !on; if (veh) veh.group.visible = !on;
  $("vkPanel").classList.toggle("hidden", on);
  for (const x of modes) if (x.panel) x.panel.classList.toggle("hidden", x !== m);
  if (!m) return;
  if (!m.group) { m.group = m.build(scene); scene.add(m.group); if (m.panel) $("modePanel").appendChild(m.panel); }
  m.group.visible = true;
  $("hudTitle").textContent = m.name; $("role").textContent = m.role;
  [...$("vehTabs").children].forEach((b) => b.classList.toggle("on", b === m.tab));
  $("vehRows").textContent = ""; m.rows().forEach(([k, v]) => $("vehRows").appendChild(row(k, v)));
  controls.target.fromArray(m.target); camera.position.fromArray(m.camera); controls.update();
}
function addMode(m) {
  const b = document.createElement("button"); b.className = "tBtn"; b.textContent = m.tabName || m.name;
  b.addEventListener("click", () => setMode(m));
  m.tab = b; modes.push(m); $("vehTabs").appendChild(b);
}
function load() {
  setMode(null);
  if (veh) { if (veh.kit === "mk") MK.disposeVessel(veh); else VK.disposeVehicle(veh); }
  const { def, kit } = LIST[state.index];
  veh = kit === "mk" ? MK.buildVessel(def.id, { detail: 1 }) : VK.buildVehicle(def.id, { detail: 1 });
  veh.kit = kit;
  scene.add(veh.group);
  $("hudTitle").textContent = def.name;
  $("role").textContent = def.role;
  $("btnWork").textContent = def.work.toUpperCase();
  [...$("vehTabs").children].forEach((b, i) => b.classList.toggle("on", i === state.index));
  const st = VK.modelStats(veh.group);
  const rows = [["Length × width × height", def.length + " × " + def.width + " × " + def.height + " m"], ["Top speed", Math.round(def.maxSpeed * 3.6) + " km/h"],
    ["Turns", def.turnRadius ? "in " + def.turnRadius + " m" : "on the spot"], ["Cargo", def.cargo + " t"],
    ["Wheels", veh.parts.tracks ? "2 tracks" : (veh.wheels || veh.parts.wheels).length], ["Triangles", st.triangles.toLocaleString("en-US")], ["Meshes", st.meshes]];
  $("vehRows").textContent = ""; rows.forEach(([k, v]) => $("vehRows").appendChild(row(k, v)));
}
function row(k, v) { const r = document.createElement("div"); r.className = "row"; const s = document.createElement("span"); s.textContent = k; const b = document.createElement("b"); b.textContent = v; r.append(s, b); return r; }
LIST.forEach(({ def: d }, i) => {
  const b = document.createElement("button"); b.className = "tBtn"; b.textContent = d.name;
  b.addEventListener("click", () => { state.index = i; load(); });
  $("vehTabs").appendChild(b);
});

// ---------- the controls ----------
const toggle = (id, key, after) => $(id).addEventListener("click", () => { state[key] = !state[key]; $(id).classList.toggle("on", state[key]); after && after(); });
$("dAuto").addEventListener("click", () => { state.auto = true; $("dAuto").classList.add("on"); $("dKeys").classList.remove("on"); });
$("dKeys").addEventListener("click", () => { state.auto = false; $("dKeys").classList.add("on"); $("dAuto").classList.remove("on"); });
const slider = (id, valId, set) => { const el = $(id); el.addEventListener("input", () => { set(+el.value); $(valId).textContent = Math.round(el.value * 100) + "%"; LabKit.paintSlider(el); }); LabKit.paintSlider(el); };
slider("sSlider", "sVal", (v) => { state.autoSpeed = v; });
slider("hSlider", "hVal", (v) => { G.hills = v; rebuildGround(); });
slider("bSlider", "bVal", (v) => { G.bumps = v; rebuildGround(); });
toggle("btnNight", "night", applyLight);
toggle("btnDust", "dust");
toggle("btnWork", "work");
window.addEventListener("keydown", (e) => {
  state.keys[e.code] = true;
  if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code) && state.auto) $("dKeys").click();
});
window.addEventListener("keyup", (e) => { state.keys[e.code] = false; });
function applyLight() {
  const n = state.night, W = world && world.sky;
  scene.background.copy(n ? NIGHT_BG : W ? W.fog : DAY_BG); scene.fog.color.copy(scene.background);
  scene.fog.near = W ? 300 : 90; scene.fog.far = W ? 3200 : 260;
  sun.color.set(0xfff1dc); hemi.color.set(0xcfa98a); hemi.groundColor.set(0x2a1d14);
  if (W && !n) { sun.color.copy(W.sunColor); hemi.color.copy(W.sky); hemi.groundColor.copy(W.ground); }
  sun.intensity = n ? 0.05 * THREE.LIGHT_SCALE : W ? W.sunIntensity : 2.2 * THREE.LIGHT_SCALE;
  hemi.intensity = n ? 0.06 * THREE.LIGHT_SCALE : W ? W.ambient : 0.55 * THREE.LIGHT_SCALE;
  dust.material.uniforms.uLight.value = n ? 0.15 : 1;
}

// ---------- the loop ----------
LabKit.autoHideHud([$("hud"), $("opt")], 5);
const perf = LabKit.perfCounters(renderer);
renderer.info.autoReset = false;
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
const clock = new THREE.Timer(), prev = new THREE.Vector3(), delta = new THREE.Vector3();
let wander = 0;
function frame() {
  const t0 = performance.now(), dt = Math.min(clock.update().getDelta(), 0.05), t = clock.getElapsed();
  if (mode) {   // another family: its own behaviour, if it has one
    if (mode.update) mode.update(dt, t);
    controls.update();
    renderer.info.reset(); LabKit.render(renderer, scene, camera);
    perf.update(performance.now(), performance.now() - t0);
    requestAnimationFrame(frame); return;
  }
  const def = veh.def;
  // the input: the keys, or a wandering drive that turns back toward the middle
  let input;
  if (state.auto) {
    wander += dt;
    const far = Math.hypot(drv.x - home.x, drv.z - home.z) > 110;
    const back = Math.atan2(home.x - drv.x, home.z - drv.z), diff = Math.atan2(Math.sin(back - drv.yaw), Math.cos(back - drv.yaw));
    input = { throttle: state.autoSpeed, steer: far ? Math.sign(diff) : Math.sin(wander * 0.23) * 0.7 + Math.sin(wander * 0.61) * 0.3 };
  } else {
    const k = state.keys;
    input = { throttle: (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0), steer: (k.KeyA ? 1 : 0) - (k.KeyD ? 1 : 0) };
  }
  prev.set(drv.x, 0, drv.z);
  VK.drive(drv, input, def, dt);
  // on the land lab's ground the rovers stop at the water (only the amphibian goes in)
  if (world && veh.kit !== "mk" && groundAt(drv.x, drv.z) < -0.4) { drv.x = prev.x; drv.z = prev.z; drv.speed *= -0.2; }
  const gy = groundAt(drv.x, drv.z);
  veh.group.position.set(drv.x, gy, drv.z);
  veh.group.rotation.y = drv.yaw;
  const cy = Math.cos(drv.yaw), sy = Math.sin(drv.yaw);
  if (veh.kit === "mk") {   // the amphibian: on its wheels on the ground (it would float where there is water)
    veh.group.position.y = 0;
    const wx = (x, z) => drv.x + x * cy + z * sy, wz = (x, z) => drv.z - x * sy + z * cy;
    veh.update(t, dt, { speed: drv.speed, steer: input.steer, surface: world ? (x, z) => world.waterAt(wx(x, z), wz(x, z), t) : NO_WATER,
      floor: (x, z) => groundAt(wx(x, z), wz(x, z)), lights: state.night ? 1 : 0, work: state.work ? 1 : 0 });
  } else veh.update(t, dt, {
    speed: drv.speed, steer: input.steer,
    contact: (x, z) => groundAt(drv.x + x * cy + z * sy, drv.z - x * sy + z * cy) - gy,
    lights: state.night ? 1 : 0, work: state.work ? 1 : 0, dust: state.dust ? dust : null,
  });
  dust.update(dt);
  // the camera rides along (the amphibian afloat: at its hull, not at the sea floor)
  const vy = veh.kit === "mk" ? veh.body.position.y : gy;
  delta.set(drv.x, vy, drv.z).sub(prev.set(controls.target.x, controls.target.y - 1.5, controls.target.z));
  camera.position.add(delta); controls.target.add(delta);
  controls.update();
  if (world) { world.update(t, camera); sun.position.set(drv.x, vy, drv.z).addScaledVector(world.sky.sunDir, 60); }
  else sun.position.set(drv.x + 30, vy + 40, drv.z + 20);
  sun.target.position.set(drv.x, vy, drv.z);
  $("nowSpeed").textContent = Math.round(Math.abs(drv.speed) * 3.6) + " km/h";
  $("nowTilt").textContent = Math.round(-veh.body.rotation.x * 57.3) + "° / " + Math.round(veh.body.rotation.z * 57.3) + "°";
  renderer.info.reset();
  LabKit.render(renderer, scene, camera);
  perf.update(performance.now(), performance.now() - t0);
  requestAnimationFrame(frame);
}
function setGround(src) {
  if (world) { scene.remove(world.group); world.dispose(); world = null; }
  if (src === "lab" && window.LandLabWorld) { world = window.LandLabWorld(); scene.add(world.group); [home.x, home.z] = world.start; }
  else { home.x = home.z = 0; }
  ground.visible = !world && !mode;
  $("hSlider").disabled = $("bSlider").disabled = !!world;
  Object.assign(drv, { x: home.x, z: home.z, speed: 0 });
  const y = Math.max(groundAt(home.x, home.z), 0) + 1.5;
  controls.target.set(home.x, y, home.z); camera.position.set(home.x + 9, y + 3, home.z - 10); controls.update();
  applyLight();
}
$("groundSrc").addEventListener("change", () => setGround($("groundSrc").value));
rebuildGround(); resize(); load();
controls.target.set(0, heightAt(0, 0) + 1.5, 0);
frame();
window.vehicleLab = { state, drv, G, heightAt, groundAt, setGround, get world() { return world; }, load, get veh() { return veh; }, camera, controls, applyLight, scene, sun, addMode, setMode, modes, row };
window.dispatchEvent(new Event("vehiclelab:ready"));
})();
