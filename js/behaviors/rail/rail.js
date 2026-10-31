// Zachowanie „koło na szynie” — podpięcie fizyki (physics.js) do modelu składu z TrainKit
// (js/models/train: buildTrain). Model nie wie o fizyce: zachowanie co klatkę ustawia jego
// ruchome części (userData) z brył sztywnych symulacji — pudła, zestawy kołowe, maźnice i
// sprężyny, talerze zderzaków, głowice sprzęgu kłowego z kością, ogniwa łańcucha.
// Z aTrain (js/app.js: syncVisuals, pętla kroków fizyki, kamery śledzące).
import { createSim, H } from "./physics.js";
import { setBuffer, setKnuckle } from "../../models/train/trainkit.js";
export { ENVIRONMENTS } from "./physics.js";
const THREE = window.THREE;

const q3 = (q, o) => o.set(q[1], q[2], q[3], q[0]);   // [w, x, y, z] → THREE.Quaternion

// train: skład z buildTrain(DEFAULT_TRAIN) — lokomotywa, wagon (sprzęg kłowy), wagon (łańcuch), jak w fizyce
export function attachRail(train, sim = createSim()) {
  const models = train.userData.vehicles;
  if (models.length !== sim.vehicles.length) throw new Error("rail: skład modelu (" + models.length + ") ≠ skład fizyki (" + sim.vehicles.length + ")");
  train.position.set(0, 0, 0); train.quaternion.identity();
  const qb = new THREE.Quaternion(), qi = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  const tmp = [0, 0, 0], loc = [0, 0, 0];
  const links = sim.couplers.find((c) => c.type === "chain");
  const knuckle = sim.couplers.find((c) => c.type === "knuckle");
  const V = models.map((m, i) => {
    const veh = sim.vehicles[i], u = m.userData;
    u.body.position.set(0, 0, 0);                 // pudło: początek w środku masy (fizyka liczy tam)
    const bufs = u.buffers.map((h) => [h, sim.bufHeads.find((b) => b.veh === veh && b.e === h.userData.sx && b.sz === h.userData.sz) || null]);
    const kn = knuckle ? [[knuckle.ka, knuckle.ka.veh === veh], [knuckle.kb, knuckle.kb.veh === veh]].filter(([, on]) => on).map(([k]) => [k, u.knuckles[0]]) : [];
    return { m, u, veh, bufs, kn };
  });
  // punkt świata → układ pudła
  const toLocal = (b, P, o) => b.dirLocal(P[0] - b.p[0], P[1] - b.p[1], P[2] - b.p[2], o);
  function sync() {
    for (const { m, u, veh, bufs, kn } of V) {
      const b = veh.body;
      m.position.set(b.p[0], b.p[1], b.p[2]); q3(b.q, m.quaternion);
      qi.copy(m.quaternion).invert();
      veh.ws.forEach((ws, k) => {
        const w = u.wheelsets[k]; toLocal(b, ws.p, loc); w.position.set(loc[0], loc[1], loc[2]);
        w.quaternion.multiplyQuaternions(qi, q3(ws.q, qb));
        for (const sd of w.userData.sides) sd.position.z = sd.userData.sg * sim.btb;
      });
      veh.springs.forEach((sp, k) => {
        const { box: bx, coil: c } = u.axleboxes[k].userData;
        toLocal(b, sp.ws.toWorld(0, 0, sp.wz, tmp), loc);
        bx.position.set(loc[0], loc[1], loc[2]);
        c.position.set(loc[0], loc[1] + 0.12, loc[2]);
        dir.set(sp.ax - loc[0], sp.ay - 0.03 - (loc[1] + 0.12), sp.az - loc[2]);
        const len = dir.length(); c.quaternion.setFromUnitVectors(up, dir.normalize()); c.scale.set(1, Math.max(len, 0.01), 1);
      });
      for (const [h, bf] of bufs) setBuffer(h, bf ? bf.comp : 0);
      for (const [k, head] of kn) {
        toLocal(b, k.body.p, loc); head.position.set(loc[0], loc[1], loc[2]);
        head.quaternion.multiplyQuaternions(qi, q3(k.body.q, qb)); setKnuckle(head, k.ang);
      }
    }
    if (links) links.links.forEach((l, k) => { const o = train.userData.links[k]; if (o) { o.position.set(l.p[0], l.p[1], l.p[2]); q3(l.q, o.quaternion); } });
  }
  // kroki fizyki za czas rzeczywisty (najwyżej 140 na klatkę, jak w aTrain); NaN zatrzymuje symulację
  let acc = 0;
  function update(dt) {
    acc += Math.min(dt, 1 / 20);
    let n = 0;
    if (!sim.broken) { while (acc >= H && n < 140) { sim.step(); acc -= H; n++; if (sim.broken) break; } }
    if (n >= 140 || sim.broken) acc = 0;
    sim.events.length = 0;            // zdarzenia akustyczne: bez dźwięku w laboratorium
    if (!sim.broken) sync();
    return n;
  }
  sync();
  return { sim, sync, update };
}

// punkty do kamer śledzących (aTrain: Lokomotywa, Koła, Obrzeże od spodu, Sprzęgi, Rozjazdy)
const tY = [0, 0, 0];
const yawOf = (b) => { b.dirWorld(1, 0, 0, tY); return Math.atan2(-tY[2], tY[0]); };
export function railAnchor(sim, kind) {
  if (kind === "sw1" || kind === "sw2") return { p: new THREE.Vector3(sim.TRACK.hl + 7, 0, (kind === "sw1" ? -1 : 1) * sim.TRACK.R), yaw: 0 };
  if (kind === "flange") { const veh = sim.vehicles[0], ws = veh.ws[0], p = ws.toWorld(0, -ws.Rw, -0.75, [0, 0, 0]); return { p: new THREE.Vector3(p[0], p[1], p[2]), yaw: yawOf(veh.body) }; }
  if (kind === "loco") { const b = sim.vehicles[0].body; return { p: new THREE.Vector3(b.p[0], b.p[1], b.p[2]), yaw: yawOf(b) }; }
  if (kind === "side") { const veh = sim.vehicles[0], b = veh.body, p = b.toWorld(0, veh.def.Rw - veh.def.comY, 0, [0, 0, 0]); return { p: new THREE.Vector3(p[0], p[1], p[2]), yaw: yawOf(b) }; }
  const c = sim.couplers[kind === "c0" ? 0 : 1];
  const pa = c.pa || c.A.body.toWorld(...c.ha, [0, 0, 0]), pb = c.pb || c.B.body.toWorld(...c.hb, [0, 0, 0]);
  const ya = yawOf(c.A.body), yb = yawOf(c.B.body);
  return { p: new THREE.Vector3((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2), yaw: Math.atan2(Math.sin(ya) + Math.sin(yb), Math.cos(ya) + Math.cos(yb)) };
}
export const ANCHOR_OFFSET = {
  side: [0, 0.15, -6.0], flange: [0.75, -0.13, 0.42], loco: [-11, 5, -10], sw1: [-7, 4.5, -8], sw2: [-7, 4.5, 8], c0: [2.2, 1.4, -4.6], c1: [2.2, 1.4, -4.6],
};
