// UI gry · dźwięki: zdarzenia UI (kliknięcie, najechanie, otwarcie ekranu i okna, pisanie dialogu, wybór, kupno…)
// grają dźwięki skórki (js/gameui/skins.js SKIN_SOUNDS, zasób „uiskin” — sounds) przez SfxKit na szynie interfejsu
// miksera silnika (js/audio/mixer.js, głośność: Opcje → Dźwięk → Interface). Kwestie dialogu postaci z głosem —
// VoiceKit na szynie mowy (głos: pole `voice` w say albo definicja UI `voices: { postać: głos }`).
// uiSounds(() => skórka) → { play(zdarzenie), voice(tekst, głos) → { end, stop } | null, stopVoice(), on }
import { play as playSound } from '../audio/sfx/sfxkit.js';
import { say as sayVoice, VOICE_PRESETS, silence } from '../audio/voice/voicekit.js';
import { mixer } from '../audio/mixer.js';
import { getAsset } from '../scene/assets.js';
import { resolveSkin } from './skins.js';

// najkrótszy odstęp tego samego zdarzenia [s] (najechania i pisanie nie mogą się zlać w szum)
const GAP = { hover: 0.06, type: 0.045, log: 0.15 };
// głos z nazwy: gotowy (VoiceKit VOICE_PRESETS) albo zasób „voice” z laboratorium mowy; obiekt — opis głosu wprost
export function voiceOf(v) {
  if (!v) return null;
  if (typeof v === 'object') return v;
  return VOICE_PRESETS[v] || getAsset('voice', v) || null;
}
export function uiSounds(getSkin) {
  const last = {};
  let speaking = null, on = true;
  return {
    get on() { return on; }, set on(v) { on = !!v; },
    play(ev) {
      if (!on) return;
      const d = resolveSkin(getSkin()).sounds[ev]; if (!d || !d.sound) return;
      const mx = mixer(); if (!mx.running && ev !== 'click') return;   // przed pierwszym gestem (dźwięk i tak by nie zagrał) — bez tworzenia kontekstu przy najechaniu
      const t = performance.now() / 1000; if (GAP[ev] && t - (last[ev] || 0) < GAP[ev]) return; last[ev] = t;
      try { playSound(d, { bus: 'ui' }); } catch (err) { if (window.LabLog) window.LabLog.add('warn', 'UI sound: ' + err.message); }
    },
    // kwestia dialogu głosem postaci (szyna mowy); poprzednia milknie
    voice(text, v) {
      const vd = voiceOf(v); if (!vd || !on) return null;
      this.stopVoice();
      const mx = mixer(); mx.unlock();
      try { speaking = sayVoice(mx.ctx, mx.bus('voice'), text, vd, { mix: mx }); } catch (err) { speaking = null; if (window.LabLog) window.LabLog.add('warn', 'UI voice: ' + err.message); }
      return speaking;
    },
    stopVoice() { if (speaking) { try { speaking.stop(); } catch { /* już */ } speaking = null; } silence(); },
  };
}
