// RoadKit — geometria: krzywe profilu, nadwozie z przekrojów (loft) z podziałem na części, wstęgi, bryły z zaokrągleniem,
// koła (opona z profilu, felga, kołpak). Jednostki: metry; +Y w górę, +Z przód, +X lewa strona (strona kierowcy).
import * as THREE from '../../../vendor/three/three.module.js';

// krzywa y(z) przez punkty kontrolne (Catmull-Rom, gęsto próbkowana, potem odczyt liniowy)
export function curve(points, samples = 600) {
  const v = points.map(([z, y]) => new THREE.Vector2(z, y));
  const c = new THREE.SplineCurve(v), pts = c.getPoints(samples).sort((a, b) => a.x - b.x);
  return (z) => {
    if (z <= pts[0].x) return pts[0].y; if (z >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
    let lo = 0, hi = pts.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].x <= z) lo = m; else hi = m; }
    const a = pts[lo], b = pts[hi], t = (z - a.x) / ((b.x - a.x) || 1); return a.y + (b.y - a.y) * t;
  };
}
// wartość liniowo między punktami [z, v]
export function lin(points) {
  return (z) => {
    if (z <= points[0][0]) return points[0][1]; const n = points.length; if (z >= points[n - 1][0]) return points[n - 1][1];
    for (let i = 1; i < n; i++) if (z <= points[i][0]) { const [z0, v0] = points[i - 1], [z1, v1] = points[i]; return v0 + (v1 - v0) * (z - z0) / ((z1 - z0) || 1); }
  };
}
export const smooth = (t) => t * t * (3 - 2 * t);

// ---------- loft: siatka [stacja][punkt pierścienia] → geometrie z wybranych czworokątów ----------
// rings: tablica pierścieni (każdy: tablica Vector3, ta sama liczba punktów); pick(i, j, centroid) → nazwa części lub null
// orient(centroid, normal) → true, gdy normalna ma być odwrócona; uv(i, j) → [u, v]
export function loftParts(rings, pick, { orient, uv, closedRing = true } = {}) {
  const S = rings.length, P = rings[0].length, parts = {};
  const a = new THREE.Vector3(), b = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < S - 1; i++) for (let j = 0; j < (closedRing ? P : P - 1); j++) {
    const j1 = (j + 1) % P;
    const q = [rings[i][j], rings[i + 1][j], rings[i + 1][j1], rings[i][j1]];
    c.set(0, 0, 0); q.forEach((p) => c.add(p)); c.multiplyScalar(0.25);
    const name = pick(i, j, c); if (!name) continue;
    a.subVectors(q[2], q[0]); b.subVectors(q[3], q[1]); n.crossVectors(a, b);
    if (n.lengthSq() < 1e-12) continue;
    const flip = orient ? orient(c, n.normalize()) : false;
    let p = parts[name]; if (!p) p = parts[name] = { idx: new Map(), pos: [], uvs: [], index: [] };
    const vid = (ii, jj) => { const k = ii * 100000 + jj; let v = p.idx.get(k); if (v === undefined) { v = p.pos.length / 3; const r = rings[ii][jj]; p.pos.push(r.x, r.y, r.z); const t = uv ? uv(ii, jj) : [jj / P, ii / S]; p.uvs.push(t[0], t[1]); p.idx.set(k, v); } return v; };
    const v0 = vid(i, j), v1 = vid(i + 1, j), v2 = vid(i + 1, j1), v3 = vid(i, j1);
    if (!flip) p.index.push(v0, v1, v2, v0, v2, v3); else p.index.push(v0, v2, v1, v0, v3, v2);
  }
  const out = {};
  for (const k in parts) {
    const p = parts[k], g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(p.uvs, 2));
    g.setIndex(p.index); g.computeVertexNormals(); out[k] = g;
  }
  return out;
}

