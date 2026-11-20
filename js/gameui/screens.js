// UI gry · ekrany menu (z Battle, js/ui/menu.js — tam stałe ekrany jednej gry: menu główne z wyborem okrętu, pauza,
// wyniki, opcje). Tu ekrany z danych: stos ekranów z cofaniem jak w Battle, pozycje i ustawienia z definicji UI.
//
// ekran: { title, text?, layout?: 'side' | 'center', items: [pozycja] }
// pozycja: przycisk { label, do, sub? } albo ustawienie { type: 'slider' | 'toggle' | 'choice', label, bind, min?, max?,
//   step?, options? } (wartość w stanie gry, bind np. 'settings.gfx.scale'; opcja wyboru: napis albo { value, label })
//   albo { type: 'presets', label, bind, presets? } (zestawy wartości naraz, np. grafika: wysoka / lekka — domyślnie
//   GFX_PRESETS z js/gameui/settings.js) albo { type: 'keys', bind } (klawisze czynności: klik i wciśnięcie klawisza,
//   Esc — bez zmiany; czynności — KEY_ACTIONS z js/gameui/settings.js)
// do: 'screen:<id>' (następny ekran), 'back', 'resume' (zamyka menu — gra), 'window:<id>' (okno gry), 'event:<nazwa>'
//     (zdarzenie dla gry), 'quit' (zdarzenie quit), 'reset:<część>' (ustawienia domyślne: gfx, mouse, keys)
import { h, btn, pick } from './dom.js';
import { GFX_PRESETS, KEY_ACTIONS, keyName } from './settings.js';

const pl = () => (document.documentElement.lang || '').startsWith('pl');

export function createScreens(root, { onAction, getState, setState }) {
  const el = h('div', { class: 'gMenu', hidden: true });
  root.append(el);
  let defs = {}, current = null;
  const history = [];

  function setPath(path, v) {
    const s = getState(), keys = path.split('.'), last = keys.pop();
    const o = keys.reduce((a, k) => (a[k] = a[k] && typeof a[k] === 'object' ? a[k] : {}), s);
    o[last] = v; setState(s);
  }
  function row(it) {
    const val = pick(getState(), it.bind);
    if (it.type === 'slider') {
      const out = h('span', { class: 'val' }), inp = h('input', { type: 'range', min: it.min ?? 0, max: it.max ?? 1, step: it.step ?? 0.01 });
      inp.value = val ?? it.min ?? 0; out.textContent = inp.value;
      inp.addEventListener('input', () => { out.textContent = inp.value; setPath(it.bind, +inp.value); });
      return h('label', { class: 'orow' }, h('span', {}, it.label), inp, out);
    }
    if (it.type === 'toggle') {
      const inp = h('input', { type: 'checkbox' }); inp.checked = !!val;
      inp.addEventListener('change', () => setPath(it.bind, inp.checked));
      return h('label', { class: 'orow chk' }, inp, h('span', {}, it.label));
    }
    if (it.type === 'choice') {
      const box = h('div', { class: 'choices' });
      const opt = (o) => (o && typeof o === 'object' ? o : { value: o, label: String(o) });
      const draw = () => box.replaceChildren(...(it.options || []).map(opt).map((o) => btn(o.label ?? String(o.value), () => { setPath(it.bind, o.value); draw(); }, pick(getState(), it.bind) === o.value ? 'on' : '')));
      draw();
      return h('div', { class: 'orow col' }, h('span', {}, it.label), box);
    }
    if (it.type === 'presets') {   // zestaw wartości naraz; każde ustawienie można potem zmienić osobno
      const sets = it.presets || GFX_PRESETS;
      const box = h('div', { class: 'choices' }, Object.entries(sets).map(([id, v]) => btn(v.label || id[0].toUpperCase() + id.slice(1), () => {
        for (const [k, x] of Object.entries(v)) if (k !== 'label') setPath(it.bind + '.' + k, x);
        if (current) draw(current);
      })));
      return h('div', { class: 'orow col' }, h('span', {}, it.label || 'Preset'), box);
    }
    if (it.type === 'keys') {      // klawisze czynności: klik — czeka na klawisz (Esc — bez zmiany)
      const acts = it.actions ? KEY_ACTIONS.filter((a) => it.actions.includes(a.id)) : KEY_ACTIONS;
      const map = pick(getState(), it.bind) || {}, used = {};
      Object.values(map).forEach((c) => { used[c] = (used[c] || 0) + 1; });
      return h('div', { class: 'gKeys' }, acts.map((a) => {
        const b = btn(keyName(map[a.id]), () => listen(b, it.bind + '.' + a.id), 'gKey' + (used[map[a.id]] > 1 ? ' dup' : ''));
        return h('div', { class: 'gKeyRow' }, h('span', {}, (pl() && a.labelPl) || a.label), b);
      }));
    }
    return btn(it.label, () => act(it.do), it.sub ? 'sub' : '');
  }
  // przypisanie klawisza: następne wciśnięcie (w fazie przechwytywania — gra i menu go nie dostają)
  let waiting = null;
  function listen(b, path) {
    if (waiting) waiting();
    b.textContent = pl() ? 'Wciśnij klawisz…' : 'Press a key…'; b.classList.add('wait');
    const onKey = (e) => {
      e.preventDefault(); e.stopImmediatePropagation();
      stop(); if (e.code !== 'Escape') setPath(path, e.code);
      if (current) draw(current);
    };
    const stop = () => { removeEventListener('keydown', onKey, true); waiting = null; };
    waiting = () => { stop(); if (current) draw(current); };
    addEventListener('keydown', onKey, true);
  }
  function draw(id) {
    const d = defs[id]; if (!d) return false;
    el.dataset.screen = id; el.dataset.layout = d.layout || (history.length ? 'center' : 'side');
    const items = (d.items || []).map(row);
    el.replaceChildren(h('section', { class: 'screen' },
      d.title ? h(history.length ? 'h2' : 'h1', { class: history.length ? '' : 'logo' }, d.title) : null,
      d.text ? h('p', {}, d.text) : null,
      h('div', { class: 'stack' }, items)));
    return true;
  }
  function act(a = '') {
    const [k, arg] = String(a).split(/:(.*)/s);
    if (k === 'screen') show(arg);
    else if (k === 'back') back();
    else if (k === 'resume') hide();
    else onAction(k, arg);
  }
  function show(id, push = true) {
    if (!defs[id]) return false;
    if (push && current && current !== id) history.push(current);
    current = id; el.hidden = false; draw(id); onAction('screen', id);
    return true;
  }
  function back() { if (history.length) { current = history.pop(); draw(current); onAction('screen', current); } else hide(); }
  function hide() { if (waiting) waiting(); el.hidden = true; current = null; history.length = 0; onAction('resume'); }
  return {
    el, show, back, hide,
    build(screens = {}) { defs = screens; if (current && !defs[current]) hide(); else if (current) draw(current); },
    get current() { return current; },
    get open() { return !el.hidden; },
    refresh() { if (current) draw(current); },
  };
}
