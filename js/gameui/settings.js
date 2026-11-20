// Ustawienia gry: grafika i sterowanie (z Battle, js/core/settings.js — z historią; tam ustawienia jednej gry). Magazyn
// silnika, wspólny dla gier, ▶ Graj edytora sceny i laboratorium UI gry: menu Opcje UI gry (js/gameui/screens.js — bind
// 'settings.…') pisze tutaj, a gra stosuje grafikę (js/render/game-graphics.js) i klawisze (sterowanie). Wszystko
// przechodzi przez sanitize() (liczby w zakresie, tylko znane słowa); zapis w przeglądarce (localStorage, gdy działa).
//
// settings.gfx:   scale (rozdzielczość obrazu 0,5…1), aa (wygładzanie krawędzi), shadows (cienie), shadowQuality
//                 ('high' | 'low' — mapa cieni 2048 / 1024), lights (oświetlenie dynamiczne: światła punktowe
//                 i reflektory — ogień, lampy, światła pozycyjne), bloom (poświata), bright (jasność 0,6…2), sat
//                 (nasycenie 0…1,6), showFps (licznik klatek w grze)
// settings.mouse: rotSens, zoomSens (czułość obracania i przybliżania kamery 0,2…3)
// settings.keys:  czynność → kod klawisza (KeyboardEvent.code, niezależny od układu klawiatury); czynności: KEY_ACTIONS
// inne pola najwyższego poziomu (liczby, napisy, tak / nie — np. music, sound, minimap) — ustawienia danej gry, zostają
//
// SETTINGS_SCREENS — gotowe ekrany menu „graphics” i „controls” (definicja UI: screens: { graphics: 'standard' })
// createSettings(klucz?) → store { data, update(fn), set(dane), reset(część?), onChange(fn) → odpięcie }
// GFX_PRESETS: high, light (Battle; light — dla słabszych komputerów); keyName(kod) — nazwa klawisza do menu
export const KEY_ACTIONS = [
  { id: 'forward', label: 'Throttle up / forward', labelPl: 'Gaz / naprzód', key: 'KeyW' },
  { id: 'back', label: 'Throttle down / back', labelPl: 'Mniej gazu / wstecz', key: 'KeyS' },
  { id: 'left', label: 'Steer left', labelPl: 'Skręt w lewo', key: 'KeyA' },
  { id: 'right', label: 'Steer right', labelPl: 'Skręt w prawo', key: 'KeyD' },
  { id: 'yawLeft', label: 'Rudder left', labelPl: 'Ster kierunku w lewo', key: 'KeyQ' },
  { id: 'yawRight', label: 'Rudder right', labelPl: 'Ster kierunku w prawo', key: 'KeyE' },
  { id: 'up', label: 'Nose up / boom up', labelPl: 'Nos w górę / wysięgnik w górę', key: 'ArrowUp' },
  { id: 'down', label: 'Nose down / boom down', labelPl: 'Nos w dół / wysięgnik w dół', key: 'ArrowDown' },
  { id: 'rollLeft', label: 'Roll left / slew left', labelPl: 'Przechył w lewo / obrót w lewo', key: 'ArrowLeft' },
  { id: 'rollRight', label: 'Roll right / slew right', labelPl: 'Przechył w prawo / obrót w prawo', key: 'ArrowRight' },
  { id: 'brake', label: 'Brake', labelPl: 'Hamulec', key: 'KeyB' },
  { id: 'lift', label: 'Lift / grapple', labelPl: 'Silniki podnośne / chwytak', key: 'Space' },
  { id: 'gear', label: 'Landing gear', labelPl: 'Podwozie', key: 'KeyG' },
  { id: 'flaps', label: 'Flaps', labelPl: 'Klapy', key: 'KeyF' },
  { id: 'stickIn', label: 'Stick in', labelPl: 'Ramię do siebie', key: 'KeyR' },
  { id: 'stickOut', label: 'Stick out', labelPl: 'Ramię od siebie', key: 'KeyF' },
];
export const DEFAULTS = {
  gfx: { scale: 1, aa: true, shadows: true, shadowQuality: 'high', lights: true, bloom: true, bright: 1, sat: 1, showFps: false },
  mouse: { rotSens: 1, zoomSens: 1 },
  keys: Object.fromEntries(KEY_ACTIONS.map((a) => [a.id, a.key])),
};
// Graphics presets for the Options buttons (light = for weaker computers).
export const GFX_PRESETS = {
  high: { scale: 1, aa: true, shadows: true, shadowQuality: 'high', lights: true, bloom: true },
  light: { scale: 0.7, aa: false, shadows: false, shadowQuality: 'low', lights: false, bloom: false },
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const num = (v, d, lo, hi) => (v !== null && v !== undefined && v !== '' && Number.isFinite(+v) ? clamp(+v, lo, hi) : d);
const code = (v, d) => (typeof v === 'string' && /^[A-Za-z0-9]{1,24}$/.test(v) ? v : d);
const clone = (o) => JSON.parse(JSON.stringify(o));

export function sanitize(s) {
  const d = DEFAULTS, g = (s && s.gfx) || {}, m = (s && s.mouse) || {}, k = (s && s.keys) || {};
  return {
    gfx: {
      scale: num(g.scale, d.gfx.scale, 0.5, 1),
      aa: bool(g.aa, d.gfx.aa),
      shadows: bool(g.shadows, d.gfx.shadows),
      shadowQuality: g.shadowQuality === 'low' || g.shadowQuality === 'high' ? g.shadowQuality : d.gfx.shadowQuality,
      lights: bool(g.lights, d.gfx.lights),
      bloom: bool(g.bloom, d.gfx.bloom),
      bright: num(g.bright, d.gfx.bright, 0.6, 2),
      sat: num(g.sat, d.gfx.sat, 0, 1.6),
      showFps: !!g.showFps,
    },
    mouse: { rotSens: num(m.rotSens, 1, 0.2, 3), zoomSens: num(m.zoomSens, 1, 0.2, 3) },
    keys: Object.fromEntries(KEY_ACTIONS.map((a) => [a.id, code(k[a.id], a.key)])),
    ...extra(s),
  };
}
// ustawienia danej gry (np. głośność, minimapa): proste wartości poza grafiką, myszą i klawiszami
function extra(s) {
  const out = {};
  if (s && typeof s === 'object') for (const [k, v] of Object.entries(s)) {
    if (k in DEFAULTS || !/^[A-Za-z][\w]{0,31}$/.test(k)) continue;
    if (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.length <= 64)) out[k] = v;
  }
  return out;
}

