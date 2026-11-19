// Piec na papier i drewno (spalarka): stalowa skrzynia 2,4 × 2,2 × 2,0 m na cokole, wyłożona cegłą szamotową,
// otwór wsadowy 1,2 × 0,8 m z otwartymi drzwiami i pochyłą tacą (przedmiot położony na tacy zsuwa się do środka),
// ruszt z żarem pod spodem, szuflada popielnika, komin Ø 40 cm z daszkiem, żaluzje, termometr, nity na krawędziach.
// Układ lokalny: środek podstawy w (0,0,0), front w stronę +z.
import * as THREE from '../../../../vendor/three/three.module.js';
import { merge, part, place, uvMeters, roundedBox, lathe } from '../geom.js';
import { mat } from '../materials.js';

const W = 2.4, H = 2.2, D = 2.0, T = 0.08, B = 0.15;       // szer., wys., głęb., grubość ścian, cokół
const OW = 1.2, OH = 0.8, OY = 0.95;                      // otwór wsadowy: szer., wys., wysokość progu
export const LAYOUT = {
  size: [W, H + B, D],
  opening: { center: [0, B + OY + OH / 2, D / 2], size: [OW, OH] },
  burn: { center: [0, B + 0.75, -0.05], half: [W / 2 - T - 0.12, 0.6, D / 2 - T - 0.15] },  // strefa spalania
  fire: [0, B + 0.42, -0.05],
  chimneyTop: [0, B + H + 6.2, -D / 2 + 0.45],
};

const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d); uvMeters(g, 1); return place(g, [x, y, z], [rx, ry, rz]); };

