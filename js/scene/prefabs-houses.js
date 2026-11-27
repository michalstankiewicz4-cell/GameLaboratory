// Prefabrykaty sceny — budynki z części (rodzina houses; z Tornado.io): lista z js/models/houses/catalog.js (ta sama co
// w trybie Destruction laboratorium miasta) — domy HouseKit i budynki Warszawy z części. Wygląd przed zniszczeniem:
// HouseKit — części scalone po materiale (houseModel), Warszawa — budynek CityKit z laboratorium miasta (ten sam co
// rodzina city). kit.house — części dla zachowania „zniszczenie” (js/scene/destruct.js); budynki Warszawy liczą części
// dopiero przy pierwszym użyciu (tysiące części). Obrys wyśrodkowany w punkcie obiektu, podstawa w y = 0; HouseKit front
// na +z. id prefabrykatu: houses/<rodzaj> albo houses/lm-<budynek z mapy>.
import { HOUSES, buildHouse } from '../models/houses/catalog.js';
import { build as buildCity } from '../models/city/citykit.js';
import { houseModel } from '../models/houses/house-model.js';

export function addHousePrefabs(add) {
  for (const [id, h] of Object.entries(HOUSES)) {
    const lm = id.startsWith('lm:') ? id.slice(3) : null;
    if (!lm) add('houses/' + id, h.name, 'houses', 'land', 'labs/city.html', () => {
      const house = buildHouse(id, { seed: 1 }), root = houseModel(house);
      return { root, kit: { house }, dispose: () => root.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }) };
    });
    else add('houses/lm-' + lm, h.name, 'houses', 'land', 'labs/city.html', (o) => {
      const b = buildCity({ landmark: lm }, { detail: (o && o.detail) || 1 }); let house = null;
      return { root: b.group, kit: { get house() { return house || (house = buildHouse(id)); } }, dispose: () => b.dispose() };
    }, { lod: true });
  }
}
