// Napęd mechaniczny (środowisko ląd): graf elementów z portami połączonych transmisjami. Kąty elementów liczone od kąta
// silnika po krawędziach grafu, prędkości — z pochodnej (różnica centralna), więc działa też dla przegubu Cardana, którego
// przełożenie zmienia się w czasie obrotu. Dynamika: silnik indukcyjny zasilany z falownika (moment proporcjonalny do
// poślizgu, ograniczony do momentu krytycznego), bezwładność zredukowana na wał silnika J = Σ Jᵢ·(ωᵢ/ω_s)², hamulec na
// wyjściu, sprawności połączeń.
//   const d = createDrive()
//   d.add(el)            el: { id, name, type, props: [[nazwa, wartość]], ports: [{ id, name, kind }], J, spin, frame }
//     frame: { o: Vector3 (punkt na osi), axis: Vector3, ref: Vector3 (zero kąta, ⟂ osi) }
//   d.connect(a, pa, b, pb, type, opts)  type: 'shaft' | 'coupling' | 'mesh' | 'chain' | 'belt' | 'ujoint' | 'planetary'
//                                        | 'rack' (koło ↔ listwa) | 'screw' (śruba ↔ nakrętka) | 'crank' (korba → suwak)
//   el.dof: 'rot' (kąt, rad; J — bezwładność, kg·m²) albo 'lin' (przesunięcie, m; J — masa, kg; frame.axis — kierunek ruchu).
//   Współrzędne uogólnione: ten sam graf, te same wzory dynamiki (moment ↔ siła, ω ↔ v).
//   Porty: jeśli model ma userData.ports (MechKit), połączenie sprawdza złącza (COMPAT) — niezgodne → ostrzeżenie w konsoli.
//   d.solve(motorId, outId) → { ok, conflicts }    d.step(dt, { rpm, brake }) → stan
import * as THREE from '../../../../vendor/three/three.module.js';

export const ENV = ['land'];
export const EFF = { shaft: 1, coupling: 0.995, mesh: 0.98, chain: 0.97, belt: 0.95, ujoint: 0.99, planetary: 0.97, rack: 0.98, screw: 0.9, crank: 0.97 };
export const KIND_NAME = { shaft: 'wał', coupling: 'sprzęgło', mesh: 'zazębienie', chain: 'łańcuch', belt: 'pas', ujoint: 'przegub Cardana', planetary: 'przekładnia planetarna', rack: 'listwa zębata', screw: 'śruba pociągowa', crank: 'mechanizm korbowy' };
// złącza dozwolone w danym połączeniu; połączenia zamieniające ruch (CONVERT) łączą różne dziedziny (obrót ↔ przesuw)
export const COMPAT = { shaft: ['wał', 'wpust', 'mocowanie', 'łożysko'], coupling: ['wał', 'wpust'], mesh: ['zazębienie'], chain: ['łańcuch'], belt: ['pas'], ujoint: ['wał', 'przegub'], planetary: ['zazębienie', 'wał', 'wpust'], rack: ['zazębienie'], screw: ['gwint'], crank: ['wał', 'wpust', 'sworzeń'] };
export const CONVERT = { rack: true, screw: true, crank: true };
// sprawność przegubu Cardana zależna od kąta łamania β: straty tarcia w łożyskach igiełkowych krzyżaka (ruch wahadłowy
// czopów o ±β): η = 1 − (2/π)·μ·(r_c / R)·(tg β + sin β); μ — tarcie efektywne, r_c — promień czopa, R — ramię krzyżaka
export function ujointEta(beta, { mu = 0.05, rc = 0.0055, R = 0.026 } = {}) { return 1 - (2 / Math.PI) * mu * (rc / R) * (Math.tan(beta) + Math.sin(beta)) - 0.002; }
const TAU = Math.PI * 2;
const wrapPi = (a) => a - TAU * Math.round(a / TAU);

