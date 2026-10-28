// ORP Orzeł (Orzeł-class submarine, De Schelde, Vlissingen; commissioned 2 February 1939), as delivered in 1939:
// double hull 84 × 6.70 × 4.17 m, streamlined conning tower with an open bridge and a periscope standard, 105 mm/41
// Bofors deck gun in a shielded mount forward of the tower, twin 40 mm/56 Bofors that retracts into a watertight well
// in the after part of the tower, 12 × 550 mm torpedo tubes (4 bow, 4 stern inside the pressure hull, two trainable
// twin mounts between the hulls fore and aft of the tower), net cutter and jumping wires, "85A" on the tower.
// Real dimensions in metres (1 unit = 1 m). Sources and the reconstruction notes: docs/ships/orzel.md.
// pose({ periscopes, search, mast, aa, planes }) (0…1 each) raises the periscopes and the radio mast, the 40 mm
// mount out of its well, and rigs out the bow hydroplanes.
import * as THREE from '../../../../vendor/three/three.module.js';
import { Part, plan } from '../geom.js';
import { loftHull, deckSurface, sideAt } from '../hull.js';
import { shipMaterials } from '../materials.js';
import * as P from '../parts.js';

export const info = {
  id: 'orzel',
  name: 'ORP Orzeł',
  year: '1939 (as delivered)',
  type: 'Submarine, Orzeł class (ocean-going, double hull)',
  builder: 'N.V. Koninklijke Maatschappij De Schelde, Vlissingen (yard no. 205); laid down 14 Aug 1936, launched 15 Jan 1938, commissioned 2 Feb 1939',
  specs: [
    ['Length overall', '84.00 m'], ['Beam', '6.70 m'], ['Draught', '4.17 m (fully equipped)'],
    ['Displacement', '1,110 t surfaced · 1,473 t submerged'],
    ['Machinery', '2 Sulzer 6QD42 diesels, 4,740 hp · 2 Brown Boveri electric motors, 2 × 550 hp · 2 batteries of 100 cells · 2 shafts'],
    ['Speed', '19.4 kn surfaced (20 kn contract) · 9 kn submerged'],
    ['Range', '7,000 nm at 10 kn surfaced · 100 nm at 5 kn submerged (20 h)'],
    ['Diving depth', '80 m contract, 100 m maximum · dive in about 50 s · periscope depth 10–12 m'],
    ['Crew', '60 (6 officers, 54 petty officers and ratings); 63 in wartime'],
    ['Torpedoes', '12 × 550 mm (533 mm liners): 4 bow, 4 stern, 2 trainable twin mounts between the hulls fore and aft of the tower; 20 torpedoes'],
    ['Guns', '1 × 105 mm/41 Bofors (125 rounds) forward of the tower · 1 × 2 40 mm/56 Bofors wz.36, retractable into a watertight well in the tower (1,200 rounds)'],
    ['Pressure hull', '14 mm plating (16 mm at the tower), frames outside — 160 × 65 mm channels every 550 mm; welded tower'],
    ['Markings', 'tactical number 85A in large figures on the tower; bronze name letters on the tower'],
  ],
  sources: [
    ['Wikipedia: ORP Orzeł (1938)', 'https://en.wikipedia.org/wiki/ORP_Orze%C5%82_(1938)'],
    ['Wikipedia: Orzeł-class submarine', 'https://en.wikipedia.org/wiki/Orze%C5%82-class_submarine'],
    ['navypedia.org: ORZEŁ submarines (1939)', 'https://navypedia.org/ships/poland/pl_ss_orzel.htm'],
    ['Fundacja „Odnaleźć Orła”: technical specification and armament', 'https://santiodnalezcorla.pl/technical-specification-and-armament-orp-orzel/?lang=en'],
    ['moje-morze.pl: ORP „Orzeł” — dar i duma narodu', 'https://moje-morze.pl/orp-orzel-dar-i-duma-narodu/'],
    ['Polska Zbrojna: „Orzeł” i „Sęp” — jak powstawały', 'https://polska-zbrojna.pl/home/articleshow/21674?t=-Orzel-i-Sep-jak-powstawaly-slynne-okrety-marynarki-wojennej'],
    ['uboat.net: Orzeł class', 'https://uboat.net/allies/warships/class.html?ID=228&navy=ORP'],
  ],
};

