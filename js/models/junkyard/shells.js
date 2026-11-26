// Opis powłoki przedmiotu z blachy → rzadka siatka fizyczna do deformacji (zachowanie „deformacja blachy”,
// js/behaviors/land/deform/shell.js). Jak zderzacz (info.collider → shapes.js): przedmiot niesie tylko liczby
// (info.shell), siatkę buduje ta funkcja; model rysowany nie wie o deformacji.
// Opisy (w lokalnym układzie przedmiotu, środek w (0,0,0), oś y):
//   { type: 'drum', r, h, lid, lidY, rMax, segs, rows, rings, ringsInset }
//     beczka: ściana walca o promieniu r i wysokości h (rows rzędów), dno i wieko wpuszczone o lidY (krążek o promieniu
//     lid, rings pierścieni), segs segmentów dookoła; rMax — największy promień modelu (obręcze toczne), do podpór
// shellGeometry(opis, { inset }) → BufferGeometry
//   inset — siatka cofnięta o promień styku cząstek (beczki stykają się cząstkami na odległość 2 × inset, więc osadzony
//   model dotyka sąsiada blachą); wtedy dno i wieko mają ringsInset pierścieni
import * as THREE from '../../../vendor/three/three.module.js';

export function shellGeometry(d, { inset = 0 } = {}) {
  if (d.type !== 'drum') throw new Error(`JunkKit: nieznana powłoka "${d.type}"`);
  const c = inset, rings = c > 0 ? d.ringsInset || d.rings : d.rings, r = d.r - c, y0 = d.lidY + c, lr = d.lid - c, H = d.h;
  const pts = [];
  for (let k = 0; k <= rings; k++) pts.push(new THREE.Vector2(Math.max(1e-4, lr * k / rings), y0));
  pts.push(new THREE.Vector2(r, c));
  for (let i = 1; i < d.rows; i++) pts.push(new THREE.Vector2(r, c + (H - 2 * c) * i / d.rows));
  pts.push(new THREE.Vector2(r, H - c));
  for (let k = rings; k >= 0; k--) pts.push(new THREE.Vector2(Math.max(1e-4, lr * k / rings), H - y0));
  return new THREE.LatheGeometry(pts, d.segs).translate(0, -H / 2, 0);
}
