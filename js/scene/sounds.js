// Dźwięk w scenie: silnik, wspólny dla edytora sceny (▶ Graj) i gier. Gra przez mikser silnika (js/audio/mixer.js),
// dźwięki z SfxKit (js/audio/sfx/sfxkit.js), w miejscu (dźwięk przestrzenny; słuchacz — kamera, ustawia go gra).
//
// 1. Źródło przy obiekcie: pole „sound” obiektu sceny — gotowy dźwięk SfxKit (id, np. fire, engine, bird), gotowe tło
//    miejsca (forest, park, seaside, storm, night, campfire) albo nazwa zasobu „sound” lub „ambience” z laboratorium
//    efektów (w tej kolejności: gotowe przed zapisanymi, dźwięk przed tłem). Gra przez całą grę, idzie za obiektem;
//    jednorazowe (ptak, wybuch…) — co kilka sekund. Zasięg (odległość pełnej głośności): pole „soundRange” [m] albo
//    domyślny rodzaju (rangeOf); edytor pokazuje go kulami.
// 2. Silniki pojazdów z zachowań (ENGINES): obroty i obciążenie z prędkości i dźwigni zachowania (hud()), silnik
//    z danych modelu (info.sounds.engine: cylindry, obroty wolne i maksymalne, elektryczny) — samochód z biegami,
//    okręt, samolot, mała jednostka, przeładowarka; napęd elektryczny — buczenie; silniki rakietowe (ciąg w próżni,
//    lądowanie) — huk ognia z mocą. Rozbicie (hud().crashed) — wybuch.
// 4. Dźwięki modeli (drzwi, właz, podwozie, klapy — zdarzenia onSound, js/models/shared/sound-events.js): model(e).
// 3. Efekty ze zdarzeń: strzały statków (ShipKit onShot) i zdarzenie „effect” (polecenie API „effect”) — dźwięk
//    rodzaju efektu (EFFECT_SOUNDS: strzał, wybuch, odłamki, piorun), wybuch statku (ShipKit onDamage, „blast”);
//    polecenie API „sound” — dowolny dźwięk w miejscu.
//
// createSceneSounds({ positionOf(id) → [x, y, z] | null }) → { start(objects, runs), frame(runs), stop(), shot(s),
//   damage(e), effect(e), model(e), play(nazwa, at) }; runs — zachowania gry ({ obj, id, run, input }) z editor/js/play/play.js.
import { SOUNDS, SOUND_IDS, AMBIENCES, refOf, play as playSound, start as startSound, ambience as startAmbience } from '../audio/sfx/sfxkit.js';
import { getAsset, listAssets } from './assets.js';

// odległość pełnej głośności dźwięku — SfxKit refOf (głośne słychać daleko); tło miejsca — obszar
const REF = { ambience: 15 };

/** Dźwięk obiektu z nazwy → { kind: 'sound' | 'ambience', def } albo null (nie ma takiego). */
export function soundOf(name, get = getAsset) {
  if (!name) return null;
  if (SOUNDS[name]) return { kind: 'sound', def: { sound: name } };
  if (AMBIENCES[name]) return { kind: 'ambience', def: AMBIENCES[name] };
  const s = get('sound', name); if (s && SOUNDS[s.sound]) return { kind: 'sound', def: s };
  const a = get('ambience', name); if (a && Array.isArray(a.layers)) return { kind: 'ambience', def: a };
  return null;
}
/** Zasięg dźwięku obiektu [m] — odległość pełnej głośności: pole „soundRange” albo domyślna rodzaju (SfxKit refOf; tło
 *  miejsca — 15 m); null — obiekt bez dźwięku. Dalej cichnie (granica słyszalności — mixer.audible). */
export function rangeOf(o, get = getAsset) {
  const s = o && soundOf(o.sound, get); if (!s) return null;
  if (o.soundRange > 0) return o.soundRange;
  return s.kind === 'sound' ? refOf(s.def.sound) : REF.ambience;
}
/** Nazwy do wyboru: gotowe dźwięki i tła, zapisane dźwięki i tła (laboratorium efektów). */
export function soundNames(list = listAssets) {
  return { sounds: SOUND_IDS, places: Object.keys(AMBIENCES), saved: list('sound'), savedPlaces: list('ambience') };
}
export const allSoundNames = (list = listAssets) => { const n = soundNames(list); return [...n.sounds, ...n.places, ...n.saved, ...n.savedPlaces]; };

