// Edytor sceny · start: dane (core/store.js) → świat 3D (world/world.js) → kamera i uchwyt (world/controls.js)
// → okna (ui/panels.js) i pasek narzędzi (ui/toolbar.js). Opis: editor/README.md.
import { createStore } from './core/store.js';
import { createWorld, PROFILES_KEY } from './world/world.js';
import { createControls } from './world/controls.js';
import { createPanels } from './ui/panels.js';
import { createToolbar } from './ui/toolbar.js';
import { emptyScene, makeObject } from '../../js/scene/scene-data.js';
import { prefab } from '../../js/scene/prefabs.js';

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
const world = createWorld($('view'), store, (id) => status(t('status.unknown', { id })));
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
};
const panels = createPanels(store, actions);
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

step(t('load.models'), 0.3);
world.syncObjects(); world.syncEnv(); controls.attach(); panels.renderTree(); panels.renderProps(); controls.frameAll();
step(t('load.first'), 0.95);
world.start(() => controls.update());
requestAnimationFrame(() => window.LabLoad && window.LabLoad.done());
// do sprawdzania z konsoli i testów
window.sceneEditor = { store, world, controls };
