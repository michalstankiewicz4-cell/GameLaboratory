// OptiKit — odbiorniki (światło pada z −z, czyli biegnie w +z):
//   photodiode — fotodioda krzemowa 10 × 10 mm w głowicy z okienkiem, na górze wyświetlacz miernika (moc µW, prąd µA);
//                userData.detector: { center(), normal() (ku światłu), half: 5 mm, square }; setReading(P [W], I [A], nm)
//   screen     — biały ekran 80 × 60 mm na słupku; plamki światła rysuje warstwa wiązek (render/optics/beams.js)
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port, canvasTex } from '../common.js';
import { opticMaterials, postMount, toWorld, dirWorld, AXIS_Y } from './mount.js';

export function photodiode({ area = 0.01, name } = {}) {
  const M = opticMaterials(), head = new THREE.Group(), a = area;
  const box = mesh(new THREE.BoxGeometry(0.032, 0.032, 0.02), M.anod); box.position.z = 0.01; head.add(box);
  const chip = mesh(new THREE.PlaneGeometry(a, a), new THREE.MeshPhysicalMaterial({ color: 0x1b2440, roughness: 0.25, metalness: 0.4, clearcoat: 1, iridescence: 0.6, iridescenceIOR: 1.6 })); chip.position.z = -0.0003; chip.rotation.y = Math.PI; head.add(chip);
  const bez = mesh(new THREE.RingGeometry(a * 0.72, 0.015, 4, 1, Math.PI / 4).scale(1, 1, 1), M.anod); bez.rotation.y = Math.PI; bez.position.z = -0.0006; head.add(bez);
  const bnc = mesh(new THREE.CylinderGeometry(0.0048, 0.0048, 0.012, 20).rotateX(Math.PI / 2), M.steelP); bnc.position.z = 0.026; head.add(bnc);
  // miernik: wyświetlacz na górze głowicy
  const lcdBox = mesh(new THREE.BoxGeometry(0.032, 0.014, 0.02), M.anod); lcdBox.position.set(0, 0.023, 0.01); head.add(lcdBox);
  let txt = ['— µW', '— µA'];
  const lcd = canvasTex(256, 96, (c, w, h) => draw(c, w, h));
  function draw(c, w, h) { c.fillStyle = '#9cb79a'; c.fillRect(0, 0, w, h); c.fillStyle = '#122014'; c.font = 'bold 34px monospace'; c.fillText(txt[0], 10, 40); c.font = 'bold 28px monospace'; c.fillText(txt[1], 10, 82); }
  const scr = mesh(new THREE.PlaneGeometry(0.028, 0.0105), new THREE.MeshStandardMaterial({ map: lcd.t, roughness: 0.4, emissive: 0x223322, emissiveIntensity: 0.4 })); scr.rotation.y = Math.PI; scr.position.set(0, 0.023, -0.0002); head.add(scr);
  const arm = mesh(new THREE.BoxGeometry(0.012, 0.004, 0.02), M.anod); arm.position.set(0, -0.018, 0.004); head.add(arm);
  const g = postMount(head, { headDrop: 0.02 });
  g.name = name || (EN ? 'Si photodiode 10 × 10 mm with meter' : 'Fotodioda krzemowa 10 × 10 mm z miernikiem');
  const fmtP = (P) => (P >= 1e-3 ? `${(P * 1000).toFixed(2)} mW` : `${(P * 1e6).toFixed(1)} µW`);
  g.userData = { detector: { kind: 'photodiode', half: a / 2, square: true, center: () => toWorld(head, new THREE.Vector3(0, 0, -0.0003)), normal: () => dirWorld(head, new THREE.Vector3(0, 0, -1)) },
    setReading: (P, I) => { const t = [fmtP(P), `${(I * 1e6).toFixed(1)} µA`]; if (t[0] !== txt[0] || t[1] !== txt[1]) { txt = t; lcd.redraw((c, w, h) => draw(c, w, h)); } },
    axisY: AXIS_Y, mass: 0.15,
    ports: { in: port(EN ? 'Light (active area)' : 'Światło (pole aktywne)', DOMAIN.light, 'promień'), out: port(EN ? 'Photocurrent (BNC)' : 'Fotoprąd (BNC)', DOMAIN.sig, 'BNC'), mount: port(EN ? 'Base (M6 screw)' : 'Podstawa (śruba M6)', DOMAIN.rot, 'mocowanie') } };
  return g;
}

export function screen({ w = 0.08, h = 0.06, name } = {}) {
  const M = opticMaterials(), head = new THREE.Group();
  const card = mesh(new THREE.BoxGeometry(w, h, 0.002), M.white); card.position.z = 0.001; head.add(card);
  const frame = mesh(new THREE.BoxGeometry(w + 0.006, 0.004, 0.006), M.anod); frame.position.set(0, -h / 2 - 0.002, 0.001); head.add(frame);
  const arm = mesh(new THREE.BoxGeometry(0.012, 0.006, 0.006), M.anod); arm.position.set(0, -h / 2 - 0.007, 0.001); head.add(arm);
  const g = postMount(head, { headDrop: h / 2 + 0.01 });
  g.name = name || (EN ? 'White screen 80 × 60 mm' : 'Ekran biały 80 × 60 mm');
  g.userData = { detector: { kind: 'screen', half: w / 2, halfH: h / 2, square: true, center: () => toWorld(head, new THREE.Vector3(0, 0, 0)), normal: () => dirWorld(head, new THREE.Vector3(0, 0, -1)) },
    axisY: AXIS_Y, mass: 0.08, ports: { in: port(EN ? 'Light (screen surface)' : 'Światło (powierzchnia ekranu)', DOMAIN.light, 'promień'), mount: port(EN ? 'Base (M6 screw)' : 'Podstawa (śruba M6)', DOMAIN.rot, 'mocowanie') } };
  return g;
}

// stół optyczny (płyta z otworami M6 co 25 mm, aluminium anodowane): L × W × 12,7 mm, spód y = 0, środek w (0, 0)
export function breadboard({ L = 0.9, W = 0.3, name } = {}) {
  const M = opticMaterials(), t = 0.0127;
  const tex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#1a1b1f'; c.fillRect(0, 0, w, h); c.fillStyle = '#060607'; c.beginPath(); c.arc(w / 2, h / 2, 34, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#2b2c31'; c.lineWidth = 4; c.stroke(); });
  tex.t.wrapS = tex.t.wrapT = THREE.RepeatWrapping; tex.t.repeat.set(L / 0.025, W / 0.025);
  const topM = new THREE.MeshPhysicalMaterial({ map: tex.t, roughness: 0.45, metalness: 0.5, clearcoat: 0.15 });
  const b = mesh(new THREE.BoxGeometry(L, t, W), [M.anod, M.anod, topM, M.anod, M.anod, M.anod]); b.position.y = t / 2;
  const g = new THREE.Group(); g.add(b); g.name = name || `${EN ? 'Optical breadboard' : 'Płyta optyczna'} ${Math.round(L * 1000)} × ${Math.round(W * 1000)} mm`;
  g.userData = { L, W, t, mass: L * W * t * 2700 * 0.85, ports: { top: port(EN ? 'M6 holes, 25 mm grid' : 'Otwory M6 co 25 mm', DOMAIN.rot, 'mocowanie') } };
  return g;
}
