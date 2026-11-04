// Solaris Urbino 18 electric (IV generacja) — autobus przegubowy MZA Warszawa. Wymiary (1 jednostka = 1 m):
// długość 18,0, szerokość 2,55, wysokość 3,3 (z urządzeniami na dachu), rozstaw osi 5,9 + 6,05, zwis przedni 2,705,
// tylny 3,345, niska podłoga (0,34 m), drzwi 2-2-2-2 po prawej stronie, oś napędowa trzecia, baterie na dachu,
// opony 275/70 R22.5. Barwy warszawskie: żółta góra, czerwony dół. Notatki: docs/models/road/urbino18.md.
// Dwa człony: przedni (początek grupy: ziemia w połowie rozstawu osi 1–2) i tylny na przegubie (obrotnica 1,55 m
// za osią 2); kąt przegubu liczy sam model z prędkości i skrętu (kinematyka naczepy), harmonijka gnie się z nim.
import * as THREE from '../../../../vendor/three/three.module.js';
import { roundBox, sideExtrude, wheel } from '../geom.js';
import { roadMaterials, sidewallMap, fabricMap, textMap, noiseMap, decal } from '../materials.js';

export const info = {
  id: 'urbino18', name: 'Solaris Urbino 18 electric', role: 'Autobus przegubowy MZA · 4 pary drzwi · ok. 140 miejsc',
  kind: 'articulated',
  length: 18.0, width: 2.55, height: 3.3, wheelbase: 5.9, wheelbase2: 6.05, trackF: 2.1, trackR: 1.84,
  maxSpeed: 70 / 3.6, accel: 1.1, turnRadius: 11.0, cargo: 0, mass: 19500, work: 'Drzwi',
  paints: [['MZA Warszawa', 0xf3c300], ['Biały (reklama)', 0xe9e9e6]],
  seat: { x: 0.75, y: 1.35, z: 4.75 },        // kierowca (lewa strona, przy przedniej szybie)
  doorAt: { x: -1.95, z: 4.75 },              // przednie drzwi (prawa strona)
  joint: -4.5,                                 // obrotnica przegubu (z w członie przednim)
  axle3: -4.5,                                 // oś 3 za obrotnicą
  rearLength: 7.845, frontLength: 10.155,
};

const HW = 1.275, ZF = 5.655, ZFB = -4.2;      // połowa szerokości, przód i koniec członu przedniego
const ZJ = info.joint, ZR0 = -0.3, ZRE = -7.845;   // człon tylny względem obrotnicy: początek i koniec
const AX = [2.95, -2.95], AX3 = info.axle3;    // osie
const WR = 0.485, ARC = 0.6, YB = 0.28, SILL = 1.05, WTOP = 2.45, BAND = 2.62, ROOFC = 2.88, FLOOR = 0.34;
const DOORS_F = [[5.4, 4.15], [-0.9, -2.15]], DOORS_R = [[-0.55, -1.8], [-2.55, -3.8]];

