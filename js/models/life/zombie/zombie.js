// Zombie generator: original undead characters from a seed, rendered as sprite-sheet frames.
// The body is a signed distance field (smoothly joined round cones and ellipsoids on a skeleton), clothes are shells
// over it with tears. Per frame the field is turned into a mesh in JS (surface nets over a narrow band), coloured per
// vertex (decay, wounds, dirt, blood, occlusion) and drawn with ordinary three.js materials — key light with soft
// shadows, sky and ground fill, rim light, ACES — then cut out with a hard (1-bit) alpha edge. (A first version
// ray-marched the field in one shader; Direct3D on Windows took minutes to compile it.)
// The skeleton is posed with forward kinematics per frame (shamble, lurch, lunge, idle, crawl); every frame of an
// animation uses the same camera, so the sprite does not jump; the feet stay on the pivot line.
import * as THREE from '../../../../vendor/three/three.module.js';
import { prepareGPU, gpuReady, setGPUPose, sampleGPU } from './zombie-gpu.js';

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


/* ---------------- the distance field (JS) ---------------- */
// Everything in metres, world frame, the character facing +z. A field is built per frame from the posed skeleton;
// field(x, y, z) returns the distance and leaves the material in F.id (0 skin, 1 top/suit, 2 trousers, 3 shoes,
// 4 hair, 5 eye, 7 gloves/boots, 8 tie) and the head-local point in F.hx, F.hy, F.hz (for the face's colours).
const fract = (v) => v - Math.floor(v);
function hash(x, y, z) { x = fract(x * 0.3183099 + 0.1) * 17; y = fract(y * 0.3183099 + 0.1) * 17; z = fract(z * 0.3183099 + 0.1) * 17; return fract(x * y * z * (x + y + z)); }
function noise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z); let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iy, iz), b = hash(ix + 1, iy, iz), c = hash(ix, iy + 1, iz), d = hash(ix + 1, iy + 1, iz);
  const e = hash(ix, iy, iz + 1), f = hash(ix + 1, iy, iz + 1), g = hash(ix, iy + 1, iz + 1), h = hash(ix + 1, iy + 1, iz + 1);
  const x1 = a + (b - a) * fx, x2 = c + (d - c) * fx, x3 = e + (f - e) * fx, x4 = g + (h - g) * fx;
  const y1 = x1 + (x2 - x1) * fy, y2 = x3 + (x4 - x3) * fy; return y1 + (y2 - y1) * fz;
}
function fbm(x, y, z) { let a = 0.5, s = 0; for (let i = 0; i < 4; i++) { s += a * noise(x, y, z); x = x * 2.03 + 7.1; y = y * 2.03 + 7.1; z = z * 2.03 + 7.1; a *= 0.5; } return s; }
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const sdEll = (x, y, z, rx, ry, rz) => { const k0 = Math.hypot(x / rx, y / ry, z / rz), k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz)); return k0 * (k0 - 1) / k1; };
const sph = (x, y, z, c, r) => Math.hypot(x - c[0], y - c[1], z - c[2]) - r;
// round cone (iq), a and b as [x, y, z]
function sdRC(px, py, pz, a, b, r1, r2) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], l2 = bx * bx + by * by + bz * bz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const qx = px - a[0], qy = py - a[1], qz = pz - a[2], y = qx * bx + qy * by + qz * bz, zz = y - l2;
  const xx = qx * l2 - bx * y, xy = qy * l2 - by * y, xz = qz * l2 - bz * y, x2 = xx * xx + xy * xy + xz * xz, y2 = y * y * l2, z2 = zz * zz * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const norm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export const F = { id: 0, hx: 0, hy: 0, hz: 0 };
