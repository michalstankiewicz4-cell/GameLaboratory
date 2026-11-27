// MechKit — koło pasowe (pulley), droga wokół dwóch kół (loopPath, chainDistance), łańcuch rolkowy (chainLoop), pas klinowy (beltLoop).
import * as THREE from '../../../vendor/three/three.module.js';
import { IRON_RHO, PHYS, RHO, TAU, box, circlePath, cyl, extrude, lathe, materials, mesh, newPart } from './base.js';

/* ---------------- koło pasowe (rowki klinowe) ---------------- */
// profile pasów wąskoklinowych (ISO 4184): szerokość u góry, wysokość, szerokość skuteczna; podziałka rowków e
export const VBELT = { SPZ: { top: 0.0097, h: 0.008, lw: 0.0085, e: 0.012, depth: 0.011 }, SPA: { top: 0.0127, h: 0.010, lw: 0.011, e: 0.015, depth: 0.0138 }, SPB: { top: 0.0163, h: 0.013, lw: 0.014, e: 0.019, depth: 0.0175 } };
export function pulley({ d = 0.16, profile = 'SPA', grooves = 1, bore = 0.0125, mat = 'iron', name } = {}) {
  const M = materials(), V = VBELT[profile] || VBELT.SPA, rp = d / 2, ro = rp + 0.0028, rg = rp - V.depth + 0.0028, top = V.lw / 2 + 0.0004, bot = top - (V.depth - 0.0028) * Math.tan(18 * Math.PI / 180);
  const w = (grooves - 1) * V.e + V.lw + 0.016, hw = w / 2, hubR = Math.max(0.026, bore * 2), web = Math.max(0.009, w * 0.3), rimIn = rg - 0.008;
  const prof = [[bore, -hw * 1.5], [hubR, -hw * 1.5], [hubR, -web / 2], [rimIn, -web / 2], [rimIn, -hw], [ro, -hw]];
  for (let k = 0; k < grooves; k++) {
    const c = -((grooves - 1) * V.e) / 2 + k * V.e;
    prof.push([ro, c - top - 0.0015], [rp + 0.001, c - top], [rg, c - bot], [rg, c + bot], [rp + 0.001, c + top], [ro, c + top + 0.0015]);
  }
  prof.push([ro, hw], [rimIn, hw], [rimIn, web / 2], [hubR, web / 2], [hubR, hw * 1.5], [bore, hw * 1.5], [bore, -hw * 1.5]);
  const g = newPart(name || `Koło pasowe Ø ${Math.round(d * 1000)} mm`);
  g.userData.spin.add(mesh(lathe(prof, 64), M[mat]));
  let spokes = 0;
  if (rimIn - hubR > 0.03) {   // ramiona między piastą a wieńcem (koła większe)
    spokes = 5;
    for (let k = 0; k < spokes; k++) {
      const a = k * TAU / spokes, len = rimIn - hubR, s = mesh(box(web * 1.6, len, 0.012 + d * 0.04), M[mat]);
      s.position.set(0, Math.cos(a) * (hubR + len / 2), Math.sin(a) * (hubR + len / 2)); s.rotation.x = a; g.userData.spin.add(s);
    }
  }
  const rho = RHO[mat] || IRON_RHO, mass = rho * (Math.PI * (ro * ro - rimIn * rimIn) * w + Math.PI * (rimIn * rimIn - hubR * hubR) * web * 0.6 + Math.PI * hubR * hubR * w * 1.5);
  Object.assign(g.userData, { phys: { ...PHYS.belt }, d, rp, w, profile, grooves, mass, J: 0.5 * mass * (ro * ro + rimIn * rimIn) * 0.85, spokes });
  return g;
}

