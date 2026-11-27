# Elementy maszyn — MechKit i ControlKit (`js/models/mech/`)

Z Tornado.io (przeniesione 2026-11-26). Oglądane w laboratorium mechaniki ([`../labs/mechanics.md`](../labs/mechanics.md)).
Każdy element obrotowy jest budowany wzdłuż lokalnej osi +x: część stała w grupie, część wirująca w `userData.spin`
(`spin.rotation.x` = kąt). Element nie wie, w jakim napędzie jest — kąty podaje zachowanie
(`js/behaviors/land/mech/`: `drive.js` — napęd kinematyczny z portami, `physics.js` — fizyka XPBD na kątach,
`contact.js` — zderzenia zębów, `circuit.js` — obwód elektryczny; środowisko ląd).

## MechKit (`mechkit.js` — wejście; części)

| Plik | Co |
|---|---|
| `base.js` | materiały (MatKit), dane fizyczne części (`PHYS`, `G_MAT`, `MOTOR_ELEC`), `planetPhase`, narzędzia geometrii |
| `teeth.js` | zarys ewolwentowy (`involuteOutline`), bryły zębów (`toothHulls`, `convexParts`, `ringHulls`), koło łańcuchowe wg ISO 606 (`sprocketOutline`, `sprocketHulls`) |
| `gears.js` | `gear`, `ringGear`, `sprocket` |
| `loops.js` | `pulley`, `loopPath`, `chainDistance`, `chainLoop`, `beltLoop` |
| `shafts.js` | `shaft`, `pillowBlock`, `jawCoupling`, `flangeCoupling`, `yoke`, `cross` |
| `units.js` | `motor` (`MOTORS`), `housing`, `tubeHousing`, `planetary`, `discBrake` |

## ControlKit (`controls.js`)

Sterowanie i zasilanie obsługiwane na modelu (części z `userData.control`, `api.press / release / drag / tick`): obudowa,
wyłącznik, potencjometr, przycisk 22 mm, falownik z pokrętłem, grzybek bezpieczeństwa, lampka, przełącznik wyboru,
wyłącznik krańcowy, stycznik, przewód, kabel wielożyłowy, źródło zasilania AC / DC (umowne).

## Dane fizyczne i elektryczne części (przeniesione razem z modelami)

Każda część niesie swoje dane — laboratorium tylko je czyta i dokłada geometrię połączenia oraz schemat instalacji.

- **MechKit** (`js/models/mech/mechkit.js`): `userData.phys` z tabeli `PHYS` — zazębienie (`c` sztywności zęba, `zeta`,
  `eta`, pocienienie zęba `thin`·m → `luz`), wał (`G` wg materiału z `G_MAT`, gotowe `k = G·π·d⁴/(32·L)`), gwiazda
  sprzęgła kłowego (`k` wg twardości), sprzęgło kołnierzowe, łańcuch (`EA`), pas (`EA`, napięcie wstępne `F0`, `mu`,
  kąt rowka, tarcie kinetyczne, pełzanie), przegub Cardana (na krzyżaku), przekładnia planetarna (na koronie i na
  zestawie), łożysko (`drag`). Masa `mass` i bezwładność `J` — jak dotąd. Silnik: `userData.elec` z `MOTOR_ELEC`
  (sprawność, cos φ, prąd znamionowy `In` z mocy, prąd i straty biegu jałowego, napięcie, częstotliwość).
  Faza przekładni planetarnej: `planetPhase(zs, zp, zr, n)` — wspólna dla `planetary()` i laboratorium.
- **ControlKit** (`js/models/mech/controls.js`): `userData.elec` — stycznik (napięcie cewki, progi zadziałania /
  odpadania, czas, moce cewki, styki z numerami zacisków), falownik (sprawność, pobór jałowy, cos φ wejścia,
  napięcie, 24 V na wejścia DI, próg wejścia, AI 0–10 V, rozruch), lampka (napięcie, moc, próg świecenia), przyciski,
  grzybek, przełącznik (styki wg EN 60947), wyłącznik (bieguny, prąd), potencjometr (rezystancja), źródło (napięcie,
  fazowe, częstotliwość, układ sieci). Kabel: `R` żyły, długość, masa.
- **Zachowania** (`js/behaviors/land/mech/`): `drive.js` (sprawność połączenia z `phys.eta` części, która je tworzy),
  `physics.js`, `contact.js`, `circuit.js` — bez stałych części.
- **Zestaw „Układ silnika”** (dane tej maszyny, nie części; właściciel, 2026-11-27 — z laboratorium do modeli):
  `js/models/mech/assemblies/engine-layout/` — `machine.js` (rozmieszczenie na łożu, połączenia portów w napędzie),
  `installation.js` (regulator, urządzenia, kable z długościami z ułożenia, lista połączeń zacisków), wejście
  `engine-layout.js` (`buildEngineLayout({ hall })`). Fizyka układu (luz ze stref brył zębów, sztywności, łańcuch, pas,
  łożyska, krok klatki) — zachowanie `js/behaviors/land/mech/engine-layout.js` (`createEngineLayoutPhysics({ mc })`).
  Korzystają z nich laboratorium mechaniki i scena (`js/scene/mechanics.js`). W laboratorium zostały: okno Opis,
  kontrole brył zderzeń i hitboksy (`js/labs/mechanics/physics-mode.js`).
