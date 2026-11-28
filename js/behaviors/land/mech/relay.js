// Przekaźnik sygnałowy (środowisko ląd): cewka z rezystancją (prąd = U / R), napięcie zadziałania i odpadania (ułamki
// napięcia znamionowego, histereza magnetyczna), czasy zadziałania i odpadania (ruch kotwicy), styk przełączny 11–12
// (NC) / 11–14 (NO). Dane jak w typowych przekaźnikach miniaturowych 24 V DC.
export const ENV = ['land'];
export function createRelay({ Un = 24, Rc = 1440, pull = 0.7, drop = 0.1, tOp = 0.008, tRel = 0.004 } = {}) {
  const st = { U: 0, I: 0, on: false, t: 0, ops: 0, phase: 'odpadnięty' };
  return {
    state: st, Un, Rc, P: Un * Un / Rc,
    tick(dt, U) {
      st.U = U; st.I = U / Rc;
      const want = st.on ? U > drop * Un : U >= pull * Un;
      if (want !== st.on) { st.t += dt; const lim = want ? tOp : tRel; st.phase = want ? 'zadziałanie (kotwica w ruchu)' : 'odpadanie (kotwica w ruchu)'; if (st.t >= lim) { st.on = want; st.t = 0; if (want) st.ops++; st.phase = want ? 'zadziałał — 11–14 zamknięty' : 'odpadnięty — 11–12 zamknięty'; } }
      else { st.t = 0; st.phase = st.on ? 'zadziałał — 11–14 zamknięty' : 'odpadnięty — 11–12 zamknięty'; }
      return st.on;
    },
  };
}
