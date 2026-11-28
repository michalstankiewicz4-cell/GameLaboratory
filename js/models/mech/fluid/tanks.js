// FluidKit — zbiorniki:
//   reservoir   — zbiornik zasilacza hydraulicznego (blacha stalowa malowana RAL 7035, pokrywa przykręcana, korek wlewowy
//                 z filtrem oddechowym, wskaźnik poziomu z termometrem, korek spustowy, łapy). Spód w y = 0, środek w x, z.
//                 userData.top — wysokość górnej powierzchni pokrywy. setLevel(0…1) — poziom w okienku.
//   waterTank   — zbiornik z akrylu na ramie aluminiowej z wodą (setLevel) — fontanna; spód w y = 0.
//   accumulator — akumulator pęcherzowy: butla kuta, zawór gazowy z kołpakiem, przyłącze olejowe u dołu, obejma. Spód y = 0.
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port, canvasTex, decal, plastic } from '../common.js';
import { latheY, hexY, tubeSolid, fluidMaterials } from './util.js';

export function reservoir({ L = 0.48, W = 0.24, H = 0.18, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), lid = 0.008, feet = 0.03;
  const V = (L - 0.006) * (W - 0.006) * (H - lid - feet) * 0.85;
  g.name = name || `${EN ? 'Hydraulic reservoir' : 'Zbiornik hydrauliczny'} ${Math.round(V * 1000)} l`;
  const box = mesh(new THREE.BoxGeometry(L, H - lid - feet, W), F.tankPaint); box.position.y = feet + (H - lid - feet) / 2; g.add(box);
  const top = mesh(new THREE.BoxGeometry(L + 0.02, lid, W + 0.02), F.tankPaint); top.position.y = H - lid / 2; g.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const f = mesh(new THREE.BoxGeometry(0.04, feet, 0.04), F.tankPaint); f.position.set(sx * (L / 2 - 0.03), feet / 2, sz * (W / 2 - 0.03)); g.add(f); }
  // śruby pokrywy po obwodzie
  const nb = [];
  for (let i = 0; i < 6; i++) for (const sz of [-1, 1]) nb.push([-L / 2 + 0.02 + i * (L - 0.04) / 5, sz * (W / 2 + 0.004)]);
  for (const [x, z] of nb) { const b = mesh(hexY(0.008, 0.004), F.zinc); b.position.set(x, H + 0.002, z); g.add(b); }
  // korek wlewowy z filtrem oddechowym (tył, prawy róg)
  const fil = new THREE.Group(); fil.position.set(L / 2 - 0.05, H, -W / 2 + 0.05); g.add(fil);
  const fb = mesh(latheY([[0, 0], [0.022, 0], [0.022, 0.004], [0.018, 0.006], [0.018, 0.028], [0.021, 0.03], [0.021, 0.04], [0.016, 0.044], [0, 0.044]], 36), F.chrome); fil.add(fb);
  // wskaźnik poziomu i temperatury (przód): rama, szyba, olej
  const lg = new THREE.Group(); lg.position.set(-L / 2 + 0.06, feet + (H - lid - feet) / 2, W / 2); g.add(lg);
  const fr = mesh(new THREE.BoxGeometry(0.022, 0.1, 0.008), F.alu); fr.position.z = 0.004; lg.add(fr);
  const glass = mesh(new THREE.BoxGeometry(0.012, 0.08, 0.002), F.glass); glass.position.z = 0.0085; glass.userData.doctorOk = 'clash'; lg.add(glass);
  const oil = mesh(new THREE.BoxGeometry(0.01, 0.06, 0.001), F.oil); oil.position.set(0, -0.01, 0.0081); lg.add(oil);
  for (const y of [-0.045, 0.045]) { const s = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.006, 6).rotateX(Math.PI / 2), F.zinc); s.position.set(0, y, 0.011); lg.add(s); }
  const sc = canvasTex(64, 256, (c, w, h) => { c.fillStyle = '#e8e6de'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 16px sans-serif'; c.fillText('MAX', 8, 30); c.fillText('MIN', 8, 228); c.fillRect(44, 20, 14, 3); c.fillRect(44, 230, 14, 3); c.fillText('°C', 14, 130); });
  const scale = mesh(new THREE.PlaneGeometry(0.014, 0.06), decal(sc.t)); scale.position.set(0.02, 0, 0.0003); lg.add(scale);
  const drain = mesh(hexY(0.019, 0.008).rotateX(Math.PI / 2), F.zinc); drain.position.set(L / 2 - 0.04, feet + 0.012, W / 2 + 0.004); g.add(drain);
  const nameT = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#e1e3e0'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 26px sans-serif'; c.fillText(`HLP 46 · ${Math.round(V * 1000)} l`, 12, 38); c.font = '18px sans-serif'; c.fillText(EN ? 'Power unit · p max 160 bar' : 'Zasilacz · p maks. 160 bar', 12, 68); c.fillText('ISO 4406 18/16/13', 12, 90); });
  const np = mesh(new THREE.PlaneGeometry(0.09, 0.034), decal(nameT.t)); np.position.set(0.06, feet + (H - lid - feet) / 2, W / 2 + 0.0003); g.add(np);
  const setLevel = (u) => { const hh = 0.075 * Math.max(0.02, Math.min(1, u)); oil.scale.y = hh / 0.06; oil.position.y = -0.04 + hh / 2; };
  setLevel(0.8);
  g.userData = { L, W, H, V, top: H, filler: fil.position.clone(), setLevel, mass: 9 + L * W * 40,
    ports: { suction: port(EN ? 'Suction (in the lid)' : 'Ssanie (w pokrywie)', DOMAIN.fluid, 'rura'), ret: port(EN ? 'Return T (in the lid)' : 'Powrót T (w pokrywie)', DOMAIN.fluid, 'rura'), drain: port(EN ? 'Drain plug G 1/2' : 'Korek spustowy G 1/2', DOMAIN.fluid, 'gwint') } };
  return g;
}

export function waterTank({ L = 0.32, W = 0.22, H = 0.2, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), t = 0.006, fp = 0.012;
  g.name = name || `${EN ? 'Water tank' : 'Zbiornik wody'} ${Math.round(L * W * H * 1000)} l`;
  const base = mesh(new THREE.BoxGeometry(L, t, W), F.acrylic); base.position.y = t / 2; g.add(base);
  for (const [sx, sz, lx, lz] of [[0, 1, L, t], [0, -1, L, t], [1, 0, t, W - 2 * t], [-1, 0, t, W - 2 * t]]) { const w = mesh(new THREE.BoxGeometry(lx, H - t, lz), F.acrylic); w.position.set(sx * (L / 2 - t / 2), t + (H - t) / 2, sz * (W / 2 - t / 2)); g.add(w); }
  // rama: profile 12 × 12 na pionowych krawędziach i górny obwód
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(fp, H, fp), F.alu); p.position.set(sx * (L / 2 + fp / 2), H / 2, sz * (W / 2 + fp / 2)); p.userData.doctorOk = 'floating'; g.add(p); }
  for (const sz of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(L, fp, fp), F.alu); p.position.set(0, H - fp / 2, sz * (W / 2 + fp / 2)); p.userData.doctorOk = 'floating'; g.add(p); }
  for (const sx of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(fp, fp, W), F.alu); p.position.set(sx * (L / 2 + fp / 2), H - fp / 2, 0); p.userData.doctorOk = 'floating'; g.add(p); }
  const water = mesh(new THREE.BoxGeometry(L - 2 * t - 0.001, 1, W - 2 * t - 0.001), F.water, false); water.userData.doctorOk = 'clash'; g.add(water);
  const setLevel = (u) => { const hh = Math.max(0.005, (H - t) * Math.min(0.95, u)); water.scale.y = hh; water.position.y = t + hh / 2; };
  setLevel(0.6);
  g.userData = { L, W, H, inner: [L - 2 * t, W - 2 * t], setLevel, mass: 3.2, ports: { out: port(EN ? 'Outlet (bottom)' : 'Wylot (dno)', DOMAIN.fluid, 'gwint') } };
  return g;
}

