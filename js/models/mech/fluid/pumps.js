// FluidKit — pompy:
//   gearPump   — zębata zewnętrzna (grupa 1): korpus z aluminium, pokrywy, kołnierz dwuotworowy, wał wielowypust wychodzi
//                w −x, króćce: ssawny (większy) −z, tłoczny +z. Początek: oś wału w czole kołnierza. cut — korpus przezroczysty,
//                widać koła. setAngle(θ) — obrót kół.
//   bellHousing — latarnia (kielich) między silnikiem a pompą, wzdłuż +x od x = 0.
//   pistonPump — plunżerowa trzytłoczkowa: skrzynia korbowa, wał korbowy wzdłuż x, korbowody, tłoczki pionowe, głowica.
//                Spód w y = 0. setAngle(θ).
//   centrifugalPump — odśrodkowa monoblok: silnik + spirala (ślimak) z wirnikiem; ssanie osiowe +x, tłoczenie w górę.
//                Spód w y = 0. cut — spirala przezroczysta, widać wirnik. setAngle(θ).
import * as THREE from '../../../../vendor/three/three.module.js';
import * as MK from '../mechkit.js';
import { DOMAIN } from '../mechkit.js';
import { EN, TAU, mesh, port, slab, cylZ, canvasTex, decal } from '../common.js';
import { latheY, hexY, fluidMaterials } from './util.js';
import { endFitting, fitLen } from './pipes.js';

const X = new THREE.Vector3(1, 0, 0);
const cylX = (r, len, seg = 32) => new THREE.CylinderGeometry(r, r, len, seg).rotateZ(-Math.PI / 2);

