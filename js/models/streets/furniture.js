// StreetKit — słupki, barierki, ekrany dźwiękochłonne wzdłuż trasy (buildBollards, buildRail, buildNoiseWall).
import * as THREE from '../../../vendor/three/three.module.js';
import { ONE, canvasTex, capEnd, inst, kitMat, mesh, ribbon, sample, stations, sweep, tubeAlong, wall } from './geom.js';
import { surface } from './surfaces.js';

/* ---------------- słupki, barierki, ekrany dźwiękochłonne ---------------- */
// Wszystko wzdłuż linii trasy (punkty jak w buildStreet, także [x, z, y]), przy odsunięciu `offset` m od osi (dodatnie —
// w lewo), na wysokości `y` nad trasą (np. wysokość chodnika).
//   BOLLARDS  steel — stalowy słupek blokujący Ø 114 mm, 1 m, z białymi pasami odblaskowymi; warsaw — żeliwny grafitowy
//             z pierścieniem i głowicą kulistą; concrete — betonowy walec Ø 0,6 m; delineator — słupek prowadzący U-1a
//             (biały, czarna opaska z odblaskiem) przy drogach poza miastem; chain — żeliwne słupki połączone stalowym
//             łańcuchem (ogniwa 6 cm, zwis 12 cm)
//   buildBollards(points, type, { offset, every, y, start }) → { group, count }
//   RAILS     u12a — barierka ochronna dla pieszych U-12a (rury Ø 60 w czerwono-białe pasy, 1,1 m); city — miejska
//             grafitowa z prętami pionowymi (1 m); guardrail — bariera energochłonna stalowa (prowadnica falista na
//             słupkach co 2 m, przekładki dystansowe) — prowadnica od strony jezdni
//   buildRail(points, type, { offset, y }) → { group, length }
//   NOISE     metal — kasety pochłaniające (aluminium, perforowane lico); glass — przezroczyste płyty PMMA z pionowymi
//             pasami przeciw ptakom; mixed — dół z kaset, góra przezroczysta. Słupy HEB 200 co 4 m, cokół betonowy 0,5 m
//   buildNoiseWall(points, type, { offset, height, y, plinth }) → { group, length }   plinth 0 — bez cokołu (na barierze)
export const BOLLARDS = {
  steel: { label: 'Stalowy blokujący', every: 1.5 }, warsaw: { label: 'Żeliwny grafitowy', every: 1.5 },
  chain: { label: 'Żeliwne z łańcuchem', every: 2 }, concrete: { label: 'Betonowy walec', every: 2 }, delineator: { label: 'Prowadzący U-1a', every: 25 },
};
export const RAILS = { u12a: { label: 'Ochronna U-12a (czerwono-biała)' }, city: { label: 'Miejska grafitowa' }, guardrail: { label: 'Bariera energochłonna (stalowa)' } };
export const NOISE = { metal: { label: 'Kasety pochłaniające' }, glass: { label: 'Przezroczysty (PMMA)' }, mixed: { label: 'Kasety z przeszkleniem u góry' } };


