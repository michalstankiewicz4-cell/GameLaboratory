// Sieć hydrauliczna z węzłami o pojemności (ściśliwość oleju i podatność przewodów): ciśnienie węzła rośnie z sumą
// dopływów, dp/dt = K_ef / V · ΣQ. Elementy między węzłami podają przepływ Q(pa, pb). Krok niejawny (Euler wstecz) liczony
// węzeł po węźle (Gauss–Seidel, w węźle bisekcja na monotonicznej funkcji) — stabilny także dla małych objętości i otworów
// (sztywne równania), bez warunków logicznych zamiast przepływów.
//   net = createHydraulicNet({ K })
//   net.node('P', { V, tank? })                       — zbiornik (tank: true) trzyma ciśnienie stałe (0 = atmosfera)
//   net.link('nazwa', 'a', 'b', (pa, pb) => Q)          — przepływ z a do b (m³/s), musi rosnąć z pa i maleć z pb
//   net.source('P', (p) => Q)                           — dopływ zależny od ciśnienia węzła (pompa: maleje z p — przecieki)
//   net.flowIn('A', () => q)                            — dopływ narzucony (np. −A·v komory siłownika)
//   net.step(h) → stan: net.p[nazwa], net.q[link]
import { BAR } from './fluid.js';
export const ENV = ['land', 'water'];

export function createHydraulicNet({ K = 1.0e9, pmax = 400 * BAR } = {}) {
  const nodes = {}, links = [], sources = [], fixed = [], p = {}, q = {};
  const net = {
    p, q, nodes,
    node(name, { V = 1e-4, tank = false, p0 = 0 } = {}) { nodes[name] = { name, V, tank, links: [], src: [], fix: [] }; p[name] = p0; return net; },
    setV(name, V) { nodes[name].V = Math.max(1e-7, V); },
    link(name, a, b, fn) { const l = { name, a, b, fn }; links.push(l); nodes[a].links.push(l); nodes[b].links.push(l); q[name] = 0; return net; },
    source(n, fn) { const s = { n, fn }; sources.push(s); nodes[n].src.push(s); return net; },
    flowIn(n, fn) { const s = { n, fn }; fixed.push(s); nodes[n].fix.push(s); return net; },
    // dopływ do węzła przy ciśnieniu x (pozostałe węzły — bieżące wartości)
    inflow(nd, x) {
      let s = 0;
      for (const l of nd.links) s += l.a === nd.name ? -l.fn(x, p[l.b]) : l.fn(p[l.a], x);
      for (const o of nd.src) s += o.fn(x);
      for (const o of nd.fix) s += o.fn();
      return s;
    },
    step(h, sweeps = 4) {
      const old = { ...p };
      for (let k = 0; k < sweeps; k++) {
        for (const nd of Object.values(nodes)) {
          if (nd.tank) continue;
          const C = nd.V / K, f = (x) => C * (x - old[nd.name]) / h - net.inflow(nd, x);   // rośnie z x
          let lo = -0.9 * BAR, hi = pmax;                                                    // kawitacja: najniżej ok. −0,9 bar (próżnia)
          if (f(lo) >= 0) { p[nd.name] = lo; continue; } if (f(hi) <= 0) { p[nd.name] = hi; continue; }
          for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
          p[nd.name] = (lo + hi) / 2;
        }
      }
      for (const l of links) q[l.name] = l.fn(p[l.a], p[l.b]);
      return net;
    },
  };
  return net;
}
