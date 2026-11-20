// Dźwięk w scenie: silnik, wspólny dla edytora sceny (▶ Graj) i gier. Gra przez mikser silnika (js/audio/mixer.js),
// dźwięki z SfxKit (js/audio/sfx/sfxkit.js), w miejscu (dźwięk przestrzenny; słuchacz — kamera, ustawia go gra).
//
// 1. Źródło przy obiekcie: pole „sound” obiektu sceny — gotowy dźwięk SfxKit (id, np. fire, engine, bird), gotowe tło
//    miejsca (forest, park, seaside, storm, night, campfire) albo nazwa zasobu „sound” lub „ambience” z laboratorium
//    efektów (w tej kolejności: gotowe przed zapisanymi, dźwięk przed tłem). Gra przez całą grę, idzie za obiektem;
//    jednorazowe (ptak, wybuch…) — co kilka sekund.
// 2. Silniki pojazdów z zachowań (ENGINES): obroty i obciążenie z prędkości i dźwigni zachowania (hud()) — samochód
//    z biegami, okręt, samolot, mała jednostka, przeładowarka; łaziki i nurek — napęd elektryczny (buczenie);
//    silniki rakietowe (ciąg w próżni, lądowanie) — huk ognia z mocą. Rozbicie (hud().crashed) — wybuch.
// 3. Efekty ze zdarzeń: strzały statków (ShipKit onShot) i zdarzenie „effect” (polecenie API „effect”) — dźwięk
//    rodzaju efektu (EFFECT_SOUNDS: strzał, wybuch, odłamki, piorun), wybuch statku (ShipKit onDamage, „blast”);
//    polecenie API „sound” — dowolny dźwięk w miejscu.
//
// createSceneSounds({ positionOf(id) → [x, y, z] | null }) → { start(objects, runs), frame(runs), stop(), shot(s),
//   damage(e), effect(e), play(nazwa, at) }; runs — zachowania gry ({ obj, id, run, input }) z editor/js/play/play.js.
import { SOUNDS, SOUND_IDS, AMBIENCES, play as playSound, start as startSound, ambience as startAmbience } from '../audio/sfx/sfxkit.js';
import { getAsset, listAssets } from './assets.js';

// odległość pełnej głośności [m] (dalej cichnie jak 1/odległość): głośne dźwięki słychać daleko, ciche — z bliska;
// tło miejsca — obszar; reszta 6 m
const REF = { explosion: 40, thunder: 60, gunshot: 25, hit: 12, impact: 8, splash: 10, bird: 10, ui: 3,
  engine: 10, fire: 6, sea: 30, wind: 30, rain: 30, stream: 10, crickets: 10, city: 40, squeal: 15, ambience: 15 };
const refOf = (id) => REF[id] || 6;

/** Dźwięk obiektu z nazwy → { kind: 'sound' | 'ambience', def } albo null (nie ma takiego). */
export function soundOf(name, get = getAsset) {
  if (!name) return null;
  if (SOUNDS[name]) return { kind: 'sound', def: { sound: name } };
  if (AMBIENCES[name]) return { kind: 'ambience', def: AMBIENCES[name] };
  const s = get('sound', name); if (s && SOUNDS[s.sound]) return { kind: 'sound', def: s };
  const a = get('ambience', name); if (a && Array.isArray(a.layers)) return { kind: 'ambience', def: a };
  return null;
}
/** Nazwy do wyboru: gotowe dźwięki i tła, zapisane dźwięki i tła (laboratorium efektów). */
export function soundNames(list = listAssets) {
  return { sounds: SOUND_IDS, places: Object.keys(AMBIENCES), saved: list('sound'), savedPlaces: list('ambience') };
}
export const allSoundNames = (list = listAssets) => { const n = soundNames(list); return [...n.sounds, ...n.places, ...n.saved, ...n.savedPlaces]; };

