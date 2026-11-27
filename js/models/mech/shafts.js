// MechKit — wał (shaft), łożysko w oprawie (pillowBlock), sprzęgła (jawCoupling, flangeCoupling), przegub Cardana (yoke, cross).
import * as THREE from '../../../vendor/three/three.module.js';
import { ALU_RHO, G_MAT, G_STEEL, IRON_RHO, PHYS, RHO, STEEL_RHO, TAU, boreHole, box, circlePath, cyl, extrude, materials, mesh, newPart, uvScale } from './base.js';

/* ---------------- wał, łożysko ---------------- */
export function shaft({ len = 1, r = 0.0125, mat = 'steel', key: keyway = true, name } = {}) {
  const M = materials(), g = newPart(name || `Wał Ø ${Math.round(r * 2000)} mm`);
  const s = mesh(uvScale(new THREE.CylinderGeometry(r, r, len - 0.004, 32, 1, true).rotateZ(-Math.PI / 2), 1), M[mat]); s.position.x = len / 2; g.userData.spin.add(s);   // bez denek — końce zamykają fazki
  if (keyway) { const key = mesh(box(len * 0.92, 0.0018, r * 0.5), M.dark); key.position.set(len / 2, r - 0.0006, 0); g.userData.spin.add(key); }   // rowek wpustu — widać obrót
  for (const e of [0, len]) { const ch = mesh(cyl(r, 0.002, 32, r * 0.86), M[mat]); ch.position.x = e ? len - 0.001 : 0.001; if (!e) ch.rotation.y = Math.PI; g.userData.spin.add(ch); }   // fazka 0,14 r na końcach
  const mass = (RHO[mat] || STEEL_RHO) * Math.PI * r * r * len;
  Object.assign(g.userData, { phys: { ...PHYS.shaft, G: G_MAT[mat] || G_STEEL, k: (G_MAT[mat] || G_STEEL) * Math.PI * (2 * r) ** 4 / 32 / len }, len, r, mass, J: 0.5 * mass * r * r });
  return g;
}
// oprawa łożyska stojąca (UCP) na podstawie: oś na wysokości h nad podstawą
export function pillowBlock({ h = 0.12, r = 0.0125, name = 'Łożysko w oprawie stojącej UCP' } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name;
  const k = r / 0.0125, hc = 0.036 * k, base = h - hc, top = new THREE.Group(); top.scale.setScalar(k); top.position.y = base; g.add(top);
  const s = new THREE.Shape(); s.moveTo(-0.085, 0); s.lineTo(0.085, 0); s.lineTo(0.085, 0.016); s.lineTo(0.036, 0.019);
  s.absarc(0, hc, 0.038, -0.35, Math.PI + 0.35, false); s.lineTo(-0.085, 0.016); s.closePath();
  s.holes.push(circlePath(0.026, 40, 0, hc), circlePath(0.0065, 16, -0.064, 0.008), circlePath(0.0065, 16, 0.064, 0.008));
  // kształt (sx → z, sy → y), wyciągnięcie wzdłuż x (macierz o wyznaczniku +1)
  const SM = new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1);
  const hg = new THREE.ExtrudeGeometry(s, { depth: 0.036, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1, curveSegments: 24 });
  hg.translate(0, 0, -0.018).applyMatrix4(SM); uvScale(hg, 6);
  const hs = mesh(hg, M.paintGrey); top.add(hs);
  const ring = mesh(cyl(0.026, 0.03, 32), M.steel); ring.position.y = 0.036; top.add(ring);
  const nip = mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.012, 8), M.brass); nip.position.y = 0.036 + 0.044; top.add(nip);
  if (base > 0.12) {   // wysoka podpora: słupek z rury kwadratowej 60 × 60, blacha podstawy i blacha pod oprawą
    const post = mesh(box(0.06, base - 0.024, 0.06), M.paintGrey); post.position.y = base / 2; g.add(post);
    for (const [y, t] of [[0.006, 0.012], [base - 0.006, 0.012]]) { const pl = mesh(box(0.1, t, 0.2), M.iron); pl.position.y = y; g.add(pl); }
    for (const s of [-1, 1]) { const rib = mesh(box(0.006, 0.08, 0.07), M.paintGrey); rib.position.set(0, 0.052, s * 0.065); g.add(rib); }
  } else if (base > 0.002) { const ped = mesh(box(0.05, base, 0.19), M.iron); ped.position.y = base / 2; g.add(ped); }
  for (const z of [-0.064, 0.064]) { const b = mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.008, 6), M.dark); b.position.set(0, 0.02, z); top.add(b); }
  g.userData = { phys: { ...PHYS.bearing }, h, r, k, mass: 0.8 * k * k * k + (base > 0 ? IRON_RHO * 0.05 * 0.19 * base * 0.4 : 0) };
  return g;
}

