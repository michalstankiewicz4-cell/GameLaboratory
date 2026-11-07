// Prefabrykaty sceny: każdy model z kitów, który da się postawić w scenie, z jedną funkcją budowania.
// Scena (js/scene/scene-data.js) zapisuje tylko id prefabrykatu; budowa i nazwa są tutaj.
// build() → { root, kit, dispose }; kit — obiekt zwrócony przez kit (wymiary, linie kadłuba, update części), z niego
// korzystają zachowania (js/scene/behaviors.js).
// Pole lab: laboratorium, w którym model się robi i ogląda dokładnie („Otwórz w laboratorium” w edytorze sceny).
// Kosmos (rodzina space): ShipKit ze Space, ładowany dopiero, gdy scena go potrzebuje (js/scene/space.js) — wpis ma
// needs: 'space', a build() działa po loadSpace(). Jednostka ShipKit = 1 m (Codewing 12 m); dziób obrócony na +Z.
// tick(t, dt) — ruch części na postoju (światła, płomienie silników); w grze zamiast niego zachowanie.
// Rośliny (PlantKit) i jaskinia (CaveKit) — modele z laboratoriów roślin i jaskiń; moduły bazy (BaseKit) — przez space.js.
import '../core/three-window.js';                         // TrainKit czyta window.THREE przy załadowaniu
import { SHIPS, buildShip } from '../models/ships-sea/index.js';
import { VEHICLE_IDS, vehicleInfo, buildVehicle as buildRoad } from '../models/road/roadkit.js';
import { TRAM_IDS, tramInfo, buildTram } from '../models/train/trams/tramkit.js';
import { AIRCRAFT_IDS, aircraftInfo, buildAircraft } from '../models/air/airkit.js';
import { WEAPON_IDS, weaponInfo, buildWeapon } from '../models/weapons/weaponkit.js';
import { STRUCTURE_IDS, structureInfo, buildStructure } from '../models/structures/index.js';
import { BODIES, DEFAULT_TRAIN, buildVehicle as buildRail } from '../models/train/trainkit.js';
import * as THREE from '../../vendor/three/three.module.js';
import { SPECIES, SPECIES_IDS, growPlant, plantMaterials, windUniforms } from '../models/plants/plantkit.js';
import { buildCave } from '../models/caves/cavekit.js';

// family: grupa na liście; surface: gdzie stoi ('sea' — na wodzie, 'land' — na gruncie, 'air' — w powietrzu)
export const FAMILIES = {
  sea: { label: 'Ships', labelPl: 'Okręty' },
  road: { label: 'Road vehicles', labelPl: 'Pojazdy drogowe' },
  rail: { label: 'Rail vehicles', labelPl: 'Pojazdy szynowe' },
  air: { label: 'Aircraft', labelPl: 'Samoloty' },
  structures: { label: 'Structures', labelPl: 'Budowle' },
  weapons: { label: 'Weapons', labelPl: 'Broń' },
  space: { label: 'Spacecraft', labelPl: 'Statki kosmiczne' },
  marine: { label: 'Sea robots', labelPl: 'Roboty morskie' },
  rovers: { label: 'Rovers', labelPl: 'Łaziki' },
  plants: { label: 'Plants', labelPl: 'Rośliny' },
  caves: { label: 'Caves', labelPl: 'Jaskinie' },
  base: { label: 'Base modules', labelPl: 'Moduły bazy' },
  bodies: { label: 'Celestial bodies', labelPl: 'Ciała niebieskie' },
  humans: { label: 'Humans', labelPl: 'Ludzie' },
  creatures: { label: 'Creatures', labelPl: 'Stwory' },
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

// rośliny (PlantKit): jedna roślina gatunku (ziarno 1, wielkość 1 — jak w laboratorium roślin na starcie), z wiatrem
// w shaderze (tick przesuwa czas wiatru); podstawa w punkcie obiektu
function buildPlant(id) {
  const wind = windUniforms(), pl = growPlant(id, { seed: 1, size: 1, detail: 1 }), mats = plantMaterials(id, wind);
  const root = new THREE.Group();
  for (const [geo, m, dm] of [[pl.bark, mats.bark, mats.barkDepth], [pl.leaf, mats.leaf, mats.leafDepth]]) {
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, m); mesh.customDepthMaterial = dm; mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
  }
  return { root, kit: pl, tick: (t) => { wind.uTime.value = t; },
    dispose: () => { for (const x of [pl.bark, pl.leaf]) if (x) x.dispose(); for (const m of Object.values(mats)) { if (m.map) m.map.dispose(); m.dispose(); } } };
}
SPECIES_IDS.forEach((id) => add('plants/' + id, SPECIES[id].name, 'plants', 'land', 'labs/plants.html', () => buildPlant(id)));
// jaskinia (CaveKit) z ustawień domyślnych laboratorium jaskiń (CAVE_DEFAULTS): korytarze, komory, nacieki, jeziorka;
// budowa trwa (pole odległości, ok. sekundy)
add('caves/cave', 'Cave', 'caves', 'land', 'labs/caves.html', () => { const c = buildCave({}); return { root: c.group, kit: c, dispose: () => c.dispose() }; });

