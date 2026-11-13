// UI gry · ekrany menu (z Battle, js/ui/menu.js — tam stałe ekrany jednej gry: menu główne z wyborem okrętu, pauza,
// wyniki, opcje). Tu ekrany z danych: stos ekranów z cofaniem jak w Battle, pozycje i ustawienia z definicji UI.
//
// ekran: { title, text?, layout?: 'side' | 'center', items: [pozycja] }
// pozycja: przycisk { label, do, sub? } albo ustawienie { type: 'slider' | 'toggle' | 'choice', label, bind, min?, max?,
//   step?, options? } (wartość w stanie gry, bind np. 'settings.volume')
// do: 'screen:<id>' (następny ekran), 'back', 'resume' (zamyka menu — gra), 'window:<id>' (okno gry), 'event:<nazwa>'
//     (zdarzenie dla gry), 'quit' (zdarzenie quit)
import { h, btn, pick } from './dom.js';

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
      const draw = () => box.replaceChildren(...(it.options || []).map((o) => btn(o, () => { setPath(it.bind, o); draw(); }, pick(getState(), it.bind) === o ? 'on' : '')));
      draw();
      return h('div', { class: 'orow col' }, h('span', {}, it.label), box);
    }
    return btn(it.label, () => act(it.do), it.sub ? 'sub' : '');
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
  function hide() { el.hidden = true; current = null; history.length = 0; onAction('resume'); }
  return {
    el, show, back, hide,
    build(screens = {}) { defs = screens; if (current && !defs[current]) hide(); else if (current) draw(current); },
    get current() { return current; },
    get open() { return !el.hidden; },
    refresh() { if (current) draw(current); },
  };
}
