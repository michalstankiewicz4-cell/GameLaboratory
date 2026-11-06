/* =======================================================================
   MARINEKIT — the sea and what sails it (window.MarineKit)
   =======================================================================
   A classic script like the other kits: the vehicle labs use its vessels
   (water page: skimmer, barge, diver; land page: the amphibian) and the scene
   editor (family "Sea robots"). Vessels are built from ShipKit's generators
   (plating, struts); the amphibian borrows VehicleKit's wheels. Needs THREE,
   ShipKit and VehicleKit. docs/models/marine.md.

   The world has no people (the story): every vessel is a robot.

   A model only: how a vessel floats and moves (buoyancy, waves, foils, the
   diver's thrusters, the amphibian's wheels) is the behaviour
   js/behaviors/water/craft.js, by forces; update() shows its pose. (Its own
   sea — makeSea, the snow — and the springs it floated on were removed on
   2026-11-06: the labs use WaterKit's sea and the behaviour.)

   Units are metres; sea level is y 0. A vessel's origin is the waterline
   under its middle, front +Z. The caller moves and turns `group` at sea
   level; update() does the rest inside:
     - the pose (opts.pose: { y, pitch, roll, lift, depth, onLand, vd } from
       the behaviour; without it the vessel stands level at its waterline);
     - propellers spin (faster with the speed and the diver's vertical speed),
       wheels roll and steer, lamps, the beacon, the work (opts.work 0..1);
     - wake foam and bow spray (opts.wake: a makeWake() pool; at the surface,
       under way, not on land).

   API
     VESSELS                               [{ id, name, role, length, width, height,
                                            maxSpeed, accel, turnRadius, cargo, maxDepth?, work, float,
                                            foils? (skimmer), azimuth? (barge), wheels? (amphibian) }]
     buildVessel(id, { detail })         → vessel: group, body, depth, onLand, update(t, dt, opts)
       opts: { pose, speed, steer, lights, work, wake }
     disposeVessel(vessel), makeWake(), modelStats(group), hullGeometry(…)
   ======================================================================= */
