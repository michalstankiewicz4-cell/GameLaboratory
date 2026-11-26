// StreetKit — tunele (buildTunnel) i otwarta rampa w korycie (buildTrough).
import * as THREE from '../../../vendor/three/three.module.js';
import { canvasTex, capEnd, geo, inst, kitMat, mesh, sample, stations, sweep, wall } from './geom.js';
import { PROFILES, surface } from './surfaces.js';

/* ---------------- tunele ---------------- */
// Tunel drogowy po linii trasy (od portalu do portalu): obudowa łukowa (ściany pionowe i sklepienie półkoliste,
// beton), jasne okładziny ścian do 3 m, oprawy oświetleniowe w dwóch rzędach pod sklepieniem, a na obu końcach
// portal — betonowa ściana czołowa z otworem w kształcie przekroju, jej korona idzie za terenem `ground(x, z)`.
// Rodzaj `box` — tunel prostokątny dwukierunkowy (jak płytkie tunele miejskie): strop płaski 5,2 m, dwie nawy,
// pośrodku na wysepce rząd słupów 0,8 × 0,8 m co 6 m; w portalu dwa otwory rozdzielone filarem.
//   TUNNEL_PROFILE      przekrój drogi w tunelu łukowym: dwa pasy 3,5 m, opaski 0,5 m, chodniki służbowe 1 m
//   TUNNEL_BOX_PROFILE  przekrój w tunelu z podporami: 2 × 2 pasy 3,5 m, wysepka 1,2 m pośrodku
//   buildTunnel(points, profile, { type, ground, wall, lights }) → { group, length, half, top, arch }
//     half — połowa szerokości w świetle, top — wysokość sklepienia, arch — przekrój [[dn, dy], …] (do wycięcia terenu)
export const TUNNEL_PROFILE = { label: 'Droga w tunelu', lanes: 2, laneW: 3.5, road: 'asphalt', marks: { center: 'solid', edge: true },
  strips: [{ k: 'shoulder', w: 0.5, h: 0, s: 'asphalt' }, { k: 'curb', w: 0.15, h: 0.2 }, { k: 'sidewalk', w: 1.0, h: 0.2, s: 'concrete' }] };
export const TUNNEL_BOX_PROFILE = { label: 'Droga w tunelu z podporami', lanes: 4, laneW: 3.5, road: 'asphalt', median: 1.2, medianS: 'concrete', marks: { center: 'dashed', edge: true },
  strips: [{ k: 'shoulder', w: 0.5, h: 0, s: 'asphalt' }, { k: 'curb', w: 0.15, h: 0.2 }, { k: 'sidewalk', w: 1.0, h: 0.2, s: 'concrete' }] };
