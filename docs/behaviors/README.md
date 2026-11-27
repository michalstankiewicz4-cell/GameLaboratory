# Zachowania (`js/behaviors/`)

Zachowanie to napęd i ruch modelu w jednym środowisku: sama fizyka, bez sceny i bez interfejsu. Każdy plik deklaruje
środowiska, w których działa (`ENVIRONMENTS`). Model nie wie o zachowaniu: zachowanie liczy stan, a podpięcie
(w scenie: `js/scene/behaviors.js`, [`../scene/README.md`](../scene/README.md)) ustawia z niego model.
Zasada (CLAUDE.md): fizyka jest prawdziwa — start, ruch, skręt i zatrzymanie wynikają z sił, nic nie jest „przyklejone”.

| Zachowanie | Plik | Środowisko | Gdzie używane |
|---|---|---|---|
| okręt na wodzie | `water/ship.js` | woda | edytor sceny (okręty), gra CityExplorer |
| mała jednostka na wodzie | `water/craft.js` | woda (amfibia też ląd) | laboratoria pojazdów (roboty MarineKit, amfibia), edytor sceny (roboty morskie) |
| jazda po lądzie | `land/drive.js` | ląd | laboratorium pojazdów — ląd (łaziki, pojazdy drogowe), edytor sceny (pojazdy drogowe, łaziki) |
| ciąg w próżni | `space/thrust.js` | kosmos | edytor sceny (statki kosmiczne, dron) |
| orbita | `space/orbit.js` | kosmos | edytor sceny (ciała niebieskie) |
| lądowanie | `land/lander.js` | ląd | laboratorium pojazdów — ląd (statki kosmiczne), edytor sceny (statki kosmiczne nad lądem) |
| lot w atmosferze | `air/flight.js` | ląd (powietrze nad lądem) | edytor sceny (Spitfire) |
| koło na szynie — skład | `rail/physics.js`, `rail/rail.js` | ląd | laboratorium pojazdów — ląd (pociąg) |
| ciecze w kosmosie | `space/liquids.js` (siatka `space/grid3d.js`, shader `js/render/liquid.js`) | kosmos | laboratorium bloków (krople wody i lawy) |
| gaz w kosmosie | `space/gases.js` | kosmos | laboratorium bloków (chmura gazu) |
| koło na szynie — tramwaj | `rail/tram.js`, `rail/path.js` | ląd | laboratorium pojazdów — ląd (Swing na pętli toru; liczby w TramKit: `js/models/train/trams/swing.js`, `phys`) |
| przeładowarka z chwytakiem | `land/grapple.js` (jazda: `land/drive.js`) | ląd | laboratorium pojazdów — ląd (przeładowarka JunkKit z przedmiotami ze złomowiska), edytor sceny (`grapple`) |
| przedmioty na lądzie (bryły sztywne) | `land/items.js` (przedmioty złomowiska w nim: `land/junk-items.js` — `itemKit`) | ląd | przeładowarka, maszyny złomowiska, edytor sceny (`item`) |
| maszyny złomowiska | `land/machines/` (`machines.js`: zgniatarka `crusher.js`, piec na papier `furnace.js`, piec indukcyjny `induction.js`, linia odlewnicza `casting.js` + strumień metalu `metal-flow.js`, zderzacze `statics.js`) | ląd | laboratorium budowli (maszyny złomowiska w działaniu), edytor sceny (`machine`, `solid`) |
| deformacja blachy (DeformKit, z Tornado.io) | `land/deform/` (`shell.js`, rdzeń `shell-core.js`, osadzanie `embed.js`, zderzacze `box.js`, wątek `shell-worker.js`; opis [`deform.md`](deform.md)) | ląd | laboratorium przedmiotów (tryb Deformation: beczki pod prasą, kontener) |
| zniszczenie budynków (DestructKit, z Tornado.io) | `land/destruct/` (`world.js`, pękanie i statyka `statics.js`, uderzenia i wiatr `impacts.js`, bryły `physics.js` + wątek, wzory `patterns.js`, materiały, rysowanie, gruz, pożary `burn.js`; opis [`destruct.md`](destruct.md)) | ląd | laboratorium miasta (tryb Destruction: budynki HouseKit i Warszawy z części, uderzenie, rzut, trąba) |
| napęd maszyn, fizyka, zderzenia zębów, obwód elektryczny (z Tornado.io) | `land/mech/` (`drive.js` — porty i przełożenia, `physics.js` — XPBD na kątach: luz, sprężystość, poślizg pasa, straty, `contact.js` — bryły zębów, `circuit.js` — sieci, styczniki, falownik; `engine-layout.js` — fizyka układu silnika: luz, sztywności, łańcuch, pas, krok klatki; opis [`../labs/mechanics.md`](../labs/mechanics.md)) | ląd | laboratorium mechaniki (tryby Maszyna i Fizyka) |
| połączenie światów brył: odłamki budynków a przedmioty (beczki, opony…) | `land/bodies-link.js` (`linkBodies(items, destruct)`: odłamki bliskie przedmiotom jako bryły ruchome w świecie przedmiotów, odrzut wraca do odłamków co krok 1/240 s; każdy świat liczy się jak dotąd) | ląd | scena (▶ Graj, gdy są budynki z części i przedmioty) |

