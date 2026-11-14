// Tekstury proceduralne (canvas 2D) dla materiałów z js/models/materials.js — tylko w przeglądarce.
// applyTextures() dokłada mapy wszystkim utworzonym materiałom wg pola `tex` ich opisu (raz na materiał).
import * as THREE from '../../vendor/three/three.module.js';
import { allMaterials } from '../models/materials.js';
import { rng } from '../models/geom.js';

let maxAniso = 8;
export function setAnisotropy(n) { maxAniso = n; }

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, { srgb = true, repeat = [1, 1] } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.anisotropy = maxAniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** Szum wartości 2D, bezszwowy w okresie (px, py). */
function valueNoise(w, h, cell, seed = 1) {
  const r = rng(seed), gx = Math.max(1, Math.round(w / cell)), gy = Math.max(1, Math.round(h / cell));
  const G = Array.from({ length: gx * gy }, () => r());
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = (x / w) * gx, fy = (y / h) * gy, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = G[(y0 % gy) * gx + (x0 % gx)], b = G[(y0 % gy) * gx + ((x0 + 1) % gx)], c = G[((y0 + 1) % gy) * gx + (x0 % gx)], d = G[((y0 + 1) % gy) * gx + ((x0 + 1) % gx)];
    out[y * w + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  return out;
}
function fbm(w, h, cells, seed) {
  const out = new Float32Array(w * h); let amp = 1, tot = 0;
  cells.forEach((c, i) => { const n = valueNoise(w, h, c, seed + i * 17); for (let k = 0; k < out.length; k++) out[k] += n[k] * amp; tot += amp; amp *= 0.5; });
  for (let k = 0; k < out.length; k++) out[k] /= tot;
  return out;
}
/** Szara mapa (wysokość / szorstkość) z tablicy 0…1. */
function grayCanvas(w, h, f) {
  const [c, x] = canvas(w, h), img = x.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = Math.max(0, Math.min(255, f[i] * 255)); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0); return c;
}

const RECIPES = {
  // guma: drobny szum w szorstkości i wypukłości, lekkie przetarcia
  rubber(m) {
    const S = 256, n = fbm(S, S, [64, 16, 4], 3);
    const rough = n.map((v) => 0.75 + v * 0.25);
    m.roughnessMap = tex(grayCanvas(S, S, rough), { srgb: false, repeat: [8, 2] });
    m.bumpMap = tex(grayCanvas(S, S, fbm(S, S, [8, 3], 9)), { srgb: false, repeat: [8, 2] }); m.bumpScale = 0.4;
  },
  // bok opony: napisy i pierścienie wypukłe (mapa wypukłości), w paśmie profilu podanym przez model (def.bands)
  tireSide(m, d) {
    const W = 4096, H = 512;
    const [c, x] = canvas(W, H);
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    const noise = fbm(512, 64, [32, 8, 2], 5);
    for (const [v0, v1, side] of d.bands) {
      if (v1 <= v0) continue;
      const yA = (1 - v1) * H, yB = (1 - v0) * H, hh = yB - yA;
      // pierścienie (listwa ochronna felgi, linie wzorcowe)
      x.fillStyle = '#9a9a9a';
      x.fillRect(0, side > 0 ? yB - hh * 0.08 : yA, W, hh * 0.05);
      x.fillRect(0, side > 0 ? yA + hh * 0.06 : yB - hh * 0.10, W, Math.max(1.5, hh * 0.025));
      // napisy wokół, powtarzane: litery wypukłe; skala pozioma = proporcja pikseli na metr (obwód / długość profilu)
      x.save();
      const cy = yA + hh * 0.52, ax = (W / d.circ) / (H / d.arcLen);
      x.translate(0, cy);
      if (side < 0) x.scale(-1, -1);   // druga strona: odwrócony kierunek profilu
      x.scale(ax, 1);
      x.fillStyle = '#ffffff'; x.textBaseline = 'middle';
      const txt = d.text || [], span = W / ax;
      const big = Math.round(hh * 0.62), small = Math.round(hh * 0.34);
      for (let rep = 0; rep < 2; rep++) {
        const base = (side < 0 ? -span : 0) + rep * span / 2;
        let px = base + span * 0.02;
        for (let i = 0; i < txt.length; i++) {
          const isBig = i === 0;
          x.font = `${isBig ? 700 : 600} ${isBig ? big : small}px Arial, sans-serif`;
          x.fillText(txt[i], px, 0);
          px += x.measureText(txt[i]).width + span * 0.035;
        }
      }
      x.restore();
    }
    // wypukłość: napisy + szum gumy
    const img = x.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
      const i = (y * W + xx) * 4, nv = noise[((y >> 3) % 64) * 512 + ((xx >> 3) % 512)] * 40;
      const v = Math.min(255, img.data[i] * 0.8 + nv);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    }
    x.putImageData(img, 0, 0);
    m.bumpMap = tex(c, { srgb: false }); m.bumpScale = 4;
    // mapa barwy: beżowe boki i czarny pas korony (opony gumwall); przejście miękkie jak przy wulkanizacji
    if (d.crownV) {
      const [c3, x3] = canvas(64, 1024), [v0, v1] = d.crownV, cs = new THREE.Color(d.sideColor), cc = new THREE.Color(d.crownColor);
      const g = x3.createLinearGradient(0, 0, 0, 1024), e = 0.006;
      const st = (v, col) => g.addColorStop(Math.min(1, Math.max(0, 1 - v)), '#' + col.getHexString());
      st(1, cs); st(v1 + e, cs); st(v1 - e, cc); st(v0 + e, cc); st(v0 - e, cs); st(0, cs);
      x3.fillStyle = g; x3.fillRect(0, 0, 64, 1024);
      m.map = tex(c3);
    }
    // szorstkość: litery trochę gładsze (od formy wulkanizacyjnej)
    const [c2, x2] = canvas(W / 4, H / 4); x2.drawImage(c, 0, 0, W / 4, H / 4);
    const im2 = x2.getImageData(0, 0, W / 4, H / 4);
    for (let i = 0; i < im2.data.length; i += 4) { const v = 235 - im2.data[i] * 0.55; im2.data[i] = im2.data[i + 1] = im2.data[i + 2] = v; }
    x2.putImageData(im2, 0, 0);
    m.roughnessMap = tex(c2, { srgb: false });
  },
};

