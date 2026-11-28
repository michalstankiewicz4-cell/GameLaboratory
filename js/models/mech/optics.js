// OptiKit — elementy optyczne (kategoria planu 5: optyka i sygnały). Lustro: płaskie, wklęsłe albo wypukłe (sferyczne),
// na podłożu szklanym, z powłoką odbijającą, w uchwycie kinematycznym (płyta przednia z gniazdem lustra, płyta tylna,
// dwie śruby regulacyjne z pokrętłami, sprężyny), na słupku Ø 12,7 mm w tulei z podstawą. Wymiary prawdziwe (lustra 1/2",
// 1", 2"). Oś optyczna lustra: +z (powierzchnia odbijająca patrzy w +z), wierzchołek powierzchni w punkcie
// userData.optics.vertex; obrót lustra wokół pionowej osi słupka — mirror.userData.api.setAngle(rad).
// Dane do śledzenia promieni (js/behaviors/land/mech/optics.js): userData.optics = { kind, shape, R (promień krzywizny, + wklęsłe),
// D, f (ogniskowa, + rzeczywista), coating, refl(λ) }, obiekt powierzchni: userData.optics.surface (jego macierz — układ lustra).
import * as THREE from '../../../vendor/three/three.module.js';
import { materials, DOMAIN } from './mechkit.js';

const mesh = (g, m, shadow = true) => { const o = new THREE.Mesh(g, m); o.castShadow = shadow; o.receiveShadow = true; return o; };
const port = (name, domain, iface) => ({ name, domain, iface });

