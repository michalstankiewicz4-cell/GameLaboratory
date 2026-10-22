// ForestKit: many plants at once, cheaply. Builds on PlantKit (single plants) and LandKit (terrain).
//  bakeImpostors(renderer, id)  renders a few variants of a species from 8 sides into two atlases — colour with the
//                               cut-out, and the object-space normal — so a far tree is one camera-facing quad that is
//                               still lit by the sun from the right side (the view picks and blends the two nearest frames)
//  Forest                       placements → instanced near meshes (full models, wind, shadows) and instanced impostors
//                               beyond the LOD distance, re-sorted a few times a second; one draw call per species and part
//  grassField(...)              blades of grass in tufts on a tile that follows the camera (the tile wraps, so the
//                               grass never runs out), standing on LandKit's height texture, thinned by biome, slope,
//                               water and height, swaying in travelling gusts; fades out at its radius
// Lighting for the impostors and the grass comes from plantLight() (sun, sky, ground, fog) — the lab copies SkyKit's
// light into it each time the sky changes.
import * as THREE from '../../vendor/three.module.js';
import { SPECIES, growPlant, plantMaterials, leafTexture, barkTexture, windUniforms } from './plantkit.js';
import { GLSL_LAND } from './landkit.js';

export function plantLight() {
  return {
    uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() }, uSunCol: { value: new THREE.Color(1, 0.95, 0.85) },
    uSkyCol: { value: new THREE.Color(0.5, 0.6, 0.7) }, uGroundCol: { value: new THREE.Color(0.2, 0.2, 0.15) },
    uFogCol: { value: new THREE.Color(0.8, 0.85, 0.9) }, uFogDen: { value: 0.0003 }, uGain: { value: 1 },
  };
}
const LIGHT_GLSL = /* glsl */`
uniform vec3 uSunDir, uSunCol, uSkyCol, uGroundCol, uFogCol; uniform float uFogDen, uGain, uMatGain;
vec3 plantLit(vec3 alb, vec3 n, float wrap) {
  float nl = max(0.0, (dot(n, uSunDir) + wrap) / (1.0 + wrap));
  vec3 amb = mix(uGroundCol, uSkyCol, n.y * 0.5 + 0.5);
  return alb * (uSunCol * nl + amb) * uGain * uMatGain;
}
vec3 plantFog(vec3 c, float d) { return mix(c, uFogCol, 1.0 - exp(-pow(d * uFogDen, 2.0))); }
`;

