// SDF Morgue — a zombie head computed in a shader (from the "SDF Morgue" artifact): distance functions, raymarching,
// lighting quantized to four tones, outlines from geometry, then palette colours — a pixel-art head from a seed.
// The model only: the shaders, the specimen from a seed (makeZombie), its palette and a renderer on a WebGL2 context.
// Pass 1 writes each pixel's light band, material and depth; pass 2 maps them to the palette and draws the outline
// wherever the material changes or the depth jumps. Materials: 0 skin, 1 eyes, 2 mouth, 3 teeth, 4 bone, 5 wound, 6 shirt.
export const VS=`#version 300 es
in vec2 a;void main(){gl_Position=vec4(a,0,1);}`;

export const FS1=`#version 300 es
precision highp float;
uniform vec2 uRes;uniform float uAng,uTilt,uJaw,uEyeL,uEyeR,uBoneR,uBoneX,uMissing,uWound,uNeck;
out vec4 o;
float sph(vec3 p,vec3 c,float r){return length(p-c)-r;}
float ell(vec3 p,vec3 c,vec3 r){vec3 q=(p-c)/r;float k0=length(q),k1=length(q/r);return k0*(k0-1.)/max(k1,1e-6);}
float box(vec3 p,vec3 c,vec3 b,float r){vec3 q=abs(p-c)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
float cap(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float smax(float a,float b,float k){return -smin(-a,-b,k);}
vec2 map(vec3 p){
  float c=cos(uTilt),s=sin(uTilt);
  p.xy=vec2(c*p.x-s*p.y,s*p.x+c*p.y);
  vec3 q=vec3(abs(p.x),p.yz);
  float d=ell(p,vec3(0,.2,-.05),vec3(.7,.75,.75));
  d=smin(d,ell(p,vec3(0,-.35,.12),vec3(.5,.45,.55)),.25);
  d=smin(d,ell(q,vec3(.38,-.05,.45),vec3(.2,.15,.2)),.12);
  d=smin(d,cap(q,vec3(.08,.38,.62),vec3(.45,.42,.5),.09),.08);
  d=smax(d,-sph(q,vec3(.5,-.3,.5),.17),.1);
  d=smin(d,cap(p,vec3(0,.25,.75),vec3(0,-.02,.86),.07),.06);
  d=smax(d,-sph(q,vec3(.05,-.04,.88),.035),.01);
  d=smin(d,ell(p,vec3(.7,.05,-.05),vec3(.1,.2,.1)),.05);
  d=smin(d,ell(p,vec3(-.7,-.02,-.05),vec3(.1,.12,.1)),.05);
  d=smin(d,cap(p,vec3(0,-.6,-.1),vec3(0,-1.3,-.15),uNeck),.15);
  float sock=smin(sph(p,vec3(-.27,.2,.62),.16),ell(p,vec3(.27,.15,.62),vec3(.17,.12,.16)),.01);
  d=smax(d,-sock,.04);
  float eyes=1e9;
  if(uEyeL>0.)eyes=min(eyes,sph(p,vec3(-.27,.19,.55),uEyeL));
  if(uEyeR>0.)eyes=min(eyes,sph(p,vec3(.29,.13,.55),uEyeR));
  d=smax(d,-ell(p,vec3(.04,-.42,.62),vec3(.28,uJaw,.25)),.04);
  float mouth=ell(p,vec3(.04,-.42,.45),vec3(.27,uJaw-.01,.1));
  float top=-.42+uJaw,bot=-.42-uJaw,teeth=1e9;
  for(int i=0;i<5;i++){
    if(float(i)==uMissing)continue;
    float x=-.18+.095*float(i),h=.05+.02*float((i*7)%3);
    teeth=min(teeth,box(p,vec3(x,top-.04-h*.5,.7),vec3(.035,h*.5,.04),.01));
  }
  for(int i=0;i<3;i++){
    float x=-.1+.13*float(i);
    teeth=min(teeth,box(p,vec3(x,bot+.03,.68),vec3(.035,.035,.04),.01));
  }
  float br=uBoneR>.01?sph(p,vec3(uBoneX,.62,.4),uBoneR)+.06*sin(14.*p.x)*sin(11.*p.z+1.3):1e9;
  float skin=uBoneR>.01?smax(d,-br,.02):d;
  float bone=uBoneR>.01?smax(d+.04,br,.02)+.012*sin(40.*p.x+30.*p.y):1e9;
  float crack=cap(p,vec3(uBoneX-.1,.85,.45),vec3(uBoneX+.1,.55,.62),.025);
  float wound=cap(p,vec3(.62*uWound,.2,.3),vec3(.45*uWound,-.3,.55),.07);
  float shirt=smin(cap(p,vec3(-.75,-1.35,-.2),vec3(.75,-1.35,-.2),.28),ell(p,vec3(0,-1.8,-.15),vec3(.9,.6,.45)),.2);
  shirt=smax(shirt,-cap(p,vec3(0,-1.05,.05),vec3(0,-1.4,.15),.18),.05);
  vec2 r=vec2(skin,0.);
  if(eyes<r.x)r=vec2(eyes,1.);
  if(mouth<r.x)r=vec2(mouth,2.);
  if(teeth<r.x)r=vec2(teeth,3.);
  if(bone<r.x)r=vec2(bone,4.);
  if(shirt<r.x)r=vec2(shirt,6.);
  if(r.y==0.&&wound<.02)r.y=5.;
  if(r.y==4.&&crack<0.)r.y=2.;
  return r;
}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes*2.-1.;
  vec3 ta=vec3(0,-.15,0),ro=vec3(3.19*sin(uAng),.25,3.19*cos(uAng));
  vec3 fw=normalize(ta-ro),rt=normalize(cross(fw,vec3(0,1,0))),up=cross(rt,fw);
  vec3 rd=normalize(fw+(uv.x*rt+uv.y*up)*.51);
  float t=0.;bool hit=false;
  for(int i=0;i<110;i++){float d=map(ro+rd*t).x;if(d<1e-3){hit=true;break;}t+=d*.9;if(t>8.)break;}
  if(!hit){o=vec4(0);return;}
  vec3 p=ro+rd*t;vec2 e=vec2(1e-3,0);
  vec3 n=normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x,map(p+e.yxy).x-map(p-e.yxy).x,map(p+e.yyx).x-map(p-e.yyx).x));
  vec3 L=normalize(vec3(.7,.6,.6));
  float dif=clamp(dot(n,L),0.,1.),sh=1.,ts=.02;
  for(int i=0;i<32;i++){float h=map(p+n*2e-3+L*ts).x;sh=min(sh,clamp(8.*h/ts,0.,1.));ts+=clamp(h,.01,.2);}
  float ao=1.;
  for(int i=1;i<6;i++){float h=.04*float(i);ao-=(h-map(p+n*h).x)*pow(.5,float(i))*4.;}
  ao=clamp(ao,0.,1.);
  float rim=pow(clamp(1.+dot(n,rd),0.,1.),3.);
  float l=.15+.85*dif*sh*(.5+.5*ao)+.25*rim;
  float band=l<.18?0.:l<.45?1.:l<.75?2.:3.;
  o=vec4(band/3.,map(p).y/8.,t/8.,1.);
}`;

