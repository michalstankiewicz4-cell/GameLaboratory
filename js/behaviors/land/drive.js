// Zachowanie „jazda po lądzie” (środowisko: ląd) — pojazd kołowy albo gąsienicowy jako bryła sztywna w płaszczyźnie
// gruntu, liczony z sił (zastępuje kinematyczne VehicleKit.drive, w którym prędkość „dążyła” do celu).
//
// Siły:
//   - napęd: moc silnika P (F = P / v, ograniczona przyczepnością μ·N i siłą przy ruszaniu P / v0); wsteczny ułamek mocy;
//   - hamulce: gdy dźwignia przeciw ruchowi — siła do μ·N, przeciw prędkości;
//   - opory: toczenia Crr·N i powietrza ½ρ·CdA·v² (CdA wyliczone z mocy i prędkości maksymalnej — tam opory = napęd);
//   - zbocze: składowa ciężaru m·g·sin(nachylenie) wzdłuż pojazdu (z wysokości gruntu pod przodem i tyłem);
//   - opony (koła): model jednośladowy — siła boczna osi z kąta znoszenia (sztywność Cα), najwyżej μ·N osi; skręt kół
//     do kąta, przy którym promień zawracania = turnRadius;
//   - gąsienice (turnRadius 0): siła każdej gąsienicy z dźwigni i skrętu (różnica), moment oporu skrętu μt·m·g·L/4,
//     opór boczny (gąsienice nie jadą bokiem);
//   - woda (gdy grunt pod pojazdem jest pod wodą): opór wody ½·ρw·Cd·A·v² i wyporność (mniej docisku → mniej
//     przyczepności) — pojazd lądowy w głębokiej wodzie staje sam, bez warunku „stop przy wodzie”.
// Nic nie jest przyklejone: start, skręt, poślizg i zatrzymanie wynikają z sił.
//
// createDrive(def, { x, z, yaw }) → { state, step(dt, c, ground), def }
//   def: { mass [kg], power [W] (silnika; na kołach × eta 0.85), maxSpeed [m/s] (regulator), turnRadius [m] (0 — gąsienice),
//          wheelbase [m] (gąsienice: długość styku), gauge / track (rozstaw gąsienic), length, width, height,
//          mu (przyczepność, 0.9 asfalt / 0.6 grunt), crr, accel (stare dane: gdy brak mocy — moc z przyspieszenia) }
//   c: { throttle −1…1, steer −1…1 (dodatni — w lewo), brake 0…1 }
//   ground: { height(x, z) → wysokość gruntu [m], water(x, z) → poziom wody albo null } (nieobowiązkowe: płasko, sucho)
//   state: x, z, yaw (kurs; przód = (sin yaw, cos yaw)), u (prędkość naprzód), v (w bok, w lewo), r (prędkość obrotu),
//          speed (= u), steer (kąt kół, rad), slip (poślizg 0…1), depth (woda pod pojazdem, m)
// Układ pojazdu: +z przód, +x lewa strona, +y góra (jak modele w laboratoriach).
export const ENVIRONMENTS = ['land'];

const G = 9.81, RHO = 1.225, RHO_W = 1000;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// liczby pojazdu z danych modelu: brakujące wyprowadzone (moc z przyspieszenia, masa z wielkości) — zob. docs/behaviors
export function driveDef(info = {}, extra = {}) {
  const d = { ...info, ...extra };
  const L = d.length || 4, W = d.width || 2, H = d.height || 2;
  const mass = d.mass || 450 * L * W;                                   // pojazd bez danych: ok. 450 kg na m² obrysu
  const vmax = d.maxSpeed || 15;
  const power = d.power || mass * (d.accel || 2) * vmax * 0.6;          // tyle mocy, żeby ruszyć z „accel” i dojść do vmax
  const tracked = !d.turnRadius;
  const crr = d.crr ?? (tracked ? 0.045 : 0.015);
  const eta = d.eta ?? 0.85;                                             // sprawność przeniesienia napędu
  // na vmax opory = napęd; gdy wychodzi więcej niż opływ bryły (≈ 1,1 × przekrój), prędkość ogranicza regulator silnika
  const cda = Math.min(1.1 * W * H, Math.max(0.3, (eta * power / vmax - crr * mass * G) / (0.5 * RHO * vmax * vmax)));
  return {
    mass, power: eta * power, vmax, cda, crr, tracked, L, W, H, gauge: d.gauge || d.track || W * 0.8,
    contact: tracked ? (d.wheelbase || L * 0.6) : 0,                      // gąsienice: długość styku z gruntem
    wheelbase: d.wheelbase || L * 0.6, mu: d.mu ?? 0.85, v0: d.v0 ?? 2.5, reverse: d.reverse ?? 0.4,
    steerMax: tracked ? 0 : Math.atan((d.wheelbase || L * 0.6) / Math.max(1, d.turnRadius)), steerRate: d.steerRate ?? 1.6,
    Iz: mass * (L * L + W * W) / 12, turnMu: d.turnMu ?? 0.5,
  };
}

