"use strict";
/* =====================================================================
   WIDOKI OBRAZU
   ===================================================================== */
function makeCracks(p){const mode=crackMode(p),out=mk(IW,IH);if(mode==='none')return out;
 const r=rng(p.seed+11),art=mode==='artificial',g=art?40:34,jit=art?0.3:0.95;
 const gx=Math.ceil(IW/g)+3,gy=Math.ceil(IH/g)+3,pt=new Float32Array(gx*gy*2);
 for(let j=0;j<gy;j++)for(let i=0;i<gx;i++){const k=(j*gx+i)*2;pt[k]=(i-1+0.5+(r()-.5)*jit+(art&&j%2?0.5:0))*g;pt[k+1]=(j-1+0.5+(r()-.5)*jit)*g}
 const x=out.getContext('2d'),id=x.createImageData(IW,IH),d=id.data,ph=r()*10;
 for(let y=0;y<IH;y++)for(let X=0;X<IW;X++){let xx=X,yy=y,n=1;
  if(!art){xx+=4*Math.sin(y*0.045+ph)+2*Math.sin(y*0.13);yy+=4*Math.sin(X*0.04+ph*1.3)+2*Math.sin(X*0.11);n=0.5+0.5*Math.sin(X*0.006+ph)*Math.cos(y*0.008-ph);if(n<0.14)continue}
  const ci=Math.floor(xx/g)+1,cj=Math.floor(yy/g)+1;let d1=1e12,d2=1e12;
  for(let b=cj-1;b<=cj+1;b++){if(b<0||b>=gy)continue;for(let a=ci-1;a<=ci+1;a++){if(a<0||a>=gx)continue;const k=(b*gx+a)*2,dx=pt[k]-xx,dy=pt[k+1]-yy,dd=dx*dx+dy*dy;if(dd<d1){d2=d1;d1=dd}else if(dd<d2)d2=dd}}
  const e=Math.sqrt(d2)-Math.sqrt(d1),thr=art?1.5:0.5+1.3*n,al=art?215:110+120*n;
  if(e<thr){const i4=(y*IW+X)*4;d[i4]=28;d[i4+1]=20;d[i4+2]=12;d[i4+3]=al*(1-e/thr*0.5)}}
 x.putImageData(id,0,0);if(p.frag){x.globalCompositeOperation='destination-out';x.scale(S,S);for(const l of p.frag.losses){x.beginPath();l.pts.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]));x.fill()}}return out}
const lumOf=(d,i)=>d[i]*0.3+d[i+1]*0.59+d[i+2]*0.11;
function pixMap(src,fn){const out=mk(IW,IH),x=out.getContext('2d'),s=src.getContext('2d').getImageData(0,0,IW,IH).data,id=x.createImageData(IW,IH),d=id.data;
 for(let i=0;i<d.length;i+=4){const v=fn(lumOf(s,i));d[i]=v[0];d[i+1]=v[1];d[i+2]=v[2];d[i+3]=255}x.putImageData(id,0,0);return out}
function retouchArea(side){return side==='r'?[W*0.6,H*0.05,W*0.33,H*0.24]:[W*0.07,H*0.05,W*0.33,H*0.24]}
function blobs(x,r,n,ax,ay,aw,ah,col){for(let k=0;k<n;k++){const cx=ax+r()*aw,cy=ay+r()*ah;x.fillStyle=col;for(let i=0;i<6;i++){x.beginPath();x.arc(cx+(r()-.5)*14,cy+(r()-.5)*10,3+r()*6,0,7);x.fill()}}}
function uvFresh(p){return MODE==='frag'?!!(p.t.uv&&p.m.uvKind==='fresh'):!!p.t.uv}
function makeUV(p){const fresh=uvFresh(p),out=pixMap(getView(p,'normal'),l=>fresh?[l*.18+22,l*.08+10,l*.32+48]:[l*.16+38,l*.34+52,l*.24+50]);
 const x=out.getContext('2d');x.scale(S,S);const r=rng(p.seed+41);
 if(MODE==='frag'){if(!p.t.uv){const a=retouchArea(p.frag.side);blobs(x,r,4,a[0],a[1],a[2],a[3],'rgba(18,6,30,.88)')}}
 else if(p.retouch)blobs(x,r,4,40,40,W-80,H-80,'rgba(18,6,30,.85)');
 if(sigLater(p)&&!fresh)drawSig(x,C.sig.x,C.sig.y,sigShaky(p),p.seed+5,'rgba(8,0,16,.95)');return out}
