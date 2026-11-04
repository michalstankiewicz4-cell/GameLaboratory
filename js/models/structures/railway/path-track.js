// Tor wzdłuż dowolnej ścieżki (np. z OpenStreetMap): szyny z przekroju profile.js (ten sam co w kontakcie koło–szyna
// z aTrain), opcjonalnie podkłady i podsypka. Oś toru i jej łuki z zachowania „koło na szynie” (js/behaviors/rail/path.js:
// pathTrack) — fizyka i grafika mają ten sam tor. Moduł ES z three r186 (vendor).
// buildPathTrack(track, { lift, sleepers, ballast }) → Group; lift — główka szyny nad osią toru z track.height(s) [m].
import * as THREE from '../../../../vendor/three/three.module.js';
import { RAIL_HALF, SL } from '../../train/data.js';
import { railProfile, BALLAST } from './profile.js';

let mats = null;
export function pathTrackMaterials() {
  if (mats) return mats;
  mats = {
    rail: new THREE.MeshStandardMaterial({ color: 0x9da1a6, roughness: 0.32, metalness: 0.8 }),
    railSide: new THREE.MeshStandardMaterial({ color: 0x5b4a3e, roughness: 0.85, metalness: 0.3 }),   // rdza na szyjce i stopce
    sleeper: new THREE.MeshStandardMaterial({ color: 0x8c8a84, roughness: 0.95 }),                    // podkład betonowy
    ballast: new THREE.MeshStandardMaterial({ color: 0x7d786f, roughness: 1 }),
  };
  return mats;
}

// stacje wzdłuż osi: co `step` m na łukach, końce na prostych
function stations(track, step) {
  const out = [];
  for (const g of track.segs) {
    const n = g.kind === 'line' ? 1 : Math.max(1, Math.ceil(g.len / step));
    for (let k = 0; k < n; k++) out.push(g.s0 + g.len * k / n);
  }
  out.push(track.L);
  return out.map((s) => { const st = track.station(s); return { s, x: st.px, z: st.pz, nx: -st.tz, nz: st.tx, y: track.height(s) }; });
}
// przekrój wyciągnięty wzdłuż stacji (u0 — odsunięcie od osi), główka z jednym materiałem, reszta z drugim
function sweepProfile(st, prof, u0, lift, headFrom) {
  const pos = [], idx = [], groups = [[], []], n = prof.length;
  st.forEach((s) => prof.forEach(([u, v]) => pos.push(s.x + s.nx * (u0 + u), s.y + lift + v, s.z + s.nz * (u0 + u))));
  for (let i = 0; i < st.length - 1; i++) for (let j = 0; j < n; j++) {
    const j1 = (j + 1) % n, a = i * n + j, b = i * n + j1, c = (i + 1) * n + j1, d = (i + 1) * n + j;
    (prof[j][1] >= headFrom && prof[j1][1] >= headFrom ? groups[0] : groups[1]).push(a, b, c, a, c, d);
  }
  return { pos, groups };
}
export function buildPathTrack(track, { lift = 0, sleepers = false, ballast = false, step = 1 } = {}) {
  const M = pathTrackMaterials(), root = new THREE.Group(); root.name = 'tor';
  const st = stations(track, step), prof = railProfile();
  // szyny: główka (błyszcząca, wytarta), szyjka i stopka (rdza) — jedna geometria na tor, dwie grupy materiałów
  const pos = [], ix0 = [], ix1 = [];
  for (const side of [1, -1]) {
    const r = sweepProfile(st, prof, side * RAIL_HALF, lift, -0.04), off = pos.length / 3;
    for (const v of r.pos) pos.push(v); for (const v of r.groups[0]) ix0.push(v + off); for (const v of r.groups[1]) ix1.push(v + off);   // bez rozwijania (...) — długie tory
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(ix0.concat(ix1)); g.addGroup(0, ix0.length, 0); g.addGroup(ix0.length, ix1.length, 1); g.computeVertexNormals();
  const rails = new THREE.Mesh(g, [M.rail, M.railSide]); rails.name = 'szyny'; rails.castShadow = true; rails.receiveShadow = true; root.add(rails);
  if (ballast) {
    const b = sweepProfile(st, BALLAST, 0, lift, 99), bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); bg.setIndex(b.groups[1]); bg.computeVertexNormals();
    const bm = new THREE.Mesh(bg, M.ballast); bm.name = 'podsypka'; bm.receiveShadow = true; root.add(bm);
  }
  if (sleepers) {
    const n = Math.floor(track.L / SL.step), sl = new THREE.InstancedMesh(new THREE.BoxGeometry(2 * SL.hx, 2 * SL.hy, 2 * SL.hz), M.sleeper, n), d = new THREE.Object3D();
    for (let i = 0; i < n; i++) { const s = (i + 0.5) * SL.step, p = track.station(s); d.position.set(p.px, track.height(s) + lift + SL.yc, p.pz); d.rotation.set(0, Math.atan2(-p.tz, p.tx), 0); d.updateMatrix(); sl.setMatrixAt(i, d.matrix); }
    sl.name = 'podkłady'; sl.castShadow = sl.receiveShadow = true; sl.computeBoundingSphere(); root.add(sl);
  }
  return root;
}
