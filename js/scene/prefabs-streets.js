// Prefabrykaty sceny — ulice (rodzina streets; StreetKit z Tornado.io, js/models/streets/): odcinki ulic i skrzyżowania
// z laboratorium ulic. Środek w punkcie obiektu, jezdnia wzdłuż osi x, nawierzchnia w y = 0 (stoi na płaskim gruncie).
import { buildStreet, buildCrossing, PROFILES } from '../models/streets/streetkit.js';

const S = [
  ['city', 'City street (60 m)', () => buildStreet([[-30, 0], [30, 0]], PROFILES.city)],
  ['avenue', 'Avenue (60 m)', () => buildStreet([[-30, 0], [30, 0]], PROFILES.avenue)],
  ['village', 'Country road (60 m)', () => buildStreet([[-30, 0], [30, 0]], PROFILES.village)],
  ['crossing', 'Crossing (4 arms)', () => buildCrossing('city', { arms: 4, arm: 30, corner: 6 })],
  ['crossing-t', 'Crossing (T)', () => buildCrossing('city', { arms: 3, arm: 30, corner: 6 })],
];

export function addStreetPrefabs(add) {
  for (const [id, label, make] of S) add('streets/' + id, label, 'streets', 'land', 'labs/streets.html', () => {
    const s = make();
    return { root: s.group, kit: s, dispose: () => s.group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }) };
  });
}
