# Przewodnik dla AI — jak pracować z GameLaboratory

GameLaboratory to przeglądarkowy silnik gier dla AI: laboratoria (edytory jednej części — modelu, środowiska, dźwięku,
UI…) i edytor sceny, który składa z nich grę. Wszystko działa w przeglądarce, bez budowania i bez serwera danych.
Ten dokument mówi, **jak tego używać**: co jest, gdzie, jakim API i w jakiej kolejności. Jak **rozwijać** kod
repozytorium — [`../../CLAUDE.md`](../../CLAUDE.md); mapa wszystkich dokumentów — [`../README.md`](../README.md).

## 1. Jak pracować

1. **Otwórz stronę.** Online: <https://michalstankiewicz4-cell.github.io/GameLaboratory/> (strona startowa: wszystkie
   laboratoria, filtr po frazach). Lokalnie: `python3 -m http.server 8000` w katalogu repozytorium, potem
   `http://localhost:8000/` (moduły ES — plik otwarty z dysku nie zadziała).
2. **Sprawdź, czy strona żyje:** **Konsola** po prawej na pasku narzędzi — dziennik (`window.LabLog.entries`): błędy,
   ostrzeżenia, etapy ładowania, najnowsze na górze. Zakładka **API** w konsoli — polecenia JSON tej strony.
3. **Zapytaj o możliwości, zanim zgadniesz:** w edytorze sceny `sceneApi.run({ "cmd": "help" })`, `{ "cmd": "prefabs" }`,
   `{ "cmd": "assets" }`; w laboratoriach — pola API z listami (`ArtApi.lists`, `SfxApi.sounds`, `VoiceApi.presets`,
   `CityApi.types`, `MaterialApi.presets`…).
4. **Twórz w laboratorium, zapisuj pod nazwą, składaj w scenie.** Laboratorium zapisuje wynik jako **zasób z nazwą**
   (`save(nazwa)` w API albo przycisk Zapisz); edytor sceny wybiera go z listy albo polem obiektu / środowiska
   (`asset`, `sound`, `env.sea`, `env.ui`…). Zasoby żyją w tej przeglądarce (`localStorage["gameLab.assets.v1"]`);
   inna karta widzi zapis od razu.
5. **Sprawdź wynik:** w scenie `{ "cmd": "check" }` (lekarz sceny: złe środowisko, zachodzenie, brakujące zasoby, koszt —
   z poleceniami poprawek); model z kodu — doktor modeli (`tools/doctor.html`, `python3 tools/doctor.py`); obraz — zrzut
   ekranu (klawisz **H** chowa okna).
6. **Zagraj:** `{ "cmd": "play" }` uruchamia zachowania (fizyka środowisk), dźwięk i UI gry; `{ "cmd": "stop" }` wraca do
   edycji (dane sceny się nie zmieniają).

Jednostki: metry, stopnie, sekundy; Y w górę; kurs 0 — wzdłuż +Z. Teksty interfejsu: angielski i polski.

## 2. Co jest — laboratoria i co tworzą

| Grupa | Laboratorium (`labs/…`) | Tworzy / pokazuje | Zasób | API |
|---|---|---|---|---|
| Pojazdy | `vehicles-space.html` · `vehicles-water.html` · `vehicles-land.html` | statki kosmiczne, okręty i roboty morskie, pojazdy drogowe, tramwaj, pociąg, samolot, łaziki, przeładowarka — z jazdą siłami | — | — |
| Kosmos | `bodies.html`, `systems.html`, `scale.html`, `surface.html`, `buildings.html` | ciała niebieskie, układy, skala, powierzchnia planety, moduły bazy | `sky` (niebo kosmosu) | — |
| Świat | `water.html`, `land.html`, `caves.html`, `look.html`, `filters.html` | morze, ląd (teren, wody, biomy), jaskinie, pogoda i światło, wygląd kamery | `sea`, `land`, `cave`, `weather`, `look` | `CaveApi` |
| Świat | `structures.html`, `city.html`, `plants.html`, `items.html` | budowle wodne, budynki miasta (także Warszawa z OpenStreetMap), rośliny, przedmioty złomowiska | `building`, `plant` | `CityApi`, `PlantApi`, `ItemsApi` |
| Życie | `life.html`, `creator.html`, `human.html`, `gear.html`, `morgue.html`, `walkers.html` | zwierzęta, edytor stworów, człowiek, przedmioty bohatera (światło), głowy SDF, postacie SDF z siecią ocen | — | — |
| Materia | `materials.html`, `art.html`, `pixel.html`, `zombies.html` | materiały PBR ze starzeniem, obrazy i ekspertyza, pixel art, generator zombie | `material`, `image` | `MaterialApi`, `ArtApi` |
| Woksele, efekty | `blocks.html`, `effects.html` | bryły z bloków (ciecze, gaz), efekty (strzały, wybuchy, pola, skok…) | `blocks`, `effect` | `BlocksApi`, `EffectsApi` |
| UI | `gameui.html`, `trees.html`, `skins.html` | UI gry (menu, HUD, okna, dialog, dźwięki skórki, głosy), drzewka ulepszeń, skórki statków | `ui`, `uiskin`, `tree` | `GameUIApi`, `TreeApi` |
| Dźwięk | `sound.html` · `sound-effects.html` · `sound-speech.html` | muzyka, efekty i tła miejsc, mowa (głosy postaci) | `music`, `sound`, `ambience`, `voice` | `SfxApi`, `VoiceApi` |
| AI | `lang.html`, `img.html` | małe sieci języka i obrazów, uczone w przeglądarce | — | — |

