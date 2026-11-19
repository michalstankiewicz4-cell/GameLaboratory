// Tech Tree Lab (labs/trees.html): drzewko 'gamelab-tree' (js/gameui/tree/tree.js) w widoku promienistym (radial.js, z Hive
// Hunger) albo „płytka drukowana” (pcb.js, z badań Space) — widok to pole drzewka `view`; tło — obraz z laboratorium sztuki.
// Z edytora drzewka Hive Hunger (tools/tree-editor.html): tryby Wybierz / Dodaj / Połącz, przeciąganie węzła (poziom co 0,1
// i kąt), okno węzła, kolory gałęzi, notatki, eksport i import JSON. Do tego: tryb Próba (punkty, kupowanie, zsumowane
// efekty), sprawdzanie drzewka, liczby drzewka, zapis jako zasób z nazwą „tree” (js/scene/assets.js), TreeApi dla AI.
import { KINDS, VIEWS, emptyTree, normalizeTree, cloneTree, TreeState, checkTree, treeStats, nodeName } from '../../gameui/tree/tree.js';
import { RadialView, ICONS as PIXEL_ICONS } from '../../gameui/tree/radial.js';
import { PcbView, ICONS as PCB_ICONS } from '../../gameui/tree/pcb.js';
import { backgroundWatcher } from '../../gameui/tree/background.js';
import { listAssets, getAsset, saveAsset, removeAsset, onAssetsChange } from '../../scene/assets.js';
import { TREE_SAMPLES as SAMPLES } from '../../gameui/tree/samples/index.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const PL = () => (window.LabMenu || {}).LANG === 'pl';
const STORE = 'gamelab.trees';
const TREE_KEYS = ['format', 'version', 'name', 'view', 'background', 'points', 'branches', 'nodes', 'notes'];

/* ---------------- stan (ta przeglądarka) ---------------- */
let L = { tree: null, source: 'sample:Hive Hunger', mode: 'edit', tool: 'select', addKind: 'trait', budget: 500, levels: {}, nextId: 1 };
try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && s.tree) L = { ...L, ...s }; } catch { /* nic zapisanego */ }
if (Array.isArray(L.owned)) { L.levels = Object.fromEntries(L.owned.map((id) => [id, 1])); delete L.owned; }   // zapis z 1.0.0
L.tree = normalizeTree(L.tree || SAMPLES['Hive Hunger']);
let saveT = 0;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify(L)); } catch { /* pełno */ } }, 200); };
const status = (t) => { $('status').textContent = t; };
const byId = (id) => L.tree.nodes.find((n) => n.id === id);

// stan do widoku: w edycji wszystko „kupione” (kolory gałęzi), „wkrótce” przygaszone; w próbie — prawdziwy stan gracza
let trial = new TreeState(L.tree), preview = new TreeState(L.tree);
function rebuildStates() {
  trial = new TreeState(L.tree); trial.load({ levels: L.levels });
  preview = new TreeState(L.tree); preview.load({ levels: Object.fromEntries(L.tree.nodes.filter((n) => !n.soon).map((n) => [n.id, n.levels])) });
}
const points = () => Math.max(0, L.budget - trial.spent);

let selected = null, linkFrom = null, drag = null, view = null;
const bg = backgroundWatcher(() => L.tree.background, () => { if (view instanceof PcbView) view.layout(); });
const buyNode = (id) => { const ok = trial.buy(id, points()); if (ok) { L.levels = { ...trial.levels }; save(); showTrial(); } return ok; };
// widok według pola drzewka `view`: przy zmianie stary znika, nowy dostaje te same zdarzenia edytora
function makeView() {
  const want = L.tree.view === 'pcb' ? PcbView : RadialView;
  if (view instanceof want) return;
  if (view) view.destroy();
  view = new want($('view'), {
    getTree: () => L.tree, getState: () => (L.mode === 'trial' ? trial : preview), getPoints: () => (L.mode === 'trial' ? points() : Infinity),
    onBuy: (id) => { if (buyNode(id)) status(`Bought: ${nodeName(byId(id), PL())} (level ${trial.level(id)}).`); },
    pl: PL, pointsName: () => (PL() && L.tree.points.labelPl) || L.tree.points.label, editing: () => L.mode === 'edit', getBackground: () => bg.get(),
  });
  attachEdit(view); view.layout(); if (L.tool) setTool(L.tool);
}

