// Czujniki (środowisko ląd): logika przełączania z prawdziwych danych katalogowych.
//  - indukcyjny: zasięg znamionowy sn (zależny od rozmiaru i montażu), współczynnik redukcji dla materiału celu,
//    histereza ok. 10 % (EN 60947-5-2), częstotliwość przełączania; wyjście PNP NO — 24 V przy wykryciu
//  - enkoder inkrementalny: kanały A, B przesunięte o 90° (kwadratura), Z raz na obrót; zliczanie ×4 i kierunek
//  - bariera optyczna: wiązka przerwana / wolna; czas odpowiedzi
export const ENV = ['land'];
export const INDUCTIVE = {
  M8: { flush: 1.5, nonflush: 2.5, f: 3000, I: 0.2 }, M12: { flush: 2, nonflush: 4, f: 2000, I: 0.2 },
  M18: { flush: 5, nonflush: 8, f: 1000, I: 0.2 }, M30: { flush: 10, nonflush: 15, f: 500, I: 0.2 },
};
// współczynniki redukcji zasięgu (cel normowy: stal St37, grubość 1 mm, bok = średnica czujnika lub 3·sn)
export const TARGETS = { steel: { name: 'stal', k: 1 }, stainless: { name: 'stal nierdzewna', k: 0.7 }, brass: { name: 'mosiądz', k: 0.45 }, aluminium: { name: 'aluminium', k: 0.4 }, copper: { name: 'miedź', k: 0.35 } };
export function createInductive({ size = 'M12', flush = true, target = 'steel', hyst = 0.1 } = {}) {
  const d = INDUCTIVE[size] || INDUCTIVE.M12, sn = (flush ? d.flush : d.nonflush) / 1000, k = (TARGETS[target] || TARGETS.steel).k;
  const st = { on: false, dist: Infinity, sr: sn * k, sn, fmax: d.f, edges: 0, lastEdge: null, freq: 0, t: 0 };
  return {
    state: st,
    // dist — odległość celu od czoła czujnika (m); zwraca stan wyjścia
    update(dist, dt) {
      st.t += dt; st.dist = dist;
      const was = st.on;
      if (!st.on && dist < st.sr) st.on = true; else if (st.on && dist > st.sr * (1 + hyst)) st.on = false;
      if (st.on && !was) { if (st.lastEdge !== null) { const p = st.t - st.lastEdge; st.freq = st.freq ? st.freq * 0.7 + 0.3 / p : 1 / p; } st.lastEdge = st.t; st.edges++; }
      if (st.lastEdge !== null && st.t - st.lastEdge > 2) st.freq = 0;
      return st.on;
    },
  };
}
export function createEncoder({ ppr = 1024 } = {}) {
  const st = { theta0: null, count: 0, A: 0, B: 0, Z: 0, dir: 0, rpm: 0, f: 0 };
  let last = null, t = 0, lastT = 0, lastC = 0;
  return {
    state: st, ppr,
    update(theta, dt) {
      t += dt; if (st.theta0 === null) st.theta0 = theta;
      const a = theta - st.theta0, q = Math.floor(a / (2 * Math.PI) * ppr * 4);   // stan kwadratury (zbocza A i B)
      if (last !== null && q !== last) st.dir = Math.sign(q - last);
      last = q; st.count = q;
      const ph = ((q % 4) + 4) % 4; st.A = ph === 1 || ph === 2 ? 1 : 0; st.B = ph >= 2 ? 1 : 0;
      const rev = a / (2 * Math.PI); st.Z = (((rev % 1) + 1) % 1) < 1 / ppr ? 1 : 0;
      if (t - lastT >= 0.1) { st.rpm = (q - lastC) / 4 / ppr / (t - lastT) * 60; st.f = Math.abs(st.rpm) / 60 * ppr; lastT = t; lastC = q; }   // pomiar okienkowy 100 ms
      return st;
    },
  };
}
export function createBarrier({ tResp = 0.001 } = {}) {
  const st = { blocked: false, out: false, count: 0, t: 0, lastChange: 0 };
  return {
    state: st,
    update(blocked, dt) {
      st.t += dt;
      if (blocked !== st.blocked) { st.blocked = blocked; st.lastChange = st.t; }
      const out = st.t - st.lastChange >= tResp ? st.blocked : st.out;   // wyjście „ciemno-załącza”: przerwana wiązka → 24 V
      if (out && !st.out) st.count++;
      st.out = out; return out;
    },
  };
}
// promień zarysu (koła zębatego, krzywki) w funkcji kąta: dla każdego z N kierunków największe przecięcie promienia
// ze środka z wielokątem zarysu pts [{x, y}] — do odległości czoła czujnika od zębów (między wierzchołkami zarysu też)
export function profileRadius(pts, N = 1440) {
  const R = new Float32Array(N), n = pts.length;
  for (let k = 0; k < N; k++) {
    const a = k / N * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a); let best = 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n], ex = q.x - p.x, ey = q.y - p.y, den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-15) continue;
      const t = (p.x * ey - p.y * ex) / den, u = (p.x * dy - p.y * dx) / den;
      if (t > 0 && u >= 0 && u <= 1 && t > best) best = t;
    }
    R[k] = best;
  }
  return (a) => R[Math.floor((((a / (Math.PI * 2)) % 1) + 1) % 1 * N) % N];
}