window.MarineKit = (function () {
"use strict";
const SK = window.ShipKit, VK = window.VehicleKit;
const TAU = Math.PI * 2, G = 9.81;

// ---------- materials ----------
let M = null;
function mats() {
  if (M) return M;
  const hull = SK.makePlating({ seed: 81, size: 512, base: [214, 216, 220], minPanel: 150, maxPanel: 380, stripes: [{ y: 0.78, h: 0.05, color: "#f8bb56" }] });
  const dark = SK.makePlating({ seed: 82, size: 512, base: [52, 60, 74], minPanel: 140, maxPanel: 360 });
  const red = SK.makePlating({ seed: 83, size: 512, base: [150, 52, 40], minPanel: 150, maxPanel: 380 });   // antifouling under the waterline
  for (const t of [...Object.values(hull), ...Object.values(dark), ...Object.values(red)]) SK.allTextures.add(t);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  M = {
    hull: std({ map: hull.map, roughnessMap: hull.roughnessMap, bumpMap: hull.bumpMap, bumpScale: 0.02, metalness: 0.35, roughness: 0.5 }),
    dark: std({ map: dark.map, roughnessMap: dark.roughnessMap, bumpMap: dark.bumpMap, bumpScale: 0.02, metalness: 0.7, roughness: 0.45 }),
    bottom: std({ map: red.map, roughnessMap: red.roughnessMap, metalness: 0.2, roughness: 0.7 }),
    frame: std({ color: 0x8c929e, metalness: 0.9, roughness: 0.35 }),
    gold: std({ color: 0xf8bb56, metalness: 1, roughness: 0.3 }),
    lens: std({ color: 0x0a0d14, metalness: 0.2, roughness: 0.05, emissive: 0x4fe3c6, emissiveIntensity: 0.4 }),
    dome: new THREE.MeshPhysicalMaterial({ color: 0x9fd8d0, metalness: 0.1, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.4 }),
    lamp: std({ color: 0x222222, emissive: 0xfff1d0, emissiveIntensity: 0 }),
    teal: std({ color: 0x0b3a33, emissive: 0x4fe3c6, emissiveIntensity: 1.8 }),
    beacon: std({ color: 0x2a1405, emissive: 0xffa230, emissiveIntensity: 0 }),
    c1: std({ color: 0xc9772f, metalness: 0.3, roughness: 0.6 }), c2: std({ color: 0x2f6f74, metalness: 0.3, roughness: 0.6 }), c3: std({ color: 0x9aa0a8, metalness: 0.4, roughness: 0.55 }),
  };
  return M;
}
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; }
const box = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// a boat hull: sections from the stern (−L/2) to the bow (+L/2), a U that
// flattens at the keel, the bow narrowing (sharp: 1 a knife, 0 blunt);
// deck at +F, keel at −D. Two materials: above / below the waterline.
function hullGeometry(L, W, D, F, sharp = 1, NZ = 28, NA = 14) {
  const pos = [], uv = [], idx = [];
  const half = (u) => {
    const body = u < 0.62 ? 0.86 + 0.14 * Math.sin(u / 0.62 * Math.PI / 2) : Math.pow(Math.cos((u - 0.62) / 0.38 * Math.PI / 2), 0.6 + sharp * 0.6);
    return Math.max(sharp > 0.5 ? 0.01 : 0.35, body) * W / 2;
  };
  const keel = (u) => D * (u > 0.75 ? 1 - (u - 0.75) / 0.25 * 0.7 : 1);
  for (let i = 0; i <= NZ; i++) {
    const u = i / NZ, z = -L / 2 + u * L, w = half(u), d = keel(u);
    for (let j = 0; j <= NA; j++) {
      const a = j / NA * Math.PI;                                   // 0: right deck edge … π: left
      const s = Math.sin(a);
      pos.push(Math.cos(a) * w * (0.35 + 0.65 * Math.pow(Math.abs(Math.cos(a)), 0.15)), F - (F + d) * Math.pow(s, 0.45), z);
      uv.push(u * L / 6, j / NA);
    }
  }
  const row = NA + 1;
  for (let i = 0; i < NZ; i++) for (let j = 0; j < NA; j++) {
    const a = i * row + j, b = a + row;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  // the deck: a strip between the two deck edges
  const deck0 = pos.length / 3;
  for (let i = 0; i <= NZ; i++) {
    const r = (i * row) * 3, l = (i * row + NA) * 3;
    pos.push(pos[r], F, pos[r + 2], pos[l], F, pos[l + 2]); uv.push(i / NZ * L / 6, 0, i / NZ * L / 6, 1);
  }
  for (let i = 0; i < NZ; i++) { const a = deck0 + i * 2, b = a + 2; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  // the transom: the stern's flat end
  const t0 = pos.length / 3;
  pos.push(0, F, -L / 2); uv.push(0.5, 0.5);
  for (let j = 0; j <= NA; j++) { pos.push(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]); uv.push(j / NA, 0); }
  for (let j = 0; j < NA; j++) idx.push(t0, t0 + 2 + j, t0 + 1 + j);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// a hull mesh: the plating above the waterline, antifouling below (a clipping-free trick: two meshes, one scaled under)
function hull(L, W, D, F, sharp, m) {
  const g = new THREE.Group();
  const top = mesh(hullGeometry(L, W, D, F, sharp), m.hull);
  const bot = mesh(hullGeometry(L * 1.004, W * 1.01, D * 1.01, 0.02, sharp), m.bottom);
  g.add(top, bot);
  return g;
}
// a propeller: blades on a hub (spins about Z)
function propeller(r, m, seg) {
  const p = new THREE.Group();
  p.add(mesh(new THREE.SphereGeometry(r * 0.25, seg(10, 6), seg(8, 4)), m.gold));
  for (let k = 0; k < 4; k++) { const b = box(r * 0.28, r * 0.9, 0.04, m.gold, 0, r * 0.5, 0); const piv = new THREE.Group(); piv.rotation.z = k * TAU / 4; b.rotation.y = 0.5; piv.add(b); p.add(piv); }
  return p;
}
function duct(r, m, seg) {
  const d = mesh(new THREE.TorusGeometry(r, r * 0.12, seg(8, 4), seg(24, 10)), m.dark);
  return d;
}
const lampAt = (g, m, x, y, z) => { const l = box(0.3, 0.14, 0.06, m.lamp, x, y, z); g.add(l); return l; };

// ---------- the vessels ----------
const VESSELS = [
  { id: "skimmer", name: "SKIMMER", role: "A fast scout over open water: twin hulls, rising onto foils at speed.",
    length: 8, width: 3.6, height: 2.6, maxSpeed: 24, accel: 4, turnRadius: 16, cargo: 0.5, work: "Scan",
    foils: { speed: 9, height: 1.05 },   // lifts off at ~9 m/s; the foils hang 1.05 m under the hull
    float: [[1.3, 3], [-1.3, 3], [1.3, -3], [-1.3, -3]],
    make(b, m, seg) {
      for (const s of [-1, 1]) { const h = hull(7.6, 0.95, 0.55, 0.55, 1, m); h.position.x = s * 1.3; b.add(h); }
      b.add(box(3.3, 0.22, 4.6, m.dark, 0, 0.8, -0.3));
      const pod = box(1.6, 0.7, 1.9, m.hull, 0, 1.25, 0.5); b.add(pod);
      b.add(box(1.5, 0.2, 0.06, m.teal, 0, 1.35, 1.46));
      b.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 6), m.frame, 0, 2.2, -0.2));
      const head = new THREE.Group(); head.position.set(0, 2.85, -0.2); b.add(head);
      head.add(box(0.5, 0.18, 0.18, m.hull));
      for (const x of [-0.13, 0.13]) { const e = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, seg(10, 6)), m.lens, x, 0, 0.1); e.rotation.x = Math.PI / 2; head.add(e); }
      // the foils: struts down from each hull, a wing fore and aft
      const foils = new THREE.Group(); b.add(foils);
      for (const z of [2.3, -2.6]) {
        for (const s of [-1, 1]) foils.add(SK.strut(V(s * 1.3, -0.3, z), V(s * 1.25, -1.35, z), 0.05, m.frame, 6));
        foils.add(box(z > 0 ? 3.0 : 3.4, 0.05, 0.45, m.gold, 0, -1.38, z));
      }
      const lamps = [lampAt(b, m, -0.5, 1.1, 1.47), lampAt(b, m, 0.5, 1.1, 1.47)];
      const beacon = mesh(new THREE.SphereGeometry(0.07, 8, 6), m.beacon, 0, 2.95, -0.2); b.add(beacon);
      const props = [];
      for (const s of [-1, 1]) { const p = propeller(0.3, m, seg); p.position.set(s * 1.3, -1.25, -2.85); b.add(p); props.push(p); }
      return { lamps, beacon, head, props, stern: [[1.3, -3.9], [-1.3, -3.9]], bow: [[1.3, 3.8], [-1.3, 3.8]] };
    } },
  { id: "barge", name: "BARGE", role: "Moves materials by sea: containers on deck, azimuth thrusters, a bow ramp for vehicles.",
    length: 20, width: 6.2, height: 5.5, maxSpeed: 7, accel: 0.8, turnRadius: 40, cargo: 240, work: "Lower the ramp",
    azimuth: true,                       // azimuth thrusters: it turns on the spot too
    float: [[2.4, 7.5], [-2.4, 7.5], [2.4, -8.5], [-2.4, -8.5], [0, 0]],
    make(b, m, seg) {
      b.add(hull(20, 6.2, 1.7, 1.4, 0.15, m));
      const cs = [m.c1, m.c2, m.c3];
      let k = 0;
      for (let z = -6.5; z <= 2.5; z += 3) for (const x of [-1.35, 1.35]) for (let y = 0; y < (k % 3 === 0 ? 2 : 1); y++) {
        b.add(box(2.5, 1.25, 2.85, cs[(k + y) % 3], x, 2.05 + y * 1.3, z)); k++;
      }
      // the bow tower: sensors, no bridge
      b.add(box(2.6, 2.6, 1.6, m.hull, 0, 2.7, 5.3));
      b.add(box(2.5, 0.25, 0.06, m.teal, 0, 3.4, 6.11));
      b.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.0, 6), m.frame, 0, 5, 5.3));
      const radar = box(1.6, 0.1, 0.3, m.frame, 0, 6.0, 5.3); b.add(radar);
      // the ramp at the bow, hinged at the deck
      const hinge = new THREE.Group(); hinge.position.set(0, 1.4, 7.3); b.add(hinge);
      const ramp = box(3.2, 0.15, 2.6, m.dark, 0, 0, 1.3); hinge.add(ramp);
      hinge.rotation.x = -1.35;
      const lamps = [lampAt(b, m, -0.9, 2.2, 6.12), lampAt(b, m, 0.9, 2.2, 6.12)];
      const beacon = mesh(new THREE.SphereGeometry(0.1, 8, 6), m.beacon, 0, 6.15, 5.3); b.add(beacon);
      const props = [];
      for (const s of [-1, 1]) {
        const pod = new THREE.Group(); pod.position.set(s * 1.8, -1.9, -8.6); b.add(pod);
        pod.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6), m.frame, 0, 0.45, 0));
        const nac = mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.2, seg(12, 6)), m.dark); nac.rotation.x = Math.PI / 2; pod.add(nac);
        pod.add(duct(0.62, m, seg)); const p = propeller(0.55, m, seg); p.position.z = -0.1; pod.add(p); props.push(p);
      }
      return { lamps, beacon, props, hinge, radar, stern: [[2.4, -10], [-2.4, -10]], bow: [[1.5, 9.8], [-1.5, 9.8]] };
    } },
  { id: "diver", name: "DIVER", role: "Works under water: four vectored thrusters, lamps, a grabbing arm, sonar.",
    length: 6, width: 2.6, height: 2.2, maxSpeed: 9, accel: 2, turnRadius: 6, cargo: 1, maxDepth: 200, work: "Sample + sonar",
    float: [[0.6, 2], [-0.6, 2], [0.6, -2], [-0.6, -2]],
    make(b, m, seg) {
      const core = new THREE.Group(); core.position.y = -0.35; b.add(core);
      const cyl = mesh(new THREE.CylinderGeometry(0.85, 0.85, 3.6, seg(24, 10)), m.hull); cyl.rotation.x = Math.PI / 2; core.add(cyl);
      const tail = mesh(new THREE.SphereGeometry(0.85, seg(24, 10), seg(12, 6), 0, TAU, 0, Math.PI / 2), m.dark, 0, 0, -1.8); tail.rotation.x = -Math.PI / 2; core.add(tail);
      const dome = mesh(new THREE.SphereGeometry(0.84, seg(24, 10), seg(12, 6), 0, TAU, 0, Math.PI / 2), m.dome, 0, 0, 1.8); dome.rotation.x = Math.PI / 2; core.add(dome);
      core.add(mesh(new THREE.SphereGeometry(0.4, seg(14, 6), seg(10, 5)), m.lens, 0, 0, 1.9));   // the sensor eye behind the dome
      core.add(box(0.12, 0.7, 1.8, m.dark, 0, 1.05, -0.4));                 // a fin
      core.add(box(1.9, 0.18, 2.6, m.dark, 0, -0.95, 0));                   // the skid
      const props = [];
      for (const [x, z] of [[1.25, 1.1], [-1.25, 1.1], [1.25, -1.2], [-1.25, -1.2]]) {
        const pod = new THREE.Group(); pod.position.set(x, 0, z); core.add(pod);
        pod.add(SK.strut(V(-Math.sign(x) * 0.4, 0, 0), V(0, 0, 0), 0.07, m.frame, 6));
        const d = duct(0.42, m, seg); pod.add(d);
        const p = propeller(0.36, m, seg); pod.add(p); props.push(p);
      }
      // the arm, folded under the bow
      const arm = new THREE.Group(); arm.position.set(0.4, -0.8, 1.4); core.add(arm);
      arm.add(SK.strut(V(0, 0, 0), V(0, -0.2, 0.9), 0.07, m.frame, 6));
      const fore = new THREE.Group(); fore.position.set(0, -0.2, 0.9); arm.add(fore);
      fore.add(SK.strut(V(0, 0, 0), V(0, 0, 0.8), 0.06, m.frame, 6));
      const claw = new THREE.Group(); claw.position.set(0, 0, 0.8); fore.add(claw);
      for (const s of [-1, 1]) { const f = box(0.04, 0.05, 0.35, m.gold, s * 0.09, 0, 0.15); f.rotation.y = s * 0.3; claw.add(f); }
      arm.rotation.x = 0.9;
      const lamps = [lampAt(core, m, -0.55, 0.45, 1.75), lampAt(core, m, 0.55, 0.45, 1.75), lampAt(core, m, -0.55, -0.5, 1.75), lampAt(core, m, 0.55, -0.5, 1.75)];
      lamps.forEach((l) => { l.rotation.x = 0.2; });
      const beacon = mesh(new THREE.SphereGeometry(0.08, 8, 6), m.beacon, 0, 1.45, -0.6); core.add(beacon);
      // the sonar ping: a growing, fading shell
      // a shell bright only at its rim (fresnel), so it reads as a wave front, not a ball
      const ping = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.ShaderMaterial({
        uniforms: { opacity: { value: 0 } },
        vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
        fragmentShader: "uniform float opacity; varying vec3 vN; varying vec3 vV; void main(){ float r = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 4.0); gl_FragColor = vec4(vec3(0.31, 0.89, 0.78) * r * opacity * 3.0, 1.0); }",
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      core.add(ping);
      return { lamps, beacon, props, arm, fore, claw, ping, stern: [[0, -2.6]], bow: [[0, 2.6]] };
    } },
  { id: "amphibian", name: "AMPHIBIAN", role: "Drives into the sea and out again: six wheels, two shrouded propellers, a sealed hull.",
    length: 6.6, width: 3.0, height: 2.7, maxSpeed: 12, accel: 2.2, turnRadius: 7, cargo: 3, work: "Scan",
    wheels: true,                        // six wheels: it drives out of the sea
    float: [[1, 2.4], [-1, 2.4], [1, -2.4], [-1, -2.4]],
    make(b, m, seg) {
      b.add(hull(6.2, 2.6, 0.55, 1.0, 0.1, m));
      b.add(box(2.0, 0.8, 2.6, m.hull, 0, 1.4, -0.2));
      b.add(box(1.9, 0.2, 0.06, m.teal, 0, 1.55, 1.11));
      for (const x of [-0.45, 0.45]) { const e = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, seg(12, 6)), m.lens, x, 1.25, 1.12); e.rotation.x = Math.PI / 2; b.add(e); }
      const head = new THREE.Group(); head.position.set(0.6, 2.1, -0.9); b.add(head);
      head.add(box(0.4, 0.2, 0.25, m.hull));
      const wheels = [];
      const vm = VK.parts.mats();
      for (const s of [-1, 1]) for (const z of [2.0, 0, -2.0]) {
        const w = VK.parts.wheel(0.55, 0.42, vm, seg); w.pivot.position.set(s * 1.45, -0.3, z); b.add(w.pivot);
        wheels.push(Object.assign(w, { x: s * 1.45, z, r: 0.55, steer: z > 1 ? 1 : z < -1 ? -1 : 0 }));
      }
      const props = [];
      for (const s of [-1, 1]) { const pod = new THREE.Group(); pod.position.set(s * 0.75, -0.25, -3.25); b.add(pod); pod.add(duct(0.38, m, seg)); const p = propeller(0.32, m, seg); pod.add(p); props.push(p); }
      const lamps = [lampAt(b, m, -0.9, 0.75, 2.6), lampAt(b, m, 0.9, 0.75, 2.6)];
      const beacon = mesh(new THREE.SphereGeometry(0.08, 8, 6), m.beacon, -0.6, 1.88, -1.0); b.add(beacon);
      return { lamps, beacon, head, props, wheels, stern: [[0.8, -3.3], [-0.8, -3.3]], bow: [[0.8, 3.1], [-0.8, 3.1]] };
    } },
];

