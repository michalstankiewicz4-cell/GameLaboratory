// ClockKit — sprężyny: naciskowa śrubowa (końce szlifowane) i spiralna (zegarowa) w bębnie z wieńcem zębatym.
import * as THREE from '../../../../vendor/three/three.module.js';
import { involuteOutline, DOMAIN } from '../mechkit.js';
import { TAU, EN, mesh, port, circle, slab, cylZ, materials } from '../common.js';

/* ---------------- sprężyna naciskowa ---------------- */
// śrubowa, końce zwinięte i szlifowane (po 1 zwoju nieczynnym z każdej strony); oś wzdłuż +y, podstawa w y = 0.
// setLength(L) — ściśnięta do długości L (przebudowa geometrii drutu: skok czynnych zwojów maleje)
export function compressionSpring({ d = 0.002, D = 0.02, n = 8, L0 = 0.06, mat = 'spring', name } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name || `${EN ? 'Compression spring' : 'Sprężyna naciskowa'} ${d * 1000}×${D * 1000}`;
  const R = D / 2, nt = n + 2, seg = Math.ceil(nt * 40);
  const curve = new THREE.Curve(); let L = L0;
  curve.getPoint = (u, out = new THREE.Vector3()) => {
    const turns = u * nt, a = turns * TAU;
    // wysokość: zwoje końcowe ze skokiem d (przylegają), czynne — skok (L − 3d)/n, szlifowanie: −d/2 na końcach
    const pa = (L - 3 * d) / n, y = turns < 1 ? turns * d : turns > nt - 1 ? d + n * pa + (turns - nt + 1) * d : d + (turns - 1) * pa;
    return out.set(R * Math.cos(a), y + d / 2 - d / 2, R * Math.sin(a));
  };
  let wire = null;
  const caps = [0, 1].map(() => { const c = mesh(new THREE.SphereGeometry(d / 2, 10, 8), M[mat]); g.add(c); return c; });   // końce drutu (zaokrąglone)
  const build = () => { if (wire) { wire.geometry.dispose(); g.remove(wire); } wire = mesh(new THREE.TubeGeometry(curve, seg, d / 2, 10, false), M[mat]); g.add(wire); caps[0].position.copy(curve.getPoint(0)); caps[1].position.copy(curve.getPoint(1)); };
  build();
  g.userData = { d, D, n, L0, Ls: (n + 2) * d, mass: Math.PI * D * (n + 2) * Math.PI * d * d / 4 * 7850, setLength: (l) => { L = Math.max((n + 2) * d, l); build(); }, length: () => L,
    ports: { top: port('Koniec górny (siła)', DOMAIN.lin, 'docisk'), bottom: port('Koniec dolny (podparcie)', DOMAIN.lin, 'docisk') } };
  return g;
}