## Wiatr w scenie (trąba powietrzna, tornado, cyklon)

Wiatr środowiska — `world.windAt(x, y, z, out)` w ▶ Graj (scena bazowa: `stage.windAt`, wir z pogody,
`js/envs/sky/tornado.js`): okręt (`ship.js`: napór na burtę i nadbudówki, przechył od wiatru z boku), mała jednostka
(`craft.js`: na część nad wodą), pojazd (`drive.js`: opór względem powietrza, bok trzymają opony do przyczepności),
samolot (`flight.js`: wiatr jako ruch powietrza) i przedmioty (`items.js`: opór 0,5·ρ·Cd·A·|v|·v, śpiący budzi się, gdy
wiatr przesunąłby go mimo tarcia). Cyklon (`js/envs/sky/cyclone.js`) dokłada wiatr jednakowy w całej scenie (profil
Hollanda z porywami, przy ziemi trochę słabszy). Bez wiru i cyklonu — zero (bez zmian w zachowaniu).

## Okręt na wodzie (`water/ship.js`)

`createShip(def, { x, z, th })` → `{ state, step(dt, { throttle, rudder }, waves, t, isWater) }`; `shipDef(model, extra)`
— liczby z modelu ShipKit (długość, szerokość, dziób, rufa) z nadpisaniem (`mass`, `power`, `vmax`, `turnR`).

- Ruch w płaszczyźnie (naprzód, w bok, obrót): ciąg z mocy, opór kadłuba ∝ v² dobrany do prędkości maksymalnej,
  wstecz część ciągu; ster działa tym mocniej, im szybciej płynie woda wzdłuż kadłuba (promień cyrkulacji), z bezwładnością.
- Pion: zanurzenie, przegłębienie i przechył idą sprężynami z tłumieniem za falami WaterKit (`heightAt`) pod kadłubem;
  na szybkości dziób się unosi, na cyrkulacji okręt przechyla się na zewnątrz.
- Mielizna: gdy dziób, śródokręcie albo rufa są na lądzie (`isWater`), opór gruntu zatrzymuje okręt.
- Układ: +z dziób, +x lewa burta, y = 0 wodnica; `th` — kurs (obrót wokół pionu, +z ku `(sin th, cos th)`).
- Stan: `x`, `z`, `th`, `vf` (prędkość naprzód, m/s), `vs`, `r`, `throttle`, `rudder` (z opóźnieniem maszyn i płetwy),
  `heave`, `pitch`, `roll`, `aground`.
- Liczby Błyskawicy: [`../models/ships-sea/blyskawica.md`](../models/ships-sea/blyskawica.md), „Ruch”.

## Mała jednostka na wodzie (`water/craft.js`)

`createCraft(def, { x, z, yaw, y })` → `{ state, step(dt, c, env), def }`; `craftDef(info, extra)` — z danych MarineKit
(`length`, `width`, `height`, `maxSpeed`, `accel`, `turnRadius`, `maxDepth`, `float`, `foils`, `azimuth`, `wheels`);
masa bez danych — z pola wodnicy i zanurzenia (pojazd podwodny: wyporność całego kadłuba o 3 % większa niż ciężar).

