// Mikser silnika: jeden kontekst Web Audio dla gry i laboratoriów, szyny dźwięku z głośnościami gracza, dźwięk
// przestrzenny (słuchacz — kamera), nagrywanie. Bez plików dźwiękowych — dźwięki robią kity: MusicKit (muzyka),
// SfxKit (efekty i otoczenie), VoiceKit (mowa).
//
// Szyny: music (muzyka), ambience (otoczenie: tła miejsc, pogoda), sfx (efekty: wybuchy, strzały, zdarzenia), voice
// (mowa) → master (kompresor, ogranicznik) → głośniki. Głośności: ustawienia gracza settings.audio (js/core/settings.js:
// master, music, ambience, sfx, voice, mute) — bindSettings(store) stosuje je i śledzi zmiany (menu Opcje → Dźwięk).
//
// mixer() → wspólny mikser (tworzony raz; kontekst dopiero przy pierwszym użyciu):
//   ctx                kontekst (AudioContext) — tworzony przy pierwszym odczycie; przeglądarka gra dopiero po kliknięciu
//   unlock()           wznawia kontekst (wołać z kliknięcia albo klawisza; robi to sam przy pierwszym geście)
//   bus(nazwa)         wejście szyny (GainNode) — tu podłącza się dźwięk
//   setVolumes(audio)  { master, music, ambience, sfx, voice, mute } 0…1 (płynnie)
//   bindSettings(store) głośności z magazynu ustawień gracza, na żywo; → odpięcie
//   level(nazwa)       poziom szyny teraz (0…1, do mierników); nazwa 'master' — całość
//   listen(pos, fwd, up)  słuchacz (zwykle kamera): położenie i kierunki [x, y, z]
//   at(pos, nazwa, opts)  źródło w przestrzeni: PannerNode (HRTF, odległość odwrotna) do szyny — dźwięk tam podłączyć
//   noise()            bufor białego szumu (2 s, wspólny)
//   stream             MediaStream całości (nagrywanie: MediaRecorder)
export const BUSES = ['music', 'ambience', 'sfx', 'voice'];
export const BUS_LABELS = { master: ['Master', 'Ogólna'], music: ['Music', 'Muzyka'], ambience: ['Ambience', 'Otoczenie'], sfx: ['Effects', 'Efekty'], voice: ['Speech', 'Mowa'] };
export const AUDIO_DEFAULTS = { master: 0.8, music: 0.7, ambience: 0.8, sfx: 0.9, voice: 1, mute: false };

let M = null;
export function mixer() {
  if (M) return M;
  let ctx = null, master = null, out = null, comp = null, noiseBuf = null, dest = null;
  const bus = {}, meter = {}, vol = { ...AUDIO_DEFAULTS }, data = new Float32Array(1024);
  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    out = ctx.createGain();   // głośność całości (master × wyciszenie)
    master = ctx.createGain(); // wejście sumy szyn
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    meter.master = ctx.createAnalyser(); meter.master.fftSize = 1024;
    master.connect(comp); comp.connect(out); out.connect(meter.master); meter.master.connect(ctx.destination);
    dest = ctx.createMediaStreamDestination(); out.connect(dest);
    for (const b of BUSES) {
      bus[b] = ctx.createGain(); meter[b] = ctx.createAnalyser(); meter[b].fftSize = 1024;
      bus[b].connect(meter[b]); meter[b].connect(master);
    }
    apply(0);
    const gesture = () => { if (ctx.state !== 'running') ctx.resume(); };
    addEventListener('pointerdown', gesture, true); addEventListener('keydown', gesture, true);
  }
  function apply(tc = 0.05) {
    if (!ctx) return;
    const t = ctx.currentTime, set = (p, v) => (tc ? p.setTargetAtTime(v, t, tc) : p.setValueAtTime(v, t));
    set(out.gain, vol.mute ? 0 : vol.master);
    for (const b of BUSES) set(bus[b].gain, vol[b]);
  }
  const ensure = () => { if (!ctx) build(); return ctx; };
  M = {
    get ctx() { return ensure(); },
    get started() { return !!ctx; },
    get running() { return !!ctx && ctx.state === 'running'; },
    unlock() { ensure(); if (ctx.state !== 'running') return ctx.resume(); return Promise.resolve(); },
    bus(name) { ensure(); return bus[name] || bus.sfx; },
    get volumes() { return { ...vol }; },
    setVolumes(a = {}) {
      for (const k of Object.keys(AUDIO_DEFAULTS)) if (k in a) vol[k] = k === 'mute' ? !!a[k] : Math.max(0, Math.min(1, +a[k] || 0));
      apply();
    },
    bindSettings(store) {
      const f = (d) => M.setVolumes(d.audio || {});
      f(store.data); return store.onChange(f);
    },
    level(name = 'master') {
      if (!ctx) return 0;
      const a = meter[name]; if (!a) return 0;
      a.getFloatTimeDomainData(data); let s = 0;
      for (let i = 0; i < data.length; i++) s += data[i] * data[i];
      return Math.min(1, Math.sqrt(s / data.length) * 2.5);
    },
    analyser(name = 'master') { ensure(); return meter[name]; },
    listen(pos, fwd = [0, 0, -1], up = [0, 1, 0]) {
      if (!ctx) return;
      const L = ctx.listener, ok = [...pos, ...fwd, ...up].every(Number.isFinite); if (!ok) return;
      if (L.positionX) {
        const t = ctx.currentTime;
        L.positionX.setValueAtTime(pos[0], t); L.positionY.setValueAtTime(pos[1], t); L.positionZ.setValueAtTime(pos[2], t);
        L.forwardX.setValueAtTime(fwd[0], t); L.forwardY.setValueAtTime(fwd[1], t); L.forwardZ.setValueAtTime(fwd[2], t);
        L.upX.setValueAtTime(up[0], t); L.upY.setValueAtTime(up[1], t); L.upZ.setValueAtTime(up[2], t);
      } else { L.setPosition(...pos); L.setOrientation(...fwd, ...up); }
    },
    at(pos, name = 'sfx', { ref = 3, rolloff = 1.2, max = 2000 } = {}) {
      ensure();
      const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = rolloff; p.maxDistance = max;
      M.move(p, pos); p.connect(M.bus(name)); return p;
    },
    move(p, pos) {
      if (!pos || !pos.every(Number.isFinite)) return;
      if (p.positionX) { const t = ctx.currentTime; p.positionX.setValueAtTime(pos[0], t); p.positionY.setValueAtTime(pos[1], t); p.positionZ.setValueAtTime(pos[2], t); }
      else p.setPosition(...pos);
    },
    noise() {
      ensure();
      if (!noiseBuf) {
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      return noiseBuf;
    },
    get stream() { ensure(); return dest.stream; },
  };
  return M;
}
