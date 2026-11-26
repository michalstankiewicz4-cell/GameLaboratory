// Drobny gruz na karcie graficznej: okruchy cegły, szkła, tynku, drzazgi — tylko do oglądania (nie są bryłami: trąba
// ich nie je, nie uderzają w budynki, nie palą się). Procesor zapisuje tylko start okrucha (miejsce, prędkość, obrót,
// czas narodzin); lot liczy shader: rzut z oporem powietrza (prędkość maleje wykładniczo, spadek dąży do prędkości
// granicznej), obrót słabnący, na ziemi zostaje (wysokość gruntu z miejsca narodzin), pod koniec życia zapada się.
// Jeden InstancedMesh na cały świat, bufor w kółko (najstarsze okruchy ustępują nowym).
//   createChips(scene, { max, ground }) → { burst(at, vel, { n, color, size, spread, up }), update(time), count }
//     at — Vector3, vel — średnia prędkość [Vector3], color — THREE.Color, size — średni rozmiar okrucha (m)
import * as THREE from '../../../../vendor/three/three.module.js';
import { touchAttr } from '../../../render/partial-upload.js';

const K = 1.6, G = 9.81;   // opór (1/s) i grawitacja: prędkość graniczna G / K ≈ 6 m/s — lekki okruch

export function createChips(scene, { max = 24000, ground = () => 0, life = [5, 9] } = {}) {
  // okruch: nieregularny czworościan (cztery losowe punkty) — różne kształty z jednej siatki dzięki skali osi
  const geo = new THREE.TetrahedronGeometry(0.5, 0).toNonIndexed(); geo.computeVertexNormals();
  const mk = (n) => new THREE.InstancedBufferAttribute(new Float32Array(max * n), n).setUsage(THREE.DynamicDrawUsage);
  const A = { aP: mk(4), aV: mk(4), aS: mk(4), aC: mk(4) };   // aP: start + ziemia, aV: prędkość + narodziny, aS: oś obrotu + szybkość, aC: barwa + rozmiar
  const aL = mk(2);                                             // życie, wydłużenie
  Object.entries(A).forEach(([k, a]) => geo.setAttribute(k, a)); geo.setAttribute('aL', aL);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  const U = { uTime: { value: 0 } };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute vec4 aP, aV, aS, aC; attribute vec2 aL; uniform float uTime; varying vec3 vChip;
mat3 rotAxis(vec3 a, float t) { float c = cos(t), s = sin(t), k = 1.0 - c; return mat3(c + a.x*a.x*k, a.y*a.x*k + a.z*s, a.z*a.x*k - a.y*s, a.x*a.y*k - a.z*s, c + a.y*a.y*k, a.z*a.y*k + a.x*s, a.x*a.z*k + a.y*s, a.y*a.z*k - a.x*s, c + a.z*a.z*k); }
float chipT() { return uTime - aV.w; }
mat3 chipR() { float t = max(chipT(), 0.0); return rotAxis(normalize(aS.xyz), aS.w * (1.0 - exp(-${K.toFixed(2)} * t)) / ${K.toFixed(2)}); }`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
objectNormal = chipR() * objectNormal;`)
      .replace('#include <begin_vertex>', `float chT = chipT(), chLife = aL.x;
float chAlive = step(0.0, chT) * step(chT, chLife);
float chFade = 1.0 - smoothstep(chLife * 0.8, chLife, chT);        // zapada się pod koniec
float chE = 1.0 - exp(-${K.toFixed(2)} * chT);
vec3 chP = aP.xyz + aV.xyz * chE / ${K.toFixed(2)};
chP.y -= ${(G / K).toFixed(3)} * (chT - chE / ${K.toFixed(2)});    // opór liniowy: spadek do prędkości granicznej
chP.y = max(chP.y, aP.w + aC.w * 0.3);                             // leży na ziemi
vec3 transformed = chipR() * (position * vec3(aC.w * aL.y, aC.w, aC.w / aL.y)) * chAlive * chFade + chP;
vChip = aC.rgb;`)
      .replace('#include <project_vertex>', `vec4 mvPosition = vec4(transformed, 1.0);
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vChip;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= vChip;');
  };
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = true; mesh.name = 'gruz (GPU)';
  const I = new THREE.Matrix4(); for (let i = 0; i < max; i++) mesh.setMatrixAt(i, I);
  mesh.count = 0; scene.add(mesh);
  let head = 0, used = 0, now = 0;

  function burst(at, vel, { n = 12, color = new THREE.Color(0.6, 0.55, 0.5), size = 0.06, spread = 2.5, up = 1.5, radius = 0.3 } = {}) {
    n = Math.min(n | 0, max);
    for (let k = 0; k < n; k++) {
      const i = head; head = (head + 1) % max; used = Math.min(max, used + 1);
      const x = at.x + (Math.random() - 0.5) * 2 * radius, y = at.y + (Math.random() - 0.5) * radius, z = at.z + (Math.random() - 0.5) * 2 * radius;
      A.aP.setXYZW(i, x, y, z, ground(x, z));
      A.aV.setXYZW(i, vel.x + (Math.random() - 0.5) * 2 * spread, vel.y + Math.random() * up + (Math.random() - 0.5) * spread, vel.z + (Math.random() - 0.5) * 2 * spread, now);
      A.aS.setXYZW(i, Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5 + 1e-3, 4 + Math.random() * 14);
      const s = size * (0.4 + Math.random() * 1.2), sh = 0.85 + Math.random() * 0.3;
      A.aC.setXYZW(i, color.r * sh, color.g * sh, color.b * sh, s);
      aL.setXY(i, life[0] + Math.random() * (life[1] - life[0]), 0.6 + Math.random() * 1.4);
      for (const a of [A.aP, A.aV, A.aS, A.aC]) touchAttr(a, i * 4, 4);
      touchAttr(aL, i * 2, 2);
    }
    mesh.count = used;
  }
  return {
    burst, mesh,
    update(time) { now = time; U.uTime.value = time; },
    get count() { return used; },
  };
}