function shell() {
  const y0 = B, out = [];
  out.push(box(W, H, T, 0, y0 + H / 2, -D / 2 + T / 2));                       // tył
  out.push(box(T, H, D - 2 * T, -W / 2 + T / 2, y0 + H / 2, 0));               // boki
  out.push(box(T, H, D - 2 * T, W / 2 - T / 2, y0 + H / 2, 0));
  out.push(box(W, T, D, 0, y0 + H - T / 2, 0));                                // dach
  // front z otworem
  const z = D / 2 - T / 2;
  out.push(box(W, OY, T, 0, y0 + OY / 2, z));
  out.push(box(W, H - OY - OH, T, 0, y0 + OY + OH + (H - OY - OH) / 2, z));
  const sw = (W - OW) / 2;
  out.push(box(sw, OH, T, -W / 2 + sw / 2, y0 + OY + OH / 2, z));
  out.push(box(sw, OH, T, W / 2 - sw / 2, y0 + OY + OH / 2, z));
  return merge(out);
}
function lining() {   // wykładzina szamotowa (10 cm) wewnątrz, z otworem
  const y0 = B, t = 0.1, iw = W - 2 * T, id = D - 2 * T, ih = H - 2 * T, out = [];
  out.push(box(iw, ih, t, 0, y0 + T + ih / 2, -D / 2 + T + t / 2));
  out.push(box(t, ih, id - 2 * t, -iw / 2 + t / 2, y0 + T + ih / 2, 0));
  out.push(box(t, ih, id - 2 * t, iw / 2 - t / 2, y0 + T + ih / 2, 0));
  out.push(box(iw, t, id, 0, y0 + H - T - t / 2, 0));
  out.push(box(iw, t, id, 0, y0 + T / 2 + 0.001, 0));   // spód komory
  const z = D / 2 - T - t / 2, sw = (iw - OW) / 2;
  out.push(box(iw, OY - T, t, 0, y0 + T + (OY - T) / 2, z));
  out.push(box(iw, H - T - OY - OH, t, 0, y0 + OY + OH + (H - T - OY - OH) / 2, z));
  out.push(box(sw, OH, t, -iw / 2 + sw / 2, y0 + OY + OH / 2, z));
  out.push(box(sw, OH, t, iw / 2 - sw / 2, y0 + OY + OH / 2, z));
  // ościeże otworu (szamot w grubości ściany)
  return merge(out);
}
function grate(lod) {
  const out = [], y = B + 0.45, iw = W - 2 * T - 0.2, n = lod ? 6 : 14;
  for (let i = 0; i < n; i++) out.push(box(0.04, 0.06, D - 2 * T - 0.22, -iw / 2 + (i + 0.5) * iw / n, y, -0.02));
  out.push(box(iw + 0.02, 0.08, 0.06, 0, y - 0.07, D / 2 - T - 0.16), box(iw + 0.02, 0.08, 0.06, 0, y - 0.07, -D / 2 + T + 0.12));
  return merge(out);
}
function embers() {   // żar pod rusztem (świeci)
  const g = new THREE.BoxGeometry(W - 2 * T - 0.24, 0.12, D - 2 * T - 0.3, 8, 1, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, p.getY(i) + Math.sin(p.getX(i) * 9) * Math.cos(p.getZ(i) * 7) * 0.03);
  g.computeVertexNormals();
  return place(g, [0, B + 0.2 + 0.06, -0.03]);
}
function tray() {   // taca wsadowa: blacha pochylona do otworu, rant boczny, wsporniki
  const out = [], L = 0.85, ang = 0.42, z0 = D / 2, y0 = B + OY;
  const cz = z0 + Math.cos(ang) * L / 2, cy = y0 + Math.sin(ang) * L / 2 + 0.01;
  out.push(box(OW + 0.1, 0.012, L, 0, cy, cz, -ang, 0, 0));
  for (const s of [-1, 1]) out.push(box(0.012, 0.12, L, s * (OW / 2 + 0.05), cy + 0.055, cz, -ang, 0, 0));
  for (const s of [-1, 1]) out.push(box(0.05, Math.sin(ang) * L + 0.02, 0.05, s * (OW / 2 - 0.05), y0 - 0.15 + (Math.sin(ang) * L) / 2, z0 + Math.cos(ang) * L - 0.05, -0.35, 0, 0));
  return merge(out);
}
function door() {   // drzwi otwarte na zawiasach po lewej, z uchwytem
  const g = new THREE.Group(); g.name = 'drzwi';
  const plate = roundedBox(OW + 0.1, OH + 0.1, 0.05, 0.01, 1); uvMeters(plate, 1);
  place(plate, [(OW + 0.1) / 2, 0, 0]);
  const hinge = (y) => place(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 12), [0, y, 0]);
  const handle = merge([box(0.03, 0.03, 0.12, OW - 0.05, 0, 0.07), box(0.03, 0.3, 0.03, OW - 0.05, 0, 0.12)]);
  const doorG = merge([plate, hinge(0.3), hinge(-0.3)]);
  return { plate: doorG, handle, at: [-OW / 2 - 0.05, B + OY + OH / 2, D / 2 + 0.03], ry: -1.85 };
}
function chimney(lod) {
  const x = 0, z = -D / 2 + 0.45, y0 = B + H, Hc = 6.0, r = 0.2, s = lod ? 12 : 32;
  const pipe = lathe([[0, y0 - 0.01], [r + 0.06, y0 - 0.01], [r + 0.06, y0 + 0.05], [r, y0 + 0.06], [r, y0 + Hc], [r + 0.03, y0 + Hc + 0.01], [r + 0.03, y0 + Hc + 0.06], [r - 0.008, y0 + Hc + 0.06], [r - 0.008, y0 + 0.3], [0, y0 + 0.3]], s);
  // daszek stożkowy na 3 nóżkach
  const cap = lathe([[0, y0 + Hc + 0.40], [r + 0.16, y0 + Hc + 0.235], [r + 0.16, y0 + Hc + 0.25], [0, y0 + Hc + 0.42]], s);
  const legs = [0, 1, 2].map((k) => box(0.02, 0.24, 0.02, Math.sin(k * 2.094) * (r + 0.01), y0 + Hc + 0.17, Math.cos(k * 2.094) * (r + 0.01)));
  return { pipe: place(merge([pipe, cap, ...legs]), [x, 0, z]) };
}
function details(lod) {
  const out = [];
  // żaluzje na bokach (wywietrzniki)
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) out.push(box(0.03, 0.05, 0.5, s * (W / 2 + 0.02), B + 1.55 + i * 0.07, -0.4, 0, 0, s * 0.6));
  // popielnik: szuflada z uchwytem
  out.push(box(0.9, 0.25, 0.04, 0, B + 0.22, D / 2 + 0.02), box(0.3, 0.03, 0.05, 0, B + 0.28, D / 2 + 0.06));
  // cokół (ceownik)
  out.push(box(W + 0.1, B, D + 0.1, 0, B / 2, 0));
  // termometr tarczowy
  out.push(place(lathe([[0, -0.03], [0.09, -0.03], [0.1, 0], [0.09, 0.03], [0, 0.03]], 24), [0.85, B + 1.9, D / 2 + 0.03], [Math.PI / 2, 0, 0]));
  // nity wzdłuż krawędzi frontu i boków
  if (!lod) {
    const riv = (x, y, z, rx, rz) => out.push(place(new THREE.SphereGeometry(0.012, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), [x, y, z], [rx, 0, rz]));
    for (let i = 0; i <= 16; i++) { const x = -W / 2 + 0.06 + i * (W - 0.12) / 16; riv(x, B + H - 0.05, D / 2, Math.PI / 2, 0); riv(x, B + 0.06, D / 2, Math.PI / 2, 0); }
    for (let i = 0; i <= 14; i++) { const y = B + 0.06 + i * (H - 0.11) / 14; riv(-W / 2 + 0.05, y, D / 2, Math.PI / 2, 0); riv(W / 2 - 0.05, y, D / 2, Math.PI / 2, 0); }
  }
  return merge(out);
}

