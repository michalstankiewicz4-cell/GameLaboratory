// Scena jako dane: zwykły obiekt JSON, z którego silnik buduje świat. Z tych samych danych korzystają zapis,
// edytor sceny i (później) API dla AI. Bez Three.js: tylko format i operacje na nim.
//
// {
//   format: 'gamelab-scene', version: 1, name,
//   env: { surface: 'sea' | 'land', light: 'afternoon' | 'noon' | 'dusk' | 'overcast', look: '' | nazwa profilu },
//   objects: [{ id, name, prefab, pos: [x, y, z], rot: [x, y, z] (stopnie), scale }]
// }
// prefab: id z js/scene/prefabs.js; look: profil z laboratorium filtrów (gameLab.lookProfiles.v1), '' = zwykły obraz.

export const FORMAT = 'gamelab-scene', VERSION = 1;

export function emptyScene(name = 'New scene') {
  return { format: FORMAT, version: VERSION, name, env: { surface: 'sea', light: 'afternoon', look: '' }, objects: [] };
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
  }));
  return s;
}

export const clone = (s) => JSON.parse(JSON.stringify(s));
