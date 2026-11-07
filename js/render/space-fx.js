// Efekty kosmosu dla potoku kamery Battle (LookPipeline, js/render/sea/look.js): soczewkowanie grawitacyjne czarnej
// dziury, flara słońca i promienie światła — algorytmy z PostKit (dawny potok laboratoriów ze Space, usunięty w 0.56.0),
// tu jako kroki przed obróbką kamery, żeby edytor sceny i laboratoria Battle pokazywały je tak samo.
// Działa na liniowym obrazie sceny (przed mapowaniem tonów potoku kamery).
//
// createSpaceFx(renderer) → { render(scene, camera, rt, opts) → tekstura po efektach albo null (nic do zrobienia) }
//   rt — cel, do którego potok już narysował scenę (z głębią); opts: { lens, flare } jak w PostKit:
//   lens: { object, position, radius } — czarna dziura: object ukryty na czas rysowania sceny, obraz zagięty wokół
//         position, potem object rysowany na wierzchu; radius — promień horyzontu (jednostki świata)
//   flare: { position, radius, strength, rays } — słońce: flara obiektywu (strength), promienie (rays), 0 — bez
import * as THREE from '../../vendor/three/three.module.js';

const LENS_E = 1.6;   // promień Einsteina w promieniach horyzontu (jak PostKit)
const QUAD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const LENS_FS = `
uniform sampler2D tDiffuse; uniform float uAspect; uniform vec3 uLens; uniform float uLensE; varying vec2 vUv;
void main(){
  vec2 k = vec2(uAspect, 1.0), d = (vUv - uLens.xy) * k;
  float r = length(d), E = uLens.z * uLensE;
  vec2 s = d * (1.0 - E * E / max(r * r, 1e-8));
  s = mix(s, d, smoothstep(E * 3.0, E * 7.0, r));
  vec3 c = texture2D(tDiffuse, clamp(uLens.xy + s / k, 0.001, 0.999)).rgb;
  gl_FragColor = vec4(c * smoothstep(uLens.z * 0.8, uLens.z * 1.2, r), 1.0);
}`;
// flara i promienie z PostKit (FINAL_FS: „the sun's lens flare and light rays”); jasność w obrazie liniowym ściśnięta
// do 0…1 (x / (1 + x)), żeby progi działały jak na ekranie
const FLARE_FS = `
uniform sampler2D tDiffuse; uniform float uAspect, uTime, uRays; uniform vec4 uSun; varying vec2 vUv;
float lum(vec3 c){ vec3 d = c / (1.0 + c); return dot(d, vec3(0.299, 0.587, 0.114)); }
vec3 scene(vec2 uv){ return texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).rgb; }
void main(){
  vec2 k = vec2(uAspect, 1.0); vec3 col = scene(vUv);
  float vis = 0.0;
  for(int i = 0; i < 7; i++){ float a = float(i) * 0.8976; vec2 o = i == 0 ? vec2(0.0) : vec2(cos(a), sin(a)) * uSun.z * 0.55; vis += smoothstep(0.55, 0.9, lum(scene(uSun.xy + o / k))); }
  vis /= 7.0; vis *= 1.0 - smoothstep(0.08, 0.3, uSun.z);
  if(uRays > 0.0 && vis > 0.001){
    vec2 st = (uSun.xy - vUv) / 24.0, pos = vUv; float decay = 1.0, acc = 0.0;
    for(int i = 0; i < 24; i++){ pos += st; acc += smoothstep(0.6, 1.0, lum(scene(pos))) * decay; decay *= 0.93; }
    col += vec3(1.0, 0.88, 0.7) * acc / 10.0 * exp(-length((vUv - uSun.xy) * k) * 2.2) * vis * uRays * 0.38;
  }
  if(vis > 0.001 && uSun.w > 0.0){
    vec3 fl = vec3(0.0); vec2 toS = (vUv - uSun.xy) * k; float rs = length(toS), ang = atan(toS.y, toS.x);
    float rays = pow(abs(sin(ang * 6.0 + uTime * 0.05)), 120.0) + pow(abs(sin(ang * 11.0 - uTime * 0.03 + 1.3)), 160.0) * 0.6;
    fl += vec3(1.0, 0.9, 0.75) * rays * exp(-rs / max(uSun.z * 2.2, 0.015)) * 0.45;
    fl += vec3(1.0, 0.85, 0.6) * exp(-rs / max(uSun.z * 1.8, 0.012)) * 0.35;
    fl += vec3(0.7, 0.8, 1.0) * exp(-abs(toS.y) * 260.0) * exp(-abs(toS.x) * 3.0) * 0.25;
    vec2 axis = vec2(0.5) - uSun.xy;
    for(int g = 0; g < 5; g++){
      float t = g == 0 ? 0.55 : g == 1 ? 0.8 : g == 2 ? 1.25 : g == 3 ? 1.55 : 1.9;
      float sz = g == 0 ? 0.05 : g == 1 ? 0.025 : g == 2 ? 0.08 : g == 3 ? 0.035 : 0.12;
      vec3 gc = g == 0 ? vec3(0.4, 0.7, 1.0) : g == 1 ? vec3(1.0, 0.6, 0.3) : g == 2 ? vec3(0.5, 1.0, 0.6) : g == 3 ? vec3(0.9, 0.5, 1.0) : vec3(0.4, 0.6, 1.0);
      float dg = length((vUv - (uSun.xy + axis * 2.0 * t)) * k);
      fl += gc * smoothstep(sz, sz * 0.6, dg) * (0.05 + 0.05 * smoothstep(sz * 0.5, sz, dg));
    }
    fl += vec3(0.6, 0.75, 1.0) * exp(-pow((rs - 0.32) * 18.0, 2.0)) * 0.05;
    col += fl * vis * uSun.w;
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const tmpV = new THREE.Vector3();
// położenie kuli na ekranie: xy (uv), z — promień (wysokości ekranu); false — za kamerą albo poza kadrem (jak PostKit)
export function sphereOnScreen(camera, pos, radius, out, margin = 0) {
  tmpV.copy(pos).applyMatrix4(camera.matrixWorldInverse);
  if (tmpV.z > -radius * 0.5) return false;
  const dist = -tmpV.z; tmpV.applyMatrix4(camera.projectionMatrix);
  if (Math.abs(tmpV.x) > 1 + margin || Math.abs(tmpV.y) > 1 + margin) return false;
  out.set(tmpV.x * 0.5 + 0.5, tmpV.y * 0.5 + 0.5, radius / (dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / 2);
  return true;
}

export function createSpaceFx(renderer) {
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = (mat) => { const s = new THREE.Scene(), m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); m.frustumCulled = false; s.add(m); return s; };
  const shader = (fs, u) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: QUAD_VS, fragmentShader: fs, depthTest: false, depthWrite: false });
  const lensMat = shader(LENS_FS, { tDiffuse: { value: null }, uAspect: { value: 1 }, uLens: { value: new THREE.Vector3() }, uLensE: { value: LENS_E } });
  const flareMat = shader(FLARE_FS, { tDiffuse: { value: null }, uAspect: { value: 1 }, uTime: { value: 0 }, uRays: { value: 0 }, uSun: { value: new THREE.Vector4() } });
  const lensScene = quad(lensMat), flareScene = quad(flareMat);
  let A = null, B = null;
  const target = (rt, t) => {
    if (!t || t.width !== rt.width || t.height !== rt.height) { if (t) t.dispose(); t = new THREE.WebGLRenderTarget(rt.width, rt.height, { type: THREE.HalfFloatType, depthBuffer: true }); t.texture.generateMipmaps = true; t.texture.minFilter = THREE.LinearMipmapLinearFilter; }
    return t;
  };
  const sun = new THREE.Vector3();
  return {
    // przed rysowaniem sceny: czy soczewka jest w kadrze (wtedy jej obiekt ukryty na czas rysowania sceny)
    lensOn(camera, lens) { return !!(lens && lens.object && lens.object.visible && sphereOnScreen(camera, lens.position, lens.radius, lensMat.uniforms.uLens.value, 0.8)); },
    render(scene, camera, rt, { lens, lensOn, flare } = {}) {
      const aspect = rt.width / Math.max(1, rt.height);
      let src = rt.texture, done = false;
      if (lensOn && lensMat.uniforms.uLens.value.z * rt.height > 2) {
        A = target(rt, A);
        lensMat.uniforms.tDiffuse.value = src; lensMat.uniforms.uAspect.value = aspect;
        renderer.setRenderTarget(A); renderer.render(lensScene, cam);
        const auto = renderer.autoClear; renderer.autoClear = false; renderer.clearDepth();
        lens.object.visible = true; renderer.render(lens.object, camera); renderer.autoClear = auto;
        src = A.texture; done = true;
      } else if (lensOn) lens.object.visible = true;
      if (flare && (flare.strength > 0 || flare.rays > 0) && sphereOnScreen(camera, flare.position, flare.radius, sun, 0.3)) {
        B = target(rt, B);
        const U = flareMat.uniforms; U.tDiffuse.value = src; U.uAspect.value = aspect; U.uTime.value = performance.now() / 1000;
        U.uSun.value.set(sun.x, sun.y, sun.z, flare.strength || 0); U.uRays.value = flare.rays || 0;
        renderer.setRenderTarget(B); renderer.render(flareScene, cam);
        src = B.texture; done = true;
      }
      return done ? src : null;
    },
  };
}
