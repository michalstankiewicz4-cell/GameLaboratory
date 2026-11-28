// OptiKit — pryzmat (równoboczny 60° albo prostokątny 45-90-45) ze szkła optycznego na stoliku obrotowym na słupku.
// Trójkąt w płaszczyźnie xz (środek ciężkości w osi słupka), wysokość wzdłuż y; setAngle(rad) — obrót stolika.
// userData.optics.describe() — ściany boczne w świecie.
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port } from '../common.js';
import { GLASS, nGlass } from '../../../behaviors/land/mech/raytrace.js';
import { opticMaterials, postMount, toWorld, dirWorld, AXIS_Y } from './mount.js';

export function prism({ type = 'equilateral', A = 0.025, H = 0.025, glass = 'f2', name } = {}) {
  const M = opticMaterials(), head = new THREE.Group(), turn = new THREE.Group(); head.add(turn);
  // równoboczny: wierzchołek łamiący w +x, podstawa po −x
  const tri = type === 'equilateral' ? [[A * Math.sqrt(3) / 3, 0], [-A * Math.sqrt(3) / 6, -A / 2], [-A * Math.sqrt(3) / 6, A / 2]] : [[-A / 3, -A / 3], [2 * A / 3, -A / 3], [-A / 3, 2 * A / 3]];   // prostokątny: kąt prosty w (−A/3, −A/3), środek ciężkości w 0
  const sh = new THREE.Shape(); sh.moveTo(tri[0][0], -tri[0][1]); sh.lineTo(tri[1][0], -tri[1][1]); sh.lineTo(tri[2][0], -tri[2][1]); sh.closePath();   // kształt w (x, −z) → po obrocie płaszczyzna xz
  const geo = new THREE.ExtrudeGeometry(sh, { depth: H, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, -H / 2, 0);
  const pr = mesh(geo, M.glass(glass === 'bk7' || glass === 'fs' ? 0xf2fbff : 0xfffbe8, nGlass(glass, 587.6))); pr.userData.doctorOk = 'seethrough'; turn.add(pr);
  const table = mesh(new THREE.CylinderGeometry(A * 0.75, A * 0.75, 0.004, 40), M.anod); table.position.y = -H / 2 - 0.002; turn.add(table);
  const clampP = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.003, 20), M.anod); clampP.position.y = H / 2 + 0.0015; turn.add(clampP);
  const sp = mesh(new THREE.CylinderGeometry(0.0015, 0.0015, H * 0.5, 8), M.steelP); sp.position.set(0, H / 2 + 0.003 + H * 0.25, 0); turn.add(sp);
  const g = postMount(head, { headDrop: H / 2 + 0.004 });
  const G = GLASS[glass] || GLASS.bk7;
  g.name = name || `${EN ? (type === 'equilateral' ? 'Equilateral prism' : 'Right-angle prism') : (type === 'equilateral' ? 'Pryzmat równoboczny' : 'Pryzmat prostokątny')} ${Math.round(A * 1000)} mm, ${G.name}`;
  const pts3 = tri.map(([x, z]) => new THREE.Vector3(x, 0, z));
  g.userData = { optics: { kind: 'prism', type, A, H, glass, head, turn,
      describe: () => { g.updateMatrixWorld(true); const out = [], c = new THREE.Vector3(); pts3.forEach((p) => c.add(p)); c.multiplyScalar(1 / 3);
        for (let i = 0; i < 3; i++) { const p0 = pts3[i], p1 = pts3[(i + 1) % 3], e = p1.clone().sub(p0), n = new THREE.Vector3(e.z, 0, -e.x).normalize(); if (n.dot(p0.clone().add(p1).multiplyScalar(0.5).sub(c)) < 0) n.negate(); const Y = new THREE.Vector3(0, H / 2, 0);
          out.push({ type: 'poly', pts: [p0.clone().sub(Y), p1.clone().sub(Y), p1.clone().add(Y), p0.clone().add(Y)].map((v) => toWorld(turn, v)), n: dirWorld(turn, n), kind: 'refract', glass }); }
        return out; } },
    axisY: AXIS_Y, setAngle: (a) => { turn.rotation.y = a; }, mass: A * A * Math.sqrt(3) / 4 * H * G.rho + 0.15,
    ports: { in: port(EN ? 'Incident light' : 'Światło padające', DOMAIN.light, 'promień'), out: port(EN ? 'Dispersed light' : 'Światło rozszczepione', DOMAIN.light, 'promień'), mount: port(EN ? 'Rotary table' : 'Stolik obrotowy', DOMAIN.rot, 'mocowanie') } };
  return g;
}
