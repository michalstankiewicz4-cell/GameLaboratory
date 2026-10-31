// Model doctor — shared helpers for the model sources.
import * as THREE from '../../../vendor/three/three.module.js';

// what the model costs to draw as built: triangles, draw calls, materials
export function countDraw(root) {
  let tris = 0, calls = 0; const mats = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    const ms = [].concat(o.material); ms.forEach((m) => mats.add(m)); calls += Array.isArray(o.material) ? Math.max(1, g.groups.length) : 1;
  });
  return { triangles: Math.round(tris), drawCalls: calls, materials: mats.size };
}
