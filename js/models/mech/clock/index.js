// ClockKit — części zegarów i magazynowania energii (kategorie planu 2 i 3): sprężyna naciskowa, sprężyna spiralna
// w bębnie, koło zamachowe, zapadka z kołem zapadkowym, wychwyt Grahama (koło wychwytowe i kotwica z paletami z rubinu),
// wahadło sekundowe, koła zegarowe z ramionami (zarys ewolwentowy z MechKit) i zegar — regulator (mechanizm między
// płytami z mosiądzu, tarcza posrebrzana z sekundnikiem i tarczą godzinową, wskazówki z oksydowanej stali, wahadło,
// skala amplitudy, deska z orzecha). Koła i wychwyt leżą w płaszczyźnie xy, osie wzdłuż +z (przód zegara); obrót
// części — rotation.z (+ przeciwnie do zegara, patrząc od przodu). Geometria wychwytu wspólna z fizyką
// (js/behaviors/land/mech/escapement.js: escapementGeometry, palletOutline). Wymiary prawdziwe (metry, kg).
// Pliki: wheels.js, escapement.js, springs.js, ratchet.js, flywheel.js, dial.js, regulator.js.
export { materials } from '../common.js';
export { clockWheel, pinion, arbor } from './wheels.js';
export { escapeWheel, anchor, pendulum } from './escapement.js';
export { compressionSpring, mainspringBarrel, torsionSpring } from './springs.js';
export { ratchet } from './ratchet.js';
export { flywheel } from './flywheel.js';
export { dialTexture, hand } from './dial.js';
export { REG, regulator } from './regulator.js';
