// Płyny (kategoria 4 — przepływ): własności cieczy i wzory elementów hydrauliki i instalacji wodnych. Same obliczenia,
// bez rysowania i bez sceny — wspólne dla przedmiotów, maszyny i fizyki (środowisko ląd, grawitacja g).
//   ciecz:   FLUIDS — gęstość ρ, lepkość kinematyczna ν (zależna od temperatury), moduł ściśliwości K
//   rura:    pipe(Q, { d, L, eps, zeta, fluid }) — Darcy–Weisbach: laminarnie 64/Re, burzliwie Haaland, przejście 2300–4000
//   otwór:   orifice(dp, A, Cd, rho) — Q = Cd·A·√(2Δp/ρ) ze znakiem; poniżej dpLam liniowo (bez nieskończonej pochodnej w 0)
//   pompy:   gearPump, pistonPump (pulsacja z tłoczków), centrifugal (charakterystyka H(Q) i prawa podobieństwa)
//   zawory:  relief (ciśnienie otwarcia, gradient), check (ciśnienie otwarcia), ball (pole przelotu od kąta), needle (dławik)
//   siłownik, dysza (prędkość strumienia, ciąg, wysokość), zbiornik, akumulator pęcherzowy (p·V^n = const)
export const ENV = ['land', 'water'];
export const G = 9.81, BAR = 1e5, PATM = 101325;

// ν(T) oleju z wykresu ASTM (Walther) między 40 °C a 100 °C; woda — wzór Vogla
export const FLUIDS = {
  oil: { name: 'olej hydrauliczny HLP 46', rho: 870, nu40: 46e-6, nu100: 6.8e-6, K: 1.6e9, cp: 1880 },
  water: { name: 'woda', rho: 998, K: 2.2e9, cp: 4186 },
};
export function nu(fluid, T = 40) {
  if (fluid === FLUIDS.water || fluid.name === 'woda') return 1e-6 * Math.exp(-3.7188 + 578.919 / (T + 273.15 - 137.546)) / 1.0016 / 0.998;   // μ / ρ
  const lw = (n) => Math.log10(Math.log10(n * 1e6 + 0.7)), T1 = Math.log10(313.15), T2 = Math.log10(373.15);
  const b = (lw(fluid.nu40) - lw(fluid.nu100)) / (T2 - T1), a = lw(fluid.nu40) + b * T1;
  return (10 ** (10 ** (a - b * Math.log10(T + 273.15))) - 0.7) * 1e-6;
}

// rura: Q [m³/s] → spadek ciśnienia [Pa] (znak jak Q); eps — chropowatość bezwzględna (stal ciągniona 0,015 mm, wąż 0,0016 mm)
export function friction(Re, rel) {
  const lam = 64 / Math.max(Re, 1), tur = 1 / (-1.8 * Math.log10((rel / 3.7) ** 1.11 + 6.9 / Math.max(Re, 1))) ** 2;
  if (Re <= 2300) return lam;
  if (Re >= 4000) return tur;
  const s = (Re - 2300) / 1700; return lam * (1 - s) + tur * s;   // przejście — liniowo między zakresami
}
export function pipe(Q, { d, L, eps = 0.015e-3, zeta = 0, fluid = FLUIDS.oil, T = 40 }) {
  const A = Math.PI * d * d / 4, v = Q / A, n = nu(fluid, T), Re = Math.abs(v) * d / n, f = friction(Re, eps / d);
  const dp = (f * L / d + zeta) * fluid.rho * v * Math.abs(v) / 2;
  return { dp, v, Re, f, A, regime: Re <= 2300 ? 'laminar' : Re >= 4000 ? 'turbulent' : 'transition', nu: n };
}
// przepływ przez rurę przy danym spadku (odwrotność pipe — bisekcja, monotoniczna)
export function pipeQ(dp, o) {
  const s = Math.sign(dp), t = Math.abs(dp); if (t < 1e-9) return 0;
  let lo = 0, hi = 1; while (pipe(hi, o).dp < t && hi < 1e3) hi *= 4;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (pipe(m, o).dp < t) lo = m; else hi = m; }
  return s * (lo + hi) / 2;
}

// otwór (dysza, szczelina zaworu): Cd ≈ 0,61 ostra krawędź, 0,7–0,8 szczelina suwaka
export function orifice(dp, A, Cd = 0.65, rho = 870, dpLam = 0.3 * BAR) {
  if (A <= 0) return 0;
  const k = Cd * A * Math.sqrt(2 / rho), t = Math.abs(dp);
  return Math.sign(dp) * (t >= dpLam ? k * Math.sqrt(t) : k * t / Math.sqrt(dpLam));
}