export { surface as _surface };
function makeField(z, P) {
  const O = OUTFITS[z.outfit] || OUTFITS.casual, s = z.height / 1.75, b = z.build, J = P.pts.map((v) => [v.x, v.y, v.z]);
  const loc = (m, o) => { const e = m.elements; return (x, y, zz, out) => { const vx = x - o[0], vy = y - o[1], vz = zz - o[2]; out[0] = e[0] * vx + e[1] * vy + e[2] * vz; out[1] = e[3] * vx + e[4] * vy + e[5] * vz; out[2] = e[6] * vx + e[7] * vy + e[8] * vz; }; };
  const toChest = loc(P.chest, J[1]), toPelvis = loc(P.pelvis, J[0]), toHead = loc(P.head, J[3]);
  const ja = P.jaw * 0.45, cj = Math.cos(ja), sj = Math.sin(ja), lost = z.armLost === 'right', seed = (z.seed % 97) * 0.37;
  const suit = !!O.suit, shirt = O.shirt === 'long' ? 2 : O.shirt === 'short' ? 1 : 0, pants = O.pants === 'long' ? 2 : O.pants === 'short' ? 1 : 0;
  const hair = suit ? 0 : ({ none: 0, short: 1, sparse: 2, long: 3 }[z.hair] || 0), tears = z.tears;
  // fixed per frame: hands (palm, four clawed fingers, a thumb), the neck's base
  const hands = [];
  for (let k = 0; k < 2; k++) {
    if (k === 1 && lost) break;
    const w = J[6 + 4 * k], h = J[7 + 4 * k], ax = norm3([h[0] - w[0], h[1] - w[1], h[2] - w[2]]), side = norm3(add3(cross3(ax, [0, 0, 1]), [1e-4, 1e-4, 1e-4])), fw = norm3(cross3(side, ax));
    const segs = [[w, lerp3(w, h, 0.55), 0.03 * s, 0.033 * s]];
    for (let f = 0; f < 4; f++) { const o = (f - 1.5) * 0.017 * s, b0 = add3(lerp3(w, h, 0.5), side, o), b1 = add3(add3(b0, ax, 0.045 * s), fw, 0.012 * s), b2 = add3(add3(b1, ax, 0.028 * s), fw, 0.022 * s); segs.push([b0, b1, 0.0095 * s, 0.008 * s], [b1, b2, 0.008 * s, 0.005 * s]); }
    const t0 = add3(lerp3(w, h, 0.2), side, 0.03 * s); segs.push([t0, add3(add3(add3(t0, ax, 0.04 * s), fw, 0.02 * s), side, -0.01 * s), 0.012 * s, 0.008 * s]);
    hands.push(segs);
  }
  const neckA = lerp3(J[1], J[2], 0.6), ab = 1 + 0.2 * b, kneeMid = lerp3(J[13], J[17], 0.5);
  const pc = [0, 0, 0], pp = [0, 0, 0], ph = [0, 0, 0];
  const field = (x, y, zz) => {
    toChest(x, y, zz, pc); toPelvis(x, y, zz, pp); toHead(x, y, zz, ph);
    // torso
    const chest = sdEll(pc[0], pc[1] - 0.02 * s, pc[2], (0.175 + 0.03 * b) * s, 0.17 * s, (0.11 + 0.03 * b) * s);
    const belly = sdEll(pp[0], pp[1] - 0.17 * s, pp[2] - (0.025 + 0.04 * b) * s, (0.15 + 0.05 * b) * s, 0.16 * s, (0.1 + 0.07 * b) * s);
    const hips = sdEll(pp[0], pp[1] - 0.01, pp[2], (0.165 + 0.03 * b) * s, 0.12 * s, (0.11 + 0.02 * b) * s);
    let torso = smin(smin(chest, belly, 0.08 * s), hips, 0.06 * s);
    torso = smin(torso, sdRC(x, y, zz, J[4], J[8], 0.06 * s, 0.06 * s), 0.07 * s);
    const neck = sdRC(x, y, zz, neckA, J[3], 0.052 * s, 0.045 * s);
    // head: skull, jaw (opens), nose, ears, eye sockets, mouth
    const skull = sdEll(ph[0], ph[1] - 0.1 * s, ph[2] + 0.005 * s, 0.08 * s, 0.1 * s, 0.098 * s);
    let jy = ph[1] - 0.05 * s, jz = ph[2] - 0.03 * s; const ry = cj * jy - sj * jz, rz = sj * jy + cj * jz;
    let face = smin(skull, sdEll(ph[0], ry + 0.035 * s, rz - 0.035 * s, 0.058 * s, 0.035 * s, 0.05 * s), 0.03 * s);
    face = smin(face, sdEll(ph[0], ph[1] - 0.085 * s, ph[2] - 0.098 * s, 0.014 * s, 0.022 * s, 0.018 * s), 0.012 * s);
    for (const i of [-1, 1]) face = smin(face, sdEll(ph[0] - i * 0.08 * s, ph[1] - 0.095 * s, ph[2], 0.012 * s, 0.025 * s, 0.018 * s), 0.01 * s);
    for (const i of [-1, 1]) face = Math.max(face, -sdEll(ph[0] - i * 0.033 * s, ph[1] - 0.115 * s, ph[2] - 0.09 * s, 0.019 * s, 0.014 * s, 0.018 * s));
    face = Math.max(face, -sdEll(ph[0], ph[1] - (0.045 - ja * 0.05) * s, ph[2] - 0.095 * s, 0.03 * s, (0.006 + ja * 0.03) * s, 0.03 * s));
    // limbs
    let arms = 1e9;
    for (let k = 0; k < 2; k++) { const a = J[4 + 4 * k], e = J[5 + 4 * k];
      let up = smin(sdRC(x, y, zz, a, e, 0.052 * s * ab, 0.04 * s), sph(x, y, zz, lerp3(a, e, 0.45), 0.047 * s * ab), 0.04 * s);
      up = smin(up, sph(x, y, zz, lerp3(a, e, 0.08), 0.058 * s * ab), 0.03 * s); arms = Math.min(arms, up); }
    let fore = smin(sdRC(x, y, zz, J[5], J[6], 0.042 * s, 0.027 * s), sph(x, y, zz, lerp3(J[5], J[6], 0.25), 0.04 * s), 0.03 * s);
    fore = Math.min(fore, lost ? sdRC(x, y, zz, J[9], lerp3(J[9], J[10], 0.45), 0.042 * s, 0.034 * s)
      : smin(sdRC(x, y, zz, J[9], J[10], 0.042 * s, 0.027 * s), sph(x, y, zz, lerp3(J[9], J[10], 0.25), 0.04 * s), 0.03 * s));
    let hnd = 1e9;
    for (const segs of hands) { let hd = sdRC(x, y, zz, segs[0][0], segs[0][1], segs[0][2], segs[0][3]); for (let i = 1; i < segs.length; i++) hd = smin(hd, sdRC(x, y, zz, segs[i][0], segs[i][1], segs[i][2], segs[i][3]), 0.006 * s); hnd = Math.min(hnd, hd); }
    const thigh = Math.min(sdRC(x, y, zz, J[12], J[13], 0.082 * s * (1 + 0.25 * b), 0.05 * s), sdRC(x, y, zz, J[16], J[17], 0.082 * s * (1 + 0.25 * b), 0.05 * s));
    let shin = 1e9;
    for (let k = 0; k < 2; k++) { const kn = J[13 + 4 * k], an = J[14 + 4 * k]; shin = Math.min(shin, smin(sdRC(x, y, zz, kn, an, 0.05 * s, 0.032 * s), sph(x, y, zz, lerp3(kn, an, 0.3), 0.052 * s), 0.05 * s)); }
    const feet = Math.min(sdRC(x, y, zz, J[14], J[15], 0.04 * s, 0.032 * s), sdRC(x, y, zz, J[18], J[19], 0.04 * s, 0.032 * s));
    let skin = smin(smin(smin(torso, neck, 0.03 * s), face, 0.02 * s), smin(smin(arms, fore, 0.02 * s), hnd, 0.015 * s), 0.035 * s);
    skin = smin(skin, smin(smin(thigh, shin, 0.03 * s), feet, 0.02 * s), 0.05 * s);
    let d = skin, id = 0;
    const tearAt = () => (fbm(x * 9 + seed, y * 9 + seed, zz * 9 + seed) - (1.02 - tears * 0.42)) * 0.05;
    if (suit) {                                      // hazmat: one baggy shell with folds, a hood round the face
      const s0 = Math.min(torso, thigh) - 0.06 * s, fold = s0 < 0.12 ? (fbm(x * 7, y * 3, zz * 7) - 0.5) * 0.042 : 0;
      let sd = smin(smin(torso - 0.06 * s, arms - 0.04 * s, 0.05 * s), smin(fore - 0.034 * s, smin(thigh - 0.05 * s, shin - 0.042 * s, 0.05 * s), 0.03 * s), 0.04 * s) + fold;
      sd = smin(sd, neck - 0.05 * s, 0.05 * s);
      let hood = sdEll(ph[0], ph[1] - 0.1 * s, ph[2] + 0.01 * s, 0.115 * s, 0.135 * s, 0.13 * s);
      hood = Math.max(hood, -sdEll(ph[0], ph[1] - 0.085 * s, ph[2] - 0.12 * s, 0.07 * s, 0.085 * s, 0.08 * s));
      sd = smin(sd, hood, 0.04 * s);
      if (sd < 0.03 && tears > 0) sd = Math.max(sd, tearAt() * 0.6);
      if (sd < d) { d = sd; id = 1; }
      const glove = hnd - 0.012 * s, boot = Math.min(feet - 0.018 * s, shin - 0.026 * s + Math.max(0, y - 0.3 * s) * 2);
      if (glove < d) { d = glove; id = 7; } if (boot < d) { d = boot; id = 7; }
    } else {
      let top = 1e9, bot = 1e9;
      if (O.gown) {
        top = Math.min(torso - 0.03 * s, arms - 0.018 * s);
        top = smin(top, sdRC(x, y, zz, add3(J[0], [0, 0.1, 0]), add3(kneeMid, [0, 0.05, 0]), 0.2 * s, 0.24 * s), 0.08 * s);
      } else {
        if (shirt) { top = Math.min(torso - 0.016 * s, arms - 0.012 * s); if (shirt > 1) top = Math.min(top, fore - 0.01 * s); }
        if (O.overall) top = Math.min(top, Math.min(thigh - 0.02 * s, shin - 0.016 * s));
        if (pants) { bot = Math.min(thigh - 0.018 * s, Math.max(torso - 0.018 * s, (y - J[0][1]) - 0.06 * s)); if (pants > 1) bot = Math.min(bot, shin - 0.015 * s); }
        if (O.rags) { const rg = (fbm(x * 14, y * 14, zz * 14) - 0.5) * 0.08; bot = Math.max(bot, y - (J[13][1] + 0.05 + rg)); top = Math.max(top, (J[0][1] - 0.05 + rg) - y); }
        if (O.tie) {
          const tz = (0.125 + 0.03 * b) * s; let tie = sdRC(pc[0], pc[1], pc[2], [0, 0.12 * s, 0.13 * s], [0, -0.18 * s, (0.15 + 0.03 * b) * s], 0.012 * s, 0.03 * s);
          tie = Math.max(tie, Math.abs(pc[2] - tz) - 0.025 * s); if (tie < d) { d = tie; id = 8; }
        }
      }
      if (Math.min(top, bot) < 0.03 && tears > 0) { const t = tearAt(); top = Math.max(top, t); bot = Math.max(bot, t * 0.8); }
      if (top < d) { d = top; id = 1; }
      if (bot < d) { d = bot; id = 2; }
      const shoe = feet - 0.014 * s; if (shoe < d && !O.rags) { d = shoe; id = 3; }
      if (hair) {
        let hr = sdEll(ph[0], ph[1] - 0.112 * s, ph[2] + 0.012 * s, 0.088 * s, 0.1 * s, 0.104 * s);
        hr = Math.max(hr, -(ph[1] - (0.105 - (hair > 2 ? 0.05 : 0)) * s) + Math.max(0, ph[2] - 0.02 * s) * 1.4);
        if (hair === 2 && hr < 0.02) hr = Math.max(hr, (0.55 - fbm(ph[0] * 40, ph[1] * 40, ph[2] * 40)) * 0.02);
        if (hair === 3) hr = smin(hr, sdEll(ph[0], ph[1] - 0.03 * s, ph[2] + 0.06 * s, 0.085 * s, 0.1 * s, 0.05 * s), 0.03);
        if (hr < d) { d = hr; id = 4; }
      }
    }
    for (const i of [-1, 1]) { const e = Math.hypot(ph[0] - i * 0.033 * s, ph[1] - 0.114 * s, ph[2] - 0.083 * s) - 0.013 * s; if (e < d) { d = e; id = 5; } }
    F.id = id; F.hx = ph[0]; F.hy = ph[1]; F.hz = ph[2];
    return d;
  };
  return { field, s, O, J, toHead };
}

