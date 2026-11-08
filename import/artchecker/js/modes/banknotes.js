"use strict";
/* =====================================================================
   BANKNOTY (fikcyjna waluta: 100 florenów Banku Narodowego Arkadii)
   ===================================================================== */
const THX=455,HOLO=[560,0,40,360],OVI=[540,295,140,50],LAT=[468,316,68,22],REGC=[140,58];
const TILT={v:0,lo:true,hi:false,tool:null};
const NOTE_PROF={
 inkjet:{name:'Wydruk z drukarki atramentowej na zwykłym papierze',core:['paper','print','uv','watermark','thread','holo','ovi','intaglio','mag'],opt:['ir','latent','micro'],modes:{paper:'thin',print:'inkjet',uv:'glow',watermark:'printed',thread:'printed',holo:'paint',ovi:'static',intaglio:'flat',mag:'none',ir:'all',latent:'none',micro:'blur'}},
 laser:{name:'Kolorowa kopia z drukarki laserowej',core:['print','uv','holo','ovi','intaglio','micro'],opt:['watermark','thread','ir','paper','mag'],modes:{print:'laser',uv:'glow',holo:'paint',ovi:'static',intaglio:'flat',micro:'blur',watermark:'none',thread:'printed',ir:'all',paper:'thin',mag:'none'}},
 offset:{name:'Fałszerstwo offsetowe z naklejonym hologramem',core:['holo','ovi','mag','serial'],opt:['watermark','uv','latent','register','ir'],modes:{holo:'sticker',ovi:'static',mag:'none',serial:'check',watermark:'printed',uv:'fake',latent:'none',register:'shift',ir:'none'}},
 bleach:{name:'Wybielony banknot 10 FL z nadrukiem nominału 100',core:['watermark','thread','print'],opt:['holo','ir','serial'],modes:{watermark:'wrong',thread:'wrong',print:'inkjet',holo:'missing',ir:'all',serial:'mismatch'}},
 hq:{name:'Wysokiej jakości fałszerstwo z drukiem wklęsłym',core:['micro','serial'],opt:['ir','register','latent','mag'],modes:{micro:'typo',serial:'check',ir:'none',register:'shift',latent:'none',mag:'none'}},
};
const DEFN={
 paper:{name:'Papier i wymiary',hint:'Prawdziwy banknot: 140 × 72 mm, grubość ok. 0,1 mm, papier bawełniany – sztywny i szeleszczący. Zwykły papier jest miękki i gładki.'},
 intaglio:{name:'Druk wklęsły (wypukłość)',view:'raking',gate:{z:3,area:'motif'},hint:'Druk wklęsły tworzy wyczuwalny relief: motyw, tytuł, nominał i znaki dla niewidomych. Światło boczne przy zoomie ≥ ×3 pokazuje wypukłość.'},
 watermark:{name:'Znak wodny',view:'trans',gate:{z:1.5,area:'wm'},hint:'Pod światło: znak wodny uformowany w papierze ma płynne przejścia od jasnych do ciemnych partii i nie jest widoczny w świetle odbitym. Sprawdź też, czy pokazuje właściwy nominał.'},
 thread:{name:'Nitka zabezpieczająca',view:'trans',gate:{z:4,area:'thread'},hint:'Pod światło nitka jest ciągłą ciemną linią z mikrotekstem (zoom ≥ ×4). W świetle odbitym widać ją tylko w „okienkach”.'},
 register:{name:'Recto-verso (pod światło)',view:'trans',gate:{z:3,area:'reg'},hint:'Symbol w lewym górnym rogu jest wydrukowany częściowo na awersie, częściowo na rewersie. Pod światło połówki muszą idealnie złożyć się w romb (zoom ≥ ×3).'},
 holo:{name:'Hologram (przechylanie)',view:'normal',gate:{z:2,area:'holo',tilt:'both'},hint:'Przechylaj banknot suwakiem „Nachylenie” (od poniżej 20° do powyżej 60°), patrząc z bliska (≥ ×2) na pasek hologramu. Prawdziwy zmienia kolory i motyw.'},
 ovi:{name:'Farba zmienna optycznie',view:'normal',gate:{z:2,area:'ovi',tilt:'both'},hint:'Duży nominał w prawym dolnym rogu jest drukowany farbą zmienną optycznie: przy nachylaniu zmienia kolor ze złotego na zielony.'},
 latent:{name:'Obraz utajony',view:'normal',gate:{z:3,area:'latent',tilt:'hi'},hint:'W pasie poziomych linii pod podpisem ukryto nominał – pojawia się tylko pod ostrym kątem (nachylenie > 65°, zoom ≥ ×3).'},
 micro:{name:'Mikrodruk',view:'normal',gate:{z:8,area:'micro'},hint:'Linia górnej i dolnej ramki to w rzeczywistości mikrodruk. Przy zoomie ≥ ×8 musi być ostry i bezbłędny.'},
 print:{name:'Struktura druku (mikroskop)',view:'normal',gate:{z:6,area:'note'},hint:'Pod mikroskopem (zoom ≥ ×6) druk banknotowy to ciągłe, ostre linie. Drukarka atramentowa daje raster kolorowych kropek, laserowa – rozsypane grudki tonera.'},
 serial:{name:'Numer seryjny',view:'normal',gate:{z:4,area:'serial'},hint:'Przybliż poziomy numer (≥ ×4). Numer poziomy i pionowy muszą być identyczne, a ostatnia cyfra to cyfra kontrolna.'},
 uv:{name:'Lampa UV',view:'uv',gate:{z:1.2,area:'note'},hint:'W UV papier banknotowy pozostaje matowy, a świecą wtopione włókna i nadruki fluorescencyjne. Zwykły papier z wybielaczami optycznymi świeci cały.'},
 ir:{name:'Podczerwień (IR)',view:'ir',gate:{z:1.2,area:'note'},hint:'W podczerwieni prawdziwy banknot pokazuje tylko wybrane elementy (prawą część i numery). Zwykłe farby są widoczne w całości.'},
 mag:{name:'Detektor magnetyczny',view:'normal',probe:'mag',gate:{z:1},hint:'Przyłóż czujnik (kliknij) do numeru seryjnego lub motywu głównego. Prawdziwy banknot ma tam farbę magnetyczną.'},
};
const SETN=[['1. Dotyk i papier',['paper','intaglio']],['2. Pod światło',['watermark','thread','register']],['3. Przechylanie',['holo','ovi','latent']],['4. Lupa i mikroskop',['micro','print','serial']],['5. Urządzenia',['uv','ir','mag']]];
Object.assign(AREA,{motif:'środek widoku na motywie głównym lub znakach dla niewidomych',wm:'środek widoku na znaku wodnym (lewe pole)',thread:'środek widoku na nitce',reg:'środek widoku na symbolu recto-verso (lewy górny róg)',holo:'środek widoku na pasku hologramu',ovi:'środek widoku na dużym nominale (prawy dolny róg)',latent:'środek widoku na pasie linii pod podpisem',micro:'środek widoku na linii ramki (mikrodruk)',note:'środek widoku na banknocie',serial:'środek widoku na poziomym numerze seryjnym'});
const ALPH='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function checkDigit(s){let v=ALPH.indexOf(s[0])+1+ALPH.indexOf(s[1])+1;for(let i=2;i<9;i++)v+=+s[i];return v%10}
function serialFor(r){const a=pick(ALPH.split(''),r),b=pick(ALPH.split(''),r);let s=a+b;for(let i=0;i<7;i++)s+=Math.floor(r()*10);return s+checkDigit(s)}
function rosette(x,cx,cy,R,n,k,col){x.strokeStyle=col;x.lineWidth=0.45;for(let j=0;j<n;j++){x.beginPath();for(let i=0;i<=320;i++){const t=i/320*6.2832,rr=R*(0.62+0.22*Math.sin(k*t+j*0.33)+0.08*Math.sin((k+3)*t-j*0.5));const X=cx+Math.cos(t)*rr,Y=cy+Math.sin(t)*rr;i?x.lineTo(X,Y):x.moveTo(X,Y)}x.stroke()}}
function drawMotif(x,col){x.fillStyle=col;x.strokeStyle=col;
 x.beginPath();x.moveTo(300,300);x.lineTo(318,282);x.lineTo(338,288);x.lineTo(352,280);x.lineTo(392,284);x.lineTo(410,296);x.lineTo(428,300);x.closePath();x.fill();
 x.lineWidth=0.7;for(let Y=134;Y<284;Y+=2.2){const hw=10+(Y-130)/160*12;x.beginPath();x.moveTo(360-hw,Y);x.lineTo(360+hw,Y);x.stroke()}
 x.lineWidth=0.5;for(let X=362;X<380;X+=1.6){x.beginPath();x.moveTo(X,140);x.lineTo(X+(X-360)*0.5,282);x.stroke()}
 x.fillRect(344,124,32,5);x.lineWidth=1;x.strokeRect(348,104,24,20);x.beginPath();x.moveTo(346,104);x.lineTo(360,90);x.lineTo(374,104);x.fill();
 x.lineWidth=0.5;for(let i=0;i<9;i++){const a=Math.PI+(-0.35+i*0.04);x.beginPath();x.moveTo(350,114);x.lineTo(350+Math.cos(a)*110,114+Math.sin(a)*66);x.stroke()}
 x.lineWidth=0.6;for(let j=0;j<6;j++){x.beginPath();for(let X=262;X<=458;X+=3){const Y=302+j*4+Math.sin(X*0.08+j)*2;X===262?x.moveTo(X,Y):x.lineTo(X,Y)}x.stroke()}}
