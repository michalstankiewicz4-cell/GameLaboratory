"use strict";
/* =====================================================================
   PRÓBKI 2D
   ===================================================================== */
function sampleAt(p,lx,ly){const reg=regionAtP(p,lx,ly),n=p.samples.length+1,kind=tool,s={x:lx,y:ly,n,reg,kind};
 if(kind==='pigment'){s.list=pigKeys(p,reg).map(k=>PG[k]);note(p,'pigment',`#${n} ${reg}: `+s.list.map(a=>`${a[0]} (od ${a[1]||'starożytności'})`).join(', '))}
 else{const c=pix(p,lx,ly);s.col=c.join(',');s.ang={h:0,v:1.57,diag:0.3,hv:0}[(SC.REG[reg]||{}).dir]??0.9;note(p,'micro',`#${n} ${reg}: `+MICRO_OBS[microMode(p)])}
 p.samples.push(s);p.last=s}
function drawMicro(c,p,s){const x=c.getContext('2d'),N=c.width,r=rng(p.seed+s.n*97),[R,Gc,B]=s.col.split(',').map(Number),mode=microMode(p);
 x.fillStyle=`rgb(${s.col})`;x.fillRect(0,0,N,N);const jc=k=>`rgb(${R+(r()-.5)*k|0},${Gc+(r()-.5)*k|0},${B+(r()-.5)*k|0})`;
 if(mode==='brush'){x.save();x.translate(N/2,N/2);x.rotate(s.ang);
  for(let i=-N;i<N;i+=3+r()*4){const o=r()*10;for(const[col,dy]of[[`rgba(255,255,255,${.08+r()*.14})`,0],[`rgba(0,0,0,${.12+r()*.16})`,1.6]]){x.strokeStyle=col;x.lineWidth=1+r()*1.4;x.beginPath();x.moveTo(-N,i+dy);for(let k=-N;k<=N;k+=16)x.lineTo(k,i+dy+Math.sin(k*0.05+o)*1.6);x.stroke()}}x.restore();
  for(let i=0;i<520;i++){const cx=r()*N,cy=r()*N,sz=0.8+Math.pow(r(),2)*7,v=5+Math.floor(r()*3);x.fillStyle=jc(80);x.beginPath();for(let k=0;k<v;k++){const a=k/v*6.283+r()*0.6,rr=sz*(0.5+r()*0.7);k?x.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr):x.moveTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr)}x.fill()}}
 else if(mode==='print'){x.fillStyle='#f4f1ea';x.fillRect(0,0,N,N);const w=[1-R/255,1-Gc/255,1-B/255],cols=['rgba(0,160,210,.75)','rgba(210,0,120,.75)','rgba(235,210,0,.8)','rgba(20,20,20,.75)'];
  for(let i=0;i<2600;i++){const k=Math.min(w[0],w[1],w[2]),pr=[w[0]-k,w[1]-k,w[2]-k,k*1.4],sum=pr.reduce((a,b)=>a+b,0)+0.0001;let u=r()*sum*1.25,ci=0;while(ci<4&&u>pr[ci]){u-=pr[ci];ci++}if(ci>3)continue;x.fillStyle=cols[ci];x.beginPath();x.arc(r()*N,r()*N,2.4,0,7);x.fill()}}
 else{x.fillStyle=lin(0,0,N,N,[[0,'rgba(255,255,255,.18)'],[.5,'rgba(255,255,255,0)'],[1,'rgba(255,255,255,.12)']])(x);x.fillRect(0,0,N,N);for(let i=0;i<1400;i++){x.fillStyle=jc(18);x.fillRect(r()*N,r()*N,1.3,1.3)}}
 x.fillStyle='rgba(0,0,0,.6)';x.fillRect(N-92,N-24,84,16);x.fillStyle='#fff';x.fillRect(N-86,N-14,60,2);x.font='10px system-ui';x.fillText('100 µm',N-50,N-17)}
