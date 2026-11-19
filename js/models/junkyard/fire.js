// Ogień i dym na GPU (z gry Złomowisko, js/machines/fire.js — z historią; wygląd pieca na papier): cząstki jako punkty
// z addytywnym mieszaniem, ruch liczony w shaderze z czasu narodzin (bez aktualizacji tablic co klatkę — tylko emisja
// nowych). Siła ognia (0…1) zmienia rozmiar i liczbę cząstek. dispose() — zdejmuje ze sceny.
import * as THREE from '../../../vendor/three/three.module.js';

export class Fire {
  constructor(scene, pos, { count = 260, spread = [0.7, 0.5], smoke = false } = {}) {
    this.n = count; this.i = 0; this.time = 0; this.power = 0.3; this.pos = pos.clone(); this.spread = spread; this.acc = 0;
    const g = new THREE.BufferGeometry();
    this.born = new Float32Array(count).fill(-99); this.seed = new Float32Array(count * 3); this.org = new Float32Array(count * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.org, 3));
    g.setAttribute('aBorn', new THREE.BufferAttribute(this.born, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(this.seed, 3));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: smoke ? THREE.NormalBlending : THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uLife: { value: smoke ? 4.0 : 1.1 }, uSize: { value: smoke ? 180 : 120 }, uSmoke: { value: smoke ? 1 : 0 } },
      vertexShader: `attribute float aBorn; attribute vec3 aSeed; uniform float uTime, uLife, uSize, uSmoke; varying float vT;
        void main(){ float t = (uTime - aBorn) / uLife; vT = t;
          vec3 p = position + vec3(sin(aSeed.x * 6.0 + uTime * 3.0) * 0.08 * t, t * uLife * mix(1.1, 0.7, uSmoke) * (0.7 + aSeed.y * 0.6), cos(aSeed.z * 6.0 + uTime * 2.0) * 0.08 * t);
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          float s = uSmoke > 0.5 ? (0.4 + t * 1.6) : (1.0 - t) * (0.6 + aSeed.x * 0.6);
          gl_PointSize = (t < 0.0 || t > 1.0) ? 0.0 : uSize * s / -mv.z; }`,
      fragmentShader: `varying float vT; uniform float uSmoke; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        vec3 col = uSmoke > 0.5 ? vec3(0.22, 0.21, 0.2) : mix(vec3(1.0, 0.85, 0.4), vec3(0.9, 0.2, 0.02), vT);
        gl_FragColor = vec4(col, a * (uSmoke > 0.5 ? 0.35 * (1.0 - vT) : (1.0 - vT) * 0.9)); }`,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; scene.add(this.points); this.scene = scene;
    this.light = smoke ? null : new THREE.PointLight('#ff8a3a', 0, 9, 1.6);
    if (this.light) { this.light.position.copy(pos).add(new THREE.Vector3(0, 0.4, 0)); scene.add(this.light); }
  }
  update(dt) {
    this.time += dt; this.mat.uniforms.uTime.value = this.time;
    this.acc += dt * this.n * (0.15 + this.power) / this.mat.uniforms.uLife.value;
    const g = this.points.geometry;
    while (this.acc >= 1) {
      this.acc -= 1; const k = this.i++ % this.n;
      this.born[k] = this.time;
      this.org[k * 3] = this.pos.x + (Math.random() - 0.5) * this.spread[0]; this.org[k * 3 + 1] = this.pos.y; this.org[k * 3 + 2] = this.pos.z + (Math.random() - 0.5) * this.spread[1];
      this.seed[k * 3] = Math.random(); this.seed[k * 3 + 1] = Math.random(); this.seed[k * 3 + 2] = Math.random();
      g.attributes.aBorn.needsUpdate = g.attributes.position.needsUpdate = g.attributes.aSeed.needsUpdate = true;
    }
    if (this.light) this.light.intensity = (2 + this.power * 10) * (0.85 + Math.random() * 0.3);
  }
  dispose() {
    this.scene.remove(this.points); this.points.geometry.dispose(); this.mat.dispose();
    if (this.light) this.scene.remove(this.light);
  }
}
