"use strict";
/* =====================================================================
   MONETA – 5 talarów Królestwa Arkadii, 1867 (moneta fikcyjna)
   Katalog: srebro próby 900, 25,00 g, Ø 37,0 mm, rant ząbkowany.
   Na planszy: awers (lewa) i rewers (prawa); widok „rant” pokazuje rozwinięcie rantu.
   ===================================================================== */
const CO={R:140,A:[160,160],B:[480,160]};
const COIN_PROF={
 cast:{name:'Odlew z formy zdjętej z oryginału (stop cynowo-ołowiowy, posrebrzany)',core:['weight','diam','xrf','strike'],opt:['edge','wear'],modes:{weight:'cast',diam:'small',xrf:'snpb',strike:'cast',edge:'cast',wear:'soft'}},
 struck:{name:'Współczesna podróbka bita z grawerowanego stempla, sztucznie postarzana',core:['wear','xrf','edge'],opt:['weight'],modes:{wear:'tumbled',xrf:'cuni',edge:'irregular',weight:'cuni'}},
 steel:{name:'Podróbka na stalowym rdzeniu, posrebrzana',core:['magnet','weight','xrf'],opt:['edge','diam'],modes:{magnet:'yes',weight:'steel',xrf:'plated',edge:'irregular',diam:'big'}},
 electro:{name:'Galwanoplastyka – dwie połówki sklejone',core:['edge','weight','xrf'],opt:['strike'],modes:{edge:'seam',weight:'electro',xrf:'electro',strike:'electro'}},
};
const COIN_DEF={
 weight:{name:'Waga',hint:'Katalog: 25,00 g (tolerancja ±0,10 g). Srebro jest gęste – podróbki z innych stopów albo z rdzeniem są lżejsze.'},
 diam:{name:'Średnica (suwmiarka)',view:'normal',gate:{z:2,area:'coin'},hint:'Katalog: 37,0 mm. Przybliż monetę (≥ ×2). Odlew z formy zdjętej z oryginału jest mniejszy przez skurcz metalu. Skala 1 cm jest w lewym dolnym rogu.'},
 xrf:{name:'Skład stopu (XRF)',view:'normal',probe:'xrf',gate:{z:2},hint:'Przy zoomie ≥ ×2 kliknij monetę. Katalog: srebro próby 900 (Ag 90%, Cu 10%). XRF bada powierzchnię – zwróć uwagę na pierwiastki wykryte pod powłoką.'},
 magnet:{name:'Magnes',view:'normal',probe:'magnet',gate:{z:1},hint:'Kliknij monetę, aby przyłożyć magnes. Srebro nie jest przyciągane; stalowy rdzeń – tak.'},
 edge:{name:'Rant',view:'edge',gate:{z:4,area:'edge'},hint:'Widok pokazuje rozwinięcie rantu. Przybliż (≥ ×4): oryginał ma regularne ząbki równej głębokości. Szew formy albo linia łączenia połówek zdradza odlew lub galwanoplastykę.'},
 strike:{name:'Bicie czy odlew (mikroskop)',view:'normal',gate:{z:6,area:'coin'},hint:'Przy zoomie ≥ ×6 obejrzyj pole monety. Moneta bita ma gładkie pole i promieniste linie płynięcia metalu; odlew – wżery, pęcherzyki i zaokrąglone krawędzie.'},
 wear:{name:'Zużycie wypukłości',view:'raking',gate:{z:3,area:'portrait'},hint:'W świetle bocznym przybliż portret (≥ ×3). Obieg wyciera najpierw najwyższe punkty (policzek, włosy, korona). Równomierne rysy przy ostrych szczytach to sztuczne postarzanie.'},
};
const COIN_SET=[['1. Pomiary',['weight','diam']],['2. Materiał',['xrf','magnet']],['3. Powierzchnia i rant',['edge','strike','wear']]];
const COIN_KG={cast:22.6,cuni:21.7,steel:19.9,electro:21.1},COIN_D={small:'36,6',big:'37,4'};
const COIN_XRF={ag:'Ag 90,0%, Cu 10,0% – srebro próby 900',snpb:'Ag 96% w cienkiej powłoce; pod nią Sn ok. 62%, Pb ok. 35% – stop cynowo-ołowiowy posrebrzany',cuni:'Cu 75%, Ni 25% – miedzionikiel, brak srebra',
 plated:'Ag 97% w cienkiej powłoce; pod nią Fe – posrebrzana stal',electro:'Ag w powłoce; pod nią Cu 99% i wypełnienie Pb – galwanoplastyka'};