// przesunięcie geometrii wzdłuż jej normalnych (szyby nad otworem, listwy nad poszyciem)
export function offsetAlongNormals(g, d) {
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * d, p.getY(i) + n.getY(i) * d, p.getZ(i) + n.getZ(i) * d);
  p.needsUpdate = true; g.computeBoundingSphere(); return g;
}

// wstęga wzdłuż linii na powierzchni: pts (Vector3), normals (Vector3, na zewnątrz), szerokość, wysunięcie
export function ribbon(pts, normals, width, lift = 0.002) {
  const pos = [], idx = [], side = new THREE.Vector3(), t = new THREE.Vector3();
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    t.subVectors(b, a).normalize(); side.crossVectors(normals[i], t).normalize().multiplyScalar(width / 2);
    const base = pts[i].clone().addScaledVector(normals[i], lift);
    pos.push(...base.clone().add(side).toArray(), ...base.clone().sub(side).toArray());
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  // ustawienie w stronę normalnych powierzchni
  g.computeVertexNormals();
  const nn = g.attributes.normal; if (nn.count && nn.getX(0) * normals[0].x + nn.getY(0) * normals[0].y + nn.getZ(0) * normals[0].z < 0) { for (let i = 0; i < idx.length; i += 3) { const s = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = s; } g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}

// zaokrąglona bryła: prostokąt w XY z promieniem, wyciągnięty wzdłuż Z z fazą (zamknięta)
export function roundBox(w, h, d, r = 0.02, bevel = 0.01, seg = 3) {
  const s = new THREE.Shape(), x = w / 2 - bevel, y = h / 2 - bevel, rr = Math.max(0.0001, Math.min(r, x, y));
  s.moveTo(-x + rr, -y); s.lineTo(x - rr, -y); s.quadraticCurveTo(x, -y, x, -y + rr); s.lineTo(x, y - rr); s.quadraticCurveTo(x, y, x - rr, y);
  s.lineTo(-x + rr, y); s.quadraticCurveTo(-x, y, -x, y - rr); s.lineTo(-x, -y + rr); s.quadraticCurveTo(-x, -y, -x + rr, -y);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.0005, d - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: seg, curveSegments: 4 });
  g.translate(0, 0, -(d - 2 * bevel) / 2); g.computeVertexNormals(); return g;
}
// kształt 2D wyciągnięty wzdłuż ścieżki 3D (zderzaki owijające narożniki)
export function sweep(shapePts, path, steps = 64) {
  const s = new THREE.Shape(shapePts.map(([a, b]) => new THREE.Vector2(a, b)));
  return new THREE.ExtrudeGeometry(s, { steps, bevelEnabled: false, extrudePath: path });
}

