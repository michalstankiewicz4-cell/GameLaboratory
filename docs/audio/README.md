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
| `rail-sounds.js` | dźwięk szyn: zdarzenia akustyczne fizyki „koło na szynie” (styk, podkład, sprzęg, łańcuch, zderzak), toczenie, pisk obrzeży |
| `model-sounds.js` | słuchanie modeli: zdarzenia dźwięku modelu (`onSound`) grane przez SfxKit w miejscu części |

## Mikser (`mixer.js`)

```
music ─┐
ambience ─┤
sfx ───┼─► master (kompresor) ─► głośność ogólna × wyciszenie ─► głośniki (+ strumień do nagrań)
voice ─┤
ui ────┘
```

- `mixer()` — wspólny mikser (tworzony raz); kontekst (`ctx`) powstaje przy pierwszym użyciu, a przeglądarka gra
  dopiero po geście — mikser sam wznawia kontekst przy pierwszym kliknięciu albo klawiszu (`unlock()` — wprost).
- `bus('music' | 'ambience' | 'sfx' | 'voice' | 'ui')` — wejście szyny (`ui` — dźwięki interfejsu gry, `js/gameui/sounds.js`);
  `setVolumes({ master, music, ambience, sfx, voice, ui, mute })`; `bindSettings(store)` — głośności z ustawień gracza na żywo; `level(szyna)` — poziom do mierników.
- Dźwięk przestrzenny: `listen(pos, fwd, up)` — słuchacz (kamera; ▶ Graj edytora ustawia go co klatkę),
  `at(pos, szyna)` — źródło w miejscu (PannerNode, HRTF, odległość odwrotna; jak w aTrain), `move(źródło, pos)`.
- `noise()` — wspólny bufor szumu; `stream` — strumień całości (MediaRecorder).

**Ustawienia gracza:** `settings.audio` w `js/core/settings.js` (master, music, ambience, sfx, voice, ui 0…1, mute) —
gotowy ekran Opcji **Dźwięk** UI gry (`screens: { audio: 'standard' }`, obok Grafiki i Sterowania). Okno **Mikser**
w laboratoriach dźwięku (`js/labs/shared/mixer-window.js`) zmienia te same ustawienia i pokazuje poziomy szyn.

## Kity na mikserze

- **MusicKit** — `MusicKit.create({ params, ctx: mixer().ctx, out: mixer().bus('music'), mixer })` gra przez szynę
  muzyki (bez tych pól — własny kontekst, jak dawniej). Warstwy głosu robota i szeptów — z VoiceKit.
- **SfxKit** — `play(opis, { at })` (szyna efektów), `start(opis)` (szyna otoczenia), `ambience(tło)`.
- **VoiceKit** — `say(ctx, mixer().bus('voice'), tekst, głos, { mix })`; mowa przeglądarki gra poza grafem Web Audio,
  więc jej głośność to szyna mowy × ogólna (bez efektów, nie do nagrania).

## Dźwięki modeli (`js/models/shared/sound-events.js`, `model-sounds.js`)

Model nie gra dźwięku — nie wie, gdzie jest ani czy ktoś słucha (zasada modeli). Zgłasza zdarzenie, jak strzał
(ShipKit `onShot`): „ta część rusza, tutaj”. Gra ten, kto słucha — laboratorium, edytor sceny, gra.

- Model: `const snd = soundChannel(info.sounds)`; ruch części 0…1 — `snd.motion('door', część).step(cel, stan)` co
  klatkę zgłasza `door-open` (rusza w stronę 1), `door-close` (w stronę 0), `door-opened` (doszło do 1), `door-shut`
  (doszło do 0); pojedyncze zdarzenie — `snd.emit(id, część)`. Na końcu `withSound(model, snd)`: model dostaje
  `onSound` (słuchacz) i `sounds` (opisy z danych).
- Dane modelu (`info.sounds`): `{ '<id zdarzenia>': { sound: id SfxKit, params, gain?, ref? }, engine: { cylinders,
  idle, redline } | { electric: true } }` — które zdarzenia mają dźwięk i jaki; `engine` — silnik dla zachowań
  (`js/scene/sounds.js`). Zdarzenie bez opisu jest ciche.
