// Ship lights for ShipKit ships: navigation lights from the model's anchors and gun flashes at the muzzles.
//  navLights(model)      → group with the masthead (white), side lights (green starboard, red port) and stern light
//                          (white); each is a small lamp with an HDR glow the post-process blooms. Side lights are
//                          screened: they shine only over their own side and ahead (112.5° arcs), the stern light only
//                          aft (135°), as at sea. setOn(0..1).
//  gunFlashes(model, scene) → { fire(filter), update(dt) }: a flash sprite at every muzzle of the main guns, one shared
//                          point light that lights the ship, the sea around (through the sea's own uniform) and the
//                          smoke for a tenth of a second. The point light exists from the start (constant light count:
//                          no shader recompiles when firing).
import * as THREE from '../../../vendor/three/three.module.js';

const LAMP_VERT = /* glsl */`
  uniform vec3 uAxis; uniform float uArc; varying float vSeen;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec3 toCam = normalize(vec3(cameraPosition.x - c.x, 0.0, cameraPosition.z - c.z));
    vec3 ax = normalize(mat3(modelMatrix) * uAxis);
    vSeen = uArc >= 3.14 ? 1.0 : smoothstep(cos(uArc * 0.5) - 0.03, cos(uArc * 0.5) + 0.03, dot(toCam, normalize(vec3(ax.x, 0.0, ax.z))));
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const LAMP_FRAG = /* glsl */`
  uniform vec3 uCol; uniform float uOn; varying float vSeen;
  void main() { gl_FragColor = vec4(uCol * uOn * (0.04 + 0.96 * vSeen), 1.0); }`;

function lamp(color, axis, arcDeg, r = 0.11) {
  const m = new THREE.ShaderMaterial({
    vertexShader: LAMP_VERT, fragmentShader: LAMP_FRAG, fog: false,
    uniforms: { uCol: { value: new THREE.Color(color).multiplyScalar(14) }, uOn: { value: 1 }, uAxis: { value: new THREE.Vector3(...axis) }, uArc: { value: arcDeg * Math.PI / 180 } },
  });
  return new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), m);
}

export function navLights(model) {
  const g = new THREE.Group(); g.name = 'navigation lights';
  const a = model.anchors || {};
  // arcs: masthead 225° ahead, side lights 112.5° from dead ahead to 22.5° abaft the beam, stern 135° aft
  const spec = [['masthead', 0xfff4e0, [0, 0, 1], 225], ['starboard', 0x31ff7a, [0.83, 0, 0.556], 112.5], ['port', 0xff2a1e, [-0.83, 0, 0.556], 112.5], ['stern', 0xfff4e0, [0, 0, -1], 135]];
  const lamps = [];
  for (const [k, col, ax, arc] of spec) {
    if (!a[k]) continue;
    const m = lamp(col, ax, arc); m.position.set(...a[k]); m.name = k + ' light'; g.add(m); lamps.push(m);
  }
  g.setOn = (v) => { for (const m of lamps) m.material.uniforms.uOn.value = v; g.visible = v > 0.01; };
  return g;
}

// soft radial sprite texture for flashes
let _flashTex = null;
function flashTexture() {
  if (_flashTex) return _flashTex;
  const N = 64, data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (x + 0.5) / N * 2 - 1, dy = (y + 0.5) / N * 2 - 1, r = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx), star = 0.35 * Math.pow(Math.abs(Math.cos(ang * 3)), 12);
    const v = Math.max(0, 1 - r) ** 2.2 + star * Math.max(0, 1 - r);
    const i = (y * N + x) * 4; data[i] = data[i + 1] = data[i + 2] = 255; data[i + 3] = Math.min(255, v * 255);
  }
  _flashTex = new THREE.DataTexture(data, N, N); _flashTex.needsUpdate = true; _flashTex.magFilter = THREE.LinearFilter;
  return _flashTex;
}

export function gunFlashes(model, scene, opt = {}) {
  const light = new THREE.PointLight(0xffb066, 0, 600, 2); light.castShadow = false; scene.add(light);
  const flashes = [];
  const sprites = [];
  const tmp = new THREE.Vector3(), dir = new THREE.Vector3();
  const muzzle = opt.muzzle ?? 5.1;                        // metres along the barrel from the gun's pivot (120 mm Bofors)
  function fire(filter = (m) => !m.aa && !m.torp) {
    const c = new THREE.Vector3(); let n = 0;
    for (const m of model.mounts) {
      if (!filter(m)) continue;
      for (const g of m.guns) {
        g.updateWorldMatrix(true, false);
        tmp.set(0, 0, muzzle).applyMatrix4(g.matrixWorld);
        dir.set(0, 0, 1).transformDirection(g.matrixWorld);
        for (let k = 0; k < 2; k++) {                      // the flash and a longer cone of burning gas ahead of it
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture(), color: new THREE.Color(k ? 0xff8a3a : 0xffd9a0).multiplyScalar(k ? 6 : 12), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
          s.position.copy(tmp).addScaledVector(dir, k ? 3.2 : 0.6); s.renderOrder = 4;
          s.userData = { t: 0, life: k ? 0.14 : 0.09, size: k ? 7 : 4.5 };
          scene.add(s); sprites.push(s);
        }
        c.add(tmp); n++;
      }
    }
    if (!n) return 0;
    light.position.copy(c.divideScalar(n)); flashes.push({ t: 0, life: 0.12, power: 9000 * Math.sqrt(n) });
    return n;
  }
  function update(dt) {
    let p = 0;
    for (let i = flashes.length - 1; i >= 0; i--) { const f = flashes[i]; f.t += dt; const k = 1 - f.t / f.life; if (k <= 0) flashes.splice(i, 1); else p += f.power * k * k; }
    light.intensity = p;
    for (let i = sprites.length - 1; i >= 0; i--) {
      const s = sprites[i], u = s.userData; u.t += dt; const k = 1 - u.t / u.life;
      if (k <= 0) { scene.remove(s); s.material.dispose(); sprites.splice(i, 1); continue; }
      s.scale.setScalar(u.size * (0.7 + 0.6 * (1 - k))); s.material.opacity = k;
    }
    return p;                                              // current flash power (the sea and sky can use it)
  }
  return { fire, update, light };
}

/* ---------------- signal lamp: searchlight with venetian shutters, Morse code ---------------- */
const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.' };
// Text → list of [open 0/1, units]; dot 1, dash 3, gap inside a letter 1, between letters 3, between words 7.
export function morse(text) {
  const out = [];
  const words = String(text).toUpperCase().split(/\s+/).filter(Boolean);
  words.forEach((w, wi) => {
    [...w].forEach((ch, ci) => {
      const code = MORSE[ch]; if (!code) return;
      [...code].forEach((s, si) => { out.push([1, s === '-' ? 3 : 1]); if (si < code.length - 1) out.push([0, 1]); });
      if (ci < w.length - 1) out.push([0, 3]);
    });
    if (wi < words.length - 1) out.push([0, 7]);
  });
  return out;
}

// signalLamp(model): a round shutter in front of the searchlight's lens (horizontal slats cut to the circle, on their own pivots, as on naval
// signal projectors: the operator's lever turns them all at once), a glow at the lens and a beam ahead, both only while
// the slats are open. send(text, {unit, repeat}) keys the message in Morse; stop() closes the shutters.
export function signalLamp(model, opt = {}) {
  const a = model.anchors && model.anchors.signal;
  const g = new THREE.Group(); g.name = 'signal lamp shutters';
  if (!a) return { group: g, send() {}, stop() {}, update() { return 0; }, get open() { return 0; }, get sending() { return false; } };
  const [x, y, z] = a.at, dia = a.dia, n = opt.slats || 7, mat = new THREE.MeshStandardMaterial({ color: 0x2e3236, roughness: 0.55, metalness: 0.5 });
  g.position.set(x, y, z + 0.06);
  // round shutter fitted to the drum: a ring on the lens rim and slats cut to the circle (each a band of the disc)
  const R = dia * 0.5, ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.015, 0.035, 8, 40), mat);
  g.add(ring);
  const h = 2 * R / n, slats = [];
  const band = (y0, y1) => {                                // the part of the disc between heights y0 and y1, as a flat shape
    const sh = new THREE.Shape(), seg = 10, xAt = (y) => Math.sqrt(Math.max(0, R * R - y * y));
    sh.moveTo(-xAt(y0), y0);
    for (let k = 0; k <= seg; k++) { const y = y0 + (y1 - y0) * k / seg; sh.lineTo(xAt(y), y); }
    for (let k = seg; k >= 0; k--) { const y = y0 + (y1 - y0) * k / seg; sh.lineTo(-xAt(y), y); }
    return sh;
  };
  for (let i = 0; i < n; i++) {
    const yc = -R + h * (i + 0.5), pivot = new THREE.Group(); pivot.position.set(0, yc, 0);
    const geo = new THREE.ExtrudeGeometry(band(-R + h * i - 0.01, -R + h * (i + 1) + 0.01), { depth: 0.014, bevelEnabled: false });
    geo.translate(0, -yc, -0.007);
    pivot.add(new THREE.Mesh(geo, mat));
    const half = Math.sqrt(Math.max(0, R * R - yc * yc));
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, half * 2 + 0.04, 6), mat); rod.rotation.z = Math.PI / 2; pivot.add(rod);
    g.add(pivot); slats.push(pivot);
  }
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.35), mat); lever.position.set(R + 0.06, 0, -0.1); g.add(lever);
  // glow at the lens (seen from ahead) and the beam
  const glowMat = new THREE.SpriteMaterial({ map: flashTexture(), color: new THREE.Color(0xfff1d6).multiplyScalar(3.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: 0 });
  const glow = new THREE.Sprite(glowMat); glow.position.set(0, 0, 0.12); glow.scale.setScalar(dia * 3.2); glow.renderOrder = 5; g.add(glow);
  const beamGeo = new THREE.CylinderGeometry(dia * 0.4, 9, 160, 24, 1, true); beamGeo.rotateX(Math.PI / 2); beamGeo.translate(0, 0, 80.2);
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying float vZ; varying vec3 vN, vV; void main(){ vZ = position.z / 160.0; vec4 wp = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: 'uniform float uI; varying float vZ; varying vec3 vN, vV; void main(){ float edge = pow(1.0 - abs(dot(normalize(vN), vV)), 1.5); float a = uI * (1.0 - edge) * pow(1.0 - vZ, 2.0) * 0.18; gl_FragColor = vec4(vec3(1.0, 0.95, 0.85) * a, 1.0); }',
  });
  const beam = new THREE.Mesh(beamGeo, beamMat); beam.renderOrder = 5; g.add(beam);
  model.group.add(g);

  let plan = [], step = 0, left = 0, unit = 0.22, repeat = false, text = '', open = 0, want = 0;
  const tmp = new THREE.Vector3(), fwd = new THREE.Vector3();
  function send(t = 'SOS', o = {}) { text = t; unit = o.unit ?? 0.22; repeat = o.repeat ?? true; plan = morse(t); step = 0; left = plan.length ? plan[0][1] * unit : 0; want = plan.length ? plan[0][0] : 0; }
  function stop() { plan = []; want = 0; }
  // dark: 0 day … 1 night (the beam is only seen against a dark sky or in haze)
  function update(dt, camera, dark = 0.5) {
    if (plan.length) {
      left -= dt;
      while (left <= 0 && plan.length) {
        step++;
        if (step >= plan.length) { if (!repeat) { plan = []; want = 0; break; } step = -1; left += 7 * unit; want = 0; continue; }   // a word gap, then again
        left += plan[step][1] * unit; want = plan[step][0];
      }
    }
    open += Math.max(-dt / 0.06, Math.min(dt / 0.06, want - open));           // the slats swing in about 60 ms
    for (const s of slats) s.rotation.x = -open * 1.4;
    lever.rotation.x = -open * 0.6;
    g.getWorldPosition(tmp); fwd.set(0, 0, 1).transformDirection(g.matrixWorld);
    const facing = camera ? Math.max(0, fwd.dot(tmp.clone().sub(camera.position).normalize().negate())) : 1;
    glowMat.opacity = open * Math.pow(facing, 4); glow.scale.setScalar(dia * (1.0 + 1.3 * facing));
    beamMat.uniforms.uI.value = open * (0.15 + 0.85 * dark);
    return open;
  }
  return { group: g, send, stop, update, get open() { return open; }, get sending() { return plan.length > 0; }, get text() { return text; } };
}
