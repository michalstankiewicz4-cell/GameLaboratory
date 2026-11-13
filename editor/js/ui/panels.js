// Okna edytora: Scena (dodawanie modelu, hierarchia) i Właściwości (środowisko albo wybrany obiekt, z zachowaniem).
// Czytają dane ze store, zmiany wysyłają do store; świat 3D odbija je sam.
import { PREFABS, FAMILIES, prefab } from '../../../js/scene/prefabs.js';
import { LIGHTS, readProfiles } from '../world/world.js';
import { listAssets, ASSET_KINDS } from '../../../js/scene/assets.js';
import { FX_KINDS } from '../../../js/render/effects/effects.js';
import { skyPresets, SKY_PRESET, SKY_DAY } from '../../../js/scene/space.js';
import { BEHAVIORS, behaviorsFor, behaviorOf, ORBIT_PERIOD } from '../../../js/scene/behaviors.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const { t, lang } = window.EditorI18n;
const familyName = (f) => (lang === 'pl' ? FAMILIES[f].labelPl : FAMILIES[f].label);
const lightName = (id) => (LIGHTS[id] ? t('light.' + id) : id || t('light.afternoon'));   // gotowe albo nazwa zasobu „weather”

// ikonki rodzin (SVG 24×24, linia w kolorze tekstu) dla zakładek dodawania modelu
const ICONS = {
  sea: 'M3 15h18l-3 4H6zM6 15V11h9l2 4M9 11V7h3v4M16 9v2',
  road: 'M3 15v-3l2-4h10l3 4h3v3zM7 18a1.5 1.5 0 1 0 0-3a1.5 1.5 0 1 0 0 3M17 18a1.5 1.5 0 1 0 0-3a1.5 1.5 0 1 0 0 3M6 12h12',
  rail: 'M6 4h12v12H6zM6 10h12M9 16l-2 4M15 16l2 4M10 2h4',
  air: 'M12 3v18M3 12l9-2l9 2M8 20h8M12 3l1 3h-2z',
  structures: 'M4 21V9l8-5l8 5v12M9 21v-6h6v6M4 21h16',
  weapons: 'M12 3v4M12 17v4M3 12h4M17 12h4M12 16a4 4 0 1 0 0-8a4 4 0 1 0 0 8',
  space: 'M12 2c3 3 4 7 3 12H9C8 9 9 5 12 2zM9 14l-3 4h3M15 14l3 4h-3M11 18h2v3h-2z',
  marine: 'M3 13c2-3 6-4 10-4h3l4 3l-4 3h-3c-4 0-8-1-10-2zM13 9V6h3M8 18c1 1 2 1 3 0s2-1 3 0',
  rovers: 'M4 14h16v-4H4zM7 10V7h6v3M6 19a2 2 0 1 0 0-4a2 2 0 1 0 0 4M12 19a2 2 0 1 0 0-4a2 2 0 1 0 0 4M18 19a2 2 0 1 0 0-4a2 2 0 1 0 0 4',
  plants: 'M12 21v-7M12 14l-6 0l6-11l6 11zM8 21h8',
  caves: 'M3 20c0-9 4-15 9-15s9 6 9 15zM9 20c0-4 1-7 3-7s3 3 3 7',
  base: 'M3 18h18M5 18a7 7 0 0 1 14 0M12 11v-4M10 7h4',
  bodies: 'M12 18a6 6 0 1 0 0-12a6 6 0 1 0 0 12M3 15c2 2 8 1 13-2s7-6 5-7',
  humans: 'M12 7a2.5 2.5 0 1 0 0-5a2.5 2.5 0 1 0 0 5M8 21l1-8h6l1 8M6 12l3-3h6l3 3',
  blocks: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  creatures: 'M4 10c2-3 5-3 8-2h5l3-2v4l-3 1c-1 2-3 3-6 3H8zM7 13l-1 7M10 14l1 6M15 13l1 7M18 11l1 4',
};
function familyIcon(f) {
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), path = document.createElementNS(NS, 'path');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  path.setAttribute('d', ICONS[f] || 'M4 4h16v16H4z'); svg.append(path); return svg;
}

// lista modeli pogrupowana rodzinami
export function fillPrefabs(select) {
  select.replaceChildren();
  Object.keys(FAMILIES).forEach((f) => {
    const list = PREFABS.filter((p) => p.family === f); if (!list.length) return;
    select.append(el('optgroup', { label: familyName(f) }, ...list.map((p) => el('option', { value: p.id, textContent: p.label }))));
  });
}

