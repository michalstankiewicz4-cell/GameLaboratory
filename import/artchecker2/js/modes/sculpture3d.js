"use strict";
/* =====================================================================
   RZEŹBY 3D
   ===================================================================== */
const SCU={name:'Stanisław Rudnicki',life:'1840–1905',title:'Popiersie Heleny',year:1888,hcm:52.0,kg:8.4};
const SPROF={
 surm:{name:'Surmoulage – odlew z formy zdjętej z oryginału',core:['dims','tool','mark'],opt:['prov','cert','seam'],mark:'blur',tool:'soft',hcm:51.2},
 cold:{name:'Odlew z żywicy z pyłem brązu (cold cast)',core:['weight','xray','xrf','uv'],opt:['tool','patina','prov'],xrf:'resin',xray:'resin',tool:'smooth'},
 modern:{name:'Współczesny odlew w brązie krzemowym',core:['xrf','patina','seam'],opt:['mark','xray','style'],xrf:'si',xray:'lost',mark:'none'},
 oldcopy:{name:'Nieautoryzowany odlew z epoki z innej odlewni',core:['mark','dims'],opt:['style','prov','cert'],mark:'other',hcm:52.9},
 papers:{name:'Odlew z podrobioną dokumentacją',core:['prov','cert'],opt:['mark','patina','xrf'],xrf:'brass',mark:'none',prov:'noCR',cert:'issuer'},
};
const DEF3={
 xrf:{name:'Analiza stopu (XRF)',probe:'xrf',gate3:{d:0.75,click:true},hint:'Podejdź blisko (≤ 75 cm) i kliknij powierzchnię rzeźby. Katalog podaje brąz cynowy. Brąz krzemowy pojawił się dopiero ok. 1927 r.; żywica z pyłem metalu to nie brąz.'},
 uv:{name:'Lampa UV',view:'uv',gate3:{d:2.5},hint:'Stary wosk konserwujący świeci słabo i równomiernie. Żywice syntetyczne fluoryzują silnie.'},
 patina:{name:'Patyna (z bliska)',gate3:{d:0.6},hint:'Naturalna patyna gromadzi zielone produkty korozji na powierzchniach poziomych i w zagłębieniach, a wypukłości (nos, broda) są wytarte do jaśniejszego metalu. Patyna chemiczna jest jednolita.'},
 weight:{name:'Waga',hint:'Porównaj masę z katalogiem (8,4 kg). Odlew z żywicy z pyłem metalu jest wielokrotnie lżejszy.'},
 dims:{name:'Pomiar (suwmiarka)',gate3:{d:1.6},hint:'Podejdź na ≤ 1,6 m – obok wybranej rzeźby pojawi się miara. Katalog: 52,0 cm. Odlew z formy zdjętej z gotowej rzeźby (surmoulage) jest mniejszy o 1–2% przez skurcz metalu.'},
 style:{name:'Porównanie z fotografią katalogową',gate3:{d:1.1,az:'front'},hint:'Stań na wprost rzeźby (≤ 1,1 m). Porównaj proporcje i ułożenie głowy z fotografią z katalogu raisonné. Kopie modelowane „z oka” mają błędy proporcji.'},
 mark:{name:'Znak odlewni i sygnatura',gate3:{d:0.5,az:'back'},hint:'Znak odlewni i sygnatura są z tyłu cokołu – obejdź rzeźbę i podejdź na ≤ 50 cm. Odlew wtórny ma rozmyty znak; inna odlewnia – inny znak; brak znaku i świeżo wyryty podpis są podejrzane.'},
 prov:{name:'Proweniencja',hint:'Prześledź historię odlewu: księgi odlewni, wystawy, katalog raisonné.'},
 cert:{name:'Certyfikat autentyczności',hint:'Sprawdź kompletność danych i wystawcę. Porównaj wysokość i masę z pomiarami.'},
 tool:{name:'Ślady obróbki (cyzelowanie)',gate3:{d:0.42},hint:'Podejdź bardzo blisko (≤ 42 cm). Ręczne cyzelowanie zostawia krótkie, nieregularne ślady narzędzi i porowatość odlewu. Surmoulage ma detal zmiękczony, żywica – gładką powierzchnię z pęcherzykami.'},
 seam:{name:'Szwy odlewnicze',gate3:{d:0.5,az:'side'},hint:'Obejrzyj rzeźbę z boku z bliska (≤ 50 cm). W starannym odlewie szwy formy są zacyzelowane; ciągły szew z boku głowy i tułowia zdradza odlew seryjny.'},
 xray:{name:'RTG',view:'xray',gate3:{d:2.5},hint:'Tradycyjny odlew piaskowy ma nierówne ścianki, resztki rdzenia i kute trzpienie. Wosk tracony ze skorupą ceramiczną daje cienkie, równe ścianki. Żywica jest jednolita i słabo pochłania promieniowanie.'},
};
const SET3=[['1. Materiał i wiek',['xrf','uv','patina','weight']],['2. Forma i sygnatura',['dims','style','mark']],['3. Proweniencja i dokumenty',['prov','cert']],['4. Obróbka i wnętrze',['tool','seam','xray']]];
const XRF={bronze:'Cu 87%, Sn 8%, Zn 3%, Pb 2% – brąz cynowy',si:'Cu 94%, Si 3,5%, Mn 1,2%, Zn 1% – brąz krzemowy',resin:'Cu 21%, Sn 2%; dominują C i O – żywica z wypełniaczem z pyłu brązu',brass:'Cu 63%, Zn 35%, Pb 2% – mosiądz'};
function obs3(q,id){const t=q.t;switch(id){
 case'uv':return q.uv==='resin'?'Silna, zielonkawa fluorescencja całej powierzchni.':'Słaba, równomierna fluorescencja warstwy wosku.';
 case'patina':return t.patina?'Jednolita brązowa patyna chemiczna – brak produktów korozji w zagłębieniach, wypukłości nie są wytarte.':'Zielone produkty korozji na powierzchniach poziomych i w zagłębieniach (pod brodą, na cokole); nos i broda wytarte do jaśniejszego metalu.';
 case'weight':return`Masa: ${fmt(q.kg.toFixed(1))} kg.`;case'dims':return`Wysokość: ${fmt(q.hcm.toFixed(1))} cm.`;
 case'style':return t.style?'Nos wyraźnie dłuższy, głowa przechylona w bok – inaczej niż na fotografii katalogowej.':'Proporcje twarzy i ułożenie głowy zgodne z fotografią katalogową.';
 case'mark':return{ok:'Ostry znak odlewni „J. BRACŁAWSKI · WARSZAWA” i sygnatura „S. Rudnicki 1888” odlane razem z cokołem.',blur:'Znak odlewni i sygnatura rozmyte, płytkie i nieco mniejsze niż na fotografii katalogowej.',other:'Znak innej odlewni: „ODLEWNIA K. SZPAKOWSKI”.',none:'Brak znaku odlewni; sygnatura cienko wyryta w gotowym odlewie – ostre, jasne krawędzie rytu.'}[q.mark];
 case'tool':return{chase:'Krótkie, nieregularne ślady cyzelowania i drobna porowatość odlewu.',soft:'Detal zmiękczony i rozmyty, ślady cyzelowania niewyraźne – jakby odbite z innej powierzchni.',smooth:'Powierzchnia gładka, bez śladów narzędzi; drobne kuliste pęcherzyki powietrza.'}[q.tool];
 case'seam':return t.seam?'Ciągły, wyraźny szew formy po obu bokach głowy, szyi i tułowia.':'Szwy formy usunięte i zacyzelowane – brak widocznych linii podziału.';
 case'xray':return{sand:'Ścianki nierównej grubości, resztki rdzenia odlewniczego, kute żelazne trzpienie.',lost:'Cienkie, równe ścianki; brak rdzenia i trzpieni.',resin:'Materiał jednolity, słabo pochłaniający promieniowanie; brak metalowej skorupy i rdzenia.'}[q.xray];
 case'prov':return!t.prov?'Ciągła historia od 1888 r.: księga zamówień odlewni, wystawa 1890, katalog raisonné nr 76.':q.m.prov==='attic'?'Brak historii przed 2025 r. – „znaleziony na strychu”; brak w katalogu raisonné.':'Historia dopiero od 1998 r.; brak w katalogu raisonné i w księgach odlewni.';
 case'cert':return!t.cert?'Certyfikat kompletny, dane zgodne z katalogiem, podpis rzeczoznawcy.':q.m.cert==='dims'?'Wysokość w certyfikacie: 49,5 cm – niezgodna z pomiarem.':'Wystawca bez uprawnień, brak materiału i daty, podpis drukowany.'}}
