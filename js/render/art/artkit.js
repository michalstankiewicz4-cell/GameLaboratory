// ArtKit — obrazy 2D na canvasie: temat → technika rysowania → powierzchnia (podłoże, relief, starzenie) → konwersje →
// format. Każdy obraz to dane (spec, JSON) — ten sam spec z tym samym ziarnem daje ten sam obraz, więc AI i gry mogą
// zamawiać obrazy poleceniem (laboratorium sztuki: labs/art.html, docs/labs/art.md). Bez Three.js, bez DOM poza canvasem.
//
// Obraz ma dwie warstwy: barwę i wysokość farby (impast, ślady włosia, nitki płótna). Wysokość oświetla „światło
// boczne” (relief) — przy powiększeniu widać pociągnięcia pędzla i fakturę podłoża.
//
//   SUBJECTS, TECHNIQUES, SURFACES, CONVERSIONS, FORMATS, DEFAULTS
//   render(spec, { image }) → { canvas, spec }   image — własny obraz (temat „image”): canvas, img albo ImageBitmap
//   spec: { size, aspect, seed, subject, palette, technique, stroke, detail, surface, relief, light, varnish, cracks,
//           age, convert: [{ kind, … }], format, text }

export const SUBJECTS = {
  landscape: 'Landscape (sky, hills, water, trees)', still: 'Still life (table, vase, fruit)', portrait: 'Portrait (head and shoulders)',
  abstract: 'Abstract (colour fields)', stampmotif: 'Stamp motif (bird, flower)', image: 'Your image (upload or paste)',
};
export const TECHNIQUES = {
  none: 'None — the subject as it is', oil: 'Oil: brush strokes (impasto)', watercolor: 'Watercolour', pencil: 'Pencil hatching',
  ink: 'Ink: line and cross-hatching', stick: 'Ink with a stick (twig)', ballpoint: 'Ballpoint pen', charcoal: 'Charcoal',
  pastel: 'Soft pastel', marker: 'Felt-tip marker', pointillism: 'Pointillism', engraving: 'Engraving (lines by tone)',
};
export const SURFACES = { none: 'None (smooth)', canvas: 'Canvas (woven linen)', paper: 'Paper (fibres)', wood: 'Wood panel (grain)', parchment: 'Parchment', metal: 'Metal (brushed sheet)' };
export const CONVERSIONS = {
  gray: 'Greyscale', sepia: 'Sepia', duotone: 'Duotone', invert: 'Invert', posterize: 'Posterize', quantize: 'Palette + dither',
  halftone: 'Halftone dots', edges: 'Edges (line art)', pixelate: 'Pixelate', blur: 'Blur', sharpen: 'Sharpen', contrast: 'Contrast and brightness',
};
// widoki badawcze (jak w ekspertyzie: js/render/art/exam/views.js) — ten sam obraz pod inną lampą
export const VIEWS = { normal: 'Normal light', raking: 'Raking light (relief only)', uv: 'UV (varnish fluorescence)', ir: 'Infrared (underdrawing)', xray: 'X-ray (paint density)' };
export const FORMATS = { none: 'None', stamp: 'Postage stamp (perforations, value)', frame: 'Gilded frame', mount: 'Paper mount' };
export const PALETTES = {
  natural: ['#25331f', '#4f6b3a', '#8aa35a', '#d9c98c', '#7aa6c9', '#2f5a85', '#e8e1cf', '#a0522d'],
  warm: ['#3b1d12', '#7a3414', '#c2622a', '#e8a44a', '#f4d58d', '#8c2f39', '#f7efe1', '#5a3d2b'],
  cool: ['#0f1d2e', '#1f3e63', '#3f73a8', '#86b6d8', '#d6e8f2', '#4b6d5c', '#f2f5f7', '#6b5b95'],
  earth: ['#2b2118', '#5a4632', '#8c6d4f', '#b89b72', '#d9c7a4', '#6b7a4f', '#efe6d4', '#3f4a3a'],
  vivid: ['#1a1a40', '#e63946', '#f1a208', '#2a9d8f', '#457b9d', '#f4f1de', '#8338ec', '#06d6a0'],
};
export const DEFAULTS = {
  size: 1024, aspect: 1.25, seed: 7, subject: 'landscape', palette: 'natural',
  technique: 'oil', stroke: 1, detail: 1, surface: 'canvas', relief: 0.6, light: 135,
  varnish: 0.15, cracks: 0, age: 0, view: 'normal', convert: [], format: 'none', text: '',
};

/* ---------------- tools ---------------- */
function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const css = (c, a = 1) => `rgba(${Math.round(clamp(c[0]) * 255)},${Math.round(clamp(c[1]) * 255)},${Math.round(clamp(c[2]) * 255)},${a})`;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// szum wartości (do faktur): siatka losowych wartości, wygładzona
function valueNoise(seed) {
  const r = rng(seed), N = 256, t = new Float32Array(N * N); for (let i = 0; i < t.length; i++) t[i] = r();
  const at = (x, y) => t[((y & 255) << 8) | (x & 255)];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}
const fbm = (n, x, y, o = 4) => { let v = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { v += n(x * f, y * f) * a; a *= 0.5; f *= 2; } return v; };