/* ---------------- pompy ---------------- */
// zębata zewnętrzna: wydajność geometryczna Vg = 2π·m²·z·b (przybliżenie: objętość wrębów obu kół), przecieki ∝ Δp
// (szczeliny czołowe i promieniowe, lepkość), sprawność hydrauliczno-mechaniczna ηhm
export function gearPump({ m = 0.0025, z = 12, b = 0.012, etaHm = 0.88, etaV = 0.93, pRated = 200 * BAR, nRated = 1450 } = {}) {
  const Vg = 2 * Math.PI * m * m * z * b, Cl = (1 - etaV) * Vg * nRated / 60 / pRated;   // współczynnik przecieków z ηv przy p i n znamionowych
  return { Vg, Cl, etaHm,
    Q: (n, dp) => Math.max(0, Vg * n / 60 - Cl * Math.max(0, dp)),          // n [obr/min], dp [Pa] → m³/s
    T: (dp) => Vg * Math.max(0, dp) / (2 * Math.PI * etaHm),                  // moment na wale [N·m]
    pulses: z };                                                              // pulsacja: z zębów na obrót (×2 koła)
}
// tłokowa (plunżerowa, wał korbowy): z tłoczków, średnica D, skok s; wydajność chwilowa = Σ A·ṡ tłoczków na tłoczeniu
export function pistonPump({ D = 0.012, s = 0.012, z = 3, etaV = 0.95, etaHm = 0.9 } = {}) {
  const A = Math.PI * D * D / 4, Vg = A * s * z;
  const inst = (th, w) => { let q = 0; for (let i = 0; i < z; i++) { const v = A * s / 2 * w * Math.sin(th + i * 2 * Math.PI / z); if (v > 0) q += v; } return q * etaV; };
  // nierównomierność: (Qmax − Qmin) / Qśr — z próbek na obrocie
  let mx = 0, mn = Infinity, sum = 0; for (let k = 0; k < 360; k++) { const q = inst(k * Math.PI / 180, 1); mx = Math.max(mx, q); mn = Math.min(mn, q); sum += q; }
  const mean = sum / 360;
  return { A, Vg, z, etaHm, inst, Q: (n) => Vg * n / 60 * etaV, T: (dp) => Vg * Math.max(0, dp) / (2 * Math.PI * etaHm), ripple: (mx - mn) / mean };
}
// odśrodkowa: wirnik D2, n0 — charakterystyka w punkcie nominalnym (H0 — wysokość przy zamkniętym zaworze, Qb, Hb — punkt
// najlepszej sprawności); H(Q, n) = H0·(n/n0)² − a·Q², prawa podobieństwa: Q ~ n, H ~ n², P ~ n³
export function centrifugal({ D2 = 0.11, n0 = 2850, Hb = null, Qb = null, etaMax = 0.62 } = {}) {
  const u2 = Math.PI * D2 * n0 / 60, H0 = Hb ? Hb * 1.25 : 0.55 * u2 * u2 / G;    // współczynnik ciśnienia ψ ≈ 1,1 (H0 ≈ 0,55·u²/g)
  const hb = Hb || H0 / 1.25, qb = Qb || 0.0028 * (D2 / 0.11) ** 3;
  const a = (H0 - hb) / (qb * qb);
  const H = (Q, n = n0) => Math.max(0, H0 * (n / n0) ** 2 - a * Q * Math.abs(Q));
  const eta = (Q, n = n0) => { const qb2 = qb * n / n0; if (qb2 <= 0) return 0; const x = Q / qb2; return Math.max(0.05, etaMax * (1 - (x - 1) ** 2)); };
  return { D2, n0, H0, Hb: hb, Qb: qb, a, u2, H, eta, Qmax: (n = n0) => Math.sqrt(H0 * (n / n0) ** 2 / a),
    P: (Q, n, rho = 998) => rho * G * Q * H(Q, n) / eta(Q, n) };
}
// punkt pracy pompy odśrodkowej w instalacji: H(Q, n) = Hstat + opory(Q) — bisekcja po Q
export function operatingPoint(pump, n, Hstat, lossH) {
  const f = (Q) => pump.H(Q, n) - Hstat - lossH(Q);
  if (f(0) <= 0) return { Q: 0, H: pump.H(0, n) };
  let lo = 0, hi = pump.Qmax(n); for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
  const Q = (lo + hi) / 2; return { Q, H: pump.H(Q, n) };
}

