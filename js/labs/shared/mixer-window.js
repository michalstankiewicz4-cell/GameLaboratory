// Okno Mikser w laboratoriach dźwięku (muzyka, efekty, mowa): głośności szyn miksera silnika (js/audio/mixer.js)
// z ustawień gracza (js/core/settings.js, settings.audio — te same co w menu Opcje → Dźwięk gry) i mierniki szyn.
// mixerWindow(element) — wypełnia element (zwykle <div> w panelu z data-window="mixer").
import { mixer, BUSES, BUS_LABELS } from '../../audio/mixer.js';
import { createSettings } from '../../core/settings.js';

export function mixerWindow(box) {
  const mx = mixer(), store = createSettings(), pl = window.LabMenu && window.LabMenu.LANG === 'pl';
  mx.bindSettings(store);
  const rows = {}, el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };
  for (const k of ['master', ...BUSES]) {
    const row = el('div', 'row mxRow'), name = el('span', null, BUS_LABELS[k][pl ? 1 : 0]);
    const inp = el('input'); Object.assign(inp, { type: 'range', min: 0, max: 1, step: 0.05, value: store.data.audio[k] });
    const out = el('output', null, Math.round(store.data.audio[k] * 100) + '%');
    const meter = el('div', 'mxMeter'), bar = el('i'); meter.append(bar);
    inp.oninput = () => { store.update((d) => { d.audio[k] = +inp.value; }); out.textContent = Math.round(inp.value * 100) + '%'; };
    row.append(name, inp, out); box.append(row, meter); rows[k] = { inp, out, bar };
  }
  const mute = el('label', 'chk'), cb = el('input'); cb.type = 'checkbox'; cb.checked = store.data.audio.mute;
  cb.onchange = () => store.update((d) => { d.audio.mute = cb.checked; });
  mute.append(cb, document.createTextNode(pl ? ' Wyciszenie' : ' Mute'));
  box.append(mute, el('p', 'note', pl ? 'Te same głośności co w grze (Opcje → Dźwięk).' : 'The same volumes as in the game (Options → Sound).'));
  store.onChange((d) => { for (const k of Object.keys(rows)) { rows[k].inp.value = d.audio[k]; rows[k].out.textContent = Math.round(d.audio[k] * 100) + '%'; } cb.checked = d.audio.mute; });
  // mierniki: poziom szyny (RMS) co klatkę
  const tick = () => { for (const k of Object.keys(rows)) rows[k].bar.style.width = (mx.level(k) * 100).toFixed(1) + '%'; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  return { store, mixer: mx };
}
