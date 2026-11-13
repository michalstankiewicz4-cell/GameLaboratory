# Silnik GameLaboratory — schemat (plan)

Plan, do którego zmierzamy: z laboratoriów (modele, środowiska, zachowania, grafika, dźwięk, UI) robimy silnik,
w którym AI buduje grę przez API, a człowiek widzi wynik na żywo — jak w „Warsztacie dla AI” z pierwszej rozmowy
(drzewo obiektów, właściwości, podgląd). Cel: **gry przeglądarkowe** — wszystko działa w przeglądarce, bez instalacji
(JavaScript, Three.js, Web Audio, WebRTC, IndexedDB). Spisane 2026-11-05 na podstawie schematu właściciela; to plan, nie stan kodu.

## Zasada: scena w środku

Scena nie jest jednym z modułów obok grafiki i audio, tylko środkiem silnika. Wszystkie moduły pracują na tej samej
scenie: grafika ją rysuje, fizyka ją przesuwa, audio z niej gra, sieć ją synchronizuje, zapis ją zapisuje, debug
i edytor ją pokazują, AI ją zmienia.

```
            ┌──────────── LABORATORIA: edytory części silnika ─────────────────────────────────┐
            │ Modele ▶ prefabrykaty │ Ustawienia ▶ zasoby z nazwą │ Materiały ~ │ niepołączone … │
            └────────────────────────────── ▼ do sceny ────────────────────────────────────────┘
                         ┌────────────────────── ENGINE: pętla, czas, cykl życia ───────────────────────┐
 [Input ~] ──► zdarzenia ►│  Rules … ─► Zachowania ─► Fizyka ~ ─► Animacje ~ ─► Render ─► Wygląd kamery ─► ekran │
 klawiatura, mysz         │  [UI gry: menu, HUD, okna, dialogi — nad ekranem]          [Audio …]          │
 (pad, dotyk …)           │   └──────── zmieniają ───────► [SCENA (dane, JSON)] ◄──── rysuje ─────┘        │
                         │   obiekty: prefabrykat, położenie, zachowanie (kolizja, cząsteczki, dźwięk …)  │
                         │   środowisko: powierzchnia, niebo, morze, ląd, światło i pogoda, kamera, UI gry │
                         └──────────────────────────────┬───────────────────────────────────────────────┘
   ┌──────────────┬──────────────┬─────────────┬────────┼─────────┬──────────────┬─────────────────────┐
 [Assets]      [Events]      [Network …]  [Save/Load ~]  [Jobs/Workers …]  [Edytor + API dla AI]  [Lekarze]
 kity,         jedna szyna:  stan sceny,   scena jako    fizyka, AI,       hierarchia, ▶ Graj,    doktor modeli,
 prefabrykaty, akcje,        zdarzenia     JSON: plik    generowanie       konsola; AI buduje     lekarz sceny
 zasoby, mat.  UI gry                      i przeglądarka terenu           i gra przez API
```

Oznaczenia: bez znaku — działa, `~` — częściowo, `…` — w planie (stan 0.65.0; co zostało do połączenia: `TODO.md`,
„Pełne połączenie laboratoriów”).

Ten schemat narysowany ramkami: menu **Pomoc → Schemat silnika** na każdej stronie (`ui/shell/menubar.js`, `engineMap`).

## Moduły

