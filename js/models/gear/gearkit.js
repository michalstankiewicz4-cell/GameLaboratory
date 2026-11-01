// GearKit: the hero's items that give light — a flashlight, a lantern, a glow stick, a lighter, a phone's screen —
// each a small model held in the hand (in first person) with its light: the colour of its light (temperature in
// kelvins), its power, its beam (a narrow hot spot and a wide spill for the flashlight), its flicker (a flame, a weak
// battery) and how a battery or a chemical charge runs down. The model only: no scene, no camera.
//
//   const item = makeItem('flashlight', { power, angle, kelvin, charge });
//   camera.add(item.group);            // held in the hand: the group is placed in the camera's space
//   each frame: item.update(dt)        // flicker, and the charge running down (item.drain = true; item.timeScale
//                                      // speeds the running down only, e.g. 60: a minute is an hour)
//   item.set({ power, angle, kelvin, charge }); item.dispose()
import * as THREE from '../../../vendor/three/three.module.js';

// black-body colour of a light at T kelvins (Tanner Helland's fit), as a linear THREE.Color
export function kelvinColor(T) {
  const t = T / 100; let r, g, b;
  if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; } else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); }
  if (t >= 66) b = 255; else if (t <= 19) b = 0; else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = (v) => Math.max(0, Math.min(255, v)) / 255;
  return new THREE.Color().setRGB(c(r), c(g), c(b), THREE.SRGBColorSpace);
}

export const ITEMS = {
  flashlight: { name: 'Flashlight', namePl: 'Latarka', kind: 'spot', kelvin: 5600, power: 1, angle: 22, range: 60, spill: true, flicker: 'battery', drainMin: 90,
    note: 'A narrow, bright hot spot inside a wide, faint spill; white LED light. On a weak battery it dims and flickers.' },
  lantern: { name: 'Lantern', namePl: 'Lampa naftowa', kind: 'point', kelvin: 1900, power: 1, range: 14, flicker: 'flame', drainMin: 240,
    note: 'Warm light all around from a small flame behind glass; it breathes and wavers.' },
  glowstick: { name: 'Glow stick', namePl: 'Światło chemiczne', kind: 'point', color: 0x5dff7a, power: 0.35, range: 6, flicker: 'none', drainMin: 480,
    note: 'A cold green glow close around it; fades slowly over hours.' },
  lighter: { name: 'Lighter', namePl: 'Zapalniczka', kind: 'point', kelvin: 1700, power: 0.3, range: 5, flicker: 'flame', drainMin: 30,
    note: 'A small flame: a little warm light, restless.' },
  phone: { name: 'Phone screen', namePl: 'Ekran telefonu', kind: 'spot', kelvin: 7000, power: 0.12, angle: 70, range: 4, flicker: 'none', drainMin: 360,
    note: 'A cold, soft light from the screen, only on what is right in front.' },
};

/* ---------------- the models in the hand (simple, readable shapes) ---------------- */
const metal = (c, r = 0.35) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.8 });
const plastic = (c, r = 0.6) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 });
const glow = (c, i = 2) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i });
function cyl(r1, r2, h, mat, seg = 20) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); return m; }

function modelOf(id, def) {
  const g = new THREE.Group(), emitters = [];
  if (id === 'flashlight') {
    const body = cyl(0.016, 0.016, 0.16, metal(0x24272c, 0.45)); body.rotation.x = Math.PI / 2; g.add(body);
    const head = cyl(0.026, 0.017, 0.05, metal(0x2c3036, 0.3)); head.rotation.x = Math.PI / 2; head.position.z = -0.1; g.add(head);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.024, 24), glow(0xffffff, 3)); lens.position.z = -0.1251; lens.rotation.y = Math.PI; g.add(lens); emitters.push(lens);
    const grip = cyl(0.0175, 0.0175, 0.06, plastic(0x111214, 0.9)); grip.rotation.x = Math.PI / 2; grip.position.z = 0.03; g.add(grip);
    const btn = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.006, 0.014), plastic(0x8a1f1f)); btn.position.set(0, 0.018, -0.02); g.add(btn);
  } else if (id === 'lantern') {
    const base = cyl(0.05, 0.055, 0.03, metal(0x3a3024, 0.5)); g.add(base);
    const glass = cyl(0.035, 0.04, 0.09, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.9, thickness: 0.01, transparent: true, opacity: 0.35 })); glass.position.y = 0.06; g.add(glass);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8).scale(1, 2.2, 1), glow(0xffa040, 6)); flame.position.y = 0.055; g.add(flame); emitters.push(flame);
    const cap = cyl(0.03, 0.045, 0.025, metal(0x3a3024, 0.5)); cap.position.y = 0.118; g.add(cap);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.003, 6, 24, Math.PI), metal(0x3a3024, 0.5)); handle.position.y = 0.13; g.add(handle);
  } else if (id === 'glowstick') {
    const stick = cyl(0.008, 0.008, 0.15, glow(def.color, 3), 12); stick.rotation.z = Math.PI / 2.4; g.add(stick); emitters.push(stick);
    const capA = cyl(0.009, 0.009, 0.012, plastic(0x2a2a2a)); capA.rotation.z = Math.PI / 2.4; capA.position.set(0.07, 0.027, 0); g.add(capA);
  } else if (id === 'lighter') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.06, 0.012), plastic(0xb03a2e, 0.4)); g.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.012), metal(0x9aa0a6, 0.3)); top.position.y = 0.036; g.add(top);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8).scale(1, 2.6, 1), glow(0xffb050, 6)); flame.position.y = 0.058; g.add(flame); emitters.push(flame);
  } else if (id === 'phone') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.145, 0.008), plastic(0x15171a, 0.3)); g.add(body);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.064, 0.136), glow(0xdfe8ff, 1.2)); screen.position.z = -0.0041; screen.rotation.y = Math.PI; g.add(screen); emitters.push(screen);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 10; } });
  return { g, emitters };
}

