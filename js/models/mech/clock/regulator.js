// ClockKit — zegar — regulator: mechanizm między płytami, przekładnia, wychwyt, tarcza szkieletowa, wahadło, deska.
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { escapementGeometry } from '../../../behaviors/land/mech/escapement.js';
import { clockWheel, pinion, arbor } from './wheels.js';
import { escapeWheel, anchor, pendulum } from './escapement.js';
import { mainspringBarrel } from './springs.js';
import { ratchet } from './ratchet.js';
import { dialTexture, hand } from './dial.js';
import { TAU, EN, mesh, port, circle, slab, cylZ, materials } from '../common.js';

/* ---------------- zegar — regulator ---------------- */
// Mechanizm (C — oś koła centralnego w (0, 0) na przedniej powierzchni płyty tylnej): bęben 96 → zębnik 12 (koło
// centralne, 1 obr/h) 80 → zębnik 10 (koło trzecie) 75 → zębnik 10 (koło wychwytowe, 1 obr/min, sekundnik). Przekładnia
// wskazań przed płytą przednią: tuleja z zębnikiem 12 → koło minutowe 36 / zębnik 10 → koło godzinowe 40 (12 : 1,
// tarcza godzinowa). Wahadło sekundowe za płytą tylną (okres 2 s, półokres = 1 s = 1 ząb koła na 2 półokresy).
export const REG = {
  G: () => escapementGeometry({ z: 30, Re: 0.03 }),
  C: [0, 0], E: [0, 0.045], T: [0.02375, 0.02068], B: [-0.040, -0.0165], Mw: [0.0045, -0.01368], H: [0, -0.028],
  train: { barrel: 96, mB: 0.0008, cPin: 12, center: 80, mC: 0.0007, tPin: 10, third: 75, mT: 0.0008, ePin: 10, cannon: 12, minute: 36, mM: 0.0006, mPin: 10, hour: 40 },
  z: { back: 0, front: 0.04, plate: 0.003, barrel: 0.0105, cPin: 0.0105, center: 0.024, tPin: 0.024, third: 0.013, ePin: 0.013, esc: 0.032, motion1: 0.0465, motion2: 0.0515, dial: 0.062 },
};
export function regulator({ L = null, name } = {}) {
  const M = materials(), R = REG, G = R.G(), Z = R.z, tr = R.train, g = new THREE.Group(); g.name = name || (EN ? 'Regulator clock (Graham escapement)' : 'Zegar — regulator (wychwyt Grahama)');
  const mv = new THREE.Group(); g.add(mv);   // mechanizm: początek w osi C, płyta tylna z = 0
  const A = [R.E[0], R.E[1] + G.H];
  // płyty: zaokrąglony prostokąt z otworami na czopy
  const plate = (z0, win) => {
    const s = new THREE.Shape(), x0 = -0.085, x1 = 0.06, y0 = -0.07, y1 = 0.108, rr = 0.008;
    s.moveTo(x0 + rr, y0); s.lineTo(x1 - rr, y0); s.quadraticCurveTo(x1, y0, x1, y0 + rr); s.lineTo(x1, y1 - rr); s.quadraticCurveTo(x1, y1, x1 - rr, y1); s.lineTo(x0 + rr, y1); s.quadraticCurveTo(x0, y1, x0, y1 - rr); s.lineTo(x0, y0 + rr); s.quadraticCurveTo(x0, y0, x0 + rr, y0);
    for (const P of [R.C, R.E, R.T, R.B, A]) s.holes.push(circle(0.0009, 16, P[0], P[1]));
    if (win) for (const x of [-0.024, 0.024]) s.holes.push(circle(0.012, 48, x, 0.064));   // okna w płycie przedniej nad paletami (widok na wychwyt)
    return mesh(slab(s, Z.plate, z0, 0.0004, 12), M.brassP);
  };
  const pb = plate(Z.back - Z.plate, false), pf = plate(Z.front, true); mv.add(pb, pf);
  for (const [x, y] of [[-0.078, -0.063], [0.053, -0.063], [-0.078, 0.1], [0.053, 0.1]]) {   // filary toczone
    const pts = []; for (let i = 0; i <= 20; i++) { const f = i / 20; pts.push(new THREE.Vector2(0.0042 + 0.0012 * Math.sin(f * Math.PI) ** 6 + (f < 0.08 || f > 0.92 ? 0.0012 : 0), f * Z.front)); }
    const pil = mesh(new THREE.LatheGeometry(pts, 24).rotateX(Math.PI / 2), M.brassF); pil.position.set(x, y, 0); mv.add(pil);
    for (const zz of [Z.back - Z.plate - 0.0012, Z.front + Z.plate + 0.0012]) { const sc = mesh(cylZ(0.0032, 0.0024, 20), M.blued); sc.position.set(x, y, zz); mv.add(sc); }   // śruby filarów
  }
  const at = (o, P, z) => { o.position.set(P[0], P[1], z); return o; };
  const parts = {};
  // bęben
  const barrel = mainspringBarrel({ b: 0.016, h: 0.00042, L: 3.4, r1: 0.0055, r2: 0.031, teeth: tr.barrel, m: tr.mB }); at(barrel, R.B, Z.barrel); barrel.userData.setWind(0.7); mv.add(barrel);
  barrel.add(arbor(-Z.barrel, Z.front - Z.barrel + 0.003));
  const click = ratchet({ z: 36, R: 0.016, t: 0.0025 }); at(click, R.B, Z.front + Z.plate + 0.003); mv.add(click);
  parts.barrel = barrel; parts.click = click;
  // koło centralne (1 obr/h) z zębnikiem 12, oś przez płytę przednią do tarczy (minutowa)
  const cw = new THREE.Group(); at(cw, R.C, 0); mv.add(cw);
  { const w = clockWheel({ z: tr.center, m: tr.mC, t: 0.0018, arms: 5 }); w.position.z = Z.center; cw.add(w); const p = pinion({ z: tr.cPin, m: tr.mB, len: 0.016 }); p.position.z = Z.cPin; cw.add(p); cw.add(arbor(0, Z.dial + 0.004, 0.0028)); }
  parts.center = cw;
  const tw = new THREE.Group(); at(tw, R.T, 0); mv.add(tw);
  { const w = clockWheel({ z: tr.third, m: tr.mT, t: 0.0016, arms: 5 }); w.position.z = Z.third; tw.add(w); const p = pinion({ z: tr.tPin, m: tr.mC, len: 0.004 }); p.position.z = Z.tPin; tw.add(p); tw.add(arbor(0, Z.front)); }
  parts.third = tw;
  const ew = new THREE.Group(); at(ew, R.E, 0); mv.add(ew);
  { const w = escapeWheel(G); w.position.z = Z.esc; ew.add(w); const p = pinion({ z: tr.ePin, m: tr.mT, len: 0.004 }); p.position.z = Z.ePin; ew.add(p); ew.add(arbor(0, Z.dial + 0.0028, 0.0022)); }
  parts.escape = ew;
  // kotwica (oś A) — w płaszczyźnie koła wychwytowego; oś przez płytę tylną do widełek wahadła
  const an = new THREE.Group(); at(an, A, 0); mv.add(an);
  { const a = anchor(G); a.position.z = Z.esc; an.add(a); an.add(arbor(-0.02, Z.front)); const crutch = mesh(new THREE.BoxGeometry(0.003, 0.11, 0.002), M.steelP); crutch.position.set(0, -0.055, -0.018); an.add(crutch); const fork = mesh(new THREE.BoxGeometry(0.012, 0.004, 0.006), M.brassF); fork.position.set(0, -0.11, -0.018); an.add(fork); }
  parts.anchor = an;
  // przekładnia wskazań
  const cannon = pinion({ z: tr.cannon, m: tr.mM, len: 0.003 }); cannon.position.z = Z.motion1; cw.add(cannon);
  const mw = new THREE.Group(); at(mw, R.Mw, 0); mv.add(mw);
  { const w = clockWheel({ z: tr.minute, m: tr.mM, t: 0.0012, arms: 4 }); w.position.z = Z.motion1; mw.add(w); const p = pinion({ z: tr.mPin, m: tr.mM, len: 0.003 }); p.position.z = Z.motion2; mw.add(p); mw.add(arbor(Z.front + Z.plate, Z.motion2 + 0.003, 0.002)); }
  const hw = new THREE.Group(); at(hw, R.H, 0); mv.add(hw);
  { const w = clockWheel({ z: tr.hour, m: tr.mM, t: 0.0012, arms: 4 }); w.position.z = Z.motion2; hw.add(w); hw.add(arbor(Z.front + Z.plate, Z.dial + 0.0028, 0.0026)); }
  parts.minute = mw; parts.hour = hw;
  // tarcza szkieletowa (widać mechanizm): pierścień minutowy i dwa pierścienie pomocnicze, posrebrzane, grawerowane;
  // jedna tekstura dla wszystkich — współrzędne tekstury z położenia w płaszczyźnie tarczy
  const dialMat = new THREE.MeshPhysicalMaterial({ map: dialTexture({ subS: R.E, subH: R.H }), metalness: 0.55, roughness: 0.38, clearcoat: 0.25 });
  const annulus = (cx, cy, r0, r1) => { const sh = new THREE.Shape().absarc(cx, cy, r1, 0, TAU, false); sh.holes.push(circle(r0, 96, cx, cy)); const geo = slab(sh, 0.0012, Z.dial - 0.0006, 0.0002, 96), P = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / 0.22 + 0.5, P.getY(i) / 0.22 + 0.5); return mesh(geo, dialMat); };
  mv.add(annulus(0, 0, 0.084, 0.11), annulus(R.E[0], R.E[1], 0.016, 0.03), annulus(R.H[0], R.H[1], 0.0125, 0.028));
  for (const [P_, r] of [[R.E, 0.0303], [R.H, 0.0283]]) { const b = mesh(new THREE.TorusGeometry(r, 0.0007, 8, 96), M.brassP); b.position.set(P_[0], P_[1], Z.dial + 0.0006); mv.add(b); }
  const bezel = mesh(new THREE.TorusGeometry(0.111, 0.0028, 12, 128), M.brassP); bezel.position.z = Z.dial; mv.add(bezel);
  for (const [x, y] of [[-0.07, -0.06], [0.05, -0.06], [-0.07, 0.09], [0.05, 0.09]]) { const f = mesh(cylZ(0.002, Z.dial - Z.front - Z.plate, 12), M.brassF); f.position.set(x, y, (Z.front + Z.plate + Z.dial) / 2); mv.add(f); }
  // wskazówki
  const hm = hand(0.098, 0.004, 0.022, 'spade', 0); const hs = hand(0.025, 0.0016, 0.007, 'plain', 0); const hh = hand(0.02, 0.0034, 0.006, 'spade', 0);
  const handMin = new THREE.Group(); handMin.add(hm); at(handMin, R.C, Z.dial + 0.0045); mv.add(handMin);
  const handSec = new THREE.Group(); handSec.add(hs); at(handSec, R.E, Z.dial + 0.002); mv.add(handSec);
  const handHour = new THREE.Group(); handHour.add(hh); at(handHour, R.H, Z.dial + 0.002); mv.add(handHour);
  // wahadło za płytą tylną, zawieszone w osi kotwicy; długość dla okresu 2 s (pręt + soczewka, wahadło fizyczne)
  const mb = 1.5, rho = 8100, rr = 0.003;
  const Lp = L || (() => { let Lx = 0.994; for (let i = 0; i < 40; i++) { const mr = rho * Math.PI * rr * rr * (Lx + 0.06), J = mb * Lx * Lx + mr * (Lx + 0.06) ** 2 / 3, mgl = 9.81 * (mb * Lx + mr * (Lx + 0.06) / 2); const T = TAU * Math.sqrt(J / mgl); Lx *= (2 / T) ** 2; } return Lx; })();
  const pend = pendulum({ L: Lp, mass: mb }); at(pend, A, -0.03); mv.add(pend);
  const cock = mesh(new THREE.BoxGeometry(0.03, 0.02, 0.03), M.brassF); cock.position.set(A[0], A[1] + 0.012, -0.018); mv.add(cock);
  // deska z orzecha, podstawa, wsporniki, skala amplitudy
  const H0 = 1.62, board = mesh(new THREE.BoxGeometry(0.34, H0 + 0.08, 0.025), M.walnut); board.position.set(0, (H0 + 0.08) / 2, -0.115); g.add(board);
  const plinth = mesh(new THREE.BoxGeometry(0.5, 0.07, 0.34), M.walnut); plinth.position.set(0, 0.035, -0.02); g.add(plinth);
  const crest = mesh(new THREE.BoxGeometry(0.4, 0.05, 0.06), M.walnut); crest.position.set(0, H0 + 0.1, -0.1); g.add(crest);
  for (const x of [-0.07, 0.05]) { const br = mesh(new THREE.BoxGeometry(0.012, 0.012, 0.095), M.brassF); br.position.set(x, 1.45 - 0.075, -0.06); g.add(br); }
  const seat = mesh(new THREE.BoxGeometry(0.2, 0.01, 0.1), M.walnut); seat.position.set(-0.012, 1.45 - 0.085, -0.055); g.add(seat);
  mv.position.set(0, 1.45, -0.05);
  const scaleY = 1.45 + A[1] - Lp - 0.075 - 0.06;
  const sc = document.createElement('canvas'); sc.width = 512; sc.height = 96; { const x = sc.getContext('2d'); x.fillStyle = '#e9e4d6'; x.fillRect(0, 0, 512, 96); x.strokeStyle = '#222'; x.fillStyle = '#222'; x.textAlign = 'center'; x.font = '18px Georgia'; for (let d = -5; d <= 5; d++) { const X = 256 + d * 46; x.lineWidth = d % 5 === 0 ? 3 : 1.5; x.beginPath(); x.moveTo(X, 0); x.lineTo(X, d % 5 === 0 ? 46 : 30); x.stroke(); x.fillText(String(Math.abs(d)), X, 72); } }
  const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
  const arcW = 2 * (Lp + 0.105) * Math.sin(5.5 * Math.PI / 180) * 2, scale = mesh(new THREE.PlaneGeometry(arcW, 0.02), new THREE.MeshStandardMaterial({ map: st, roughness: 0.6 })); scale.position.set(A[0], scaleY - 0.03, -0.1); g.add(scale);
  const mr = rho * Math.PI * rr * rr * (Lp + 0.06), Jp = mb * Lp * Lp + mr * (Lp + 0.06) ** 2 / 3 + 0.25 * mb * 0.075 ** 2, mgl = 9.81 * (mb * Lp + mr * (Lp + 0.06) / 2);
  // bezwładność mechanizmu zredukowana na oś koła wychwytowego (koła z mosiądzu, zębniki, osie)
  const Jw = (gp) => { let J = 0; gp.traverse((o) => { if (o.userData && o.userData.J) J += o.userData.J; }); return J; };
  const Je = Jw(ew) + 1e-7 + Jw(tw) / 7.5 ** 2 + Jw(cw) / 60 ** 2 + 2e-4 / 480 ** 2;   // bęben (≈ 2e-4 kg·m²) praktycznie się nie liczy
  g.userData = { G, A, parts, handMin, handSec, handHour, pendulum: pend, L: Lp, Jp, mgl, Je, mv, barrel, click,
    ports: { wind: port('Kwadrat nakręcania (klucz)', DOMAIN.rot, 'wał'), base: port('Podstawa (posadzka)', DOMAIN.rot, 'mocowanie') } };
  return g;
}
