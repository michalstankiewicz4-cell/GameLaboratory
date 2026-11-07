# Edytor sceny („Warsztat”)

Strona: `editor/index.html` · wersja: `ui/data/versions.js` (klucz `editor/index.html`) · zmiany: [`CHANGELOG.md`](CHANGELOG.md)
· plan silnika: [`docs/guides/engine-architecture.md`](../docs/guides/engine-architecture.md)
· silnik sceny: [`docs/scene/README.md`](../docs/scene/README.md) · zachowania: [`docs/behaviors/README.md`](../docs/behaviors/README.md).

Scena złożona z modeli laboratoriów: okręty, samochody, czołg, autobus, tramwaj, pociąg, samolot, budowle, broń —
na morzu albo na lądzie. Model dodaje się w oknie Scena: po lewej kategoria, po prawej modele kategorii — przycisk + (albo dwuklik) stawia model w scenie; przesuwa, obraca i skaluje uchwytem albo liczbami, a zamienia
na inny jednym wyborem z listy. Środowisko: powierzchnia (morze / ląd), morze (zasób z laboratorium wody), światło (pora dnia i pogoda z laboratoriów
wodnych) i wygląd kamery (profil z laboratorium filtrów). Szczegóły modelu robi się w jego laboratorium:
„Otwórz w laboratorium” we Właściwościach. Edytor jest pierwszym krokiem do silnika: laboratoria będą się do niego
dostosowywać (zasoby z nazwą, wspólne zachowania).

## Obsługa

- Okna: **Opis**, **Scena** (dodaj model, hierarchia), **Właściwości** (środowisko albo wybrany obiekt), **Kamera**,
  **Wydajność**; OPCJE → Okna. **Okna | Panele** na pasku: w Panelach okna są panelami przy krawędziach, konsola na dole
  pośrodku, a widok 3D zajmuje wolny środek (`body.viewFits`).
- Pasek narzędzi: cofnij · domek · ponów (przeglądarka), **▶ Graj / ■ Stop**, **Cofnij / Ponów** (zmiany sceny), uchwyt **Przesuń / Obróć / Skaluj**, **Nowa**, **Zapisz plik**, **Otwórz plik**.
- Klawisze: Ctrl+Z — cofnij, Ctrl+Y / Ctrl+Shift+Z — ponów; W / E / R — przesuń, obróć, skaluj; Delete — usuń; Ctrl+D — powiel; F — pokaż wybrany; Esc — środowisko;
  H — chowa okna. Kliknięcie modelu wybiera go.
- **Graj** (P; Esc — Stop): zachowania ruszają modele (okręty płyną i kołyszą się na falach, samolot lata), gracz steruje
  wybranym modelem (albo pierwszym z zachowaniem), kamera jedzie za nim. Okręt: W / S maszyny, A / D ster. Pojazd drogowy: W / S gaz i hamulec / wstecz (pedał), A / D skręt. Robot morski: W / S maszyny, A / D ster, ↓ ↑ głębiej / płycej (nurek). Statek kosmiczny: W / S silnik główny i wsteczny, ↑ ↓ pochylenie, ← → kurs,
  Q / E przechył. Samolot:
  W / S gaz, ↑ ↓ ster wysokości (na rozbiegu trzymać ↓), ← → lotki, Q / E ster kierunku, B hamulce, G podwozie, F klapy.
  Edycja w tym czasie wyłączona; dane sceny się nie zmieniają, po Stop modele wracają na swoje miejsca.
- **API** (zakładka w konsoli i `window.sceneApi.run(…)`): polecenia JSON na scenie — opis niżej, „API dla AI”.
- Scena zapisuje się sama w przeglądarce (`localStorage["gameLab.scene.v1"]`); plik: `nazwa.scene.json`.

## Języki

Angielski (domyślny) i polski. Język wybiera się w OPCJE → Język, tak jak na całej stronie; strona ma
`<html data-lang-default="en">`, więc przy „Automatycznie” zostaje angielski. Teksty: `js/i18n/en.js` i `js/i18n/pl.js`
(te same klucze; brakujący klucz pokazuje tekst angielski). W HTML: `data-i18n` (tekst), `data-i18n-tip` (podpowiedź),
`data-i18n-win` (tytuł okna); w skryptach `EditorI18n.t('klucz', { zmienna })`. Nowy tekst = klucz w obu plikach.

## Budowa

