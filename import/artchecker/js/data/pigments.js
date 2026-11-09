"use strict";
/* =====================================================================
   PIGMENTY
   ===================================================================== */
const PG={ultr:['Ultramaryna syntetyczna',1828,'Na, Al, Si, S'],pb:['Biel ołowiowa',0,'Pb'],prus:['Błękit pruski',1706,'Fe, K'],vir:['Zieleń szmaragdowa (wiridian)',1838,'Cr'],
 ochy:['Ochra żółta',0,'Fe'],sien:['Siena palona',0,'Fe, Mn'],umb:['Umbra palona',0,'Fe, Mn'],cyn:['Cynober',0,'Hg, S'],ochr:['Ochra czerwona',0,'Fe'],bone:['Czerń kostna',0,'Ca, P'],
 cob:['Błękit kobaltowy',1802,'Co, Al'],cadY:['Żółcień kadmowa',1840,'Cd, S'],lake:['Laka karminowa',0,'Al, Ca (organiczny)'],naples:['Żółcień neapolitańska',0,'Pb, Sb'],au:['Złoto płatkowe',0,'Au'],
 tiw:['Biel tytanowa',1921,'Ti'],phB:['Błękit ftalocyjaninowy',1935,'Cu, Cl'],phG:['Zieleń ftalocyjaninowa',1938,'Cu, Cl'],quin:['Czerwień chinakrydonowa',1958,'C, N, O (organiczny)'],
 hansa:['Żółcień arylidowa (Hansa)',1910,'C, N, O (organiczny)'],diox:['Fiolet dioksazynowy',1952,'C, N, O, Cl (organiczny)'],
 zn:['Biel cynkowa',1834,'Zn'],schw:['Zieleń szwajnfurcka',1814,'Cu, As'],minium:['Minia',0,'Pb'],chromY:['Żółcień chromowa',1809,'Pb, Cr'],
 chalk:['Grunt kredowo-klejowy (biały)',0,'Ca'],greyOil:['Grunt olejny szary (biel ołowiowa + czerń)',0,'Pb, Ca, P'],redBole:['Grunt czerwony (bolus)',0,'Fe, Al, Si'],gessoA:['Grunt akrylowy z bielą tytanową',1955,'Ti, C']};
const ALT={ultr:'cob',prus:'cob',cob:'ultr',vir:'schw',pb:'zn',cyn:'minium',ochy:'chromY',naples:'chromY',lake:'cyn',umb:'sien',sien:'umb',ochr:'minium',bone:'umb',cadY:'chromY',au:'ochy'};
const XW={pb:.92,naples:.85,cyn:.78,minium:.88,chromY:.8,zn:.55,tiw:.6,au:.97,greyOil:.8,chalk:.35};
const GROUND_COL={chalk:'#ece4d0',greyOil:'#8f8a82',redBole:'#9a4a2c',gessoA:'#f6f6f3'};
const yr=k=>PG[k][1]?String(PG[k][1]):'starożytności';
