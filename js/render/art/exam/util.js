"use strict";
/* =====================================================================
   NARZĘDZIA OGÓLNE
   ===================================================================== */
const S=2;let W=640,H=480,IW=W*S,IH=H*S,G=110,BW=1,BH=1;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const pick=(a,r)=>a[Math.floor(r()*a.length)];
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const range=(a,b,s)=>{const o=[];for(let i=a;i<=b+1e-9;i+=s)o.push(i);return o};
const lin=(x0,y0,x1,y1,st)=>x=>{const g=x.createLinearGradient(x0,y0,x1,y1);st.forEach(s=>g.addColorStop(s[0],s[1]));return g};
const rad=(cx,cy,r0,r1,st)=>x=>{const g=x.createRadialGradient(cx,cy,r0,cx,cy,r1);st.forEach(s=>g.addColorStop(s[0],s[1]));return g};
const quad=(t,a,b,c)=>[(1-t)*(1-t)*a[0]+2*(1-t)*t*b[0]+t*t*c[0],(1-t)*(1-t)*a[1]+2*(1-t)*t*b[1]+t*t*c[1]];
const fmt=n=>String(n).replace('.',',');
const h1=(i,s)=>{const v=Math.sin(i*12.9898+s*78.233)*43758.5453;return v-Math.floor(v)};
function inPoly(x,y,p){let ins=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const xi=p[i][0],yi=p[i][1],xj=p[j][0],yj=p[j][1];if(((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))ins=!ins}return ins}
function distSeg(px,py,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy||1;let t=((px-a[0])*dx+(py-a[1])*dy)/l;t=Math.max(0,Math.min(1,t));return Math.hypot(px-a[0]-t*dx,py-a[1]-t*dy)}
function distPath(px,py,pts){let m=1e9;for(let i=1;i<pts.length;i++)m=Math.min(m,distSeg(px,py,pts[i-1],pts[i]));return m}
let toastT=0;function toast(t){const e=document.getElementById('toast');e.textContent=t;e.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove('show'),2600)}