// ---------- building one, and its motion ----------
function buildVessel(id, { detail = 1 } = {}) {
  const def = VESSELS.find((v) => v.id === id);
  if (!def) throw new Error("MarineKit: unknown vessel " + id);
  const m = mats(), seg = (n = 16, min = 3) => Math.max(min, Math.round(n * detail));
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);
  const parts = def.make(body, m, seg);
  const spot = new THREE.SpotLight(0xfff1d8, 0, 70, 0.6, 0.5, 1.3);
  spot.position.set(0, 1, def.length / 2); spot.target.position.set(0, def.id === "diver" ? -6 : -2, def.length / 2 + 20);
  body.add(spot, spot.target);
  const st = { y: 0, pitch: 0, roll: 0, depth: 0, vd: 0, lift: 0, work: 0, ping: 0, onLand: 0 };
  const tmp = new THREE.Vector3();

  return {
    def, group, body, parts,
    get depth() { return st.depth; }, get onLand() { return st.onLand > 0.5; },
    update(t, dt, opts = {}) {
      dt = Math.min(dt, 0.05);
      const speed = opts.speed || 0, steer = opts.steer || 0;
      // the pose comes from a behaviour (js/behaviors/water/craft.js — buoyancy, foils, thrusters, wheels, by forces);
      // without one the vessel stands at its waterline, level
      const P = opts.pose || { y: 0, pitch: 0, roll: 0 };
      st.y = P.y; st.pitch = P.pitch; st.roll = P.roll; st.lift = P.lift || 0; st.depth = P.depth || 0; st.onLand = P.onLand || 0; st.vd = P.vd || 0;
      body.position.y = st.y; body.rotation.set(st.pitch, 0, st.roll);
      // propellers, wheels, lamps, the beacon
      parts.props.forEach((p, i) => { p.rotation.z += (speed * 2.5 + (def.maxDepth ? st.vd * 6 : 0) + 1.5) * dt * (i % 2 ? -1 : 1); });
      if (parts.wheels) parts.wheels.forEach((w) => { w.spin.rotation.x += speed / w.r * dt * (st.onLand > 0.5 ? 1 : 0.3); w.pivot.rotation.y = w.steer * steer * 0.4; });
      const lights = opts.lights || 0;
      parts.lamps.forEach((l) => { l.material.emissiveIntensity = 0.2 + lights * 3; });
      spot.intensity = lights * (def.maxDepth ? 6 : 4) * THREE.LIGHT_SCALE;
      parts.beacon.material.emissiveIntensity = Math.sin(t * 5) > 0.3 ? 3 : 0.2;
      // the work, eased
      st.work += ((opts.work || 0) - st.work) * Math.min(1, dt * 1.2);
      const k = st.work;
      if (parts.head) parts.head.rotation.y = Math.sin(t * 0.7) * (0.3 + 0.9 * k);
      if (parts.radar) parts.radar.rotation.y += dt * 2.5;
      if (parts.hinge) parts.hinge.rotation.x = -1.35 + k * 1.45;
      if (parts.arm) {
        parts.arm.rotation.x = 0.9 - k * 1.0; parts.fore.rotation.x = -k * 0.4 + Math.sin(t * 1.3) * 0.1 * k;
        parts.claw.children.forEach((f, i) => { f.rotation.y = (i ? 1 : -1) * (0.3 - 0.25 * k * (0.5 + 0.5 * Math.sin(t * 2))); });
        st.ping = k > 0.5 ? (st.ping + dt / 2.2) % 1 : 0;
        parts.ping.scale.setScalar(1 + st.ping * 30); parts.ping.material.uniforms.opacity.value = k > 0.5 ? (1 - st.ping) * 0.5 : 0; parts.ping.visible = k > 0.5;
      }
      // the wake: foam at the stern, spray at the bow (at the surface, under way)
      if (opts.wake && Math.abs(speed) > 1 && (!def.maxDepth || st.depth < 1) && st.onLand < 0.5) {
        const s = Math.abs(speed), lifted = def.id === "skimmer" ? st.lift : 0;
        for (const [x, z] of parts.stern) if (Math.random() < Math.min(1, s * dt * 6)) {
          tmp.set(x + (Math.random() - 0.5) * 0.6, 0, z); group.localToWorld(tmp);
          opts.wake.emit(tmp, 0, s);
        }
        if (s > 5 && lifted < 0.6) for (const [x, z] of parts.bow) if (Math.random() < s * dt * 2) {
          tmp.set(x, 0, z); group.localToWorld(tmp);
          opts.wake.emit(tmp, 1, s);
        }
      }
    },
  };
}
function disposeVessel(v) {
  if (v.group.parent) v.group.parent.remove(v.group);
  v.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  if (v.parts.ping) v.parts.ping.material.dispose();
}