/* ---------------- zmiany drzewka ---------------- */
// po każdej zmianie: układ, stany, okna, sprawdzenie
function changed({ form = true } = {}) {
  rebuildStates(); view.layout(); view.selected = L.mode === 'edit' ? (linkFrom || selected) : null;
  if (form) showNode(); showBranches(); showChecks(); showTrial(); save();
}
function setTree(def, source) {
  L.tree = normalizeTree(def); L.source = source; L.levels = {}; selected = null; linkFrom = null;
  L.nextId = 1; makeView(); showTreeForm(); changed();
}

/* ---------------- pasek: drzewko, tryb, narzędzie ---------------- */
function fillTreeSel() {
  const s = $('treeSel'); s.replaceChildren();
  const g1 = el('optgroup', { label: 'Samples' }), g2 = el('optgroup', { label: 'Saved' });
  Object.keys(SAMPLES).forEach((k) => g1.append(el('option', { value: `sample:${k}`, textContent: k })));
  listAssets('tree').forEach((k) => g2.append(el('option', { value: `asset:${k}`, textContent: k })));
  s.append(g1); if (g2.children.length) s.append(g2);
  if (L.source === 'new') s.append(el('option', { value: 'new', textContent: '(new)' }));
  s.value = L.source; if (s.value !== L.source) s.selectedIndex = -1;
}
$('treeSel').onchange = () => {
  const v = $('treeSel').value, [kind, name] = [v.slice(0, v.indexOf(':')), v.slice(v.indexOf(':') + 1)];
  const def = kind === 'sample' ? SAMPLES[name] : getAsset('tree', name);
  if (def) { setTree(cloneTree(def), v); status(`Loaded: ${name}.`); }
};
function setMode(m) {
  L.mode = m; linkFrom = null; drag = null;
  document.querySelectorAll('#modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
  $('tools').hidden = $('addKind').hidden = m !== 'edit';
  setTool(L.tool); changed({ form: false });
}
function setTool(t) {
  L.tool = t; linkFrom = null;
  document.querySelectorAll('#tools button').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
  view.canvas.classList.toggle('adding', L.mode === 'edit' && t === 'add'); view.canvas.classList.toggle('linking', L.mode === 'edit' && t === 'link');
  hint(); view.selected = L.mode === 'edit' ? selected : null; save();
}
function hint() {
  if (L.mode === 'trial') { status(`Click a blinking node to buy it: ${points().toLocaleString('en')} ${L.tree.points.label} left.`); return; }
  status(L.tool === 'add' ? 'Click where the new node should go: its level is the nearest ring (in halves). It grows from the selected node.'
    : L.tool === 'link' ? (linkFrom ? `${byId(linkFrom).name} → now click the child.` : 'Click the lower node (the parent), then the higher one (the child). The same two again: the link goes.')
      : 'Click a node to edit it, drag it to move it (level and angle). Delete removes it.');
}
document.querySelectorAll('#modes button').forEach((b) => { b.onclick = () => setMode(b.dataset.mode); });
document.querySelectorAll('#tools button').forEach((b) => { b.onclick = () => setTool(b.dataset.tool); });
Object.entries(VIEWS).forEach(([k, x]) => $('viewSel').append(el('option', { value: k, textContent: x.label })));
$('viewSel').onchange = () => { L.tree.view = $('viewSel').value; makeView(); changed({ form: false }); status(`View: ${VIEWS[L.tree.view].label} (saved with the tree).`); };
Object.entries(KINDS).filter(([k]) => k !== 'core').forEach(([k, x]) => $('addKind').append(el('option', { value: k, textContent: x.label })));
$('addKind').value = L.addKind; $('addKind').onchange = () => { L.addKind = $('addKind').value; save(); };

/* ---------------- mysz w edycji ---------------- */
// w edycji kliknięcie obsługuje pointerdown poniżej (onPick — nic), w próbie — kupowanie przez widok
function attachEdit(v) {
  const c = v.canvas;
  c.addEventListener('pointerdown', (e) => {
    v.opts.onPick = L.mode === 'edit' ? () => {} : null; if (L.mode !== 'edit') return;
    const id = v.nodeAt(e);
    if (L.tool === 'add') { addNode(v.polar(e)); return; }
    if (L.tool === 'link') { if (id) linkClick(id); return; }
    selected = id; v.selected = id; showNode();
    if (id && byId(id).kind !== 'core') { drag = { id, moved: false }; c.setPointerCapture(e.pointerId); }
  });
  c.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const n = byId(drag.id), q = v.polar(e);
    const depth = Math.max(0.5, Math.min(8, Math.round(q.depth * 10) / 10)), angle = Math.round(q.angle);   // przy przeciąganiu co 0,1 poziomu
    if (n.depth !== depth || n.angle !== angle) {
      n.depth = depth; n.angle = angle; drag.moved = true; v.tip.hidden = true;
      if (v instanceof PcbView) v.layout(); else v.pos[n.id] = v.place(depth, angle);   // płytka rysuje się od nowa, piksele — co klatkę
    }
  });
  c.addEventListener('pointerup', () => { if (drag && drag.moved) changed(); drag = null; });
}

