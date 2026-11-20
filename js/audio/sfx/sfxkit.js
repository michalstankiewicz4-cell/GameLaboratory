// SfxKit — efekty dźwiękowe i otoczenie, bez plików (laboratorium efektów: labs/sound-effects.html). Grają przez
// mikser silnika (js/audio/mixer.js): efekty na szynie sfx, dźwięki ciągłe i tła miejsc na szynie ambience, w miejscu
// (dźwięk przestrzenny) albo wprost.
// Źródła: strzał, plusk, trafienie, wybuch, dzwonek, naprawa, klik — z gry Battle (js/core/sound.js, szum filtrowany
// i tony); stuki metalu, drewna, zderzaka, łańcucha i pisk koła na szynie — z aTrain (js/app.js, składowe
// nieharmoniczne + szum, siła uderzenia zmienia barwę); grzmot — z RainKit (js/envs/sky/rainkit.js). Reszta nowa.
//
// SOUNDS: id → { label, labelPl, cat, loop, params: { nazwa: [etykieta, min, max, krok, domyślnie] }, … }
//   jednorazowe (loop: false) — play(); ciągłe (loop: true) — start() → { set(params), stop() }
// Dźwięk jako dane (zasób „sound”): { sound: id, params, gain }; tło miejsca (zasób „ambience”): { layers: [{ sound,
//   params, level, every: [od, do] s — dla jednorazowych (np. ptaki), spread — rozrzut miejsc 0…1 }] }
// Mechanizmy (drzwi, właz, hydraulika) — dźwięki modeli (zdarzenia onSound, js/models/shared/sound-events.js).
// play(opis, { at, ref, bus, gain, when }) · start(opis, { at, ref, bus, gain }) → { set(params, poziom), move(at), volume(v), stop() }
// · ambience(opis | id) → { set(warstwa, poziom), stop() }
// AMBIENCES — gotowe tła: las, park w mieście, brzeg morza, burza, noc, ognisko.
import { mixer } from '../mixer.js';

const P = (label, min, max, step, def) => [label, min, max, step, def];
export const CATS = { boom: ['Explosions and shots', 'Wybuchy i strzały'], water: ['Water', 'Woda'], impact: ['Impacts', 'Uderzenia'],
  weather: ['Weather', 'Pogoda'], nature: ['Nature', 'Przyroda'], machine: ['Machines and city', 'Maszyny i miasto'], mech: ['Mechanisms', 'Mechanizmy'], ui: ['Interface', 'Interfejs'] };
export const SOUNDS = {
  explosion: { label: 'Explosion', labelPl: 'Wybuch', cat: 'boom', params: { size: P('Size', 0, 1, 0.01, 0.6), distance: P('Distance', 0, 1, 0.01, 0.2), debris: P('Debris', 0, 1, 0.01, 0.5) } },
  gunshot: { label: 'Gunshot / cannon', labelPl: 'Strzał / działo', cat: 'boom', params: { calibre: P('Calibre', 0, 1, 0.01, 0.2), distance: P('Distance', 0, 1, 0.01, 0.1), room: P('Echo', 0, 1, 0.01, 0.3) } },
  thunder: { label: 'Thunder', labelPl: 'Grzmot', cat: 'weather', params: { distance: P('Distance', 0, 1, 0.01, 0.4) } },
  splash: { label: 'Splash', labelPl: 'Plusk', cat: 'water', params: { size: P('Size', 0, 1, 0.01, 0.5) } },
  impact: { label: 'Impact', labelPl: 'Uderzenie', cat: 'impact', params: { material: P('Material (metal · wood · heavy · chain)', 0, 3, 1, 0), strength: P('Strength', 0.05, 1, 0.01, 0.7) } },
  crunch: { label: 'Crushing', labelPl: 'Zgniatanie', cat: 'impact', params: { material: P('Material (can · scrap · paper)', 0, 2, 1, 1), strength: P('Strength', 0.1, 1, 0.01, 0.7) } },
  hit: { label: 'Shell hit', labelPl: 'Trafienie', cat: 'impact', params: { armour: P('Armour', 0, 1, 0.01, 0.5), strength: P('Strength', 0, 1, 0.01, 0.6) } },
  bird: { label: 'Bird', labelPl: 'Ptak', cat: 'nature', params: { species: P('Species (sparrow · tit · blackbird · gull · crow · owl)', 0, 5, 1, 2), pitch: P('Pitch', 0.7, 1.4, 0.01, 1) } },
  door: { label: 'Door / hatch', labelPl: 'Drzwi / właz', cat: 'mech', params: { kind: P('Kind (car · hatch · bus · wooden)', 0, 3, 1, 0), action: P('Action (open · close)', 0, 1, 1, 1), force: P('Force', 0.1, 1, 0.01, 0.6) } },
  hydraulic: { label: 'Hydraulics / servo', labelPl: 'Hydraulika / serwo', cat: 'mech', params: { time: P('Time (s)', 0.3, 6, 0.1, 2), pitch: P('Pitch', 0.5, 2, 0.01, 1), lock: P('Lock at the end', 0, 1, 0.01, 0.6) } },
  ui: { label: 'Interface', labelPl: 'Interfejs', cat: 'ui', params: { kind: P('Kind (click · bell · repair · alarm · blip · tick · relay · open · close · key · confirm · deny)', 0, 11, 1, 0), pitch: P('Pitch', 0.5, 2, 0.01, 1), level: P('Level', 0.1, 1.5, 0.01, 1) } },
  wind: { label: 'Wind', labelPl: 'Wiatr', cat: 'weather', loop: true, params: { strength: P('Strength', 0, 1, 0.01, 0.4), gusts: P('Gusts', 0, 1, 0.01, 0.5) } },
  rain: { label: 'Rain', labelPl: 'Deszcz', cat: 'weather', loop: true, params: { intensity: P('Intensity', 0, 1, 0.01, 0.5) } },
  sea: { label: 'Sea waves', labelPl: 'Fale morza', cat: 'water', loop: true, params: { strength: P('Strength', 0, 1, 0.01, 0.5), period: P('Wave period (s)', 3, 14, 0.5, 7) } },
  stream: { label: 'Stream', labelPl: 'Strumień', cat: 'water', loop: true, params: { flow: P('Flow', 0, 1, 0.01, 0.5) } },
  fire: { label: 'Fire', labelPl: 'Ogień', cat: 'nature', loop: true, params: { size: P('Size', 0, 1, 0.01, 0.4) } },
  crickets: { label: 'Crickets', labelPl: 'Świerszcze', cat: 'nature', loop: true, params: { density: P('Density', 0, 1, 0.01, 0.5) } },
  city: { label: 'City traffic', labelPl: 'Ruch w mieście', cat: 'machine', loop: true, params: { traffic: P('Traffic', 0, 1, 0.01, 0.5) } },
  engine: { label: 'Engine', labelPl: 'Silnik', cat: 'machine', loop: true, params: { rpm: P('RPM', 600, 7000, 10, 1800), load: P('Load', 0, 1, 0.01, 0.4), cylinders: P('Cylinders', 1, 12, 1, 4) } },
  pump: { label: 'Hydraulic power pack', labelPl: 'Agregat hydrauliczny', cat: 'mech', loop: true, params: { load: P('Load', 0, 1, 0.01, 0.5) } },
  turbine: { label: 'Turbine', labelPl: 'Turbina', cat: 'machine', loop: true, params: { spool: P('Spool (0 idle … 1 full)', 0, 1, 0.01, 0.4), load: P('Load', 0, 1, 0.01, 0.4), size: P('Size (small gas · big steam)', 0, 1, 0.01, 0.3) } },
  rail: { label: 'Wheels on rails', labelPl: 'Koła na szynach', cat: 'machine', loop: true, params: { speed: P('Speed (m/s)', 0, 40, 0.1, 12), joint: P('Rail length (m)', 12, 60, 1, 25), bogie: P('Bogie wheelbase (m)', 1.5, 3, 0.1, 2.5), clacks: P('Joint clacks (0 — the physics gives them)', 0, 1, 1, 1) } },
  squeal: { label: 'Wheel on rail (squeal)', labelPl: 'Koło na szynie (pisk)', cat: 'machine', loop: true, params: { strength: P('Strength', 0, 1, 0.01, 0.5) } },
  hum: { label: 'Electric hum', labelPl: 'Buczenie prądu', cat: 'machine', loop: true, params: { freq: P('Mains (Hz)', 50, 60, 10, 50), level: P('Level', 0, 1, 0.01, 0.4) } },
};
export const SOUND_IDS = Object.keys(SOUNDS);
// odległość pełnej głośności [m] dźwięku w miejscu (dalej cichnie jak 1/odległość): głośne słychać daleko, ciche —
// z bliska; reszta 6 m
export const REF = { explosion: 40, thunder: 60, gunshot: 25, hit: 12, impact: 8, crunch: 10, pump: 6, turbine: 25, rail: 15, splash: 10, bird: 10, ui: 3, door: 8, hydraulic: 8,
  engine: 10, fire: 6, sea: 30, wind: 30, rain: 30, stream: 10, crickets: 10, city: 40, squeal: 15 };
