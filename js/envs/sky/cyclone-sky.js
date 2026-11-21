// Niebo cyklonu (js/envs/sky/cyclone.js): to, czego nie da się zrobić liczbami pogody SkyKit —
//  • pasma nad głową: warstwa chmur na 1,8 km wokół kamery, z gęstością spiralnych pasm cyklonu w prawdziwych
//    kilometrach (od środka cyklonu) — ciemne pasma przesuwają się nad sceną, gdy cyklon idzie i się obraca;
//  • ściana oka w oku: pierścień jasnych, oświetlonych słońcem chmur rozchylony ku górze jak trybuny stadionu dookoła na horyzoncie (oko ma 10–60 km: pierścień
//    narysowany bliżej, w tej samej skali kątowej — środek i promień przeskalowane do ok. 4,5 km od kamery), jasny u góry
//    od słońca, nad nim przejaśnienie.
// createCycloneSky(scene) → { update(camera, view, { light, fog, sunDir, t }), dispose(), group }
//   view — { rel [x, z] km (scena od środka), Rm km, sign (1 — północna, −1 — południowa), at: cycloneAt(...), ct — czas
//   cyklonu (s) } albo null
import * as THREE from '../../../vendor/three/three.module.js';

const NOISE = /* glsl */`
float cyH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float cyN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(cyH(i), cyH(i + vec2(1, 0)), f.x), mix(cyH(i + vec2(0, 1)), cyH(i + vec2(1, 1)), f.x), f.y); }
float cyF(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * cyN(p); p *= 2.03; a *= 0.5; } return s; }`;
const LAYER_VS = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const LAYER_FS = /* glsl */`
uniform vec2 uRel; uniform float uRm, uSign, uSpin, uTime, uAlpha, uLight; uniform vec3 uCol, uFogCol; uniform float uFogDen;
varying vec3 vW;
${NOISE}
void main() {
  vec2 km = uRel + vec2(vW.x, vW.z) / 1000.0;                       // punkt w km od środka cyklonu
  float r = length(km) + 1e-4, x = r / uRm;
  float th = atan(km.y, km.x) * uSign + uSpin;
  float ph = th - log(x) / tan(0.2618);
  float band = pow(0.5 + 0.5 * cos(3.0 * ph), 5.0) * smoothstep(1.4, 2.2, x) * (1.0 - smoothstep(8.0, 13.0, x));
  float wall = exp(-pow((x - 1.1) / 0.32, 2.0)), eye = 1.0 - smoothstep(0.55, 0.9, x);
  vec2 q = vW.xz / 900.0 + vec2(uTime * 0.004, uTime * 0.002);
  float n = cyF(q), dens = clamp(max(band * 1.1, wall) * (0.6 + 0.6 * n) - 0.15, 0.0, 1.0) * (1.0 - eye);
  float d = length(vW.xz - cameraPosition.xz);
  float a = uAlpha * dens * (1.0 - smoothstep(5000.0, 8500.0, d));
  vec3 c = uCol * (0.45 + 0.35 * n) * uLight;
  c = mix(c, uFogCol, 1.0 - exp(-pow(d * uFogDen * 0.6, 2.0)));
  gl_FragColor = vec4(c, a);
  #include <colorspace_fragment>
}`;
const WALL_VS = 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const WALL_FS = /* glsl */`
uniform float uTime, uAlpha, uLight; uniform vec3 uCol, uTop, uFogCol; uniform vec3 uSun;
varying vec2 vUv; varying vec3 vW;
${NOISE}
void main() {
  float h = vUv.y;
  // kłęby: komórki (jak kalafior) — „wypukła” odmiana szumu, cieniowana od góry z pochodnych (jasne czubki, ciemne zagłębienia)
  vec2 q = vec2(vUv.x * 70.0 + uTime * 0.01, h * 6.5);
  float n = cyF(q), b = 1.0 - abs(2.0 * cyF(q * 1.9 + 7.3) - 1.0);
  float nx = cyF(q + vec2(0.06, 0.0)) - n, ny = cyF(q + vec2(0.0, 0.06)) - n;
  float puff = 0.55 + 0.45 * b;                                       // środek kłębu jaśniejszy
  float shade = clamp(0.78 + 4.0 * ny - 1.5 * nx, 0.5, 1.15);          // światło z góry i z boku
  // wieże u góry: krawędź ściany nierówna (kopuły chmur na różnej wysokości)
  float top = 0.62 + 0.26 * cyF(vec2(vUv.x * 28.0, 3.7)) + 0.1 * n;
  float edge = 1.0 - smoothstep(top - 0.1 * b - 0.04, top, h);
  float a = uAlpha * edge * smoothstep(0.0, 0.08, h + 0.02);
  vec3 dir = normalize(vW - cameraPosition);
  float lit = 0.75 + 0.25 * (dot(-dir, normalize(uSun)) * 0.5 + 0.5);   // ściana w słońcu (w oku jasno), od słońca trochę jaśniejsza
  vec3 c = mix(uCol, uTop, smoothstep(0.1, 0.7, h) * 0.6 + 0.4 * b) * puff * shade * lit * uLight;
  c = mix(uFogCol, c, smoothstep(0.0, 0.25, h));                      // dół w mgiełce
  gl_FragColor = vec4(c, a);
  #include <colorspace_fragment>
}`;

