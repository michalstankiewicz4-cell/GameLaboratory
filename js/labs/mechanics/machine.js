// Laboratorium mechaniki — maszyna na żeliwnym łożu (z Tornado.io): hala (posadzka, łoże, lampy), elementy MechKit
// połączone portami w napędzie (js/behaviors/land/mech/drive.js), obrazowanie kątów (applyAngles).
//   silnik → sprzęgło kłowe → wał → para zębatek 20 : 40 → przekładnia dwustopniowa (16 : 48, 24 : 40) w obudowie z akrylu
//   → łańcuch 18 : 27 → pas klinowy Ø 160 : Ø 80 → sprzęgło kołnierzowe → wał przegubowy (dwa przeguby Cardana, 25°)
//   → przekładnia planetarna (24 / 24 / 72, korona stała) → tarcza hamulca i tarcza z podziałką.
// buildMachine({ scene, root, M }) → { drive, parts, panes, applyAngles, solved, … elementy i wymiary dla trybu Fizyka }
import * as THREE from '../../../vendor/three/three.module.js';
import * as MK from '../../models/mech/mechkit.js';
import { createDrive } from '../../behaviors/land/mech/drive.js';

const TAU = Math.PI * 2, X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);

export function buildMachine({ scene, root, M }) {
/* ---------------- hala: posadzka, łoże, światła ---------------- */
const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64).rotateX(-Math.PI / 2), M.concrete); floor.receiveShadow = true;
{ const uv = floor.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 16, uv.getY(i) * 16); }
scene.add(floor);
const BED_TOP = 0.75, Y0 = 0.87, BX0 = -6.6, BX1 = 3.8, BZ0 = -0.35, BZ1 = 0.75;
{
  const bg = new THREE.BoxGeometry(BX1 - BX0, 0.08, BZ1 - BZ0), buv = bg.attributes.uv; for (let i = 0; i < buv.count; i++) buv.setXY(i, buv.getX(i) * (BX1 - BX0) / 1.2, buv.getY(i) * (BZ1 - BZ0) / 1.2);
  const bed = new THREE.Mesh(bg, M.bed); bed.position.set((BX0 + BX1) / 2, BED_TOP - 0.04, (BZ0 + BZ1) / 2); bed.castShadow = bed.receiveShadow = true; root.add(bed);
  for (let x = BX0 + 0.25; x < BX1; x += 1.3) for (const z of [BZ0 + 0.08, BZ1 - 0.08]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, BED_TOP - 0.08, 0.1), M.iron); leg.position.set(x, (BED_TOP - 0.08) / 2, z); leg.castShadow = leg.receiveShadow = true; root.add(leg); }
  for (const z of [BZ0 + 0.2, BZ1 - 0.2]) { const slot = new THREE.Mesh(new THREE.BoxGeometry(BX1 - BX0 - 0.1, 0.002, 0.018), M.black); slot.position.set((BX0 + BX1) / 2, BED_TOP + 0.0005, z); root.add(slot); }   // rowki teowe
}
for (const [x, z] of [[-5, 1.6], [-1.5, 1.8], [2, 1.6]]) {   // lampy warsztatowe nad stanowiskami
  const L = new THREE.SpotLight(0xffe2b8, 18, 9, 0.75, 0.6, 1.6); L.position.set(x, 3.4, z); L.target.position.set(x, Y0, 0.15); root.add(L, L.target);
}

