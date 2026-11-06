// Zachowanie „ciąg w próżni” (środowisko: kosmos) — statek jako bryła sztywna bez oporu i bez grawitacji.
// Siły: ciąg głównego silnika wzdłuż osi statku (naprzód) i słabszy ciąg wsteczny; momenty: silniczki manewrowe
// (RCS) wokół trzech osi. Nic nie hamuje samo: prędkość i obrót zostają, dopóki siła ich nie zmieni (I zasada
// dynamiki). Stabilizacja (jak SAS w prawdziwych statkach): gdy gracz nie obraca statkiem, te same silniczki
// manewrowe dają moment przeciwny do obrotu — to siła, nie zatrzymanie obrotu w kodzie, więc ma swoją granicę
// (maksymalny moment) i trwa tyle, ile wynika z bezwładności.
// Układ statku: +z przód (dziób), +y góra, +x lewa burta (jak modele w scenie po obrocie, js/scene/prefabs.js).
//
// createThrust(def, { p: [x, y, z], yaw, pitch }) → { state, step(dt, c) }
//   def: { mass [kg], thrust [N] (silnik główny), reverse [N] (wsteczny), torque [N·m] (silniczki manewrowe na oś),
//          inertia [kg·m²] (moment bezwładności, jeden na wszystkie osie — przybliżenie bryły) }
//   c: { throttle −1…1 (ujemny — wsteczny), pitch, yaw, roll −1…1 (dodatnie: nos w górę, nos w lewo, przechył w prawo),
//        stabilize (domyślnie true) }
//   state: p, v ([x, y, z] m, m/s), q ([w, x, y, z]), w (prędkość kątowa w układzie statku, rad/s), speed, thrust
export const ENVIRONMENTS = ['space'];

const qMul = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
export function qRot(q, v) {                                    // obrót wektora v kwaternionem q
  const r = qMul(qMul(q, [0, v[0], v[1], v[2]]), [q[0], -q[1], -q[2], -q[3]]);
  return [r[1], r[2], r[3]];
}
const qNorm = (q) => { const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return q.map((x) => x / n); };
const qAxis = (ax, a) => [Math.cos(a / 2), ax[0] * Math.sin(a / 2), ax[1] * Math.sin(a / 2), ax[2] * Math.sin(a / 2)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function createThrust(def, { p = [0, 0, 0], yaw = 0, pitch = 0 } = {}) {
  const D = { mass: 2e4, thrust: 4e5, reverse: 1e5, torque: 1.2e5, inertia: 4e5, ...def };
  const s = {
    p: [...p], v: [0, 0, 0], w: [0, 0, 0],
    q: qNorm(qMul(qAxis([0, 1, 0], yaw), qAxis([1, 0, 0], -pitch))),   // kurs wokół pionu, potem pochylenie (nos w górę)
    speed: 0, thrust: 0,
  };
  return {
    state: s, def: D, qRot,
    step(dt, c = {}) {
      // ciąg: ułamek silnika głównego naprzód albo wstecznego w tył, wzdłuż osi statku
      const thr = clamp(c.throttle || 0, -1, 1), F = thr >= 0 ? thr * D.thrust : thr * D.reverse;
      const fwd = qRot(s.q, [0, 0, 1]);
      for (let i = 0; i < 3; i++) s.v[i] += (fwd[i] * F / D.mass) * dt;
      for (let i = 0; i < 3; i++) s.p[i] += s.v[i] * dt;
      // momenty silniczków manewrowych (układ statku: x — pochylenie, y — kurs, z — przechył)
      const want = [-(c.pitch || 0), c.yaw || 0, c.roll || 0];
      const stab = c.stabilize !== false;
      for (let i = 0; i < 3; i++) {
        let M = clamp(want[i], -1, 1) * D.torque;
        if (stab && !want[i]) M = clamp(-s.w[i] * D.inertia / Math.max(dt, 1e-3), -D.torque, D.torque);   // przeciw obrotowi, nie więcej niż silniczki
        s.w[i] += (M / D.inertia) * dt;
      }
      // obrót orientacji o prędkość kątową (w układzie statku)
      const a = Math.hypot(s.w[0], s.w[1], s.w[2]) * dt;
      if (a > 1e-9) s.q = qNorm(qMul(s.q, qAxis(s.w.map((x) => x * dt / a), a)));
      s.speed = Math.hypot(s.v[0], s.v[1], s.v[2]); s.thrust = F;
    },
  };
}
