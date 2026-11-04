// PESA Swing 120Na — tramwaj niskopodłogowy Tramwajów Warszawskich (186 szt., 2010–2013). Wymiary (1 jednostka = 1 m):
// długość 30,12, szerokość 2,40, wysokość ok. 3,5 (dach z urządzeniami, pantograf złożony), podłoga 0,35 nad główką szyny,
// 5 członów: A (kabina), C (środek) i E (tył) na wózkach stałych, B i D podwieszone; jednokierunkowy, drzwi po prawej.
// Barwy warszawskie: żółta góra, czerwony dół. Układ: +Z przód, +X lewa strona, y = 0 główka szyny.
// Człony są osobnymi grupami (w grze każdy ustawia się na łuku toru), harmonijki między nimi rozciągają się za nimi.
// Notatki: docs/models/train/swing.md.
import * as THREE from '../../../../vendor/three/three.module.js';
import { roundBox, sideExtrude } from '../../road/geom.js';
import { roadMaterials, fabricMap, textMap, noiseMap, decal } from '../../road/materials.js';

export const info = {
  id: 'swing', name: 'PESA Swing 120Na', role: 'Tramwaj niskopodłogowy · 5 członów · Tramwaje Warszawskie',
  kind: 'tram', length: 30.12, width: 2.4, height: 3.5, maxSpeed: 70 / 3.6, accel: 1.3, brake: 1.6, emergency: 2.8, mass: 40000,
  work: 'Drzwi', paints: [['Tramwaje Warszawskie', 0xf1c400]],
  // człony: długość, wózek (położenie osi wózka w członie, null — podwieszony)
  sections: [{ L: 7.5, bogie: -1.35, cab: true }, { L: 4.6, bogie: null }, { L: 5.9, bogie: 0 }, { L: 4.6, bogie: null }, { L: 7.0, bogie: 1.2 }],
  // fizyka (zachowanie „koło na szynie”, js/behaviors/rail/tram.js): masy członów [kg], środek masy nad główką szyny,
  // bryła do bezwładności [L, H, W], koło, rozstaw osi wózka, sztywności zawieszenia I stopnia (gumowego) na sprężynę
  phys: { mass: [10500, 5000, 9000, 5000, 10500], comY: [1.25, 1.5, 1.3, 1.5, 1.25], H: 2.7, W: 2.4, Rw: 0.3, wb: 1.8,
    kv: 1.4e6, kl: 1.2e6, kx: 5e6, driven: [true, false, false, false, true], power: 420000, hinge: [0.55, 2.35] },
  gap: 0.13, seat: { x: 0, y: 1.25, z: 2.6 },
};
const HW = 1.2, FLOOR = 0.35, SKIRT = 0.13, SILL = 0.98, WTOP = 2.25, BAND = 2.42, ROOF = 2.74;
const RW = 0.3, WB = 1.8, GAUGE = 1.435;

