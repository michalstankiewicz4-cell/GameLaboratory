// Laboratorium mechaniki — przedmioty sterowania, zasilania i przewody (obsługa na modelu: klik, przeciąganie).
import * as MK from '../../models/mech/mechkit.js';
import * as CK from '../../models/mech/controls.js';
import { mm, kg, P } from './items-common.js';

export const CONTROL_ITEMS = [
  /* ---------------- sterowanie: obsługa na modelu (klik, przeciąganie) ---------------- */
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
      const g = CK.potentiometer(p), a = g.userData.api, f2 = (v) => v.toLocaleString('pl', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const live = () => { const r = a.ratio(); return [['Położenie', `${f2(a.pos * 10)} / 10 (${Math.round(a.pos * 270)}° z 270°)`], ['Napięcie suwaka (zasilanie 10 V)', `${f2(10 * r)} V`], ['Rezystancja suwak–początek', `${Math.round(p.ohms * r).toLocaleString('pl')} Ω`]]; };
      return { group: g, controls: true, rest: true, view: { yaw: 0.25, pitch: 0.2 }, update() {}, tick: () => {}, api: a, live,
        info: [['Obsługa', 'przeciągnij pokrętło w górę / w dół'], ['Rezystancja', `${(p.ohms / 1000).toLocaleString('pl')} kΩ`], ['Charakterystyka', p.taper === 'log' ? 'logarytmiczna (A) — ok. 10 % przy połowie obrotu' : 'liniowa (B)'], ['Moc', '0,5 W'], ...live()],
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
      const g = CK.inverter(p), a = g.userData.api, f1 = (v) => v.toLocaleString('pl', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
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
  {
    id: 'wire', name: 'Przewód', group: 'Zasilanie i przewody',
    params: [
      { key: 'mm2', label: 'Przekrój', type: 'select', options: [[0.5, '0,5 mm²'], [0.75, '0,75 mm²'], [1, '1 mm²'], [1.5, '1,5 mm²'], [2.5, '2,5 mm²'], [4, '4 mm²'], [6, '6 mm²'], [10, '10 mm²'], [16, '16 mm²']], def: 1.5 },
      { key: 'color', label: 'Kolor izolacji', type: 'select', options: Object.entries(CK.WIRE_COLORS).map(([k, v]) => [k, v[1]]), def: 'brown' },
      { key: 'len', label: 'Długość', type: 'range', min: 0.1, max: 3, step: 0.05, unit: 'm', def: 0.6 },
    ],
    build(p) {
      const g = CK.wire(p), u = g.userData, IZ = { 0.5: 7.5, 0.75: 10, 1: 13.5, 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57, 16: 76 }[p.mm2], f = (v, d = 3) => v.toLocaleString('pl', { maximumFractionDigits: d });
      return { group: g, rest: true, view: { yaw: 0.2, pitch: 0.45 }, update() {},
        info: [['Rodzaj', 'linka Cu H07V-K, izolacja PVC'], ['Średnica z izolacją', mm(u.dIns, 1)], ['Rezystancja (20 °C)', `${f(u.R * 1000, 1)} mΩ`], ['Obciążalność (ułożenie B2)', `${IZ} A`], ['Spadek napięcia przy ' + IZ + ' A (tam i z powrotem)', `${f(2 * IZ * u.R, 2)} V`], ['Tulejki', 'zaciskane, kolor wg DIN 46228-4'], ['Masa', kg(u.mass)]],
        ports: [P('a', 'Koniec A (tulejka)', 'energia elektryczna'), P('b', 'Koniec B (tulejka)', 'energia elektryczna')] };
    },
  },
  {
    id: 'ac', name: 'Źródło zasilania AC (umowne)', group: 'Zasilanie i przewody',
    params: [
      { key: 'phases', label: 'Fazy', type: 'select', options: [[1, '1 faza (L, N, PE)'], [3, '3 fazy (L1–L3, N, PE)']], def: 1 },
      { key: 'volts', label: 'Napięcie', type: 'select', options: [[24, '24 V'], [110, '110 V'], [230, '230 V'], [400, '400 V (międzyfazowe)']], def: 230 },
      { key: 'hz', label: 'Częstotliwość', type: 'select', options: [[50, '50 Hz'], [60, '60 Hz']], def: 50 },
      { key: 'amps', label: 'Prąd maks. (zabezpieczenie)', type: 'select', options: [[6, '6 A'], [10, '10 A'], [16, '16 A'], [25, '25 A'], [32, '32 A'], [63, '63 A']], def: 16 },
    ],
    build(p) {
      const g = CK.powerSource({ kind: 'AC', ...p }), a = g.userData.api, Uf = p.phases === 3 ? (p.volts === 400 ? 230 : p.volts / Math.sqrt(3)) : p.volts;
      const live = () => [['Wyjście', a.on ? 'załączone' : 'wyłączone'], ['Napięcie szczytowe', a.on ? `±${Math.round(Uf * Math.SQRT2)} V (faza)` : '0 V']];
      return { group: g, controls: true, rest: true, view: { yaw: 0.25, pitch: 0.25 }, update() {}, tick: (dt) => a.tick(dt), api: a, live,
        info: [['Obsługa', 'kliknij wyłącznik — załącz / wyłącz'], ['Rodzaj', 'umowne źródło (sieć, rozdzielnica) — nie konkretne urządzenie'], ['Napięcie skuteczne', p.phases === 3 ? `${Math.round(Uf)} V fazowe, ${p.volts === 400 ? 400 : Math.round(Uf * Math.sqrt(3))} V międzyfazowe` : `${p.volts} V`], ['Częstotliwość', `${p.hz} Hz (okres ${(1000 / p.hz).toLocaleString('pl', { maximumFractionDigits: 1 })} ms)`], ['Moc maks.', `${(p.phases === 3 ? Math.sqrt(3) * Uf * Math.sqrt(3) * p.amps : p.volts * p.amps).toLocaleString('pl', { maximumFractionDigits: 0 })} VA`], ...live()],
        ports: [...(p.phases === 3 ? ['L1', 'L2', 'L3'] : ['L']).map((t) => P(t.toLowerCase(), `Wyjście ${t}`, 'energia elektryczna')), P('n', 'Przewód neutralny N', 'energia elektryczna'), P('pe', 'Przewód ochronny PE', 'energia elektryczna')] };
    },
  },
  {
    id: 'dc', name: 'Źródło zasilania DC (umowne)', group: 'Zasilanie i przewody',
    params: [
      { key: 'volts', label: 'Napięcie', type: 'range', min: 1, max: 60, step: 0.5, unit: 'V', def: 24 },
      { key: 'amps', label: 'Prąd maks.', type: 'select', options: [[1, '1 A'], [2.5, '2,5 A'], [5, '5 A'], [10, '10 A'], [20, '20 A']], def: 5 },
    ],
    build(p) {
      const g = CK.powerSource({ kind: 'DC', ...p }), a = g.userData.api;
      const live = () => [['Wyjście', a.on ? `załączone — ${p.volts.toLocaleString('pl')} V` : 'wyłączone']];
      return { group: g, controls: true, rest: true, view: { yaw: 0.25, pitch: 0.25 }, update() {}, tick: (dt) => a.tick(dt), api: a, live,
        info: [['Obsługa', 'kliknij wyłącznik — załącz / wyłącz'], ['Rodzaj', 'umowne źródło napięcia stałego (zasilacz, akumulator)'], ['Napięcie', `${p.volts.toLocaleString('pl')} V`], ['Prąd maks.', `${String(p.amps).replace('.', ',')} A — ograniczenie prądu`], ['Moc maks.', `${Math.round(p.volts * p.amps)} W`], ...live()],
        ports: [P('plus', 'Wyjście +', 'energia elektryczna'), P('minus', 'Wyjście −', 'energia elektryczna')] };
    },
  },
];
