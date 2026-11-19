# Złomowisko — modele (JunkKit, `js/models/junkyard/`)

Modele z gry Złomowisko (repo Trash), przeniesione z historią (`js/models/` → `js/models/junkyard/`,
`js/render/textures.js` → `textures.js`, `js/physics/shapes.js` → `shapes.js`). Budowane kodem, bez DOM (działają
w Node — doktor modeli). Każdy moduł eksportuje `build(lod)` i `info`; spis z nazwami EN/PL: `registry.js` (`MODELS`,
`GROUPS`). Materiały — `materials.js` (dane), tekstury proceduralne — `textures.js` (`applyTextures`, MatKit z
`js/render/materials/matkit.js`), zderzacz → części wypukłe — `shapes.js`. Właściwości przedmiotów (metal, topnienie,
gęstość, palenie, zgniatanie do innego modelu, guma) i ich bryły (`halfExtents`, `itemKit`) — `properties.js` (z katalogu
gry, bez cen skupu); wygląd ognia i dymu pieca — `fire.js`, stopionego metalu — `lava.js`. Fizyka i maszyny w działaniu
są zachowaniami ([../behaviors/README.md](../behaviors/README.md)): przeładowarka `land/grapple.js`, przedmioty
`land/items.js`, maszyny `land/machines/`. Zasady gry (skup, ceny) zostały w grze.

Gdzie oglądane: przedmioty — [laboratorium przedmiotów](../labs/items.md); maszyny i otoczenie — laboratorium budowli
(grupa „Junkyard (on land)”, maszyny w działaniu); przeładowarka — laboratorium pojazdów, ląd (jeździ i chwyta). W edytorze
sceny: rodzina „Junkyard” (w grze edytora: przeładowarka, przedmioty, maszyny i bryły otoczenia na wspólnym świecie
przedmiotów). Doktor modeli: `tools/doctor/sources/junkyard.js`.

## Przedmioty

| id | nazwa | wymiary | masa | zderzacz | opór X·Y·Z [kN] | wersja |
|---|---|---|---|---|---|---|
| tire-car | Opona samochodowa 205/55 R16 | Ø 632 × 214 mm | 8,6 kg | pierścień 203–316 mm, h 205 | 4,5 · 2,2 · 4,5 | 1.0.0 |
| tire-bike | Opona rowerowa 700×35C (ETRTO 37-622) | Ø 695 × 37 mm | 0,55 kg | pierścień 311–348 mm, h 35 | 0,08 · 0,05 · 0,08 | 1.0.0 |
| tire-tractor | Opona traktorowa 18.4-38 (R-1) | Ø 1790 × 470 mm | 190 kg | pierścień 483–895 mm, h 470 | 35 · 18 · 35 | 1.0.0 |
| can | Puszka aluminiowa 0,33 l | Ø 66 × 115 mm | 13,5 g | walec r 33, h 115,5 | 0,35 · 0,35 · 0,35 | 1.0.0 |
| can-crushed | Puszka zgnieciona | Ø ~79 × 41 mm | 13,5 g | walec r 38, h 42 | 2,5 · 2,5 · 2,5 | 1.0.0 |
| pot | Garnek nierdzewny 6 l | Ø 240 (z uchwytami 347) × 152 mm | 1,6 kg | naczynie r 121, h 152 + uchwyty | 3 · 6 · 3 | 1.0.1 |
| newspapers | Gazety związane sznurkiem | 420 × 300 × 220 mm | 12,5 kg | prostopadłościan | 25 · 60 · 25 | 1.0.1 |
| box | Karton zamknięty (F0201) | 400 × 300 × 300 mm | 4 kg | prostopadłościan | 1 · 1,6 · 1 | 1.0.0 |
| barrel | Beczka stalowa 200 l (1A1) | Ø 585 × 880 mm | 18 kg | walec r 292, h 880 | 12 · 45 · 12 | 1.0.0 |
| ingot | Sztabka (aluminium / stal / mieszanka) | 400 × 120 × 80 mm | 8,6 / 25 / 16,6 kg | bryła wypukła | — | 1.0.1 |
| ingot-small | Mała sztabka (aluminium) | 250 × 80 × 50 mm | 2,2 kg | bryła wypukła | — | 1.0.0 |

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