/* ---------------- droga wokół dwóch kół (łańcuch, pas) ---------------- */
// koła w płaszczyźnie (y, z) przy stałym x; c = { y, z, r, k } — k: jednostek drogi na radian łuku (łańcuch: z/2π
// podziałek, pas: r metrów); odcinki proste w jednostkach `unit` (łańcuch: p, pas: 1 m). Obieg przeciwnie do ruchu
// wskazówek zegara (dodatni obrót wokół +x). → { L, at(u) → { y, z, ty, tz }, a1, U2, a2 }
export function loopPath(c1, c2, unit) {
  const dy = c2.y - c1.y, dz = c2.z - c1.z, D = Math.hypot(dy, dz), phi = Math.atan2(dz, dy), tn = Math.acos((c1.r - c2.r) / D);
  const nA = phi - tn, nB = phi + tn;   // kierunki normalnych w punktach styczności
  const a1s = nB, a1e = nA + TAU, a2s = nA, a2e = nB;   // łuk 1: daleka strona koła 1; łuk 2: daleka strona koła 2
  const P = (c, a) => [c.y + c.r * Math.cos(a), c.z + c.r * Math.sin(a)];
  const s1a = P(c1, a1e), s1b = P(c2, a2s), s2a = P(c2, a2e), s2b = P(c1, a1s);
  const span = Math.hypot(s1b[0] - s1a[0], s1b[1] - s1a[1]) / unit;
  const segs = [];
  let u = 0;
  segs.push({ kind: 'arc', c: c1, a0: a1s, u0: u, len: (a1e - a1s) * c1.k }); u += (a1e - a1s) * c1.k;
  segs.push({ kind: 'line', p0: s1a, p1: s1b, u0: u, len: span }); u += span;
  segs.push({ kind: 'arc', c: c2, a0: a2s, u0: u, len: (a2e - a2s) * c2.k }); u += (a2e - a2s) * c2.k;
  segs.push({ kind: 'line', p0: s2a, p1: s2b, u0: u, len: span }); u += span;
  const L = u;
  function at(uu) {
    uu = ((uu % L) + L) % L;
    for (const s of segs) {
      if (uu > s.u0 + s.len && s !== segs[3]) continue;
      const t = uu - s.u0;
      if (s.kind === 'arc') { const a = s.a0 + t / s.c.k; return { y: s.c.y + s.c.r * Math.cos(a), z: s.c.z + s.c.r * Math.sin(a), ty: -Math.sin(a), tz: Math.cos(a) }; }
      const f = t / s.len, ty = s.p1[0] - s.p0[0], tz = s.p1[1] - s.p0[1], l = Math.hypot(ty, tz);
      return { y: s.p0[0] + ty * f, z: s.p0[1] + tz * f, ty: ty / l, tz: tz / l };
    }
  }
  // osadzenie ogniw w gniazdach (k = z / 2π, unit = podziałka): przesunięcie u, przy którym ogniwo 0 leży w gnieździe 0
  // koła 1 (θ = 0), i faza koła 2 (θ₂ = θ₁·z₁/z₂ + phase2), przy której jego gniazda trafiają w ogniwa
  const seatU = (((-a1s * c1.k) % 1) + 1) % 1, p2 = 1 / c2.k, phase2 = ((((a2s + (seatU - segs[2].u0) / c2.k) % p2) + p2) % p2);
  return { L, at, a1: a1s, a2: a2s, U2: segs[2].u0, seat: { u: seatU, phase2 } };
}
// odległość osi dobrana tak, by łańcuch miał całkowitą, parzystą liczbę ogniw (kierunek dir od koła 1)
export function chainDistance(z1, z2, p, approx) {
  const R1 = p / (2 * Math.sin(Math.PI / z1)), R2 = p / (2 * Math.sin(Math.PI / z2));
  const L = (D) => loopPath({ y: 0, z: 0, r: R1, k: z1 / TAU }, { y: D, z: 0, r: R2, k: z2 / TAU }, p).L;
  let N = Math.round(L(approx)); if (N % 2) N++;
  let lo = approx * 0.7, hi = approx * 1.4;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (L(mid) < N) lo = mid; else hi = mid; }
  return { D: (lo + hi) / 2, N, R1, R2 };
}

