// FluidKit — siłownik hydrauliczny dwustronnego działania ze ściągami (ISO 6020-2): pokrywy kwadratowe (aluminium),
// tuleja malowana, 4 ściągi z nakrętkami, tłoczysko chromowane, przyłącza G 1/4 na pokrywach (góra), łapy ISO MS2.
// Oś wzdłuż +x (tłoczysko wysuwa się w +x), tył tylnej pokrywy w x = 0, spód łap w y = 0. pusher — płytka popychacza
// na końcu tłoczyska. setStroke(x) — wysuw [m]; cut — tuleja przezroczysta (widać tłok).
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port, canvasTex, decal } from '../common.js';
import { hexY, fluidMaterials } from './util.js';
import { endFitting, fitLen } from './pipes.js';

const cylX = (r, len, seg = 32) => new THREE.CylinderGeometry(r, r, len, seg).rotateZ(-Math.PI / 2);

export function hydCylinder({ D = 0.032, d = 0.018, stroke = 0.15, pusher = null, cut = false, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), cap = D + 0.022, capL = 0.03, hA = cap / 2 + 0.008;
  g.name = name || `${EN ? 'Hydraulic cylinder' : 'Siłownik hydrauliczny'} Ø${Math.round(D * 1000)}/${Math.round(d * 1000)} × ${Math.round(stroke * 1000)}`;
  const Lb = stroke + 0.03;   // tuleja: skok + tłok
  const rearC = mesh(new THREE.BoxGeometry(capL, cap, cap), F.alu); rearC.position.set(capL / 2, hA, 0); g.add(rearC);
  const tube = mesh(cylX(D / 2 + 0.004, Lb, 40), cut ? F.acrylic : F.cylPaint); tube.position.set(capL + Lb / 2, hA, 0); g.add(tube);
  const frontC = mesh(new THREE.BoxGeometry(capL, cap, cap), F.alu); frontC.position.set(capL + Lb + capL / 2, hA, 0); g.add(frontC);
  const gland = mesh(cylX(d / 2 + 0.006, 0.01, 32), F.alu); gland.position.set(2 * capL + Lb + 0.005, hA, 0); g.add(gland);
  // ściągi i nakrętki
  const e = cap / 2 - 0.0055;
  for (const [y, z] of [[e, e], [e, -e], [-e, e], [-e, -e]]) {
    const rod = mesh(cylX(0.003, Lb + 2 * capL + 0.006, 12), F.steel); rod.position.set((Lb + 2 * capL) / 2, hA + y, z); rod.userData.doctorOk = 'clash'; g.add(rod);
    for (const x of [-0.003, 2 * capL + Lb + 0.003]) { const n = mesh(hexY(0.008, 0.005).rotateZ(Math.PI / 2), F.zinc); n.position.set(x + (x < 0 ? 0.0005 : -0.0005), hA + y, z); g.add(n); }
  }
  // łapy (MS2) pod pokrywami
  for (const x of [capL / 2, capL + Lb + capL / 2]) { const foot = mesh(new THREE.BoxGeometry(capL, 0.008, cap + 0.024), F.alu); foot.position.set(x, 0.004, 0); g.add(foot); }
  // przyłącza na pokrywach (góra): A — tył, B — przód
  const portAt = {};
  for (const [k, x] of [['A', capL / 2], ['B', capL + Lb + capL / 2]]) { const f = endFitting({ d: 0.006 }); f.position.set(x, hA + cap / 2, 0); g.add(f); portAt[k] = new THREE.Vector3(x, hA + cap / 2 + fitLen(0.006), 0); }
  // tłok i tłoczysko (ruchome)
  const mov = new THREE.Group(); g.add(mov);
  const piston = mesh(cylX(D / 2 - 0.0005, 0.024, 32), F.dark); piston.position.set(capL + 0.015, hA, 0); mov.add(piston);
  piston.visible = cut;
  const rodL = Lb + capL + 0.01 + 0.03, rodM = mesh(cylX(d / 2, rodL, 32), F.chrome); rodM.position.set(capL + 0.015 + rodL / 2, hA, 0); rodM.userData.doctorOk = 'clash'; mov.add(rodM);
  const tip = capL + 0.015 + rodL;
  const rnut = mesh(hexY(d * 1.15, 0.008).rotateZ(Math.PI / 2), F.zinc); rnut.position.set(tip - 0.0045, hA, 0); mov.add(rnut);
  let pusherW = 0;
  if (pusher) { const pl = mesh(new THREE.BoxGeometry(0.01, pusher.h, pusher.w), F.steel); pl.position.set(tip + 0.005, pusher.y0 + pusher.h / 2, 0); mov.add(pl); pusherW = 0.01; }
  const lt = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#d8dbde'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 22px sans-serif'; c.fillText(`Ø${Math.round(D * 1000)}/${Math.round(d * 1000)} × ${Math.round(stroke * 1000)}`, 8, 28); c.font = '18px sans-serif'; c.fillText('p max 160 bar · ISO 6020-2', 8, 54); });
  const plate = mesh(new THREE.PlaneGeometry(0.05, 0.0125), decal(lt.t)); plate.position.set(capL + Lb / 2, hA, D / 2 + 0.0043); if (!cut) g.add(plate);
  const setStroke = (x) => { mov.position.x = Math.max(0, Math.min(stroke, x)); };
  g.userData = { D, d, stroke, hA, front: tip + pusherW, L0: 2 * capL + Lb, portAt, setStroke, mass: 2.2 + stroke * 6,
    ports: { A: port(EN ? 'A — piston side (G 1/4)' : 'A — strona tłoka (G 1/4)', DOMAIN.fluid, 'gwint'), B: port(EN ? 'B — rod side (G 1/4)' : 'B — strona tłoczyska (G 1/4)', DOMAIN.fluid, 'gwint'), rod: port(EN ? 'Rod (thread M16×1.5)' : 'Tłoczysko (gwint M16×1,5)', DOMAIN.lin, 'gwint') } };
  return g;
}
