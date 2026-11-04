// AirKit — statki powietrzne (moduły ES z three r186 z vendor, także window.AirKit dla laboratoriów). Ten sam interfejs co
// RoadKit: buildAircraft(id) → { def, group, body, update(t, dt, opts), dispose }; opts: throttle, aileron, elevator, rudder
// (−1..1), flaps, gear, work (owiewka), lights, speed. Liczby lotu w def.flight (zachowanie js/behaviors/air/flight.js).
// Opis: docs/models/air/spitfire.md.
import * as spitfire from './spitfire.js';

export const AIRCRAFT = { spitfire };
export const AIRCRAFT_IDS = Object.keys(AIRCRAFT);
export const aircraftInfo = (id) => AIRCRAFT[id].info;
export function buildAircraft(id, opt) { return AIRCRAFT[id].build(opt); }
export function disposeAircraft(v) { if (v.group.parent) v.group.parent.remove(v.group); v.dispose(); }
if (typeof window !== 'undefined') window.AirKit = { AIRCRAFT, AIRCRAFT_IDS, list: AIRCRAFT_IDS.map((id) => AIRCRAFT[id].info), aircraftInfo, buildAircraft, disposeAircraft };
