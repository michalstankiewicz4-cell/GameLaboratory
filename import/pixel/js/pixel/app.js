// Pixel Studio: one place for every way of making pixel art here.
//  3D model   → a model rendered small and lit in hard, hue-shifted steps, then palette, majority downsampling,
//               inner lines, outline, clean-up (render3d.js)
//  Generate   → sprites drawn straight in pixels by rules: planet, gem, potion, coin, tree, rock, fire, slime, tiles
//  Draw       → a pixel editor (pencil, eraser, fill, line, rectangle, picker, mirror, frames, onion skin, undo),
//               with sprites as text in and out — and "Edit in Draw" takes any result there for retouching (the hybrid)
//  Pixel Doctor checks whatever is shown and fixes what it can; export PNG (frame or sheet, any scale) and GIF.
import { PixelImage, PALETTES, paletteRGB, autoPalette, quantize, outline, removeOrphans, pixelPerfect, modeDownsample, toCanvas, sheet, fit, hex, toHex, colorsOf, oklab } from './core.js';
import { GENERATORS, GENERATOR_IDS } from './generators.js';
import { SUBJECTS, SUBJECT_IDS, render3d, innerLines } from './render3d.js';
import { examine } from './doctor.js';
import { encodeGIF } from './gif.js';
import { SPRITES } from './sprites.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const KEY = 'steelSalvo.pixelStudio.v1';
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const S = {
  mode: '3d', w: 48, h: 48, palette: 'auto', autoN: 14, dither: 'none', ditherK: 0.5, outline: 'selout', corners: false, orphans: true, perfect: true, zoom: 8, fps: 8,
  sub: 'adventurer', option: '', seed: 1, frames: 8, anim: 'walk', yaw: 35, pitch: 20, zoom3d: 1, lightAz: -45, lightEl: 45, steps: 4, contrast: 1, hueShift: 0.7, ambient: 0.25, ss: 3, inner: 0.015,
  gen: 'planet', gSeed: 3, gFrames: 16, gp: {},
  ...(saved || {}),
};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode */ } };

let frames = [new PixelImage(S.w, S.h)], shown = 0, raw = null, doctorView = null;

/* ---------------- the pipeline (3D and generators) ---------------- */
function palFor(src) {
  if (S.palette === 'free') return null;
  if (S.palette === 'auto') return autoPalette(src, S.autoN);
  return paletteRGB(S.palette);
}
function finish(src, { ss = 1, depths = null } = {}) {
  const pal = palFor(src);
  let out = src.map((f) => (pal ? quantize(f, pal, { dither: S.dither, strength: S.ditherK }) : f));
  out = out.map((f, k) => {
    let g = ss > 1 ? modeDownsample(f, ss) : f;
    if (depths && S.inner > 0) g = innerLines(g, depths[k], ss, S.inner);
    g = outline(g, { mode: S.outline, corners: S.corners });
    if (pal && (S.outline === 'selout' || (depths && S.inner > 0))) g = quantize(g, S.outline === 'dark' ? pal : pal.concat(S.palette === 'auto' ? [] : []));
    if (S.orphans) g = removeOrphans(g);
    if (S.perfect) { const dk = darkKeys(g); g = pixelPerfect(g, (k) => dk.has(k)); }
    return g;
  });
  return out;
}
// the outline-like colours: the darkest colour(s) that touch the empty background
function darkKeys(img) {
  const ks = new Map();
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) { const k = img.key(x, y); if (k < 0) continue; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => img.alpha(x + a, y + b) < 128)) ks.set(k, (ks.get(k) || 0) + 1); }
  const arr = [...ks.keys()].map((k) => [k, oklab([k >> 16, (k >> 8) & 255, k & 255])[0]]).sort((a, b) => a[1] - b[1]);
  return new Set(arr.slice(0, 1).map((a) => a[0]));
}
let busy = 0;
function run() {
  if (S.mode === 'draw') { frames = doc.frames; shown = Math.min(shown, frames.length - 1); afterFrames(); return; }
  clearTimeout(busy); $('status').textContent = 'rendering…';
  busy = setTimeout(() => {
    const t0 = performance.now();
    try {
      if (S.mode === '3d') {
        const r = render3d({ subject: S.sub, option: S.option, seed: S.seed, frames: S.frames, anim: S.anim, yaw: S.yaw, pitch: S.pitch, zoom: S.zoom3d, lightAz: S.lightAz, lightEl: S.lightEl, steps: S.steps, contrast: S.contrast, hueShift: S.hueShift, ambient: S.ambient, ss: S.ss, w: S.w, h: S.h });
        raw = r.frames; frames = finish(r.frames, { ss: S.ss, depths: r.depths });
      } else {
        const G = GENERATORS[S.gen], par = { ...Object.fromEntries(Object.entries(G.params).map(([k, v]) => [k, S.gp[S.gen + '.' + k] ?? v])), seed: S.gSeed, frames: S.gFrames };
        raw = G.draw(S.w, S.h, par); frames = finish(raw);
      }
      $('status').textContent = `${frames.length} frame${frames.length > 1 ? 's' : ''} · ${frames[0].w}×${frames[0].h} · ${colorsOf(frames).length} colours · ${Math.round(performance.now() - t0)} ms`;
    } catch (e) { $('status').textContent = 'error: ' + e.message; console.error(e); }
    shown = 0; afterFrames();
  }, 60);
}
function afterFrames() { doctorView = null; if (S.mode === 'draw') drawStatus(); doctor(); draw(); }
function drawStatus() { $('status').textContent = `drawing · ${frames.length} frame${frames.length > 1 ? 's' : ''} · ${frames[0].w}×${frames[0].h} · ${colorsOf(frames).length} colours`; }