Laboratoria bez API mają okna z suwakami i **Copy settings (JSON)** albo zapis pod nazwą. Narzędzia: **edytor sceny**
(`editor/index.html`), **lekarz sceny** (`editor/index.html?doctor`), **doktor modeli** (`tools/doctor.html`),
**transformator** (`labs/transform.html` — poziomy szczegółów, strefy trafień), **kontrola kitów** (`tools/kitcheck.html`).
Opis każdego — w jego dokumencie (`docs/labs/<laboratorium>.md`, mapa: [`../README.md`](../README.md)).

## 3. Edytor sceny — `window.sceneApi`

`sceneApi.run(polecenie | lista | tekst JSON)` → `{ ok, … }` albo `{ ok: false, error }`; lista to jeden krok cofania.
Najważniejsze polecenia (pełna tabela: [`../../editor/README.md`](../../editor/README.md), „API dla AI”):

| Polecenie | Co robi |
|---|---|
| `help`, `describe`, `prefabs [family]`, `assets [kind]` | co można: polecenia, scena jako dane, modele do dodania, zasoby z nazwą |
| `env { surface, light, look, sea, land, sky, ui, cave, music, musicAction }` | środowisko: `sea` / `land` / `space` / `underground`; zasoby środowiska |
| `add { prefab, name, pos, rot, scale, behavior, asset, shot, sound }` | dodaje model (`prefab` z `prefabs`) |
| `set { id \| name, … , sound, soundRange, orbit }`, `move`, `remove` | zmienia obiekt |
| `play`, `stop`, `act { name, action }`, `actions` | gra: zachowania, akcje obiektu (`fire`, `scan`, `destroy`, `work` — drzwi, właz…) |
| `effect { effect, from, to \| at, path }`, `sound { sound, at }`, `music { play \| action }` | efekt z laboratorium efektów, dźwięk w miejscu, muzyka w grze |
| `ui { say: { who, text, choices, voice } \| log \| banner \| show \| open … }` | UI gry sceny (w grze) |
| `check` | lekarz sceny: problemy i proponowane poprawki (niczego nie zmienia) |
| `events [n]` | ostatnie zdarzenia szyny (akcje, efekty, wybory w dialogu) |

Rodziny prefabrykatów: `sea/`, `road/`, `tram/`, `train/`, `air/`, `structures/`, `weapons/`, `space/`, `marine/`,
`rovers/`, `plants/`, `caves/`, `base/`, `bodies/`, `humans/`, `creatures/`, `blocks/`, `junkyard/`, `city/`.
Zachowania (fizyka): okręt i mała jednostka na wodzie, jazda po lądzie, lot, ciąg w próżni, lądowanie, orbita, budowa,
przeładowarka, przedmioty i maszyny złomowiska — [`../behaviors/README.md`](../behaviors/README.md).

## 4. API laboratoriów

Każde jest też w zakładce **API** konsoli swojego laboratorium (JSON). Wywołania asynchroniczne — `await`.

| API | Laboratorium | Najważniejsze | Przykład |
|---|---|---|---|
| `CityApi` | `city.html` | `make(opis)` (także `{ landmark: 'pkin' }` — budynek Warszawy z mapy), `spec`, `types`, `landmarks`, `footprints`, `info`, `night(0…1)`, `save(nazwa)` → `building` | `CityApi.make({ type: 'tower', floors: 30 })` |
| `MaterialApi` | `materials.html` | `make(opis)`, `presets`, `kinds`, `def`, `maps()` (PNG), `save(nazwa)` → `material` | `MaterialApi.make({ kind: 'plate', color: '#6d6a66', rust: 0.6 })` |
| `ArtApi` | `art.html` | `render(spec)` → PNG, `spec()`, `lists`, `exam({ kind, seed, profile, views })` — ekspertyza | `await ArtApi.render({ subject: 'landscape', seed: 7 })` |
| `EffectsApi` | `effects.html` | `play(kind, { from, to \| at, dir \| path })`, `set(kind, liczby)`, `save(nazwa)` → `effect` | `EffectsApi.play('explosion', { at: [0, 2, 0] })` |
| `BlocksApi` | `blocks.html` | `build(bryła)`, `bite([x, y, z], r)`, `counts()`, `loose()`, `shapes`, `kinds` | `await BlocksApi.build({ shape: 'sphere', seed: 3 })` |
| `GameUIApi` | `gameui.html` | `load(def)`, `set(stan)`, `show(ekran)`, `open(okno)`, `say({ who, text, choices, voice })`, `log`, `banner`, `tree`, `buy` | `await GameUIApi.say({ who: 'AI', text: 'Hello', voice: 'android' })` |
| `TreeApi` | `trees.html` | `get()`, `load(def \| nazwa)`, `check()`, `stats()`, `points(n)`, `buy(id)`, `effects()`, `save(nazwa)` → `tree` | `TreeApi.check()` |
| `SfxApi` | `sound-effects.html` | `play(opis \| id, { at })`, `start(opis)` → uchwyt, `ambience(opis \| id)`, `sounds`, `ambiences`, `stop()`, `save(nazwa, opis)` → `sound` | `SfxApi.play({ sound: 'explosion', params: { size: 0.8 } })` |
| `VoiceApi` | `sound-speech.html` | `say(tekst, głos?)`, `voice`, `presets`, `voices(język)`, `save(nazwa)` → `voice` | `VoiceApi.say('Witaj', { mode: 'formant', hz: 120 })` |
| `PlantApi`, `CaveApi` | `plants.html`, `caves.html` | `save(nazwa)` → `plant` / `cave`, `load(nazwa)`, `saved()`, `get()` | `PlantApi.save('dąb jesienny')` |
| `ItemsApi` | `items.html` | `list()`, `show(id, { variant, wire, coll })`, `info()` | `await ItemsApi.show('barrel')` |