/* ---------------- subjects: the picture under the paint (canvas) ---------------- */
function drawSubject(ctx, W, H, spec, image) {
  const r = rng(spec.seed * 31 + 5), P = (PALETTES[spec.palette] || PALETTES.natural).map(hex), pick = (i) => P[i % P.length];
  const grad = (y0, y1, a, b) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, css(a)); g.addColorStop(1, css(b)); return g; };
  const blob = (x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = css(c); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); };
  if (spec.subject === 'image' && image) {
    const iw = image.width || image.naturalWidth, ih = image.height || image.naturalHeight, k = Math.max(W / iw, H / ih);
    ctx.drawImage(image, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k); return;
  }
  if (spec.subject === 'still') {
    ctx.fillStyle = grad(0, H * 0.62, mix(pick(7), [0, 0, 0], 0.4), pick(3)); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = grad(H * 0.62, H, pick(7), mix(pick(7), [0, 0, 0], 0.5)); ctx.fillRect(0, H * 0.62, W, H * 0.38);   // stół
    const vx = W * (0.35 + r() * 0.1); ctx.fillStyle = css(pick(4)); ctx.beginPath();                                    // wazon
    ctx.moveTo(vx - W * 0.05, H * 0.3); ctx.bezierCurveTo(vx - W * 0.16, H * 0.45, vx - W * 0.12, H * 0.66, vx, H * 0.67);
    ctx.bezierCurveTo(vx + W * 0.12, H * 0.66, vx + W * 0.16, H * 0.45, vx + W * 0.05, H * 0.3); ctx.closePath(); ctx.fill();
    blob(vx - W * 0.04, H * 0.42, W * 0.02, H * 0.08, mix(pick(4), [1, 1, 1], 0.5));                                     // blask
    for (let i = 0; i < 5; i++) blob(W * (0.55 + i * 0.07 + r() * 0.03), H * (0.64 - r() * 0.03), W * (0.04 + r() * 0.015), W * 0.04, pick([1, 2, 7, 3][i % 4] + 0), 0);
    for (let i = 0; i < 7; i++) blob(vx + (r() - 0.5) * W * 0.2, H * (0.18 + r() * 0.1), W * 0.035, W * 0.035, pick(i % 2 ? 3 : 7));   // kwiaty
    return;
  }
  if (spec.subject === 'portrait') {
    ctx.fillStyle = grad(0, H, pick(5), mix(pick(0), [0, 0, 0], 0.4)); ctx.fillRect(0, 0, W, H);
    const cx = W * 0.5, skin = mix(pick(3), [0.9, 0.7, 0.55], 0.6);
    blob(cx, H * 0.95, W * 0.36, H * 0.3, pick(0));                                                     // ramiona
    blob(cx, H * 0.62, W * 0.08, H * 0.1, mix(skin, [0, 0, 0], 0.12));                                  // szyja
    blob(cx, H * 0.42, W * 0.17, H * 0.2, skin);                                                         // głowa
    blob(cx, H * 0.27, W * 0.19, H * 0.12, mix(pick(7), [0, 0, 0], 0.5));                                // włosy
    for (const s of [-1, 1]) blob(cx + s * W * 0.06, H * 0.41, W * 0.02, H * 0.012, [0.15, 0.12, 0.1]);   // oczy
    blob(cx, H * 0.52, W * 0.04, H * 0.01, mix(skin, [0.6, 0.15, 0.15], 0.5));                          // usta
    blob(cx + W * 0.1, H * 0.38, W * 0.05, H * 0.08, mix(skin, [1, 1, 1], 0.25));                       // światło
    return;
  }
  if (spec.subject === 'abstract') {
    ctx.fillStyle = css(pick(6)); ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) { ctx.fillStyle = css(pick(i + Math.floor(r() * 4)), 0.9); const x = r() * W, y = r() * H; ctx.fillRect(x - W * 0.2 * r(), y - H * 0.2 * r(), W * (0.15 + r() * 0.4), H * (0.1 + r() * 0.3)); }
    for (let i = 0; i < 5; i++) blob(r() * W, r() * H, W * (0.05 + r() * 0.12), W * (0.05 + r() * 0.12), pick(i * 3 + 1));
    return;
  }
  if (spec.subject === 'stampmotif') {
    ctx.fillStyle = css(mix(pick(6), pick(5), 0.2)); ctx.fillRect(0, 0, W, H);
    const cx = W * 0.5, cy = H * 0.55;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; blob(cx + Math.cos(a) * W * 0.14, cy + Math.sin(a) * W * 0.14, W * 0.11, W * 0.06, pick(1), a); }   // płatki
    blob(cx, cy, W * 0.08, W * 0.08, pick(3));
    ctx.strokeStyle = css(pick(0)); ctx.lineWidth = W * 0.02; ctx.beginPath(); ctx.moveTo(cx, cy + W * 0.1); ctx.quadraticCurveTo(cx - W * 0.05, H * 0.85, cx, H); ctx.stroke();
    blob(cx + W * 0.25, H * 0.25, W * 0.07, W * 0.04, pick(5), -0.3); blob(cx + W * 0.31, H * 0.22, W * 0.03, W * 0.03, pick(5));   // ptak
    return;
  }
  // pejzaż: niebo, słońce, wzgórza w trzech planach, woda, drzewa
  ctx.fillStyle = grad(0, H * 0.6, pick(5), mix(pick(4), pick(6), 0.6)); ctx.fillRect(0, 0, W, H);
  const sx = W * (0.2 + r() * 0.6), sy = H * (0.15 + r() * 0.15);
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * 0.25); sg.addColorStop(0, css([1, 0.95, 0.8])); sg.addColorStop(0.15, css([1, 0.9, 0.7], 0.8)); sg.addColorStop(1, css([1, 0.9, 0.7], 0));
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) blob(r() * W, H * (0.08 + r() * 0.25), W * (0.08 + r() * 0.12), H * (0.02 + r() * 0.03), mix(pick(6), [1, 1, 1], 0.4));   // chmury
  const layers = [[0.48, pick(4), 0.06], [0.56, pick(2), 0.09], [0.66, pick(1), 0.12]];
  for (const [base, c, amp] of layers) {
    ctx.fillStyle = css(c); ctx.beginPath(); ctx.moveTo(0, H);
    const ph = r() * 10, f = 2 + r() * 3;
    for (let x = 0; x <= W; x += W / 64) ctx.lineTo(x, H * (base - amp * (0.5 + 0.5 * Math.sin(x / W * f + ph) * Math.cos(x / W * f * 0.7 + ph * 2))));
    ctx.lineTo(W, H); ctx.fill();
  }
  ctx.fillStyle = grad(H * 0.74, H, pick(4), pick(5)); ctx.fillRect(0, H * 0.74, W, H * 0.26);   // woda
  for (let i = 0; i < 14; i++) { const x = r() * W, y = H * (0.6 + r() * 0.12), s = W * (0.02 + r() * 0.03); blob(x, y, s, s * 1.6, pick(0)); }   // drzewa
}

