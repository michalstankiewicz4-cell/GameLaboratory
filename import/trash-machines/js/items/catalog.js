// Katalog przedmiotów gry: model (build, info) + właściwości w grze. Rodzaje i warianty z modeli (js/models/items/).
import * as tireCar from '../models/items/tire-car.js';
import * as tireBike from '../models/items/tire-bike.js';
import * as tireTractor from '../models/items/tire-tractor.js';
import * as can from '../models/items/can.js';
import * as canCrushed from '../models/items/can-crushed.js';
import * as pot from '../models/items/pot.js';
import * as newspapers from '../models/items/newspapers.js';
import * as box from '../models/items/box.js';
import * as barrel from '../models/items/barrel.js';
import * as ingot from '../models/items/ingot.js';

// metal: rodzaj stopu do pieca indukcyjnego (temperatura topnienia °C, gęstość kg/m³); burn: pali się w piecu na papier
export const METALS = { aluminium: { melt: 660, density: 2700 }, steel: { melt: 1450, density: 7850 } };
export const KINDS = {
  'tire-car': { mod: tireCar, label: 'opona samochodowa' },
  'tire-bike': { mod: tireBike, label: 'opona rowerowa' },
  'tire-tractor': { mod: tireTractor, label: 'opona traktorowa' },
  can: { mod: can, label: 'puszka', metal: 'aluminium', crushTo: 'can-crushed' },
  'can-crushed': { mod: canCrushed, label: 'puszka zgnieciona', metal: 'aluminium' },
  pot: { mod: pot, label: 'garnek', metal: 'steel' },
  newspapers: { mod: newspapers, label: 'gazety', burn: 40 },
  box: { mod: box, label: 'karton', burn: 18 },
  barrel: { mod: barrel, label: 'beczka', metal: 'steel' },
  ingot: { mod: ingot, label: 'sztabka', ingot: true },
};
export const STACK_KINDS = ['tire-car', 'tire-bike', 'tire-tractor', 'can', 'can-crushed', 'pot', 'newspapers', 'box', 'barrel'];
export const variantsOf = (k) => KINDS[k].mod.info.variants || 1;
