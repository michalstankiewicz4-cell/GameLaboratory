// Post-process: the scene is rendered into a half-float target, then one full-screen shader applies bloom from
// bright areas, ACES tone mapping, gamma, a soft vignette and fine film grain.
// Settings (live): scale (render resolution 0.5–1), aa (4× MSAA), bloom, bright, sat (colour saturation 0 grey … 1 natural … 1.6).
import * as THREE from '../../../vendor/three/three.module.js';

const VERT = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;

const FRAG = `precision highp float;
uniform sampler2D tColor;
uniform vec2 texel,res;
uniform float bright,time,bloom,sat;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 col(vec2 uv){return texture2D(tColor,uv).rgb;}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
  vec2 uv=vUv;
  vec3 c=col(uv)*bright;
  if(bloom>.5){
    vec3 b=vec3(0.);
    for(int i=0;i<16;i++){
      float a=float(i)*2.39996,r=sqrt(float(i)+.5)*3.2;
      b+=max(col(uv+vec2(cos(a),sin(a))*r*texel*2.5)*bright-vec3(.9),0.);
    }
    c+=b/16.*1.4;
  }
  c=pow(aces(c*1.05),vec3(1./2.2));
  c=max(mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,sat),0.);
  c*=1.-smoothstep(.35,.95,length(vUv-.5))*.35;
  c+=(hash(uv*res+fract(time)*91.)-.5)*.025;
  gl_FragColor=vec4(c,1.);
}`;

export class PostPipeline {
  constructor(renderer) {
    this.r = renderer;
    this.params = { bright: 1.2, scale: 1, aa: true, bloom: true, sat: 1 };
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tColor: { value: null }, texel: { value: new THREE.Vector2() }, res: { value: new THREE.Vector2() },
        bright: { value: 1 }, time: { value: 0 }, bloom: { value: 1 }, sat: { value: 1 },
      },
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    quad.frustumCulled = false;
    this.postScene = new THREE.Scene(); this.postScene.add(quad);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.rt = null;
    this.resize(innerWidth, innerHeight);
  }
  setParams(p) {
    const { scale, aa } = this.params;
    Object.assign(this.params, p);
    if (this.params.scale !== scale || this.params.aa !== aa) this.resize(this.w, this.h);   // new render target
  }
  resize(w, h) {
    this.w = w; this.h = h;
    if (this.rt) this.rt.dispose();
    const k = this.params.scale;
    const rw = Math.max(2, Math.round(w * k)), rh = Math.max(2, Math.round(h * k));
    this.rt = new THREE.WebGLRenderTarget(rw, rh, { samples: this.params.aa ? 4 : 0, depthBuffer: true, type: THREE.HalfFloatType });
    const u = this.mat.uniforms;
    u.tColor.value = this.rt.texture;
    u.texel.value.set(1 / rw, 1 / rh); u.res.value.set(rw, rh);
  }
  // vp (optional): { x, y, w, h, fullW, fullH } in canvas pixels, y from the bottom (picture-in-picture).
  render(scene, camera, vp) {
    const u = this.mat.uniforms, p = this.params;
    u.bright.value = p.bright / 1.2; u.bloom.value = p.bloom ? 1 : 0; u.sat.value = p.sat ?? 1; u.time.value = performance.now() / 1000;
    this.r.setRenderTarget(this.rt);
    this.r.render(scene, camera);
    this.r.setRenderTarget(null);
    if (vp) {
      this.r.setViewport(vp.x, vp.y, vp.w, vp.h); this.r.setScissor(vp.x, vp.y, vp.w, vp.h); this.r.setScissorTest(true);
      this.r.render(this.postScene, this.postCam);
      this.r.setScissorTest(false); this.r.setViewport(0, 0, vp.fullW, vp.fullH);
    } else this.r.render(this.postScene, this.postCam);
  }
}