/* ---------------- napęd i elementy ---------------- */
const drive = createDrive();
const parts = [];   // { el, group } — do wybierania kliknięciem
const panes = [];   // szyby obudów (przezroczystość)
function element(id, name, type, group, { J = group.userData.J || 0, props = [], ports, frame, onAngle } = {}) {
  const e = drive.add({ id, name, type, J, props, ports, spin: group.userData.spin, frame: frame || { o: group.position.clone(), axis: X.clone(), ref: Y.clone() }, onAngle, group });
  group.userData.el = e; parts.push(e);
  return e;
}
const P = (id, name, kind = 'obrót') => ({ id, name, kind });
const mass = (g) => `${(g.userData.mass || 0).toFixed(2)} kg`;
const Jtxt = (J) => `${(J * 1e4).toFixed(2)} kg·cm²`;
function at(g, x, y, z) { g.position.set(x, y, z); root.add(g); return g; }
function shaftEl(id, x0, x1, y, z, name) {
  const g = at(MK.shaft({ len: x1 - x0, r: 0.0125, name }), x0, y, z);
  return element(id, name, 'shaft', g, { props: [['Średnica', '25 mm'], ['Długość', `${Math.round((x1 - x0) * 1000)} mm`], ['Stal', 'C45, szlifowana'], ['Masa', mass(g)], ['Bezwładność', Jtxt(g.userData.J)]], ports: [P('a', 'Koniec A'), P('b', 'Koniec B')] });
}
const block = (x, y, z, h = y - BED_TOP) => at(MK.pillowBlock({ h }), x, BED_TOP, z);
function gearEl(id, x, y, z, opts, name) {
  const g = at(MK.gear({ ...opts, name }), x, y, z), u = g.userData;
  return element(id, name, 'gear', g, { props: [['Liczba zębów', u.z], ['Moduł', `${u.m * 1000} mm`], ['Średnica podziałowa', `${(u.rp * 2000).toFixed(1)} mm`], ['Szerokość', `${u.w * 1000} mm`], ['Zarys', 'ewolwentowy, α = 20°'], ['Materiał', opts.mat === 'brass' ? 'mosiądz CuZn39Pb3' : 'stal 42CrMo4 ulepszona'], ['Masa', mass(g)], ['Bezwładność', Jtxt(u.J)]], ports: [P('bore', 'Otwór z wpustem (wał)'), P('mesh', 'Zazębienie')] });
}

// 1. silnik, sprzęgło kłowe, wał S1, para zębatek
const motorG = at(MK.motor(), -6.0, BED_TOP + 0.03, 0);
{ const riser = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.22), M.iron); riser.position.set(-6.16, BED_TOP + 0.015, 0); riser.castShadow = riser.receiveShadow = true; root.add(riser); }
const eMotor = element('motor', 'Silnik indukcyjny 1,1 kW', 'motor', motorG, { J: motorG.userData.J, frame: { o: new THREE.Vector3(-6.0, Y0, 0), axis: X.clone(), ref: Y.clone() },
  props: [['Moc znamionowa', '1,1 kW'], ['Obroty znamionowe', '1450 obr/min (4 bieguny, 50 Hz)'], ['Moment krytyczny', '18 N·m'], ['Zasilanie', 'falownik — prędkość z suwaka'], ['Masa', '15,5 kg'], ['Bezwładność wirnika', Jtxt(motorG.userData.J)]], ports: [P('out', 'Wał wyjściowy Ø 24')] });
const jaw = MK.jawCoupling(); const jawG = new THREE.Group(); jawG.userData.spin = new THREE.Group(); jawG.add(jawG.userData.spin); jawG.userData.phys = jaw.phys;
jawG.userData.spin.add(jaw.a, jaw.spider, jaw.b); at(jawG, -5.92, Y0, 0); jawG.name = 'Sprzęgło kłowe';
const eJaw = element('jaw', 'Sprzęgło kłowe z gwiazdą', 'coupling', jawG, { J: jaw.J, props: [['Rodzaj', 'kłowe, podatne'], ['Gwiazda', 'poliuretan 92 Sh A (czerwona)'], ['Piasty', 'aluminium'], ['Kompensuje', 'niewspółosiowość do 0,2 mm, 1°'], ['Masa', `${jaw.mass} kg`]], ports: [P('a', 'Piasta A'), P('b', 'Piasta B')] });
const eS1 = shaftEl('s1', -5.885, -4.95, Y0, 0, 'Wał 1');
block(-5.72, Y0, 0); block(-5.18, Y0, 0);
const eG1 = gearEl('g1', -5.0, Y0, 0, { z: 20, m: 0.004, w: 0.04, mat: 'gear' }, 'Zębatka 1 (z = 20)');
const eG2 = gearEl('g2', -5.0, Y0, 0.12, { z: 40, m: 0.004, w: 0.04, mat: 'brass' }, 'Zębatka 2 (z = 40)');
const eS2 = shaftEl('s2', -5.08, -4.24, Y0, 0.12, 'Wał 2');
block(-4.86, Y0, 0.12); block(-4.62, Y0, 0.12);

