// StructKit building blocks in metres (y up). They add pieces to a ShipKit Part (merged per material), except the
// moving ones (crane, cantilever, legs), which return groups the structure can animate.
import * as THREE from '../../vendor/three.module.js';
import { Part } from '../shipkit/geom.js';

const seg = (n, d) => Math.max(3, Math.round(n * d));

// Square truss leg along +y from y0 to y0 + len: four chords with rack plates on their outer faces, X-bracing on
// every face and a horizontal ring at every bay. width = chord centre to chord centre.
export function trussLeg(p, d, { len, width, chordR = 0.45, bay = 5, braceR = 0.14, y0 = 0, rack = true }) {
  const h = width / 2, C = [[-h, -h], [h, -h], [h, h], [-h, h]];
  for (const [x, z] of C) {
    p.cyl('leg', chordR, chordR, len, seg(10, d), [x, y0 + len / 2, z]);
    if (rack) {                                            // the jacking rack: a toothed plate on the outer side of the chord
      const ox = Math.sign(x) * (chordR + 0.08), oz = Math.sign(z) * (chordR + 0.08);
      p.box('metal', 0.16, len, 0.42, [x + ox, y0 + len / 2, z], [0, 0, 0]);
      p.box('metal', 0.42, len, 0.16, [x, y0 + len / 2, z + oz], [0, 0, 0]);
    }
  }
  const bays = Math.max(1, Math.floor(len / bay));
  for (let i = 0; i <= bays; i++) {
    const y = y0 + (i * len) / bays;
    for (let k = 0; k < 4; k++) {
      const a = C[k], b = C[(k + 1) % 4];
      p.rod('leg', [a[0], y, a[1]], [b[0], y, b[1]], braceR, 6);                             // horizontal
      if (i < bays) {
        const y2 = y0 + ((i + 1) * len) / bays;
        if (i % 2 === 0) p.rod('leg', [a[0], y, a[1]], [b[0], y2, b[1]], braceR, 6);         // X-bracing (alternating diagonals)
        else p.rod('leg', [b[0], y, b[1]], [a[0], y2, a[1]], braceR, 6);
      }
    }
    if (i % 4 === 0) { p.rod('leg', [C[0][0], y, C[0][1]], [C[2][0], y, C[2][1]], braceR * 0.8, 5); p.rod('leg', [C[1][0], y, C[1][1]], [C[3][0], y, C[3][1]], braceR * 0.8, 5); }
  }
}

// Spud can (the leg's footing): a wide low cylinder with conical top and a pointed tip, top at y = 0.
export function spudCan(p, d, dia, h) {
  const r = dia / 2;
  p.cyl('leg', r * 0.32, r, h * 0.35, seg(24, d), [0, -h * 0.175, 0]);         // top cone up to the leg
  p.cyl('leg', r, r, h * 0.3, seg(24, d), [0, -h * 0.5, 0]);                   // rim
  p.cyl('leg', r, r * 0.12, h * 0.35, seg(24, d), [0, -h * 0.825, 0]);         // bottom cone (spigot)
}

// Jack house around a leg: a tall open frame with panels low down and the rack-and-pinion units on each chord
// (motor + gearbox boxes); centred on the leg at deck level y0, height h, leg width w.
export function jackHouse(p, d, { w, h, y0 }) {
  const o = w / 2 + 1.4;
  for (const [x, z] of [[-o, -o], [o, -o], [o, o], [-o, o]]) p.box('yellow', 0.6, h, 0.6, [x, y0 + h / 2, z]);
  for (const y of [y0 + h * 0.45, y0 + h]) for (const [a, b] of [[[-o, -o], [o, -o]], [[o, -o], [o, o]], [[o, o], [-o, o]], [[-o, o], [-o, -o]]]) p.rod('yellow', [a[0], y, a[1]], [b[0], y, b[1]], 0.25, 6);
  for (const s of [-1, 1]) { p.box('yellow', 2 * o, h * 0.4, 0.15, [0, y0 + h * 0.2, s * o]); p.box('yellow', 0.15, h * 0.4, 2 * o, [s * o, y0 + h * 0.2, 0]); }
  // pinion units: three stacked motor/gearbox boxes per chord face, like the LeTourneau electric jacking units
  const hw = w / 2;
  for (const [x, z] of [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]]) for (let k = 0; k < 3; k++) {
    const y = y0 + 1.5 + k * (h * 0.27);
    p.box('dark', 0.9, 1.6, 0.9, [x + Math.sign(x) * 1.1, y, z]);
    p.cyl('metal', 0.35, 0.35, 0.7, seg(10, d), [x + Math.sign(x) * 1.1, y + 1.15, z]);
  }
}

