// Budynki z laboratorium miasta (CityKit, js/models/city/landmarks/ — Warszawa z OpenStreetMap) jako budynki
// z części do zniszczenia: te same dane co model w laboratorium (obrysy części, wysokości, piętra, styl: mur, okna,
// barwy) przeliczone na części HouseKit. Każda część z mapy daje:
//   ściany  po krawędziach obrysu, kondygnacjami (wysokie części: kilka pięter w jednej — rozsądna liczba części),
//           okna wybite w murze (styl punched) albo ściana osłonowa z paneli (curtain, ribbon)
//   stropy  obrys podzielony na kawałki wypukłe (wzory pękania potrzebują wielokątów wypukłych), dziedzińce pominięte
//   dach    płaski — górny strop; spadzisty, ostrosłup, kopuła — trójkąty od każdej krawędzi do szczytu (iglice)
// Podpory: kondygnacja na stropie poprzedniej; część zaczynająca się wyżej — na górnych stropach części pod nią.
// Materiały z opisu CityKit rejestrowane w DestructKit (registerMat) — barwy i tekstury MatKit jak w laboratorium.
//   LANDMARKS                      { id: nazwa }
//   landmarkHouse(id) → { type, name, size, parts, tint, landmark }   jak buildHouse (js/models/houses/housekit.js)
import * as THREE from '../../../vendor/three/three.module.js';
import DATA from '../city/landmarks/osm-data.js';
import { LANDMARK_IDS, landmarkStyle, partSpec } from '../city/landmarks/landmarks.js';
import { normalizeSpec } from '../city/types.js';
import { registerMat } from '../../behaviors/land/destruct/materials.js';

export const LANDMARKS = Object.fromEntries(LANDMARK_IDS.map((id) => [id, DATA[id].name]));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const qBasis = (X, Y, Z) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)).toArray();
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const area2 = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2;
const num = (v) => { const x = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(x) ? x : NaN; };
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(36); };

// obrys → kawałki wypukłe: trójkąty (z dziedzińcami) łączone, póki wynik zostaje wypukły (Hertel–Mehlhorn)
function convexPieces(outer, holes = []) {
  const pts = [...outer, ...holes.flat()];
  const tri = THREE.ShapeUtils.triangulateShape(outer.map((p) => new THREE.Vector2(p[0], p[1])), holes.map((h) => h.map((p) => new THREE.Vector2(p[0], p[1]))));
  const ar = (ix) => area2(ix.map((i) => pts[i]));
  // wielokąty jako listy indeksów (CCW); krawędź "a,b" → wielokąt, do którego należy
  let polys = tri.map((t) => (ar(t) < 0 ? t.slice().reverse() : t.slice())).filter((t) => Math.abs(ar(t)) > 1e-4);
  const edges = new Map(), K = (a, b) => a * 100003 + b;
  const reg = (P) => { for (let i = 0; i < P.length; i++) edges.set(K(P[i], P[(i + 1) % P.length]), P); };
  const unreg = (P) => { for (let i = 0; i < P.length; i++) if (edges.get(K(P[i], P[(i + 1) % P.length])) === P) edges.delete(K(P[i], P[(i + 1) % P.length])); };
  polys.forEach(reg);
  const convex = (ix) => { const p = ix.map((i) => pts[i]); for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], c = p[(i + 2) % p.length]; if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) < -1e-7) return false; } return true; };
  const alive = new Set(polys);
  let changed = true;
  while (changed) {
    changed = false;
    for (const A of [...alive]) {
      if (!alive.has(A)) continue;
      for (let a = 0; a < A.length; a++) {
        const i = A[a], j = A[(a + 1) % A.length], B = edges.get(K(j, i));
        if (!B || B === A || !alive.has(B)) continue;
        const b = B.indexOf(j);   // B: … j → i …
        const M = [...A.slice(a + 1), ...A.slice(0, a + 1)];            // od j do i
        const Bt = [...B.slice(b + 1), ...B.slice(0, b + 1)];           // od i do j
        const C = [...M, ...Bt.slice(1, -1)];
        if (C.length > 24 || !convex(C)) continue;
        unreg(A); unreg(B); alive.delete(A); alive.delete(B); alive.add(C); reg(C); changed = true;
        break;
      }
    }
  }
  return [...alive].map((ix) => ix.map((i) => pts[i]));
}

