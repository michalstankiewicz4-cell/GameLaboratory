# GameLaboratory — zmiany

Wersja programu i każdego laboratorium: `ui/data/versions.js`. `x.y.z` — y: nowa funkcja, z: poprawka.
Historia laboratoriów Space sprzed przeniesienia: `docs/history/space-labs.md` (i reszta historii w `docs/history/`); Battle i aTrain — w historii git.

## Program 0.115.0 — 2026-11-27 (strona startowa: wyszukiwanie u góry)

### Dodane
- Strona startowa: pasek wyszukiwania u góry, obok przycisków-ikon (jak na zrzucie Canvas) — szuka w nazwach, opisach
  (po polsku i angielsku), frazach i plikach laboratoriów i narzędzi oraz w nazwach i opisach scen; pierwszy wynik
  przewija się w widok. Zastępuje pole wyszukiwania pod nagłówkiem Laboratoria (frazy zostają tam). Strona przewija
  się pod pasem tła, więc nic nie prześwituje za paskiem i ikonami.

## Program 0.114.5 — 2026-11-27 (strona startowa bez konsoli)

### Zmienione
- Strona startowa bez konsoli: bez przycisku w prawym górnym rogu i bez okna (skrypt konsoli wczytują tylko strony
  laboratoriów i narzędzi; dziennik `LabLog` dalej zbiera wpisy). Zostają język, Pomoc i słońce / księżyc.

## Program 0.114.4 — 2026-11-27 (strona startowa: lewe menu jako panel)

### Zmienione
- Strona startowa: lewe menu to panel — odsunięty 16 px od krawędzi ekranu, zaokrąglony, z obramowaniem i cieniem jak
  pozostałe panele (`--sideGap`); treść i przypięta konsola zaczynają się za nim. Gdy menu nie mieści się w oknie,
  przewija się własnym paskiem, odsuniętym od zaokrąglonych rogów.

## Program 0.114.3 — 2026-11-27 (strona startowa: przyciski-ikony)

### Zmienione
- Strona startowa: przyciski w prawym górnym rogu to okrągłe ikony z podpowiedziami i lekkim cieniem (nowy token
  `--shadowSoft`) — język (globus z plakietką PL / EN), Pomoc (znak zapytania, otwiera menu), słońce / księżyc,
  Konsola (okno terminala; podświetlona, gdy otwarta).

## Program 0.114.2 — 2026-11-27 (przycisk języka)

### Poprawione
- Przycisk języka na stronie startowej (i OPCJE → Język w laboratoriach) nie działał, gdy w adresie była sekcja
  (`#labsSec` — po kliknięciu pozycji bocznego menu): przejście pod ten sam adres tylko przewijało, strona nie
  wczytywała się w nowym języku. Teraz przy niezmienionym adresie strona się przeładowuje (`reloadLang()`,
  `ui/shell/menubar.js`). Sprawdzone: z sekcją, z `?lang=` i bez — za każdym razem PL → EN.

## Program 0.114.1 — 2026-11-27 (strona startowa bez Opcji)

### Zmienione
- Strona startowa: bez menu Opcje w prawym górnym rogu — zostają język, Pomoc, słońce / księżyc i Konsola (Opcje są
  w laboratoriach).

## Program 0.114.0 — 2026-11-27 (strona startowa bez pasków)

### Zmienione
- Strona startowa bez paska menu, paska narzędzi i paska informacyjnego: boczne menu od góry do dołu, a w prawym górnym
  rogu mały zestaw — **Opcje**, przycisk języka (**PL / EN**, przełącza na drugi), **Pomoc**, słońce / księżyc i
  **Konsola** (`#labMenu.lmStart`). Logo, sceny, laboratoria, narzędzia i wersja są na samej stronie. Laboratoria
  bez zmian.

### Dodane
- OPCJE → Konsola → **Pokaż konsolę** — otwiera i zamyka konsolę na każdej stronie (`LabConsole.toggle()`, zdarzenie
  `labconsole:show`).

## Program 0.113.17 — 2026-11-27 (cienie: słabsze u góry i z lewej)

### Zmienione
- Cienie paneli (`--shadow`, `--shadowHi`, `--shadowBig`, Dzień i Noc): u góry i z lewej o połowę słabsze, na dole
  i z prawej jak dotąd — światło jak z lewej u góry. Przesunięte w prawo i w dół, ściągnięte ujemnym rozmyciem;
  wartości dobrane pomiarem (suma przyciemnienia tła przy każdej krawędzi: góra i lewa ≈ 50 % poprzedniej, dół
  i prawa ≈ 100 %).

## Program 0.113.16 — 2026-11-27 (mocniejsze cienie paneli)

### Zmienione
- Mocniejsze, dwuwarstwowe cienie pod wszystkimi panelami (`--shadow`, `--shadowHi`; Dzień i Noc): kafelki laboratoriów
  i scen, pole wyszukiwania, przyciski banera, pływające okna laboratoriów, konsola, listy menu, karta ładowania.

## Program 0.113.15 — 2026-11-27 (strona startowa: cień banera)

### Zmienione
- Strona startowa: baner (`section.hero`) ma mocniejszy, dwuwarstwowy cień — nowy token `--shadowBig` dla dużych
  paneli (Dzień i Noc); wcześniej ten sam co kafelki, przy dużym panelu ledwie widoczny.

## Program 0.113.14 — 2026-11-27 (strona startowa: kategorie jako plakietki)

### Zmienione
- Strona startowa: kategorie w bocznej kolumnie to plakietki (kropka i nazwa w kolorze kategorii), obok siebie, gdy się
  mieszczą; bez liczb — liczba laboratoriów i narzędzi w podpowiedzi. Wybrana kategoria — wypełniona swoim kolorem,
  biały napis.

## Program 0.113.13 — 2026-11-27 (strona startowa: Strona główna odznacza kategorię)

### Zmienione
- Strona startowa: pozycja „Strona główna” w bocznym menu też odznacza wybraną kategorię i przewija na górę (jak oba
  logo).

## Program 0.113.12 — 2026-11-27 (strona startowa: logo odznacza kategorię)

### Zmienione
- Strona startowa: kliknięcie logo GameLaboratory na pasku menu albo w bocznej kolumnie odznacza wybraną kategorię
  (wszystkie laboratoria wracają) i przewija na górę — bez przeładowania strony. Ponowne kliknięcie wybranej kategorii
  też ją odznacza (jak dotąd).

## Program 0.113.11 — 2026-11-27 (konsola: bez licznika na dole)

### Zmienione
- Konsola: bez licznika „pokazane / wszystkie” pod listą — liczby wpisów są na zakładkach rodzajów; lista sięga do
  dołu okna.

## Program 0.113.10 — 2026-11-27 (konsola: tylko zakładki z wpisami, filtr w opcjach)

### Zmienione
- Konsola: zakładka rodzaju bez wpisów się nie pokazuje (Wszystko — zawsze); gdy wybrany rodzaj nie ma już wpisów,
  wybór wraca na Wszystko. Wyczyść — na końcu rzędu zakładek.
- Wiersz filtra tekstu można ukryć: OPCJE → Konsola → Filtr tekstu (zapamiętane, dla wszystkich stron; ukryty filtr
  niczego nie filtruje).
- Przypinanie (okno / panel) i zamknięcie konsoli — po prawej stronie paska tytułu, także gdy konsola nie ma
  dodatkowych zakładek.

## Program 0.113.9 — 2026-11-27 (konsola: ikony wpisów, wysokość przeciąganiem)

### Zmienione
- Konsola: każdy wpis ma ikonę swojego rodzaju (ta sama co na zakładce; nazwa rodzaju w podpowiedzi) zamiast napisu
  BŁĄD / UWAGA / INFO.
- Konsola przypięta na dole: wysokość zmienia się przeciągnięciem jej górnej krawędzi, jak szerokość bocznych paneli
  (90 px – 75 % okna, dwuklik — domyślne 30 %); zapamiętana, ta sama na wszystkich stronach.

## Program 0.113.8 — 2026-11-27 (konsola: zakładki rodzajów z ikonami)

### Zmienione
- Konsola: rodzaj wpisów wybiera się zakładkami z ikonami zamiast listy rozwijanej — Wszystko, Błędy, Ostrzeżenia,
  Ładowanie, Informacje, Komunikaty; każda z ikoną w kolorze rodzaju i liczbą wpisów, wybrana na delikatnym tle
  akcentu, puste przygaszone (`ui/shell/console.js`, `console.css`).

## Program 0.113.7 — 2026-11-27 (strona startowa: konsola przy bocznym menu)

### Zmienione
- Strona startowa: konsola przypięta na dole zaczyna się przy bocznej kolumnie (menu), a nie przy lewej krawędzi
  ekranu (`ui/pages/start.css`); na wąskim ekranie, gdzie kolumny nie ma — od krawędzi.

## Program 0.113.6 — 2026-11-27 (strona startowa: biały napis zaznaczonej pozycji)

### Zmienione
- Boczne menu strony startowej: napis i ikona zaznaczonej pozycji są białe (`--onAccent`), także w motywie Dzień;
  akcent pod napisem mocniejszy (zanika dopiero za połową paska), żeby biały był czytelny także w dłuższych nazwach.

## Program 0.113.5 — 2026-11-27 (strona startowa: zaznaczona pozycja)

### Zmienione
- Boczne menu strony startowej: zaznaczona pozycja to pasek akcentu, który w prawo przechodzi w tło kolumny
  (wcześniej pełny pomarańcz z cieniem); tekst w kolorze tytułów.

## Program 0.113.4 — 2026-11-27 (strona startowa: boczne menu)

### Poprawione
- Boczne menu strony startowej: po kliknięciu „Laboratoria” podświetlały się „Sceny”. Podświetlenie wybierało
  ostatnią sekcję z listy menu nad linią, a Sceny stoją na stronie nad Laboratoriami; teraz sekcję, której nagłówek
  jest najbliżej nad linią. Sprawdzone: każda pozycja podświetla siebie, nagłówek staje pod paskami.
- Sprawdzone przy okazji (0.113.3): przełącznik Okna | Panele we wszystkich 40 stronach, które go mają (Okna → Panele →
  Okna, z otwartą konsolą) — żadna się nie zawiesza; w trybie Okna nie ma powtarzających się przeliczeń układu.

## Program 0.113.3 — 2026-11-27 (Okna | Panele bez zawieszenia)

### Poprawione
- Przełączenie na **Okna** zawieszało przeglądarkę (od 0.113.0): `layoutView()` za każdym razem ustawiał ukrytym
  uchwytom szerokości paneli `hidden` od nowa — to też zmiana atrybutu, więc obserwator zmian (`MutationObserver`)
  wołał `layoutView()` znowu, bez końca. Teraz `hidden` zmienia się tylko, gdy ma inną wartość
  (`ui/shell/windows.js`). Sprawdzone: przed poprawką strona przestaje odpowiadać po kliknięciu, po — odpowiada
  od razu, powrót do Paneli działa.

## Program 0.113.2 — 2026-11-27 (paski przewijania)

### Poprawione
- Paski przewijania w kolorze akcentu (przygaszony pomarańcz, pod kursorem pełny; tokeny `--scroll`,
  `--scrollHover`) zamiast szarych, w obu motywach. Strona startowa nie miała arkusza pasków (`ui/style/base.css`) —
  pokazywała szary pasek przeglądarki. W Chromium standardowe `scrollbar-width` / `scrollbar-color` wyłączały
  reguły `::-webkit-scrollbar` i wracały strzałki — teraz tylko tam, gdzie tych reguł nie ma (Firefox).

## Program 0.113.1 — 2026-11-27 (Noc: ciemny canvas)

### Zmienione
- Motyw **Noc** to teraz ciemna wersja canvasu: granatowe tło i szkło okien, ten sam pomarańczowy akcent `#F47D50`
  co w Dniu (wcześniej złoty), ciepłobiałe tytuły (`ui/style/tokens.css`).

## Program 0.113.0 — 2026-11-27 (wygląd: Dzień i Noc, nowa strona startowa, Sceny)

### Dodane
- Motyw **Dzień** — jasny canvas (ciepłe tło `#F5F0E9`, panele `#FFF9F2`, akcent pomarańczowy `#F47D50`, granatowy
  tekst `#273247`, delikatne cienie) — obok **Nocy** (dotychczasowy ciemny wygląd z Battle). Domyślnie jak w systemie;
  OPCJE → Wygląd (Automatycznie / Dzień / Noc) i słońce / księżyc na prawym końcu paska menu; zapamiętany w
  przeglądarce, wspólny dla wszystkich stron (`ui/style/tokens.css`, `ui/shell/menubar.js`).
- Menu **SCENY** na pasku menu: edytor sceny i gotowe sceny (Port, Tornado z miastem, Układ silnika) — otwierają
  edytor z wybraną sceną (`editor/index.html?scene=<id>`, edytor 0.60.0; lista: `scenes` w `ui/data/catalog.js`).
- Szerokość bocznych paneli (tryb Panele) zmienia się przeciągnięciem ich wewnętrznej krawędzi (240 px – 45 % okna,
  dwuklik — domyślna); ta sama na wszystkich stronach, zapamiętana (`ui/shell/windows.js`).
- Strona startowa jak na zrzucie „Canvas”: boczna kolumna (sekcje, kategorie jako filtr laboratoriów), baner z hasłem,
  przyciskami i obrazkiem, karty gotowych scen z obrazkami (`assets/scenes/`), potem Szybki dostęp, Laboratoria,
  Narzędzia.

### Zmienione
- Okna i panele: większe zaokrąglenia (14 / 9 px), cienie z tokenów, wybrane przyciski z delikatnym tłem akcentu,
  okno pojawia się z krótką animacją, panel wsuwa się od krawędzi (bez animacji przy „ogranicz ruch” w systemie).
- Kolory wpisane w arkusze powłoki, kontrolek, laboratoriów z Battle, SDF Walkers, języka i obrazów — teraz z tokenów,
  więc zmieniają się z motywem.

### Poprawione
- SDF Walkers 0.23.6: laboratorium nie startowało („Cannot use import statement outside a module”) — przy wspólnych
  generatorach liczb (0.112.1) dostał `import`, a jest zwykłym skryptem; generator znów jest w pliku (te same liczby
  co `mulberry32` z `js/core/rng.js`).

## Program 0.112.6 — 2026-11-27 (doktor modeli: wiszące zastrzały)

### Dodane
- Doktor modeli 1.10.0: test `dangling` (ostrzeżenie) — ukośny pręt (zastrzał, podpora) trzymany tylko przy jednym
  końcu, z dolnym końcem wiszącym w powietrzu, jak dawny zastrzał sygnalizatora wychodzący ze złącza słupa i wysięgnika.
  Maszty, anteny i wysięgniki (wolny koniec u góry) są pomijane, szyba trzyma swoją ramę. Stanowisko testowe ma dwa
  zastrzały (zły i dobry). Sprawdzone: dawny błąd sygnalizatora zgłoszony, 240 modeli bez fałszywych alarmów. Opis:
  `docs/tools/doctor.md`.
- `AI_COLLABORATION.md`: informacja o nowym teście przy częstych błędach AI; kopia przeglądów i błędów z Tornado.io
  (do analizy).

## Program 0.112.5 — 2026-11-27 (poprawki: ognisko i sygnalizator)

### Poprawione
- Laboratorium efektów · ląd 1.0.5: kłody w ognisku pochylone wierzchołkami do środka (stożek, litera „A”) — wcześniej
  rozchodziły się w górę jak litera „V” (odwrócony znak obrotu).
- StreetKit (`js/models/streets/signals.js`), laboratorium ulic 1.0.3: zastrzał sygnalizatora z wysięgnikiem idzie od
  słupa (0,8 m niżej) w górę do wysięgnika — wcześniej wychodził ze złącza słupa i wysięgnika i wisiał w powietrzu.
- `AI_COLLABORATION.md`: nowa sekcja „Częste błędy AI w modelach” z oboma przypadkami.

## Program 0.112.4 — 2026-11-27 (wspólny widok laboratoriów)

### Zmienione
- `js/labs/shared/view.js`: `viewSize()` (widok w wolnym środku) i `fitTo(renderer, camera, …)` (renderer, kamera
  i potok obrazu na rozmiar widoku) — zamiast tej samej linii i tego samego wzoru w 24 laboratoriach (wersje
  +0.0.1: blocks 1.2.1, bodies 1.5.3, caves 1.3.1, city 1.3.6, effects-land 1.0.4, effects 1.4.2, filters 0.6.2, gameui 1.7.2, gear 1.2.1, items 1.2.4, land 1.10.2, look 1.8.3, materials 1.1.2, mechanics 1.0.6, plants 1.8.2, rocks 1.1.3, streets 1.0.2, structures 1.6.2, systems 1.5.1, transform 1.3.2, vehicles-land 1.25.1, vehicles-space 1.11.1, vehicles-water 1.6.2, water 1.5.2). Działanie bez zmian (sprawdzone: każde laboratorium wczytuje się, widok ma rozmiar
  wolnego środka po zmianie okna).
- TODO: budowle i rośliny na wspólnej scenie bazowej (potrzebne funkcje sceny), zapisane ustawienia przez `saved.js`
  stopniowo.

## Program 0.112.3 — 2026-11-27 (poprawka: LifeKit)

### Poprawione
- `js/models/life/lifekit.js`: import generatora liczb (0.111.9) trafił do środka funkcji opakowującej kit — błąd
  „Unexpected token '{'” w laboratoriach życia, człowieka, edytora stworów i pojazdów · kosmos (oraz wszędzie, gdzie
  ładuje się LifeKit). Import przeniesiony na początek modułu. Sprawdzone: każdy moduł zmieniony dziś wczytuje się
  w przeglądarce.

## Efekty · ląd 1.0.3 — 2026-11-27 (wspólna scena bazowa)

### Zmienione
- Laboratorium efektów na lądzie stoi na wspólnej scenie bazowej (`js/labs/shared/stage.js`: niebo, światło z pogodą,
  mgła) zamiast własnego nieba i świateł; gleba pod ogniskiem (MatKit) zostaje jako część laboratorium.

## Przedmioty 1.2.3 — 2026-11-27 (wspólna scena bazowa)

### Zmienione
- Laboratorium przedmiotów stoi na wspólnej scenie bazowej (`js/labs/shared/stage.js`) zamiast własnego nieba, świateł
  i gruntu; przedmioty wyglądają tak samo, grunt ma barwę wspólnej sceny.

## Skały 1.1.2 — 2026-11-27 (wspólna scena bazowa)

### Zmienione
- Laboratorium skał stoi na wspólnej scenie bazowej (`js/labs/shared/stage.js`: niebo, światło z pogodą, mgła, płaski
  grunt) zamiast własnego nieba, świateł i gruntu. Skały wyglądają tak samo; grunt ma barwę wspólnej sceny.

## Program 0.112.2 · items 1.2.2 · mechanics 1.0.5 — 2026-11-27 (W A S D z kamery orbitalnej)

### Zmienione
- Kamera orbitalna laboratoriów (`js/labs/shared/orbit.js`): `watchKeys()` i `moveKeys(dt, near)` — przesuwanie W A S D;
  laboratoria przedmiotów (tryb Deformation) i mechaniki korzystają z niego zamiast własnych kopii. Działanie bez zmian.

## Program 0.112.1 — 2026-11-27 (wspólny szum wartości)

### Zmienione
- `js/core/noise.js` — `valueNoise(rand, cx, cy)`: szum wartości dla tekstur proceduralnych w jednym miejscu; był ten
  sam w ShipKit (`shipkit/util.js`), TexKit pociągów (`train/texkit.js`) i efektach uszkodzeń (`effects/damage.js`).
  Te same liczby (sprawdzone porównaniem).

## Program 0.112.0 · edytor sceny 0.59.1 — 2026-11-27 (odłamki budynków a przedmioty)

### Dodane
- `js/behaviors/land/bodies-link.js` — połączenie światów brył na lądzie: odłamki budynków (DestructKit) i luźne
  przedmioty (beczki, opony, puszki — `land/items.js`) zderzają się. Odłamki bliskie przedmiotom wchodzą do świata
  przedmiotów jako bryły ruchome, a odrzut, który dały przedmiotom, wraca do nich co krok 1/240 s. Każdy świat liczy się
  jak dotąd, więc laboratoria działają bez zmian; to połączenie dwóch silników, nie jeden wspólny. Próba: odłamek
  40 kg przy 10 m/s uderza w beczkę 18 kg — beczka odlatuje z ok. 11 m/s, odłamek zwalnia do ok. 1 m/s.
- Edytor sceny, ▶ Graj: w scenie z budynkami z części i przedmiotami złomowiska łączy oba światy.

## Program 0.111.9 — 2026-11-27 (wspólne generatory liczb losowych)

### Zmienione
- `js/core/rng.js`: generatory z ziarnem w jednym miejscu — `lcg`, `lcgRaw`, `mulberry32`, `mulberry32nz`, `xorshift32`;
  korzysta z nich 20 plików (rośliny, skały, budynki z części, regiony, pixel art, efekty, ShipKit, nabrzeża, głowy SDF,
  chodzące, ekspertyza, bloki, pogoda, wyładowania, muzyka, życie, jaskinie, MatKit, laboratorium sztuki), a
  `js/core/util.js` oddaje `mulberry32` stąd. Wspólne są tylko te, które dają dokładnie te same liczby (sprawdzone:
  200 losowań dla 12 ziaren w każdym pliku; doktor modeli — wszystkie modele bez zmian). Inne warianty (ziarno mnożone,
  przesunięcie bez znaku) zostały w swoich plikach, bo inne liczby zmieniłyby wygląd.

## Program 0.111.8 — 2026-11-27 (wspólna kamera orbitalna laboratoriów)

### Zmienione
- `js/labs/shared/orbit.js` — `createOrbit`: stan kamery orbitalnej i wspólne wzory (obrót przeciąganiem, przybliżanie
  kółkiem, położenie na sferze wokół celu, przesuwanie W A S D); każde laboratorium podaje swoje granice i czułości, więc
  kamera działa jak dotąd. Przeszło 15 laboratoriów (wersje +0.0.1): city 1.3.5, effects-land 1.0.2, filters 0.6.1, items 1.2.1, land 1.10.1, look 1.8.2, materials 1.1.1, mechanics 1.0.4, plants 1.8.1, rocks 1.1.1, streets 1.0.1, structures 1.6.1, transform 1.3.1, vehicles-water 1.6.1, water 1.5.1. Kliknięcia, wybór i sterowanie
  na modelach zostały w laboratoriach. Laboratorium powierzchni ma inną kamerę — bez zmian.

## Program 0.111.7 — 2026-11-27 (O laboratoriach)

### Dodane
- Pomoc → O laboratoriach: autorzy (aplikacja stworzona w całości przy pomocy vibe codingu przez Michała Stankiewicza
  i Claude Opus 5.5), kontakt, podziękowania dla ekipy forum programistycznego 4Programmers.net z logo
  (`assets/4programmers.png`, bez czarnego tła).

## Program 0.111.6 — 2026-11-27 (wygląd i materiały budynków z części w modelach)

### Zmienione
- Materiały budynków z części (`materials.js`), bryła części (`extrude.js`) i wielokąty 2D (`geom2d.js`) przeniesione
  z zachowania zniszczenia (`js/behaviors/land/destruct/`) do modeli `js/models/houses/` — to dane modelu, jak
  właściwości złomowiska; zachowanie bierze je stamtąd. Wygląd budynku przed zniszczeniem (`houseModel`) z silnika
  sceny do `js/models/houses/house-model.js`. Działanie bez zmian (doktor: budynki bez zmian).

## Mechanika 1.0.3 — 2026-11-27 (wspólna scena bazowa)

### Zmienione
- Laboratorium mechaniki stoi na wspólnej scenie bazowej laboratoriów (`js/labs/shared/stage.js`: niebo, światło
  z pogodą, mgła, płaski grunt) zamiast własnej prostej sceny z Tornado.io — `js/labs/shared/sky-stage.js` usunięty.
  Hala (posadzka i lampy) z modelu układu silnika, posadzka 3 mm nad gruntem. Wyniki trybu Machine bez zmian.

## Program 0.111.5 · miasto 1.3.4 — 2026-11-27 (jedna lista budynków z części)

### Zmienione
- `js/models/houses/catalog.js`: jedna lista budynków z części (domy HouseKit i budynki Warszawy) z nazwami i opisami
  po angielsku i po polsku — z niej tryb Destruction laboratorium miasta i prefabrykaty sceny (wcześniej dwie listy).
  Prefabrykaty sceny mają teraz nazwy angielskie, jak reszta.

## Program 0.111.4 · miasto 1.3.3 — 2026-11-27 (jedna trąba w laboratorium miasta)

### Zmienione
- Scena bazowa (`js/labs/shared/stage.js`): `stage.tornadoControl` — laboratorium może sterować trąbą sceny (wir
  z liczb, krok i położenie liczone przez laboratorium; `release()` — znów pogoda). Tryb Destruction laboratorium
  miasta używa jej zamiast własnej trąby (były dwie: z pogody i z trybu). Działanie bez zmian.

## Program 0.111.3 · miasto 1.3.2 — 2026-11-27 (obrażenia od trąby w jednym miejscu)

### Zmienione
- DestructKit: `world.tornadoDamage(T, windAt, dt)` — wiatr trąby niszczy części w promieniu trzech rdzeni i budzi
  uśpiony gruz; wcześniej ten sam kod był osobno w laboratorium miasta i w scenie (`js/scene/destruct.js`). Działanie
  bez zmian.

## Program 0.111.2 — 2026-11-27 (schemat silnika)

### Zmienione
- Pomoc → Schemat silnika: budynki z części, ulice, elementy maszyn i układ silnika, skały; zachowania zniszczenia
  i układu silnika; fizyka — odłamki budynków, deformacja blachy, fizyka maszyn i obwody; Jobs/Workers częściowo
  (fizyka odłamków i deformacji we własnym wątku); gotowe sceny w edytorze.

## Miasto 1.3.1 — 2026-11-27 (poprawka)

### Poprawione
- Laboratorium miasta: błąd „Cannot read properties of null (reading 'update')” przy otwarciu strony z zapamiętanym
  trybem Destruction — pętla klatek ruszała przed wejściem w tryb (świat zniszczeń i tornado jeszcze nie istniały).

## Program 0.111.1 · mechanika 1.0.2 — 2026-11-27 (układ silnika jako model)

### Zmienione
- Układ silnika przeniesiony z laboratorium mechaniki: model `js/models/mech/assemblies/engine-layout/` (`machine.js` —
  maszyna i połączenia portów, `installation.js` — regulator, urządzenia, kable i lista połączeń zacisków,
  `engine-layout.js` — wejście) i zachowanie `js/behaviors/land/mech/engine-layout.js` (fizyka układu i krok klatki).
  Laboratorium i scena „Układ silnika” biorą je z tego samego miejsca; w laboratorium zostały okno Opis, kontrole brył
  zderzeń i hitboksy. Wyniki bez zmian (tryb Maszyna jak w Tornado.io, silnik w scenie 888 obr/min przy 30 Hz).

## Program 0.111.0 · edytor sceny 0.59.0 · mechanika 1.0.1 — 2026-11-27 (scena „Układ silnika”)

### Dodane
- Silnik sceny: zachowanie **mechanics** i prefabrykat `mech/machine` (`js/scene/mechanics.js`) — układ silnika
  z laboratorium mechaniki z fizyką i obwodem w ▶ Graj; zachowania mogą obsługiwać mysz (`pointer`, `hover`).
- Laboratorium mechaniki: `buildMachine({ hall })` (bez posadzki i lamp — dla sceny), tryb Fizyka działa bez okien
  strony; w laboratorium bez zmian.