export function build({ paint = info.paints[0][1], detail = 1 } = {}) {
  const M = roadMaterials(paint);
  M.steel.side = THREE.DoubleSide;   // tarcze felg widać z obu stron (koła bliźniacze)
  M.sidewall = new THREE.MeshStandardMaterial({ map: sidewallMap('275/70 R22.5  148/145J'), roughness: 0.85 });
  const yellow = new THREE.MeshPhysicalMaterial({ color: paint, roughness: 0.35, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.12 });
  const red = new THREE.MeshPhysicalMaterial({ color: 0xc4161c, roughness: 0.35, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.12 });
  const roofM = new THREE.MeshStandardMaterial({ color: 0xd9d9d4, roughness: 0.6, metalness: 0.1 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0f1012, roughness: 0.4, metalness: 0.2 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1014, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.78, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2, depthWrite: false });
  const ceiling = new THREE.MeshStandardMaterial({ color: 0xe6e4de, roughness: 0.8, side: THREE.DoubleSide });
  const floorM = new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: 0.9, bumpMap: noiseMap(61, 256, 90), bumpScale: 0.6 });
  const poleM = new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.35, metalness: 0.3 });
  const seatM = new THREE.MeshStandardMaterial({ map: fabricMap('#2b4472'), roughness: 0.95 });
  const shellM = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.5, metalness: 0.2 });
  const lightStrip = new THREE.MeshStandardMaterial({ color: 0xf4f2ea, roughness: 0.5, emissive: 0xfff6e4, emissiveIntensity: 0.05 });
  const led = new THREE.MeshStandardMaterial({ color: 0x111111, map: textMap(['175  Lotnisko Chopina'], { w: 1024, h: 96, fg: '#ffb12a', font: 'bold 64px monospace' }), emissive: 0xffffff, emissiveMap: textMap(['175  Lotnisko Chopina'], { w: 1024, h: 96, fg: '#ffb12a', font: 'bold 64px monospace' }), emissiveIntensity: 0.6, roughness: 0.3 });
  const ledNo = new THREE.MeshStandardMaterial({ color: 0x111111, map: textMap(['175'], { w: 256, h: 96, fg: '#ffb12a', font: 'bold 72px monospace' }), emissive: 0xffffff, emissiveMap: textMap(['175'], { w: 256, h: 96, fg: '#ffb12a', font: 'bold 72px monospace' }), emissiveIntensity: 0.6 });
  const bellowsM = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.85, side: THREE.DoubleSide });
  const group = new THREE.Group(); group.name = 'Solaris Urbino 18';
  const front = new THREE.Group(); front.name = 'front section'; front.userData.part = true; group.add(front);
  const rearPivot = new THREE.Group(); rearPivot.name = 'articulation'; rearPivot.position.set(0, 0, ZJ); group.add(rearPivot);
  const rear = new THREE.Group(); rear.name = 'rear section'; rear.userData.part = true; rearPivot.add(rear);
  const add = (parent, geo, mat, name, opts = {}) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = opts.shadow !== false; m.receiveShadow = true; parent.add(m); return m; };
  const box = (parent, w, h, d, mat, name, x, y, z, r = 0.02) => { const m = add(parent, roundBox(w, h, d, r, Math.min(r, 0.01), 2), mat, name); m.position.set(x, y, z); return m; };

  // ---------- burty: pas dolny (czerwony) z wycięciami nadkoli i drzwi, pas okien, pas górny (żółty) ----------
  const arches = (axles, zl, zh) => {   // dół panelu od zl do zh z łukami nadkoli
    const pts = [[zl, YB]];
    for (const a of axles.slice().sort((p, q) => p - q)) {
      const half = Math.sqrt(ARC * ARC - (WR - YB) ** 2);
      if (a - half <= zl || a + half >= zh) continue;
      pts.push([a - half, YB]);
      for (let k = 1; k < 16; k++) { const dz = -half + 2 * half * k / 16; pts.push([a + dz, WR + Math.sqrt(ARC * ARC - dz * dz)]); }
      pts.push([a + half, YB]);
    }
    pts.push([zh, YB]); return pts;
  };
  function sides(parent, z0, z1, doors, axles, lowerMat) {
    for (const sx of [1, -1]) {
      const dd = sx < 0 ? doors : [];
      // przedziały między drzwiami
      const cuts = [[z1, z0]]; for (const [a, b] of dd) { const n = []; for (const [l, h] of cuts) { if (b >= h || a <= l) { n.push([l, h]); continue; } if (b > l) n.push([l, b]); if (a < h) n.push([a, h]); } cuts.splice(0, cuts.length, ...n); }
      for (const [l, h] of cuts) {
        if (h - l < 0.05) continue;
        const prof = arches(axles, l, h).concat([[h, SILL], [l, SILL]]);
        const g = add(parent, sideExtrude(prof, 0, 0.035, 0), lowerMat, 'lower side panel'); g.position.x = sx > 0 ? HW - 0.035 : -HW;
        // nadkole wewnętrzne (czarne) za łukiem
        for (const a of axles) if (a > l + 0.6 && a < h - 0.6) { void 0; }
      }
      // pas okien: szyby między słupkami (słupki czarne pod szybą), nad drzwiami zostaje szyba drzwi
      const wcuts = []; let zc = z0;
      for (const [a, b] of dd.slice().sort((p, q) => q[0] - p[0])) { if (a < zc) { wcuts.push([zc, a]); zc = b; } }
      wcuts.push([zc, z1]);
      for (const [h, l] of wcuts) {
        if (h - l < 0.05) continue;
        const gl = add(parent, new THREE.PlaneGeometry(h - l, WTOP - SILL), glass, 'side window', { shadow: false }); gl.rotation.y = sx * Math.PI / 2; gl.position.set(sx * (HW + 0.002), (SILL + WTOP) / 2, (h + l) / 2); gl.renderOrder = 2;
        const n = Math.max(1, Math.round((h - l) / 1.55));
        for (let k = 0; k <= n; k++) box(parent, 0.04, WTOP - SILL, 0.09, black, 'window pillar', sx * (HW - 0.03), (SILL + WTOP) / 2, l + (h - l) * k / n, 0.008);
        // górny brzeg szyb otwieranych (uchylne lufciki) — co drugie okno
        for (let k = 0; k < n; k += 2) box(parent, 0.012, 0.012, (h - l) / n - 0.2, black, 'top-hung vent frame', sx * (HW + 0.004), WTOP - 0.42, l + (h - l) * (k + 0.5) / n, 0.004);
      }
      // listwa pod oknami (czarna uszczelka)
      box(parent, 0.012, 0.03, z0 - z1, black, 'window seal', sx * (HW + 0.008), SILL + 0.005, (z0 + z1) / 2, 0.004);
    }
    // dach: pas górny żółty + zaokrąglone krawędzie, sufit od środka
    const sh = new THREE.Shape(); sh.moveTo(-HW, WTOP); sh.lineTo(HW, WTOP); sh.lineTo(HW, BAND); sh.quadraticCurveTo(HW, BAND + 0.15, HW - 0.25, BAND + 0.2); sh.quadraticCurveTo(0, ROOFC + 0.02, -HW + 0.25, BAND + 0.2); sh.quadraticCurveTo(-HW, BAND + 0.15, -HW, BAND); sh.lineTo(-HW, WTOP);
    const roofG = new THREE.ExtrudeGeometry(sh, { depth: z0 - z1, bevelEnabled: false, curveSegments: 10 }); roofG.translate(0, 0, z1);
    add(parent, roofG, [yellow, yellow], 'roof shell');
    const top = add(parent, new THREE.PlaneGeometry(2.2, z0 - z1 - 0.2), decal(roofM), 'roof walkway', { shadow: false }); top.rotation.x = -Math.PI / 2; top.position.set(0, ROOFC - 0.012, (z0 + z1) / 2); top.scale.y = 1;
    const ce = add(parent, new THREE.PlaneGeometry(2 * HW - 0.08, z0 - z1 - 0.05), ceiling, 'ceiling', { shadow: false }); ce.rotation.x = Math.PI / 2; ce.position.set(0, WTOP - 0.005, (z0 + z1) / 2);
    // światła sufitowe wzdłuż obu stron
    for (const sx of [1, -1]) { const ls = add(parent, new THREE.PlaneGeometry(0.12, z0 - z1 - 0.6), lightStrip, 'ceiling light strip', { shadow: false }); ls.rotation.x = Math.PI / 2; ls.position.set(sx * 0.62, WTOP - 0.03, (z0 + z1) / 2); }
    // podłoga i podwozie
    // podłoga: przejście środkiem na całej długości, po bokach poza wnękami kół; wnęki kół jako skrzynie
    box(parent, 1.36, 0.09, z0 - z1, floorM, 'floor', 0, FLOOR - 0.045, (z0 + z1) / 2, 0.01);
    let zs = z0; const segs = [];
    for (const a of axles.slice().sort((p, q) => q - p)) { if (a + ARC + 0.02 < zs) segs.push([zs, a + ARC + 0.02]); zs = a - ARC - 0.02; }
    segs.push([zs, z1]);
    for (const sx of [1, -1]) {
      for (const [h, l] of segs) if (h - l > 0.05) box(parent, HW - 0.04 - 0.69, 0.09, h - l, floorM, 'floor side', sx * (0.69 + (HW - 0.04 - 0.69) / 2), FLOOR - 0.045, (h + l) / 2, 0.01);
      for (const a of axles) { const wl = HW - 0.04 - 0.66, h = add(parent, new THREE.CylinderGeometry(ARC + 0.035, ARC + 0.035, wl, 28, 1, false, -0.35, Math.PI + 0.7), M.plastic, 'wheel house'); h.material = M.plastic.clone(); h.material.side = THREE.DoubleSide; h.rotation.z = Math.PI / 2; h.position.set(sx * (0.66 + wl / 2), WR, a); }
    }
    box(parent, 1.3, 0.05, z0 - z1 - 0.2, M.under, 'underbody', 0, 0.2, (z0 + z1) / 2, 0.01);
    // wnętrze: poręcze żółte (pionowe przy siedzeniach, podłużne pod sufitem), siedzenia
    for (const sx of [1, -1]) { const r = add(parent, new THREE.CylinderGeometry(0.016, 0.016, z0 - z1 - 0.4, 8), poleM, 'ceiling handrail'); r.rotation.x = Math.PI / 2; r.position.set(sx * 0.45, 2.05, (z0 + z1) / 2);
      for (let z = z1 + 0.5; z < z0 - 0.3; z += 1.8) { const h = add(parent, new THREE.CylinderGeometry(0.012, 0.012, WTOP - 2.05, 6), poleM, 'handrail hanger'); h.position.set(sx * 0.45, (WTOP + 2.05) / 2, z); } }
  }
  // siedzenia: pary przodem do kierunku jazdy po obu stronach, tam gdzie nie ma drzwi ani wnęk kół (na podestach)
  function seats(parent, ranges, side) {
    for (const [h, l] of ranges) for (let z = h - 0.45; z > l + 0.3; z -= 0.8) {
      for (const x of [0.88, 0.42].map((v) => v * side)) {
        const s = new THREE.Group(); s.name = 'seat'; s.position.set(x, FLOOR, z); parent.add(s);
        box(s, 0.43, 0.08, 0.42, seatM, 'seat cushion', 0, 0.42, 0, 0.03);
        const b = box(s, 0.43, 0.48, 0.07, seatM, 'seat back', 0, 0.7, -0.2, 0.03); b.rotation.x = -0.12;
        box(s, 0.45, 0.06, 0.5, shellM, 'seat shell', 0, 0.36, -0.02, 0.02);
        const leg = add(s, new THREE.CylinderGeometry(0.02, 0.02, 0.36, 8), shellM, 'seat pedestal'); leg.position.set(0, 0.18, 0);
      }
      const p = add(parent, new THREE.CylinderGeometry(0.018, 0.018, WTOP - FLOOR, 8), poleM, 'stanchion'); p.position.set(side * 0.2, (WTOP + FLOOR) / 2, z - 0.25);
    }
  }

  // ---------- człon przedni ----------
  sides(front, ZF, ZFB, DOORS_F, AX, red);
  seats(front, [[2.25, -2.2]], 1); seats(front, [[2.25, -0.8]], -1);
  // przód: dolna ściana z reflektorami, szyba przednia (lekko pochylona), wyświetlacz linii nad nią
  const frontLow = box(front, 2 * HW - 0.075, SILL - YB - 0.05, 0.12, yellow, 'front panel', 0, (SILL + YB) / 2 - 0.02, ZF - 0.05, 0.06);
  const bump = box(front, 2 * HW + 0.02, 0.3, 0.16, black, 'front bumper', 0, YB + 0.1, ZF - 0.02, 0.06);
  const rlow = box(front, 2 * HW + 0.01, 0.12, 0.06, red, 'front red band', 0, YB + 0.33, ZF + 0.0, 0.03); void frontLow; void bump; void rlow;
  for (const sx of [1, -1]) {
    const hl = box(front, 0.5, 0.17, 0.04, black, 'headlamp cluster', sx * 0.92, 0.72, ZF + 0.02, 0.04);
    box(hl, 0.2, 0.09, 0.02, M.headlamp, 'headlamp', -sx * 0.08, 0.02, 0.02, 0.02);
    box(hl, 0.12, 0.05, 0.02, M.amber, 'front indicator', sx * 0.17, 0.02, 0.02, 0.015);
    box(hl, 0.36, 0.018, 0.02, M.reverse, 'daytime running light', 0, -0.06, 0.026, 0.006);
  }
  const ws = add(front, new THREE.PlaneGeometry(2 * HW - 0.04, WTOP - SILL + 0.05), glass, 'windscreen', { shadow: false }); ws.position.set(0, (SILL + WTOP) / 2, ZF - 0.04); ws.rotation.x = -0.06; ws.renderOrder = 2;
  box(front, 2 * HW, 0.04, 0.08, black, 'windscreen frame', 0, SILL + 0.0, ZF - 0.05, 0.01);
  for (const sx of [1, -1]) box(front, 0.05, WTOP - SILL, 0.1, black, 'A-pillar', sx * (HW - 0.025), (SILL + WTOP) / 2, ZF - 0.06, 0.01);
  const dest = add(front, new THREE.PlaneGeometry(1.9, 0.2), led, 'destination display', { shadow: false }); dest.position.set(0, WTOP + 0.09, ZF + 0.016);
  box(front, 1.98, 0.27, 0.012, black, 'display surround', 0, WTOP + 0.09, ZF + 0.006, 0.005);
  // wycieraczki, lusterka na wysięgnikach („uszy”)
  for (const sx of [1, -1]) {
    const wp = box(front, 0.9, 0.02, 0.02, black, 'wiper', sx * 0.55, SILL + 0.12, ZF - 0.0, 0.006); wp.rotation.z = sx * 0.2;
    const arm = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * HW, 2.35, ZF - 0.25), new THREE.Vector3(sx * (HW + 0.15), 2.4, ZF + 0.05), new THREE.Vector3(sx * (HW + 0.18), 2.25, ZF + 0.25)]);
    add(front, new THREE.TubeGeometry(arm, 16, 0.02, 8, false), black, 'mirror arm');
    const mh = box(front, 0.22, 0.38, 0.1, black, 'mirror housing', sx * (HW + 0.2), 2.05, ZF + 0.28, 0.04);
    const mg = add(mh, new THREE.PlaneGeometry(0.18, 0.33), M.chrome, 'mirror glass'); mg.position.z = -0.068; mg.rotation.y = Math.PI;
  }
  // stanowisko kierowcy (lewa strona): kabina, deska, kierownica, fotel
  const dash = box(front, 1.0, 0.25, 0.5, M.dash, 'dashboard', 0.7, 1.05, ZF - 0.45, 0.04); dash.rotation.x = 0.2;
  const sw = add(front, new THREE.TorusGeometry(0.24, 0.022, 10, 32), M.plastic, 'steering wheel'); sw.position.set(info.seat.x, 1.25, ZF - 0.75); sw.rotation.x = -0.7;
  box(front, 0.5, 0.12, 0.5, seatM, 'driver seat', info.seat.x, 0.85, ZF - 1.3, 0.04); const dsb = box(front, 0.5, 0.7, 0.12, seatM, 'driver seat back', info.seat.x, 1.25, ZF - 1.58, 0.04); dsb.rotation.x = -0.15;
  box(front, 0.03, 1.3, 1.2, black, 'cab partition', 0.25, 1.0, ZF - 1.45, 0.01);
  const ticket = box(front, 0.2, 0.3, 0.15, M.dash, 'ticket machine', 0.125, 1.25, ZF - 1.55, 0.02); void ticket;
  // tył członu przedniego: rama pod harmonijkę
  box(front, 2 * HW - 0.1, ROOFC - YB - 0.1, 0.08, black, 'joint frame front', 0, (ROOFC + YB) / 2, ZFB - 0.045, 0.03).material = black;

  // ---------- człon tylny (współrzędne względem obrotnicy) ----------
  const r0 = ZR0, r1 = ZRE;
  sides(rear, r0, r1, DOORS_R, [AX3], red);
  seats(rear, [[-0.4, -3.85], [-5.15, -7.4]], 1); seats(rear, [[-5.15, -7.4]], -1);
  box(rear, 2 * HW - 0.1, ROOFC - YB - 0.1, 0.08, black, 'joint frame rear', 0, (ROOFC + YB) / 2, r0 + 0.045, 0.03);
  // tył: ściana z oknem, lampy, wyświetlacz numeru, zderzak
  box(rear, 2 * HW, BAND + 0.1 - YB, 0.09, yellow, 'rear wall', 0, (BAND + 0.1 + YB) / 2, r1 - 0.045, 0.08);
  box(rear, 2 * HW + 0.03, SILL - YB, 0.1, red, 'rear lower', 0, (SILL + YB) / 2, r1 - 0.065, 0.08);
  const rw = add(rear, new THREE.PlaneGeometry(1.6, 0.8), glass, 'rear window', { shadow: false }); rw.position.set(0, 1.85, r1 - 0.102); rw.rotation.y = Math.PI;
  const rd = add(rear, new THREE.PlaneGeometry(0.5, 0.18), ledNo, 'rear route number', { shadow: false }); rd.position.set(0, 2.42, r1 - 0.106); rd.rotation.y = Math.PI;
  box(rear, 2 * HW + 0.07, 0.28, 0.16, black, 'rear bumper', 0, YB + 0.12, r1 - 0.05, 0.05);
  const tails = [];
  for (const sx of [1, -1]) {
    const tl = box(rear, 0.16, 0.8, 0.05, black, 'tail lamp cluster', sx * (HW - 0.12), 1.3, r1 - 0.118, 0.03);
    tails.push(box(tl, 0.12, 0.3, 0.02, M.tail, 'tail lamp', 0, 0.2, -0.025, 0.01));
    box(tl, 0.12, 0.14, 0.02, M.amber, 'rear indicator', 0, -0.07, -0.025, 0.01);
    box(tl, 0.12, 0.12, 0.02, M.reverse, 'reversing lamp', 0, -0.25, -0.025, 0.01);
  }
  // dach: klimatyzatory i baterie (oba człony), osłony
  const roofBox = (parent, w, h, d, z, name, grill) => { const b = box(parent, w, h, d, roofM, name, 0, ROOFC + h / 2 - 0.03, z, 0.08); if (grill) for (let k = 0; k < 4; k++) add(b, new THREE.CircleGeometry(0.18, 20), decal(M.grille), 'fan grille').position.set(-0.6 + k * 0.4, h / 2 + 0.006, 0); b.children.forEach((c) => { c.rotation.x = -Math.PI / 2; }); return b; };
  roofBox(front, 1.9, 0.3, 2.4, 2.3, 'air conditioning unit', true);
  roofBox(front, 1.9, 0.38, 3.2, -1.3, 'battery pack');
  roofBox(rear, 1.9, 0.38, 2.6, -2.2, 'battery pack');
  roofBox(rear, 1.9, 0.3, 1.8, -5.6, 'air conditioning unit', true);
  roofBox(rear, 1.6, 0.42, 1.4, -6.9, 'drive inverter');

  // ---------- harmonijka przegubu (gnie się z kątem) ----------
  const BR = 24, BK = 18, half = 0.3;
  const prof = []; for (let k = 0; k < BR; k++) { const a = k / BR * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); const x = Math.sign(c) * Math.pow(Math.abs(c), 0.35) * (HW - 0.08), y = (ROOFC + YB) / 2 + Math.sign(s) * Math.pow(Math.abs(s), 0.35) * (ROOFC - YB - 0.12) / 2; prof.push([x, y]); }
  const bg = new THREE.BufferGeometry(), bpos = new Float32Array(BK * BR * 3), bidx = [];
  for (let i = 0; i < BK - 1; i++) for (let j = 0; j < BR; j++) { const a = i * BR + j, b = i * BR + (j + 1) % BR, c = (i + 1) * BR + (j + 1) % BR, d = (i + 1) * BR + j; bidx.push(a, b, c, a, c, d); }
  bg.setAttribute('position', new THREE.BufferAttribute(bpos, 3)); bg.setIndex(bidx);
  const bellows = add(group, bg, bellowsM, 'articulation bellows'); bellows.frustumCulled = false;
  const layBellows = (phi) => {
    for (let i = 0; i < BK; i++) {
      const t = i / (BK - 1), f = 1 + (i % 2 ? 0.035 : 0), a = phi * t, zl = half - 2 * half * t, c = Math.cos(a), s = Math.sin(a);
      for (let j = 0; j < BR; j++) { const x = prof[j][0] * f, y = prof[j][1] + (prof[j][1] - (ROOFC + YB) / 2) * (f - 1), k = (i * BR + j) * 3; bpos[k] = x * c + zl * s; bpos[k + 1] = y; bpos[k + 2] = ZJ - x * s + zl * c; }
    }
    bg.attributes.position.needsUpdate = true; bg.computeVertexNormals(); bg.computeBoundingSphere();
  };
  layBellows(0);
  // obrotnica (widoczna od spodu)
  add(group, new THREE.CylinderGeometry(0.55, 0.55, 0.12, 28), M.under, 'turntable').position.set(0, YB + 0.1, ZJ);

  // ---------- drzwi: dwa skrzydła odskokowo-przesuwne z szybami ----------
  const doors = [];
  const mkDoor = (parent, [a, b]) => {
    const w = (a - b) / 2;
    for (const k of [0, 1]) {
      const g = new THREE.Group(); g.name = 'door leaf'; g.userData.part = true; parent.add(g);
      const zc = k ? b + w / 2 : a - w / 2; g.position.set(-HW - 0.01, 0, zc);
      box(g, 0.04, 2.3 - FLOOR, 0.06, black, 'door frame', 0, (2.3 + FLOOR) / 2, (k ? -1 : 1) * (w / 2 - 0.03), 0.01);
      box(g, 0.04, 2.3 - FLOOR, 0.06, black, 'door frame', 0, (2.3 + FLOOR) / 2, (k ? 1 : -1) * (w / 2 - 0.03), 0.01);
      box(g, 0.04, 0.08, w, black, 'door rail', 0, 2.27, 0, 0.01); box(g, 0.04, 0.2, w, black, 'door kick plate', 0, FLOOR + 0.1, 0, 0.01);
      const dg = add(g, new THREE.PlaneGeometry(w - 0.1, 2.3 - FLOOR - 0.3), glass, 'door glass', { shadow: false }); dg.rotation.y = -Math.PI / 2; dg.position.set(-0.005, (2.3 + FLOOR + 0.1) / 2, 0); dg.renderOrder = 2;
      const hb = add(g, new THREE.CylinderGeometry(0.014, 0.014, 1.2, 8), poleM, 'door handrail'); hb.position.set(0.04, 1.2, (k ? 1 : -1) * (w / 2 - 0.12));
      doors.push({ g, zc, dir: k ? -1 : 1, w });
    }
    // przycisk otwierania drzwi i światło nad drzwiami
    box(parent, 0.03, 0.08, 0.08, M.amber, 'door button', -HW - 0.01, 1.2, a + 0.12, 0.01);
    const p = add(parent, new THREE.CylinderGeometry(0.018, 0.018, WTOP - FLOOR, 8), poleM, 'door stanchion'); p.position.set(-HW + 0.35, (WTOP + FLOOR) / 2, (a + b) / 2);
  };
  for (const d of DOORS_F) mkDoor(front, d); for (const d of DOORS_R) mkDoor(rear, d);
  // oznaczenia: numer taborowy, herb nad oknem kierowcy pominięty (bez znaków towarowych)
  const fleet = textMap(['8913'], { w: 256, h: 96, bg: 'rgba(0,0,0,0)', fg: '#111', font: 'bold 70px sans-serif' });
  for (const [parent, z] of [[front, ZF - 0.3], [rear, r1 + 0.6]]) for (const sx of [1, -1]) { const n = add(parent, new THREE.PlaneGeometry(0.4, 0.15), decal(new THREE.MeshStandardMaterial({ map: fleet, transparent: true, roughness: 0.5 })), 'fleet number', { shadow: false }); n.rotation.y = sx * Math.PI / 2; n.position.set(sx * (HW + 0.004), 2.53, z - sx * 0.0); }

  // ---------- koła ----------
  const wheels = [];
  const mkWheel = (parent, x, z, dual, steer) => {
    const g = new THREE.Group(); g.name = 'wheel'; g.userData.part = true; g.position.set(x, WR, z); parent.add(g);
    const spin = new THREE.Group(); g.add(spin);
    const offs = dual ? [Math.sign(x) * 0.15, -Math.sign(x) * 0.15] : [0];
    for (const o of offs) { const w = wheel(M, { R: WR, W: 0.275, rim: 0.29, side: Math.sign(x), hub: 'none' }); w.group.position.x = o; spin.add(w.group); }
    const hub = add(spin, new THREE.CylinderGeometry(0.13, 0.15, 0.1, 20), M.steel, 'hub'); hub.rotation.z = Math.PI / 2; hub.position.x = Math.sign(x) * (dual ? 0.3 : 0.15);
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, n = add(spin, new THREE.CylinderGeometry(0.014, 0.014, 0.04, 6), M.chrome, 'wheel nut'); n.rotation.z = Math.PI / 2; n.position.set(Math.sign(x) * (dual ? 0.32 : 0.17), Math.sin(a) * 0.17, Math.cos(a) * 0.17); }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const W = { group: g, spin, R: WR, x, z, steer, parent }; wheels.push(W); return W;
  };
  for (const sx of [1, -1]) { mkWheel(front, sx * info.trackF / 2, AX[0], false, true); mkWheel(front, sx * info.trackR / 2, AX[1], true, false); mkWheel(rear, sx * info.trackR / 2, AX3, true, false); }

  // ---------- światła: reflektory ----------
  const spot = new THREE.SpotLight(0xfff1d6, 0, 70, 0.55, 0.5, 1.5); spot.position.set(0, 0.75, ZF + 0.1); spot.target.position.set(0, 0, ZF + 22); spot.name = 'headlight beam'; front.add(spot, spot.target);
  const inner = new THREE.PointLight(0xfff4e0, 0, 12, 1.5); inner.position.set(0, 2.2, 0); front.add(inner);
  const inner2 = new THREE.PointLight(0xfff4e0, 0, 10, 1.5); inner2.position.set(0, 2.2, -3.5); rear.add(inner2);

  // ---------- ruch: przegub (kinematyka), zawieszenie pneumatyczne, drzwi, światła ----------
  const st = { phi: 0, y: 0, vy: 0, p: 0, vp: 0, r: 0, vr: 0, ry: 0, rvy: 0, rp: 0, rvp: 0, rr: 0, rvr: 0, door: 0, last: 0, ax: 0, blink: 0 };
  const steerMax = 0.72, L1 = AX[0] - AX[1], C = AX[1] - ZJ, L2 = -AX3;
  const spring = (k, c, vel, x, target) => (target - x) * k - vel * c;
  function update(t, dt, opts = {}) {
    dt = Math.min(dt, 0.05);
    const v = opts.speed || 0, ang = Math.max(-1, Math.min(1, opts.steer || 0)) * steerMax, contact = opts.contact || (() => 0);
    const w = v * Math.tan(ang) / L1;   // prędkość obrotu członu przedniego (dodatnia w lewo)
    // przegub: φ' = −(v·sin φ + c·ω·cos φ)/L2 − ω (człon tylny jak naczepa za punktem obrotnicy)
    st.phi += (-(v * Math.sin(st.phi) + C * w * Math.cos(st.phi)) / L2 - w) * dt;
    st.phi = Math.max(-0.95, Math.min(0.95, st.phi));
    rearPivot.rotation.y = st.phi; layBellows(st.phi);
    // koła: toczenie i skręt (Ackermann na osi 1)
    for (const W of wheels) {
      W.spin.rotation.x += v / W.R * dt;
      if (W.steer) { const R = Math.abs(ang) > 1e-3 ? L1 / Math.tan(Math.abs(ang)) : 1e9, inner = Math.sign(ang) * Math.sign(W.x) > 0; W.group.rotation.y = Math.sign(ang) * Math.atan(L1 / Math.max(0.1, R + (inner ? -1 : 1) * info.trackF / 2)); }
    }
    // człon przedni: płaszczyzna przez cztery koła, przechył od siły odśrodkowej, „nurkowanie” przy hamowaniu
    const cP = Math.cos(st.phi), sP = Math.sin(st.phi);
    const toFront = (W) => W.parent === front ? [W.x, W.z] : [W.x * cP + W.z * sP, ZJ - W.x * sP + W.z * cP];
    const hs = wheels.map((W) => { const [x, z] = toFront(W); return contact(x, z); });
    const fit = (list) => { let sy = 0, sx = 0, sz = 0, sxx = 0, szz = 0, sxy = 0, szy = 0; const n = list.length; for (const [x, z, h] of list) { sy += h; sx += x; sz += z; sxx += x * x; szz += z * z; sxy += x * h; szy += z * h; } const mx = sx / n, mz = sz / n, my = sy / n; return { my, mx, mz, gx: (sxy - n * mx * my) / Math.max(1e-6, sxx - n * mx * mx), gz: (szy - n * mz * my) / Math.max(1e-6, szz - n * mz * mz) }; };
    const F = fit(wheels.map((W, i) => W.parent === front ? [W.x, W.z, hs[i]] : null).filter(Boolean));
    const acc = (v - st.last) / Math.max(1e-3, dt); st.last = v; st.ax += (acc - st.ax) * Math.min(1, 5 * dt);
    const tY = F.my - F.mz * F.gz - F.mx * F.gx, tP = -Math.atan(F.gz) - Math.max(-0.03, Math.min(0.03, st.ax * 0.01)), tR = Math.atan(F.gx) + Math.max(-0.04, Math.min(0.04, v * w * 0.012));
    st.vy += spring(80, 12, st.vy, st.y, tY) * dt; st.y += st.vy * dt;
    st.vp += spring(50, 9, st.vp, st.p, tP) * dt; st.p += st.vp * dt;
    st.vr += spring(45, 7, st.vr, st.r, tR) * dt; st.r += st.vr * dt;
    front.position.y = st.y; front.rotation.set(st.p, 0, st.r, 'YXZ');
    // człon tylny: obrotnica na wysokości członu przedniego, oś 3 na swoim podłożu
    const jy = st.y - ZJ * Math.tan(st.p);
    const rH = wheels.filter((W) => W.parent === rear).map((W) => contact(...toFront(W)));
    const r3 = (rH[0] + rH[1]) / 2, rRoll = Math.atan((rH[0] - rH[1]) / info.trackR);
    const tRp = Math.atan((jy - r3) / L2);
    st.rvp += spring(50, 9, st.rvp, st.rp, tRp) * dt; st.rp += st.rvp * dt;
    st.rvr += spring(45, 7, st.rvr, st.rr, rRoll + Math.max(-0.04, Math.min(0.04, v * w * 0.012))) * dt; st.rr += st.rvr * dt;
    rear.position.y = jy; rear.rotation.set(st.rp, 0, st.rr, 'YXZ');
    // koła trzymają się podłoża w granicach skoku zawieszenia
    wheels.forEach((W, i) => {
      const body = W.parent === front ? st.y - W.z * Math.tan(st.p) + W.x * Math.tan(st.r) : jy - W.z * Math.tan(st.rp) + W.x * Math.tan(st.rr);
      W.group.position.y = WR + Math.max(-0.08, Math.min(0.08, hs[i] - body));
    });
    // drzwi: odskok na zewnątrz, potem przesuw wzdłuż burty
    st.door += ((opts.work ? 1 : 0) - st.door) * Math.min(1, 2.5 * dt);
    const o1 = Math.min(1, st.door * 2), o2 = Math.max(0, st.door * 2 - 1);
    for (const d of doors) { d.g.position.x = -HW - 0.01 - 0.09 * o1; d.g.position.z = d.zc + d.dir * (d.w - 0.08) * o2 * 0.92; }
    // światła
    const L = opts.lights ? 1 : 0, br = opts.brake || (acc < -1.5 && Math.abs(v) > 0.5);
    M.headlamp.emissiveIntensity = L ? 2.6 : 0.4; spot.intensity = L ? 60 : 0; M.reverse.emissiveIntensity = v < -0.2 ? 2 : (L ? 0.6 : 0.3);
    M.tail.emissiveIntensity = br ? 3.2 : (L ? 1.1 : 0.05);
    lightStrip.emissiveIntensity = L ? 1.6 : 0.05; inner.intensity = L ? 3 : 0; inner2.intensity = L ? 3 : 0;
    led.emissiveIntensity = ledNo.emissiveIntensity = L ? 1.6 : 0.6;
    st.blink = (st.blink + dt) % 0.8;
  }
  update(0, 0.016, {});
  group.traverse((o) => { if (o.isMesh && o.geometry && !o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); });
  return {
    def: info, group, body: front, front, rear, rearPivot, wheels, parts: { front, rear, wheels: wheels.map((w) => w.group) },
    materials: M, update, rig: { state: st },
    articulation: () => st.phi,
    setPaint(c) { yellow.color.set(c); },
    dispose() { group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); },
  };
}
