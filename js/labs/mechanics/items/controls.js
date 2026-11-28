// Ruch i sterowanie (kategoria 3) — sterowanie elektryczne: wyłączniki, potencjometr, przyciski, falownik, lampka, stycznik.
// Przedmiot: { id, name, group, params, build(p) → { group, update(θ), info, live?, warn?, ports } } (opis w ../items.js).
import * as MK from '../../../models/mech/mechkit.js';
import * as CK from '../../../models/mech/controls.js';
import { LOC } from '../lang.js';
import { mm, kg, P } from './util.js';

export const CONTROLS = [
  {
    id: 'switch', name: 'Wyłącznik', group: 'Sterowanie',
    params: [
      { key: 'kind', label: 'Rodzaj', type: 'select', options: [['cam', 'krzywkowy obrotowy 0–I'], ['main', 'główny (rączka czerwona, tabliczka żółta)'], ['lever', 'dźwigniowy']], def: 'cam' },
      { key: 'poles', label: 'Bieguny', type: 'select', options: [[1, '1'], [2, '2'], [3, '3'], [4, '3 + N']], def: 3 },
      { key: 'amps', label: 'Prąd znamionowy', type: 'select', options: [[10, '10 A'], [16, '16 A'], [25, '25 A'], [40, '40 A'], [63, '63 A']], def: 16 },
    ],
    build(p) {
      const g = CK.switchUnit(p), a = g.userData.api;
      const live = () => [['Stan', a.on ? 'I — załączony (obwód zamknięty)' : '0 — wyłączony (obwód otwarty)'], ['Wyjście', a.on ? `${p.poles > 1 ? '3 × 400 V' : '230 V'} podane dalej` : 'bez napięcia']];
      return { group: g, controls: true, rest: true, view: { yaw: 0.35, pitch: 0.25 }, update() {}, tick: (dt) => a.tick(dt), api: a, live,
        info: [['Obsługa', 'kliknij dźwignię albo pokrętło'], ['Bieguny', p.poles === 4 ? '3 + N' : String(p.poles)], ['Prąd znamionowy', `${p.amps} A (AC-21)`], ['Napięcie', '690 V AC maks.'], ['Masa', kg(g.userData.mass)], ...live()],
        ports: [P('in', 'Zasilanie (L1–L3 / L, N)', 'energia elektryczna'), P('out', 'Wyjście po załączeniu', 'energia elektryczna'), P('state', 'Stan 0 / I', 'sygnał cyfrowy'), P('base', 'Obudowa (mocowanie)', 'mocowanie')] };
    },
  },
  {
    id: 'pot', name: 'Potencjometr', group: 'Sterowanie',
    params: [
      { key: 'ohms', label: 'Rezystancja', type: 'select', options: [[1000, '1 kΩ'], [4700, '4,7 kΩ'], [10000, '10 kΩ'], [47000, '47 kΩ'], [100000, '100 kΩ']], def: 10000 },
      { key: 'taper', label: 'Charakterystyka', type: 'select', options: [['lin', 'liniowa (B)'], ['log', 'logarytmiczna (A)']], def: 'lin' },
      { key: 'knob', label: 'Pokrętło', type: 'select', options: [['black', 'czarne'], ['grey', 'szare'], ['red', 'czerwone'], ['blue', 'niebieskie']], def: 'black' },
    ],
    build(p) {
      const g = CK.potentiometer(p), a = g.userData.api, f2 = (v) => v.toLocaleString(LOC, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const live = () => { const r = a.ratio(); return [['Położenie', `${f2(a.pos * 10)} / 10 (${Math.round(a.pos * 270)}° z 270°)`], ['Napięcie suwaka (zasilanie 10 V)', `${f2(10 * r)} V`], ['Rezystancja suwak–początek', `${Math.round(p.ohms * r).toLocaleString(LOC)} Ω`]]; };
      return { group: g, controls: true, rest: true, view: { yaw: 0.25, pitch: 0.2 }, update() {}, tick: () => {}, api: a, live,
        info: [['Obsługa', 'przeciągnij pokrętło w górę / w dół'], ['Rezystancja', `${(p.ohms / 1000).toLocaleString(LOC)} kΩ`], ['Charakterystyka', p.taper === 'log' ? 'logarytmiczna (A) — ok. 10 % przy połowie obrotu' : 'liniowa (B)'], ['Moc', '0,5 W'], ...live()],
        ports: [P('u', 'Zacisk 1 (+10 V)', 'energia elektryczna'), P('gnd', 'Zacisk 3 (masa)', 'energia elektryczna'), P('wiper', 'Zacisk 2 — suwak (0–10 V)', 'sygnał analogowy'), P('base', 'Obudowa (mocowanie)', 'mocowanie')] };
    },
  },
  {
    id: 'button', name: 'Przycisk', group: 'Sterowanie',
    params: [
      { key: 'color', label: 'Kolor', type: 'select', options: Object.entries(CK.BUTTON_COLORS), def: 'green' },
      { key: 'mode', label: 'Działanie', type: 'select', options: [['momentary', 'chwilowy (sprężyna wraca)'], ['latch', 'z podtrzymaniem (wciśnij — wciśnij)']], def: 'momentary' },
      { key: 'contact', label: 'Styk', type: 'select', options: [['NO', 'NO — zwierny (13–14)'], ['NC', 'NC — rozwierny (11–12)']], def: 'NO' },
      { key: 'lit', label: 'Podświetlenie', type: 'check', def: false },
      { key: 'mushroom', label: 'Grzybkowy', type: 'check', def: false },
    ],
    build(p) {
      const g = CK.pushButton(p), a = g.userData.api;
      const live = () => [['Wciśnięty', a.pressed ? 'tak' : 'nie'], ['Styk', a.closed ? 'zamknięty — prąd płynie' : 'otwarty'], ['Wyjście (24 V DC)', a.closed ? '24 V' : '0 V']];
      return { group: g, controls: true, rest: true, view: { yaw: 0.3, pitch: 0.2 }, update() {}, tick: (dt) => a.tick(dt), api: a, live,
        info: [['Obsługa', p.mode === 'latch' ? 'kliknij — wciska się i zostaje; kliknij znowu — wraca' : 'przytrzymaj przycisk myszy na przycisku'], ['Otwór montażowy', 'Ø 22,5 mm'], ['Styk', p.contact === 'NO' ? 'zwierny 13–14' : 'rozwierny 11–12'], ['Obciążalność styku', '10 A, 24 V DC / 6 A, 230 V AC'], ['Podświetlenie', p.lit ? 'LED 24 V — świeci, gdy styk zamknięty' : 'brak'], ...live()],
        ports: [P('a', `Zacisk ${p.contact === 'NO' ? '13' : '11'}`, 'sygnał cyfrowy'), P('b', `Zacisk ${p.contact === 'NO' ? '14' : '12'}`, 'sygnał cyfrowy'), ...(p.lit ? [P('lamp', 'Lampka X1–X2', 'energia elektryczna')] : []), P('base', 'Obudowa (mocowanie)', 'mocowanie')] };
    },
  },
  {
    id: 'vfd', name: 'Falownik z pokrętłem', group: 'Sterowanie',
    params: [
      { key: 'kW', label: 'Moc', type: 'select', options: MK.MOTORS.map((m) => [m.kW, `${String(m.kW).replace('.', ',')} kW`]), def: 1.1 },
      { key: 'fmax', label: 'Częstotliwość maks.', type: 'select', options: [[50, '50 Hz'], [60, '60 Hz'], [87, '87 Hz (silnik w trójkącie)'], [100, '100 Hz']], def: 50 },
      { key: 'ramp', label: 'Rampa (0 → fmax)', type: 'range', min: 0.5, max: 20, step: 0.5, unit: 's', def: 5 },
      { key: 'poles', label: 'Silnik — bieguny', type: 'select', options: [[2, '2'], [4, '4'], [6, '6']], def: 4 },
    ],
    build(p) {
      const g = CK.inverter(p), a = g.userData.api, f1 = (v) => v.toLocaleString(LOC, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      const live = () => {
        const nSync = 120 * a.f / p.poles, U = Math.min(400, 400 * a.f / 50);
        return [['Stan', a.run ? 'RUN — praca' : 'STOP'], ['Kierunek', a.dir > 0 ? 'FWD — w przód' : 'REV — wstecz'], ['Zadana', `${f1(a.set)} Hz`], ['Wyjściowa', `${f1(a.f)} Hz`], ['Napięcie wyjściowe (U/f)', `${Math.round(Math.abs(U))} V`], ['Obroty silnika (synchroniczne)', `${Math.round(nSync)} obr/min`]];
      };
      return { group: g, controls: true, rest: true, view: { yaw: 0.3, pitch: 0.15 }, update() {}, tick: (dt) => a.tick(dt), api: a, live,
        info: [['Obsługa', 'przeciągnij pokrętło; RUN / STOP i żółty FWD / REV (kierunek) — kliknij'], ['Moc', `${String(p.kW).replace('.', ',')} kW`], ['Zasilanie', '3 × 400 V, 50 Hz'], ['Rampa', `${f1(p.ramp)} s od 0 do ${p.fmax} Hz`], ['Masa', kg(g.userData.mass)], ...live()],
        ports: [P('mains', 'Zasilanie L1 L2 L3', 'energia elektryczna'), P('motor', 'Wyjście U V W (silnik)', 'energia elektryczna'), P('ai', 'Wejście analogowe 0–10 V (potencjometr)', 'sygnał analogowy'), P('di', 'Wejścia cyfrowe: start, stop, kierunek', 'sygnał cyfrowy'), P('base', 'Radiator (mocowanie)', 'mocowanie')] };
    },
  },
  {
    id: 'estop', name: 'Grzybek bezpieczeństwa', group: 'Sterowanie',
    params: [{ key: 'contacts', label: 'Styki', type: 'select', options: [['1NC', '1 NC'], ['2NC', '2 NC'], ['1NC1NO', '1 NC + 1 NO']], def: '1NC' }],
    build(p) {
      const g = CK.eStop(p), a = g.userData.api;
      const live = () => [['Stan', a.latched ? 'WCIŚNIĘTY — zatrzaśnięty' : 'zwolniony'], ['Styk NC (obwód bezpieczeństwa)', a.closed ? 'zamknięty — maszyna może pracować' : 'otwarty — STOP']];
      return { group: g, controls: true, rest: true, view: { yaw: 0.3, pitch: 0.25 }, update() {}, tick: (dt) => a.tick(dt), api: a, live,
        info: [['Obsługa', 'kliknij — wciśnij (zatrzask); kliknij znowu — odblokuj obrotem'], ['Norma', 'PN-EN ISO 13850 (czerwony na żółtym)'], ['Styki', { '1NC': '1 NC', '2NC': '2 NC', '1NC1NO': '1 NC + 1 NO' }[p.contacts] || p.contacts], ['Masa', kg(g.userData.mass)], ...live()],
        ports: [P('nc', 'Styk NC 11–12 (obwód bezpieczeństwa)', 'sygnał cyfrowy'), ...(p.contacts.includes('NO') ? [P('no', 'Styk NO 13–14 (sygnalizacja)', 'sygnał cyfrowy')] : []), ...(p.contacts === '2NC' ? [P('nc2', 'Styk NC 21–22', 'sygnał cyfrowy')] : []), P('base', 'Obudowa (mocowanie)', 'mocowanie')] };
    },
  },
  {
    id: 'lamp', name: 'Lampka sygnalizacyjna', group: 'Sterowanie',
    params: [
      { key: 'color', label: 'Kolor', type: 'select', options: [['green', 'zielona (praca)'], ['red', 'czerwona (awaria)'], ['yellow', 'żółta (ostrzeżenie)'], ['blue', 'niebieska'], ['white', 'biała']], def: 'green' },
      { key: 'volts', label: 'Zasilanie', type: 'select', options: [['24DC', '24 V AC/DC'], ['230AC', '230 V AC']], def: '24DC' },
    ],
    build(p) {
      const g = CK.pilotLamp(p), a = g.userData.api;
      const live = () => [['Stan', a.on ? 'świeci (zasilona)' : 'zgaszona'], ['Prąd', a.on ? (p.volts === '24DC' ? '20 mA' : '8 mA') : '0']];
      return { group: g, controls: true, rest: true, view: { yaw: 0.3, pitch: 0.2 }, update() {}, tick: (dt) => a.tick(dt), api: a, live,
        info: [['Obsługa', 'kliknij soczewkę — zasil / odłącz (test)'], ['Źródło światła', 'LED'], ['Otwór montażowy', 'Ø 22,5 mm'], ['Zasilanie', p.volts === '24DC' ? '24 V AC/DC' : '230 V AC'], ...live()],
        ports: [P('x1', 'Zacisk X1', 'energia elektryczna'), P('x2', 'Zacisk X2', 'energia elektryczna'), P('base', 'Obudowa (mocowanie)', 'mocowanie')] };
    },
  },
  {
    id: 'selector', name: 'Przełącznik wyboru', group: 'Sterowanie',
    params: [
      { key: 'positions', label: 'Pozycje', type: 'select', options: [['0-I', '2 pozycje: 0–I'], ['I-0-II', '3 pozycje: I–0–II']], def: 'I-0-II' },
      { key: 'spring', label: 'Powrót sprężyną do 0', type: 'check', def: false },
      { key: 'handle', label: 'Rączka', type: 'select', options: [['short', 'krótka'], ['long', 'długa']], def: 'short' },
    ],
    build(p) {
      const g = CK.selector(p), a = g.userData.api;
      const live = () => [['Pozycja', a.pos], ['Styk I (13–14)', a.pos === 'I' ? 'zamknięty' : 'otwarty'], ...(p.positions === 'I-0-II' ? [['Styk II (23–24)', a.pos === 'II' ? 'zamknięty' : 'otwarty']] : [])];
      return { group: g, controls: true, rest: true, view: { yaw: 0.3, pitch: 0.2 }, update() {}, tick: (dt) => a.tick(dt), api: a, live,
        info: [['Obsługa', p.spring ? 'przytrzymaj — kolejna pozycja, puść — wraca do 0' : 'kliknij — kolejna pozycja'], ['Kąt', p.positions === 'I-0-II' ? '45° w każdą stronę' : '90°'], ['Otwór montażowy', 'Ø 22,5 mm'], ...live()],
        ports: [P('i', 'Styk pozycji I', 'sygnał cyfrowy'), ...(p.positions === 'I-0-II' ? [P('ii', 'Styk pozycji II', 'sygnał cyfrowy')] : []), P('base', 'Obudowa (mocowanie)', 'mocowanie')] };
    },
  },
  {
    id: 'limit', name: 'Wyłącznik krańcowy', group: 'Sterowanie',
    params: [{ key: 'actuator', label: 'Napęd', type: 'select', options: [['roller', 'dźwignia z rolką'], ['plunger', 'popychacz']], def: 'roller' }],
    build(p) {
      const g = CK.limitSwitch(p), a = g.userData.api;
      const live = () => [['Stan', a.actuated ? 'najechany' : 'swobodny'], ['Styk NO (13–14)', a.actuated ? 'zamknięty' : 'otwarty'], ['Styk NC (21–22)', a.actuated ? 'otwarty' : 'zamknięty']];
      return { group: g, controls: true, rest: true, view: { yaw: 0.5, pitch: 0.2 }, update() {}, tick: (dt) => a.tick(dt), api: a, live,
        info: [['Obsługa', `przytrzymaj ${p.actuator === 'roller' ? 'rolkę' : 'popychacz'} — jak najechanie elementem maszyny`], ['Korpus', 'odlew aluminiowy, IP67'], ['Styki', '1 NO + 1 NC, migowe'], ['Masa', kg(g.userData.mass)], ...live()],
        ports: [P('act', p.actuator === 'roller' ? 'Rolka (najazd — ruch mechaniczny)' : 'Popychacz (najazd — ruch mechaniczny)', 'ruch'), P('no', 'Styk NO 13–14', 'sygnał cyfrowy'), P('nc', 'Styk NC 21–22', 'sygnał cyfrowy'), P('base', 'Korpus (mocowanie)', 'mocowanie')] };
    },
  },
  {
    id: 'contactor', name: 'Stycznik', group: 'Sterowanie',
    params: [
      { key: 'amps', label: 'Prąd AC-3', type: 'select', options: [[9, '9 A (4 kW)'], [12, '12 A (5,5 kW)'], [18, '18 A (7,5 kW)'], [25, '25 A (11 kW)'], [32, '32 A (15 kW)']], def: 12 },
      { key: 'coil', label: 'Cewka', type: 'select', options: [['230AC', '230 V AC'], ['24DC', '24 V DC']], def: '230AC' },
      { key: 'aux', label: 'Styk pomocniczy', type: 'select', options: [['1NO', '1 NO'], ['1NC', '1 NC']], def: '1NO' },
    ],
    build(p) {
      const g = CK.contactor(p), a = g.userData.api;
      const live = () => [['Cewka', a.on ? 'zasilona — kotwica przyciągnięta' : 'bez zasilania'], ['Styki główne 1-2, 3-4, 5-6', a.on ? 'zamknięte — silnik zasilany' : 'otwarte'], [`Styk pomocniczy ${p.aux === '1NO' ? '13–14' : '21–22'}`, (p.aux === '1NO') === a.on ? 'zamknięty' : 'otwarty']];
      return { group: g, controls: true, rest: true, view: { yaw: 0.35, pitch: 0.2 }, update() {}, tick: (dt) => a.tick(dt), api: a, live,
        info: [['Obsługa', 'kliknij przód — test (jak zasilona cewka)'], ['Prąd AC-3', `${p.amps} A`], ['Cewka', p.coil === '230AC' ? '230 V AC, ok. 7 VA' : '24 V DC, ok. 3 W'], ['Montaż', 'szyna DIN 35 mm'], ['Masa', kg(g.userData.mass)], ...live()],
        ports: [P('coil', `Cewka A1–A2 (${p.coil === '230AC' ? '230 V AC' : '24 V DC'})`, 'energia elektryczna'), P('in', 'Styki główne 1 3 5 (zasilanie)', 'energia elektryczna'), P('out', 'Styki główne 2 4 6 (odbiornik)', 'energia elektryczna'), P('aux', `Styk pomocniczy ${p.aux}`, 'sygnał cyfrowy'), P('base', 'Szyna DIN (mocowanie)', 'mocowanie')] };
    },
  },
  /* ---------------- zasilanie i przewody ---------------- */
];
