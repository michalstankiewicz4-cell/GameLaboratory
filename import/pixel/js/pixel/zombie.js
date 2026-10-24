// Zombie generator: original undead characters from a seed, rendered as sprite-sheet frames.
// The body is a signed distance field (smoothly joined round cones and ellipsoids on a skeleton), clothes are shells
// over it with tears, the whole figure is ray-marched on the GPU with a key light (soft shadow), sky fill, ground
// bounce, rim light and ambient occlusion — a realistic render, cut out with a hard (1-bit) alpha edge.
// The skeleton is posed with forward kinematics per frame (shamble, lurch, lunge, idle, crawl); every frame of an
// animation uses the same camera, so the sprite does not jump; the feet stay on the pivot line.
import * as THREE from '../../vendor/three.module.js';

/* ---------------- options ---------------- */
export const OUTFITS = {
  hazmat: { label: 'Hazmat suit', suit: true },
  office: { label: 'Office shirt and tie', shirt: 'long', pants: 'long', tie: true },
  worker: { label: 'Work overalls', shirt: 'long', pants: 'long', overall: true },
  casual: { label: 'T-shirt and jeans', shirt: 'short', pants: 'long' },
  gown: { label: 'Hospital gown', gown: true },
  rags: { label: 'Rags', shirt: 'short', pants: 'short', rags: true },
};
export const ANIMS = {
  shamble: 'Shamble (walk)', lurch: 'Lurch (dragging a leg)', lunge: 'Lunge (attack)', idle: 'Idle (sway)', crawl: 'Crawl',
};
export const DIRS = [0, 45, 90, 135, 180, 225, 270, 315];

const rnd = (seed) => { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];

// A character from a seed; every field can be overridden by the UI.
export function randomZombie(seed = 1) {
  const r = rnd(seed * 7919 + 13);
  const outfit = pick(r, Object.keys(OUTFITS));
  const cloth = pick(r, ['#6a7d8e', '#8a3a32', '#d8d2c0', '#3c4a36', '#2f3a52', '#7a6a4a', '#9aa4a8', '#5a2f45']);
  const pants = pick(r, ['#2f3a52', '#3a3530', '#5a5040', '#2a2a2e', '#4a5a6a']);
  return {
    seed, outfit,
    height: 1.62 + r() * 0.3, build: r() * 0.9, hunch: 0.15 + r() * 0.5,
    skin: pick(r, ['#9aa58a', '#a89a88', '#8f9a8c', '#b0a090', '#7d8a78', '#a0907c']), decay: 0.3 + r() * 0.6,
    cloth: outfit === 'hazmat' ? pick(r, ['#d9b21c', '#d9b21c', '#c8c8c0', '#e07a1c']) : outfit === 'gown' ? pick(r, ['#9ab8c4', '#b8c8b0', '#d8dcd8']) : outfit === 'worker' ? pick(r, ['#c8641e', '#3a5a8a', '#56603a'])
      : outfit === 'office' ? pick(r, ['#e8e8e2', '#c8d8e8', '#e8e0d0', '#d8d8d8']) : cloth,
    pants, blood: 0.2 + r() * 0.6, dirt: 0.3 + r() * 0.5, tears: outfit === 'hazmat' ? r() * 0.4 : 0.2 + r() * 0.6,
    hair: pick(r, ['none', 'short', 'sparse', 'long']), hairCol: pick(r, ['#2a2018', '#4a3a28', '#7a6a5a', '#a89880', '#1a1a1a']),
    jaw: 0.2 + r() * 0.6, eyes: pick(r, ['milky', 'milky', 'yellow', 'red']), limp: r(), armLost: r() < 0.12 ? 'right' : 'none',
    tilt: (r() * 2 - 1) * 0.35,
  };
}

/* ---------------- skeleton and poses ---------------- */
// joint order in the shader
const J = ['pelvis', 'chest', 'neck', 'head', 'shL', 'elL', 'wrL', 'haL', 'shR', 'elR', 'wrR', 'haR', 'hiL', 'knL', 'anL', 'toL', 'hiR', 'knR', 'anR', 'toR'];
export const NJ = J.length;

