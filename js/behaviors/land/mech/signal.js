// Sygnały (dziedzina „sygnał”, środowisko ląd): wartości z czujników, przekaźników i regulatorów, z historią do podglądu
// przebiegu. Sygnał cyfrowy — 0 / 1 (poziom napięcia osobno: np. PNP 24 V), analogowy — liczba z jednostką (V, mA, Hz,
// obr/min). Połączenia między elementami to porty „sygnał” w danych modeli (userData.ports, złącze: PNP 24 V, 0–10 V,
// A/B/Z itd.); szyna tylko przechowuje bieżące wartości i ostatnie próbki.
//   const bus = createSignals()
//   bus.define('B1', { kind: 'digital', level: 24, label })   bus.set('B1', 1, t)   bus.get('B1')   bus.trace('B1') → [[t, v], …]
export const ENV = ['land'];
export function createSignals({ keep = 4 } = {}) {
  const S = new Map();
  return {
    define(name, o = {}) { S.set(name, { kind: 'digital', unit: '', level: 24, ...o, v: 0, tr: [], edges: 0 }); return this; },
    set(name, v, t) {
      const s = S.get(name); if (!s) return;
      if (s.kind === 'digital') { v = v ? 1 : 0; if (v && !s.v) s.edges++; }
      if (v !== s.v || !s.tr.length) { s.tr.push([t, v]); while (s.tr.length > 2 && t - s.tr[1][0] > keep) s.tr.shift(); }
      s.v = v;
    },
    get: (name) => (S.get(name) || { v: 0 }).v,
    edges: (name) => (S.get(name) || { edges: 0 }).edges,
    trace: (name) => (S.get(name) || { tr: [] }).tr,
    info: (name) => S.get(name),
    names: () => [...S.keys()],
  };
}
