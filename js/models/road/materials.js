// RoadKit — materiały i tekstury pojazdów drogowych (lakier z lakierem bezbarwnym, chrom, szkło, guma,
// plastik, klosze lamp, tablice). Tekstury rysowane na kanwie, raz na stronę (pamięć podręczna).
import * as THREE from '../../../vendor/three/three.module.js';

const cache = new Map();
const once = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = (c, srgb = true, repeat = false) => {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
};

// bieżnik opony (mapa wypukłości): klocki i rowki obwodowe; u wokół opony, v w poprzek profilu
export const treadBump = () => once('tread', () => {
  const [c, g] = canvas(1024, 128); g.fillStyle = '#808080'; g.fillRect(0, 0, 1024, 128);
  g.fillStyle = '#1a1a1a';
  for (const v of [30, 64, 98]) g.fillRect(0, v - 3, 1024, 6);                         // rowki obwodowe
  for (let u = 0; u < 1024; u += 16) { g.fillRect(u, 18, 4, 26); g.fillRect(u + 8, 50, 4, 28); g.fillRect(u, 84, 4, 26); }   // nacięcia klocków
  g.fillStyle = '#c0c0c0'; for (let u = 0; u < 1024; u += 16) { g.fillRect(u + 5, 0, 2, 14); g.fillRect(u + 5, 114, 2, 14); }  // barki
  return tex(c, false, true);
});
// bok opony: napis rozmiaru i drobne żebrowanie
export const sidewallMap = (size = '175/70 R13  82S') => once('sidewall' + size, () => {
  const [c, g] = canvas(1024, 64); g.fillStyle = '#1b1b1c'; g.fillRect(0, 0, 1024, 64);
  g.fillStyle = 'rgba(255,255,255,0.05)'; for (let u = 0; u < 1024; u += 6) g.fillRect(u, 10, 2, 44);
  g.fillStyle = '#2c2c2e'; g.font = 'bold 26px sans-serif'; g.textBaseline = 'middle';
  for (const u of [80, 590]) { g.fillText(size, u, 32); g.fillText('RADIAL · TUBELESS', u + 260, 32); }
  return tex(c, true, true);
});
// odbłyśnik reflektora (pod szkłem): paraboliczne pierścienie + soczewki szkła
export const headlampMap = () => once('headlamp', () => {
  const [c, g] = canvas(256, 128);
  const gr = g.createRadialGradient(128, 64, 4, 128, 64, 120); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.15, '#e9edf2'); gr.addColorStop(0.5, '#9aa3ad'); gr.addColorStop(1, '#5b636b');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = 'rgba(255,255,255,0.35)'; for (let r = 14; r < 140; r += 9) { g.beginPath(); g.ellipse(128, 64, r * 1.6, r, 0, 0, 7); g.stroke(); }
  g.strokeStyle = 'rgba(30,40,50,0.25)'; g.lineWidth = 1;
  for (let x = 0; x < 256; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  for (let y = 0; y < 128; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  return tex(c);
});
// klosz tylnej lampy: żebrowanie (pryzmaty) w kolorze kloszu
export const lensMap = (color) => once('lens' + color, () => {
  const [c, g] = canvas(128, 64); g.fillStyle = color; g.fillRect(0, 0, 128, 64);
  for (let x = 0; x < 128; x += 8) { const gr = g.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, 'rgba(255,255,255,0.28)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0.3)'); g.fillStyle = gr; g.fillRect(x, 0, 8, 64); }
  for (let y = 0; y < 64; y += 8) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, y, 128, 1); }
  return tex(c);
});
// czarna tablica rejestracyjna z PRL (białe znaki, ramka)
export const plateMap = (text) => once('plate' + text, () => {
  const [c, g] = canvas(512, 112); g.fillStyle = '#0d0d0f'; g.fillRect(0, 0, 512, 112);
  g.strokeStyle = '#d8d8d8'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 96);
  g.fillStyle = '#ececec'; g.font = 'bold 76px "DejaVu Sans Mono", Consolas, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 60);
  for (const x of [30, 482]) { g.beginPath(); g.arc(x, 56, 6, 0, 7); g.fillStyle = '#9a9a9a'; g.fill(); }
  return tex(c);
});
// listwy maskownicy słupka C (Polonez): poziome szczeliny
export const louverMap = () => once('louver', () => {
  const [c, g] = canvas(128, 256); g.fillStyle = '#16171a'; g.fillRect(0, 0, 128, 256);
  for (let y = 10; y < 256; y += 22) { g.fillStyle = '#050506'; g.fillRect(8, y, 112, 11); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(8, y + 11, 112, 2); }
  return tex(c);
});
// atrapa: poziome listwy
export const grilleMap = () => once('grille', () => {
  const [c, g] = canvas(256, 64); g.fillStyle = '#060607'; g.fillRect(0, 0, 256, 64);
  for (let y = 4; y < 64; y += 12) { g.fillStyle = '#1e2024'; g.fillRect(0, y, 256, 6); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, y, 256, 1); }
  return tex(c);
});
// drobny „brud” lakieru i tapicerka
export const fabricMap = (base) => once('fabric' + base, () => {
  const [c, g] = canvas(128, 128); g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)'; g.fillRect(Math.random() * 128, Math.random() * 128, 1, 1); }
  for (let y = 0; y < 128; y += 16) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, y, 128, 2); }
  return tex(c, true, true);
});
// tablica przyrządów: zegary
export const dialsMap = () => once('dials', () => {
  const [c, g] = canvas(256, 96); g.fillStyle = '#0b0b0c'; g.fillRect(0, 0, 256, 96);
  for (const [x, r] of [[64, 38], [176, 38], [234, 18]]) {
    g.fillStyle = '#141518'; g.beginPath(); g.arc(x, 48, r, 0, 7); g.fill();
    g.strokeStyle = '#d8d4c8'; g.lineWidth = 2; for (let a = -220; a <= 40; a += 20) { const t = a * Math.PI / 180; g.beginPath(); g.moveTo(x + Math.cos(t) * r * 0.82, 48 + Math.sin(t) * r * 0.82); g.lineTo(x + Math.cos(t) * r * 0.96, 48 + Math.sin(t) * r * 0.96); g.stroke(); }
    g.strokeStyle = '#ff7a2a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, 48); g.lineTo(x + Math.cos(-2.6) * r * 0.8, 48 + Math.sin(-2.6) * r * 0.8); g.stroke();
  }
  return tex(c);
});

