// Oś hydrauliczna (środowisko ląd): zasilacz (silnik indukcyjny + pompa zębata, zawór bezpieczeństwa), rozdzielacz 4/3
// z położeniem środkowym tandem (P→T, A i B zamknięte), zawór dławiąco-zwrotny na linii B (dławienie wypływu przy
// wysuwie), siłownik dwustronnego działania z masą, tarciem i zderzakami. Ciśnienia z sieci węzłów (hydraulics.js),
// ruch tłoczyska z sił ciśnień — bez zadawania prędkości.
//   const ax = createHydraulicAxis({ cyl: { D, d, stroke }, m, pc, throttle })
//   ax.step(dt, { spool: −1..1, Fext, mExt, motorOn })   spool > 0 — P→A (wysuw), < 0 — P→B (wsuw)
//   ax.state: x, v, p: { P, A, B, Bv }, Qp, Qrel, n, T, Phyd, Ploss, hits
import { BAR, FLUIDS, gearPump, relief, check, orifice, needleArea, cylinder, nu } from './fluid.js';
import { createHydraulicNet } from './hydraulics.js';
export const ENV = ['land'];

export function createHydraulicAxis({ cyl: cp = { D: 0.032, d: 0.018, stroke: 0.15 }, m = 1.6, pc = 60 * BAR, pump: pp = { m: 0.002, z: 10, b: 0.008 },
  motor = { ns: 1500, nRated: 1370, Trated: 2.58 }, valve = { Amax: 9e-6, ov: 0.15 }, throttle = { dSeat: 0.0025, h: 0.0006 }, hoseV = 4e-5, fluid = FLUIDS.oil, T = 40 } = {}) {
  const C = cylinder(cp), P = gearPump(pp), RV = relief({ pc, dpFull: 8 * BAR, Amax: 8e-6 }), CV = check({ pc: 0.3 * BAR, Amax: 12e-6 }), rho = fluid.rho;
  const st = { x: 0, v: 0, spool: 0, p: { P: 0, A: 0, B: 0, Bv: 0 }, Qp: 0, Qrel: 0, QA: 0, n: 0, Tm: 0, Phyd: 0, Ploss: 0, hits: 0, Fp: 0, motorOn: false, throttleH: throttle.h, nu: nu(fluid, T) };
  const dead = 6e-6;   // objętość martwa komory (dno, kanały)
  const net = createHydraulicNet({ K: 0.9e9 })   // K efektywne: olej 1,6 GPa z podatnością węży i pęcherzykami powietrza
    .node('T', { tank: true }).node('P', { V: 6e-5 }).node('A', { V: hoseV }).node('B', { V: hoseV }).node('Bv', { V: 1.5e-5 });
  const open = (s) => Math.max(0, (s - valve.ov) / (1 - valve.ov));          // otwarcie krawędzi suwaka (przekrycie dodatnie ov)
  net.source('P', (p) => P.Q(st.n, p));
  net.link('relief', 'P', 'T', (a, b) => RV.Q(a - b, rho));
  net.link('PT', 'P', 'T', (a, b) => orifice(a - b, valve.Amax * Math.max(0, 1 - Math.abs(st.spool) / valve.ov), 0.7, rho));   // tandem
  net.link('PA', 'P', 'A', (a, b) => orifice(a - b, valve.Amax * open(st.spool), 0.7, rho));
  net.link('AT', 'A', 'T', (a, b) => orifice(a - b, valve.Amax * open(-st.spool), 0.7, rho));
  net.link('PB', 'P', 'Bv', (a, b) => orifice(a - b, valve.Amax * open(-st.spool), 0.7, rho));
  net.link('BT', 'Bv', 'T', (a, b) => orifice(a - b, valve.Amax * open(st.spool), 0.7, rho));
  // dławik iglicowy (oba kierunki) + zwrotny równolegle (przepuszcza swobodnie Bv → B, czyli przy wsuwie)
  net.link('thr', 'B', 'Bv', (a, b) => orifice(a - b, needleArea(throttle.dSeat, st.throttleH), 0.7, rho) - CV.Q(b - a, rho));
  net.link('leak', 'A', 'B', (a, b) => 2e-13 * (a - b));   // przeciek przez uszczelnienie tłoka (laminarny)
  net.flowIn('A', () => -C.A1 * st.v).flowIn('B', () => C.A2 * st.v);
  const Fc = 25, cv = 300;   // tarcie uszczelnień: Coulomba (N), lepkie (N·s/m)
  function step(dt, { spool = 0, Fext = 0, mExt = 0, motorOn = true } = {}) {
    st.spool = Math.max(-1, Math.min(1, spool)); st.motorOn = motorOn;
    const n = Math.max(1, Math.ceil(dt / 2e-4)), h = dt / n, M = m + mExt;
    for (let i = 0; i < n; i++) {
      // silnik: moment z charakterystyki (część liniowa), rozruch bezwładnością wirnika i pompy
      const Tl = P.T(net.p.P), slip = 1 - st.n / motor.ns, Tm = motorOn ? Math.min(2.5 * motor.Trated, motor.Trated * slip / (1 - motor.nRated / motor.ns)) : 0;   // moment ∝ poślizg, ograniczony momentem utyku
      st.n = Math.max(0, st.n + h * (Tm - Tl - 1e-4 * st.n) / 0.0012 * 60 / (2 * Math.PI)); st.Tm = Tm;
      // tłoczysko: siły ciśnień, tarcie (tanh — gładko przez zero), siła zewnętrzna (opór ładunku)
      const F = net.p.A * C.A1 - net.p.B * C.A2 - Fc * Math.tanh(st.v / 0.004) - cv * st.v - Fext;
      st.v += h * F / M; st.x += h * st.v;
      if (st.x < 0) { st.x = 0; if (st.v < -0.02) st.hits++; st.v = Math.max(0, st.v); }
      if (st.x > C.stroke) { st.x = C.stroke; if (st.v > 0.02) st.hits++; st.v = Math.min(0, st.v); }
      net.setV('A', hoseV + dead + C.A1 * st.x); net.setV('B', hoseV + dead + C.A2 * (C.stroke - st.x));
      net.step(h, 2);
      st.Fp = F;
    }
    Object.assign(st.p, net.p); st.Qp = P.Q(st.n, net.p.P); st.Qrel = net.q.relief; st.QA = net.q.PA - net.q.AT;
    st.Phyd = net.p.P * st.Qp; st.Ploss = net.p.P * (st.Qrel + net.q.PT) + Math.max(0, net.p.B - net.p.Bv) * Math.abs(net.q.thr);   // ciepło: przelew, tandem, dławik
    return st;
  }
  return { state: st, cyl: C, pump: P, relief: RV, step, net, setThrottle: (h) => { st.throttleH = Math.max(0, h); } };
}
