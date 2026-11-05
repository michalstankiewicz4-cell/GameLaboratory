// M1A2 Abrams — czołg podstawowy (General Dynamics Land Systems). Wymiary (1 jednostka = 1 m): długość z działem
// naprzód 9,77, kadłub 7,93, szerokość 3,66 (z osłonami burt), wysokość do dachu wieży 2,44, prześwit 0,48,
// 7 kół jezdnych Ø 635 mm na burtę, koło napędowe z tyłu, napinające z przodu, 2 rolki podtrzymujące,
// gąsienica T158 szer. 635 mm, długość styku z gruntem 4,62. Armata M256 kal. 120 mm (L/44).
// Notatki rekonstrukcji: docs/models/road/abrams.md.
import * as THREE from '../../../../vendor/three/three.module.js';
import { roundBox, sideExtrude, prism, capFan } from '../geom.js';
import { roadMaterials, mattePaint, noiseMap, decal } from '../materials.js';
import { makeTrack } from '../tracks.js';

export const info = {
  id: 'abrams', name: 'M1A2 Abrams', role: 'Czołg podstawowy · 4 załogi · armata 120 mm',
  kind: 'tracked',
  length: 9.77, hullLength: 7.93, width: 3.66, height: 2.44, wheelbase: 4.62, track: 2.8, gauge: 2.8,
  maxSpeed: 67 / 3.6, accel: 1.4, turnRadius: 0, cargo: 0, mass: 62000, work: 'Właz dowódcy',
  paints: [['Zieleń ochronna (WP)', 0x4b5232], ['Piaskowy CARC', 0xb39a6c], ['Zieleń NATO', 0x3d4630]],
  seat: { x: -0.7, y: 2.2, z: 0.1 },     // dowódca (prawa strona wieży)
  doorAt: { x: 2.3, z: 1.2 },            // przy lewej burcie, przy przednim błotniku
  gunPivot: { y: 1.93, z: 2.25 },        // czop armaty względem kadłuba (przy wieży na wprost)
  turretAt: { z: 0.35 },
};

const ZF = 3.97, ZB = -3.96;           // przód / tył kadłuba
const GX = info.gauge / 2;             // oś gąsienicy
const RW = 0.3175, T = 0.085;          // promień koła jezdnego, grubość gąsienicy
const WY = RW + T;                     // środek koła jezdnego nad ziemią (spoczynek)
const WHEELS = [2.2, 1.47, 0.73, 0, -0.73, -1.47, -2.2];
const IDLER = { z: 3.08, y: 0.63, R: 0.33 }, SPROCKET = { z: -3.33, y: 0.80, R: 0.355 }, ROLLERS = [{ z: 1.15, y: 1.07, R: 0.12 }, { z: -1.25, y: 1.09, R: 0.12 }];
const DECK = 1.53, SPON = 1.27, BELLY = 0.48, HWL = 1.08, HWU = 1.75;
const RING = 0.35, ROOF = 2.42;

