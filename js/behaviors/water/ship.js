// Zachowanie „okręt na wodzie” (środowisko woda): ruch po powierzchni w płaszczyźnie (3 stopnie swobody: naprzód,
// w bok, obrót) i kołysanie na falach z WaterKit. Naprzód: ciąg śród (moc × sprawność / prędkość, ograniczony ciągiem
// na postoju), opór kadłuba ∝ v² dobrany tak, by przy pełnej mocy wyszła prędkość maksymalna; wstecz — część ciągu.
// Obrót: ster działa tym mocniej, im szybciej płynie woda wzdłuż kadłuba (promień cyrkulacji z def), z bezwładnością;
// dryf w bok tłumiony przez kadłub. Pion: przechył, przegłębienie i zanurzenie podążają (sprężyny z tłumieniem) za
// powierzchnią fal pod kadłubem (heightAt), na szybkości dziób unosi się, rufa siada. Mielizna: gdy punkt kadłuba jest
// na lądzie (isWater(x, z) = false) — opór gruntu zatrzymuje okręt. Bez przyklejania do brzegu: tylko siły.
// Układ: +z dziób, +x lewa burta, y = 0 wodnica. Liczby okrętu: def (np. shipDef z modelu albo wyliczone z info).
import { heightAt } from '../../envs/water/waterkit.js';
export const ENVIRONMENTS = ['water'];

// def: { mass (kg), power (W), vmax (m/s), turnR (m), length, beam, bow, stern (z dziobu i rufy na wodnicy) }
export function createShip(def, { x = 0, z = 0, th = 0 } = {}) {
  const k = def.power * 0.6 / def.vmax ** 3, Tst = def.power * 0.6 / Math.max(3, def.vmax * 0.6), m = def.mass * 1.08;
  const s = { x, z, th, vf: 0, vs: 0, r: 0, throttle: 0, rudder: 0, heave: 0, pitch: 0, roll: 0, vh: 0, vp: 0, vr: 0, aground: false, shift: 0 };
  const spring = (x, v, target, T, zeta, dt) => { const w = 2 * Math.PI / T, a = w * w * (target - x) - 2 * zeta * w * v; v += a * dt; return [x + v * dt, v]; };
  // c: { throttle −0,4..1, rudder −1..1 (dodatni: w prawo) }; waves: z WaterKit (waveSet), t: czas, isWater(x, z)
  function step(dt, c = {}, waves = [], t = 0, isWater = () => true) {
    s.throttle += (Math.max(-0.4, Math.min(1, c.throttle ?? 0)) - s.throttle) * Math.min(1, dt / 10);   // turbiny przyspieszają powoli
    s.rudder += (Math.max(-1, Math.min(1, c.rudder ?? 0)) - s.rudder) * Math.min(1, dt / 1.5);       // płetwa sterowa wychyla się w ok. 1,5 s
    const v = s.vf, T = s.throttle >= 0 ? Math.min(Tst * s.throttle, def.power * 0.6 * s.throttle / Math.max(Math.abs(v), 3)) : Tst * 0.5 * s.throttle;
    let F = T - k * v * Math.abs(v) * (1 + 0.6 * Math.abs(s.rudder));   // wychylony ster i cyrkulacja hamują
    // mielizna: dziób, śródokręcie i rufa
    const cs = Math.cos(s.th), sn = Math.sin(s.th); let dry = 0;
    for (const zz of [def.bow * 0.9, 0, def.stern * 0.9]) if (!isWater(s.x + sn * zz, s.z + cs * zz)) dry++;
    s.aground = dry > 0;
    if (dry) F -= Math.sign(v) * Math.min(Math.abs(v) * m / dt * 0.02 * dry, m * 3 * dry);
    s.vf += F / m * dt;
    // obrót: prędkość kątowa zadana przez ster (promień cyrkulacji), bezwładność ~ 6 s; dryf w bok tłumiony
    const rT = -s.rudder * v / def.turnR;
    s.r += (rT - s.r) * Math.min(1, dt / 6);
    s.th += s.r * dt;
    s.vs += (-s.vs * 0.5 + s.r * v * 0.08) * dt;
    const fx = Math.sin(s.th), fz = Math.cos(s.th), rx = -fz, rz = fx;
    s.x += (fx * s.vf + rx * s.vs) * dt; s.z += (fz * s.vf + rz * s.vs) * dt;
    s.shift += s.vf * dt;
    // kołysanie: średnia i nachylenie fal pod kadłubem (w układzie okrętu, jak WaterKit)
    const L = def.length, B = def.beam, ZS = [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.4].map(f => f * L);
    let sum = 0, sz = 0, szz = 0, szh = 0;
    for (const zz of ZS) { const h = heightAt(waves, 0, zz, t, s.shift); sum += h; sz += zz; szz += zz * zz; szh += zz * h; }
    const n = ZS.length, heaveT = sum / n, slope = (n * szh - sz * sum) / (n * szz - sz * sz);
    let rollT = 0; for (const zz of [-0.18 * L, 0, 0.18 * L]) rollT += heightAt(waves, B * 0.4, zz, t, s.shift) - heightAt(waves, -B * 0.4, zz, t, s.shift);
    const vk = v / 20;
    rollT = Math.atan(rollT / 3 / (B * 0.8)) * 1.4 + s.r * Math.abs(v) * 0.12;   // na cyrkulacji okręt przechyla się na zewnątrz
    [s.heave, s.vh] = spring(s.heave, s.vh, heaveT - 0.25 * vk * vk, 5.5, 0.55, dt);
    [s.pitch, s.vp] = spring(s.pitch, s.vp, Math.atan(slope) + 0.006 * vk * vk, 4.8, 0.5, dt);
    [s.roll, s.vr] = spring(s.roll, s.vr, rollT, 8.5, 0.12, dt);
    return s;
  }
  return { state: s, step };
}
// liczby ruchu z opisu okrętu ShipKit (gdy model nie podaje własnych)
export function shipDef(model, extra = {}) {
  const L = model.length || 100, B = model.beam || 10;
  return Object.assign({ mass: 2.2e6, power: 40e6, vmax: 20, turnR: L * 3, length: L, beam: B, bow: (model.lines && model.lines.zBow) || L / 2, stern: (model.lines && model.lines.zStern) || -L / 2 }, extra);
}