function why3(q,id){return({xrf:()=>({si:'Brąz krzemowy – stop wprowadzony ok. 1927 r., po dacie rzeźby.',resin:'Żywica z pyłem metalu – to nie jest odlew w brązie.',brass:'Mosiądz zamiast brązu cynowego podanego w katalogu.'})[q.xrf],
 uv:()=>'Silna fluorescencja żywicy syntetycznej.',patina:()=>'Sztuczna, chemiczna patyna – brak naturalnego starzenia.',weight:()=>'Masa kilkakrotnie mniejsza niż w katalogu – to nie jest pełny odlew z brązu.',
 dims:()=>q.hcm<52?'Wysokość mniejsza o ok. 1,5% – skurcz odlewu wtórnego (surmoulage).':'Wysokość niezgodna z katalogiem – inny model odlewniczy.',
 style:()=>'Błąd proporcji – kopia modelowana bez dostępu do oryginału.',mark:()=>({blur:'Rozmyty, mniejszy znak – odbity z oryginału razem z formą.',other:'Znak innej odlewni – nieautoryzowany odlew.',none:'Brak znaku odlewni, sygnatura dodana po odlaniu.'})[q.mark],
 tool:()=>q.tool==='soft'?'Zmiękczony detal – typowy dla odlewu z formy zdjętej z gotowej rzeźby.':'Gładka powierzchnia z pęcherzykami – odlew żywiczny.',seam:()=>'Niezacyzelowany szew – seryjny odlew współczesny.',
 xray:()=>q.xray==='lost'?'Cienkie, równe ścianki – współczesny wosk tracony ze skorupą ceramiczną.':'Brak metalu wewnątrz – odlew żywiczny.',
 prov:()=>q.m.prov==='attic'?'„Znaleziony na strychu” – brak historii.':'Historia od 1998 r., brak w katalogu i księgach odlewni.',cert:()=>q.m.cert==='dims'?'Wysokość w certyfikacie niezgodna z rzeźbą.':'Certyfikat od podmiotu bez uprawnień.'}[id]||(()=>''))()}
