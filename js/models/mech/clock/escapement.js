// ClockKit — wychwyt Grahama: koło wychwytowe, kotwica z paletami z rubinu (obrys = fizyka), wahadło z soczewką.
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { escapementGeometry, palletOutline } from '../../../behaviors/land/mech/escapement.js';
import { TAU, EN, mesh, port, circle, slab, cylZ, materials } from '../common.js';

/* ---------------- wychwyt Grahama ---------------- */
// koło wychwytowe: zęby ostre pochylone do przodu (obrót zgodny z zegarem), ząb 0 — wierzchołek przy kącie π/2 (w górę),
// jak w fizyce: tip(k, θ) = θ + k·p + π/2
export function escapeWheel(G = escapementGeometry(), { t = 0.0015, name } = {}) {
  const M = materials(), z = G.z, p = G.p, Re = G.Re, h = 0.62 * Re * p, Rr = Re - h, pts = [];
  for (let k = 0; k < z; k++) {
    const a = Math.PI / 2 + k * p;
    pts.push(new THREE.Vector2(Rr * Math.cos(a + 0.12 * p), Rr * Math.sin(a + 0.12 * p)));   // stopa czoła (czoło podcięte — wierzchołek wysunięty)
    pts.push(new THREE.Vector2(Re * Math.cos(a), Re * Math.sin(a)));                         // wierzchołek
    for (let i = 1; i <= 4; i++) { const f = i / 4, r = Re - h * Math.pow(f, 0.7), aa = a + f * 0.5 * p; pts.push(new THREE.Vector2(r * Math.cos(aa), r * Math.sin(aa))); }   // grzbiet wygięty
    for (let i = 1; i <= 3; i++) { const aa = a + 0.5 * p + i / 4 * 0.62 * p; pts.push(new THREE.Vector2(Rr * Math.cos(aa), Rr * Math.sin(aa))); }
  }
  const shape = new THREE.Shape(pts), rim = Rr - 0.0022, hubR = 0.004, arms = 4;
  shape.holes.push(circle(0.0006, 16));
  for (let k = 0; k < arms; k++) {
    const a0 = k * TAU / arms + 0.17, a1 = (k + 1) * TAU / arms - 0.17, path = new THREE.Path();
    path.moveTo(rim * Math.cos(a0), rim * Math.sin(a0)); path.absarc(0, 0, rim, a0, a1, false);
    path.lineTo(hubR * Math.cos(a1 - 0.25), hubR * Math.sin(a1 - 0.25)); path.absarc(0, 0, hubR, a1 - 0.25, a0 + 0.25, true); path.closePath(); shape.holes.push(path);
  }
  const g = new THREE.Group(); g.name = name || (EN ? 'Escape wheel' : 'Koło wychwytowe');
  g.add(mesh(slab(shape, t, -t / 2, 0.0001, 8), M.brassP), mesh(cylZ(0.0032, t * 2.4, 24), M.brassP));
  const r2 = Math.PI * Re * Re * t * 8500 * 0.5;
  g.userData = { z, Re, t, mass: r2, J: 0.5 * r2 * Re * Re * 0.8, ports: { pallet: port('Zęby — palety kotwicy', DOMAIN.rot, 'wychwyt'), bore: port('Otwór (oś)', DOMAIN.rot, 'wał') } };
  return g;
}
// kotwica: piasta na osi A (początek układu), dwa ramiona do palet; palety z rubinu osadzone w ramionach (obrys palet = fizyka)
export function anchor(G = escapementGeometry(), { t = 0.0022, name } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name || (EN ? 'Graham anchor (ruby pallets)' : 'Kotwica Grahama (palety z rubinu)');
  for (const side of ['left', 'right']) {
    const pts = palletOutline(G, side, 14).map(([x, y]) => new THREE.Vector2(x, y));
    g.add(mesh(slab(new THREE.Shape(pts), t * 0.9, -t * 0.45, 0.00005, 8), M.ruby));
    // ramię: od piasty do grzbietu palety (wspornik obejmujący paletę od strony przeciwnej do wierzchołka)
    const P = G[side], back = P.back, rOut = side === 'left' ? G.ro : G.ri;
    const rMid = (G.ri + G.ro) / 2, ax = rMid * Math.cos(back), ay = rMid * Math.sin(back);
    const dir = side === 'left' ? -1 : 1, aB = back + dir * 0.06, bw = G.ro - G.ri + 0.0016;
    const sh = new THREE.Shape();
    const nx = Math.cos(back), ny = Math.sin(back), tx = -ny, ty = nx;
    const rh = 0.0036, ca = back - dir * 0.05;   // nasada ramienia na piaście (ramiona się nie nakładają)
    sh.moveTo(rh * Math.cos(ca - 0.55), rh * Math.sin(ca - 0.55));
    sh.lineTo(rh * Math.cos(ca + 0.55), rh * Math.sin(ca + 0.55));
    sh.lineTo(ax + nx * bw / 2 + tx * dir * 0.0004, ay + ny * bw / 2 + ty * dir * 0.0004);
    sh.lineTo((G.ro + 0.0008) * Math.cos(aB), (G.ro + 0.0008) * Math.sin(aB));
    sh.lineTo((G.ri - 0.0008) * Math.cos(aB), (G.ri - 0.0008) * Math.sin(aB));
    sh.lineTo(ax - nx * bw / 2 + tx * dir * 0.0004, ay - ny * bw / 2 + ty * dir * 0.0004);
    sh.closePath();
    g.add(mesh(slab(sh, t, -t / 2, 0.0001, 8), M.steelP));
    void rOut;
  }
  g.add(mesh(cylZ(0.0042, t * 1.6, 32), M.steelP));   // piasta kotwicy
  g.userData = { ports: { pallets: port('Palety (rubin) — zęby koła', DOMAIN.rot, 'wychwyt'), crutch: port('Widełki — wahadło', DOMAIN.rot, 'wahadło') } };
  return g;
}
// wahadło: sprężyna zawieszenia, pręt (inwar), soczewka z mosiądzu, nakrętka regulacyjna; oś obrotu w początku układu,
// wisi w −y; L — odległość od osi do środka soczewki
export function pendulum({ L = 0.994, bobR = 0.075, bobT = 0.038, mass = 1.5, name } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name || (EN ? 'Seconds pendulum' : 'Wahadło sekundowe');
  const rod = mesh(new THREE.CylinderGeometry(0.003, 0.003, L + 0.06, 16), M.steelP); rod.position.y = -(L + 0.06) / 2 + 0.01; g.add(rod);
  // soczewka: bryła obrotowa (dwie czasze) — oś obrotu wzdłuż z
  const prof = []; for (let i = 0; i <= 24; i++) { const r = bobR * i / 24; prof.push(new THREE.Vector2(r, (bobT / 2) * Math.sqrt(Math.max(0, 1 - (r / bobR) ** 2)))); }
  const half = new THREE.LatheGeometry(prof.reverse(), 64);
  const b1 = mesh(half.clone().rotateX(Math.PI / 2), M.brassP), b2 = mesh(half.clone().rotateX(-Math.PI / 2), M.brassP);
  const bob = new THREE.Group(); bob.add(b1, b2); bob.position.y = -L; g.add(bob);
  const nut = mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.01, 6), M.brassF); nut.position.y = -L - bobR - 0.008; g.add(nut);
  const tipP = mesh(new THREE.ConeGeometry(0.0025, 0.03, 12).rotateX(Math.PI), M.blued); tipP.position.y = -L - bobR - 0.032; g.add(tipP);   // wskaźnik nad skalą amplitudy
  const susp = mesh(new THREE.BoxGeometry(0.008, 0.012, 0.0003), M.spring); susp.position.y = 0.004; g.add(susp);   // sprężyna zawieszenia
  const chop = mesh(new THREE.BoxGeometry(0.012, 0.006, 0.006), M.brassF); chop.position.y = -0.005; g.add(chop);
  const mr = 0.25 * (L + 0.06) * Math.PI * 0.003 ** 2 * 8000 * 4;
  g.userData = { L, mass, rodMass: Math.PI * 0.003 ** 2 * (L + 0.06) * 8100, ports: { crutch: port('Widełki kotwicy', DOMAIN.rot, 'wahadło'), susp: port('Zawieszenie (sprężyna)', DOMAIN.rot, 'mocowanie') } };
  void mr;
  return g;
}
