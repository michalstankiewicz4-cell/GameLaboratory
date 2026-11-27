// Laboratorium mechaniki — tryb Fizyka (z Tornado.io): instalacja i regulator z modelu układu silnika
// (js/models/mech/assemblies/engine-layout/installation.js), fizyka układu z zachowania (js/behaviors/land/mech/engine-layout.js);
// tutaj to, co należy do laboratorium: okno Opis (physStats), kontrole brył zderzeń (na żywo i zahaczenia), hitboksy.
//   createPhysicsMode({ scene, root, M, S, save, $, el, mc, ui }) → { reg, ELEC, phys, physStats, hitG, elecG, setHit, syncHit, stepPhysics }
//   mc — maszyna (machine.js modelu); ui — { fmt, rpmOf, dirOf, select, showSel, sel } z głównego skryptu.
import * as THREE from '../../../vendor/three/three.module.js';
import * as MK from '../../models/mech/mechkit.js';
import * as CK from '../../models/mech/controls.js';
import { planeMap, contactPair } from '../../behaviors/land/mech/contact.js';
import { buildInstallation } from '../../models/mech/assemblies/engine-layout/installation.js';
import { createEngineLayoutPhysics } from '../../behaviors/land/mech/engine-layout.js';

const TAU = Math.PI * 2, X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);

