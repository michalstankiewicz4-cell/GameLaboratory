// UI gry · HUD nad sceną (z Battle, js/ui/hud.js — tam stały HUD jednej gry: pasek życia, telegraf, ster, broń,
// celownik, kanał zestrzeleń, baner, minimapa). Tu te same rodzaje elementów, ale z danych: definicja UI mówi, jakie
// elementy, gdzie (kotwica) i z którego pola stanu gry biorą wartość (bind). Silnik bez wiedzy o grze.
//
// element: { id, type, at, label?, bind?, max?, unit?, color?, low?, digits?, steps? }
//   type: 'bar' (pasek: bind / max, kolor ostrzeżenia poniżej low), 'value' (liczba z jednostką), 'text' (tekst albo
//         bind), 'steps' (telegraf: steps — etykiety, bind — indeks), 'dial' (wskaźnik −1…1, np. ster), 'log' (dziennik
//         zdarzeń), 'banner' (duży napis na chwilę), 'crosshair' (celownik na środku), 'minimap' (punkty ze stanu:
//         bind → [{ x, y, kind }], zasięg max)
//   at: 'tl' 't' 'tr' 'l' 'c' 'r' 'bl' 'b' 'br' — kotwica na ekranie; elementy z tą samą kotwicą stoją jeden pod drugim
//   bind: ścieżka w stanie gry ('ship.hp'); max: liczba albo ścieżka; color: 'ok' | 'accent' | 'warn' | 'err'
import { h, pick } from './dom.js';
import { createLog } from './log.js';

export const HUD_TYPES = ['bar', 'value', 'text', 'steps', 'dial', 'log', 'banner', 'crosshair', 'minimap'];
export const ANCHORS = ['tl', 't', 'tr', 'l', 'c', 'r', 'bl', 'b', 'br'];

// dołącza dzieci bez pustych (brak podpisu, jednostki)
const add = (el, ...kids) => el.append(...kids.filter((k) => k != null));

export function createHud(root) {
  const zones = Object.fromEntries(ANCHORS.map((a) => [a, h('div', { class: 'gZone ' + a })]));
  const el = h('div', { class: 'gHud' }, Object.values(zones));
  root.append(el);
  let items = [], logs = [], banners = [];

  function make(d) {
    const box = h('div', { class: 'gItem ' + d.type + (d.color ? ' c-' + d.color : ''), 'data-id': d.id || '' });
    const label = d.label ? h('span', { class: 'gLabel' }, d.label) : null;
    const it = { d, box, update: () => {} };
    if (d.type === 'bar') {
      const fill = h('i'), txt = h('span', { class: 'gBarT' });
      add(box, label, h('div', { class: 'gBar' }, fill, txt));
      it.update = (s) => {
        const v = +pick(s, d.bind) || 0, m = +(pick(s, d.max ?? 100)) || 1, f = Math.max(0, Math.min(1, v / m));
        fill.style.width = (f * 100).toFixed(1) + '%'; fill.classList.toggle('low', d.low != null && f <= d.low);
        txt.textContent = `${Math.round(v)} / ${Math.round(m)}`;
      };
    } else if (d.type === 'value') {
      const v = h('b', { class: 'gVal' }), u = d.unit ? h('span', { class: 'gUnit' }, d.unit) : null;
      add(box, label, v, u);
      it.update = (s) => { const x = pick(s, d.bind); v.textContent = typeof x === 'number' ? x.toFixed(d.digits ?? 0) : (x ?? '—'); };
    } else if (d.type === 'text') {
      const v = h('span', { class: 'gText' }, d.text || '');
      add(box, label, v);
      if (d.bind) it.update = (s) => { v.textContent = pick(s, d.bind) ?? ''; };
    } else if (d.type === 'steps') {   // telegraf maszynowy (Battle): kratki z etykietami, zapalona ta ze stanu
      const cells = (d.steps || []).map((t) => h('i', {}, t));
      add(box, label, h('div', { class: 'gSteps' }, cells));
      it.update = (s) => { const k = Math.round(+pick(s, d.bind) || 0); cells.forEach((c, i) => c.classList.toggle('on', i === k)); };
    } else if (d.type === 'dial') {    // wskaźnik −1…1 (ster w Battle): znacznik na listwie ze środkiem
      const mk = h('i');
      add(box, label, h('div', { class: 'gDial' }, mk));
      it.update = (s) => { const x = Math.max(-1, Math.min(1, +pick(s, d.bind) || 0)); mk.style.left = (50 + x * 50).toFixed(1) + '%'; };
    } else if (d.type === 'log') {
      const lg = createLog({ max: d.max || 40, fade: d.fade || 0 });
      add(box, label, lg.el); logs.push(lg); it.log = lg;
    } else if (d.type === 'banner') {
      const b = h('b'), sub = h('span'); add(box, b, sub); box.hidden = true; banners.push({ box, b, sub, t: 0 });
    } else if (d.type === 'crosshair') {
      add(box, h('b'), label);
    } else if (d.type === 'minimap') {   // punkty ze stanu (x, y w metrach od gracza), zasięg max [m]
      const cv = h('canvas', { width: 180, height: 180 });
      add(box, label, cv);
      it.update = (s) => {
        const c = cv.getContext('2d'), R = +pick(s, d.max ?? 1000) || 1000, pts = pick(s, d.bind) || [], W = cv.width;
        c.clearRect(0, 0, W, W); const st = getComputedStyle(box);
        c.strokeStyle = st.getPropertyValue('--g-line') || '#555'; c.lineWidth = 1;
        c.beginPath(); c.arc(W / 2, W / 2, W / 2 - 1, 0, 7); c.moveTo(W / 2, 0); c.lineTo(W / 2, W); c.moveTo(0, W / 2); c.lineTo(W, W / 2); c.stroke();
        for (const p of pts) {
          const x = W / 2 + (p.x / R) * (W / 2), y = W / 2 + (p.y / R) * (W / 2); if (Math.hypot(x - W / 2, y - W / 2) > W / 2) continue;
          c.fillStyle = st.getPropertyValue(p.kind === 'enemy' ? '--g-err' : p.kind === 'ally' ? '--g-ok' : p.kind === 'me' ? '--g-accent' : '--g-text') || '#fff';
          c.beginPath(); c.arc(x, y, p.kind === 'me' ? 4 : 3, 0, 7); c.fill();
        }
      };
    }
    return it;
  }
  return {
    el,
    // build(lista elementów) — od nowa (definicja UI się zmieniła)
    build(list = []) {
      Object.values(zones).forEach((z) => z.replaceChildren()); logs = []; banners = [];
      items = list.filter((d) => HUD_TYPES.includes(d.type)).map(make);
      for (const it of items) (zones[it.d.at] || zones.tl).append(it.box);
    },
    update(state) { for (const it of items) it.update(state); },
    log(msg, kind, id) { (id ? items.filter((i) => i.d.id === id && i.log).map((i) => i.log) : logs).forEach((l) => l.add(msg, kind)); },
    // banner(tekst, podpis, czas) — jak w Battle: duży napis na środku na chwilę
    banner(text, sub = '', time = 2.6) { for (const b of banners) { b.b.textContent = text; b.sub.textContent = sub; b.box.hidden = false; b.t = time; } },
    tick(dt) { for (const b of banners) if (b.t > 0 && (b.t -= dt) <= 0) b.box.hidden = true; },
    set visible(v) { el.hidden = !v; },
    get visible() { return !el.hidden; },
  };
}
