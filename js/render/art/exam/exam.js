"use strict";
/* =====================================================================
   ArtExam — silnik obiektów do ekspertyzy z gry artchecker („Pracownia ekspertyz”, przeniesiony z historią do
   GameLaboratory, laboratorium sztuki). Obraz olejny z regionami (pigmenty, kierunek pędzla, gęstość), fikcyjni artyści,
   metody fałszerstwa (profile) z zestawem zdrad i widoki badawcze: światło boczne, UV, podczerwień, rentgen, odwrocie,
   spękania, mikroskop; do tego znaczki, monety, banknoty i rękopisy (rejestr rodzajów, js/render/art/exam/kinds/).
   Skrypty klasyczne ze wspólnymi zmiennymi (jak w grze): kolejność w ArtExam.SCRIPTS ma znaczenie.
   Ten plik zastępuje części gry, których nie przeniesiono (stan planszy, notatnik, komunikaty) i daje API:

   ArtExam.kinds()                         [{ id, label, W, H }] — 'painting' i rodzaje z rejestru
   ArtExam.info(kind)                      { profiles: { id: name }, tells: [{ id, name }], views: [id], artists? }
   ArtExam.make({ kind, seed, artist, profile, tells })   egzemplarz (oryginał, gdy bez profilu); tells — lista zdrad
                                           albo losowanie z profilu (core zawsze, opt losowo) → { kind, orig, profile,
                                           tells, views, artist?, title?, W, H }
   ArtExam.view(v)                         canvas widoku v ostatniego egzemplarza (2× rozmiar planszy)
   ArtExam.micro(x, y)                     obraz: próbka pod mikroskopem w punkcie (x, y planszy) → canvas 256 px
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
 const PAINT_VIEWS=['normal','raking','uv','ir','xray','crackview','back'];
 let cur=null;
 const viewsOf=k=>{const v=new Set(['normal']);for(const d of Object.values(k.defs||{}))if(d&&d.view)v.add(d.view);return[...v]};
 window.ArtExam={
  SCRIPTS:['util.js','pigments.js','artists.js','scenes.js','exam.js','kinds.js','painting.js','views.js','profiles.js','micro.js',
   'kinds/banknote.js','kinds/coin.js','kinds/stamp.js','kinds/manuscript.js'],
  kinds(){const EN={notes:'Banknote',coin:'Coin',stamp:'Postage stamp',manuscript:'Manuscript'};return[{id:'painting',label:'Oil painting',W:640,H:480},...Object.values(KINDS).map(k=>({id:k.id,label:EN[k.id]||k.noun||k.label,W:k.W,H:k.H}))]},
  info(kind){
   if(kind==='painting')return{profiles:Object.fromEntries(Object.entries(PROFILES).map(([k,v])=>[k,v.name])),tells:Object.entries(PAINT_TELLS).map(([id,name])=>({id,name})),
    views:PAINT_VIEWS,artists:ARTISTS.map(a=>({id:a.id,name:a.name,title:a.title,year:a.year,scene:a.scene}))};
   const k=KINDS[kind];if(!k)throw new Error('kind: one of painting, '+Object.keys(KINDS).join(', '));
   const ids=new Set();for(const pr of Object.values(k.profiles))[...pr.core,...pr.opt].forEach(a=>ids.add(a));
   return{profiles:Object.fromEntries(Object.entries(k.profiles).map(([id,v])=>[id,v.name])),tells:[...ids].map(id=>({id,name:(k.defs[id]&&k.defs[id].name)||id})),views:viewsOf(k)}},
  make(spec={}){
   const kind=spec.kind||'painting',seed=Math.max(1,Math.round(+spec.seed||1)),r=rng(seed);
   const prs=kind==='painting'?PROFILES:(KINDS[kind]||{}).profiles;if(!prs)throw new Error('kind: one of painting, '+Object.keys(KINDS).join(', '));
   if(spec.profile&&!prs[spec.profile])throw new Error('profile: one of '+Object.keys(prs).join(', '));
   if(kind==='painting'&&spec.artist&&!ARTISTS.some(a=>a.id===spec.artist))throw new Error('artist: one of '+ARTISTS.map(a=>a.id).join(', '));
   FORCE={profile:spec.profile||null,tells:spec.profile&&spec.tells&&spec.tells.length?spec.tells:null,artist:spec.artist||null};
   try{if(kind==='painting'){MODE='paint5';newPaint5(r)}else{MODE='kind';KIND=KINDS[kind];KIND.newGame(r)}}finally{FORCE=null}
   const p=P[0];p.x=0;p.y=0;
   cur={p,kind,W,H,art:ART,sc:SC,c:C,mode:MODE};
   return{kind,orig:!!p.orig,profile:p.profile,profileName:p.profile?prs[p.profile].name:null,tells:Object.keys(p.t),variants:{...p.m},
    views:kind==='painting'?PAINT_VIEWS:viewsOf(KINDS[kind]),W,H,...(kind==='painting'?{artist:ART.id,artistName:ART.name,title:ART.title,year:ART.year}:{})}},
  view(v){
   if(!cur)throw new Error('ArtExam.make first');
   // wspólne zmienne gry należą do ostatniego egzemplarza
   W=cur.W;H=cur.H;IW=W*S;IH=H*S;ART=cur.art;SC=cur.sc;C=cur.c;MODE=cur.mode;
   return getView(cur.p,v)},
  micro(x,y){
   if(!cur||cur.kind!=='painting')throw new Error('micro: a painting only');
   ArtExam.view('normal');const p=cur.p,reg=regionAtP(p,x,y),c=document.createElement('canvas');c.width=c.height=256;
   drawMicro(c,p,{n:1,col:pix(p,x,y).join(','),ang:{h:0,v:1.57,diag:0.3,hv:0}[(SC.REG[reg]||{}).dir]??0.9,reg});return c},
 };
})();
