# Ulice — StreetKit (`js/models/streets/`)

Z Tornado.io (przeniesione 2026-11-26; plik 1193 linii podzielony na części). Oglądane w laboratorium ulic
([`../labs/streets.md`](../labs/streets.md)). Wejście: `streetkit.js` (eksportuje całość); części:

| Plik | Co |
|---|---|
| `surfaces.js` | nawierzchnie `SURFACES`, płyty chodnikowe `SLABS` (własny generator tekstur), przekroje `PROFILES`, `surface(id)`, farba oznakowania |
| `geom.js` | geometria tras: próbki linii, pasy, lica krawężników, skarpy, oznakowanie; wyposażenie wzdłuż trasy (stanowiska, instancje, rury, przekroje po linii, zaślepki, tekstury z płótna) |
| `street.js` | `buildStreet`, `buildCrossing`, `alongStreet` |
| `signals.js` | `buildTrafficLight`, `signalAt`, `SIGNAL_STATES`, `SIGNAL_TIMES` |
| `lamps.js` | `buildLamp`, `LAMPS` |
| `signs.js` | `buildSign`, `SIGNS` |
| `viaduct.js` | `buildViaduct`, `VIADUCT_PROFILE` |
| `furniture.js` | `buildBollards`, `buildRail`, `buildNoiseWall`, `BOLLARDS`, `RAILS`, `NOISE` |
| `mileposts.js` | `buildMilepost`, `buildMileposts` |
| `parking.js` | `buildParking`, `PARKING`, `wheelchair` |
| `tunnels.js` | `buildTunnel`, `tunnelArch`, `TUNNEL_PROFILE`, `TUNNEL_BOX_PROFILE`, `buildTrough` |
| `footbridge.js` | `buildFootbridge` |
| `subway.js` | `buildSubway` |

Nazwy w danych modelu (`label`) są po polsku; laboratorium pokazuje je po angielsku (`js/labs/streets/en.js`).
Doktor modeli: `streets/…` (wszystkie przekroje i elementy; `ground: 0` dla stojących na ziemi).


Trasa = przekrój prowadzony po linii (krzywa Catmulla–Roma przez punkty `[[x, z], …]`). Przekrój to pasy od osi na
zewnątrz, po obu stronach: jezdnia (`lanes` × `laneW`, opcjonalnie pas dzielący `median`), potem `strips`:
krawężnik, chodnik, droga dla rowerów, zieleń, pobocze z kruszywa, obrzeże — każdy z szerokością `w`, wysokością `h`
(nad jezdnią) i nawierzchnią `s`. Lica krawężników tam, gdzie zmienia się wysokość.

| Przekrój (`PROFILES`) | Co to |
|---|---|
| `city` | ulica miejska: 2 × 3,25 m, oś przerywana, krawężnik 14 cm, chodnik z płyt 2,5 m, zieleń |
| `avenue` | aleja: dwie jezdnie po 2 pasy, pas dzielący z trawnikiem, chodnik z kostki, droga dla rowerów, chodnik z płyt |
| `village` | droga wiejska: stary asfalt, pobocza z kruszywa, rów z trawą |
| `path` | ścieżka z kruszywa z obrzeżem |
| `cycle` | droga dla rowerów z czerwonej kostki i chodnik |

Nawierzchnie (`SURFACES`): asfalt, asfalt stary, kostka, kostka czerwona, kruszywo, krawężnik granitowy, trawnik (MatKit)
i **płyty chodnikowe** z własnego generatora tekstur (`SLABS`: prawdziwe kwadraty ze spoinami, odcień każdej płyty,
wypukłości w mapie wysokości) — wersje do wyboru: 50 × 50 szare, 35 × 35, 30 × 30 grafitowe, 50 × 50 stare (spękane,
przekrzywione, z mchem w spoinach), 50 × 50 szachownica, 100 × 50 granitowe (na mijankę), płyty z wypustkami dla
niewidomych (żółte), trylinka (sześciokąty z otworami).

## Sygnalizator