export function gearPump({ m = 0.002, z = 10, b = 0.008, cut = false, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), a = m * z, ra = m * (z / 2 + 1), wall = 0.008;
  g.name = name || `${EN ? 'Gear pump' : 'Pompa zębata'} ${(2 * Math.PI * m * m * z * b * 1e6).toFixed(1).replace('.', EN ? '.' : ',')} cm³/${EN ? 'rev' : 'obr'}`;
  const W = 2 * (ra + wall), Hb = a + 2 * (ra + wall), Lb = b + 0.002, cx = 0.012 + Lb / 2;     // korpus: szerokość (z), wysokość (y), długość (x)
  // korpus i pokrywy: obrys stadionu w (z, y) wyciągnięty wzdłuż x
  const stad = (w, h, r) => { const s = new THREE.Shape(); s.absarc(0, h / 2 - r, r, 0, Math.PI, false); s.absarc(0, -h / 2 + r, r, Math.PI, TAU, false); s.closePath(); return s; };
  const block = (len, x0, mat, w = W, h = Hb) => { const o = mesh(slab(stad(w, h, w / 2), len, 0, 0.0008).rotateY(-Math.PI / 2), mat); o.position.set(x0, a / 2, 0); return o; };
  const body = block(Lb, 0.012 + Lb, cut ? F.acrylic : F.alu); g.add(body);
  const front = block(0.006, 0.012, F.alu); g.add(front);
  const rear = block(0.014, 0.012 + Lb + 0.014, F.alu); g.add(rear);
  // kołnierz dwuotworowy (prostokąt z zaokrągleniami) i piasta uszczelnienia
  const fl = new THREE.Shape(), fw = W * 1.9, fh = W * 0.9, fr = fh / 2; fl.absarc(fw / 2 - fr, 0, fr, -Math.PI / 2, Math.PI / 2, false); fl.absarc(-fw / 2 + fr, 0, fr, Math.PI / 2, 3 * Math.PI / 2, false); fl.closePath();
  for (const s of [-1, 1]) { const h = new THREE.Path(); h.absarc(s * (fw / 2 - fr), 0, 0.0045, 0, TAU, true); fl.holes.push(h); }
  const hc = new THREE.Path(); hc.absarc(0, 0, 0.0081, 0, TAU, true); fl.holes.push(hc);
  const flange = mesh(slab(fl, 0.006, 0, 0.0006).rotateY(-Math.PI / 2), F.alu); flange.position.x = 0.006; g.add(flange);
  const pilot = mesh(latheY([[0.0081, 0], [0.016, 0], [0.016, 0.004], [0.0081, 0.004], [0.0081, 0]], 40).rotateZ(Math.PI / 2), F.alu); pilot.position.x = 0; g.add(pilot);   // czop centrujący
  // wał: wystaje w −x z czopem centrującym, kręci się z kołem napędowym
  const spin = new THREE.Group(); g.add(spin);
  const shL = 0.03 + 0.012 + Lb + 0.008, shaft = mesh(cylX(0.006, shL, 24), F.steel); shaft.position.x = -0.03 + shL / 2;   // koniec w tylnej pokrywie (łożysko) spin.add(shaft);
  const key = mesh(new THREE.BoxGeometry(0.018, 0.003, 0.003), F.dark); key.position.set(-0.016, 0.0055, 0); spin.add(key);
  const seal = mesh(new THREE.TorusGeometry(0.0068, 0.0012, 8, 32).rotateY(Math.PI / 2), F.rubber); seal.position.x = -0.0005; seal.userData.doctorOk = 'clash'; g.add(seal);
  // koła zębate wewnątrz (widoczne przy cut): oś x, napędowe w y = 0, bierne w y = a
  const g1 = MK.gear({ z, m, w: b, bore: 0.006, key: false, hub: false, holes: false, mat: 'gear' }), g2 = MK.gear({ z, m, w: b, bore: 0.006, key: false, hub: false, holes: false, mat: 'gear' });
  g1.position.x = cx; g2.position.set(cx, a, 0); g.add(g1, g2);
  const shaft2 = mesh(cylX(0.006, Lb + 0.02, 24), F.steel); shaft2.position.set(cx, a, 0); g.add(shaft2);
  if (!cut) { g1.visible = g2.visible = shaft2.visible = false; }
  // króćce: ssawny −z (G 1/2), tłoczny +z (G 3/8) — kwadratowe nadlewy z gwintem i złączką
  const ports = {};
  for (const [s, d, k] of [[-1, 0.016, 'in'], [1, 0.012, 'out']]) {
    const boss = mesh(new THREE.BoxGeometry(Lb * 0.9, 0.026, 0.006), F.alu); boss.position.set(cx, a / 2, s * (W / 2 + 0.003)); g.add(boss);
    const f = endFitting({ d: d * 0.65 }); f.rotation.x = s * Math.PI / 2; f.position.set(cx, a / 2, s * (W / 2 + 0.006)); g.add(f);
    ports[k] = new THREE.Vector3(cx, a / 2, s * (W / 2 + 0.006 + fitLen(d * 0.65)));
  }
  // śruby pokryw (4 na czole), strzałka kierunku obrotów, tabliczka
  for (const [y, zz] of [[-ra * 0.2, -W / 2 + 0.006], [-ra * 0.2, W / 2 - 0.006], [a + ra * 0.2, -W / 2 + 0.006], [a + ra * 0.2, W / 2 - 0.006]]) { const h = mesh(cylX(0.0032, 0.004, 12), F.dark); h.position.set(0.012 + Lb + 0.014 + 0.002, y, zz); g.add(h); }
  const lt = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#d8dbde'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 26px sans-serif'; c.fillText(`${(2 * Math.PI * m * m * z * b * 1e6).toFixed(1)} cm³`, 10, 34); c.font = '20px sans-serif'; c.fillText('p max 250 bar · n 500–3000', 10, 64); c.fillText(EN ? '→ rotation: right' : '→ obroty: prawe', 10, 88); });
  const plate = mesh(new THREE.PlaneGeometry(W * 0.62, W * 0.62 * 0.375), decal(lt.t)); plate.rotation.y = Math.PI / 2; plate.position.set(0.012 + Lb + 0.014 + 0.0003, a / 2, 0); g.add(plate);   // na tylnej pokrywie
  const setAngle = (th) => { spin.rotation.x = th; g1.rotation.x = th; g2.rotation.x = -th + Math.PI / z; };
  setAngle(0);
  g.userData = { m, z, b, Vg: 2 * Math.PI * m * m * z * b, a, L: 0.012 + Lb + 0.014 + 0.004, H: Hb, W, portAt: ports, setAngle, mass: 0.9 + Lb * 40,
    ports: { shaft: port(EN ? 'Shaft (spline)' : 'Wał (wielowypust)', DOMAIN.rot, 'wał'), in: port(EN ? 'Suction S (G 1/2)' : 'Ssanie S (G 1/2)', DOMAIN.fluid, 'gwint'), out: port(EN ? 'Pressure P (G 3/8)' : 'Tłoczenie P (G 3/8)', DOMAIN.fluid, 'gwint') } };
  return g;
}