/* ---------------- silniki pojazdów ---------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// cylindry silników modeli (reszta: 4); prędkości przełożeń [km/h] skrzyni samochodu
const CYLINDERS = { 'road/polonez': 4, 'road/abrams': 8, 'road/urbino18': 6, 'air/spitfire': 12, 'sea/blyskawica': 12, 'sea/orzel': 8, 'marine/barge': 6, 'junkyard/grapple-truck': 6 };
const GEARS = [22, 42, 68, 98, 135, 190];
// obroty samochodu: biegi po kolei (piła obrotów), na postoju — gaz podnosi obroty
function gearRpm(v, thr) {
  let lo = 0;
  for (let i = 0; i < GEARS.length; i++) {
    if (v < GEARS[i] || i === GEARS.length - 1) {
      const f = clamp((v - lo) / (GEARS[i] - lo), 0, 1);
      return (i === 0 ? 850 + f * 3600 : 2300 + f * 2600) + (v < 3 ? Math.abs(thr) * 1200 : 0);
    }
    lo = GEARS[i];
  }
  return 850;
}
const cyl = (o) => CYLINDERS[o.prefab] || 4;
const electric = (h) => ({ sound: 'hum', params: { freq: 60, level: 0.15 + Math.abs(h.throttle || 0) * 0.6 } });
const rocket = (h, o, c) => { const p = clamp(Math.max(Math.abs(h.throttle || 0), c.lift || 0), 0, 1); return { sound: 'fire', params: { size: 0.3 + p * 0.7 }, level: p > 0.02 ? 0.4 + p : 0 }; };
// id zachowania → (hud, obiekt, sterowanie) → { sound, params, level? } (level — głośność 0…1, domyślnie 1)
export const ENGINES = {
  drive: (h, o) => (o.prefab.startsWith('rovers/') ? electric(h)
    : { sound: 'engine', params: { rpm: gearRpm(Math.abs(h.speed), h.throttle || 0), load: Math.abs(h.throttle || 0), cylinders: cyl(o) } }),
  ship: (h, o) => ({ sound: 'engine', params: { rpm: 600 + Math.abs(h.throttle || 0) * 700, load: Math.abs(h.throttle || 0), cylinders: cyl(o) } }),
  craft: (h, o) => (o.prefab === 'marine/diver' ? electric(h)
    : { sound: 'engine', params: { rpm: (o.prefab === 'marine/barge' ? 650 : 900) + Math.abs(h.throttle || 0) * (o.prefab === 'marine/barge' ? 1300 : 4600), load: Math.abs(h.throttle || 0), cylinders: cyl(o) } }),
  flight: (h, o) => ({ sound: 'engine', params: { rpm: 900 + clamp(h.throttle || 0, 0, 1) * 2100, load: clamp(h.throttle || 0, 0, 1), cylinders: cyl(o) }, level: h.crashed ? 0 : 1 }),
  grapple: (h, o) => ({ sound: 'engine', params: { rpm: 750 + Math.abs(h.throttle || 0) * 1500, load: Math.abs(h.throttle || 0), cylinders: cyl(o) } }),
  thrust: rocket,
  lander: (h, o, c) => (h.crashed ? { sound: 'fire', params: { size: 0.3 }, level: 0 } : rocket(h, o, c)),
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

export function createSceneSounds({ positionOf, get = getAsset }) {
  let sources = [], engines = [];
  const near = (id) => positionOf(id) || [0, 0, 0];
  function effectSound(kind, e) {
    const m = EFFECT_SOUNDS[kind]; if (!m) return;
    const at = pt(m.from ? e.from : m.path ? (e.path || [])[0] : e.at) || pt(e.to) || pt(e.from); if (!at) return;
    const params = { ...m.params }; if (m.size) params.size = m.size(e);
    try { playSound({ sound: m.sound, params }, { at, ref: refOf(m.sound) }); } catch (err) { if (window.LabLog) window.LabLog.add('warn', 'Sound: ' + err.message); }
  }
  return {
    // początek gry: źródła przy obiektach z polem „sound” i silniki zachowań
    start(objects, runs) {
      this.stop();
      for (const o of objects) {
        const s = soundOf(o.sound, get); if (!s) continue;
        const at = near(o.id), h = s.kind === 'sound' ? startSound(s.def, { at, ref: refOf(s.def.sound), every: [4, 12] }) : startAmbience(s.def, { at, ref: REF.ambience });
        sources.push({ id: o.id, h });
      }
      for (const r of runs) {
        const f = ENGINES[r.id]; if (!f) continue;
        const e0 = f(r.run.hud(), r.obj, r.input || {});
        const h = startSound({ sound: e0.sound, params: e0.params }, { at: near(r.obj.id), ref: refOf(e0.sound), bus: 'sfx', gain: e0.level ?? 1 });
        engines.push({ r, f, h, crashed: false });
      }
    },
    // klatka: źródła idą za obiektami, silniki — obroty z zachowania, rozbicie — wybuch
    frame() {
      for (const s of sources) { const p = positionOf(s.id); if (p) s.h.move(p); }
      for (const e of engines) {
        const h = e.r.run.hud(), v = e.f(h, e.r.obj, e.r.input || {}), p = positionOf(e.r.obj.id);
        if (p) e.h.move(p);
        e.h.set(v.params, v.level ?? 1);
        if (h.crashed && !e.crashed && p) playSound({ sound: 'explosion', params: { size: 0.7, distance: 0.1, debris: 0.7 } }, { at: p, ref: refOf('explosion') });
        e.crashed = !!h.crashed;
      }
    },
    stop() { for (const s of sources) s.h.stop(0.6); for (const e of engines) e.h.stop(0.4); sources = []; engines = []; },
    // strzał statku (ShipKit onShot: { from, to, dir }) z efektem obiektu (pole „shot”)
    // (rodzaj efektu albo zapisany efekt; rodzaj bez dźwięku — zwykły strzał)
    shot(s, choice = 'shot') { const k = EFFECT_SOUNDS[choice] ? choice : (get('effect', choice) || {}).kind; effectSound(EFFECT_SOUNDS[k] ? k : 'shot', s); },
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