// 2. przekładnia dwustopniowa współosiowa w obudowie z akrylu
const YS3 = Y0 + 0.096;
const eG3 = gearEl('g3', -4.3, Y0, 0.12, { z: 16, m: 0.003, w: 0.03, mat: 'gear' }, 'Zębatka 3 (z = 16)');
const eG4 = gearEl('g4', -4.3, YS3, 0.12, { z: 48, m: 0.003, w: 0.03, mat: 'brass' }, 'Zębatka 4 (z = 48)');
const eS3 = shaftEl('s3', -4.385, -3.815, YS3, 0.12, 'Wał pośredni');
const eG5 = gearEl('g5', -3.95, YS3, 0.12, { z: 24, m: 0.003, w: 0.03, mat: 'gear' }, 'Zębatka 5 (z = 24)');
const eG6 = gearEl('g6', -3.95, Y0, 0.12, { z: 40, m: 0.003, w: 0.03, mat: 'brass' }, 'Zębatka 6 (z = 40)');
const eS4 = shaftEl('s4', -4.06, -2.42, Y0, 0.12, 'Wał 4');
{
  const hs = MK.housing([0.6, 0.34, 0.22]); hs.position.set(-4.1, 0.935, 0.12); root.add(hs); panes.push(hs.userData.panes);
  for (const [x, y] of [[-4.4, Y0], [-4.4, YS3], [-3.8, YS3], [-3.8, Y0]]) { const b = new THREE.Mesh(MK.cyl(0.024, 0.016, 32), M.steel); b.position.set(x, y, 0.12); b.castShadow = true; root.add(b); }   // łożyska w ściankach
  for (const x of [-4.36, -3.84]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.26), M.alu); f.position.set(x, BED_TOP + 0.006, 0.12); f.castShadow = f.receiveShadow = true; root.add(f); }
}
block(-3.55, Y0, 0.12); block(-2.75, Y0, 0.12);

// 3. łańcuch rolkowy 08A: koła 18 i 27 zębów, odległość osi dobrana do parzystej liczby ogniw
const CH = MK.chainDistance(18, 27, 0.0127, 0.4), XC = -2.6, YS5 = Y0 + CH.D;
const sp1 = at(MK.sprocket({ z: 18, name: 'Koło łańcuchowe 1 (z = 18)' }), XC, Y0, 0.12), sp2 = at(MK.sprocket({ z: 27, name: 'Koło łańcuchowe 2 (z = 27)' }), XC, YS5, 0.12);
const chainPath = MK.loopPath({ y: Y0, z: 0.12, r: CH.R1, k: 18 / TAU }, { y: YS5, z: 0.12, r: CH.R2, k: 27 / TAU }, 0.0127);
// gniazda kół pod rolkami: obrót części wirującej koła o fazę drogi (koło 1: początek łuku, koło 2: początek łuku − podziałki przed nim)
sp1.userData.spin.children.forEach((c) => { c.rotation.x = chainPath.a1; });
sp2.userData.spin.children.forEach((c) => { c.rotation.x = chainPath.a2 - chainPath.U2 * TAU / 27; });
const chain = MK.chainLoop(chainPath, CH.N, { x: XC }); root.add(chain);
const spProps = (g) => [['Liczba zębów', g.userData.z], ['Podziałka', '12,7 mm (08A / ANSI 40)'], ['Średnica podziałowa', `${(g.userData.R * 2000).toFixed(1)} mm`], ['Materiał', 'stal C45, czerniona'], ['Masa', mass(g)]];
const eC1 = element('c1', 'Koło łańcuchowe 1 (z = 18)', 'sprocket', sp1, { props: spProps(sp1), ports: [P('bore', 'Otwór (wał)'), P('chain', 'Łańcuch')] });
const eC2 = element('c2', 'Koło łańcuchowe 2 (z = 27)', 'sprocket', sp2, { props: spProps(sp2), ports: [P('bore', 'Otwór (wał)'), P('chain', 'Łańcuch')] });
const eS5 = shaftEl('s5', -2.7, -0.86, YS5, 0.12, 'Wał 5 (górny)');
block(-2.45, YS5, 0.12); block(-1.12, YS5, 0.12);

