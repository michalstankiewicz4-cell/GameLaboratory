// StructKit: static structures in and on the water — offshore platforms, quays and breakwaters now; piers, harbours
// and lighthouses next (owner: everything built that touches the water). Metres, y up (y = 0 sea level).
// build(id, { detail, depth, …PARAMS }) → { group, parts: {name: Object3D}, info, … structure-specific handles }
// PARAMS (optional): the structure's own settings, shown by the lab as sliders and selects.
import * as super300 from './structures/super300.js';
import * as quay from './structures/quay.js';
import * as breakwater from './structures/breakwater.js';

export const STRUCTURES = { super300, quay, breakwater };
export const STRUCTURE_IDS = Object.keys(STRUCTURES);
export const structureInfo = (id) => STRUCTURES[id].info;
export const structureParams = (id) => STRUCTURES[id].PARAMS || [];
export function buildStructure(id, opt) { return STRUCTURES[id].build(opt); }
