// FluidKit — przewody: rura stalowa gięta (łuki o promieniu gięcia ≥ 2,5 d, nakrętki złączek pierścieniowych DIN 2353
// na końcach), wąż hydrauliczny (krzywa z promieniem gięcia, zakuwki i nakrętki), rura wodna PCV / miedź z mufami.
// Punkty i kierunki w układzie rodzica (rura nie ma własnego „przodu”).
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port, canvasTex } from '../common.js';
import { waterMaterial, oilMaterial } from '../../../render/fluid/liquid.js';
import { bentPath, tubeSolid, hexY, latheY, alignY, fluidMaterials } from './util.js';

// długość nakrętki złączki (wysokość sześciokąta) dla przewodu d — punkt przyłącza leży na jej końcu
export const fitLen = (d) => Math.max(0.012, d * 1.9 + 0.004) * 0.55;
// złączka na końcu: nakrętka sześciokątna + korpus (stal ocynkowana); oś y wzdłuż kierunku wyjścia przewodu
export function endFitting({ d = 0.008, kind = 'nut', mat = null } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), m = mat || F.zinc, s = Math.max(0.012, d * 1.9 + 0.004);
  if (kind === 'ferrule') {   // zakuwka węża: tulejka karbowana + nakrętka
    const fer = mesh(latheY([[0, 0], [d * 0.92, 0], [d * 0.92, d * 2.6], [d * 0.85, d * 2.75], [0, d * 2.75]], 28), m); fer.position.y = s * 0.55; g.add(fer);
    for (let i = 0; i < 3; i++) { const r = mesh(new THREE.TorusGeometry(d * 0.92, d * 0.06, 6, 28).rotateX(Math.PI / 2), m); r.position.y = s * 0.55 + d * (0.6 + i * 0.7); g.add(r); }
  }
  const nut = mesh(hexY(s, s * 0.55), m); nut.position.y = s * 0.275; g.add(nut);
  return g;
}

// rura gięta: points — punkty załamań (Vector3 lub [x, y, z]), d — średnica zewnętrzna; na obu końcach nakrętki złączek
export function pipe({ points, d = 0.01, wall = 0.0015, R = null, mat = 'zinc', ends = true, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), path = bentPath(points, R || Math.max(0.025, 2.5 * d)), m = typeof mat === 'string' ? F[mat] : mat;
  g.name = name || `${EN ? 'Pipe' : 'Rura'} ${Math.round(d * 1000)} × ${String(wall * 1000).replace('.', EN ? '.' : ',')}`;
  g.add(tubeSolid(path, d / 2, m));
  if (ends) for (const [u, s] of [[0, -1], [1, 1]]) { const f = endFitting({ d }), p = path.getPointAt(u), t = path.getTangentAt(u).multiplyScalar(-s); f.position.copy(p); alignY(f, t); g.add(f); }
  const L = path.getLength();
  g.userData = { d, wall, di: d - 2 * wall, L, path, mass: Math.PI * (d * d - (d - 2 * wall) ** 2) / 4 * L * 7850,
    ports: { a: port(EN ? 'End A' : 'Koniec A', DOMAIN.fluid, 'złączka'), b: port(EN ? 'End B' : 'Koniec B', DOMAIN.fluid, 'złączka') } };
  return g;
}