/* ---------------- silniki pojazdów ---------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// silnik z danych modelu (info.sounds.engine — js/models/shared/sound-events.js): { cylinders, idle, redline [obr/min],
// electric: true — napęd elektryczny }; bez danych — zwykły silnik zachowania (domyślne niżej)
export function engineOf(kit) {
  const k = kit || {}, s = k.sounds || (k.def && k.def.sounds) || (k.info && k.info.sounds) || {};
  return s.engine || {};
}
// prędkości przełożeń [km/h] skrzyni samochodu: obroty jak piła, na postoju gaz podnosi obroty
const GEARS = [22, 42, 68, 98, 135, 190];
function gearRpm(v, thr, idle, red) {
  let lo = 0;
  for (let i = 0; i < GEARS.length; i++) {
    if (v < GEARS[i] || i === GEARS.length - 1) {
      const f = clamp((v - lo) / (GEARS[i] - lo), 0, 1), shift = idle + (red - idle) * 0.4;
      return (i === 0 ? idle + f * (red * 0.85 - idle) : shift + f * (red * 0.88 - shift)) + (v < 3 ? Math.abs(thr) * (red - idle) * 0.25 : 0);
    }
    lo = GEARS[i];
  }
  return idle;
}
const electric = (h) => ({ sound: 'hum', params: { freq: 60, level: 0.15 + Math.abs(h.throttle || 0) * 0.6 } });
// silnik tłokowy: obroty od wolnych do maksymalnych z dźwignią (lever) albo z biegami (gears)
const piston = (h, e, d, gears) => {
  if (e.electric) return electric(h);
  const idle = e.idle || d.idle, red = e.redline || d.redline, thr = Math.abs(h.throttle || 0);
  return { sound: 'engine', params: { rpm: gears ? gearRpm(Math.abs(h.speed), thr, idle, red) : idle + thr * (red * 0.92 - idle), load: thr, cylinders: e.cylinders || d.cylinders } };
};
const rocket = (h, e, c) => { const p = clamp(Math.max(Math.abs(h.throttle || 0), c.lift || 0), 0, 1); return { sound: 'fire', params: { size: 0.3 + p * 0.7 }, level: p > 0.02 ? 0.4 + p : 0 }; };
// id zachowania → (hud, silnik z danych modelu, sterowanie) → { sound, params, level? } (level — głośność 0…1, domyślnie 1)
export const ENGINES = {
  drive: (h, e) => piston(h, e, { idle: 850, redline: 5500, cylinders: 4 }, true),
  ship: (h, e) => piston(h, e, { idle: 600, redline: 1400, cylinders: 8 }),
  craft: (h, e) => piston(h, e, { idle: 900, redline: 5500, cylinders: 4 }),
  flight: (h, e) => ({ ...piston({ throttle: clamp(h.throttle || 0, 0, 1) }, e, { idle: 900, redline: 3000, cylinders: 6 }), level: h.crashed ? 0 : 1 }),
  grapple: (h, e) => piston(h, e, { idle: 750, redline: 2400, cylinders: 6 }),
  thrust: rocket,
  lander: (h, e, c) => (h.crashed ? { sound: 'fire', params: { size: 0.3 }, level: 0 } : rocket(h, e, c)),
};

/* ---------------- efekty ---------------- */
// rodzaj efektu EffectKit → dźwięk (miejsce: from — strzał, at — reszta); bez wpisu — efekt bez dźwięku
export const EFFECT_SOUNDS = {
  shot: { sound: 'gunshot', params: { calibre: 0.15, distance: 0.1, room: 0.2 }, from: true },
  piercer: { sound: 'gunshot', params: { calibre: 0.35, distance: 0.1, room: 0.3 }, from: true },
  explosion: { sound: 'explosion', params: { size: 0.6, distance: 0.15, debris: 0.5 }, size: (e) => clamp((e.radius || 10) / 25, 0.15, 1) },
  debris: { sound: 'impact', params: { material: 0, strength: 0.6 } },
  bolt: { sound: 'thunder', params: { distance: 0 }, path: true },
  zap: { sound: 'thunder', params: { distance: 0 }, path: true },
};
const pt = (p) => (p && p.toArray ? p.toArray() : Array.isArray(p) && p.length === 3 && p.every(Number.isFinite) ? p : null);

