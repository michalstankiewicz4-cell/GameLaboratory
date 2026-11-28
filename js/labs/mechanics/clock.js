// Laboratorium mechaniki — zegar — regulator na posadzce za końcem łoża (tryby Maszyna i Fizyka).
// Osobny mechanizm na posadzce za końcem łoża. Tryb „Maszyna”: ruch z kinematyki (wahadło z okresem 2 s, koło wychwytowe
// przeskakuje pół podziałki na każde uderzenie). Tryb „Fizyka”: wahadło i koło wychwytowe liczone z kontaktu zębów
// z paletami (js/behaviors/land/mech/escapement.js), napęd ze sprężyny w bębnie przez przekładnię (sprawność), sprężyna
// się rozwija; nakręcanie kluczem — kliknięcie kwadratu na wałku bębna (zapadka przeskakuje). Koła sztywne (bez luzu).
// createClock({ root, S, fmt }) → { parts (elementy do wybierania), devices (nakręcanie), step(dt), rows(wiersze), state, esc, group, hms }
import * as THREE from '../../../vendor/three/three.module.js';
import * as CL from '../../models/mech/clock/index.js';
import { createEscapement } from '../../behaviors/land/mech/escapement.js';
import { T } from './lang.js';

const TAU = Math.PI * 2;

