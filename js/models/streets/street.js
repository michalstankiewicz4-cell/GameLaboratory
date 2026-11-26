// StreetKit — ulica po linii (buildStreet), skrzyżowanie (buildCrossing) i miejsca wzdłuż trasy (alongStreet).
import * as THREE from '../../../vendor/three/three.module.js';
import { geo, line, mesh, ribbon, sample, wall } from './geom.js';
import { PROFILES, paint, surface } from './surfaces.js';

/** Ulica po linii: jezdnia, oznakowanie, krawężniki, chodniki, zieleń — po obu stronach. */
export function buildStreet(points, profile = PROFILES.city, { closed = false, marks = true } = {}) {
  const pr = typeof profile === 'string' ? PROFILES[profile] : profile, S = sample(points, 0.5, closed), g = new THREE.Group();
  const med = pr.median || 0, half = pr.lanes * pr.laneW / 2 + med / 2;
  g.name = 'ulica: ' + pr.label;
  const road = pr.noRoad ? null : surface(pr.road);
  if (pr.noRoad) { /* sam chodnik (bok skrzyżowania T) */ } else if (med) {
    // dwie jezdnie i pas dzielący (trawnik z krawężnikami)
    for (const sd of [-1, 1]) g.add(mesh(ribbon(S, sd * med / 2, sd * half, 0, road.userData.tile), road, false));
    g.add(mesh(ribbon(S, -med / 2 + 0.15, med / 2 - 0.15, 0.14, 2), surface(pr.medianS || 'grass'), false));
    for (const sd of [-1, 1]) { const o = sd * (med / 2 - 0.075); g.add(mesh(ribbon(S, o - 0.075, o + 0.075, 0.14, 1), surface('curb'))); g.add(mesh(wall(S, sd * med / 2, 0, 0.14, sd, 1), surface('curb'))); g.add(mesh(wall(S, sd * (med / 2 - 0.15), 0.1, 0.14, -sd, 1), surface('curb'))); }
  } else g.add(mesh(ribbon(S, -half, half, 0, road.userData.tile), road, false));
  if (marks && pr.marks) {
    const lines = [];
    if (pr.marks.center && !med && pr.lanes > 1) lines.push(...line(S, 0, 0.12, pr.marks.center));
    if (pr.marks.center && med) for (const sd of [-1, 1]) for (let l = 1; l < pr.lanes / 2; l++) lines.push(...line(S, sd * (med / 2 + l * pr.laneW), 0.12, pr.marks.center));
    if (pr.marks.center && pr.lanes === 1) lines.push(...line(S, 0, 0.1, pr.marks.center));
    if (pr.marks.edge) for (const sd of [-1, 1]) lines.push(...line(S, sd * (half - 0.3), 0.12, 'solid'));
    for (const l of lines) g.add(mesh(l, paint, false));
  }
  // pasy za jezdnią po obu stronach
  for (const sd of pr.side ? [pr.side] : [-1, 1]) {
    let o = half, yPrev = 0;
    for (const st of pr.strips) {
      const a = sd * o, b = sd * (o + st.w), m = st.k === 'curb' ? surface('curb') : surface(st.s);
      g.add(mesh(ribbon(S, a, b, st.h, m.userData.tile || 1), m, st.k === 'curb' || st.k === 'edge'));
      if (Math.abs(st.h - yPrev) > 0.005) g.add(mesh(wall(S, a, Math.min(st.h, yPrev) - 0.03, Math.max(st.h, yPrev), st.h > yPrev ? -sd : sd, 1), m.userData.tile ? m : surface('curb')));
      yPrev = st.h; o += st.w;
    }
    // zewnętrzny brzeg ostatniego pasa w dół do gruntu
    if (yPrev > 0.005) g.add(mesh(wall(S, sd * o, -0.03, yPrev, sd, 1), surface('curb')));
  }
  return { group: g, length: S.L, width: 2 * (half + pr.strips.reduce((s, x) => s + x.w, 0)) };
}

