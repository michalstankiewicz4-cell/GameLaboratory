// Klawiatura gracza w trybie gry: z wciśniętych klawiszy sterowanie dla zachowań (js/scene/behaviors.js).
// Klawisze czynności z ustawień gry gracza (js/gameui/settings.js, settings.keys — kody KeyboardEvent.code, niezależne
// od układu klawiatury; zmienia je menu Sterowanie UI gry). Domyślnie: W / S gaz, A / D skręt, Q / E ster kierunku,
// strzałki — nos i przechył (przeładowarka: wysięgnik i obrót), B hamulec, spacja — silniki podnośne / chwytak,
// G podwozie, F klapy, R / F ramię przeładowarki.
// Maszyny / gaz to dźwignia: zostaje, gdzie ją ustawić (pojazd lądowy: pedał — działa, póki wciśnięty); stery wracają
// na środek po puszczeniu klawisza; podwozie i klapy przełączają. Zakres dźwigni podaje zachowanie (throttle: [min, max]).
import { DEFAULTS } from '../../../js/gameui/settings.js';

export function createInput(getKeys = () => DEFAULTS.keys) {
  const down = new Set();   // wciśnięte kody
  let range = [0, 1], thr = 0, gear = true, flaps = false, on = false, lever = true;   // lever: false — pedał (samochód)
  const keys = () => ({ ...DEFAULTS.keys, ...(getKeys() || {}) });

  addEventListener('keydown', (e) => {
    if (!on || (e.target.closest && e.target.closest('input, select, textarea'))) return;
    const k = keys(), acts = Object.keys(k).filter((a) => k[a] === e.code); if (!acts.length) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (!e.repeat) { if (acts.includes('gear')) gear = !gear; if (acts.includes('flaps')) flaps = !flaps; }
    down.add(e.code);
  }, true);
  addEventListener('keyup', (e) => { down.delete(e.code); });
  addEventListener('blur', () => down.clear());

  return {
    // nowy gracz: dźwignia tam, gdzie stoi w modelu (na postoju zero), podwozie wypuszczone, klapy schowane
    reset(b, thr0 = 0) { range = (b && b.throttle) || [0, 1]; lever = !b || b.lever !== false; thr = Math.max(range[0], Math.min(range[1], thr0)); gear = true; flaps = false; down.clear(); on = true; },
    release() { on = false; down.clear(); },
    read(dt) {
      const k = keys(), has = (a) => down.has(k[a]), axis = (plus, minus) => (has(plus) ? 1 : 0) - (has(minus) ? 1 : 0);
      thr = lever ? Math.max(range[0], Math.min(range[1], thr + axis('forward', 'back') * 0.5 * dt)) : axis('forward', 'back');   // dźwignia zostaje, pedał wraca
      return {
        throttle: thr,
        rudder: Math.max(-1, Math.min(1, axis('right', 'left') + axis('yawRight', 'yawLeft'))),
        elevator: axis('down', 'up'),
        aileron: axis('rollRight', 'rollLeft'),
        brake: has('brake') ? 1 : 0,
        lift: has('lift') ? 1 : 0,
        stick: axis('stickOut', 'stickIn'),   // ramię przeładowarki
        gear, flaps,
      };
    },
  };
}