function addNode({ depth, angle }) {
  let id; do id = `new${L.nextId++}`; while (byId(id));
  const parent = selected && byId(selected) ? selected : (L.tree.nodes.find((n) => n.kind === 'core') || {}).id;
  const pb = parent ? byId(parent).branch : 'core';
  L.tree.nodes.push({ id, name: 'New node', namePl: '', kind: L.addKind, branch: pb, parents: parent ? [parent] : [], all: false,
    depth: Math.max(0.5, Math.round(depth * 2) / 2), angle: Math.round(angle), cost: L.addKind === 'hub' ? 0 : 100, levels: 1, growth: 1, effect: {}, text: '', textPl: '', icon: null, soon: false, color: null, note: '' });
  selected = id; setTool('select'); changed(); status(`Added ${id}: fill it in in the Node window.`);
}
function linkClick(id) {
  if (!linkFrom) { linkFrom = id; view.selected = id; hint(); return; }
  if (id === linkFrom) { status("A node can't grow from itself."); return; }
  const child = byId(id), k = child.parents.indexOf(linkFrom);
  if (k >= 0) child.parents.splice(k, 1); else child.parents.push(linkFrom);
  status(k >= 0 ? `Link removed: ${byId(linkFrom).name} → ${child.name}.` : `Linked: ${byId(linkFrom).name} → ${child.name}.`);
  linkFrom = null; selected = id; changed();
}
let delArm = null;
function deleteNode(id) {
  const n = byId(id); if (!n || n.kind === 'core') { status("The core can't be deleted."); return; }
  if (delArm !== id) { delArm = id; status(`Delete ${n.name}? Once more to delete.`); setTimeout(() => { if (delArm === id) delArm = null; }, 3000); return; }
  delArm = null; L.tree.nodes = L.tree.nodes.filter((x) => x.id !== id);
  for (const x of L.tree.nodes) x.parents = x.parents.filter((p) => p !== id);
  selected = null; changed(); status(`Deleted: ${n.name}.`);
}
addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement || {}).tagName)) return;
  if (e.key === 'Delete' && selected && L.mode === 'edit') deleteNode(selected);
  if (e.key === 'Escape' && L.mode === 'edit') setTool('select');
});

