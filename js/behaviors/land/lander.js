// Zachowanie „lądowanie” (środowisko: ląd) — statek kosmiczny nad gruntem planety: bryła sztywna pod grawitacją, w jej
// atmosferze, z silnikiem głównym, silnikami podnośnymi pod brzuchem i podporami, które opierają się o grunt.
// Statek przylatuje z kosmosu (zachowanie „ciąg w próżni”), tu siada; laboratorium: pojazdy — ląd (przełącznik środowiska).
//
// Siły (nic nie jest przyklejone: zejście, zawis, przyziemienie i przewrócenie wynikają z sił):
//   - grawitacja m·g (g z planety: js/envs/land/planet.js, Ziemia 9,81 m/s²);
//   - silnik główny wzdłuż osi statku (+z, naprzód), wsteczny w tył;
//   - silniki podnośne wzdłuż osi +y statku (pod brzuchem), 0…1 — dźwignia gracza;
//   - opór atmosfery ½·ρ·CdA·|v|·v (ρ z planety: Ziemia 1,225 kg/m³, Luna 0);
//   - podpory (contacts — punkty pod kadłubem): sprężyna z tłumikiem w głąb gruntu, tarcie o grunt (μ), moment z ramienia;
//   - silniczki manewrowe (RCS) z stabilizacją jak w „ciągu w próżni”.
// Przyziemienie szybsze niż crashSpeed (domyślnie 5 m/s w pionie) — state.crashed (podpory złamane; fizyka liczy dalej).
//
// landerDef(numbers, box) — liczby statku (masa, ciąg, moment, bezwładność; js/scene/behaviors.js SPACE_NUMBERS) i jego
//   obrys { min: [x, y, z], max: [x, y, z] } w układzie statku → def: podpory w rogach spodu, CdA z przekroju, siła
//   silników podnośnych (lift: 1,5 × ciężar na Ziemi, gdy brak danych — założone)
// createLander(def, { p, yaw, pitch }) → { state, step(dt, c, env), def }
//   c: { throttle −1…1, lift 0…1, pitch, yaw, roll −1…1, stabilize }
//   env: { g, rho, ground(x, z) → wysokość gruntu }
//   state: p, v, q ([w, x, y, z]), w, speed, vs (prędkość pionowa), alt (nad gruntem pod środkiem), onGround, crashed
import { qRot } from '../space/thrust.js';

export const ENVIRONMENTS = ['land'];

const qMul = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
const qNorm = (q) => { const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return q.map((x) => x / n); };
const qAxis = (ax, a) => [Math.cos(a / 2), ax[0] * Math.sin(a / 2), ax[1] * Math.sin(a / 2), ax[2] * Math.sin(a / 2)];
const qConj = (q) => [q[0], -q[1], -q[2], -q[3]];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function landerDef(n = {}, box = { min: [-2, -1, -5], max: [2, 1, 5] }) {
  const mass = n.mass || 2e4, [x0, y0, z0] = box.min, [x1, y1, z1] = box.max;
  const W = x1 - x0, H = y1 - y0, L = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const contacts = [[cx - W * 0.3, y0, cz - L * 0.3], [cx + W * 0.3, y0, cz - L * 0.3], [cx - W * 0.3, y0, cz + L * 0.3], [cx + W * 0.3, y0, cz + L * 0.3]];
  return {
    mass, thrust: n.thrust || 4e5, reverse: n.reverse || 1e5, torque: n.torque || 1.2e5, inertia: n.inertia || 4e5,
    lift: n.lift || 1.5 * mass * 9.81, cda: n.cda || 0.6 * (W * H + L * W) / 2, mu: n.mu ?? 0.6, crashSpeed: n.crashSpeed ?? 5,
    contacts,
  };
}