// wąż: od a (wyjście w kierunku da) do b (wejście z kierunku db), krzywa Béziera z odcinkami prostymi przy zakuwkach
export function hose({ a, da, b, db, d = 0.012, di = 0.0063, color = 'hose', bendR = null, reach: reachMax = Infinity, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group();
  const A = a.isVector3 ? a : new THREE.Vector3(...a), B = b.isVector3 ? b : new THREE.Vector3(...b), DA = (da.isVector3 ? da : new THREE.Vector3(...da)).clone().normalize(), DB = (db.isVector3 ? db : new THREE.Vector3(...db)).clone().normalize();
  const df = d * 0.6, fl = Math.max(0.012, df * 1.9 + 0.004) * 0.55 + df * 2.75, reach = Math.min(reachMax, Math.max(bendR || 0.05, A.distanceTo(B) * 0.4));   // długość zakuwki; ramię krzywej ≥ promień gięcia
  const A1 = A.clone().addScaledVector(DA, fl), B1 = B.clone().addScaledVector(DB, -fl);
  const path = new THREE.CurvePath(); path.add(new THREE.CubicBezierCurve3(A1, A1.clone().addScaledVector(DA, reach), B1.clone().addScaledVector(DB, -reach), B1));
  g.name = name || `${EN ? 'Hydraulic hose DN' : 'Wąż hydrauliczny DN'} ${Math.round(di * 1000)}`;
  g.add(tubeSolid(path, d / 2, F[color] || F.hose, { radial: 18 }));
  for (const [P, D] of [[A, DA], [B, DB.clone().negate()]]) { const f = endFitting({ d: df, kind: 'ferrule' }); f.position.copy(P); alignY(f, D); g.add(f); }
  const L = path.getLength() + 2 * fl;
  g.userData = { d, di, L, path, mass: L * 0.35, ports: { a: port(EN ? 'End A' : 'Koniec A', DOMAIN.fluid, 'złączka'), b: port(EN ? 'End B' : 'Koniec B', DOMAIN.fluid, 'złączka') } };
  return g;
}

// wąż przezroczysty (PCV zbrojony oplotem poliestrowym): półprzezroczysta ścianka, w środku ciecz (woda / olej) z pęcherzykami
// powietrza płynącymi z prędkością przepływu; na końcach króćce mosiężne z karbami i opaski ślimakowe. Łączy się jak przewód:
// od a (wyjście w kierunku da) do b (wejście z kierunku db). setFlow(v [m/s], pełny?) i tick(dt) — ruch cieczy.
export function clearHose({ a, da, b, db, di = 0.012, wall = 0.003, fluid = 'water', reach: reachMax = Infinity, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), ro = di / 2 + wall;
  const A = a.isVector3 ? a : new THREE.Vector3(...a), B = b.isVector3 ? b : new THREE.Vector3(...b), DA = (da.isVector3 ? da : new THREE.Vector3(...da)).clone().normalize(), DB = (db.isVector3 ? db : new THREE.Vector3(...db)).clone().normalize();
  g.name = name || `${EN ? 'Clear hose' : 'Wąż przezroczysty'} ${Math.round(di * 1000)} × ${String(wall * 1000).replace('.', EN ? '.' : ',')}`;
  // króciec z karbami na każdym końcu (mosiądz): sześciokąt + trzpień w wężu; opaska ślimakowa na wężu
  const barbL = di * 2.2, hexH = 0.008, sHex = di + 0.01;
  for (const [P, D] of [[A, DA], [B, DB.clone().negate()]]) {
    const f = new THREE.Group(); f.position.copy(P); alignY(f, D); f.userData.fit = true; g.add(f);
    const hx = mesh(hexY(sHex, hexH), F.brassF); hx.position.y = hexH / 2; f.add(hx);
    const barb = mesh(latheY([[0, 0], [di * 0.42, 0], [di * 0.42, barbL * 0.2], [di * 0.5, barbL * 0.35], [di * 0.42, barbL * 0.4], [di * 0.5, barbL * 0.65], [di * 0.42, barbL * 0.7], [di * 0.5, barbL * 0.92], [di * 0.4, barbL], [0, barbL]], 24), F.brassF); barb.position.y = hexH; barb.userData.doctorOk = 'clash'; f.add(barb);
    const band = mesh(new THREE.TorusGeometry(ro + 0.0008, 0.0012, 6, 28).rotateX(Math.PI / 2).scale(1, 3.2, 1), F.stainless); band.position.y = hexH + barbL * 0.6; f.add(band);
    const screw = mesh(new THREE.BoxGeometry(0.006, 0.007, 0.005), F.stainless); screw.position.set(ro + 0.003, hexH + barbL * 0.6, 0); f.add(screw);
  }
  const A1 = A.clone().addScaledVector(DA, hexH), B1 = B.clone().addScaledVector(DB, -hexH), reach = Math.min(reachMax, Math.max(0.05, A.distanceTo(B) * 0.4));
  const path = new THREE.CurvePath(); path.add(new THREE.CubicBezierCurve3(A1, A1.clone().addScaledVector(DA, reach), B1.clone().addScaledVector(DB, -reach), B1));
  const L = path.getLength(), n = Math.max(24, Math.ceil(L / 0.006));
  // ścianka: przezroczyste PCV (lekko zielonkawe), oplot widoczny jako delikatna siatka w teksturze
  const braid = canvasTex(64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.2; for (let i = -64; i < 128; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 64, 64); c.stroke(); c.beginPath(); c.moveTo(i + 64, 0); c.lineTo(i, 64); c.stroke(); } });
  braid.t.wrapS = braid.t.wrapT = THREE.RepeatWrapping; braid.t.repeat.set(2, L / 0.012);
  const pvc = new THREE.MeshPhysicalMaterial({ color: 0xe8f4ee, roughness: 0.18, metalness: 0, transparent: true, opacity: 0.32, clearcoat: 1, clearcoatRoughness: 0.08, alphaMap: null, depthWrite: false, side: THREE.DoubleSide });
  const wallM = new THREE.Mesh(new THREE.TubeGeometry(path, n, ro, 20, false), pvc); wallM.renderOrder = 3; wallM.userData.doctorOk = 'seethrough'; g.add(wallM);
  const braidM = new THREE.Mesh(new THREE.TubeGeometry(path, n, ro - wall * 0.5, 16, false), new THREE.MeshStandardMaterial({ map: braid.t, transparent: true, opacity: 0.5, depthWrite: false, roughness: 0.6 })); braidM.renderOrder = 3; braidM.userData.doctorOk = 'seethrough'; g.add(braidM);
  // ciecz w środku (bryła zamknięta) i pęcherzyki
  const liq = fluid === 'oil' ? oilMaterial() : waterMaterial({ repeat: 1, speed: [0, 0], normal: 0.25 }); liq.normalMap.repeat.set(1, L / 0.02);
  const core = tubeSolid(path, di / 2 - 0.0002, liq, { radial: 16 }); g.add(core);
  const NB = Math.max(4, Math.round(L / 0.05)), bub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transmission: 0.6, ior: 1.0, transparent: true, opacity: 0.7, thickness: 0.002 }), NB);
  bub.userData.doctorOk = 'clash'; bub.frustumCulled = false; g.add(bub);
  const seeds = Array.from({ length: NB }, (_, i) => [(i * 0.6180339) % 1, 0.25 + 0.5 * ((i * 0.75487) % 1), (i * 2.399) % (Math.PI * 2), 0.0012 + 0.0016 * ((i * 0.37) % 1)]);
  let v = 0, full = true, s = 0; const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), t = new THREE.Vector3(), nrm = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const place = () => {
    for (let i = 0; i < NB; i++) {
      const [u0, rr, ang, r] = seeds[i]; const u = ((u0 + s / L) % 1 + 1) % 1; path.getPointAt(u, p); path.getTangentAt(u, t);
      nrm.copy(Math.abs(t.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : up).cross(t).normalize(); const bin = new THREE.Vector3().crossVectors(t, nrm);
      p.addScaledVector(nrm, Math.cos(ang) * rr * (di / 2 - r)).addScaledVector(bin, Math.sin(ang) * rr * (di / 2 - r) + Math.abs(Math.sin(ang)) * 0.3 * (di / 2 - r));   // pęcherzyki bliżej górnej ścianki
      m4.makeScale(full ? r : 0, full ? r : 0, full ? r : 0).setPosition(p); bub.setMatrixAt(i, m4);
    }
    bub.instanceMatrix.needsUpdate = true;
  };
  place();
  g.children.filter((o) => o.userData.fit).forEach((f) => f.traverse((o) => { if (o.isMesh) o.userData.doctorOk = 'floating'; }));   // króćce łączy przezroczysty wąż (doktor nie widzi go jako bryły)
  g.userData = { di, wall, L, path, mass: L * Math.PI * (ro * ro - di * di / 4) * 1300, fluid,
    setFlow: (vel, isFull = true) => { v = vel; full = isFull; core.visible = full; },
    tick: (dt) => { s += v * dt; liq.normalMap.offset.y = (-s / 0.02) % 1; place(); },
    ports: { a: port(EN ? 'End A (hose barb)' : 'Koniec A (króciec z karbami)', DOMAIN.fluid, 'króciec'), b: port(EN ? 'End B (hose barb)' : 'Koniec B (króciec z karbami)', DOMAIN.fluid, 'króciec') } };
  return g;
}
