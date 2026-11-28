// Laboratorium mechaniki — stół optyczny na łożu (etap 5, tryby Maszyna i Fizyka):
//   tor A: laser 650 nm → soczewka dwuwypukła f = 100 mm (przesuwana wzdłuż wiązki) → lustro płaskie pod 45° → fotodioda
//          z miernikiem (moc na okienku 10 × 10 mm, fotoprąd z czułości krzemu)
//   tor B: białe LED ze szczeliną → pryzmat równoboczny F2 ustawiony na najmniejsze odchylenie → ekran z widmem
// Fizyka: promienie śledzone co klatkę (behaviors/mech/raytrace.js: Snell, Fresnel, Sellmeier), wiązki — render/optics/beams.js.
// Obsługa: S8 — laser, S9 — LED (zatrzask), przeciąganie soczewki w górę / w dół — przesuw na szynie. Maszyna: oba źródła
// włączone, soczewka jeździ powoli tam i z powrotem.
// createOpticsStation(ctx) → { parts, devices, step(dt), rows(R), state }
import * as THREE from '../../../vendor/three/three.module.js';
import * as CK from '../../models/mech/controls.js';
import * as OK from '../../models/mech/optics/index.js';
import * as RT from '../../behaviors/land/mech/raytrace.js';
import { createBeams } from '../../render/optics/beams.js';
import { T } from './lang.js';

