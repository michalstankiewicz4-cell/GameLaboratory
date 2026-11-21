// Zmienna pogoda w scenie: silnik, wspólny dla edytora (▶ Graj) i gier. Gdy światło sceny (env.light) to zasób
// „weather” z laboratorium wyglądu z włączoną zmienną pogodą (pole cycle: { on, seed, hold, change, fronts, table }),
// pogoda w grze sama przechodzi między pogodami (js/envs/sky/weather-cycle.js — tabela przejść, fronty, ziarno),
// zaczynając od pogody zasobu. Pora dnia, słońce i księżyc zostają z zasobu.
// createSceneWeather(apply) → { start(env), stop(), frame(dt), force(id, s?), set(on), now, params, upcoming(n), on }
//   apply(liczby | null) — gra podaje liczby niebu i światłu (edytor: world.setWeather); null — pogoda z zasobu
import { createWeatherCycle } from '../envs/sky/weather-cycle.js';
import { getAsset } from './assets.js';

const EVERY = 0.5;   // s między podaniem liczb niebu (niebo i odbicia nie liczą się co klatkę)

export function createSceneWeather(apply, { get = getAsset } = {}) {
  let cycle = null, acc = 0, base = null;
  const api = {
    get on() { return !!cycle; },
    get now() { return cycle ? cycle.now : null; },
    get params() { return cycle ? cycle.params : null; },
    upcoming: (n = 6) => (cycle ? cycle.upcoming(n) : []),
    start(env = {}) {
      api.stop();
      const a = env.light ? get('weather', env.light) : null;
      base = a || null;
      if (!a || !a.cycle || !a.cycle.on) return false;
      const { on, ...opts } = a.cycle;
      cycle = createWeatherCycle({ ...opts, start: a.weather });
      acc = 0; apply(cycle.step(0));
      return true;
    },
    frame(dt) {
      if (!cycle) return;
      cycle.step(dt); acc += dt;
      if (acc >= EVERY) { acc = 0; apply(cycle.params); }
    },
    // w grze: przejście do pogody teraz (włącza zmienną pogodę, gdy zasób ją ma wyłączoną)
    force(id, seconds) {
      if (!cycle) { if (!base) throw new Error('the scene light is not a weather asset'); const { on, ...opts } = base.cycle || {}; cycle = createWeatherCycle({ ...opts, start: base.weather }); }
      const n = cycle.force(id, seconds); apply(cycle.params); return n;
    },
    stop() { if (cycle) apply(null); cycle = null; },
  };
  return api;
}
