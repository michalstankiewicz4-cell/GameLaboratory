// Katalog przedmiotów laboratorium mechaniki (kategoria 1 — transmisja ruchu). Każdy przedmiot: ustawienia (params),
// budowa z MechKit (build(p) → { group, update(θ), info: [[nazwa, wartość]], ports, warn }) — θ: kąt wejścia podglądu.
// Ustawienie: { key, label, type: 'range' | 'select' | 'check', min, max, step, unit, options: [[wartość, opis]], def }
// Części: items-common.js (pomocnicze), items-drive.js (transmisja ruchu), items-control.js (sterowanie, zasilanie, przewody).
import { DRIVE_ITEMS } from './items-drive.js';
import { CONTROL_ITEMS } from './items-control.js';

export const ITEMS = [...DRIVE_ITEMS, ...CONTROL_ITEMS];