/* ---------------- surface: surface nets over a narrow band ---------------- */
// The field is sampled on a coarse grid; only coarse cells near the surface get the fine grid. A vertex sits in every
// fine cell the surface crosses (at the mean of its edge crossings), a quad joins the four cells round every crossed
// edge. Normals come from the field's gradient, so the facets do not show.
let GRID = null;
// sample(xyz) → { d, id }: the field for a batch of points (CPU loop or GPU)
function surface(sample, box, h) {
  const nx = Math.ceil((box[3] - box[0]) / h) + 1, ny = Math.ceil((box[4] - box[1]) / h) + 1, nz = Math.ceil((box[5] - box[2]) / h) + 1, N = nx * ny * nz;
  if (!GRID || GRID.v.length < N) GRID = { v: new Float32Array(N), cell: new Int32Array(N) };
  const V = GRID.v, cellIx = GRID.cell; V.fill(NaN); cellIx.fill(-1);   // NaN: not sampled yet
  const C = 4, at = (i, j, k) => (k * ny + j) * nx + i, X = (i) => box[0] + i * h, Y = (j) => box[1] + j * h, Z = (k) => box[2] + k * h;
  // coarse pass: the centre of every block of C³ cells
  const blocks = [];
  for (let k = 0; k < nz - 1; k += C) for (let j = 0; j < ny - 1; j += C) for (let i = 0; i < nx - 1; i += C) blocks.push(i, j, k);
  const nb = blocks.length / 3, cxyz = new Float32Array(nb * 3);
  for (let q = 0; q < nb; q++) { cxyz[q * 3] = X(Math.min(nx - 1, blocks[q * 3] + C / 2)); cxyz[q * 3 + 1] = Y(Math.min(ny - 1, blocks[q * 3 + 1] + C / 2)); cxyz[q * 3 + 2] = Z(Math.min(nz - 1, blocks[q * 3 + 2] + C / 2)); }
  const dc = sample(cxyz).d, lim = h * C * 1.2 + 0.006;      // margin: the field is only a bound in places
  // near the surface every grid point of the block is sampled; far from it the block takes its centre's value
  const queue = [];
  const corners = (q, fn) => { const i = blocks[q * 3], j = blocks[q * 3 + 1], k = blocks[q * 3 + 2];
    for (let kk = k; kk <= Math.min(nz - 1, k + C); kk++) for (let jj = j; jj <= Math.min(ny - 1, j + C); jj++) for (let ii = i; ii <= Math.min(nx - 1, i + C); ii++) fn(at(ii, jj, kk), ii, jj, kk); };
  for (let q = 0; q < nb; q++) if (Math.abs(dc[q]) <= lim) corners(q, (a, ii, jj, kk) => { if (V[a] !== V[a]) { V[a] = Infinity; queue.push(a, ii, jj, kk); } });
  const nq = queue.length / 4, fxyz = new Float32Array(nq * 3);
  for (let q = 0; q < nq; q++) { fxyz[q * 3] = X(queue[q * 4 + 1]); fxyz[q * 3 + 1] = Y(queue[q * 4 + 2]); fxyz[q * 3 + 2] = Z(queue[q * 4 + 3]); }
  const fd = sample(fxyz).d; for (let q = 0; q < nq; q++) V[queue[q * 4]] = fd[q] || 1e-6;
  for (let q = 0; q < nb; q++) if (Math.abs(dc[q]) > lim) corners(q, (a) => { if (V[a] !== V[a]) V[a] = dc[q]; });
  const pos = [], idx = [];
  const corner = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const d8 = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let inside = 0;
    for (let c = 0; c < 8; c++) { const q = corner[c]; d8[c] = V[at(i + q[0], j + q[1], k + q[2])]; if (d8[c] < 0) inside++; }
    if (inside === 0 || inside === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b2] of edges) { if ((d8[a] < 0) === (d8[b2] < 0)) continue; const t = d8[a] / (d8[a] - d8[b2]), qa = corner[a], qb = corner[b2];
      sx += qa[0] + (qb[0] - qa[0]) * t; sy += qa[1] + (qb[1] - qa[1]) * t; sz += qa[2] + (qb[2] - qa[2]) * t; n++; }
    cellIx[at(i, j, k)] = pos.length / 3; pos.push(X(i) + sx / n * h, Y(j) + sy / n * h, Z(k) + sz / n * h);
  }
  // quads round every crossed edge, each turned so its normal points out of the solid (along the edge, towards the outside)
  const quad = (a, b2, c, d, ax, ay, az) => {
    if (a < 0 || b2 < 0 || c < 0 || d < 0) return;
    const P = (q) => q * 3, ux = pos[P(b2)] - pos[P(a)], uy = pos[P(b2) + 1] - pos[P(a) + 1], uz = pos[P(b2) + 2] - pos[P(a) + 2];
    const vx = pos[P(c)] - pos[P(a)], vy = pos[P(c) + 1] - pos[P(a) + 1], vz = pos[P(c) + 2] - pos[P(a) + 2];
    const dot = (uy * vz - uz * vy) * ax + (uz * vx - ux * vz) * ay + (ux * vy - uy * vx) * az;
    if (dot >= 0) idx.push(a, b2, c, a, c, d); else idx.push(a, c, b2, a, d, c);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const in0 = V[at(i, j, k)] < 0, o = in0 ? 1 : -1;
    if ((V[at(i + 1, j, k)] < 0) !== in0) quad(cellIx[at(i, j - 1, k - 1)], cellIx[at(i, j, k - 1)], cellIx[at(i, j, k)], cellIx[at(i, j - 1, k)], o, 0, 0);
    if ((V[at(i, j + 1, k)] < 0) !== in0) quad(cellIx[at(i - 1, j, k - 1)], cellIx[at(i - 1, j, k)], cellIx[at(i, j, k)], cellIx[at(i, j, k - 1)], 0, o, 0);
    if ((V[at(i, j, k + 1)] < 0) !== in0) quad(cellIx[at(i - 1, j - 1, k)], cellIx[at(i, j - 1, k)], cellIx[at(i, j, k)], cellIx[at(i - 1, j, k)], 0, 0, o);
  }
  return { pos, idx };
}
const cpuSampler = (field) => (xyz) => { const n = xyz.length / 3, d = new Float32Array(n), id = new Uint8Array(n); for (let i = 0; i < n; i++) { d[i] = field(xyz[i * 3], xyz[i * 3 + 1], xyz[i * 3 + 2]); id[i] = F.id; } return { d, id }; };