/* ---------------- surfaces: the support (colour of the ground and its height) ---------------- */
function surfaceAt(kind, seed) {
  const n = valueNoise(seed + 101), n2 = valueNoise(seed + 202);
  if (kind === 'canvas') return (x, y) => {   // splot płótna: wątek i osnowa co ~4 px, nierówne nitki
    const p = 4.2, cx = Math.floor(x / p), cy = Math.floor(y / p), fx = x / p - cx, fy = y / p - cy, over = (cx + cy) & 1;
    const wv = 0.6 + 0.4 * fbm(n, x / 30, y / 30);   // nitka na wierzchu: wypukła w poprzek (osnowa albo wątek na zmianę)
    return { h: (over ? Math.sin(fx * Math.PI) : Math.sin(fy * Math.PI)) * 0.7 * wv, c: [0.86, 0.82, 0.72].map((q) => q - 0.06 * fbm(n2, x / 6, y / 6)) };
  };
  if (kind === 'paper') return (x, y) => ({ h: fbm(n, x / 3, y / 3, 3) * 0.4 + fbm(n2, x / 18, y / 1.5, 2) * 0.25, c: [0.95, 0.94, 0.9].map((q) => q - 0.04 * fbm(n2, x / 50, y / 50)) });
  if (kind === 'wood') return (x, y) => { const g = Math.sin((y + fbm(n, x / 200, y / 30) * 60) / 3.5) * 0.5 + 0.5; return { h: g * 0.5, c: mix([0.62, 0.45, 0.3], [0.48, 0.33, 0.2], g) }; };
  if (kind === 'metal') return (x, y) => {   // szczotkowana blacha: drobne rysy wzdłuż x, plamy utlenienia
    const st = fbm(n, x / 90, y / 0.9, 3), m = fbm(n2, x / 160, y / 160);
    return { h: st * 0.35, c: mix([0.66, 0.68, 0.71], [0.5, 0.52, 0.55], st * 0.7 + m * 0.3) };
  };
  if (kind === 'parchment') return (x, y) => { const m = fbm(n, x / 90, y / 90); return { h: fbm(n2, x / 5, y / 5, 3) * 0.3, c: mix([0.93, 0.86, 0.68], [0.78, 0.66, 0.45], m * m) }; };
  return () => ({ h: 0, c: [0.96, 0.95, 0.93] });
}