export function createPhysicsMode({ scene, root, M, S, save, $, el, mc, ui }) {
  const { BED_TOP, CH, P, Y0, YS5, ZPL, ZR, ZS, belt, chain, cross1, cross2, drive, eC1, eDisc, eSun, motorG, parts, planets, ring } = mc;
  const { fmt, rpmOf, dirOf, select, showSel } = ui;
/* ---------------- instalacja (model) i fizyka układu (zachowanie) ---------------- */
const { reg, elecG, ELEC } = buildInstallation({ scene, mc, M });
const { phys, ZONES, isGear, BELT_F0, BELT_WRAP, step } = createEngineLayoutPhysics({ mc });
const stepPhysics = (dt) => step(dt, { reg, ELEC, brake: S.brake });   // klatka trybu Fizyka (to samo co w scenie)
function physStats() {
  const st = phys.state, f1 = (v) => fmt(v, 1), a = reg.api;
  const rows = [['Regulator', `${a.run ? 'RUN' : 'STOP'} · ${a.dir > 0 ? 'FWD' : 'REV'} · ${f1(Math.abs(a.f))} Hz (zadana ${f1(a.set)} Hz)`], ['Silnik', `${dirOf(st.omega)} ${fmt(Math.abs(rpmOf(st.omega)))} obr/min (synchr. ${fmt(Math.abs(30 * a.f))})`], ['Moment silnika', `${f1(st.Tm)} N·m`],
    ['Wyjście', `${dirOf(eDisc.omega)} ${f1(Math.abs(rpmOf(eDisc.omega)))} obr/min`], ['Moment hamulca', `${f1(Math.abs(st.Tb))} N·m`]];
  // punkt 5 — obwód elektryczny
  { const E = ELEC, es = E.st, onoff = (v) => (v ? 'zamknięty' : 'otwarty');
    rows.push(['Zasilanie X0', `${E.X0.api.on ? 'WŁ' : 'WYŁ'} · 3 × 400/230 V, 50 Hz (TN-S)${es.r && es.r.shorts.length ? ` · ZWARCIE: ${es.r.shorts.join(', ')}` : ''}`]);
    rows.push(['Wyłącznik główny Q1', E.Q1.api.on ? 'I (załączony)' : '0 (wyłączony)']);
    rows.push(['Sterowanie 230 V', `S0 grzybek ${E.S0.api.latched ? 'WCIŚNIĘTY (styk otwarty)' : onoff(true)} · S1 STOP ${onoff(E.S1.api.closed)} · S2 START ${onoff(E.S2.api.closed)}`]);
    rows.push(['Stycznik K1', `${E.K1.api.on ? 'załączony' : 'wyłączony'}${E.K1.api.test ? ' (test ręczny)' : ''} · cewka ${fmt(es.uK)} V (zadziała ≥ ${fmt(E.K1.group.userData.elec.pullIn * E.K1.group.userData.elec.coilU)} V, odpada < ${fmt(E.K1.group.userData.elec.dropOut * E.K1.group.userData.elec.coilU)} V) · podtrzymanie 13-14 ${onoff(E.K1.api.on)}`]);
    rows.push(['Lampka H1', `${es.uH > E.H1.group.userData.elec.on * E.H1.group.userData.elec.U ? 'świeci' : 'zgaszona'} (${fmt(es.uH)} V)`]);
    rows.push(['Falownik — zasilanie', reg.api.powered ? `${fmt(es.uV)} V · pobór ${fmt(es.Pin)} W · ${fmt(es.I, 2)} A na fazę` : `bez zasilania (${fmt(es.uV)} V) — silnik wybiega`]);
    rows.push(['Praca / kierunek (S3 → DI)', `S3 w położeniu ${E.S3.api.pos} · DI1 (w przód) ${fmt(es.uDI1 || 0)} V, DI2 (wstecz) ${fmt(es.uDI2 || 0)} V · ${reg.api.run ? (reg.api.dir > 0 ? 'praca w przód' : 'praca wstecz') : !reg.api.armed && (reg.api.di[0] || reg.api.di[1]) ? 'BLOKADA — przestaw S3 na 0 (ochrona przed samoczynnym startem)' : 'stop'}`]);
    rows.push(['Zadawanie (R1 → AI)', `${fmt(reg.api.ain, 2)} V → ${fmt(reg.api.set, 1)} Hz (potencjometr 10 kΩ liniowy, 0–10 V = 0–50 Hz)`]);
    rows.push(['Silnik — zasilanie', es.Uout ? `${fmt(es.Uout)} V (U/f) · ${fmt(es.Im, 2)} A (znam. ${fmt(E.In, 2)} A) · ${fmt(es.Pel)} W` : 'bez napięcia']);
    rows.push(['Spadek napięcia W1–W3', `${fmt(es.dU * 1000, 1)} mV (${fmt(es.dU / 4, 4)} %) · ${fmt(E.Rline * 1000, 1)} mΩ na żyłę (2,5 mm² Cu, ${fmt(['W1', 'W2', 'W3'].reduce((a, k) => a + E.cables[k].userData.len, 0), 2)} m)`]);
  }
  // sprężyste połączenia: skręcenie (poza luzem) i moment — miękkie na liście (sztywność poniżej 10⁵ N·m/rad)
  for (const c of phys.edges) if (c.k < 1e5) rows.push([`Sprężystość: ${c.name}`, `${fmt(c.twist * 180 / Math.PI, 3)}° · ${fmt(Math.abs(c.T), 2)} N·m · k = ${fmt(c.k)} N·m/rad`]);
  // punkt 3: straty, pas, łańcuch
  const loss = phys.edges.reduce((a, c) => a + Math.abs(c.Tl * c.e.b.omega), 0);
  rows.push(['Straty tarcia w połączeniach', `${fmt(loss, 1)} W (sprawność ${fmt(st.P > 0.5 ? (st.Pout || 0) / st.P * 100 : 0, 1)} %)`]);
  // poślizg pasa mierzony jak na prawdziwym napędzie: s = 1 − ω₂ / (ω₁·d₁/d₂) (średnie prędkości z klatki) — pełzanie
  // sprężyste i poślizg całkowity (pas chwyta i zrywa się co kilkadziesiąt ms) w jednej liczbie
  for (const c of phys.edges) if (c.belt) {
    const w1 = c.e.a.omega, w2 = c.e.b.omega, sl = Math.abs(w1) > 1 ? 1 - w2 / (w1 * 0.16 / 0.08) : 0, full = sl > 0.05;
    rows.push(['Pas — poślizg', `${full ? 'POŚLIZG ' : ''}${fmt(sl * 100, 2)} %${full ? ' — pas ślizga się w rowku (moment graniczny przekroczony)' : ' — pełzanie sprężyste'} · moment ${fmt(Math.abs(c.T), 1)} N·m, graniczny ${fmt(c.belt.Tmax, 1)} N·m (napięcie 2 × ${BELT_F0} N, opasanie ${Math.round(BELT_WRAP * 180 / Math.PI)}°)`]);
  }
  for (const c of phys.edges) if (c.e.type === 'chain') rows.push(['Łańcuch — efekt wielokąta', `prędkość koła biernego waha się o ±${fmt((1 - Math.cos(Math.PI / 18)) * 50, 2)} % (z = 18)${Math.abs(c.e.a.omega) > 0.5 ? ` · teraz ${fmt(c.e.b.omega / c.e.a.omega * 27 / 18 * 100 - 100, 2)} %` : ''}`]);
  for (const c of phys.edges) if (c.dead) {
    const ga = c.e.a.group.userData, gb = c.e.b.group.userData, Z = ZONES.get(`${ga.z}:${gb.z}`), mm = (x) => fmt(x * gb.rp * 1000, 3);
    const zone = Z ? `z brył zębów ${mm(c.hi - c.lo)} mm (wzdłuż przyporu ${mm(Z.z.width.min)}–${mm(Z.z.width.max)})` : `${fmt((ga.phys.luz + gb.phys.luz) * 1000, 2)} mm`;
    rows.push([`Luz ${ga.z} : ${gb.z}`, `${zone} · ${c.contact > 0 ? 'przylega flanką przednią' : c.contact < 0 ? 'przylega flanką tylną' : 'w luzie — zęby się nie dotykają'}`]);
  }
  // bryły zderzeń bez wiązania (co 0,5 s): satelity, rolki łańcucha; zahaczenia części obrotowych (raz, przy starcie)
  const now = performance.now();
  if (!LIVE || now - LIVE.t > 500) LIVE = { t: now, ...liveChecks() };
  const mmS = (x) => fmt(Math.abs(x) * 1000, 3);
  LIVE.planets.forEach((p, k) => rows.push([`Satelita ${k + 1} — zęby`, ['sun', 'ring'].map((key) => `${key === 'sun' ? 'ze słonecznym' : 'z koroną'} ${p[key].pen ? 'PRZENIKANIE' : `luz −${mmS(p[key].lo)} / +${mmS(p[key].hi)} mm`}`).join(' · ')]));
  for (const r of LIVE.rollers) rows.push([`Rolki łańcucha — ${r.name}`, `${r.near} rolek na kole · ${r.pen ? `PRZENIKANIE ${r.pen} rolek` : 'bez przenikania (zarys ISO 606: gniazdo, bok r_e, głowa)'}`]);
  rows.push(['Zahaczenia o obudowy i łożyska', CLASHES.length ? CLASHES.map((c) => `${c.part} × ${c.fixed} ${mmS(c.depth)} mm`).join('; ') : `brak (sprawdzone ${parts.filter((e) => e.spin).length} części obrotowych, dla każdego kąta)`]);
  $('bDrive').replaceChildren(...rows.flatMap(([x, y]) => [el('span', { textContent: x }), el('b', { textContent: y })]));
  $('bList').replaceChildren(...parts.flatMap((e) => { const sp = el('span', { textContent: e.name }); sp.onclick = () => select(e); return [sp, el('b', { textContent: `${dirOf(e.omega)} ${fmt(Math.abs(rpmOf(e.omega)), 1)} obr/min · ${fmt(e.T, 1)} N·m` })]; }));
  if (ui.sel) showSel();
  if (window.LabPerf) window.LabPerf.modelRows([['Stopnie swobody', String(phys.nodes.length)], ['Wiązania', String(phys.edges.length)], ['Zazębienia z luzem', String(phys.edges.filter((c) => c.dead).length)], ['Bryły zderzeń zębów', `${[...ZONES.values()].reduce((a, v) => a + v.ua.z + v.ub.z, 0)} wielokątów wypukłych (${ZONES.size} zazębienia)`]]);
}
// hitboksy z geometrii (ogólnie, bez ręcznych wymiarów): zębatka — bryły zderzeń zębów (wielokąty wypukłe z zarysu),
// walec stóp i walce piast; inna część obrotowa — walec wzdłuż osi (obraca się z częścią); część nieruchoma —
// prostopadłościan; siatki druciane rysowane przez wszystko
const hitG = new THREE.Group(); scene.add(hitG); hitG.visible = false;
const HM = { clash: new THREE.LineBasicMaterial({ color: 0xff4a4a, transparent: true, opacity: 0.95, depthTest: false }), spin: new THREE.LineBasicMaterial({ color: 0x4ad2ff, transparent: true, opacity: 0.85, depthTest: false }), fixed: new THREE.LineBasicMaterial({ color: 0xffc14a, transparent: true, opacity: 0.7, depthTest: false }) };
let hitItems = null;
// wierzchołki siatek poddrzewa w układzie części wirującej `sp` (bez poddrzew innych zębatek — mają własne bryły)
function eachVert(sp, fn, skipGears) {
  const inv = new THREE.Matrix4().copy(sp.matrixWorld).invert(), v = new THREE.Vector3(), gears = [];
  const walk = (o) => {
    if (skipGears && o !== sp && isToothed(o.userData) && o.userData.spin) { gears.push(o); return; }
    if (o.isMesh && !o.isInstancedMesh && o.geometry.attributes.position) { const pa = o.geometry.attributes.position; for (let i = 0; i < pa.count; i += 3) fn(v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv)); }
    for (const c of o.children) walk(c);
  };
  walk(sp); return gears;
}
function cylLines(r, x0, x1) { const c = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(r, r, x1 - x0, 20, 1).rotateZ(-Math.PI / 2), 1), HM.spin); c.position.x = (x0 + x1) / 2; c.renderOrder = 20; return c; }
// bryły zębów części z zębami: zębatka, koło łańcuchowe (ząb podzielony na części wypukłe), koło koronowe (zęby
// wewnętrzne); każda część wypukła — obie ściany i krawędzie przy skrajnych punktach zęba
const isToothed = (u) => isGear(u) || (u && u.sprocket) || (u && u.internal);
function hullsOf(u) {
  if (u.sprocket) return MK.sprocketHulls(u.z, u.p, u.d1);
  if (u.internal) return MK.ringHulls(u.z, u.m);
  return MK.toothHulls(u.z, u.m, { alpha: u.alpha });
}
function gearHit(g) {
  const u = g.userData, sp = u.spin, h = u.w / 2, pts = [], holder = new THREE.Group();
  for (const t of hullsOf(u)) {
    const parts = Array.isArray(t) ? [t] : t.parts, all = parts.flat();
    for (const q of parts) for (const x of [-h, h]) for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; pts.push(x, a[0], a[1], x, b[0], b[1]); }
    const ang = (p) => Math.atan2(p[1], p[0]), c = ang(all.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0])), d = (p) => Math.atan2(Math.sin(ang(p) - c), Math.cos(ang(p) - c));
    const ext = [all.reduce((a, p) => (d(p) < d(a) ? p : a)), all.reduce((a, p) => (d(p) > d(a) ? p : a)), all.reduce((a, p) => (Math.hypot(...p) > Math.hypot(...a) ? p : a))];
    for (const p of ext) pts.push(-h, p[0], p[1], h, p[0], p[1]);
    hitStat.parts += parts.length;
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const teeth = new THREE.LineSegments(lg, HM.spin); teeth.renderOrder = 20; holder.add(teeth);
  if (u.internal) holder.add(cylLines(u.ra + 0.5 * u.m, -h, h), cylLines(u.R, -h, h));   // wieniec korony
  else holder.add(cylLines(u.sprocket ? u.R - u.rs : u.rf, -h, h));   // walec pod zębami
  sp.updateWorldMatrix(true, true);
  const side = { [-1]: { r: 0, x: 0 }, [1]: { r: 0, x: 0 } };
  eachVert(sp, (v) => { if (Math.abs(v.x) <= h + 1e-4) return; const s = side[Math.sign(v.x)]; s.r = Math.max(s.r, Math.hypot(v.y, v.z)); s.x = Math.max(s.x, Math.abs(v.x)); }, true);
  for (const sg of [-1, 1]) if (side[sg].r > 0) holder.add(cylLines(side[sg].r, sg < 0 ? -side[sg].x : h, sg < 0 ? -h : side[sg].x));
  hitG.add(holder); hitItems.push({ holder, src: sp }); hitStat.teeth += u.z; hitStat.gears++;
}
const hitStat = { teeth: 0, gears: 0, parts: 0 };
// rolki łańcucha — walce (Ø d₁, szerokość wewnętrzna), położenia z fazy łańcucha, odświeżane z obrazem
let rollHit = null;
function chainHit() {
  const N = chain.userData.N, r = chain.userData.d1 / 2, seg = 12, hw = 0.0039, pos = new Float32Array(N * seg * 3 * 2 * 2);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(lg, HM.spin); lines.renderOrder = 20; lines.frustumCulled = false; lines.matrixAutoUpdate = false;
  hitG.add(lines);
  rollHit = () => {
    chain.updateWorldMatrix(true, false); lines.matrix.copy(chain.matrixWorld);
    let k = 0; const put = (x, y, z) => { pos[k++] = x; pos[k++] = y; pos[k++] = z; };
    for (const [x, y, z] of chain.userData.rollers(chainPhase())) for (const sx of [-hw, hw]) for (let i = 0; i < seg; i++) {
      const a = i * TAU / seg, b = (i + 1) * TAU / seg; put(x + sx, y + r * Math.cos(a), z + r * Math.sin(a)); put(x + sx, y + r * Math.cos(b), z + r * Math.sin(b));
    }
    lg.attributes.position.needsUpdate = true;
  };
  rollHit();
}

