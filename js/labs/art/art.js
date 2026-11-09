// Art Lab (labs/art.html): ArtKit (js/render/art/artkit.js) with a viewer — zoom up to 32× (wheel around the cursor,
// drag to pan, double click to fit) so brush strokes and the support can be seen — controls bound to the spec,
// an ordered list of conversions, PNG export and the spec as JSON. For an AI: window.ArtApi and a console tab.
import { SUBJECTS, TECHNIQUES, SURFACES, CONVERSIONS, FORMATS, PALETTES, VIEWS, DEFAULTS, normalize, render } from '../../render/art/artkit.js';
// Examine: objects from the art examination engine (js/render/art/exam/, classic scripts, loaded on first use) —
// a painting by a fictional artist or a stamp, coin, banknote, manuscript; original or forgery; views under the lamps

const $ = (id) => document.getElementById(id);
const ctl = (f) => $(f === 'view' ? 'lamp' : f);   // pole specu „view” → lista #lamp (#view to obszar podglądu)
const KEY = 'gameLab.art.v1';
// one main number per conversion: [field, min, max, step, default, label]
const CV_PARAM = {
  posterize: ['levels', 2, 12, 1, 5, 'Levels'], halftone: ['size', 3, 32, 1, 8, 'Dot size'], pixelate: ['size', 2, 64, 1, 8, 'Pixel size'],
  blur: ['radius', 0.5, 16, 0.5, 2, 'Radius'], sharpen: ['amount', 0, 2, 0.05, 0.6, 'Amount'], contrast: ['contrast', 0.3, 2.5, 0.05, 1.2, 'Contrast'],
  edges: ['strength', 0.5, 4, 0.1, 1.5, 'Strength'], quantize: null, gray: null, sepia: null, duotone: null, invert: null,
};
let spec = (() => { try { return normalize(JSON.parse(localStorage.getItem(KEY) || 'null') || DEFAULTS); } catch { return normalize(DEFAULTS); } })();
let image = null, pic = null;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(spec)); } catch { /* private mode */ } };

/* ---------------- controls ---------------- */
const fill = (sel, map) => { for (const [k, v] of Object.entries(map)) sel.append(new Option(v, k)); };
fill($('subject'), SUBJECTS); fill($('lamp'), VIEWS); fill($('technique'), TECHNIQUES); fill($('surface'), SURFACES); fill($('format'), FORMATS); fill($('cvKind'), CONVERSIONS);
fill($('palette'), Object.fromEntries(Object.keys(PALETTES).map((k) => [k, k[0].toUpperCase() + k.slice(1)])));
const FIELDS = ['subject', 'palette', 'seed', 'technique', 'stroke', 'detail', 'size', 'aspect', 'surface', 'relief', 'light', 'view', 'varnish', 'cracks', 'age', 'format', 'text'];
const NUM = new Set(['seed', 'stroke', 'detail', 'size', 'aspect', 'relief', 'light', 'varnish', 'cracks', 'age']);
const fmt = { light: (v) => v + '°', stroke: (v) => (+v).toFixed(2) + '×', detail: (v) => (+v).toFixed(2) + '×' };
function show() {
  for (const f of FIELDS) {
    const e = ctl(f); e.value = String(spec[f]);
    if (e.tagName === 'SELECT' && e.value !== String(spec[f])) { e.append(new Option(String(spec[f]), String(spec[f]))); e.value = String(spec[f]); }
    const o = $(f + 'V'); if (o) o.textContent = (fmt[f] || ((v) => (+v).toFixed(2)))(spec[f]);
  }
  $('imgRow').hidden = $('imgNote').hidden = spec.subject !== 'image';
  showConversions();
}
for (const f of FIELDS) {
  const e = ctl(f), ev = e.type === 'range' ? 'input' : 'change';
  e.addEventListener(ev, () => {
    spec[f] = NUM.has(f) ? +e.value : e.value; const o = $(f + 'V'); if (o) o.textContent = (fmt[f] || ((v) => (+v).toFixed(2)))(spec[f]);
    if (f === 'subject') show();
    paintSoon(e.type === 'range' ? 350 : 0);
  });
}
$('newSeed').onclick = () => { spec.seed = 1 + Math.floor(Math.random() * 99998); show(); paintSoon(0); };
$('redraw').onclick = () => (mode === 'exam' ? exMake() : paintSoon(0));