// powłoki odbijające: współczynnik odbicia (padanie bliskie normalnemu) dla długości fali w nm — wartości katalogowe
// typowych powłok chronionych; między punktami — liniowo
export const COATINGS = {
  al: { name: 'aluminium chronione (Al + SiO₂)', color: 0xe9ecef, R: [[400, 0.90], [450, 0.905], [532, 0.895], [633, 0.885], [700, 0.875], [1064, 0.94]] },
  ag: { name: 'srebro chronione (Ag + warstwa ochronna)', color: 0xf5f4f1, R: [[400, 0.88], [450, 0.94], [532, 0.975], [633, 0.98], [700, 0.982], [1064, 0.985]] },
  au: { name: 'złoto chronione (Au)', color: 0xf0c060, R: [[400, 0.38], [450, 0.38], [532, 0.62], [633, 0.94], [700, 0.96], [1064, 0.98]] },
  diel: { name: 'dielektryczna szerokopasmowa (400–700 nm)', color: 0xdfe8f2, R: [[380, 0.6], [400, 0.99], [700, 0.99], [740, 0.5], [1064, 0.08]] },
};
export const SUBSTRATES = { bk7: { name: 'szkło N-BK7', rho: 2510, color: 0xc9e3dc }, fs: { name: 'krzemionka topiona (UVFS)', rho: 2200, color: 0xe4eef0 }, zerodur: { name: 'Zerodur (rozszerzalność ~0)', rho: 2530, color: 0xd9b88c } };
export function reflectance(coating, nm) {
  const T = (COATINGS[coating] || COATINGS.al).R;
  if (nm <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (nm <= T[i][0]) { const [a, ra] = T[i - 1], [b, rb] = T[i]; return ra + (rb - ra) * (nm - a) / (b - a); }
  return T[T.length - 1][1];
}
// grubość podłoża wg typowych katalogów: 1/2" — 6 mm, 1" — 6 mm, 2" — 12 mm
const THICK = (D) => (D > 0.04 ? 0.012 : 0.006);

export function mirror({ shape = 'flat', D = 0.0254, R = 0.2, coating = 'al', substrate = 'bk7', name } = {}) {
  const M = materials(), g = new THREE.Group();
  const kind = { flat: 'płaskie', concave: 'wklęsłe', convex: 'wypukłe' }[shape] || 'płaskie';
  g.name = name || `Lustro ${kind} Ø ${Math.round(D / 0.0254 * 2) / 2 === 0.5 ? '1/2"' : D > 0.04 ? '2"' : '1"'}`;
  const t = THICK(D), r = D / 2, Rs = shape === 'concave' ? R : shape === 'convex' ? -R : Infinity;
  const sag = (q) => (Number.isFinite(Rs) ? Math.sign(Rs) * (Math.abs(Rs) - Math.sqrt(Rs * Rs - q * q)) : 0);   // + wklęsłe: brzeg wysunięty do przodu
  // podłoże: profil toczony (oś y), potem obrócony tak, by oś lustra szła w +z; przód — czasza, tył płaski, faza 0,3 mm
  const N = 40, prof = [];
  prof.push(new THREE.Vector2(0, -t));
  prof.push(new THREE.Vector2(r - 0.0003, -t)); prof.push(new THREE.Vector2(r, -t + 0.0003));
  const edgeFront = sag(r) - 0.0003;
  prof.push(new THREE.Vector2(r, Math.min(edgeFront, sag(r) - 0.0003)));
  const glass = new THREE.MeshPhysicalMaterial({ color: (SUBSTRATES[substrate] || SUBSTRATES.bk7).color, roughness: 0.08, metalness: 0, transmission: 0.6, thickness: t, ior: 1.517, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const body = new THREE.LatheGeometry(prof, 48).rotateX(Math.PI / 2);   // oś toczenia y → z (przód +z)
  const sub = mesh(body, glass);
  const cap = [];
  for (let i = N; i >= 0; i--) { const q = (r - 0.0003) * i / N; cap.push(new THREE.Vector2(q, sag(q))); }
  const front = new THREE.LatheGeometry(cap, 64).rotateX(Math.PI / 2);
  const C = COATINGS[coating] || COATINGS.al;
  const coat = new THREE.MeshPhysicalMaterial({ color: C.color, metalness: coating === 'diel' ? 0.85 : 1, roughness: 0.015, envMapIntensity: 1.2, side: THREE.DoubleSide });
  const surface = mesh(front, coat, false);
  // uchwyt kinematyczny (wymiary jak typowe uchwyty 1": płyty 38 × 38 mm), skalowany do średnicy lustra
  const k = Math.max(0.75, D / 0.0254), P = 0.038 * k, M2 = M.black;
  const optic = new THREE.Group(); optic.add(sub, surface);   // lustro w gnieździe płyty przedniej, przód 1 mm przed płytą
  const plate = new THREE.Shape(); plate.moveTo(-P / 2, -P / 2); plate.lineTo(P / 2, -P / 2); plate.lineTo(P / 2, P / 2); plate.lineTo(-P / 2, P / 2); plate.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0, r + 0.0002, 0, Math.PI * 2, true); plate.holes.push(hole);
  const tp = 0.009 * Math.min(1.3, k), front3 = mesh(new THREE.ExtrudeGeometry(plate, { depth: tp, bevelEnabled: false, curveSegments: 48 }), M2);
  front3.position.z = -tp - 0.001;
  const back = new THREE.Shape(); back.moveTo(-P / 2, -P / 2); back.lineTo(P / 2, -P / 2); back.lineTo(P / 2, P / 2); back.lineTo(-P / 2, P / 2); back.closePath();
  const tb = 0.006, back3 = mesh(new THREE.ExtrudeGeometry(back, { depth: tb, bevelEnabled: false }), M2); back3.position.z = -tp - 0.001 - 0.004 - tb;
  // dwie śruby regulacyjne (pochylenie i obrót) w narożnikach i sprężyny między płytami; trzeci narożnik — kulka (punkt obrotu)
  const brass = M.brass, steel = M.steel, adj = new THREE.Group();
  for (const [x, y] of [[P / 2 - 0.006, P / 2 - 0.006], [-(P / 2 - 0.006), -(P / 2 - 0.006)]]) {
    const scr = mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.018, 12).rotateX(Math.PI / 2), steel); scr.position.set(x, y, back3.position.z - 0.004); adj.add(scr);
    const knob = mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.008, 24).rotateX(Math.PI / 2), brass); knob.position.set(x, y, back3.position.z - 0.012); adj.add(knob);
  }
  for (const [x, y] of [[-(P / 2 - 0.006), P / 2 - 0.006], [P / 2 - 0.006, -(P / 2 - 0.006)]]) {
    const spr = mesh(new THREE.TorusGeometry(0.0022, 0.0004, 6, 16).rotateX(0), steel); spr.position.set(x * 0.85, y * 0.85, back3.position.z + tb + 0.002); adj.add(spr);
  }
  const ball = mesh(new THREE.SphereGeometry(0.002, 12, 8), steel); ball.position.set(-(P / 2 - 0.006), -(P / 2 - 0.006), back3.position.z + tb + 0.002);
  // ramię pod słupek (w dół z płyty tylnej) — punkt mocowania słupka pod środkiem lustra
  const armZ0 = back3.position.z, armZ1 = 0.0065;   // od tyłu płyty tylnej do słupka (oś słupka w z = 0, Ø 12,7)
  const arm = mesh(new THREE.BoxGeometry(0.012, 0.012, armZ1 - armZ0), M2); arm.position.set(0, -P / 2 - 0.006, (armZ0 + armZ1) / 2);
  const head = new THREE.Group(); head.add(optic, front3, back3, adj, ball, arm);   // to, co się obraca na słupku
  // słupek Ø 12,7 w tulei Ø 19, podstawa z wycięciem pod śrubę M6
  const yc = P / 2 + 0.012 + 0.05 + 0.04;   // oś lustra nad stołem
  head.position.y = yc;
  const postL = 0.05 + 0.006, post = mesh(new THREE.CylinderGeometry(0.00635, 0.00635, postL, 24), steel); post.position.y = yc - P / 2 - 0.012 - postL / 2 + 0.006;
  const holder = mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.05, 32), M2); holder.position.y = 0.01 + 0.025;
  const thumb = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.01, 12).rotateZ(Math.PI / 2), M2); thumb.position.set(0.013, 0.045, 0);
  const bs = new THREE.Shape(); bs.moveTo(-0.0125, -0.0375); bs.lineTo(0.0125, -0.0375); bs.lineTo(0.0125, 0.0375); bs.lineTo(-0.0125, 0.0375); bs.closePath();
  const slot = new THREE.Path(); slot.moveTo(-0.0033, -0.03); slot.lineTo(-0.0033, -0.012); slot.absarc(0, -0.012, 0.0033, Math.PI, 0, true); slot.lineTo(0.0033, -0.03); slot.absarc(0, -0.03, 0.0033, 0, Math.PI, true); bs.holes.push(slot);
  const base = mesh(new THREE.ExtrudeGeometry(bs, { depth: 0.01, bevelEnabled: false }).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), M2);
  const turn = new THREE.Group(); turn.add(head, post); g.add(turn, holder, thumb, base);
  const mass = Math.PI * r * r * t * (SUBSTRATES[substrate] || SUBSTRATES.bk7).rho;
  g.userData = {
    optics: { kind: 'mirror', shape, R: Number.isFinite(Rs) ? Rs : Infinity, D, t, f: Number.isFinite(Rs) ? Rs / 2 : Infinity, coating, substrate, sag: sag(r), surface, refl: (nm) => reflectance(coating, nm), flatness: 'λ/10 przy 633 nm' },
    mass: mass + 0.12 * k * k, glassMass: mass, axisY: yc,
    ports: { in: port('Promień padający', DOMAIN.light, 'promień'), out: port('Promień odbity', DOMAIN.light, 'promień'), mount: port('Podstawa (mocowanie, śruba M6)', DOMAIN.rot, 'mocowanie') },
    api: { setAngle: (a) => { turn.rotation.y = a; } },
  };
  return g;
}
