/* Distance functions in GLSL shared by the SDF models (js/models/human/zombie/sdf-head.js — SDF Morgue,
   js/models/human/zombie/walkers/shaders.js — SDF Walkers): sphere, ellipsoid, rounded box, capsule, smooth
   min / max. A classic script (window.SDF_GLSL), loaded by the page before them. */
window.SDF_GLSL = `float sph(vec3 p,vec3 c,float r){return length(p-c)-r;}
float ell(vec3 p,vec3 c,vec3 r){vec3 q=(p-c)/r;float k0=length(q),k1=length(q/r);return k0*(k0-1.)/max(k1,1e-6);}
float box(vec3 p,vec3 c,vec3 b,float r){vec3 q=abs(p-c)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
float cap(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float smax(float a,float b,float k){return -smin(-a,-b,k);}
`;