// Tapered four-leg lattice tower (derrick): base side b0, crown side b1, height h, standing at y0.
export function latticeTower(p, d, { b0, b1, h, y0 = 0, bays = 12, key = 'white', r = 0.18 }) {
  const at = (t) => { const s = (b0 + (b1 - b0) * t) / 2; return [[-s, -s], [s, -s], [s, s], [-s, s]]; };
  for (let k = 0; k < 4; k++) { const a = at(0)[k], b = at(1)[k]; p.rod(key, [a[0], y0, a[1]], [b[0], y0 + h, b[1]], r * 1.6, 6); }
  for (let i = 0; i <= bays; i++) {
    const t = i / bays, y = y0 + h * t, c = at(t);
    for (let k = 0; k < 4; k++) {
      const a = c[k], b = c[(k + 1) % 4];
      p.rod(key, [a[0], y, a[1]], [b[0], y, b[1]], r, 5);
      if (i < bays) { const t2 = (i + 1) / bays, c2 = at(t2), y2 = y0 + h * t2, b2 = c2[(k + 1) % 4], a2 = c2[k];
        p.rod(key, [a[0], y, a[1]], [b2[0], y2, b2[1]], r * 0.8, 4); p.rod(key, [b[0], y, b[1]], [a2[0], y2, a2[1]], r * 0.8, 4); }
    }
  }
}

// Lattice boom along +z from z = 0: width w0 at the heel, w1 at the tip, length len (crane booms, burner booms).
export function latticeBoom(p, d, { len, w0, w1, key = 'yellow', r = 0.12, bays = 10 }) {
  const at = (t) => { const s = (w0 + (w1 - w0) * t) / 2; return [[-s, -s * 0.8], [s, -s * 0.8], [s, s * 0.8], [-s, s * 0.8]]; };
  for (let k = 0; k < 4; k++) { const a = at(0)[k], b = at(1)[k]; p.rod(key, [a[0], a[1], 0], [b[0], b[1], len], r * 1.7, 6); }
  for (let i = 0; i <= bays; i++) {
    const t = i / bays, z = len * t, c = at(t);
    for (let k = 0; k < 4; k++) {
      const a = c[k], b = c[(k + 1) % 4]; p.rod(key, [a[0], a[1], z], [b[0], b[1], z], r, 4);
      if (i < bays) { const c2 = at((i + 1) / bays), z2 = len * (i + 1) / bays, b2 = c2[(k + 1) % 4]; p.rod(key, [a[0], a[1], z], [b2[0], b2[1], z2], r * 0.8, 4); }
    }
  }
}

// Pedestal crane: pedestal, slewing house with cab, A-frame, lattice boom (luffing), wire and hook block.
// Returns { group, slew (rotates about y), boom (rotates about x: 0 = horizontal, negative = raised), hook }.
export function pedestalCrane(mats, d, { boom = 42.7, pedestal = 8 } = {}) {
  const group = new THREE.Group(); group.name = 'crane';
  const base = new Part('crane base', mats);
  base.cyl('yellow', 1.4, 1.6, pedestal, seg(16, d), [0, pedestal / 2, 0]);
  base.cyl('dark', 1.9, 1.9, 0.4, seg(18, d), [0, pedestal + 0.2, 0]);
  group.add(base.finish());
  const slew = new THREE.Group(); slew.position.y = pedestal + 0.4; group.add(slew);
  const house = new Part('crane house', mats);
  house.box('yellow', 4.2, 3.2, 6.5, [0, 1.6, -1.2]);                         // machinery house
  house.box('white', 2.0, 2.4, 2.2, [2.6, 1.9, 1.6]);                         // operator's cab
  house.box('glass', 2.02, 1.1, 2.0, [2.6, 2.3, 1.62]);
  house.box('glass', 1.9, 1.1, 0.05, [2.6, 2.3, 2.72]);
  for (const s of [-1, 1]) house.rod('yellow', [s * 1.6, 3.2, -3.6], [s * 0.7, 9.5, -1.5], 0.22, 6);   // A-frame
  for (const s of [-1, 1]) house.rod('yellow', [s * 1.6, 3.2, 1.0], [s * 0.7, 9.5, -1.5], 0.22, 6);
  house.box('dark', 1.6, 0.6, 1.0, [0, 9.6, -1.5]);
  slew.add(house.finish());
  const boomG = new THREE.Group(); boomG.position.set(0, 1.4, 1.8); slew.add(boomG);
  const bp = new Part('crane boom', mats); latticeBoom(bp, d, { len: boom, w0: 1.8, w1: 0.9, bays: Math.round(boom / 3.2) });
  bp.cyl('dark', 0.5, 0.5, 1.4, seg(10, d), [0, 0, boom], [0, 0, Math.PI / 2]);              // boom head sheaves
  boomG.add(bp.finish());
  const hook = new THREE.Group(); boomG.add(hook); hook.position.set(0, 0, boom);
  const hp = new Part('crane hook', mats);
  hp.rod('rope', [0, 0, 0], [0, -12, 0], 0.04, 4); hp.box('yellow', 0.8, 1.2, 0.5, [0, -12.6, 0]); hp.box('dark', 0.3, 0.6, 0.3, [0, -13.5, 0]);
  hook.add(hp.finish());
  return { group, slew, boom: boomG, hook, boomLen: boom };
}

