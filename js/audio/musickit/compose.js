// MusicKit · kompozycja: melodia piosenki z jej progresji (wspólna dla odtwarzacza i eksportu MIDI) i piosenka jako
// plik MIDI (songMidi). Bez Web Audio.
import { SCALES, ARRANGE, SONGS, RHYTHMS, MOTIFS, rng, clone } from './data.js';

// ---------- composing a song's melody (the player and the MIDI export) ----------
// One cycle of a section's progression, bar by bar: [{ s, l, d }] (start
// and length in beats, a scale degree above the lead's base). Bars follow a
// plan — A B A E (or A B A C A B A E over 8 bars): an A bar's rhythm and
// shape come back on the next A, moved to fit its chord; strong beats sit
// on chord tones; the E bar ends on the last chord's root.
function composeMelody(kind, prog, chordBars, r, n) {
  const C = prog.length * chordBars, center = kind === "chorus" ? Math.round(n * 0.7) : Math.round(n * 0.3);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const chordAt = (bar) => prog[Math.floor(bar / chordBars) % prog.length] % n;
  const tones = (c) => { const out = []; for (let o = -1; o <= 2; o++) [0, 2, 4].forEach((k) => out.push(c + k + o * n)); return out; };
  const near = (list, x) => list.reduce((b, d) => (Math.abs(d - x) < Math.abs(b - x) ? d : b), list[0]);
  const motifs = {}, bars = [];
  let prev = center;
  for (let i = 0; i < C; i++) {
    const role = i === C - 1 ? "E" : i % 2 === 0 ? "A" : C >= 8 && i === 3 ? "C" : "B", c = chordAt(i);
    let notes;
    if (role === "E") {
      const rh = motifs.E || (motifs.E = pick(RHYTHMS.end));
      const fin = near([c - n, c, c + n, c + 2 * n], center + (prev - center) * 0.5), side = prev >= fin ? 1 : -1;
      notes = rh.map(([s, l], j) => ({ s, l, d: fin + (rh.length - 1 - j) * side }));
    } else if (motifs[role]) {
      const m = motifs[role], start = near(tones(c), prev);
      notes = m.rh.map(([s, l], j) => ({ s, l, d: start + m.steps[j] }));
    } else {
      const rh = pick(RHYTHMS[kind] || RHYTHMS.verse);
      let x = near(tones(c), prev + (r() < 0.5 ? 1 : -1)), dir = x > center ? -1 : 1;
      const first = x, st = [];
      notes = rh.map(([s, l], j) => {
        if (j > 0) {
          if (r() < 0.3) dir = -dir;
          const strong = s % 2 === 0;
          x = strong ? near(tones(c), x + dir) : x + dir * (r() < 0.75 ? 1 : 2);
          if (x > center + 5) { x -= 2; dir = -1; }
          if (x < center - 4) { x += 2; dir = 1; }
        }
        st.push(x - first);
        return { s, l, d: x };
      });
      motifs[role] = { rh, steps: st };
    }
    // keep it in range: a whole bar moves by an octave
    const hi = Math.max(...notes.map((q) => q.d)), lo = Math.min(...notes.map((q) => q.d));
    if (hi > center + n) notes.forEach((q) => { q.d -= n; });
    else if (lo < center - n) notes.forEach((q) => { q.d += n; });
    prev = notes[notes.length - 1].d;
    bars.push(notes);
  }
  return bars;
}