// nadruk puszki: tło, pasy, duży napis, objętość, tabelka, kod kreskowy; poza ścianką goły aluminium (metal)
RECIPES.canLabel = (m, d) => {
  const W = 1024, H = 512, [c, x] = canvas(W, H);
  const [mc, mx] = canvas(W, H);   // metaliczność (B) i szorstkość (G): farba mniej metaliczna
  x.fillStyle = '#d4d8dc'; x.fillRect(0, 0, W, H);
  mx.fillStyle = 'rgb(0,80,255)'; mx.fillRect(0, 0, W, H);
  const [v0, v1] = d.wallV, yA = (1 - v1) * H, yB = (1 - v0) * H, hh = yB - yA;
  const ax = (W / d.circ) / (H / d.arcLen);   // proporcja px/m wokół i wzdłuż profilu
  x.fillStyle = d.base; x.fillRect(0, yA, W, hh);
  mx.fillStyle = 'rgb(0,120,90)'; mx.fillRect(0, yA, W, hh);
  // pasy
  x.fillStyle = d.band; x.fillRect(0, yA + hh * 0.08, W, hh * 0.035); x.fillRect(0, yB - hh * 0.12, W, hh * 0.05);
  // fala na tle
  x.globalAlpha = 0.18; x.fillStyle = d.band;
  x.beginPath(); x.moveTo(0, yB);
  for (let i = 0; i <= 64; i++) x.lineTo(i / 64 * W, yA + hh * (0.62 + 0.12 * Math.sin(i / 64 * Math.PI * 4)));
  x.lineTo(W, yB); x.fill(); x.globalAlpha = 1;
  const txt = (s, cx, cy, size, weight, col, rot = 0) => {
    x.save(); x.translate(cx, cy); x.rotate(rot); x.scale(ax, 1); x.font = `${weight} ${size}px Arial, sans-serif`;
    x.fillStyle = col; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, 0, 0); x.restore();
  };
  // duży napis biegnie wzdłuż wysokości puszki (obrócony), dwa razy wokół
  for (const cx of [W * 0.22, W * 0.72]) {
    x.save(); x.translate(cx, yA + hh * 0.48); x.rotate(-Math.PI / 2); x.scale(1, 1 / ax);
    x.font = `900 ${Math.round(hh * 0.30)}px Arial Black, Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = hh * 0.02; x.strokeStyle = 'rgba(0,0,0,0.35)'; x.strokeText(d.text, 0, 0);
    x.fillStyle = d.ink; x.fillText(d.text, 0, 0); x.restore();
    txt(d.sub, cx, yA + hh * 0.86, Math.round(hh * 0.045), 700, d.ink);
  }
  txt('0,33 l', W * 0.47, yA + hh * 0.2, Math.round(hh * 0.07), 800, d.ink);
  // tabelka i kod kreskowy (z tyłu)
  x.fillStyle = 'rgba(255,255,255,0.88)'; const tx = W * 0.47 - 24 * ax, ty = yA + hh * 0.36;
  x.fillRect(tx, ty, 48 * ax, hh * 0.3);
  x.fillStyle = '#222';
  for (let i = 0; i < 9; i++) x.fillRect(tx + 3 * ax, ty + 6 + i * hh * 0.03, (30 + (i * 7) % 14) * ax, 2);
  const bx = W * 0.97 - 20 * ax, by = yA + hh * 0.42;
  x.fillStyle = '#fff'; x.fillRect(bx, by, 40 * ax * 0.5, hh * 0.18);
  x.fillStyle = '#000'; const r = rng(7);
  for (let k = 0, px = bx + 2; px < bx + 40 * ax * 0.5 - 3; k++) { const w = 1 + (r() * 3 | 0); if (k % 2 === 0) x.fillRect(px, by + 3, w, hh * 0.15); px += w; }
  m.map = tex(c);
  m.metalnessMap = tex(mc, { srgb: false }); m.roughnessMap = m.metalnessMap;
  m.metalness = 1; m.roughness = 1;
};

// metal szczotkowany: rysy wzdłuż u (wokół bryły obrotowej), drobne zarysowania w poprzek
RECIPES.brushed = (m) => {
  const S = 512, r = rng(11), [c, x] = canvas(S, S);
  x.fillStyle = 'rgb(0,150,0)'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const y = r() * S, g = 110 + r() * 90 | 0;
    x.fillStyle = `rgba(0,${g},0,${0.12 + r() * 0.25})`; x.fillRect(0, y, S, 0.5 + r() * 0.8);
  }
  for (let i = 0; i < 160; i++) {   // rysy użytkowania
    x.strokeStyle = `rgba(0,${200 + r() * 55 | 0},0,0.5)`; x.lineWidth = 0.6;
    const x0 = r() * S, y0 = r() * S, a = r() * Math.PI; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 + Math.cos(a) * (5 + r() * 40), y0 + Math.sin(a) * (5 + r() * 40)); x.stroke();
  }
  m.roughnessMap = tex(c, { srgb: false, repeat: [2, 8] }); m.roughness = Math.min(1, m.roughness * 1.6);
  const [c2, x2] = canvas(S, S); x2.fillStyle = '#e8e8e8'; x2.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) { const v = 205 + r() * 50 | 0; x2.fillStyle = `rgba(${v},${v},${v},0.25)`; x2.fillRect(0, r() * S, S, 0.5 + r() * 0.6); }
  m.map = tex(c2, { repeat: [2, 8] });
};

// boki stosu gazet: krawędzie kartek (cienkie linie), pożółkłe i nierówne
RECIPES.newsEdge = (m) => {
  const Wd = 512, Hh = 512, r = rng(5), [c, x] = canvas(Wd, Hh);
  x.fillStyle = '#d9d2bf'; x.fillRect(0, 0, Wd, Hh);
  // każda kartka to cienka jasna linia z ciemną szczeliną; co kilkanaście — kolorowa wkładka reklamowa
  for (let y = 0; y < Hh; y += 2 + (r() * 1.6 | 0)) {
    const v = 120 + r() * 60 | 0;
    x.fillStyle = `rgba(${v},${v - 6},${v - 18},0.55)`; x.fillRect(0, y, Wd, 1);
    if (r() < 0.025) { const cl = ['#c85a4a', '#4a78b0', '#d8b04a', '#6aa060'][r() * 4 | 0]; x.fillStyle = cl; x.globalAlpha = 0.45; x.fillRect(0, y + 1, Wd, 1); x.globalAlpha = 1; }
  }
  // zabrudzenia i zawilgocenia
  for (let i = 0; i < 25; i++) { x.fillStyle = `rgba(110,90,55,${r() * 0.10})`; x.beginPath(); x.ellipse(r() * Wd, r() * Hh, 20 + r() * 80, 4 + r() * 12, 0, 0, 7); x.fill(); }
  m.map = tex(c, { repeat: [1, 1] });
  const [b, bx] = canvas(Wd, Hh); bx.drawImage(c, 0, 0); m.bumpMap = tex(b, { srgb: false, repeat: [1, 1] }); m.bumpScale = 0.5;
};
// pierwsza strona gazety: winieta, tytuł, zdjęcia, szpalty tekstu (bez prawdziwych tytułów prasowych)
RECIPES.newsTop = (m) => {
  const Wd = 1024, Hh = 732, r = rng(9), [c, x] = canvas(Wd, Hh);
  x.fillStyle = '#e4dfd0'; x.fillRect(0, 0, Wd, Hh);
  x.fillStyle = '#1a1a1a'; x.font = '900 86px Georgia, serif'; x.textAlign = 'center'; x.fillText('GŁOS OKOLICY', Wd / 2, 96);
  x.fillRect(40, 116, Wd - 80, 4); x.font = '600 18px Georgia, serif'; x.fillText('NR 214 · SOBOTA · CENA 3,50 ZŁ', Wd / 2, 144); x.fillRect(40, 156, Wd - 80, 2);
  x.font = '800 54px Georgia, serif'; x.textAlign = 'left'; x.fillText('Nowa zgniatarka na wysypisku', 44, 220);
  x.fillStyle = '#6f6a60'; x.fillRect(44, 246, 560, 300); x.fillStyle = '#8c8577'; x.fillRect(64, 270, 240, 160); x.fillStyle = '#58534b'; x.fillRect(330, 300, 240, 220);
  x.fillStyle = '#1a1a1a';
  for (let col = 0; col < 4; col++) for (let ln = 0; ln < 26; ln++) {
    const cx = 630 + (col % 2) * 180, cy = 250 + (col > 1 ? 300 : 0) + ln * 10;
    if (cy > Hh - 20 || (col > 1 && ln > 14)) continue; x.fillRect(cx, cy, 160 - (ln % 7 === 6 ? 60 : r() * 10), 3);
  }
  for (let col = 0; col < 3; col++) for (let ln = 0; ln < 14; ln++) x.fillRect(44 + col * 190, 568 + ln * 10, 172 - (ln % 6 === 5 ? 70 : r() * 12), 3);
  m.map = tex(c);
};
// sznurek jutowy: skręcone włókna (ukośne paski wzdłuż rurki)
RECIPES.twine = (m) => {
  const S = 128, [c, x] = canvas(S, S), r = rng(3);
  x.fillStyle = '#b39463'; x.fillRect(0, 0, S, S);
  for (let i = -S; i < S * 2; i += 16) { x.fillStyle = 'rgba(70,50,25,0.45)'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 10, 0); x.lineTo(i + 10 - S, S); x.lineTo(i - S, S); x.fill(); }
  for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(230,210,170,${r() * 0.4})`; x.fillRect(r() * S, r() * S, 1, 3 + r() * 6); }
  m.map = tex(c, { repeat: [60, 1] });
  m.bumpMap = m.map; m.bumpScale = 0.8;
};

