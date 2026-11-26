// StreetKit — wiadukty (buildViaduct).
import * as THREE from '../../../vendor/three/three.module.js';
import { geo, mesh, ribbon, sample, slope, wall } from './geom.js';
import { steel } from './signals.js';
import { buildStreet } from './street.js';
import { PROFILES, SURFACES, surface } from './surfaces.js';

/* ---------------- wiadukty ---------------- */
// Wiadukt: trasa z wysokością ([x, z, y]) na pomoście — płyta pomostu (spód i boki z betonu), bariery betonowe
// z poręczą stalową po obu stronach, a pod spodem: nasyp ze skarpami (tam, gdzie pomost jest nisko) albo filary
// z oczepem (dwa słupy Ø 1,2 m i belka pod pomostem) co `pierEvery` m tam, gdzie jest wysoko. avoid(x, z) — gdzie nie
// stawiać filarów (np. jezdnia pod wiaduktem).
//   VIADUCT_PROFILE   przekrój pomostu: dwa pasy 3,5 m, krawężnik, wąski chodnik
//   buildViaduct(points3, profile, { pierEvery, deck, fillBelow, avoid, rail }) → { group, length, width, barrierTop, barrierAt }
//   rail: false — bez poręczy (np. gdy na barierze stoi ekran); barrierTop — wysokość korony bariery nad trasą,
//   barrierAt — odsunięcie środka bariery od osi
export const VIADUCT_PROFILE = { label: 'Pomost wiaduktu', lanes: 2, laneW: 3.5, road: 'asphalt', marks: { center: 'solid', edge: true },
  strips: [{ k: 'curb', w: 0.15, h: 0.18 }, { k: 'sidewalk', w: 1.3, h: 0.18, s: 'slabs' }] };
const concrete = () => surface('concrete');
SURFACES.concrete = SURFACES.concrete || { label: 'Beton', kind: 'concrete', color: '#a9a69c', color2: '#8a877e', tile: 3, roughness: 0.9, metalness: 0, pores: 0.5, wear: 0.15, dirt: 0.35 };
export function buildViaduct(points, profile = VIADUCT_PROFILE, { pierEvery = 24, deck = 1.3, fillBelow = 5, avoid = null, rail = true } = {}) {
  const pr = typeof profile === 'string' ? PROFILES[profile] : profile;
  const st = buildStreet(points, pr), g = st.group, S = sample(points, 0.5);
  g.name = 'wiadukt';
  const half = st.width / 2, top = pr.strips.length ? pr.strips[pr.strips.length - 1].h : 0, B = 0.42, BH = 0.95;
  const con = concrete(), grass = surface('sod').clone(); grass.side = THREE.DoubleSide;   // skarpy (darń z ziemią) widać z obu stron
  // bariery betonowe na brzegach pomostu (wewnętrzne lico, góra, zewnętrzne lico do spodu płyty) i poręcz
  for (const sd of [-1, 1]) {
    const o0 = sd * half, o1 = sd * (half + B);
    g.add(mesh(wall(S, o0, top, top + BH, -sd, 1), con));
    g.add(mesh(ribbon(S, o0, o1, top + BH, con.userData.tile || 3), con));
    g.add(mesh(wall(S, o1, -deck, top + BH, sd, 1), con));
    if (rail) g.add(mesh(ribbon(S, sd * (half + B * 0.35), sd * (half + B * 0.65), top + BH + 0.25, 1), steel()));
    if (rail) for (let d = 0; d < S.L; d += 2) { const q = S.pts[Math.min(S.pts.length - 1, Math.round(d / 0.5))]; const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.235, 0.05), steel()); post.position.set(q.p.x + q.nx * sd * (half + B / 2), q.p.y + top + BH + 0.1175, q.p.z + q.nz * sd * (half + B / 2)); g.add(post); }
  }
  // spód płyty pomostu
  g.add(mesh(slope(S, half + B, -deck, -(half + B), -deck, 3), con));   // lico w dół (widać spod wiaduktu)
  // pod spodem: nasyp (nisko) albo filary (wysoko); przejście — ściana przyczółka
  const fill = S.pts.map((q) => q.p.y < fillBelow);
  let run = [];
  const flush = () => {
    if (run.length > 1) {
      // skarpa: od brzegu pomostu do gruntu, odsunięcie z wysokością (nachylenie 1 : 1,5) — liczone na każdą próbkę
      for (const sd of [-1, 1]) {
        const P = [], N = [], U = [], I = [];
        run.forEach((q, i) => {
          const h = Math.max(0, q.p.y - deck), a = sd * (half + B), b = sd * (half + B + h * 1.5 + 0.3);
          P.push(q.p.x + q.nx * a, q.p.y - deck, q.p.z + q.nz * a, q.p.x + q.nx * b, 0, q.p.z + q.nz * b); N.push(0, 1, 0, 0, 1, 0); U.push(0, q.s / 2, (h * 1.8) / 2, q.s / 2);
          if (i) { const k = i * 2; if (sd > 0) I.push(k - 2, k, k - 1, k - 1, k, k + 1); else I.push(k - 2, k - 1, k, k - 1, k + 1, k); }
        });
        const sg = geo(P, N, U, I); sg.computeVertexNormals(); g.add(mesh(sg, grass, false));
      }
    }
    run = [];
  };
  S.pts.forEach((q, i) => { if (fill[i] && q.p.y > deck * 0.3) run.push(q); else flush(); });
  flush();
  // ściany przyczółków tam, gdzie nasyp przechodzi w filary
  for (let i = 1; i < S.pts.length; i++) if (fill[i] !== fill[i - 1]) {
    const q = S.pts[i], h = Math.max(0.1, q.p.y - deck), w = 2 * (half + B) + h * 3;
    const ab = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.8), con); ab.position.set(q.p.x, h / 2, q.p.z); ab.rotation.y = Math.atan2(q.t.x, q.t.z); ab.castShadow = ab.receiveShadow = true; g.add(ab);
  }
  // filary z oczepem
  for (let d = pierEvery / 2; d < S.L; d += pierEvery) {
    const q = S.pts[Math.min(S.pts.length - 1, Math.round(d / 0.5))]; if (q.p.y < fillBelow) continue;
    if (avoid && avoid(q.p.x, q.p.z)) continue;
    const h = q.p.y - deck, rot = Math.atan2(q.t.x, q.t.z), off = half - 1.4;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2 * half, 1.0, 1.6), con); cap.position.set(q.p.x, h - 0.5, q.p.z); cap.rotation.y = rot; cap.castShadow = cap.receiveShadow = true; g.add(cap);
    for (const sd of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, h - 1, 20), con); c.position.set(q.p.x + q.nx * sd * off, (h - 1) / 2, q.p.z + q.nz * sd * off); c.castShadow = c.receiveShadow = true; g.add(c); }
  }
  return { group: g, length: S.L, width: 2 * (half + B), barrierTop: top + BH, barrierAt: half + B / 2 };
}