export const refOf = (id) => REF[id] || 6;
export const defaults = (id) => Object.fromEntries(Object.entries((SOUNDS[id] || {}).params || {}).map(([k, v]) => [k, v[4]]));
export function normalizeSound(d = {}) {
  const id = SOUNDS[d.sound] ? d.sound : 'explosion', P0 = SOUNDS[id].params, p = { ...defaults(id), ...(d.params || {}) };
  for (const [k, [, lo, hi]] of Object.entries(P0)) p[k] = Math.max(lo, Math.min(hi, +p[k]));
  for (const k of Object.keys(p)) if (!P0[k]) delete p[k];
  return { sound: id, params: p, gain: Math.max(0, Math.min(2, +(d.gain ?? 1))) };
}

/* ---------------- pomocnicze ---------------- */
const bufs = new WeakMap();
function buffers(ctx) {
  let b = bufs.get(ctx); if (b) return b;
  const mk = (sec, f) => { const x = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = x.getChannelData(0); f(d); return x; };
  b = {
    white: mk(3, (d) => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }),
    brown: mk(6, (d) => { let v = 0; for (let i = 0; i < d.length; i++) { v = (v + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = v * 3.5; } }),
    pink: mk(6, (d) => { let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; } }),
  };
  bufs.set(ctx, b); return b;
}
const gainN = (ctx, v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
const filt = (ctx, type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; };
function src(ctx, kind = 'white', loop = false) { const s = ctx.createBufferSource(); s.buffer = buffers(ctx)[kind]; s.loop = loop; return s; }
// wybuch szumu przez filtr z obwiednią (Battle: burst)
function burst(ctx, out, t, { freq = 400, q = 0.7, dur = 0.5, gain = 0.5, type = 'lowpass', attack = 0.005, sweep = 0, kind = 'white', rate = null }) {
  const s = src(ctx, kind); s.playbackRate.value = rate ?? 0.6 + Math.random() * 0.3;
  const f = filt(ctx, type, freq, q); f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(30, freq * sweep), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 2); s.stop(t + dur + 0.05);
}
function tone(ctx, out, t, freq, dur, gain, type = 'triangle', to = null) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
}
// składowe nieharmoniczne uderzenia (aTrain: partials) — s = siła 0…1 odsłania wyższe składowe i podnosi ton
function partials(ctx, out, t, list, amp, det, s) {
  list.forEach(([f, a0, dec], i) => {
    const a = a0 * Math.pow(s, 0.45 * i), dd = dec * (0.7 + 0.6 * s);
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f * (1 + 0.04 * s) * (1 + (Math.random() - 0.5) * det);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp * a + 1e-5, t + 0.004 - 0.003 * s); g.gain.exponentialRampToValueAtTime(1e-4, t + dd);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dd + 0.02);
  });
}
function noiseHit(ctx, out, t, f, q, dur, amp, type = 'bandpass') {
  const s = src(ctx), fl = filt(ctx, type, f, q), g = ctx.createGain();
  g.gain.setValueAtTime(Math.max(1e-4, amp), t); g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
}
// odległość: przytłumienie wysokich i ciszej (wspólne dla wybuchu, strzału, grzmotu)
function far(ctx, out, d) { const lp = filt(ctx, 'lowpass', 16000 * Math.pow(0.06, d)), g = gainN(ctx, 1 - d * 0.6); lp.connect(g); g.connect(out); return lp; }

