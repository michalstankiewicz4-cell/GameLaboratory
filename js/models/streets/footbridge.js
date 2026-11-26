// StreetKit — kładki dla pieszych (buildFootbridge).
import * as THREE from '../../../vendor/three/three.module.js';
import { inst, kitMat } from './geom.js';
import { steel } from './signals.js';
import { surface } from './surfaces.js';

/* ---------------- kładki dla pieszych ---------------- */
// Kładka nad ulicą (lokalnie: pomost wzdłuż z, ulica wzdłuż x, środek nad osią ulicy): pomost stalowy (dźwigary
// skrzynkowe, płyta, nawierzchnia antypoślizgowa) na wysokości `height` (domyślnie 5 m — skrajnia 4,6 m), na końcach
// spoczniki na słupach, z nich schody betonowe (stopnie 15 × 30 cm, spocznik w połowie wysokości) w stronę +x,
// balustrady szklane 1,1 m z pochwytem, przy schodach pochwyty stalowe. lift: true — przy każdym spoczniku (od −x)
// winda w przeszklonym szybie ze stalową ramą, kabina na dole, drzwi od strony spocznika i od ulicy.
// stairs: 'straight' — biegi jednokierunkowe (jeden za drugim), 'switchback' — naprzemienne (dwubiegowe z zawrotem:
// pierwszy bieg od ulicy, spocznik na całą szerokość, drugi bieg wraca obok pierwszego).
//   buildFootbridge({ span, height, width, lift, stairs }) → { group, length }
export function buildFootbridge({ span = 18, height = 5, width = 3, lift = false, stairs = 'straight' } = {}) {
  const g = new THREE.Group(); g.name = lift ? 'kładka ze schodami i windą' : 'kładka ze schodami';
  const con = surface('concrete');
  const paintM = kitMat('bridgeSteel', () => new THREE.MeshStandardMaterial({ color: 0x5d6f80, roughness: 0.45, metalness: 0.6 }));
  const deckM = kitMat('deckTop', () => new THREE.MeshStandardMaterial({ color: 0x4a4d50, roughness: 0.95 }));
  const glass = kitMat('rail glass', () => new THREE.MeshStandardMaterial({ color: 0xbfd8dc, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  const st = steel();
  const box = (w, h, d, m, x, y, z, shadow = true) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; g.add(o); return o; };
  const rod = (a, b, r, m) => { const d = new THREE.Vector3().subVectors(b, a), o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), m); o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); o.castShadow = true; g.add(o); return o; };
  const H = height, W = width, half = span / 2, P = 3.2;   // P — bok spocznika
  // balustrada szklana wzdłuż odcinka (a → b) na wysokości y
  const glassRail = (a, b, y) => {
    const d = new THREE.Vector3().subVectors(b, a), L = d.length(), mid = a.clone().addScaledVector(d, 0.5);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(L, 1.0), glass); pane.position.set(mid.x, y + 0.55, mid.z); pane.rotation.y = Math.atan2(-d.z, d.x); pane.renderOrder = 2; g.add(pane);
    rod(new THREE.Vector3(a.x, y + 1.1, a.z), new THREE.Vector3(b.x, y + 1.1, b.z), 0.03, st);
    for (let s = 0; s <= L + 1e-6; s += Math.max(1, L / Math.ceil(L / 1.5))) { const p = a.clone().addScaledVector(d, s / L); rod(new THREE.Vector3(p.x, y, p.z), new THREE.Vector3(p.x, y + 1.1, p.z), 0.025, st); }
  };
  // pomost: dwa dźwigary skrzynkowe po bokach, płyta, nawierzchnia
  for (const sx of [-1, 1]) box(0.3, 0.9, span, paintM, sx * (W / 2 - 0.15), H - 0.45, 0);
  box(W, 0.25, span, paintM, 0, H - 0.2, 0); box(W - 0.6, 0.02, span, deckM, 0, H - 0.06, 0, false);
  for (const sx of [-1, 1]) glassRail(new THREE.Vector3(sx * (W / 2 - 0.15), 0, -half), new THREE.Vector3(sx * (W / 2 - 0.15), 0, half), H);
  // spoczniki na końcach (płyta na czterech słupach)
  const rise = 0.15, run = 0.3, SW = 2.0;
  for (const sz of [-1, 1]) {
    const zc = sz * (half + P / 2);
    box(P, 0.35, P, con, 0, H - 0.175 - 0.05, zc); box(P - 0.1, 0.02, P - 0.1, deckM, 0, H - 0.04, zc, false);
    for (const cx of [-1, 1]) for (const cz of [-1, 1]) box(0.4, H - 0.4, 0.4, con, cx * (P / 2 - 0.3), (H - 0.4) / 2, zc + cz * (P / 2 - 0.3));
    // balustrady spocznika: od strony z poza pomostem i od −x (bez windy)
    const zo = zc + sz * P / 2;
    glassRail(new THREE.Vector3(-P / 2, 0, zo), new THREE.Vector3(P / 2, 0, zo), H);
    if (!lift) glassRail(new THREE.Vector3(-P / 2, 0, zc - P / 2), new THREE.Vector3(-P / 2, 0, zc + P / 2), H);
    // schody w stronę +x: dwa biegi i spocznik pośredni; stopnie zębate na płycie biegowej
    const steps = Math.round(H / rise), n1 = Math.ceil(steps / 2), n2 = steps - n1, back = stairs === 'switchback';
    const zA = back ? zc + sz * (SW / 2 + 0.1) : zc + sz * (P / 2 - SW / 2), zB = back ? zc - sz * (SW / 2 + 0.1) : zA;   // tory biegów
    const M = [];
    // bieg n stopni od (x0, y0) w kierunku dir (±1 po x), na torze zs
    const flight = (x0, y0, n, dir, zs) => {
      for (let k = 0; k < n; k++) M.push(new THREE.Matrix4().makeTranslation(x0 + dir * run * (k + 0.5), y0 - (k + 1) * rise - 0.15 + rise / 2 + 0.075, zs));
      // płyta biegowa (spód skośny)
      const L = Math.hypot(n * run, n * rise), slab = new THREE.Mesh(new THREE.BoxGeometry(L, 0.2, SW), con);
      slab.position.set(x0 + dir * n * run / 2, y0 - n * rise / 2 - 0.3, zs); slab.rotation.z = -dir * Math.atan2(rise, run); slab.castShadow = slab.receiveShadow = true; g.add(slab);
      // pochwyty po obu stronach
      for (const e of [-1, 1]) {
        const zz = zs + e * (SW / 2 - 0.05);
        rod(new THREE.Vector3(x0, y0 + 0.9, zz), new THREE.Vector3(x0 + dir * n * run, y0 - n * rise + 0.9, zz), 0.025, st);
        for (let k = 0; k <= n; k += 4) rod(new THREE.Vector3(x0 + dir * k * run, y0 - k * rise, zz), new THREE.Vector3(x0 + dir * k * run, y0 - k * rise + 0.9, zz), 0.02, st);
      }
      return [x0 + dir * n * run, y0 - n * rise];
    };
    const [x1, y1] = flight(P / 2, H, n1, 1, zA);
    const LL = 1.5, LW = back ? 2 * SW + 0.2 : SW;
    box(LL, 0.3, LW, con, x1 + LL / 2, y1 - 0.15, zc + (back ? 0 : zA - zc));
    for (const zz of back ? [zA, zB] : [zA]) box(0.4, y1 - 0.3, 0.4, con, x1 + LL / 2, (y1 - 0.3) / 2, zz);
    if (back) { flight(x1, y1, n2, -1, zB); glassRail(new THREE.Vector3(x1 + LL, 0, zA + sz * SW / 2), new THREE.Vector3(x1 + LL, 0, zB - sz * SW / 2), y1); }
    else flight(x1 + LL, y1, n2, 1, zA);
    g.add(inst(new THREE.BoxGeometry(run, 0.3, SW), con, M));
    // winda: szyb przeszklony od −x spocznika, kabina na dole
    if (lift) {
      const S = 2.4, xs = -P / 2 - S / 2, top = H + 3.0;
      for (const cx of [-1, 1]) for (const cz of [-1, 1]) box(0.14, top - 0.2, 0.14, paintM, xs + cx * (S / 2 - 0.07), 0.2 + (top - 0.2) / 2, zc + cz * (S / 2 - 0.07));   // na cokole
      for (let y = 2.6; y <= top; y += 2.5) for (const [w, d, ox, oz] of [[S, 0.1, 0, S / 2 - 0.05], [S, 0.1, 0, -(S / 2 - 0.05)], [0.1, S, S / 2 - 0.05, 0], [0.1, S, -(S / 2 - 0.05), 0]]) box(w, 0.1, d, paintM, xs + ox, y, zc + oz, false);
      box(S + 0.2, 0.3, S + 0.2, paintM, xs, top + 0.15, zc);
      for (const [w, ox, oz, ry] of [[S, 0, S / 2 - 0.05, 0], [S, 0, -(S / 2 - 0.05), 0], [S, -(S / 2 - 0.05), 0, Math.PI / 2], [S, S / 2 - 0.05, 0, Math.PI / 2]]) {
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.14, top - 0.2), glass); pane.position.set(xs + ox, top / 2, zc + oz); pane.rotation.y = ry; pane.renderOrder = 2; g.add(pane);
      }
      box(S + 0.4, 0.2, S + 0.4, con, xs, 0.1, zc);
      // kabina (na dole) z drzwiami; drzwi szybu na górze od strony spocznika (+x) i na dole od −x
      box(1.5, 2.2, 1.6, kitMat('cabin', () => new THREE.MeshStandardMaterial({ color: 0xa9b0b5, roughness: 0.3, metalness: 0.8 })), xs, 0.2 + 1.1, zc);
      const doorM = kitMat('liftDoor', () => new THREE.MeshStandardMaterial({ color: 0x8c949a, roughness: 0.25, metalness: 0.9 }));
      box(0.06, 2.1, 1.0, doorM, xs + S / 2 - 0.02, H + 1.05, zc); box(0.06, 2.1, 1.0, doorM, xs - S / 2 + 0.02, 0.2 + 1.05, zc);
      // przejście z szybu na spocznik
      box(0.6, 0.3, 1.4, con, -P / 2 - 0.3 + 0.3, H - 0.19, zc);
    }
  }
  return { group: g, length: span };
}