function drawTitle(x,col){x.fillStyle=col;x.textAlign='center';x.font='bold 18px Georgia,serif';x.fillText('BANK NARODOWY ARKADII',420,58);x.font='12px Georgia,serif';x.fillText('STO FLORENÓW',420,76);x.textAlign='left'}
function drawSmall100(x,col){x.fillStyle=col;x.font='bold 30px Georgia,serif';x.fillText('100',28,66)}
function drawTactile(x,col){x.fillStyle=col;[300,308,316].forEach(y=>x.fillRect(30,y,20,4))}
function regPieces(x,which,dx,dy,col){const[cx,cy]=REGC,s=13;x.fillStyle=col;x.save();x.translate(dx,dy);x.beginPath();
 if(which==='front'){x.moveTo(cx-s,cy);x.lineTo(cx,cy-s);x.lineTo(cx,cy+s);x.closePath();x.fill();x.beginPath();x.arc(cx+6,cy,4,Math.PI,0);x.fill()}
 else{x.moveTo(cx,cy-s);x.lineTo(cx+s,cy);x.lineTo(cx,cy+s);x.closePath();x.fill();x.fillStyle='#efe8d8';x.beginPath();x.arc(cx+6,cy,4,Math.PI,0);x.fill();x.fillStyle=col;x.beginPath();x.arc(cx-6,cy,4,0,Math.PI);x.fill()}x.restore()}
