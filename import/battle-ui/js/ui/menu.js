// Menu overlay: main menu with ship selection, pause, results and options screens.
import { h, btn, tx } from './dom.js';
import { t, bind, LANGS } from '../i18n/index.js';
import { CLASSES, CLASS_KEYS, KNOTS } from '../world/constants.js';
import { VERSION } from '../version.js';
import { GFX_PRESETS } from '../core/settings.js';

export function createMenu(root, { actions, settings, progress }) {
  const screens = {};
  const history = [];
  let current = null, pick = progress.cls;
  const screen = (name, ...kids) => { screens[name] = h('section', { class: 'screen', hidden: true }, ...kids); return screens[name]; };
  const back = () => btn('common.back', () => menu.back(), 'sub');

  /* ---- ship cards ---- */
  const cards = h('div', { class: 'cards' });
  const stat = (k, v) => h('div', { class: 'st' }, h('span', {}, t(k)), h('b', {}, v));
  function drawCards() {
    cards.replaceChildren(...CLASS_KEYS.map((k) => {
      const c = CLASSES[k];
      return h('button', { type: 'button', class: 'card' + (k === pick ? ' on' : ''), on: { click: () => { pick = k; progress.cls = k; progress.save(); drawCards(); actions.pick?.(k); } } },
        h('h3', {}, t('cls.' + k)),
        h('p', { class: 'role' }, t('role.' + k)),
        stat('st.hp', c.hp),
        stat('st.speed', `${(c.speed * KNOTS).toFixed(0)} ${t('hud.kn')}`),
        stat('st.guns', `${c.turrets.length}×${c.turrets[0].barrels} · ${c.guns.reload}s`),
        stat('st.range', `${(c.guns.range / 1000).toFixed(1)} km`),
        stat('st.torps', c.torps ? `${c.torps.n} · ${c.torps.reload}s` : '—'));
    }));
  }
  const best = h('p', { class: 'info' });

  screen('main',
    h('h1', { class: 'logo' }, 'STEEL', h('br'), 'SALVO'),
    tx('menu.tagline', 'p'),
    tx('menu.pick', 'h2'),
    cards,
    h('div', { class: 'stack' },
      btn('menu.start', () => actions.start(pick)),
      btn('menu.multi', () => menu.go('multi'), 'sub'),
      btn('menu.options', () => menu.go('options'), 'sub')),
    best,
    h('p', { class: 'labs' }, tx('menu.labs', 'span'), ' ',
      // the labs moved to GameLaboratory (its own repository and site)
      h('a', { href: 'https://michalstankiewicz4-cell.github.io/GameLaboratory/labs/warship.html' }, tx('menu.shipLab', 'span')), ' · ',
      h('a', { href: 'https://michalstankiewicz4-cell.github.io/GameLaboratory/labs/water.html' }, tx('menu.waterLab', 'span')), ' · ',
      h('a', { href: 'https://michalstankiewicz4-cell.github.io/GameLaboratory/' }, tx('menu.allLabs', 'span'))),
    h('p', { class: 'foot' }, 'v' + VERSION, ' · ', tx('menu.credit')));
  screen('multi', tx('multi.title', 'h2'), tx('multi.note', 'p'), h('div', { class: 'stack' }, back()));
  screen('pause', tx('pause.title', 'h2'), tx('pause.keys', 'p'),
    h('div', { class: 'stack' }, btn('pause.resume', actions.resume), btn('menu.options', () => menu.go('options')), btn('pause.quit', actions.quit)));
  const deadInfo = h('div', { class: 'res' });
  const deadTitle = h('h2');
  screen('dead', deadTitle, deadInfo,
    h('div', { class: 'stack' }, btn('dead.again', () => actions.start(pick)), btn('pause.quit', actions.quit)));

  /* ---- options ---- */
  const opt = h('div', { class: 'tabbody' });
  function slider(key, get, set, min, max, step, fmt = (v) => v) {
    const val = h('span', { class: 'val' });
    const inp = h('input', { type: 'range', min, max, step });
    inp.value = get(); val.textContent = fmt(get());
    inp.addEventListener('input', () => { set(+inp.value); val.textContent = fmt(+inp.value); });
    return h('label', { class: 'orow' }, tx(key), inp, val);
  }
  function drawOptions() {
    const d = settings.data;
    const up = (fn) => settings.update(fn);
    const pct = (v) => Math.round(v * 100) + '%';
    const langs = h('div', { class: 'choices' }, LANGS.map((l) => h('button', { type: 'button', class: d.lang === l.id ? 'on' : '', on: { click: () => { up((x) => { x.lang = l.id; }); drawOptions(); } } }, l.name)));
    const check = (key, field) => {
      const c = h('input', { type: 'checkbox' });
      c.checked = d.gfx[field];
      c.addEventListener('change', () => up((x) => { x.gfx[field] = c.checked; }));
      return h('label', { class: 'orow chk' }, c, tx(key));
    };
    // presets set several graphics options at once; each one can still be changed afterwards
    const presets = h('div', { class: 'choices' }, Object.keys(GFX_PRESETS).map((id) => h('button', { type: 'button', on: { click: () => {
      up((x) => { Object.assign(x.gfx, GFX_PRESETS[id]); }); drawOptions();
    } } }, t('preset.' + id))));
    opt.replaceChildren(...[
      tx('opt.lang', 'h3'), langs,
      tx('opt.gfx', 'h3'),
      h('div', { class: 'orow col' }, tx('opt.preset'), presets),
      slider('opt.scale', () => d.gfx.scale, (v) => up((x) => { x.gfx.scale = v; }), 0.5, 1, 0.05, pct),
      slider('opt.fx', () => d.gfx.fx, (v) => up((x) => { x.gfx.fx = v; }), 0.25, 1, 0.05, pct),
      slider('opt.bright', () => d.gfx.bright, (v) => up((x) => { x.gfx.bright = v; }), 0.6, 2, 0.05, (v) => v.toFixed(2)),
      slider('opt.sat', () => d.gfx.sat, (v) => up((x) => { x.gfx.sat = v; }), 0, 1.6, 0.05, pct),
      check('opt.shadows', 'shadows'), check('opt.aa', 'aa'), check('opt.bloom', 'bloom'), check('opt.water', 'water'),
      check('opt.pip', 'pip'), check('opt.fps', 'showFps'),
      tx('opt.play', 'h3'),
      (() => { const c = h('input', { type: 'checkbox' }); c.checked = d.play.god; c.addEventListener('change', () => up((x) => { x.play.god = c.checked; })); return h('label', { class: 'orow chk' }, c, tx('opt.god')); })(),
      tx('opt.audio', 'h3'),
      slider('opt.vol', () => d.vol, (v) => up((x) => { x.vol = v; }), 0, 1, 0.05, pct),
      tx('opt.mouse', 'h3'),
      slider('opt.zoom', () => d.mouse.zoomSens, (v) => up((x) => { x.mouse.zoomSens = v; }), 0.2, 3, 0.1, (v) => v.toFixed(1)),
      slider('opt.rot', () => d.mouse.rotSens, (v) => up((x) => { x.mouse.rotSens = v; }), 0.2, 3, 0.1, (v) => v.toFixed(1)),
      h('div', { class: 'btns' }, btn('opt.reset', () => { settings.reset(); drawOptions(); }))].filter(Boolean));
  }
  screen('options', tx('opt.title', 'h2'), opt, h('div', { class: 'stack' }, back()));

  const overlay = h('div', { id: 'menu', hidden: true }, Object.values(screens));
  root.append(overlay);

  function refresh() {
    drawCards();
    best.textContent = t('menu.best', { wave: progress.bestWave, score: progress.best });
    if (current === 'options') drawOptions();
  }

  const menu = {
    get current() { return current; },
    show(name) { history.length = 0; menu.switchTo(name); },
    switchTo(name) {
      for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
      current = name; overlay.hidden = false; overlay.dataset.screen = name;
      if (name === 'options') drawOptions();
      refresh();
    },
    go(name) { history.push(current); menu.switchTo(name); },
    back() { if (!history.length) return false; menu.switchTo(history.pop()); return true; },
    hide() { overlay.hidden = true; current = null; history.length = 0; },
    setResult(r) {
      bind(deadTitle, r.newBest ? 'dead.titleBest' : 'dead.title');
      deadInfo.replaceChildren(...[
        ['res.wave', r.wave], ['res.kills', r.kills], ['res.dmg', r.dmg], ['res.acc', r.acc + '%'], ['res.time', r.time], ['res.score', r.score],
      ].map(([k, v]) => h('div', { class: 'st' }, h('span', {}, t(k)), h('b', {}, String(v)))));
    },
    refresh,
  };
  return menu;
}
