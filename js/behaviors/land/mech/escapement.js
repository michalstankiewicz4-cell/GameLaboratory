// Wychwyt Grahama (kotwicowy, bezodbojowy) z wahadłem — fizyka w płaszczyźnie mechanizmu (środowisko ląd).
// Dwa ciała: wahadło sztywno z kotwicą (kąt φ wokół osi kotwicy A, + przeciwnie do zegara) i koło wychwytowe (kąt θ wokół
// środka E) z całym mechanizmem zredukowanym na jego oś (bezwładność Je, moment napędu sprężyny Te ujemny — obrót zgodny
// z zegarem). Kontakt: wierzchołki zębów koła z paletami kotwicy (prawdziwe kształty: powierzchnia spoczynkowa — łuk
// wokół osi kotwicy, powierzchnia impulsowa — pochylnia na końcu palety). Wiązanie jednostronne rozwiązywane jak w XPBD:
// rzut położenia (głębokość ze wspólnej masy efektywnej), uderzenie niesprężyste, tarcie Coulomba na paletach.
// Nic nie jest „przyklejane”: koło stoi, bo ząb opiera się o łuk spoczynkowy; wahadło dostaje impuls, bo ząb pcha pochylnię.
//   const esc = createEscapement(geom, { Jp, mgl, Q, Je, mu })    geom: escapementGeometry(...)
//   esc.step(dt, Te)  → { phi, omega, theta, w, contact: 'left'|'right'|null, face }   esc.state
export const ENV = ['land'];
const D2R = Math.PI / 180;

// geometria: koło z zębów (Re — promień wierzchołków), oś kotwicy A nad środkiem koła (H = Re·√2 — styczne pod 90°),
// palety obejmują 7,5 podziałki; w — szerokość palety (pół podziałki minus spadek), lift / lock — kąty kotwicy (rad)
export function escapementGeometry({ z = 30, Re = 0.03, drop = 0.0003, liftDeg = 1.4, lockDeg = 0.6, spanDeg = 7 } = {}) {
  const p = 2 * Math.PI / z, H = Re * Math.SQRT2, w = Math.PI * Re / z - drop;
  const lift = liftDeg * D2R, lock = lockDeg * D2R, d0 = (lift + lock) / 2, span = spanDeg * D2R;
  const ri = Re - w / 2, ro = Re + w / 2, cL = -0.75 * Math.PI, cR = -0.25 * Math.PI;
  return {
    z, p, Re, H, w, drop, lift, lock, d0, ri, ro,
    // paleta lewa (wejściowa): łuk spoczynkowy zewnętrzny, koniec (impuls) po stronie przeciwnej do zegara
    left: { back: cL - span, lockEnd: cL + d0 - lift, tip: cL + d0 },
    // paleta prawa (wyjściowa): łuk spoczynkowy wewnętrzny, koniec po stronie zgodnej z zegarem
    right: { back: cR + span, lockEnd: cR - d0 + lift, tip: cR - d0 },
  };
}
// obrys palety w układzie kotwicy (oś w 0, x w prawo, y w górę) — do budowy modelu; n — punkty na łuku
export function palletOutline(G, side, n = 12) {
  const P = G[side], pts = [], pol = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
  if (side === 'left') {
    for (let i = 0; i <= n; i++) pts.push(pol(G.ro, P.back + (P.lockEnd - P.back) * i / n));   // łuk spoczynkowy (zewnętrzny)
    pts.push(pol(G.ri, P.tip));                                                                  // pochylnia impulsowa
    for (let i = n; i >= 0; i--) pts.push(pol(G.ri, P.back + (P.tip - P.back) * i / n));
  } else {
    for (let i = 0; i <= n; i++) pts.push(pol(G.ri, P.back + (P.lockEnd - P.back) * i / n));   // łuk spoczynkowy (wewnętrzny)
    pts.push(pol(G.ro, P.tip));
    for (let i = n; i >= 0; i--) pts.push(pol(G.ro, P.back + (P.tip - P.back) * i / n));
  }
  return pts;
}

