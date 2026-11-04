// Model doctor — statki powietrzne (AirKit, js/models/air): budowane bez scalania, każda część ma nazwę.
import { countDraw } from './common.js';
import { AIRCRAFT_IDS, aircraftInfo, buildAircraft } from '../../../js/models/air/airkit.js';

export const models = AIRCRAFT_IDS.map((id) => ({
  id: 'air/' + id, label: aircraftInfo(id).name, sub: 'land · AirKit', family: 'air',
  build: () => { const v = buildAircraft(id, {}); return { root: v.group, measured: countDraw(v.group), opts: {} }; },
}));
