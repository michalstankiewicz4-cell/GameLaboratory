// Pixel Studio, 3D → pixel art: a model is rendered (orthographic, no anti-aliasing) at the pixel resolution × a
// supersampling factor into two buffers — colour (albedo, unlit) and view-space normal + depth — then lit in
// JavaScript the way pixel artists light: one light, a few hard steps, each step a hue-shifted shade of the surface
// colour (cooler shadows, warmer lights). The app then maps to a palette, downsamples by majority (clean edges),
// draws inner lines where the depth jumps, the outer outline, and cleans up.
// Subjects: simple props built here (crate, barrel, chest, sword, mushroom, house, rock, adventurer with a walk
// cycle) and the project's own models (PlantKit trees in the wind, ShipKit ships rolling on a swell).
import * as THREE from '../../../vendor/three/three.module.js';
import { PixelImage, shade } from './core.js';
import { SPECIES, SPECIES_IDS, growPlant, leafTexture, barkTexture } from '../../models/plants/plantkit.js';
import { SHIP_IDS, buildShip, shipInfo } from '../../models/ships-sea/index.js';

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const mesh = (g, m, p = [0, 0, 0], r = [0, 0, 0]) => { const x = new THREE.Mesh(g, m); x.position.set(...p); x.rotation.set(...r); return x; };

