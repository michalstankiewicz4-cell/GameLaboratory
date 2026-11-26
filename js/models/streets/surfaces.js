// StreetKit — nawierzchnie i przekroje: SURFACES (opisy MatKit), SLABS (płyty chodnikowe z własnego generatora tekstur:
// spoiny, odcień każdej płyty, wypukłości), PROFILES (gotowe przekroje tras), surface(id) → materiał, paint (farba oznakowania).
import * as THREE from '../../../vendor/three/three.module.js';
import { makeMaterial } from '../../render/materials/matkit.js';

export const SURFACES = {
  asphalt: { label: 'Asfalt', kind: 'concrete', color: '#3b3c3e', color2: '#28292b', tile: 3, roughness: 0.92, metalness: 0, pores: 0.9, wear: 0.25, dirt: 0.25 },
  asphaltOld: { label: 'Asfalt stary (łaty)', kind: 'concrete', color: '#4a4a4a', color2: '#2c2c2d', tile: 4, roughness: 0.95, metalness: 0, pores: 0.7, wear: 0.6, dirt: 0.45 },
  // płyty chodnikowe — własny generator (kwadraty ze spoinami, odcień każdej płyty, wypukłości): style w SLABS
  slabs: { label: 'Płyty 50 × 50 szare', slab: 'p50' },
  slabs35: { label: 'Płyty 35 × 35', slab: 'p35' },
  slabs30: { label: 'Płyty 30 × 30 grafitowe', slab: 'p30' },
  slabsOld: { label: 'Płyty 50 × 50 stare (spękane)', slab: 'old' },
  slabsChecker: { label: 'Płyty 50 × 50 szachownica', slab: 'checker' },
  slabsBig: { label: 'Płyty 100 × 50 granitowe', slab: 'big' },
  slabsTactile: { label: 'Płyty z wypustkami (dla niewidomych)', slab: 'tactile' },
  trylinka: { label: 'Trylinka (sześciokąty)', slab: 'hex' },
  pavers: { label: 'Kostka brukowa', kind: 'brick', color: '#8f8b84', color2: '#5e5b56', tile: 0.6, roughness: 0.9, metalness: 0, bricks: 6, wear: 0.25, dirt: 0.35 },
  redPavers: { label: 'Kostka czerwona (rowery)', kind: 'brick', color: '#8a4a3c', color2: '#5a3027', tile: 0.6, roughness: 0.9, metalness: 0, bricks: 6, wear: 0.2, dirt: 0.3 },
  gravel: { label: 'Kruszywo', kind: 'rock', color: '#8a8072', color2: '#5c554b', tile: 2, roughness: 0.97, metalness: 0, cracks: 0.05, grains: 1, dirt: 0.3 },
  curb: { label: 'Krawężnik granitowy', kind: 'rock', color: '#9a978f', color2: '#6a6862', tile: 1, roughness: 0.8, metalness: 0, cracks: 0.1, grains: 0.8, dirt: 0.2 },
  grass: { label: 'Trawnik', kind: 'rock', color: '#4f6a34', color2: '#36502a', tile: 2, roughness: 1, metalness: 0, cracks: 0, grains: 0.6, dirt: 0.15 },
  sod: { label: 'Darń na skarpie', kind: 'rock', color: '#5b6a38', color2: '#4a4430', tile: 3, roughness: 1, metalness: 0, cracks: 0.05, grains: 0.9, dirt: 0.5 },
};
// przekroje: pasy od osi na zewnątrz (symetrycznie po obu stronach), wysokości nad jezdnią
//   lanes — liczba pasów ruchu łącznie, laneW — szerokość pasa; strips — co jest za jezdnią po każdej stronie
export const PROFILES = {
  city: { label: 'Ulica miejska', lanes: 2, laneW: 3.25, road: 'asphalt', marks: { center: 'dashed', edge: false },
    strips: [{ k: 'curb', w: 0.15, h: 0.14 }, { k: 'sidewalk', w: 2.5, h: 0.14, s: 'slabs' }, { k: 'verge', w: 1.5, h: 0.14, s: 'grass' }] },
  avenue: { label: 'Aleja (dwie jezdnie)', lanes: 2, laneW: 3.5, road: 'asphalt', median: 3, marks: { center: 'dashed', edge: true },
    strips: [{ k: 'curb', w: 0.15, h: 0.14 }, { k: 'sidewalk', w: 2, h: 0.14, s: 'pavers' }, { k: 'cycle', w: 2, h: 0.14, s: 'redPavers' }, { k: 'sidewalk', w: 2.5, h: 0.14, s: 'slabsBig' }] },
  village: { label: 'Droga wiejska', lanes: 2, laneW: 2.9, road: 'asphaltOld', marks: { center: false, edge: false },
    strips: [{ k: 'shoulder', w: 1.0, h: -0.02, s: 'gravel' }, { k: 'verge', w: 1.2, h: -0.15, s: 'grass' }] },
  path: { label: 'Ścieżka', lanes: 1, laneW: 1.8, road: 'gravel', marks: { center: false, edge: false }, strips: [{ k: 'edge', w: 0.08, h: 0.06, s: 'curb' }] },
  cycle: { label: 'Droga dla rowerów i chodnik', lanes: 1, laneW: 2.2, road: 'redPavers', marks: { center: 'dashed', edge: false },
    strips: [{ k: 'curb', w: 0.1, h: 0.03 }, { k: 'sidewalk', w: 2.0, h: 0.03, s: 'pavers' }] },
};