// 4. pas klinowy SPA: koła Ø 160 i Ø 80
const XB = -0.95;
const pu1 = at(MK.pulley({ d: 0.16, name: 'Koło pasowe 1 (Ø 160)' }), XB, YS5, 0.12), pu2 = at(MK.pulley({ d: 0.08, name: 'Koło pasowe 2 (Ø 80)' }), XB, Y0, 0.12);
const beltPath = MK.loopPath({ y: YS5, z: 0.12, r: 0.08, k: 0.08 }, { y: Y0, z: 0.12, r: 0.04, k: 0.04 }, 1);
const belt = MK.beltLoop(beltPath, { x: XB, label: `SPA ${Math.round(beltPath.L * 1000)} Lw` }); root.add(belt);
const puProps = (g) => [['Średnica skuteczna', `${Math.round(g.userData.d * 1000)} mm`], ['Rowek', 'klinowy SPA, 36°'], ['Materiał', 'żeliwo szare EN-GJL-250'], ['Masa', mass(g)], ['Bezwładność', Jtxt(g.userData.J)]];
const ePu1 = element('pu1', 'Koło pasowe 1 (Ø 160)', 'pulley', pu1, { props: puProps(pu1), ports: [P('bore', 'Otwór (wał)'), P('belt', 'Pas')] });
const ePu2 = element('pu2', 'Koło pasowe 2 (Ø 80)', 'pulley', pu2, { props: puProps(pu2), ports: [P('bore', 'Otwór (wał)'), P('belt', 'Pas')] });
const eS6 = shaftEl('s6', -1.08, -0.008, Y0, 0.12, 'Wał 6');
block(-0.78, Y0, 0.12); block(-0.28, Y0, 0.12);

// 5. sprzęgło kołnierzowe, wał przegubowy z dwoma przegubami Cardana (układ Z: wały 7 i 9 równoległe)
const fl = MK.flangeCoupling(); const flG = new THREE.Group(); flG.userData.spin = new THREE.Group(); flG.add(flG.userData.spin); flG.userData.phys = fl.phys;
flG.userData.spin.add(fl.a, fl.b, fl.bolts); at(flG, 0.03, Y0, 0.12); flG.name = 'Sprzęgło kołnierzowe';
const eFl = element('fl', 'Sprzęgło kołnierzowe', 'coupling', flG, { J: fl.J, props: [['Rodzaj', 'sztywne, kołnierzowe'], ['Śruby', '6 × M8, klasa 8.8'], ['Materiał', 'żeliwo'], ['Masa', `${fl.mass} kg`]], ports: [P('a', 'Kołnierz A'), P('b', 'Kołnierz B')] });
const eS7 = shaftEl('s7', 0.068, 1.05, Y0, 0.12, 'Wał 7');
block(0.3, Y0, 0.12); block(0.82, Y0, 0.12);
const BETA = 25 * Math.PI / 180, J1 = new THREE.Vector3(1.1, Y0, 0.12), DIR = new THREE.Vector3(Math.cos(BETA), 0, Math.sin(BETA)), LJ = 0.6, J2 = J1.clone().addScaledVector(DIR, LJ);
const Q8 = new THREE.Quaternion().setFromUnitVectors(X, DIR);
// widełki wału 7 (sworznie wzdłuż y przy kącie 0)
{ const y = MK.yoke(); y.position.x = J1.x - 0.068; eS7.spin.add(y); }
// wał pośredni: od J1 do J2, widełki na obu końcach w jednej płaszczyźnie (sworznie wzdłuż lokalnego z)
const s8 = MK.shaft({ len: LJ - 0.1, r: 0.015, name: 'Wał przegubowy' }); s8.userData.spin.children.forEach((c) => { c.position.x += 0.05; });
s8.position.copy(J1); s8.quaternion.copy(Q8); root.add(s8);
{ const a = MK.yoke(); a.rotation.set(Math.PI / 2, Math.PI, 0); s8.userData.spin.add(a); const b = MK.yoke(); b.rotation.x = Math.PI / 2; b.position.x = LJ; s8.userData.spin.add(b); }
const eS8 = element('s8', 'Wał przegubowy', 'shaft', s8, { J: s8.userData.J + 0.0004, frame: { o: J1.clone(), axis: DIR.clone(), ref: Y.clone() },
  props: [['Średnica', '30 mm'], ['Długość między przegubami', `${LJ * 1000} mm`], ['Kąt łamania', '25°'], ['Układ', 'Z — widełki w jednej płaszczyźnie, wały 7 i 9 równoległe'], ['Uwaga', 'kręci się nierównomiernie (przegub Cardana); wał 9 — równo']], ports: [P('a', 'Przegub 1'), P('b', 'Przegub 2')] });