// conversions: an ordered list, each with ↑ (earlier) and ✕, and its main number
function showConversions() {
  const box = $('cvList'); box.replaceChildren();
  spec.convert.forEach((cv, i) => {
    const item = document.createElement('div'); item.className = 'cvItem';
    const head = document.createElement('div'); head.className = 'cvHead';
    const name = document.createElement('span'); name.textContent = `${i + 1}. ${CONVERSIONS[cv.kind]}`;
    const up = document.createElement('button'); up.type = 'button'; up.textContent = '↑'; up.title = 'Earlier'; up.disabled = i === 0;
    up.onclick = () => { [spec.convert[i - 1], spec.convert[i]] = [spec.convert[i], spec.convert[i - 1]]; showConversions(); paintSoon(0); };
    const del = document.createElement('button'); del.type = 'button'; del.textContent = '✕'; del.title = 'Remove';
    del.onclick = () => { spec.convert.splice(i, 1); showConversions(); paintSoon(0); };
    head.append(name, up, del); item.append(head);
    const P = CV_PARAM[cv.kind];
    if (P) {
      const [field, min, max, step, def, label] = P, row = document.createElement('div'); row.className = 'row';
      const l = document.createElement('span'), inp = document.createElement('input'), out = document.createElement('output');
      l.textContent = label; Object.assign(inp, { type: 'range', min, max, step, value: cv[field] ?? def }); out.textContent = inp.value;
      inp.oninput = () => { cv[field] = +inp.value; out.textContent = inp.value; paintSoon(350); };
      row.append(l, inp, out); item.append(row);
    }
    if (cv.kind === 'quantize') {
      const row = document.createElement('div'); row.className = 'row';
      const l = document.createElement('span'), sel = document.createElement('select'); l.textContent = 'Dither';
      for (const [k, v] of [['floyd', 'Error diffusion'], ['bayer', 'Ordered 4×4'], ['none', 'None']]) sel.append(new Option(v, k));
      sel.value = cv.dither || 'floyd'; sel.onchange = () => { cv.dither = sel.value; paintSoon(0); };
      row.append(l, sel, document.createElement('output')); item.append(row);
    }
    box.append(item);
  });
}
$('cvAdd').onclick = () => { const kind = $('cvKind').value, P = CV_PARAM[kind], cv = { kind }; if (P) cv[P[0]] = P[4]; if (kind === 'quantize') cv.paletteName = spec.palette; spec.convert.push(cv); showConversions(); paintSoon(0); };
$('cvClear').onclick = () => { spec.convert = []; showConversions(); paintSoon(0); };

