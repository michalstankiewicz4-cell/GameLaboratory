// DeformKit — powłoka z cienkiej blachy, która się trwale gniecie (beczka, puszka, karoseria). Zachowanie
// „deformacja blachy” (środowisko ląd; z Tornado.io), podpinane do zwykłego modelu — model nie wie o deformacji.
// Dwie siatki: rzadka siatka fizyczna (cząstki = wierzchołki zgrzane po położeniu; dla przedmiotu złomowiska z jego
// opisu powłoki: js/models/junkyard/shells.js) i szczegółowe siatki modelu osadzone w niej (embed.js). Rzadka siatka
// i dużo iteracji: metoda PBD zbiega się szybko, blacha jest sztywna i składa się w fałdy zamiast płynąć jak plastelina.
//   więzy długości     krawędzie trójkątów — blacha prawie się nie rozciąga
//   więzy zginania     pary naprzeciw wspólnej krawędzi i cięciwy przez wierzchołek (sąsiedzi prawie w linii)
//   plastyczność       gdy odkształcenie przekroczy granicę, długość spoczynkowa idzie za kształtem — zgięcie zostaje;
//                      włącza ją dociśnięcie prostopadłościanem z `plastic` (prasa), nie sam ciężar
//   zderzenia          grunt i prostopadłościany (box.js: prasa ruchoma, podpory nieruchome) z tarciem
// Rdzeń obliczeń bez Three.js: shell-core.js (tam opis opcji i więzów).
//
// createShell(simGeometries, opts) → shell
//   simGeometries: [BufferGeometry] w układzie świata (siatka fizyczna)
//   opts: { mass, stretch, bend, yieldStretch, yieldBend, weld, substeps, iterations, friction, radius, gravity, worker }
//   shell.embed(object3d)             siatki obiektu (w układzie świata) jadą za blachą; zwraca obiekt
//   shell.step(dt, { ground, boxes, others, yield, pin })   krok; box z makeBox(half, matrix, friction), box.set(matrix)
//     co klatkę; others — cząstki innych powłok (zderzenia między powłokami); pin — chwyt (cząstki ciągnięte do punktu)
//   shell.wake(), shell.awake, shell.bounds() → [ymin, ymax], shell.box() → [xmin, ymin, zmin, xmax, ymax, zmax],
//   shell.stats() → { particles, constraints, crush }, shell.particles, shell.triangles, shell.radius
//   opts.worker: true — obliczenia w osobnym wątku (shell-worker.js): krok wraca w następnej klatce, wiele powłok liczy
//     się równolegle; shell.pending — krok jeszcze się liczy; shell.settled() → Promise (po wysłanych krokach)
import { buildShell, stepShell } from './shell-core.js';
import { colliders } from './box.js';
import { createEmbedder } from './embed.js';
export { makeBox } from './box.js';
export { ENVIRONMENTS } from './shell-core.js';

export function createShell(simGeometries, opts = {}) {
  const geoms = simGeometries.map((g) => ({ pos: Float32Array.from(g.attributes.position.array), idx: g.index ? Uint32Array.from(g.index.array) : null }));
  const S = buildShell(geoms, opts), { N, X } = S;
  if (!S.T.length) throw new Error('DeformKit: siatka fizyczna bez trójkątów');
  const yr = () => { let lo = Infinity, hi = -Infinity; for (let i = 1; i < N * 3; i += 3) { if (X[i] < lo) lo = X[i]; if (X[i] > hi) hi = X[i]; } return [lo, hi]; };
  const h0 = (([lo, hi]) => hi - lo)(yr());
  const E = createEmbedder(S, S.O.weld);

  // --- krok: na miejscu albo w wątku (wynik w następnej klatce; kroki zebrane w czasie liczenia idą razem)
  let worker = null, busy = false, queue = [], wakeNext = false, waiters = [], asked = 0, sentTo = 0, done = 0;
  if (opts.worker && typeof Worker !== 'undefined') {
    try {
      worker = new Worker(new URL('./shell-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        if (e.data.ready) return;
        X.set(e.data.X); S.awake = e.data.awake || queue.length > 0; busy = false; done = sentTo; E.draw();
        waiters = waiters.filter(([n, f]) => (n <= done ? (f(), false) : true));   // kroki zlecone do tej chwili gotowe
        if (queue.length) send();
      };
      worker.postMessage({ init: { geoms, opts } });
    } catch { worker = null; }
  }
  function send() {
    // każdy krok ze swoimi zderzaczami (położenie prasy i sąsiadów z chwili zlecenia) — bez przeskoku prasy o kilka kroków
    busy = true; sentTo = asked; const steps = queue; queue = [];
    worker.postMessage({ step: { steps, wake: wakeNext } }); wakeNext = false;
  }
  function step(dt, C = {}) {
    if (!S.awake || dt <= 0) return;
    if (worker) { asked++; queue.push({ dt, C: colliders(C) }); if (!busy) send(); return; }
    stepShell(S, dt, colliders(C));
    E.draw();
  }
  return {
    embed: E.embed, step,
    get particles() { return X; },   // położenia cząstek (x, y, z po kolei) — do pomiarów
    get triangles() { return S.T; },   // trójkąty siatki fizycznej (indeksy cząstek) — do podglądu
    get radius() { return S.O.radius; },
    wake() { S.awake = true; S.still = 0; wakeNext = true; },
    get awake() { return S.awake; },
    get threaded() { return !!worker; },
    get pending() { return busy || queue.length > 0; },   // krok w wątku jeszcze się liczy
    settled() { const n = asked; return !worker || done >= n ? Promise.resolve() : new Promise((r) => waiters.push([n, r])); },
    bounds: yr,
    box() { const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; for (let i = 0; i < N * 3; i += 3) for (let k = 0; k < 3; k++) { const v = X[i + k]; if (v < b[k]) b[k] = v; if (v > b[k + 3]) b[k + 3] = v; } return b; },
    stats() { const [lo, hi] = yr(); return { particles: N, constraints: S.sA.length + S.bA.length, crush: Math.max(0, 1 - (hi - lo) / h0) }; },
    dispose() { E.dispose(); if (worker) worker.terminate(); },
  };
}
