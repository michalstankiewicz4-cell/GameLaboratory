// API sceny (dla AI i dla ludzi): polecenia JSON na scenie jako danych. Silnik, bez Three.js — działa na tym samym
// stanie co edytor (store: jedyne źródło prawdy), więc wszystko, co zrobi polecenie, widać od razu w oknach i w 3D.
//
// Polecenie: { "cmd": "…", …argumenty } albo lista poleceń (wykonane po kolei, wynik — lista wyników).
// Wynik: { ok: true, … } albo { ok: false, error: "…" }. Pełna lista: { "cmd": "help" }.
// Obiekt wskazuje się przez "id" albo "name" (nazwa bez rozróżniania wielkości liter, musi być jednoznaczna).
//
// createSceneApi({ store, prefabs, behaviorsFor, lights, hooks }):
//   store        — stan sceny (editor/js/core/store.js: scene, add, update, remove, select, setEnv, load, reset)
//   prefabs      — [{ id, label, family, surface }] (z js/scene/prefabs.js, bez budowania)
//   behaviorsFor — (prefabId) → [id zachowań] (js/scene/behaviors.js)
//   lights       — dozwolone oświetlenia (['afternoon', …])
//   hooks        — { build(fn) — zmiana, po której trzeba zbudować modele; play(), stop(), playing() } (nieobowiązkowe)
import { normalize, clone } from './scene-data.js';

const COMMANDS = {
  help: { args: '', does: 'this list' },
  describe: { args: '', does: 'the whole scene as data (format gamelab-scene) and a short summary' },
  prefabs: { args: '[family]', does: 'the models that can be added: id, name, family, where it stands, behaviours' },
  add: { args: 'prefab, [name], [pos [x,y,z] m], [rot [pitch,heading,roll] °], [scale], [behavior]', does: 'adds a model; returns its id' },
  set: { args: 'id | name, then any of: newName (with id also name), prefab, pos, rot, scale, behavior', does: 'changes an object' },
  move: { args: 'id | name, by [dx,dy,dz] m', does: 'moves an object by an offset' },
  remove: { args: 'id | name', does: 'removes an object' },
  env: { args: 'any of: surface (sea | land), light, look', does: 'changes the environment' },
  select: { args: 'id | name, or nothing', does: 'selects an object in the editor (nothing: the environment)' },
  new: { args: '[name]', does: 'an empty scene' },
  load: { args: 'scene (format gamelab-scene)', does: 'replaces the whole scene' },
  play: { args: '', does: 'runs the behaviours (like ▶ Play)' },
  stop: { args: '', does: 'back to editing' },
};
const MUTATING = new Set(['add', 'set', 'move', 'remove', 'env', 'new', 'load']);