// materiały części z opisu CityKit: mur (wzór pękania z rodzaju MatKit), szkło, dach
function mats(S, roofCol) {
  const w = S.wall, kind = w.kind || 'plaster';
  const pattern = kind === 'concrete' ? 'concrete' : kind === 'metal' || kind === 'paint' || kind === 'plate' ? 'sheet' : 'masonry';
  const wall = 'lm-wall-' + hash(JSON.stringify(w));
  registerMat(wall, { name: 'Ściana (' + (w.label || kind) + ')', density: pattern === 'sheet' ? 2700 : 2000, solidFactor: pattern === 'sheet' ? 0.3 : 1,
    hp: pattern === 'concrete' ? 1500 : pattern === 'sheet' ? 300 : 1000, wind: pattern === 'sheet' ? 60 : 95, pattern,
    pat: pattern === 'masonry' ? { course: 0.15, brick: 0.4, rowsFar: 6, bricksFar: 4 } : pattern === 'sheet' ? { sheetW: 1.6 } : { far: 1.8 },
    frac: pattern === 'masonry' ? [0.95, 0.62, 0.5] : [1.08, 1.06, 1.02], tex: { ...w } });
  const glass = 'lm-glass-' + hash(S.window.glass);
  registerMat(glass, { name: 'Szkło fasadowe', density: 2500, hp: 14, wind: 38, pattern: 'glass', frac: [1, 1, 1], glass: true, tone: 'curtain', color: S.window.glass });
  const roof = 'lm-roof-' + hash(roofCol);
  registerMat(roof, { name: 'Dach', density: 7850, solidFactor: 0.15, hp: 300, wind: 55, pattern: 'sheet', pat: { sheetW: 1.2 }, frac: [1.1, 1.1, 1.1],
    tex: { kind: 'paint', color: roofCol, color2: roofCol, tile: 2, roughness: 0.5, metalness: 0.5, wear: 0.2, dirt: 0.2 } });
  return { wall, glass, roof };
}

