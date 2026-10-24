// Zombie Generator page (pixel/zombies.html): original zombies from a seed, every trait adjustable, animated in 12
// frames from any of eight directions, exported as sprite sheets for Unity (512×512 frames in a 6×2 grid, pivot at
// the feet, 100 pixels per unit) with a JSON description and an editor script that slices them — realistic, or as
// pixel art through the Pixel Studio pipeline (palette, majority downsampling, selective outline, clean-up).
import { OUTFITS, ANIMS, DIRS, randomZombie, renderZombieAsync } from './zombie.js';
import { PixelImage, autoPalette, quantize, outline, removeOrphans, modeDownsample, toCanvas, sheet } from './core.js';
import { encodeGIF } from './gif.js';
import { zip } from './zip.js';
import { VERSION } from '../version.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const KEY = 'steelSalvo.zombieGen.v1';
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const S = { style: 'real', frame: 512, frames: 12, cols: 6, anim: 'shamble', dir: 0, pitch: 6, lightAz: -35, lightEl: 40, foot: 9, ppu: 100, px: 96, colours: 24, outline: 'selout', zoom: 1, fps: 10, ...(saved && saved.S) };
let Z = (saved && saved.Z) || randomZombie(17);
const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ S, Z })); } catch { /* private mode */ } };

/* ---------------- making frames ---------------- */
// realistic: rendered at the frame size, 2× supersampled, hard alpha. Pixel art: rendered at the pixel size × 4,
// reduced to a palette, majority-downsampled, outlined, cleaned, then scaled up (nearest) to the frame size.
// onFrame(done, total) reports progress; cancelled() → true abandons the render (returns null)
async function make(dir = S.dir, anim = S.anim, onFrame = null, cancelled = null) {
  const base = { zombie: Z, anim, frames: S.frames, dir, pitch: S.pitch, light: [S.lightAz, S.lightEl], span: 2.03 * (anim === 'crawl' ? 1.15 : 1) };
  if (S.style === 'real') { const r = await renderZombieAsync({ ...base, size: S.frame, ss: 2, foot: S.foot }, onFrame, cancelled); return r && r.frames.map((f) => new PixelImage(f.w, f.h, f.data)); }
  const ss = 4, px = S.px, r = await renderZombieAsync({ ...base, size: px * ss, raw: true, foot: S.foot * px / S.frame * ss }, onFrame, cancelled);
  if (!r) return null;
  const raw = r.frames.map((f) => new PixelImage(f.w, f.h, f.data));
  const pal = autoPalette(raw, S.colours);
  return raw.map((f) => {
    let g = modeDownsample(quantize(f, pal), ss);
    g = outline(g, { mode: S.outline }); if (S.outline === 'selout') g = quantize(g, pal.concat(autoPalette([g], 4)));
    g = removeOrphans(g);
    return upscale(g, S.frame);
  });
}
function upscale(g, size) {                               // nearest, centred horizontally, feet kept on the pivot line
  const k = Math.max(1, Math.floor(size / g.w)), out = new PixelImage(size, size), ox = Math.floor((size - g.w * k) / 2), oy = size - g.h * k;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const sx = Math.floor((x - ox) / k), sy = Math.floor((y - oy) / k); if (sx < 0 || sy < 0 || sx >= g.w || sy >= g.h) continue;
    const i = (sy * g.w + sx) * 4, o = (y * size + x) * 4; for (let c = 0; c < 4; c++) out.data[o + c] = g.data[i + c];
  }
  return out;
}