const LOA = 84, B = 6.7 / 2, T0 = 4.17, RAISE = 2.8;             // periscope travel (m)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const zWLbow = 40.0, zWLstern = -39.6;

// ---- lines (functions of z; +z = bow, z = 0 amidships): the outer hull, ship-shaped, with a flat casing deck on top ----
export const lines = {
  zStern: zWLstern, zBow: zWLbow, breaks: [],
  hw(z) {
    if (z > 6) { const u = clamp((z - 6) / (zWLbow - 6), 0, 1); return B * Math.pow(1 - Math.pow(u, 2.0), 0.7); }
    if (z < -14) { const u = clamp((-14 - z) / (-14 - zWLstern), 0, 1); return Math.max(0.62, B * Math.pow(1 - Math.pow(u, 1.7), 0.65)); }
    return B;
  },
  hd(z) {                                                                   // casing deck half-width
    if (z > 10) { const u = clamp((z - 10) / (zWLbow - 10), 0, 1); return Math.max(0.1, 1.7 * Math.pow(1 - Math.pow(u, 1.6), 0.6)); }
    if (z < -16) { const u = clamp((-16 - z) / (-16 - zWLstern), 0, 1); return Math.max(0.3, 1.7 * Math.pow(1 - Math.pow(u, 1.5), 0.6)); }
    return 1.7;
  },
  T(z) {
    let t = T0;
    if (z > 30) t *= 1 - Math.pow(clamp((z - 30) / (zWLbow - 30), 0, 1), 2.5);       // deep forefoot, rounded into the stem
    if (z < -22) t *= 1 - 0.7 * Math.pow(clamp((-22 - z) / (-22 - zWLstern), 0, 1), 1.5);
    return t;
  },
  n(z) { return z > 24 ? 2.4 - 0.5 * clamp((z - 24) / 16, 0, 1) : z < -24 ? 2.4 - 0.4 * clamp((-24 - z) / 15, 0, 1) : 2.4; },
  deck(z) {
    if (z > 12) return 2.1 + 1.3 * Math.pow((z - 12) / 30, 2);                     // sheer rising to the bow
    if (z < -20) return 2.1 - 0.5 * Math.pow(clamp((-20 - z) / 22, 0, 1), 1.2);
    return 2.1;
  },
  flare(z) { return -0.85; },                                               // rounded shoulder from the waterline to the casing
  rake(y) { return y > 0 ? 2.0 * Math.min(1, y / 3.23) : 0; },              // raked stem: 2 m forward at the deck
  sternRake(y) { return y > 0 ? 2.4 * Math.min(1, y / 1.67) : 0; },         // overhanging stern
};
const deckY = (z) => lines.deck(z);
// half-breadth of the outer hull below the waterline at depth y (the section's superellipse)
function underX(z, y) {
  const T = lines.T(z), n = lines.n(z), hw = lines.hw(z);
  if (y >= 0) return sideAt(lines, z, y);
  if (-y >= T) return 0;
  const c = Math.pow(-y / T, n / 2), s = Math.sqrt(Math.max(0, 1 - c * c));
  return hw * Math.pow(s, 2 / n);
}

