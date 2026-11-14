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
  newsTop: { color: '#ffffff', roughness: 0.9, metalness: 0, tex: 'newsTop' },
  twine: { color: '#b89a6a', roughness: 0.95, metalness: 0, tex: 'twine' },
  cardboard: { color: '#ffffff', roughness: 0.95, metalness: 0, tex: 'cardboard' },
  cardboardEdge: { color: '#b78f5c', roughness: 0.95, metalness: 0, tex: 'corrugated' },
  tape: { color: '#c9a36a', roughness: 0.35, metalness: 0, tex: 'tape', transparent: false },
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
  m.name = id; m.userData.def = d;
  cache.set(id, m);
  return m;
}

/** Wszystkie utworzone dotąd materiały (dla js/render/textures.js). */
export function allMaterials() { return [...cache.values()]; }
