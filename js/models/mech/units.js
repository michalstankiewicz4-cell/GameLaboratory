// MechKit — silnik (motor), obudowy z akrylu (housing, tubeHousing), przekładnia planetarna (planetary), hamulec tarczowy (discBrake).
import * as THREE from '../../../vendor/three/three.module.js';
import { boreHole, box, circlePath, cyl, DOMAIN, extrude, lathe, materials, mesh, MOTOR_ELEC, newPart, PHYS, planetPhase, port, ringX, STEEL_RHO, TAU, uvScale } from './base.js';
import { gear, ringGear } from './gears.js';

/* ---------------- silnik ---------------- */
// trójfazowy silnik indukcyjny 1,1 kW, wielkość 90: oś 90 mm nad łapami; wał wyjściowy na +x
// silniki indukcyjne IEC (4 bieguny): moc → wielkość mechaniczna (wysokość osi), masa, bezwładność wirnika (dane katalogowe)
export const MOTORS = [
  { kW: 0.18, frame: '63', H: 0.063, mass: 4.2, J: 0.00035 }, { kW: 0.37, frame: '71', H: 0.071, mass: 6.2, J: 0.0008 }, { kW: 0.75, frame: '80', H: 0.08, mass: 9.5, J: 0.0018 },
  { kW: 1.1, frame: '90S', H: 0.09, mass: 13.5, J: 0.0028 }, { kW: 1.5, frame: '90L', H: 0.09, mass: 15.5, J: 0.0035 }, { kW: 2.2, frame: '100L', H: 0.1, mass: 22, J: 0.0065 },
  { kW: 4, frame: '112M', H: 0.112, mass: 31, J: 0.0115 }, { kW: 5.5, frame: '132S', H: 0.132, mass: 43, J: 0.0255 }, { kW: 7.5, frame: '132M', H: 0.132, mass: 52, J: 0.033 },
];
export function motor({ kW = 1.1, poles = 4, paint = 'paintBlue', name } = {}) {
  const spec = MOTORS.find((m) => m.kW >= kW) || MOTORS[MOTORS.length - 1];
  const M = materials(), g = newPart(name || `Silnik indukcyjny ${String(spec.kW).replace('.', ',')} kW`), H = 0.09, L = 0.25, body0 = new THREE.Group(), kS = spec.H / 0.09;
  body0.scale.setScalar(kS); body0.position.y = 0; g.add(body0);
  const add0 = (o) => body0.add(o);
  const body = mesh(cyl(0.083, L, 40), M.paintBlue); body.position.set(-L / 2 - 0.04, H, 0); add0(body);
  const fins = new THREE.InstancedMesh(box(L * 0.92, 0.014, 0.0035), M.paintBlue, 30); fins.castShadow = true; fins.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let k = 0; k < 30; k++) { const a = k * TAU / 30; e.set(a, 0, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(-L / 2 - 0.04, H + Math.cos(a) * 0.09, Math.sin(a) * 0.09), q, new THREE.Vector3(1, 1, 1)); fins.setMatrixAt(k, m4); }
  add0(fins);
  const bellF = mesh(lathe([[0.012, 0.0], [0.05, 0.0], [0.086, 0.025], [0.086, 0.04], [0.012, 0.04]], 40), M.paintBlue); bellF.position.set(-0.04, H, 0); add0(bellF);
  const cowl = mesh(uvScale(new THREE.CylinderGeometry(0.09, 0.09, 0.084, 40, 1, true).rotateZ(-Math.PI / 2), 1), M.paintBlue); cowl.position.set(-L - 0.078, H, 0); add0(cowl);   // osłona wentylatora bez denek; tył zamyka kratka
  const grill = mesh(new THREE.CircleGeometry(0.09, 40).rotateY(-Math.PI / 2), M.black); grill.position.set(-L - 0.12, H, 0); add0(grill);
  const cowlRing = mesh(new THREE.RingGeometry(0.08, 0.09, 40).rotateY(Math.PI / 2), M.paintBlue); cowlRing.position.set(-L - 0.036, H, 0); add0(cowlRing);   // przód osłony — szczelina do kadłuba zamknięta
  const tbox = mesh(box(0.1, 0.06, 0.1), M.paintBlue); tbox.position.set(-0.15, H + 0.11, 0); add0(tbox);
  const lid = mesh(box(0.104, 0.008, 0.104), M.paintBlue); lid.position.set(-0.15, H + 0.144, 0); add0(lid);
  const plateN = mesh(box(0.06, 0.0015, 0.035), M.alu); plateN.position.set(-0.22, H + 0.085, 0.045); plateN.rotation.x = 0.9; add0(plateN);
  for (const x of [-0.08, -0.25]) { const foot = mesh(box(0.04, 0.012, 0.18), M.paintBlue); foot.position.set(x, 0.006, 0); add0(foot); const web = mesh(box(0.03, H - 0.05, 0.11), M.paintBlue); web.position.set(x, (H - 0.05) / 2 + 0.01, 0); add0(web); }
  // wał wyjściowy (wiruje)
  const sr = 0.012 * kS, sl = 0.05 * kS;
  const sh = mesh(cyl(sr, sl, 24), M.steel); sh.position.x = sl / 2; g.userData.spin.add(sh);
  const key = mesh(box(sl * 0.84, 0.002 * kS, sr * 0.5), M.dark); key.position.set(sl / 2, sr - 0.0005, 0); g.userData.spin.add(key);
  g.userData.spin.position.y = spec.H;
  if (paint !== 'paintBlue') body0.traverse((o) => { if (o.material === M.paintBlue) o.material = M[paint] || M.paintBlue; });
  const nSync = 6000 / poles, nRated = nSync * (1 - 0.034 - 0.02 / Math.sqrt(spec.kW));
  Object.assign(g.userData, { mounts: [-0.08, -0.25].flatMap((x) => [-0.07, 0.07].map((z) => ({ p: new THREE.Vector3(x, 0.012, z), d: 0.01 }))), base: { x0: -0.27, x1: -0.06, z: 0.09 }, ports: { out: port('Wał wyjściowy', DOMAIN.rot, 'wał'), power: port('Zaciski U V W', DOMAIN.el, 'zaciski') }, elec: { ...MOTOR_ELEC, kW: spec.kW, In: spec.kW * 1000 / (Math.sqrt(3) * MOTOR_ELEC.U * MOTOR_ELEC.eta * MOTOR_ELEC.cosPhi) }, H: spec.H, mass: spec.mass, J: spec.J * (poles >= 6 ? 1.6 : poles <= 2 ? 0.55 : 1), spec, poles, nSync, nRated, Tn: spec.kW * 1000 / (nRated * TAU / 60), shaftD: sr * 2, shaftL: sl });
  return g;
}