// own image: a file or a paste
async function takeImage(blob) { try { image = await createImageBitmap(blob); spec.subject = 'image'; show(); paintSoon(0); } catch (e) { $('status').textContent = 'That image cannot be read: ' + e.message; } }
$('file').onchange = () => { const f = $('file').files[0]; if (f) takeImage(f); };
addEventListener('paste', (e) => { if (e.target.closest && e.target.closest('textarea, input')) return; const it = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/')); if (it) { e.preventDefault(); takeImage(it.getAsFile()); } });

/* ---------------- painting ---------------- */
let timer = 0, painting = null;
function paintSoon(ms) { clearTimeout(timer); timer = setTimeout(paint, ms); }
async function paint() {
  if (painting) { await painting; }
  painting = (async () => {
    let s; try { s = normalize(spec); } catch (e) { $('status').textContent = e.message; return; }
    if (s.subject === 'image' && !image) { $('status').textContent = 'Choose or paste an image first'; return; }
    $('status').textContent = 'painting…';
    const t0 = performance.now(), work = async () => render(s, { image });
    const out = window.LabLoad && s.size >= 2048 ? await window.LabLoad.run('Painting the picture…', work) : await work();
    pic = out.canvas; spec = out.spec; save();
    $('specText').value = JSON.stringify(spec, null, 1);
    if (mode !== 'paint') return;
    showCanvas(pic, `${pic.width} × ${pic.height} px · painted in ${((performance.now() - t0) / 1000).toFixed(2)} s`);
  })();
  try { await painting; } catch (e) { $('status').textContent = 'Error: ' + e.message; if (window.LabLog) window.LabLog.add('error', e.stack || e.message); } finally { painting = null; }
}

function showCanvas(src, status) {
  const c = $('pic'), same = c.width === src.width && c.height === src.height;
  c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); $('status').textContent = status;
  if (!fitted || !same) { fit(); fitted = true; } else place();
}

/* ---------------- viewer: zoom and pan ---------------- */
const view = $('view'), cv = $('pic'), MAXZ = 32;
let zoom = 1, ox = 0, oy = 0, fitted = false;
function place() {
  cv.style.transform = `translate(${ox}px, ${oy}px) scale(${zoom})`;
  cv.classList.toggle('px', $('sharp').checked && zoom >= 3);
  $('zoomV').textContent = `zoom ${zoom >= 10 ? zoom.toFixed(0) : zoom.toFixed(2)}×`;
}
function zoomAt(z, px, py) { z = Math.max(0.05, Math.min(MAXZ, z)); ox = px - (px - ox) * z / zoom; oy = py - (py - oy) * z / zoom; zoom = z; place(); }
function fit() {
  const r = view.getBoundingClientRect(); if (!cv.width) return;
  zoom = Math.min((r.width - 24) / cv.width, (r.height - 24) / cv.height); ox = (r.width - cv.width * zoom) / 2; oy = (r.height - cv.height * zoom) / 2; place();
}
view.addEventListener('wheel', (e) => { e.preventDefault(); const r = view.getBoundingClientRect(); zoomAt(zoom * Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
let drag = null;
let down = null;
view.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; down = [e.clientX, e.clientY]; drag = [e.clientX - ox, e.clientY - oy]; view.setPointerCapture(e.pointerId); view.classList.add('grab'); });
view.addEventListener('pointermove', (e) => { if (!drag) return; ox = e.clientX - drag[0]; oy = e.clientY - drag[1]; place(); });
view.addEventListener('pointerup', (e) => {
  drag = null; view.classList.remove('grab');
  if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 4) { const r = view.getBoundingClientRect(); clickAt((e.clientX - r.left - ox) / zoom, (e.clientY - r.top - oy) / zoom); }
  down = null;
});
view.addEventListener('dblclick', fit);
$('zooms').addEventListener('click', (e) => {
  const z = e.target.dataset && e.target.dataset.zoom; if (!z) return;
  if (z === 'fit') { fit(); return; }
  const r = view.getBoundingClientRect(); zoomAt(+z, r.width / 2, r.height / 2);
});
$('sharp').onchange = place;
addEventListener('resize', () => { if (fitted) place(); });

/* ---------------- export and spec ---------------- */
$('png').onclick = () => {
  const c = $('pic'); if (!c.width) return;
  const name = mode === 'exam' ? `exam-${ex.kind}-${ex.profile || 'original'}-${ex.seed}-${ex.view}.png` : `art-${spec.subject}-${spec.technique}-${spec.seed}.png`;
  c.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, 'image/png');
};
$('specCopy').onclick = async () => { $('specText').value = JSON.stringify(spec, null, 1); try { await navigator.clipboard.writeText($('specText').value); $('specMsg').textContent = 'Copied.'; } catch { $('specMsg').textContent = 'Copy it from the box.'; } };
$('specApply').onclick = () => { try { spec = normalize(JSON.parse($('specText').value)); show(); paintSoon(0); $('specMsg').textContent = 'Applied.'; } catch (e) { $('specMsg').textContent = 'Not a valid spec: ' + e.message; } };
$('specReset').onclick = () => { spec = normalize(DEFAULTS); show(); paintSoon(0); };

