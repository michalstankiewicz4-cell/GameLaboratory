// TreeKit — drzewko technologiczne (ulepszeń, badań) jako dane, dla dowolnej gry. Z Hive Hunger (js/core/SkillTree.js):
// stan gracza (kupione węzły, wydane punkty, co można kupić) i sumowanie efektów — ogólnie, nie dla jednej gry.
// Bez Three.js i bez DOM. Widok promienisty w pixel arcie: radial.js; laboratorium: labs/trees.html.
//
// Drzewko (format 'gamelab-tree', zasób „tree” w js/scene/assets.js):
// { format: 'gamelab-tree', version: 1, name, background: '' | nazwa obrazu z laboratorium sztuki (w planie),
//   points: { label, labelPl } (jak gra nazywa punkty), branches: { id: { label, labelPl, color: '#rrggbb' } },
//   nodes: [{ id, name, namePl, kind, branch, parents, all, depth, angle, cost, effect, text, textPl, icon, soon, color, note }], notes }
// kind: 'core' (korzeń, kupiony od początku) | 'trait' (cecha całości: romb) | 'unit' (jednostka, budowla: sześciokąt) |
//   'prop' (cecha jednostki: kółko); parents: wystarczy którykolwiek kupiony (all: true — wszystkie); depth: pierścień
//   (0 … 5, ułamki dozwolone), angle: stopnie od pionu (-110 … 110); effect: { klucz statystyki: liczba | true } —
//   klucze to statystyki gry (system statystyk, TODO), liczby się sumują; soon: widoczny, jeszcze nie do kupienia;
//   color: własny kolor węzła (bez — kolor gałęzi); note: notatka projektanta (nie w grze); notes: notatki do całego drzewka.
export const FORMAT = 'gamelab-tree', VERSION = 1;
export const KINDS = {
  core: { label: 'Core', labelPl: 'Rdzeń', shape: 'diamond' },
  trait: { label: 'Trait (diamond)', labelPl: 'Cecha (romb)', shape: 'diamond' },
  unit: { label: 'Unit (hexagon)', labelPl: 'Jednostka (sześciokąt)', shape: 'hexagon' },
  prop: { label: 'Unit property (circle)', labelPl: 'Cecha jednostki (kółko)', shape: 'circle' },
};
const clone = (o) => JSON.parse(JSON.stringify(o));

export function emptyTree(name = 'New tree') {
  return { format: FORMAT, version: VERSION, name, background: '', points: { label: 'points', labelPl: 'punkty' },
    branches: { core: { label: 'Core', labelPl: 'Rdzeń', color: '#ffd65c' } },
    nodes: [{ id: 'core', name: 'Core', namePl: 'Rdzeń', kind: 'core', branch: 'core', parents: [], all: false, depth: 0, angle: 0, cost: 0, effect: {}, text: '', textPl: '', icon: 'core', soon: false, color: null, note: '' }], notes: '' };
}

// sprawdza i uzupełnia drzewko (z pliku, z zasobu, z API); zwraca poprawne albo rzuca błąd
export function normalizeTree(d) {
  if (!d || typeof d !== 'object' || (d.format && d.format !== FORMAT) || !Array.isArray(d.nodes)) throw new Error(`not a tree (format: ${FORMAT})`);
  const t = { ...emptyTree(String(d.name || 'Tree')), background: String(d.background || ''), points: { ...emptyTree().points, ...(d.points || {}) } };
  t.branches = {};
  for (const [k, b] of Object.entries(d.branches || {})) t.branches[k] = { label: String(b.label || k), labelPl: String(b.labelPl || ''), color: /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : '#888888' };
  if (!t.branches.core) t.branches.core = emptyTree().branches.core;
  const num = (v, def, lo, hi) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : def);
  t.nodes = d.nodes.filter((n) => n && typeof n.id === 'string' && n.id).map((n) => ({
    id: n.id, name: String(n.name || n.id), namePl: String(n.namePl || ''), kind: KINDS[n.kind] ? n.kind : 'trait',
    branch: t.branches[n.branch] ? n.branch : 'core', parents: Array.isArray(n.parents) ? n.parents.map(String) : [], all: !!n.all,
    depth: num(n.depth, 1, 0, 8), angle: num(n.angle, 0, -110, 110), cost: num(n.cost, 0, 0, 1e9),
    effect: Object.fromEntries(Object.entries(n.effect && typeof n.effect === 'object' ? n.effect : {}).filter(([, v]) => typeof v === 'number' || v === true)),
    text: String(n.text || ''), textPl: String(n.textPl || ''), icon: n.icon ? String(n.icon) : null, soon: !!n.soon,
    color: /^#[0-9a-f]{6}$/i.test(n.color || '') ? n.color : null, note: String(n.note || ''),
  }));
  if (!t.nodes.some((n) => n.kind === 'core')) t.nodes.unshift(emptyTree().nodes[0]);
  t.notes = String(d.notes || '');
  return t;
}

