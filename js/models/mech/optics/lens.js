// OptiKit — soczewka sferyczna (dwuwypukła, płasko-wypukła, płasko-wklęsła, dwuwklęsła) ze szkła optycznego: promienie
// krzywizny z równania soczewkarza dla ogniskowej przy 587,6 nm, grubość środkowa z grubości brzegu; w oprawce (płyta z gniazdem
// i pierścieniem dociskowym) na słupku. Oś +z, środek soczewki w (0, AXIS_Y, 0). userData.optics.describe() — powierzchnie
// w układzie świata dla raytrace.fromDesc.
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port } from '../common.js';
import { GLASS, nGlass } from '../../../behaviors/land/mech/raytrace.js';
import { opticMaterials, postMount, toWorld, dirWorld, AXIS_Y } from './mount.js';

const sagS = (R, q) => (Number.isFinite(R) ? R - Math.sign(R) * Math.sqrt(Math.max(0, R * R - q * q)) : 0);
export function lensRadii(kind, f, glass = 'bk7') {
  const n = nGlass(glass, 587.6), k = n - 1;
  return { biconvex: [2 * k * f, -2 * k * f], planoconvex: [k * f, Infinity], planoconcave: [-k * Math.abs(f), Infinity], biconcave: [-2 * k * Math.abs(f), 2 * k * Math.abs(f)] }[kind];
}
export function lens({ kind = 'biconvex', f = 0.1, D = 0.0254, glass = 'bk7', name } = {}) {
  const M = opticMaterials(), head = new THREE.Group(), r = D / 2, ra = r - 0.0005;   // apertura czysta
  const [R1, R2] = lensRadii(kind, f, glass), conc = kind.includes('concave');
  const te0 = conc ? 0 : 0.0018, tc = conc ? 0.002 : Math.max(0.002, te0 - sagS(R2, r) + sagS(R1, r));
  const z1 = (q) => -tc / 2 + sagS(R1, q), z2 = (q) => tc / 2 + sagS(R2, q), N = 28, prof = [];
  for (let i = 0; i <= N; i++) { const q = r * i / N; prof.push(new THREE.Vector2(q, z1(q))); }
  for (let i = N; i >= 0; i--) { const q = r * i / N; prof.push(new THREE.Vector2(q, z2(q))); }
  const kname = { biconvex: EN ? 'Biconvex' : 'Dwuwypukła', planoconvex: EN ? 'Plano-convex' : 'Płasko-wypukła', planoconcave: EN ? 'Plano-concave' : 'Płasko-wklęsła', biconcave: EN ? 'Biconcave' : 'Dwuwklęsła' }[kind];
  const G = GLASS[glass] || GLASS.bk7, glassM = M.glass(glass === 'f2' || glass === 'sf11' ? 0xfffbe8 : 0xf2fbff, nGlass(glass, 587.6));
  const L = mesh(new THREE.LatheGeometry(prof, 64).rotateX(Math.PI / 2), glassM); L.userData.doctorOk = 'seethrough'; head.add(L);
  // oprawka: płyta 38 × 38 z otworem, pierścień dociskowy z przodu
  const P = 0.038 * Math.max(1, D / 0.0254), plate = new THREE.Shape(); plate.moveTo(-P / 2, -P / 2); plate.lineTo(P / 2, -P / 2); plate.lineTo(P / 2, P / 2); plate.lineTo(-P / 2, P / 2); plate.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0, r - 0.0002, 0, Math.PI * 2, true); plate.holes.push(hole);
  const tp = 0.006, pl = mesh(new THREE.ExtrudeGeometry(plate, { depth: tp, bevelEnabled: false, curveSegments: 48 }), M.anod); pl.position.z = -tp / 2; head.add(pl);
  const ring = mesh(new THREE.RingGeometry(r - 0.0012, r + 0.002, 48), M.anod); ring.position.z = Math.max(z1(r), -tp / 2) - 0.0004; ring.rotation.y = Math.PI; head.add(ring);
  const arm = mesh(new THREE.BoxGeometry(0.012, 0.012, tp), M.anod); arm.position.set(0, -P / 2 - 0.006, 0); head.add(arm);
  const g = postMount(head, { headDrop: P / 2 + 0.012 });
  g.name = name || `${EN ? 'Lens' : 'Soczewka'} ${kname.toLowerCase()} f = ${Math.round(f * 1000)} mm Ø ${Math.round(D / 0.0254 * 2) / 2}"`;
  const mass = Math.PI * r * r * Math.max(tc, 0.002) * G.rho * (conc ? 1.4 : 0.7);
  g.userData = { optics: { kind: 'lens', lens: kind, f, D, tc, R1, R2, glass, head,
      describe: () => { g.updateMatrixWorld(true); const a = dirWorld(head, new THREE.Vector3(0, 0, 1)); return [
        { type: 'sphere', V: toWorld(head, new THREE.Vector3(0, 0, -tc / 2)), a, R: R1, r: ra, kind: 'refract', glass, outward: 1 },
        { type: 'sphere', V: toWorld(head, new THREE.Vector3(0, 0, tc / 2)), a, R: R2, r: ra, kind: 'refract', glass, outward: -1 }]; } },
    axisY: AXIS_Y, mass: mass + 0.1, head,
    ports: { in: port(EN ? 'Incident light' : 'Światło padające', DOMAIN.light, 'promień'), out: port(EN ? 'Refracted light' : 'Światło załamane', DOMAIN.light, 'promień'), mount: port(EN ? 'Base (M6 screw)' : 'Podstawa (śruba M6)', DOMAIN.rot, 'mocowanie') } };
  return g;
}
