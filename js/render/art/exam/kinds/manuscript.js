"use strict";
/* =====================================================================
   RĘKOPIS – list Jana z Wierzbna do rady miasta Arkadii, 1712 (dokument fikcyjny)
   Katalog: papier czerpany (znak wodny – tarcza z trzema wieżami), atrament żelazowo-galasowy,
   pismo gęsim piórem, pieczęć lakowa z herbem, korozja atramentu widoczna na odwrociu.
   ===================================================================== */
const MS={strokes:[],lines:0,seal:[360,600,34]};
const MS_PROF={
 modernInk:{name:'Kopia na starym papierze pisana współczesnym atramentem',core:['ink','verso','ductus'],opt:['seal'],modes:{ink:'dye',verso:'none',ductus:'tremor',seal:'modern'}},
 tea:{name:'Kopia na nowym papierze postarzanym herbatą',core:['paper','verso','seal'],opt:['ink','ductus'],modes:{paper:'wove',verso:'tea',seal:'modern',ink:'dye',ductus:'tremor'}},
 facsimile:{name:'Faksymile drukowane',core:['ink','ductus','paper','verso'],opt:['seal'],modes:{ink:'toner',ductus:'print',paper:'wove',verso:'clean',seal:'modern'}},
 addition:{name:'Dokument z epoki z dopisanym fragmentem i nową pieczęcią',core:['seal','ink','ductus'],opt:[],modes:{seal:'modern',ink:'mixed',ductus:'mixed'}},
};
const MS_DEF={
 ink:{name:'Atrament (XRF)',view:'normal',probe:'ink',gate:{z:4},hint:'Przy zoomie ≥ ×4 kliknij linię tekstu. Atrament żelazowo-galasowy zawiera żelazo i siarkę (Fe, S) i przy dużym zoomie ma brązową obwódkę. Bada się różne wiersze – dopisek może być innym atramentem.'},
 paper:{name:'Papier pod światło',view:'trans',gate:{z:3,area:'sheet'},hint:'Pod światło przybliż papier (≥ ×3). Papier czerpany ma gęste linie żeberkowe, rzadsze linie sita (co ok. 2,5 cm) i znak wodny. Papier maszynowy (welinowy) jest jednolicie chmurkowaty.'},
 ductus:{name:'Pismo i ductus',view:'normal',gate:{z:4,area:'text'},hint:'Przybliż tekst (≥ ×4). Gęsie pióro daje grube kreski w dół i cienkie w górę, a atrament słabnie aż do kolejnego zanurzenia pióra. Drżąca, równa linia z tępymi początkami to kopiowanie; równa grubość bez zmian nasycenia – druk.'},
 seal:{name:'Pieczęć lakowa',view:'normal',gate:{z:3,area:'seal'},hint:'Przybliż pieczęć (≥ ×3). Dawny lak jest matowy, ciemnoczerwony, z drobnymi spękaniami i ostrym odciskiem tłoka. Współczesny lak jest jaskrawy, błyszczący, z pęcherzykami i miękkim odciskiem.'},
 verso:{name:'Odwrocie (korozja atramentu)',view:'back',gate:{z:2,area:'text'},hint:'Atrament żelazowo-galasowy z czasem koroduje papier: na odwrociu widać brązowe obwódki wzdłuż liter, a miejscami przeżarte dziurki. Herbata daje równe plamy bez korozji.'},
};
const MS_SET=[['1. Materiały',['ink','paper','seal']],['2. Pismo i starzenie',['ductus','verso']]];
function msGen(r){MS.strokes=[];let li=0;
 for(let y=120;y<H-170;y+=25,li++){let x=52+(li===0?60:r()*14),words=0;const big=li===0?1.35:1;
  while(true){const ww=(22+r()*58)*big;if(x+ww>W-50)break;const pts=[],letters=Math.max(2,Math.round(ww/7)),amp=[];
   for(let k=0;k<letters;k++)amp.push(r()<0.22?-15:r()<0.15?9:0);
   const n=Math.ceil(ww/1.6);for(let i=0;i<=n;i++){const t=i/n,X=x+t*ww,k=Math.min(letters-1,Math.floor(t*letters)),ph=t*letters*Math.PI*2;
    let Y=y-(0.5+0.5*Math.sin(ph-1.2))*7*big;if(amp[k]<0&&Math.sin(ph-1.2)>0.6)Y+=amp[k]*big*Math.sin(ph-1.2);if(amp[k]>0&&Math.sin(ph-1.2)<-0.6)Y+=amp[k]*big*-Math.sin(ph-1.2);pts.push([X+Math.sin(ph)*1.6,Y])}
   MS.strokes.push({li,pts,dip:words%3===0});x+=ww+7+r()*6;words++}}
 MS.lines=li;const sp=[];for(let i=0;i<=80;i++){const t=i/80;sp.push([W-230+t*150,H-185-Math.sin(t*9)*10*(1-t)-t*6+Math.sin(t*30)*3])}MS.strokes.push({li:li,pts:sp,dip:true})}
