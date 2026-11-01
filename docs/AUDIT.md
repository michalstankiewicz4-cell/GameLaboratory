# Remanent GameLaboratory — audyt kodu, plików, folderów i dokumentacji (2026-11-01, program 0.11.1)

Stan: 453 pliki w repozytorium, ok. 14 MB. Raport był listą **propozycji**; wykonanie — niżej, „Stan wykonania”. Każdy punkt ma numer (do decyzji), pracochłonność (S/M/L) i ryzyko (niskie / średnie / wysokie).
Metody: graf zależności od każdej strony (skrypty, importy, style, `fetch`, workery), skan ścieżek w kodzie,
komentarzach i dokumentacji, wyszukiwanie powtórzonych bloków kodu (okna po 6 linii), skan selektorów CSS,
spójność rejestrów laboratoriów, przegląd narzędzi testowych.

## Stan wykonania (program 0.13.0)

- **Zrobione:** A1–A3, A6; B1–B4 (B4: klucze `gameLab.*` z jednorazową migracją); C1 (ścieżki z historii przeniesień;
  zostały wzmianki o plikach samej gry), C2 (`docs/ui.md` i części `gotchas.md` o grze), C3, C4, C5, C6; D1 (`ui/catalog.js`
  + `tools/sitemap.py`), D2, D3 (`js/labs/shared/studio.js`), D4 (`js/render/sdf-glsl.js`); E1–E4, E6; F1, F2; G1 (poza
  skórkami), G2, G3; H2–H4; J1–J4 (bez osobnych `panels.css` i `bar.css` — treść paneli jest w `space.css` / `sea.css`).
- **Fałszywe trafienia:** A4, A5.
- **Zostawione decyzją:** D5 (decyzja z 0.11.1); E5 (dzielić, gdy pliki urosną).
- **Do decyzji / później:** D6 (wspólne `$()`/`el()` — każdy skrypt ma swoją jednolinijkową wersję, zysk mały), F3 (dane
  głowy są już binarne: Int16 w base64; plik `.bin` oszczędziłby ok. 50 kB, ale wymaga asynchronicznego wczytania), F4, H1
  (pełny kitcheck — długo trwa), I1–I3.

## Podsumowanie

| Obszar | Najważniejsze |
|---|---|
| Śmieci | `css/game-ui/` (27 plików interfejsu gry, nieużywane), `tools/out/` (27 zrzutów, 3,8 MB), stara `.gitignore` w `docs/walkers/`, 3 × `console.log` |
| Błędy | `tools/lab-check.py` nie działa (stare adresy Battle); `labs/warship.html` nieznana paskowi menu (brak nazwy i wersji, brak kafelka) |
| Dokumentacja | ~230 martwych ścieżek w ~100 plikach — dokumentacja i komentarze mówią ścieżkami ze Space/Battle; brak spisu `docs/` |
| DRY | dodanie laboratorium wymaga zmian w 6 miejscach (pasek menu, wersje, 4 sekcje strony startowej, mapa strony); martwy markup HUD w 11 stronach Space; wspólne „studio” w życiu i człowieku |
| Struktura | dwa tryby Three.js (legacy r128 tylko dla doktora i kitchecka), dwa arkusze stylów paneli (`lab.css` + nakładka w `windows.css`), stara nazwa gry w tytułach i kluczach |
| Testy | kitcheck nie przeszedł w całości od 0.5.0; `lab-check.py` zepsuty; brak testów w GitHub Actions |

---

## A. Śmieci do usunięcia (bezsporne, ryzyko niskie)

| # | Co | Dlaczego | Praca |
|---|---|---|---|
| A1 | `css/game-ui/` — 27 plików (style interfejsu gry Space: HUD, okna, ekran startowy, tła) | żadna strona ich nie ładuje; to interfejs gry, a gier tu nie przenosimy (makieta w laboratorium skórek ma własne style) | S |
| A2 | `tools/out/` — 27 PNG, 3,8 MB | wyniki uruchomień `pixel-check.py` (zrzuty), nie wzorce — nic ich nie czyta; dodać `tools/out/` do `.gitignore` (dziś brak `.gitignore` w ogóle) | S |
| A3 | `docs/walkers/gitignore.txt` | dawny `.gitignore` z NeuroLabPA, przeniesiony przez import | S |
| A4 | ~~`console.log` w `js/labs/bodies.js`, `sound.js`, `systems.js`~~ | **fałszywe trafienie** — to celowa funkcja zapasowa „SEE CONSOLE” (gdy schowek jest zablokowany); zostaje | — |
| A5 | ~~selektory `.sev1`, `.sev2` w `css/pixel.css`~~ | **fałszywe trafienie** — klasy nadawane dynamicznie przez skrypt Pixel Studio; zostają | — |
| A6 | `assets/labs/ship.jpg`, `assets/labs/orzel.jpg` | nieużywane (kafelek okrętów nie istnieje — patrz B2); albo użyć ich w B2, albo usunąć | S |
| A7 | `tools/walkers/prototype/*.py` (6 plików) i `tools/walkers/build_artifact.py` | prototypy SDF z Pythona i składacz artefaktu claude.ai — po przeniesieniu do GameLaboratory bez zastosowania (zostają w historii) | S |