function microprint(x,p,y){const m=p.t.micro?p.m.micro:'ok';x.fillStyle='#3e5a4c';
 if(m==='blur'){const r=rng(p.seed+13);for(let X=24;X<676;X+=0.7)x.fillRect(X,y-0.7+r()*0.4,0.35+r()*0.4,0.5+r()*0.5);return}
 const u=m==='typo'?'ARKADA·100·':'ARKADIA·100·';x.font='1.15px Georgia,serif';const w=x.measureText(u).width||8;for(let X=24;X<676-w;X+=w)x.fillText(u,X,y+0.4)}
function wmShape(x,wrong,style){const ink=style==='flat'?'rgba(110,100,90,1)':null;
 const body=()=>{x.beginPath();if(!wrong){x.moveTo(85,250);x.lineTo(105,250);x.lineTo(101,140);x.lineTo(89,140);x.closePath();x.rect(87,124,16,14);x.moveTo(85,124);x.lineTo(95,112);x.lineTo(105,124);x.closePath()}
  else{x.arc(95,142,8,0,7);x.moveTo(93,150);x.rect(93,150,4,90);x.rect(80,160,30,4);x.moveTo(75,232);x.quadraticCurveTo(95,258,115,232);x.lineTo(112,230);x.quadraticCurveTo(95,250,78,230);x.closePath()}};
 if(ink){x.fillStyle=ink;body();x.fill();x.font='bold 30px Georgia';x.fillText(wrong?'10':'100',wrong?80:70,300);return}
 x.fillStyle=rad(95,190,10,110,[[0,'rgba(255,250,232,.55)'],[1,'rgba(255,250,232,0)']])(x);x.fillRect(0,60,190,280);
 x.fillStyle=lin(80,0,110,0,[[0,'rgba(255,250,228,.95)'],[.55,'rgba(230,210,170,.8)'],[1,'rgba(110,85,45,.6)']])(x);body();x.fill();
 x.font='bold 30px Georgia';x.fillStyle='rgba(255,248,225,.92)';x.fillText(wrong?'10':'100',wrong?80:70,300);x.fillStyle='rgba(120,95,55,.45)';x.fillText(wrong?'10':'100',(wrong?80:70)+1.5,301.5)}
function fibers(x,p,glow){const r=rng(p.seed+3),n=glow?70:40;x.lineWidth=glow?0.9:0.6;
 for(let i=0;i<n;i++){const X=24+r()*(W-48),Y=24+r()*(H-48),a=r()*6.28,l=5+r()*6;x.strokeStyle=glow?pick(['#ff4060','#40a8ff','#50ff90'],r):'rgba(205,180,60,.6)';if(glow){x.shadowColor=x.strokeStyle;x.shadowBlur=4}
  x.beginPath();x.moveTo(X,Y);x.quadraticCurveTo(X+Math.cos(a+0.6)*l/2,Y+Math.sin(a+0.6)*l/2,X+Math.cos(a)*l,Y+Math.sin(a)*l);x.stroke()}x.shadowBlur=0}
