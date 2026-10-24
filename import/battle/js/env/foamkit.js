// FoamKit: foam with memory. A square window of the sea (in the water's own frame, so foam drifts with the water) is
// kept in a float texture and updated every frame on the GPU:
//   R  active breaking  — whitecaps where the Gerstner surface folds; dense froth that lives about half a second
//   G  residual foam    — what the breaking leaves behind; lives seconds (breeze) to tens of seconds (gale)
//   B  ship foam        — the turbulent wake and the hull's foam lines, shell splashes, torpedo tracks; lives minutes,
//                         spreads sideways (diffusion), and long after it stops showing as foam it still calms the
//                         ripples (the slick behind a ship)
// The water shader (WaterKit, GLSL_FOAMMAP) draws the densities through a bubble-raft pattern: solid at the core,
// fraying into filaments, old foam opening up into lace (and wind rows in a gale) instead of shrinking as a blob.
// The window moves with the ship in whole texels (no blur from re-sampling). Units: metres, seconds.
// Inspired by the two-stage foam of Open Water (github.com/Leonxlnx/open-water, MIT); written for ships here.
import * as THREE from '../../vendor/three.module.js';

export const MAX_STAMPS = 12;

// Whitecaps by the book: wind speed from the significant wave height of a fully developed sea (Hs ≈ 0.0246 U²,
// the relation the Look Lab uses for "wind sets the sea"), whitecap coverage from Monahan & O'Muircheartaigh (1980):
// W = 3.84e-6 · U^3.41 (fraction of the sea surface, U in m/s at 10 m).
export const windFromHs = (Hs) => Math.sqrt(Math.max(0, Hs) / 0.0246);
export const monahan = (U) => 3.84e-6 * Math.pow(Math.max(0, U), 3.41);
// inverse of the standard normal CDF (Acklam's rational approximation, |error| < 1.2e-9)
function probit(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  p = Math.min(1 - 1e-12, Math.max(1e-12, p));
  const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
// The breaking threshold for a wave set: the fold Σ Q·k·A·sin θ is close to normal with σ² = Σ (Q·k·A)²/2, so the
// share of the sea above a threshold of t·σ is known; t is chosen so the actively breaking share is ACTIVE of the
// Monahan coverage (the rest is residual foam). BREAK_GAIN is calibrated by tools/lab-check.py (whitecap test).
export const ACTIVE = 0.42, BREAK_GAIN = 0.85, RESIDUAL_T = 3.6;
export function breaking(waves, Hs, crest = 0.55) {
  const sig = Math.sqrt(waves.reduce((t, w) => t + (w.Q * w.k * w.A) ** 2 / 2, 0)) || 1e-6;
  const U = windFromHs(Hs), W = monahan(U) * (crest / 0.55), share = Math.min(0.2, W * ACTIVE * BREAK_GAIN);
  return { sig, U, W, thr: share > 1e-7 ? probit(1 - share) * sig : 99 };
}

// Reads the foam map in the water shader: q is the water-frame position; returns vec4(active, residual, ship, inside)
export const GLSL_FOAMMAP = /* glsl */`
uniform sampler2D tFoamMap;
uniform vec4 uFoamWin;   // window origin x, z (water frame, m), size (m), on (0/1)
uniform vec4 uFoamLook;  // wind direction x, z, wind rows 0..1, -
vec4 foamMapAt(vec2 q) {
  if (uFoamWin.w < 0.5) return vec4(0.0);
  vec2 uv = (q - uFoamWin.xy) / uFoamWin.z;
  float inside = smoothstep(0.0, 0.06, uv.x) * smoothstep(1.0, 0.94, uv.x) * smoothstep(0.0, 0.06, uv.y) * smoothstep(1.0, 0.94, uv.y);
  if (inside <= 0.0) return vec4(0.0);
  return vec4(texture2D(tFoamMap, uv).rgb * inside, inside);
}
`;

// update pass: needs GLSL_WAVES' uniforms (uWA, uWB, uWN, uTime, uShift) and GLSL_SHIP (uHull, uHullZ, uShip, uShipFx)
function updateShader(glslShip) {
  return /* glsl */`
#define MAXW 16
uniform vec4 uWA[MAXW]; uniform vec4 uWB[MAXW]; uniform int uWN; uniform float uTime, uShift;
${glslShip}
uniform sampler2D tPrev, tNoise;
uniform ivec2 uScroll; uniform ivec2 uN;
uniform vec4 uWin;        // origin x, z, size, texel (m)
uniform vec4 uRate;       // dt, residual life (s), ship-foam life (s), residual density left by froth of density 1
uniform vec4 uSpread;     // diffusion of residual and ship foam (m²/s), -, -
uniform vec2 uBreak;      // breaking threshold of the fold, its sigma
uniform vec4 uStamp[${MAX_STAMPS}]; uniform vec4 uStampK[${MAX_STAMPS}]; uniform int uStampN;
float foldAt(vec2 p) {
  float fold = 0.0;
  for (int i = 0; i < MAXW; i++) { if (i >= uWN) break;
    vec4 a = uWA[i], b = uWB[i]; float th = a.z * dot(a.xy, p + vec2(0.0, uShift)) - b.x * uTime + b.y;
    fold += b.z * a.z * a.w * sin(th); }
  return fold;
}
vec4 prevAt(ivec2 ij) { ivec2 s = ij + uScroll; if (s.x < 0 || s.y < 0 || s.x >= uN.x || s.y >= uN.y) return vec4(0.0); return texelFetch(tPrev, s, 0); }
void main() {
  ivec2 ij = ivec2(gl_FragCoord.xy);
  vec4 c = prevAt(ij);
  float dt = uRate.x, tx = uWin.w;
  // spreading: a little diffusion (stable while k <= 0.2)
  vec4 nb = (prevAt(ij + ivec2(1, 0)) + prevAt(ij - ivec2(1, 0)) + prevAt(ij + ivec2(0, 1)) + prevAt(ij - ivec2(0, 1))) * 0.25;
  vec2 k = min(vec2(0.2), uSpread.xy * dt / (tx * tx)) * 4.0;
  c.g = mix(c.g, nb.g, k.x); c.b = mix(c.b, nb.b, k.y);
  vec2 q = uWin.xy + (vec2(ij) + 0.5) * tx;          // water frame
  vec2 p = q - vec2(0.0, uShift);                    // ship frame (the waves and the ship are written in it)
  float n = texture(tNoise, q / 9.0).r * 0.6 + texture(tNoise, q / 2.7 + 0.37).r * 0.4;   // fixed in the water: crests break in segments
  // breaking: where the surface folds past the threshold (the steeper the sea, the more of it)
  float fold = foldAt(p);
  float brk = step(uBreak.x, fold + (n - 0.5) * 0.5 * uBreak.y) * smoothstep(uBreak.x, uBreak.x + 0.25 * uBreak.y, fold + (n - 0.5) * 0.5 * uBreak.y);
  float a = c.r * exp(-dt / 0.45);
  float r = max(c.g * exp(-dt / uRate.y), smoothstep(0.15, 0.5, a) * uRate.w);   // breaking leaves residual foam behind it
  a = max(a, brk);
  // the ship: turbulent wake behind the stern (a source a few tens of metres long — the memory makes the trail),
  // and the foam lines the bow wave leaves along the hull
  float s = c.b * exp(-dt / uRate.z);
  float v = uShip.x;
  if (v > 0.3) {
    float vk = clamp(v / 18.0, 0.0, 1.4), ax = abs(p.x), us = uShip.z - p.y, hw = hullHW(p.y);
    if (uShipFx.y > 0.5 && us > -3.0 && us < 30.0) {
      float u2 = max(us, 0.0), w = uShip.w * 0.85 + u2 * 0.032 + sqrt(u2) * 0.35;
      s = max(s, smoothstep(w, w * 0.15, ax) * (0.55 + 0.45 * n) * min(1.0, 0.35 + vk) * smoothstep(-3.0, 2.0, us));
    }
    if (uShipFx.z > 0.5 && hw > 0.0) {
      float d = ax - hw, bowk = smoothstep(uShip.y - 34.0, uShip.y, p.y);
      s = max(s, smoothstep(0.6 + 1.8 * vk, 0.0, d) * (0.2 + 0.5 * vk * (0.4 + bowk)) * smoothstep(0.3, 0.8, n + 0.2 * bowk));
    }
  }
  // stamps: shell splashes (x, z, radius, -) with (active, ship foam, ring, -), torpedo tracks the same with a narrow radius
  for (int i = 0; i < ${MAX_STAMPS}; i++) { if (i >= uStampN) break;
    vec4 st = uStamp[i], sk = uStampK[i]; float d = length(q - st.xy) / st.z;
    if (d < 1.6) {
      float disc = smoothstep(1.0, 0.25, d) * (0.6 + 0.4 * n), ring = exp(-pow((d - 1.0) * 5.0, 2.0)) * sk.z;
      a = max(a, disc * sk.x); s = max(s, max(disc, ring) * sk.y);
    }
  }
  gl_FragColor = vec4(min(a, 1.0), min(r, 1.0), min(s, 1.0), 1.0);
}`;
}

export class FoamMap {
  // u: the variant's water uniforms (WaterKit waterUniforms); glslShip: WaterKit's GLSL_SHIP
  constructor(renderer, u, glslShip, { size = 1536, res = 1024 } = {}) {
    this.renderer = renderer; this.u = u; this.size = size; this.res = res; this.texel = size / res;
    const gl = renderer.getContext(), ext = renderer.extensions;
    const full = ext.has('EXT_color_buffer_float'), lin = ext.has('OES_texture_float_linear');
    // full float: decay factors like 0.99989 per frame are lost in half precision
    const opt = { type: full ? THREE.FloatType : THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false,
      minFilter: (full && !lin) ? THREE.NearestFilter : THREE.LinearFilter, magFilter: (full && !lin) ? THREE.NearestFilter : THREE.LinearFilter, generateMipmaps: false };
    this.rt = [new THREE.WebGLRenderTarget(res, res, opt), new THREE.WebGLRenderTarget(res, res, opt)];
    this.cur = 0; this.origin = null; this.precision = full ? 'float' : 'half'; void gl;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uWA: u.uWA, uWB: u.uWB, uWN: u.uWN, uTime: u.uTime, uShift: u.uShift, uHull: u.uHull, uHullZ: u.uHullZ, uShip: u.uShip, uShipFx: u.uShipFx,
        tPrev: { value: null }, tNoise: u.tFoam, uScroll: { value: new THREE.Vector2(0, 0) }, uN: { value: new THREE.Vector2(res, res) },
        uWin: { value: new THREE.Vector4(0, 0, size, this.texel) }, uRate: { value: new THREE.Vector4(0.016, 5, 150, 0.5) }, uSpread: { value: new THREE.Vector4(0.4, 1.6, 0, 0) }, uBreak: { value: new THREE.Vector2(99, 1) },
        uStamp: { value: Array.from({ length: MAX_STAMPS }, () => new THREE.Vector4()) }, uStampK: { value: Array.from({ length: MAX_STAMPS }, () => new THREE.Vector4()) }, uStampN: { value: 0 },
      },
      vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: updateShader(glslShip),
      depthTest: false, depthWrite: false,
    });
    // uScroll / uN are ivec2: three uploads Vector2 for ivec2 with uniform2i when the GLSL type says so
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat); this.quad.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.quad); this.cam = new THREE.Camera();
    this.stamps = [];
    // what the water shader reads
    u.tFoamMap = u.tFoamMap || { value: null }; u.uFoamWin = u.uFoamWin || { value: new THREE.Vector4(0, 0, size, 0) };
    u.uFoamLook = u.uFoamLook || { value: new THREE.Vector4(0, 1, 0, 0) };
    this.clear();
  }
  clear() {
    const r = this.renderer, prev = r.getRenderTarget(), cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha();
    r.setClearColor(0x000000, 0); for (const t of this.rt) { r.setRenderTarget(t); r.clear(); }
    r.setClearColor(cc, ca); r.setRenderTarget(prev); this.origin = null; this.stamps.length = 0;
  }
  // a splash or a stretch of a torpedo track (water frame): radius (m), active froth, ship-type foam, ring, frames it lasts
  stamp(x, z, radius, { active = 1, foam = 0.9, ring = 0, life = 0.05 } = {}) { this.stamps.push({ x, z, radius, active, foam, ring, life }); }
  // centre: the ship's water-frame position; aft: the share of the window behind it (the wake trail)
  update(dt, { centre, heading = [0, 1], residualLife = 5, shipLife = 150, brk = null, windDir = [0, 1], windRows = 0, on = true }) {
    const u = this.u;
    u.uFoamWin.value.w = on ? 1 : 0;
    if (!on) return;
    const T = this.texel, S = this.size, ox = centre[0] - S / 2 - heading[0] * S * 0.3, oz = centre[1] - S / 2 - heading[1] * S * 0.3;
    const o = [Math.floor(ox / T) * T, Math.floor(oz / T) * T];
    if (!this.origin) this.origin = o;
    let sx = Math.round((o[0] - this.origin[0]) / T), sz = Math.round((o[1] - this.origin[1]) / T);
    if (Math.abs(sx) >= this.res || Math.abs(sz) >= this.res) { this.clear(); this.origin = o; sx = sz = 0; }
    this.origin = o;
    const m = this.mat.uniforms;
    m.tPrev.value = this.rt[this.cur].texture; m.uScroll.value.set(sx, sz);
    m.uWin.value.set(o[0], o[1], S, T); // the residual starts just dense enough to stay over half opaque for RESIDUAL_T seconds, whatever its life: after
    // that it is lace (thin, long-lived), and the whitecap coverage stays on Monahan (calibrated)
    m.uRate.value.set(Math.min(dt, 0.1), residualLife, shipLife, Math.min(1, 0.42 * Math.exp(RESIDUAL_T / residualLife)));
    if (brk) m.uBreak.value.set(brk.thr, brk.sig);
    const st = this.stamps.slice(0, 12); m.uStampN.value = st.length;
    st.forEach((s, i) => { m.uStamp.value[i].set(s.x, s.z, s.radius, 0); m.uStampK.value[i].set(s.active, s.foam, s.ring, 0); });
    this.stamps = this.stamps.filter((s) => (s.life -= dt) > 0);
    const r = this.renderer, prev = r.getRenderTarget(), sc = r.getScissorTest(), ac = r.autoClear;
    r.setScissorTest(false); r.autoClear = false;
    const next = this.rt[1 - this.cur]; next.scissorTest = false;
    r.setRenderTarget(next); r.render(this.scene, this.cam);
    r.setRenderTarget(prev); r.setScissorTest(sc); r.autoClear = ac;
    this.cur = 1 - this.cur;
    u.tFoamMap.value = this.rt[this.cur].texture;
    u.uFoamWin.value.set(o[0], o[1], S, 1);
    u.uFoamLook.value.set(windDir[0], windDir[1], windRows, 0);
  }
  // mean densities in a box (water frame) — for tests
  sample(x0, z0, x1, z1) {
    const T = this.texel, o = this.origin; if (!o) return [0, 0, 0];
    const i0 = Math.max(0, Math.floor((x0 - o[0]) / T)), j0 = Math.max(0, Math.floor((z0 - o[1]) / T));
    const w = Math.min(this.res - i0, Math.max(1, Math.round((x1 - x0) / T))), h = Math.min(this.res - j0, Math.max(1, Math.round((z1 - z0) / T)));
    const buf = new Float32Array(w * h * 4); this.renderer.readRenderTargetPixels(this.rt[this.cur], i0, j0, w, h, buf);
    // means of the three densities, then the whitecap coverage: texels where the drawn foam is over half opaque
    // (active froth past its core threshold, or residual foam dense enough to show more than half the raft pattern)
    const s = [0, 0, 0, 0, 0]; for (let i = 0; i < w * h; i++) { for (let c = 0; c < 3; c++) s[c] += buf[i * 4 + c]; if (buf[i * 4] > 0.31 || buf[i * 4 + 1] > 0.42) s[3]++; if (buf[i * 4] > 0.31) s[4]++; }
    return s.map((x) => x / (w * h));
  }
  dispose() { for (const t of this.rt) t.dispose(); this.mat.dispose(); this.quad.geometry.dispose(); }
}
