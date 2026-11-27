// Gotowa scena „Układ silnika”: maszyna z laboratorium mechaniki (silnik, sprzęgła, zębatki, łańcuch, pas, przeguby,
// przekładnia planetarna, hamulec) z instalacją elektryczną i regulatorem, na płaskim gruncie, popołudnie. W ▶ Graj
// fizyka i obwód (js/scene/mechanics.js): załącz zasilanie X0 i wyłącznik główny Q1, START, przełącznik S3 na I,
// pokrętło potencjometru — silnik rusza; myszą na modelach.
import { emptyScene, makeObject } from '../../../js/scene/scene-data.js';

export function engine(name) {
  const s = emptyScene(name);
  Object.assign(s.env, { surface: 'land', light: 'afternoon' });
  s.objects.push(makeObject('mech/machine', 'Engine layout', [0, 0, 0]));
  return s;
}
