// Sieć torowa z aTrain: owal z dwoma rozjazdami i przedłużeniem (pętla) — podsypka, podkłady,
// szyny z przerwami na stykach, iglice (ruchome), dzioby krzyżownic, kierownice, łubki ze śrubami,
// napędy zwrotnicowe. Geometria szyn pochodzi z tych samych odcinków, na których liczy fizyka
// („koło na szynie”, js/behaviors/rail/physics.js: sim.track), więc to, co widać, jest tym, po czym
// toczą się koła. Z aTrain (js/app.js: sweepRoute, pieceGeometry, buildRails, bladeVis, łubki, napędy).
import { SL } from "../../train/data.js";
import { trainMaterials } from "../../train/materials.js";
import { railProfile, BALLAST } from "./profile.js";
const THREE = window.THREE;

function stationAt(pc, t) {
  if (pc.kind === "line") return { x: pc.ax + pc.dx * t, z: pc.az + pc.dz * t, nx: -pc.dz, nz: pc.dx };
  const th = pc.th0 + t / pc.r, nx = Math.cos(th), nz = Math.sin(th); return { x: pc.cx + pc.r * nx, z: pc.cz + pc.r * nz, nx, nz };
}
const clipD = (c, x, z) => c.t === "z" ? c.s * (c.v - z) : c.s * (c.v - Math.hypot(x - c.cx, z - c.cz));

// przekrój szyny wzdłuż odcinka, przycięty jak w modelu kontaktu (iglica, dziób); zwraca pozycje trójkątów
function piecePositions(pc, prof) {
  // gęsty krok tylko tam, gdzie przycięcie zmienia przekrój; poza tym prosto: końce, łuk: co 0,5 m
  const coarse = pc.kind === "line" ? pc.len : 0.5, ts = [];
  const clipActive = (t) => {
    if (pc.blade) return true;
    const st = stationAt(pc, t);
    return pc.clips.some((c) => clipD(c, st.x - st.nx * 0.12, st.z - st.nz * 0.12) > 0 || clipD(c, st.x + st.nx * 0.12, st.z + st.nz * 0.12) > 0);
  };
  for (let t = 0; t < pc.len; ) {
    ts.push(t);
    if (clipActive(t)) { t += 0.04; continue; }
    let nt = Math.min(pc.len, t + coarse);
    for (let k = 0.5; t + k < nt; k += 0.5) if (clipActive(t + k)) { nt = t + Math.max(0.04, k - 0.5); break; }
    t = nt;
  }
  ts.push(pc.len);
  const secs = ts.map((t) => {
    const st = stationAt(pc, t);
    let lo = -1, hi = 1;
    for (const c of pc.clips) {
      const f = (l) => clipD(c, st.x + st.nx * l, st.z + st.nz * l);
      const fa = f(-0.09), fb = f(0.09);
      if (fa <= 0 && fb <= 0) continue;
      if (fa > 0 && fb > 0) { lo = hi = fa < fb ? -0.09 : 0.09; continue; }
      let a = -0.09, b = 0.09; for (let k = 0; k < 18; k++) { const m = (a + b) / 2; if ((f(m) > 0) === (fa > 0)) a = m; else b = m; }
      const lam = (a + b) / 2; if (fa <= 0) hi = Math.min(hi, lam); else lo = Math.max(lo, lam);
    }
    if (lo > hi) lo = hi;
    return prof.map(([u, v]) => { const uu = Math.min(Math.max(u, lo), hi); return [st.x + st.nx * uu, v + pc.vOff, st.z + st.nz * uu]; });
  });
  const pos = [], n = prof.length;
  for (let i = 0; i + 1 < secs.length; i++) for (let j = 0; j < n; j++) {
    const A = secs[i][j], B = secs[i][(j + 1) % n], C = secs[i + 1][(j + 1) % n], D = secs[i + 1][j];
    pos.push(...A, ...B, ...C, ...A, ...C, ...D);
  }
  for (const sec of [secs[0], secs[secs.length - 1]]) {   // czoła szyn
    const c = sec.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n, a[2] + p[2] / n], [0, 0, 0]);
    for (let j = 0; j < n; j++) pos.push(...c, ...sec[j], ...sec[(j + 1) % n]);
  }
  return pos;
}
const geoFrom = (pos) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; };