export function createDrive() {
  const els = new Map(), edges = [];
  let order = [], motor = null, out = null, conflicts = [];
  const st = { theta: 0, omega: 0, Tm: 0, Jeff: 0, Tload: 0, P: 0 };

  function add(el) { el.theta = 0; el.omega = 0; el.T = 0; el.r = 0; el.eta = 1; el.dof = el.dof || 'rot'; els.set(el.id, el); return el; }

  // relacja kąta b od kąta a (θb = f(θa, θb poprzednie)) dla danego rodzaju połączenia
  function relation(type, A, B, o) {
    if (type === 'shaft' || type === 'coupling') return (ta) => ta + (o.phase || 0);
    if (type === 'mesh') {
      // ψ — kierunek od osi a do osi b w układzie a; ząb a na ψ ⇒ wrąb b na ψ + π
      const d = B.frame.o.clone().sub(A.frame.o), y = A.frame.ref, z = new THREE.Vector3().crossVectors(A.frame.axis, y);
      const psi = Math.atan2(d.dot(z), d.dot(y)), k = o.za / o.zb;
      return (ta) => -k * (ta - psi) + psi + Math.PI + Math.PI / o.zb + (o.phase || 0);
    }
    if (type === 'chain' || type === 'belt') { const k = o.za / o.zb; return (ta) => ta * k * (o.cross ? -1 : 1) + (o.phase || 0); }
    if (type === 'planetary') { const k = o.zs / (o.zs + o.zr); return (ta) => ta * k; }   // koło koronowe nieruchome (Willis)
    if (type === 'ujoint') {
      // przegub Cardana z geometrii: sworzeń b ⟂ sworzeń a i ⟂ osi b (krzyżak sztywny, czopy prostopadłe)
      const pa = new THREE.Vector3(), pb = new THREE.Vector3(), t = new THREE.Vector3(), zb = new THREE.Vector3().crossVectors(B.frame.axis, B.frame.ref);
      return (ta, prev) => {
        pa.copy(o.pinA).applyAxisAngle(A.frame.axis, ta);                // sworzeń a w świecie
        pb.crossVectors(B.frame.axis, pa).normalize();                    // kierunek sworznia b
        // kąt b: sworzeń b przy θb = 0 to o.pinB; obrót wokół osi b
        const ref = o.pinB, zr = t.crossVectors(B.frame.axis, ref);
        let tb = Math.atan2(pb.dot(zr), pb.dot(ref));
        tb = prev + wrapPi((tb - prev) * 2) / 2;                          // sworzeń symetryczny: rozwiązanie co π, ciągłe
        return tb;
      };
    }
    if (type === 'rack') {   // koło ↔ listwa: x = x0 + s·r_p·θ (x0 — gdzie wrąb listwy trafia pod ząb koła)
      const gear = A.dof === 'lin' ? B : A, rk = A.dof === 'lin' ? A : B, g = rackGeom(gear, rk, o);
      const f = A === gear ? (ta) => g.x0 + g.s * g.rp * ta + (o.phase || 0) : (ta) => (ta - g.x0 - (o.phase || 0)) / (g.s * g.rp);
      f.geom = g; return f;
    }
    if (type === 'screw') {   // śruba ↔ nakrętka: x = −h·θ·skok/2π (gwint prawy: nakrętka cofa się, gdy śruba wkręca się w nią)
      const sc = A.dof === 'lin' ? B : A, nt = A.dof === 'lin' ? A : B, k = -(o.hand === 'left' ? -1 : 1) * Math.sign(sc.frame.axis.dot(nt.frame.axis) || 1) * o.lead / TAU;
      return A === sc ? (ta) => k * ta + (o.phase || 0) : (ta) => (ta - (o.phase || 0)) / k;
    }
    if (type === 'crank') {   // korba (a, obrót) → suwak (b, przesuw): sworzeń korby po okręgu r, korbowód l, sworzeń suwaka po prostej
      const ax = A.frame.axis, ref = A.frame.ref, zz = new THREE.Vector3().crossVectors(ax, ref), u = B.frame.axis, S0 = B.frame.o;
      const off = S0.clone().sub(A.frame.o).dot(ax), P = new THREE.Vector3(), D = new THREE.Vector3();
      return (ta, prev) => {
        const a = ta + (o.a0 || 0); P.copy(A.frame.o).addScaledVector(ax, off).addScaledVector(ref, o.r * Math.cos(a)).addScaledVector(zz, o.r * Math.sin(a));
        D.subVectors(S0, P); const b = D.dot(u), disc = Math.max(0, b * b - D.lengthSq() + o.l * o.l), q = Math.sqrt(disc);
        const x1 = -b + q, x2 = -b - q;
        return Math.abs(x1 - (prev ?? x1)) <= Math.abs(x2 - (prev ?? x1)) ? x1 : x2;
      };
    }
    throw new Error('Nieznane połączenie ' + type);
  }

  // sprawność z części, która tworzy połączenie (userData.phys.eta modelu: zębatka, koło łańcuchowe / pasowe, sprzęgło);
  // wał (wpust) — 1, przegub i przekładnia planetarna — z opts.eta (dane krzyżaka / korony), inaczej EFF
  function physEta(type, A, B) {
    if (type === 'shaft' || type === 'ujoint' || type === 'planetary') return undefined;
    const pa = A && A.group && A.group.userData.phys, pb = B && B.group && B.group.userData.phys;
    return (pa && pa.eta) ?? (pb && pb.eta);
  }
  // geometria koła z listwą: punkt styku na linii podziałowej listwy, kierunek ruchu zęba, wrąb listwy pod zębem koła
  function rackGeom(G, R, o) {
    const u = R.frame.axis, rp = o.m * o.z / 2, p = Math.PI * o.m, oA = G.frame.o, O = o.origin || R.frame.o;   // O: punkt linii podziałowej listwy, od którego liczy się y0
    const yc = oA.clone().sub(O).dot(u), contact = O.clone().addScaledVector(u, yc), d = contact.clone().sub(oA);
    const zA = new THREE.Vector3().crossVectors(G.frame.axis, G.frame.ref), psi = Math.atan2(d.dot(zA), d.dot(G.frame.ref));
    const t = new THREE.Vector3().crossVectors(G.frame.axis, d).normalize(), s = Math.sign(t.dot(u)) || 1;
    const j = Math.round(psi / (TAU / o.z)), sg = rp * (j * TAU / o.z - psi);
    let x0 = yc + s * sg - (o.y0 || 0); x0 -= p * Math.round(x0 / p);
    return { x0, s, rp, p, yc };
  }
  function checkPorts(A, B, pa, pb, type) {
    const qa = A && A.group && A.group.userData.ports && A.group.userData.ports[pa], qb = B && B.group && B.group.userData.ports && B.group.userData.ports[pb], ok = COMPAT[type];
    if (!ok) return;
    for (const [el, q, n] of [[A, qa, pa], [B, qb, pb]]) if (q && !ok.includes(q.iface)) console.warn(`Napęd: port „${n}” elementu ${el.name || el.id} (${q.iface}) nie pasuje do połączenia ${KIND_NAME[type] || type}`);
    if (qa && qb && !CONVERT[type] && qa.domain !== qb.domain) console.warn(`Napęd: ${A.name || A.id} (${qa.domain}) i ${B.name || B.id} (${qb.domain}) — różne dziedziny bez zamiany ruchu`);
    if (qa && qb && CONVERT[type] && qa.domain === qb.domain) console.warn(`Napęd: ${KIND_NAME[type]} łączy ${qa.domain} z ${qb.domain} — oczekiwana zamiana obrót ↔ przesuw`);
  }
  function connect(a, pa, b, pb, type, opts = {}) {
    const A = els.get(a), B = els.get(b);
    checkPorts(A, B, pa, pb, type);
    const e = { a: A, b: B, pa, pb, type, opts, eta: opts.eta ?? (type === 'ujoint' && opts.phys ? ujointEta(Math.acos(Math.min(1, Math.abs(A.frame.axis.dot(B.frame.axis)))), opts.phys) : physEta(type, A, B)) ?? EFF[type] ?? 1 };
    e.rel = relation(type, A, B, opts);
    edges.push(e);
    return e;
  }

  // drzewo od silnika (przejście wszerz); element osiągnięty drugi raz inną drogą — sprawdzenie zgodności (zakleszczenie)
  function solve(motorId, outId) {
    motor = els.get(motorId); out = outId ? els.get(outId) : null; order = []; conflicts = [];
    const seen = new Map([[motor, null]]), queue = [motor];
    motor.eta = 1;
    while (queue.length) {
      const el = queue.shift();
      for (const e of edges) {
        if (e.a !== el) continue;
        if (seen.has(e.b)) { conflicts.push(e); continue; }
        seen.set(e.b, e); e.b.eta = el.eta * e.eta; order.push(e); queue.push(e.b);
      }
    }
    for (const e of conflicts) {   // ta sama część z dwóch dróg: przełożenia muszą się zgadzać, inaczej mechanizm stoi
      const k1 = probe(e.b), k2 = probeVia(e);
      e.locked = Math.abs(k1 - k2) > 1e-6 * Math.max(1, Math.abs(k1));
    }
    const unreached = [...els.values()].filter((el) => !seen.has(el));
    return { ok: !conflicts.some((e) => e.locked), conflicts, unreached };
  }
  function evalAngles(tm, write) {
    const th = new Map([[motor, tm]]);
    for (const e of order) th.set(e.b, e.rel(th.get(e.a), e.b.theta));
    if (write) for (const [el, t] of th) el.theta = t;
    return th;
  }
  const probe = (el) => { const a = evalAngles(1e-3).get(el), b = evalAngles(-1e-3).get(el); return (a - b) / 2e-3; };
  const probeVia = (e) => { const f = (tm) => e.rel(evalAngles(tm).get(e.a), e.b.theta); return (f(1e-3) - f(-1e-3)) / 2e-3; };

  // krok dynamiki (stały, kilka podkroków na klatkę)
  function step(dt, { rpm = 0, brake = 0, Tmax = 18, slip = 0.06, rated = 1450 } = {}) {
    if (!motor) return st;
    const sub = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / sub, w0 = rpm * TAU / 60, k = Tmax / (2.5 * slip * rated * TAU / 60);
    if (conflicts.some((e) => e.locked)) { st.omega = 0; st.Tm = 0; return st; }   // zakleszczony — stoi
    for (let s = 0; s < sub; s++) {
      // przełożenia ωᵢ/ω_s przy bieżącym kącie
      const eps = 1e-4, p = evalAngles(st.theta + eps), m = evalAngles(st.theta - eps);
      let J = 0;
      for (const el of els.values()) { if (!p.has(el)) continue; el.r = (p.get(el) - m.get(el)) / (2 * eps); J += (el.J || 0) * el.r * el.r; }
      const rOut = out ? out.r : 0, etaOut = out ? out.eta : 1;
      // moment silnika: proporcjonalny do poślizgu (falownik ustawia prędkość synchroniczną), ograniczony do krytycznego
      const Tm = Math.max(-Tmax, Math.min(Tmax, k * (w0 - st.omega)));
      const wOut = st.omega * rOut, fric = 0.002 * st.omega + Math.sign(st.omega) * 0.05;   // opory łożysk i uszczelnień
      let Tl = brake * Math.abs(rOut) / etaOut, a;
      if (Math.abs(wOut) < 1e-3 && Math.abs(Tm - fric) <= Tl) { st.omega = 0; a = 0; Tl = Math.abs(Tm); }   // hamulec trzyma
      else { Tl *= Math.sign(st.omega || Tm); a = (Tm - Tl - fric) / Math.max(J, 1e-6); }
      st.omega += a * h; st.theta += st.omega * h;
      Object.assign(st, { Tm, Jeff: J, Tload: Tl, P: Tm * st.omega });
    }
    evalAngles(st.theta, true);
    // prędkości i momenty przenoszone (quasi-statycznie: moc hamulca przechodzi przez łańcuch napędu ze sprawnościami)
    const Pout = out ? brake * Math.abs(st.omega * out.r) : 0;
    for (const el of els.values()) {
      el.omega = st.omega * el.r;
      el.T = out && Math.abs(el.r) > 1e-9 ? brake * Math.abs(out.r / el.r) * (el.eta / out.eta) : 0;
    }
    if (motor) motor.T = st.Tm;
    st.Pout = Pout;
    return st;
  }

  // pose(θ) — ustawia kąt silnika (źródła) bez dynamiki: kąty i przełożenia wszystkich elementów (podgląd, laboratorium)
  function pose(t) {
    const eps = 1e-4, p = evalAngles(t + eps), m = evalAngles(t - eps);
    for (const el of els.values()) if (p.has(el)) el.r = (p.get(el) - m.get(el)) / (2 * eps);
    evalAngles(t, true); st.theta = t;
  }
  return { add, connect, solve, step, pose, els, edges, state: st, get order() { return order; }, get conflicts() { return conflicts; } };
}