/* ---------------- punkt 4 — kontrole brył zderzeń (statyczne i na żywo) ---------------- */
const chainPhase = () => eC1.theta * 18 / TAU;
// zderzenia par bez wiązania: satelity ze słonecznym i z koroną (położenia z modelu), rolki łańcucha z zębami kół
const HULL = { sun: hullsOf(eSun.group.userData), ring: hullsOf(ring.userData), pl: hullsOf(planets[0].userData) }, PL_RP = planets[0].userData.rp;
const ROLLER_POLY = (() => { const r = chain.userData.d1 / 2, q = []; for (let i = 0; i < 24; i++) q.push([r * Math.cos(i * TAU / 24), r * Math.sin(i * TAU / 24)]); return q; })();
const SPROCKETS = parts.filter((e) => e.group.userData.sprocket).map((e) => ({ e, hulls: hullsOf(e.group.userData), u: e.group.userData }));
function liveChecks() {
  const out = { planets: [], rollers: [] };
  // satelity: odstęp w obie strony od położenia z modelu (obrót satelity do dotyku), przenikanie
  for (const pl of planets) {
    const tp = pl.userData.spin.rotation.x, res = {};
    for (const [key, A, ta] of [['sun', eSun.spin, eSun.spin.rotation.x], ['ring', ring.userData.spin, ring.userData.spin.rotation.x]]) {
      const pair = contactPair({ hullsA: HULL[key], hullsB: HULL.pl, za: key === 'sun' ? ZS : ZR, zb: ZPL, map: planeMap(A, pl.userData.spin) });
      const pen = pair.hit(ta, tp);
      res[key] = pen ? { pen } : { pen, lo: pair.gap(ta, tp, -1) * PL_RP, hi: pair.gap(ta, tp, 1) * PL_RP };
    }
    out.planets.push(res);
  }
  // rolki łańcucha: wielokąt rolki w płaszczyźnie koła łańcuchowego, z częściami wypukłymi zębów (SAT)
  chain.updateWorldMatrix(true, false);
  const R = chain.userData.rollers(chainPhase()), v = new THREE.Vector3(), inv = new THREE.Matrix4();
  for (const S of SPROCKETS) {
    const sp = S.e.spin; sp.updateWorldMatrix(true, false); inv.copy(sp.matrixWorld).invert();
    let near = 0, pen = 0;
    for (const [x, y, z] of R) {
      v.set(x, y, z).applyMatrix4(chain.matrixWorld).applyMatrix4(inv);
      if (Math.hypot(v.y, v.z) > S.u.R + S.u.d1) continue;
      near++;
      const pair = contactPair({ hullsA: S.hulls, hullsB: [ROLLER_POLY], za: S.u.z, zb: 1, map: { a00: 1, a01: 0, a10: 0, a11: 1, tx: v.y, ty: v.z } });
      if (pair.hit(0, 0)) pen++;
    }
    out.rollers.push({ name: S.e.name, near, pen });
  }
  return out;
}
// części obrotowe a nieruchome (obudowy, łożyska, podpory, łoże): część obrotowa zakreśla bryłę obrotową — jej obrys
// promieniowy po osi (co 1 mm, z krawędzi trójkątów) nie zależy od kąta, więc kontrola raz wystarcza dla każdego
// położenia. Trójkąt części nieruchomej przecięty płaszczyzną x = środek przedziału daje odcinek; jego odległość od osi
// mniejsza niż obrys o więcej niż 0,05 mm = zahaczenie. Pomijane: łańcuch i pas (cięgna — kontrola rolek), koło
// koronowe (zęby — kontrola satelitów), krzyżaki przegubów (ruchome).
const CLASH = new Map(), CLASH_TOL = 0.00005;
let LIVE = null;
function interference() {
  const isPart = (o) => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.el) return true; return false; };
  const fixed = [];
  for (const o of root.children) if (!isPart(o) && !o.isLight && o.visible && o !== chain && o !== belt && o !== ring && o !== cross1 && o !== cross2) fixed.push({ o, name: o.name || 'podpora' });
  for (const e of parts) for (const c of e.group.children) if (c !== e.spin) fixed.push({ o: c, name: `${e.name} — część stała` });
  for (const o of [reg.group, ...elecG.children]) fixed.push({ o, name: o.name || (ELEC.devices.find((d) => d.group === o) || {}).name || 'instalacja elektryczna' });
  elecG.updateWorldMatrix(true, true); reg.group.updateWorldMatrix(true, true);
  root.updateWorldMatrix(true, true);
  const res = [], inv = new THREE.Matrix4(), A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), q = [A, B, C];
  for (const e of parts) {
    const sp = e.spin; if (!sp) continue;
    inv.copy(sp.matrixWorld).invert();
    // obrys promieniowy części (z krawędzi trójkątów, liniowo po x)
    let x0 = Infinity, x1 = -Infinity;
    const tris = [];
    sp.traverse((o) => { if (!o.isMesh || o.isInstancedMesh) return; const g = o.geometry, pa = g.attributes.position, ix = g.index, n = ix ? ix.count : pa.count;
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < n; i += 3) { const t = []; for (let k = 0; k < 3; k++) { const v = new THREE.Vector3().fromBufferAttribute(pa, ix ? ix.getX(i + k) : i + k).applyMatrix4(m); t.push(v); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); } tris.push(t); } });
    if (!(x1 > x0)) continue;
    const BIN = 0.001, nb = Math.ceil((x1 - x0) / BIN) + 1, env = new Float64Array(nb);
    for (const t of tris) for (let k = 0; k < 3; k++) {
      const a = t[k], b = t[(k + 1) % 3], ra = Math.hypot(a.y, a.z), rb = Math.hypot(b.y, b.z);
      const i0 = Math.round((Math.min(a.x, b.x) - x0) / BIN), i1 = Math.round((Math.max(a.x, b.x) - x0) / BIN);
      for (let i = i0; i <= i1; i++) { const u = b.x === a.x ? 0 : Math.min(1, Math.max(0, (x0 + i * BIN - a.x) / (b.x - a.x))); env[i] = Math.max(env[i], ra + (rb - ra) * u); }
    }
    const rmax = Math.max(...env);
    for (const f of fixed) {
      let depth = 0;
      f.o.traverse((o) => { if (!o.isMesh || o.isInstancedMesh) return; const g = o.geometry, pa = g.attributes.position, ix = g.index, n = ix ? ix.count : pa.count;
        const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
        for (let i = 0; i < n; i += 3) {
          for (let k = 0; k < 3; k++) q[k].fromBufferAttribute(pa, ix ? ix.getX(i + k) : i + k).applyMatrix4(m);
          const tx0 = Math.min(A.x, B.x, C.x), tx1 = Math.max(A.x, B.x, C.x);
          if (tx1 < x0 || tx0 > x1) continue;
          if (Math.min(A.y, B.y, C.y) > rmax || Math.max(A.y, B.y, C.y) < -rmax || Math.min(A.z, B.z, C.z) > rmax || Math.max(A.z, B.z, C.z) < -rmax) continue;
          const i0 = Math.max(0, Math.ceil((tx0 - x0) / BIN)), i1 = Math.min(nb - 1, Math.floor((tx1 - x0) / BIN));
          for (let bi = i0; bi <= i1; bi++) {
            if (!env[bi]) continue;
            const X = x0 + bi * BIN, P = [];
            for (let k = 0; k < 3; k++) { const a = q[k], b = q[(k + 1) % 3]; if ((a.x - X) * (b.x - X) <= 0 && a.x !== b.x) { const u = (X - a.x) / (b.x - a.x); P.push([a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u]); } }
            if (P.length < 2) continue;
            // odległość osi (początek układu) od odcinka P0–P1
            const [p0, p1] = P, dy = p1[0] - p0[0], dz = p1[1] - p0[1], L = dy * dy + dz * dz, u = L ? Math.max(0, Math.min(1, -(p0[0] * dy + p0[1] * dz) / L)) : 0;
            const d = Math.hypot(p0[0] + dy * u, p0[1] + dz * u), pen = env[bi] - d;
            if (pen > depth) depth = pen;
          }
        } });
      if (depth > CLASH_TOL) { res.push({ part: e.name, fixed: f.name, depth }); CLASH.set(f.o, Math.max(CLASH.get(f.o) || 0, depth)); }
    }
  }
  return res;
}
const t0Clash = performance.now(), CLASHES = interference();
console.info(`Kontrola zahaczeń: ${CLASHES.length ? CLASHES.map((c) => `${c.part} × ${c.fixed} ${(c.depth * 1000).toFixed(2)} mm`).join('; ') : 'brak'} (${Math.round(performance.now() - t0Clash)} ms)`);

