// StructKit: static structures in and on the water — offshore platforms now; quays, piers, breakwaters, harbours and
// lighthouses next (owner: everything built that touches the water). Metres, y up (y = 0 sea level), +z = forward.
// build(id, { detail }) → { group, parts: {name: Object3D}, info, pose(), … structure-specific handles }
import * as super300 from './structures/super300.js';

export const STRUCTURES = { super300 };
export const STRUCTURE_IDS = Object.keys(STRUCTURES);
export const structureInfo = (id) => STRUCTURES[id].info;
export function buildStructure(id, opt) { return STRUCTURES[id].build(opt); }
