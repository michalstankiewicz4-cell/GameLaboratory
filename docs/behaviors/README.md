# Zachowania (`js/behaviors/`)

Zachowanie to napęd i ruch modelu w jednym środowisku: sama fizyka, bez sceny i bez interfejsu. Każdy plik deklaruje
środowiska, w których działa (`ENVIRONMENTS`). Model nie wie o zachowaniu: zachowanie liczy stan, a podpięcie
(w scenie: `js/scene/behaviors.js`, [`../scene/README.md`](../scene/README.md)) ustawia z niego model.
Zasada (CLAUDE.md): fizyka jest prawdziwa — start, ruch, skręt i zatrzymanie wynikają z sił, nic nie jest „przyklejone”.

| Zachowanie | Plik | Środowisko | Gdzie używane |
|---|---|---|---|
| okręt na wodzie | `water/ship.js` | woda | edytor sceny (okręty), gra CityExplorer |
| lot w atmosferze | `air/flight.js` | ląd (powietrze nad lądem) | edytor sceny (Spitfire) |
| koło na szynie — skład | `rail/physics.js`, `rail/rail.js` | ląd | laboratorium pojazdów — ląd (pociąg) |
| koło na szynie — tramwaj | `rail/tram.js`, `rail/path.js` | ląd | jeszcze nigdzie (liczby w TramKit: `js/models/train/trams/swing.js`, `phys`) |

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

## Lot w atmosferze (`air/flight.js`)

`createFlight(def, mass, { p, yaw, pitch })` → `{ state, step(dt, c, groundH, wind), qRot }`; `def` — `info.flight`
modelu AirKit (np. [`../models/air/spitfire.md`](../models/air/spitfire.md), „Liczby lotu”).

- Bryła sztywna, 6 stopni swobody; siły aerodynamiczne z prędkości względem powietrza (nośna z kąta natarcia do
  przeciągnięcia, opór profilowy, indukowany, podwozia i klap, siła boczna ze ślizgu), ciąg śmigła z mocy, momenty
  stateczności, wzniosu, tłumienia i sterów; koła na sprężynach z tłumieniem, hamulce, kółko ogonowe skręcane sterem.
- Sterowanie `c`: `throttle` 0…1, `elevator`, `aileron`, `rudder` −1…1 (dodatnie: nos w górę, przechył w prawo, nos
  w prawo), `flaps` 0/1, `gear` 0/1, `brake` 0…1. `groundH(x, z)` — wysokość podłoża; `wind` — wiatr [x, y, z].
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
