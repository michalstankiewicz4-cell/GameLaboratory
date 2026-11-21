// Cyklon (huragan, tajfun): za duży na model (setki km), więc pole pogody — liczy się położenie sceny względem środka.
// Z odległości i kierunku wychodzi pogoda na miejscu: obrzeża (wysokie chmury, rosnący wiatr), spiralne pasma deszczu
// (ulewa ze szkwałem, potem przerwa), ściana oka (najsilniejszy wiatr, burza, widoczność prawie zero) i oko (cisza,
// przejaśnienie, dookoła ściana chmur jak trybuny stadionu). Cyklon wędruje, więc scena przechodzi przez jego strefy.
//
// Wiatr: profil Hollanda (1980) — V(r) = Vmax·√((Rm/r)^B · e^(1 − (Rm/r)^B)), B = 1,5; Rm — promień wiatru
// maksymalnego (ściana oka), Vmax z kategorii (Saffira-Simpsona: wiatr 1-minutowy). Kierunek: obrót przeciwnie do
// wskazówek zegara na półkuli północnej (zgodnie — na południowej), z napływem do środka ok. 20°. Pasma: spirale
// logarytmiczne (kąt pochylenia 15°), od ok. 1,6 Rm do ok. 12 Rm.
//
// Układ: x — wschód, −z — północ; bearing — kierunek od środka cyklonu do sceny (0° północ, 90° wschód), trackDir —
// kierunek wędrówki cyklonu (dokąd idzie); odległości w km, prędkości w m/s, czas t w s.
// CYCLONE_DEFAULTS; CATEGORIES — [{ id, label, vmax }]
// cycloneAt(C, t?) → { r (km), x (r / Rm), zone, vmax, wind, dir [x, z] (dokąd wieje), rain, band, eye, rel [x, z] km,
//   seaWind (m/s — wiatr, który wzbudził morze: w oku wysokie fale ze ściany), seaSpread (° — rozrzut kierunków fal) }
// cycloneWeather(C, t?) → liczby pogody (jak WEATHER: coverage, density, haze, wind, scale, rain, vis, lightning)
//   z polami windDir, seaWind, seaSpread, cyclone (stan) i tornado (trąba w paśmie, gdy spouts)
// cycloneWind(C, t, out, A?) → wiatr przy ziemi w scenie [x, y, z] m/s z porywami (jednakowy w obrębie sceny);
//   A — gotowe cycloneAt(C) (bez liczenia na nowo przy każdym ciele)
// createCyclone(opts) → { step(dt) → liczby pogody, params, time, at, set(opts), opts }
import { WEATHER } from './skykit.js';

export const CATEGORIES = [
  { id: 0, label: 'Tropical storm', vmax: 28 },
  { id: 1, label: 'Category 1', vmax: 38 }, { id: 2, label: 'Category 2', vmax: 45 }, { id: 3, label: 'Category 3', vmax: 54 },
  { id: 4, label: 'Category 4', vmax: 63 }, { id: 5, label: 'Category 5', vmax: 75 },
];
export const CYCLONE_DEFAULTS = { on: false, category: 3, eye: 25, dist: 180, bearing: 135, moving: true, trackDir: 132, trackSpeed: 6, hemisphere: 'north', spouts: true, t: 0 };
const B = 1.5, PITCH = 15 * Math.PI / 180, NBANDS = 3, INFLOW = 20 * Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const D2R = Math.PI / 180;
const opt = (C) => ({ ...CYCLONE_DEFAULTS, ...(C || {}) });
export const vmaxOf = (cat) => (CATEGORIES[clamp(Math.round(cat), 0, 5)] || CATEGORIES[3]).vmax;

