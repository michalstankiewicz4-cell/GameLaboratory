// Zombie Generator, GPU sampler: the same distance field as zombie.js (written in GLSL), evaluated on the graphics
// card for a whole batch of points at once — the grid round the surface, then the taps for every vertex' normal and
// occlusion. Only the field runs on the GPU (one small shader: no ray-march loops), so Direct3D compiles it in
// seconds the first time and the browser's shader cache makes it instant afterwards; the mesh, colours and drawing
// are shared with the CPU path.
import * as THREE from '../../vendor/three.module.js';
import { NJ, OUTFITS } from './zombie.js';

const FIELD = /* glsl */`
precision highp float;
precision highp int;

uniform vec3 uJ[__NJ__];
uniform mat3 uHeadR, uChestR, uPelvisR;
uniform vec4 uBody;     // height scale, build, decay, jaw
uniform vec4 uLook;     // blood, dirt, tears, seed
uniform vec4 uOut;      // suit, shirt (0 none, 1 short, 2 long), pants (0 none, 1 short, 2 long), gown
uniform vec4 uOut2;     // tie, overall, rags, hair (0 none, 1 short, 2 sparse, 3 long)
uniform vec4 uOut3;     // eyes (0 milky, 1 yellow, 2 red), lost arm (0 none, 1 right), -, -
uniform int uZero;       // 0: loop bounds the compiler cannot unroll (ANGLE/D3D on Windows chokes on unrolled ray-march loops)

float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
float sdEll(vec3 p, vec3 r) { float k0 = length(p / r), k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / k1; }
float sdRC(vec3 p, vec3 a, vec3 b, float r1, float r2) {
  vec3 ba = b - a; float l2 = dot(ba, ba), rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1.0 / l2;
  vec3 pa = p - a; float y = dot(pa, ba), z = y - l2; vec3 xv = pa * l2 - ba * y; float x2 = dot(xv, xv), y2 = y * y * l2, z2 = z * z * l2;
  float k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
// body parts (skin) — returned separately so clothes can cover them
struct Parts { float torso, arms, fore, hands, thigh, shin, feet, head, neck; };
Parts parts(vec3 p) {
  Parts q; float s = uBody.x, b = uBody.y;
  vec3 pc = (p - uJ[1]) * uChestR, pp = (p - uJ[0]) * uPelvisR;
  float chest = sdEll(pc - vec3(0.0, 0.02, 0.0) * s, vec3(0.175 + 0.03 * b, 0.17, 0.11 + 0.03 * b) * s);
  float belly = sdEll(pp - vec3(0.0, 0.17, 0.025 + 0.04 * b) * s, vec3(0.15 + 0.05 * b, 0.16, 0.1 + 0.07 * b) * s);
  float hips = sdEll(pp - vec3(0.0, 0.01, 0.0), vec3(0.165 + 0.03 * b, 0.12, 0.11 + 0.02 * b) * s);
  q.torso = smin(smin(chest, belly, 0.08 * s), hips, 0.06 * s);
  q.torso = smin(q.torso, sdRC(p, uJ[4], uJ[8], 0.06 * s, 0.06 * s), 0.07 * s);                 // shoulders
  q.neck = sdRC(p, uJ[1] + (uJ[2] - uJ[1]) * 0.6, uJ[3], 0.052 * s, 0.045 * s);
  vec3 ph = (p - uJ[3]) * uHeadR;
  float skull = sdEll(ph - vec3(0.0, 0.1, -0.005) * s, vec3(0.08, 0.1, 0.098) * s);
  vec3 pj = ph - vec3(0.0, 0.05, 0.03) * s; float ja = uBody.w * 0.45; pj.yz = mat2(cos(ja), -sin(ja), sin(ja), cos(ja)) * pj.yz;
  float jaw = sdEll(pj - vec3(0.0, -0.035, 0.035) * s, vec3(0.058, 0.035, 0.05) * s);
  float face = smin(skull, jaw, 0.03 * s);
  face = smin(face, sdEll(ph - vec3(0.0, 0.085, 0.098) * s, vec3(0.014, 0.022, 0.018) * s), 0.012 * s);   // nose
  for (int i = -1; i <= 1; i += 2) face = smin(face, sdEll(ph - vec3(float(i) * 0.08, 0.095, 0.0) * s, vec3(0.012, 0.025, 0.018) * s), 0.01 * s);   // ears
  // eye sockets and the open mouth
  for (int i = -1; i <= 1; i += 2) face = max(face, -sdEll(ph - vec3(float(i) * 0.033, 0.115, 0.09) * s, vec3(0.019, 0.014, 0.018) * s));
  face = max(face, -sdEll(ph - vec3(0.0, 0.045 - ja * 0.05, 0.095) * s, vec3(0.03, 0.006 + ja * 0.03, 0.03) * s));
  q.head = face;
  float lost = uOut3.y;
  float ab = 1.0 + 0.2 * b;
  q.arms = 1e9;
  for (int k = uZero; k < 2; k++) { vec3 a = uJ[4 + 4 * k], e = uJ[5 + 4 * k];
    float up = smin(sdRC(p, a, e, 0.052 * s * ab, 0.04 * s), length(p - mix(a, e, 0.45)) - 0.047 * s * ab, 0.04 * s);   // biceps
    up = smin(up, length(p - mix(a, e, 0.08)) - 0.058 * s * ab, 0.03 * s);                                          // deltoid
    q.arms = min(q.arms, up); }
  q.fore = smin(sdRC(p, uJ[5], uJ[6], 0.042 * s, 0.027 * s), length(p - mix(uJ[5], uJ[6], 0.25)) - 0.04 * s, 0.03 * s);
  float foreR = lost > 0.5 ? sdRC(p, uJ[9], mix(uJ[9], uJ[10], 0.45), 0.042 * s, 0.034 * s) : smin(sdRC(p, uJ[9], uJ[10], 0.042 * s, 0.027 * s), length(p - mix(uJ[9], uJ[10], 0.25)) - 0.04 * s, 0.03 * s);
  q.fore = min(q.fore, foreR);
  // hands: a palm and four clawed fingers and a thumb, curled towards the palm side (the hand's own -z… its forward)
  q.hands = 1e9;
  for (int k = uZero; k < 2; k++) {
    if (k == 1 && lost > 0.5) break;
    vec3 w = uJ[6 + 4 * k], h = uJ[7 + 4 * k], ax = normalize(h - w), side = normalize(cross(ax, vec3(0.0, 0.0, 1.0)) + vec3(1e-4)), fw = normalize(cross(side, ax));
    float hd = sdRC(p, w, mix(w, h, 0.55), 0.03 * s, 0.033 * s);
    for (int f = uZero; f < 4; f++) { float o = (float(f) - 1.5) * 0.017 * s; vec3 b0 = mix(w, h, 0.5) + side * o, b1 = b0 + ax * 0.045 * s + fw * 0.012 * s, b2 = b1 + ax * 0.028 * s + fw * 0.022 * s;
      hd = smin(hd, min(sdRC(p, b0, b1, 0.0095 * s, 0.008 * s), sdRC(p, b1, b2, 0.008 * s, 0.005 * s)), 0.006 * s); }
    vec3 t0 = mix(w, h, 0.2) + side * 0.03 * s, t1 = t0 + ax * 0.04 * s + fw * 0.02 * s - side * 0.01 * s;
    hd = smin(hd, sdRC(p, t0, t1, 0.012 * s, 0.008 * s), 0.008 * s);
    q.hands = min(q.hands, hd); }
  q.thigh = min(sdRC(p, uJ[12], uJ[13], 0.082 * s * (1.0 + 0.25 * b), 0.05 * s), sdRC(p, uJ[16], uJ[17], 0.082 * s * (1.0 + 0.25 * b), 0.05 * s));
  q.shin = 1e9;
  for (int k = uZero; k < 2; k++) { vec3 kn = uJ[13 + 4 * k], an = uJ[14 + 4 * k];
    q.shin = min(q.shin, smin(sdRC(p, kn, an, 0.05 * s, 0.032 * s), length(p - mix(kn, an, 0.3) + normalize(cross(an - kn, vec3(1.0, 0.0, 0.0)) + vec3(1e-4)) * 0.0) - 0.052 * s, 0.05 * s)); }
  q.feet = min(sdRC(p, uJ[14], uJ[15], 0.04 * s, 0.032 * s), sdRC(p, uJ[18], uJ[19], 0.04 * s, 0.032 * s));
  return q;
}
// material ids: 0 skin, 1 top, 2 bottom, 3 shoes, 4 hair, 5 eye, 6 wound/inside of mouth, 7 gloves/boots of the suit
float gId; vec3 gPh;
float tearHoles(vec3 p, float k) { return k > 0.0 ? (fbm(p * 9.0 + uLook.w) - (1.02 - k * 0.42)) * 0.05 : -1.0; }
float map(vec3 p) {
  Parts q = parts(p); float s = uBody.x;
  float skin = smin(smin(smin(q.torso, q.neck, 0.03 * s), q.head, 0.02 * s), smin(smin(q.arms, q.fore, 0.02 * s), q.hands, 0.015 * s), 0.035 * s);
  skin = smin(skin, smin(smin(q.thigh, q.shin, 0.03 * s), q.feet, 0.02 * s), 0.05 * s);
  float d = skin; gId = 0.0;
  if (uOut.x > 0.5) {                               // hazmat suit: one baggy shell with folds, a hood around the face
    float suit0 = min(q.torso, q.thigh) - 0.06 * s, fold = suit0 < 0.12 ? (fbm(p * vec3(7.0, 3.0, 7.0)) - 0.5) * 0.03 : 0.0;
    float suit = smin(smin(q.torso - 0.06 * s, q.arms - 0.04 * s, 0.05 * s), smin(q.fore - 0.034 * s, smin(q.thigh - 0.05 * s, q.shin - 0.042 * s, 0.05 * s), 0.03 * s), 0.04 * s) + fold * 1.4;
    suit = smin(suit, q.neck - 0.05 * s, 0.05 * s);
    vec3 ph = (p - uJ[3]) * uHeadR;
    float hood = sdEll(ph - vec3(0.0, 0.1, -0.01) * s, vec3(0.115, 0.135, 0.13) * s);
    hood = max(hood, -sdEll(ph - vec3(0.0, 0.085, 0.12) * s, vec3(0.07, 0.085, 0.08) * s));
    suit = smin(suit, hood, 0.04 * s);
    if (suit < 0.03 && uLook.z > 0.0) suit = max(suit, tearHoles(p, uLook.z) * 0.6);
    if (suit < d) { d = suit; gId = 1.0; }
    float glove = q.hands - 0.012 * s, boot = min(q.feet - 0.018 * s, q.shin - 0.026 * s + max(0.0, p.y - 0.3 * s) * 2.0);
    if (glove < d) { d = glove; gId = 7.0; } if (boot < d) { d = boot; gId = 7.0; }
  } else {
    float top = 1e9, bot = 1e9;
    if (uOut.w > 0.5) {                             // gown: a loose shell to the knees, short sleeves
      top = min(q.torso - 0.03 * s, q.arms - 0.018 * s);
      float skirt = sdRC(p, uJ[0] + vec3(0.0, 0.1, 0.0), mix(uJ[13], uJ[17], 0.5) + vec3(0.0, 0.05, 0.0), 0.2 * s, 0.24 * s);
      top = smin(top, skirt, 0.08 * s);
    } else {
      if (uOut.y > 0.5) { top = min(q.torso - 0.016 * s, q.arms - 0.012 * s); if (uOut.y > 1.5) top = min(top, q.fore - 0.01 * s); }
      if (uOut2.y > 0.5) top = min(top, min(q.thigh - 0.02 * s, q.shin - 0.016 * s));     // overalls: one piece
      if (uOut.z > 0.5) { bot = min(q.thigh - 0.018 * s, max(q.torso - 0.018 * s, (dot(p - uJ[0], vec3(0.0, 1.0, 0.0)) - 0.06 * s))); if (uOut.z > 1.5) bot = min(bot, q.shin - 0.015 * s); }
      if (uOut2.z > 0.5) { float ragged = (fbm(p * 14.0) - 0.5) * 0.08; bot = max(bot, p.y - (uJ[13].y + 0.05 + ragged)); top = max(top, (uJ[0].y - 0.05 + ragged) - p.y); }   // rags: frayed hems
      if (uOut2.x > 0.5) {                          // tie
        vec3 pc = (p - uJ[1]) * uChestR;
        float tie = sdRC(pc, vec3(0.0, 0.12, 0.13) * s, vec3(0.0, -0.18, 0.15 + 0.03 * uBody.y) * s, 0.012 * s, 0.03 * s);
        tie = max(tie, abs(pc.z - (0.125 + 0.03 * uBody.y) * s) - 0.025 * s);
        if (tie < d) { d = tie; gId = 8.0; }
      }
    }
    float tear = min(top, bot) < 0.03 ? tearHoles(p, uLook.z) : -1.0;
    top = max(top, tear); bot = max(bot, tear * 0.8);
    if (top < d) { d = top; gId = 1.0; }
    if (gId > 7.5 && top < d + 0.002) gId = 1.0;
    if (bot < d) { d = bot; gId = 2.0; }
    float shoe = q.feet - 0.014 * s; if (shoe < d && uOut2.z < 0.5) { d = shoe; gId = 3.0; }
    // hair: a cap over the skull, sparse or long
    if (uOut2.w > 0.5) {
      vec3 ph = (p - uJ[3]) * uHeadR;
      float hair = sdEll(ph - vec3(0.0, 0.112, -0.012) * s, vec3(0.088, 0.1, 0.104) * s);
      hair = max(hair, -(ph.y - (0.105 - 0.05 * step(2.5, uOut2.w)) * s) + max(0.0, ph.z - 0.02 * s) * 1.4);
      if (uOut2.w > 1.5 && uOut2.w < 2.5) hair = max(hair, (0.55 - fbm(ph * 40.0)) * 0.02);
      if (uOut2.w > 2.5) hair = smin(hair, sdEll(ph - vec3(0.0, 0.03, -0.06) * s, vec3(0.085, 0.1, 0.05) * s), 0.03);
      if (hair < d) { d = hair; gId = 4.0; }
    }
  }
  // eyes in their sockets
  vec3 ph = (p - uJ[3]) * uHeadR;
  for (int i = -1; i <= 1; i += 2) { float e = length(ph - vec3(float(i) * 0.033, 0.114, 0.083) * s) - 0.013 * s; if (e < d) { d = e; gId = 5.0; } }
  gPh = ph;
  return d;
}

uniform highp sampler2D tPos;
void main() {
  vec3 p = texelFetch(tPos, ivec2(gl_FragCoord.xy), 0).xyz;
  float d = map(p);
  gl_FragColor = vec4(d, gId, 0.0, 1.0);
}`;