Nazwy pól i dozwolone wartości — w liście z API (np. `CityApi.types`, `SfxApi.sounds`) albo w dokumencie laboratorium.

## 5. Przepisy

**Okręt o zmierzchu, platforma z pracującym silnikiem i wybuch** (edytor sceny):

```json
[{ "cmd": "new", "name": "Zatoka" },
 { "cmd": "env", "surface": "sea", "light": "dusk", "music": "mood:orbit", "musicAction": "song:escape" },
 { "cmd": "add", "prefab": "sea/blyskawica", "name": "Błyskawica", "pos": [0, 0, 0] },
 { "cmd": "add", "prefab": "structures/super300", "name": "Platforma", "pos": [250, 0, 150], "sound": "engine", "soundRange": 20 },
 { "cmd": "check" },
 { "cmd": "play" },
 { "cmd": "effect", "effect": "explosion", "at": [40, 2, -30], "radius": 12 }]
```

Wybuch ma swój dźwięk i włącza muzykę akcji na 20 s; okręt — dźwięk maszyn z dźwignią (W / S). Przy zaznaczonym obiekcie z dźwiękiem edytor
pokazuje kule zasięgu.

**Samochód, drzwi i silnik** (ląd):

```json
[{ "cmd": "new" }, { "cmd": "env", "surface": "land" },
 { "cmd": "add", "prefab": "road/polonez", "name": "Polonez" },
 { "cmd": "select", "name": "Polonez" }, { "cmd": "play" },
 { "cmd": "act", "name": "Polonez", "action": "work" }]
```

`work` otwiera drzwi kierowcy (zamek, potem trzaśnięcie przy zamknięciu); silnik gra z obrotami z biegów.

**UI z dialogiem i głosem postaci:** w `labs/gameui.html` wczytaj przykład, w oknie Skórka wybierz dźwięki, zapisz UI
pod nazwą (zasób `ui`); w edytorze `{ "cmd": "env", "ui": "<nazwa>" }`, `play`, potem
`{ "cmd": "ui", "say": { "who": "Station AI", "text": "Captain, the swarm is back.", "choices": ["Launch", "Hold"], "voice": "android" } }`;
wybór gracza przychodzi jako zdarzenie (`events`).

**Własny budynek w scenie:** w `labs/city.html` `CityApi.make({…})`, `CityApi.save('Biurowiec')`; w edytorze
`{ "cmd": "add", "prefab": "city/office", "asset": "Biurowiec" }` (rodzaj prefabrykatu — `prefabs city`).

## 6. Granice (stan dziś)

- **Pamięć tylko w tej przeglądarce:** zasoby, sceny w pamięci edytora i ustawienia nie przechodzą na inny komputer —
  scenę zapisz plikiem (Zapisz plik / `describe`), zasób odtwórz z JSON. OPCJE → *Wyczyść zapisane ustawienia* kasuje
  wszystko.
- **Dźwięk zaczyna grać po pierwszym kliknięciu albo klawiszu** (zasada przeglądarek); mowa przeglądarki nie jest
  w grafie Web Audio (bez efektów, poziom 0 na miernikach).
- **Jeszcze nie ma:** chodu ludzi i stworów, drugiego etapu budynków dla CityExplorer — lista: [`../../TODO.md`](../../TODO.md), plan:
  [`lab-breakdown.md`](lab-breakdown.md), [`engine-architecture.md`](engine-architecture.md).
- **Fizyka jest prawdziwa** (siły, nie skrypty): samolot z kółkiem ogonowym rozbije się, jeśli na rozbiegu nie trzymać
  steru wysokości; okręt osiądzie na mieliźnie. To wynik sił, nie błąd.
- Znane pułapki: [`gotchas.md`](gotchas.md).