export function accumulator({ V0 = 0.7e-3, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), k = Math.cbrt(V0 / 0.7e-3), r = 0.045 * k, h = 0.17 * k;
  g.name = name || `${EN ? 'Bladder accumulator' : 'Akumulator pęcherzowy'} ${(V0 * 1000).toFixed(1).replace('.', EN ? '.' : ',')} l`;
  const bottle = mesh(latheY([[0, 0.012], [0.012, 0.012], [r * 0.6, 0.02], [r, 0.02 + r * 0.6], [r, 0.02 + h - r * 0.6], [r * 0.6, 0.02 + h], [0.012, 0.02 + h + 0.006], [0, 0.02 + h + 0.006]], 48), F.paintRed); g.add(bottle);
  const port0 = mesh(hexY(0.03 * k + 0.008, 0.012), F.steel); port0.position.y = 0.006; g.add(port0);
  const valve = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.016, 20), F.brass); valve.position.y = 0.02 + h + 0.014; g.add(valve);
  const cap = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.012, 20), plastic(0x1d1d1f, 0.5)); cap.position.y = 0.02 + h + 0.028; g.add(cap);
  const lt = canvasTex(256, 96, (c, w, h2) => { c.fillStyle = '#efe9da'; c.fillRect(0, 0, w, h2); c.fillStyle = '#111'; c.font = 'bold 24px sans-serif'; c.fillText(`${(V0 * 1000).toFixed(1)} l · p0 40 bar N₂`, 10, 34); c.font = '18px sans-serif'; c.fillText(EN ? 'nitrogen only · max 250 bar' : 'tylko azot · maks. 250 bar', 10, 66); });
  const lab = mesh(new THREE.CylinderGeometry(r + 0.0004, r + 0.0004, h * 0.32, 48, 1, true, -0.6, 1.2), decal(lt.t)); lab.position.y = 0.02 + h * 0.55; g.add(lab);
  g.userData = { V0, mass: 2.4 * k ** 3 + 1, ports: { oil: port(EN ? 'Oil port (bottom)' : 'Przyłącze olejowe (dół)', DOMAIN.fluid, 'gwint'), gas: port(EN ? 'Gas valve (N₂)' : 'Zawór gazowy (N₂)', DOMAIN.fluid, 'zawór') } };
  return g;
}