export function createOpticsStation({ root, S, fmt, BED_TOP }) {
  const add = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; root.add(o); return o; };
  const X0 = -2.15, Z0 = 0.55, bb = add(OK.breadboard({ L: 0.9, W: 0.3 }), X0, BED_TOP, Z0), top = BED_TOP + bb.userData.t, E = Math.PI / 2;   // ry = π/2: oś elementu (+z) → świat +x
  // tor A
  const zA = 0.48, laser = add(OK.laser({ nm: 650, mW: 1 }), -2.55, top, zA, E);
  const lensX0 = -2.40, lens = add(OK.lens({ kind: 'biconvex', f: 0.1, glass: 'bk7' }), lensX0, top, zA, E);
  const mir = add(OK.mirror({ shape: 'flat', D: 0.0254, coating: 'ag' }), -2.18, top, zA, -Math.PI / 4);   // normalna lustra (−1, 0, 1)/√2 — wiązka z +x skręca w +z
  const pd = add(OK.photodiode({}), -2.18, top, zA + 0.16, 0);
  // tor B: LED → pryzmat (najmniejsze odchylenie dobrane śledzeniem) → ekran na kierunku wiązki 587,6 nm
  const zB = 0.47, led = add(OK.ledSource({ color: 'white' }), -2.02, top, zB, E);
  const pr = add(OK.prism({ type: 'equilateral', glass: 'f2' }), -1.90, top, zB, E);
  const devAt = (a) => { pr.userData.setAngle(a); const S0 = RT.sceneOf([pr]), em = led.userData.emitter, t = RT.trace(S0, { o: em.origin(), d: em.dir(), I: 1, nm: 587.6 }), out = t.path.filter((s) => s[2] > 0.4).pop(); if (!out || t.path.length < 3) return null; const d = out[1].clone().sub(out[0]).normalize(); return { dev: Math.acos(Math.max(-1, Math.min(1, d.dot(em.dir())))), d, p: out[0] }; };
  let best = null, bestA = 0; root.updateMatrixWorld(true);
  for (let a = -0.9; a <= 0.9; a += 0.005) { const r = devAt(a); if (r && r.d.z > 0 && (!best || r.dev < best.dev)) { best = r; bestA = a; } }   // odchylenie ku przodowi stołu (+z)
  pr.userData.setAngle(bestA); root.updateMatrixWorld(true);
  const scrP = best ? best.p.clone().addScaledVector(best.d, 0.14) : new THREE.Vector3(-1.78, 0, 0.6);
  const scr = add(OK.screen({}), scrP.x, top, scrP.z, best ? Math.atan2(best.d.x, best.d.z) : 0);
  // przyciski
  const s8 = add(CK.pushButton({ color: 'red', mode: 'latch', lit: true }), -2.68, BED_TOP, 0.44), k8 = s8.userData.api;
  const s9 = add(CK.pushButton({ color: 'white', mode: 'latch', lit: true }), -2.68, BED_TOP, 0.58), k9 = s9.userData.api;
  const beams = createBeams({ max: 900 }); root.add(beams.group);
  lens.traverse((o) => { if (o.isMesh) o.userData.control = 'lens'; });
  /* ---------------- logika ---------------- */
  let lx = 0, tM = 0, P = 0, I = 0, focus = NaN;
  const lensApi = { press() {}, release() {}, drag: (n, dy) => { if (n === 'lens') lx = Math.max(-0.06, Math.min(0.08, lx - dy * 0.0006)); }, tick() {} };
  const st = { lx: 0, P: 0, I: 0, focus: NaN, devMin: best ? best.dev : NaN, spread: 0 };
  function step(dt) {
    const phy = S.mode === 'physics';
    if (phy) { k8.tick(dt); k9.tick(dt); } else { tM += dt; lx = 0.05 * Math.sin(tM * 0.4); }
    const onL = phy ? k8.pressed : true, onB = phy ? k9.pressed : true;
    lens.position.x = lensX0 + lx; laser.userData.setOn(onL); led.userData.setOn(onB);
    root.updateMatrixWorld(true);
    const surfs = RT.sceneOf([lens, mir, pd, pr, scr]), ems = [];
    if (onL) ems.push(laser.userData.emitter); if (onB) ems.push(led.userData.emitter);
    const r = RT.simulate(surfs, ems); beams.set(r.segs, r.spots);
    P = r.power.get(pd) || 0; I = RT.siResponsivity(650) * P; pd.userData.setReading(P, I);
    // ognisko: przecięcie promienia brzegowego (paraksjalnie, 1 mm od osi) z osią za soczewką
    const o = laser.userData.emitter.origin(), tr = RT.trace(RT.sceneOf([lens]), { o: o.clone().add(new THREE.Vector3(0, 0, 0.001)), d: new THREE.Vector3(1, 0, 0), I: 1, nm: 650 }), s = tr.path.filter((q) => q[2] > 0.3).pop();
    if (s) { const d = s[1].clone().sub(s[0]); focus = Math.abs(d.z) > 1e-9 ? s[0].x - (s[0].z - zA) * d.x / d.z : NaN; }
    const devs = {}; for (const h of r.spots) if (h.det === scr) devs[h.nm] = h.p;
    Object.assign(st, { lx, P, I, focus, onL, onB });
  }
  function rows(R) {
    const toPd = Math.abs(pd.position.z - zA) + Math.abs(mir.position.x - st.focus);
    R.push(['Stół optyczny — tor lasera', T(`laser ${st.onL ? 'wł.' : 'wył.'} · soczewka x ${fmt((lensX0 + st.lx) * 1000 - lensX0 * 1000, 0)} mm · ognisko ${fmt((st.focus - lens.position.x) * 1000, 1)} mm za soczewką · fotodioda ${fmt(st.P * 1e6, 1)} µW, ${fmt(st.I * 1e6, 1)} µA`, `laser ${st.onL ? 'on' : 'off'} · lens x ${fmt(st.lx * 1000, 0)} mm · focus ${fmt((st.focus - lens.position.x) * 1000, 1)} mm behind the lens · photodiode ${fmt(st.P * 1e6, 1)} µW, ${fmt(st.I * 1e6, 1)} µA`) + (S.mode === 'physics' ? T(' — czerwony S8: laser, przeciągnij soczewkę: przesuw', ' — red S8: laser, drag the lens: move') : '')]);
    R.push(['Stół optyczny — pryzmat', T(`LED ${st.onB ? 'wł.' : 'wył.'} · pryzmat F2 na najmniejszym odchyleniu ${fmt(st.devMin * 180 / Math.PI, 2)}° (587,6 nm) · widmo 450–680 nm na ekranie${S.mode === 'physics' ? ' — biały S9: LED' : ''}`, `LED ${st.onB ? 'on' : 'off'} · F2 prism at minimum deviation ${fmt(st.devMin * 180 / Math.PI, 2)}° (587.6 nm) · 450–680 nm spectrum on the screen${S.mode === 'physics' ? ' — white S9: LED' : ''}`)]);
    void toPd;
  }
  const el0 = (key, id, name, group, props, ports) => ({ key, id, name, group, props, ports: ports.map(([pid, pn, kind]) => ({ id: pid, name: pn, kind })), theta: 0, omega: 0, T: 0, eta: 1, r: 0, dof: 'rot', clock: true });
  const list = [
    el0('bb', 'OP-board', 'Płyta optyczna 900 × 300 mm', bb, [['Otwory', 'M6 co 25 mm']], [['top', 'Mocowanie elementów', 'obrót']]),
    el0('laser', 'OP-laser', 'Laser 650 nm, 1 mW (klasa 2)', laser, [['Średnica wiązki', '2,4 mm'], ['Rozbieżność', '0,6 mrad']], [['out', 'Wiązka → soczewka', 'światło']]),
    el0('lens', 'OP-lens', 'Soczewka dwuwypukła f = 100 mm (N-BK7, na szynie)', lens, [['Przesuw', '−60 … +80 mm (przeciąganie)'], ['Promienie krzywizny', `${fmt(lens.userData.optics.R1 * 1000, 1)} / ${fmt(lens.userData.optics.R2 * 1000, 1)} mm`]], [['in', 'Wiązka z lasera', 'światło'], ['out', 'Wiązka zbieżna → lustro', 'światło']]),
    el0('mir', 'OP-mirror', 'Lustro płaskie 1" (srebro) pod 45°', mir, [['Odbicie przy 650 nm', `${fmt(mir.userData.optics.refl(650) * 100, 1)} %`]], [['in', 'Wiązka z soczewki', 'światło'], ['out', 'Wiązka → fotodioda', 'światło']]),
    el0('pd', 'OP-photodiode', 'Fotodioda krzemowa 10 × 10 mm z miernikiem', pd, [['Czułość przy 650 nm', `${fmt(RT.siResponsivity(650), 2)} A/W`]], [['in', 'Światło', 'światło'], ['out', 'Fotoprąd', 'sygnał']]),
    el0('led', 'OP-led', 'Źródło LED białe ze szczeliną 1 × 6 mm', led, [['Widmo', '450 nm + luminofor 530–620 nm']], [['out', 'Wstęga światła → pryzmat', 'światło']]),
    el0('prism', 'OP-prism', 'Pryzmat równoboczny 25 mm, szkło F2', pr, [['Odchylenie najmniejsze', `${fmt(st.devMin * 180 / Math.PI, 2)}°`], ['Liczba Abbego', fmt(RT.abbe('f2'), 1)]], [['in', 'Biała wiązka', 'światło'], ['out', 'Widmo → ekran', 'światło']]),
    el0('scr', 'OP-screen', 'Ekran biały (widmo)', scr, [['Odległość od pryzmatu', '140 mm']], [['in', 'Widmo', 'światło']]),
    el0('s8', 'OP-s8', 'Przycisk S8 (laser)', s8, [['Styk', 'NO, z zatrzaskiem']], [['a', 'Zasilanie lasera', 'prąd']]),
    el0('s9', 'OP-s9', 'Przycisk S9 (LED)', s9, [['Styk', 'NO, z zatrzaskiem']], [['a', 'Zasilanie LED', 'prąd']]),
  ];
  for (const e of list) e.group.userData.el = e;
  return { parts: list, devices: [{ group: lens, api: lensApi }, { group: s8, api: k8 }, { group: s9, api: k9 }], step, rows, state: st };
}
