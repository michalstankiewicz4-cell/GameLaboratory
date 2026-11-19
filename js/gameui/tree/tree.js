// TreeKit — drzewko technologiczne (ulepszeń, badań) jako dane, dla dowolnej gry. Z Hive Hunger (js/core/SkillTree.js):
// stan gracza (kupione węzły, wydane punkty, co można kupić) i sumowanie efektów — ogólnie, nie dla jednej gry.
// Bez Three.js i bez DOM. Widoki: promienisty w pixel arcie (radial.js, z Hive Hunger) i „płytka drukowana” (pcb.js,
// z badań Space); laboratorium: labs/trees.html; okno w UI gry: blok { type: 'tree' } (js/gameui/gameui.js).
//
// Drzewko (format 'gamelab-tree', zasób „tree” w js/scene/assets.js):
// { format: 'gamelab-tree', version: 1, name, view: 'radial' | 'pcb' (jak gra pokazuje drzewko),
//   background: '' | nazwa obrazu (zasób „image” z laboratorium sztuki; background.js),
//   points: { label, labelPl } (jak gra nazywa punkty), branches: { id: { label, labelPl, color: '#rrggbb' } },
//   nodes: [{ id, name, namePl, kind, branch, parents, all, depth, angle, cost, levels, growth, effect, text, textPl, icon,
//     soon, color, note }], notes }
// kind: 'core' (korzeń, kupiony od początku) | 'hub' (rozgałęzienie: nie kupowane, otwarte, gdy otwarty rodzic) |
//   'trait' (cecha całości: romb) | 'unit' (jednostka, budowla: sześciokąt) | 'prop' (cecha jednostki: kółko); parents: wystarczy którykolwiek kupiony (all: true — wszystkie); depth: pierścień
//   (0 … 5, ułamki dozwolone), angle: stopnie od pionu (-110 … 110); levels: ile razy można kupić (jak ulepszenia Space;
//   1 — raz), growth: mnożnik kosztu na poziom (koszt poziomu L = round(cost · growth^L)); effect: { klucz statystyki:
//   liczba | true } na poziom — klucze to statystyki gry (system statystyk, TODO), liczby się sumują; soon: widoczny, jeszcze nie do kupienia;
//   color: własny kolor węzła (bez — kolor gałęzi); note: notatka projektanta (nie w grze); notes: notatki do całego drzewka.
export const FORMAT = 'gamelab-tree', VERSION = 1;
export const KINDS = {
  core: { label: 'Core', labelPl: 'Rdzeń', shape: 'diamond' },
  hub: { label: 'Branch point (not bought)', labelPl: 'Rozgałęzienie (nie kupowane)', shape: 'ring' },
  trait: { label: 'Trait (diamond)', labelPl: 'Cecha (romb)', shape: 'diamond' },
  unit: { label: 'Unit (hexagon)', labelPl: 'Jednostka (sześciokąt)', shape: 'hexagon' },
  prop: { label: 'Unit property (circle)', labelPl: 'Cecha jednostki (kółko)', shape: 'circle' },
};
const clone = (o) => JSON.parse(JSON.stringify(o));

export const VIEWS = { radial: { label: 'Radial (pixel art)', labelPl: 'Promienisty (pixel art)' }, pcb: { label: 'Circuit board', labelPl: 'Płytka drukowana' } };
const FREE = (n) => n.kind === 'core' || n.kind === 'hub';   // nie kupowane

export function emptyTree(name = 'New tree') {
  return { format: FORMAT, version: VERSION, name, view: 'radial', background: '', points: { label: 'points', labelPl: 'punkty' },
    branches: { core: { label: 'Core', labelPl: 'Rdzeń', color: '#ffd65c' } },
    nodes: [{ id: 'core', name: 'Core', namePl: 'Rdzeń', kind: 'core', branch: 'core', parents: [], all: false, depth: 0, angle: 0, cost: 0, effect: {}, text: '', textPl: '', levels: 1, growth: 1, icon: 'core', soon: false, color: null, note: '' }], notes: '' };
}

