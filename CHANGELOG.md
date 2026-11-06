# GameLaboratory — zmiany

Wersja programu i każdego laboratorium: `ui/data/versions.js`. `x.y.z` — y: nowa funkcja, z: poprawka.
Historia laboratoriów Space sprzed przeniesienia: `docs/history/space-labs.md` (i reszta historii w `docs/history/`); Battle i aTrain — w historii git.

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
