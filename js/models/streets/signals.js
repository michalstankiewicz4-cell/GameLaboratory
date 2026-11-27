// StreetKit — sygnalizator świetlny (buildTrafficLight) i cykl świateł (signalAt).
import * as THREE from '../../../vendor/three/three.module.js';
import { geo } from './geom.js';

/* ---------------- sygnalizator świetlny ---------------- */
// Sygnalizator dla pojazdów: słup ocynkowany (opcjonalnie z wysięgnikiem nad jezdnię), komora z trzema komorami
// soczewek 300 mm (czerwone u góry, żółte, zielone), daszki nad soczewkami, tarcza tła z białą obwódką. Soczewki świecą
// (emisja ponad 1 — poświata w potoku kamery); zgaszone są ciemne, z odcieniem swojej barwy.
// Cykl jak w Polsce: zielone → żółte → czerwone → czerwone z żółtym → zielone; nocą żółte migające.
//   buildTrafficLight({ arm: 0 (m wysięgnika, w −x), height: 3.2 (m do dołu komory), backplate: true }) → { group, set(stan), state }
//   przód sygnału: +z (stronę, z której nadjeżdżają pojazdy)
//   SIGNAL_STATES  red | redYellow | green | yellow | yellowBlink | off
//   signalAt(t, { green, yellow, red, redYellow }, offset) → stan w chwili t [s] (cykl z czasami faz)
export const SIGNAL_STATES = { red: 'Czerwone', redYellow: 'Czerwone z żółtym', green: 'Zielone', yellow: 'Żółte', yellowBlink: 'Żółte migające', off: 'Wyłączone' };
// dwie fazy na przemian (skrzyżowanie): czerwone = zielone + żółte + czerwone z żółtym + 2 × 2 s „wszystkie czerwone”;
// faza B przesunięta o pół cyklu (SIGNAL_TIMES.half)
export const SIGNAL_TIMES = { green: 20, yellow: 3, red: 28.5, redYellow: 1.5, half: 26.5 };
export function signalAt(t, T = SIGNAL_TIMES, offset = 0) {
  const total = T.green + T.yellow + T.red + T.redYellow;
  let x = ((t + offset) % total + total) % total;
  if ((x -= T.green) < 0) return 'green';
  if ((x -= T.yellow) < 0) return 'yellow';
  if ((x -= T.red) < 0) return 'red';
  return 'redYellow';
}
export const steel = () => new THREE.MeshStandardMaterial({ color: 0x9aa0a3, roughness: 0.45, metalness: 0.85 });
const housingMat = () => new THREE.MeshStandardMaterial({ color: 0x1c1d1f, roughness: 0.55, metalness: 0.2 });
const LENS = { red: 0xff2a14, yellow: 0xffb01a, green: 0x1aff8a };
export function buildTrafficLight({ arm = 0, height = 3.2, backplate = true } = {}) {
  const g = new THREE.Group(); g.name = 'sygnalizator';
  const st = steel(), hm = housingMat();
  const add = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const L = 0.3, gap = 0.04, Hh = 3 * L + 4 * gap, W = L + 2 * gap, D = 0.24;   // komora: 3 soczewki 300 mm
  const top = height + Hh + 0.2;   // słup kończy się nad tarczą
  // słup z podstawą (stopa) i ewentualnie wysięgnik
  add(new THREE.CylinderGeometry(0.11, 0.13, 0.35, 16), st, 0, 0.175, 0);
  add(new THREE.CylinderGeometry(0.07, 0.085, top + (arm ? 1.2 : 0), 16), st, 0, (top + (arm ? 1.2 : 0)) / 2, 0);
  let hx = 0, hy = height, hz = 0.18;                                                   // gdzie wisi komora (przód: +z)
  if (arm > 0) {
    const ay = top + 0.9;
    // wysięgnik w −x: słup stoi po prawej stronie jezdni (ruch prawostronny), wysięgnik idzie nad pasy w lewo
    const a = add(new THREE.CylinderGeometry(0.055, 0.065, arm, 12), st, -arm / 2, ay, 0); a.rotation.z = Math.PI / 2;
    const brace = add(new THREE.CylinderGeometry(0.025, 0.025, Math.hypot(arm * 0.45, 0.8), 8), st, -arm * 0.22, ay - 0.4, 0); brace.rotation.z = Math.atan2(arm * 0.45, 0.8);   // od słupa (0,8 m niżej) w górę do wysięgnika
    hx = -(arm - 0.4); hy = ay - 0.15 - Hh; hz = 0;
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), st, hx, ay - 0.08, 0);
  } else {
    add(new THREE.BoxGeometry(0.08, 0.06, 0.18), st, 0, height + Hh * 0.8, 0.09);       // uchwyty komory
    add(new THREE.BoxGeometry(0.08, 0.06, 0.18), st, 0, height + Hh * 0.2, 0.09);
  }
  const head = new THREE.Group(); head.position.set(hx, hy, hz); g.add(head);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, D), hm); hb.position.set(0, Hh / 2, 0); hb.castShadow = true; head.add(hb);
  if (backplate) {
    // tarcza tła: czarna z białą obwódką (lepiej widać sygnał pod słońce)
    const bp = new THREE.Mesh(new THREE.BoxGeometry(W + 0.26, Hh + 0.26, 0.015), new THREE.MeshStandardMaterial({ color: 0x111112, roughness: 0.7 })); bp.position.set(0, Hh / 2, -D / 2 - 0.01); head.add(bp);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, Hh + 0.3, 0.03), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5 })); rim.position.set(0, Hh / 2, -D / 2 - 0.03); head.add(rim);   // tył tarczy czarnej schowany w obwódce
  }
  const lenses = {};
  ['red', 'yellow', 'green'].forEach((c, i) => {
    const y = Hh - gap - L / 2 - i * (L + gap);
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(LENS[c]).multiplyScalar(0.12), roughness: 0.15, metalness: 0, emissive: LENS[c], emissiveIntensity: 0 });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(L * 0.46, 28), m); lens.position.set(0, y, D / 2 + 0.012); head.add(lens);   // soczewka wypukła przed licem komory
    const ring = new THREE.Mesh(new THREE.RingGeometry(L * 0.46, L * 0.5, 28), hm); ring.position.set(0, y, D / 2 + 0.012); head.add(ring);
    // daszek nad soczewką (pół rury)
    const visor = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.52, L * 0.52, 0.2, 20, 1, true, -Math.PI / 2, Math.PI), hm);
    visor.rotation.x = Math.PI / 2; visor.position.set(0, y, D / 2 + 0.1); visor.material = hm.clone(); visor.material.side = THREE.DoubleSide; visor.castShadow = true; head.add(visor);
    lenses[c] = m;
  });
  const glow = new THREE.PointLight(0xffffff, 0, 6, 2); glow.position.set(0, Hh / 2, D / 2 + 0.4); head.add(glow);
  const on = { red: ['red'], redYellow: ['red', 'yellow'], green: ['green'], yellow: ['yellow'], yellowBlink: ['yellow'], off: [] };
  const api = {
    group: g, head, state: 'off',
    set(state, t = 0) {
      api.state = state;
      const lit = state === 'yellowBlink' && (t % 1.2) > 0.6 ? [] : on[state] || [];
      for (const c of ['red', 'yellow', 'green']) lenses[c].emissiveIntensity = lit.includes(c) ? 4.5 : 0;
      glow.intensity = lit.length ? 0.6 : 0; if (lit.length) glow.color.setHex(LENS[lit[lit.length - 1]]);
    },
  };
  api.set('red');
  return api;
}
