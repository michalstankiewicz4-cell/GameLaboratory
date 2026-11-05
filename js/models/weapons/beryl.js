// Karabinek kbs wz. 96 Beryl (Fabryka Broni „Łucznik” – Radom, kal. 5,56 mm NATO): komora zamkowa z blachy tłoczonej,
// łoże z żeberkami, blok gazowy z muszką, hamulec wylotowy, zakrzywiony magazynek 30 nab., chwyt pistoletowy, kolba
// składana (rurowa ramka), przełącznik ognia, rączka zamka po prawej, szyna montażowa na pokrywie.
// Wymiary rzeczywiste (m): długość 0,943 (z rozłożoną kolbą), lufa 0,457, masa 3,35 kg.
// Układ: +z — wylot lufy, y w górę, +x — lewa strona; początek w środku chwytu pistoletowego (tu trzyma prawa dłoń).
import * as THREE from '../../../vendor/three/three.module.js';

export const info = {
  id: 'beryl', name: 'kbs wz. 96 Beryl', role: 'Karabinek 5,56 mm · FB Radom · 1996',
  length: 0.943, barrel: 0.457, mass: 3.35, rate: 700 / 60, muzzle: 920, mag: 30,
  muzzleAt: [0, 0.075, 0.69],   // wylot lufy względem chwytu
  stockAt: [0, 0.055, -0.25],   // stopka kolby (w ramię)
  supportAt: [0, 0.03, 0.27],   // łoże (lewa dłoń)
};

