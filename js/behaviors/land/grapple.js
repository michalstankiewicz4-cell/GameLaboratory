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
//   - przedmioty: wspólny świat brył sztywnych (land/items.js) — zderzają się ze sobą, z pojazdem (zderzacze z gry:
//     podwozie, nadwozie, wysięgnik, ramię, koła, głowica chwytaka, jako bryły ruchome z prędkością) i z gruntem,
//     przewracają się i obracają od uderzeń; trzymany przedmiot porusza chwytak.
//   - odrzut: impulsy zderzeń brył pojazdu z przedmiotami wracają do pojazdu (prędkość, obrót, zawieszenie) i do
//     chwytaka (wahadło);
//   - ugięcie widać: wysięgnik i ramię wyginają się w łuk (js/models/junkyard/vehicle/bow.js, jak w grze).
// Uproszczenie względem gry: obrót chwytaka wokół pionu idzie za ramieniem (opór przegubu).
//
// createGrapple(model, { x, z, yaw, ground, scene, items }) → g
//   items — wspólny świat przedmiotów (createItems); bez niego przeładowarka ma własny i sama go liczy. Ze wspólnym
//   świat liczy właściciel (W.step raz na klatkę), a przeładowarka liczy się w jego krokach (W.hook).
//   g.step(dt, c)  c: { throttle −1…1, steer −1…1 (dodatni w lewo), brake 0…1, slew −1…1, boom −1…1, stick −1…1 }
//   g.toggleJaws(), g.setJaws(zamknięte), g.addItem({ mesh, mass, half: [x,y,z], name, kind, rubber }) — do świata,
//   g.sync() — model i przedmioty, g.items — świat przedmiotów (g.items.list), g.dispose() — odpięcie od świata
//   g.drive (land/drive.js), g.arm { slew, boom, stick, sagB, sagS }, g.payload [kg], g.held — trzymane przedmioty,
//   g.susp { y, th (pochylenie, przód w górę +), ph (przechył, lewa strona w górę +), F: [siła na koło, N] }
import * as THREE from '../../../vendor/three/three.module.js';
import { createDrive, driveDef } from './drive.js';
import { LAYOUT } from '../../models/junkyard/vehicle/grapple-truck.js';
import { createItems, obbFrom, newObb } from './items.js';
import { bowMaterial } from '../../models/junkyard/vehicle/bow.js';

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