let T3=null,THREE_P=null;
function loadThree(){if(window.THREE)return Promise.resolve();if(THREE_P)return THREE_P;THREE_P=new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)});return THREE_P}
function newSculpt(r){const list=[{orig:true,profile:null,t:{}}];shuffle(Object.keys(SPROF),r).slice(0,4).forEach(k=>list.push({orig:false,profile:k,t:rollTells(SPROF[k],r)}));shuffle(list,r);
 P=list.map((q,i)=>{const pr=q.profile?SPROF[q.profile]:{},t=q.t,qr=rng((r()*1e9)|0);q.letter='ABCDE'[i];q.seed=(qr()*1e9)|0;q.notes={};q.samples=[];q.umark='';
  q.hcm=t.dims?pr.hcm:52.0;q.kg=t.weight?3.1:8.4+(qr()-.5)*0.12;q.xrf=t.xrf?pr.xrf:'bronze';q.patina=t.patina?'chem':'natural';q.uv=t.uv?'resin':'wax';q.tool=t.tool?pr.tool:'chase';
  q.xray=t.xray?(pr.xray||'lost'):'sand';q.mark=t.mark?(pr.mark||'none'):'ok';q.m={prov:pr.prov||pick(['attic','noCR'],qr),cert:pr.cert||pick(['dims','issuer'],qr)};q.cold=q.profile==='cold';return q})}
function texCanvas(fn,w=1024,h=1024){const c=mk(w,h);fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t}
function bumpTex(mode,seed){const r=rng(seed);return texCanvas((x,w,h)=>{x.fillStyle='#808080';x.fillRect(0,0,w,h);
 if(mode!=='smooth'){x.lineCap='round';for(let i=0;i<5200;i++){const X=r()*w,Y=r()*h,a=r()*6.28,l=4+r()*9;x.strokeStyle=r()<.5?`rgba(0,0,0,${.18+r()*.2})`:`rgba(255,255,255,${.15+r()*.2})`;x.lineWidth=1+r()*1.6;x.beginPath();x.moveTo(X,Y);x.lineTo(X+Math.cos(a)*l,Y+Math.sin(a)*l);x.stroke()}
  for(let i=0;i<1600;i++){x.fillStyle='rgba(0,0,0,.55)';x.beginPath();x.arc(r()*w,r()*h,0.6+r()*1.2,0,7);x.fill()}}
 else for(let i=0;i<520;i++){const X=r()*w,Y=r()*h,s=1+r()*2.4;x.fillStyle='rgba(0,0,0,.6)';x.beginPath();x.arc(X,Y,s,0,7);x.fill();x.strokeStyle='rgba(255,255,255,.5)';x.lineWidth=0.8;x.stroke()}
 if(mode==='soft'){const c2=mk(w,h),y=c2.getContext('2d');y.filter='blur(3.5px)';y.drawImage(x.canvas,0,0);x.clearRect(0,0,w,h);x.drawImage(c2,0,0)}})}
function patTex(seed){const r=rng(seed);return texCanvas((x,w,h)=>{x.fillStyle='#d8d8d8';x.fillRect(0,0,w,h);for(let i=0;i<900;i++){const v=170+r()*85|0;x.fillStyle=`rgba(${v},${v},${v},.25)`;x.beginPath();x.arc(r()*w,r()*h,4+r()*30,0,7);x.fill()}},512,512)}
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
function colorize(g,mode,seed){const pos=g.attributes.position,nor=g.attributes.normal,n=pos.count,col=new Float32Array(n*3);
 for(let i=0;i<n;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),ny=nor.getY(i),nz=0.5+0.5*Math.sin(x*1.7+seed)*Math.cos(y*1.3+z*0.9);let c;
  if(mode==='natural'){c=[.33,.22,.13];let gg=Math.max(0,(ny-0.5)*1.8)*(.4+nz*.6);if(y>29&&y<38&&ny<-0.25)gg=Math.max(gg,.75);c=mix(c,[.22,.44,.34],Math.min(1,gg));if(z>6.3&&y>35&&y<47)c=mix(c,[.68,.5,.26],.65)}
  else c=[.42,.26,.15].map(v=>v*(0.94+nz*0.12));col.set(c,i*3)}g.setAttribute('color',new THREE.BufferAttribute(col,3))}
