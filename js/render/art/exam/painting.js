"use strict";
/* Funkcje wspólne dla obrazów (sygnatura, regiony, pigmenty) */
function sigLayout(c){const t=mk(4,4).getContext('2d');t.font=ART.sig.font;const w=t.measureText(ART.sig.text).width*1.05+8;c.sig={x:ART.sig.corner==='br'?W-w-22:24,y:H-20,w}}
function inSig(x,y){const s=C.sig;return x>s.x-6&&x<s.x+s.w+6&&y>s.y-16&&y<s.y+8}
function drawSig(x,X,Y,shaky,seed,color,text){const s=ART.sig,r=rng(seed);x.save();x.translate(X,Y);x.transform(1,0,shaky?s.slant+0.34:s.slant,1,0,0);x.font=s.font;x.fillStyle=color;x.strokeStyle=color;
 let cx=0;for(const ch of(text||s.text)){x.save();x.translate(cx,shaky?(r()-.5)*1.5:0);if(shaky)x.rotate((r()-.5)*0.13);x.fillText(ch,0,0);if(shaky){x.globalAlpha=0.5;x.fillText(ch,0.55,0.35)}x.restore();cx+=x.measureText(ch).width*(shaky?1.08:0.96)}
 x.lineWidth=1;x.beginPath();x.moveTo(-2,4);if(shaky){for(let i=0;i<=14;i++)x.lineTo(-2+i*cx*0.62/14,4+(r()-.5)*1.4)}else x.bezierCurveTo(cx*0.2,8,cx*0.45,1,cx*0.62,5);x.stroke();x.restore()}
const sigLater=p=>!!(p.t.sig&&p.m.sig==='later');
const sigShaky=p=>!!(p.t.sig&&p.m.sig==='graph');
const crackMode=p=>p.t.crack?p.m.crack:'natural';
const microMode=p=>p.t.micro?p.m.micro:'brush';
const pxPerCm=()=>W/ART.wcm;

function regionAtP(p,x,y){if(p.frag)for(const l of p.frag.losses)if(inPoly(x,y,l.pts))return'ubytek';
 if(inSig(x,y))return'sygnatura';const L=p.shapes;for(let i=L.length-1;i>=0;i--){const s=L[i];if(s.noHit||s.t==='deco'||s.t==='line')continue;if(hitShape(s,x,y))return s.reg}return SC.bg}
function pigKeys(p,reg){if(reg==='sygnatura')return[ART.sig.pig];if(reg==='ubytek')return[p.ground];
 const R=SC.REG[reg];if(!R)return['umb'];const k=R.pig.slice();
 if(MODE==='paint5'&&p.profile==='giclee'&&p.t.pigment)return[R.an||'hansa','hansa'];
 if(p.t.pigment&&p.m.pigReg===reg)k[0]=p.m.pigKind==='alt'?(ALT[k[0]]||'zn'):R.an;return k}
function dens(p,reg){p._d=p._d||{};if(p._d[reg]==null){const k=pigKeys(p,reg);p._d[reg]=reg==='ubytek'?(XW[p.ground]||.3)*0.6:Math.max(...k.map(q=>XW[q]||.22))}return p._d[reg]}
