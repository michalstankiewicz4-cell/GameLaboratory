// Dźwięk szyn: zdarzenia akustyczne fizyki „koło na szynie” (js/behaviors/rail/physics.js — jak w aTrain: styk szyn,
// podkład, sprzęg, łańcuch, zderzak; miejsce i siła 0…1) grane przez SfxKit w miejscu (mikser silnika, szyna efektów),
// do tego toczenie z prędkością składu i pisk obrzeży kół z mocy tarcia obrzeża (b.flangeP).
// createRailSounds() → { listen(sim, kroki) — wołać po krokach fizyki, przed wyczyszczeniem sim.events; stop() }
import { play, start } from './sfx/sfxkit.js';

// rodzaj zdarzenia → uderzenie SfxKit (materiał: 0 metal, 1 drewno, 2 ciężki, 3 łańcuch; aTrain: partials)
const HIT = { joint: [2, 0.8], sleeper: [1, 0.6], knuckle: [0, 1], chain: [3, 1], buffer: [2, 1] };
const MAX_PER_FRAME = 10;   // najwięcej uderzeń na klatkę (wiele zestawów kołowych naraz)

export function createRailSounds() {
  let roll = null, squeal = null;
  return {
    listen(sim, steps = 1) {
      const evs = sim.events || [];
      for (let i = 0; i < evs.length && i < MAX_PER_FRAME; i++) {
        const e = evs[i], h = HIT[e.k]; if (!h) continue;
        try { play({ sound: 'impact', params: { material: h[0], strength: Math.max(0.05, Math.min(1, e.s * h[1])) } }, { at: [e.x, e.y, e.z], ref: 8 }); } catch { /* bez dźwięku */ }
      }
      // toczenie (bez własnych stuków — dają je zdarzenia) i pisk: średnia moc tarcia obrzeży w tej klatce
      const v = Math.abs((sim.st && sim.st.speed) || 0), b0 = sim.bodies && sim.bodies[0];
      let fp = 0; for (const b of sim.bodies || []) { fp += b.flangeP || 0; b.flangeP = 0; }
      fp /= Math.max(1, steps);
      const at = b0 && b0.p ? [b0.p[0], b0.p[1], b0.p[2]] : null;
      if (!roll) { roll = start({ sound: 'rail', params: { speed: v, clacks: 0 } }, { at, ref: 15, bus: 'sfx' }); squeal = start({ sound: 'squeal', params: { strength: 0 } }, { at, ref: 15, bus: 'sfx', gain: 0 }); }
      if (at) { roll.move(at); squeal.move(at); }
      roll.set({ speed: v, clacks: 0 });
      const sq = Math.min(1, fp / 30000);
      squeal.set({ strength: sq }, sq > 0.05 && v > 1 ? Math.min(1, sq * 1.5) : 0);
    },
    stop() { if (roll) roll.stop(0.3); if (squeal) squeal.stop(0.3); roll = squeal = null; },
  };
}
