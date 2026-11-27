// Materiały części budynków: fizyka (gęstość kg/m³, wytrzymałość, wzór pękania, opór na wiatr) i wygląd (MatKit —
// js/render/materials/matkit.js, tekstury generowane kodem; szkło — przezroczysty materiał PBR). Kolor przełomu
// (`frac`) barwi boki pęknięć: tynk pęka do cegły, beton jaśnieje, drewno jest jasne w środku.
//   hp      wytrzymałość części: ile uderzeń (w N·s na m² przekroju) wytrzyma, zanim pęknie
//   wind    prędkość wiatru [m/s], od której wiatr sam zaczyna niszczyć część (szyby pierwsze, ściany ostatnie)
//   burn    tylko materiały palne: { fuel: paliwo FireKit (wood | rubber), time: czas palenia × (√pole + 1) [s] } — pożary
//           (js/behaviors/land/destruct/burn.js); niepalne (cegła, beton, dachówka, blacha, szkło…) nie mają tego pola
import * as THREE from '../../../vendor/three/three.module.js';
import { PRESETS, makeMaterial } from '../../render/materials/matkit.js';

export const MATS = {
  brick:    { name: 'Cegła', density: 1800, hp: 900, wind: 85, pattern: 'masonry', frac: [0.86, 0.62, 0.52], tex: { ...PRESETS.brick } },
  plaster:  { name: 'Tynk na cegle', density: 1750, hp: 850, wind: 85, pattern: 'masonry', frac: [0.95, 0.55, 0.42], tex: { ...PRESETS.plaster, color: '#e2dccf', color2: '#c3baa9' } },
  blocks:   { name: 'Pustaki', density: 1400, hp: 650, wind: 75, pattern: 'masonry', pat: { course: 0.2, brick: 0.4, rowsFar: 3, bricksFar: 3 }, frac: [0.9, 0.9, 0.88], tex: { ...PRESETS.brick, color: '#8f8c86', color2: '#b9b6ad', bricks: 5, label: 'Pustaki' } },
  concrete: { name: 'Beton', density: 2400, hp: 1600, wind: 110, pattern: 'concrete', frac: [1.08, 1.06, 1.02], tex: { ...PRESETS.concrete } },
  panel:    { name: 'Wielka płyta', density: 2400, hp: 1400, wind: 110, pattern: 'concrete', pat: { far: 1.8 }, frac: [1.08, 1.06, 1.02], tex: { ...PRESETS.concrete, color: '#b8b3a6', color2: '#8d887c', tile: 4 } },
  wood:     { burn: { fuel: 'wood', time: 22 }, name: 'Deski', density: 520, hp: 260, wind: 55, pattern: 'planks', pat: { grain: 'y', board: 0.18 }, frac: [1.25, 1.12, 0.9], tex: { ...PRESETS.planks, color: '#7a5b3c', color2: '#3e2b1b', planks: 6 } },
  floor:    { burn: { fuel: 'wood', time: 30 }, name: 'Strop drewniany', density: 560, hp: 300, wind: 60, pattern: 'planks', pat: { grain: 'x', board: 0.16 }, frac: [1.25, 1.12, 0.9], tex: { ...PRESETS.planks } },
  beam:     { burn: { fuel: 'wood', time: 30 }, name: 'Belka', density: 560, hp: 200, wind: 55, pattern: 'beam', frac: [1.25, 1.12, 0.9], tex: { ...PRESETS.planks, color: '#6e5136', planks: 1 } },
  frame:    { burn: { fuel: 'wood', time: 14 }, name: 'Rama okna', density: 600, hp: 70, wind: 45, pattern: 'beam', pat: { piece: 0.4 }, frac: [0.95, 0.85, 0.7], tex: { kind: 'paint', color: '#eeeeea', color2: '#cfcfca', tile: 1, roughness: 0.5, metalness: 0, wear: 0.15, dirt: 0.15 } },
  door:     { burn: { fuel: 'wood', time: 20 }, name: 'Drzwi', density: 600, hp: 160, wind: 50, pattern: 'planks', pat: { grain: 'y', board: 0.12 }, frac: [1.2, 1.1, 0.9], tex: { ...PRESETS.planks, color: '#5d3e26', color2: '#2e1d10', planks: 7 } },
  glass:    { name: 'Szkło', density: 2500, hp: 6, wind: 28, pattern: 'glass', frac: [1, 1, 1], glass: true },
  tiles:    { name: 'Dachówka', density: 1900, solidFactor: 0.17, hp: 300, wind: 48, pattern: 'tiles', frac: [0.9, 0.7, 0.6], tex: { ...PRESETS.brick, color: '#8e3b26', color2: '#4f1e12', bricks: 7, tile: 1.4, label: 'Dachówka' } },
  metal:    { name: 'Blacha falista', density: 7850, hp: 120, wind: 40, pattern: 'sheet', pat: { sheetW: 1.1 }, frac: [1.1, 1.1, 1.1], tex: { ...PRESETS.rusty, panels: 1, tile: 2.2 }, solidFactor: 0.25 },
  tin:      { name: 'Blacha', density: 7850, hp: 140, wind: 45, pattern: 'sheet', pat: { sheetW: 1.0 }, frac: [1.1, 1.1, 1.1], tex: { ...PRESETS.hull, color: '#5f6b72', tile: 2 } },
  ceramic:  { name: 'Okładzina ceramiczna na cegle', density: 1800, hp: 1100, wind: 95, pattern: 'masonry', pat: { course: 0.15, brick: 0.4, rowsFar: 6, bricksFar: 4 }, frac: [0.95, 0.6, 0.48], tex: { ...PRESETS.limestone, color: '#d9cbaa', color2: '#b7a785', tile: 3, cracks: 0.15 } },
  curtain:  { name: 'Szkło fasadowe', density: 2500, hp: 14, wind: 38, pattern: 'glass', frac: [1, 1, 1], glass: true, tone: 'curtain' },
  alu:      { name: 'Panel aluminiowy', density: 2700, hp: 90, wind: 42, pattern: 'sheet', pat: { sheetW: 1.4 }, solidFactor: 0.4, frac: [1.1, 1.1, 1.1], tex: { ...PRESETS.aluminium, color: '#9ea6ac', tile: 2 } },
  steel:    { name: 'Kratownica stalowa', density: 7850, hp: 700, wind: 120, pattern: 'beam', pat: { piece: 4 }, solidFactor: 0.12, frac: [1.1, 1.1, 1.1], tex: { ...PRESETS.hull, color: '#c9c3b0', color2: '#8a8575', tile: 2 } },
  felt:     { burn: { fuel: 'rubber', time: 18 }, name: 'Papa', density: 1200, solidFactor: 0.15, hp: 220, wind: 45, pattern: 'sheet', pat: { sheetW: 1.0 }, frac: [0.8, 0.8, 0.8], tex: { ...PRESETS.concrete, color: '#3b3a3a', color2: '#252424', pores: 0.8, tile: 2 } },
};
export const MAT_IDS = Object.keys(MATS);
// materiał spoza listy (np. budynki z laboratorium miasta: barwa i tekstura z ich opisu); ten sam id — bez zmian
export function registerMat(id, def) { if (!MATS[id]) MATS[id] = def; return id; }

const cache = new Map();
// materiał do rysowania (jeden na rodzaj, wspólny dla budynków i odłamków; kolory wierzchołków: przełom, barwa instancji)
export function renderMaterial(id) {
  if (cache.has(id)) return cache.get(id);
  const M = MATS[id];
  let m;
  if (M.glass && M.tone === 'curtain') {
    // szkło fasadowe wieżowców: przyciemnione, mocno odbija niebo
    m = new THREE.MeshPhysicalMaterial({ color: M.color || 0x4f6a7a, roughness: 0.03, metalness: 0.35, transparent: true, opacity: 0.78, envMapIntensity: 2.2, side: THREE.DoubleSide });
    m.userData.tile = 1;
  } else if (M.glass) {
    m = new THREE.MeshPhysicalMaterial({ color: 0x9fb4bc, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.32, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
    m.userData.tile = 1;
  } else {
    m = makeMaterial(M.tex, { res: 512 }).material;
  }
  m.vertexColors = true;
  m.name = id;
  cache.set(id, m);
  return m;
}
export function tileOf(id) { const M = MATS[id]; return M.glass ? 1 : (M.tex.tile || 2); }
