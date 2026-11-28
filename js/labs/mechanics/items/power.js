// Przepływ i transport (kategoria 4) — zasilanie i przewody: przewód, źródła AC i DC.
// Przedmiot: { id, name, group, params, build(p) → { group, update(θ), info, live?, warn?, ports } } (opis w ../items.js).
import * as CK from '../../../models/mech/controls.js';
import { LOC } from '../lang.js';
import { mm, kg, P } from './util.js';

export const POWER = [
  {
    id: 'wire', name: 'Przewód', group: 'Zasilanie i przewody',
    params: [
      { key: 'mm2', label: 'Przekrój', type: 'select', options: [[0.5, '0,5 mm²'], [0.75, '0,75 mm²'], [1, '1 mm²'], [1.5, '1,5 mm²'], [2.5, '2,5 mm²'], [4, '4 mm²'], [6, '6 mm²'], [10, '10 mm²'], [16, '16 mm²']], def: 1.5 },
      { key: 'color', label: 'Kolor izolacji', type: 'select', options: Object.entries(CK.WIRE_COLORS).map(([k, v]) => [k, v[1]]), def: 'brown' },
      { key: 'len', label: 'Długość', type: 'range', min: 0.1, max: 3, step: 0.05, unit: 'm', def: 0.6 },
    ],
    build(p) {
      const g = CK.wire(p), u = g.userData, IZ = { 0.5: 7.5, 0.75: 10, 1: 13.5, 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57, 16: 76 }[p.mm2], f = (v, d = 3) => v.toLocaleString(LOC, { maximumFractionDigits: d });
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
        info: [['Obsługa', 'kliknij wyłącznik — załącz / wyłącz'], ['Rodzaj', 'umowne źródło (sieć, rozdzielnica) — nie konkretne urządzenie'], ['Napięcie skuteczne', p.phases === 3 ? `${Math.round(Uf)} V fazowe, ${p.volts === 400 ? 400 : Math.round(Uf * Math.sqrt(3))} V międzyfazowe` : `${p.volts} V`], ['Częstotliwość', `${p.hz} Hz (okres ${(1000 / p.hz).toLocaleString(LOC, { maximumFractionDigits: 1 })} ms)`], ['Moc maks.', `${(p.phases === 3 ? Math.sqrt(3) * Uf * Math.sqrt(3) * p.amps : p.volts * p.amps).toLocaleString(LOC, { maximumFractionDigits: 0 })} VA`], ...live()],
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
      const live = () => [['Wyjście', a.on ? `załączone — ${p.volts.toLocaleString(LOC)} V` : 'wyłączone']];
      return { group: g, controls: true, rest: true, view: { yaw: 0.25, pitch: 0.25 }, update() {}, tick: (dt) => a.tick(dt), api: a, live,
        info: [['Obsługa', 'kliknij wyłącznik — załącz / wyłącz'], ['Rodzaj', 'umowne źródło napięcia stałego (zasilacz, akumulator)'], ['Napięcie', `${p.volts.toLocaleString(LOC)} V`], ['Prąd maks.', `${String(p.amps).replace('.', ',')} A — ograniczenie prądu`], ['Moc maks.', `${Math.round(p.volts * p.amps)} W`], ...live()],
        ports: [P('plus', 'Wyjście +', 'energia elektryczna'), P('minus', 'Wyjście −', 'energia elektryczna')] };
    },
  },
];
