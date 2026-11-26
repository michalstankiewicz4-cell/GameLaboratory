// DeformKit — wątek obliczeń powłoki (Web Worker): jedna powłoka na wątek, rdzeń shell-core.js.
//   { init: { geoms, opts } }               → { ready: true }
//   { step: { steps: [{ dt, C }], wake } }   → { X: Float32Array (przeniesiony), awake }
import { buildShell, stepShell } from './shell-core.js';

let S = null;
self.onmessage = (e) => {
  const m = e.data;
  if (m.init) { S = buildShell(m.init.geoms, m.init.opts); self.postMessage({ ready: true }); return; }
  if (m.step && S) {
    const { steps, wake } = m.step;
    if (wake) { S.awake = true; S.still = 0; }
    for (const { dt, C } of steps) stepShell(S, dt, C);
    const X = S.X.slice();
    self.postMessage({ X, awake: S.awake }, [X.buffer]);
  }
};
