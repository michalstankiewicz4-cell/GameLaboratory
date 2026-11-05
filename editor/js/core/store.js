// Stan edytora: scena jako dane (js/scene/scene-data.js) i wybrany obiekt. Jedyne źródło prawdy: okna, świat 3D
// i uchwyt tylko czytają stąd i zmieniają przez te funkcje. Każda zmiana woła słuchaczy z rodzajem zmiany:
//   'scene'  — cała scena nowa (nowa, z pliku)     'objects' — dodano / usunięto / zmieniono model
//   'place'  — położenie, obrót, skala, nazwa      'env'     — środowisko      'select' — wybór
// Scena zapisuje się sama w tej przeglądarce (gameLab.scene.v1) chwilę po każdej zmianie.
import { emptyScene, makeObject, normalize, clone, newId } from '../../../js/scene/scene-data.js';

const KEY = 'gameLab.scene.v1';

export function createStore(firstScene) {
  let S = null, sel = null, saveT = 0;
  try { S = normalize(JSON.parse(localStorage.getItem(KEY))); } catch { S = null; }
  if (!S) S = firstScene();
  const subs = new Set();
  const emit = (what) => { subs.forEach((f) => f(what)); if (what !== 'select') persist(); };
  const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* pełne albo zablokowane */ } }, 300); };
  const find = (id) => S.objects.find((o) => o.id === id) || null;

  return {
    get scene() { return S; },
    get selected() { return sel ? find(sel) : null; },
    get selectedId() { return sel; },
    find,
    on(f) { subs.add(f); return () => subs.delete(f); },
    // cała scena (nowa albo z pliku): sprawdzona przez normalize
    load(data) { S = normalize(data); sel = null; emit('scene'); },
    reset(name) { S = emptyScene(name); sel = null; emit('scene'); },
    select(id) { sel = id && find(id) ? id : null; emit('select'); },
    add(prefabId, name, pos) { const o = makeObject(prefabId, name, pos); S.objects.push(o); sel = o.id; emit('objects'); return o; },
    duplicate(id, name, offset) {
      const o = find(id); if (!o) return null;
      const c = clone(o); c.id = newId(); c.name = name; c.pos = [o.pos[0] + offset, o.pos[1], o.pos[2] + offset];
      S.objects.push(c); sel = c.id; emit('objects'); return c;
    },
    remove(id) { S.objects = S.objects.filter((o) => o.id !== id); if (sel === id) sel = null; emit('objects'); },
    // patch: { name, prefab, pos, rot, scale }; zmiana modelu to 'objects' (trzeba go zbudować), reszta 'place'
    update(id, patch) {
      const o = find(id); if (!o) return;
      const rebuild = patch.prefab && patch.prefab !== o.prefab;
      Object.assign(o, patch); if (!(o.scale > 0)) o.scale = 1;
      emit(rebuild ? 'objects' : 'place');
    },
    setEnv(patch) { Object.assign(S.env, patch); emit('env'); },
  };
}
