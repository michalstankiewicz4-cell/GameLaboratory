// Laboratorium filtrów: potok kamery z Battle (js/render/sea/look.js — LookPipeline) na wybranej scenie. Każdy
// filtr ma suwak, gotowe ustawienia, porównanie z czystym obrazem po lewej i pomiar kosztu każdego efektu.
// Grafika z laboratoriów wodnych (CLAUDE.md: preferowana).
import '../../core/three-window.js';                      // pierwszy: TrainKit czyta window.THREE przy załadowaniu
import * as THREE from '../../../vendor/three/three.module.js';
import { LookPipeline, AutoResolution, LOOK_PRESETS, LOOK_DEFAULTS } from '../../render/sea/look.js';
import { createStage, LIGHTS } from './stage.js';
import { shipScene } from './scenes/ship.js';
import { rigScene } from './scenes/rig.js';
import { trainScene } from './scenes/train.js';

const SCENES = [shipScene('blyskawica'), shipScene('orzel'), rigScene, trainScene];
const SLIDERS = [['exposure', 'Exposure', 0.3, 2.5, 0.05], ['autoTarget', 'Auto exposure target', 0.08, 0.5, 0.01], ['contrast', 'Contrast', 0.7, 1.5, 0.01],
  ['saturation', 'Saturation', 0, 1.6, 0.01], ['vibrance', 'Vibrance', -1, 1, 0.01], ['temperature', 'Temperature', -0.5, 0.5, 0.01], ['tint', 'Tint', -0.3, 0.3, 0.01],
  ['bloom', 'Glow', 0, 2, 0.05], ['vignette', 'Vignette', 0, 1, 0.01], ['grain', 'Grain', 0, 1, 0.01], ['ca', 'Chromatic aberration', 0, 1, 0.01],
  ['distortion', 'Lens distortion', 0, 1, 0.01], ['droplets', 'Water on the lens', 0, 1, 0.01], ['dirt', 'Lens dirt', 0, 1, 0.01], ['glare', 'Sun glare', 0, 1.5, 0.01], ['sharpen', 'Sharpen', 0, 1, 0.01]];
// koszt: każdy efekt wyłączany po kolei
const COSTS = [['Glow + lens dirt', { bloom: 0, dirt: 0 }], ['Grain + vignette', { grain: 0, vignette: 0 }], ['Water on the lens', { droplets: 0 }],
  ['Distortion + aberration', { distortion: 0, ca: 0 }], ['Sun glare', { glare: 0 }], ['Sharpen', { sharpen: 0 }], ['Automatic exposure', { autoExposure: 0 }]];

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const pick = (o) => { const r = { ...o }; delete r.label; return r; };
const KEY = 'gameLab.filters.v1';
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const S = { scene: SCENES[0].id, light: 'afternoon', look: pick(LOOK_PRESETS.cinematic), preset: 'cinematic', fov: 40, perf: { scale: 1, autoRes: false, aa: true, shadows: true }, ...(saved || {}) };
S.look = { ...LOOK_DEFAULTS, ...S.look };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* prywatny tryb */ } };

/* ---------------- renderer, scena ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(S.fov, 1, 0.3, 9000);
const look = new LookPipeline(renderer);
const stage = createStage(renderer, scene);
let current = null, model = null;

function loadScene(id) {
  const sc = SCENES.find((s) => s.id === id) || SCENES[0];
  if (model) { scene.remove(model.root); if (model.dispose) model.dispose(); }
  stage.setSurface(sc.surface);
  model = sc.build(stage); current = sc; S.scene = sc.id;
  scene.add(model.root);
  orbit.target.copy(model.target); orbit.dist = model.size * 0.9;
  camera.near = Math.max(0.1, model.size / 400); camera.updateProjectionMatrix();
  stage.fitShadow(model.target, model.size * 0.6);
  $('scene').value = sc.id; save();
}
function applyLight() { stage.setLight(S.light); look.sunVisible = stage.sunSeen; if (model) stage.fitShadow(model.target, model.size * 0.6); }
function applyLook() { look.set(S.look, 'A'); look.set({ ...LOOK_DEFAULTS, exposure: S.look.exposure }, 'B'); }

/* ---------------- kamera (orbita) ---------------- */
const orbit = { target: new THREE.Vector3(), dist: 100, yaw: 0.9, pitch: 0.18 };
let drag = null;
const cv = renderer.domElement;
cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, b: e.button }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointerup', () => { drag = null; });
cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (drag.b) { const k = orbit.dist * 0.0012, r = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0), u = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1); orbit.target.addScaledVector(r, -dx * k).addScaledVector(u, dy * k); }
  else { orbit.yaw -= dx * 0.005; orbit.pitch = Math.min(1.4, Math.max(-0.05, orbit.pitch + dy * 0.004)); }
});
cv.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist = Math.min(4000, Math.max(2, orbit.dist * Math.exp(e.deltaY * 0.0011))); }, { passive: false });