// zestaw materiałów pojazdu (lakier w zadanym kolorze; reszta wspólna)
export function roadMaterials(paint) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  return {
    paint: new THREE.MeshPhysicalMaterial({ color: paint, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06 }),
    chrome: std({ color: 0xe2e5e8, metalness: 1, roughness: 0.12 }),
    satin: std({ color: 0xaeb3b8, metalness: 0.9, roughness: 0.35 }),
    black: std({ color: 0x141518, roughness: 0.55, metalness: 0.1 }),
    plastic: std({ color: 0x1d1e21, roughness: 0.72, metalness: 0.02 }),
    rubber: std({ color: 0x0e0e0f, roughness: 0.92, metalness: 0 }),
    liner: std({ color: 0x0a0a0b, roughness: 0.95, metalness: 0 }),
    under: std({ color: 0x2a2724, roughness: 0.9, metalness: 0.2 }),
    steel: std({ color: 0x5d6166, roughness: 0.5, metalness: 0.8 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x1b2730, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.42, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false }),
    tyre: std({ color: 0x1a1a1b, roughness: 0.88, metalness: 0, bumpMap: treadBump(), bumpScale: 2.5 }),
    sidewall: std({ map: sidewallMap(), roughness: 0.85, metalness: 0 }),
    headlamp: std({ map: headlampMap(), metalness: 0.9, roughness: 0.18, emissive: 0xfff4dc, emissiveIntensity: 0 }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.18, clearcoat: 1, depthWrite: false }),
    tail: std({ map: lensMap('#8a0d0f'), roughness: 0.18, metalness: 0.1, emissive: 0xff1a12, emissiveIntensity: 0.05 }),
    brake: std({ map: lensMap('#8a0d0f'), roughness: 0.18, metalness: 0.1, emissive: 0xff1a12, emissiveIntensity: 0.05 }),
    amber: std({ map: lensMap('#b8650c'), roughness: 0.18, metalness: 0.1, emissive: 0xff8a10, emissiveIntensity: 0 }),
    reverse: std({ map: lensMap('#d8dadc'), roughness: 0.18, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0 }),
    louver: std({ map: louverMap(), roughness: 0.6, metalness: 0.1 }),
    grille: std({ map: grilleMap(), roughness: 0.55, metalness: 0.2 }),
    seat: std({ map: fabricMap('#4a3a2e'), roughness: 0.95, metalness: 0 }),
    trim: std({ color: 0x3a3632, roughness: 0.85, metalness: 0, side: THREE.DoubleSide }),      // wykończenie wnętrza: widać je z obu stron
    headliner: std({ color: 0xb8b0a2, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }),
    carpet: std({ map: fabricMap('#2a2622'), roughness: 1, metalness: 0 }),
    dash: std({ color: 0x17181a, roughness: 0.7, metalness: 0.05 }),
    dials: std({ map: dialsMap(), roughness: 0.4, metalness: 0, emissive: 0xffffff, emissiveMap: dialsMap(), emissiveIntensity: 0 }),
  };
}
// naklejka: rysowana nad powierzchnią pod nią (przesunięcie głębokości) — linie podziału, listwy, ramki, wkładki;
// doktor modeli pomija naklejki z polygonOffset przy szukaniu migotania (tools/doctor/modeldoctor.js)
export function decal(m) { const d = m.clone(); d.polygonOffset = true; d.polygonOffsetFactor = -2; d.polygonOffsetUnits = -4; return d; }
export const plateMaterial = (text) => new THREE.MeshStandardMaterial({ map: plateMap(text), roughness: 0.45, metalness: 0.3 });