## B. Błędy do naprawienia

| # | Co | Skutek | Praca / ryzyko |
|---|---|---|---|
| B1 | `tools/lab-check.py` otwiera `labs.html` i `labs/ship.html` (adresy z Battle) | test laboratoriów wodnych nie działa; poprawne: `index.html`, `labs/warship.html` (+ kafelki przez `href$=`) | S / niskie |
| B2 | `labs/warship.html` (okręty — woda) nie jest w liście paska menu ani na stronie startowej | na tej stronie pasek nie pokazuje „Laboratorium · …” ani wersji laboratorium; nie ma jej w NARZĘDZIA → Laboratoria; wejście tylko przez przełącznik środowiska w laboratorium statków. Propozycja: dopisać ją do paska jako drugą stronę laboratorium statków (rozpoznawana, z wersją), bez osobnego kafelka — albo z kafelkiem (decyzja) | S / niskie |
| B3 | Tytuły 13 stron Space i kitchecka: „Swarm Protocol // …” i napis „SWARM PROTOCOL // … LAB” w HUD | stara nazwa gry w kartach przeglądarki i wynikach wyszukiwania; ujednolicić z Battle: „Nazwa — opis \| GameLaboratory” | S / niskie |
| B4 | Klucze ustawień `steelSalvo.*` (7 laboratoriów Battle), `roj-*` (skórki, powierzchnia) | stara nazwa gry w kluczach przeglądarki; zmiana = utrata zapisanych ustawień, chyba że z jednorazową migracją | S / średnie (decyzja: zostawić / zmienić z migracją) |

## C. Dokumentacja i komentarze

| # | Co | Praca |
|---|---|---|
| C1 | **~230 martwych ścieżek** w ~100 plikach: dokumentacja (`docs/ship.md`, `bodies.md`, `surface.md`, `look.md`, `land.md`, `plants.md`, `structures.md`, `water.md`, `labs-sea.md`, `pixel/`, `life.md`, `walkers/README.md`…) i komentarze w kodzie (np. `js/lifekit/…`, `js/env/…`, `js/structkit/…`, `js/shipkit/…`, `vendor/three-r128.min.js`) wskazują pliki z dawnych repozytoriów. Mechaniczna podmiana według historii przeniesień git (stara ścieżka → nowa); historia (`CHANGELOG`, `history-*.md`) zostaje jak była | M |
| C2 | Dokumentacja opisuje rzeczy gry, których tu nie ma: `docs/ui.md` (interfejs gry Space), `docs/gotchas.md` (częściowo gra: Supabase, versionCheck), fragmenty `docs/ship.md` / `bodies.md` / `rendering.md` (gra, r128). Propozycja: wyciąć części o grze, zostawić to, co dotyczy laboratoriów i kitów | M |
| C3 | Brak spisu dokumentacji: dodać `docs/README.md` (mapa: laboratoria → plik, kity, narzędzia, historia) — Pomoc → Dokumentacja otwiera folder `docs/` i README pokaże się od razu | S |
| C4 | Porządek w `docs/`: historia do `docs/history/` (`doctor/history-space.md`, `history-sea.md`, `labs/CHANGELOG.md` — dziś leży w folderze stron!, `walkers/CHANGELOG.md`); nazwy z sufiksem `-sea` (`labs-sea.md`, `guide-sea.md`, `ships-sea/`) → np. `docs/labs/water/…` albo spis w C3 | S |
| C5 | Komentarze nagłówkowe stron Space mówią „Swarm Protocol”, „js/vehiclekit/…”, „docs/…” ze Space — poprawić razem z C1/B3 | S |
| C6 | `CLAUDE.md`: dopisać zasadę rejestru laboratoriów (patrz D1) i zasady z remanentu po decyzjach | S |

## D. DRY i łączenie

