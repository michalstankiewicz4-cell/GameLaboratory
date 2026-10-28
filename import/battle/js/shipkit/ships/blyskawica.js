// ORP Błyskawica (Grom class destroyer, J. Samuel White, Cowes; commissioned 1937), as built in 1937:
// 3×2 + 1×1 120 mm/50 Bofors wz.34/36, 2×2 40 mm/56 Bofors wz.36, 4×2 13.2 mm Hotchkiss, 2×3 torpedo tubes,
// depth-charge racks, mine rails, one raked funnel with a cap, high bridge with searchlight tower.
// Real dimensions in metres (1 unit = 1 m). Sources and the reconstruction notes: docs/ships/blyskawica.md.
import * as THREE from '../../../vendor/three.module.js';
import { Part, plan, roundRect } from '../geom.js';
import { loftHull, deckSurface, sideAt } from '../hull.js';
import { shipMaterials } from '../materials.js';
import * as P from '../parts.js';

export const info = {
  id: 'blyskawica',
  name: 'ORP Błyskawica',
  year: '1937 (as built)',
  type: 'Destroyer, Grom class',
  builder: 'J. Samuel White & Co., Cowes (Isle of Wight); launched 1 Oct 1936, commissioned 25 Nov 1937',
  specs: [
    ['Length overall', '114.0 m'], ['Length at waterline', '111.0 m'], ['Length between perpendiculars', '109.0 m'],
    ['Beam', '11.26 m'], ['Draught (fwd / aft)', '3.15 / 3.45 m'], ['Hull depth amidships', '6.48 m'],
    ['Displacement', '2,011 t standard · 2,144 t normal · ~2,400 t full'],
    ['Machinery', '3 Admiralty 3-drum boilers (+1 auxiliary), 2 Parsons geared turbines, 2 shafts, 54,000 shp'],
    ['Speed', '39 kn design; 39.6 kn on trials (40.4 kn reported on the last run)'],
    ['Range', '3,500 nm at 15 kn'], ['Crew', '192 (peacetime), ~240 wartime'],
    ['Main battery', '7 × 120 mm/50 Bofors wz.34/36: 3 twin + 1 single (A twin, B single superfiring, X twin superfiring, Y twin)'],
    ['Anti-aircraft', '2 × 2 40 mm/56 Bofors wz.36 · 4 × 2 13.2 mm Hotchkiss wz.30'],
    ['Torpedoes', '2 × 3 550 mm tubes (liners for 533/450 mm)'],
    ['Anti-submarine / mines', '2 depth-charge racks (2 × 10 + 10 reserve) · 2 pairs of mine rails (44 mines)'],
    ['Fire control', '4 m rangefinder on the bridge, rangefinder on the aft deckhouse'],
    ['Colours', 'Medium grey, decks darker; black boot-top; red anti-fouling; name in red on the stern'],
  ],
  sources: [
    ['Wikipedia: ORP Błyskawica', 'https://en.wikipedia.org/wiki/ORP_B%C5%82yskawica'],
    ['naval-encyclopedia.com: Grom class destroyers', 'https://naval-encyclopedia.com/ww2/poland/grom-class-destroyers.php'],
    ['navypedia.org: GROM destroyers (1937)', 'https://www.navypedia.org/ships/poland/pl_dd_grom.htm'],
    ['opisybroni.pl: ORP „Błyskawica”', 'https://opisybroni.pl/orp-blyskawica/'],
    ['portalstoczniowy.pl: ORP Błyskawica before the war', 'https://portalstoczniowy.pl/en/orp-blyskawica-przed-wojna-uzbrojenie/'],
  ],
};

const LOA = 114, BOW = 57, B = 11.26 / 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const BREAK = -1;                               // forecastle break (58 m from the stem)