/* ---------------- preview ---------------- */
let frames = [], shown = 0, busy = 0, job = 0, exporting = false;
// the loader over the preview: a spinner, what is being made, and a bar filling frame by frame
function loader(on, text = '', done = 0, total = 1) {
  $('loader').hidden = !on; if (!on) return;
  $('loaderTxt').textContent = text; $('loaderBar').style.width = Math.round(done / total * 100) + '%';
}
function run() {
  clearTimeout(busy); if (exporting) return;
  const my = ++job; loader(true, 'Preparing…', 0, 1);
  busy = setTimeout(async () => {
    const t0 = performance.now();
    try {
      const fr = await make(S.dir, S.anim, (d, n, what) => { if (what === 'compile') { loader(true, 'Preparing the renderer (first time only, can take a while)…', 0, 1); return; } const f = Math.min(n, Math.floor(d) + 1); loader(true, `Rendering frame ${f} of ${n}`, d, n); $('status').textContent = `rendering ${f} / ${n}…`; }, () => my !== job);
      if (!fr || my !== job) return;
      frames = fr; $('status').textContent = `${frames.length} frames · ${S.frame}×${S.frame} · ${S.style === 'real' ? 'realistic' : 'pixel art ' + S.px + ' px'} · ${((performance.now() - t0) / 1000).toFixed(1)} s`;
    } catch (e) { $('status').textContent = 'error: ' + e.message; console.error(e); loader(true, 'Error: ' + e.message, 0, 1); return; }
    loader(false); shown = 0; draw(); drawSheet();
  }, 60);
}
function draw() {
  const f = frames[shown % frames.length]; if (!f) return;
  toCanvas(f, 1, $('stage')); $('stage').classList.toggle('px', S.style !== 'real');
  $('frameNo').textContent = `${(shown % frames.length) + 1} / ${frames.length}`;
}
function drawSheet() { if (!frames.length) return; const sh = sheet(frames, S.cols); toCanvas(sh, 1, $('sheetView')); }
let playing = true, acc = 0, last = performance.now();
(function loop(now) { const dt = now - last; last = now; if (playing && frames.length > 1) { acc += dt; if (acc > 1000 / S.fps) { acc = 0; shown = (shown + 1) % frames.length; draw(); } } requestAnimationFrame(loop); })(last);