// ---------- koło: opona (profil obrotowy), felga stalowa, kołpak, bęben hamulca ----------
// oś obrotu wzdłuż X; zwraca { group, spin } — spin obraca się z prędkością, group skręca
export function wheel(M, { R = 0.288, W = 0.175, rim = 0.165, side = 1, hub = 'cap' } = {}) {
  const group = new THREE.Group(), spin = new THREE.Group(); group.add(spin);
  const half = W / 2;
  // opona: barek, bok z wybrzuszeniem, stopka; profil (promień, x) wokół osi
  const prof = [[rim + 0.004, -half * 0.86], [rim + 0.03, -half * 0.97], [R * 0.82, -half * 1.04], [R * 0.95, -half * 0.98], [R - 0.004, -half * 0.86], [R, -half * 0.6], [R, half * 0.6], [R - 0.004, half * 0.86], [R * 0.95, half * 0.98], [R * 0.82, half * 1.04], [rim + 0.03, half * 0.97], [rim + 0.004, half * 0.86]];
  const lathe = (pts, segs = 48) => { const g = new THREE.LatheGeometry(pts.map(([r, x]) => new THREE.Vector2(r, x)), segs); g.rotateZ(-Math.PI / 2); return g; };
  // bieżnik osobno (UV wzdłuż obwodu do mapy wypukłości), boki osobno (napis)
  const tread = lathe(prof.slice(4, 8), 64); tread.attributes.uv.array.forEach((v, i, a) => { if (i % 2 === 0) a[i] = v * 6; });
  const sideA = lathe(prof.slice(0, 5), 64), sideB = lathe(prof.slice(7), 64);
  const t = new THREE.Mesh(tread, M.tyre); t.name = 'tread'; spin.add(t);
  const sa = new THREE.Mesh(sideA, M.sidewall); sa.name = 'sidewall'; spin.add(sa);
  const sb = new THREE.Mesh(sideB, M.sidewall); sb.name = 'sidewall'; spin.add(sb);
  // felga: obręcz i dysk (stal), od strony zewnętrznej kołpak z przetłoczeniami
  const rimG = lathe([[rim + 0.012, half * 0.9], [rim - 0.004, half * 0.86], [rim - 0.012, half * 0.5], [rim - 0.018, 0], [rim - 0.012, -half * 0.5], [rim - 0.004, -half * 0.86]], 40);
  const rimM = new THREE.Mesh(rimG, M.steel); rimM.name = 'rim'; spin.add(rimM);
  const disc = lathe([[0.001, 0.0], [rim * 0.5, 0.005], [rim * 0.78, 0.02], [rim - 0.018, 0.0]], 32);
  const dm = new THREE.Mesh(disc, M.steel); dm.name = 'rim disc'; spin.add(dm);
  if (hub === 'cap') {
    const cap = lathe([[rim + 0.004, half * 0.9], [rim - 0.012, half * 1.02], [0.12, half * 1.06], [0.09, half * 1.1], [0.07, half * 1.08], [0.05, half * 1.16], [0.02, half * 1.2], [0.001, half * 1.21]], 48);
    const cm = new THREE.Mesh(cap, M.chrome); cm.name = 'hubcap'; spin.add(cm);
  }
  // bęben hamulca za felgą (nie obraca się z kołem w skręcie? — obraca się z kołem)
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.07, 28), M.under); drum.rotation.z = Math.PI / 2; drum.position.x = -0.045; drum.name = 'brake drum'; spin.add(drum);
  if (side < 0) { /* lustrzane odbicie dla prawej strony: kołpak na zewnątrz */ spin.scale.x = -1; }
  return { group, spin, R };
}