- Płaszczyzna: ciąg śrub η·P / max(v, v0) (η 0,6), opór K·v² (na prędkości maksymalnej równy ciągowi; z płatami —
  większy, dopóki kadłub jest w wodzie), opór boczny, ster — moment ∝ v² do promienia `turnRadius`, pędniki
  azymutalne — także w miejscu, tłumienie obrotu.
- Pion: wyporność ρ·g·A·zanurzenie, tłumienie; płaty — nośność ½ρ·CL·A·v², dopóki są w wodzie (równowaga na płatach
  sama); nurek — pędniki pionowe do zadanej głębokości (najwyżej 30 % ciężaru); grunt i dno — kontakt (sprężyna, tłumik).
- Przegłębienie i przechył: momenty prostujące wodnicy ρ·g·I do płaszczyzny fali pod kadłubem (na gruncie — do
  płaszczyzny gruntu pod kołami), dziób unosi się pod parą.
- Amfibia: na gruncie koła (napęd do μ·N, regulator do prędkości maksymalnej, zbocze z normalnej gruntu), w wodzie śruby.
- Sterowanie `c`: `throttle`, `steer` (dodatni — w lewo), `dive`; `env`: `surface(x, z)` (woda z falami), `floor(x, z)`.
- Stan: `x`, `z`, `yaw`, `u`, `v`, `r`, `y`, `vy`, `pitch`, `roll`, `depth`, `lift`, `onLand`, `speed`. Model dostaje
  pozę przez `MarineKit` `update(t, dt, { pose })` (MarineKit nie ma już własnego pływania).

## Jazda po lądzie (`land/drive.js`)

`createDrive(def, { x, z, yaw })` → `{ state, step(dt, c, ground), def }`; `driveDef(info, extra)` — liczby z danych
modelu (RoadKit, VehicleKit): `mass`, `power`, `maxSpeed`, `turnRadius` (0 — gąsienice), `wheelbase` (gąsienice:
długość styku), `gauge`, wymiary; brakujące wyprowadzone (moc z `accel` i `maxSpeed`, masa ok. 450 kg/m² obrysu).

- Napęd: F = η·P / max(v, v0), najwyżej μ·N, regulator tuż pod prędkością maksymalną; wsteczny 40 % mocy; hamulce do μ·N.
- Opory: toczenia Crr·N (koła 0,015, gąsienice 0,045), powietrza ½ρ·CdA·v² (CdA z mocy i prędkości maksymalnej, najwyżej
  1,1 × przekrój), zbocze m·g·sin θ (wysokość gruntu pod przodem i tyłem).
- Koła — model jednośladowy: kąt znoszenia osi, siła boczna Cα·α (Cα ≈ 10 × nacisk osi), najwyżej μ·N osi (poślizg);
  skręt kół do kąta z `turnRadius`, z ograniczoną szybkością.
- Gąsienice: każda goni zadaną prędkość (dźwignia ± skręt) — napęd do mocy (połowa na stronę), hamowanie do przyczepności
  (wewnętrzna hamuje); moment z różnicy sił minus opór skrętu μt·N·l/4 (μt 0,5), bez jazdy bokiem.
- Woda: gdy grunt jest pod wodą — opór ½·ρw·Cd·A·v² i wyporność (mniejszy docisk, mniej przyczepności): pojazd lądowy
  staje sam.
- Sterowanie `c`: `throttle` −1…1, `steer` −1…1 (dodatni — w lewo), `brake`; `ground`: `height(x, z)`, `water(x, z)`.
- Stan: `x`, `z`, `yaw`, `u` (naprzód), `v` (w bok), `r`, `speed`, `steer`, `slip`, `depth`.
- Na postoju tarcie spoczynkowe zeruje resztki prędkości (poniżej 2 cm/s).

## Ciąg w próżni (`space/thrust.js`)

`createThrust(def, { p, yaw, pitch })` → `{ state, step(dt, c), qRot }`; `def`: `mass`, `thrust` (silnik główny),
`reverse` (wsteczny), `torque` (silniczki manewrowe na oś), `inertia` (moment bezwładności).

