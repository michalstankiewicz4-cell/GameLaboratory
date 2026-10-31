// Tabor — lokomotywa spalinowa manewrowa. Z aTrain (js/stock.js), bez zmian w kształtach.
// ---- lokomotywa spalinowa manewrowa ----
const THREE = window.THREE;

export function buildLoco(S, veh, g, y) {
  const { mat, SM, TX, part, put, BX, CX, CY, CZ, tube, strip, handrail, decal, steps, brakeHose, brakeShoe, fitUV, roundedBox, TK } = S;
  const d = veh.def, Lb = d.Lb, H = Lb / 2;
  const fr = part(g, 'ostoja'), hood = part(g, 'maska'), cab = part(g, 'kabina'), rails = part(g, 'poręcze'), under = part(g, 'podwozie'), lights = part(g, 'światła');
  // ostoja: podłużnice, pomost z blachy ryflowanej, czołownice w pasy ostrzegawcze
  for (const sz of [1, -1]) BX(fr, SM.frame, Lb - 0.42, 0.42, 0.16, 0, y(1.06), sz * 1.12, 0.015, 3);
  BX(fr, SM.tread, Lb - 0.4, 0.05, 2.92, 0, y(1.295), 0, 0, 1);
  for (const sx of [1, -1]) BX(fr, SM.hazard, 0.2, 0.5, 2.96, sx * (H - 0.1), y(1.07), 0, 0.02, 0.62);
  for (const sx of [1, -1]) for (const sz of [1, -1]) steps(fr, sx * (H - 0.5), y(1.27), sz * 1.27, sz);
  // maska silnika
  const hx0 = -1.4, hx1 = H - 0.45, hl = hx1 - hx0, hcx = (hx0 + hx1) / 2, hy0 = 1.32, hy1 = 3.12, hh = hy1 - hy0;
  BX(hood, SM.hood, hl, hh, 1.95, hcx, y((hy0 + hy1) / 2), 0, 0.07, hl / 4);
  for (const sz of [1, -1]) for (const lx of [-0.5, 1.05, 2.6]) {
    BX(hood, SM.louvreG, 1.15, 0.72, 0.03, lx, y(2.42), sz * 0.988, 0.008, 1.15);
    BX(hood, SM.chrome, 0.05, 0.12, 0.04, lx + 0.66, y(1.95), sz * 0.99);         // klamki drzwi maski
  }
  BX(hood, SM.louvreG, 0.03, 1.05, 1.5, hx1 + 0.012, y(2.1), 0, 0.005, 1.5);       // atrapa chłodnicy z przodu
  CY(hood, SM.frame, 0.56, 0.14, 2.95, y(hy1 + 0.07), 0, 28);                    // wentylator chłodnicy na dachu
  put(hood, new THREE.CircleGeometry(0.5, 28), SM.louvreG, 2.95, y(hy1 + 0.155), 0, -Math.PI / 2);
  CY(hood, SM.iron, 0.12, 0.5, 0.95, y(hy1 + 0.25), 0, 18);                       // komin wydechu
  put(hood, new THREE.TorusGeometry(0.125, 0.02, 8, 18), SM.iron, 0.95, y(hy1 + 0.5), 0, Math.PI / 2);
  BX(hood, SM.iron, 0.3, 0.025, 0.3, 0.95, y(hy1 + 0.6), 0); CY(hood, SM.iron, 0.012, 0.09, 0.95, y(hy1 + 0.55), 0, 6);
  for (const sx of [hx0 + 0.25, hx1 - 0.25]) for (const sz of [0.85, -0.85]) put(hood, new THREE.TorusGeometry(0.05, 0.012, 6, 12), SM.iron, sx, y(hy1 + 0.04), sz, 0, Math.PI / 2);   // ucha
  BX(hood, SM.frame, 0.12, 0.36, 0.36, hx1 + 0.06, y(2.86), 0, 0.03);             // obudowa reflektora
  decal(hood, TK.decal([{ t: 'SM31-017', size: 64, weight: 700 }], { w: 512, h: 96, color: '#f2ead6', align: 'center', bg: '#1b1d1e' }), 0.8, 0.15, hx1 + 0.013 + 0.012, y(2.66), 0, Math.PI / 2);
  // kabina maszynisty
  const cx0 = -H + 0.45, cx1 = hx0 - 0.05, cl = cx1 - cx0, ccx = (cx0 + cx1) / 2, cy0 = 1.32, cy1 = 3.8;
  BX(cab, SM.cab, cl, cy1 - cy0, 2.8, ccx, y((cy0 + cy1) / 2), 0, 0.08, cl);
  BX(cab, SM.roof, cl + 0.2, 0.12, 3.0, ccx, y(cy1 + 0.06), 0, 0.04, 3);
  for (const sz of [1, -1]) BX(cab, SM.iron, cl + 0.2, 0.04, 0.05, ccx, y(cy1 + 0.0), sz * 1.5);   // rynny
  const pane = (px, py, pz, w, h, nx) => {                       // okno: uszczelka + szyba
    if (nx) { BX(cab, SM.rubber, 0.03, h + 0.07, w + 0.07, px, py, pz); BX(cab, SM.glass, 0.012, h, w, px + nx * 0.018, py, pz); }
    else { const s = Math.sign(pz); BX(cab, SM.rubber, w + 0.07, h + 0.07, 0.03, px, py, pz); BX(cab, SM.glass, w, h, 0.012, px, py, pz + s * 0.018); }
  };
  for (const sz of [1, -1]) {
    pane(cx1 - 0.42, y(3.1), sz * 1.415, 0.62, 0.66);
    pane(cx0 + 0.42, y(3.1), sz * 1.415, 0.62, 0.66);
    BX(cab, SM.cab, 0.86, 2.0, 0.03, ccx, y(2.34), sz * 1.415, 0.01, 0.86);          // drzwi
    pane(ccx, y(3.0), sz * 1.435, 0.5, 0.6);
    for (const dx of [-0.53, 0.53]) tube(cab, SM.rail, [[ccx + dx, y(1.6), sz * 1.43], [ccx + dx, y(1.62), sz * 1.5], [ccx + dx, y(2.7), sz * 1.5], [ccx + dx, y(2.72), sz * 1.43]], 0.016);
    steps(fr, ccx, y(1.27), sz * 1.36, sz);
    pane(cx1 + 0.016, y(3.42), sz * 0.66, 0.95, 0.5, 1);                           // przednie okna nad maską
    BX(cab, SM.iron, 0.012, 0.025, 0.55, cx1 + 0.05, y(3.25), sz * 0.66).rotation.x = sz * 0.5;   // wycieraczki
    BX(cab, SM.iron, 0.22, 0.02, 1.0, cx1 + 0.12, y(3.72), sz * 0.66).rotation.z = -0.25;       // daszki
    pane(cx0 - 0.016, y(3.1), sz * 0.66, 0.95, 0.66, -1);                           // tylne okna
  }
  put(cab, new THREE.ConeGeometry(0.06, 0.32, 12, 1, true), SM.chrome, ccx + 0.6, y(cy1 + 0.2), 0.35, 0, 0, -Math.PI / 2);   // syreny
  put(cab, new THREE.ConeGeometry(0.05, 0.26, 12, 1, true), SM.chrome, ccx + 0.6, y(cy1 + 0.2), -0.35, 0, 0, -Math.PI / 2);
  BX(cab, SM.iron, 0.1, 0.1, 0.9, ccx + 0.55, y(cy1 + 0.15), 0);
  CY(cab, SM.iron, 0.008, 0.9, ccx - 0.6, y(cy1 + 0.6), -0.9, 6); CY(cab, SM.iron, 0.04, 0.06, ccx - 0.6, y(cy1 + 0.13), -0.9, 10);   // antena
  BX(cab, SM.louvreG, 0.5, 0.12, 0.5, ccx - 0.2, y(cy1 + 0.18), 0.6, 0.02, 0.5);   // wywietrznik
  decal(cab, TK.decal([{ t: 'SM31-017', size: 58, weight: 700 }, { t: 'LAB RAIL · LOKOMOTYWOWNIA WARSZAWA', size: 20 }], { w: 512, h: 110, color: '#efe6cf' }), 0.95, 0.2, cx1 - 0.55, y(2.12), 1.416);
  decal(cab, TK.decal([{ t: 'SM31-017', size: 58, weight: 700 }, { t: 'LAB RAIL · LOKOMOTYWOWNIA WARSZAWA', size: 20 }], { w: 512, h: 110, color: '#efe6cf' }), 0.95, 0.2, cx1 - 0.55, y(2.12), -1.416, Math.PI);
  decal(hood, TK.decal([{ t: 'Vmax 60 km/h', size: 26 }, { t: 'Masa 22 t · 300 kW', size: 22 }, { t: 'Rew. P4 · 2026', size: 22 }], { w: 256, h: 110 }), 0.42, 0.18, hx1 - 0.35, y(1.62), 0.976);
  // poręcze wzdłuż pomostu i z przodu
  const ry = y(2.32), yd = y(1.32), rz = 1.36, rx1 = hx1 + 0.38;
  handrail(rails, [[cx1 + 0.05, ry, rz], [rx1, ry, rz], [rx1, ry, -rz], [cx1 + 0.05, ry, -rz]], [[hx0 + 0.1, ry, rz], [1.2, ry, rz], [2.8, ry, rz], [rx1, ry, rz], [hx0 + 0.1, ry, -rz], [1.2, ry, -rz], [2.8, ry, -rz], [rx1, ry, -rz]], yd);
  handrail(rails, [[cx0 - 0.3, y(2.2), 1.36], [cx0 - 0.3, y(2.2), -1.36]], [[cx0 - 0.3, y(2.2), 1.36], [cx0 - 0.3, y(2.2), -1.36]], yd);
  // podwozie: zbiornik paliwa, zbiorniki powietrza, akumulatory, piasecznice, klocki hamulcowe
  BX(under, SM.frame, 3.0, 0.44, 1.8, 0, y(0.64), 0, 0.14, 3);
  for (const sx of [-0.8, 0.8]) BX(under, SM.iron, 0.06, 0.48, 1.86, sx, y(0.64), 0);
  CZ(under, SM.chrome, 0.07, 0.06, -0.9, y(0.8), 0.92, 14); BX(under, SM.gauge, 0.22, 0.12, 0.01, 0.6, y(0.66), 0.905);
  for (const sz of [0.55, -0.55]) CX(under, SM.frame, 0.14, 2.4, 0, y(1.08), sz, 18);
  BX(under, SM.frame, 0.8, 0.5, 1.8, -H + 1.0, y(0.98), 0, 0.03, 1);
  for (const ws of veh.ws) {
    const xw = ws.p[0] - veh.body.p[0], out = Math.sign(xw), Rw = ws.Rw;
    for (const sz of [1, -1]) {
      BX(under, SM.frame, 0.3, 0.34, 0.2, xw + out * 0.72, y(1.0), sz * 1.25, 0.02, 0.5);
      tube(under, SM.iron, [[xw + out * 0.72, y(0.83), sz * 1.24], [xw + out * 0.68, y(0.5), sz * 1.0], [xw + out * 0.62, y(0.12), sz * 0.76]], 0.02, 6);
      brakeShoe(under, xw, out, Rw, y(Rw), sz * 0.75, y(1.27));
      brakeShoe(under, xw, -out, Rw, y(Rw), sz * 0.75, y(1.27));
    }
  }
  for (const sx of [1, -1]) brakeHose(fr, sx * H, sx, y(0.98), 0.42);
  // światła
  const lamp = (m, r, x, yy, z) => { CX(lights, SM.frame, r + 0.025, 0.06, x - 0.03, yy, z, 18); return CX(lights, m, r, 0.03, x, yy, z, 18); };
  for (const sz of [1, -1]) { BX(lights, SM.frame, 0.14, 0.4, 0.16, H - 0.12, y(1.52), sz * 0.95, 0.02, 0.4); lamp(mat.lampW, 0.085, H - 0.01, y(1.72), sz * 0.95); }   // lampy na wspornikach na czołownicy
  lamp(mat.lampW, 0.14, hx1 + 0.16, y(2.86), 0);
  return { smoke: [0.95, y(hy1 + 0.62), 0], head: [hx1 + 0.18, y(2.86), 0], white: [[H + 0.04, y(1.72), 0.95], [H + 0.04, y(1.72), -0.95]] };
}
