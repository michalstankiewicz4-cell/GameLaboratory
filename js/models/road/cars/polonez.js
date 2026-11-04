// FSO Polonez 1500 (MR'78, 1978–1986): pięciodrzwiowy liftback, napęd na tył, silnik 1,5 l.
// Wymiary fabryczne (1 jednostka = 1 m): długość 4272, szerokość 1650, wysokość 1379, rozstaw osi 2509,
// rozstaw kół przód 1314 / tył 1292, zwis przedni 742 / tylny 1021 mm, opony 175/70 R13.
// Notatki rekonstrukcji: docs/models/road/polonez.md.
// Nadwozie z przekrojów poprzecznych (stacje wzdłuż Z): otwory okien z szybami i wnętrzem za nimi,
// nadkola z nadkolami wewnętrznymi, drzwi kierowcy osobno (na zawiasie), linie podziału blach, zderzaki
// owinięte na narożnikach, reflektory i lampy ze światłem, tablice z PRL, wnętrze (deska, kierownica, fotele).
import * as THREE from '../../../../vendor/three/three.module.js';
import { curve, lin, smooth, loftParts, offsetAlongNormals, ribbon, roundBox, sweepFlat, capFan, fixOutward, wheel } from '../geom.js';
import { roadMaterials, plateMaterial, decal } from '../materials.js';
import { makeRig } from '../chassis.js';

export const info = {
  id: 'polonez', name: 'FSO Polonez 1500', role: 'Liftback, 5 drzwi, 5 miejsc · FSO Warszawa, 1978',
  length: 4.272, width: 1.65, height: 1.379, wheelbase: 2.509, trackF: 1.314, trackR: 1.292,
  maxSpeed: 155 / 3.6, accel: 1.9, turnRadius: 5.4, cargo: 0.4, mass: 1100, work: 'Drzwi kierowcy',
  paints: [['Czerwony', 0x8e1c1a], ['Kość słoniowa', 0xd9cba6], ['Biały', 0xe4e2db], ['Niebieski', 0x274a7c], ['Zielony', 0x37503b], ['Brąz', 0x523523], ['Srebrny', 0xa9adb0]],
  seat: { x: 0.36, y: 0.62, z: -0.05 },   // miejsce kierowcy (wsiadanie)
  doorAt: { x: 1.25, z: 0.45 },           // gdzie stanąć, by wsiąść (lewa strona)
};

const ZF = 2.05, ZR = -2.05;                     // przód / tył blach nadwozia (zderzaki wystają do ±2.136)
const AXF = 2.136 - 0.742, AXR = AXF - 2.509;    // osie
const WR = 0.288, ARCH = 0.37;                   // promień koła, promień nadkola
const HW = 0.822;                                 // połowa szerokości nadwozia
const Z = { cowl: 0.95, wsTop: 0.18, roofEnd: -0.93, hatchLow: -1.97, doorF: 1.0, doorB: 0.0, doorR: -0.80, bPillar: [-0.06, 0.03], cPillar: [-1.11, -0.86] };

// profil boczny: góra (maska, szyba, dach, klapa)
const yTop = curve([[ZR, 0.905], [-2.025, 0.955], [-1.95, 0.985], [-1.6, 1.12], [-1.2, 1.268], [-0.95, 1.343], [-0.7, 1.372], [-0.2, 1.379], [0.12, 1.368], [0.3, 1.3], [0.62, 1.115], [0.92, 0.93], [1.06, 0.898], [1.6, 0.862], [1.9, 0.834], [2.015, 0.805], [ZF, 0.775]]);
const beltL = lin([[ZR, 0.862], [-1.92, 0.93], [Z.cowl, 0.905], [ZF, 0.86]]);
const yBelt = (z) => Math.min(beltL(z), yTop(z) - 0.004);
const yFloor = lin([[ZR, 0.31], [-1.8, 0.215], [1.75, 0.205], [ZF, 0.285]]);
const crownF = lin([[ZR, 0.012], [-1.9, 0.016], [-0.9, 0.024], [0.2, 0.024], [1.0, 0.03], [ZF, 0.02]]);
const ySill = 0.215, yLow = 0.36, yMid = 0.6;
function hw(z) {   // połowa szerokości w planie, z zaokrąglonymi narożnikami
  const rp = z > 0 ? 0.15 : 0.13, end = z > 0 ? ZF : -ZR, d = Math.max(0, Math.abs(z) - (end - rp));
  return HW - (rp - Math.sqrt(Math.max(0, rp * rp - d * d)));
}
const archY = (z) => { for (const a of [AXF, AXR]) { const d = z - a; if (Math.abs(d) < ARCH) return WR + Math.sqrt(ARCH * ARCH - d * d); } return null; };
const inArch = (z) => archY(z) != null;
const ROOF_HALF = 0.655, Y_ROOF = 1.379;

