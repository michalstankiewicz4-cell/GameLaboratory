"use strict";
/* =====================================================================
   REJESTR OBIEKTÓW 2D („sklasyfikuj każdy”: banknot, moneta, znaczek, rękopis…)
   Każdy rodzaj to osobny plik w js/kinds/, który woła registerKind({...}).
   Kontrakt rodzaju – patrz docs/ARCHITEKTURA.md, sekcja „Rejestr obiektów 2D”.
   ===================================================================== */
const KINDS={};let KIND=null;
function registerKind(k){KINDS[k.id]=k}
/* Wspólne nachylenie obiektu (suwak „Nachylenie”) – dla rodzajów z tilt:true */
const TILT={v:0,lo:true,hi:false,tool:null};
const tiltOK=g=>!g||!g.tilt||(g.tilt==='both'?TILT.lo&&TILT.hi:TILT.v>65);
function resetTilt(){TILT.v=0;TILT.lo=true;TILT.hi=false;const ti=document.getElementById('tilt');if(ti){ti.value=0;document.getElementById('tiltv').textContent='0°'}}
/* Wspólne tworzenie partii: 1–3 autentyki + fałszerstwa z różnych profili, układ 3+2 na stole */
function kindBatch(k,r,init){ART={wcm:k.wcm,hcm:k.hcm,name:k.label};SC=null;C=null;W=k.W;H=k.H;IW=W*S;IH=H*S;
 const nG=1+Math.floor(r()*3),list=[];for(let i=0;i<nG;i++)list.push({orig:true,profile:null,t:{}});
 shuffle(Object.keys(k.profiles),r).slice(0,5-nG).forEach(id=>list.push({orig:false,profile:id,t:rollTells(k.profiles[id],r)}));shuffle(list,r);
 const g=Math.round(Math.max(W,H)*0.17);
 P=list.map((p,i)=>{p.kind=k;p.letter='ABCDE'[i];p.seed=(r()*1e9)|0;p.m=Object.assign({},p.profile?k.profiles[p.profile].modes:{});p.views={};p.samples=[];p.notes={};p.umark='';
  p.x=i<3?g+i*(W+g):g+(W+g)/2+(i-3)*(W+g);p.y=i<3?g:g*2+H;if(init)init(p,r);return p});
 BW=3*W+4*g;BH=2*H+3*g;resetTilt()}
/* Pomocnik: buforowany widok obiektu */
function kView(p,v,fn){if(p.views[v])return p.views[v];const c=mk(IW,IH),x=c.getContext('2d');x.scale(S,S);fn(x,c);return p.views[v]=c}
