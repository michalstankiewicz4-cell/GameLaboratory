// RoadKit — ruch pojazdu kołowego wewnątrz jego grupy: koła toczą się i skręcają (Ackermann), każde koło
// podąża za podłożem (opts.contact), nadwozie siada na płaszczyźnie dopasowanej do kół na sprężynach,
// przechyla się w zakrętach i „kuca” przy przyspieszaniu, światła (mijania, stop, cofania, kierunkowskazy),
// drzwi (opts.work 0..1: drzwi kierowcy).
import * as THREE from '../../../vendor/three/three.module.js';

// koła: [{ group, spin, R, x, z, steer: bool }], body: Group nadwozia (jego y = 0 to wysokość spoczynkowa)
export function makeRig({ wheels, body, wheelbase, track, lamps, door, steerMax = 0.62 }) {
  const st = { y: 0, vy: 0, pitch: 0, vp: 0, roll: 0, vr: 0, lastSpeed: 0, door: 0, blink: 0, ax: 0, lat: 0 };
  function update(t, dt, opts = {}) {
    dt = Math.min(dt, 0.05);
    const speed = opts.speed || 0, steer = Math.max(-1, Math.min(1, opts.steer || 0));
    const contact = opts.contact || (() => 0);
    // koła: wysokość podłoża pod każdym, skręt przednich (Ackermann: koło wewnętrzne skręca mocniej)
    const hs = wheels.map((w) => contact(w.x, w.z));
    const ang = steer * steerMax;
    for (let i = 0; i < wheels.length; i++) {
      const w = wheels[i];
      w.spin.rotation.x += (speed / w.R) * dt;
      if (w.steer) {
        const R = Math.abs(ang) > 1e-3 ? wheelbase / Math.tan(Math.abs(ang)) : 1e9, inner = Math.sign(ang) * Math.sign(w.x) > 0;
        w.group.rotation.y = Math.sign(ang) * Math.atan(wheelbase / Math.max(0.1, R + (inner ? -1 : 1) * track / 2));
      }
    }
    // nadwozie: płaszczyzna przez punkty kół (najmniejsze kwadraty) + dynamika jazdy
    let sy = 0, sx = 0, sz = 0, sxx = 0, szz = 0, sxy = 0, szy = 0;
    wheels.forEach((w, i) => { sy += hs[i]; sx += w.x; sz += w.z; sxx += w.x * w.x; szz += w.z * w.z; sxy += w.x * hs[i]; szy += w.z * hs[i]; });
    const n = wheels.length, mx = sx / n, mz = sz / n, my = sy / n;
    const gx = (sxy - n * mx * my) / Math.max(1e-6, sxx - n * mx * mx), gz = (szy - n * mz * my) / Math.max(1e-6, szz - n * mz * mz);
    const accel = (speed - st.lastSpeed) / Math.max(1e-3, dt); st.lastSpeed = speed;
    st.ax += (accel - st.ax) * Math.min(1, 6 * dt);
    const lat = speed * speed * Math.tan(ang) / wheelbase;   // przyspieszenie boczne v²/R
    st.lat += (lat - st.lat) * Math.min(1, 6 * dt);
    const tY = my - mz * gz - mx * gx, tPitch = -Math.atan(gz) - Math.max(-0.05, Math.min(0.05, st.ax * 0.006)), tRoll = Math.atan(gx) + Math.max(-0.07, Math.min(0.07, st.lat * 0.009));
    const spring = (k, c, v, x, target) => (target - x) * k - v * c;
    st.vy += spring(160, 22, st.vy, st.y, tY) * dt; st.y += st.vy * dt;
    st.vp += spring(120, 18, st.vp, st.pitch, tPitch) * dt; st.pitch += st.vp * dt;
    st.vr += spring(110, 16, st.vr, st.roll, tRoll) * dt; st.roll += st.vr * dt;
    body.position.y = st.y; body.rotation.set(st.pitch, 0, st.roll, 'YXZ');
    // koła trzymają się podłoża w granicach skoku zawieszenia względem nadwozia
    for (let i = 0; i < wheels.length; i++) {
      const w = wheels[i], bodyAt = st.y - w.z * Math.tan(st.pitch) + w.x * Math.tan(st.roll);
      w.group.position.y = w.R + Math.max(bodyAt - 0.11, Math.min(bodyAt + 0.09, hs[i]));
    }
    // światła
    if (lamps) {
      const L = opts.lights ? 1 : 0, br = opts.brake || (accel < -2.5 && Math.abs(speed) > 0.5) ? 1 : 0, rev = speed < -0.2 ? 1 : 0;
      st.blink = (st.blink + dt) % 0.8; const on = st.blink < 0.4;
      lamps.set({ lights: L, brake: br, reverse: rev, left: (opts.indicator === 'left' || opts.indicator === 'hazard') && on, right: (opts.indicator === 'right' || opts.indicator === 'hazard') && on });
    }
    // drzwi kierowcy
    if (door) { st.door += ((opts.work ? 1 : 0) - st.door) * Math.min(1, 4 * dt); door.set(st.door); }
  }
  return { update, state: st };
}
