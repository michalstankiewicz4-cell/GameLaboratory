// Zachowanie „przeładowarka z chwytakiem” (środowisko: ląd) — dla modelu JunkKit vehicle/grapple-truck.js (gra
// Złomowisko). W grze liczone silnikiem Rapier (js/vehicle/truck.js); tu na fizyce GameLaboratory, z tymi samymi liczbami:
//   - jazda: land/drive.js (bryła w płaszczyźnie gruntu, siły opon, napęd, hamulce, opory) z liczbami z gry: 18 t,
//     siła napędu 26 kN przy ruszaniu (moc 65 kW na kołach), prędkość graniczna 14 m/s (26 kN przy tłumieniu 0,1/s
//     w Rapier), skręt przednich kół do 0,55 rad (promień zawracania z rozstawu osi);
//   - hydraulika: nadwozie, wysięgnik i ramię sztywne (jak w grze — kinematyczne), prędkości siłowników z gry:
//     obrót 0,5 rad/s, wysięgnik 0,35 rad/s, ramię 0,45 rad/s, zakresy jak w grze;
//   - chwytak: wahadło sferyczne pod końcem ramienia (przegub kulowy w grze) — grawitacja,
//     ruch punktu zawieszenia przenosi się przez więz odległości (Verlet), tłumienie kątowe 3/s jak w grze;
//   - szczęki: 4 zawiasy z silnikami położenia (sztywność i tłumienie z gry: otwieranie 12 000 / 1 200, zamykanie
//     60 000 / 3 000), bezwładność szczęki 25 kg; szczęka zatrzymuje się na przedmiocie (kontakt sprężysty), a nacisk
//     silnika na przedmiot daje tarcie μ·ΣN — przedmiot jest trzymany, dopóki tarcie przenosi jego ciężar (z
//     przyspieszeniem chwytaka); gdy nie — wyślizguje się i spada;
//   - ugięcie pod ciężarem: wysięgnik i ramię uginają się od momentu ładunku (podatność z gry, sprężyna z tłumieniem);
//   - zawieszenie: podwozie (14 t jak ciało w grze) na 4 sprężynach kół z liczbami kontrolera Rapier w grze (sztywność
//     60 i tłumienie 4,4 / 2,3 × masa podwozia, najwyżej 110 kN na koło, skok 0,32 m) — przechyla się (nurkowanie,
//     przechył, unoszenie się podwozia) od przeciwwagi 4 t i ciężaru chwytaka z ładunkiem w końcu ramienia (jak siły
//     w grze, obracają się z nadwoziem) oraz od przyspieszeń jazdy (siła bezwładności w środku masy, 1 m nad gruntem);
//     koło bez nacisku odrywa się od gruntu;
//   - zderzenia przedmiotów: prostopadłościany (OBB) przedmiotów zderzają się ze sobą, z pojazdem (zderzacze z gry:
//     podwozie, nadwozie, wysięgnik, ramię, koła, głowica chwytaka) i z gruntem — rozdzielenie po osi najmniejszego
//     wnikania (SAT), zderzenie niesprężyste, tarcie Coulomba; przedmioty leżą jeden na drugim.
// Uproszczenia względem gry: przedmioty nie obracają się od zderzeń (tylko wokół pionu, jak leżą), pojazd nie odczuwa
// zderzeń z przedmiotami (18 t wobec najwyżej 190 kg), obrót chwytaka wokół pionu idzie za ramieniem (opór przegubu).
//
// createGrapple(model, { x, z, yaw, ground }) → g
//   g.step(dt, c)  c: { throttle −1…1, steer −1…1 (dodatni w lewo), brake 0…1, slew −1…1, boom −1…1, stick −1…1 }
//   g.toggleJaws(), g.setJaws(zamknięte), g.addItem({ mesh, mass, half: [x,y,z], name }), g.sync() — model i przedmioty
//   g.drive (land/drive.js), g.arm { slew, boom, stick, sagB, sagS }, g.payload [kg], g.held — trzymane przedmioty,
//   g.susp { y, th (pochylenie, przód w górę +), ph (przechył, lewa strona w górę +), F: [siła na koło, N] }
import * as THREE from '../../../vendor/three/three.module.js';
import { createDrive, driveDef } from './drive.js';
import { LAYOUT } from '../../models/junkyard/vehicle/grapple-truck.js';

