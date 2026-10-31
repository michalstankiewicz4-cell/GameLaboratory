// Tabor — część wspólna nadwozi: tekstury (TexKit), materiały PBR, pomocnicze bryły
// (stopnie, węże hamulcowe, klocki, poręcze). Z aTrain (js/stock.js), bez zmian w kształtach.
import { TK, fitUV, roundedBox } from "../texkit.js";
const THREE = window.THREE;

export function stockShared(mat) {
  // ===================== Tabor: materiały, szczegółowe modele, efekty =====================
  const TX = {
    hood: TK.steel({ seed: 3, base: [42, 76, 60], cols: 4, rivets: false, stripes: [{ y: 0.80, h: 0.07, color: '#d6c27c' }], grime: 1, rust: 0.4 }),
    cab: TK.steel({ seed: 4, base: [42, 76, 60], cols: 2, rivets: false, stripes: [{ y: 0.52, h: 0.05, color: '#d6c27c' }], grime: 0.9, rust: 0.3 }),
    frame: TK.cast({ seed: 5, base: [30, 29, 28], rust: 0.7 }),
    iron: TK.cast({ seed: 6, base: [26, 26, 27], rust: 1.0 }),
    disc: TK.cast({ seed: 7, base: [44, 34, 28], rust: 1.2 }),
    knuckle: TK.cast({ seed: 8, base: [50, 48, 46], rust: 0.6 }),
    tread: TK.tread({ seed: 9 }),
    hazard: TK.hazard({ seed: 10 }),
    roof: TK.roofing({ seed: 11, base: [74, 76, 78], strips: 4 }),
    tar: TK.roofing({ seed: 12, base: [48, 50, 52], strips: 7 }),
    louvreG: TK.louvre({ seed: 13, base: [30, 52, 42] }),
    louvreB: TK.louvre({ seed: 14, base: [70, 44, 30], n: 10 }),
    brushed: TK.brushed({ seed: 15 }),
    wood: TK.planks({ seed: 16, base: [104, 60, 38], boards: 8 }),
    floor: TK.planks({ seed: 17, base: [62, 48, 36], boards: 10, grime: 1.4 }),
    steel2: TK.steel({ seed: 18, base: [70, 86, 96], cols: 6, rivets: true, grime: 1.1, rust: 0.9 }),
    door2: TK.steel({ seed: 19, base: [70, 86, 96], cols: 1, rivets: false, ribs: 10, grime: 1, rust: 0.7 }),
    roof2: TK.steel({ seed: 20, base: [96, 98, 100], cols: 3, rivets: true, grime: 1.4, rust: 1.2, rough: 170 }),
  };
  const PBR = (t, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: t.map, roughnessMap: t.roughnessMap, bumpMap: t.bumpMap, bumpScale: 0.006, roughness: 1, metalness: 0.15 }, o));
  const SM = {
    hood: PBR(TX.hood, { metalness: 0.25 }), cab: PBR(TX.cab, { metalness: 0.25 }), frame: PBR(TX.frame, { metalness: 0.4 }), iron: PBR(TX.iron, { metalness: 0.4 }),
    disc: PBR(TX.disc, { metalness: 0.5 }), knuckle: PBR(TX.knuckle, { metalness: 0.55 }), tread: PBR(TX.tread, { metalness: 0.6 }), hazard: PBR(TX.hazard, { metalness: 0.2 }),
    roof: PBR(TX.roof), tar: PBR(TX.tar, { metalness: 0 }), louvreG: PBR(TX.louvreG, { metalness: 0.3 }), louvreB: PBR(TX.louvreB, { metalness: 0.2 }),
    steelB: PBR(TX.brushed, { metalness: 0.9, roughness: 0.55 }), wood: PBR(TX.wood, { metalness: 0, bumpScale: 0.01 }), floor: PBR(TX.floor, { metalness: 0 }),
    steel2: PBR(TX.steel2, { metalness: 0.3 }), door2: PBR(TX.door2, { metalness: 0.3, bumpScale: 0.02 }), roof2: PBR(TX.roof2, { metalness: 0.35 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0d1318, roughness: 0.05, metalness: 0.9 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xcfc8b8, roughness: 0.22, metalness: 1 }),
    rail: new THREE.MeshStandardMaterial({ color: 0xd2a51f, roughness: 0.5, metalness: 0.25 }),
    red: new THREE.MeshStandardMaterial({ color: 0xa3241a, roughness: 0.5 }),
    gauge: new THREE.MeshStandardMaterial({ color: 0xe8e3d6, roughness: 0.4 }),
  };
  // zwykłe elementy, które dotąd miały gładkie kolory, dostają tekstury
  mat.frame = SM.frame; mat.steel = SM.steelB; mat.wheel = SM.disc; mat.tread = SM.steelB; mat.spring = SM.iron;
  { const s = TK.sleeperWood({ seed: 41 }); Object.assign(mat.sleeper, { map: s.map, roughnessMap: s.roughnessMap, bumpMap: s.bumpMap, bumpScale: 0.01, roughness: 1, color: new THREE.Color(0xffffff) }); }
  { const s = TK.gravel({ seed: 42 }); Object.assign(mat.ballast, { map: s.map, roughnessMap: s.roughnessMap, bumpMap: s.bumpMap, bumpScale: 0.03, roughness: 1, color: new THREE.Color(0xffffff) }); }
  { const s = TK.grass({ seed: 43 }); for (const t of [s.map, s.roughnessMap, s.bumpMap]) t.repeat.set(1600, 1600);
    Object.assign(mat.ground, { map: s.map, roughnessMap: s.roughnessMap, bumpMap: s.bumpMap, bumpScale: 0.02, roughness: 1, color: new THREE.Color(0xffffff) }); }

  // ---- pomocnicze bryły ----
  const part = (g, name) => { let p = g.getObjectByName(name); if (!p) { p = new THREE.Group(); p.name = name; p.userData.part = true; g.add(p); } return p; };
  const put = (par, geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); par.add(o); return o; };
  const BX = (par, m, sx, sy, sz, x, y, z, r = 0, tile = 2) => put(par, fitUV(r > 0 ? roundedBox(sx, sy, sz, r, 2) : new THREE.BoxGeometry(sx, sy, sz), tile), m, x, y, z);
  const CX = (par, m, r, len, x, y, z, seg = 16) => put(par, new THREE.CylinderGeometry(r, r, len, seg), m, x, y, z, 0, 0, Math.PI / 2);
  const CY = (par, m, r, len, x, y, z, seg = 16) => put(par, new THREE.CylinderGeometry(r, r, len, seg), m, x, y, z);
  const CZ = (par, m, r, len, x, y, z, seg = 16) => put(par, new THREE.CylinderGeometry(r, r, len, seg), m, x, y, z, Math.PI / 2);
  function tube(par, m, pts, r = 0.02, seg = 10) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), false, 'catmullrom', 0.08);
    return put(par, new THREE.TubeGeometry(curve, Math.max(seg, pts.length * seg), r, 8, false), m, 0, 0, 0);
  }
  // listwa/belka w płaszczyźnie (x,y) od punktu a do b
  function strip(par, m, ax, ay, bx, by, z, w = 0.08, d = 0.03) {
    const L = Math.hypot(bx - ax, by - ay); const o = BX(par, m, L, w, d, (ax + bx) / 2, (ay + by) / 2, z); o.rotation.z = Math.atan2(by - ay, bx - ax); return o;
  }
  // poręcz: rura po punktach + słupki do pomostu
  function handrail(par, pts, postsAt, yDeck, r = 0.019) {
    tube(par, SM.rail, pts, r);
    for (const [x, y, z] of postsAt) CY(par, SM.rail, r * 0.9, y - yDeck, x, (y + yDeck) / 2, z, 8);
  }
  function decal(par, tex, w, h, x, y, z, ry = 0) {
    const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.75, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    return put(par, new THREE.PlaneGeometry(w, h), m, x, y, z, 0, ry, 0);
  }
  // stopnie wejściowe: dwa płaskowniki i dwa stopnie z blachy ryflowanej
  function steps(par, x, yTop, z, sideZ) {
    for (const dx of [-0.24, 0.24]) BX(par, SM.iron, 0.04, 0.78, 0.06, x + dx, yTop - 0.39, z);
    for (const yy of [yTop - 0.36, yTop - 0.72]) BX(par, SM.tread, 0.5, 0.035, 0.24, x, yy, z + sideZ * 0.06, 0, 0.5);
  }
  // wąż hamulcowy na czołownicy: rura + gumowy wąż + głowica + kurek
  function brakeHose(par, xEnd, sx, y0, z) {
    CX(par, SM.iron, 0.03, 0.12, xEnd + sx * 0.06, y0, z, 10);
    tube(par, SM.rubber, [[xEnd + sx * 0.1, y0, z], [xEnd + sx * 0.2, y0 - 0.12, z + 0.02], [xEnd + sx * 0.25, y0 - 0.32, z + 0.04], [xEnd + sx * 0.22, y0 - 0.46, z + 0.05]], 0.028, 8);
    BX(par, SM.iron, 0.09, 0.07, 0.11, xEnd + sx * 0.22, y0 - 0.5, z + 0.05);
    BX(par, SM.red, 0.12, 0.025, 0.03, xEnd + sx * 0.06, y0 + 0.05, z + 0.05);
  }
  // klocek hamulcowy przy bieżni koła (wisi na ostoi)
  function brakeShoe(par, xw, side, Rw, yAxle, z, yFrame) {
    const x = xw + side * (Rw + 0.045);
    BX(par, SM.iron, 0.07, 0.3, 0.1, x, yAxle, z);
    BX(par, SM.iron, 0.03, yFrame - yAxle - 0.1, 0.03, x, (yFrame + yAxle) / 2 + 0.05, z);
  }
  return { mat, SM, TX, part, put, BX, CX, CY, CZ, tube, strip, handrail, decal, steps, brakeHose, brakeShoe, fitUV, roundedBox, TK };
}
