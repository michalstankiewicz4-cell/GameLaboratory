// Katalog przedmiotów laboratorium mechaniki (kategoria 1 — transmisja ruchu). Każdy przedmiot: ustawienia (params),
// budowa z MechKit (build(p) → { group, update(θ), info: [[nazwa, wartość]], ports, warn }) — θ: kąt wejścia podglądu.
// Ustawienie: { key, label, type: 'range' | 'select' | 'check', min, max, step, unit, options: [[wartość, opis]], def }
// Pliki: items/transmission.js, energy.js, timekeeping.js, mechanisms.js, signals.js, controls.js, power.js, fluid.js, optics.js, photonics.js; pomocniki — items/util.js,
// kolizje przegubu Cardana — items/cardan.js.
import { TRANSMISSION } from './items/transmission.js';
import { ENERGY } from './items/energy.js';
import { TIMEKEEPING } from './items/timekeeping.js';
import { CONTROLS } from './items/controls.js';
import { POWER } from './items/power.js';
import { OPTICS } from './items/optics.js';
import { SIGNALS } from './items/signals.js';
import { MECHANISMS } from './items/mechanisms.js';
import { FLUID } from './items/fluid.js';
import { PHOTONICS } from './items/photonics.js';
export { cardanCheck, cardanMax } from './items/cardan.js';

// kategorie planu (docs/labs/mechanics.md): grupa przedmiotu → kategoria
export const CATS = [
  ['Transmisja ruchu', ['Zębatki i przekładnie', 'Łańcuchy', 'Pasy', 'Wały i łożyska', 'Łożyska', 'Sprzęgła', 'Zamiana ruchu', 'Napęd']],
  ['Magazynowanie energii', ['Sprężyny', 'Koła zamachowe', 'Akumulatory']],
  ['Ruch i sterowanie', ['Dźwignie', 'Mechanizmy zapadkowe', 'Wahadła i wychwyty', 'Regulatory', 'Przekaźniki', 'Sterowanie']],
  ['Przepływ i transport', ['Zasilanie i przewody', 'Źródła płynu', 'Rury i węże', 'Pompy', 'Zawory', 'Rozdzielacze', 'Siłowniki', 'Zbiorniki', 'Dysze', 'Transport']],
  ['Optyka i sygnały', ['Czujniki', 'Optyka']],
  ['Elektronika i sprzęt', []],
];

export const ITEMS = [...TRANSMISSION, ...ENERGY, ...TIMEKEEPING, ...MECHANISMS, ...SIGNALS, ...CONTROLS, ...POWER, ...FLUID, ...OPTICS, ...PHOTONICS];