- Edytor sceny: gotowa scena **Układ silnika**. Szczegóły: `editor/CHANGELOG.md`.

## Program 0.110.1 — 2026-11-27 (licencja)

### Dodane
- Plik `LICENSE`: licencja MIT (© 2026 Michał Stankiewicz) i licencje części cudzych (Three.js — MIT, czcionki — SIL
  OFL 1.1, dane budynków Warszawy — © współtwórcy OpenStreetMap, ODbL). Menu Pomoc → **Licencja (MIT)**.

## Program 0.110.0 · edytor sceny 0.58.0 — 2026-11-27 (scena „Tornado z miastem”)

### Dodane
- Silnik sceny: zachowanie **Zniszczenie** (`js/scene/destruct.js`) — budynki z części w jednym świecie DestructKit
  sceny; tornado z pogody niszczy części, gruz leci z wiatrem. Rodziny prefabrykatów: budynki z części
  (`js/scene/prefabs-houses.js`) i ulice (`js/scene/prefabs-streets.js`).
- Tornado (`js/envs/sky/tornado.js`): miejsce i kierunek startu w pogodzie (`tornado.at`, `tornado.heading`);
  scena bazowa: `stage.resetTornado()` (▶ Graj i Stop w edytorze zaczynają trąbę od początku).
- DestructKit: `world.dispose()` (świat i gruz zdjęte ze sceny).
- Edytor sceny: gotowa scena **Tornado z miastem** z zasobem pogody. Szczegóły: `editor/CHANGELOG.md`.

## Edytor sceny 0.57.0 — 2026-11-27 (gotowe sceny)

### Dodane
- Edytor sceny: lista **Sceny…** na pasku — gotowe sceny wczytywane jak plik (`editor/js/scenes/`); na razie Port
  (testowa). Szczegóły: `editor/CHANGELOG.md`.

## Program 0.109.0 · mechanika 1.0.0 · doktor modeli 1.9.0 — 2026-11-27 (laboratorium mechaniki z Tornado.io)

### Dodane
- **Laboratorium mechaniki** (`labs/mechanics.html`) w nowej kategorii **Maszyny i mechanika** (barwa mosiądzu
  `--cat-machines`). Trzy tryby:
  - **Items** — każdy z 27 przedmiotów osobno na stole, z ustawieniami, danymi, ostrzeżeniami i portami;
  - **Machine** — maszyna na żeliwnym łożu z elementów połączonych portami (silnik → sprzęgło kłowe → zębatki →
    przekładnia dwustopniowa → łańcuch → pas → przeguby Cardana → przekładnia planetarna → hamulec);
  - **Physics** — ta sama maszyna liczona fizycznie (luz z brył zębów, sprężystość, poślizg pasa, straty) z obwodem
    elektrycznym (wyłącznik, stycznik, falownik, przyciski, grzybek, przełącznik I-0-II).
  Suwaki Silnik, Hamulec, Obudowy i Hitboksy w oknie Machine. `MechanicsApi`. Wyniki trybu Machine takie same jak
  w Tornado.io.
- **MechKit** (`js/models/mech/`): plik z Tornado.io (610 linii) podzielony na 6 części (`base.js`, `teeth.js`,
  `gears.js`, `loops.js`, `shafts.js`, `units.js`); `mechkit.js` eksportuje całość jak dotąd. **ControlKit**
  (`controls.js`): sterowanie i zasilanie obsługiwane na modelu. Dane fizyczne i elektryczne są w częściach. Opis:
  `docs/models/mech.md`.
- **Zachowania** `js/behaviors/land/mech/` (ląd): `drive.js` (napęd z portami), `physics.js` (XPBD na kątach),
  `contact.js` (bryły zębów), `circuit.js` (obwód elektryczny).
- Laboratorium podzielone na pliki (`js/labs/mechanics/`): `mechanics.js` (z 860 do 210 linii), `machine.js`,
  `physics-mode.js`, `items-mode.js`, katalog `items.js` (`items-drive.js`, `items-control.js`, `items-common.js`).
  Scena hali bez terenu: `js/labs/shared/sky-stage.js`. Opis: `docs/labs/mechanics.md`.
- Doktor modeli: przedmioty mechaniki (`mech/…`, 64 modele: ustawienia domyślne i warianty skrajne, planeEps 0,2 mm).
  Migotanie zlicowanych ścian w hamulcu tarczowym i falowniku 7,5 kW — w `TODO.md`.
- Klawiszologia: laboratorium mechaniki (W A S D, H).

## Program 0.108.0 · ulice 1.0.0 · doktor modeli 1.8.0 — 2026-11-26 (laboratorium ulic z Tornado.io)

### Dodane
- **Laboratorium ulic** (`labs/streets.html`, kategoria Świat, obok laboratorium miasta): 22 próbki — prosta ulica, łuk,
  skrzyżowania (4 i 3 wloty, sygnalizatory, znaki), aleja, droga wiejska, ścieżka, droga dla rowerów, sygnalizator,
  wiadukty (prosty, na łuku, łącznica), tunele (przez górę, z podporami, pod równym terenem), kładki (schody, schody
  naprzemienne, winda), przejście podziemne, latarnie i znaki, słupki, barierki i ekrany, miejsca parkingowe. Okna
  Section, Street furniture, Traffic lights; scena bazowa laboratoriów (niebo, pogoda, także zmienna, słońce).
  `StreetsApi`. Pliki: `js/labs/streets/` (`streets.js`, `scenes.js`, `build.js`, `ground.js`, `en.js`).
- **StreetKit** (`js/models/streets/`): plik z Tornado.io (1193 linie) podzielony na 13 części (nawierzchnie i przekroje,
  geometria, ulica i skrzyżowanie, sygnalizator, latarnie, znaki, wiadukt, słupki i barierki, pikietaż, parkingi, tunele,
  kładka, przejście podziemne); `streetkit.js` eksportuje całość jak dotąd. Opis: `docs/models/streets.md`.
- `js/labs/shared/saved.js` (z Tornado.io): ostrożne wczytywanie zapisanych ustawień laboratorium.
- Doktor modeli: ulice (`streets/…`, 53 modele; czyste, poza informacją o drobnych słupkach poręczy wiaduktu).

## Program 0.107.0 · miasto 1.3.0 · doktor modeli 1.7.0 — 2026-11-26 (zniszczenie z Tornado.io)

### Dodane
- **Zniszczenie budynków** (DestructKit z Tornado.io) jako zachowanie `js/behaviors/land/destruct/` (ląd): części pękają
  według materiału (mur, beton, deski, szkło, dachówka, blacha, belka), statyka podpór, odłamki jako bryły sztywne
  (także w wątku), uderzenia, wiatr, zderzenia rzuconych przedmiotów, drobny gruz na karcie, pożary (`burn.js`, w
  laboratorium jeszcze nieużyte). `world.js` z Tornado.io (508 linii) podzielony: świat `world.js`, pękanie i statyka
  `statics.js`, uderzenia i wiatr `impacts.js`, łącze z wątkiem `physics-link.js`. Częściowe wysyłanie na kartę:
  `js/render/partial-upload.js`. Opis: `docs/behaviors/destruct.md`.
- **HouseKit** (`js/models/houses/`): budynki z części — dom z cegły, „kostka”, stodoła, garaż, szopa, blok z wielkiej
  płyty; budynki Warszawy z laboratorium miasta przeliczone na części (`landmark-house.js`). Opis: `docs/models/houses.md`.
- Laboratorium miasta: tryb **Destruction** (przełącznik na pasku) — narzędzia uderzenie, rzut (przedmioty złomowiska
  i kamienie), trąba (klawisze 1 2 3), przejście trąby przez budynek, wioska sześciu budynków, odbudowa (B), okna
  Destruction (budynek, materiały) i Debris (tempo, limit odłamków, pauza). Zachowanie jak w Tornado.io (wyniki w tym
  samym zakresie co dwa przebiegi oryginału). `CityApi.mode('destruct')`, `CityApi.destruct`. Pliki: `js/labs/city/destruct/`.
- Doktor modeli: budynki HouseKit (`houses/…`, każda część osobną siatką; wszystkie czyste).

## Program 0.106.0 · przedmioty 1.2.0 — 2026-11-26 (deformacja z Tornado.io)

### Dodane
- **Deformacja blachy** (DeformKit z Tornado.io) jako zachowanie `js/behaviors/land/deform/` (ląd): powłoka PBD
  z plastycznością, utrzymaniem kształtu, zderzeniami z gruntem, prasą i podporami, między powłokami, chwytem; każda
  powłoka może liczyć się w swoim wątku. Podział na pliki: rdzeń `shell-core.js`, powłoka `shell.js`, osadzanie
  modelu `embed.js`, zderzacze `box.js`, wątek `shell-worker.js`. Opis: `docs/behaviors/deform.md`.
- Beczka JunkKit 1.1.0: opis powłoki z blachy w danych (`info.shell`), siatkę fizyczną buduje `js/models/junkyard/shells.js`
  — model rysowany bez zmian, nie wie o deformacji.
- Laboratorium przedmiotów: tryb **Deformation** (przełącznik na pasku) — plansza (pięć beczek pod prasami: pionowo,
  23°, 45°, 68° w kołyskach, bokiem między klinami) i kontener (siedem beczek w dwóch warstwach, jedna prasa); okno
  Deformation (prędkość prasy, podnieś prasy U, od nowa R, przezroczystość ścian, podgląd zderzaczy, zgniecenie każdej
  beczki), chwytanie beczki myszą, W A S D. Wyniki takie same jak w Tornado.io (sprawdzone na tych samych krokach).
  `ItemsApi.mode('deform')`, `ItemsApi.deform`. Pliki: `js/labs/items/deform/`.
- Okna laboratoriów: okno, którego panel strona ukryje (`hidden` na panelu — okno tylko dla jednego trybu), znika
  całe, także w trybie Panele (`ui/shell/windows.js`, `windows.css`).

## Program 0.105.1 · wygląd 1.8.1 · doktor modeli 1.6.0 — 2026-11-26 (z Tornado.io: doktor i trąba)

### Dodane
- Doktor modeli — ulepszenia z Tornado.io (był tam kopią): `opts.ground` (grunt pod modelem: `seethrough` nie patrzy
  spod ziemi, `facing` liczy grunt jako trafienie), części powielane (`InstancedMesh`) łączą w `floating` to, czego
  dotykają; filtr rodziny `python3 tools/doctor.py rocks/` (strona `?only=`), `--update` z filtrem przepisuje tylko tę
  część wzorca.
- Trąba powietrzna: wir na miarę `set({ strength, kind, rc, top, vmax })` (promień rdzenia, wysokość, prędkość
  zamiast liczb z siły) — z Tornado.io.

### Zmienione
- Pył i bryzga trąby: miękkie okrągłe drobiny zamiast kwadratowych (kolor i krycie bez zmian); wielkość drobin
  i wysokość wznoszenia nie większe, niż pozwala rdzeń.
- Doktor: `facing` zaczyna promienie najwyżej 1 cm od ściany (było 0,2 % modelu).

## Doktor modeli 1.5.1 — 2026-11-26 (normalne przy nierównej skali)

### Poprawione
- `seethrough` (dziura): normalna ściany przeliczana macierzą normalną, nie macierzą świata — przy nierównej skali
  osi ściana widziana z przodu mogła wyjść jako widziana od tyłu. Na stanowisku testowym zamknięta bryła rozciągnięta
  wzdłuż jednej osi (bez błędu; przed poprawką fałszywa dziura). Jedyna zmiana w modelach: znika fałszywa dziura w kadłubie
  swarmera (kadłub ściśnięty 0,62 × 1 × 1), wpisana dotąd w TODO jako błąd do naprawy. Zgłoszenie z przeglądu
  ChatGPT (`AI_COLLABORATION.md`).
- Opis doktora: które siatki są badane — siatka z choć jedną przezroczystą grupą materiałów wypada z testów w całości
  (dziś żaden model takiej nie ma).

## Program 0.105.0 · rośliny 1.8.0 · doktor 1.5.0 · edytor sceny 0.56.0 — 2026-11-26 (krzewy i kaktusy)

### Dodane
- **12 nowych roślin** (PlantKit): leszczyna, głóg, tarnina (krzewy), borówka czarna i wrzos (krzewinki), orlica
  (paproć), kosodrzewina (płożąca sosna), krzew kreozotowy, kolcowój, spinifeks (kępa trawy), saguaro i opuncja
  (kaktusy) — każda z własnym pokrojem, korą i liśćmi rysowanymi w kodzie; jesienią leszczyna żółknie, głóg
  i orlica rdzawieją, borówka czerwienieje. Saguaro ma żebra w bryle i ramiona dopiero od ok. 5,5 m (część nigdy).
- **Gdzie rosną** (roślinność na terenie): runo w lasach północy (borówka, orlica, wrzos pod sosnami), leszczyna na
  skrajach lasu, nad granicą lasu kosodrzewina, wyżej wrzos; na równinach żywopłoty z głogu, tarniny i leszczyny na
  skrajach zagajników; na pustyni kreozot, łoboda, spinifeks, kolcowój i opuncje na równinach, saguaro na
  kamienistych stokach.
- Doktor modeli sprawdza też skały (RockKit: 4 rodzaje × 5 kształtów).

### Zmienione
- Laboratorium roślin: kamera podchodzi bliżej do niskich roślin (krzewinki, kępy), można ją przybliżyć do 0,6 m.

## Program 0.104.0 · skały 1.1.0 · edytor sceny 0.55.0 — 2026-11-26 (skały na terenie)

### Dodane
- **Skały na terenie sceny** (`js/models/rocks/rockfield.js`, zasób „rocks” z laboratorium skał, okno Rumowisko →
  *Rocks for the scene editor*): rodzaj z biomu (granit na północy, wapień i granit na równinach, piaskowiec i bazalt
  na pustyni), miejsce z gruntu — więcej głazów na zboczach, piarg pod stromiznami, otoczaki na plażach, nic w wodzie.
  Każdy kamień leży wzdłuż stoku, ma własne proporcje i odcień. Kafelki 128 m do 600 m od kamery, piarg do ~220 m.
- Edytor sceny: Środowisko → **Skały**; API `env { rocks }`; lekarz sceny zna zasób; `RocksApi.saveField`.

### Zmienione
- Rumowisko w laboratorium skał: 8 wariantów kształtu, każdy kamień z własnymi proporcjami, pochyleniem i odcieniem.
## Efekty · ląd 1.0.1 — 2026-11-24

### Poprawione
- FireKit: płomienie z szerokiego obszaru (np. pożar trawy) to wiele węższych języków zamiast kilku szerokich;
  płomienie mniej przepalone do bieli.

## Program 0.103.0 · efekty 1.4.1 · efekty · ląd 1.0.0 — 2026-11-24 (ogień)

### Dodane
- **FireKit** (`js/render/effects/fire/firekit.js`): realistyczny ogień z wielu źródeł naraz, liczony na GPU — płomienie
  w barwach temperatury z poświatą, dym i iskry zależne od paliwa (drewno, trawa, guma i papa, papier) i od wiatru,
  migające światło ognia (kilka świateł dla najsilniejszych źródeł blisko kamery).
- **Laboratorium efektów · ląd** (`labs/effects-land.html`): strona „ląd” laboratorium efektów — ognisko, płonąca ściana
  z desek, opony, pożar trawy, papier i kartony, duży pożar; suwaki ognia i wiatru, dzień i noc; `FireApi` dla AI.
  Opis: `docs/labs/effects-land.md`.
- Laboratorium efektów 1.4.1: przełącznik środowiska prowadzi na stronę „ląd”.

## Program 0.102.0 · skały 1.0.0 · materiały 1.1.0 · edytor sceny 0.54.0 — 2026-11-21 (laboratorium skał)

### Dodane
- **Laboratorium skał** (`labs/rocks.html`, RockKit `js/models/rocks/rockkit.js`): skały z kodu w prawdziwej skali —
  granit (zaokrąglone głazy), wapień (bloki o ostrych krawędziach, wżery), piaskowiec (warstwy), bazalt (kanciasty,
  płaskie przełamy); kształty: głaz, blok, płyta, iglica, otoczak; mech na ścianach patrzących w górę i porosty
  plamami; powierzchnia z MatKit nakładana trójpłaszczyznowo (bez szwów). Wymiary, objętość, masa z gęstości skały.
  Tryb *Rumowisko*: głazy o rozkładzie wielkości jak w prawdziwym osuwisku i piarg wokół nich (instancje).
- Zasób „rock” (skała zapisana pod nazwą) i rodzina **Skały** w edytorze sceny (`rocks/granite`, `rocks/limestone`,
  `rocks/sandstone`, `rocks/basalt`, z wersją daleką); `RocksApi` dla AI.
- MatKit: materiały „Rock (limestone)” i „Rock (basalt)”.

## Program 0.101.0 · ląd 1.10.0 · rośliny 1.7.0 · edytor sceny 0.53.0 — 2026-11-21 (nawierzchnia i ściółka)

### Dodane
- **Nawierzchnia terenu** (LandKit): rumosz i żwir u stóp ścian skalnych, błoto płatami na płaskich brzegach północy,
  piasek z bliska ze zmarszczkami od wiatru i ziarnem (plaże, brzeg równin, pustynia).
- **Ściółka pod lasem**: igły pod iglastymi, liście pod liściastymi (jesienią barwniejsze), mech płatami, postrzępione
  brzegi; trawa na ściółce rzednie. Pokrycie lasem z tych samych reguł co rośliny (`forestCover`, `forestTexture` —
  `js/models/plants/vegetation.js`); w laboratorium roślin i na terenie sceny z roślinnością.

### Poprawione
- Lasy na terenie sceny urywały się na brzegach kafelków 256 m (każdy kafelek miał własne ziarno pola lasów) — pole
  lasów ma teraz jedno ziarno na całą mapę.

## Program 0.100.0 · ląd 1.9.0 · edytor sceny 0.52.0 — 2026-11-21 (cienie nierówności terenu)

### Dodane
- **Rzeźba terenu widoczna przy każdym świetle** (LandKit, `js/envs/land/landkit.js`):
  - **widoczność nieba** liczona z mapy wysokości (horyzont w 8 kierunkach do ok. 1,1 km): żleby, zagłębienia i podnóża
    zboczy widzą mniej nieba, więc dostają mniej jego światła i trochę mniej słońca — rzeźbę widać także w południe,
    gdy słońce nie rzuca cieni (`terrain.skyOcc` 0…1);
  - **normalna na piksel** z mapy wysokości (daleko siatka ma 4 teksele, cieniowanie zostaje szczegółowe);
  - **drobny relief gruntu z bliska** (do ok. 260 m): kępy i kamyki na trawie, mocniejszy i ostrzejszy na skale.

### Poprawione
- Drobny wzór gruntu z dala od środka mapy rysował paski przy kamerze (utrata precyzji w szumie) — siatka szumu
  zawija się teraz co 289 oczek.

## Program 0.99.0 · edytor sceny 0.51.2 — 2026-11-21 (klawiszologia, widok po schowaniu okien)

### Dodane
- **Pomoc → Klawiszologia** na każdej stronie: skróty klawiszowe tej strony w sekcjach (np. edytor sceny: edycja,
  stawianie modułów, konsola API, ▶ Graj — z klawiszami gracza tak, jak je ustawił). Jedno miejsce: `ui/data/keys.js`
  (moduł wczytywany przy otwarciu okna); nowy skrót w kodzie strony to wpis tam.

### Zmienione
- Gdy wszystkie okna panelu są schowane (H), panel znika, a scena zajmuje jego miejsce (`ui/shell/windows.js`,
  `.labDock.noWins`) — w laboratoriach i w edytorze sceny.

## Program 0.98.1 · edytor sceny 0.51.1 — 2026-11-21 (drzewa z wiatrem, H w edytorze)

### Zmienione
- **Roślinność w scenie z wiatrem pogody** (`js/labs/shared/stage.js`, `js/models/plants/vegetation.js`): drzewa
  bujają się, a liście i trawa drgają w kierunku wiatru — wiatru cyklonu albo dryfu chmur (wcześniej zawsze 225°);
  siła rośnie do 24 m/s (wcześniej stawała przy 16 m/s), więc w burzy i cyklonie gną się mocniej.
- Edytor sceny: klawisz **H** chowa i pokazuje okna, jak w laboratoriach.

### Poprawione
- Chmury przy cyklonie płynęły pod wiatr (przesunięcie wzoru chmur ma przeciwny znak) — teraz idą z wiatrem.

## Program 0.98.0 · wygląd 1.8.0 · edytor sceny 0.51.0 — 2026-11-21 (kamera i grunt w API sceny, cyklon dla AI)

### Dodane
- **API sceny** (`js/scene/api.js`): polecenie `camera { pos, target, fov }` — kamera widoku (cel: punkt albo obiekt;
  bez pól — odczyt); `add` z `ground: true` — model stoi na terenie pod `pos` (wysokość gruntu, jak poprawka lekarza
  sceny; `y` z `pos` — nad gruntem; na morzu linia wody).
- **`LookApi.cyclone`** w laboratorium wyglądu: włącz / wyłącz, ustawienia, przyspieszenie, stan teraz (strefa, wiatr).

### Zmienione
- **Cyklon**: w oku słaby, zmienny wiatr (ok. 4–7 m/s) zamiast zupełnej ciszy; morze z wiatru, który je wzbudził
  (`seaWind`) — w oku i tuż za ścianą fale zostają wysokie, w oku skłębione, ze wszystkich stron (`seaSpread`).
- **Ściana oka** kłębiasta: komórki chmur cieniowane od góry, jaśniejsze czubki i ciemniejsze zagłębienia, nierówna
  krawędź z wież na różnej wysokości.

### Poprawione
- Edytor sceny: z opisu usunięty skrót „H chowa okna” (nie było go).

## Program 0.97.1 · wygląd 1.7.1 · edytor sceny 0.50.1 — 2026-11-21 (ściana oka cyklonu)

### Poprawione
- **Ściana oka cyklonu** (`js/envs/sky/cyclone-sky.js`): rozchyla się ku górze jak trybuny stadionu (wcześniej
  zwężała się), sięga ok. 12 km i jest jasna, oświetlona słońcem — z oka widać białą ścianę chmur dookoła i niebo
  nad głową.

## Program 0.97.0 · wygląd 1.7.0 · edytor sceny 0.50.0 — 2026-11-21 (cyklon)

### Dodane
- **Cyklon w pogodzie** (`js/envs/sky/cyclone.js`): za duży na model, więc pole pogody — pogoda sceny z jej położenia
  względem środka: obrzeża (wysokie chmury, rosnący wiatr), spiralne pasma deszczu (szkwał z ulewą, potem przerwa),
  ściana oka (najsilniejszy wiatr, burza, widoczność prawie zero) i oko (cisza, przejaśnienie). Wiatr z profilu
  Hollanda (siła: burza tropikalna, kategorie 1–5), obrót zależny od półkuli, z napływem do środka i porywami. Cyklon
  wędruje, więc scena przechodzi przez strefy (domyślnie oko przechodzi nad sceną); w pasmach mogą się zrodzić trąby.
- **Niebo cyklonu** (`js/envs/sky/cyclone-sky.js`): warstwa chmur z pasmami w prawdziwych kilometrach od środka
  (przesuwają się nad sceną) i ściana oka dookoła, gdy scena jest w oku; chmury dryfują z wiatrem cyklonu.
- Wiatr cyklonu dla fizyki w `stage.windAt` (jak przy tornadzie); pole `cyclone` pogody, zapis z pogodą dla sceny.
- Laboratorium wyglądu: okno **Cyclone** — mapa z góry (pasma, oko, scena i jej droga), strefa i wiatr teraz,
  podgląd ×1 / ×60 / ×600, siła, promień oka, odległość i kierunek, wędrówka, półkula, trąby w pasmach.
- Edytor sceny: w ▶ Graj cyklon idzie dalej od miejsca z zasobu (`js/scene/weather.js`).

## Program 0.96.0 · wygląd 1.6.0 · edytor sceny 0.49.0 — 2026-11-21 (trąba powietrzna i tornado)

### Dodane
- **Trąba powietrzna i tornado w pogodzie** (`js/envs/sky/tornado.js`): wir od chmury do ziemi — nad wodą trąba wodna
  (jasny, cienki, wygięty lejek, wodny pył u podstawy), nad lądem tornado (ciemny, szerszy lejek, kurz i szczątki),
  nad nim wirująca chmura; siła 18…100 m/s ustawia wszystko naraz; wędruje po mapie, pojawia się i gaśnie. Pole
  `tornado` pogody (`{ on, strength, kind }`), scena bazowa je stawia; zapis z pogodą dla sceny.
