// Full-resolution post-process for the non-pixel styles (same interface as PixelPipeline).
// The scene is rendered (MSAA) into a target with a depth texture; one full-screen shader then applies:
//   real  — bloom from bright areas, ACES tone mapping, vignette, fine film grain
//   toon  — ink outlines from depth and colour edges, light posterisation
//   paint — Kuwahara (oil/watercolour) filter, darkened pigment edges, paper grain, hand-drawn wobble
import * as THREE from '../../vendor/three.module.js';
import { STYLE_ID } from './look.js';

const VERT = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;

const FRAG = `precision highp float;
uniform sampler2D tColor,tDepth;
uniform vec2 texel,res;
uniform float bright,edge,time;
uniform int mode;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vnoise(p);p*=2.03;a*=.5;}return s;}
vec3 col(vec2 uv){return texture2D(tColor,uv).rgb;}
float dep(vec2 uv){return texture2D(tDepth,uv).r;}
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec3 toSrgb(vec3 c){return pow(clamp(c,0.,1.),vec3(1./2.2));}
// Edge strength from depth (ortho depth is linear) and from colour differences.
float edges(vec2 uv,float w){
  vec2 o=texel*w;
  float d=dep(uv);
  float dd=abs(dep(uv+vec2(o.x,0.))-d)+abs(dep(uv-vec2(o.x,0.))-d)+abs(dep(uv+vec2(0.,o.y))-d)+abs(dep(uv-vec2(0.,o.y))-d);
  float l=lum(col(uv));
  float cl=abs(lum(col(uv+vec2(o.x,0.)))-l)+abs(lum(col(uv-vec2(o.x,0.)))-l)+abs(lum(col(uv+vec2(0.,o.y)))-l)+abs(lum(col(uv-vec2(0.,o.y)))-l);
  return max(smoothstep(.002,.006,dd),smoothstep(.22,.45,cl));
}
// Kuwahara filter, radius 4: picks the mean of the least-varying quadrant (keeps edges, flattens strokes).
vec3 kuwahara(vec2 uv){
  vec3 m[4];vec3 s[4];
  for(int k=0;k<4;k++){m[k]=vec3(0.);s[k]=vec3(0.);}
  for(int j=-4;j<=0;j++)for(int i=-4;i<=0;i++){
    vec3 a=col(uv+vec2(float(i),float(j))*texel*2.1);m[0]+=a;s[0]+=a*a;
    vec3 b=col(uv+vec2(float(-i),float(j))*texel*2.1);m[1]+=b;s[1]+=b*b;
    vec3 c=col(uv+vec2(float(i),float(-j))*texel*2.1);m[2]+=c;s[2]+=c*c;
    vec3 d=col(uv+vec2(float(-i),float(-j))*texel*2.1);m[3]+=d;s[3]+=d*d;
  }
  float best=1e9;vec3 outc=vec3(0.);
  for(int k=0;k<4;k++){vec3 mu=m[k]/25.;vec3 v=abs(s[k]/25.-mu*mu);float t=v.r+v.g+v.b;if(t<best){best=t;outc=mu;}}
  return outc;
}
void main(){
  vec2 uv=vUv;
  vec3 c;
  float vig=smoothstep(.35,.95,length(vUv-.5));
  if(mode==1){
    c=col(uv)*bright;
    vec3 b=vec3(0.);
    for(int i=0;i<16;i++){
      float a=float(i)*2.39996,r=sqrt(float(i)+.5)*3.2;
      vec3 s=col(uv+vec2(cos(a),sin(a))*r*texel*2.5);
      b+=max(s*bright-vec3(.9),0.);
    }
    c+=b/16.*1.4;
    c=aces(c*1.05);
    c=toSrgb(c);
    c*=1.-vig*.35;
    c+=(hash(uv*res+fract(time)*91.)-.5)*.025;
  } else if(mode==2){
    c=toSrgb(col(uv)*bright);
    c=floor(c*9.+.5)/9.;
    float e=edges(uv,1.4);
    c=mix(c,vec3(.06,.08,.14),e*edge);
    c*=1.-vig*.18;
  } else {
    vec2 w=vec2(fbm(uv*res/70.),fbm(uv*res/70.+17.))-.5;     // hand-drawn wobble
    vec2 u2=uv+w*texel*5.;
    c=kuwahara(u2)*bright;
    c=toSrgb(c);
    c=mix(c,vec3(dot(c,vec3(.33))),.18);                     // softer, slightly desaturated pigments
    c=mix(c,vec3(.95,.92,.84),.10);                           // lifted toward paper white
    float dark=1.-lum(c);
    float gran=fbm(uv*res/2.2);                               // pigment granulation, stronger in dark washes
    c*=1.-(gran-.5)*.22*dark;
    float e=edges(u2,1.8);
    c=mix(c,vec3(.22,.17,.14),e*edge*.7);                     // sepia ink line
    float bleed=smoothstep(.15,.0,abs(fract(fbm(uv*res/40.)*3.)-.5));
    c*=1.-bleed*.025;                                          // faint wash rings
    float paper=fbm(uv*res/3.)*.55+fbm(uv*res/30.)*.45;
    c*=.88+paper*.2;
    c=mix(c,vec3(.94,.91,.83),smoothstep(.45,1.05,length(vUv-.5)+fbm(uv*6.)*.18));   // ragged paper border
  }
  gl_FragColor=vec4(c,1.);
}`;

export class StylePipeline {
  constructor(renderer, style) {
    this.r = renderer;
    this.style = style;
    this.params = { pixelH: 0, levels: 0, dither: 0, edge: 1, bright: 1 };
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tColor: { value: null }, tDepth: { value: null }, texel: { value: new THREE.Vector2() }, res: { value: new THREE.Vector2() },
        bright: { value: 1 }, edge: { value: 1 }, time: { value: 0 }, mode: { value: STYLE_ID[style] },
      },
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    quad.frustumCulled = false;
    this.postScene = new THREE.Scene(); this.postScene.add(quad);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.rt = null;
    this.resize(innerWidth, innerHeight);
  }
  // Only brightness and outline strength apply here; pixel-art parameters are ignored.
  setParams(p) { Object.assign(this.params, p); }
  resize(w, h) {
    if (this.rt) { this.rt.dispose(); this.rt.depthTexture.dispose(); }
    const depth = new THREE.DepthTexture(w, h);
    this.rt = new THREE.WebGLRenderTarget(w, h, { samples: this.style === 'paint' ? 0 : 4, depthBuffer: true, depthTexture: depth, type: THREE.HalfFloatType });
    const u = this.mat.uniforms;
    u.tColor.value = this.rt.texture; u.tDepth.value = depth;
    u.texel.value.set(1 / w, 1 / h); u.res.value.set(w, h);
  }
  render(scene, camera) {
    const u = this.mat.uniforms, p = this.params;
    u.bright.value = p.bright / 1.2; u.edge.value = p.edge; u.time.value = performance.now() / 1000;
    this.r.setRenderTarget(this.rt);
    this.r.render(scene, camera);
    this.r.setRenderTarget(null);
    this.r.render(this.postScene, this.postCam);
  }
}