/* ---------------- for an AI ---------------- */
// ArtApi.render(spec) → PNG as a data URL (and shows it); ArtApi.spec() — the current spec; ArtApi.lists — what can be chosen
window.ArtApi = {
  lists: { subjects: Object.keys(SUBJECTS), techniques: Object.keys(TECHNIQUES), surfaces: Object.keys(SURFACES), conversions: Object.keys(CONVERSIONS), formats: Object.keys(FORMATS), palettes: Object.keys(PALETTES) },
  defaults: { ...DEFAULTS },
  spec: () => JSON.parse(JSON.stringify(spec)),
  async render(s = {}) { setMode('paint'); spec = normalize({ ...DEFAULTS, ...s }); show(); await paint(); return pic ? pic.toDataURL('image/png') : null; },
  // exam({ kind, seed, artist, profile, tells, views }) → { object, views: { view: PNG data URL } } — all views unless listed
  async exam(s = {}) {
    await loadExam(); await setMode('exam'); ex = { ...EX0, ...s, view: (s.views && s.views[0]) || 'normal' }; delete ex.views;
    const o = exMake(), out = {};
    for (const v of s.views || o.views) out[v] = window.ArtExam.view(v).toDataURL('image/png');
    exShow(); return { object: o, views: out };
  },
  examInfo: async (kind) => { await loadExam(); return kind ? window.ArtExam.info(kind) : window.ArtExam.kinds(); },
};
function apiTab() {
  if (!window.LabConsole) return;
  const el = document.createElement('div'); el.className = 'artApi';
  const ta = document.createElement('textarea'); ta.className = 'mono'; ta.rows = 6; ta.spellcheck = false;
  ta.value = JSON.stringify({ subject: 'stampmotif', technique: 'engraving', surface: 'paper', format: 'stamp', text: '50', seed: 3 });
  const go = document.createElement('button'); go.type = 'button'; go.textContent = 'Paint (ArtApi.render)';
  const msg = document.createElement('p'); msg.className = 'note';
  msg.textContent = 'A spec as JSON; missing fields take the defaults. Lists: ' + Object.entries(window.ArtApi.lists).map(([k, v]) => `${k}: ${v.join(', ')}`).join(' · ');
  go.onclick = async () => { try { await window.ArtApi.render(JSON.parse(ta.value)); } catch (e) { msg.textContent = e.message; } };
  el.append(ta, go, msg);
  window.LabConsole.addTab({ id: 'artapi', title: 'API', titlePl: 'API', el });
}
if (window.LabConsole) apiTab(); else addEventListener('load', apiTab);