export function build({ paint = info.paints[0][1], detail = 1, searchlight = false } = {}) {
  const M = roadMaterials(0x444444);
  const A = mattePaint(paint, { dirt: 0.16, rough: 0.86, seed: 5 });                  // pancerz
  const Ad = mattePaint(new THREE.Color(paint).multiplyScalar(0.84).getHex(), { dirt: 0.22, rough: 0.9, seed: 9 });   // ciemniejsze (osłony, kosze)
  const nonskid = mattePaint(new THREE.Color(paint).multiplyScalar(0.8).getHex(), { dirt: 0.25, rough: 0.98, seed: 13 }); nonskid.bumpMap = noiseMap(21, 512, 120); nonskid.bumpScale = 0.7; nonskid.metalness = 0;
  const metal = new THREE.MeshStandardMaterial({ color: 0x6b6a64, roughness: 0.55, metalness: 0.85, bumpMap: noiseMap(31, 256, 60), bumpScale: 0.4 });
  const worn = new THREE.MeshStandardMaterial({ color: 0x8d8a82, roughness: 0.38, metalness: 0.95 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x151514, roughness: 0.95, metalness: 0, bumpMap: noiseMap(41, 256, 40), bumpScale: 0.8 });
  const optic = new THREE.MeshPhysicalMaterial({ color: 0x0a2a30, roughness: 0.05, metalness: 0.3, clearcoat: 1, envMapIntensity: 2.5 });
  const lamp = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.15, metalness: 0.6, emissive: 0xfff2d8, emissiveIntensity: 0 });
  const tail = new THREE.MeshStandardMaterial({ color: 0x5a0a0a, roughness: 0.3, emissive: 0xff2010, emissiveIntensity: 0.05 });
  const grilleM = new THREE.MeshStandardMaterial({ color: 0x1d1e1a, roughness: 0.8, metalness: 0.4 });
  const group = new THREE.Group(); group.name = 'M1A2 Abrams';
  const body = new THREE.Group(); body.name = 'hull'; body.userData.part = true; group.add(body);
  const add = (parent, geo, mat, name, opts = {}) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = opts.shadow !== false; m.receiveShadow = true; parent.add(m); return m; };
  const box = (parent, w, h, d, mat, name, x, y, z, r = 0.015) => { const m = add(parent, roundBox(w, h, d, r, Math.min(r, 0.01), 2), mat, name); m.position.set(x, y, z); return m; };

  // ---------- kadłub: wanna między gąsienicami (z przednią płytą dolną i górną) i nadgąsienicowe półki ----------
  const gl = (y) => ZF - (y - 1.10) / (DECK - 1.10) * (ZF - 2.30);                 // płyta czołowa górna: z dla wysokości y
  add(body, sideExtrude([[ZF, 1.10], [3.32, BELLY], [-3.55, BELLY], [ZB, 0.64], [ZB, SPON], [gl(SPON), SPON]], -HWL, HWL, 0.02), A, 'lower hull');
  add(body, sideExtrude([[gl(SPON), SPON], [ZB + 0.02, SPON], [ZB + 0.02, DECK], [2.30, DECK]], -HWU, HWU, 0.02), A, 'upper hull');
  // przednie błotniki (pochylone, na zewnątrz wanny) i błotniki tylne
  for (const sx of [1, -1]) {
    const f = add(body, sideExtrude([[gl(SPON) - 0.02, SPON], [3.95, 1.13], [3.95, 1.10], [gl(SPON) - 0.02, SPON - 0.03]], 0, HWU - HWL - 0.02, 0), Ad, 'front fender');
    f.position.x = sx > 0 ? HWL + 0.01 : -HWU + 0.01;
    box(body, HWU - HWL - 0.04, 0.025, 0.42, Ad, 'rear fender', sx * (HWL + HWU) / 2, SPON - 0.02, ZB + 0.25, 0.008);
  }
  // pokład z powłoką przeciwpoślizgową, kratki silnika (tył), wydech
  const deck = add(body, new THREE.PlaneGeometry(HWU * 2 - 0.08, 6.0), nonskid, 'deck non-skid'); deck.rotation.x = -Math.PI / 2; deck.position.set(0, DECK + 0.024, -0.95); deck.material = decal(nonskid);
  for (let i = 0; i < 3; i++) {
    const g = box(body, 1.95, 0.03, 0.42, grilleM, 'engine deck grille', 0, DECK + 0.012, -2.35 - i * 0.48, 0.01);
    for (let k = 0; k < 11; k++) box(g, 0.012, 0.03, 0.4, metal, 'grille bar', -0.9 + k * 0.18, 0.012, 0, 0.004);
  }
  const exh = box(body, 2.0, 0.55, 0.06, grilleM, 'exhaust grille', 0, 1.02, ZB - 0.02, 0.015);
  for (let k = 0; k < 9; k++) box(exh, 1.94, 0.022, 0.08, metal, 'exhaust louvre', 0, -0.22 + k * 0.055, -0.02, 0.006);
  // właz kierowcy z peryskopami (przód, środek), wlewy paliwa, uchwyty holownicze, liny holownicze
  const glY = (z) => 1.10 + (ZF - z) / (ZF - 2.30) * (DECK - 1.10);           // wysokość płyty czołowej w z
  const drv = add(body, new THREE.CylinderGeometry(0.31, 0.33, 0.06, 28), A, "driver's hatch"); drv.position.set(0, glY(2.85) + 0.02, 2.85); drv.rotation.x = 0.25;
  for (let k = -1; k <= 1; k++) { const p = box(body, 0.17, 0.08, 0.1, A, 'driver periscope', k * 0.2, glY(3.25) + 0.035, 3.25, 0.012); p.rotation.y = -k * 0.35; box(p, 0.14, 0.045, 0.01, optic, 'periscope glass', 0, 0.0, 0.052, 0.003); }
  for (const sx of [1, -1]) {
    const cap = add(body, new THREE.CylinderGeometry(0.11, 0.11, 0.04, 20), metal, 'fuel cap'); cap.position.set(sx * 1.3, DECK + 0.02, -1.0);
    for (const z of [ZF - 0.08, ZB + 0.06]) { const t = add(body, new THREE.TorusGeometry(0.075, 0.025, 8, 16), metal, 'tow eye'); t.position.set(sx * 0.82, z > 0 ? 0.92 : 0.82, z > 0 ? z + 0.08 : z - 0.07); t.rotation.y = Math.PI / 2; }
    const cable = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * 1.55, DECK + 0.04, 1.6), new THREE.Vector3(sx * 1.6, DECK + 0.04, 0.2), new THREE.Vector3(sx * 1.55, DECK + 0.04, -1.6), new THREE.Vector3(sx * 1.45, DECK + 0.04, -1.9)]);
    add(body, new THREE.TubeGeometry(cable, 40, 0.022, 8, false), worn, 'tow cable');
    // reflektory z osłonami na przednich błotnikach, światła tylne
    const hl = new THREE.Group(); hl.name = 'headlight'; hl.userData.part = true; hl.position.set(sx * 1.45, SPON + 0.05, 3.55); body.add(hl);
    box(hl, 0.26, 0.17, 0.14, Ad, 'headlight housing', 0, 0.06, 0, 0.02);
    const lens = add(hl, new THREE.CylinderGeometry(0.055, 0.055, 0.02, 20), lamp, 'headlight lens'); lens.rotation.x = Math.PI / 2; lens.position.set(-sx * 0.05, 0.06, 0.075);
    const bo = add(hl, new THREE.CylinderGeometry(0.03, 0.03, 0.02, 14), tail, 'blackout marker'); bo.rotation.x = Math.PI / 2; bo.position.set(sx * 0.07, 0.06, 0.075);
    const guard = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.17, 0, 0.0), new THREE.Vector3(-0.15, 0.22, 0.12), new THREE.Vector3(0.15, 0.22, 0.12), new THREE.Vector3(0.17, 0, 0.0)]);
    add(hl, new THREE.TubeGeometry(guard, 16, 0.014, 6, false), Ad, 'headlight guard');
    const tl = box(body, 0.2, 0.14, 0.05, Ad, 'tail light housing', sx * 1.45, SPON + 0.1, ZB - 0.045, 0.01);
    box(tl, 0.08, 0.06, 0.012, tail, 'tail light', sx * -0.04, 0, -0.03, 0.004);
  }
  // ---------- osłony burt (fartuchy) — przednie trzy segmenty grubsze, dolna krawędź podniesiona z przodu ----------
  const skirt = new THREE.Group(); skirt.name = 'side skirts'; skirt.userData.part = true; body.add(skirt);
  const SEG = [[3.72, 3.1, 0.09], [3.1, 2.4, 0.09], [2.4, 1.7, 0.07], [1.7, 0.9, 0.04], [0.9, 0.1, 0.04], [0.1, -0.7, 0.04], [-0.7, -1.5, 0.04], [-1.5, -2.3, 0.04], [-2.3, -3.15, 0.04]];
  for (const sx of [1, -1]) for (const [z0, z1, t] of SEG) {
    const yb = z0 > 3 ? 0.78 : z0 > 2.4 ? 0.66 : 0.6;
    const prof = [[z0, yb + (z0 > 3 ? 0.12 : 0)], [z1, yb], [z1, DECK - 0.04], [z0, DECK - 0.04]];
    const g = add(skirt, sideExtrude(prof, 0, t, 0.006), z0 > 1.7 ? A : Ad, 'skirt panel');
    g.position.x = sx > 0 ? HWU + 0.005 : -HWU - t - 0.005;
    for (const zz of [z0 - 0.1, z1 + 0.1]) for (const yy of [yb + 0.12, DECK - 0.16]) { const b = add(skirt, new THREE.CylinderGeometry(0.018, 0.018, 0.02, 8), metal, 'skirt bolt'); b.rotation.z = Math.PI / 2; b.position.set(sx * (HWU + t + 0.012), yy, zz); }
  }
  // ---------- zawieszenie i koła ----------
  const lathe = (pts, seg = 32) => { const g = new THREE.LatheGeometry(pts.map(([r, x]) => new THREE.Vector2(r, x)), seg); g.rotateZ(-Math.PI / 2); return g; };
  // koło jezdne podwójne: dwie tarcze (wypukłe, z piastą) z bandażami gumowymi, szczelina na zęby prowadzące
  const disc = (o) => lathe([[0.05, o - 0.06], [0.16, o - 0.055], [RW - 0.035, o - 0.065], [RW - 0.035, o + 0.065], [0.16, o + 0.05], [0.07, o + 0.065], [0.05, o + 0.065], [0.05, o - 0.06]], 36);
  const tyreG = (o) => lathe([[RW - 0.036, o - 0.064], [RW - 0.004, o - 0.064], [RW, o - 0.058], [RW, o + 0.058], [RW - 0.004, o + 0.064], [RW - 0.036, o + 0.064], [RW - 0.036, o - 0.064]], 48);
  const roadWheelGeo = [disc(0.135), disc(-0.135)], tyreGeo = [tyreG(0.135), tyreG(-0.135)];
  const sides = [];
  for (const sx of [1, -1]) {
    const circles = [];
    const mk = (c, kind) => {
      const g = new THREE.Group(); g.name = kind; g.userData.part = true; g.position.set(sx * GX, c.y, c.z); group.add(g);
      const spin = new THREE.Group(); g.add(spin);
      if (kind === 'road wheel') {
        for (const geo of roadWheelGeo) add(spin, geo, Ad, 'road wheel disc');
        for (const geo of tyreGeo) add(spin, geo, rubber, 'road wheel tyre');
        const stub = add(spin, new THREE.CylinderGeometry(0.06, 0.06, 0.55, 12), metal, 'axle stub'); stub.rotation.z = Math.PI / 2; stub.position.x = -sx * 0.08;
        const hub = add(spin, new THREE.CylinderGeometry(0.07, 0.085, 0.07, 16), metal, 'hub cap'); hub.rotation.z = Math.PI / 2; hub.position.x = sx * 0.22;
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, b = add(spin, new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6), worn, 'wheel nut'); b.rotation.z = Math.PI / 2; b.position.set(sx * 0.205, Math.sin(a) * 0.12, Math.cos(a) * 0.12); }
        // wahacz drążka skrętnego (do kadłuba, w tył)
        const arm = add(g, roundBox(0.4, 0.1, 0.12, 0.03, 0.01, 2), metal, 'road arm'); arm.position.set(-sx * 0.26, 0.14, -0.05); arm.rotation.z = sx * 0.35;
      } else if (kind === 'idler') {
        for (const o of [0.17, -0.17]) { const d = add(spin, new THREE.CylinderGeometry(c.R, c.R, 0.1, 36), Ad, 'idler disc'); d.rotation.z = Math.PI / 2; d.position.x = o;
          for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, h = add(spin, new THREE.CylinderGeometry(0.06, 0.06, 0.13, 14), grilleM, 'idler hole'); h.rotation.z = Math.PI / 2; h.position.set(o, Math.sin(a) * 0.19, Math.cos(a) * 0.19); } }
        const hub = add(spin, new THREE.CylinderGeometry(0.09, 0.09, 0.5, 16), metal, 'idler hub'); hub.rotation.z = Math.PI / 2;
      } else if (kind === 'sprocket') {
        for (const o of [0.2, -0.2]) {   // wieniec z zębami
          const sh = new THREE.Shape(); const N = 11, r0 = c.R - 0.04, r1 = c.R + 0.045;
          for (let k = 0; k < N * 4; k++) { const a = k / (N * 4) * Math.PI * 2, r = (k % 4 === 1 || k % 4 === 2) ? r1 : r0; const p = [Math.cos(a) * r, Math.sin(a) * r]; if (k) sh.lineTo(...p); else sh.moveTo(...p); }
          const hole = new THREE.Path(); hole.absarc(0, 0, 0.12, 0, Math.PI * 2, true); sh.holes.push(hole);
          const g2 = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1 }); g2.rotateY(Math.PI / 2); g2.translate(o - 0.03, 0, 0);
          add(spin, g2, worn, 'sprocket ring');
        }
        const hub = add(spin, new THREE.CylinderGeometry(0.2, 0.24, 0.38, 20), Ad, 'final drive'); hub.rotation.z = Math.PI / 2;
        for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, b = add(spin, new THREE.CylinderGeometry(0.014, 0.014, 0.4, 6), metal, 'sprocket bolt'); b.rotation.z = Math.PI / 2; b.position.set(0, Math.sin(a) * 0.17, Math.cos(a) * 0.17); }
      } else {
        const r = add(spin, new THREE.CylinderGeometry(c.R, c.R, 0.5, 20), Ad, 'support roller'); r.rotation.z = Math.PI / 2;
        const ax = add(g, new THREE.CylinderGeometry(0.04, 0.04, 0.35, 10), metal, 'roller axle'); ax.rotation.z = Math.PI / 2; ax.position.x = -sx * 0.4;
      }
      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const C = { ...c, kind, group: g, spin, rest: c.y }; circles.push(C); return C;
    };
    mk(IDLER, 'idler'); for (const z of WHEELS) mk({ z, y: WY, R: RW }, 'road wheel'); mk(SPROCKET, 'sprocket'); for (const r of ROLLERS) mk(r, 'support roller');
    // ogniwa gąsienicy T158: korpus stalowy z dwoma sworzniami, poduszki gumowe, łączniki końcowe, ząb prowadzący
    const pitch = 0.19, count = 84;
    const shoe = roundBox(0.58, 0.05, 0.165, 0.012, 0.006, 1); shoe.translate(0, 0, 0);
    const pads = new THREE.BufferGeometry().copy(roundBox(0.26, 0.03, 0.12, 0.01, 0.005, 1)); const padR = pads.clone(); pads.translate(0.15, 0.035, 0); padR.translate(-0.15, 0.035, 0);
    const conn = roundBox(0.05, 0.06, 0.19, 0.01, 0.004, 1); const connR = conn.clone(); conn.translate(0.31, 0, 0); connR.translate(-0.31, 0, 0);
    const horn = roundBox(0.06, 0.13, 0.08, 0.015, 0.006, 1); horn.translate(0, -0.08, 0);
    const merge = (gs) => { const out = new THREE.BufferGeometry(); const pos = [], nor = [], idx = []; let off = 0; for (const g of gs) { const ng = g.index ? g : g; const p = ng.attributes.position, n = ng.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); } const ix = ng.index ? ng.index.array : [...Array(p.count).keys()]; for (const v of ix) idx.push(v + off); off += p.count; } out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setIndex(idx); return out; };
    const mSteel = new THREE.InstancedMesh(merge([shoe, conn, connR, horn]), metal, count); mSteel.name = 'track links';
    const mPads = new THREE.InstancedMesh(merge([pads, padR]), rubber, count); mPads.name = 'track pads';
    for (const m of [mSteel, mPads]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; group.add(m); }
    const track = makeTrack({ x: sx * GX, circles, count, pitch, thick: T, meshes: [mSteel, mPads] });
    sides.push({ sx, circles, track });
  }
  // wanna od spodu między burtami: osłony zawieszenia (amortyzatory przy 1., 2. i 7. kole)
  for (const sx of [1, -1]) for (const z of [WHEELS[0], WHEELS[1], WHEELS[6]]) { const s = add(body, new THREE.CylinderGeometry(0.06, 0.06, 0.45, 12), metal, 'shock absorber'); s.position.set(sx * (HWL + 0.02), 0.85, z - 0.2); s.rotation.x = 0.6; }

  // ---------- wieża ----------
  const turret = new THREE.Group(); turret.name = 'turret'; turret.userData.part = true; turret.position.set(0, DECK, RING); body.add(turret);
  const BOT = [[0.42, 2.10], [1.60, 1.05], [1.78, 0.55], [1.78, -1.50], [1.58, -2.50], [-1.58, -2.50], [-1.78, -1.50], [-1.78, 0.55], [-1.60, 1.05], [-0.42, 2.10]];
  const TOP = [[0.40, 1.92], [1.48, 0.98], [1.64, 0.52], [1.64, -1.46], [1.46, -2.42], [-1.46, -2.42], [-1.64, -1.46], [-1.64, 0.52], [-1.48, 0.98], [-0.40, 1.92]];
  const TH = ROOF - DECK;
  add(turret, prism(BOT, TOP, 0.0, TH), A, 'turret armour');
  // pierścień wieży (osłona szczeliny), dach z przeciwpoślizgiem
  add(turret, new THREE.CylinderGeometry(1.2, 1.24, 0.08, 40), Ad, 'turret ring guard').position.set(0, 0.0, 0);
  const roof = add(turret, new THREE.ShapeGeometry(new THREE.Shape(TOP.map(([x, z]) => new THREE.Vector2(x, -z)))), decal(nonskid), 'turret roof non-skid', { shadow: false });
  roof.rotation.x = -Math.PI / 2; roof.position.y = TH + 0.002; roof.scale.set(0.97, 0.97, 1);
  // kosz na tyle wieży (rama z prętów i siatka)
  const rack = new THREE.Group(); rack.name = 'bustle rack'; rack.userData.part = true; rack.position.set(0, 0.35, -2.5); turret.add(rack);
  const bar = (a, b, r = 0.016) => { const g = new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(...a), new THREE.Vector3(...b)), 1, r, 6, false); add(rack, g, Ad, 'rack bar'); };
  for (const y of [0.0, 0.25, 0.5]) { bar([1.55, y, 0], [1.55, y, -0.62]); bar([-1.55, y, 0], [-1.55, y, -0.62]); bar([1.55, y, -0.62], [-1.55, y, -0.62]); }
  for (let k = 0; k <= 8; k++) { const x = -1.55 + k * 3.1 / 8; bar([x, 0, -0.62], [x, 0.5, -0.62]); }
  for (const z of [-0.2, -0.42]) { bar([1.525, 0, z], [1.525, 0.5, z]); bar([-1.525, 0, z], [-1.525, 0.5, z]); }
  const floorR = add(rack, roundBox(3.1, 0.02, 0.62, 0.01, 0.005, 1), grilleM, 'rack floor'); floorR.position.set(0, 0.0, -0.31);
  // ładunek w koszu: plandeka, skrzynki, kanistry
  box(rack, 1.2, 0.36, 0.5, new THREE.MeshStandardMaterial({ color: 0x5a5a3a, roughness: 1, bumpMap: noiseMap(51, 256, 30), bumpScale: 1.5 }), 'rolled tarp', -0.6, 0.2, -0.32, 0.12);
  box(rack, 0.55, 0.3, 0.45, Ad, 'ammo box', 0.55, 0.16, -0.32, 0.02);
  box(rack, 0.35, 0.42, 0.18, Ad, 'jerrycan', 1.2, 0.22, -0.32, 0.03);
  // skrzynie na burtach wieży
  for (const sx of [1, -1]) {
    box(turret, 0.22, 0.38, 1.35, Ad, 'turret stowage box', sx * 1.86, 0.36, -0.75, 0.02);
    // wyrzutnie granatów dymnych (6 luf w dwóch rzędach)
    const sm = new THREE.Group(); sm.name = 'smoke grenade launcher'; sm.userData.part = true; sm.position.set(sx * 1.55, 0.72, 1.12); sm.rotation.y = sx * 0.55; turret.add(sm);
    box(sm, 0.42, 0.06, 0.24, Ad, 'launcher base', 0, -0.06, 0, 0.01);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) { const t = add(sm, new THREE.CylinderGeometry(0.04, 0.04, 0.22, 12, 1, true), Ad, 'launcher tube'); t.material = Ad.clone(); t.material.side = THREE.DoubleSide; t.rotation.x = Math.PI / 2 - 0.45 - r * 0.25; t.position.set(-0.13 + k * 0.13, 0.03 + r * 0.08, 0.02); add(t, new THREE.CircleGeometry(0.039, 12), grilleM, 'tube mouth').position.y = 0.07; t.children[0].rotation.x = -Math.PI / 2; }
  }
  // celownik działonowego (GPS — „budka” z prawej przodu), CITV dowódcy (z lewej przodu), wieżyczka dowódcy (prawa), właz ładowniczego (lewa)
  const gps = new THREE.Group(); gps.name = "gunner's primary sight"; gps.userData.part = true; gps.position.set(-0.75, TH, 1.25); turret.add(gps);
  add(gps, prism([[0.32, 0.38], [0.32, -0.3], [-0.32, -0.3], [-0.32, 0.38]], [[0.28, 0.26], [0.28, -0.26], [-0.28, -0.26], [-0.28, 0.26]], 0, 0.33), A, 'sight housing');
  const gw = add(gps, new THREE.PlaneGeometry(0.42, 0.2), optic, 'sight window'); gw.position.set(0, 0.17, 0.33); gw.rotation.x = -0.35;
  const citv = new THREE.Group(); citv.name = 'CITV'; citv.userData.part = true; citv.position.set(0.95, TH, 0.95); turret.add(citv);
  add(citv, new THREE.CylinderGeometry(0.13, 0.17, 0.35, 16), A, 'CITV pedestal').position.y = 0.17;
  const ch = box(citv, 0.42, 0.3, 0.42, A, 'CITV head', 0, 0.48, 0, 0.06); box(ch, 0.26, 0.14, 0.01, optic, 'CITV window', 0, 0.0, 0.215, 0.005);
  const cup = new THREE.Group(); cup.name = "commander's cupola"; cup.userData.part = true; cup.position.set(-0.7, TH, -0.15); turret.add(cup);
  add(cup, new THREE.CylinderGeometry(0.46, 0.5, 0.22, 24), A, 'cupola ring').position.y = 0.11;
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3, v = box(cup, 0.18, 0.09, 0.05, optic, 'vision block', Math.sin(a) * 0.47, 0.13, Math.cos(a) * 0.47, 0.01); v.rotation.y = a; }
  const hatch = new THREE.Group(); hatch.name = "commander's hatch"; hatch.userData.part = true; hatch.position.set(0, 0.22, -0.36); cup.add(hatch);
  const hl2 = add(hatch, new THREE.CylinderGeometry(0.36, 0.38, 0.07, 24), A, 'hatch lid'); hl2.position.set(0, 0.035, 0.36);
  // karabin M2 kal. .50 na wieżyczce
  const m2 = new THREE.Group(); m2.name = 'M2 .50 cal'; m2.userData.part = true; m2.position.set(0.0, 0.32, 0.25); cup.add(m2);
  box(m2, 0.14, 0.18, 0.65, grilleM, 'M2 receiver', 0, 0.08, 0, 0.01);
  const b2 = add(m2, new THREE.CylinderGeometry(0.03, 0.03, 1.1, 10), grilleM, 'M2 barrel jacket'); b2.rotation.x = Math.PI / 2; b2.position.set(0, 0.1, 0.85);
  box(m2, 0.18, 0.2, 0.3, Ad, 'ammo can', 0.18, 0.02, -0.05, 0.01);
  const loader = new THREE.Group(); loader.name = "loader's hatch"; loader.userData.part = true; loader.position.set(0.75, TH, -0.35); turret.add(loader);
  add(loader, new THREE.CylinderGeometry(0.38, 0.4, 0.06, 22), A, 'loader hatch lid').position.y = 0.03;
  const m240 = new THREE.Group(); m240.name = 'M240 machine gun'; m240.position.set(0.0, 0.25, 0.35); loader.add(m240);
  add(loader, new THREE.TorusGeometry(0.45, 0.025, 6, 24, Math.PI), metal, 'skate ring').rotation.x = -Math.PI / 2;
  box(m240, 0.09, 0.14, 0.55, grilleM, 'M240 receiver', 0, 0, 0, 0.01);
  const b3 = add(m240, new THREE.CylinderGeometry(0.018, 0.018, 0.65, 8), grilleM, 'M240 barrel'); b3.rotation.x = Math.PI / 2; b3.position.set(0, 0.02, 0.58);
  // maszt czujnika wiatru i anteny
  const wind = add(turret, new THREE.CylinderGeometry(0.018, 0.018, 0.55, 8), metal, 'wind sensor mast'); wind.position.set(0, TH + 0.27, -1.6);
  add(turret, new THREE.CylinderGeometry(0.04, 0.04, 0.05, 10), grilleM, 'wind sensor').position.set(0, TH + 0.56, -1.6);
  for (const sx of [1, -1]) { const ant = add(turret, new THREE.CylinderGeometry(0.006, 0.012, 2.6, 6), grilleM, 'radio antenna'); ant.position.set(sx * 1.25, TH + 1.3, -1.9); add(turret, new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), grilleM, 'antenna base').position.set(sx * 1.25, TH + 0.05, -1.9); }

  // ---------- armata M256 (osłona jarzma, osłona termiczna lufy, przedmuchiwacz, czujnik wylotu) ----------
  const gun = new THREE.Group(); gun.name = 'main gun'; gun.userData.part = true; gun.position.set(0, info.gunPivot.y - DECK, info.gunPivot.z - RING); turret.add(gun);
  add(gun, prism([[0.36, 0.42], [0.36, -0.1], [-0.36, -0.1], [-0.36, 0.42]], [[0.3, 0.36], [0.3, -0.1], [-0.3, -0.1], [-0.3, 0.36]], -0.28, 0.24), A, 'gun shield');
  const boot = add(gun, new THREE.CylinderGeometry(0.17, 0.21, 0.25, 20), Ad, 'mantlet boot'); boot.rotation.x = Math.PI / 2; boot.position.z = 0.52;
  const L0 = 0.6, L1 = 3.55;
  const sleeve = add(gun, new THREE.CylinderGeometry(0.115, 0.13, L1 - L0, 24), A, 'thermal sleeve'); sleeve.rotation.x = Math.PI / 2; sleeve.position.z = (L0 + L1) / 2;
  for (let k = 1; k < 5; k++) { const z = L0 + (L1 - L0) * k / 5; if (z > 1.15 && z < 1.95) continue; const c = add(gun, new THREE.CylinderGeometry(0.135, 0.135, 0.05, 24), Ad, 'sleeve clamp'); c.rotation.x = Math.PI / 2; c.position.z = z; }
  const fe = add(gun, new THREE.CylinderGeometry(0.16, 0.16, 0.62, 24), A, 'bore evacuator'); fe.rotation.x = Math.PI / 2; fe.position.z = 1.55;
  for (const z of [1.24, 1.86]) { const c = add(gun, new THREE.CylinderGeometry(0.14, 0.16, 0.06, 24), A, 'evacuator taper'); c.rotation.x = Math.PI / 2; c.position.z = z; }
  const muz = add(gun, new THREE.CylinderGeometry(0.1, 0.1, 0.12, 24), Ad, 'muzzle'); muz.rotation.x = Math.PI / 2; muz.position.z = L1 + 0.04;
  const bore = add(gun, new THREE.CircleGeometry(0.06, 24), decal(new THREE.MeshBasicMaterial({ color: 0x050505 })), 'bore', { shadow: false }); bore.position.z = L1 + 0.106;
  box(gun, 0.1, 0.07, 0.12, Ad, 'muzzle reference sensor', 0, 0.15, L1 - 0.02, 0.01);
  // współosiowy karabin (szczelina obok jarzma)
  const coax = add(gun, new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), grilleM, 'coaxial MG'); coax.rotation.x = Math.PI / 2; coax.position.set(0.25, 0.04, 0.45);

  // ---------- światło: reflektory ----------
  // reflektor szperacz (opcja searchlight): na wsporniku przy osłonie armaty, celuje razem z nią; silna, wąska wiązka
  let sl = null;
  if (searchlight) {
    const g = new THREE.Group(); g.name = 'searchlight'; g.userData.part = true; g.position.set(-0.62, 0.3, 0.05); gun.add(g);
    add(g, new THREE.BoxGeometry(0.22, 0.05, 0.3), Ad, 'searchlight bracket').position.set(0.12, -0.2, -0.05);
    const hs = add(g, new THREE.CylinderGeometry(0.2, 0.17, 0.34, 24, 1, true), Ad, 'searchlight housing'); hs.rotation.x = Math.PI / 2;
    const back = add(g, new THREE.CircleGeometry(0.17, 24), Ad, 'searchlight back'); back.position.z = -0.17; back.rotation.y = Math.PI;
    const rim = add(g, new THREE.TorusGeometry(0.195, 0.018, 8, 28), metal, 'searchlight rim'); rim.position.z = 0.17;
    const glassM = new THREE.MeshStandardMaterial({ color: 0xcfd6dc, roughness: 0.05, metalness: 0.2, emissive: 0xfff6e6, emissiveIntensity: 0 });
    const lens = add(g, new THREE.CircleGeometry(0.19, 28), glassM, 'searchlight lens'); lens.position.z = 0.16;
    for (let i = -2; i <= 2; i++) { const bar = add(g, new THREE.BoxGeometry(0.3, 0.008, 0.008), metal, 'searchlight grille'); bar.position.set(0, i * 0.065, 0.2); }
    const beam = new THREE.SpotLight(0xfff4e2, 0, 320, 0.13, 0.35, 1.6); beam.name = 'searchlight beam'; beam.position.set(0, 0, 0.2); beam.target.position.set(0, 0, 30); g.add(beam, beam.target);
    sl = { group: g, lens: glassM, beam };
  }
  const spot = new THREE.SpotLight(0xfff1d6, 0, 70, 0.55, 0.5, 1.5); spot.position.set(0, SPON + 0.15, 3.7); spot.target.position.set(0, 0, 22); spot.name = 'headlight beam'; body.add(spot, spot.target);

  // ---------- ruch: gąsienice, zawieszenie na podłożu, kołysanie kadłuba, wieża i armata, właz ----------
  const st = { y: 0, vy: 0, pitch: 0, vp: 0, roll: 0, vr: 0, last: 0, ax: 0, turret: 0, gun: 0, hatch: 0 };
  function update(t, dt, opts = {}) {
    dt = Math.min(dt, 0.05);
    const v = opts.speed || 0, w = opts.turn || 0, contact = opts.contact || (() => 0);
    // gąsienice: lewa (x>0) i prawa przy obrocie w miejscu biegną przeciwnie; dodatni turn = w lewo
    for (const s of sides) s.track.update(dt, v - s.sx * w * GX);
    // koła jezdne: każde na swoim podłożu w granicach skoku (drążki skrętne)
    let sy = 0, sx2 = 0, sz = 0, sxx = 0, szz = 0, sxy = 0, szy = 0, n = 0;
    for (const s of sides) for (const c of s.circles) { if (c.kind !== 'road wheel') continue; c.h = contact(s.sx * GX, c.z); sy += c.h; sx2 += s.sx * GX; sz += c.z; sxx += GX * GX; szz += c.z * c.z; sxy += s.sx * GX * c.h; szy += c.z * c.h; n++; }
    const mx = sx2 / n, mz = sz / n, my = sy / n;
    const gx = (sxy - n * mx * my) / Math.max(1e-6, sxx - n * mx * mx), gz = (szy - n * mz * my) / Math.max(1e-6, szz - n * mz * mz);
    const acc = (v - st.last) / Math.max(1e-3, dt); st.last = v; st.ax += (acc - st.ax) * Math.min(1, 5 * dt);
    const tY = my, tP = -Math.atan(gz) - Math.max(-0.04, Math.min(0.04, st.ax * 0.012)), tR = Math.atan(gx) + Math.max(-0.03, Math.min(0.03, v * w * 0.004));
    const spring = (k, c, vel, x, target) => (target - x) * k - vel * c;
    st.vy += spring(90, 14, st.vy, st.y, tY) * dt; st.y += st.vy * dt;
    st.vp += spring(60, 9, st.vp, st.pitch, tP) * dt; st.pitch += st.vp * dt;
    st.vr += spring(70, 11, st.vr, st.roll, tR) * dt; st.roll += st.vr * dt;
    body.position.y = st.y; body.rotation.set(st.pitch, 0, st.roll, 'YXZ');
    for (const s of sides) for (const c of s.circles) {
      if (c.kind !== 'road wheel') continue;
      const bodyAt = st.y - c.z * Math.tan(st.pitch) + s.sx * GX * Math.tan(st.roll);
      c.y = WY + Math.max(bodyAt - 0.1, Math.min(bodyAt + 0.38, c.h));
      c.group.position.y = c.y;
    }
    // koła na kadłubie (napinające, napędowe, rolki) jadą z nim
    for (const s of sides) for (const c of s.circles) {
      if (c.kind === 'road wheel') continue;
      c.y = c.rest + st.y - c.z * Math.tan(st.pitch) + s.sx * GX * Math.tan(st.roll); c.group.position.y = c.y;
    }
    // wieża i armata (zakresy: armata −9°…+20°), z ograniczoną prędkością obrotu
    const tw = opts.turret ?? st.turret, tg = Math.max(-0.157, Math.min(0.35, opts.gun ?? 0));
    let d = ((tw - st.turret + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    st.turret += Math.max(-0.8 * dt, Math.min(0.8 * dt, d)); turret.rotation.y = st.turret;
    st.gun += Math.max(-0.4 * dt, Math.min(0.4 * dt, tg - st.gun)); gun.rotation.x = -st.gun;
    // właz dowódcy
    st.hatch += ((opts.work ? 1 : 0) - st.hatch) * Math.min(1, 3 * dt); hatch.rotation.x = -1.9 * st.hatch * st.hatch * (3 - 2 * st.hatch);
    // światła
    lamp.emissiveIntensity = opts.lights ? 3 : 0; spot.intensity = opts.lights ? 50 : 0;
    if (sl) { sl.lens.emissiveIntensity = opts.searchlight ? 8 : 0; sl.beam.intensity = opts.searchlight ? 40000 : 0; }
    tail.emissiveIntensity = opts.brake ? 3 : opts.lights ? 1 : 0.05;
  }
  update(0, 0.016, {});
  group.traverse((o) => { if (o.isMesh && o.geometry && !o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); });
  return {
    def: info, group, body, turret, gun, hatch, searchlight: sl, parts: { body, turret, gun, hatch, sides, tracks: sides },
    materials: { armour: A, armourDark: Ad, nonskid }, update, rig: { state: st },
    setPaint(c) { for (const [m, k] of [[A, 1], [Ad, 0.84], [nonskid, 0.8]]) { const x = mattePaint(new THREE.Color(c).multiplyScalar(k).getHex(), { dirt: 0.18, rough: 0.86, seed: 5 }); m.map = x.map; m.needsUpdate = true; } },
    dispose() { group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); },
  };
}
