// Zachowanie „orbita” (środowisko: kosmos) — ciało krąży wokół innego ciała pod jego grawitacją.
//
// Siła: przyciąganie środka a = −μ·r / |r|³ (prawo grawitacji Newtona, μ = G·M środka). Ruch liczony całkowaniem
// (prędkość Verleta, krok 1/240 s) we współrzędnych względem środka — środek sam może się ruszać (księżyc wokół
// planety, która krąży wokół słońca). Nic nie jest przyklejone do toru: elipsa wynika z prędkości i grawitacji.
//
// orbitDef({ r, period }) — μ dobrane tak, żeby orbita kołowa o promieniu r miała dany okres: μ = 4π²·r³ / T²
// (model, nie prawdziwa skala: okres w sekundach gry).
// createOrbit({ mu }, { rel: [x, y, z], vel: [x, y, z] }) → { state, step(dt) }
//   rel — położenie względem środka; vel — prędkość względem środka (orbita kołowa: circularVelocity)
// circularVelocity(rel, mu) — prędkość orbity kołowej: |v| = √(μ / r), prostopadle do r i do pionu (przeciwnie do ruchu
//   wskazówek zegara patrząc z góry); gdy r jest pionowe — wzdłuż osi X.
// state: rel, vel, r (odległość), speed, period (z bieżącej energii: okres orbity eliptycznej, ∞ gdy ucieka)
export const ENVIRONMENTS = ['space'];

const TAU = Math.PI * 2;
export const orbitMu = (r, period) => (4 * Math.PI * Math.PI * r * r * r) / (period * period);

export function circularVelocity(rel, mu) {
  const r = Math.hypot(rel[0], rel[1], rel[2]) || 1;
  // kierunek: pion × r (w płaszczyźnie prostopadłej do r), znormalizowany
  let tx = rel[2], ty = 0, tz = -rel[0];
  let l = Math.hypot(tx, ty, tz);
  if (l < 1e-6 * r) { tx = 1; ty = 0; tz = 0; l = 1; }
  const v = Math.sqrt(mu / r);
  return [tx / l * v, ty / l * v, tz / l * v];
}

export function createOrbit({ mu }, { rel, vel }) {
  const s = { rel: [...rel], vel: [...vel], r: 0, speed: 0, period: Infinity };
  const acc = (p) => { const r2 = p[0] * p[0] + p[1] * p[1] + p[2] * p[2], r = Math.sqrt(r2) || 1e-6, k = -mu / (r2 * r); return [p[0] * k, p[1] * k, p[2] * k]; };
  let a = acc(s.rel);
  function sub(h) {
    for (let i = 0; i < 3; i++) { s.vel[i] += a[i] * h / 2; s.rel[i] += s.vel[i] * h; }
    a = acc(s.rel);
    for (let i = 0; i < 3; i++) s.vel[i] += a[i] * h / 2;
  }
  function info() {
    s.r = Math.hypot(...s.rel); s.speed = Math.hypot(...s.vel);
    const e = s.speed * s.speed / 2 - mu / s.r;   // energia właściwa: < 0 — orbita zamknięta
    s.period = e < 0 ? TAU * Math.sqrt(Math.pow(-mu / (2 * e), 3) / mu) : Infinity;
  }
  info();
  return {
    state: s,
    step(dt) { const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n; for (let i = 0; i < n; i++) sub(h); info(); return s; },
  };
}