function arcText(x,t,cx,cy,r,a0,font){x.save();x.font=font;x.textAlign='center';let a=a0;for(const ch of t){const da=x.measureText(ch).width/r;a+=da/2;x.save();x.translate(cx+Math.cos(a)*r,cy+Math.sin(a)*r);x.rotate(a+Math.PI/2);x.fillText(ch,0,0);x.restore();a+=da/2}x.restore()}
/* st: {fill, stroke, hi} – kolory reliefu; dla mapy wysokości wszystko białe */
function coinObverse(x,cx,cy,st){x.fillStyle=st.fill;x.strokeStyle=st.stroke;x.lineWidth=0.9;
 x.beginPath();x.moveTo(cx-44,cy+74);x.quadraticCurveTo(cx-32,cy+34,cx-24,cy+20);x.lineTo(cx+16,cy+26);x.quadraticCurveTo(cx+22,cy+54,cx+44,cy+74);x.closePath();x.fill();x.stroke();
 x.beginPath();x.moveTo(cx-40,cy+12);x.bezierCurveTo(cx-58,cy-20,cx-36,cy-62,cx-6,cy-64);x.bezierCurveTo(cx+22,cy-64,cx+36,cy-44,cx+38,cy-24);x.lineTo(cx+52,cy-8);x.lineTo(cx+40,cy-1);x.lineTo(cx+44,cy+9);x.lineTo(cx+40,cy+13);x.lineTo(cx+42,cy+20);x.quadraticCurveTo(cx+36,cy+30,cx+18,cy+30);x.lineTo(cx-22,cy+20);x.closePath();x.fill();x.stroke();
 x.lineWidth=0.7;for(let i=0;i<9;i++){x.beginPath();const a=-2.6+i*0.22;x.moveTo(cx-6+Math.cos(a)*20,cy-30+Math.sin(a)*20);x.quadraticCurveTo(cx-6+Math.cos(a)*44,cy-30+Math.sin(a)*40,cx-10+Math.cos(a+0.5)*52,cy-22+Math.sin(a+0.5)*44);x.stroke()}
 for(let i=0;i<8;i++){const a=-2.9+i*0.28,lx=cx-6+Math.cos(a)*36,ly=cy-26+Math.sin(a)*34;x.beginPath();x.ellipse(lx,ly,6,2.6,a+1.2,0,7);x.fill();x.stroke()}
 x.beginPath();x.ellipse(cx+6,cy-12,4,6,0.3,0,7);x.stroke();x.beginPath();x.moveTo(cx+30,cy-22);x.lineTo(cx+38,cy-21);x.stroke();
 x.fillStyle=st.text;arcText(x,'LEOPOLD II · KRÓL ARKADII ·',cx,cy,112,-Math.PI*1.18,'bold 15px Georgia,serif');
 x.font='bold 17px Georgia,serif';x.textAlign='center';x.fillText('1867',cx,cy+104);x.textAlign='left'}