function strokeFor(dir,r){switch(dir){case'h':return[(r()-.5)*0.25,18+r()*20,2+r()*2,.13];case'swirl':return[r()*6.28,6+r()*8,3+r()*3,.4];case'dab':return[r()*6.28,3+r()*4,2.5+r()*2,.35];
 case'v':return[Math.PI/2+(r()-.5)*0.3,5+r()*6,1.8,.3];case'hv':return[r()<.5?0:Math.PI/2,6+r()*6,2,.25];default:return[0.25+(r()-.5)*0.6,10+r()*14,2+r()*2,.15]}}
function makeRaking(p){const mode=p.t.texture?p.m.texture:'real',r=rng(p.seed+21);
 const hm=mk(IW,IH),h=hm.getContext('2d');h.fillStyle='#808080';h.fillRect(0,0,IW,IH);h.scale(S,S);h.lineCap='round';
 if(mode==='flat'){h.fillStyle='#9a9a9a';for(let y=0,j=0;y<H;y+=2.2,j++)for(let X=(j%2)*1.1;X<W;X+=2.2)h.fillRect(X,y,0.8,0.8)}
 else{const N=15000*W*H/(640*480);for(let i=0;i<N;i++){const X=r()*W,y=r()*H;let a;
  if(mode==='mismatch')a=[-0.75+(r()-.5)*0.2,10+r()*8,2+r()*1.5,.25];else{const reg=regionAtP(p,X,y);if(reg==='sygnatura'||reg==='ubytek')continue;a=strokeFor((SC.REG[reg]||{}).dir,r)}
  h.strokeStyle=`rgba(255,255,255,${a[3]})`;h.lineWidth=a[2];h.beginPath();h.moveTo(X,y);h.lineTo(X+Math.cos(a[0])*a[1],y+Math.sin(a[0])*a[1]);h.stroke()}}
 if(p.frag){h.fillStyle='rgba(0,0,0,.6)';for(const l of p.frag.losses){h.beginPath();l.pts.forEach((q,i)=>i?h.lineTo(q[0],q[1]):h.moveTo(q[0],q[1]));h.fill()}}
 const hb=mk(IW,IH),hbx=hb.getContext('2d');hbx.filter='blur(1.4px)';hbx.drawImage(hm,0,0);
 const hd=hbx.getImageData(0,0,IW,IH).data,src=getView(p,'normal').getContext('2d').getImageData(0,0,IW,IH).data;
 const out=mk(IW,IH),x=out.getContext('2d'),id=x.createImageData(IW,IH),d=id.data;
 for(let y=1;y<IH-1;y++)for(let X=1;X<IW-1;X++){const i=y*IW+X,i4=i*4,gx=hd[(i-1)*4]-hd[(i+1)*4],gy=hd[(i-IW)*4]-hd[(i+IW)*4],v=lumOf(src,i4)*0.35+92+(gx*1.6+gy*0.8)*1.5;
  d[i4]=v*1.03;d[i4+1]=v*0.97;d[i4+2]=v*0.86;d[i4+3]=255}
 x.putImageData(id,0,0);return out}
