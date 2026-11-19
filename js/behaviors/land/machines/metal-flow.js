// Strumień ciekłego metalu: cząstki (każda = dV metalu ze składem) z grawitacją, spływające rynną linii
// odlewniczej i wpadające do form. Rynna i formy jako proste kształty analityczne w układzie linii (szybko na CPU,
// bez zderzaczy Rapier). Rysowane jednym InstancedMesh z shaderem lawy, rozciągane wzdłuż prędkości.
import * as THREE from '../../vendor/three/three.module.js';
import { lavaMaterial } from '../render/lava.js';

const MAX = 1500;
export class MetalFlow {
  constructor(scene, castingRoot, layout) {
    this.L = layout; this.root = castingRoot; castingRoot.updateMatrixWorld(true);
    this.M = castingRoot.matrixWorld.clone(); this.Mi = this.M.clone().invert();
    this.dV = 0.00004;                                    // m³ na cząstkę (40 ml)
    this.p = new Float32Array(MAX * 3); this.v = new Float32Array(MAX * 3); this.al = new Float32Array(MAX); this.dens = new Float32Array(MAX); this.n = 0;
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 8, 6), lavaMaterial({ heat: 1, scale: 9 }), MAX);
    this.mesh.count = 0; this.mesh.frustumCulled = false; scene.add(this.mesh);
    const T = layout.trough, s = new THREE.Vector3(...T.start), e = new THREE.Vector3(...T.end);
    this.tc = s.clone().add(e).multiplyScalar(0.5); this.tdir = e.clone().sub(s); this.tlen = this.tdir.length(); this.tdir.normalize();
    this.tn = new THREE.Vector3(0, this.tdir.z, -this.tdir.y);   // normalna dna (w górę)
    this.floorH = -T.depth / 2 + 0.015 - 0.005; this.halfW = T.width / 2;
    this.sinks = [];                                      // formy: { x (lokalnie), y góry, z, add(dV, al, dens) }
    this.wasted = 0; this.held = []; this.small = false;   // rozdzielacz: false — duże formy (LAYOUT.pour), true — małe (LAYOUT.pour2)
     this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.tmp = new THREE.Vector3();
  }
  emit(worldPos, worldVel, mix) {
    if (this.n >= MAX) return;
    const k = this.n++, lp = worldPos.clone().applyMatrix4(this.Mi), lv = worldVel.clone().transformDirection(this.Mi).multiplyScalar(worldVel.length());
    this.p.set([lp.x + (Math.random() - 0.5) * 0.01, lp.y, lp.z], k * 3); this.v.set([lv.x, lv.y, lv.z], k * 3); this.al[k] = mix.al; this.dens[k] = mix.density;
  }
  kill(k) { const j = --this.n; if (k !== j) { this.p.copyWithin(k * 3, j * 3, j * 3 + 3); this.v.copyWithin(k * 3, j * 3, j * 3 + 3); this.al[k] = this.al[j]; this.dens[k] = this.dens[j]; } }
  step(dt) {
    const P = this.p, Vv = this.v, d = this.tmp;
    // metal zatrzymany w dyszy na czas przesuwu przenośnika — wypuszczany, gdy forma stoi pod dyszą
    if (!this.blocked && this.held.length && this.n < MAX) {
      const z = (this.small ? this.L.pour2 : this.L.pour)[2], y = this.L.moldTop + 0.12;
      for (let r = 0; r < 3 && this.held.length; r++) { const [al, dens] = this.held.shift(), k = this.n++; this.p.set([(Math.random() - 0.5) * 0.03, y, z], k * 3); this.v.set([0, -0.8, 0], k * 3); this.al[k] = al; this.dens[k] = dens; }
    }
    for (let k = this.n - 1; k >= 0; k--) {
      const i = k * 3;
      Vv[i + 1] -= 9.81 * dt;
      P[i] += Vv[i] * dt; P[i + 1] += Vv[i + 1] * dt; P[i + 2] += Vv[i + 2] * dt;
      // rynna
      d.set(P[i] - this.tc.x, P[i + 1] - this.tc.y, P[i + 2] - this.tc.z);
      const s = d.dot(this.tdir), h = d.dot(this.tn), x = P[i];
      // dysza na końcu rynny: metal spływa pionowo w dół do formy pod nią
      if (s >= this.tlen / 2 && s < this.tlen / 2 + 0.12 && Math.abs(x) < this.halfW + 0.06 && h < this.floorH + 0.18 && h > this.floorH - 0.12) {
        P[i] = (Math.random() - 0.5) * 0.03; P[i + 2] = (this.small ? this.L.pour2 : this.L.pour)[2] + (Math.random() - 0.5) * 0.02;
        const sp = Math.hypot(Vv[i], Vv[i + 1], Vv[i + 2]); Vv[i] = 0; Vv[i + 2] = 0; Vv[i + 1] = -Math.max(0.6, sp * 0.4);
        // przenośnik pod dyszą jedzie: metal czeka w dyszy (nie leje się między formy)
        if (this.blocked) { this.held.push([this.al[k], this.dens[k]]); this.kill(k); }
        continue;
      }
      if (Math.abs(s) < this.tlen / 2 && Math.abs(x) < this.halfW + 0.06 && h < this.floorH + 0.18 && h > this.floorH - 0.08) {
        if (h < this.floorH) {
          const push = this.floorH - h; P[i] += this.tn.x * push; P[i + 1] += this.tn.y * push; P[i + 2] += this.tn.z * push;
          const vn = Vv[i] * this.tn.x + Vv[i + 1] * this.tn.y + Vv[i + 2] * this.tn.z;
          if (vn < 0) { Vv[i] -= vn * this.tn.x; Vv[i + 1] -= vn * this.tn.y; Vv[i + 2] -= vn * this.tn.z; }
          Vv[i] *= 0.9; Vv[i + 1] *= 0.995; Vv[i + 2] *= 0.995;     // lepkość (ciekły metal płynie, nie skacze)
        }
        if (Math.abs(x) > this.halfW - 0.015) { P[i] = Math.sign(x) * (this.halfW - 0.015); Vv[i] *= -0.2; }
        continue;
      }
      // formy
      let done = false;
      for (const m of this.sinks) {
        if (Math.abs(P[i] - m.x()) < m.hx && Math.abs(P[i + 2] - m.z) < m.hz && P[i + 1] < m.y + 0.01) { m.add(this.dV, this.al[k], this.dens[k]); this.kill(k); done = true; break; }
      }
      if (done) continue;
      if (P[i + 1] < this.L.moldTop - 0.02 && (Math.abs(P[i + 2] - this.L.moldZ) < 0.36 || Math.abs(P[i + 2] - this.L.moldZ2) < 0.36) && P[i] > this.L.conveyor.x0 - 0.1 && P[i] < this.L.conveyor.x1 + 0.1) { this.kill(k); this.wasted += this.dV; continue; }
      if (P[i + 1] < 0.01) { this.kill(k); this.wasted += this.dV; }
    }
    // rysowanie: kulki rozciągnięte wzdłuż prędkości
    for (let k = 0; k < this.n; k++) {
      const i = k * 3; d.set(Vv[i], Vv[i + 1], Vv[i + 2]); const sp = d.length();
      this.q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sp > 1e-3 ? d.normalize() : new THREE.Vector3(0, 1, 0));
      this.m4.compose(this.tmp.set(P[i], P[i + 1], P[i + 2]).applyMatrix4(this.M), this.q, new THREE.Vector3(1, 1 + Math.min(2.5, sp * 0.8), 1));
      this.mesh.setMatrixAt(k, this.m4);
    }
    this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true;
  }
}