/* ---------------- subjects ---------------- */
export const SUBJECTS = {
  crate: { label: 'Wooden crate', anims: ['turn'], build() {
    const g = new THREE.Group(), wood = std(0x9a6a3c), dark = std(0x6a4526);
    g.add(mesh(new THREE.BoxGeometry(1, 1, 1), wood, [0, 0.5, 0]));
    for (const [x, z] of [[-0.46, -0.46], [0.46, -0.46], [-0.46, 0.46], [0.46, 0.46]]) g.add(mesh(new THREE.BoxGeometry(0.1, 1.02, 0.1), dark, [x, 0.5, z]));
    for (const y of [0.04, 0.96]) for (const s of [-1, 1]) { g.add(mesh(new THREE.BoxGeometry(1.02, 0.1, 0.1), dark, [0, y, s * 0.46])); g.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 1.02), dark, [s * 0.46, y, 0])); }
    for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.08, 1.25, 0.03), dark, [0, 0.5, s * 0.505], [0, 0, 0.78]));
    return { group: g };
  } },
  barrel: { label: 'Barrel', anims: ['turn'], build() {
    const g = new THREE.Group(), pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.42 + 0.08 * Math.sin(t * Math.PI), t * 1.1)); }
    g.add(mesh(new THREE.LatheGeometry(pts, 24), std(0x8f5a32)));
    g.add(mesh(new THREE.CircleGeometry(0.42, 24), std(0x7a4a28), [0, 1.1, 0], [-Math.PI / 2, 0, 0]));
    for (const y of [0.12, 0.38, 0.72, 0.98]) g.add(mesh(new THREE.TorusGeometry(0.42 + 0.08 * Math.sin(y / 1.1 * Math.PI) + 0.01, 0.025, 6, 24), std(0x3b3b40, { metalness: 0.6 }), [0, y, 0], [Math.PI / 2, 0, 0]));
    return { group: g };
  } },
  chest: { label: 'Treasure chest', anims: ['turn', 'open'], build() {
    const g = new THREE.Group(), wood = std(0x7a4a2a), gold = std(0xd4a640, { metalness: 0.7, roughness: 0.4 });
    g.add(mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), wood, [0, 0.3, 0]));
    for (const x of [-0.5, 0.5]) g.add(mesh(new THREE.BoxGeometry(0.08, 0.62, 0.82), gold, [x, 0.31, 0]));
    const lid = new THREE.Group(); lid.position.set(0, 0.6, -0.4); g.add(lid);
    const half = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 16, 1, false, 0, Math.PI); half.rotateZ(Math.PI / 2); half.rotateX(Math.PI / 2);
    lid.add(mesh(half, wood, [0, 0, 0.4])); for (const x of [-0.5, 0.5]) { const b = new THREE.CylinderGeometry(0.41, 0.41, 0.08, 16, 1, false, 0, Math.PI); b.rotateZ(Math.PI / 2); b.rotateX(Math.PI / 2); lid.add(mesh(b, gold, [x, 0, 0.4])); }
    g.add(mesh(new THREE.BoxGeometry(0.16, 0.2, 0.05), gold, [0, 0.55, 0.42]));
    return { group: g, animate: (t, a) => { lid.rotation.x = a === 'open' ? -Math.sin(t * Math.PI) * 1.2 : 0; } };
  } },
  sword: { label: 'Sword', anims: ['turn'], build() {
    const g = new THREE.Group(), steel = std(0xc8d0d8, { metalness: 0.8, roughness: 0.3 }), gold = std(0xc89a3a, { metalness: 0.7 }), grip = std(0x5a3422);
    const sh = new THREE.Shape(); sh.moveTo(-0.07, 0); sh.lineTo(0.07, 0); sh.lineTo(0.06, 1.25); sh.lineTo(0, 1.4); sh.lineTo(-0.06, 1.25); sh.closePath();
    const blade = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.02, bevelSegments: 1 }); blade.translate(0, 0.42, -0.015);
    g.add(mesh(blade, steel)); g.add(mesh(new THREE.BoxGeometry(0.42, 0.06, 0.08), gold, [0, 0.42, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 8), grip, [0, 0.25, 0])); g.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), gold, [0, 0.08, 0]));
    return { group: g };
  } },
  mushroom: { label: 'Mushroom', anims: ['turn', 'bob'], build() {
    const g = new THREE.Group(), pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(0.16 + 0.05 * (1 - t) - 0.03 * Math.sin(t * 3), t * 0.6)); }
    g.add(mesh(new THREE.LatheGeometry(pts, 16), std(0xeee6d2)));
    const cap = mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0xc0302a), [0, 0.55, 0]); cap.scale.set(1, 0.7, 1); g.add(cap);
    for (let k = 0; k < 9; k++) { const a = k * 2.4, e = 0.3 + (k % 3) * 0.35; g.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), std(0xf4f0e6), [Math.cos(a) * Math.sin(e) * 0.5, 0.55 + Math.cos(e) * 0.35, Math.sin(a) * Math.sin(e) * 0.5])); }
    return { group: g, animate: (t, a) => { g.scale.y = a === 'bob' ? 1 + 0.06 * Math.sin(t * Math.PI * 2) : 1; } };
  } },
  house: { label: 'Cottage', anims: ['turn'], build() {
    const g = new THREE.Group(), wall = std(0xe8e0cc), roof = std(0xa83a2a), wood = std(0x6a4526), glass = std(0x3a5a7a);
    g.add(mesh(new THREE.BoxGeometry(2, 1.2, 1.4), wall, [0, 0.6, 0]));
    const r = new THREE.Shape(); r.moveTo(-1.15, 0); r.lineTo(1.15, 0); r.lineTo(0, 0.9); r.closePath(); const rg = new THREE.ExtrudeGeometry(r, { depth: 1.6, bevelEnabled: false }); rg.translate(0, 1.2, -0.8);
    g.add(mesh(rg, roof)); g.add(mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), std(0x8a7a6a), [0.55, 1.75, -0.2]));
    g.add(mesh(new THREE.BoxGeometry(0.36, 0.7, 0.04), wood, [0, 0.35, 0.71]));
    for (const x of [-0.6, 0.6]) { g.add(mesh(new THREE.BoxGeometry(0.34, 0.3, 0.04), glass, [x, 0.75, 0.71])); g.add(mesh(new THREE.BoxGeometry(0.4, 0.05, 0.06), wood, [x, 0.58, 0.72])); }
    return { group: g };
  } },
  rock: { label: 'Boulder', anims: ['turn'], build() {
    const geo = new THREE.IcosahedronGeometry(0.6, 3), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i), k = 1 + 0.18 * Math.sin(v.x * 7.1) * Math.cos(v.y * 5.3) + 0.12 * Math.sin(v.z * 9.7 + v.x * 3); v.multiplyScalar(k); v.y = Math.max(v.y * 0.75, -0.1); p.setXYZ(i, v.x, v.y + 0.35, v.z); }
    geo.computeVertexNormals();
    const g = new THREE.Group(); g.add(mesh(geo, std(0x8a8478, { flatShading: true }))); return { group: g };
  } },
  adventurer: { label: 'Adventurer (walk cycle)', anims: ['walk', 'idle', 'turn'], build() {
    const g = new THREE.Group(), skin = std(0xe0b090), tunic = std(0x2f6a3a), pants = std(0x5a4a3a), boot = std(0x3a2a20), hair = std(0x5a3a1a), belt = std(0x2a1a10), cape = std(0x8a2a2a);
    const pivot = (x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); g.add(p); return p; };
    const legL = pivot(-0.12, 0.8, 0), legR = pivot(0.12, 0.8, 0), armL = pivot(-0.3, 1.35, 0), armR = pivot(0.3, 1.35, 0);
    for (const L of [legL, legR]) { L.add(mesh(new THREE.BoxGeometry(0.18, 0.55, 0.2), pants, [0, -0.28, 0])); L.add(mesh(new THREE.BoxGeometry(0.2, 0.25, 0.28), boot, [0, -0.68, 0.03])); }
    for (const A of [armL, armR]) { A.add(mesh(new THREE.BoxGeometry(0.15, 0.5, 0.16), tunic, [0, -0.25, 0])); A.add(mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), skin, [0, -0.55, 0])); }
    g.add(mesh(new THREE.BoxGeometry(0.46, 0.6, 0.28), tunic, [0, 1.1, 0])); g.add(mesh(new THREE.BoxGeometry(0.48, 0.08, 0.3), belt, [0, 0.85, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.65, 0.04), cape, [0, 1.05, -0.17]));
    const head = mesh(new THREE.BoxGeometry(0.32, 0.34, 0.3), skin, [0, 1.6, 0]); g.add(head); g.add(mesh(new THREE.BoxGeometry(0.34, 0.12, 0.32), hair, [0, 1.75, -0.01]));
    for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), std(0x1a1a1a), [s * 0.07, 1.62, 0.155]));
    return { group: g, animate: (t, a) => {
      const w = a === 'walk' ? Math.sin(t * Math.PI * 2) : 0;
      legL.rotation.x = w * 0.6; legR.rotation.x = -w * 0.6; armL.rotation.x = -w * 0.5; armR.rotation.x = w * 0.5;
      g.position.y = a === 'walk' ? Math.abs(Math.cos(t * Math.PI * 2)) * 0.04 : a === 'idle' ? Math.sin(t * Math.PI * 2) * 0.015 : 0;
      head.rotation.y = a === 'idle' ? Math.sin(t * Math.PI * 2) * 0.25 : 0;
    } };
  } },
  tree: { label: 'Tree (PlantKit)', anims: ['wind', 'turn'], options: () => SPECIES_IDS.map((id) => [id, SPECIES[id].name]), build(opt) {
    const id = opt.option || 'oak', p = growPlant(id, { seed: opt.seed || 1, size: 1, detail: 0.75 }), g = new THREE.Group();
    if (p.bark) g.add(mesh(p.bark, new THREE.MeshStandardMaterial({ map: barkTexture(SPECIES[id].bark) })));
    g.add(mesh(p.leaf, new THREE.MeshStandardMaterial({ map: leafTexture(SPECIES[id].leaf), alphaTest: 0.42, side: THREE.DoubleSide })));
    return { group: g, wind: true };
  } },
  ship: { label: 'Ship (ShipKit)', anims: ['roll', 'turn'], options: () => SHIP_IDS.map((id) => [id, shipInfo(id).name]), build(opt) {
    const s = buildShip(opt.option || 'blyskawica', { detail: 0.5 }), g = new THREE.Group(); g.add(s.group);
    return { group: g, animate: (t, a) => { s.group.rotation.z = a === 'roll' ? Math.sin(t * Math.PI * 2) * 0.06 : 0; s.group.rotation.x = a === 'roll' ? Math.cos(t * Math.PI * 2) * 0.02 : 0; } };
  } },
};
export const SUBJECT_IDS = Object.keys(SUBJECTS);

