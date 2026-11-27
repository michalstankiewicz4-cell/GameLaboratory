// City Lab — destruction mode (from Tornado.io's destruction lab): a building of parts (HouseKit, or a Warsaw building
// of this lab turned into parts) in DestructKit's world (js/behaviors/land/destruct/) on the lab's ground. Each part
// breaks by its material, stands while what it rests on stands; the debris are rigid bodies. Tools: a hit at a point
// (impulse, radius), a throw from the camera (an item's real mass and speed — the world computes the impact), a
// tornado (its wind breaks parts and lifts light debris). A village of six buildings for throws and the tornado.
//   createDestructMode({ scene, camera, canvas, orbit, ui, day }) → { enter(), leave(), frame(dt), click(e), api }
//   ui: { L, $, el, status, save } — the lab's state (L.d…) and helpers; day() → 0…1 daylight (the tornado's shading)
import * as THREE from '../../../../vendor/three/three.module.js';
import { createWorld } from '../../../behaviors/land/destruct/world.js';
import { tornadoWind } from '../../../envs/sky/tornado.js';
import { HOUSES, buildHouse, matName, MAT_COL, FALSE_COL } from './houses.js';
import { MISSILES, loadMissiles, makeMissile } from './missiles.js';

export const TOOLS = { hit: 'Hit', throw: 'Throw', wind: 'Tornado' };
export const DEFAULTS = { dType: 'cottage', dSeed: 1, dVillage: false, dTool: 'hit', impulse: 2500, radius: 0.6, missile: 'barrel', speed: 30, wind: 75, core: 4, slow: 1, maxFrag: 2500, pause: false, showMats: false };
const VILLAGE = [['cottage', -14, 6, 0.1], ['kostka', 6, 8, -0.05], ['barn', -8, -16, 0.02], ['garage', 18, -4, 1.57], ['shed', -26, -4, 0.4], ['block', 14, -26, 0]];