// przekrój (połowa, x ≥ 0): 14 punktów od środka podłogi do środka dachu; inset > 0 — powłoka wewnętrzna
function section(z, inset = 0) {
  const h = hw(z), top = yTop(z), belt = yBelt(z), crown = crownF(z), ay = archY(z);
  const q = smooth(Math.max(0, Math.min(1, (top - belt) / (Y_ROOF - 0.905))));
  const xEdge = h * 0.975 + (ROOF_HALF * h / HW - h * 0.975) * q;
  const P = [];
  const fl = yFloor(z);
  P[0] = [0, fl];
  P[1] = [Math.min(0.5, h - 0.28), fl];
  if (ay != null) { P[2] = [0.52, ay]; P[3] = [h * 0.985, ay]; } else { P[2] = [h * 0.93, ySill - 0.005]; P[3] = [h * 0.975, ySill + 0.03]; }
  P[4] = [h, Math.max(yLow, (ay ?? 0) + 0.03)];
  P[5] = [h, Math.max(yMid, P[4][1] + 0.04)];
  P[6] = [h * 0.99, belt - 0.035];
  P[7] = [h * 0.975, belt];
  P[10] = [xEdge, top - 0.012];
  P[8] = [P[7][0] + (P[10][0] - P[7][0]) * 0.07, P[7][1] + (P[10][1] - P[7][1]) * 0.07];
  P[9] = [P[7][0] + (P[10][0] - P[7][0]) * 0.93, P[7][1] + (P[10][1] - P[7][1]) * 0.93];
  const roofY = (x) => top + crown * (1 - (x / Math.max(0.01, xEdge)) ** 2);
  P[11] = [xEdge * 0.82, roofY(xEdge * 0.82)];
  P[12] = [xEdge * 0.45, roofY(xEdge * 0.45)];
  P[13] = [0, roofY(0)];
  if (inset) {   // wnętrze: ten sam kształt odsunięty do środka (wykładzina, nadkola wewnętrzne, boczki, podsufitka)
    for (const p of P) { if (p[0] > 0) p[0] = Math.max(0, p[0] - inset); }
    for (let k = 0; k <= 3; k++) P[k][1] += inset;
    for (let k = 10; k <= 13; k++) P[k][1] -= inset * 0.8;
  }
  return P;
}
// pierścień: lewa połowa (x > 0, punkty 0..13), potem prawa (12..1); punkt 0 wspólny
const HALF = 14, RING = 26;
const halfOf = (r) => (r < HALF ? r : RING - r);
const sideOf = (r) => (r < 13 ? 1 : -1);          // strona czworokąta między r i r+1
const bandOf = (r) => (r < 13 ? r : RING - (r + 1));
function ring(z, inset = 0) {
  const P = section(z, inset), out = [];
  for (let k = 0; k < HALF; k++) out.push(new THREE.Vector3(P[k][0], P[k][1], z));
  for (let k = 12; k >= 1; k--) out.push(new THREE.Vector3(-P[k][0], P[k][1], z));
  return out;
}
// stacje: co 3,5 cm, gęściej przy końcach, dokładnie na krawędziach okien, drzwi i nadkoli
function stations() {
  const s = [];
  for (let z = ZR; z <= ZF + 1e-6; z += 0.035) s.push(z);
  for (let k = 0; k <= 8; k++) { s.push(ZF - 0.15 * (1 - Math.cos(k / 8 * Math.PI / 2))); s.push(ZR + 0.13 * (1 - Math.cos(k / 8 * Math.PI / 2))); }
  for (const a of [AXF, AXR]) { for (let k = -12; k <= 12; k++) s.push(a + ARCH * Math.sin(k / 12 * Math.PI / 2)); s.push(a - ARCH - 0.002, a + ARCH + 0.002); }
  s.push(Z.cowl, Z.wsTop, Z.roofEnd, Z.hatchLow, Z.doorF, Z.doorB, Z.doorR, ...Z.bPillar, ...Z.cPillar, 0.93, 0.2, -0.95, -1.9, 0.02);
  s.push(ZF, ZR);
  s.sort((a, b) => a - b);
  return s.filter((z, i) => z >= ZR - 1e-6 && z <= ZF + 1e-6 && (i === 0 || z - s[i - 1] > 0.004));
}

// gdzie są otwory i części (według stacji z i pasa przekroju)
const W = {
  frontWin: [0.03, 0.93], rearWin: [-0.80, -0.06], louver: Z.cPillar,
  shield: [0.2, 0.93], hatch: [-1.9, -0.95],
};
const inZ = (z, [a, b]) => z > a && z < b;
function holeOf(z, band, side) {
  if (band === 8) { if (inZ(z, W.frontWin)) return 'winF' + (side > 0 ? 'L' : 'R'); if (inZ(z, W.rearWin)) return 'winR' + (side > 0 ? 'L' : 'R'); if (inZ(z, W.louver)) return 'louver' + (side > 0 ? 'L' : 'R'); }
  if (band >= 11 && band <= 12) { if (inZ(z, W.shield)) return 'shield'; if (inZ(z, W.hatch)) return 'hatch'; }
  return null;
}
const isDoor = (z, band, side) => side > 0 && z > Z.doorB + 0.0005 && z < Z.doorF - 0.0005 && band >= 3 && band <= 9;
function skinOf(z, band, side) {
  const arch = inArch(z);
  if (band <= 1) return arch && band === 1 ? 'liner' : 'under';
  if (band === 2) return arch ? 'liner' : 'under';
  if (band === 7 || band === 9) { if (inZ(z, W.frontWin) || inZ(z, W.rearWin)) return 'seal'; }
  if (band === 8 && (inZ(z, Z.bPillar) || (z < -0.06 && z > -0.86 && !inZ(z, W.rearWin)))) return 'pillar';
  return 'paint';
}

