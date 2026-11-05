// Klawiatura gracza w trybie gry: z wciśniętych klawiszy sterowanie dla zachowań (js/scene/behaviors.js).
// Maszyny / gaz (W / S) to dźwignia: zostaje, gdzie ją ustawić; stery wracają na środek po puszczeniu klawisza;
// podwozie (G) i klapy (F) przełączają. Zakres dźwigni podaje zachowanie (throttle: [min, max]).
export function createInput() {
  const down = new Set();
  let range = [0, 1], thr = 0, gear = true, flaps = false, on = false;
  const PLAY_KEYS = ['w', 's', 'a', 'd', 'q', 'e', 'b', 'g', 'f', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];

  addEventListener('keydown', (e) => {
    if (!on || (e.target.closest && e.target.closest('input, select, textarea'))) return;
    const k = e.key.toLowerCase(); if (!PLAY_KEYS.includes(k)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (!e.repeat) { if (k === 'g') gear = !gear; else if (k === 'f') flaps = !flaps; }
    down.add(k);
  }, true);
  addEventListener('keyup', (e) => { down.delete(e.key.toLowerCase()); });
  addEventListener('blur', () => down.clear());

  const axis = (plus, minus) => (down.has(plus) ? 1 : 0) - (down.has(minus) ? 1 : 0);
  return {
    // nowy gracz: dźwignia tam, gdzie stoi w modelu (na postoju zero), podwozie wypuszczone, klapy schowane
    reset(b, thr0 = 0) { range = (b && b.throttle) || [0, 1]; thr = Math.max(range[0], Math.min(range[1], thr0)); gear = true; flaps = false; down.clear(); on = true; },
    release() { on = false; down.clear(); },
    read(dt) {
      thr = Math.max(range[0], Math.min(range[1], thr + axis('w', 's') * 0.5 * dt));
      return {
        throttle: thr,
        rudder: Math.max(-1, Math.min(1, axis('d', 'a') + axis('e', 'q'))),
        elevator: axis('arrowdown', 'arrowup'),
        aileron: axis('arrowright', 'arrowleft'),
        brake: down.has('b') ? 1 : 0,
        gear, flaps,
      };
    },
  };
}