const TORSO=[[8,13],[8.5,13],[12,17],[17,18.5],[22,17.5],[26,14],[29,8],[30.5,5]];
function torsoR(y){for(let i=1;i<TORSO.length;i++)if(y<=TORSO[i][0]){const a=TORSO[i-1],b=TORSO[i],t=(y-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t}return 5}
function bustGeoms(q){const V2=(p)=>p.map(a=>new THREE.Vector2(a[0],a[1])),gs=[];
 gs.push(new THREE.LatheGeometry(V2([[0.01,0],[11,0],[11,1.5],[10,2.2],[9.2,3],[9.2,6],[10,7],[10,8],[0.01,8]]),56));
 const torso=new THREE.LatheGeometry(V2([[0.01,8],...TORSO.map(a=>[a[1],a[0]]),[0.01,30.6]]),64);torso.scale(1.18,1,0.55);gs.push(torso);
 const neck=new THREE.CylinderGeometry(4.3,4.9,8,32);neck.translate(0,33.5,0);gs.push(neck);
 const hp=[],nl=q.t.style?1.45:1;
 const head=new THREE.SphereGeometry(8.6,64,48);head.scale(0.86,1.08,0.98);hp.push(head);
 const nose=new THREE.ConeGeometry(1.25,3.2*nl,16);nose.rotateX(Math.PI/2);nose.translate(0,-0.6,8.0+1.6*(nl-1));hp.push(nose);
 for(const s of[-1,1]){const e=new THREE.SphereGeometry(1.15,20,14);e.scale(1,0.55,0.45);e.translate(s*2.9,1.2,7.35);hp.push(e);
  const ear=new THREE.SphereGeometry(1.7,20,14);ear.scale(0.45,1.25,0.85);ear.translate(s*7.35,0,-0.3);hp.push(ear)}
 const lips=new THREE.SphereGeometry(1.6,20,14);lips.scale(1.2,0.45,0.5);lips.translate(0,-4,7.5);hp.push(lips);
 const chin=new THREE.SphereGeometry(2.6,24,18);chin.translate(0,-6,5.5);hp.push(chin);
 const cap=new THREE.SphereGeometry(8.95,56,28,0,Math.PI*2,0,Math.PI*0.52);cap.scale(0.88,1.1,1.0);cap.rotateX(-0.45);cap.translate(0,0.6,-0.6);hp.push(cap);
 const bun=new THREE.SphereGeometry(4.6,36,26);bun.translate(0,4.2,-8.2);hp.push(bun);
 for(let i=0;i<9;i++){const a=-1.25+i*0.31,c=new THREE.SphereGeometry(1.5,16,12);c.translate(Math.sin(a)*7.2,5.6-Math.abs(a)*1.2,Math.cos(a)*5.0);hp.push(c)}
 const m=new THREE.Matrix4().makeTranslation(0,42.5,0).multiply(new THREE.Matrix4().makeRotationZ(q.t.style?0.14:0));hp.forEach(g=>g.applyMatrix4(m));gs.push(...hp);return gs}
function seamGeo(sign){const v=[];for(let y=9;y<=29;y+=2)v.push(new THREE.Vector3(sign*(torsoR(y)+0.05),y,0));for(let y=30.5;y<=37.5;y+=1.5)v.push(new THREE.Vector3(sign*4.75,y,0));
 for(let a=-60;a<=85;a+=8){const t=a*Math.PI/180;v.push(new THREE.Vector3(sign*7.45*Math.cos(t),42.5+9.35*Math.sin(t),0))}return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v),160,0.14,6,false)}
function markTex(mode){return texCanvas((x,w,h)=>{x.clearRect(0,0,w,h);const draw=(t,y,f)=>{x.font=f;x.textAlign='center';x.fillStyle='rgba(255,226,170,.35)';x.fillText(t,w/2+2,y+3);x.fillStyle='rgba(22,13,6,.95)';x.fillText(t,w/2,y)};
 if(mode==='ok'||mode==='blur'){if(mode==='blur'){x.filter='blur(5px)';x.translate(w/2,h/2);x.scale(0.9,0.9);x.translate(-w/2,-h/2)}draw('J. BRACŁAWSKI · WARSZAWA',110,'bold 72px Georgia');draw('S. Rudnicki 1888',220,'italic 70px Georgia')}
 if(mode==='other'){draw('ODLEWNIA K. SZPAKOWSKI',110,'bold 70px Georgia');draw('S. Rudnicki 1888',220,'italic 70px Georgia')}
 if(mode==='none'){x.font='italic 62px Georgia';x.textAlign='center';x.strokeStyle='rgba(235,220,190,.95)';x.lineWidth=2.2;x.strokeText('S. Rudnicki 1888',w/2,180)}},1024,280)}
