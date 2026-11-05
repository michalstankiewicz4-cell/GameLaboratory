// Edytor sceny · start: dane (core/store.js) → świat 3D (world/world.js) → kamera i uchwyt (world/controls.js)
// → gra (play/play.js) → API (js/scene/api.js, zakładka w konsoli) → okna (ui/panels.js) i pasek narzędzi (ui/toolbar.js). Opis: editor/README.md.
import { createStore } from './core/store.js';
import { createWorld, PROFILES_KEY, LIGHTS } from './world/world.js';
import { createControls } from './world/controls.js';
import { createPanels } from './ui/panels.js';
import { createToolbar } from './ui/toolbar.js';
import { createPlay } from './play/play.js';
import { createApiConsole } from './ui/api-console.js';
import { createSceneApi } from '../../js/scene/api.js';
import { behaviorsFor } from '../../js/scene/behaviors.js';
import { onAssetsChange, listAssets, ASSET_KINDS } from '../../js/scene/assets.js';
import { emptyScene, makeObject } from '../../js/scene/scene-data.js';
import { prefab, PREFABS } from '../../js/scene/prefabs.js';

const { t } = window.EditorI18n;
const $ = (id) => document.getElementById(id);
const step = (n, f) => window.LabLoad && window.LabLoad.step(n, f);
const status = (s) => { $('status').textContent = s || ''; };

// pierwsza scena (pusta pamięć przeglądarki): dwa okręty na morzu, żeby było co oglądać
function firstScene() {
  const s = emptyScene(t('scene.startName'));
  s.objects.push(makeObject('sea/blyskawica', 'ORP Błyskawica', [0, 0, 0]));
  const b = makeObject('sea/orzel', 'ORP Orzeł', [45, 0, -30]); b.rot = [0, 20, 0]; s.objects.push(b);
  return s;
}

step(t('load.renderer'), 0.1);
const store = createStore(firstScene);
const world = createWorld($('view'), store, (id) => status(id.startsWith('sea:') ? t('status.noSea', { name: id.slice(4) }) : t('status.unknown', { id })));
const controls = createControls(world, store);

// budowa modeli trwa (okręty: kilka sekund): z kartą ładowania, kiedy jest co budować
function build(fn) {
  fn();
  const need = world.pending();
  if (!need.length) return;
  window.LabLoad.run(t('load.building', { names: need.map((o) => o.name).join(', ') }), async (st) => {
    await st(t('load.models'), 0.2); world.syncObjects(); controls.attach(); await st(t('load.done'), 1);
  });
}
const actions = {
  status, build,
  add(id) {
    const p = prefab(id); if (!p) return;
    const tg = controls.orbit.target;
    build(() => store.add(p.id, p.label, [+tg.x.toFixed(1), p.surface === 'air' ? 30 : 0, +tg.z.toFixed(1)]));
  },
  duplicate() {
    const o = store.selected; if (!o) return;
    build(() => store.duplicate(o.id, t('obj.copy', { name: o.name }), Math.max(5, world.size(o.id) * 0.35)));
  },
  remove() { if (store.selectedId) store.remove(store.selectedId); },
  // cofnij / ponów: przywrócony stan może potrzebować zbudowania modeli (cofnięte usunięcie)
  undo() { if (store.canUndo) build(() => store.undo()); },
  redo() { if (store.canRedo) build(() => store.redo()); },
};
actions.play = createPlay(store, world, controls, actions);
const panels = createPanels(store, actions);
// API dla AI (js/scene/api.js): polecenia JSON na tych samych danych; zakładka API w konsoli i window.sceneApi.run(…)
const api = createSceneApi({
  store, prefabs: PREFABS, behaviorsFor, lights: Object.keys(LIGHTS), assets: { kinds: Object.keys(ASSET_KINDS), list: listAssets },
  hooks: { build, group: (fn) => store.group(fn), play: () => actions.play.start(), stop: () => actions.play.stop(), playing: () => actions.play.playing },
});
createApiConsole(api);
createToolbar(store, controls, actions);

// dane → świat i okna
store.on((what) => {
  if (what === 'scene' || what === 'objects') { if (!world.pending().length) world.syncObjects(); world.syncEnv(); }
  else if (what === 'place') world.syncPlaces();
  else if (what === 'env') world.syncEnv();
  controls.attach(); panels.renderTree(); panels.renderProps();
});
$('frame').addEventListener('click', controls.frameSelection);
$('frameAll').addEventListener('click', controls.frameAll);
// profil zapisany w laboratorium filtrów (inna karta) od razu na liście
addEventListener('storage', (e) => { if (e.key === PROFILES_KEY) { panels.renderProps(); world.syncEnv(); } });
// zasób zapisany w laboratorium (np. morze z laboratorium wody) — od razu na liście i w scenie
onAssetsChange(() => { panels.renderProps(); world.syncEnv(); });

step(t('load.models'), 0.3);
world.syncObjects(); world.syncEnv(); controls.attach(); panels.renderTree(); panels.renderProps(); controls.frameAll();
step(t('load.first'), 0.95);
world.start((dt, time) => { actions.play.frame(dt, time); controls.update(); });
requestAnimationFrame(() => window.LabLoad && window.LabLoad.done());
// do sprawdzania z konsoli i testów
window.sceneEditor = { store, world, controls, play: actions.play };
window.sceneApi = api;   // dla AI sterującej przeglądarką: window.sceneApi.run({ cmd: 'help' })
