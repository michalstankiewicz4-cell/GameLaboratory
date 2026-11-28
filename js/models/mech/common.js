// MechKit — wspólne dla zestawów części (ClockKit, czujniki, przekaźniki, regulatory): pomocniki geometrii (kształt w xy wyciągnięty wzdłuż z, walec wzdłuż z, okrąg), porty, język
// podpisów i materiały zegarmistrzowskie (mosiądz polerowany, stal polerowana i oksydowana, rubin, orzech…).
import * as THREE from '../../../vendor/three/three.module.js';
import { materials as mkMaterials } from './mechkit.js';
import { makeMaterial, PRESETS } from '../../render/materials/matkit.js';

export const TAU = Math.PI * 2;
export const EN = typeof window !== 'undefined' && !!window.LabMenu && !!window.LabMenu.LANG && window.LabMenu.LANG !== 'pl';
export const mesh = (g, m, shadow = true) => { const o = new THREE.Mesh(g, m); o.castShadow = shadow; o.receiveShadow = true; return o; };
export const port = (name, domain, iface) => ({ name, domain, iface });
export const circle = (r, n = 48, x = 0, y = 0, cw = true) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, TAU, cw); return p; };
// kształt w xy wyciągnięty wzdłuż z: od z0 do z0 + t, z małą fazą na krawędziach; współrzędne tekstury ×25 (kafel 4 cm —
// tekstury MatKit mają skalę części zegarowych, nie metra)
export const slab = (shape, t, z0 = 0, bevel = 0.0002, curve = 32) => {
  { const pts = shape.getPoints(curve); let per = 0; for (let i = 0; i < pts.length; i++) per += pts[i].distanceTo(pts[(i + 1) % pts.length]); bevel = Math.min(bevel, 0.5 * per / Math.max(1, pts.length)); }   // faza a drobne kształty
  const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1e-5, t - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 1, curveSegments: curve }).translate(0, 0, z0 + bevel);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 25, uv.getY(i) * 25);
  return geo;
};
export const cylZ = (r, len, seg = 32, r2 = r) => new THREE.CylinderGeometry(r2, r, len, seg).rotateX(Math.PI / 2);   // wzdłuż +z (r na −z)

/* ---------------- materiały zegarmistrzowskie ---------------- */
let MATS = null;
export function materials() {
  if (MATS) return MATS;
  const M = mkMaterials(), mk = (def) => makeMaterial(def, { res: 512 }).material;
  MATS = {
    ...M,
    brassP: new THREE.MeshPhysicalMaterial({ color: 0xd8b466, metalness: 1, roughness: 0.2, clearcoat: 0.35, clearcoatRoughness: 0.1 }),   // mosiądz polerowany i lakierowany (koła, płyty)
    brassF: new THREE.MeshPhysicalMaterial({ color: 0xc9a258, metalness: 1, roughness: 0.36 }),                                          // mosiądz szlifowany (filary, bęben)
    steelP: new THREE.MeshPhysicalMaterial({ color: 0xd9dde0, metalness: 1, roughness: 0.1, clearcoat: 0.3 }),          // stal polerowana (osie, zębniki)
    blued: new THREE.MeshPhysicalMaterial({ color: 0x1b2f78, metalness: 1, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.08 }),   // stal oksydowana na niebiesko (wskazówki, śruby)
    spring: new THREE.MeshPhysicalMaterial({ color: 0x8b98a8, metalness: 1, roughness: 0.28, clearcoat: 0.4 }),          // stal sprężynowa (oliwiona)
    springBlue: new THREE.MeshPhysicalMaterial({ color: 0x24366e, metalness: 1, roughness: 0.25, clearcoat: 0.6, side: THREE.DoubleSide }),   // sprężyna zegarowa (hartowana, niebieska)
    ruby: new THREE.MeshPhysicalMaterial({ color: 0xc0122e, metalness: 0, roughness: 0.04, transmission: 0.55, thickness: 0.002, ior: 1.77, clearcoat: 1, attenuationColor: new THREE.Color(0x7a0016), attenuationDistance: 0.004 }),
    walnut: mk({ ...PRESETS.planks, color: '#6a4528', color2: '#2f1d10', planks: 1, grain: 0.85, roughness: 0.32, wear: 0.05, dirt: 0.05 }),
    castPaint: mk({ ...PRESETS.hull, color: '#2f5a3c', color2: '#1d3a26', tile: 2, wear: 0.15, dirt: 0.15, rust: 0 }),   // żeliwo malowane (koło zamachowe)
  };
  return MATS;
}

// tekstura z płótna (podpisy, wyświetlacze, skale): draw(ctx, w, h)
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { c, t, redraw: (fn) => { fn(c.getContext('2d'), w, h); t.needsUpdate = true; } };
}
// tworzywa: PBT czujników, obudowy aparatów (RAL 7035), czarne fronty
export const plastic = (color, rough = 0.5) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
export const glow = (color) => new THREE.MeshStandardMaterial({ color: 0x222222, emissive: color, emissiveIntensity: 0, roughness: 0.3 });

// naklejka / nadruk na powierzchni (tabliczka, front aparatu): przesunięcie głębi zamiast odstępu — rysuje się na wierzchu
export const decal = (map, rough = 0.6) => new THREE.MeshStandardMaterial({ map, roughness: rough, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