/* ---------------- panel ---------------- */
for (const s of SCENES) $('scene').append(el('option', { value: s.id, textContent: s.label }));
$('scene').onchange = () => { loadScene($('scene').value); applyLight(); };
for (const [k, p] of Object.entries(LIGHTS)) $('light').append(el('option', { value: k, textContent: p.label }));
$('light').value = S.light; $('light').onchange = () => { S.light = $('light').value; applyLight(); save(); };

const markPreset = () => [...$('presets').children].forEach((b) => b.classList.toggle('on', b.dataset.k === S.preset));
for (const [k, p] of Object.entries(LOOK_PRESETS)) {
  const b = el('button', { type: 'button', textContent: p.label, onclick: () => { S.look = { ...LOOK_DEFAULTS, ...pick(p) }; S.preset = k; fillLook(); markPreset(); applyLook(); save(); } });
  b.dataset.k = k; $('presets').append(b);
}
for (const [k, label, mn, mx, st] of SLIDERS) {
  const r = el('input', { type: 'range', id: 'L_' + k, min: mn, max: mx, step: st }), o = el('output', { id: 'L_' + k + 'V' });
  $('sliders').append(el('div', { className: 'row' }, el('span', { textContent: label }), r, o));
  r.addEventListener('input', () => { S.look[k] = +r.value; o.textContent = (+r.value).toFixed(2); S.preset = 'custom'; markPreset(); applyLook(); save(); });
}
function fillLook() {
  for (const [k] of SLIDERS) { $('L_' + k).value = S.look[k]; $('L_' + k + 'V').textContent = (+S.look[k]).toFixed(2); }
  $('tone').value = String(S.look.tone); $('autoExposure').checked = !!S.look.autoExposure;
}
$('tone').onchange = () => { S.look.tone = +$('tone').value; S.preset = 'custom'; markPreset(); applyLook(); save(); };
$('autoExposure').onchange = () => { S.look.autoExposure = $('autoExposure').checked ? 1 : 0; S.preset = 'custom'; markPreset(); applyLook(); save(); };
const bindRange = (id, obj, key, fmt, after) => {
  const r = $(id), o = $(id + 'V'); r.value = obj[key]; if (o) o.textContent = fmt(+r.value);
  r.addEventListener('input', () => { obj[key] = +r.value; if (o) o.textContent = fmt(+r.value); if (after) after(); save(); });
};
bindRange('splitX', { v: 0.5 }, 'v', (v) => Math.round(v * 100) + '%');
bindRange('fov', S, 'fov', (v) => v + '°', () => { camera.fov = S.fov; camera.updateProjectionMatrix(); });
bindRange('scale', S.perf, 'scale', (v) => Math.round(v * 100) + '%', () => look.setScale(S.perf.scale));
$('autoRes').checked = S.perf.autoRes; $('autoRes').onchange = () => { S.perf.autoRes = $('autoRes').checked; if (!S.perf.autoRes) look.setScale(S.perf.scale); save(); };
$('aa').checked = S.perf.aa; $('aa').onchange = () => { S.perf.aa = $('aa').checked; look.setAA(S.perf.aa); save(); };
$('shadows').checked = S.perf.shadows; $('shadows').onchange = () => { S.perf.shadows = $('shadows').checked; stage.sun.castShadow = S.perf.shadows; save(); };
$('copy').onclick = async () => {
  const txt = JSON.stringify({ look: S.look, preset: S.preset }, null, 1);
  try { await navigator.clipboard.writeText(txt); $('copied').textContent = 'Copied.'; } catch { $('copied').textContent = 'Clipboard blocked.'; }
};

