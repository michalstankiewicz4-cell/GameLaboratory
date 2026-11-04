// Zachowanie „lot w atmosferze” (środowisko ląd — lot nad lądem w powietrzu): samolot jako bryła sztywna 6 stopni swobody.
// Siły aerodynamiczne z prędkości względem powietrza: nośna z kąta natarcia (liniowo do przeciągnięcia, za nim spadek),
// opór profilowy, indukowany (Oswald), podwozia i klap, siła boczna ze ślizgu; ciąg śmigła z mocy (stały ciąg do
// prędkości, dalej moc × sprawność / prędkość); momenty: stateczność podłużna i kierunkowa, wznios (przechylenie ze
// ślizgu), tłumienie obrotów, wychylenia sterów. Podwozie: koła na sprężynach z tłumieniem, tarcie toczenia i boczne,
// hamulce, kółko ogonowe skręcane sterem kierunku; brzuch o ziemię przy schowanym podwoziu. Nic nie jest „przyklejone”:
// start, lot i lądowanie to wyłącznie skutek sił.
// Układ ciała: +z przód, +x lewe skrzydło, +y w górę (jak modele AirKit). Liczby samolotu: def.flight (np. spitfire.js).
export const ENVIRONMENTS = ["land"];
const G = 9.81, RHO0 = 1.225;