function spriteText(lines,w,h,bg){const c=mk(w,h),x=c.getContext('2d');if(bg){x.fillStyle=bg;x.beginPath();x.roundRect?x.roundRect(4,4,w-8,h-8,18):x.rect(4,4,w-8,h-8);x.fill()}
 x.textAlign='center';lines.forEach(([t,f,col,y])=>{x.font=f;x.fillStyle=col;x.fillText(t,w/2,y)});const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,transparent:true}));return s}
function buildBust(q,i,forPhoto){const grp=new THREE.Group(),gs=bustGeoms(q),mode=q.patina,seed=q.seed%1000;gs.forEach(g=>colorize(g,mode,seed));
 const bt=bumpTex(q.tool,q.seed),pt=patTex(q.seed+1);bt.repeat.set(7,7);pt.repeat.set(2,2);
 const mat=new THREE.MeshStandardMaterial({vertexColors:true,map:pt,bumpMap:bt,bumpScale:0.012,metalness:q.cold?0.45:0.82,roughness:q.cold?0.6:0.46});
 const uvMat=new THREE.MeshStandardMaterial({color:0x0c0812,emissive:q.uv==='resin'?0x4f9a3c:0x23301f,roughness:.9,metalness:0});
 const xMat=new THREE.MeshBasicMaterial({color:q.xray==='resin'?0x6a8a70:0xa8c4dc,transparent:true,opacity:q.xray==='resin'?0.05:0.08,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
 const outer=[];gs.forEach(g=>{const m=new THREE.Mesh(g,mat);m.userData.q=q;outer.push(m);grp.add(m)});
 if(q.t.seam)for(const s of[-1,1]){const m=new THREE.Mesh(seamGeo(s),mat);m.userData.q=q;outer.push(m);grp.add(m)}
 const decal=new THREE.Mesh(new THREE.PlaneGeometry(9.5,2.6),new THREE.MeshStandardMaterial({map:markTex(q.mark),transparent:true,metalness:.5,roughness:.6,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
 decal.position.set(0,4.6,-9.32);decal.rotation.y=Math.PI;grp.add(decal);
 const inner=new THREE.Group();inner.visible=false;
 if(q.xray!=='resin'){const im=new THREE.MeshBasicMaterial({color:0x9fb4c8,transparent:true,opacity:.07,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  bustGeoms(q).forEach(g=>{const m=new THREE.Mesh(g,im);if(q.xray==='sand'){m.scale.set(0.84,0.96,0.84);m.position.set(0.5,0.7,0.4)}else m.scale.set(0.94,0.985,0.94);inner.add(m)});
  if(q.xray==='sand'){const pm=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false});
   [[42,'x'],[42,'z'],[18,'x'],[33,'z']].forEach(([y,ax])=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,ax==='x'?15:12,8),pm);c.position.y=y;c.rotation[ax==='x'?'z':'x']=Math.PI/2;inner.add(c)});
   const cm=new THREE.MeshBasicMaterial({color:0x8a9a90,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false});[[1,43,1,3],[-2,40,-1,2.4],[0,22,0,4]].forEach(([x,y,z,r])=>{const s=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),cm);s.position.set(x,y,z);inner.add(s)})}}
 grp.add(inner);const k=q.hcm/52*0.01;grp.scale.setScalar(k);
 const root=new THREE.Group();root.add(grp);if(forPhoto)return root;
 const X=(i-2)*0.95;root.position.set(X,1.0,0);
 const plinth=new THREE.Mesh(new THREE.BoxGeometry(0.36,1.0,0.36),new THREE.MeshStandardMaterial({color:0x3a332c,roughness:.85}));plinth.position.set(X,0.5,0);plinth.userData.q=q;
 const line=new THREE.Group();const lm=new THREE.LineBasicMaterial({color:0xffd27a});const top=q.hcm/100;
 line.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.17,0,0),new THREE.Vector3(0.17,top,0)]),lm));
 [0,top].forEach(y=>line.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.12,y,0),new THREE.Vector3(0.2,y,0)]),lm)));
 const ls=spriteText([[`${fmt(q.hcm.toFixed(1))} cm`,'bold 46px system-ui','#ffd27a',72]],256,100,'rgba(0,0,0,.6)');ls.scale.set(0.06,0.024,1);ls.position.set(0.21,top/2,0);line.add(ls);line.visible=false;root.add(line);
 return{q,root,grp,outer,mat,uvMat,xMat,inner,plinth,decal,line,center:new THREE.Vector3(X,1.0+0.26,0),label:null,markers:new THREE.Group()}}
