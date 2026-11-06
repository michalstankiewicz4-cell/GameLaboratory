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
const lightName = (id) => (LIGHTS[id] ? t('light.' + id) : id || t('light.afternoon'));   // gotowe albo nazwa zasobu „weather”

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
      $('surface').value = S.env.surface;
      // światło: cztery gotowe i pogoda zapisana w laboratorium wyglądu (zasób „weather”)
      const wx = listAssets('weather'), curL = S.env.light || 'afternoon', knownL = new Set([...Object.keys(LIGHTS), ...wx]);
      $('light').replaceChildren(
        el('optgroup', { label: t('env.lightReady') }, ...Object.keys(LIGHTS).map((k) => el('option', { value: k, textContent: lightName(k) }))),
        ...(wx.length ? [el('optgroup', { label: t('env.lightSaved') }, ...wx.map((n) => el('option', { value: n, textContent: n })))] : []),
        ...(knownL.has(curL) ? [] : [el('option', { value: curL, textContent: t('env.seaMissing', { name: curL }) })]));
      $('light').value = curL;
      const names = Object.keys(readProfiles());
      $('look').replaceChildren(el('option', { value: '', textContent: t('env.plain') }), ...names.map((n) => el('option', { value: n, textContent: n })));
      $('look').value = names.includes(S.env.look) ? S.env.look : '';
      // morze: zasoby z laboratorium wody; nazwa ze sceny, której nie ma w tej przeglądarce, zostaje na liście (oznaczona)
      const seas = listAssets('sea'), cur = S.env.sea || '';
      $('seaAsset').replaceChildren(el('option', { value: '', textContent: t('env.seaDefault') }), ...seas.map((n) => el('option', { value: n, textContent: n })),
        ...(cur && !seas.includes(cur) ? [el('option', { value: cur, textContent: t('env.seaMissing', { name: cur }) })] : []));
      $('seaAsset').value = cur;
      $('seaRow').hidden = $('seaNote').hidden = S.env.surface === 'space' || (S.env.surface === 'land' && !S.env.land);   // morze: też wokół terenu
      // ląd: płaski grunt albo teren z laboratorium lądu
      const lands = listAssets('land'), curLand = S.env.land || '';
      $('landAsset').replaceChildren(el('option', { value: '', textContent: t('env.landPlain') }), ...lands.map((n) => el('option', { value: n, textContent: n })),
        ...(curLand && !lands.includes(curLand) ? [el('option', { value: curLand, textContent: t('env.seaMissing', { name: curLand }) })] : []));
      $('landAsset').value = curLand;
      $('landRow').hidden = $('landNote').hidden = S.env.surface !== 'land';
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
  $('landAsset').addEventListener('change', () => actions.build(() => store.setEnv({ land: $('landAsset').value })));
  $('skyAsset').addEventListener('change', () => store.setEnv({ sky: $('skyAsset').value }));
  $('seaAsset').addEventListener('change', () => store.setEnv({ sea: $('seaAsset').value }));
  $('light').addEventListener('change', () => store.setEnv({ light: $('light').value }));
  $('look').addEventListener('change', () => store.setEnv({ look: $('look').value }));
  $('toGround').addEventListener('click', () => { const o = store.selected; if (o) store.update(o.id, { pos: [o.pos[0], +actions.groundAt(o.pos[0], o.pos[2]).toFixed(2), o.pos[2]] }); });   // teren z laboratorium lądu albo 0
  $('dupBtn').addEventListener('click', actions.duplicate);
  $('delBtn').addEventListener('click', actions.remove);
  $('addBtn').addEventListener('click', () => actions.add($('addPrefab').value));

  return { renderTree, renderProps };
}
