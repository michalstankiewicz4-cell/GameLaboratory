// Supermarine Spitfire Mk I (1940, bitwa o Anglię) — myśliwiec z silnikiem Rolls-Royce Merlin III. Wymiary (1 jednostka = 1 m):
// długość 9,12, rozpiętość 11,23, powierzchnia skrzydeł 22,48 m², skrzydło eliptyczne (profil NACA 2213 u nasady → 2209,4
// na końcu, wznios 6°), śmigło trójłopatowe Rotol Ø 3,27, rozstaw kół 1,68, masa startowa ok. 2700 kg, 8 km Browning .303.
// Barwy RAF 1940: góra — Dark Earth i Dark Green, spód — Sky; kokardy typu A1 (kadłub), B (góra skrzydeł), A (spód).
// Układ: początek w środku masy, +Z przód (dziób), +X lewe skrzydło, +Y w górę; podwozie wypuszczone, kadłub poziomo.
// Notatki: docs/models/air/spitfire.md.
import * as THREE from '../../../vendor/three/three.module.js';
import { loftParts, roundBox, capFan } from '../road/geom.js';
import { decal, noiseMap } from '../road/materials.js';

export const info = {
  id: 'spitfire', name: 'Supermarine Spitfire Mk I', role: 'Myśliwiec · 1940 · Rolls-Royce Merlin III 1030 KM',
  kind: 'plane', length: 9.12, span: 11.23, height: 3.86, wingArea: 22.48, mass: 2700, maxSpeed: 582 / 3.6, accel: 4,
  work: 'Owiewka', paints: [['RAF 1940 (Dark Earth / Dark Green / Sky)', 0]],
  // lot (zachowanie „lot w atmosferze”, js/behaviors/air/flight.js)
  flight: {
    S: 22.48, b: 11.23, c: 2.08, e: 0.92, CLa: 4.7, a0: -0.035, CLmax: 1.36, stall: 0.27, CD0: 0.0215, CDgear: 0.012, CDflap: 0.05, dCLflap: 0.42,
    I: [9000, 14500, 6200],   // [przechylenie (oś z), odchylenie (y), pochylenie (x)] kg·m²
    power: 770e3, prop: { R: 1.635, eta: 0.8, Tstatic: 9500 },
    Cm: { m0: 0.014, a: -0.9, q: -14, de: -1.2 }   /* m0: wyważenie dla ok. 320 km/h */, Cl: { da: 0.18, p: -0.45, beta: -0.08 }, Cn: { dr: -0.09, r: -0.12, beta: 0.11 },
    gear: [{ x: 0.84, y: -1.5, z: 0.75, R: 0.34, k: 1.6e5, c: 1.2e4, brake: true }, { x: -0.84, y: -1.5, z: 0.75, R: 0.34, k: 1.6e5, c: 1.2e4, brake: true }, { x: 0, y: -0.48, z: -5.55, R: 0.12, k: 6e4, c: 6e3, steer: true }],
  },
  rest: { pitch: -0.222, y: 1.71 },   // na ziemi: oparty na kołach głównych i ogonowym (nos w górę ok. 12,7°)
  seat: { x: 0, y: 0.62, z: -0.75 },
  doorAt: { x: 1.4, z: -0.6 },
};

// ---------- profil NACA 4-cyfrowy: punkty wokół (od krawędzi spływu górą do noska i dołem z powrotem) ----------
function naca(m, p, t, n = 14) {
  const up = [], lo = [];
  for (let i = 0; i <= n; i++) {
    const x = (1 - Math.cos(i / n * Math.PI)) / 2;
    const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    const yc = x < p ? m / (p * p) * (2 * p * x - x * x) : m / ((1 - p) ** 2) * ((1 - 2 * p) + 2 * p * x - x * x);
    up.push([x, yc + yt]); lo.push([x, yc - yt]);
  }
  return up.reverse().concat(lo.slice(1, -1));   // TE(góra) → nosek → TE(dół) bez powtórzeń
}
const AF_N = 14, AF = (t) => naca(0.02, 0.2, t, AF_N);   // NACA 22xx
const AFS = (t) => naca(0, 0.3, t, 10);                 // symetryczny (usterzenie)

