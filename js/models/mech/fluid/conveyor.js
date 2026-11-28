// FluidKit — transport:
//   beltConveyor — przenośnik taśmowy: rama z profili aluminiowych (rowek), bęben napędowy i zwrotny, taśma PVC (pętla
//                  z łukami na bębnach, tekstura przesuwa się z ruchem), nogi, motoreduktor przy bębnie napędowym (+x).
//                  Wzdłuż +x od x = 0 do L, środek taśmy w z = 0, wierzch taśmy w y = top, spód nóg y = 0. setBelt(s) — droga taśmy.
//   carton       — karton z taśmą klejącą (kostka s), środek w (0, s/2, 0).
//   magazine     — magazyn pionowy: 4 kątowniki na rogach kartonu i rama górna; stoi na stole podajnika (y = 0 — wierzch stołu).
//   feedTable    — stół podajnika: blacha na nogach, wierzch w y = top, wzdłuż +x od 0 do L.
//   bin          — pojemnik (skrzynka z tworzywa, otwarta u góry), spód y = 0.
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, TAU, mesh, port, canvasTex } from '../common.js';
import { fluidMaterials } from './util.js';

const cylZ = (r, len, seg = 32) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2);

export function beltConveyor({ L = 0.7, w = 0.1, top = 0.16, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), r = 0.02, yb = top - r - 0.0015, pr = 0.02;
  g.name = name || `${EN ? 'Belt conveyor' : 'Przenośnik taśmowy'} ${Math.round(L * 1000)} × ${Math.round(w * 1000)}`;
  // tekstura taśmy (poprzeczne prążki) — przesuwana
  const bt = canvasTex(64, 256, (c, ww, h) => { c.fillStyle = '#26332c'; c.fillRect(0, 0, ww, h); c.fillStyle = '#1b2520'; for (let i = 0; i < 16; i++) c.fillRect(0, i * 16, ww, 6); });
  bt.t.wrapS = bt.t.wrapT = THREE.RepeatWrapping; bt.t.repeat.set(1, (2 * L + TAU * r) / 0.064);
  const beltM = new THREE.MeshStandardMaterial({ map: bt.t, roughness: 0.85, metalness: 0 });
  // pętla taśmy: górny i dolny odcinek, łuki na bębnach — jedna bryła z obrysu wyciągniętego na szerokość
  const outer = new THREE.Shape(), rr = r + 0.0015;
  outer.moveTo(0, yb + rr); outer.lineTo(L, yb + rr); outer.absarc(L, yb, rr, Math.PI / 2, -Math.PI / 2, true); outer.lineTo(0, yb - rr); outer.absarc(0, yb, rr, -Math.PI / 2, -3 * Math.PI / 2, true);
  const inner = new THREE.Path(); inner.moveTo(0, yb + r); inner.absarc(0, yb, r, Math.PI / 2, 3 * Math.PI / 2, false); inner.lineTo(L, yb - r); inner.absarc(L, yb, r, -Math.PI / 2, Math.PI / 2, false); inner.closePath(); outer.holes.push(inner);
  const bg = new THREE.ExtrudeGeometry(outer, { depth: w, bevelEnabled: false, curveSegments: 24 }).translate(0, 0, -w / 2);
  { const uv = bg.attributes.uv, pos = bg.attributes.position; for (let i = 0; i < uv.count; i++) { const x = pos.getX(i), y = pos.getY(i); const s = y > yb ? x : y < yb ? 2 * L - x + Math.PI * r : x < L / 2 ? 2 * L + Math.PI * r + Math.atan2(yb - y, -x) * r : L + Math.atan2(y - yb, x - L) * r; uv.setXY(i, pos.getZ(i) / w, s / (2 * L + TAU * r)); } }
  const belt = mesh(bg, beltM); g.add(belt);
  // bębny (stal) z czopami
  const drums = [];
  for (const x of [0, L]) { const dr = mesh(cylZ(r - 0.0002, w + 0.004, 32), F.steel); dr.position.set(x, yb, 0); g.add(dr); drums.push(dr); const ax = mesh(cylZ(0.006, w + 0.054, 16), F.steelP); ax.position.set(x, yb, 0); ax.userData.doctorOk = 'clash'; g.add(ax); }
  // rama: dwa profile boczne (40 × 20 z rowkiem), poprzeczki, nogi 40 × 40
  for (const sz of [-1, 1]) {
    const z = sz * (w / 2 + 0.005 + 0.01), side = mesh(new THREE.BoxGeometry(L + 0.06, 0.04, 0.02), F.alu); side.position.set(L / 2, yb, z); g.add(side);
    const slot = mesh(new THREE.BoxGeometry(L + 0.06, 0.006, 0.0012), F.dark); slot.position.set(L / 2, yb, z + sz * 0.0101); g.add(slot);
    for (const x of [0.05, L - 0.05]) { const leg = mesh(new THREE.BoxGeometry(0.03, yb - 0.026, 0.03), F.alu); leg.position.set(x, 0.006 + (yb - 0.026) / 2, z); g.add(leg); const ft = mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.006, 20), F.rubber); ft.position.set(x, 0.003, z); ft.userData.doctorOk = 'clash'; g.add(ft); }
  }
  for (const x of [0.05, L - 0.05]) { const cr = mesh(new THREE.BoxGeometry(0.02, 0.02, w + 0.03), F.alu); cr.position.set(x, 0.05, 0); g.add(cr); }
  // ślizg pod taśmą (blacha) między bębnami
  const bed = mesh(new THREE.BoxGeometry(L - 2 * r - 0.004, 0.004, w), F.steel); bed.position.set(L / 2, yb + r - 0.003, 0); g.add(bed);
  // motoreduktor przy bębnie +x (strona −z): przekładnia ślimakowa + silnik
  const gm = new THREE.Group(); gm.position.set(L, yb, -(w / 2 + 0.025)); g.add(gm);
  const gb = mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), F.hydPaint); gb.position.z = -0.02; gm.add(gb);
  const mo = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.09, 28), F.hydPaint); mo.position.set(0, -0.06 - 0.03 + 0.03, -0.02); mo.rotation.z = 0; mo.position.set(0.0, 0.03 + 0.045, -0.02); gm.add(mo);
  const fan = mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.015, 28), F.black); fan.position.set(0, 0.03 + 0.09 + 0.0075, -0.02); gm.add(fan);
  const setBelt = (s) => { bt.t.offset.y = -s / (2 * L + TAU * r); drums.forEach((d) => (d.rotation.z = -s / r)); };
  g.userData = { L, w, top, r, setBelt, mass: 6 + L * 8,
    ports: { drive: port(EN ? 'Gear motor 0.12 kW' : 'Motoreduktor 0,12 kW', DOMAIN.el, 'zacisk'), load: port(EN ? 'Belt — load' : 'Taśma — ładunek', DOMAIN.lin, 'tarcie') } };
  return g;
}