// wnikanie punktu (x, y) — w układzie kotwicy, względem osi — w paletę: { depth, nx, ny, face } albo null
function inside(G, side, x, y) {
  const r = Math.hypot(x, y), a = Math.atan2(y, x), P = G[side], t = G.ro - G.ri;
  if (r <= G.ri || r >= G.ro) return null;
  const ur = [x / r, y / r], ut = [-ur[1], ur[0]];   // promieniowy, styczny (przeciwnie do zegara)
  if (side === 'left') {
    const aS = P.lockEnd + (G.ro - r) / t * (P.tip - P.lockEnd);
    if (a < P.back || a > aS) return null;
    const dOut = G.ro - r, dIn = r - G.ri;
    // pochylnia: prosta przez (ro, lockEnd) i (ri, tip)
    const ax = G.ro * Math.cos(P.lockEnd), ay = G.ro * Math.sin(P.lockEnd), bx = G.ri * Math.cos(P.tip), by = G.ri * Math.sin(P.tip);
    let nx = by - ay, ny = -(bx - ax); const L = Math.hypot(nx, ny); nx /= L; ny /= L;
    if (nx * (x - ax) + ny * (y - ay) > 0) { nx = -nx; ny = -ny; }   // normalna na zewnątrz palety
    const dS = -(nx * (x - ax) + ny * (y - ay));
    const m = Math.min(dOut, dIn, dS);
    if (m === dOut) return { depth: dOut, nx: ur[0], ny: ur[1], face: 'lock' };
    if (m === dS) return { depth: dS, nx, ny, face: 'impulse' };
    return { depth: dIn, nx: -ur[0], ny: -ur[1], face: 'back' };
  }
  const aS = P.lockEnd - (r - G.ri) / t * (P.lockEnd - P.tip);
  if (a > P.back || a < aS) return null;
  const dOut = G.ro - r, dIn = r - G.ri;
  const ax = G.ri * Math.cos(P.lockEnd), ay = G.ri * Math.sin(P.lockEnd), bx = G.ro * Math.cos(P.tip), by = G.ro * Math.sin(P.tip);
  let nx = by - ay, ny = -(bx - ax); const L = Math.hypot(nx, ny); nx /= L; ny /= L;
  if (nx * (x - ax) + ny * (y - ay) > 0) { nx = -nx; ny = -ny; }
  const dS = -(nx * (x - ax) + ny * (y - ay));
  const m = Math.min(dOut, dIn, dS);
  if (m === dIn) return { depth: dIn, nx: -ur[0], ny: -ur[1], face: 'lock' };
  if (m === dS) return { depth: dS, nx, ny, face: 'impulse' };
  void ut;
  return { depth: dOut, nx: ur[0], ny: ur[1], face: 'back' };
}

export function createEscapement(G, { Jp, mgl, Q = 1500, Je, mu = 0.15, cE = 2e-6, theta0 = 0, phi0 = 0.05 } = {}) {
  const w0 = Math.sqrt(mgl / Jp), cP = Jp * w0 / Q;   // tłumienie wahadła z dobroci Q (opór powietrza, sprężyna zawieszenia)
  const st = { phi: phi0, omega: 0, theta: theta0, w: 0, contact: null, face: null, impulseE: 0, beats: 0, lastSide: null, Tc: 0 };
  // wierzchołek zęba k w układzie świata względem osi kotwicy A (E = (0, −H))
  const tip = (k, th) => { const a = th + k * G.p + Math.PI / 2; return [G.Re * Math.cos(a), -G.H + G.Re * Math.sin(a)]; };
  function step(dt, Te) {
    const n = Math.max(1, Math.ceil(dt / 2.5e-4)), h = dt / n;
    let side = null, face = null;
    for (let s = 0; s < n; s++) {
      // ruch swobodny (półjawny Euler)
      st.omega += h * (-mgl * Math.sin(st.phi) - cP * st.omega) / Jp;
      st.w += h * (Te - cE * st.w) / Je;
      const ph0 = st.phi, th0 = st.theta;
      st.phi += h * st.omega; st.theta += h * st.w;
      // kontakty: zęby w pobliżu obu palet
      const c = Math.cos(-st.phi), sn = Math.sin(-st.phi);
      for (let k = 0; k < G.z; k++) {
        const [tx, ty] = tip(k, st.theta);
        if (ty < -G.H + G.Re * 0.4) continue;   // tylko górna część koła (tam są palety)
        const lx = tx * c - ty * sn, ly = tx * sn + ty * c;   // do układu kotwicy
        for (const sd of ['left', 'right']) {
          const q = inside(G, sd, lx, ly); if (!q) continue;
          const cs = Math.cos(st.phi), ss = Math.sin(st.phi), nx = q.nx * cs - q.ny * ss, ny = q.nx * ss + q.ny * cs;   // normalna do świata
          // jakobiany: punkt zęba z obrotu koła wokół E, punkt palety z obrotu kotwicy wokół A (0, 0)
          const ex = tx, ey = ty + G.H;
          const Je_ = nx * -ey + ny * ex, Ja_ = -(nx * -ty + ny * tx);
          const wsum = Je_ * Je_ / Je + Ja_ * Ja_ / Jp; if (wsum < 1e-12) continue;
          const lam = q.depth / wsum;
          st.theta += Je_ * lam / Je; st.phi += Ja_ * lam / Jp;
          // prędkość względna wzdłuż normalnej: uderzenie niesprężyste
          const vn = Je_ * st.w + Ja_ * st.omega;
          let P = 0; if (vn < 0) { P = -vn / wsum; st.w += Je_ * P / Je; st.omega += Ja_ * P / Jp; }
          // tarcie na palecie (styczna)
          const tx_ = -ny, ty_ = nx, Jte = tx_ * -ey + ty_ * ex, Jta = -(tx_ * -ty + ty_ * tx), wt = Jte * Jte / Je + Jta * Jta / Jp;
          const vt = Jte * st.w + Jta * st.omega, Nimp = P + lam / h;
          if (wt > 1e-12) { let Pt = -vt / wt; const lim = mu * Nimp; Pt = Math.max(-lim, Math.min(lim, Pt)); st.w += Jte * Pt / Je; st.omega += Jta * Pt / Jp; }
          st.Tc = Ja_ * (P + lam / h) / h;   // moment od zęba na kotwicę (przybliżony)
          side = sd; face = q.face;
        }
      }
      void ph0; void th0;
    }
    if (side && side !== st.lastSide) { st.beats++; st.lastSide = side; }
    st.contact = side; st.face = face;
    return st;
  }
  return { step, state: st, tip, w0, cP };
}