- Słuchacz: `hearModel(model)` (`js/audio/model-sounds.js`) gra opis przez SfxKit w miejscu części; edytor sceny —
  w ▶ Graj (`world.onSound` → `sounds.model`).

| Model | Zdarzenia z dźwiękiem | Silnik |
|---|---|---|
| FSO Polonez | drzwi kierowcy: zamek przy otwarciu, trzaśnięcie po zamknięciu | 4 cyl., 850–5600 obr/min |
| Solaris Urbino 18 | drzwi: syk pneumatyki przy otwieraniu i zamykaniu | elektryczny |
| M1A2 Abrams | właz dowódcy: zamek, ciężkie dobicie | turbina gazowa (`size: 0.15`) |
| Spitfire | podwozie: hydraulika i blokada w końcu ruchu; klapy; owiewka | V12, 900–3000 |
| ORP Błyskawica, ORP Orzeł | — | turbina parowa (`kind: 'turbine'`, `size: 1`), 8 cyl. (diesle) |
| barka (MarineKit) / nurek, łaziki (VehicleKit) | — | 6 cyl. / elektryczny |

Część robocza modelu (`info.work`: drzwi, właz, owiewka, rampa) jest w ▶ Graj akcją **work** (klawisze 1…9, API `act`)
zachowań jazdy, lotu i małej jednostki. Laboratorium pojazdów lądowych słucha modeli (przycisk części roboczej,
podwozie, klapy).

## Dźwięk zachowań i szyn

- **Zachowanie z dźwiękiem** (`run.sound()` → `{ loops: [{ key, sound, params, level }], shots: [{ sound, params }] }`):
  dźwięk sceny gra dźwięki ciągłe po kluczu (poziom 0 — cisza) i jednorazowe w miejscu obiektu. Maszyny złomowiska
  (`m.sound()`): zgniatarki (agregat `pump`, `crunch`, dobicie), piec na papier (`fire`), piec indukcyjny (`hum` cewki,
  `pump` przechyłu, `fire` wylewu), linia odlewnicza (`hum` przenośnika, stuki); przeładowarka (`pump`, szczęki, ładunek).
- **Szyny** (`createRailSounds().listen(sim, kroki)` — `sim.listen` w `js/behaviors/rail/rail.js` albo po krokach
  tramwaju): zdarzenia fizyki z aTrain → `impact` (styk, zderzak — ciężki; podkład — drewno; sprzęg — metal; łańcuch),
  `rail` (toczenie, bez własnych stuków), `squeal` z mocy tarcia obrzeży (`b.flangeP`). W laboratorium pojazdów lądowych.

## Muzyka w scenie (`js/scene/music.js`)

Środowisko sceny: **Muzyka** (`env.music`) gra w ▶ Graj na szynie muzyki; **Muzyka akcji** (`env.musicAction`,
nieobowiązkowa) zastępuje ją po głośnym zdarzeniu — wybuchu, strzale, piorunie, rozbiciu (`sounds.js` `onLoud`) —
i ustępuje po 20 s spokoju (`ACTION_HOLD`). Nazwa: `mood:<id>` (nastrój MusicKit), `song:<id>` (piosenka) albo
zasób **music** — ustawienia zapisane w laboratorium muzyki (okno Instruments and voice → SAVE FOR THE SCENE).
API: `env { music, musicAction }`, w grze `music { play }` i `music { action: true }`; lekarz sceny zgłasza brakującą
muzykę.

## Zasoby z nazwą (`js/scene/assets.js`)

`sound` (efekt: `{ sound, params, gain }`), `ambience` (tło: `{ layers }`), `voice` (głos VoiceKit) — z laboratoriów
efektów i mowy. `sound` i `ambience` — w scenie jako dźwięk przy obiekcie (pole `sound`); `voice` scena jeszcze nie używa.

## Dźwięk w scenie (`js/scene/sounds.js`)

Źródła przy obiektach (pole `sound`), silniki pojazdów z zachowań, strzały, wybuchy i efekty — w miejscu, słuchacz to
kamera ▶ Graj. Opis: [`../scene/README.md`](../scene/README.md#dźwięk-w-scenie-soundsjs). SfxKit: `start` i `ambience`
w miejscu mają `move(at)` (źródło idzie za obiektem), `ref` — odległość pełnej głośności.
