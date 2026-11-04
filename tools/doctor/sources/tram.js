// Model doctor — tramwaje (TramKit, js/models/train/trams): budowane bez scalania, każda część ma nazwę.
import { countDraw } from './common.js';
import { TRAM_IDS, tramInfo, buildTram } from '../../../js/models/train/trams/tramkit.js';

export const models = TRAM_IDS.map((id) => ({
  id: 'tram/' + id, label: tramInfo(id).name, sub: 'land · TramKit', family: 'tram',
  build: () => { const v = buildTram(id, {}); return { root: v.group, measured: countDraw(v.group), opts: {} }; },
}));