export const FS2=`#version 300 es
precision highp float;
uniform sampler2D uTex;uniform vec2 uRes;uniform vec3 uPal[28];uniform vec3 uBg,uOut;uniform int uOutline;
out vec4 o;
vec4 T(ivec2 c){return texelFetch(uTex,clamp(c,ivec2(0),ivec2(uRes)-1),0);}
void main(){
  ivec2 c=ivec2(gl_FragCoord.xy);vec4 s=T(c);
  if(s.a<.5){o=vec4(uBg,1);return;}
  int m=int(round(s.g*8.)),b=int(round(s.r*3.));
  if(m==1)b=3;
  vec3 col=uPal[m*4+b];
  if(uOutline==1){
    bool edge=false;
    ivec2 N[4]=ivec2[4](ivec2(1,0),ivec2(-1,0),ivec2(0,1),ivec2(0,-1));
    for(int i=0;i<4;i++){
      vec4 n=T(c+N[i]);
      if(n.a<.5||n.b-s.b>.25/8.)edge=true;
      if(i%2==0&&n.a>.5&&int(round(n.g*8.))!=m&&m!=1)edge=true;
    }
    if(edge)col=uOut;
  }
  o=vec4(col,1);
}`;

// --- palettes ---
const rgb=(r,g,b)=>[r/255,g/255,b/255];
export const SKINS=[
  {name:'rotten green',c:[[38,34,56],[64,82,70],[104,128,86],[156,172,112]]},
  {name:'ash',c:[[36,32,52],[78,80,92],[120,124,128],[170,172,164]]},
  {name:'drowned',c:[[34,28,54],[70,74,104],[110,124,140],[160,178,172]]},
  {name:'ochre',c:[[40,30,44],[92,78,60],[140,124,80],[188,176,116]]},
];
export const EYES=[{name:'yellow',c:[250,238,150]},{name:'red',c:[240,96,72]},{name:'milky',c:[205,228,236]}];
function hsl(h,s,l){h=((h%360)+360)%360/360;const f=n=>{const k=(n+h*12)%12,a=s*Math.min(l,1-l);return l-a*Math.max(-1,Math.min(k-3,9-k,1));};return [f(0)*255,f(8)*255,f(4)*255].map(Math.round);}
export function shirtRamp(h){return [hsl(h+40,.25,.12),hsl(h+20,.25,.24),hsl(h,.22,.36),hsl(h-12,.2,.48)];}
export const SHIRTS=[{name:'dirty violet',h:265},{name:'faded blue',h:215},{name:'hospital green',h:160},{name:'rust',h:15},{name:'mustard',h:45}];
export const FIXED={2:[[30,10,22],[30,10,22],[52,16,30],[52,16,30]],
  3:[[120,104,80],[170,155,110],[214,200,150],[230,220,175]],
  4:[[80,70,78],[130,120,112],[176,164,140],[214,204,176]],
  5:[[50,12,24],[96,24,36],[140,40,44],[170,60,56]]};

