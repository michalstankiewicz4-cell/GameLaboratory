// VoiceKit — mowa w grze, bez plików dźwiękowych (laboratorium mowy: labs/sound-speech.html):
//   speak(tekst, opcje)    synteza mowy przeglądarki (speechSynthesis): język, głos, tempo, wysokość. Gra poza grafem
//                          Web Audio — bez efektów i nie do nagrania; głośność z szyny mowy miksera (js/audio/mixer.js)
//   murmur(ctx, out, t, o) szept bez słów: sylaby szumu (i cichego buczenia) przez formanty samogłosek F1–F3, czasem
//                          miękkie „s” (z MusicKit, gdzie to warstwa szeptów — z historią w js/audio/musickit/)
//   babble(ctx, out, t, tekst, o)  głos z formantów: tekst zamieniony na sylaby (samogłoski — formanty, spółgłoski —
//                          szum, zwarcia, nosówki), wysokość głosu, wielkość krtani (przesunięcie formantów), tempo,
//                          intonacja (na końcu zdania w dół, przy pytaniu w górę), chrypka; jak „mowa” postaci w grach
//   chain(ctx, out, fx)    efekty głosu: radio (pasmo 300–3400 Hz, przester, szum), robot (modulacja pierścieniowa),
//                          echo, odległość (przytłumienie); → wejście łańcucha
// Głos jako dane (zasób „voice”): { mode: 'speech' | 'formant' | 'whisper', lang, voice, rate, pitch, hz, size, speed,
//   melody, breath, fx: { radio, robot, echo, far } }. W MusicKit: warstwy „voice” (speak) i „whispers” (murmur).
const VOWELS = [[850, 1220, 2810], [610, 2330, 2990], [350, 2700, 3300], [590, 920, 2710], [400, 1000, 2600], [700, 1500, 2600]];
// samogłoski tekstu → formanty (a, e, i, o, u, y; ą ę ó jak o / e / u)
const VF = { a: VOWELS[0], e: VOWELS[1], i: VOWELS[2], o: VOWELS[3], u: [300, 870, 2240], y: [400, 1600, 2500], ó: [300, 870, 2240], ą: VOWELS[3], ę: VOWELS[1] };
const FRIC = 'szfchśźżcćx', PLOS = 'pbtdkgq', NAS = 'mnńlrłjw';

export const VOICE_DEFAULTS = { mode: 'formant', lang: 'pl-PL', voice: '', rate: 1, pitch: 1, hz: 140, size: 1, speed: 1, melody: 0.5, breath: 0.15,
  fx: { radio: 0, robot: 0, echo: 0, far: 0 } };
export const VOICE_PRESETS = {
  narrator: { label: 'Narrator (browser speech)', mode: 'speech', rate: 0.95, pitch: 0.9 },
  robot: { label: 'Station robot', mode: 'speech', lang: 'en-GB', rate: 0.82, pitch: 0.15 },
  villager: { label: 'Villager (formant speech)', mode: 'formant', hz: 150, size: 1, speed: 1, melody: 0.6, breath: 0.1 },
  child: { label: 'Child', mode: 'formant', hz: 290, size: 0.78, speed: 1.2, melody: 0.8, breath: 0.08 },
  giant: { label: 'Giant', mode: 'formant', hz: 70, size: 1.45, speed: 0.7, melody: 0.3, breath: 0.25 },
  radio: { label: 'Radio operator', mode: 'formant', hz: 120, size: 1, speed: 1.15, melody: 0.4, breath: 0.1, fx: { radio: 1, robot: 0, echo: 0, far: 0 } },
  android: { label: 'Android', mode: 'formant', hz: 110, size: 1.05, speed: 0.95, melody: 0.1, breath: 0, fx: { radio: 0, robot: 1, echo: 0.2, far: 0 } },
  ghost: { label: 'Ghost whisper', mode: 'whisper', speed: 0.8, fx: { radio: 0, robot: 0, echo: 0.6, far: 0.3 } },
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function normalizeVoice(v0 = {}) {
  const d = VOICE_DEFAULTS, v = { ...d, ...v0, fx: { ...d.fx, ...(v0.fx || {}) } };
  v.mode = ['speech', 'formant', 'whisper'].includes(v.mode) ? v.mode : d.mode;
  for (const [k, lo, hi] of [['rate', 0.3, 2], ['pitch', 0, 2], ['hz', 50, 400], ['size', 0.6, 1.6], ['speed', 0.4, 2], ['melody', 0, 1], ['breath', 0, 1]]) v[k] = clamp(Number.isFinite(+v[k]) && v[k] !== '' && v[k] != null ? +v[k] : d[k], lo, hi);
  for (const k of Object.keys(d.fx)) v.fx[k] = clamp(+v.fx[k] || 0, 0, 1);
  v.lang = String(v.lang || d.lang).slice(0, 12); v.voice = String(v.voice || '').slice(0, 80);
  delete v.label; return v;
}

/* ---------------- synteza mowy przeglądarki ---------------- */
export function voices(lang) {
  if (typeof speechSynthesis === 'undefined') return [];
  const all = speechSynthesis.getVoices();
  return lang ? all.filter((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase())) : all;
}
/** Mówi tekst głosem przeglądarki; volume 0…1 (× głośność mowy z miksera, gdy podany mix). → utterance albo null. */
export function speak(text, o = {}) {
  if (typeof speechSynthesis === 'undefined' || !text) return null;
  const u = new SpeechSynthesisUtterance(text), lang = o.lang || 'en-GB';
  const list = voices(lang);
  let v = o.voice ? speechSynthesis.getVoices().find((x) => x.name === o.voice) : null;
  if (!v && o.male) v = list.find((x) => /male|david|daniel|george|guy|fred|adam|krzysztof/i.test(x.name) && !/female/i.test(x.name));
  if (!v) v = list[0] || null;
  if (v) u.voice = v;
  u.lang = v ? v.lang : lang; u.rate = o.rate ?? 1; u.pitch = o.pitch ?? 1;
  const mv = o.mix ? o.mix.volumes : null;
  u.volume = Math.min(1, (o.volume ?? 1) * (mv ? (mv.mute ? 0 : mv.master * mv.voice) : 1));
  if (o.onend) u.onend = o.onend;
  speechSynthesis.speak(u);
  return u;
}
export const silence = () => { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); };