```
editor/
  index.html            strona: paski, okna, kolejność skryptów
  css/editor.css        hierarchia i odnośnik do laboratorium (reszta z ui/ui.css i ui/style/sea.css)
  js/main.js            start: dane → świat → kamera i uchwyt → okna i pasek; budowa modeli z kartą ładowania
  js/core/store.js      stan: scena jako dane i wybór; jedyne źródło prawdy, słuchacze, zapis w przeglądarce, cofnij / ponów
  js/world/world.js     świat 3D: renderer, scena bazowa, potok obrazu, modele z prefabrykatów, pętla
  js/world/controls.js  kamera (orbita, kadrowanie), uchwyt (TransformControls), wybór kliknięciem
  js/ui/panels.js       okna Scena i Właściwości
  js/ui/toolbar.js      pasek narzędzi i klawisze
  js/ui/api-console.js  zakładka API w konsoli
  js/play/play.js       gra: zachowania w ruchu, gracz, kamera za graczem, linia stanu
  js/play/input.js      klawiatura gracza → sterowanie (dźwignia maszyn / gazu, stery, podwozie, klapy)
  js/i18n/              en.js, pl.js, i18n.js (klasyczne skrypty przed ui/shell/windows.js)
  README.md, CHANGELOG.md
```

Silnik (wspólny, poza folderem edytora — będą z niego korzystać też laboratoria i gry):

| Plik | Co |
|---|---|
| `js/scene/scene-data.js` | scena jako dane: format, nowa scena, obiekt, sprawdzanie danych z pliku (`normalize`) |
| `js/scene/prefabs.js` | prefabrykaty: każdy model z kitów, który da się postawić w scenie (id, nazwa, rodzina, gdzie stoi, laboratorium, budowa → `{ root, kit, dispose }`) |
| `js/scene/space.js` | kosmos: ładowanie kitów ze Space przy pierwszej potrzebie, gotowe tła nieba |
| `js/scene/assets.js` | zasoby z nazwą: ustawienia zapisane w laboratoriach pod nazwą (na razie morze z laboratorium wody) |
| `js/scene/api.js` | API sceny: polecenia JSON na danych sceny (bez Three.js) |
| `js/scene/behaviors.js` | zachowania w scenie: okręt na wodzie (`js/behaviors/water/ship.js`), lot (`js/behaviors/air/flight.js`); które pasują do modelu, domyślne |
| `js/labs/shared/stage.js` | scena bazowa: niebo SkyKit, morze WaterKit albo płaski grunt, słońce z cieniem (wspólna z laboratorium filtrów) |
| `vendor/three/addons/controls/TransformControls.js` | uchwyt z Three.js r186 (import przepisany na `../../three.module.js`) |

Zasada: **dane są jedynym źródłem prawdy**. Okna, uchwyt i pliki zmieniają tylko dane (`store`); świat 3D je odbija
(`syncObjects` — buduje i usuwa modele, `syncPlaces` — położenie, `syncEnv` — środowisko i obraz).

## Format sceny (`gamelab-scene`, wersja 1)

```json
{
  "format": "gamelab-scene", "version": 1, "name": "Harbour",
  "env": { "surface": "sea", "light": "afternoon", "look": "" },
  "objects": [
    { "id": "o…", "name": "ORP Błyskawica", "prefab": "sea/blyskawica", "pos": [0, 0, 0], "rot": [0, 0, 0], "scale": 1, "behavior": "ship" }
  ]
}
```

- `env.land` (ląd): `""` — płaski grunt albo nazwa terenu z laboratorium lądu; `env.light`: gotowe (`afternoon`,
  `noon`, `dusk`, `overcast`) albo nazwa pogody z laboratorium wyglądu; `env.look`: nazwa wyglądu kamery (laboratorium filtrów).
- `env.surface`: także `space`; `env.sky` (każda powierzchnia): `""` — domyślne (morze i ląd — dzienne, kosmos — Deep field),
  `"day"` — dzienne, `"preset:<id>"` — gotowe tło kosmosu (`deep`, `quiet`, `crimson`, `emerald`, `core`, `black`),
  albo nazwa nieba zapisanego w laboratorium ciał niebieskich.
- `env.sea`: nazwa zasobu „morze” z laboratorium wody (`js/scene/assets.js`) albo `""` — morze domyślne.
- `env.surface`: `sea` | `land`; `env.light`: `afternoon` | `noon` | `dusk` | `overcast`; `env.look`: nazwa profilu
  z laboratorium filtrów (zasób `look`, `gameLab.assets.v1`) albo `""`.
- `pos` w metrach (Y w górę), `rot` w stopniach (kolejność YXZ: kurs, pochylenie, przechył), `scale` — mnożnik.
- `prefab`: id z `js/scene/prefabs.js` (`sea/…`, `road/…`, `tram/…`, `train/…`, `air/…`, `structures/…`, `weapons/…`).
- `behavior` (nieobowiązkowe): id z `js/scene/behaviors.js` (`ship`, `flight`); bez pola — domyślne dla modelu, `""` — stoi w miejscu.
- Zmiana formatu podnosi `version` w `scene-data.js`, a `normalize` przenosi starsze sceny.

