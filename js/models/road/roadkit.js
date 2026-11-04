// RoadKit — pojazdy drogowe z prawdziwego świata (1 jednostka = 1 m; początek: ziemia pod środkiem, +Y w górę, +Z przód,
// +X lewa strona — strona kierowcy). Moduł ES z three r186 (vendor), także jako window.RoadKit dla laboratoriów.
// buildVehicle(id, { paint, plate }) → { def, group, body, wheels, door, parts, materials, update(t, dt, opts), setPaint, dispose }
//   update: opts.speed (m/s), steer (-1..1, dodatni w lewo), contact(x, z) — wysokość podłoża pod punktem pojazdu
//   względem jego początku, lights, brake, indicator ('left' | 'right' | 'hazard'), work (0..1 — drzwi kierowcy).
// Opis: docs/models/road/README.md.
import * as polonez from './cars/polonez.js';
import * as abrams from './tanks/abrams.js';
import * as urbino18 from './buses/urbino18.js';

export const VEHICLES = { polonez, abrams, urbino18 };
export const VEHICLE_IDS = Object.keys(VEHICLES);
export const vehicleInfo = (id) => VEHICLES[id].info;
export function buildVehicle(id, opt) { return VEHICLES[id].build(opt); }
export function disposeVehicle(v) { if (v.group.parent) v.group.parent.remove(v.group); v.dispose(); }

if (typeof window !== 'undefined') window.RoadKit = { VEHICLES, VEHICLE_IDS, list: VEHICLE_IDS.map((id) => VEHICLES[id].info), vehicleInfo, buildVehicle, disposeVehicle };
