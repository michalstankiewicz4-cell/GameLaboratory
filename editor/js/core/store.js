// Stan edytora: scena jako dane (js/scene/scene-data.js) i wybrany obiekt. Jedyne źródło prawdy: okna, świat 3D
// i uchwyt tylko czytają stąd i zmieniają przez te funkcje. Każda zmiana woła słuchaczy z rodzajem zmiany:
//   'scene'  — cała scena nowa (nowa, z pliku)     'objects' — dodano / usunięto / zmieniono model
//   'place'  — położenie, obrót, skala, nazwa      'env'     — środowisko      'select' — wybór
// Scena zapisuje się sama w tej przeglądarce (gameLab.scene.v1) chwilę po każdej zmianie.
// Cofnij / ponów: przed każdą zmianą danych zapamiętany stan sceny (do 100 kroków, tylko w pamięci karty). Kolejne
// zmiany tego samego pola tego samego obiektu w krótkim czasie (pisanie w polu, ciągnięcie uchwytu) to jeden krok;
// seal() zamyka krok (początek przeciągania uchwytu), group(fn) — kilka zmian jako jeden krok (lista poleceń API).
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
  // historia: stany sceny (JSON) przed zmianą
  const past = [], future = [], MAX = 100, MERGE_MS = 800;
  let lastKey = null, lastT = 0, inGroup = 0;
  function record(key) {
    if (inGroup) return;
    const now = performance.now();
    if (key && key === lastKey && now - lastT < MERGE_MS) { lastT = now; return; }
    past.push(JSON.stringify(S)); if (past.length > MAX) past.shift();
    future.length = 0; lastKey = key; lastT = now;
  }
  function travel(from, to) {
    if (!from.length) return false;
    to.push(JSON.stringify(S)); S = JSON.parse(from.pop());
    if (sel && !find(sel)) sel = null;
    lastKey = null; emit('scene'); return true;
  }

  return {
    get scene() { return S; },
    get selected() { return sel ? find(sel) : null; },
    get selectedId() { return sel; },
    find,
    undo: () => travel(past, future),
    redo: () => travel(future, past),
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    seal() { lastKey = null; },
    group(fn) { record(null); inGroup++; try { return fn(); } finally { inGroup--; lastKey = null; } },
    on(f) { subs.add(f); return () => subs.delete(f); },
    // cała scena (nowa albo z pliku): sprawdzona przez normalize
    load(data) { const n = normalize(data); record(null); S = n; sel = null; emit('scene'); },
    reset(name) { record(null); S = emptyScene(name); sel = null; emit('scene'); },
    select(id) { sel = id && find(id) ? id : null; emit('select'); },
    add(prefabId, name, pos) { record(null); const o = makeObject(prefabId, name, pos); S.objects.push(o); sel = o.id; emit('objects'); return o; },
    duplicate(id, name, offset) {
      const o = find(id); if (!o) return null;
      record(null); const c = clone(o); c.id = newId(); c.name = name; c.pos = [o.pos[0] + offset, o.pos[1], o.pos[2] + offset];
      S.objects.push(c); sel = c.id; emit('objects'); return c;
    },
    remove(id) { if (!find(id)) return; record(null); S.objects = S.objects.filter((o) => o.id !== id); if (sel === id) sel = null; emit('objects'); },
    // patch: { name, prefab, pos, rot, scale, behavior, asset }; zmiana modelu albo zasobu to 'objects' (trzeba go
    // zbudować), reszta 'place'; asset '' — bez zasobu (model domyślny prefabrykatu)
    update(id, patch) {
      const o = find(id); if (!o) return;
      record('u:' + id + ':' + Object.keys(patch).sort().join());
      const rebuild = (patch.prefab && patch.prefab !== o.prefab) || (patch.asset !== undefined && (patch.asset || '') !== (o.asset || ''));
      Object.assign(o, patch); if (!(o.scale > 0)) o.scale = 1;
      if (!o.asset) delete o.asset;
      emit(rebuild ? 'objects' : 'place');
    },
    setEnv(patch) { record('env:' + Object.keys(patch).sort().join()); Object.assign(S.env, patch); emit('env'); },
  };
}
