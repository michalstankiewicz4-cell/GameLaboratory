// Zachowanie „mała jednostka na wodzie” (środowisko: woda, amfibia także ląd) — łódź, barka, ślizgacz na płatach,
// pojazd podwodny i amfibia jako bryła sztywna, liczona z sił (zastępuje sprężyny w MarineKit.update i kinematyczne
// VehicleKit.drive dla tych jednostek).
//
// Siły i momenty:
//   - napęd: moc śrub P (F = η·P / max(v, v0)), wstecz ułamek mocy; opór wody ∝ v² (dobrany tak, że na prędkości
//     maksymalnej równa się ciągowi); opór boczny (kil, kadłub) — jednostka nie płynie bokiem;
//   - ster: moment ∝ prędkość² (opływ steru), do skrętu o promieniu turnRadius; tłumienie obrotu kadłubem;
//     pędniki azymutalne (azimuth) — moment także w miejscu;
//   - wyporność: ρ·g·(zanurzona objętość) — prostopadłościan pod linią wodną (pole wodnicy × zanurzenie), w górę;
//     przegłębienie i przechył: momenty prostujące wodnicy ρ·g·I do płaszczyzny fali pod kadłubem, z tłumieniem;
//   - płaty nośne (foils): siła nośna ½ρ·CL·A·v², tylko gdy płaty są w wodzie — przy prędkości kadłub wychodzi z wody,
//     a nośność maleje, kiedy płaty zbliżają się do powierzchni (równowaga na płatach bez warunku w kodzie);
//   - nurkowanie (maxDepth): pędniki pionowe ciągną do zadanej głębokości (siła ograniczona), ciało prawie
//     obojętne (wyporność całego kadłuba nieco większa niż ciężar), dno nie przepuszcza (kontakt ze sprężystością);
//   - koła (amfibia): grunt pod kołami — siła kontaktu (sprężyna i tłumik) i napęd kół do μ·N; w wodzie śruby.
//
// createCraft(def, { x, z, yaw, y }) → { state, step(dt, c, env), def }
//   def: { length, width, height, mass?, power?, maxSpeed, accel, turnRadius, maxDepth?, foils?: { speed, height },
//          wheels?: bool, azimuth?: bool, float?: [[x, z], …] (punkty pod kadłubem) }
//   c: { throttle −1…1, steer −1…1 (dodatni — w lewo), dive (zadana głębokość, m) }
//   env: { surface(x, z) → poziom wody, floor(x, z) → wysokość dna albo gruntu (nieobowiązkowe) }
//   state: x, z, yaw, u, v, r, y (linia wodna kadłuba), vy, pitch, roll, depth (zanurzenie poniżej powierzchni),
//          lift (0…1, na płatach), onLand (0…1), speed (= u)
// Układ jednostki: +z dziób, +x lewa burta, y = 0 linia wodna kadłuba (jak modele MarineKit).
export const ENVIRONMENTS = ['water', 'land'];

const G = 9.81, RHO = 1025;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function craftDef(info = {}, extra = {}) {
  const d = { ...info, ...extra };
  const L = d.length || 6, W = d.width || 2.5, H = d.height || 2;
  const Awp = 0.75 * L * W;                                        // pole wodnicy (kadłub nie jest prostopadłościanem)
  // bez danych: zanurzenie ok. 0,45 wysokości (najwyżej 1,2 m); pojazd podwodny — cały kadłub wypiera o 3 % więcej niż waży
  const mass = d.mass || (d.maxDepth ? RHO * Awp * H / 1.03 : RHO * Awp * Math.min(0.45 * H, 1.2) * 0.9);
  const vmax = d.maxSpeed || 8, power = d.power || mass * (d.accel || 1.5) * vmax * 0.6, eta = 0.6;   // śruba: sprawność ok. 0,6
  const Kd = eta * power / (vmax * vmax * vmax);                   // opór K·v²: na vmax równy ciągowi η·P / vmax
  return {
    L, W, H, Awp, mass, vmax, power: eta * power, Kd, Klat: Kd * 40, v0: d.v0 ?? 1.5, reverse: 0.5,
    T0: mass / (RHO * Awp),                                       // zanurzenie w spoczynku
    R: d.turnRadius || L * 2, azimuth: !!d.azimuth,
    Iz: mass * (L * L + W * W) / 12, Ip: mass * (L * L + H * H) / 12, Ir: mass * (W * W + H * H) / 12,
    Iwl: 0.6 * W * L * L * L / 12, Iwt: 0.6 * L * W * W * W / 12, // momenty bezwładności wodnicy (przegłębienie, przechył)
    maxDepth: d.maxDepth || 0, foils: d.foils || null, wheels: !!d.wheels, mu: 0.8,
    float: d.float || [[-W / 3, L / 3], [W / 3, L / 3], [-W / 3, -L / 3], [W / 3, -L / 3]],
  };
}

