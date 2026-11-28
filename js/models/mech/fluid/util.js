// FluidKit — wspólne pomocniki modeli instalacji płynów: bryły obrotowe wokół osi y, sześciokąty (wymiar pod klucz),
// ścieżki rur z łukami o promieniu gięcia, materiały (stal ocynkowana, mosiądz, guma węży, woda, olej, szkło, lakiery).
import * as THREE from '../../../../vendor/three/three.module.js';
import { materials as mechMaterials } from '../common.js';
import { makeMaterial, PRESETS } from '../../../render/materials/matkit.js';
import { waterMaterial, oilMaterial } from '../../../render/fluid/liquid.js';

// bryła obrotowa wokół +y z obrysu [[r, y], …] (obrys zamknięty — od osi do osi daje bryłę pełną)
export const latheY = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-5), y)), seg);
// sześciokąt o wymiarze pod klucz s (między ściankami), wysokość h wzdłuż y
export const hexY = (s, h) => new THREE.CylinderGeometry(s / Math.sqrt(3), s / Math.sqrt(3), h, 6).rotateY(Math.PI / 6);
// ścieżka przez punkty z łukami o promieniu R na załamaniach (rura gięta)
export function bentPath(points, R) {
  const P = points.map((p) => (p.isVector3 ? p.clone() : new THREE.Vector3(...p))), path = new THREE.CurvePath();
  let cur = P[0];
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i - 1], b = P[i], c = P[i + 1], d1 = b.clone().sub(a), d2 = c.clone().sub(b), l1 = d1.length(), l2 = d2.length();
    d1.normalize(); d2.normalize();
    const ang = Math.acos(Math.min(1, Math.max(-1, d1.dot(d2)))), t = Math.min(R * Math.tan(ang / 2), l1 / 2, l2 / 2);
    const p1 = b.clone().addScaledVector(d1, -t), p2 = b.clone().addScaledVector(d2, t);
    if (p1.distanceTo(cur) > 1e-6) path.add(new THREE.LineCurve3(cur, p1));
    if (t > 1e-6) path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2));
    cur = p2;
  }
  path.add(new THREE.LineCurve3(cur, P[P.length - 1]));
  return path;
}
// rura (bryła zamknięta): rurka po ścieżce i denka na końcach (schowane w złączkach)
export function tubeSolid(path, r, mat, { seg = null, radial = 16 } = {}) {
  const len = path.getLength(), n = seg || Math.max(8, Math.ceil(len / 0.01));
  const g = new THREE.TubeGeometry(path, n, r, radial, false), grp = new THREE.Group(), tube = new THREE.Mesh(g, mat); tube.castShadow = tube.receiveShadow = true; grp.add(tube);
  for (const [u, s] of [[0, -1], [1, 1]]) {
    const p = path.getPointAt(u), t = path.getTangentAt(u).normalize(), cap = new THREE.Mesh(new THREE.CircleGeometry(r, radial), mat);
    cap.position.copy(p); cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), t.clone().multiplyScalar(s)); grp.add(cap);
  }
  return grp;
}
// obrót obiektu tak, by jego oś +y wskazywała kierunek dir
export const alignY = (o, dir) => { o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); return o; };

let FM = null;
export function fluidMaterials() {
  if (FM) return FM;
  const M = mechMaterials(), mk = (def) => makeMaterial(def, { res: 512 }).material;
  FM = {
    ...M,
    zinc: new THREE.MeshPhysicalMaterial({ color: 0xc4cad0, metalness: 1, roughness: 0.32, clearcoat: 0.2 }),          // stal ocynkowana (złączki, nakrętki)
    brassF: M.brassF,
    chrome: new THREE.MeshPhysicalMaterial({ color: 0xe8ecef, metalness: 1, roughness: 0.06, clearcoat: 0.6 }),       // tłoczysko chromowane
    stainless: new THREE.MeshPhysicalMaterial({ color: 0xc9cdd1, metalness: 1, roughness: 0.22 }),                      // stal nierdzewna (manometr, czujnik)
    hose: new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.82, metalness: 0 }),                            // guma węża (oplot w środku)
    hoseBlue: new THREE.MeshStandardMaterial({ color: 0x2a5fa8, roughness: 0.6, metalness: 0 }),                         // wąż ogrodowy / PCV
    pvc: new THREE.MeshStandardMaterial({ color: 0x8e979e, roughness: 0.45, metalness: 0 }),                             // rura PCV-U szara
    water: Object.assign(waterMaterial({ depth: 0.5 }), { thickness: 0.18 }),   // woda w zbiorniku: załamanie, pochłanianie w głębi, falująca powierzchnia (LiquidKit)
    oil: oilMaterial(),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transmission: 0.95, thickness: 0.003, ior: 1.5, transparent: true, opacity: 0.25, depthWrite: false }),
    tankPaint: mk({ ...PRESETS.hull, color: '#c8cbc6', color2: '#9a9d98', tile: 2, wear: 0.08, dirt: 0.12, rust: 0 }),      // RAL 7035
    hydPaint: mk({ ...PRESETS.hull, color: '#2b4f8c', color2: '#1a3260', tile: 2, wear: 0.1, dirt: 0.12, rust: 0 }),       // RAL 5010 (zawory, pompa)
    valveGrey: mk({ ...PRESETS.hull, color: '#4b5157', color2: '#2e3236', tile: 2, wear: 0.12, dirt: 0.15, rust: 0 }),      // korpus rozdzielacza (odlew malowany)
    cylPaint: mk({ ...PRESETS.hull, color: '#1f2224', color2: '#111314', tile: 2, wear: 0.1, dirt: 0.1, rust: 0 }),         // tuleja siłownika
    pumpGreen: mk({ ...PRESETS.hull, color: '#3c6f8f', color2: '#244a60', tile: 2, wear: 0.1, dirt: 0.1, rust: 0 }),        // pompa wodna
    belt: new THREE.MeshStandardMaterial({ color: 0x23302a, roughness: 0.85, metalness: 0 }),
    carton: mk({ ...PRESETS.planks, color: '#b08a58', color2: '#8c6a40', planks: 0, grain: 0.2, roughness: 0.9, wear: 0.05, dirt: 0.05 }),
    crate: new THREE.MeshStandardMaterial({ color: 0x2b5ea8, roughness: 0.55, metalness: 0 }),
  };
  return FM;
}