function compass(x,cx,cy,R){x.beginPath();x.arc(cx,cy,R,0,7);x.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4,l=i%2?R*0.6:R*1.1;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*l,cy+Math.sin(a)*l);x.stroke()}}
function drawNoteFront(x,p){x.fillStyle='#efe8d8';x.fillRect(0,0,W,H);
 x.fillStyle=lin(150,0,W,0,[[0,'rgba(160,195,175,0)'],[.18,'rgba(160,195,175,.5)'],[1,'rgba(215,192,150,.5)']])(x);x.fillRect(0,0,W,H);
 x.fillStyle=rad(95,190,10,120,[[0,'rgba(252,249,242,.95)'],[1,'rgba(252,249,242,0)']])(x);x.fillRect(0,40,190,300);
 rosette(x,300,200,92,18,7,'rgba(60,105,85,.45)');rosette(x,640,285,38,12,9,'rgba(140,100,40,.45)');
 x.strokeStyle='rgba(90,130,110,.55)';x.lineWidth=0.45;for(let j=0;j<12;j++){x.beginPath();for(let X=180;X<=555;X+=3){const Y=30+j*2.6+Math.sin(X*0.05+j*0.4)*3;X===180?x.moveTo(X,Y):x.lineTo(X,Y)}x.stroke()}
 x.strokeStyle='#3e5a4c';x.lineWidth=1;x.strokeRect(12,12,W-24,H-24);x.strokeRect(19,19,W-38,H-38);microprint(x,p,15.5);microprint(x,p,H-15.5);
 drawMotif(x,'#2f4b3e');drawTitle(x,'#2f4b3e');drawSmall100(x,'#2f4b3e');drawTactile(x,'#2f4b3e');
 x.strokeStyle='rgba(60,90,75,.55)';x.lineWidth=0.7;for(let Y=LAT[1];Y<LAT[1]+LAT[3];Y+=2){x.beginPath();x.moveTo(LAT[0],Y);x.lineTo(LAT[0]+LAT[2],Y);x.stroke()}
 regPieces(x,'front',0,0,'#2f4b3e');
 if(p.t.thread&&p.m.thread==='printed'){x.fillStyle='rgba(120,120,115,.7)';x.fillRect(THX-1,0,2,H)}
 else for(let Y=22;Y<H-20;Y+=34){x.fillStyle=lin(THX-2,0,THX+2,0,[[0,'#9aa0a2'],[.5,'#eef2f2'],[1,'#8a9092']])(x);x.fillRect(THX-2,Y,4,14)}
 x.font='bold 12px "Courier New",monospace';x.fillStyle='#a32020';x.fillText(p.serialH,604,40);
 x.save();x.translate(207,330);x.rotate(-Math.PI/2);x.fillStyle='#1d1d1d';x.fillText(p.serialV,0,0);x.restore();
 x.strokeStyle='#2f4b3e';x.lineWidth=0.8;x.beginPath();x.moveTo(470,300);x.bezierCurveTo(485,285,490,315,505,298);x.bezierCurveTo(515,290,522,306,535,296);x.stroke();x.font='6px Georgia';x.fillStyle='#2f4b3e';x.fillText('PREZES BANKU',475,311);
 if(p.t.watermark&&p.m.watermark==='printed'){x.globalAlpha=.22;wmShape(x,false,'flat');x.globalAlpha=1}
 if(p.t.uv&&p.m.uv==='fake')fibers(x,p,false);
 x.fillStyle='#efe8d8';x.fillRect(HOLO[0],0,HOLO[2],H)}
function embossFrom(hm,src){const hb=mk(IW,IH),hbx=hb.getContext('2d');hbx.filter='blur(1.2px)';hbx.drawImage(hm,0,0);
 const hd=hbx.getImageData(0,0,IW,IH).data,sd=src.getContext('2d').getImageData(0,0,IW,IH).data,out=mk(IW,IH),x=out.getContext('2d'),id=x.createImageData(IW,IH),d=id.data;
 for(let y=1;y<IH-1;y++)for(let X=1;X<IW-1;X++){const i=y*IW+X,i4=i*4,gx=hd[(i-1)*4]-hd[(i+1)*4],gy=hd[(i-IW)*4]-hd[(i+IW)*4],v=lumOf(sd,i4)*0.35+100+(gx*1.6+gy*0.8)*1.6;d[i4]=v*1.03;d[i4+1]=v*0.98;d[i4+2]=v*0.9;d[i4+3]=255}
 x.putImageData(id,0,0);return out}