function skeleton(z) {
  const H = z.height / 1.75, n = {}, node = (name, parent, x, y, zz) => { const o = new THREE.Object3D(); o.position.set(x * H, y * H, zz * H); (parent ? n[parent] : null)?.add(o); n[name] = o; return o; };
  node('pelvis', null, 0, 0.98, 0);
  node('spine', 'pelvis', 0, 0.1, 0); node('chest', 'spine', 0, 0.26, 0); node('neck', 'chest', 0, 0.2, 0.0); node('head', 'neck', 0, 0.12, 0.02);
  for (const [s, k] of [['L', 1], ['R', -1]]) {
    node('cl' + s, 'chest', 0.05 * k, 0.13, 0); node('sh' + s, 'cl' + s, 0.15 * k, 0, -0.01); node('el' + s, 'sh' + s, 0, -0.29, 0); node('wr' + s, 'el' + s, 0, -0.26, 0); node('ha' + s, 'wr' + s, 0, -0.17, 0.01);
    node('hi' + s, 'pelvis', 0.095 * k, -0.04, 0); node('kn' + s, 'hi' + s, 0, -0.44, 0); node('an' + s, 'kn' + s, 0, -0.43, 0); node('to' + s, 'an' + s, 0, -0.07, 0.17);
  }
  return n;
}
const R = (o, x = 0, y = 0, zz = 0) => o.rotation.set(x, y, zz);