function coinReverse(x,cx,cy,st){x.fillStyle=st.fill;x.strokeStyle=st.stroke;x.lineWidth=0.9;
 x.beginPath();x.moveTo(cx-44,cy-38);x.lineTo(cx+44,cy-38);x.lineTo(cx+44,cy+10);x.quadraticCurveTo(cx+40,cy+46,cx,cy+62);x.quadraticCurveTo(cx-40,cy+46,cx-44,cy+10);x.closePath();x.fill();x.stroke();
 x.lineWidth=0.5;for(let y=cy-34;y<cy+58;y+=3){x.beginPath();x.moveTo(cx-42,y);x.lineTo(cx+42,y);x.stroke()}
 x.lineWidth=0.9;x.beginPath();x.rect(cx-40,cy-52,80,10);x.fill();x.stroke();
 for(let i=0;i<5;i++){const px=cx-36+i*18;x.beginPath();x.moveTo(px-6,cy-52);x.lineTo(px,cy-68+(i%2?6:0));x.lineTo(px+6,cy-52);x.fill();x.stroke();x.beginPath();x.arc(px,cy-70+(i%2?6:0),2.6,0,7);x.fill();x.stroke()}
 for(const s of[-1,1])for(let i=0;i<9;i++){const a=Math.PI/2+s*(0.35+i*0.2),lx=cx+Math.cos(a)*78,ly=cy+8+Math.sin(a)*74;x.beginPath();x.ellipse(lx,ly,7,2.8,a+s*0.9,0,7);x.fill();x.stroke()}
 x.fillStyle=st.text;arcText(x,'KRÓLESTWO ARKADII ·',cx,cy,112,-Math.PI*1.05,'bold 15px Georgia,serif');
 x.font='bold 18px Georgia,serif';x.textAlign='center';x.fillText('5 TALARÓW',cx,cy+100);x.textAlign='left'}
function coinBlank(x,cx,cy,p,hm){const R=CO.R;
 if(hm){x.fillStyle='#808080';x.beginPath();x.arc(cx,cy,R,0,7);x.fill();x.strokeStyle='#e8e8e8';x.lineWidth=8;x.beginPath();x.arc(cx,cy,R-4,0,7);x.stroke();
  x.fillStyle='#d0d0d0';for(let i=0;i<110;i++){const a=i/110*6.283;x.beginPath();x.arc(cx+Math.cos(a)*(R-15),cy+Math.sin(a)*(R-15),1.6,0,7);x.fill()}return}
 const dull=p.t.xrf&&(p.m.xrf==='snpb'||p.m.xrf==='cuni');
 x.fillStyle=rad(cx-R*0.35,cy-R*0.35,R*0.05,R*1.15,dull?[[0,'#ebe8de'],[.6,'#bfbcb1'],[1,'#86847b']]:[[0,'#f8f8f6'],[.6,'#d0d1d3'],[1,'#8b8d91']])(x);
 x.beginPath();x.arc(cx,cy,R,0,7);x.fill();
 if(!p.t.wear){x.strokeStyle='rgba(175,135,70,.22)';x.lineWidth=12;x.beginPath();x.arc(cx,cy,R-8,0,7);x.stroke()}
 x.strokeStyle='#9c9ea2';x.lineWidth=7;x.beginPath();x.arc(cx,cy,R-3.5,0,7);x.stroke();x.strokeStyle='rgba(255,255,255,.6)';x.lineWidth=1;x.beginPath();x.arc(cx,cy,R-7,Math.PI*0.9,Math.PI*1.6);x.stroke();
 for(let i=0;i<110;i++){const a=i/110*6.283,bx=cx+Math.cos(a)*(R-15),by=cy+Math.sin(a)*(R-15);x.fillStyle='#a5a7ab';x.beginPath();x.arc(bx,by,1.6,0,7);x.fill();x.fillStyle='rgba(255,255,255,.7)';x.beginPath();x.arc(bx-0.5,by-0.5,0.6,0,7);x.fill()}}
