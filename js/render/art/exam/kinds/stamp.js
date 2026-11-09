"use strict";
/* =====================================================================
   ZNACZEK – Poczta Arkadii 1898, 10 halerzy, z przedrukiem „5 hal. 1899” (fikcyjny)
   Katalog: ząbkowanie 12½, znak wodny korona, druk typograficzny, guma żółtawa, przedruk typograficzny.
   ===================================================================== */
const STAMP_PROF={
 facsimile:{name:'Współczesne faksymile (druk cyfrowy)',core:['print','wm','perf','gum'],opt:['overprint'],modes:{print:'inkjet',wm:'none',perf:'p13',gum:'modern',overprint:'printed'}},
 regum:{name:'Oryginał z dorobioną gumą i poprawionym ząbkowaniem',core:['gum','perf'],opt:[],modes:{gum:'regum',perf:'reperf'}},
 forgedOver:{name:'Prawdziwy znaczek z fałszywym przedrukiem',core:['overprint'],opt:['gum'],modes:{overprint:'forged',gum:'regum'}},
 litho:{name:'Fałszerstwo z epoki (litografia)',core:['print','wm','perf'],opt:['overprint'],modes:{print:'litho',wm:'none',perf:'p11',overprint:'litho'}},
};
const STAMP_DEF={
 perf:{name:'Ząbkowanie (miarka)',view:'normal',gate:{z:2.5,area:'perf'},hint:'Katalog: ząbkowanie 12½ – tyle ząbków przypada na 2 cm. Przybliż brzeg znaczka (≥ ×2,5): nad górnym brzegiem pojawi się miarka 2 cm. Policz ząbki i sprawdź, czy otwory są równe.'},
 wm:{name:'Znak wodny (kąpiel)',view:'wmbath',gate:{z:1.5,area:'design'},hint:'W kąpieli w płynie do znaków wodnych papier ciemnieje, a znak wodny staje się widoczny. Katalog: powtarzający się wzór korony.'},
 print:{name:'Metoda druku (mikroskop)',view:'normal',gate:{z:6,area:'design'},hint:'Przy zoomie ≥ ×6: druk typograficzny wyciska farbę na brzegi linii (ciemniejsze obwódki). Litografia jest płaska, bez obwódek. Druk cyfrowy to raster kolorowych kropek.'},
 gum:{name:'Guma (odwrocie)',view:'back',gate:{z:3,area:'perf'},hint:'Katalog: guma żółtawa, matowa, z drobnymi spękaniami. Przybliż ząbki na odwrociu (≥ ×3): dorobiona guma jest błyszcząca i wchodzi na czubki ząbków.'},
 overprint:{name:'Przedruk',view:'normal',gate:{z:4,area:'over'},hint:'Katalog: przedruk „5 hal. 1899” drukiem typograficznym, czarną farbą, krojem szeryfowym. Przybliż (≥ ×4): oryginalny przedruk jest wciśnięty w papier, fałszywy leży na powierzchni, ma inny krój albo jest wydrukowany razem ze znaczkiem.'},
};
const STAMP_SET=[['1. Papier',['perf','wm','gum']],['2. Druk',['print','overprint']]];
const STAMP_G={ok:12.5,p13:13,p11:11,reperf:13};
const stampMode=(p,id,def)=>p.t[id]?p.m[id]:def;
function stampHoles(p,cb){const g=STAMP_G[stampMode(p,'perf','ok')],sp=240/g,r=rng(p.seed+29),rag=stampMode(p,'perf','ok')==='reperf';
 for(const[len,fn]of[[W,i=>[i,0]],[W,i=>[i,H]],[H,i=>[0,i]],[H,i=>[W,i]]]){const n=Math.floor(len/sp),off=(len-n*sp)/2;for(let k=0;k<=n;k++){const[x,y]=fn(off+k*sp+(rag?(r()-.5)*sp*0.25:0));cb(x,y,rag?4.2+r()*2.2:5.2)}}}