/* ---------------- obudowa z akrylu ---------------- */
// prostopadłościan: szyby z akrylu i profile aluminiowe 20 × 20 na krawędziach; size [x, y, z], środek w (0, 0, 0)
export function housing(size, { frame = 0.02, bores = [], name = 'Obudowa (akryl, profile 20 × 20)' } = {}) {
  // bores: [[y, z, r]] — otwory w ściankach x (względem środka) na łożyska wałów; wokół otworu — oprawka z aluminium
  const M = materials(), g = new THREE.Group(); g.name = name;
  const [sx, sy, sz] = size, panes = new THREE.Group(); panes.name = 'szyby';
  const wallX = () => { const sh = new THREE.Shape(); sh.moveTo(-sz / 2, -sy / 2); sh.lineTo(sz / 2, -sy / 2); sh.lineTo(sz / 2, sy / 2); sh.lineTo(-sz / 2, sy / 2); sh.closePath(); for (const [y, z, r] of bores) sh.holes.push(circlePath(r, 40, -z, y)); return new THREE.ShapeGeometry(sh, 24); };
  for (const sx2 of [-1, 1]) for (const [y, z, r] of bores) { const seat = mesh(ringX(r, r + 0.012, 0.012), M.alu); seat.position.set(sx2 * sx / 2, y, z); g.add(seat); }
  for (const [w, h, p, r] of [[sx, sy, [0, 0, sz / 2], [0, 0, 0]], [sx, sy, [0, 0, -sz / 2], [0, 0, 0]], [sz, sy, [sx / 2, 0, 0], [0, Math.PI / 2, 0]], [sz, sy, [-sx / 2, 0, 0], [0, Math.PI / 2, 0]], [sx, sz, [0, sy / 2, 0], [Math.PI / 2, 0, 0]]]) {
    const m = new THREE.Mesh(bores.length && r[1] ? wallX() : new THREE.PlaneGeometry(w, h), M.acrylic); m.position.set(...p); m.rotation.set(...r); m.renderOrder = 5; panes.add(m);
  }
  g.add(panes);
  const f = frame;
  for (const sy2 of [-1, 1]) for (const sz2 of [-1, 1]) { const e = mesh(box(sx + f, f, f), M.alu); e.position.set(0, sy2 * sy / 2, sz2 * sz / 2); g.add(e); }
  for (const sx2 of [-1, 1]) for (const sz2 of [-1, 1]) { const e = mesh(box(f, sy, f), M.alu); e.position.set(sx2 * sx / 2, 0, sz2 * sz / 2); g.add(e); }
  for (const sx2 of [-1, 1]) for (const sy2 of [-1, 1]) { const e = mesh(box(f, f, sz), M.alu); e.position.set(sx2 * sx / 2, sy2 * sy / 2, 0); g.add(e); }
  g.userData.panes = panes;
  return g;
}
// cylindryczna obudowa z akrylu (rura) z aluminiowymi pierścieniami, oś wzdłuż x
export function tubeHousing({ r = 0.1, len = 0.1, hole = 0.02, name = 'Obudowa (rura z akrylu)' } = {}) {   // hole: otwór w deklach (gniazdo łożyska)
  const M = materials(), g = new THREE.Group(); g.name = name;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 48, 1, true).rotateZ(-Math.PI / 2), M.acrylic); tube.renderOrder = 5;
  const panes = new THREE.Group(); panes.add(tube);
  for (const s of [-1, 1]) { const cap = new THREE.Mesh(new THREE.RingGeometry(hole, r, 48).rotateY(Math.PI / 2), M.acrylic); cap.position.x = s * len / 2; cap.renderOrder = 5; panes.add(cap); const rg = mesh(new THREE.TorusGeometry(r, 0.005, 8, 48).rotateY(Math.PI / 2), M.alu); rg.position.x = s * len / 2; g.add(rg); }
  g.add(panes); g.userData.panes = panes;
  return g;
}