/* ---------------- conning tower shape ---------------- */
// Teardrop outline in plan: half-width W, from zA (aft) to zF (front), rounded front, tapering aft to a round tail.
function teardrop(zA, zF, W, n = 18) {
  const f = (t) => (t > 0.68 ? Math.sqrt(Math.max(0, 1 - ((t - 0.68) / 0.32) ** 2)) : 1 - 0.45 * Math.pow((0.68 - t) / 0.68, 1.6));
  const side = [];
  for (let i = 0; i <= n; i++) { const t = i / n; const tt = t > 0.68 ? 0.68 + 0.32 * Math.sin((t - 0.68) / 0.32 * Math.PI / 2) : t; side.push([W * f(tt), zA + (zF - zA) * tt]); }
  const out = side.map(([x, z]) => [x, z]);
  for (let i = side.length - 2; i >= 0; i--) out.push([-side[i][0], side[i][1]]);
  const w0 = W * f(0);
  for (let k = 1; k < 6; k++) { const a = Math.PI + (k / 6) * Math.PI; out.push([w0 * Math.cos(a), zA + Math.sin(a) * w0 * 0.7]); }
  return out;
}
// Stacked outlines (rings) at heights ys → closed side surface with a flat top cap.
function stackRings(rings, ys) {
  const pos = [], idx = [], per = rings[0].length;
  rings.forEach((r, k) => r.forEach(([x, z]) => pos.push(x, ys[k], z)));
  for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < per; i++) {
    const a = k * per + i, b = k * per + (i + 1) % per, c = a + per, d = b + per;
    idx.push(a, c, b, b, c, d);
  }
  const top = rings[rings.length - 1], base = pos.length / 3;
  top.forEach(([x, z]) => pos.push(x, ys[ys.length - 1], z));
  const tri = THREE.ShapeUtils.triangulateShape(top.map(([x, z]) => new THREE.Vector2(x, z)), []);
  for (const [a, b, c] of tri) idx.push(base + a, base + c, base + b);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(pos.map((v, i) => (i % 3 === 1 ? null : v / 3)).filter((v) => v !== null), 2));
  g.setIndex(idx);
  const ng = g.toNonIndexed(); ng.computeVertexNormals();
  // the outline may wind either way: make the normals point outwards (away from the tower's axis) / up
  const p = ng.attributes.position, nn = ng.attributes.normal;
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const isTop = Math.abs(nn.getY(i)) > 0.9 && Math.abs(cy - ys[ys.length - 1]) < 1e-3;
    const out = isTop ? nn.getY(i) : nn.getX(i) * cx + nn.getZ(i) * (cz - 1);
    if (out < 0) { for (let k = 0; k < 3; k++) nn.setXYZ(i + k, -nn.getX(i + k), -nn.getY(i + k), -nn.getZ(i + k)); const x = p.getX(i + 1), y = p.getY(i + 1), z = p.getZ(i + 1); p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)); p.setXYZ(i + 2, x, y, z); }
  }
  return ng;
}

// Tower dimensions (reconstructed): fairing from the casing to the bridge deck at 4.5 m, its front sloping forward over
// the deck to 10.6 m; open bridge with a bulwark forward; periscope standard to 7.3 m (under water at periscope depth,
// keel 12 m); 40 mm well aft.
const TW = { zA: -7.6, zTop: 8.6, zFoot: 10.6, W: 1.55, y0: 2.0, yB: 4.5, yS: 7.3, zSA: -1.2, zSF: 2.8, WS: 0.75, zAA: -4.2 };
const towerHalf = (z, y) => {
  const zF = TW.zTop + (TW.yB - y) / (TW.yB - TW.y0) * (TW.zFoot - TW.zTop), W = TW.W - 0.1 * (y - TW.y0) / (TW.yB - TW.y0);
  const t = clamp((z - TW.zA) / (zF - TW.zA), 0, 1);
  const f = t > 0.68 ? Math.sqrt(Math.max(0, 1 - ((t - 0.68) / 0.32) ** 2)) : 1 - 0.45 * Math.pow((0.68 - t) / 0.68, 1.6);
  return W * f;
};

