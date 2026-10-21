// LookPipeline: the scene is drawn into a half-float target (optional MSAA, render scale, mipmaps for auto exposure),
// then ONE full-screen shader does everything else — every effect has a switch and a strength, and an effect at 0 is
// skipped in the shader:
//   lens: barrel distortion (wide-angle / bodycam), chromatic aberration, water droplets on the glass, lens dirt lit by
//   bright light, sun glare (streak and ghosts, only when the sun is actually visible), vignette;
//   light: exposure (manual or automatic from the scene's average brightness), bloom;
//   colour: tone mapping (ACES, AgX, Hable), white balance (temperature, tint), contrast, saturation, vibrance (lifts muted colours, leaves strong ones);
//   film: sharpening, grain (stronger in the shadows).
// A second parameter set can be drawn on the left part of the screen to compare (split). AutoResolution lowers the
// render scale in small steps when frames are slow and raises it again when they are fast, with hysteresis.
import * as THREE from '../../vendor/three.module.js';

export const LOOK_DEFAULTS = {
  exposure: 1.1, autoExposure: 0, autoTarget: 0.22, tone: 0, contrast: 1.0, saturation: 1.0, vibrance: 0, temperature: 0, tint: 0,
  bloom: 0.5, vignette: 0.3, grain: 0.15, ca: 0, distortion: 0, droplets: 0, dirt: 0, glare: 0, sharpen: 0,
};
export const LOOK_PRESETS = {
  clean: { label: 'Game, clean', ...LOOK_DEFAULTS },
  cinematic: { label: 'Cinematic', ...LOOK_DEFAULTS, exposure: 1.0, tone: 1, contrast: 1.12, saturation: 0.86, temperature: -0.08, bloom: 0.7, vignette: 0.45, grain: 0.25, ca: 0.15, glare: 0.5, sharpen: 0.25 },
  bodycam: { label: 'Bodycam', ...LOOK_DEFAULTS, autoExposure: 1, autoTarget: 0.2, tone: 1, contrast: 1.18, saturation: 0.72, temperature: -0.12, tint: 0.02, bloom: 0.85, vignette: 0.65, grain: 0.45, ca: 0.45, distortion: 0.35, droplets: 0.35, dirt: 0.55, glare: 0.8, sharpen: 0.55 },
};