// latarnia: kołnierz silnika (IEC B14) → kołnierz pompy, okienko kontrolne sprzęgła; wzdłuż +x od x = 0
export function bellHousing({ d1 = 0.105, d2 = 0.07, len = 0.075, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(); g.name = name || (EN ? 'Bell housing' : 'Latarnia (kielich)');
  const t = 0.004, prof = [[d1 / 2 - t * 2, 0], [d1 / 2, 0], [d1 / 2, 0.008], [d2 / 2 + 0.006, len - 0.008], [d2 / 2 + 0.006, len], [d2 / 2 - t, len], [d2 / 2 - t, len - 0.008 - t], [d1 / 2 - t * 2, 0.008 + t]];
  const sh = mesh(latheY([...prof, prof[0]], 48).rotateZ(-Math.PI / 2), F.alu); g.add(sh);
  g.userData = { len, mass: 0.6 };
  return g;
}

export function pistonPump({ D = 0.012, s = 0.012, z = 3, cut = false, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), r = s / 2, l = 0.05, pitch = 0.04, Lc = pitch * z + 0.03, yc = 0.05;
  g.name = name || `${EN ? 'Plunger pump' : 'Pompa tłokowa'} ${z} × Ø${Math.round(D * 1000)}`;
  // skrzynia korbowa (żeliwo malowane), pokrywa przezroczysta przy cut
  const box = mesh(new THREE.BoxGeometry(Lc, 0.056, 0.07), cut ? F.acrylic : F.hydPaint); box.position.set(0, yc + 0.01, 0); g.add(box);
  const tray = mesh(new THREE.BoxGeometry(Lc, 0.02, 0.07), F.hydPaint); tray.position.set(0, 0.022, 0); g.add(tray);   // dolna wanna (zawsze z żeliwa)
  for (const sx of [-1, 1]) { const foot = mesh(new THREE.BoxGeometry(0.025, 0.012, 0.11), F.hydPaint); foot.position.set(sx * (Lc / 2 - 0.02), 0.006, 0); g.add(foot); }
  const neck = mesh(new THREE.BoxGeometry(Lc * 0.9, 0.035, 0.05), cut ? F.acrylic : F.hydPaint); neck.position.set(0, yc + 0.0555, 0); g.add(neck);
  // głowica z kanałami (mosiądz), króćce ssawny z boku (−z), tłoczny (+z)
  const yh = yc + 0.073, head = mesh(new THREE.BoxGeometry(Lc * 0.92, 0.04, 0.055), F.brassF); head.position.set(0, yh + 0.02, 0); g.add(head);
  const ports = {};
  for (const [sz, d, k] of [[-1, 0.012, 'in'], [1, 0.009, 'out']]) { const f = endFitting({ d: d * 0.7 }); f.rotation.x = sz * Math.PI / 2; f.position.set(0, yh + 0.02, sz * 0.0275); g.add(f); ports[k] = new THREE.Vector3(0, yh + 0.02, sz * (0.0275 + fitLen(d * 0.7))); }
  for (let i = 0; i < z; i++) { const cap = mesh(hexY(0.018, 0.008), F.brassF); cap.position.set((i - (z - 1) / 2) * pitch, yh + 0.044, 0); g.add(cap); }
  // wał korbowy (wzdłuż x), korbowody, krzyżulce i tłoczki
  const crank = new THREE.Group(); crank.position.y = yc; g.add(crank);
  const main = mesh(cylX(0.007, Lc + 0.04, 24), F.steel); crank.add(main);
  const rods = [], plungers = [], pins = [];
  for (let i = 0; i < z; i++) {
    const x = (i - (z - 1) / 2) * pitch, ph = i * TAU / z;
    for (const dx of [-0.009, 0.009]) { const web = mesh(new THREE.BoxGeometry(0.004, r + 0.016, 0.016), F.steel); web.position.set(x + dx, 0, 0); web.userData.ph = ph; crank.add(web); }
    const pin = mesh(cylX(0.005, 0.024, 20), F.steelP); crank.add(pin); pins.push([pin, ph]);
    const rod = MK.conRod({ l, w: 0.01, t: 0.006 }); g.add(rod); rods.push([rod, x, ph]);
    const pl = mesh(new THREE.CylinderGeometry(D / 2, D / 2, 0.05, 24), F.chrome); g.add(pl); plungers.push([pl, x, ph]);
    const gland = mesh(hexY(0.022, 0.01), F.brassF); gland.position.set(x, yh - 0.005, 0); g.add(gland);
  }
  if (!cut) crank.visible = false;
  rods.forEach(([o]) => (o.visible = cut));
  const setAngle = (th) => {
    crank.children.forEach((c) => { if (c.userData.ph !== undefined) { const a = th + c.userData.ph; c.position.y = Math.cos(a) * r / 2; c.position.z = Math.sin(a) * r / 2; c.rotation.x = a; } });
    pins.forEach(([pin, ph], i) => { const x = (i - (z - 1) / 2) * pitch, a = th + ph; pin.position.set(x, Math.cos(a) * r, Math.sin(a) * r); });
    for (let i = 0; i < z; i++) {
      const [rod, x, ph] = rods[i], a = th + ph, A = new THREE.Vector3(x, yc + r * Math.cos(a), r * Math.sin(a)), yB = yc + r * Math.cos(a) + Math.sqrt(l * l - (r * Math.sin(a)) ** 2), B = new THREE.Vector3(x, yB, 0);
      rod.userData.pose(A, B, X);
      plungers[i][0].position.set(x, yB + 0.025, 0);
    }
  };
  setAngle(0);
  g.userData = { D, s, z, Vg: Math.PI * D * D / 4 * s * z, portAt: ports, setAngle, mass: 6 + z * 0.8,
    ports: { shaft: port(EN ? 'Crankshaft' : 'Wał korbowy', DOMAIN.rot, 'wał'), in: port(EN ? 'Suction' : 'Ssanie', DOMAIN.fluid, 'gwint'), out: port(EN ? 'Pressure' : 'Tłoczenie', DOMAIN.fluid, 'gwint') } };
  return g;
}

export function centrifugalPump({ D2 = 0.04, cut = false, kW = 0.18, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group();
  g.name = name || `${EN ? 'Centrifugal pump' : 'Pompa odśrodkowa'} Ø${Math.round(D2 * 1000)}`;
  const mot = MK.motor({ kW, paint: 'paintGrey' }), hA = mot.userData.spin.position.y; g.add(mot);
  const k = hA / 0.09, x0 = 0.05 * k + 0.004;     // czoło silnika za czopem wału; spirala od x0
  // spirala: obrys w płaszczyźnie (z, y) — promień rośnie z kątem, tłoczenie stycznie w górę
  const R1 = D2 / 2 + 0.004, R2 = D2 / 2 + 0.016, bw = 0.022, sh = new THREE.Shape(), N = 48;
  for (let i = 0; i <= N; i++) { const t = i / N, ang = Math.PI / 2 + t * TAU * 0.97, rr = R1 + (R2 - R1) * t; const zz = Math.cos(ang) * rr, yy = Math.sin(ang) * rr; if (i === 0) sh.moveTo(zz, yy); else sh.lineTo(zz, yy); }
  sh.lineTo(R2 * 0.05, R2 + 0.03); sh.lineTo(-R1 * 0.55, R2 + 0.03); sh.closePath();
  const vol = mesh(slab(sh, bw, 0, 0.001).rotateY(Math.PI / 2), cut ? F.acrylic : F.pumpGreen); vol.position.set(x0, hA, 0); g.add(vol);
  const back = mesh(cylX(R2 + 0.002, 0.006, 48), F.pumpGreen); back.position.set(x0 - 0.003, hA, 0); g.add(back);
  // króciec tłoczny (do góry, G 3/4) i ssawny (osiowo +x, G 1)
  const outX = x0 + bw / 2, outZ = -R1 * 0.25, outY = hA + R2 + 0.03;
  const nOut = mesh(latheY([[0, 0], [0.011, 0], [0.011, 0.016], [0.013, 0.016], [0.013, 0.024], [0, 0.024]], 32), cut ? F.acrylic : F.pumpGreen); nOut.position.set(outX, outY, outZ); g.add(nOut);
  const nIn = mesh(latheY([[0, 0], [0.014, 0], [0.012, 0.02], [0.014, 0.02], [0.014, 0.03], [0, 0.03]], 32).rotateZ(-Math.PI / 2), cut ? F.acrylic : F.pumpGreen); nIn.position.set(x0 + bw, hA, 0); g.add(nIn);
  // wirnik zamknięty z łopatkami zagiętymi do tyłu (obraca się)
  const imp = new THREE.Group(); imp.position.set(x0 + bw / 2, hA, 0); g.add(imp);
  const disc = mesh(cylX(D2 / 2, 0.002, 40), F.brass); disc.position.x = -bw * 0.25; imp.add(disc);
  const shroud = mesh(latheY([[0.007, 0], [D2 / 2, 0], [D2 / 2, 0.002], [0.007, 0.002], [0.007, 0]], 40).rotateZ(-Math.PI / 2), F.brass); shroud.position.x = bw * 0.2; imp.add(shroud);
  const hubL = bw * 0.25 + 0.004, hub = mesh(cylX(0.006, hubL, 20), F.steel); hub.position.x = -bw * 0.25 - hubL / 2; imp.add(hub);   // piasta na czopie wału silnika
  for (let i = 0; i < 6; i++) {
    const vs = new THREE.Shape(), a0 = i * TAU / 6; let pts = [];
    for (let j = 0; j <= 8; j++) { const t = j / 8, rr = 0.007 + t * (D2 / 2 - 0.008), ang = a0 + t * 0.9; pts.push([Math.cos(ang) * rr, Math.sin(ang) * rr]); }
    vs.moveTo(pts[0][0], pts[0][1]); for (const p of pts) vs.lineTo(p[0], p[1]); for (let j = pts.length - 1; j >= 0; j--) { const [px, py] = pts[j], n = Math.hypot(px, py); vs.lineTo(px - py / n * 0.0012, py + px / n * 0.0012); }
    const vane = mesh(slab(vs, bw * 0.45 - 0.002, 0, 0.0002).rotateY(Math.PI / 2), F.brass); vane.position.x = -bw * 0.25 + 0.001; imp.add(vane);
  }
  if (!cut) imp.visible = false;
  const setAngle = (th) => { mot.userData.spin.rotation.x = th; imp.rotation.x = th; };
  g.userData = { D2, hA, portAt: { in: new THREE.Vector3(x0 + bw + 0.03, hA, 0), out: new THREE.Vector3(outX, outY + 0.024, outZ) }, setAngle, mass: 4.5 + kW * 20,
    ports: { power: port(EN ? 'Supply 230 V' : 'Zasilanie 230 V', DOMAIN.el, 'zacisk'), in: port(EN ? 'Suction (G 1, axial)' : 'Ssanie (G 1, osiowo)', DOMAIN.fluid, 'gwint'), out: port(EN ? 'Discharge (G 3/4, up)' : 'Tłoczenie (G 3/4, w górę)', DOMAIN.fluid, 'gwint') } };
  return g;
}
