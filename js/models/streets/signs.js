// StreetKit — polskie znaki drogowe (buildSign).
import * as THREE from '../../../vendor/three/three.module.js';
import { canvasTex } from './geom.js';
import { wheelchair } from './parking.js';
import { steel } from './signals.js';

/* ---------------- znaki drogowe ---------------- */
// Polskie znaki drogowe (rozporządzenie o znakach i sygnałach): ostrzegawcze A (trójkąt, żółte tło, czerwona obwódka),
// zakazu B (koło z czerwoną obwódką), nakazu C (niebieskie koło), informacyjne D (niebieski prostokąt). Tarcza
// rysowana na płótnie, z białym odblaskowym brzegiem; tył szary; słupek ocynkowany Ø 60 mm. Wymiary jak znaki średnie.
//   SIGNS   id → { code, label }
//   buildSign(id, { height, tab }) → { group }   (przód: +z; tab 'T-29' — tabliczka „osoba na wózku” pod znakiem)
export const SIGNS = {
  'A-7': { code: 'A-7', label: 'Ustąp pierwszeństwa' }, 'A-16': { code: 'A-16', label: 'Przejście dla pieszych (ostrzegawczy)' },
  'A-17': { code: 'A-17', label: 'Dzieci' }, 'B-1': { code: 'B-1', label: 'Zakaz ruchu w obu kierunkach' }, 'B-2': { code: 'B-2', label: 'Zakaz wjazdu' },
  'B-20': { code: 'B-20', label: 'Stop' }, 'B-33': { code: 'B-33', label: 'Ograniczenie prędkości 50' }, 'B-36': { code: 'B-36', label: 'Zakaz zatrzymywania się' },
  'C-12': { code: 'C-12', label: 'Ruch okrężny' }, 'C-13': { code: 'C-13', label: 'Droga dla rowerów' }, 'D-1': { code: 'D-1', label: 'Droga z pierwszeństwem' },
  'D-6': { code: 'D-6', label: 'Przejście dla pieszych' }, 'D-18': { code: 'D-18', label: 'Parking' },
};
const RED = '#c8102e', YEL = '#f6b800', BLU = '#0050a0';
function pedestrian(c, x, y, s, col) {   // pieszy (piktogram)
  c.fillStyle = col; c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = s * 0.13;
  c.beginPath(); c.arc(x + s * 0.05, y - s * 0.42, s * 0.1, 0, 7); c.fill();
  c.beginPath(); c.moveTo(x + s * 0.02, y - s * 0.28); c.lineTo(x - s * 0.04, y + s * 0.05); c.lineTo(x - s * 0.2, y + s * 0.4); c.moveTo(x - s * 0.04, y + s * 0.05); c.lineTo(x + s * 0.16, y + s * 0.4);
  c.moveTo(x + s * 0.0, y - s * 0.22); c.lineTo(x - s * 0.2, y - s * 0.02); c.moveTo(x + s * 0.0, y - s * 0.22); c.lineTo(x + s * 0.2, y - s * 0.05); c.stroke();
}
function bicycle(c, x, y, s, col) {
  c.strokeStyle = col; c.lineWidth = s * 0.07;
  for (const dx of [-0.28, 0.28]) { c.beginPath(); c.arc(x + dx * s, y + s * 0.12, s * 0.2, 0, 7); c.stroke(); }
  c.beginPath(); c.moveTo(x - s * 0.28, y + s * 0.12); c.lineTo(x - s * 0.05, y - s * 0.15); c.lineTo(x + s * 0.2, y - s * 0.15); c.lineTo(x + s * 0.28, y + s * 0.12); c.moveTo(x - s * 0.05, y - s * 0.15); c.lineTo(x + s * 0.02, y + s * 0.12); c.lineTo(x + s * 0.2, y - s * 0.15); c.stroke();
}
function signFace(id) {
  const N = 512, cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d'), m = N / 2;
  const tri = (up) => { c.beginPath(); if (up) { c.moveTo(m, 30); c.lineTo(N - 20, N - 60); c.lineTo(20, N - 60); } else { c.moveTo(20, 60); c.lineTo(N - 20, 60); c.lineTo(m, N - 30); } c.closePath(); };
  const circ = (r) => { c.beginPath(); c.arc(m, m, r, 0, 7); };
  let shape = 'circle';
  if (id.startsWith('A-')) {
    shape = id === 'A-7' ? 'triDown' : 'tri';
    c.lineJoin = 'round';
    tri(id !== 'A-7'); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 28; c.strokeStyle = '#fff'; c.stroke();
    tri(id !== 'A-7'); c.lineWidth = 44; c.strokeStyle = RED; c.save(); c.clip(); c.stroke(); c.restore();
    c.save(); tri(id !== 'A-7'); c.clip(); c.beginPath(); c.fillStyle = YEL; c.globalCompositeOperation = 'source-over';
    // żółte wnętrze (wewnątrz czerwonej obwódki)
    c.translate(m, id === 'A-7' ? m - 40 : m + 40); c.scale(0.74, 0.74); c.translate(-m, -(id === 'A-7' ? m - 40 : m + 40)); tri(id !== 'A-7'); c.fill(); c.restore();
    if (id === 'A-16') pedestrian(c, m, m + 70, 200, '#111');
    if (id === 'A-17') { pedestrian(c, m - 45, m + 85, 150, '#111'); pedestrian(c, m + 50, m + 95, 120, '#111'); }
  } else if (id.startsWith('B-')) {
    if (id === 'B-20') {
      shape = 'oct';
      c.beginPath(); for (let k = 0; k < 8; k++) { const t = Math.PI / 8 + k * Math.PI / 4; c.lineTo(m + Math.cos(t) * 245, m + Math.sin(t) * 245); } c.closePath(); c.fillStyle = '#fff'; c.fill();
      c.beginPath(); for (let k = 0; k < 8; k++) { const t = Math.PI / 8 + k * Math.PI / 4; c.lineTo(m + Math.cos(t) * 225, m + Math.sin(t) * 225); } c.closePath(); c.fillStyle = RED; c.fill();
      c.fillStyle = '#fff'; c.font = 'bold 150px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('STOP', m, m + 8);
    } else {
      circ(250); c.fillStyle = '#fff'; c.fill();
      circ(232); c.fillStyle = id === 'B-36' ? BLU : id === 'B-2' ? RED : '#fff'; c.fill();
      circ(232); c.lineWidth = 50; c.strokeStyle = RED; c.save(); c.clip(); c.stroke(); c.restore();
      if (id === 'B-2') { c.fillStyle = '#fff'; c.fillRect(m - 150, m - 36, 300, 72); }
      if (id === 'B-33') { c.fillStyle = '#111'; c.font = 'bold 220px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('50', m, m + 12); }
      if (id === 'B-36') { c.save(); circ(205); c.clip(); c.strokeStyle = RED; c.lineWidth = 46; c.beginPath(); c.moveTo(m - 170, m - 170); c.lineTo(m + 170, m + 170); c.moveTo(m + 170, m - 170); c.lineTo(m - 170, m + 170); c.stroke(); c.restore(); }
    }
  } else if (id.startsWith('C-')) {
    circ(250); c.fillStyle = '#fff'; c.fill(); circ(236); c.fillStyle = BLU; c.fill();
    if (id === 'C-13') bicycle(c, m, m, 330, '#fff');
    if (id === 'C-12') { c.strokeStyle = '#fff'; c.lineWidth = 40; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(m, m, 120, k * 2.094 + 0.3, k * 2.094 + 1.6); c.stroke(); const t = k * 2.094 + 1.6; c.fillStyle = '#fff'; c.beginPath(); c.moveTo(m + Math.cos(t) * 165, m + Math.sin(t) * 165); c.lineTo(m + Math.cos(t) * 75, m + Math.sin(t) * 75); c.lineTo(m + Math.cos(t + 0.45) * 120, m + Math.sin(t + 0.45) * 120); c.fill(); } }
  } else if (id === 'D-1') {
    shape = 'diamond';
    const d = (r) => { c.beginPath(); c.moveTo(m, m - r); c.lineTo(m + r, m); c.lineTo(m, m + r); c.lineTo(m - r, m); c.closePath(); };
    d(250); c.fillStyle = '#fff'; c.fill(); d(225); c.fillStyle = '#111'; c.fill(); d(205); c.fillStyle = '#fff'; c.fill(); d(150); c.fillStyle = YEL; c.fill();
  } else {
    shape = 'square';
    c.fillStyle = '#fff'; c.fillRect(0, 0, N, N); c.fillStyle = BLU; c.fillRect(16, 16, N - 32, N - 32);
    if (id === 'D-6') { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(m, 70); c.lineTo(N - 60, N - 80); c.lineTo(60, N - 80); c.closePath(); c.fill(); pedestrian(c, m, m + 70, 210, '#111'); for (let k = 0; k < 5; k++) { c.fillStyle = '#111'; c.fillRect(120 + k * 58, N - 120, 32, 22); } }
    if (id === 'D-18') { c.fillStyle = '#fff'; c.font = 'bold 380px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('P', m, m + 20); }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { tex: t, shape };
}
const signCache = new Map();
// tabliczka T-29 (osoba na wózku) pod znakiem: biała z czarną obwódką
let t29 = null;
function plateT29() {
  if (!t29) t29 = canvasTex(256, 160, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.strokeStyle = '#111'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20); wheelchair(c, w / 2, h / 2 + 4, 120, '#1f5fa8'); }, false);
  return t29;
}
export function buildSign(id = 'B-20', { height = 2.2, tab = null } = {}) {
  const g = new THREE.Group(); g.name = 'znak ' + id;
  if (!signCache.has(id)) signCache.set(id, signFace(id));
  const { tex, shape } = signCache.get(id);
  const size = shape === 'tri' || shape === 'triDown' ? 0.9 : shape === 'diamond' ? 0.85 : 0.6;   // znaki średnie
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, height + size * 0.5, 10), steel());
  post.position.y = (height + size * 0.5) / 2; post.castShadow = true; g.add(post);
  // tarcza: kształt znaku wycięty z kwadratu (przezroczystość z obrazu) + szary tył
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, roughness: 0.45, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.06 }));
  plate.position.set(0, height + size * 0.15, 0.04); plate.castShadow = true; g.add(plate);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: 0x8d9296, roughness: 0.5, metalness: 0.6, alphaMap: alphaOf(id, tex), transparent: true, alphaTest: 0.5 }));
  back.rotation.y = Math.PI; back.position.set(0, height + size * 0.15, 0.0395); g.add(back);   // tył tuż za tarczą (bez szczeliny na brzegu)
  for (const dy of [-0.18, 0.18]) { const cl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.05), steel()); cl.position.set(0, height + size * 0.15 + dy * size, 0.0); g.add(cl); }   // obejmy za tarczą
  if (tab === 'T-29') {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), new THREE.MeshStandardMaterial({ map: plateT29(), roughness: 0.45, emissive: 0xffffff, emissiveMap: plateT29(), emissiveIntensity: 0.06 }));
    pl.position.set(0, height + size * 0.15 - size / 2 - 0.17, 0.04); g.add(pl);
    const bk = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), new THREE.MeshStandardMaterial({ color: 0x8d9296, roughness: 0.5, metalness: 0.6 })); bk.rotation.y = Math.PI; bk.position.copy(pl.position).setZ(0.035); g.add(bk);
  }
  return { group: g, size };
}
// maska kształtu tarczy (biały — tarcza) z kanału alfa obrazu znaku
const alphaCache = new Map();
function alphaOf(id, tex) {
  if (alphaCache.has(id)) return alphaCache.get(id);
  const src = tex.image, cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
  c.drawImage(src, 0, 0, 128, 128); const d = c.getImageData(0, 0, 128, 128);
  for (let i = 0; i < d.data.length; i += 4) { const a = d.data[i + 3]; d.data[i] = d.data[i + 1] = d.data[i + 2] = a; d.data[i + 3] = 255; }
  c.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(cv); alphaCache.set(id, t); return t;
}
