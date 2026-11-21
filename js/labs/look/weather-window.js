// Laboratorium wyglądu — okno „Variable weather” (zmienna pogoda, js/envs/sky/weather-cycle.js): bieżąca pogoda
// i przejście, pasek i lista nadchodzących pogód, podgląd z przyspieszeniem (×1 / ×10 / ×60), zmiana pogody teraz,
// ustawienia (fronty, ziarno, czas trwania pogody i przejścia) i tabela przejść. Przełącznik jest w oknie
// „Światło i pogoda” (js/labs/shared/weather-cycle-ui.js). Ustawienia — S.sky.cycle (zapis z pogodą dla sceny).
// weatherWindow({ wc, get, set }) — wc: attachWeatherCycle(…); get() → S.sky.cycle; set(ustawienia) — zapis
import { WEATHER } from '../../envs/sky/skykit.js';
import { CYCLE_DEFAULTS } from '../../envs/sky/weather-cycle.js';

const $ = (id) => document.getElementById(id);
const IDS = Object.keys(WEATHER);
const SHORT = { clear: 'Clear', fair: 'Fair', broken: 'Broken', overcast: 'Overc.', rain: 'Rain', fog: 'Fog', storm: 'Storm' };
const clone = (o) => JSON.parse(JSON.stringify(o));
const mmss = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const label = (id) => (WEATHER[id] ? WEATHER[id].label : id);

export function weatherWindow({ wc, get, set }) {
  const C = () => ({ ...clone(CYCLE_DEFAULTS), ...(get() || {}) });
  const store = (o) => { const c = { ...C(), ...o }; set(c); const { on, ...opts } = c; wc.cycle.set(opts); show(); };
  // podgląd z przyspieszeniem
  for (const k of [1, 10, 60]) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = '×' + k; b.dataset.k = k;
    b.onclick = () => { wc.speed = k; [...$('wcSpeed').children].forEach((x) => x.classList.toggle('on', +x.dataset.k === k)); };
    $('wcSpeed').append(b);
  }
  $('wcSpeed').firstChild.classList.add('on');
  // zmiana teraz
  IDS.forEach((id) => $('wcGo').append(new Option(label(id), id)));
  $('wcGoNow').onclick = () => { if (!wc.on) wc.setOn(true); wc.cycle.force($('wcGo').value); wc.push(); };
  // ustawienia
  const num = (id, f) => { $(id).onchange = () => { const v = +$(id).value; if (Number.isFinite(v)) f(v); }; };
  $('wcFronts').onchange = () => store({ fronts: $('wcFronts').checked });
  num('wcSeed', (v) => store({ seed: Math.max(1, Math.round(v)) }));
  const pair = (a, b, key) => { const f = () => { const x = +$(a).value, y = +$(b).value; if (Number.isFinite(x) && Number.isFinite(y)) store({ [key]: [Math.min(x, y), Math.max(x, y)] }); }; $(a).onchange = f; $(b).onchange = f; };
  pair('wcHold0', 'wcHold1', 'hold'); pair('wcChange0', 'wcChange1', 'change');
  $('wcReset').onclick = () => { const { on } = C(); set({ ...clone(CYCLE_DEFAULTS), on }); wc.cycle.set(clone(CYCLE_DEFAULTS)); fill(); show(); };
  // tabela przejść: wiersz — z której pogody, kolumna — do której
  function table() {
    const box = $('wcTable'), t = C().table; box.replaceChildren();
    const span = (txt, cls) => { const e = document.createElement('span'); e.textContent = txt; if (cls) e.className = cls; return e; };
    box.append(span('from \\ to', 'rowHd')); IDS.forEach((id) => { const h = span(SHORT[id] || id); h.title = label(id); box.append(h); });
    for (const from of IDS) {
      const r = span(SHORT[from] || from, 'rowHd'); r.title = label(from); box.append(r);
      for (const to of IDS) {
        const n = document.createElement('input'); n.type = 'text'; n.inputMode = 'decimal'; n.maxLength = 4;
        n.value = (t[from] && t[from][to]) || 0; n.title = `${label(from)} → ${label(to)}`;
        if (from === to) { n.classList.add('self'); n.title += ' (stays)'; }
        n.onchange = () => { const tb = C().table; tb[from] = { ...(tb[from] || {}) }; const v = Math.min(99, Math.max(0, parseFloat(String(n.value).replace(',', '.')) || 0)); n.value = v; if (v) tb[from][to] = v; else delete tb[from][to]; store({ table: tb }); };
        box.append(n);
      }
    }
  }
  function fill() {
    const c = C();
    $('wcFronts').checked = !!c.fronts; $('wcSeed').value = c.seed;
    $('wcHold0').value = c.hold[0]; $('wcHold1').value = c.hold[1]; $('wcChange0').value = c.change[0]; $('wcChange1').value = c.change[1];
    table();
  }
  // bieżąca pogoda, pasek (następne ok. 20 min) i lista nadchodzących
  function show() {
    const n = wc.cycle.now, p = wc.cycle.params;
    $('wcNow').textContent = !wc.on ? 'Off — the weather from the list.'
      : n.u > 0 ? `${label(n.from)} → ${label(n.to)} · ${Math.round(n.u * 100)}% · rain ${Math.round(p.rain * 100)}% · wind ${p.wind.toFixed(1)} m/s`
        : `${label(n.from)} · wind ${p.wind.toFixed(1)} m/s · visibility ${p.vis < 1 ? Math.round(p.vis * 1000) + ' m' : p.vis.toFixed(1) + ' km'}`;
    const next = wc.cycle.upcoming(8), span = 1200, bar = $('wcBar'); bar.replaceChildren();
    let t = 0, cur = n.from;
    const seg = (id, len, change) => { if (len <= 0 || t >= span) return; const e = document.createElement('span'); e.className = 'wx-' + id + (change ? ' change' : ''); e.style.flex = String(Math.min(len, span - t)); e.title = label(id); bar.append(e); t += len; };
    for (const g of next) { seg(cur, g.at - t, false); seg(g.weather, g.until - g.at, true); cur = g.weather; }
    $('wcNext').replaceChildren(...next.slice(0, 5).map((g) => { const li = document.createElement('li'); const b = document.createElement('b'); b.textContent = g.at > 0 ? `in ${mmss(g.at / wc.speed)}` : 'now'; li.append(b, ` ${label(g.weather)} (change ${mmss((g.until - g.at) / wc.speed)})`); return li; }));
  }
  fill(); show();
  setInterval(show, 500);
  return { fill, show };
}