function noteView(p,v){if(p.views[v])return p.views[v];let c=mk(IW,IH),x=c.getContext('2d');
 if(v==='normal'){x.scale(S,S);drawNoteFront(x,p)}
 else if(v==='trans'){x.scale(S,S);x.fillStyle='#d8c493';x.fillRect(0,0,W,H);x.globalAlpha=.32;x.drawImage(noteView(p,'normal'),0,0,W,H);
  x.save();x.translate(W,0);x.scale(-1,1);x.globalAlpha=.16;rosette(x,250,170,80,14,5,'rgba(60,40,20,1)');x.font='bold 40px Georgia';x.fillStyle='rgba(60,40,20,1)';x.fillText('100',60,300);x.restore();x.globalAlpha=1;
  const wm=p.t.watermark?p.m.watermark:'ok';if(wm==='ok'||wm==='wrong')wmShape(x,wm==='wrong','multi');else if(wm==='printed'){x.globalAlpha=.35;wmShape(x,false,'flat');x.globalAlpha=1}
  const th=p.t.thread?p.m.thread:'ok';
  if(th!=='printed'){x.fillStyle='rgba(38,32,26,.88)';x.fillRect(THX-1.8,0,3.6,H);x.fillStyle='rgba(240,230,200,.95)';x.font='bold 2.2px Arial';for(let Y=10;Y<H;Y+=24){x.save();x.translate(THX-0.8,Y);x.rotate(Math.PI/2);x.fillText(th==='wrong'?'10 FL':'100 FL',0,0);x.restore()}}
  else{x.fillStyle='rgba(120,120,115,.3)';x.fillRect(THX-1,0,2,H)}
  const hm=p.t.holo?p.m.holo:'ok';if(hm!=='missing'){x.fillStyle=hm==='paint'?'rgba(80,75,65,.25)':'rgba(55,50,40,.5)';x.fillRect(HOLO[0],hm==='sticker'?20:0,HOLO[2],hm==='sticker'?H-40:H)}
  regPieces(x,'front',0,0,'rgba(30,45,38,.9)');regPieces(x,'back',p.t.register?4:0,p.t.register?3:0,'rgba(30,45,38,.9)')}
 else if(v==='uv'){x.scale(S,S);const m=p.t.uv?p.m.uv:'ok';x.fillStyle=m==='glow'?'#7f93f0':'#170c26';x.fillRect(0,0,W,H);x.globalAlpha=m==='glow'?0.45:0.16;x.drawImage(noteView(p,'normal'),0,0,W,H);x.globalAlpha=1;
  if(m==='glow'){x.fillStyle='rgba(205,220,255,.3)';x.fillRect(0,0,W,H)}
  if(m==='ok'){fibers(x,p,true);x.shadowColor='#c8ff70';x.shadowBlur=6;x.strokeStyle='rgba(205,255,120,.9)';x.lineWidth=1.2;compass(x,360,190,46);x.font='bold 12px "Courier New"';x.fillStyle='rgba(205,255,120,.95)';x.fillText(p.serialH,604,40);x.shadowBlur=0}
  if(m==='fake')fibers(x,p,false)}
 else if(v==='ir'){const g=pixMap(noteView(p,'normal'),l=>{const q=Math.min(255,l*1.05);return[q,q,q]}),m=p.t.ir?p.m.ir:'ok';x.fillStyle='#ebebe7';x.fillRect(0,0,IW,IH);
  if(m==='all')x.drawImage(g,0,0);else if(m==='ok'){x.save();x.beginPath();x.rect(440*S,0,IW,IH);x.rect(196*S,240*S,16*S,100*S);x.clip();x.drawImage(g,0,0);x.restore()}}
 else if(v==='raking'){const hm=mk(IW,IH),h=hm.getContext('2d');h.fillStyle='#808080';h.fillRect(0,0,IW,IH);h.scale(S,S);
  if(!p.t.intaglio){h.globalAlpha=.85;drawMotif(h,'#ffffff');drawTitle(h,'#fff');drawSmall100(h,'#fff');drawTactile(h,'#fff');h.globalAlpha=1}
  const r=rng(p.seed+9);h.fillStyle='rgba(255,255,255,.07)';for(let i=0;i<5000;i++)h.fillRect(r()*W,r()*H,1.2,1.2);c=embossFrom(hm,noteView(p,'normal'))}
 p.views[v]=c;return c}
