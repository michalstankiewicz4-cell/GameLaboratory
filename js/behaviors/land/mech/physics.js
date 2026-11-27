// Napęd fizyczny (środowisko ląd) — tryb „Fizyka” laboratorium mechaniki. Każdy element ma własny kąt i prędkość
// (stopień swobody), połączenia z napędu (js/behaviors/mech/drive.js: te same porty i związki kątów) są wiązaniami
// rozwiązywanymi metodą XPBD na kątach: C = θb − f(θa), gradient z pochodnej f. Siły nie są „przełożeniem z wzoru”:
// silnik daje moment swojemu wirnikowi, hamulec — tarczy, a reszta porusza się dlatego, że wiązania nie pozwalają
// się rozjechać. Momenty przenoszone przez połączenia — z mnożników wiązań (λ / h²).
// Punkty fizyki (po kolei):
//   1. luz w zazębieniu — wiązanie z martwą strefą ±luz/2 (z geometrii zębów): w środku strefy koła się nie dotykają,
//      przy zmianie kierunku napędzane stoi, aż ząb przejdzie luz i przyłoży się drugą flanką.
//   2. sprężystość połączeń — połączenia miękkie (k < SOFT: wały, gwiazda sprzęgła, pas, łańcuch) to sprężyny skrętne
//      z tłumieniem: moment = −(k·skręcenie + c·prędkość skręcania), c = 2ζ·√(k·J_zred), liczone jawnie w drobnych
//      podkrokach; bardzo sztywne (zazębienia z luzem, sprzęgło kołnierzowe, przeguby, planetarna) zostają wiązaniami.
//      (Sprężystość jako podatność XPBD przy długim łańcuchu połączeń nie zbiegała się w kilku iteracjach — połączenia
//      wychodziły 10–50 razy miększe niż k.)
//   3. straty tarcia i cięgna — każde połączenie przenosi η mocy (z napędu: zazębienie 0,98, łańcuch 0,97, pas 0,95…):
//      moment tarcia (1 − η)·|moment| hamuje koło b; pas: moment graniczny (Euler–Eytelwein), pełzanie sprężyste
//      (do ok. 1,5 % przy pełnym obciążeniu) i poślizg całkowity powyżej granicy; łańcuch: efekt wielokąta
//      (nierówny bieg — relacja kątów z modify()).
//   4. bryły zderzeń zębów — backlash(edge) może zwrócić strefę z brył ({ zone(θa, out) → out.lo, out.hi }, contact.js):
//      granice wiązania zazębienia zależą wtedy od kąta koła a (zmienność luzu wzdłuż przyporu), a nie są stałym ±luz/2.
//   5. obwód elektryczny (js/behaviors/mech/circuit.js) — zasilanie silnika z falownika: on = false → moment 0 (wybieg).
//   const ph = createPhysics(drive, { motorId, brakeId, backlash: (edge) => luz kątowy koła b (rad) | 0,
//                                     stiffness: (edge) => ({ k, zeta, name }) | null (sztywno),
//                                     modify: (edge) => nowa relacja kątów (ta, tb) => θb | null,
//                                     belt: (edge) => ({ Tmax, kinetic, creep }) | null — pas z poślizgiem })
//   ph.step(dt, { w0, brake, Tmax, slip, rated, on }) → stan;  ph.state, ph.edges (stan każdego połączenia)
export const ENV = ['land'];
const TAU = Math.PI * 2;