export function createGrapple(model, { x = 0, z = 0, yaw = 0, ground = null, scene = null, items: shared = null } = {}) {
  const W = shared || createItems({ ground }), own = !shared;
  const drive = createDrive(grappleDriveDef(), { x, z, yaw });
  const up = model.getObjectByName('nadwozie'), bm = model.getObjectByName('wysięgnik'), st = model.getObjectByName('ramię');
  const gr = model.getObjectByName('chwytak'), wheels = [0, 1, 2, 3].map((i) => model.getObjectByName('koło ' + i));
  const jawG = [0, 1, 2, 3].map((k) => model.getObjectByName('szczęka ' + k));
  // widoczne ugięcie: wysięgnik i ramię wyginają się w łuk (shader, końce na swoim miejscu — jak w grze)
  const meshOf = (g, n) => g.children.find((c) => c.isMesh && c.name === n);
  const bowMeshes = [meshOf(bm, 'wysięgnik'), meshOf(st, 'ramię')];
  const bowB = bowMeshes[0] ? bowMaterial(bowMeshes[0], LAYOUT.boomLen) : null, bowS = bowMeshes[1] ? bowMaterial(bowMeshes[1], LAYOUT.stickLen) : null;
  const arm = { slew: 0, boom: 0.55, stick: 1.35, sagB: 0, vB: 0, sagS: 0, vS: 0 };
  const jaws = jawG.map(() => ({ th: LAYOUT.jawOpen, w: 0, N: 0 }));
  let closed = false, spin = 0, wheelSpin = 0;
  const bobV = new THREE.Vector3(), bobA = new THREE.Vector3();   // prędkość i przyspieszenie chwytaka (do trzymania)
  const held = new Set();
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
    if (bowB) bowB.value = arm.sagB * LAYOUT.boomLen * 0.35;
    if (bowS) bowS.value = arm.sagS * LAYOUT.stickLen * 0.35;
    model.updateMatrixWorld(true);
    return tmp.set(0, 0, LAYOUT.stickLen).applyMatrix4(st.matrixWorld);   // koniec ramienia = przegub chwytaka
  }
  // stan modelu sprzed zachowania (dispose przywraca: edytor sceny po „Stop”)
  const pose0 = [model, up, bm, st, gr, ...wheels, ...jawG].map((o) => ({ o, p: o.position.clone(), q: o.quaternion.clone(), parent: o.parent }));
  poseArm(); pivot.copy(tmp); pivotPrev.copy(pivot); bob.copy(pivot).addScaledVector(down, L); bobPrev.copy(bob);
  // chwytak wisi w świecie (jak w grze: odczepiony od ramienia, ciało na przegubie)
  const world = scene || model.parent;
  const grParent = gr.parent;
  if (world) world.attach(gr);

  const payload = () => [...held].reduce((m, it) => m + it.mass, 0);
  function setJaws(c) { closed = !!c; }

  // przedmiot w zasięgu szczęk: środek w osi chwytaka (najwyżej 0,35 m w bok), w wysokości końców szczęk
  // półwymiary przedmiotu w układzie chwytaka (przedmiot może leżeć przewrócony): rzut jego prostopadłościanu
  const extT = new THREE.Vector3(), extQ = new THREE.Quaternion();
  function extent(it, qi) {
    const h = [0, 0, 0];
    extQ.copy(qi).multiply(it.q);
    for (let i = 0; i < 3; i++) {
      extT.set(i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0).applyQuaternion(extQ);
      h[0] += it.half[i] * Math.abs(extT.x); h[1] += it.half[i] * Math.abs(extT.y); h[2] += it.half[i] * Math.abs(extT.z);
    }
    return h;
  }
  function inGrip(it, local, h) {
    const r = Math.hypot(local.x, local.z);
    return r < 0.35 + Math.min(h[0], h[2]) * 0.3 && local.y < -0.15 && local.y > -LAYOUT.grappleHang - 1.0 - h[1];
  }

  function stepJaws(dt) {
    // przedmiot między szczękami: w układzie chwytaka (oś chwytaka = kierunek wahadła)
    const axis = tmp2.copy(bob).sub(pivot).normalize();
    q.setFromUnitVectors(down, axis);
    const qi = q.clone().invert();
    let target = null, tLocal = null, tHalf = null;
    for (const it of [...held, ...W.list]) {   // trzymany najpierw
      if (it.removed || it.fixed) continue;
      const loc = it.p.clone().sub(pivot).applyQuaternion(qi);
      if (loc.lengthSq() > 25) continue;
      const h = extent(it, qi);
      if (inGrip(it, loc, h)) { target = it; tLocal = loc; tHalf = h; break; }
    }
    // promień przedmiotu wzdłuż każdej szczęki (szczęki co 90°): pół szerokości przedmiotu w tym kierunku + przesunięcie środka
    const K = closed ? 60000 : 12000, C = closed ? 3000 : 1200, aim = closed ? LAYOUT.jawClosed : LAYOUT.jawOpen;
    // szczęki: sztywny kontakt wymaga drobnego kroku — 16 kroków na krok zachowania (1/3840 s)
    const sub = 16, hs = dt / sub, gY = gh(pivot.x, pivot.z);
    jaws.forEach((j, k) => {
      const a = k * Math.PI / 2 + spin, dir = [Math.sin(a), Math.cos(a)];
      let reach = null, top = 0, bot = 0;
      if (target) {
        const halfW = Math.abs(dir[0]) * tHalf[0] + Math.abs(dir[1]) * tHalf[2];
        reach = halfW + (tLocal.x * dir[0] + tLocal.z * dir[1]);                  // od osi do powierzchni przedmiotu po stronie szczęki
        top = tLocal.y + tHalf[1]; bot = tLocal.y - tHalf[1];
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

  // trzymanie: tarcie μ·ΣN przenosi ciężar przedmiotu i jego przyspieszenie razem z chwytakiem
  function hold(dt, grip) {
    const { target, tLocal, q: gq } = grip;
    const Nsum = jaws.reduce((s, j) => s + j.N, 0), opposite = (jaws[0].N > 0 && jaws[2].N > 0) || (jaws[1].N > 0 && jaws[3].N > 0);
    if (target && !held.has(target)) {
      const need = target.mass * Math.hypot(bobA.x, G + bobA.y, bobA.z);
      if (closed && opposite && MU * Nsum >= need) {
        held.add(target); target.held = true; target.local = tLocal.clone(); target.qRel = gq.clone().invert().multiply(target.q);
      }
    }
    for (const it of [...held]) {
      // potrzebna siła: ciężar i przyspieszenie razem z chwytakiem (pionowa składowa w górę dociąża)
      const need = it.mass * Math.hypot(bobA.x, G + bobA.y, bobA.z);
      if (it.removed || it !== target || !closed || !opposite || MU * Nsum < need) {   // wyślizguje się: dalej leci z prędkością chwytaka
        held.delete(it); it.held = false; it.w.set(0, 0, 0); W.wake(it); continue;
      }
      const np = tmp.copy(it.local).applyQuaternion(gq).add(pivot);
      it.v.copy(np).sub(it.p).divideScalar(dt); it.p.copy(np);
      it.q.copy(gq).multiply(it.qRel); it.w.set(0, 0, 0);
    }
  }

  // punkt świata → płaszczyzna podwozia (x w lewo, z do przodu), bez przechyłu (małe kąty)
  const local = (p) => { const dx = p.x - drive.state.x, dz = p.z - drive.state.z, c = Math.cos(drive.state.yaw), s = Math.sin(drive.state.yaw); return [dx * c - dz * s, dx * s + dz * c]; };
  const cwP = new THREE.Vector3();
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
  const prevC = new THREE.Vector3();
  function updateBoxes(h, target) {
    gr.position.copy(pivot); gr.quaternion.setFromUnitVectors(down, tmp.copy(bob).sub(pivot).normalize()); gr.updateMatrixWorld(true);
    for (const b of BOXES) {
      prevC.copy(b.box.c); obbFrom(b.o(), b.c, b.h, null, b.box);
      if (b.seen) b.box.v.copy(b.box.c).sub(prevC).divideScalar(h); else { b.box.v.set(0, 0, 0); b.seen = true; }
      if (b.head) b.box.skip = target;   // głowica chwytaka nie pcha tego, co ściska
    }
  }
  const unKin = W.addKinematic(BOXES.map((b) => b.box));

  // odrzut: impulsy, które bryły pojazdu dały przedmiotom w poprzednim kroku (land/items.js — o.J, o.T), wracają do
  // pojazdu (prędkość wzdłuż i w bok, obrót, zawieszenie) i do chwytaka (wahadło, masa chwytaka 700 kg)
  const cgP = new THREE.Vector3(), rT = new THREE.Vector3(), tauT = new THREE.Vector3();
  function recoil(h) {
    const s = drive.state, D = drive.def, cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
    cgP.set(s.x, (ground && ground.height ? ground.height(s.x, s.z) : 0) + susp.y + H_CG, s.z);
    for (const b of BOXES) {
      const J = b.box.J; if (J.lengthSq() < 1e-12) continue;
      if (b.head) { bobPrev.addScaledVector(J, -h / (GRAB_MASS + payload())); continue; }
      tauT.copy(b.box.T).add(rT.copy(b.box.c).sub(cgP).cross(J));
      s.u += (J.x * sy + J.z * cy) / D.mass; s.v += (J.x * cy - J.z * sy) / D.mass; s.r += tauT.y / D.Iz;
      const [lx, lz] = local(b.box.c);
      susp.vy += J.y / BODY; susp.vth += (lz * J.y) / I_PITCH; susp.vph += (lx * J.y) / I_ROLL;
    }
  }

  // krok 1/240 s (w rytmie świata przedmiotów)
  let ctl = {};
  function substep(h) {
    const c = ctl;
    recoil(h);
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
    hold(h, grip);
    updateBoxes(h, grip.target);
    // koła: obrót z drogi (bez poślizgu wzdłuż), skręt przednich
    wheelSpin += (drive.state.u * h) / LAYOUT.wheelRadius;
  }
  const unHook = W.hook(substep);

  const g = {
    drive, arm, held, susp, get closed() { return closed; }, jaws, items: W,
    get payload() { return payload(); },
    setJaws, toggleJaws() { setJaws(!closed); },
    addItem({ mesh, mass, half, shape, name, kind, at, rubber }) { return W.add({ mesh, mass, half, shape, name, kind, at: [at[0], null, at[2]], rubber }); },
    step(dt, c = {}) { ctl = c; if (own) W.step(dt); },
    dispose() {
      unHook(); unKin(); for (const it of held) it.held = false; held.clear();
      if (grParent && gr.parent !== grParent) grParent.add(gr);
      for (const m of bowMeshes) if (m && m.userData.bowRestore) { m.userData.bowRestore(); delete m.userData.bowRestore; }
      for (const s0 of pose0) { s0.o.position.copy(s0.p); s0.o.quaternion.copy(s0.q); }
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
      if (own) W.sync();
    },
  };
  return g;
}