/* ---------------- export ---------------- */
const tag = (dir, anim) => `${dir}deg_Zombie_${Z.seed}_${anim}`;
function meta(name, n, dir, anim) {
  const cols = S.cols, rows = Math.ceil(n / cols), W = cols * S.frame, H = rows * S.frame;
  return { texture: name + '.png', width: W, height: H, frameWidth: S.frame, frameHeight: S.frame, columns: cols, rows, frames: n, fps: S.fps,
    pixelsPerUnit: S.ppu, pivot: { x: 0.5, y: +(S.foot / S.frame).toFixed(6) }, filter: S.style === 'real' ? 'Bilinear' : 'Point', direction: dir, animation: anim,
    // Unity's sprite rects start at the bottom-left; frame 0 is the top-left cell, reading left to right
    sprites: Array.from({ length: n }, (_, k) => ({ name: `${name}_${String(k).padStart(2, '0')}`, x: (k % cols) * S.frame, y: H - (Math.floor(k / cols) + 1) * S.frame, w: S.frame, h: S.frame })),
    zombie: Z };
}
const pngBytes = (img) => new Promise((res) => toCanvas(img, 1).toBlob(async (b) => res(new Uint8Array(await b.arrayBuffer())), 'image/png'));
function download(data, name, type) { const a = el('a', { href: URL.createObjectURL(new Blob([data], { type })), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
async function exportSheet() { const name = tag(S.dir, S.anim); download(await pngBytes(sheet(frames, S.cols)), name + '.png', 'image/png'); }
function exportJSON() { const name = tag(S.dir, S.anim); download(JSON.stringify(meta(name, frames.length, S.dir, S.anim), null, 1), name + '.json', 'application/json'); }
function exportGIF() { download(encodeGIF(frames.map((f) => (S.style === 'real' ? half(f) : f)), { delay: 1000 / S.fps }), tag(S.dir, S.anim) + '.gif', 'image/gif'); }
function half(f) { const g = new PixelImage(f.w / 2, f.h / 2); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const i = ((y * 2) * f.w + x * 2) * 4, o = (y * g.w + x) * 4; for (let c = 0; c < 4; c++) g.data[o + c] = f.data[i + c]; } return g; }
async function exportAll() {
  const btn = $('all'); btn.disabled = true; const files = []; exporting = true; job++;
  const anims = $('allAnims').checked ? Object.keys(ANIMS) : [S.anim];
  let k = 0;
  for (const anim of anims) for (const dir of DIRS) {
    const sheetNo = ++k, sheets = anims.length * DIRS.length;
    const fr = await make(dir, anim, (d, n) => { loader(true, `ZIP: sheet ${sheetNo} of ${sheets} (${ANIMS[anim].replace(/ \(.*/, '')}, ${dir}°) · frame ${Math.min(n, Math.floor(d) + 1)} of ${n}`, (sheetNo - 1) * n + d, sheets * n); $('status').textContent = `ZIP ${sheetNo} / ${sheets}…`; }), name = tag(dir, anim);
    files.push({ name: `Zombie_${Z.seed}/${name}.png`, data: await pngBytes(sheet(fr, S.cols)) });
    files.push({ name: `Zombie_${Z.seed}/${name}.json`, data: JSON.stringify(meta(name, fr.length, dir, anim), null, 1) });
  }
  files.push({ name: `Zombie_${Z.seed}/Editor/ZombieSheetSlicer.cs`, data: SLICER }, { name: `Zombie_${Z.seed}/README.txt`, data: README() });
  download(zip(files), `Zombie_${Z.seed}.zip`, 'application/zip');
  loader(false); exporting = false;
  $('status').textContent = `${files.length} files in Zombie_${Z.seed}.zip`; btn.disabled = false; run();
}
const README = () => `Zombie ${Z.seed} — sprite sheets from the Zombie Generator (Pixel Studio).
Each sheet: ${S.frames} frames of ${S.frame}x${S.frame} px in a ${S.cols}-column grid, frame 0 top-left, transparent
background with a hard edge. Pivot: centre, ${S.foot} px above the bottom (the feet). ${S.ppu} pixels per unit.
Names: <direction>deg_Zombie_<seed>_<animation>.png — direction 0 = facing the camera, then clockwise seen from above.
Unity: put the PNG and JSON files anywhere under Assets/ and ZombieSheetSlicer.cs under an Editor folder, select the
PNG files and run Tools > Slice Zombie Sheets: each sheet becomes Multiple sprites with the rects, pivot, pixels per
unit and filter from its JSON.
`;
const SLICER = `// Slices sprite sheets made by the Zombie Generator, using the JSON file next to each PNG.
// Select the PNG files in the Project window, then Tools > Slice Zombie Sheets.
using System.IO;
using UnityEditor;
using UnityEngine;

public static class ZombieSheetSlicer
{
    [System.Serializable] class Rect4 { public string name; public float x, y, w, h; }
    [System.Serializable] class Pivot { public float x, y; }
    [System.Serializable] class Meta { public int pixelsPerUnit; public Pivot pivot; public string filter; public Rect4[] sprites; }

    [MenuItem("Tools/Slice Zombie Sheets")]
    static void Slice()
    {
        foreach (var obj in Selection.objects)
        {
            var path = AssetDatabase.GetAssetPath(obj);
            var json = Path.ChangeExtension(path, ".json");
            if (!File.Exists(json)) { Debug.LogWarning("No JSON next to " + path); continue; }
            var m = JsonUtility.FromJson<Meta>(File.ReadAllText(json));
            var imp = (TextureImporter)AssetImporter.GetAtPath(path);
            imp.textureType = TextureImporterType.Sprite;
            imp.spriteImportMode = SpriteImportMode.Multiple;
            imp.spritePixelsPerUnit = m.pixelsPerUnit;
            imp.alphaIsTransparency = true;
            imp.mipmapEnabled = false;
            imp.filterMode = m.filter == "Point" ? FilterMode.Point : FilterMode.Bilinear;
            var list = new SpriteMetaData[m.sprites.Length];
            for (int i = 0; i < m.sprites.Length; i++)
            {
                var s = m.sprites[i];
                list[i] = new SpriteMetaData { name = s.name, rect = new Rect(s.x, s.y, s.w, s.h), alignment = (int)SpriteAlignment.Custom, pivot = new Vector2(m.pivot.x, m.pivot.y) };
            }
#pragma warning disable 0618
            imp.spritesheet = list;   // obsolete in the newest Unity versions but still applied
#pragma warning restore 0618
            imp.SaveAndReimport();
            Debug.Log("Sliced " + path + " into " + list.Length + " sprites");
        }
    }
}
`;

/* ---------------- UI ---------------- */
const FIELDS = [
  // [key, label, type, options]
  ['outfit', 'Outfit', 'select', Object.entries(OUTFITS).map(([k, o]) => [k, o.label])],
  ['height', 'Height', 'range', [1.5, 2.0, 0.01, (v) => v.toFixed(2) + ' m']],
  ['build', 'Build', 'range', [0, 1, 0.01, (v) => (v < 0.3 ? 'thin' : v < 0.7 ? 'average' : 'heavy')]],
  ['hunch', 'Hunch', 'range', [0, 0.8, 0.01, (v) => Math.round(v * 100) + ' %']],
  ['tilt', 'Head tilt', 'range', [-0.5, 0.5, 0.01, (v) => Math.round(v * 57) + '°']],
  ['limp', 'Limp', 'range', [0, 1, 0.01, (v) => Math.round(v * 100) + ' %']],
  ['jaw', 'Jaw open', 'range', [0, 1, 0.01, (v) => Math.round(v * 100) + ' %']],
  ['skin', 'Skin', 'color'], ['decay', 'Decay', 'range', [0, 1, 0.01, (v) => Math.round(v * 100) + ' %']],
  ['eyes', 'Eyes', 'select', [['milky', 'Milky'], ['yellow', 'Yellow'], ['red', 'Glowing red']]],
  ['hair', 'Hair', 'select', [['none', 'Bald'], ['short', 'Short'], ['sparse', 'Patchy'], ['long', 'Long']]], ['hairCol', 'Hair colour', 'color'],
  ['cloth', 'Top / suit', 'color'], ['pants', 'Trousers', 'color'],
  ['tears', 'Torn clothes', 'range', [0, 1, 0.01, (v) => Math.round(v * 100) + ' %']],
  ['blood', 'Blood', 'range', [0, 1, 0.01, (v) => Math.round(v * 100) + ' %']], ['dirt', 'Dirt', 'range', [0, 1, 0.01, (v) => Math.round(v * 100) + ' %']],
  ['armLost', 'Arm', 'select', [['none', 'Both arms'], ['right', 'Right forearm lost']]],
];
function zombieUI() {
  $('traits').replaceChildren(...FIELDS.map(([k, label, type, opt]) => {
    let i, o = el('output');
    if (type === 'select') { i = el('select'); for (const [v, t] of opt) i.append(el('option', { value: v, textContent: t })); i.value = Z[k]; i.onchange = () => { Z[k] = i.value; save(); run(); }; }
    else if (type === 'color') { i = el('input', { type: 'color', value: Z[k] }); i.oninput = () => { Z[k] = i.value; save(); run(); }; }
    else { const [mn, mx, st, f] = opt; i = el('input', { type: 'range', min: mn, max: mx, step: st, value: Z[k] }); o.textContent = f(+Z[k]); i.oninput = () => { Z[k] = +i.value; o.textContent = f(Z[k]); save(); run(); }; }
    return el('div', { className: 'row' }, el('span', { textContent: label }), i, o);
  }));
  $('seed').value = Z.seed;
}
function bind(id, key, fmt, num = true, after = run) {
  const i = $(id), o = $(id + 'V'); i.value = S[key]; if (o && fmt) o.textContent = fmt(S[key]);
  i.addEventListener(i.tagName === 'SELECT' || i.type === 'number' ? 'change' : 'input', () => { S[key] = num ? +i.value : i.value; if (o && fmt) o.textContent = fmt(S[key]); save(); styleUI(); after(); });
}
function styleUI() { $('pxRows').hidden = S.style === 'real'; }
for (const [k, t] of Object.entries(ANIMS)) $('anim').append(el('option', { value: k, textContent: t }));
for (const d of DIRS) $('dir').append(el('option', { value: d, textContent: d + '°' + (d === 0 ? ' (facing you)' : d === 90 ? ' (right side)' : d === 180 ? ' (back)' : d === 270 ? ' (left side)' : '') }));
bind('style', 'style', null, false); bind('anim', 'anim', null, false); bind('dir', 'dir', null);
bind('frames', 'frames', null); bind('frame', 'frame', null); bind('cols', 'cols', null, true, drawSheet);
bind('pitch', 'pitch', (v) => v + '°'); bind('lightAz', 'lightAz', (v) => v + '°'); bind('lightEl', 'lightEl', (v) => v + '°');
bind('foot', 'foot', (v) => v + ' px'); bind('ppu', 'ppu', null, true, () => {});
bind('px', 'px', (v) => v + ' px'); bind('colours', 'colours', (v) => v); bind('outline', 'outline', null, false);
bind('fps', 'fps', (v) => v + ' fps', true, () => {});
$('seed').onchange = () => { Z = randomZombie(Math.max(1, +$('seed').value | 0)); zombieUI(); save(); run(); };
$('another').onclick = () => { Z = randomZombie(1 + Math.floor(Math.random() * 99999)); zombieUI(); save(); run(); };
$('play').onclick = () => { playing = !playing; $('play').textContent = playing ? 'Pause' : 'Play'; };
$('prev').onclick = () => { shown = (shown + frames.length - 1) % frames.length; draw(); };
$('next').onclick = () => { shown = (shown + 1) % frames.length; draw(); };
$('png').onclick = exportSheet; $('json').onclick = exportJSON; $('gifB').onclick = exportGIF; $('all').onclick = exportAll;
$('cs').onclick = () => download(SLICER, 'ZombieSheetSlicer.cs', 'text/plain');
$('ver').textContent = 'v' + VERSION; document.title = document.title.replace(/^Zombie Generator/, `Zombie Generator v${VERSION}`);
$('stage').width = $('stage').height = S.frame;   // the frame's size from the start, so the loader covers it
zombieUI(); styleUI(); run();
window.__zombies = { S, get Z() { return Z; }, set Z(v) { Z = v; zombieUI(); run(); }, get frames() { return frames; }, make, meta, run, zip, SLICER };