const msInk=(p,li)=>{const m=p.t.ink?p.m.ink:'iron';return m==='mixed'?(li>=MS.lines-3?'dye':'iron'):m};
const msDuct=(p,li)=>{const m=p.t.ductus?p.m.ductus:'dip';return m==='mixed'?(li>=MS.lines-3?'tremor':'dip'):m};
const MS_COL={iron:[52,34,20],dye:[24,30,56],toner:[26,26,28]};
function msStrokes(x,p,o={}){const r=rng(p.seed+41);let load=1;
 for(const s of MS.strokes){const ink=msInk(p,s.li),du=msDuct(p,s.li),c=MS_COL[ink],pts=s.pts;if(s.dip)load=1;
  for(let i=1;i<pts.length;i++){let[a,b]=[pts[i-1],pts[i]];if(du==='tremor'){if(r()<0.012)continue;a=[a[0]+(r()-.5)*0.7,a[1]+(r()-.5)*0.7]}
   let w=1.3,al=0.92;if(du==='dip'){const dy=b[1]-a[1],len=Math.hypot(b[0]-a[0],dy)||1;w=0.7+1.9*Math.max(0,dy/len);load=Math.max(0.35,load-0.0018);al=0.45+0.5*load;w*=0.75+0.4*load}
   else if(du==='print'){w=1.25;al=0.95}
   const lw=w*(o.wide||1);x.strokeStyle=o.col||`rgba(${c[0]},${c[1]},${c[2]},${al*(o.alpha||1)})`;x.lineWidth=lw;x.lineCap='round';x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.stroke()}
  if(du==='tremor'&&!o.col&&!o.alpha){x.fillStyle=`rgba(${c},.9)`;x.beginPath();x.arc(pts[0][0],pts[0][1],1.1,0,7);x.fill()}}}
function msPaper(x,p,front){const r=rng(p.seed+3),wove=p.t.paper&&p.m.paper==='wove',tea=p.t.verso&&p.m.verso==='tea';
 x.fillStyle=wove?'#efe6cc':'#e8dab8';x.fillRect(0,0,W,H);
 x.fillStyle=rad(W/2,H/2,H*0.2,H*0.75,[[0,'rgba(255,250,235,0)'],[1,'rgba(150,110,60,.35)']])(x);x.fillRect(0,0,W,H);
 if(!wove)for(let i=0;i<40;i++){x.fillStyle=`rgba(130,80,35,${.08+r()*.15})`;x.beginPath();x.arc(r()*W,r()*H,1+r()*4,0,7);x.fill()}
 if(tea)for(let i=0;i<18;i++){x.fillStyle=`rgba(140,95,40,${.08+r()*.12})`;x.beginPath();x.ellipse(r()*W,r()*H,40+r()*90,30+r()*70,r()*3,0,7);x.fill()}
 for(const fy of[H/3,2*H/3]){x.fillStyle='rgba(120,90,50,.18)';x.fillRect(0,fy-1,W,1.2);x.fillStyle='rgba(255,250,235,.35)';x.fillRect(0,fy+0.4,W,1)}}