// tektura: kraft z włóknami i delikatnymi pasami fali (prześwitują przez warstwę zewnętrzną)
function kraft(x, S, r) {
  x.fillStyle = '#b48a55'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < S; i += 8) { x.fillStyle = `rgba(80,55,25,${0.05 + r() * 0.03})`; x.fillRect(0, i, S, 4); }
  for (let i = 0; i < 5000; i++) { const v = r(); x.fillStyle = v < 0.5 ? `rgba(70,45,20,${r() * 0.18})` : `rgba(230,200,150,${r() * 0.15})`; x.fillRect(r() * S, r() * S, 1 + r() * 5, 1); }
  for (let i = 0; i < 12; i++) { x.fillStyle = `rgba(60,40,20,${r() * 0.08})`; x.beginPath(); x.ellipse(r() * S, r() * S, 20 + r() * 90, 10 + r() * 50, r() * 3, 0, 7); x.fill(); }
}
RECIPES.cardboardPlain = (m) => { const S = 512, r = rng(21), [c, x] = canvas(S, S); kraft(x, S, r); m.map = tex(c); m.bumpMap = m.map; m.bumpScale = 0.3; };
RECIPES.cardboard = (m) => {
  const S = 1024, r = rng(22), [c, x] = canvas(S, S); kraft(x, S, r);
  x.strokeStyle = x.fillStyle = 'rgba(25,20,15,0.85)'; x.lineWidth = 10;
  // strzałki „tą stroną do góry”
  for (const ax of [S * 0.12, S * 0.22]) { x.beginPath(); x.moveTo(ax, S * 0.32); x.lineTo(ax, S * 0.16); x.stroke(); x.beginPath(); x.moveTo(ax - 26, S * 0.19); x.lineTo(ax, S * 0.13); x.lineTo(ax + 26, S * 0.19); x.fill(); }
  x.fillRect(S * 0.09, S * 0.34, S * 0.16, 8);
  // kieliszek (ostrożnie, szkło)
  x.lineWidth = 8; x.beginPath(); x.moveTo(S * 0.36, S * 0.14); x.lineTo(S * 0.44, S * 0.14); x.quadraticCurveTo(S * 0.44, S * 0.25, S * 0.40, S * 0.26); x.quadraticCurveTo(S * 0.36, S * 0.25, S * 0.36, S * 0.14); x.stroke();
  x.beginPath(); x.moveTo(S * 0.40, S * 0.26); x.lineTo(S * 0.40, S * 0.32); x.moveTo(S * 0.37, S * 0.33); x.lineTo(S * 0.43, S * 0.33); x.stroke();
  // recykling: trzy strzałki w trójkącie
  x.save(); x.translate(S * 0.83, S * 0.22);
  for (let k = 0; k < 3; k++) { x.rotate(Math.PI * 2 / 3); x.beginPath(); x.arc(0, 0, 52, -0.9, 0.5); x.stroke(); x.beginPath(); x.moveTo(52 * Math.cos(0.5) - 12, 52 * Math.sin(0.5) - 10); x.lineTo(52 * Math.cos(0.5) + 6, 52 * Math.sin(0.5) + 16); x.lineTo(52 * Math.cos(0.5) + 18, 52 * Math.sin(0.5) - 12); x.fill(); }
  x.restore(); x.font = '700 28px Arial'; x.textAlign = 'center'; x.fillText('PAP 20', S * 0.83, S * 0.33);
  // pieczątka producenta tektury (kółko z danymi)
  x.lineWidth = 4; x.beginPath(); x.arc(S * 0.8, S * 0.78, 95, 0, 7); x.stroke(); x.beginPath(); x.arc(S * 0.8, S * 0.78, 80, 0, 7); x.stroke();
  x.font = '700 22px Arial'; ['BOX CERTIFICATE', 'BC 3-W  ECT 32', '40×30×30 cm', 'MAX 25 kg'].forEach((t, i) => x.fillText(t, S * 0.8, S * 0.73 + i * 26));
  // napis i kod partii
  x.font = '800 64px Arial'; x.textAlign = 'left'; x.fillText('GÓRA', S * 0.08, S * 0.52); x.font = '600 30px monospace'; x.fillText('LOT 2611-0347', S * 0.08, S * 0.9);
  m.map = tex(c); m.bumpMap = m.map; m.bumpScale = 0.25;
};

export function applyTextures() {
  for (const m of allMaterials()) {
    if (m.userData.textured) continue;
    m.userData.textured = true;
    const d = m.userData.def, f = d && d.tex && RECIPES[d.tex];
    if (f) { f(m, d); m.needsUpdate = true; }
  }
}
export { RECIPES, canvas, tex, fbm, valueNoise, grayCanvas };