function init3D(){if(T3)return;const el=document.getElementById('three');const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputEncoding=THREE.sRGBEncoding;el.appendChild(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,0.01,60);
 const hemi=new THREE.HemisphereLight(0xe8dcc8,0x1a1612,0.75),dir=new THREE.DirectionalLight(0xfff0dc,1.15),fill=new THREE.DirectionalLight(0x9fb4d8,0.4);dir.position.set(2.5,4,3);fill.position.set(-3,2,-1);scene.add(hemi,dir,fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:0x15110d,roughness:.95}));floor.rotation.x=-Math.PI/2;scene.add(floor);
 const wall=new THREE.Mesh(new THREE.PlaneGeometry(30,8),new THREE.MeshStandardMaterial({color:0x110e0b,roughness:1}));wall.position.set(0,4,-3.5);scene.add(wall);
 T3={renderer,scene,camera,hemi,dir,fill,floor,wall,el,cam:{t:new THREE.Vector3(0,1.15,0),dist:5.6,az:0,el:0.16},busts:[],dirty:true,anim:null,ray:new THREE.Raycaster(),photo:null};
 const dom=renderer.domElement,pp=new Map();let dr=null,pc=null;
 dom.addEventListener('contextmenu',e=>e.preventDefault());
 dom.addEventListener('pointerdown',e=>{dom.setPointerCapture(e.pointerId);pp.set(e.pointerId,{x:e.offsetX,y:e.offsetY});if(pp.size===1)dr={x:e.offsetX,y:e.offsetY,moved:false,pan:e.button===2||e.shiftKey};if(pp.size===2){const[a,b]=[...pp.values()];pc=Math.hypot(a.x-b.x,a.y-b.y);dr=null}});
 dom.addEventListener('pointermove',e=>{if(!pp.has(e.pointerId))return;const o=pp.get(e.pointerId);pp.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
  if(pc&&pp.size===2){const[a,b]=[...pp.values()],d=Math.hypot(a.x-b.x,a.y-b.y);zoom3(pc/d);pc=d;return}
  if(!dr)return;const dx=e.offsetX-o.x,dy=e.offsetY-o.y;if(Math.abs(e.offsetX-dr.x)+Math.abs(e.offsetY-dr.y)>4)dr.moved=true;if(!dr.moved)return;const c=T3.cam;
  if(dr.pan){const k=c.dist*0.0016,right=new THREE.Vector3(Math.cos(c.az),0,-Math.sin(c.az));c.t.addScaledVector(right,-dx*k);c.t.y+=dy*k}else{c.az-=dx*0.008;c.el=Math.max(-0.35,Math.min(1.35,c.el+dy*0.006))}mark3Dirty();schedule3Gates()});
 const up=e=>{if(!pp.has(e.pointerId))return;pp.delete(e.pointerId);if(dr&&!dr.moved&&pp.size===0)click3(e.offsetX,e.offsetY);if(pp.size<2)pc=null;if(pp.size===0)dr=null};
 dom.addEventListener('pointerup',up);dom.addEventListener('pointercancel',up);
 dom.addEventListener('wheel',e=>{e.preventDefault();zoom3(Math.exp(e.deltaY*0.0012))},{passive:false});
 new ResizeObserver(()=>{const r=el.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();mark3Dirty()}).observe(el);
 (function loop(t){requestAnimationFrame(loop);if(MODE!=='sculpt')return;const c=T3.cam;
  if(T3.anim){const a=T3.anim,k=Math.min(1,(t-a.t0)/450),e=k*(2-k);c.t.lerpVectors(a.from,a.to,e);if(a.dist)c.dist=a.d0+(a.dist-a.d0)*e;if(a.az!=null)c.az=a.az0+(a.az-a.az0)*e;if(a.el!=null)c.el=a.el0+(a.el-a.el0)*e;T3.dirty=true;if(k>=1){T3.anim=null;schedule3Gates()}}
  if(!T3.dirty)return;T3.dirty=false;camera.position.set(c.t.x+c.dist*Math.sin(c.az)*Math.cos(c.el),c.t.y+c.dist*Math.sin(c.el),c.t.z+c.dist*Math.cos(c.az)*Math.cos(c.el));camera.lookAt(c.t);
  T3.busts.forEach(b=>{b.line.visible=tool==='dims'&&sel===b.q&&camera.position.distanceTo(b.center)<1.6});
  renderer.render(scene,camera);const d=sel?camera.position.distanceTo(T3.busts.find(b=>b.q===sel).center):c.dist;document.getElementById('zlv').textContent=(d<1?Math.round(d*100)+' cm':fmt(d.toFixed(2))+' m')})(0)}