| Moduł | Co robi | Uwagi |
|---|---|---|
| **Engine** | pętla i kolejność: wejście → skrypty → fizyka (stały krok, np. 120 Hz) → animacje → render → audio i UI → debug; czas (pauza, zwolnione tempo); cykl życia (ładuj, start, pauza, koniec) | jedna pętla dla wszystkich modułów |
| **Scene** | drzewo obiektów; obiekt = położenie + składniki (siatka, światło, kamera, kolizja, zachowanie, źródło dźwięku, cząsteczki, sprite); środowisko (niebo, woda, ląd, pogoda, prawa fizyki) | scena jako dane (JSON): z niej zapis, edytor, sieć i API dla AI |
| **Graphics** | rysuje scenę: 3D (Three.js r186, WebGL; później renderer WebGPU z Three), 2D (Canvas), post-FX (wygląd kamery, filtry) | efekty, cząsteczki i sprite'y są obiektami sceny, nie wyjściem grafiki |
| **Physics** | stały krok, prawa środowiska: próżnia, woda, ląd | osobno od skryptów |
| **Rules** | reguły gry: stan rozgrywki (lobby, misja, wygrana, przegrana), cele, punkty, role graczy (np. patogen i lekarz), warunki końca rundy | dotyczą całej gry, nie jednego obiektu; słuchają zdarzeń i zmieniają scenę |
| **Scripts** | zachowania podpinane do obiektów (strzelanie, sterowanie, AI przeciwników) | korzystają z fizyki i zdarzeń |
| **Audio** | Web Audio: muzyka, efekty, dźwięk przestrzenny ze źródeł w scenie | słuchacz = kamera |
| **UI** | menu, HUD, pasek postępu, okna | czyta stan sceny i zdarzenia |
| **Input** | klawiatura, mysz, pad, dotyk, Pointer Lock → akcje („skok”, „strzał”) | akcje, nie klawisze, żeby dało się zmieniać sterowanie |
| **Assets** | ładowanie, pamięć podręczna, postęp; prefabrykaty (gotowe obiekty z kitów) | |
| **Events** | szyna wiadomości („trafienie” → audio + UI + sieć) | moduły nie wołają się nawzajem; jest: `js/core/events.js` (zdarzenie „action” — akcje statków) |
| **Network** | synchronizacja stanu sceny i zdarzeń; kto liczy (gospodarz czy każdy), wygładzanie ruchu innych graczy | WebRTC (dane), Supabase / Firebase (lobby, łączenie), Cloudflare (pośrednik) |
| **Save/Load** | scena zapisana jako dane → IndexedDB / LocalStorage | nie jest częścią Workers |
| **Jobs/Workers** | ciężkie zadania w tle: fizyka, generowanie terenu, ścieżki, nauka sieci | |
| **Debug + Editor + API dla AI** | hierarchia, atrybuty, statystyki, konsola; edytor sceny; API: AI dodaje obiekt, zmienia parametr, podgląd od razu | to jest „Warsztat” |

## Co już mamy

| Moduł | Gdzie |
|---|---|
| Assets | modele i kity: `js/models/` |
| Scene (środowiska) | `js/envs/` (niebo, woda, ląd, prawa) |
| Scripts | zachowania: `js/behaviors/` (koło na szynie, okręt na wodzie, lot) — [opis](../behaviors/README.md) |
| Graphics + FX | `js/render/` (wygląd kamery, filtry, widzenie) |
| Audio | `js/audio/` (MusicKit) |
| UI i Debug | `ui/shell/` (okna, `LabPerf`, konsola, `LabLog`, karta ładowania) |
| Jobs/Workers | wątki nauki w laboratoriach języka i obrazów |
| Scene (dane) | `js/scene/scene-data.js` (format `gamelab-scene`), prefabrykaty `js/scene/prefabs.js` — [opis](../scene/README.md) |
| Zasoby z nazwą | `js/scene/assets.js` — ustawienia zapisane w laboratoriach pod nazwą (morze z laboratorium wody), scena trzyma nazwę |
| API dla AI | `js/scene/api.js` — polecenia JSON na scenie (zakładka API w konsoli edytora, `window.sceneApi`) |
| Scripts w scenie | `js/scene/behaviors.js` — zachowania podpięte do prefabrykatów (okręt, lot), pole `behavior` obiektu |
| Debug + Editor | edytor sceny `editor/` (hierarchia, właściwości, uchwyt, zapis do pliku, ▶ Graj) — [opis](../../editor/README.md) |

Brakuje: jednej pętli silnika dla gier (edytor ma swoją, z trybem gry), laboratoriów na wspólnej scenie (dziś każde buduje własną
scenę Three.js; widok w wolnym środku mają już wszystkie, 0.35.0), warstwy Input, szyny zdarzeń i sieci.

## Kolejność (propozycja, do decyzji właściciela)

1. Scena jako dane (JSON: obiekty, składniki, środowisko) i jedna wspólna pętla. *(scena jako dane: zrobione w 0.29.0,
   `js/scene/`; wspólna pętla dla gier — jeszcze nie)*
2. Edytor sceny („Warsztat”): drzewo obiektów, właściwości, podgląd; wstawianie modeli z kitów, środowisk
   i zachowań z laboratoriów. *(pierwsza wersja: `editor/`, 0.1.0; zachowania i ▶ Graj — 0.32.0; cofnij / ponów —
   edytor 0.5.0; morze z laboratorium wody jako zasób — 0.34.0)*
3. API dla AI na scenie jako danych. *(pierwsza wersja: `js/scene/api.js`, 0.33.0)*
4. Input z akcjami, szyna zdarzeń, zapis. *(zapis zasobów z nazwą: `js/scene/assets.js`, 0.34.0; klawiatura gracza
   jest na razie w edytorze, `editor/js/play/input.js`)*
5. Sieć.

Spis laboratoriów i tego, co z każdego idzie dokąd: [`lab-breakdown.md`](lab-breakdown.md).

