// RainKit: falling rain around the camera in one draw call. Each drop is a short line (its motion blur) in a box that
// follows the camera and wraps, so the rain never runs out; wind slants it, distance and the fog fade it.
// Units: metres, seconds. rain(u) returns the mesh; set u.uRain (0..1), u.uWindR (m/s, x/z), u.uTimeR every frame.
// lightning(scene, opt) adds strikes: a jagged bolt with branches from the cloud base to the sea, a few flickers long,
// lighting the clouds (SkyKit uSkyBolt), the scene (one directional light kept from the start) and the sea; thunder
// follows after distance / 343 m/s (procedural, Web Audio, only when sound is switched on).
import * as THREE from '../../vendor/three.module.js';

export function rainUniforms() {
  return {
    uRain: { value: 0 }, uTimeR: { value: 0 }, uWindR: { value: new THREE.Vector2() }, uRainCol: { value: new THREE.Color(0xc8d0d6) },
    uBox: { value: new THREE.Vector3(70, 45, 70) }, uFall: { value: 8.5 }, uStreak: { value: 0.045 },
  };
}

export function rainMesh(u, maxDrops = 24000) {
  const seed = new Float32Array(maxDrops * 2 * 4);
  for (let i = 0; i < maxDrops; i++) {
    const x = Math.random(), y = Math.random(), z = Math.random(), r = Math.random();
    seed.set([x, y, z, r * 0.999], i * 8); seed.set([x, y, z, 1 + r * 0.999], i * 8 + 4);   // w: 0..1 top end, 1..2 bottom end; fract = per-drop random
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(maxDrops * 6), 3));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.NormalBlending, fog: false,
    vertexShader: /* glsl */`
      uniform float uRain, uTimeR, uFall, uStreak; uniform vec2 uWindR; uniform vec3 uBox;
      attribute vec4 aSeed; varying float vA;
      void main() {
        float rnd = fract(aSeed.w), bottom = step(1.0, aSeed.w);
        float fall = uFall * (0.8 + 0.4 * rnd);
        vec3 vel = vec3(uWindR.x, -fall, uWindR.y);
        vec3 p = aSeed.xyz * uBox + vel * uTimeR;
        vec3 origin = cameraPosition - uBox * 0.5;
        p = origin + mod(p - origin, uBox);                       // wrap into the box around the camera
        p -= vel * uStreak * bottom;                              // the tail: where the drop was a moment ago
        float d = length(p - cameraPosition);
        vA = (1.0 - bottom * 0.85) * smoothstep(uBox.x * 0.5, uBox.x * 0.2, d) * smoothstep(0.4, 1.5, d) * step(-0.2, p.y);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uRain; uniform vec3 uRainCol; varying float vA;
      void main() { gl_FragColor = vec4(uRainCol, vA * (0.18 + 0.22 * uRain)); }`,
  });
  const mesh = new THREE.LineSegments(g, m);
  mesh.frustumCulled = false; mesh.renderOrder = 3;
  mesh.setRain = (amount) => { g.setDrawRange(0, Math.round(maxDrops * Math.min(1, amount)) * 2); mesh.visible = amount > 0.005; };
  mesh.setRain(0);
  return mesh;
}

