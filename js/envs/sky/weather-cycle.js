// Zmienna pogoda: pogoda sama przechodzi między pogodami SkyKit (WEATHER) — tabela przejść (z każdej pogody własne
// szanse przejścia do innych), czas trwania pogody i przejścia, fronty jak w naturze (przy pogarszaniu najpierw
// chmury i wiatr, deszcz i pioruny później; przy rozpogadzaniu deszcz ustaje pierwszy, chmury odchodzą na końcu;
// mgła gęstnieje, gdy wiatr już osłabł), ziarno — ta sama kolejność pogód przy tym samym ziarnie. Bez rysowania:
// zwraca liczby pogody (jak WEATHER: coverage, density, haze, wind, scale, rain, vis, lightning), które laboratorium
// podaje niebu (applySky / stage.setLight). Wzorem były „zmienne warunki” aTrain (co 70–150 s do sąsiedniej pogody,
// przez 35–60 s) — tu napisane od nowa.
//
// CYCLE_DEFAULTS — { on, seed, start, hold: [min, max] s, change: [min, max] s, fronts,
//   table: { pogoda: { pogoda: waga } }, holdScale: { pogoda: mnożnik czasu trwania }, tornado: { chance, strength: [od, do], kind } }
// createWeatherCycle(opts) → {
//   step(dt) → liczby pogody (i weather — bliższa z dwóch pogód; tornado — { strength, kind } w burzy, gdy wypadło), params, time,
//   now → { from, to, u } (u 0…1 — postęp przejścia; 0 — trwa pogoda from),
//   upcoming(n) → [{ weather, at, until }] (s od teraz: początek i koniec przejścia do tej pogody),
//   force(id, change?) — przejście do pogody teraz (przez change s), dalej po tabeli,
//   set(opts) — nowe ustawienia (od tej samej chwili), reset(), opts }
import { WEATHER } from './skykit.js';

export const PARAMS = ['coverage', 'density', 'haze', 'wind', 'scale', 'rain', 'vis', 'lightning'];
export const CYCLE_DEFAULTS = {
  on: false, seed: 1, start: 'fair', hold: [70, 150], change: [35, 60], fronts: true,
  // wagi przejść: z burzy najczęściej w deszcz, mgła tylko z pogód spokojnych (słaby wiatr), deszcz z chmur
  table: {
    clear: { fair: 12, broken: 4, fog: 2 },
    fair: { clear: 6, broken: 10, fog: 1 },
    broken: { fair: 8, overcast: 10, clear: 2, fog: 1 },
    overcast: { broken: 8, rain: 10, fog: 1 },
    rain: { overcast: 10, storm: 6, broken: 4 },
    fog: { fair: 10, broken: 6, overcast: 4 },
    storm: { rain: 14, overcast: 6 },
  },
  holdScale: { storm: 0.5, fog: 0.8 },   // burza krótka, mgła krótsza
  // trąba powietrzna / tornado w burzy: szansa na burzę, siła (od…do), rodzaj ('auto' — nad wodą trąba wodna, nad lądem tornado)
  tornado: { chance: 0.35, strength: [0.3, 0.9], kind: 'auto' },
};
const clone = (o) => JSON.parse(JSON.stringify(o));

// powtarzalny los (mulberry32)
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const between = (r, [a, b]) => a + (b - a) * r();
const only = (w) => { const r = {}; for (const k of PARAMS) r[k] = w[k] ?? 0; return r; };

// postęp każdej liczby w przejściu from → to (fronty: kolejność jak w naturze)
function weights(from, to, u, fronts) {
  const all = smooth(0, 1, u);
  if (!fronts) return () => all;
  const bad = (w) => w.rain + w.coverage * w.density + w.lightning;
  const lead = smooth(0, 0.6, u), mid = smooth(0.2, 0.85, u), lag = smooth(0.45, 1, u);
  const W = bad(to) > bad(from)
    ? { coverage: lead, density: lead, scale: lead, wind: lead, haze: mid, vis: mid, rain: lag, lightning: lag }
    : { rain: lead, lightning: smooth(0, 0.35, u), wind: mid, haze: lag, vis: lag, coverage: lag, density: lag, scale: lag };
  if (to.vis < 1 && from.vis >= 1) Object.assign(W, { wind: lead, haze: lag, vis: lag });     // mgła: najpierw cichnie wiatr
  if (from.vis < 1 && to.vis >= 1) Object.assign(W, { wind: lead, haze: lead, vis: lead });   // ustępuje z wiatrem
  return (k) => W[k] ?? all;
}
function blend(from, to, u, fronts) {
  const w = weights(from, to, u, fronts), out = {};
  for (const k of PARAMS) {
    const a = from[k], b = to[k], t = w(k);
    out[k] = k === 'vis' ? Math.exp(Math.log(Math.max(0.05, a)) * (1 - t) + Math.log(Math.max(0.05, b)) * t) : a + (b - a) * t;   // widzialność w skali logarytmicznej
  }
  return out;
}

