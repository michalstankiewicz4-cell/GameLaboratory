# Laboratorium dźwięku · mowa (`labs/sound-speech.html`)

Głosy postaci gry bez nagrań. Kit: **VoiceKit** (`js/audio/voice/voicekit.js`); strona:
`js/labs/sound-speech/sound-speech.js`, arkusz `ui/pages/audio.css`. Gra przez szynę mowy miksera silnika
([`../audio/README.md`](../audio/README.md)). Grupa dźwięku: muzyka ([`sound.md`](sound.md)) · efekty
([`sound-effects.md`](sound-effects.md)) · mowa.

## Rodzaje głosu

- **Mowa przeglądarki** (`speech`) — synteza mowy systemu: prawdziwe słowa w wybranym języku (polski, angielski,
  niemiecki…), głos z listy przeglądarki, tempo, wysokość. Gra poza grafem Web Audio: bez efektów i nie do nagrania;
  głośność — szyna mowy × ogólna. To głos robota z MusicKit (przeniesiony tu, z historią).
- **Głos syntetyczny** (`formant`) — tekst czytany jako „mowa” postaci, jak w wielu grach: sylaby z tekstu,
  samogłoski — trzy formanty (rezonanse krtani), spółgłoski — szum (s, sz, f), zwarcia (p, t, k), nosówki (m, n, l);
  wysokość głosu (Hz), wielkość krtani (przesunięcie formantów: dziecko — olbrzym), tempo, intonacja (na końcu zdania
  w dół, przy pytaniu w górę; przecinek i kropka — przerwy), oddech.
- **Szept** (`whisper`) — szept bez słów z MusicKit (warstwa szeptów — przeniesiona tu): sylaby szumu przez formanty
  samogłosek; długość z tekstu.

**Efekty głosu** (syntetyczny i szept): radio (pasmo 300–3400 Hz, przester, szum), robot (modulacja pierścieniowa),
echo, odległość (przytłumienie). **Nagranie** następnej kwestii — plik .webm.

Gotowe głosy: narrator, robot stacji (mowa przeglądarki), wieśniak, dziecko, olbrzym, radiooperator, android, szept
ducha. Zapis pod nazwą — zasób **voice**: `{ mode, lang, voice, rate, pitch, hz, size, speed, melody, breath, fx }`.

## API dla AI

`window.VoiceApi`: `say(tekst, głos?)`, `voice`, `presets`, `voices(język)` (głosy przeglądarki), `save(nazwa)` →
zasób `voice`. Zakładka **API**: `{ text, voice }` jako JSON.