// style płyt: rozmiar płyty [szer., dł.] m, spoina m, barwy (losowo na płytę), co ile płyt kafelek tekstury, dodatki
export const SLABS = {
  p50: { size: [0.5, 0.5], joint: 0.006, colors: ['#a9a69f', '#a29f98', '#aeaba3', '#9d9a93'], n: [4, 4], wear: 0.25 },
  p35: { size: [0.35, 0.35], joint: 0.005, colors: ['#b3afa6', '#aaa69d', '#b8b4ab'], n: [6, 6], wear: 0.2 },
  p30: { size: [0.3, 0.3], joint: 0.004, colors: ['#5c5d60', '#55565a', '#626366'], n: [6, 6], wear: 0.15 },
  old: { size: [0.5, 0.5], joint: 0.012, colors: ['#9b968c', '#8f8a80', '#a39e94', '#878279'], n: [4, 4], wear: 0.7, cracks: 0.3, tilt: 0.5, moss: 0.4 },
  checker: { size: [0.5, 0.5], joint: 0.006, colors: ['#aaa79f', '#5e5f62'], n: [4, 4], wear: 0.2, checker: true },
  big: { size: [1.0, 0.5], joint: 0.004, colors: ['#8d8c88', '#868580', '#94938e'], n: [2, 4], wear: 0.1, speckle: 0.9, bond: 0.5 },
  tactile: { size: [0.3, 0.3], joint: 0.005, colors: ['#d8b23a', '#d2ac35'], n: [6, 6], wear: 0.25, dots: true },
  hex: { size: [0.3, 0.26], joint: 0.008, colors: ['#9d998f', '#948f86', '#a5a196'], n: [6, 8], wear: 0.35, hex: true, holes: true },
};
function rngS(seed) { let x = seed >>> 0 || 1; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; }
// tekstura płyt (barwa + mapa wysokości do bumpMap) na kafelek n[0] × n[1] płyt; kafelek ma tile = n · rozmiar m
function slabMaterial(id) {
  const D = SLABS[id], R = 512, r = rngS(id.length * 7919 + 13);
  const W = D.hex ? D.size[0] * D.n[0] : D.size[0] * D.n[0], H = D.size[1] * D.n[1], px = R / W;   // pikseli na metr (kafelek kwadratowy w pikselach)
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const A = cv(R, Math.round(H * px)), B = cv(R, Math.round(H * px)), a = A.getContext('2d'), b = B.getContext('2d');
  a.fillStyle = '#3d3b37'; a.fillRect(0, 0, A.width, A.height); b.fillStyle = '#000'; b.fillRect(0, 0, B.width, B.height);   // spoiny: ciemne i niskie
  const J = Math.max(1, D.joint * px);
  const shade = (k) => { const c = D.colors[Math.floor(r() * D.colors.length)]; return k == null ? c : D.colors[k % D.colors.length]; };
  function slab(path, i, j, cx, cy) {
    const col = D.checker ? shade((i + j) % 2) : shade();
    a.save(); path(); a.clip();
    a.fillStyle = col; a.fillRect(0, 0, A.width, A.height);
    // ziarno i plamy na płycie, zużycie (jaśniejsze środki, ciemne brzegi)
    for (let k = 0; k < 140 * (D.speckle ? 3 : 1); k++) { a.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${(D.speckle ? 0.12 : 0.05) * r()})`; const s = 1 + r() * (D.speckle ? 1.5 : 3); a.fillRect(cx + (r() - 0.5) * px * D.size[0], cy + (r() - 0.5) * px * D.size[1], s, s); }
    if (D.wear) { const g = a.createRadialGradient(cx, cy, 0, cx, cy, px * D.size[0] * 0.8); g.addColorStop(0, `rgba(255,255,255,${0.06 * D.wear})`); g.addColorStop(1, `rgba(0,0,0,${0.12 * D.wear})`); a.fillStyle = g; a.fillRect(0, 0, A.width, A.height); }
    if (D.moss && r() < D.moss) { a.fillStyle = 'rgba(70,90,40,0.35)'; a.fillRect(cx - px * D.size[0] / 2, cy - px * D.size[1] / 2 + r() * px * 0.4, px * D.size[0], 3); }
    a.restore();
    // wysokość: płyta wyżej niż spoina; stare płyty przekrzywione (gradient), pęknięcia — rysy w dół
    b.save(); path(); b.clip();
    const lv = 0.75 + (D.tilt ? (r() - 0.5) * 0.4 * D.tilt : 0) * 1;
    if (D.tilt) { const g = b.createLinearGradient(cx - px * 0.25, cy - px * 0.25, cx + px * 0.25, cy + px * 0.25); const v0 = Math.round(255 * Math.min(1, lv + 0.1 * (r() - 0.5))), v1 = Math.round(255 * Math.min(1, lv + 0.15 * (r() - 0.5))); g.addColorStop(0, `rgb(${v0},${v0},${v0})`); g.addColorStop(1, `rgb(${v1},${v1},${v1})`); b.fillStyle = g; }
    else b.fillStyle = `rgb(${Math.round(255 * lv)},${Math.round(255 * lv)},${Math.round(255 * lv)})`;
    b.fillRect(0, 0, B.width, B.height);
    if (D.dots) for (let u = 0; u < 5; u++) for (let v = 0; v < 5; v++) {   // wypustki: 5 × 5 kopułek na płycie 30 × 30
      const x = cx + (u - 2) * px * D.size[0] / 5.5, y = cy + (v - 2) * px * D.size[1] / 5.5, rr = px * 0.012;
      const g = b.createRadialGradient(x, y, 0, x, y, rr * 1.4); g.addColorStop(0, '#fff'); g.addColorStop(1, `rgba(255,255,255,0)`); b.fillStyle = g; b.fillRect(x - rr * 2, y - rr * 2, rr * 4, rr * 4);
      a.fillStyle = 'rgba(255,255,255,0.12)'; a.beginPath(); a.arc(x, y, rr, 0, 7); a.fill();
    }
    if (D.cracks && r() < D.cracks) {
      let x = cx + (r() - 0.5) * px * D.size[0], y = cy - px * D.size[1] / 2; b.strokeStyle = '#000'; a.strokeStyle = 'rgba(30,28,25,0.7)'; b.lineWidth = 1.5; a.lineWidth = 0.8;
      b.beginPath(); a.beginPath(); b.moveTo(x, y); a.moveTo(x, y);
      const ang = (r() - 0.5) * 1.6, steps = 3 + Math.floor(r() * 4);   // pęknięcie w losowym kierunku, krótsze lub przez całą płytę
      for (let k = 0; k < steps; k++) { x += Math.sin(ang) * px * D.size[1] / 6 + (r() - 0.5) * px * 0.06; y += Math.cos(ang) * px * D.size[1] / 6; b.lineTo(x, y); a.lineTo(x, y); }
      b.stroke(); a.stroke();
    }
    if (D.holes) { a.fillStyle = 'rgba(40,50,30,0.9)'; a.beginPath(); a.arc(cx, cy, px * 0.035, 0, 7); a.fill(); b.fillStyle = '#000'; b.beginPath(); b.arc(cx, cy, px * 0.035, 0, 7); b.fill(); }
    b.restore();
  }
  const sw = D.size[0] * px, sh = D.size[1] * px;
  if (D.hex) {
    // trylinka: sześciokąty w rzędach przesuniętych o pół (kafelek zawija się)
    const rad = sw / Math.sqrt(3) * 1.0, dy = rad * 1.5;
    for (let j = -1; j <= Math.ceil(A.height / dy) + 1; j++) for (let i = -1; i <= Math.ceil(A.width / sw) + 1; i++) {
      const cx = i * sw + (j % 2 ? sw / 2 : 0), cy = j * dy;
      slab(() => { a.beginPath(); b.beginPath(); for (let k = 0; k < 6; k++) { const t = Math.PI / 6 + k * Math.PI / 3, x = cx + Math.cos(t) * (rad - J / 2), y = cy + Math.sin(t) * (rad - J / 2); if (k) { a.lineTo(x, y); b.lineTo(x, y); } else { a.moveTo(x, y); b.moveTo(x, y); } } a.closePath(); b.closePath(); }, i, j, cx, cy);
    }
  } else {
    for (let j = 0; j < D.n[1]; j++) for (let i = -1; i <= D.n[0]; i++) {
      const off = D.bond ? (j % 2) * sw * D.bond : 0, x = i * sw + off, y = j * sh;
      slab(() => { for (const c of [a, b]) { c.beginPath(); c.rect(x + J / 2, y + J / 2, sw - J, sh - J); } }, i, j, x + sw / 2, y + sh / 2);
    }
  }
  const map = new THREE.CanvasTexture(A), bump = new THREE.CanvasTexture(B);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  const m = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 2.5, roughness: D.speckle ? 0.6 : 0.9, metalness: 0 });
  // kafelek: W m szerokości; uv wstęgi = metry / tile — tekstura nie jest kwadratowa, więc skala v osobno
  m.userData.tile = W; m.userData.tileV = H;
  if (map.image.height !== map.image.width) { map.repeat.set(1, W / H); bump.repeat.set(1, W / H); }
  return m;
}
const matCache = new Map();
export function surface(id) {
  if (!matCache.has(id)) {
    const d = SURFACES[id];
    const m = d.slab ? slabMaterial(d.slab) : makeMaterial(d, { res: 512 }).material;
    if (!d.slab) m.userData.tile = d.tile;
    matCache.set(id, m);
  }
  return matCache.get(id);
}
export const paint = new THREE.MeshStandardMaterial({ color: 0xe8e8e2, roughness: 0.6, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