export const nodeName = (n, pl) => (pl && n.namePl) || n.name;
export const nodeText = (n, pl) => (pl && n.textPl) || n.text;
export const branchName = (b, pl) => (b ? (pl && b.labelPl) || b.label : '');
export const nodeColor = (t, n) => n.color || (t.branches[n.branch] || {}).color || '#888888';

/** Stan gracza w drzewku: które węzły kupił i ile punktów wydał. */
export class TreeState {
  constructor(tree) {
    this.tree = tree; this.byId = Object.fromEntries(tree.nodes.map((n) => [n.id, n]));
    this.owned = new Set(tree.nodes.filter((n) => n.kind === 'core').map((n) => n.id));
    this.spent = 0;
  }

  has(id) {
    return this.owned.has(id);
  }

  /** 'owned' | 'available' (a parent owned — every parent for `all`) | 'locked' | 'soon' (not built yet) */
  state(id) {
    if (this.owned.has(id)) return 'owned';
    const n = this.byId[id];
    if (!n) return 'locked';
    if (n.soon) return 'soon';
    const ok = n.all ? n.parents.every((p) => this.owned.has(p)) : n.parents.some((p) => this.owned.has(p));
    return ok ? 'available' : 'locked';
  }

  /** Whether `points` are enough to buy node `id` now. */
  canBuy(id, points) {
    const n = this.byId[id];
    return Boolean(n) && this.state(id) === 'available' && points >= n.cost;
  }

  buy(id, points) {
    if (!this.canBuy(id, points)) return false;
    this.owned.add(id);
    this.spent += this.byId[id].cost;
    return true;
  }

  /** Wszystko kupione, zsumowane: { klucz: suma liczb | true } (w Hive Hunger — premie roju i błyskawicy). */
  effects() {
    const e = {};
    for (const id of this.owned) for (const [k, v] of Object.entries((this.byId[id] || {}).effect || {})) {
      if (v === true) e[k] = true; else e[k] = (typeof e[k] === 'number' ? e[k] : 0) + v;
    }
    return e;
  }

  toJSON() {
    return { owned: [...this.owned], spent: this.spent };
  }

  load({ owned, spent }) {
    this.owned = new Set(owned);
    this.spent = spent;
  }
}