export function createDestructMode({ scene, camera, canvas, orbit, ui, day, stage }) {
  const TC = stage.tornadoControl;   // trąba sceny bazowej (js/labs/shared/stage.js), sterowana stąd
  const { L, $, el, status, save } = ui;
  for (const [k, v] of Object.entries(DEFAULTS)) if (L[k] == null || typeof L[k] !== typeof v) L[k] = v;
  if (!HOUSES[L.dType]) L.dType = 'cottage';
  let world = null, twist = null, house = null, builtMs = 0, statT = 0, active = false, missilesReady = false;   // twist: the tornado { x, z, vx, vz, until }

  function rebuild() {
    world.clear();
    const t0 = performance.now();
    if (L.dVillage) VILLAGE.forEach(([t, x, z, r], i) => world.addHouse(buildHouse(t, { seed: L.dSeed + i }), { x, z, rot: r }));
    house = buildHouse(L.dType, { seed: L.dSeed });
    if (!L.dVillage) world.addHouse(house, { x: 0, z: 0 });
    world.maxFragments = L.maxFrag;
    builtMs = performance.now() - t0;
    info(); recolor(); save();
  }
  function recolor() {
    const c = new THREE.Color();
    for (const b of world.buildings) for (const p of b.parts) {
      const col = L.showMats ? c.set(FALSE_COL[p.mat] || '#fff') : (b.tint && (p.mat === 'plaster' || p.mat === 'panel') ? c.copy(b.tint) : c.set(1, 1, 1));
      if (p.handle) world.batches.color(p.handle, col);
      if (p.cells) for (const cl of p.cells) if (cl.on) world.batches.color(cl.h, col);
    }
  }
  function info() {
    $('bName').textContent = L.dVillage ? 'Village' : HOUSES[L.dType].name;
    $('dNote').textContent = L.dVillage ? 'Six different buildings side by side — for throws and the tornado going through.' : HOUSES[L.dType].note;
    const counts = {};
    for (const b of world.buildings) for (const p of b.parts) counts[p.mat] = (counts[p.mat] || 0) + 1;
    $('dMats').replaceChildren(...Object.entries(counts).flatMap(([m, n]) => {
      const sw = el('i'); sw.style.background = (L.showMats ? FALSE_COL : MAT_COL)[m] || '#888';
      return [sw, el('span', { textContent: matName(m) }), el('b', { textContent: String(n) })];
    }));
  }
  function stats() {
    const s = world.stats();
    const rows = [['Parts', `${s.intact} / ${s.parts}`], ['Destroyed', `${Math.round(s.destroyed * 100)} %`], ['Debris', s.fragments.toLocaleString('en')],
      ['Moving', s.active], ['At rest', s.sleep], ['Size', house.size.map((v) => v.toFixed(1)).join(' × ') + ' m']];
    $('dStats').replaceChildren(...rows.flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: String(b) })]));
    if (window.LabPerf) window.LabPerf.modelRows([['Meshes in batches', s.geoms.toLocaleString('en')], ['Vertices', s.verts.toLocaleString('en')], ['Batches (materials)', s.draws], ['Built in', Math.round(builtMs) + ' ms']]);
  }
  function frameCam() { const r = Math.max(...house.size) * (L.dVillage ? 3.5 : 1); orbit.dist = r * 2.2 + 6; orbit.target.set(0, house.size[1] * 0.35, 0); orbit.yaw = 0.6; orbit.pitch = 0.32; }

  /* ---------------- tools ---------------- */
  function setTool(t) { L.dTool = TOOLS[t] ? t : 'hit'; [...$('dTools').children].forEach((b) => b.classList.toggle('on', b.dataset.t === L.dTool)); save(); }
  $('dTools').replaceChildren(...Object.entries(TOOLS).map(([k, v], i) => { const b = el('button', { type: 'button', textContent: v, title: `${v} (${i + 1})` }); b.dataset.t = k; b.onclick = () => setTool(k); return b; }));
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(world.batches.meshes(), false);
    if (hits.length) return hits[0].point;
    return ray.ray.intersectPlane(groundPlane, new THREE.Vector3());
  }
  function act(e) {
    const p = pick(e); if (!p) return;
    if (L.dTool === 'hit') {
      const n = world.hit(p, ray.ray.direction.clone().multiplyScalar(L.impulse), { radius: L.radius });
      status(n ? `Broke: ${n}` : 'The part held — hit harder or once more');
    } else if (L.dTool === 'throw') {
      if (!missilesReady) { status('The items are still being built…'); return; }
      const it = makeMissile(L.missile, { variant: Math.floor(Math.random() * 4) });
      const from = camera.position.clone().addScaledVector(ray.ray.direction, 2);
      it.obj.position.copy(from); scene.add(it.obj);
      const b = world.addObject(it.obj, { ...it, sleep: false });
      // a ballistic path: aimed a little higher so that it lands on the point despite gravity
      const d = p.clone().sub(from), tFlight = d.length() / L.speed;
      b.v.copy(d).divideScalar(tFlight); b.v.y += 0.5 * 9.81 * tFlight;
      b.w.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(6);
      status(`${it.name}: ${it.m < 1 ? it.m.toFixed(2) : Math.round(it.m)} kg × ${L.speed} m/s = ${Math.round(it.m * L.speed)} N·s`);
    } else {
      twist = { x: p.x, z: p.z, vx: 0, vz: 0, until: Infinity };
      status('A tornado at that point — Stop switches it off');
    }
  }
  function sweep() { const r = Math.max(30, house.size[0] + 25); twist = { x: -r, z: (Math.random() - 0.5) * 4, vx: 5, vz: 0, until: r }; status('The tornado goes through the building'); }
  function stop() { twist = null; TC.drive(null); status(''); }

  /* ---------------- window Destruction ---------------- */
  $('dType').replaceChildren(...Object.entries(HOUSES).map(([k, v]) => el('option', { value: k, textContent: v.name })));
  $('dType').value = L.dType; $('dType').onchange = () => { L.dType = $('dType').value; L.dVillage = false; rebuild(); frameCam(); };
  $('dSeed').value = L.dSeed; $('dSeed').onchange = () => { L.dSeed = Math.max(1, Math.round(+$('dSeed').value || 1)); $('dSeed').value = L.dSeed; rebuild(); };
  $('dAnother').onclick = () => { L.dSeed = 1 + Math.floor(Math.random() * 99998); $('dSeed').value = L.dSeed; L.dVillage = false; rebuild(); };
  $('dVillage').onclick = () => { L.dVillage = true; rebuild(); frameCam(); };
  $('dRebuild').onclick = () => { stop(); rebuild(); };
  $('showMats').checked = L.showMats; $('showMats').onchange = () => { L.showMats = $('showMats').checked; recolor(); info(); save(); };
  $('missile').replaceChildren(...Object.entries(MISSILES).map(([k, v]) => el('option', { value: k, textContent: v.name })));
  $('missile').value = L.missile; $('missile').onchange = () => { L.missile = $('missile').value; save(); };
  $('sweep').onclick = sweep; $('stop').onclick = stop;
  const fmt = { impulse: (v) => `${(+v).toLocaleString('en')} N·s`, radius: (v) => `${(+v).toFixed(2)} m`, speed: (v) => `${v} m/s`, wind: (v) => `${v} m/s`, core: (v) => `${(+v).toFixed(1)} m`,
    slow: (v) => `× ${(+v).toFixed(2)}`, maxFrag: (v) => (+v).toLocaleString('en') };
  for (const [k, f] of Object.entries(fmt)) {
    $(k).value = L[k]; $(k + 'V').textContent = f(L[k]);
    $(k).oninput = () => { L[k] = +$(k).value; $(k + 'V').textContent = f(L[k]); if (k === 'maxFrag' && world) world.maxFragments = L.maxFrag; save(); };
  }
  $('pause').checked = L.pause; $('pause').onchange = () => { L.pause = $('pause').checked; save(); };
  addEventListener('keydown', (e) => {
    if (!active || e.target.closest('input,select,textarea')) return;
    if (e.code === 'Digit1') setTool('hit'); if (e.code === 'Digit2') setTool('throw'); if (e.code === 'Digit3') setTool('wind');
    if (e.code === 'KeyB') { stop(); rebuild(); }
  });

  /* ---------------- step ---------------- */
  function simStep(dt) {
    // the tornado: a whirl of the sliders' size, going in a straight line or standing
    if (twist) {
      twist.x += twist.vx * dt; twist.z += twist.vz * dt;
      if (twist.x > twist.until) { twist = null; TC.drive(null); }
      else TC.drive({ strength: Math.min(1, L.wind / 100), rc: L.core, top: 30 + L.core * 12, vmax: L.wind, kind: 'land' });
    }
    const T = TC.step(dt, twist ? [twist.x, twist.z] : null, { camera, groundAt: () => 0, isWater: () => false, light: Math.min(1, day() + 0.2) });
    if (twist && T) { world.tornadoDamage(T, (x, y, z, out) => tornadoWind(T, x, y, z, out), dt); }   // DestructKit
    if (dt > 0) world.update(dt); else world.sync();
  }

  const api = {
    types: Object.fromEntries(Object.entries(HOUSES).map(([k, v]) => [k, v.name])),
    build(type, seed) { if (type && HOUSES[type]) L.dType = type; if (Number.isInteger(seed) && seed >= 1) L.dSeed = seed; L.dVillage = false; $('dType').value = L.dType; $('dSeed').value = L.dSeed; rebuild(); frameCam(); return world.stats(); },
    village() { L.dVillage = true; rebuild(); frameCam(); return world.stats(); },
    hit(p, j, radius = 0.6) { return world.hit(new THREE.Vector3(...p), new THREE.Vector3(...j), { radius }); },
    sweep, stop,
    tornadoAt(x, z) { twist = { x, z, vx: 0, vz: 0, until: Infinity }; },
    // a simulation without drawing: seconds of game time in 1/30 s steps (the tornado, the wind, the debris)
    simulate(sec = 1) { for (let t = 0; t < sec; t += 1 / 30) simStep(1 / 30); return world.stats(); },
    stats: () => world.stats(),
    get world() { return world; },
  };

  return {
    api,
    enter() {
      active = true; TC.drive(null);   // trąba pogody gaśnie, steruje nią ten tryb
      if (!world) {
        TC.drive(null);
        world = createWorld(scene, { ground: () => 0, wind: (x, y, z, out) => (twist && TC.state ? tornadoWind(TC.state, x, y, z, out) : (out[0] = out[1] = out[2] = 0, out)) });
        loadMissiles().then(() => { missilesReady = true; });
      }
      setTool(L.dTool); rebuild(); frameCam();
    },
    leave() { active = false; if (world) { stop(); world.clear(); } TC.release(); status(''); },
    click(e) { act(e); },
    frame(rdt) {
      if (!active || !world) return;   // zapamiętany tryb Zniszczenie: pętla rusza przed wejściem w tryb (po zbudowaniu budynku)
      simStep(L.pause ? 0 : rdt * L.slow);
      if ((statT += rdt) > 0.25) { statT = 0; stats(); }
    },
    get size() { return house ? Math.max(...house.size) * (L.dVillage ? 3.5 : 1.6) : 30; },
  };
}