// pose(t in 0..1) → joints; the character faces +z
function pose(n, z, anim, t) {
  const P = Math.PI * 2 * t, s = Math.sin(P), c = Math.cos(P), lim = 0.35 + z.limp * 0.65, hunch = z.hunch;
  Object.values(n).forEach((o) => o.rotation.set(0, 0, 0));
  n.pelvis.position.set(0, 0.98 * z.height / 1.75, 0);
  let jaw = z.jaw;
  if (anim === 'shamble' || anim === 'lurch') {
    const drag = anim === 'lurch' ? 1 : 0.35 * lim, st = anim === 'lurch' ? 0.38 : 0.5;
    R(n.hiL, -st * s, 0, 0.03); R(n.knL, Math.max(0, -Math.sin(P - 0.9)) * 0.9 + 0.08);
    R(n.hiR, st * (1 - drag * 0.6) * s, 0.25 * drag, -0.04); R(n.knR, Math.max(0, Math.sin(P - 0.9)) * 0.9 * (1 - drag * 0.7) + 0.1); R(n.anR, 0.35 * drag, 0, 0.25 * drag);
    R(n.pelvis, 0, s * 0.12, c * 0.05 * (1 + drag)); R(n.spine, hunch * 0.6 + 0.05 * Math.abs(c), -s * 0.1, -c * 0.06);
    R(n.chest, hunch * 0.35, -s * 0.08, 0.05 * z.tilt);
    R(n.neck, 0.15 - hunch * 0.5, 0, z.tilt * 0.4); R(n.head, 0.1 + 0.08 * Math.sin(P * 2), s * 0.15, z.tilt + 0.06 * c);
    R(n.shL, -1.15 + 0.18 * s, 0.1, 0.25 + 0.06 * c); R(n.elL, -0.35 - 0.15 * Math.max(0, c)); R(n.wrL, 0.3, 0, 0);
    R(n.shR, -0.95 - 0.2 * s, -0.1, -0.2); R(n.elR, -0.55 + 0.15 * c); R(n.wrR, 0.4, 0, 0);
    jaw = z.jaw * (0.75 + 0.25 * Math.sin(P * 2));
  } else if (anim === 'lunge') {
    const k = Math.sin(Math.PI * t) ** 2;                                       // wind up and strike, back by the loop
    R(n.hiL, -0.5 * k, 0, 0.05); R(n.knL, 0.25 + 0.35 * k); R(n.hiR, 0.35 * k, 0, -0.05); R(n.knR, 0.2 + 0.4 * k);
    R(n.spine, hunch * 0.5 + 0.45 * k); R(n.chest, 0.2 * k); R(n.neck, -0.3 * k); R(n.head, -0.15 * k, 0, z.tilt);
    R(n.shL, -1.0 - 0.6 * k, 0.1, 0.35 - 0.2 * k); R(n.elL, -0.6 + 0.5 * k); R(n.shR, -1.0 - 0.6 * k, -0.1, -0.35 + 0.2 * k); R(n.elR, -0.6 + 0.5 * k);
    R(n.wrL, 0.5 * k); R(n.wrR, 0.5 * k);
    jaw = Math.min(1, z.jaw + 0.6 * k);
  } else if (anim === 'idle') {
    R(n.hiL, 0.02, 0, 0.06); R(n.hiR, -0.04, 0.2, -0.08); R(n.knL, 0.12); R(n.knR, 0.18);
    R(n.spine, hunch * 0.7 + 0.04 * s, 0, 0.06 * c); R(n.chest, hunch * 0.3, 0.1 * s, 0);
    R(n.neck, 0.25 - hunch * 0.4, 0, z.tilt * 0.5); R(n.head, 0.2 + 0.1 * Math.max(0, s), 0.2 * c, z.tilt + 0.15 * s);
    R(n.shL, -0.15 + 0.05 * c, 0, 0.12 + 0.04 * s); R(n.elL, -0.25); R(n.shR, -0.35 + 0.06 * s, 0, -0.1); R(n.elR, -0.5);
    jaw = z.jaw * (0.8 + 0.2 * s);
  } else if (anim === 'crawl') {
    // prone, pulling with the arms in turn, the legs dragging behind
    n.pelvis.position.y = 0.17 * z.height / 1.75;
    R(n.pelvis, 1.42, 0.06 * s, 0.1 * c); R(n.spine, -0.05 + 0.05 * s); R(n.chest, -0.12, 0.12 * s, 0);
    R(n.neck, -0.55, 0, z.tilt * 0.4); R(n.head, -0.55, 0.15 * s, z.tilt);
    const a = (ph) => { const q = Math.sin(P + ph); return [-2.6 + 0.55 * q, -0.15 - 0.6 * Math.max(0, -q)]; };
    const [l1, l2] = a(0), [r1, r2] = a(Math.PI);
    R(n.shL, l1, 0.2, 0.25); R(n.elL, l2); R(n.wrL, -0.8); R(n.shR, r1, -0.2, -0.25); R(n.elR, r2); R(n.wrR, -0.8);
    R(n.hiL, -0.05, 0, 0.12 + 0.05 * s); R(n.hiR, 0.05, 0, -0.12 - 0.05 * s); R(n.knL, 0.15 + 0.15 * Math.max(0, s)); R(n.knR, 0.15 + 0.15 * Math.max(0, -s));
    R(n.anL, 1.1); R(n.anR, 1.1);
    jaw = z.jaw * (0.8 + 0.2 * c);
  }
  n.pelvis.updateMatrixWorld(true);
  // feet (or the lowest point) on the ground
  const wp = (k) => n[k].getWorldPosition(new THREE.Vector3());
  let low = Infinity; for (const k of ['anL', 'anR', 'toL', 'toR', 'haL', 'haR', 'head', 'chest', 'pelvis']) low = Math.min(low, wp(k).y - (k.startsWith('to') ? 0.03 : k.startsWith('an') ? 0.06 : k.startsWith('ha') ? 0.03 : k === 'head' ? 0.11 : 0.12));
  n.pelvis.position.y -= low; n.pelvis.updateMatrixWorld(true);
  const pts = J.map(wp), rot = (k) => new THREE.Matrix3().setFromMatrix4(n[k].matrixWorld);
  return { pts, head: rot('head'), chest: rot('chest'), pelvis: rot('pelvis'), jaw };
}

