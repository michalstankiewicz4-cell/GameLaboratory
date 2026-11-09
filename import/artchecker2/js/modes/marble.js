"use strict";
/* =====================================================================
   RZEŹBA Z MARMURU – wariant silnika rzeźb 3D (js/modes/sculpture3d.js)
   Aleksander Królikowski (1835–1898), „Popiersie Zofii”, 1879, marmur karraryjski, wys. 54 cm (fikcyjne)
   ===================================================================== */
const MPROF={
 cnc:{name:'Kopia frezowana CNC ze skanu 3D, postarzana kwasem',core:['tool','acid','uv'],opt:['patina','mark'],tool:'cnc',patina:'clean',mark:'crisp'},
 cast:{name:'Odlew z żywicy z mączką marmurową',core:['weight','tool','uv'],opt:['patina','acid'],tool:'smooth',patina:'painted'},
 oldcopy:{name:'Warsztatowa kopia z epoki (maszyna punktowa)',core:['style','mark','dims'],opt:['prov','cert'],hcm:53.2,mark:'other'},
 papers:{name:'Kopia z podrobioną dokumentacją',core:['prov','cert'],opt:['patina','mark'],patina:'clean',mark:'crisp',prov:'noCR',cert:'issuer'},
};
const MDEF={
 uv:{name:'Lampa UV',view:'uv',gate3:{d:2.5},hint:'Stary marmur fluoryzuje w UV matowo, żółtawo-brązowo i plamiście. Świeżo obrobiona albo wytrawiona kwasem powierzchnia świeci jasno, fioletowo-biało i jednolicie. Żywica świeci zielonkawo.'},
 patina:{name:'Patyna w zagłębieniach',gate3:{d:0.6},hint:'Podejdź na ≤ 60 cm. Przez lata w zagłębieniach (pod brodą, przy uszach, we włosach, na cokole) gromadzi się szarobrązowy brud, a wypukłości są czystsze. Czysta kopia jest jednolicie biała; malowana patyna pokrywa też wypukłości.'},
 acid:{name:'Powierzchnia (postarzanie kwasem)',gate3:{d:0.45},hint:'Podejdź na ≤ 45 cm. Naturalne wietrzenie szorstkuje tylko powierzchnie wystawione na deszcz i kurz (górne), a miejsca osłonięte zostają gładkie. Kwas daje jednolicie „cukrową”, szorstką powierzchnię wszędzie, także w zakamarkach.'},
 weight:{name:'Waga',hint:'Katalog: 31,5 kg. Marmur jest ciężki (ok. 2,7 g/cm³) – odlew z żywicy z mączką marmurową waży wielokrotnie mniej.'},
 dims:{name:'Pomiar (suwmiarka)',gate3:{d:1.6},hint:'Podejdź na ≤ 1,6 m – obok wybranej rzeźby pojawi się miara. Katalog: 54,0 cm.'},
 style:{name:'Porównanie z fotografią katalogową',gate3:{d:1.1,az:'front'},hint:'Stań na wprost rzeźby (≤ 1,1 m) i porównaj proporcje i ułożenie głowy z fotografią katalogową. Kopia warsztatowa wykonana maszyną punktową bywa wierna, ale ma błędy między punktami pomiarowymi.'},
 mark:{name:'Sygnatura (tył cokołu)',gate3:{d:0.5,az:'back'},hint:'Obejdź rzeźbę i podejdź na ≤ 50 cm do tyłu cokołu. Oryginalna sygnatura jest wykuta dłutem, z krawędziami złagodzonymi przez czas i brudem w rowkach. Wycięta CNC jest ostra i czysta; kopia warsztatowa ma własny podpis.'},
 prov:{name:'Proweniencja',hint:'Prześledź historię rzeźby: wystawy, katalog, transakcje.'},
 cert:{name:'Certyfikat autentyczności',hint:'Sprawdź kompletność danych i wystawcę. Porównaj wysokość i masę z pomiarami.'},
 tool:{name:'Ślady obróbki (dłuto, szpicak, tarnik)',gate3:{d:0.42},hint:'Podejdź bardzo blisko (≤ 42 cm). Ręczna obróbka zostawia punktowe wgłębienia szpicaka, pasma rys tarnika w różnych kierunkach i polerowane partie. Frez CNC zostawia regularne, równoległe ścieżki na całej powierzchni; odlew – gładką powierzchnię z pęcherzykami.'},
};
const MSET=[['1. Materiał i wiek',['uv','patina','acid','weight']],['2. Forma i sygnatura',['dims','style','mark']],['3. Proweniencja i dokumenty',['prov','cert']],['4. Obróbka',['tool']]];
function marbleInitQ(q,pr,t,qr){q.hcm=t.dims?pr.hcm:54.0;q.kg=t.weight?12.4:31.5+(qr()-.5)*0.4;q.tool=t.tool?pr.tool:'chisel';q.patina=t.patina?(pr.patina||'clean'):'natural';
 q.acid=!!t.acid;q.uv=t.uv?(q.profile==='cast'?'resin':'fresh'):'old';q.mark=t.mark?(pr.mark||'crisp'):'ok';q.xray='none'}
