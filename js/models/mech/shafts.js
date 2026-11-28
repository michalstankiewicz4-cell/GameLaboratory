// MechKit — wał (shaft), łożysko w oprawie (pillowBlock), sprzęgła (jawCoupling, flangeCoupling), przegub Cardana (yoke, cross).
import * as THREE from '../../../vendor/three/three.module.js';
import { ALU_RHO, boreHole, box, circlePath, cyl, DOMAIN, extrude, G_MAT, G_STEEL, IRON_RHO, materials, mesh, newPart, PHYS, port, RHO, ringX, ringY, STEEL_RHO, TAU, uvScale } from './base.js';

/* ---------------- wał, łożysko ---------------- */
export function shaft({ len = 1, r = 0.0125, mat = 'steel', key: keyway = true, name } = {}) {
  const M = materials(), g = newPart(name || `Wał Ø ${Math.round(r * 2000)} mm`);
  const s = mesh(uvScale(new THREE.CylinderGeometry(r, r, len - 0.004, 32, 1, true).rotateZ(-Math.PI / 2), 1), M[mat]); s.position.x = len / 2; g.userData.spin.add(s);   // bez denek — końce zamykają fazki
  // wpusty tylko tam, gdzie siedzą piasty (koła, sprzęgła, tarcze): key — true (cała długość), false albo [[x0, x1], …];
  // setKeys(odcinki) — przebudowa po złożeniu maszyny. Poza piastą wał jest gładki (łożysko obejmuje wał, nie wpust)
  const keys = new THREE.Group(); g.userData.spin.add(keys);
  const setKeys = (segs) => {
    keys.clear();
    for (const [x0, x1] of segs) { const a = Math.max(0.004, x0), b = Math.min(len - 0.004, x1); if (b - a < 0.004) continue; const k = mesh(box(b - a, 0.0018, r * 0.5), M.dark); k.position.set((a + b) / 2, r - 0.0006, 0); keys.add(k); }
  };
  setKeys(keyway === true ? [[len * 0.04, len * 0.96]] : Array.isArray(keyway) ? keyway : []);   // rowek wpustu — widać obrót
  for (const e of [0, len]) { const ch = mesh(cyl(r, 0.002, 32, r * 0.86), M[mat]); ch.position.x = e ? len - 0.001 : 0.001; if (!e) ch.rotation.y = Math.PI; g.userData.spin.add(ch); }   // fazka 0,14 r na końcach
  const mass = (RHO[mat] || STEEL_RHO) * Math.PI * r * r * len;
  Object.assign(g.userData, { setKeys, ports: { a: port('Koniec A', DOMAIN.rot, 'wał'), b: port('Koniec B', DOMAIN.rot, 'wał'), mid: port('Osadzenie (wpust)', DOMAIN.rot, 'wpust') }, phys: { ...PHYS.shaft, G: G_MAT[mat] || G_STEEL, k: (G_MAT[mat] || G_STEEL) * Math.PI * (2 * r) ** 4 / 32 / len }, len, r, mass, J: 0.5 * mass * r * r });
  return g;
}
// oprawa łożyska stojąca (UCP) na podstawie: oś na wysokości h nad podstawą
export function pillowBlock({ h = 0.12, r = 0.0125, name = 'Łożysko w oprawie stojącej UCP' } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name;
  const k = r / 0.0125, hc = 0.036 * k, base = h - hc, top = new THREE.Group(); top.scale.setScalar(k); top.position.y = base; g.add(top);
  const s = new THREE.Shape(); s.moveTo(-0.085, 0); s.lineTo(0.085, 0); s.lineTo(0.085, 0.019); s.lineTo(0.036, 0.019);
  s.absarc(0, 0.036, 0.038, -0.35, Math.PI + 0.35, false); s.lineTo(-0.036, 0.019); s.lineTo(-0.085, 0.019); s.closePath();   // łapy płaskie (powierzchnia pod podkładkę)   // kształt w skali 1 (oprawa skalowana k), oś na 0,036
  s.holes.push(circlePath(0.026, 40, 0, 0.036), circlePath(0.0065, 16, -0.064, 0.008), circlePath(0.0065, 16, 0.064, 0.008));
  // kształt (sx → z, sy → y), wyciągnięcie wzdłuż x (macierz o wyznaczniku +1)
  const SM = new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1);
  const hg = new THREE.ExtrudeGeometry(s, { depth: 0.036, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelOffset: -0.002, bevelSegments: 1, curveSegments: 24 });
  hg.translate(0, 0, -0.018).applyMatrix4(SM); uvScale(hg, 6);
  const hs = mesh(hg, M.paintGrey); top.add(hs);
  // wkładka łożyskowa UC (w skali 1, oprawa skalowana k): pierścień zewnętrzny w gnieździe, uszczelnienia, pierścień
  // wewnętrzny poszerzony z otworem na wał (r = 12,5 mm × k) i dwoma wkrętami — wał przechodzi przez otwór, nie przez bryłę
  for (const [ri, ro, w, mat, x] of [[0.019, 0.026, 0.017, M.steel, 0], [0.0155, 0.019, 0.0012, M.rubber, 0.0079], [0.0155, 0.019, 0.0012, M.rubber, -0.0079], [0.0125, 0.0155, 0.031, M.steel, 0]]) {
    const rg = mesh(ringX(ri, ro, w), mat); rg.position.set(x, 0.036, 0); top.add(rg);
  }
  for (const a of [Math.PI / 2, Math.PI / 2 + 2.1]) { const ss = mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.004, 8), M.dark); ss.position.set(0.0115, 0.036 + 0.0165 * Math.sin(a), 0.0165 * Math.cos(a)); ss.lookAt(new THREE.Vector3(0.0115, 0.036, 0)); ss.rotateX(Math.PI / 2); top.add(ss); }
  const nip = mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.012, 8), M.brass); nip.position.y = 0.036 + 0.044; top.add(nip);
  if (base > 0.12) {   // wysoka podpora: słupek z rury kwadratowej 60 × 60, blacha podstawy i blacha pod oprawą
    const post = mesh(box(0.06, base - 0.024, 0.06), M.paintGrey); post.position.y = base / 2; g.add(post);
    for (const [y, t] of [[0.006, 0.012], [base - 0.006, 0.012]]) { const pl = mesh(box(0.1, t, 0.2), M.iron); pl.position.y = y; g.add(pl); }
    for (const s of [-1, 1]) { const rib = mesh(box(0.006, 0.08, 0.07), M.paintGrey); rib.position.set(0, 0.052, s * 0.065); g.add(rib); }
  } else if (base > 0.002) { const ped = mesh(box(0.05, base, 0.19), M.iron); ped.position.y = base / 2; g.add(ped); }
  // miejsca śrub mocujących (oś +y, płaszczyzna pod podkładką): wysoka podpora — płyta podstawy, niska — łapy oprawy
  // set: 'housing' — oprawa do podłoża / słupka (łapy), 'base' — słupek do łoża (płyta podstawy); część jest luźna, gdy
  // odkręcone są wszystkie śruby jednego zestawu (łeb śruby dawniej rysowany w modelu — teraz prawdziwa śruba MechKit.bolt)
  const feet = [-1, 1].map((sz) => ({ p: new THREE.Vector3(0, base + 0.019 * k, sz * 0.064 * k), d: k >= 1.3 ? 0.012 : 0.01, set: 'housing' }));   // otwór Ø 13 — M10 (UCP204), większe oprawy M12
  const mounts = base > 0.12 ? [...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ p: new THREE.Vector3(sx * 0.035, 0.012, sz * 0.08), d: 0.01, set: 'base' }))), ...feet] : feet;
  g.userData = { mounts, phys: { ...PHYS.bearing }, ports: { bore: port('Gniazdo wału', DOMAIN.rot, 'łożysko') }, h, r, k, mass: 0.8 * k * k * k + (base > 0 ? IRON_RHO * 0.05 * 0.19 * base * 0.4 : 0) };
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
  const ports = { a: port('Piasta A', DOMAIN.rot, 'wał'), b: port('Piasta B', DOMAIN.rot, 'wał') };
  return { a: mk(-1), b: mk(1), spider, phys, ports, mass, J: 0.5 * mass * r * r };
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
  return { a: mk(-1), b: mk(1), bolts, phys: { ...PHYS.flange }, ports: { a: port('Piasta A', DOMAIN.rot, 'wał'), b: port('Piasta B', DOMAIN.rot, 'wał') }, mass, J: 0.5 * mass * r * r * 0.8 };
}
// widełki przegubu Cardana na końcu wału: piasta wzdłuż +x i dwa ramiona z oczkami; sworznie wzdłuż lokalnego y (oś krzyżaka)
export function yoke({ r = 0.026, reach = 0.07, name = 'Widełki przegubu' } = {}) {   // reach 70 mm: piasta i mostek za oczkami drugich widełek do ok. 45° (kontrola kolizji)
  const M = materials(), g = new THREE.Group(); g.name = name;
  const hub = mesh(cyl(0.019, 0.03, 24), M.gear); hub.position.x = -reach + 0.015; g.add(hub);
  const bridge = mesh(box(0.012, r * 2 + 0.014, 0.03), M.gear); bridge.position.x = -reach + 0.03; g.add(bridge);
  for (const s of [-1, 1]) {
    // ramię węższe od mostka, oczko wyższe od ramienia — bez wspólnych płaszczyzn
    const ax0 = -(reach - 0.018), ax1 = -0.0138;   // ramię od mostka do zewnętrznej ścianki oczka (nie wchodzi w otwór kubka)
    const arm = mesh(box(ax1 - ax0, 0.0087, 0.028), M.gear); arm.position.set((ax0 + ax1) / 2, s * (r + 0.0025), 0); g.add(arm);
    const eye = mesh(ringY(0.0085, 0.0145, 0.0126, 24), M.gear); eye.position.set(0, s * (r + 0.0041), 0); g.add(eye);   // oczko z otworem na kubek łożyska igiełkowego krzyżaka
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
  g.userData.ports = { a: port('Czopy widełek A', DOMAIN.rot, 'przegub'), b: port('Czopy widełek B', DOMAIN.rot, 'przegub') };
  g.userData.phys = { ...PHYS.ujoint };
  return g;
}
