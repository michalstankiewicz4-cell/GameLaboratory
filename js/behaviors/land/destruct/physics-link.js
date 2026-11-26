// DestructKit — krok brył w osobnym wątku (physics-worker.js; część świata zniszczeń, world.js). Co klatkę: wynik
// poprzedniego kroku (to, co w międzyczasie zmienił główny wątek — prędkość od trąby, odbicie od muru — dodaje się do
// wyniku), potem aktywne bryły idą na następny krok. Wynik wraca w następnej klatce.
//   createPhysicsLink(envUrl, C) → link | null   envUrl: moduł środowiska wątku (export ground(x, z), wind(stan, x, y, z, out))
//   link: { ready, failed, busy, stale, res, del: [], apply(R), send(dt), usable }   C: bodies, env
const STRIDE = 16;

export function createPhysicsLink(envUrl, C) {
  let P;
  try {
    P = { w: new Worker(new URL('./physics-worker.js', import.meta.url), { type: 'module' }), ready: false, busy: false, stale: false, res: null, list: [], snap: null, acc: 0, add: [], del: [], next: 1 };
  } catch { return null; }
  P.w.onmessage = (e) => { if (e.data.ready) { P.ready = true; return; } P.busy = false; if (P.stale) { P.stale = false; return; } P.res = e.data; };
  P.w.onerror = () => { P.failed = true; };
  P.w.postMessage({ init: envUrl });
  P.apply = (R) => {
    const { s, land } = R, snap = P.snap;
    P.list.forEach((b, i) => {
      if (!C.bodies.has(b) || b.state !== 'active') return;
      const o = i * STRIDE;
      // wynik kroku + to, co główny wątek dodał od wysłania
      b.p.set(s[o] + b.p.x - snap[o], s[o + 1] + b.p.y - snap[o + 1], s[o + 2] + b.p.z - snap[o + 2]);
      b.q.set(s[o + 3], s[o + 4], s[o + 5], s[o + 6]);
      const dvx = b.v.x - snap[o + 7], dvy = b.v.y - snap[o + 8], dvz = b.v.z - snap[o + 9];
      b.v.set(s[o + 7] + dvx, s[o + 8] + dvy, s[o + 9] + dvz);
      b.w.set(s[o + 10] + b.w.x - snap[o + 10], s[o + 11] + b.w.y - snap[o + 11], s[o + 12] + b.w.z - snap[o + 12]);
      b.sleepT = s[o + 13]; b.age = s[o + 14];
      if (s[o + 15] && dvx * dvx + dvy * dvy + dvz * dvz < 1e-4) { b.state = 'sleep'; b.v.set(0, 0, 0); b.w.set(0, 0, 0); b.moved = true; }
    });
    for (let k = 0; k < land.length; k += 2) { const b = P.list[land[k]]; if (b && C.bodies.has(b) && b.onLand) b.onLand(b, land[k + 1]); }
  };
  P.send = (dt) => {
    const list = [];
    for (const b of C.bodies) if (b.state === 'active') list.push(b);
    const n = list.length, ids = new Int32Array(n), sArr = new Float32Array(n * STRIDE);
    list.forEach((b, i) => {
      if (!b.wid) { b.wid = P.next++; P.add.push([b.wid, b.m, b.I, b.r, b.A, b.e, b.mu, b.pts]); }
      ids[i] = b.wid; const o = i * STRIDE;
      sArr[o] = b.p.x; sArr[o + 1] = b.p.y; sArr[o + 2] = b.p.z; sArr[o + 3] = b.q.x; sArr[o + 4] = b.q.y; sArr[o + 5] = b.q.z; sArr[o + 6] = b.q.w;
      sArr[o + 7] = b.v.x; sArr[o + 8] = b.v.y; sArr[o + 9] = b.v.z; sArr[o + 10] = b.w.x; sArr[o + 11] = b.w.y; sArr[o + 12] = b.w.z;
      sArr[o + 13] = b.sleepT; sArr[o + 14] = b.age;
    });
    P.list = list; P.snap = sArr.slice();
    P.w.postMessage({ dt, wind: C.env.windState || null, windGain: C.env.windGain || 1, add: P.add, del: P.del, ids, s: sArr }, [ids.buffer, sArr.buffer]);
    P.add = []; P.del = []; P.busy = true;
  };
  Object.defineProperty(P, 'usable', { get: () => P.ready && !P.failed });
  return P;
}