/* ---------------- jednorazowe ---------------- */
const ONE = {
  explosion(ctx, out, t, p) {
    const o = far(ctx, out, p.distance), sz = p.size;
    burst(ctx, o, t, { freq: 3500, type: 'highpass', dur: 0.12, gain: 0.5 * (1 - p.distance * 0.8), attack: 0.002 });   // trzask
    burst(ctx, o, t, { kind: 'brown', freq: 900 - sz * 600, dur: 1.2 + sz * 3, gain: 0.9, attack: 0.01, sweep: 0.25, rate: 1 });   // kula ognia
    tone(ctx, o, t, 70 - sz * 25, 0.8 + sz, 0.8, 'sine', 25);   // uderzenie w powietrzu
    burst(ctx, o, t + 0.15, { kind: 'brown', freq: 160, dur: 2.5 + sz * 4, gain: 0.35 + sz * 0.3, attack: 0.4, rate: 0.5 });   // grzmot po wybuchu
    const n = Math.round(p.debris * (8 + sz * 22));   // odłamki opadające
    for (let i = 0; i < n; i++) noiseHit(ctx, o, t + 0.3 + Math.random() * (1 + sz * 2), 1500 + Math.random() * 3500, 3, 0.03 + Math.random() * 0.05, 0.08 + Math.random() * 0.12);
    return 3 + sz * 4;
  },
  gunshot(ctx, out, t, p) {   // Battle: gun(cal) — szum z opadającym filtrem i niskie uderzenie; trzask i pogłos
    const o = far(ctx, out, p.distance), c = p.calibre;
    burst(ctx, o, t, { freq: 6000, type: 'highpass', dur: 0.05 + c * 0.04, gain: 0.5, attack: 0.001 });
    burst(ctx, o, t, { freq: 900 - c * 800, dur: 0.5 + c * 1.2, gain: 0.55, sweep: 0.2 });
    burst(ctx, o, t, { freq: 90, dur: 0.6 + c, gain: 0.5, attack: 0.01 });
    if (p.room > 0) burst(ctx, o, t + 0.06, { kind: 'pink', freq: 1200 - c * 600, dur: 0.8 + p.room * 2.5, gain: 0.18 * p.room, attack: 0.04, sweep: 0.3, rate: 1 });
    return 1 + c + p.room * 2.5;
  },
  thunder(ctx, out, t, p) {   // RainKit / aTrain: szum brązowy z falującą obwiednią, przytłumiony z odległością
    const dist = 300 + p.distance * 4000, len = 4 + Math.min(4, dist / 1500), sr = ctx.sampleRate, buf = ctx.createBuffer(1, Math.floor(len * sr), sr), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < d.length; i++) { b = b * 0.985 + (Math.random() * 2 - 1) * 0.015; const tt = i / sr; d[i] = b * 9 * (Math.exp(-tt * 0.9) * (0.6 + 0.4 * Math.sin(tt * 7 + Math.sin(tt * 2.3) * 3))); }
    const s = ctx.createBufferSource(), lp = filt(ctx, 'lowpass', 900 - Math.min(700, dist / 10)), g = gainN(ctx, Math.min(1, 2500 / dist) * 0.9);
    s.buffer = buf; s.connect(lp); lp.connect(g); g.connect(out); s.start(t);
    if (p.distance < 0.25) burst(ctx, out, t, { freq: 2500, type: 'highpass', dur: 0.25, gain: 0.4 * (1 - p.distance * 4), attack: 0.003 });   // blisko: trzask
    return len;
  },
  splash(ctx, out, t, p) {   // Battle: splash — szum w paśmie z opadającym filtrem; krople
    burst(ctx, out, t, { freq: 1800, type: 'bandpass', q: 0.6, dur: 0.6 + p.size, gain: 0.3 + p.size * 0.3, sweep: 0.4 });
    burst(ctx, out, t, { kind: 'brown', freq: 300, dur: 0.3 + p.size * 0.6, gain: 0.3 * p.size, attack: 0.01 });
    for (let i = 0; i < 4 + p.size * 14; i++) { const f = 900 + Math.random() * 2200, tt = t + 0.1 + Math.random() * (0.4 + p.size); tone(ctx, out, tt, f, 0.05, 0.05 + Math.random() * 0.06, 'sine', f * 1.6); }
    return 1.5 + p.size;
  },
  impact(ctx, out, t, p) {   // aTrain: stuk sprzęgu (metal), podkładu (drewno), zderzaka (ciężki), łańcucha
    const s = p.strength, d = out;
    switch (Math.round(p.material)) {
      case 1: partials(ctx, d, t, [[72, 1, 0.12], [148, 0.8, 0.07], [263, 0.6, 0.05], [417, 0.35, 0.035], [690, 0.2, 0.025]], 0.9 * s, 0.15, s); noiseHit(ctx, d, t, 700 + 900 * s, 1.1, 0.05, 0.55 * s ** 1.2); noiseHit(ctx, d, t + 0.004, 180, 0.9, 0.08, 0.4 * s, 'lowpass'); return 0.4;
      case 2: partials(ctx, d, t, [[55, 1, 0.28], [118, 0.6, 0.16], [390, 0.35, 0.18], [910, 0.15, 0.1]], 0.8 * s, 0.08, s); noiseHit(ctx, d, t, 220 + 600 * s, 0.7, 0.06, 0.5 * s ** 1.4, 'lowpass'); return 0.6;
      case 3: partials(ctx, d, t, [[1900, 1, 0.14], [3150, 0.8, 0.12], [4700, 0.6, 0.09], [6300, 0.4, 0.07]], 0.18 * s, 0.25, s); noiseHit(ctx, d, t, 4000 + 2500 * s, 3, 0.02, 0.25 * s ** 1.4); return 0.3;
      default: partials(ctx, d, t, [[180, 1, 0.55], [431, 0.7, 0.42], [812, 0.5, 0.3], [1490, 0.35, 0.22], [2630, 0.2, 0.12]], 0.55 * s, 0.06, s); noiseHit(ctx, d, t, 800 + 1500 * s, 0.8, 0.035, 0.6 * s ** 1.4); return 1;
    }
  },
  crunch(ctx, out, t, p) {   // nowy: zgniatanie — trzaski blachy (krótkie szumy w paśmie), niski jęk i stuk końcowy; papier — szelest
    const f = p.strength, m = Math.round(p.material), n = m === 2 ? 26 : 12 + Math.round(f * 12), len = 0.5 + f * 0.6;
    for (let i = 0; i < n; i++) {
      const tt = t + Math.pow(Math.random(), 0.7) * len;
      if (m === 2) noiseHit(ctx, out, tt, 2500 + Math.random() * 4000, 1.5, 0.03 + Math.random() * 0.05, 0.08 + Math.random() * 0.1);
      else noiseHit(ctx, out, tt, (m === 0 ? 2600 : 1400) + Math.random() * 2500, 3 + Math.random() * 4, 0.02 + Math.random() * 0.04, (0.15 + Math.random() * 0.3) * f);
    }
    if (m !== 2) {
      tone(ctx, out, t, m === 0 ? 210 : 95, len, 0.12 * f, 'sawtooth', m === 0 ? 150 : 70);   // jęk blachy
      partials(ctx, out, t + len, m === 0 ? [[780, 1, 0.1], [1530, 0.6, 0.07]] : [[55, 1, 0.28], [118, 0.6, 0.16], [390, 0.35, 0.18]], 0.6 * f, 0.1, f);   // dobicie
    }
    return len + 0.4;
  },
  hit(ctx, out, t, p) {   // Battle: hit — trafienie w pancerz (wyżej) albo w nadbudówkę (niżej)
    const k = 0.3 + p.strength * 0.5;
    burst(ctx, out, t, { freq: 500 + p.armour * 900, type: 'bandpass', q: 1.2, dur: 0.35, gain: 0.35 * k });
    burst(ctx, out, t, { freq: 160, dur: 0.5, gain: 0.3 * k });
    partials(ctx, out, t, [[310, 1, 0.5], [770, 0.6, 0.35], [1390, 0.4, 0.25]], 0.25 * k * p.armour, 0.05, p.strength);
    return 0.8;
  },
  bird(ctx, out, t, p) {
    const k = p.pitch, sp = Math.round(p.species);
    const chirp = (tt, f0, f1, dur, g = 0.12, type = 'sine') => tone(ctx, out, tt, f0 * k, dur, g, type, f1 * k);
    if (sp === 0) { const n = 3 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) chirp(t + i * 0.13, 3800 + Math.random() * 600, 5600 + Math.random() * 800, 0.06); return n * 0.13 + 0.2; }   // wróbel: ćwierkanie
    if (sp === 1) { for (let i = 0; i < 3; i++) { chirp(t + i * 0.32, 5600, 5400, 0.11); chirp(t + i * 0.32 + 0.15, 3900, 3700, 0.12); } return 1.1; }   // bogatka: ci-ca
    if (sp === 2) {   // kos: melodia z poślizgami i drżeniem
      let tt = t; const n = 5 + Math.floor(Math.random() * 5);
      for (let i = 0; i < n; i++) {
        const f = 1400 + Math.random() * 1600, d = 0.08 + Math.random() * 0.18, o = ctx.createOscillator(), g = ctx.createGain(), v = ctx.createOscillator(), vg = gainN(ctx, f * 0.03 * k);
        o.frequency.setValueAtTime(f * k, tt); o.frequency.exponentialRampToValueAtTime(f * k * (0.85 + Math.random() * 0.4), tt + d); v.frequency.value = 18 + Math.random() * 10; v.connect(vg); vg.connect(o.frequency);
        g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.1, tt + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, tt + d);
        o.connect(g); g.connect(out); o.start(tt); v.start(tt); o.stop(tt + d + 0.02); v.stop(tt + d + 0.02); tt += d + 0.03 + Math.random() * 0.06;
      }
      return tt - t + 0.2;
    }
    if (sp === 3 || sp === 4) {   // mewa (kiau, wyżej, opadająco) albo wrona (kraa, szorstko)
      const gull = sp === 3, n = gull ? 3 : 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) {
        const tt = t + i * (gull ? 0.42 : 0.55), d = gull ? 0.32 : 0.38, o = ctx.createOscillator(), bp = filt(ctx, 'bandpass', (gull ? 1700 : 1200) * k, gull ? 5 : 3), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime((gull ? 1300 : 600) * k, tt); o.frequency.exponentialRampToValueAtTime((gull ? 850 : 520) * k, tt + d);
        if (!gull) { const am = ctx.createOscillator(), ag = gainN(ctx, 0.5); am.frequency.value = 55; am.connect(ag); ag.connect(g.gain); am.start(tt); am.stop(tt + d + 0.05); }
        g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.18, tt + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, tt + d);
        o.connect(bp); bp.connect(g); g.connect(out); o.start(tt); o.stop(tt + d + 0.05);
      }
      return n * 0.55;
    }
    // sowa: hu… huu
    for (const [dt, d] of [[0, 0.35], [0.6, 0.9]]) { const o = ctx.createOscillator(), g = ctx.createGain(), tt = t + dt; o.frequency.setValueAtTime(390 * k, tt); o.frequency.linearRampToValueAtTime(360 * k, tt + d);
      g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.2, tt + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, tt + d); o.connect(g); g.connect(out); o.start(tt); o.stop(tt + d + 0.05); }
    return 1.7;
  },
  door(ctx, out, t, p) {   // nowy: zamek i zawiasy; zamknięcie — uderzenie skrzydła o ramę (rezonans blachy / drewna)
    const f = p.force, k = Math.round(p.kind), shut = p.action >= 0.5;
    if (k === 2) {   // autobus: drzwi pneumatyczne — syk powietrza, przesuw, gumowe dobicie
      burst(ctx, out, t, { freq: 5200, type: 'bandpass', q: 0.8, dur: 0.9, gain: 0.4 * (0.5 + f), attack: 0.02, sweep: 0.7 });
      burst(ctx, out, t + 0.15, { kind: 'brown', freq: 260, dur: 0.9, gain: 0.25, attack: 0.15 });
      if (shut) { noiseHit(ctx, out, t + 1, 160, 0.8, 0.12, 0.45 * f, 'lowpass'); partials(ctx, out, t + 1, [[95, 1, 0.12], [210, 0.5, 0.08]], 0.4 * f, 0.05, f); }
      return 1.4;
    }
    if (k === 3) {   // drewniane: skrzypienie zawiasu (piła przez rezonans, falujący ton), stuk drewna
      const len = shut ? 0.5 : 0.9, o = ctx.createOscillator(), bp = filt(ctx, 'bandpass', 1400, 9), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(38, t); for (let i = 1; i <= 8; i++) o.frequency.linearRampToValueAtTime(30 + Math.random() * 30, t + len * i / 8);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(bp); bp.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.05);
      if (shut) { partials(ctx, out, t + len, [[72, 1, 0.12], [148, 0.8, 0.07], [263, 0.6, 0.05], [417, 0.35, 0.035]], 0.9 * f, 0.15, f); noiseHit(ctx, out, t + len, 600, 1, 0.05, 0.5 * f); }
      return len + 0.4;
    }
    // samochód (0) i właz (1): klamka i zamek, przy zamknięciu uderzenie blachy (właz — cięższy, niżej, dłużej)
    const heavy = k === 1, lat = heavy ? [[620, 1, 0.08], [1480, 0.6, 0.05], [2900, 0.3, 0.03]] : [[1250, 1, 0.04], [2600, 0.7, 0.03], [4300, 0.4, 0.02]];
    if (!shut) { partials(ctx, out, t, lat, 0.25, 0.1, 0.7); noiseHit(ctx, out, t + 0.03, heavy ? 1800 : 3200, 2, 0.04, 0.2);
      if (heavy) burst(ctx, out, t + 0.1, { freq: 900, type: 'bandpass', q: 2, dur: 0.7, gain: 0.08, attack: 0.1 });   // zawias włazu
      return 0.6; }
    burst(ctx, out, t, { kind: 'brown', freq: heavy ? 180 : 320, dur: heavy ? 0.6 : 0.35, gain: 0.7 * f, attack: 0.003, rate: 1 });   // powietrze i uderzenie
    partials(ctx, out, t, heavy ? [[48, 1, 0.5], [97, 0.7, 0.35], [233, 0.4, 0.25], [520, 0.2, 0.15]] : [[95, 1, 0.18], [190, 0.6, 0.12], [410, 0.4, 0.08], [880, 0.2, 0.05]], 0.7 * f, 0.06, f);
    partials(ctx, out, t + 0.012, lat, 0.3 * f, 0.1, f);   // zatrzask
    return heavy ? 1 : 0.6;
  },
  hydraulic(ctx, out, t, p) {   // nowy: pompa (piła przez filtr, ton rośnie przy ruszeniu i opada na końcu), przepływ, blokada
    const T = p.time, f0 = 140 * p.pitch, o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = filt(ctx, 'lowpass', 900 * p.pitch, 2), g = ctx.createGain();
    o.type = 'sawtooth'; o2.type = 'square';
    o.frequency.setValueAtTime(f0 * 0.6, t); o.frequency.linearRampToValueAtTime(f0, t + 0.25); o.frequency.setValueAtTime(f0, t + T - 0.2); o.frequency.linearRampToValueAtTime(f0 * 0.7, t + T);
    o2.frequency.setValueAtTime(f0 * 0.6 * 2.01, t); o2.frequency.linearRampToValueAtTime(f0 * 2.01, t + 0.25); o2.frequency.setValueAtTime(f0 * 2.01, t + T - 0.2); o2.frequency.linearRampToValueAtTime(f0 * 1.4, t + T);
    const g2 = gainN(ctx, 0.25); o2.connect(g2); g2.connect(lp); o.connect(lp); lp.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.15); g.gain.setValueAtTime(0.16, t + T - 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + T);
    o.start(t); o2.start(t); o.stop(t + T + 0.05); o2.stop(t + T + 0.05);
    burst(ctx, out, t, { kind: 'pink', freq: 2200, type: 'bandpass', q: 1.2, dur: T, gain: 0.07, attack: 0.2, rate: 1 });   // olej w przewodach
    if (p.lock > 0) { partials(ctx, out, t + T, [[55, 1, 0.28], [118, 0.6, 0.16], [390, 0.35, 0.18], [910, 0.15, 0.1]], 0.8 * p.lock, 0.08, p.lock); noiseHit(ctx, out, t + T, 420, 0.8, 0.06, 0.4 * p.lock, 'lowpass'); }   // blokada (aTrain: zderzak)
    return T + 0.5;
  },
  ui(ctx, out, t, p) {   // Battle: click, bell, repair; reszta nowa — dźwięki interfejsu gry (skórki UI, js/gameui/skins.js)
    const k = p.pitch, o = p.level === 1 ? out : (() => { const g = gainN(ctx, p.level); g.connect(out); return g; })();
    switch (Math.round(p.kind)) {
      case 1: tone(ctx, o, t, 988 * k, 0.5, 0.12); tone(ctx, o, t + 0.35, 988 * k, 0.5, 0.12); return 1;
      case 2: tone(ctx, o, t, 660 * k, 0.15, 0.12); tone(ctx, o, t + 0.12, 880 * k, 0.2, 0.12); return 0.4;
      case 3: for (let i = 0; i < 4; i++) tone(ctx, o, t + i * 0.5, 880 * k, 0.4, 0.12, 'square', 660 * k); return 2;
      case 4: tone(ctx, o, t, 1500 * k, 0.07, 0.07, 'sine', 1900 * k); return 0.1;   // pik (elektronika)
      case 5: noiseHit(ctx, o, t, 5200 * k, 2.5, 0.015, 0.6); return 0.05;   // tyk (cichy klik)
      case 6: partials(ctx, o, t, [[1900 * k, 1, 0.05], [3150 * k, 0.8, 0.04], [4700 * k, 0.5, 0.03]], 0.12, 0.25, 0.6); noiseHit(ctx, o, t, 3000 * k, 2, 0.015, 0.15); return 0.1;   // przekaźnik (metal)
      case 7: burst(ctx, o, t, { kind: 'pink', freq: 700 * k, type: 'bandpass', q: 1.4, dur: 0.28, gain: 0.4, attack: 0.12, sweep: 3, rate: 1 }); return 0.3;   // otwarcie (szum w górę)
      case 8: burst(ctx, o, t, { kind: 'pink', freq: 2100 * k, type: 'bandpass', q: 1.4, dur: 0.25, gain: 0.35, attack: 0.03, sweep: 0.33, rate: 1 }); return 0.3;   // zamknięcie (szum w dół)
      case 9: noiseHit(ctx, o, t, (2600 + Math.random() * 900) * k, 3, 0.025, 0.3); tone(ctx, o, t, (420 + Math.random() * 60) * k, 0.03, 0.06, 'square'); return 0.05;   // klawisz (pisanie)
      case 10: tone(ctx, o, t, 880 * k, 0.1, 0.09, 'sine'); tone(ctx, o, t + 0.08, 1320 * k, 0.16, 0.09, 'sine'); return 0.3;   // potwierdzenie
      case 11: tone(ctx, o, t, 150 * k, 0.22, 0.12, 'sawtooth', 120 * k); tone(ctx, o, t + 0.02, 157 * k, 0.2, 0.08, 'square', 125 * k); return 0.3;   // odmowa (brzęczyk)
      default: tone(ctx, o, t, 1200 * k, 0.05, 0.05); return 0.1;
    }
  },
};