/* ---------------- the shader ---------------- */
const FRAG = /* glsl */`
precision highp float;
uniform vec3 uJ[${NJ}];
uniform mat3 uHeadR, uChestR, uPelvisR;
uniform vec4 uBody;     // height scale, build, decay, jaw
uniform vec4 uLook;     // blood, dirt, tears, seed
uniform vec4 uOut;      // suit, shirt (0 none, 1 short, 2 long), pants (0 none, 1 short, 2 long), gown
uniform vec4 uOut2;     // tie, overall, rags, hair (0 none, 1 short, 2 sparse, 3 long)
uniform vec4 uOut3;     // eyes (0 milky, 1 yellow, 2 red), lost arm (0 none, 1 right), -, -
uniform vec3 uSkin, uCloth, uPants, uHairC;
uniform mat3 uCam; uniform vec3 uCamPos; uniform vec2 uSpan; uniform vec3 uLight;
uniform vec3 uBoxMin, uBoxMax;
varying vec2 vUv;

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
  for (int k = 0; k < 2; k++) { vec3 a = uJ[4 + 4 * k], e = uJ[5 + 4 * k];
    float up = smin(sdRC(p, a, e, 0.052 * s * ab, 0.04 * s), length(p - mix(a, e, 0.45)) - 0.047 * s * ab, 0.04 * s);   // biceps
    up = smin(up, length(p - mix(a, e, 0.08)) - 0.058 * s * ab, 0.03 * s);                                          // deltoid
    q.arms = min(q.arms, up); }
  q.fore = smin(sdRC(p, uJ[5], uJ[6], 0.042 * s, 0.027 * s), length(p - mix(uJ[5], uJ[6], 0.25)) - 0.04 * s, 0.03 * s);
  float foreR = lost > 0.5 ? sdRC(p, uJ[9], mix(uJ[9], uJ[10], 0.45), 0.042 * s, 0.034 * s) : smin(sdRC(p, uJ[9], uJ[10], 0.042 * s, 0.027 * s), length(p - mix(uJ[9], uJ[10], 0.25)) - 0.04 * s, 0.03 * s);
  q.fore = min(q.fore, foreR);
  // hands: a palm and four clawed fingers and a thumb, curled towards the palm side (the hand's own -z… its forward)
  q.hands = 1e9;
  for (int k = 0; k < 2; k++) {
    if (k == 1 && lost > 0.5) break;
    vec3 w = uJ[6 + 4 * k], h = uJ[7 + 4 * k], ax = normalize(h - w), side = normalize(cross(ax, vec3(0.0, 0.0, 1.0)) + vec3(1e-4)), fw = normalize(cross(side, ax));
    float hd = sdRC(p, w, mix(w, h, 0.55), 0.03 * s, 0.033 * s);
    for (int f = 0; f < 4; f++) { float o = (float(f) - 1.5) * 0.017 * s; vec3 b0 = mix(w, h, 0.5) + side * o, b1 = b0 + ax * 0.045 * s + fw * 0.012 * s, b2 = b1 + ax * 0.028 * s + fw * 0.022 * s;
      hd = smin(hd, min(sdRC(p, b0, b1, 0.0095 * s, 0.008 * s), sdRC(p, b1, b2, 0.008 * s, 0.005 * s)), 0.006 * s); }
    vec3 t0 = mix(w, h, 0.2) + side * 0.03 * s, t1 = t0 + ax * 0.04 * s + fw * 0.02 * s - side * 0.01 * s;
    hd = smin(hd, sdRC(p, t0, t1, 0.012 * s, 0.008 * s), 0.008 * s);
    q.hands = min(q.hands, hd); }
  q.thigh = min(sdRC(p, uJ[12], uJ[13], 0.082 * s * (1.0 + 0.25 * b), 0.05 * s), sdRC(p, uJ[16], uJ[17], 0.082 * s * (1.0 + 0.25 * b), 0.05 * s));
  q.shin = 1e9;
  for (int k = 0; k < 2; k++) { vec3 kn = uJ[13 + 4 * k], an = uJ[14 + 4 * k];
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
  float tear = tearHoles(p, uLook.z);
  if (uOut.x > 0.5) {                               // hazmat suit: one baggy shell with folds, a hood around the face
    float fold = (fbm(p * vec3(7.0, 3.0, 7.0)) - 0.5) * 0.03;
    float suit = smin(smin(q.torso - 0.06 * s, q.arms - 0.04 * s, 0.05 * s), smin(q.fore - 0.034 * s, smin(q.thigh - 0.05 * s, q.shin - 0.042 * s, 0.05 * s), 0.03 * s), 0.04 * s) + fold * 1.4;
    suit = smin(suit, q.neck - 0.05 * s, 0.05 * s);
    vec3 ph = (p - uJ[3]) * uHeadR;
    float hood = sdEll(ph - vec3(0.0, 0.1, -0.01) * s, vec3(0.115, 0.135, 0.13) * s);
    hood = max(hood, -sdEll(ph - vec3(0.0, 0.085, 0.12) * s, vec3(0.07, 0.085, 0.08) * s));
    suit = smin(suit, hood, 0.04 * s);
    suit = max(suit, tear * 0.6);
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
vec3 normalAt(vec3 p) { vec2 e = vec2(0.0012, -0.0012);
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx)); }
float shadow(vec3 ro, vec3 rd) { float res = 1.0, t = 0.02;
  for (int i = 0; i < 28; i++) { float h = map(ro + rd * t); res = min(res, 10.0 * h / t); t += clamp(h, 0.01, 0.12); if (res < 0.01 || t > 2.5) break; }
  return clamp(res, 0.0, 1.0); }
float occl(vec3 p, vec3 n) { float o = 0.0, w = 1.0; for (int i = 1; i <= 5; i++) { float h = 0.025 * float(i); o += w * (h - map(p + n * h)); w *= 0.6; } return clamp(1.0 - 3.0 * o, 0.0, 1.0); }
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
bool box(vec3 ro, vec3 rd, out float t0, out float t1) { vec3 inv = 1.0 / rd, a = (uBoxMin - ro) * inv, b = (uBoxMax - ro) * inv, lo = min(a, b), hi = max(a, b);
  t0 = max(max(lo.x, lo.y), lo.z); t1 = min(min(hi.x, hi.y), hi.z); return t1 > max(t0, 0.0); }
void main() {
  vec2 uv = (vUv - 0.5) * uSpan;
  vec3 ro = uCamPos + uCam * vec3(uv, 0.0), rd = uCam * vec3(0.0, 0.0, -1.0);
  float t0, t1; if (!box(ro, rd, t0, t1)) { gl_FragColor = vec4(0.0); return; }
  float t = max(t0, 0.0); bool hit = false;
  for (int i = 0; i < 140; i++) { float h = map(ro + rd * t); if (h < 0.0006) { hit = true; break; } t += h * 0.9; if (t > t1) break; }
  if (!hit) { gl_FragColor = vec4(0.0); return; }
  vec3 p = ro + rd * t; map(p); float id = gId; vec3 ph = gPh; vec3 n = normalAt(p);
  float s = uBody.x, seed = uLook.w;
  // albedo, roughness, bump
  vec3 alb; float rough = 0.75, sss = 0.0, bump = 0.0;
  float big = fbm(p * 6.0 + seed), fine = noise(p * 60.0 + seed);
  float blood = smoothstep(0.68 - uLook.x * 0.14, 0.72 - uLook.x * 0.14, fbm(p * 4.5 + seed + 3.0) + 0.1 * fbm(p * 30.0));   // patches, not a coat
  float dirt = uLook.y * (0.5 * smoothstep(0.7 * s, 0.0, p.y) + 0.25 * smoothstep(0.6, 0.8, fbm(p * 3.0 + seed + 9.0)));   // mostly from the ground up
  if (id < 0.5) {                                   // skin: decaying, mottled, veined, wounded
    alb = uSkin;
    float mott = fbm(p * 9.0 + seed * 1.3);
    alb = mix(alb, alb * vec3(0.75, 0.82, 0.68), smoothstep(0.35, 0.75, mott) * uBody.z);
    alb = mix(alb, vec3(0.32, 0.24, 0.3), smoothstep(0.6, 0.85, fbm(p * 5.0 + seed + 1.7)) * uBody.z * 0.7);     // bruises
    float vein = 1.0 - abs(noise(p * 22.0 + seed) * 2.0 - 1.0); alb *= 1.0 - smoothstep(0.88, 0.98, vein) * 0.25 * uBody.z;
    float wound = smoothstep(0.7 - uBody.z * 0.12, 0.74 - uBody.z * 0.12, fbm(p * 7.0 + seed + 5.0));
    alb = mix(alb, mix(vec3(0.06, 0.008, 0.006), vec3(0.22, 0.12, 0.09), fine * 0.35), wound); rough = mix(0.6, 0.22, wound);
    // around the mouth and down the chin: dried and wet blood
    float mouth = smoothstep(0.06 * s, 0.0, length((ph - vec3(0.0, 0.035, 0.09) * s) * vec3(1.0, 0.6, 1.0)));
    alb = mix(alb, vec3(0.035, 0.005, 0.004), clamp(mouth * (0.4 + uLook.x), 0.0, 1.0));
    alb = mix(alb, alb * 0.6, smoothstep(0.03 * s, 0.0, abs(length((ph - vec3(0.0, 0.115, 0.07) * s) * vec3(1.0, 1.6, 1.0)) - 0.04 * s)) * 0.6);   // sunken eyes
    sss = 1.0; bump = (big - 0.5) * 0.6 + (fine - 0.5) * 0.25;
    // inside the mouth
    if (length((ph - vec3(0.0, 0.045, 0.085) * s) / vec3(0.032, 0.012 + uBody.w * 0.03, 0.03) / s) < 1.0) { alb = vec3(0.12, 0.02, 0.02); sss = 0.0; }
  } else if (id < 1.5) { alb = uCloth; rough = uOut.x > 0.5 ? 0.42 : 0.85; bump = (noise(p * 140.0) - 0.5) * 0.3 + (fbm(p * vec3(26.0, 9.0, 26.0)) - 0.5) * 1.3; }   // weave and creases
  else if (id < 2.5) { alb = uPants; bump = (noise(p * vec3(160.0, 30.0, 160.0)) - 0.5) * 0.35 + (fbm(p * vec3(30.0, 10.0, 30.0)) - 0.5) * 1.2; }
  else if (id < 3.5) { alb = vec3(0.09, 0.075, 0.065); rough = 0.5; }
  else if (id < 4.5) { alb = uHairC * (0.7 + 0.5 * noise(ph * vec3(200.0, 30.0, 200.0))); rough = 0.6; bump = (noise(ph * vec3(300.0, 20.0, 300.0)) - 0.5) * 0.6; }
  else if (id < 5.5) { alb = uOut3.x > 1.5 ? vec3(1.6, 0.15, 0.08) : uOut3.x > 0.5 ? vec3(0.85, 0.75, 0.3) : vec3(0.78, 0.8, 0.74); rough = 0.15; }
  else if (id < 7.5) { alb = vec3(0.12, 0.12, 0.1); rough = 0.55; bump = (noise(p * 90.0) - 0.5) * 0.3; }
  else { alb = vec3(0.16, 0.025, 0.035); rough = 0.6; }                      // tie
  if (id > 0.5 && id < 3.5 || id > 6.5) { alb = mix(alb, alb * vec3(0.55, 0.48, 0.4), clamp(dirt * 0.75 * (0.6 + 0.8 * fine), 0.0, 0.7)); alb = mix(alb, mix(vec3(0.028, 0.005, 0.004), vec3(0.075, 0.01, 0.007), fine), blood * 0.9); if (blood > 0.5) rough = 0.35; }   // dried blood is nearly black-brown, wet blood dark red
  // bump: tilt the normal by the noise's gradient (cheap, along the surface)
  vec3 bg = vec3(noise(p * 40.0 + 1.0), noise(p * 40.0 + 2.0), noise(p * 40.0 + 3.0)) - 0.5; n = normalize(n + (bg - n * dot(bg, n)) * bump * 0.8);
  // light: key (soft shadow), sky fill, ground bounce, rim, occlusion; skin scatters a little
  vec3 L = normalize(uLight), V = -rd, H = normalize(L + V);
  float ndl = dot(n, L), dif = sss > 0.5 ? clamp((ndl + 0.35) / 1.35, 0.0, 1.0) : max(ndl, 0.0);
  float sh = shadow(p + n * 0.004, L), ao = occl(p, n);
  float spec = pow(max(dot(n, H), 0.0), mix(8.0, 90.0, 1.0 - rough)) * (1.0 - rough) * 0.6;
  vec3 col = alb * vec3(1.0, 0.95, 0.88) * 2.0 * dif * sh;
  col += alb * vec3(0.42, 0.48, 0.56) * (0.55 + 0.45 * n.y) * ao * 0.75;
  col += alb * vec3(0.3, 0.27, 0.22) * clamp(-n.y, 0.0, 1.0) * 0.4 * ao;
  col += vec3(0.6, 0.68, 0.8) * pow(1.0 - max(dot(n, V), 0.0), 3.0) * 0.35 * ao;
  col += vec3(1.0, 0.95, 0.88) * spec * sh;
  if (sss > 0.5) col += alb * vec3(0.5, 0.15, 0.1) * 0.25 * (1.0 - max(ndl, 0.0)) * ao;
  if (id > 4.5 && id < 5.5 && uOut3.x > 1.5) col += vec3(1.2, 0.1, 0.05);   // red eyes glow
  col = aces(col * 0.85);
  gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
}`;

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