function marbleColorize(g,q){const pos=g.attributes.position,nor=g.attributes.normal,n=pos.count,col=new Float32Array(n*3),seed=q.seed%1000;
 for(let i=0;i<n;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),ny=nor.getY(i),nz=0.5+0.5*Math.sin(x*1.3+seed)*Math.cos(y*1.1+z*0.7);let c=[.93,.91,.86].map(v=>v*(0.97+nz*0.05));
  if(q.patina==='natural'){let g2=0;if(y>29&&y<38&&ny<-0.2)g2=.75;if(Math.abs(x)>6.5&&y>38&&y<48)g2=Math.max(g2,.5);if(y<8.5&&ny>0.6)g2=Math.max(g2,.55);if(y>44&&z<-2)g2=Math.max(g2,.45);
   c=mix(c,[.55,.5,.42],g2*(.6+nz*.5));if(ny>0.55&&y>40)c=mix(c,[.78,.77,.73],.35)}
  else if(q.patina==='painted')c=mix(c,[.7,.62,.5],.5+nz*.15);
  col.set(c,i*3)}g.setAttribute('color',new THREE.BufferAttribute(col,3))}
function veinTex(seed){const r=rng(seed);return texCanvas((x,w,h)=>{x.fillStyle='#f2f0ea';x.fillRect(0,0,w,h);x.lineCap='round';
 for(let k=0;k<14;k++){let X=r()*w,Y=r()*h,a=r()*6.28;x.strokeStyle=`rgba(${120+r()*40|0},${125+r()*40|0},${135+r()*40|0},${.15+r()*.25})`;x.lineWidth=0.6+r()*2.2;x.beginPath();x.moveTo(X,Y);
  for(let i=0;i<40;i++){a+=(r()-.5)*0.6;X+=Math.cos(a)*14;Y+=Math.sin(a)*14;x.lineTo(X,Y)}x.stroke()}},512,512)}
function marbleBump(q){const r=rng(q.seed);return texCanvas((x,w,h)=>{x.fillStyle='#808080';x.fillRect(0,0,w,h);
 if(q.tool==='chisel'){for(let p=0;p<70;p++){const cx=r()*w,cy=r()*h,a=r()*6.28,kind=r();
   if(kind<0.45){x.strokeStyle='rgba(0,0,0,.28)';x.lineWidth=1;for(let i=0;i<14;i++){const o=(i-7)*2.2,X=cx+Math.cos(a+1.57)*o,Y=cy+Math.sin(a+1.57)*o,l=18+r()*14;x.beginPath();x.moveTo(X,Y);x.lineTo(X+Math.cos(a)*l,Y+Math.sin(a)*l);x.stroke()}}
   else if(kind<0.8){for(let i=0;i<26;i++){x.fillStyle='rgba(0,0,0,.45)';x.beginPath();x.arc(cx+(r()-.5)*40,cy+(r()-.5)*40,1+r()*1.8,0,7);x.fill()}}
   else{x.fillStyle='rgba(128,128,128,.9)';x.beginPath();x.arc(cx,cy,20+r()*20,0,7);x.fill()}}}
 else if(q.tool==='cnc'){for(let y=0;y<h;y+=5){x.strokeStyle='rgba(0,0,0,.2)';x.lineWidth=1.4;x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke();x.strokeStyle='rgba(255,255,255,.16)';x.lineWidth=0.8;x.beginPath();x.moveTo(0,y+2.5);x.lineTo(w,y+2.5);x.stroke()}}
 else for(let i=0;i<500;i++){const X=r()*w,Y=r()*h,s=1+r()*2.4;x.fillStyle='rgba(0,0,0,.6)';x.beginPath();x.arc(X,Y,s,0,7);x.fill();x.strokeStyle='rgba(255,255,255,.5)';x.lineWidth=0.8;x.stroke()}
 if(q.acid){for(let i=0;i<9000;i++){x.fillStyle=r()<.5?'rgba(0,0,0,.35)':'rgba(255,255,255,.3)';x.fillRect(r()*w,r()*h,1.2,1.2)}}})}
