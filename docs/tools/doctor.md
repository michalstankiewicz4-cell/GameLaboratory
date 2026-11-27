# Doktor modeli (`tools/doctor.html`, `tools/doctor/`)

Jeden doktor dla wszystkich modeli laboratorium: kosmos (Space), morze (Battle), ląd i tabor (TrainKit), rośliny (PlantKit), skały (RockKit).
Szuka powtarzających się błędów modeli budowanych kodem. Scalony z dwóch wersji: doktora ze Space i jego rozszerzonej
wersji z Battle (historia obu — w git). Logika to wersja z Battle — ma wszystkie testy wersji ze Space i więcej.

## Zasady

- **Modeli nie naprawiamy ręcznie.** Naprawa odbywa się przez ulepszanie doktora.
- **Doktor jest uniwersalny** — nigdy dostosowany do jednego modelu. Testy wymagające wiedzy o modelu
  (linia ognia działa, linia wody, burta, budżet gry) włączają się tylko wtedy, gdy źródło modelu poda
  dla nich dane (`opts`), i działają dla każdego modelu, który je poda.
- Jeśli naprawa przez doktora nie jest możliwa, zostaje po stronie gry.

## Pliki

| Plik | Co to jest |
|---|---|
| `tools/doctor/modeldoctor.js` | logika: `examine(root, opts) → { findings, stats }`, `explodeBoxes(root)`, `CHECKS`, `SEVERITY`, `ABOUT` |
| `tools/doctor/page.js` | strona: lista modeli, filtr testów, opcje, wyniki, podświetlanie części |
| `tools/doctor/sources/space.js` | modele Space: ShipKit, BaseKit, VehicleKit, MarineKit |
| `tools/doctor/sources/sea.js` | modele Battle: statki laboratorium (1:1), modele klas gry, poziomy szczegółów transformera |
| `tools/doctor/sources/train.js` | tabor: lokomotywa i wagony z TrainKit |
| `tools/doctor/sources/road.js` | pojazdy drogowe z RoadKit (FSO Polonez, M1A2 Abrams, Solaris Urbino 18) |
| `tools/doctor/sources/tram.js` | tramwaje z TramKit (PESA Swing 120Na) |
| `tools/doctor/sources/city.js` | budynki miasta z CityKit (wszystkie rodzaje i budynki Warszawy z mapy, wersja bliska; jedna płaszczyzna do 1 cm) |
| `tools/doctor/sources/plants.js` | rośliny z PlantKit: każdy gatunek (ziarno 1) jako kora i liście |
| `tools/doctor/sources/rocks.js` | skały z RockKit: każdy rodzaj w każdym kształcie (ziarno 1) jako jedna siatka |
| `tools/doctor/sources/streets.js` | ulice StreetKit: przekroje, skrzyżowania, sygnalizatory, latarnie, znaki, słupki, barierki, ekrany, pikietaż, parkingi, wiadukty, tunele, rampa, kładki, przejście podziemne |
| `tools/doctor/sources/mech.js` | przedmioty laboratorium mechaniki (MechKit, ControlKit): ustawienia domyślne i warianty skrajne; planeEps 0,2 mm |
| `tools/doctor/sources/houses.js` | budynki z części HouseKit (każda część osobną siatką, jak przed zniszczeniem; `ground: 0`) |
| `tools/doctor/sources/test-bench.js` | stanowisko testowe: model z jednym błędem na każdy test |
| `tools/doctor/sources/common.js` | wspólne: koszt rysowania (trójkąty, wywołania, materiały) |
| `tools/doctor.py` | doktor bez okna (Playwright): porównuje z `tools/doctor.golden.json` |

**`pierce`** działa, gdy źródło poda zderzacze modelu: `opts.colliders` — prostopadłościany `{ at, half, rot?, name? }`
w układzie modelu (złomowisko: `colliders()` maszyn i otoczenia, `colliderBoxes` z `js/behaviors/land/machines/statics.js`).
Płyta (najmniejszy półwymiar poniżej 1/5 następnego) jest przebita, gdy inny zderzacz wystaje z obu jej stron w obrębie
jej powierzchni, wyraźnie (więcej niż 4 × grubości i 1 % modelu), a linia przecięcia biegnie przez powierzchnię płyty —
przecięcie przy krawędzi (zewnętrzna ćwierć: zachodzące na siebie blachy w rogu leja, ściana stojąca na podłodze) nie
jest błędem. Wyjątki: `opts.pierceOk(a, b)`. Strona rysuje oba zderzacze krawędziami.

Nowe źródło modeli: plik w `sources/`, który eksportuje listę `{ id, label, sub, family, water?, build() }`;
`build()` zwraca `{ root, measured, opts, gameBudget? }`. Model budowany **bez scalania**, żeby każdy wynik
wskazywał jedną część.

## Testy