function msSeal(x,p){const[cx,cy,R]=MS.seal,mod=p.t.seal&&p.m.seal==='modern',r=rng(p.seed+7);
 x.fillStyle=mod?'#c9222c':'#7f1d17';x.beginPath();for(let i=0;i<=24;i++){const a=i/24*6.283,rr=R*(1+(r()-.5)*0.18);i?x.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr):x.moveTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr)}x.fill();
 x.save();if(mod)x.filter='blur(0.7px)';x.strokeStyle=mod?'rgba(120,10,15,.55)':'rgba(40,6,4,.85)';x.lineWidth=1.2;x.beginPath();x.arc(cx,cy,R*0.72,0,7);x.stroke();
 x.beginPath();x.moveTo(cx-12,cy-12);x.lineTo(cx+12,cy-12);x.lineTo(cx+12,cy+4);x.quadraticCurveTo(cx+10,cy+16,cx,cy+20);x.quadraticCurveTo(cx-10,cy+16,cx-12,cy+4);x.closePath();x.stroke();
 for(const dx of[-7,0,7]){x.strokeRect(cx+dx-2,cy-8-(dx?0:3),4,8+(dx?0:3))}x.restore();
 if(!mod){x.strokeStyle='rgba(30,4,2,.6)';x.lineWidth=0.4;for(let i=0;i<10;i++){let X=cx+(r()-.5)*R*1.4,Y=cy+(r()-.5)*R*1.4;x.beginPath();x.moveTo(X,Y);for(let k=0;k<3;k++){X+=(r()-.5)*10;Y+=(r()-.5)*10;x.lineTo(X,Y)}x.stroke()}}
 else{x.fillStyle='rgba(255,255,255,.45)';x.beginPath();x.ellipse(cx-R*0.35,cy-R*0.4,R*0.35,R*0.15,-0.5,0,7);x.fill();x.fillStyle='rgba(90,0,5,.5)';for(let i=0;i<7;i++){x.beginPath();x.arc(cx+(r()-.5)*R*1.3,cy+(r()-.5)*R*1.3,0.8+r()*1.4,0,7);x.fill()}}}
function msView(p,v){
 if(v==='normal')return kView(p,v,x=>{msPaper(x,p,true);x.fillStyle='rgba(60,40,20,.75)';x.font='italic 11px Georgia';x.fillText('Arkadia, d. 14 maja 1712',W-190,78);msStrokes(x,p);msSeal(x,p)});
 if(v==='trans')return kView(p,v,x=>{const r=rng(p.seed+9),wove=p.t.paper&&p.m.paper==='wove';x.fillStyle='#e9d9a6';x.fillRect(0,0,W,H);
  if(wove){for(let i=0;i<900;i++){x.fillStyle=`rgba(${r()<.5?120:255},${r()<.5?95:245},60,${.04+r()*.05})`;x.beginPath();x.arc(r()*W,r()*H,3+r()*9,0,7);x.fill()}}
  else{x.fillStyle='rgba(110,85,45,.09)';for(let y=0;y<H;y+=2.4)x.fillRect(0,y,W,0.7);x.fillStyle='rgba(95,70,40,.3)';for(let X=24;X<W;X+=62)x.fillRect(X,0,1.3,H);
   x.strokeStyle='rgba(255,252,235,.75)';x.lineWidth=2.4;const cx=W/2,cy=H*0.42;x.beginPath();x.moveTo(cx-40,cy-46);x.lineTo(cx+40,cy-46);x.lineTo(cx+40,cy+10);x.quadraticCurveTo(cx+36,cy+46,cx,cy+60);x.quadraticCurveTo(cx-36,cy+46,cx-40,cy+10);x.closePath();x.stroke();
   for(const dx of[-22,0,22]){x.strokeRect(cx+dx-6,cy-30-(dx?0:8),12,30+(dx?0:8))}x.font='bold 18px Georgia';x.fillStyle='rgba(255,252,235,.7)';x.fillText('I W',cx-16,cy+96)}
  msStrokes(x,p,{alpha:.45})});
 if(v==='back')return kView(p,v,x=>{const r=rng(p.seed+11),vm=p.t.verso?p.m.verso:'corr';msPaper(x,p,false);if(vm==='clean'){x.fillStyle='rgba(250,246,235,.6)';x.fillRect(0,0,W,H)}
  x.save();x.translate(W,0);x.scale(-1,1);
  if(vm!=='clean')msStrokes(x,p,{alpha:vm==='tea'||vm==='none'?.08:.2});
  if(vm==='corr'){x.save();x.filter='blur(1.2px)';msStrokes(x,{...p,t:{},m:{}},{col:'rgba(125,80,30,.3)',wide:3.2});x.restore();
   for(const s of MS.strokes){if(r()<0.18&&msInk(p,s.li)==='iron'){const q=s.pts[Math.floor(r()*s.pts.length)];x.fillStyle='#1c130a';x.beginPath();x.ellipse(q[0],q[1],0.8+r()*1.2,0.6+r(),r()*3,0,7);x.fill()}}}
  x.restore()});
 return msView(p,'normal')}
