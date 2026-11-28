// Przekaźnik czasowy (środowisko ląd) — funkcje jak w typowych modułach na szynę DIN:
//   E  — opóźnione załączenie: po podaniu zasilania A1–A2 styk 15–18 zamyka się po czasie T
//   Wi — impuls po załączeniu: styk zamknięty przez T od podania zasilania
//   Bp — miganie symetryczne: T zamknięty, T otwarty, dopóki jest zasilanie (zaczyna od przerwy)
//   R  — opóźnione wyłączenie (z wejściem sterującym B1): B1 zamyka styk od razu, po zaniku B1 styk otwiera się po T
// Zasilanie uznane za obecne przy napięciu ≥ 0,85·Un; po zaniku zasilania (poza R) przekaźnik się zeruje.
export const ENV = ['land'];
export const FUNCTIONS = { E: 'opóźnione załączenie', Wi: 'impuls po załączeniu', Bp: 'miganie symetryczne', R: 'opóźnione wyłączenie (wejście B1)' };
export function createTimerRelay({ fn = 'E', T = 2, Un = 230 } = {}) {
  const st = { fn, T, powered: false, t: 0, closed: false, b1: false, phase: 'czeka' };
  return {
    state: st,
    set(o) { Object.assign(st, o); st.t = 0; },
    tick(dt, U, b1 = false) {
      const p = U >= 0.85 * Un;
      if (p !== st.powered) { st.powered = p; st.t = 0; }
      if (!p) { st.closed = false; st.phase = 'bez zasilania'; st.b1 = b1; return st.closed; }
      st.t += dt;
      if (st.fn === 'E') { st.closed = st.t >= st.T; st.phase = st.closed ? 'czas minął — styk zamknięty' : 'odliczanie'; }
      else if (st.fn === 'Wi') { st.closed = st.t < st.T; st.phase = st.closed ? 'impuls' : 'czas minął — styk otwarty'; }
      else if (st.fn === 'Bp') { const k = Math.floor(st.t / st.T); st.closed = k % 2 === 1; st.phase = st.closed ? 'miga — zamknięty' : 'miga — otwarty'; }
      else if (st.fn === 'R') {
        if (b1) { st.closed = true; st.t = 0; st.phase = 'B1 podane — styk zamknięty'; }
        else if (st.closed && st.t >= st.T) { st.closed = false; st.phase = 'czas minął — styk otwarty'; }
        else st.phase = st.closed ? 'odliczanie po zaniku B1' : 'czeka na B1';
      }
      st.b1 = b1;
      return st.closed;
    },
    remaining: () => Math.max(0, st.T - st.t),
  };
}