function sketch(x,pts,closed,passes,jit,r){for(let k=0;k<passes;k++){x.beginPath();pts.forEach((q,i)=>{const X=q[0]+(r()-.5)*jit,Y=q[1]+(r()-.5)*jit;i?x.lineTo(X,Y):x.moveTo(X,Y)});if(closed)x.closePath();x.stroke()}}
const irMode=p=>p.t.ir?p.m.ir:'real';
function makeIR(p){const out=pixMap(getView(p,'normal'),l=>{const v=150+(l-128)*0.3;return[v,v,v]}),x=out.getContext('2d');x.scale(S,S);
 const mode=irMode(p);if(mode==='none')return out;const r=rng(p.seed+51),real=mode==='real',J=real?2.2:0,N=real?2:1;
 x.strokeStyle=real?'rgba(25,25,25,.55)':'rgba(25,25,25,.7)';x.lineWidth=real?1.1:0.9;
 if(!real){x.save();x.strokeStyle='rgba(25,25,25,.45)';x.lineWidth=0.7;for(let i=40;i<W;i+=40){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke()}for(let i=40;i<H;i+=40){x.beginPath();x.moveTo(0,i);x.lineTo(W,i);x.stroke()}x.restore()}
 for(const s of p.shapes){if(!s.outline)continue;let pts=real&&s.irPts?s.irPts:contour(s);if(real&&s.penti)pts=pts.map(q=>[q[0]+s.penti.dx,q[1]+s.penti.dy]);sketch(x,pts,s.t!=='line',N,J,r)}
 return out}
function edgeNails(x,staple,r,col){x.fillStyle=col;
 for(let i=20;i<W-10;i+=30)for(const y of[3,H-7])staple?x.fillRect(i,y,10,2.5):(x.save(),x.translate(i+2,y+2),x.rotate(r()),x.fillRect(-2.5,-2.5,5,5),x.restore());
 for(let i=20;i<H-10;i+=30)for(const X of[3,W-7])staple?x.fillRect(X,i,2.5,10):(x.save(),x.translate(X+2,i+2),x.rotate(r()),x.fillRect(-2.5,-2.5,5,5),x.restore())}
function makeXray(p){const out=mk(IW,IH),x=out.getContext('2d'),id=x.createImageData(IW,IH),d=id.data,r=rng(p.seed+31);
 for(let y=0;y<IH;y+=2)for(let X=0;X<IW;X+=2){const v=28+dens(p,regionAtP(p,X/S,y/S))*190+(r()-.5)*16;
  for(let b=0;b<2;b++)for(let a=0;a<2;a++){const i4=((y+b)*IW+X+a)*4;d[i4]=d[i4+1]=d[i4+2]=v;d[i4+3]=255}}
 x.putImageData(id,0,0);x.scale(S,S);
 if(MODE==='paint5'){x.fillStyle='rgba(255,255,255,.1)';x.fillRect(0,0,W,34);x.fillRect(0,H-34,W,34);x.fillRect(0,0,34,H);x.fillRect(W-34,0,34,H);x.fillRect(W/2-17,0,34,H);
  if(p.t.xray){x.save();x.translate(W/2,H/2);x.rotate(Math.PI/2);x.strokeStyle='rgba(255,255,255,.28)';x.lineWidth=9;x.beginPath();x.ellipse(0,0,Math.min(W,H)*0.36,Math.min(W,H)*0.29,0,0,7);x.stroke();
   x.fillStyle='rgba(255,255,255,.24)';x.beginPath();x.ellipse(0,-35,45,58,0,0,7);x.fill();x.beginPath();x.ellipse(0,85,110,50,0,Math.PI,0);x.fill();x.restore()}
  edgeNails(x,p.t.back,r,'#fff')}
 if(MODE==='frag'&&!p.t.xray)SC.hidden.draw(x,C,p.frag.side);
 return out}
