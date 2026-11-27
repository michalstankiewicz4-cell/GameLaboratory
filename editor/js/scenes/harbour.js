// Gotowa scena „Port” (nasza testowa; także pierwsza scena, gdy pamięć przeglądarki jest pusta): dwa okręty na morzu.
import { emptyScene, makeObject } from '../../../js/scene/scene-data.js';

export function harbour(name) {
  const s = emptyScene(name);
  s.objects.push(makeObject('sea/blyskawica', 'ORP Błyskawica', [0, 0, 0]));
  const b = makeObject('sea/orzel', 'ORP Orzeł', [45, 0, -30]); b.rot = [0, 20, 0]; s.objects.push(b);
  return s;
}