const coinWear=p=>p.t.wear?p.m.wear:'circ';
function coinHighPoints(x,col){[[CO.A[0]+22,CO.A[1]+4,20],[CO.A[0]-8,CO.A[1]-42,22],[CO.A[0]+30,CO.A[1]-30,10],[CO.B[0],CO.B[1]-60,22],[CO.B[0],CO.B[1]-10,16]].forEach(([X,Y,r])=>{x.fillStyle=rad(X,Y,1,r,[[0,col],[1,col.replace(/[\d.]+\)$/,'0)')]])(x);x.beginPath();x.arc(X,Y,r,0,7);x.fill()})}
function coinScratches(x,p,col){const r=rng(p.seed+17);x.strokeStyle=col;x.lineWidth=0.5;for(const[cx,cy]of[CO.A,CO.B])for(let i=0;i<260;i++){const a=r()*6.28,d=r()*CO.R*0.95,X=cx+Math.cos(a)*d,Y=cy+Math.sin(a)*d,b=r()*6.28,l=3+r()*9;x.beginPath();x.moveTo(X,Y);x.lineTo(X+Math.cos(b)*l,Y+Math.sin(b)*l);x.stroke()}}
function coinView(p,v){const k=KINDS.coin;
 if(v==='normal')return kView(p,v,(x,c)=>{const st={fill:'#dcdde0',stroke:'#6f7175',text:'#77797d'};
  for(const[cx,cy,f]of[[...CO.A,coinObverse],[...CO.B,coinReverse]]){coinBlank(x,cx,cy,p);f(x,cx,cy,st)}
  const w=coinWear(p);if(w==='circ')coinHighPoints(x,'rgba(228,229,231,.92)');if(w==='tumbled')coinScratches(x,p,'rgba(70,70,75,.28)');
  if(w==='soft'||(p.t.strike&&p.m.strike==='cast')){const t=mk(IW,IH),tx=t.getContext('2d');tx.filter='blur(2.2px)';tx.drawImage(c,0,0);x.save();x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,IW,IH);x.drawImage(t,0,0);x.restore()}});
 if(v==='raking')return p.views.raking||(p.views.raking=(()=>{const hm=mk(IW,IH),h=hm.getContext('2d');h.scale(S,S);const st={fill:'#ffffff',stroke:'#ffffff',text:'#ffffff'};
  for(const[cx,cy,f]of[[...CO.A,coinObverse],[...CO.B,coinReverse]]){coinBlank(h,cx,cy,p,true);h.globalAlpha=.75;f(h,cx,cy,st);h.globalAlpha=1}
  const w=coinWear(p);if(w==='circ')coinHighPoints(h,'rgba(150,150,150,.95)');if(w==='tumbled')coinScratches(h,p,'rgba(40,40,40,.55)');
  let src=hm;if(w==='soft'){src=mk(IW,IH);const s2=src.getContext('2d');s2.filter='blur(3px)';s2.drawImage(hm,0,0)}
  const out=embossFrom(src,coinView(p,'normal')),o=out.getContext('2d');o.globalCompositeOperation='destination-in';o.drawImage(coinView(p,'normal'),0,0);return out})());
 if(v==='edge')return kView(p,v,x=>{const m=p.t.edge?p.m.edge:'regular',r=rng(p.seed+23),X0=20,Y0=120,Wd=600,Hd=80;
  x.fillStyle='#cbb894';x.font='13px system-ui';x.fillText('Rozwinięcie rantu (fragment obwodu)',X0,Y0-14);
  x.fillStyle=lin(0,Y0,0,Y0+Hd,[[0,'#8e9094'],[.3,'#e9eaec'],[.7,'#c3c5c8'],[1,'#7d7f83']])(x);x.fillRect(X0,Y0,Wd,Hd);
  let X=X0+2;while(X<X0+Wd-2){const sp=m==='irregular'?2.6+r()*3.4:4,d=m==='irregular'?0.4+r()*0.6:1;x.fillStyle=`rgba(60,62,66,${(m==='cast'?.25:.55)*d})`;x.fillRect(X,Y0+4,sp*0.45,Hd-8);x.fillStyle='rgba(255,255,255,.45)';x.fillRect(X+sp*0.45,Y0+4,0.6,Hd-8);X+=sp;if(m==='irregular'&&r()<0.04)X+=6+r()*8}
  if(m==='cast'){x.strokeStyle='rgba(70,70,74,.85)';x.lineWidth=1.4;x.beginPath();for(let i=0;i<=Wd;i+=6)x.lineTo(X0+i,Y0+Hd/2+(r()-.5)*1.4);x.stroke();x.save();x.filter='blur(1px)';x.restore()}
  if(m==='seam'){x.fillStyle='#9a8a62';x.fillRect(X0,Y0+Hd/2-2,Wd,4);x.strokeStyle='rgba(40,35,25,.8)';x.lineWidth=0.6;x.strokeRect(X0,Y0+Hd/2-2,Wd,4)}
  x.strokeStyle='#55575b';x.strokeRect(X0,Y0,Wd,Hd)});
 return coinView(p,'normal')}
