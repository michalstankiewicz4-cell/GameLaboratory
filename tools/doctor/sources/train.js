// Model doctor — rail vehicles (TrainKit, js/models/train): each body with the coupler ends it has in the default
// train. TrainKit builds unmerged, so every finding names a part.
import { countDraw } from './common.js';
import { BODIES, DEFAULT_TRAIN, buildVehicle } from '../../../js/models/train/trainkit.js';

export const models = DEFAULT_TRAIN.map((c) => ({
  id: 'train/' + c.body, label: BODIES[c.body].name, sub: 'land · TrainKit', family: 'train',
  build: () => { const root = buildVehicle(c.body, { ...c, lights: false }); return { root, measured: countDraw(root), opts: {} }; },
}));