/* ---------------- impostors ---------------- */
export const IMP_VIEWS = 8;
const NORMAL_BAKE = (map) => new THREE.ShaderMaterial({
  uniforms: { map: { value: map }, useMap: { value: map ? 1 : 0 } }, side: THREE.DoubleSide,
  vertexShader: 'varying vec3 vN; varying vec2 vUv; void main(){ vN = normal; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform sampler2D map; uniform float useMap; varying vec3 vN; varying vec2 vUv; void main(){ if (useMap > 0.5 && texture2D(map, vUv).a < 0.42) discard; gl_FragColor = vec4(normalize(vN) * 0.5 + 0.5, 1.0); }',
});
export function bakeImpostors(renderer, id, { variants = 3, cell = 256, seed0 = 1 } = {}) {
  const S = SPECIES[id], views = IMP_VIEWS, plants = [];
  for (let v = 0; v < variants; v++) plants.push(growPlant(id, { seed: seed0 + v, size: 1, detail: 0.75 }));
  let W = 0, Hb = 0;
  for (const p of plants) for (const g of [p.bark, p.leaf]) if (g) { const b = g.boundingBox; W = Math.max(W, -b.min.x, b.max.x, -b.min.z, b.max.z); Hb = Math.max(Hb, b.max.y); }
  W = W * 2 * 1.04; Hb *= 1.03;
  const mk = () => new THREE.WebGLRenderTarget(cell * views, cell * variants, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const rtA = mk(), rtN = mk();
  const bt = barkTexture(S.bark), lt = leafTexture(S.leaf);
  const albedo = [new THREE.MeshBasicMaterial({ map: bt }), new THREE.MeshBasicMaterial({ map: lt, alphaTest: 0.42, side: THREE.DoubleSide })];
  const normal = [NORMAL_BAKE(null), NORMAL_BAKE(lt)];
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-W / 2, W / 2, Hb / 2, -Hb / 2, 0.1, W * 4 + 10);
  const prev = { rt: renderer.getRenderTarget(), clear: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha(), autoClear: renderer.autoClear, sc: renderer.getScissorTest() };
  renderer.autoClear = false;
  for (const [rt, mats, clear] of [[rtA, albedo, 0x26301a], [rtN, normal, 0x7f7f7f]]) {
    renderer.setClearColor(clear, 0); rt.scissorTest = true;
    plants.forEach((p, v) => {
      scene.clear();
      if (p.bark) scene.add(new THREE.Mesh(p.bark, mats[0]));
      scene.add(new THREE.Mesh(p.leaf, mats[1]));
      for (let k = 0; k < views; k++) {
        const a = k / views * Math.PI * 2;
        cam.position.set(Math.sin(a) * W * 2, Hb / 2, Math.cos(a) * W * 2); cam.lookAt(0, Hb / 2, 0); cam.updateMatrixWorld();
        rt.viewport.set(k * cell, v * cell, cell, cell); rt.scissor.set(k * cell, v * cell, cell, cell);   // a render target keeps its own viewport
        renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam);
      }
    });
  }
  for (const rt of [rtA, rtN]) { rt.viewport.set(0, 0, rt.width, rt.height); rt.scissor.set(0, 0, rt.width, rt.height); rt.scissorTest = false; }
  renderer.setRenderTarget(prev.rt); renderer.setClearColor(prev.clear, prev.alpha); renderer.autoClear = prev.autoClear;
  albedo.forEach((m) => m.dispose()); normal.forEach((m) => m.dispose());
  return { albedo: rtA.texture, normal: rtN.texture, W, H: Hb, variants, views, plants, targets: [rtA, rtN] };
}
export function impostorMaterial(imp, L) {
  return new THREE.ShaderMaterial({
    // uMatGain: a crown seen whole is darker inside than its baked colour (self-shadowing the bake does not see)
    uniforms: { ...L, uMatGain: { value: 0.72 }, tA: { value: imp.albedo }, tN: { value: imp.normal }, uImp: { value: new THREE.Vector4(imp.W, imp.H, imp.variants, imp.views) } },
    vertexShader: /* glsl */`
      attribute vec3 aImp;                       // yaw, variant, scale
      uniform vec4 uImp;
      varying vec2 vUv; varying float vVar, vAng, vYaw, vDist;
      void main() {
        vec3 c = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec2 tc = normalize(cameraPosition.xz - c.xz + vec2(1e-4, 0.0));
        vec3 right = vec3(tc.y, 0.0, -tc.x);
        vec3 wp = c + right * position.x * uImp.x * aImp.z + vec3(0.0, (position.y + 0.5) * uImp.y * aImp.z, 0.0);
        vUv = position.xy + 0.5; vVar = aImp.y; vYaw = aImp.x; vAng = atan(tc.x, tc.y) - aImp.x; vDist = length(cameraPosition - wp);
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tA, tN; uniform vec4 uImp;
      varying vec2 vUv; varying float vVar, vAng, vYaw, vDist;
      ${LIGHT_GLSL}
      void main() {
        float f = mod(vAng / 6.2831853 * uImp.w, uImp.w), i0 = floor(f), i1 = mod(i0 + 1.0, uImp.w), t = f - i0;
        vec2 cellUv = vec2(clamp(vUv.x, 0.01, 0.99), clamp(vUv.y, 0.01, 0.99));
        vec2 a0 = vec2((i0 + cellUv.x) / uImp.w, (vVar + cellUv.y) / uImp.z), a1 = vec2((i1 + cellUv.x) / uImp.w, (vVar + cellUv.y) / uImp.z);
        vec4 c0 = texture2D(tA, a0), c1 = texture2D(tA, a1);
        vec4 col = mix(c0, c1, t);
        if (col.a < 0.5) discard;
        vec3 n = mix(texture2D(tN, a0).xyz, texture2D(tN, a1).xyz, t) * 2.0 - 1.0;
        float cy = cos(vYaw), sy = sin(vYaw);
        n = normalize(vec3(n.x * cy + n.z * sy, n.y, -n.x * sy + n.z * cy));
        vec3 lit = plantLit(col.rgb, n, 0.35);
        gl_FragColor = vec4(plantFog(lit, vDist), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

/* ---------------- a forest: near meshes + far impostors ---------------- */
export class Forest {
  constructor(renderer, scene, { wind = windUniforms(), light = plantLight(), variants = 3, nearCap = 900 } = {}) {
    Object.assign(this, { renderer, scene, wind, light, variants, nearCap, kinds: {}, list: [], nearDist: 110, impostors: true, group: new THREE.Group(), counts: { near: 0, far: 0 } });
    this.group.name = 'forest'; scene.add(this.group);
  }
  // one species ready: its variants as full models (instanced) and its impostor atlas
  kind(id) {
    if (this.kinds[id]) return this.kinds[id];
    const imp = bakeImpostors(this.renderer, id, { variants: this.variants }), mats = plantMaterials(id, this.wind);
    const near = imp.plants.map((p) => {
      const parts = [];
      for (const [g, m, dm] of [[p.bark, mats.bark, mats.barkDepth], [p.leaf, mats.leaf, mats.leafDepth]]) {
        if (!g) continue;
        const im = new THREE.InstancedMesh(g, m, this.nearCap); im.customDepthMaterial = dm; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.count = 0;
        this.group.add(im); parts.push(im);
      }
      return parts;
    });
    const quad = new THREE.PlaneGeometry(1, 1);
    const far = new THREE.InstancedMesh(quad, impostorMaterial(imp, this.light), 1); far.frustumCulled = false; far.count = 0;
    this.group.add(far);
    return (this.kinds[id] = { imp, mats, near, far, cap: 0 });
  }
  // placements: [{ id, x, y, z, yaw, s, v }] (v: variant index)
  set(list) {
    this.list = list;
    const by = {};
    for (const p of list) (by[p.id] ||= []).push(p);
    for (const [id, K] of Object.entries(this.kinds)) { K.far.count = 0; K.near.forEach((parts) => parts.forEach((m) => { m.count = 0; })); }
    for (const [id, ps] of Object.entries(by)) {
      const K = this.kind(id);
      if (K.cap < ps.length) {                                         // grow the impostor buffer
        this.group.remove(K.far); K.far.dispose();
        const far = new THREE.InstancedMesh(K.far.geometry, K.far.material, ps.length); far.frustumCulled = false;
        far.geometry.setAttribute('aImp', new THREE.InstancedBufferAttribute(new Float32Array(ps.length * 3), 3));
        this.group.add(far); K.far = far; K.cap = ps.length;
      }
    }
    this.by = by; this.dirty = true;
  }
  // re-sort near / far around the camera (call a few times a second)
  update(camera) {
    if (!this.by) return;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S3 = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    const cx = camera.position.x, cz = camera.position.z, nd2 = this.nearDist * this.nearDist;
    let nN = 0, nF = 0;
    for (const [id, ps] of Object.entries(this.by)) {
      const K = this.kinds[id], ai = K.far.geometry.getAttribute('aImp'), nc = K.near.map(() => 0);
      let f = 0;
      for (const p of ps) {
        const d2 = (p.x - cx) ** 2 + (p.z - cz) ** 2;
        const near = !this.impostors || d2 < nd2;
        if (near && nc[p.v] < this.nearCap) {
          Q.setFromAxisAngle(Y, p.yaw); M.compose(P.set(p.x, p.y, p.z), Q, S3.set(p.s, p.s, p.s));
          for (const m of K.near[p.v]) m.setMatrixAt(nc[p.v], M);
          nc[p.v]++; nN++;
        } else if (!near || this.impostors) {
          M.makeTranslation(p.x, p.y - 0.15 * p.s, p.z); K.far.setMatrixAt(f, M); ai.setXYZ(f, p.yaw, p.v, p.s); f++; nF++;
        }
      }
      K.near.forEach((parts, v) => parts.forEach((m) => { m.count = nc[v]; m.instanceMatrix.needsUpdate = true; }));
      K.far.count = f; K.far.instanceMatrix.needsUpdate = true; ai.needsUpdate = true;
    }
    this.counts = { near: nN, far: nF };
  }
  dispose() {
    for (const K of Object.values(this.kinds)) { K.imp.targets.forEach((t) => t.dispose()); K.far.material.dispose(); K.near.forEach((ps) => ps.forEach((m) => m.dispose())); }
    this.scene.remove(this.group); this.kinds = {};
  }
}

/* ---------------- grass ---------------- */
// A tuft: n blades, each a curved, tapering strip of `seg` segments (aT: 0 at the root, 1 at the tip).
function tuftGeometry(n = 6, seg = 4) {
  const pos = [], nor = [], at = [], idx = [];
  for (let b = 0; b < n; b++) {
    const a = b / n * 6.283 + b * 0.7, r = 0.04 + (b % 3) * 0.04, lean = 0.25 + (b % 2) * 0.2, x0 = Math.cos(a) * r, z0 = Math.sin(a) * r;
    const dx = Math.cos(a), dz = Math.sin(a), sx = -dz, sz = dx, h = 0.75 + (b % 4) * 0.1, base = pos.length / 3;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, w = 0.012 * (1 - t * 0.85), y = h * t, off = lean * t * t * h;
      for (const s of [-1, 1]) { pos.push(x0 + dx * off + sx * w * s, y, z0 + dz * off + sz * w * s); nor.push(dx * 0.6, 0.8, dz * 0.6); at.push(t); }
    }
    for (let i = 0; i < seg; i++) { const k = base + i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(at, 1)); g.setIndex(idx);
  return g;
}
// landU: LandKit land uniforms (tLand, uLand, uLandOff…); biome: RegionKit biome texture; R: radius (m); spacing (m)
export function grassField(landU, biome, wind, light, { R = 45, spacing = 0.6, relief = 300 } = {}) {
  const g = tuftGeometry(), n = Math.floor((2 * R / spacing) ** 2), off = new Float32Array(n * 4);
  let s = 12345; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const side = Math.round(2 * R / spacing);
  for (let k = 0; k < n; k++) { const i = k % side, j = (k / side) | 0; off[k * 4] = -R + (i + rnd()) * spacing; off[k * 4 + 1] = -R + (j + rnd()) * spacing; off[k * 4 + 2] = rnd() * 6.283; off[k * 4 + 3] = rnd(); }
  g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4)); g.instanceCount = n;
  const u = { ...landU, ...wind, ...light, uMatGain: { value: 0.7 }, tBiome: { value: biome }, uGrass: { value: new THREE.Vector4(R, 1, relief, 1) } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.DoubleSide,
    vertexShader: GLSL_LAND + /* glsl */`
      attribute vec4 aOff; attribute float aT;
      uniform sampler2D tBiome; uniform vec4 uGrass;          // radius, density 0..1, relief, -
      uniform float uWind, uTime; uniform vec2 uWindDir;
      varying vec3 vCol; varying vec3 vN; varying float vT, vDist;
      float gh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        float T = 2.0 * uGrass.x;
        vec2 base = aOff.xy + floor((cameraPosition.xz - aOff.xy) / T + 0.5) * T;        // the tile follows the camera
        float h = landH(base), e = 1.5;
        float slope = length(vec2(landH(base + vec2(e, 0.0)) - h, landH(base + vec2(0.0, e)) - h)) / e;
        vec4 bw = texture2D(tBiome, (base + uLandOff) / uLand.x);
        float bs = bw.r + bw.g + bw.b + 1e-4; bw /= bs;
        float dens = (bw.r * 0.8 + bw.g * 1.0 + bw.b * 0.1) * uGrass.y;
        float rel = h / max(1.0, uGrass.z);
        float keep = step(aOff.w, dens) * smoothstep(0.35, 0.9, h) * (1.0 - smoothstep(0.55, 0.8, slope)) * (1.0 - smoothstep(0.5, 0.65, rel * bw.r + rel * 0.3 * (bw.g + bw.b)));
        float d = length(base - cameraPosition.xz);
        float sc = keep * smoothstep(uGrass.x, uGrass.x * 0.7, d);
        float H = (bw.r * 0.45 + bw.g * 0.6 + bw.b * 0.32) * (0.6 + 0.8 * gh(base));
        float c = cos(aOff.z), s = sin(aOff.z);
        vec3 p = position * vec3(1.0, H, 1.0) * sc;
        p = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
        // gusts roll across the grass: a travelling wave plus a little flutter
        float gust = 0.5 + 0.5 * sin(dot(base, uWindDir) * 0.22 - uTime * 2.3) * (0.6 + 0.4 * sin(dot(base, vec2(-uWindDir.y, uWindDir.x)) * 0.07 + uTime * 0.5));
        float bend = aT * aT * H * uWind * (0.35 + 0.65 * gust) * 0.8 + aT * 0.03 * sin(uTime * 5.0 + gh(base) * 30.0) * uWind;
        p.xz += uWindDir * bend * sc; p.y -= bend * bend * 0.4 * sc;
        vec3 wp = vec3(base.x + p.x, h + p.y - 0.03, base.y + p.z);
        vec3 nn = normal; nn = vec3(nn.x * c - nn.z * s, nn.y, nn.x * s + nn.z * c);
        vN = normalize(mix(vec3(0.0, 1.0, 0.0), nn, 0.5)); vT = aT; vDist = d;
        // colour by biome: northern muted green with dry blades, lowland lush, desert straw
        float v = gh(base + 3.1);
        vec3 cn = mix(vec3(0.16, 0.2, 0.08), vec3(0.32, 0.3, 0.16), v * 0.7), cp = mix(vec3(0.18, 0.27, 0.07), vec3(0.3, 0.36, 0.12), v), cd = mix(vec3(0.5, 0.42, 0.25), vec3(0.62, 0.55, 0.34), v);
        vCol = cn * bw.r + cp * bw.g + cd * bw.b;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vCol; varying vec3 vN; varying float vT, vDist;
      ${LIGHT_GLSL}
      void main() {
        vec3 alb = vCol * (0.55 + 0.6 * vT);                    // darker at the root, lighter towards the tip
        vec3 c = plantLit(alb, normalize(vN), 0.5) + uSunCol * alb * 0.25 * vT * max(0.0, -dot(normalize(vN), uSunDir));   // light through the blades
        gl_FragColor = vec4(plantFog(c, vDist), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.name = 'grass';
  mesh.userData.tufts = n; mesh.userData.triangles = n * g.index.count / 3;
  return mesh;
}
