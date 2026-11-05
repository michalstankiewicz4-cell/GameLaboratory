// Bomba burząca 250 lb GP Mk IV (RAF, 1939–1942): cylindryczny korpus z ostrołukowym nosem i zapalnikiem, zwężający
// się stożek ogonowy ze statecznikiem skrzynkowym (4 lotki w ramce), dwa uchwyty podwieszenia, pas malowania.
// Wymiary rzeczywiste (m): długość 1,37, średnica 0,26, masa 113 kg (ładunek ok. 30 kg).
// Układ: +z — nos (kierunek lotu), y w górę; początek w środku ciężkości (punkt podwieszenia).
import * as THREE from '../../../vendor/three/three.module.js';

export const info = {
  id: 'bomb250', name: 'Bomba 250 lb GP Mk IV', role: 'Bomba burząca · RAF · 1939', length: 1.37, diameter: 0.26, mass: 113,
  blast: 14,          // promień zniszczeń (m) — do gry
  hangAt: [0, 0.13, 0], // punkt podwieszenia (uchwyty) względem środka
};

export function build() {
  const g = new THREE.Group(); g.name = 'bomb250';
  const body = new THREE.MeshStandardMaterial({ color: 0x4b5240, roughness: 0.7, metalness: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x5e5f5c, roughness: 0.45, metalness: 0.75 });
  const band = new THREE.MeshStandardMaterial({ color: 0xb02a22, roughness: 0.6 });
  const add = (geo, mat, name, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
  // korpus z profilu obrotowego: nos (ostrołuk) — walec — stożek ogonowy
  const R = 0.13, prof = [];
  prof.push(new THREE.Vector2(0.0, 0.62));
  for (let i = 1; i <= 8; i++) { const t = i / 8; prof.push(new THREE.Vector2(R * Math.sin(t * Math.PI / 2), 0.62 - 0.26 * (1 - Math.cos(t * Math.PI / 2)))); }
  prof.push(new THREE.Vector2(R, -0.12), new THREE.Vector2(R * 0.92, -0.2), new THREE.Vector2(0.06, -0.48), new THREE.Vector2(0.045, -0.52), new THREE.Vector2(0.0, -0.52));
  const lathe = new THREE.LatheGeometry(prof.reverse(), 28); lathe.rotateX(Math.PI / 2);
  add(lathe, body, 'bomb body');
  add(new THREE.CylinderGeometry(R + 0.003, R + 0.003, 0.05, 28), band, 'filling band', 0, 0, 0.32, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.022, 0.03, 0.06, 12), steel, 'nose fuze', 0, 0, 0.64, Math.PI / 2);
  // statecznik skrzynkowy: 4 lotki i ramka
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; add(new THREE.BoxGeometry(0.004, 0.13, 0.26), steel, 'tail fin', Math.cos(a) * 0.1, Math.sin(a) * 0.1, -0.58, 0, 0, a + Math.PI / 2); }
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; add(new THREE.BoxGeometry(0.235, 0.004, 0.14), steel, 'fin box', Math.cos(a) * 0.118, Math.sin(a) * 0.118, -0.62, 0, 0, a + Math.PI / 2); }
  // uchwyty podwieszenia
  for (const z of [-0.14, 0.18]) add(new THREE.TorusGeometry(0.022, 0.006, 6, 12), steel, 'suspension lug', 0, R + 0.018, z, 0, Math.PI / 2, 0);
  g.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  return { group: g, parts: {}, info, update() {}, dispose() { g.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); } };
}