// Totally enclosed lifeboat (survival craft): orange hull and canopy, white hatch strip, on its davit cradle.
export function lifeboat(p, d, len, at, yaw = 0) {
  const [x, y, z] = at, b = len * 0.32;
  const hull = new THREE.SphereGeometry(1, seg(16, d), seg(8, d)); hull.scale(b / 2, b * 0.42, len / 2);
  p.add('orange', hull, [x, y + b * 0.42, z], [0, yaw, 0]);
  p.box('white', b * 0.35, 0.2, len * 0.55, [x, y + b * 0.85, z], [0, yaw, 0]);
  for (const s of [-1, 1]) {
    const dx = Math.sin(yaw) * s * len * 0.35, dz = Math.cos(yaw) * s * len * 0.35;
    p.rod('metal', [x + dx, y - 0.4, z + dz], [x + dx, y + b * 1.1, z + dz], 0.12, 6);
    p.rod('metal', [x + dx, y + b * 1.1, z + dz], [x + dx - Math.cos(yaw) * 1.4, y + b * 1.2, z + dz + Math.sin(yaw) * 1.4], 0.1, 6);
  }
}

// Helideck markings (CAP 437 style): dark green surface, white perimeter line, yellow touchdown circle, white H,
// the D-value and the maximum mass in the perimeter. One texture, cached.
let _heli = null;
export function helideckMaterial() {
  if (_heli) return _heli;
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#34503a'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = '#f2f2ea'; g.lineWidth = 10; g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; const px = 256 + Math.cos(a) * 236, py = 256 + Math.sin(a) * 236; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
  g.closePath(); g.stroke();
  g.strokeStyle = '#e8c21a'; g.lineWidth = 26; g.beginPath(); g.arc(256, 256, 120, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#f2f2ea'; g.fillRect(206, 196, 26, 120); g.fillRect(280, 196, 26, 120); g.fillRect(206, 245, 100, 22);
  g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.fillText('22.2', 256, 72); g.fillText('9.3t', 256, 462);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  _heli = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.05 });
  return _heli;
}

// Railing along a polyline of [x, z] points at deck height y: posts every ~1.8 m, top and mid rails.
export function railing(p, d, pts, y, h = 1.1, key = 'yellow', closed = false) {
  const P = closed ? [...pts, pts[0]] : pts;
  for (let i = 0; i < P.length - 1; i++) {
    const [x0, z0] = P[i], [x1, z1] = P[i + 1], L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 1.8));
    p.rod(key, [x0, y + h, z0], [x1, y + h, z1], 0.035, 4); p.rod(key, [x0, y + h * 0.5, z0], [x1, y + h * 0.5, z1], 0.03, 4);
    for (let k = 0; k <= n; k++) { const t = k / n; p.rod(key, [x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t], [x0 + (x1 - x0) * t, y + h, z0 + (z1 - z0) * t], 0.03, 4); }
  }
}

// Straight stair flight from a (bottom) to b (top), width w: two stringers and treads every 0.22 m of rise.
export function stairs(p, d, a, b, w = 0.9, key = 'yellow') {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dz), n = Math.max(2, Math.round(dy / 0.22));
  const nx = -dz / (L || 1) * w / 2, nz = dx / (L || 1) * w / 2;
  for (const s of [-1, 1]) p.rod(key, [a[0] + nx * s, a[1], a[2] + nz * s], [b[0] + nx * s, b[1], b[2] + nz * s], 0.05, 4);
  for (let i = 1; i < n; i++) { const t = i / n; p.rod('metal', [a[0] + dx * t - nx, a[1] + dy * t, a[2] + dz * t - nz], [a[0] + dx * t + nx, a[1] + dy * t, a[2] + dz * t + nz], 0.06, 4); }
}

// Rows of windows on a deckhouse face: count windows along `len` on the plane facing `dir` ('x+','x-','z+','z-').
export function windows(p, at, len, count, dir, wh = [0.9, 0.8], key = 'glass') {
  const [x, y, z] = at;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count - 0.5;
    if (dir[0] === 'x') p.box(key, 0.06, wh[1], wh[0], [x, y, z + t * len]);
    else p.box(key, wh[0], wh[1], 0.06, [x + t * len, y, z]);
  }
}