// ---------- a song as a MIDI file ----------
// The same song the player plays — the same form, chords, composed melody
// (the same seed), bass, arp and drums — written as a Standard MIDI File
// (format 1, 480 ticks a beat): a track per part, General MIDI programs
// close to the sounds, the drums on channel 10. Parts whose layer is at 0
// are left out. Chance (the bells, the arp's gaps, the pickup kicks) is
// rolled again, so those can differ from what was heard.
const GM = {
  leadVoice: { synth: 81, soft: 73, piano: 0 },          // lead 2 (saw), flute, piano
  padVoice: { saw: 90, brass: 62, organ: 19, glass: 92 }, // polysynth pad, synth brass, church organ, bowed pad
  bellVoice: { fm: 14, piano: 0 },                        // tubular bells, piano
  arpMode: { chord: 46, ostinato: 80, bass16: 38 },       // harp, square lead, synth bass
};
function degreeIn(d, base, st) {
  const n = st.length, o = Math.floor(d / n), i = ((d % n) + n) % n;
  return base + o * 12 + st[i];
}
function songRng(p) { return rng(p.seed * 7919 + Object.keys(SONGS).indexOf(p.song) * 101 + 1); }
function songMidi(paramsIn) {
  const p = clone(paramsIn), def = SONGS[p.song];
  if (!def) return null;
  const st = (SCALES[p.scale] || SCALES.aeolian).steps, n = st.length, root = 36 + p.root, lv = p.levels, Q = 480;
  const r = songRng(p), mel = { verse: composeMelody("verse", def.prog.verse, def.chordBars, r, n), chorus: composeMelody("chorus", def.prog.chorus, def.chordBars, r, n) };
  const motif = MOTIFS[Math.floor(rng(p.seed)() * MOTIFS.length)], chance = rng(p.seed + 17);
  const T = { lead: [], pads: [], bass: [], arp: [], bells: [], drums: [] };
  const note = (tr, beat, len, m, vel) => { if (m < 0 || m > 127) return; T[tr].push([Math.round(beat * Q), Math.max(1, Math.round(len * Q)), m, vel]); };
  const drum = (beat, m, vel) => note("drums", beat, 0.1, m, Math.max(1, Math.min(127, Math.round(vel))));
  let at = 0, chord = [], progStep = 0, padNotes = [];
  def.form.forEach(([sec, bars], si) => {
    const arr = Object.assign({}, ARRANGE[sec], def.arrange[sec]), prog = def.prog[sec] || def.prog.verse;
    const nx = def.form[si + 1], nextArr = nx ? Object.assign({}, ARRANGE[nx[0]], def.arrange[nx[0]]) : null;
    for (let b = 0; b < bars * 4; b++) {
      const t = at + b, pb = b % 4, bar = Math.floor(b / 4);
      if (pb === 0 && bar % def.chordBars === 0) {
        const d = prog[Math.floor(bar / def.chordBars) % prog.length] % n, tones = [d, d + 2, d + 4];
        if (def.sevenths) tones.push(d + 6);
        chord = tones.map((x) => degreeIn(x, root + 12, st)); progStep++;
        if (arr.pads && lv.pads > 0.01) { padNotes = []; chord.slice(0, 4).forEach((m) => { note("pads", t, def.chordBars * 4, m, 70); padNotes.push(T.pads[T.pads.length - 1]); }); }
      }
      if (pb === 0) {
        if (arr.crash && bar === 0 && lv.beat > 0.01) drum(t, 49, 100);
        if (arr.lead && lv.lead > 0.01) mel[arr.lead][bar % mel[arr.lead].length].forEach((q) => note("lead", t + q.s, q.l * 0.92, degreeIn(q.d, root + 24, st), 100));
      }
      // drums
      const rollIn = bar === bars - 1 && pb >= 2 && nextArr && nextArr.drums && lv.beat > 0.01;
      if (rollIn) {
        if (pb === 2) drum(t, 36, 110);
        for (let k = 0; k < 4; k++) drum(t + k / 4, 38, 127 * (0.3 + 0.08 * ((pb - 2) * 4 + k)));
      } else if (arr.drums && lv.beat > 0.01) {
        const sty = arr.drums;
        if (sty === "half") { if (pb === 0) drum(t, 36, 110); if (pb === 2) drum(t, 38, 110); drum(t, 42, 45); drum(t + 0.5, 42, 75); }
        else if (sty === "light") { if (pb === 0) drum(t, 36, 95); if (pb === 2) drum(t, 36, 70); drum(t + 0.5, 42, 80); }
        else {
          if (pb === 0 || pb === 2) drum(t, 36, 115);
          if (pb === 2 && chance() < p.density * 0.35) drum(t + 0.5, 36, 95);
          if (pb === 1 || pb === 3) drum(t, 38, 115);
          drum(t, 42, 65); drum(t + 0.5, 42, 100);
          if (sty === "full16") { drum(t + 0.25, 42, 40); drum(t + 0.75, 42, 40); }
        }
      }
      // bass
      if (arr.bass && lv.bass > 0.01) {
        const rb = chord[0] - 12;
        if (arr.bass === "pulse16") [0, 0, 12, 0].forEach((o, k) => note("bass", t + k / 4, 0.21, rb + o, 100));
        else if (arr.bass === "half") { if (pb === 0) note("bass", t, 1.9, rb, 100); if (pb === 2) note("bass", t, 1.9, chord[2] - 12, 95); }
        else { note("bass", t, 0.42, rb, 100); note("bass", t + 0.5, 0.42, pb === 3 ? rb + 12 : rb, 90); }
      }
      // arp
      if (arr.arp && lv.arp > 0.01) {
        if (p.arpMode === "bass16") [0, 0, 12, 0].forEach((o, k) => note("arp", t + k / 4, 0.21, chord[0] - 12 + o, 95));
        else if (p.arpMode === "ostinato") {
          const round = Math.floor((progStep - 1) / 4);
          for (let k = 0; k < 2; k++) {
            const m = chord[motif[(b * 2 + k) % motif.length] % chord.length] + 12;
            note("arp", t + k / 2, 0.45, m, 80);
            if (round % 2 === 1 || p.density > 0.85) note("arp", t + k / 2, 0.4, m + 12, 60);
          }
        } else {
          const pat = [0, 1, 2, 1, 3 % chord.length, 2, 1, 2];
          for (let k = 0; k < 2; k++) if (chance() < 0.4 + p.density * 0.6) note("arp", t + k / 2, 0.45, chord[pat[(b * 2 + k) % pat.length] % chord.length] + 12, 75);
        }
      }
      // bells
      if (arr.bells && lv.bells > 0.01 && chance() < 0.15) {
        const pool = chord.concat(chord.map((m) => m + 12));
        note("bells", t + chance() * 0.5, 2, pool[Math.floor(chance() * pool.length)] + (p.bellVoice === "piano" ? 0 : 12), 70);
      }
    }
    at += bars * 4;
  });
  // the last chord rings out
  padNotes.forEach((e) => { e[1] += 6 * Q; });

  // ---- the file ----
  const u32 = (v) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
  const vlq = (v) => { const out = [v & 0x7f]; while ((v >>>= 7)) out.unshift((v & 0x7f) | 0x80); return out; };
  const text = (type, str) => { const bytes = Array.from(str, (c) => c.charCodeAt(0) & 0x7f); return [0xff, type, ...vlq(bytes.length), ...bytes]; };
  function chunk(events) {
    events.sort((x, y) => x[0] - y[0] || x[2] - y[2]);
    const data = []; let last = 0;
    events.forEach(([tk, bytes]) => { data.push(...vlq(tk - last), ...bytes); last = tk; });
    data.push(0, 0xff, 0x2f, 0);
    return [0x4d, 0x54, 0x72, 0x6b, ...u32(data.length), ...data];
  }
  const usPerBeat = Math.round(60000000 / p.tempo);
  const tracks = [chunk([
    [0, text(0x03, def.name + " (GameLaboratory, MusicKit)"), -1],
    [0, [0xff, 0x51, 3, (usPerBeat >> 16) & 255, (usPerBeat >> 8) & 255, usPerBeat & 255], -1],
    [0, [0xff, 0x58, 4, 4, 2, 24, 8], -1],
  ])];
  const parts = [["lead", "Melody", 0, GM.leadVoice[p.leadVoice]], ["pads", "Pads", 1, GM.padVoice[p.padVoice]], ["bass", "Bass", 2, 38],
    ["arp", "Arp", 3, p.pluckVoice === "strings" && p.arpMode !== "bass16" ? 24 : GM.arpMode[p.arpMode]], ["bells", "Bells", 4, GM.bellVoice[p.bellVoice]], ["drums", "Drums", 9, 0]];
  parts.forEach(([key, name, ch, prog]) => {
    if (!T[key].length) return;
    const ev = [[0, text(0x03, name), -1]];
    if (ch !== 9) ev.push([0, [0xc0 | ch, prog || 0], -1]);
    T[key].forEach(([tk, len, m, vel]) => { ev.push([tk, [0x90 | ch, m, vel], 1]); ev.push([tk + len, [0x80 | ch, m, 0], 0]); });
    tracks.push(chunk(ev));
  });
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, (tracks.length >> 8) & 255, tracks.length & 255, (Q >> 8) & 255, Q & 255];
  return new Uint8Array(head.concat(...tracks));
}

export { composeMelody, songRng, songMidi };