### Puszka zgnieciona (`items/can-crushed.js`)
- Budowana z puszki (gęsta ścianka: 36 pierścieni) przez odkształcenie: ścianka i szyjka ściśnięte do 15% wysokości,
  promień rośnie na grzbietach fałd (fala trójkątna), grzbiety biegną zygzakiem (4 płaty) — wygląd wyboczenia w romby.
- Wieczko przechylone o ~9° i przesunięte; dno lekko spłaszczone. Fałdy nie przenikają się (sprawdzone doktorem).
- W grze cała puszka po zgnieceniu zamienia się w ten model.

### Garnek (`items/pot.js`)
- Profil z grubością ścianki (1,1 mm), zawinięty brzeg, dno kapsułowe 5,8 mm mniejszej średnicy.
- Uchwyty: owalna rura po łuku, płytki przy ściance, po 2 nity z łbami na zewnątrz i w środku.
- Zderzacz `cup`: dno + 14 wycinków ścianki + 2 prostopadłościany uchwytów — w środku mieszczą się mniejsze przedmioty.

### Gazety (`items/newspapers.js`)
- 30 warstw (po ~2 gazety) z fazowanymi brzegami, każda lekko przesunięta i skręcona, z innym przesunięciem linii kartek.
- Pierwsza strona (fikcyjny tytuł „Głos Okolicy”) jako cienka kartka 0,8 mm na wierzchu.
- Sznurek: dwie zamknięte pętle (wzdłuż i w poprzek) z narożnikami wciśniętymi w papier, supeł i dwa luźne końce.
- Sprasowany papier: duży opór, zgniata się najwyżej o 10–18%.

### Karton (`items/box.js`)
- Tektura falista 4 mm, ścianki wybrzuszone do 6 mm, górny róg wgnieciony (gładkie odkształcenie w promieniu 13 cm).
- Klapy górne lekko uniesione przy szczelinie, taśma 48 mm zawinięta 7 cm na krótsze ściany, zakładka klejona.
- Nadruki proceduralne na tekturze kraft: strzałki „góra”, kieliszek, recykling PAP 20, pieczątka BC/ECT, nr partii.
- Pali się w piecu na papier; zgniata się łatwo (mały opór).

### Beczka (`items/barrel.js`)
- Profil 1A1: rąbki zwijane (Ø 585), ścianka Ø 572, 2 obręcze toczne +11 mm, wieko i dno wpuszczone o 14 mm.
- Wieko i dno osobnymi krążkami z płaskim UV i własną teksturą (pierścienie usztywniające, rdza przy brzegu).
- Korki gwintowane z kołnierzem i 8 żeberkami; 2 wgniecenia ścianki (losowe, stałe dla wariantu).
- Farba: zacieki, rysy, odpryski, łaty rdzy (mapa szorstkości i metaliczności), rdza wzdłuż rąbków i obręczy.

## Otoczenie

### Platforma (`world/platform.js`)
- Podest 26 × 18 × 0,5 m (beton), nawierzchnia z 117 płyt 2 × 2 m z fugami 2 cm, losowe osiadanie i przesunięcie tekstury.
- Krawężnik 25 × 10 cm i pas na pionowej krawędzi w pasy ostrzegawcze; przerwa na rampę (5 × 7 m, ~4,6°).
- 4 maszty kratowe 9 m (rury ocynkowane, krzyżulce co 1 m) z dwoma naświetlaczami.
- `colliders()` — prostopadłościan podestu i bryła wypukła rampy; `TOP` — wysokość nawierzchni (0,56 m).

## Maszyny

### Piec na papier i drewno (`machines/furnace-paper.js`)
- Skrzynia 2,4 × 2,2 × 2,0 m (blacha zardzewiała), wnętrze z cegły szamotowej 10 cm, ruszt 14 prętów nad świecącym żarem.
- Otwór 1,2 × 0,8 m na wysokości 1,1 m; taca pochylona do otworu — położony przedmiot zsuwa się na ruszt.
- `LAYOUT.burn` — strefa spalania (przedmioty z papieru i tektury w niej płoną), `LAYOUT.fire` — miejsce ognia.
- `colliders()` — ściany z otworem, dach, ruszt, taca, komin.

