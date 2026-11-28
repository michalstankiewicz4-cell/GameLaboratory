// Obieg wody z pompą odśrodkową (środowisko ląd): zbiornik → ssanie → pompa (silnik — rozruch z bezwładnością) → zawór
// zwrotny → zawór kulowy → rura tłoczna → dysza pionowa → strumień wraca do zbiornika. Punkt pracy z równowagi wysokości
// pompy i oporów instalacji (rury Darcy–Weisbach, straty miejscowe, zawory, dysza), co krok — bez zadawania przepływu.
//   const f = createFountain({ D2, n0, pipe: { d, L }, valveD, nozzleD, lift })
//   f.step(dt, { motorOn, valveAngle })   valveAngle: 0 — otwarty, π/2 — zamknięty
//   f.state: n, Q, H, dpNozzle, v (prędkość strumienia), h (wysokość strumienia), P (moc na wale), eta, Re, regime
import { G, FLUIDS, centrifugal, pipe, ballArea, nozzle, check, operatingPoint } from './fluid.js';
export const ENV = ['land'];

export function createFountain({ D2 = 0.04, n0 = 2850, pipe: pp = { d: 0.013, L: 0.7 }, valveD = 0.013, nozzleD = 0.008, lift = 0.32, J = 0.0004, kWmotor = 0.09, T = 20 } = {}) {
  const fl = FLUIDS.water, rho = fl.rho, pump = centrifugal({ D2, n0, etaMax: 0.35 }), nz = nozzle({ d: nozzleD }), cv = check({ pc: 0.05e5, dpFull: 0.2e5, Amax: Math.PI * valveD * valveD / 4 });
  const st = { n: 0, Q: 0, H: 0, dpNozzle: 0, v: 0, h: 0, P: 0, eta: 0, Re: 0, regime: 'laminar', motorOn: false, valveAngle: 0, dpValve: 0, dpPipe: 0, Tl: 0 };
  const zetaFit = 2.5;   // kolana, trójnik, wlot i wylot — straty miejscowe
  const Trated = kWmotor * 1000 / (2780 * 2 * Math.PI / 60);
  // wysokość strat instalacji przy przepływie Q (m słupa wody)
  const loss = (Q, ang) => {
    const pr = pipe(Q, { ...pp, eps: 0.0015e-3, zeta: zetaFit, fluid: fl, T }), A = ballArea(valveD, ang);
    if (A < 1e-9) return Infinity;
    const dv = rho / 2 * (Q / (0.8 * A)) ** 2 - rho / 2 * (Q / (Math.PI * valveD * valveD / 4)) ** 2;   // dławienie w kuli (ponad przekrój rury)
    const dc = cv.pc + rho / 2 * (Q / (0.7 * cv.Amax)) ** 2;
    return (pr.dp + Math.max(0, dv) + dc + nz.dp(Q, rho)) / (rho * G);
  };
  function step(dt, { motorOn = false, valveAngle = 0, lift: lft = lift } = {}) {   // lift — wysokość wylotu dyszy nad zwierciadłem (zmienia się z poziomem)
    st.motorOn = motorOn; st.valveAngle = valveAngle;
    const op = operatingPoint(pump, st.n, lft, (Q) => loss(Q, valveAngle));
    st.Q = op.Q; st.H = op.H;
    // moment obciążenia pompy z mocy hydraulicznej i sprawności (przy zamkniętym zaworze — straty tarcia tarczy, ∝ n³)
    const w = st.n * 2 * Math.PI / 60, eta = pump.eta(st.Q, st.n), Ph = rho * G * st.Q * st.H, Pd = 0.03 * kWmotor * 1000 * (st.n / n0) ** 3;
    st.P = (st.Q > 0 ? Ph / eta : 0) + Pd; st.eta = st.Q > 0 ? Ph / st.P : 0; st.Tl = w > 1 ? st.P / w : 0;
    const slip = 1 - st.n / 3000, Tm = motorOn ? Math.min(2.6 * Trated, Trated * slip / (1 - 2780 / 3000)) : 0;
    st.n = Math.max(0, st.n + dt * (Tm - st.Tl - 2e-5 * st.n) / J * 60 / (2 * Math.PI));
    const pr = pipe(st.Q, { ...pp, eps: 0.0015e-3, zeta: zetaFit, fluid: fl, T }); st.Re = pr.Re; st.regime = pr.regime; st.dpPipe = pr.dp;
    st.dpNozzle = nz.dp(st.Q, rho); st.v = nz.Cv * Math.sqrt(2 * st.dpNozzle / rho); st.h = st.v * st.v / (2 * G);
    return st;
  }
  return { state: st, pump, nozzle: nz, step };
}