export function createClock({ root, S, fmt }) {
  const g = CL.regulator(), u = g.userData, R = CL.REG, tr = R.train, G = u.G;
  g.position.set(4.6, 0, 0.3); root.add(g);
  { const L = new THREE.SpotLight(0xffe7c4, 10, 6, 0.5, 0.5, 1.6); L.position.set(4.6, 3.2, 1.6); L.target.position.set(4.6, 1.4, 0.25); root.add(L, L.target); }
  // przełożenia z geometrii (ten sam wzór co zazębienie w napędzie: ząb a na kierunku ψ ⇒ wrąb b na ψ + π)
  const rel = (za, zb, A, B) => { const psi = Math.atan2(-(B[0] - A[0]), B[1] - A[1]), k = za / zb; return (ta) => -k * (ta - psi) + psi + Math.PI + Math.PI / zb; };
  const fT = rel(tr.ePin, tr.third, R.E, R.T), fC = rel(tr.tPin, tr.center, R.T, R.C), fB = rel(tr.cPin, tr.barrel, R.C, R.B), fM = rel(tr.cannon, tr.minute, R.C, R.Mw), fH = rel(tr.mPin, tr.hour, R.Mw, R.H);
  const angles = (te) => { const t = fT(te), c = fC(t), b = fB(c), m = fM(c), h = fH(m); return { e: te, t, c, b, m, h }; };
  const A0 = angles(0), P = u.parts;
  // sprężyna: taśma 0,42 × 12 mm, 1,3 m; k = E·b·h³ / (12·L); moment = k·2π·(naciąg + 1 obr. wstępny)
  const bu = u.barrel.userData, kS = 2.06e11 * bu.b * bu.h ** 3 / (12 * bu.L), TURNS = bu.turns, ETA = 0.82;
  const st = { wind: TURNS * 0.75, wind0: TURNS * 0.75, b0: 0, te: 0, phi: 0.03, t: 0, amp: 0, lastW: 0, lastCross: null, period: NaN, windAng: 0, mode: null };
  const esc = createEscapement(G, { Jp: u.Jp, mgl: u.mgl, Q: 1500, Je: u.Je, phi0: 0.035, theta0: 0.01 });
  const T0 = TAU * Math.sqrt(u.Jp / u.mgl), Tspring = () => kS * TAU * (Math.max(0, st.wind) + 1);
  function pose(te, phi) {
    const a = angles(te);
    P.escape.rotation.z = a.e; P.third.rotation.z = a.t; P.center.rotation.z = a.c; P.minute.rotation.z = a.m; P.hour.rotation.z = a.h;
    bu.drum.rotation.z = a.b; P.anchor.rotation.z = phi; u.pendulum.rotation.z = phi;
    u.handSec.rotation.z = a.e; u.handMin.rotation.z = a.c - A0.c; u.handHour.rotation.z = a.h - A0.h;
    bu.arbor.rotation.z = st.windAng; u.click.userData.setAngle(st.windAng);
    // naciąg sprężyny: bęben obraca się w kierunku rozwijania (obrót bębna względem wałka)
    st.wind = st.wind0 - (a.b - st.b0) / TAU;
    return a;
  }
  st.b0 = angles(0).b;
  let lastWindShown = -1;
  function step(dt) {
    if (st.mode !== S.mode) {   // zmiana trybu: fizyka startuje z bieżącego położenia
      if (S.mode === 'physics') { esc.state.theta = st.te; esc.state.phi = Math.max(0.03, Math.abs(st.phi)) * Math.sign(st.phi || 1); esc.state.omega = 0; esc.state.w = 0; }
      st.mode = S.mode;
    }
    st.t += dt;
    if (S.mode === 'physics') {
      const s = esc.step(dt, -Tspring() * ETA / 480);
      st.te = s.theta; st.phi = s.phi;
      if (Math.sign(s.omega) !== Math.sign(st.lastW) && st.lastW !== 0) st.amp = Math.abs(s.phi);
      if (st.lastW > 0 && s.omega <= 0) { if (st.lastCross !== null) st.period = st.t - st.lastCross; st.lastCross = st.t; }
      st.lastW = s.omega;
    } else {
      // kinematyka: φ = A·sin(π t) (okres 2 s), koło przeskakuje pół podziałki wokół przejścia przez pion
      const Aa = 1.8 * Math.PI / 180, uu = st.t + 0.5, beat = Math.floor(uu), f = uu - beat, e = f < 0.42 ? 0 : f > 0.58 ? 1 : (1 - Math.cos((f - 0.42) / 0.16 * Math.PI)) / 2;
      st.phi = Aa * Math.sin(Math.PI * st.t); st.te = -(beat + e) * G.p / 2; st.amp = Aa; st.period = 2;
    }
    const prev = { ...lastA }, a = pose(st.te, st.phi);
    for (const e of list) { const v = a[e.key] !== undefined ? a[e.key] : st.phi; e.omega = dt > 0 ? (v - (prev[e.key] !== undefined ? prev[e.key] : v)) / dt : 0; e.theta = v; }
    Object.assign(lastA, a, { phi: st.phi });
    const wf = Math.max(0, Math.min(1, st.wind / TURNS));
    if (Math.abs(wf - lastWindShown) > 0.01) { bu.setWind(wf); lastWindShown = wf; }
    // moment w elementach (przekładnia bez luzu): od sprężyny przez sprawność stopni
    const Tb = Tspring(); for (const e of list) e.T = e.key === 'b' ? Tb : e.key === 'c' ? Tb / 8 * 0.94 : e.key === 't' ? Tb / 64 * 0.88 : e.key === 'e' ? Tb / 480 * ETA : e.key === 'phi' ? 0 : 0;
  }
  const lastA = {};
  const el0 = (key, id, name, group, props, ports) => ({ key, id, name, group, props, ports: ports.map(([pid, pn, kind = 'obrót']) => ({ id: pid, name: pn, kind })), theta: 0, omega: 0, T: 0, eta: 1, r: 0, dof: 'rot', clock: true });
  const list = [
    el0('b', 'clk-barrel', 'Bęben ze sprężyną zegarową', u.barrel, [['Wieniec', `${tr.barrel} zębów, moduł ${fmt(tr.mB * 1000, 1)} mm`], ['Sprężyna', `taśma ${fmt(bu.h * 1000, 2)} × ${fmt(bu.b * 1000)} mm, długość ${fmt(bu.L, 1)} m, stal hartowana`], ['Sztywność k = E·b·h³ / (12·L)', `${fmt(kS * 1000, 2)} N·mm/rad`], ['Obroty robocze', fmt(TURNS, 1)], ['Moment przy pełnym naciągu', `${fmt(kS * TAU * (TURNS + 1), 3)} N·m`], ['Rezerwa chodu (pełny naciąg)', `${fmt(TURNS * 8)} h (bęben: 1 obr. na 8 h)`]],
      [['mesh', 'Wieniec — zazębienie (zębnik koła centralnego)'], ['arbor', 'Wałek — nakręcanie kluczem, zapadka']]),
    el0('c', 'clk-center', 'Koło centralne (minutowe)', P.center, [['Koło', `${tr.center} zębów, m ${fmt(tr.mC * 1000, 1)} mm, mosiądz, 5 ramion`], ['Zębnik', `${tr.cPin} liści (od bębna 96 : 12 = 8)`], ['Prędkość', '1 obr/h — wskazówka minutowa'], ['Tuleja wskazań', `zębnik ${tr.cannon} (przekładnia wskazań)`]],
      [['pinion', 'Zębnik — z bębnem'], ['mesh', 'Koło — zębnik koła trzeciego'], ['hand', 'Oś — wskazówka minutowa']]),
    el0('t', 'clk-third', 'Koło trzecie', P.third, [['Koło', `${tr.third} zębów, m ${fmt(tr.mT * 1000, 1)} mm`], ['Zębnik', `${tr.tPin} liści (od koła centralnego 80 : 10 = 8)`], ['Prędkość', '7,5 obr/h']], [['pinion', 'Zębnik — z kołem centralnym'], ['mesh', 'Koło — zębnik koła wychwytowego']]),
    el0('e', 'clk-escape', 'Koło wychwytowe (sekundnik)', P.escape, [['Koło', `${G.z} zębów Grahama, Ø ${fmt(G.Re * 2000)} mm, mosiądz`], ['Zębnik', `${tr.ePin} liści (od koła trzeciego 75 : 10 = 7,5)`], ['Prędkość', '1 obr/min — wskazówka sekundowa; pół zęba na uderzenie (1 s)'], ['Przełożenie od bębna', '480 : 1']],
      [['pinion', 'Zębnik — z kołem trzecim'], ['pallet', 'Zęby — palety kotwicy', 'wychwyt']]),
    el0('phi', 'clk-anchor', 'Kotwica z wahadłem sekundowym', P.anchor, [['Wychwyt', 'Grahama (bezodbojowy), palety z rubinu, obejmuje 7,5 podziałki'], ['Kąt podnoszenia / spoczynku', `${fmt(G.lift * 180 / Math.PI, 1)}° / ${fmt(G.lock * 180 / Math.PI, 1)}°`], ['Spadek', `${fmt(G.drop * 1000, 2)} mm`], ['Wahadło', `pręt Ø 6 mm, soczewka 1,5 kg, długość ${fmt(u.L * 1000)} mm`], ['Okres wahadła swobodnego', `${fmt(T0, 4)} s`]],
      [['pallets', 'Palety — zęby koła wychwytowego', 'wychwyt'], ['susp', 'Zawieszenie (sprężyna)', 'mocowanie']]),
    el0('m', 'clk-motion', 'Przekładnia wskazań (12 : 1)', P.minute, [['Tuleja koła centralnego', `${tr.cannon} → koło minutowe ${tr.minute}`], ['Zębnik minutowy', `${tr.mPin} → koło godzinowe ${tr.hour}`], ['Przełożenie', `(${tr.minute}/${tr.cannon})·(${tr.hour}/${tr.mPin}) = 12`]], [['in', 'Z tulei koła centralnego'], ['out', 'Do koła godzinowego']]),
    el0('h', 'clk-hour', 'Koło godzinowe (wskazówka godzinowa)', P.hour, [['Koło', `${tr.hour} zębów, m ${fmt(tr.mM * 1000, 1)} mm`], ['Prędkość', '1 obr / 12 h']], [['mesh', 'Zazębienie — zębnik minutowy'], ['hand', 'Oś — wskazówka godzinowa']]),
  ];
  for (const e of list) e.group.userData.el = e;
  // nakręcanie: kliknięcie kwadratu wałka — ćwierć obrotu (zapadka przeskakuje po zębach)
  bu.arbor.userData.control = 'wind';
  const dev = { group: u.barrel, api: { press: (n) => { if (n !== 'wind') return; const add = Math.min(0.25, TURNS - st.wind); if (add <= 0) return; st.wind0 += add; st.windAng += add * TAU; }, release: () => {}, drag: () => {}, tick: () => {} } };
  const hms = () => { const s = -(st.te - 0) / TAU * 60; const sec = ((s % 60) + 60) % 60, tot = Math.floor(s); return `${String(Math.floor(tot / 3600) % 12 || 12).padStart(2, '0')}:${String(Math.floor(tot / 60) % 60).padStart(2, '0')}:${String(Math.floor(sec)).padStart(2, '0')}`; };
  function rows(R_) {
    const phy = S.mode === 'physics';
    R_.push(['Zegar — wskazanie', `${hms()} (start 12:00:00)`]);
    R_.push(['Zegar — wahadło', `amplituda ±${fmt(st.amp * 180 / Math.PI, 2)}° · okres ${Number.isFinite(st.period) ? fmt(st.period, 4) : '—'} s${phy && Number.isFinite(st.period) ? ` · chód ${fmt((2 - st.period) / 2 * 86400, 1)} s/dobę` : ''}`]);
    if (phy) {
      const s = esc.state;
      R_.push(['Zegar — wychwyt', s.contact ? `${s.contact === 'left' ? 'paleta wejściowa' : 'paleta wyjściowa'}: ${{ lock: 'spoczynek (koło stoi)', impulse: 'impuls (ząb pcha pochylnię)', back: 'tył palety' }[s.face] || ''}` : 'spadek (koło wolne)']);
      R_.push(['Zegar — sprężyna', `naciąg ${fmt(Math.max(0, st.wind), 2)} ${T('z', 'of')} ${fmt(TURNS, 1)} obr. · moment ${fmt(Tspring(), 3)} N·m · na kole wychwytowym ${fmt(Tspring() * ETA / 480 * 1000, 3)} mN·m · rezerwa ${fmt(Math.max(0, st.wind) * 8, 1)} h${st.t > 8 && st.amp < G.d0 ? ' — ZEGAR STANĄŁ (za mała amplituda, nakręć)' : ''} — kliknij kwadrat wałka bębna, żeby nakręcić`]);
    }
  }
  return { parts: list, devices: [dev], step, rows, state: st, esc, group: g, hms };
}