/* ---------------- okno Drzewko ---------------- */
function showTreeForm() {
  $('treeName').value = L.tree.name; $('ptsEn').value = L.tree.points.label; $('ptsPl').value = L.tree.points.labelPl;
  fillBg(); $('notes').value = L.tree.notes || ''; $('viewSel').value = L.tree.view;
}
// tło: obrazy zapisane w laboratorium sztuki (zasób „image”); zapisane w drzewku imię, którego już nie ma, zostaje na liście
function fillBg() {
  const s = $('bg'), names = listAssets('image'); s.replaceChildren(el('option', { value: '', textContent: L.tree.view === 'pcb' ? '(the planet horizon)' : '(none)' }));
  [...new Set([...names, ...(L.tree.background ? [L.tree.background] : [])])].forEach((n) => s.append(el('option', { value: n, textContent: names.includes(n) ? n : `${n} (missing)` })));
  s.value = L.tree.background;
}
$('treeName').oninput = () => { L.tree.name = $('treeName').value; save(); };
$('ptsEn').oninput = () => { L.tree.points.label = $('ptsEn').value || 'points'; save(); showTrial(); };
$('ptsPl').oninput = () => { L.tree.points.labelPl = $('ptsPl').value; save(); };
$('bg').onchange = () => { L.tree.background = $('bg').value; save(); view.layout(); status(L.tree.background ? `Background: ${L.tree.background} (painting it…).` : 'No background image.'); };
$('notes').oninput = () => { L.tree.notes = $('notes').value; save(); };
function saveTree(name) {
  const n = String(name || L.tree.name || '').trim(); if (!n) throw new Error('a tree needs a name');
  L.tree.name = n; const d = cloneTree(L.tree);
  saveAsset('tree', n, Object.fromEntries(TREE_KEYS.map((k) => [k, d[k]]))); L.source = `asset:${n}`; save(); fillTreeSel(); showTreeForm(); return n;
}
$('treeSave').onclick = () => { try { status(`Saved: ${saveTree($('treeName').value)}.`); } catch (e) { status(e.message); } };
$('treeDel').onclick = () => {
  if (!L.source.startsWith('asset:')) { status('Pick a saved tree first.'); return; }
  const n = L.source.slice(6); removeAsset('tree', n); L.source = 'new'; save(); fillTreeSel(); status(`Deleted the saved ${n} (it stays here until you load another).`);
};
$('treeNew').onclick = () => { setTree(emptyTree(), 'new'); fillTreeSel(); status('A new, empty tree: add nodes with Add.'); };
$('exportBtn').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(L.tree, null, 2)], { type: 'application/json' }));
  const a = el('a', { href: url, download: `${(L.tree.name || 'tree').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json` }); a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('importBtn').onclick = () => $('importFile').click();
$('importFile').onchange = async () => {
  const f = $('importFile').files[0]; if (!f) return;
  try { setTree(JSON.parse(await f.text()), 'new'); fillTreeSel(); status(`Imported: ${L.tree.name}.`); } catch (e) { status(`Not a tree: ${e.message}`); }
  $('importFile').value = '';
};