function coinLive(p){if(vw.z<6)return;const V=viewportWorld(),T=4,m=p.t.strike?p.m.strike:'die';
 for(const[cx,cy]of[CO.A,CO.B]){const X0=p.x+cx-CO.R,Y0=p.y+cy-CO.R;if(X0>V.x1||X0+2*CO.R<V.x0||Y0>V.y1||Y0+2*CO.R<V.y0)continue;
  ctx.save();ctx.beginPath();ctx.arc(p.x+cx,p.y+cy,CO.R-8,0,7);ctx.clip();
  for(let ty=Math.floor((Math.max(V.y0,Y0)-p.y)/T);ty*T<Math.min(V.y1,Y0+2*CO.R)-p.y;ty++)for(let tx=Math.floor((Math.max(V.x0,X0)-p.x)/T);tx*T<Math.min(V.x1,X0+2*CO.R)-p.x;tx++){
   const r=rng(p.seed^Math.imul(tx,73856093)^Math.imul(ty,19349663)),X=p.x+tx*T,Y=p.y+ty*T;
   if(m==='die'){const a=Math.atan2(Y+T/2-p.y-cy,X+T/2-p.x-cx);ctx.strokeStyle=`rgba(255,255,255,${.12+r()*.1})`;ctx.lineWidth=0.08;for(let i=0;i<2;i++){const sx=X+r()*T,sy=Y+r()*T;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(a)*2.5,sy+Math.sin(a)*2.5);ctx.stroke()}}
   else if(m==='cast'){for(let i=0;i<3;i++){const s=0.08+r()*0.3;ctx.fillStyle='rgba(55,55,58,.55)';ctx.beginPath();ctx.arc(X+r()*T,Y+r()*T,s,0,7);ctx.fill();if(r()<.3){ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=0.05;ctx.beginPath();ctx.arc(X+r()*T,Y+r()*T,s*1.4,0,7);ctx.stroke()}}}
   else{for(let i=0;i<14;i++){ctx.fillStyle=r()<.5?'rgba(255,255,255,.25)':'rgba(60,60,62,.25)';ctx.fillRect(X+r()*T,Y+r()*T,0.12,0.12)}}}
  ctx.restore()}}
function coinArea(p,a,v){const lx=v.cx-p.x,ly=v.cy-p.y,inA=Math.hypot(lx-CO.A[0],ly-CO.A[1])<CO.R,inB=Math.hypot(lx-CO.B[0],ly-CO.B[1])<CO.R;
 if(a==='coin')return inA||inB;if(a==='portrait')return Math.hypot(lx-CO.A[0]-5,ly-CO.A[1]+10)<70;if(a==='edge')return lx>20&&lx<620&&ly>110&&ly<210;return false}
function coinObs(p,id){const t=p.t,m=p.m;switch(id){
 case'weight':return`Masa: ${t.weight?fmt(COIN_KG[m.weight].toFixed(2)):fmt((25+((p.seed%9)-4)*0.01).toFixed(2))} g.`;
 case'diam':return`Średnica: ${t.diam?COIN_D[m.diam]:'37,0'} mm.`;
 case'xrf':return COIN_XRF[t.xrf?m.xrf:'ag'];
 case'magnet':return t.magnet?'Moneta wyraźnie przyciągana przez magnes.':'Brak przyciągania – metal niemagnetyczny.';
 case'edge':return{regular:'Rant ząbkowany: regularne ząbki równej szerokości i głębokości.',irregular:'Ząbki nierównej szerokości i głębokości, miejscami przerwy.',cast:'Ząbki płytkie i rozmyte; wzdłuż rantu biegnie szew formy.',seam:'Środkiem rantu biegnie wyraźna linia łączenia dwóch połówek, ząbki są przecięte.'}[t.edge?m.edge:'regular'];
 case'strike':return{die:'Pole gładkie, promieniste linie płynięcia metalu przy obrzeżu, ostre krawędzie liter – ślady bicia.',cast:'Drobne wżery i pęcherzyki na polu, zaokrąglone krawędzie liter – ślady odlewu.',electro:'Bardzo drobna, ziarnista struktura bez linii płynięcia metalu.'}[t.strike?m.strike:'die'];
 case'wear':return{circ:'Najwyższe punkty (policzek, włosy, korona tarczy) wytarte i wygładzone, niższe partie z pełnym detalem – zużycie obiegowe.',tumbled:'Drobne rysy rozłożone równomiernie na całej powierzchni, a najwyższe punkty ostre – sztuczne postarzanie.',soft:'Cały detal miękki i rozmyty, także w zagłębieniach – utrata detalu przy odlewaniu.'}[coinWear(p)]}}
