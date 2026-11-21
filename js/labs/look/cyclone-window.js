// Laboratorium wyglądu — okno „Cyclone” (js/envs/sky/cyclone.js): włączenie, mapa z góry (pasma, oko, scena, droga),
// strefa i wiatr teraz, podgląd ×1 / ×60 / ×600, siła, promień oka, gdzie jest scena (odległość i kierunek od środka),
// wędrówka (kierunek, prędkość), półkula, trąby w pasmach. Włączony cyklon wyłącza zmienną pogodę; ruszenie suwaka pogody
// albo wybór pogody z listy — wyłącza cyklon. Ustawienia — S.sky.cyclone (zapis z pogodą dla sceny).
// cycloneWindow({ get, set, apply, stopOthers }) — get() → S.sky.cyclone; set(c) — zapis; apply(liczby) — do nieba;
//   stopOthers() — wyłącz zmienną pogodę → { on, setOn(b), cyclone, fill() }
import { CATEGORIES, CYCLONE_DEFAULTS, createCyclone, bandAt, relOf } from '../../envs/sky/cyclone.js';

const $ = (id) => document.getElementById(id);
const deg = (v) => `${Math.round(v)}°`;
const compass = (b) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((b % 360) + 360) % 360 / 45) % 8];
const hm = (s) => { s = Math.max(0, Math.round(s / 60)); return s >= 60 ? `${Math.floor(s / 60)} h ${String(s % 60).padStart(2, '0')} min` : `${s} min`; };

