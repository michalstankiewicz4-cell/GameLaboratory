// Punkt skupu przy bramie: kontener biurowy 6 × 2,45 × 2,6 m (blacha trapezowa) z oknem i okienkiem kasowym,
// drzwi, klimatyzator, tablica „SKUP ZŁOMU” na dachu, waga platformowa 1,5 × 1,5 m z wyświetlaczem na słupku
// (położony przedmiot się waży), cennik na ścianie (sztabki i opony). Układ: środek podstawy kontenera w (0,0,0), front +x.
import * as THREE from '../../../vendor/three/three.module.js';
import { merge, part, place, uvMeters, roundedBox } from '../geom.js';
import { mat } from '../materials.js';

const L = 6.0, H = 2.6, D = 2.45;
export const LAYOUT = {
  scale: { center: [D / 2 + 1.3, 0.09, 0.6], half: [0.75, 0.06, 0.75] },   // waga: przedmioty na niej są wyceniane
  display: [D / 2 + 1.3 + 0.95, 1.5, 0.6],
  window: [D / 2 + 0.01, 1.25, 0.6],                                       // okienko kasowe (sprzedaż: E przy okienku)
  board: [D / 2 + 0.02, 1.6, -1.6],
  size: [D + 2.5, H + 1.2, L],
};
const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d); uvMeters(g, 1); return place(g, [x, y, z], [rx, ry, rz]); };
const rawBox = (w, h, d, x, y, z) => place(new THREE.BoxGeometry(w, h, d), [x, y, z]);   // UV 0…1 na ścianę (tablice)

function container() {
  const o = [], ribs = [];
  o.push(box(D, H, L, 0, H / 2 + 0.1, 0));
  // przetłoczenia blachy trapezowej (pionowe żebra) na długich ścianach
  for (const s of [-1, 1]) for (let i = 0; i < 26; i++) { const z = -L / 2 + 0.2 + i * (L - 0.4) / 25; if (s > 0 && Math.abs(z - 0.6) < 0.75) continue; if (s > 0 && Math.abs(z + 1.6) < 0.6) continue; ribs.push(box(0.03, H - 0.3, 0.07, s * (D / 2 + 0.015), H / 2 + 0.1, z)); }
  // naroża (słupki ramy) i belki dachu/podłogi
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.push(box(0.16, H + 0.02, 0.16, sx * (D / 2 - 0.06), H / 2 + 0.1, sz * (L / 2 - 0.06)));
  for (const y of [0.1, H + 0.1]) for (const sx of [-1, 1]) o.push(box(0.14, 0.16, L, sx * (D / 2 - 0.05), y, 0));
  // bloczki betonowe pod narożami
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.push(box(0.4, 0.12, 0.4, sx * (D / 2 - 0.15), 0.06, sz * (L / 2 - 0.2)));
  return { body: merge(o), ribs: merge(ribs) };
}
function openings() {
  const frame = [], glass = [], door = [];
  const [wx, wy, wz] = LAYOUT.window;
  frame.push(box(0.06, 0.08, 1.4, wx + 0.02, wy + 0.56, wz), box(0.06, 0.08, 1.4, wx + 0.02, wy - 0.36, wz), box(0.06, 1.0, 0.08, wx + 0.02, wy + 0.1, wz - 0.66), box(0.06, 1.0, 0.08, wx + 0.02, wy + 0.1, wz + 0.66));
  frame.push(box(0.35, 0.04, 1.3, wx + 0.18, wy - 0.33, wz));                 // parapet / lada okienka
  glass.push(box(0.01, 0.62, 1.24, wx + 0.01, wy + 0.22, wz));                 // szyba (dół otwarty — okienko kasowe)
  frame.push(box(0.03, 0.04, 1.3, wx + 0.03, wy - 0.12, wz));
  // drzwi na krótszej ścianie (+z) i okno boczne
  door.push(box(0.9, 2.0, 0.05, 0.4, 1.12, L / 2 + 0.02), box(0.04, 0.15, 0.06, 0.75, 1.15, L / 2 + 0.06));
  glass.push(box(0.6, 0.5, 0.01, 0.4, 1.7, L / 2 + 0.05));
  // klimatyzator
  frame.push(roundedBox(0.8, 0.5, 0.3, 0.02, 1)); place(frame[frame.length - 1], [-0.3, 2.0, -L / 2 - 0.16]); uvMeters(frame[frame.length - 1], 1);
  return { frame: merge(frame), glass: merge(glass), door: merge(door) };
}
function sign() {   // tablica na dachu na dwóch słupkach
  const o = [box(0.08, 0.9, 0.08, 0, H + 0.6, -1.5), box(0.08, 0.9, 0.08, 0, H + 0.6, 1.5)];
  const board = rawBox(0.06, 1.0, 4.0, 0.06, H + 0.95, 0);
  return { posts: merge(o), board };
}
function scale() {
  const { center: [cx, cy, cz], half: [hx, hy, hz] } = LAYOUT.scale, o = [];
  const plate = box(hx * 2, hy * 2, hz * 2, cx, cy, cz); o.push(box(hx * 2 + 0.1, 0.03, hz * 2 + 0.1, cx, 0.015, cz));
  const [dx, dy, dz] = LAYOUT.display;
  o.push(box(0.08, dy - 0.15, 0.08, dx, (dy - 0.15) / 2, dz));
  const head = roundedBox(0.12, 0.3, 0.5, 0.02, 1); place(head, [dx, dy, dz]); uvMeters(head, 1); o.push(head);
  const screen = box(0.01, 0.16, 0.38, dx - 0.065, dy + 0.02, dz);
  return { plate, frame: merge(o), screen };
}

export function build(lod = 0) {
  const g = new THREE.Group(); g.name = 'buyback';
  const c = container(); g.add(part('kontener', c.body, mat('paintGreen')), part('przetłoczenia', c.ribs, mat('paintGreen')));
  const o = openings(); g.add(part('ramy i klimatyzator', o.frame, mat('paintGrey')), part('szyby', o.glass, mat('glass')), part('drzwi', o.door, mat('paintGrey')));
  const s = sign(); g.add(part('słupki tablicy', s.posts, mat('steelDark')), part('tablica SKUP ZŁOMU', s.board, mat('signSkup')));
  const sc = scale(); g.add(part('waga — płyta', sc.plate, mat('treadPlate')), part('waga — rama i słupek', sc.frame, mat('paintGrey')));
  const scr = part('wyświetlacz wagi', sc.screen, mat('display')); g.add(scr);
  const board = part('cennik', rawBox(0.02, 0.9, 1.1, LAYOUT.board[0], LAYOUT.board[1], LAYOUT.board[2]), mat('priceBoard')); g.add(board);
  return g;
}
export function colliders() {
  const c = [{ kind: 'box', half: [D / 2, H / 2 + 0.05, L / 2], at: [0, H / 2 + 0.1, 0] }];
  const { center, half } = LAYOUT.scale; c.push({ kind: 'box', half: [half[0] + 0.05, half[1], half[2] + 0.05], at: center, tag: 'scale' });
  const [dx, dy, dz] = LAYOUT.display; c.push({ kind: 'box', half: [0.08, dy / 2 + 0.1, 0.25], at: [dx, dy / 2, dz] });
  c.push({ kind: 'box', half: [0.18, 0.03, 0.65], at: [LAYOUT.window[0] + 0.18, LAYOUT.window[1] - 0.33, LAYOUT.window[2]] });
  return c;
}
export const info = { id: 'buyback', name: 'Punkt skupu', version: '1.1.1' };
