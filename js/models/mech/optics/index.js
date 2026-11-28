// OptiKit — elementy optyczne etapu 5: soczewki, pryzmaty, źródła (laser, LED ze szczeliną), odbiorniki (fotodioda,
// ekran), stół optyczny; lustro — ../optics.js. Promienie: js/behaviors/land/mech/raytrace.js, wiązki: js/render/optics/beams.js.
export { mirror, COATINGS, SUBSTRATES, reflectance } from '../optics.js';
export { AXIS_Y, opticMaterials, postMount } from './mount.js';
export { lens, lensRadii } from './lens.js';
export { prism } from './prism.js';
export { laser, ledSource } from './sources.js';
export { photodiode, screen, breadboard } from './receivers.js';