- Bryła sztywna bez oporu i grawitacji: prędkość i obrót zostają, dopóki siła ich nie zmieni.
- Ciąg wzdłuż osi statku (`throttle` −1…1, ujemny — wsteczny); momenty silniczków (`pitch`, `yaw`, `roll` −1…1).
- Stabilizacja (jak SAS): bez polecenia obrotu silniczki dają moment przeciwny do obrotu, najwyżej `torque` —
  siła, nie zatrzymanie w kodzie; `stabilize: false` ją wyłącza.
- Stan: `p`, `v`, `q` ([w, x, y, z]), `w` (prędkość kątowa w układzie statku), `speed`, `thrust`.
- Układ statku: +z dziób, +y góra, +x lewa burta.

## Lądowanie (`land/lander.js`)

`createLander(def, { p, yaw, pitch })` → `{ state, step(dt, c, env), def }`; `landerDef(numbers, box)` — z liczb statku
(`SPACE_NUMBERS`) i obrysu modelu: cztery podpory w rogach spodu, CdA z przekroju, silniki podnośne 1,5 × ciężar na
Ziemi (założone).

- Siły: grawitacja m·g, silnik główny (+z statku), silniki podnośne (+y statku, 0…1), opór atmosfery ½ρ·CdA·|v|·v,
  podpory — sprężyna (ugięcie ok. 0,15 m pod ciężarem na Ziemi) z tłumikiem, tarcie μ·N, moment z ramienia; silniczki
  manewrowe ze stabilizacją jak w „ciągu w próżni”. Krok 1/240 s.
- `env`: `g`, `rho`, `ground(x, z)`; sterowanie `c`: `throttle`, `lift`, `pitch`, `yaw`, `roll`.
- Stan: `p`, `v`, `q`, `w`, `speed`, `vs`, `alt`, `onGround`, `crashed` (przyziemienie szybsze niż `crashSpeed`, 5 m/s).

## Orbita (`space/orbit.js`)

`createOrbit({ mu }, { rel, vel })` → `{ state, step(dt) }`; `orbitMu(r, period)` — μ = 4π²·r³ / T² (orbita kołowa
o promieniu r ma okres T; model, nie prawdziwa skala); `circularVelocity(rel, mu)` — prędkość orbity kołowej √(μ/r),
prostopadle do r i do pionu.

- Siła: grawitacja środka a = −μ·r / |r|³; całkowanie prędkością Verleta (krok 1/240 s) we współrzędnych względem środka
  — środek może się ruszać (księżyc wokół planety, która krąży wokół słońca).
- Prędkość startowa inna niż kołowa daje elipsę albo ucieczkę — z sił, bez toru w kodzie.
- Stan: `rel`, `vel`, `r`, `speed`, `period` (z energii: okres orbity eliptycznej, ∞ gdy ciało ucieka).

## Lot w atmosferze (`air/flight.js`)

`createFlight(def, mass, { p, yaw, pitch })` → `{ state, step(dt, c, groundH, wind), qRot }`; `def` — `info.flight`
modelu AirKit (np. [`../models/air/spitfire.md`](../models/air/spitfire.md), „Liczby lotu”).

- Bryła sztywna, 6 stopni swobody; siły aerodynamiczne z prędkości względem powietrza (nośna z kąta natarcia do
  przeciągnięcia, opór profilowy, indukowany, podwozia i klap, siła boczna ze ślizgu), ciąg śmigła z mocy, momenty
  stateczności, wzniosu, tłumienia i sterów; koła na sprężynach z tłumieniem, hamulce, kółko ogonowe skręcane sterem.
- Sterowanie `c`: `throttle` 0…1, `elevator`, `aileron`, `rudder` −1…1 (dodatnie: nos w górę, przechył w lewo, nos
  w lewo — +x to lewe skrzydło), `flaps` 0/1, `gear` 0/1, `brake` 0…1. `groundH(x, z)` — wysokość podłoża; `wind` — wiatr [x, y, z].
- Stan: `p`, `v`, `q` ([w, x, y, z]), `w`, `V`, `ias`, `alpha`, `beta`, `stall`, `onGround`, `gear`, `flap`, `crashed`
  (środek masy pod ziemią).
