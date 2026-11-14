// Widok promienisty drzewka w pixel arcie — z Hive Hunger (js/ui/TreeView.js), dla dowolnego drzewka 'gamelab-tree'
// (tree.js). Siatka „pikseli sztuki” (P pikseli ekranu każdy): ikony i numery poziomów blokowe, linie (połączenia,
// pierścienie, obrysy) cienkie na jeden piksel ekranu. Drzewko rośnie w górę od rdzenia na dole; pierścienie za nim
// to głębokość. Kształt po rodzaju węzła (KINDS w tree.js): romb (rdzeń, cecha), sześciokąt (jednostka), kółko
// (cecha jednostki). Kupione — w kolorze gałęzi, do kupienia mrugają, zablokowane szare; najechanie pokazuje opis
// i rozświetla połączenia, kliknięcie kupuje (albo, gdy podano onPick, oddaje węzeł stronie — np. edytor).
// Rozmiar z elementu `root` (nie z okna). Style tylko przez CSSOM; wygląd podpowiedzi: klasy .tree-tip*.
import { KINDS, nodeName, nodeText, branchName, nodeColor } from './tree.js';

// ikony 8 × 8 (nazwa w polu „icon” węzła)
export const ICONS = {
  core: ['..####..', '.#....#.', '#..##..#', '#.#..#.#', '#.#..#.#', '#..##..#', '.#....#.', '..####..'],
  units: ['........', '.#....#.', '###..###', '.#....#.', '........', '...#....', '..###...', '...#....'],
  speed: ['........', '#...#...', '.#...#..', '..#...#.', '..#...#.', '.#...#..', '#...#...', '........'],
  power: ['#......#', '.#....#.', '..####..', '.######.', '.######.', '..####..', '.#....#.', '#......#'],
  bolt: ['....###.', '...###..', '..###...', '.######.', '...###..', '..###...', '.##.....', '#.......'],
  arcs: ['........', '#.......', '.#...#..', '..#.#.#.', '...#...#', '........', '.#.#.#.#', '........'],
  volt: ['..####..', '.#....#.', '.#.##.#.', '.#.##.#.', '.#....#.', '.#.##.#.', '.#....#.', '.######.'],
  cap: ['..####..', '.#....#.', '#..#...#', '#..#...#', '#..###.#', '#......#', '.#....#.', '..####..'],
};
const DIGITS = [
  ['###', '#.#', '#.#', '#.#', '###'], ['.#.', '##.', '.#.', '.#.', '###'], ['###', '..#', '###', '#..', '###'],
  ['###', '..#', '.##', '..#', '###'], ['#.#', '#.#', '###', '..#', '..#'], ['###', '#..', '###', '..#', '###'],
  ['###', '#..', '###', '#.#', '###'], ['###', '..#', '..#', '..#', '..#'], ['###', '#.#', '###', '#.#', '###'],
];
const BG = [13, 8, 24], RING = [42, 29, 69], LOCKED = [70, 60, 96], DARK = [20, 12, 34];
const SQ = 0.82, R0 = 0.45;   // kąty ściśnięte (najszersze gałęzie nad linią rdzenia); pierwszy pierścień z dala od rdzenia
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export class RadialView {
  /**
   * @param {HTMLElement} root  element widoku (rozmiar widoku = jego rozmiar)
   * @param {{ getTree: () => object, getState: () => import('./tree.js').TreeState, getPoints: () => number,
   *   onBuy?: (id: string) => void, onPick?: (id: string|null, e: PointerEvent) => void, pl?: () => boolean,
   *   pointsName?: () => string, editing?: () => boolean }} opts  editing: podpowiedź pokazuje poziom i kąt zamiast stanu
   */
  constructor(root, opts) {
    this.root = root; this.opts = opts; this.hover = null; this.selected = null; this.marked = new Set(); this.t = 0;
    this.canvas = document.createElement('canvas'); this.canvas.className = 'tree-canvas';
    this.ctx = this.canvas.getContext('2d');
    this.tip = document.createElement('div'); this.tip.className = 'tree-tip'; this.tip.hidden = true;
    root.append(this.canvas, this.tip);
    this.canvas.view = this;   // (testy: położenia węzłów, rozświetlone połączenia)
    this.canvas.addEventListener('pointermove', (e) => this.onMove(e));
    this.canvas.addEventListener('pointerleave', () => { this.hover = null; this.tip.hidden = true; });
    this.canvas.addEventListener('click', (e) => this.onClick(e));
    new ResizeObserver(() => this.layout()).observe(root);
    const loop = () => { this.t++; this.draw(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  get tree() { return this.opts.getTree(); }

  /** Płótno w pikselach sztuki i położenia węzłów; wołać po zmianie drzewka (głębokość, kąt, nowe węzły). */
  layout() {
    const w = Math.max(64, this.root.clientWidth), h = Math.max(64, this.root.clientHeight);
    const P = w < 640 ? 2 : 3; this.P = P;
    const W = Math.ceil(w / P), H = Math.ceil(h / P);
    this.canvas.width = W * P; this.canvas.height = H * P;
    this.canvas.style.width = `${W * P}px`; this.canvas.style.height = `${H * P}px`;   // 1 : 1 z ekranem (bez rozmycia)
    this.W = W; this.H = H;
    const cx = W >> 1, cy = H - 20, nodes = this.tree.nodes;
    this.maxDepth = Math.max(5, Math.ceil(Math.max(0, ...nodes.map((n) => n.depth))));
    const maxSin = Math.max(1, ...nodes.map((n) => Math.abs(Math.sin((n.angle * SQ * Math.PI) / 180)) * (n.depth + R0)));
    this.ring = Math.max(12, Math.min((cy - 44) / (this.maxDepth + R0), (W / 2 - 22) / maxSin));
    this.radius = (d) => (d <= 0 ? 0 : (d + R0) * this.ring);
    this.cx = cx; this.cy = cy; this.pos = {};
    for (const n of nodes) this.pos[n.id] = this.place(n.depth, n.angle);
  }

  /** Piksel sztuki dla głębokości i kąta. */
  place(depth, angle) {
    const a = (angle * SQ * Math.PI) / 180, r = this.radius(depth);
    return { x: Math.round(this.cx + r * Math.sin(a)), y: Math.round(this.cy - r * Math.cos(a)) };
  }

  /** Odwrotnie: punkt ekranu → { depth, angle } (edytor: dodawanie i przesuwanie węzłów). */
  polar(e) {
    const { x, y } = this.artXY(e), dx = x - this.cx, dy = this.cy - y, r = Math.hypot(dx, dy);
    const depth = r < this.ring * (1 + R0) * 0.5 ? 0 : r / this.ring - R0;
    return { depth: Math.max(0, depth), angle: Math.max(-110, Math.min(110, (Math.atan2(dx, dy) * 180) / Math.PI / SQ)) };
  }

  artXY(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * this.W, y: ((e.clientY - rect.top) / rect.height) * this.H };
  }

  /** Rozmiar po rodzaju: rdzeń, jednostka (sześciokąt) większa, cecha (romb; z ikoną większa), cecha jednostki (kółko). */
  size(n) { return { core: 11, unit: 8, trait: n.icon ? 7 : 5, prop: 3 }[n.kind] ?? 4; }

  // --- pomocnicze (piksele sztuki na wejściu, piksele ekranu na wyjściu) ---
  sx(x) { return Math.round(x * this.P + this.P / 2) + 0.5; }
  px(x, y, c) { this.ctx.fillStyle = c; this.ctx.fillRect(x * this.P, y * this.P, this.P, this.P); }
  line(x0, y0, x1, y1, c, w = 1, dashed = false) {
    const ctx = this.ctx; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.setLineDash(dashed ? [this.P * 2, this.P * 2] : []);
    ctx.beginPath(); ctx.moveTo(this.sx(x0), this.sx(y0)); ctx.lineTo(this.sx(x1), this.sx(y1)); ctx.stroke(); ctx.setLineDash([]);
  }
  shape(pts, fill, outline, glow) {
    const ctx = this.ctx, path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
    if (glow) { path(); ctx.strokeStyle = glow; ctx.lineWidth = this.P * 2.5; ctx.stroke(); }
    path(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = 1; ctx.stroke();
  }
  poly(x, y, r, k, a0, fill, outline, glow) {
    const X = this.sx(x), Y = this.sx(y), R = r * this.P, pts = [];
    for (let i = 0; i < k; i++) { const a = a0 + (Math.PI * 2 * i) / k; pts.push([X + R * Math.cos(a), Y + R * Math.sin(a)]); }
    this.shape(pts, fill, outline, glow);
  }
  node(n, x, y, r, fill, outline, glow) {
    const shape = (KINDS[n.kind] || KINDS.trait).shape;
    if (shape === 'hexagon') { this.poly(x, y, r, 6, -Math.PI / 2, fill, outline, glow); this.poly(x, y, 3, 6, -Math.PI / 2, outline, outline, null); }
    else if (shape === 'circle') this.poly(x, y, r, 24, 0, fill, outline, glow);
    else this.poly(x, y, r, 4, -Math.PI / 2, fill, outline, glow);
  }
  digit(d, x, y, c) { const rows = DIGITS[d]; if (rows) for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (rows[j][i] === '#') this.px(x + i, y + j, c); }
  icon(name, x, y, c) { const rows = ICONS[name]; if (rows) for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) if (rows[j][i] === '#') this.px(x - 4 + i, y - 4 + j, c); }

  // --- rysowanie ---
  draw() {
    const tree = this.tree, state = this.opts.getState(); if (!tree || !state || !this.pos) return;
    const points = this.opts.getPoints(), { ctx, W, H, cx, cy } = this, byId = state.byId;
    const coreC = hex(nodeColor(tree, tree.nodes.find((n) => n.kind === 'core') || tree.nodes[0]));
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); ctx.fillStyle = rgb(BG, 0.94); ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // pierścienie poziomów (łuki) za drzewkiem, ponumerowane po lewej
    for (let d = 1; d <= this.maxDepth; d++) {
      const r = this.radius(d);
      ctx.strokeStyle = rgb(RING, d % 2 ? 0.9 : 0.55); ctx.lineWidth = 1; ctx.beginPath();
      ctx.arc(this.sx(cx), this.sx(cy), r * this.P, -Math.PI / 2 - (80 * Math.PI) / 180, -Math.PI / 2 + (80 * Math.PI) / 180); ctx.stroke();
      const t = -Math.min((80 * Math.PI) / 180, Math.asin(Math.min(1, (cx - 10) / r)));
      this.digit(d, Math.round(cx + r * Math.sin(t)) - 5, Math.round(cy - r * Math.cos(t)) - 2, rgb(coreC, 0.8));
    }
    this.digit(0, cx - 20, cy - 2, rgb(coreC, 0.8));
    // migający pył
    for (let i = 0; i < 70; i++) {
      const x = (i * 97 + 13) % W, y = (i * 53 + 7) % H;
      if ((i + (this.t >> 4)) % 5 === 0) { ctx.fillStyle = rgb([120, 100, 180], 0.6); ctx.fillRect(x * this.P, y * this.P, 1, 1); }
    }
    // połączenia: kupione w kolorze gałęzi, do kupienia przygaszone, zablokowane szare; między gałęziami jaśniejsze —
    // przerywane, gdy wystarczy którykolwiek rodzic, ciągłe, gdy potrzeba wszystkich; połączenia węzła pod kursorem
    // (i wybranego) rozświetlone, na wierzchu
    const lit = [];
    for (const n of tree.nodes) for (const pid of n.parents) {
      const a = this.pos[pid], b = this.pos[n.id], p = byId[pid]; if (!a || !b || !p) continue;
      const col = hex(nodeColor(tree, n)), st = state.state(n.id);
      const cross = p.branch !== n.branch && p.kind !== 'core' && n.kind !== 'prop', dashed = cross && !n.all;
      const focus = [this.hover, this.selected];
      if (focus.includes(n.id) || focus.includes(pid)) { lit.push([a, b, col, dashed]); continue; }
      const base = st === 'owned' ? col : st === 'available' ? mix(col, BG, 0.55) : st === 'soon' ? mix(col, BG, 0.72) : LOCKED;
      this.line(a.x, a.y, b.x, b.y, cross ? rgb(mix(base, [255, 255, 255], 0.35), 0.75) : rgb(base, st === 'locked' ? 0.6 : 1), 1, dashed);
    }
    for (const [a, b, col, dashed] of lit) { this.line(a.x, a.y, b.x, b.y, rgb(col, 0.35), 4); this.line(a.x, a.y, b.x, b.y, rgb(mix(col, [255, 255, 255], 0.6)), 2, dashed); }
    this.litLinks = lit.length;
    // węzły
    const blink = (this.t >> 4) % 2 === 0;
    for (const n of tree.nodes) {
      const { x, y } = this.pos[n.id], col = hex(nodeColor(tree, n)), st = state.state(n.id), r = this.size(n);
      let fill, outline, glow = null, iconC;
      if (st === 'owned') { fill = rgb(col); outline = rgb(mix(col, [255, 255, 255], 0.55)); glow = rgb(col, 0.35); iconC = rgb(DARK); }
      else if (st === 'available') {
        const ok = points >= n.cost; fill = rgb(mix(DARK, col, 0.18)); outline = rgb(ok && blink ? mix(col, [255, 255, 255], 0.4) : col);
        glow = ok ? rgb(col, blink ? 0.45 : 0.2) : null; iconC = rgb(col);
      } else if (st === 'soon') { fill = rgb(mix(DARK, col, 0.12)); outline = rgb(mix(col, BG, 0.45)); iconC = rgb(mix(col, BG, 0.45)); }
      else { fill = rgb(DARK); outline = rgb(LOCKED); iconC = rgb(LOCKED); }
      if (this.marked.has(n.id)) this.poly(x, y, r + 4, 24, 0, 'rgba(0,0,0,0)', rgb([255, 96, 80], blink ? 1 : 0.5), null);
      if (this.selected === n.id) this.poly(x, y, r + 3, 24, 0, 'rgba(0,0,0,0)', rgb([255, 255, 255]), rgb([255, 255, 255], 0.25));
      if (this.hover === n.id) outline = rgb([255, 255, 255]);
      this.node(n, x, y, r, fill, outline, glow);
      if (n.icon) this.icon(n.icon, x, y, iconC);
    }
  }

  // --- wejście ---
  nodeAt(e) {
    const { x, y } = this.artXY(e); let best = null, bestD = Infinity;
    for (const n of this.tree.nodes) {
      const p = this.pos[n.id]; if (!p) continue;
      const round = (KINDS[n.kind] || KINDS.trait).shape !== 'diamond';
      const d = round ? Math.hypot(x - p.x, y - p.y) : Math.abs(x - p.x) + Math.abs(y - p.y);
      if (d <= this.size(n) + 3 && d < bestD) { bestD = d; best = n.id; }
    }
    return best;
  }

  onMove(e) {
    this.hover = this.nodeAt(e);
    if (!this.hover) { this.tip.hidden = true; return; }
    this.showTip(this.hover, e.clientX, e.clientY);
  }

  onClick(e) {
    const id = this.nodeAt(e);
    if (this.opts.onPick) { this.opts.onPick(id, e); return; }
    if (!id) return;
    if (this.opts.getState().canBuy(id, this.opts.getPoints())) this.opts.onBuy?.(id);
    setTimeout(() => this.showTip(id, e.clientX, e.clientY), 50);
  }

  showTip(id, x, y) {
    const tree = this.tree, state = this.opts.getState(), n = state.byId[id]; if (!n) return;
    const pl = !!this.opts.pl?.(), T = (en, p) => (pl ? p : en), pts = this.opts.pointsName?.() || T('points', 'punkty');
    const points = this.opts.getPoints(), st = state.state(id), names = (ids) => ids.map((p) => (state.byId[p] ? nodeName(state.byId[p], pl) : p));
    const status = this.opts.editing?.() ? `${T('level', 'poziom')} ${n.depth} · ${T('angle', 'kąt')} ${n.angle}°${n.soon ? T(' · soon', ' · wkrótce') : ''}${n.note ? ` — ${n.note}` : ''}`
      : n.kind === 'core' ? '' : st === 'owned' ? T('Owned', 'Kupione') : st === 'soon' ? T('Coming soon', 'Wkrótce')
      : st === 'locked' ? T(`Locked — buy ${names(n.parents).join(n.all ? ' and ' : ' or ')} first`, `Zablokowane — najpierw kup ${names(n.parents).join(n.all ? ' i ' : ' albo ')}`)
      : points >= n.cost ? T('Click to buy', 'Kliknij, żeby kupić') : T(`Need ${(n.cost - points).toLocaleString('en')} more ${pts}`, `Brakuje ${(n.cost - points).toLocaleString('pl')} (${pts})`);
    const div = (cls, text) => { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = text; return d; };
    const head = div('tree-tip-head', ''), name = document.createElement('span'), cost = document.createElement('span');
    name.textContent = nodeName(n, pl); name.style.color = nodeColor(tree, n);
    cost.className = 'tree-tip-cost'; cost.textContent = n.cost ? `${n.cost.toLocaleString(pl ? 'pl' : 'en')} ${pts}` : '';
    head.append(name, cost);
    const br = tree.branches[n.branch], kids = [head, div('tree-tip-branch', branchName(br, pl)), div('', nodeText(n, pl))];
    if (Object.keys(n.effect).length) kids.push(div('tree-tip-effect', Object.entries(n.effect).map(([k, v]) => (v === true ? k : `${k} ${v > 0 ? '+' : ''}${v}`)).join(' · ')));
    kids.push(div(`tree-tip-status is-${st}`, status));
    this.tip.replaceChildren(...kids); this.tip.hidden = false;
    const box = this.root.getBoundingClientRect(), w = this.tip.offsetWidth, h = this.tip.offsetHeight;
    this.tip.style.left = `${Math.max(4, Math.min(box.width - w - 8, x - box.left + 14))}px`;
    this.tip.style.top = `${Math.max(4, Math.min(box.height - h - 8, y - box.top - h - 10))}px`;
  }
}
