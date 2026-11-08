"use strict";
/* ---------- fragment ---------- */
function newFrag(r){setupScene(r);const genuine=r()<0.5,t={};
 if(!genuine)shuffle(['pigment','back','uv','crack','texture','sig','style','ir','xray','micro'],r).slice(0,3+Math.floor(r()*2)).forEach(k=>t[k]=true);
 const anRegs=shuffle(Object.keys(SC.REG).filter(k=>SC.REG[k].an),r).slice(0,3);
 const p={letter:'F',orig:genuine,t,seed:(r()*1e9)|0,descRegs:anRegs};basePainting(p,r);const q=rng(p.seed+7);
 p.m.pigKind=pick(['alt','an'],q);p.m.uvKind=pick(['fresh','none'],q);p.m.backKind=pick(['thread','ground','both'],q);
 const D=13+Math.floor(r()*5),Dg=pick(['chalk','greyOil','redBole'],r);C.thread=D;C.ground=Dg;
 p.thread=t.back&&p.m.backKind!=='ground'?D+pick([-5,-4,4,6],q):D;
 p.ground=t.back&&p.m.backKind!=='thread'?pick(['chalk','greyOil','redBole','gessoA'].filter(g=>g!==Dg),q):Dg;p.linen=true;
 const side=ART.sig.corner==='br'?'r':'l',left=side==='r',A=[left?W*0.44:W*0.56,0],B=[left?0:W,H*0.52],torn=[A];
 for(let i=1;i<16;i++){const k=i/16,nx=B[1]-A[1],ny=-(B[0]-A[0]),l=Math.hypot(nx,ny),j=(q()-.5)*30;torn.push([Math.max(0,Math.min(W,A[0]+(B[0]-A[0])*k+nx/l*j)),Math.max(0,Math.min(H,A[1]+(B[1]-A[1])*k+ny/l*j))])}
 torn.push(B);const missing=[...torn,left?[0,0]:[W,0]];
 const losses=[];let tries=0;while(losses.length<9&&tries++<200){const cx=20+q()*(W-40),cy=20+q()*(H-40),rr=4+q()*9;
  if(inPoly(cx,cy,missing)||distPath(cx,cy,torn)<rr+8||(cx>C.sig.x-15&&cx<C.sig.x+C.sig.w+15&&cy>C.sig.y-30))continue;
  const pts=[];for(let k=0;k<11;k++){const a=k/11*6.283;pts.push([cx+Math.cos(a)*rr*(0.6+q()*0.6),cy+Math.sin(a)*rr*(0.6+q()*0.6)])}losses.push({cx,cy,r:rr,pts})}
 p.frag={side,torn,missing,losses};p.shapes=SC.build(C,p.t.style?p.m.style:null);
 p.x=G;p.y=G;P=[p];BW=W+2*G;BH=H+2*G}