export function createLander(def, { p = [0, 0, 0], yaw = 0, pitch = 0 } = {}) {
  const D = def.contacts ? def : landerDef(def);
  const s = { p: [...p], v: [0, 0, 0], w: [0, 0, 0], q: qNorm(qMul(qAxis([0, 1, 0], yaw), qAxis([1, 0, 0], -pitch))),
    speed: 0, vs: 0, alt: 0, onGround: false, crashed: false, impact: 0 };
  // podpora: sprężyna ugina się ok. 0,15 m pod ciężarem na Ziemi (cztery podpory), tłumienie bliskie krytycznego
  const k = D.mass * 9.81 / (D.contacts.length * 0.15), cd = 2 * 0.8 * Math.sqrt(k * D.mass / D.contacts.length);
  let touching = false;
  function sub(h, c, env) {
    const g = env.g ?? 9.81, rho = env.rho ?? 1.225, ground = env.ground || (() => 0);
    const F = [0, -D.mass * g, 0], M = [0, 0, 0];
    // silniki: główny wzdłuż +z statku, podnośne wzdłuż +y statku
    const thr = clamp(c.throttle || 0, -1, 1), Fm = thr >= 0 ? thr * D.thrust : thr * D.reverse, Fl = clamp(c.lift || 0, 0, 1) * D.lift;
    const fwd = qRot(s.q, [0, 0, 1]), up = qRot(s.q, [0, 1, 0]);
    for (let i = 0; i < 3; i++) F[i] += fwd[i] * Fm + up[i] * Fl;
    // opór atmosfery
    const V = Math.hypot(...s.v);
    for (let i = 0; i < 3; i++) F[i] -= 0.5 * rho * D.cda * V * s.v[i];
    // podpory na gruncie
    let any = false;
    for (const cp of D.contacts) {
      const r = qRot(s.q, cp), x = s.p[0] + r[0], y = s.p[1] + r[1], z = s.p[2] + r[2], pen = ground(x, z) - y;
      if (pen <= 0) continue;
      any = true;
      const wW = qRot(s.q, s.w), vp = [s.v[0] + wW[1] * r[2] - wW[2] * r[1], s.v[1] + wW[2] * r[0] - wW[0] * r[2], s.v[2] + wW[0] * r[1] - wW[1] * r[0]];
      if (!touching && -vp[1] > s.impact) s.impact = -vp[1];
      const N = Math.max(0, k * pen - cd * vp[1]);
      const vt = Math.hypot(vp[0], vp[2]), ft = vt > 1e-4 ? Math.min(D.mu * N, D.mass * vt / (h * D.contacts.length)) / vt : 0;
      const f = [-vp[0] * ft, N, -vp[2] * ft];
      for (let i = 0; i < 3; i++) F[i] += f[i];
      const m = cross(r, f); for (let i = 0; i < 3; i++) M[i] += m[i];
    }
    if (any && !touching && s.impact > D.crashSpeed) s.crashed = true;
    touching = any; if (!any) s.impact = 0;
    // ruch postępowy
    for (let i = 0; i < 3; i++) { s.v[i] += F[i] / D.mass * h; s.p[i] += s.v[i] * h; }
    // obrót: silniczki manewrowe (ze stabilizacją) i moment podpór (do układu statku)
    const Mb = qRot(qConj(s.q), M), want = [-(c.pitch || 0), c.yaw || 0, c.roll || 0], stab = c.stabilize !== false;
    for (let i = 0; i < 3; i++) {
      let R = clamp(want[i], -1, 1) * D.torque;
      if (stab && !want[i]) R = clamp(-s.w[i] * D.inertia / Math.max(h * 8, 1e-3), -D.torque, D.torque);
      s.w[i] += ((R + Mb[i]) / D.inertia) * h;
    }
    const a = Math.hypot(s.w[0], s.w[1], s.w[2]) * h;
    if (a > 1e-9) s.q = qNorm(qMul(s.q, qAxis(s.w.map((x) => x * h / a), a)));
    s.onGround = any;
  }
  return {
    state: s, def: D,
    step(dt, c = {}, env = {}) {
      const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
      for (let i = 0; i < n; i++) sub(h, c, env);
      s.speed = Math.hypot(...s.v); s.vs = s.v[1]; s.alt = s.p[1] - (env.ground ? env.ground(s.p[0], s.p[2]) : 0);
      return s;
    },
  };
}
