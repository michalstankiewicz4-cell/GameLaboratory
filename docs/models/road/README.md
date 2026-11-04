# Pojazdy drogowe (RoadKit, `js/models/road/`)

Prawdziwe pojazdy drogowe do gier (dla gry CityExplorer — Warszawa 3D): samochód, czołg, autobus przegubowy. Oglądane w laboratorium pojazdów, na lądzie
(`labs/vehicles-land.html`, lista na pasku), badane doktorem modeli (`tools/doctor/sources/road.js`).

## Pliki

| Plik | Co to jest |
|---|---|
| `roadkit.js` | rejestr: `VEHICLES`, `buildVehicle(id, opts)`, `disposeVehicle(v)`; także `window.RoadKit` dla laboratoriów |
| `geom.js` | geometria: krzywe profilu, nadwozie z przekrojów (`loftParts` — siatka [stacja][punkt] dzielona na części), wstęgi na powierzchni, profil po ścieżce (`sweepFlat`), zaokrąglone bryły, koło (opona z profilu, felga, kołpak, bęben) |
| `materials.js` | lakier z lakierem bezbarwnym, chrom, szkło, guma, klosze, odbłyśnik reflektora, bieżnik (mapa wypukłości), bok opony z napisem, tablice z PRL, maskownice, tapicerka, zegary; `decal()` — naklejki z przesunięciem głębokości |
| `chassis.js` | ruch w grupie pojazdu: koła (toczenie, skręt Ackermanna), zawieszenie na podłożu (płaszczyzna przez koła, sprężyny, przechył w zakręcie, „kucanie” przy przyspieszaniu), światła, drzwi |
| `cars/polonez.js` | FSO Polonez 1500 (MR'78) — [polonez.md](polonez.md) |
| `tanks/abrams.js` | M1A2 Abrams — [abrams.md](abrams.md) |
| `buses/urbino18.js` | Solaris Urbino 18 electric, MZA Warszawa — [urbino18.md](urbino18.md) |
| `tracks.js` | gąsienice: pas ogniw (instancje) po obwiedni kół, przesuw z prędkością gąsienicy |

## Układ i API

- 1 jednostka = 1 m. Początek: ziemia pod środkiem pojazdu; +Y w górę, +Z przód, **+X lewa strona (kierowca)**.
- `buildVehicle(id, { paint, plate })` → `{ def, group, body, wheels, door, parts, materials, update, setPaint, dispose }`.
- `update(t, dt, opts)`: `speed` (m/s, ujemna — wstecz), `steer` (−1..1, dodatni w lewo), `contact(x, z)` — wysokość
  podłoża pod punktem pojazdu względem jego początku, `lights`, `brake`, `indicator` (`'left' | 'right' | 'hazard'`),
  `work` (0..1 — drzwi kierowcy).
- Czołg (`kind: 'tracked'`) zamiast `steer` bierze `turn` (rad/s), do tego `turret` i `gun`; autobus (`kind: 'articulated'`) ma `articulation()`.
- `def` ma pola laboratorium pojazdów (`name`, `role`, wymiary, `maxSpeed`, `accel`, `turnRadius`, `cargo`, `work`)
  oraz `paints` (kolory lakieru), `seat` (miejsce kierowcy) i `doorAt` (gdzie stanąć, żeby wsiąść).
- Model jest budowany **bez scalania** (każda część ma nazwę — doktor wskazuje część); gra może scalić statyczne części po materiale.