/* ---------------- łańcuch rolkowy (ANSI 40 / 08A) ---------------- */
// ogniwa jako instancje: rolki, płytki wewnętrzne i zewnętrzne (kształt „ósemki”), sworznie; update(u) — przesunięcie
// łańcucha w podziałkach
export function chainLoop(path, N, { p = 0.0127, d1 = 0.00792, x = 0, type = '08A' } = {}) {
  const M = materials(), g = new THREE.Group(), k = p / 0.0127; g.name = `Łańcuch rolkowy ${type}, ${N} ogniw`;
  const plate = (h, t) => {   // płytka: dwa półkola połączone przewężeniem
    const s = new THREE.Shape(), r = h / 2;
    s.absarc(0, 0, r, Math.PI / 2, Math.PI * 1.5, false); s.lineTo(p / 2, -r * 0.78); s.lineTo(p, -r);
    s.absarc(p, 0, r, -Math.PI / 2, Math.PI / 2, false); s.lineTo(p / 2, r * 0.78); s.lineTo(0, r);
    s.holes.push(circlePath(d1 * 0.28, 16, 0, 0), circlePath(d1 * 0.28, 16, p, 0));
    // kształt w (sx = wzdłuż ogniwa, sy = w poprzek drogi) wyciągnięty na grubość → oś x świata = grubość
    return extrude(s, t, 0.0002, 12);
  };
  const inner = plate(0.0118 * k, 0.0015 * k), outer = plate(0.0104 * k, 0.0015 * k), roller = cyl(d1 / 2, 0.0078 * k, 16), pin = cyl(0.00198 * k, 0.0178 * k, 10);
  const half = Math.floor(N / 2), mk = (geo, mat, n) => { const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; g.add(im); return im; };
  const iIn = mk(inner, M.steel, half * 2), iOut = mk(outer, M.steel, half * 2), iRol = mk(roller, M.dark, N), iPin = mk(pin, M.steel, N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), basis = new THREE.Matrix4();
  const OFF_IN = 0.0047 * k, OFF_OUT = 0.0067 * k;   // odsunięcie płytek od środka (połowa szerokości wewnętrznej + płytka)
  function update(u0) {
    const s0 = path.seat ? path.seat.u : 0, P = []; for (let k = 0; k <= N; k++) P.push(path.at(u0 + s0 + k));
    for (let k = 0; k < N; k++) {
      const a = P[k], b = P[k + 1], ty = b.y - a.y, tz = b.z - a.z, l = Math.hypot(ty, tz) || 1;
      // układ płytki: lokalne y świata = kierunek ogniwa, z = normalna drogi, x = grubość
      basis.makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, ty / l, tz / l), new THREE.Vector3(0, -tz / l, ty / l));
      q.setFromRotationMatrix(basis);
      const im = k % 2 ? iOut : iIn, off = k % 2 ? OFF_OUT : OFF_IN, j = Math.floor(k / 2) * 2;
      for (let s = 0; s < 2; s++) { pos.set(x + (s ? off : -off), a.y, a.z); m4.compose(pos, q, one); im.setMatrixAt(j + s, m4); }
      pos.set(x, a.y, a.z); m4.compose(pos, new THREE.Quaternion(), one); iRol.setMatrixAt(k, m4); iPin.setMatrixAt(k, m4);
    }
    for (const im of [iIn, iOut, iRol, iPin]) im.instanceMatrix.needsUpdate = true;
  }
  update(0);
  const mass = N * 0.0094 * k * k;   // 08A: ok. 0,7 kg/m (masa rośnie z kwadratem podziałki)
  // środki rolek w układzie łańcucha (x, y, z) dla fazy u0 — do brył zderzeń rolek z zębami kół
  const rollers = (u0) => { const out = []; for (let k = 0; k < N; k++) { const a = path.at(u0 + (path.seat ? path.seat.u : 0) + k); out.push([x, a.y, a.z]); } return out; };
  g.userData = { phys: { ...PHYS.chain }, N, p, d1, mass, update, rollers };
  return g;
}

/* ---------------- pas klinowy SPA ---------------- */
// przekrój trapezowy (13 × 10 mm) prowadzony po drodze; nadruk przesuwany teksturą (update(s) — przesunięcie w metrach)
export function beltLoop(path, { x = 0, label = 'SPA 1250 Lw', profile = 'SPA', grooves = 1 } = {}) {
  const V = VBELT[profile] || VBELT.SPA;
  const c = document.createElement('canvas'); c.width = 512; c.height = 32;
  const cx = c.getContext('2d'); cx.fillStyle = '#1b1c1e'; cx.fillRect(0, 0, 512, 32);
  for (let i = 0; i < 512; i += 4) { cx.fillStyle = i % 8 ? '#1f2022' : '#18191b'; cx.fillRect(i, 0, 2, 32); }
  cx.fillStyle = '#d8d4c8'; cx.font = 'bold 15px sans-serif'; cx.fillText(label, 16, 21); cx.fillText(label, 272, 21);
  const tex = new THREE.CanvasTexture(c); tex.wrapS = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88, metalness: 0 });
  const t2 = V.top / 2, b2 = t2 - V.h * Math.tan(20 * Math.PI / 180), sec = [[V.h * 0.45, -t2], [V.h * 0.45, t2], [-V.h * 0.55, b2], [-V.h * 0.55, -b2]];   // (normalna, oś x)
  const n = Math.ceil(path.L / 0.004), period = 0.5, pos = [], uv = [], idx = [];
  for (let gq = 0; gq < grooves; gq++) {
    const xo = x - ((grooves - 1) * V.e) / 2 + gq * V.e, base = pos.length / 3;
    for (let i = 0; i <= n; i++) {
      const s = path.L * i / n, a = path.at(s), ny = a.tz, nz = -a.ty;   // normalna na zewnątrz pętli
      for (let k = 0; k <= 4; k++) { const [nn, xx] = sec[k % 4]; pos.push(xo + xx, a.y + ny * nn, a.z + nz * nn); uv.push(s / period + gq * 0.37, k / 4); }
    }
    for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) { const a = base + i * 5 + k, b = a + 5; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = mesh(geo, mat); m.name = `Pas klinowy ${label}`;
  m.userData = { phys: { ...PHYS.belt }, L: path.L, mass: path.L * grooves * (profile === 'SPZ' ? 0.074 : profile === 'SPB' ? 0.195 : 0.123), update: (s) => { tex.offset.x = -s / period; } };
  return m;
}
