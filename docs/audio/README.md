# Dźwięk silnika (`js/audio/`)

Dźwięk bez plików: wszystko powstaje na żywo w Web Audio. Jeden mikser dla gier, edytora sceny i laboratoriów;
trzy kity robią dźwięki. Laboratoria — grupa dźwięku (przełącznik na pasku): muzyka
([`../labs/sound.md`](../labs/sound.md)) · efekty i otoczenie ([`../labs/sound-effects.md`](../labs/sound-effects.md))
· mowa ([`../labs/sound-speech.md`](../labs/sound-speech.md)).

| Plik | Co robi |
|---|---|
| `mixer.js` | mikser silnika: jeden kontekst, szyny, głośności gracza, dźwięk przestrzenny, nagrywanie |
| `musickit/musickit.js` | MusicKit — muzyka (nastroje, muzyka ambientowa, piosenki) |
| `sfx/sfxkit.js` | SfxKit — efekty (wybuchy, strzały, woda, uderzenia, ptaki…), dźwięki ciągłe, tła miejsc |
| `voice/voicekit.js` | VoiceKit — mowa: synteza przeglądarki, głos z formantów, szept, efekty głosu |

## Mikser (`mixer.js`)

```
music ─┐
ambience ─┤
sfx ───┼─► master (kompresor) ─► głośność ogólna × wyciszenie ─► głośniki (+ strumień do nagrań)
voice ─┘
```

- `mixer()` — wspólny mikser (tworzony raz); kontekst (`ctx`) powstaje przy pierwszym użyciu, a przeglądarka gra
  dopiero po geście — mikser sam wznawia kontekst przy pierwszym kliknięciu albo klawiszu (`unlock()` — wprost).
- `bus('music' | 'ambience' | 'sfx' | 'voice')` — wejście szyny; `setVolumes({ master, music, ambience, sfx, voice,
  mute })`; `bindSettings(store)` — głośności z ustawień gracza na żywo; `level(szyna)` — poziom do mierników.
- Dźwięk przestrzenny: `listen(pos, fwd, up)` — słuchacz (kamera; ▶ Graj edytora ustawia go co klatkę),
  `at(pos, szyna)` — źródło w miejscu (PannerNode, HRTF, odległość odwrotna; jak w aTrain), `move(źródło, pos)`.
- `noise()` — wspólny bufor szumu; `stream` — strumień całości (MediaRecorder).

**Ustawienia gracza:** `settings.audio` w `js/core/settings.js` (master, music, ambience, sfx, voice 0…1, mute) —
gotowy ekran Opcji **Dźwięk** UI gry (`screens: { audio: 'standard' }`, obok Grafiki i Sterowania). Okno **Mikser**
w laboratoriach dźwięku (`js/labs/shared/mixer-window.js`) zmienia te same ustawienia i pokazuje poziomy szyn.

## Kity na mikserze

- **MusicKit** — `MusicKit.create({ params, ctx: mixer().ctx, out: mixer().bus('music'), mixer })` gra przez szynę
  muzyki (bez tych pól — własny kontekst, jak dawniej). Warstwy głosu robota i szeptów — z VoiceKit.
- **SfxKit** — `play(opis, { at })` (szyna efektów), `start(opis)` (szyna otoczenia), `ambience(tło)`.
- **VoiceKit** — `say(ctx, mixer().bus('voice'), tekst, głos, { mix })`; mowa przeglądarki gra poza grafem Web Audio,
  więc jej głośność to szyna mowy × ogólna (bez efektów, nie do nagrania).

## Zasoby z nazwą (`js/scene/assets.js`)

`sound` (efekt: `{ sound, params, gain }`), `ambience` (tło: `{ layers }`), `voice` (głos VoiceKit) — z laboratoriów
efektów i mowy. `sound` i `ambience` — w scenie jako dźwięk przy obiekcie (pole `sound`); `voice` scena jeszcze nie używa.

## Dźwięk w scenie (`js/scene/sounds.js`)

Źródła przy obiektach (pole `sound`), silniki pojazdów z zachowań, strzały, wybuchy i efekty — w miejscu, słuchacz to
kamera ▶ Graj. Opis: [`../scene/README.md`](../scene/README.md#dźwięk-w-scenie-soundsjs). SfxKit: `start` i `ambience`
w miejscu mają `move(at)` (źródło idzie za obiektem), `ref` — odległość pełnej głośności.