// ---- lines (functions of z; +z = bow, z = 0 amidships) ----
const zWLbow = 54.4, zWLstern = -56.3;
function aftRound(z) { return z < -50.3 ? 0.45 + 0.55 * Math.sqrt(Math.max(0, 1 - ((z + 50.3) / 6) ** 2)) : 1; }
export const lines = {
  zStern: zWLstern, zBow: zWLbow, breaks: [BREAK],
  hw(z) {
    if (z > 8) { const u = clamp((z - 8) / (zWLbow - 8), 0, 1); return B * Math.pow(1 - Math.pow(u, 2.1), 0.75); }
    if (z < -14) { const u = clamp((-14 - z) / (-14 - zWLstern), 0, 1); return B * (1 - 0.3 * Math.pow(u, 1.6)) * aftRound(z) * 0.98; }
    return B;
  },
  hd(z) {
    if (z > 4) { const u = clamp((z - 4) / (zWLbow - 4), 0, 1); return Math.max(0.05, B * Math.pow(1 - Math.pow(u, 2.4), 0.55)); }
    if (z < -14) { const u = clamp((-14 - z) / (-14 - zWLstern), 0, 1); return B * (1 - 0.18 * Math.pow(u, 1.5)) * aftRound(z); }
    return B;
  },
  T(z) {
    let t = 3.3 - 0.15 * (z / 55);                                   // 3.15 m forward … 3.45 m aft
    if (z > 40) t *= 1 - Math.pow(clamp((z - 40) / (zWLbow - 40), 0, 1), 1.6);
    if (z < -42) t *= 1 - 0.9 * Math.pow(clamp((-42 - z) / (-42 - zWLstern), 0, 1), 1.4);
    return t;
  },
  n(z) {
    if (z > 10) return 3.6 - 1.9 * clamp((z - 10) / 44, 0, 1);
    if (z < -20) return 3.6 - 1.0 * clamp((-20 - z) / 36, 0, 1);
    return 3.6;
  },
  deck(z) {
    let y = 3.18 + 0.42 * Math.pow(Math.max(0, (-z - 10) / 46), 1.5);
    if (z > BREAK) y = 3.18 + 2.35 + 1.9 * Math.pow(Math.max(0, z / zWLbow), 2.2);
    return y;
  },
  flare(z) { return z > 20 ? 0.6 * Math.pow(clamp((z - 20) / 34, 0, 1), 1.2) : 0; },
  rake(y) { return y > 0 ? 2.6 * Math.pow(y / 7.43, 0.9) : 0; },          // clipper stem: 2.6 m forward at the deck
  sternRake(y) { return y > 0 ? 0.45 * (y / 3.6) : 0; },
};
const deckY = (z) => lines.deck(z);
const zOf = (dFromStem) => BOW - dFromStem;

