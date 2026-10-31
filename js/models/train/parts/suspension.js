// Zawieszenie: maźnica na końcu osi, sprężyna śrubowa nad nią, wspornik sprężyny
// z wieszakami do podłużnicy. Z aTrain (js/app.js: coilGeo, boxes, wsporniki).
// Pozycje w układzie pudła (data.js: layout). Spoczynek: sprężyna o długości
// równowagi; zachowanie może potem ruszać maźnicą i ściskać sprężynę (setSpring).
import { trainMaterials, box } from "../materials.js";
const THREE = window.THREE;

let coil = null;
export function coilGeometry() {   // jednostkowa wysokość (skalowana w y do długości sprężyny)
  if (coil) return coil;
  const pts = [], turns = 6, N = 160;
  for (let i = 0; i <= N; i++) { const t = i / N, a = t * turns * 2 * Math.PI; pts.push(new THREE.Vector3(Math.cos(a) * 0.09, t, Math.sin(a) * 0.09)); }
  return (coil = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.016, 6, false));
}

// wspornik sprężyny (stały, część pudła)
export function springSole(g, type, sp, y) {
  const mat = trainMaterials(), soleZ = type === "loco" ? 1.12 : 1.05, soleBot = y(type === "loco" ? 0.85 : 0.97);
  box(g, mat.frame, 0.34, 0.06, 0.3, sp.ax, sp.ay, sp.az);
  if (soleBot - sp.ay > 0.05) for (const dx of [-0.13, 0.13]) box(g, mat.frame, 0.05, soleBot - sp.ay, 0.05, sp.ax + dx, (soleBot + sp.ay) / 2 + 0.01, Math.sign(sp.az) * (soleZ - 0.03));
}

// maźnica + sprężyna (ruchome); wsY: środek zestawu kołowego w układzie pudła
export function axleboxAndSpring(sp, wsY) {
  const mat = trainMaterials(), g = new THREE.Group();
  g.name = "maźnica i sprężyna";
  const bx = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.26), mat.frame); g.add(bx);
  const c = new THREE.Mesh(coilGeometry(), mat.spring); g.add(c);
  g.userData = { box: bx, coil: c };
  setSpring(g, sp, wsY);
  return g;
}

// ustawia maźnicę na osi (wsY) i rozpina sprężynę do wspornika (sp.ay − 0,03)
export function setSpring(g, sp, wsY) {
  const { box: bx, coil: c } = g.userData;
  bx.position.set(sp.ax, wsY, sp.wz);
  const top = wsY + 0.12, len = Math.max(sp.ay - 0.03 - top, 0.01);
  c.position.set(sp.ax, top, sp.wz); c.scale.set(1, len, 1);
}
