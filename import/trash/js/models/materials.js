// Materiały modeli jako dane (bez DOM). mat(id) zwraca wspólny MeshStandardMaterial (jeden na rodzaj — mało przełączeń
// stanu na GPU). Tekstury proceduralne dokłada przeglądarka: js/render/textures.js (applyTextures) według pola `tex`.
// W Node (doktor modeli) materiały zostają bez tekstur — doktor ich nie potrzebuje.
import * as THREE from '../../vendor/three/three.module.js';

export const DEFS = {
  // guma
  rubber: { color: '#1c1c1e', roughness: 0.88, metalness: 0, tex: 'rubber' },
  rubberTread: { color: '#19191a', roughness: 0.93, metalness: 0, tex: 'rubber' },
  gumwall: { color: '#8a6a45', roughness: 0.8, metalness: 0, tex: 'rubber' },
  // metale
  aluminium: { color: '#c8ccd0', roughness: 0.32, metalness: 1, tex: 'brushed' },
  canBody: { color: '#ffffff', roughness: 0.28, metalness: 0.75, tex: 'canLabel' },
  stainless: { color: '#c3c6c9', roughness: 0.22, metalness: 1, tex: 'brushed' },
  steelDark: { color: '#3a3d40', roughness: 0.55, metalness: 0.9, tex: 'scratched' },
  drumPaint: { color: '#ffffff', roughness: 0.5, metalness: 0.35, tex: 'drumPaint' },
  rust: { color: '#7a4a2a', roughness: 0.9, metalness: 0.3, tex: 'rust' },
  bakelite: { color: '#16171a', roughness: 0.45, metalness: 0, tex: null },
  // papier
  newsprint: { color: '#ffffff', roughness: 0.92, metalness: 0, tex: 'newsEdge' },
  newsTop: { color: '#ffffff', roughness: 0.9, metalness: 0, tex: 'newsTop', side: 'front' },
  twine: { color: '#b89a6a', roughness: 0.95, metalness: 0, tex: 'twine' },
  cardboard: { color: '#ffffff', roughness: 0.95, metalness: 0, tex: 'cardboard' },
  cardboardPlain: { color: '#ffffff', roughness: 0.95, metalness: 0, tex: 'cardboardPlain' },
  cardboardEdge: { color: '#b78f5c', roughness: 0.95, metalness: 0, tex: 'corrugated' },
  // otoczenie i maszyny (MatKit z GameLaboratory: js/render/matkit.js; UV w metrach, tile — metry na kafelek)
  concrete: { color: '#ffffff', roughness: 1, metalness: 0, tex: 'matkit', kit: { kind: 'concrete', color: '#a6a39a', color2: '#77746c', tile: 2, roughness: 0.9, metalness: 0, pores: 0.5, wear: 0.15, dirt: 0.45, seed: 3 } },
  concreteDark: { color: '#ffffff', roughness: 1, metalness: 0, tex: 'matkit', kit: { kind: 'concrete', color: '#7d7a72', color2: '#56534d', tile: 2, roughness: 0.92, metalness: 0, pores: 0.6, wear: 0.2, dirt: 0.6, seed: 4 } },
  hazard: { color: '#ffffff', roughness: 0.6, metalness: 0.3, tex: 'hazard' },
  steelPlate: { color: '#ffffff', roughness: 1, metalness: 1, tex: 'matkit', kit: { kind: 'plate', color: '#7c8388', color2: '#3d4246', tile: 2, roughness: 0.55, metalness: 0.85, wear: 0.35, dirt: 0.4, rust: 0.25, panels: 2, rivets: 1, seed: 5 } },
  rusty: { color: '#ffffff', roughness: 1, metalness: 1, tex: 'matkit', kit: { kind: 'plate', color: '#6d6a66', color2: '#3a2f28', tile: 2, roughness: 0.6, metalness: 0.7, wear: 0.4, dirt: 0.4, rust: 0.7, panels: 3, seed: 6 } },
  paintYellow: { color: '#ffffff', roughness: 1, metalness: 1, tex: 'matkit', kit: { kind: 'paint', color: '#d9a21b', color2: '#8a6a20', tile: 2, roughness: 0.5, metalness: 0.3, wear: 0.3, dirt: 0.35, rust: 0.15, seed: 7 } },
  paintGreen: { color: '#ffffff', roughness: 1, metalness: 1, tex: 'matkit', kit: { kind: 'paint', color: '#3d5a46', color2: '#2a3a30', tile: 2, roughness: 0.55, metalness: 0.3, wear: 0.3, dirt: 0.4, rust: 0.2, seed: 8 } },
  paintRed: { color: '#ffffff', roughness: 1, metalness: 1, tex: 'matkit', kit: { kind: 'paint', color: '#a83a26', color2: '#5a2418', tile: 2, roughness: 0.5, metalness: 0.3, wear: 0.3, dirt: 0.35, rust: 0.2, seed: 9 } },
  paintGrey: { color: '#ffffff', roughness: 1, metalness: 1, tex: 'matkit', kit: { kind: 'paint', color: '#6c7176', color2: '#40444a', tile: 2, roughness: 0.5, metalness: 0.4, wear: 0.3, dirt: 0.35, rust: 0.15, seed: 10 } },
  galvanized: { color: '#ffffff', roughness: 1, metalness: 1, tex: 'matkit', kit: { kind: 'metal', color: '#a9afb3', tile: 1, roughness: 0.45, metalness: 0.95, brushed: 0.1, wear: 0.2, dirt: 0.3, seed: 11 } },
  treadPlate: { color: '#ffffff', roughness: 0.5, metalness: 0.9, tex: 'treadPlate' },
  dirt: { color: '#ffffff', roughness: 1, metalness: 0, tex: 'matkit', kit: { kind: 'rock', color: '#6b5a45', color2: '#3e3326', tile: 4, roughness: 0.97, metalness: 0, cracks: 0.1, grains: 0.9, dirt: 0.6, seed: 12 } },
  copper: { color: '#c27a4a', roughness: 0.35, metalness: 1, tex: 'brushed' },
  refractory: { color: '#ffffff', roughness: 1, metalness: 0, tex: 'matkit', kit: { kind: 'brick', color: '#b9a48a', color2: '#5e5246', tile: 1, roughness: 0.92, metalness: 0, bricks: 6, wear: 0.3, dirt: 0.5, seed: 13 } },
  castIron: { color: '#ffffff', roughness: 1, metalness: 1, tex: 'matkit', kit: { kind: 'metal', color: '#4a4c4e', tile: 0.5, roughness: 0.75, metalness: 0.8, brushed: 0, wear: 0.4, dirt: 0.5, rust: 0.3, seed: 14 } },
  chainLink: { color: '#b4babe', roughness: 0.5, metalness: 0.8, tex: 'chainLink', alphaTest: 0.2, double: true },
  signYard: { color: '#ffffff', roughness: 0.6, metalness: 0.1, tex: 'signYard' },
  signSkup: { color: '#ffffff', roughness: 0.5, metalness: 0.1, tex: 'signSkup' },
  display: { color: '#0a140c', roughness: 0.3, metalness: 0, tex: null, emissive: '#3cff6a', emissiveIntensity: 0.15 },
  priceBoard: { color: '#ffffff', roughness: 0.7, metalness: 0, tex: 'priceBoard' },
  glass: { color: '#9fb4bf', roughness: 0.08, metalness: 0.2, tex: null },
  rubberBlack: { color: '#151515', roughness: 0.8, metalness: 0, tex: 'rubber' },
  glowOrange: { color: '#ff7a1a', roughness: 1, metalness: 0, tex: null, emissive: '#ff6a10', emissiveIntensity: 3 },
  lampLens: { color: '#fff6dc', roughness: 0.2, metalness: 0, tex: null, emissive: '#fff1c8', emissiveIntensity: 2 },
  tape: { color: '#b88c4e', roughness: 0.28, metalness: 0, tex: null },
};

const cache = new Map();

/** Dopisuje rodzaj materiału z parametrami (np. bok opony z napisami i miejscem napisów na profilu). */
export function defineMat(id, def) { if (!DEFS[id]) DEFS[id] = def; return id; }

/** Wspólny materiał rodzaju `id` (raz utworzony). */
export function mat(id) {
  let m = cache.get(id);
  if (m) return m;
  const d = DEFS[id];
  if (!d) throw new Error('nieznany materiał: ' + id);
  m = new THREE.MeshStandardMaterial({ color: new THREE.Color(d.color), roughness: d.roughness, metalness: d.metalness });
  if (d.alphaTest) { m.alphaTest = d.alphaTest; m.transparent = false; }
  if (d.double) m.side = THREE.DoubleSide;
  if (d.emissive) { m.emissive = new THREE.Color(d.emissive); m.emissiveIntensity = d.emissiveIntensity ?? 1; }
  m.name = id; m.userData.def = d;
  cache.set(id, m);
  return m;
}

/** Wszystkie utworzone dotąd materiały (dla js/render/textures.js). */
export function allMaterials() { return [...cache.values()]; }