/* ---------------- przekładnia planetarna ---------------- */
// słoneczne zs, n satelitów zp, korona zr = zs + 2·zp (stała), jarzmo; update(θs) ustawia jarzmo i satelity (Willis)
export function planetary({ zs = 24, zp = 24, n = 3, m = 0.002, w = 0.02, mat = 'gear', matP = 'brass', matR = 'brass' } = {}) {
  const M = materials(), zr = zs + 2 * zp, g = newPart(`Przekładnia planetarna ${zs}/${zp}/${zr}`), RC = m * (zs + zp) / 2;
  const sun = gear({ z: zs, m, w: w * 1.1, mat, hub: false, bore: Math.min(0.0125, m * zs * 0.25), name: 'Koło słoneczne' }); g.userData.spin.add(sun);
  const ring = ringGear({ z: zr, m, w, mat: matR }); g.add(ring);
  const carrier = new THREE.Group(), planets = [];
  for (let k = 0; k < n; k++) {
    const pl = gear({ z: zp, m, w: w * 0.9, mat: matP, hub: false, bore: Math.min(0.004, m * zp * 0.18), name: 'Satelita' });
    pl.position.set(0, RC * Math.cos(k * TAU / n), RC * Math.sin(k * TAU / n)); carrier.add(pl); planets.push(pl);
    const pin = mesh(cyl(Math.min(0.004, m * zp * 0.18) * 0.97, w * 2.6, 12), M.steel); pin.position.copy(pl.position); pin.position.x = w * 0.7; carrier.add(pin);   // luz w otworze satelity — bez wspólnej powierzchni
  }
  for (const x of [w * 1.4, w * 2.1]) { const d = mesh(new THREE.CylinderGeometry(RC + m * zp * 0.35, RC + m * zp * 0.35, w * 0.3, 48).rotateZ(Math.PI / 2), M.alu); d.position.x = x; carrier.add(d); }
  const out = mesh(cyl(0.0125, 0.08, 24), M.steel); out.position.x = w * 2.1 + 0.04; carrier.add(out);   // wał jarzma zaczyna się w środku tarczy
  g.add(carrier);
  const assembly = (zs + zr) / n, clearance = (zs + zp) * Math.sin(Math.PI / n) - (zp + 2);
  const ph = planetPhase(zs, zp, zr, n);
  ring.userData.spin.rotation.x = ph.ring;   // wrąb korony naprzeciw zęba satelity najbliższego punktowi styku
  function update(ts) {
    const tc = ts * zs / (zs + zr), rel = ts - tc;
    g.userData.spin.rotation.x = ts; carrier.rotation.x = tc;
    planets.forEach((pl, k) => { pl.userData.spin.rotation.x = ph.planet(k, rel); });
    return { tc };
  }
  const mass = sun.userData.mass + ring.userData.mass + planets.reduce((a, p) => a + p.userData.mass, 0) + 0.3;
  Object.assign(g.userData, { phys: { ...PHYS.planetary }, ports: { in: port('Wał słonecznego (wejście)', DOMAIN.rot, 'wał'), out: port('Jarzmo (wyjście)', DOMAIN.rot, 'wał') }, zs, zp, zr, n, m, ratio: 1 + zr / zs, assemblyOk: Number.isInteger(assembly), assembly, clearanceOk: clearance > 0, RC, R: ring.userData.R, mass, update, carrier, ring, sun });
  return g;
}