const eS9 = shaftEl('s9', J2.x, 2.372, Y0, J2.z, 'Wał 9');
{ const y = MK.yoke(); y.rotation.y = Math.PI; eS9.spin.add(y); }
block(1.85, Y0, J2.z); block(2.12, Y0, J2.z);
const cross1 = MK.cross(), cross2 = MK.cross(); cross1.position.copy(J1); cross2.position.copy(J2); root.add(cross1, cross2);

// 6. przekładnia planetarna: słoneczne 24 z, 3 satelity 24 z, korona 72 z (stała), jarzmo na wyjściu — i = 1 + 72/24 = 4
const XP = 2.36, ZP = J2.z, ZS = 24, ZPL = 24, ZR = 72, MP = 0.002;
const eSun = gearEl('sun', XP, Y0, ZP, { z: ZS, m: MP, w: 0.022, mat: 'gear', hub: false, bore: 0.0125 }, 'Koło słoneczne (z = 24)');
const ring = MK.ringGear({ z: ZR, m: MP, w: 0.02 }); ring.position.set(XP, Y0, ZP); root.add(ring);
const carrier = new THREE.Group(); carrier.userData.spin = new THREE.Group(); carrier.add(carrier.userData.spin); carrier.position.set(XP, Y0, ZP); root.add(carrier);
const RC = MP * (ZS + ZPL) / 2, planets = [];
{
  const plate = new THREE.Shape(); plate.absarc(0, 0, RC + 0.016, 0, TAU, false);
  for (let k = 0; k < 3; k++) {
    const pl = MK.gear({ z: ZPL, m: MP, w: 0.018, mat: 'brass', hub: false, bore: 0.004, name: 'Satelita' }); pl.position.set(0, RC * Math.cos(k * TAU / 3), RC * Math.sin(k * TAU / 3));
    carrier.userData.spin.add(pl); planets.push(pl);
    const pin = new THREE.Mesh(MK.cyl(0.004, 0.06, 12), M.steel); pin.position.copy(pl.position); pin.position.x = 0.014; carrier.userData.spin.add(pin);
  }
  for (const x of [0.03, 0.045]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(RC + 0.016, RC + 0.016, 0.006, 48).rotateZ(Math.PI / 2), M.alu); d.position.x = x; d.castShadow = true; carrier.userData.spin.add(d); }
  const ths = MK.tubeHousing({ r: ring.userData.R + 0.012, len: 0.07 }); ths.position.set(XP + 0.012, Y0, ZP); root.add(ths); panes.push(ths.userData.panes);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.05, Y0 - BED_TOP - ring.userData.R, 0.16), M.alu); stand.position.set(XP, BED_TOP + (Y0 - BED_TOP - ring.userData.R) / 2, ZP); stand.castShadow = true; root.add(stand);
}
const eCar = element('car', 'Przekładnia planetarna (jarzmo)', 'planetary', carrier, { J: 0.0012,
  props: [['Koło słoneczne', `${ZS} zęby`], ['Satelity', `3 × ${ZPL} zęby`], ['Koło koronowe', `${ZR} zęby, nieruchome`], ['Moduł', '2 mm'], ['Przełożenie', `i = 1 + ${ZR}/${ZS} = ${1 + ZR / ZS}`], ['Warunek montażu', `(${ZS} + ${ZR}) / 3 = ${(ZS + ZR) / 3} — całkowite`]],
  ports: [P('sun', 'Koło słoneczne (wejście)'), P('ring', 'Koło koronowe (stałe)', 'podparcie'), P('carrier', 'Jarzmo (wyjście)')] });