/* ---------------- techniques: paint the subject (colour canvas + height canvas) ---------------- */
// ile śladów: base przy 1024 px (proporcje 5:4); ślady rosną z obrazem (k), więc ich liczba zależy tylko od kształtu
// obrazu, gęstości (detail) i wielkości pędzla (stroke); lines — ślady liniowe (szerokość stała, długość ∝ k)
const marks = (base, spec, W, H, lines = false) => Math.round(base * spec.detail * (H / W) * 1.25 * (lines ? W / 1024 : 1) / (lines ? spec.stroke : spec.stroke * spec.stroke));
// próbka barwy tematu i kierunek struktury (prostopadle do gradientu jasności — pociągnięcia idą wzdłuż kształtów)
function sampler(src, W, H) {
  const d = src.getContext('2d').getImageData(0, 0, W, H).data;
  const at = (x, y) => { const i = ((clamp(Math.round(y), 0, H - 1)) * W + clamp(Math.round(x), 0, W - 1)) * 4; return [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255]; };
  const L = (x, y) => { const c = at(x, y); return lum(c[0], c[1], c[2]); };
  const dir = (x, y, s) => { const gx = L(x + s, y) - L(x - s, y), gy = L(x, y + s) - L(x, y - s); return Math.hypot(gx, gy) < 0.02 ? null : Math.atan2(gx, -gy); };
  return { at, L, dir, data: d };
}
function oil(col, hgt, S, W, H, spec, r) {
  const c = col.getContext('2d'), h = hgt.getContext('2d'), k = W / 1024 * spec.stroke;
  // od dużych do małych pędzli: podmalówka, bryły, szczegóły (gęstość — detail); wysokość: każde pociągnięcie kładzie
  // swój profil na wierzch (grzbiety włosia i bruzdy między nimi), grudki na końcu dodają
  const passes = [[34, 600], [18, 1800], [9, 5200], [4.5, 9000]].map(([w, n]) => [w * k, marks(n, spec, W, H) * spec.stroke]);
  let flow = r() * Math.PI;
  for (const [bw, n] of passes) {
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * H, base = S.at(x, y), d = S.dir(x, y, Math.max(2, bw * 0.5));
      const ang = (d == null ? flow + (r() - 0.5) * 0.6 : d) + (r() - 0.5) * 0.35, len = bw * (2 + r() * 3);
      const bend = (r() - 0.5) * 0.6, bristles = Math.max(3, Math.round(bw / 1.6));
      const tint = (r() - 0.5) * 0.08, paint = [base[0] + tint, base[1] + tint * 0.8, base[2] + tint * 0.6];
      for (let b = 0; b < bristles; b++) {   // włosie: równoległe linie przez szerokość pędzla, każda trochę inna
        const off = (b / (bristles - 1) - 0.5) * bw, jitter = (r() - 0.5) * 0.06, load = 0.55 + r() * 0.45;
        const ox = -Math.sin(ang) * off, oy = Math.cos(ang) * off;
        c.strokeStyle = css(paint.map((q) => q + jitter), 0.9 * load); c.lineWidth = Math.max(0.8, bw / bristles * 1.4); c.lineCap = 'round';
        const hv = Math.round(70 + 120 * load * (0.6 + 0.4 * Math.sin(b / (bristles - 1) * Math.PI))); h.strokeStyle = `rgb(${hv},${hv},${hv})`; h.lineWidth = c.lineWidth;
        const x0 = x + ox - Math.cos(ang) * len / 2, y0 = y + oy - Math.sin(ang) * len / 2, x1 = x + ox + Math.cos(ang) * len / 2, y1 = y + oy + Math.sin(ang) * len / 2;
        const mx = x + ox - Math.sin(ang) * bend * len * 0.3, my = y + oy + Math.cos(ang) * bend * len * 0.3, endLen = 0.65 + r() * 0.35;
        const ex = x0 + (x1 - x0) * endLen, ey = y0 + (y1 - y0) * endLen;
        for (const g of [c, h]) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, ex, ey); g.stroke(); }
      }
      // grudka farby na końcu pociągnięcia (impast)
      h.globalCompositeOperation = 'lighter'; h.fillStyle = 'rgba(255,255,255,0.1)'; h.beginPath(); h.arc(x + Math.cos(ang) * len * 0.45, y + Math.sin(ang) * len * 0.45, bw * 0.35, 0, Math.PI * 2); h.fill(); h.globalCompositeOperation = 'source-over';
    }
    flow += 0.4;
  }
}
function watercolor(col, hgt, S, W, H, spec, r) {
  const c = col.getContext('2d'), k = W / 1024;
  c.filter = `blur(${6 * k}px)`; c.globalAlpha = 0.55; c.drawImage(S.canvas, 0, 0); c.filter = 'none'; c.globalAlpha = 1;
  // plamy: przezroczyste warstwy z ciemniejszą krawędzią (farba zbiera się na brzegu mokrej plamy)
  const n = marks(1400, spec, W, H);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H, base = S.at(x, y), rad = (8 + r() * 26) * k * spec.stroke;
    const g = c.createRadialGradient(x, y, rad * 0.2, x, y, rad); g.addColorStop(0, css(base, 0.16)); g.addColorStop(0.85, css(base, 0.22)); g.addColorStop(1, css(mix(base, [0, 0, 0], 0.25), 0.3));
    c.fillStyle = g; c.beginPath();
    for (let a = 0; a <= 12; a++) { const t = a / 12 * Math.PI * 2, rr = rad * (0.75 + r() * 0.35); c.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); }
    c.fill();
  }
  const h = hgt.getContext('2d'); h.fillStyle = 'rgba(255,255,255,0.03)'; h.fillRect(0, 0, W, H);
}
function hatch(col, hgt, S, W, H, spec, r, mode) {
  const c = col.getContext('2d'), k = W / 1024 * spec.stroke;
  c.fillStyle = mode === 'engraving' ? '#f4efe3' : 'rgba(0,0,0,0)'; if (mode === 'engraving') c.fillRect(0, 0, W, H);
  const ink = mode === 'pencil' ? [0.25, 0.25, 0.27] : mode === 'engraving' ? [0.12, 0.13, 0.2] : [0.05, 0.05, 0.08];
  if (mode === 'engraving') {   // rytownictwo: równoległe linie, grubość z ciemności (rylec wchodzi głębiej), lekko falujące
    const step = 4.2 * k, a = -0.5, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx, D = Math.hypot(W, H), seg = 2;
    c.strokeStyle = css(ink); c.lineCap = 'round';
    for (let t = -D; t < D; t += step) for (let u = -D; u < D; u += seg) {
      const wob = Math.sin(u / (40 * k) + t * 0.01) * 0.8 * k;
      const x0 = W / 2 + nx * (t + wob) + dx * u, y0 = H / 2 + ny * (t + wob) + dy * u;
      if (x0 < -2 || x0 > W + 2 || y0 < -2 || y0 > H + 2) continue;
      const w = (1 - S.L(x0, y0)) * step * 0.9; if (w < 0.25) continue;
      c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + dx * seg, y0 + dy * seg); c.stroke();
    }
    hgt.getContext('2d').drawImage(col, 0, 0); return;
  }
  // ołówek i tusz: kreskowanie warstwami — im ciemniej, tym więcej kierunków
  const dirs = [0.8, -0.8, 0.05, 1.6], n = marks(mode === 'pencil' ? 60000 : 45000, spec, W, H, true);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H, dark = 1 - S.L(x, y), layer = Math.floor(r() * 4);
    if (dark < 0.08 + layer * 0.17) continue;
    const a = dirs[layer] + (r() - 0.5) * 0.15, len = (6 + r() * 10) * k;
    c.strokeStyle = css(ink, mode === 'pencil' ? 0.3 + dark * 0.45 : 0.75); c.lineWidth = (mode === 'pencil' ? 0.9 : 0.7) * Math.max(0.7, k);
    c.beginPath(); c.moveTo(x - Math.cos(a) * len / 2, y - Math.sin(a) * len / 2); c.lineTo(x + Math.cos(a) * len / 2, y + Math.sin(a) * len / 2); c.stroke();
  }
  if (mode === 'ink') {   // kontur z krawędzi tematu
    for (let y = 1; y < H - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
      const g = Math.abs(S.L(x + 1, y) - S.L(x - 1, y)) + Math.abs(S.L(x, y + 1) - S.L(x, y - 1));
      if (g > 0.22) { c.fillStyle = css(ink, clamp(g * 2)); c.fillRect(x, y, 1, 1); }
    }
  }
  const h = hgt.getContext('2d'); h.drawImage(col, 0, 0);
}
// ziarno podłoża dla suchych technik (węgiel, pastel): maska, gdzie materiał nie dosięga dołków papieru
function grainMask(W, H, seed, scale, amount) {
  const g = canvas(W, H), c = g.getContext('2d'), img = c.createImageData(W, H), n = valueNoise(seed + 55);
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) { const v = fbm(n, x / scale, y / scale, 2); img.data[i * 4 + 3] = v < amount ? 255 * clamp((amount - v) * 6) : 0; }
  c.putImageData(img, 0, 0); return g;
}
// patyczek: tusz nabrany na gałązkę — grube i cienkie linie, przerwy (suchy patyk), kleksy na początku pociągnięcia
function stick(col, hgt, S, W, H, spec, r) {
  const c = col.getContext('2d'), k = W / 1024 * spec.stroke, ink = [0.07, 0.06, 0.05];
  const n = marks(5000, spec, W, H);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H, dark = 1 - S.L(x, y); if (dark < 0.2 + r() * 0.6) continue;
    const d = S.dir(x, y, 3), ang = (d == null ? r() * Math.PI : d) + (r() - 0.5) * 0.5, len = (10 + r() * 30) * k;
    let load = 1, px = x, py = y, a = ang; c.lineCap = 'round';
    if (r() < 0.12) { c.fillStyle = css(ink, 0.9); c.beginPath(); c.arc(px, py, (1 + r() * 2) * k, 0, Math.PI * 2); c.fill(); }   // kleks (czasem)
    for (let s = 0; s < len; s += 2 * k) {
      a += (r() - 0.5) * 0.35; const nx = px + Math.cos(a) * 2 * k, ny = py + Math.sin(a) * 2 * k;
      load *= 0.96 + r() * 0.03;
      if (r() > 0.15 + (1 - load) * 0.6) { c.strokeStyle = css(ink, 0.85 * load); c.lineWidth = Math.max(0.5, (0.6 + 2.6 * load * r()) * k); c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke(); }
      px = nx; py = ny;
    }
  }
  hgt.getContext('2d').drawImage(col, 0, 0);
}
// długopis: niebieski tusz, cienka linia bez odrywania — kółeczka i zygzaki, im ciemniej, tym gęściej; grudki tuszu
function ballpoint(col, hgt, S, W, H, spec, r) {
  const c = col.getContext('2d'), k = W / 1024 * spec.stroke, ink = [0.1, 0.16, 0.48];
  const n = marks(30000, spec, W, H);
  c.lineWidth = Math.max(0.6, 0.75 * k); c.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H, dark = 1 - S.L(x, y); if (dark < 0.12 + r() * 0.65) continue;
    const rad = (2 + r() * 4) * k, turns = 2 + Math.floor(dark * 5), drift = (r() - 0.5) * 2 * k;
    c.strokeStyle = css(ink, 0.35 + dark * 0.4); c.beginPath();
    for (let t = 0; t <= turns * 12; t++) { const a = t / 12 * Math.PI * 2, xx = x + Math.cos(a) * rad + t * drift * 0.2, yy = y + Math.sin(a) * rad * 0.8 + t * 0.15 * k; t ? c.lineTo(xx, yy) : c.moveTo(xx, yy); }
    c.stroke();
    if (r() < 0.01) { c.fillStyle = css(ink, 0.9); c.beginPath(); c.arc(x, y, 1.2 * k, 0, Math.PI * 2); c.fill(); }   // grudka z kulki
  }
  hgt.getContext('2d').drawImage(col, 0, 0);
}
// węgiel i pastel: szerokie, miękkie pociągnięcia, roztarte; materiał zostaje na grzbietach ziarna podłoża
function dry(col, hgt, S, W, H, spec, r, mode) {
  const c = col.getContext('2d'), k = W / 1024 * spec.stroke, coal = mode === 'charcoal';
  const n = marks(coal ? 9000 : 7000, spec, W, H);
  const layer = canvas(W, H), g = layer.getContext('2d'); g.lineCap = 'round';
  if (!coal) { g.globalAlpha = 0.6; g.filter = `blur(${4 * k}px)`; g.drawImage(S.canvas, 0, 0); g.filter = 'none'; g.globalAlpha = 1; }   // pastel: roztarta warstwa pod kreskami
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H, base = S.at(x, y), dark = 1 - lum(base[0], base[1], base[2]);
    if (coal && dark < 0.15 + r() * 0.5) continue;
    const d = S.dir(x, y, 4), ang = (d == null ? 0.6 : d) + (r() - 0.5) * 0.4, len = (14 + r() * 26) * k, w = (coal ? 5 + r() * 9 : 4 + r() * 7) * k;
    const colr = coal ? [0.08, 0.08, 0.09] : base.map((q) => q + (r() - 0.5) * 0.1);
    g.strokeStyle = css(colr, coal ? 0.1 + dark * 0.25 : 0.55); g.lineWidth = w;
    g.beginPath(); g.moveTo(x - Math.cos(ang) * len / 2, y - Math.sin(ang) * len / 2); g.lineTo(x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2); g.stroke();
  }
  c.filter = `blur(${(coal ? 1.6 : 0.8) * k}px)`; c.drawImage(layer, 0, 0); c.filter = 'none';   // roztarcie palcem
  c.globalCompositeOperation = 'destination-out'; c.drawImage(grainMask(W, H, spec.seed, coal ? 2.2 : 2.8, coal ? 0.42 : 0.38), 0, 0); c.globalCompositeOperation = 'source-over';
  hgt.getContext('2d').globalAlpha = 0.5; hgt.getContext('2d').drawImage(col, 0, 0); hgt.getContext('2d').globalAlpha = 1;
}
// flamaster: równa szerokość, płaski kolor, nakładające się pasy ciemnieją (farba się mnoży), równoległe pociągnięcia
function marker(col, hgt, S, W, H, spec, r) {
  const c = col.getContext('2d'), k = W / 1024 * spec.stroke, w = 7 * k;
  c.lineCap = 'round'; c.lineWidth = w;
  for (const pass of [0, 1]) {
    const ang = pass ? -0.9 : 0.35, ca = Math.cos(ang), sa = Math.sin(ang), step = w * (pass ? 1.4 : 0.85);
    for (let t = -W - H; t < W + H; t += step) {
      let open = false, last = null;
      for (let s = -W - H; s < W + H; s += 3 * k) {
        const x = -t * sa + s * ca, y = t * ca + s * sa; if (x < -w || x > W + w || y < -w || y > H + w) { if (open) c.stroke(); open = false; continue; }
        const base = S.at(x, y), dark = 1 - lum(base[0], base[1], base[2]);
        if (pass && dark < 0.55) { if (open) c.stroke(); open = false; continue; }
        const q = base.map((v) => Math.round(v * 5) / 5).join();   // nowy pas, gdy zmienia się kolor (flamaster innego koloru)
        if (!open || q !== last) { if (open) c.stroke(); c.strokeStyle = css(pass ? mix(base, [0, 0, 0], 0.35) : base, 0.55); c.beginPath(); c.moveTo(x, y); open = true; last = q; }
        else c.lineTo(x + (r() - 0.5) * 0.6, y + (r() - 0.5) * 0.6);
      }
      if (open) c.stroke();
    }
  }
  const h = hgt.getContext('2d'); h.fillStyle = 'rgba(255,255,255,0.04)'; h.fillRect(0, 0, W, H);
}
function pointillism(col, hgt, S, W, H, spec, r) {
  const c = col.getContext('2d'), h = hgt.getContext('2d'), k = W / 1024 * spec.stroke;
  const n = marks(60000, spec, W, H);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H, base = S.at(x, y), rad = (2.2 + r() * 1.8) * k, j = (r() - 0.5) * 0.25;
    c.fillStyle = css([base[0] + j, base[1] + (r() - 0.5) * 0.25, base[2] - j]); c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill();
    h.fillStyle = 'rgba(255,255,255,0.35)'; h.beginPath(); h.arc(x, y, rad * 0.8, 0, Math.PI * 2); h.fill();
  }
}

