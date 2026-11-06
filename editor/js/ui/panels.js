// Okna edytora: Scena (dodawanie modelu, hierarchia) i Właściwości (środowisko albo wybrany obiekt, z zachowaniem).
// Czytają dane ze store, zmiany wysyłają do store; świat 3D odbija je sam.
import { PREFABS, FAMILIES, prefab } from '../../../js/scene/prefabs.js';
import { LIGHTS, readProfiles } from '../world/world.js';
import { listAssets } from '../../../js/scene/assets.js';
import { skyPresets, SKY_PRESET } from '../../../js/scene/space.js';
import { BEHAVIORS, behaviorsFor, behaviorOf } from '../../../js/scene/behaviors.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const { t, lang } = window.EditorI18n;
const familyName = (f) => (lang === 'pl' ? FAMILIES[f].labelPl : FAMILIES[f].label);
const lightName = (id) => t('light.' + (LIGHTS[id] ? id : 'afternoon'));

// lista modeli pogrupowana rodzinami
export function fillPrefabs(select) {
  select.replaceChildren();
  Object.keys(FAMILIES).forEach((f) => {
    const list = PREFABS.filter((p) => p.family === f); if (!list.length) return;
    select.append(el('optgroup', { label: familyName(f) }, ...list.map((p) => el('option', { value: p.id, textContent: p.label }))));
  });
}

