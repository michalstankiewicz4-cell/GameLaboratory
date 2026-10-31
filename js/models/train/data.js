// TrainKit — dane taboru: wymiary pojazdów, profil koła, zderzaki, sprzęgi.
// Jedno źródło liczb dla modelu (js/models/train) i dla przyszłego zachowania
// „koło na szynie” (środowisko ląd). Wartości przeniesione bez zmian z aTrain
// (js/physics.js), tam liczone na CPU w prawdziwej fizyce koło–szyna.
// Jednostki: metry, kilogramy, N/m.

// tor
export const RAIL_HALF = 0.7535;          // oś szyny od osi toru (1435/2 + 72/2 mm)
export const BTB = 0.68;                  // połowa rozstawu wewnętrznych powierzchni kół (1360 mm)
export const SLEEPER_TOP = -0.172;        // wierzch podkładu (główka szyny = 0)
export const SL = { hx: 0.125, hy: 0.08, hz: 1.3, yc: SLEEPER_TOP - 0.08, step: 0.65 };   // podkład: półwymiary, środek, rozstaw

// zderzaki i haki (od czołownicy)
export const BUF_EXT = 0.62;              // wysięg zderzaka
export const BUF_Y = 1.06;                // wysokość zderzaków nad główką szyny
export const BUF_Z = 0.875;               // rozstaw zderzaków (od osi)
export const HOOK_EXT = 0.30;             // wysięg haka cięgłowego
export const SLACK = 0.02;                // luz sprzęgu

// zawieszenie
export const SPRING_LEQ = 0.35;           // długość sprężyny w położeniu równowagi

// zestaw kołowy (masa i bezwładność do fizyki)
export const WS_MASS = 1200;
export const WS_I = [600, 600, 80];

// pojazdy: Lb długość pudła, wb rozstaw osi, comY środek masy nad główką szyny,
// Rw promień koła, dims bryła do bezwładności i kolizji [L, H, W], kv/kl/kx sztywności zawieszenia
export const VEH = {
  loco: { Lb: 9.0, wb: 4.6, comY: 1.45, Rw: 0.5, mass: 18000, dims: [9, 2.6, 3.0], kv: 1.3e6, kl: 1.5e6, kx: 6e6, driven: true },
  wagon: { Lb: 9.4, wb: 5.6, comY: 1.75, Rw: 0.46, mass: 12000, dims: [9.4, 2.8, 2.9], kv: 1.2e6, kl: 1.2e6, kx: 5e6, driven: false },
};

// profil koła: a = odległość od wewnętrznej powierzchni koła [m], δ = r − r_nom [m]
export const PROFILE = [[0, 0.012], [0.003, 0.020], [0.008, 0.026], [0.014, 0.028], [0.020, 0.026], [0.025, 0.020],
  [0.029, 0.013], [0.033, 0.007], [0.037, 0.003], [0.042, 0.0014], [0.135, -0.00325]];
export function profileDelta(a) {
  for (let i = 1; i < PROFILE.length; i++) {
    if (a <= PROFILE[i][0]) {
      const [a0, d0] = PROFILE[i - 1], [a1, d1] = PROFILE[i];
      return d0 + (d1 - d0) * (a - a0) / (a1 - a0);
    }
  }
  return PROFILE[PROFILE.length - 1][1];
}

// sprzęg kłowy: kształty głowicy w jej układzie (x: do przodu, ku drugiej głowicy; z: w bok),
// odcinki z promieniem; wysokość ±hh. [0] dno gardzieli, [1] ściana po stronie kości,
// [2] nos kości, [3] ogon kości (2 i 3 obracają się na sworzniu), [4] ramię prowadzące.
export const KN = { mass: 150, I: [2.3, 14, 14], palm: 0.3, pivot: -0.6, gap: 0.305, hh: 0.14,
  shapes: [{ a: [0.2, -0.10], b: [0.2, 0.10], r: 0.04 }, { a: [0.3, 0.16], b: [0.5, 0.16], r: 0.04 }, { a: [0.5, 0.16], b: [0.5, -0.06], r: 0.04 },
    { a: [0.5, 0.16], b: [0.36, 0.16], r: 0.04 }, { a: [0.3, -0.25], b: [0.54, -0.29], r: 0.04 }] };
export const KN_EP = BUF_EXT - KN.gap / 2;   // wysięg czoła głowicy od czołownicy
export const KN_OPEN = 1.6;                  // kąt pełnego otwarcia kości [rad]

// łańcuch: N ogniw, g szczelina, rw promień pręta, rr promień zagięcia ogniwa
export const CH = { N: 5, g: 0.005, m: 3, I: [0.004, 0.008, 0.008], kc: 1e8, cc: 6e3, sub: 10, kr: 2, cf: 0.03, rw: 0.013, rr: 0.035 };

// położenia sprężyn i zestawów kołowych w układzie pudła (początek w środku masy)
export function layout(type) {
  const d = VEH[type], springs = [], ws = [];
  for (const sx of [1, -1]) {
    ws.push({ x: sx * d.wb / 2, y: d.Rw - d.comY, Rw: d.Rw });
    for (const sz of [1, -1]) springs.push({ sx, ax: sx * d.wb / 2, ay: d.Rw + SPRING_LEQ - d.comY, az: sz * 1.0, wz: sz * 1.0 });
  }
  return { def: d, springs, ws };
}