function stampCut(x,p){x.save();x.globalCompositeOperation='destination-out';stampHoles(p,(cx,cy,rr)=>{x.beginPath();x.arc(cx,cy,rr,0,7);x.fill()});x.restore()}
function stampDesign(x,p,style){const ink='#b8263a';x.strokeStyle=ink;x.fillStyle=ink;
 const sq=(fn,lw)=>{if(style==='typo'){x.save();x.strokeStyle='rgba(90,10,25,.55)';x.lineWidth=lw+0.9;fn();x.restore()}x.lineWidth=lw;fn()};
 sq(()=>x.strokeRect(26,26,W-52,H-52),3);sq(()=>x.strokeRect(34,34,W-68,H-68),1);
 x.lineWidth=0.6;for(let y=40;y<H-40;y+=3.2){x.beginPath();x.moveTo(40,y);x.lineTo(W-40,y);x.globalAlpha=.35;x.stroke();x.globalAlpha=1}
 x.fillStyle='#f6efe0';x.beginPath();x.ellipse(W/2,H*0.47,78,96,0,0,7);x.fill();
 sq(()=>{x.beginPath();x.ellipse(W/2,H*0.47,78,96,0,0,7);x.stroke()},2.2);
 x.fillStyle=ink;const cx=W/2,cy=H*0.42;x.beginPath();x.moveTo(cx-40,cy+20);x.lineTo(cx-46,cy-18);x.lineTo(cx-22,cy);x.lineTo(cx,cy-30);x.lineTo(cx+22,cy);x.lineTo(cx+46,cy-18);x.lineTo(cx+40,cy+20);x.closePath();
 if(style==='typo'){x.save();x.strokeStyle='rgba(90,10,25,.55)';x.lineWidth=1.6;x.stroke();x.restore()}x.fill();
 x.fillRect(cx-42,cy+22,84,9);for(const dx of[-46,0,46]){x.beginPath();x.arc(cx+dx,cy+(dx?-20:-33),4.5,0,7);x.fill()}
 x.font='bold 46px Georgia,serif';x.textAlign='center';x.fillText('10',cx,cy+82);
 x.font='bold 15px Georgia,serif';x.fillText('POCZTA ARKADII',cx,56);x.fillText('10 HALERZY',cx,H-44);x.textAlign='left'}
function stampOverprint(x,p,mode,live){const fx=mode==='forged'?'bold 33px Arial,Helvetica,sans-serif':'bold 34px Georgia,serif',dx=mode==='forged'?5:0,dy=mode==='forged'?-3:0;
 x.save();x.translate(W/2+dx,212+dy);x.textAlign='center';
 const draw=(c,ox,oy)=>{x.fillStyle=c;x.font=fx;x.fillText('5 hal.',ox,oy);x.font=fx.replace(/3[34]px/,'18px');x.fillText('1899',ox,oy+24);x.fillRect(-70+ox,oy+32,140,4)};
 if(mode==='ok'&&live)draw('rgba(0,0,0,.35)',0.5,0.5);
 draw(mode==='litho'?'rgba(40,38,38,.85)':'#141212',0,0);
 if(mode==='forged'&&live){x.globalAlpha=.35;draw('rgba(255,255,255,.9)',-0.4,-0.5);x.globalAlpha=1}
 x.restore()}