// gotowe ekrany Opcji: grafika i sterowanie (w definicji UI: screens: { graphics: 'standard', controls: 'standard' })
export const SETTINGS_SCREENS = {
  graphics: { title: 'Graphics', items: [
    { type: 'presets', label: 'Preset', bind: 'settings.gfx' },
    { type: 'slider', label: 'Resolution', bind: 'settings.gfx.scale', min: 0.5, max: 1, step: 0.05 },
    { type: 'toggle', label: 'Anti-aliasing', bind: 'settings.gfx.aa' },
    { type: 'toggle', label: 'Shadows', bind: 'settings.gfx.shadows' },
    { type: 'choice', label: 'Shadow quality', bind: 'settings.gfx.shadowQuality', options: [{ value: 'low', label: 'Low' }, { value: 'high', label: 'High' }] },
    { type: 'toggle', label: 'Dynamic lighting (lamps, fire, lights)', bind: 'settings.gfx.lights' },
    { type: 'toggle', label: 'Glow', bind: 'settings.gfx.bloom' },
    { type: 'slider', label: 'Brightness', bind: 'settings.gfx.bright', min: 0.6, max: 2, step: 0.05 },
    { type: 'slider', label: 'Saturation', bind: 'settings.gfx.sat', min: 0, max: 1.6, step: 0.05 },
    { type: 'toggle', label: 'Show frames per second', bind: 'settings.gfx.showFps' },
    { label: 'Default graphics', do: 'reset:gfx', sub: true }, { label: 'Back', do: 'back', sub: true }] },
  controls: { title: 'Controls', items: [
    { type: 'slider', label: 'Mouse: turning', bind: 'settings.mouse.rotSens', min: 0.2, max: 3, step: 0.1 },
    { type: 'slider', label: 'Mouse: zoom', bind: 'settings.mouse.zoomSens', min: 0.2, max: 3, step: 0.1 },
    { type: 'keys', bind: 'settings.keys' },
    { label: 'Default keys', do: 'reset:keys', sub: true }, { label: 'Back', do: 'back', sub: true }] },
};

const read = (key) => { try { const t = localStorage.getItem(key); return t ? JSON.parse(t) : null; } catch { return null; } };
const write = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* bez zapisu (prywatne okno) */ } };

export function createSettings(key = 'gamelab.settings.v1') {
  const subs = new Set();
  const st = { key, data: sanitize(read(key)) };
  const save = () => { write(key, st.data); subs.forEach((f) => f(st.data)); };
  st.update = (fn) => { const draft = clone(st.data); fn(draft); st.data = sanitize(draft); save(); };
  st.set = (data) => { st.data = sanitize(data); save(); };
  // reset(): wszystko; reset('gfx' | 'mouse' | 'keys'): jedna część
  st.reset = (part) => st.update((d) => { if (part && DEFAULTS[part]) d[part] = clone(DEFAULTS[part]); else Object.assign(d, clone(DEFAULTS)); });
  st.onChange = (fn) => { subs.add(fn); return () => subs.delete(fn); };
  return st;
}

// nazwa klawisza do menu: KeyW → W, ArrowUp → ↑, Space → Space
const NAMES = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift',
  ControlLeft: 'Left Ctrl', ControlRight: 'Right Ctrl', AltLeft: 'Left Alt', AltRight: 'Right Alt', Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace' };
export function keyName(c) {
  if (!c) return '—';
  if (NAMES[c]) return NAMES[c];
  if (/^Key[A-Z]$/.test(c)) return c.slice(3);
  if (/^Digit\d$/.test(c)) return c.slice(5);
  if (/^Numpad/.test(c)) return 'Num ' + c.slice(6);
  return c;
}