export function build(opt = {}) {
  const d = opt.detail ?? 1;
  const mats = shipMaterials({ hull: 0x7b8287, upper: 0x80878c, deck: 0x55595d, antifouling: 0x6e2a22, boot: 0x16181a, bootTop: 0.35 });
  const root = new THREE.Group(); root.name = 'orzel';
  const parts = {}, mounts = [], add = (name, g) => { (parts[name] ||= new THREE.Group()).add(g); };

  /* ---------------- outer hull and casing deck ---------------- */
  const hull = loftHull(lines, { detail: d });
  const hullMesh = new THREE.Mesh(hull.geometry, mats.hull); hullMesh.name = 'hull';
  add('hull', hullMesh);
  const deckMesh = new THREE.Mesh(deckSurface(hull, lines, [[zWLstern, zWLbow]], 0.05), mats.deck); deckMesh.name = 'casing deck';
  add('hull', deckMesh);
  const hp = new Part('hullFittings', mats);
  // limber (free-flooding) holes along the casing sides, a row under the deck edge
  const step = d < 0.75 ? 1.8 : 0.9;
  for (let z = -30; z < 30; z += step) {
    if (Math.abs(z - 1) < 9.5) continue;                                     // the tower fairing covers the casing there
    const y = deckY(z) - 0.32;
    for (const sx of [-1, 1]) hp.box('dark', 0.03, 0.16, 0.55, [sx * (sideAt(lines, z, y) + 0.004), y, z]);
  }
  // ballast keel
  hp.box('hull', 0.34, 0.24, 52, [0, -T0 + 0.05, -1]);
  // bow tube muzzle shutters (2 × 2) and stern tube shutters (2 × 2)
  const shutter = (z, y, sx) => {
    const x = underX(z, y), slope = (lines.hw(z + 0.4) - lines.hw(z - 0.4)) / 0.8;
    hp.add('dark', new THREE.CircleGeometry(0.34, Math.max(10, Math.round(14 * d))), [sx * (x + 0.012), y, z], [0, Math.atan2(sx, -slope), 0], [1, 1.25, 1]);
  };
  for (const sx of [-1, 1]) for (const y of [-0.75, -1.85]) shutter(36.1, y, sx);
  for (const sx of [-1, 1]) for (const y of [-0.35, -0.98]) hp.add('dark', new THREE.CircleGeometry(0.27, Math.max(10, Math.round(14 * d))), [sx * 0.27, y, zWLstern - 0.012], [0, Math.PI, 0]);
  // shafts with brackets, propellers (Ø 1.7 m), rudder, stern hydroplanes
  for (const sx of [-1, 1]) {
    hp.rod('metal', [sx * 0.95, -1.6, -26], [sx * 1.25, -2.3, -35.1], 0.11, 8);
    hp.rod('metal', [sx * 1.25, -2.3, -34.0], [sx * 0.55, -1.3, -33.6], 0.06, 6);
    hp.rod('metal', [sx * 1.25, -2.3, -34.0], [sx * 0.6, -2.6, -33.4], 0.06, 6);
    P.propeller(hp, d, 1.7, [sx * 1.25, -2.3, -35.5], sx);
    hp.box('hull', 2.3, 0.12, 1.1, [sx * 1.45, -2.3, -37.7]);                // stern hydroplanes
    hp.box('metal', 0.08, 0.5, 0.08, [sx * 0.35, -2.05, -37.7]);
  }
  hp.box('hull', 0.18, 2.6, 1.6, [0, -1.7, -39.35]);                          // rudder under the overhang
  hp.rod('metal', [0, -0.3, -39.0], [0, -2.85, -39.0], 0.07, 6);
  add('hull', hp.finish());

  // bow hydroplanes: hinged at the casing side, folded up against it on the surface, rigged out to dive
  const bowPlanes = [];
  for (const sx of [-1, 1]) {
    const z = 32.8, y = 0.95, pivot = new THREE.Group();
    pivot.position.set(sx * (sideAt(lines, z, y) + 0.05), y, z); pivot.name = 'bow hydroplane';
    const pp = new Part('bowPlane', mats);
    pp.box('paint', 2.1, 0.12, 1.15, [sx * 1.05, 0, 0]);                    // above the waterline: grey, not the hull's banded paint
    pp.cyl('metal', 0.08, 0.08, 1.25, 8, [0, 0, 0], [Math.PI / 2, 0, 0]);
    pivot.add(pp.finish()); pivot.userData.side = sx; bowPlanes.push(pivot);
    add('hull', pivot);
  }

  /* ---------------- pressure hull with outside frames (inside the outer hull; lab only) ---------------- */
  if (opt.interior) {
    const ph = new Part('pressureHull', mats), yc = -1.4, R = 2.5, z0 = -20, z1 = 22;
    const g = new THREE.CylinderGeometry(R, R, z1 - z0, Math.max(16, Math.round(28 * d)), 1, true); g.rotateX(Math.PI / 2);
    ph.add('paint', g, [0, yc, (z0 + z1) / 2]);
    const cone = (za, zb, r0, r1) => { const c = new THREE.CylinderGeometry(r1, r0, Math.abs(zb - za), Math.max(16, Math.round(28 * d)), 1, false); c.rotateX(Math.PI / 2 * Math.sign(zb - za)); ph.add('paint', c, [0, yc, (za + zb) / 2]); };
    cone(z1, 29.0, R, 1.0); cone(z0, -28.0, R, 0.9);
    const fs = d < 0.75 ? 1.1 : 0.55;                                         // channels every 550 mm, outside the plating
    for (let z = z0 + 0.3; z < z1; z += fs) ph.add('metal', new THREE.CylinderGeometry(R + 0.16, R + 0.16, 0.065, Math.max(16, Math.round(28 * d)), 1, true), [0, yc, z], [Math.PI / 2, 0, 0]);
    // tower base (welded) up into the fairing, bow and stern tube nests
    ph.cyl('paint', 1.05, 1.05, 3.0, 20, [0, 1.2, 2.0]);
    for (const sx of [-0.45, 0.45]) for (const y of [-0.75, -1.85]) ph.tubeZ('metal', 0.29, 0.29, 5.6, 12, [sx, y, 33.2]);
    for (const sx of [-0.27, 0.27]) for (const y of [-0.35, -0.98]) ph.tubeZ('metal', 0.27, 0.27, 6.6, 12, [sx, y, -35.2]);
    add('pressureHull', ph.finish());
  }

  /* ---------------- conning tower ---------------- */
  const tw = new Part('tower', mats);
  const nOut = Math.max(14, Math.round(22 * d)), ys = [], rings = [];
  for (let k = 0; k <= 5; k++) {
    const y = TW.y0 + (TW.yB - TW.y0) * k / 5, zF = TW.zTop + (TW.yB - y) / (TW.yB - TW.y0) * (TW.zFoot - TW.zTop);
    ys.push(y); rings.push(teardrop(TW.zA, zF, TW.W - 0.1 * k / 5, nOut));
  }
  tw.add('paint', stackRings(rings, ys));
  // open bridge: bulwark round the forward part, binnacle, voice pipes
  const ring = rings[5];
  // the bulwark: one strip following the outline (outer edge, and the same edge 6 cm inwards), extruded 1.3 m up
  const run = ring.filter(([, z]) => z > TW.zSF - 0.2);
  const off = run.map((p, k) => {                                          // inward normal: towards the tower's centre line
    const a = run[Math.max(0, k - 1)], b = run[Math.min(run.length - 1, k + 1)], tx = b[0] - a[0], tz = b[1] - a[1], L = Math.hypot(tx, tz) || 1;
    let nx = -tz / L, nz = tx / L; if (nx * -p[0] + nz * (4 - p[1]) < 0) { nx = -nx; nz = -nz; }
    return [p[0] + nx * 0.06, p[1] + nz * 0.06];
  });
  tw.add('paint', plan([...run, ...off.reverse()], 1.31), [0, TW.yB - 0.01, 0]);
  tw.cyl('metal', 0.18, 0.24, 1.0, 10, [0, TW.yB + 0.5, 5.6]);               // binnacle
  tw.cyl('metal', 0.26, 0.26, 0.1, 12, [0, TW.yB + 1.05, 5.6]);
  for (const sx of [-0.5, 0.5]) tw.cyl('metal', 0.05, 0.05, 1.1, 6, [sx, TW.yB + 0.55, 7.1]);   // voice pipes
  // periscope standard (fairing round the periscopes and the radio mast)
  const sRings = [], sYs = [];
  for (let k = 0; k <= 2; k++) { sYs.push(TW.yB - 0.05 + (TW.yS - TW.yB + 0.05) * k / 2); sRings.push(teardrop(TW.zSA, TW.zSF, TW.WS - 0.08 * k / 2, Math.max(10, Math.round(14 * d)))); }
  tw.add('paint', stackRings(sRings, sYs));
  // AA well aft: rail round the after deck, the bell on the back of the tower
  const aftRail = ring.filter(([, z]) => z < TW.zSA - 0.3).map(([x, z]) => [x * 0.96, TW.yB + 0.012, z]);
  const sb = aftRail.filter(([x]) => x > 0).sort((a, b) => b[2] - a[2]), pt = aftRail.filter(([x]) => x < 0).sort((a, b) => a[2] - b[2]);
  P.rail(tw, [...sb, ...pt], 1.2, 0.9);
  tw.add('bronze', new THREE.CylinderGeometry(0.1, 0.17, 0.26, 12, 1), [0, 3.9, TW.zA - 0.62]);               // bronze bell, ~20 kg
  tw.box('metal', 0.05, 0.05, 0.3, [0, 4.07, TW.zA - 0.48]);
  // doors to the tower at the casing, both sides; ladder rungs up the after slope
  for (const sx of [-1, 1]) tw.box('dark', 0.04, 1.3, 0.62, [sx * (towerHalf(-1.5, 2.8) + 0.01), 2.8, -1.5]);
  add('superstructure', tw.finish());
  // lettering: tactical number 85A in white on both sides; bronze name letters further aft
  const yN = 3.55, xN = towerHalf(2.0, yN) + 0.035;
  root.add(P.lettering('85A', [xN, yN, 2.0], { w: 2.7, h: 1.15, color: '#eceae2', font: 'bold 200px Arial, sans-serif', yaw: Math.PI / 2, name: 'towerNumber' }));
  root.add(P.lettering('85A', [-xN, yN, 2.0], { w: 2.7, h: 1.15, color: '#eceae2', font: 'bold 200px Arial, sans-serif', yaw: -Math.PI / 2, name: 'towerNumber' }));
  const xL = towerHalf(-4.6, 3.95) + 0.03;
  root.add(P.lettering('ORZEŁ', [xL, 3.95, -4.6], { w: 1.9, h: 0.34, color: '#a8834a', font: 'bold 70px Georgia, serif', yaw: Math.PI / 2, name: 'towerName' }));
  root.add(P.lettering('ORZEŁ', [-xL, 3.95, -4.6], { w: 1.9, h: 0.34, color: '#a8834a', font: 'bold 70px Georgia, serif', yaw: -Math.PI / 2, name: 'towerName' }));

  /* ---------------- periscopes, radio mast, jumping wires ---------------- */
  const mast = new Part('masts', mats);
  // net cutter: a toothed bar up the stem, and the jumping wires from it over the tower to the stern post
  const stemZ = (y) => zWLbow + lines.rake(y) + 0.05;
  for (let y = 0.05; y < deckY(zWLbow) + 0.9; y += 0.45) {
    mast.add('metal', new THREE.ConeGeometry(0.06, 0.42, 4), [0, y + 0.2, stemZ(Math.max(0, y)) + 0.12], [0.9, 0, 0]);
  }
  mast.rod('metal', [0, 0.05, stemZ(0) + 0.06], [0, deckY(zWLbow) + 1.1, stemZ(deckY(zWLbow)) + 0.05], 0.05, 6);
  const bowTop = [0, deckY(zWLbow) + 1.1, stemZ(deckY(zWLbow))], sternPost = [0, 3.0, -41.4];
  mast.rod('metal', [0, deckY(-41.3), -41.3], sternPost, 0.05, 6);
  const wire = (a, b) => mast.rod('rope', a, b, 0.012, 3);
  wire(bowTop, [0, TW.yS, TW.zSF - 0.1]); wire([0, TW.yS, TW.zSA + 0.1], sternPost);
  add('masts', mast.finish());
  const raisers = {};
  const periscope = (key, z, rHead, len) => {
    const g = new THREE.Group(); g.name = key;
    const pp = new Part(key, mats);
    pp.cyl('metal', 0.14, 0.14, 5.0, 12, [0, TW.yS - 2.1, 0]);                  // tube (most of it inside the standard)
    pp.cyl('metal', rHead, 0.14, len, 12, [0, TW.yS + 0.4 + len / 2, 0]);       // head
    pp.box('glass', rHead * 1.4, 0.16, 0.04, [0, TW.yS + 0.3 + len, rHead * 0.75]);
    g.add(pp.finish()); g.position.z = z; raisers[key] = g; add('masts', g);
  };
  periscope('attack periscope', 1.95, 0.075, 0.5);
  periscope('search periscope', 0.55, 0.13, 0.6);
  {
    const g = new THREE.Group(); g.name = 'radio mast'; const pp = new Part('radio mast', mats);
    pp.cyl('metal', 0.06, 0.09, 6.0, 8, [0, TW.yS - 2.6, 0]); pp.rod('metal', [-0.5, TW.yS + 0.3, 0], [0.5, TW.yS + 0.3, 0], 0.03, 4);
    g.add(pp.finish()); g.position.z = -0.7; raisers.mast = g; add('masts', g);
  }

  /* ---------------- 105 mm deck gun forward of the tower ---------------- */
  {
    const z = 13.2, m = P.deckGun105(mats, d);
    m.part.position.set(0, deckY(z), z); m.part.name = '105 mm';
    add('mainBattery', m.part);
    mounts.push({ name: '105 mm/41 Bofors', group: m.part, train: m.train, guns: m.guns, yaw0: 0, arc: 135 });
  }

  /* ---------------- twin 40 mm in its well in the tower, on an elevator ---------------- */
  const aaLift = new THREE.Group(); aaLift.name = '40 mm elevator'; aaLift.position.set(0, TW.yB, TW.zAA);
  const aa = P.bofors40(mats, d, { tub: false, disc: 2.2 }); aa.part.name = '40 mm twin (retractable)';
  aaLift.add(aa.part);
  add('antiAircraft', aaLift);
  mounts.push({ name: '40 mm twin (retractable)', group: aa.part, train: aa.train, guns: aa.guns, yaw0: 0, arc: 150, aa: true });
  const lidPivot = new THREE.Group(); lidPivot.name = 'well cover'; lidPivot.position.set(0, TW.yB + 0.02, TW.zAA - 1.14);
  { const lp = new Part('wellCover', mats); lp.cyl('paint', 1.12, 1.12, 0.06, Math.max(16, Math.round(28 * d)), [0, 0.03, 1.14]); lp.box('metal', 0.5, 0.06, 0.12, [0, 0.07, 0.1]); lidPivot.add(lp.finish()); }
  add('antiAircraft', lidPivot);

  /* ---------------- external torpedo tubes: trainable twin mounts between the hulls ---------------- */
  for (const [name, z] of [['Twin tubes (fwd of tower)', 19.0], ['Twin tubes (aft of tower)', -14.5]]) {
    const m = P.torpedoTubes(mats, d, { tubes: 2, len: 7.2, shelter: false });
    m.part.position.set(0, 0.45, z); m.part.name = name; m.part.userData.doctorOk = 'inside';
    add('torpedoes', m.part); mounts.push({ name, group: m.part, train: m.train, guns: [], yaw0: 0, arc: 0, torp: true, internal: true });
  }

  /* ---------------- casing fittings ---------------- */
  const fit = new Part('fittings', mats);
  // hatches: forward torpedo loading hatch, galley/crew hatch, engine room hatch, aft torpedo hatch
  for (const [z, w, l] of [[25.5, 0.9, 2.2], [-9.0, 0.8, 0.8], [-21.0, 0.9, 1.0], [-30.5, 0.9, 2.2]]) fit.box('dark', w, 0.08, l, [0, deckY(z) + 0.04, z]);
  // motor-boat stowage just behind the tower: a low cover over a recess in the casing
  fit.add('paint', new THREE.CylinderGeometry(0.85, 0.85, 4.6, 14, 1, false, -Math.PI / 2, Math.PI), [0, deckY(-11) - 0.35, -11.4], [Math.PI / 2, 0, 0], [1, 1, 0.55]);
  // retractable bollards and capstans
  for (const z of [30, 9, -24, -35]) for (const sx of [-1, 1]) P.bollards(fit, d, [sx * Math.max(0.45, lines.hd(z) - 0.55), deckY(z), z]);
  fit.cyl('metal', 0.28, 0.32, 0.4, 12, [0, deckY(35.5) + 0.2, 35.5]);
  fit.cyl('metal', 0.26, 0.3, 0.38, 12, [0, deckY(-37.5) + 0.19, -37.5]);
  // ensign staff at the after end of the tower
  fit.rod('metal', [0, TW.yB, TW.zA + 0.35], [0, TW.yB + 3.0, TW.zA + 0.3], 0.035, 6);
  add('fittings', fit.finish());
  root.add(P.ensign(mats, [0, TW.yB + 2.5, TW.zA - 0.45]));

  for (const [k, g] of Object.entries(parts)) { g.name = k; g.userData.part = true; root.add(g); }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // pose: periscopes, radio mast, the 40 mm out of its well (cover opens first), bow hydroplanes rigged out
  const flag = root.getObjectByName('ensign');
  const state = { periscopes: 0, search: 0, mast: 0, aa: 1, planes: 0, flag: 1 };
  function pose(p = {}) {
    Object.assign(state, p);
    raisers['attack periscope'].position.y = RAISE * state.periscopes;
    raisers['search periscope'].position.y = RAISE * state.search;
    flag.visible = state.flag > 0.5;                                        // the ensign is struck before diving
    raisers.mast.position.y = 4.5 * state.mast;
    const a = clamp(state.aa, 0, 1), lid = clamp(a * 2, 0, 1), lift = clamp(a * 2 - 1, 0, 1);
    lidPivot.rotation.x = -1.9 * lid;
    aa.part.position.y = -2.25 * (1 - lift);
    for (const pv of bowPlanes) pv.rotation.z = pv.userData.side * 1.45 * (1 - clamp(state.planes, 0, 1));
    return state;
  }
  pose();

  // navigation lights: side lights on the bridge bulwark (green starboard, red port), masthead at the standard, stern light
  const zSL = 5.4, xSL = towerHalf(zSL, TW.yB) + 0.05;
  const anchors = { masthead: [0, TW.yS + 0.1, TW.zSF + 0.1], starboard: [xSL, TW.yB + 0.95, zSL], port: [-xSL, TW.yB + 0.95, zSL], stern: [0, 2.9, -41.45] };
  return { group: root, parts, mounts, info, lines, materials: mats, anchors, length: LOA, beam: B * 2, pose, sub: { draught: T0, periscopeTop: TW.yS + 0.4 + 0.6 + RAISE, raise: RAISE, bridge: TW.yB, deck: 2.1 } };
}