/* ---------------- okno Węzeł ---------------- */
function row(label, input) { return el('div', { className: 'row' }, el('span', { textContent: label }), input, el('output')); }
function input(type, value, on, extra = {}) { const i = el('input', { type, value: value ?? '', ...extra }); i.addEventListener(type === 'checkbox' ? 'change' : 'input', () => on(i)); return i; }
function select(opts, value, on) { const s = el('select'); opts.forEach(([v, t]) => s.append(el('option', { value: v, textContent: t }))); s.value = value; s.onchange = () => on(s); return s; }
function check(label, on, value) { const i = el('input', { type: 'checkbox', checked: !!value }); i.onchange = () => on(i.checked); return el('label', { className: 'chk' }, i, ` ${label}`); }
const effectText = (e) => Object.entries(e).map(([k, v]) => `${k} ${v}`).join('\n');
function parseEffect(s) {
  const e = {};
  for (const line of s.split('\n')) { const [k, v] = line.trim().split(/[\s=:]+/); if (!k) continue; if (v === undefined || v === 'true') e[k] = true; else if (Number.isFinite(+v)) e[k] = +v; }
  return e;
}
function showNode() {
  const f = $('nodeForm'); f.replaceChildren(); const n = selected && byId(selected);
  if (!n) { f.append(el('p', { className: 'note', textContent: 'Click a node in the tree (Edit → Select) to edit it here.' })); return; }
  const set = (k, redraw = true) => (i) => { n[k] = i.type === 'number' ? +i.value || 0 : i.value; if (redraw) changed({ form: false }); else save(); };
  const id = input('text', n.id, () => {}, { maxLength: 32 });
  id.onchange = () => {
    const v = id.value.trim(); if (!v || v === n.id) { id.value = n.id; return; }
    if (byId(v)) { status(`There already is a node "${v}".`); id.value = n.id; return; }
    for (const x of L.tree.nodes) x.parents = x.parents.map((p) => (p === n.id ? v : p));
    if (L.levels[n.id]) { L.levels[v] = L.levels[n.id]; delete L.levels[n.id]; } n.id = v; selected = v; changed();
  };
  f.append(row('Id', id), row('Name (EN)', input('text', n.name, set('name'))), row('Name (PL)', input('text', n.namePl, set('namePl'))));
  if (n.kind !== 'core') f.append(row('Kind', select(Object.entries(KINDS).filter(([k]) => k !== 'core').map(([k, x]) => [k, x.label]), n.kind, (s) => { n.kind = s.value; changed({ form: false }); })));
  f.append(row('Branch', select(Object.entries(L.tree.branches).map(([k, b]) => [k, b.label]), n.branch, (s) => { n.branch = s.value; changed({ form: false }); })));
  // ikony obu widoków: pixel art (promienisty) i obrys (płytka); ikona tylko z jednego zestawu — w drugim widoku bez ikony
  const icons = [...new Set([...Object.keys(PIXEL_ICONS), ...Object.keys(PCB_ICONS)])].filter((k) => k !== 'lock').sort()
    .map((k) => [k, PIXEL_ICONS[k] && PCB_ICONS[k] ? k : `${k} (${PIXEL_ICONS[k] ? 'pixel art' : 'circuit board'} only)`]);
  f.append(row('Icon', select([['', '(none)'], ...icons], n.icon || '', (s) => { n.icon = s.value || null; changed({ form: false }); })));
  const col = input('color', n.color || L.tree.branches[n.branch].color, (i) => { n.color = i.value; changed({ form: false }); });
  f.append(row('Own colour', col), check("the branch's colour", (v) => { n.color = v ? null : col.value; changed(); }, !n.color));
  if (n.kind !== 'core') {
    if (n.kind !== 'hub') {
      f.append(row('Cost', input('number', n.cost, set('cost'), { min: 0, step: 10 })));
      f.append(row('Levels', input('number', n.levels, (i) => { n.levels = Math.max(1, Math.min(99, Math.round(+i.value || 1))); changed({ form: false }); }, { min: 1, max: 99, step: 1, title: 'How many times it can be bought' })));
      f.append(row('Cost growth', input('number', n.growth, (i) => { n.growth = Math.max(1, Math.min(10, +i.value || 1)); changed({ form: false }); }, { min: 1, max: 10, step: 0.05, title: 'Level L costs round(cost × growth^L)' })));
    }
    f.append(row('Level', input('number', n.depth, set('depth'), { min: 0.5, max: 8, step: 0.1 })), row('Angle', input('number', n.angle, set('angle'), { min: -110, max: 110, step: 1 })));
    f.append(el('h3', { textContent: 'Grows from' }));
    const list = el('div', { className: 'parents' });
    n.parents.forEach((p) => { const b = el('button', { type: 'button', textContent: `${(byId(p) || {}).name || p} ✕`, title: 'Remove this link' }); b.onclick = () => { n.parents = n.parents.filter((x) => x !== p); changed(); }; list.append(b); });
    if (!n.parents.length) list.append(el('span', { className: 'note', textContent: 'nothing (Link: click a parent, then this node)' }));
    f.append(list, row('Needs', select([['any', 'any one of them'], ['all', 'all of them']], n.all ? 'all' : 'any', (s) => { n.all = s.value === 'all'; changed({ form: false }); })));
    f.append(check('Coming soon (shown, not for sale yet)', (v) => { n.soon = v; changed({ form: false }); }, n.soon));
    if (n.kind !== 'hub') {
      f.append(el('h3', { textContent: 'Effect' }), el('p', { className: 'note', textContent: 'One per line, per level: a game stat and a number (they add up), or just a name (on). E.g. "count 10", "bolt".' }));
      const ef = el('textarea', { rows: 3, spellcheck: false, value: effectText(n.effect) }); ef.oninput = () => { n.effect = parseEffect(ef.value); changed({ form: false }); }; f.append(ef);
    }
  }
  f.append(el('h3', { textContent: 'Text (EN)' }));
  const tx = el('textarea', { rows: 2, value: n.text }); tx.oninput = () => { n.text = tx.value; changed({ form: false }); }; f.append(tx);
  f.append(el('h3', { textContent: 'Text (PL)' }));
  const tp = el('textarea', { rows: 2, value: n.textPl }); tp.oninput = () => { n.textPl = tp.value; changed({ form: false }); }; f.append(tp);
  f.append(el('h3', { textContent: 'Note' }), el('p', { className: 'note', textContent: 'For you: what should be there (not shown in the game).' }));
  const nt = el('textarea', { rows: 2, value: n.note || '' }); nt.oninput = () => { n.note = nt.value; save(); }; f.append(nt);
  if (n.kind !== 'core') { const d = el('button', { type: 'button', textContent: 'Delete the node' }); d.onclick = () => deleteNode(n.id); f.append(el('div', { className: 'btns' }, d)); }
}