function makeBack(p){const out=mk(IW,IH),x=out.getContext('2d'),r=rng(p.seed+61),fresh=p.t.back;x.scale(S,S);
 x.fillStyle=fresh?'#d9cfb8':'#b49d74';x.fillRect(0,0,W,H);
 for(let y=0;y<H;y+=1.6){x.fillStyle=`rgba(${r()<.5?60:230},${r()<.5?45:210},30,${fresh?.03:.05+r()*.06})`;x.fillRect(0,y,W,0.8)}
 if(!fresh)for(let i=0;i<7;i++){x.fillStyle=`rgba(95,65,30,${.12+r()*.12})`;x.beginPath();x.arc(r()*W,r()*H,20+r()*60,0,7);x.fill()}
 const wood=fresh?['#dcbd8c','#c9a873']:['#5b3d22','#4a311b'];
 const bar=(X,Y,w,h,vert)=>{x.fillStyle=wood[0];x.fillRect(X,Y,w,h);x.strokeStyle=wood[1];x.lineWidth=0.8;for(let k=0;k<9;k++){x.beginPath();if(vert){const q=X+r()*w;x.moveTo(q,Y);x.bezierCurveTo(q+3,Y+h*.3,q-3,Y+h*.6,q+2,Y+h)}else{const q=Y+r()*h;x.moveTo(X,q);x.bezierCurveTo(X+w*.3,q+3,X+w*.6,q-3,X+w,q+2)}x.stroke()}};
 bar(0,0,W,34,false);bar(0,H-34,W,34,false);bar(0,0,34,H,true);bar(W-34,0,34,H,true);bar(W/2-17,34,34,H-68,true);
 x.fillStyle=fresh?'#b08a55':'#2e1e10';for(const[a,b,s1,s2]of[[34,34,1,1],[W-34,34,-1,1],[34,H-34,1,-1],[W-34,H-34,-1,-1],[W/2-17,34,-1,1],[W/2+17,34,1,1],[W/2-17,H-34,-1,-1],[W/2+17,H-34,1,-1]]){x.beginPath();x.moveTo(a,b);x.lineTo(a+18*s1,b);x.lineTo(a,b+18*s2);x.fill()}
 x.fillStyle=fresh?'#cfc3a8':'#a8916a';x.fillRect(0,0,W,9);x.fillRect(0,H-9,W,9);x.fillRect(0,0,9,H);x.fillRect(W-9,0,9,H);
 if(fresh)edgeNails(x,true,r,'#c9ccd0');
 else{const halo=(X,Y)=>{x.fillStyle=rad(X+2,Y+2,1,7,[[0,'rgba(140,60,20,.6)'],[1,'rgba(140,60,20,0)']])(x);x.fillRect(X-6,Y-6,16,16)};
  for(let i=20;i<W-10;i+=30)for(const y of[3,H-7])halo(i,y);for(let i=20;i<H-10;i+=30)for(const X of[3,W-7])halo(X,i);edgeNails(x,false,r,'#2a2420')}
 if(!p.t.prov){x.save();x.translate(W*0.6,H*0.55);x.rotate(-0.04);x.fillStyle='#e6d6aa';x.fillRect(0,0,170,74);x.strokeStyle='#7a6440';x.strokeRect(4,4,162,66);
  x.fillStyle='#3a2c1a';x.font='bold 10px Georgia,serif';x.fillText('TOW. ZACHĘTY SZTUK PIĘKNYCH',12,20);x.font='10px Georgia,serif';x.fillText('Wystawa, Warszawa '+(ART.year+2),12,36);x.fillText('Nr kat. '+(ART.crn%150+12),12,50);
  x.font='italic 10px Georgia,serif';x.fillText(ART.name.split(' ').pop()+' – '+ART.title.slice(0,24),12,64);x.restore()}
 return out}