export function build({ detail = 1 } = {}) {
  // ---------- materiały i tekstury: kamuflaż RAF 1940, Sky, kokardy, litery kodu ----------
  const camoTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
    g.fillStyle = '#5c4b34'; g.fillRect(0, 0, 1024, 1024);                 // Dark Earth
    g.fillStyle = '#3d4a2c';                                                // Dark Green: duże plamy o miękkich brzegach
    let s = 11; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let k = 0; k < 14; k++) { g.beginPath(); const cx = r() * 1024, cy = r() * 1024; for (let a = 0; a < 6.3; a += 0.4) { const rr = 120 + r() * 160; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7); } g.closePath(); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
  })();
  const camo = new THREE.MeshStandardMaterial({ map: camoTex, roughness: 0.72, metalness: 0.15, bumpMap: noiseMap(81, 512, 60), bumpScale: 0.25 });
  const camo2 = camo.clone(); camo2.side = THREE.DoubleSide;   // stery i lotki (cienkie, widać je z obu stron)
  const sky = new THREE.MeshStandardMaterial({ color: 0xb4c2a8, roughness: 0.7, metalness: 0.15 });
  const black = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.55, metalness: 0.2 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x8d9093, roughness: 0.35, metalness: 0.85 });
  const exhaust = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.8, metalness: 0.5, emissive: 0xff6a1a, emissiveIntensity: 0 });
  const cockpitG = new THREE.MeshStandardMaterial({ color: 0x8c9478, roughness: 0.8 });     // zieleń wnętrza kabiny
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xdfe8ee, roughness: 0.04, transparent: true, opacity: 0.25, clearcoat: 1, envMapIntensity: 2.2, depthWrite: false, side: THREE.DoubleSide });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const prop = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5, metalness: 0.2 });
  const yellowTip = new THREE.MeshStandardMaterial({ color: 0xe8c22c, roughness: 0.5 });
  const lightR = new THREE.MeshStandardMaterial({ color: 0xa01010, emissive: 0xff2010, emissiveIntensity: 0.2 }), lightG = new THREE.MeshStandardMaterial({ color: 0x108a20, emissive: 0x20ff40, emissiveIntensity: 0.2 });
  const roundelTex = (rings) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); rings.forEach(([r, col]) => { g.fillStyle = col; g.beginPath(); g.arc(128, 128, r * 128, 0, Math.PI * 2); g.fill(); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const decalMat = (tex) => decal(new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.7, alphaTest: 0.5, side: THREE.DoubleSide }));
  const RA1 = decalMat(roundelTex([[1, '#e5c61f'], [0.875, '#1d2b6b'], [0.5, '#f0f0ea'], [0.25, '#b0201f']]));   // A1: z żółtą obwódką
  const RB = decalMat(roundelTex([[1, '#1d2b6b'], [0.4, '#b0201f']]));                                          // B: góra skrzydeł
  const RA = decalMat(roundelTex([[1, '#1d2b6b'], [0.667, '#f0f0ea'], [0.333, '#b0201f']]));                    // A: spód skrzydeł
  const flashTex = (() => { const c = document.createElement('canvas'); c.width = 96; c.height = 128; const g = c.getContext('2d'); ['#b0201f', '#f0f0ea', '#1d2b6b'].forEach((col, i) => { g.fillStyle = col; g.fillRect(i * 32, 0, 32, 128); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const codeTex = (txt) => { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#9a9a96'; g.font = 'bold 100px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

  const group = new THREE.Group(); group.name = 'Supermarine Spitfire Mk I';
  const body = new THREE.Group(); body.name = 'airframe'; body.userData.part = true; group.add(body);
  const add = (parent, geo, mat, name, opts = {}) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = opts.shadow !== false; m.receiveShadow = true; parent.add(m); return m; };
  const box = (parent, w, h, d, mat, name, x, y, z, r = 0.01) => { const m = add(parent, roundBox(w, h, d, r, Math.min(r, 0.006), 2), mat, name); m.position.set(x, y, z); return m; };
  const planarUV = (g, f) => { const p = g.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { const [u, v] = f(p.getX(i), p.getY(i), p.getZ(i)); uv[i * 2] = u; uv[i * 2 + 1] = v; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; };

  // ---------- kadłub: przekroje (z: pół szerokości, góra, dół) — zaokrąglony owal, górą kamuflaż, dołem Sky ----------
  const ST = [[2.62, 0.30, 0.34, -0.26], [2.5, 0.38, 0.42, -0.40], [2.2, 0.43, 0.46, -0.47], [1.6, 0.46, 0.49, -0.52], [0.9, 0.47, 0.52, -0.56],
    [0.3, 0.48, 0.55, -0.58], [-0.4, 0.47, 0.56, -0.58], [-1.2, 0.43, 0.52, -0.56], [-2.0, 0.38, 0.47, -0.51], [-2.8, 0.32, 0.42, -0.44],
    [-3.6, 0.26, 0.37, -0.36], [-4.4, 0.20, 0.32, -0.27], [-5.1, 0.13, 0.28, -0.17], [-5.7, 0.07, 0.25, -0.06], [-6.02, 0.02, 0.24, 0.02]];
  const RN = 28;
  const fRing = ([z, w, yt, yb]) => { const out = []; for (let k = 0; k < RN; k++) { const a = k / RN * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); const yc = (yt + yb) / 2, hh = (yt - yb) / 2; out.push(new THREE.Vector3(Math.sign(c) * Math.pow(Math.abs(c), 0.8) * w, yc + Math.sign(s) * Math.pow(Math.abs(s), 0.85) * hh, z)); } return out; };
  const fusRings = []; for (let i = 0; i < ST.length - 1; i++) for (let k = 0; k < 4; k++) { const t = k / 4, a = ST[i], b = ST[i + 1], sm = t * t * (3 - 2 * t); fusRings.push(fRing(a.map((v, j) => v + (b[j] - v) * (j === 0 ? t : sm)))); }
  fusRings.push(fRing(ST[ST.length - 1]));
  const outward = (c, n) => n.x * c.x + n.y * (c.y - 0) < 0;
  const fus = loftParts(fusRings, (i, j, c) => (c.y > -0.18 ? 'upper' : 'lower'), { orient: outward });
  planarUV(fus.upper, (x, y, z) => [z / 9 + 0.5, y / 6 + (x > 0 ? 0 : 0.5)]);
  add(body, fus.upper, camo, 'fuselage'); add(body, fus.lower, sky, 'fuselage underside');
  add(body, capFan(fusRings[fusRings.length - 1], new THREE.Vector3(0, 0, -1)), camo, 'tail cone');
  // osłona silnika: linie paneli, wloty, kolektory wydechowe (6 rur na stronę)
  for (const sx of [1, -1]) {
    for (let k = 0; k < 6; k++) {
      const ez = 2.05 - k * 0.2, st = new THREE.Group(); st.name = 'exhaust stack'; st.position.set(sx * 0.475, 0.12, ez); body.add(st);
      const pipe = add(st, new THREE.CylinderGeometry(0.035, 0.045, 0.12, 10), exhaust, 'exhaust pipe'); pipe.rotation.z = sx * Math.PI / 2; pipe.position.x = sx * 0.04;
    }
    const line = box(body, 0.006, 0.008, 1.9, black, 'cowling panel line', sx * 0.468, 0.32, 1.55, 0.003); line.rotation.y = 0;
  }
  // kołpak i śmigło trójłopatowe (Rotol, Ø 3,27 m) — obraca się w update
  const propG = new THREE.Group(); propG.name = 'propeller'; propG.userData.part = true; propG.position.set(0, 0.04, 2.66); body.add(propG);
  const spin = new THREE.LatheGeometry([[0, 0.36], [0.06, 0.34], [0.16, 0.26], [0.24, 0.13], [0.29, 0.0], [0.3, -0.06], [0, -0.06]].reverse().map(([r, y]) => new THREE.Vector2(r, y)), 32); spin.rotateX(Math.PI / 2);
  add(propG, spin, black, 'spinner');
  const bladeGeo = (() => { // łopata: przekrój cienki, cięciwa rośnie do 1/3 i maleje, skręcona
    const pts = [], idx = [], N = 14, M = 8;
    for (let i = 0; i <= N; i++) { const r = 0.28 + (1.635 - 0.28) * i / N, ch = 0.2 * Math.sin(Math.PI * (0.12 + 0.88 * i / N)) + 0.06, tw = 0.9 - 0.6 * i / N, th = 0.04 * (1 - 0.7 * i / N);
      for (let k = 0; k < M; k++) { const a = k / M * Math.PI * 2, u = Math.cos(a) * ch / 2, v = Math.sin(a) * th / 2; pts.push(u * Math.cos(tw) - v * Math.sin(tw), r, u * Math.sin(tw) + v * Math.cos(tw)); } }
    for (let i = 0; i < N; i++) for (let k = 0; k < M; k++) { const a = i * M + k, b = i * M + (k + 1) % M, c = (i + 1) * M + (k + 1) % M, d = (i + 1) * M + k; idx.push(a, c, b, a, d, c); }
    const tip = pts.length / 3; pts.push(0, 1.64, 0); for (let k = 0; k < M; k++) idx.push(N * M + k, tip, N * M + (k + 1) % M);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  })();
  for (let k = 0; k < 3; k++) { const bl = add(propG, bladeGeo, prop, 'propeller blade'); bl.rotation.z = k * Math.PI * 2 / 3; const tipG = add(bl, new THREE.CylinderGeometry(0.07, 0.06, 0.1, 10), yellowTip, 'blade tip'); tipG.position.y = 1.57; }
  const disc = add(propG, new THREE.CircleGeometry(1.635, 48), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), 'propeller disc', { shadow: false });
  disc.position.z = -0.02;

  // ---------- skrzydło eliptyczne: profil wzdłuż rozpiętości, wznios 6°, lotki i klapy osobno ----------
  const HALF = 11.23 / 2, C0 = 2.54, DIH = 6 * Math.PI / 180, YW = -0.36, X0 = 0.3;
  const chordAt = (x) => Math.max(0.28, C0 * Math.sqrt(Math.max(0, 1 - (x / HALF) ** 2)));
  const tAt = (x) => 0.13 - 0.036 * Math.min(1, x / HALF);
  const wingStations = []; for (let k = 0; k <= 34; k++) { const f = k / 34, x = X0 + (HALF - 0.06 - X0) * (1 - Math.cos(f * Math.PI / 2) ** 1.2); wingStations.push(x); }
  const AIL = [3.25, 5.1], FLAP = [0.6, 2.95], AIL_C = 0.24, FLAP_C = 0.17;
  const wings = [], movers = { aileron: [], flap: [], elevator: [], rudder: [] };
  for (const sx of [1, -1]) {
    // punkt profilu: x wzdłuż rozpiętości, (u, v) w cięciwie; ćwiartka cięciwy na z = 0
    const P = (x, u, v) => { const c = chordAt(x), y = YW + (x - X0) * Math.tan(DIH) + v * c, z = c * 0.25 - u * c; return new THREE.Vector3(sx * x, y, z); };
    const af = (x) => AF(tAt(x));
    const ring = (x, u0, u1, mode) => af(x).filter(([u]) => u >= u0 - 1e-6 && u <= u1 + 1e-6).map(([u, v]) => P(x, u, v));
    // główna część skrzydła: bez lotki i klap (wycięcie tylnej części cięciwy na ich rozpiętości)
    const rings = wingStations.map((x) => {
      const cut = (x > AIL[0] && x < AIL[1]) ? 1 - AIL_C : (x > FLAP[0] && x < FLAP[1]) ? 1 : 1;
      const pts = af(x).map(([u, v]) => { const uu = Math.min(u, cut); return P(x, uu, uu < u ? v * 0.6 : v); }); return pts;
    });
    const nAF = rings[0].length;
    const wing = loftParts(rings, (i, j, c) => { const k = j % nAF; return k < AF_N ? 'upper' : 'lower'; }, { orient: (c, n) => { const x = Math.abs(c.x), cc = chordAt(x), cy = YW + (x - X0) * Math.tan(DIH) + 0.02 * cc, cz = -0.15 * cc; return n.y * (c.y - cy) + n.z * (c.z - cz) < 0; } });
    planarUV(wing.upper, (x, y, z) => [x / 12 + 0.5, z / 8 + 0.3]);
    add(body, wing.upper, camo, 'wing upper'); add(body, wing.lower, sky, 'wing lower');
    add(body, capFan(rings[rings.length - 1], new THREE.Vector3(sx, 0, 0)), camo, 'wing tip');
    add(body, capFan(rings[0], new THREE.Vector3(-sx, 0, 0)), sky, 'wing root');
    // lotka: tylne 24% cięciwy między AIL[0] i AIL[1], na zawiasie wzdłuż przedniej krawędzi
    const ail = new THREE.Group(); ail.name = 'aileron'; ail.userData.part = true; body.add(ail);
    const aS = wingStations.filter((x) => x >= AIL[0] && x <= AIL[1]), hinge0 = P(AIL[0], 1 - AIL_C, 0), hinge1 = P(AIL[1], 1 - AIL_C, 0);
    ail.position.copy(hinge0);
    const ar = aS.map((x) => af(x).filter(([u]) => u >= 1 - AIL_C - 1e-6).map(([u, v]) => P(x, u, v).sub(hinge0)));
    const ag = loftParts(ar, (i, j) => 'a', { closedRing: true }); for (const k in ag) add(ail, ag[k], camo2, 'aileron skin');
    ail.userData.axis = hinge1.clone().sub(hinge0).normalize(); ail.userData.sx = sx; movers.aileron.push(ail);
    // klapa krokodylowa (spód, tylne 17% cięciwy) — opada w dół
    const flap = new THREE.Group(); flap.name = 'flap'; flap.userData.part = true; body.add(flap);
    const f0 = P(FLAP[0], 1 - FLAP_C, -0.03), f1 = P(FLAP[1], 1 - FLAP_C, -0.03); flap.position.copy(f0);
    const fs = wingStations.filter((x) => x >= FLAP[0] && x <= FLAP[1]);
    const fr = fs.map((x) => [P(x, 1 - FLAP_C, -0.03), P(x, 0.995, -0.005), P(x, 0.995, -0.012), P(x, 1 - FLAP_C, -0.04)].map((p) => p.sub(f0)));
    const fg = loftParts(fr, () => 'f', { closedRing: true }); const skyD = sky.clone(); skyD.side = THREE.DoubleSide; add(flap, fg.f, skyD, 'flap');
    flap.userData.axis = f1.clone().sub(f0).normalize(); movers.flap.push(flap);
    // chłodnica (prawe skrzydło) i chłodnica oleju (lewe), karabiny, pitot, światła pozycyjne
    if (sx < 0) { const rad = box(body, 0.9, 0.3, 1.3, sky, 'radiator', -1.55, YW - 0.27 + (1.55 - X0) * Math.tan(DIH), -0.35, 0.06); const fl = box(rad, 0.85, 0.06, 0.25, sky, 'radiator flap', 0, -0.1, -0.72, 0.02); fl.rotation.x = 0.25; box(rad, 0.82, 0.24, 0.02, black, 'radiator face', 0, 0, 0.66, 0.005); }
    else { const oc = add(body, new THREE.CylinderGeometry(0.13, 0.13, 0.75, 16), sky, 'oil cooler'); oc.rotation.x = Math.PI / 2; oc.position.set(1.4, YW - 0.17 + (1.4 - X0) * Math.tan(DIH), 0.05); add(body, new THREE.CircleGeometry(0.11, 16), black, 'oil cooler intake').position.set(1.4, YW - 0.17 + (1.4 - X0) * Math.tan(DIH), 0.44); }
    for (let k = 0; k < 4; k++) { const gx = 2.25 + k * 0.38, p = P(gx, 0, 0); const gp = add(body, new THREE.CylinderGeometry(0.018, 0.018, 0.06, 8), black, 'gun port'); gp.rotation.x = Math.PI / 2; gp.position.copy(p).add(new THREE.Vector3(0, 0, 0.02)); }
    if (sx > 0) { const pit = add(body, new THREE.CylinderGeometry(0.012, 0.012, 0.6, 8), metal, 'pitot tube'); pit.rotation.x = Math.PI / 2; pit.position.copy(P(4.3, 0.2, -0.06)).add(new THREE.Vector3(0, -0.06, 0.2)); }
    const nav = add(body, new THREE.SphereGeometry(0.04, 10, 8), sx > 0 ? lightR : lightG, 'navigation light'); nav.position.copy(P(HALF - 0.12, 0.3, 0)).add(new THREE.Vector3(sx * 0.02, 0, 0));
    // kokardy: B na górze, A na spodzie
    const tipY = (x) => YW + (x - X0) * Math.tan(DIH);
    // kokardy dopasowane do powierzchni skrzydła (siatka rzutowana na profil): B na górze, A na spodzie
    const surfY = (x, z, up) => { const c = chordAt(x), u = Math.max(0, Math.min(1, (c * 0.25 - z) / c)), t = tAt(x), m = 0.02, pp = 0.2;
      const yt = 5 * t * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4), yc = u < pp ? m / (pp * pp) * (2 * pp * u - u * u) : m / ((1 - pp) ** 2) * ((1 - 2 * pp) + 2 * pp * u - u * u);
      return tipY(x) + (yc + (up ? yt : -yt)) * c; };
    for (const up of [true, false]) {
      const cx = 3.7, cz = -0.12, rad = 0.62, pos = [], uvs = [], idx = [], NR = 6, NA = 32;
      pos.push(sx * cx, surfY(cx, cz, up) + (up ? 0.008 : -0.008), cz); uvs.push(0.5, 0.5);
      for (let i = 1; i <= NR; i++) for (let k = 0; k < NA; k++) { const a = k / NA * Math.PI * 2, r = rad * i / NR, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; pos.push(sx * x, surfY(x, z, up) + (up ? 0.008 : -0.008), z); uvs.push(0.5 + Math.cos(a) * 0.5 * i / NR, 0.5 + Math.sin(a) * 0.5 * i / NR); }
      for (let k = 0; k < NA; k++) idx.push(0, 1 + k, 1 + (k + 1) % NA);
      for (let i = 1; i < NR; i++) for (let k = 0; k < NA; k++) { const a = 1 + (i - 1) * NA + k, b = 1 + (i - 1) * NA + (k + 1) % NA, c = 1 + i * NA + (k + 1) % NA, d = 1 + i * NA + k; idx.push(a, d, c, a, c, b); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals();
      add(body, g, up ? RB : RA, up ? 'upper wing roundel' : 'lower wing roundel', { shadow: false });
    }
    wings.push(wing);
  }
  // kokardy A1 na kadłubie, litery kodu, kokarda (szachownica wymaga właściwego dywizjonu — tu znaki RAF)
  for (const sx of [1, -1]) {
    const r1 = add(body, new THREE.CircleGeometry(0.42, 32), RA1, 'fuselage roundel', { shadow: false }); r1.position.set(sx * 0.36, 0.06, -2.85); r1.rotation.y = sx * Math.PI / 2;
    // litery kodu: litery dywizjonu (QV) przed kokardą, litera samolotu (K) za nią — po obu stronach
    const fwd = 'QV', aft = 'K';
    for (const [txt, z, w] of [[fwd, -1.95, txt => txt.length * 0.36], [aft, -3.75, txt => txt.length * 0.36]]) {
      const ww = w(txt), pl = add(body, new THREE.PlaneGeometry(ww * 1.3, 0.36), decalMat(codeTex(txt)), 'squadron code', { shadow: false });
      const hw = 0.47 - (z < -2.8 ? 0.12 : 0.03); pl.position.set(sx * hw, 0.06, z); pl.rotation.y = sx * Math.PI / 2;
    }
  }
  // ---------- usterzenie: statecznik poziomy z sterem wysokości, statecznik pionowy ze sterem kierunku ----------
  const TZ = -5.05, TY = 0.15, TH = 1.62, TC = 1.22;
  for (const sx of [1, -1]) {
    const cAt = (x) => Math.max(0.2, TC * Math.sqrt(Math.max(0, 1 - (x / TH) ** 2)));
    const Pt = (x, u, v) => { const c = cAt(x); return new THREE.Vector3(sx * x, TY + v * c, TZ + c * 0.3 - u * c); };
    const xs = []; for (let k = 0; k <= 16; k++) xs.push(0.12 + (TH - 0.05 - 0.12) * (1 - Math.cos(k / 16 * Math.PI / 2)));
    const rr = xs.map((x) => AFS(0.1).filter(([u]) => u <= 0.66).map(([u, v]) => Pt(x, u, v)));
    const tp = loftParts(rr, (i, j, c) => (c.y > TY ? 'u' : 'l'), { orient: (c, n) => { const cc = cAt(Math.abs(c.x)); return n.y * (c.y - TY) + n.z * (c.z - (TZ + cc * 0.3 - 0.35 * cc)) < 0; } });
    planarUV(tp.u, (x, y, z) => [x / 4 + 0.5, z / 4]);
    add(body, tp.u, camo, 'tailplane upper'); add(body, tp.l, sky, 'tailplane lower');
    add(body, capFan(rr[rr.length - 1], new THREE.Vector3(sx, 0, 0)), camo, 'tailplane tip');
    const el = new THREE.Group(); el.name = 'elevator'; el.userData.part = true; const h0 = Pt(0.12, 0.66, 0); el.position.copy(h0); body.add(el);
    const er = xs.map((x) => AFS(0.1).filter(([u]) => u >= 0.66).map(([u, v]) => Pt(x, u, v).sub(h0)));
    const eg = loftParts(er, () => 'e', { closedRing: true }); add(el, eg.e, camo2, 'elevator skin');
    movers.elevator.push(el);
  }
  {
    const FH = 1.42, FC = 1.35, FY = 0.22, FZ = -5.25;
    const cAt = (h) => Math.max(0.25, FC * Math.sqrt(Math.max(0, 1 - (h / FH) ** 2)));
    const Pf = (h, u, v) => { const c = cAt(h); return new THREE.Vector3(v * c, FY + h, FZ + c * 0.28 - u * c); };
    const hs = []; for (let k = 0; k <= 16; k++) hs.push(0.02 + (FH - 0.04 - 0.02) * (1 - Math.cos(k / 16 * Math.PI / 2)));
    const fr = hs.map((h) => AFS(0.11).filter(([u]) => u <= 0.55).map(([u, v]) => Pf(h, u, v)));
    const fin = loftParts(fr, () => 'fin', { orient: (c, n) => { const cc = cAt(c.y - FY); return n.x * c.x + n.z * (c.z - (FZ + cc * 0.28 - 0.3 * cc)) < 0; } });
    planarUV(fin.fin, (x, y, z) => [z / 4, y / 4]);
    add(body, fin.fin, camo, 'fin'); add(body, capFan(fr[fr.length - 1], new THREE.Vector3(0, 1, 0)), camo, 'fin tip');
    const rud = new THREE.Group(); rud.name = 'rudder'; rud.userData.part = true; const h0 = Pf(0.02, 0.55, 0); rud.position.copy(h0); body.add(rud);
    const rr2 = hs.map((h) => AFS(0.11).filter(([u]) => u >= 0.55).map(([u, v]) => Pf(h, u, v).sub(h0)));
    const rg = loftParts(rr2, () => 'r', { closedRing: true }); add(rud, rg.r, camo2, 'rudder skin');
    movers.rudder.push(rud);
    for (const sx of [1, -1]) { const fl = add(body, new THREE.PlaneGeometry(0.6, 0.62), decalMat(flashTex), 'fin flash', { shadow: false }); fl.position.set(sx * 0.07, FY + 0.45, FZ + 0.15); fl.rotation.y = sx * Math.PI / 2; }
    const tl = add(body, new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.3 }), 'tail light'); tl.position.set(0, 0.24, -6.03);
  }

  // ---------- kabina: wiatrochron, owiewka kroplowa (przesuwana), wnętrze ----------
  const ws = new THREE.Group(); ws.name = 'windscreen'; ws.position.set(0, 0.55, 0.28); body.add(ws);
  const wsG = new THREE.BufferGeometry(); { const p = [-0.26, 0, 0, 0.26, 0, 0, 0.18, 0.36, -0.32, -0.18, 0.36, -0.32]; wsG.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); wsG.setIndex([0, 1, 2, 0, 2, 3]); wsG.computeVertexNormals(); }
  add(ws, wsG, glass, 'windscreen glass', { shadow: false }).renderOrder = 2;
  for (const sx of [1, -1]) { const fr = add(ws, new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), black, 'windscreen frame'); fr.position.set(sx * 0.22, 0.18, -0.16); fr.rotation.set(-0.72, 0, sx * 0.22); }
  const hood = new THREE.Group(); hood.name = 'canopy hood'; hood.userData.part = true; hood.position.set(0, 0.55, -0.55); body.add(hood);
  const hg = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2); hg.scale(0.27, 0.42, 0.75);
  add(hood, hg, glass, 'canopy glass', { shadow: false }).renderOrder = 2;
  for (const z of [-0.45, 0, 0.45]) { const fr = add(hood, new THREE.TorusGeometry(1, 0.012, 6, 24, Math.PI), black, 'canopy frame'); fr.scale.set(0.27 * Math.sqrt(1 - (z / 0.75) ** 2), 0.42 * Math.sqrt(1 - (z / 0.75) ** 2), 1); fr.position.z = z; }
  // za owiewką: garb kadłuba z antena masztową
  const ant = add(body, new THREE.CylinderGeometry(0.01, 0.02, 0.6, 6), black, 'radio mast'); ant.position.set(0, 0.78, -2.2); ant.rotation.x = -0.3;
  box(body, 0.5, 0.06, 0.55, cockpitG, 'cockpit floor', 0, -0.12, -0.55, 0.02);
  const seat = box(body, 0.42, 0.55, 0.08, cockpitG, 'pilot seat back', 0, 0.2, -0.95, 0.03); seat.rotation.x = 0.2; box(body, 0.42, 0.06, 0.42, cockpitG, 'pilot seat', 0, -0.02, -0.75, 0.03);
  const panel = box(body, 0.6, 0.3, 0.04, black, 'instrument panel', 0, 0.4, 0.15, 0.01); panel.rotation.x = -0.15;
  for (let k = 0; k < 6; k++) { const d = add(panel, new THREE.CircleGeometry(0.035, 16), new THREE.MeshStandardMaterial({ color: 0xe0e0d0, emissive: 0x9fffb0, emissiveIntensity: 0.05 }), 'instrument dial'); d.position.set(-0.17 + (k % 3) * 0.17, k < 3 ? 0.06 : -0.06, -0.028); d.rotation.y = Math.PI; }
  const sight = box(body, 0.08, 0.1, 0.12, black, 'reflector gunsight', 0, 0.6, 0.12, 0.01); void sight;
  const stick = new THREE.Group(); stick.name = 'control column'; stick.position.set(0, -0.1, -0.35); body.add(stick);
  add(stick, new THREE.CylinderGeometry(0.015, 0.02, 0.5, 8), black, 'stick').position.y = 0.25;
  add(stick, new THREE.TorusGeometry(0.07, 0.014, 6, 16), black, 'spade grip').position.y = 0.52;

  // ---------- podwozie: goleń, koło, osłona (chowane na zewnątrz w skrzydło), kółko ogonowe ----------
  const gear = [];
  for (const sx of [1, -1]) {
    const pivot = new THREE.Group(); pivot.name = 'main gear'; pivot.userData.part = true; pivot.position.set(sx * 0.42, YW - 0.05, 0.75); body.add(pivot);
    const leg = add(pivot, new THREE.CylinderGeometry(0.04, 0.045, 1.12, 10), metal, 'oleo leg'); leg.position.set(sx * 0.21, -0.55, 0); leg.rotation.z = -sx * 0.38;
    const wheelG = new THREE.Group(); wheelG.position.set(sx * 0.42, -1.16, 0); pivot.add(wheelG);
    const tyreG = new THREE.TorusGeometry(0.27, 0.075, 12, 28); tyreG.rotateY(Math.PI / 2); add(wheelG, tyreG, tyre, 'tyre');
    const hub = add(wheelG, new THREE.CylinderGeometry(0.2, 0.2, 0.1, 20), metal, 'wheel hub'); hub.rotation.z = Math.PI / 2;
    const door = add(pivot, new THREE.PlaneGeometry(0.35, 0.95), camo, 'gear door'); door.position.set(sx * 0.29, -0.5, 0.08); door.rotation.set(0, Math.PI / 2, -sx * 0.38); door.material = sky.clone(); door.material.side = THREE.DoubleSide;
    gear.push({ pivot, wheel: wheelG, sx });
  }
  const tw = new THREE.Group(); tw.name = 'tail wheel'; tw.userData.part = true; tw.position.set(0, -0.2, -5.55); body.add(tw);
  const tleg = add(tw, new THREE.CylinderGeometry(0.02, 0.025, 0.2, 8), metal, 'tail wheel leg'); tleg.position.y = -0.08;
  const twh = new THREE.TorusGeometry(0.09, 0.035, 8, 18); twh.rotateY(Math.PI / 2); const twm = add(tw, twh, tyre, 'tail wheel tyre'); twm.position.y = -0.17;

  // ---------- ruch: śmigło, stery, klapy, podwozie, owiewka, płomienie wydechu ----------
  const st = { prop: 0, gear: 1, flap: 0, hood: 0, ail: 0, ele: 0, rud: 0 };
  const q = new THREE.Quaternion();
  function update(t, dt, o = {}) {
    dt = Math.min(dt, 0.05);
    const rpm = o.rpm ?? (o.throttle ?? 0) * 2850 + (o.engine === false ? 0 : 600);
    st.prop += rpm / 60 * Math.PI * 2 * dt / 2.0;   // przekładnia 0,477
    propG.rotation.z = -st.prop;
    const blur = Math.min(1, Math.max(0, (rpm - 600) / 1400)); disc.material.opacity = 0.32 * blur; for (const c of propG.children) if (c.name === 'propeller blade') c.visible = blur < 0.85;
    st.ail += ((o.aileron || 0) - st.ail) * Math.min(1, 12 * dt); st.ele += ((o.elevator || 0) - st.ele) * Math.min(1, 12 * dt); st.rud += ((o.rudder || 0) - st.rud) * Math.min(1, 12 * dt);
    for (const a of movers.aileron) { q.setFromAxisAngle(a.userData.axis, -a.userData.sx * st.ail * 0.35); a.quaternion.copy(q); }
    for (const e of movers.elevator) e.rotation.x = -st.ele * 0.4;
    for (const r of movers.rudder) r.rotation.y = st.rud * 0.45;
    st.flap += ((o.flaps ? 1 : 0) - st.flap) * Math.min(1, 1.2 * dt);
    for (const f of movers.flap) { q.setFromAxisAngle(f.userData.axis, (f.position.x > 0 ? 1 : -1) * st.flap * 1.4); f.quaternion.copy(q); }
    st.gear += ((o.gear === false ? 0 : 1) - st.gear) * Math.min(1, 0.7 * dt);
    for (const g of gear) g.pivot.rotation.z = g.sx * (1 - st.gear) * 1.62;   // chowanie na zewnątrz
    st.hood += ((o.work ? 1 : 0) - st.hood) * Math.min(1, 2 * dt); hood.position.z = -0.55 - 0.7 * st.hood;
    stick.rotation.set(-st.ele * 0.25, 0, st.ail * 0.25);
    exhaust.emissiveIntensity = o.lights || (o.throttle || 0) > 0.7 ? 0.6 + (o.throttle || 0) : 0;
    lightR.emissiveIntensity = lightG.emissiveIntensity = o.lights ? 2.5 : 0.2;
    tw.rotation.y = st.rud * 0.5;
    for (const g of gear) g.wheel.rotation.x += (o.speed || 0) / 0.34 * dt;
  }
  update(0, 0.016, { throttle: 0 });
  group.traverse((o) => { if (o.isMesh && o.geometry && !o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); });
  return {
    def: info, group, body, parts: { propeller: propG, gear: gear.map((g) => g.pivot), tailWheel: tw, hood, ...movers }, materials: { camo, sky },
    update, rig: { state: st },
    setPaint() {},
    dispose() { group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); },
  };
}
