// Ogrodzenie wysypiska: siatka plecionka (oczko 5 cm) 2,4 m na słupkach ocynkowanych co 3,5 m, rura górna,
// wysięgniki z 3 drutami kolczastymi, brama dwuskrzydłowa (zamknięta, z kłódką i tablicą) od strony +z.
// Nie da się przez nie wyjść (zderzacze 4 m wysokości). Rozmiar placu: FENCE.size (środek w (0,0,0)).
import * as THREE from '../../../vendor/three/three.module.js';
import { merge, part, place, uvMeters } from '../geom.js';
import { mat } from '../materials.js';

export const FENCE = { size: [80, 80], height: 2.4, step: 3.5, gate: { x: 0, width: 6 } };
const cyl = (r, h, x, y, z, s = 10, rx = 0, rz = 0) => { const g = new THREE.CylinderGeometry(r, r, h, s); return place(g, [x, y, z], [rx, 0, rz]); };
const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d); uvMeters(g, 1); return place(g, [x, y, z], [rx, ry, rz]); };

/** Odcinki ogrodzenia: [x0, z0, x1, z1] dla 4 boków (z przerwą na bramę w boku +z). */
function runs() {
  const [W, D] = FENCE.size, hw = W / 2, hd = D / 2, g = FENCE.gate;
  return [[-hw, -hd, hw, -hd], [hw, -hd, hw, hd], [-hw, hd, -hw, -hd], [hw, hd, g.x + g.width / 2, hd], [g.x - g.width / 2, hd, -hw, hd]];
}

function build_(lod) {
  const posts = [], rails = [], mesh = [], wire = [], H = FENCE.height;
  for (const [x0, z0, x1, z1] of runs()) {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / FENCE.step)), ang = Math.atan2(x1 - x0, z1 - z0);
    // normalna na zewnątrz placu (drut kolczasty pochylony na zewnątrz)
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, nl = Math.hypot(mx, mz), ox = mx / nl, oz = mz / nl;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      posts.push(cyl(0.03, H + 0.05, x, (H + 0.05) / 2, z, lod ? 6 : 12));
      posts.push(cyl(0.012, 0.5, x + ox * 0.17, H + 0.2, z + oz * 0.17, 6, Math.atan2(oz, 1) * 0 + (oz ? -Math.sign(oz) * 0.75 : 0), ox ? Math.sign(ox) * 0.75 : 0));
      posts.push(cyl(0.04, 0.4, x, -0.15, z, 8));   // stopa w betonie (pod gruntem)
    }
    // rura górna i dolny drut napinający
    const rail = new THREE.CylinderGeometry(0.02, 0.02, L, lod ? 6 : 10); rail.rotateX(Math.PI / 2); rail.rotateY(ang); rail.translate(mx, H, mz); rails.push(rail);
    // siatka: pas (płaszczyzna dwustronna z teksturą przezroczystą); UV w metrach
    const p = new THREE.PlaneGeometry(L, H - 0.05); uvMeters(p, 1); p.rotateY(ang + Math.PI / 2); p.translate(mx, (H - 0.05) / 2 + 0.03, mz);
    // uvMeters liczy przed obrotem: UV = (x, y) w metrach płaszczyzny — dobre
    mesh.push(p);
    // druty kolczaste (3 nitki)
    for (let k = 0; k < 3; k++) {
      const w = new THREE.CylinderGeometry(0.0025, 0.0025, L, 4); w.rotateX(Math.PI / 2); w.rotateY(ang);
      w.translate(mx + ox * (0.09 + k * 0.1), H + 0.1 + k * 0.1, mz + oz * (0.09 + k * 0.1)); wire.push(w);
    }
  }
  return { posts: merge(posts), rails: merge(rails), mesh: merge(mesh), wire: merge(wire) };
}

function gate(lod) {
  const g = FENCE.gate, z = FENCE.size[1] / 2, H = FENCE.height, frame = [], mesh = [], o = [];
  for (const s of [-1, 1]) {
    o.push(cyl(0.06, H + 0.3, g.x + s * (g.width / 2 + 0.03), (H + 0.3) / 2, z, 14));          // słupy bramy
    const x0 = g.x + s * 0.02, x1 = g.x + s * (g.width / 2 - 0.04), cx = (x0 + x1) / 2, w = Math.abs(x1 - x0);
    frame.push(box(w, 0.05, 0.05, cx, 0.12, z), box(w, 0.05, 0.05, cx, H - 0.05, z), box(0.05, H - 0.1, 0.05, x0, H / 2 + 0.03, z), box(0.05, H - 0.1, 0.05, x1, H / 2 + 0.03, z));
    frame.push(box(Math.hypot(w, H - 0.2), 0.04, 0.04, cx, H / 2 + 0.03, z, 0, 0, s * Math.atan2(H - 0.2, w)));   // zastrzał
    const p = new THREE.PlaneGeometry(w - 0.05, H - 0.2); uvMeters(p, 1); p.translate(cx, H / 2 + 0.03, z + 0.01); mesh.push(p);
    for (const y of [0.5, H - 0.5]) frame.push(cyl(0.025, 0.12, x1 + s * 0.06, y, z, 8, 0, Math.PI / 2));   // zawiasy
  }
  frame.push(box(0.12, 0.2, 0.06, g.x, 1.1, z + 0.05));   // zamek z kłódką
  const sign = place(new THREE.BoxGeometry(1.4, 0.7, 0.02), [g.x - 1.3, 1.5, z + 0.05]);
  return { posts: merge(o), frame: merge(frame), mesh: merge(mesh), sign };
}

export function build(lod = 0) {
  const r = build_(lod), gt = gate(lod), G = new THREE.Group(); G.name = 'fence';
  G.add(part('słupki', merge([r.posts, gt.posts]), mat('galvanized')), part('rura górna', r.rails, mat('galvanized')));
  const net = part('siatka', merge([r.mesh, gt.mesh]), mat('chainLink')); net.userData.doctorOk = true; net.castShadow = true; G.add(net);
  G.add(part('drut kolczasty', r.wire, mat('steelDark')), part('brama', gt.frame, mat('galvanized')), part('tablica', gt.sign, mat('signYard')));
  return G;
}

/** Zderzacze: 4 ściany 4 m (brama zamknięta). */
export function colliders() {
  const [W, D] = FENCE.size, h = 4;
  return [
    { kind: 'box', half: [W / 2 + 0.5, h / 2, 0.25], at: [0, h / 2, -D / 2 - 0.2] },
    { kind: 'box', half: [W / 2 + 0.5, h / 2, 0.25], at: [0, h / 2, D / 2 + 0.2] },
    { kind: 'box', half: [0.25, h / 2, D / 2 + 0.5], at: [-W / 2 - 0.2, h / 2, 0] },
    { kind: 'box', half: [0.25, h / 2, D / 2 + 0.5], at: [W / 2 + 0.2, h / 2, 0] },
  ];
}
export const info = { id: 'fence', name: 'Ogrodzenie z bramą', version: '1.0.1' };