export function build({ paint = info.paints[0][1] } = {}) {
  const M = roadMaterials(paint);
  const yellow = new THREE.MeshPhysicalMaterial({ color: paint, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.12 });
  const red = new THREE.MeshPhysicalMaterial({ color: 0xc8161e, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.12 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0f1012, roughness: 0.4, metalness: 0.2 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x8e9398, roughness: 0.5, metalness: 0.3 });
  const roofM = new THREE.MeshStandardMaterial({ color: 0xcfd0cc, roughness: 0.6, metalness: 0.1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1014, roughness: 0.05, transparent: true, opacity: 0.74, clearcoat: 1, envMapIntensity: 2, depthWrite: false });
  const floorM = new THREE.MeshStandardMaterial({ color: 0x4f5357, roughness: 0.9, bumpMap: noiseMap(71, 256, 90), bumpScale: 0.6 });
  const ceiling = new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.8, side: THREE.DoubleSide });
  const pole = new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.35, metalness: 0.3 });
  const seatM = new THREE.MeshStandardMaterial({ map: fabricMap('#2e3d66'), roughness: 0.95 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x55595d, roughness: 0.5, metalness: 0.8 });
  const wheelM = new THREE.MeshStandardMaterial({ color: 0x3e4246, roughness: 0.45, metalness: 0.7, side: THREE.DoubleSide });   // koło z profilu obrotowego: widać je z obu stron
  const lightStrip = new THREE.MeshStandardMaterial({ color: 0xf4f2ea, emissive: 0xfff6e4, emissiveIntensity: 0.05 });
  const destTex = textMap(['17  Tarchomin Kościelny'], { w: 1024, h: 96, fg: '#ffb12a', font: 'bold 62px monospace' });
  const led = new THREE.MeshStandardMaterial({ color: 0x111111, map: destTex, emissive: 0xffffff, emissiveMap: destTex, emissiveIntensity: 0.6 });
  const numTex = textMap(['17'], { w: 256, h: 96, fg: '#ffb12a', font: 'bold 74px monospace' });
  const ledNo = new THREE.MeshStandardMaterial({ color: 0x111111, map: numTex, emissive: 0xffffff, emissiveMap: numTex, emissiveIntensity: 0.6 });
  const bellowsM = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.85, side: THREE.DoubleSide });
  const group = new THREE.Group(); group.name = 'PESA Swing 120Na';
  const add = (parent, geo, mat, name, opts = {}) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = opts.shadow !== false; m.receiveShadow = true; parent.add(m); return m; };
  const box = (parent, w, h, d, mat, name, x, y, z, r = 0.02) => { const m = add(parent, roundBox(w, h, d, r, Math.min(r, 0.01), 2), mat, name); m.position.set(x, y, z); return m; };

  // położenia członów w składzie (wyprostowanym): środki od przodu
  const S = info.sections, total = S.reduce((a, s) => a + s.L, 0) + info.gap * (S.length - 1);
  let zc = total / 2; const zMid = S.map((s) => { const c = zc - s.L / 2; zc -= s.L + info.gap; return c; });
  const doorsR = [[[-1.6, -2.9]], [[0.65, -0.65]], [], [[0.65, -0.65]], [[2.6, 1.3], [-2.0, -2.8]]];   // drzwi (z w członie) po prawej
  const sections = [], doors = [];
  S.forEach((sp, i) => {
    const g = new THREE.Group(); g.name = 'section ' + 'ABCDE'[i]; g.userData.part = true; g.position.z = zMid[i]; group.add(g);
    const z0 = sp.L / 2, z1 = -sp.L / 2, front = i === 0, back = i === S.length - 1;
    const zF = front ? z0 - 1.3 : z0, zB = z1;   // przód członu A: nos kabiny osobno
    // burty: pas dolny czerwony (fartuchy), wycięcia drzwi po prawej
    for (const sx of [1, -1]) {
      const dd = sx < 0 ? doorsR[i] : [];
      let cuts = [[zB, zF]];
      for (const [a, b] of dd) { const n = []; for (const [l, h] of cuts) { if (b >= h || a <= l) { n.push([l, h]); continue; } if (b > l) n.push([l, b]); if (a < h) n.push([a, h]); } cuts = n; }
      for (const [l, h] of cuts) if (h - l > 0.05) {
        const prof = [[l, SKIRT], [h, SKIRT], [h, SILL], [l, SILL]];
        if (sp.bogie != null) {   // nad kołami wózka fartuch podniesiony (widać obręcze)
          const a = sp.bogie - WB / 2 - RW - 0.12, b = sp.bogie + WB / 2 + RW + 0.12;
          if (a > l && b < h) { prof.splice(1, 0, [a, SKIRT], [a + 0.05, 0.42], [b - 0.05, 0.42], [b, SKIRT]); }
        }
        const p = add(g, sideExtrude(prof, 0, 0.035, 0), red, 'lower side panel'); p.position.x = sx > 0 ? HW - 0.035 : -HW;
      }
      // pas okien: szyby i słupki
      let wc = [[zB, zF]];
      for (const [a, b] of dd) { const n = []; for (const [l, h] of wc) { if (b >= h || a <= l) { n.push([l, h]); continue; } if (b > l) n.push([l, b]); if (a < h) n.push([a, h]); } wc = n; }
      for (const [l, h] of wc) if (h - l > 0.05) {
        const gl = add(g, new THREE.PlaneGeometry(h - l, WTOP - SILL), glass, 'side window', { shadow: false }); gl.rotation.y = sx * Math.PI / 2; gl.position.set(sx * (HW + 0.002), (SILL + WTOP) / 2, (h + l) / 2); gl.renderOrder = 2;
        const n = Math.max(1, Math.round((h - l) / 1.4));
        for (let k = 0; k <= n; k++) box(g, 0.04, WTOP - SILL, 0.08, black, 'window pillar', sx * (HW - 0.03), (SILL + WTOP) / 2, l + (h - l) * k / n, 0.008);
      }
      box(g, 0.012, 0.03, zF - zB, black, 'window seal', sx * (HW + 0.008), SILL + 0.005, (zF + zB) / 2, 0.004);
      // nad drzwiami: przycisk i pas
      for (const [a, b] of dd) { box(g, 0.03, 0.08, 0.08, M.amber, 'door button', -HW - 0.01, 1.15, a + 0.1, 0.01); }
    }
    // dach: pas żółty z zaokrągleniem, sufit, oświetlenie
    const sh = new THREE.Shape(); sh.moveTo(-HW, WTOP); sh.lineTo(HW, WTOP); sh.lineTo(HW, BAND); sh.quadraticCurveTo(HW, BAND + 0.18, HW - 0.3, BAND + 0.24); sh.quadraticCurveTo(0, ROOF + 0.03, -HW + 0.3, BAND + 0.24); sh.quadraticCurveTo(-HW, BAND + 0.18, -HW, BAND); sh.lineTo(-HW, WTOP);
    const rg = new THREE.ExtrudeGeometry(sh, { depth: zF - zB, bevelEnabled: false, curveSegments: 10 }); rg.translate(0, 0, zB);
    add(g, rg, [yellow, yellow], 'roof shell');
    const ce = add(g, new THREE.PlaneGeometry(2 * HW - 0.08, zF - zB - 0.05), ceiling, 'ceiling', { shadow: false }); ce.rotation.x = Math.PI / 2; ce.position.set(0, WTOP - 0.04, (zF + zB) / 2);
    for (const sx of [1, -1]) { const ls = add(g, new THREE.PlaneGeometry(0.12, zF - zB - 0.5), lightStrip, 'ceiling light strip', { shadow: false }); ls.rotation.x = Math.PI / 2; ls.position.set(sx * 0.6, WTOP - 0.055, (zF + zB) / 2); }
    box(g, 2 * HW - 0.08, 0.08, zF - zB, floorM, 'floor', 0, FLOOR - 0.04, (zF + zB) / 2, 0.01);
    box(g, 2 * HW - 0.3, 0.12, zF - zB - 0.1, M.under, 'underframe', 0, 0.24, (zF + zB) / 2, 0.01);
    // siedzenia (po lewej parami, po prawej pojedynczo tam, gdzie nie ma drzwi) i poręcze
    const seat = (x, z, rot = 0) => { const s = new THREE.Group(); s.name = 'seat'; s.position.set(x, FLOOR, z); s.rotation.y = rot; g.add(s); box(s, 0.44, 0.08, 0.42, seatM, 'seat cushion', 0, 0.42, 0, 0.03); const b = box(s, 0.44, 0.5, 0.07, seatM, 'seat back', 0, 0.71, -0.2, 0.03); b.rotation.x = -0.12; box(s, 0.46, 0.06, 0.48, grey, 'seat shell', 0, 0.36, -0.02, 0.02); };
    const zs0 = front ? zF - 1.4 : zF - 0.5;
    for (let z = zs0; z > zB + 0.5; z -= 0.85) {
      seat(0.86, z); seat(0.42, z);
      if (!doorsR[i].some(([a, b]) => z < a + 0.4 && z > b - 0.4)) seat(-0.86, z);
      const p = add(g, new THREE.CylinderGeometry(0.018, 0.018, WTOP - FLOOR, 8), pole, 'stanchion'); p.position.set(0.18, (WTOP + FLOOR) / 2, z - 0.25);
    }
    for (const sx of [1, -1]) { const r = add(g, new THREE.CylinderGeometry(0.016, 0.016, zF - zB - 0.3, 8), pole, 'ceiling handrail'); r.rotation.x = Math.PI / 2; r.position.set(sx * 0.42, 2.0, (zF + zB) / 2); for (let z = zB + 0.4; z < zF - 0.3; z += 1.6) { const h = add(g, new THREE.CylinderGeometry(0.012, 0.012, WTOP - 2.0, 6), pole, 'handrail hanger'); h.position.set(sx * 0.42, (WTOP + 2.0) / 2, z); } }
    // czoła członów pod harmonijki (ramy)
    if (!front) box(g, 2 * HW - 0.1, ROOF - SKIRT - 0.08, 0.06, black, 'joint frame', 0, (ROOF + SKIRT) / 2, z0 + 0.035, 0.02);
    if (!back) box(g, 2 * HW - 0.1, ROOF - SKIRT - 0.08, 0.06, black, 'joint frame', 0, (ROOF + SKIRT) / 2, z1 - 0.035, 0.02);
    // dach: urządzenia (przetwornice, klimatyzatory) w osłonach
    const roofBox = (w, h, d, z, name) => box(g, w, h, d, roofM, name, 0, ROOF + h / 2 - 0.04, z, 0.1);
    if (i === 0) { roofBox(1.9, 0.32, 2.6, -1.0, 'cab air conditioning'); }
    if (i === 1 || i === 3) roofBox(1.9, 0.36, 3.6, 0, 'traction converter');
    if (i === 4) { roofBox(1.9, 0.32, 2.4, 0.8, 'air conditioning unit'); roofBox(1.6, 0.3, 1.6, -2.2, 'braking resistors'); }
    // drzwi: skrzydła odskokowo-przesuwne
    for (const [a, b] of doorsR[i]) {
      const w = (a - b), two = w > 0.9, leaves = two ? [[a - w / 4, 1, w / 2], [b + w / 4, -1, w / 2]] : [[(a + b) / 2, 1, w]];
      for (const [zc2, dir, lw] of leaves) {
        const d = new THREE.Group(); d.name = 'door leaf'; d.userData.part = true; d.position.set(-HW - 0.01, 0, zc2); g.add(d);
        box(d, 0.04, 2.1 - FLOOR, 0.05, black, 'door frame', 0, (2.1 + FLOOR) / 2, lw / 2 - 0.025, 0.01);
        box(d, 0.04, 2.1 - FLOOR, 0.05, black, 'door frame', 0, (2.1 + FLOOR) / 2, -lw / 2 + 0.025, 0.01);
        box(d, 0.04, 0.08, lw, black, 'door rail', 0, 2.07, 0, 0.01); box(d, 0.04, 0.18, lw - 0.1, red, 'door kick plate', 0, FLOOR + 0.09, 0, 0.01);
        const dg = add(d, new THREE.PlaneGeometry(lw - 0.09, 2.1 - FLOOR - 0.28), glass, 'door glass', { shadow: false }); dg.rotation.y = -Math.PI / 2; dg.position.set(-0.005, (2.1 + FLOOR + 0.1) / 2, 0); dg.renderOrder = 2;
        doors.push({ g: d, zc: zc2, dir, w: lw });
      }
      const p = add(g, new THREE.CylinderGeometry(0.018, 0.018, WTOP - FLOOR, 8), pole, 'door stanchion'); p.position.set(-HW + 0.32, (WTOP + FLOOR) / 2, (a + b) / 2);
    }
    // wózek stały: rama, dwa zestawy kołowe, maźnice, sprężyny, silniki
    let bogie = null;
    if (sp.bogie != null) {
      bogie = new THREE.Group(); bogie.name = 'bogie'; bogie.userData.part = true; bogie.position.set(0, 0, sp.bogie); g.add(bogie);
      const wheels = [];
      for (const az of [WB / 2, -WB / 2]) {
        const ws = new THREE.Group(); ws.name = 'wheelset'; ws.position.set(0, RW, az); bogie.add(ws);
        const ax = add(ws, new THREE.CylinderGeometry(0.06, 0.06, GAUGE + 0.2, 12), steel, 'axle'); ax.rotation.z = Math.PI / 2;
        for (const sx of [1, -1]) {
          const lat = new THREE.LatheGeometry([[0.05, -0.065], [RW - 0.03, -0.065], [RW, -0.06], [RW, 0.04], [RW + 0.02, 0.05], [RW + 0.02, 0.065], [RW - 0.03, 0.065], [0.05, 0.065], [0.05, -0.065]].map(([r, x]) => new THREE.Vector2(r, -sx * x)), 32);
          lat.rotateZ(-Math.PI / 2); const wm = add(ws, lat, wheelM, 'wheel'); wm.position.x = sx * GAUGE / 2;
          // tarcza z otworami (widać, że się kręci)
          for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, h = add(ws, new THREE.CylinderGeometry(0.035, 0.035, 0.17, 10), black, 'wheel hole'); h.rotation.z = Math.PI / 2; h.position.set(sx * GAUGE / 2, Math.sin(a) * 0.17, Math.cos(a) * 0.17); }
        }
        wheels.push(ws);
      }
      for (const sx of [1, -1]) {
        box(bogie, 0.16, 0.22, WB + 0.7, steel, 'bogie side frame', sx * (GAUGE / 2 + 0.17), RW + 0.04, 0, 0.03);
        for (const az of [WB / 2, -WB / 2]) { box(bogie, 0.2, 0.2, 0.26, steel, 'axlebox', sx * (GAUGE / 2 + 0.2), RW, az, 0.03); const sp2 = add(bogie, new THREE.CylinderGeometry(0.08, 0.08, 0.16, 12), black, 'rubber spring'); sp2.position.set(sx * (GAUGE / 2 + 0.17), RW + 0.22, az); }
        const mot = add(bogie, new THREE.CylinderGeometry(0.17, 0.17, 0.55, 18), steel, 'traction motor'); mot.rotation.x = Math.PI / 2; mot.position.set(sx * (GAUGE / 2 - 0.1), RW + 0.05, 0);
      }
      box(bogie, GAUGE + 0.5, 0.14, 0.4, steel, 'bogie cross beam', 0, RW + 0.1, 0, 0.03);
      for (const sx of [1, -1]) for (const az of [WB / 2 + 0.25, -WB / 2 - 0.25]) { const sd = add(bogie, new THREE.CylinderGeometry(0.035, 0.035, 0.3, 10), black, 'sand pipe'); sd.position.set(sx * GAUGE / 2, 0.2, az); sd.rotation.x = Math.sign(az) * 0.4; }
      bogie.userData.wheels = wheels;
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    sections.push({ g, L: sp.L, z: zMid[i], bogie, front, back, zF, zB });
  });

  // ---------- kabina i czoło (przód członu A) ----------
  const A = sections[0].g, zN = S[0].L / 2, zc0 = zN - 1.3;   // nos od zc0 do zN
  const nose = [];   // przekroje nosa: zwężenie i opadanie dachu, szyba pochylona
  for (let k = 0; k <= 12; k++) {
    const t = k / 12, z = zc0 + 1.3 * t, w = HW * (1 - 0.1 * t * t), top = ROOF - 0.42 * t * t, bot = SKIRT + 0.08 * t * t;
    nose.push({ z, w, top, bot });
  }
  const ring = (n) => { const p = []; const N = 20; for (let k = 0; k < N; k++) { const a = k / N * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); const sq = (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.28); p.push(new THREE.Vector3(sq(c) * n.w, (n.top + n.bot) / 2 + sq(s) * (n.top - n.bot) / 2, n.z)); } return p; };
  const rings = nose.map(ring), RN = rings[0].length;
  const pos = [], cols = [], idx = [];
  rings.forEach((r) => r.forEach((p) => { pos.push(p.x, p.y, p.z); }));
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < RN; j++) { const a = i * RN + j, b = i * RN + (j + 1) % RN, c = (i + 1) * RN + (j + 1) % RN, d = (i + 1) * RN + j; idx.push(a, c, d, a, b, c); }
  // czołowa ściana nosa
  const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ng.setIndex(idx); ng.computeVertexNormals();
  void cols;
  add(A, ng, yellow, 'cab nose');
  const cabIn = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.8, side: THREE.BackSide });   // wnętrze kabiny (od środka nosa)
  const lg = ng.clone(), lp = lg.attributes.position; for (let k = 0; k < lp.count; k++) { lp.setX(k, lp.getX(k) * 0.96); lp.setY(k, 1.45 + (lp.getY(k) - 1.45) * 0.965); } lg.computeVertexNormals();
  add(A, lg, cabIn, 'cab lining', { shadow: false });
  // maska czołowa (czarna) z szybą przednią, dolny pas czerwony
  // czoło: panel dolny, rama szyby (czarna maska) i pas nad szybą z wyświetlaczem — szyba otwarta do kabiny
  const fw = 2 * HW * 0.9 - 0.02, ytop = ROOF - 0.42, ybot = SKIRT + 0.08;
  box(A, fw, 0.95 - ybot, 0.04, yellow, 'front lower panel', 0, (0.95 + ybot) / 2, zN - 0.01, 0.04);
  box(A, fw, ytop - 2.05, 0.04, black, 'front upper mask', 0, (ytop + 2.05) / 2, zN - 0.01, 0.03);
  for (const sx of [1, -1]) box(A, 0.12, 2.05 - 0.95, 0.04, black, 'windscreen pillar', sx * (fw / 2 - 0.06), 1.5, zN - 0.01, 0.02);
  box(A, fw, 0.06, 0.05, black, 'windscreen sill', 0, 0.95, zN + 0.012, 0.02);
  const shield = add(A, new THREE.PlaneGeometry(fw - 0.2, 1.06), glass, 'windscreen', { shadow: false }); shield.position.set(0, 1.5, zN + 0.012); shield.renderOrder = 2;
  box(A, 2 * HW * 0.86, 0.36, 0.05, red, 'front red apron', 0, SKIRT + 0.24, zN + 0.02, 0.06);
  const dest = add(A, new THREE.PlaneGeometry(1.6, 0.2), led, 'destination display', { shadow: false }); dest.position.set(0, (ytop + 2.05) / 2, zN + 0.024);
  const cpl = box(A, 0.4, 0.2, 0.25, black, 'coupler cover', 0, 0.55, zN + 0.16, 0.05); void cpl;
  for (const sx of [1, -1]) {
    const hl = box(A, 0.42, 0.16, 0.05, black, 'headlamp cluster', sx * 0.68, 0.72, zN + 0.025, 0.04);
    box(hl, 0.18, 0.08, 0.02, M.headlamp, 'headlamp', -sx * 0.08, 0.02, 0.045, 0.02);
    box(hl, 0.1, 0.05, 0.02, M.amber, 'front indicator', sx * 0.14, 0.02, 0.045, 0.015);
    box(hl, 0.32, 0.018, 0.02, M.reverse, 'daytime running light', 0, -0.05, 0.045, 0.006);
    // lusterka (kamery) na wysięgnikach
    const arm = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * HW * 0.92, 2.15, zN - 0.5), new THREE.Vector3(sx * (HW + 0.12), 2.2, zN - 0.2), new THREE.Vector3(sx * (HW + 0.16), 2.1, zN - 0.05)]);
    add(A, new THREE.TubeGeometry(arm, 12, 0.02, 8, false), black, 'mirror arm');
    box(A, 0.12, 0.26, 0.12, black, 'mirror housing', sx * (HW + 0.17), 1.95, zN - 0.05, 0.03);
  }
  const wiper = box(A, 1.1, 0.02, 0.02, black, 'wiper', 0.1, 1.1, zN + 0.05, 0.006); wiper.rotation.z = 0.15;
  // kabina: pulpit, fotel, przegroda
  const desk = box(A, 1.6, 0.3, 0.6, M.dash, 'driver desk', 0, 1.0, zN - 0.6, 0.05); desk.rotation.x = 0.25;
  box(A, 0.55, 0.12, 0.5, seatM, 'driver seat', 0, 0.85, zN - 1.4, 0.04); const dsb = box(A, 0.55, 0.7, 0.12, seatM, 'driver seat back', 0, 1.25, zN - 1.68, 0.04); dsb.rotation.x = -0.15;
  box(A, 2 * HW - 0.1, 1.6, 0.04, black, 'cab partition', 0, FLOOR + 0.8 + 0.4, zN - 2.0, 0.01);
  const ctl = box(A, 0.12, 0.2, 0.12, M.plastic, 'master controller', 0.45, 1.25, zN - 0.75, 0.02); void ctl;
  // tył (człon E): ściana z oknem, lampy, numer linii
  const E = sections[4].g, zT = -S[4].L / 2;
  box(E, 2 * HW, ROOF - SKIRT, 0.08, yellow, 'rear wall', 0, (ROOF + SKIRT) / 2, zT - 0.04, 0.12);
  box(E, 2 * HW + 0.04, SILL - SKIRT + 0.02, 0.1, red, 'rear red apron', 0, (SILL + SKIRT) / 2 - 0.01, zT - 0.06, 0.1);
  const rw = add(E, new THREE.PlaneGeometry(1.5, 1.0), glass, 'rear window', { shadow: false }); rw.position.set(0, 1.65, zT - 0.093); rw.rotation.y = Math.PI;
  const rn = add(E, new THREE.PlaneGeometry(0.46, 0.17), ledNo, 'rear route number', { shadow: false }); rn.position.set(0, 2.38, zT - 0.096); rn.rotation.y = Math.PI;
  for (const sx of [1, -1]) { const tl = box(E, 0.18, 0.5, 0.04, black, 'tail lamp cluster', sx * (HW - 0.2), 0.9, zT - 0.12, 0.03); box(tl, 0.13, 0.2, 0.02, M.tail, 'tail lamp', 0, 0.1, -0.04, 0.01); box(tl, 0.13, 0.1, 0.02, M.amber, 'rear indicator', 0, -0.12, -0.04, 0.01); }
  // pantograf jednoramienny na członie C
  const C = sections[2].g;
  const panto = new THREE.Group(); panto.name = 'pantograph'; panto.userData.part = true; panto.position.set(0, ROOF + 0.02, 0); C.add(panto);
  box(panto, 1.2, 0.08, 1.0, grey, 'pantograph base', 0, 0.04, 0, 0.02);
  for (const sx of [1, -1]) { const ins = add(panto, new THREE.CylinderGeometry(0.05, 0.06, 0.18, 10), new THREE.MeshStandardMaterial({ color: 0x6b3a2a, roughness: 0.4 }), 'insulator'); ins.position.set(sx * 0.5, -0.05, 0.4); const ins2 = ins.clone(); ins2.position.z = -0.4; panto.add(ins2); }
  const lower = new THREE.Group(); lower.name = 'pantograph lower arm'; lower.position.set(0, 0.12, -0.45); panto.add(lower);
  const la = add(lower, new THREE.CylinderGeometry(0.035, 0.035, 1.5, 10), grey, 'lower arm'); la.position.set(0, 0, 0.75); la.rotation.x = Math.PI / 2;
  const upper = new THREE.Group(); upper.name = 'pantograph upper arm'; upper.position.set(0, 0, 1.5); lower.add(upper);
  const ua = add(upper, new THREE.CylinderGeometry(0.025, 0.025, 1.45, 10), grey, 'upper arm'); ua.position.set(0, 0, -0.72); ua.rotation.x = Math.PI / 2;
  const head = new THREE.Group(); head.name = 'pantograph head'; head.position.set(0, 0, -1.45); upper.add(head);
  for (const dz of [-0.12, 0.12]) { const strip = box(head, 1.5, 0.05, 0.06, black, 'carbon strip', 0, 0.06, dz, 0.01); const horn = new THREE.TorusGeometry(0.12, 0.015, 6, 12, Math.PI); for (const sx of [1, -1]) { const h = add(strip, horn, grey, 'pan horn'); h.position.set(sx * 0.78, -0.04, 0); h.rotation.y = Math.PI / 2; h.rotation.z = sx > 0 ? -Math.PI / 2 : Math.PI / 2; } }
  const layPanto = (u) => { const a = 0.12 + u * 0.75; lower.rotation.x = -a; upper.rotation.x = 2 * a; head.rotation.x = -a; };
  layPanto(0);

  // ---------- harmonijki między członami (rozciągane za członami) ----------
  const BR = 20, BK = 7, bell = [];
  const prof = []; for (let k = 0; k < BR; k++) { const a = k / BR * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); prof.push([Math.sign(c) * Math.pow(Math.abs(c), 0.3) * (HW - 0.06), (ROOF + SKIRT) / 2 + Math.sign(s) * Math.pow(Math.abs(s), 0.3) * (ROOF - SKIRT - 0.12) / 2]); }
  for (let i = 0; i < sections.length - 1; i++) {
    const g = new THREE.BufferGeometry(), p = new Float32Array(BK * BR * 3), ix = [];
    for (let k = 0; k < BK - 1; k++) for (let j = 0; j < BR; j++) { const a = k * BR + j, b = k * BR + (j + 1) % BR, c = (k + 1) * BR + (j + 1) % BR, d = (k + 1) * BR + j; ix.push(a, b, c, a, c, d); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setIndex(ix);
    const m = add(group, g, bellowsM, 'articulation bellows'); m.frustumCulled = false; bell.push(m);
  }
  const va = new THREE.Vector3(), vb = new THREE.Vector3();
  function layBellows() {
    group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
    for (let i = 0; i < bell.length; i++) {
      const A2 = sections[i], B2 = sections[i + 1], p = bell[i].geometry.attributes.position;
      for (let k = 0; k < BK; k++) {
        const t = k / (BK - 1), f = 1 + (k % 2 ? 0.03 : 0);
        for (let j = 0; j < BR; j++) {
          const [x, y] = prof[j], yy = (ROOF + SKIRT) / 2 + (y - (ROOF + SKIRT) / 2) * f;
          va.set(x * f, yy, -A2.L / 2 - 0.0).applyMatrix4(A2.g.matrixWorld).applyMatrix4(inv);
          vb.set(x * f, yy, B2.L / 2 + 0.0).applyMatrix4(B2.g.matrixWorld).applyMatrix4(inv);
          va.lerp(vb, t); p.setXYZ(k * BR + j, va.x, va.y, va.z);
        }
      }
      p.needsUpdate = true; bell[i].geometry.computeVertexNormals(); bell[i].geometry.computeBoundingSphere();
    }
  }
  const spot = new THREE.SpotLight(0xfff1d6, 0, 80, 0.5, 0.5, 1.4); spot.position.set(0, 0.85, zN + 0.2); spot.target.position.set(0, 0, zN + 25); A.add(spot, spot.target);
  const inner = [1, 3].map((i) => { const l = new THREE.PointLight(0xfff4e0, 0, 10, 1.5); l.position.set(0, 2.1, 0); sections[i].g.add(l); return l; });

  // ---------- ruch: ustawienie członów, koła, drzwi, pantograf, światła ----------
  const st = { door: 0, panto: 0 };
  function update(t, dt, opts = {}) {
    dt = Math.min(dt, 0.05);
    const v = opts.speed || 0;
    // opts.poses: [{ x, y, z, yaw, pitch }] — człony w układzie grupy (w grze: na łuku toru); domyślnie prosto
    sections.forEach((s, i) => {
      const P = opts.poses && opts.poses[i];
      if (P && P.q) { s.g.position.set(P.x, P.y, P.z); s.g.quaternion.copy(P.q); }   // z fizyki: pełny obrót (z przechyłem)
      else if (P) { s.g.position.set(P.x, P.y, P.z); s.g.rotation.set(P.pitch || 0, P.yaw || 0, 0, 'YXZ'); }
      else { s.g.position.set(0, 0, s.z); s.g.rotation.set(0, 0, 0); }
      if (s.bogie) for (const w of s.bogie.userData.wheels) w.rotation.x += v / RW * dt;
    });
    layBellows();
    st.door += ((opts.work ? 1 : 0) - st.door) * Math.min(1, 2.5 * dt);
    const o1 = Math.min(1, st.door * 2), o2 = Math.max(0, st.door * 2 - 1);
    for (const d of doors) { d.g.position.x = -HW - 0.01 - 0.08 * o1; d.g.position.z = d.zc + d.dir * (d.w - 0.07) * o2 * 0.92; }
    st.panto += ((opts.pantograph ? 1 : 0) - st.panto) * Math.min(1, 1.5 * dt); layPanto(st.panto);
    const L = opts.lights ? 1 : 0, br = !!opts.brake;
    M.headlamp.emissiveIntensity = L ? 2.6 : 0.4; spot.intensity = L ? 70 : 0; M.reverse.emissiveIntensity = L ? 0.6 : 0.3;
    M.tail.emissiveIntensity = br ? 3.2 : (L ? 1.1 : 0.05);
    lightStrip.emissiveIntensity = L ? 1.6 : 0.05; for (const l of inner) l.intensity = L ? 3 : 0;
    led.emissiveIntensity = ledNo.emissiveIntensity = L ? 1.6 : 0.6;
  }
  update(0, 0.016, {});
  group.traverse((o) => { if (o.isMesh && o.geometry && !o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); });
  return {
    def: info, group, body: sections[0].g, sections, doors, parts: { sections: sections.map((s) => s.g), pantograph: panto },
    materials: M, update, rig: { state: st },
    setPaint(c) { yellow.color.set(c); },
    dispose() { group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); },
  };
}
