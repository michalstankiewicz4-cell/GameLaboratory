// Regulator PID (środowisko ląd, dziedzina „sygnał”): postać równoległa z czasami — u = Kp·(e + (1/Ti)∫e dt + Td·de/dt);
// różniczkowanie wartości mierzonej (bez kopnięcia przy zmianie zadanej) z filtrem pierwszego rzędu (Td / N), całkowanie
// warunkowe (anti-windup: całka zatrzymana, gdy wyjście w nasyceniu i błąd je pogłębia), praca ręczna z przejściem
// bezuderzeniowym (całka dopasowana do wyjścia ręcznego).
export const ENV = ['land'];
export function createPID({ Kp = 0.005, Ti = 1.5, Td = 0, N = 10, min = 0, max = 10, sv = 1000 } = {}) {
  const st = { Kp, Ti, Td, N, sv, pv: 0, e: 0, out: 0, I: 0, D: 0, auto: false, manual: 0, P: 0, sat: false };
  let lastPv = null;
  return {
    state: st,
    step(pv, dt) {
      st.pv = pv; st.e = st.sv - pv;
      if (!st.auto) { st.out = Math.max(min, Math.min(max, st.manual)); st.I = st.out - st.Kp * st.e; lastPv = pv; st.D = 0; st.P = st.Kp * st.e; return st.out; }
      const dpv = lastPv === null ? 0 : (pv - lastPv) / dt; lastPv = pv;
      const a = st.Td > 0 ? st.Td / (st.Td + st.N * dt) : 0;
      st.D = a * st.D - (1 - a) * st.Kp * st.Td * dpv;
      st.P = st.Kp * st.e;
      const raw = st.P + st.I + st.D, out = Math.max(min, Math.min(max, raw));
      st.sat = out !== raw;
      if (st.Ti > 0 && !(st.sat && Math.sign(st.e) === Math.sign(raw - out))) st.I += st.Kp * st.e * dt / st.Ti;
      st.I = Math.max(min - max, Math.min(2 * max, st.I));
      st.out = out; return out;
    },
  };
}