| Test | Waga | Co znajduje |
|---|---|---|
| `nan` | błąd | pozycje, które nie są liczbami |
| `inverted` | błąd | zamknięta bryła zbudowana na lewą stronę |
| `facing` | błąd | otwarta powierzchnia ze ścianami do środka (z zewnątrz prześwituje) |
| `seethrough` | błąd | dziura: patrząc z zewnątrz widać tył jednostronnej ściany |
| `arc` | ostrzeżenie | linia ognia działa trafia we własny model w zakresie obrotu (`opts.mounts`) |
| `zfight` | ostrzeżenie | ściany dwóch części w jednej płaszczyźnie — migoczą; tylko tam, gdzie widać (nie wewnątrz trzeciej zamkniętej bryły) |
| `floating` | ostrzeżenie | część niczego nie dotyka |
| `dangling` | ostrzeżenie | ukośny pręt (zastrzał, podpora; walec co najmniej 8× dłuższy niż gruby, 10°–80° od pionu) trzymany tylko przy jednym końcu, a dolny koniec wisi w powietrzu — np. zastrzał wychodzący ze złącza słupa i wysięgnika zamiast podpierać wysięgnik od słupa; szczegóły niżej |
| `waterline` | ostrzeżenie | część nad kadłubem sięga pod linię wody (`opts.waterline`) |
| `poke` | ostrzeżenie | element wystaje przez burtę (`opts.hullSide`) |
| `budget` | ostrzeżenie | model przekracza budżet gry (`opts.budget`) |
| `pierce` | ostrzeżenie | zderzacz przechodzi na wylot przez cienki zderzacz — np. zsyp przez ściankę kosza: to, co się zsuwa, staje na ściance (`opts.colliders`) |
| `hidden` | info | część w całości wewnątrz innej |
| `speck` | info | część za mała, by ją zobaczyć |
| `sliver` | info | trójkąty-igły, które źle się cieniują |

Części bez nazwy opisuje rodzaj bryły, wymiary i kolor (np. `box 0.45×0.07×0.65 #ffffff`), bez numeru — kopie jednej
części mają jedną nazwę, więc ich wyniki łączą się w jeden „×n” (dotyczy też lustrzanych kopii w `facing` i `seethrough`).

Opcje źródła (`opts` z `build()`), oprócz opisanych przy testach:
- `ground` — wysokość gruntu, na którym model stoi (ulice, wyposażenie, budynki): nikt nie ogląda go spod ziemi —
  `seethrough` pomija punkty widzenia pod gruntem i promienie, które najpierw trafiają w grunt, a `facing` liczy grunt
  jako trafienie promienia w dół;
- `planeEps` — odległość, która dla `zfight` jest „tą samą płaszczyzną” (domyślnie 0,06 % modelu; drobne przedmioty
  w milimetrach potrzebują mniej).

Części powielane (`InstancedMesh` — słupki, pręty, stopnie) same nie są badane, ale w `floating` łączą to, czego
dotykają (wcześniej rury barierek „wisiały w powietrzu”, bo słupki były dla testu niewidoczne).

`dangling` — punkty wzdłuż osi pręta (21): punkt jest trzymany, gdy powierzchnia innej części (także przezroczystej —
rama stoi na szybie) albo grunt (`ground`) jest bliżej niż promień pręta plus tolerancja, albo punkt leży wewnątrz innej
zamkniętej bryły. Zgłaszany jest pręt trzymany jednym ciągłym odcinkiem od jednego końca, krótszym niż połowa pręta,
i nigdzie poza nim — i tylko wtedy, gdy wolny koniec jest niżej niż trzymany (wisi). Wolny koniec u góry to maszt,
wysięgnik żurawia albo antena — zamierzone. Pręt skrzyżowany po drodze z inną częścią (kłody oparte o siebie) ma drugi
punkt podparcia. Nie łapie odwróconego pochylenia „V” zamiast „A” (kłody ogniska stojące na gruncie z wolnymi
wierzchołkami w górze wyglądają dla testu jak maszty) — opis błędu: `AI_COLLABORATION.md`, „Częste błędy AI w modelach”.

Wyjątki dla zamierzonych przypadków: `userData.doctorOk = 'floating'` (albo tablica testów) na części lub jej przodku.

Badane są widoczne siatki (bez instancjonowanych i szkieletowych) z materiałami, które coś rysują i nie są
przezroczyste (krycie ≥ 0,95, bez mieszania addytywnego). Siatka z kilkoma materiałami jest badana tylko wtedy, gdy
wszystkie są takie: jeśli choć jedna grupa jest przezroczysta, cała siatka wypada ze wszystkich testów — także jej
nieprzezroczyste trójkąty (`isSolid`). Przegląd 2026-11-26: żaden model z listy doktora nie ma takiej siatki.

## Użycie