export function build({ paint = info.paints[0][1], plate = 'WAP 1978', detail = 1 } = {}) {
  const M = roadMaterials(paint), group = new THREE.Group(), body = new THREE.Group();
  group.name = 'FSO Polonez'; body.name = 'body'; body.userData.part = true; group.add(body);
  const add = (parent, geo, mat, name, opts = {}) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = opts.shadow !== false; m.receiveShadow = true; parent.add(m); return m; };
  const st = stations(), outer = st.map((z) => ring(z)), inner = st.map((z) => ring(z, 0.045));
  const zc = (i) => (st[i] + st[i + 1]) / 2;
  const outward = (c, n) => n.x * c.x + n.y * (c.y - 0.72) < 0;      // normalna na zewnątrz przekroju
  const inward = (c, n) => !outward(c, n);
  const uvZ = (i, j) => [st[i] / 4.272 + 0.5, halfOf(j) / 13];

  // ---------- poszycie zewnętrzne (z otworami okien i bez drzwi kierowcy) ----------
  const skin = loftParts(outer, (i, j, c) => { const z = zc(i), b = bandOf(j), s = sideOf(j); if (holeOf(z, b, s) || isDoor(z, b, s)) return null; return skinOf(z, b, s); }, { orient: outward, uv: uvZ });
  const SK = { paint: M.paint, under: M.under, liner: M.liner, seal: M.rubber, pillar: M.black };
  for (const k in skin) add(body, skin[k], SK[k], 'body ' + k);
  // ściany czołowe: przód i tył nadwozia (blacha), pod lampami
  add(body, capFan(outer[outer.length - 1], new THREE.Vector3(0, 0, 1)), M.paint, 'front panel');
  add(body, capFan(outer[0], new THREE.Vector3(0, 0, -1)), M.paint, 'tail panel');
  // szyby (w otworach, 3 mm pod licem — uszczelka wystaje), maskownice słupków C
  const glassParts = loftParts(outer, (i, j) => { const h = holeOf(zc(i), bandOf(j), sideOf(j)); return h && !h.startsWith('louver') && !(h === 'winFL') ? h : null; }, { orient: outward });
  for (const k in glassParts) { const m = add(body, offsetAlongNormals(glassParts[k], -0.003), M.glass, 'glass ' + k, { shadow: false }); m.renderOrder = 2; }
  const louver = loftParts(outer, (i, j) => { const h = holeOf(zc(i), bandOf(j), sideOf(j)); return h && h.startsWith('louver') ? h : null; },
    { orient: outward, uv: (i, j) => [(st[i] - Z.cPillar[0]) / (Z.cPillar[1] - Z.cPillar[0]), halfOf(j) === 8 ? 0 : 1] });
  for (const k in louver) add(body, louver[k], M.louver, 'c-pillar louvre ' + k);

  // ---------- kabina: powłoka wewnętrzna (podsufitka, boczki), też z otworami ----------
  const cab = (z) => z > -2.0 && z < Z.cowl;
  const lining = loftParts(inner, (i, j) => {
    const z = zc(i), b = bandOf(j), s = sideOf(j); if (!cab(z)) return null;
    const h = holeOf(z, b, s); if (h && !h.startsWith('louver')) return null; if (isDoor(z, b, s)) return null;
    return b >= 10 ? 'headliner' : b <= 2 ? 'carpet' : 'trim';
  }, { orient: inward });
  add(body, lining.headliner, M.headliner, 'headliner'); add(body, lining.trim, M.trim, 'door cards'); add(body, lining.carpet, M.carpet, 'carpet');
  // tylna ściana bagażnika (od środka) i jej odpowiednik z przodu za deską
  const iLast = st.findIndex((z) => z > -2.0) , iFirst = st.findIndex((z) => z >= Z.cowl) - 1;
  add(body, capFan(inner[iLast], new THREE.Vector3(0, 0, 1)), M.trim, 'boot rear wall');
  add(body, capFan(inner[Math.max(iLast + 1, iFirst)], new THREE.Vector3(0, 0, -1)), M.dash, 'footwell front');
  // obrzeża otworów okien: guma łącząca poszycie z wnętrzem (z zewnątrz w szczelinie nie widać pustki)
  const reveal = (holeTest, mat, name, parent = body) => {
    const pos = [];
    for (let i = 0; i < st.length - 1; i++) for (let j = 0; j < RING; j++) {
      const z = zc(i); if (!holeTest(z, bandOf(j), sideOf(j))) continue;
      const nb = [[i, j - 1, 'j'], [i, j + 1, 'j1'], [i - 1, j, 'i'], [i + 1, j, 'i1']];
      for (const [ii, jj, e] of nb) {
        const ok = ii >= 0 && ii < st.length - 1 && holeTest(zc(ii), bandOf((jj + RING) % RING), sideOf((jj + RING) % RING));
        if (ok) continue;
        const j1 = (j + 1) % RING;
        const [a, b] = e === 'j' ? [[i, j], [i + 1, j]] : e === 'j1' ? [[i, j1], [i + 1, j1]] : e === 'i' ? [[i, j], [i, j1]] : [[i + 1, j], [i + 1, j1]];
        const A = outer[a[0]][a[1]], B = outer[b[0]][b[1]], C = inner[b[0]][b[1]], D = inner[a[0]][a[1]];
        pos.push(A.x, A.y, A.z, B.x, B.y, B.z, C.x, C.y, C.z, A.x, A.y, A.z, C.x, C.y, C.z, D.x, D.y, D.z);
      }
    }
    if (!pos.length) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    const m = add(parent, g, mat, name); m.material = mat.clone(); m.material.side = THREE.DoubleSide; return m;
  };
  reveal((z, b, s) => { const h = holeOf(z, b, s); return h && !h.startsWith('louver') && !(z > Z.doorB && z < Z.doorF && s > 0); }, M.rubber, 'window seals');
  // podłoga kabiny i ściana grodzi
  const bulk = add(body, roundBox(1.5, 0.55, 0.03, 0.02, 0.006), M.dash, 'bulkhead'); bulk.position.set(0, 0.6, 0.94);

  // ---------- drzwi kierowcy: poszycie, szyba, boczek, krawędzie — na zawiasie przy przedniej krawędzi ----------
  const hingeZ = Z.doorF, hingeX = hw(hingeZ) * 0.99;
  const door = new THREE.Group(); door.name = 'driver door'; door.userData.part = true; door.position.set(hingeX, 0, hingeZ); body.add(door);
  const doorSkin = loftParts(outer, (i, j) => { const z = zc(i), b = bandOf(j), s = sideOf(j); if (!isDoor(z, b, s)) return null; return holeOf(z, b, s) ? 'glass' : skinOf(z, b, s); }, { orient: outward });
  const doorIn = loftParts(inner, (i, j) => { const z = zc(i), b = bandOf(j), s = sideOf(j); if (!isDoor(z, b, s) || holeOf(z, b, s)) return null; return 'card'; }, { orient: inward });
  const toDoor = (g) => { g.translate(-hingeX, 0, -hingeZ); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { p.setZ(k, p.getZ(k) * 0.99 - 0.004); p.setY(k, 0.62 + (p.getY(k) - 0.62) * 0.985); } p.needsUpdate = true; return g; };   // szczelina 3 mm wokół
  for (const k in doorSkin) { const g = toDoor(doorSkin[k]); const m = add(door, k === 'glass' ? offsetAlongNormals(g, -0.003) : g, k === 'glass' ? M.glass : SK[k], 'door ' + k, { shadow: k !== 'glass' }); if (k === 'glass') m.renderOrder = 2; }
  add(door, toDoor(doorIn.card), M.trim, 'door card');
  const dseal = reveal((z, b, s) => isDoor(z, b, s), M.black, 'door edge', door); if (dseal) { toDoor(dseal.geometry); dseal.geometry.computeVertexNormals(); }
  const dwin = reveal((z, b, s) => isDoor(z, b, s) && holeOf(z, b, s), M.rubber, 'door window seal', door); if (dwin) toDoor(dwin.geometry);
  const jamb = reveal((z, b, s) => isDoor(z, b, s), M.black, 'door jamb');
  const handleD = add(door, roundBox(0.12, 0.022, 0.012, 0.008, 0.003), M.chrome, 'door handle'); handleD.position.set(0.018, 0.80, Z.doorB + 0.12 - hingeZ); handleD.rotation.y = Math.PI / 2;
  const dLock = add(door, new THREE.CylinderGeometry(0.009, 0.009, 0.01, 12), M.chrome, 'door lock'); dLock.rotation.z = Math.PI / 2; dLock.position.set(0.02, 0.80, Z.doorB + 0.2 - hingeZ);
  // lusterko boczne na drzwiach kierowcy
  const mir = new THREE.Group(); mir.name = 'mirror'; mir.userData.part = true; mir.position.set(0.05, 0.93, 0.88 - hingeZ); door.add(mir);
  const arm = add(mir, roundBox(0.09, 0.025, 0.04, 0.01, 0.004), M.black, 'mirror arm'); arm.position.set(0.04, 0, 0);
  const head = add(mir, roundBox(0.15, 0.09, 0.06, 0.03, 0.008), M.black, 'mirror housing'); head.position.set(0.12, 0.02, 0);
  const mglass = add(mir, new THREE.PlaneGeometry(0.13, 0.07), M.chrome, 'mirror glass'); mglass.position.set(0.12, 0.02, -0.036); mglass.rotation.y = Math.PI;
  const doorCtl = { set(t) { door.rotation.y = -1.15 * smooth(t); } };

  // ---------- linie podziału blach (wstęgi 4 mm, ciemne) ----------
  const ptOn = (z, b, f = 0, side = 1) => { const P = section(z), a = P[b], c = P[Math.min(13, b + 1)]; return new THREE.Vector3(side * (a[0] + (c[0] - a[0]) * f), a[1] + (c[1] - a[1]) * f, z); };
  const nOn = (z, b, side = 1) => { const P = section(z), a = P[Math.max(0, b - 1)], c = P[Math.min(13, b + 1)]; const tx = c[0] - a[0], ty = c[1] - a[1], l = Math.hypot(tx, ty) || 1; return new THREE.Vector3(side * ty / l, -tx / l, 0).normalize(); };
  const LINE = decal(M.liner), CHROME_D = decal(M.chrome); LINE.side = THREE.DoubleSide; CHROME_D.side = THREE.DoubleSide;
  const line = (pts, nrm, name, w = 0.004) => add(body, ribbon(pts, nrm, w, 0.0015), LINE, name, { shadow: false });
  const vline = (z, b0, b1, side, name) => { const p = [], n = []; for (let b = b0; b <= b1; b++) for (const f of b < b1 ? [0, 0.5] : [0]) { p.push(ptOn(z, b, f, side)); n.push(nOn(z, b, side)); } line(p, n, name); };
  const zline = (z0, z1, b, f, side, name) => { const p = [], n = []; for (let z = z0; z <= z1 + 1e-6; z += 0.04) { p.push(ptOn(z, b, f, side)); n.push(nOn(z, b, side)); } line(p, n, name); };
  for (const side of [1, -1]) {
    if (side < 0) { vline(Z.doorF, 3, 7, side, 'shut line front door'); vline(Z.doorB, 3, 10, side, 'shut line B'); }
    else vline(Z.doorB - 0.004, 3, 10, side, 'shut line B');
    vline(Z.doorR, 3, 7, side, 'shut line rear door');
    zline(Z.doorR, side > 0 ? Z.doorB : Z.doorF, 3, 0.2, side, 'shut line sill');
    zline(Z.cowl + 0.02, ZF - 0.03, 10, 0.6, side, 'shut line bonnet');
    zline(-2.06, Z.roofEnd, 10, 0.3, side, 'shut line hatch');
  }
  { const p = [], n = []; for (let x = -0.72; x <= 0.72; x += 0.04) { const z = Z.cowl + 0.03; const P = section(z); p.push(new THREE.Vector3(x, P[13][1] - 0.02 * (x / 0.72) ** 2 + 0.001, z)); n.push(new THREE.Vector3(0, 1, 0)); } line(p, n, 'shut line cowl'); }
  // listwa rynienki dachu (chrom) nad drzwiami
  for (const side of [1, -1]) { const p = [], n = []; for (let z = Z.roofEnd + 0.03; z <= Z.wsTop + 0.15; z += 0.04) { p.push(ptOn(z, 10, 0, side)); n.push(nOn(z, 10, side)); } add(body, ribbon(p, n, 0.012, 0.003), CHROME_D, 'drip rail'); }
  // ramki szyb bocznych (chrom)
  for (const side of [1, -1]) for (const [z0, z1] of [W.frontWin, W.rearWin]) {
    if (side > 0 && z0 === W.frontWin[0]) continue;   // przednie lewe na drzwiach
    for (const b of [8, 9]) { const p = [], n = []; for (let z = z0 + 0.005; z <= z1 - 0.005; z += 0.03) { p.push(ptOn(z, b, 0, side)); n.push(nOn(z, b, side)); } add(body, ribbon(p, n, 0.01, 0.004), CHROME_D, 'window trim'); }
  }
  // listwy boczne (czarne, z chromowanym wkładem) na wysokości 0.48 m, między nadkolami
  for (const side of [1, -1]) {
    const path = []; for (let z = AXR + ARCH + 0.02; z <= AXF - ARCH - 0.02; z += 0.05) path.push([side * (hw(z) + 0.003), z]);
    if (side < 0) path.reverse();
    const g = sweepFlat(path, [[-0.004, 0.462], [0.008, 0.465], [0.016, 0.478], [0.016, 0.49], [0.008, 0.503], [-0.004, 0.506]]);
    add(body, g, M.plastic, 'side moulding');
    const g2 = sweepFlat(path, [[0.0, 0.482], [0.0185, 0.482], [0.0185, 0.486], [0.0, 0.486]]); add(body, g2, CHROME_D, 'moulding insert');
  }

  // ---------- przód: zderzak, reflektory, atrapa, kierunkowskazy, tablica ----------
  const frontZ = ZF;
  const bumper = (front) => {
    const s = front ? 1 : -1, zEnd = front ? frontZ : ZR, wrapZ = front ? AXF + ARCH + 0.05 : AXR - ARCH - 0.05;
    const path = [];
    const rc = 0.17, cx = HW - rc, cz = zEnd - s * rc;    // narożnik: łuk wokół zaokrąglenia nadwozia
    for (let k = 0; k <= 10; k++) { const z = wrapZ + (cz - wrapZ) * (k / 10); path.push([hw(z) + 0.002, z]); }
    for (let k = 1; k <= 12; k++) { const a = (k / 12) * Math.PI / 2; path.push([cx + (rc + 0.002) * Math.cos(a), cz + s * (rc + 0.002) * Math.sin(a)]); }
    for (let k = 1; k <= 8; k++) path.push([cx * (1 - k / 8), zEnd + s * 0.002]);
    const half = path.slice(); const full = half.concat(half.slice(0, -1).reverse().map(([x, z]) => [-x, z]));
    // kierunek obiegu: przód — od lewej do prawej (zewnętrze z prawej strony ścieżki)
    const P = front ? full : full.map(([x, z]) => [-x, z]);
    const g = sweepFlat(P, [[-0.03, 0.28], [0.03, 0.285], [0.07, 0.31], [0.085, 0.36], [0.088, 0.42], [0.075, 0.47], [0.04, 0.492], [-0.03, 0.495]]);
    add(body, g, M.plastic, front ? 'front bumper' : 'rear bumper');
    const g2 = sweepFlat(P, [[0.084, 0.408], [0.093, 0.41], [0.093, 0.424], [0.084, 0.426]]); add(body, g2, CHROME_D, front ? 'front bumper strip' : 'rear bumper strip');
    return P;
  };
  bumper(true); bumper(false);
  const lampBlock = (name, w, h, x, y, z, mat, s = 1, depth = 0.05) => {
    const g = new THREE.Group(); g.name = name; g.userData.part = true; g.position.set(x, y, z); body.add(g);
    const hous = add(g, roundBox(w + 0.02, h + 0.02, depth, 0.012, 0.004), M.chrome, name + ' bezel'); hous.position.z = -s * depth / 2 + s * 0.004;
    const face = add(g, new THREE.PlaneGeometry(w, h), mat, name + ' lamp', { shadow: false }); face.position.z = s * 0.0055; if (s < 0) face.rotation.y = Math.PI;
    const lens = add(g, new THREE.PlaneGeometry(w, h), M.lens, name + ' lens', { shadow: false }); lens.position.z = s * 0.0085; if (s < 0) lens.rotation.y = Math.PI; lens.renderOrder = 3;
    return face;
  };
  const headL = [], tails = [], brakes = [], ambersL = [], ambersR = [], revs = [];
  for (const sx of [1, -1]) {
    headL.push(lampBlock('headlamp', 0.4, 0.15, sx * 0.43, 0.668, frontZ, M.headlamp, 1));
    const ind = lampBlock('front indicator', 0.12, 0.05, sx * 0.62, 0.53, frontZ, M.amber, 1, 0.03); (sx > 0 ? ambersL : ambersR).push(ind);
  }
  const grille = add(body, new THREE.PlaneGeometry(0.43, 0.13), M.grille, 'grille'); grille.position.set(0, 0.668, frontZ + 0.0075);
  const gfr = add(body, roundBox(0.45, 0.15, 0.012, 0.01, 0.003), M.chrome, 'grille surround'); gfr.position.set(0, 0.668, frontZ - 0.002);
  const badge = add(body, roundBox(0.06, 0.04, 0.012, 0.01, 0.003), M.chrome, 'badge'); badge.position.set(0, 0.668, frontZ + 0.009);
  const plateF = add(body, roundBox(0.52, 0.114, 0.006, 0.006, 0.002), plateMaterial(plate), 'front plate'); plateF.position.set(0, 0.392, frontZ + 0.1);
  // ---------- tył: lampy zespolone (kierunkowskaz, pozycja, stop, cofanie), tablica, wydech ----------
  for (const sx of [1, -1]) {
    const segs = [['tail indicator', 0.12, M.amber, sx * 0.66], ['tail light', 0.16, M.tail, sx * 0.52], ['brake light', 0.12, M.brake, sx * 0.38], ['reverse light', 0.08, M.reverse, sx * 0.27]];
    for (const [nm, w, mat, x] of segs) {
      const f = lampBlock(nm, w, 0.16, x, 0.66, ZR, mat, -1, 0.04);
      if (nm === 'tail indicator') (sx > 0 ? ambersL : ambersR).push(f); else if (nm === 'tail light') tails.push(f); else if (nm === 'brake light') brakes.push(f); else revs.push(f);
    }
  }
  const plateBox = add(body, roundBox(0.46, 0.18, 0.01, 0.01, 0.003), M.black, 'plate recess'); plateBox.position.set(0, 0.66, ZR - 0.004);
  const plateR = add(body, roundBox(0.52, 0.114, 0.006, 0.006, 0.002), plateMaterial(plate), 'rear plate'); plateR.position.set(0, 0.66, ZR - 0.012); plateR.rotation.y = Math.PI;
  const exh = add(body, new THREE.CylinderGeometry(0.024, 0.024, 3.3, 12, 1, true), M.steel, 'exhaust'); exh.rotation.x = Math.PI / 2; exh.position.set(-0.3, 0.19, -0.5); exh.material = M.steel.clone(); exh.material.side = THREE.DoubleSide;
  const tip = add(body, new THREE.CylinderGeometry(0.03, 0.03, 0.12, 14, 1, true), M.chrome, 'exhaust tip'); tip.rotation.x = Math.PI / 2; tip.position.set(-0.36, 0.21, ZR - 0.03); tip.material = M.chrome.clone(); tip.material.side = THREE.DoubleSide;
  // ---------- dodatki: wycieraczki, antena, wlew paliwa, lusterko wewnętrzne, zaczep ----------
  for (const sx of [0.32, -0.18]) { const w = add(body, roundBox(0.46, 0.012, 0.02, 0.004, 0.002), M.black, 'wiper'); w.position.set(sx, yTop(Z.cowl + 0.05) + 0.03, Z.cowl + 0.02); w.rotation.set(-0.55, 0.12, 0); }
  const ant = add(body, new THREE.CylinderGeometry(0.0025, 0.004, 0.85, 6), M.chrome, 'antenna'); ant.position.set(-0.7, yTop(1.2) + 0.42, 1.2); ant.rotation.x = -0.12;
  const fuel = add(body, new THREE.CylinderGeometry(0.045, 0.045, 0.012, 24), M.chrome, 'fuel cap'); fuel.rotation.z = Math.PI / 2; fuel.position.set(-(hw(-1.55) + 0.002), 0.78, -1.55);
  const rvm = add(body, roundBox(0.2, 0.06, 0.03, 0.02, 0.006), M.black, 'rear-view mirror'); rvm.position.set(0, yTop(Z.wsTop + 0.05) - 0.12, Z.wsTop - 0.02);

  // ---------- wnętrze: deska rozdzielcza, zegary, kierownica, fotele, kanapa, dźwignia, półka ----------
  const dash = add(body, roundBox(1.48, 0.2, 0.36, 0.06, 0.02), M.dash, 'dashboard'); dash.position.set(0, 0.83, 0.74);
  const pod = add(body, roundBox(0.42, 0.13, 0.14, 0.04, 0.01), M.dash, 'instrument hood'); pod.position.set(info.seat.x, 0.94, 0.62);
  const dials = add(body, new THREE.PlaneGeometry(0.36, 0.12), M.dials, 'instruments'); dials.position.set(info.seat.x, 0.93, 0.552); dials.rotation.y = Math.PI;
  const wheelG = new THREE.Group(); wheelG.name = 'steering wheel'; wheelG.userData.part = true; wheelG.position.set(info.seat.x, 0.88, 0.47); wheelG.rotation.x = -0.42; body.add(wheelG);
  add(wheelG, new THREE.TorusGeometry(0.19, 0.016, 10, 40), M.plastic, 'rim');
  add(wheelG, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 20), M.plastic, 'hub').rotation.x = Math.PI / 2;
  for (const a of [Math.PI / 2, Math.PI * 7 / 6, -Math.PI / 6]) { const sp = add(wheelG, roundBox(0.17, 0.022, 0.012, 0.006, 0.003), M.plastic, 'spoke'); sp.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0); sp.rotation.z = a; }
  const col = add(body, new THREE.CylinderGeometry(0.025, 0.03, 0.3, 12), M.dash, 'steering column'); col.position.set(info.seat.x, 0.82, 0.6); col.rotation.x = Math.PI / 2 - 0.42;
  const seat = (x, z, w) => {
    const g = new THREE.Group(); g.name = 'seat'; g.userData.part = true; g.position.set(x, 0, z); body.add(g);
    add(g, roundBox(w, 0.13, 0.5, 0.05, 0.03), M.seat, 'cushion').position.set(0, 0.46, 0);
    const back = add(g, roundBox(w, 0.6, 0.13, 0.06, 0.03), M.seat, 'backrest'); back.position.set(0, 0.76, -0.27); back.rotation.x = -0.22;
    return g;
  };
  for (const x of [info.seat.x, -info.seat.x]) { const s = seat(x, -0.12, 0.48); const hr = add(s, roundBox(0.26, 0.17, 0.08, 0.05, 0.02), M.seat, 'headrest'); hr.position.set(0, 1.12, -0.36); hr.rotation.x = -0.22; }
  seat(0, -0.98, 1.3);
  const lever = add(body, new THREE.CylinderGeometry(0.008, 0.008, 0.26, 8), M.satin, 'gear lever'); lever.position.set(0, 0.47, 0.32); lever.rotation.x = -0.2;
  add(body, new THREE.SphereGeometry(0.025, 14, 10), M.plastic, 'gear knob').position.set(0, 0.6, 0.29);
  const tunnel = add(body, roundBox(0.24, 0.12, 1.6, 0.05, 0.02), M.carpet, 'transmission tunnel'); tunnel.position.set(0, 0.36, 0.1);
  const shelf = add(body, roundBox(1.4, 0.015, 0.62, 0.01, 0.004), M.trim, 'parcel shelf'); shelf.position.set(0, 0.87, -1.6); shelf.rotation.x = 0.04;

  // ---------- podwozie: oś tylna sztywna z resorami, wahacze przednie, zbiornik ----------
  const axle = add(body, new THREE.CylinderGeometry(0.04, 0.04, 1.12, 14), M.under, 'rear axle'); axle.rotation.z = Math.PI / 2; axle.position.set(0, WR, AXR);
  add(body, new THREE.SphereGeometry(0.11, 16, 12), M.under, 'differential').position.set(0, WR - 0.02, AXR);
  for (const sx of [1, -1]) {
    const leaf = add(body, roundBox(0.06, 0.03, 1.2, 0.01, 0.004), M.steel, 'leaf spring'); leaf.position.set(sx * 0.5, WR - 0.06, AXR); leaf.rotation.x = 0.0;
    const arm = add(body, roundBox(0.05, 0.04, 0.42, 0.01, 0.004), M.under, 'wishbone'); arm.position.set(sx * 0.45, WR - 0.06, AXF); arm.rotation.y = sx * 0.9;
  }
  add(body, roundBox(0.8, 0.18, 0.5, 0.03, 0.01), M.under, 'fuel tank').position.set(0.1, 0.33, -1.55);
  add(body, roundBox(0.5, 0.35, 0.6, 0.05, 0.02), M.under, 'engine sump').position.set(0, 0.36, 1.45);
  const shaft = add(body, new THREE.CylinderGeometry(0.03, 0.03, 2.3, 10), M.under, 'propeller shaft'); shaft.rotation.x = Math.PI / 2; shaft.position.set(0, 0.27, 0.15);

  // ---------- koła ----------
  const wheels = [];
  for (const [x, z, steer] of [[info.trackF / 2, AXF, true], [-info.trackF / 2, AXF, true], [info.trackR / 2, AXR, false], [-info.trackR / 2, AXR, false]]) {
    const w = wheel(M, { R: WR, W: 0.175, rim: 0.165, side: Math.sign(x) });
    w.group.position.set(x, WR, z); w.group.name = 'wheel'; w.group.userData.part = true; group.add(w.group);
    w.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    wheels.push({ ...w, x, z, steer });
  }

  // ---------- światła: emisja + reflektor (jeden SpotLight na auto) ----------
  const spot = new THREE.SpotLight(0xfff1d6, 0, 70, 0.5, 0.45, 1.5); spot.position.set(0, 0.68, frontZ + 0.05); spot.target.position.set(0, 0.0, frontZ + 20); spot.name = 'headlight beam'; body.add(spot, spot.target);
  const lamps = {
    set({ lights, brake, reverse, left, right }) {
      M.headlamp.emissiveIntensity = lights ? 2.4 : 0; spot.intensity = lights ? 60 : 0;
      M.tail.emissiveIntensity = lights ? 1.2 : 0.05; M.brake.emissiveIntensity = brake ? 3.2 : (lights ? 1.0 : 0.05);
      M.reverse.emissiveIntensity = reverse ? 2.2 : 0;
      const amb = (left ? 1 : 0) || (right ? 1 : 0); M.amber.emissiveIntensity = 0;   // kierunkowskazy: osobne kopie materiału po stronach
      for (const f of ambersL) f.material.emissiveIntensity = left ? 3 : 0; for (const f of ambersR) f.material.emissiveIntensity = right ? 3 : 0;
      M.dials.emissiveIntensity = lights ? 0.8 : 0; void amb;
    },
  };
  for (const f of [...ambersL, ...ambersR]) f.material = f.material.clone();
  const rig = makeRig({ wheels, body, wheelbase: info.wheelbase, track: (info.trackF + info.trackR) / 2, lamps, door: doorCtl });

  // nazwy części do doktora i list: wszystkie siatki mają nazwy; grupy z userData.part
  group.traverse((o) => { if (o.isMesh && o.geometry && !o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); });
  return {
    def: info, group, body, wheels, door, parts: { wheels: wheels.map((w) => w.group), body, door },
    materials: M, update: rig.update, rig,
    setPaint(c) { M.paint.color.set(c); },
    dispose() { group.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); } }); },
  };
}
