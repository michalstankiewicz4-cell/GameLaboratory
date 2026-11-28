// ClockKit — tarcza zegara (posrebrzana, grawerowana: pierścień minutowy, sekundnik, tarcza godzinowa) i wskazówki.
import * as THREE from '../../../../vendor/three/three.module.js';
import { TAU, mesh, circle, slab, cylZ, materials } from '../common.js';

/* ---------------- tarcza zegara (posrebrzana, grawerowana) ---------------- */
export function dialTexture({ subS = [0, 0.045], subH = [0, -0.028], R = 0.11 } = {}) {
  const N = 2048, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), s = N / (2 * R), X = (u) => N / 2 + u * s, Yy = (v) => N / 2 - v * s;
  // posrebrzenie: drobne koncentryczne prążki
  x.fillStyle = '#d9dbd8'; x.fillRect(0, 0, N, N);
  for (let r = 4; r < N * 0.75; r += 3) { x.strokeStyle = `rgba(${200 + (r * 37) % 30},${202 + (r * 53) % 28},${200 + (r * 17) % 30},0.35)`; x.beginPath(); x.arc(N / 2, N / 2, r, 0, TAU); x.stroke(); }
  x.strokeStyle = '#1a1a1c'; x.fillStyle = '#1a1a1c'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const ring = (cx, cy, r0, r1, n, major, fontR, labels, font) => {
    x.lineWidth = 3; x.beginPath(); x.arc(X(cx), Yy(cy), r0 * s, 0, TAU); x.stroke(); x.beginPath(); x.arc(X(cx), Yy(cy), r1 * s, 0, TAU); x.stroke();
    for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = i % major === 0 ? r0 - (r1 - r0) * 0.6 : r0; x.lineWidth = i % major === 0 ? 5 : 2.5; x.beginPath(); x.moveTo(X(cx + Math.sin(a) * rr), Yy(cy + Math.cos(a) * rr)); x.lineTo(X(cx + Math.sin(a) * r1), Yy(cy + Math.cos(a) * r1)); x.stroke(); }
    if (labels) { x.font = font; labels.forEach((t, i) => { const a = i / labels.length * TAU; x.fillText(t, X(cx + Math.sin(a) * fontR), Yy(cy + Math.cos(a) * fontR)); }); }
  };
  ring(0, 0, 0.096, 0.104, 60, 5, 0.0902, ['60', '5', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'], `600 ${Math.round(0.011 * s)}px Georgia, serif`);
  ring(subS[0], subS[1], 0.024, 0.029, 60, 5, 0.0205, ['60', '', '10', '', '20', '', '30', '', '40', '', '50', ''], `500 ${Math.round(0.0052 * s)}px Georgia, serif`);
  ring(subH[0], subH[1], 0.022, 0.027, 12, 3, 0.0175, ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'], `500 ${Math.round(0.005 * s)}px Georgia, serif`);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// wskazówka: kształt w xy (oś w 0, w górę), stal oksydowana, przeciwwaga
export function hand(len, w, tail, kind, z) {
  const M = materials(), s = new THREE.Shape();
  if (kind === 'spade') { s.moveTo(-w / 2, -tail); s.lineTo(w / 2, -tail); s.lineTo(w * 0.28, len * 0.7); s.lineTo(w * 1.1, len * 0.78); s.lineTo(0, len); s.lineTo(-w * 1.1, len * 0.78); s.lineTo(-w * 0.28, len * 0.7); s.closePath(); }
  else { s.moveTo(-w / 2, -tail); s.lineTo(w / 2, -tail); s.lineTo(w * 0.25, len); s.lineTo(-w * 0.25, len); s.closePath(); }
  s.holes.push(circle(0.0006, 12));
  const g = new THREE.Group(); g.add(mesh(slab(s, 0.0005, 0, 0.00005, 6), M.blued)); const boss = mesh(cylZ(0.0022, 0.0018, 24), M.blued); boss.position.z = 0.0009; g.add(boss); g.position.z = z;
  const cw = mesh(cylZ(w * 0.9, 0.0005, 20), M.blued); cw.position.set(0, -tail, 0.00025); g.add(cw);
  return g;
}