function drawNoteOverlay(x,p){const th=TILT.v,hm=p.t.holo?p.m.holo:'ok',[hx,hy,hw,hh]=HOLO;x.save();x.translate(p.x,p.y);
 if(hm==='ok'){const g=x.createLinearGradient(0,0,0,hh);for(let k=0;k<=6;k++)g.addColorStop(k/6,`hsla(${(th*6+k*55)%360},75%,${62+10*Math.sin(th*0.1+k)}%,.92)`);x.fillStyle=g;x.fillRect(hx,hy,hw,hh);
  x.fillStyle='rgba(255,255,255,.6)';x.font='bold 13px Georgia';x.textAlign='center';for(let Y=40;Y<hh;Y+=70){if(th<45)x.fillText('100',hx+hw/2,Y);else{x.fillRect(hx+hw/2-3,Y-18,6,18);x.beginPath();x.moveTo(hx+hw/2-6,Y-18);x.lineTo(hx+hw/2,Y-26);x.lineTo(hx+hw/2+6,Y-18);x.fill()}}x.textAlign='left';
  const sy=(th/90)*hh;x.fillStyle=lin(0,sy-30,0,sy+30,[[0,'rgba(255,255,255,0)'],[.5,'rgba(255,255,255,.6)'],[1,'rgba(255,255,255,0)']])(x);x.fillRect(hx,sy-30,hw,60)}
 else if(hm==='sticker'){x.fillStyle=lin(hx,0,hx+hw,0,[[0,'#a9adb0'],[.5,'#e4e6e8'],[1,'#9a9ea2']])(x);x.fillRect(hx+3,hy+20,hw-6,hh-40);x.strokeStyle='rgba(60,60,60,.7)';x.lineWidth=0.6;x.strokeRect(hx+3,hy+20,hw-6,hh-40);x.fillStyle='rgba(255,255,255,.5)';for(let Y=40;Y<hh-30;Y+=22){x.beginPath();x.arc(hx+hw/2,Y,4,0,7);x.fill()}}
 else if(hm==='paint'){x.fillStyle='#b8b8b4';x.fillRect(hx,hy,hw,hh)}
 else{x.fillStyle='rgba(205,195,160,.45)';x.fillRect(hx+2,hy,hw-4,hh)}
 const t=p.t.ovi?0:Math.max(0,Math.min(1,(th-20)/45)),c1=[184,144,42],c2=[40,125,78],cc=c1.map((v,i)=>v+(c2[i]-v)*t|0);
 x.font='bold 46px Georgia';x.fillStyle=`rgb(${cc})`;x.fillText('100',OVI[0]+34,OVI[1]+42);
 if(!p.t.latent&&th>65){x.save();x.beginPath();x.rect(LAT[0],LAT[1],LAT[2],LAT[3]);x.clip();x.globalAlpha=Math.min(1,(th-65)/20);x.font='bold 21px Georgia';x.fillStyle='rgba(40,70,58,.9)';x.fillText('100',LAT[0]+12,LAT[1]+19);x.restore()}
 x.restore()}
function noteDots(p,x0,y0,x1,y1){const T=4,laser=p.m.print==='laser';
 for(let ty=Math.floor((y0-p.y)/T);ty*T<y1-p.y;ty++)for(let tx=Math.floor((x0-p.x)/T);tx*T<x1-p.x;tx++){const r=rng(p.seed^Math.imul(tx,73856093)^Math.imul(ty,19349663)),bx=tx*T,by=ty*T,[R,Gc,B]=pix(p,bx+T/2,by+T/2),X=p.x+bx,Y=p.y+by;
  if(laser){for(let i=0;i<10;i++){const s=0.1+r()*0.4;ctx.fillStyle=`rgba(${R*0.55|0},${Gc*0.55|0},${B*0.55|0},.75)`;ctx.beginPath();ctx.ellipse(X+r()*T,Y+r()*T,s,s*(0.5+r()*0.6),r()*3,0,7);ctx.fill()}}
  else{ctx.fillStyle='rgba(244,240,230,.5)';ctx.fillRect(X,Y,T,T);const w=[1-R/255,1-Gc/255,1-B/255],k=Math.min(...w),pr=[w[0]-k,w[1]-k,w[2]-k,k*1.4],cols=['rgba(0,160,210,.8)','rgba(210,0,120,.8)','rgba(235,210,0,.85)','rgba(20,20,20,.8)'],sum=pr.reduce((a,b)=>a+b,0)+0.001;
   for(let i=0;i<30;i++){let u=r()*sum*1.2,ci=0;while(ci<4&&u>pr[ci]){u-=pr[ci];ci++}if(ci>3)continue;ctx.fillStyle=cols[ci];ctx.beginPath();ctx.arc(X+r()*T,Y+r()*T,0.16,0,7);ctx.fill()}}}}
function noteLive(p){if(vw.z>=5){const V=viewportWorld();if(!(p.x+W<V.x0||p.x>V.x1||p.y+H<V.y0||p.y>V.y1)){ctx.save();ctx.beginPath();ctx.rect(p.x,p.y,W,H);ctx.clip();
 if(!p.t.print){ctx.translate(p.x,p.y);drawNoteFront(ctx,p)}else noteDots(p,Math.max(V.x0,p.x),Math.max(V.y0,p.y),Math.min(V.x1,p.x+W),Math.min(V.y1,p.y+H));ctx.restore()}}drawNoteOverlay(ctx,p)}
