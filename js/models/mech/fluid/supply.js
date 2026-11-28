// FluidKit — źródło płynu: przyłącze wodociągowe (pion z rury miedzianej Ø22 z podłogi, zawór główny kulowy z niebieską
// dźwignią, wodomierz skrzydełkowy z liczydłem, kolano i ramię poziome, zawór czerpalny z pokrętłem i wylewką w dół).
// Spód pionu w y = 0, pion w (0, 0), ramię w −x. userData.outlet — wylot wylewki, outletDir — kierunek wypływu (w dół).
// setTap(0…1) — otwarcie pokrętła, setMeter(m³) — liczydło wodomierza.
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port, canvasTex, plastic } from '../common.js';
import { latheY, hexY, tubeSolid, bentPath, fluidMaterials } from './util.js';

const cylX = (r, len, seg = 28) => new THREE.CylinderGeometry(r, r, len, seg).rotateZ(-Math.PI / 2);

export function waterSupply({ H = 0.4, arm = 0.12, kind = 'mains', pReg = 3, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), r = 0.011, cu = new THREE.MeshPhysicalMaterial({ color: 0xc87a4e, metalness: 1, roughness: 0.28, clearcoat: 0.2 });
  g.name = name || (kind === 'gravity' ? (EN ? 'Gravity water tank (header tank)' : 'Zbiornik wody grawitacyjny (na wieży)') : (EN ? 'Water mains connection with pressure reducer' : 'Przyłącze wodociągowe z reduktorem ciśnienia'));
  // rozeta podłogowa i pion z kolanem do ramienia
  const ros = mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.004, 32), F.chrome); ros.position.y = 0.002; g.add(ros);
  const Hb = H + 0.12;   // grawitacyjnie: dno zbiornika na wieży
  g.add(tubeSolid(bentPath(kind === 'gravity' ? [[0, Hb, 0], [0, H, 0], [-arm, H, 0]] : [[0, 0.004, 0], [0, H, 0], [-arm, H, 0]], 0.03), r, cu));
  let headY = 0;
  if (kind === 'gravity') {   // zbiornik na wieży z kątowników, pion z dna; woda spływa grawitacyjnie (ciśnienie ρ·g·h)
    const tw = 0.22, th = 0.16, t = 0.004;
    const shell = mesh(new THREE.BoxGeometry(tw, th, tw), F.tankPaint); shell.position.y = Hb + th / 2; g.add(shell);
    const lid = mesh(new THREE.BoxGeometry(tw + 0.01, 0.006, tw + 0.01), F.tankPaint); lid.position.y = Hb + th + 0.003; g.add(lid);
    const sight = mesh(new THREE.BoxGeometry(0.012, th * 0.8, 0.002), F.glass); sight.position.set(0.05, Hb + th / 2, tw / 2 + 0.001); g.add(sight);
    const lvl = mesh(new THREE.BoxGeometry(0.008, th * 0.8 * 0.7, 0.0008), F.water); lvl.position.set(0.05, Hb + th * 0.1 + th * 0.8 * 0.35, tw / 2 + 0.0006); g.add(lvl);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = mesh(new THREE.BoxGeometry(0.02, Hb, 0.02), F.alu); leg.position.set(sx * (tw / 2 - 0.01), Hb / 2, sz * (tw / 2 - 0.01)); g.add(leg); }
    for (const y of [Hb * 0.35]) for (const sz of [-1, 1]) { const br = mesh(new THREE.BoxGeometry(tw - 0.04, 0.015, 0.004), F.alu); br.position.set(0, y, sz * (tw / 2 - 0.01)); g.add(br); }
    headY = Hb + th * 0.1 + th * 0.8 * 0.7;   // zwierciadło wody nad podłogą
  }
  // zawór główny (kulowy, dźwignia niebieska) na wysokości 0,07 m
  const yv = 0.07, vb = mesh(new THREE.SphereGeometry(0.017, 24, 16), F.brassF); vb.position.y = yv; g.add(vb);
  for (const s of [-1, 1]) { const hx = mesh(hexY(0.03, 0.012), F.brassF); hx.position.y = yv + s * 0.022; hx.userData.mainValve = true; g.add(hx); }
  const stem = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.016, 16).rotateX(Math.PI / 2), F.brassF); stem.position.set(0, yv, 0.022); g.add(stem);
  const lev = mesh(new THREE.BoxGeometry(0.012, 0.075, 0.004), plastic(0x1f5fb0, 0.45)); lev.position.set(0, yv - 0.03, 0.032); g.add(lev);   // dźwignia wzdłuż rury — otwarty
  // reduktor ciśnienia: korpus, kopułka sprężyny w +z z pokrętłem nastawy, manometr na wyjściu (−z niewidoczny — u góry)
  const yr = 0.15, rb = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 24), F.brassF); rb.position.y = yr; g.add(rb);
  for (const s of [-1, 1]) { const nut = mesh(hexY(0.032, 0.01), F.brassF); nut.position.y = yr + s * 0.03; nut.userData.mainValve = true; g.add(nut); }
  const dome = mesh(latheY([[0, 0], [0.02, 0], [0.02, 0.012], [0.014, 0.026], [0, 0.028]], 32).rotateX(Math.PI / 2), F.brassF); dome.position.set(0, yr, 0.012); g.add(dome);
  const rk = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.01, 24).rotateX(Math.PI / 2), plastic(0x1f5fb0, 0.45)); rk.position.set(0, yr, 0.045); g.add(rk);
  const rt = canvasTex(128, 32, (c, w, h) => { c.fillStyle = '#c9a258'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a1e08'; c.font = 'bold 22px sans-serif'; c.fillText(`${pReg} bar`, 20, 24); });
  const rtag = mesh(new THREE.CylinderGeometry(0.0182, 0.0182, 0.01, 32), new THREE.MeshStandardMaterial({ map: rt.t, roughness: 0.5 })); rtag.position.y = yr - 0.012; g.add(rtag);
  // wodomierz: korpus mosiężny, okrągła głowica z liczydłem (tarcza do przodu +z)
  const ym = 0.27, mb = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 28), F.brassF); mb.position.y = ym; g.add(mb);
  for (const s of [-1, 1]) { const nut = mesh(hexY(0.032, 0.012), F.brassF); nut.position.y = ym + s * 0.046; g.add(nut); }
  const head = mesh(latheY([[0, 0], [0.03, 0], [0.03, 0.022], [0.027, 0.026], [0, 0.026]], 40).rotateX(Math.PI / 2), F.brassF); head.position.set(0, ym, 0.012); g.add(head);
  let vol = 0; const dial = canvasTex(256, 256, (c, w, h) => draw(c, w, h, 0));
  function draw(c, w, h, m3) {
    c.fillStyle = '#f2efe6'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b2b4a'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.fillText('m³', w / 2, 70);
    const digits = String(Math.floor(m3 * 1000) % 1e8).padStart(8, '0');   // 5 cyfr m³ (czarne) + 3 cyfry litrów (czerwone)
    for (let i = 0; i < 8; i++) { c.fillStyle = i < 5 ? '#111' : '#a01818'; c.fillRect(28 + i * 25, 92, 22, 34); c.fillStyle = '#fff'; c.font = 'bold 26px monospace'; c.fillText(digits[i], 39 + i * 25, 119); }
    const a = (m3 * 1000 % 1) * Math.PI * 2; c.strokeStyle = '#a01818'; c.lineWidth = 5; c.beginPath(); c.moveTo(w / 2, 186); c.lineTo(w / 2 + Math.sin(a) * 40, 186 - Math.cos(a) * 40); c.stroke();
    c.fillStyle = '#1b2b4a'; c.font = '16px sans-serif'; c.fillText('Q3 2,5 · R160', w / 2, 240);
  }
  const dm = mesh(new THREE.CircleGeometry(0.0255, 40), new THREE.MeshStandardMaterial({ map: dial.t, roughness: 0.45 })); dm.position.set(0, ym, 0.0385); g.add(dm);
  const gl = mesh(new THREE.CircleGeometry(0.0255, 40), F.glass, false); gl.position.set(0, ym, 0.0395); g.add(gl);
  // zawór czerpalny na końcu ramienia: korpus, pokrętło (krzyżak), wylewka w dół z gwintem do węża
  const xt = -arm, yt = H - 0.004, tb = mesh(latheY([[0, 0], [0.016, 0], [0.016, 0.03], [0, 0.03]], 28).rotateZ(Math.PI / 2), F.chrome); tb.position.set(xt + 0.002, yt, 0); g.add(tb);
  const bon = mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.022, 24), F.chrome); bon.position.set(xt - 0.014, yt + 0.027, 0); g.add(bon);
  const knob = new THREE.Group(); knob.position.set(xt - 0.014, yt + 0.038, 0); g.add(knob);
  for (const a of [0, Math.PI / 2]) { const bar = mesh(new THREE.BoxGeometry(0.05, 0.008, 0.01), F.chrome); bar.rotation.y = a; bar.position.y = 0.004; bar.userData.control = 'tap'; knob.add(bar); }
  const cap = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 20), plastic(0x2a6fd0, 0.4)); cap.position.y = 0.01; cap.userData.control = 'tap'; knob.add(cap);
  const spout = mesh(latheY([[0, 0], [0.011, 0], [0.011, 0.03], [0.0125, 0.032], [0.0125, 0.045], [0, 0.045]], 24).rotateX(Math.PI), F.chrome); spout.position.set(xt - 0.014, yt - 0.014, 0); g.add(spout);
  const outlet = new THREE.Vector3(xt - 0.014, yt - 0.014 - 0.045, 0);
  const hole = mesh(new THREE.CircleGeometry(0.0085, 20).rotateX(Math.PI / 2), F.dark); hole.position.copy(outlet).add(new THREE.Vector3(0, -0.0002, 0)); g.add(hole);
  if (kind === 'gravity') [ros, vb, lev, stem, rb, dome, rk, rtag].forEach((o) => g.remove(o));   // bez zaworu głównego i reduktora
  if (kind === 'gravity') [...g.children].filter((o) => o.userData.mainValve).forEach((o) => g.remove(o));
  g.userData = { kind, H, arm, outlet, head: headY, outletDir: new THREE.Vector3(0, -1, 0), dSpout: 0.017, mass: 2.4,
    setTap: (u) => { knob.rotation.y = -u * Math.PI * 2.5; knob.position.y = yt + 0.038 + u * 0.003; },
    setMeter: (m3) => { if (Math.abs(m3 - vol) < 2e-5) return; vol = m3; dial.redraw((c, w, h) => draw(c, w, h, m3)); },
    ports: { mains: port(EN ? 'Mains (floor, Cu 22)' : 'Sieć wodociągowa (podłoga, Cu 22)', DOMAIN.fluid, 'rura'), out: port(EN ? 'Tap spout (G 3/4 hose thread)' : 'Wylewka kranu (gwint G 3/4 do węża)', DOMAIN.fluid, 'gwint') } };
  return g;
}
