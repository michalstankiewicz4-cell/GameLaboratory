// Maszyny złomowiska w działaniu (środowisko: ląd) — podpięcie zachowań z gry Złomowisko (z historią) do modeli JunkKit
// (js/models/junkyard/machines/): zgniatarka do puszek i prasa do metalu (crusher.js), piec na papier (furnace.js),
// piec indukcyjny (induction.js), linia odlewnicza ze strumieniem metalu i dwoma przenośnikami form (casting.js,
// metal-flow.js). Wszystkie na wspólnym świecie przedmiotów (land/items.js): zderzacze modelu (colliders()) jako bryły
// nieruchome, ruchome części jako bryły ruchome. Zasady gry (skup, ceny) zostają w grze.
//
// createMachine(id, root, { W, kit, scene, mod }) → m — root: model w świecie (build(0) modułu `mod`), kit — itemKit
//   m.actions() → [{ id, label, labelPl, kind: 'toggle' | 'button', on }], m.act(id, on), m.tilt(−1 | 0 | 1) (piec),
//   m.hud() → [[etykieta, wartość]], m.frame(dt) — wygląd (ogień, strumień), m.dispose()
// connect(induction, casting) — piec indukcyjny wylewa do rynny linii odlewniczej (jak w grze: linia 0,62 m przed piecem)
import { Crusher } from './crusher.js';
import { PaperFurnace } from './furnace.js';
import { InductionFurnace } from './induction.js';
import { Casting, INGOT_SMALL } from './casting.js';
import { MetalFlow } from './metal-flow.js';
import { addModelStatics } from './statics.js';

export const ENVIRONMENTS = ['land'];
export const MACHINE_IDS = ['can-crusher', 'metal-crusher', 'furnace-paper', 'induction-furnace', 'casting-line'];
// linia odlewnicza względem pieca indukcyjnego (gra: PLACES.casting = piec + [0, 0, 0,62])
export const CASTING_FROM_INDUCTION = [0, 0, 0.62];