/* ---------------- zawory ---------------- */
// bezpieczeństwa (przelewowy, bezpośredniego działania): otwiera przy pc, w pełni otwarty przy pc + dpFull (gradient sprężyny)
export function relief({ pc = 100 * BAR, dpFull = 12 * BAR, Amax = 12e-6, Cd = 0.7 } = {}) {
  return { pc, dpFull, Amax, opening: (p) => Math.min(1, Math.max(0, (p - pc) / dpFull)), Q: (p, rho = 870) => orifice(p, Amax * Math.min(1, Math.max(0, (p - pc) / dpFull)), Cd, rho) };
}
// zwrotny z grzybkiem: otwiera przy pc (sprężynka), pole rośnie z różnicą ciśnień do pełnego przy pc + dpFull
export function check({ pc = 0.5 * BAR, dpFull = 2 * BAR, Amax = 20e-6, Cd = 0.7 } = {}) {
  return { pc, Amax, Q: (dp, rho = 870) => dp <= pc ? 0 : orifice(dp, Amax * Math.min(1, (dp - pc) / dpFull), Cd, rho) };
}
// kulowy: przelot to część wspólna otworu kuli i gniazda — kąt 0 otwarty, 90° zamknięty (pole soczewki dwóch kół)
export function ballArea(d, angle) {
  const s = Math.abs(Math.cos(Math.min(Math.PI / 2, Math.max(0, angle)))), r = d / 2, c = (1 - s) * d;   // przesunięcie środków
  if (c >= 2 * r) return 0;
  return 2 * r * r * Math.acos(c / (2 * r)) - (c / 2) * Math.sqrt(4 * r * r - c * c);
}
// dławik iglicowy: pole pierścienia między gniazdem a stożkiem iglicy (kąt 2α) przy wysunięciu h
export function needleArea(dSeat, h, alpha = 10 * Math.PI / 180) {
  const hm = (dSeat / 2) / Math.tan(alpha); h = Math.min(hm, Math.max(0, h));
  return Math.PI * h * Math.sin(alpha) * (dSeat - h * Math.sin(alpha) * Math.cos(alpha));
}