### Zgniatarka do puszek (`machines/can-crusher.js`)
- Lej 2,2 × 1,6 m (zasyp ręczny z podestu lub chwytakiem) nad komorą 1,6 × 1,0 × 1,0 m.
- Tłok poziomy (grupa `tłok`, ruch w x), siła 9 kN, prędkość 0,25 m/s; zasuwa (grupa `zasuwa`, ruch w y) otwiera wylot do zsypu i kosza.
- `LAYOUT` — komora, tłok (start, koniec, siła), zasuwa, przycisk, kosz; `colliders()` — części nieruchome.
- 9 kN zgniata puszki, kartony, opony rowerowe i samochodowe, garnki; beczki, gazety i opony traktorowe są za mocne.

### Zgniatarka do metalu (`machines/metal-crusher.js`)
- Prasa pionowa: płyta dociskowa (grupa `płyta dociskowa`, ruch w y od 4,15 do 0,65 m), siła 400 kN — zgniata wszystko.
- Komora otwarta od góry (załadunek chwytakiem lub z podestu po prawej), brama z przodu (grupa `brama`, ruch w y) do wyjęcia kostki.
- Siłowniki na poprzecznicy, tłoczyska chowają się w cylindrach (całość 9,4 m wysokości).

### Piec indukcyjny (`machines/induction-furnace.js`)
- Tygiel Ø 1,1 × 1,2 m, wnętrze Ø 0,7 × 0,95 m (~365 l) — po zgnieceniu mieści się więcej złomu.
- Grupa `tygiel` obraca się wokół osi x przy wylewie (`LAYOUT.pivot`, do 1,75 rad); `LAYOUT.inner` — wnętrze, `LAYOUT.spout` — dzióbek.
- `crucibleColliders()` — dno i 12 wycinków ścianki (obracają się z tyglem), `colliders()` — reszta.
- Część `stopiony metal` — powierzchnia wytopu (gra ustawia poziom i shader lawy).

### Linia odlewnicza (`machines/casting-line.js`) i sztabka (`items/ingot.js`)
- Rynna 2,45 m ze spadkiem 0,4 m (wnętrze 13 × 10 cm), ustawiona pod wylewem przechylonego pieca.
- Przenośnik z 8 formami (podziałka 0,5 m, grupa `formy`); forma pod końcem rynny (`LAYOUT.pour`) napełnia się, potem przenośnik przesuwa formy o podziałkę.
- Wnęka formy = kształt sztabki (`INGOT`, 3,2 l); masa sztabki zależy od metalu (gęstość wariantu).
- Od v1.1.0: drugi przenośnik z 10 małymi formami (`INGOT_SMALL`, 0,82 l) na aluminium; rozdzielacz z zasuwą (grupa `zasuwa rozdzielacza`) i dźwignia (grupa `dźwignia`, `LAYOUT.lever`) wybierają dyszę (`LAYOUT.pour` / `LAYOUT.pour2`).

### Ogrodzenie (`world/fence.js`)
- Plac 80 × 80 m, brama 6 m od strony +z (zamknięta — nie da się wyjść); 4 ściany zderzaczy po 4 m wysokości.
- Siatka jako płaszczyzny dwustronne z teksturą przezroczystą (`alphaTest`) — tanie na GPU.

### Punkt skupu (`world/buyback.js`)
- Kontener 6 × 2,45 × 2,6 m przy bramie; `LAYOUT.scale` — waga (przedmioty na niej są wyceniane), `LAYOUT.window` — okienko (sprzedaż).
- Cennik (zł/kg): aluminium 6,20, stal 1,10, mieszanka 0,90, opony 0,30 — skup przyjmuje sztabki i opony (całe lub zgniecione). Od v1.1.0 opony na cenniku.

## Pojazd

### Przeładowarka z chwytakiem (`vehicle/grapple-truck.js`)
- Grupy ruchome: `podwozie` › `koło 0…3`; `nadwozie` (obrót y w `LAYOUT.slew`) › `wysięgnik` (x, 6,2 m) › `ramię` (x, 4,4 m) › `chwytak` › `szczęka 0…3` (x, otwarte −1,0 rad, zamknięte −0,1).
- Szczęki: zakrzywione trójkąty (szerokie 0,5 m przy sworzniu, ostre na końcu), grubość malejąca, żebro wzdłuż.
- Lewe koła: obrót o 180° wpisany w geometrię (doktor modeli źle ocenia obrócone grupy — test `facing`).
- Doktor: LOD 1 czysty; LOD 0 — jedno zgłoszenie `facing` na korpusie opony w całym pojeździe (sama opona i każde koło osobno są czyste).
