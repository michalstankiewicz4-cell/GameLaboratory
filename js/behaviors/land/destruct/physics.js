// Fizyka odłamków i przedmiotów (środowisko ląd): bryła sztywna z grawitacją, oporem powietrza, wiatrem (siła
// oporu 0,5·ρ·Cd·A·|u−v|·(u−v)) i zderzeniem z gruntem — najgłębszy narożnik bryły, impuls z odbiciem i tarciem
// (obraca bryłę: uderzenie narożnikiem przewraca ją jak prawdziwą). Kawałek, który się nie rusza, zasypia.
// Body: { p, q, v, w, m, I (moment bezwładności, skalar), pts (narożniki w układzie bryły), r, A (pole przekroju),
//   state 'active' | 'sleep' | 'held' | 'static', onLand(body, speed) }
import * as THREE from '../../../../vendor/three/three.module.js';

export const G = 9.81, RHO = 1.2;
const _c = new THREE.Vector3(), _rc = new THREE.Vector3(), _vc = new THREE.Vector3(), _t = new THREE.Vector3(), _tmp = new THREE.Vector3(), _dq = new THREE.Quaternion(), _wind = [0, 0, 0];

export function makeBody({ p, q, v, w, m, pts, r, A, restitution = 0.25, friction = 0.6 }) {
  const I = Math.max(1e-4, 0.35 * m * r * r);
  return { p: p.clone(), q: q.clone(), v: v ? v.clone() : new THREE.Vector3(), w: w ? w.clone() : new THREE.Vector3(),
    m, I, pts, r, A: A || r * r, state: 'active', sleepT: 0, e: restitution, mu: friction, contact: false, age: 0 };
}

// env: { ground(x, z) → y, normal?(x, z, out), wind?(x, y, z, out) [m/s], windGain }
export function stepBody(b, dt, env) {
  b.age += dt;
  // siły: grawitacja, wiatr (opór względem powietrza), tłumienie
  b.v.y -= G * dt;
  let ux = 0, uy = 0, uz = 0;
  if (env.wind) { env.wind(b.p.x, b.p.y, b.p.z, _wind); ux = _wind[0]; uy = _wind[1]; uz = _wind[2]; }
  const rx = ux - b.v.x, ry = uy - b.v.y, rz = uz - b.v.z, rs = Math.hypot(rx, ry, rz);
  if (rs > 0.01) {
    const k = Math.min(1 / dt, 0.5 * RHO * 1.1 * b.A * rs / b.m * (env.windGain || 1));
    b.v.x += rx * k * dt; b.v.y += ry * k * dt; b.v.z += rz * k * dt;
    // wiatr kręci lekkimi kawałkami
    if (rs > 6) { const s = Math.min(8, rs * b.A / b.m * 0.6) * dt; b.w.x += (Math.random() - 0.5) * s; b.w.y += (Math.random() - 0.5) * s; b.w.z += (Math.random() - 0.5) * s; }
  }
  b.w.multiplyScalar(Math.max(0, 1 - 0.3 * dt));
  b.p.addScaledVector(b.v, dt);
  const wl = b.w.length();
  if (wl > 1e-6) { _dq.setFromAxisAngle(_tmp.copy(b.w).divideScalar(wl), wl * dt); b.q.premultiply(_dq).normalize(); }
  // grunt: najgłębszy narożnik
  b.contact = false;
  const gy0 = env.ground(b.p.x, b.p.z);
  if (b.p.y - b.r > gy0 + 0.05) { b.sleepT = 0; return; }
  let deep = 0, dx = 0, dy = 0, dz = 0;
  const P = b.pts;
  for (let i = 0; i < P.length; i += 3) {
    _c.set(P[i], P[i + 1], P[i + 2]).applyQuaternion(b.q);
    const wx = b.p.x + _c.x, wz = b.p.z + _c.z, pen = env.ground(wx, wz) - (b.p.y + _c.y);
    if (pen > deep) { deep = pen; dx = _c.x; dy = _c.y; dz = _c.z; }
  }
  if (deep <= 0) { b.sleepT = 0; return; }
  b.contact = true;
  b.p.y += deep;
  _rc.set(dx, dy, dz);
  _vc.copy(b.w).cross(_rc).add(b.v);                    // prędkość punktu styku
  const vn = _vc.y;                                      // normalna gruntu ≈ pion
  if (vn < 0) {
    const rcn = _t.set(0, 1, 0).cross(_rc).lengthSq();   // |r × n|²
    const j = -(1 + (vn < -1.5 ? b.e : 0)) * vn / (1 / b.m + rcn / b.I);
    const speed = -vn;
    applyImpulse(b, 0, j, 0, _rc);
    // tarcie: impuls styczny najwyżej μ·j
    _vc.copy(b.w).cross(_rc).add(b.v); _vc.y = 0;
    const vt = _vc.length();
    if (vt > 1e-4) {
      const jt = Math.min(b.mu * j, vt / (1 / b.m + _rc.lengthSq() / b.I));
      applyImpulse(b, -_vc.x / vt * jt, 0, -_vc.z / vt * jt, _rc);
    }
    if (b.onLand && speed > 2) b.onLand(b, speed);
  }
  // spoczynek
  if (b.v.lengthSq() < 0.04 && b.w.lengthSq() < 0.09) {
    b.v.multiplyScalar(0.8); b.w.multiplyScalar(0.8);
    b.sleepT += dt; if (b.sleepT > 0.7) { b.state = 'sleep'; b.v.set(0, 0, 0); b.w.set(0, 0, 0); }
  } else b.sleepT = 0;
}
export function applyImpulse(b, jx, jy, jz, rc) {
  b.v.x += jx / b.m; b.v.y += jy / b.m; b.v.z += jz / b.m;
  if (rc) { _tmp.set(jx, jy, jz); _t.copy(rc).cross(_tmp).divideScalar(b.I); b.w.add(_t); }
}
export function wake(b) { if (b.state === 'sleep') { b.state = 'active'; b.sleepT = 0; } }