- Strona: `tools/doctor.html` bada jeden model naraz — ten, z którym się otwiera (`?model=sea/lab/blyskawica`, bez tego pierwszy z listy), a każdy następny, gdy się go wybierze; „Examine all” (albo `?all=1`) bada całą listę. `window.doctorReport` — wyniki jako dane.
- Bez okna: `python3 tools/doctor.py` (porównanie z wzorcem), `--update` (nowy wzorzec), `--shots` (zrzuty).
  Jedna rodzina: `python3 tools/doctor.py rocks/` (modele, których id zaczyna się od podanego; porównanie z ich częścią
  wzorca, `--update` przepisuje tylko ją; strona: `tools/doctor.html?only=rocks/`). Filtr bez żadnego modelu — błąd.
- Strona ładuje kity Space przez `js/core/three-global.js` — w grafice Battle, jak laboratoria (od 0.12.0;
  wcześniej w trybie legacy r128). Na wyniki doktora nie ma to wpływu.

## Zmiany

- **2026-11-27 (v1.9.0)** — przedmioty laboratorium mechaniki (`tools/doctor/sources/mech.js`, `mech/…`, 64 modele:
  ustawienia domyślne i warianty skrajne, planeEps 0,2 mm, stojące na blacie z gruntem pod spodem). Ostrzeżenia
  `zfight`: hamulec tarczowy i falownik 7,5 kW (w `TODO.md`).
- **2026-11-26 (v1.8.0)** — ulice z laboratorium ulic (`tools/doctor/sources/streets.js`, `streets/…`, 53 modele).
- **2026-11-26 (v1.7.0)** — budynki HouseKit (`tools/doctor/sources/houses.js`, `houses/…`, każda część osobną siatką).
- **2026-11-26 (v1.6.0)** — z Tornado.io (doktor był tam kopią i dostał ogólne ulepszenia): `opts.ground` (grunt pod
  modelem w `seethrough` i `facing`), części powielane łączą w `floating`, `facing` zaczyna promienie najwyżej 1 cm od
  ściany (było 0,2 % modelu — na 40-metrowej ulicy 8 cm, więcej niż krawężnik); filtr rodziny
  `python3 tools/doctor.py rocks/` (`?only=`).
- **2026-11-26 (v1.5.1)** — `seethrough` przelicza normalną ściany macierzą normalną (odwrotną transponowaną),
  a nie samą macierzą świata: przy nierównej skali osi macierz przechyla normalną z jej ściany, więc ściana widziana
  z przodu mogła wyjść jako widziana od tyłu (fałszywa dziura). Stanowisko testowe ma zamkniętą bryłę rozciągniętą
  wzdłuż jednej osi (`stretched octahedron`, oktaedr × 3 wzdłuż x) — bez błędu; przed poprawką wychodziła na niej
  dziura (69 z 286 widoków). Jedyna zmiana w modelach: kadłub swarmera (skala 0,62 × 1 × 1) nie ma już dziury —
  to był fałszywy alarm (226 z 9 960 widoków pod ostrym kątem); reszta bez zmian.
  Zgłoszone w przeglądzie ChatGPT (`AI_COLLABORATION.md`).
- **2026-10-31 (v1.0.1)** — części lustrzane (ujemna skala, np. drugie koło zestawu kołowego): three.js rysuje je
  z odwróconą kolejnością wierzchołków, więc doktor czyta teraz ich trójkąty tak samo (`triVerts`: zamiana dwóch
  wierzchołków, gdy wyznacznik macierzy świata < 0). Dotyczy testów opartych na kierunku ściany (`zfight`,
  `facing`). Wcześniej tarcza koła po lustrzanej stronie wyglądała na zwróconą w tę samą stronę co spód znacznika
  na niej, więc wychodziło migotanie, którego na ekranie nie ma (wagony: 1 → 0). `seethrough` bez zmian —
  promień three.js przelicza normalną przez lustro sam.
- **2026-10-31** — `zfight` liczy tylko widoczne nakładanie: środek wspólnej części dwóch ścian (przycięcie
  trójkątów w 2D) nie może leżeć wewnątrz trzeciej zamkniętej bryły. Wcześniej końce szprych kół krzyżujące się
  w piaście dawały dziesiątki ostrzeżeń (łaziki, amfibia), choć leżą 7–9 mm w środku piasty. Nazwy części bez
  nazwy bez numeru porządkowego (grupowanie kopii). Modele morskie i stanowisko testowe — wyniki bez zmian.
  Przykład: hauler 87 → 3 ostrzeżenia (zostały: zlicowane ściany skrzyni, skrzynia na podłodze, koła tandemu
  nachodzące na siebie).
- Igły (`sliver`) na fazach zaokrąglonych prostopadłościanów (tabor) — zostają: każde ogólne kryterium, które je
  pomija, pomija też igły ze stanowiska testowego.
