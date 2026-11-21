// ShipKit · plating — generator poszycia kadłuba: panele, spoiny, nity, zacieki, pasy i oznaczenia — mapy koloru, szorstkości, wypukłości i świecenia z jednego układu.
// Część ShipKit (js/models/ships-space/shipkit.js — API i definicje statków); moduł ES, wspólne THREE z three-global.js.
import { THREE } from '../../../core/three-global.js';
import { canvas, clamp, fbm, paintPixels, rng } from './util.js';

// =====================================================================
// Hull plating generator: recursively split panels, seams, rivets,
// grime streaks, painted stripes and hull markings. Produces matching
// color / roughness / bump / emissive maps from one layout, so the
// seams that look dark are also grooved and rougher.
// =====================================================================
function makePlating({ size = 1024, seed = 1, base = [150, 156, 170], minPanel = 70, maxPanel = 240,
                       stripes = [], markings = [], windows = [] }) {
  const rand = rng(seed);
  const W = size, H = size;
  const [cCol, col] = canvas(W, H);
  const [cRough, rough] = canvas(W, H);
  const [cBump, bump] = canvas(W, H);
  const [cEmi, emi] = canvas(W, H);

  // 1. base metal: low-frequency mottling + fine grain.
  const mottle = fbm(rand, 4, 4, 5), grain = fbm(rand, 64, 64, 2);
  paintPixels(col, W, H, (u, v) => {
    const m = (mottle(u, v) - 0.5) * 38 + (grain(u, v) - 0.5) * 14;
    return [clamp(base[0] + m, 0, 255), clamp(base[1] + m, 0, 255), clamp(base[2] + m * 1.05, 0, 255)];
  });
  paintPixels(rough, W, H, (u, v) => { const r = 120 + (mottle(u, v) - 0.5) * 60; return [r, r, r]; });
  bump.fillStyle = "#808080"; bump.fillRect(0, 0, W, H);
  emi.fillStyle = "#000"; emi.fillRect(0, 0, W, H);

  // 2. panels (recursive split).
  const panels = [];
  (function split(x, y, w, h, depth) {
    const big = w > maxPanel || h > maxPanel;
    const canSplit = w > minPanel * 2 || h > minPanel * 2;
    if (canSplit && (big || (depth < 5 && rand() < 0.55))) {
      if (w > h ? rand() < 0.8 : rand() < 0.2) {
        const k = Math.round(w * (0.3 + rand() * 0.4));
        if (k >= minPanel && w - k >= minPanel) { split(x, y, k, h, depth + 1); split(x + k, y, w - k, h, depth + 1); return; }
      } else {
        const k = Math.round(h * (0.3 + rand() * 0.4));
        if (k >= minPanel && h - k >= minPanel) { split(x, y, w, k, depth + 1); split(x, y + k, w, h - k, depth + 1); return; }
      }
    }
    panels.push([x, y, w, h]);
  })(0, 0, W, H, 0);

  for (const [x, y, w, h] of panels) {
    const tone = (rand() - 0.5) * 0.18;
    col.fillStyle = tone > 0 ? `rgba(255,255,255,${tone})` : `rgba(10,14,24,${-tone})`;
    col.fillRect(x, y, w, h);
    const r = 70 + rand() * 90;
    rough.fillStyle = `rgba(${r},${r},${r},0.55)`; rough.fillRect(x, y, w, h);
    // a few panels get a subtle bevel (raised plate)
    if (rand() < 0.35) {
      const gr = bump.createLinearGradient(x, y, x, y + h);
      gr.addColorStop(0, "#9a9a9a"); gr.addColorStop(0.1, "#8a8a8a"); gr.addColorStop(0.9, "#8a8a8a"); gr.addColorStop(1, "#777");
      bump.fillStyle = gr; bump.fillRect(x + 3, y + 3, w - 6, h - 6);
    }
  }
  // 3. grime streaks running "down" the hull (along +v)
  for (let i = 0; i < 180; i++) {
    const x = rand() * W, y = rand() * H, len = 30 + rand() * 160, wdt = 2 + rand() * 7;
    const gr = col.createLinearGradient(x, y, x, y + len);
    gr.addColorStop(0, `rgba(20,18,22,${0.10 + rand() * 0.18})`); gr.addColorStop(1, "rgba(20,18,22,0)");
    col.fillStyle = gr; col.fillRect(x, y, wdt, len);
  }
  // 4. seams + rivets
  for (const [x, y, w, h] of panels) {
    col.strokeStyle = "rgba(18,22,32,0.85)"; col.lineWidth = 2.2; col.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    col.strokeStyle = "rgba(255,255,255,0.10)"; col.lineWidth = 1; col.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    bump.strokeStyle = "#1a1a1a"; bump.lineWidth = 3; bump.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    rough.strokeStyle = "#d0d0d0"; rough.lineWidth = 3; rough.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (rand() < 0.7) {
      const step = 13;
      const dot = (px, py) => {
        col.fillStyle = "rgba(40,44,56,0.8)"; col.beginPath(); col.arc(px, py, 1.9, 0, 7); col.fill();
        col.fillStyle = "rgba(255,255,255,0.35)"; col.beginPath(); col.arc(px - 0.5, py - 0.5, 0.9, 0, 7); col.fill();
        bump.fillStyle = "#e8e8e8"; bump.beginPath(); bump.arc(px, py, 2.1, 0, 7); bump.fill();
      };
      for (let px = x + 8; px < x + w - 6; px += step) { dot(px, y + 7); dot(px, y + h - 7); }
      for (let py = y + 8 + step; py < y + h - 6 - step; py += step) { dot(x + 7, py); dot(x + w - 7, py); }
    }
  }
  // 5. painted stripes (full-width bands: rings around a lathe hull)
  for (const s of stripes) {
    col.fillStyle = s.color; col.globalAlpha = 0.92; col.fillRect(0, s.y * H, W, s.h * H); col.globalAlpha = 1;
    // paint wears off a little: re-dust with grain
    for (let i = 0; i < 900; i++) {
      col.fillStyle = `rgba(90,94,104,${rand() * 0.5})`;
      col.fillRect(rand() * W, s.y * H + rand() * s.h * H, 1 + rand() * 3, 1 + rand() * 2);
    }
    rough.fillStyle = "rgba(170,170,170,0.8)"; rough.fillRect(0, s.y * H, W, s.h * H);
  }
  // 6. markings (rotated text)
  for (const m of markings) {
    col.save(); col.translate(m.x * W, m.y * H); col.rotate(m.rot || 0);
    col.font = `600 ${m.size}px "Oswald", "Arial Narrow", sans-serif`;
    if (m.max) {                                   // a long text shrinks to fit its place
      const w = col.measureText(m.text).width;
      if (w > m.max) col.font = `600 ${Math.floor(m.size * m.max / w)}px "Oswald", "Arial Narrow", sans-serif`;
    }
    col.textAlign = "center"; col.textBaseline = "middle";
    col.fillStyle = m.color; col.globalAlpha = 0.9; col.fillText(m.text, 0, 0); col.restore();
  }
  // 7. lit windows (emissive only)
  for (const wdw of windows) {
    for (let i = 0; i < wdw.count; i++) {
      const x = wdw.x * W - 5, y = (wdw.y + i * wdw.gap) * H;
      col.fillStyle = "#1b2130"; col.fillRect(x - 1, y - 1, 12, 8);
      if (rand() < 0.85) {
        emi.fillStyle = rand() < 0.75 ? "#ffcf8a" : "#9fb6ff"; emi.fillRect(x, y, 10, 6);
        emi.fillStyle = "rgba(255,210,150,0.25)"; emi.fillRect(x - 3, y - 3, 16, 12);
      }
    }
  }
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: tex(cCol, true), roughnessMap: tex(cRough), bumpMap: tex(cBump), emissiveMap: tex(cEmi, true) };
}

// Brushed metal: anisotropic streaks along v (length), with machined
// ring grooves across it.
function makeBrushed({ size = 512, seed = 3, tint = [175, 180, 192], rings = 6 }) {
  const rand = rng(seed);
  const [c, ctx] = canvas(size, size);
  const streak = fbm(rand, 128, 2, 3), soft = fbm(rand, 8, 4, 3);
  paintPixels(ctx, size, size, (u, v) => {
    const s = (streak(u, v) - 0.5) * 60 + (soft(u, v) - 0.5) * 30;
    return [clamp(tint[0] + s, 0, 255), clamp(tint[1] + s, 0, 255), clamp(tint[2] + s, 0, 255)];
  });
  for (let i = 0; i < rings; i++) {
    const y = (i + 0.5) / rings * size;
    ctx.fillStyle = "rgba(20,22,30,0.7)"; ctx.fillRect(0, y, size, 3);
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(0, y + 3, size, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Soft radial glow sprite texture.
function makeGlow(inner = "rgba(255,255,255,1)", mid = "rgba(255,200,120,0.5)") {
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(0.25, mid); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export { makePlating, makeBrushed, makeGlow };
