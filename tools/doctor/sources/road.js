// Model doctor — pojazdy drogowe (RoadKit, js/models/road): budowane bez scalania, każda część ma nazwę.
import { countDraw } from './common.js';
import { VEHICLE_IDS, vehicleInfo, buildVehicle } from '../../../js/models/road/roadkit.js';

export const models = VEHICLE_IDS.map((id) => ({
  id: 'road/' + id, label: vehicleInfo(id).name, sub: 'land · RoadKit', family: 'road',
  build: () => { const v = buildVehicle(id, {}); return { root: v.group, measured: countDraw(v.group), opts: {} }; },
}));
// wariant z opcjami: Abrams z reflektorem szperaczem
models.push({ id: 'road/abrams-searchlight', label: vehicleInfo('abrams').name + ' (reflektor)', sub: 'land · RoadKit', family: 'road',
  build: () => { const v = buildVehicle('abrams', { searchlight: true }); return { root: v.group, measured: countDraw(v.group), opts: {} }; } });
