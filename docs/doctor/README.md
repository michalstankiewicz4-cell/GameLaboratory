# Doktor modeli (`tools/doctor.html`, `tools/doctor/`)

Jeden doktor dla wszystkich modeli laboratorium: kosmos (Space), morze (Battle), ląd i tabor (TrainKit).
Szuka powtarzających się błędów modeli budowanych kodem. Scalony z dwóch wersji: doktora ze Space
(`history-space.md`) i jego rozszerzonej wersji z Battle (`history-sea.md`). Logika to wersja z Battle —
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
| `zfight` | ostrzeżenie | ściany dwóch części w jednej płaszczyźnie — migoczą |
| `floating` | ostrzeżenie | część niczego nie dotyka |
| `waterline` | ostrzeżenie | część nad kadłubem sięga pod linię wody (`opts.waterline`) |
| `poke` | ostrzeżenie | element wystaje przez burtę (`opts.hullSide`) |
| `budget` | ostrzeżenie | model przekracza budżet gry (`opts.budget`) |
| `hidden` | info | część w całości wewnątrz innej |
| `speck` | info | część za mała, by ją zobaczyć |
| `sliver` | info | trójkąty-igły, które źle się cieniują |

Wyjątki dla zamierzonych przypadków: `userData.doctorOk = 'floating'` (albo tablica testów) na części lub jej przodku.

## Użycie

- Strona: `tools/doctor.html`; `?model=sea/lab/blyskawica` otwiera jeden model. `window.doctorReport` — wyniki jako dane.
- Bez okna: `python3 tools/doctor.py` (porównanie z wzorcem), `--update` (nowy wzorzec), `--shots` (zrzuty).
- Strona ładuje kity Space przez `js/core/three-global.js`, więc w podglądzie także modele morskie świecą
  jak w r128 (kolory bez konwersji, oświetlenie legacy). Na wyniki doktora nie ma to wpływu.