// wycinek pierścienia w płaszczyźnie xz (środek cx, cz; promienie r0…r1; kąty a0→a1, kąt = atan2(z, x)) na wysokości y
function ringXZ(cx, cz, r0, r1, a0, a1, y, tile, seg = 20) {
  const P = [], N = [], U = [], I = [];
  for (let i = 0; i <= seg; i++) {
    const t = a0 + (a1 - a0) * i / seg;
    for (const r of [r0, r1]) { const x = cx + Math.cos(t) * r, z = cz + Math.sin(t) * r; P.push(x, y, z); N.push(0, 1, 0); U.push(x / tile, z / tile); }
    if (i) { const k = i * 2; if (a1 > a0) I.push(k - 2, k, k - 1, k - 1, k, k + 1); else I.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  return geo(P, N, U, I);
}
// pionowa ściana po łuku (lico krawężnika), normalna na zewnątrz łuku (out = +1) albo do środka (−1)
function arcWall(cx, cz, r, a0, a1, y0, y1, out, seg = 20) {
  const P = [], N = [], U = [], I = [];
  for (let i = 0; i <= seg; i++) {
    const t = a0 + (a1 - a0) * i / seg, c = Math.cos(t), sn = Math.sin(t);
    for (const y of [y0, y1]) { P.push(cx + c * r, y, cz + sn * r); N.push(c * out, 0, sn * out); U.push(t * r, y); }
    if (i) { const k = i * 2; const flip = (a1 > a0) !== (out > 0); if (flip) I.push(k - 2, k, k - 1, k - 1, k, k + 1); else I.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  return geo(P, N, U, I);
}

/** Skrzyżowanie: 3 albo 4 wloty ulic o tym samym przekroju, łuki krawężników i chodników na narożach, przejścia
 *  dla pieszych (zebra) i linie zatrzymania. arm — długość wlotu, corner — promień łuku krawężnika. */
export function buildCrossing(profile = PROFILES.city, { arms = 4, arm = 30, corner = 6 } = {}) {
  const pr = typeof profile === 'string' ? PROFILES[profile] : profile, g = new THREE.Group(); g.name = 'skrzyżowanie';
  const half = pr.lanes * pr.laneW / 2 + (pr.median || 0) / 2, R0 = half + corner;
  const ALL = [[1, 0], [0, 1], [-1, 0], [0, -1]], has = (i) => i % 4 < arms;
  // wloty: zwykłe ulice od brzegu skrzyżowania na zewnątrz, z przejściem dla pieszych i linią zatrzymania
  for (let i = 0; i < arms; i++) {
    const [dx, dz] = ALL[i], nx = -dz, nz = dx;
    g.add(buildStreet([[dx * R0, dz * R0], [dx * (R0 + arm), dz * (R0 + arm)]], pr).group);
    const zw = 4, z0 = R0 + 0.6, rot = Math.atan2(dx, dz);
    for (let o = -half + 0.5; o <= half - 0.4; o += 1) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(0.5, zw).rotateX(-Math.PI / 2), paint);
      r.position.set(dx * (z0 + zw / 2) + nx * o, 0.005, dz * (z0 + zw / 2) + nz * o); r.rotation.y = rot; r.receiveShadow = true; g.add(r);
    }
    // linia zatrzymania na pasie wjazdowym (ruch prawostronny: wjazd po prawej stronie wlotu, patrząc do środka)
    const stop = new THREE.Mesh(new THREE.PlaneGeometry(half - 0.3, 0.5).rotateX(-Math.PI / 2), paint);
    stop.position.set(dx * (z0 + zw + 1.2) + nx * (half / 2), 0.005, dz * (z0 + zw + 1.2) + nz * (half / 2)); stop.rotation.y = rot; stop.receiveShadow = true; g.add(stop);
  }
  // środek: kwadrat jezdni do początku wlotów (naroża przykryte chodnikiem)
  const road = surface(pr.road), sq = new THREE.PlaneGeometry(2 * R0, 2 * R0).rotateX(-Math.PI / 2);
  { const uv = sq.attributes.uv, p = sq.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / road.userData.tile, p.getZ(i) / road.userData.tile); }
  g.add(mesh(sq, road, false));
  for (let i = 0; i < 4; i++) {
    const a = ALL[i], b = ALL[(i + 1) % 4], sx = a[0] + b[0], sz = a[1] + b[1], cx = sx * R0, cz = sz * R0;
    if (has(i) && has(i + 1)) {
      // naroże między dwoma wlotami: pasy przekroju po łuku wokół (cx, cz), od krawężnika (r = corner) do środka
      const a0 = Math.atan2(0, -sx), a1 = Math.atan2(-sz, 0);
      let A0 = a0, A1 = a1; if (Math.abs(A1 - A0) > Math.PI) { if (A1 < A0) A1 += 2 * Math.PI; else A0 += 2 * Math.PI; }
      let r = corner, yPrev = 0;
      for (const st of pr.strips) {
        const m = st.k === 'curb' ? surface('curb') : surface(st.s), ri = Math.max(0, r - st.w);
        g.add(mesh(ringXZ(cx, cz, ri, r, A0, A1, st.h, m.userData.tile || 1), m, st.k === 'curb'));
        if (Math.abs(st.h - yPrev) > 0.005) g.add(mesh(arcWall(cx, cz, r, A0, A1, Math.min(st.h, yPrev) - 0.03, Math.max(st.h, yPrev), st.h > yPrev ? 1 : -1), surface('curb')));
        yPrev = st.h; r = ri; if (r <= 0) break;
      }
      const last = pr.strips[pr.strips.length - 1];
      if (r > 0) g.add(mesh(ringXZ(cx, cz, 0, r, A0, A1, last.h, 2), surface(last.s || 'grass'), false));
      // brzegi naroża od strony kwartału (proste od środka łuku): ściany do gruntu — pod chodnikiem nie ma pustki na wylot
      const yTop = Math.max(...pr.strips.map((x) => x.h));
      if (yTop > 0.005) for (const [ang, sgn] of [[A0, 1], [A1, -1]]) {
        const ex = Math.cos(ang) * corner, ez = Math.sin(ang) * corner, nx = Math.sin(ang) * sgn, nz = -Math.cos(ang) * sgn;   // na zewnątrz naroża
        const P = [cx, -0.03, cz, cx + ex, -0.03, cz + ez, cx + ex, yTop, cz + ez, cx, yTop, cz], N = [nx, 0, nz, nx, 0, nz, nx, 0, nz, nx, 0, nz];
        const a3 = new THREE.Vector3(P[3] - P[0], 0, P[5] - P[2]), b3 = new THREE.Vector3(P[9] - P[0], P[10] - P[1], P[11] - P[2]), cr = a3.cross(b3);
        const I = cr.x * nx + cr.z * nz > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
        g.add(mesh(geo(P, N, [0, 0, corner / 2, 0, corner / 2, yTop / 2, 0, yTop / 2], I), surface(last.s || 'grass')));   // brzeg ostatniego pasa (np. trawnika)
      }
    } else if (has(i) !== has(i + 1)) {
      // bok bez wlotu (skrzyżowanie T): prosty chodnik wzdłuż brzegu skrzyżowania
      const e = has(i) ? b : a, n = [-e[0], -e[1]], t = [e[1], -e[0]];
      const p0 = [e[0] * half + t[0] * R0, e[1] * half + t[1] * R0], p1 = [e[0] * half - t[0] * R0, e[1] * half - t[1] * R0];
      if (has(i)) g.add(buildStreet([p1, p0], { ...pr, lanes: 0, laneW: 0, marks: null, noRoad: true, side: 1 }).group);
    }
  }
  return { group: g, size: 2 * (R0 + arm) };
}


// punkty co `every` m wzdłuż linii, odsunięte o `offset` m w lewo (ujemne — w prawo), z kątem obrotu do osi trasy
// (przód obiektu +z patrzy na oś) → [{ x, z, rot }]
export function alongStreet(points, every = 30, offset = 8, start = every / 2) {
  const S = sample(points, 0.5), out = [];
  for (let d = start; d < S.L; d += every) {
    const q = S.pts.reduce((b, p) => (Math.abs(p.s - d) < Math.abs(b.s - d) ? p : b), S.pts[0]);
    const x = q.p.x + q.nx * offset, z = q.p.z + q.nz * offset;
    out.push({ x, z, rot: Math.atan2(-q.nx * Math.sign(offset), -q.nz * Math.sign(offset)) });
  }
  return out;
}
