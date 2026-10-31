// Sprzęgi: końcówki na czołownicy (gładka, jarzmo pod łańcuch, hak cięgłowy),
// głowica sprzęgu kłowego (kształty z data.js, kość na sworzniu) i ogniwo łańcucha.
// Z aTrain (js/app.js: buildBody, makeKnuckleMesh, linkGeo).
import { BUF_Y, HOOK_EXT, KN, KN_EP, CH } from "../data.js";
import { trainMaterials, box } from "../materials.js";
const THREE = window.THREE;

// końcówka na czołownicy: 'plain' | 'shackle' | 'hook' | 'knuckle' (sama głowica: knuckleHead)
export function couplerEnd(g, Lb, sx, kind, y) {
  const mat = trainMaterials(), hx = sx * (Lb / 2 + HOOK_EXT), hy = y(BUF_Y);
  if (kind === "plain") box(g, mat.steel, 0.36, 0.08, 0.09, sx * (Lb / 2 + 0.16), hy, 0);
  if (kind === "shackle") {   // sworzeń z jarzmem, na którym wisi pierwsze ogniwo
    box(g, mat.steel, 0.30, 0.10, 0.10, sx * (Lb / 2 + 0.13), hy, 0);
    for (const sz of [1, -1]) box(g, mat.steel, 0.07, 0.12, 0.025, hx - sx * 0.01, hy, sz * 0.045);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 12), mat.steel); pin.rotation.x = Math.PI / 2; pin.position.set(hx, hy, 0); g.add(pin);
  }
  if (kind === "hook") {   // hak cięgłowy: trzon i zagięty dziób
    box(g, mat.steel, 0.27, 0.09, 0.09, sx * (Lb / 2 + 0.125), hy - 0.035, 0);
    const tip = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.022, 10, 18, Math.PI), mat.steel); tip.rotation.z = Math.PI; tip.position.set(hx, hy + 0.01, 0); g.add(tip);
    box(g, mat.steel, 0.056, 0.08, 0.056, hx + sx * 0.045, hy + 0.04, 0);
  }
}

// głowica sprzęgu kłowego w swoim układzie; userData.kn = kość (obrót wokół y: −kąt otwarcia)
export function knuckleHead() {
  const mat = trainMaterials(), m = mat.knuckle, g = new THREE.Group(), Hh = 2 * KN.hh - 0.02;
  g.name = "głowica sprzęgu";
  box(g, m, 0.85, 0.17, 0.15, (KN.pivot + 0.25) / 2, 0, 0);
  box(g, m, 0.12, Hh, 0.5, 0.14, 0, -0.02);                       // korpus głowicy za gardzielą
  const pin = KN.shapes[2].a, kn = new THREE.Group(); kn.position.set(pin[0], 0, pin[1]); g.add(kn);   // kość na sworzniu
  KN.shapes.forEach((sh, i) => {
    const par = i === 2 || i === 3 ? kn : g, ox = par === kn ? pin[0] : 0, oz = par === kn ? pin[1] : 0;
    const [ax, az] = sh.a, [bx, bz] = sh.b, len = Math.hypot(bx - ax, bz - az);
    const b = box(par, m, len, Hh, 2 * sh.r, (ax + bx) / 2 - ox, 0, (az + bz) / 2 - oz); b.rotation.y = -Math.atan2(bz - az, bx - ax);
    for (const [px, pz] of [sh.a, sh.b]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(sh.r, sh.r, Hh, 18), m); c.position.set(px - ox, 0, pz - oz); par.add(c); }
  });
  const pinM = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, Hh + 0.06, 10), mat.steel); pinM.position.set(pin[0], 0, pin[1]); g.add(pinM);
  g.userData.kn = kn;
  return g;
}

// głowica w spoczynku na czołownicy pojazdu (end: +1 przód, −1 tył), w układzie pudła
export function knuckleOnVehicle(Lb, end, y) {
  const h = knuckleHead(), palmX = end * (Lb / 2 + KN_EP);
  h.position.set(palmX - end * KN.palm, y(BUF_Y), 0);
  if (end < 0) h.rotation.y = Math.PI;
  return h;
}

// kąt otwarcia kości [rad]
export function setKnuckle(head, ang) { head.userData.kn.rotation.y = -ang; }

// ogniwo łańcucha (owalny pierścień w płaszczyźnie x–y), pitch = rozstaw środków ogniw
export function chainLinkGeometry(pitch) {
  const rr = CH.rr, s = pitch / 2 - rr + CH.rw, pts = [];
  for (let k = 0; k < 64; k++) {
    const t = k / 64, per = 4 * s + 2 * Math.PI * rr; let d = t * per, x, yy;
    if (d < 2 * s) { x = -s + d; yy = -rr; }
    else if ((d -= 2 * s) < Math.PI * rr) { const a = -Math.PI / 2 + d / rr; x = s + rr * Math.cos(a); yy = rr * Math.sin(a); }
    else if ((d -= Math.PI * rr) < 2 * s) { x = s - d; yy = rr; }
    else { d -= 2 * s; const a = Math.PI / 2 + d / rr; x = -s + rr * Math.cos(a); yy = rr * Math.sin(a); }
    pts.push(new THREE.Vector3(x, yy, 0));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, CH.rw, 8, true);
}
