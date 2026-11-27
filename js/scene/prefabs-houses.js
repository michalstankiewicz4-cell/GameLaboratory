// Prefabrykaty sceny — budynki z części (rodzina houses; z Tornado.io): domy HouseKit (js/models/houses/housekit.js)
// i budynki Warszawy z części (landmark-house.js). Wygląd przed zniszczeniem: HouseKit — części scalone po materiale
// (js/scene/destruct.js, houseModel), Warszawa — budynek CityKit z laboratorium miasta (ten sam co rodzina city).
// kit.house — części dla zachowania „zniszczenie” (js/scene/destruct.js); budynki Warszawy liczą części dopiero przy
// pierwszym użyciu (tysiące części). Obrys wyśrodkowany w punkcie obiektu, podstawa w y = 0; HouseKit front na +z.
import { HOUSE_IDS, HOUSE_TYPES, buildHouse } from '../models/houses/housekit.js';
import { LANDMARKS, landmarkHouse } from '../models/houses/landmark-house.js';
import { build as buildCity } from '../models/city/citykit.js';
import { houseModel } from './destruct.js';

export function addHousePrefabs(add) {
  for (const id of HOUSE_IDS) add('houses/' + id, HOUSE_TYPES[id].name, 'houses', 'land', 'labs/city.html', () => {
    const house = buildHouse(id, { seed: 1 }), root = houseModel(house);
    return { root, kit: { house }, dispose: () => root.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }) };
  });
  for (const id of Object.keys(LANDMARKS)) add('houses/lm-' + id, 'Warszawa: ' + LANDMARKS[id], 'houses', 'land', 'labs/city.html', (o) => {
    const b = buildCity({ landmark: id }, { detail: (o && o.detail) || 1 }); let house = null;
    return { root: b.group, kit: { get house() { return house || (house = landmarkHouse(id)); } }, dispose: () => b.dispose() };
  }, { lod: true });
}