export function createMachine(id, root, { W, kit, scene, mod }) {
  const L = mod.LAYOUT, unStatic = addModelStatics(W, mod.colliders(), root);
  let m = null;
  if (id === 'can-crusher' || id === 'metal-crusher') {
    const can = id === 'can-crusher';
    const c = new Crusher(can
      ? { name: 'Can crusher', W, kit, root, layout: L, axis: 'x', ramGroup: root.getObjectByName('tłok'), doorGroup: root.getObjectByName('zasuwa'), eject: true, wall: L.door.x - L.door.size[0] / 2 }
      : { name: 'Metal crusher', W, kit, root, layout: L, axis: '-y', ramGroup: root.getObjectByName('płyta dociskowa'), doorGroup: root.getObjectByName('brama'), eject: false, wall: -(L.chamber.center[1] - L.chamber.half[1] + 0.06) });
    m = {
      machine: c,
      actions: () => [{ id: 'run', label: c.busy ? 'Stop' : 'Start', labelPl: c.busy ? 'Stop' : 'Start', kind: 'toggle', on: c.busy }],
      act(a, on) { if (a === 'run') { const go = on == null ? !c.busy : !!on; if (go) c.start(); else c.stop(); } },
      hud: (pl) => [[pl ? 'Stan' : 'State', c.status(pl)], [pl ? 'Siła' : 'Force', (L.ram.force / 1000).toLocaleString('en') + ' kN'], [pl ? 'Zgnieceń' : 'Crush steps', String(c.crushed)]],
      frame() {},
      dispose() { c.dispose(); },
    };
  } else if (id === 'furnace-paper') {
    const f = new PaperFurnace(scene, W, root, L);
    m = {
      machine: f,
      actions: () => [],
      act() {},
      hud: (pl) => [[pl ? 'Płonie' : 'Burning', String(f.burning)], [pl ? 'Spalone' : 'Burnt', String(f.burned)], [pl ? 'Ogień' : 'Fire', Math.round(f.fire.power * 100) + '%']],
      frame(dt) { f.frame(dt); },
      dispose() { f.dispose(); },
    };
  } else if (id === 'induction-furnace') {
    const f = new InductionFurnace(W, root, L, mod.crucibleColliders());
    m = {
      machine: f,
      actions: () => [{ id: 'power', label: 'Power', labelPl: 'Zasilanie', kind: 'toggle', on: f.power },
        { id: 'pour', label: 'Tilt to pour', labelPl: 'Przechył do wylewu', kind: 'toggle', on: f.tiltCmd > 0 }],
      act(a, on) {
        if (a === 'power') f.power = on == null ? !f.power : !!on;
        if (a === 'pour') f.tiltCmd = (on == null ? !(f.tiltCmd > 0) : !!on) ? 1 : -1;
      },
      tilt(cmd) { f.tiltCmd = cmd; },
      hud: (pl) => {
        const mm = f.melt.mass, tot = mm.aluminium + mm.steel;
        return [[pl ? 'Zasilanie' : 'Power', f.power ? (pl ? 'włączone' : 'on') : (pl ? 'wyłączone' : 'off')], [pl ? 'Przechył' : 'Tilt', (f.tilt * 57.2958).toFixed(0) + '°'],
          [pl ? 'Kąpiel' : 'Melt', (f.melt.volume * 1000).toFixed(1) + ' l · ' + tot.toFixed(1) + ' kg'], [pl ? 'Aluminium / stal' : 'Aluminium / steel', mm.aluminium.toFixed(1) + ' / ' + mm.steel.toFixed(1) + ' kg']];
      },
      frame() {},
      dispose() { f.dispose(); },
    };
  } else if (id === 'casting-line') {
    const flow = new MetalFlow(scene, root, L);
    // jak w grze: strumień, potem formy; strumień czeka w dyszy, gdy jego przenośnik jedzie
    const unFlow = W.hook((h) => { flow.blocked = !!(flow.small ? small.anim : big.anim); flow.step(h); });
    const big = new Casting(W, kit, root, L, flow), small = new Casting(W, kit, root, L, flow, { group: 'formy małe', dims: INGOT_SMALL, pitch: L.pitch2, moldZ: L.moldZ2, kind: 'ingot-small' });
    const gate = root.getObjectByName('zasuwa rozdzielacza'), lever = root.getObjectByName('dźwignia');
    const setDiverter = (s) => { flow.small = s; gate.position.z = s ? L.moldZ : L.moldZ2; lever.rotation.x = s ? 0.5 : -0.5; };
    setDiverter(false);
    m = {
      machine: { flow, big, small },
      actions: () => [{ id: 'diverter', label: 'Small moulds', labelPl: 'Małe formy', kind: 'toggle', on: flow.small }],
      act(a, on) { if (a === 'diverter') setDiverter(on == null ? !flow.small : !!on); },
      hud: (pl) => [[pl ? 'Rozdzielacz' : 'Diverter', flow.small ? (pl ? 'małe formy' : 'small moulds') : (pl ? 'duże formy' : 'large moulds')],
        [pl ? 'Metal w rynnie' : 'Metal in the trough', (flow.n * flow.dV * 1000).toFixed(2) + ' l'], [pl ? 'Sztabki' : 'Ingots', big.made + ' + ' + small.made],
        [pl ? 'Rozlany' : 'Spilt', (flow.wasted * 1000).toFixed(2) + ' l']],
      frame() { flow.draw(); },
      dispose() { unFlow(); big.dispose(); small.dispose(); flow.dispose(); },
    };
  }
  if (!m) { unStatic(); return null; }
  const dispose = m.dispose;
  m.id = id; m.root = root;
  m.dispose = () => { dispose(); unStatic(); };
  return m;
}

/** Piec indukcyjny wylewa do rynny linii odlewniczej. */
export function connect(induction, casting) { induction.machine.flow = casting.machine.flow; }