/* ---------------- okno Gałęzie ---------------- */
function showBranches() {
  const box = $('branchList'); box.replaceChildren();
  const count = (k) => L.tree.nodes.filter((n) => n.branch === k).length;
  for (const [k, b] of Object.entries(L.tree.branches)) {
    const c = input('color', b.color, (i) => { b.color = i.value; save(); });
    const en = input('text', b.label, (i) => { b.label = i.value; save(); }, { title: 'Name (EN)' });
    const pl = input('text', b.labelPl, (i) => { b.labelPl = i.value; save(); }, { title: 'Name (PL)', placeholder: 'PL' });
    const r = el('div', { className: 'branchRow', title: `${k}: ${count(k)} nodes` }, c, en, pl);
    if (k !== 'core') { const x = el('button', { type: 'button', textContent: '✕', title: count(k) ? 'Nodes still use it' : 'Remove the branch', disabled: !!count(k) }); x.onclick = () => { delete L.tree.branches[k]; changed(); }; r.append(x); }
    box.append(r);
  }
}
$('branchAdd').onclick = () => {
  const k = $('branchId').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!k || L.tree.branches[k]) { status(k ? `There already is a branch "${k}".` : 'Give the branch an id.'); return; }
  L.tree.branches[k] = { label: k, labelPl: '', color: '#88aaff' }; $('branchId').value = ''; changed();
};

/* ---------------- okno Próba ---------------- */
const kv = (k, v) => [el('span', { textContent: k }), el('b', { textContent: v })];
function showTrial() {
  const pts = L.tree.points.label, buy = L.tree.nodes.filter((n) => n.kind !== 'core' && n.kind !== 'hub' && !n.soon);
  const lv = buy.reduce((a, n) => a + trial.level(n.id), 0), lvAll = buy.reduce((a, n) => a + n.levels, 0);
  $('trialStats').replaceChildren(...kv('Left', `${points().toLocaleString('en')} ${pts}`), ...kv('Spent', trial.spent.toLocaleString('en')),
    ...kv('Bought', `${buy.filter((n) => trial.has(n.id)).length} / ${buy.length}${lvAll > buy.length ? ` (levels ${lv} / ${lvAll})` : ''}`));
  const e = trial.effects();
  $('effects').replaceChildren(...(Object.keys(e).length ? Object.entries(e).flatMap(([k, v]) => kv(k, v === true ? 'on' : String(+v.toFixed(3)))) : kv('—', 'nothing yet')));
  const s = treeStats(L.tree), nm = (r) => (r ? `${byId(r.id).name} (${r.steps} steps, ${r.cost.toLocaleString('en')})` : '—');
  $('treeStats').replaceChildren(...kv('Nodes', `${s.nodes} (for sale ${s.buyable}, soon ${s.soon})`), ...kv('All for sale', `${s.total.toLocaleString('en')} ${pts}${s.levels > s.buyable ? ` (${s.levels} levels)` : ''}`),
    ...kv('Longest way', nm(s.longest)), ...kv('Dearest way', nm(s.dearest)));
  $('budget').value = L.budget; if (L.mode === 'trial') hint();
}
$('budget').oninput = () => { L.budget = Math.max(0, +$('budget').value || 0); save(); showTrial(); };
$('plus100').onclick = () => { L.budget += 100; save(); showTrial(); };
$('plus1000').onclick = () => { L.budget += 1000; save(); showTrial(); };
$('trialReset').onclick = () => { L.levels = {}; rebuildStates(); save(); showTrial(); status('Everything sold: the points are back.'); };

