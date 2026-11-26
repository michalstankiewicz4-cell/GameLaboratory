// City Lab — destruction: the buildings that can be destroyed (from Tornado.io) — HouseKit's houses (js/models/houses/
// housekit.js) and the Warsaw buildings of this lab (CityKit's OpenStreetMap data) turned into parts
// (js/models/houses/landmark-house.js) — and the lab's English names for them and for the parts' materials (the models'
// own data is in Polish, like JunkKit's).
//   HOUSES { id: { name, note } }   ids: HouseKit's, and 'lm:<landmark>' for a Warsaw building
//   buildHouse(id, { seed }) → house (parts for DestructKit's world.addHouse)
//   MAT_NAMES { mat: English name }, MAT_COL / FALSE_COL { mat: '#rrggbb' } — the list's swatches, "Material colours"
import { HOUSE_TYPES, buildHouse as buildHK } from '../../../models/houses/housekit.js';
import { LANDMARKS, landmarkHouse } from '../../../models/houses/landmark-house.js';
import { MATS } from '../../../behaviors/land/destruct/materials.js';

const EN = {
  cottage: ['Brick cottage', 'A single-storey red-brick house on a foundation: a wooden floor, a gabled roof of clay tiles, a chimney.'],
  kostka: ['Cube house', 'A two-storey 1970s house: brick walls under plaster, concrete floors, a flat felt roof with a parapet.'],
  barn: ['Barn', 'A wooden barn of upright boards, big doors, a tall roof of corrugated sheet.'],
  garage: ['Garage', 'A garage of hollow blocks with a sheet-metal door and a sloping sheet roof.'],
  shed: ['Shed', 'A small wooden tool shed with a felt roof.'],
  block: ['Panel block', 'A block of precast concrete panels, four floors above the ground floor, rows of windows, a flat roof.'],
};
export const HOUSES = {
  ...Object.fromEntries(Object.keys(HOUSE_TYPES).map((k) => [k, { name: EN[k] ? EN[k][0] : HOUSE_TYPES[k].name, note: EN[k] ? EN[k][1] : HOUSE_TYPES[k].note }])),
  ...Object.fromEntries(Object.entries(LANDMARKS).map(([id, name]) => ['lm:' + id, { name: 'Warsaw: ' + name, note: 'A building of this lab (CityKit, data © OpenStreetMap contributors): the outlines of its parts, heights, storeys and style from the map turned into parts that break by their material.' }])),
};
export const buildHouse = (id, o) => (id.startsWith('lm:') ? landmarkHouse(id.slice(3)) : buildHK(id, o));

const MAT_EN = { brick: 'Brick', plaster: 'Plaster on brick', blocks: 'Hollow blocks', concrete: 'Concrete', panel: 'Precast panel', wood: 'Boards', floor: 'Wooden floor',
  beam: 'Beam', frame: 'Window frame', door: 'Door', glass: 'Glass', tiles: 'Roof tiles', metal: 'Corrugated sheet', tin: 'Sheet metal', ceramic: 'Ceramic cladding on brick',
  curtain: 'Curtain-wall glass', alu: 'Aluminium panel', steel: 'Steel truss', felt: 'Roofing felt' };
// the Warsaw buildings' materials are registered by landmark-house.js with Polish names: 'Ściana (<label>)', 'Szkło fasadowe', 'Dach'
const LM_EN = [[/^Ściana \((.*)\)$/, 'Wall ($1)'], [/^Szkło fasadowe$/, 'Curtain-wall glass'], [/^Dach$/, 'Roof']];
export const matName = (m) => {
  if (MAT_EN[m]) return MAT_EN[m];
  const n = (MATS[m] && MATS[m].name) || m, r = LM_EN.find(([re]) => re.test(n));
  return r ? n.replace(r[0], r[1]) : n;
};
export const MAT_COL = { brick: '#b0503a', plaster: '#e8dcc0', blocks: '#9a9890', concrete: '#a8a8a2', panel: '#c9c2b0', wood: '#8a6a44', floor: '#a08058', beam: '#6e5136', frame: '#f0f0f0',
  door: '#5d3e26', glass: '#7fc4e0', tiles: '#9a3a22', metal: '#7a6e64', tin: '#5f6b72', felt: '#333' };
export const FALSE_COL = { brick: '#e05a3a', plaster: '#ffe08a', blocks: '#b0b0b0', concrete: '#66aaff', panel: '#5588ee', wood: '#c8902a', floor: '#e0b060', beam: '#a06a20', frame: '#ffffff', door: '#8a4a10', glass: '#40ffff', tiles: '#ff3a8a', metal: '#b060ff', tin: '#8040c0', felt: '#40ff60' };
