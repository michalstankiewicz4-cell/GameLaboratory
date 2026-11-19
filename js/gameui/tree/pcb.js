// Widok „płytka drukowana” drzewka — z okna Badania Space (js/ui/windows/techTree.js), dla dowolnego drzewka
// 'gamelab-tree' (tree.js). Jedno SVG: horyzont planety na dole (obraz tła img/research-bg.jpg albo obraz z zasobu
// „image”, background.js), pień z wiązki ścieżek miedzi, gałęzie prowadzone jak ścieżki płytki (prosto, potem 45°)
// z biegnącymi impulsami światła na żywych, okrągłe węzły w metalowych obręczach z nitami; poziom kupionego — pierścień
// wokół obręczy. Położenie z pola węzła: depth → pierścień (jak w Space: 0, 205, 365, 470, dalej co 105), angle — stopnie
// od pionu; drzewko głębsze niż 3 poziomy ściska się, żeby zmieściło się w widoku (węzły mniejsze). Interfejs jak RadialView (radial.js): layout(), place(), polar(), nodeAt(), pos, selected, marked, tip.
// Bez innerHTML i bez atrybutów style (CSP): elementy przez DOM, style przez CSSOM; wygląd: js/gameui/css/tree.css.
import { KINDS, nodeName, nodeText } from './tree.js';

const W = 1100, H = 640;
const ROOT = { x: W / 2, y: 452 };
const RING = [0, 205, 365, 470];            // promień na poziom (dalej co 105)
const HORIZON_Y = 590;                      // najwyższy punkt planety
const R = { root: 50, branch: 40, leaf: 31 };
const NS = 'http://www.w3.org/2000/svg';
const BG = { href: new URL('./img/research-bg.jpg', import.meta.url).href, w: 1248, h: 832, horizon: 579 };   // obraz z AI (Space), horyzont na 69,6 % wysokości