export function build() {
  const g = new THREE.Group(); g.name = 'beryl';
  const steel = new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.45, metalness: 0.7 });
  const black = new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.75, metalness: 0.15 });
  const poly = new THREE.MeshStandardMaterial({ color: 0x23262a, roughness: 0.85, metalness: 0.05 });
  const worn = new THREE.MeshStandardMaterial({ color: 0x3a3d41, roughness: 0.35, metalness: 0.85 });
  const parts = {};
  const add = (geo, mat, name, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, parent = g) => {
    const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m;
  };
  const box = (w, h, d, mat, name, x, y, z, rx = 0) => add(new THREE.BoxGeometry(w, h, d), mat, name, x, y, z, rx);
  const tube = (r1, r2, len, mat, name, x, y, z, seg = 16) => add(new THREE.CylinderGeometry(r1, r2, len, seg), mat, name, x, y, z, Math.PI / 2);
  // profil boczny wyciągnięty na grubość (x)
  const side = (pts, w, mat, name) => { const sh = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y))); const geo = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1 }); geo.rotateY(-Math.PI / 2); geo.translate(w / 2, 0, 0); return add(geo, mat, name); };

  // komora zamkowa (dół) i pokrywa (góra, zaokrąglona)
  side([[-0.085, 0.02], [0.17, 0.02], [0.17, 0.085], [-0.085, 0.085]], 0.034, steel, 'receiver');
  const cover = add(new THREE.CylinderGeometry(0.018, 0.018, 0.25, 18), steel, 'receiver cover', 0, 0.086, 0.04, Math.PI / 2); cover.scale.set(1, 1, 0.75);
  box(0.016, 0.008, 0.2, black, 'mounting rail', 0, 0.102, 0.03);
  for (let i = 0; i < 9; i++) box(0.02, 0.004, 0.008, black, 'rail slot', 0, 0.108, -0.06 + i * 0.022);
  // rączka zamka (prawa strona) i przełącznik ognia (prawa)
  box(0.03, 0.012, 0.016, worn, 'charging handle', -0.03, 0.074, 0.12);
  side([[-0.06, 0.05], [0.04, 0.062], [0.045, 0.054], [-0.055, 0.042]], 0.003, worn, 'selector lever').position.x = -0.019;
  // chwyt pistoletowy i kabłąk spustu
  side([[-0.035, 0.022], [0.0, 0.022], [-0.018, -0.085], [-0.055, -0.08]], 0.03, poly, 'pistol grip');
  add(new THREE.TorusGeometry(0.026, 0.004, 6, 16, Math.PI), steel, 'trigger guard', 0, 0.018, 0.035, 0, Math.PI / 2, Math.PI);
  side([[0.028, 0.02], [0.034, 0.02], [0.03, -0.005], [0.026, -0.004]], 0.006, steel, 'trigger');
  // magazynek 30 nab. (zakrzywiony, z żeberkami)
  const mag = new THREE.Group(); mag.name = 'magazine'; mag.position.set(0, 0.022, 0.105); g.add(mag);
  const shape = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8, a = t * 0.42; shape.push([0.03 + Math.sin(a) * 0.05, -t * 0.2]); }
  for (let i = 8; i >= 0; i--) { const t = i / 8, a = t * 0.42; shape.push([-0.03 + Math.sin(a) * 0.05 + t * 0.012, -t * 0.19]); }
  { const sh = new THREE.Shape(shape.map(([z, y]) => new THREE.Vector2(z, y))); const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.024, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1 }); geo.rotateY(-Math.PI / 2); geo.translate(0.012, 0, 0); add(geo, black, 'magazine body', 0, 0, 0, 0, 0, 0, mag); }
  for (let i = 1; i < 6; i++) { const t = i / 6, a = t * 0.42; add(new THREE.BoxGeometry(0.03, 0.004, 0.012), poly, 'magazine rib', 0, -t * 0.195, Math.sin(a) * 0.05 + 0.028, -a, 0, 0, mag); }
  // łoże (dolne z żeberkami) i nakładka
  side([[0.17, 0.02], [0.33, 0.028], [0.33, 0.07], [0.17, 0.078]], 0.04, poly, 'lower handguard');
  for (let i = 0; i < 6; i++) box(0.05, 0.004, 0.012, black, 'handguard rib', 0, 0.03 + i * 0.008, 0.2 + i * 0.02);
  side([[0.17, 0.082], [0.31, 0.08], [0.31, 0.1], [0.17, 0.104]], 0.034, poly, 'upper handguard');
  // lufa, blok gazowy z muszką, rura gazowa, hamulec wylotowy
  tube(0.0085, 0.0085, 0.4, steel, 'barrel', 0, 0.075, 0.47);
  box(0.03, 0.03, 0.04, steel, 'gas block', 0, 0.083, 0.36);
  tube(0.009, 0.009, 0.2, steel, 'gas tube', 0, 0.097, 0.25);
  box(0.006, 0.05, 0.012, steel, 'front sight post', 0, 0.115, 0.365);
  add(new THREE.TorusGeometry(0.012, 0.0025, 6, 14, Math.PI), steel, 'front sight hood', 0, 0.13, 0.365, 0, 0, 0);
  tube(0.013, 0.012, 0.055, worn, 'muzzle brake', 0, 0.075, 0.66);
  for (let i = 0; i < 3; i++) for (const s of [1, -1]) box(0.004, 0.006, 0.008, black, 'brake port', s * 0.012, 0.078, 0.645 + i * 0.012);
  box(0.022, 0.012, 0.03, steel, 'rear sight', 0, 0.112, 0.14);
  // kolba składana: rurowa ramka z płytką stopki
  const stock = new THREE.Group(); stock.name = 'stock'; stock.position.set(0, 0.055, -0.085); g.add(stock);
  for (const y of [0.012, -0.03]) { const r = add(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 10), steel, 'stock tube', 0, y, -0.1, Math.PI / 2, 0, 0, stock); r.rotation.x = Math.PI / 2 + (y < 0 ? 0.1 : 0); }
  add(new THREE.BoxGeometry(0.03, 0.11, 0.016), poly, 'butt plate', 0, -0.015, -0.205, 0, 0, 0, stock);
  add(new THREE.BoxGeometry(0.028, 0.03, 0.02), steel, 'stock hinge', 0, -0.01, 0.0, 0, 0, 0, stock);
  // wylot: punkt i błysk (pokazywany przy strzale)
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8).scale(0.6, 0.6, 1.6), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.9, depthWrite: false }));
  flash.name = 'muzzle flash'; flash.position.set(0, 0.075, 0.74); flash.visible = false; g.add(flash);
  g.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  parts.flash = flash; parts.stock = stock; parts.magazine = mag;
  let flashT = 0;
  // o: { fire: true w klatce strzału }
  function update(t, dt, o = {}) {
    if (o.fire) flashT = 0.05;
    flashT -= dt; flash.visible = flashT > 0; if (flash.visible) flash.rotation.z = Math.random() * 6.28;
  }
  return { group: g, parts, info, update, dispose() { g.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); } }); } };
}
