// UI gry jako dane: nakładka nad sceną — ekrany menu (js/gameui/screens.js, z Battle), HUD (hud.js, z Battle),
// dziennik zdarzeń (log.js, ze Space), okna gry (wygląd okien ze Space, css/window.css) i okno dialogowe postaci
// i narratora. Silnik, bez Three.js: gra (albo edytor sceny, albo laboratorium UI) daje definicję UI i stan gry,
// UI odbija stan i zgłasza akcje. Wygląd — skórka (skins.js), oddzielona od wyglądu laboratoriów. Opis: docs/labs/gameui.md.
//
// definicja (format 'gamelab-ui'):
// { format: 'gamelab-ui', version: 1, name, skin: 'space' | 'battle' | 'engine' | { base, tokens },
//   start: '<id ekranu>' | '' (od razu gra), pause: '<id ekranu>' (Esc w grze),
//   screens: { id: ekran (screens.js) }, hud: [element (hud.js)],
//   windows: [{ id, title, key?, at?: 'c' | 'l' | 'r', body: [{ type: 'text', text } | { type: 'value', label, bind, unit? }
//             | { type: 'stats', bind } (obiekt → wiersze) | { type: 'list', bind } (lista napisów albo { name, n })
//             | { type: 'tree', tree, points } (drzewko ulepszeń: zasób „tree” albo przykład o tej nazwie, js/gameui/tree/;
//               points — ścieżka punktów w stanie gry: kupno je odejmuje; widok z pola drzewka `view`)] }] }
//
// createGameUI(parent, def, { state, keys }) → ui:
//   ui.set(stan | (stan) => stan)   stan gry (HUD, okna, ustawienia menu)
//   ui.show(ekran), ui.back(), ui.hide()                        menu
//   ui.open(okno), ui.close(okno), ui.toggle(okno)             okna gry
//   ui.say({ who, text, choices?, side? }) → Promise<indeks wyboru | -1>   okno dialogowe (postać, narrator: who '')
//   ui.log(tekst, rodzaj?, idDziennika?), ui.banner(tekst, podpis?, czas?)
//   ui.on((akcja, arg) => …)        akcje: 'event' (arg — nazwa), 'quit', 'screen', 'resume', 'window', 'choice',
//                                   'buy' (arg — { tree, id, level, cost, effects }: kupiony węzeł drzewka)
//   ui.buy(drzewko, węzeł) → { bought, level, cost, effects } — jak kliknięcie w oknie drzewka
//   ui.tree(nazwa) → TreeState drzewka (poziomy, effects(), toJSON(); zapis gry — load({ levels, spent }))
//   ui.load(def), ui.skin(skórka), ui.tick(dt), ui.destroy(), ui.def, ui.state
import { h, btn, pick, place } from './dom.js';
import { normalizeTree, TreeState } from './tree/tree.js';
import { RadialView } from './tree/radial.js';
import { PcbView } from './tree/pcb.js';
import { backgroundWatcher } from './tree/background.js';
import { TREE_SAMPLES } from './tree/samples/index.js';
import { getAsset } from '../scene/assets.js';
import { createHud } from './hud.js';
import { createScreens } from './screens.js';
import { applySkin } from './skins.js';

export const FORMAT = 'gamelab-ui', VERSION = 1;

export function emptyUI(name = 'Game UI') {
  return { format: FORMAT, version: VERSION, name, skin: 'space', start: '', pause: '', screens: {}, hud: [], windows: [] };
}
// sprawdza i uzupełnia definicję z pliku, zasobu albo od AI
export function normalizeUI(d) {
  if (!d || typeof d !== 'object' || d.format !== FORMAT) throw new Error('Not a GameLaboratory UI (format: ' + FORMAT + ').');
  const u = emptyUI(String(d.name || 'Game UI'));
  u.skin = d.skin || 'space'; u.start = String(d.start || ''); u.pause = String(d.pause || '');
  u.screens = d.screens && typeof d.screens === 'object' ? d.screens : {};
  u.hud = Array.isArray(d.hud) ? d.hud.filter((x) => x && typeof x.type === 'string') : [];
  u.windows = Array.isArray(d.windows) ? d.windows.filter((x) => x && x.id) : [];
  return u;
}