export function cycloneWindow({ get, set, apply, stopOthers }) {
  const C = () => ({ ...CYCLONE_DEFAULTS, ...(get() || {}) });
  const cy = createCyclone(C());
  let on = !!C().on, speed = 1, acc = 1e9, last = performance.now();
  const save = () => set({ ...cy.opts, on });
  const store = (o) => { cy.set(o); save(); acc = 1e9; fill(); };
  CATEGORIES.forEach((c) => $('cyCat').append(new Option(`${c.label} · ${c.vmax} m/s`, c.id)));
  for (const k of [1, 60, 600]) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = '×' + k; b.dataset.k = k;
    b.onclick = () => { speed = k; [...$('cySpeed').children].forEach((x) => x.classList.toggle('on', +x.dataset.k === k)); };
    $('cySpeed').append(b);
  }
  $('cySpeed').firstChild.classList.add('on');
  const range = (id, key, fmt) => { const f = () => { $(id + 'V').textContent = fmt(+$(id).value); }; $(id).addEventListener('input', () => { f(); store({ [key]: +$(id).value, t: 0 }); }); return f; };
  const fEye = range('cyEye', 'eye', (v) => `${v} km`), fDist = range('cyDist', 'dist', (v) => `${v} km`);
  const fBear = range('cyBearing', 'bearing', (v) => `${deg(v)} ${compass(v)} of it`), fTrack = range('cyTrack', 'trackDir', (v) => `${deg(v)} ${compass(v)}`);
  const fSp = range('cyTrackSpeed', 'trackSpeed', (v) => `${v} m/s`);
  $('cyCat').onchange = () => store({ category: +$('cyCat').value });
  $('cyHemi').onchange = () => store({ hemisphere: $('cyHemi').value });
  $('cyMoving').onchange = () => store({ moving: $('cyMoving').checked });
  $('cySpouts').onchange = () => store({ spouts: $('cySpouts').checked });
  $('cyRestart').onclick = () => store({ t: 0 });
  $('cyOn').onchange = () => api.setOn($('cyOn').checked);
  function fill() {
    const c = cy.opts;
    $('cyOn').checked = on; $('cyCat').value = c.category; $('cyEye').value = c.eye; $('cyDist').value = c.dist; $('cyBearing').value = c.bearing;
    $('cyMoving').checked = !!c.moving; $('cyTrack').value = c.trackDir; $('cyTrackSpeed').value = c.trackSpeed; $('cyHemi').value = c.hemisphere; $('cySpouts').checked = !!c.spouts;
    fEye(); fDist(); fBear(); fTrack(); fSp(); show();
  }
  // mapa z góry: pasma, ściana oka, oko, scena (punkt) i jej droga względem cyklonu; barwy z tokenów
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function map() {
    const cv = $('cyMap'), g = cv.getContext('2d'), W = cv.width, c = cy.opts, rel = relOf(c, cy.time);
    const span = Math.max(c.eye * 14, Math.hypot(rel[0], rel[1]) * 1.15), k = W / (2 * span);
    g.fillStyle = css('--bg'); g.fillRect(0, 0, W, W);
    const img = g.getImageData(0, 0, W, W), rain = css('--wx-rain'), wall = css('--wx-storm');
    const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const R = hex(rain || '#5d88bd'), S = hex(wall || '#8d6fd0');
    for (let j = 0; j < W; j += 2) for (let i = 0; i < W; i += 2) {
      const x = (i - W / 2) / k, z = (j - W / 2) / k, r = Math.hypot(x, z) / c.eye;
      const b = bandAt(c, x, z, cy.time), w = Math.exp(-Math.pow((r - 1.1) / 0.32, 2)), eye = r < 0.7;
      const a = eye ? 0 : Math.min(1, Math.max(b * 0.9, w) + 0.12 * (r < 13 ? 1 : 0));
      const col = w > b ? S : R;
      for (let dj = 0; dj < 2; dj++) for (let di = 0; di < 2; di++) { const p = ((j + dj) * W + i + di) * 4; img.data[p] = img.data[p] * (1 - a) + col[0] * a; img.data[p + 1] = img.data[p + 1] * (1 - a) + col[1] * a; img.data[p + 2] = img.data[p + 2] * (1 - a) + col[2] * a; }
    }
    g.putImageData(img, 0, 0);
    // droga sceny względem środka (przeszłość i 12 h naprzód) i scena
    g.strokeStyle = css('--dim'); g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath();
    for (let h = -6; h <= 12; h += 0.5) { const p = relOf(c, cy.time + h * 3600); const X = W / 2 + p[0] * k, Y = W / 2 + p[1] * k; if (h === -6) g.moveTo(X, Y); else g.lineTo(X, Y); }
    if (c.moving) g.stroke();
    g.setLineDash([]); g.fillStyle = css('--accent'); g.beginPath(); g.arc(W / 2 + rel[0] * k, W / 2 + rel[1] * k, 4, 0, 6.283); g.fill();
    g.fillStyle = css('--dim'); g.font = '10px ' + (css('--mono') || 'monospace'); g.fillText('N', W / 2 - 3, 11); g.fillText(`${Math.round(span)} km`, 4, W - 5);
  }
  function show() {
    const A = cy.at, p = cy.params, c = cy.opts;
    if (!on) { $('cyNow').textContent = 'Off.'; map(); return; }
    // kiedy oko: najbliższe przejście przez oko w ciągu 24 h (w czasie gry)
    let eyeIn = null;
    if (c.moving) for (let s = 0; s < 86400; s += 300) { const r = relOf(c, cy.time + s); if (Math.hypot(r[0], r[1]) < c.eye * 0.6) { eyeIn = s; break; } }
    $('cyNow').textContent = `${A.zone} · ${Math.round(A.r)} km from the centre · wind ${Math.round(A.wind)} m/s from the ${compass(Math.atan2(-A.dir[0], A.dir[1]) * 180 / Math.PI)}` +
      ` · rain ${Math.round(p.rain * 100)} %${p.tornado ? ' · a waterspout nearby' : ''}${eyeIn != null && A.zone !== 'eye' ? ` · the eye in ${hm(eyeIn)}` : ''} · ${hm(cy.time)} in`;
    map();
  }
  const api = {
    cyclone: cy, fill,
    get on() { return on; },
    setOn(b) {
      b = !!b; if (b === on) return; on = b; $('cyOn').checked = on;
      if (on) { stopOthers(); acc = 1e9; } else apply(null);
      save(); show();
    },
  };
  // pętla: czas cyklonu (× podgląd), liczby pogody do nieba co 0,25 s, okno co 0,5 s
  let showAcc = 0;
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (on) {
      cy.step(dt * speed); acc += dt; showAcc += dt;
      if (acc >= 0.25) { acc = 0; apply(cy.params); }
      if (showAcc >= 0.5) { showAcc = 0; show(); set({ ...cy.opts, on }); }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  fill();
  if (on) { acc = 1e9; }
  return api;
}