/* ---------------- renderer ---------------- */
let R3 = null;
function renderer() {
  if (R3) return R3;
  const canvas = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: false });
  r.setPixelRatio(1);
  const u = {
    uJ: { value: Array.from({ length: NJ }, () => new THREE.Vector3()) }, uHeadR: { value: new THREE.Matrix3() }, uChestR: { value: new THREE.Matrix3() }, uPelvisR: { value: new THREE.Matrix3() },
    uBody: { value: new THREE.Vector4() }, uLook: { value: new THREE.Vector4() }, uOut: { value: new THREE.Vector4() }, uOut2: { value: new THREE.Vector4() }, uOut3: { value: new THREE.Vector4() },
    uSkin: { value: new THREE.Color() }, uCloth: { value: new THREE.Color() }, uPants: { value: new THREE.Color() }, uHairC: { value: new THREE.Color() },
    uCam: { value: new THREE.Matrix3() }, uCamPos: { value: new THREE.Vector3() }, uSpan: { value: new THREE.Vector2(2, 2) }, uLight: { value: new THREE.Vector3(0.5, 0.8, 0.6) },
    uBoxMin: { value: new THREE.Vector3() }, uBoxMax: { value: new THREE.Vector3() },
  };
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false });
  const scene = new THREE.Scene(), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);
  R3 = { r, u, scene, cam: new THREE.Camera(), rt: null };
  return R3;
}
const lin = (hex) => new THREE.Color(hex);   // three converts sRGB hex to linear working colour