export function landmarkHouse(id) {
  const d = DATA[id]; if (!d) throw new Error('nie ma budynku ' + id);
  const st = normalizeSpec(landmarkStyle(id));
  const ringArea = (o) => Math.abs(area2(o));
  // te same części co model w laboratorium (buildLandmark): gdy części przy gruncie nie pokrywają połowy obrysu — też obrys
  const low = d.parts.filter((p) => !(num(p.tags && p.tags.min_height) > 0.5) && !(num(p.tags && p.tags['building:min_level']) > 0)).reduce((s, p) => s + ringArea(p.outer), 0);
  const parts0 = low < ringArea(d.outer) * 0.5 ? [{ outer: d.outer, holes: d.holes, tags: d.tags }, ...d.parts] : d.parts;
  const P = [];
  const add = (o) => { const p = { id: P.length, supports: [-1], need: 0.01, anchor: 'bottom', ...o }; P.push(p); return p; };
  const done = [];   // { poly, top, slabs: [id] } — dla podpór części wyżej
  let maxH = 0, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  const specs = parts0.map((p) => ({ p, sp: partSpec(p, st) })).filter((q) => q.sp).sort((a, b) => a.sp.base - b.sp.base);
  for (const { p, sp } of specs) {
    let outer = sp.footprint.points.map((q) => [q[0], q[1]]);
    if (area2(outer) > 0) outer.reverse();                     // ściany: obieg jak w HouseKit (na zewnątrz po prawej)
    const holes = (sp.footprint.holes || []).map((h) => h.map((q) => [q[0], q[1]]));
    for (const q of outer) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
    const t = p.tags || {}, canopy = t['building:part'] === 'roof' || t.building === 'roof';
    const M = mats(sp, sp.roof.color);
    // podpory: górne stropy części, na których ta stoi (wysokość szczytu blisko początku tej części, obrysy zachodzą)
    let sup = [-1];
    if (sp.base > 0.5) {
      const under = done.filter((u) => u.top <= sp.base + 1.5 && overlap(u.poly, outer));
      const best = under.length ? Math.max(...under.map((u) => u.top)) : null;
      const s = under.filter((u) => u.top >= best - 2).flatMap((u) => u.slabs);
      if (s.length) sup = s;
    }
    const pieces = convexPieces(outer.map((q) => [q[0], q[1]]).reverse(), holes);   // CCW w (x, z)
    const slab = (y, th, mat, supports, need = 0.3, name = 'strop') => pieces.map((poly) => add({ name, mat, t: th, pos: [0, y, 0],
      quat: new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2).toArray(), poly: ccw(poly.map(([x, z]) => [x, -z])), supports, need, anchor: 'perimeter' }).id);
    if (canopy) {
      const top = sp.base + (sp.groundH || 1);
      done.push({ poly: outer, top, slabs: slab(top - 0.25, 0.5, M.roof, sup, 0.2, 'zadaszenie') });
      maxH = Math.max(maxH, top); continue;
    }
    // kondygnacje: wysokie części po kilka pięter w jednej (najwyżej ok. 12 pasów na część)
    const g = Math.max(1, Math.ceil((sp.floors - 1) / 12)), units = [];
    let y = sp.base;
    units.push(sp.groundH);
    for (let f = 1; f < sp.floors; f += g) units.push(sp.floorH * Math.min(g, sp.floors - f));
    if (sp.attic > 0.3) units.push(sp.attic);
    const curtain = sp.window.style === 'curtain' || sp.window.style === 'ribbon';
    units.forEach((h, k) => {
      const ids = [], attic = sp.attic > 0.3 && k === units.length - 1;
      for (let i = 0; i < outer.length; i++) {
        const a = outer[i], b = outer[(i + 1) % outer.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 0.4) continue;
        const X = V((b[0] - a[0]) / L, 0, (b[1] - a[1]) / L), Y = V(0, 1, 0), Z = V(-X.z, 0, X.x), quat = qBasis(X, Y, Z), pos = [a[0], y, a[1]];
        if (curtain && !attic && L > 2) {
          // ściana osłonowa: panele (pas + szyba), co najmniej 4,5 m
          const n = Math.max(1, Math.round(L / Math.max(6, sp.bay * 3))), sill = sp.window.style === 'ribbon' ? Math.min(1.1, h * 0.3) : Math.min(0.6, h * 0.15);
          for (let j = 0; j < n; j++) {
            const u0 = L * j / n + 0.02, u1 = L * (j + 1) / n - 0.02;
            ids.push(add({ name: 'ściana osłonowa — pas', mat: M.wall, poly: rect(u0, 0, u1, sill), t: 0.12, pos, quat, supports: sup }).id);
            ids.push(add({ name: 'ściana osłonowa — szyba', mat: M.glass, poly: rect(u0, sill, u1, h), t: 0.03, pos, quat, supports: sup, anchor: 'perimeter' }).id);
          }
        } else {
          // mur z oknami: przęsła co ≥ 3,6 m, okno na środku przęsła (wysokie pasy: okno na kilka pięter)
          const n = attic || L < 2.4 ? 0 : Math.max(1, Math.round(L / Math.max(4.8, sp.bay * (g > 1 ? 2 : 1.5)))), span = L / Math.max(1, n);
          const ww = Math.min(span - 1.2, sp.window.w * (g > 1 ? 1.6 : 1.3)), sill = k === 0 ? Math.min(sp.window.sill, 1.2) : sp.window.sill, wh = Math.min(h - sill - 0.5, sp.window.h * (g > 1 ? g * 0.9 : 1));
          let u = 0;
          const wall = (u0, u1, v0, v1, name) => { if (u1 - u0 > 0.05 && v1 - v0 > 0.05) ids.push(add({ name, mat: M.wall, poly: rect(u0, v0, u1, v1), t: 0.4, pos, quat, supports: sup }).id); };
          if (ww < 0.5 || wh < 0.5 || n === 0) wall(0, L, 0, h, 'ściana');
          else for (let j = 0; j < n; j++) {
            const c = span * (j + 0.5), w0 = c - ww / 2, w1 = c + ww / 2;
            wall(u, w0, 0, h, 'ściana — filar');
            wall(w0, w1, 0, sill, 'ściana — podokiennik');
            wall(w0, w1, sill + wh, h, 'ściana — nadproże');
            ids.push(add({ name: 'szyba', mat: M.glass, poly: rect(w0 + 0.04, sill + 0.04, w1 - 0.04, sill + wh - 0.04), t: 0.03, pos: V(...pos).addScaledVector(Z, 0.12).toArray(), quat, supports: sup, anchor: 'perimeter', need: 0.3 }).id);
            u = w1;
          }
          if (n > 0 && ww >= 0.5 && wh >= 0.5) wall(u, L, 0, h, 'ściana — filar');
        }
      }
      y += h;
      sup = slab(y + 0.15, 0.3, 'concrete', ids, 0.3, k === units.length - 1 ? 'stropodach' : 'strop');
      y += 0.3;
    });
    // dach spadzisty / ostrosłup / kopuła: trójkąty do szczytu nad środkiem obrysu
    const rh = sp.roof.height || 0;
    if (rh > 0.3) {
      const c = outer.reduce((s, q) => [s[0] + q[0] / outer.length, s[1] + q[1] / outer.length], [0, 0]), apex = V(c[0], y + rh, c[1]);
      for (let i = 0; i < outer.length; i++) {
        const a = outer[i], b = outer[(i + 1) % outer.length], A = V(a[0], y, a[1]), B = V(b[0], y, b[1]), L = A.distanceTo(B);
        if (L < 0.2) continue;
        const X = B.clone().sub(A).normalize(), toA = apex.clone().sub(A), Yv = toA.clone().addScaledVector(X, -toA.dot(X)).normalize(), Zv = new THREE.Vector3().crossVectors(X, Yv);
        const ax = toA.dot(X), ay = toA.dot(Yv);
        add({ name: 'dach — połać', mat: M.roof, poly: [[0, 0], [L, 0], [ax, ay]], t: 0.2, pos: A.clone().addScaledVector(Zv, 0.1).toArray(), quat: qBasis(X, Yv, Zv), supports: sup, need: 0.3, anchor: 'perimeter' });
      }
      y += rh;
    }
    done.push({ poly: outer, top: y, slabs: sup });
    maxH = Math.max(maxH, y);
  }
  P.forEach((p, i) => { p.seed = hash(id).length * 1000 + i; });
  return { type: 'landmark', landmark: id, name: d.name, size: [x1 - x0, maxH, z1 - z0], parts: P, tint: null, seed: 1 };
}
const ccw = (p) => (area2(p) < 0 ? p.slice().reverse() : p);
function overlap(a, b) {
  const bb = (p) => p.reduce((r, q) => [Math.min(r[0], q[0]), Math.min(r[1], q[1]), Math.max(r[2], q[0]), Math.max(r[3], q[1])], [Infinity, Infinity, -Infinity, -Infinity]);
  const A = bb(a), B = bb(b);
  return A[0] < B[2] && B[0] < A[2] && A[1] < B[3] && B[1] < A[3];
}