function marbleSurface(q,gs){gs.forEach(g=>marbleColorize(g,q));const bt=marbleBump(q),vt=veinTex(q.seed+3);bt.repeat.set(6,6);vt.repeat.set(1.5,1.5);
 return{mat:new THREE.MeshStandardMaterial({vertexColors:true,map:vt,bumpMap:bt,bumpScale:0.01,roughness:q.acid?0.92:0.55,metalness:0}),
  uvMat:new THREE.MeshStandardMaterial({color:0x0c0812,emissive:q.uv==='resin'?0x4f9a3c:q.uv==='fresh'?0x6b62b0:0x3a3020,roughness:.9,metalness:0}),
  xMat:new THREE.MeshBasicMaterial({color:0xa8c4dc,transparent:true,opacity:0.1,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide})}}
function marbleMarkTex(q){return texCanvas((x,w,h)=>{x.clearRect(0,0,w,h);const t=q.mark==='other'?'PRACOWNIA J. MAZURA WG A. KRÓLIKOWSKIEGO':'A. KRÓLIKOWSKI FEC. 1879';
 x.font=q.mark==='other'?'bold 54px Georgia':'bold 76px Georgia';x.textAlign='center';if(q.mark==='ok'){x.filter='blur(2.5px)'}
 x.fillStyle=q.mark==='ok'?'rgba(70,60,45,.9)':'rgba(120,118,112,.9)';x.fillText(t,w/2+2,165);x.fillStyle='rgba(255,255,255,.55)';x.fillText(t,w/2-2,161)},1024,280)}
function marbleObs(q,id){const t=q.t;switch(id){
 case'uv':return{old:'Matowa, żółtawo-brązowa, plamista fluorescencja – stara powierzchnia marmuru.',fresh:'Jasna, fioletowo-biała, jednolita fluorescencja – świeżo obrobiona lub wytrawiona powierzchnia.',resin:'Silna, zielonkawa fluorescencja – żywica.'}[q.uv];
 case'patina':return{natural:'Szarobrązowy brud zebrany w zagłębieniach (pod brodą, przy uszach, we włosach, na cokole), wypukłości czystsze.',clean:'Powierzchnia jednolicie biała, czysta także w zagłębieniach.',painted:'Brązowawa patyna rozłożona równo wszędzie, także na wypukłościach – malowana.'}[q.patina];
 case'acid':return q.acid?'Powierzchnia jednolicie szorstka, „cukrowa”, także w osłoniętych zakamarkach; krawędzie równo zaokrąglone.':'Szorstkie są tylko górne, wystawione powierzchnie; miejsca osłonięte gładkie i miejscami wypolerowane.';
 case'weight':return`Masa: ${fmt(q.kg.toFixed(1))} kg.`;case'dims':return`Wysokość: ${fmt(q.hcm.toFixed(1))} cm.`;
 case'style':return t.style?'Nos wyraźnie dłuższy, głowa przechylona w bok – inaczej niż na fotografii katalogowej.':'Proporcje twarzy i ułożenie głowy zgodne z fotografią katalogową.';
 case'mark':return{ok:'Sygnatura „A. KRÓLIKOWSKI FEC. 1879” wykuta dłutem, krawędzie złagodzone, brud w rowkach.',crisp:'Ten sam napis, ale rowki ostre, równe i czyste – wycięte maszynowo.',other:'Napis „PRACOWNIA J. MAZURA WG A. KRÓLIKOWSKIEGO” – sygnatura warsztatu kopisty.'}[q.mark];
 case'tool':return{chisel:'Punktowe wgłębienia szpicaka, pasma rys tarnika w różnych kierunkach i wypolerowane partie – obróbka ręczna.',cnc:'Regularne, równoległe ścieżki frezu w stałym odstępie na całej powierzchni.',smooth:'Powierzchnia gładka, bez śladów narzędzi; drobne kuliste pęcherzyki powietrza.'}[q.tool];
 case'prov':return!t.prov?'Ciągła historia od 1879 r.: wystawa 1880, katalog nr 41.':q.m.prov==='attic'?'Brak historii przed 2025 r. – „znaleziona w ogrodzie”; brak w katalogu.':'Historia dopiero od 1998 r.; brak w katalogu dzieł.';
 case'cert':return!t.cert?'Certyfikat kompletny, dane zgodne z katalogiem, podpis rzeczoznawcy.':q.m.cert==='dims'?'Wysokość w certyfikacie: 51,5 cm – niezgodna z pomiarem.':'Wystawca bez uprawnień, brak materiału i daty, podpis drukowany.'}}
