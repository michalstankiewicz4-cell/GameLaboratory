// OptiKit — źródła światła (oś +z, wylot w (0, AXIS_Y, z_out)):
//   laser    — moduł diody laserowej Ø 12 × 45 (obudowa mosiężna czerniona, soczewka kolimująca), w uchwycie V na słupku;
//              setOn(b) — świecenie okienka. userData.emitter: { origin, dir (lokalnie), nm, P [W], w0 [m], div [rad] }
//   ledSource — biała dioda mocy z radiatorem, kondensor i szczelina 1 × 6 mm: wąska wstęga równoległych promieni
//              (widmo luminoforu, raytrace.WHITE_LED); kolorowa — jedna długość fali.
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port, canvasTex, decal } from '../common.js';
import { waveColor } from '../../../behaviors/land/mech/optics.js';
import { opticMaterials, postMount, toWorld, dirWorld, AXIS_Y } from './mount.js';

const cylZ = (r, len, seg = 32) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2);

export function laser({ nm = 650, mW = 1, name } = {}) {
  const M = opticMaterials(), head = new THREE.Group(), L = 0.045, col = waveColor(nm);
  const body = mesh(cylZ(0.006, L, 32), M.anod); body.position.z = -L / 2; head.add(body);
  const nose = mesh(new THREE.CylinderGeometry(0.0045, 0.006, 0.006, 32).rotateX(Math.PI / 2), M.brassF); nose.position.z = 0.003; head.add(nose);
  const win = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: col, emissiveIntensity: 0, roughness: 0.2 });
  const ap = mesh(new THREE.CircleGeometry(0.0022, 20), win); ap.position.z = 0.0065; head.add(ap);
  const cable = mesh(cylZ(0.0018, 0.03, 12), M.rubber); cable.position.z = -L - 0.015; head.add(cable);
  // uchwyt V: blok z rowkiem i śrubą dociskową
  const v = new THREE.Shape(); v.moveTo(-0.012, -0.013); v.lineTo(0.012, -0.013); v.lineTo(0.012, -0.002); v.lineTo(0.0052, -0.002); v.lineTo(0, -0.0068); v.lineTo(-0.0052, -0.002); v.lineTo(-0.012, -0.002); v.closePath();
  const vb = mesh(new THREE.ExtrudeGeometry(v, { depth: 0.025, bevelEnabled: false }).translate(0, 0, -0.035), M.anod); head.add(vb);
  const lt = canvasTex(256, 48, (c, w, h) => { c.fillStyle = '#e6c84a'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 22px sans-serif'; c.fillText(`⚠ ${nm} nm · ${mW} mW · ${mW <= 1 ? (EN ? 'Class 2' : 'Klasa 2') : 'Klasa 3R'}`, 6, 32); });
  const lab = mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.016, 32, 1, false).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ map: lt.t, roughness: 0.5 })); lab.position.z = -0.03; head.add(lab);
  const g = postMount(head, { headDrop: 0.013 });
  g.name = name || `${EN ? 'Laser diode module' : 'Moduł lasera'} ${nm} nm, ${mW} mW`;
  g.userData = { emitter: { kind: 'laser', nm, P: mW / 1000, w0: 0.0012, div: 0.0006, head, origin: () => toWorld(head, new THREE.Vector3(0, 0, 0.0066)), dir: () => dirWorld(head, new THREE.Vector3(0, 0, 1)) },
    setOn: (on) => { win.emissiveIntensity = on ? 3 : 0; }, axisY: AXIS_Y, mass: 0.12,
    ports: { power: port(EN ? 'Supply 3–5 V DC' : 'Zasilanie 3–5 V DC', DOMAIN.el, 'przewód'), out: port(EN ? 'Laser beam' : 'Wiązka lasera', DOMAIN.light, 'promień'), mount: port(EN ? 'Base (M6 screw)' : 'Podstawa (śruba M6)', DOMAIN.rot, 'mocowanie') } };
  return g;
}

export function ledSource({ color = 'white', nm = 590, W = 3, name } = {}) {
  const M = opticMaterials(), head = new THREE.Group(), white = color === 'white', col = white ? new THREE.Color(1, 0.97, 0.9) : waveColor(nm);
  // radiator z żebrami, korpus, kondensor (soczewka w tubusie), płytka szczeliny
  const hs = mesh(new THREE.BoxGeometry(0.03, 0.03, 0.012), M.anod); hs.position.z = -0.05; head.add(hs);
  for (let i = 0; i < 6; i++) { const fin = mesh(new THREE.BoxGeometry(0.03, 0.002, 0.014), M.anod); fin.position.set(0, -0.0125 + i * 0.005, -0.063); head.add(fin); }
  const tube = mesh(cylZ(0.011, 0.038, 40), M.anod); tube.position.z = -0.025; head.add(tube);
  const lensC = mesh(new THREE.SphereGeometry(0.0095, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.3), M.glass()); lensC.position.z = -0.006; lensC.userData.doctorOk = 'clash'; head.add(lensC);
  const sl = new THREE.Shape(); sl.moveTo(-0.014, -0.014); sl.lineTo(0.014, -0.014); sl.lineTo(0.014, 0.014); sl.lineTo(-0.014, 0.014); sl.closePath();
  const slot = new THREE.Path(); slot.moveTo(-0.0005, -0.003); slot.lineTo(0.0005, -0.003); slot.lineTo(0.0005, 0.003); slot.lineTo(-0.0005, 0.003); slot.closePath(); sl.holes.push(slot);
  const sp = mesh(new THREE.ExtrudeGeometry(sl, { depth: 0.002, bevelEnabled: false }), M.anod); sp.position.z = -0.006; head.add(sp);
  const glowM = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: col, emissiveIntensity: 0, roughness: 0.3 });
  const glow = mesh(new THREE.PlaneGeometry(0.001, 0.006), glowM); glow.position.z = -0.0055; head.add(glow);
  const arm = mesh(new THREE.BoxGeometry(0.012, 0.01, 0.034), M.anod); arm.position.set(0, -0.016, -0.017);   // wspornik od tubusu nad słupek head.add(arm);
  const g = postMount(head, { headDrop: 0.021 });
  g.name = name || (white ? (EN ? `White LED source with slit, ${W} W` : `Źródło LED białe ze szczeliną, ${W} W`) : (EN ? `LED source ${nm} nm with slit` : `Źródło LED ${nm} nm ze szczeliną`));
  g.userData = { emitter: { kind: 'led', white, nm, P: W * 0.3 * 0.002, slit: [0.001, 0.006], head, origin: () => toWorld(head, new THREE.Vector3(0, 0, -0.004)), dir: () => dirWorld(head, new THREE.Vector3(0, 0, 1)), up: () => dirWorld(head, new THREE.Vector3(0, 1, 0)) },
    setOn: (on) => { glowM.emissiveIntensity = on ? 4 : 0; }, axisY: AXIS_Y, mass: 0.25,
    ports: { power: port(EN ? 'Supply 12 V DC' : 'Zasilanie 12 V DC', DOMAIN.el, 'przewód'), out: port(EN ? 'Light ribbon (slit)' : 'Wstęga światła (szczelina)', DOMAIN.light, 'promień'), mount: port(EN ? 'Base (M6 screw)' : 'Podstawa (śruba M6)', DOMAIN.rot, 'mocowanie') } };
  return g;
}