// sprawdza i uzupełnia drzewko (z pliku, z zasobu, z API); zwraca poprawne albo rzuca błąd
export function normalizeTree(d) {
  if (!d || typeof d !== 'object' || (d.format && d.format !== FORMAT) || !Array.isArray(d.nodes)) throw new Error(`not a tree (format: ${FORMAT})`);
  const t = { ...emptyTree(String(d.name || 'Tree')), view: VIEWS[d.view] ? d.view : 'radial', background: String(d.background || ''), points: { ...emptyTree().points, ...(d.points || {}) } };
  t.branches = {};
  for (const [k, b] of Object.entries(d.branches || {})) t.branches[k] = { label: String(b.label || k), labelPl: String(b.labelPl || ''), color: /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : '#888888' };
  if (!t.branches.core) t.branches.core = emptyTree().branches.core;
  const num = (v, def, lo, hi) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : def);
  t.nodes = d.nodes.filter((n) => n && typeof n.id === 'string' && n.id).map((n) => ({
    id: n.id, name: String(n.name || n.id), namePl: String(n.namePl || ''), kind: KINDS[n.kind] ? n.kind : 'trait',
    branch: t.branches[n.branch] ? n.branch : 'core', parents: Array.isArray(n.parents) ? n.parents.map(String) : [], all: !!n.all,
    depth: num(n.depth, 1, 0, 8), angle: num(n.angle, 0, -110, 110), cost: num(n.cost, 0, 0, 1e9),
    levels: Math.round(num(n.levels, 1, 1, 99)), growth: num(n.growth, 1, 1, 10),
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

/** Stan gracza w drzewku: poziom każdego węzła (kupione — poziom ≥ 1) i ile punktów wydał. */
export class TreeState {
  constructor(tree) {
    this.tree = tree; this.byId = Object.fromEntries(tree.nodes.map((n) => [n.id, n]));
    this.levels = {}; this.spent = 0; this.grow();
  }

  /** Kupione (poziom ≥ 1) i otwarte rozgałęzienia — z nich rosną dzieci. */
  get owned() { return new Set(Object.keys(this.levels)); }

  has(id) { return (this.levels[id] || 0) > 0; }

  level(id) { return this.levels[id] || 0; }

  // rdzeń od początku, rozgałęzienia — gdy otwarty rodzic (którykolwiek, z `all` — wszyscy)
  grow() {
    let more = true;
    while (more) {
      more = false;
      for (const n of this.tree.nodes) if (!this.levels[n.id] && FREE(n) && !n.soon && (n.kind === 'core' || this.parentsOk(n))) { this.levels[n.id] = 1; more = true; }
    }
  }

  parentsOk(n) { return n.all ? n.parents.every((p) => this.has(p)) : n.parents.some((p) => this.has(p)); }

  /** 'owned' (wszystkie poziomy) | 'available' (rodzic kupiony — z `all` każdy; także kupiony częściowo) | 'locked' | 'soon' */
  state(id) {
    const n = this.byId[id];
    if (!n) return 'locked';
    if (this.level(id) >= (FREE(n) ? 1 : n.levels)) return 'owned';
    if (n.soon) return 'soon';
    return this.has(id) || this.parentsOk(n) ? 'available' : 'locked';
  }

  /** Koszt następnego poziomu (null — wszystkie kupione albo nie do kupienia). */
  costOf(id) {
    const n = this.byId[id], l = this.level(id);
    if (!n || FREE(n) || l >= n.levels) return null;
    return Math.round(n.cost * Math.pow(n.growth, l));
  }

  /** Whether `points` are enough to buy the next level of node `id` now. */
  canBuy(id, points) {
    const c = this.costOf(id);
    return c !== null && this.state(id) === 'available' && points >= c;
  }

  buy(id, points) {
    if (!this.canBuy(id, points)) return false;
    this.spent += this.costOf(id);
    this.levels[id] = this.level(id) + 1;
    this.grow();
    return true;
  }

  /** Wszystko kupione, zsumowane: { klucz: suma liczb × poziom | true } (w Hive Hunger — premie roju i błyskawicy). */
  effects() {
    const e = {};
    for (const [id, l] of Object.entries(this.levels)) for (const [k, v] of Object.entries((this.byId[id] || {}).effect || {})) {
      if (v === true) e[k] = true; else e[k] = (typeof e[k] === 'number' ? e[k] : 0) + v * l;
    }
    return e;
  }

  toJSON() {
    return { levels: { ...this.levels }, spent: this.spent };
  }

  // { levels, spent } albo dawne { owned: [id], spent } (każdy kupiony raz)
  load({ levels, owned, spent }) {
    this.levels = {};
    if (levels) for (const [id, l] of Object.entries(levels)) { if (this.byId[id] && l > 0) this.levels[id] = Math.min(l, this.byId[id].levels || 1); }
    else for (const id of owned || []) if (this.byId[id]) this.levels[id] = 1;
    this.spent = Number.isFinite(spent) ? spent : this.spentFor();
    this.grow();
  }

  // ile kosztowały obecne poziomy
  spentFor() {
    let s = 0;
    for (const [id, l] of Object.entries(this.levels)) { const n = this.byId[id]; if (n && !FREE(n)) for (let k = 0; k < l; k++) s += Math.round(n.cost * Math.pow(n.growth, k)); }
    return s;
  }
}

// liczby drzewka: węzły (wszystkie, do kupienia, „wkrótce”), poziomy, koszt całości (wszystkie poziomy), najdroższa
// i najdłuższa droga od rdzenia (pierwsze poziomy)
export function treeStats(t) {
  const byId = Object.fromEntries(t.nodes.map((n) => [n.id, n])), memo = {};
  // najtańsza droga do węzła (koszt i długość): węzeł „wszyscy rodzice” — suma dróg rodziców, „którykolwiek” — najtańsza
  const reach = (id, seen = new Set()) => {
    if (memo[id]) return memo[id];
    const n = byId[id]; if (!n || seen.has(id)) return { cost: Infinity, steps: Infinity };
    if (n.kind === 'core') return (memo[id] = { cost: 0, steps: 0 });
    // (rozgałęzienie: bez kosztu i bez kroku)
    seen.add(id);
    const ps = n.parents.map((p) => reach(p, seen)); seen.delete(id);
    if (!ps.length) return (memo[id] = { cost: Infinity, steps: Infinity });
    const r = n.all ? { cost: ps.reduce((a, p) => a + p.cost, 0), steps: Math.max(...ps.map((p) => p.steps)) }
      : ps.reduce((a, p) => (p.cost < a.cost ? p : a), { cost: Infinity, steps: Infinity });
    return (memo[id] = n.kind === 'hub' ? r : { cost: r.cost + n.cost, steps: r.steps + 1 });
  };
  const buyable = t.nodes.filter((n) => !FREE(n) && !n.soon);
  const all = (n) => { let c = 0; for (let k = 0; k < n.levels; k++) c += Math.round(n.cost * Math.pow(n.growth, k)); return c; };
  let longest = null, dearest = null;
  for (const n of buyable) { const r = reach(n.id); if (!isFinite(r.cost)) continue;
    if (!longest || r.steps > longest.steps) longest = { id: n.id, ...r };
    if (!dearest || r.cost > dearest.cost) dearest = { id: n.id, ...r }; }
  return { nodes: t.nodes.length, buyable: buyable.length, soon: t.nodes.filter((n) => n.soon).length,
    levels: buyable.reduce((a, n) => a + n.levels, 0), total: buyable.reduce((a, n) => a + all(n), 0), longest, dearest };
}

// sprawdzanie drzewka (jak mały lekarz): [{ level: 'error' | 'warn' | 'info', code, id?, text }]
export function checkTree(t) {
  const out = [], byId = Object.fromEntries(t.nodes.map((n) => [n.id, n])), seen = new Set();
  const add = (level, code, id, text) => out.push({ level, code, ...(id ? { id } : {}), text });
  for (const n of t.nodes) {
    if (n.kind === 'hub' && (n.cost || Object.keys(n.effect).length)) add('info', 'hub-cost', n.id, `${n.name} is a branch point: its cost and effect are not used`);
    if (seen.has(n.id)) add('error', 'duplicate-id', n.id, `Two nodes have the id "${n.id}"`); seen.add(n.id);
    for (const p of n.parents) if (!byId[p]) add('error', 'missing-parent', n.id, `${n.name}: no node "${p}" to grow from`);
    if (n.kind !== 'core' && !n.parents.length) add('error', 'no-parent', n.id, `${n.name} grows from nothing: it can never be bought`);
    if (n.kind !== 'core' && n.kind !== 'hub' && !n.text) add('warn', 'no-text', n.id, `${n.name} has no description`);
    if (!FREE(n) && !n.soon && !Object.keys(n.effect).length) add('warn', 'no-effect', n.id, `${n.name} can be bought but does nothing (no effect)`);
    if (!FREE(n) && !n.soon && !n.cost) add('info', 'free', n.id, `${n.name} costs nothing`);
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
  while (grew) { grew = false; for (const n of t.nodes) if (!st.has(n.id) && st.state(n.id) === 'available') { st.levels[n.id] = 1; st.grow(); grew = true; } }
  for (const n of t.nodes) if (!st.has(n.id) && !n.soon && !out.some((i) => i.id === n.id && i.level === 'error'))
    add('warn', 'unreachable', n.id, `${n.name} can't be reached: every way to it goes through a node that is "soon" or unreachable`);
  return out;
}

export const cloneTree = clone;
