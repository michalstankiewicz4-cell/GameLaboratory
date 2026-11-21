// MusicKit · dane: nuty, skale, warstwy, instrumenty, ustawienia domyślne, nastroje (PRESETS), piosenki (SONGS),
// rytmy melodii, figury ostinata i pomocnicze (losowanie z ziarnem, częstotliwość nuty). Bez Web Audio — czytają je
// odtwarzacz (musickit.js) i zapis MIDI (compose.js).

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SCALES = {
  aeolian: { name: "Minor (aeolian)", steps: [0, 2, 3, 5, 7, 8, 10] },
  dorian: { name: "Dorian", steps: [0, 2, 3, 5, 7, 9, 10] },
  lydian: { name: "Lydian (bright, floating)", steps: [0, 2, 4, 6, 7, 9, 11] },
  phrygian: { name: "Phrygian (dark)", steps: [0, 1, 3, 5, 7, 8, 10] },
  suspended: { name: "Suspended (pentatonic)", steps: [0, 2, 5, 7, 10] },
  hirajoshi: { name: "Hirajoshi (strange)", steps: [0, 2, 3, 7, 8] },
  ionian: { name: "Major (ionian)", steps: [0, 2, 4, 5, 7, 9, 11] },
  mixolydian: { name: "Mixolydian", steps: [0, 2, 4, 5, 7, 9, 10] },
};
const LAYERS = ["drone", "pads", "bells", "pulse", "arp", "texture", "whispers", "voice", "lead", "beat", "metal", "bass"];
// the instruments: what a layer sounds like
const VOICES = {
  padVoice: { saw: "Soft saws", brass: "Brass (80s)", organ: "Organ", glass: "Glass" },
  bellVoice: { fm: "FM chimes", piano: "Piano" },
  arpMode: { chord: "Plucks", ostinato: "Ostinato", bass16: "Bass, 16ths" },
  textureKind: { radio: "Radio static", rain: "Rain" },
  droneVoice: { warm: "Warm", dissonant: "Dissonant" },
  leadVoice: { synth: "Synth", soft: "Soft (flute)", piano: "Piano" },
  pluckVoice: { synth: "Synth", strings: "Strings (plucked)" },
};
const INSTRUMENTS = { padVoice: "saw", bellVoice: "fm", arpMode: "chord", textureKind: "radio", droneVoice: "warm", leadVoice: "synth", pluckVoice: "synth", progression: null, song: null };
const DEFAULTS = Object.assign({
  volume: 0.7, tempo: 60, density: 0.5, brightness: 0.45, space: 0.7, root: 2, scale: "aeolian", seed: 1,
  levels: { drone: 0.6, pads: 0.7, bells: 0.5, pulse: 0.25, arp: 0.25, texture: 0.3, whispers: 0.35, voice: 0.6, lead: 0, beat: 0, metal: 0, bass: 0 },
  voiceLines: ["Procedure ready.", "Life detected.", "Orbit stable.", "Swarm online.", "Signal lost.", "Memory: eleven percent."],
  voiceEvery: 45,
  warm: true,
}, INSTRUMENTS);
// a mood sets everything but the volume, the seed and the robot's lines
function mood(name, p) {
  const params = Object.assign({}, INSTRUMENTS, p);
  params.levels = Object.assign({ lead: 0, beat: 0, metal: 0, bass: 0 }, p.levels);
  return { name, params };
}
const PRESETS = {
  station: mood("The station", { tempo: 56, density: 0.4, brightness: 0.4, space: 0.65, root: 2, scale: "dorian",
    levels: { drone: 0.6, pads: 0.75, bells: 0.4, pulse: 0.35, arp: 0.15, texture: 0.35, whispers: 0.4, voice: 0.6 } }),
  orbit: mood("Deep orbit", { tempo: 50, density: 0.35, brightness: 0.5, space: 0.85, root: 9, scale: "lydian", pluckVoice: "strings",
    levels: { drone: 0.5, pads: 0.8, bells: 0.55, pulse: 0.1, arp: 0.2, texture: 0.25, whispers: 0.3, voice: 0.5 } }),
  descent: mood("Descent", { tempo: 72, density: 0.7, brightness: 0.6, space: 0.55, root: 4, scale: "aeolian",
    levels: { drone: 0.75, pads: 0.6, bells: 0.35, pulse: 0.5, arp: 0.5, texture: 0.5, whispers: 0.25, voice: 0.6 } }),
  abyss: mood("The black hole", { tempo: 44, density: 0.3, brightness: 0.25, space: 1, root: 1, scale: "phrygian",
    levels: { drone: 0.85, pads: 0.55, bells: 0.25, pulse: 0.2, arp: 0, texture: 0.55, whispers: 0.5, voice: 0.4 } }),
  // 80s sci-fi noir: slow brass swells, a lonely lead, piano drops, rain, a huge room
  neon: mood("Neon rain", { tempo: 62, density: 0.45, brightness: 0.55, space: 0.95, root: 5, scale: "aeolian",
    padVoice: "brass", bellVoice: "piano", textureKind: "rain", progression: [0, 5, 3, 4],
    levels: { drone: 0.45, pads: 0.8, bells: 0.3, pulse: 0, arp: 0, texture: 0.5, whispers: 0.1, voice: 0.4, lead: 0.55 } }),
  // an organ and a repeating figure that grows (an octave joins every other round)
  cathedral: mood("Cathedral of stars", { tempo: 72, density: 0.6, brightness: 0.5, space: 0.9, root: 9, scale: "aeolian",
    padVoice: "organ", arpMode: "ostinato", progression: [0, 5, 2, 6],
    levels: { drone: 0.35, pads: 0.75, bells: 0.12, pulse: 0, arp: 0.55, texture: 0.12, whispers: 0.1, voice: 0.3 } }),
  // ambient piano: few notes, lots of air
  orbits: mood("Music for orbits", { tempo: 54, density: 0.3, brightness: 0.4, space: 1, root: 5, scale: "lydian",
    padVoice: "glass", bellVoice: "piano",
    levels: { drone: 0.25, pads: 0.45, bells: 0.75, pulse: 0, arp: 0, texture: 0.1, whispers: 0, voice: 0.25 } }),
  // synthwave: a driving bass, drums, brass chords, a bright lead
  nightdrive: mood("Night drive", { tempo: 104, density: 0.6, brightness: 0.65, space: 0.6, root: 4, scale: "aeolian",
    padVoice: "brass", arpMode: "bass16", progression: [0, 5, 3, 6],
    levels: { drone: 0.15, pads: 0.5, bells: 0.1, pulse: 0, arp: 0.6, texture: 0.1, whispers: 0, voice: 0.3, lead: 0.5, beat: 0.65 } }),
  // space horror: a dissonant drone, metal in the dark, voices, no tune
  derelict: mood("Derelict", { tempo: 40, density: 0.5, brightness: 0.3, space: 1, root: 1, scale: "phrygian",
    droneVoice: "dissonant",
    levels: { drone: 0.8, pads: 0, bells: 0.1, pulse: 0.15, arp: 0, texture: 0.6, whispers: 0.55, voice: 0.35, metal: 0.6 } }),
};
// ---------- SONGS ----------
// What plays in each kind of section (a song's `arrange` overrides it):
//   pads, arp, bells: on / off;  bass: "root8" | "pulse16" | "half" | "";
//   drums: "full" | "full16" | "half" | "light" | "";  lead: "verse" | "chorus" | "";
//   crash: a cymbal on the section's first beat
const ARRANGE = {
  intro: { pads: 1, arp: 1, bells: 1, bass: "half", drums: "", lead: "" },
  verse: { pads: 1, arp: 0, bells: 0, bass: "root8", drums: "light", lead: "verse" },
  chorus: { pads: 1, arp: 1, bells: 0, bass: "root8", drums: "full", lead: "chorus", crash: 1 },
  bridge: { pads: 1, arp: 1, bells: 1, bass: "half", drums: "half", lead: "" },
  outro: { pads: 1, arp: 1, bells: 1, bass: "half", drums: "", lead: "" },
};
const FORM = [["intro", 4], ["verse", 8], ["chorus", 8], ["verse", 8], ["chorus", 8], ["bridge", 8], ["chorus", 8], ["outro", 4]];
// a song: a mood's sound + the progressions per section (scale degrees, a
// chord every chordBars bars; intro and outro play the verse's) + the form
function song(name, style, p, def) {
  return Object.assign({ name, style, params: mood(name, p).params, chordBars: 1, form: FORM, arrange: {} }, def);
}
const SONGS = {
  firstlight: song("First light", "Synth-pop", { tempo: 112, density: 0.6, brightness: 0.6, space: 0.55, root: 7, scale: "ionian",
    padVoice: "brass", leadVoice: "synth", pluckVoice: "strings",
    levels: { drone: 0, pads: 0.65, bells: 0.3, pulse: 0, arp: 0.45, texture: 0.05, whispers: 0, voice: 0, lead: 0.6, beat: 0.6, bass: 0.6 } },
  { prog: { verse: [0, 4, 5, 3], chorus: [3, 4, 0, 5], bridge: [5, 3, 0, 4] } }),
  neonheart: song("Neon heart", "80s ballad", { tempo: 76, density: 0.45, brightness: 0.5, space: 0.9, root: 5, scale: "aeolian",
    padVoice: "brass", leadVoice: "piano", textureKind: "rain",
    levels: { drone: 0.2, pads: 0.65, bells: 0.2, pulse: 0, arp: 0, texture: 0.3, whispers: 0, voice: 0, lead: 0.8, beat: 0.5, bass: 0.5 } },
  { chordBars: 2, prog: { verse: [0, 5, 3, 4], chorus: [3, 4, 0, 5], bridge: [5, 6, 3, 4] },
    arrange: { verse: { drums: "half", bass: "half" }, chorus: { drums: "half" } } }),
  highway: song("Midnight highway", "Synthwave", { tempo: 104, density: 0.6, brightness: 0.65, space: 0.6, root: 4, scale: "aeolian",
    padVoice: "brass", leadVoice: "synth",
    levels: { drone: 0, pads: 0.45, bells: 0.15, pulse: 0, arp: 0.35, texture: 0.05, whispers: 0, voice: 0, lead: 0.6, beat: 0.7, bass: 0.65 } },
  { chordBars: 2, prog: { verse: [0, 5, 3, 6], chorus: [5, 2, 6, 0], bridge: [3, 4, 5, 6] },
    arrange: { intro: { bass: "pulse16" }, verse: { bass: "pulse16", drums: "full" }, chorus: { bass: "pulse16", drums: "full16" }, bridge: { bass: "pulse16" } } }),
  lullaby: song("Orbit lullaby", "Piano", { tempo: 80, density: 0.4, brightness: 0.45, space: 0.85, root: 2, scale: "ionian",
    padVoice: "glass", bellVoice: "piano", leadVoice: "piano",
    levels: { drone: 0.15, pads: 0.5, bells: 0.35, pulse: 0, arp: 0, texture: 0.05, whispers: 0, voice: 0, lead: 0.95, beat: 0, bass: 0.4 } },
  { prog: { verse: [0, 5, 3, 4], chorus: [3, 0, 4, 5], bridge: [5, 3, 1, 4] },
    arrange: { verse: { bass: "half", drums: "" }, chorus: { bass: "half", drums: "", crash: 0 }, bridge: { drums: "" } } }),
  cathedral: song("Cathedral", "Organ", { tempo: 84, density: 0.6, brightness: 0.5, space: 0.9, root: 9, scale: "aeolian",
    padVoice: "organ", leadVoice: "soft", arpMode: "ostinato",
    levels: { drone: 0.2, pads: 0.7, bells: 0.1, pulse: 0, arp: 0.5, texture: 0.05, whispers: 0, voice: 0, lead: 0.6, beat: 0.35, bass: 0.45 } },
  { prog: { verse: [0, 5, 2, 6], chorus: [3, 0, 4, 0], bridge: [5, 6, 0, 4] },
    arrange: { verse: { arp: 1, drums: "", bass: "half" }, chorus: { drums: "half", bass: "half" } } }),
  escape: song("Escape velocity", "Drive", { tempo: 120, density: 0.65, brightness: 0.7, space: 0.5, root: 2, scale: "aeolian",
    padVoice: "saw", leadVoice: "synth",
    levels: { drone: 0, pads: 0.6, bells: 0.15, pulse: 0, arp: 0.5, texture: 0.05, whispers: 0, voice: 0, lead: 0.6, beat: 0.75, bass: 0.65 } },
  { prog: { verse: [0, 6, 5, 6], chorus: [5, 6, 0, 4], bridge: [3, 3, 5, 6] },
    arrange: { verse: { drums: "full" }, chorus: { drums: "full16" } } }),
};
// a melody's rhythms, one bar each: [start, length] in beats
const RHYTHMS = {
  verse: [[[0, 1], [1, 0.5], [1.5, 0.5], [2, 1], [3, 0.5], [3.5, 0.5]], [[0, 0.5], [0.5, 0.5], [1, 1], [2.5, 0.5], [3, 1]],
    [[0.5, 0.5], [1, 0.5], [1.5, 1], [2.5, 0.5], [3, 1]], [[0, 0.75], [0.75, 0.75], [1.5, 0.5], [2, 1], [3, 1]], [[0, 1], [1, 1], [2, 0.5], [2.5, 1.5]]],
  chorus: [[[0, 1.5], [1.5, 0.5], [2, 2]], [[0, 1], [1, 1], [2, 2]], [[0, 2], [2, 1], [3, 1]], [[0, 0.75], [0.75, 0.75], [1.5, 2.5]], [[0, 1], [1, 0.5], [1.5, 2.5]]],
  end: [[[0, 1], [1, 3]], [[0, 4]], [[0, 0.5], [0.5, 0.5], [1, 3]], [[0, 2], [2, 2]]],
};

// how much of a layer goes to the reverb (the rest: 1) — a kick in a cathedral is mush
const REVERB_SEND = { beat: 0.2, arp: 0.7 };
// the ostinato's figures (indices into the chord), one per piece (the seed)
const MOTIFS = [[0, 1, 2, 1, 0, 1, 2, 1], [0, 2, 1, 2, 0, 2, 1, 2], [2, 1, 0, 1, 2, 1, 0, 1], [0, 1, 2, 3, 2, 1, 2, 1]];

function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const clone = (o) => JSON.parse(JSON.stringify(o));

export { NOTES, SCALES, LAYERS, VOICES, INSTRUMENTS, DEFAULTS, PRESETS, ARRANGE, FORM, SONGS, RHYTHMS, REVERB_SEND, MOTIFS, mood, song, rng, hz, clone };
