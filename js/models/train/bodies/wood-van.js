// Tabor — wagon kryty drewniany. Z aTrain (js/stock.js).
// ---- wagon kryty drewniany (W1): deski w stalowej ramie, drzwi przesuwne, dach z papy ----
import { wagonFrame } from "./wagon-frame.js";
const THREE = window.THREE;

export function buildWoodVan(S, veh, g, y, i) {
  const { mat, SM, TX, part, put, BX, CX, CY, CZ, tube, strip, handrail, decal, steps, brakeHose, brakeShoe, fitUV, roundedBox, TK } = S;
  wagonFrame(S, veh, g, y, i);
  const Lb = veh.def.Lb, H = Lb / 2, bx = H - 0.25, body = part(g, 'pudło'), iron = part(g, 'okucia'), roof = part(g, 'dach');
  const by0 = 1.35, by1 = 3.62, bym = (by0 + by1) / 2, bh = by1 - by0, Z = 1.40;
  BX(body, SM.wood, 2 * bx, bh, 2 * Z, 0, y(bym), 0, 0.02, 1.6);
  for (const sz of [1, -1]) {
    const zf = sz * (Z + 0.018);
    for (const yy of [by0 + 0.05, by1 - 0.05]) BX(iron, SM.iron, 2 * bx + 0.04, 0.1, 0.04, 0, y(yy), zf);
    for (const xp of [-bx, -2.7, -1.05, 1.05, 2.7, bx]) BX(iron, SM.iron, 0.09, bh - 0.04, 0.06, xp, y(bym), zf);
    for (const [a, b] of [[-bx, -2.7], [-2.7, -1.05], [1.05, 2.7], [2.7, bx]]) strip(iron, SM.iron, a, y(by0 + 0.1), b, y(by1 - 0.1), zf, 0.075, 0.02);
    const zd = sz * (Z + 0.05);                                                     // drzwi przesuwne
    BX(body, SM.wood, 1.95, 2.06, 0.04, 0, y(bym - 0.02), zd, 0.01, 1.6);
    for (const yy of [by0 + 0.09, by1 - 0.13]) BX(iron, SM.iron, 1.99, 0.08, 0.03, 0, y(yy), zd + sz * 0.03);
    for (const xx of [-0.97, 0.97]) BX(iron, SM.iron, 0.08, 2.06, 0.03, xx, y(bym - 0.02), zd + sz * 0.03);
    strip(iron, SM.iron, -0.93, y(by0 + 0.14), 0.93, y(by1 - 0.18), zd + sz * 0.025, 0.07, 0.012);
    strip(iron, SM.iron, -0.93, y(by1 - 0.18), 0.93, y(by0 + 0.14), zd + sz * 0.037, 0.07, 0.012);
    BX(iron, SM.iron, 4.1, 0.07, 0.07, 1.0, y(by1 - 0.02), sz * (Z + 0.1));        // szyna drzwi
    BX(iron, SM.iron, 4.1, 0.05, 0.05, 1.0, y(by0 + 0.02), sz * (Z + 0.09));
    tube(iron, SM.iron, [[0.82, y(1.9), zd + sz * 0.05], [0.82, y(1.92), zd + sz * 0.11], [0.82, y(2.48), zd + sz * 0.11], [0.82, y(2.5), zd + sz * 0.05]], 0.016);
    for (const xv of [-3.55, 3.55]) BX(body, SM.louvreB, 0.55, 0.32, 0.03, xv, y(3.28), sz * (Z + 0.04), 0.008, 0.55);   // wywietrzniki
    const lab = TK.decal([{ t: '21 51 150 3 512-6', size: 34, weight: 700 }, { t: 'Gkks · LAB RAIL', size: 26 }, { t: 'Tara 12,0 t   Ładowność 25 t', size: 20 }, { t: 'Rew. 04.2026 · WAR', size: 20 }], { w: 512, h: 150 });
    decal(body, lab, 1.15, 0.34, sz * -2.0, y(1.75), sz * (Z + 0.006), sz > 0 ? 0 : Math.PI);
    decal(body, TK.decal([{ t: 'MAX 20 t', size: 40, weight: 700 }], { w: 256, h: 56 }), 0.4, 0.09, sz * -0.2, y(3.15), zd + sz * 0.022, sz > 0 ? 0 : Math.PI);
  }
  for (const sx of [1, -1]) {
    const xf = sx * (bx + 0.03);
    for (const zp of [-Z + 0.06, -0.7, 0.7, Z - 0.06]) BX(iron, SM.iron, 0.06, bh - 0.04, 0.09, xf, y(bym), zp);
    for (const yy of [by0 + 0.05, by1 - 0.05]) BX(iron, SM.iron, 0.04, 0.1, 2 * Z - 0.12, sx * (bx + 0.032), y(yy), 0);
  }
  for (let k = 0; k < 6; k++) BX(iron, SM.rail, 0.04, 0.03, 0.42, -(bx + 0.06), y(1.6 + k * 0.33), -0.92);   // drabinka na czole
  for (const zz of [-0.7, -1.14]) BX(iron, SM.rail, 0.03, 1.8, 0.03, -(bx + 0.06), y(2.42), zz);
  // ręczny hamulec: koło na czole
  put(iron, new THREE.TorusGeometry(0.2, 0.018, 8, 24), SM.iron, bx + 0.09, y(2.3), 0.85, 0, Math.PI / 2);
  for (let k = 0; k < 3; k++) put(iron, new THREE.CylinderGeometry(0.01, 0.01, 0.36, 6), SM.iron, bx + 0.082 + k * 0.008, y(2.3), 0.85, k * Math.PI / 3);
  CX(iron, SM.iron, 0.025, 0.12, bx + 0.04, y(2.3), 0.85, 8); CX(iron, SM.iron, 0.045, 0.05, bx + 0.09, y(2.3), 0.85, 12);
  // dach z papy (łuk walca) + listwy brzegowe
  const rg = new THREE.CylinderGeometry(3.2, 3.2, 2 * bx + 0.3, 40, 1, true, Math.PI / 2 - 0.45, 0.9); rg.rotateZ(Math.PI / 2);
  const rgeo = rg; const uvA = rgeo.attributes.uv, pA = rgeo.attributes.position; for (let k = 0; k < uvA.count; k++) uvA.setXY(k, pA.getX(k) / 2, pA.getZ(k) / 2);
  SM.tar.side = THREE.DoubleSide; put(roof, rgeo, SM.tar, 0, y(by1 + 0.1) - 3.2 + (3.2 - 3.2 * Math.cos(0.45)), 0);
  for (const sz of [1, -1]) BX(roof, SM.iron, 2 * bx + 0.3, 0.06, 0.06, 0, y(by1 + 0.05), sz * (Z + 0.02));
  return { red: null };
}
