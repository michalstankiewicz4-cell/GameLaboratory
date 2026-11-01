// Vision: how the hero sees — the bare eye, a night-vision device, binoculars — as one full-screen pass over the
// finished picture (after the camera look, js/render/sea/look.js, drawn into `input`).
//   night vision: the picture's brightness amplified (the gain is applied before, as the look's exposure — see the
//     gear lab), turned into the light of a phosphor screen (green or white), with the tube's noise, a soft halo
//     around bright points, faint lines and the round field of the eyepiece;
//   binoculars: two overlapping round fields with soft, dark edges and an optional reticle (a range scale); the zoom
//     is the camera's field of view (the caller narrows it).
//   const vision = new VisionPass(renderer); vision.resize(w, h); each frame: look.render(scene, camera, vision.input);
//   vision.render({ mode: 'eye' | 'night' | 'binoculars', grain, phosphor: 'green' | 'white', reticle })
import * as THREE from '../../vendor/three/three.module.js';

const VERT = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const FRAG = /* glsl */`
precision highp float;
uniform sampler2D tIn; uniform vec2 res; uniform float time, mode, grain, white, reticle;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
void main(){
  vec3 c = texture2D(tIn, vUv).rgb;
  vec2 a = vec2(res.x / res.y, 1.0), p = (vUv - 0.5) * a;
  if (mode > 0.5 && mode < 1.5) {                       // night vision
    float l = luma(c);
    // halo: bright points bleed into the tube (a few taps around, from a blurred level of the picture)
    float h = 0.0;
    for (int i = 0; i < 8; i++) { float an = float(i) * 0.785398; h += luma(texture2D(tIn, vUv + vec2(cos(an), sin(an)) * 0.012 / a).rgb); }
    l += max(0.0, h / 8.0 - 0.6) * 0.8;
    float n = hash(floor(vUv * res * 0.5) + floor(time * 30.0)) - 0.5;      // the tube's noise, fresh every frame
    l = max(0.0, l + n * grain * (0.35 + 0.65 * (1.0 - l)));
    l *= 0.94 + 0.06 * sin(vUv.y * res.y * 1.6);                              // faint lines
    vec3 ph = mix(vec3(0.32, 1.0, 0.42), vec3(0.86, 0.94, 1.0), white);      // green phosphor, or white (newer tubes)
    c = ph * l * 1.1;
    float r = length(p) / 0.48;                                               // the round field of the eyepiece
    c *= smoothstep(1.0, 0.86, r) * (1.0 - 0.35 * r * r);
  } else if (mode > 1.5) {                              // binoculars
    vec2 q = p; float d1 = length(q - vec2(-0.2, 0.0)), d2 = length(q - vec2(0.2, 0.0));
    float r = min(d1, d2) / 0.44;
    float m = smoothstep(1.0, 0.9, r);
    c *= m * (1.0 - 0.3 * r * r);
    c = mix(c, c * vec3(0.98, 1.0, 1.03), 0.5);                               // a slightly cool coated lens
    if (reticle > 0.5) {
      float px = 1.0 / res.y;
      float line = 0.0;
      line += step(abs(q.y), px * 0.9) * step(abs(q.x), 0.3) * step(0.025, abs(q.x));          // horizontal scale
      for (int i = -5; i <= 5; i++) { if (i == 0) continue; float x = float(i) * 0.05; line += step(abs(q.x - x), px) * step(abs(q.y), (i == -5 || i == 5 || i == 0) ? 0.03 : 0.015); }
      line += step(abs(q.x), px * 0.9) * step(q.y, -0.025) * step(-0.2, q.y);                  // the vertical post below
      c = mix(c, vec3(0.02), clamp(line, 0.0, 1.0) * 0.85 * m);
    }
  }
  gl_FragColor = vec4(c, 1.0);
}`;

export const VISION_MODES = { eye: 0, night: 1, binoculars: 2 };

export class VisionPass {
  constructor(renderer) {
    this.r = renderer;
    this.mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
      uniforms: { tIn: { value: null }, res: { value: new THREE.Vector2(1, 1) }, time: { value: 0 }, mode: { value: 0 }, grain: { value: 0.35 }, white: { value: 0 }, reticle: { value: 1 } } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat); this.quad.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.quad); this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.input = null;
  }
  resize(w, h) {
    const pr = this.r.getPixelRatio(), W = Math.max(2, Math.round(w * pr)), H = Math.max(2, Math.round(h * pr));
    if (this.input) this.input.dispose();
    this.input = new THREE.WebGLRenderTarget(W, H, { depthBuffer: false });   // the look's output: already display colour
    this.mat.uniforms.tIn.value = this.input.texture; this.mat.uniforms.res.value.set(W, H);
  }
  render({ mode = 'eye', grain = 0.35, phosphor = 'green', reticle = true } = {}) {
    const u = this.mat.uniforms;
    u.time.value = performance.now() / 1000; u.mode.value = VISION_MODES[mode] ?? 0; u.grain.value = grain; u.white.value = phosphor === 'white' ? 1 : 0; u.reticle.value = reticle ? 1 : 0;
    this.r.setRenderTarget(null); this.r.render(this.scene, this.cam);
  }
}