// ---------- the wake: foam on the water, spray in the air ----------
function makeWake() {
  const N = 1200;
  const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), age = new Float32Array(N).fill(99), kind = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aAge", new THREE.BufferAttribute(age, 1));
  geo.setAttribute("aKind", new THREE.BufferAttribute(kind, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uLight: { value: 1 } },
    vertexShader: `attribute float aAge; attribute float aKind; varying float vA; varying float vK;
      void main(){ float life = aKind > 0.5 ? 1.2 : 5.0; vA = clamp(1.0 - aAge / life, 0.0, 1.0); vK = aKind;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (aKind > 0.5 ? 60.0 + aAge * 120.0 : 120.0 + aAge * 260.0) / max(-mv.z, 0.5); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uLight; varying float vA; varying float vK;
      void main(){ float a = smoothstep(0.5, 0.1, length(gl_PointCoord - 0.5)) * vA * (vK > 0.5 ? 0.6 : 0.45); if (a < 0.005) discard;
        gl_FragColor = vec4(vec3(0.95, 0.98, 1.0) * uLight, a); }`,
    transparent: true, depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let next = 0;
  return {
    points, material: mat,
    emit(p, k, speed) {
      const i = next; next = (next + 1) % N;
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; age[i] = 0; kind[i] = k;
      const a = Math.random() * TAU, s = k ? 1.5 + speed * 0.1 : 0.4 + Math.random() * 0.6;
      vel[i * 3] = Math.cos(a) * s; vel[i * 3 + 1] = k ? 2 + Math.random() * speed * 0.25 : 0; vel[i * 3 + 2] = Math.sin(a) * s;
    },
    update(dt, heightAt) {
      for (let i = 0; i < N; i++) {
        if (age[i] > 6) continue;
        age[i] += dt;
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (kind[i]) { vel[i * 3 + 1] -= G * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; }
        else { pos[i * 3 + 1] = heightAt(pos[i * 3], pos[i * 3 + 2]) + 0.05; vel[i * 3] *= 1 - dt * 0.4; vel[i * 3 + 2] *= 1 - dt * 0.4; }
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.aAge.needsUpdate = true; geo.attributes.aKind.needsUpdate = true;
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

function modelStats(group) { return SK.modelStats(group); }

return { VESSELS, buildVessel, disposeVessel, makeWake, modelStats, hullGeometry };
})();