function msLive(p){if(vw.z<5)return;const V=viewportWorld();if(p.x>V.x1||p.x+W<V.x0||p.y>V.y1||p.y+H<V.y0)return;
 ctx.save();ctx.beginPath();ctx.rect(p.x,p.y,W,H);ctx.clip();ctx.translate(p.x,p.y);const r=rng(p.seed+13);
 for(const s of MS.strokes){const ink=msInk(p,s.li);if(ink==='iron'){ctx.save();ctx.globalAlpha=1;msStrokesOne(s,p,'rgba(135,88,35,.22)',2.8);ctx.restore()}}
 msStrokes(ctx,p);
 for(const s of MS.strokes)if(msInk(p,s.li)==='toner')for(const q of s.pts)if(r()<0.5){ctx.fillStyle='rgba(20,20,22,.6)';ctx.fillRect(q[0]+(r()-.5)*2.4,q[1]+(r()-.5)*2.4,0.25,0.25)}
 ctx.restore()}
function msStrokesOne(s,p,col,wide){ctx.strokeStyle=col;ctx.lineCap='round';ctx.lineWidth=1.5*wide;ctx.beginPath();s.pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.stroke()}
function msArea(p,a,v){const lx=v.cx-p.x,ly=v.cy-p.y;if(lx<0||lx>W||ly<0||ly>H)return false;
 if(a==='sheet')return true;if(a==='text')return lx>45&&lx<W-45&&ly>95&&ly<H-160;if(a==='seal')return Math.hypot(lx-MS.seal[0],ly-MS.seal[1])<MS.seal[2]+18;return false}
const MS_INK={iron:'Fe, S, K wykryte – atrament żelazowo-galasowy.',dye:'Brak Fe i S; C, N, O – atrament z barwnikami syntetycznymi.',toner:'C, Si i polimer, brak Fe i S – toner drukarki.'};
function msObs(p,id){const t=p.t,m=p.m;switch(id){
 case'paper':return t.paper?'Papier jednolicie chmurkowaty, bez linii żeberkowych i sita, bez znaku wodnego – papier maszynowy (welinowy).':'Gęste linie żeberkowe, linie sita co ok. 2,5 cm i znak wodny: tarcza z trzema wieżami oraz kontrmarka „I W”.';
 case'ductus':return{dip:'Kreski w dół grube, w górę cienkie; nasycenie atramentu słabnie i wraca po zanurzeniu pióra – płynne pismo gęsim piórem.',tremor:'Linia drżąca, równej grubości, tępe początki kresek i przerwy – pismo kopiowane powoli.',print:'Kreska równej grubości i nasycenia w całym tekście – brak śladów pióra.',mixed:'Główny tekst pisany płynnie gęsim piórem, ale ostatnie trzy wiersze drżącą, równą linią.'}[t.ductus?m.ductus:'dip'];
 case'seal':return t.seal?'Lak jaskrawoczerwony, błyszczący, z pęcherzykami; odcisk herbu miękki i rozmyty.':'Lak ciemnoczerwony, matowy, z drobnymi spękaniami; ostry odcisk herbu (tarcza z trzema wieżami).';
 case'verso':return{corr:'Na odwrociu brązowe obwódki wzdłuż liter i miejscami przeżarte dziurki – korozja atramentu żelazowo-galasowego.',none:'Tekst lekko przebija, ale bez brązowych obwódek i bez przeżarć.',tea:'Równe, rozlane brązowe plamy na całym arkuszu, brak korozji wzdłuż liter.',clean:'Odwrocie czyste – tekst w ogóle nie przebija.'}[t.verso?m.verso:'corr'];
 case'ink':return MS_INK.iron}}