// What the Ship Lab shows for this boat: camera presets, dimension labels, part names.
export const view = {
  cams: [
    ['Bow ¾', [0, 3, 4], 72, 0.85, 0.2], ['Profile', [0, 3, 0], 108, Math.PI / 2, 0.02], ['Stern ¾', [0, 3, -6], 66, 2.35, 0.22],
    ['Top', [0, 0, 0], 118, Math.PI / 2, 1.5], ['Conning tower', [0, 6, 1.5], 19, 0.9, 0.28], ['Deck gun', [0, 4, 13], 12, 0.55, 0.3],
    ['40 mm well', [0, 6, -4], 11, 2.5, 0.55], ['Bow, net cutter', [0, 1.5, 37], 17, 0.95, 0.12], ['Stern, screws', [0, -1.8, -36.5], 15, 2.3, -0.08],
    ['Waterline', [0, 0.5, 0], 72, 2.0, -0.02],
  ],
  dims: {
    loa: 5.6, beamAt: [10.2, -16],
    labels: [['LOA 84.0 m', [0, 6.1, -20]], ['Beam 6.70 m', [0, 10.7, -16]], ['Draught 4.17 m', [0, -2.2, 30]], ['Stem', [0, 4.6, 42.3]], ['Stern', [0, 3.4, -42.2]],
      ['Bridge 4.5 m', [0, 5.2, 9.4]], ['Standard 7.3 m', [0, 8.0, 0.8]]],
  },
  partNames: {
    hull: 'Outer hull, casing, hydroplanes, screws', superstructure: 'Conning tower and bridge', masts: 'Periscopes, radio mast, net cutter, jumping wires',
    mainBattery: 'Deck gun (105 mm)', antiAircraft: 'AA (twin 40 mm, retractable)', torpedoes: 'Twin tubes between the hulls', fittings: 'Casing fittings, hatches',
    pressureHull: 'Pressure hull, frames, tube nests (inside)',
  },
};
