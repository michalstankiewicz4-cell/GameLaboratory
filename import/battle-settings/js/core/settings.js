// Settings store: everything passes through sanitize() (clamped numbers, whitelisted strings).
import { read, write, KEYS } from './storage.js';
import { clamp } from './util.js';

export const DEFAULTS = {
  lang: 'en',
  gfx: { pixelH: 270, levels: 7, dither: 0.8, edge: 0.8, bright: 1.2, showFps: false },
  vol: 0.6,
  mouse: { zoomSens: 1, rotSens: 1 },
};
const num = (v, d, lo, hi) => (Number.isFinite(+v) ? clamp(+v, lo, hi) : d);

function sanitize(s) {
  const d = DEFAULTS, g = (s && s.gfx) || {}, m = (s && s.mouse) || {};
  return {
    lang: s && (s.lang === 'pl' || s.lang === 'en') ? s.lang : d.lang,
    gfx: {
      pixelH: Math.round(num(g.pixelH, d.gfx.pixelH, 140, 540)),
      levels: Math.round(num(g.levels, d.gfx.levels, 3, 16)),
      dither: num(g.dither, d.gfx.dither, 0, 1),
      edge: num(g.edge, d.gfx.edge, 0, 1),
      bright: num(g.bright, d.gfx.bright, 0.6, 2),
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