`buildTrafficLight({ arm, height, backplate })` — słup ocynkowany (albo z wysięgnikiem nad jezdnię, w −x: słup po prawej
stronie jezdni), komora z soczewkami 300 mm (czerwone, żółte, zielone), daszki, tarcza z białą obwódką; przód +z.
`set(stan)`: `red`, `redYellow`, `green`, `yellow`, `yellowBlink`, `off`. Cykl jak w Polsce (`signalAt(t, SIGNAL_TIMES,
przesunięcie)`): zielone 20 s → żółte 3 s → czerwone → czerwone z żółtym 1,5 s; dwie fazy na przemian (faza B przesunięta
o `SIGNAL_TIMES.half`) z 2 s, gdy wszędzie jest czerwone. Oznakowanie poziome: linie ciągłe, przerywane, przejścia dla pieszych (zebra), linie zatrzymania.

```js
import { buildStreet, buildCrossing, PROFILES } from '../js/models/streets/streetkit.js';
scene.add(buildStreet([[-40, 0], [0, 10], [40, 0]], PROFILES.city).group);
scene.add(buildCrossing('city', { arms: 4, arm: 30, corner: 6 }).group);   // 3 wloty — skrzyżowanie T
```

## Latarnie i znaki

`buildLamp(type)` — latarnie (`LAMPS`): **modern** (współczesna LED, słup ocynkowany 8 m z wysięgnikiem), **double**
(dwa wysięgniki, 9 m — aleja, pas dzielący), **park** (stylizowana parkowa, żeliwny słup 4 m z latarnią, ciepłe
światło), **old** (stara betonowa 9 m z oprawą sodową, pomarańczowe światło). `on(true)` zapala: oprawa świeci,
światło pada w dół na ulicę (bez cieni — latarni bywa dużo). Przód oprawy: +z (do jezdni).

`buildSign(id)` — polskie znaki drogowe (`SIGNS`), tarcze rysowane na płótnie, tył szary, słupek ocynkowany: A-7 ustąp
pierwszeństwa, A-16 przejście dla pieszych, A-17 dzieci (ostrzegawcze: żółte tło, czerwona obwódka); B-1, B-2 zakaz
wjazdu, B-20 STOP, B-33 ograniczenie 50, B-36 zakaz zatrzymywania; C-12 ruch okrężny, C-13 droga dla rowerów; D-1 droga
z pierwszeństwem, D-6 przejście dla pieszych, D-18 parking.

`alongStreet(points, every, offset)` — miejsca co `every` m wzdłuż trasy, odsunięte od osi, z obrotem przodem do osi.

## Słupki, barierki, ekrany dźwiękochłonne

Wzdłuż linii trasy, przy odsunięciu od osi: `buildBollards(points, type, { offset, every, y })` — `BOLLARDS`: stalowy
blokujący (Ø 114 mm, 1 m, pasy odblaskowe), żeliwny grafitowy, żeliwne połączone łańcuchem (ogniwa jako `InstancedMesh`), betonowy walec (Ø 0,6 m), prowadzący U-1a;
`buildRail(points, type, { offset, y })` — `RAILS`: ochronna U-12a (czerwono-biała, 1,1 m), miejska grafitowa
z prętami, bariera energochłonna (prowadnica falista na słupkach co 2 m, od strony jezdni);
`buildNoiseWall(points, type, { offset, height, y })` — `NOISE`: kasety pochłaniające, przezroczysty PMMA z pasami
przeciw ptakom, kasety z przeszkleniem u góry; cokół betonowy 0,5 m, słupy HEB 200 co 4 m. Słupki i słupy to
`InstancedMesh`. W oknie Wyposażenie: słupki i barierka przy krawężniku, ekrany za ostatnim pasem przekroju (rodzaj,
wysokość 2–6 m) — na próbkach z jedną linią trasy.
Ekran na wiadukcie: `buildNoiseWall(…, { offset: barrierAt, y: barrierTop, plinth: 0 })` — na koronie bariery
pomostu, wtedy `buildViaduct(…, { rail: false })` (bez poręczy).

Pikietaż: `buildMilepost(km, hm)` — słupek hektometrowy (biały, 0,6 m, cyfra hektometra) albo kilometrowy (`hm` 0,
większy, numer kilometra, czerwona głowica); `buildMileposts(points, { offset, y, start, every: 100 })` — co 100 m
według pikietażu `start` na początku linii.

## Miejsca parkingowe