const eS10 = shaftEl('s10', XP + 0.048, 3.48, Y0, ZP, 'Wał wyjściowy');
block(2.62, Y0, ZP); block(3.22, Y0, ZP);
// hamulec tarczowy i tarcza z podziałką
const disc = MK.discBrake({ d: 0.2, t: 0.008, vents: 12 }); disc.position.set(2.92, Y0, ZP); root.add(disc);
{ // wspornik zacisku z łoża: słupek obok tarczy (od strony +x, poza jej grubością i promieniem wału) i ramię pod obudowę klocka
  const px = 2.92 + 0.03, top = Y0 + 0.06;
  const brk = new THREE.Mesh(new THREE.BoxGeometry(0.03, top - BED_TOP, 0.03), M.dark); brk.position.set(px, BED_TOP + (top - BED_TOP) / 2, ZP + 0.07); brk.castShadow = true; root.add(brk);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.065), M.dark); arm.position.set(px, top - 0.006, ZP + 0.0525); arm.castShadow = true; root.add(arm);
}
const eDisc = element('disc', 'Hamulec tarczowy', 'brake', disc, { J: 0.5 * 2.4 * 0.01,
  props: [['Tarcza', 'Ø 200 × 8 mm, stal, otwory wentylacyjne'], ['Zacisk', 'jednotłoczkowy, pływający'], ['Moment hamowania', 'z suwaka „Hamulec”'], ['Masa', '2,4 kg']], ports: [P('shaft', 'Wał (obciążenie)', 'obciążenie')] });
// tarcza z podziałką na końcu wału
{
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#d7dade'; g.beginPath(); g.arc(256, 256, 250, 0, TAU); g.fill();
  g.strokeStyle = '#1b1d20'; g.fillStyle = '#1b1d20';
  for (let k = 0; k < 72; k++) { const a = k * TAU / 72, r0 = k % 6 ? 222 : 196; g.lineWidth = k % 6 ? 3 : 6; g.beginPath(); g.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0); g.lineTo(256 + Math.cos(a) * 246, 256 + Math.sin(a) * 246); g.stroke(); }
  g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let k = 0; k < 12; k++) { const a = k * TAU / 12; g.fillText(String(k * 30), 256 + Math.cos(a) * 160, 256 + Math.sin(a) * 160); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.12, 64).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, metalness: 0.5 }));
  face.position.x = 3.485 - eS10.group.position.x; eS10.spin.add(face);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.008, 64).rotateZ(Math.PI / 2), M.alu); back.position.x = 3.48 - eS10.group.position.x; eS10.spin.add(back);
  const ptr = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 3).rotateZ(Math.PI), M.paintRed); ptr.position.set(3.5, Y0 + 0.14, ZP); root.add(ptr);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.012, Y0 + 0.16 - BED_TOP, 0.012), M.dark); post.position.set(3.53, BED_TOP + (Y0 + 0.16 - BED_TOP) / 2, ZP); root.add(post);
}