/** Słupki wzdłuż linii. */
export function buildBollards(points, type = 'steel', { offset = 0, every, y = 0, start } = {}) {
  const T = BOLLARDS[type] || BOLLARDS.steel, S = sample(points, 0.5), g = new THREE.Group(); g.name = 'słupki: ' + T.label;
  every = every || T.every;
  const M = stations(S, offset, every, start ?? every / 2, y);
  const white = kitMat('refl', () => new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.35, emissive: 0xffffff, emissiveIntensity: 0.08 }));
  if (type === 'warsaw' || type === 'chain') {
    const iron = kitMat('iron', () => new THREE.MeshStandardMaterial({ color: 0x2b2f31, roughness: 0.55, metalness: 0.55 }));
    g.add(inst(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 16).translate(0, 0.06, 0), iron, M));
    g.add(inst(new THREE.CylinderGeometry(0.065, 0.08, 0.86, 16).translate(0, 0.55, 0), iron, M));
    g.add(inst(new THREE.TorusGeometry(0.072, 0.014, 6, 16).rotateX(Math.PI / 2).translate(0, 0.84, 0), iron, M));
    g.add(inst(new THREE.SphereGeometry(0.075, 16, 10).translate(0, 1.0, 0), iron, M));
    if (type === 'chain') g.add(chainBetween(M, 0.74, 0.12));
  } else if (type === 'concrete') {
    const con = surface('concrete');
    g.add(inst(new THREE.CylinderGeometry(0.3, 0.3, 0.54, 24).translate(0, 0.27, 0), con, M));
    g.add(inst(new THREE.CylinderGeometry(0.25, 0.3, 0.06, 24).translate(0, 0.57, 0), con, M));
  } else if (type === 'delineator') {
    // U-1a: biały profil trapezowy 1 m nad ziemią, czarna opaska z odblaskiem od strony nadjeżdżających
    const pl = kitMat('delin', () => new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5 }));
    const blk = kitMat('black', () => new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.5 }));
    const red = kitMat('reflRed', () => new THREE.MeshStandardMaterial({ color: 0xd8261a, roughness: 0.3, emissive: 0xff2010, emissiveIntensity: 0.25 }));
    const sh = new THREE.Shape([new THREE.Vector2(-0.06, -0.05), new THREE.Vector2(0.06, -0.05), new THREE.Vector2(0.035, 0.05), new THREE.Vector2(-0.035, 0.05)]);
    const body = (h0, h1) => new THREE.ExtrudeGeometry(sh, { depth: h1 - h0, bevelEnabled: false }).rotateX(-Math.PI / 2).rotateY(Math.PI / 2).translate(0, h0, 0);
    g.add(inst(body(0, 0.72), pl, M)); g.add(inst(body(0.72, 0.97), blk, M)); g.add(inst(body(0.97, 1.0), pl, M));
    g.add(inst(new THREE.BoxGeometry(0.008, 0.18, 0.04).translate(-0.061, 0.845, 0), red, M, false));
  } else {
    const st = kitMat('bollardSteel', () => new THREE.MeshStandardMaterial({ color: 0x8e9498, roughness: 0.4, metalness: 0.8 }));
    g.add(inst(new THREE.CylinderGeometry(0.057, 0.057, 0.98, 16).translate(0, 0.49, 0), st, M));
    g.add(inst(new THREE.CylinderGeometry(0.05, 0.057, 0.02, 16).translate(0, 0.99, 0), st, M));
    for (const h of [0.78, 0.9]) g.add(inst(new THREE.CylinderGeometry(0.0585, 0.0585, 0.05, 16).translate(0, h, 0), white, M, false));
  }
  return { group: g, count: M.length };
}

// łańcuch między kolejnymi słupkami: ogniwa wzdłuż zwisającej krzywej (parabola), co drugie obrócone o 90°
function chainBetween(M, h, sag) {
  const L = 0.06, out = [], a = new THREE.Vector3(), b = new THREE.Vector3(), p = new THREE.Vector3(), d = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0);
  for (let i = 1; i < M.length; i++) {
    a.setFromMatrixPosition(M[i - 1]); b.setFromMatrixPosition(M[i]); a.y += h; b.y += h;
    const span = a.distanceTo(b), n = Math.max(2, Math.round(span / (L * 0.78)));
    const at = (u, v) => v.lerpVectors(a, b, u).setY(v.y - 4 * sag * u * (1 - u));
    for (let k = 0; k < n; k++) {
      at((k + 0.5) / n, p); at((k + 1) / n, d); d.sub(at(k / n, new THREE.Vector3())).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(X, d);
      if (k % 2) q.multiply(new THREE.Quaternion().setFromAxisAngle(X, Math.PI / 2));
      out.push(new THREE.Matrix4().compose(p.clone(), q, ONE));
    }
  }
  const link = new THREE.TorusGeometry(0.016, 0.0045, 5, 10).scale(1.55, 1, 1);
  return inst(link, kitMat('chain', () => new THREE.MeshStandardMaterial({ color: 0x8f9598, roughness: 0.35, metalness: 0.9 })), out, false);
}

