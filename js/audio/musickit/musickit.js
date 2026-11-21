/* =======================================================================
   MUSICKIT — the game's music, generated live (Web Audio), like ShipKit
   builds the ships: no audio files, parameters and a seed
   =======================================================================
   An ES module (export MusicKit; also window.MusicKit). The sound lab
   (labs/sound.html) tunes it; the scene plays it (js/scene/music.js). This
   file: the synthesis and the player (create); the data — notes, scales,
   moods, songs — in data.js; a song's melody and the MIDI file in
   compose.js. Needs VoiceKit (the robot's voice, the whispers).

   The music is layers over a slow chord progression in one scale:
     drone     two detuned saws and a sub on the root, a slow filter sweep
               (or, "dissonant", with a tritone and a rubbing second)
     pads      the chord, crossfading — soft saws, 80s brass (a filter
               swell), an organ (sine drawbars) or glass
     bells     sparse chimes on the chord's notes — FM, or a piano
     pulse     a heartbeat (lub-dub), the station's
     arp       the chord walked — plucks in some passages, a repeating
               ostinato (an organ's figure), or a 16th-note bass line
     texture   radio noise through a wandering band-pass and crackles, or
               rain (noise and drops)
     whispers  wordless murmuring: noise (and a little voice) through the
               formants of vowels, syllable by syllable, panned around
               (VoiceKit, js/audio/voice/voicekit.js — loaded before)
     voice     a robot's announcements (the browser's speech synthesis —
               outside the audio graph: not in a recording, no effects; VoiceKit)
     lead      a melody: short phrases on the scale, landing on the chord,
               gliding between notes, a late vibrato, rests between
     beat      drums: a kick, a snare in a big room, hi-hats
     metal     a derelict's sounds: inharmonic metal clangs, a hull's groan
     bass      a bass line (songs only): 8ths, 16ths or half notes on the chord
   WARM (on by default, `warm: false` for the raw sound): softer waves
   (saw and square with their highest harmonics rolled off), filters that
   breathe (bright at a note's start, darker as it fades), a little
   imperfection (slowly drifting tuning, timing off by a few ms, uneven
   velocities), a chorus on the pads, a round bass (a sine under a dark
   saw), a calm drone (no beating saws), soft saturation and a gentler top
   on the master, and a reverb whose tail darkens. Plucks can be STRINGS:
   Karplus-Strong, a physical model of a plucked string (computed once per
   note into a buffer) — still no audio files.
   Everything goes through one reverb (an impulse generated from SPACE)
   and an echo; the seed decides the progression, the notes, the phrases —
   the same seed and parameters play the same piece. A fixed progression
   (scale degrees, cycled) replaces the seeded one.

   The moods are inspired by kinds of film and game music (80s sci-fi
   synths, a church organ's ostinato, ambient piano, synthwave, space
   horror) — the character, never anyone's melody.

   SONGS are the other way to play: real pieces with a form (intro, verse,
   chorus, bridge, outro), a chord every bar or two, a melody composed from
   the seed when the song starts — motifs that come back, phrases that end
   on the chord — a bass line, drums with fills into the next section, a
   crash on the chorus. One song ends, the next begins.

   API
     MusicKit.create({ params, ctx, out, mixer }) → player
                                  ctx, out — play through the engine's mixer (js/audio/mixer.js:
                                  mixer().ctx, mixer().bus('music')); mixer — its volumes for the voice
                                  (without them: its own context, straight to the speakers)
       player.start()             starts (call from a click: browsers need a gesture)
       player.stop()              fades out
       player.setParams(patch)    live: volume, tempo, density, brightness,
                                  space, root, scale, seed, levels.{layer},
                                  padVoice, bellVoice, arpMode, textureKind,
                                  droneVoice, leadVoice, pluckVoice, warm,
                                  progression (array or null),
                                  voiceLines (array), voiceEvery (seconds)
       player.params, player.playing, player.chordName
       player.analyser            an AnalyserNode (or null before start)
       player.stream              a MediaStream of the music (recording)
       player.say(text)           the robot voice, now
       player.setParams({ song: id })  a song (from its start); song: null = the moods
       player.song                { id, name, section, bar, bars, part } or null
       player.midi()              the chosen song as a MIDI file (Uint8Array), or null
     MusicKit.songMidi(params)    the same, for any params with a song
       player.dispose()
     MusicKit.PRESETS             { id: { name, params } }
     MusicKit.SONGS               { id: { name, style, params, chordBars, prog, form, arrange } }
     MusicKit.VOICES              { param: { value: label } } — the instruments
     MusicKit.LAYERS, SCALES, NOTES
   ======================================================================= */
import '../voice/voicekit.js';   // głos robota i szepty (window.VoiceKit)
import { NOTES, SCALES, LAYERS, VOICES, INSTRUMENTS, DEFAULTS, PRESETS, ARRANGE, FORM, SONGS, RHYTHMS, REVERB_SEND, MOTIFS, rng, hz, clone } from './data.js';
import { composeMelody, songRng, songMidi } from './compose.js';

