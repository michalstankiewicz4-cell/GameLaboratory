"use strict";
/* =====================================================================
   PROFILE KOPII (obrazy)
   ===================================================================== */
const PROFILES={
 giclee:{name:'Wydruk giclée na płótnie z ręcznie nałożoną fakturą',core:['texture','micro','crack','ir'],opt:['pigment','back','prov'],crack:'none',ir:'none',micro:'print'},
 modern:{name:'Współczesna kopia malarska na nowych materiałach',core:['pigment','back','uv'],opt:['crack','sig','style','micro','mark'],crack:'none',sig:'graph',micro:'acryl'},
 oldcanvas:{name:'Fałszerstwo na starym płótnie z epoki',core:['xray','crack','sig'],opt:['uv','prov','cert','mark'],crack:'artificial',sig:'later',prov:'attic'},
 grid:{name:'Kopia przeniesiona z siatki (kalkowanie)',core:['ir','style','sig'],opt:['cert','pigment','mark'],ir:'grid',sig:'graph',cert:'dims'},
 papers:{name:'Kopia z podrobioną dokumentacją',core:['prov','cert'],opt:['pigment','texture','style','xray','mark'],prov:'noCR',cert:'issuer'},
};
function rollTells(pr,r){const t={};pr.core.forEach(a=>t[a]=true);pr.opt.forEach(a=>{if(r()<0.45)t[a]=true});const rest=pr.opt.filter(a=>!t[a]);while(Object.keys(t).length<3&&rest.length)t[rest.splice(Math.floor(r()*rest.length),1)[0]]=true;return t}
function chooseArtist(r){const v=document.getElementById('artist').value;return ARTISTS.find(a=>a.id===v)||pick(ARTISTS,r)}
function setupScene(r){ART=chooseArtist(r);SC=SCENES[ART.scene];W=SC.W;H=SC.H;IW=W*S;IH=H*S;C=SC.make(r);C.sd=(r()*1e9)|0;sigLayout(C)}
function basePainting(p,r){const q=rng(p.seed),pr=(p.profile&&PROFILES[p.profile])||{};
 const anRegs=Object.keys(SC.REG).filter(k=>SC.REG[k].an);
 p.m={pigReg:pick(p.descRegs||anRegs,q),pigKind:'an',texture:pick(['flat','mismatch'],q),crack:pr.crack||pick(['none','artificial'],q),sig:pr.sig||pick(['later','graph'],q),
  style:pick(['anatomy','shadow'],q),prov:pr.prov||pick(['attic','noCR'],q),cert:pr.cert||pick(['dims','issuer'],q),ir:pr.ir||pick(['none','grid'],q),micro:pr.micro||pick(['print','acryl'],q)};
 if(p.t.sig&&p.m.sig==='later'&&crackMode(p)==='none')p.m.sig='graph';
 p.views={};p.samples=[];p.notes={};p.umark='';p.shapes=SC.build(C,p.t.style?p.m.style:null);
 const e=Math.floor(q()*4),o=8+q()*26,a=40+q()*((e%2?H:W)-80);
 p.markPos=e===0?{x:a,y:o}:e===1?{x:W-o,y:a}:e===2?{x:a,y:H-o}:{x:o,y:a};p.markTxt=pick(['R.K.','M.W. 87','J.D. fec.','T.S.'],q)}
function newPaint5(r){setupScene(r);
 const list=[{orig:true,profile:null,t:{}}];shuffle(Object.keys(PROFILES),r).slice(0,4).forEach(k=>list.push({orig:false,profile:k,t:rollTells(PROFILES[k],r)}));
 shuffle(list,r);const D=13+Math.floor(r()*5);
 P=list.map((p,i)=>{p.letter='ABCDE'[i];p.seed=(r()*1e9)|0;basePainting(p,r);const q=rng(p.seed+3);p.retouch=!p.t.uv&&q()<0.45;p.warGap=q()<0.5;
  p.linen=!p.t.back;p.thread=p.t.back?22+Math.floor(q()*3):D;p.x=i<3?G+i*(W+G):G+(W+G)/2+(i-3)*(W+G);p.y=i<3?G:G*2+H;return p});
 C.thread=D;BW=3*W+4*G;BH=2*H+3*G}
