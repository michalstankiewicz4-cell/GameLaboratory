// Scena jako dane: zwykły obiekt JSON, z którego silnik buduje świat. Z tych samych danych korzystają zapis,
// edytor sceny i (później) API dla AI. Bez Three.js: tylko format i operacje na nim.
//
// {
//   format: 'gamelab-scene', version: 1, name,
//   env: { surface: 'sea' | 'land' | 'space', light: 'afternoon' | 'noon' | 'dusk' | 'overcast' | nazwa zasobu „weather”, look: '' | nazwa profilu,
//          land: '' | nazwa zasobu „ląd” (teren z laboratorium lądu; '' — płaski grunt),
//          sea: '' | nazwa zasobu „morze” (js/scene/assets.js; '' — morze domyślne),
//          sky: '' | 'day' | 'preset:<id>' | nazwa zasobu „niebo” (każda powierzchnia; '' — domyślne: morze i ląd —
//          dzienne, kosmos — Deep field; js/scene/space.js) },
//   objects: [{ id, name, prefab, pos: [x, y, z], rot: [x, y, z] (stopnie), scale, behavior?, orbit? { around, period } }]
// }
// prefab: id z js/scene/prefabs.js; behavior: id z js/scene/behaviors.js, '' = bez zachowania, brak pola = domyślne
// dla prefabrykatu; look: wygląd kamery — zasób „look” z laboratorium filtrów (js/scene/assets.js), '' = zwykły obraz.

export const FORMAT = 'gamelab-scene', VERSION = 1;

export function emptyScene(name = 'New scene') {
  return { format: FORMAT, version: VERSION, name, env: { surface: 'sea', light: 'afternoon', look: '', sea: '', sky: '', land: '' }, objects: [] };
}

let seq = 0;
export const newId = () => 'o' + Date.now().toString(36) + (seq++).toString(36);

export function makeObject(prefab, name, pos = [0, 0, 0]) {
  return { id: newId(), name: name || prefab, prefab, pos: pos.slice(), rot: [0, 0, 0], scale: 1 };
}

// sprawdza i uzupełnia dane z pliku lub z pamięci przeglądarki; zwraca poprawną scenę albo rzuca błąd
export function normalize(d) {
  if (!d || typeof d !== 'object' || d.format !== FORMAT) throw new Error('Not a GameLaboratory scene (format: ' + FORMAT + ').');
  const s = emptyScene(String(d.name || 'Scene'));
  Object.assign(s.env, d.env || {});
  const num3 = (a, def) => (Array.isArray(a) && a.length === 3 && a.every((v) => Number.isFinite(+v)) ? a.map(Number) : def.slice());
  s.objects = (Array.isArray(d.objects) ? d.objects : []).filter((o) => o && typeof o.prefab === 'string').map((o) => ({
    id: String(o.id || newId()), name: String(o.name || o.prefab), prefab: o.prefab,
    pos: num3(o.pos, [0, 0, 0]), rot: num3(o.rot, [0, 0, 0]), scale: Number.isFinite(+o.scale) && +o.scale > 0 ? +o.scale : 1,
    ...(typeof o.behavior === 'string' ? { behavior: o.behavior } : {}),
    ...(o.orbit && typeof o.orbit === 'object' ? { orbit: { ...(typeof o.orbit.around === 'string' ? { around: o.orbit.around } : {}), ...(+o.orbit.period > 0 ? { period: +o.orbit.period } : {}) } } : {}),
  }));
  return s;
}

export const clone = (s) => JSON.parse(JSON.stringify(s));