| # | Co | Praca / ryzyko |
|---|---|---|
| D1 | **Jeden rejestr laboratoriów.** Dziś nowe laboratorium = 6 miejsc: `menubar.js` (LABS + PL_ITEMS), `versions.js`, `index.html` (ART, INFO, INFO_PL, PHRASES) i `sitemap.xml` — stąd B2. Propozycja: `js/labkit/catalog.js` (plik, nazwa EN/PL, opis EN/PL, frazy, obrazek, wersja, dokument), z którego czytają pasek menu i strona startowa; `sitemap.xml` generowana skryptem | M / średnie |
| D2 | **Martwy markup HUD** w 11 stronach Space: logo SVG, `#hudBracket`, `#hudBar`, `#hudSub`, paski `.mat` — od okien wszystko schowane przez `windows.css`. Usunąć z HTML (i odpowiednie reguły z `lab.css`) | S / niskie |
| D3 | Laboratoria życia i człowieka: wspólne „studio” (podłoga z siatką metrów, linijka 2 m, trzy światła, kamera) skopiowane w `js/labs/life.js` i `human.js` (188 wspólnych bloków; same strony 48). Wydzielić `js/labs/shared/studio.js`; reszta skryptów zostaje osobno, jak chciałeś | S / niskie |
| D4 | Funkcje odległości (SDF) w GLSL powtórzone w `js/models/life/zombie/sdf-head.js` i `zombie/walkers/shaders.js` — wspólny fragment GLSL (`js/render/sdf-glsl.js`) | S / niskie |
| D5 | Strony Battle: ten sam początek `<head>` (CSP, meta, ikona, style) w 12 plikach i skrót „H chowa panele” w 7 skryptach — teraz robią to okna; zostawić (decyzja z 0.11.1) albo przenieść do `windows.js` | S |
| D6 | Pomocnicze `$()`, `el()`, budowanie suwaków powtarzają się w laboratoriach Battle, Space, okien i pociągu; wspólny `js/labkit/dom.js` | M / niskie |

## E. Podział i struktura folderów

| # | Co | Praca / ryzyko |
|---|---|---|
| E1 | `js/models/life/zombie/` (generator zombie, SDF Walkers, SDF Morgue) — to postacie człekokształtne; po wydzieleniu ludzi pasuje do `js/models/human/zombie/` albo osobnego `js/models/characters/` (decyzja) | S / niskie |
| E2 | `js/models/structures/structures/` — podwójna nazwa; np. `structures/coastal/` (nabrzeże, falochron) i `structures/offshore/` (platforma) | S / niskie |
| E3 | `js/envs/land/skykit.js`, `rainkit.js` — niebo i deszcz służą też wodzie (laboratoria wody, wyglądu, statków); miejsce: `js/envs/sky/` (wspólne dla lądu i wody) | S / niskie |
| E4 | `js/models/ships-sea/world/` (`constants.js`, `models.js` — klasy i proste modele okrętów z gry Battle, używane przez doktora i transformator) — nazwa „world” jest z gry; np. `ships-sea/game-classes/` | S / niskie |
| E5 | Duże pliki do ewentualnego podziału (gdy będą rosły): `shipkit.js` (98 kB, 1864 linie), `musickit.js` (71 kB), `physics.js` pociągu (59 kB — zostaje 1:1 z aTrain, nie dzielić bez potrzeby), `index.html` (56 kB — dane kafelków wyjdą w D1) | M / średnie |
| E6 | `labs/CHANGELOG.md` w folderze stron → `docs/history/` (C4) | S |

## F. Optymalizacja

| # | Co | Praca / ryzyko |
|---|---|---|
| F1 | **Tryb legacy r128** w `js/core/three-global.js` (łatki shaderów świateł, render targety jak w r128) używają już tylko doktor i kitcheck — przełączyć je na grafikę Battle i usunąć gałąź legacy (kitcheck porównuje geometrię, więc wzorzec się nie zmieni; doktor pokaże modele jak laboratoria) | S / niskie |
| F2 | Czcionki: Antonio, Oswald, Roboto Condensed (6 plików woff2) są już tylko w skali, skórkach (makieta) i `lab.css` (nadpisane przez okna). Po D2 i ujednoliceniu skali zostają tylko w makiecie skórek | S / niskie |
| F3 | `js/models/human/data/human-head.js` (207 kB tekstu) — dane głowy jako liczby w JS; jako binarny `.bin`/`.json` mniejszy i szybszy do wczytania | S / niskie |
| F4 | Kitki Space ładowane jako globalne skrypty przez `three-global.js`; docelowo importy ES jak w Battle (jeden sposób ładowania, mniej globali `window.*`) — duża, stopniowa praca | L / średnie |

## G. Spójność

