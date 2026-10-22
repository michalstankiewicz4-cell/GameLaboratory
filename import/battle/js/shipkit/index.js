// ShipKit: registry of the procedurally built, real-world ships (metres, +z bow, y = 0 waterline).
// build(id, { detail }) → { group, parts: {name: Group}, mounts: [{ name, train, guns, yaw0, arc }], info, lines, length, beam }
import * as blyskawica from './ships/blyskawica.js';
import * as orzel from './ships/orzel.js';

export const SHIPS = { blyskawica, orzel };
export const SHIP_IDS = Object.keys(SHIPS);
export const shipInfo = (id) => SHIPS[id].info;
export function buildShip(id, opt) { return SHIPS[id].build(opt); }
// What the Ship Lab shows for a ship: { cams, dims, partNames, signalCam } (optional per ship)
export const shipView = (id) => SHIPS[id].view || {};