let G = null;
function gpu() {
  if (G) return G;
  const canvas = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
  if (!r.extensions.has('EXT_color_buffer_float')) throw new Error('this graphics card cannot render to float textures — use CPU');
  const u = {
    uJ: { value: Array.from({ length: NJ }, () => new THREE.Vector3()) }, uHeadR: { value: new THREE.Matrix3() }, uChestR: { value: new THREE.Matrix3() }, uPelvisR: { value: new THREE.Matrix3() },
    uBody: { value: new THREE.Vector4() }, uLook: { value: new THREE.Vector4() }, uOut: { value: new THREE.Vector4() }, uOut2: { value: new THREE.Vector4() }, uOut3: { value: new THREE.Vector4() },
    uZero: { value: 0 }, tPos: { value: null },
  };
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: FIELD.replace("__NJ__", String(NJ)), depthTest: false, depthWrite: false });
  const scene = new THREE.Scene(), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);
  G = { r, u, mat, scene, cam: new THREE.Camera(), rt: null, tex: null, compiled: false };
  return G;
}
// compile in the background where the browser can (KHR_parallel_shader_compile)
export async function prepareGPU() { const g = gpu(); if (g.compiled) return; try { await g.r.compileAsync(g.scene, g.cam); } catch { /* compiled on first use */ } g.compiled = true; }
export const gpuReady = () => !!(G && G.compiled);