/* ---------------- surface finish: support, relief light, varnish, cracks, age ---------------- */
function finish(col, hgt, W, H, spec, r, S) {
  const c = col.getContext('2d'), img = c.getImageData(0, 0, W, H), d = img.data, hd = hgt.getContext('2d').getImageData(0, 0, W, H).data;
  const sf = surfaceAt(spec.surface, spec.seed), Hgt = new Float32Array(W * H), V = spec.view, Cv = V !== 'normal' ? new Float32Array(W * H) : null, Sh = Cv && new Float32Array(W * H);
  const cr = spec.cracks > 0 ? crackField(W, H, spec.seed, spec.cracks) : null, n = valueNoise(spec.seed + 77);
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
    const s = sf(x, y), paint = hd[i * 4] / 255, a = d[i * 4 + 3] / 255, cover = clamp(a + paint * 0.5);
    for (let k = 0; k < 3; k++) d[i * 4 + k] = (d[i * 4 + k] / 255 * cover + s.c[k] * (1 - cover)) * 255;   // podłoże prześwituje przez cienką farbę
    d[i * 4 + 3] = 255; if (Cv) { Cv[i] = Math.max(cover, paint); Sh[i] = s.h; }
    Hgt[i] = paint * 2.2 + s.h * (1 - Math.min(1, paint * 1.3)) * 0.8 - (cr ? cr[i] * 1.5 : 0);
  }
  // światło boczne: normalne z wysokości, cieniowanie lambertowskie z kierunku `light` (stopnie) pod niskim kątem
  const la = spec.light * Math.PI / 180, lx = Math.cos(la), ly = -Math.sin(la), lz = 0.6, rel = spec.relief;
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
    const hx = Hgt[i + (x < W - 1 ? 1 : 0)] - Hgt[i - (x > 0 ? 1 : 0)], hy = Hgt[i + (y < H - 1 ? W : 0)] - Hgt[i - (y > 0 ? W : 0)];
    const nx = -hx * rel * 3, ny = -hy * rel * 3, nl = Math.hypot(nx, ny, 1);
    const sh = (nx * lx + ny * ly + lz) / (nl * Math.hypot(lx, ly, lz)), shade = 0.62 + 0.55 * sh;
    let R = d[i * 4] / 255 * shade, G = d[i * 4 + 1] / 255 * shade, B = d[i * 4 + 2] / 255 * shade;
    if (sh > 0.92 && rel > 0) { const g = (sh - 0.92) * 4 * rel; R += g; G += g; B += g; }   // połysk farby na grzbietach
    if (cr && cr[i] > 0) { const q = 1 - cr[i] * 0.55; R *= q; G *= q; B *= q; }
    if (spec.varnish > 0) { const v = spec.varnish; R = R * (1 - v * 0.08) + v * 0.06; G = G * (1 - v * 0.15) + v * 0.04; B = B * (1 - v * 0.4); }   // werniks żółknie
    if (spec.age > 0) { const m = fbm(n, x / 120, y / 120), v = spec.age * (0.4 + m * 0.6), e = Math.hypot(x / W - 0.5, y / H - 0.5); const f = 1 - v * 0.25 - e * e * v * 0.9; R = R * f + v * 0.05; G = G * f + v * 0.03; B *= f; }
    if (Cv) [R, G, B] = examView(V, d[i * 4] / 255, d[i * 4 + 1] / 255, d[i * 4 + 2] / 255, sh, Cv[i], Hgt[i], Sh[i], cr ? cr[i] : 0, spec, S, x, y);
    d[i * 4] = clamp(R) * 255; d[i * 4 + 1] = clamp(G) * 255; d[i * 4 + 2] = clamp(B) * 255;
  }
  c.putImageData(img, 0, 0);
}
// widok badawczy jednego piksela (barwa przed światłem i werniksem, sh — oświetlenie reliefu, cover — farba)
// raking — sama faktura w świetle bocznym; uv — stary werniks świeci zielonkawo, bez werniksu ciemny fiolet (jak w
// ekspertyzie); ir — farba przezroczysta w podczerwieni, widać rysunek pod nią (krawędzie tematu, lekko przesunięte —
// poprawki autora); xray — gęstość: jasne, kryjące farby (biel ołowiowa) i metalowe podłoże jasne, spękania ciemne
function examView(V, r0, g0, b0, sh, cover, h, sh0, crack, spec, S, x, y) {
  const l = lum(r0, g0, b0);
  if (V === 'raking') { const v = 0.18 + 0.3 * l + 0.55 * sh - crack * 0.4; return [v * 1.03, v * 0.98, v * 0.88]; }
  if (V === 'uv') {
    const old = clamp(spec.varnish * 1.4 + spec.age * 0.6), L = l * 255, f = [(L * 0.18 + 22) / 255, (L * 0.08 + 10) / 255, (L * 0.32 + 48) / 255], o = [(L * 0.16 + 38) / 255, (L * 0.34 + 52) / 255, (L * 0.24 + 50) / 255];
    const c = mix(f, o, old); return c.map((q) => q * (1 - crack * 0.6));
  }
  if (V === 'ir') {
    let v = (150 + (l * 255 - 128) * 0.3) / 255;
    if (S && spec.subject !== 'image') { const k = spec.size / 1024, ox = 1.5 * k, gx = S.L(x + 1 - ox, y + 1) - S.L(x - 1 - ox, y + 1), gy = S.L(x - ox, y + 2) - S.L(x - ox, y); const g = Math.hypot(gx, gy); if (g > 0.08) v -= clamp((g - 0.08) * 3) * 0.45; }
    return [v, v, v];
  }
  // xray
  const base = spec.surface === 'metal' ? 0.85 : spec.surface === 'wood' ? 0.28 + sh0 * 0.15 : 0.12 + sh0 * 0.08;
  const v = clamp(base + cover * (0.12 + 0.55 * l * l) + h * 0.06 - crack * 0.35); return [v, v, v];
}
// krakelura: sieć spękań — krawędzie komórek Woronoja z drobnymi odnogami
function crackField(W, H, seed, amount) {
  const r = rng(seed + 9), cell = 60 / (0.5 + amount), pts = [], gw = Math.ceil(W / cell) + 1, gh = Math.ceil(H / cell) + 1;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) pts.push([(i + r()) * cell, (j + r()) * cell]);
  const out = new Float32Array(W * H), n = valueNoise(seed + 13);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = x + (fbm(n, x / 25, y / 25) - 0.5) * cell * 0.4, wy = y + (fbm(n, y / 25 + 9, x / 25) - 0.5) * cell * 0.4;
    const ci = Math.floor(wx / cell), cj = Math.floor(wy / cell); let d1 = 1e9, d2 = 1e9;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const p = pts[(cj + dj) * gw + (ci + di)]; if (!p) continue;
      const d = Math.hypot(p[0] - wx, p[1] - wy); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const e = d2 - d1; out[y * W + x] = e < 1.2 ? (1.2 - e) / 1.2 : 0;
  }
  return out;
}