// --- małe działania na wektorach i kwaternionach ([w, x, y, z]) ---
const qRot = (q, v) => { const [w, x, y, z] = q, [a, b, c] = v;
  const ix = w * a + y * c - z * b, iy = w * b + z * a - x * c, iz = w * c + x * b - y * a, iw = -x * a - y * b - z * c;
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x]; };
const qInv = (q) => [q[0], -q[1], -q[2], -q[3]];
const qMul = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2], a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// def: def.flight z modelu; opts: { mass, p: [x, y, z], yaw, pitch } — położenie środka masy i orientacja startowa
export function createFlight(def, mass, { p = [0, 2, 0], yaw = 0, pitch = 0 } = {}) {
  const F = def, AR = F.b * F.b / F.S;
  // orientacja: obrót wokół pionu (yaw: +z ku (sin, cos)), potem nos w górę (pitch dodatni = nos w górę)
  const qy = [Math.cos(yaw / 2), 0, Math.sin(yaw / 2), 0], qp = [Math.cos(-pitch / 2), Math.sin(-pitch / 2), 0, 0];
  const s = {
    p: p.slice(), v: [0, 0, 0], q: qMul(qy, qp), w: [0, 0, 0],                // w — prędkość kątowa w układzie ciała
    alpha: 0, beta: 0, V: 0, ias: 0, CL: 0, stall: false, onGround: false, load: 1, rpm: 0, thrust: 0, gearDown: true, gear: 1, flap: 0, crashed: false,
  };
  const I = [F.I[2], F.I[1], F.I[0]];   // względem osi ciała x (pochylenie), y (odchylenie), z (przechylenie)

  // c: { throttle 0..1, elevator, aileron, rudder −1..1 (dodatnie: nos w górę, przechył w prawo, nos w prawo), flaps 0/1, gear 0/1, brake 0..1 }
  // groundH(x, z) → wysokość podłoża; wind: [x, y, z] m/s
  function step(dt, c = {}, groundH = () => 0, wind = [0, 0, 0]) {
    if (s.crashed) return s;
    const qi = qInv(s.q), Fw = [0, -mass * G, 0], Tb = [0, 0, 0], Fb = [0, 0, 0];
    s.flap += ((c.flaps ? 1 : 0) - s.flap) * Math.min(1, 0.6 * dt);
    s.gear += ((c.gear === 0 || c.gear === false ? 0 : 1) - s.gear) * Math.min(1, 0.35 * dt); s.gearDown = s.gear > 0.95;
    // --- powietrze ---
    const va = qRot(qi, [s.v[0] - wind[0], s.v[1] - wind[1], s.v[2] - wind[2]]);
    const V = Math.hypot(va[0], va[1], va[2]); s.V = V;
    const rho = RHO0 * Math.exp(-s.p[1] / 8500), qd = 0.5 * rho * V * V; s.ias = V * Math.sqrt(rho / RHO0);
    const alpha = V > 0.5 ? Math.atan2(-va[1], va[2]) : 0, betaL = V > 0.5 ? Math.asin(clamp(va[0] / V, -1, 1)) : 0;
    s.alpha = alpha; s.beta = betaL;
    if (V > 0.5) {
      const as = F.stall + 0.05 * s.flap, CLmax = F.CLmax + F.dCLflap * s.flap;
      let CL = F.CLa * (alpha - F.a0) + F.dCLflap * s.flap * 0.8;
      const aa = Math.abs(alpha); s.stall = aa > as;
      if (s.stall) CL = Math.sign(alpha) * Math.max(0.9 * Math.abs(Math.sin(2 * alpha)), CLmax - (aa - as) * 2.2);
      CL = clamp(CL, -CLmax, CLmax); s.CL = CL;
      const CD = F.CD0 + F.CDgear * s.gear + F.CDflap * s.flap + CL * CL / (Math.PI * F.e * AR) + (s.stall ? 1.2 * Math.sin(alpha) ** 2 : 0);
      const L = qd * F.S * CL, D = qd * F.S * CD, ayz = Math.hypot(va[1], va[2]) || 1;
      // nośna prostopadle do przepływu w płaszczyźnie symetrii, opór przeciw przepływowi, siła boczna ze ślizgu
      Fb[1] += L * va[2] / ayz; Fb[2] += -L * va[1] / ayz;
      Fb[0] += -D * va[0] / V; Fb[1] += -D * va[1] / V; Fb[2] += -D * va[2] / V;
      Fb[0] += -qd * F.S * 0.6 * betaL;
      // momenty (nos w górę, przechył w prawo, nos w prawo) → osie ciała
      const pUp = -s.w[0], rRight = s.w[2], yRight = -s.w[1];
      const qh = pUp * F.c / (2 * V), ph = rRight * F.b / (2 * V), rh = yRight * F.b / (2 * V);
      const eff = s.stall ? 0.4 : 1;
      const M = qd * F.S * F.c * ((F.Cm.m0 ?? 0) + F.Cm.a * alpha - F.Cm.de * 0.3 * (c.elevator || 0) * eff + F.Cm.q * qh);
      const Lr = qd * F.S * F.b * (F.Cl.da * (c.aileron || 0) * eff + F.Cl.p * ph + 0.08 * betaL + (s.stall ? 0.02 * Math.sin(alpha * 7 + s.p[0]) : 0));
      const N = qd * F.S * F.b * (-F.Cn.dr * (c.rudder || 0) + F.Cn.r * rh - F.Cn.beta * betaL);
      Tb[0] += -M; Tb[2] += Lr; Tb[1] += -N;
    }
    // --- śmigło: stały ciąg do ok. 25 m/s, dalej moc × sprawność / prędkość; obroty do wskaźnika ---
    const th = clamp(c.throttle ?? 0, 0, 1);
    const T = Math.min(F.prop.Tstatic * th, F.power * th * F.prop.eta / Math.max(V, 25) * (rho / RHO0)); s.thrust = T;
    Fb[2] += T; s.rpm = 600 + th * 2400;
    // moment obrotowy śmigła (śmigło w prawo patrząc od kabiny → samolot przechyla się w lewo) i P-czynnik przy starcie
    Tb[2] += -0.04 * T; Tb[1] += 0.06 * T * clamp(1 - V / 40, 0, 1);
    // --- podwozie i ziemia ---
    s.onGround = false; let gearLoad = 0;
    const pts = s.gear > 0.6 ? F.gear : [{ x: 0, y: -0.62, z: 0.5, R: 0.05, k: 3e5, c: 3e4, belly: true }, { x: 0, y: -0.25, z: -4.5, R: 0.05, k: 2e5, c: 2e4, belly: true }];
    for (const g of pts) {
      const r = qRot(s.q, [g.x, g.y, g.z]), P = [s.p[0] + r[0], s.p[1] + r[1], s.p[2] + r[2]];
      const h = groundH(P[0], P[2]), pen = h - (P[1] - g.R);
      if (pen <= 0) continue;
      s.onGround = true;
      const vp = [s.v[0], s.v[1], s.v[2]], wr = qRot(s.q, cross(s.w, [g.x, g.y, g.z]));
      vp[0] += wr[0]; vp[1] += wr[1]; vp[2] += wr[2];
      const Fn = Math.max(0, g.k * pen - g.c * vp[1]); gearLoad += Fn;
      // kierunek toczenia: oś z ciała rzutowana na poziom (kółko ogonowe skręcane sterem)
      let fwd = qRot(s.q, [0, 0, 1]); if (g.steer) { const a = -(c.rudder || 0) * 0.5, ca = Math.cos(a), sa = Math.sin(a); fwd = [fwd[0] * ca + fwd[2] * sa, 0, -fwd[0] * sa + fwd[2] * ca]; }
      const fl = Math.hypot(fwd[0], fwd[2]) || 1; fwd = [fwd[0] / fl, 0, fwd[2] / fl]; const side = [fwd[2], 0, -fwd[0]];
      const vf = vp[0] * fwd[0] + vp[2] * fwd[2], vs = vp[0] * side[0] + vp[2] * side[2];
      const mu = g.belly ? 0.45 : 0.02 + (g.brake ? 0.55 * clamp(c.brake || 0, 0, 1) : 0);
      const Ff = -clamp(vf * 4000, -mu * Fn, mu * Fn), Fs = -clamp(vs * 9000, -0.8 * Fn, 0.8 * Fn);
      const Fwg = [fwd[0] * Ff + side[0] * Fs, Fn, fwd[2] * Ff + side[2] * Fs];
      Fw[0] += Fwg[0]; Fw[1] += Fwg[1]; Fw[2] += Fwg[2];
      const tq = cross(r, Fwg), tb = qRot(qi, tq); Tb[0] += tb[0]; Tb[1] += tb[1]; Tb[2] += tb[2];
      if (g.belly && Math.abs(vp[1]) > 4) s.crashed = true;
    }
    s.load = (Fb[1] + gearLoad) / (mass * G);
    // --- całkowanie (półjawny Euler) ---
    const fw = qRot(s.q, Fb);
    for (let i = 0; i < 3; i++) s.v[i] += (fw[i] + Fw[i]) / mass * dt;
    for (let i = 0; i < 3; i++) s.p[i] += s.v[i] * dt;
    const Iw = [I[0] * s.w[0], I[1] * s.w[1], I[2] * s.w[2]], gy = cross(s.w, Iw);
    for (let i = 0; i < 3; i++) s.w[i] += (Tb[i] - gy[i]) / I[i] * dt;
    const dq = qMul(s.q, [0, s.w[0], s.w[1], s.w[2]]);
    for (let i = 0; i < 4; i++) s.q[i] += 0.5 * dq[i] * dt;
    const n = Math.hypot(...s.q); for (let i = 0; i < 4; i++) s.q[i] /= n;
    if (s.p[1] < groundH(s.p[0], s.p[2]) - 0.5) s.crashed = true;   // środek masy pod ziemią — rozbity
    return s;
  }
  return { state: s, step, qRot };
}