// ikony 24 × 24 (pole „icon” węzła) — obrys, klasa f: wypełnienie
export const ICONS = {
  core: '<path d="M8 5L3 12L8 19M16 5L21 12L16 19"/><circle class="f" cx="12" cy="8.5" r="1.7"/><circle class="f" cx="9.8" cy="14.6" r="1.7"/><circle class="f" cx="14.2" cy="14.6" r="1.7"/>',
  code: '<path d="M8 7L3 12L8 17M16 7L21 12L16 17M14 4L10 20"/>',
  shield: '<path d="M12 3L19 6V11C19 16 16 19 12 21C8 19 5 16 5 11V6Z"/>',
  flame: '<path d="M12 21C7 21 5 17.5 6 14C7 11 9.5 10 9 6C12 8 13 10 12.5 12C14 11 15 9.5 15 8C18 11 19 14 17.5 17C16.5 19.5 14.5 21 12 21Z"/>',
  snow: '<path d="M12 3V21M4.2 7.5L19.8 16.5M4.2 16.5L19.8 7.5M9.5 4.5L12 6.5L14.5 4.5M9.5 19.5L12 17.5L14.5 19.5"/>',
  bolt: '<path d="M13 2L5 13H11L10 22L19 10H13Z"/>',
  jaw: '<path d="M4 10C4 6 8 3.5 12 3.5S20 6 20 10M4 14C4 18 8 20.5 12 20.5S20 18 20 14M6.5 10L8.5 12.5L10.5 10L12.5 12.5L14.5 10L16.5 12.5L18 10.5M6.5 14L8.5 11.5L10.5 14L12.5 11.5L14.5 14L16.5 11.5L18 13.5"/>',
  ships: '<path d="M3 8L8.5 10L3 12M11 4.5L16.5 6.5L11 8.5M11 15.5L16.5 17.5L11 19.5M14.5 11L21 13L14.5 15"/>',
  swarm: '<circle cx="12" cy="6.5" r="2.6"/><circle cx="6" cy="16.5" r="2.6"/><circle cx="18" cy="16.5" r="2.6"/><path d="M10.8 8.8L7.4 14.2M13.2 8.8L16.6 14.2M8.6 16.5H15.4"/>',
  chip: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><rect x="10" y="10" width="4" height="4"/><path d="M10 7V4M14 7V4M10 20V17M14 20V17M7 10H4M7 14H4M20 10H17M20 14H17"/>',
  memory: '<rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M7 10V14M11 10V14M15 10V14M6 17V20M10 17V20M14 17V20M18 17V20"/>',
  antenna: '<path d="M12 12V21M9 21H15"/><circle cx="12" cy="10" r="2"/><path d="M8.3 6.5C6.8 8.5 6.8 11.5 8.3 13.5M15.7 6.5C17.2 8.5 17.2 11.5 15.7 13.5M5.3 4C2.8 7.5 2.8 12.5 5.3 16M18.7 4C21.2 7.5 21.2 12.5 18.7 16"/>',
  threads: '<path d="M4 6C8 4 10 8 14 6S19 5.5 20 6M4 12C8 10 10 14 14 12S19 11.5 20 12M4 18C8 16 10 20 14 18S19 17.5 20 18"/>',
  gauge: '<path d="M4 16A8 8 0 1 1 20 16"/><path d="M12 16L16 9"/><circle class="f" cx="12" cy="16" r="1.6"/>',
  layers: '<path d="M12 3.5L20.5 8L12 12.5L3.5 8ZM3.5 12L12 16.5L20.5 12M3.5 16L12 20.5L20.5 16"/>',
  stack: '<rect x="6" y="4" width="12" height="4" rx="1"/><rect x="6" y="10" width="12" height="4" rx="1"/><rect x="6" y="16" width="12" height="4" rx="1"/>',
  compress: '<path d="M4 4L10 10M10 5V10H5M20 20L14 14M14 19V14H19M20 4L14 10M19 10H14V5M4 20L10 14M5 14H10V19"/>',
  relay: '<circle cx="5" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 11L17 7M7 13L17 17"/>',
  range: '<circle class="f" cx="12" cy="12" r="1.8"/><circle cx="12" cy="12" r="5.5" stroke-dasharray="3 2"/><circle cx="12" cy="12" r="9.5" stroke-dasharray="3 3"/>',
  parallel: '<path d="M4 7H16M4 12H20M4 17H13M14 4L17 7L14 10M17 14L20 17L17 20"/>',
  sync: '<path d="M19 8A8 8 0 0 0 5 9M5 16A8 8 0 0 0 19 15M19 4V8H15M5 20V16H9"/>',
  lock: '<rect x="6" y="11" width="12" height="9" rx="1.5"/><path d="M8.5 11V8A3.5 3.5 0 0 1 15.5 8V11"/>',
};
const iconCache = {};
function iconNodes(key) {   // znaczniki ikony → elementy SVG (DOMParser, bez innerHTML)
  if (!ICONS[key]) return [];
  if (!iconCache[key]) iconCache[key] = new DOMParser().parseFromString(`<svg xmlns="${NS}">${ICONS[key]}</svg>`, 'image/svg+xml').documentElement;
  return [...iconCache[key].childNodes].map((c) => c.cloneNode(true));
}
function S(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, String(v));
  if (parent) parent.append(e);
  return e;
}
function wrap(text, max) {
  const words = String(text).split(' '), lines = []; let line = '';
  words.forEach((w) => { if ((line + ' ' + w).trim().length > max && line) { lines.push(line); line = w; } else line = (line + ' ' + w).trim(); });
  if (line) lines.push(line);
  return lines.slice(0, 3);
}
const ringR = (d) => { if (d <= 0) return 0; const i = Math.floor(d), f = d - i, r = (k) => (k < RING.length ? RING[k] : RING[RING.length - 1] + 105 * (k - RING.length + 1)); return r(i) + (r(i + 1) - r(i)) * f; };