/* ---------------- sprężyna spiralna w bębnie ---------------- */
// bęben (wieniec z zębami ewolwentowymi), sprężyna z taśmy b × h, długość L; oś bębna w początku układu. setWind(f) —
// f = 0 rozwinięta (zwoje przy ściance bębna), 1 — nawinięta na wałek. Wzory zwojów jak w katalogach zegarmistrzowskich.
export function mainspringBarrel({ b = 0.012, h = 0.0004, L = 1.2, r1 = 0.005, r2 = 0.03, teeth = 96, m = 0.0008, name } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name || (EN ? 'Going barrel with mainspring' : 'Bęben ze sprężyną zegarową');
  const drum = new THREE.Group(); g.add(drum);
  const o = involuteOutline(teeth, m, { backlash: 0.06 }), sh = new THREE.Shape(o.pts.map((p) => new THREE.Vector2(-p.y, p.x)));
  sh.holes.push(circle(r2, 96));
  drum.add(mesh(slab(sh, 0.003, b / 2 - 0.0015, 0.0001, 8), M.brassP));                 // wieniec z zębami (z przodu bębna)
  const hw = (b + 0.002) / 2, wall = mesh(new THREE.LatheGeometry([new THREE.Vector2(r2, hw), new THREE.Vector2(r2, -hw), new THREE.Vector2(r2 + 0.0012, -hw), new THREE.Vector2(r2 + 0.0012, hw), new THREE.Vector2(r2, hw)], 96).rotateX(Math.PI / 2), M.brassF); drum.add(wall);   // ścianka z grubością (widać wnętrze)
  const back = mesh(slab(new THREE.Shape().absarc(0, 0, r2 + 0.0012, 0, TAU, false), 0.0012, -b / 2 - 0.0022, 0.0001, 64), M.brassF); drum.add(back);
  const arb = new THREE.Group(); g.add(arb);
  arb.add(mesh(cylZ(r1, b + 0.012, 32), M.steelP));
  const sq = mesh(new THREE.BoxGeometry(0.0045, 0.0045, 0.012), M.steelP); sq.position.z = b / 2 + 0.012; arb.add(sq);   // kwadrat do nakręcania kluczem
  // zwoje: rozwinięta — przy ściance (n_down), nawinięta — na wałku (n_up)
  const nDown = (r2 - Math.sqrt(Math.max(0, r2 * r2 - L * h / Math.PI))) / h, nUp = (Math.sqrt(r1 * r1 + L * h / Math.PI) - r1) / h;
  let spr = null, wind = 0;
  const build = () => {
    if (spr) { spr.geometry.dispose(); g.remove(spr); }
    // spirala Archimedesa od wałka (r1) do ścianki (r2) z liczbą zwojów zależną od nawinięcia; gęstość zwojów — przy wałku
    // (nawinięta) albo przy ściance (rozwinięta), przejście wolnym zwojem
    const nIn = nUp * wind, nOut = nDown * (1 - wind), rIn1 = r1 + nIn * h, rOut0 = r2 - nOut * h, free = 1.2;
    const pts = [];
    const add = (r, a) => pts.push([r, a]);
    let a = 0;
    for (let i = 0; i <= nIn * 32; i++) { const f = i / Math.max(1, nIn * 32); add(r1 + h / 2 + f * (rIn1 - r1), a); a += TAU / 32; }
    for (let i = 1; i <= free * 32; i++) { const f = i / (free * 32); add(rIn1 + f * (rOut0 - rIn1), a); a += TAU / 32; }
    for (let i = 1; i <= nOut * 32; i++) { const f = i / Math.max(1, nOut * 32); add(rOut0 + f * (r2 - h / 2 - rOut0), a); a += TAU / 32; }
    const pos = [], idx = [];
    for (const [r, aa] of pts) { const x = r * Math.cos(aa), y = r * Math.sin(aa); pos.push(x, y, -b / 2, x, y, b / 2); }
    for (let i = 0; i < pts.length - 1; i++) { const q = i * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    spr = mesh(geo, M.springBlue); g.add(spr);
  };
  build();
  const vol = L * b * h;
  g.userData = { b, h, L, r1, r2, teeth, m, rp: o.rp, nUp, nDown, turns: nUp - nDown, springMass: vol * 7850, drum, arbor: arb,
    setWind: (f) => { wind = Math.max(0, Math.min(1, f)); build(); }, wind: () => wind,
    ports: { mesh: port('Wieniec bębna — zazębienie', DOMAIN.rot, 'zazębienie'), arbor: port('Wałek (nakręcanie, zapadka)', DOMAIN.rot, 'wał') } };
  return g;
}

/* ---------------- sprężyna skrętna śrubowa ---------------- */
// zwoje wokół osi z (od z = 0 w +z), dwa ramiona styczne; setAngle(φ) — drugie ramię obrócone o φ względem swobodnego
// położenia (przebudowa drutu: zwoje się zaciskają, średnica maleje D' = D·n / (n + φ/2π))
export function torsionSpring({ d = 0.002, D = 0.02, n = 5, leg = 0.03, legAngle = Math.PI * 0.75, mat = 'spring', name } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name || `${EN ? 'Torsion spring' : 'Sprężyna skrętna'} ${d * 1000}×${D * 1000}`;
  let phi = 0, wire = null;
  const caps = [0, 1].map(() => { const c = mesh(new THREE.SphereGeometry(d / 2, 10, 8), M[mat]); g.add(c); return c; });
  const build = () => {
    const turns = n + legAngle / TAU + phi / TAU, R = D / 2 * n / (n + phi / TAU), L = (n + 1) * d * 1.05, pts = [];
    const a1 = 0, p1 = new THREE.Vector3(R, 0, 0);
    pts.push(p1.clone().add(new THREE.Vector3(0, -leg, 0)));   // ramię 1 (styczne, w −y)
    for (let i = 0; i <= 120; i++) { const f = i / 120, a = a1 + f * turns * TAU; pts.push(new THREE.Vector3(R * Math.cos(a), R * Math.sin(a), f * L)); }
    const ae = a1 + turns * TAU, pe = new THREE.Vector3(R * Math.cos(ae), R * Math.sin(ae), L), te = new THREE.Vector3(-Math.sin(ae), Math.cos(ae), 0);
    pts.push(pe.clone().addScaledVector(te, leg));   // ramię 2 (styczne)
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05);
    if (wire) { wire.geometry.dispose(); g.remove(wire); }
    wire = mesh(new THREE.TubeGeometry(curve, 400, d / 2, 8, false), M[mat]); g.add(wire);
    caps[0].position.copy(pts[0]); caps[1].position.copy(pts[pts.length - 1]);
  };
  build();
  g.userData = { d, D, n, leg, mass: Math.PI * D * n * Math.PI * d * d / 4 * 7850, setAngle: (p) => { phi = p; build(); },
    ports: { leg1: port(EN ? 'Leg 1 (fixed)' : 'Ramię 1 (stałe)', DOMAIN.rot, 'ramię'), leg2: port(EN ? 'Leg 2 (torque)' : 'Ramię 2 (moment)', DOMAIN.rot, 'ramię'), arbor: port(EN ? 'Arbor (inside the coils)' : 'Trzpień (wewnątrz zwojów)', DOMAIN.rot, 'wał') } };
  return g;
}
