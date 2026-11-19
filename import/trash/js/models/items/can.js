// Puszka aluminiowa 0,33 l (standard 330 ml: Ø 66 mm, wys. 115 mm), pusta i otwarta: dno z kopułą i pierścieniem
// do stawiania, zwężenie dolne, ścianka z nadrukiem, szyjka zwężona do wieczka Ø 54 mm, podwójny zawijany szew,
// wieczko z wgłębieniem, nit, języczek (stay-on tab) z otworem i otwór wlewu (ciemny, kształt łezki).
// Warianty nadruku: 0 — piwo jasne (złoto-zielona), 1 — napój cola (czerwona), 2 — woda gazowana (niebieska).
import * as THREE from '../../../vendor/three/three.module.js';
import { lathe, merge, part, place, smooth2 } from '../geom.js';
import { mat, defineMat, DEFS } from '../materials.js';

// profil zewnętrzny [r, y] od środka dna do środka wieczka (bryła pełna, ściany na zewnątrz)
const BOTTOM = [[0, 0.0108], [0.009, 0.0102], [0.0155, 0.0082], [0.0198, 0.0048], [0.0222, 0.0012], [0.0236, 0.0], [0.0251, 0.0006], [0.0262, 0.0022]];
const LOWER = [[0.0280, 0.0055], [0.0305, 0.0092], [0.0322, 0.0125], [0.0330, 0.0158]];
const NECK = [[0.0330, 0.0985], [0.0324, 0.1012], [0.0306, 0.1048], [0.0284, 0.1085], [0.0271, 0.1108]];
// szew: kołnierz w górę, zawinięcie, wewnętrzna ściana szwu w dół do wgłębienia wieczka
const SEAM = [[0.0270, 0.1122], [0.0276, 0.1138], [0.0283, 0.1146], [0.0281, 0.1153], [0.0272, 0.1155], [0.0264, 0.1150], [0.0261, 0.1132], [0.0259, 0.1112], [0.0255, 0.1104], [0.0251, 0.1110], [0.0249, 0.1124]];
const LID = [[0.0238, 0.1128], [0.0185, 0.1131], [0.0100, 0.1133], [0, 0.1134]];

export const VARIANTS = [
  { name: 'piwo jasne', base: '#1f6b3a', band: '#d9b44a', text: 'LAGER', sub: 'PIWO JASNE PEŁNE  5,2% ALK.', ink: '#f3e7c4' },
  { name: 'napój cola', base: '#b3121b', band: '#f2f2f2', text: 'COLA', sub: 'NAPÓJ GAZOWANY', ink: '#ffffff' },
  { name: 'woda gazowana', base: '#1c5fa8', band: '#9fd3f0', text: 'WODA', sub: 'MINERALNA GAZOWANA', ink: '#ffffff' },
];

/** Profil puszki; `wallSteps` — ile punktów na ściance (zgniecenie potrzebuje gęstej ścianki). */
export function canProfile(wallSteps = 2) {
  const wall = [];
  for (let i = 0; i <= wallSteps; i++) wall.push([0.0330, 0.0158 + (0.0985 - 0.0158) * i / wallSteps]);
  return [].concat(BOTTOM, LOWER, wall.slice(1, -1), NECK, SEAM, LID);
}

function labelMat(variant, profile, g) {
  // zakres v ścianki z nadrukiem (od dolnego zwężenia do szyjki)
  const arc = g.userData.arc;
  const vy = (y) => { let best = 0; profile.forEach((p, i) => { if (Math.abs(p[1] - y) < Math.abs(profile[best][1] - y) && p[0] > 0.02) best = i; }); return arc[best]; };
  const v = VARIANTS[variant % VARIANTS.length];
  return defineMat('canBody-' + variant, { ...DEFS.canBody, ...v, tex: 'canLabel', wallV: [vy(0.0125), vy(0.1012)], circ: 2 * Math.PI * 0.033, arcLen: g.userData.arcLen });
}