/* ---------------- ciągłe ---------------- */
// każdy: (ctx, out, p) → { set(p), tick(t), stop(t) }; tick co 0,1 s planuje zdarzenia losowe (krople, trzaski, auta)
const LOOP = {
  wind(ctx, out, p) {
    const s = src(ctx, 'pink', true), bp = filt(ctx, 'bandpass', 500, 0.7), lp = filt(ctx, 'lowpass', 1800), g = gainN(ctx, 0);
    s.connect(bp); bp.connect(lp); lp.connect(g); g.connect(out); s.start();
    let next = 0;
    return { set(q) { p = q; }, tick(t) { if (t < next) return; const gust = 1 + (Math.random() - 0.3) * p.gusts * 1.4, d = 1 + Math.random() * 3;
      g.gain.setTargetAtTime(Math.max(0, p.strength * 0.9 * gust), t, d * 0.4); bp.frequency.setTargetAtTime((250 + p.strength * 650) * (0.8 + Math.random() * 0.5 * (0.5 + p.gusts)), t, d * 0.5); next = t + d; },
    nodes: [s] };
  },
  rain(ctx, out, p) {
    const s = src(ctx, 'white', true), hp = filt(ctx, 'highpass', 1200), lp = filt(ctx, 'lowpass', 9000), g = gainN(ctx, 0);
    s.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out); s.start();
    const r = src(ctx, 'brown', true), rg = gainN(ctx, 0); r.connect(rg); rg.connect(out); r.start();
    return { set(q) { p = q; g.gain.setTargetAtTime(p.intensity * 0.22, ctx.currentTime, 0.4); rg.gain.setTargetAtTime(p.intensity * 0.25, ctx.currentTime, 0.4); },
      tick(t) { const n = Math.round(p.intensity * 12 * Math.random()); for (let i = 0; i < n; i++) { const f = 1400 + Math.random() * 3000, tt = t + Math.random() * 0.1; tone(ctx, out, tt, f, 0.035, 0.03 * Math.random() + 0.01, 'sine', f * 0.45); } },
      nodes: [s, r] };
  },
  sea(ctx, out, p) {
    const s = src(ctx, 'brown', true), lp = filt(ctx, 'lowpass', 500), g = gainN(ctx, 0);
    const h = src(ctx, 'white', true), hp = filt(ctx, 'bandpass', 2500, 0.5), hg = gainN(ctx, 0);
    s.connect(lp); lp.connect(g); g.connect(out); h.connect(hp); hp.connect(hg); hg.connect(out); s.start(); h.start();
    let next = 0;
    return { set(q) { p = q; }, tick(t) { if (t < next) return; const T = p.period * (0.8 + Math.random() * 0.4), k = p.strength * (0.7 + Math.random() * 0.6);
      g.gain.setTargetAtTime(0.15 + 0.6 * k, t, T * 0.15); g.gain.setTargetAtTime(0.1, t + T * 0.45, T * 0.2); lp.frequency.setTargetAtTime(300 + 900 * k, t, T * 0.15); lp.frequency.setTargetAtTime(250, t + T * 0.45, T * 0.2);
      hg.gain.setTargetAtTime(0.12 * k, t + T * 0.3, 0.2); hg.gain.setTargetAtTime(0, t + T * 0.55, T * 0.15); next = t + T; },
    nodes: [s, h] };
  },
  stream(ctx, out, p) {   // szemranie: szum przez rezonatory przeskakujące po częstotliwościach (bąble)
    const s = src(ctx, 'white', true), base = gainN(ctx, 0), lp = filt(ctx, 'lowpass', 1500); s.connect(lp); lp.connect(base); base.connect(out); s.start();
    const res = [0, 1, 2, 3].map(() => { const b = filt(ctx, 'bandpass', 800, 18), g = gainN(ctx, 0); s.connect(b); b.connect(g); g.connect(out); return { b, g }; });
    return { set(q) { p = q; base.gain.setTargetAtTime(0.05 + p.flow * 0.12, ctx.currentTime, 0.3); },
      tick(t) { for (const r of res) if (Math.random() < 0.3 + p.flow * 0.5) { const f = 500 + Math.random() * 1800, tt = t + Math.random() * 0.1; r.b.frequency.setValueAtTime(f, tt); r.b.frequency.exponentialRampToValueAtTime(f * 1.5, tt + 0.06);
        r.g.gain.setValueAtTime(0.0001, tt); r.g.gain.exponentialRampToValueAtTime(0.9 * (0.3 + p.flow), tt + 0.01); r.g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.08); } },
      nodes: [s] };
  },
  fire(ctx, out, p) {
    const s = src(ctx, 'brown', true), lp = filt(ctx, 'lowpass', 400), g = gainN(ctx, 0); s.connect(lp); lp.connect(g); g.connect(out); s.start();
    return { set(q) { p = q; g.gain.setTargetAtTime(0.15 + p.size * 0.5, ctx.currentTime, 0.4); lp.frequency.setTargetAtTime(250 + p.size * 400, ctx.currentTime, 0.4); },
      tick(t) { const n = Math.random() < 0.6 ? Math.round(Math.random() * (1 + p.size * 5)) : 0;
        for (let i = 0; i < n; i++) noiseHit(ctx, out, t + Math.random() * 0.1, 2000 + Math.random() * 5000, 2, 0.008 + Math.random() * 0.03, 0.1 + Math.random() * 0.4); },
      nodes: [s] };
  },
  crickets(ctx, out, p) {
    const o = ctx.createOscillator(), am = gainN(ctx, 0), g = gainN(ctx, 0.0); o.frequency.value = 4600; o.connect(am); am.connect(g); g.connect(out); o.start();
    let next = 0;
    return { set(q) { p = q; g.gain.setTargetAtTime(0.06 + p.density * 0.06, ctx.currentTime, 0.3); },
      tick(t) { if (t < next) return; const n = 3 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) { const tt = t + i * 0.045; am.gain.setValueAtTime(0, tt); am.gain.linearRampToValueAtTime(1, tt + 0.01); am.gain.linearRampToValueAtTime(0, tt + 0.03); }
        next = t + 0.4 + (1 - p.density) * 1.6 * Math.random(); },
      nodes: [o] };
  },
  city(ctx, out, p) {   // szum miasta i przejeżdżające auta, czasem klakson
    const s = src(ctx, 'brown', true), lp = filt(ctx, 'lowpass', 350), g = gainN(ctx, 0); s.connect(lp); lp.connect(g); g.connect(out); s.start();
    let next = 0;
    return { set(q) { p = q; g.gain.setTargetAtTime(0.15 + p.traffic * 0.4, ctx.currentTime, 0.5); },
      tick(t) {
        if (t < next) return; next = t + (0.6 + Math.random() * 4) * (1.4 - p.traffic);
        const d = 2 + Math.random() * 3, n = src(ctx, 'pink'), bp = filt(ctx, 'bandpass', 600, 0.8), cg = ctx.createGain(), pan = ctx.createStereoPanner(), dir = Math.random() < 0.5 ? -1 : 1;
        n.playbackRate.value = 1; bp.frequency.setValueAtTime(500, t); bp.frequency.linearRampToValueAtTime(900, t + d / 2); bp.frequency.linearRampToValueAtTime(420, t + d);
        cg.gain.setValueAtTime(0.0001, t); cg.gain.exponentialRampToValueAtTime(0.25 + p.traffic * 0.3, t + d / 2); cg.gain.exponentialRampToValueAtTime(0.0001, t + d);
        pan.pan.setValueAtTime(-0.9 * dir, t); pan.pan.linearRampToValueAtTime(0.9 * dir, t + d);
        n.connect(bp); bp.connect(cg); cg.connect(pan); pan.connect(out); n.start(t, Math.random() * 3); n.stop(t + d + 0.1);
        if (Math.random() < 0.05 * p.traffic) { tone(ctx, out, t + 0.5, 420, 0.4, 0.05, 'square'); tone(ctx, out, t + 0.5, 520, 0.4, 0.04, 'square'); }
      },
      nodes: [s] };
  },
  engine(ctx, out, p) {   // zapłony: piła na częstotliwości zapłonów (obroty / 60 × cylindry / 2) przez przester i filtr
    const o = ctx.createOscillator(), sub = ctx.createOscillator(), sh = ctx.createWaveShaper(), lp = filt(ctx, 'lowpass', 600, 2), g = gainN(ctx, 0.35), sg = gainN(ctx, 0.25);
    o.type = 'sawtooth'; sub.type = 'sine'; const c = new Float32Array(512); for (let i = 0; i < 512; i++) { const x = i / 255.5 - 1; c[i] = Math.tanh(x * 3); } sh.curve = c;
    const n = src(ctx, 'brown', true), ng = gainN(ctx, 0.1); n.connect(ng); ng.connect(lp);
    o.connect(sh); sh.connect(lp); sub.connect(sg); sg.connect(g); lp.connect(g); g.connect(out); o.start(); sub.start(); n.start();
    const apply = (tc = 0.08) => { const f = p.rpm / 60 * p.cylinders / 2, t = ctx.currentTime; o.frequency.setTargetAtTime(f, t, tc); sub.frequency.setTargetAtTime(f / 2, t, tc);
      lp.frequency.setTargetAtTime(300 + p.load * 1800 + f * 2, t, tc); ng.gain.setTargetAtTime(0.05 + p.load * 0.2, t, tc); g.gain.setTargetAtTime(0.1 + p.load * 0.14, t, tc); };
    apply(0.001);
    return { set(q) { p = q; apply(); }, tick() {}, nodes: [o, sub, n] };
  },
  pump(ctx, out, p) {   // nowy: agregat hydrauliczny — silnik (piła ~ 25 Hz × 4 bieguny przez filtr), pompa łopatkowa (wyższy ton), szum oleju
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = filt(ctx, 'lowpass', 500, 1.5), g = gainN(ctx, 0), g2 = gainN(ctx, 0.12);
    o.type = 'sawtooth'; o2.type = 'triangle'; o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g);
    const n = src(ctx, 'pink', true), bp = filt(ctx, 'bandpass', 1800, 1), ng = gainN(ctx, 0); n.connect(bp); bp.connect(ng); ng.connect(g); g.connect(out); o.start(); o2.start(); n.start();
    const apply = (tc = 0.1) => { const t = ctx.currentTime, f = 96 - p.load * 10;
      o.frequency.setTargetAtTime(f, t, tc); o2.frequency.setTargetAtTime(f * 9, t, tc); lp.frequency.setTargetAtTime(380 + p.load * 900, t, tc);
      ng.gain.setTargetAtTime(0.04 + p.load * 0.18, t, tc); g.gain.setTargetAtTime(0.12 + p.load * 0.12, t, tc); };
    apply(0.001);
    return { set(q) { p = q; apply(); }, tick() {}, nodes: [o, o2, n] };
  },
  turbine(ctx, out, p) {   // nowy: turbina — gwizd łopatek (sinusy wysoko, rosną z obrotami), szum przepływu, niski huk spalania / pary
    const w1 = ctx.createOscillator(), w2 = ctx.createOscillator(), wg = gainN(ctx, 0), n = src(ctx, 'pink', true), bp = filt(ctx, 'bandpass', 1200, 0.7), ng = gainN(ctx, 0);
    const r = src(ctx, 'brown', true), lp = filt(ctx, 'lowpass', 220), rg = gainN(ctx, 0), g = gainN(ctx, 1);
    w1.type = 'sine'; w2.type = 'sine'; w1.connect(wg); w2.connect(wg); wg.connect(g); n.connect(bp); bp.connect(ng); ng.connect(g); r.connect(lp); lp.connect(rg); rg.connect(g); g.connect(out);
    w1.start(); w2.start(); n.start(); r.start();
    const apply = (tc = 0.4) => { const t = ctx.currentTime, k = 1 - p.size * 0.6, f = (900 + p.spool * 2600) * k;
      w1.frequency.setTargetAtTime(f, t, tc); w2.frequency.setTargetAtTime(f * 1.5 + 37, t, tc); wg.gain.setTargetAtTime(0.012 + p.spool * 0.03, t, tc);
      bp.frequency.setTargetAtTime((500 + p.spool * 2200) * k, t, tc); ng.gain.setTargetAtTime(0.06 + p.spool * 0.2 + p.load * 0.1, t, tc);
      rg.gain.setTargetAtTime(0.1 + p.load * 0.35 + p.size * 0.15, t, tc); };
    apply(0.001);
    return { set(q) { p = q; apply(0.4); }, tick() {}, nodes: [w1, w2, n, r] };
  },
  rail(ctx, out, p) {   // aTrain: toczenie (szum brązowy rośnie z prędkością) i stuki na stykach szyn — para kół wózka, potem drugi wózek
    const n = src(ctx, 'brown', true), lp = filt(ctx, 'lowpass', 300), ng = gainN(ctx, 0), hum = src(ctx, 'pink', true), bp = filt(ctx, 'bandpass', 900, 2), hg = gainN(ctx, 0);
    n.connect(lp); lp.connect(ng); ng.connect(out); hum.connect(bp); bp.connect(hg); hg.connect(out); n.start(); hum.start();
    let next = 0;
    const apply = (tc = 0.2) => { const t = ctx.currentTime, v = p.speed; ng.gain.setTargetAtTime(Math.min(0.5, v * 0.02), t, tc); lp.frequency.setTargetAtTime(160 + v * 12, t, tc);
      hg.gain.setTargetAtTime(Math.min(0.12, v * 0.004), t, tc); bp.frequency.setTargetAtTime(500 + v * 25, t, tc); };
    apply(0.001);
    const clack = (t, s) => { partials(ctx, out, t, [[180, 1, 0.08], [431, 0.7, 0.06], [812, 0.4, 0.04]], 0.5 * s, 0.08, s); noiseHit(ctx, out, t, 1200, 1, 0.025, 0.35 * s); };
    return {
      set(q) { p = q; apply(); },
      tick(t) {   // styk co joint / speed s: dwa koła wózka (rozstaw bogie) — stuk-stuk
        const v = p.speed; if (v < 0.5 || !p.clacks) { next = 0; return; }
        if (!next) next = t + 0.05;
        while (next < t + 0.15) { const s = Math.min(1, 0.3 + v / 30), dt = p.bogie / v; clack(next, s); clack(next + dt, s * 0.9); next += p.joint / v; }
      },
      nodes: [n, hum],
    };
  },
  squeal(ctx, out, p) {   // aTrain: pisk obrzeża koła — szum w paśmie i piła 2600–4000 Hz z drżeniem przez wąskie pasmo
    const s = src(ctx, 'white', true), bp = filt(ctx, 'bandpass', 900, 1.2), g1 = gainN(ctx, 0); s.connect(bp); bp.connect(g1); g1.connect(out); s.start();
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 2600 + Math.random() * 1400;
    const lfo = ctx.createOscillator(), lg = gainN(ctx, 40); lfo.frequency.value = 5 + Math.random() * 4; lfo.connect(lg); lg.connect(o.frequency);
    const sq = filt(ctx, 'bandpass', o.frequency.value, 8), g2 = gainN(ctx, 0); o.connect(sq); sq.connect(g2); g2.connect(out); o.start(); lfo.start();
    return { set(q) { p = q; const t = ctx.currentTime; g1.gain.setTargetAtTime(p.strength * 0.25, t, 0.1); g2.gain.setTargetAtTime(p.strength * p.strength * 0.12, t, 0.1); }, tick() {}, nodes: [s, o, lfo] };
  },
  hum(ctx, out, p) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = gainN(ctx, 0), g2 = gainN(ctx, 0.3); o.type = 'sawtooth'; o2.type = 'sine';
    const lp = filt(ctx, 'lowpass', 500); o.connect(lp); lp.connect(g); o2.connect(g2); g2.connect(g); g.connect(out); o.start(); o2.start();
    return { set(q) { p = q; const t = ctx.currentTime; o.frequency.setTargetAtTime(p.freq * 2, t, 0.05); o2.frequency.setTargetAtTime(p.freq, t, 0.05); g.gain.setTargetAtTime(p.level * 0.12, t, 0.2); }, tick() {}, nodes: [o, o2] };
  },
};

