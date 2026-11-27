// Obwód elektryczny (środowisko ląd — tryb „Fizyka” laboratorium mechaniki). Lista połączeń jak na schemacie:
// zaciski urządzeń („Q1:2”, „K1:A1”), żyły przewodów (zawsze zamknięte, rezystancja z długości i przekroju), styki
// (zamknięte / otwarte — stan z modelu: przycisk, grzybek, wyłącznik, stycznik), źródła (fazory napięć zacisków)
// i odbiorniki (cewka, lampka, falownik — napięcie znamionowe, moc).
//
// Rozwiązanie co klatkę:
//   1. sieci (węzły elektryczne) — zaciski połączone zamkniętymi połączeniami (union-find);
//   2. napięcie sieci — fazor źródła, do którego jest podłączona, albo brak (sieć bez napięcia); dwa różne fazory
//      w jednej sieci = zwarcie (wynik `shorts`, napięcia tych sieci — brak: zabezpieczenie wyłącza);
//   3. odbiornik dwuzaciskowy: U = |V_a − V_b|; trójfazowy: najmniejsze z napięć międzyprzewodowych.
// Prądy liczy właściciel obwodu z mocy odbiorników (falownik z mocy mechanicznej silnika), spadki — z rezystancji żył.
//
//   const c = createCircuit();
//   c.source('X0', { L1: [230, 0], L2: [230, -120], …, N: [0, 0] }, () => włączone)   // fazor [moduł V, kąt °]
//   c.wire('X0:L1', 'Q1:1', { R, name })        // żyła
//   c.contact('Q1:1', 'Q1:2', () => zamknięty, 'Q1')
//   c.load('K1', ['K1:A1', 'K1:A2'], { Un: 230 })
//   const r = c.solve() → { V(term) → [re, im] | null, U(nazwa odbiornika) → V, net(term), shorts, nets }

export function createCircuit() {
  const idx = new Map(), names = [];
  const T = (n) => { if (!idx.has(n)) { idx.set(n, names.length); names.push(n); } return idx.get(n); };
  const links = [], sources = [], loads = new Map();
  const ph = ([m, deg]) => [m * Math.cos(deg * Math.PI / 180), m * Math.sin(deg * Math.PI / 180)];
  const api = {
    source(name, terms, on = () => true) { sources.push({ name, on, terms: Object.entries(terms).map(([t, v]) => ({ t: T(`${name}:${t}`), v: ph(v) })) }); return api; },
    wire(a, b, { R = 0, name = '' } = {}) { links.push({ a: T(a), b: T(b), R, name, closed: null, kind: 'wire' }); return api; },
    contact(a, b, closed, name = '') { links.push({ a: T(a), b: T(b), R: 0, name, closed, kind: 'contact' }); return api; },
    load(name, terms, opts = {}) { loads.set(name, { name, t: terms.map(T), ...opts }); return api; },
    get terms() { return names.slice(); },
    solve,
  };
  function solve() {
    const n = names.length, par = Int32Array.from({ length: n }, (_, i) => i);
    const find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    for (const l of links) if (!l.closed || l.closed()) { const a = find(l.a), b = find(l.b); if (a !== b) par[a] = b; }
    const netV = new Map(), shorts = [];
    for (const s of sources) {
      if (!s.on()) continue;
      for (const { t, v } of s.terms) {
        const r = find(t), cur = netV.get(r);
        if (cur === undefined) netV.set(r, v);
        else if (cur && Math.hypot(cur[0] - v[0], cur[1] - v[1]) > 1e-6) { shorts.push(`${names[t]} (${s.name})`); netV.set(r, null); }
      }
    }
    const V = (term) => { const i = idx.get(term); if (i === undefined) return null; const v = netV.get(find(i)); return v || null; };
    const dU = (a, b) => { const va = netV.get(find(a)), vb = netV.get(find(b)); return va && vb ? Math.hypot(va[0] - vb[0], va[1] - vb[1]) : 0; };
    const U = (name) => {
      const l = loads.get(name); if (!l) return 0;
      if (l.t.length === 2) return dU(l.t[0], l.t[1]);
      return Math.min(dU(l.t[0], l.t[1]), dU(l.t[1], l.t[2]), dU(l.t[2], l.t[0]));   // trójfazowy: najsłabsze napięcie międzyprzewodowe
    };
    return { V, U, shorts, net: (term) => (idx.has(term) ? find(idx.get(term)) : -1), nets: new Set(Array.from({ length: n }, (_, i) => find(i))).size, links };
  }
  return api;
}