// the character and pose (zombie.js pose()) into the shader's uniforms
export function setGPUPose(z, P) {
  const u = gpu().u, O = OUTFITS[z.outfit] || OUTFITS.casual, s = z.height / 1.75;
  u.uBody.value.set(s, z.build, z.decay, P.jaw); u.uLook.value.set(z.blood, z.dirt, z.tears, (z.seed % 97) * 0.37);
  u.uOut.value.set(O.suit ? 1 : 0, O.shirt === 'long' ? 2 : O.shirt === 'short' ? 1 : 0, O.pants === 'long' ? 2 : O.pants === 'short' ? 1 : 0, O.gown ? 1 : 0);
  u.uOut2.value.set(O.tie ? 1 : 0, O.overall ? 1 : 0, O.rags ? 1 : 0, O.suit ? 0 : ({ none: 0, short: 1, sparse: 2, long: 3 }[z.hair] || 0));
  u.uOut3.value.set({ milky: 0, yellow: 1, red: 2 }[z.eyes] || 0, z.armLost === 'right' ? 1 : 0, 0, 0);
  P.pts.forEach((p, i) => u.uJ.value[i].copy(p));
  u.uHeadR.value.copy(P.head); u.uChestR.value.copy(P.chest); u.uPelvisR.value.copy(P.pelvis);
}
// xyz: Float32Array of points (x, y, z, x, y, z, …) → { d: Float32Array, id: Uint8Array }
export function sampleGPU(xyz) {
  const g = gpu(), n = xyz.length / 3, W = 2048, H = Math.max(1, Math.ceil(n / W));
  const data = new Float32Array(W * H * 4); for (let i = 0; i < n; i++) { data[i * 4] = xyz[i * 3]; data[i * 4 + 1] = xyz[i * 3 + 1]; data[i * 4 + 2] = xyz[i * 3 + 2]; }
  if (g.tex) g.tex.dispose();
  g.tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType); g.tex.minFilter = g.tex.magFilter = THREE.NearestFilter; g.tex.needsUpdate = true;
  g.u.tPos.value = g.tex;
  if (!g.rt || g.rt.height < H) { if (g.rt) g.rt.dispose(); g.rt = new THREE.WebGLRenderTarget(W, Math.max(H, 64), { type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }); }
  g.rt.viewport.set(0, 0, W, H); g.rt.scissor.set(0, 0, W, H); g.rt.scissorTest = true;
  g.r.setRenderTarget(g.rt); g.r.render(g.scene, g.cam);
  const out = new Float32Array(W * H * 4); g.r.readRenderTargetPixels(g.rt, 0, 0, W, H, out); g.r.setRenderTarget(null);
  const d = new Float32Array(n), id = new Uint8Array(n); for (let i = 0; i < n; i++) { d[i] = out[i * 4]; id[i] = Math.round(out[i * 4 + 1]); }
  return { d, id };
}