export function carton({ s = 0.06, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(); g.name = name || `${EN ? 'Carton' : 'Karton'} ${Math.round(s * 1000)} mm`;
  const tt = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#b08a58'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(80,55,25,0.25)'; for (let i = 0; i < 40; i++) c.fillRect(0, Math.random() * h, w, 1); c.fillStyle = '#d9c9a0'; c.fillRect(w * 0.4, 0, w * 0.2, h); c.strokeStyle = '#3a2a14'; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 96); c.lineTo(20, 70); c.lineTo(14, 76); c.moveTo(20, 70); c.lineTo(26, 76); c.stroke(); });
  const m = new THREE.MeshStandardMaterial({ map: tt.t, roughness: 0.92, metalness: 0 });
  const b = mesh(new THREE.BoxGeometry(s, s, s), m); b.position.y = s / 2; g.add(b);
  g.userData = { s, mass: 0.4 };
  return g;
}

export function magazine({ s = 0.06, n = 4, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), c = 0.0025, a = 0.012, H = (n + 0.6) * s;
  g.name = name || (EN ? 'Gravity magazine' : 'Magazyn grawitacyjny');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (s / 2 + c), z = sz * (s / 2 + c), y0 = s * 1.15;   // od wysokości kartonu nad stołem (przejście dla popychacza)
    const w1 = mesh(new THREE.BoxGeometry(a, H - y0, 0.002), F.steel); w1.position.set(x + sx * a / 2, y0 + (H - y0) / 2, z + sz * 0.001); g.add(w1);
    const w2 = mesh(new THREE.BoxGeometry(0.002, H - y0, a), F.steel); w2.position.set(x + sx * 0.001, y0 + (H - y0) / 2, z + sz * a / 2); g.add(w2);
  }
  for (const y of [s * 1.15 + 0.004, H - 0.004]) for (const sz of [-1, 1]) { const b = mesh(new THREE.BoxGeometry(s + 2 * c + 2 * a, 0.008, 0.004), F.steel); b.position.set(0, y, sz * (s / 2 + c + 0.002 + 0.0001)); b.userData.doctorOk = 'clash'; g.add(b); }
  // słupki od stołu do dolnej ramy (z boku, za przejściem kartonu)
  for (const sz of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(0.012, s * 1.15, 0.012), F.steel); p.position.set(-(s / 2 + c + a / 2), s * 1.15 / 2, sz * (s / 2 + c + a)); g.add(p); }
  g.userData = { s, n, H, mass: 1.2 };
  return g;
}

export function feedTable({ L = 0.12, w = 0.1, top = 0.16, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(); g.name = name || (EN ? 'Feed table' : 'Stół podajnika');
  const pl = mesh(new THREE.BoxGeometry(L, 0.006, w), F.steel); pl.position.set(L / 2, top - 0.003, 0); g.add(pl);
  for (const x of [0.012, L - 0.012]) for (const sz of [-1, 1]) { const leg = mesh(new THREE.BoxGeometry(0.016, top - 0.006, 0.016), F.alu); leg.position.set(x, (top - 0.006) / 2, sz * (w / 2 - 0.008)); g.add(leg); }
  g.userData = { L, w, top, mass: 1.5 };
  return g;
}

export function bin({ L = 0.16, W = 0.14, H = 0.09, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), t = 0.004; g.name = name || (EN ? 'Collection bin' : 'Pojemnik odbiorczy');
  const b = mesh(new THREE.BoxGeometry(L, t, W), F.crate); b.position.y = t / 2; g.add(b);
  for (const [sx, sz, lx, lz] of [[0, 1, L, t], [0, -1, L, t], [1, 0, t, W - 2 * t], [-1, 0, t, W - 2 * t]]) { const w = mesh(new THREE.BoxGeometry(lx, H - t, lz), F.crate); w.position.set(sx * (L / 2 - t / 2), t + (H - t) / 2, sz * (W / 2 - t / 2)); g.add(w); }
  g.userData = { L, W, H, t, mass: 0.6 };
  return g;
}