/* ---------------- preview ---------------- */
const view = $('stage'), vg = view.getContext('2d');
function draw() {
  const f = frames[shown % frames.length]; if (!f) return;
  const z = S.zoom; view.width = f.w * z; view.height = f.h * z;
  vg.imageSmoothingEnabled = false; vg.clearRect(0, 0, view.width, view.height);
  if (S.mode === 'draw' && $('onion').checked && frames.length > 1) { vg.globalAlpha = 0.25; vg.drawImage(toCanvas(frames[(shown + frames.length - 1) % frames.length]), 0, 0, view.width, view.height); vg.globalAlpha = 1; }
  vg.drawImage(toCanvas(f), 0, 0, view.width, view.height);
  if (S.mode === 'draw' && z >= 6) { vg.strokeStyle = 'rgba(255,255,255,.07)'; vg.lineWidth = 1; vg.beginPath(); for (let x = 0; x <= f.w; x++) { vg.moveTo(x * z + 0.5, 0); vg.lineTo(x * z + 0.5, view.height); } for (let y = 0; y <= f.h; y++) { vg.moveTo(0, y * z + 0.5); vg.lineTo(view.width, y * z + 0.5); } vg.stroke(); }
  if (doctorView) { vg.strokeStyle = '#ff4fa3'; vg.lineWidth = Math.max(1, z / 6); for (const [x, y] of doctorView) vg.strokeRect(x * z + 1, y * z + 1, z - 2, z - 2); }
  $('frameNo').textContent = `${(shown % frames.length) + 1} / ${frames.length}`;
  // the 1× and 2× true-size previews
  for (const [id, sc] of [['true1', 1], ['true2', 2]]) toCanvas(f, sc, $(id));
}
let playT = 0, playing = true, last = performance.now();
function loop(now) {
  const dt = now - last; last = now;
  if (playing && frames.length > 1 && !(S.mode === 'draw' && painting)) { playT += dt; if (playT > 1000 / S.fps) { playT = 0; shown = (shown + 1) % frames.length; draw(); } }
  requestAnimationFrame(loop);
}

/* ---------------- Pixel Doctor ---------------- */
function doctor() {
  const f = frames[shown % frames.length]; if (!f) return;
  const r = examine(f, { light: [-1, -1] });
  $('score').textContent = r.score; $('score').className = 'score ' + (r.score >= 85 ? 'good' : r.score >= 60 ? 'mid' : 'bad');
  $('findings').replaceChildren(...(r.findings.length ? r.findings.map((x) => {
    const row = el('div', { className: 'find sev' + x.sev }, el('span', { textContent: x.msg }));
    const b = el('div', { className: 'btns' });
    if (x.px && x.px.length) b.append(el('button', { type: 'button', textContent: 'Show', onclick: () => { doctorView = doctorView === x.px ? null : x.px; draw(); } }));
    if (x.fix) b.append(el('button', { type: 'button', textContent: 'Fix', onclick: () => { frames = frames.map((fr) => x.fix(fr)); if (S.mode === 'draw') { pushUndo(); doc.frames = frames; } afterFrames(); } }));
    if (b.children.length) row.append(b);
    return row;
  }) : [el('div', { className: 'find ok', textContent: 'No problems found.' })]));
  window.__pixelDoctor = r;
}

