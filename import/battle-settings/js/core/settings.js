// Settings store: everything passes through sanitize() (clamped numbers, whitelisted strings).
import { read, write, KEYS } from './storage.js';
import { clamp } from './util.js';

export const DEFAULTS = {
  lang: 'en',
  // scale: render resolution; fx: particle density; water: ripple detail and broken foam on the sea
  gfx: { scale: 1, shadows: true, aa: true, bloom: true, fx: 1, water: true, pip: true, bright: 1.2, sat: 1, showFps: false },
  vol: 0.6,
  mouse: { zoomSens: 1, rotSens: 1 },
};
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
// Graphics presets for the Options buttons (light = for weaker computers).
export const GFX_PRESETS = {
  high: { scale: 1, shadows: true, aa: true, bloom: true, fx: 1, water: true, pip: true },
  light: { scale: 0.7, shadows: false, aa: false, bloom: false, fx: 0.5, water: false, pip: false },
};
const num = (v, d, lo, hi) => (v !== null && v !== undefined && v !== '' && Number.isFinite(+v) ? clamp(+v, lo, hi) : d);

function sanitize(s) {
  const d = DEFAULTS, g = (s && s.gfx) || {}, m = (s && s.mouse) || {};
  return {
    lang: s && (s.lang === 'pl' || s.lang === 'en') ? s.lang : d.lang,
    gfx: {
      scale: num(g.scale, d.gfx.scale, 0.5, 1),
      shadows: bool(g.shadows, d.gfx.shadows),
      aa: bool(g.aa, d.gfx.aa),
      bloom: bool(g.bloom, d.gfx.bloom),
      fx: num(g.fx, d.gfx.fx, 0.25, 1),
      water: bool(g.water, d.gfx.water),
      pip: bool(g.pip, d.gfx.pip),
      bright: num(g.bright, d.gfx.bright, 0.6, 2),
      sat: num(g.sat, d.gfx.sat, 0, 1.6),
      showFps: !!g.showFps,
    },

    vol: num(s && s.vol, d.vol, 0, 1),
    mouse: { zoomSens: num(m.zoomSens, 1, 0.2, 3), rotSens: num(m.rotSens, 1, 0.2, 3) },
  };
}

export function createSettings() {
  const subs = new Set();
  const st = { data: sanitize(read(KEYS.settings)) };     // English by default; Polish is chosen in Options > Language
  st.update = (fn) => {
    const draft = JSON.parse(JSON.stringify(st.data));
    fn(draft);
    st.data = sanitize(draft);
    write(KEYS.settings, st.data);
    subs.forEach((f) => f(st.data));
  };
  st.reset = () => st.update((d) => Object.assign(d, JSON.parse(JSON.stringify(DEFAULTS)), { lang: d.lang }));
  st.onChange = (fn) => subs.add(fn);
  return st;
}