export function build(opt = {}) {
  const d = opt.detail ?? 1;
  const mats = shipMaterials({ hull: 0x8e979c, upper: 0x9aa2a7, deck: 0x5d6368, antifouling: 0x7a2a20, boot: 0x16181a, bootTop: 0.42 });
  const root = new THREE.Group(); root.name = 'blyskawica';
  const parts = {};                                       // name -> Group (toggleable)
  const mounts = [];                                      // { name, train, guns, yaw0, arc }
  const add = (name, g) => { (parts[name] ||= new THREE.Group()).add(g); };

  /* ---------------- hull ---------------- */
  const hull = loftHull(lines, { detail: d });
  const hullMesh = new THREE.Mesh(hull.geometry, mats.hull);
  hullMesh.castShadow = hullMesh.receiveShadow = true; hullMesh.name = 'hull';
  add('hull', hullMesh);
  const decks = deckSurface(hull, lines, [[BREAK + 0.03, zWLbow], [zWLstern, BREAK - 0.03]], 0.14);
  const deckMesh = new THREE.Mesh(decks, mats.deck); deckMesh.receiveShadow = true; deckMesh.name = 'decks';
  add('hull', deckMesh);
  const hp = new Part('hullFittings', mats);
  // forecastle break bulkhead (with doors) and a short bulwark at the step
  const yb0 = deckY(BREAK - 0.1), yb1 = deckY(BREAK + 0.1), wB = sideAt(lines, BREAK, yb1) * 2;
  hp.box('paint', wB - 0.08, yb1 - yb0, 0.1, [0, (yb0 + yb1) / 2, BREAK]);      // 4 cm inside the shell plating
  for (const sx of [-2.6, 2.6]) hp.box('dark', 0.8, 1.8, 0.05, [sx, yb0 + 0.92, BREAK - 0.06]);
  // bilge keels
  for (const sx of [-1, 1]) for (let z = -24; z < 18; z += 2) hp.box('hull', 0.06, 0.45, 2.05, [sx * (sideAt(lines, z, -1.9) - 0.15), -2.3, z], [0, 0, sx * 0.6]);
  // portholes: two rows in the forecastle, one aft
  const port = (z, y) => { for (const sx of [-1, 1]) hp.add('dark', new THREE.CircleGeometry(0.17, Math.max(8, Math.round(10 * d))), [sx * (sideAt(lines, z, y) + 0.012), y, z], [0, sx * Math.PI / 2, 0]); };
  for (let z = 14; z < 47; z += 1.6) port(z, deckY(z) - 1.25);
  for (let z = 30; z < 46; z += 2.2) port(z, 1.55);
  for (let z = -48; z < -26; z += 1.8) port(z, deckY(z) - 1.05);
  // hawse pipes and anchors in their pockets
  for (const sx of [-1, 1]) {
    const z = 51.2, y = 4.9, sideX = (yy) => sx * (sideAt(lines, z, yy) + 0.14);   // anchor stowed against the flared plating
    hp.add('dark', new THREE.CircleGeometry(0.32, 12), [sx * (sideAt(lines, z, y + 0.3) + 0.015), y + 0.3, z], [0, sx * Math.PI / 2, 0]);
    hp.box('metal', 0.22, 1.4, 0.5, [sideX(y - 0.4), y - 0.4, z - 0.1]);
    hp.box('metal', 0.22, 0.3, 1.2, [sideX(y - 1.1), y - 1.1, z - 0.1]);
  }
  // rudder, shafts, A-brackets, propellers (Ø 3.2 m, outward turning)
  hp.box('hull', 0.35, 2.6, 2.2, [0, -1.9, -54.6]);
  for (const sx of [-1, 1]) {
    hp.rod('metal', [sx * 1.4, -2.0, -20], [sx * 2.9, -2.7, -47.2], 0.17, 10);
    hp.rod('metal', [sx * 2.9, -2.7, -46.8], [sx * 1.0, -1.4, -46.2], 0.08, 6);
    hp.rod('metal', [sx * 2.9, -2.7, -46.8], [sx * 2.0, -0.9, -46.4], 0.08, 6);
    P.propeller(hp, d, 3.2, [sx * 2.9, -2.7, -47.6], sx);
  }
  add('hull', hp.finish());

  /* ---------------- deck fittings, rails, ground tackle ---------------- */
  const fit = new Part('fittings', mats);
  // jackstaff, breakwater, windlass, chain pipes, chains
  fit.rod('metal', [0, deckY(54) + 0, 56.4], [0, deckY(54) + 3.2, 56.6], 0.04);
  const zbw = zOf(13), ybw = deckY(zbw);
  for (const sx of [-1, 1]) fit.box('paint', 0.06, 0.75, 3.6, [sx * 1.3, ybw + 0.37, zbw + 0.9], [0, sx * 0.55, 0]);
  fit.box('metal', 1.6, 0.6, 0.9, [0, deckY(49) + 0.3, 49]);
  for (const sx of [-1, 1]) {
    fit.cyl('metal', 0.32, 0.32, 0.45, 12, [sx * 0.55, deckY(49) + 0.62, 49.0]);
    for (let i = 0; i < 9; i++) fit.add('dark', new THREE.TorusGeometry(0.11, 0.035, 4, 8), [sx * (0.55 + i * 0.2), deckY(50.5) + 0.06, 49.6 + i * 0.18], [Math.PI / 2, (i % 2) * Math.PI / 2, 0.3]);
  }
  // bollards and fairleads
  for (const [z, sx] of [[46, 1], [46, -1], [12, 1], [12, -1], [-6, 1], [-6, -1], [-44, 1], [-44, -1], [-52, 1], [-52, -1]]) P.bollards(fit, d, [sx * (sideAt(lines, z, deckY(z)) - 0.7), deckY(z), z]);
  // ventilators
  for (const [z, x, yaw] of [[47.6, 2.0, 0], [47.6, -2.0, 0], [-4, 2.3, Math.PI], [-4, -2.3, Math.PI], [-21.5, 2.2, 0], [-21.5, -2.2, 0], [-48.2, 3.4, Math.PI], [-48.2, -3.4, Math.PI]]) P.ventilator(fit, d, [x, deckY(z), z], 0.24, 1.1, yaw);
  // guard rails along both deck edges (stepping down at the break)
  for (const sx of [-1, 1]) {
    const fwd = [], aft = [];
    for (let z = BREAK + 0.2; z < 53.5; z += 2) fwd.push([sx * (sideAt(lines, z, deckY(z)) - 0.08), deckY(z), z]);
    for (let z = -55.8; z < BREAK - 0.2; z += 2) aft.push([sx * (sideAt(lines, z, deckY(z)) - 0.08), deckY(z), z]);
    P.rail(fit, fwd, 1.5, 0.95); P.rail(fit, aft, 1.5, 0.95);
  }
  // stern: mine rails (two pairs), depth-charge racks with charges, flagstaff, ensign
  const yq = deckY(-48);
  for (const x of [-2.4, -1.6, 1.6, 2.4]) fit.box('metal', 0.12, 0.08, 14, [x, yq + 0.04, -48.8]);
  for (const sx of [-1, 1]) {
    fit.box('metal', 0.9, 0.7, 3.0, [sx * 1.9, deckY(-54) + 0.35, -54.3]);
    for (let i = 0; i < 5; i++) fit.tubeZ('dark', 0.24, 0.24, 0.62, 12, [sx * 1.9, deckY(-54) + 0.9, -53.2 - i * 0.62], [0, 0, 0]);
  }
  const zf = -56.3, yf = deckY(zf);
  fit.rod('metal', [0, yf, zf], [0, yf + 4.2, zf - 0.2], 0.05);
  add('fittings', fit.finish());
  // naval ensign (white over red with the eagle shield), stern name in red letters
  root.add(P.ensign(mats, [0, yf + 3.3, zf - 0.75]));
  root.add(sternName([0, 2.2, -56.86]));

  /* ---------------- forward superstructure and bridge ---------------- */
  const sup = new Part('superstructure', mats);
  const yF = deckY(20);                                         // forecastle deck level under the bridge (≈ 5.6 m)
  // deckhouse 1: rounded front at the B mount, full width under the bridge, narrowing aft to the funnel
  sup.add('paint', plan(roundRect(3.1, 15, 35.2, 2.4, 6), 2.4), [0, yF, 0]);
  sup.add('paint', plan(roundRect(1.9, -0.8, 15.5, 0.6, 3), 2.4), [0, yF - 0.05, 0]);
  sup.box('deck', 6.24, 0.06, 20.24, [0, yF + 2.43, 25.1]);
  // bridge level 2: wheelhouse with windows and side doors
  sup.add('paint', plan(roundRect(3.5, 21.0, 28.0, 1.6, 5), 2.26), [0, yF + 2.44, 0]);
  for (let i = -5; i <= 5; i++) {
    const x = i * 0.62, k = Math.max(0, Math.abs(x) - 1.9), a = Math.asin(Math.min(1, k / 1.6)) * Math.sign(x);
    const zf = 28.0 - 1.6 + Math.sqrt(Math.max(0, 1.6 * 1.6 - k * k));
    sup.box('glass', 0.5, 0.55, 0.05, [x + Math.sin(a) * 0.02, yF + 3.95, zf + Math.cos(a) * 0.02], [0, a, 0]);
  }
  for (const sx of [-1, 1]) sup.box('dark', 0.05, 1.8, 0.7, [sx * 3.52, yF + 3.4, 23]);
  // level 3: open compass platform with wings, wind deflector, binnacle, 13.2 mm mounts on the wings
  sup.add('paint', plan(roundRect(4.6, 20.6, 28.4, 1.2, 4), 0.18), [0, yF + 4.7, 0]);
  for (const sx of [-1, 1]) sup.box('paint', 0.06, 1.05, 7.4, [sx * 4.58, yF + 5.4, 24.5]);
  sup.box('paint', 9.1, 1.05, 0.06, [0, yF + 5.4, 28.35]);
  sup.box('paint', 9.3, 0.08, 0.35, [0, yF + 5.95, 28.45], [0.5, 0, 0]);      // wind deflector lip
  sup.cyl('metal', 0.22, 0.28, 1.1, 10, [0, yF + 5.4, 26.4]);
  sup.cyl('metal', 0.3, 0.3, 0.12, 12, [0, yF + 6.0, 26.4]);
  // rangefinder tower aft of the open bridge (4 m Optique & Précision) and the searchlight tower behind it
  sup.add('paint', plan(roundRect(1.4, 19.6, 22.0, 0.5, 3), 1.2), [0, yF + 4.88, 0]);
  P.rangefinder(sup, d, 4.0, [0, yF + 6.1, 20.8]);
  sup.add('paint', plan(roundRect(1.2, 16.4, 19.2, 0.4, 3), 4.56), [0, yF + 2.44, 0]);
  sup.cyl('paint', 1.5, 1.5, 0.15, 16, [0, yF + 7.1, 17.8]);
  P.searchlight(sup, d, 1.1, [0, yF + 7.18, 17.8]);
  // boats: whaler and motor boat amidships (davits), second whaler further aft
  for (const [x, z, len, mot] of [[3.55, 10.5, 8.2, false], [-3.55, 10.5, 8.5, true], [-3.6, 3.3, 7.0, false]]) {
    const y = deckY(z);
    P.boat(sup, d, len, [x, y + 0.2, z], mot);
    for (const s of [-1, 1]) {
      const zz = z + s * len * 0.38;
      sup.rod('metal', [x * 0.82, y, zz], [x * 0.82, y + 2.6, zz], 0.07, 6);
      sup.rod('metal', [x * 0.82, y + 2.6, zz], [x * 1.04, y + 2.9, zz], 0.06, 6);
    }
  }
  add('superstructure', sup.finish());

  /* ---------------- funnel (single, raked, oval, with cap) ---------------- */
  const fun = new Part('funnel', mats);
  const zFun = zOf(53), yFun = deckY(zFun) + 2.4, rake = 0.15;
  const fh = 15.8 - yFun;
  const ring = (r1, r2, h, y) => { const g = new THREE.CylinderGeometry(1, 1, h, Math.max(16, Math.round(28 * d)), 1); g.scale(r1, 1, r2); g.translate(0, y + h / 2, 0); return g; };
  const shear = (g) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - (p.getY(i) - yFun) * rake); return g; };
  fun.add('paint', shear(ring(1.8, 3.4, fh - 1.0, yFun)), [0, 0, zFun]);
  fun.add('dark', shear(ring(1.82, 3.42, 1.0, yFun + fh - 1.0)), [0, 0, zFun]);           // black top band
  fun.add('dark', shear(ring(1.6, 3.2, 0.05, yFun + fh - 0.02)), [0, 0, zFun]);           // inner opening
  fun.add('paint', shear(ring(2.05, 3.75, 0.25, yFun + fh + 0.55)), [0, 0, zFun]);         // cap (cowl) ring on struts
  for (const [x, z] of [[1.7, 0], [-1.7, 0], [0, 3.1], [0, -3.1]]) fun.rod('metal', [x, yFun + fh, zFun + z - fh * rake], [x * 1.05, yFun + fh + 0.6, zFun + z * 1.05 - (fh + 0.6) * rake], 0.06);
  fun.rod('metal', [0.5, yFun + 2, zFun - 3.2 - 2 * rake], [0.5, yFun + fh + 0.8, zFun - 3.1 - (fh + 0.8) * rake], 0.13, 8);   // steam pipe
  fun.rod('metal', [-0.5, yFun + 2, zFun - 3.2 - 2 * rake], [-0.5, yFun + fh + 0.4, zFun - 3.1 - (fh + 0.4) * rake], 0.09, 8);
  for (let i = 0; i < 6; i++) fun.box('metal', 0.5, 0.04, 0.04, [0, yFun + 1.5 + i * 1.3, zFun + 3.35 - (1.5 + i * 1.3) * rake]);   // ladder rungs
  add('funnel', fun.finish());

  /* ---------------- masts and rigging ---------------- */
  const mast = new Part('masts', mats);
  const zFm = 15.6, yFm0 = yF + 2.4;
  mast.rod('metal', [0, yFm0, zFm], [0, 22.5, zFm - 0.6], 0.17, 10);                        // foremast (tripod main leg)
  for (const sx of [-1, 1]) mast.rod('metal', [sx * 2.0, yFm0, zFm - 3.2], [0, 17.5, zFm - 0.5], 0.11, 8);
  mast.rod('metal', [0, 22.5, zFm - 0.6], [0, 27.0, zFm - 0.8], 0.07, 6);                  // topmast
  mast.rod('metal', [-3.2, 19.4, zFm - 0.55], [3.2, 19.4, zFm - 0.55], 0.06, 6);           // signal yard
  mast.cyl('paint', 0.8, 0.7, 0.9, 12, [0, 15.6, zFm - 0.45]);                             // crow's nest
  const zMm = -24.5, yMm0 = deckY(zMm) + 2.4;
  mast.rod('metal', [0, yMm0, zMm], [0, 17.5, zMm - 0.5], 0.13, 8);                         // mainmast (pole)
  mast.rod('metal', [-1.8, 14.0, zMm - 0.4], [1.8, 14.0, zMm - 0.4], 0.05, 6);
  const wire = (a, b) => mast.rod('rope', a, b, 0.012, 3);
  wire([0, 26.8, zFm - 0.8], [0, 17.3, zMm - 0.5]);                                         // aerial between the mastheads
  wire([0, 26.0, zFm - 0.78], [0, 7.5, 55.5]);                                              // forestay to the jackstaff
  for (const sx of [-1, 1]) { wire([sx * 3.1, 19.4, zFm - 0.55], [sx * 4.4, yF + 0.2, zFm - 1]); wire([0, 16.5, zMm - 0.45], [sx * 3.0, deckY(-30), -30]); }
  wire([0, 17.4, zMm - 0.5], [0, yf + 4.0, zf - 0.2]);                                      // to the flagstaff
  add('masts', mast.finish());

  /* ---------------- main battery ---------------- */
  const m120 = (name, barrels, z, y, yaw, arc = 150) => {
    const m = P.bofors120(mats, d, barrels);
    m.part.position.set(0, y, z); m.part.rotation.y = yaw; m.part.name = name;
    add('mainBattery', m.part);
    mounts.push({ name, group: m.part, train: m.train, guns: m.guns, yaw0: yaw, arc });
  };
  m120('A (twin)', 2, zOf(17), deckY(zOf(17)), 0, 145);
  const sup2 = new Part('bBarbette', mats);
  sup2.cyl('paint', 2.25, 2.3, 0.35, 32, [0, yF + 2.46 + 0.175, 32.0]);
  add('superstructure', sup2.finish());
  m120('B (single, superfiring)', 1, 32.0, yF + 2.46 + 0.35, 0, 140);
  // aft deckhouse with the superfiring X mount, searchlight platform, rangefinder, 13.2 mm sponsons
  const aft = new Part('aftHouse', mats);
  const yM = deckY(-28);
  aft.add('paint', plan(roundRect(3.0, -35.4, -22.6, 1.2, 4), 2.4), [0, yM, 0]);
  aft.box('deck', 5.9, 0.06, 12.6, [0, yM + 2.43, -29]);
  aft.add('paint', plan(roundRect(1.3, -27.8, -24.6, 0.4, 3), 1.56), [0, yM + 2.44, 0]);
  aft.cyl('paint', 1.25, 1.25, 0.14, 16, [0, yM + 4.07, -26.2]);
  P.searchlight(aft, d, 0.9, [0, yM + 4.14, -26.2], Math.PI);
  P.rangefinder(aft, d, 3.0, [0, yM + 2.45, -29.0]);
  for (const sx of [-1, 1]) aft.box('paint', 1.5, 0.12, 1.6, [sx * 3.55, yM + 2.38, -24.2]);
  add('superstructure', aft.finish());
  m120('X (twin, superfiring)', 2, -33.2, yM + 2.43, Math.PI, 145);
  m120('Y (twin)', 2, zOf(96.3), deckY(zOf(96.3)), Math.PI, 135);

  /* ---------------- torpedoes and AA ---------------- */
  const tt = (name, z) => {
    const m = P.torpedoTubes(mats, d); m.part.position.set(0, deckY(z), z);
    m.part.rotation.y = 0; m.part.name = name; add('torpedoes', m.part); mounts.push({ name, group: m.part, train: m.train, guns: [], yaw0: 0, arc: 0, torp: true });
  };
  tt('Torpedo tubes 1', zOf(65.4)); tt('Torpedo tubes 2', -19.3);
  // 40 mm platforms: behind the funnel and between the tube banks
  const aa = new Part('aaPlatforms', mats);
  for (const [z, h] of [[zOf(59.6), 2.6], [zOf(70.8), 2.4]]) {
    const y = deckY(z);
    aa.add('paint', plan(roundRect(1.6, z - 1.6, Math.min(z + 1.6, BREAK - 0.08), 0.8, 4), h - 0.02), [0, y + 0.02, 0]);
    aa.cyl('deck', 2.15, 2.15, 0.1, 24, [0, y + h, z]);
  }
  add('antiAircraft', aa.finish());
  for (const [z, h] of [[zOf(59.6), 2.6], [zOf(70.8), 2.4]]) {
    const m = P.bofors40(mats, d); m.part.position.set(0, deckY(z) + h + 0.05, z);
    m.part.rotation.y = z > -10 ? Math.PI : 0; m.part.name = z > -10 ? '40 mm twin (fwd)' : '40 mm twin (aft)';
    add('antiAircraft', m.part); mounts.push({ name: m.part.name, group: m.part, train: m.train, guns: m.guns, yaw0: m.part.rotation.y, arc: z > -10 ? 135 : 150, aa: true });
  }
  for (const [x, y, z] of [[4.1, yF + 4.88, 24.0], [-4.1, yF + 4.88, 24.0], [3.55, yM + 2.44, -24.2], [-3.55, yM + 2.44, -24.2]]) {
    const m = P.hotchkiss(mats, d); m.part.position.set(x, y, z); m.part.rotation.y = x > 0 ? 0.8 : -0.8;
    if (z < 0) m.part.rotation.y = x > 0 ? 2.2 : -2.2;
    m.part.userData.doctorOk = 'speck';
    m.part.name = `13.2 mm twin (${z > 0 ? 'bridge' : 'aft'}, ${x > 0 ? 'stbd' : 'port'})`;
    add('antiAircraft', m.part); mounts.push({ name: m.part.name, group: m.part, train: m.train, guns: m.guns, yaw0: m.part.rotation.y, arc: 120, aa: true });
  }

  for (const [k, g] of Object.entries(parts)) { g.name = k; g.userData.part = true; root.add(g); }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // where the navigation lights and the signal lamp's shutters go (no geometry here; ShipKit's lights.js draws them): masthead light on the foremast,
  // side lights on the outer faces of the bridge-wing screens (green starboard +x, red port −x), stern light on the flagstaff
  const anchors = {
    masthead: [0, 21.0, zFm - 0.35], starboard: [4.66, yF + 5.25, 24.2], port: [-4.66, yF + 5.25, 24.2], stern: [0, yf + 1.3, zf - 0.12],
    // the 1.1 m searchlight on the tower behind the bridge doubles as the signal lamp: lens centre, diameter, facing
    signal: { at: [0, yF + 7.18 + 0.6 + 0.55, 17.8 + 0.495], dia: 1.1, dir: [0, 0, 1] },
  };
  return { group: root, parts, mounts, info, lines, materials: mats, anchors, length: LOA, beam: B * 2 };
}