// profil przesuwany po ścieżce w płaszczyźnie XZ (zderzaki, listwy): path [[x, z]...], prof [[na zewnątrz, y]...] (zamknięty)
// na zewnątrz = w prawo od kierunku ścieżki (ścieżkę prowadzić tak, by prawa strona była na zewnątrz auta)
export function sweepFlat(path, prof, { caps = true } = {}) {
  const P = prof.length, pos = [], idx = [];
  const nrm = path.map((p, i) => { const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)]; const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1; return [tz / l, -tx / l]; });
  path.forEach((p, i) => prof.forEach(([o, y]) => pos.push(p[0] + nrm[i][0] * o, y, p[1] + nrm[i][1] * o)));
  for (let i = 0; i < path.length - 1; i++) for (let j = 0; j < P; j++) { const j1 = (j + 1) % P, a = i * P + j, b = (i + 1) * P + j, c = (i + 1) * P + j1, d = i * P + j1; idx.push(a, b, c, a, c, d); }
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx.slice()); fixOutward(g);
  const ix = Array.from(g.index.array);
  if (caps) {
    const base = pos.length / 3;
    for (const [i, dir] of [[0, -1], [path.length - 1, 1]]) {
      let cx = 0, cy = 0, cz = 0; for (let j = 0; j < P; j++) { cx += pos[(i * P + j) * 3]; cy += pos[(i * P + j) * 3 + 1]; cz += pos[(i * P + j) * 3 + 2]; } pos.push(cx / P, cy / P, cz / P);
      const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)], tx = (b[0] - a[0]) * dir, tz = (b[1] - a[1]) * dir;
      const c = pos.length / 3 - 1;
      for (let j = 0; j < P; j++) {
        const j1 = (j + 1) % P, A = (i * P + j) * 3, B = (i * P + j1) * 3, C = c * 3;
        const ux = pos[A] - pos[C], uy = pos[A + 1] - pos[C + 1], uz = pos[A + 2] - pos[C + 2], vx = pos[B] - pos[C], vy = pos[B + 1] - pos[C + 1], vz = pos[B + 2] - pos[C + 2];
        const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx;
        if (nx * tx + nz * tz >= 0) ix.push(c, i * P + j, i * P + j1); else ix.push(c, i * P + j1, i * P + j);
      }
    }
    void base;
  }
  g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(ix); g.computeVertexNormals(); g.userData.closed = true;
  return g;
}
// odwraca trójkąty zamkniętej bryły zbudowanej na lewą stronę (ujemna objętość)
export function fixOutward(g) {
  const p = g.attributes.position, ix = g.index.array; let vol = 0;
  for (let i = 0; i < ix.length; i += 3) { const a = ix[i] * 3, b = ix[i + 1] * 3, c = ix[i + 2] * 3, A = p.array, ax = A[a], ay = A[a + 1], az = A[a + 2], bx = A[b], by = A[b + 1], bz = A[b + 2], cx = A[c], cy = A[c + 1], cz = A[c + 2]; vol += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx); }
  if (vol < 0) { const arr = Array.from(ix); for (let i = 0; i < arr.length; i += 3) { const t = arr[i + 1]; arr[i + 1] = arr[i + 2]; arr[i + 2] = t; } g.setIndex(arr); g.computeVertexNormals(); }
  g.userData.closed = true; return g;
}
// płaski wielokąt (punkty Vector3 w jednej płaszczyźnie) jako wachlarz; normal: kierunek, w który ma patrzeć
export function capFan(pts, normal) {
  const c = new THREE.Vector3(); pts.forEach((p) => c.add(p)); c.multiplyScalar(1 / pts.length);
  const pos = [c.x, c.y, c.z]; pts.forEach((p) => pos.push(p.x, p.y, p.z)); const idx = [];
  for (let i = 0; i < pts.length; i++) idx.push(0, 1 + i, 1 + (i + 1) % pts.length);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const n = g.attributes.normal; if (n.getX(0) * normal.x + n.getY(0) * normal.y + n.getZ(0) * normal.z < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}

// profil boczny [[z, y]...] wyciągnięty w poprzek auta od x0 do x1 (pancerz, burty, nadwozie skrzynkowe)
export function sideExtrude(profile, x0, x1, bevel = 0) {
  const sh = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const w = x1 - x0, g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, w - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
  g.rotateY(-Math.PI / 2); g.translate(x1 - bevel, 0, 0); g.computeVertexNormals(); g.userData.closed = true; return g;
}
// graniastosłup: dolny i górny wielokąt [[x, z]...] (ta sama liczba punktów, wypukłe), wysokości y0, y1
export function prism(bot, top, y0, y1) {
  const n = bot.length, pos = [], idx = [];
  bot.forEach(([x, z]) => pos.push(x, y0, z)); top.forEach(([x, z]) => pos.push(x, y1, z));
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; idx.push(i, j, n + j, i, n + j, n + i); }
  for (let i = 1; i < n - 1; i++) { idx.push(0, i + 1, i); idx.push(n, n + i, n + i + 1); }
  // ściany osobno (ostre krawędzie): rozwinięcie na trójkąty bez wspólnych wierzchołków
  const g0 = new THREE.BufferGeometry(); g0.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g0.setIndex(idx); fixOutward(g0);
  const g = g0.toNonIndexed(); g.computeVertexNormals(); g.userData.closed = true; return g;
}
