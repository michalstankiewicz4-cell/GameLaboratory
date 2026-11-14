# Modele

Modele budowane kodem (`js/models/`), bez DOM. Każdy moduł eksportuje `build(lod)` i `info`.
Materiały — `js/models/materials.js` (dane), tekstury proceduralne — `js/render/textures.js`.

## Przedmioty

| id | nazwa | wymiary | masa | zderzacz | opór X·Y·Z [kN] | wersja |
|---|---|---|---|---|---|---|
| tire-car | Opona samochodowa 205/55 R16 | Ø 632 × 214 mm | 8,6 kg | pierścień 203–316 mm, h 205 | 4,5 · 2,2 · 4,5 | 1.0.0 |
| tire-bike | Opona rowerowa 700×35C (ETRTO 37-622) | Ø 695 × 37 mm | 0,55 kg | pierścień 311–348 mm, h 35 | 0,08 · 0,05 · 0,08 | 1.0.0 |
| tire-tractor | Opona traktorowa 18.4-38 (R-1) | Ø 1790 × 470 mm | 190 kg | pierścień 483–895 mm, h 470 | 35 · 18 · 35 | 1.0.0 |
| can | Puszka aluminiowa 0,33 l | Ø 66 × 115 mm | 13,5 g | walec r 33, h 115,5 | 0,35 · 0,35 · 0,35 | 1.0.0 |

Oś Y przedmiotu = oś opony / walca. Opór — siła, od której przedmiot zaczyna się zgniatać wzdłuż danej osi;
`minScale` — do ilu procent wymiaru da się go zgnieść.

### Opona samochodowa (`items/tire-car.js`, generator `items/tire-core.js`)
- Korpus: przekrój z grubością (bok 8,5 mm, korona 19 mm, stopka grubsza), pusta komora między stopkami — bez felgi.
- Bieżnik: 66 podziałek, 4 rowki obwodowe, żebro środkowe z nacięciami, klocki pośrednie w V, klocki barkowe.
- Bok: wypukłe napisy (205/55 R16 91V, TUBELESS, RADIAL, M+S, DOT) i listwy — mapa wypukłości.
- LOD 0: ~39 tys. trójkątów; LOD 1: ~4,9 tys.

### Opona rowerowa (`items/tire-bike.js`)
- Trekkingowa 700×35C: przekrój prawie okrągły, ścianki 1,4 mm, boki z beżowej gumy, czarny pas bieżnika (mapa barwy na korpusie).
- Bieżnik: 120 podziałek, środek z małych klocków na przemian, kostki barkowe co drugą podziałkę; napisy rozmiaru i ciśnienia.
- Bardzo mały opór zgniecenia — zgniata się w każdej zgniatarce.

### Opona traktorowa (`items/tire-tractor.js`)
- Rolnicza 18.4-38 (R-1, dętkowa): łapy 58 mm szer., 38 mm wys., w łuku ~30–50°, strony przesunięte o pół podziałki.
- Łapy budowane jako przekrój trapezowy wzdłuż ścieżki na powierzchni korpusu (`add.lug`), osadzone w korpusie.
- 190 kg — za ciężka do noszenia, przenosi się ją pojazdem z chwytakiem.

### Puszka aluminiowa (`items/can.js`)
- Standard 330 ml: profil z dnem (kopuła, pierścień), dolnym zwężeniem, szyjką do wieczka Ø 54 mm i zawijanym szwem.
- Wieczko: nit, języczek (wytłoczka z otworem na palec), otwór wlewu jako ciemna naklejka (polygonOffset).
- Nadruk proceduralny (`canLabel`): farba mniej metaliczna niż goły aluminium (mapa metaliczności); warianty: piwo, cola, woda.
- Opór uproszczony — taki sam w 3 osiach.