/* ---------------- Draw mode: the editor ---------------- */
const doc = { frames: [new PixelImage(32, 32)], palette: ['#1a1420', '#f4f4ee', '#c8283a', '#ef7a2a', '#f7b84a', '#4f7a3a', '#8fb45a', '#3f78a8', '#8b97a8', '#5d687a'], color: '#c8283a' };
const undo = [], redo = [];
const pushUndo = () => { undo.push(doc.frames.map((f) => f.clone())); if (undo.length > 60) undo.shift(); redo.length = 0; };
let tool = 'pencil', painting = false, startPx = null, preStroke = null;
const TOOLS = [['pencil', 'Pencil (B)'], ['eraser', 'Eraser (E)'], ['fill', 'Fill (G)'], ['line', 'Line (L)'], ['rect', 'Rectangle (R)'], ['picker', 'Picker (I)']];
function swatches() {
  $('swatches').replaceChildren(...doc.palette.map((c) => { const b = el('button', { type: 'button', className: 'sw' + (c === doc.color ? ' on' : ''), title: c, onclick: () => { doc.color = c; $('color').value = c; swatches(); } }); b.style.background = c; return b; }));
}
function pxAt(e) { const r = view.getBoundingClientRect(), f = frames[shown]; return [Math.floor((e.clientX - r.left) / r.width * f.w), Math.floor((e.clientY - r.top) / r.height * f.h)]; }
function plot(f, x, y, erase) {
  const c = erase ? null : [...hex(doc.color), 255];
  const put = (xx, yy) => { if (xx < 0 || yy < 0 || xx >= f.w || yy >= f.h) return; if (erase) f.data[f.i(xx, yy) + 3] = 0; else f.set(xx, yy, c); };
  put(x, y); if ($('mirror').checked) put(f.w - 1 - x, y);
}
function lineTo(f, x0, y0, x1, y1, erase) {                    // Bresenham: a pixel-perfect line
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  for (;;) { plot(f, x0, y0, erase); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function flood(f, x, y) {
  const k = f.key(x, y), c = hex(doc.color), target = (c[0] << 16) | (c[1] << 8) | c[2]; if (k === target) return;
  const st = [[x, y]];
  while (st.length) { const [a, b] = st.pop(); if (a < 0 || b < 0 || a >= f.w || b >= f.h || f.key(a, b) !== k) continue; f.set(a, b, [...c, 255]); st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); }
}
view.addEventListener('pointerdown', (e) => {
  if (S.mode !== 'draw') return;
  view.setPointerCapture(e.pointerId); const [x, y] = pxAt(e), f = frames[shown], erase = tool === 'eraser' || e.button === 2;
  if (tool === 'picker') { const c = f.get(x, y); if (c && c[3]) { doc.color = toHex(c); if (!doc.palette.includes(doc.color)) doc.palette.push(doc.color); $('color').value = doc.color; swatches(); } return; }
  pushUndo(); painting = true; startPx = [x, y]; preStroke = f.clone();
  if (tool === 'fill') { flood(f, x, y); painting = false; afterEdit(); return; }
  if (tool === 'pencil' || tool === 'eraser') plot(f, x, y, erase);
  draw();
});
view.addEventListener('pointermove', (e) => {
  if (!painting) return;
  const [x, y] = pxAt(e), f = frames[shown], erase = tool === 'eraser' || e.buttons === 2;
  if (tool === 'pencil' || tool === 'eraser') { lineTo(f, startPx[0], startPx[1], x, y, erase); startPx = [x, y]; }
  else { f.data.set(preStroke.data); if (tool === 'line') lineTo(f, startPx[0], startPx[1], x, y, false); else { const [x0, y0] = startPx; for (let xx = Math.min(x0, x); xx <= Math.max(x0, x); xx++) { plot(f, xx, y0); plot(f, xx, y); } for (let yy = Math.min(y0, y); yy <= Math.max(y0, y); yy++) { plot(f, x0, yy); plot(f, x, yy); } } }
  draw();
});
view.addEventListener('pointerup', () => { if (painting) { painting = false; afterEdit(); } });
view.addEventListener('contextmenu', (e) => { if (S.mode === 'draw') e.preventDefault(); });
function afterEdit() { doc.frames = frames; saveDoc(); drawStatus(); doctor(); draw(); }
function saveDoc() { try { localStorage.setItem(KEY + '.doc', JSON.stringify(toText())); } catch { /* full or private */ } }
// text format: { w, h, palette: { char: '#hex' }, frames: [[row strings]] } — '.' is empty
function toText() {
  const cols = colorsOf(doc.frames).map(toHex), chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=?!';
  const pal = {}, idx = new Map(); cols.slice(0, chars.length).forEach((c, i) => { pal[chars[i]] = c; idx.set(c, chars[i]); });
  return { w: doc.frames[0].w, h: doc.frames[0].h, palette: pal, frames: doc.frames.map((f) => Array.from({ length: f.h }, (_, y) => Array.from({ length: f.w }, (_, x) => { const c = f.get(x, y); return c[3] < 128 ? '.' : idx.get(toHex(c)) || '.'; }).join(''))) };
}
function fromText(t) {
  const fr = t.frames.map((rows) => { const f = new PixelImage(t.w, t.h); rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && t.palette[ch]) f.set(x, y, [...hex(t.palette[ch]), 255]); })); return f; });
  doc.frames = fr; for (const c of Object.values(t.palette)) if (!doc.palette.includes(c.toLowerCase())) doc.palette.push(c.toLowerCase());
  S.w = t.w; S.h = t.h; syncRes(); frames = doc.frames; shown = 0; swatches(); afterFrames();
}

