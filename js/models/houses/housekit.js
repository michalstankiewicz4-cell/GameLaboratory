// HouseKit — budynki złożone z prawdziwych części: fundament, ściany dzielone przez otwory na filary, podokienniki
// i nadproża, ramy okien i szyby, drzwi, stropy, szczyty, połacie dachu, attyka, komin. Każda część ma materiał
// (js/models/houses/materials.js — z niego wzór pękania), grubość, wielokąt w swoim układzie i to, na czym stoi
// (supports: części albo grunt -1) — z tego statyka: dach spada, gdy znikną ściany pod nim.
// Metry, y w górę, środek obrysu w (0, 0, 0), front patrzy na +z.
//   HOUSE_TYPES                           { id: { name, note } }
//   buildHouse(type, { seed }) → { type, name, size: [W, H, D], parts: [Part], tint }
// Part: { id, name, mat, poly: [[x, y]], t, pos: [x, y, z], quat: [x, y, z, w], anchor: 'bottom' | 'sides' | 'perimeter',
//   supports: [id | -1], need (ułamek podpór, który musi zostać), fixed (nie pęka: fundament) }
import * as THREE from '../../../vendor/three/three.module.js';

export const HOUSE_TYPES = {
  cottage: { name: 'Dom parterowy z cegły', note: 'Parterowy dom z czerwonej cegły na fundamencie, strop drewniany, dach dwuspadowy kryty dachówką, komin.' },
  kostka: { name: 'Dom „kostka”', note: 'Piętrowy dom z lat 70.: mur z cegły pod tynkiem, stropy betonowe, płaski dach kryty papą z attyką.' },
  barn: { name: 'Stodoła', note: 'Drewniana stodoła z desek ułożonych pionowo, duże wrota, wysoki dach z blachy falistej.' },
  garage: { name: 'Garaż', note: 'Garaż z pustaków z blaszaną bramą i dachem jednospadowym z blachy.' },
  shed: { name: 'Szopa', note: 'Mała drewniana szopa na narzędzia, dach z papy.' },
  block: { name: 'Blok z wielkiej płyty', note: 'Czteropiętrowy blok z prefabrykowanych płyt betonowych, rzędy okien, płaski dach.' },
};
export const HOUSE_IDS = Object.keys(HOUSE_TYPES);

function rng(seed = 1) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const R = (a, b, r) => a + (b - a) * r();
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const qBasis = (X, Y, Z) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)).toArray();