export class PcbView {
  /** @param {HTMLElement} root  @param {object} opts  jak RadialView (radial.js) + getBackground?: () => string|null (adres obrazu tła) */
  constructor(root, opts) {
    this.root = root; this.opts = opts; this.hover = null; this.selected = null; this.marked = new Set(); this.pos = {};
    this.svg = S('svg', { class: 'pcb-svg', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet' });
    this.tip = document.createElement('div'); this.tip.className = 'pcb-tip'; this.tip.hidden = true;
    root.append(this.svg, this.tip);
    this.svg.view = this; this.canvas = this.svg;   // (laboratorium i testy: ten sam element zdarzeń co w RadialView)
    this.svg.addEventListener('pointermove', (e) => this.onMove(e));
    this.svg.addEventListener('pointerleave', () => { this.hover = null; this.tip.hidden = true; });
    this.svg.addEventListener('click', (e) => this.onClick(e));
    const loop = () => { this.check(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
    this.layout();
  }

  get tree() { return this.opts.getTree(); }
  destroy() { cancelAnimationFrame(this.raf); this.svg.remove(); this.tip.remove(); }

  place(depth, angle) {
    const a = ((90 - angle) * Math.PI) / 180, r = ringR(depth) * (this.k || 1);
    return { x: ROOT.x + Math.cos(a) * r, y: ROOT.y - Math.sin(a) * r };
  }

  svgXY(e) {
    const m = this.svg.getScreenCTM(); if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  polar(e) {
    const { x, y } = this.svgXY(e), dx = x - ROOT.x, dy = ROOT.y - y, r = Math.hypot(dx, dy);
    let depth = 0;
    for (let d = 0; d < 12; d++) { const r0 = ringR(d) * this.k, r1 = ringR(d + 1) * this.k; if (r <= r1) { depth = d + (r - r0) / (r1 - r0); break; } depth = d + 1; }
    return { depth: Math.max(0, depth), angle: Math.max(-110, Math.min(110, 90 - (Math.atan2(dy, dx) * 180) / Math.PI)) };
  }

  hasKids(id) { return this.tree.nodes.some((n) => n.parents.includes(id)); }
  radius(n) { return (n.kind === 'core' ? R.root : this.hasKids(n.id) ? R.branch : R.leaf) * (n.kind === 'core' ? 1 : this.nk); }

  nodeAt(e) {
    const { x, y } = this.svgXY(e); let best = null, bestD = Infinity;
    for (const n of this.tree.nodes) { const p = this.pos[n.id]; if (!p) continue; const d = Math.hypot(x - p.x, y - p.y); if (d <= this.radius(n) + 6 && d < bestD) { bestD = d; best = n.id; } }
    return best;
  }

  /** Położenia z drzewka i rysunek od nowa (po zmianie drzewka). */
  layout() {
    // dopasowanie: najgłębszy pierścień nie dalej niż trzeci w Space (470); węzły maleją razem z nim, nie mniej niż do 55 %
    const deep = Math.max(3, ...this.tree.nodes.map((n) => n.depth)); this.k = Math.min(1, ringR(3) / ringR(deep)); this.nk = Math.max(0.55, this.k);
    this.pos = {}; for (const n of this.tree.nodes) this.pos[n.id] = this.place(n.depth, n.angle); this.key = null; this.check(); }

  // przerysowanie, gdy zmienił się stan (poziomy, punkty, wybór, oznaczone, tło)
  check() {
    const st = this.opts.getState(); if (!st) return;
    const pts = this.opts.getPoints(), bg = this.opts.getBackground?.() || '';
    const key = JSON.stringify([st.levels, Number.isFinite(pts) ? pts : -1, this.selected, [...this.marked], bg.length, this.opts.editing?.() || false]);
    if (key !== this.key) { this.key = key; this.draw(); }
  }

  cls(n, st, pts) {
    if (n.kind === 'core') return 'root';
    const s = st.state(n.id);
    if (n.kind === 'hub') return s === 'owned' ? 'hub' : 'locked';
    if (s === 'soon') return 'soon';
    if (s === 'locked') return 'locked';
    if (s === 'owned') return 'maxed';
    return st.canBuy(n.id, pts) ? 'affordable' : st.level(n.id) > 0 ? 'owned' : 'poor';
  }

  // tło: czerń, obraz (horyzont na wysokości HORIZON_Y; własny obraz — na cały widok), gwiazdy, definicje
  background(svg) {
    const defs = S('defs', {}, svg);
    const grad = (tag, id, attrs, stops) => { const g = S(tag, { id, ...attrs }, defs); stops.forEach(([o, c]) => S('stop', { offset: o, 'stop-color': c }, g)); };
    grad('linearGradient', 'ttRimGold', { x1: 0, y1: 0, x2: 0.3, y2: 1 }, [[0, '#ffe7b0'], [0.45, '#f8bb56'], [0.7, '#9a6127'], [1, '#e9ab55']]);
    grad('linearGradient', 'ttRimSteel', { x1: 0, y1: 0, x2: 0.3, y2: 1 }, [[0, '#a8b3d8'], [0.5, '#4c5680'], [0.75, '#262c48'], [1, '#7580ad']]);
    grad('radialGradient', 'ttFace', { cx: 0.4, cy: 0.3, r: 0.8 }, [[0, '#16214f'], [0.6, '#070c24'], [1, '#02040f']]);
    // zużyta miedź: krawędzie poruszone szumem, ciemniejsze plamy utlenienia, iskierki
    const f = S('filter', { id: 'ttRough', x: '-2%', y: '-2%', width: '104%', height: '104%' }, defs);
    S('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.09, numOctaves: 2, seed: 3, result: 'n' }, f);
    S('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 2.6, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' }, f);
    S('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.18, numOctaves: 3, seed: 11, result: 'n2' }, f);
    S('feColorMatrix', { in: 'n2', type: 'matrix', values: '0 0 0 0 0.06  0 0 0 0 0.03  0 0 0 0 0.01  1.9 0 0 0 -0.78', result: 'spots' }, f);
    S('feComposite', { in: 'spots', in2: 'd', operator: 'in', result: 'spotsIn' }, f);
    S('feTurbulence', { type: 'fractalNoise', baseFrequency: 1.1, numOctaves: 1, seed: 5, result: 'grain' }, f);
    S('feColorMatrix', { in: 'grain', type: 'matrix', values: '0 0 0 0 1  0 0 0 0 0.85  0 0 0 0 0.6  1.2 0 0 0 -0.82', result: 'glints' }, f);
    S('feComposite', { in: 'glints', in2: 'd', operator: 'in', result: 'glintsIn' }, f);
    const m = S('feMerge', {}, f); ['d', 'spotsIn', 'glintsIn'].forEach((x) => S('feMergeNode', { in: x }, m));
    S('rect', { width: W, height: H, fill: '#080b1a' }, svg);
    const own = this.opts.getBackground?.();
    if (own) S('image', { href: own, x: 0, y: 0, width: W, height: H, preserveAspectRatio: 'xMidYMid slice' }, svg);
    else { const sc = W / BG.w, h = BG.h * sc; S('image', { href: BG.href, x: 0, y: HORIZON_Y - BG.horizon * sc, width: W, height: h, preserveAspectRatio: 'none' }, svg); }
    // gwiazdy z ziarnem, te same za każdym razem (część migocze)
    let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 70; i++) {
      const x = rnd() * W, y = rnd() * (HORIZON_Y - 10), r = rnd() < 0.1 ? 1.4 : 0.8, o = 0.25 + rnd() * 0.6;
      const c = S('circle', { cx: x.toFixed(0), cy: y.toFixed(0), r, fill: '#dfe6ff', opacity: o.toFixed(2) }, svg);
      if (rnd() < 0.25) { c.classList.add('tw'); c.style.animationDelay = `${(rnd() * 4).toFixed(1)}s`; }
    }
  }

  // jedna ścieżka miedzi: ciemna krawędź, miedź, odblask (filtr zużycia) i świecący rdzeń na wierzchu
  trace(metal, core, d, cls = '') {
    for (const k of ['tr-edge', 'tr-base', 'tr-hi']) S('path', { class: `${k} ${cls}`.trim(), d }, metal);
    S('path', { class: `tr-core ${cls}`.trim(), d }, core);
  }

  // pień: wiązka ścieżek od horyzontu do rdzenia, rozchodząca się korzeniami po powierzchni
  trunk(metal, core, root) {
    if (!root) return;
    const R0 = this.pos[root.id];
    [-2, -1, 0, 1, 2].forEach((o, i) => {
      const x0 = R0.x + o * 11, xb = R0.x + o * 20;
      this.trace(metal, core, `M${x0} ${R0.y + R.root - 4} L${x0} ${HORIZON_Y - 40} L${xb} ${HORIZON_Y - 10} L${xb} ${HORIZON_Y + 6}`);
      const dir = o === 0 ? (i % 2 ? 1 : -1) : Math.sign(o), len = 60 + Math.abs(o) * 35;
      this.trace(metal, core, `M${xb} ${HORIZON_Y + 6} L${xb + dir * len} ${HORIZON_Y + 6 + len * 0.18} L${xb + dir * (len + 40)} ${HORIZON_Y + 6 + len * 0.18}`, 'root');
    });
    S('path', { class: 'pulse up', d: `M${R0.x} ${HORIZON_Y + 6} L${R0.x} ${R0.y + R.root}` }, core);
  }

  // droga jak na płytce: prosto wzdłuż dłuższej osi, potem 45°
  route(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, ax = Math.abs(dx), ay = Math.abs(dy);
    const [mx, my] = ay > ax ? [a.x, a.y + Math.sign(dy) * (ay - ax)] : [a.x + Math.sign(dx) * (ax - ay), a.y];
    return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${mx.toFixed(1)} ${my.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }

  icon(g, key, x, y, size) {
    const nodes = iconNodes(key); if (!nodes.length) return;
    const s = size / 24, ic = S('g', { class: 'ic', transform: `translate(${(x - size / 2).toFixed(1)} ${(y - size / 2).toFixed(1)}) scale(${s.toFixed(3)})` }, g);
    ic.append(...nodes);
  }

  draw() {
    const tree = this.tree, st = this.opts.getState(), pts = this.opts.getPoints(), pl = !!this.opts.pl?.();
    const svg = this.svg; svg.replaceChildren();
    this.background(svg);
    const metal = S('g', { filter: 'url(#ttRough)' }, svg), core = S('g', {}, svg);
    this.trunk(metal, core, tree.nodes.find((n) => n.kind === 'core'));
    const byId = st.byId, cls = {};
    for (const n of tree.nodes) cls[n.id] = this.cls(n, st, pts);
    for (const n of tree.nodes) for (const pid of n.parents) {
      const a = this.pos[pid], b = this.pos[n.id]; if (!a || !b || !byId[pid]) continue;
      const c = cls[n.id], d = this.route(a, b), dim = c === 'soon' || c === 'locked';
      this.trace(metal, core, d, dim ? 'dim' : '');
      if (!dim && c !== 'poor') { const p = S('path', { class: 'pulse', d }, core); p.style.animationDelay = `${(-(((90 - n.angle) % 7 + 7) % 7) * 0.4).toFixed(2)}s`; }
    }
    // węzły od końca (rdzeń na wierzchu, jak w Space)
    const pts2 = this.opts.pointsName?.() || (pl ? 'pkt' : 'pts');
    for (const n of [...tree.nodes].reverse()) {
      const p = this.pos[n.id], c = cls[n.id], r = n.kind === 'core' ? R.root : this.hasKids(n.id) ? R.branch : R.leaf, kids = this.hasKids(n.id), x = p.x, y = p.y;
      const g0 = S('g', { transform: n.kind === 'core' || this.nk === 1 ? null : `translate(${x} ${y}) scale(${this.nk.toFixed(3)}) translate(${-x} ${-y})` }, svg);
      const g = S('g', { class: `tt-node ${c}${kids && n.kind !== 'core' ? ' branch' : ''}${this.selected === n.id ? ' sel' : ''}${this.marked.has(n.id) ? ' marked' : ''}`, 'data-id': n.id }, g0);
      S('circle', { class: 'halo', cx: x, cy: y, r: r + 10 }, g);
      S('circle', { class: 'rim', cx: x, cy: y, r, fill: 'url(#ttFace)', stroke: c === 'soon' || c === 'locked' ? 'url(#ttRimSteel)' : 'url(#ttRimGold)', 'stroke-width': 5 }, g);
      S('circle', { class: 'inner', cx: x, cy: y, r: r - 6 }, g);
      [45, 135, 225, 315].forEach((a) => { const rad = (a * Math.PI) / 180; S('circle', { class: 'rivet', cx: (x + Math.cos(rad) * r).toFixed(1), cy: (y + Math.sin(rad) * r).toFixed(1), r: 1.7 }, g); });
      const buyable = n.kind !== 'core' && n.kind !== 'hub', lvl = st.level(n.id), name = nodeName(n, pl);
      if (buyable && !n.soon) {   // poziom jako pierścień wokół obręczy
        const circ = 2 * Math.PI * (r + 6);
        S('circle', { class: 'ring-bg', cx: x, cy: y, r: r + 6 }, g);
        S('circle', { class: 'ring', cx: x, cy: y, r: r + 6, 'stroke-dasharray': `${(circ * lvl / n.levels).toFixed(1)} ${circ.toFixed(1)}`, transform: `rotate(-90 ${x} ${y})` }, g);
      }
      if (this.selected === n.id) S('circle', { class: 'selring', cx: x, cy: y, r: r + 15 }, g);
      if (this.marked.has(n.id)) S('circle', { class: 'markring', cx: x, cy: y, r: r + 19 }, g);
      if (n.kind === 'core') {
        S('circle', { class: 'spin', cx: x, cy: y, r: r + 12 }, g);
        this.icon(g, n.icon, x, y - 10, 34);
        const t = S('text', { class: 'lbl-in root', x, y: y + 24 }, g); t.textContent = name;
        t.style.fontSize = `${Math.min(17, 150 / Math.max(1, name.length)).toFixed(1)}px`;   // długa nazwa — mniejsza czcionka
      } else if (kids) {
        this.icon(g, n.icon, x, y - 13, 20);
        wrap(name, 12).forEach((line, k, arr) => { const t = S('text', { class: 'lbl-in', x, y: y + 8 + (k - (arr.length - 1) / 2) * 13 + (arr.length > 1 ? 4 : 0) }, g); t.textContent = line; });
      } else {
        this.icon(g, n.icon, x, y - (buyable && n.levels > 1 ? 6 : 0), 26);
        if (buyable && n.levels > 1) { const t = S('text', { class: 'lvl', x, y: y + 20 }, g); t.textContent = `${lvl}/${n.levels}`; }
        wrap(name, 16).forEach((line, k) => { const t = S('text', { class: 'lbl', x, y: y + r + 22 + k * 14 }, g); t.textContent = line; });
      }
      if (buyable && !n.soon) {   // koszt następnego poziomu (albo MAX) w pigułce pod węzłem
        const lines = kids ? 0 : wrap(name, 16).length, cost = st.costOf(n.id);
        const txt = cost === null ? 'MAX' : `${cost.toLocaleString(pl ? 'pl' : 'en')} ${pts2}`;
        const ty = y + r + 22 + lines * 14 + 4, w = 12 + txt.length * 6.6;
        S('rect', { class: 'cost-bg', x: x - w / 2, y: ty - 12, width: w, height: 17, rx: 8.5 }, g);
        const t = S('text', { class: 'cost', x, y: ty + 1 }, g); t.textContent = txt;
      }
      if (c === 'soon' || c === 'locked') this.icon(g, 'lock', x + r * 0.72, y - r * 0.72, 16);
    }
  }

  onMove(e) {
    this.hover = this.nodeAt(e);
    if (!this.hover) { this.tip.hidden = true; return; }
    this.showTip(this.hover);
  }

  onClick(e) {
    const id = this.nodeAt(e);
    if (this.opts.onPick) { this.opts.onPick(id, e); return; }
    if (!id) return;
    if (this.opts.getState().canBuy(id, this.opts.getPoints())) this.opts.onBuy?.(id);
    setTimeout(() => this.showTip(id), 50);
  }

  showTip(id) {
    const st = this.opts.getState(), n = st.byId[id]; if (!n) return;
    const pl = !!this.opts.pl?.(), T = (en, p) => (pl ? p : en), pts = this.opts.pointsName?.() || T('pts', 'pkt'), points = this.opts.getPoints();
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; e.textContent = text; return e; };
    const kids = [el('b', '', nodeName(n, pl))], text = nodeText(n, pl);
    if (text) kids.push(el('p', '', text));
    const s = st.state(id), buyable = n.kind !== 'core' && n.kind !== 'hub';
    if (this.opts.editing?.()) kids.push(el('p', 'k', `${T('level', 'poziom')} ${n.depth} · ${T('angle', 'kąt')} ${n.angle}° · ${(KINDS[n.kind] || {})[pl ? 'labelPl' : 'label'] || n.kind}${n.note ? ` — ${n.note}` : ''}`));
    else if (s === 'soon') kids.push(el('p', 's', T('Coming in a future update.', 'Pojawi się w przyszłej aktualizacji.')));
    else if (s === 'locked') kids.push(el('p', 's', T(`Locked — first ${n.parents.map((p) => nodeName(st.byId[p] || { name: p }, pl)).join(n.all ? ' and ' : ' or ')}`, `Zablokowane — najpierw ${n.parents.map((p) => nodeName(st.byId[p] || { name: p }, pl)).join(n.all ? ' i ' : ' albo ')}`)));
    else if (buyable) {
      if (n.levels > 1) kids.push(el('p', 'k', T(`level ${st.level(id)} / ${n.levels}`, `poziom ${st.level(id)} / ${n.levels}`)));
      const cost = st.costOf(id);
      kids.push(el('p', 'c', cost === null ? 'MAX' : `${cost.toLocaleString(pl ? 'pl' : 'en')} ${pts} — ${points >= cost ? T('click to buy', 'kliknij, aby kupić') : T('not enough points', 'za mało punktów')}`));
    }
    if (Object.keys(n.effect).length && buyable) kids.push(el('p', 'k', Object.entries(n.effect).map(([k, v]) => (v === true ? k : `${k} ${v > 0 ? '+' : ''}${v}`)).join(' · ')));
    this.tip.replaceChildren(...kids); this.tip.hidden = false;
    // nad węzłem: punkt SVG → piksele elementu widoku
    const m = this.svg.getScreenCTM(), box = this.root.getBoundingClientRect(), p = this.pos[id];
    if (!m) return;
    const q = new DOMPoint(p.x, p.y).matrixTransform(m);
    this.tip.style.left = `${q.x - box.left}px`; this.tip.style.top = `${q.y - box.top}px`;
  }
}