function getView(p,v){if(p.note)return noteView(p,v);if(p.views[v])return p.views[v];let c,x;
 switch(v){
  case'base':{const flat=mk(IW,IH),fx=flat.getContext('2d');fx.scale(S,S);drawShapes(fx,p.shapes,rng(C.sd));c=mk(IW,IH);x=c.getContext('2d');painterly(x,flat,p);x.scale(S,S);
   if(p.frag)for(const l of p.frag.losses){x.beginPath();l.pts.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]));x.closePath();x.fillStyle=GROUND_COL[p.ground];x.fill();x.strokeStyle='rgba(50,32,15,.55)';x.lineWidth=0.8;x.stroke()}break}
  case'cracks':c=makeCracks(p);break;
  case'normal':case'crackview':{c=mk(IW,IH);x=c.getContext('2d');x.drawImage(getView(p,'base'),0,0);
   const sig=()=>{x.save();x.scale(S,S);drawSig(x,C.sig.x,C.sig.y,sigShaky(p),p.seed+5,ART.sig.color,p.sigText);x.restore()};
   if(!sigLater(p))sig();
   if(v==='crackview'){x.fillStyle='rgba(255,250,235,.45)';x.fillRect(0,0,IW,IH);x.drawImage(getView(p,'cracks'),0,0);x.drawImage(getView(p,'cracks'),0,0)}
   else{x.globalAlpha=.32;x.drawImage(getView(p,'cracks'),0,0);x.globalAlpha=1}
   if(sigLater(p))sig();break}
  case'uv':c=makeUV(p);break;case'raking':c=makeRaking(p);break;case'ir':c=makeIR(p);break;case'xray':c=makeXray(p);break;case'back':c=makeBack(p);break}
 p.views[v]=c;return c}
/* --- malarskie pociągnięcia pędzla z proceduralnymi nierównościami --- */
function painterly(x,flat,p){const fd=flat.getContext('2d').getImageData(0,0,IW,IH).data,N=Math.round(12000*W*H/307200),base=(C.sd%100000)*13;
 x.drawImage(flat,0,0);x.lineCap='round';
 const col=(X,Y)=>{const i=(Math.min(IH-1,Math.max(0,Y*S|0))*IW+Math.min(IW-1,Math.max(0,X*S|0)))*4;return[fd[i],fd[i+1],fd[i+2]]};
 for(let i=0;i<N;i++){const q=rng(base+i*7919),X=q()*W,Y=q()*H,reg=regionAtP(p,X,Y);if(reg==='sygnatura'||reg==='ubytek')continue;
  const a0=strokeFor((SC.REG[reg]||{}).dir,q),a=a0[0];let len=a0[1]*0.6,wd=Math.min(a0[2]*1.5,6.5);const ca=Math.cos(a),sa=Math.sin(a),nx=-sa,ny=ca;
  const same=(px,py)=>regionAtP(p,px,py)===reg;
  if(!same(X+ca*len,Y+sa*len)||!same(X+nx*wd/2,Y+ny*wd/2)||!same(X-nx*wd/2,Y-ny*wd/2)){len*=0.3;wd*=0.35}
  const[Rr,Gc,B]=col(X+ca*len/2,Y+sa*len/2),j0=(q()-.5)*18,nb=3+(q()*3|0),bend=(q()-.5)*len*0.3,dry=q()<0.25;
  for(let b=0;b<nb;b++){const off=(nb>1?b/(nb-1)-.5:0)*wd,bl=len*(0.6+q()*0.4)*(dry?0.7:1),j=j0+(q()-.5)*14,sx=X+nx*off+ca*q()*1.5,sy=Y+ny*off+sa*q()*1.5;
   x.strokeStyle=`rgba(${Rr+j|0},${Gc+j|0},${B+j|0},${(dry?0.18:0.3)+q()*0.45})`;x.lineWidth=Math.max(0.6,wd/nb*S*(0.8+q()*1.0));
   x.beginPath();x.moveTo(sx*S,sy*S);x.quadraticCurveTo((sx+ca*bl/2+nx*bend)*S,(sy+sa*bl/2+ny*bend)*S,(sx+ca*bl)*S,(sy+sa*bl)*S);x.stroke()}}}
function pix(p,lx,ly){if(!p.pix)p.pix=getView(p,'normal').getContext('2d').getImageData(0,0,IW,IH).data;const X=Math.max(0,Math.min(IW-1,lx*S|0)),Y=Math.max(0,Math.min(IH-1,ly*S|0)),i=(Y*IW+X)*4;return[p.pix[i],p.pix[i+1],p.pix[i+2]]}