export function tunnelArch(half, wall = 2.6, seg = 24) {
  const A = [[half, 0], [half, wall]];
  for (let k = 1; k < seg; k++) { const a = k / seg * Math.PI; A.push([half * Math.cos(a), wall + half * Math.sin(a)]); }
  A.push([-half, wall], [-half, 0]);
  return A;
}
export function buildTunnel(points, profile = TUNNEL_PROFILE, { type = 'arch', ground = null, wall = 2.6, lights = true } = {}) {
  const pr = typeof profile === 'string' ? PROFILES[profile] : profile, S = sample(points, 0.5), g = new THREE.Group(); g.name = 'tunel';
  const box = type === 'box', med = pr.median || 0, BH = 5.2;
  const half = pr.lanes * pr.laneW / 2 + med / 2 + pr.strips.reduce((a, x) => a + x.w, 0);
  const arch = box ? [[half, 0], [half, BH], [-half, BH], [-half, 0]] : tunnelArch(half, wall), top = box ? BH : wall + half;
  // obudowa (od środka) i okładziny ścian
  const lin = kitMat('lining', () => { const m = surface('concrete').clone(); m.side = THREE.DoubleSide; return m; });
  g.add(mesh(sweep(S, arch, 0, 0, 1, 3), lin));
  const clad = kitMat('cladding', () => new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#d9dcd8'; c.fillRect(0, 0, w, h); c.fillStyle = '#9aa09c'; c.fillRect(0, 0, w, 2); c.fillRect(0, 0, 2, h); }), roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  for (const sd of [-1, 1]) g.add(mesh(sweep(S, [[half - 0.01, 0.2], [half - 0.01, 3.0]], 0, 0, sd, 1.2), clad, false));
  // oprawy: dwa rzędy co 8 m pod sklepieniem (świecą zawsze)
  // podpory pośrodku (na wysepce, co 6 m)
  if (box) g.add(inst(new THREE.BoxGeometry(0.8, BH - 0.14, 0.8).translate(0, (BH - 0.14) / 2 + 0.14, 0), lin, stations(S, 0, 6, 3)));
  if (lights && box) {
    const lamp = kitMat('tunnelLamp', () => new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xfff1d6, emissiveIntensity: 2.2, roughness: 0.4 }));
    for (const sd of [-1, 1]) g.add(inst(new THREE.BoxGeometry(1.4, 0.1, 0.3), lamp, stations(S, sd * (med / 2 + pr.laneW), 8, 4, BH - 0.06), false));
  } else if (lights) {
    const lamp = kitMat('tunnelLamp', () => new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xfff1d6, emissiveIntensity: 2.2, roughness: 0.4 }));
    const a = 0.62 * Math.PI / 2;   // kąt na sklepieniu
    for (const sd of [-1, 1]) g.add(inst(new THREE.BoxGeometry(1.4, 0.1, 0.3), lamp, stations(S, sd * half * Math.cos(a) * 0.98, 8, 4, wall + half * Math.sin(a) * 0.98), false));
  }
  // portale: ściana czołowa z otworem przekroju, korona nad terenem (co najmniej 1,5 m nad sklepieniem)
  const con = surface('concrete'), D = 1.2, W = half + 14;
  for (const end of [0, 1]) {
    const q = S.pts[end ? S.pts.length - 1 : 0], dir = end ? 1 : -1;   // na zewnątrz tunelu
    const xs = -dir;   // oś x kształtu: ±normalna tak, żeby układ (x, y, na zewnątrz) był prawoskrętny (bryła nie na lewą stronę)
    const outer = [];
    for (let u = -W; u <= W + 1e-6; u += 1) {
      const x = q.p.x + q.nx * u * xs, z = q.p.z + q.nz * u * xs, gy = ground ? ground(x, z) : 0;
      const near = Math.abs(u) <= half + 1; outer.push(new THREE.Vector2(u, Math.max(near ? top + 1.5 : 0.3, gy - q.p.y + (near ? 0.4 : -0.02))));   // gy — wysokość bezwzględna
    }
    const sh = new THREE.Shape([new THREE.Vector2(-W, -0.5), new THREE.Vector2(W, -0.5), ...outer.reverse()]);
    // otwór: przekrój tunelu; w tunelu z podporami dwa otwory i filar 1,2 m pośrodku
    // otwór o 3 cm większy od przekroju — lico obudowy nie leży w płaszczyźnie ościeży portalu
    const e = 0.03, rect = (a, b) => new THREE.Path([new THREE.Vector2(a, -0.5), new THREE.Vector2(a, BH + e), new THREE.Vector2(b, BH + e), new THREE.Vector2(b, -0.5)]);
    if (box) sh.holes.push(rect(-half - e, -0.6 + e), rect(0.6 - e, half + e)); else sh.holes.push(new THREE.Path(tunnelArch(half + e, wall).map(([dn, dy]) => new THREE.Vector2(dn, dy === 0 ? -0.5 : dy))));
    const eg = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false });
    // lokalnie: x — w lewo od osi (normalna), y — w górę, z — wzdłuż trasy na zewnątrz
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(q.nx * xs, 0, q.nz * xs), new THREE.Vector3(0, 1, 0), new THREE.Vector3(q.t.x * dir, 0, q.t.z * dir).normalize());
    m.setPosition(q.p.x - q.t.x * dir * (D - 0.3), q.p.y, q.p.z - q.t.z * dir * (D - 0.3)); eg.applyMatrix4(m);
    const pw = mesh(eg, con); g.add(pw);
  }
  return { group: g, length: S.L, half, top, arch };
}
/* ---------------- zjazd pod ziemię (rampa w korycie) ---------------- */
// Otwarta rampa: trasa z wysokością ([x, z, y], y < 0 — pod terenem) między murami oporowymi od jezdni do terenu
// (`ground`, bezwzględnie) z attyką `parapet` m ponad teren; tam, gdzie jezdnia jest na poziomie terenu, zostaje sama
// attyka. Mur 0,3 m, lico wewnętrzne od strony jezdni. Odcinek pod ziemią — buildTunnel z tymi samymi punktami.
//   buildTrough(points3, profile, { ground, parapet }) → { group, length, half }
export function buildTrough(points, profile = TUNNEL_BOX_PROFILE, { ground = 0, parapet = 1.0 } = {}) {
  const pr = typeof profile === 'string' ? PROFILES[profile] : profile, S = sample(points, 0.5), g = new THREE.Group(); g.name = 'rampa';
  const half = pr.lanes * pr.laneW / 2 + (pr.median || 0) / 2 + pr.strips.reduce((a, x) => a + x.w, 0), T = 0.3, con = surface('concrete');
  for (const sd of [-1, 1]) {
    for (const [o, dir, bottom] of [[sd * half, -sd, null], [sd * (half + T), sd, ground]]) {
      const P = [], N = [], U = [], I = [];
      S.pts.forEach((q, i) => {
        const y0 = bottom == null ? q.p.y - 0.05 : Math.min(bottom, q.p.y - 0.05), y1 = ground + parapet;
        for (const y of [y0, y1]) { P.push(q.p.x + q.nx * o, y, q.p.z + q.nz * o); N.push(q.nx * dir, 0, q.nz * dir); U.push(q.s / 3, y / 3); }
        if (i) { const k = i * 2; if (dir > 0) I.push(k - 2, k, k - 1, k - 1, k, k + 1); else I.push(k - 2, k - 1, k, k - 1, k + 1, k); }
      });
      g.add(mesh(geo(P, N, U, I), con));
    }
    // stopa muru (spód, lico w dół — kolejność odwrotna niż w koronie)
    { const P = [], N = [], U = [], I = [];
      S.pts.forEach((q, i) => { for (const o of [sd * half, sd * (half + T)]) { P.push(q.p.x + q.nx * o, q.p.y - 0.05, q.p.z + q.nz * o); N.push(0, -1, 0); U.push(o, q.s / 3); } if (i) { const k = i * 2; if (sd > 0) I.push(k - 2, k, k - 1, k - 1, k, k + 1); else I.push(k - 2, k - 1, k, k - 1, k + 1, k); } });
      g.add(mesh(geo(P, N, U, I), con)); }
    // korona muru
    const P = [], N = [], U = [], I = [];
    S.pts.forEach((q, i) => { for (const o of [sd * half, sd * (half + T)]) { P.push(q.p.x + q.nx * o, ground + parapet, q.p.z + q.nz * o); N.push(0, 1, 0); U.push(o, q.s / 3); } if (i) { const k = i * 2; if (sd > 0) I.push(k - 2, k - 1, k, k - 1, k + 1, k); else I.push(k - 2, k, k - 1, k - 1, k, k + 1); } });
    g.add(mesh(geo(P, N, U, I), con));
  }
  // końce murów zaślepione (od strony portalu i przy wjeździe)
  for (const sd of [-1, 1]) for (const end of [0, 1]) {
    const q = S.pts[end ? S.pts.length - 1 : 0];
    g.add(capEnd(S, end, Math.min(sd * half, sd * (half + T)), Math.max(sd * half, sd * (half + T)), Math.min(ground, q.p.y) - q.p.y - 0.05, ground + parapet - q.p.y, con));
  }
  g.userData.doctorOk = 'floating';   // dwa mury bez jezdni między nimi — tak ma być
  return { group: g, length: S.L, half: half + T };
}
