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
| lot w atmosferze | `air/flight.js` | ląd (powietrze nad lądem) | edytor sceny (Spitfire) |
| koło na szynie — skład | `rail/physics.js`, `rail/rail.js` | ląd | laboratorium pojazdów — ląd (pociąg) |
| koło na szynie — tramwaj | `rail/tram.js`, `rail/path.js` | ląd | laboratorium pojazdów — ląd (Swing na pętli toru; liczby w TramKit: `js/models/train/trams/swing.js`, `phys`) |

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