function builder() {
  const parts = [];
  const add = (o) => { const p = { id: parts.length, supports: [-1], need: 0.01, anchor: 'bottom', ...o }; parts.push(p); return p; };
  // ściana z punktu a do b (x, z) na wysokości y0, wysoka h, gruba t; otwory: [{ u środek, w, y, h, kind }]
  // ext: przedłużenie na końcach (narożniki); gable: wysokość szczytu (trójkąt nad ścianą)
  function wall({ a, b, y0, h, t, mat, openings = [], ext = [0, 0], supports = [-1], gable = 0, glassMat = 'glass', frameMat = 'frame', doorMat = 'door', name = 'ściana', frames = true }) {
    const dx = b[0] - a[0], dz = b[1] - a[1], L0 = Math.hypot(dx, dz), X = V(dx / L0, 0, dz / L0), Y = V(0, 1, 0), Z = V(-X.z, 0, X.x);
    const L = L0 + ext[0] + ext[1];
    const o = V(a[0], y0, a[1]).addScaledVector(X, -ext[0]), quat = qBasis(X, Y, Z), pos = o.toArray();
    const ops = openings.map((q) => ({ ...q, u0: q.u + ext[0] - q.w / 2, u1: q.u + ext[0] + q.w / 2 })).sort((p, q) => p.u0 - q.u0);
    const pieces = [];
    let cur = 0;
    const pier = (u0, u1) => { if (u1 - u0 > 0.02) pieces.push(add({ name: name + ' — filar', mat, poly: rect(u0, 0, u1, h), t, pos, quat, supports, anchor: 'bottom' })); };
    for (const q of ops) {
      pier(cur, q.u0);
      const left = pieces[pieces.length - 1];
      if (q.y > 0.02) pieces.push(add({ name: name + ' — podokiennik', mat, poly: rect(q.u0, 0, q.u1, q.y), t, pos, quat, supports, anchor: 'bottom' }));
      q.lintel = q.y + q.h < h - 0.02 ? add({ name: name + ' — nadproże', mat, poly: rect(q.u0, q.y + q.h, q.u1, h), t, pos, quat, supports: [], anchor: 'sides' }) : null;
      if (q.lintel) pieces.push(q.lintel);
      q.left = left; cur = q.u1;
    }
    pier(cur, L);
    const piers = pieces.filter((p) => p.name.endsWith('filar'));
    for (const q of ops) {
      // nadproże opiera się na filarach z obu stron
      const l = piers.filter((p) => Math.abs(p.poly[1][0] - q.u0) < 0.03), r = piers.filter((p) => Math.abs(p.poly[0][0] - q.u1) < 0.03);
      if (q.lintel) q.lintel.supports = [...l, ...r].map((p) => p.id);
      const around = [...l, ...r, ...(q.lintel ? [q.lintel] : [])].map((p) => p.id);
      const zo = t / 2 - 0.09, fpos = o.clone().addScaledVector(Z, zo).toArray();
      if (q.kind === 'door') {
        add({ name: 'drzwi', mat: doorMat, poly: rect(q.u0 + 0.02, 0.0, q.u1 - 0.02, q.h - 0.02), t: 0.05, pos: fpos, quat, supports: around.length ? around : [-1], anchor: 'perimeter' });
      } else if (!frames) {
        // wysokie budynki: sama szyba w otworze (ramy pominięte — tysiące części mniej)
        add({ name: 'szyba', mat: glassMat, poly: rect(q.u0 + 0.04, q.y + 0.04, q.u1 - 0.04, q.y + q.h - 0.04), t: 0.02, pos: fpos, quat, supports: around.length ? around : [-1], anchor: 'perimeter', need: 0.3 });
      } else {
        const fw = 0.07, { u0, u1 } = q, y = q.y, yt = q.y + q.h;
        const bars = [rect(u0, y, u1, y + fw), rect(u0, yt - fw, u1, yt), rect(u0, y + fw, u0 + fw, yt - fw), rect(u1 - fw, y + fw, u1, yt - fw)];
        if (u1 - u0 > 1.3) bars.push(rect((u0 + u1) / 2 - fw / 2, y + fw, (u0 + u1) / 2 + fw / 2, yt - fw));   // słupek
        const frames = bars.map((poly) => add({ name: 'rama okna', mat: frameMat, poly, t: 0.08, pos: fpos, quat, supports: around.length ? around : [-1], anchor: 'perimeter' }));
        const panes = u1 - u0 > 1.3 ? [rect(u0 + fw, y + fw, (u0 + u1) / 2 - fw / 2, yt - fw), rect((u0 + u1) / 2 + fw / 2, y + fw, u1 - fw, yt - fw)] : [rect(u0 + fw, y + fw, u1 - fw, yt - fw)];
        for (const poly of panes) add({ name: 'szyba', mat: glassMat, poly, t: 0.012, pos: fpos, quat, supports: frames.map((f) => f.id), anchor: 'perimeter', need: 0.3 });
      }
    }
    let g = null;
    if (gable > 0) g = add({ name: name + ' — szczyt', mat, poly: [[0, h], [L, h], [L / 2, h + gable]], t, pos, quat, supports: pieces.map((p) => p.id), need: 0.4, anchor: 'bottom' });
    return { pieces, gable: g, ids: pieces.map((p) => p.id) };
  }
  // płyta pozioma (strop, posadzka, dach płaski): prostokąt x0..x1, z0..z1 na wysokości środka y
  function slab({ x0, x1, z0, z1, y, t, mat, supports = [-1], need = 0.3, name = 'strop', fixed = false }) {
    const quat = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2).toArray();
    return add({ name, mat, poly: rect(x0, -z1, x1, -z0), t, pos: [0, y, 0], quat, supports, need, anchor: 'perimeter', fixed });
  }
  // połać dachu: od okapu (wysokość yE, odległość dE od kalenicy po stronie dir ±1 osi z) w górę do kalenicy (yR, z = zR)
  function roofPlane({ x0, x1, zE, yE, zR, yR, t, mat, supports, name = 'połać dachu', need = 0.25 }) {
    const s = Math.hypot(zR - zE, yR - yE), dirz = Math.sign(zR - zE) || 1;
    const Yv = V(0, (yR - yE) / s, (zR - zE) / s), Xv = V(dirz < 0 ? 1 : -1, 0, 0), Zv = new THREE.Vector3().crossVectors(Xv, Yv);
    const xa = dirz < 0 ? x0 : -x1, xb = dirz < 0 ? x1 : -x0;
    const pos = V(0, yE, zE).addScaledVector(Zv, t / 2).toArray();
    return add({ name, mat, poly: rect(xa, 0, xb, s), t, pos, quat: qBasis(Xv, Yv, Zv), supports, need, anchor: 'perimeter' });
  }
  // słup / komin: prostokąt w pionie (szer. w, gł. t) od y0 do y1 w punkcie (x, z)
  // poly: własny kształt w płaszczyźnie słupa (np. trapez iglicy); turn: obrót wokół pionu (krzyż z dwóch płaszczyzn)
  function column({ x, z, y0, y1, w, t, mat, supports, name = 'komin', need = 0.2, poly = null, turn = 0 }) {
    const quat = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), turn).toArray();
    const P = poly ? poly.map(([u, v]) => [u, v]) : rect(-w / 2, y0, w / 2, y1);
    return add({ name, mat, poly: P, t, pos: [x, 0, z], quat, supports, need, anchor: 'bottom' });
  }
  // ściana osłonowa: pas pod oknem (blacha) i szyba między stropami, panele co ~4 m po linii a→b
  return { parts, add, wall, slab, roofPlane, column };
}