export function createGameUI(parent, def0, { state = {}, keys = true } = {}) {
  const root = h('div', { class: 'gui' });
  parent.append(root);
  let def = normalizeUI(def0), S = state;
  const listeners = new Set(), emit = (a, arg) => listeners.forEach((f) => f(a, arg));

  const hud = createHud(root);
  const screens = createScreens(root, {
    onAction: (a, arg) => { if (a === 'window') ui.open(arg); else emit(a, arg); hud.visible = !screens.open; },
    getState: () => S, setState: (s) => { S = s; refresh(); },
  });

  /* ---- okna gry (wygląd okien ze Space: ramka, kwadracik przy nagłówku, linia, przewijana treść) ---- */
  const winLayer = h('div', { class: 'gWins' }); root.append(winLayer);
  const wins = new Map();   // id → { d, el, body, keep }
  /* drzewka: definicja i stan gracza na nazwę (wspólne dla okien z tym samym drzewkiem); widok żyje razem z oknem */
  const trees = new Map();   // nazwa → { def, state }
  function treeOf(name) {
    if (!trees.has(name)) {
      const d = getAsset('tree', name) || TREE_SAMPLES[name];
      let def = null; try { def = d ? normalizeTree(d) : null; } catch { def = null; }
      trees.set(name, def ? { def, state: new TreeState(def) } : null);
    }
    return trees.get(name);
  }
  // kupno węzła: punkty ze ścieżki pierwszego bloku z tym drzewkiem (jego `points`), odjęte w stanie gry
  function buyTree(name, id) {
    const t = treeOf(name), b = def.windows.flatMap((w) => w.body || []).find((x) => x.type === 'tree' && x.tree === name);
    if (!t) return null;
    const path = b && b.points, pts = path ? +pick(S, path) || 0 : Infinity, cost = t.state.costOf(id);
    if (!t.state.buy(id, pts)) return { bought: false, state: t.state.state(id), next: cost };
    if (path) S = place(S, path, pts - cost);
    refresh(); const r = { tree: name, id, level: t.state.level(id), cost, effects: t.state.effects() }; emit('buy', r);
    return { bought: true, ...r };
  }
  function treeBlock(b) {
    const t = treeOf(b.tree);
    if (!t) return h('p', {}, `No tree "${b.tree}".`);
    const pts = () => +pick(S, b.points) || 0, pl = () => (document.documentElement.lang || '').startsWith('pl');
    const name = () => (pl() && t.def.points.labelPl) || t.def.points.label;
    const head = h('div', { class: 'gTreePts' }), box = h('div', { class: 'gTree' });
    const bg = backgroundWatcher(() => t.def.background, () => { if (view instanceof PcbView) view.layout(); });
    const View = t.def.view === 'pcb' ? PcbView : RadialView;
    const view = new View(box, { getTree: () => t.def, getState: () => t.state, getPoints: pts, pl, pointsName: name, getBackground: () => bg.get(),
      onBuy: (id) => buyTree(b.tree, id) });
    const el = h('div', { class: 'gTreeWrap' }, head, box);
    el.update = () => { head.textContent = `${pts().toLocaleString(pl() ? 'pl' : 'en')} ${name()}`; };
    el.dispose = () => view.destroy();
    return el;
  }
  function winBody(w, keep) {
    return (w.body || []).map((b, i) => {
      if (b.type === 'tree') { if (!keep[i]) keep[i] = treeBlock(b); keep[i].update(); return keep[i]; }
      if (b.type === 'text') return h('p', {}, b.text || '');
      if (b.type === 'value') { const x = pick(S, b.bind); return h('div', { class: 'st' }, h('span', {}, b.label || b.bind), h('b', {}, (typeof x === 'number' ? +x.toFixed(2) : x ?? '—') + (b.unit ? ' ' + b.unit : ''))); }
      if (b.type === 'stats') { const o = pick(S, b.bind) || {}; return h('div', { class: 'gStats' }, Object.entries(o).map(([k, v]) => h('div', { class: 'st' }, h('span', {}, k), h('b', {}, String(v))))); }
      if (b.type === 'list') { const a = pick(S, b.bind) || []; return h('ul', { class: 'gList' }, a.map((x) => h('li', {}, typeof x === 'object' ? [h('span', {}, x.name), x.n != null ? h('b', {}, '×' + x.n) : null] : String(x)))); }
      return null;
    });
  }
  function drawWin(id) {
    const w = wins.get(id); if (!w) return;
    const kids = winBody(w.d, w.keep);
    if (kids.length !== w.body.children.length || kids.some((k, i) => k !== w.body.children[i])) w.body.replaceChildren(...kids);   // widok drzewka zostaje na miejscu
  }
  function buildWins() {
    for (const w of wins.values()) { w.el.remove(); w.keep.forEach((k) => k && k.dispose && k.dispose()); } wins.clear(); trees.clear();
    for (const d of def.windows) {
      const body = h('div', { class: 'gWinBody' }), wide = (d.body || []).some((b) => b.type === 'tree');
      const el = h('div', { class: 'gWin at-' + (d.at || 'c') + (wide ? ' wide' : ''), hidden: true, 'data-id': d.id },
        h('div', { class: 'gWinHead' }, h('i', { class: 'gSq' }), h('b', { class: 'gHd' }, d.title || d.id), d.key ? h('kbd', {}, d.key) : null,
          btn('×', () => ui.close(d.id), 'gClose')),
        h('div', { class: 'gLine' }), body);
      winLayer.append(el); wins.set(d.id, { d, el, body, keep: [] });
    }
  }

  /* ---- okno dialogowe: postać albo narrator, tekst pisany po literze, wybory (klik, 1–9), dalej (klik, Enter, spacja) ---- */
  const dlgWho = h('b', { class: 'gWho' }), dlgText = h('p', { class: 'gSay' }), dlgChoices = h('div', { class: 'gChoices' }), dlgMore = h('span', { class: 'gMore' }, '▼');
  const dlg = h('div', { class: 'gDialog', hidden: true }, dlgWho, dlgText, dlgChoices, dlgMore);
  root.append(dlg);
  let dlgDone = null, typing = 0, full = '';
  function finishTyping() { if (typing) { clearInterval(typing); typing = 0; dlgText.textContent = full; } }
  function say({ who = '', text = '', choices = [], side = 'b', speed = 40 } = {}) {
    if (dlgDone) dlgDone(-1);
    dlg.hidden = false; dlg.dataset.side = side; dlg.classList.toggle('narrator', !who);
    dlgWho.textContent = who; full = String(text); dlgText.textContent = ''; dlgChoices.replaceChildren(); dlgMore.hidden = choices.length > 0;
    let i = 0; finishTyping();
    if (speed > 0) typing = setInterval(() => { i += 1; dlgText.textContent = full.slice(0, i); if (i >= full.length) finishTyping(); }, 1000 / speed);
    else dlgText.textContent = full;
    return new Promise((res) => {
      const end = (k) => { dlg.hidden = true; finishTyping(); dlgDone = null; emit('choice', k); res(k); };
      dlgDone = end;
      choices.forEach((c, k) => dlgChoices.append(btn(`${k + 1}. ${c}`, () => end(k))));
      dlg.onclick = (e) => { if (e.target.closest('button')) return; if (typing) finishTyping(); else if (!choices.length) end(-1); };
      dlg._choices = choices.length;
    });
  }

  /* ---- klawisze: Esc (dialog → okno → menu → pauza), klawisze okien, wybory dialogu ---- */
  function onKey(e) {
    if (root.hidden || (e.target.closest && e.target.closest('input, textarea, select'))) return;
    if (dlgDone) {
      const n = parseInt(e.key, 10);
      if (dlg._choices && n >= 1 && n <= dlg._choices) { e.preventDefault(); dlgDone(n - 1); }
      else if (!dlg._choices && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (typing) finishTyping(); else dlgDone(-1); }
      return;
    }
    if (e.key === 'Escape') {
      const open = [...wins.values()].filter((w) => !w.el.hidden);
      if (open.length) { e.preventDefault(); open.forEach((w) => ui.close(w.d.id)); return; }
      if (screens.open) { e.preventDefault(); screens.back(); return; }
      if (def.pause && def.screens[def.pause]) { e.preventDefault(); ui.show(def.pause); }
      return;
    }
    if (screens.open) return;
    const w = def.windows.find((x) => x.key && x.key.toLowerCase() === e.key.toLowerCase());
    if (w) { e.preventDefault(); ui.toggle(w.id); }
  }
  if (keys) addEventListener('keydown', onKey);

  // skala UI z rozmiaru nakładki (jak --uiScale Space: projekt w 1280 × 800, tu przez wielkość czcionki)
  const ro = new ResizeObserver(() => { const r = root.getBoundingClientRect(); root.style.setProperty('--g-scale', Math.max(0.7, Math.min(1.5, Math.min(r.width / 1280, r.height / 800))).toFixed(3)); });
  ro.observe(root);

  function refresh() { hud.update(S); for (const [id, w] of wins) if (!w.el.hidden) drawWin(id); }
  const ui = {
    el: root,
    get def() { return def; }, get state() { return S; },
    load(d) {
      def = normalizeUI(d); applySkin(root, def.skin); hud.build(def.hud); screens.build(def.screens); buildWins(); refresh();
      if (def.start && def.screens[def.start]) screens.show(def.start); else { screens.hide(); }
      hud.visible = !screens.open;
    },
    skin(s) { def.skin = s; applySkin(root, s); },
    set(s) { S = typeof s === 'function' ? s(S) : { ...S, ...s }; refresh(); },
    show: (id) => { const ok = screens.show(id); hud.visible = !screens.open; return ok; },
    back: () => screens.back(), hide: () => screens.hide(),
    open(id) { const w = wins.get(id); if (!w) return false; w.el.hidden = false; drawWin(id); emit('window', id); return true; },
    close(id) { const w = wins.get(id); if (w) w.el.hidden = true; },
    toggle(id) { const w = wins.get(id); if (!w) return false; return w.el.hidden ? ui.open(id) : (ui.close(id), true); },
    tree: (name) => (treeOf(name) || {}).state || null, buy: (name, id) => buyTree(name, id),
    say, log: (m, k, id) => hud.log(m, k, id), banner: (t, s, time) => hud.banner(t, s, time),
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    tick(dt) { hud.tick(dt); },
    get menuOpen() { return screens.open; }, get screen() { return screens.current; },
    destroy() { if (keys) removeEventListener('keydown', onKey); ro.disconnect(); for (const w of wins.values()) w.keep.forEach((k) => k && k.dispose && k.dispose()); root.remove(); listeners.clear(); },
  };
  ui.load(def);
  return ui;
}