const VERT = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const FRAG = /* glsl */`
precision highp float;
uniform sampler2D tColor; uniform vec2 texel, res; uniform float time;
uniform float exposure, autoExposure, autoTarget, tone, contrast, saturation, vibrance, temperature, tint;
uniform float bloom, vignette, grain, ca, distortion, droplets, dirt, glare, sharpen;
uniform vec3 sunScreen;            // xy in 0..1, z = above the horizon and in front of the camera
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
vec3 tex(vec2 uv){ return texture2D(tColor, uv).rgb; }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
vec3 hable1(vec3 x){ return ((x * (0.15 * x + 0.05) + 0.004) / (x * (0.15 * x + 0.5) + 0.06)) - 0.0667; }
vec3 hable(vec3 x){ return clamp(hable1(x * 2.0) / hable1(vec3(11.2)), 0.0, 1.0); }
vec3 agx(vec3 c){                       // compact AgX approximation (sigmoid in a log space, slightly desaturated highlights)
  const mat3 inM = mat3(0.842479, 0.0423282, 0.0423756, 0.0784336, 0.878468, 0.0784336, 0.0792237, 0.0791661, 0.879142);
  const mat3 outM = mat3(1.19688, -0.0528968, -0.0529716, -0.0980209, 1.15190, -0.0980435, -0.0990297, -0.0989612, 1.15107);
  c = inM * max(c, 1e-6);
  c = clamp((log2(c) + 12.47393) / 16.5, 0.0, 1.0);
  vec3 x2 = c * c, x4 = x2 * x2;
  c = 15.5 * x4 * x2 - 40.14 * x4 * c + 31.96 * x4 - 6.868 * x2 * c + 0.4298 * x2 + 0.1191 * c - 0.00232;
  c = outM * c;
  return clamp(pow(max(c, 0.0), vec3(2.2)), 0.0, 1.0);
}
// a field of water drops on the glass: returns the uv offset and how strongly this pixel is inside a drop
vec3 drops(vec2 uv, float amount){
  vec2 a = vec2(res.x / res.y, 1.0), p = uv * a * 9.0;
  vec3 o = vec3(0.0);
  for (int l = 0; l < 2; l++) {
    vec2 g = p * (1.0 + float(l) * 0.8) + float(l) * 3.7, id = floor(g), f = fract(g) - 0.5;
    float h = hash(id + float(l) * 17.0);
    if (h > amount * 0.4) continue;
    float slide = fract(time * 0.03 * h + h * 7.0);
    vec2 c = vec2(hash(id + 3.1) - 0.5, (hash(id + 5.7) - 0.5) * 0.6 - slide * 0.3) * 0.6;
    float r = 0.1 + 0.28 * hash(id + 9.3), d = length((f - c) * vec2(1.0, 1.15));
    float m = smoothstep(r, r * 0.65, d);
    o.xy += (f - c) * m * -0.035 / (1.0 + float(l)); o.z = max(o.z, m);
  }
  return o;
}
void main(){
  vec2 uv = vUv, q = uv - 0.5;
  float r2 = dot(q * vec2(res.x / res.y, 1.0), q * vec2(res.x / res.y, 1.0));
  if (distortion > 0.0) {                                    // barrel distortion, the edges pulled in like a wide lens
    float k = distortion * 0.32;
    uv = 0.5 + q * (1.0 - k * 0.35) * (1.0 + k * r2);
  }
  float drop = 0.0;
  if (droplets > 0.0) { vec3 d = drops(uv, droplets); uv += d.xy; drop = d.z; }
  vec3 col;
  if (ca > 0.0) {                                            // chromatic aberration, stronger at the edges
    vec2 dir = (uv - 0.5) * ca * 0.012 * (0.3 + r2 * 2.5);
    col = vec3(tex(uv + dir).r, tex(uv).g, tex(uv - dir).b);
  } else col = tex(uv);
  if (sharpen > 0.0) {
    vec3 n4 = tex(uv + vec2(texel.x, 0.0)) + tex(uv - vec2(texel.x, 0.0)) + tex(uv + vec2(0.0, texel.y)) + tex(uv - vec2(0.0, texel.y));
    col = max(col + (col - n4 * 0.25) * sharpen * 1.2, 0.0);
  }
  float ex = exposure;
  if (autoExposure > 0.5) {                                 // from the scene's average brightness (smallest mip)
    vec3 avg = textureLod(tColor, vec2(0.5), 12.0).rgb; float lum = dot(avg, vec3(0.2126, 0.7152, 0.0722));
    ex *= clamp(autoTarget / max(lum, 0.01), 0.35, 3.5);
  }
  col *= ex;
  vec3 bl = vec3(0.0);
  if (bloom > 0.0 || dirt > 0.0) {
    // from the blurred mip levels the scene target already has (smooth, no speckles from sparse taps)
    bl = max(textureLod(tColor, uv, 3.0).rgb * ex - vec3(0.85), 0.0) * 0.45 + max(textureLod(tColor, uv, 4.5).rgb * ex - vec3(0.8), 0.0) * 0.35
       + max(textureLod(tColor, uv, 6.0).rgb * ex - vec3(0.75), 0.0) * 0.2;
    col += bl * 1.4 * bloom;
  }
  if (dirt > 0.0) {                                          // smudges on the lens, seen where bright light hits them
    float sm = smoothstep(0.45, 0.85, noise(uv * 5.0 + 1.3) * 0.6 + noise(uv * 17.0) * 0.4);
    float bright = dot(bl, vec3(0.33)) * 6.0 + (sunScreen.z > 0.0 ? smoothstep(0.7, 0.0, distance(uv, sunScreen.xy)) * sunScreen.z * 0.6 : 0.0);
    col += vec3(1.0, 0.96, 0.9) * sm * bright * dirt * 0.8;
  }
  if (glare > 0.0 && sunScreen.z > 0.0) {                    // sun: horizontal streak, halo and ghosts towards the centre
    vec2 s = sunScreen.xy, d = (uv - s) * vec2(res.x / res.y, 1.0);
    float vis = sunScreen.z;
    float streak = exp(-abs(d.y) * 90.0) * exp(-abs(d.x) * 2.2), halo = exp(-length(d) * 9.0);
    vec3 g = vec3(1.0, 0.92, 0.8) * (streak * 0.9 + halo * 0.6);
    for (int i = 1; i < 4; i++) {
      vec2 gp = mix(s, vec2(0.5), float(i) * 0.55);
      float gd = length((uv - gp) * vec2(res.x / res.y, 1.0));
      g += vec3(0.6, 0.8, 1.0) * smoothstep(0.05 + 0.03 * float(i), 0.0, gd) * 0.12;
    }
    col += g * vis * glare * 1.5;
  }
  if (drop > 0.0) col = mix(col, col * 1.08 + 0.015, drop * 0.5);
  // colour
  col *= vec3(1.0 + temperature * 0.6, 1.0 - tint * 0.4, 1.0 - temperature * 0.6);
  col = tone < 0.5 ? aces(col * 1.05) : tone < 1.5 ? agx(col) : hable(col);
  col = pow(col, vec3(1.0 / 2.2));
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, saturation);
  { float mx = max(col.r, max(col.g, col.b)), mn = min(col.r, min(col.g, col.b)), cs = (mx - mn) / max(mx, 1e-4);
    col = mix(vec3(l), col, 1.0 + vibrance * (1.0 - cs)); }
  col = (col - 0.5) * contrast + 0.5;
  if (vignette > 0.0) col *= 1.0 - smoothstep(0.25, 1.05, length(q * vec2(1.0, 0.85)) * 1.25) * vignette * 0.75;
  if (distortion > 0.0) { vec2 e = abs(uv - 0.5) * 2.0; col *= smoothstep(1.02, 0.96, max(e.x, e.y)); }   // black beyond the glass
  if (grain > 0.0) col += (hash(vUv * res + fract(time) * 91.0) - 0.5) * grain * 0.09 * (1.2 - l);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function makeMaterial() {
  const u = { tColor: { value: null }, texel: { value: new THREE.Vector2() }, res: { value: new THREE.Vector2() }, time: { value: 0 }, sunScreen: { value: new THREE.Vector3() } };
  for (const [k, v] of Object.entries(LOOK_DEFAULTS)) u[k] = { value: v };
  return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u, depthTest: false, depthWrite: false });
}

export class LookPipeline {
  constructor(renderer) {
    this.r = renderer; this.scale = 1; this.aa = true; this.rt = null;
    this.mat = makeMaterial(); this.matB = makeMaterial();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat); this.quad.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.quad); this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.split = 0;                 // 0 = off, else the fraction of the width drawn with the B parameters (on the left)
    this.resize(innerWidth, innerHeight);
  }
  set(params, which = 'A') { const u = (which === 'B' ? this.matB : this.mat).uniforms; for (const [k, v] of Object.entries(params)) if (u[k]) u[k].value = v; }
  setScale(s) { if (Math.abs(s - this.scale) > 1e-3) { this.scale = s; this.resize(this.w, this.h); } }
  setAA(on) { if (on !== this.aa) { this.aa = on; this.resize(this.w, this.h); } }
  resize(w, h) {
    this.w = w; this.h = h;
    if (this.rt) this.rt.dispose();
    const rw = Math.max(2, Math.round(w * this.scale * this.r.getPixelRatio())), rh = Math.max(2, Math.round(h * this.scale * this.r.getPixelRatio()));
    this.rt = new THREE.WebGLRenderTarget(rw, rh, { samples: this.aa ? 4 : 0, type: THREE.HalfFloatType, depthBuffer: true });
    this.rt.texture.generateMipmaps = true; this.rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
    for (const m of [this.mat, this.matB]) { m.uniforms.tColor.value = this.rt.texture; m.uniforms.texel.value.set(1 / rw, 1 / rh); m.uniforms.res.value.set(rw, rh); }
  }
  // sun: world direction; marks where the sun is on screen and whether it is in view
  sun(camera, dir) {
    const p = camera.position.clone().addScaledVector(dir, 1000).project(camera);
    const front = camera.getWorldDirection(new THREE.Vector3()).dot(dir) > 0.05;
    const vis = front && Math.abs(p.x) < 1.3 && Math.abs(p.y) < 1.3 && dir.y > -0.02 ? 1 - Math.max(0, Math.max(Math.abs(p.x), Math.abs(p.y)) - 1) / 0.3 : 0;
    for (const m of [this.mat, this.matB]) m.uniforms.sunScreen.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5, Math.max(0, vis) * (this.sunVisible ?? 1));
  }
  render(scene, camera) {
    const t = performance.now() / 1000; this.mat.uniforms.time.value = t; this.matB.uniforms.time.value = t;
    this.r.setRenderTarget(this.rt); this.r.render(scene, camera); this.r.setRenderTarget(null);
    const sz = this.r.getSize(new THREE.Vector2()), W = sz.x, H = sz.y;            // CSS pixels, as setScissor expects
    if (this.split > 0) {
      const x = Math.round(W * this.split);
      this.r.setScissorTest(true);
      this.quad.material = this.matB; this.r.setScissor(0, 0, x, H); this.r.setViewport(0, 0, W, H); this.r.render(this.scene, this.cam);
      this.quad.material = this.mat; this.r.setScissor(x, 0, W - x, H); this.r.render(this.scene, this.cam);
      this.r.setScissorTest(false);
    } else { this.quad.material = this.mat; this.r.render(this.scene, this.cam); }
  }
}

// Render scale that follows the frame time: down in 0.1 steps after 1.5 s of slow frames, up in 0.05 steps after
// 4 s of fast ones, never below `min`; a pause after every change so it does not flicker between two values.
export class AutoResolution {
  constructor({ target = 16.7, min = 0.5, max = 1 } = {}) { Object.assign(this, { target, min, max }); this.avg = target; this.slow = 0; this.fast = 0; this.hold = 0; this.scale = max; }
  update(dtMs) {
    this.avg += (Math.min(dtMs, 200) - this.avg) * 0.08;
    const dt = dtMs / 1000; this.hold = Math.max(0, this.hold - dt);
    if (this.avg > this.target * 1.12) { this.slow += dt; this.fast = 0; } else if (this.avg < this.target * 0.8) { this.fast += dt; this.slow = 0; } else { this.slow = this.fast = 0; }
    if (!this.hold && this.slow > 1.5 && this.scale > this.min) { this.scale = Math.max(this.min, +(this.scale - 0.1).toFixed(2)); this.hold = 2; this.slow = 0; }
    if (!this.hold && this.fast > 4 && this.scale < this.max) { this.scale = Math.min(this.max, +(this.scale + 0.05).toFixed(2)); this.hold = 3; this.fast = 0; }
    return this.scale;
  }
}