export function createWeatherCycle(opts = {}) {
  let O = { ...clone(CYCLE_DEFAULTS), ...clone(opts) };
  let rand, trand, segs, time = 0, params;   // trand: osobny los trąb (ta sama kolejność pogód co bez nich)
  function pickNext(id) {
    const row = O.table[id] || {}, ids = Object.keys(row).filter((k) => WEATHER[k] && row[k] > 0);
    if (!ids.length) return id;
    let r = rand() * ids.reduce((s, k) => s + row[k], 0);
    for (const k of ids) { r -= row[k]; if (r <= 0) return k; }
    return ids[ids.length - 1];
  }
  // odcinek: pogoda trwa (start … holdEnd), potem przejście do następnej (… end); from — jej liczby
  function push(weather, start) {
    const holdEnd = start + between(rand, O.hold) * (O.holdScale[weather] ?? 1);
    const tc = O.tornado || {}, tr = trand(), ts = trand();
    const tornado = weather === 'storm' && tr < (tc.chance ?? 0) ? between(() => ts, tc.strength || [0.3, 0.9]) : 0;
    segs.push({ weather, from: only(WEATHER[weather]), start, holdEnd, end: holdEnd + between(rand, O.change), next: pickNext(weather), tornado });
  }
  function ensure(n) { while (segs.length < n) { const s = segs[segs.length - 1]; push(s.next, s.end); } }
  function current() {
    let i = segs.findIndex((x) => time < x.end);
    while (i < 0) { ensure(segs.length + 1); i = segs.findIndex((x) => time < x.end); }
    if (i > 0) { segs.splice(0, i); i = 0; }   // minione odcinki nie są potrzebne
    return segs[0];
  }
  function reset() { rand = rng(O.seed); trand = rng((O.seed * 7919 + 13) >>> 0); segs = []; time = 0; push(WEATHER[O.start] ? O.start : 'fair', 0); }
  function evaluate() {
    const s = current(), u = time <= s.holdEnd ? 0 : (time - s.holdEnd) / (s.end - s.holdEnd);
    params = u <= 0 ? { ...s.from } : blend(s.from, only(WEATHER[s.next]), u, O.fronts);
    params.weather = u < 0.5 ? s.weather : s.next;
    params.tornado = s.tornado > 0 && u <= 0 ? { strength: s.tornado, kind: (O.tornado && O.tornado.kind) || 'auto' } : null;   // w burzy; z jej końcem gaśnie
    return { s, u };
  }
  reset(); evaluate();
  const api = {
    get opts() { return clone(O); },
    get time() { return time; },
    get params() { return { ...params }; },
    get now() { const { s, u } = evaluate(); return { from: s.weather, to: s.next, u }; },
    step(dt = 0) { time += Math.max(0, dt); evaluate(); return { ...params }; },
    upcoming(n = 6) {
      current(); ensure(n + 1);
      return segs.slice(0, n).map((g) => ({ weather: g.next, at: Math.max(0, g.holdEnd - time), until: g.end - time }));
    },
    force(id, change) {
      if (!WEATHER[id]) throw new Error(`no weather "${id}" (${Object.keys(WEATHER).join(', ')})`);
      const s = current(), name = time <= s.holdEnd ? s.weather : s.next;
      const dur = Math.max(1, change ?? between(rand, O.change));
      segs = [{ weather: name, from: only(params), start: time, holdEnd: time, end: time + dur, next: id }];
      push(id, time + dur);
      evaluate(); return api.now;
    },
    set(o = {}) { const keep = time; O = { ...O, ...clone(o) }; reset(); time = keep; evaluate(); },
    reset() { reset(); evaluate(); },
  };
  return api;
}