// liczby drzewka: węzły (wszystkie, do kupienia, „wkrótce”), koszt całości, najdroższa i najdłuższa droga od rdzenia
export function treeStats(t) {
  const byId = Object.fromEntries(t.nodes.map((n) => [n.id, n])), memo = {};
  // najtańsza droga do węzła (koszt i długość): węzeł „wszyscy rodzice” — suma dróg rodziców, „którykolwiek” — najtańsza
  const reach = (id, seen = new Set()) => {
    if (memo[id]) return memo[id];
    const n = byId[id]; if (!n || seen.has(id)) return { cost: Infinity, steps: Infinity };
    if (n.kind === 'core') return (memo[id] = { cost: 0, steps: 0 });
    seen.add(id);
    const ps = n.parents.map((p) => reach(p, seen)); seen.delete(id);
    if (!ps.length) return (memo[id] = { cost: Infinity, steps: Infinity });
    const r = n.all ? { cost: ps.reduce((a, p) => a + p.cost, 0), steps: Math.max(...ps.map((p) => p.steps)) }
      : ps.reduce((a, p) => (p.cost < a.cost ? p : a), { cost: Infinity, steps: Infinity });
    return (memo[id] = { cost: r.cost + n.cost, steps: r.steps + 1 });
  };
  const buyable = t.nodes.filter((n) => n.kind !== 'core' && !n.soon);
  let longest = null, dearest = null;
  for (const n of buyable) { const r = reach(n.id); if (!isFinite(r.cost)) continue;
    if (!longest || r.steps > longest.steps) longest = { id: n.id, ...r };
    if (!dearest || r.cost > dearest.cost) dearest = { id: n.id, ...r }; }
  return { nodes: t.nodes.length, buyable: buyable.length, soon: t.nodes.filter((n) => n.soon).length,
    total: buyable.reduce((a, n) => a + n.cost, 0), longest, dearest };
}

// sprawdzanie drzewka (jak mały lekarz): [{ level: 'error' | 'warn' | 'info', code, id?, text }]
export function checkTree(t) {
  const out = [], byId = Object.fromEntries(t.nodes.map((n) => [n.id, n])), seen = new Set();
  const add = (level, code, id, text) => out.push({ level, code, ...(id ? { id } : {}), text });
  for (const n of t.nodes) {
    if (seen.has(n.id)) add('error', 'duplicate-id', n.id, `Two nodes have the id "${n.id}"`); seen.add(n.id);
    for (const p of n.parents) if (!byId[p]) add('error', 'missing-parent', n.id, `${n.name}: no node "${p}" to grow from`);
    if (n.kind !== 'core' && !n.parents.length) add('error', 'no-parent', n.id, `${n.name} grows from nothing: it can never be bought`);
    if (n.kind !== 'core' && !n.text) add('warn', 'no-text', n.id, `${n.name} has no description`);
    if (n.kind !== 'core' && !n.soon && !Object.keys(n.effect).length) add('warn', 'no-effect', n.id, `${n.name} can be bought but does nothing (no effect)`);
    if (n.kind !== 'core' && !n.soon && !n.cost) add('info', 'free', n.id, `${n.name} costs nothing`);
    if (n.parents.includes(n.id)) add('error', 'self-parent', n.id, `${n.name} grows from itself`);
    if (!t.branches[n.branch]) add('warn', 'unknown-branch', n.id, `${n.name}: no branch "${n.branch}"`);
  }
  // pętle (węzeł jest swoim przodkiem)
  const state = {};
  const visit = (id, path) => {
    if (state[id] === 1) { add('error', 'cycle', id, `A loop: ${[...path.slice(path.indexOf(id)), id].map((x) => (byId[x] || {}).name || x).join(' → ')}`); return; }
    if (state[id] === 2 || !byId[id]) return;
    state[id] = 1; for (const p of byId[id].parents) visit(p, [...path, id]); state[id] = 2;
  };
  for (const n of t.nodes) visit(n.id, []);
  // nieosiągalne: nie da się ich kupić nawet z wszystkimi punktami (rodzic „wkrótce” albo nieosiągalny)
  const st = new TreeState(t); let grew = true;
  while (grew) { grew = false; for (const n of t.nodes) if (!st.owned.has(n.id) && st.state(n.id) === 'available') { st.owned.add(n.id); grew = true; } }
  for (const n of t.nodes) if (!st.owned.has(n.id) && !n.soon && !out.some((i) => i.id === n.id && i.level === 'error'))
    add('warn', 'unreachable', n.id, `${n.name} can't be reached: every way to it goes through a node that is "soon" or unreachable`);
  return out;
}

export const cloneTree = clone;
