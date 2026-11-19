// Model doctor — złomowisko (JunkKit, js/models/junkyard, z gry Złomowisko): przedmioty, maszyny, otoczenie i pojazd,
// budowane bez scalania (każda część ma nazwę), LOD 0; ustawienia doktora z info.doctor modelu (jak w tools/doctor.mjs gry).
import { countDraw } from './common.js';
import { MODELS } from '../../../js/models/junkyard/registry.js';

const mods = await Promise.all(MODELS.map((m) => m.load()));
export const models = MODELS.map((m, i) => ({
  id: 'junkyard/' + m.id, label: m.name, sub: `land · JunkKit · ${m.group}`, family: 'junkyard',
  build: () => { const root = mods[i].build(0); root.updateMatrixWorld(true); return { root, measured: countDraw(root), opts: mods[i].info?.doctor || {} }; },
}));
