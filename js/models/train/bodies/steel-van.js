// Tabor — wagon kryty stalowy. Z aTrain (js/stock.js).
import { wagonFrame } from "./wagon-frame.js";
const THREE = window.THREE;

export function buildSteelVan(S, veh, g, y, i, last) {
  const { mat, SM, TX, part, put, BX, CX, CY, CZ, tube, strip, handrail, decal, steps, brakeHose, brakeShoe, fitUV, roundedBox, TK } = S;
  wagonFrame(S, veh, g, y, i);
  const Lb = veh.def.Lb, H = Lb / 2, bx = H - 0.25, body = part(g, 'pudło'), ribs = part(g, 'żebra'), roof = part(g, 'dach'), lights = part(g, 'światła');
  const by0 = 1.35, by1 = 3.62, bym = (by0 + by1) / 2, bh = by1 - by0, Z = 1.40;
  BX(body, SM.steel2, 2 * bx, bh, 2 * Z, 0, y(bym), 0, 0.04, 2.4);
  for (const sz of [1, -1]) {
    const zr = sz * (Z + 0.022);
    for (let xr = -bx + 0.3; xr < bx - 0.2; xr += 0.62) if (Math.abs(xr) > 1.15) BX(ribs, SM.steel2, 0.07, bh - 0.12, 0.045, xr, y(bym), zr, 0.012, 0.5);
    for (const yy of [by0 + 0.04, by1 - 0.04]) BX(ribs, SM.steel2, 2 * bx + 0.04, 0.09, 0.05, 0, y(yy), zr);
    const zd = sz * (Z + 0.055);
    BX(body, SM.door2, 2.0, 2.08, 0.04, 0, y(bym - 0.02), zd, 0.01, 2.0);
    BX(ribs, SM.iron, 4.2, 0.08, 0.08, 1.05, y(by1 - 0.01), sz * (Z + 0.1));
    tube(ribs, SM.iron, [[0.85, y(1.9), zd + sz * 0.02], [0.85, y(1.92), zd + sz * 0.09], [0.85, y(2.5), zd + sz * 0.09], [0.85, y(2.52), zd + sz * 0.02]], 0.016);
    for (const xv of [-3.2, -2.0, 2.0, 3.2]) {                                    // klapy wentylacyjne z zawiasami
      BX(body, SM.steel2, 0.6, 0.36, 0.035, xv, y(3.25), sz * (Z + 0.05), 0.01, 0.6);
      for (const dx of [-0.2, 0.2]) CX(ribs, SM.iron, 0.02, 0.1, xv + dx, y(3.44), sz * (Z + 0.07), 8);
    }
    decal(body, TK.decal([{ t: '31 51 289 0 117-4', size: 34, weight: 700 }, { t: 'Hbbins · LAB RAIL', size: 26 }, { t: 'Tara 14,5 t', size: 20 }], { w: 512, h: 120 }), 1.1, 0.26, sz * -2.6, y(1.72), sz * (Z + 0.05), sz > 0 ? 0 : Math.PI);
    decal(body, TK.decal([{ t: 'UWAGA', size: 30, weight: 700 }, { t: 'nie spychać z górki', size: 22 }], { w: 256, h: 80, color: '#111', bg: '#e6c02a' }), 0.42, 0.13, sz * 2.6, y(1.62), sz * (Z + 0.05), sz > 0 ? 0 : Math.PI);
  }
  for (const sx of [1, -1]) {
    const xf = sx * (bx + 0.022);
    for (const zp of [-1.0, -0.35, 0.35, 1.0]) BX(ribs, SM.steel2, 0.045, bh - 0.12, 0.07, xf, y(bym), zp, 0.012, 0.5);
  }
  for (let k = 0; k < 6; k++) BX(ribs, SM.rail, 0.04, 0.03, 0.42, bx + 0.07, y(1.6 + k * 0.33), 0.92);
  for (const zz of [0.7, 1.14]) BX(ribs, SM.rail, 0.03, 1.8, 0.03, bx + 0.07, y(2.42), zz);
  const rg = new THREE.CylinderGeometry(3.2, 3.2, 2 * bx + 0.24, 40, 1, true, Math.PI / 2 - 0.45, 0.9); rg.rotateZ(Math.PI / 2);
  { const uvA = rg.attributes.uv, pA = rg.attributes.position; for (let k = 0; k < uvA.count; k++) uvA.setXY(k, pA.getX(k) / 2.4, pA.getZ(k) / 2.4); }
  SM.roof2.side = THREE.DoubleSide;
  const ryc = y(by1 + 0.1) - 3.2 + (3.2 - 3.2 * Math.cos(0.45));
  put(roof, rg, SM.roof2, 0, ryc, 0);
  for (const a of [-0.32, 0.32]) CX(roof, SM.roof2, 0.025, 2 * bx + 0.24, 0, ryc + 3.215 * Math.cos(a), 3.215 * Math.sin(a), 8);
  for (let xs = -bx + 0.6; xs < bx; xs += 1.2) { const pts = []; for (let k = 0; k <= 12; k++) { const f = -0.44 + 0.88 * k / 12; pts.push([xs, ryc + 3.21 * Math.cos(f), 3.21 * Math.sin(f)]); } tube(roof, SM.roof2, pts, 0.018, 4); }
  if (last) {
    const lamp = (x, yy, z) => { CX(lights, SM.frame, 0.105, 0.06, x + 0.03, yy, z, 18); CX(lights, mat.lampR, 0.08, 0.03, x, yy, z, 18); };
    for (const sz of [1, -1]) lamp(-(bx + 0.06), y(1.72), sz * 0.68);       // lampy końca składu na ścianie czołowej (między żebrami)
    return { red: [[-(bx + 0.12), y(1.72), 0.68], [-(bx + 0.12), y(1.72), -0.68]] };
  }
  return { red: null };
}
