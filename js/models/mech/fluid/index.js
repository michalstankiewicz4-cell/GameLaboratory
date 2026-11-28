// FluidKit — modele instalacji płynów i transportu (kategoria 4 laboratorium mechaniki): przewody, pompy, zawory,
// rozdzielacz, siłownik, zbiorniki, pomiar ciśnienia, dysza, przenośnik. Fizyka: js/behaviors/land/mech/fluid.js i pokrewne.
export { pipe, hose, endFitting, fitLen, clearHose } from './pipes.js';
export { gearPump, bellHousing, pistonPump, centrifugalPump } from './pumps.js';
export { ballValve, checkValve, throttleValve, reliefValve, directionalValve, manifold } from './valves.js';
export { hydCylinder } from './cylinder.js';
export { reservoir, waterTank, accumulator, floatGauge, bucket } from './tanks.js';
export { gauge, pressureSensor, nozzle, revCounter, rotameter } from './instruments.js';
export { beltConveyor, carton, magazine, feedTable, bin } from './conveyor.js';
export { waterSupply } from './supply.js';
export { fluidMaterials } from './util.js';
