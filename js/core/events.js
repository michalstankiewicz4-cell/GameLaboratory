// Szyna zdarzeń silnika (Events na schemacie silnika, docs/guides/engine-architecture.md): moduły nie wołają się
// nawzajem — jeden wysyła zdarzenie, inne go słuchają (np. „akcja statku” → model strzela, dziennik zapisuje, później
// dźwięk, interfejs, sieć). Bez Three.js i bez DOM.
//
// createEvents({ log }) → { on(name, fn) → off, once(name, fn) → off, emit(name, data), history(n) }
//   name — nazwa zdarzenia ('action', …) albo '*' (każde zdarzenie: fn(data, name))
//   log(name, data) — nieobowiązkowe: każde zdarzenie także do dziennika (edytor: LabLog)
//   history(n) — ostatnie n zdarzeń { name, data, t } (do API i testów)
export function createEvents({ log } = {}) {
  const subs = new Map(), past = [];
  const list = (name) => { if (!subs.has(name)) subs.set(name, new Set()); return subs.get(name); };
  const bus = {
    on(name, fn) { list(name).add(fn); return () => list(name).delete(fn); },
    once(name, fn) { const off = bus.on(name, (d, n) => { off(); fn(d, n); }); return off; },
    emit(name, data = {}) {
      past.push({ name, data, t: Date.now() }); if (past.length > 200) past.shift();
      if (log) log(name, data);
      for (const fn of [...list(name)]) fn(data, name);
      for (const fn of [...list('*')]) fn(data, name);
    },
    history: (n = 20) => past.slice(-n),
  };
  return bus;
}