// where each item is held, in the camera's space (right hand; the lantern lower and to the left)
const HOLD = {
  flashlight: [[0.16, -0.14, -0.32], [0.04, 0.06, 0]], lantern: [[-0.2, -0.24, -0.4], [0, 0, 0]], glowstick: [[0.16, -0.16, -0.34], [0.2, 0.3, 0]],
  lighter: [[0.13, -0.15, -0.3], [0, 0, 0]], phone: [[0.12, -0.13, -0.3], [-0.5, 0.25, 0]],
};

export function makeItem(id, opts = {}) {
  const def = ITEMS[id]; if (!def) throw new Error('unknown item ' + id);
  const st = { power: def.power, angle: def.angle || 30, kelvin: def.kelvin || 4000, charge: 1, ...opts };
  const { g, emitters } = modelOf(id, def);
  const group = new THREE.Group(); group.add(g);
  const [p, r] = HOLD[id]; group.position.set(...p); group.rotation.set(...r);
  const lights = [];
  let main, spill = null;
  if (def.kind === 'spot') {
    main = new THREE.SpotLight(0xffffff, 1, def.range, 0.4, 0.35, 2); main.castShadow = id === 'flashlight';
    main.shadow.mapSize.set(1024, 1024); main.shadow.bias = -0.0005; main.shadow.camera.near = 0.05;
    main.position.set(0, 0, id === 'phone' ? -0.01 : -0.13); main.target.position.set(0, 0, -5);
    g.add(main, main.target); lights.push(main);
    if (def.spill) { spill = new THREE.SpotLight(0xffffff, 1, def.range * 0.6, 0.9, 1, 2); spill.position.copy(main.position); spill.target.position.set(0, 0, -5); g.add(spill, spill.target); lights.push(spill); }
  } else {
    main = new THREE.PointLight(0xffffff, 1, def.range, 2); main.castShadow = id === 'lantern';
    main.shadow.mapSize.set(512, 512); main.shadow.bias = -0.002; main.shadow.camera.near = 0.03;
    main.position.copy(emitters[0].position); g.add(main); lights.push(main);
  }
  let flick = 1, phase = Math.random() * 100;
  const item = {
    id, def, group, lights, state: st, drain: false, timeScale: 1,
    set(o) { Object.assign(st, o); apply(); },
    update(dt) {
      if (item.drain && st.charge > 0) st.charge = Math.max(0, st.charge - dt * item.timeScale / (def.drainMin * 60));
      phase += dt;
      if (def.flicker === 'flame') flick = 0.82 + 0.1 * Math.sin(phase * 13.1) + 0.06 * Math.sin(phase * 31.7 + 1.3) + 0.05 * Math.sin(phase * 5.3);
      else if (def.flicker === 'battery' && st.charge < 0.15) flick = Math.sin(phase * 47) > 0.92 - (0.15 - st.charge) * 3 ? 0.25 : 1;
      else flick = 1;
      apply();
    },
    dispose() { group.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); for (const l of lights) if (l.shadow && l.shadow.map) l.shadow.map.dispose(); },
  };
  function apply() {
    const col = def.color != null ? new THREE.Color(def.color) : kelvinColor(st.kelvin);
    // a battery's light falls off steeply only at the end; a chemical glow fades evenly
    const charge = def.flicker === 'battery' ? Math.min(1, st.charge * 3) * (0.35 + 0.65 * st.charge) : 0.15 + 0.85 * st.charge;
    const I = st.power * charge * flick;
    if (def.kind === 'spot') {
      main.color.copy(col); main.angle = st.angle * Math.PI / 180; main.intensity = I * (id === 'phone' ? 3 : 120) * Math.PI;
      if (spill) { spill.color.copy(col); spill.angle = Math.min(1.2, main.angle * 2.6); spill.intensity = I * 10 * Math.PI; }
    } else { main.color.copy(col); main.intensity = I * 4 * Math.PI; }
    for (const e of emitters) { e.material.emissive.copy(col); e.material.emissiveIntensity = (id === 'phone' ? 1.2 : 4) * Math.max(0.05, charge * flick); }
  }
  apply();
  return item;
}