export function createPanels(store, actions) {
  fillPrefabs($('addPrefab')); fillPrefabs($('oPrefab'));
  Object.keys(LIGHTS).forEach((k) => $('light').append(el('option', { value: k, textContent: lightName(k) })));

  function renderTree() {
    const ul = $('tree'), S = store.scene; ul.replaceChildren();
    const item = (name, sub, id) => {
      const li = el('li', { className: 'treeItem ' + (id ? 'obj' : 'env') + (store.selectedId === id ? ' on' : '') },
        el('span', { className: 'tName', textContent: name }), el('span', { className: 'tSub', textContent: sub }));
      li.addEventListener('click', () => store.select(id)); ul.append(li);
    };
    item(t('tree.env'), `${t(S.env.surface === 'land' ? 'env.land' : S.env.surface === 'space' ? 'env.space' : 'env.sea')} · ${lightName(S.env.light).toLowerCase()}`, null);
    S.objects.forEach((o) => { const p = prefab(o.prefab); item(o.name, p ? familyName(p.family).toLowerCase() : o.prefab, o.id); });
    if (!S.objects.length) ul.append(el('li', { className: 'note', textContent: t('tree.empty') }));
  }

  const setVal = (id, v) => { if (document.activeElement !== $(id)) $(id).value = v; };
  function renderProps() {
    const o = store.selected, S = store.scene;
    $('envProps').hidden = !!o; $('objProps').hidden = !o;
    if (!o) {
      $('surface').value = S.env.surface; $('light').value = LIGHTS[S.env.light] ? S.env.light : 'afternoon';
      const names = Object.keys(readProfiles());
      $('look').replaceChildren(el('option', { value: '', textContent: t('env.plain') }), ...names.map((n) => el('option', { value: n, textContent: n })));
      $('look').value = names.includes(S.env.look) ? S.env.look : '';
      // morze: zasoby z laboratorium wody; nazwa ze sceny, której nie ma w tej przeglądarce, zostaje na liście (oznaczona)
      const seas = listAssets('sea'), cur = S.env.sea || '';
      $('seaAsset').replaceChildren(el('option', { value: '', textContent: t('env.seaDefault') }), ...seas.map((n) => el('option', { value: n, textContent: n })),
        ...(cur && !seas.includes(cur) ? [el('option', { value: cur, textContent: t('env.seaMissing', { name: cur }) })] : []));
      $('seaAsset').value = cur;
      $('seaRow').hidden = $('seaNote').hidden = S.env.surface !== 'sea';
      // niebo kosmosu: gotowe tła (SystemKit) i zasoby z laboratorium ciał niebieskich; lista po załadowaniu kitów
      const skies = listAssets('sky'), presets = skyPresets(), curSky = S.env.sky || '';
      const known = new Set(['', ...presets.map((p) => SKY_PRESET + p.id), ...skies]);
      $('skyAsset').replaceChildren(
        el('optgroup', { label: t('env.skyReady') }, el('option', { value: '', textContent: t('env.skyDefault') }),
          ...presets.filter((p) => p.id !== 'deep').map((p) => el('option', { value: SKY_PRESET + p.id, textContent: p.name }))),
        ...(skies.length ? [el('optgroup', { label: t('env.skySaved') }, ...skies.map((n) => el('option', { value: n, textContent: n })))] : []),
        ...(known.has(curSky) ? [] : [el('option', { value: curSky, textContent: t('env.seaMissing', { name: curSky.replace(SKY_PRESET, '') }) })]));
      $('skyAsset').value = curSky;
      $('skyRow').hidden = $('skyNote').hidden = S.env.surface !== 'space';
      return;
    }
    setVal('oName', o.name); $('oPrefab').value = o.prefab;
    // zachowanie: tylko te, które pasują do modelu, i „Bez zachowania”
    const fit = behaviorsFor(o.prefab);
    $('oBehavior').replaceChildren(el('option', { value: '', textContent: t('obj.noBehavior') }),
      ...fit.map((id) => el('option', { value: id, textContent: lang === 'pl' ? BEHAVIORS[id].labelPl : BEHAVIORS[id].label })));
    $('oBehavior').value = behaviorOf(o); $('oBehavior').disabled = !fit.length || document.body.classList.contains('playing');
    setVal('pX', o.pos[0]); setVal('pY', o.pos[1]); setVal('pZ', o.pos[2]);
    setVal('rY', o.rot[1]); setVal('rX', o.rot[0]); setVal('rZ', o.rot[2]); setVal('sc', o.scale);
    const p = prefab(o.prefab), lab = p && labName(p.lab);
    $('openLab').href = p ? '../' + p.lab : '#'; $('openLab').textContent = lab ? t('obj.openLabIn', { lab }) : t('obj.openLab');
  }
  function labName(file) {
    const f = file.split('?')[0], c = window.LabMenu && window.LabMenu.ITEMS.LABS.find((l) => l.file === f);
    return c ? (lang === 'pl' && c.namePl) || c.name : f;
  }

  // pola → dane
  const num = (id, def = 0) => { const v = parseFloat($(id).value); return Number.isFinite(v) ? v : def; };
  ['pX', 'pY', 'pZ', 'rY', 'rX', 'rZ', 'sc'].forEach((id) => $(id).addEventListener('input', () => {
    if (!store.selectedId) return;
    store.update(store.selectedId, { pos: [num('pX'), num('pY'), num('pZ')], rot: [num('rX'), num('rY'), num('rZ')], scale: Math.max(0.01, num('sc', 1)) });
  }));
  $('oName').addEventListener('input', () => { const o = store.selected; if (o) store.update(o.id, { name: $('oName').value || prefab(o.prefab)?.label || o.prefab }); });
  $('oPrefab').addEventListener('change', () => {
    const o = store.selected; if (!o) return; const old = prefab(o.prefab), nu = prefab($('oPrefab').value);
    actions.build(() => store.update(o.id, { prefab: nu.id, name: old && o.name === old.label ? nu.label : o.name }));   // nazwa domyślna idzie za modelem
  });
  $('oBehavior').addEventListener('change', () => { const o = store.selected; if (o) store.update(o.id, { behavior: $('oBehavior').value }); });
  $('surface').addEventListener('change', () => store.setEnv({ surface: $('surface').value }));
  $('skyAsset').addEventListener('change', () => store.setEnv({ sky: $('skyAsset').value }));
  $('seaAsset').addEventListener('change', () => store.setEnv({ sea: $('seaAsset').value }));
  $('light').addEventListener('change', () => store.setEnv({ light: $('light').value }));
  $('look').addEventListener('change', () => store.setEnv({ look: $('look').value }));
  $('toGround').addEventListener('click', () => { const o = store.selected; if (o) store.update(o.id, { pos: [o.pos[0], 0, o.pos[2]] }); });
  $('dupBtn').addEventListener('click', actions.duplicate);
  $('delBtn').addEventListener('click', actions.remove);
  $('addBtn').addEventListener('click', () => actions.add($('addPrefab').value));

  return { renderTree, renderProps };
}