## Niebo niezależne od powierzchni (plan, 2026-11-06; zrobione w 0.38.0 — bez nieba ze zdjęcia i bez przeniesienia kodu)

Jak w silnikach (Unity, Godot): niebo to osobne ustawienie środowiska, nie część powierzchni — morze albo ląd pod
mgławicą, kosmos bez powierzchni. Dziś niebo wynika z powierzchni (morze / ląd — niebo dzienne SkyKit, kosmos — niebo
BodyKit).

- **Dwa niezależne wybory** w Środowisku: **powierzchnia** (morze, ląd, brak = kosmos) i **niebo**: dzienne (pora dnia
  i pogoda, SkyKit — domyślne dla morza i lądu), kosmosu (gotowe tła SystemKit i zasoby „sky” z laboratorium ciał
  niebieskich), później ze zdjęcia (panorama HDRI wczytana z pliku).
- **Światło z nieba:** niebo daje kolor słońca, światło rozproszone, mgłę i mapę odbić. Pod niebem kosmosu: słońce
  białe, bez mgły, woda odbija mgławicę; fale i fizyka okrętów bez zmian.
- **Dane:** `env.sky` dla każdej powierzchni (`""` — domyślne dla powierzchni); stare sceny działają jak dotąd;
  w API to samo polecenie `env`.
- **Kod:** niebo kosmosu przenieść z `js/models/bodies/` (dziś „ciało” BodyKit) do środowisk, obok `js/envs/sky/`
  (niebo dzienne) — wszystkie nieba w jednej szufladzie środowisk; laboratorium ciał niebieskich zostaje edytorem nieba.

## Rola edytora i docelowy układ repozytorium (plan, 2026-11-05)

**Edytor sceny jest głównym, docelowym programem**: w nim składa się grę. Właściciel potwierdził ten kierunek
i zostawił decyzję o przebudowie układu folderów.

- **Edytor** (`editor/`): scena, obiekty, środowisko, potem zachowania, przycisk „Graj” i API dla AI. Z edytora gra
  wychodzi jako osobna strona przeglądarkowa: scena jako dane + silnik.
- **Laboratoria** (`labs/`): edytory zasobów — w nich robi się i sprawdza jedną rzecz (model, ląd, wodę, profil obrazu,
  dźwięk). Laboratoria dostosowują się do edytora: każde dostaje „Zapisz jako zasób” (zasób z nazwą, wiele wersji)
  i z czasem przechodzi na wspólną scenę i wspólną pętlę.
- **Silnik**: wszystko, z czego korzystają edytor, laboratoria i gra.

Docelowy układ:

```
editor/            główny program (edytor sceny); później strona startowa może prowadzić najpierw tutaj
engine/            silnik, wspólny dla edytora, laboratoriów i gier:
  scene/           scena jako dane, prefabrykaty, (później) zasoby z nazwą       ← dziś js/scene/
  models/          kity modeli                                                    ← dziś js/models/
  envs/            środowiska i ich prawa (niebo, woda, ląd, kosmos)               ← dziś js/envs/, js/labs/shared/stage.js
  behaviors/       zachowania                                                     ← dziś js/behaviors/
  render/          grafika i potok obrazu                                         ← dziś js/render/
  audio/           dźwięk                                                         ← dziś js/audio/
  core/            pętla, czas, (później) wejście, zdarzenia, zapis               ← dziś js/core/
labs/              laboratoria (edytory zasobów): strony + js/labs/<lab>/ → labs/<lab>/ (strona i skrypty razem)
ui/                wygląd i powłoka stron (bez zmian)
tools/, docs/, data/, vendor/   bez zmian
```

Zasady przeprowadzki:
- **Jednym ruchem**, gdy edytor urośnie i będzie widać, czego potrzebuje od silnika (zachowania w scenie, „Graj”),
  a nie po kawałku — żeby ścieżki nie były w połowie stare, w połowie nowe.
- Narzędziem jak przy 0.20.0: `git mv` z historią i automatyczne przepisanie importów, ścieżek w stronach, CSS i dokumentacji;
  potem `tools/paths.py --strict`, `tools/sitemap.py --check` i przejście wszystkich stron w przeglądarce.
- Adresy stron laboratoriów (`labs/*.html`) zostają, bo linkują do nich gry (Battle, Space); jeśli się zmienią —
  poprawka linków w grach w tym samym kroku.
- Doktor modeli, kitcheck i laboratoria języka / obrazów przechodzą na nowe ścieżki razem z resztą.
- Po przeprowadzce: `CLAUDE.md` („Układ folderów”), `docs/README.md` i ten dokument — nowe ścieżki; wpis w `CHANGELOG.md`
  (wersja programu: duży zwrot, `1.0.0` albo `y`, do decyzji właściciela).
