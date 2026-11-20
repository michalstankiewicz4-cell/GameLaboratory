// CityKit — rodzaje budynków (gotowe opisy) i opis budynku (dane, JSON — dla laboratorium, sceny i AI).
//
// Opis budynku (spec):
//   type         rodzaj, z którego wzięto wartości (house, tenement, block, tower, office, market)
//   seed         ziarno: które okna świecą nocą, drobne różnice
//   footprint    { shape: rect | L | U | corner | custom, w, d, arm (szerokość ramienia L / U), cut (ścięcie narożnika),
//                  points — własny obrys [[x, z], …] }
//   front        krawędź frontu (wejścia, witryny) — indeks krawędzi obrysu
//   floors       kondygnacje razem z parterem; floorH — wysokość piętra, groundH — parteru [m]
//   wall         materiał ścian: opis MatKit (js/render/materials/matkit.js) — gotowy (preset) albo zapisany
//   bay          szerokość przęsła [m]; module — przęsła modułu piętra po kolei: window | balcony | pier (pas muru)
//   window       { style: punched | ribbon | curtain, w, h, sill (od podłogi), mullions (słupki), transom (ślemię),
//                  depth (głębokość wnęki), frame (barwa ramy), glass (barwa szyby) }
//   ground       { front: shop | window | glass | wall, sides: …, entrances (liczba wejść na froncie), door (barwa drzwi) }
//   bands        { plinth (cokół, wysokość m; 0 — bez), cornice (gzyms nad parterem), floors (pasy między piętrami),
//                  top (gzyms wieńczący) }
//   balcony      { depth, railing (barwa balustrady) } — dla przęseł balcony
//   roof         { type: flat | gable | hip | mansard, pitch (°), overhang (okap m), color, parapet (attyka m) }
//   lit          część okien świecących nocą (0…1)
import { PRESETS as MAT } from '../../render/materials/matkit.js';

