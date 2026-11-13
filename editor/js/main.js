// Edytor sceny · start: dane (core/store.js) → świat 3D (world/world.js) → kamera i uchwyt (world/controls.js)
// → gra (play/play.js) → API (js/scene/api.js, zakładka w konsoli) → okna (ui/panels.js) i pasek narzędzi (ui/toolbar.js). Opis: editor/README.md.
import { createStore } from './core/store.js';
import { createWorld, LIGHTS } from './world/world.js';
import { createControls } from './world/controls.js';
import { createPlacer } from './world/placer.js';
import { createPanels } from './ui/panels.js';
import { createToolbar } from './ui/toolbar.js';
import { createPlay } from './play/play.js';
import { createEvents } from '../../js/core/events.js';
import { createApiConsole } from './ui/api-console.js';
import { createSceneApi } from '../../js/scene/api.js';
import { behaviorsFor, behaviorOf, bodyRank, BEHAVIORS } from '../../js/scene/behaviors.js';
import { checkScene } from '../../js/scene/doctor.js';
import { createDoctorPanel } from './ui/doctor-panel.js';
import { onAssetsChange, listAssets, ASSET_KINDS } from '../../js/scene/assets.js';
import { emptyScene, makeObject } from '../../js/scene/scene-data.js';
import { prefab, PREFABS } from '../../js/scene/prefabs.js';
import { loadSpace, spaceReady, skyPresets } from '../../js/scene/space.js';

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
const world = createWorld($('view'), store, (id) => status(id.startsWith('sea:') ? t('status.noSea', { name: id.slice(4) })
  : id.startsWith('sky:') ? t('status.noSky', { name: id.slice(4) }) : id.startsWith('land:') ? t('status.noLand', { name: id.slice(5) }) : id.startsWith('light:') ? t('status.noLight', { name: id.slice(6) })
  : t('status.unknown', { id })));
const controls = createControls(world, store);

// budowa modeli trwa (okręty: kilka sekund): z kartą ładowania, kiedy jest co budować
function build(fn) {
  fn();
  const need = world.pending();
  if (!need.length) return;
  const space = need.some((o) => (prefab(o.prefab) || {}).needs === 'space') && !spaceReady();
  window.LabLoad.run(t('load.building', { names: need.map((o) => o.name).join(', ') }), async (st) => {
    if (space) { await st(t('load.space'), 0.1); await loadSpace(); }
    await st(t('load.models'), 0.2); world.syncObjects(); world.syncEnv(); controls.attach(); await st(t('load.done'), 1);
  });
}
const actions = {
  status, build,
  groundAt: (x, z) => world.stage.groundAt(x, z),
  // budowa bazy: moduł bazy jako hologram pod kursorem (editor/js/world/placer.js); najpierw kity ze Space
  place(id) {
    const p = prefab(id); if (!p) return;
    if (spaceReady()) placer.start(p);
    else window.LabLoad.run(t('load.space'), async (st) => { await st(t('load.space'), 0.1); await loadSpace(); placer.start(p); });
  },
  add(id) {
    const p = prefab(id); if (!p) return;
    const tg = controls.orbit.target;
    const gy = world.stage.groundAt(tg.x, tg.z);   // na terenie: na gruncie albo na wodzie
    build(() => store.add(p.id, p.label, [+tg.x.toFixed(1), p.surface === 'air' ? gy + 30 : p.surface === 'space' ? +tg.y.toFixed(1) : +gy.toFixed(2), +tg.z.toFixed(1)]));
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
// szyna zdarzeń (js/core/events.js): akcje statków w grze i z API; każde zdarzenie także do dziennika konsoli
const events = createEvents({ log: (name, d) => window.LabLog && window.LabLog.add('info', `Event ${name}: ${d.name || d.object || ''}${d.action ? ' — ' + d.action + (d.on != null ? (d.on ? ' on' : ' off') : '') : ''}`) });
const placer = createPlacer(world, store, actions, { t });
actions.play = createPlay(store, world, controls, actions, events);
const panels = createPanels(store, actions);
// modele, które czekały na kity ze Space, są już zbudowane: uchwyt, hierarchia i okna od nowa
world.afterAsync = () => { controls.attach(); panels.renderTree(); panels.renderProps(); if (window.sceneEditor) window.sceneEditor.doctor.check(); };
// API dla AI (js/scene/api.js): polecenia JSON na tych samych danych; zakładka API w konsoli i window.sceneApi.run(…)
const api = createSceneApi({
  store, prefabs: PREFABS, behaviorsFor, lights: Object.keys(LIGHTS), assets: { kinds: Object.keys(ASSET_KINDS), list: listAssets, get skyPresets() { return skyPresets().map((p) => p.id); } },
  hooks: { build, group: (fn) => store.group(fn), play: () => actions.play.start(), stop: () => actions.play.stop(), playing: () => actions.play.playing,
    check: ({ budget } = {}) => checkScene(store.scene, {   // lekarz sceny: dane sceny + pomiary świata (obrysy, koszt, grunt)
      prefab, behaviorsFor, behaviorOf, behaviorEnv: (id) => (BEHAVIORS[id] || {}).env, bodyRank,
      assets: { list: listAssets }, lights: Object.keys(LIGHTS), skyPresets: skyPresets().map((p) => p.id),
      probe: world.stage, boxOf: world.boxOf, costOf: world.costOf, budget }),
    act: (o, action, on) => actions.play.act(o.id, action, on), actionsOf: (o) => actions.play.actionsOf(o.id), events: (n) => events.history(n) },
});
createApiConsole(api);
const doctor = createDoctorPanel(store, api, actions);
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
// zasób zapisany w laboratorium (morze, niebo, wygląd kamery…) — od razu na liście i w scenie
onAssetsChange(() => { panels.renderProps(); world.syncEnv(); });

step(t('load.models'), 0.3);
world.syncObjects(); world.syncEnv(); controls.attach(); panels.renderTree(); panels.renderProps(); controls.frameAll();
step(t('load.first'), 0.95);
world.start((dt, time) => { actions.play.frame(dt, time); placer.frame(dt); controls.update(); });
requestAnimationFrame(() => window.LabLoad && window.LabLoad.done());
// gotowe tła kosmosu na liście Niebo (też nad morzem i lądem): kity ze Space w tle, chwilę po starcie
setTimeout(() => { if (!spaceReady()) loadSpace().then(() => panels.renderProps()).catch(() => {}); }, 2500);
// do sprawdzania z konsoli i testów
window.sceneEditor = { store, world, controls, play: actions.play, doctor };
window.sceneApi = api;   // dla AI sterującej przeglądarką: window.sceneApi.run({ cmd: 'help' })