// wskaźnik poziomu z pływakiem: pręt prowadzący (nierdzewny) z listwą podziałki, kula pływaka (PP, pomarańczowa) przesuwa się
// po pręcie, uchwyt zawieszony na krawędzi zbiornika. Początek: spód pręta (dno zbiornika), pręt wzdłuż +y, uchwyt w −x.
// H — wysokość od dna do krawędzi, reach — wysięg uchwytu za krawędź. setLevel(h [m od dna]) — kula pływa na powierzchni.
export function floatGauge({ H = 0.194, R = 0.014, reach = 0.045, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(); g.name = name || (EN ? 'Float level gauge' : 'Wskaźnik poziomu z pływakiem');
  const rod = mesh(new THREE.CylinderGeometry(0.0025, 0.0025, H + 0.012, 12), F.stainless); rod.position.y = 0.002 + (H + 0.012) / 2; g.add(rod);
  const foot = mesh(new THREE.CylinderGeometry(0.006, 0.007, 0.004, 16), F.stainless); foot.position.y = 0.0022; g.add(foot);   // 0,2 mm nad dnem (bez wspólnej płaszczyzny)
  const arm = mesh(new THREE.BoxGeometry(reach + 0.006, 0.004, 0.012), F.stainless); arm.position.set(-reach / 2 + 0.003, H + 0.014 + 0.002, 0); g.add(arm);
  // listwa z podziałką co 10 mm (procenty wysokości), za prętem
  const sc = canvasTex(64, 512, (c, w, h) => { c.fillStyle = '#f4f2ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 18px sans-serif'; for (let i = 0; i <= 20; i++) { const y = h - 8 - i * (h - 16) / 20; c.fillRect(0, y, i % 2 ? 14 : 26, 3); if (i % 4 === 0) c.fillText(String(i * 5), 30, y + 7); } });
  const strip = mesh(new THREE.BoxGeometry(0.012, H - 0.01, 0.0015), [F.stainless, F.stainless, F.stainless, F.stainless, new THREE.MeshStandardMaterial({ map: sc.t, roughness: 0.5 }), F.stainless]); strip.position.set(0, 0.005 + (H - 0.01) / 2, -0.0045); g.add(strip);
  // pływak: kula z otworem na pręt (prowadzenie), pomarańczowa z czerwonym pasem
  const ball = new THREE.Group(); g.add(ball);
  const bm = mesh(new THREE.SphereGeometry(R, 28, 20), new THREE.MeshPhysicalMaterial({ color: 0xff7a1a, roughness: 0.35, metalness: 0, clearcoat: 0.6 })); bm.userData.doctorOk = 'clash'; ball.add(bm);
  const belt = mesh(new THREE.TorusGeometry(R * 0.995, 0.0012, 8, 32).rotateX(Math.PI / 2), plastic(0xc01818, 0.4)); ball.add(belt);
  const V = 4 / 3 * Math.PI * R ** 3, m = 0.4 * V * 998;   // PP z pustką: zanurzona ok. 40 % objętości
  const setLevel = (h) => { const sub = 0.4, yc = Math.max(R + 0.006, Math.min(H - R, h + R * (1 - 2 * sub) + R * 0)); ball.position.y = yc; ball.userData.h = h; };
  setLevel(H * 0.6);
  g.userData = { H, R, V, m, setLevel, mass: 0.12 + m, ports: { level: port(EN ? 'Level (float)' : 'Poziom (pływak)', DOMAIN.fluid, 'pływak') } };
  return g;
}

// wiadro ocynkowane 10 l (stożek z blachy, zawijany rant, kabłąk z drewnianym uchwytem) albo z tworzywa; woda w środku
// z poziomem setLevel(0…1) — powierzchnia faluje (LiquidKit). Spód w y = 0.
export function bucket({ V = 0.01, mat = 'zinc', handleUp = true, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), k = Math.cbrt(V / 0.01), H = 0.24 * k, r1 = 0.11 * k, r0 = 0.085 * k, t = 0.0015;
  g.name = name || `${EN ? 'Bucket' : 'Wiadro'} ${Math.round(V * 1000)} l`;
  const body = mat === 'plastic' ? new THREE.MeshPhysicalMaterial({ color: 0x2c63b8, roughness: 0.45, metalness: 0, clearcoat: 0.3 }) : new THREE.MeshPhysicalMaterial({ color: 0xc9ced3, metalness: 1, roughness: 0.38, clearcoat: 0.15 });
  // ścianka: obrys zamknięty (zewnątrz → rant → wewnątrz → dno)
  const shell = mesh(latheY([[0, 0], [r0, 0], [r0 + 0.002, 0.004], [r1, H], [r1 - t, H], [r0 - t + 0.002, 0.004 + t], [0, 0.004 + t]], 56), body); g.add(shell);
  const rim = mesh(new THREE.TorusGeometry(r1 + 0.001, 0.003, 10, 56).rotateX(Math.PI / 2), body); rim.position.y = H; g.add(rim);
  for (let i = 1; i <= 2; i++) { const y = H * i / 3, rr = r0 + (r1 - r0) * y / H; const rib = mesh(new THREE.TorusGeometry(rr + 0.0005, 0.0015, 8, 56).rotateX(Math.PI / 2), body); rib.position.y = y; g.add(rib); }   // przetłoczenia usztywniające
  // uszy i kabłąk (drut Ø4) z uchwytem
  for (const s of [-1, 1]) { const ear = mesh(new THREE.BoxGeometry(0.004, 0.03, 0.022), body); ear.position.set(s * (r1 - 0.004), H - 0.022, 0); g.add(ear); }
  const hg = new THREE.Group(); hg.position.y = H - 0.018; g.add(hg);   // kabłąk obraca się w uszach (oś x)
  const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; pts.push(new THREE.Vector3(-Math.cos(a) * (r1 + 0.004), Math.sin(a) * r1 * 0.9, 0)); }
  hg.add(tubeSolid(new THREE.CatmullRomCurve3(pts), 0.002, F.zinc, { seg: 48, radial: 8 }));
  const grip = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.09, 16).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: 0.7 })); grip.position.set(0, r1 * 0.9, 0); grip.userData.doctorOk = 'clash'; hg.add(grip);
  if (!handleUp) hg.rotation.x = -1.42;   // kabłąk opuszczony na bok wiadra
  // woda: ścięty stożek od dna do poziomu
  const water = mesh(new THREE.CylinderGeometry(1, 1, 1, 48), F.water, false); water.userData.doctorOk = 'clash'; g.add(water);
  const yb = 0.004 + t, setLevel = (u) => { u = Math.max(0, Math.min(1, u)); const h = (H - yb - 0.01) * u; water.visible = h > 0.001; const rb = r0 - t - 0.001, rt = rb + (r1 - r0) * h / H; water.geometry.dispose(); water.geometry = new THREE.CylinderGeometry(rt, rb, Math.max(h, 0.001), 48); water.position.y = yb + h / 2; };
  setLevel(0);
  const vol = (u) => { const h = (H - yb - 0.01) * u, rb = r0 - t, rt = rb + (r1 - r0) * h / H; return Math.PI * h / 3 * (rb * rb + rb * rt + rt * rt); };
  g.userData = { V, H, r0, r1, setLevel, vol, Vfull: vol(1), mass: mat === 'plastic' ? 0.45 * k ** 2 : 1.1 * k ** 2, ports: { top: port(EN ? 'Open top' : 'Otwór (góra)', DOMAIN.fluid, 'otwarte') } };
  return g;
}
