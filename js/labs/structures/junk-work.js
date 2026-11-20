// Laboratorium budowli — maszyny złomowiska w działaniu: zachowania z gry Złomowisko (js/behaviors/land/machines/,
// z historią) na świecie przedmiotów GameLaboratory (js/behaviors/land/items.js). Przyciski maszyny (start / stop,
// zasilanie, przechył, rozdzielacz) i wsadu (przedmioty JunkKit wpadają do leja, komory, pieca, tygla); piec indukcyjny
// stoi razem z linią odlewniczą (jak w grze: linia 0,62 m przed piecem) — metal z tygla spływa rynną do form.
import * as THREE from '../../../vendor/three/three.module.js';
import { createItems } from '../../behaviors/land/items.js';
import { itemKit } from '../../behaviors/land/junk-items.js';
import { createMachine, connect, MACHINE_IDS, CASTING_FROM_INDUCTION } from '../../behaviors/land/machines/machines.js';
import { junkEntry } from '../../models/junkyard/registry.js';
import { applyTextures } from '../../models/junkyard/textures.js';
import { LIQUID_TIME } from '../../render/liquid.js';

const $ = (id) => document.getElementById(id);
const rnd = (a) => (Math.random() - 0.5) * 2 * a;
const qRand = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(Math.PI), rnd(Math.PI), rnd(Math.PI)));

// wsad: [etykieta, rodzaje (losowo), liczba] — gdzie wpada (w układzie modelu) liczy feedAt
const FEED = {
  'can-crusher': [['Drop 20 cans', ['can'], 20], ['Drop 5 crushed cans', ['can-crushed'], 5]],
  'metal-crusher': [['Drop a drum', ['barrel'], 1], ['Drop pots and tyres', ['pot', 'pot', 'tire-car', 'tire-bike'], 4], ['Drop boxes and papers', ['box', 'newspapers'], 3]],
  'furnace-paper': [['Put in papers', ['newspapers'], 2], ['Put in boxes', ['box'], 3], ['Put in a pot (does not burn)', ['pot'], 1]],
  'induction-furnace': [['Drop 20 cans (aluminium)', ['can'], 20], ['Drop 4 pots (steel)', ['pot'], 4]],
  'casting-line': [['Drop 20 cans (aluminium)', ['can'], 20], ['Drop 4 pots (steel)', ['pot'], 4]],
};
const NOTES = {
  'can-crusher': 'The ram pushes the cans to the gate and crushes the weakest in its way (9 kN); a can crushed to half becomes a crushed can. Then the gate opens and the ram pushes them out onto the chute.',
  'metal-crusher': 'The 400 kN platen comes down, pushes what lies in the chamber and crushes it along the axis that faces it, each item by its own strength and down to its own limit; too strong — the press stops and goes back.',
  'furnace-paper': 'Paper and cardboard in the burning zone burn (newspapers 40 s, a box 18 s): they glow and go; the fire grows with what burns. Anything else just lies there.',
  'induction-furnace': 'Power on: the metal in the crucible heats up (lighter items faster), glows and melts into the bath (aluminium 660 °C, steel 1450 °C). Tilt the crucible (R / F or the buttons): the melt pours down the trough of the casting line into the moulds, where it sets into ingots.',
  'casting-line': 'Metal from the induction furnace runs down the trough into a mould; a full mould moves the conveyor on by one pitch. The diverter sends it to the large or the small moulds. In the mould it cools and sets into an ingot.',
};

