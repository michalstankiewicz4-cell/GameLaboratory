// Laboratorium mechaniki — tryb Przedmioty (z Tornado.io): każdy przedmiot osobno na stole (z dala od maszyny), na
// statywie albo na blacie, z ustawieniami z katalogu (items.js; lista w kategoriach planu CATS), danymi, portami
// i podglądem ruchu.
//   createItemsMode({ scene, M, S, save, $, el, orbit, fmt, perfRows }) → { item, itemDef, itemRoot, itemStats, frameItem, buildItem,
//     itemList, itemSettings, frame(dt) }
import * as THREE from '../../../vendor/three/three.module.js';
import * as MK from '../../models/mech/mechkit.js';
import { ITEMS, CATS } from './items.js';
import { T, tr, EN } from './lang.js';
import { valid } from '../shared/saved.js';

const TAU = Math.PI * 2;

export function createItemsMode({ scene, M, S, save, $, el, orbit, fmt, perfRows }) {
/* ---------------- tryb „Przedmioty”: stół, katalog, ustawienia ---------------- */
const IO = new THREE.Vector3(0, 0, -6), TABLE = 0.9;   // stół z podglądem z dala od maszyny
const itemRoot = new THREE.Group(); scene.add(itemRoot);
{
  const tg = new THREE.CylinderGeometry(0.55, 0.55, 0.04, 64), tuv = tg.attributes.uv; for (let i = 0; i < tuv.count; i++) tuv.setXY(i, tuv.getX(i) * 1.1, tuv.getY(i) * 1.1);
  const top = new THREE.Mesh(tg, M.bed); top.position.set(IO.x, TABLE - 0.02, IO.z); top.castShadow = top.receiveShadow = true;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, TABLE - 0.08, 24), M.paintGrey); col.position.set(IO.x, (TABLE - 0.04) / 2, IO.z); col.castShadow = true;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.04, 48), M.iron); foot.position.set(IO.x, 0.02, IO.z); foot.castShadow = foot.receiveShadow = true;
  const L = new THREE.SpotLight(0xfff0dc, 14, 6, 0.6, 0.5, 1.5); L.position.set(IO.x + 1.2, 3, IO.z + 1.6); L.target.position.set(IO.x, TABLE, IO.z);
  itemRoot.add(top, col, foot, L, L.target);
}
let item = null, itemDef = null, itemTheta = 0, itemR = 0.3;
const itemHolder = new THREE.Group(); itemRoot.add(itemHolder);
// statyw: słupek z boku przedmiotu i poziomy czop wzdłuż osi obrotu (x) do środka przedmiotu
const stand = new THREE.Group(); itemRoot.add(stand);
const standPost = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 16), M.paintGrey), standArm = new THREE.Mesh(MK.cyl(0.006, 1, 16), M.steel), standFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.012, 32), M.iron);
for (const o of [standPost, standArm, standFoot]) { o.castShadow = true; o.receiveShadow = true; stand.add(o); }
// ustawienia przedmiotu: zapisana wartość tylko, gdy pasuje do definicji (typ, zakres, lista) — inaczej domyślna
function itemParams(def) {
  const saved0 = S.items[def.id] || {}, p = {};
  for (const q of def.params) { const v = saved0[q.key]; p[q.key] = valid(q.def, v, q.type === 'select' ? q.options.map((o) => o[0]) : q.type === 'range' ? (x) => x >= q.min && x <= q.max : null) ? v : q.def; }
  return p;
}
function disposeTree(o) { o.traverse((c) => { if (c.geometry) c.geometry.dispose(); }); }
function buildItem() {
  itemDef = ITEMS.find((i) => i.id === S.item) || ITEMS[0]; S.item = itemDef.id;
  for (const c of [...itemHolder.children]) { disposeTree(c); itemHolder.remove(c); }
  item = itemDef.build(itemParams(itemDef));
  const g = item.group; itemHolder.add(g); g.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(g), c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
  // na blacie (silnik, oprawa łożyska) albo nad blatem na statywie — część wirująca nie dotyka stołu
  const lift = item.rest ? 0.015 : 0.06;
  g.position.set(IO.x - c.x, TABLE + lift - bb.min.y, IO.z - c.z);
  itemR = Math.max(0.08, sz.length() / 2);
  stand.visible = !item.rest;
  if (!item.rest) {
    const cy = TABLE + lift + sz.y / 2, px = IO.x - sz.x / 2 - 0.05, h = cy - TABLE;
    standPost.scale.y = h; standPost.position.set(px, TABLE + h / 2, IO.z); standFoot.position.set(px, TABLE + 0.006, IO.z);
    standArm.scale.x = IO.x - px; standArm.position.set((px + IO.x) / 2, cy, IO.z);
  }
  item.update(itemTheta);
  itemStats();
}
function frameItem(v) {
  const c = new THREE.Box3().setFromObject(itemHolder).getCenter(new THREE.Vector3());
  orbit.target.copy(c); orbit.dist = itemR * 3.2;
  const d0 = item && item.view ? item.view : { yaw: 0.75, pitch: 0.32 };
  if (v) { orbit.yaw = v.yaw; orbit.pitch = v.pitch; } else { orbit.yaw = d0.yaw; orbit.pitch = d0.pitch; }
}
function itemList() {
  // kategorie planu (CATS) → grupy → przedmioty; kategoria bez przedmiotów — pokazana jako „w planie”
  const groupEl = (gname) => [el('h4', { textContent: gname }), el('div', { className: 'btns' }, ...ITEMS.filter((i) => i.group === gname).map((i) => {
    const b = el('button', { type: 'button', textContent: i.name, className: i.id === S.item ? 'on' : '' }); b.onclick = () => { S.item = i.id; save(); itemList(); itemSettings(); buildItem(); frameItem(); }; return b;
  }))];
  const used = new Set(CATS.flatMap(([, gs]) => gs)), rest = [...new Set(ITEMS.map((i) => i.group))].filter((g) => !used.has(g));
  $('itemList').replaceChildren(...CATS.flatMap(([cat, gs], k) => {
    const have = gs.filter((g) => ITEMS.some((i) => i.group === g)), extra = k === 0 ? rest : [];
    return [el('h3', { className: 'cat', textContent: `${k + 1}. ${cat}` }), ...(have.length + extra.length ? [...have, ...extra].flatMap(groupEl) : [el('p', { className: 'plan', textContent: 'w planie' })])];
  }));
}
function itemSettings() {
  const def = ITEMS.find((i) => i.id === S.item) || ITEMS[0], p = itemParams(def), box0 = $('itemSet');
  const fmtV = (q, v) => (q.unit === 'mm.1' ? `${fmt(v * 1000, 1)} mm` : q.unit === 'mm.2' ? `${fmt(v * 1000, 2)} mm` : q.unit === 'mm' ? `${Math.round(v * 1000)} mm` : q.unit === 'mm×2' ? `${Math.round(v * 1000)} mm` : q.unit === '°' ? `${v}°` : q.unit ? `${(EN ? String(v) : String(v).replace('.', ','))} ${q.unit}` : String(v));
  const rows = def.params.map((q) => {
    const set = (v) => { (S.items[def.id] ||= {})[q.key] = v; save(); buildItem(); };
    if (q.type === 'select') {
      const sel = el('select', {}, ...q.options.map(([v, t]) => el('option', { value: String(v), textContent: t })));
      sel.value = String(p[q.key]); sel.onchange = () => { const o = q.options.find(([v]) => String(v) === sel.value); set(o[0]); };
      return el('div', { className: 'row' }, el('span', { textContent: q.label }), sel, el('output'));
    }
    if (q.type === 'check') {
      const cb = el('input', { type: 'checkbox', checked: !!p[q.key] }); cb.onchange = () => set(cb.checked);
      return el('label', { className: 'row' }, el('span', { textContent: q.label }), cb, el('output'));
    }
    const r = el('input', { type: 'range', min: q.min, max: q.max, step: q.step, value: p[q.key] }), out = el('output', { textContent: fmtV(q, p[q.key]) });
    r.oninput = () => { out.textContent = tr(fmtV(q, +r.value)); }; r.onchange = () => set(+r.value);
    return el('div', { className: 'row' }, el('span', { textContent: q.label }), r, out);
  });
  const sp = el('input', { type: 'range', min: 0, max: 120, step: 1, value: S.spin }), spo = el('output', { textContent: `${S.spin} ${T('obr/min', 'rpm')}` });
  sp.oninput = () => { S.spin = +sp.value; spo.textContent = `${S.spin} ${T('obr/min', 'rpm')}`; save(); };
  const reset = el('button', { type: 'button', textContent: 'Domyślne' }); reset.onclick = () => { delete S.items[def.id]; save(); itemSettings(); buildItem(); };
  // sterowanie i zasilanie — bez obrotu podglądu; sterowanie obsługuje się na modelu
  const preview0 = def.group === 'Zasilanie i przewody' && def.id === 'wire' ? [] : (['Sterowanie', 'Zasilanie i przewody', 'Optyka', 'Przekaźniki', 'Regulatory'].includes(def.group) || ['latch', 'battery', 'dirValve'].includes(def.id)) ? def.group === 'Optyka' || ['governor', 'battery'].includes(def.id) ? [] : [el('p', { className: 'note', textContent: 'Obsługa na modelu: klik — dźwignia, przycisk, wyłącznik, RUN / STOP; przytrzymanie — przycisk chwilowy, krańcówka; przeciąganie w górę / w dół — pokrętło.' })] : [el('h3', { textContent: 'Podgląd' }), el('div', { className: 'row' }, el('span', { textContent: 'Obrót wejścia' }), sp, spo)];
  box0.replaceChildren(el('h3', { textContent: def.name }), ...rows, ...preview0, el('div', { className: 'btns' }, reset));
}
function itemStats() {
  if (!item) return;
  $('selName').textContent = tr(itemDef.name);
  const rows = [...item.info, ...(item.live ? item.live() : [])];   // wartości na żywo zastępują te same pola z opisu
  const uniq = []; const seen = new Set(); for (const r of rows) { if (seen.has(r[0])) { uniq[uniq.findIndex((u) => u[0] === r[0])] = r; continue; } seen.add(r[0]); uniq.push(r); }
  $('selProps').replaceChildren(...uniq.flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: String(b) })]), ...(item.warn || []).map((w) => el('p', { className: 'warn', textContent: '⚠ ' + w })));
  $('selPorts').replaceChildren(...item.ports.map((pt) => el('li', {}, el('b', { textContent: pt.name }), el('span', { textContent: ` · ${pt.kind}` }))));
  perfRows([['Przedmiot', itemDef.name], ['Ustawienia', String(itemDef.params.length)], ['Porty', String(item.ports.length)]]);
}
  return {
    get item() { return item; }, get itemDef() { return itemDef; }, itemRoot, itemStats, frameItem, buildItem, itemList, itemSettings,
    // podgląd ruchu: kąt wejścia rośnie z obrotami z ustawień
    frame(dt) { if (!item) return; itemTheta += S.spin * TAU / 60 * dt; item.update(itemTheta); if (item.tick) item.tick(dt); },
  };
}