export const ENVIRONMENTS = ['land'];
const G = 9.81, JAW_I = 25 * 0.6 * 0.6, MU = 0.7, ANG_DAMP = 3;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// liczby jazdy z gry (truck.js): siła 26 kN, prędkość graniczna 14 m/s, skręt 0,55 rad
export function grappleDriveDef() {
  const wb = LAYOUT.wheels[0][2] - LAYOUT.wheels[2][2], track = LAYOUT.wheels[1][0] - LAYOUT.wheels[0][0];
  return driveDef({ mass: LAYOUT.mass, power: 26000 * 2.5 / 0.85, maxSpeed: 14, turnRadius: wb / Math.tan(0.55), wheelbase: wb, gauge: track,
    length: 5.2, width: 2.4, height: 3.6, mu: 0.8, v0: 2.5 });
}

// koniec szczęki w układzie chwytaka przy kącie θ (jak zderzacz szczęki w grze: łuk R0 = 0,95, koniec przy φ = 1,5)
const TIP = { y: -0.95 * Math.sin(1.5), z: 0.95 * (Math.cos(1.5) - 1) * 0.55 };
const tipRadial = (th) => LAYOUT.jawHinge + TIP.y * Math.sin(th) + TIP.z * Math.cos(th);
const tipHeight = (th) => -LAYOUT.grappleHang + TIP.y * Math.cos(th) - TIP.z * Math.sin(th);

// zawieszenie (gra: kontroler pojazdu Rapier; siły sprężyn × masa ciała podwozia, jak w Rapier)
const BODY = 14000, K_SUSP = 60 * BODY, C_COMP = 4.4 * BODY, C_REL = 2.3 * BODY, F_MAX = 110000, REST = 0.32;
const I_PITCH = 28000, I_ROLL = 8400, H_CG = 1.0, CW_MASS = 4000, GRAB_MASS = 700;

// prostopadłościan zorientowany (OBB) i test SAT: { c, ax: [3 osie], e: [3 półwymiary] }
const V3 = () => new THREE.Vector3();
function obbFrom(matrix, center, half, out) {
  out.c.set(...center).applyMatrix4(matrix);
  for (let i = 0; i < 3; i++) out.ax[i].setFromMatrixColumn(matrix, i).normalize();
  out.e[0] = half[0]; out.e[1] = half[1]; out.e[2] = half[2];
  return out;
}
const newObb = () => ({ c: V3(), ax: [V3(), V3(), V3()], e: [0, 0, 0], v: V3(), prev: null });
const axisT = V3(), dT = V3();
// najmniejsze wnikanie B w A: { depth, n (od A do B) } albo null
function sat(A, B, nOut) {
  let best = Infinity;
  dT.copy(B.c).sub(A.c);
  const test = (L) => {
    const len = L.length(); if (len < 1e-6) return true;
    L.multiplyScalar(1 / len);
    let ra = 0, rb = 0;
    for (let i = 0; i < 3; i++) { ra += A.e[i] * Math.abs(A.ax[i].dot(L)); rb += B.e[i] * Math.abs(B.ax[i].dot(L)); }
    const d = dT.dot(L), o = ra + rb - Math.abs(d);
    if (o < 0) return false;
    if (o < best) { best = o; nOut.copy(L).multiplyScalar(d < 0 ? -1 : 1); }
    return true;
  };
  for (let i = 0; i < 3; i++) if (!test(axisT.copy(A.ax[i]))) return null;
  for (let i = 0; i < 3; i++) if (!test(axisT.copy(B.ax[i]))) return null;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (!test(axisT.crossVectors(A.ax[i], B.ax[j]))) return null;
  return best;
}