// szum do brudu i zużycia (wartości 0..255, powtarzalny); scale — wielkość plam
export const noiseMap = (seed = 1, size = 512, scale = 6) => once('noise' + seed + '/' + size + '/' + scale, () => {
  const [c, g] = canvas(size, size), img = g.createImageData(size, size);
  let a = seed * 9301 + 49297; const rnd = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
  const N = scale, grid = []; for (let i = 0; i <= N; i++) { grid.push([]); for (let j = 0; j <= N; j++) grid[i].push(rnd()); }
  for (let i = 0; i <= N; i++) { grid[i][N] = grid[i][0]; grid[N][i] = grid[0][i]; }
  const sm = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = x / size * N, fy = y / size * N, i = fx | 0, j = fy | 0, u = sm(fx - i), v = sm(fy - j);
    const big = grid[i][j] * (1 - u) * (1 - v) + grid[i + 1][j] * u * (1 - v) + grid[i][j + 1] * (1 - u) * v + grid[i + 1][j + 1] * u * v;
    const val = Math.max(0, Math.min(255, (big * 0.75 + rnd() * 0.25) * 255)), k = (y * size + x) * 4;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = val; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0); return tex(c, false, true);
});
// farba matowa z brudem (pojazdy wojskowe, użytkowe): kolor × plamy, chropowatość z szumu
export function mattePaint(color, { dirt = 0.35, rough = 0.82, seed = 3 } = {}) {
  const [c, g] = canvas(512, 512); const n = noiseMap(seed, 512, 7).image;
  g.fillStyle = '#' + new THREE.Color(color).getHexString(); g.fillRect(0, 0, 512, 512);
  g.globalAlpha = dirt; g.globalCompositeOperation = 'multiply'; g.drawImage(n, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  const map = tex(c, true, true);
  return new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: 0.08, roughnessMap: noiseMap(seed + 7, 256, 5), bumpMap: noiseMap(seed + 11, 512, 40), bumpScale: 0.6 });
}
export const textMap = (lines, { w = 512, h = 128, bg = '#000', fg = '#ffb000', font = 'bold 72px sans-serif', align = 'center' } = {}) => once('text' + lines.join('|') + w + h + bg + fg + font, () => {
  const [c, g] = canvas(w, h); g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = font; g.textBaseline = 'middle'; g.textAlign = align;
  lines.forEach((t, i) => g.fillText(t, align === 'center' ? w / 2 : 12, h * (i + 0.5) / lines.length));
  return tex(c);
});