export function createPanels(store, actions) {
  fillPrefabs($('oPrefab'));

  // dodawanie modelu: zakładki kategorii (rodzin) z ikonkami i podpowiedzią, pod nimi modele kategorii, każdy z +
  let fam = Object.keys(FAMILIES).find((f) => PREFABS.some((p) => p.family === f));
  function renderPick() {
    $('pickFam').replaceChildren(...Object.keys(FAMILIES).filter((f) => PREFABS.some((p) => p.family === f)).map((f) => {
      const n = PREFABS.filter((p) => p.family === f).length;
      const b = el('button', { type: 'button', className: 'pickTab' + (f === fam ? ' on' : ''), title: `${familyName(f)} (${n})` }, familyIcon(f));
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', f === fam ? 'true' : 'false'); b.setAttribute('aria-label', familyName(f));
      b.addEventListener('click', () => { fam = f; renderPick(); }); return b;
    }));
    $('pickList').replaceChildren(el('li', { className: 'pickHead', textContent: familyName(fam) }), ...PREFABS.filter((p) => p.family === fam).map((p) => {
      // moduły bazy: + to budowa — hologram pod kursorem, kliknięcie stawia (editor/js/world/placer.js)
      const base = p.family === 'base';
      const add = el('button', { type: 'button', className: 'pickAdd', textContent: '+', title: base ? t('tree.placeOne', { name: p.label }) : t('tree.addOne', { name: p.label }) });
      add.addEventListener('click', () => (base ? actions.place(p.id) : actions.add(p.id)));
      const li = el('li', { className: 'pickItem', title: p.label }, el('span', { className: 'pName', textContent: p.label }), add);
      li.addEventListener('mousedown', (e) => { if (e.detail > 1) e.preventDefault(); });   // dwuklik nie zaznacza tekstu
      li.addEventListener('dblclick', () => (base ? actions.place(p.id) : actions.add(p.id))); return li;
    }));
  }
  renderPick();

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
      // UI gry: zasoby z laboratorium UI gry (nakładka w ▶ Graj)
      const uis = listAssets('ui'), curUi = S.env.ui || '';
      $('uiAsset').replaceChildren(el('option', { value: '', textContent: t('env.uiNone') }), ...uis.map((n) => el('option', { value: n, textContent: n })),
        ...(curUi && !uis.includes(curUi) ? [el('option', { value: curUi, textContent: t('env.seaMissing', { name: curUi }) })] : []));
      $('uiAsset').value = curUi;
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
      // niebo (dla każdej powierzchni): domyślne dla powierzchni, dzienne, gotowe tła kosmosu (SystemKit, lista po
      // załadowaniu kitów) i niebo zapisane w laboratorium ciał niebieskich
      const skies = listAssets('sky'), presets = skyPresets(), curSky = S.env.sky || '';
      const known = new Set(['', SKY_DAY, ...presets.map((p) => SKY_PRESET + p.id), ...skies]);
      $('skyAsset').replaceChildren(
        el('option', { value: '', textContent: t(S.env.surface === 'space' ? 'env.skyDefaultSpace' : 'env.skyDefaultDay') }),
        el('option', { value: SKY_DAY, textContent: t('env.skyDay') }),
        ...(presets.length ? [el('optgroup', { label: t('env.skyReady') }, ...presets.map((p) => el('option', { value: SKY_PRESET + p.id, textContent: p.name })))] : []),
        ...(skies.length ? [el('optgroup', { label: t('env.skySaved') }, ...skies.map((n) => el('option', { value: n, textContent: n })))] : []),
        ...(known.has(curSky) ? [] : [el('option', { value: curSky, textContent: !presets.length && curSky.startsWith(SKY_PRESET) ? curSky.slice(SKY_PRESET.length) + ' …'   // kity jeszcze się ładują
          : t('env.seaMissing', { name: curSky.replace(SKY_PRESET, '') }) })]));
      $('skyAsset').value = curSky;
      return;
    }
    setVal('oName', o.name); $('oPrefab').value = o.prefab;
    // zachowanie: tylko te, które pasują do modelu, i „Bez zachowania”
    const fit = behaviorsFor(o.prefab);
    $('oBehavior').replaceChildren(el('option', { value: '', textContent: t('obj.noBehavior') }),
      ...fit.map((id) => el('option', { value: id, textContent: lang === 'pl' ? BEHAVIORS[id].labelPl : BEHAVIORS[id].label })));
    $('oBehavior').value = behaviorOf(o); $('oBehavior').disabled = !fit.length || document.body.classList.contains('playing');
    // efekt strzału (statek, który strzela): rodzaj efektu z laboratorium efektów albo zapisany efekt; '' — strzał
    $('oShotRow').hidden = !(pk0(o) && pk0(o).shoots);
    if (!$('oShotRow').hidden) {
      const saved = listAssets('effect'), cur = o.shot || '';
      $('oShot').replaceChildren(el('option', { value: '', textContent: t('obj.shotDefault') }),
        ...Object.entries(FX_KINDS).filter(([id]) => id !== 'shot').map(([id, k]) => el('option', { value: id, textContent: lang === 'pl' ? k.labelPl : k.label })),
        ...(saved.length ? [el('optgroup', { label: t('obj.shotSaved') }, ...saved.map((n) => el('option', { value: n, textContent: n })))] : []),
        ...(cur && !FX_KINDS[cur] && !saved.includes(cur) ? [el('option', { value: cur, textContent: t('env.seaMissing', { name: cur }) })] : []));
      $('oShot').value = cur === 'shot' ? '' : cur;
    }
    // zasób modelu (prefabrykat z assetKind, np. bryła z laboratorium bloków): zapisane pod nazwą albo model domyślny
    const pk = prefab(o.prefab), ak = pk && pk.assetKind; $('oAssetRow').hidden = !ak;
    if (ak) {
      const names = listAssets(ak), cur = o.asset || '';
      $('oAssetLabel').textContent = lang === 'pl' ? ASSET_KINDS[ak].labelPl : ASSET_KINDS[ak].label;
      $('oAsset').replaceChildren(el('option', { value: '', textContent: t('obj.assetDefault') }), ...names.map((n) => el('option', { value: n, textContent: n })),
        ...(cur && !names.includes(cur) ? [el('option', { value: cur, textContent: t('env.seaMissing', { name: cur }) })] : []));
      $('oAsset').value = cur; $('oAsset').disabled = document.body.classList.contains('playing');
    }
    // orbita: wokół czego (samo — najbliższe cięższe ciało) i okres
    const orb = behaviorOf(o) === 'orbit'; $('orbitAroundRow').hidden = $('orbitPeriodRow').hidden = !orb;
    if (orb) {
      const others = S.objects.filter((q) => q.id !== o.id && q.prefab.startsWith('bodies/'));
      $('orbitAround').replaceChildren(el('option', { value: '', textContent: t('obj.orbitAuto') }), ...others.map((q) => el('option', { value: q.id, textContent: q.name })));
      $('orbitAround').value = o.orbit && others.some((q) => q.id === o.orbit.around) ? o.orbit.around : '';
      setVal('orbitPeriod', (o.orbit && o.orbit.period) || ORBIT_PERIOD);
    }
    setVal('pX', o.pos[0]); setVal('pY', o.pos[1]); setVal('pZ', o.pos[2]);
    setVal('rY', o.rot[1]); setVal('rX', o.rot[0]); setVal('rZ', o.rot[2]); setVal('sc', o.scale);
    const p = prefab(o.prefab), lab = p && labName(p.lab);
    $('openLab').href = p ? '../' + p.lab : '#'; $('openLab').textContent = lab ? t('obj.openLabIn', { lab }) : t('obj.openLab');
  }
  function pk0(o) { return prefab(o.prefab); }
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
  $('oShot').addEventListener('change', () => { const o = store.selected; if (o) store.update(o.id, { shot: $('oShot').value }); });
  $('oAsset').addEventListener('change', () => { const o = store.selected; if (o) actions.build(() => store.update(o.id, { asset: $('oAsset').value })); });
  $('orbitAround').addEventListener('change', () => { const o = store.selected; if (o) store.update(o.id, { orbit: { ...(o.orbit || {}), around: $('orbitAround').value } }); });
  $('orbitPeriod').addEventListener('input', () => { const o = store.selected, v = parseFloat($('orbitPeriod').value); if (o && v > 0) store.update(o.id, { orbit: { ...(o.orbit || {}), period: v } }); });
  $('surface').addEventListener('change', () => store.setEnv({ surface: $('surface').value }));
  $('landAsset').addEventListener('change', () => actions.build(() => store.setEnv({ land: $('landAsset').value })));
  $('skyAsset').addEventListener('change', () => store.setEnv({ sky: $('skyAsset').value }));
  $('seaAsset').addEventListener('change', () => store.setEnv({ sea: $('seaAsset').value }));
  $('light').addEventListener('change', () => store.setEnv({ light: $('light').value }));
  $('look').addEventListener('change', () => store.setEnv({ look: $('look').value }));
  $('uiAsset').addEventListener('change', () => store.setEnv({ ui: $('uiAsset').value }));
  $('toGround').addEventListener('click', () => { const o = store.selected; if (o) store.update(o.id, { pos: [o.pos[0], +actions.groundAt(o.pos[0], o.pos[2]).toFixed(2), o.pos[2]] }); });   // teren z laboratorium lądu albo 0
  $('dupBtn').addEventListener('click', actions.duplicate);
  $('delBtn').addEventListener('click', actions.remove);

  return { renderTree, renderProps };
}
