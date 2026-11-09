"use strict";
/* =====================================================================
   ArtExam — silnik obiektów do ekspertyzy z gry artchecker („Pracownia ekspertyz”, przeniesiony z historią do
   GameLaboratory, laboratorium sztuki). Obraz olejny z regionami (pigmenty, kierunek pędzla, gęstość), fikcyjni artyści,
   metody fałszerstwa (profile) z zestawem zdrad i widoki badawcze: światło boczne, UV, podczerwień, rentgen, odwrocie,
   spękania, mikroskop; do tego znaczki, monety, banknoty i rękopisy (rejestr rodzajów, js/render/art/exam/kinds/).
   Skrypty klasyczne ze wspólnymi zmiennymi (jak w grze): kolejność w ArtExam.SCRIPTS ma znaczenie.
   Ten plik zastępuje części gry, których nie przeniesiono (stan planszy, notatnik, komunikaty) i daje API:

   ArtExam.kinds()                         [{ id, label, W, H, three? }] — 'painting', 'fragment', rzeźby 3D ('sculpt' — brąz,
                                           'marble') i rodzaje z rejestru
   ArtExam.info(kind)                      { profiles: { id: name }, tells: [{ id, name }], views: [id], artists? }
   ArtExam.make({ kind, seed, artist, profile, tells })   egzemplarz (oryginał, gdy bez profilu); tells — lista zdrad
                                           albo losowanie z profilu (core zawsze, opt losowo) → { kind, orig, profile,
                                           tells, views, artist?, title?, W, H }
   ArtExam.view(v)                         canvas widoku v ostatniego egzemplarza (2× rozmiar planszy)
   ArtExam.micro(x, y)                     obraz: próbka pod mikroskopem w punkcie (x, y planszy) → canvas 256 px
   rzeźby 3D (Three.js: globalne THREE r186, js/core/three-global.js, ładuje strona): view(v) rysuje popiersie na
   postumencie z kamery ArtExam.cam { az, el, dist } (radiany, metry) do canvasu 900 × 900;
   ArtExam.orbit(dAz, dEl, zoom) obraca i przybliża kamerę
   ===================================================================== */
// stan gry (dawny js/core/state.js — bez planszy i DOM)
let MODE='paint5',ART=null,SC=null,C=null,P=[],sel=null,tool=null,vw={x:0,y:0,z:1},TB={},TLIST=[],GROUPS=[];
// FORCE: jeden egzemplarz zamówiony specem (czytają go kindBatch w kinds.js i newPaint5 w profiles.js)
let FORCE=null;
// części gry, których nie przeniesiono: komunikaty, notatnik, teksty obserwacji (kolory gruntów: GROUND_COL w pigments.js)
function toast(){}
function note(){return false}
const MICRO_OBS={brush:'',print:'',acryl:''};
const VIEWNAME={normal:'światło dzienne',raking:'światło boczne',uv:'promieniowanie UV',ir:'podczerwień',xray:'RTG',crackview:'spękania',back:'odwrocie',trans:'światło przechodzące'};   // nazwy widoków (js/core/state.js gry)
const AREA={};   // opisy obszarów do bramek narzędzi (js/core/tools.js gry) — banknoty dopisują swoje