// Renders the frames of one animation from one direction.
// o: { zombie, anim, frames, dir (deg, 0 = facing the camera), pitch (deg), size (px), ss (supersample), light: [az, el] (deg),
//      span (m shown across the frame), foot (px from the bottom edge to the feet) }
//      raw: true → no supersampling (the pixel-art pipeline downsamples itself)
// returns { frames: [ImageData-like {w, h, data}] } with a hard alpha edge
export function renderZombie(o) {
  const z = o.zombie, R0 = renderer(), u = R0.u, N = Math.max(1, o.frames | 0), size = o.size, ss = o.raw ? 1 : (o.ss || 2), W = size * ss;
  if (!R0.rt || R0.rt.width !== W) { if (R0.rt) R0.rt.dispose(); R0.rt = new THREE.WebGLRenderTarget(W, W, { depthBuffer: false }); }
  R0.r.setSize(W, W, false);
  const n = skeleton(z), s = z.height / 1.75;
  const O = OUTFITS[z.outfit] || OUTFITS.casual;
  u.uBody.value.set(s, z.build, z.decay, 0); u.uLook.value.set(z.blood, z.dirt, z.tears, (z.seed % 97) * 0.37);
  u.uOut.value.set(O.suit ? 1 : 0, O.shirt === 'long' ? 2 : O.shirt === 'short' ? 1 : 0, O.pants === 'long' ? 2 : O.pants === 'short' ? 1 : 0, O.gown ? 1 : 0);
  u.uOut2.value.set(O.tie ? 1 : 0, O.overall ? 1 : 0, O.rags ? 1 : 0, O.suit ? 0 : ({ none: 0, short: 1, sparse: 2, long: 3 }[z.hair] || 0));
  u.uOut3.value.set({ milky: 0, yellow: 1, red: 2 }[z.eyes] || 0, z.armLost === 'right' ? 1 : 0, 0, 0);
  u.uSkin.value.copy(lin(z.skin)); u.uCloth.value.copy(lin(z.cloth)); u.uPants.value.copy(lin(z.pants)); u.uHairC.value.copy(lin(z.hairCol));
  // camera: orthographic, turned around the figure; the ground line sits `foot` px above the bottom edge
  const yaw = (o.dir || 0) * Math.PI / 180, pitch = (o.pitch ?? 6) * Math.PI / 180, span = o.span || 2.03;
  // back: from the figure towards the camera (yaw 0 = in front of it, pitch above it); rays run along -back
  const back = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)), right = new THREE.Vector3(0, 1, 0).cross(back).normalize(), up = back.clone().cross(right).normalize();
  u.uCam.value.set(right.x, up.x, back.x, right.y, up.y, back.y, right.z, up.z, back.z);
  // the centre of the frame: the ground point under the figure projected `foot` px above the bottom edge
  const centreUp = span / 2 - (o.foot ?? 9) / size * span;
  const c = new THREE.Vector3(0, 0, 0).addScaledVector(up, centreUp);
  u.uCamPos.value.copy(c).addScaledVector(back, 5); u.uSpan.value.set(span, span);
  const la = (o.light?.[0] ?? -35) * Math.PI / 180, le = (o.light?.[1] ?? 40) * Math.PI / 180;
  // the light turns with the camera (the sprite is lit the same way from every direction, as in a 2D game)
  const Lw = new THREE.Vector3().addScaledVector(right, Math.sin(la) * Math.cos(le)).addScaledVector(up, Math.sin(le)).addScaledVector(back, Math.cos(la) * Math.cos(le));
  u.uLight.value.copy(Lw.normalize());
  const out = [], buf = new Uint8Array(W * W * 4);
  for (let f = 0; f < N; f++) {
    const P = pose(n, z, o.anim, f / N);
    P.pts.forEach((p, i) => u.uJ.value[i].copy(p));
    u.uHeadR.value.copy(P.head); u.uChestR.value.copy(P.chest); u.uPelvisR.value.copy(P.pelvis); u.uBody.value.w = P.jaw;
    const mn = new THREE.Vector3(Infinity, Infinity, Infinity), mx = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (const p of P.pts) { mn.min(p); mx.max(p); }
    u.uBoxMin.value.copy(mn).subScalar(0.25); u.uBoxMax.value.copy(mx).addScalar(0.25);
    R0.r.setRenderTarget(R0.rt); R0.r.setClearColor(0x000000, 0); R0.r.clear(); R0.r.render(R0.scene, R0.cam);
    R0.r.readRenderTargetPixels(R0.rt, 0, 0, W, W, buf);
    // box-filter the supersamples (premultiplied), then a hard alpha edge; rows flipped (GL is bottom-up)
    const img = { w: size, h: size, data: new Uint8ClampedArray(size * size * 4) };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) { const k = ((W - 1 - (y * ss + j)) * W + x * ss + i) * 4, al = buf[k + 3]; r += buf[k] * al; g += buf[k + 1] * al; b += buf[k + 2] * al; a += al; }
      const k = (y * size + x) * 4;
      if (a / (ss * ss) >= 127.5) { img.data[k] = r / a; img.data[k + 1] = g / a; img.data[k + 2] = b / a; img.data[k + 3] = 255; }
    }
    out.push(img);
  }
  R0.r.setRenderTarget(null);
  return { frames: out };
}