// położenie sceny względem środka (km) po czasie t: start z bearing i dist, środek idzie w trackDir
export function relOf(C, t = C.t || 0) {
  const b = C.bearing * D2R, d = C.trackDir * D2R, run = C.moving ? C.trackSpeed * t / 1000 : 0;
  return [C.dist * Math.sin(b) - run * Math.sin(d), -C.dist * Math.cos(b) + run * Math.cos(d)];
}
// spiralne pasma (0…1) w punkcie (km od środka): spirala logarytmiczna, obraca się z cyklonem (pełny obrót ok. 4 h)
export function bandAt(C, rx, rz, t = 0) {
  const Rm = C.eye, r = Math.hypot(rx, rz) + 1e-6, x = r / Rm, s = C.hemisphere === 'south' ? -1 : 1;
  const th = Math.atan2(rz, rx) * s + t * 2 * Math.PI / 14400;
  const ph = th - Math.log(x) / Math.tan(PITCH);
  const b = Math.pow(0.5 + 0.5 * Math.cos(NBANDS * ph), 5);
  return b * smooth(1.4, 2.2, x) * (1 - smooth(8, 13, x));
}
export function cycloneAt(C0, t) {
  const C = opt(C0), tt = t ?? C.t, rel = relOf(C, tt), r = Math.hypot(rel[0], rel[1]), Rm = Math.max(3, C.eye), x = r / Rm;
  const vmax = vmaxOf(C.category), q = Math.pow(1 / Math.max(x, 0.05), B);
  const eyeK = 1 - 0.85 * (1 - smooth(0.45, 0.85, x));                  // w oku wiatr słabnie bardziej niż w profilu (cisza)
  const eye = 1 - smooth(0.55, 0.9, x);                                  // oko: cisza i przejaśnienie
  // w oku nie ma zupełnej ciszy: słaby, zmienny wiatr (ok. 4–7 m/s, silniejszy w silniejszym cyklonie)
  const wind = Math.max(vmax * Math.sqrt(q * Math.exp(1 - q)) * eyeK, (2.5 + 0.06 * vmax) * eye) * (x > 20 ? Math.max(0, 1 - (x - 20) / 10) : 1);
  // kierunek: styczny (półkula północna — przeciwnie do zegara patrząc z góry: przy x wschód, −z północ, obrót dodatni
  // z +x do −z), z napływem do środka
  const s = C.hemisphere === 'south' ? -1 : 1, nx = rel[0] / (r || 1), nz = rel[1] / (r || 1);
  const tx = nz * s, tz = -nx * s;   // styczna (z góry: x→−z to obrót przeciwny do zegara)
  const dir = [tx * Math.cos(INFLOW) - nx * Math.sin(INFLOW), tz * Math.cos(INFLOW) - nz * Math.sin(INFLOW)];
  const band = bandAt(C, rel[0], rel[1], tt);
  const wall = Math.exp(-Math.pow((x - 1.1) / 0.32, 2));                 // ściana oka (tuż za promieniem wiatru max)
  const outer = 1 - smooth(10, 20, x);                                    // zasięg chmur cyklonu
  const rain = clamp(Math.max(wall * 1.0, band * 0.85 * (1 - smooth(9, 13, x)), 0.12 * outer * (1 - eye) * smooth(1.5, 3, x) * (1 - smooth(6, 14, x))) * (1 - eye), 0, 1);
  const zone = eye > 0.5 ? 'eye' : wall > 0.35 ? 'eyewall' : band > 0.35 && x < 13 ? 'rain band' : x < 13 ? 'between bands' : x < 20 ? 'outer clouds' : 'outside';
  // morze: fale robi wiatr ściany oka i pasm, więc w oku i tuż za ścianą morze zostaje wysokie (wiatr, który je wzbudził),
  // a w oku jest skłębione — fale przychodzą ze wszystkich stron (szerszy rozrzut kierunków)
  const seaWind = Math.max(wind, vmax * 0.85 * (1 - smooth(1.5, 6, x)));
  const seaSpread = 35 + 55 * eye;
  return { r, x, zone, vmax, wind, dir, rain, band, eye, wall, outer, rel, Rm, seaWind, seaSpread };
}
// liczby pogody sceny w danej chwili
export function cycloneWeather(C0, t) {
  const C = opt(C0), A = cycloneAt(C, t), base = WEATHER.storm;
  const far = 1 - A.outer, wet = A.rain;
  const coverage = clamp(A.eye * 0.18 + (1 - A.eye) * (0.35 + 0.65 * Math.max(A.outer * 0.75, wet, A.wall)) , 0.05, 1);
  const density = clamp(A.eye * 0.25 + (1 - A.eye) * (0.35 + 0.6 * Math.max(wet, A.wall * 0.9, A.outer * 0.4)), 0.1, 1);
  const vis = A.eye > 0.5 ? 18 : clamp(22 * Math.pow(1 - wet, 2.2) + 0.35, 0.35, 25) * (1 - 0.3 * A.wall);
  const haze = clamp(0.15 + 0.6 * smooth(15, 50, A.wind) + 0.2 * wet, 0, 1);   // pył wodny z fal przy silnym wietrze
  const lightning = clamp(A.wall * 0.55 + A.band * 0.35 * (1 - A.eye), 0, 1);
  const out = { coverage, density, haze, wind: A.wind, scale: base.scale ?? 1, rain: wet, vis, lightning,
    weather: A.zone === 'eye' ? 'fair' : wet > 0.6 ? 'storm' : wet > 0.15 ? 'rain' : far > 0.5 ? 'broken' : 'overcast',
    windDir: A.dir, seaWind: A.seaWind, seaSpread: A.seaSpread, cyclone: { ...C, t: t ?? C.t } };
  // trąba wodna / tornado w paśmie (prawdziwe cyklony je rodzą w pasmach); które pasmo — z odcinka czasu (powtarzalne)
  if (C.spouts && A.band > 0.6 && A.x > 1.6 && A.x < 8) {
    const slot = Math.floor((t ?? C.t) / 600), h = Math.sin(slot * 12.9898 + C.category * 78.233) * 43758.5453;
    if (h - Math.floor(h) < 0.35) out.tornado = { strength: 0.25 + 0.3 * (A.band - 0.6) / 0.4, kind: 'auto' };
  }
  if (!out.tornado) out.tornado = null;
  return out;
}
// wiatr przy ziemi w scenie (m/s) z porywami: pasmo i ściana porywają mocniej
export function cycloneWind(C0, t, out = [0, 0, 0], A0 = null) {
  const A = A0 || cycloneAt(opt(C0), t);
  const g = 1 + (0.18 + 0.25 * Math.max(A.band, A.wall)) * (Math.sin(t * 0.7) * 0.6 + Math.sin(t * 1.9 + 1.3) * 0.3 + Math.sin(t * 4.1 + 2.1) * 0.1);
  out[0] = A.dir[0] * A.wind * g; out[1] = 0; out[2] = A.dir[1] * A.wind * g;
  return out;
}
export function createCyclone(opts = {}) {
  let C = opt(opts), time = C.t || 0, params = cycloneWeather(C, time);
  return {
    get opts() { return { ...C, t: time }; },
    get time() { return time; }, set time(v) { time = Math.max(0, v); params = cycloneWeather(C, time); },
    get params() { return { ...params }; },
    get at() { return cycloneAt(C, time); },
    step(dt = 0) { time += Math.max(0, dt); params = cycloneWeather(C, time); return { ...params }; },
    set(o = {}) { C = opt({ ...C, ...o }); if (o.t != null) time = o.t; params = cycloneWeather(C, time); },
  };
}
