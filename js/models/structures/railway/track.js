// Tor: odcinek prosty lub łuk — podsypka, podkłady, dwie szyny, łubki na stykach.
// Wymiary z TrainKit (js/models/train/data.js), przekroje z profile.js, materiały
// taboru (te same tekstury co w aTrain). Początek układu: oś toru, główka szyny
// na y = 0, tor biegnie wzdłuż +x (łuk skręca w stronę +z przy radius > 0).
// Rozjazdy z aTrain są zdefiniowane w jego fizyce (iglice, dzioby) — tu ich nie ma.
import { RAIL_HALF, SL } from "../../train/data.js";
import { trainMaterials } from "../../train/materials.js";
import { railProfile, BALLAST } from "./profile.js";
const THREE = window.THREE;

// stacja na osi toru po długości s: punkt (x, z), styczna (tx, tz), normalna w lewo (nx, nz)
function stationFn(length, radius) {
  if (!radius) return (s) => ({ x: s, z: 0, tx: 1, tz: 0, nx: 0, nz: 1 });
  return (s) => {
    const th = s / radius;
    return { x: radius * Math.sin(th), z: radius * (1 - Math.cos(th)), tx: Math.cos(th), tz: Math.sin(th), nx: -Math.sin(th), nz: Math.cos(th) };
  };
}

// wyciąga przekrój wzdłuż osi (offset u0 od osi toru)
function sweep(profile, at, length, u0, step) {
  const N = Math.max(1, Math.ceil(length / step)), secs = [];
  for (let i = 0; i <= N; i++) {
    const st = at(i / N * length);
    secs.push(profile.map(([u, v]) => [st.x + st.nx * (u0 + u), v, st.z + st.nz * (u0 + u)]));
  }
  const pos = [], n = profile.length;
  for (let i = 0; i < N; i++) for (let j = 0; j < n; j++) {
    const A = secs[i][j], B = secs[i][(j + 1) % n], C = secs[i + 1][(j + 1) % n], D = secs[i + 1][j];
    pos.push(...A, ...B, ...C, ...A, ...C, ...D);
  }
  for (const sec of [secs[0], secs[N]]) {   // czoła
    const c = sec.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n, a[2] + p[2] / n], [0, 0, 0]);
    for (let j = 0; j < n; j++) pos.push(...c, ...sec[j], ...sec[(j + 1) % n]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}

// length [m]; radius [m] (0 = prosto); railLength: długość szyny między stykami [m]; gap: szczelina na styku [m]
export function buildTrack({ length = 30, radius = 0, railLength = 25, gap = 0.025, ballast = true, sleepers = true } = {}) {
  const mat = trainMaterials(), at = stationFn(length, radius), prof = railProfile();
  const root = new THREE.Group(); root.name = radius ? "tor (łuk)" : "tor (prosty)";
  const step = radius ? 0.5 : length;
  if (ballast) { const b = new THREE.Mesh(sweep(BALLAST, at, length, 0, radius ? 0.5 : length), mat.ballast); b.name = "podsypka"; b.receiveShadow = true; root.add(b); }
  if (sleepers) {
    const n = Math.floor(length / SL.step), sl = new THREE.InstancedMesh(new THREE.BoxGeometry(2 * SL.hx, 2 * SL.hy, 2 * SL.hz), mat.sleeper, n);
    const dm = new THREE.Object3D();
    for (let i = 0; i < n; i++) { const st = at((i + 0.5) * SL.step); dm.position.set(st.x, SL.yc, st.z); dm.rotation.set(0, Math.atan2(-st.tz, st.tx), 0); dm.updateMatrix(); sl.setMatrixAt(i, dm.matrix); }
    sl.name = "podkłady"; sl.castShadow = sl.receiveShadow = true; root.add(sl);
  }
  // szyny: odcinki po railLength ze szczeliną na stykach
  const joints = [];
  for (const side of [1, -1]) {
    for (let s0 = 0; s0 < length - 1e-6; s0 += railLength) {
      const s1 = Math.min(length, s0 + railLength), a = s0 > 0 ? s0 + gap / 2 : s0, b = s1 < length ? s1 - gap / 2 : s1;
      const seg = (s) => at(a + s);
      const m = new THREE.Mesh(sweep(prof, seg, b - a, side * RAIL_HALF, Math.min(step, b - a)), mat.rail);
      m.name = "szyna"; m.castShadow = m.receiveShadow = true; root.add(m);
      if (side > 0 && s1 < length) joints.push(s1);
    }
  }
  // łubki po obu stronach szyjki i śruby na każdym styku
  if (joints.length) {
    const plates = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.085, 0.02), mat.plate, joints.length * 4);
    const bolts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 8), mat.bolt, joints.length * 8);
    const dm = new THREE.Object3D(); let ip = 0, ib = 0;
    for (const s of joints) for (const side of [1, -1]) {
      const st = at(s), cx = st.x + st.nx * side * RAIL_HALF, cz = st.z + st.nz * side * RAIL_HALF, yaw = Math.atan2(-st.tz, st.tx);
      for (const sd of [1, -1]) { dm.position.set(cx + st.nx * sd * 0.019, -0.088, cz + st.nz * sd * 0.019); dm.rotation.order = "XYZ"; dm.rotation.set(0, yaw, 0); dm.updateMatrix(); plates.setMatrixAt(ip++, dm.matrix); }
      for (const a of [-0.21, -0.07, 0.07, 0.21]) { dm.position.set(cx + st.tx * a, -0.088, cz + st.tz * a); dm.rotation.order = "YXZ"; dm.rotation.set(Math.PI / 2, yaw, 0); dm.updateMatrix(); bolts.setMatrixAt(ib++, dm.matrix); }
    }
    plates.name = "łubki"; bolts.name = "śruby"; root.add(plates, bolts);
  }
  root.userData = { length, radius, at, joints };
  return root;
}
