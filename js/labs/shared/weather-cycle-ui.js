// Zmienna pogoda w oknie „Światło i pogoda” laboratorium (js/envs/sky/weather-cycle.js): przełącznik „Variable weather”
// pod listą pogód. Włączony — pogoda sama przechodzi między pogodami (tabela przejść, fronty, ziarno), lista pokazuje
// bieżącą; wybranie pogody z listy wyłącza zmienną pogodę (jak w aTrain). Włączenie zapamiętane dla strony.
//
// attachWeatherCycle({ select, apply, every, opts }) → { cycle, on, setOn(b, keep), speed (mnożnik czasu, podgląd ×10 / ×60),
//   onChange(f), push() } — pogoda liczy się we własnej pętli strony (requestAnimationFrame)
//   select — lista pogód okna (#weather); apply(liczby) — laboratorium podaje je niebu (jak WEATHER[id] z polem weather);
//   every — co ile sekund podawać liczby niebu (domyślnie 0.25 s: niebo i odbicia nie liczą się co klatkę)
import { createWeatherCycle } from '../../envs/sky/weather-cycle.js';

const KEY = 'gameLab.weatherCycle.v1';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
const write = (all) => { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* prywatny tryb */ } };

export function attachWeatherCycle({ select, apply, every = 0.25, opts = {} }) {
  const page = location.pathname.split('/').pop() || 'index';
  const mine = read()[page] || {};
  const cycle = createWeatherCycle({ ...opts, ...(mine.opts || {}), start: select.value && select.value !== 'custom' ? select.value : 'fair' });
  const listeners = [];
  let on = false, acc = 1e9, last = performance.now();
  // przełącznik pod wierszem listy
  const lab = document.createElement('label'); lab.className = 'chk';
  const box = document.createElement('input'); box.type = 'checkbox';
  lab.title = 'The weather changes by itself: each weather has its own chances of turning into the others; clouds and wind come first, rain later. Picking a weather from the list switches it off.';
  lab.append(box, document.createTextNode(' Variable weather'));
  (select.closest('.row') || select).after(lab);
  const remember = () => { const all = read(); all[page] = { on, opts: { seed: cycle.opts.seed } }; write(all); };
  function push() {
    const p = cycle.params;
    if (select.querySelector(`option[value="${p.weather}"]`)) select.value = p.weather;
    apply(p);
    listeners.forEach((f) => f(p));
  }
  const api = {
    cycle, speed: 1,
    get on() { return on; },
    // keep — wyłączona bez powrotu do pogody z listy (zostają liczby z tej chwili, np. po ruszeniu suwaka)
    setOn(b, keep = false) {
      b = !!b; if (b === on) return; on = b; box.checked = on;
      if (on) { cycle.set({ start: select.value && select.value !== 'custom' ? select.value : 'fair' }); cycle.reset(); acc = 1e9; push(); }
      else if (!keep) select.dispatchEvent(new Event('change'));   // zostaje pogoda z listy (ta, która była ostatnia)
      remember();
    },
    step(dt) {
      if (!on) return;
      cycle.step(dt * api.speed); acc += dt;
      if (acc >= every) { acc = 0; push(); }
    },
    onChange(f) { listeners.push(f); },
    push,
  };
  box.addEventListener('change', () => api.setOn(box.checked));
  select.addEventListener('change', (e) => { if (e.isTrusted && on) { on = false; box.checked = false; remember(); } });
  const loop = (now) => { const dt = Math.min(0.1, (now - last) / 1000); last = now; api.step(dt); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  if (mine.on) api.setOn(true);
  return api;
}
