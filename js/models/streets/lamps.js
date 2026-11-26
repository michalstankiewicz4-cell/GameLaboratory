// StreetKit — latarnie uliczne (buildLamp).
import * as THREE from '../../../vendor/three/three.module.js';
import { geo } from './geom.js';
import { steel } from './signals.js';

/* ---------------- latarnie ---------------- */
// Latarnie uliczne (przód oprawy: +z — w stronę jezdni). on(true) zapala: oprawa świeci, światło pada w dół na ulicę.
//   LAMPS  modern — współczesna LED, słup ocynkowany 8 m z wysięgnikiem; double — dwa wysięgniki (aleja, pas dzielący);
//          park — stylizowana parkowa, żeliwny słup 4 m z latarnią (ciepłe światło); old — stara betonowa (PRL) 9 m
//          z oprawą sodową (pomarańczowe światło)
//   buildLamp(type) → { group, on(true | false), light }
export const LAMPS = {
  modern: { label: 'Współczesna LED', h: 8, color: 0xf2f4ff, temp: [0.95, 0.97, 1] },
  double: { label: 'Podwójna (aleja)', h: 9, color: 0xf2f4ff, temp: [0.95, 0.97, 1] },
  park: { label: 'Parkowa stylizowana', h: 4, color: 0xffd9a0, temp: [1, 0.82, 0.6] },
  old: { label: 'Stara betonowa (sodowa)', h: 9, color: 0xffa23a, temp: [1, 0.6, 0.22] },
};
export function buildLamp(type = 'modern') {
  const T = LAMPS[type] || LAMPS.modern, g = new THREE.Group(); g.name = 'latarnia: ' + T.label;
  const add = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const glass = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: T.color, emissiveIntensity: 0, roughness: 0.3 });
  const heads = [];
  if (type === 'park') {
    const iron = new THREE.MeshStandardMaterial({ color: 0x1d2420, roughness: 0.6, metalness: 0.6 });
    add(new THREE.CylinderGeometry(0.16, 0.2, 0.6, 12), iron, 0, 0.3, 0);
    add(new THREE.CylinderGeometry(0.05, 0.07, T.h - 0.3, 12), iron, 0, 0.3 + (T.h - 0.3) / 2, 0);   // słup do kołnierza latarni
    for (let i = 0; i < 3; i++) add(new THREE.TorusGeometry(0.075, 0.015, 6, 14).rotateX(Math.PI / 2), iron, 0, 1 + i * 1.1, 0);
    add(new THREE.CylinderGeometry(0.12, 0.08, 0.12, 6), iron, 0, T.h + 0.06, 0);
    const lan = add(new THREE.CylinderGeometry(0.2, 0.13, 0.45, 6), glass, 0, T.h + 0.35, 0); heads.push(lan);
    add(new THREE.ConeGeometry(0.28, 0.25, 6), iron, 0, T.h + 0.7, 0);
    add(new THREE.SphereGeometry(0.04, 8, 6), iron, 0, T.h + 0.86, 0);
  } else if (type === 'old') {
    const conc = new THREE.MeshStandardMaterial({ color: 0x9c9890, roughness: 0.9 });
    add(new THREE.BoxGeometry(0.22, T.h, 0.18).translate(0, 0, 0), conc, 0, T.h / 2, 0);
    const arm = add(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8), steel(), 0, T.h - 0.1, 0.75); arm.rotation.x = Math.PI / 2 - 0.15;
    const hous = add(new THREE.BoxGeometry(0.3, 0.14, 0.6), new THREE.MeshStandardMaterial({ color: 0x6d7378, roughness: 0.6, metalness: 0.3 }), 0, T.h, 1.5);
    const gl = add(new THREE.BoxGeometry(0.26, 0.04, 0.5), glass, 0, T.h - 0.08, 1.5); heads.push(gl); hous.rotation.x = 0.15; gl.rotation.x = 0.15;
  } else {
    const st = steel();
    add(new THREE.CylinderGeometry(0.1, 0.13, 0.5, 12), st, 0, 0.25, 0);
    add(new THREE.CylinderGeometry(0.055, 0.09, T.h, 12), st, 0, T.h / 2, 0);
    const sides = type === 'double' ? [1, -1] : [1];
    for (const sd of sides) {
      const arm = add(new THREE.CylinderGeometry(0.035, 0.04, 1.8, 10), st, 0, T.h + 0.15, sd * 0.85); arm.rotation.x = Math.PI / 2 - sd * 0.12;
      const hous = add(new THREE.BoxGeometry(0.28, 0.08, 0.62), new THREE.MeshStandardMaterial({ color: 0x5b6166, roughness: 0.4, metalness: 0.6 }), 0, T.h + 0.28, sd * 1.75);
      const gl = add(new THREE.BoxGeometry(0.24, 0.02, 0.5), glass, 0, T.h + 0.23, sd * 1.75); heads.push(gl);
      hous.rotation.x = -sd * 0.08; gl.rotation.x = -sd * 0.08;
    }
  }
  // światło w dół spod oprawy (jedno na latarnię; cienie wyłączone — dziesiątki latarni)
  const p = heads[0].position, light = new THREE.SpotLight(T.color, 0, T.h * 3.2, 1.05, 0.6, 2);
  light.position.set(type === 'double' ? 0 : p.x, p.y - 0.05, type === 'double' ? 0 : p.z); light.target.position.set(light.position.x, 0, light.position.z + (type === 'park' || type === 'double' ? 0 : 0.6));
  g.add(light, light.target);
  return {
    group: g, light,
    on(v = true) { glass.emissiveIntensity = v ? (type === 'old' ? 2.4 : 2) : 0; light.intensity = v ? T.h * T.h * (type === 'park' ? 0.9 : type === 'double' ? 2 : 1.3) : 0; },
  };
}