- Krok fizyki powinien być mały (w scenie 1/240 s, kilka kroków na klatkę).
- Układ ciała: +z przód, +x lewe skrzydło, +y w górę (jak modele AirKit).

## Koło na szynie (`rail/`)

Fizyka z aTrain przeniesiona bez zmian (`physics.js`): bryły sztywne pudeł i zestawów kołowych, kontakt koło–szyna,
sprężyny, zderzaki, sprzęgi; sieć torowa z rozjazdami: `js/models/structures/railway/network.js`.
`rail.js` — `attachRail(train, sim)` podpina symulację do składu TrainKit; `tram.js` — `createTramSim(track, info, s0)`
dla tramwaju TramKit (człony na wózkach i podwieszone) na torze z dowolnej ścieżki (`path.js`, `pathTrack`).
Szczegóły: [`../models/train/fizyka.md`](../models/train/fizyka.md). W edytorze sceny jeszcze nie: potrzebuje toru w scenie.

## Przeładowarka z chwytakiem (`land/grapple.js`)

Dla modelu JunkKit `vehicle/grapple-truck.js` (gra Złomowisko). W grze liczona silnikiem Rapier (`js/vehicle/truck.js`
w repo Trash); tu przepisana na fizykę GameLaboratory, z liczbami z gry:

- **jazda** — `land/drive.js` (`grappleDriveDef()`): 18 t, 26 kN przy ruszaniu (moc 65 kW na kołach), prędkość graniczna
  14 m/s (tyle daje 26 kN przy tłumieniu 0,1/s w Rapier), skręt przednich kół do 0,55 rad;
- **hydraulika** — nadwozie, wysięgnik i ramię sztywne (w grze kinematyczne), prędkości i zakresy siłowników z gry
  (obrót 0,5 rad/s, wysięgnik 0,35 rad/s w −0,25…1,25, ramię 0,45 rad/s w 0,6…2,6);
- **chwytak** — wahadło sferyczne pod końcem ramienia (przegub kulowy): Verlet z grawitacją, więz długości, tłumienie
  kątowe 3/s jak w grze; ruch końca ramienia rozbuja chwytak;
- **szczęki** — 4 zawiasy z silnikami położenia (sztywność / tłumienie z gry: 12 000 / 1 200 otwieranie, 60 000 / 3 000
  zamykanie), bezwładność szczęki 25 kg; koniec szczęki z kształtu jej zderzacza w grze (łuk R 0,95 m); kontakt sprężysty
  z tłumieniem z przedmiotem i z gruntem (krok 1/3840 s); przedmiot jest trzymany, dopóki tarcie μ·ΣN (μ 0,7) przenosi
  jego ciężar razem z przyspieszeniem chwytaka — inaczej wyślizguje się i spada;
- **ugięcie** — wysięgnik i ramię uginają się od momentu ładunku (podatność z gry, sprężyna 1,6 Hz z tłumieniem 0,12);
- **zawieszenie** — podwozie (14 t, jak ciało w grze) na 4 sprężynach kół z liczbami kontrolera Rapier z gry: sztywność
  60 i tłumienie 4,4 (ściskanie) / 2,3 (rozprężanie) razy masa podwozia, najwyżej 110 kN na koło, skok 0,32 m. Trzy
  stopnie swobody (unoszenie, pochylenie, przechył; bezwładność z zderzaczy podwozia): przeciwwaga 4 t i chwytak
  (700 kg) z ładunkiem w końcu ramienia (siły jak w grze, obracają się z nadwoziem) oraz siła bezwładności z
  przyspieszeń jazdy (1 m nad gruntem) przechylają maszynę; koło bez nacisku odrywa się;
- **przedmioty** — bryły sztywne wspólnego świata przedmiotów (`land/items.js`, niżej): zderzają się ze sobą, z pojazdem
  (zderzacze z gry: podwozie, nadwozie, wysięgnik, ramię, koła, głowica chwytaka — bryły ruchome z prędkością;
  głowica nie pcha tego, co ściska) i z gruntem, przewracają się i obracają od uderzeń; trzymany przedmiot porusza
  chwytak (półwymiary przedmiotu w układzie chwytaka — może leżeć przewrócony).