export function createSceneApi({ store, prefabs, behaviorsFor = () => [], lights = [], hooks = {} }) {
  const build = hooks.build || ((fn) => fn());
  const fail = (error) => { throw new Error(error); };
  const prefabOf = (id) => prefabs.find((p) => p.id === id) || fail(`unknown prefab "${id}" (see {"cmd":"prefabs"})`);
  const vec3 = (v, what) => (Array.isArray(v) && v.length === 3 && v.every((x) => Number.isFinite(+x)) ? v.map(Number) : fail(`${what} must be [x, y, z] numbers`));
  const num = (v, what) => (Number.isFinite(+v) ? +v : fail(`${what} must be a number`));
  function target(c) {
    const S = store.scene;
    if (c.id != null) return S.objects.find((o) => o.id === String(c.id)) || fail(`no object with id "${c.id}"`);
    if (c.name != null) {
      const n = String(c.name).toLowerCase(), all = S.objects.filter((o) => o.name.toLowerCase() === n);
      if (all.length > 1) fail(`${all.length} objects are named "${c.name}": use the id`);
      return all[0] || fail(`no object named "${c.name}"`);
    }
    return fail('give the object: "id" or "name"');
  }
  function behavior(prefabId, b) {
    if (b == null) return undefined;
    const fit = behaviorsFor(prefabId);
    if (b !== '' && !fit.includes(b)) fail(`behaviour "${b}" does not fit ${prefabId} (fits: ${fit.join(', ') || 'none'}; "" — none)`);
    return String(b);
  }
  // pola obiektu z polecenia (tylko podane); obj — obiekt zmieniany (dla prefabrykatu i zachowania)
  function patch(c, prefabId) {
    const p = {};
    if (c.newName != null) p.name = String(c.newName).slice(0, 60);
    if (c.pos != null) p.pos = vec3(c.pos, 'pos');
    if (c.rot != null) p.rot = vec3(c.rot, 'rot');
    if (c.scale != null) { p.scale = num(c.scale, 'scale'); if (!(p.scale > 0)) fail('scale must be > 0'); }
    const b = behavior(prefabId, c.behavior); if (b !== undefined) p.behavior = b;
    return p;
  }
  const summary = (o) => ({ id: o.id, name: o.name, prefab: o.prefab, pos: o.pos, rot: o.rot, scale: o.scale, ...(o.behavior != null ? { behavior: o.behavior } : {}) });

  const run1 = {
    help: () => ({ commands: COMMANDS, notes: 'Units: metres, degrees. Y is up; heading 0 looks along +Z. An object is named by "id" or "name". A list of commands runs in order.' }),
    describe: () => {
      const S = store.scene;
      return { scene: clone(S), summary: `${S.name}: ${S.env.surface}, ${S.env.light}${S.env.look ? ', look ' + S.env.look : ''}; ${S.objects.length} object(s)${hooks.playing && hooks.playing() ? '; playing' : ''}` };
    },
    prefabs: (c) => ({ prefabs: prefabs.filter((p) => !c.family || p.family === c.family).map((p) => ({ id: p.id, name: p.label, family: p.family, stands: p.surface, behaviors: behaviorsFor(p.id) })) }),
    add: (c) => {
      const p = prefabOf(c.prefab), x = patch({ ...c, newName: null }, p.id);
      const pos = x.pos || [0, p.surface === 'air' ? 30 : 0, 0];
      let o; build(() => { o = store.add(p.id, c.name != null ? String(c.name).slice(0, 60) : p.label, pos); delete x.pos; if (Object.keys(x).length) store.update(o.id, x); });
      return { id: o.id, object: summary(o) };
    },
    set: (c) => {
      const o = target(c), pf = c.prefab != null ? prefabOf(c.prefab).id : o.prefab;
      const x = patch({ ...c, newName: c.newName ?? (c.id != null ? c.name : undefined) }, pf);   // z id: "name" to nowa nazwa
      if (pf !== o.prefab) x.prefab = pf;
      if (!Object.keys(x).length) fail('nothing to change');
      build(() => store.update(o.id, x));
      return { object: summary(o) };
    },
    move: (c) => { const o = target(c), d = vec3(c.by, 'by'); store.update(o.id, { pos: o.pos.map((v, i) => +(v + d[i]).toFixed(3)) }); return { object: summary(o) }; },
    remove: (c) => { const o = target(c); store.remove(o.id); return { removed: o.id }; },
    env: (c) => {
      const e = {};
      if (c.surface != null) e.surface = ['sea', 'land'].includes(c.surface) ? c.surface : fail('surface: sea | land');
      if (c.light != null) e.light = lights.includes(c.light) ? c.light : fail('light: ' + lights.join(' | '));
      if (c.look != null) e.look = String(c.look);
      if (!Object.keys(e).length) fail('nothing to change (surface, light, look)');
      store.setEnv(e); return { env: clone(store.scene.env) };
    },
    select: (c) => { const o = c.id == null && c.name == null ? null : target(c); store.select(o ? o.id : null); return { selected: o ? o.id : null }; },
    new: (c) => { store.reset(String(c.name || 'New scene')); return { scene: store.scene.name }; },
    load: (c) => { const s = normalize(c.scene); build(() => store.load(s)); return { objects: s.objects.length }; },
    play: () => { if (!hooks.play) fail('play is not available here'); hooks.play(); return { playing: !!(hooks.playing && hooks.playing()) }; },
    stop: () => { if (hooks.stop) hooks.stop(); return { playing: false }; },
  };

  function exec(c) {
    try {
      if (!c || typeof c !== 'object' || Array.isArray(c)) fail('a command is an object: {"cmd": "…"}');
      const f = run1[c.cmd]; if (!f) fail(`unknown command "${c.cmd}" (see {"cmd":"help"})`);
      if (MUTATING.has(c.cmd) && hooks.playing && hooks.playing()) fail('the scene is playing: {"cmd":"stop"} first');
      return { ok: true, cmd: c.cmd, ...f(c) };
    } catch (e) { return { ok: false, cmd: c && c.cmd, error: e.message }; }
  }
  // run(polecenie | lista | tekst JSON) → wynik | lista wyników
  function run(input) {
    if (typeof input === 'string') { try { input = JSON.parse(input); } catch (e) { return { ok: false, error: 'not JSON: ' + e.message }; } }
    return Array.isArray(input) ? input.map(exec) : exec(input);
  }
  return { run, commands: COMMANDS };
}
