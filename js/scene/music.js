// Muzyka w scenie: silnik, wspólny dla edytora (▶ Graj) i gier. MusicKit (js/audio/musickit/) na szynie muzyki miksera
// silnika (js/audio/mixer.js, głośność: Opcje → Dźwięk → Music).
//
// Środowisko sceny: env.music — muzyka w grze, env.musicAction — muzyka akcji (nieobowiązkowa): po głośnym zdarzeniu
// (wybuch, strzał, rozbicie — js/scene/sounds.js onLoud) gra akcja, a po ACTION_HOLD s ciszy wraca muzyka zwykła.
// Nazwa muzyki: 'mood:<id>' — nastrój MusicKit (PRESETS: station, orbit, descent…), 'song:<id>' — piosenka (SONGS),
// albo nazwa zasobu „music” z laboratorium muzyki (ustawienia MusicKit); '' — cisza.
// createSceneMusic() → { start(env), stop(), frame(), action(s?), play(nazwa) — zmiana muzyki w grze, now }
import '../audio/voice/voicekit.js';      // MusicKit sięga po głos i szepty przez window.VoiceKit
import '../audio/musickit/musickit.js';   // window.MusicKit (skrypt klasyczny)
import { mixer } from '../audio/mixer.js';
import { getAsset, listAssets } from './assets.js';

export const ACTION_HOLD = 20;   // s bez głośnych zdarzeń, po których akcja wraca do muzyki zwykłej
const MK = () => window.MusicKit;
const clone = (o) => JSON.parse(JSON.stringify(o));

/** Ustawienia MusicKit z nazwy muzyki albo null (cisza albo nie ma takiej). */
export function musicParams(name, get = getAsset) {
  if (!name) return null;
  const K = MK();
  if (name.startsWith('mood:')) { const p = K.PRESETS[name.slice(5)]; return p ? clone(p.params) : null; }
  if (name.startsWith('song:')) { const id = name.slice(5), s = K.SONGS[id]; return s ? { ...clone(s.params), song: id } : null; }
  const a = get('music', name); return a && a.params ? clone(a.params) : null;
}
/** Wszystkie nazwy muzyki: nastroje, piosenki, zapisane. */
export function musicNames(list = listAssets) {
  const K = MK();
  return [...Object.keys(K.PRESETS).map((id) => 'mood:' + id), ...Object.keys(K.SONGS).map((id) => 'song:' + id), ...list('music')];
}

export function createSceneMusic({ get = getAsset } = {}) {
  let calm = null, act = null, actParams = null, inAction = false, until = 0, now = '';
  const make = (params) => { const mx = mixer(); return MK().create({ params, ctx: mx.ctx, out: mx.bus('music'), mixer: mx }); };
  const drop = (p) => { if (p) { p.stop(); p.dispose(); } };
  const clock = () => performance.now() / 1000;
  return {
    get now() { return inAction ? 'action' : now; },
    start(env = {}) {
      this.stop();
      const p = musicParams(env.music, get); now = p ? env.music : '';
      if (p) { calm = make(p); calm.start(); }
      actParams = musicParams(env.musicAction, get);
    },
    // głośne zdarzenie: muzyka akcji (gdy jest) na ACTION_HOLD s, przedłużana kolejnymi zdarzeniami
    action(hold = ACTION_HOLD) {
      if (!actParams) return;
      until = clock() + hold;
      if (inAction) return;
      inAction = true; if (calm) calm.stop();
      if (!act) act = make(clone(actParams)); act.start();
    },
    frame() {
      if (inAction && clock() > until) { inAction = false; if (act) act.stop(); if (calm) calm.start(); }
    },
    // w grze: inna muzyka zwykła (nazwa jak env.music; '' — cisza)
    play(name) {
      const p = musicParams(name, get); if (name && !p) throw new Error(`no music "${name}"`);
      drop(calm); calm = null; now = p ? name : '';
      if (p) { calm = make(p); if (!inAction) calm.start(); }
    },
    stop() { drop(calm); drop(act); calm = act = null; inAction = false; now = ''; },
  };
}