// cztery ściany prostokąta W × D (osie ścian na obrysie), narożniki: front i tył przedłużone, boki skrócone
function walls4(B, { W, D, y0, h, t, mat, open, supports, gableX = 0, name, cx = 0, cz = 0, frames = true, glassMat = 'glass' }) {
  const hw = W / 2, hd = D / 2, e = t / 2, o = { y0, h, t, mat, supports, frames, glassMat };
  const f = B.wall({ ...o, a: [cx - hw, cz + hd], b: [cx + hw, cz + hd], openings: open.front || [], ext: [e, e], name: name + ' frontowa' });
  const r = B.wall({ ...o, a: [cx + hw, cz + hd], b: [cx + hw, cz - hd], openings: open.right || [], ext: [-e, -e], gable: gableX, name: name + ' boczna' });
  const b = B.wall({ ...o, a: [cx + hw, cz - hd], b: [cx - hw, cz - hd], openings: open.back || [], ext: [e, e], name: name + ' tylna' });
  const l = B.wall({ ...o, a: [cx - hw, cz - hd], b: [cx - hw, cz + hd], openings: open.left || [], ext: [-e, -e], gable: gableX, name: name + ' boczna' });
  return { all: [f, r, b, l], ids: [f, r, b, l].flatMap((w) => w.ids), gables: [r.gable, l.gable].filter(Boolean).map((g) => g.id) };
}
// okna rozłożone równo na ścianie długości L
function row(L, n, w, y, h, door = -1, dw = 1, dh = 2.1) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = L * (i + 0.5) / n;
    out.push(i === door ? { u, w: dw, y: 0, h: dh, kind: 'door' } : { u, w, y, h, kind: 'window' });
  }
  return out;
}

