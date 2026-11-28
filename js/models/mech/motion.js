// MechKit — zamiana ruchu: listwa zębata (rack), suwak w prowadnicy (slider, opcjonalnie z listwą), korbowód (conRod),
// śruba pociągowa (leadScrew) z nakrętką na wózku (screwNut). Części przesuwne w userData.slide, oś w userData.slideAxis.
import * as THREE from '../../../vendor/three/three.module.js';
import { ALU_RHO, box, cyl, DOMAIN, extrude, materials, mesh, newPart, PHYS, port, ringX, ringY, STEEL_RHO, TAU } from './base.js';
import { rackHulls } from './teeth.js';

export function rackShape(m, n, hb, y0 = 0) {
  const p = Math.PI * m, hulls = rackHulls(m, n), sh = new THREE.Shape(), L = n * p;
  sh.moveTo(y0, -1.25 * m - hb); sh.lineTo(y0 + L, -1.25 * m - hb); sh.lineTo(y0 + L, -1.25 * m);
  for (let i = n - 1; i >= 0; i--) { const q = hulls[i]; sh.lineTo(y0 + q[1][0], q[1][1]); sh.lineTo(y0 + q[2][0], q[2][1]); sh.lineTo(y0 + q[3][0], q[3][1]); sh.lineTo(y0 + q[0][0], q[0][1]); }
  sh.lineTo(y0, -1.25 * m); sh.closePath();
  return sh;
}
// listwa sama (przesuwna część w userData.slide, ruch wzdłuż lokalnego y); linia podziałowa na z = 0, listwa od y = 0
export function rack({ m = 0.0015, n = 40, w = 0.012, hb = 0.01, name } = {}) {
  const M = materials(), g = new THREE.Group(), slide = new THREE.Group(); g.add(slide); g.name = name || `Listwa zębata m${m * 1000}, ${n} zębów`;
  slide.add(mesh(extrude(rackShape(m, n, hb), w, 0.0003, 4), M.gear));
  const L = n * Math.PI * m, mass = STEEL_RHO * w * L * (hb + 1.6 * m);
  Object.assign(g.userData, { slide, slideAxis: 'y', m, n, p: Math.PI * m, L, w, hb, rack: true, mass, J: mass,
    phys: { ...PHYS.rack, luz: PHYS.rack.thin * m }, ports: { mesh: port('Zazębienie', DOMAIN.lin, 'zazębienie'), mount: port('Mocowanie', DOMAIN.lin, 'mocowanie') } });
  return g;
}
// suwak w prowadnicy (ruch wzdłuż lokalnego y, góra = +z): wózek na dwóch szynach, sworzeń korbowodu z boku (−x),
// opcjonalnie listwa zębata na wózku (rack: { m, n, w }) — jedna część przesuwna
export function slider({ len = 0.07, w = 0.04, h = 0.03, travel = 0.24, rack: rk = null, name } = {}) {
  const M = materials(), g = new THREE.Group(), slide = new THREE.Group(); g.add(slide); g.name = name || 'Suwak w prowadnicy';
  const railL = travel + len, rz = -h / 2 - 0.006;
  for (const sx of [-1, 1]) { const r = mesh(box(0.008, railL, 0.012), M.steel); r.position.set(sx * (w / 2 - 0.006), 0, rz); g.add(r); }
  const plate = mesh(box(w + 0.02, railL + 0.02, 0.008), M.iron); plate.position.z = rz - 0.01; g.add(plate);
  const blk = mesh(box(w, len, h), M.dark); slide.add(blk);
  const pin = mesh(cyl(0.006, 0.016, 20), M.steel); pin.position.set(-w / 2 - 0.008, 0, 0); slide.add(pin);
  let mass = STEEL_RHO * w * len * h * 0.8, rackInfo = null;
  if (rk) {
    const m = rk.m || 0.0015, n = rk.n || 30, rw = rk.w || 0.012, hb = 0.008, L = n * Math.PI * m;
    const bar = mesh(extrude(rackShape(m, n, hb, -L / 2), rw, 0.0003, 4), M.gear); bar.position.z = h / 2 + hb + 1.25 * m; slide.add(bar);
    mass += STEEL_RHO * rw * L * (hb + 1.6 * m);
    rackInfo = { m, n, w: rw, L, p: Math.PI * m, y0: -L / 2, z: h / 2 + hb + 1.25 * m, luz: PHYS.rack.thin * m };
  }
  Object.assign(g.userData, { slide, slideAxis: 'y', len, w, h, travel, pin: new THREE.Vector3(-w / 2 - 0.008, 0, 0), rack: rackInfo, mass, J: mass,
    phys: { ...PHYS.slide, ...(rackInfo ? { ...PHYS.rack, luz: rackInfo.luz } : {}) },
    ports: { pin: port('Sworzeń korbowodu', DOMAIN.lin, 'sworzeń'), ...(rackInfo ? { mesh: port('Listwa — zazębienie', DOMAIN.lin, 'zazębienie') } : {}) } });
  return g;
}
// korbowód (oczka na obu końcach, oś wzdłuż lokalnego +x od 0 do l): położenie z punktów sworzni — pose(A, B)
export function conRod({ l = 0.2, w = 0.014, t = 0.008, name } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name || 'Korbowód';
  // oczka z tulejami z brązu (łożyska ślizgowe sworzni Ø 12) — sworzeń przechodzi przez tuleję, trzon między oczkami
  const ro = w * 0.85, rb = 0.006, rt = rb + 0.0015, body = mesh(box(l - 2 * ro + 0.004, w, t), M.dark); body.position.x = l / 2; g.add(body);
  for (const x of [0, l]) {
    const eye = mesh(ringY(rt, ro, t * 1.2, 28).rotateX(Math.PI / 2), M.dark); eye.position.x = x; g.add(eye);
    const bush = mesh(ringY(rb, rt, t * 1.2, 28).rotateX(Math.PI / 2), M.brass); bush.position.x = x; g.add(bush);
  }
  // ustawienie: oś x korbowodu od A do B, oczka (oś lokalna z) współosiowe ze sworzniami (oś sworzni: axis, domyślnie świat x)
  const v = new THREE.Vector3(), yv = new THREE.Vector3(), zv = new THREE.Vector3(), Mb = new THREE.Matrix4();
  const pose = (A, B, axis = new THREE.Vector3(1, 0, 0)) => {
    g.position.copy(A); v.subVectors(B, A).normalize();
    zv.copy(axis).addScaledVector(v, -axis.dot(v)).normalize(); yv.crossVectors(zv, v);
    g.quaternion.setFromRotationMatrix(Mb.makeBasis(v, yv, zv));
  };
  const mass = STEEL_RHO * l * w * t;
  Object.assign(g.userData, { l, mass, pose, phys: { ...PHYS.crank } });
  return g;
}
// śruba pociągowa (oś wzdłuż +x od 0 do len): rdzeń z bruzdą śrubową, czopy na końcach; część obracająca się w spin
export function leadScrew({ d = 0.02, lead = 0.02, len = 0.5, starts = 1, kind = 'ball', thread = null, name } = {}) {
  // thread: [x0, x1] — odcinek gwintowany (dalej czopy łożyskowe Ø 0,84·d); bez — gwint na całej długości
  const M = materials(), g = newPart(name || `Śruba ${kind === 'ball' ? 'kulowa' : 'trapezowa'} Ø${Math.round(d * 1000)}×${Math.round(lead * 1000)}`), sp = g.userData.spin;
  const rc = d * 0.42, [t0, t1] = thread || [0, len];
  const core = mesh(cyl(rc, len, 32), M.steel); core.position.x = len / 2; sp.add(core);
  const turns = (t1 - t0) / lead * starts, pts = [];
  for (let st = 0; st < starts; st++) {
    pts.length = 0; const n = Math.max(24, Math.round(turns / starts * 12));
    for (let i = 0; i <= n; i++) { const u = i / n, x = t0 + u * (t1 - t0), a = (x - t0) / lead * TAU + st * TAU / starts; pts.push(new THREE.Vector3(x, rc * Math.cos(a), rc * Math.sin(a))); }
    const th = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.slice()), n * 2, d * 0.09, 6), M.steel); sp.add(th);
    for (const q of [pts[0], pts[pts.length - 1]]) { const cap = mesh(new THREE.SphereGeometry(d * 0.09, 8, 6), M.steel); cap.position.copy(q); sp.add(cap); }   // zakończenia bruzdy
  }
  const mass = STEEL_RHO * Math.PI * (d * 0.45) ** 2 * len, ph = PHYS.screw[kind] || PHYS.screw.ball;
  Object.assign(g.userData, { d, lead, len, starts, kind, thread: [t0, t1], r: rc, rj: rc, mass, J: 0.5 * mass * (d * 0.45) ** 2, phys: { ...ph },
    ports: { a: port('Czop A', DOMAIN.rot, 'wał'), b: port('Czop B', DOMAIN.rot, 'wał'), thread: port('Gwint', DOMAIN.rot, 'gwint') } });
  return g;
}
// nakrętka śruby z wózkiem na prowadnicy (ruch wzdłuż lokalnego x — oś śruby; góra = +y): nakrętka z kołnierzem,
// wózek pod nią, szyna nieruchoma na wysokości −hc (podłoże); kierunek gwintu przenosi połączenie 'screw'
export function screwNut({ d = 0.02, lead = 0.02, kind = 'ball', hc = 0.06, travel = 0.12, name } = {}) {
  const M = materials(), g = new THREE.Group(), slide = new THREE.Group(); g.add(slide); g.name = name || `Nakrętka ${kind === 'ball' ? 'kulowa' : 'trapezowa'} z wózkiem`;
  // nakrętka i kołnierz jako pierścienie: otwór na śrubę (kulki w bieżni — luz 0,5 mm do gwintu)
  const ro = d * 0.85, ri = d * 0.51 + 0.0005, nut = mesh(ringX(ri, ro, 0.05, 32), M.dark); slide.add(nut);
  const fl = mesh(ringX(ri, ro * 1.7, 0.01, 32), M.dark); fl.position.x = -0.03; slide.add(fl);
  const car = mesh(box(0.06, hc - ro - 0.022, 0.05), M.alu); car.position.y = -(ro + (hc - ro - 0.022) / 2); slide.add(car);
  const shoe = mesh(box(0.066, 0.014, 0.04), M.steel); shoe.position.y = -hc + 0.019; slide.add(shoe);
  const rail = mesh(box(travel + 0.08, 0.012, 0.02), M.steel); rail.position.y = -hc + 0.006; g.add(rail);
  g.userData.mounts = [-1, 1].map((sx) => ({ p: new THREE.Vector3(sx * (travel / 2 + 0.03), -hc + 0.012, 0), d: 0.006 }));
  const mass = 0.35 + ALU_RHO * 0.06 * 0.05 * (hc - ro), ph = PHYS.screw[kind] || PHYS.screw.ball;
  Object.assign(g.userData, { mounts: g.userData.mounts, slide, slideAxis: 'x', d, lead, kind, hc, travel, mass, J: mass, phys: { ...ph, ...PHYS.slide },
    ports: { thread: port('Gwint nakrętki', DOMAIN.lin, 'gwint'), mount: port('Wózek — mocowanie', DOMAIN.lin, 'mocowanie') } });
  return g;
}