function buildHit() {
  hitItems = [];
  for (const e of parts) {   // walec: zasięg wzdłuż osi (x lokalne) i największy promień w płaszczyźnie (y, z) części wirującej
    if (isToothed(e.group.userData) && e.spin) { gearHit(e.group); continue; }
    const sp = e.spin || e.group; sp.updateWorldMatrix(true, true);
    let x0 = Infinity, x1 = -Infinity, r = 0;
    const gears = eachVert(sp, (v) => { x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); r = Math.max(r, Math.hypot(v.y, v.z)); }, true);
    for (const g of gears) gearHit(g);
    if (!(x1 > x0)) continue;
    const holder = new THREE.Group(); holder.add(cylLines(r, x0, x1)); hitG.add(holder); hitItems.push({ holder, src: sp });
  }
  const isPart = (o) => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.el) return true; return false; };
  for (const o of root.children) {   // nieruchome: łożyska, obudowy, silnik (korpus), podpory, łoże
    if (isPart(o) || o.isLight || !o.visible) continue;
    if (isToothed(o.userData) && o.userData.spin) { gearHit(o); continue; }   // koło koronowe — bryły zębów wewnętrznych
    if (o === chain) { chainHit(); continue; }
    const bb = new THREE.Box3().setFromObject(o); if (bb.isEmpty()) continue;
    const bx = new THREE.Box3Helper(bb, 0xffc14a); bx.material = CLASH.has(o) ? HM.clash : HM.fixed; bx.renderOrder = 20; hitG.add(bx);
  }
  { const bb = new THREE.Box3().setFromObject(motorG.children.find((c) => c !== motorG.userData.spin) || motorG); const bx = new THREE.Box3Helper(bb, 0xffc14a); bx.material = HM.fixed; hitG.add(bx); }
  for (const o of [reg.group, ...elecG.children]) { if (o.isGroup && o.userData.cores) continue; const bb = new THREE.Box3().setFromObject(o); const bx = new THREE.Box3Helper(bb, 0xffc14a); bx.material = CLASH.has(o) ? HM.clash : HM.fixed; bx.userData.reg = true; hitG.add(bx); }
}
function syncHit() { if (rollHit) rollHit(); for (const h of hitItems) { h.src.updateWorldMatrix(true, false); h.holder.matrixAutoUpdate = false; h.holder.matrix.copy(h.src.matrixWorld); } for (const c of hitG.children) if (c.userData.reg) c.visible = S.mode === 'physics'; }
function setHit(on) { S.hit = on; save(); if (on && !hitItems) buildHit(); hitG.visible = on && S.mode !== 'items'; }
$('hit').checked = S.hit; $('hit').onchange = () => setHit($('hit').checked);

  return { reg, ELEC, phys, physStats, hitG, elecG, setHit, syncHit, stepPhysics };
}