function noteArea(p,area,v){const lx=v.cx-p.x,ly=v.cy-p.y,inN=lx>=0&&lx<=W&&ly>=0&&ly<=H;if(!inN)return false;
 switch(area){case'note':return true;case'motif':return(lx>290&&lx<440&&ly>85&&ly<330)||(lx>20&&lx<60&&ly>290&&ly<330);case'wm':return lx<190&&ly>90&&ly<320;case'thread':return Math.abs(lx-THX)<14;
  case'reg':return Math.hypot(lx-REGC[0],ly-REGC[1])<26;case'holo':return lx>=HOLO[0]-6&&lx<=HOLO[0]+HOLO[2]+6;case'ovi':return lx>OVI[0]&&ly>OVI[1]-10;
  case'latent':return lx>LAT[0]-8&&lx<LAT[0]+LAT[2]+8&&ly>LAT[1]-8&&ly<LAT[1]+LAT[3]+8;case'micro':return(Math.abs(ly-15.5)<6||Math.abs(ly-(H-15.5))<6)&&lx>24&&lx<676;case'serial':return lx>596&&lx<700&&ly>22&&ly<50}return false}
const tiltOK=g=>!g||!g.tilt||(g.tilt==='both'?TILT.lo&&TILT.hi:TILT.v>65);
function newNotes(r){ART={wcm:14,hcm:7.2,name:'Bank Narodowy Arkadii'};SC=null;C=null;W=700;H=360;IW=W*S;IH=H*S;
 const nG=1+Math.floor(r()*3),list=[];for(let i=0;i<nG;i++)list.push({orig:true,profile:null,t:{}});
 shuffle(Object.keys(NOTE_PROF),r).slice(0,5-nG).forEach(k=>list.push({orig:false,profile:k,t:rollTells(NOTE_PROF[k],r)}));shuffle(list,r);
 P=list.map((p,i)=>{p.note=true;p.letter='ABCDE'[i];p.seed=(r()*1e9)|0;p.m=Object.assign({},p.profile?NOTE_PROF[p.profile].modes:{});p.views={};p.samples=[];p.notes={};p.umark='';
  const sr=serialFor(r);p.serialH=p.serialV=sr;p.goodCheck=checkDigit(sr);
  if(p.t.serial){if(p.m.serial==='mismatch')p.serialV=sr.slice(0,5)+((+sr[5]+1)%10)+sr.slice(6);else p.serialH=p.serialV=sr.slice(0,9)+((+sr[9]+3)%10)}
  p.x=i<3?G+i*(W+G):G+(W+G)/2+(i-3)*(W+G);p.y=i<3?G:G*2+H;return p});BW=3*W+4*G;BH=2*H+3*G;TILT.v=0;TILT.lo=true;TILT.hi=false;const ti=document.getElementById('tilt');if(ti){ti.value=0;document.getElementById('tiltv').textContent='0°'}}