/* ---------------- conversions (on the finished picture) ---------------- */
function convert(col, W, H, cv, seed) {
  const c = col.getContext('2d');
  if (cv.kind === 'blur') { const t = canvas(W, H), g = t.getContext('2d'); g.filter = `blur(${cv.radius ?? 2}px)`; g.drawImage(col, 0, 0); c.clearRect(0, 0, W, H); c.drawImage(t, 0, 0); return; }
  if (cv.kind === 'pixelate') { const s = Math.max(2, cv.size ?? 8), t = canvas(Math.ceil(W / s), Math.ceil(H / s)), g = t.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(col, 0, 0, t.width, t.height); c.imageSmoothingEnabled = false; c.drawImage(t, 0, 0, W, H); c.imageSmoothingEnabled = true; return; }
  const img = c.getImageData(0, 0, W, H), d = img.data;
  if (cv.kind === 'gray' || cv.kind === 'sepia' || cv.kind === 'duotone') {
    const a = hex(cv.dark || '#1f2a44'), b = hex(cv.light || '#f2d7a6');
    for (let i = 0; i < d.length; i += 4) {
      const l = lum(d[i], d[i + 1], d[i + 2]) / 255;
      const o = cv.kind === 'gray' ? [l, l, l] : cv.kind === 'sepia' ? [l * 1.07 + 0.05, l * 0.9 + 0.03, l * 0.7] : mix(a, b, l);
      d[i] = clamp(o[0]) * 255; d[i + 1] = clamp(o[1]) * 255; d[i + 2] = clamp(o[2]) * 255;
    }
  } else if (cv.kind === 'invert') { for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; } }
  else if (cv.kind === 'posterize') { const L = Math.max(2, cv.levels ?? 5) - 1; for (let i = 0; i < d.length; i++) if ((i & 3) !== 3) d[i] = Math.round(d[i] / 255 * L) / L * 255; }
  else if (cv.kind === 'contrast') { const k = cv.contrast ?? 1.2, b = (cv.brightness ?? 0) * 255; for (let i = 0; i < d.length; i++) if ((i & 3) !== 3) d[i] = clamp(((d[i] - 128) * k + 128 + b) / 255) * 255; }
  else if (cv.kind === 'quantize') {
    const P = (cv.palette && cv.palette.length ? cv.palette : PALETTES[cv.paletteName || 'natural']).map(hex).map((q) => q.map((v) => v * 255));
    const near = (r0, g0, b0) => { let best = 0, bd = 1e18; for (let k = 0; k < P.length; k++) { const p = P[k], dd = (p[0] - r0) ** 2 + (p[1] - g0) ** 2 + (p[2] - b0) ** 2; if (dd < bd) { bd = dd; best = k; } } return P[best]; };
    const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], dith = cv.dither || 'floyd', F = new Float32Array(W * H * 3);
    for (let i = 0, j = 0; i < d.length; i += 4, j += 3) { F[j] = d[i]; F[j + 1] = d[i + 1]; F[j + 2] = d[i + 2]; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const j = (y * W + x) * 3; let r0 = F[j], g0 = F[j + 1], b0 = F[j + 2];
      if (dith === 'bayer') { const t = (B4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 48; r0 += t; g0 += t; b0 += t; }
      const p = near(r0, g0, b0), i = (y * W + x) * 4; d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2];
      if (dith === 'floyd') {
        const er = [r0 - p[0], g0 - p[1], b0 - p[2]];
        const push = (dx, dy, f) => { if (x + dx < 0 || x + dx >= W || y + dy >= H) return; const q = ((y + dy) * W + x + dx) * 3; for (let k = 0; k < 3; k++) F[q + k] += er[k] * f; };
        push(1, 0, 7 / 16); push(-1, 1, 3 / 16); push(0, 1, 5 / 16); push(1, 1, 1 / 16);
      }
    }
  } else if (cv.kind === 'halftone') {
    const s = Math.max(3, cv.size ?? 8), ang = (cv.angle ?? 45) * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang), src = new Uint8ClampedArray(d), ink = hex(cv.ink || '#151515'), paper = hex(cv.paper || '#f3eee2');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x * ca + y * sa, v = -x * sa + y * ca, cu = (Math.floor(u / s) + 0.5) * s, cvv = (Math.floor(v / s) + 0.5) * s;
      const cx = cu * ca - cvv * sa, cy = cu * sa + cvv * ca, si = (clamp(Math.round(cy), 0, H - 1) * W + clamp(Math.round(cx), 0, W - 1)) * 4;
      const dark = 1 - lum(src[si], src[si + 1], src[si + 2]) / 255, rad = Math.sqrt(dark) * s * 0.62, on = Math.hypot(u - cu, v - cvv) < rad;
      const o = on ? ink : paper, i = (y * W + x) * 4; d[i] = o[0] * 255; d[i + 1] = o[1] * 255; d[i + 2] = o[2] * 255;
    }
  } else if (cv.kind === 'edges' || cv.kind === 'sharpen') {
    const src = new Uint8ClampedArray(d), L = (x, y) => { const i = (clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)) * 4; return lum(src[i], src[i + 1], src[i + 2]); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (cv.kind === 'edges') {
        const gx = -L(x - 1, y - 1) - 2 * L(x - 1, y) - L(x - 1, y + 1) + L(x + 1, y - 1) + 2 * L(x + 1, y) + L(x + 1, y + 1);
        const gy = -L(x - 1, y - 1) - 2 * L(x, y - 1) - L(x + 1, y - 1) + L(x - 1, y + 1) + 2 * L(x, y + 1) + L(x + 1, y + 1);
        const g = clamp(Math.hypot(gx, gy) / 255 * (cv.strength ?? 1.5)), v = (1 - g) * 255; d[i] = d[i + 1] = d[i + 2] = v;
      } else {
        const k = cv.amount ?? 0.6;
        for (let ch = 0; ch < 3; ch++) { const at = (xx, yy) => src[(clamp(yy, 0, H - 1) * W + clamp(xx, 0, W - 1)) * 4 + ch]; d[i + ch] = at(x, y) * (1 + 4 * k) - k * (at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1)); }
      }
    }
  }
  c.putImageData(img, 0, 0);
}