/* ---------------- sprzęgła ---------------- */
// sprzęgło kłowe z gwiazdą z poliuretanu: dwie piasty po 3 kły, gwiazda między nimi; część a i b (obie wirują z wałami)
export const SPIDER = { '92A': { color: 0xd8432e, name: '92 Sh A (czerwona)' }, '98A': { color: 0xe8c22e, name: '98 Sh A (żółta)' }, '64D': { color: 0x3f9a4a, name: '64 Sh D (zielona)' } };
export function jawCoupling({ r = 0.032, bore = 0.0125, spider: hard = '92A' } = {}) {
  const M = materials(), mk = (side) => {
    const g = new THREE.Group(), hub = new THREE.Shape(); hub.absarc(0, 0, r, 0, TAU, false); hub.holes.push(boreHole(bore));
    const h = mesh(extrude(hub, 0.03, 0.0012), M.alu); h.position.x = side * 0.027; g.add(h);
    for (let k = 0; k < 3; k++) {
      const a0 = k * TAU / 3 + (side > 0 ? Math.PI / 3 : 0), s = new THREE.Shape();
      s.absarc(0, 0, r * 0.99, a0 - 0.42, a0 + 0.42, false); s.absarc(0, 0, bore * 1.6, a0 + 0.42, a0 - 0.42, true);   // kły odrobinę mniejsze niż piasta — bez wspólnej powierzchni
      const jw = mesh(extrude(s, 0.02, 0.0008), M.alu); jw.position.x = side * 0.004; g.add(jw);
    }
    return g;
  };
  const spider = new THREE.Group(), polyM = M.poly.clone(); polyM.color.setHex((SPIDER[hard] || SPIDER['92A']).color);
  for (let k = 0; k < 6; k++) {
    const a0 = k * TAU / 6 + Math.PI / 6, s = new THREE.Shape();
    s.absarc(0, 0, r * 0.96, a0 - 0.16, a0 + 0.16, false); s.absarc(0, 0, bore * 1.7, a0 + 0.16, a0 - 0.16, true);
    spider.add(mesh(extrude(s, 0.017, 0.0008), polyM));
  }
  const ring = new THREE.Shape(); ring.absarc(0, 0, bore * 2, 0, TAU, false); ring.holes.push(circlePath(bore * 1.15));
  spider.add(mesh(extrude(ring, 0.0164, 0.0006), polyM));   // pierścień cieńszy od ramion — bez wspólnych płaszczyzn
  const mass = ALU_RHO * Math.PI * r * r * 0.08 * 0.9;
  const phys = { ...PHYS.jaw, k: PHYS.spider[hard] || PHYS.spider['92A'], spider: hard };
  spider.userData.phys = phys;
  return { a: mk(-1), b: mk(1), spider, phys, mass, J: 0.5 * mass * r * r };
}
// sprzęgło kołnierzowe sztywne: dwie tarcze z piastami i 6 śrub
export function flangeCoupling({ r = 0.055, bore = 0.0125, bolts: nb = 6 } = {}) {
  const M = materials(), mk = (side) => {
    const g = new THREE.Group(), f = new THREE.Shape(); f.absarc(0, 0, r, 0, TAU, false); f.holes.push(boreHole(bore));
    const fl = mesh(extrude(f, 0.014, 0.001), M.iron); fl.position.x = side * 0.0075; g.add(fl);
    const hb = new THREE.Shape(); hb.absarc(0, 0, bore * 2.4, 0, TAU, false); hb.holes.push(boreHole(bore));
    const hub = mesh(extrude(hb, 0.03, 0.001), M.iron); hub.position.x = side * 0.029; g.add(hub);
    return g;
  };
  const bolts = new THREE.Group();
  for (let k = 0; k < nb; k++) {
    const a = k * TAU / nb, y = Math.cos(a) * r * 0.74, z = Math.sin(a) * r * 0.74;
    const b = mesh(cyl(0.004, 0.036, 10), M.steel); b.position.set(0, y, z); bolts.add(b);
    for (const s of [-1, 1]) { const hx = mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.006, 6).rotateZ(Math.PI / 2), M.dark); hx.position.set(s * 0.0172, y, z); bolts.add(hx); }   // łeb wchodzi 0,3 mm w kołnierz
  }
  const mass = IRON_RHO * (Math.PI * r * r * 0.028 + Math.PI * (bore * 2.4) ** 2 * 0.06);
  return { a: mk(-1), b: mk(1), bolts, phys: { ...PHYS.flange }, mass, J: 0.5 * mass * r * r * 0.8 };
}
// widełki przegubu Cardana na końcu wału: piasta wzdłuż +x i dwa ramiona z oczkami; sworznie wzdłuż lokalnego y (oś krzyżaka)
export function yoke({ r = 0.026, reach = 0.05, name = 'Widełki przegubu' } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name;
  const hub = mesh(cyl(0.019, 0.03, 24), M.gear); hub.position.x = -reach + 0.015; g.add(hub);
  const bridge = mesh(box(0.012, r * 2 + 0.014, 0.03), M.gear); bridge.position.x = -reach + 0.03; g.add(bridge);
  for (const s of [-1, 1]) {
    // ramię węższe od mostka, oczko wyższe od ramienia — bez wspólnych płaszczyzn
    const arm = mesh(box(reach - 0.024, 0.0087, 0.028), M.gear); arm.position.set(-(reach - 0.024) / 2 - 0.006, s * (r + 0.0025), 0); g.add(arm);
    const eye = mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.0126, 24), M.gear); eye.position.set(0, s * (r + 0.0041), 0); g.add(eye);
  }
  return g;
}
// krzyżak: dwa czopy prostopadłe (lokalne y i z) z miseczkami łożysk igiełkowych
export function cross({ r = 0.026 } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = 'Krzyżak przegubu';
  g.add(mesh(new THREE.SphereGeometry(0.012, 16, 12), M.steel));
  for (const ax of ['y', 'z']) {
    const c = mesh(new THREE.CylinderGeometry(0.0055, 0.0055, r * 2, 12), M.steel); if (ax === 'z') c.rotation.x = Math.PI / 2; g.add(c);
    for (const s of [-1, 1]) { const cup = mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.009, 16), M.dark); cup.position[ax] = s * (r - 0.002); if (ax === 'z') cup.rotation.x = Math.PI / 2; g.add(cup); }
  }
  g.userData.phys = { ...PHYS.ujoint };
  return g;
}