- **odrzut** — impulsy, które bryły pojazdu dały przedmiotom (świat przedmiotów zbiera je w `o.J`, `o.T`), wracają do
  pojazdu: prędkość wzdłuż i w bok (masa 18 t), obrót (bezwładność `Iz` jazdy), zawieszenie (pion, pochylenie,
  przechył); uderzenie w głowicę chwytaka popycha wahadło (chwytak 700 kg z ładunkiem);
- **ugięcie widać** — wysięgnik i ramię wyginają się w łuk jak w grze (shader części,
  `js/models/junkyard/vehicle/bow.js`; końce zostają na miejscu), a ugięcie obniża też kąty.

Uproszczenie względem gry: obrót chwytaka wokół pionu idzie za ramieniem.

`createGrapple(model, { x, z, yaw, ground, scene, items })` → `{ drive, arm, susp, jaws, items (świat), held, payload,
closed, step(dt, c), sync(), setJaws(), toggleJaws(), addItem({ mesh, mass, half, name, kind, at, rubber }), dispose() }`;
`c`: `throttle`, `steer`, `brake`, `slew`, `boom`, `stick` (−1…1). Bez `items` przeładowarka ma własny świat i liczy go
w `step`; ze wspólnym liczy się w jego krokach (`W.hook`), a świat liczy właściciel (raz na klatkę). `dispose()` odpina
ją od świata i przywraca model (edytor sceny po „Stop”).

## Przedmioty na lądzie (`land/items.js`)

Luźne przedmioty jako bryły sztywne — wspólne dla przeładowarki i maszyn złomowiska (w grze Złomowisko liczył to
Rapier): bryła z zderzacza gry (`halfExtents`, `shapeOf` w `js/models/junkyard/properties.js`) — **walec** dla opon
(pierścień: bezwładność pierścienia), beczek, puszek i garnków (graniastosłup o 16 ścianach bocznych dla dużych,
8 dla małych — toczy się po obwodzie), **prostopadłościan** dla reszty; masa i tensor bezwładności bryły, położenie,
obrót, prędkość i prędkość kątowa.

- **kontakty**: grunt (wierzchołki pod gruntem), bryły wypukłe ze sobą i z prostopadłościanami nieruchomymi (budowle,
  maszyny — `colliders()` modeli) i ruchomymi (pojazd, tłok, brama, tygiel): test SAT (normalne ścian i iloczyny
  krawędzi), punkty kontaktu — wierzchołki jednej bryły w drugiej; prostopadłościany w skali obiektu (edytor sceny)
  rosną z nią (`obbFrom` bierze skalę z macierzy);
- **rozwiązywanie**: impulsy sekwencyjne (8 przejść) z odbiciem 0,1, tarciem Coulomba (guma μ 0,9, reszta 0,55 — jak
  w grze, para: średnia geometryczna) i korektą położenia (Baumgarte 0,2, luz 2 mm); tłumienie jak w grze (0,05 / 0,15);
  krok 1/240 s; bryła w spoczynku przez 0,5 s zasypia (stos stoi), budzi ją to, co się rusza;
- **zgniatanie**: `setScale` — półwymiary maleją wzdłuż osi przedmiotu (masa bez zmian, jak w grze; zgnieciony walec
  jest eliptyczny);
- **odrzut**: bryły ruchome zbierają impulsy, które dały przedmiotom (`o.J`, moment `o.T` względem `o.c`, z poprzedniego
  kroku) — właściciel oddaje je sobie (przeładowarka).

Uproszczenia: walec to graniastosłup (toczy się z lekkim stukaniem ścian), opona jest walcem pełnym na zewnątrz (dziura
tylko w bezwładności).

`createItems({ ground })` → `W`: `add({ mesh, mass, half, shape, kind, at, q, rubber, anchor, meshScale, onRemove })`
(`shape`: `{ type: 'box' }` albo `{ type: 'cyl', hollow }`, oś walca — y przedmiotu),
`remove(it)`, `setScale(it, [sx, sy, sz])`, `statics(l)` / `addStatics(l)`, `kinematic(l)` / `addKinematic(l)` (bryły
ruchome z prędkością `v`; zwracają odpięcie), `hook(f)` — `f(h)` na początku każdego kroku (pojazdy i maszyny liczą się
w tym samym rytmie), `step(dt)`, `sync()`, `list`. OBB: `{ c, ax: [3 osie], e: [3 półwymiary], v, skip }`
(`obbFrom(macierz, środek, półwymiary, obrót)`).