/* ---------------- formats ---------------- */
function format(pic, spec) {
  const W = pic.width, H = pic.height;
  if (spec.format === 'stamp') {   // znaczek: biały margines, ząbkowanie (półkola wycięte co ok. 2,5 % boku), napis i wartość
    const m = Math.round(W * 0.07), out = canvas(W + m * 2, H + m * 2), c = out.getContext('2d'), R = m * 0.32, step = m * 0.95;
    c.fillStyle = '#f6f3ea'; c.fillRect(0, 0, out.width, out.height);
    c.drawImage(pic, m, m);
    c.strokeStyle = 'rgba(30,30,40,0.7)'; c.lineWidth = Math.max(1, W * 0.004); c.strokeRect(m, m, W, H);
    c.globalCompositeOperation = 'destination-out';
    for (let x = step / 2; x < out.width; x += step) for (const y of [0, out.height]) { c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill(); }
    for (let y = step / 2; y < out.height; y += step) for (const x of [0, out.width]) { c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill(); }
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = 'rgba(20,20,30,0.85)'; c.font = `700 ${Math.round(W * 0.07)}px Georgia, serif`; c.textAlign = 'right';
    c.fillText(spec.text || '50', m + W - W * 0.04, m + H - H * 0.04);
    return out;
  }
  if (spec.format === 'frame' || spec.format === 'mount') {
    const m = Math.round(W * (spec.format === 'frame' ? 0.09 : 0.12)), out = canvas(W + m * 2, H + m * 2), c = out.getContext('2d');
    if (spec.format === 'frame') {
      const g = c.createLinearGradient(0, 0, out.width, out.height); g.addColorStop(0, '#6b4a18'); g.addColorStop(0.3, '#d6b25e'); g.addColorStop(0.55, '#8a6422'); g.addColorStop(0.8, '#e8c977'); g.addColorStop(1, '#5c3d12');
      c.fillStyle = g; c.fillRect(0, 0, out.width, out.height);
      for (let k = 0; k < 4; k++) { c.strokeStyle = k % 2 ? 'rgba(255,240,190,0.5)' : 'rgba(40,25,5,0.55)'; c.lineWidth = m * 0.06; const o = m * (0.2 + k * 0.18); c.strokeRect(o, o, out.width - o * 2, out.height - o * 2); }
    } else { c.fillStyle = '#efe9dc'; c.fillRect(0, 0, out.width, out.height); c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2; c.strokeRect(m - 3, m - 3, W + 6, H + 6); }
    c.drawImage(pic, m, m); return out;
  }
  return pic;
}