/** Wieczko: nit, języczek z otworem na palec, ciemny otwór wlewu (naklejka z polygonOffset — bez migotania). */
function lidParts(lod) {
  const out = [];
  const yL = 0.1134;
  // otwór wlewu: łezka przy krawędzi wieczka
  const hole = new THREE.Shape();
  hole.moveTo(0.0035, 0.0045);
  hole.bezierCurveTo(0.010, 0.006, 0.0125, 0.012, 0.0115, 0.0175);
  hole.bezierCurveTo(0.010, 0.0215, 0.003, 0.0225, 0.0, 0.0225);
  hole.bezierCurveTo(-0.003, 0.0225, -0.010, 0.0215, -0.0115, 0.0175);
  hole.bezierCurveTo(-0.0125, 0.012, -0.010, 0.006, -0.0035, 0.0045);
  hole.closePath();
  const hg = new THREE.ShapeGeometry(hole, lod ? 4 : 12);
  place(hg, [0, yL + 0.0002, 0], [-Math.PI / 2, 0, 0]);
  const dark = new THREE.MeshStandardMaterial({ color: '#050505', roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  dark.name = 'otwór';
  const hm = part('otwór wlewu', hg, dark); hm.castShadow = false; out.push(hm);
  if (lod) return out;
  // nit
  out.push(part('nit', lathe([[0, yL - 0.0004], [0.0021, yL - 0.0004], [0.0023, yL + 0.0006], [0.0018, yL + 0.0011], [0, yL + 0.0012]], 16), mat('aluminium')));
  // języczek: płaski uchwyt z otworem, z wywiniętymi brzegami (grubość 0,45 mm), lekko uniesiony po otwarciu
  const tab = new THREE.Shape();
  // nos języczka nad otworem (+y), szeroki koniec z otworem na palec po drugiej stronie nitu
  tab.moveTo(-0.0064, -0.0125);
  tab.bezierCurveTo(-0.0070, -0.0040, -0.0052, 0.0070, 0, 0.0082);
  tab.bezierCurveTo(0.0052, 0.0070, 0.0070, -0.0040, 0.0064, -0.0125);
  tab.bezierCurveTo(0.0046, -0.0148, -0.0046, -0.0148, -0.0064, -0.0125);
  const fh = new THREE.Path();
  fh.moveTo(-0.0040, -0.0060); fh.bezierCurveTo(-0.0042, -0.0128, 0.0042, -0.0128, 0.0040, -0.0060); fh.bezierCurveTo(0.0030, -0.0040, -0.0030, -0.0040, -0.0040, -0.0060);
  tab.holes.push(fh);
  const tg = new THREE.ExtrudeGeometry(tab, { depth: 0.00045, bevelEnabled: true, bevelThickness: 0.0002, bevelSize: 0.0003, bevelSegments: 1, curveSegments: 10 });
  place(tg, [0, yL + 0.0012, 0], [-Math.PI / 2 - 0.05, 0, 0]);
  out.push(part('języczek', tg, mat('aluminium')));
  return out;
}

export function buildCan(variant = 0, lod = 0, wallSteps = 2, segs = null) {
  const prof = canProfile(wallSteps);
  const body = lathe(prof, segs || (lod ? 20 : 64));
  const g = new THREE.Group(); g.name = 'can';
  g.add(part('puszka', body, mat(labelMat(variant, prof, body))));
  lidParts(lod).forEach((p) => g.add(p));
  // środek bryły w (0,0,0): puszka 115 mm wysokości
  g.children.forEach((c) => c.geometry.translate(0, -0.0577, 0));
  return g;
}

export const info = {
  id: 'can', name: 'Puszka aluminiowa 0,33 l', version: '1.0.0',
  mass: 0.0135, material: 'aluminium', variants: VARIANTS.length,
  // puszka uproszczona: ten sam opór w każdej osi
  crush: { x: 0.35, y: 0.35, z: 0.35 }, minScale: { x: 0.3, y: 0.3, z: 0.3 },
  collider: { type: 'cyl', r: 0.033, h: 0.1155, segs: 14 },
};

export function build(lod = 0, variant = 0) { return buildCan(variant, lod); }
