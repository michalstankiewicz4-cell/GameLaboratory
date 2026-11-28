// MechKit — elementy mechaniczne transmisji ruchu (prawdziwe wymiary w metrach, masy w kg). Każdy element obrotowy jest
// budowany wzdłuż lokalnej osi +x: część stała w grupie `group`, część wirująca w `group.userData.spin` (obrót
// spin.rotation.x = kąt). Element nie wie, w jakim napędzie jest — napęd (js/behaviors/land/mech/drive.js) podaje kąty.
//   materials()                                → wspólne materiały (MatKit: stal szlifowana, mosiądz, żeliwo, farba…)
//   gear({ z, m, w, bore, mat })               → zębatka walcowa o zarysie ewolwentowym (kąt przyporu 20°)
//   ringGear({ z, m, w, rim, mat })            → koło koronowe (uzębienie wewnętrzne)
//   sprocket({ z, p, mat })                    → koło łańcuchowe pod łańcuch rolkowy (ANSI 40: p = 12,7 mm)
//   chainLoop(c1, c2, opts) / beltLoop(…)      → droga łańcucha / pasa wokół dwóch kół (styczne + łuki) i jego model
//   pulley({ d, w, mat })                      → koło pasowe z rowkiem klinowym (SPA)
//   shaft({ len, r }) · pillowBlock({ h, r }) · jawCoupling · flangeCoupling · yoke · cross · motor · housing
// Części (z Tornado.io, podzielone na pliki): base.js (materiały, dane fizyczne), teeth.js (zarysy i bryły zębów),
// gears.js, loops.js (koła pasowe, łańcuch, pas), shafts.js (wały, łożyska, sprzęgła, przeguby), units.js (silnik,
// obudowy, przekładnia planetarna, hamulec), motion.js (listwa, suwak, korbowód, śruba pociągowa z nakrętką),
// fasteners.js (śruby mocujące), bearings.js (łożyska toczne i ślizgowe). Opis: docs/models/mech.md.
export { ALU_RHO, BRASS_RHO, DOMAIN, G_MAT, G_STEEL, IRON_RHO, MOTOR_ELEC, PHYS, STEEL_RHO, cyl, materials, planetPhase } from './base.js';
export { SPROCKET_FLANK, SPROCKET_SAMPLES, SPROCKET_SEAT, SPROCKET_TIP, convexParts, involuteOutline, rackHulls, ringHulls, sprocketHulls, sprocketOutline, toothHulls } from './teeth.js';
export { gear, ringGear, sprocket } from './gears.js';
export { VBELT, beltLoop, chainDistance, chainLoop, loopPath, pulley } from './loops.js';
export { SPIDER, cross, flangeCoupling, jawCoupling, pillowBlock, shaft, yoke } from './shafts.js';
export { MOTORS, discBrake, housing, motor, planetary, tubeHousing } from './units.js';
export { conRod, leadScrew, rack, screwNut, slider } from './motion.js';
export { BOLTS, bolt } from './fasteners.js';
export { BEARINGS, rollingBearing } from './bearings.js';
import { materials, planetPhase, PHYS, MOTOR_ELEC, G_STEEL, G_MAT, DOMAIN } from './base.js';
import { rack, slider, conRod, leadScrew, screwNut } from './motion.js';
import { bolt } from './fasteners.js';
import { BEARINGS, rollingBearing } from './bearings.js';
import { gear, ringGear, sprocket } from './gears.js';
import { pulley, loopPath, chainDistance, chainLoop, beltLoop } from './loops.js';
import { shaft, pillowBlock, jawCoupling, flangeCoupling, yoke, cross } from './shafts.js';
import { motor, housing, tubeHousing, planetary, discBrake } from './units.js';
import { involuteOutline, toothHulls, convexParts, sprocketOutline, sprocketHulls, ringHulls, rackHulls } from './teeth.js';
export const MechKit = { bolt, materials, gear, ringGear, sprocket, pulley, loopPath, chainDistance, chainLoop, beltLoop, shaft, pillowBlock, jawCoupling, flangeCoupling, yoke, cross, motor, housing, tubeHousing, involuteOutline, toothHulls, convexParts, sprocketOutline, sprocketHulls, ringHulls, planetary, discBrake, planetPhase, PHYS, MOTOR_ELEC, G_STEEL, G_MAT, DOMAIN, rack, rackHulls, slider, conRod, leadScrew, screwNut, rollingBearing, BEARINGS };