// koszt każdego efektu: czas klatki z efektem i bez niego (średnia z ~40 klatek)
const frameLog = [];
const avgMs = async (n = 40) => { const a = frameLog.length; await new Promise((r) => { const w = () => (frameLog.length - a >= n ? r() : requestAnimationFrame(w)); w(); }); return frameLog.slice(-n).reduce((s, x) => s + x, 0) / n; };
$('measure').onclick = async () => {
  const btn = $('measure'); btn.disabled = true; $('costs').replaceChildren(el('p', { className: 'note', textContent: 'Measuring…' }));
  const base = await avgMs(), rows = [];
  for (const [label, off] of COSTS) {
    look.set(off, 'A'); const ms = await avgMs(); applyLook();
    rows.push(el('div', { className: 'row' }, el('span', { textContent: label }), el('b', { textContent: (base - ms >= 0 ? '+' : '') + (base - ms).toFixed(2) + ' ms' })));
  }
  $('costs').replaceChildren(el('p', { className: 'note', textContent: `All effects: ${base.toFixed(1)} ms a frame. Each row: what that effect adds.` }), ...rows);
  btn.disabled = false;
};

/* ---------------- pętla ---------------- */
const autoRes = new AutoResolution();
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); look.resize(innerWidth, innerHeight); }
addEventListener('resize', resize);
let last = performance.now(), frames = 0, fpsT = last;
function frame(now) {
  const dtMs = now - last, dt = Math.min(0.05, dtMs / 1000); last = now; frameLog.push(dtMs); if (frameLog.length > 2000) frameLog.splice(0, 1000);
  stage.update(dt, camera);
  if (model && model.update) model.update(dt);
  const c = Math.cos(orbit.pitch);
  camera.position.set(orbit.target.x + Math.sin(orbit.yaw) * c * orbit.dist, orbit.target.y + Math.sin(orbit.pitch) * orbit.dist, orbit.target.z + Math.cos(orbit.yaw) * c * orbit.dist);
  const minY = stage.heightAt(camera.position.x, camera.position.z) + 1.2; if (camera.position.y < minY) camera.position.y = minY;
  camera.lookAt(orbit.target);
  if (S.perf.autoRes) { const s = autoRes.update(dtMs); if (s !== look.scale) { look.setScale(s); $('scale').value = s; $('scaleV').textContent = Math.round(s * 100) + '%'; } }
  look.split = $('splitOn').checked ? +$('splitX').value : 0;
  $('split').hidden = !look.split; if (look.split) $('split').style.left = (look.split * 100) + '%';
  look.sun(camera, stage.sunDir);
  renderer.info.autoReset = false; renderer.info.reset();
  look.render(scene, camera);
  frames++;
  if (now - fpsT > 500) {
    $('fps').textContent = `${Math.round(frames * 1000 / (now - fpsT))} fps`; frames = 0; fpsT = now;
    const ms = frameLog.slice(-30), avg = ms.reduce((s, x) => s + x, 0) / Math.max(1, ms.length);
    $('stats').replaceChildren(el('span', { textContent: 'Frame' }), el('b', { textContent: avg.toFixed(1) + ' ms' }), el('span', { textContent: 'Draw calls' }), el('b', { textContent: renderer.info.render.calls }),
      el('span', { textContent: 'Triangles' }), el('b', { textContent: renderer.info.render.triangles.toLocaleString('en') }), el('span', { textContent: 'Render scale' }), el('b', { textContent: Math.round(look.scale * 100) + '%' }));
  }
  requestAnimationFrame(frame);
}
fillLook(); markPreset(); applyLook();
look.setScale(S.perf.scale); look.setAA(S.perf.aa); stage.sun.castShadow = S.perf.shadows; camera.fov = S.fov;
resize(); loadScene(S.scene); applyLight();
window.__filters = { S, stage, look, orbit, camera, scene, loadScene, applyLight, SCENES };
requestAnimationFrame(frame);
