// Zachowanie „koło na szynie” — tramwaj (TramKit, np. PESA Swing 120Na) w fizyce z aTrain (physics.js): człony na
// wózkach stałych to pojazdy z dwoma zestawami kołowymi na zawieszeniu I stopnia (jak wagon z aTrain), człony
// podwieszone wiszą na przegubach (dwa punkty na pionowej osi między członami). Tramwaj trzyma się szyn wyłącznie
// siłami kontaktu koło–szyna; tor z dowolnej ścieżki (path.js). Jedzie w swoim płaskim układzie (główka szyny y = 0),
// warstwa świata dodaje wysokość toru i siłę spadku (sim.onStep).
import { createSim } from "./physics.js";
export { H } from "./physics.js";
export const ENVIRONMENTS = ["land"];

// info: opis tramwaju z TramKit (sections, gap, phys)
export function tramConsist(info) {
  const ph = info.phys;
  return info.sections.map((sp, i) => ({
    type: "tram",
    def: { Lb: sp.L, wb: sp.bogie != null ? ph.wb : 0, bx: sp.bogie || 0, comY: ph.comY[i], Rw: ph.Rw, mass: ph.mass[i],
      dims: [sp.L, ph.H, ph.W], kv: ph.kv, kl: ph.kl, kx: ph.kx, driven: ph.driven[i] },
  }));
}
// track: pathTrack(...) ; s0: położenie czoła tramwaju na torze [m]
export function createTramSim(track, info, s0) {
  const consist = tramConsist(info), ph = info.phys, hinges = [];
  for (let i = 0; i < consist.length - 1; i++) hinges.push([i, i + 1, ph.hinge[0], ph.hinge[1]]);
  return createSim({ track, consist, gaps: info.gap, s0, hinges, power: ph.power });
}
// pozy członów dla modelu (update({ poses })): środek członu na główce szyny, obrót z bryły; lift(x, z) — wysokość
// toru w świecie; out: tablica { x, y, z, q } (q: THREE.Quaternion), fix: obrót modelu (+Z) na oś bryły (+x)
export function tramPoses(sim, lift, out, THREE) {
  const fix = tramPoses.fix || (tramPoses.fix = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
  const tmp = [0, 0, 0];
  sim.vehicles.forEach((v, i) => {
    const b = v.body; b.toWorld(0, -v.def.comY, 0, tmp);
    const o = out[i] || (out[i] = { x: 0, y: 0, z: 0, q: new THREE.Quaternion() });
    o.x = tmp[0]; o.z = tmp[2]; o.y = tmp[1] + lift(tmp[0], tmp[2]);
    o.q.set(b.q[1], b.q[2], b.q[3], b.q[0]).multiply(fix);
  });
  return out;
}