// The ship's name painted in red on the transom.
function sternName(at) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#b3201a'; g.font = 'bold 44px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('BŁYSKAWICA', 256, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.42), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.set(at[0], at[1], at[2]); m.rotation.y = Math.PI; m.name = 'sternName';
  return m;
}

// What the Ship Lab shows for this ship: camera presets, dimension labels, part names, where to look when signalling.
export const view = {
  cams: [
    ['Bow ¾', [0, 4, 6], 105, 0.85, 0.2], ['Profile', [0, 4, 0], 150, Math.PI / 2, 0.02], ['Stern ¾', [0, 4, -8], 100, 2.35, 0.22],
    ['Top', [0, 0, 0], 170, Math.PI / 2, 1.5], ['Bridge', [0, 10, 24], 28, 1.0, 0.22], ['Forecastle', [0, 6, 42], 32, 0.7, 0.4],
    ['Funnel & tubes', [0, 7, -6], 34, 1.9, 0.3], ['Quarterdeck', [0, 5, -42], 30, -0.6, 0.45], ['Waterline', [0, 0.5, 0], 95, 2.0, -0.02],
  ],
  dims: {
    loa: 8.5, beamAt: [7, -14],
    labels: [['LOA 114.0 m', [0, 9, 0]], ['Beam 11.26 m', [0, 7.6, -14]], ['Draught 3.15 / 3.45 m', [0, -1.6, 52]], ['Stem', [0, 7.6, 57.2]], ['Stern', [0, 4.3, -57.2]],
      ['Funnel top 15.8 m', [0, 16.6, 1.6]], ['Mast ~27 m', [0, 27.6, 14.8]]],
  },
  partNames: { hull: 'Hull, decks, propellers', superstructure: 'Superstructure & bridge', funnel: 'Funnel', masts: 'Masts & rigging', mainBattery: 'Main battery (120 mm)', antiAircraft: 'AA (40 mm, 13.2 mm)', torpedoes: 'Torpedo tubes', fittings: 'Deck fittings, rails, boats' },
  signalCam: { target: [0, 13.9, 18.3], dist: 8, yaw: 0.35, pitch: 0.12 },
};
