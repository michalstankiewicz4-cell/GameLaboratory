// MechKit — materiały (MatKit), dane fizyczne części (userData.phys: PHYS, G_MAT, MOTOR_ELEC), faza przekładni
// planetarnej, narzędzia geometrii (walce, UV).
import * as THREE from '../../../vendor/three/three.module.js';
import { makeMaterial, PRESETS } from '../../render/materials/matkit.js';

export const STEEL_RHO = 7850, BRASS_RHO = 8500, IRON_RHO = 7200, ALU_RHO = 2700;
export const RHO = { gear: STEEL_RHO, steel: STEEL_RHO, dark: STEEL_RHO, brass: BRASS_RHO, iron: IRON_RHO, alu: ALU_RHO };
export const TAU = Math.PI * 2, ALPHA = 20 * Math.PI / 180;

/* ---------------- materiały ---------------- */
let MATS = null;
// ---------------- właściwości fizyczne części (userData.phys) ----------------
// Każda część niesie swoje dane fizyczne — laboratorium / gra tylko je czyta (fizyka: js/behaviors/land/mech/physics.js):
//   eta  — sprawność połączenia, które ta część tworzy (zazębienie, łańcuch, pas, przegub, przekładnia)
//   k    — sztywność skrętna, N·m/rad (albo dane, z których się ją liczy: G, EA, c), zeta — tłumienie względne
//   luz  — pocienienie zęba na kole podziałowym (m), z którego razem z drugim kołem wychodzi luz obwodowy
export const G_STEEL = 80e9;   // moduł Kirchhoffa stali, Pa
export const G_MAT = { steel: G_STEEL, iron: 45e9, brass: 37e9, alu: 26e9 };   // moduł Kirchhoffa wg materiału wału, Pa
export const PHYS = {
  mesh: { c: 2e10, zeta: 0.05, eta: 0.98, thin: 0.04 },   // zazębienie walcowe: k = c·b·r_b² (b — szerokość wspólna); ząb cieńszy o thin·m
  shaft: { G: G_STEEL, zeta: 0.02 },                      // wał: k = G·π·d⁴ / (32·L), G wg materiału (G_MAT)
  spider: { '92A': 1300, '98A': 2300, '64D': 4500 },      // gwiazda sprzęgła kłowego (poliuretan), N·m/rad wg twardości
  jaw: { zeta: 0.07, eta: 0.995 },
  flange: { k: 1.5e5, zeta: 0.02, eta: 0.995 },
  chain: { EA: 2e6, zeta: 0.03, eta: 0.97 },              // łańcuch 08A: sztywność cięgna EA (N) → k = EA / D · R₂²
  belt: { EA: 4e4, zeta: 0.08, eta: 0.95, F0: 300, mu: 0.3, groove: 36, kinetic: 0.85, creep: 0.015 },   // pas klinowy: napięcie wstępne F0 (N) w cięgnie, μ, kąt rowka (°), tarcie kinetyczne / statyczne, pełzanie przy granicy
  ujoint: { k: 2e5, zeta: 0.02, eta: 0.99, mu: 0.05, rc: 0.0055, R: 0.026, clear: 0.00002 },   // przegub Cardana: krzyżak w łożyskach igiełkowych — tarcie efektywne, czop r_c, ramię R, luz promieniowy łożyska (m)
  planetary: { k: 3e5, zeta: 0.03, eta: 0.97 },           // przekładnia planetarna (zestaw: słoneczne, satelity, korona)
  bearing: { drag: 0.0004 },                              // łożysko toczne: opór lepki, N·m·s/rad
  rack: { c: 2e10, zeta: 0.05, eta: 0.98, thin: 0.04 },   // listwa zębata z kołem: k = c·b (N/m — współrzędna listwy w metrach), ząb cieńszy o thin·m
  screw: { ball: { eta: 0.9, k: 2e8, zeta: 0.03 }, trap: { eta: 0.35, k: 3e8, zeta: 0.05 } },   // śruba kulowa / trapezowa: sprawność, sztywność osiowa nakrętki (N/m)
  crank: { eta: 0.97, k: 1e8, zeta: 0.03 },               // mechanizm korbowy: sprawność (dwa sworznie w łożyskach ślizgowych), sztywność korbowodu EA / l
  slide: { mu: 0.003 },                                    // prowadnica toczna: współczynnik oporu
};
// silnik — dane elektryczne (userData.elec): sprawność, cos φ, prąd znamionowy z mocy, prąd biegu jałowego (ułamek In),
// straty jałowe (ułamek mocy), napięcie i częstotliwość znamionowa
export const MOTOR_ELEC = { eta: 0.84, cosPhi: 0.77, U: 400, f: 50, k0: 0.6, p0: 0.05 };
// faza w przekładni planetarnej (ψ_k = k·2π/n): kąt satelity k w jarzmie dla kąta względnego słonecznego `rel`
// i obrót korony, przy którym wrąb korony stoi naprzeciw zęba satelity 0 (zęby się nie przenikają — sprawdzone
// bryłami zderzeń, js/behaviors/land/mech/contact.js)
export function planetPhase(zs, zp, zr, n) {
  const p0 = Math.PI + Math.PI / zp, off = p0 - Math.round(p0 / (TAU / zp)) * (TAU / zp);
  return { ring: off * zp / zr, planet: (k, rel) => { const psi = k * TAU / n; return -(zs / zp) * (rel - psi) + psi + Math.PI + Math.PI / zp; } };
}