// statki kosmiczne, dron i stacja (ShipKit); nazwy jak w ShipKit (SHIP_DEFS), żeby lista była bez ładowania kitu
const SPACE = [['codewing', 'SP-01 Codewing'], ['scribe', 'DR-01 Scribe (drone)'], ['swarmer', 'SW-01 Swarmer'], ['haven', 'ST-04 Haven (station)']];
function buildSpace(id) {
  const SK = window.ShipKit; if (!SK) throw new Error('ShipKit is not loaded (js/scene/space.js loadSpace())');
  const m = SK.buildShipModel(id, { detail: 1 }), holder = SK.makeGameHolder(m, m.size.x);   // +X dziób → +Z, skala 1
  return { root: holder, kit: m, dispose: () => SK.disposeShipModel(m), tick: (t, dt) => m.update(t, dt, { power: 0 }) };
}
SPACE.forEach(([id, name]) => add('space/' + id, name, 'space', 'space', 'labs/vehicles-space.html', () => buildSpace(id), { needs: 'space' }));
// roboty morskie (MarineKit ze Space, ładowany jak ShipKit): ślizgacz, barka, nurek, amfibia; na postoju unoszą się
// na płaskiej wodzie (sprężyny modelu), w grze — zachowanie „mała jednostka na wodzie” (pozę daje zachowanie)
const MARINE = [['skimmer', 'Skimmer'], ['barge', 'Barge'], ['diver', 'Diver'], ['amphibian', 'Amphibian']];
function buildMarine(id) {
  const MK = window.MarineKit; if (!MK) throw new Error('MarineKit is not loaded (js/scene/space.js loadSpace())');
  const v = MK.buildVessel(id, { detail: 1 });
  return { root: v.group, kit: v, dispose: () => MK.disposeVessel(v), tick: (t, dt) => v.update(t, dt, {}) };
}
MARINE.forEach(([id, name]) => add('marine/' + id, name, 'marine', 'sea', 'labs/vehicles-water.html?ship=' + id, () => buildMarine(id), { needs: 'space' }));
// łaziki (VehicleKit ze Space): zwiadowca, transporter, gąsienicowy, budowniczy; w grze — jazda po lądzie (siłami)
const ROVERS = [['scout', 'Scout'], ['hauler', 'Hauler'], ['crawler', 'Crawler'], ['constructor', 'Constructor']];
function buildRover(id) {
  const VK = window.VehicleKit; if (!VK) throw new Error('VehicleKit is not loaded (js/scene/space.js loadSpace())');
  const v = VK.buildVehicle(id, { detail: 1 });
  return { root: v.group, kit: v, dispose: () => VK.disposeVehicle(v) };
}
ROVERS.forEach(([id, name]) => add('rovers/' + id, name, 'rovers', 'land', 'labs/vehicles-land.html', () => buildRover(id), { needs: 'space' }));
// moduły bazy planetarnej (BaseKit ze Space, ładowany jak ShipKit): gotowe (budowa 1), bez hologramu; tick — światła,
// wiertło i obracające się części; nazwy jak w BaseKit.MODULES
const BASE = [['pad', 'Landing pad'], ['hab', 'Habitat'], ['solar', 'Solar array'], ['drill', 'Mine'], ['refinery', 'Refinery'], ['depot', 'Depot']];
function buildBase(id) {
  const BK = window.BaseKit; if (!BK) throw new Error('BaseKit is not loaded (js/scene/space.js loadSpace())');
  const m = BK.buildModule(id, { detail: 1 }); m.setProgress(1);
  return { root: m.group, kit: m, dispose: () => BK.disposeModule(m), tick: (t, dt) => m.update(t, dt) };
}
BASE.forEach(([id, name]) => add('base/' + id, name, 'base', 'land', 'labs/buildings.html', () => buildBase(id), { needs: 'space' }));
// ciała niebieskie (BodyKit ze Space, ładowany jak ShipKit): każde ciało z grup laboratorium ciał niebieskich (bez nieba).
// Model, nie prawdziwa skala: promień 50 m (wielkość — skalą obiektu); tick(t, dt, { sunDir, center }) — oświetlenie od
// słońca sceny, obrót, błyski pulsara w stronę kamery. Lista jak BodyKit.GROUPS (bez ładowania kitu).
const BODY_LIST = [['lava', 'cinder', 'Cinder'], ['lava', 'magma', 'Magma'], ['earthlike', 'terra', 'Terra-1'], ['earthlike', 'pelagia', 'Pelagia'],
  ['icy', 'rime', 'Rime'], ['icy', 'glacies', 'Glacies'], ['desert', 'mars', 'Mars'], ['clouded', 'venus', 'Venus'], ['moons', 'luna', 'Luna'],
  ['airless', 'mercury', 'Mercury'], ['giants', 'jupiter', 'Jupiter'], ['giants', 'saturn', 'Saturn'], ['giants', 'uranus', 'Uranus'],
  ['giants', 'neptune', 'Neptune'], ['rings', 'halo', 'Halo (rings)'], ['rings', 'filament', 'Filament (rings)'], ['rings', 'gossamer', 'Gossamer (rings)'],
  ['rings', 'shards', 'Shard belt'], ['pulsars', 'metronome', 'Metronome (pulsar)'], ['suns', 'sol', 'Sol (sun)'], ['comets', 'comet', 'Comet'],
  ['rocks', 'ferrum', 'Ferrum (asteroid)'], ['blackholes', 'abyss', 'Abyss (black hole)']];