/* ---------------- lightning ---------------- */
function boltGeometry(rnd, top, width) {
  // midpoint displacement in the vertical plane facing the camera; returns triangle strip quads for the main channel and branches
  const pts = [[0, top], [0, 0]];
  const split = (a, b, depth, out) => {
    if (depth === 0) { out.push(a); return; }
    const mx = (a[0] + b[0]) / 2 + (rnd() - 0.5) * Math.abs(b[1] - a[1]) * 0.45, my = (a[1] + b[1]) / 2 + (rnd() - 0.5) * Math.abs(b[1] - a[1]) * 0.1;
    split(a, [mx, my], depth - 1, out); split([mx, my], b, depth - 1, out);
  };
  const main = []; split(pts[0], pts[1], 7, main); main.push(pts[1]);
  const lines = [[main, width]];
  for (let k = 0; k < 4; k++) {                      // branches from the upper half
    const i = 4 + Math.floor(rnd() * main.length * 0.5), s = main[i], len = top * (0.15 + rnd() * 0.25), dirx = rnd() < 0.5 ? -1 : 1;
    const br = []; split(s, [s[0] + dirx * len * 0.6, s[1] - len], 5, br); br.push([s[0] + dirx * len * 0.6, s[1] - len]);
    lines.push([br, width * 0.45]);
  }
  const pos = [], alpha = [];
  for (const [ln, w] of lines) for (let i = 0; i < ln.length - 1; i++) {
    const [x0, y0] = ln[i], [x1, y1] = ln[i + 1];
    let nx = -(y1 - y0), ny = x1 - x0; const l = Math.hypot(nx, ny) || 1; nx = nx / l * w; ny = ny / l * w;
    pos.push(x0 - nx, y0 - ny, 0, x0 + nx, y0 + ny, 0, x1 + nx, y1 + ny, 0, x0 - nx, y0 - ny, 0, x1 + nx, y1 + ny, 0, x1 - nx, y1 - ny, 0);
    for (let j = 0; j < 6; j++) alpha.push(w / width);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aW', new THREE.Float32BufferAttribute(alpha, 1));
  return g;
}

export function lightning(scene, opt = {}) {
  const light = new THREE.DirectionalLight(0xc8d4ff, 0); scene.add(light, light.target);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: 'attribute float aW; varying float vW; void main(){ vW = aW; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uI; varying float vW; void main(){ gl_FragColor = vec4(vec3(0.8, 0.85, 1.0) * uI * (0.4 + 0.6 * vW) * 30.0, 1.0); }',
  });
  let bolt = null, strike = null, next = 3, audio = null;
  const S = { rate: 0, sound: false, fogK: 0, ...opt };
  function thunder(delay, dist) {
    if (!S.sound) return;
    try {
      audio = audio || new AudioContext();
      const len = 4 + Math.min(4, dist / 1500), sr = audio.sampleRate, buf = audio.createBuffer(1, Math.floor(len * sr), sr), d = buf.getChannelData(0);
      let b = 0; for (let i = 0; i < d.length; i++) { b = b * 0.985 + (Math.random() * 2 - 1) * 0.015; const t = i / sr; d[i] = b * 9 * (Math.exp(-t * 0.9) * (0.6 + 0.4 * Math.sin(t * 7 + Math.sin(t * 2.3) * 3))); }
      const src = audio.createBufferSource(), lp = audio.createBiquadFilter(), gn = audio.createGain();
      src.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = 900 - Math.min(700, dist / 10); gn.gain.value = Math.min(1, 2500 / dist) * 0.8;
      src.connect(lp).connect(gn).connect(audio.destination); src.start(audio.currentTime + delay);
    } catch { /* no audio */ }
  }
  function strikeNow(camera, rnd = Math.random) {
    const az = rnd() * Math.PI * 2, dist = 1500 + rnd() * 4500, top = 700 + rnd() * 300;
    const at = new THREE.Vector3(camera.position.x + Math.sin(az) * dist, 0, camera.position.z + Math.cos(az) * dist);
    if (bolt) { scene.remove(bolt); bolt.geometry.dispose(); }
    bolt = new THREE.Mesh(boltGeometry(rnd, top, 9 + dist / 450), mat); bolt.frustumCulled = false; bolt.renderOrder = 2;
    bolt.position.copy(at); bolt.lookAt(camera.position.x, 0, camera.position.z); scene.add(bolt);
    const dir = new THREE.Vector3(at.x - camera.position.x, top * 0.6, at.z - camera.position.z).normalize();
    // flicker: return strokes as a list of [start, length] in seconds
    const strokes = [[0, 0.07]]; let t = 0.09; for (let k = 0; k < 1 + Math.floor(rnd() * 3); k++) { t += 0.04 + rnd() * 0.08; strokes.push([t, 0.04 + rnd() * 0.05]); }
    strike = { t: 0, strokes, dir, at, dist, end: t + 0.3 };
    light.position.copy(camera.position).addScaledVector(dir, 500); light.target.position.copy(camera.position);
    thunder(dist / 343, dist);
    return strike;
  }
  // returns the flash 0..1 (for the sky and the sea) and its direction
  function update(dt, camera) {
    if (S.rate > 0) { next -= dt; if (next <= 0) { strikeNow(camera); next = (4 + Math.random() * 14) / S.rate; } }
    let I = 0;
    if (strike) {
      strike.t += dt;
      for (const [s, l] of strike.strokes) if (strike.t >= s && strike.t < s + l) I = Math.max(I, 1 - (strike.t - s) / l * 0.6);
      I += Math.max(0, 1 - strike.t / strike.end) * 0.08;   // afterglow in the cloud
      if (strike.t > strike.end) { strike = null; if (bolt) bolt.visible = false; }
    }
    const near = strike ? Math.min(1, 2500 / strike.dist) : 0;
    const seen = strike ? Math.max(0.12, Math.exp(-((strike.dist * S.fogK) ** 2))) : 1;     // rain and fog hide the channel, not the flash
    mat.uniforms.uI.value = I * seen; if (bolt) bolt.visible = I > 0.15;
    light.intensity = I * 2.2 * near;
    return { I: I * (0.5 + 0.5 * near), dir: strike ? strike.dir : null, at: strike ? strike.at : null };
  }
  // call from a click (browsers start audio only after a user gesture)
  const unlock = () => { try { audio = audio || new AudioContext(); audio.resume(); } catch { /* no audio */ } };
  return { S, update, strikeNow, unlock, light };
}