| # | Co | Praca |
|---|---|---|
| G1 | CSP: tylko 12 stron (Battle i nowe) ma politykę bezpieczeństwa; strony Space — brak. Ujednolicić (Space ma style w `<style>` i atrybuty `style=`, więc trzeba je przenieść do plików CSS albo dopuścić) | M |
| G2 | `<html lang>`: pasek menu ustawia język, ale strony mają w kodzie różne wartości; laboratorium języka po polsku, reszta po angielsku — zgodnie z decyzją (panele EN) | S |
| G3 | Wersje SDF Walkers i laboratorium języka: 0.23.0 z NeuroLabPA, a `js/labs/walkers/version.js` trzyma własną — dwie wersje jednej strony; zostawić jedną (`versions.js`) | S |

## H. Testy

| # | Co | Praca |
|---|---|---|
| H1 | Kitcheck nie przeszedł w całości od 0.5.0 — uruchomić raz po porządkach (długo trwa) | S |
| H2 | `lab-check.py` — naprawa w B1 | S |
| H3 | GitHub Actions: dziś tylko wdrożenie; dodać szybki test (składnia JS `node --check`, martwe ścieżki z C1, spójność rejestru z D1) na każde wypchnięcie | M |
| H4 | Skrypt sprawdzania ścieżek (użyty w tym audycie) jako `tools/paths.py` — żeby martwe ścieżki nie wracały | S |

## J. UI w jednym folderze i nowy wygląd części elementów (prośba właściciela, 2026-11-01)

Dziś interfejs jest rozsiany: `css/lab.css` (Space), `css/lab-sea.css` (Battle), `css/windows.css` (okna + nakładka
na panele Space), `css/envswitch.css`, `css/fonts.css`, `css/pixel.css`, `css/walkers.css`, `css/lang.css`,
`css/morgue.css`, style w `<style>` każdej strony Space, style paska menu jako tekst w `js/labkit/menubar.js`, a JS
komponentów w `js/labkit/`. Pozostałości stylu Space poza oknami: przycisk CHANGE VIEW i pola KEEP (stary system
bloków laboratorium statków — dziś robią to okna), napis ładowania („GENERATING HULL…”, Oswald, niebieski), strzałki
poprzedni/następny (niebieskie), suwaki przewijania (niebieskie), czcionki Antonio/Oswald/Roboto Condensed w treści.

| # | Propozycja | Praca |
|---|---|---|
| J1 | Folder `ui/` — cały interfejs, plik na komponent: `tokens.css` (kolory, odstępy, promienie, czcionki), `fonts.css`, `base.css` (reset, typografia, przewijanie), `controls.css` (przyciski, strzałki, suwaki, pola, pole wyboru, lista), `panels.css` (treść okien: sekcje, wiersze, nagłówki — zastępuje panelowe części `lab.css` i `lab-sea.css`), `bar.css` (górny pasek laboratorium), `loader.css`, `windows.css` + `windows.js`, `menubar.css` + `menubar.js` (style wyjęte z JS), `envswitch.css` + `envswitch.js`, `versions.js` | L |
| J2 | Nowy wygląd: czcionka, ładowanie i jego napisy, przewijanie, strzałki, pole wyboru — projekt do akceptacji (strona z kontrolkami), potem wdrożenie we wszystkich laboratoriach | M |
| J3 | Laboratorium statków: CHANGE VIEW, KEEP i klawisz C zastąpione oknami (każdy blok = okno) | S |
| J4 | Style własne laboratoriów (`walkers.css`, `lang.css`, `morgue.css`, `pixel.css`, `<style>` stron Space) — tylko układ strony; kolory, czcionki i kontrolki z `ui/` | M |

## I. Większe decyzje na przyszłość (do rozważenia, nie do zrobienia od razu)

- I1. Laboratoria Space i Battle mają już jeden wygląd, ale dwie implementacje paneli (`lab.css` + nakładka w `windows.css` vs `lab-sea.css`). Docelowo jeden zestaw klas paneli.
- I2. SDF Walkers i laboratorium języka — przejście na okna z opcjami (jest w `TODO.md`).
- I3. Panele laboratoriów po polsku (jest w `TODO.md`).

---

### Kolejność, gdyby robić wszystko

1. A (śmieci) + B1–B3 (błędy) + D2 (martwy markup) + F1 (tryb legacy) — szybkie, niskie ryzyko.
2. C1–C5 (dokumentacja i komentarze) + E1–E4, E6 (foldery) — razem, bo przenosiny zmieniają ścieżki w dokumentacji.
3. D1 (rejestr laboratoriów) + H3–H4 (testy w Actions) — żeby błędy typu B2 i C1 nie wracały.
4. D3–D6, F2–F3, G — porządki punktowe.
5. F4, I — większe przebudowy, osobno.