export function createCycloneSky(scene) {
  const group = new THREE.Group(); group.name = 'cyclone sky'; group.visible = false; scene.add(group);
  const LU = { uRel: { value: new THREE.Vector2() }, uRm: { value: 25 }, uSign: { value: 1 }, uSpin: { value: 0 }, uTime: { value: 0 }, uAlpha: { value: 0.9 },
    uLight: { value: 1 }, uCol: { value: new THREE.Color(0.32, 0.33, 0.35) }, uFogCol: { value: new THREE.Color(0.6, 0.62, 0.65) }, uFogDen: { value: 0.0004 } };
  const layer = new THREE.Mesh(new THREE.PlaneGeometry(18000, 18000, 1, 1).rotateX(Math.PI / 2),
    new THREE.ShaderMaterial({ uniforms: LU, vertexShader: LAYER_VS, fragmentShader: LAYER_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  layer.frustumCulled = false; layer.renderOrder = -1; group.add(layer);
  const WU = { uTime: { value: 0 }, uAlpha: { value: 0 }, uLight: { value: 1 }, uCol: { value: new THREE.Color(0.6, 0.63, 0.68) }, uTop: { value: new THREE.Color(1.0, 1.0, 0.98) },
    uFogCol: { value: new THREE.Color(0.6, 0.62, 0.65) }, uSun: { value: new THREE.Vector3(0, 1, 0) } };
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1, 1, 128, 1, true).translate(0, 0.5, 0),
    new THREE.ShaderMaterial({ uniforms: WU, vertexShader: WALL_VS, fragmentShader: WALL_FS, transparent: true, depthWrite: false, side: THREE.BackSide }));
  wall.frustumCulled = false; wall.renderOrder = -1; group.add(wall);
  const D = 4500;   // pierścień oka rysowany w tej odległości (ta sama skala kątowa; w zasięgu kamery 9 km)
  return {
    group,
    update(camera, view, env = {}) {
      if (!view) { group.visible = false; return; }
      group.visible = true;
      const A = view.at, t = env.t || 0;
      LU.uTime.value = WU.uTime.value = t;
      LU.uRel.value.set(view.rel[0], view.rel[1]); LU.uRm.value = view.Rm; LU.uSign.value = view.sign;
      LU.uSpin.value = (view.ct ?? t) * 2 * Math.PI / 14400;   // obrót pasm w czasie cyklonu (jak pole pogody)
      if (env.light != null) LU.uLight.value = WU.uLight.value = env.light;
      if (env.fog) { LU.uFogCol.value.copy(env.fog.color); LU.uFogDen.value = env.fog.density; WU.uFogCol.value.copy(env.fog.color); }
      if (env.sunDir) WU.uSun.value.copy(env.sunDir);
      layer.position.set(camera.position.x, 1800, camera.position.z);
      // ściana oka: środek cyklonu w metrach względem sceny, przeskalowany do odległości D (kąty bez zmian)
      const u = Math.min(1, Math.max(0, (A.x - 0.65) / 0.25)), near = 1 - u * u * (3 - 2 * u);   // widać z oka; w ścianie (ulewa) i za nią — nie
      WU.uAlpha.value = 0.95 * near;
      wall.visible = near > 0.01;
      if (wall.visible) {
        const Rm = view.Rm * 1000, k = D / Math.max(Rm, 1), cx = -view.rel[0] * 1000, cz = -view.rel[1] * 1000;
        wall.position.set(camera.position.x + (cx - camera.position.x) * k, -200, camera.position.z + (cz - camera.position.z) * k);
        wall.scale.set(Rm * 0.85 * k, 12000 * k, Rm * 0.85 * k);      // ściana do ok. 12 km, rozchylona ku górze (trybuny: u góry ok. 1,9 × szersza)
      }
    },
    dispose() { scene.remove(group); layer.geometry.dispose(); layer.material.dispose(); wall.geometry.dispose(); wall.material.dispose(); },
  };
}
