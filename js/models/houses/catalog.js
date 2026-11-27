// Budynki z części — jedna lista (laboratorium miasta, tryb Destruction; prefabrykaty sceny, js/scene/prefabs-houses.js):
// domy HouseKit (housekit.js) i budynki Warszawy z części (landmark-house.js — dane CityKit z OpenStreetMap), z nazwami
// i opisami po angielsku i po polsku.
//   HOUSES { id: { name, namePl, note, notePl } }   id: rodzaj HouseKit albo 'lm:<budynek z mapy>'
//   buildHouse(id, { seed }) → house (części dla world.addHouse DestructKit)
import { HOUSE_TYPES, buildHouse as buildHK } from './housekit.js';
import { LANDMARKS, landmarkHouse } from './landmark-house.js';

const EN = {
  cottage: ['Brick cottage', 'A single-storey red-brick house on a foundation: a wooden floor, a gabled roof of clay tiles, a chimney.'],
  kostka: ['Cube house', 'A two-storey 1970s house: brick walls under plaster, concrete floors, a flat felt roof with a parapet.'],
  barn: ['Barn', 'A wooden barn of upright boards, big doors, a tall roof of corrugated sheet.'],
  garage: ['Garage', 'A garage of hollow blocks with a sheet-metal door and a sloping sheet roof.'],
  shed: ['Shed', 'A small wooden tool shed with a felt roof.'],
  block: ['Panel block', 'A block of precast concrete panels, four floors above the ground floor, rows of windows, a flat roof.'],
};
export const HOUSES = {
  ...Object.fromEntries(Object.keys(HOUSE_TYPES).map((k) => [k, { name: EN[k] ? EN[k][0] : HOUSE_TYPES[k].name, namePl: HOUSE_TYPES[k].name, note: EN[k] ? EN[k][1] : HOUSE_TYPES[k].note, notePl: HOUSE_TYPES[k].note }])),
  ...Object.fromEntries(Object.entries(LANDMARKS).map(([id, name]) => ['lm:' + id, { name: 'Warsaw: ' + name, namePl: 'Warszawa: ' + name,
    note: 'A building of the city lab (CityKit, data © OpenStreetMap contributors): the outlines of its parts, heights, floors and style from the map turned into parts that break by their material.',
    notePl: 'Budynek z laboratorium miasta (CityKit, dane © współtwórcy OpenStreetMap): obrysy części, wysokości, piętra i styl z mapy przeliczone na części, które pękają według materiału.' }])),
};
export const buildHouse = (id, o) => (id.startsWith('lm:') ? landmarkHouse(id.slice(3)) : buildHK(id, o));