export function createJunkWork(scene) {
  let W = null, kit = null, machines = [], spawnRoot = null, extra = null, seq = 0, keyHold = 0;
  const keys = {};
  addEventListener('keydown', (e) => { if (!e.target.closest || !e.target.closest('input, select, textarea')) keys[e.code] = true; });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  function clear() {
    machines.forEach((m) => m.dispose()); machines = [];
    if (spawnRoot) { scene.remove(spawnRoot); spawnRoot = null; }
    if (extra) { scene.remove(extra); extra.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); extra = null; }
    W = null;
    $('workPanel').hidden = true;
  }
  // punkt wsadu w świecie: nad lejem, nad komorą, w strefie spalania, nad tyglem
  function feedAt(m, i) {
    const L = m.mod.LAYOUT, r = m.root;
    let p;
    if (m.id === 'can-crusher') p = [rnd(0.55), L.hopper.top + 0.15 + i * 0.07, rnd(0.35)];
    else if (m.id === 'metal-crusher') p = [rnd(0.9), L.chamber.center[1] + L.chamber.half[1] + 0.6 + i * 0.6, rnd(0.5)];
    else if (m.id === 'furnace-paper') p = [rnd(0.6), L.burn.center[1] + 0.2 + i * 0.35, L.burn.center[2] + rnd(0.35)];
    else {
      const t = m.root.getObjectByName('tygiel');
      return new THREE.Vector3(rnd(0.12), L.inner.top + 0.25 + i * 0.09, L.inner.cz + rnd(0.12)).applyMatrix4(t.matrixWorld).toArray();
    }
    return new THREE.Vector3(...p).applyMatrix4(r.matrixWorld).toArray();
  }
  function feed(id, kinds, n) {
    const m = machines.find((x) => x.id === (id === 'casting-line' ? 'induction-furnace' : id)); if (!m) return;
    for (let i = 0; i < n; i++) kit.spawn(W, kinds[(Math.random() * kinds.length) | 0], { at: feedAt(m, i), q: qRand(), variant: i, parent: spawnRoot });
    applyTextures();
  }

  function buttons(id) {
    const acts = $('workActs'); acts.replaceChildren();
    for (const m of machines) for (const a of m.actions()) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.m = m.id; b.dataset.a = a.id;
      b.onclick = () => { m.act(a.id); b.blur(); refresh(); };
      acts.append(b);
    }
    const tilt = machines.find((m) => m.tilt);
    if (tilt) {
      for (const [label, cmd] of [['Tilt to pour (R)', 1], ['Tilt back (F)', -1]]) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
        const off = () => { tilt.tilt(0); b.blur(); };
        b.addEventListener('pointerdown', () => tilt.tilt(cmd)); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off);
        acts.append(b);
      }
    }
    $('workFeed').replaceChildren(...FEED[id].map(([label, kinds, n]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = () => { feed(id, kinds, n); b.blur(); }; return b;
    }), (() => { const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Clear the items'; b.onclick = () => { for (const it of [...W.list]) W.remove(it); b.blur(); }; return b; })());
    refresh();
  }
  function refresh() {
    for (const b of $('workActs').querySelectorAll('button[data-a]')) {
      const m = machines.find((x) => x.id === b.dataset.m), a = m && m.actions().find((x) => x.id === b.dataset.a); if (!a) continue;
      b.textContent = (m.id === 'casting-line' && a.id === 'diverter') ? (a.on ? 'Diverter: small moulds' : 'Diverter: large moulds') : a.id === 'power' ? (a.on ? 'Power off' : 'Power on') : a.id === 'pour' ? (a.on ? 'Tilt back' : 'Tilt to pour') : a.label;
      b.classList.toggle('on', !!a.on);
    }
  }

  return {
    get W() { return W; },
    get machines() { return machines; },
    feed,
    /** Maszyna złomowiska `id` (model g w scenie) w działaniu; inne (otoczenie) — bez. */
    async start(id, g, mod) {
      const my = ++seq;
      clear();
      if (!MACHINE_IDS.includes(id)) return;
      if (!kit) kit = await itemKit();
      if (my !== seq) return;
      W = createItems({ ground: { height: () => 0 } });
      spawnRoot = new THREE.Group(); spawnRoot.name = 'junkyard items'; scene.add(spawnRoot);
      g.updateMatrixWorld(true);
      const m = createMachine(id, g, { W, kit, scene, mod }); m.mod = mod; machines.push(m);
      // piec indukcyjny i linia odlewnicza razem (jak w grze)
      if (id === 'induction-furnace' || id === 'casting-line') {
        const otherId = id === 'induction-furnace' ? 'casting-line' : 'induction-furnace', om = await junkEntry(otherId).load(); if (my !== seq) return;
        extra = om.build(0); applyTextures();
        const d = CASTING_FROM_INDUCTION, s = id === 'induction-furnace' ? 1 : -1;
        extra.position.set(g.position.x + s * d[0], g.position.y, g.position.z + s * d[2]);
        extra.traverse((o) => { if (o.isMesh && !o.material.isMeshBasicMaterial) { o.castShadow = true; o.receiveShadow = true; } });
        scene.add(extra); extra.updateMatrixWorld(true);
        const o = createMachine(otherId, extra, { W, kit, scene, mod: om }); o.mod = om; machines.push(o);
        const ind = machines.find((x) => x.id === 'induction-furnace'), cast = machines.find((x) => x.id === 'casting-line');
        connect(ind, cast);
      }
      $('workNote').textContent = NOTES[id];
      $('workPanel').hidden = false;
      buttons(id);
    },
    stop: clear,
    frame(dt) {
      if (!W) return;
      // R / F przechylają tygiel, póki wciśnięte (jak przy pulpicie w grze)
      const tilt = machines.find((m) => m.tilt), hold = (keys.KeyR ? 1 : 0) - (keys.KeyF ? 1 : 0);
      if (tilt && hold) tilt.tilt(hold); else if (tilt && keyHold) tilt.tilt(0);
      keyHold = hold;
      W.step(dt); W.sync(); kit.glow(W);
      for (const m of machines) m.frame(dt);
      LIQUID_TIME.value += dt;
    },
    hud() {
      if (!W) return;
      const rows = machines.flatMap((m) => m.hud(false)).concat([['Items', String(W.list.length)]]);
      const t = $('workStats');
      t.replaceChildren(...rows.map(([k, v]) => { const tr = document.createElement('tr'), a = document.createElement('td'), b = document.createElement('td'); a.textContent = k; b.textContent = v; tr.append(a, b); return tr; }));
      refresh();
    },
  };
}