const mark3Dirty=()=>{if(T3)T3.dirty=true};
function zoom3(f){const c=T3.cam;c.dist=Math.max(0.2,Math.min(9,c.dist*f));mark3Dirty();schedule3Gates()}
function anim3(to,dist,az,el){const c=T3.cam;T3.anim={from:c.t.clone(),to,t0:performance.now(),d0:c.dist,dist,az0:c.az,az,el0:c.el,el}}
function click3(x,y){const r=T3.renderer.domElement.getBoundingClientRect(),v=new THREE.Vector2(x/r.width*2-1,-(y/r.height)*2+1);T3.ray.setFromCamera(v,T3.camera);
 const objs=[];T3.busts.forEach(b=>objs.push(...b.outer,b.plinth));const hit=T3.ray.intersectObjects(objs,false)[0];if(!hit)return;const q=hit.object.userData.q,b=T3.busts.find(b=>b.q===q);
 const changed=sel!==q;sel=q;
 if(tool==='xrf'&&b.outer.includes(hit.object)){if(hit.distance>0.75)toast('Podejdź bliżej (≤ 75 cm), aby przyłożyć głowicę XRF.');else{const n=q.samples.length+1;q.samples.push(n);note(q,'xrf',`#${n}: ${XRF[q.xrf]}`);
  const s=new THREE.Mesh(new THREE.SphereGeometry(0.004,10,8),new THREE.MeshBasicMaterial({color:0xffa030}));s.position.copy(hit.point);T3.scene.add(s);b.markers.add(s);toast(`XRF #${n}: ${XRF[q.xrf]}`)}}
 if(changed){const c=T3.cam;anim3(b.center.clone(),Math.min(c.dist,1.4))}onChange()}
let g3T=0;function schedule3Gates(){clearTimeout(g3T);g3T=setTimeout(check3Gates,160)}
function camRel(b){const p=T3.camera.position,c=b.center;return{d:p.distanceTo(c),az:Math.atan2(p.x-c.x,p.z-c.z)*180/Math.PI}}
function azOK(k,az){const a=Math.abs(az);return!k||(k==='front'?a<35:k==='back'?a>140:a>50&&a<130)}
const AZTXT={front:'na wprost rzeźby',back:'z tyłu rzeźby',side:'z boku rzeźby'};
function gate3Status(q,T){const g=T.gate3;if(!g)return null;const txt=`Warunek: odległość ≤ ${Math.round(g.d*100)} cm`+(g.az?`, ${AZTXT[g.az]}`:'')+(g.click?' (kliknij powierzchnię)':'');if(!q)return{txt,ok:false};
 const b=T3.busts.find(b=>b.q===q),r=camRel(b);return{txt:txt+` · teraz ${Math.round(r.d*100)} cm`,ok:r.d<=g.d&&azOK(g.az,r.az)}}
function check3Gates(){if(MODE!=='sculpt'||!T3)return;const T=tool&&TB[tool];let ch=false;
 if(T&&T.gate3&&!T.gate3.click)for(const b of T3.busts){const r=camRel(b);if(r.d<=T.gate3.d&&azOK(T.gate3.az,r.az)&&!b.q.notes[tool]){note(b.q,tool,obs3(b.q,tool));ch=true;toast(`Zapisano: rzeźba ${b.q.letter} – ${T.name}`)}}
 if(ch)onChange();else if(tool)updatePanel()}
function apply3View(){if(!T3)return;const v=curView();T3.busts.forEach(b=>{b.outer.forEach(m=>m.material=v==='uv'?b.uvMat:v==='xray'?b.xMat:b.mat);b.inner.visible=v==='xray';b.decal.visible=v==='normal';b.plinth.visible=v!=='xray'});
 T3.scene.background=new THREE.Color(v==='uv'?0x05030a:v==='xray'?0x000000:0x15110e);T3.hemi.intensity=v==='normal'?0.75:0.05;T3.dir.intensity=v==='normal'?1.15:0.05;T3.fill.intensity=v==='normal'?0.4:0;T3.floor.visible=T3.wall.visible=v!=='xray';
 T3.busts.forEach(b=>updateLabel(b));mark3Dirty()}
function updateLabel(b){if(b.label){T3.scene.remove(b.label)}const q=b.q,col=q.umark==='excl'?'#e0584f':q.umark==='susp'?'#f0a030':'#cbb894';
 const s=spriteText([[q.letter,'bold 64px Georgia',sel===q?'#ffd27a':col,72],[q.umark==='excl'?'wykluczona':q.umark==='susp'?'podejrzana':'','24px system-ui',col,108]],160,124,'rgba(0,0,0,.55)');s.scale.set(0.16,0.124,1);s.position.set(b.center.x,1.72,0);T3.scene.add(s);b.label=s;mark3Dirty()}