const mat = (id, over) => ({ ...MAT[id], ...over });
export const TYPES = {
  house: {
    label: 'House', labelPl: 'Dom jednorodzinny',
    footprint: { shape: 'rect', w: 11, d: 9 }, floors: 2, floorH: 2.9, groundH: 3.0,
    wall: mat('plaster', { color: '#e3dccd', tile: 2 }), bay: 2.8, module: ['window'],
    window: { style: 'punched', w: 1.2, h: 1.4, sill: 0.9, mullions: 1, transom: false, depth: 0.18, frame: '#f2efe8', glass: '#3a4b57' },
    ground: { front: 'window', sides: 'window', entrances: 1, door: '#5a3b26' },
    bands: { plinth: 0.45, cornice: false, floors: false, top: false },
    balcony: { depth: 1.1, railing: '#3b3f42' },
    roof: { type: 'gable', pitch: 38, overhang: 0.5, color: '#7a3a2a', parapet: 0 }, lit: 0.45,
  },
  tenement: {
    label: 'Tenement', labelPl: 'Kamienica',
    footprint: { shape: 'rect', w: 20, d: 14 }, floors: 5, floorH: 3.4, groundH: 4.3,
    wall: mat('plaster', { color: '#d8c49c', tile: 2 }), bay: 2.9, module: ['window'],
    window: { style: 'punched', w: 1.2, h: 2.0, sill: 0.8, mullions: 1, transom: true, depth: 0.28, frame: '#efe9dc', glass: '#34444f' },
    ground: { front: 'shop', sides: 'window', entrances: 1, door: '#4a2f1f' },
    bands: { plinth: 0.6, cornice: true, floors: true, top: true },
    balcony: { depth: 0.9, railing: '#2c2f31' },
    roof: { type: 'hip', pitch: 28, overhang: 0.35, color: '#6b4a3c', parapet: 0 }, lit: 0.4,
  },
  block: {
    label: 'Block of flats', labelPl: 'Blok',
    footprint: { shape: 'rect', w: 60, d: 12 }, floors: 10, floorH: 2.8, groundH: 2.8,
    wall: mat('concrete', { color: '#c9c3b6', tile: 3 }), bay: 3.6, module: ['window', 'balcony'],
    window: { style: 'punched', w: 1.5, h: 1.45, sill: 0.85, mullions: 1, transom: false, depth: 0.14, frame: '#e9e9e4', glass: '#3a4954' },
    ground: { front: 'window', sides: 'window', entrances: 4, door: '#55524c' },
    bands: { plinth: 0.5, cornice: false, floors: false, top: false },
    balcony: { depth: 1.2, railing: '#b9b4a8' },
    roof: { type: 'flat', pitch: 0, overhang: 0, color: '#4c4c4a', parapet: 0.6 }, lit: 0.35,
  },
  tower: {
    label: 'Skyscraper', labelPl: 'Wieżowiec',
    footprint: { shape: 'rect', w: 30, d: 30 }, floors: 30, floorH: 3.7, groundH: 6.0,
    wall: mat('aluminium', { color: '#8d969c', tile: 2 }), bay: 1.6, module: ['window'],
    window: { style: 'curtain', w: 1.6, h: 3.2, sill: 0, mullions: 0, transom: false, depth: 0.12, frame: '#5d666c', glass: '#2b3f4f' },
    ground: { front: 'glass', sides: 'glass', entrances: 2, door: '#2a2f33' },
    bands: { plinth: 0, cornice: false, floors: false, top: false },
    balcony: { depth: 1, railing: '#5d666c' },
    roof: { type: 'flat', pitch: 0, overhang: 0, color: '#3c3e40', parapet: 1.2 }, lit: 0.5,
  },
  office: {
    label: 'Office building', labelPl: 'Biurowiec',
    footprint: { shape: 'rect', w: 42, d: 20 }, floors: 8, floorH: 3.6, groundH: 4.5,
    wall: mat('concrete', { color: '#d2d0c8', tile: 3, pores: 0.3 }), bay: 3.0, module: ['window'],
    window: { style: 'ribbon', w: 3.0, h: 1.8, sill: 0.95, mullions: 1, transom: false, depth: 0.1, frame: '#3f4549', glass: '#2e4250' },
    ground: { front: 'glass', sides: 'window', entrances: 1, door: '#2a2f33' },
    bands: { plinth: 0, cornice: false, floors: false, top: true },
    balcony: { depth: 1, railing: '#3f4549' },
    roof: { type: 'flat', pitch: 0, overhang: 0, color: '#47494a', parapet: 0.8 }, lit: 0.55,
  },
  market: {
    label: 'Supermarket', labelPl: 'Market',
    footprint: { shape: 'rect', w: 50, d: 36 }, floors: 1, floorH: 3, groundH: 6.5,
    wall: mat('hull', { color: '#c8c8c2', tile: 3, wear: 0.05, dirt: 0.15, rust: 0 }), bay: 5, module: ['window'],
    window: { style: 'punched', w: 1.5, h: 1.2, sill: 2, mullions: 0, transom: false, depth: 0.1, frame: '#4a4f53', glass: '#33454f' },
    ground: { front: 'glass', sides: 'wall', entrances: 2, door: '#30353a' },
    bands: { plinth: 0.6, cornice: false, floors: false, top: true },
    balcony: { depth: 1, railing: '#4a4f53' },
    roof: { type: 'flat', pitch: 0, overhang: 0, color: '#55575a', parapet: 1.0 }, lit: 0.8,
  },
};
export const TYPE_IDS = Object.keys(TYPES);
export const WINDOW_STYLES = { punched: 'Punched windows', ribbon: 'Ribbon windows', curtain: 'Curtain wall (glass)' };
export const GROUND_KINDS = { shop: 'Shop windows', window: 'Windows', glass: 'Glass wall', wall: 'Plain wall' };
export const ROOF_TYPES = { flat: 'Flat (with parapet)', gable: 'Gable (rectangles; else hip)', hip: 'Hip', mansard: 'Mansard' };
export const BAY_KINDS = { window: 'Window', balcony: 'Balcony', pier: 'Pier (plain wall)' };