/* ---------------- okno Sprawdzenie ---------------- */
function showChecks() {
  const list = checkTree(L.tree), box = $('checkList'); box.replaceChildren();
  view.marked = new Set(list.filter((i) => i.id && i.level !== 'info').map((i) => i.id));
  if (!list.length) { box.append(el('p', { className: 'note ok', textContent: 'All good: every node can be reached, no loops, every one has a text and an effect.' })); return; }
  for (const i of list) {
    const b = el('button', { type: 'button', className: `issue is-${i.level}`, textContent: i.text, title: i.code });
    b.onclick = () => { if (i.id && byId(i.id)) { if (L.mode !== 'edit') setMode('edit'); selected = i.id; view.selected = i.id; showNode(); } };
    box.append(b);
  }
}

/* ---------------- dla AI ---------------- */
// TreeApi: get() — drzewko; load(def | nazwa); check(); stats(); points(n); buy(id); effects(); reset(); save(nazwa) — zasób „tree”
window.TreeApi = {
  get: () => cloneTree(L.tree),
  load: (d) => { const def = typeof d === 'string' ? SAMPLES[d] || getAsset('tree', d) : d; if (!def) throw new Error(`no tree "${d}"`); setTree(cloneTree(def), typeof d === 'string' ? (SAMPLES[d] ? `sample:${d}` : `asset:${d}`) : 'new'); fillTreeSel(); return window.TreeApi.check(); },
  check: () => checkTree(L.tree), stats: () => treeStats(L.tree),
  points: (n) => { if (n != null) { L.budget = Math.max(0, +n || 0); save(); showTrial(); } return points(); },
  buy: (id) => { const ok = buyNode(id); return { bought: ok, level: trial.level(id), state: trial.state(id), next: trial.costOf(id), left: points() }; },
  effects: () => trial.effects(), reset: () => { L.levels = {}; rebuildStates(); save(); showTrial(); },
  view: (v) => { if (v) { if (!VIEWS[v]) throw new Error(`view: ${Object.keys(VIEWS).join(' | ')}`); L.tree.view = v; makeView(); changed({ form: false }); showTreeForm(); } return L.tree.view; },
  background: (n) => { if (n !== undefined) { L.tree.background = String(n || ''); save(); showTreeForm(); view.layout(); } return L.tree.background; },
  mode: (m) => { if (m) setMode(m); return L.mode; },
  save: (name) => ({ saved: saveTree(name) }), saved: () => listAssets('tree'), samples: () => Object.keys(SAMPLES),
};
function apiTab() {
  if (!window.LabConsole) return;
  const box = el('div', { className: 'treeApi' }), ta = el('textarea', { className: 'mono', rows: 4, spellcheck: false, value: 'TreeApi.check()' });
  const go = el('button', { type: 'button', textContent: 'Run' }), out = el('pre', { className: 'note mono' });
  go.onclick = () => {
    const m = /^\s*TreeApi\.(\w+)\((.*)\)\s*$/s.exec(ta.value);
    try { if (!m || !window.TreeApi[m[1]]) throw new Error('write TreeApi.<method>(JSON arguments)'); const args = m[2].trim() ? JSON.parse(`[${m[2]}]`) : []; out.textContent = JSON.stringify(window.TreeApi[m[1]](...args), null, 1).slice(0, 4000); } catch (e) { out.textContent = `Error: ${e.message}`; }
  };
  box.append(ta, go, el('p', { className: 'note', textContent: 'Methods: get, load(tree | "name"), check, stats, points(n), buy("id"), effects, reset, mode("edit" | "trial"), view("radial" | "pcb"), background("image name"), save("name"), saved, samples.' }), out);
  window.LabConsole.addTab({ id: 'treeapi', title: 'API', titlePl: 'API', el: box });
}
if (window.LabConsole) apiTab(); else addEventListener('load', apiTab);

/* ---------------- start ---------------- */
onAssetsChange(() => { fillTreeSel(); fillBg(); });
rebuildStates(); makeView(); fillTreeSel(); showTreeForm(); setMode(L.mode); showNode();