const BUILD = {
  cottage(r) {
    const B = builder(), W = R(8.5, 10.5, r), D = R(6.8, 8, r), t = 0.3, H = 2.75, base = 0.35, pitch = R(36, 44, r) * Math.PI / 180, ov = 0.45;
    const fnd = B.slab({ x0: -W / 2 - 0.2, x1: W / 2 + 0.2, z0: -D / 2 - 0.2, z1: D / 2 + 0.2, y: base / 2, t: base, mat: 'concrete', name: 'fundament', fixed: true });
    const rise = (D / 2) * Math.tan(pitch);
    const nf = W > 9.5 ? 4 : 3;
    const w4 = walls4(B, { W, D, y0: base, h: H, t, mat: 'brick', supports: [fnd.id], gableX: rise, name: 'ściana',
      open: { front: row(W, nf, 1.2, 0.9, 1.4, 1, 1.0, 2.1), back: row(W, 3, 1.1, 1.0, 1.2), right: row(D, 1, 1.0, 0.95, 1.3), left: row(D, 2, 0.8, 1.1, 1.0) } });
    const ceil = B.slab({ x0: -W / 2, x1: W / 2, z0: -D / 2, z1: D / 2, y: base + H + 0.09, t: 0.18, mat: 'floor', supports: w4.ids, need: 0.35, name: 'strop drewniany' });
    const yTop = base + H + 0.18, eave = yTop - ov * Math.tan(pitch);
    const roofSup = [...w4.ids, ...w4.gables, ceil.id];
    const rf = B.roofPlane({ x0: -W / 2 - ov, x1: W / 2 + ov, zE: D / 2 + ov, yE: eave, zR: 0, yR: yTop + rise, t: 0.14, mat: 'tiles', supports: roofSup });
    const rb = B.roofPlane({ x0: -W / 2 - ov, x1: W / 2 + ov, zE: -D / 2 - ov, yE: eave, zR: 0, yR: yTop + rise, t: 0.14, mat: 'tiles', supports: roofSup });
    B.column({ x: W * 0.22, z: -D * 0.18, y0: yTop, y1: yTop + rise + 0.9, w: 0.55, t: 0.55, mat: 'brick', supports: [ceil.id, rf.id, rb.id], name: 'komin' });
    return { B, size: [W + 2 * ov, yTop + rise + 0.9, D + 2 * ov], tint: null };
  },
  kostka(r) {
    const B = builder(), W = R(9.5, 11, r), D = R(9, 10.5, r), t = 0.36, H = 2.9, base = 0.45, st = 0.22;
    const fnd = B.slab({ x0: -W / 2 - 0.2, x1: W / 2 + 0.2, z0: -D / 2 - 0.2, z1: D / 2 + 0.2, y: base / 2, t: base, mat: 'concrete', name: 'fundament', fixed: true });
    let sup = [fnd.id], y = base, last = null;
    for (let k = 0; k < 2; k++) {
      const w4 = walls4(B, { W, D, y0: y, h: H, t, mat: 'plaster', supports: sup, name: `ściana ${k ? 'piętra' : 'parteru'}`,
        open: { front: row(W, 4, 1.3, 0.9, 1.45, k ? -1 : 1, 1.0, 2.1), back: row(W, 3, 1.3, 0.9, 1.45, k ? -1 : 2, 0.9, 2.1), right: row(D, 2, 1.1, 0.9, 1.4), left: row(D, 2, 1.1, 0.9, 1.4) } });
      y += H;
      last = B.slab({ x0: -W / 2, x1: W / 2, z0: -D / 2, z1: D / 2, y: y + st / 2, t: st, mat: 'concrete', supports: w4.ids, need: 0.35, name: k ? 'stropodach' : 'strop' });
      sup = [last.id]; y += st;
    }
    B.slab({ x0: -W / 2, x1: W / 2, z0: -D / 2, z1: D / 2, y: y + 0.03, t: 0.06, mat: 'felt', supports: [last.id], need: 0.4, name: 'papa' });
    walls4(B, { W, D, y0: y, h: 0.6, t: 0.25, mat: 'plaster', supports: [last.id], open: {}, name: 'attyka' });
    return { B, size: [W, y + 0.6, D], tint: [['#f2e3c2', '#e6d6b8', '#dcdcd4', '#f0d7b0', '#cfd6c6'][Math.floor(r() * 5)]] };
  },
  barn(r) {
    const B = builder(), W = R(13, 16, r), D = R(8.5, 10, r), t = 0.05, H = R(3.8, 4.4, r), base = 0.25, pitch = R(42, 50, r) * Math.PI / 180, ov = 0.35;
    const fnd = B.slab({ x0: -W / 2 - 0.1, x1: W / 2 + 0.1, z0: -D / 2 - 0.1, z1: D / 2 + 0.1, y: base / 2, t: base, mat: 'concrete', name: 'podmurówka', fixed: true });
    const rise = (D / 2) * Math.tan(pitch);
    const w4 = walls4(B, { W, D, y0: base, h: H, t, mat: 'wood', supports: [fnd.id], gableX: rise, name: 'ściana z desek',
      open: { front: [{ u: W / 2, w: 3.6, y: 0, h: 3.4, kind: 'door' }], back: row(W, 3, 0.6, 2.2, 0.5), right: [{ u: D / 2, w: 0.7, y: H * 0.62, h: 0.7, kind: 'window' }] } });
    const yTop = base + H, eave = yTop - ov * Math.tan(pitch), sup = [...w4.ids, ...w4.gables];
    B.roofPlane({ x0: -W / 2 - ov, x1: W / 2 + ov, zE: D / 2 + ov, yE: eave, zR: 0, yR: yTop + rise, t: 0.05, mat: 'metal', supports: sup, need: 0.3 });
    B.roofPlane({ x0: -W / 2 - ov, x1: W / 2 + ov, zE: -D / 2 - ov, yE: eave, zR: 0, yR: yTop + rise, t: 0.05, mat: 'metal', supports: sup, need: 0.3 });
    return { B, size: [W + 2 * ov, yTop + rise, D + 2 * ov], tint: null };
  },
  garage(r) {
    const B = builder(), W = R(3.2, 3.8, r), D = R(5.6, 6.4, r), t = 0.24, H = 2.5, base = 0.2;
    const fnd = B.slab({ x0: -W / 2 - 0.1, x1: W / 2 + 0.1, z0: -D / 2 - 0.1, z1: D / 2 + 0.1, y: base / 2, t: base, mat: 'concrete', name: 'posadzka', fixed: true });
    const w4 = walls4(B, { W, D, y0: base, h: H, t, mat: 'blocks', supports: [fnd.id], name: 'ściana z pustaków', open: { front: [{ u: W / 2, w: 2.4, y: 0, h: 2.1, kind: 'door' }], right: [{ u: D / 2, w: 0.6, y: 1.5, h: 0.5, kind: 'window' }] } });
    // brama z blachy zamiast drzwi z desek
    for (const p of B.parts) if (p.name === 'drzwi') { p.mat = 'tin'; p.name = 'brama garażowa'; }
    const yTop = base + H;
    B.roofPlane({ x0: -W / 2 - 0.25, x1: W / 2 + 0.25, zE: D / 2 + 0.3, yE: yTop - 0.02, zR: -D / 2 - 0.3, yR: yTop + 0.45, t: 0.04, mat: 'tin', supports: w4.ids, need: 0.3, name: 'dach z blachy' });
    return { B, size: [W + 0.5, yTop + 0.45, D + 0.6], tint: null };
  },
  shed(r) {
    const B = builder(), W = R(2.4, 3.2, r), D = R(2, 2.6, r), t = 0.04, H = 2.1, pitch = 22 * Math.PI / 180;
    const rise = (D / 2) * Math.tan(pitch);
    const w4 = walls4(B, { W, D, y0: 0, h: H, t, mat: 'wood', supports: [-1], gableX: rise, name: 'ściana szopy', open: { front: [{ u: W * 0.35, w: 0.85, y: 0, h: 1.9, kind: 'door' }], right: [{ u: D / 2, w: 0.5, y: 1.2, h: 0.45, kind: 'window' }] } });
    const sup = [...w4.ids, ...w4.gables];
    B.roofPlane({ x0: -W / 2 - 0.2, x1: W / 2 + 0.2, zE: D / 2 + 0.2, yE: H - 0.2 * Math.tan(pitch), zR: 0, yR: H + rise, t: 0.03, mat: 'felt', supports: sup });
    B.roofPlane({ x0: -W / 2 - 0.2, x1: W / 2 + 0.2, zE: -D / 2 - 0.2, yE: H - 0.2 * Math.tan(pitch), zR: 0, yR: H + rise, t: 0.03, mat: 'felt', supports: sup });
    return { B, size: [W + 0.4, H + rise, D + 0.4], tint: null };
  },
  block(r) {
    const B = builder(), W = R(26, 32, r), D = 11.2, t = 0.26, H = 2.8, base = 0.6, st = 0.2, floors = 4;
    const fnd = B.slab({ x0: -W / 2 - 0.2, x1: W / 2 + 0.2, z0: -D / 2 - 0.2, z1: D / 2 + 0.2, y: base / 2, t: base, mat: 'concrete', name: 'fundament', fixed: true });
    let sup = [fnd.id], y = base, last = null;
    const nW = Math.round(W / 3);
    for (let k = 0; k < floors; k++) {
      const front = row(W, nW, 1.5, 0.85, 1.5, k ? -1 : Math.floor(nW / 2), 1.4, 2.3), back = row(W, nW, 1.2, 0.9, 1.4);
      const w4 = walls4(B, { W, D, y0: y, h: H, t, mat: 'panel', supports: sup, name: `płyta ścienna ${k + 1}`, open: { front, back, right: row(D, 2, 0.9, 0.9, 1.4), left: row(D, 2, 0.9, 0.9, 1.4) } });
      y += H;
      last = B.slab({ x0: -W / 2, x1: W / 2, z0: -D / 2, z1: D / 2, y: y + st / 2, t: st, mat: 'concrete', supports: w4.ids, need: 0.35, name: `strop ${k + 1}` });
      sup = [last.id]; y += st;
    }
    B.slab({ x0: -W / 2, x1: W / 2, z0: -D / 2, z1: D / 2, y: y + 0.03, t: 0.06, mat: 'felt', supports: [last.id], need: 0.4, name: 'papa' });
    walls4(B, { W, D, y0: y, h: 0.5, t: 0.2, mat: 'panel', supports: [last.id], open: {}, name: 'attyka' });
    return { B, size: [W, y + 0.5, D], tint: [['#e8e2d2', '#d9d2c0', '#e2d9c8'][Math.floor(r() * 3)]] };
  },
};

export function buildHouse(type = 'cottage', { seed = 1 } = {}) {
  const T = BUILD[type] ? type : 'cottage', r = rng(seed * 7717 + T.length * 131);
  const { B, size, tint } = BUILD[T](r);
  B.parts.forEach((p, i) => { p.seed = seed * 1000 + i; });
  return { type: T, name: HOUSE_TYPES[T].name, size, parts: B.parts, tint: tint ? tint[0] : null, seed };
}