(function(){
 // zdrady obrazu (identyfikatory p.t z gry → nazwy narzędzi, js/core/tools.js gry)
 const PAINT_TELLS={texture:'Surface texture (raking light)',micro:'Paint under the microscope',crack:'Craquelure',ir:'Underdrawing (infrared)',
  pigment:'Anachronistic pigment',back:'Back of the canvas (stretcher, nails, linen)',prov:'Provenance (exhibition label)',cert:'Certificate',
  sig:'Signature (later or traced)',style:'Style (anatomy, shadows)',uv:'UV (retouching, later signature)',xray:'X-ray',mark:'Mark (initials)'};
 const PAINT_VIEWS=['normal','raking','uv','ir','xray','crackview','back'],SCULPT_VIEWS=['normal','uv','xray'],FRAG_TELLS=['pigment','back','uv','crack','texture','sig','style','ir','xray','micro'];
 let cur=null,stage=null;
 // scena 3D dla rzeźb (jak init3D w grze, bez planszy i bramek): jedno popiersie na postumencie, kamera po orbicie;
 // światła z gry (r128) razy THREE.LIGHT_SCALE, bo r186 liczy światła fizycznie
 function makeStage(){
  const T=window.THREE;if(!T)throw new Error('THREE is not loaded (js/core/three-global.js)');
  const L=T.LIGHT_SCALE||Math.PI,canvas=document.createElement('canvas');canvas.width=canvas.height=900;
  const renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setSize(900,900,false);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,0.01,60);
  const hemi=new T.HemisphereLight(0xe8dcc8,0x1a1612,0.75*L),dir=new T.DirectionalLight(0xfff0dc,1.15*L),fill=new T.DirectionalLight(0x9fb4d8,0.4*L);dir.position.set(2.5,4,3);fill.position.set(-3,2,-1);scene.add(hemi,dir,fill);
  const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:0x0b1628,roughness:.95}));floor.rotation.x=-Math.PI/2;scene.add(floor);
  const wall=new T.Mesh(new T.PlaneGeometry(30,8),new T.MeshStandardMaterial({color:0x081222,roughness:1}));wall.position.set(0,4,-3.5);scene.add(wall);
  let b=null,of=null;
  return{
   set(p){if(of===p)return;if(b){scene.remove(b.root,b.plinth);b.line&&(b.line.visible=false)}b=buildBust(p,2);scene.add(b.root,b.plinth);of=p},
   render(v){const c=ArtExam.cam,ctr=b.center;
    b.outer.forEach(m=>m.material=v==='uv'?b.uvMat:v==='xray'?b.xMat:b.mat);b.inner.visible=v==='xray';b.decal.visible=v==='normal';b.plinth.visible=v!=='xray';
    scene.background=new T.Color(v==='uv'?0x05030a:v==='xray'?0x000000:0x0a1426);hemi.intensity=(v==='normal'?0.75:0.05)*L;dir.intensity=(v==='normal'?1.15:0.05)*L;fill.intensity=(v==='normal'?0.4:0)*L;floor.visible=wall.visible=v!=='xray';
    camera.position.set(ctr.x+Math.sin(c.az)*Math.cos(c.el)*c.dist,ctr.y+Math.sin(c.el)*c.dist,ctr.z+Math.cos(c.az)*Math.cos(c.el)*c.dist);camera.lookAt(ctr);
    renderer.render(scene,camera);
    const out=document.createElement('canvas');out.width=out.height=900;out.getContext('2d').drawImage(canvas,0,0);return out}};
 }
 const viewsOf=k=>{const v=new Set(['normal']);for(const d of Object.values(k.defs||{}))if(d&&d.view)v.add(d.view);return[...v]};
 window.ArtExam={
  SCRIPTS:['util.js','pigments.js','artists.js','scenes.js','exam.js','kinds.js','painting.js','views.js','profiles.js','micro.js','fragment.js',
   'sculpture3d.js','marble.js','kinds/banknote.js','kinds/coin.js','kinds/stamp.js','kinds/manuscript.js'],
  kinds(){const EN={notes:'Banknote',coin:'Coin',stamp:'Postage stamp',manuscript:'Manuscript'};return[{id:'painting',label:'Oil painting',W:640,H:480},{id:'fragment',label:'Painting fragment (torn, with losses)',W:640,H:480},
   {id:'sculpt',label:'Bronze bust (3D)',W:900,H:900,three:true},{id:'marble',label:'Marble bust (3D)',W:900,H:900,three:true},...Object.values(KINDS).map(k=>({id:k.id,label:EN[k.id]||k.noun||k.label,W:k.W,H:k.H}))]},
  info(kind){
   if(kind==='fragment')return{profiles:{forgery:'Fałszerstwo (fragment)'},tells:FRAG_TELLS.map(id=>({id,name:PAINT_TELLS[id]})),views:PAINT_VIEWS,artists:ARTISTS.map(a=>({id:a.id,name:a.name,title:a.title,year:a.year,scene:a.scene}))};
   if(SCULPT_VARIANTS[kind]){const V=SCULPT_VARIANTS[kind],ids=new Set();for(const pr of Object.values(V.profiles))[...pr.core,...pr.opt].forEach(a=>ids.add(a));
    return{profiles:Object.fromEntries(Object.entries(V.profiles).map(([id,v])=>[id,v.name])),tells:[...ids].map(id=>({id,name:(V.defs[id]&&V.defs[id].name)||id})),views:SCULPT_VIEWS,three:true}}
   if(kind==='painting')return{profiles:Object.fromEntries(Object.entries(PROFILES).map(([k,v])=>[k,v.name])),tells:Object.entries(PAINT_TELLS).map(([id,name])=>({id,name})),
    views:PAINT_VIEWS,artists:ARTISTS.map(a=>({id:a.id,name:a.name,title:a.title,year:a.year,scene:a.scene}))};
   const k=KINDS[kind];if(!k)throw new Error('kind: one of painting, '+Object.keys(KINDS).join(', '));
   const ids=new Set();for(const pr of Object.values(k.profiles))[...pr.core,...pr.opt].forEach(a=>ids.add(a));
   return{profiles:Object.fromEntries(Object.entries(k.profiles).map(([id,v])=>[id,v.name])),tells:[...ids].map(id=>({id,name:(k.defs[id]&&k.defs[id].name)||id})),views:viewsOf(k)}},
  make(spec={}){
   const kind=spec.kind||'painting',seed=Math.max(1,Math.round(+spec.seed||1)),r=rng(seed);
   const prs=kind==='painting'?PROFILES:kind==='fragment'?{forgery:{name:'Fałszerstwo (fragment)'}}:SCULPT_VARIANTS[kind]?SCULPT_VARIANTS[kind].profiles:(KINDS[kind]||{}).profiles;if(!prs)throw new Error('kind: one of painting, '+Object.keys(KINDS).join(', '));
   if(spec.profile&&!prs[spec.profile])throw new Error('profile: one of '+Object.keys(prs).join(', '));
   if((kind==='painting'||kind==='fragment')&&spec.artist&&!ARTISTS.some(a=>a.id===spec.artist))throw new Error('artist: one of '+ARTISTS.map(a=>a.id).join(', '));
   FORCE={profile:spec.profile||null,tells:spec.profile&&spec.tells&&spec.tells.length?spec.tells:null,artist:spec.artist||null};
   const three=!!SCULPT_VARIANTS[kind];
   try{if(kind==='painting'){MODE='paint5';newPaint5(r)}else if(kind==='fragment'){MODE='frag';newFrag(r)}else if(three){MODE='sculpt';SV=SCULPT_VARIANTS[kind];newSculpt(r)}else{MODE='kind';KIND=KINDS[kind];KIND.newGame(r)}}finally{FORCE=null}
   const p=P[0];p.x=0;p.y=0;if(kind==='fragment'&&spec.profile){p.profile='forgery'}
   if(three){W=H=900;if(stage)stage.set(p);ArtExam.cam={az:0,el:0.12,dist:1.05}}
   cur={p,kind,W,H,art:ART,sc:SC,c:C,mode:MODE,sv:SV,three};
   const paint=kind==='painting'||kind==='fragment',V=three?SCULPT_VARIANTS[kind]:null;
   return{kind,orig:!!p.orig,profile:p.profile,profileName:p.profile?prs[p.profile].name:null,tells:Object.keys(p.t),variants:{...p.m},three,
    views:paint?PAINT_VIEWS:three?SCULPT_VIEWS:viewsOf(KINDS[kind]),W,H,...(paint?{artist:ART.id,artistName:ART.name,title:ART.title,year:ART.year}:{}),
    ...(three?{measure:{hcm:p.hcm,kg:+p.kg.toFixed(2),xrf:p.xrf,patina:p.patina,uv:p.uv,tool:p.tool,xray:p.xray,mark:p.mark},
     artistName:V.id==='marble'?'Aleksander Królikowski':SCU.name,title:V.id==='marble'?'Popiersie Zofii':SCU.title,year:V.id==='marble'?1879:SCU.year}:{})}},
  cam:{az:0,el:0.12,dist:1.05},
  tilt:0,   // banknot: przechylenie 0…90° (hologram, farba zmienna optycznie, obraz utajony — w grze suwak przechylenia)
  orbit(dAz=0,dEl=0,zoom=1){const c=ArtExam.cam;c.az+=dAz;c.el=Math.max(-0.35,Math.min(1.35,c.el+dEl));c.dist=Math.max(0.25,Math.min(6,c.dist*zoom))},
  view(v){
   if(!cur)throw new Error('ArtExam.make first');
   if(cur.three){SV=cur.sv;MODE='sculpt';if(!stage)stage=makeStage();stage.set(cur.p);return stage.render(v)}
   // wspólne zmienne gry należą do ostatniego egzemplarza
   W=cur.W;H=cur.H;IW=W*S;IH=H*S;ART=cur.art;SC=cur.sc;C=cur.c;MODE=cur.mode;
   const out=getView(cur.p,v);
   // na planszy gry dopiero plansza odcina oddartą część fragmentu i rysuje to, co zależy od przechylenia banknotu
   if(cur.kind==='fragment'||(cur.kind==='notes'&&v==='normal')){const c=document.createElement('canvas');c.width=out.width;c.height=out.height;const x=c.getContext('2d');x.drawImage(out,0,0);x.scale(S,S);
    if(cur.kind==='fragment'){x.globalCompositeOperation='destination-out';x.beginPath();cur.p.frag.missing.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]));x.closePath();x.fill()}
    else{TILT.v=ArtExam.tilt;drawNoteOverlay(x,cur.p)}
    return c}
   return out},
  micro(x,y){
   if(!cur||(cur.kind!=='painting'&&cur.kind!=='fragment'))throw new Error('micro: a painting or a fragment only');
   ArtExam.view('normal');const p=cur.p,reg=regionAtP(p,x,y),c=document.createElement('canvas');c.width=c.height=256;
   drawMicro(c,p,{n:1,col:pix(p,x,y).join(','),ang:{h:0,v:1.57,diag:0.3,hv:0}[(SC.REG[reg]||{}).dir]??0.9,reg});return c},
 };
})();