/* ---------------- colours (per vertex) ---------------- */
const C3 = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };   // linear
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ss01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function shadeVertex(z, x, y, zz, id, hx, hy, hz, s, cols) {
  const seed = (z.seed % 97) * 0.37, fine = noise(x * 60 + seed, y * 60, zz * 60), big = fbm(x * 6 + seed, y * 6, zz * 6);
  const blood = ss01(0.68 - z.blood * 0.14, 0.72 - z.blood * 0.14, fbm(x * 4.5 + seed + 3, y * 4.5 + 3, zz * 4.5 + 3) + 0.1 * fbm(x * 30, y * 30, zz * 30));
  const dirt = z.dirt * (0.5 * ss01(0.7 * s, 0, y) + 0.25 * ss01(0.6, 0.8, fbm(x * 3 + seed + 9, y * 3 + 9, zz * 3 + 9)));
  let c, rough = 0.75;
  if (id === 0) {
    c = cols.skin.slice();
    c = mixc(c, [c[0] * 0.75, c[1] * 0.82, c[2] * 0.68], ss01(0.35, 0.75, fbm(x * 9 + seed * 1.3, y * 9, zz * 9)) * z.decay);
    c = mixc(c, [0.32, 0.24, 0.3], ss01(0.6, 0.85, fbm(x * 5 + seed + 1.7, y * 5 + 1.7, zz * 5 + 1.7)) * z.decay * 0.7);
    const vein = 1 - Math.abs(noise(x * 22 + seed, y * 22, zz * 22) * 2 - 1); c = c.map((v) => v * (1 - ss01(0.88, 0.98, vein) * 0.25 * z.decay));
    const wound = ss01(0.7 - z.decay * 0.12, 0.74 - z.decay * 0.12, fbm(x * 7 + seed + 5, y * 7 + 5, zz * 7 + 5));
    c = mixc(c, mixc([0.06, 0.008, 0.006], [0.22, 0.12, 0.09], fine * 0.35), wound);
    const mouth = ss01(0.06 * s, 0, Math.hypot(hx, (hy - 0.035 * s) * 0.6, hz - 0.09 * s));
    c = mixc(c, [0.035, 0.005, 0.004], Math.min(1, mouth * (0.4 + z.blood)));
    const eye = Math.abs(Math.hypot(hx, (hy - 0.115 * s) * 1.6, hz - 0.07 * s) - 0.04 * s); c = mixc(c, c.map((v) => v * 0.6), ss01(0.03 * s, 0, eye) * 0.6);
    if (Math.hypot(hx / 0.032, (hy - 0.045 * s) / (0.012 + z.jaw * 0.03), (hz - 0.085 * s) / 0.03) / s < 1) c = [0.12, 0.02, 0.02];
    rough = 0.6;
  } else if (id === 1) c = cols.cloth.slice();
  else if (id === 2) c = cols.pants.slice();
  else if (id === 3) c = [0.09, 0.075, 0.065];
  else if (id === 4) c = cols.hair.map((v) => v * (0.7 + 0.5 * noise(hx * 200, hy * 30, hz * 200)));
  else if (id === 5) c = z.eyes === 'red' ? [0.9, 0.08, 0.04] : z.eyes === 'yellow' ? [0.85, 0.75, 0.3] : [0.78, 0.8, 0.74];
  else if (id === 7) c = [0.12, 0.12, 0.1];
  else c = [0.16, 0.025, 0.035];
  if ((id >= 1 && id <= 3) || id === 7) {
    c = mixc(c, [c[0] * 0.55, c[1] * 0.48, c[2] * 0.4], Math.min(0.7, dirt * 0.75 * (0.6 + 0.8 * fine)));
    c = mixc(c, mixc([0.028, 0.005, 0.004], [0.075, 0.01, 0.007], fine), blood * 0.9);
  }
  // a little variation at the pixel scale, so flat colours do not look like plastic
  const v = 0.92 + 0.16 * (big * 0.6 + fine * 0.4); c = c.map((q) => q * v);
  return c;
}