export const SOFT = 1e5;   // N·m/rad: poniżej — sprężyna jawna, powyżej — wiązanie sztywne
export function createPhysics(drive, { motorId, brakeId, backlash = () => 0, stiffness = () => null, modify = () => null, belt = () => null, substeps = 96, iterations = 6, bearing = 0.0004 } = {}) {
  const motor = drive.els.get(motorId), brake = brakeId ? drive.els.get(brakeId) : null;
  const order = drive.order;   // drzewo połączeń od silnika (jak w napędzie kinematycznym)
  const nodes = [motor, ...order.map((e) => e.b)];
  const idx = new Map(nodes.map((n, i) => [n, i]));
  const N = nodes.length, th = new Float64Array(N), om = new Float64Array(N), prev = new Float64Array(N), w = new Float64Array(N);
  nodes.forEach((n, i) => { th[i] = n.theta; om[i] = n.omega || 0; w[i] = 1 / Math.max(n.J || 0, 1e-6); });
  const E = order.map((e) => { const r = modify(e); return { e: r ? { ...e, rel: r, base: e } : e, a: idx.get(e.a), b: idx.get(e.b), ...zoneOf(backlash(e)), lam: 0, T: 0, Tl: 0, C: 0, contact: 0, twist: 0, eta: e.eta ?? 1, belt: belt(e), slip: 0, slipping: false, creepRate: 0, ...elastic(e) }; });
  // strefa swobody połączenia: liczba — symetryczna ±luz/2; obiekt z zone() — granice z brył zderzeń (zależne od θa)
  function zoneOf(b) {
    if (b && typeof b.zone === 'function') { const z = b.zone(0, {}); return { zone: b.zone, lo: z.lo, hi: z.hi, dead: (z.hi - z.lo) / 2 }; }
    const d = Math.max(0, b || 0) / 2; return { zone: null, lo: -d, hi: d, dead: d };
  }
  // sprężystość połączenia: k (N·m/rad), tłumienie c = 2ζ√(k·J_zred) — J_zred: bezwładność zredukowana wiązania
  function elastic(e) {
    const sp = stiffness(e); if (!sp || !(sp.k > 0)) return { soft: false, k: Infinity, name: '' };
    const ia = idx.get(e.a), ib = idx.get(e.b), eps = 1e-5, ga = (e.rel(e.a.theta + eps, e.b.theta) - e.rel(e.a.theta - eps, e.b.theta)) / (2 * eps);
    const Jr = 1 / (w[ia] * ga * ga + w[ib]), c = 2 * (sp.zeta ?? 0.03) * Math.sqrt(sp.k * Jr);
    return { soft: sp.k < SOFT, kc: c, k: sp.k, zeta: sp.zeta ?? 0.03, name: sp.name || '' };
  }
  const RIGID = E.filter((c) => !c.soft), SOFTS = E.filter((c) => c.soft);
  const st = { omega: 0, Tm: 0, Tb: 0, P: 0, t: 0 };

  // wiązanie sztywne: przesunięcie θa i θb tak, by C wróciło do strefy [−dead, +dead]
  function solve(c) {
    const ta = th[c.a], tb = th[c.b], C = tb - c.e.rel(ta, tb);
    c.C = C;
    if (c.zone) c.zone(ta, c);
    let ex = 0;
    if (C > c.hi) ex = C - c.hi; else if (C < c.lo) ex = C - c.lo;
    if (!ex) return;
    const eps = 1e-5, ga = -(c.e.rel(ta + eps, tb) - c.e.rel(ta - eps, tb)) / (2 * eps);
    const dl = -ex / (w[c.a] * ga * ga + w[c.b]);
    th[c.a] += w[c.a] * ga * dl; th[c.b] += w[c.b] * dl;
    c.lam += dl;
  }
  // sprężyna skrętna (połączenie miękkie): moment uogólniony F = −(k·skręcenie + c·Ċ) → na b: F, na a: F·∂C/∂θa
  function spring(c, h) {
    const ta = th[c.a], tb = th[c.b], C = tb - c.e.rel(ta, tb), eps = 1e-5, ga = -(c.e.rel(ta + eps, tb) - c.e.rel(ta - eps, tb)) / (2 * eps);
    let ex = 0;
    const Ce = C - c.slip;   // pas: przesunięcie z poślizgu
    if (c.zone) c.zone(ta, c);
    if (Ce > c.hi) ex = Ce - c.hi; else if (Ce < c.lo) ex = Ce - c.lo;
    const Cd = om[c.b] + ga * om[c.a];
    let F = ex ? -(c.k * ex + c.kc * Cd) : 0;
    if (c.belt) {
      const B = c.belt;
      if (Math.abs(c.k * ex) > B.Tmax) {   // poślizg całkowity: tarcie ślizgowe w rowku, pas przesuwa się po kole
        c.slipping = true; c.slipN++; ex = Math.sign(ex) * B.Tmax * B.kinetic / c.k; c.slip = C - ex; F = -c.k * ex;
      } else {
        c.slipping = false;
        // pełzanie sprężyste: koło napędzane zostaje w tyle proporcjonalnie do obciążenia (do B.creep przy Tmax)
        c.creepRate = B.creep * Math.min(1, Math.abs(F) / B.Tmax);
        c.slip -= B.creep * (F / B.Tmax) * Math.abs(om[c.b]) * h;
      }
    }
    c.C = C; c.twist = ex;
    om[c.b] += h * w[c.b] * F; om[c.a] += h * w[c.a] * ga * F;
    c.Tf = -F;
  }

  function step(dt, { w0 = 0, brake: Tbrake = 0, Tmax = 18, slip = 0.06, rated = 1450, on = true } = {}) {   // on: false — silnik bez zasilania (wybieg)
    if (dt <= 0) return st;
    const n = Math.max(1, Math.round(substeps * dt * 60)), h = dt / n, h2 = h * h, k = Tmax / (2.5 * slip * rated * TAU / 60);
    const im = idx.get(motor), ib = brake ? idx.get(brake) : -1;
    for (const c of E) { c.T = 0; c.Tl = 0; c.slipN = 0; }
    const th0 = th.slice();   // średnia prędkość z klatki (Δθ / dt) — do okien: chwilowa drga przy poślizgu i tarciu
    let Tm = 0, Tb = 0;
    for (let s = 0; s < n; s++) {
      // momenty zewnętrzne: silnik (poślizg — falownik zadaje prędkość synchroniczną w0), łożyska (opór lepki)
      Tm = on ? Math.max(-Tmax, Math.min(Tmax, k * (w0 - om[im]))) : 0;
      om[im] += h * Tm * w[im];
      for (let i = 0; i < N; i++) om[i] -= om[i] * Math.min(1, bearing * w[i] * h);
      for (const c of SOFTS) spring(c, h);   // sprężyny: momenty z bieżącego skręcenia (jawnie, przed ruchem)
      for (let i = 0; i < N; i++) { prev[i] = th[i]; th[i] += om[i] * h; }
      for (const c of E) c.lam = 0;
      // hamulec: tarcie suche jako wiązanie z ograniczonym mnożnikiem (|λ| ≤ T·h²) rozwiązywane razem z wiązaniami —
      // działa na całą sztywno połączoną grupę części, nigdy mocniej niż T, i nie zawraca (zatrzymuje najwyżej do zera)
      let lb = 0;
      const limB = ib >= 0 ? Tbrake * h2 : 0;
      const brakeSolve = () => { if (!limB) return; const dl = -(th[ib] - prev[ib]) / w[ib], nl = Math.max(-limB, Math.min(limB, lb + dl)); th[ib] += w[ib] * (nl - lb); lb = nl; };
      for (let it = 0; it < iterations; it++) {   // tam i z powrotem po drzewie — szybka zbieżność łańcucha wiązań
        brakeSolve();
        for (let j = 0; j < RIGID.length; j++) solve(RIGID[j]);
        brakeSolve();
        for (let j = RIGID.length - 1; j >= 0; j--) solve(RIGID[j]);
      }
      Tb = -lb / h2;
      for (let i = 0; i < N; i++) om[i] = (th[i] - prev[i]) / h;
      // straty tarcia: (1 − η)·|moment połączenia| przeciw obrotowi koła b — najwyżej do zatrzymania w kroku
      for (const c of E) {
        const Tc = c.soft ? c.Tf : c.lam / h2;
        c.T += Tc / n;
        if (c.eta < 1) {
          const Tl = (1 - c.eta) * Math.abs(Tc), dv = Tl * w[c.b] * h, o = om[c.b];
          om[c.b] = Math.abs(o) <= dv ? 0 : o - Math.sign(o) * dv; th[c.b] -= (o - om[c.b]) * h;
          c.Tl += Tl / n;
        }
      }
    }
    // stan dla rysowania i okien
    const wm = (th[im] - th0[im]) / dt;
    nodes.forEach((nd, i) => { const wa = (th[i] - th0[i]) / dt; nd.theta = th[i]; nd.omega = wa; nd.r = wm ? wa / wm : nd.r; });
    for (const c of E) {
      if (!c.soft) c.twist = 0;
    c.slipFrac = c.belt ? c.slipN / n : 0;   // ułamek podkroków klatki w poślizgu całkowitym (chwyta i zrywa się)
    c.contact = c.dead ? (c.C >= c.hi - 1e-6 ? 1 : c.C <= c.lo + 1e-6 ? -1 : 0) : 0;
      c.e.b.T = Math.abs(c.T);
    }
    motor.T = Tm;
    const wb = ib >= 0 ? (th[ib] - th0[ib]) / dt : 0;
    Object.assign(st, { omega: wm, Tm, Tb, P: Tm * wm, t: st.t + dt, Pout: Math.abs(Tb * wb) });
    return st;
  }
  // ustawienie stanu z kąta i prędkości z napędu kinematycznego (przy wejściu w tryb)
  function sync() { nodes.forEach((nd, i) => { th[i] = nd.theta; om[i] = nd.omega || 0; }); }
  return { step, sync, state: st, edges: E, nodes };
}