const num = (v, lo, hi, d) => { const x = +v; return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
const col = (v, d) => (/^#[0-9a-f]{6}$/i.test(v) ? v : d);
const pick = (v, list, d) => (v in list ? v : d);

/** Opis budynku uzupełniony z rodzaju i sprawdzony (liczby w granicach, znane nazwy). */
export function normalizeSpec(s0 = {}) {
  const T = TYPES[s0.type] || TYPES.tenement, s = { ...T, ...s0 };
  const sub = (k) => ({ ...T[k], ...(s0[k] || {}) });
  const f = sub('footprint'), w = sub('window'), g = sub('ground'), b = sub('bands'), bc = sub('balcony'), r = sub('roof');
  const out = {
    type: TYPES[s0.type] ? s0.type : 'tenement',
    seed: Math.max(1, Math.round(num(s.seed, 1, 99999, 1))),
    footprint: { shape: pick(f.shape, { rect: 1, L: 1, U: 1, corner: 1, custom: 1 }, 'rect'), w: num(f.w, 4, 300, 12), d: num(f.d, 4, 300, 10), arm: num(f.arm, 3, 150, 0), cut: num(f.cut, 1, 60, 4) },
    front: Math.max(0, Math.round(num(s.front, 0, 999, 0))),
    floors: Math.round(num(s.floors, 1, 120, 3)),
    floorH: num(s.floorH, 2.4, 6, 3), groundH: num(s.groundH, 2.4, 9, 3.5),
    wall: { ...(s.wall || T.wall) },
    bay: num(s.bay, 1, 12, 3),
    module: (Array.isArray(s.module) && s.module.length ? s.module : T.module).slice(0, 6).map((k) => pick(k, BAY_KINDS, 'window')),
    window: { style: pick(w.style, WINDOW_STYLES, 'punched'), w: num(w.w, 0.4, 12, 1.2), h: num(w.h, 0.4, 5.5, 1.5), sill: num(w.sill, 0, 3, 0.9), mullions: Math.round(num(w.mullions, 0, 6, 1)), transom: !!w.transom, depth: num(w.depth, 0.04, 0.6, 0.2), frame: col(w.frame, '#eeeeee'), glass: col(w.glass, '#34444f') },
    ground: { front: pick(g.front, GROUND_KINDS, 'window'), sides: pick(g.sides, GROUND_KINDS, 'window'), entrances: Math.round(num(g.entrances, 0, 20, 1)), door: col(g.door, '#4a2f1f') },
    bands: { plinth: num(b.plinth, 0, 1.5, 0), cornice: !!b.cornice, floors: !!b.floors, top: !!b.top },
    balcony: { depth: num(bc.depth, 0.5, 2.5, 1.1), railing: col(bc.railing, '#3b3f42') },
    roof: { type: pick(r.type, ROOF_TYPES, 'flat'), pitch: num(r.pitch, 5, 65, 30), overhang: num(r.overhang, 0, 1.5, 0.3), color: col(r.color, '#6b4a3c'), parapet: num(r.parapet, 0, 2, 0) },
    lit: num(s.lit, 0, 1, 0.4),
  };
  if (s0.footprint && Array.isArray(s0.footprint.points)) out.footprint.points = s0.footprint.points.map((p) => [+p[0], +p[1]]);
  if (!out.footprint.arm) out.footprint.arm = Math.min(out.footprint.w, out.footprint.d) * 0.4;
  out.bay = Math.max(out.bay, out.window.style === 'punched' ? out.window.w + 0.4 : 1);
  out.window.h = Math.min(out.window.h, out.floorH - out.window.sill - 0.15);
  if (out.window.style !== 'punched') out.window.w = out.bay;
  return out;
}