function stampView(p,v){
 if(v==='normal')return kView(p,v,(x,c)=>{x.fillStyle='#f3ecdc';x.fillRect(0,0,W,H);x.fillStyle='rgba(190,160,100,.12)';x.fillRect(0,0,W,H);
  const pm=stampMode(p,'print','typo');stampDesign(x,p,pm==='typo'?'typo':'flat');stampOverprint(x,p,stampMode(p,'overprint','ok'),false);
  if(pm==='inkjet'||pm==='litho'){const t=mk(IW,IH),tx=t.getContext('2d');tx.filter=pm==='inkjet'?'blur(1.6px)':'blur(0.6px)';tx.drawImage(c,0,0);x.save();x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,IW,IH);x.drawImage(t,0,0);x.restore()}
  stampCut(x,p)});
 if(v==='back')return kView(p,v,x=>{const gm=stampMode(p,'gum','ok'),r=rng(p.seed+31);x.fillStyle='#efe7d4';x.fillRect(0,0,W,H);
  x.save();x.globalAlpha=.08;x.translate(W,0);x.scale(-1,1);stampDesign(x,p,'flat');x.restore();
  if(gm==='ok'){x.fillStyle='rgba(215,180,95,.38)';x.fillRect(14,14,W-28,H-28);x.strokeStyle='rgba(120,90,40,.35)';x.lineWidth=0.5;
   for(let i=0;i<140;i++){let X=20+r()*(W-40),Y=20+r()*(H-40);x.beginPath();x.moveTo(X,Y);for(let k=0;k<4;k++){X+=(r()-.5)*24;Y+=(r()-.5)*24;x.lineTo(X,Y)}x.stroke()}}
  else{x.fillStyle=gm==='modern'?'rgba(255,255,255,.55)':'rgba(240,228,190,.5)';x.fillRect(0,0,W,H);x.fillStyle=lin(0,0,W,H,[[0,'rgba(255,255,255,0)'],[.45,'rgba(255,255,255,.45)'],[.55,'rgba(255,255,255,0)']])(x);x.fillRect(0,0,W,H);
   x.fillStyle=gm==='modern'?'rgba(255,255,255,.4)':'rgba(235,215,160,.55)';stampHoles(p,(cx,cy,rr)=>{x.beginPath();x.arc(cx,cy,rr+3.5,0,7);x.fill()})}
  stampCut(x,p)});
 if(v==='wmbath')return kView(p,v,x=>{x.fillStyle='#2b1d22';x.fillRect(0,0,W,H);x.globalAlpha=.18;stampDesign(x,p,'flat');x.globalAlpha=1;
  if(stampMode(p,'wm','ok')==='ok'){x.strokeStyle='rgba(0,0,0,.6)';x.lineWidth=3;for(let gy=30;gy<H;gy+=70)for(let gx=(gy/70%2)*35+20;gx<W;gx+=70){x.beginPath();x.moveTo(gx-14,gy+8);x.lineTo(gx-16,gy-6);x.lineTo(gx-7,gy+1);x.lineTo(gx,gy-10);x.lineTo(gx+7,gy+1);x.lineTo(gx+16,gy-6);x.lineTo(gx+14,gy+8);x.closePath();x.stroke()}}
  stampCut(x,p)});
 return stampView(p,'normal')}
function stampLive(p){const V=viewportWorld();if(p.x>V.x1||p.x+W<V.x0||p.y>V.y1||p.y+H<V.y0)return;
 if(tool==='perf'&&vw.z>=2.5){ctx.save();ctx.translate(p.x+30,p.y-26);ctx.fillStyle='rgba(250,240,200,.92)';ctx.fillRect(0,0,240,18);ctx.fillStyle='#222';for(let i=0;i<=20;i++)ctx.fillRect(i*12,0,0.6,i%10?6:12);ctx.font='7px system-ui';ctx.fillText('0',1,17);ctx.fillText('1 cm',112,17);ctx.fillText('2 cm',222,17);ctx.restore()}
 if(vw.z<4)return;ctx.save();ctx.beginPath();ctx.rect(p.x,p.y,W,H);ctx.clip();const pm=stampMode(p,'print','typo');
 if(vw.z>=6&&pm==='inkjet'){noteDots(p,Math.max(V.x0,p.x),Math.max(V.y0,p.y),Math.min(V.x1,p.x+W),Math.min(V.y1,p.y+H))}
 else if(vw.z>=6){ctx.translate(p.x,p.y);ctx.fillStyle='#f3ecdc';ctx.fillRect(40,40,W-80,H-80);stampDesign(ctx,p,pm==='typo'?'typo':'flat');
  if(pm==='litho'){const r=rng(p.seed+5);ctx.fillStyle='rgba(120,30,40,.18)';for(let i=0;i<3000;i++)ctx.fillRect(40+r()*(W-80),40+r()*(H-80),0.25,0.25)}ctx.translate(-p.x,-p.y)}
 const om=stampMode(p,'overprint','ok');if(om!=='printed'||pm!=='inkjet'){ctx.translate(p.x,p.y);stampOverprint(ctx,p,om,true)}
 ctx.restore()}
function stampArea(p,a,v){const lx=v.cx-p.x,ly=v.cy-p.y;if(lx<0||lx>W||ly<0||ly>H)return false;
 if(a==='perf')return lx<30||lx>W-30||ly<30||ly>H-30;if(a==='design')return lx>40&&lx<W-40&&ly>40&&ly<H-40;if(a==='over')return lx>60&&lx<W-60&&ly>170&&ly<260;return false}
