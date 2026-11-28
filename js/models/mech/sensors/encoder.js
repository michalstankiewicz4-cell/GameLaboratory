// Enkoder inkrementalny (obudowa Ø 58 mm z aluminium, kołnierz zaciskowy, wałek Ø 10 mm, złącze M23 promieniowe)
// ze sprzęgłem mieszkowym. Wewnątrz tarcza kodowa ze szkła z podziałką (widoczna przez okienko serwisowe — przekrój).
// Oś wzdłuż +x, wałek wychodzi w −x (koniec wałka w x = 0), obudowa w +x. setAngle(θ) — obrót wałka i tarczy.
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port, materials, plastic, canvasTex, decal } from '../common.js';

export function encoder({ ppr = 1024, cut = true, name } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name || `${EN ? 'Incremental encoder' : 'Enkoder inkrementalny'} ${ppr} ${EN ? 'ppr' : 'imp/obr'}`;
  const alu = new THREE.MeshPhysicalMaterial({ color: 0xb8bcc0, metalness: 1, roughness: 0.34 });
  const X = (geo) => geo.rotateZ(-Math.PI / 2);   // walec wzdłuż +x
  const shaft = new THREE.Group(); g.add(shaft);
  { const w = mesh(X(new THREE.CylinderGeometry(0.005, 0.005, 0.03, 24)), M.steelP); w.position.x = 0.015; shaft.add(w); }
  { const wi = mesh(X(new THREE.CylinderGeometry(0.004, 0.004, 0.017, 20)), M.steelP); wi.position.x = 0.0385; shaft.add(wi); }   // wałek w obudowie (łożyska) aż do tarczy kodowej
  // sprzęgło mieszkowe (zwoje mieszka) między wałkiem enkodera a wałem maszyny
  const bel = []; for (let i = 0; i <= 24; i++) { const f = i / 24; bel.push(new THREE.Vector2(0.008 + (i % 2 ? 0.0028 : 0), -0.012 + f * 0.024)); }
  const bellows = mesh(X(new THREE.LatheGeometry(bel, 32)), new THREE.MeshPhysicalMaterial({ color: 0xd6d8da, metalness: 1, roughness: 0.18 }));
  shaft.add(bellows);
  for (const x of [-0.016, 0.016]) { const hub = mesh(X(new THREE.CylinderGeometry(0.0095, 0.0095, 0.008, 32)), alu); hub.position.x = x; shaft.add(hub); }
  // kołnierz zaciskowy i obudowa
  const fl = mesh(X(new THREE.CylinderGeometry(0.029, 0.029, 0.005, 64)), alu); fl.position.x = 0.032; g.add(fl);
  const spig = mesh(X(new THREE.CylinderGeometry(0.018, 0.018, 0.004, 48)), alu); spig.position.x = 0.0285; g.add(spig);
  const body = mesh(X(new THREE.CylinderGeometry(0.029, 0.029, 0.034, 64)), plastic(0x2b2d30, 0.38)); body.position.x = 0.0515; g.add(body);
  const cap = mesh(X(new THREE.CylinderGeometry(0.027, 0.029, 0.004, 64)), alu); cap.position.x = 0.0705; g.add(cap);
  // tarcza kodowa (szkło z podziałką chromową) widoczna przez okienko — pod obudową, obraca się z wałkiem
  const disc = new THREE.Group(); disc.position.x = 0.045; g.add(disc);
  const tex = canvasTex(512, 512, (c, w) => { c.clearRect(0, 0, w, w); c.translate(w / 2, w / 2); const n = Math.min(256, ppr); for (let i = 0; i < n; i++) { c.rotate(Math.PI * 2 / n); c.fillStyle = '#1b1d22'; c.fillRect(150, -2.2, 90, 2.2 * Math.PI * 2 * 200 / n / 4); } c.fillRect(110, -3, 30, 6); });
  const dm = mesh(X(new THREE.CylinderGeometry(0.024, 0.024, 0.0012, 64)), new THREE.MeshPhysicalMaterial({ map: tex.t, color: 0xdfe8ee, metalness: 0.1, roughness: 0.05, transmission: 0.6, transparent: true }));
  disc.add(dm);
  if (cut) {   // okienko serwisowe (przezroczysta wstawka w obudowie) — widać tarczę
    body.material = body.material.clone(); body.material.transparent = true; body.material.opacity = 0.35; body.material.depthWrite = false;
  }
  // złącze M23 promieniowo
  const m23 = mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.02, 32), alu); m23.position.set(0.055, -0.038, 0); g.add(m23);
  const lab = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#e8e8e2'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 20px sans-serif'; c.fillText(`${ppr} imp · A B Z · 5–30 V`, 10, 40); });
  // tabliczka owinięta na obudowie (wycinek walca na jej powierzchni)
  const plate = mesh(X(new THREE.CylinderGeometry(0.029, 0.029, 0.03, 32, 1, true, -0.14, 0.28)), decal(lab.t), false); plate.position.x = 0.052; g.add(plate);
  if (cut) plate.userData.doctorOk = 'seethrough';   // przy przezroczystej obudowie (przekrój) widać tabliczkę od spodu — tak ma być
  g.userData = { ppr, mass: 0.35, shaft, disc,
    setAngle: (t) => { shaft.rotation.x = t; disc.rotation.x = t; },
    ports: { shaft: port(EN ? 'Shaft Ø 10 (bellows coupling)' : 'Wałek Ø 10 (sprzęgło mieszkowe)', DOMAIN.rot, 'wał'), out: port(EN ? 'Channels A, B, Z (HTL 24 V)' : 'Kanały A, B, Z (HTL 24 V)', DOMAIN.sig, 'A/B/Z'), mount: port(EN ? 'Clamping flange (mount)' : 'Kołnierz zaciskowy (mocowanie)', DOMAIN.rot, 'mocowanie') } };
  return g;
}
