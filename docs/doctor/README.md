# Doktor modeli (`tools/doctor.html`, `tools/doctor/`)

Jeden doktor dla wszystkich modeli laboratorium: kosmos (Space), morze (Battle), ląd i tabor (TrainKit).
Szuka powtarzających się błędów modeli budowanych kodem. Scalony z dwóch wersji: doktora ze Space
(`../history/doctor-space.md`) i jego rozszerzonej wersji z Battle (`../history/doctor-sea.md`). Logika to wersja z Battle —
ma wszystkie testy wersji ze Space i więcej.

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
| `tools/doctor/sources/test-bench.js` | stanowisko testowe: model z jednym błędem na każdy test |
| `tools/doctor/sources/common.js` | wspólne: koszt rysowania (trójkąty, wywołania, materiały) |
| `tools/doctor.py` | doktor bez okna (Playwright): porównuje z `tools/doctor.golden.json` |

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
| `waterline` | ostrzeżenie | część nad kadłubem sięga pod linię wody (`opts.waterline`) |
| `poke` | ostrzeżenie | element wystaje przez burtę (`opts.hullSide`) |
| `budget` | ostrzeżenie | model przekracza budżet gry (`opts.budget`) |
| `hidden` | info | część w całości wewnątrz innej |
| `speck` | info | część za mała, by ją zobaczyć |
| `sliver` | info | trójkąty-igły, które źle się cieniują |

Części bez nazwy opisuje rodzaj bryły, wymiary i kolor (np. `box 0.45×0.07×0.65 #ffffff`), bez numeru — kopie jednej
części mają jedną nazwę, więc ich wyniki łączą się w jeden „×n” (dotyczy też lustrzanych kopii w `facing` i `seethrough`).

Wyjątki dla zamierzonych przypadków: `userData.doctorOk = 'floating'` (albo tablica testów) na części lub jej przodku.

## Użycie

- Strona: `tools/doctor.html`; `?model=sea/lab/blyskawica` otwiera jeden model. `window.doctorReport` — wyniki jako dane.
- Bez okna: `python3 tools/doctor.py` (porównanie z wzorcem), `--update` (nowy wzorzec), `--shots` (zrzuty).
- Strona ładuje kity Space przez `js/core/three-global.js` — w grafice Battle, jak laboratoria (od 0.12.0;
  wcześniej w trybie legacy r128). Na wyniki doktora nie ma to wpływu.

## Zmiany

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
