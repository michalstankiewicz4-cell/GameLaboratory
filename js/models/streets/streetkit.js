// StreetKit — ulice, chodniki i inne trasy z przekroju prowadzonego po linii (metry, y w górę). Przekrój (profil)
// to pasy od osi na zewnątrz: jezdnia (pasy ruchu), krawężnik, chodnik, pas zieleni — albo pobocze z kruszywa przy
// drodze wiejskiej, albo sama ścieżka. Nawierzchnie z MatKit (asfalt, kostka, płyty, kruszywo, granit krawężnika),
// oznakowanie poziome z farby (linie, przerywane, przejście dla pieszych, linie zatrzymania).
//   PROFILES                         gotowe przekroje: city (ulica miejska), avenue (dwie jezdnie z pasem), village (droga
//                                    wiejska), path (ścieżka), cycle (droga dla rowerów z chodnikiem)
//   buildStreet(points, profile, { closed }) → { group, length }    ulica po linii punktów [[x, z], …] (krzywa Catmulla–Roma)
//   buildCrossing(profile, { arms, corner }) → { group }            skrzyżowanie: 3 albo 4 wloty, łuki krawężników, przejścia
//   SURFACES                         nawierzchnie (opisy MatKit)
// Części (z Tornado.io, podzielone na pliki): surfaces.js (nawierzchnie, przekroje), geom.js (geometria tras),
// street.js (ulica, skrzyżowanie), signals.js, lamps.js, signs.js, viaduct.js, furniture.js (słupki, barierki, ekrany),
// mileposts.js, parking.js, tunnels.js (tunele, rampa), footbridge.js, subway.js. Opis: docs/models/streets.md.
export { PROFILES, SLABS, SURFACES, surface } from './surfaces.js';
export { alongStreet, buildCrossing, buildStreet } from './street.js';
export { SIGNAL_STATES, SIGNAL_TIMES, buildTrafficLight, signalAt } from './signals.js';
export { LAMPS, buildLamp } from './lamps.js';
export { SIGNS, buildSign } from './signs.js';
export { VIADUCT_PROFILE, buildViaduct } from './viaduct.js';
export { BOLLARDS, NOISE, RAILS, buildBollards, buildNoiseWall, buildRail } from './furniture.js';
export { buildMilepost, buildMileposts } from './mileposts.js';
export { PARKING, buildParking, wheelchair } from './parking.js';
export { TUNNEL_BOX_PROFILE, TUNNEL_PROFILE, buildTrough, buildTunnel, tunnelArch } from './tunnels.js';
export { buildFootbridge } from './footbridge.js';
export { buildSubway } from './subway.js';