/* ---------------- Examine (js/render/art/exam/) ---------------- */
const EX0 = { kind: 'painting', seed: 1, artist: '', profile: '', tells: null, view: 'normal' };
let mode = 'paint', ex = (() => { try { return { ...EX0, ...JSON.parse(localStorage.getItem(KEY + '.exam') || 'null') }; } catch { return { ...EX0 }; } })(), exObj = null, examReady = null;
const exSave = () => { try { localStorage.setItem(KEY + '.exam', JSON.stringify(ex)); localStorage.setItem(KEY + '.mode', mode); } catch { /* private mode */ } };
function loadExam() {
  if (examReady) return examReady;
  const base = new URL('../js/render/art/exam/', location.href).href;
  const one = (f) => new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = base + f; sc.onload = ok; sc.onerror = () => no(new Error('cannot load ' + f)); document.body.append(sc); });
  examReady = (async () => { await one('exam.js'); for (const f of window.ArtExam.SCRIPTS) if (f !== 'exam.js') await one(f); })();
  return examReady;
}
const VIEW_NAMES = { normal: 'Normal', raking: 'Raking light', uv: 'UV', ir: 'Infrared', xray: 'X-ray', crackview: 'Craquelure', back: 'Back', trans: 'Transmitted light', edge: 'Edge', wmbath: 'Watermark bath' };
function exMake() {
  const A = window.ArtExam, info = A.info(ex.kind);
  exObj = A.make({ kind: ex.kind, seed: ex.seed, artist: ex.artist || undefined, profile: ex.profile || undefined, tells: ex.tells || undefined });
  if (!exObj.views.includes(ex.view)) ex.view = 'normal';
  // controls
  $('exArtistRow').hidden = ex.kind !== 'painting'; $('exMicroRow').hidden = ex.kind !== 'painting';
  $('exProfile').replaceChildren(new Option('Original (authentic)', ''), ...Object.entries(info.profiles).map(([k, v]) => new Option('Forgery: ' + v, k))); $('exProfile').value = ex.profile || '';
  const box = $('exTells'); box.replaceChildren();
  if (ex.profile) for (const t of info.tells) {
    const l = document.createElement('label'), c = document.createElement('input'); l.className = 'chk'; c.type = 'checkbox'; c.checked = exObj.tells.includes(t.id);
    c.onchange = () => { ex.tells = [...box.querySelectorAll('input')].map((q, i) => (q.checked ? info.tells[i].id : null)).filter(Boolean); exMake(); };
    l.append(c, ' ' + t.name); box.append(l);
  }
  $('exAbout').textContent = (exObj.title ? `${exObj.artistName}, “${exObj.title}”, ${exObj.year}. ` : '') + (exObj.orig ? 'Authentic — every examination agrees.' : `Forgery: ${exObj.profileName}. Gives itself away in: ${exObj.tells.length} examination(s) ticked above.`);
  $('exViews').replaceChildren(...exObj.views.map((v) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = VIEW_NAMES[v] || v; b.dataset.v = v; b.onclick = () => { ex.view = v; exShow(); }; return b; }));
  exSave(); exShow(); return exObj;
}
function exShow() {
  for (const b of $('exViews').children) b.classList.toggle('on', b.dataset.v === ex.view);
  const c = window.ArtExam.view(ex.view);
  showCanvas(c, `${exObj.title || ex.kind} · ${exObj.orig ? 'original' : 'forgery'} · ${VIEW_NAMES[ex.view] || ex.view} · ${c.width} × ${c.height} px`);
  exSave();
}
async function examInit() {
  await loadExam();
  const A = window.ArtExam;
  if (!$('exKind').options.length) {
    $('exKind').replaceChildren(...A.kinds().map((k) => new Option(k.label, k.id)));
    $('exArtist').replaceChildren(new Option('Random', ''), ...A.info('painting').artists.map((a) => new Option(`${a.name} — ${a.title}`, a.id)));
    $('exKind').onchange = () => { ex.kind = $('exKind').value; ex.profile = ''; ex.tells = null; ex.view = 'normal'; exMake(); };
    $('exArtist').onchange = () => { ex.artist = $('exArtist').value; exMake(); };
    $('exSeed').onchange = () => { ex.seed = Math.max(1, +$('exSeed').value || 1); exMake(); };
    $('exNew').onclick = () => { ex.seed = 1 + Math.floor(Math.random() * 999999); $('exSeed').value = ex.seed; ex.tells = null; exMake(); };
    $('exProfile').onchange = () => { ex.profile = $('exProfile').value; ex.tells = null; exMake(); };
  }
  $('exKind').value = ex.kind; $('exArtist').value = ex.artist || ''; $('exSeed').value = ex.seed;
  exMake();
}
function clickAt(px, py) {
  if (mode !== 'exam' || !$('exMicroOn').checked || ex.kind !== 'painting' || !exObj) return;
  const k = exObj.W / $('pic').width, x = px * k, y = py * k; if (x < 0 || y < 0 || x > exObj.W || y > exObj.H) return;
  const m = window.ArtExam.micro(x, y), c = $('exMicro'); c.width = m.width; c.height = m.height; c.getContext('2d').drawImage(m, 0, 0); c.hidden = false;
}
async function setMode(m) {
  mode = m; for (const b of $('modes').children) b.classList.toggle('on', b.dataset.mode === m);
  try { localStorage.setItem(KEY + '.mode', m); } catch { /* private mode */ }
  if (m === 'exam') { try { await examInit(); } catch (e) { $('status').textContent = 'Examination: ' + e.message; if (window.LabLog) window.LabLog.add('error', e.stack || e.message); } }
  else if (pic) showCanvas(pic, `${pic.width} × ${pic.height} px`); else paintSoon(0);
}
$('modes').addEventListener('click', (e) => { const m = e.target.dataset && e.target.dataset.mode; if (m) setMode(m); });

show();
let startMode = 'paint'; try { startMode = localStorage.getItem(KEY + '.mode') || 'paint'; } catch { /* private mode */ }
if (startMode === 'exam') { paint(); setMode('exam'); } else { setMode('paint'); paint(); }