/* ---------------- render ---------------- */
export function normalize(spec = {}) {
  const s = { ...DEFAULTS, ...spec };
  s.size = clamp(Math.round(+s.size || 1024), 128, 4096); s.aspect = clamp(+s.aspect || 1, 0.25, 4);
  s.seed = Math.max(1, Math.round(+s.seed || 1)); s.stroke = clamp(+s.stroke || 1, 0.3, 4); s.detail = clamp(+s.detail || 1, 0.2, 3);
  for (const [k, list] of [['subject', SUBJECTS], ['technique', TECHNIQUES], ['surface', SURFACES], ['view', VIEWS], ['format', FORMATS]]) if (!list[s[k]]) throw new Error(`${k}: one of ${Object.keys(list).join(', ')}`);
  if (!PALETTES[s.palette]) throw new Error(`palette: one of ${Object.keys(PALETTES).join(', ')}`);
  s.convert = (s.convert || []).map((c) => { const o = typeof c === 'string' ? { kind: c } : { ...c }; if (!CONVERSIONS[o.kind]) throw new Error(`convert: one of ${Object.keys(CONVERSIONS).join(', ')}`); return o; });
  return s;
}
export function render(spec0, { image } = {}) {
  const spec = normalize(spec0);
  const W = spec.aspect >= 1 ? spec.size : Math.round(spec.size * spec.aspect), H = spec.aspect >= 1 ? Math.round(spec.size / spec.aspect) : spec.size;
  const src = canvas(W, H); drawSubject(src.getContext('2d'), W, H, spec, image);
  const S = { ...sampler(src, W, H), canvas: src }, r = rng(spec.seed);
  const col = canvas(W, H), hgt = canvas(W, H);
  hgt.getContext('2d').fillStyle = '#000'; hgt.getContext('2d').fillRect(0, 0, W, H);
  if (spec.technique === 'none') { col.getContext('2d').drawImage(src, 0, 0); }
  else if (spec.technique === 'oil') { col.getContext('2d').drawImage(src, 0, 0); col.getContext('2d').globalAlpha = 1; oil(col, hgt, S, W, H, spec, r); }
  else if (spec.technique === 'watercolor') watercolor(col, hgt, S, W, H, spec, r);
  else if (spec.technique === 'pointillism') pointillism(col, hgt, S, W, H, spec, r);
  else if (spec.technique === 'stick') stick(col, hgt, S, W, H, spec, r);
  else if (spec.technique === 'ballpoint') ballpoint(col, hgt, S, W, H, spec, r);
  else if (spec.technique === 'charcoal' || spec.technique === 'pastel') dry(col, hgt, S, W, H, spec, r, spec.technique);
  else if (spec.technique === 'marker') marker(col, hgt, S, W, H, spec, r);
  else hatch(col, hgt, S, W, H, spec, r, spec.technique);
  finish(col, hgt, W, H, spec, r, S);
  for (const cv of spec.convert) convert(col, W, H, cv, spec.seed);
  return { canvas: format(col, spec), spec };
}
