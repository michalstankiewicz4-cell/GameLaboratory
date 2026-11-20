// Maszyny złomowiska w działaniu (środowisko: ląd) — podpięcie zachowań z gry Złomowisko (z historią) do modeli JunkKit
// (js/models/junkyard/machines/): zgniatarka do puszek i prasa do metalu (crusher.js), piec na papier (furnace.js),
// piec indukcyjny (induction.js), linia odlewnicza ze strumieniem metalu i dwoma przenośnikami form (casting.js,
// metal-flow.js). Wszystkie na wspólnym świecie przedmiotów (land/items.js): zderzacze modelu (colliders()) jako bryły
// nieruchome, ruchome części jako bryły ruchome. Zasady gry (skup, ceny) zostają w grze.
//
// createMachine(id, root, { W, kit, scene, mod }) → m — root: model w świecie (build(0) modułu `mod`), kit — itemKit
//   m.actions() → [{ id, label, labelPl, kind: 'toggle' | 'button', on }], m.act(id, on), m.tilt(−1 | 0 | 1) (piec),
//   m.hud() → [[etykieta, wartość]], m.frame(dt) — wygląd (ogień, strumień), m.dispose()
//   m.sound() → { loops: [{ key, sound, params, level }], shots: [{ sound, params }] } — dźwięk maszyny teraz (dźwięki
//   ciągłe po kluczu, jednorazowe od ostatniego wywołania); gra go dźwięk sceny (js/scene/sounds.js) w miejscu maszyny
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
      // agregat pracuje, gdy prasa w ruchu (zgniatanie — pod obciążeniem); każde zgniecenie — trzask; docisk — dobicie
      sound: shots((seen) => {
        const out = [], st = c.state;
        if (c.crushed > (seen.crushed || 0)) out.push({ sound: 'crunch', params: { material: can ? 0 : 1, strength: 0.8 } });
        if (st === 'hold' && seen.state !== 'hold') out.push({ sound: 'impact', params: { material: 2, strength: 0.7 } });
        seen.crushed = c.crushed; seen.state = st;
        return { loops: [{ key: 'pump', sound: 'pump', params: { load: st === 'press' || st === 'hold' ? 0.9 : 0.35 }, level: c.busy ? 1 : 0 }], shots: out };
      }),
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
      sound: () => ({ loops: [{ key: 'fire', sound: 'fire', params: { size: 0.2 + f.fire.power * 0.7 }, level: f.fire.power > 0.03 ? Math.min(1, 0.3 + f.fire.power) : 0 }], shots: [] }),
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
      // cewka buczy pod prądem (głośniej z kąpielą), przechył — hydraulika, wylew — syk metalu
      sound: shots((seen) => {
        const moving = Math.abs(f.tilt - (seen.tilt ?? f.tilt)) > 1e-4, pour = f.pourAcc !== (seen.pourAcc ?? f.pourAcc);
        seen.tilt = f.tilt; seen.pourAcc = f.pourAcc;
        return { loops: [{ key: 'coil', sound: 'hum', params: { freq: 50, level: 0.5 + Math.min(0.5, f.melt.volume * 40) }, level: f.power ? 1 : 0 },
          { key: 'tilt', sound: 'pump', params: { load: 0.6 }, level: moving ? 0.8 : 0 },
          { key: 'pour', sound: 'fire', params: { size: 0.25 }, level: pour ? 0.7 : 0 }], shots: [] };
      }),
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
      // przenośnik form jedzie — silnik; gotowa sztabka — stuk metalu; przełożenie rozdzielacza — stuk dźwigni
      sound: shots((seen) => {
        const out = [], made = big.made + small.made;
        if (made > (seen.made ?? made)) out.push({ sound: 'impact', params: { material: 0, strength: 0.6 } });
        if (seen.small != null && flow.small !== seen.small) out.push({ sound: 'impact', params: { material: 1, strength: 0.4 } });
        seen.made = made; seen.small = flow.small;
        return { loops: [{ key: 'conveyor', sound: 'hum', params: { freq: 60, level: 0.7 }, level: big.anim || small.anim ? 1 : 0 }], shots: out };
      }),
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
// sound z pamięcią: f(seen) widzi, co było przy poprzednim wywołaniu (liczniki, stan) — jednorazowe tylko przy zmianie
function shots(f) { const seen = {}; return () => f(seen); }

export function connect(induction, casting) { induction.machine.flow = casting.machine.flow; }
