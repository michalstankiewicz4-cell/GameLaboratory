// Fala skanu: rozszerzająca się powłoka czujnika — jasny brzeg (Fresnel) z liniami równoleżników, gasnąca w miarę
// wzrostu. Z ShipKit (js/models/ships-space/shipkit.js, makeScanWave): statek nie rysuje jej już sam — akcja „scan”
// zgłasza skan (model.onScan), a falę rysuje laboratorium efektów (EffectKit). Shader i krzywa wzrostu bez zmian;
// czas w sekundach (`seconds`, w ShipKit 1.7 s), krok — klatka 1/60 s.
import * as THREE from '../../../vendor/three/three.module.js';

const VERT = `
  varying vec3 vN; varying vec3 vView; varying vec3 vP;
  void main(){
    vP = position; vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0); vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const FRAG = `
  uniform float uT; uniform vec3 uColor; varying vec3 vN; varying vec3 vView; varying vec3 vP;
  void main(){
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 2.5);
    float lines = 0.55 + 0.45 * sin(vP.y * 60.0);
    float a = (fres * 0.9 + 0.06) * lines * pow(1.0 - uT, 1.5);
    gl_FragColor = vec4(uColor * a * 1.8, 1.0);
  }`;

export class ScanWaves {
  constructor(scene, cfg) {
    this.scene = scene; this.cfg = cfg; this.list = [];
    this.geo = new THREE.SphereGeometry(1, 48, 24);
  }
  /** A wave from `at` growing to `radius` (default cfg.radius), in `color` (default cfg.color). */
  start(at, radius = this.cfg.radius, color = this.cfg.color) {
    const uniforms = { uT: { value: 0 }, uColor: { value: new THREE.Color(color) } };
    const mesh = new THREE.Mesh(this.geo, new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    mesh.position.copy(at); mesh.scale.setScalar(0.3); mesh.frustumCulled = false;
    this.scene.add(mesh);
    this.list.push({ mesh, uniforms, t: 0, maxR: radius });
  }
  /** One frame (1/60 s). */
  update() {
    for (const w of this.list) {
      w.t += 1 / 60 / this.cfg.seconds;
      if (w.t >= 1) { w.done = true; this.scene.remove(w.mesh); w.mesh.material.dispose(); continue; }
      w.mesh.scale.setScalar(0.3 + w.maxR * (1 - Math.pow(1 - w.t, 3)));
      w.uniforms.uT.value = w.t;
    }
    this.list = this.list.filter((w) => !w.done);
  }
  clear() { for (const w of this.list) { this.scene.remove(w.mesh); w.mesh.material.dispose(); } this.list = []; }
}
