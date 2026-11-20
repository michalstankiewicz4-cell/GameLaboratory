// Laboratorium mowy (labs/sound-speech.html): VoiceKit (js/audio/voice/voicekit.js) przez mikser silnika (szyna mowy,
// js/audio/mixer.js). Okna: Tekst (tekst i gotowe kwestie), Głos (rodzaj: mowa przeglądarki, głos syntetyczny, szept;
// język, głos, tempo, wysokość; wysokość głosu, krtań, tempo, intonacja, oddech; zapis — zasób „voice”), Efekty głosu
// (radio, robot, echo, odległość; nagranie), Mikser, Opis (JSON). Obraz dźwięku w środku. Dla AI: VoiceApi.
import { mixer } from '../../audio/mixer.js';
import { say, silence, voices, normalizeVoice, VOICE_PRESETS } from '../../audio/voice/voicekit.js';
import { mixerWindow } from '../shared/mixer-window.js';
import { soundView } from '../shared/sound-view.js';
import { listAssets, getAsset, saveAsset, removeAsset, onAssetsChange } from '../../scene/assets.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const KEY = 'gameLab.speech.v1';
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const L = { src: 'preset:villager', voice: null, text: 'Hello, traveller. The bridge is closed today. Will you take the long way round?', ...(saved || {}) };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch { /* prywatny tryb */ } };
const status = (s) => { $('status').textContent = s || ''; };
let voice = normalizeVoice(L.voice || VOICE_PRESETS.villager), current = null;

mixerWindow($('mixerBox'));
soundView($('view'), { hint: 'SAY SOMETHING|a voice made live, here, from code' });

const LINES = ['Hello, traveller. The bridge is closed today.', 'Procedure ready. Orbit stable.', 'Dzień dobry! Gdzie jest dworzec?', 'Watch out! They are coming!', 'Are you sure about that?', 'Signal lost. Repeat, signal lost.'];
const LANGS = [['pl-PL', 'Polski'], ['en-GB', 'English (UK)'], ['en-US', 'English (US)'], ['de-DE', 'Deutsch'], ['fr-FR', 'Français'], ['es-ES', 'Español'], ['it-IT', 'Italiano'], ['uk-UA', 'Українська'], ['ja-JP', '日本語']];
LANGS.forEach(([v, n]) => $('lang').append(new Option(n, v)));
$('lines').replaceChildren(...LINES.map((t) => { const b = el('button', { type: 'button', textContent: t.length > 26 ? t.slice(0, 24) + '…' : t, title: t }); b.onclick = () => { $('text').value = t; L.text = t; save(); speakNow(); }; return b; }));

function fillPresets() {
  const s = $('preset'); s.replaceChildren();
  const g1 = el('optgroup', { label: 'Ready' }); Object.entries(VOICE_PRESETS).forEach(([id, p]) => g1.append(new Option(p.label, 'preset:' + id))); s.append(g1);
  const names = listAssets('voice'); if (names.length) { const g2 = el('optgroup', { label: 'Saved' }); names.forEach((n) => g2.append(new Option(n, 'asset:' + n))); s.append(g2); }
  s.value = L.src; if (s.value !== L.src) s.value = '';
}
function fillVoices() {
  const vs = voices(voice.lang), s = $('voiceSel');
  s.replaceChildren(new Option(vs.length ? '(the first for this language)' : '(no voice for this language — the system default)', ''), ...vs.map((v) => new Option(`${v.name}${v.localService ? '' : ' (online)'}`, v.name)));
  s.value = voice.voice; if (s.value !== voice.voice) s.value = '';
}
if (typeof speechSynthesis !== 'undefined') speechSynthesis.addEventListener('voiceschanged', fillVoices);
const NUM = [['rate', 2], ['pitch', 2], ['hz', 0, ' Hz'], ['size', 2], ['speed', 2], ['melody', 2], ['breath', 2]];
const FX = [['fxRadio', 'radio'], ['fxRobot', 'robot'], ['fxEcho', 'echo'], ['fxFar', 'far']];
function show() {
  $('mode').value = voice.mode; $('lang').value = voice.lang;
  $('speechBox').hidden = voice.mode !== 'speech'; $('formantBox').hidden = voice.mode === 'speech';
  for (const id of ['hz', 'size', 'melody', 'breath']) $(id).closest('.row').hidden = voice.mode === 'whisper';
  for (const [k, d, u] of NUM) { $(k).value = voice[k]; $(k + 'V').textContent = (+voice[k]).toFixed(d) + (u || ''); }
  for (const [id, k] of FX) { $(id).value = voice.fx[k]; $(id + 'V').textContent = Math.round(voice.fx[k] * 100) + ' %'; $(id).disabled = voice.mode === 'speech'; }
  $('rec').disabled = voice.mode === 'speech';
  $('name').value = L.src.startsWith('asset:') ? L.src.slice(6) : '';
  $('jsonText').value = JSON.stringify(voice, null, 1);
  fillVoices();
}
const changed = () => { voice = normalizeVoice(voice); L.voice = voice; save(); $('jsonText').value = JSON.stringify(voice, null, 1); };
for (const [k, d, u] of NUM) $(k).oninput = () => { voice[k] = +$(k).value; $(k + 'V').textContent = (+$(k).value).toFixed(d) + (u || ''); changed(); };
for (const [id, k] of FX) $(id).oninput = () => { voice.fx[k] = +$(id).value; $(id + 'V').textContent = Math.round(voice.fx[k] * 100) + ' %'; changed(); };
$('mode').onchange = () => { voice.mode = $('mode').value; changed(); show(); };
$('lang').onchange = () => { voice.lang = $('lang').value; voice.voice = ''; changed(); fillVoices(); };
$('voiceSel').onchange = () => { voice.voice = $('voiceSel').value; changed(); };
$('preset').onchange = () => {
  const v = $('preset').value; L.src = v;
  voice = normalizeVoice(v.startsWith('asset:') ? getAsset('voice', v.slice(6)) || {} : VOICE_PRESETS[v.slice(7)]); L.voice = voice; save(); show();
};
$('text').value = L.text; $('text').oninput = () => { L.text = $('text').value; save(); };

