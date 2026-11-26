// Wątek fizyki odłamków (Web Worker): krok brył (js/behaviors/land/destruct/physics.js — te same obliczenia) poza głównym wątkiem.
// Główny wątek (js/behaviors/land/destruct/world.js) co klatkę wysyła stan aktywnych brył i dostaje go po kroku w następnej klatce.
// Wiadomości:
//   { init: url }   moduł środowiska: export ground(x, z), wind(stan, x, y, z, out)   →   { ready: true }
//   { dt, wind, windGain, add: [[id, m, I, r, A, e, mu, pts]], del: [id], ids: Int32Array, s: Float32Array }
//     s — na bryłę STRIDE liczb: p(3) q(4) v(3) w(3) sleepT age stan (0 ruch, 1 spoczynek)
//   → { ids, s, land: [indeks, prędkość, …] }   (tablice wracają jako przeniesione bufory)
import * as THREE from '../../../../vendor/three/three.module.js';
import { makeBody, stepBody } from './physics.js';

const STRIDE = 16, bodies = new Map();
const env = { ground: () => 0, wind: null, windGain: 1 };
let windState = null, windFn = null, land = [], cur = -1;

self.onmessage = async (e) => {
  const m = e.data;
  if (m.init) {
    const mod = await import(m.init);
    env.ground = mod.ground; windFn = mod.wind;
    env.wind = (x, y, z, out) => (windState && windFn ? windFn(windState, x, y, z, out) : (out[0] = out[1] = out[2] = 0, out));
    self.postMessage({ ready: true });
    return;
  }
  for (const id of m.del) bodies.delete(id);
  for (const [id, mass, I, r, A, e2, mu, pts] of m.add) {
    const b = makeBody({ p: new THREE.Vector3(), q: new THREE.Quaternion(), m: mass, pts, r, A, restitution: e2, friction: mu });
    b.I = I; b.onLand = (bb, speed) => { land.push(cur, speed); };
    bodies.set(id, b);
  }
  windState = m.wind; env.windGain = m.windGain;
  const { ids, s, dt } = m, sub = Math.max(1, Math.ceil(dt / (1 / 40))), h = dt / sub;
  land = [];
  for (let i = 0; i < ids.length; i++) {
    const b = bodies.get(ids[i]); if (!b) continue;
    const o = i * STRIDE;
    b.p.set(s[o], s[o + 1], s[o + 2]); b.q.set(s[o + 3], s[o + 4], s[o + 5], s[o + 6]);
    b.v.set(s[o + 7], s[o + 8], s[o + 9]); b.w.set(s[o + 10], s[o + 11], s[o + 12]);
    b.sleepT = s[o + 13]; b.age = s[o + 14]; b.state = 'active'; cur = i;
    for (let k = 0; k < sub && b.state === 'active'; k++) stepBody(b, h, env);
    s[o] = b.p.x; s[o + 1] = b.p.y; s[o + 2] = b.p.z; s[o + 3] = b.q.x; s[o + 4] = b.q.y; s[o + 5] = b.q.z; s[o + 6] = b.q.w;
    s[o + 7] = b.v.x; s[o + 8] = b.v.y; s[o + 9] = b.v.z; s[o + 10] = b.w.x; s[o + 11] = b.w.y; s[o + 12] = b.w.z;
    s[o + 13] = b.sleepT; s[o + 14] = b.age; s[o + 15] = b.state === 'sleep' ? 1 : 0;
  }
  self.postMessage({ ids, s, land }, [ids.buffer, s.buffer]);
};
