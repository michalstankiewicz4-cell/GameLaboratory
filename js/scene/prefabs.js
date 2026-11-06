// Prefabrykaty sceny: każdy model z kitów, który da się postawić w scenie, z jedną funkcją budowania.
// Scena (js/scene/scene-data.js) zapisuje tylko id prefabrykatu; budowa i nazwa są tutaj.
// build() → { root, kit, dispose }; kit — obiekt zwrócony przez kit (wymiary, linie kadłuba, update części), z niego
// korzystają zachowania (js/scene/behaviors.js).
// Pole lab: laboratorium, w którym model się robi i ogląda dokładnie („Otwórz w laboratorium” w edytorze sceny).
// Kosmos (rodzina space): ShipKit ze Space, ładowany dopiero, gdy scena go potrzebuje (js/scene/space.js) — wpis ma
// needs: 'space', a build() działa po loadSpace(). Jednostka ShipKit = 1 m (Codewing 12 m); dziób obrócony na +Z.
// tick(t, dt) — ruch części na postoju (światła, płomienie silników); w grze zamiast niego zachowanie.
// Pozostałe kity ze Space (BaseKit, VehicleKit, MarineKit) jeszcze nie.
import '../core/three-window.js';                         // TrainKit czyta window.THREE przy załadowaniu
import { SHIPS, buildShip } from '../models/ships-sea/index.js';
import { VEHICLE_IDS, vehicleInfo, buildVehicle as buildRoad } from '../models/road/roadkit.js';
import { TRAM_IDS, tramInfo, buildTram } from '../models/train/trams/tramkit.js';
import { AIRCRAFT_IDS, aircraftInfo, buildAircraft } from '../models/air/airkit.js';
import { WEAPON_IDS, weaponInfo, buildWeapon } from '../models/weapons/weaponkit.js';
import { STRUCTURE_IDS, structureInfo, buildStructure } from '../models/structures/index.js';
import { BODIES, DEFAULT_TRAIN, buildVehicle as buildRail } from '../models/train/trainkit.js';

// family: grupa na liście; surface: gdzie stoi ('sea' — na wodzie, 'land' — na gruncie, 'air' — w powietrzu)
export const FAMILIES = {
  sea: { label: 'Ships', labelPl: 'Okręty' },
  road: { label: 'Road vehicles', labelPl: 'Pojazdy drogowe' },
  rail: { label: 'Rail vehicles', labelPl: 'Pojazdy szynowe' },
  air: { label: 'Aircraft', labelPl: 'Samoloty' },
  structures: { label: 'Structures', labelPl: 'Budowle' },
  weapons: { label: 'Weapons', labelPl: 'Broń' },
  space: { label: 'Spacecraft', labelPl: 'Statki kosmiczne' },
};

const P = [];
const add = (id, label, family, surface, lab, build, extra) => P.push({ id, label, family, surface, lab, build, ...extra });
const g = (v) => ({ root: v.group, kit: v, dispose: v.dispose ? () => v.dispose() : null });   // kit: to, co zwrócił kit (dane do zachowań)

Object.keys(SHIPS).forEach((id) => add('sea/' + id, SHIPS[id].info.name, 'sea', 'sea', 'labs/vehicles-water.html?ship=' + id, () => g(buildShip(id, { detail: 1 }))));
VEHICLE_IDS.forEach((id) => add('road/' + id, vehicleInfo(id).name, 'road', 'land', 'labs/vehicles-land.html', () => g(buildRoad(id, {}))));
TRAM_IDS.forEach((id) => add('tram/' + id, tramInfo(id).name, 'rail', 'land', 'labs/vehicles-land.html', () => g(buildTram(id, {}))));
DEFAULT_TRAIN.forEach((c) => add('train/' + c.body, BODIES[c.body].name, 'rail', 'land', 'labs/vehicles-land.html', () => ({ root: buildRail(c.body, { ...c, lights: false }), dispose: null })));
AIRCRAFT_IDS.forEach((id) => add('air/' + id, aircraftInfo(id).name, 'air', 'air', 'labs/vehicles-land.html', () => g(buildAircraft(id, {}))));
STRUCTURE_IDS.forEach((id) => add('structures/' + id, structureInfo(id).name, 'structures', id === 'super300' ? 'sea' : 'land', 'labs/structures.html', () => g(buildStructure(id, { detail: 1 }))));
WEAPON_IDS.forEach((id) => add('weapons/' + id, weaponInfo(id).name, 'weapons', 'land', 'labs/human.html', () => g(buildWeapon(id, {}))));

// statki kosmiczne, dron i stacja (ShipKit); nazwy jak w ShipKit (SHIP_DEFS), żeby lista była bez ładowania kitu
const SPACE = [['codewing', 'SP-01 Codewing'], ['scribe', 'DR-01 Scribe (drone)'], ['swarmer', 'SW-01 Swarmer'], ['haven', 'ST-04 Haven (station)']];
function buildSpace(id) {
  const SK = window.ShipKit; if (!SK) throw new Error('ShipKit is not loaded (js/scene/space.js loadSpace())');
  const m = SK.buildShipModel(id, { detail: 1 }), holder = SK.makeGameHolder(m, m.size.x);   // +X dziób → +Z, skala 1
  return { root: holder, kit: m, dispose: () => SK.disposeShipModel(m), tick: (t, dt) => m.update(t, dt, { power: 0 }) };
}
SPACE.forEach(([id, name]) => add('space/' + id, name, 'space', 'space', 'labs/vehicles-space.html', () => buildSpace(id), { needs: 'space' }));

export const PREFABS = P;
export const prefab = (id) => P.find((p) => p.id === id) || null;