// onLoud(rodzaj) — głośne zdarzenie (wybuch, strzał, piorun, rozbicie): np. muzyka akcji (js/scene/music.js)
const LOUD = new Set(['explosion', 'gunshot', 'thunder']);
export function createSceneSounds({ positionOf, get = getAsset, onLoud = null }) {
  let sources = [], engines = [], live = false;   // live: w grze (dźwięki modeli tylko wtedy — po „Stop” części wracają na miejsce po cichu)
  const near = (id) => positionOf(id) || [0, 0, 0];
  function effectSound(kind, e) {
    const m = EFFECT_SOUNDS[kind]; if (!m) return;
    const at = pt(m.from ? e.from : m.path ? (e.path || [])[0] : e.at) || pt(e.to) || pt(e.from); if (!at) return;
    const params = { ...m.params }; if (m.size) params.size = m.size(e);
    try { playSound({ sound: m.sound, params }, { at, ref: refOf(m.sound) }); } catch (err) { if (window.LabLog) window.LabLog.add('warn', 'Sound: ' + err.message); }
    if (onLoud && LOUD.has(m.sound)) onLoud(m.sound);
  }
  return {
    // początek gry: źródła przy obiektach z polem „sound” i silniki zachowań
    start(objects, runs) {
      this.stop(); live = true;
      for (const o of objects) {
        const s = soundOf(o.sound, get); if (!s) continue;
        const at = near(o.id), ref = rangeOf(o, get), h = s.kind === 'sound' ? startSound(s.def, { at, ref, every: [4, 12] }) : startAmbience(s.def, { at, ref });
        sources.push({ id: o.id, h });
      }
      for (const r of runs) {
        const f = ENGINES[r.id]; if (!f) continue;
        const eng = engineOf(r.b && r.b.kit), e0 = f(r.run.hud(), eng, r.input || {});
        const h = startSound({ sound: e0.sound, params: e0.params }, { at: near(r.obj.id), ref: refOf(e0.sound), bus: 'sfx', gain: e0.level ?? 1 });
        engines.push({ r, f, h, eng, crashed: false });
      }
    },
    // klatka: źródła idą za obiektami, silniki — obroty z zachowania, rozbicie — wybuch
    frame() {
      for (const s of sources) { const p = positionOf(s.id); if (p) s.h.move(p); }
      for (const e of engines) {
        const h = e.r.run.hud(), v = e.f(h, e.eng, e.r.input || {}), p = positionOf(e.r.obj.id);
        if (p) e.h.move(p);
        e.h.set(v.params, v.level ?? 1);
        if (h.crashed && !e.crashed && p) { playSound({ sound: 'explosion', params: { size: 0.7, distance: 0.1, debris: 0.7 } }, { at: p, ref: refOf('explosion') }); if (onLoud) onLoud('crash'); }
        e.crashed = !!h.crashed;
      }
    },
    stop() { live = false; for (const s of sources) s.h.stop(0.6); for (const e of engines) e.h.stop(0.4); sources = []; engines = []; },
    // strzał statku (ShipKit onShot: { from, to, dir }) z efektem obiektu (pole „shot”)
    // (rodzaj efektu albo zapisany efekt; rodzaj bez dźwięku — zwykły strzał)
    shot(s, choice = 'shot') { const k = EFFECT_SOUNDS[choice] ? choice : (get('effect', choice) || {}).kind; effectSound(EFFECT_SOUNDS[k] ? k : 'shot', s); },
    // dźwięk modelu (onSound: { id, at, def }) — opis z danych modelu
    model(e) { if (live && e && e.def && e.def.sound) try { playSound(e.def, { at: e.at, ref: e.def.ref || refOf(e.def.sound) }); } catch (err) { if (window.LabLog) window.LabLog.add('warn', 'Model sound: ' + err.message); } },
    // uszkodzenie statku (ShipKit onDamage): wybuch (blast) — dźwięk wybuchu z wielkością z promienia
    damage(e) { if (e && e.type === 'blast') effectSound('explosion', { at: e.at, radius: e.radius }); },
    // zdarzenie „effect”: { kind | asset, at, from, to, path, radius }
    effect(e) { const kind = e.kind || ((get('effect', e.asset) || {}).kind); if (kind) effectSound(kind, e); },
    // polecenie API „sound”: dźwięk (gotowy albo zapisany) w miejscu; tło miejsca — nie (to źródło przy obiekcie)
    play(name, at) {
      const s = soundOf(name, get); if (!s || s.kind !== 'sound') throw new Error(`no sound "${name}"`);
      return playSound(s.def, { at, ref: refOf(s.def.sound) });
    },
    get playing() { return sources.length + engines.length > 0; },
  };
}