/** Barierka albo bariera wzdłuż linii. */
export function buildRail(points, type = 'u12a', { offset = 0, y = 0 } = {}) {
  const S = sample(points, 0.5), g = new THREE.Group(); g.name = 'barierka: ' + (RAILS[type] || RAILS.u12a).label;
  const away = Math.sign(offset) || 1;   // na zewnątrz od osi; jezdnia po stronie −away
  if (type === 'guardrail') {
    const zn = kitMat('galv', () => new THREE.MeshStandardMaterial({ color: 0xb4b9bb, roughness: 0.38, metalness: 0.9, side: THREE.DoubleSide }));
    // prowadnica falista (profil A, wys. 0,31 m) — środek na 0,6 m, fale w stronę jezdni
    const W = [[0, -0.155], [0.02, -0.12], [0.085, -0.08], [0.06, -0.03], [0.02, 0], [0.06, 0.03], [0.085, 0.08], [0.02, 0.12], [0, 0.155]];
    g.add(mesh(sweep(S, W, offset, y + 0.6, -away), zn));
    const M = stations(S, offset + away * 0.2, 2, 1, y);
    g.add(inst(new THREE.BoxGeometry(0.1, 0.85, 0.1).translate(0, 0.425, 0), zn, M));                       // słupki sigma
    g.add(inst(new THREE.BoxGeometry(0.08, 0.3, 0.18).translate(0, 0.6, -away * 0.1), zn, M));              // przekładki
    return { group: g, length: S.L };
  }
  if (type === 'city') {
    const gr = kitMat('graphite', () => new THREE.MeshStandardMaterial({ color: 0x33383b, roughness: 0.5, metalness: 0.6 }));
    g.add(tubeAlong(S, offset, y + 1.0, 0.025, gr));
    g.add(tubeAlong(S, offset, y + 0.12, 0.015, gr));
    g.add(inst(new THREE.BoxGeometry(0.06, 1.0, 0.06).translate(0, 0.5, 0), gr, stations(S, offset, 2, 0, y)));
    g.add(inst(new THREE.CylinderGeometry(0.009, 0.009, 0.88, 6).translate(0, 0.56, 0), gr, stations(S, offset, 0.125, 0.0625, y), false));
    return { group: g, length: S.L };
  }
  // U-12a: rury w pasy czerwono-białe (po 0,5 m), słupki białe co 2 m, stopki
  const stripes = canvasTex(64, 8, (c, w, h) => { c.fillStyle = '#c8102e'; c.fillRect(0, 0, w / 2, h); c.fillStyle = '#f2f2ee'; c.fillRect(w / 2, 0, w / 2, h); }).clone();
  stripes.needsUpdate = true; stripes.repeat.set(Math.max(1, Math.round(S.L)), 1);
  const rm = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.4, metalness: 0.3 });
  const wm = kitMat('railWhite', () => new THREE.MeshStandardMaterial({ color: 0xf0f0ec, roughness: 0.45, metalness: 0.3 }));
  g.add(tubeAlong(S, offset, y + 1.1, 0.03, rm), tubeAlong(S, offset, y + 0.55, 0.03, rm));
  const M = stations(S, offset, 2, 0, y);
  g.add(inst(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 10).translate(0, 0.55, 0), wm, M));
  g.add(inst(new THREE.BoxGeometry(0.14, 0.01, 0.14).translate(0, 0.005, 0), wm, M));
  return { group: g, length: S.L };
}

