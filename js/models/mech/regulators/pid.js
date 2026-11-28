// Regulator PID panelowy 48 × 48 mm (DIN 43700): ramka czarna, wyświetlacz LED dwuwierszowy (PV czerwony, SV zielony),
// przyciski SET, A/M, ▲, ▼, diody OUT i MAN. Front w +z, środek frontu w (0, 0). Obsługa na modelu: klik przycisku.
// show(pv, sv, out, auto) — wyświetlacz.
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port, materials, plastic, glow, canvasTex, decal } from '../common.js';

export function pidController({ name } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name || (EN ? 'PID controller 48 × 48' : 'Regulator PID 48 × 48');
  const S = 0.048, body = mesh(new THREE.BoxGeometry(0.045, 0.045, 0.08), plastic(0x24262a, 0.6)); body.position.z = -0.04; g.add(body);
  const bezel = mesh(new THREE.BoxGeometry(S, S, 0.006), plastic(0x141516, 0.4)); bezel.position.z = 0.003; g.add(bezel);
  const disp = canvasTex(256, 160, () => {});
  const dm = mesh(new THREE.PlaneGeometry(0.038, 0.024), new THREE.MeshBasicMaterial({ map: disp.t })); dm.position.set(0, 0.008, 0.0062); g.add(dm);
  const btn = (x, label, ctl) => { const b = new THREE.Group(); b.position.set(x, -0.016, 0.0062); const k = mesh(new THREE.BoxGeometry(0.008, 0.006, 0.002), plastic(0x55585e, 0.5)); k.position.z = 0.001; b.add(k); const t = canvasTex(64, 48, (c, w, h) => { c.fillStyle = '#55585e'; c.fillRect(0, 0, w, h); c.fillStyle = '#eee'; c.font = 'bold 24px sans-serif'; c.textAlign = 'center'; c.fillText(label, w / 2, 34); }); const p = mesh(new THREE.PlaneGeometry(0.0078, 0.0058), decal(t.t, 0.5)); p.position.z = 0.0021; b.add(p); b.userData.control = ctl; g.add(b); return b; };
  btn(-0.0145, 'SET', 'set'); btn(-0.0048, 'A/M', 'am'); btn(0.0048, '▼', 'down'); btn(0.0145, '▲', 'up');
  const lOut = glow(0xff4020), lMan = glow(0x28e060);
  for (const [m, x] of [[lOut, -0.017], [lMan, 0.017]]) { const l = mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 0.001, 10).rotateX(Math.PI / 2), m); l.position.set(x, -0.0075, 0.0062); g.add(l); }
  const seg = (c, txt, y, color) => { c.fillStyle = color; c.font = 'bold 64px "IBM Plex Mono", monospace'; c.textAlign = 'right'; c.shadowColor = color; c.shadowBlur = 8; c.fillText(txt, 246, y); c.shadowBlur = 0; };
  const show = (pv, sv, out, auto) => { disp.redraw((c, w, h) => { c.fillStyle = '#0a0b0c'; c.fillRect(0, 0, w, h); seg(c, String(Math.round(pv)).padStart(4, ' '), 70, '#ff3a2a'); seg(c, String(Math.round(sv)).padStart(4, ' '), 145, '#3aff6a'); c.fillStyle = '#888'; c.font = '20px sans-serif'; c.textAlign = 'left'; c.fillText('PV', 6, 40); c.fillText('SV', 6, 115); }); lOut.emissiveIntensity = Math.min(2, out / 5); lMan.emissiveIntensity = auto ? 0 : 1.5; };
  show(0, 0, 0, false);
  g.userData = { mass: 0.25, show, api: null,
    ports: { pv: port(EN ? 'Measured value PV (pulse input)' : 'Wartość mierzona PV (wejście impulsowe)', DOMAIN.sig, 'A/B/Z'), out: port(EN ? 'Analog output 0–10 V' : 'Wyjście analogowe 0–10 V', DOMAIN.sig, '0–10 V'), supply: port(EN ? 'Supply 24 V DC' : 'Zasilanie 24 V DC', DOMAIN.el, 'zacisk'), panel: port(EN ? 'Panel cut-out 45 × 45 (mount)' : 'Otwór w panelu 45 × 45 (mocowanie)', DOMAIN.rot, 'mocowanie') } };
  return g;
}
