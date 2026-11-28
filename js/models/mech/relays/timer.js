// Przekaźnik czasowy modułowy na szynę DIN 35 mm (szerokość 17,5 mm): obudowa z tworzywa (RAL 7035), pokrętło funkcji
// (E, Wi, Bp, R), pokrętło czasu (0,1–10 s), diody U (zasilanie, zielona) i R (styk, żółta), zaciski śrubowe A1 A2 B1
// (góra) i 15 16 18 (dół). Front w +z, spód na szynie w y = 0. Obsługa na modelu: klik pokrętła funkcji — następna,
// przeciąganie pokrętła czasu — czas.
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port, materials, plastic, glow, canvasTex, decal } from '../common.js';

const FNS = ['E', 'Wi', 'Bp', 'R'];
export function timerRelay({ fn = 'E', T = 2, name } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name || (EN ? 'Timer relay (DIN, multifunction)' : 'Przekaźnik czasowy (DIN, wielofunkcyjny)');
  const W = 0.0175, H = 0.09, D = 0.064, grey = plastic(0xd9d9d2, 0.55);
  const body = mesh(new THREE.BoxGeometry(W, H, D * 0.75), grey); body.position.set(0, H / 2, D * 0.375); g.add(body);
  const front = mesh(new THREE.BoxGeometry(W * 0.98, H * 0.5, D * 0.25), grey); front.position.set(0, H / 2, D * 0.875); g.add(front);
  const clip = mesh(new THREE.BoxGeometry(W * 0.9, 0.008, 0.01), plastic(0x3a3a3a)); clip.position.set(0, -0.002, 0.03); g.add(clip);
  // front (wystająca część 45 mm): nadruk funkcji i czasu, diody; zaciski z opisami na stopniach u góry i u dołu
  const face = canvasTex(64, 165, (c, w, h) => { c.fillStyle = '#e4e4dc'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; c.font = '11px sans-serif'; c.textAlign = 'center';
    c.fillText('U   R', w / 2, 16); c.fillText('FUNC', w / 2, 44); c.fillText('E Wi Bp R', w / 2, 56); c.fillText('t [s]', w / 2, 100); c.fillText('0,1 … 10', w / 2, 158); });
  const fp = mesh(new THREE.PlaneGeometry(W * 0.96, H * 0.49), decal(face.t)); fp.position.set(0, H / 2, D + 0.0002); g.add(fp);
  const tl = canvasTex(64, 24, (c, w, h) => { c.fillStyle = '#d9d9d2'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText('A1 B1 A2', w / 2, 16); });
  const bl = canvasTex(64, 24, (c, w, h) => { c.fillStyle = '#d9d9d2'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText('15 16 18', w / 2, 16); });
  for (const [t, y] of [[tl, H * 0.82], [bl, H * 0.18]]) { const p = mesh(new THREE.PlaneGeometry(W * 0.9, 0.007), decal(t.t)); p.position.set(0, y, D * 0.75 + 0.0002); g.add(p); }
  const knob = (y, ctl) => { const k = new THREE.Group(); k.position.set(0, y, D + 0.001); const b = mesh(new THREE.CylinderGeometry(0.0055, 0.006, 0.006, 24).rotateX(Math.PI / 2), plastic(0x2f6fb5, 0.4)); b.position.z = 0.003; k.add(b); const mark = mesh(new THREE.BoxGeometry(0.0012, 0.0045, 0.0008), plastic(0xffffff, 0.4)); mark.position.set(0, 0.0025, 0.0062); k.add(mark); k.userData.control = ctl; g.add(k); return k; };
  const kF = knob(H * 0.6, 'fn'), kT = knob(H * 0.36, 'time');
  const lu = glow(0x28e060), lr = glow(0xffb020);
  for (const [m, x] of [[lu, -0.0035], [lr, 0.0035]]) { const l = mesh(new THREE.CylinderGeometry(0.0013, 0.0013, 0.002, 12).rotateX(Math.PI / 2), m); l.position.set(x, H * 0.7, D + 0.001); g.add(l); }
  for (const [y, z] of [[H - 0.004, D * 0.62], [0.004, D * 0.62]]) for (const x of [-0.0055, 0, 0.0055]) { const s = mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.003, 12), M.steelP); s.position.set(x, y + 0.0015 * Math.sign(y - H / 2), z); g.add(s); }
  const st = { fn, T };
  const show = () => { kF.rotation.z = -FNS.indexOf(st.fn) * 0.9 + 1.35; kT.rotation.z = 2.3 - Math.log10(st.T / 0.1) / 2 * 4.6; };
  show();
  g.userData = { W, H, D, mass: 0.07,
    api: { get fn() { return st.fn; }, get T() { return st.T; }, setFn(f) { st.fn = f; show(); }, setT(t) { st.T = Math.max(0.1, Math.min(10, t)); show(); },
      press(n) { if (n === 'fn') { st.fn = FNS[(FNS.indexOf(st.fn) + 1) % FNS.length]; show(); } }, release() {}, drag(n, dy) { if (n === 'time') { st.T = Math.max(0.1, Math.min(10, st.T * Math.exp(-dy * 0.02))); show(); } }, tick() {} },
    setLeds: (u, r) => { lu.emissiveIntensity = u ? 1.4 : 0; lr.emissiveIntensity = r ? 2 : 0; },
    ports: { coil: port(EN ? 'Supply A1–A2 (24–240 V AC/DC)' : 'Zasilanie A1–A2 (24–240 V AC/DC)', DOMAIN.el, 'zacisk'), b1: port(EN ? 'Control input B1' : 'Wejście sterujące B1', DOMAIN.sig, 'zacisk'), out: port(EN ? 'Changeover contact 15–16 / 15–18' : 'Styk przełączny 15–16 / 15–18', DOMAIN.el, 'zacisk'), rail: port(EN ? 'DIN rail 35 mm (mount)' : 'Szyna DIN 35 mm (mocowanie)', DOMAIN.rot, 'mocowanie') } };
  return g;
}
