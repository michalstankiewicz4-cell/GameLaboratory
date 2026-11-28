// Słownik laboratorium mechaniki: polski → angielski (całe teksty i fragmenty; T/tr w lang.js), podzielony według
// części laboratorium w lang-en/: common (wspólne fragmenty), ui (strona i okna), transmission, machine, electric,
// energy, signals, fluid, optics. Nowy tekst — do pliku części, w której jest używany (wspólny dla wielu — common.js).
import { COMMON } from './lang-en/common.js';
import { UI } from './lang-en/ui.js';
import { TRANSMISSION } from './lang-en/transmission.js';
import { MACHINE } from './lang-en/machine.js';
import { ELECTRIC } from './lang-en/electric.js';
import { ENERGY } from './lang-en/energy.js';
import { SIGNALS } from './lang-en/signals.js';
import { FLUID } from './lang-en/fluid.js';
import { OPTICS } from './lang-en/optics.js';

export const EN_DICT = { ...COMMON, ...UI, ...TRANSMISSION, ...MACHINE, ...ELECTRIC, ...ENERGY, ...SIGNALS, ...FLUID, ...OPTICS };
