// Breakwater (falochron), three classic types:
//  rock:     rubble mound — quarry-run core, an underlayer, two layers of armour rock, a toe berm, a concrete crown wall,
//  tetrapod: the same mound armoured on the seaward side with two layers of tetrapods (concrete units, 1950 design),
//  caisson:  vertical (mixed) breakwater — floated-in reinforced-concrete caissons on a rubble bed, a concrete
//            superstructure with a wave wall, and a tetrapod berm in front against wave reflection (as on the new
//            breakwaters at Gdańsk).
// The breakwater runs along z from z0 to its head at z1 (a round head with a harbour light); the sea is on +x.
// Armour units are instanced (thousands per draw call). Sources and assumptions: docs/structures/coastal.md.
import * as THREE from '../../../vendor/three.module.js';
import { Part } from '../../shipkit/geom.js';
import { structMaterials } from '../materials.js';
import * as C from '../coastal.js';

export const info = {
  id: 'breakwater',
  name: 'Breakwater',
  year: 'typical construction',
  type: 'Rubble-mound (rock or tetrapod armour) or caisson breakwater with a round head and a harbour light',
  builder: 'Parametric: cross-sections after common coastal-engineering practice (see docs/structures/coastal.md)',
  note: 'A typical breakwater, not a particular one: cross-sections follow common coastal-engineering practice (two armour layers on a 1:1.5 slope, crest three units wide, crown wall), the caisson type follows the mixed breakwaters now built at Gdańsk. Assumptions and sources: docs/structures/coastal.md.',
  specs: [
    ['Armour slope', '1:1.5 seaward and lee (rock), 1:1.5 tetrapods'],
    ['Armour layer', 'two units thick; underlayer of rock about a tenth of the armour weight'],
    ['Crest', 'three units wide at the crest level, crown wall 2.5 m higher'],
    ['Tetrapod', 'four tapered legs on the tetrahedron axes; a 7.8 t unit is ≈ 2.35 m across and 2.08 m high'],
    ['Rock armour', 'nominal diameter (mass / 2.65 t/m³)^⅓'],
    ['Caissons', 'reinforced concrete, 20 m wide, 30–55 m long, on a 4 m rubble bed; superstructure with a wave wall'],
    ['Head light', 'round head; IALA region A: red light on the port hand entering harbour'],
  ],
  sources: [
    ['Wikipedia: Tetrapod (structure) — Danel & Anglès d\'Auriac, 1950', 'https://en.wikipedia.org/wiki/Tetrapod_(structure)'],
    ['Betonblock: tetrapod mould BBTP-7.8 (7.8 t unit: 2.35 × 2.35 × 2.08 m)', 'https://betonblock.com/en/products/tetrapods/tetrapod-bbtp-7-8'],
    ['Rover Maritime: 38 caissons in 300 days — Gdańsk mixed breakwater (caissons, tetrapods seaward)', 'https://www.rovergrupo.com/en/noticia-detalle/38-caissons-in-300-days-and-300-nights'],
    ['Port of Genoa, new breakwater: caissons 40–67 m long, 25–30 m wide, 22–33 m high', 'https://www.pergenovadigaforanea.it/en/the-caissons.html'],
    ['Wikipedia: Breakwater (structure)', 'https://en.wikipedia.org/wiki/Breakwater_(structure)'],
  ],
};

export const PARAMS = [
  { key: 'kind', label: 'Type', options: [['tetrapod', 'Rubble mound, tetrapods'], ['rock', 'Rubble mound, rock'], ['caisson', 'Caissons + tetrapod berm']], def: 'tetrapod' },
  { key: 'length', label: 'Length', min: 60, max: 400, step: 10, def: 180, fmt: (v) => v + ' m' },
  { key: 'crest', label: 'Crest level', min: 2, max: 9, step: 0.5, def: 4.5, fmt: (v) => '+' + v.toFixed(1) + ' m' },
  { key: 'unit', label: 'Armour unit', min: 2, max: 25, step: 0.5, def: 8, fmt: (v) => v + ' t' },
];