/* ---------------- passes ---------------- */
const PASS_VERT = /* glsl */`
  attribute vec3 aWind;
  uniform float uT, uWindAmp;
  varying vec2 vUv; varying vec3 vN; varying float vZ;
  void main() {
    vec3 p = position;
  #ifdef WIND
    p.xz += vec2(0.8, 0.6) * aWind.x * uWindAmp * (0.7 * sin(6.2831853 * uT + aWind.z * 0.8) + 0.3 * sin(12.566 * uT + aWind.z * 3.0));
  #endif
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal); vUv = uv; vZ = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
function passMaterial(src, kind, wind, U) {
  const map = src.map || null, defines = {}; if (map) defines.USE_TMAP = ''; if (wind) defines.WIND = '';
  return new THREE.ShaderMaterial({
    defines, side: THREE.DoubleSide,
    uniforms: { ...U, tMap: { value: map }, uColor: { value: (src.color || new THREE.Color(1, 1, 1)).clone() }, uCut: { value: src.alphaTest || 0 } },
    vertexShader: PASS_VERT,
    fragmentShader: /* glsl */`
      uniform sampler2D tMap; uniform vec3 uColor; uniform float uCut, uFar;
      varying vec2 vUv; varying vec3 vN; varying float vZ;
      vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      void main() {
        vec4 c = vec4(uColor, 1.0);
      #ifdef USE_TMAP
        c *= texture2D(tMap, vUv);
      #endif
        if (uCut > 0.0 && c.a < uCut) discard;
        vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
        ${kind === 'albedo' ? 'gl_FragColor = vec4(toSRGB(c.rgb), 1.0);' : 'gl_FragColor = vec4(n * 0.5 + 0.5, clamp(1.0 - vZ / uFar, 0.004, 1.0));'}
      }`,
  });
}

let _r = null;
function renderer() {
  if (_r) return _r;
  _r = new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: false });
  _r.setPixelRatio(1); _r.setClearColor(0x000000, 0);
  return _r;
}

// Render a subject into frames of lit RGBA at (w·ss) × (h·ss), plus a low-resolution depth for inner lines.
// o: { subject, option, seed, frames, anim, yaw, pitch, zoom, lightAz, lightEl, steps, contrast, hueShift, ambient, ss }
export function render3d(o) {
  const S = SUBJECTS[o.subject], built = S.build({ option: o.option, seed: o.seed }), g = built.group;
  const W = o.w * o.ss, H = o.h * o.ss, R = renderer(), rt = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
  const scene = new THREE.Scene(); scene.add(g);
  const anim = S.anims.includes(o.anim) ? o.anim : S.anims[0], n = Math.max(1, o.frames | 0);
  // framing: the bounding sphere over the whole animation, so the subject does not jump between frames
  const box = new THREE.Box3(); for (let k = 0; k < n; k++) { if (built.animate) built.animate(k / n, anim); g.updateMatrixWorld(true); box.expandByObject(g); }
  const sph = box.getBoundingSphere(new THREE.Sphere()), r = sph.radius / Math.max(0.2, o.zoom || 1), aspect = o.w / o.h;
  const cam = new THREE.OrthographicCamera(-r * Math.max(1, aspect), r * Math.max(1, aspect), r / Math.min(1, aspect), -r / Math.min(1, aspect), 0.01, r * 8);
  const U = { uT: { value: 0 }, uWindAmp: { value: built.wind ? 1 : 0 }, uFar: { value: r * 8 } };
  const pass = { albedo: new Map(), normal: new Map() };
  g.traverse((m) => { if (!m.isMesh) return; const wind = !!m.geometry.attributes.aWind && built.wind; for (const k of ['albedo', 'normal']) pass[k].set(m, passMaterial(m.material, k, wind, U)); });
  const yaw = THREE.MathUtils.degToRad(o.yaw || 0), pitch = THREE.MathUtils.degToRad(o.pitch || 0);
  const Ld = new THREE.Vector3(Math.cos(THREE.MathUtils.degToRad(o.lightEl)) * Math.sin(THREE.MathUtils.degToRad(o.lightAz)), Math.sin(THREE.MathUtils.degToRad(o.lightEl)), Math.cos(THREE.MathUtils.degToRad(o.lightEl)) * Math.cos(THREE.MathUtils.degToRad(o.lightAz)));
  const frames = [], depths = [], buf = new Uint8Array(W * H * 4), nbuf = new Uint8Array(W * H * 4);
  const steps = Math.max(2, o.steps | 0), contrast = o.contrast ?? 1, shift = o.hueShift ?? 0.7;
  for (let k = 0; k < n; k++) {
    const t = k / n;
    if (built.animate) built.animate(t, anim); U.uT.value = anim === 'wind' ? t : 0;
    const ya = yaw + (anim === 'turn' ? t * Math.PI * 2 : 0);
    cam.position.set(sph.center.x + Math.sin(ya) * Math.cos(pitch) * r * 4, sph.center.y + Math.sin(pitch) * r * 4, sph.center.z + Math.cos(ya) * Math.cos(pitch) * r * 4);
    cam.lookAt(sph.center); cam.updateMatrixWorld();
    const Lv = Ld;                                                           // light fixed to the view (x right, y up, z towards you): classic pixel-art lighting
    for (const [kind, out] of [['albedo', buf], ['normal', nbuf]]) {
      g.traverse((m) => { if (m.isMesh) m.material = pass[kind].get(m); });
      R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(); R.render(scene, cam); R.readRenderTargetPixels(rt, 0, 0, W, H, out);
    }
    const img = new PixelImage(W, H), dep = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const si = ((H - 1 - y) * W + x) * 4, di = (y * W + x) * 4;      // GL rows are bottom-up
      if (nbuf[si + 3] === 0) continue;
      const nx = nbuf[si] / 127.5 - 1, ny = nbuf[si + 1] / 127.5 - 1, nz = nbuf[si + 2] / 127.5 - 1;
      const d = Math.max(0, nx * Lv.x + ny * Lv.y + nz * Lv.z), lv = Math.min(steps - 1, Math.floor((o.ambient + (1 - o.ambient) * d) * steps));
      const kshade = ((lv / (steps - 1)) * 2 - 1.1) * 1.6 * contrast;          // −1.8 (deep shadow) … +1.4 (highlight)
      const c = shade([buf[si], buf[si + 1], buf[si + 2]], kshade, shift);
      img.data[di] = c[0]; img.data[di + 1] = c[1]; img.data[di + 2] = c[2]; img.data[di + 3] = 255;
      dep[y * W + x] = nbuf[si + 3] / 255;
    }
    frames.push(img); depths.push(dep);
  }
  rt.dispose(); for (const k of ['albedo', 'normal']) for (const m of pass[k].values()) m.dispose();
  return { frames, depths, W, H };
}
// Inner lines on the low-resolution image: where a pixel lies well behind its neighbour (a depth step), darken it.
export function innerLines(img, depth, ss, thr = 0.02, strength = 1.6) {
  const o = img.clone(), W = img.w, H = img.h, dAt = (x, y) => { let m = 0; for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) m = Math.max(m, depth[(y * ss + j) * W * ss + x * ss + i]); return m; };
  const D = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) D[y * W + x] = dAt(x, y);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (img.alpha(x, y) < 128) continue;
    const d = D[y * W + x];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H || img.alpha(xx, yy) < 128) continue; if (D[yy * W + xx] - d > thr) { o.set(x, y, shade(img.get(x, y), -strength, 0.8)); break; } }
  }
  return o;
}