export function createDrive(def, { x = 0, z = 0, yaw = 0 } = {}) {
  const D = def.mass && def.Iz ? def : driveDef(def);
  const s = { x, z, yaw, u: 0, v: 0, r: 0, speed: 0, steer: 0, slip: 0, depth: 0 };
  const a = D.wheelbase / 2, b = D.wheelbase / 2;          // środek masy pośrodku rozstawu osi
  const Ca = 10 * D.mass * G / 2;                           // sztywność boczna osi (≈ 10 × nacisk osi, na radian)

  // regulator obrotów: silnik przestaje ciągnąć tuż pod prędkością maksymalną (np. czołg 67 km/h)
  const gov = (u) => clamp((D.vmax * 1.02 - Math.abs(u)) / (0.06 * D.vmax), 0, 1);
  function sub(h, c, gr) {
    const fwd = [Math.sin(s.yaw), Math.cos(s.yaw)];
    // grunt: nachylenie wzdłuż pojazdu i woda pod środkiem
    let slope = 0, depth = 0;
    if (gr && gr.height) {
      const hf = gr.height(s.x + fwd[0] * D.L / 2, s.z + fwd[1] * D.L / 2), hr = gr.height(s.x - fwd[0] * D.L / 2, s.z - fwd[1] * D.L / 2);
      slope = Math.atan2(hf - hr, D.L);
      const w = gr.water ? gr.water(s.x, s.z) : null, g0 = gr.height(s.x, s.z);
      if (w != null && w > g0) depth = w - g0;
    }
    s.depth = depth;
    const sunk = Math.min(depth, D.H), buoy = RHO_W * G * D.L * D.W * sunk * 0.5;   // kadłub do połowy szczelny
    const N = Math.max(0, D.mass * G * Math.cos(slope) - buoy);                      // docisk do gruntu
    const grip = D.mu * N;
    // napęd i hamulce wzdłuż pojazdu
    const thr = clamp(c.throttle || 0, -1, 1), u = s.u;
    let Fx;
    if (D.tracked) Fx = 0;   // gąsienice: niżej, z każdej osobno
    else if (thr * u < -0.3 || c.brake) Fx = -Math.sign(u) * grip * 0.9 * Math.max(Math.abs(thr), c.brake || 0);   // hamowanie
    else { const P = D.power * (thr < 0 ? D.reverse : 1); Fx = thr * Math.min(P / Math.max(Math.abs(u), D.v0), grip) * gov(u); }
    // opory: toczenia, powietrza, wody, zbocza
    const vAbs = Math.hypot(s.u, s.v);
    const roll = D.crr * N * Math.tanh(u / 0.3), air = 0.5 * RHO * D.cda * u * Math.abs(u);
    const wDrag = 0.5 * RHO_W * 1.0 * D.W * sunk * u * Math.abs(u), grav = D.mass * G * Math.sin(slope);
    let Fl = 0, M = 0;
    if (!D.tracked) {
      // skręt kół: do kąta z dźwigni, z ograniczoną szybkością
      const want = clamp(c.steer || 0, -1, 1) * D.steerMax;
      s.steer += clamp(want - s.steer, -D.steerRate * h, D.steerRate * h);
      const ue = Math.max(Math.abs(u), 1.5) * Math.sign(u || 1);
      const af = s.steer - Math.atan((s.v + a * s.r) / ue), ar = -Math.atan((s.v - b * s.r) / ue);
      const lim = grip / 2, Fyf = clamp(Ca * af, -lim, lim), Fyr = clamp(Ca * ar, -lim, lim);
      s.slip = Math.max(Math.abs(Ca * af), Math.abs(Ca * ar)) > lim ? 1 : 0;
      Fl = Fyf * Math.cos(s.steer) + Fyr; M = a * Fyf * Math.cos(s.steer) - b * Fyr;
      Fx -= Fyf * Math.sin(s.steer);
    } else {
      // gąsienice: lewa i prawa z dźwigni ± skrętu; każda do połowy przyczepności
      const st = clamp(c.steer || 0, -1, 1), left = clamp(thr - st, -1, 1), right = clamp(thr + st, -1, 1);
      const side = (k, vs) => {
        if (k * vs < -0.3) return -Math.sign(vs) * grip / 2 * Math.abs(k);   // gąsienica hamuje
        const P = D.power / 2 * (k < 0 ? D.reverse : 1); return k * Math.min(P / Math.max(Math.abs(vs), D.v0), grip / 2) * gov(vs);
      };
      const B = D.gauge, FlT = side(left, s.u - s.r * B / 2), FrT = side(right, s.u + s.r * B / 2);
      Fx = FlT + FrT;
      M = (FrT - FlT) * B / 2 - D.turnMu * N * D.contact / 4 * Math.tanh(s.r / 0.05);   // moment z różnicy minus opór skrętu (μt·N·l/4)
      Fl = -clamp(s.v * D.mass * 8, -grip, grip);                                     // gąsienice nie jadą bokiem
      s.steer = 0; s.slip = 0;
    }
    // ruch: m(u̇ − v·r) = ΣF wzdłuż, m(v̇ + u·r) = ΣF w bok, Iz·ṙ = M (układ pojazdu)
    const Fu = Fx - roll - air - wDrag - grav;
    const wSide = 0.5 * RHO_W * 1.0 * D.L * sunk * s.v * Math.abs(s.v);
    s.u += (Fu / D.mass + s.v * s.r) * h;
    s.v += ((Fl - wSide) / D.mass - s.u * s.r) * h;
    s.r += (M / D.Iz) * h - (vAbs < 0.05 && !thr ? s.r * Math.min(1, 20 * h) : 0);   // na postoju tarcie gasi obrót
    if (Math.abs(s.u) < 0.02 && !thr) s.u = 0;                                        // tarcie spoczynkowe
    s.yaw += s.r * h;
    s.x += (s.u * Math.sin(s.yaw) + s.v * Math.cos(s.yaw)) * h;
    s.z += (s.u * Math.cos(s.yaw) - s.v * Math.sin(s.yaw)) * h;
    s.speed = s.u;
  }

  return {
    state: s, def: D,
    step(dt, c = {}, ground) { const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n; for (let i = 0; i < n; i++) sub(h, c, ground); return s; },
  };
}