/* ---------------- połączenia portów ---------------- */
const C = drive.connect;
C('motor', 'out', 'jaw', 'a', 'coupling'); C('jaw', 'b', 's1', 'a', 'coupling');
C('s1', 'b', 'g1', 'bore', 'shaft'); C('g1', 'mesh', 'g2', 'mesh', 'mesh', { za: 20, zb: 40 }); C('g2', 'bore', 's2', 'a', 'shaft');
C('s2', 'b', 'g3', 'bore', 'shaft'); C('g3', 'mesh', 'g4', 'mesh', 'mesh', { za: 16, zb: 48 }); C('g4', 'bore', 's3', 'a', 'shaft');
C('s3', 'b', 'g5', 'bore', 'shaft'); C('g5', 'mesh', 'g6', 'mesh', 'mesh', { za: 24, zb: 40 }); C('g6', 'bore', 's4', 'a', 'shaft');
// łańcuch: faza koła 2 z drogi łańcucha (gniazda pod rolkami)
C('s4', 'b', 'c1', 'bore', 'shaft'); C('c1', 'chain', 'c2', 'chain', 'chain', { za: 18, zb: 27, phase: chainPath.seat.phase2 }); C('c2', 'bore', 's5', 'a', 'shaft');
C('s5', 'b', 'pu1', 'bore', 'shaft'); C('pu1', 'belt', 'pu2', 'belt', 'belt', { za: 0.16, zb: 0.08 }); C('pu2', 'bore', 's6', 'a', 'shaft');
C('s6', 'b', 'fl', 'a', 'coupling'); C('fl', 'b', 's7', 'a', 'coupling');
C('s7', 'b', 's8', 'a', 'ujoint', { pinA: Y.clone(), pinB: new THREE.Vector3(0, 0, 1).applyQuaternion(Q8), eta: cross1.userData.phys.eta });
C('s8', 'b', 's9', 'a', 'ujoint', { pinA: new THREE.Vector3(0, 0, 1).applyQuaternion(Q8), pinB: Y.clone(), eta: cross2.userData.phys.eta });
C('s9', 'b', 'sun', 'bore', 'shaft'); C('sun', 'mesh', 'car', 'sun', 'planetary', { zs: ZS, zr: ZR, eta: ring.userData.phys.eta }); C('car', 'carrier', 's10', 'a', 'shaft');
C('s10', 'b', 'disc', 'shaft', 'shaft');
const solved = drive.solve('motor', 'disc');
if (!solved.ok) console.warn('Napęd zakleszczony', solved.conflicts);
if (solved.unreached.length) console.warn('Elementy bez połączenia', solved.unreached.map((e) => e.name));
// faza korony: wrąb korony naprzeciw zęba satelity 0 (punkt styku na zewnątrz satelity, kąt 0)
const PLANET = MK.planetPhase(ZS, ZPL, ZR, 3);   // ten sam wzór co w MechKit.planetary
ring.userData.spin.rotation.x = PLANET.ring;

/* ---------------- obrazowanie kątów ---------------- */
function applyAngles() {
  for (const e of parts) if (e.spin) e.spin.rotation.x = e.theta;
  // satelity: obrót względem jarzma z zazębienia ze słonecznym (Willis), położenie z jarzmem
  const ts = eSun.theta - eCar.theta;
  planets.forEach((pl, k) => { pl.userData.spin.rotation.x = PLANET.planet(k, ts); });
  // łańcuch i pas
  chain.userData.update(eC1.theta * 18 / TAU);
  belt.userData.update(ePu1.theta * 0.08);
  // krzyżaki przegubów: czopy wzdłuż sworzni widełek po obu stronach
  crossPose(cross1, Y, eS7.theta, X, new THREE.Vector3(0, 0, 1).applyQuaternion(Q8), eS8.theta, DIR);
  crossPose(cross2, new THREE.Vector3(0, 0, 1).applyQuaternion(Q8), eS8.theta, DIR, Y, eS9.theta, X);
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _m = new THREE.Matrix4();
function crossPose(cr, pinA, ta, axA, pinB, tb, axB) {
  _a.copy(pinA).applyAxisAngle(axA, ta); _b.copy(pinB).applyAxisAngle(axB, tb);
  _b.addScaledVector(_a, -_b.dot(_a)).normalize(); _c.crossVectors(_a, _b);
  _m.makeBasis(_c, _a, _b); cr.quaternion.setFromRotationMatrix(_m);
}
  return { drive, parts, panes, applyAngles, solved, CH, eDisc, eC1, eSun, motorG, planets, ring, belt, chain, cross1, cross2, BED_TOP, Y0, YS5, ZS, ZPL, ZR, P };
}
