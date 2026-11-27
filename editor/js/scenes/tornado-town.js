// Gotowa scena „Tornado z miastem”: skrzyżowanie i ulice (StreetKit) na płaskim gruncie, wokół domy z części (HouseKit,
// zachowanie „zniszczenie”, js/scene/destruct.js); pogoda — burza z tornadem, które startuje 400 m na zachód i idzie
// na wschód przez miasto (zasób „weather” dołączony do sceny, js/envs/sky/tornado.js: at, heading). Po ▶ Graj trąba
// przechodzi i budynki pękają tak, jak są zbudowane.
import { emptyScene, makeObject } from '../../../js/scene/scene-data.js';

export const TORNADO_WEATHER = 'Tornado over the town';
export const tornadoTownAssets = [{ kind: 'weather', name: TORNADO_WEATHER, data: { weather: 'storm', time: 16.5, tornado: { strength: 0.5, kind: 'land', at: [-400, 6], heading: 90 } } }];

// [prefab, x, z, obrót y w stopniach] — fronty domów do ulicy (HouseKit: front na +z)
const HOUSES = [
  ['houses/cottage', -22, -18, 0], ['houses/kostka', 22, -19, 0], ['houses/block', 62, -20, 0], ['houses/kostka', -60, -19, 0],
  ['houses/barn', -24, 21, 180], ['houses/garage', 14, 15, 180], ['houses/shed', 24, 14, 180], ['houses/cottage', -60, 18, 180], ['houses/cottage', 58, 18, 180],
];
const STREETS = [['streets/crossing', 0, 0, 0], ['streets/city', -69, 0, 0], ['streets/city', 69, 0, 0], ['streets/city', 0, -69, 90], ['streets/city', 0, 69, 90]];

export function tornadoTown(name) {
  const s = emptyScene(name);
  Object.assign(s.env, { surface: 'land', light: TORNADO_WEATHER });
  const seen = {};   // nazwy bez powtórzeń (lekarz sceny): cottage, cottage 2…
  for (const [p, x, z, r] of [...STREETS, ...HOUSES]) {
    const base = p.split('/')[1], n = (seen[base] = (seen[base] || 0) + 1);
    const o = makeObject(p, n > 1 ? `${base} ${n}` : base, [x, 0, z]); o.rot = [0, r, 0]; s.objects.push(o);
  }
  return s;
}