function msWhy(p,id){const m=p.m;return({ink:()=>({dye:'Atrament z barwnikami syntetycznymi zamiast żelazowo-galasowego.',toner:'Toner – tekst wydrukowany.',mixed:'Ostatnie wiersze innym, współczesnym atramentem – dopisek.'})[m.ink],
 paper:()=>'Papier maszynowy zamiast czerpanego – brak linii sita i znaku wodnego.',ductus:()=>({tremor:'Drżące, równe pismo – kopiowanie.',print:'Brak śladów pióra – druk.',mixed:'Dopisek innym ductusem w ostatnich wierszach.'})[m.ductus],
 seal:()=>'Współczesny lak – błyszczący, z pęcherzykami, miękki odcisk.',verso:()=>({none:'Brak korozji atramentu na odwrociu – atrament nie jest żelazowo-galasowy.',tea:'Postarzanie herbatą zamiast naturalnej korozji.',clean:'Tekst nie przebija – wydruk jednostronny.'})[m.verso]}[id]||(()=>''))()}
registerKind({id:'manuscript',label:'Weryfikacja rękopisów',noun:'Rękopis',W:520,H:680,wcm:21,hcm:27.5,tilt:false,focusLabel:'Pieczęć',
 defs:MS_DEF,sets:MS_SET,profiles:MS_PROF,newGame(r){kindBatch(this,r);msGen(rng((r()*1e9)|0))},view:msView,live:msLive,area:msArea,obs:msObs,why:msWhy,
 focus:p=>[p.x+MS.seal[0]-60,p.y+MS.seal[1]-50,120,100],
 probe(p,lx,ly,id){if(id!=='ink')return;if(vw.z<4)return toast('Przybliż do ×4, aby przyłożyć głowicę XRF do linii tekstu.');
  const s=MS.strokes.find(s=>s.pts.some(q=>Math.hypot(q[0]-lx,q[1]-ly)<6));if(!s)return toast('Kliknij dokładnie w linię tekstu.');
  const txt=`wiersz ${s.li+1}: ${MS_INK[msInk(p,s.li)]}`;note(p,'ink',txt);toast(`Rękopis ${p.letter}, ${txt}`)},
 panel(p,id){if(id==='ink'&&p.notes.ink)return`<div class="obs"><b>Odczyty:</b><br>${[].concat(p.notes.ink).join('<br>')}</div>`},
 intro:'Na stole leży 5 egzemplarzy listu z 1712 r. (dokument fikcyjny). Część to oryginały, część kopie albo przeróbki. Zbadaj atrament w różnych wierszach, papier pod światło, ductus pisma, pieczęć lakową i odwrocie. Oznacz każdy rękopis i zakończ ekspertyzę.',
 caseText:()=>'Weryfikacja rękopisów: list Jana z Wierzbna do rady miasta Arkadii, 1712 (fikcyjny). Katalog: papier czerpany ze znakiem wodnym, atrament żelazowo-galasowy, gęsie pióro, pieczęć lakowa.'});
Object.assign(AREA,{sheet:'środek widoku na arkuszu',text:'środek widoku na tekście',seal:'środek widoku na pieczęci'});