function build3Scene(){T3.busts.forEach(b=>{T3.scene.remove(b.root,b.plinth,b.markers);if(b.label)T3.scene.remove(b.label)});T3.busts=P.map((q,i)=>{const b=buildBust(q,i);T3.scene.add(b.root,b.plinth,b.markers);return b});
 const ref={t:{},seed:P[0].seed+7,hcm:52,patina:'natural',tool:'chase',mark:'ok',xray:'sand',uv:'wax'},s=new THREE.Scene(),cam=new THREE.PerspectiveCamera(30,1,0.01,10);
 s.add(new THREE.HemisphereLight(0xffffff,0x222222,0.9));const dl=new THREE.DirectionalLight(0xffffff,1.1);dl.position.set(1,1.5,2);s.add(dl);s.background=new THREE.Color(0xdcd4c4);
 const r=buildBust(ref,0,true);s.add(r);cam.position.set(0,0.3,1.25);cam.lookAt(0,0.27,0);const R=T3.renderer,sz=R.getSize(new THREE.Vector2());R.setSize(400,460,false);cam.aspect=400/460;cam.updateProjectionMatrix();R.render(s,cam);T3.photo=R.domElement.toDataURL('image/jpeg',0.85);R.setSize(sz.x,sz.y,false);
 T3.cam={t:new THREE.Vector3(0,1.15,0),dist:5.6,az:0,el:0.16};apply3View()}
function panel3(q){let h='';if(tool==='xrf'){const v=q.notes.xrf;h+=v?`<div class="obs">${v.map(s=>`<div>${s}</div>`).join('')}</div>`:''}
 else if(tool==='weight')h+=`<button class="btn" id="weigh">Połóż na wadze</button>`;
 else if(tool==='style')h+=`<div class="cap">Fotografia z katalogu raisonné (Rudnicki, 2011, nr 76):</div><img src="${T3.photo}" style="filter:sepia(.75) contrast(1.05)">`;
 else if(tool==='prov'){h+=!q.t.prov?`<ul class="tl"><li><b>1888</b> – odlew w odlewni J. Bracławskiego (księga zamówień, poz. 412)</li><li><b>1890</b> – wystawa TZSP, Warszawa, kat. nr 58</li><li><b>1891</b> – zakup: kolekcja Ludwika Krasnodębskiego</li><li><b>1937</b> – spadek: rodzina Orliczów</li><li><b>1975</b> – aukcja, Dom Aukcyjny „Nowy Świat”</li><li><b>2026</b> – zgłoszona do ekspertyzy</li></ul><div class="obs"><b>Katalog raisonné</b> (2011), nr 76: brąz, wys. 52,0 cm, 8,4 kg; znak odlewni i sygnatura z tyłu cokołu; fotografia.</div>`
  :q.m.prov==='attic'?`<ul class="tl"><li><b>2025</b> – „znaleziona na strychu” (oświadczenie sprzedającego)</li><li><b>2026</b> – oferowana prywatnie</li></ul><div class="obs">Katalog raisonné: brak wpisu.</div>`:`<ul class="tl"><li><b>1998</b> – zakup na targu staroci w Pradze</li><li><b>2014</b> – kolekcja prywatna</li><li><b>2026</b> – oferowana do sprzedaży</li></ul><div class="obs">Katalog raisonné i księgi odlewni: brak wpisu.</div>`}
 else if(tool==='cert'){const bad=q.t.cert,iss=bad&&q.m.cert==='issuer';const rows=[['Artysta','Stanisław Rudnicki (1840–1905)'],['Tytuł','Popiersie Heleny'],['Materiał',iss?'—':'brąz patynowany'],['Wysokość',bad&&q.m.cert==='dims'?'49,5 cm':'52,0 cm'],['Masa','8,4 kg'],['Odlewnia','J. Bracławski, Warszawa'],['Data',iss?'—':'1888']];
  h+=`<div class="doc"><h4>CERTYFIKAT AUTENTYCZNOŚCI</h4>${rows.map(r=>`<div class="row"><b>${r[0]}:</b><span>${r[1]}</span></div>`).join('')}<div class="stamp">${iss?'Wystawił: Art-Expert24 s.c. (brak na liście rzeczoznawców)<br>Podpis: nadruk':'Wystawił: dr hab. Jan Orlicz, rzeczoznawca<br>Podpis: odręczny atrament, pieczęć tłoczona'}</div></div>`}
 const T=TB[tool];if(tool!=='xrf'&&q.notes[tool])h+=`<div class="obs"><b>Obserwacja:</b> ${q.notes[tool]}</div>`;
 else if(T.gate3&&!T.gate3.click)h+=`<div class="obs" style="color:var(--mut)">Spełnij warunek powyżej – obserwacja zapisze się automatycznie.</div>`;
 else if(['prov','cert'].includes(tool)){note(q,tool,obs3(q,tool));h+=`<div class="obs"><b>Obserwacja:</b> ${q.notes[tool]}</div>`}return h}
function after3(q){const b=document.getElementById('weigh');if(b)b.onclick=()=>{note(q,'weight',obs3(q,'weight'));toast(`Rzeźba ${q.letter}: ${fmt(q.kg.toFixed(1))} kg`);onChange()}}