export function createCraft(def, { x = 0, z = 0, yaw = 0, y = 0 } = {}) {
  const D = def.Kd ? def : craftDef(def);
  const s = { x, z, yaw, u: 0, v: 0, r: 0, y, vy: 0, pitch: 0, vp: 0, roll: 0, vr: 0, depth: 0, lift: 0, onLand: 0, speed: 0 };
  // tłumienie ruchów pionowych: część krytycznego (fale, opływ kadłuba)
  const zeta = 0.35, wH = Math.sqrt(RHO * G * D.Awp / D.mass);
  const CLA = D.foils ? 2 * D.mass * G / (RHO * D.foils.speed * D.foils.speed) : 0;   // płaty unoszą ciężar przy foils.speed
  const Ca = D.Iz * 2 / D.L;                                       // tłumienie obrotu kadłubem
  // płaszczyzna dopasowana do wysokości w punktach (x, z): h = a + b·x + c·z
  const fit = (pts, hs) => {
    let n = pts.length, sx = 0, sz = 0, sy = 0, sxx = 0, szz = 0, sxz = 0, sxy = 0, szy = 0;
    pts.forEach(([px, pz], i) => { const h = hs[i]; sx += px; sz += pz; sy += h; sxx += px * px; szz += pz * pz; sxz += px * pz; sxy += px * h; szy += pz * h; });
    const mx = sx / n, mz = sz / n, my = sy / n, cxx = sxx / n - mx * mx, czz = szz / n - mz * mz, cxz = sxz / n - mx * mz;
    const cxy = sxy / n - mx * my, czy = szy / n - mz * my, det = cxx * czz - cxz * cxz;
    if (Math.abs(det) < 1e-9) return { a: my, b: 0, c: 0 };
    const b = (cxy * czz - czy * cxz) / det, c = (czy * cxx - cxy * cxz) / det; return { a: my - b * mx - c * mz, b, c };
  };
  // punkt jednostki (x w lewo, z naprzód) → świat
  const world = (px, pz) => { const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw); return [s.x + px * cy + pz * sy, s.z - px * sy + pz * cy]; };

  function sub(h, c, env) {
    const surf = env && env.surface ? env.surface : () => 0, floorF = env && env.floor ? env.floor : null;
    const pts = D.float, ws = pts.map(([px, pz]) => surf(...world(px, pz)));
    const wp = fit(pts, ws), water = wp.a;
    const waveP = -Math.atan(wp.c), waveR = Math.atan(wp.b);
    // grunt pod kołami / dno pod kadłubem
    let ground = -1e9, gp = null;
    if (floorF) { gp = fit(pts, pts.map(([px, pz]) => floorF(...world(px, pz)))); ground = gp.a; }
    // --- pion: wyporność, płaty, pędniki pionowe, kontakt z gruntem ---
    const imm = clamp(water - s.y + D.T0, 0, D.H);                // zanurzenie kadłuba (m)
    const buoy = RHO * G * D.Awp * imm;
    const submerged = D.maxDepth ? clamp((water - s.y) / Math.max(D.H - D.T0, 0.3), 0, 1) : 0;
    let Fy = buoy - D.mass * G - 2 * zeta * wH * D.mass * s.vy * (imm > 0 ? 1 : 0.1);
    // płaty: nośność, dopóki są w wodzie (zanikają przy powierzchni)
    let lift = 0, foilsIn = 0;
    if (D.foils) {
      const foilY = s.y - D.T0 - D.foils.height, inW = clamp((water - foilY) / 0.4, 0, 1); foilsIn = inW;
      lift = 0.5 * RHO * CLA * s.u * Math.abs(s.u) * inW; Fy += Math.max(0, lift);
      s.lift = clamp(Math.max(0, lift) / (D.mass * G), 0, 1);
    }
    // nurkowanie: pędniki pionowe do zadanej głębokości (najwyżej 30 % ciężaru)
    if (D.maxDepth) {
      const want = clamp(c.dive || 0, 0, D.maxDepth), depthNow = water - s.y;
      Fy += clamp((depthNow - want) * D.mass * 0.6 - s.vy * D.mass * 0.9, -0.3 * D.mass * G, 0.3 * D.mass * G);
      s.depth = Math.max(0, depthNow);
    }
    // kontakt z gruntem (koła albo dno): sprężyna i tłumik pod spodem kadłuba
    const bottom = s.y - D.T0 - (D.wheels ? 0.55 : 0.1), pen = ground - bottom;
    let N = 0;
    if (pen > 0) { N = Math.max(0, pen * D.mass * 60 - s.vy * D.mass * 12); Fy += N; }
    s.onLand += ((N > 0.5 * D.mass * G && imm < D.T0 * 0.5 ? 1 : 0) - s.onLand) * Math.min(1, h * 4);
    s.vy += (Fy / D.mass) * h; s.y += s.vy * h;
    // --- przegłębienie i przechył: momenty prostujące wodnicy (albo gruntu pod kołami) do płaszczyzny pod spodem ---
    const onGround = N > 0.3 * D.mass * G;
    const tp = onGround && gp ? -Math.atan(gp.c) : waveP, tr = onGround && gp ? Math.atan(gp.b) : waveR;
    const kp = onGround ? D.mass * 400 : RHO * G * D.Iwl * Math.max(imm / D.H, 0.15), kr = onGround ? D.mass * 400 : RHO * G * D.Iwt * Math.max(imm / D.H, 0.15);
    const settle = 1 - 0.7 * s.lift;                               // na płatach kadłub nad falą
    const bowUp = -Math.min(Math.abs(s.u) / D.vmax, 1) * 0.05 * Math.sign(s.u) * (1 - s.lift);   // dziób unosi się pod parą
    const heel = D.maxDepth && submerged > 0.5 ? (c.steer || 0) * Math.abs(s.u) / D.vmax * 0.15 : 0;
    s.vp += ((kp * ((tp * settle + bowUp) - s.pitch) - 2 * zeta * Math.sqrt(kp * D.Ip) * s.vp) / D.Ip) * h;
    s.vr += ((kr * ((tr * settle + heel) - s.roll) - 2 * zeta * Math.sqrt(kr * D.Ir) * s.vr) / D.Ir) * h;
    s.pitch += s.vp * h; s.roll += s.vr * h;
    // --- płaszczyzna: napęd (śruby w wodzie, koła na gruncie), opór, ster ---
    const thr = clamp(c.throttle || 0, -1, 1), inWater = imm > 0.05 || submerged > 0 || foilsIn > 0;   // śruby na płatach: w wodzie
    let Fx = 0;
    if (inWater) Fx += thr * (thr < 0 ? D.reverse : 1) * D.power / Math.max(Math.abs(s.u), D.v0);
    const gov = clamp((D.vmax * 1.02 - Math.abs(s.u)) / (0.06 * D.vmax), 0, 1);       // regulator: na lądzie też do vmax
    if (D.wheels && N > 0) Fx += thr * Math.min(D.power / 0.6 / Math.max(Math.abs(s.u), 2), D.mu * N) * gov;   // koła: moc silnika na kołach
    // zbocze: grunt pcha wzdłuż swojej normalnej — pod górę hamuje, z górki pcha (h = a + b·x + c·z w układzie jednostki)
    const slopeX = N > 0 && gp ? -gp.c * N : 0, slopeL = N > 0 && gp ? -gp.b * N : 0;
    Fx += slopeX;
    // opór: prędkość maksymalna jednostki z płatami jest na płatach; kadłub w wodzie (przed wyjściem) stawia więcej
    const wet = inWater ? 1 : 0, dragK = D.Kd * (D.foils ? 1 + 1.5 * (1 - s.lift) : 1);
    Fx -= dragK * s.u * Math.abs(s.u) * wet + (D.wheels && N > 0 ? 0.03 * N * Math.tanh(s.u / 0.3) : 0) + (N > 0 && !D.wheels ? 0.5 * N * Math.tanh(s.u / 0.3) : 0);
    const Fl = -(D.Klat * s.v * Math.abs(s.v) + D.mass * 2 * s.v) * (inWater || N > 0 ? 1 : 0) + slopeL;
    // ster: moment ∝ v² (do promienia R na pełnym wychyleniu), pędniki azymutalne — także w miejscu; koła — jak auto
    const st = clamp(c.steer || 0, -1, 1);
    let M = st * Ca * (s.u * Math.abs(s.u)) / D.R / Math.max(Math.abs(s.u), 0.5) * (inWater ? 1 : 0);
    if (D.azimuth && inWater) M += st * Ca * 0.4;
    if (D.wheels && N > 0) M += st * Ca * s.u / D.R;
    M -= Ca * s.r * (inWater || N > 0 ? 1 : 0.1);
    s.u += (Fx / D.mass + s.v * s.r) * h;
    s.v += (Fl / D.mass - s.u * s.r) * h;
    s.r += (M / D.Iz) * h;
    s.yaw += s.r * h;
    s.x += (s.u * Math.sin(s.yaw) + s.v * Math.cos(s.yaw)) * h;
    s.z += (s.u * Math.cos(s.yaw) - s.v * Math.sin(s.yaw)) * h;
    s.speed = s.u;
  }

  return {
    state: s, def: D,
    step(dt, c = {}, env) { const n = Math.max(1, Math.ceil(dt / (1 / 240))), hh = dt / n; for (let i = 0; i < n; i++) sub(hh, c, env); return s; },
  };
}
