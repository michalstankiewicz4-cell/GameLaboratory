// StreetKit — przejście podziemne dla pieszych (buildSubway).
import * as THREE from '../../../vendor/three/three.module.js';
import { canvasTex, inst, kitMat } from './geom.js';
import { steel } from './signals.js';
import { surface } from './surfaces.js';

/* ---------------- przejście podziemne dla pieszych ---------------- */
// Przejście pod ulicą (lokalnie: korytarz wzdłuż z, środek pod osią ulicy wzdłuż x, teren y = 0): korytarz
// szerokości `width` (domyślnie 4 m) i wysokości 2,6 m w świetle, posadzka na głębokości `depth`, strop pod jezdnią,
// ściany wyłożone jasnymi płytkami, oprawy w stropie co 3 m; na obu końcach odkryta klatka schodowa (dwa biegi
// po 15 × 30 cm i spocznik), mury z attyką 1,1 m nad terenem, pochwyty. holes — prostokąty [x0, x1, z0, z1]
// otworów w terenie nad klatkami.
//   buildSubway({ span, depth, width }) → { group, holes, length }
export function buildSubway({ span = 18, depth = 3.4, width = 4 } = {}) {
  const g = new THREE.Group(); g.name = 'przejście podziemne';
  const con = surface('concrete'), W = width, D = depth, CH = 2.6, T = 0.3, hs = span / 2, st = steel();
  const box = (w, h, d, m, x, y, z, shadow = true) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; g.add(o); return o; };
  const rod = (a, b, r) => { const d = new THREE.Vector3().subVectors(b, a), o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), st); o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(o); };
  const tiles = kitMat('subwayTiles', () => new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#e4e2da'; c.fillRect(0, 0, w, h); c.fillStyle = '#a8a59c'; for (let k = 0; k < 4; k++) { c.fillRect(0, k * 32, w, 2); c.fillRect(k * 32, 0, 2, h); } }), roughness: 0.3, metalness: 0.05 }));
  const floorM = surface('slabsBig');
  // płaszczyzna z UV w metrach (kafelek 1,2 m)
  const plane = (w, h, m, x, y, z, ry) => { const pg = new THREE.PlaneGeometry(w, h), uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 1.2, uv.getY(i) * h / 1.2); const o = new THREE.Mesh(pg, m); o.position.set(x, y, z); o.rotation.y = ry; o.receiveShadow = true; g.add(o); return o; };
  const rise = 0.15, run = 0.3, steps = Math.round(D / rise), n1 = Math.ceil(steps / 2), n2 = steps - n1, LL = 1.5, Ls = steps * run + LL, Ltot = 2 * (hs + Ls);
  // posadzka, strop, ściany korytarza
  box(W, 0.29, Ltot - 0.02, con, 0, -D - 0.145, 0); box(W - 0.02, 0.02, 2 * hs, floorM, 0, -D + 0.01, 0, false);
  box(W + 2 * T - 0.02, 0.4, 2 * hs - 0.02, con, 0, -D + CH + 0.2, 0);
  for (const sx of [-1, 1]) {
    box(T, CH + 0.68, 2 * hs, con, sx * (W / 2 + T / 2), -D - 0.29 + (CH + 0.68) / 2, 0);                                 // ściany korytarza (w klatkach schowane w murach)
    for (const sz of [-1, 1]) box(T, D + 1.1, Ls, con, sx * (W / 2 + T / 2), (1.1 - D) / 2, sz * (hs + Ls / 2));     // mury klatek z attyką
    plane(2 * hs + 2 * Ls - 0.02, CH, tiles, sx * (W / 2 - 0.012), -D + CH / 2, 0, -sx * Math.PI / 2);          // płytki (1,2 cm przed murem)
  }
  // oprawy w stropie
  const lamp = kitMat('tunnelLamp', () => new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xfff1d6, emissiveIntensity: 2.2, roughness: 0.4 }));
  const L = []; for (let z = -hs + 1.5; z <= hs - 1.4; z += 3) L.push(new THREE.Matrix4().makeTranslation(0, -D + CH - 0.03, z));
  g.add(inst(new THREE.BoxGeometry(0.4, 0.05, 1.2), lamp, L, false));
  // klatki schodowe: schody wyciągnięte z profilu (stopnie, spocznik), ścianka nad wylotem korytarza, pochwyty
  const holes = [];
  for (const sz of [-1, 1]) {
    const pts = [new THREE.Vector2(0, -D - 0.3), new THREE.Vector2(0, -D)];
    let d = 0, y = -D;
    for (let k = 0; k < steps; k++) {
      if (k === n1) { d += LL; pts.push(new THREE.Vector2(d, y)); }
      y += rise; pts.push(new THREE.Vector2(d, y)); d += run; pts.push(new THREE.Vector2(d, y));
    }
    pts.push(new THREE.Vector2(d, -D - 0.3));
    const eg = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: W - 0.03, bevelEnabled: false });   // 1,5 cm od murów
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, sz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-sz, 0, 0)); m.setPosition(sz * (W / 2 - 0.015), 0, sz * hs); eg.applyMatrix4(m);
    const stair = new THREE.Mesh(eg, con); stair.castShadow = stair.receiveShadow = true; g.add(stair);
    box(W, 1.1 + D - CH - 0.4 + 0.4, T, con, 0, (1.1 + (-D + CH)) / 2, sz * (hs + T / 2));                     // ścianka nad wylotem
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 0.08), z0 = sz * hs, z1 = sz * (hs + n1 * run), z2 = sz * (hs + n1 * run + LL), z3 = sz * (hs + Ls);
      rod(new THREE.Vector3(x, -D + 0.9, z0), new THREE.Vector3(x, -D + n1 * rise + 0.9, z1), 0.025);
      rod(new THREE.Vector3(x, -D + n1 * rise + 0.9, z2), new THREE.Vector3(x, 0.9, z3), 0.025);
    }
    holes.push([-W / 2 - T, W / 2 + T, Math.min(sz * hs, sz * (hs + Ls)), Math.max(sz * hs, sz * (hs + Ls))]);
  }
  return { group: g, holes, length: Ltot };
}