function create(opts = {}) {
  const params = clone(DEFAULTS);
  merge(params, opts.params || {});
  let ctx = null, rand = rng(params.seed);
  // WARM's imperfections draw from their own generator: the music (the
  // seed's notes and chances) stays the same with WARM on or off
  let jit = rng(params.seed + 99);
  const warmOn = () => params.warm !== false;
  const human = (t, ms) => (warmOn() ? t + (jit() - 0.5) * (ms || 14) / 1000 : t);
  const velo = (spread) => (warmOn() ? 1 - (spread || 0.25) / 2 + jit() * (spread || 0.25) : 1);
  const N = {};                     // the graph's fixed nodes
  const live = { pads: [], drone: null, texture: null };
  let timer = null, playing = false, chordName = "";
  const clock = { nextChord: 0, chord: [], chordIdx: 0, progStep: 0, nextBeat: 0, beat: 0, arpOn: false, motif: MOTIFS[0],
    nextWhisper: 0, nextVoice: 0, nextCrackle: 0, nextLead: 0, leadLast: null, s: null };

  function merge(dst, src) {
    for (const k in src) {
      if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k])) { dst[k] = dst[k] || {}; merge(dst[k], src[k]); }
      else dst[k] = src[k];
    }
  }

  // ---------- the graph ----------
  function impulse(seconds) {
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds), buf = ctx.createBuffer(2, len, rate), r = rng(7), warm = warmOn();
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let y = 0, e0 = 0, e1 = 0;
      for (let i = 0; i < len; i++) {
        const x = (r() * 2 - 1) * Math.pow(1 - i / len, 2.6);
        if (!warm) { d[i] = x; continue; }
        // WARM: a low-pass closing over the tail (9 kHz → 1.2 kHz), as in a real room
        const fc = 9000 * Math.pow(1200 / 9000, i / len), a = 1 - Math.exp(-2 * Math.PI * fc / rate);
        y += a * (x - y); d[i] = y; e0 += x * x; e1 += y * y;
      }
      if (warm && e1 > 0) { const k = Math.sqrt(e0 / e1) * 0.7; for (let i = 0; i < len; i++) d[i] *= k; }
    }
    return buf;
  }
  // soft saturation, unity for quiet signals (tanh(kx)/k)
  function satCurve(k) {
    const n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / k; }
    return c;
  }
  // softer saw and square: their harmonics rolled off (the Fourier series · e^(−(k−1)/14))
  function softWave(kind) {
    const n = 64, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) {
      if (kind === "square" && k % 2 === 0) continue;
      im[k] = (kind === "square" ? 4 : 2) / (Math.PI * k) * Math.exp(-(k - 1) / 14) * (kind === "sawtooth" && k % 2 === 0 ? -1 : 1);
    }
    // not normalized: the fundamental as loud as the browser's own wave, only the top softer
    return ctx.createPeriodicWave(re, im, { disableNormalization: true });
  }
  // WARM on the master and the pads' chorus, switched live
  function applyWarm() {
    const t = ctx.currentTime, w = warmOn();
    N.shaper.curve = w ? satCurve(1.6) : null;
    N.shelf.gain.setTargetAtTime(w ? -4 : 0, t, 0.2);
    N.chorusWet.gain.setTargetAtTime(w ? 0.55 : 0, t, 0.2);
  }
  function noiseBuffer(seconds, pink) {
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds), buf = ctx.createBuffer(1, len, rate), d = buf.getChannelData(0), r = rng(11);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = r() * 2 - 1;
      if (!pink) { d[i] = w; continue; }
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
    return buf;
  }
  function build() {
    ctx = opts.ctx || new (window.AudioContext || window.webkitAudioContext)();   // the engine's mixer (js/audio/mixer.js) or its own
    N.master = ctx.createGain(); N.master.gain.value = 0;
    N.comp = ctx.createDynamicsCompressor(); N.comp.threshold.value = -18; N.comp.ratio.value = 3;
    N.analyser = ctx.createAnalyser(); N.analyser.fftSize = 2048;
    N.stream = ctx.createMediaStreamDestination();
    // WARM on the master: soft saturation, a gentler top, no sub-rumble
    N.shaper = ctx.createWaveShaper(); N.shaper.oversample = "2x";
    N.shelf = ctx.createBiquadFilter(); N.shelf.type = "highshelf"; N.shelf.frequency.value = 6500; N.shelf.gain.value = 0;
    N.hp = ctx.createBiquadFilter(); N.hp.type = "highpass"; N.hp.frequency.value = 28; N.hp.Q.value = 0.7;
    N.master.connect(N.shaper); N.shaper.connect(N.shelf); N.shelf.connect(N.hp); N.hp.connect(N.comp); N.comp.connect(N.analyser); N.analyser.connect(opts.out || ctx.destination); N.comp.connect(N.stream);
    // the reverb send and the echo send
    N.reverb = ctx.createConvolver(); N.reverb.buffer = impulse(2 + params.space * 6);
    N.revIn = ctx.createGain(); N.revIn.gain.value = 0.6 + params.space * 0.6;
    N.revIn.connect(N.reverb); N.reverb.connect(N.master);
    N.delay = ctx.createDelay(2); N.delay.delayTime.value = 60 / params.tempo * 0.75;
    N.fb = ctx.createGain(); N.fb.gain.value = 0.45;
    N.dlp = ctx.createBiquadFilter(); N.dlp.type = "lowpass"; N.dlp.frequency.value = 2400;
    N.delIn = ctx.createGain(); N.delIn.gain.value = 0.5;
    N.delIn.connect(N.delay); N.delay.connect(N.dlp); N.dlp.connect(N.fb); N.fb.connect(N.delay); N.dlp.connect(N.master); N.dlp.connect(N.revIn);
    // a bus per layer: dry to the master, wet to the reverb
    N.bus = {};
    LAYERS.forEach((l) => {
      const g = ctx.createGain(); g.gain.value = params.levels[l];
      g.connect(N.master);
      const send = ctx.createGain(); send.gain.value = REVERB_SEND[l] == null ? 1 : REVERB_SEND[l];
      g.connect(send); send.connect(N.revIn);
      N.bus[l] = g;
    });
    N.noise = noiseBuffer(4, false); N.pink = noiseBuffer(6, true);
    // a chorus on the pads: two short delays, slowly wobbling, left and right
    N.chorusWet = ctx.createGain(); N.chorusWet.gain.value = 0; N.chorusWet.connect(N.master);
    [[0.018, 0.27, -0.7], [0.025, 0.33, 0.7]].forEach(([d, rate, side]) => {
      const dl = ctx.createDelay(0.1); dl.delayTime.value = d;
      const lfo = ctx.createOscillator(); lfo.frequency.value = rate; const lg = ctx.createGain(); lg.gain.value = 0.003;
      lfo.connect(lg); lg.connect(dl.delayTime); lfo.start();
      const p = ctx.createStereoPanner(); p.pan.value = side;
      N.bus.pads.connect(dl); dl.connect(p); p.connect(N.chorusWet);
    });
    // soft waves, and two slow drifts for the tuning of held notes (an analog synth's)
    N.waves = { sawtooth: softWave("sawtooth"), square: softWave("square") };
    N.drift = [[0.071, 4], [0.113, 3]].map(([rate, cents]) => {
      const lfo = ctx.createOscillator(); lfo.frequency.value = rate; const g = ctx.createGain(); g.gain.value = cents;
      lfo.connect(g); lfo.start(); return g;
    });
    applyWarm();
  }
  // small helpers
  function osc(type, f, t) {
    const o = ctx.createOscillator();
    if (warmOn() && N.waves[type]) o.setPeriodicWave(N.waves[type]); else o.type = type;
    o.frequency.value = f; o.start(t); return o;
  }
  // a held note's tuning drifts a little (WARM)
  function drift(o) { if (warmOn()) N.drift[Math.floor(jit() * N.drift.length)].connect(o.detune); return o; }
  function gain(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function filter(type, f, q) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
  function panner(v) { const p = ctx.createStereoPanner(); p.pan.value = v; return p; }
  // a burst of noise: (white) buffer from a random spot
  function noise(t, len, pink) { const s = ctx.createBufferSource(); s.buffer = pink ? N.pink : N.noise; s.start(t, rand() * 3); s.stop(t + len); return s; }

  // ---------- the music's material ----------
  const steps = () => (SCALES[params.scale] || SCALES.aeolian).steps;
  const rootMidi = () => 36 + params.root;
  // scale degree (can run past one octave) → midi
  function degree(d, base) {
    const s = steps(), n = s.length, o = Math.floor(d / n), i = ((d % n) + n) % n;
    return base + o * 12 + s[i];
  }
  const PROG = [0, 5, 3, 4, 0, 2, 5, 6, 3];
  const fixedProg = () => (Array.isArray(params.progression) && params.progression.length ? params.progression : null);
  function nextChord() {
    const s = steps().length, prog = fixedProg();
    const d = (prog ? prog[clock.progStep % prog.length] : PROG[Math.floor(rand() * PROG.length)]) % s;
    clock.progStep++;
    clock.chordIdx = d;
    const base = rootMidi() + 12;
    // a chord in thirds, sometimes with a seventh or a ninth
    const tones = [d, d + 2, d + 4];
    if (rand() < 0.5) tones.push(d + 6);
    if (rand() < 0.3) tones.push(d + 8);
    clock.chord = tones.map((t) => degree(t, base));
    chordName = NOTES[clock.chord[0] % 12] + (tones.length > 3 ? " (" + tones.length + " notes)" : "");
    clock.arpOn = rand() < 0.5;
  }

  // ---------- the layers ----------
  // the drone: [wave, frequency × root, cents, gain]
  const DRONES = {
    warm: [["sawtooth", 1, -6, 1], ["sawtooth", 1, 7, 1], ["sine", 0.5, 0, 1]],
    // WARM: a sine at the root, the saws quiet and nearly in tune (no beating)
    calm: [["sine", 1, 0, 1], ["sawtooth", 1, -1.5, 0.3], ["sawtooth", 1, 1.5, 0.3], ["sine", 0.5, 0, 0.9]],
    dissonant: [["sawtooth", 1, -6, 1], ["sine", 0.5, 0, 1], ["triangle", Math.SQRT2, 0, 0.55], ["sawtooth", 1.0595, -4, 0.45], ["sine", 0.25 * 1.0595, 0, 0.6]],
  };
  function startDrone() {
    const t = ctx.currentTime, f = hz(rootMidi()), w = warmOn();
    const spec = w && params.droneVoice !== "dissonant" ? DRONES.calm : DRONES[params.droneVoice] || DRONES.warm;
    const lp = filter("lowpass", droneCut(), w ? 0.7 : 2);
    const g = gain(0); g.gain.setTargetAtTime(0.18, t, 3);
    const oscs = spec.map(([type, mul, cents, amp]) => {
      const o = drift(osc(type, f * mul, t)); o.detune.value = cents;
      const og = gain(amp); o.connect(og); og.connect(lp); return o;
    });
    // a very slow sweep of the filter
    const lfo = osc("sine", 0.025, t), lfoG = gain((120 + params.brightness * 300) * (w ? 0.5 : 1));
    lfo.connect(lfoG); lfoG.connect(lp.frequency);
    lp.connect(g); g.connect(N.bus.drone);
    live.drone = { oscs, muls: spec.map((s) => s[1]), lp, g, lfo };
  }
  function stopDrone(fade) {
    const d = live.drone; if (!d) return;
    live.drone = null;
    const t = ctx.currentTime;
    d.g.gain.cancelScheduledValues(t); d.g.gain.setTargetAtTime(0, t, fade);
    d.oscs.concat([d.lfo]).forEach((o) => o.stop(t + fade * 6));
  }
  function droneFollow() {
    if (!live.drone) return;
    const t = ctx.currentTime, f = hz(rootMidi());
    live.drone.oscs.forEach((o, i) => o.frequency.setTargetAtTime(f * live.drone.muls[i], t, 2));
    live.drone.lp.frequency.setTargetAtTime(droneCut(), t, 1);
  }
  function droneCut() { return warmOn() ? 120 + params.brightness * 380 : 160 + params.brightness * 500; }
  // the chord, voiced by padVoice; the old one fades out under the new
  function padChord(t, dur) {
    const kind = params.padVoice;
    const fade = kind === "organ" ? 0.35 : kind === "brass" ? Math.min(3, dur * 0.25) : Math.min(6, dur * 0.4);
    live.pads.forEach((v) => { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, fade / 3); v.stopAt = t + fade * 2.5 + 0.5; });
    let notes = clock.chord.slice(0, 4);
    if (kind === "organ") notes = [clock.chord[0] - 12].concat(notes);       // the pedal
    const amp = 0.07 / Math.sqrt(clock.chord.length), cut = 400 + params.brightness * 2600;
    const voices = notes.map((m, i) => {
      const f = hz(m), oscs = [];
      const lp = filter("lowpass", cut, 0.7), g = gain(0), pan = panner((i / Math.max(1, notes.length - 1) - 0.5) * 0.8);
      let level = amp;
      if (kind === "organ") {
        // drawbars: the fundamental and its harmonics, the high ones with BRIGHTNESS
        lp.frequency.value = 1500 + params.brightness * 5000;
        [[1, 1], [2, 0.6], [3, 0.3], [4, 0.4], [6, 0.15], [8, 0.18]].forEach(([h, w]) => {
          const o = osc("sine", f * h, t), og = gain(w * (h > 2 ? 0.3 + params.brightness : 1));
          o.connect(og); og.connect(lp); oscs.push(o);
        });
        level = amp * 0.55;
        // a slow tremolo, as from a rotating speaker
        const lfo = osc("sine", 0.8 + rand() * 0.3, t), lg = gain(level * 0.12); lfo.connect(lg); lg.connect(g.gain); oscs.push(lfo);
      } else if (kind === "brass") {
        // three saws; the filter swells open — the 80s
        lp.Q.value = 2.5;
        lp.frequency.setValueAtTime(220, t); lp.frequency.setTargetAtTime(cut * 1.3, t, Math.max(0.3, fade / 2));
        const lfo = osc("sine", 0.25 + rand() * 0.2, t), lg = gain(6); lfo.connect(lg); oscs.push(lfo);
        [-11, 0, 12].forEach((c) => {
          const o = drift(osc("sawtooth", f, t)); o.detune.value = c + (rand() - 0.5) * 6; lg.connect(o.detune); o.connect(lp); oscs.push(o);
        });
        level = amp * 0.85;
      } else if (kind === "glass") {
        lp.frequency.value = cut * 2;
        [["sine", 1, 1], ["triangle", 2, 0.3], ["sine", 3.003, 0.1]].forEach(([type, h, w]) => {
          const o = osc(type, f * h, t), og = gain(w); o.connect(og); og.connect(lp); oscs.push(o);
        });
        level = amp * 1.5;
      } else {
        [-8, 8].forEach((c) => { const o = drift(osc("sawtooth", f, t)); o.detune.value = c + (rand() - 0.5) * 6; o.connect(lp); oscs.push(o); });
      }
      // WARM: the chord breathes — a little brighter as it comes in, darker as it holds
      if (warmOn() && kind !== "organ") {
        const top = kind === "glass" ? cut * 2 : kind === "brass" ? cut * 1.3 : cut;
        if (kind !== "brass") lp.frequency.setValueAtTime(top * 1.25, t);
        lp.frequency.setTargetAtTime(top * 0.7, t + fade, Math.max(0.5, dur * 0.4));
      }
      g.gain.setTargetAtTime(level, t, fade / 3);
      lp.connect(g); g.connect(pan); pan.connect(N.bus.pads);
      return { oscs, g, stopAt: Infinity };
    });
    live.pads.push(...voices);
  }
  function bell(t) {
    const pool = clock.chord.concat(clock.chord.map((m) => m + 12));
    if (params.bellVoice === "piano") {
      piano(t, pool[Math.floor(rand() * pool.length)], 0.7 + rand() * 0.3);
      // now and then a second note, an answer
      if (rand() < 0.3) piano(t + 0.2 + rand() * 0.5, pool[Math.floor(rand() * pool.length)] + (rand() < 0.4 ? 12 : 0), 0.5);
      return;
    }
    const m = pool[Math.floor(rand() * pool.length)] + 12, f = hz(m);
    const car = osc("sine", f, t), mod = osc("sine", f * 3.5, t), modG = gain(f * 2), g = gain(0), pan = panner(rand() * 1.6 - 0.8);
    modG.gain.setValueAtTime(f * 2, t); modG.gain.exponentialRampToValueAtTime(1, t + 1.5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    mod.connect(modG); modG.connect(car.frequency); car.connect(g); g.connect(pan); pan.connect(N.bus.bells); pan.connect(N.delIn);
    car.stop(t + 3.6); mod.stop(t + 3.6);
  }
  // a piano-like note: decaying partials (the high ones die first) and a soft hammer
  function piano(t, m, vel, bus) {
    const f = hz(m), len = 2.5 + Math.max(0, (72 - m) / 12) * 1.5;
    t = human(t, 10); vel *= velo(0.2);
    const lp = filter("lowpass", 1800 + params.brightness * 4000), g = gain(0), pan = panner(Math.max(-0.7, Math.min(0.7, (m - 66) / 24)));
    if (warmOn()) { lp.frequency.setValueAtTime((1800 + params.brightness * 4000) * (0.7 + vel * 0.4), t); lp.frequency.setTargetAtTime(900 + params.brightness * 1200, t + 0.05, len / 4); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11 * vel, t + 0.006); g.gain.setTargetAtTime(0, t + 0.006, len / 3.5);
    [[1, 1, 1], [2, 0.45, 0.6], [3, 0.22, 0.4], [4.02, 0.12, 0.25], [5.04, 0.06, 0.15]].forEach(([h, a, d]) => {
      const o = osc("sine", f * h, t), og = gain(a);
      og.gain.setValueAtTime(a, t); og.gain.exponentialRampToValueAtTime(0.0001, t + len * d);
      o.connect(og); og.connect(lp); o.stop(t + len * d + 0.05);
    });
    const ham = noise(t, 0.03), hf = filter("bandpass", f * 4, 1), hg = gain(0.05 * vel);
    hg.gain.setValueAtTime(0.05 * vel, t); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
    ham.connect(hf); hf.connect(hg); hg.connect(lp);
    lp.connect(g); g.connect(pan); pan.connect(bus || N.bus.bells);
    const d = gain(0.35); pan.connect(d); d.connect(N.delIn);
  }
  function thump(t, amp) {
    const o = osc("sine", 62, t), g = gain(0);
    o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.25);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g); g.connect(N.bus.pulse); o.stop(t + 0.45);
  }
  // a plucked string (Karplus-Strong): a burst of noise circling a delay as
  // long as one period, averaged each time round — it rings and darkens like
  // a string. Computed once per note into a buffer, then just played.
  function ksString(m) {
    N.ks = N.ks || {};
    if (N.ks[m]) return N.ks[m];
    const sr = ctx.sampleRate, f = hz(m), per = Math.max(2, Math.round(sr / f)), len = Math.floor(sr * 2.4);
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), r = rng(31 + m);
    const damp = 0.997 - Math.max(0, m - 60) * 0.0005;        // high strings die sooner
    for (let i = 0; i < per; i++) d[i] = r() * 2 - 1;
    for (let i = 1; i < per; i++) d[i] = (d[i] + d[i - 1]) * 0.5;   // a softer pick
    for (let i = per; i < len; i++) d[i] = damp * 0.5 * (d[i - per] + d[Math.max(0, i - per - 1)]);
    let peak = 0; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
    if (peak > 0) for (let i = 0; i < len; i++) d[i] /= peak;
    // the averaging delays half a sample: the pitch is sr / (per + 0.5)
    return (N.ks[m] = { buf, rate: f * (per + 0.5) / sr });
  }
  function stringPluck(t, m, decay, amp) {
    const s = ksString(m), src = ctx.createBufferSource(); src.buffer = s.buf; src.playbackRate.value = s.rate;
    const lp = filter("lowpass", 1500 + params.brightness * 5000), g = gain(amp * 1.7), pan = panner(Math.sin(t * 1.3) * 0.5);
    g.gain.setValueAtTime(amp * 1.7, t); g.gain.setTargetAtTime(0, t + Math.max(0.3, decay * 1.5), 0.4);
    src.connect(lp); lp.connect(g); g.connect(pan); pan.connect(N.bus.arp); pan.connect(N.delIn);
    src.start(t); src.stop(t + Math.min(2.4 / s.rate, decay * 1.5 + 2));
  }
  function pluck(t, m, type, decay, amp) {
    t = human(t); amp = (amp || 0.06) * velo();
    if (params.pluckVoice === "strings") { stringPluck(t, m, decay || 0.5, amp); return; }
    const o = osc(type || "triangle", hz(m), t), lp = filter("lowpass", 800 + params.brightness * 3000), g = gain(0), pan = panner(Math.sin(t * 1.3) * 0.5);
    decay = decay || 0.5; amp = amp || 0.06;
    lp.frequency.setValueAtTime(800 + params.brightness * 3000, t); lp.frequency.exponentialRampToValueAtTime(300, t + decay * 0.8);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(lp); lp.connect(g); g.connect(pan); pan.connect(N.bus.arp); pan.connect(N.delIn);
    o.stop(t + decay + 0.05);
  }
  // a synth bass note: a saw and a square an octave down, a snappy filter;
  // WARM: a sine you feel under a dark saw you hear, a gentle filter
  function bassNote(t, m, len, bus) {
    if (warmOn()) {
      t = human(t, 6); const v = velo(0.15), f = hz(m), g = gain(0);
      const sub = osc("sine", f, t), saw = osc("sawtooth", f, t), lp = filter("lowpass", 200, 1.2), sg = gain(0.35);
      lp.frequency.setValueAtTime(220 + params.brightness * 1400, t); lp.frequency.setTargetAtTime(110, t + 0.01, Math.max(0.04, len * 0.35));
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12 * v, t + 0.006); g.gain.setTargetAtTime(0, t + len * 0.75, 0.04);
      saw.connect(lp); lp.connect(sg); sg.connect(g); sub.connect(g); g.connect(bus || N.bus.arp);
      sub.stop(t + len + 0.3); saw.stop(t + len + 0.3);
      return;
    }
    const f = hz(m), lp = filter("lowpass", 200, 5), g = gain(0);
    lp.frequency.setValueAtTime(300 + params.brightness * 1700, t); lp.frequency.exponentialRampToValueAtTime(140, t + Math.max(0.06, len));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13, t + 0.004); g.gain.setTargetAtTime(0, t + len * 0.7, 0.03);
    const a = osc("sawtooth", f, t), b = osc("square", f / 2, t), bg = gain(0.5);
    a.connect(lp); b.connect(bg); bg.connect(lp); lp.connect(g); g.connect(bus || N.bus.arp);
    a.stop(t + len + 0.2); b.stop(t + len + 0.2);
  }
  // the arp layer, one beat of it
  function arp(t, b, beat) {
    const tones = clock.chord, mode = params.arpMode;
    if (mode === "bass16") {
      const r = tones[0] - 12, pat = [0, 0, 12, 0];
      for (let s = 0; s < 4; s++) bassNote(t + s * beat / 4, r + pat[s], beat / 4 * 0.85);
    } else if (mode === "ostinato") {
      // the same figure every 8th; every other round of the progression an octave joins it
      const round = Math.floor((clock.progStep - 1) / ((fixedProg() || [0, 0, 0, 0]).length));
      for (let s = 0; s < 2; s++) {
        const m = tones[clock.motif[(b * 2 + s) % clock.motif.length] % tones.length] + 12, at = t + s * beat / 2;
        pluck(at, m, "square", Math.min(0.6, beat * 0.55), 0.035);
        if (round % 2 === 1 || params.density > 0.85) pluck(at, m + 12, "triangle", Math.min(0.4, beat * 0.4), 0.025);
      }
    } else if (clock.arpOn) {
      const pat = [0, 1, 2, 1, 3 % tones.length, 2, 1, 2];
      for (let s = 0; s < 2; s++) if (rand() < 0.4 + params.density * 0.6) pluck(t + s * beat / 2, tones[pat[(b * 2 + s) % pat.length] % tones.length] + 12);
    }
  }
  // the lead: one note (a glide from the last one, a late vibrato)
  function leadNote(t, m, len, from) {
    const w = warmOn(), v = velo(), cut = 900 + params.brightness * 3200;
    const f = hz(m), lp = filter("lowpass", cut, w ? 1.2 : 3), g = gain(0), pan = panner((rand() - 0.5) * 0.3);
    const a = drift(osc("sawtooth", f, t)), b = drift(osc("square", f, t)); b.detune.value = 7;
    // WARM: bright at the start, darker as the note holds (louder notes brighter)
    if (w) { lp.frequency.setValueAtTime(cut * (1.1 + v * 0.4), t); lp.frequency.setTargetAtTime(cut * 0.55, t + 0.05, Math.max(0.15, len * 0.5)); }
    if (from != null && Math.abs(from - m) <= 7) [a, b].forEach((o) => { o.frequency.setValueAtTime(hz(from), t); o.frequency.exponentialRampToValueAtTime(f, t + 0.07); });
    const vib = osc("sine", 5.2, t), vg = gain(0);
    vg.gain.setValueAtTime(0, t + 0.25); vg.gain.linearRampToValueAtTime(14, t + Math.max(0.3, Math.min(0.9, len)));
    vib.connect(vg); vg.connect(a.detune); vg.connect(b.detune);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07 * v, t + 0.04); g.gain.setValueAtTime(0.07 * v, t + len); g.gain.setTargetAtTime(0, t + len, 0.12);
    const bg = gain(0.4); a.connect(lp); b.connect(bg); bg.connect(lp);
    lp.connect(g); g.connect(pan); pan.connect(N.bus.lead); pan.connect(N.delIn);
    [a, b, vib].forEach((o) => o.stop(t + len + 0.9));
  }
  // a phrase: 3–6 notes stepping along the scale, the last one long, on the chord; returns its end
  function phrase(t, beat) {
    const n = 3 + Math.floor(rand() * 4), base = rootMidi() + 24, chordDeg = [0, 2, 4].map((k) => clock.chordIdx + k);
    let d = chordDeg[Math.floor(rand() * 3)], at = t, prev = clock.leadLast;
    for (let k = 0; k < n; k++) {
      const last = k === n - 1;
      if (last) d = chordDeg.reduce((best, c) => (Math.abs(c - d) < Math.abs(best - d) ? c : best), chordDeg[0]);
      const len = (last ? 2 + Math.floor(rand() * 3) : [0.5, 1, 1, 1.5, 2][Math.floor(rand() * 5)]) * beat;
      const m = degree(d, base);
      leadNote(at, m, len * 0.92, prev);
      prev = m; at += len;
      const r = rand();
      d += r < 0.35 ? 1 : r < 0.7 ? -1 : r < 0.82 ? 2 : r < 0.94 ? -2 : 0;
      d = Math.max(-2, Math.min(9, d));
    }
    clock.leadLast = prev;
    return at;
  }
  // a soft lead: sine and a little triangle, breathy, a slow vibrato (a flute, roughly)
  function softNote(t, m, len) {
    const f = hz(m), g = gain(0), pan = panner((rand() - 0.5) * 0.3);
    const a = osc("sine", f, t), b = osc("triangle", f * 2, t), bg = gain(0.12);
    const vib = osc("sine", 4.6, t), vg = gain(0);
    vg.gain.setValueAtTime(0, t + 0.3); vg.gain.linearRampToValueAtTime(10, t + Math.max(0.4, len));
    vib.connect(vg); vg.connect(a.detune); vg.connect(b.detune);
    const br = noise(t, len + 0.3), bf = filter("bandpass", f * 2, 2), brg = gain(0.04);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.08); g.gain.setValueAtTime(0.09, t + len); g.gain.setTargetAtTime(0, t + len, 0.1);
    a.connect(g); b.connect(bg); bg.connect(g); br.connect(bf); bf.connect(brg); brg.connect(g);
    g.connect(pan); pan.connect(N.bus.lead); pan.connect(N.delIn);
    [a, b, vib].forEach((o) => o.stop(t + len + 0.6));
  }
  // a song's melody note, in the song's lead voice
  function leadPlay(t, m, len) {
    t = human(t, 16);
    if (params.leadVoice === "piano") piano(t, m, 0.85, N.bus.lead);
    else if (params.leadVoice === "soft") softNote(t, m, len);
    else leadNote(t, m, len, clock.leadLast);
    clock.leadLast = m;
  }

  const compose = (kind, prog, chordBars, r) => composeMelody(kind, prog, chordBars, r, steps().length);

  // ---------- playing a song ----------
  const songDef = () => (params.song && SONGS[params.song]) || null;
  const arrangeOf = (def, sec) => (sec ? Object.assign({}, ARRANGE[sec], def.arrange[sec]) : null);
  const progOf = (def, sec) => def.prog[sec] || def.prog.verse;
  function beginSong(t) {
    const def = songDef(), r = songRng(params);
    clock.s = { sec: 0, beat: 0, next: t, done: false,
      mel: { verse: compose("verse", def.prog.verse, def.chordBars, r), chorus: compose("chorus", def.prog.chorus, def.chordBars, r) } };
    clock.leadLast = null; clock.progStep = 0;
  }
  function songTick(now, ahead) {
    const def = songDef(), S = clock.s, beat = 60 / params.tempo, lv = params.levels;
    while (S.next <= ahead) {
      const t = Math.max(now, S.next);
      if (S.done) {
        // the next song, from its start (its own tempo, key and sound)
        const ids = Object.keys(SONGS), nextId = ids[(ids.indexOf(params.song) + 1) % ids.length];
        player.setParams(Object.assign(clone(SONGS[nextId].params), { song: nextId }));
        return;
      }
      const [sec, bars] = def.form[S.sec], arr = arrangeOf(def, sec), prog = progOf(def, sec);
      const p = S.beat % 4, bar = Math.floor(S.beat / 4);
      if (p === 0 && bar % def.chordBars === 0) {
        const n = steps().length, d = prog[Math.floor(bar / def.chordBars) % prog.length] % n, tones = [d, d + 2, d + 4];
        if (def.sevenths) tones.push(d + 6);
        clock.chordIdx = d; clock.chord = tones.map((x) => degree(x, rootMidi() + 12)); clock.arpOn = true; clock.progStep++;
        chordName = NOTES[clock.chord[0] % 12];
        if (arr.pads && lv.pads > 0.01) padChord(t, def.chordBars * 4 * beat);
      }
      if (p === 0) {
        if (arr.crash && bar === 0 && lv.beat > 0.01) crash(t);
        if (arr.lead && lv.lead > 0.01) {
          const mel = S.mel[arr.lead], base = rootMidi() + 24;
          mel[bar % mel.length].forEach((q) => leadPlay(t + q.s * beat, degree(q.d, base), q.l * beat * 0.92));
        }
      }
      // drums, with a roll into a section that has them
      const nx = def.form[S.sec + 1], nextArr = nx ? arrangeOf(def, nx[0]) : null;
      const rollIn = bar === bars - 1 && p >= 2 && nextArr && nextArr.drums && lv.beat > 0.01;
      if (rollIn) fill(t, p, beat);
      else if (arr.drums && lv.beat > 0.01) drumBeat(arr.drums, t, S.beat, beat);
      if (arr.bass && lv.bass > 0.01) bassBeat(arr.bass, t, p, beat);
      if (arr.arp && lv.arp > 0.01) arp(t, S.beat, beat);
      if (arr.bells && lv.bells > 0.01 && rand() < 0.15) bell(t + rand() * beat * 0.5);
      S.beat++; S.next = t + beat;
      if (S.beat >= bars * 4) {
        S.sec++; S.beat = 0;
        if (S.sec >= def.form.length) {
          // the end: the last chord rings out, then a breath
          live.pads.forEach((v) => { v.g.gain.setTargetAtTime(0, S.next + beat, 1.2); v.stopAt = S.next + 8; });
          S.done = true; S.next = t + beat * 7;
        }
      }
    }
  }

  // the drums
  function kick(t, amp) {
    const o = osc("sine", 140, t), g = gain(0);
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9 * (amp == null ? 1 : amp), t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(g); g.connect(N.bus.beat); o.stop(t + 0.4);
  }
  function snare(t, amp) {
    amp = amp == null ? 1 : amp;
    const n = noise(t, 0.3), bp = filter("bandpass", 1900, 0.8), g = gain(0);
    g.gain.setValueAtTime(0.5 * amp, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    const o = osc("triangle", 190, t), og = gain(0);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    og.gain.setValueAtTime(0.3 * amp, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); o.stop(t + 0.12);
    n.connect(bp); bp.connect(g); o.connect(og);
    // the snare alone gets the big room
    const room = gain(1.2); g.connect(room); room.connect(N.revIn);
    g.connect(N.bus.beat); og.connect(N.bus.beat);
  }
  function hat(t, amp) {
    t = human(t, 8); amp *= velo(0.35);
    const n = noise(t, 0.06), hp = filter("highpass", 7500), g = gain(0);
    g.gain.setValueAtTime(0.13 * amp, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    n.connect(hp); hp.connect(g); g.connect(N.bus.beat);
  }
  // a cymbal: long bright noise, into the room
  function crash(t) {
    const n = noise(t, 2.2), hp = filter("highpass", 4500), g = gain(0);
    g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2);
    n.connect(hp); hp.connect(g); g.connect(N.bus.beat);
    const room = gain(0.6); g.connect(room); room.connect(N.revIn);
  }
  // one beat of a drum pattern: full (8th hats), full16, half (half time), light
  function drumBeat(style, t, b, beat) {
    const p = b % 4;
    if (style === "half") {
      if (p === 0) kick(t);
      if (p === 2) snare(t);
      hat(t, 0.3); hat(t + beat / 2, 0.6);
      return;
    }
    if (style === "light") {
      if (p === 0) kick(t, 0.8);
      if (p === 2) kick(t, 0.55);
      hat(t + beat / 2, 0.7);
      return;
    }
    if (p === 0 || p === 2) kick(t);
    if (p === 2 && rand() < params.density * 0.35) kick(t + beat * 0.5);
    if (p === 1 || p === 3) snare(t);
    hat(t, 0.5); hat(t + beat / 2, 1);
    if (style === "full16") { hat(t + beat / 4, 0.3); hat(t + beat * 0.75, 0.3); }
  }
  function drums(t, b, beat) { drumBeat(params.density > 0.5 ? "full16" : "full", t, b, beat); }
  // the last two beats of a section: a snare roll, louder and louder
  function fill(t, p, beat) {
    if (p === 2) kick(t);
    for (let s = 0; s < 4; s++) snare(t + s * beat / 4, 0.3 + 0.08 * ((p - 2) * 4 + s));
  }
  // one beat of a bass line on the chord: root8 (8ths), pulse16 (16ths, octaves), half (root, then the fifth)
  function bassBeat(style, t, p, beat) {
    const r = clock.chord[0] - 12, bus = N.bus.bass;
    if (style === "pulse16") { [0, 0, 12, 0].forEach((o, s) => bassNote(t + s * beat / 4, r + o, beat / 4 * 0.85, bus)); return; }
    if (style === "half") {
      if (p === 0) bassNote(t, r, beat * 1.9, bus);
      if (p === 2) bassNote(t, clock.chord[2] - 12, beat * 1.9, bus);
      return;
    }
    bassNote(t, r, beat * 0.42, bus); bassNote(t + beat / 2, p === 3 ? r + 12 : r, beat * 0.42, bus);
  }
  // the derelict: metal struck somewhere in the dark (inharmonic FM)
  function clang(t) {
    const f = 60 + rand() * 220, ratio = [1.41, 2.76, 3.17, 1.89][Math.floor(rand() * 4)], len = 2.5 + rand() * 3;
    const car = osc("sine", f, t), car2 = osc("sine", f * 2.37, t), mod = osc("sine", f * ratio, t), mg = gain(0);
    mg.gain.setValueAtTime(f * (4 + rand() * 6), t); mg.gain.exponentialRampToValueAtTime(f * 0.3, t + len);
    const g = gain(0), g2 = gain(0.4), pan = panner(rand() * 1.8 - 0.9);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    mod.connect(mg); mg.connect(car.frequency); mg.connect(car2.frequency);
    car.connect(g); car2.connect(g2); g2.connect(g); g.connect(pan); pan.connect(N.bus.metal); pan.connect(N.delIn);
    [car, car2, mod].forEach((o) => o.stop(t + len + 0.1));
  }
  // a hull groaning: a low saw bending down, swelling and fading
  function groan(t) {
    const f = 45 + rand() * 40, len = 3 + rand() * 3;
    const o = osc("sawtooth", f, t), lp = filter("lowpass", 260 + params.brightness * 300, 6), g = gain(0);
    o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (0.8 + rand() * 0.1), t + len);
    lp.frequency.setValueAtTime(180, t); lp.frequency.linearRampToValueAtTime(420, t + len * 0.5); lp.frequency.linearRampToValueAtTime(150, t + len);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + len * 0.4); g.gain.linearRampToValueAtTime(0, t + len);
    o.connect(lp); lp.connect(g); g.connect(N.bus.metal); o.stop(t + len + 0.1);
  }
  // the texture: radio static (a wandering band) or rain (a wide band, steady)
  function startTexture() {
    const t = ctx.currentTime, rain = params.textureKind === "rain";
    const src = ctx.createBufferSource(); src.buffer = rain ? N.noise : N.pink; src.loop = true;
    const bp = rain ? filter("bandpass", 2600, 0.35) : filter("bandpass", 900, 1.4);
    const g = gain(0); g.gain.setTargetAtTime(rain ? 0.07 : 0.12, t, 3);
    src.connect(bp); bp.connect(g); g.connect(N.bus.texture); src.start(t);
    live.texture = { src, bp, g, rain };
  }
  function stopTexture() {
    const x = live.texture; if (!x) return;
    live.texture = null;
    const t = ctx.currentTime;
    x.g.gain.cancelScheduledValues(t); x.g.gain.setTargetAtTime(0, t, 0.5); x.src.stop(t + 3);
  }
  function crackle(t) {
    const src = ctx.createBufferSource(); src.buffer = N.noise; src.playbackRate.value = 0.5 + rand();
    const hp = filter("highpass", 2500 + rand() * 3000);
    const g = ctx.createGain(), len = 0.004 + rand() * 0.02;
    g.gain.setValueAtTime(0.25 * rand(), t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(hp); hp.connect(g); g.connect(N.bus.texture); src.start(t, rand() * 3); src.stop(t + len + 0.01);
  }
  // a raindrop: a tiny falling blip
  function drop(t) {
    const f = 1400 + rand() * 3000, o = osc("sine", f, t), g = gain(0), pan = panner(rand() * 2 - 1);
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.03);
    g.gain.setValueAtTime(0.05 * rand(), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    o.connect(g); g.connect(pan); pan.connect(N.bus.texture); o.stop(t + 0.05);
  }
  // a murmured phrase: syllables of filtered noise (and a faint voiced hum) — VoiceKit (js/audio/voice/voicekit.js)
  function whisper(t) {
    if (!window.VoiceKit) return;
    const pan = panner(rand() * 1.4 - 0.7); pan.connect(N.bus.whispers);
    window.VoiceKit.murmur(ctx, pan, t, { rand, noise: N.noise });
  }
  // the robot voice: the browser's speech synthesis, low and slow — VoiceKit; its loudness: this layer × the volume
  // (× the speech bus of the mixer, when the player plays through it)
  function speak(text) {
    if (!window.VoiceKit || !(params.levels.voice > 0.01)) return;
    window.VoiceKit.speak(text, { lang: "en-GB", male: true, rate: 0.82, pitch: 0.15, volume: Math.min(1, params.levels.voice * params.volume * 1.3), mix: opts.mixer || null });
  }

  // ---------- the clock: events a little ahead ----------
  function tick() {
    const now = ctx.currentTime, ahead = now + 0.25, beat = 60 / params.tempo, lv = params.levels;
    if (songDef() && clock.s) songTick(now, ahead);
    else ambientTick(now, ahead, beat, lv);
    common(now, ahead, lv);
  }
  // the moods: a chord every 4 bars, events by chance
  function ambientTick(now, ahead, beat, lv) {
    // chords: every 4 bars
    if (clock.nextChord <= ahead) {
      const t = Math.max(now, clock.nextChord), dur = beat * 16;
      nextChord();
      if (lv.pads > 0.01) padChord(t, dur);
      clock.nextChord = t + dur;
    }
    // beats: the pulse, the drums, the bells, the arp, the lead, the metal
    while (clock.nextBeat <= ahead) {
      const t = Math.max(now, clock.nextBeat), b = clock.beat++;
      if (lv.pulse > 0.01 && b % 2 === 0) { thump(t, 0.5); thump(t + beat * 0.28, 0.3); }
      if (lv.beat > 0.01) drums(t, b, beat);
      const bellOdds = params.bellVoice === "piano" ? 0.1 + params.density * 0.4 : params.density * 0.3;
      if (lv.bells > 0.01 && rand() < bellOdds) bell(t + rand() * beat * 0.5);
      if (lv.arp > 0.01) arp(t, b, beat);
      if (lv.lead > 0.01 && clock.nextLead <= t) {
        const end = phrase(t, beat);
        clock.nextLead = end + beat * (2 + Math.floor(rand() * (8 - params.density * 6)));
      }
      if (lv.metal > 0.01) {
        if (rand() < 0.03 + params.density * 0.09) clang(t + rand() * beat);
        if (rand() < 0.012) groan(t);
      }
      clock.nextBeat = t + beat;
    }
  }
  // both ways: the texture, the whispers, the voice, cleaning up
  function common(now, ahead, lv) {
    // the texture: the radio's band wanders, crackles — or raindrops
    const tex = live.texture;
    if (tex && !tex.rain) tex.bp.frequency.setTargetAtTime(400 + 2600 * (0.5 + 0.5 * Math.sin(now * 0.07) * Math.sin(now * 0.031)), now, 2);
    if (lv.texture > 0.01 && clock.nextCrackle <= ahead) {
      const t = Math.max(now, clock.nextCrackle);
      if (tex && tex.rain) { drop(t); clock.nextCrackle = now + 0.01 + rand() * 0.14 * (1.5 - params.density); }
      else { crackle(t); clock.nextCrackle = now + 0.05 + rand() * (1.6 - params.density); }
    }
    // whispers: a phrase now and then
    if (lv.whispers > 0.01 && clock.nextWhisper <= ahead) { whisper(Math.max(now, clock.nextWhisper)); clock.nextWhisper = now + 4 + rand() * (14 - params.density * 9); }
    // the voice
    if (lv.voice > 0.01 && params.voiceLines.length && clock.nextVoice <= now) {
      speak(params.voiceLines[Math.floor(rand() * params.voiceLines.length)]);
      clock.nextVoice = now + params.voiceEvery * (0.6 + rand() * 0.8);
    }
    // the pads that have faded out
    live.pads = live.pads.filter((v) => { if (v.stopAt <= now) { v.oscs.forEach((o) => o.stop()); return false; } return true; });
  }

  // ---------- the player ----------
  let revTimer = 0;
  const player = {
    params,
    get playing() { return playing; },
    get chordName() { return chordName; },
    get song() {
      const def = songDef(), S = clock.s;
      if (!def || !S || !playing) return null;
      const f = def.form[Math.min(S.sec, def.form.length - 1)];
      return { id: params.song, name: def.name, section: S.done ? "end" : f[0], bar: Math.floor(S.beat / 4) + 1, bars: f[1], part: S.sec + 1, parts: def.form.length };
    },
    get analyser() { return N.analyser || null; },
    get stream() { return N.stream ? N.stream.stream : null; },
    start() {
      if (!ctx) build();
      if (ctx.state === "suspended") ctx.resume();
      if (playing) return;
      playing = true;
      rand = rng(params.seed); jit = rng(params.seed + 99);
      clock.motif = MOTIFS[Math.floor(rand() * MOTIFS.length)];
      const t = ctx.currentTime;
      clock.nextChord = t + 0.05; clock.nextBeat = t + 0.5; clock.beat = 0; clock.progStep = 0;
      clock.nextWhisper = t + 3; clock.nextVoice = t + 8; clock.nextCrackle = t;
      clock.nextLead = t + 0.5 + 4 * 60 / params.tempo; clock.leadLast = null;
      N.master.gain.cancelScheduledValues(t); N.master.gain.setTargetAtTime(params.volume, t, 1.2);
      if (songDef()) beginSong(t + 0.3);
      if (!live.drone && params.levels.drone > 0.01) startDrone();
      if (!live.texture) startTexture();
      timer = setInterval(tick, 100);
      tick();
    },
    stop() {
      if (!playing) return;
      playing = false;
      clearInterval(timer); timer = null;
      const t = ctx.currentTime;
      N.master.gain.cancelScheduledValues(t); N.master.gain.setTargetAtTime(0, t, 0.6);
      if (window.speechSynthesis) speechSynthesis.cancel();
      setTimeout(() => {
        if (playing) return;
        live.pads.forEach((v) => v.oscs.forEach((o) => o.stop())); live.pads = [];
        if (live.drone) { live.drone.oscs.forEach((o) => o.stop()); live.drone.lfo.stop(); live.drone = null; }
        if (live.texture) { live.texture.src.stop(); live.texture = null; }
      }, 3000);
    },
    setParams(patch) {
      const before = { root: params.root, scale: params.scale, seed: params.seed, space: params.space, padVoice: params.padVoice,
        textureKind: params.textureKind, droneVoice: params.droneVoice, warm: params.warm, progression: JSON.stringify(params.progression), song: params.song };
      merge(params, patch);
      if (!ctx) return;
      const t = ctx.currentTime;
      if (playing) N.master.gain.setTargetAtTime(params.volume, t, 0.2);
      LAYERS.forEach((l) => N.bus[l].gain.setTargetAtTime(params.levels[l], t, 0.15));
      N.delay.delayTime.setTargetAtTime(60 / params.tempo * 0.75, t, 0.5);
      N.revIn.gain.setTargetAtTime(0.6 + params.space * 0.6, t, 0.3);
      if (before.space !== params.space) { clearTimeout(revTimer); revTimer = setTimeout(() => { N.reverb.buffer = impulse(2 + params.space * 6); }, 250); }
      if (before.seed !== params.seed) rand = rng(params.seed);
      if (before.progression !== JSON.stringify(params.progression)) clock.progStep = 0;
      if (before.song !== params.song) {
        if (songDef()) { if (playing) beginSong(t + 0.15); }
        else { clock.s = null; clock.nextChord = t; clock.nextBeat = t + 0.2; }
      }
      if (before.root !== params.root || before.scale !== params.scale || before.progression !== JSON.stringify(params.progression)) clock.nextChord = t;
      else if (before.padVoice !== params.padVoice && playing && params.levels.pads > 0.01 && clock.chord.length) padChord(t, Math.max(1, clock.nextChord - t));
      if (before.textureKind !== params.textureKind && live.texture) { stopTexture(); if (playing) startTexture(); }
      if ((before.droneVoice !== params.droneVoice || before.warm !== params.warm) && live.drone) stopDrone(0.8);
      if (before.warm !== params.warm) { applyWarm(); N.reverb.buffer = impulse(2 + params.space * 6); }
      droneFollow();
      if (playing && params.levels.drone > 0.01 && !live.drone) startDrone();
    },
    say(text) { speak(text); },
    // the song now playing (or chosen) as a MIDI file, with these params
    midi() { return songMidi(params); },
    dispose() { player.stop(); setTimeout(() => { if (ctx && !opts.ctx) ctx.close(); else if (N.analyser) N.analyser.disconnect(); ctx = null; }, 3200); },
  };
  return player;
}

// API (window.MusicKit — dla stron, które czytają globalny kit; moduł ES — export niżej)
window.MusicKit = { create, songMidi, PRESETS, SONGS, VOICES, LAYERS, SCALES, NOTES, DEFAULTS };

// moduł ES: kit do importu (window.MusicKit zostaje dla stron i skryptów, które go czytają)
export const MusicKit = window.MusicKit;
export default MusicKit;