function stampObs(p,id){const m=k=>stampMode(p,k,'ok');switch(id){
 case'perf':return`Na 2 cm przypada ${fmt(STAMP_G[m('perf')])} ząbków.`+(m('perf')==='reperf'?' Otwory nierównej wielkości, poszarpane, rozmieszczone nieregularnie.':' Otwory równe i regularne.');
 case'wm':return m('wm')==='ok'?'W kąpieli widoczny powtarzający się wzór korony.':'W kąpieli brak jakiegokolwiek znaku wodnego.';
 case'print':return{typo:'Farba wyciśnięta na brzegi linii – ciemniejsze obwódki, lekki relief: druk typograficzny.',litho:'Farba płaska, bez obwódek i reliefu, drobne ziarno: litografia.',inkjet:'Obraz złożony z kolorowych kropek – druk cyfrowy.'}[stampMode(p,'print','typo')];
 case'gum':return{ok:'Guma żółtawa, matowa, z drobnymi spękaniami; czubki ząbków bez gumy.',regum:'Guma błyszcząca, jednolita, bez spękań, wchodzi na czubki ząbków.',modern:'Guma biała, błyszcząca, nowoczesna, aż do brzegów ząbków.'}[m('gum')];
 case'overprint':return{ok:'Przedruk czarny, krój szeryfowy, farba wciśnięta w papier.',forged:'Przedruk innym krojem (bezszeryfowy), przesunięty, farba błyszcząca i leży na powierzchni.',litho:'Przedruk płaski, szarawy, bez wciśnięcia – litografia.',printed:'Przedruk wydrukowany razem ze znaczkiem, w tym samym rastrze.'}[m('overprint')]}}
function stampWhy(p,id){const m=p.m;return({perf:()=>m.perf==='reperf'?'Dorobione ząbkowanie – nierówne, poszarpane otwory.':`Ząbkowanie ${fmt(STAMP_G[m.perf])} zamiast 12½.`,
 wm:()=>'Brak znaku wodnego (korona).',print:()=>m.print==='litho'?'Litografia zamiast druku typograficznego.':'Druk cyfrowy – faksymile.',
 gum:()=>m.gum==='modern'?'Nowoczesna guma.':'Dorobiona guma – błyszcząca, na czubkach ząbków.',overprint:()=>({forged:'Fałszywy przedruk – inny krój i farba na powierzchni.',litho:'Przedruk litograficzny zamiast typograficznego.',printed:'Przedruk wydrukowany razem ze znaczkiem.'})[m.overprint]}[id]||(()=>''))()}
registerKind({id:'stamp',label:'Weryfikacja znaczków',noun:'Znaczek',W:300,H:360,wcm:2.5,hcm:3,tilt:false,focusLabel:'Przedruk',
 defs:STAMP_DEF,sets:STAMP_SET,profiles:STAMP_PROF,newGame(r){kindBatch(this,r)},view:stampView,live:stampLive,area:stampArea,obs:stampObs,why:stampWhy,
 focus:p=>[p.x+50,p.y+160,200,100],
 intro:'Na stole leży 5 znaczków Poczty Arkadii z przedrukiem „5 hal. 1899” (znaczek fikcyjny). Część jest prawdziwa, część fałszywa albo przerobiona. Sprawdź ząbkowanie miarką, znak wodny w kąpieli, metodę druku, gumę na odwrociu i przedruk. Oznacz każdy znaczek i zakończ ekspertyzę.',
 caseText:()=>'Weryfikacja znaczków: Poczta Arkadii 1898, 10 halerzy z przedrukiem „5 hal. 1899” (fikcyjny). Katalog: ząbkowanie 12½, znak wodny korona, druk typograficzny, guma żółtawa.'});
Object.assign(AREA,{perf:'środek widoku na brzegu z ząbkami',design:'środek widoku na rysunku znaczka',over:'środek widoku na przedruku'});
Object.assign(VIEWNAME,{wmbath:'kąpiel w płynie do znaków wodnych',back:VIEWNAME.back});