/* ---------------- odtwarzanie ---------------- */
// wyjście: szyna miksera, w miejscu (at: [x, y, z]; ref — odległość pełnej głośności, m) albo wprost; gain — głośność
// tego dźwięku; g.pan — źródło w przestrzeni (do przesuwania), gdy jest
function outFor(at, bus, gain, ref) {
  const mx = mixer(), ctx = mx.ctx, g = gainN(ctx, gain);
  if (at) { g.pan = mx.at(at, bus, ref ? { ref } : undefined); g.connect(g.pan); } else g.connect(mx.bus(bus));
  return g;
}
/** Dźwięk jednorazowy: opis { sound, params, gain } albo id. → { end } (czas końca w sekundach kontekstu). */
export function play(d0, { at = null, bus = 'sfx', gain = 1, when = 0, ref = 0 } = {}) {
  const d = normalizeSound(typeof d0 === 'string' ? { sound: d0 } : d0), def = SOUNDS[d.sound], mx = mixer(), ctx = mx.ctx;
  mx.unlock();
  if (def.loop) { const h = start(d, { at, ref, bus: bus === 'sfx' ? 'ambience' : bus, gain }); setTimeout(() => h.stop(), 4000); return { end: ctx.currentTime + 4, handle: h }; }
  const out = outFor(at, bus, d.gain * gain, ref), t = ctx.currentTime + 0.02 + when, len = ONE[d.sound](ctx, out, t, d.params);
  setTimeout(() => { try { out.disconnect(); if (out.pan) out.pan.disconnect(); } catch { /* już */ } }, (len + when + 1) * 1000);
  return { end: t + len };
}
const live = new Set();
let ticker = 0;
function ensureTicker() {
  if (ticker) return;
  ticker = setInterval(() => { const ctx = mixer().ctx, t = ctx.currentTime; for (const h of live) h.tick(t); if (!live.size) { clearInterval(ticker); ticker = 0; } }, 100);
}
/** Dźwięk ciągły (albo tło jednorazowych co jakiś czas): → { set(params), move(at), stop(fade), playing }. */
export function start(d0, { at = null, bus = 'ambience', gain = 1, every = null, spread = 0, ref = 0 } = {}) {
  const d = normalizeSound(typeof d0 === 'string' ? { sound: d0 } : d0), def = SOUNDS[d.sound], mx = mixer(), ctx = mx.ctx;
  mx.unlock();
  const out = outFor(at, bus, 0, ref), level = () => d.gain * gain;
  out.gain.setTargetAtTime(level(), ctx.currentTime, 0.3);
  let inner = null, next = 0;
  if (def.loop) inner = LOOP[d.sound](ctx, out, d.params);
  if (inner) inner.set(d.params);
  const h = {
    playing: true,
    tick(t) {
      if (inner) inner.tick(t);
      else if (t >= next) {   // jednorazowy co [od, do] s (ptaki w tle), w losowym miejscu w stereo (spread)
        const [a, b] = every || [3, 9], o2 = ctx.createStereoPanner(); o2.pan.value = (Math.random() * 2 - 1) * spread; o2.connect(out);
        const len = ONE[d.sound](ctx, o2, t + 0.05, d.params); next = t + len + a + Math.random() * (b - a);
        setTimeout(() => { try { o2.disconnect(); } catch { /* już */ } }, (len + 1) * 1000);
      }
    },
    set(params = {}, g = null) { Object.assign(d.params, params); if (g != null) gain = g; if (inner) inner.set(d.params); out.gain.setTargetAtTime(level(), ctx.currentTime, 0.2); },
    move(p) { if (out.pan) mx.move(out.pan, p); },   // źródło w przestrzeni (at): nowe położenie
    volume(v) { d.gain = Math.max(0, Math.min(2, +v || 0)); out.gain.setTargetAtTime(level(), ctx.currentTime, 0.2); },
    stop(fade = 0.6) {
      if (!h.playing) return; h.playing = false; live.delete(h);
      const t = ctx.currentTime; out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(0, t, fade / 3);
      setTimeout(() => { if (inner) for (const n of inner.nodes) { try { n.stop(); } catch { /* już */ } } try { out.disconnect(); if (out.pan) out.pan.disconnect(); } catch { /* już */ } }, fade * 1000 + 200);
    },
  };
  if (!inner) next = ctx.currentTime + Math.random() * ((every || [3, 9])[0]);
  live.add(h); ensureTicker();
  return h;
}

