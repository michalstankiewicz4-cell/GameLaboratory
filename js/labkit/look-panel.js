// Panel obrazu w grafice Battle dla laboratoriów Space: zamiast PostKit potok kamery z laboratoriów wodnych
// (js/render/sea/look.js — LookPipeline). To samo API co LabKit.imageEffects ({ markCustom, render }), więc
// laboratorium nie musi się zmieniać; LabKit.imageEffects wybiera to, gdy strona jest w trybie grafiki Battle
// (zawsze — js/core/three-global.js ma tylko grafikę Battle).
import { LookPipeline, LOOK_PRESETS, LOOK_DEFAULTS } from '../render/sea/look.js';

const SLIDERS = [['exposure', 'Exposure', 0.3, 2.5, 0.05], ['contrast', 'Contrast', 0.7, 1.5, 0.01], ['saturation', 'Saturation', 0, 1.6, 0.01],
  ['temperature', 'Temperature', -0.5, 0.5, 0.01], ['bloom', 'Glow', 0, 2, 0.05], ['vignette', 'Vignette', 0, 1, 0.01], ['grain', 'Grain', 0, 1, 0.01],
  ['ca', 'Chromatic aberration', 0, 1, 0.01], ['glare', 'Sun glare', 0, 1.5, 0.01], ['sharpen', 'Sharpen', 0, 1, 0.01]];
const TONES = [['0', 'ACES'], ['1', 'AgX'], ['2', 'Hable']];
const pick = (o) => { const r = { ...o }; delete r.label; return r; };

export function battleImageEffects({ renderer, scene, camera, panel, sunDir, preset = 'clean' }) {
  const THREE = window.THREE;
  const look = new LookPipeline(renderer);
  const S = { preset, look: { ...LOOK_DEFAULTS, ...pick(LOOK_PRESETS[preset] || LOOK_PRESETS.clean) } };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const paint = (r) => (window.LabKit ? window.LabKit.paintSlider(r) : null);

  const box = el('div');
  box.append(el('div', 'secHd', 'CAMERA LOOK'), el('div', 'pkNote', 'The camera from the water labs: exposure, tone mapping, colour, glow, lens.'));
  const row = el('div', 'pkRow');
  const presetBtns = {};
  for (const [k, p] of Object.entries(LOOK_PRESETS)) {
    const b = el('button', 'tBtn', p.label.toUpperCase()); b.addEventListener('click', () => { S.preset = k; S.look = { ...LOOK_DEFAULTS, ...pick(p) }; fill(); apply(); });
    presetBtns[k] = b; row.append(b);
  }
  box.append(row);
  const toneLbl = el('label', 'sl'); toneLbl.append(el('span', null, 'Tone mapping'));
  const tone = el('select'); for (const [v, t] of TONES) tone.append(Object.assign(el('option', null, t), { value: v }));
  tone.addEventListener('change', () => { S.look.tone = +tone.value; custom(); apply(); });
  toneLbl.append(tone); box.append(toneLbl);
  const ranges = {};
  for (const [k, label, mn, mx, st] of SLIDERS) {
    const l = el('label', 'sl'), b = el('b'); l.append(el('span', null, label), b);
    const r = Object.assign(el('input'), { type: 'range', min: mn, max: mx, step: st });
    r.addEventListener('input', () => { S.look[k] = +r.value; b.textContent = (+r.value).toFixed(2); paint(r); custom(); apply(); });
    ranges[k] = [r, b]; box.append(l, r);
  }
  panel.append(box);

  function custom() { S.preset = 'custom'; mark(); }
  function mark() { for (const [k, b] of Object.entries(presetBtns)) b.classList.toggle('on', k === S.preset); }
  function fill() { tone.value = String(S.look.tone); for (const [k, [r, b]] of Object.entries(ranges)) { r.value = S.look[k]; b.textContent = (+S.look[k]).toFixed(2); paint(r); } mark(); }
  function apply() { look.set(S.look); }
  fill(); apply();

  const size = new THREE.Vector2(), sun = new THREE.Vector3();
  renderer.info.autoReset = false;
  return {
    pipeline: look, state: S,
    markCustom() { custom(); },
    render() {
      renderer.getSize(size);
      if (look.w !== size.x || look.h !== size.y) look.resize(size.x, size.y);
      if (sunDir) look.sun(camera, sun.copy(typeof sunDir === 'function' ? sunDir() : sunDir).normalize());
      renderer.info.reset();
      look.render(scene, camera);
    },
  };
}

// potok bez panelu (ustawienie „Game clean”) — dla laboratoriów, które renderują prosto na ekran (LabKit.render)
export function cleanPipeline(renderer) {
  const THREE = window.THREE, look = new LookPipeline(renderer), size = new THREE.Vector2();
  look.set({ ...LOOK_DEFAULTS, ...pick(LOOK_PRESETS.clean) });
  return { pipeline: look, render(scene, camera) { renderer.getSize(size); if (look.w !== size.x || look.h !== size.y) look.resize(size.x, size.y); look.render(scene, camera); } };
}

window.LabLook = { battleImageEffects, cleanPipeline };