/* ---------------- pomocnicze Web Audio ---------------- */
let noiseCache = new WeakMap();
function noiseOf(ctx) {
  let b = noiseCache.get(ctx);
  if (!b) { b = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noiseCache.set(ctx, b); }
  return b;
}
const G = (ctx, v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
const F = (ctx, type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; };

/** Szept bez słów (z MusicKit): fraza 3–8 sylab od czasu t; rand — generator 0…1 (ziarno); → czas końca. */
export function murmur(ctx, out, t, { rand = Math.random, noise = noiseOf(ctx), pitch = null, syllables = null, speed = 1 } = {}) {
  const n = syllables || 3 + Math.floor(rand() * 6), hz = pitch || 190 + rand() * 50;
  let at = t;
  for (let k = 0; k < n; k++) {
    const v = VOWELS[Math.floor(rand() * VOWELS.length)], len = (0.12 + rand() * 0.2) / speed;
    const src = ctx.createBufferSource(); src.buffer = noise; src.playbackRate.value = 1;
    const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = hz * (1 + (rand() - 0.5) * 0.08);
    const humG = G(ctx, 0.18), env = ctx.createGain();
    env.gain.setValueAtTime(0, at); env.gain.linearRampToValueAtTime(0.5, at + 0.04); env.gain.setValueAtTime(0.5, at + len);
    env.gain.exponentialRampToValueAtTime(0.0001, at + len + 0.12);
    v.forEach((f, i) => {
      const bp = F(ctx, 'bandpass', f * (1 + (rand() - 0.5) * 0.06), 9), fg = G(ctx, [1, 0.55, 0.3][i]);
      src.connect(bp); hum.connect(humG); humG.connect(bp); bp.connect(fg); fg.connect(env);
    });
    env.connect(out);
    src.start(at, rand() * 3); hum.start(at); src.stop(at + len + 0.15); hum.stop(at + len + 0.15);
    if (rand() < 0.25) {   // miękkie „s”
      const s = ctx.createBufferSource(); s.buffer = noise; const hp = F(ctx, 'highpass', 5000);
      const sg = ctx.createGain(); sg.gain.setValueAtTime(0.12, at + len); sg.gain.exponentialRampToValueAtTime(0.0001, at + len + 0.09);
      s.connect(hp); hp.connect(sg); sg.connect(out); s.start(at + len, rand() * 3); s.stop(at + len + 0.1);
    }
    at += len + (0.06 + rand() * 0.12) / speed;
  }
  return at;
}

// tekst → sylaby: [{ c: spółgłoski przed, v: samogłoska, end: koniec wyrazu, q: pytanie, stop: koniec zdania }]
function syllablesOf(text) {
  const out = [], s = String(text).toLowerCase();
  let cons = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (VF[ch]) { out.push({ c: cons, v: ch, end: false }); cons = ''; continue; }
    if (/[a-ząćęłńóśźż]/.test(ch)) { cons += ch; continue; }
    if (out.length) { const last = out[out.length - 1]; last.end = true; if (cons) { last.tail = cons; cons = ''; } if (/[.!?]/.test(ch)) { last.stop = true; last.q = ch === '?'; } if (/[,;:]/.test(ch)) last.pause = true; }
  }
  if (out.length) { const last = out[out.length - 1]; last.end = last.stop = true; if (cons) last.tail = cons; }
  return out;
}