export function createGrapple(model, { x = 0, z = 0, yaw = 0, ground = null, scene = null } = {}) {
  const drive = createDrive(grappleDriveDef(), { x, z, yaw });
  const up = model.getObjectByName('nadwozie'), bm = model.getObjectByName('wysięgnik'), st = model.getObjectByName('ramię');
  const gr = model.getObjectByName('chwytak'), wheels = [0, 1, 2, 3].map((i) => model.getObjectByName('koło ' + i));
  const jawG = [0, 1, 2, 3].map((k) => model.getObjectByName('szczęka ' + k));
  const arm = { slew: 0, boom: 0.55, stick: 1.35, sagB: 0, vB: 0, sagS: 0, vS: 0 };
  const jaws = jawG.map(() => ({ th: LAYOUT.jawOpen, w: 0, N: 0 }));
  let closed = false, spin = 0, wheelSpin = 0;
  const bobV = new THREE.Vector3(), bobA = new THREE.Vector3();   // prędkość i przyspieszenie chwytaka (do trzymania)
  const items = [], held = new Set();
  // chwytak — wahadło: punkt masy (środek chwytaka) wisi na długości L pod końcem ramienia
  const L = LAYOUT.grappleHang * 0.85;
  const pivot = new THREE.Vector3(), pivotPrev = new THREE.Vector3(), bob = new THREE.Vector3(), bobPrev = new THREE.Vector3();
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), q = new THREE.Quaternion(), down = new THREE.Vector3(0, -1, 0);
  const gh = (px, pz) => (ground && ground.height ? ground.height(px, pz) : 0);
  // zawieszenie: unoszenie y, pochylenie th (przód w górę), przechył ph (lewa, +x, w górę) i ich prędkości
  const susp = { y: 0, vy: 0, th: 0, vth: 0, ph: 0, vph: 0, F: [0, 0, 0, 0], u0: 0, aLong: 0, aLat: 0 };
  const W0 = (BODY + CW_MASS + GRAB_MASS) * G, S0 = W0 / (4 * K_SUSP);   // ugięcie sprężyn pod ciężarem bez ładunku
  const qYaw = new THREE.Quaternion(), qTilt = new THREE.Quaternion(), eTilt = new THREE.Euler(), Y = new THREE.Vector3(0, 1, 0);

  function poseArm() {
    model.position.set(drive.state.x, gh(drive.state.x, drive.state.z) + susp.y, drive.state.z);
    qYaw.setFromAxisAngle(Y, drive.state.yaw); qTilt.setFromEuler(eTilt.set(-susp.th, 0, susp.ph));
    model.quaternion.copy(qYaw).multiply(qTilt);
    up.rotation.y = arm.slew; bm.rotation.x = -(arm.boom - arm.sagB); st.rotation.x = arm.stick + arm.sagS;
    model.updateMatrixWorld(true);
    return tmp.set(0, 0, LAYOUT.stickLen).applyMatrix4(st.matrixWorld);   // koniec ramienia = przegub chwytaka
  }
  poseArm(); pivot.copy(tmp); pivotPrev.copy(pivot); bob.copy(pivot).addScaledVector(down, L); bobPrev.copy(bob);
  // chwytak wisi w świecie (jak w grze: odczepiony od ramienia, ciało na przegubie)
  const world = scene || model.parent;
  if (world) world.attach(gr);

  const payload = () => [...held].reduce((m, it) => m + it.mass, 0);
  function setJaws(c) { closed = !!c; }

  // przedmiot w zasięgu szczęk: środek w osi chwytaka (najwyżej 0,35 m w bok), w wysokości końców szczęk
  function inGrip(it, local) {
    const r = Math.hypot(local.x, local.z), h = it.half;
    return r < 0.35 + Math.min(h[0], h[2]) * 0.3 && local.y < -0.15 && local.y > -LAYOUT.grappleHang - 1.0 - h[1];
  }

  function stepJaws(dt) {
    // przedmiot między szczękami: w układzie chwytaka (oś chwytaka = kierunek wahadła)
    const axis = tmp2.copy(bob).sub(pivot).normalize();
    q.setFromUnitVectors(down, axis);
    const qi = q.clone().invert();
    let target = null, tLocal = null;
    for (const it of items) {
      const loc = it.p.clone().sub(pivot).applyQuaternion(qi);
      if (inGrip(it, loc)) { target = it; tLocal = loc; break; }
    }
    // promień przedmiotu wzdłuż każdej szczęki (szczęki co 90°): pół szerokości przedmiotu w tym kierunku + przesunięcie środka
    const K = closed ? 60000 : 12000, C = closed ? 3000 : 1200, aim = closed ? LAYOUT.jawClosed : LAYOUT.jawOpen;
    // szczęki: sztywny kontakt wymaga drobnego kroku — 16 kroków na krok zachowania (1/3840 s)
    const sub = 16, hs = dt / sub, gY = gh(pivot.x, pivot.z);
    jaws.forEach((j, k) => {
      const a = k * Math.PI / 2 + spin, dir = [Math.sin(a), Math.cos(a)];
      let reach = null, top = 0, bot = 0;
      if (target) {
        const halfW = Math.abs(dir[0]) * target.half[0] + Math.abs(dir[1]) * target.half[2];
        reach = halfW + (tLocal.x * dir[0] + tLocal.z * dir[1]);                  // od osi do powierzchni przedmiotu po stronie szczęki
        top = tLocal.y + target.half[1]; bot = tLocal.y - target.half[1];
      }
      for (let i = 0; i < sub; i++) {
        let tau = K * (aim - j.th) - C * j.w;
        j.N = 0;
        // przedmiot: koniec szczęki wszedł w jego bok (pen > 0) na jego wysokości — kontakt sprężysty z tłumieniem
        const dr = TIP.y * Math.cos(j.th) - TIP.z * Math.sin(j.th);                // d(promień końca)/dθ (zamykanie: < 0)
        if (reach !== null) {
          const pen = reach - tipRadial(j.th), hTip = tipHeight(j.th);
          if (pen > 0 && hTip < top + 0.05 && hTip > bot - 0.25) {
            const Fn = Math.max(0, 8e5 * pen + 6000 * (-dr * j.w));
            tau += Fn * dr; j.N = Fn;
          }
        }
        // grunt pod końcem szczęki: kontakt przeciw ruchowi końca w dół (dh/dθ — jak koniec idzie z kątem)
        const tipY = pivot.y + tipHeight(j.th), dh = -TIP.y * Math.sin(j.th) - TIP.z * Math.cos(j.th);
        if (tipY < gY) tau += Math.max(0, 8e5 * (gY - tipY) - 6000 * dh * j.w) * dh;
        j.w += (tau / JAW_I) * hs; j.th += j.w * hs;
        if (j.th < LAYOUT.jawOpen - 0.1) { j.th = LAYOUT.jawOpen - 0.1; j.w = 0; }
        if (j.th > LAYOUT.jawClosed + 0.12) { j.th = LAYOUT.jawClosed + 0.12; j.w = 0; }
      }
    });
    return { target, tLocal, q };
  }

  // ugięcie wysięgnika i ramienia od ładunku (gra: deflect — podatność × moment, sprężyna z tłumieniem 1,6 Hz)
  function deflect(dt) {
    const F = payload() * G;
    const pb = new THREE.Vector3().setFromMatrixPosition(bm.matrixWorld), ps = new THREE.Vector3().setFromMatrixPosition(st.matrixWorld);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(up.matrixWorld)); fwd.y = 0; fwd.normalize();
    const rb = pivot.clone().sub(pb).dot(fwd), rs = pivot.clone().sub(ps).dot(fwd);
    const CB = 2.6e-7, CS = 3.5e-7, w = 2 * Math.PI * 1.6, zt = 0.12;
    arm.vB += (w * w * (F * rb * CB - arm.sagB) - 2 * zt * w * arm.vB) * dt; arm.sagB += arm.vB * dt;
    arm.vS += (w * w * (F * rs * CS - arm.sagS) - 2 * zt * w * arm.vS) * dt; arm.sagS += arm.vS * dt;
  }

  function stepItems(dt, grip) {
    const { target, tLocal, q: gq } = grip;
    const Nsum = jaws.reduce((s, j) => s + j.N, 0), opposite = (jaws[0].N > 0 && jaws[2].N > 0) || (jaws[1].N > 0 && jaws[3].N > 0);
    // trzymanie: tarcie μ·ΣN przenosi ciężar przedmiotu i jego przyspieszenie razem z chwytakiem
    for (const it of items) {
      // potrzebna siła: ciężar i przyspieszenie razem z chwytakiem (pionowa składowa w górę dociąża)
      const need = it.mass * Math.hypot(bobA.x, G + bobA.y, bobA.z);
      if (it === target && closed && opposite && MU * Nsum >= need) {
        if (!held.has(it)) { held.add(it); it.local = tLocal.clone(); it.qRel = gq.clone().invert().multiply(it.q); }
      } else if (held.has(it)) { held.delete(it); it.yaw = spin; }   // wyślizguje się: dalej leci z prędkością chwytaka
      if (held.has(it)) {
        const np = it.local.clone().applyQuaternion(gq).add(pivot);
        it.v.copy(np).sub(it.p).divideScalar(dt); it.p.copy(np);
        it.q.copy(gq).multiply(it.qRel);
      } else {
        // spadanie i leżenie na gruncie (tarcie gasi poślizg); na innym przedmiocie podpiera go zderzenie (collide)
        const floor = gh(it.p.x, it.p.z) + it.half[1];
        it.v.y -= G * dt; it.p.addScaledVector(it.v, dt);
        if (it.support && it.p.y > floor) it.q.copy(it.q0).premultiply(new THREE.Quaternion().setFromAxisAngle(down, -it.yaw));
        if (it.p.y <= floor) {
          it.p.y = floor; it.v.y = 0;
          const hv = Math.hypot(it.v.x, it.v.z), dv = MU * G * dt;
          if (hv <= dv) { it.v.x = 0; it.v.z = 0; } else { it.v.x *= 1 - dv / hv; it.v.z *= 1 - dv / hv; }
          it.q.copy(it.q0).premultiply(new THREE.Quaternion().setFromAxisAngle(down, -it.yaw));   // leży prosto
        }
      }
    }
  }

  // punkt świata → płaszczyzna podwozia (x w lewo, z do przodu), bez przechyłu (małe kąty)
  const local = (p) => { const dx = p.x - drive.state.x, dz = p.z - drive.state.z, c = Math.cos(drive.state.yaw), s = Math.sin(drive.state.yaw); return [dx * c - dz * s, dx * s + dz * c]; };
  const cwP = V3();
  function stepSuspension(h) {
    // przyspieszenia jazdy (do siły bezwładności): wzdłuż z u̇, w bok z prędkości obrotu (u·r)
    s0Track(h);
    const M = BODY;
    let Fy = -BODY * G, Mth = M * susp.aLong * H_CG, Mph = M * susp.aLat * H_CG;
    // przeciwwaga (obraca się z nadwoziem) i chwytak z ładunkiem pod końcem ramienia — siły jak w grze
    cwP.set(0, 0.55, -2.55).applyMatrix4(up.matrixWorld);
    for (const [p, m] of [[cwP, CW_MASS], [pivot, GRAB_MASS + payload()]]) {
      const [lx, lz] = local(p), f = -m * G; Fy += f; Mth += lz * f; Mph += lx * f;
    }
    LAYOUT.wheels.forEach(([wx, , wz], i) => {
      const w = susp.y + wz * susp.th + wx * susp.ph, dw = susp.vy + wz * susp.vth + wx * susp.vph;
      const comp = S0 - w;                                          // ugięcie sprężyny (> skok: koło dalej na gruncie)
      let F = comp > 0 ? K_SUSP * Math.min(comp, REST + S0) - (dw < 0 ? C_COMP : C_REL) * dw : 0;
      F = clamp(F, 0, F_MAX); susp.F[i] = F;                        // 0 — koło w powietrzu
      Fy += F; Mth += wz * F; Mph += wx * F;
    });
    susp.vy += (Fy / M) * h; susp.vth += (Mth / I_PITCH) * h; susp.vph += (Mph / I_ROLL) * h;
    susp.y += susp.vy * h; susp.th += susp.vth * h; susp.ph += susp.vph * h;
  }
  function s0Track(h) {
    const s = drive.state, a = (s.u - susp.u0) / h; susp.u0 = s.u;
    susp.aLong += (a - susp.aLong) * (1 - Math.exp(-h / 0.05)); susp.aLat = s.u * s.r;
  }

  // zderzacze pojazdu (jak w grze): podwozie, nadwozie, wysięgnik, ramię, koła, głowica chwytaka
  const BOXES = [
    { o: () => model.matrixWorld, c: [0, 1.0, 0], h: [1.05, 0.35, 2.4] },
    { o: () => model.matrixWorld, c: [0, 2.1, 0], h: [1.2, 0.5, 1.6] },
    { o: () => up.matrixWorld, c: [0, 0.65, -0.6], h: [1.2, 0.6, 1.9] },
    { o: () => bm.matrixWorld, c: [0, 0.15, LAYOUT.boomLen / 2], h: [0.26, 0.3, LAYOUT.boomLen / 2 + 0.2] },
    { o: () => st.matrixWorld, c: [0, 0.02, LAYOUT.stickLen / 2 - 0.1], h: [0.19, 0.22, LAYOUT.stickLen / 2 + 0.2] },
    ...LAYOUT.wheels.map(([wx, wy, wz]) => ({ o: () => model.matrixWorld, c: [wx, wy, wz], h: [0.23, LAYOUT.wheelRadius * 0.9, LAYOUT.wheelRadius * 0.9] })),
    { o: () => gr.matrixWorld, c: [0, -LAYOUT.grappleHang + 0.05, 0], h: [0.32, 0.3, 0.32], head: true },
  ].map((b) => ({ ...b, box: newObb() }));
  const nT = V3(), vRelT = V3(), tT = V3(), prevC = V3();
  function updateBoxes(h) {
    gr.position.copy(pivot); gr.quaternion.setFromUnitVectors(down, tmp.copy(bob).sub(pivot).normalize()); gr.updateMatrixWorld(true);
    for (const b of BOXES) {
      prevC.copy(b.box.c); obbFrom(b.o(), b.c, b.h, b.box);
      if (b.box.seen) b.box.v.copy(b.box.c).sub(prevC).divideScalar(h); else { b.box.v.set(0, 0, 0); b.box.seen = true; }
    }
  }
  // kontakt: B (przedmiot) wypchnięty z A o głębokość wzdłuż n; prędkość względna w normalnej gaszona (niesprężyście),
  // styczna zmniejszona tarciem Coulomba (μ × zmiana normalnej); wA/wB — udział w przesunięciu (odwrotności mas)
  function resolve(B, A, depth, n, vA, wA, wB) {
    const sum = wA + wB; if (!sum) return;
    if (B.p) B.p.addScaledVector(n, depth * wB / sum);
    if (A.p) A.p.addScaledVector(n, -depth * wA / sum);
    vRelT.copy(B.v).sub(vA);
    const vn = vRelT.dot(n); if (vn >= 0) return;
    const dvn = -vn;
    tT.copy(vRelT).addScaledVector(n, -vn);
    const vt = tT.length(), dvt = Math.min(vt, MU * dvn);
    if (B.v !== vA) { B.v.addScaledVector(n, dvn * wB / sum); if (vt > 1e-6) B.v.addScaledVector(tT, -dvt / vt * wB / sum); }
    if (A.v && A.p) { A.v.addScaledVector(n, -dvn * wA / sum); if (vt > 1e-6) A.v.addScaledVector(tT, dvt / vt * wA / sum); }
    if (n.y > 0.7) B.support = true; if (n.y < -0.7 && A.p) A.support = true;
  }
  const itemBox = (it) => { it.box.c.copy(it.p); it.box.ax[0].set(1, 0, 0).applyQuaternion(it.q); it.box.ax[1].set(0, 1, 0).applyQuaternion(it.q); it.box.ax[2].set(0, 0, 1).applyQuaternion(it.q); it.box.e = it.half; return it.box; };
  function collide(h, target) {
    for (const it of items) { it.support = false; itemBox(it); }
    for (let pass = 0; pass < 2; pass++) {
      // przedmioty z pojazdem (pojazd: nieskończona masa wobec przedmiotu) — głowica chwytaka nie pcha tego, co ściska
      for (const it of items) {
        if (held.has(it)) continue;
        for (const b of BOXES) {
          if (b.head && it === target) continue;
          const d = sat(b.box, itemBox(it), nT); if (d === null) continue;
          resolve(it, b.box, d, nT, b.box.v, 0, 1);
        }
      }
      // przedmioty ze sobą (trzymany: nieskończona masa — porusza go chwytak)
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const A = items[i], B = items[j], ha = held.has(A), hb = held.has(B); if (ha && hb) continue;
        const d = sat(itemBox(A), itemBox(B), nT); if (d === null) continue;
        resolve(B, A, d, nT, A.v, ha ? 0 : 1 / A.mass, hb ? 0 : 1 / B.mass);
      }
    }
  }

  const g = {
    drive, arm, held, items, susp, get closed() { return closed; }, jaws,
    get payload() { return payload(); },
    setJaws, toggleJaws() { setJaws(!closed); },
    addItem({ mesh, mass, half, name, at }) {
      const it = { mesh, mass, half, name, p: new THREE.Vector3(...at), v: new THREE.Vector3(), q: mesh.quaternion.clone(), q0: new THREE.Quaternion(), yaw: new THREE.Euler().setFromQuaternion(mesh.quaternion, 'YXZ').y, box: newObb() };
      it.p.y = gh(it.p.x, it.p.z) + half[1];
      items.push(it); return it;
    },
    step(dt, c = {}) {
      const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
      for (let i = 0; i < n; i++) {
        drive.step(h, { throttle: c.throttle || 0, steer: c.steer || 0, brake: c.brake || 0 }, ground);
        arm.slew += clamp(c.slew || 0, -1, 1) * 0.5 * h;
        arm.boom = clamp(arm.boom + clamp(c.boom || 0, -1, 1) * 0.35 * h, -0.25, 1.25);
        arm.stick = clamp(arm.stick + clamp(c.stick || 0, -1, 1) * 0.45 * h, 0.6, 2.6);
        pivotPrev.copy(pivot); pivot.copy(poseArm());
        stepSuspension(h);
        deflect(h);
        // wahadło: Verlet z grawitacją i tłumieniem względem punktu zawieszenia, potem więz długości
        const damp = Math.exp(-ANG_DAMP * h);   // (masa wahadła nie zmienia jego ruchu; ładunek ugina ramię — deflect)
        const vRel = tmp2.copy(bob).sub(bobPrev).sub(tmp.copy(pivot).sub(pivotPrev)).multiplyScalar(damp);
        bobPrev.copy(bob);
        bob.add(tmp.copy(pivot).sub(pivotPrev)).add(vRel).addScaledVector(down, G * h * h);
        tmp.copy(bob).sub(pivot); bob.copy(pivot).addScaledVector(tmp.normalize(), L);
        // przyspieszenie chwytaka wygładzone (0,15 s): różnica drugiego rzędu z kroku Verleta drga, a ładunek ma bezwładność
        tmp.copy(bob).sub(bobPrev).divideScalar(h); bobA.lerp(tmp2.copy(tmp).sub(bobV).divideScalar(h), 1 - Math.exp(-h / 0.15)); bobV.copy(tmp);
        spin = up.rotation.y + drive.state.yaw;   // obrót chwytaka wokół pionu idzie za ramieniem
        const grip = stepJaws(h);
        stepItems(h, grip);
        updateBoxes(h); collide(h, grip.target);
        // koła: obrót z drogi (bez poślizgu wzdłuż), skręt przednich
        wheelSpin += (drive.state.u * h) / LAYOUT.wheelRadius;
      }
    },
    sync() {
      poseArm();
      wheels.forEach((w, i) => {
        const [wx, wy, wz] = LAYOUT.wheels[i], lift = susp.y + wz * susp.th + wx * susp.ph;   // koło zostaje na gruncie, sprężyna się ugina
        w.position.y = wy - clamp(lift, -REST, REST);
        w.rotation.set(wheelSpin, i < 2 ? drive.state.steer : 0, 0, 'YXZ');
      });
      // chwytak w świecie: oś w stronę wahadła, obrót wokół pionu za ramieniem
      const axis = tmp.copy(bob).sub(pivot).normalize();
      gr.position.copy(pivot);
      gr.quaternion.setFromUnitVectors(down, axis).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin));
      jawG.forEach((j, k) => { j.rotation.x = jaws[k].th; });
      for (const it of items) { it.mesh.position.copy(it.p); it.mesh.quaternion.copy(it.q); }
    },
  };
  return g;
}