function buildBody(groupId, bodyId) {
  const BK = window.BodyKit; if (!BK) throw new Error('BodyKit is not loaded (js/scene/space.js loadSpace())');
  const b = BK.buildBody(groupId, bodyId, { detail: 1 }); b.setRadius(50);
  return { root: b.group, kit: b, dispose: () => BK.disposeBody(b), tick: (t, dt, at = {}) => b.update(t, dt, at.sunPos ? { sunPosition: at.sunPos, center: at.center } : { sunDir: at.sunDir, center: at.center }) };
}
BODY_LIST.forEach(([g, id, name]) => add('bodies/' + id, name, 'bodies', 'space', 'labs/bodies.html', () => buildBody(g, id), { needs: 'space' }));
// ludzie i stwory (LifeKit ze Space, ładowany jak ShipKit): parametry domyślne kreatury (jak na starcie laboratorium);
// na postoju — chód „idle” (oddech, rozglądanie); chodzenie jako zachowanie — później
function buildLife(id) {
  const LK = window.LifeKit; if (!LK) throw new Error('LifeKit is not loaded (js/scene/space.js loadSpace())');
  const c = LK.build(id, {}, { detail: 1 });
  return { root: c.group, kit: c, dispose: () => c.dispose(), tick: (t, dt) => c.animate(t, dt, { gait: 'idle', speed: 0, lively: true, layers: {} }) };
}
[['humanBust', 'Human I'], ['humanHead', 'Human II']].forEach(([id, name]) => add('humans/' + id, name, 'humans', 'land', 'labs/human.html', () => buildLife(id), { needs: 'space' }));
[['strider', 'Plains strider']].forEach(([id, name]) => add('creatures/' + id, name, 'creatures', 'land', 'labs/life.html', () => buildLife(id), { needs: 'space' }));

export const PREFABS = P;
export const prefab = (id) => P.find((p) => p.id === id) || null;