export function build({ detail = 1, depth = 11, kind = 'tetrapod', length = 180, crest = 4.5, unit = 8 } = {}) {
  const mats = structMaterials();
  const root = new THREE.Group(); root.name = 'breakwater';
  const parts = {}, put = (name, obj) => { parts[name] = obj.isGroup || obj.isMesh ? obj : obj.finish(); root.add(parts[name]); };
  const L = length, z0 = -L / 2, z1 = L / 2, bed = -depth;
  const rockDn = Math.cbrt(unit / 2.65), tetH = Math.cbrt((unit / 2.4) / 0.33);       // rock nominal size, tetrapod height
  const armour = kind === 'rock' ? rockDn : tetH * 0.9;
  const slope = 1.5, t = 2 * armour;                                                  // 1:1.5, two units thick
  const Bc = 3 * armour;                                                              // crest width
  let heightAt;

  if (kind !== 'caisson') {
    /* ---------- rubble mound ---------- */
    const hw = Bc / 2, H = crest - bed;
    const xs = hw + H * slope;                                                          // toe of the armour (seaward), mirrored lee
    // core and underlayer as one solid (seen through gaps in the armour), slightly inside the armour layer
    const inset = t * 0.8;
    const prof = [[xs - inset * 1.3, bed], [hw - inset * 0.4, crest - inset], [-hw + inset * 0.4, crest - inset], [-xs + inset * 1.3, bed]];
    const core = new Part('core', mats); core.add('core', C.sweepZ(prof, z0, z1));
    core.cyl('core', hw - inset * 0.4, xs - inset * 1.3, crest - inset - bed, 24, [0, (crest - inset + bed) / 2, z1]);   // the round head's core
    // crown wall on the crest (lee half), recurved parapet facing the sea
    core.add('concrete', C.sweepZ([[hw * 0.1, crest - 0.6], [hw * 0.1, crest + 2.2], [hw * 0.1 + 0.6, crest + 2.6], [hw * 0.1 + 0.2, crest + 2.6], [-hw, crest + 1.0], [-hw, crest - 0.6]], z0, z1 - 4));
    core.box('concrete', hw * 1.1, 0.4, L - 4, [-hw * 0.45, crest + 1.0, -2]);             // walkway on the crown wall's lee side
    put('core and crown wall', core);
    // armour on both slopes and the crest: (u along z, v down the slope from the crest edge)
    const sl = Math.hypot(1, slope), sx = slope / sl, sy = 1 / sl;
    const seaward = (u, v) => ({ p: new THREE.Vector3(hw + v * sx, crest - v * sy, z0 + u), n: new THREE.Vector3(sy, sx, 0) });
    const lee = (u, v) => ({ p: new THREE.Vector3(-hw - v * sx, crest - v * sy, z0 + u), n: new THREE.Vector3(-sy, sx, 0) });
    const top = (u, v) => ({ p: new THREE.Vector3(hw - v, crest, z0 + u), n: new THREE.Vector3(0, 1, 0) });
    const sLen = H * sl;
    // round head: armour on a half-cone around the end of the mound
    const arc = Math.PI * (hw + sLen * sx * 0.5);                                        // half circle at mid-slope
    const head = (u, v) => {                                                              // round head: +x → +z → −x
      const f = Math.PI / 2 - (u / arc) * Math.PI, dx = Math.sin(f), dz = Math.cos(f), r = hw + v * sx;
      return { p: new THREE.Vector3(dx * r, crest - v * sy, z1 + dz * r), n: new THREE.Vector3(dx * sy, sx, dz * sy) };
    };
    const lay = (surf, uLen, vLen, size, seed, o = {}) => C.layUnits(surf, uLen, vLen, size, { seed, singleBelow: -5, ...o });
    const units = [];
    if (kind === 'tetrapod') {
      const tg = C.tetrapodGeometry(tetH, Math.max(5, Math.round(7 * detail)));
      const m = [...lay(seaward, L, sLen, tetH, 3, { spacing: 1.0, tilt: 1.6 }), ...lay(top, L, hw * 2 * 0.55, tetH, 5, { spacing: 1.0, tilt: 1.6, layers: 1 }), ...lay(head, arc, sLen, tetH, 9, { spacing: 1.0, tilt: 1.6 })];
      units.push(C.instanced(tg, mats.armour, m, 'tetrapods'));
      // the lee side is rock (smaller, quieter water)
      const leeRock = lay(lee, L, sLen, rockDn * 0.85, 13, { tilt: 1.2, layers: 1, spacing: 0.85 });
      [0, 1, 2].forEach((k) => units.push(C.instanced(C.rockGeometry(rockDn * 0.85, 31 + k, 0), mats.rock, leeRock.filter((_, i) => i % 3 === k), 'lee rock')));
    } else {
      const all = [...lay(seaward, L, sLen, rockDn, 3, { tilt: 1.2 }), ...lay(lee, L, sLen, rockDn, 13, { tilt: 1.2 }), ...lay(top, L, hw * 2, rockDn, 5, { layers: 1, tilt: 1.2 }), ...lay(head, arc, sLen, rockDn, 9, { tilt: 1.2 })];
      [0, 1, 2, 3].forEach((k) => units.push(C.instanced(C.rockGeometry(rockDn, 41 + k), mats.rock, all.filter((_, i) => i % 4 === k), 'armour rock')));
    }
    // toe berm on the seabed in front of the seaward armour
    const toe = lay((u, v) => ({ p: new THREE.Vector3(xs + v, bed, z0 + u), n: new THREE.Vector3(0, 1, 0) }), L, 3 * rockDn, rockDn * 0.8, 17, { tilt: 1.4, layers: 2 });
    [0, 1].forEach((k) => units.push(C.instanced(C.rockGeometry(rockDn * 0.8, 51 + k, 0), mats.rock, toe.filter((_, i) => i % 2 === k), 'toe rock')));
    const ag = new THREE.Group(); ag.name = 'armour'; units.forEach((m) => ag.add(m)); put('armour', ag);
    heightAt = (x, z) => {
      const dz = Math.max(0, z - z1), r = Math.hypot(x, dz), d = z > z1 ? r : Math.abs(x);
      if (z < z0 - 2) return bed;
      return d <= hw ? crest : Math.max(bed, crest - (d - hw) / slope);
    };
  } else {
    /* ---------- caisson breakwater (mixed type) ---------- */
    const W = 20, bedTop = bed + 4, capTop = 2.0, wallTop = crest + 1.5, cl = Math.min(52, L / 3);
    const cp = new Part('caissons', mats);
    // rubble foundation bed (solid) with a rock berm
    cp.add('core', C.sweepZ([[W / 2 + 14, bed], [W / 2 + 6, bedTop], [-W / 2 - 6, bedTop], [-W / 2 - 14, bed]], z0 - 6, z1 + 12));
    for (let z = z0; z < z1 - 0.5; z += cl) {
      const zz = Math.min(z + cl, z1), len = zz - z - 0.12;
      cp.box('concrete', W, capTop - bedTop, len, [0, (capTop + bedTop) / 2, (z + zz) / 2]);
      cp.box('dark', W - 1.2, 0.05, 0.12, [0, capTop + 0.02, zz - 0.06]);                     // joint
    }
    cp.box('concrete', W + 0.6, 1.4, L, [0, capTop + 0.7, 0]);                                   // superstructure slab
    cp.add('concrete', C.sweepZ([[W / 2 - 4, capTop], [W / 2 + 0.3, capTop], [W / 2 + 0.3, wallTop - 0.6], [W / 2 - 0.6, wallTop], [W / 2 - 3, wallTop], [W / 2 - 4, capTop + 1.4]], z0, z1));   // wave wall
    for (let z = z0 + 10; z < z1 - 5; z += 20) C.bollard(cp, -W / 2 + 1, capTop + 1.4, z, 1.2);
    put('caissons', cp);
    // tetrapod berm in front of the caissons: from the bed up to just under the cap
    const H = capTop + 0.5 - bedTop, sl = Math.hypot(1, 1.5), sx = 1.5 / sl, sy = 1 / sl;
    const front = (u, v) => ({ p: new THREE.Vector3(W / 2 + 0.3 + v * sx, capTop + 0.5 - v * sy, z0 + u), n: new THREE.Vector3(sy, sx, 0) });
    const m = C.layUnits(front, L, H * sl, tetH, { seed: 3, spacing: 1.0, tilt: 1.6 });
    const ag = new THREE.Group(); ag.name = 'tetrapods';
    ag.add(C.instanced(C.tetrapodGeometry(tetH, Math.max(5, Math.round(7 * detail))), mats.armour, m, 'tetrapods')); put('tetrapod berm', ag);
    heightAt = (x, z) => {
      const inZ = z >= z0 - 1 && z <= z1 + 1;
      const bedH = Math.max(bed, bedTop - Math.max(0, Math.abs(x) - W / 2 - 6) / 1.5 - Math.max(0, z - z1 - 12) / 1.5);   // the rubble bed's berms
      if (!inZ) return z < z0 - 6 ? bed : bedH;
      if (x > W / 2) return Math.max(bedH, capTop + 0.5 - (x - W / 2) / 1.5);            // tetrapod berm
      return x > -W / 2 ? wallTop : bedH;
    };
  }

  /* ---------- harbour light on the head ---------- */
  const lt = new Part('head light', mats);
  const ly = kind === 'caisson' ? 3.4 : crest + 1.0, lz = kind === 'caisson' ? z1 - 8 : z1 - 2;
  lt.cyl('red', 1.3, 1.6, 8, 16, [0, ly + 4, lz]); lt.cyl('white', 1.35, 1.35, 1.2, 16, [0, ly + 3, lz]);
  lt.cyl('dark', 1.6, 1.6, 0.25, 16, [0, ly + 8.1, lz]); lt.cyl('glass', 0.7, 0.7, 1.4, 12, [0, ly + 9, lz]); lt.cyl('red', 0.8, 0.8, 0.4, 12, [0, ly + 9.9, lz]);
  lt.add('lampRed', new THREE.SphereGeometry(0.4, 10, 8), [0, ly + 9, lz]);
  put('head light', lt);

  return { group: root, parts, info, materials: mats, heightAt, bounds: { x0: -60, x1: 60, z0: z0 - 20, z1: z1 + 40 }, anchors: { head: [0, ly, lz] } };
}