// track: sim.track (pieces, joints, switches, Lext); terrain: sim.terrain (sleepers, routes); T: sim.TRACK (hl, R, L)
export function buildNetwork(track, terrain, T) {
  const mat = trainMaterials(), prof = railProfile(), root = new THREE.Group(); root.name = "sieć torowa";
  const hl = T.hl, Rc = T.R, Lext = track.Lext;
  // przebiegi osi torów: owal i przedłużenie (podsypka)
  function extAt(s) {
    const A = Math.PI * Rc;
    if (s < Lext) return { px: hl + s, pz: -Rc, nx: 0, nz: 1 };
    if (s < Lext + A) { const th = -Math.PI / 2 + (s - Lext) / Rc; return { px: hl + Lext + Rc * Math.cos(th), pz: Rc * Math.sin(th), nx: -Math.cos(th), nz: -Math.sin(th) }; }
    return { px: hl + Lext - (s - Lext - A), pz: Rc, nx: 0, nz: -1 };
  }
  const routes = [{ at: terrain.routes[0].at, L: terrain.routes[0].L }, { at: extAt, L: 2 * Lext + Math.PI * Rc }];
  for (const r of routes) {
    const N = Math.ceil(r.L / 0.5), pos = [], secs = [];
    for (let i = 0; i <= N; i++) secs.push(r.at(i / N * r.L * 0.99999));
    for (let i = 0; i < N; i++) for (let j = 0; j < BALLAST.length; j++) {
      const p = BALLAST[j], q = BALLAST[(j + 1) % BALLAST.length], a = secs[i], b = secs[i + 1];
      const pt = (s, u) => [s.px + s.nx * u[0], u[1], s.pz + s.nz * u[0]];
      pos.push(...pt(a, p), ...pt(a, q), ...pt(b, q), ...pt(a, p), ...pt(b, q), ...pt(b, p));
    }
    const m = new THREE.Mesh(geoFrom(pos), mat.ballast); m.name = "podsypka"; m.receiveShadow = true; root.add(m);
  }
  // podkłady: te same bryły co w fizyce
  {
    const list = terrain.sleepers, S = SL;
    const sl = new THREE.InstancedMesh(new THREE.BoxGeometry(2 * S.hx, 2 * S.hy, 2 * S.hz), mat.sleeper, list.length);
    const dm = new THREE.Object3D();
    list.forEach((s, i) => { dm.position.set(s.x, S.yc, s.z); dm.rotation.set(0, Math.atan2(-s.cz, s.cx), 0); dm.updateMatrix(); sl.setMatrixAt(i, dm.matrix); });
    sl.name = "podkłady"; sl.castShadow = sl.receiveShadow = true; root.add(sl);
  }
  // szyny stałe — jedna bryła; przebudowa po zmianie szczeliny styków (track.setGap)
  let rails = null, plates = null, bolts = null;
  function buildRails() {
    for (const o of [rails, plates, bolts]) if (o) { root.remove(o); o.geometry.dispose(); }
    const pos = []; for (const pc of track.pieces) if (!pc.blade) pos.push(...piecePositions(pc, prof));
    rails = new THREE.Mesh(geoFrom(pos), mat.rail); rails.name = "szyny"; rails.castShadow = rails.receiveShadow = true; root.add(rails);
    // łubki na stykach szyn (po obu stronach szyjki) ze śrubami
    const J = track.joints;
    plates = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.085, 0.02), mat.plate, Math.max(1, J.length * 2));
    bolts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 8), mat.bolt, Math.max(1, J.length * 4));
    plates.count = J.length * 2; bolts.count = J.length * 4;
    const dm = new THREE.Object3D(); let ip = 0, ib = 0;
    for (const j of J) {
      const nx = -j.tz, nz = j.tx, yaw = Math.atan2(-j.tz, j.tx);
      for (const sd of [1, -1]) { dm.position.set(j.x + nx * sd * 0.019, -0.088, j.z + nz * sd * 0.019); dm.rotation.order = "XYZ"; dm.rotation.set(0, yaw, 0); dm.updateMatrix(); plates.setMatrixAt(ip++, dm.matrix); }
      for (const a of [-0.21, -0.07, 0.07, 0.21]) { dm.position.set(j.x + j.tx * a, -0.088, j.z + j.tz * a); dm.rotation.order = "YXZ"; dm.rotation.set(Math.PI / 2, yaw, 0); dm.updateMatrix(); bolts.setMatrixAt(ib++, dm.matrix); }
    }
    plates.name = "łubki"; bolts.name = "śruby"; root.add(plates, bolts);
  }
  buildRails();
  // iglice: obracane wokół piętki o kąt wynikający z przełożenia napędu
  const blades = [];
  for (const pc of track.pieces) {
    if (!pc.blade) continue;
    const g = geoFrom(piecePositions(pc, prof));
    const b = pc.blade, toe = stationAt(pc, b.toeAtEnd ? pc.len : 0), heel = stationAt(pc, b.toeAtEnd ? 0 : pc.len);
    g.translate(-heel.x, 0, -heel.z);
    const grp = new THREE.Group(); grp.name = "iglica"; grp.position.set(heel.x, 0, heel.z);
    const m = new THREE.Mesh(g, mat.rail); m.castShadow = m.receiveShadow = true; grp.add(m); root.add(grp);
    const rx = toe.x - heel.x, rz = toe.z - heel.z;
    blades.push({ grp, b, thMax: b.throw * (b.nx * rz - b.nz * rx) / (rx * rx + rz * rz) });
  }
  // napędy zwrotnicowe (skrzynki przy iglicach)
  const machine = new THREE.MeshStandardMaterial({ color: 0x55606a, roughness: 0.75, metalness: 0.05 });
  for (const zs of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.45), machine); m.name = "napęd zwrotnicowy"; m.position.set(hl + 0.4, -0.1, zs * (Rc + 1.9)); root.add(m);
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.6), mat.steel); rod.name = "pręt nastawczy"; rod.position.set(hl + 0.25, -0.13, zs * (Rc + 1.0)); root.add(rod);
  }
  root.userData = {
    rebuildRails: buildRails,
    // położenie iglic z napędów (track.switches[i].pos: 0 = łuk, 1 = prosto)
    update(switches) { for (const bv of blades) { const sw = switches[bv.b.sw], open = bv.b.openAt1 ? sw.pos : 1 - sw.pos; bv.grp.rotation.y = bv.thMax * open; } },
  };
  return root;
}