// --- seeded randomness, so a specimen can be reproduced ---
export function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
export function makeZombie(sd){
  const r=mulberry(sd),pick=a=>a[Math.floor(r()*a.length)];
  const z={seed:sd,skin:pick(SKINS),eye:pick(EYES),shirt:pick(SHIRTS),
    tilt:(r()-.5)*.45,jaw:.07+r()*.11,
    eyeL:r()<.15?0:.04+r()*.04,eyeR:r()<.15?0:.035+r()*.035,
    boneR:r()<.25?0:.18+r()*.17,boneX:(r()-.5)*.7,
    missing:r()<.7?Math.floor(r()*5):-1,wound:r()<.5?1:-1,neck:.2+r()*.08};
  if(z.eyeL===0&&z.eyeR===0)z.eyeR=.05;
  return z;
}
export function paletteArray(z){
  const pal=[];
  for(let m=0;m<7;m++){
    let set=m===0?z.skin.c:m===1?[z.eye.c,z.eye.c,z.eye.c,z.eye.c]:m===6?shirtRamp(z.shirt.h):FIXED[m];
    set.forEach(c=>pal.push(...rgb(...c)));
  }
  return new Float32Array(pal);
}

// the two-pass renderer on a WebGL2 context (canvas size = the pixel resolution)
export function createRenderer(gl) {
  const sh = (type, s) => { const o = gl.createShader(type); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const prog = (fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, "a"); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
  const P1 = prog(FS1), P2 = prog(FS2), U1 = {}, U2 = {};
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  for (const n of ["uRes", "uAng", "uTilt", "uJaw", "uEyeL", "uEyeR", "uBoneR", "uBoneX", "uMissing", "uWound", "uNeck"]) U1[n] = gl.getUniformLocation(P1, n);
  for (const n of ["uTex", "uRes", "uPal", "uBg", "uOut", "uOutline"]) U2[n] = gl.getUniformLocation(P2, n);
  const fb = gl.createFramebuffer(), tex = gl.createTexture(); let res = 64;
  function resize(n) {
    res = n; gl.canvas.width = gl.canvas.height = n;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, n, n, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  // z: makeZombie(); pal: paletteArray(z); ang: camera angle [rad]; outline: draw the outline (only up to 96 px)
  function draw(z, pal, ang, outline) {
    gl.viewport(0, 0, res, res);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.useProgram(P1);
    gl.uniform2f(U1.uRes, res, res); gl.uniform1f(U1.uAng, ang);
    gl.uniform1f(U1.uTilt, z.tilt); gl.uniform1f(U1.uJaw, z.jaw); gl.uniform1f(U1.uEyeL, z.eyeL); gl.uniform1f(U1.uEyeR, z.eyeR);
    gl.uniform1f(U1.uBoneR, z.boneR); gl.uniform1f(U1.uBoneX, z.boneX); gl.uniform1f(U1.uMissing, z.missing);
    gl.uniform1f(U1.uWound, z.wound); gl.uniform1f(U1.uNeck, z.neck);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.useProgram(P2);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U2.uTex, 0);
    gl.uniform2f(U2.uRes, res, res); gl.uniform3fv(U2.uPal, pal);
    gl.uniform3f(U2.uBg, 21 / 255, 19 / 255, 31 / 255); gl.uniform3f(U2.uOut, 14 / 255, 10 / 255, 20 / 255);
    gl.uniform1i(U2.uOutline, outline && res <= 96 ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  resize(64);
  return { resize, draw, get res() { return res; } };
}