- **Wiatr wiru dla fizyki** (wir Rankine'a z napływem przy ziemi i prądem wznoszącym): `stage.windAt` — w ▶ Graj
  okręty (napór i przechył), małe jednostki, pojazdy (opony trzymają do przyczepności), samoloty i przedmioty
  (opór powietrza).
- Laboratorium wyglądu: **Waterspout and tornado** (włącz, siła, rodzaj); zmienna pogoda — tornado w burzy (szansa
  i siła w oknie Variable weather).

## Program 0.95.0 · układy 1.5.0 · edytor sceny 0.48.0 — 2026-11-21 (układ planetarny i przedmioty bohatera w scenie)

### Dodane
- **Układ planetarny w scenie kosmosu**: prefabrykat `systems/system` (SystemKit) — cały układ z laboratorium układów
  (zasób „system”) z orbitami, które krążą same; światło sceny od jego gwiazdy. Laboratorium układów: zapis dla edytora
  sceny, `SystemsApi`.
- **Przedmioty bohatera jako modele sceny**: `gear/<id>` (GearKit) — latarka, lampa naftowa, światło chemiczne,
  zapalniczka, ekran telefonu, ze swoim światłem i migotaniem (np. w jaskini).

## Program 0.94.1 · rośliny 1.6.1 · doktor modeli 1.4.0 — 2026-11-21 (kora na zewnątrz)

### Dodane
- Doktor modeli: **rośliny** (PlantKit, `tools/doctor/sources/plants.js`) — każdy gatunek jako kora i liście.

### Poprawione
- PlantKit: trójkąty pni i gałęzi (`tube`) były nawinięte do środka — kamera widziała wewnętrzną ścianę kory, jakby
  pień był wywrócony na lewą stronę (zgłoszenie właściciela; doktor: `facing`). Teraz na zewnątrz — wszystkie gatunki,
  w laboratorium roślin, w roślinności sceny i w impostorach. Zostaje `seethrough`: otwarte końce pni i gałęzi (`TODO.md`).

## Program 0.94.0 · rośliny 1.6.0 · edytor sceny 0.47.0 — 2026-11-21 (roślinność krajobrazu w scenie)

### Dodane
- **Roślinność krajobrazu** (`js/models/plants/vegetation.js`): lasy, zagajniki, oazy, zarośla i trawa na terenie lądu
  według biomów (północny, równiny, pustynia) i gruntu (woda, wysokość, nachylenie) — reguły z laboratorium roślin,
  w kafelkach 256 m wokół kamery (pełne modele blisko, impostory dalej, trawa wokół kamery), światło, mgła i wiatr
  ze sceny. Scena bazowa: `stage.setVegetation(zasób)`.
- Laboratorium roślin (Krajobraz): zapis **roślinności dla edytora sceny** — zasób „vegetation” (gęstość, trawa, zasięg
  pełnych modeli, impostory, pora roku, ziarno); `PlantApi.saveVegetation`. Las w laboratorium bez zmian (te same reguły
  i ziarno).
- Edytor sceny: Środowisko → **Roślinność** (na terenie z laboratorium lądu); API `env { vegetation }`.

## Program 0.93.1 · UI gry 1.7.1 — 2026-11-21 (poprawki skórki terminal i podglądu kontrolek)

### Poprawione
- Skórka terminal: przycisk zamykania okna obrysowany w zieleni zamiast jasnej plamki.
- Podgląd kontrolek: podpisy wierszy barwą tekstu skórki (były blade).

## Program 0.93.0 · UI gry 1.7.0 · kontrola kitów 1.0.8 — 2026-11-21 (skórki w laboratorium UI, podgląd kontrolek)

### Dodane
- **Skórki terminal i syntax** w UI gry (`js/gameui/skins.js`, `css/skin-terminal.css`, `css/skin-syntax.css`): dwa wyglądy
  z laboratorium skórek — zielony ekran CRT z poświatą i kolorowy motyw edytora kodu — z tokenami, arkuszem i dźwiękami.
- **Podstawowe kontrolki w skórce** (`js/gameui/css/controls.css`): przyciski, suwak, przełącznik, lista wyboru, pole
  tekstowe, pola wyboru, przyciski opcji, zakładki; w laboratorium UI gry podgląd **Basic controls** (okno Skórka).

### Usunięte
- **Laboratorium skórek** (`labs/skins.html`): połączone z laboratorium UI gry (decyzja właściciela); opis —
  `docs/history/skins.md`. Kontrola kitów go już nie otwiera.

## Program 0.92.0 · edytor sceny 0.46.0 — 2026-11-21 (zmienna pogoda w grze)

### Dodane
- **Zmienna pogoda w ▶ Graj** (`js/scene/weather.js`, silnik wspólny dla edytora i gier): światło sceny z zasobu pogody
  z włączoną zmienną pogodą zmienia się w grze samo, od pogody zasobu (pora dnia i słońce z zasobu); po Stop — pogoda
  z zasobu.

## Program 0.91.0 · wygląd 1.5.0 · miasto 1.2.0 · ląd 1.8.0 · rośliny 1.5.0 · przedmioty 1.1.0 · budowle 1.6.0 — 2026-11-21 (zmienna pogoda)

### Dodane
- **Zmienna pogoda** (`js/envs/sky/weather-cycle.js`, od nowa na wzór „zmiennych warunków” aTrain): pogoda sama
  przechodzi między siedmioma pogodami — **tabela przejść** (z każdej pogody własne szanse przejścia do innych),
  **fronty jak w naturze** (przy pogarszaniu najpierw chmury i wiatr, deszcz i pioruny później; przy rozpogadzaniu
  deszcz ustaje pierwszy, chmury odchodzą na końcu; mgła gęstnieje, gdy osłabnie wiatr), **ziarno** (ta sama
  kolejność pogód), czas trwania pogody i przejścia.
- Przełącznik **Variable weather** pod listą pogód w oknie Światło i pogoda: laboratoria wyglądu, miasta, lądu,
  roślin, przedmiotów i budowli (`js/labs/shared/weather-cycle-ui.js`).
- Laboratorium wyglądu: okno **Variable weather** — pogoda teraz, pasek i lista nadchodzących pogód, podgląd ×1 / ×10 /
  ×60, zmiana pogody teraz, ustawienia i tabela przejść; zapis z pogodą dla sceny (`cycle` w zasobie „weather”);
  dla AI `LookApi.weatherCycle`. Edytor sceny zmiennej pogody nie gra.

## Program 0.90.0 · efekty 1.4.0 · pojazdy — ląd 1.25.0 — 2026-11-21 (dym i iskry z aTrain)

### Dodane
- **Dym i iskry na lądzie** (EffectKit: `js/render/effects/land.js`, z aTrain): **Dym (ląd)** — kłęby z wyporem i oporem
  powietrza, rosną, biorą prędkość źródła, ciemnieją nocą, gęstsze przy większym obciążeniu; **Iskry (ląd)** — spadają
  z przyspieszeniem ziemskim i odbijają się od gruntu. W laboratorium efektów obok dymu i iskier z kosmosu (te są
  bez grawitacji), z suwakami i zapisem pod nazwą.
- **Pociąg dymi i iskrzy z fizyki** (`js/render/effects/rail-fx.js`): dym z wydechu lokomotywy z siły napędu wobec mocy,
  iskry spod kół z mocy tarcia ślizgowego i obrzeża (buksowanie, zablokowane koła, łuki) — jak w aTrain.

### Zmienione
- Temat pociągu zamknięty (właściciel): teren i pogoda z aTrain nie są przenoszone — silnik ma laboratorium lądu
  i pogodę z laboratorium wyglądu.

## Kontrola kitów 1.0.7 — 2026-11-21 (nowy wzorzec)

### Zmienione
- Wzorzec `tools/kitcheck.golden.json` uaktualniony: 4 statki (CODEWING, SCRIBE, SWARMER, HAVEN — zwykłe i scalone)
  mają mniej części od 0.68–0.70 (strzały, dym, iskry i fala skanu przeszły do laboratorium efektów), wzorzec był
  sprzed tej zmiany. Kontrola znów przechodzi (54 modele zgodne).

## Program 0.89.1 · miasto 1.1.1 — 2026-11-21 (porządki w kodzie, budynki pod adresami)

### Zmienione
- **Kity ze Space jako moduły ES**: ShipKit (i statki), BodyKit (i rodzaje ciał), BaseKit, VehicleKit, MarineKit,
  LifeKit (i ludzie, stwory), SurfaceKit, SystemKit, MusicKit same importują `THREE` (`js/core/three-global.js`
  eksportuje go) i kity, których potrzebują, i eksportują swój kit; `window.*` zostaje dla stron, które go czytają.
  Kolejność ładowania wynika z importów, nie z kolejności znaczników na stronie.
- **ShipKit podzielony** (1713 linii): `shipkit.js` — definicje statków i API; części w `js/models/ships-space/shipkit/`:
  `util.js`, `plating.js`, `shared.js`, `effects.js`, `blocks.js`, `shaping.js`.
- **MusicKit podzielony** (1135 linii): `musickit.js` — synteza i odtwarzacz; `data.js` — nuty, skale, nastroje,
  piosenki; `compose.js` — melodia piosenki i plik MIDI.
- Bez zmian w tym, co widać i słychać (kontrola kitów i doktor modeli).
- **Budynki Warszawy pod adresami** (miasto): zamiast nazw własnych — adresy, w nazwie i identyfikatorze (`defilad-1`,
  `jerozolimskie-54`, `zlota-44`, `emilii-plater-49`, `chmielna-69`, `europejski-1`, `rondo-onz-1`, `twarda-2-4`,
  `chlodna-51`); dane z mapy bez tagów `name`; `tools/city-osm.mjs` wybiera budynek po elemencie OSM, nie po nazwie.
  Bryły bez zmian. Stare identyfikatory już nie działają — zapisany zasób `building` z nimi buduje się
  jako zwykły budynek.

## Program 0.89.0 · pojazdy — ląd 1.24.0 · efekty dźwiękowe 1.3.0 · edytor sceny 0.45.0 — 2026-11-20 (dźwięki maszyn, turbiny, szyn)

### Dodane
- SfxKit: **agregat hydrauliczny** (ciągły, obciążenie), **turbina** (obroty, obciążenie, wielkość: mała gazowa … wielka
  parowa), **koła na szynach** (toczenie i stuki na stykach z prędkością, długość szyny, rozstaw wózka) i **zgniatanie**
  (puszka, złom, papier).
- **Dźwięki maszyn złomowiska** w ▶ Graj (`m.sound()` w `js/behaviors/land/machines/machines.js`): zgniatarki — agregat
  w ruchu, trzask każdego zgniecenia, dobicie przy docisku; piec na papier — ogień z jego mocą; piec indukcyjny —
  buczenie cewki pod prądem, hydraulika przechyłu, syk wylewu; linia odlewnicza — silnik przenośnika, stuk gotowej
  sztabki i rozdzielacza. **Przeładowarka**: hydraulika ramienia z drążkami, stuk szczęk, dobicie złapanego ładunku.
  Dźwięk zachowania (`run.sound()`) gra dźwięk sceny (`js/scene/sounds.js`) w miejscu obiektu.
- **Turbiny**: ORP Błyskawica (parowe) i M1A2 Abrams (gazowa) grają turbiną zamiast silnika tłokowego (dane modeli
  `info.sounds.engine.kind`).
- **Pociąg i tramwaj** w laboratorium pojazdów lądowych: zdarzenia akustyczne fizyki z aTrain (styk szyn, podkład,
  sprzęg, łańcuch, zderzak) wreszcie grają (`js/audio/rail-sounds.js`), do tego toczenie z prędkością i pisk obrzeży
  kół z mocy tarcia obrzeża; słuchacz — kamera.

## Program 0.88.0 · muzyka 1.4.0 · edytor sceny 0.44.0 — 2026-11-20 (muzyka w scenie)

### Dodane
- **Muzyka w scenie** (`js/scene/music.js`): środowisko **Muzyka** gra w ▶ Graj (nastrój, piosenka albo zapisana),
  **Muzyka akcji** zastępuje ją po wybuchu, strzale, piorunie albo rozbiciu i ustępuje po 20 s spokoju. API:
  `env { music, musicAction }`, w grze `music { play | action }`; lekarz sceny zgłasza brakującą muzykę.
- Laboratorium muzyki: **SAVE FOR THE SCENE** — ustawienia jako zasób `music` (zapis i wczytanie z listy).

## Program 0.87.1 — 2026-11-20 (domyślnie panele, porządek w dokumentacji)

### Zmienione
- Okna laboratoriów, narzędzi i edytora sceny: **domyślnie Panele** (okna przypięte przy krawędziach, widok w wolnym
  środku); okno pływa dopiero po odpięciu pinezką albo przełącznikiem Okna | Panele (wybór zostaje zapamiętany).
- Dokumentacja: nowy opis strony wody laboratorium pojazdów (`docs/labs/vehicles-water.md`, w katalogu zamiast opisu
  Błyskawicy); dźwięk w opisach silnika, edytora, sceny, modeli (Polonez, Urbino 18, Abrams, Spitfire), laboratorium
  pojazdów lądowych i przewodnika; nowe pułapki (dźwięk); stare nazwy stron (`ship.html`, `warship.html`,
  `vehicles.html`) zamienione na obecne; z `TODO.md` usunięte zrobione punkty (są tu, w zmianach); z opisu MarineKit
  usunięta historia morza usuniętego z kitu; w edytorze — powtórzony, nieaktualny opis środowiska i zrobione
  propozycje; mapa dokumentacji: dźwięk (`docs/audio/`) i narzędzia sprawdzające.
- Usunięte (decyzja właściciela): historia doktorów ze Space i Battle, mapa laboratoriów z Battle, wykonany remanent
  (`docs/history/`) i notatki SDF Walkers z NeuroLabPA (`docs/labs/walkers/notatki/`) — zostają w historii git.
  Plan rozbioru laboratoriów (`docs/guides/lab-breakdown.md`) skrócony do tego, co zostało; przewodnik po
  laboratoriach z Battle oczyszczony z nieaktualnych zdań.
- **Przewodnik dla AI** (`docs/guides/ai.md`): jak pracować z GameLaboratory, co tworzy każde laboratorium, API
  sceny i laboratoriów z przykładami, przepisy (sprawdzone w edytorze), granice; podlinkowany na górze mapy dokumentacji.
  Usunięte nieużywane zrzuty SDF Walkers (`docs/labs/walkers/img/`).

## Program 0.87.0 · UI gry 1.6.0 · efekty dźwiękowe 1.2.0 · muzyka 1.3.1 · mowa 1.0.1 · edytor sceny 0.43.0 — 2026-11-20 (dźwięki UI, pełny reset)

### Dodane
- **Dźwięki UI gry** (`js/gameui/sounds.js`): kliknięcie i najechanie na przycisk, otwarcie i zamknięcie ekranu
  menu albo okna, powrót, pisanie tekstu dialogu, wybór, kupno i odmowa w drzewku, baner, wpis w dzienniku — każda
  skórka ma swój zestaw (space: piknięcia, battle: metalowe przekaźniki i klawisze, engine: ciche tyknięcia), własny
  w polu `sounds` skórki (zasób uiskin); laboratorium UI: okno Skórka → **Sounds** z odsłuchem.
- **Głosy postaci w dialogu**: `say({ who, text, voice })` albo `voices: { postać: głos }` w definicji UI — gotowy
  głos VoiceKit albo zapisany w laboratorium mowy; laboratorium UI: okno Dialog → **Voice**; API sceny `ui say { voice }`.
- Mikser: szyna **interfejsu** (`ui`) z głośnością gracza `settings.audio.ui` — suwak **Interface** w Opcje → Dźwięk
  i w oknach Mikser laboratoriów dźwięku.
- SfxKit, dźwięk interfejsu: nowe rodzaje (pik, tyk, przekaźnik, otwarcie, zamknięcie, klawisz, potwierdzenie,
  odmowa), ton i poziom.

### Zmienione
- OPCJE → **Wyczyść zapisane ustawienia** czyści całą pamięć GameLaboratory w przeglądarce: localStorage
  i sessionStorage (ustawienia wszystkich stron, układ okien, paski, język, zasoby z nazwą, sceny, dziennik),
  IndexedDB, pamięć podręczną, service workery i ciasteczka — wcześniej tylko ustawienia bieżącej strony.

## Program 0.86.0 · pojazdy — ląd 1.23.0 · efekty dźwiękowe 1.1.0 · edytor sceny 0.42.0 — 2026-11-20 (dźwięki modeli)

### Dodane
- **Dźwięki modeli jako zdarzenia** (`js/models/shared/sound-events.js`): model nie gra dźwięku, zgłasza ruch części
  (`onSound`: drzwi zaczynają się otwierać, podwozie doszło do końca…), a opis dźwięku ma w swoich danych
  (`info.sounds`). Słucha laboratorium albo gra (`js/audio/model-sounds.js`; w edytorze sceny — ▶ Graj).
  Polonez: zamek i trzaśnięcie drzwi; Urbino 18: syk drzwi pneumatycznych; Abrams: właz; Spitfire: hydraulika
  i blokada podwozia, klapy, owiewka.
- Dane silników w modelach (`info.sounds.engine`: cylindry, obroty, napęd elektryczny) — Polonez, Abrams, Spitfire,
  Błyskawica, Orzeł, barka; Urbino 18, nurek i łaziki — elektryczne. Dźwięk silnika w scenie bierze je stąd.
- SfxKit: **drzwi / właz** (samochód, właz, autobus, drewniane; otwarcie, zamknięcie) i **hydraulika / serwo** (czas,
  ton, blokada) w nowej kategorii Mechanizmy; odległość pełnej głośności każdego dźwięku (`REF`) w kicie.
- Laboratorium pojazdów lądowych słucha modeli (część robocza, podwozie, klapy).
- ▶ Graj: część robocza modelu (drzwi, właz, owiewka, rampa) jako akcja **work** jazdy, lotu i małej jednostki.
- Edytor sceny: **podgląd zasięgu dźwięku** — przy zaznaczonym obiekcie z dźwiękiem dwie kule (pełna głośność
  i granica 10%), suwak **Zasięg dźwięku** w oknie Właściwości (pole `soundRange`, także w API).

### Zmienione
- Urbino 18 jest elektryczny — w 0.85.0 grał jak diesel.

## Program 0.85.0 · edytor sceny 0.41.0 — 2026-11-20 (dźwięk w scenie)

### Dodane
- **Dźwięk w scenie** (`js/scene/sounds.js`): w ▶ Graj obiekt z polem **Dźwięk** gra w swoim miejscu i idzie za nim —
  gotowy dźwięk (ogień, silnik, ptak…), gotowe tło miejsca (las, park, brzeg morza, burza, noc, ognisko) albo zapisane
  w laboratorium efektów dźwiękowych; silniki pojazdów z zachowań (samochód z biegami, okręt, mała jednostka, samolot,
  przeładowarka; łaziki i nurek — napęd elektryczny; statki kosmiczne — huk silników z mocą); strzały i wybuchy statków,
  rozbicie samolotu lub lądownika, efekty z polecenia `effect` — swój dźwięk. Głośność maleje z odległością od kamery.
- API sceny: pole `sound` w `add` / `set`, polecenie `sound { sound, at }`; lekarz sceny zgłasza brakujący dźwięk.
- SfxKit: źródło w miejscu przesuwane (`move`), odległość pełnej głośności (`ref`).

## Program 0.84.0 · laboratorium dźwięku: muzyka 1.3.0, efekty 1.0.0, mowa 1.0.0 · UI gry 1.5.0 · edytor sceny 0.40.0 — 2026-11-20 (grupa dźwięku i mikser)

### Dodane
- **Mikser silnika** (`js/audio/mixer.js`): jeden kontekst Web Audio, szyny muzyki, otoczenia, efektów i mowy →
  kompresor → głośność ogólna i wyciszenie; dźwięk przestrzenny (słuchacz = kamera, źródła w miejscu, HRTF); wspólny
  szum; strumień do nagrań. Opis: `docs/audio/README.md`.
- **Ustawienia dźwięku gracza** (`settings.audio`: ogólna, muzyka, otoczenie, efekty, mowa, wyciszenie) i gotowy ekran
  Opcji **Dźwięk** w UI gry (`screens: { audio: 'standard' }`, obok Grafiki i Sterowania).
- **Grupa dźwięku** (przełącznik na pasku, barwa `--sound`): muzyka · efekty · mowa.
- **Laboratorium efektów i otoczenia** (`labs/sound-effects.html`, kit **SfxKit** `js/audio/sfx/`): wybuchy, strzały,
  grzmot, plusk, uderzenia (z aTrain), trafienia, ptaki, dźwięki interfejsu (z Battle); dźwięki ciągłe — wiatr,
  deszcz, morze, strumień, ogień, świerszcze, miasto, silnik, pisk koła, buczenie prądu; tła miejsc z warstw (las,
  park, brzeg morza, burza, noc, ognisko); dźwięk w przestrzeni; zasoby `sound` i `ambience`; `window.SfxApi`.
- **Laboratorium mowy** (`labs/sound-speech.html`, kit **VoiceKit** `js/audio/voice/`): mowa przeglądarki (w wybranym
  języku), głos syntetyczny z formantów (sylaby z tekstu, intonacja), szept; efekty głosu (radio, robot, echo,
  odległość), nagrywanie, gotowe głosy, zasób `voice`; `window.VoiceApi`.
- Okno **Mikser** w laboratoriach dźwięku (`js/labs/shared/mixer-window.js`) — te same głośności co w grze, mierniki szyn.

### Zmienione
- Laboratorium muzyki: gra przez szynę muzyki miksera, okno Mikser; głos robota i szepty MusicKit przeniesione do
  VoiceKit (brzmią tak samo).
- Edytor sceny: ▶ Graj ustawia głośności z Opcji → Dźwięk i słuchacza w kamerze.

## Program 0.83.0 · laboratorium miasta 1.1.0 · edytor sceny 0.39.1 · doktor modeli 1.3.2 — 2026-11-20 (budynki Warszawy)

### Dodane
- **Budynki Warszawy z OpenStreetMap w laboratorium miasta** (grupa „Warsaw (OpenStreetMap)”): pl. Defilad 1
  z iglicą, dworzec przy Al. Jerozolimskich 54, Złota 44, Emilii Plater 49, Chmielna 69, pl. Europejski 1, rondo ONZ 1,
  Twarda 2/4 —
  bryła z mapy (obrys, części z wysokościami, początkiem nad gruntem, dachami i kolorami), wygląd CityKit (styl
  każdego budynku: mur, okna, parter, gzymsy; zmieniany w oknach Fasada i Parter), z wersją bliską i wypaloną daleką
  (pl. Defilad 1: ok. 470 000 → 17 000 trójkątów). Dane © współtwórcy OpenStreetMap (ODbL).
- `tools/city-osm.mjs` — pobiera budynki z Overpass do `js/models/city/landmarks/osm-data.js`; uruchamiane w GitHub
  Actions (`city-osm.yml`), wynik dopisywany do repozytorium.
- CityKit: obrys w swoim miejscu i z dziedzińcami, część zaczynająca się nad gruntem (`base`), pas bez okien nad
  ostatnią kondygnacją (`attic`), dachy namiotowe / iglice / stożki (`pyramid`) i kopuły (`dome`), wysokość dachu
  w metrach (`roof.height`), `build(opis)` — zwykły budynek albo z mapy (`landmark`); części budynku scalone po
  materiale, materiały kafelków wspólne.
- Edytor sceny: zasób `building` z budynkiem z mapy stawia go w scenie; doktor modeli bada budynki z mapy.

### Zmienione
- Laboratorium miasta: domyślna odległość przełączania na wersję daleką 2 × promień budynku (40–150 m) — dalej siatka
  z bliska migotała drobnymi ramami.

## Program 0.82.0 · laboratorium miasta 1.0.0 · edytor sceny 0.39.0 · doktor modeli 1.3.1 — 2026-11-20 (kreator budynków)

### Dodane
- **Laboratorium miasta** (`labs/city.html`, kit **CityKit** `js/models/city/`): kreator budynków — dom, kamienica, blok,
  wieżowiec, biurowiec, market — na dowolnym obrysie (prostokąt, L, U, narożnik ze ściętym rogiem albo narysowany
  na gruncie). Okna (pojedyncze, pasmowe, ściana kurtynowa; słupki, ślemię, wnęka), wejścia, witryny, przeszklenia,
  balkony, cokół, gzymsy i dachy (płaski z attyką, dwuspadowy, kopertowy, mansardowy) rozmieszczane proceduralnie
  z opisu (JSON); mur z materiałów MatKit. Zapis pod nazwą — zasób **building**; `CityApi` dla AI.
- **Wypalona fasada z paralaksą** — wersja daleka budynku: fasada wypalona na procesorze w tekstury (barwa, normalne,
  wysokość, AO / szorstkość / metaliczność, numer okna) z tego samego układu co siatka, ściany jako płaskie prostokąty
  z mapowaniem paralaksy (parallax occlusion mapping) — okna we wnękach, wystające parapety, gzymsy i balkony
  (kamienica ok. 7 000 → 170 trójkątów, blok 31 000 → 76, wieżowiec 78 000 → 188). Przełączanie z odległości.
- Okna świecą nocą — te same blisko i daleko (liczba z ziarna liczona tak samo w JS i w shaderze); w edytorze sceny
  z pory dnia światła sceny.
- Prefabrykaty `city/<rodzaj>` w edytorze sceny (rodzina „Budynki miasta”, wersja daleka, pole `asset` — budynek
  z laboratorium); doktor modeli bada wszystkie rodzaje (wersja bliska).
- Schemat silnika: budynki miasta w modelach, zasób „budynek”, wypalone fasady w renderze.

## Program 0.81.0 · UI gry 1.4.0 · edytor sceny 0.38.0 — 2026-11-20 (poziom jakości silnika)

### Dodane
- **Poziom jakości silnika** (`js/render/quality.js`): jedno miejsce, z którego czytają modele, materiały, efekty,
  woda i scena — ustawiany z ustawień grafiki gracza (`applyGraphics`), bez nich pełna jakość.
  - **Szczegóły modeli z odległości (LOD):** prefabrykaty z wersją daleką (`lod: true`, `build({ detail: 0.5 })` —
    okręty, budowle, rośliny, statki kosmiczne, roboty morskie, łaziki, moduły bazy, ciała niebieskie, ludzie i stwory,
    złomowisko); świat edytora przełącza je z odległości (próg z wielkości modelu × odległość szczegółów gracza),
    wersja daleka budowana przy pierwszej potrzebie, z własnym `tick`; model, którego części rusza zachowanie, zostaje
    bliski (`lodFree` — przedmiot, bryła — może być daleki).
  - **Tekstury:** niska jakość — mapy MatKit w połowie rozdzielczości (od następnego wczytania), filtrowanie
    anizotropowe 1 (od razu, wszystkie tekstury sceny).
  - **Gęstość efektów:** liczby cząstek EffectKit (odłamki, iskry, ogon kuli plazmy, holowanie…) i ognia pieca.
  - **Detal wody:** siatka morza 192 × 160 albo 96 × 80, drobne zmarszczki × 0,5 (`stage.setWaterDetail`).
  - **Zasięg widzenia:** daleka płaszczyzna kamery i zasięg cieni × 0,5…1.
  - **Cienie drobnych części:** siatki do 0,25 m bez cienia przy niższej jakości.
- Ustawienia gracza: `lod`, `texture`, `fx`, `water`, `view`, `smallShadows` w `settings.gfx`, w zestawach (lekki:
  0,6 · niskie · 0,5 · bez detalu · 0,7 · bez) i na ekranie Grafika.
- **Schemat silnika** (Pomoc → Schemat silnika, `docs/guides/engine-architecture.md`): stan 0.81.0 — fizyka brył na
  lądzie, przeładowarka i maszyny, wejście z klawiszami gracza, poziom jakości w renderze, drzewka i Opcje w UI gry,
  ustawienia gracza w zapisie, nowe zasoby z nazwą.

### Zmienione
- Magazyn ustawień przeniesiony do `js/core/settings.js` (warstwa wspólna — UI gry, edytor i render zależą od niego,
  nie od UI gry); przedmioty złomowiska w świecie przedmiotów (`itemKit`) — z modeli do zachowań
  (`js/behaviors/land/junk-items.js`; modele nie wiedzą o świecie fizyki).
- Dokumentacja: poziom jakości (`docs/guides/rendering.md`), prefabrykaty z LOD i `lodFree` (`docs/scene/README.md`),
  ustawienia gry (`docs/labs/gameui.md`), mapa dokumentacji, `CLAUDE.md` (Grafika), edytor (`editor/README.md`).

## Program 0.80.0 · UI gry 1.3.0 · edytor sceny 0.37.0 — 2026-11-20 (ustawienia gry: grafika i sterowanie)

### Dodane
- **Ustawienia gry** (`js/gameui/settings.js`, z Battle `js/core/settings.js` z historią): magazyn ustawień gracza
  (zapis w przeglądarce, sanitize) — grafika (rozdzielczość, wygładzanie, cienie i ich jakość, oświetlenie dynamiczne,
  poświata, jasność, nasycenie, licznik klatek; zestawy wysoka / lekka), mysz (czułość obracania i przybliżania),
  klawisze czynności (kody klawiszy, niezależne od układu klawiatury), proste ustawienia danej gry (np. głośność).
- UI gry: pozycje menu **zestaw** (`presets`) i **klawisze** (`keys` — klik i wciśnięcie klawisza), opcja wyboru
  `{ value, label }`, akcja `reset:<część>`; gotowe ekrany **Grafika** i **Sterowanie** (`"graphics": "standard"`,
  `"controls": "standard"`); `createGameUI(…, { settings })`, akcja `settings`, `ui.fps()`. Przykłady mają je w Opcjach
  albo w pauzie.
- Grafika gry na scenie: `js/render/game-graphics.js` (`applyGraphics`, `lookParams`, `lights`).
- **Laboratorium UI gry 1.3.0**: zmiany grafiki w menu widać od razu na scenie za UI.
- **Edytor sceny 0.37.0**: w ▶ Graj działają ustawienia gracza — grafika, czułość myszy i klawisze (sterowanie z kodów
  klawiszy z ustawień); po Stop edytor wraca do swojego wyglądu.

### Zmienione
- `TODO.md`: punkt 8 (Hive Hunger) odhaczony; PatientZero na potem.

## Program 0.79.0 · pojazdy (ląd) 1.22.0 · budowle 1.5.2 · edytor sceny 0.36.0 — 2026-11-20 (złomowisko: toczenie, odrzut, skala, ugięcie)

### Dodane
- Przedmioty na lądzie (`js/behaviors/land/items.js`): **walce** — opony, beczki, puszki i garnki są graniastosłupami
  (16 ścian bocznych dla dużych, 8 dla małych) i **toczą się po obwodzie**; opona ma bezwładność pierścienia; zderzenia
  brył wypukłych (SAT na normalnych ścian i iloczynach krawędzi). Kształt z zderzacza gry: `shapeOf`
  (`js/models/junkyard/properties.js`).
- Przeładowarka (`land/grapple.js`): **odrzut** — to, w co uderzy pojazd, oddaje impuls (prędkość wzdłuż i w bok, obrót,
  zawieszenie), uderzenie w głowicę chwytaka popycha wahadło; **ugięcie w łuk** — wysięgnik i ramię wyginają się pod
  ciężarem jak w grze (`js/models/junkyard/vehicle/bow.js`, z gry Złomowisko).

### Poprawione
- Zderzacze w skali: `obbFrom` bierze skalę z macierzy — maszyny, bryły otoczenia i przedmioty w skali obiektu
  (edytor sceny) zderzają się w swojej wielkości; maszyny w skali: tłok, tygiel, objętość tygla i form (× S³), sztabki
  i ruch strumienia metalu rosną z modelem.

## Program 0.78.1 · budowle 1.5.1 · edytor sceny 0.35.1 — 2026-11-19 (zgniatarka do puszek: niższa ścianka kosza)

### Poprawione
- JunkKit, zgniatarka do puszek v1.0.1 (z gry Złomowisko 0.4.2, commit przeniesiony z historią): ścianka kosza od
  strony zgniatarki niższa (0,38 m) — zsyp przechodził przez nią (test `pierce` doktora modeli) i wypchnięte puszki
  stawały na ściance; teraz zsyp jest nad nią i puszki zsuwają się do kosza (w próbie 22 z 25). Wzorzec doktora:
  bez wyniku `pierce`, 5420 trójkątów zamiast 5492 (mniej prętów siatki w niższej ściance).

## Doktor modeli 1.3.0 — 2026-11-19 (test „pierce”)

### Dodane
- Test **`pierce`** (ostrzeżenie): zderzacz przechodzi na wylot przez cienki zderzacz (płytę) — wystaje z obu jej stron
  w obrębie jej powierzchni, a linia przecięcia biegnie przez płytę, nie przy jej krawędzi (zachodzące blachy w rogu
  i ściana na podłodze nie są błędem). Działa, gdy źródło poda zderzacze (`opts.colliders`); złomowisko podaje
  `colliders()` maszyn i otoczenia. Strona rysuje oba zderzacze krawędziami. Stanowisko testowe: zsyp przez ścianę
  (znaleziony), blachy w rogu i ściana na podłodze (nie).
- Wzorzec: nowy wynik w zgniatarce do puszek — zsyp przechodzi przez ściankę kosza (puszki wypchnięte na zsyp stają na
  ściance), i na stanowisku testowym.

## Program 0.78.0 · pojazdy (ląd) 1.21.0 · budowle 1.5.0 · edytor sceny 0.35.0 — 2026-11-19 (złomowisko w działaniu)

### Dodane
- Zachowanie **przedmioty na lądzie** (`js/behaviors/land/items.js`): luźne przedmioty jako bryły sztywne — grawitacja,
  grunt, zderzenia ze sobą, z bryłami nieruchomymi i ruchomymi (SAT, impulsy sekwencyjne, tarcie jak w grze: guma 0,9,
  reszta 0,55), **obroty od uderzeń** (przewracanie się, toczenie po krawędzi), usypianie stosów, zgniatanie skalą.
- **Maszyny złomowiska w działaniu** (`js/behaviors/land/machines/`, z gry Złomowisko z historią): zgniatarka do puszek
  i prasa 400 kN (tłok pcha przedmioty, zgniata najsłabszy wg `crush` / `minScale`, puszka → puszka zgnieciona), piec na
  papier (papier i tektura płoną, ogień i dym), piec indukcyjny (nagrzewanie, topnienie do kąpieli, przechył i wylew),
  linia odlewnicza (strumień metalu w rynnie, formy na dwóch przenośnikach, rozdzielacz, sztabki wg składu). Zasady gry
  (skup, ceny) zostały w grze.
- JunkKit: właściwości przedmiotów `js/models/junkyard/properties.js` (metal, topnienie, gęstość, palenie, guma; bryły
  z zderzaczy gry, `itemKit` — tworzenie, zamiana, żarzenie), wygląd ognia `fire.js` i stopionego metalu `lava.js`.
- **Laboratorium budowli 1.5.0**: maszyny złomowiska pracują — sekcja *At work* w oknie Budowla: przyciski maszyny,
  wsad przedmiotów, odczyty; piec indukcyjny stoi razem z linią odlewniczą (jak w grze).
- **Edytor sceny 0.35.0**: w grze (▶ Graj) przeładowarka jeździ i chwyta (`grapple`), przedmioty złomowiska są bryłami
  (`item`), maszyny pracują (`machine`, akcje 1…9), platforma, ogrodzenie i skup są bryłami (`solid`) — wszystko na
  wspólnym świecie przedmiotów; klawisz R (z F) — ramię przeładowarki.

### Zmienione
- **Laboratorium pojazdów (ląd) 1.21.0**: przedmioty przed przeładowarką przewracają się i obracają od uderzeń;
  przeładowarka na wspólnym świecie przedmiotów (bez własnych zderzeń), chwyta też przedmioty leżące przewrócone.

## Program 0.77.0 · pojazdy (ląd) 1.20.0 — 2026-11-19 (przeładowarka: zawieszenie i zderzenia)

### Dodane
- Zachowanie przeładowarki (`js/behaviors/land/grapple.js`): **zawieszenie** — podwozie na 4 sprężynach z liczbami
  kontrolera Rapier z gry (sztywność 60 i tłumienie 4,4 / 2,3 × masa podwozia, do 110 kN na koło, skok 0,32 m);
  pochylenie, przechył i unoszenie od przeciwwagi, chwytaka z ładunkiem (obracają się z nadwoziem) i przyspieszeń
  jazdy; koło bez nacisku odrywa się.
- **Zderzenia przedmiotów** ze sobą, z pojazdem (zderzacze z gry) i z gruntem: SAT na prostopadłościanach, zderzenie
  niesprężyste z tarciem; przedmioty leżą na sobie, pojazd je pcha.
- Laboratorium pojazdów (ląd): odczyt pochylenia i przechyłu oraz nacisku na każde koło.

### Uproszczenia
- Przedmioty nie obracają się od zderzeń; pojazd nie odczuwa zderzeń z przedmiotami.

## Program 0.76.0 · pojazdy (ląd) 1.19.0 — 2026-11-19 (przeładowarka jeździ i chwyta)

### Dodane
- Zachowanie **przeładowarka z chwytakiem** (`js/behaviors/land/grapple.js`, środowisko ląd) — z gry Złomowisko,
  przepisane z Rapier na fizykę GameLaboratory z liczbami z gry: jazda siłami (`land/drive.js`: 18 t, 26 kN, 14 m/s,
  skręt 0,55 rad), hydraulika nadwozia, wysięgnika i ramienia (prędkości i zakresy z gry), chwytak jako wahadło na
  przegubie kulowym (Verlet, tłumienie 3/s), 4 szczęki na silnikach położenia z kontaktem sprężystym z przedmiotem
  i gruntem — przedmiot trzyma tarcie μ·ΣN, dopóki przenosi jego ciężar; ugięcie wysięgnika i ramienia od ładunku.
- **Laboratorium pojazdów (ląd)**: przeładowarka jeździ i chwyta (W/S, A/D, ←/→, ↑/↓, R/F, Spacja — jak w grze);
  przed nią przedmioty ze złomowiska (opony, beczki, gazety, karton, garnek, opona traktorowa); odczyty: prędkość,
  chwytak, ładunek, ugięcie. Rodziny w laboratorium mogą mieć `prepare()` (ładowanie przed budową) i `leave()`.

### Uproszczenia (opis w `docs/behaviors/README.md`)
- Podwozie nie przechyla się od ciężaru, przedmioty nie zderzają się ze sobą ani z pojazdem, chwytak obraca się wokół
  pionu za ramieniem, wysięgnik nie wygina się w łuk (ugięcie zmienia kąty).

## Program 0.75.0 · przedmioty 1.0.0 · budowle 1.4.0 · pojazdy (ląd) 1.18.0 · edytor 0.34.0 — 2026-11-19 (złomowisko)

### Dodane
- **Modele ze Złomowiska** (repo Trash, z historią) jako JunkKit `js/models/junkyard/`: przedmioty, maszyny, otoczenie
  i pojazd w prawdziwej skali i masie, z LOD 0 / 1, opisem zderzacza (`shapes.js`) i oporem na zgniecenie; materiały
  jako dane (`materials.js`), tekstury proceduralne przez MatKit (`textures.js`); spis `registry.js` z nazwami EN/PL.
  Opis: `docs/models/junkyard.md`.
- **Laboratorium przedmiotów** (`labs/items.html`, kategoria Świat): opony samochodowa, rowerowa i traktorowa, puszka
  (cała i zgnieciona), garnek, gazety, karton, beczka, sztabki — model z bliska i z daleka obok siebie, warianty,
  siatka, kształt zderzenia z części wypukłych, wymiary, masa, opór na zgniecenie; `ItemsApi`.
- **Laboratorium budowli**: grupa „Junkyard (on land)” — piec na papier, zgniatarki do puszek i metalu, piec
  indukcyjny, linia odlewnicza, platforma, ogrodzenie z bramą, punkt skupu; bez morza, na suchym gruncie, części
  do włączania i wyłączania.
- **Laboratorium pojazdów (ląd)**: przeładowarka z chwytakiem — obrót nadwozia, wysięgnik, ramię, obrót chwytaka
  i szczęki suwakami (bez jazdy: jazda i chwytanie przez fizykę zostały w grze).
- **Edytor sceny**: rodzina prefabrykatów „Junkyard” (20 modeli).
- Doktor modeli: źródło `tools/doctor/sources/junkyard.js`; wzorzec uzupełniony o 20 modeli (inne bez zmian).
- `vendor/three/addons`: `ConvexGeometry` i `ConvexHull` (r186, do rysowania zderzaczy).

## Program 0.74.0 · drzewka 1.1.0 · UI gry 1.2.0 · sztuka 1.3.0 — 2026-11-19 (laboratorium drzewek, etap 2)

### Dodane
- **Widok „płytka drukowana”** drzewka (`js/gameui/tree/pcb.js`) z okna Badania Space, z historią (`techTree.js`,
  `research.css` → `js/gameui/css/tree.css`, tło z horyzontem planety `js/gameui/tree/img/research-bg.jpg`): ścieżki
  miedzi z impulsami, węzły w obręczach z nitami, poziom jako pierścień, koszt w pigułce. Dla dowolnego drzewka; głębsze
  niż 3 poziomy ściska się do widoku. Bez innerHTML i atrybutów style (ikony przez DOMParser, style przez CSSOM).
- **Dwa drzewka Space** jako przykłady (`samples/space.js`, z `techTreeData.js`): rój (prędkość, siła żucia, odporności,
  wielkość roju — koszty i poziomy z `config.js`) i programowanie (całe „wkrótce”); teksty EN/PL z i18n Space.
  Rejestr przykładów `samples/index.js`.
- Format `gamelab-tree`: pole **`view`** (`radial` | `pcb`), węzeł z **poziomami** (`levels`, `growth`: koszt poziomu L =
  round(cost · growth^L), efekt na poziom) i rodzaj **`hub`** (rozgałęzienie: nie kupowane, otwarte z rodzicem).
  `TreeState`: `level`, `costOf`, zapis `{ levels, spent }` (dawny `{ owned }` się wczytuje).
- **Drzewko jako okno w UI gry**: blok `{ type: 'tree', tree, points }` (`js/gameui/gameui.js`) — kupno za punkty ze stanu
  gry, akcja `buy`, `ui.tree()`, `ui.buy()`; w laboratorium UI gry okno **Research** (R) w przykładzie Space command,
  `GameUIApi.tree`, `GameUIApi.buy`.
- **Tło drzewka z laboratorium sztuki**: nowy zasób z nazwą **`image`** (opis ArtKit; zapis w oknie Format and export,
  `ArtApi.save/load/saved`), malowany od nowa w tle drzewka (`js/gameui/tree/background.js`) — w obu widokach.
- Laboratorium drzewek: wybór widoku na pasku, okno Węzeł z poziomami i wzrostem kosztu, ikony obu widoków, tło z listy
  obrazów, `TreeApi.view`, `TreeApi.background`; widok promienisty pokazuje poziomy i rozgałęzienia.

## Program 0.73.0 · drzewka 1.0.0 — 2026-11-14 (laboratorium drzewek, etap 1)

### Dodane
- **Laboratorium drzewek** (`labs/trees.html`, kategoria UI, obok UI gry): drzewko ulepszeń albo badań gry jako dane
  (format `gamelab-tree`, `js/gameui/tree/tree.js`) — gałęzie z kolorami, węzły z rodzicami (którykolwiek albo
  wszyscy), koszt, efekt (statystyki, które się sumują), teksty EN/PL, ikona, notatki, pole `background` (tło —
  w etapie 2). Z Hive Hunger, z historią: dane i stan gracza, widok promienisty w pixel arcie (`radial.js`, rozmiar
  z elementu widoku), edytor (Wybierz / Dodaj / Połącz, przeciąganie, okna Węzeł i Gałęzie, eksport i import JSON).
  Tryb **Próba**: punkty, kupowanie, zsumowane efekty; liczby drzewka (koszt całości, najdłuższa i najdroższa droga).
  Okno **Sprawdzenie**: węzły nieosiągalne, pętle, brakujący rodzic, brak opisu, efekt bez znaczenia. Przykład:
  drzewko Hive Hunger. `TreeApi` dla AI.
- Zasób z nazwą **`tree`** (`js/scene/assets.js`): zapisane drzewko.

## Program 0.72.1 · edytor sceny 0.33.1 — 2026-11-14 (poświata w jaskini)

### Dodane
- Podziemie: pole wyboru **Poświata w jaskini** (okno Środowisko, `env.caveGlow`, domyślnie włączone) — słabe światło,
  żeby jaskinię było widać; wyłączone — prawdziwa ciemność, świecą tylko lawa i światła gracza. Zapisane w scenie,
  działa przy edycji i w ▶ Graj; w API `env` z `caveGlow`.

## Program 0.72.0 · rośliny 1.4.0 — 2026-11-14 (roślina jako zasób z nazwą)

### Dodane
- **Roślina jako zasób z nazwą** (rodzaj `plant`): laboratorium roślin zapisuje okaz — gatunek, ziarno, wielkość,
  szczegółowość, porę roku (okno Rośliny → Okaz → Zapisz, lista zapisanych, `PlantApi`). W edytorze sceny model
  z rodziny Rośliny wybiera ją w oknie Obiekt (pole `asset`; budowany jest zapisany gatunek), w API `add` / `set`
  z `asset`.

### Zmienione
- Generator zombie w kategorii **Materiały i grafika**, obok Pixel Studio (był w „Życie i postacie”).

## Program 0.71.1 · generator zombie 1.2.1 — 2026-11-14 (porządek plików i dokumentacji)

### Zmienione
- Nazwy plików według zasady „małe litery, słowa łączone myślnikiem”: `docs/labs/walkers/roadmap.md`,
  `docs/labs/walkers/img/hud-done.png`, `tools/img/build-cifar.py`, `tools/img/build-quickdraw.py`,
  `tools/lang/build-wasm.js` (odwołania poprawione, także błędna ścieżka `img/tools/`). Pliki `LICENCJA.txt` przy
  danych zostają wielkimi literami, jak pliki licencji.
- Generator zombie: skrypt we własnym folderze `js/labs/zombies/zombies.js` (był w folderze Pixel Studio), dokument
  `docs/labs/zombies.md` (był w `docs/labs/pixel/`), ścieżki `pixel/zombies.html` → `labs/zombies.html`.
- Dokumentacja: mapa `docs/README.md` w kolejności kategorii z grupami, lekarz sceny i transformator wśród narzędzi,
  pełna lista zachowań; jaskinie i efekty w rozbiorze laboratoriów, silnik sceny (jaskinia jako obiekt i teren, strzał,
  skan i uszkodzenia statków przez efekty), edytor (podziemie), laboratorium lądu (grupa „Teren”), martwe odnośniki
  w `docs/models/train/grafika.md`.

## Program 0.71.0 · jaskinie 1.3.0 · ląd 1.7.1 · edytor sceny 0.33.0 — 2026-11-14 (jaskinia jako teren)

### Dodane
- **Grupa „Teren”: ląd · jaskinie** — przełącznik grupy na pasku obu laboratoriów, poświata w menu i podświetlenie
  kafelków (`--terrain`); jaskinie w katalogu zaraz za lądem.
- **Jaskinia jako zasób z nazwą** (rodzaj `cave`): laboratorium jaskiń zapisuje kształt i skałę (okno Jaskinia →
  Zapisz, lista zapisanych, `CaveApi`). W edytorze sceny: model *Jaskinia* z polem `asset` (jaskinia jako obiekt)
  albo **powierzchnia „Podziemie”** (`env.surface: "underground"`, `env.cave`): cała plansza to jaskinia — bez
  nieba, morza, gruntu i słońca, ze słabą poświatą; zachowania według praw lądu; lekarz sceny ostrzega przed
  okrętami i samolotami w jaskini i brakującą jaskinią. API: `env` z `surface: "underground"` i `cave`.
- TODO: rozległe jaskinie (kawałki liczone wokół gracza) i wejście do jaskini wycięte w lądzie.

## Program 0.70.0 · efekty 1.3.0 · pojazdy — kosmos 1.11.0 · edytor sceny 0.32.0 — 2026-11-14 (uszkodzenia statków z laboratorium efektów)

### Dodane
- Laboratorium efektów: **dym, iskry, wybuch (błysk i kule ognia), spalenizna, ognik** — z ShipKit
  (`js/render/effects/damage.js`, `DamageFx`; shadery, tekstury i liczby bez zmian).

### Zmienione
- **Uszkodzenia statków z laboratorium efektów**: ShipKit zostawia u siebie miejsca uszkodzeń (kotwice na częściach,
  lecą z odłamkami), odpadanie i łamanie części; dym, iskry, ogniki, spalenizna, błysk i kule ognia rysuje
  laboratorium efektów (`model.damageView()`, `model.onDamage`, `shipDamage`) — w laboratorium pojazdów i w edytorze.
- Wzorzec doktora modeli: bez krążków spalenizny (−160 trójkątów, −8 wywołań rysowania na statek); wymiary Haven
  i Swarmera mniejsze — ukryte krążki wystawały poza kadłub, teraz obrys to sam kadłub.

## Program 0.69.2 — 2026-11-14 (poprawka: fala uderzeniowa przy zniszczeniu statku)

### Naprawione
- Zniszczenie statku (ShipKit) znowu ma pomarańczową falę uderzeniową: od 0.69.0 korzystała z emitera skanu bez
  `env`, więc nie zgłaszała się nigdzie i znikała. Teraz idzie przez `model.onScan` jak skan (barwa wybuchu) —
  rysuje ją laboratorium efektów w laboratorium pojazdów i w edytorze sceny.

## Pojazdy — kosmos 1.10.1 · edytor sceny 0.31.1 — 2026-11-14 (efekt strzału według odznak)

### Zmienione
- Lista **Efekt strzału** (laboratorium pojazdów — kosmos, okno Obiekt w edytorze) w dwóch grupach według odznak
  efektów: Lot — od lufy do celu, potem W miejscu — u celu; przy nazwie odznaki wielkości (punktowy, obszarowy).

## Program 0.69.1 · efekty 1.2.0 — 2026-11-14 (odznaki efektów)

### Dodane
- **Odznaki efektów** (`FX_BADGES`, mogą się pokrywać): Lot (z punktu do punktu), W miejscu, Punktowy, Obszarowy.
  Laboratorium efektów: okno **Efekty** — lista z odznakami i filtr po odznakach; `EffectsApi.find(...odznaki)`.

## Program 0.69.0 · efekty 1.1.0 · pojazdy — kosmos 1.10.0 · edytor sceny 0.31.0 — 2026-11-14 (efekty roju, fala skanu)

### Dodane
- Laboratorium efektów: **10 nowych efektów** — z roju Hive Hunger (z historią): laser, promień przebijacza ze
  spiralną błyskawicą, rozwidlona błyskawica burzy, promień ściągający holownika, płaski promień tnący, pole siłowe
  wzmacniacza, skok w nadprzestrzeń; ze sceny gry: znacznik i tunel podprzestrzenny; z ShipKit: fala skanu.
  W grze to metody roju — gospodarz `js/render/effects/swarm-fx.js` podaje im „statki” z położeń efektu (obliczenia
  bez zmian). Barwy pola siłowego — wybór koloru.

### Zmienione
- **Fala skanu z laboratorium efektów**: statki i stacja (Codewing, Scribe, Swarmer, Haven) nie mają własnej
  powłoki skanu — akcja „scan” zgłasza skan (`model.onScan`, `makeScanEmitter` zamiast `makeScanWave`), a falę
  rysuje laboratorium pojazdów i edytor sceny. Wzorzec doktora modeli: bez powłoki skanu (−4416 trójkątów, −2
  wywołania rysowania na model; wymiary i problemy bez zmian).

## Program 0.68.0 · pojazdy — kosmos 1.9.0 · edytor sceny 0.30.0 — 2026-11-14 (strzały statków z laboratorium efektów)

### Zmienione
- **Strzały statków z laboratorium efektów**: statki ShipKit (Codewing, Scribe, Swarmer) nie mają już własnego
  pocisku ani błysku u lufy. Model decyduje tylko, gdzie są lufy i kiedy strzela, i zgłasza strzał
  (`model.onShot`, `makeShotEmitter` zamiast `makeBoltPool`); wygląd strzału to efekt z laboratorium efektów,
  wybierany dla statku — gotowy albo zapisany pod nazwą. Pojazd z dowolnej gry, efekt z dowolnej gry.
- Wzorzec doktora modeli: odciski trzech statków bez pocisków (mniej trójkątów i wywołań rysowania; wymiary
  i problemy bez zmian).

### Dodane
- Laboratorium pojazdów — kosmos: pod akcjami **Efekt strzału** (zapamiętany dla statku w tej przeglądarce).
- Edytor sceny: pole obiektu `shot` (okno Obiekt — „Efekt strzału”, API `add` / `set`), prefabrykat `shoots`.
- EffectKit: `createEffectLibrary` (jeden efekt na wybór: rodzaj albo zapisany efekt), `shotOptions` (strzał →
  efekt); LabLook: `through(paint)` — obraz przez soczewki efektów.

## Program 0.67.1 — 2026-11-14 (kategoria Efekty)

### Zmienione
- Laboratorium efektów ma własną kategorię **Efekty** (`--cat-effects`), zamiast „Materiały i grafika”.

## Program 0.67.0 · efekty 1.0.0 · bloki 1.2.0 · edytor sceny 0.29.0 — 2026-11-13 (laboratorium efektów)

### Dodane
- **Laboratorium efektów** (`labs/effects.html`, opis `docs/labs/effects.md`) z Hive Hunger (z historią): strzał
  z falą uderzeniową, kula plazmy z ognistym ogonem, odłamki, błyskawica, piorun łańcuchowy, kula cieczy (soczewka)
  i czarna dziura zaginająca obraz. **EffectKit** (`js/render/effects/`), stały krok 60 Hz. Każda liczba efektu na
  suwaku, zapis pod nazwą (zasób `effect`), dla AI `EffectsApi`.
- Edytor sceny: polecenie API `effect` (efekt albo zapisany efekt; punkty jako współrzędne albo obiekty sceny) —
  zdarzenie `effect` na szynie, świat je rysuje (soczewki przez potok kamery).
- Laboratorium bloków: ugryzione bloki stałe sypią odłamki w barwie rodzaju.

## Program 0.66.0 · bloki 1.1.0 · edytor sceny 0.28.0 — 2026-11-13 (bryła z bloków jako zasób z nazwą, kategoria Woksele)

### Dodane
- **Bryła z bloków jako zasób z nazwą** (rodzaj `blocks`, `js/scene/assets.js`): laboratorium bloków zapisuje bryłę
  pod nazwą (okno Bryła → Zapisz; lista zapisanych wczytuje ją z powrotem; `BlocksApi.save`, `load`, `saved`) razem
  z materiałami bloków stałych.
- **Zasób modelu w scenie**: pole `asset` obiektu (`scene-data.js`), prefabrykat z `assetKind` buduje model z danych
  zasobu (`build({ asset })`). Bloki: w edytorze okno Obiekt → „Bryła z bloków” (zapisane albo model domyślny),
  w API `add` / `set` z `asset`, `prefabs` mówi, jaki zasób model bierze; ponowny zapis w laboratorium przebudowuje
  bryłę w otwartym edytorze. Lekarz sceny: brakujący zasób obiektu — `missing-asset` z poprawką.
- Kategoria laboratoriów **Woksele** (`--cat-voxels`): laboratorium bloków przeniesione z „Materiały i grafika”.

### Zmienione
- BlockKit: materiały bloków stałych idą z bryłą (`def.mats`), zamiast zmieniać wspólne rodzaje — kilka brył w jednej
  scenie może mieć różne materiały; w laboratorium usunięcie wyboru materiału przywraca domyślny rodzaju.

## Program 0.65.0 — 2026-11-13 (kategorie laboratoriów w menu i na kafelkach)

### Dodane
- **Kategorie laboratoriów** (katalog: `cat` przy każdym wpisie, nazwy w `cats`, barwy `--cat-<id>` w
  `ui/style/tokens.css`): pojazdy, kosmos, świat (woda, ląd, wygląd), życie i postacie, materiały i grafika, UI
  i dźwięk, AI (język i obrazy), narzędzia. Laboratoria w katalogu ułożone według kategorii — tak je pokazuje menu
  i strona startowa (własna kolejność kafelków zostaje).
- Menu **Narzędzia**: pasek przewijania (lista nie mieści się na ekranie), nagłówek każdej kategorii i kolorowa kropka
  przy każdym laboratorium (nazwa kategorii w podpowiedzi); grupy (pojazdy, laboratoria kosmosu) dalej świecą swoim
  kolorem — dwa rodzaje grupowania. Narzędzia: edytor sceny, lekarz sceny, doktor modeli, kontrola kitów, transformator.
- **Kafelki**: kolorowa górna krawędź kategorii, etykieta z kropką i nazwą; po najechaniu na etykietę podpowiedź
  z listą laboratoriów kategorii i podświetlenie wszystkich jej kafelków.

## Program 0.64.0 · bloki 1.0.0 · edytor sceny 0.27.0 — 2026-11-13 (laboratorium bloków)

### Dodane
- **Laboratorium bloków** (`labs/blocks.html`, opis `docs/labs/blocks.md`) z Hive Hunger (z historią): bryły
  z bloków (skała, żelazo, lód, piaskowiec, woda, lawa, gaz) w warstwach (wierzch, pod spodem, głęboko, jądro, żyły,
  jeziorka); kształty: kula, sześcian, dwie kule, pudła, pas skał, kulki testowe, napis. **BlockKit**
  (`js/models/blocks/`); bloki stałe z materiałami z MatKit. Ugryzienie: woda i lawa wypadają jako krople, które
  zbijają się w pływające kule, gaz jako dryfująca chmura (`js/behaviors/space/liquids.js`, `gases.js`, stały krok
  60 Hz). Dla AI `BlocksApi`.
- Edytor sceny: rodzina prefabrykatów **Bloki**.

## Program 0.63.1 — 2026-11-13 (schemat silnika)

### Zmienione
- **Schemat silnika** (Pomoc → Schemat silnika, `docs/guides/engine-architecture.md`): pas laboratoriów (modele →
  prefabrykaty, ustawienia → zasoby z nazwą, materiały, jeszcze niepołączone), UI gry jako osobny blok, lekarze,
  materiały w zasobach; każdy blok oznaczony: działa, częściowo, w planie.

## Program 0.63.0 · materiały 1.0.0 — 2026-11-13 (laboratorium materiałów)

### Dodane
- **Laboratorium materiałów** (`labs/materials.html`, opis `docs/labs/materials.md`) i **MatKit**
  (`js/render/materials/matkit.js`): jedna biblioteka materiałów PBR — materiał to opis (rodzaj powierzchni, barwy,
  kafelek, szorstkość, metaliczność, nierówność, starzenie: zużycie, brud, rdza), z którego generator robi bezszwowe
  mapy (barwa, normalne, szorstkość, metaliczność, AO). 11 rodzajów (metal, blacha z nitami, malowany metal, drewno,
  skała, beton, cegła, papier, tkanina, tynk, lód), 17 gotowych; podgląd na bryłach w scenie bazowej z ruchomym
  słońcem, mapy do PNG, kafelki 3 × 3. Zasób `material`; dla AI `MaterialApi`.

## Program 0.62.0 · edytor sceny 0.26.0 · UI gry 1.1.0 — 2026-11-13 (UI gry w scenie)

### Dodane
- **UI gry w scenie:** pole `env.ui` (UI zapisane w laboratorium UI gry) — lista „UI gry” we Właściwościach
  środowiska; w ▶ Graj nakładka nad widokiem (`editor/js/play/gameui-play.js`) ze stanem gracza z zachowania
  (prędkość z jednostką, ciąg, wysokość, lądowanie, rozbicie…), sceną, czasem i radarem; akcje statków w dzienniku,
  akcje UI i wybory w dialogu jako zdarzenie `ui` na szynie, „quit” kończy grę; Esc — pauza UI (bez ekranu pauzy
  kończy grę jak dotąd).
- API: `env` z `ui`, polecenie `ui` (dialog, wpis, baner, ekran, okno — w czasie gry); lekarz sceny zgłasza
  brakujące UI.
- UI gry: element `value` z jednostką ze stanu (`unitBind`); przykład **Scene play** do ▶ Graj edytora.

## Program 0.61.0 · UI gry 1.0.0 · edytor sceny 0.25.0 — 2026-11-13 (laboratorium UI gry)

### Dodane
- **Laboratorium UI gry** (`labs/gameui.html`, opis `docs/labs/gameui.md`) i silnik **UI gry jako dane** (`js/gameui/`):
  ekrany menu (stos z cofaniem, przyciski, suwaki, przełączniki, wybory), HUD z dziewięcioma kotwicami (pasek, liczba,
  tekst, telegraf, wskaźnik steru, dziennik zdarzeń, baner, celownik, minimapa) powiązany ze stanem gry, okna w grze
  (klawisze, Esc) i okno dialogowe postaci i narratora (tekst po literze, wybory 1–9). Format `gamelab-ui`; skórki
  oddzielone od wyglądu laboratoriów — gotowe Space, Battle i silnika, własne zapisywane pod nazwą (zasoby `ui`
  i `uiskin`). Przykłady: dowództwo kosmiczne, bitwa morska, prosta gra. Dla AI: `GameUIApi` i zakładka API w konsoli.
- Przeniesione **z historią**: ze Space — zestaw UI (materiał z ziarnem, ramki, okno, dziennik zdarzeń, czcionki
  Antonio i Roboto Condensed), z Battle — pomocnik DOM, menu i HUD; przerobione na elementy z danych.
- Kafelek **Lekarz sceny** (narzędzia): otwiera edytor sceny od razu z oknem lekarza (`editor/index.html?doctor`).

### Zmienione
- Edytor: przycisk lekarza sceny — **Badaj** (EN: Examine), w oknie **Zbadaj scenę**.

## Program 0.60.0 · edytor sceny 0.24.0 — 2026-11-13 (lekarz sceny)

### Dodane
- **Lekarz sceny** (`js/scene/doctor.js`, opis `docs/scene/doctor.md`; plan, punkt 7): sprawdza układ sceny — model
  w złym środowisku (okręt na lądzie, drzewo na morzu, łazik w kosmosie, samolot bez powietrza), pod gruntem albo
  w powietrzu, obiekty wchodzące jeden w drugi, brakujące zasoby z nazwą, zachowanie niepasujące do modelu albo
  środowiska, orbity, koszt sceny (trójkąty, wywołania rysowania) względem budżetu. Uniwersalny, zgłasza i proponuje
  poprawki (polecenia API), niczego nie przestawia sam. API: `{"cmd":"check"}`; edytor: przycisk **Sprawdź** i okno
  **Lekarz sceny** z poprawkami jednym kliknięciem (Cofnij je odwraca).
- Pomysły w `TODO.md`: laboratorium scenariusza (treści i dialogi postaci i narratora), opisy statków i rzeczy w grze.

## Program 0.59.0 · sztuka 1.2.0 — 2026-11-09 (wszystkie obiekty ekspertyzy)

### Dodane
- **Reszta obiektów z artchecker, przeniesiona z historią**: fragment obrazu (oddarty róg, ubytki), popiersie z brązu
  i popiersie z marmuru w 3D (`js/render/art/exam/fragment.js`, `sculpture3d.js`, `marble.js`, opis
  `docs/labs/art/marble.md`) — w Examine; rzeźby obraca się przeciąganiem, przybliża kółkiem; widoki dzienny, UV, RTG.
- Banknot: suwak **Tilt** — hologram, farba zmienna optycznie i obraz utajony zależne od przechylenia (w grze rysowała
  je plansza).
- ArtKit: spękania z podwiniętymi brzegami wysepek farby (cupping) — relief zależny od kierunku światła.
- Pomysły w planie (`docs/guides/lab-breakdown.md`): wiki w menu Pomoc z ilustracjami z laboratoriów; tryb 3D
  laboratorium sztuki (obraz z mapą normalnych, światło, rama ze złoceniem).

### Poprawione
- Rękopis: korozja atramentu na odwrociu rysowana jak w grze 1.11.1 (poprawka z artchecker).
- Fragment obrazu bez odcięcia oddartej części (w grze odcinała ją plansza) — widok odcina ją sam.

## Program 0.58.0 · sztuka 1.1.0 — 2026-11-09 (ekspertyza z artchecker)

### Dodane
- **Silnik ekspertyzy z gry artchecker, przeniesiony z historią** (`js/render/art/exam/`, opis `docs/labs/art.md`,
  obiekty `docs/labs/art/`, historia `docs/history/artchecker.md`): obraz olejny fikcyjnego artysty z regionami
  (pigmenty z datami, kierunek pędzla, gęstość), banknot, moneta, znaczek i rękopis — każdy jako oryginał albo
  fałszerstwo jedną z metod (profile) ze zdradami widocznymi tylko w niektórych widokach: światło boczne, UV,
  podczerwień, RTG, spękania, odwrocie, światło przechodzące, rant, kąpiel znaku wodnego, mikroskop.
- Laboratorium sztuki: tryby **Paint** i **Examine** na pasku, okno Examination, `ArtApi.exam(spec)` i
  `ArtApi.examInfo()` dla AI.
- ArtKit: **pod lampą** (`view`) — namalowany obraz w świetle bocznym, UV, podczerwieni i RTG.

### Poprawione
- Lista widoków miała ten sam identyfikator co obszar podglądu (`#view`) — opcje trafiały do podglądu.

## Program 0.57.0 · sztuka 1.0.0 — 2026-11-09 (laboratorium sztuki)

### Dodane
- **Laboratorium sztuki** (`labs/art.html`, ArtKit `js/render/art/artkit.js`, opis `docs/labs/art.md`): obrazy 2D na
  płótnie — temat (pejzaż, martwa natura, portret, abstrakcja, motyw znaczka, własny obraz), technika (olej z widocznymi
  pociągnięciami i impastem, akwarela, ołówek, tusz, tusz patyczkiem, długopis, węgiel, pastel, flamaster, puentylizm,
  rytownictwo), powierzchnia (płótno, papier, drewno, pergamin, metal; relief w świetle bocznym, werniks, spękania,
  wiek), konwersje (półtony, paleta z ditheringiem, krawędzie, duotone, sepia, posteryzacja, pikseloza…) i formaty
  (znaczek pocztowy, rama, passe-partout). Zoom do 32× (pociągnięcia, włosie, splot). Każdy obraz to spec JSON z
  ziarnem — `ArtApi.render(spec)` i zakładka API w konsoli, dla gier i AI. Eksport PNG.

## Program 0.56.1 — 2026-11-07 (schemat silnika: reguły gry)

### Zmienione
- Schemat silnika (`docs/guides/engine-architecture.md` i Pomoc → Schemat silnika): nowe pole **Rules** (reguły gry) przed
  Scripts — stan rozgrywki, cele, punkty, role graczy, warunki końca rundy; dotyczą całej gry, nie jednego obiektu.

## Program 0.56.0 — 2026-11-07 (sprzątanie: PostKit usunięty)

### Usunięte
- **PostKit** (`js/render/postkit/postkit.js`) — dawny potok obrazu laboratoriów ze Space, od grafiki Battle tylko kod
  zapasowy: plik, jego skrypty w stronach (pojazdy · kosmos, ciała niebieskie, układy), gałąź w
  `LabKit.imageEffects` i dodatki Three.js, których używał tylko on (`Pass`, `UnrealBloomPass`, `CopyShader`,
  `LuminosityHighPassShader`, `FXAAShader` w `js/core/three-global.js`). Jego soczewkowanie, flara i promienie żyją
  w `js/render/space-fx.js`. Wygląd laboratoriów bez zmian.

## Program 0.55.0 · ciała niebieskie 1.5.1 · układy 1.4.1 — 2026-11-07 (efekty kosmosu wróciły do laboratoriów ze Space)

### Poprawione
- **Soczewkowanie, flara słońca i promienie światła znów działają w laboratoriach ze Space** (ciała niebieskie,
  układy): od przejścia na grafikę Battle (0.12.0) ich panel obrazu (`js/labkit/look-panel.js`, potok kamery
  LookPipeline) pomijał kroki laboratorium (`extra`) — teraz idą do efektów kosmosu potoku (`js/render/space-fx.js`).
  Panel ma przełączniki **LENSING**, **SUN FLARE**, **LIGHT RAYS** (domyślnie włączone).

### Zmienione
- Jeden potok obrazu: laboratoria ze Space, laboratoria Battle i edytor sceny rysują przez LookPipeline z efektami
  kosmosu; PostKit (`js/render/postkit/postkit.js`) jest już tylko kodem zapasowym spoza grafiki Battle.

## Program 0.54.0 · edytor sceny 0.23.0 — 2026-11-07 (efekty kosmosu w potoku kamery, słońce jako źródło światła)

### Dodane
- **Efekty kosmosu w potoku kamery Battle** (`js/render/space-fx.js`, LookPipeline `space = { lens, flare }`):
  soczewkowanie grawitacyjne czarnej dziury i flara słońca z promieniami światła — te same algorytmy co w PostKit
  (potok laboratoriów ze Space), jako kroki przed obróbką kamery. Pierwszy krok do jednego potoku obrazu (plan
  rozbioru, problem 7).
- Edytor sceny, kosmos: **słońce w scenie jest źródłem światła** — ciała niebieskie oświetla jego położenie (BodyKit
  `sunPosition`), statki światło sceny z jego kierunku (`stage.aimSun`); czarna dziura w scenie zagina obraz za sobą,
  słońce ma flarę i promienie.

## Program 0.53.0 · edytor sceny 0.22.0 — 2026-11-07 (budowa bazy)

### Dodane
- **Budowa bazy w edytorze sceny** (`editor/js/world/placer.js`, punkt 6 planu rozbioru): w zakładce Moduły bazy +
  (albo dwuklik) nie stawia modułu na środku, tylko daje hologram pod kursorem — turkusowy, gdy moduł pasuje,
  czerwony, gdy nie (linia stanu mówi dlaczego): za stromo (`maxSlope` modułu), na wodzie albo lawie (moduł „wet” może
  stać na płyciźnie do 1,5 m), za blisko innego modułu (obrysy `footprint`), poza lądem. Kliknięcie stawia moduł
  i zostaje się w budowie (następny obok), R obraca o 45°, Esc albo prawy przycisk kończy. Zasady jak w laboratorium
  powierzchni.
- **Zachowanie „budowa”** (moduły bazy, domyślne): w grze (▶) moduł rośnie od gruntu przez czas budowy z BaseKit
  (40–150 s) — bryła odcinana płaszczyzną, hologram reszty, świecący pierścień; linia stanu: ile zbudowano. Po
  zatrzymaniu gry — gotowy.

### Poprawione
- Scena bazowa: zwykły grunt (powierzchnia ląd bez terenu z laboratorium) znów widoczny — od 0.50.0 jego linia była
  przez pomyłkę w komentarzu i zamiast gruntu było widać pustkę pod niebem.

## Program 0.52.0 · pojazdy (ląd) 1.17.0 · edytor sceny 0.21.0 — 2026-11-07 (lądowanie)

### Dodane
- **Zachowanie „lądowanie”** (`js/behaviors/land/lander.js`, ląd): statek kosmiczny nad gruntem — bryła sztywna pod
  grawitacją planety, w jej atmosferze (opór ½ρ·CdA·v²), z silnikiem głównym, silnikami podnośnymi pod brzuchem
  (1,5 × ciężar na Ziemi — założone) i czterema podporami (sprężyna z tłumikiem, tarcie, moment). Przyziemienie
  szybciej niż 5 m/s w pionie — rozbity. Grawitacja i gęstość powietrza z planety (`T.gravity`, `T.air` z
  `js/envs/land/planet.js`; scena bazowa `gravity`, `airDensity`), na zwykłym lądzie — ziemskie.
- Laboratorium pojazdów — ląd: statki kosmiczne (Codewing, Scribe, Swarmer) na liście; startują 40 m nad gruntem;
  AUTO schodzi 1,5 m/s i siada, ręcznie: spacja — silniki podnośne, W / S — silnik główny, A / D — kurs.
- Edytor sceny: statek kosmiczny nad lądem dostaje domyślnie „lądowanie” (w kosmosie — „ciąg w próżni”); spacja —
  silniki podnośne; linia stanu: wysokość, prędkość pionowa, „wylądował” / „rozbity”.

## Program 0.51.0 · ląd 1.7.0 · edytor sceny 0.20.3 — 2026-11-07 (grunt i lawa planety)

### Dodane
- **Barwa gruntu planety** (LandKit `uGround`, `T.ground`): grunt z planety ma barwę jej skały zamiast ziemskiego
  biomu, z tą samą jasnością i wzorem — planety bez atmosfery (Luna, Mercury) szary regolit, rdzawe (Mars, Venus)
  czerwonobrązowy, lawowe ciemny bazalt; Ziemia i planety lodowe bez zmian.
- **Morze lawy** (Cinder, Magma): morze sceny bazowej to lawa (WaterKit `uLava`: skorupa z pęknięciami świecącej
  lawy, fale i wygląd lawy) — zawsze, jakiekolwiek morze wybrano.

## Program 0.50.0 · ląd 1.6.0 · edytor sceny 0.20.2 — 2026-11-07 (niebo planety)

### Dodane
- **Niebo planety** nad lądem z planety: scena bazowa barwi niebo dzienne, światło rozproszone i mgłę odcieniem
  atmosfery planety (BodyKit `atmoHue`; Ziemia 205°), bledsze, ciemniejsze i z rzadszą mgiełką, im rzadsza atmosfera
  (`atmosphere`) — Mars różowo-szary, Wenus żółtawa. Planeta bez atmosfery (Luna, Mercury): niebo kosmosu (ciało nieba
  BodyKit „Deep field”, odbicia ShipKit) — w laboratorium lądu i w edytorze sceny.
- Planeta bez mórz (Mars, Luna, Mercury…): bez wody wokół wycinka.

## Program 0.49.0 · ląd 1.5.0 · edytor sceny 0.20.1 — 2026-11-07 (ląd z planety)

### Dodane
- **Ląd z planety** (`js/envs/land/planet.js`, punkt 6 planu rozbioru — powierzchnia planety): drugie źródło terenu
  środowiska „ląd” obok generatora — płaski wycinek gruntu planety BodyKit (wysokości, morza i lód z shadera planety,
  ten sam teren co na jej globusie i w laboratorium powierzchni; skala jak w SurfaceKit), na równiku, 1:1. RegionKit:
  układ wód `planet` (morze otwarte, lód tam, gdzie zamarznięte); biom z grupy planety.
- Laboratorium lądu: **Grunt — generator albo planeta** (Terra-1, Pelagia, Rime, Glacies, Mars, Venus, Cinder, Magma,
  Luna, Mercury); przy planecie ustawienia generatora są wyłączone, działają wielkość, szczegółowość i brzeg. Zapisany
  ląd idzie do edytora sceny jak każdy inny (edytor czeka na kity BodyKit).

## Program 0.48.0 · edytor sceny 0.20.0 — 2026-11-07 (szyna zdarzeń, akcje statków)

### Dodane
- **Szyna zdarzeń** `js/core/events.js` (moduł Events ze schematu silnika): `on`, `once`, `emit`, `history`; moduły nie
  wołają się nawzajem — jeden wysyła zdarzenie, inne słuchają.
- **Akcje statków jako zdarzenia** (punkt 6 planu rozbioru): zachowanie „ciąg w próżni” podaje akcje modelu ShipKit
  (`actions()`, `act(id, on)`); w grze klawisze 1…9 i polecenie API `act` wysyłają zdarzenie „action”, którego słucha
  zachowanie obiektu (model strzela, skanuje, gaśnie, wybucha) i dziennik konsoli. API: `act`, `actions`, `events`.

## Program 0.47.0 · edytor sceny 0.19.0 — 2026-11-07 (zachowanie „orbita”)

### Dodane
- **Zachowanie „orbita”** (`js/behaviors/space/orbit.js`, kosmos; punkt 6 planu rozbioru — orbity): ciało krąży pod
  grawitacją środka a = −μ·r/|r|³ (całkowanie prędkością Verleta, krok 1/240 s, we współrzędnych względem środka, który
  sam może się ruszać); μ z okresu orbity kołowej (μ = 4π²r³/T²). Start — prędkość orbity kołowej; elipsa wynika z sił.
  W scenie: adapter `orbit` (`js/scene/behaviors.js`) dla ciał niebieskich, środek z `orbit.around` albo najbliższe
  cięższe ciało (`bodyRank`), okres `orbit.period`; pole `orbit` w danych sceny i w poleceniu API `set`.

## Program 0.46.0 · edytor sceny 0.18.0 — 2026-11-07 (prefabrykaty: ludzie i stwory)

### Dodane
- **Prefabrykaty ludzi i stworów** (`humans/<id>`, `creatures/<id>`, LifeKit): Human I, Human II, Plains strider —
  parametry domyślne kreatury, `tick` — chód „idle” (oddech, rozglądanie). `js/scene/space.js` ładuje LifeKit
  z ludźmi i stworami. Punkt 5 planu rozbioru zrobiony (bez chodu jako zachowania).

## Program 0.45.0 · edytor sceny 0.17.0 — 2026-11-07 (prefabrykaty: ciała niebieskie)

### Dodane
- **Prefabrykaty ciał niebieskich** (`bodies/<ciało>`, BodyKit): wszystkie 23 ciała z grup laboratorium ciał
  niebieskich (bez nieba) jako obiekty sceny kosmosu — promień 50 m (model, nie prawdziwa skala), `tick` dostaje
  kierunek słońca sceny i kamerę (oświetlenie, obrót, błyski pulsara). `js/scene/space.js` ładuje wszystkie rodzaje
  ciał BodyKit; edytor przekazuje `tick(t, dt, { sunDir, center })`.

## Edytor sceny 0.16.1 — 2026-11-07

### Poprawione
- Edytor sceny: dwuklik w wiersz modelu nie zaznacza tekstu.

## Edytor sceny 0.16.0 — 2026-11-07 (dodawanie modelu: zakładki z ikonkami)

### Zmienione
- Edytor sceny: dodawanie modelu przez zakładki kategorii z ikonkami i podpowiedzią, pod nimi modele z przyciskiem +.
- Plan rozbioru (`docs/guides/lab-breakdown.md`): punkt 7 — lekarz sceny.

## Program 0.44.0 · edytor sceny 0.15.0 — 2026-11-07 (prefabrykaty: moduły bazy)

### Dodane
- **Prefabrykaty modułów bazy** (`base/<moduł>`, BaseKit): lądowisko, habitat, panele słoneczne, kopalnia, rafineria,
  magazyn — gotowe (budowa 1), `tick` porusza światła i części. BaseKit ładuje się z kitami ze Space (`js/scene/space.js`).

## Program 0.43.0 · edytor sceny 0.14.0 — 2026-11-07 (prefabrykaty: rośliny i jaskinie)

### Dodane
- **Prefabrykaty roślin i jaskiń** (`js/scene/prefabs.js`, punkt 5 planu rozbioru): rodzina „Rośliny” — każdy gatunek
  PlantKit (`plants/<gatunek>`, jedna roślina: ziarno 1, wielkość 1, wiatr w shaderze przesuwany przez `tick`) i rodzina
  „Jaskinie” — `caves/cave`, jaskinia CaveKit z ustawień domyślnych laboratorium jaskiń. Do postawienia w edytorze
  i przez API (`add`).

## Program 0.42.2 · pojazdy (ląd) 1.16.0 · pojazdy (kosmos) 1.8.0 — 2026-11-07 (wspólna scena bazowa w pojazdach · ląd i kosmos)

### Zmienione
- **Laboratorium pojazdów (ląd i kosmos) stoi na wspólnej scenie bazowej** (`js/labs/shared/stage.js`) — punkt 4
  planu rozbioru zrobiony: wszystkie laboratoria środowisk i pojazdów mają scenę edytora. Wygląd się zmienił — do
  dopracowania.
- Pojazdy · ląd: niebo SkyKit, światło, mgła i odbicia ze sceny bazowej (domyślne popołudnie; z gruntem z laboratorium
  lądu — jego pogoda), daleki horyzont jak w laboratorium lądu (niebo 20 km, morze 16 km, kamera do 40 km). Grunt
  „z laboratorium lądu” buduje scena bazowa (teren, morze ze znajomością terenu, regiony wód, boje) — dawny
  `land-source.js` usunięty. Zwykły grunt (wzgórza i nierówności) został; dookoła niego zgrubna siatka 4 km z samymi
  wzgórzami (do horyzontu), obie przesuwają się za pojazdem co 40 m. NOC: słońce pod horyzontem (nocne niebo).
- Pojazdy · kosmos: niebo kosmosu jak w edytorze — ciało nieba BodyKit („Deep field”, ładowane przez
  `js/scene/space.js`), odbicia z mapy otoczenia ShipKit (jak w grze), słońce sceny bazowej (bez atmosfery) od strony,
  z której świeciło dawne światło główne; dawne niebo ShipKit i światło konturowe usunięte. Oświetlenie z gry (przycisk)
  bez zmian.

## Program 0.42.1 · woda 1.5.0 · pojazdy (woda) 1.6.0 — 2026-11-07 (wspólna scena bazowa w laboratorium wody i pojazdów · woda)

### Zmienione
- **Laboratorium wody i laboratorium pojazdów (woda) stoją na wspólnej scenie bazowej** (`js/labs/shared/stage.js`),
  tej samej co edytor sceny i laboratoria wyglądu i lądu. Zamiast własnego nieba (gradient ze słońcem) i mgły liniowej
  mają niebo SkyKit z chmurami, słońce, światło rozproszone i mgłę z pogody (domyślne oświetlenie sceny bazowej, pogoda
  „fair”; wysokość i kierunek słońca z suwaków) i odbicia z tego nieba. **Wygląd się zmienił** — do dopracowania.
- Woda: oba warianty morza (A i B) odbijają niebo SkyKit i biorą światło, blask i mgłę ze sceny bazowej; połysk
  (`shine`) liczony jak w edytorze (× 1,8), więc zasób „morze” wygląda tu i w edytorze tak samo.
- Pojazdy · woda: woda „z laboratorium wody” to morze sceny bazowej (wariant A: fale, wygląd, prąd, olej, lawa, lód);
  roboty pływają po jego falach. Woda zwykła (błyszcząca tafla) została, większa (12 km — bez krawędzi pod nowym
  niebem). NOC robota: słońce pod horyzontem (nocne niebo). Kamera widzi do 9 km.

## Program 0.42.0 — 2026-11-06 (schemat silnika w menu Pomoc)

### Dodane
- **Pomoc → Schemat silnika** (na każdej stronie): schemat z `docs/guides/engine-architecture.md` („Zasada: scena
  w środku”) narysowany ramkami zamiast ASCII — wejście, pętla silnika (Scripts → Physics → Animacje → Render →
  Post-FX → ekran), scena w środku i moduły wokół niej (Assets, Events, Network, Save/Load, Jobs/Workers, Debug +
  Editor + API dla AI); po angielsku i po polsku, na wąskim ekranie w jednej kolumnie.

## Program 0.41.1 · edytor sceny 0.13.0 · wygląd 1.4.1 · ląd 1.4.1 — 2026-11-06 (wspólna scena bazowa w laboratoriach wyglądu i lądu)

### Zmienione
- **Laboratoria wyglądu i lądu stoją na wspólnej scenie bazowej** (`js/labs/shared/stage.js`) — tej samej co edytor
  sceny: niebo, słońce, światło rozproszone, mgła, morze, teren i mapa otoczenia z nieba pochodzą z niej, laboratorium
  dokłada tylko swoje (wygląd: deszcz, błyskawice, światła okrętu, morze z wiatru; ląd: statek, kamery, mapa). Wygląd
  bez zmian (zrzuty przed i po: te same trójkąty i wywołania rysowania, różnica obrazu ≈ 0).
- Scena bazowa: opcje dla laboratoriów (promień nieba, zasięg morza, dryf chmur, przesuwanie fal, mgła rzednąca
  z wysokością kamery, co ile odświeżać mapę otoczenia), krok czasu rozdzielony na `tick` i `follow` (laboratorium
  z własną kamerą), `setWorld(T)` — świat już wygenerowany.
- Edytor sceny: **morze przy terenie z laboratorium lądu zna teren** — płycizny, przybój, fale gasnące przy brzegu,
  barwy i prądy wód (rzeka, jezioro, fiord, port), lód i olej, boje na granicy mapy; fale powtarzają się co rozmiar
  mapy — tak jak w laboratorium lądu.

## Program 0.41.0 · edytor sceny 0.12.0 · pojazdy (ląd) 1.15.1 · pojazdy (woda) 1.5.1 — 2026-11-06 (łaziki w edytorze, gąsienice, MarineKit tylko model)

### Dodane
- Edytor sceny: rodzina **Łaziki** (zwiadowca, transporter, gąsienicowy, budowniczy; VehicleKit ładowany razem
  z kitami ze Space) z zachowaniem „jazda po lądzie”.

### Zmienione
- Jazda po lądzie, gąsienice: każda gąsienica goni zadaną prędkość (dźwignia ± skręt) — napęd do mocy silnika,
  hamowanie do przyczepności; wewnętrzna gąsienica hamuje, więc pojazd gąsienicowy skręca w ruchu i obraca się
  w miejscu (wcześniej przy małej mocy nie skręcał).
- **MarineKit to już tylko model**: usunięte jego własne morze (`makeSea`, `WAVES`, `waveHeight`, płatki pod wodą
  `makeSnow` — nieużywane) i sprężyny pływania; pozę daje zachowanie `js/behaviors/water/craft.js`, bez niego
  jednostka stoi równo na linii wodnej. Geometria bez zmian (doktor modeli OK).

## Program 0.40.1 · edytor sceny 0.11.1 · pojazdy (ląd) 1.15.0 — 2026-11-06 (kołowanie samolotu, kierunek lotek i steru)

### Zmienione
- Laboratorium pojazdów (ląd): **Spitfire kołuje z fizyką lotu** (`js/behaviors/air/flight.js`: koła, hamulce,
  kółko ogonowe, śmigło) zamiast przesuwania jak samochód: W / S dźwignia gazu, A / D ster kierunku (skręca też kółko
  ogonowe), S na wolnych obrotach hamuje; AUTO kołuje na małym gazie. Pełny gaz i rozbieg — samolot może się wznieść.
  Ostatnim pojazdem na `VehicleKit.drive` w laboratoriach lądowych już nic nie jeździ.

### Poprawione
- Edytor sceny: w samolocie strzałki ← → i Q / E działały odwrotnie — w fizyce lotu dodatnie lotki i ster
  kierunku obracają w lewo (+x to lewe skrzydło), a opis mówił „w prawo”. Poprawione przypisanie klawiszy i opis
  w `flight.js` (fizyka bez zmian).

## Pojazdy (ląd) 1.14.0 — 2026-11-06 (tramwaj na torze)

### Zmienione
- **Tramwaj Swing jeździ po torze** z fizyką koło–szyna z aTrain (`js/behaviors/rail/tram.js`): pętla ok. 700 m
  (dwie proste po 160 m, dwa łuki R 60 m) ułożona na gruncie, szyny i podkłady (`buildPathTrack`). Nastawnik zadaje
  prędkość (W), S hamuje; AUTO jedzie najwyżej 30 km/h. Za szybko w łuk — wykoleja się (fizyka: ok. 45 km/h na R 60),
  ponowny wybór tramwaju stawia go na torze. Wcześniej tramwaj jeździł swobodnie jak samochód (`VehicleKit.drive`).

## Program 0.40.0 · edytor sceny 0.11.0 · pojazdy (woda) 1.5.0 · pojazdy (ląd) 1.13.0 — 2026-11-06 (małe jednostki na wodzie liczone siłami)

### Dodane
- **Zachowanie „mała jednostka na wodzie”** (`js/behaviors/water/craft.js`): łódź, barka, ślizgacz, pojazd podwodny
  i amfibia liczone z sił — śruby (moc), opór wody ∝ v², opór boczny, ster (moment ∝ v²) i pędniki azymutalne,
  wyporność z pola wodnicy, momenty prostujące do płaszczyzny fali, płaty nośne (ślizgacz wychodzi z wody przy
  prędkości i schodzi, gdy zwalnia), pędniki pionowe nurka, koła amfibii na gruncie (kontakt, napęd, zbocze).
- MarineKit: `update(…, { pose })` — model pokazuje pozę z zachowania (bez własnych sprężyn); dane do zachowania:
  płaty ślizgacza, pędniki azymutalne barki, koła amfibii.
- Laboratorium pojazdów (woda): roboty MarineKit pływają tym zachowaniem (zamiast `VehicleKit.drive` i sprężyn
  modelu); laboratorium pojazdów (ląd): amfibia też (wjeżdża do wody i wyjeżdża siłami).
- Edytor sceny: rodzina **Roboty morskie** (ślizgacz, barka, nurek, amfibia; MarineKit ładowany razem z kitami ze
  Space) z zachowaniem „mała jednostka na wodzie”: W / S maszyny (dźwignia), A / D ster, ↓ ↑ głębiej / płycej (nurek).
  Scena bazowa: `waterAt(x, z)` — powierzchnia wody z falami.

## Program 0.39.0 · edytor sceny 0.10.0 · pojazdy (ląd) 1.12.0 — 2026-11-06 (jazda po lądzie liczona siłami)

### Dodane
- **Zachowanie „jazda po lądzie”** (`js/behaviors/land/drive.js`): pojazd kołowy albo gąsienicowy liczony z sił —
  moc silnika (F = P/v, z regulatorem prędkości maksymalnej), przyczepność μ·N, hamulce, opór toczenia i powietrza,
  zbocza, opony w modelu jednośladowym (kąt znoszenia, poślizg), gąsienice (różnica sił, opór skrętu μt·N·l/4),
  woda (opór i wyporność — pojazd lądowy staje w głębokiej wodzie sam). Zastępuje kinematyczne `VehicleKit.drive`.
- Laboratorium pojazdów (ląd): łaziki VehicleKit i pojazdy drogowe RoadKit jeżdżą tym zachowaniem (koniec warunku
  „stop przy wodzie”); amfibia, tramwaj i samolot na razie po staremu.
- Dane modeli: moc silnika Poloneza (60 kW), Abramsa (1,12 MW) i Urbino 18 (235 kW); łaziki bez danych — moc
  i masa wyprowadzone z przyspieszenia i wielkości (`driveDef`).
- Edytor sceny: pojazdy drogowe mają zachowanie **jazda po lądzie** (W / S — gaz, hamulec i wstecz jak pedał,
  A / D — skręt); grunt z płaskiego lądu albo terenu, na morzu dno głęboko. Scena bazowa: `terrainAt`, `waterLevel`.

## Program 0.38.0 · edytor sceny 0.9.0 — 2026-11-06 (niebo niezależne od powierzchni)

### Zmienione
- **Niebo i powierzchnia to dwa osobne wybory** (jak w silnikach): Środowisko → **Niebo** jest przy każdej
  powierzchni — domyślne dla powierzchni (morze i ląd: dzienne, kosmos: Deep field), **dzienne** (pora dnia i pogoda),
  gotowe tła kosmosu i niebo zapisane w laboratorium ciał niebieskich. Morze albo ląd pod mgławicą, kosmos z niebem dziennym.
- Scena bazowa (`js/labs/shared/stage.js`): `setSurface` ustawia tylko wodę i grunt, nowe `setSkyMode('day' | 'space')`
  — światło, mgła i odbicia idą z nieba. Pod niebem kosmosu: słońce białe, bez mgły, woda odbija czerń i ostry
  blask słońca, daleka woda gaśnie w czerń.
- Dane: `env.sky` dla każdej powierzchni (`""`, `"day"`, `"preset:<id>"`, nazwa); stare sceny bez zmian. API: `sky: "day"`.
- Edytor ładuje kity ze Space w tle chwilę po starcie (gotowe tła na liście Niebo także nad morzem i lądem).

## Program 0.37.0 · edytor sceny 0.8.0 · filtry 0.6.0 · wygląd 1.4.0 · ląd 1.4.0 · skórki 1.1.2 — 2026-11-06 (zasoby: wygląd kamery, pogoda i światło, ląd)

### Dodane
- **Ląd jako zasób** (`land`): laboratorium lądu zapisuje teren pod nazwą (ustawienia mapy LandKit i wód RegionKit —
  sekcja „Land for the scene editor”: zapis, wczytanie, usunięcie). Scena bazowa (`js/labs/shared/stage.js`) ma
  teren: `setLand({ map, water })` — siatki LandKit z biomami, morze wokół; `groundAt(x, z)` i `isWater(x, z)`.
  Edytor: Powierzchnia **Ląd** → **Ląd** (płaski grunt albo zapisany teren), pole `env.land`; „Na powierzchnię”
  i nowy model stają na terenie; okręty w grze mają mielizny i brzeg terenu, samolot — jego wysokość.
- **Pogoda i światło jako zasób** (`weather`): laboratorium wyglądu zapisuje pogodę i porę dnia (chmury, wiatr,
  deszcz, widzialność, mgiełka, słońce, księżyc) — sekcja „Weather for the scene editor”. Edytor: Środowisko →
  **Światło** — cztery gotowe i zapisane (`env.light`: id albo nazwa). Scena bazowa: `setLight({ …pogoda })`.
- **Wygląd kamery jako zasób** (`look`): profile laboratorium filtrów są teraz zasobami (`gameLab.assets.v1`);
  dawny klucz `gameLab.lookProfiles.v1` przenosi się sam przy pierwszym odczycie. Filtry, skórki i edytor czytają
  z jednego miejsca.
- API: `env` z `land`, `light` (także nazwa pogody) i sprawdzanym `look`; `assets` wypisuje wszystkie rodzaje.

### Bez zmian (do zrobienia)
- Deszcz i błyskawice z zapisanej pogody nie padają w edytorze (scena bazowa ma tylko niebo, światło i mgłę).

## Program 0.36.0 · edytor sceny 0.7.0 · ciała niebieskie 1.5.0 — 2026-11-06 (kosmos w edytorze, skyboxy)

### Dodane
- **Kosmos w edytorze sceny**: Środowisko → Powierzchnia → **Kosmos** — czarne tło z niebem BodyKit, słońce bez
  atmosfery, odbicia z ShipKit (`makeEnvironment`), bez wody, gruntu i mgły (scena bazowa `js/labs/shared/stage.js`:
  `setSurface('space')`, `setSpaceEnvironment`).
- **Skyboxy**: Środowisko → **Niebo** — gotowe tła z laboratorium układów (Deep field, Quiet sky, Crimson nebula,
  Emerald nebula, Galactic core, Black) i własne, zapisane w laboratorium ciał niebieskich; pole `env.sky`.
- **Laboratorium ciał niebieskich**: przy Niebie sekcja **Sky for the scene editor** — zapis nieba pod nazwą (zasób
  `sky`, `js/scene/assets.js`), wczytanie, usunięcie.
- **Statki kosmiczne jako prefabrykaty** (rodzina `space`): SP-01 Codewing, DR-01 Scribe (dron), SW-01 Swarmer,
  ST-04 Haven (stacja). Kity ze Space ładują się dopiero, gdy scena ich potrzebuje (`js/scene/space.js`).
- **Zachowanie „ciąg w próżni”** (`js/behaviors/space/thrust.js`): bryła sztywna bez oporu i grawitacji — ciąg
  silnika głównego i wstecznego, silniczki manewrowe na trzy osie, stabilizacja obrotu ich momentem. Liczby statków
  (masa, ciąg, moment) założone — statki są wymyślone.
- API: `surface: "space"`, `sky`, gotowe tła w `assets`.

## Program 0.35.0 · 19 laboratoriów — 2026-11-05 (laboratoria w wolnym środku)

### Zmienione
- **Laboratoria 3D w wolnym środku**, jak edytor sceny (`body.viewFits`): w trybie Panele widok zajmuje środek między
  panelami i konsolą, a renderer liczy się z rozmiaru widoku; na pasku przełącznik **Środek | Całość**. Laboratoria:
  pojazdy (kosmos, woda, ląd), woda, ląd, filtry, wygląd, jaskinie, przedmioty bohatera, rośliny, budowle,
  transformator, ciała niebieskie, układy, powierzchnia, budynki, życie, edytor stworów, człowiek (każde +0.1).
  Bez zmian: skala i skórki (bez okien), dźwięk (obraz 2D), Pixel Studio, generator zombie, Kostnica SDF, SDF Walkers,
  laboratoria języka i obrazów.
- Wspólne okna (`ui/shell/windows.js`): `LabView.size()` — prostokąt widoku `{ w, h, x, y }`; zmiana rozmiaru `#view`
  (panele, konsola, Środek | Całość, paski) wysyła stronie zdarzenie `resize`, więc każde laboratorium dopasowuje się
  w swoim zwykłym kodzie. Klasa `.viewLayer` — nakładka nad widokiem (podpisy w układach, wymiary w pojazdach — woda)
  w tym samym prostokącie. Laboratoria ze Space mają teraz `<div id="view"><canvas id="viewCanvas">`.
- Wskazywanie myszą (wybór części, trafienia, uchwyty) liczone względem widoku, nie okna przeglądarki.

## Program 0.34.0 · edytor sceny 0.6.0 · laboratorium wody 1.3.0 — 2026-11-05 (zasoby z nazwą: morze)

### Dodane
- **Zasoby z nazwą** (`js/scene/assets.js`, silnik): ustawienia zapisane w laboratorium pod nazwą
  (`localStorage["gameLab.assets.v1"]`), które edytor sceny i API wybierają z listy. Pierwszy rodzaj: **morze**
  (stan morza i wygląd wody).
- Laboratorium wody: sekcja **Asset for the scene editor** — zapis edytowanego wariantu jako morza pod nazwą,
  wczytanie zapisanego do wariantu, usunięcie.
- Edytor sceny: Właściwości → Środowisko → **Morze** (domyślne albo zapisane; lista odświeża się, gdy laboratorium wody
  w innej karcie coś zapisze); pole `env.sea` w danych sceny. Morza, którego nie ma w tej przeglądarce, scena nie gubi:
  widać morze domyślne i ostrzeżenie.
- API: `{"cmd":"assets"}` (lista zasobów) i `env.sea`.
- Scena bazowa (`js/labs/shared/stage.js`): `setSea(…)` — fale i wygląd wody z zasobu (laboratorium filtrów bez zmian).

## Edytor sceny 0.5.0 — 2026-11-05 (cofnij / ponów)

### Dodane
- **Cofnij / Ponów** w edytorze sceny (przyciski na pasku, Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z): każda zmiana danych sceny —
  z okien, uchwytu, klawiszy i API; lista poleceń API to jeden krok. Historia do 100 kroków, w pamięci karty.

## Program 0.33.0 · edytor sceny 0.4.0 — 2026-11-05 (API dla AI)

### Dodane
- **API sceny** (`js/scene/api.js`, silnik, bez Three.js): polecenia JSON na scenie jako danych — `help`, `describe`,
  `prefabs`, `add`, `set`, `move`, `remove`, `env`, `select`, `new`, `load`, `play`, `stop`; jedno polecenie albo lista,
  wynik `{ ok, … }` albo `{ ok: false, error }`. Obiekt wskazuje się przez `id` albo `name`. Sprawdza dane (model,
  zachowanie pasujące do modelu, liczby, oświetlenie) i nie zmienia sceny w czasie gry.
- **Konsola z zakładkami** (`ui/shell/console.js`): pierwsza — Dziennik, strona dodaje własne przez
  `window.LabConsole.addTab({ id, title, titlePl, el })` (przed załadowaniem konsoli: `window.LabConsoleTabs`).
- Edytor sceny: zakładka **API** w konsoli (polecenie, Ctrl+Enter, wyniki, wpis w dzienniku) i `window.sceneApi.run(…)`
  dla AI sterującej przeglądarką.

## Program 0.32.0 · edytor sceny 0.3.0 — 2026-11-05 (zachowania i „Graj”)

### Dodane
- **Zachowania w scenie** (`js/scene/behaviors.js`, silnik): podpięcie zachowań z `js/behaviors/` do prefabrykatów —
  „okręt na wodzie” (`water/ship.js`) dla okrętów i „lot w atmosferze” (`air/flight.js`) dla samolotu. Obiekt sceny
  wybiera zachowanie polem `behavior` (bez pola — domyślne dla modelu, `''` — stoi w miejscu); format sceny dalej w wersji 1.
- Prefabrykaty zwracają też obiekt kitu (`build() → { root, kit, dispose }`) — z niego zachowania biorą wymiary i ruchome części.
- **Edytor sceny: ▶ Graj / ■ Stop** (klawisz P, Esc) — zachowania ruszają modele, gracz steruje wybranym klawiaturą,
  kamera jedzie za nim; edycja w tym czasie wyłączona, po „Stop” modele wracają na miejsca z danych. We Właściwościach
  lista **Zachowanie**.

## Program 0.31.2 · edytor sceny 0.2.2 — 2026-11-05 (konsola: okno albo panel)

### Dodane
- **Konsola: okno albo panel** — pinezka (⤓ / ⤒) na pasku tytułu konsoli przypina ją na dole, między panelami, albo
  zostawia jako pływające okno, niezależnie od trybu Okna | Panele; kliknięcie tego przełącznika przywraca konsoli jego
  ustawienie. Wybór zapamiętany w przeglądarce (`gamelab.console`).

## Program 0.31.1 · edytor sceny 0.2.1 — 2026-11-05 (Środek | Całość)

### Dodane
- Na stronach z widokiem dopasowanym do paneli (`body.viewFits`, na razie edytor sceny) przełącznik **Środek | Całość**
  na pasku narzędzi: scena w wolnym środku albo na całej przestrzeni od paska narzędzi do paska informacji, pod panelami.
  Zapamiętany w przeglądarce (`gamelab.viewfit`).

## Program 0.31.0 · edytor sceny 0.2.0 — 2026-11-05 (prawdziwe panele)

### Zmienione
- **Panele** (przełącznik Okna | Panele, `ui/shell/windows.js`): zamiast okien ułożonych w kolumnach — prawdziwe panele
  przy krawędziach, między paskami, z oknami jako sekcjami (tytuł jako nagłówek, cienka linia pod spodem), przewijane.
- **Konsola** w Panelach dokuje się na dole pośrodku, między panelami (wysokość zmienia się, ciągnąc jej róg).
- Wolny środek publikowany jako `--viewL`, `--viewR`, `--viewB` i `window.LabView`; strona z `body.viewFits` wstawia tam
  swój widok 3D. Edytor sceny już tak robi; laboratoria mają na razie widok na całym ekranie pod panelami.

## Program 0.30.0 · edytor sceny 0.1.1 — 2026-11-05 (okno albo panel)

### Dodane
- **Okno albo panel** we wszystkich laboratoriach, narzędziach i w edytorze (`ui/shell/windows.js`): pinezka (⇤ / ⇥) na pasku
  tytułu przypina okno do panelu po jego stronie — kolumna między paskami, okna jedno pod drugim, przewijana — i odpina je
  z powrotem tam, gdzie stało. Przełącznik **Okna | Panele** na pasku narzędzi (po prawej, przed Konsolą) robi to dla
  wszystkich okien naraz; przy mieszanym układzie nie świeci żaden. Zapamiętane w przeglądarce razem z położeniem okien.

## Program 0.29.0 · edytor sceny 0.1.0 — 2026-11-05 (edytor sceny)

### Dodane
- **Edytor sceny** („Warsztat”) w osobnym folderze `editor/` — szczegóły: `editor/CHANGELOG.md`, opis: `editor/README.md`.
  Scena z modeli laboratoriów na morzu albo lądzie, uchwyt przesuń / obróć / skaluj, zamiana modelu z listy,
  światło i wygląd kamery z laboratorium filtrów, zapis w przeglądarce i do pliku. Angielski (domyślny) i polski.
- Silnik: scena jako dane `js/scene/scene-data.js` (format `gamelab-scene` 1) i prefabrykaty z kitów `js/scene/prefabs.js`.
- `vendor/three/addons/controls/TransformControls.js` (Three.js r186).

### Zmienione
- Scena bazowa laboratorium filtrów przeniesiona do `js/labs/shared/stage.js` (wspólna z edytorem).
- Pasek menu: strony w `editor/` rozpoznawane jak laboratoria; strona może mieć własny język domyślny
  (`<html data-lang-default="en">` — przy „Automatycznie” zamiast języka przeglądarki).

## Laboratorium obrazów 0.29.1 — 2026-11-05 (karta graficzna przy 64×40)

### Poprawione
- Przy 64×40 karta graficzna odmawiała („Binding size 209715200 … larger than the maximum storage buffer binding size
  134217728”) i nauka szła na procesorze: macierze uwagi 2 × głowy × 2560 × 2560 mają ok. 200 MB, a WebGPU domyślnie
  pozwala na 128 MB. Silnik GPU (`js/labs/lang/gpu.js`, wspólny z laboratorium języka) prosi teraz kartę o jej
  największe bufory (`maxStorageBufferBindingSize`, `maxBufferSize` z limitów adaptera).

## Program 0.28.0 · doktor modeli 1.2.5 — 2026-11-05 (bomba 250 lb)

### Dodane
- WeaponKit: **bomba 250 lb GP Mk IV** (`js/models/weapons/bomb250.js`): korpus z profilu obrotowego, zapalnik, pas,
  statecznik skrzynkowy, uchwyty podwieszenia (`docs/models/weapons/README.md`); w doktorze modeli automatycznie.

## Program 0.27.0 · laboratorium człowieka 1.2.0 · doktor modeli 1.2.4 — 2026-11-05 (zombie, broń, reflektor czołgu)

### Dodane
- Człowiek (LifeKit): warstwy ruchu **zombie** (pochylony, głowa opadająca na bok, ręce wyciągnięte przed siebie,
  powłóczona noga), **atak** (wypad, ręce drapiące na zmianę) i **broń gotowa** (`aim`: długa broń trzymana przed sobą); odcienie skóry „Zombie (grey-green)”, „Corpse (waxy)”,
  ubranie „Torn and filthy”.
- **WeaponKit** (`js/models/weapons/`) i karabinek **kbs wz. 96 Beryl** z błyskiem wylotowym (`docs/models/weapons/README.md`);
  doktor modeli: źródło `tools/doctor/sources/weapons.js`.
- M1A2 Abrams: opcjonalny **reflektor szperacz** przy armacie (`build({ searchlight: true })`, `update({ searchlight })`);
  w doktorze modeli wariant „Abrams (reflektor)”.

## Program 0.26.0 — 2026-11-05 (zachowanie „okręt na wodzie”)

### Dodane
- Zachowanie **„okręt na wodzie”** (`js/behaviors/water/ship.js`, środowisko woda): ruch w płaszczyźnie (naprzód, w bok,
  obrót) z ciągu z mocy, oporu kadłuba ∝ v², steru zależnego od prędkości i promienia cyrkulacji; kołysanie (zanurzenie,
  przegłębienie, przechył) za falami WaterKit pod kadłubem, przechył na cyrkulacji; mielizna — opór gruntu, bez
  przyklejania. `shipDef(model, liczby)` — liczby ruchu z modelu ShipKit (ORP Błyskawica: 2144 t, 54 000 KM, 39 w).
- Opis: `docs/models/ships-sea/blyskawica.md` (sekcja „Ruch”).

## Program 0.25.0 · laboratorium pojazdów (ląd) 1.10.0 · doktor modeli 1.2.3 — 2026-11-04 (samolot Spitfire Mk I, lot)

### Dodane
- **AirKit** (`js/models/air/`) i **Supermarine Spitfire Mk I** (1940): kadłub z przekrojów, skrzydło eliptyczne z profilu
  NACA, lotki, klapy, stery, chowane podwozie, przesuwana owiewka, kabina z przyrządami, śmigło, malowanie i znaki RAF
  (`docs/models/air/spitfire.md`).
- Zachowanie **„lot w atmosferze”** (`js/behaviors/air/flight.js`, środowisko ląd): 6 stopni swobody, nośna i opór
  z przeciągnięciem, ciąg śmigła z mocy, momenty stateczności i sterów, koła na sprężynach z hamulcami.
- Laboratorium pojazdów (ląd): samolot na liście; doktor modeli: źródło `tools/doctor/sources/air.js`.
- Plan AirKit (`docs/models/air/spitfire.md`): śmigłowiec W-3 Sokół, Boeing, odrzutowy F-15.

## Program 0.24.0 — 2026-11-04 (koło na szynie: tor z dowolnej ścieżki, tramwaj)

### Dodane
- Zachowanie „koło na szynie”: tor z dowolnej ścieżki (`js/behaviors/rail/path.js` — łuki i proste z wygładzonej osi,
  także z OpenStreetMap), `createSim` z własnym torem i składem, przeguby członów, napęd na wszystkich pojazdach
  `driven`, siły z warstwy świata (`onStep`). Bez opcji fizyka działa jak dotąd (ten sam wynik).
- Tramwaj w tej fizyce (`js/behaviors/rail/tram.js`): PESA Swing 120Na — człony na wózkach stałych na swoich zestawach
  kołowych, podwieszone na przegubach; liczby fizyki w modelu (`info.phys`).
- Tor wzdłuż ścieżki: szyny z przekroju z kontaktu, podkłady, podsypka (`js/models/structures/railway/path-track.js`).
- Opis: `docs/models/train/fizyka.md` (tor z dowolnej ścieżki i tramwaj).

## Program 0.23.1 · laboratorium pojazdów (ląd) 1.9.1 — 2026-11-04 (tramwaj: widok z kabiny)

### Zmienione
- PESA Swing 120Na: czoło z ramą wokół szyby (panel dolny, słupki, maska z wyświetlaczem) zamiast pełnej bryły — z kabiny
  widać tor przed tramwajem; wnętrze kabiny wyłożone od środka nosa.

## Program 0.23.0 · laboratorium pojazdów (ląd) 1.9.0 · doktor modeli 1.2.2 — 2026-11-04 (tramwaj PESA Swing 120Na)

### Dodane
- **TramKit** (`js/models/train/trams/`) i **PESA Swing 120Na** Tramwajów Warszawskich: 5 członów (3 na wózkach stałych),
  człony jako osobne grupy do ustawienia na łuku toru, harmonijki rozciągane między nimi, drzwi odskokowo-przesuwne,
  wnętrze, kabina, pantograf, wózki z zestawami kołowymi i silnikami (`docs/models/train/swing.md`).
- Laboratorium pojazdów (ląd): tramwaj na liście; doktor modeli: źródło `tools/doctor/sources/tram.js`.

## Program 0.22.0 · laboratorium pojazdów (ląd) 1.8.0 · doktor modeli 1.2.1 — 2026-11-04 (M1A2 Abrams, Solaris Urbino 18)

### Dodane
- **M1A2 Abrams** (RoadKit, `tanks/abrams.js`): kadłub z płytami czołowymi i pokładem przeciwpoślizgowym, osłony burt,
  gąsienice z ogniw (instancje) biegnące po obwiedni kół, koła jezdne na drążkach skrętnych podążające za podłożem,
  wieża z celownikami, wieżyczką dowódcy, karabinami, wyrzutniami dymnymi i koszem, armata 120 mm; obrót wieży,
  podniesienie armaty, właz dowódcy (`docs/models/road/abrams.md`).
- **Solaris Urbino 18 electric** w barwach MZA (RoadKit, `buses/urbino18.js`): dwa człony z przegubem liczonym jak
  naczepa i gnącą się harmonijką, drzwi 2-2-2-2 odskokowo-przesuwne, wnętrze (siedzenia, poręcze, oświetlenie),
  wyświetlacze LED linii 175, baterie i klimatyzatory na dachu (`docs/models/road/urbino18.md`).
- RoadKit: gąsienice (`tracks.js`), farba matowa z brudem i szum (`materials.js`), profil wyciągnięty w poprzek i graniastosłup (`geom.js`).
- Laboratorium pojazdów (ląd): oba na liście; pojazdom gąsienicowym podaje prędkość obrotu.

## Program 0.21.0 · laboratorium pojazdów (ląd) 1.7.0 · doktor modeli 1.2.0 — 2026-11-04 (pojazdy drogowe: FSO Polonez)

### Dodane
- **RoadKit** (`js/models/road/`) — nowa rodzina modeli: prawdziwe pojazdy drogowe dla gry CityExplorer (Warszawa 3D).
  Geometria nadwozia z przekrojów, materiały (lakier z lakierem bezbarwnym, chrom, szkło, klosze, bieżnik, tablice z PRL),
  ruch w grupie pojazdu (koła z Ackermannem, zawieszenie na podłożu, przechył i „kucanie”, światła, drzwi). Opis:
  `docs/models/road/README.md`.
- **FSO Polonez 1500 (MR'78)** w wymiarach fabrycznych: okna jako otwory z szybami i wnętrzem za nimi, drzwi kierowcy
  na zawiasie, maskownice słupka C, zderzaki owinięte na narożnikach, lampy ze światłem, wnętrze, podwozie, koła z
  bieżnikiem (`docs/models/road/polonez.md`).
- Laboratorium pojazdów (ląd): Polonez na liście, lista **Paint** z kolorami lakieru, DRZWI KIEROWCY pod WORK.
- Doktor modeli: źródło `tools/doctor/sources/road.js` (pojazdy RoadKit).

## Laboratorium obrazów 0.29.0 — 2026-11-03 (64×40 w 256 kolorach)

### Dodane
- **Drugi zbiór danych: 64×40 × 256 kolorów** — 10 kategorii zdjęć CIFAR-10 po 600 (`data/img-color/`, skrypt
  `tools/img/build_cifar.py`): środkowy pas 32×20 powiększony ×2, jedna wspólna paleta 256 kolorów (median cut).
  Wybór na pasku narzędzi: 16×16 · 16 odcieni szarości (jak dotąd) albo 64×40 · 256 kolorów (`?set=color`, pamiętany).
- Wszystkie pięć konstrukcji działa na obu zbiorach: statystyka i transformer zgadują numer koloru (1 z 256), VAE, GAN,
  dyfuzja i klasyfikator rysują R, G, B (7680 liczb), a wynik idzie do najbliższego koloru palety. Rozmiar i paleta
  przychodzą do wątku treningowego z danymi; maska obszarów i gotowe układy działają w 64×40 (pędzel 3×3).
- W kolorze: mniejszy transformer na start (2 × 32, 2 głowy, 2 obrazki na krok, 1000 kroków), podglądy rzadziej
  (dyfuzja co 40 s, transformer 4 obrazki co minutę), sprawdzanie transformera po jednym obrazku. Zgadywanie z rysunku
  myszką i mapa uwagi (2560 × 2560 na głowę) tylko przy 16×16.

## Program 0.20.9 — 2026-11-02 (domek w nawigacji)

### Dodane
- Między strzałkami cofnij / ponów **domek**: otwiera stronę startową laboratoriów (na stronie startowej wyszarzony).

### Zmienione
- Laboratorium skórek 1.1.1: przycisk **Filters lab** zaraz po nawigacji, przed listami (zasada kolejności w `CLAUDE.md`).

## Laboratorium skórek 1.1.0 — 2026-11-02 (efekty ekranu z profili laboratorium filtrów)

### Dodane
- Lista profili na pasku narzędzi: profile zapisane w laboratorium filtrów (`gameLab.lookProfiles.v1`) jako efekty ekranu
  na makiecie. Strona jest w HTML, więc wygląd jest przybliżony CSS-em: ekspozycja, kontrast, nasycenie + vibrance,
  poświata (filtr na `#stage`), temperatura i odcień (warstwy koloru), winieta i ziarno (warstwy w `#fx`). Tone mapping,
  automatyczna ekspozycja i efekty obiektywu nie mają tu na czym działać. Profil zapisany w filtrach pojawia się po
  powrocie (cofnij) albo od razu, gdy filtry są otwarte w innej karcie.

## Laboratorium pojazdów — kosmos 1.6.2, woda 1.3.2, ląd 1.6.2 — 2026-11-02 (kolejność na pasku)

### Zmienione
- Przełącznik środowiska stoi zaraz po cofnij / ponów, przed listą pojazdów. Zasada w `CLAUDE.md`: cofnij / ponów,
  przełącznik laboratoriów, potem listy rozwijane i inne (laboratoria kosmosu już tak miały).

## Program 0.20.8 — 2026-11-02 (cofnij / ponów, repozytorium w Pomocy)

### Dodane
- **Cofnij / ponów** na każdej stronie: dwa połączone przyciski ← → jako pierwsze na pasku narzędzi (historia przeglądarki,
  `ui/shell/nav.js`, ładowany przez pasek menu jak konsola); wyszarzone, gdy nie ma dokąd iść.
- **Pomoc → Repozytorium (GitHub)**: link do repozytorium GameLaboratory.
- Laboratorium skórek 1.0.6: przycisk **Filters lab** na pasku narzędzi (laboratorium filtrów).

## Laboratorium filtrów 0.4.0 — 2026-11-02 (profile)

### Dodane
- **Profile**: w oknie Kamera nazwa i przyciski Save profile / Delete profile — profil to cały wygląd (suwaki, tone mapping,
  automatyczna ekspozycja), zapisany w przeglądarce (`gameLab.lookProfiles.v1`). Zapisane profile wybiera się z listy
  na pasku narzędzi; zmiana suwaka odznacza profil.

## Laboratorium skórek 1.0.5 — 2026-11-02 (wybór skórki na pasku, bez CRT)

### Zmienione
- Skórkę (TERMINAL / SYNTAX) wybiera się z listy na pasku narzędzi (dalej też klawisze 1 / 2); przełącznik w rogu podglądu usunięty.
- Efekt CRT (linie, przesuwający się pas, migotanie, przycisk CRT, klawisz C) usunięty — efekty ekranu mają przyjść z laboratorium filtrów.

### Poprawione
- Paski makiety (`.bar` w `ui/pages/skins.css`) zawężone do `#stage`: w skórce SYNTAX pasek narzędzi strony robił się fioletowy.

## Program 0.20.7 — 2026-11-02 (grupy laboratoriów)

### Dodane
- **Grupy laboratoriów** w katalogu (`group`, `tab` / `tabPl`): **pojazdy** (kosmos · woda · ląd) i **laboratoria kosmosu**
  (ciała niebieskie · układy · skala).
- Laboratoria kosmosu: wspólne śliwkowe tło kafelków (jak ciał niebieskich), śliwkowa poświata w menu Narzędzia (token `--plum`)
  i **przełącznik grupy** na pasku narzędzi (`.groupSwitch` w `ui/shell/envswitch.js`): ciała niebieskie 1.3.1, układy, skala.
- Najechanie na kafelek grupy podświetla wszystkie jej kafelki; najechanie na pozycję grupy w menu Narzędzia podświetla
  wszystkie jej pozycje, z kropką przy każdej. Tak samo dla pojazdów (złote).

## Program 0.20.6 — 2026-11-02 (pasek menu przy starej kopii ui.css)

### Poprawione
- Po 0.20.5 przeglądarka mogła mieć w pamięci podręcznej starą kopię `ui/ui.css` (bez arkusza paska menu) i nową
  `menubar.js` (która już go nie dokładała) — pasek menu znikał do czasu odświeżenia kopii. Teraz `menubar.js`
  sprawdza, czy styl paska działa, a jeśli nie — sam dokłada `ui/shell/menubar.css` i `console.css`.

## Program 0.20.5 — 2026-11-02 (pasek menu od razu ze stroną)

### Poprawione
- Przy odświeżeniu (zwłaszcza Ctrl+Shift+R) pasek menu znikał na chwilę, a paski narzędzi i informacyjny już były.
  Jego arkusz był dokładany przez `menubar.js` dopiero w trakcie ładowania, a do tego czasu pasek był ukryty.
  Teraz `ui/shell/menubar.css` i `console.css` są w `ui/ui.css` (strona startowa linkuje je sama), więc pasek menu
  rysuje się razem ze stroną; `menubar.js` już go nie ukrywa.

## Program 0.20.4 — 2026-11-02 (pojazdy w menu Narzędzia)

### Zmienione
- **Pasek menu → Narzędzia**: laboratorium pojazdów ma trzy pozycje, jak kafelki — kosmos, woda, ląd (`Pojazdów · kosmos` itd.);
  ich tekst ma złotą poświatę (`.lmGlow` w `ui/shell/menubar.css`), żeby było widać, że to jedno laboratorium.
  Kropka bieżącej strony stoi przy właściwym środowisku.

## Program 0.20.3 — 2026-11-02 (trzy kafelki laboratorium pojazdów)

### Zmienione
- **Strona startowa**: laboratorium pojazdów ma trzy kafelki — **kosmos** (`labs/vehicles-space.html`), **woda**
  (`labs/vehicles-water.html`), **ląd** (`labs/vehicles-land.html`). Wspólne tło; każdy ma swój obrazek (statek, okręt,
  pociąg), opis, kity i frazy (kosmos / woda / ląd). Katalog: strony wody i lądu mają własne opisy, frazy i obrazki;
  strona startowa robi kafelek każdej strony laboratorium, która ma obrazek. Pasek menu bez zmian (jedna pozycja).

## Program 0.20.2 — 2026-11-02 (nazwy stron laboratorium pojazdów; bez Tekstury ziarna)

### Zmienione
- **Laboratorium pojazdów** — strony nazwane według środowiska: `labs/ship.html` → `labs/vehicles-space.html` (1.6.1),
  `labs/warship.html` → `labs/vehicles-water.html` (1.3.1), `labs/vehicles.html` → `labs/vehicles-land.html` (1.6.1).
  Tak samo skrypty (`js/labs/vehicles-space|vehicles-water|vehicles-land/`, `landsource.js` → `land-source.js`),
  style (`ui/pages/vehicles-space.css`, `vehicles-land.css`) i dokumenty (`docs/labs/vehicles-space.md`, `vehicles-land.md`).
  Przełącznik środowiska, katalog, wersje, mapa strony i `tools/lab-check.py` wskazują nowe strony.
  Dawne adresy (`ship.html`, `warship.html`, `vehicles.html`) już nie działają. Zapisane ustawienia (`shipLab.*`) zostają.

### Usunięte
- Narzędzie **Tekstura ziarna** (`tools/grain-texture.*`, `ui/pages/grain-texture.css`) — laboratoria go nie używały.

## Program 0.20.1 — 2026-11-02 (dokumentacja w układzie kodu)

### Zmienione
- **`docs/`** w tym samym układzie co kod: `docs/labs/` (laboratoria), `docs/models/` (statki morskie, pociąg, MarineKit),
  `docs/tools/` (doktor modeli, dawne `doctor/README.md`), `docs/guides/` (przewodnik po laboratoriach, renderowanie,
  pułapki), `docs/history/` (historia sprzed przeniesienia, remanent `AUDIT.md` → `history/audit-2026-11.md`,
  mapa laboratoriów z Battle). `docs/README.md` przepisany jako mapa.
- **`ui/README.md`** opisuje podfoldery `style/`, `shell/`, `data/` i wzorzec strony (`log.js`, `perf.js`, `labwin.js`).
- Dokumenty laboratoriów (pojazdy · kosmos, ciała niebieskie, układy, życie, człowiek, budowle, woda, pixel) opisują
  okna zamiast dawnego HUD-u i paneli; przewodnik — okna, konsolę, laboratorium pojazdów · woda.
- **`CLAUDE.md`**: nowe ścieżki (`js/labs/<lab>/`, `js/models/marine/`, `ui/` w podfolderach, `docs/`) i zasada nazewnictwa.
- **`TODO.md`**: bez pustych sekcji i nieaktualnych pozycji.

## Program 0.20.0 — 2026-11-02 (porządek w plikach i nazwach)

### Zmienione
- **Skrypty laboratoriów**: każde laboratorium we własnym folderze `js/labs/<lab>/`, główny plik `<lab>.js`
  (np. `js/labs/ship/ship.js`; `scale/scaleLab.js` → `scale/scale.js`, `filters/page.js` → `filters/filters.js`,
  `pixel/app.js` → `pixel/pixel.js`, `walkers/main.js` → `walkers/walkers.js`). Wspólne skrypty laboratoriów:
  `js/labs/shared/`.
- **`ui/` w podfolderach**:
  - `ui/style/` — tokeny, czcionki, podstawa, kontrolki, motywy `space.css` i `sea.css`;
  - `ui/shell/` — pasek menu, paski, okna, okna standardowe, wydajność, konsola, dziennik, karta ładowania,
    przełącznik środowiska;
  - `ui/data/` — katalog i wersje;
  - `ui/pages/` — style stron (bez zmian).

  Jedno wejście dla stron zostaje: `ui/ui.css`.
- **Mniejsze pliki**:
  - dziennik konsoli (`LabLog`) wyszedł z `menubar.js` do `ui/shell/log.js` (pierwszy skrypt każdej strony);
  - liczniki wydajności (`LabPerf`) wyszły z `labwin.js` do `ui/shell/perf.js`.
- **MarineKit** (statki-roboty) przeniesiony do modeli: `js/models/marine/marinekit.js` (był w `js/envs/water/`).
- **Nazwy plików** w kebab-case:
  - `js/envs/space/solarSystem.js` → `solar-system.js`;
  - narzędzie `tools/grainTexture.*` → `tools/grain-texture.*`, styl `ui/pages/grain-texture.css`.
- **Nazwy w kodzie**: `LabKit.autoHideHud(panele, s)` → `LabKit.autoHideWindows()` (sam bierze wszystkie okna
  strony); `LabKit.perfCounters` usunięty — laboratoria wołają `LabPerf.end(renderer, cpuMs)` bezpośrednio.
- Narzędzia znają nowe miejsca (`tools/sitemap.py`: `ui/data/catalog.js`); wszystkie ścieżki w stronach,
  arkuszach, narzędziach i dokumentach poprawione (`tools/paths.py --strict`: 0 / 0).

## Program 0.19.1 — 2026-11-02 (wspólne okna, część 2: laboratoria z Battle i reszta)

### Zmienione (y+1)
- Jaskinie, przedmioty bohatera, woda, ląd, wygląd, rośliny, budowle, filtry, transformator, laboratorium pojazdów
  (woda), Pixel Studio, generator zombie i Kostnica SDF — na standardowych oknach (`ui/labwin.js`):
  - **Opis**: nazwa, podpis, tekst o laboratorium lub modelu, dane, rekonstrukcja i źródła;
  - **Kamera**: widoki, auto-obrót, ekspozycja, pole widzenia, wygląd kamery (presety, mapowanie tonów, efekty),
    noktowizor i lornetka;
  - **Światło i pogoda**: słońce, pogoda, wiatr, pora dnia, latarka i lampa, światło otoczenia;
  - **Wydajność**: wspólne liczby i wykres z `LabPerf`, model, ustawienia jakości i pomiar kosztu efektów.
- Własne liczniki klatek i wywołań rysowania w tych laboratoriach usunięte — liczy `LabPerf` (także licznik na
  pasku dolnym).
- Klawisz H chowa wszystkie okna strony (wcześniej tylko dwa panele).
- Pixel Studio: okna Kamera i Światło dotyczą modelu 3D i chowają się w trybach „Generate” i „Draw”.

### Wyjątki
- Bez okien opcji: doktor modeli (własne listy modeli i znalezisk), skala, skórki, SDF Walkers, laboratorium języka
  i obrazów (strony-dokumenty).

## Program 0.19.0 — 2026-11-02 (wspólne okna, część 1: laboratoria ze Space)

### Nowe
- **Standardowe okna** (`ui/labwin.js`, `ui/labwin.css`): element z `data-std` staje się jednym z czterech okien,
  które na każdej stronie mają ten sam tytuł (EN/PL), stronę i miejsce w kolejności:
  - **Opis** (lewa, pierwsze): nazwa (`.stdName`), podpis (`.stdSub`), opis (`.stdText`), dane modelu;
  - **Kamera** (prawa): widoki, auto-obrót, wygląd kamery;
  - **Światło i pogoda** (prawa);
  - **Wydajność** (prawa, ostatnie) — generowana w jednym miejscu, wszędzie identyczna: klatki na sekundę, czas
    klatki, CPU na klatkę, rysowane trójkąty, wywołania rysowania, rozdzielczość, wykres; pod spodem **Model**
    (trójkąty, wierzchołki, siatki, materiały, tekstury, czas budowy — `LabPerf.model(grupa)` albo własne wiersze
    `LabPerf.modelRows`), a niżej ustawienia jakości laboratorium.

  Własne okna laboratorium stoją po lewej, za Opisem. Drugie duże okno własne może stać po prawej, nad wspólnymi.
- `LabPerf` (w `ui/labwin.js`) zastępuje liczniki laboratoriów; `LabKit.perfCounters` tylko do niego przekazuje.
  Licznik klatek na pasku dolnym też idzie z `LabPerf`.
- Okna bez zapamiętanego miejsca: gdy kolumna się zapełni, kolejne stają w następnej kolumnie obok, a nie na sobie.
- Wszystkie okna strony wygasają przy bezczynności (wcześniej tylko dwa panele).

### Zmienione — laboratoria ze Space (y+1)
- Statki, ciała, układy, powierzchnia, budynki, pojazdy (ląd), dźwięk, życie, człowiek, edytor stworów — okna
  przebudowane na Opis + własne + Kamera / Światło i pogoda / Wydajność:
  - auto-obrót i efekty obrazu przeszły do Kamery;
  - „Game lighting”, „Ship light”, „Night”, niebo i pogoda — do Światła;
  - jakość renderowania i szczegółowość geometrii — do Wydajności;
  - statystyki modelu z okien „Stats” i „Model” — do Wydajności;
  - dane opisowe (fizyczne, moduł, pojazd, układ) — do Opisu.
- Dźwięk nie ma kamery ani wydajności (bez sceny 3D).
- Usunięte stare style liczników (`#fpsGraph`, `.legend`, `#hudTitle`, `#hudSub` w `ui/space.css`).

## Program 0.18.2 — 2026-11-02

### Zmienione
- **Paski na każdej stronie**: pasek narzędzi (z przyciskiem konsoli) i pasek informacyjny (klatki na sekundę,
  GameLaboratory) mają teraz także laboratorium obrazów, laboratorium języka, SDF Walkers, skórki, Kontrola kitów
  i Tekstura ziarna. Strony przewijane jak dokument dostały `<body class="pageFlow">` (`ui/bars.css`): zaczynają się
  pod paskami i kończą nad dolnym, także gdy któryś pasek jest wyłączony. Skórki dopasowują scenę do miejsca
  między paskami (i po przełączeniu pasków).
- Prostszy kod: bez osobnych odstępów tych stron (`walkers.css`, `kitcheck.css`, `grainTexture.css`) i bez reguł
  `lmTool` w `ui/menubar.css`.
- Wersje: program 0.18.2; te laboratoria i narzędzia z+1.

## Program 0.18.1 — 2026-11-02

### Zmienione
- Konsola: dziennik zostaje w przeglądarce do zamknięcia karty (`sessionStorage` `gamelab.log`, do 600 wpisów), więc
  idzie za Tobą z laboratorium do laboratorium; przy każdym wpisie strona, z której pochodzi (też w filtrze).
  „Clear” czyści także zapisany dziennik.
- Strona startowa: oba paski (pasek narzędzi z przyciskiem konsoli i pasek informacyjny „GameLaboratory · MIT”
  zamiast stopki); przełączniki w OPCJE → Paski działają też tutaj.

## Program 0.18.0 — 2026-11-02 (konsola, karta ładowania z etapami, lista pojazdów na lądzie)

### Nowe
- **Konsola**: przycisk „Console” po prawej na pasku narzędzi każdego laboratorium otwiera przesuwane, zamykane okno
  z dziennikiem strony — błędy (także nieprzechwycone i pliki, których nie udało się wczytać), ostrzeżenia, komunikaty
  konsoli, etapy i czasy ładowania. Najnowsze na górze, data i czas, filtr po rodzaju i po tekście, „Wyczyść”.
  Położenie i to, czy jest otwarte, zostają w przeglądarce (`gamelab.console`). Pliki: `ui/console.js`,
  `ui/console.css`; dziennik `window.LabLog` zaczyna `ui/menubar.js` (pierwszy skrypt strony).
- **Karta ładowania** (`ui/loader.js`) pokazuje nazwę etapu i procent:
  - przy starcie strony sama liczy postęp — wczytywane skrypty („Loading shipkit.js”), budowa sceny, pierwsza klatka;
  - laboratorium zgłasza własne etapy przez `LabLoad.step(nazwa, ułamek)`;
  - długie operacje w trakcie pracy idą przez `LabLoad.run(tytuł, async step => …)`.

  Podłączone (z etapami tam, gdzie da się je rozdzielić):
  - laboratorium lądu — generowanie świata, trzy etapy;
  - laboratorium pojazdów, ląd — świat z laboratorium lądu (cztery etapy) i pierwsze zbudowanie pociągu;
  - laboratorium wody — kształtowanie brzegów;
  - laboratorium roślin — krajobraz;
  - jaskinie i przedmioty — nowa jaskinia.

  Statki, ciała i układy kończą swoją kartę przez `LabLoad.done()`.
- OPCJE → Paski: przełączniki paska narzędzi i paska informacyjnego na każdej stronie, także na stronie startowej.

### Zmienione
- Laboratorium pojazdów, ląd: wybór pojazdu z listy w górnym pasku (jak na wodzie), z pociągiem na końcu listy; bez
  przycisków w oknie.
- Wersje: program 0.18.0; ląd 1.5.0; pozostałe laboratoria z paskami i doktor — z+1 (przycisk konsoli).

## Program 0.17.0 — 2026-11-02 (jedno laboratorium pojazdów)

### Zmienione
- **Laboratorium pojazdów** — wszystko, czym można się poruszać, w jednym laboratorium z przełącznikiem środowiska
  (wszystkie trzy pozycje czynne):
  - kosmos — statki, dron i stacja (`labs/ship.html`, 1.5.0);
  - woda — ORP Błyskawica, ORP Orzeł i roboty morskie (`labs/warship.html`, 1.2.0);
  - ląd — łaziki, amfibia i pociąg (`labs/vehicles.html`, 1.4.0).

  W katalogu, menu i na stronie startowej jest jeden wpis „Laboratorium pojazdów”; strony wody i lądu są jego
  stronami (`page` w katalogu wskazuje teraz plik laboratorium).
- **Woda**: roboty morskie z MarineKit (SKIMMER, BARGE, DIVER) na liście obok okrętów (grupy „Warships” i „Robot
  vessels”). Jazda jak w laboratorium morza: AUTO albo W/A/S/D, nurek schodzi Q/E albo suwakiem, NIGHT, WAKE, praca;
  kamera jedzie za robotem. Woda: **zwykła** albo **z laboratorium wody** (lista „Water”: jego wariant A zapisany w tej
  przeglądarce — fale, wygląd, prąd, olej, lawa, lód; otwarta woda, bez brzegów); roboty kołyszą się na jej falach.
- **Ląd**: amfibia na liście pojazdów (jeździ na kołach; gdzie jest woda — pływa). Ląd: **zwykły** albo **z laboratorium
  lądu** (lista „Ground”: świat z zapisanych ustawień laboratorium lądu — mapa z ziarnem, woda w regionach, pogoda;
  start na lądzie przy wodzie). Na tym lądzie amfibia wjeżdża do morza i wyjeżdża, łaziki zatrzymują się przy wodzie.

### Usunięte
- Laboratorium morza (`labs/marine.html`, `js/labs/marine.js`, `ui/pages/marine.css`). MarineKit zostaje (statki-roboty
  w laboratorium pojazdów; jego własne morze i widok pod wodą nie są teraz używane przez żadne laboratorium).

### Poprawione
- Strona wody nie startowała w 0.16.0: skrypt szukał linku do doktora modeli, usuniętego z paska.

- Wersje: program 0.17.0; statki 1.5.0, woda 1.2.0, ląd 1.4.0; kontrola kitów 1.0.5 (bez laboratorium morza).

## Program 0.16.0 — 2026-11-02 (jednakowe paski, przełączniki pasków)

### Nowe
- OPCJE → **Paski**: pasek narzędzi (pod paskiem menu) i pasek informacyjny (na dole) można wyłączyć; domyślnie oba
  włączone. Wybór dotyczy wszystkich stron i zostaje w przeglądarce (`gamelab.bars.tool`, `gamelab.bars.info`).

### Zmienione
- **Paski jednakowe na każdej stronie** i niezależne od laboratoriów: pasek menu, pasek narzędzi i pasek informacyjny
  mają stałe wysokości (32, 44, 34 px) i nieprzezroczyste tło (scena za nimi nie zmienia już ich koloru). Wszystko, co
  na nich stoi — listy rozwijane, przyciski, przyciski połączone (GPU · CPU), „Start render”, przełącznik środowiska,
  statusy, licznik klatek — jest zdefiniowane tylko w `ui/bars.css` (listy z własną strzałką, wszystkie kontrolki 28 px).
  Tokeny pasków nie dziedziczą motywu strony (`ui/tokens.css`).
- Menu Narzędzia: w liście laboratoriów bez słowa „Laboratorium” / „lab” (np. „Wody”, „Water”).
- Laboratorium skali: własny stary pasek `#bar` zamieniony na wspólny (bez ukrytego tytułu i drugiego, martwego
  licznika klatek); licznik pisze „fps” jak pozostałe.

### Usunięte (stare, niepotrzebne)
- Z pasków laboratoriów z Battle, Pixel Studio, generatora zombie, kostnicy i doktora: ukryte nazwy, znaczniki wersji
  i linki (wszystko to jest na pasku menu); napis „Pixel Studio” w generatorze zombie.
- Reguły pasków w arkuszach stron (`ui/pages/pixel.css`, `ui/pages/scale.css`) i stare przesunięcia w
  `ui/menubar.css` (`#hud`, `#opt`, `#bar`; kompas i komunikat powierzchni mają położenie we własnym arkuszu).
- Wersje: program 0.16.0; wszystkie laboratoria z paskami i doktor — z+1.

## Program 0.15.2 — 2026-11-02

### Zmienione
- Statki, ciała i układy: wybór z list rozwijanych w górnym pasku (`.bar`), jak w laboratorium wody — bez strzałek
  i przycisków. Statki: lista statków. Ciała: dwie listy, kategoria i ciało w niej (lista ciał wyszarzona, gdy
  w kategorii jest jedno). Układy: lista układów; po „losuj” pokazuje „Generated (seed)”.
- Usunięte nieużywane style: `.navArrow` (`ui/controls.css`), `#shipNav`, `#shipIndex` (`ui/space.css`),
  zakładki grup w ciałach, siatka przycisków w układach.
- Wersje: program 0.15.2, statki 1.4.3, ciała 1.2.5, układy 1.2.5.

## Program 0.15.1 — 2026-11-02

### Poprawione
- `THREE.Clock` (przestarzały w r186, ostrzeżenie w konsoli) zamieniony na `THREE.Timer` w 11 laboratoriach Space:
  statki, ciała, układy, skala, powierzchnia, budynki, pojazdy, morze, edytor stworów, życie i człowiek (wspólne studio).
  Czas i krok klatki liczone jak wcześniej.
- Wersje: program i te laboratoria z+1.

## Program 0.15.0 — 2026-11-02 (laboratorium obrazów z NeuroLabPA, lawa, karty ładowania, szybszy doktor)

### Nowe
- **Laboratorium obrazów** (`labs/img.html`, 0.28.0 — numeracja z NeuroLabPA) przeniesione z NeuroLabPA **z historią**
  (9 commitów, 0.24.0–0.28.0): sieć uczy się rysować 16×16 w 16 odcieniach z 12 kategorii Quick, Draw! — statystyka
  pikseli, piksel po pikselu (transformer, KV cache), VAE, GAN, dyfuzja z podpowiedzią, wyobraźnia, „Zgadnij, co
  narysowałem” (klasyfikator, 86%). Pliki: `js/labs/img/`, `data/img/`, `tools/img/build_quickdraw.py`,
  `ui/pages/img.css`; notatki NeuroLabPA w `docs/walkers/notatki/`, ich historia w `docs/history/walkers.md`.

### Zmienione
- Laboratorium języka (0.24.0): uwaga liczona w WebAssembly SIMD (z NeuroLabPA 0.24.0), linki do laboratorium obrazów;
  `tools/lang/build_wasm.js` zapisuje znowu do `js/labs/lang/wasm.js` (po przeniesieniu pisał w złe miejsce).
- SDF Walkers: link do laboratorium obrazów.
- Paski laboratorium (`ui/bars.css`) dotyczą tylko pasków strony (`body > .bar`, `body > .foot`) — klasa `.bar` w
  środku strony (pasek postępu w laboratorium obrazów, paski w makiecie skórek) nie jest już przestawiana.
- Laboratorium przedmiotów: części trzymane w dłoni nie są oświetlane własnym światłem (spalały się na biało).
- **Lawa.** Jaskinie: część jeziorek to lawa (suwak „Of them lava”) — ciemna skorupa z pęknięciami świecącego stopu,
  oświetla swoją komorę. Laboratorium wody: nowy akwen „Lava (molten rock)” i suwak „Lava” (WaterKit: `uLava`, stan
  morza i wygląd „lava”) — skorupa z płyt, świecące szczeliny i plamy stopu, bez piany, prawie bez odbić.
- **Karty ładowania** (`ui/loader.js`, znacznik `data-auto`) w laboratoriach, które przy starcie budują scenę dłużej niż
  ~1,5 s: statki na wodzie, transformator, skala, ląd, człowiek, wygląd, budynki, powierzchnia, pojazdy, morze
  (zmierzone w przeglądarce testowej; na ich miejscu wcześniej była pusta lub zamrożona strona).
- Jaskinie: kamienie gruzu leżą na dnie (opuszczane do skały; wcześniej część wisiała w powietrzu).
- **Doktor modeli szybszy ok. 80×** w sprawdzeniu „seethrough” (pierwsze trafienie promienia przez drzewo brył
  trójkątów zamiast sprawdzania każdego trójkąta): SP-01 CODEWING 43 s → 0,5 s; wyniki bez zmian (`tools/doctor.py`: OK).
- Wersje: program 0.15.0; język y+1, SDF Walkers z+1; jaskinie, woda i doktor z+1; laboratoria z kartą ładowania z+1.

## Program 0.14.0 — 2026-11-02 (dwa nowe laboratoria: jaskinie, przedmioty bohatera)

### Nowe
- **Laboratorium jaskiń** (`labs/caves.html`, 1.0.0) i **CaveKit** (`js/models/caves/cavekit.js`): jaskinie z ziarna —
  korytarze, odgałęzienia, komory, stalaktyty i stalagmity, gruz, ogólne jeziorka (styl wody wybiera się w laboratorium
  wody); skały: wapień, granit, piaskowiec, bazalt, suche lub mokre (warstwa wody), relief; światło: latarka w dłoni,
  lampa, otoczenie, ekspozycja; widok ze środka (wolna kamera) i z zewnątrz. Opis: `docs/caves.md`.
- **Laboratorium przedmiotów bohatera** (`labs/gear.html`, 1.0.0) i **GearKit** (`js/models/gear/gearkit.js`): latarka
  (wąska plama i szeroka poświata, cienie), lampa naftowa, światło chemiczne, zapalniczka, ekran telefonu — każdy z
  modelem w dłoni, mocą, barwą (kelwiny), stożkiem, naładowaniem, migotaniem i rozładowywaniem. **Widzenie**
  (`js/render/vision.js`): oko, noktowizor (wzmocnienie, szum, fosfor zielony lub biały, oświetlacz podczerwieni widoczny
  tylko w urządzeniu), lornetka (zoom, skala). Miejsce testu: ciemna jaskinia z CaveKit. Opis: `docs/gear.md`.
- `js/labkit/freecam.js`: wolna kamera do oglądania wnętrz (mysz: przeciąganie, kółko, prawy przycisk; albo W/A/S/D).
- `LookPipeline.render(scene, camera, target)` może oddać obraz do celu renderowania (dla przejścia po nim).

### Zmienione
- **Doktor modeli bada jeden model naraz**: ten, z którym się otwiera, i każdy następny po wybraniu; „Examine all”
  (albo `?all=1`, tak uruchamia go `tools/doctor.py`) bada całą listę. Wcześniej na starcie badał wszystkie.
- Laboratorium języka: poprawione ścieżki do `data/lang/rozmowy/rozmowy.txt` w opisie kroku i komunikacie błędu.
- `THREE.PCFSoftShadowMap` (usunięty w r186, ostrzeżenie w konsoli) zamieniony na `PCFShadowMap` we wszystkich
  laboratoriach — wygląd bez zmian (r186 i tak go zastępował).
- Wersje: program 0.14.0; doktor i laboratorium języka z+1.

## Program 0.13.3 — 2026-11-01 (dokumentacja i komentarze)

### Zmienione
- **Dokumentacja bez opisów samej gry:** z `docs/ship.md` i `docs/bodies.md` wycięte „…in the game” (jak gra ładuje
  kity, jej wersjonowanie), z `docs/rendering.md` ustawienia grafiki gry, kamera statku i porównanie gry z
  laboratoriami, z `docs/surface.md` lądowanie w grze, z `docs/scale.md` zależności w grze (baza danych, kamery,
  lista kontrolna). Tabele „File layout” opisują obecne ładowanie (Three.js r186, `three-global.js`, moduły).
- `docs/walkers/README.md`: struktura plików obu laboratoriów po przeniesieniu (wcześniej ścieżki z NeuroLabPA).
- Przewodnik i mapa laboratoriów z Battle (`guide-sea.md`, `labs-sea.md`): adresy GameLaboratory.
- Klucze ustawień w dokumentacji i `tools/pixel-check.py`: `gameLab.*`.
- **Komentarze:** nagłówki stron statków, ciał, skali i tekstury ziarna, LabKit, PostKit, ShipKit, BodyKit, LifeKit
  i laboratorium skali — pochodzenie („z gry Space”) zamiast opisu działania gry; poprawione ścieżki do ShipKit w
  plikach statków i BodyKit; bez nieaktualnych wzmianek o r128 i otwieraniu z dysku.
- `tools/paths.py`: 0 martwych ścieżek (pomija wygenerowane `tools/out/`).

## Program 0.13.2 — 2026-11-01

### Zmienione
- **Dwa paski jak w laboratorium wody we wszystkich laboratoriach ze sceną** (`ui/bars.css`): górny pod paskiem menu
  (kontrolki laboratorium, przełącznik środowiska) i dolny (skala, klatki na sekundę, GameLaboratory). Nowe w 11
  laboratoriach Space; dolny także w skali, Pixel Studio, generatorze zombie i Kostnicy SDF. Klatki liczy `ui/bars.js`
  tam, gdzie laboratorium samo ich nie pokazuje. Paski laboratoriów z Battle nie znikają już, gdy są puste.
- **Przełącznik środowiska** wszędzie w górnym pasku, jak w statkach na wodzie (dotąd w statkach w kosmosie, pojazdach
  i morzu pływał na dole ekranu).
- Okna zaczynają się pod górnym paskiem i kończą nad dolnym; kompas i odczyty powierzchni, podpowiedź i skala w laboratorium skali, scena
  Pixel Studio i Kostnicy przesunięte, żeby paski ich nie zasłaniały.
- Wersje: program i laboratoria z paskami z+1.

## Program 0.13.1 — 2026-11-01

### Zmienione
- Narzędzia (doktor modeli, kontrola kitów, tekstura ziarna) bez znacznika „nie indeksować” — jak każda strona
  laboratoriów są w `sitemap.xml` i mogą pojawiać się w wyszukiwarkach. Wersje: program i trzy narzędzia z+1.

## Program 0.13.0 — 2026-11-01 (remanent, dokończenie: całe UI w `ui/`, nowy wygląd, katalog, foldery, dokumentacja)

### Nowe
- **Folder `ui/`** — całe UI w jednym miejscu (opis: `ui/README.md`): `tokens.css` (kolory, czcionki, promienie),
  `fonts.css`, `base.css` (paski przewijania), `controls.css` (przyciski, strzałki, suwaki, pola wyboru, listy,
  pola), `windows.css/js`, `envswitch.css/js`, `loader.css`, `menubar.css/js`, `versions.js`, `space.css`
  (dawne `css/lab.css`), `sea.css` (dawne `css/lab-sea.css`) i `pages/<lab>.css` — style każdej strony.
  Strona linkuje jedno `ui/ui.css`. Folder `css/` zniknął; `js/labkit/` ma już tylko LabKit.
- **Nowy wygląd** (zaakceptowany projekt): czcionka Space Grotesk, liczby w IBM Plex Mono; cienkie paski przewijania
  bez strzałek; złote suwaki (wypełnione do wartości także w laboratoriach z Battle), pola wyboru i przyciski
  „wybrane”; strzałki poprzedni/następny jako kwadratowe przyciski. Niebieski wygląd Space zastąpiony tokenami.
- **Ładowanie** jako karta z kółkiem, zwykłym zdaniem i paskiem („Generating the hull…”, „Generating the sky…”,
  „Building the system…”) zamiast napisów wielkimi literami.
- Okna bez zapisanego położenia układają się jedno pod drugim po swojej stronie (gdy brak miejsca — kaskadą).

### Zmienione
- Laboratorium statków: opcje w oknach jak w innych laboratoriach — Statek, Sterowanie, Statystyki (lewa),
  Optymalizacja, Wydajność (prawa); bez trybu „CHANGE VIEW / KEEP” i bez skalowania HUD.
- Pasek menu: style z JS przeniesione do `ui/menubar.css` (wczytywany przez `<link>`; pasek pokazuje się po
  wczytaniu arkusza); przesunięcia paneli pod pasek w tym samym pliku.
- Strony Space, narzędzia (kitcheck, tekstura ziarna) i strona startowa bez bloków `<style>` — style w
  `ui/pages/`; strony Space bez atrybutów `style=` (poza laboratorium skórek, które pokazuje własne motywy).
- Wspólne reguły laboratoriów Space (rzędy przycisków, pola `.lab`, `.hidden`, wykres FPS) w `ui/space.css`
  zamiast kopii w każdej stronie. `ui/sea.css` bez martwej sekcji starego ekranu startowego.
- **CSP** (`style-src 'self'` i reszta jak w Battle) także na stronach Space, kitchecku i teksturze ziarna (skrypt
  stron do `tools/grainTexture.js` i `tools/kitcheck.js`); bez CSP zostaje tylko laboratorium skórek (atrybuty `style=` w makiecie).
- **Katalog laboratoriów** `ui/catalog.js` — jedno miejsce na nazwy EN/PL, dokument, opisy, kit, frazy filtra, klucze
  ustawień i obrazki kafelków; czytają go pasek menu i strona startowa (dane wyjęte z `menubar.js` i `index.html`).
  `sitemap.xml` generuje `tools/sitemap.py` (bez stron `noindex`).
- **Klucze ustawień** po starych grach (`steelSalvo.*`, `roj-*`) przemianowane na `gameLab.*`; pasek menu raz
  przenosi zapisane ustawienia pod nowe nazwy.
- Język: pasek dostaje wybrany język (`lang`), strona laboratorium zostaje przy swoim (panele po angielsku);
  całą stronę przełącza tylko strona startowa.
- Foldery: postacie SDF i pixel art `js/models/life/zombie/` → `js/models/human/zombie/`; niebo i deszcz
  `js/envs/land/` → `js/envs/sky/`; `structures/structures/` → `structures/coastal/` (nabrzeże, falochron) i
  `structures/offshore/` (platforma); `ships-sea/world/` → `ships-sea/game-classes/`.
- Laboratoria życia i człowieka: wspólne studio `js/labs/shared/studio.js` (oba skrypty były identyczne).
- Wspólne funkcje odległości GLSL dla SDF Morgue i SDF Walkers: `js/render/sdf-glsl.js`.
- Dokumentacja: mapa `docs/README.md`; historia sprzed przeniesienia w `docs/history/` (`labs/CHANGELOG.md`,
  historia doktora, CHANGELOG SDF Walkers); ok. 110 martwych ścieżek podmienionych na obecne; usunięty `docs/ui.md`
  (interfejs gry Space) i części `docs/gotchas.md` o grze (Supabase, odświeżanie wersji). `docs/AUDIT.md`: A4 i A5
  oznaczone jako fałszywe trafienia.

### Usunięte
- Martwy kod po nowym wyglądzie: ziarno paneli (`LabKit.applyGrain`, `.mat`) i skalowanie HUD (`LabKit.fitHud`,
  `--ui`); czcionki Antonio i Roboto Condensed (4 pliki) — zostaje Oswald (napisy ShipKit na kadłubach, skórki).

### Sprawdzenia
- `tools/paths.py` — pliki ładowane przez strony (błąd) i ścieżki wspomniane w dokumentacji i komentarzach
  (ostrzeżenie); GitHub Actions `check.yml`: składnia JS, `paths.py --strict`, `sitemap.py --check`.

- Wersje: program 0.13.0; laboratorium statków y+1, pozostałe laboratoria i narzędzia z+1.

## Program 0.12.0 — 2026-11-01 (remanent, partia 1: śmieci, błędy, martwy kod)

### Usunięte
- `css/game-ui/` (27 plików interfejsu gry — nic ich nie ładowało), `tools/out/` (27 zrzutów z testów, 3,8 MB —
  teraz w `.gitignore`), `tools/walkers/` (prototypy w Pythonie i składacz artefaktu claude.ai z NeuroLabPA),
  `docs/walkers/gitignore.txt`, nieużywane miniatury `assets/labs/ship.jpg` i `orzel.jpg` (`lab-check.py --thumb`
  zapisuje je teraz do `tools/out/`).
- **Tryb grafiki „legacy r128”** z `js/core/three-global.js` (łatki świateł, bufory jak w r128) — używały go już
  tylko doktor i kitcheck; teraz wszędzie grafika Battle, bez znacznika `<meta name="gamelab-graphics">` (znaczniki
  usunięte ze stron). Odciski kitchecka i doktora liczą geometrię — bez zmian.
- Martwy markup HUD w stronach Space (logo, ramka, podtytuł, złoty pasek, boczne paski) — od okien był schowany.

### Poprawione
- `tools/lab-check.py` działa znowu: strona startowa `index.html` i `labs/warship.html` zamiast adresów z Battle.
- Pasek menu zna `labs/warship.html` (druga strona laboratorium statków, „woda”): nazwa i wersja na pasku; bez osobnej
  pozycji w liście i bez kafelka — wejście przełącznikiem środowiska.
- Tytuły 13 stron Space i kitchecka bez „Swarm Protocol” („Nazwa | GameLaboratory”); domyślny podpis statku
  „GAMELABORATORY // SHIP LAB”; metadane MIDI z MusicKit.
- SDF Walkers: jedna wersja (z `versions.js`), bez osobnego numeru w `js/labs/walkers/version.js`.
- Wersje (z+1): laboratoria Space, okręty, SDF Walkers, doktor, kitcheck.

## Program 0.11.1 — 2026-11-01

### Zmienione (pasek menu)
- Bez menu PLIKI (była tam tylko strona startowa — prowadzi do niej znak GameLaboratory po lewej).
- OPCJE → **Wyczyść zapisane ustawienia** działa na każdej stronie: ustawienia laboratorium zapisane w przeglądarce
  i układ jego okien (na stronie startowej: kolejność, przypięcie, licznik odwiedzin). Oceny w SDF Walkers to dane —
  zostają; język ustawia się osobno.
- POMOC: bez „Klawiatura i mysz” i „Notatki tej strony”; **Dokumentacja** prowadzi do folderu `docs/` (wcześniej do
  nieistniejącego README).
- Bez skrótów klawiszowych w menu (F11, F5) i bez list klawiszy laboratoriów.

## Program 0.11.0 — 2026-11-01

### Dodane
- **Laboratorium człowieka** (`labs/human.html`, v1.0.0) — wydzielone z laboratorium życia (decyzja właściciela:
  ludzie i ich animacja dostają własne laboratorium). Ludzie (Human I, Human II), twarz z minami, chody i warstwy.
  Modele ludzi w osobnym folderze `js/models/human/` (`human.js`, `face.js`, `walk.js`, `data/` — przeniesione
  z `js/models/life/`, z historią); skrypt `js/labs/human.js`; dokumentacja `docs/human.md`.

### Zmienione
- **Laboratorium życia v1.3.0**: pozostałe formy życia (zwierzęta — strider); sekcja twarzy chowa się, gdy stworzenie
  nie ma twarzy; nowy kafelek, opis i frazy (życie, zwierzęta, chód, nogi). `docs/life.md` bez części o ludziach.
- Kitcheck ładuje ludzi z nowego miejsca i sprawdza też laboratorium człowieka.

## Program 0.10.0 — 2026-10-31

### Zmienione
- **Jeden wygląd wszędzie (styl Battle)**:
  - górne paski laboratoriów Battle bez nazwy, wersji i linków (są na pasku menu: „Laboratorium · nazwa”, wersja,
    NARZĘDZIA) — zostaje tylko sterowanie laboratorium; pusty pasek znika (`css/windows.css`);
  - SDF Walkers i laboratorium języka: kolory, czcionki, przyciski i nagłówki Battle (układ stron bez zmian);
  - skala: górny pasek jak w laboratoriach Battle; skórki: przełącznik skórek (sama makieta interfejsu gry bez zmian);
  - kitcheck i tekstura ziarna w kolorach Battle.
- NeuroLabPA usunięte z listy do zrobienia (repozytorium kasuje właściciel).

## Program 0.9.0 — 2026-10-31

### Dodane
- **Import NeuroLabPA z historią** (16 commitów): dwa nowe laboratoria.
  - **SDF Walkers** (`labs/walkers.html`, v0.23.0 — wersja z NeuroLabPA): całe zombie z funkcji odległości,
    5 animacji × 4 kierunki × 8 klatek, sprite sheet z JSON, edytor cech, oceny i sieć neuronowa ucząca się gustu.
    Model: `js/models/life/zombie/walkers/`; skrypty `js/labs/walkers/`; dane `data/walkers/`; dokumentacja,
    historia zmian i plan: `docs/walkers/`.
  - **Laboratorium języka** (`labs/lang.html`, v0.23.0): sieć uczy się polskiego od zera (bigram → okno → RNN/GRU →
    transformer; CPU, WebAssembly SIMD, WebGPU; tokeny BPE; rozmowa). Skrypty `js/labs/lang/`, teksty `data/lang/`.
  - Oryginał SDF Morgue z NeuroLabPA: `docs/morgue/sdf-morgue-original.html`.
  - Obie strony: wspólny pasek menu, ścieżki dostosowane, czcionki bez Google Fonts (zastępcze). Na razie we
    własnym stylu (przewijane strony) — przejście na okna i styl Battle w `TODO.md`.
- Kafelki, frazy (nowe: sieć neuronowa, język, tekst, transformer, WebGPU), mapa strony.

### Poprawione
- Pasek menu odporny na ogólne style przycisków strony (cień, przesunięcie, litery).

## Program 0.8.0 — 2026-10-31

### Dodane
- **Nowe laboratorium: SDF Morgue** (`labs/morgue.html`, v1.0.0, z artefaktu claude.ai): głowa zombie liczona
  w shaderze — funkcje odległości, raymarching, światło w czterech tonach, kontur z geometrii, pixel art; okaz
  z ziarna i jego karta. Model osobno: `js/models/life/zombie/sdf-head.js` (shadery, okaz, paleta, renderer).
  Styl Battle, okna z opcjami. Kafelek, frazy (nowe: shader, SDF), pasek menu, mapa strony, `docs/morgue.md`.

### Zmienione
- Okna: gdy tytuł okna pochodzi z pierwszej sekcji panelu, ta sekcja nie powtarza go zaraz pod spodem.

## Program 0.7.0 — 2026-10-31

### Zmienione
- **Okna z opcjami we wszystkich laboratoriach** (po próbie w laboratorium roślin): lewy i prawy panel każdego
  laboratorium to pływające okno — przeciąganie za pasek tytułu, ✕, OPCJE → Okna, układ pamiętany w przeglądarce.
  Tytuł okna: pierwsza sekcja panelu. Laboratoria (wersja y+1): ciała niebieskie, budynki, edytor stworów, życie,
  morze, statki, dźwięk, powierzchnia, układy, pojazdy, filtry, ląd, wygląd, Pixel Studio, budowle, transformator,
  okręty, woda, generator zombie; doktor modeli. Skala i skórki nie mają paneli bocznych — bez zmian.
- **Jeden styl paneli — Battle**: w oknie panele laboratoriów Space (`#hud`, `#opt`) wyglądają jak w laboratoriach
  Battle — nagłówki, przyciski, wiersze, suwaki, wykres FPS; dekoracje sci-fi (logo, ramki, paski) schowane.
  Chowanie po bezczynności (LabKit) przygasza okno jak w Battle zamiast je ukrywać.
- Laboratoria Battle mają wspólny pasek menu (dotąd tylko rośliny) — w CSP dopisane `font-src 'self'`.

### Poprawione
- Laboratorium dźwięku nie uruchamiało się od wersji 0.4.0 (`labkit.js` importuje panel wyglądu, a strona ładowała
  go jako zwykły skrypt): LabKit, MusicKit i skrypt laboratorium ładowane jako moduły.

## Program 0.6.0 — 2026-10-31

### Dodane
- **Okna z opcjami laboratorium** (`js/labkit/windows.js`, `css/windows.css`, w stylu laboratoriów Battle): panel
  oznaczony `data-window` (tytuł `data-title`, po polsku `data-title-pl`) staje się pływającym oknem — pasek
  tytułu do przeciągania, ✕ zamyka, OPCJE → Okna otwiera i zamyka; które okna są otwarte i gdzie stoją,
  pamięta przeglądarka (za pierwszym razem tam, gdzie stały panele). Na próbę: **laboratorium roślin v1.1.0**
  (okna „Model” i „Scena”), także ze wspólnym paskiem menu.
- Pasek menu na stronach ze ścisłym CSP (laboratoria z Battle): style przez CSSOM zamiast elementu `<style>`;
  górny pasek laboratoriów Battle przesunięty pod pasek menu.

## Program 0.5.0 — 2026-10-31

### Dodane
- **Pierwsze zachowanie: „koło na szynie”** (`js/behaviors/rail/`, środowisko ląd) — fizyka pociągu z aTrain
  przeniesiona bez zmian w obliczeniach (porównanie z oryginałem: identyczne położenia wszystkich brył po 4 s jazdy).
  Liczby taboru bierze z modelu (`js/models/train/data.js`). `rail.js` podpina fizykę do modelu składu (pudła,
  zestawy kołowe, maźnice i sprężyny, talerze zderzaków, głowice sprzęgu kłowego, ogniwa łańcucha).
- **Sieć torowa z rozjazdami** (`js/models/structures/railway/network.js`): owal z dwoma rozjazdami i pętlą,
  rysowany z tych samych odcinków szyn, na których liczy fizyka (iglice ruchome, dzioby, kierownice, łubki, napędy).
- **Laboratorium pojazdów v1.2.0**: pociąg jeździ — prędkość zadana, kierunek, moc, hamulec, blokada kół, masy,
  zwrotnice, sprzęgi, szczelina styków, luz obrzeży, kamery śledzące (jak w aTrain). Rodziny modeli mogą mieć
  w laboratorium własny panel i krok co klatkę (`addMode({ panel, update })`).
- **Filtr laboratoriów** na stronie startowej: frazy każdego laboratorium jako przyciski (pokazane zostają te,
  które mają wszystkie wybrane frazy; najczęstsze 16, reszta pod „wszystkie frazy”) i pole wyszukiwania
  (nazwa, opis, frazy — po polsku i angielsku, bez znaków diakrytycznych).
- Favicon: znak z paska menu (zaokrąglony kwadrat z gradientem stożkowym).
- **Język: angielski i polski** — OPCJE → Język (Automatycznie / English / Polski, zapamiętane w przeglądarce);
  automatycznie z języków przeglądarki, a gdy żaden nie jest obsługiwany — angielski; `?lang=pl` / `?lang=en`
  w adresie. Przetłumaczone: pasek menu (menu, nazwy laboratoriów, klawisze) i strona startowa (opisy, kafelki).
  Panele wewnątrz laboratoriów są na razie po angielsku.
- **SEO po angielsku i polsku**: GameLaboratory jako silnik dla AI — tytuł, opis, słowa kluczowe, Open Graph
  i Twitter z miniaturą (`assets/og-image.jpg`, zrzut strony startowej 1200×630), dane strukturalne (JSON-LD
  WebApplication), `hreflang` (en, pl, x-default), `robots.txt`, `sitemap.xml`.

### Zmienione
- **Doktor modeli v1.0.1**: części lustrzane (ujemna skala) czytane z kolejnością wierzchołków, z jaką rysuje je
  three.js — znika fałszywe migotanie tarczy koła ze znacznikiem w wagonach (`docs/doctor/README.md`).
- Strona startowa: bez „In the game” (statystyka i znaczniki — gier tu nie ma; znacznik zostaje tylko narzędziom);
  fraza „Orzeł” w laboratorium statków.
- Z aTrain nie przeniesiono (na razie): dźwięków, dymu i iskier, terenu z górą i morzem, pogody, przystanku.

## Program 0.4.0 — 2026-10-31

### Zmienione
- **Wszystkie laboratoria 3D ze Space w grafice Battle** (v1.1.0): ciała niebieskie, układy, powierzchnia, skala,
  budynki, pojazdy, morze, stwory, życie; statki v1.2.0. Skins i sound (bez sceny 3D) bez zmian.
- `three-global.js` (tryb Battle): własne shadery kitów Space oddają kolor gotowy do wyświetlenia — na końcu
  shadera przeliczany z sRGB na liniowy (bez tego planety były sprane, a poświaty statków przejaskrawione);
  `THREE.LIGHT_SCALE` (π w trybie Battle) dla mocy świateł pisanych pod r128 i `THREE.srgbColor()` zamiast ręcznego
  `.convertSRGBToLinear()` w kitach (LifeKit, stwory).
- `LabKit.render()`: laboratoria bez panelu obrazu renderują w trybie Battle przez potok kamery („Game clean”).
- Znane: delikatna mgławica w tle laboratorium ciał niebieskich jest ciemniejsza (ciemne tony nieba po przeliczeniu).

## Program 0.3.0 — 2026-10-31

### Dodane
- **Tryb grafiki Battle dla laboratoriów Space**: znacznik `<meta name="gamelab-graphics" content="battle">` na stronie.
  `js/core/three-global.js` daje wtedy czyste r186 (zarządzanie kolorem, fizyczne światła, zwykłe bufory), a
  `LabKit.imageEffects` renderuje przez potok kamery z laboratoriów wodnych (`js/labkit/look-panel.js`) zamiast
  PostKit — to samo API, panel „Camera look” z gotowymi ustawieniami i suwakami.
- **Laboratorium statków v1.1.0** (`labs/ship.html`, kosmos): pierwsze w grafice Battle. Światła ×π (fizyczne światła
  świecą π razy słabiej niż w trybie legacy r128), kolory gry bez ręcznej konwersji z sRGB.

## Program 0.2.0 — 2026-10-31

### Dodane
- **Laboratorium filtrów** `labs/filters.html` **v0.1.0**: potok kamery z laboratoriów wodnych (Battle) na wybranej
  scenie — ORP Błyskawica, ORP Orzeł, platforma Super 300, pociąg na torze; gotowe ustawienia, porównanie z czystym
  obrazem, koszt każdego efektu, cztery oświetlenia. Opis: `docs/filters.md`.
- **Wersjonowanie**: wersja programu i osobna wersja każdego laboratorium i narzędzia (`js/labkit/versions.js`),
  widoczne na pasku menu, na stronie startowej (program i każdy kafelek) i w paskach laboratoriów z Battle.
- `js/core/three-window.js`: r186 jako `window.THREE` bez łatek wyglądu r128 (TrainKit na stronach z grafiką Battle).

## Program 0.1.0 — 2026-10-31

Pierwsze wydanie na GitHub Pages. Wszystkie laboratoria i narzędzia w **v1.0.0**.
- Laboratoria ze Space, Battle i aTrain (modele taboru) przeniesione z historią, na Three.js r186.
- Strona startowa ze Space z frazami przy każdym laboratorium; przełącznik środowiska (kosmos · woda · ląd).
- Jeden doktor modeli dla kosmosu, morza i pociągu; Pixel Studio z własnym Pixel Doctorem.
- TrainKit (pociąg z aTrain) i tor w laboratorium pojazdów.