// kasety ekranu: tekstura na 4 × 4 m (pas 0,5 m, ciemna spoina, perforacja lica)
function cassetteTex() {
  return canvasTex(256, 256, (c, w, h) => {
    const band = h / 8;
    for (let i = 0; i < 8; i++) {
      const y0 = i * band, gr = c.createLinearGradient(0, y0, 0, y0 + band);
      gr.addColorStop(0, '#6f8a68'); gr.addColorStop(0.5, '#5d7757'); gr.addColorStop(1, '#465c42');
      c.fillStyle = gr; c.fillRect(0, y0, w, band);
      c.fillStyle = 'rgba(15,20,15,0.35)';
      for (let y = y0 + 5; y < y0 + band - 4; y += 3) for (let x = (y % 2) + 1; x < w; x += 3) c.fillRect(x, y, 1, 1);
      c.fillStyle = '#26301f'; c.fillRect(0, y0 + band - 2, w, 2);
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0, y0, w, 1);
    }
  });
}
function glassTex() {
  return canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = 'rgba(190,215,220,0.16)'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(20,24,26,0.85)'; for (let x = 0; x < w; x += 6.4) c.fillRect(Math.round(x), 0, 1, h);   // pasy co 10 cm
    c.fillStyle = 'rgba(120,130,135,0.9)'; c.fillRect(0, 0, w, 2); c.fillRect(0, h - 2, w, 2);               // ramka płyty
  });
}

/** Ekran dźwiękochłonny wzdłuż linii. */
export function buildNoiseWall(points, type = 'metal', { offset = 0, height = 4, y = 0, plinth = 0.5 } = {}) {
  const S = sample(points, 0.5), g = new THREE.Group(); g.name = 'ekran: ' + (NOISE[type] || NOISE.metal).label;
  const con = surface('concrete'), P0 = plinth, T = 0.12, H = Math.max(P0 + 0.5, height);
  // cokół betonowy 0,3 m
  if (P0 > 0) g.add(mesh(wall(S, offset - 0.15, y, y + P0, -1, 2), con), mesh(wall(S, offset + 0.15, y, y + P0, 1, 2), con), mesh(ribbon(S, offset - 0.15, offset + 0.15, y + P0, 2), con));
  const cas = kitMat('cassette', () => new THREE.MeshStandardMaterial({ map: cassetteTex(), roughness: 0.55, metalness: 0.35 }));
  const gl = kitMat('pmma', () => new THREE.MeshStandardMaterial({ map: glassTex(), transparent: true, depthWrite: false, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide }));
  const alu = kitMat('alu', () => new THREE.MeshStandardMaterial({ color: 0x9da3a6, roughness: 0.4, metalness: 0.8 }));
  const split = type === 'glass' ? P0 : type === 'mixed' ? Math.min(H, P0 + 2) : H;
  if (split > P0) {
    g.add(mesh(wall(S, offset - T / 2, y + P0, y + split, -1, 4), cas), mesh(wall(S, offset + T / 2, y + P0, y + split, 1, 4), cas));
    g.add(mesh(ribbon(S, offset - T / 2, offset + T / 2, y + split, 1), alu));
  }
  // końce: cokół i kasety zaślepione
  for (const end of [0, 1]) {
    if (P0 > 0) g.add(capEnd(S, end, offset - 0.15, offset + 0.15, y, y + P0, con));
    if (split > P0) g.add(capEnd(S, end, offset - T / 2, offset + T / 2, y + P0, y + split, alu));
  }
  if (split < H) {
    const pane = mesh(wall(S, offset, y + split, y + H, 1, 4), gl, false); pane.renderOrder = 2; g.add(pane);
    g.add(mesh(ribbon(S, offset - 0.03, offset + 0.03, y + H, 1), alu));
  }
  // słupy HEB 200 co 4 m (pomalowane jak kasety)
  const post = kitMat('hebPaint', () => new THREE.MeshStandardMaterial({ color: 0x3f4d3c, roughness: 0.5, metalness: 0.5 }));
  g.add(inst(new THREE.BoxGeometry(0.2, H + 0.05, 0.2).translate(0, (H + 0.05) / 2, 0), post, stations(S, offset, 4, 0, y)));
  return { group: g, length: S.L };
}