Pas postojowy to pas przekroju `{ k: 'parking', w, h: 0, s }` przed krawężnikiem (laboratorium wstawia go na
próbkach z jedną linią i jezdnią dwupasową). `buildParking(points, type, { inner, side, disabled, margin })` rysuje
oznakowanie: `PARKING` — równoległe (2,5 × 6 m, linia oddzielająca od pasa ruchu), skośne 60° (2,5 × 5 m, skos
w kierunku jazdy — ruch prawostronny), prostopadłe (2,5 × 5 m); `disabled` pierwszych miejsc dla osób
z niepełnosprawnością (3,6 m): niebieska powierzchnia z białym obrysem i symbolem P-24 czytelnym z jezdni. Zwraca
`stalls` — środki i kąty stanowisk (pod auta). Przy pierwszym takim miejscu znak D-18 z tabliczką T-29
(`buildSign('D-18', { tab: 'T-29' })`).

## Tunele

`buildTunnel(points, profile, { type, ground, wall, lights })` — od portalu do portalu po linii trasy. `arch`
(`TUNNEL_PROFILE`, dwa pasy): obudowa łukowa — ściany 2,6 m i sklepienie półkoliste, oprawy w dwóch rzędach pod
sklepieniem co 8 m. `box` (`TUNNEL_BOX_PROFILE`, 2 × 2 pasy): przekrój prostokątny, strop 5,2 m, wysepka z rzędem
słupów co 6 m, oprawy nad każdą jezdnią. Oba: jasne okładziny ścian do 3 m, chodniki służbowe, portale — betonowa
ściana czołowa z otworem przekroju (w `box` dwa otwory i filar), korona idzie za terenem `ground(x, z)`. Zwraca
`half`, `top` i `arch` (przekrój) do wycięcia terenu. W próbce wzgórze z grzbietem w poprzek drogi: portale tam,
gdzie nad stropem są ≥ 2 m gruntu, dojazdy w przekopie ze skarpami.

## Kładki dla pieszych

`buildFootbridge({ span, height, width, lift })` — pomost stalowy (dźwigary skrzynkowe, płyta) na wysokości 5 m
(skrajnia 4,6 m), szerokość 3 m, balustrady szklane 1,1 m z pochwytem; na końcach spoczniki na czterech słupach, z nich
schody betonowe w stronę +x (dwa biegi, spocznik pośredni, stopnie 15 × 30 cm, pochwyty). `lift: true` — przy każdym
spoczniku winda w przeszklonym szybie ze stalową ramą, kabina, drzwi na dole i przy spoczniku. Lokalnie pomost biegnie
wzdłuż z (w poprzek ulicy wzdłuż x). `stairs: 'switchback'` — schody naprzemienne (dwubiegowe z zawrotem): drugi bieg
wraca obok pierwszego, spocznik pośredni na całą szerokość.

## Przejście podziemne i tunel pod równym terenem

`buildSubway({ span, depth, width })` — korytarz 4 × 2,6 m pod ulicą (posadzka na −3,4 m), płytki na ścianach, oprawy
w stropie, po obu stronach odkryte klatki schodowe z attyką 1,1 m; zwraca `holes` — otwory w terenie nad klatkami.
`buildTrough(points3, profile, { ground, parapet })` — otwarta rampa między murami oporowymi (od jezdni do terenu
+ attyka); odcinek pod ziemią to `buildTunnel` po punktach z ujemną wysokością (korona portalu liczona od terenu
bezwzględnie). W próbce teren to płaszczyzna z otworami nad rampami i klatkami.

## Wiadukty

Trasa może mieć wysokość: punkty `[x, z, y]`. `buildViaduct(points3, profile, { pierEvery, deck, fillBelow, avoid })` —
pomost z przekrojem `VIADUCT_PROFILE` (dwa pasy 3,5 m, krawężnik, wąski chodnik), płyta pomostu 1,3 m (spód i boki
z betonu), bariery betonowe z poręczą stalową, a pod spodem: nasyp ze skarpami 1 : 1,5 (darń) tam, gdzie pomost jest
niżej niż `fillBelow` (5 m), ściany przyczółków na przejściu i filary z oczepem (dwa słupy Ø 1,2 m) co `pierEvery` m
wyżej; `avoid(x, z)` — gdzie nie stawiać filarów (jezdnia pod wiaduktem).