export function materials() {
  if (MATS) return MATS;
  const mk = (def) => makeMaterial(def, { res: 512 }).material;
  MATS = {
    steel: mk({ ...PRESETS.brushed, color: '#b4b9bd', roughness: 0.3, brushed: 0.8 }),                   // wały, sworznie
    gear: mk({ ...PRESETS.brushed, color: '#8e959b', roughness: 0.38, brushed: 0.35, wear: 0.15 }),     // stal ulepszona
    brass: mk({ ...PRESETS.copper, color: '#c09a4a', roughness: 0.32, brushed: 0.25, wear: 0.12 }),    // mosiądz / brąz
    dark: mk({ ...PRESETS.brushed, color: '#3d4043', roughness: 0.45, brushed: 0.2, wear: 0.2 }),      // stal czerniona
    iron: mk({ ...PRESETS.plate, color: '#5b6066', color2: '#3b3f44', roughness: 0.7, metalness: 0.6, panels: 1, rivets: 0, wear: 0.25 }),  // żeliwo
    alu: mk({ ...PRESETS.aluminium, roughness: 0.35 }),
    paintBlue: mk({ ...PRESETS.hull, color: '#2c5c8f', color2: '#1b3a5c', tile: 2, wear: 0.12, dirt: 0.15, rust: 0 }),   // silnik (RAL 5010)
    paintGrey: mk({ ...PRESETS.hull, color: '#5a6672', color2: '#38414a', tile: 2, wear: 0.2, dirt: 0.2, rust: 0 }),     // oprawy łożysk
    paintRed: mk({ ...PRESETS.hull, color: '#b0302a', color2: '#6b1c18', tile: 2, wear: 0.15, dirt: 0.1, rust: 0 }),     // zacisk hamulca
    bed: mk({ ...PRESETS.plate, color: '#4a5056', color2: '#2c3034', tile: 3, panels: 2, rivets: 0, wear: 0.3, dirt: 0.35 }),   // łoże maszyny
    concrete: mk({ ...PRESETS.concrete, tile: 6 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1c1d1f, roughness: 0.92, metalness: 0 }),
    poly: new THREE.MeshStandardMaterial({ color: 0xd8432e, roughness: 0.55, metalness: 0 }),         // poliuretan (gwiazda sprzęgła)
    black: new THREE.MeshStandardMaterial({ color: 0x141516, roughness: 0.6, metalness: 0.3 }),
    acrylic: new THREE.MeshPhysicalMaterial({ color: 0xe6f2ff, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
  };
  return MATS;
}

/* ---------------- narzędzia geometrii ---------------- */
// kształt w płaszczyźnie (sx, sy) wyciągnięty wzdłuż sz → świat (x = sz, y = sx, z = sy): kąt w kształcie = kąt obrotu wokół +x
const PERM = new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);
export function extrude(shape, w, bevel = 0.0006, curve = 24) {
  // fazowanie do środka (bevelOffset = −bevelSize): obrys i otwory mają wymiar nominalny — bez tego koło jest grubsze, a otwory
  // ciaśniejsze o fazę (zęby współpracujących kół i wały w otworach wchodziły w siebie)
  // drobne kształty (małe zęby): faza nie większa niż pół średniego odcinka obrysu — inaczej przesunięty do środka obrys się przecina
  { const pts = shape.getPoints(curve); let per = 0; for (let i = 0; i < pts.length; i++) per += pts[i].distanceTo(pts[(i + 1) % pts.length]); bevel = Math.min(bevel, 0.3 * per / Math.max(1, pts.length)); }
  const g = new THREE.ExtrudeGeometry(shape, { depth: w - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 1, curveSegments: curve });
  g.translate(0, 0, -(w - 2 * bevel) / 2).applyMatrix4(PERM);
  return uvScale(g, 6);
}
export function uvScale(g, s) { const uv = g.attributes.uv; if (uv) { for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s); } return g; }
export const cyl = (r, len, seg = 32, r2 = r) => uvScale(new THREE.CylinderGeometry(r2, r, len, seg).rotateZ(-Math.PI / 2), 1);   // wzdłuż +x (r na −x… r2 na +x)
export const lathe = (pts, seg = 48) => uvScale(new THREE.LatheGeometry(pts.map(([r, x]) => new THREE.Vector2(r, x)), seg).rotateZ(-Math.PI / 2), 3);
export const mesh = (g, m, shadow = true) => { const o = new THREE.Mesh(g, m); o.castShadow = shadow; o.receiveShadow = true; return o; };
export const circlePath = (r, n = 40, x = 0, y = 0) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, TAU, true); return p; };
// otwór z rowkiem na wpust (wpust b ≈ r/2, głębokość r/4)
export function boreHole(r) {
  const p = new THREE.Path(), b = Math.max(0.002, r * 0.5) / 2, a = Math.asin(Math.min(0.9, b / r));
  p.moveTo(r * Math.cos(a), b); p.lineTo(r + r * 0.28, b); p.lineTo(r + r * 0.28, -b); p.lineTo(r * Math.cos(a), -b);
  p.absarc(0, 0, r, -a, -TAU + a, true);
  return p;
}
export const box = (sx, sy, sz) => uvScale(new THREE.BoxGeometry(sx, sy, sz), 4);
export function newPart(name, extra = {}) { const group = new THREE.Group(), spin = new THREE.Group(); group.add(spin); group.name = name; group.userData.spin = spin; Object.assign(group.userData, extra); return group; }
// rodzaje portów (dziedziny): każdy port ma dziedzinę (to, co przenosi) i złącze (jak się łączy). Połączyć można złącza
// tej samej nazwy; dziedziny mogą się różnić tylko w połączeniu, które zamienia ruch (listwa, śruba, korba)
export const DOMAIN = { rot: 'obrót', lin: 'przesuw', el: 'prąd', sig: 'sygnał', fluid: 'płyn', light: 'światło' };
export const port = (name, domain, iface, extra = {}) => ({ name, domain, iface, ...extra });
// pierścień (rura krótka) wzdłuż osi x / y: otwór ri, zewnętrzny ro, szerokość w — do opraw, oczek, tulei (zamiast brył)
export const ringX = (ri, ro, w, seg = 40) => lathe([[ri, -w / 2], [ro, -w / 2], [ro, w / 2], [ri, w / 2], [ri, -w / 2]], seg);
export const ringY = (ri, ro, h, seg = 32) => uvScale(new THREE.LatheGeometry([[ri, -h / 2], [ro, -h / 2], [ro, h / 2], [ri, h / 2], [ri, -h / 2]].map(([r, y]) => new THREE.Vector2(r, y)), seg), 3);