## Maszyny złomowiska (`land/machines/`)

Z gry Złomowisko (`js/machines/` w repo Trash, z historią), przepisane z Rapier na świat przedmiotów; liczby i logika
maszyn z gry. Zasady gry (skup, ceny) zostają w grze. Właściwości przedmiotów (metal, temperatura topnienia, gęstość,
czas palenia, zgniatanie do innego modelu): `js/models/junkyard/properties.js` (z katalogu gry, bez cen).

- **zgniatarka** (`crusher.js`; do puszek — tłok poziomy 9 kN, prasa do metalu — płyta pionowa 400 kN): tłok i zasuwa /
  brama to bryły ruchome — pchają przedmioty. Gdy przedmioty zablokują drogę (stos wzdłuż osi tłoka dłuższy niż wolne
  miejsce w kolumnie przekroju 4 × 4), tłok zgniata najsłabszy przedmiot w tej kolumnie: opór = `info.crush` wzdłuż osi
  przedmiotu najbardziej zgodnej z osią tłoka × utwardzenie (rośnie do `info.minScale`); za mocny przedmiot zatrzymuje
  tłok — po chwili cofa się. Puszka zgnieciona o połowę staje się puszką zgniecioną. Zgniatarka do puszek potem otwiera
  zasuwę i wypycha puszki na zsyp.
- **piec na papier** (`furnace.js`): papier i tektura w strefie spalania płoną (gazety 40 s, karton 18 s), żarzą się
  i znikają; ogień i dym (`js/models/junkyard/fire.js`) rosną z tym, co płonie.
- **piec indukcyjny** (`induction.js`): przy zasilaniu metal w tyglu nagrzewa się (lżejszy szybciej), żarzy i topi
  (aluminium 660 °C, stal 1450 °C) do kąpieli (objętość z gęstości, skład); przechył tygla (bryły ruchome: dno
  i 12 wycinków ścianki) — gdy kąpiel sięga wylewu, metal wylewa się strumieniem.
- **linia odlewnicza** (`casting.js`, `metal-flow.js`): cząstki ciekłego metalu spływają rynną do formy; pełna forma
  przesuwa przenośnik; rozdzielacz kieruje metal do dużych albo małych form; metal stygnie i zastyga w sztabkę (wariant
  wg składu: ≥ 90 % aluminium, ≥ 90 % stali, mieszanka). Wygląd metalu: `js/models/junkyard/lava.js` (shader lawy).

`createMachine(id, root, { W, kit, scene, mod })` (`machines.js`) → `{ actions(), act(id, on), tilt(cmd), hud(pl), frame(dt),
dispose() }`; `connect(piec, linia)` — piec wylewa do linii (w grze linia 0,62 m przed piecem: `CASTING_FROM_INDUCTION`).
Maszyny liczą się w krokach świata przedmiotów (`W.hook`), wygląd (ogień, strumień) — w `frame`. Maszyna w skali
(edytor sceny) rośnie z nią: zderzacze, tłok, tygiel, objętość tygla i form (× S³), sztabki i ruch strumienia metalu.

## Ciecze i gaz w kosmosie (`space/liquids.js`, `space/gases.js`)

Z Hive Hunger (0.64.0), bez grawitacji, stałym krokiem `STEP` = 1/60 s (liczby w danych są na krok). Ciecz: krople
jednego rodzaju (woda, lawa) przyciągają się w zasięgu `reach` (spójność), odpychają bliżej niż `rest` i są tłumione
(`damping`) — zbijają się w pływające kule; sąsiedzi szukani w siatce `grid3d.js`, wygląd — shader `js/render/liquid.js`.
Gaz: kłęby dryfują, rosną i rozpływają się. Liczby rodzajów: BlockKit (`LIQUIDS`, `GAS`); opis:
[`../labs/blocks.md`](../labs/blocks.md).