/** Głos z formantów: tekst → mowa od czasu t; o: { hz, size, speed, melody, breath, rand }; → czas końca. */
export function babble(ctx, out, t, text, o = {}) {
  const v = normalizeVoice({ ...o, mode: 'formant' }), rand = o.rand || Math.random, noise = noiseOf(ctx);
  const syl = syllablesOf(text); if (!syl.length) return t;
  const sp = 1 / v.speed, fs = 1 / v.size;   // większa krtań — niższe formanty
  // jedno źródło głosu (piła) przez całą wypowiedź: wysokość prowadzona po sylabach; szum oddechu obok
  const src = ctx.createOscillator(); src.type = 'sawtooth'; src.frequency.setValueAtTime(v.hz, t);
  const vib = ctx.createOscillator(), vg = G(ctx, v.hz * 0.012); vib.frequency.value = 5.2; vib.connect(vg); vg.connect(src.frequency);
  const breath = ctx.createBufferSource(); breath.buffer = noise; breath.loop = true;
  const voiced = G(ctx, 0), air = G(ctx, 0), mixIn = G(ctx, 1);
  src.connect(voiced); breath.connect(air); voiced.connect(mixIn); air.connect(mixIn);
  // trzy formanty (pasma) — częstotliwości przestawiane na każdą samogłoskę
  const bands = [0, 1, 2].map((i) => { const b = F(ctx, 'bandpass', 500, [6, 9, 11][i]), g = G(ctx, [1, 0.6, 0.35][i]); mixIn.connect(b); b.connect(g); g.connect(out); return b; });
  let at = t;
  syl.forEach((s, i) => {
    const len = (0.11 + (s.v === 'a' || s.v === 'o' ? 0.04 : 0) + rand() * 0.04) * sp;
    // spółgłoski przed samogłoską: szum (s, sz, f…), zwarcie (p, t, k…), nosówka (m, n, l…)
    for (const c of s.c.slice(-2)) {
      if (FRIC.includes(c)) { const n = ctx.createBufferSource(); n.buffer = noise; const hp = F(ctx, 'highpass', c === 'f' || c === 'h' ? 1800 : 4200 * fs), g = ctx.createGain();
        g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.35, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07 * sp);
        n.connect(hp); hp.connect(g); g.connect(out); n.start(at, rand() * 2); n.stop(at + 0.09 * sp); at += 0.06 * sp; }
      else if (PLOS.includes(c)) { voiced.gain.setValueAtTime(0, at); at += 0.03 * sp;
        const n = ctx.createBufferSource(); n.buffer = noise; const bp = F(ctx, 'bandpass', (c === 'k' || c === 'g' ? 1800 : c === 't' || c === 'd' ? 3800 : 900) * fs, 1.2), g = ctx.createGain();
        g.gain.setValueAtTime(0.5, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.03); n.connect(bp); bp.connect(g); g.connect(out); n.start(at, rand() * 2); n.stop(at + 0.04); }
      else if (NAS.includes(c)) { bands[0].frequency.setTargetAtTime(280 * fs, at, 0.01); bands[1].frequency.setTargetAtTime(1300 * fs, at, 0.01); bands[2].frequency.setTargetAtTime(2500 * fs, at, 0.01);
        voiced.gain.setTargetAtTime(0.45, at, 0.01); at += 0.05 * sp; }
    }
    const f = VF[s.v];
    bands.forEach((b, k) => b.frequency.setTargetAtTime(f[k] * fs * (1 + (rand() - 0.5) * 0.04), at, 0.012));
    // intonacja: lekki spadek w zdaniu, na końcu zdania w dół (pytanie — w górę), akcent co drugi wyraz
    const pos = i / Math.max(1, syl.length - 1), m = v.melody;
    let hz = v.hz * (1 + m * 0.12 * (0.5 - pos) + (rand() - 0.5) * m * 0.12);
    if (s.stop) hz *= s.q ? 1 + 0.35 * m : 1 - 0.18 * m;
    src.frequency.setTargetAtTime(hz, at, 0.04);
    voiced.gain.setTargetAtTime(0.9, at, 0.015); air.gain.setTargetAtTime(v.breath * 0.6, at, 0.02);
    at += len;
    if (s.end) {   // przerwa między wyrazami (dłuższa po przecinku i na końcu zdania)
      voiced.gain.setTargetAtTime(0, at, 0.02); air.gain.setTargetAtTime(0, at, 0.02);
      at += (s.stop ? 0.35 : s.pause ? 0.2 : 0.05 + rand() * 0.04) * sp;
    }
  });
  voiced.gain.setTargetAtTime(0, at, 0.03); air.gain.setTargetAtTime(0, at, 0.03);
  src.start(t); vib.start(t); breath.start(t, rand() * 2);
  const stopAt = at + 0.3;
  src.stop(stopAt); vib.stop(stopAt); breath.stop(stopAt);
  return at;
}