/* ---------------- render ---------------- */
let R3 = null;
function stage() {
  if (R3) return R3;
  const canvas = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, premultipliedAlpha: false });
  r.setPixelRatio(1); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15; r.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
  const key = new THREE.DirectionalLight(0xfff2e0, 2.6), rim = new THREE.DirectionalLight(0x9fb4d0, 1.1), hemi = new THREE.HemisphereLight(0x8fa0b8, 0x4a4036, 0.9);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01; key.shadow.radius = 3;
  scene.add(key, key.target, rim, rim.target, hemi);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
  const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.12, 0.05) }), eyes = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), eyeMat); scene.add(m); return m; });
  const out2 = document.createElement('canvas'), g2 = out2.getContext('2d', { willReadFrequently: true });
  R3 = { r, scene, cam, key, rim, hemi, mesh, eyes, out2, g2 };
  return R3;
}

// Renders the frames of one animation from one direction.
// o: { zombie, anim, frames, dir (deg, 0 = facing the camera), pitch (deg), size (px), ss (supersample), light: [az, el] (deg),
//      span (m shown across the frame), foot (px from the bottom edge to the feet), raw (no supersampling) }
// returns frames as { w, h, data } with a hard alpha edge. One frame per step of the generator.
function* frameGen(o) {
  const z = o.zombie, R0 = stage(), N = Math.max(1, o.frames | 0), size = o.size, ss = o.raw ? 1 : (o.ss || 2), W = size * ss;
  R0.r.setSize(W, W, false);
  const n = skeleton(z), span = o.span || 2.03;
  const yaw = (o.dir || 0) * Math.PI / 180, pitch = (o.pitch ?? 6) * Math.PI / 180;
  const back = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)), right = new THREE.Vector3(0, 1, 0).cross(back).normalize(), up = back.clone().cross(right).normalize();
  // orthographic camera; the ground point under the figure sits `foot` px above the bottom edge
  const centreUp = span / 2 - (o.foot ?? 9) / size * span, c = new THREE.Vector3().addScaledVector(up, centreUp);
  R0.cam.position.copy(c).addScaledVector(back, 6); R0.cam.up.copy(up); R0.cam.lookAt(c);
  Object.assign(R0.cam, { left: -span / 2, right: span / 2, top: span / 2, bottom: -span / 2 }); R0.cam.updateProjectionMatrix();
  // the light turns with the camera (the sprite is lit the same way from every direction, as sprites in a 2D game are)
  const la = (o.light?.[0] ?? -35) * Math.PI / 180, le = (o.light?.[1] ?? 40) * Math.PI / 180;
  const L = new THREE.Vector3().addScaledVector(right, Math.sin(la) * Math.cos(le)).addScaledVector(up, Math.sin(le)).addScaledVector(back, Math.cos(la) * Math.cos(le)).normalize();
  R0.key.position.copy(L).multiplyScalar(4); R0.key.target.position.set(0, 0.9, 0);
  Object.assign(R0.key.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 0.5, far: 9 }); R0.key.shadow.camera.updateProjectionMatrix();
  R0.rim.position.copy(back).multiplyScalar(-4).addScaledVector(up, 2).addScaledVector(right, -Math.sign(Math.sin(la)) * 1.5); R0.rim.target.position.set(0, 0.9, 0);
  const cols = { skin: C3(z.skin), cloth: C3(z.cloth), pants: C3(z.pants), hair: C3(z.hairCol) };
  const h = Math.max(0.0045, span / size * 1.6);                     // the mesh step: about 1.6 px of the frame
  const g2 = R0.g2; R0.out2.width = W; R0.out2.height = W;
  for (let f = 0; f < N; f++) {
    const P = pose(n, z, o.anim, f / N), Fd = makeField(z, P), gpuOn = o.engine === 'gpu';
    if (gpuOn) setGPUPose(z, P);
    const sample = gpuOn ? sampleGPU : cpuSampler(Fd.field);
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (const p of Fd.J) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], p[a]); mx[a] = Math.max(mx[a], p[a]); }
    const box = [mn[0] - 0.22, Math.max(-0.05, mn[1] - 0.22), mn[2] - 0.22, mx[0] + 0.22, mx[1] + 0.22, mx[2] + 0.22];
    const sf = surface(sample, box, h);
    yield { stage: 'mesh' };
    // normals from the gradient (6 taps), the material at the vertex, then occlusion along the normal (3 taps) — in two
    // batches, so the GPU sampler gets them all at once; colours and small bumps on the CPU
    const nv = sf.pos.length / 3, nrm = new Float32Array(nv * 3), col = new Float32Array(nv * 3), e = 0.0015;
    const T1 = [[0, 0, 0], [e, 0, 0], [-e, 0, 0], [0, e, 0], [0, -e, 0], [0, 0, e], [0, 0, -e]], t1 = new Float32Array(nv * 21);
    for (let v = 0; v < nv; v++) for (let k = 0; k < 7; k++) for (let c = 0; c < 3; c++) t1[(v * 7 + k) * 3 + c] = sf.pos[v * 3 + c] + T1[k][c];
    const r1 = sample(t1);
    yield { stage: 'normals' };
    const t2 = new Float32Array(nv * 9);
    for (let v = 0; v < nv; v++) {
      const x = sf.pos[v * 3], y = sf.pos[v * 3 + 1], zz = sf.pos[v * 3 + 2], b0 = v * 7, id = r1.id[b0];
      let gx = r1.d[b0 + 1] - r1.d[b0 + 2], gy = r1.d[b0 + 3] - r1.d[b0 + 4], gz = r1.d[b0 + 5] - r1.d[b0 + 6];
      const bump = id === 0 ? 0.35 : id === 1 || id === 2 ? 0.55 : 0.2, bn = (noise(x * 40, y * 40, zz * 40) - 0.5) * bump, bm = (noise(x * 40 + 5, y * 40 + 5, zz * 40 + 5) - 0.5) * bump, bo = (noise(x * 40 + 9, y * 40 + 9, zz * 40 + 9) - 0.5) * bump;
      const gl = Math.hypot(gx, gy, gz) || 1; gx = gx / gl + bn; gy = gy / gl + bm; gz = gz / gl + bo; const gl2 = Math.hypot(gx, gy, gz) || 1;
      nrm[v * 3] = gx / gl2; nrm[v * 3 + 1] = gy / gl2; nrm[v * 3 + 2] = gz / gl2;
      for (let i = 1; i <= 3; i++) for (let c = 0; c < 3; c++) t2[(v * 3 + i - 1) * 3 + c] = sf.pos[v * 3 + c] + nrm[v * 3 + c] * 0.03 * i;
    }
    const r2 = sample(t2), ph = [0, 0, 0];
    for (let v = 0; v < nv; v++) {
      const x = sf.pos[v * 3], y = sf.pos[v * 3 + 1], zz = sf.pos[v * 3 + 2];
      let ao = 0, w = 1; for (let i = 1; i <= 3; i++) { ao += w * (0.03 * i - r2.d[v * 3 + i - 1]); w *= 0.6; }
      const occ = Math.min(1, Math.max(0.35, 1 - 3 * ao));
      Fd.toHead(x, y, zz, ph);
      const c3 = shadeVertex(z, x, y, zz, r1.id[v * 7], ph[0], ph[1], ph[2], Fd.s, cols);
      col[v * 3] = c3[0] * occ; col[v * 3 + 1] = c3[1] * occ; col[v * 3 + 2] = c3[2] * occ;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(sf.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(sf.idx, 1) : new THREE.Uint16BufferAttribute(sf.idx, 1));
    R0.mesh.geometry.dispose(); R0.mesh.geometry = g;
    // glowing red eyes
    const red = z.eyes === 'red', hm = new THREE.Matrix4().setFromMatrix3(P.head);
    R0.eyes.forEach((m, i) => { m.visible = red; if (!red) return; const p = new THREE.Vector3((i ? 1 : -1) * 0.033 * Fd.s, 0.114 * Fd.s, 0.088 * Fd.s).applyMatrix4(hm).add(P.pts[3]); m.position.copy(p); m.scale.setScalar(0.009 * Fd.s); });
    R0.r.setClearColor(0x000000, 0); R0.r.render(R0.scene, R0.cam);
    g2.clearRect(0, 0, W, W); g2.drawImage(R0.r.domElement, 0, 0);
    const buf = g2.getImageData(0, 0, W, W).data;
    // box-filter the supersamples (weighted by coverage), then a hard alpha edge
    const img = { w: size, h: size, data: new Uint8ClampedArray(size * size * 4) };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let r = 0, gg = 0, bb = 0, a = 0;
      for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) { const k = ((y * ss + j) * W + x * ss + i) * 4, al = buf[k + 3]; r += buf[k] * al; gg += buf[k + 1] * al; bb += buf[k + 2] * al; a += al; }
      const k = (y * size + x) * 4;
      if (a / (ss * ss) >= 127.5) { img.data[k] = r / a; img.data[k + 1] = gg / a; img.data[k + 2] = bb / a; img.data[k + 3] = 255; }
    }
    yield img;
  }
}
export function renderZombie(o) { return { frames: [...frameGen(o)].filter((x) => !x.stage) }; }
// the same, a step at a time, giving the page a moment between steps (the loader moves); onFrame(done, total);
// cancelled() → true stops early (a newer render was asked for) and returns null
export async function renderZombieAsync(o, onFrame, cancelled) {
  const out = [], N = Math.max(1, o.frames | 0);
  if (o.engine === 'gpu' && !gpuReady()) { if (onFrame) onFrame(0, N, 'compile'); await new Promise((r) => setTimeout(r, 30)); await prepareGPU(); }
  for (const x of frameGen(o)) {
    if (x.stage) { if (onFrame) onFrame(out.length + 0.5, N); }
    else { out.push(x); if (onFrame) onFrame(out.length, N); }
    await new Promise((r) => setTimeout(r, 0));
    if (cancelled && cancelled()) return null;
  }
  return { frames: out };
}