/* ---------------- hamulec tarczowy ---------------- */
export function discBrake({ d = 0.2, t = 0.008, vents = 12 } = {}) {
  const M = materials(), g = newPart(`Hamulec tarczowy Ø ${Math.round(d * 1000)}`), R = d / 2;
  const ds = new THREE.Shape(); ds.absarc(0, 0, R, 0, TAU, false); ds.holes.push(boreHole(0.0125));
  for (let k = 0; k < vents; k++) ds.holes.push(circlePath(R * 0.06, 16, R * 0.72 * Math.cos(k * TAU / vents), R * 0.72 * Math.sin(k * TAU / vents)));
  const hub = new THREE.Shape(); hub.absarc(0, 0, R * 0.32, 0, TAU, false); hub.holes.push(boreHole(0.0125));
  g.userData.spin.add(mesh(extrude(ds, t, 0.0005, 64), M.steel));
  const h = mesh(extrude(hub, 0.03, 0.001), M.dark); h.position.x = -0.019; g.userData.spin.add(h);
  // zacisk pływający okracza tarczę: dwie obudowy klocków po bokach (luz 1 mm do tarczy) i mostek nad krawędzią (2 mm)
  const gap = 0.001, ht = 0.018, cx = t / 2 + gap + ht / 2;
  for (const sx of [-1, 1]) { const c = mesh(box(ht, 0.05, 0.07), M.paintRed); c.position.set(sx * cx, R - 0.015, 0); g.add(c); }
  const bridge = mesh(box(2 * (cx + ht / 2) - 0.002, 0.012, 0.068), M.paintRed); bridge.position.set(0, R - 0.015 + 0.025 + 0.006, 0); g.add(bridge);   // mostek na obudowach klocków (nie w nich), 10 mm nad krawędzią tarczy
  const mass = STEEL_RHO * Math.PI * R * R * t * 0.9 + STEEL_RHO * Math.PI * (R * 0.32) ** 2 * 0.03;
  Object.assign(g.userData, { ports: { shaft: port('Piasta (wpust)', DOMAIN.rot, 'wpust') }, d, t, vents, mass, J: 0.5 * mass * R * R * 0.85 });
  return g;
}