/* ---------------- tła miejsc ---------------- */
const L = (sound, params, level, every, spread) => ({ sound, params, level, ...(every ? { every } : {}), ...(spread != null ? { spread } : {}) });
export const AMBIENCES = {
  forest: { label: 'Forest by day', labelPl: 'Las za dnia', layers: [L('wind', { strength: 0.25, gusts: 0.5 }, 0.7), L('bird', { species: 2, pitch: 1 }, 0.8, [3, 9], 0.8), L('bird', { species: 1, pitch: 1 }, 0.6, [6, 15], 0.8), L('stream', { flow: 0.3 }, 0)] },
  park: { label: 'City park', labelPl: 'Park w mieście', layers: [L('city', { traffic: 0.4 }, 0.6), L('bird', { species: 0, pitch: 1 }, 0.7, [2, 6], 0.9), L('bird', { species: 4, pitch: 1 }, 0.5, [10, 25], 0.7), L('wind', { strength: 0.15, gusts: 0.3 }, 0.5)] },
  seaside: { label: 'Seaside', labelPl: 'Brzeg morza', layers: [L('sea', { strength: 0.6, period: 8 }, 1), L('wind', { strength: 0.45, gusts: 0.6 }, 0.6), L('bird', { species: 3, pitch: 1 }, 0.7, [4, 12], 0.9)] },
  storm: { label: 'Storm', labelPl: 'Burza', layers: [L('rain', { intensity: 0.9 }, 1), L('wind', { strength: 0.8, gusts: 0.9 }, 0.8), L('thunder', { distance: 0.4 }, 0.9, [8, 20], 0.6)] },
  night: { label: 'Summer night', labelPl: 'Letnia noc', layers: [L('crickets', { density: 0.6 }, 0.8), L('wind', { strength: 0.12, gusts: 0.3 }, 0.5), L('bird', { species: 5, pitch: 1 }, 0.6, [10, 25], 0.7)] },
  campfire: { label: 'Campfire', labelPl: 'Ognisko', layers: [L('fire', { size: 0.4 }, 1), L('crickets', { density: 0.4 }, 0.4), L('wind', { strength: 0.15, gusts: 0.4 }, 0.4)] },
};
export function normalizeAmbience(a = {}) {
  const layers = (Array.isArray(a.layers) ? a.layers : []).filter((l) => SOUNDS[l.sound]).slice(0, 12).map((l) => {
    const s = normalizeSound({ sound: l.sound, params: l.params });
    const out = { sound: s.sound, params: s.params, level: Math.max(0, Math.min(1.5, +(l.level ?? 1))) };
    if (!SOUNDS[l.sound].loop) { const e = Array.isArray(l.every) ? l.every : [4, 12]; out.every = [Math.max(0.5, +e[0] || 4), Math.max(1, +e[1] || 12)]; out.spread = Math.max(0, Math.min(1, +(l.spread ?? 0.7))); }
    return out;
  });
  return { layers };
}
/** Tło miejsca: warstwy grają razem na szynie otoczenia. → { layers: [uchwyt], set(i, poziom), move(at), stop() } */
export function ambience(a0, { at = null, ref = 0 } = {}) {
  const a = normalizeAmbience(typeof a0 === 'string' ? AMBIENCES[a0] : a0);
  const hs = a.layers.map((l) => start({ sound: l.sound, params: l.params }, { at, ref, bus: 'ambience', gain: l.level, every: l.every, spread: l.spread }));
  return { def: a, layers: hs, set(i, level) { if (hs[i]) hs[i].set({}, level); a.layers[i].level = level; }, move(p) { hs.forEach((h) => h.move(p)); }, stop(fade = 1.2) { hs.forEach((h) => h.stop(fade)); } };
}
export const stopAll = (fade = 0.5) => { for (const h of [...live]) h.stop(fade); };