## API dla AI (`js/scene/api.js`)

Polecenia JSON na scenie jako danych — te same zmiany, które robią okna i uchwyt (wszystko widać od razu). Wpisuje się
je w zakładce **API** konsoli albo wywołuje `window.sceneApi.run(…)` (AI sterująca przeglądarką). Jedno polecenie
albo lista (po kolei); wynik `{ "ok": true, … }` albo `{ "ok": false, "error": "…" }`.

| Polecenie | Argumenty | Co robi |
|---|---|---|
| `help` | — | lista poleceń |
| `describe` | — | cała scena (dane) i krótki opis |
| `prefabs` | `[family]` | modele do dodania: id, nazwa, rodzina, gdzie stoi, zachowania |
| `add` | `prefab`, `[name]`, `[pos]`, `[rot]`, `[scale]`, `[behavior]` | dodaje model, zwraca `id` |
| `set` | `id` albo `name`, potem `newName` (z `id` także `name`), `prefab`, `pos`, `rot`, `scale`, `behavior`, `orbit` (`{ around, period }` — zachowanie „orbita”) | zmienia obiekt |
| `move` | `id` albo `name`, `by: [dx, dy, dz]` | przesuwa o wektor |
| `remove` | `id` albo `name` | usuwa |
| `env` | `surface` (`sea` / `land` / `space`), `light`, `look`, `land`, `sea`, `sky` | środowisko |
| `assets` | `[kind]` | zasoby z nazwą (`sea` — woda, `land` — ląd, `weather` — wygląd, `look` — filtry, `sky` — ciała niebieskie) i gotowe tła kosmosu |
| `select` | `id` / `name` albo nic | wybór w edytorze |
| `new` | `[name]` | pusta scena |
| `load` | `scene` | cała scena z danych |
| `play`, `stop` | — | jak ▶ Graj / ■ Stop |
| `act` | `id` albo `name`, `action`, `[on]` (przełącznik) | w czasie gry: akcja obiektu (statek kosmiczny: `fire`, `scan`, `print`, `offline`, `destroy`, własne) — zdarzenie „action” |
| `actions` | `id` albo `name` | w czasie gry: akcje obiektu |
| `events` | `[n]` | ostatnie zdarzenia szyny (domyślnie 20) |

```json
[{ "cmd": "add", "prefab": "sea/orzel", "name": "Orzeł 2", "pos": [60, 0, -20], "rot": [0, 45, 0] },
 { "cmd": "env", "light": "dusk" }]
```

Układ z orbitami (▶ — ciała krążą pod grawitacją; Luna wokół Terry, Terra wokół słońca):

```json
[{ "cmd": "env", "surface": "space" },
 { "cmd": "add", "prefab": "bodies/sol", "name": "Sol" },
 { "cmd": "add", "prefab": "bodies/terra", "name": "Terra", "pos": [300, 0, 0], "scale": 0.4 },
 { "cmd": "set", "name": "Terra", "orbit": { "around": "Sol", "period": 20 } },
 { "cmd": "add", "prefab": "bodies/luna", "name": "Luna", "pos": [340, 0, 0], "scale": 0.15 },
 { "cmd": "set", "name": "Luna", "orbit": { "period": 5 } }]
```

Jednostki: metry, stopnie; Y w górę, kurs 0 — wzdłuż +Z. W czasie gry polecenia zmieniające scenę są odrzucane.

## Wersjonowanie

- Edytor ma własną wersję `x.y.z` w `ui/data/versions.js` (`editor/index.html`): **y** — nowa funkcja, **z** — poprawka.
- Każda zmiana: wpis w [`CHANGELOG.md`](CHANGELOG.md) tego folderu i krótki wpis w głównym `CHANGELOG.md`.
- Zmiana silnika (`js/scene/`, `js/labs/shared/stage.js`) podnosi też wersję programu; zmiana formatu sceny — `version`
  w `js/scene/scene-data.js`.

## Na później (propozycje)

- Pozostałe modele ze Space (łaziki, budynki baz, roboty morskie) i ciała niebieskie w scenie kosmosu.
- Brzegi, lód i prądy z laboratorium wody w morzu z zasobu; deszcz i błyskawice z zapisanej pogody; morze z płyciznami przy terenie (dziś woda sceny bazowej nie zna terenu).
- Woda wycięta w kadłubie każdego okrętu (dziś WaterKit umie jeden kadłub w środku sceny).
- Zachowania dla pozostałych modeli (koło na szynie dla tramwaju i pociągu — potrzebuje toru w scenie, pojazdy drogowe).