/* ---------------- siłownik, dysza, zbiorniki ---------------- */
export function cylinder({ D = 0.04, d = 0.022, stroke = 0.2, E = 210e9, mount = 'pivot' } = {}) {
  const A1 = Math.PI * D * D / 4, A2 = A1 - Math.PI * d * d / 4, I = Math.PI * d ** 4 / 64;
  const Lk = { pivot: 2, fixed: 0.7, guided: 1 }[mount] * (stroke + 0.12);              // długość wyboczeniowa (Euler, przypadek mocowania)
  return { D, d, stroke, A1, A2, phi: A1 / A2, I, Fbuckle: Math.PI * Math.PI * E * I / (Lk * Lk), Lk,
    Fout: (p) => p * A1, Fin: (p) => p * A2, vOut: (Q) => Q / A1, vIn: (Q) => Q / A2, Vfill: A1 * stroke + A2 * stroke };
}
// dysza: prędkość strumienia v = Cv·√(2Δp/ρ), wydatek Q = Cd·A·√(2Δp/ρ), ciąg F = ρ·Q·v, wysokość pionowego strumienia h = v²/2g
export function nozzle({ d = 0.004, Cd = 0.9, Cv = 0.97 } = {}) {
  const A = Math.PI * d * d / 4;
  return { A, d, Cd, Cv, v: (dp, rho = 998) => Cv * Math.sqrt(2 * Math.max(0, dp) / rho), Q: (dp, rho = 998) => orifice(dp, A, Cd, rho, 1),
    F: (dp, rho = 998) => rho * orifice(dp, A, Cd, rho, 1) * Cv * Math.sqrt(2 * Math.max(0, dp) / rho), h: (dp, rho = 998) => (Cv * Cv * 2 * Math.max(0, dp) / rho) / (2 * G),
    dp: (Q, rho = 998) => rho / 2 * (Q / (Cd * A)) ** 2 };
}
// sieć wodociągowa: ciśnienie statyczne p0, przyłącze (rura d, L, straty miejscowe z wodomierzem i zaworami ζ), zawór
// czerpalny — przelot rośnie z otwarciem pokrętła u (pełny przy ok. 80 %); wypływ swobodny do atmosfery albo pod ciśnienie pBack
// reduktor ciśnienia (pReg): za nim ciśnienie nastawione, spada nieco z przepływem (zakres proporcjonalności droop na l/s)
export function mains({ p0 = 4 * BAR, d = 0.02, L = 15, zeta = 8, tapD = 0.006, T = 15, pReg = Infinity, droop = 0.5 * BAR } = {}) {
  const fl = FLUIDS.water, rho = fl.rho, A = (u) => Math.PI * tapD * tapD / 4 * Math.min(1, Math.max(0, u) * 1.25);
  const Q = (u, pBack = 0) => {
    const a = A(u); if (a <= 0 || p0 <= pBack) return 0;
    const f = (q) => Math.min(p0 - pipe(q, { d, L, eps: 0.0015e-3, zeta, fluid: fl, T }).dp, pReg - droop * q * 1000) - pBack - rho / 2 * (q / (0.65 * a)) ** 2;
    let lo = 0, hi = 0.01; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  const pAfter = (q) => Math.min(p0 - pipe(q, { d, L, eps: 0.0015e-3, zeta, fluid: fl, T }).dp, pReg - droop * q * 1000);   // ciśnienie przed kranem
  return { p0, d, L, A, Q, pReg, pAfter, pOut: (u) => pAfter(Q(u)) };
}
// przelew rurowy: przy małym wzniesieniu h ponad krawędź — przelew kołowy (⅔·Cd·π·d·√(2g)·h^1,5), przy dużym — wypływ
// pełnym przekrojem pod wysokością h + spadek przewodu hd (mniejsza z dwóch wartości)
export const overflowQ = (h, d, hd = 0.12) => h <= 0 ? 0 : Math.min((2 / 3) * 0.6 * Math.PI * d * Math.sqrt(2 * G) * h ** 1.5, 0.6 * Math.PI * d * d / 4 * Math.sqrt(2 * G * (h + hd)));
// rotametr (przepływomierz o zmiennym przekroju): pływak w stożkowej rurce unosi się, aż szczelina pierścieniowa przepuści
// przepływ przy spadku ciśnienia równym ciężarowi pływaka w cieczy na jego przekroju: Δp = Vf·g·(ρf − ρ) / Af;
// pole szczeliny A(h) = π/4·((Df + 2h·tg α)² − Df²) rośnie liniowo z wysokością → skala niemal liniowa
export function rotameter({ Df = 0.012, Lf = 0.014, rhoF = 7900, alpha = 0.012, L = 0.1, Cd = 0.7, rho = 998 } = {}) {
  const Af = Math.PI * Df * Df / 4, Vf = Af * Lf * 0.55, dp = Vf * G * (rhoF - rho) / Af, k = Cd * Math.sqrt(2 * dp / rho);
  const A = (h) => Math.PI / 4 * ((Df + 2 * h * Math.tan(alpha)) ** 2 - Df * Df);
  return { Df, Af, Vf, dp, L, A, alpha, Qmax: k * A(L), h: (Q) => { let lo = 0, hi = L; if (Q >= k * A(L)) return L; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (k * A(m) < Q) lo = m; else hi = m; } return (lo + hi) / 2; }, Q: (h) => k * A(h) };
}
// rotametr dobrany do zakresu: zbieżność rurki α tak, by przy Qmax pływak stanął na górze skali
export function rotameterFor(Qmax, o = {}) { let lo = 0.0005, hi = 0.2; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (rotameter({ ...o, alpha: m }).Qmax < Qmax) lo = m; else hi = m; } return rotameter({ ...o, alpha: (lo + hi) / 2 }); }
// akumulator pęcherzowy: azot wstępnie p0 (ok. 0,9 p_min), objętość V0; przy ciśnieniu p objętość gazu V0·(p0/p)^(1/n);
// n = 1 izotermicznie (powoli), 1,4 adiabatycznie (szybko)
export function accumulator({ V0 = 0.7e-3, p0 = 40 * BAR } = {}) {
  const gasV = (p, n = 1.4) => p <= p0 ? V0 : V0 * (p0 / p) ** (1 / n);
  return { V0, p0, gasV, oilV: (p, n) => V0 - gasV(p, n), useful: (p1, p2, n = 1.4) => gasV(p1, n) - gasV(p2, n) };
}