/* ---------------- export ---------------- */
function download(blob, name) { const a = el('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
const baseName = () => (S.mode === '3d' ? S.sub + (S.option ? '-' + S.option : '') : S.mode === 'gen' ? S.gen : 'drawing') + `-${frames[0].w}x${frames[0].h}`;
function exportPNG(which) {
  const sc = +$('exScale').value, img = which === 'sheet' ? sheet(frames) : frames[shown % frames.length];
  toCanvas(img, sc).toBlob((b) => download(b, `${baseName()}${which === 'sheet' ? '-sheet' : '-f' + (shown + 1)}@${sc}x.png`), 'image/png');
}
function exportGIF() { const sc = +$('exScale').value; download(new Blob([encodeGIF(frames, { delay: 1000 / S.fps, scale: sc })], { type: 'image/gif' }), `${baseName()}@${sc}x.gif`); }

/* ---------------- UI ---------------- */
function syncRes() { $('w').value = S.w; $('h').value = S.h; }
function setMode(m) {
  S.mode = m; save();
  [...$('modes').children].forEach((b) => b.classList.toggle('on', b.dataset.m === m));
  for (const [id, k] of [['p3d', '3d'], ['pgen', 'gen'], ['pdraw', 'draw']]) $(id).hidden = m !== k;
  $('pipe').hidden = m === 'draw';
  view.classList.toggle('drawing', m === 'draw');
  if (m === 'draw') { playing = false; $('play').textContent = 'Play'; if (doc.frames[0].w !== S.w || doc.frames[0].h !== S.h) doc.frames = doc.frames.map((f) => fit(f, S.w, S.h)); frames = doc.frames; shown = 0; afterFrames(); }
  else run();
}
$('modes').replaceChildren(...[['3d', '3D model'], ['gen', 'Generate'], ['draw', 'Draw']].map(([m, t]) => { const b = el('button', { type: 'button', textContent: t, onclick: () => setMode(m) }); b.dataset.m = m; return b; }));
for (const [k, p] of Object.entries(PALETTES)) $('palette').append(el('option', { value: k, textContent: p.label }));
for (const id of SUBJECT_IDS) $('sub').append(el('option', { value: id, textContent: SUBJECTS[id].label }));
for (const id of GENERATOR_IDS) $('gen').append(el('option', { value: id, textContent: GENERATORS[id].label }));
for (const [k, s] of Object.entries(SPRITES)) $('sample').append(el('option', { value: k, textContent: s.label }));
function subjectUI() {
  const Sb = SUBJECTS[S.sub];
  $('anim').replaceChildren(...Sb.anims.map((a) => el('option', { value: a, textContent: { turn: 'Turntable (rotate)', walk: 'Walk cycle', idle: 'Idle', wind: 'Wind', roll: 'Rolling on a swell', bob: 'Bob', open: 'Open the lid' }[a] })));
  if (!Sb.anims.includes(S.anim)) S.anim = Sb.anims[0]; $('anim').value = S.anim;
  const opts = Sb.options ? Sb.options() : null; $('optRow').hidden = !opts;
  if (opts) { $('option').replaceChildren(...opts.map(([v, t]) => el('option', { value: v, textContent: t }))); if (!opts.some(([v]) => v === S.option)) S.option = opts[0][0]; $('option').value = S.option; } else S.option = '';
}
function genUI() {
  const G = GENERATORS[S.gen];
  $('gparams').replaceChildren(...Object.entries(G.params).map(([k, v]) => {
    const key = S.gen + '.' + k, cur = S.gp[key] ?? v, isHue = k === 'hue';
    const i = el('input', { type: 'range', min: 0, max: isHue ? 6.28 : 1, step: 0.01, value: cur }), o = el('output', { textContent: isHue ? Math.round(cur / 6.283 * 360) + '°' : Math.round(cur * 100) + ' %' });
    i.oninput = () => { S.gp[key] = +i.value; o.textContent = isHue ? Math.round(+i.value / 6.283 * 360) + '°' : Math.round(+i.value * 100) + ' %'; save(); run(); };
    return el('div', { className: 'row' }, el('span', { textContent: { hue: 'Colour', land: 'Land', clouds: 'Clouds', level: 'Fill level' }[k] || k }), i, o);
  }));
}
const bind = (id, key, fmt = (v) => v, num = true, after = run) => {
  const i = $(id), o = $(id + 'V'); if (!i) return;
  if (i.type === 'checkbox') { i.checked = !!S[key]; i.onchange = () => { S[key] = i.checked; save(); after(); }; return; }
  i.value = S[key]; if (o) o.textContent = fmt(S[key]);
  const ev = i.tagName === 'SELECT' || i.type === 'number' ? 'change' : 'input';
  i.addEventListener(ev, () => { S[key] = num ? +i.value : i.value; if (o) o.textContent = fmt(S[key]); save(); after(); });
};
bind('palette', 'palette', undefined, false); bind('autoN', 'autoN', (v) => v); bind('dither', 'dither', undefined, false); bind('ditherK', 'ditherK', (v) => Math.round(v * 100) + ' %');
bind('outline', 'outline', undefined, false); bind('corners', 'corners'); bind('orphans', 'orphans'); bind('perfect', 'perfect');
bind('zoom', 'zoom', (v) => v + '×', true, draw); bind('fps', 'fps', (v) => v + ' fps', true, () => {});
bind('sub', 'sub', undefined, false, () => { subjectUI(); run(); }); bind('option', 'option', undefined, false); bind('seed', 'seed'); bind('frames', 'frames'); bind('anim', 'anim', undefined, false);
bind('yaw', 'yaw', (v) => v + '°'); bind('pitch', 'pitch', (v) => v + '°'); bind('zoom3d', 'zoom3d', (v) => v.toFixed(2) + '×'); bind('lightAz', 'lightAz', (v) => v + '°'); bind('lightEl', 'lightEl', (v) => v + '°');
bind('steps', 'steps', (v) => v); bind('contrast', 'contrast', (v) => v.toFixed(2)); bind('hueShift', 'hueShift', (v) => v.toFixed(2)); bind('ambient', 'ambient', (v) => Math.round(v * 100) + ' %'); bind('ss', 'ss', (v) => v + '×'); bind('inner', 'inner', (v) => (v ? v.toFixed(3) : 'off'));
bind('gen', 'gen', undefined, false, () => { S.gFrames = GENERATORS[S.gen].frames; $('gFrames').value = S.gFrames; genUI(); run(); }); bind('gSeed', 'gSeed'); bind('gFrames', 'gFrames');
for (const id of ['w', 'h']) $(id).addEventListener('change', () => { S[id] = Math.max(4, Math.min(256, +$(id).value | 0)); syncRes(); save(); if (S.mode === 'draw') { pushUndo(); doc.frames = doc.frames.map((f) => fit(f, S.w, S.h)); frames = doc.frames; afterFrames(); } else run(); });
$('sizes').replaceChildren(...[16, 24, 32, 48, 64, 96, 128].map((n) => el('button', { type: 'button', textContent: n, onclick: () => { S.w = S.h = n; syncRes(); save(); $('w').dispatchEvent(new Event('change')); } })));
$('views').replaceChildren(...[['Front', 0, 0], ['¾', 35, 20], ['Side', 90, 0], ['Isometric', 45, 30], ['Top-down ¾', 0, 55], ['Top', 0, 89]].map(([t, y, p]) => el('button', { type: 'button', textContent: t, onclick: () => { S.yaw = y; S.pitch = p; $('yaw').value = y; $('pitch').value = p; $('yawV').textContent = y + '°'; $('pitchV').textContent = p + '°'; save(); run(); } })));
$('newSeed').onclick = () => { S.seed = 1 + Math.floor(Math.random() * 9999); $('seed').value = S.seed; save(); run(); };
$('gNew').onclick = () => { S.gSeed = 1 + Math.floor(Math.random() * 9999); $('gSeed').value = S.gSeed; save(); run(); };
$('toDraw').onclick = () => { doc.frames = frames.map((f) => f.clone()); for (const c of colorsOf(frames).map(toHex)) if (!doc.palette.includes(c)) doc.palette.push(c); swatches(); setMode('draw'); };
$('png').onclick = () => exportPNG('frame'); $('sheet').onclick = () => exportPNG('sheet'); $('gif').onclick = exportGIF;
$('play').onclick = () => { playing = !playing; $('play').textContent = playing ? 'Pause' : 'Play'; };
$('prev').onclick = () => { shown = (shown + frames.length - 1) % frames.length; afterFrames(); };
$('next').onclick = () => { shown = (shown + 1) % frames.length; afterFrames(); };
// draw tools
$('tools').replaceChildren(...TOOLS.map(([t, label]) => el('button', { type: 'button', textContent: label, onclick: () => { tool = t; [...$('tools').children].forEach((b, i) => b.classList.toggle('on', TOOLS[i][0] === t)); } })));
$('tools').children[0].classList.add('on');
$('color').value = doc.color; $('color').oninput = () => { doc.color = $('color').value; if (!doc.palette.includes(doc.color)) doc.palette.push(doc.color); swatches(); };
$('fAdd').onclick = () => { pushUndo(); doc.frames.splice(shown + 1, 0, new PixelImage(S.w, S.h)); frames = doc.frames; shown++; afterEdit(); };
$('fDup').onclick = () => { pushUndo(); doc.frames.splice(shown + 1, 0, frames[shown].clone()); frames = doc.frames; shown++; afterEdit(); };
$('fDel').onclick = () => { if (doc.frames.length < 2) return; pushUndo(); doc.frames.splice(shown, 1); frames = doc.frames; shown = Math.max(0, shown - 1); afterEdit(); };
$('clear').onclick = () => { pushUndo(); frames[shown] = new PixelImage(S.w, S.h); doc.frames = frames; afterEdit(); };
$('undo').onclick = () => { if (!undo.length) return; redo.push(doc.frames.map((f) => f.clone())); doc.frames = undo.pop(); frames = doc.frames; shown = Math.min(shown, frames.length - 1); afterEdit(); };
$('redo').onclick = () => { if (!redo.length) return; undo.push(doc.frames.map((f) => f.clone())); doc.frames = redo.pop(); frames = doc.frames; afterEdit(); };
$('onion').onchange = draw;
$('loadSample').onclick = () => { pushUndo(); fromText(SPRITES[$('sample').value]); };
$('textOut').onclick = () => { $('text').value = JSON.stringify(toText(), null, 1); };
$('textIn').onclick = () => { try { pushUndo(); fromText(JSON.parse($('text').value)); $('textMsg').textContent = 'Loaded.'; } catch (e) { $('textMsg').textContent = 'Not valid sprite text: ' + e.message; } };
addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input,select,textarea')) return;
  if (S.mode === 'draw') {
    const map = { KeyB: 'pencil', KeyE: 'eraser', KeyG: 'fill', KeyL: 'line', KeyR: 'rect', KeyI: 'picker' };
    if (map[e.code]) { tool = map[e.code]; [...$('tools').children].forEach((b, i) => b.classList.toggle('on', TOOLS[i][0] === tool)); }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); (e.shiftKey ? $('redo') : $('undo')).click(); }
  }
  if (e.code === 'Space') { e.preventDefault(); $('play').click(); }
});

// start
try { const t = JSON.parse(localStorage.getItem(KEY + '.doc') || 'null'); if (t) { const fr = t.frames.map((rows) => { const f = new PixelImage(t.w, t.h); rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && t.palette[ch]) f.set(x, y, [...hex(t.palette[ch]), 255]); })); return f; }); doc.frames = fr; } } catch { /* nothing saved */ }
syncRes(); subjectUI(); genUI(); swatches(); $('gFrames').value = S.gFrames;
setMode(S.mode);
requestAnimationFrame(loop);
window.__pixel = { S, get frames() { return frames; }, get shown() { return shown % frames.length; }, setMode, run, doc, fromText, encodeGIF, examine, toText };