function coinWhy(p,id){const m=p.m;return({weight:()=>`Masa ${fmt(COIN_KG[m.weight].toFixed(2))} g zamiast 25,00 g – inny stop lub rdzeń.`,diam:()=>`Średnica ${COIN_D[m.diam]} mm zamiast 37,0 mm.`,
 xrf:()=>({snpb:'Stop cynowo-ołowiowy pod powłoką srebra.',cuni:'Miedzionikiel zamiast srebra próby 900.',plated:'Stal pod cienką powłoką srebra.',electro:'Miedź i ołów pod powłoką – galwanoplastyka.'})[m.xrf],
 magnet:()=>'Przyciąganie przez magnes – stalowy rdzeń.',edge:()=>({irregular:'Nierówne ząbki – ręcznie wykonany rant.',cast:'Szew formy na rancie – odlew.',seam:'Linia łączenia połówek – galwanoplastyka.'})[m.edge],
 strike:()=>m.strike==='cast'?'Wżery i pęcherzyki – moneta odlana, nie bita.':'Ziarnista struktura bez linii płynięcia – galwanoplastyka.',
 wear:()=>m.wear==='tumbled'?'Równomierne rysy przy ostrych szczytach – sztuczne postarzanie.':'Miękki detal w całej monecie – odlew.'}[id]||(()=>''))()}
registerKind({id:'coin',label:'Weryfikacja monet',noun:'Moneta',W:640,H:320,wcm:8.45,hcm:4.2,tilt:false,focusLabel:'Awers',
 defs:COIN_DEF,sets:COIN_SET,profiles:COIN_PROF,newGame(r){kindBatch(this,r)},view:coinView,live:coinLive,area:coinArea,obs:coinObs,why:coinWhy,
 shadow(p){for(const[cx,cy]of[CO.A,CO.B]){ctx.beginPath();ctx.arc(p.x+cx+6,p.y+cy+8,CO.R,0,7);ctx.fill()}},
 focus:p=>[p.x+10,p.y+10,300,300],
 probe(p,lx,ly,id){if(Math.hypot(lx-CO.A[0],ly-CO.A[1])>CO.R&&Math.hypot(lx-CO.B[0],ly-CO.B[1])>CO.R){toast('Kliknij powierzchnię monety.');return}
  if(id==='xrf'){if(vw.z<2)return toast('Przybliż do ×2, aby przyłożyć głowicę XRF.');note(p,'xrf',coinObs(p,'xrf'));toast(`Moneta ${p.letter}: ${coinObs(p,'xrf')}`)}
  if(id==='magnet'&&note(p,'magnet',coinObs(p,'magnet')))toast(`Moneta ${p.letter}: ${coinObs(p,'magnet')}`)},
 panel(p,id){if((id==='xrf'||id==='magnet')&&p.notes[id])return`<div class="obs"><b>Odczyt:</b> ${[].concat(p.notes[id]).join('<br>')}</div>`},
 intro:'Na stole leży 5 srebrnych monet 5 talarów z 1867 r. (moneta fikcyjna) – awers i rewers każdej. Część jest prawdziwa, część fałszywa. Zważ, zmierz, zbadaj stop i magnes, obejrzyj rant, pole pod mikroskopem i zużycie wypukłości. Oznacz każdą monetę i zakończ ekspertyzę.',
 caseText:()=>'Weryfikacja monet: 5 talarów Królestwa Arkadii, 1867 (moneta fikcyjna). Katalog: srebro próby 900, 25,00 g, Ø 37,0 mm, rant ząbkowany.'});
Object.assign(AREA,{coin:'środek widoku na monecie',portrait:'środek widoku na portrecie (awers)',edge:'środek widoku na rozwinięciu rantu'});
VIEWNAME.edge='rozwinięcie rantu';
