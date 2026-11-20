// Model doctor — budynki miasta (CityKit, js/models/city): każdy rodzaj z gotowego opisu, wersja bliska (siatki
// zgrupowane po materiale: mur, ramy, szyby, drzwi, płyty i balustrady balkonów, dach) i budynki Warszawy z mapy.
import { countDraw } from './common.js';
import { TYPES, TYPE_IDS, buildBuilding, build, LANDMARK_IDS, landmarkInfo } from '../../../js/models/city/citykit.js';

export const models = TYPE_IDS.map((id) => ({
  id: 'city/' + id, label: TYPES[id].label, sub: 'land · CityKit', family: 'city',
  build: () => { const b = buildBuilding({ type: id }, { detail: 1 }); b.group.updateMatrixWorld(true); return { root: b.group, measured: countDraw(b.group), opts: { planeEps: 0.01 } }; },   // jedna płaszczyzna: do 1 cm (budynek ma 10–115 m, a ramy i drzwi leżą 3–7 cm od ościeży)
}));
// budynki Warszawy z OpenStreetMap (bryła z mapy, wygląd CityKit), wersja bliska — części scalone po materiale
models.push(...LANDMARK_IDS.map((id) => ({
  id: 'city/osm-' + id, label: landmarkInfo(id).name, sub: 'land · CityKit · OpenStreetMap', family: 'city',
  build: () => { const b = build({ landmark: id }, { detail: 1 }); b.group.updateMatrixWorld(true); return { root: b.group, measured: countDraw(b.group), opts: { planeEps: 0.01 } }; },
})));