function marbleWhy(q,id){return({uv:()=>q.uv==='resin'?'Fluorescencja żywicy – to nie marmur.':'Świeża, wytrawiona powierzchnia – brak starej warstwy marmuru.',patina:()=>q.patina==='painted'?'Malowana patyna, także na wypukłościach.':'Brak brudu w zagłębieniach – powierzchnia zbyt czysta jak na 150 lat.',
 acid:()=>'Jednolita, „cukrowa” szorstkość wszędzie – postarzanie kwasem.',weight:()=>'Masa kilkakrotnie mniejsza niż w katalogu – odlew z żywicy.',dims:()=>'Wysokość niezgodna z katalogiem – kopia warsztatowa.',
 style:()=>'Błędy proporcji między punktami pomiarowymi – kopia.',mark:()=>q.mark==='other'?'Sygnatura warsztatu kopisty.':'Sygnatura wycięta maszynowo – ostre, czyste rowki.',
 tool:()=>q.tool==='cnc'?'Równoległe ścieżki frezu CNC.':'Gładka powierzchnia z pęcherzykami – odlew.',prov:()=>q.m.prov==='attic'?'Brak historii – „znaleziona w ogrodzie”.':'Historia od 1998 r., brak w katalogu.',cert:()=>q.m.cert==='dims'?'Wysokość w certyfikacie niezgodna z rzeźbą.':'Certyfikat od podmiotu bez uprawnień.'}[id]||(()=>''))()}
function marbleProv(q){return!q.t.prov?`<ul class="tl"><li><b>1879</b> – wykonana w pracowni artysty w Rzymie (list do rodziny)</li><li><b>1880</b> – wystawa TZSP, Warszawa, kat. nr 112</li><li><b>1881</b> – zakup: kolekcja hr. Orlickich</li><li><b>1952</b> – depozyt muzealny</li><li><b>1994</b> – zwrot spadkobiercom</li><li><b>2026</b> – zgłoszona do ekspertyzy</li></ul><div class="obs"><b>Katalog dzieł</b> (Królikowski, 2009), nr 41: marmur karraryjski, wys. 54,0 cm, 31,5 kg; sygnatura z tyłu cokołu; fotografia.</div>`
 :q.m.prov==='attic'?`<ul class="tl"><li><b>2025</b> – „znaleziona w ogrodzie dworu” (oświadczenie sprzedającego)</li><li><b>2026</b> – oferowana prywatnie</li></ul><div class="obs">Katalog dzieł: brak wpisu.</div>`:`<ul class="tl"><li><b>1998</b> – zakup w antykwariacie we Florencji</li><li><b>2015</b> – kolekcja prywatna</li><li><b>2026</b> – oferowana do sprzedaży</li></ul><div class="obs">Katalog dzieł: brak wpisu.</div>`}
function marbleCert(q){const bad=q.t.cert,iss=bad&&q.m.cert==='issuer',rows=[['Artysta','Aleksander Królikowski (1835–1898)'],['Tytuł','Popiersie Zofii'],['Materiał',iss?'—':'marmur karraryjski'],['Wysokość',bad&&q.m.cert==='dims'?'51,5 cm':'54,0 cm'],['Masa','31,5 kg'],['Data',iss?'—':'1879']];
 return`<div class="doc"><h4>CERTYFIKAT AUTENTYCZNOŚCI</h4>${rows.map(r=>`<div class="row"><b>${r[0]}:</b><span>${r[1]}</span></div>`).join('')}<div class="stamp">${iss?'Wystawił: Art-Expert24 s.c. (brak na liście rzeczoznawców)<br>Podpis: nadruk':'Wystawił: dr hab. Jan Orlicz, rzeczoznawca<br>Podpis: odręczny atrament, pieczęć tłoczona'}</div></div>`}
SCULPT_VARIANTS.marble={id:'marble',label:'Znajdź oryginał – rzeźby z marmuru',noun:'rzeźba',profiles:MPROF,defs:MDEF,sets:MSET,obs:marbleObs,why:marbleWhy,initQ:marbleInitQ,
 surface:marbleSurface,inner:()=>new THREE.Group(),markTex:marbleMarkTex,refQ:seed=>({t:{},seed,hcm:54,patina:'natural',tool:'chisel',mark:'ok',uv:'old',acid:false}),
 prov:marbleProv,cert:marbleCert,photoCaption:'Fotografia z katalogu dzieł (Królikowski, 2009, nr 41):',
 intro:'Na postumentach stoi 5 marmurowych popiersi: jeden oryginał i cztery kopie. Obracaj kamerę i podchodź blisko: ślady dłuta i frezu, patynę w zagłębieniach i postarzanie kwasem widać dopiero z kilkudziesięciu centymetrów. Oznaczaj rzeźby i wskaż oryginał.',
 caseText:()=>'Sprawa: „Popiersie Zofii”, Aleksander Królikowski (1835–1898), 1879, marmur karraryjski, wys. 54 cm. Na postumentach 5 rzeźb – jedna jest oryginałem. (Artyści i dzieła są fikcyjne.)'};