export function build(lod = 0) {
  const g = new THREE.Group(); g.name = 'furnace-paper';
  g.add(part('obudowa', shell(), mat('rusty')));
  g.add(part('wykładzina szamotowa', lining(), mat('refractory')));
  g.add(part('ruszt', grate(lod), mat('steelDark')));
  const e = part('żar', embers(), mat('glowOrange')); e.castShadow = false; g.add(e);
  g.add(part('taca wsadowa', tray(), mat('steelPlate')));
  const d = door(), dg = new THREE.Group(); dg.name = 'drzwi';
  dg.add(part('drzwi', d.plate, mat('rusty')), part('uchwyt drzwi', d.handle, mat('steelDark')));
  dg.position.set(...d.at); dg.rotation.y = d.ry; g.add(dg);
  g.add(part('komin', chimney(lod).pipe, mat('steelDark')));
  g.add(part('detale', details(lod), mat('steelDark')));
  return g;
}

/** Zderzacze statyczne (lokalnie): ściany, dach, cokół, taca; otwór wolny, wnętrze puste nad rusztem. */
export function colliders() {
  const c = [], b = (w, h, d, x, y, z, rx = 0) => c.push({ kind: 'box', half: [w / 2, h / 2, d / 2], at: [x, y, z], rot: [rx, 0, 0] });
  b(W + 0.1, B, D + 0.1, 0, B / 2, 0);
  b(W, H, T + 0.1, 0, B + H / 2, -D / 2 + 0.09);
  b(T + 0.1, H, D, -W / 2 + 0.09, B + H / 2, 0); b(T + 0.1, H, D, W / 2 - 0.09, B + H / 2, 0);
  b(W, T + 0.1, D, 0, B + H - 0.09, 0);
  const z = D / 2 - 0.09, sw = (W - OW) / 2;
  b(W, OY, 0.18, 0, B + OY / 2, z); b(W, H - OY - OH, 0.18, 0, B + OY + OH + (H - OY - OH) / 2, z);
  b(sw, OH, 0.18, -W / 2 + sw / 2, B + OY + OH / 2, z); b(sw, OH, 0.18, W / 2 - sw / 2, B + OY + OH / 2, z);
  b(W - 0.2, 0.08, D - 0.2, 0, B + 0.45, 0);   // ruszt — przedmioty leżą na nim
  const L = 0.85, ang = 0.42;
  b(OW + 0.1, 0.03, L, 0, B + OY + Math.sin(ang) * L / 2, D / 2 + Math.cos(ang) * L / 2, -ang);
  c.push({ kind: 'box', half: [0.2, 3, 0.2], at: [0, B + H + 3, -D / 2 + 0.45] });
  return c;
}

export const info = { id: 'furnace-paper', name: 'Piec na papier i drewno', version: '1.0.0' };