function obsN(p,id){const t=p.t,m=p.m;switch(id){
 case'paper':return t.paper?`Wymiary ${p.profile==='laser'?'139 × 71':'140 × 72'} mm, grubość 0,085 mm. Papier celulozowy – miękki, gładki, nie szeleści.`:'Wymiary 140 × 72 mm, grubość 0,105 mm. Papier bawełniany – sztywny, charakterystycznie szeleszczący.';
 case'intaglio':return t.intaglio?'Powierzchnia całkowicie płaska – brak wypukłego druku, znaki dla niewidomych niewyczuwalne.':'Wyraźny relief: motyw główny, tytuł, nominał i znaki dla niewidomych są wypukłe i wyczuwalne pod palcem.';
 case'watermark':return{ok:'Pod światło widać latarnię morską i nominał 100 z płynnymi przejściami od jasnych do ciemnych partii; w świetle odbitym znak jest niewidoczny.',printed:'Szary, płaski wizerunek bez jasnych partii – widoczny także w świetle odbitym.',none:'Brak znaku wodnego.',wrong:'Znak wodny wielotonowy, ale przedstawia kotwicę i nominał 10.'}[t.watermark?m.watermark:'ok'];
 case'thread':return{ok:'Pod światło ciągła ciemna nitka z jasnym mikrotekstem „100 FL”; w świetle odbitym widoczna w okienkach.',printed:'W świetle odbitym szara linia, a pod światło brak ciągłej nitki – to nadruk.',wrong:'Ciągła nitka z mikrotekstem „10 FL”.'}[t.thread?m.thread:'ok'];
 case'register':return t.register?'Połówki symbolu przesunięte względem siebie – nie składają się w romb.':'Pod światło połówki z awersu i rewersu idealnie składają się w romb.';
 case'holo':return{ok:'Przy zmianie nachylenia hologram zmienia kolory, a motyw przechodzi z nominału 100 w latarnię.',sticker:'Srebrny pasek, ale obraz się nie zmienia; widoczna krawędź naklejki.',paint:'Szara farba imitująca folię – brak efektu optycznego.',missing:'Brak paska foliowego – ślady kleju po usuniętej folii.'}[t.holo?m.holo:'ok'];
 case'ovi':return t.ovi?'Nominał 100 pozostaje złoty przy każdym kącie.':'Nominał 100 zmienia kolor ze złotego na zielony przy nachylaniu.';
 case'latent':return t.latent?'Pod żadnym kątem nie pojawia się ukryty obraz.':'Pod ostrym kątem w pasie linii pojawia się ukryty nominał 100.';
 case'micro':return{ok:'Mikrodruk „ARKADIA·100·” ostry i czytelny.',blur:'Zamiast liter – rozmyta linia kropek, tekstu nie da się odczytać.',typo:'Mikrodruk ostry, ale z błędem: „ARKADA·100·”.'}[t.micro?m.micro:'ok'];
 case'print':return{ok:'Linie giloszy ciągłe i ostre, kolory nadrukowane pełnymi liniami.',inkjet:'Obraz złożony z drobnych kolorowych kropek (C, M, Y, K) – raster drukarki atramentowej.',laser:'Nieregularne grudki tonera rozsypane wokół linii.'}[t.print?m.print:'ok'];
 case'serial':return`Numer poziomy: ${p.serialH}; numer pionowy: ${p.serialV}.`;
 case'uv':return{ok:'Papier matowy; świecą wtopione włókna (czerwone, niebieskie, zielone), żółtozielona róża wiatrów i numer seryjny.',glow:'Cały papier świeci jasnoniebiesko, brak świecących włókien i nadruków.',fake:'Papier matowy, ale „włókna” są nadrukiem jednego koloru, widocznym też w świetle dziennym; brak róży wiatrów.'}[t.uv?m.uv:'ok'];
 case'ir':return{ok:'W podczerwieni widoczna tylko prawa część banknotu i numery – reszta zanika.',all:'W podczerwieni widoczny cały wzór banknotu.',none:'W podczerwieni banknot jest pusty – znikają także numery.'}[t.ir?m.ir:'ok'];
 case'mag':return t.mag?'Brak sygnału magnetycznego w numerze seryjnym i motywie głównym.':'Czujnik wykrywa farbę magnetyczną w numerze seryjnym i motywie głównym.'}}
function whyN(p,id){const m=p.m;return({paper:()=>'Papier celulozowy, cieńszy (0,085 mm)'+(p.profile==='laser'?' i pomniejszony format':'')+' – nie papier banknotowy.',intaglio:()=>'Brak druku wklęsłego – płaski nadruk.',
 watermark:()=>({printed:'Znak wodny wydrukowany, a nie uformowany w papierze.',none:'Brak znaku wodnego.',wrong:'Znak wodny niższego nominału – papier z wybielonego banknotu 10 FL.'})[m.watermark],
 thread:()=>m.thread==='printed'?'Nitka nadrukowana, nie wtopiona w papier.':'Nitka z banknotu 10 FL – wybielony banknot niższego nominału.',register:()=>'Recto-verso nie pasuje – awers i rewers drukowane osobno.',
 holo:()=>({sticker:'Naklejka bez zmiany obrazu przy przechylaniu.',paint:'Farba imitująca hologram.',missing:'Usunięty hologram – ślady po wybielaniu banknotu.'})[m.holo],ovi:()=>'Farba bez zmiany koloru – imitacja OVI.',latent:()=>'Brak obrazu utajonego.',
 micro:()=>m.micro==='blur'?'Mikrodruk nieczytelny – druk zbyt mało precyzyjny.':'Błąd w mikrodruku („ARKADA”).',print:()=>m.print==='laser'?'Grudki tonera – kopia laserowa.':'Raster drukarki atramentowej.',
 serial:()=>m.serial==='mismatch'?'Numer poziomy różni się od pionowego.':`Zła cyfra kontrolna – zgodnie z regułą powinna być ${checkDigit(p.serialH)}.`,
 uv:()=>m.uv==='glow'?'Papier z wybielaczami optycznymi – świeci w UV.':'Nadrukowane imitacje włókien, brak nadruków fluorescencyjnych.',ir:()=>m.ir==='all'?'Cały wzór widoczny w IR – zwykłe farby drukarskie.':'Brak farb aktywnych w IR – numery niewidoczne.',mag:()=>'Brak farby magnetycznej.'}[id]||(()=>''))()}
