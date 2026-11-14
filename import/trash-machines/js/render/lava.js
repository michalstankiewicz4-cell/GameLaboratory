// Materiał stopionego metalu: shader lawy z GameLaboratory (js/render/liquid.js, lavaColor). uHeat 1 — ciekły, żółto-pomarańczowy;
// 0 — zastygły (szary metal). Wspólny zegar LIQUID_TIME przesuwa wzór (gra dodaje czas w pętli).
import * as THREE from '../../vendor/three/three.module.js';
import { LIQUID_TIME, LIQUID_GLSL } from './liquid.js';

export { LIQUID_TIME };
export function lavaMaterial({ heat = 1, scale = 6, metal = '#9a9ea2' } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: LIQUID_TIME, uHeat: { value: heat }, uScale: { value: scale }, uMetal: { value: new THREE.Color(metal) } },
    vertexShader: `varying vec3 vP; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position,1.0);
      #ifdef USE_INSTANCING
        w = modelMatrix * instanceMatrix * vec4(position,1.0);
      #endif
      vP = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `#define LQ_OCTAVES 3
      uniform float uTime; uniform float uHeat; uniform float uScale; uniform vec3 uMetal; varying vec3 vP; varying vec3 vN;
      ${LIQUID_GLSL}
      void main(){
        vec3 lava = lavaColor(vP * uScale, uTime) * (1.4 + uHeat);
        float l = 0.35 + 0.65 * max(dot(normalize(vN), normalize(vec3(0.4,1.0,0.3))), 0.0);
        vec3 cold = uMetal * l;
        vec3 c = mix(cold, lava, smoothstep(0.0, 0.35, uHeat));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}
