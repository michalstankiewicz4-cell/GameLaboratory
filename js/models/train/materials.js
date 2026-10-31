// TrainKit — wspólne materiały taboru i toru (z aTrain, js/app.js). Kolory bazowe
// są tutaj; część wspólna nadwozi (bodies/shared.js) nadaje im potem tekstury
// (rama, stal, koła, sprężyny, podkłady, podsypka) — dokładnie jak w aTrain.
import { stockShared } from "./bodies/shared.js";
const THREE = window.THREE;

const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.75, metalness: 0.05 }, o));

let cache = null, stock = null;
export function trainMaterials() {
  if (cache) return cache;
  cache = {
    ground: M(0x6d7754, { roughness: 1 }), ballast: M(0x8b867d, { roughness: 1, side: THREE.DoubleSide }), sleeper: M(0x564739, { roughness: 0.95 }),
    rail: M(0x9da1a6, { roughness: 0.35, metalness: 0.75, side: THREE.DoubleSide }),
    plate: M(0x4a4d50, { roughness: 0.6, metalness: 0.5 }), bolt: M(0x2c2e30),
    wheel: M(0x5b5f63, { roughness: 0.45, metalness: 0.6 }), tread: M(0xb7bbbf, { roughness: 0.3, metalness: 0.85 }),
    mark: M(0xe9e4d6, { roughness: 0.6 }),
    frame: M(0x26292b, { roughness: 0.7 }), spring: M(0x3a3d40, { roughness: 0.5, metalness: 0.4 }),
    beam: M(0x9b2f22), loco: M(0x2f4b40), cab: M(0x3a5a4d), glass: M(0x1c2328, { roughness: 0.2, metalness: 0.3 }),
    lampW: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d6, emissiveIntensity: 1.2 }),
    lampR: new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff2010, emissiveIntensity: 1.4 }),
    wagon1: M(0x6b3b2b), wagon2: M(0x4b5964), roof: M(0x77756f), steel: M(0x8e9296, { roughness: 0.4, metalness: 0.7 }),
    knuckle: M(0x3d4246, { roughness: 0.55, metalness: 0.5 }),
  };
  stock = stockShared(cache);
  return cache;
}

// materiały i pomocnicze bryły nadwozi (bodies/shared.js)
export function trainStock() { trainMaterials(); return stock; }

// małe pomocnicze bryły (jak w aTrain)
export const box = (parent, m, sx, sy, sz, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); parent.add(o); return o; };
export const cylX = (parent, m, r, len, x, y, z, seg = 20) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateZ(Math.PI / 2); const o = new THREE.Mesh(g, m); o.position.set(x, y, z); parent.add(o); return o; };