/* ---------------- mówienie ---------------- */
function speakNow() {
  const mx = mixer(); mx.unlock();
  if (current) current.stop();
  const text = $('text').value.trim(); if (!text) { status('Write something to say.'); return null; }
  current = say(mx.ctx, mx.bus('voice'), text, voice, { mix: mx });
  status(voice.mode === 'speech' ? 'speaking (browser speech)' : `speaking · ${(current.end - mx.ctx.currentTime).toFixed(1)} s`);
  return current;
}
$('say').onclick = speakNow;
$('hush').onclick = () => { silence(); if (current) current.stop(); current = null; status('quiet'); };
addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); speakNow(); } });

// nagranie następnej kwestii (głos syntetyczny i szept: wyjście miksera)
$('rec').onclick = () => {
  const mx = mixer(); mx.unlock();
  const chunks = [], rec = new MediaRecorder(mx.stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '' });
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, { type: 'audio/webm' })); a.download = `voice-${voice.mode}-${Date.now()}.webm`; a.click(); $('recState').textContent = 'Saved: ' + a.download; setTimeout(() => URL.revokeObjectURL(a.href), 5000); };
  rec.start(250); $('recState').textContent = 'Recording…';
  const c = speakNow(); const ms = c && c.end ? (c.end - mx.ctx.currentTime + 1.2) * 1000 : 3000;
  setTimeout(() => rec.stop(), ms);
};

/* ---------------- zapis i opis ---------------- */
$('save').onclick = () => { const n = $('name').value.trim(); if (!n) { status('Give the voice a name first.'); return; } saveAsset('voice', n, { ...voice, label: n }); L.src = 'asset:' + n; save(); fillPresets(); status(`Saved: ${n} (asset "voice").`); };
$('del').onclick = () => { if (!L.src.startsWith('asset:')) { status('A ready voice cannot be deleted.'); return; } removeAsset('voice', L.src.slice(6)); L.src = 'preset:villager'; save(); fillPresets(); $('preset').onchange(); };
onAssetsChange(fillPresets);
$('jsonApply').onclick = () => { try { voice = normalizeVoice(JSON.parse($('jsonText').value)); L.voice = voice; L.src = ''; save(); show(); fillPresets(); $('jsonMsg').textContent = 'Applied.'; } catch (e) { $('jsonMsg').textContent = 'Not applied: ' + e.message; } };
$('jsonCopy').onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(voice, null, 1)); $('jsonMsg').textContent = 'Copied.'; } catch { $('jsonMsg').textContent = 'Copy it from the box.'; } };

/* ---------------- dla AI ---------------- */
// VoiceApi: say(tekst, głos?) — powiedz (głos: opis VoiceKit albo bieżący); voice — bieżący opis; presets; voices(język)
// — głosy przeglądarki; save(nazwa) — zasób „voice”
window.VoiceApi = {
  say: (text, v) => { if (v) { voice = normalizeVoice(v); show(); } $('text').value = String(text); const c = speakNow(); return c && c.end ? { seconds: +(c.end - mixer().ctx.currentTime).toFixed(2) } : { browser: true }; },
  get voice() { return { ...voice, fx: { ...voice.fx } }; },
  presets: Object.fromEntries(Object.entries(VOICE_PRESETS).map(([k, p]) => [k, p.label])),
  voices: (lang) => voices(lang).map((v) => ({ name: v.name, lang: v.lang })),
  save: (n) => { saveAsset('voice', String(n), { ...voice, label: String(n) }); fillPresets(); return true; },
};
function apiTab() {
  if (!window.LabConsole) return;
  const box = el('div', { className: 'sndApi' }), ta = el('textarea', { className: 'mono', rows: 3, spellcheck: false });
  ta.value = JSON.stringify({ text: 'Halt! Who goes there?', voice: { mode: 'formant', hz: 95, size: 1.3, fx: { radio: 0.8 } } });
  const out = el('p', { className: 'note', textContent: '{ text, voice } as JSON.' }), go = el('button', { type: 'button', textContent: 'Say (VoiceApi.say)' });
  go.onclick = () => { try { const j = JSON.parse(ta.value); out.textContent = JSON.stringify(window.VoiceApi.say(j.text, j.voice)); } catch (e) { out.textContent = 'Error: ' + e.message; } };
  box.append(ta, go, out); window.LabConsole.addTab({ id: 'voiceapi', title: 'API', titlePl: 'API', el: box });
}
if (window.LabConsole) apiTab(); else addEventListener('load', apiTab);

fillPresets(); show();
window.__speech = { get voice() { return voice; }, mixer: mixer() };