/** Efekty głosu → { input, out, dispose }: radio, robot, echo, odległość (0…1 każde). */
export function chain(ctx, out, fx = {}) {
  const input = G(ctx, 1), nodes = [];
  let x = input;
  const add = (n) => { x.connect(n); x = n; nodes.push(n); return n; };
  if (fx.far > 0) { add(F(ctx, 'lowpass', 8000 - fx.far * 6500)); add(G(ctx, 1 - fx.far * 0.5)); }
  if (fx.robot > 0) {   // modulacja pierścieniowa: głos × sinus (metaliczny, „robotyczny”)
    const ring = G(ctx, 0), lfo = ctx.createOscillator(); lfo.frequency.value = 30 + fx.robot * 50; lfo.connect(ring.gain); lfo.start(); nodes.push(lfo);
    const dry = G(ctx, 1 - fx.robot * 0.85), sum = G(ctx, 1); x.connect(ring); x.connect(dry); ring.connect(sum); dry.connect(sum); nodes.push(ring, dry, sum); x = sum;
  }
  if (fx.radio > 0) {
    add(F(ctx, 'highpass', 300 + fx.radio * 200)); add(F(ctx, 'lowpass', 3400 - fx.radio * 600));
    const sh = ctx.createWaveShaper(), k = 1 + fx.radio * 30, n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const xx = i / (n - 1) * 2 - 1; c[i] = Math.tanh(xx * k) / Math.tanh(k); }
    sh.curve = c; add(sh); add(G(ctx, 0.2));
    const hiss = ctx.createBufferSource(); hiss.buffer = noiseOf(ctx); hiss.loop = true; const hg = G(ctx, 0.015 * fx.radio), hb = F(ctx, 'bandpass', 2500, 0.8);
    hiss.connect(hb); hb.connect(hg); hg.connect(out); hiss.start(); nodes.push(hiss, hg, hb);
  }
  x.connect(out);
  if (fx.echo > 0) {
    const d = ctx.createDelay(1.5), fb = G(ctx, 0.25 + fx.echo * 0.45), wet = G(ctx, fx.echo * 0.7), lp = F(ctx, 'lowpass', 3000);
    d.delayTime.value = 0.18 + fx.echo * 0.25; x.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(out); nodes.push(d, fb, wet, lp);
  }
  return { input, dispose() { for (const n of nodes) { try { if (n.stop) n.stop(); n.disconnect(); } catch { /* już */ } } try { input.disconnect(); } catch { /* już */ } } };
}

/** Wypowiedź głosem z opisu (zasób „voice”): mowa przeglądarki albo syntetyczna przez efekty do out. → { end, stop } */
export function say(ctx, out, text, voice0 = {}, { mix = null, rand = Math.random } = {}) {
  const v = normalizeVoice(voice0);
  if (v.mode === 'speech') { const u = speak(text, { lang: v.lang, voice: v.voice, rate: v.rate, pitch: v.pitch, mix }); return { end: null, utterance: u, stop: silence }; }
  const fx = chain(ctx, out, v.fx), t = ctx.currentTime + 0.05;
  let end;
  if (v.mode === 'whisper') {
    const loud = G(ctx, 3); loud.connect(fx.input); end = t;   // szept jest cichy — podgłośniony do poziomu mowy
    const words = String(text).split(/\s+/).filter(Boolean), n = Math.max(1, Math.round(words.length / 3));
    for (let k = 0; k < n; k++) end = murmur(ctx, loud, end, { rand, speed: v.speed, syllables: Math.min(8, 2 + Math.round(words.slice(k * 3, k * 3 + 3).join('').length / 3)) }) + 0.25 / v.speed;
  } else end = babble(ctx, fx.input, t, text, { ...v, rand });
  const tm = setTimeout(() => fx.dispose(), (end - ctx.currentTime + 2.5) * 1000);
  return { end, stop() { clearTimeout(tm); fx.dispose(); } };
}

// MusicKit (klasyczny skrypt) sięga po głos i szepty przez window.VoiceKit
if (typeof window !== 'undefined') window.VoiceKit = { VOWELS, speak, silence, murmur, babble, chain, say, voices, normalizeVoice, VOICE_PRESETS, VOICE_DEFAULTS };
