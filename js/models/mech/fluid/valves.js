// FluidKit — zawory (oś przepływu wzdłuż x, początek w środku korpusu, chyba że opisano inaczej):
//   ballValve      — kulowy mosiężny (gwint wewnętrzny, nakrętki 6-kątne), dźwignia: setAngle(0 otwarty … π/2 zamknięty);
//                    cut — korpus przezroczysty, widać kulę z otworem
//   checkValve     — zwrotny grzybkowy (mosiądz, strzałka kierunku przepływu)
//   throttleValve  — dławiący iglicowy (z zaworem zwrotnym: check), pokrętło radełkowane ze skalą: setOpen(0…1)
//   reliefValve    — bezpieczeństwa (nabój wkręcany): korpus, śruba nastawy z przeciwnakrętką i kołpakiem; oś +y od 0
//   directionalValve — rozdzielacz 4/3 NG6 (CETOP 3) z dwiema cewkami 24 V DC, wtyczkami DIN i przyciskami awaryjnymi;
//                    spód (płaszczyzna przyłączy P A B T) w y = 0, oś suwaka wzdłuż x. setSpool(−1…1)
//   manifold       — płyta przyłączeniowa NG6 (aluminium) z gniazdem zaworu bezpieczeństwa i manometru; spód w y = 0
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, TAU, mesh, port, canvasTex, decal, glow, plastic } from '../common.js';
import { latheY, hexY, tubeSolid, fluidMaterials } from './util.js';

const cylX = (r, len, seg = 32) => new THREE.CylinderGeometry(r, r, len, seg).rotateZ(-Math.PI / 2);
const latheX = (pts, seg = 40) => latheY(pts, seg).rotateZ(-Math.PI / 2);   // oś obrotu wzdłuż +x
// sprężyna śrubowa wzdłuż x (drut po linii śrubowej), środek w 0
function helixSpring(R, len, wire, turns, mat) {
  const pts = []; for (let i = 0; i <= turns * 24; i++) { const a = i / 24 * Math.PI * 2; pts.push(new THREE.Vector3(-len / 2 + len * i / (turns * 24), Math.cos(a) * R, Math.sin(a) * R)); }
  return tubeSolid(new THREE.CatmullRomCurve3(pts), wire / 2, mat, { seg: turns * 24, radial: 8 });
}

export function ballValve({ dn = 15, handle = 'lever', cut = false, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), d = dn / 1000, L = 0.05 + d * 1.6, s = d * 1.6 + 0.01, body = cut ? F.acrylic : F.brass;
  g.name = name || `${EN ? 'Ball valve DN' : 'Zawór kulowy DN'} ${dn}`;
  // korpus: środek kulisty, szyjki, sześciokąty na końcach (gwint wewnętrzny)
  const mid = mesh(new THREE.SphereGeometry(d * 0.95, 32, 20), body); g.add(mid);
  for (const sx of [-1, 1]) {
    const neck = mesh(cylX(d * 0.72, L / 2 - s * 0.45, 28), body); neck.position.x = sx * (L / 2 - s * 0.45) / 2; g.add(neck);
    const hex = mesh(hexY(s, s * 0.45).rotateZ(Math.PI / 2), body); hex.position.x = sx * (L / 2 - s * 0.225); g.add(hex);
  }
  // kula z otworem (widoczna przy cut) i trzpień
  const ballG = new THREE.Group(); g.add(ballG);
  const ball = mesh(new THREE.SphereGeometry(d * 0.7, 28, 18), F.chrome); ballG.add(ball);
  const bore = mesh(cylX(d / 2, d * 1.42, 24), F.dark); ballG.add(bore);
  ball.visible = bore.visible = cut;
  const stemBoss = mesh(new THREE.CylinderGeometry(d * 0.45, d * 0.5, d * 0.7, 24), body); stemBoss.position.y = d * 0.95 + d * 0.3 - 0.002; g.add(stemBoss);
  const nut = mesh(hexY(d * 0.6, d * 0.25), F.zinc); nut.position.y = d * 0.95 + d * 0.65 + d * 0.125 - 0.002; g.add(nut);
  // dźwignia (stal ocynkowana w osłonie PCV czerwonej) — obraca się wokół y
  const lever = new THREE.Group(); lever.position.y = d * 0.95 + d * 0.65 + d * 0.25 - 0.002; g.add(lever);
  const lv = 0.06 + d * 2, flat = mesh(new THREE.BoxGeometry(lv, 0.003, 0.012), F.zinc); flat.position.set(lv / 2 - 0.008, 0.0015, 0); lever.add(flat);
  const grip = mesh(new THREE.BoxGeometry(lv * 0.6, 0.008, 0.016), plastic(0xc0262a, 0.45)); grip.position.set(lv * 0.7 - 0.004, 0.0045, 0); lever.add(grip);
  [flat, grip].forEach((o) => (o.userData.control = 'valve'));
  if (cut) [ball, bore, nut, flat, grip].forEach((o) => (o.userData.doctorOk = 'floating'));   // przekrój: kula i dźwignia na trzpieniu w przezroczystym korpusie
  const setAngle = (a) => { lever.rotation.y = -a; ballG.rotation.y = -a; };
  g.userData = { dn, d, L, setAngle, mass: 0.15 + d * 12,
    ports: { a: port(EN ? 'Inlet (thread)' : 'Wlot (gwint)', DOMAIN.fluid, 'gwint'), b: port(EN ? 'Outlet (thread)' : 'Wylot (gwint)', DOMAIN.fluid, 'gwint'), lever: port(EN ? 'Lever 0–90°' : 'Dźwignia 0–90°', DOMAIN.rot, 'ręcznie') } };
  return g;
}

export function checkValve({ dn = 15, cut = false, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), d = dn / 1000, L = 0.045 + d * 1.5, s = d * 1.6 + 0.01, body = cut ? F.acrylic : F.brass;
  g.name = name || `${EN ? 'Check valve DN' : 'Zawór zwrotny DN'} ${dn}`;
  const mid = mesh(latheX([[0, -L / 2 + s * 0.45], [d * 0.78, -L / 2 + s * 0.45], [d * 0.95, -0.004], [d * 0.95, 0.008], [d * 0.78, L / 2 - s * 0.45], [0, L / 2 - s * 0.45]], 32), body); g.add(mid);
  for (const sx of [-1, 1]) { const hex = mesh(hexY(s, s * 0.45).rotateZ(Math.PI / 2), body); hex.position.x = sx * (L / 2 - s * 0.225); g.add(hex); }
  const disc = mesh(cylX(d * 0.55, 0.003, 24), F.stainless), spr = helixSpring(d * 0.3, d * 0.6, d * 0.04, 5, F.spring);
  disc.position.x = -0.002; spr.position.x = d * 0.3; g.add(disc, spr); disc.visible = spr.visible = cut;
  const at = canvasTex(128, 48, (c, w, h) => { c.fillStyle = '#c9a258'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a1e08'; c.fillStyle = '#2a1e08'; c.lineWidth = 6; c.beginPath(); c.moveTo(12, 24); c.lineTo(100, 24); c.stroke(); c.beginPath(); c.moveTo(118, 24); c.lineTo(94, 10); c.lineTo(94, 38); c.fill(); });
  const arrow = mesh(new THREE.PlaneGeometry(d * 1.1, d * 0.4), decal(at.t, 0.4)); arrow.position.set(0.002, 0, d * 0.95 + 0.0004); if (!cut) g.add(arrow);
  g.userData = { dn, d, L, mass: 0.12 + d * 10, setOpen: (u) => { disc.position.x = -0.002 + u * d * 0.25; },
    ports: { a: port(EN ? 'Inlet' : 'Wlot', DOMAIN.fluid, 'gwint'), b: port(EN ? 'Outlet (arrow)' : 'Wylot (strzałka)', DOMAIN.fluid, 'gwint') } };
  return g;
}

export function throttleValve({ dn = 6, check = true, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), L = 0.06, H = 0.03, Wd = 0.03;
  g.name = name || (check ? (EN ? 'Throttle check valve' : 'Zawór dławiąco-zwrotny') : (EN ? 'Needle throttle valve' : 'Zawór dławiący iglicowy')) + ` G 1/4`;
  const body = mesh(new THREE.BoxGeometry(L, H, Wd), F.zinc); g.add(body);
  for (const sx of [-1, 1]) { const hex = mesh(hexY(0.019, 0.01).rotateZ(Math.PI / 2), F.zinc); hex.position.x = sx * (L / 2 + 0.005); g.add(hex); }
  const bon = mesh(hexY(0.017, 0.012), F.zinc); bon.position.y = H / 2 + 0.006; g.add(bon);
  const knob = new THREE.Group(); knob.position.y = H / 2 + 0.012; g.add(knob);
  const kb = mesh(latheY([[0, 0], [0.013, 0], [0.014, 0.003], [0.014, 0.016], [0.012, 0.018], [0, 0.018]], 36), plastic(0x1d1d1f, 0.55)); knob.add(kb);
  const mark = mesh(new THREE.BoxGeometry(0.0015, 0.0008, 0.008), plastic(0xd8d8d0, 0.4)); mark.position.set(0, 0.0184, 0.006); knob.add(mark);
  [kb, mark].forEach((o) => (o.userData.control = 'throttle'));
  const sc = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#e8e8e2'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 20px sans-serif'; for (let i = 0; i <= 8; i++) { c.fillRect(8 + i * 30, 0, 2, i % 2 ? 14 : 24); if (i % 2 === 0) c.fillText(String(i / 2), 4 + i * 30, 50); } });
  const scale = mesh(new THREE.PlaneGeometry(L * 0.8, H * 0.35), decal(sc.t)); scale.position.set(0, H * 0.18, Wd / 2 + 0.0003); g.add(scale);
  if (check) {
    const cap = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.008, 24), F.zinc); cap.position.set(0, -H / 2 - 0.004, 0); g.add(cap);
    const sym = canvasTex(128, 64, (c, w, h) => { c.fillStyle = '#e8e8e2'; c.fillRect(0, 0, w, h); c.strokeStyle = '#111'; c.lineWidth = 4; c.beginPath(); c.moveTo(6, 32); c.lineTo(122, 32); c.stroke(); c.beginPath(); c.arc(64, 32, 12, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(40, 12); c.lineTo(52, 32); c.lineTo(40, 52); c.stroke(); });
    const sp = mesh(new THREE.PlaneGeometry(L * 0.45, H * 0.3), decal(sym.t)); sp.position.set(0, -H * 0.22, Wd / 2 + 0.0003); g.add(sp);
  }
  const setOpen = (u) => { knob.rotation.y = -u * 4 * TAU; knob.position.y = H / 2 + 0.012 + u * 0.002; };
  g.userData = { dn, L: L + 0.02, H, setOpen, mass: 0.35,
    ports: { a: port(EN ? 'Port 1 (from cylinder)' : 'Przyłącze 1 (od siłownika)', DOMAIN.fluid, 'gwint'), b: port(EN ? 'Port 2 (to valve)' : 'Przyłącze 2 (do rozdzielacza)', DOMAIN.fluid, 'gwint'), knob: port(EN ? 'Knob — 4 turns' : 'Pokrętło — 4 obroty', DOMAIN.rot, 'ręcznie') } };
  return g;
}

export function reliefValve({ pc = 60, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group();
  g.name = name || `${EN ? 'Pressure relief valve' : 'Zawór bezpieczeństwa'} ${pc} bar`;
  const thread = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 24), F.steel); thread.position.y = 0.006; thread.userData.doctorOk = 'clash'; g.add(thread);
  const hex = mesh(hexY(0.024, 0.012), F.zinc); hex.position.y = 0.018; g.add(hex);
  const sleeve = mesh(new THREE.CylinderGeometry(0.009, 0.01, 0.03, 28), F.zinc); sleeve.position.y = 0.039; g.add(sleeve);
  const lock = mesh(hexY(0.017, 0.006), F.zinc); lock.position.y = 0.057; g.add(lock);
  const screw = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.012, 16), F.steelP); screw.position.y = 0.064; g.add(screw);
  const cap = mesh(latheY([[0, 0], [0.008, 0], [0.008, 0.014], [0.006, 0.017], [0, 0.017]], 28), plastic(0x2a2a2c, 0.5)); cap.position.y = 0.06; g.add(cap);
  const lt = canvasTex(256, 32, (c, w, h) => { c.fillStyle = '#e8e8e2'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 22px sans-serif'; c.fillText(`${pc} bar`, 8, 24); c.fillText(`${pc} bar`, 136, 24); });
  const tag = mesh(new THREE.CylinderGeometry(0.0101, 0.0101, 0.007, 32), new THREE.MeshStandardMaterial({ map: lt.t, roughness: 0.6 })); tag.position.y = 0.03; g.add(tag);   // opaska z nastawą
  g.userData = { pc, H: 0.077, mass: 0.25, ports: { p: port(EN ? 'P (inlet)' : 'P (wlot)', DOMAIN.fluid, 'gniazdo'), t: port(EN ? 'T (to tank)' : 'T (do zbiornika)', DOMAIN.fluid, 'gniazdo') } };
  return g;
}

export function directionalValve({ type = '4/3', center = 'tandem', coil = '24DC', name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), L = 0.1, W = 0.046, H = 0.046, two = type === '4/3';
  g.name = name || `${EN ? 'Directional valve' : 'Rozdzielacz'} ${type} NG6${two ? ` (${EN ? 'tandem center' : 'środek tandem'})` : ''}`;
  const body = mesh(new THREE.BoxGeometry(L, H, W), F.valveGrey); body.position.y = H / 2; g.add(body);
  const seal = mesh(new THREE.BoxGeometry(L * 0.96, 0.001, W * 0.96), F.dark); seal.position.y = 0.0005; g.add(seal);
  // cewki: kwadratowe obudowy z rurką i przyciskiem awaryjnym na końcu, wtyczki DIN 43650 na górze z diodą
  const sides = two ? [-1, 1] : [1], ov = {}, leds = {};
  for (const s of sides) {
    const k = s > 0 ? 'a' : 'b', cx = s * (L / 2 + 0.024);
    const coilB = mesh(new THREE.BoxGeometry(0.044, 0.04, 0.04), plastic(0x1b1c1e, 0.55)); coilB.position.set(cx, H / 2, 0); g.add(coilB);
    const tube = mesh(cylX(0.009, 0.012, 24), F.zinc); tube.position.set(s * (L / 2 + 0.046 + 0.006), H / 2, 0); g.add(tube);
    const nut = mesh(hexY(0.022, 0.008).rotateZ(Math.PI / 2), F.zinc); nut.position.set(s * (L / 2 + 0.046 + 0.012 + 0.004), H / 2, 0); g.add(nut);
    const pin = mesh(cylX(0.003, 0.008, 16), plastic(0xd02a22, 0.45)); pin.position.set(s * (L / 2 + 0.046 + 0.02 + 0.004), H / 2, 0); pin.userData.control = k; g.add(pin); ov[k] = pin;
    nut.userData.control = k; coilB.userData.control = k;
    const plug = mesh(new THREE.BoxGeometry(0.028, 0.028, 0.034), plastic(0x2a2b2e, 0.5)); plug.position.set(cx, H / 2 + 0.02 + 0.014, 0); g.add(plug);
    const led = mesh(new THREE.BoxGeometry(0.006, 0.004, 0.004), glow(0xffb020)); led.position.set(cx, H / 2 + 0.048 + 0.002, 0.009); g.add(led); leds[k] = led;
    const scr = mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.003, 12), F.zinc); scr.position.set(cx, H / 2 + 0.048 + 0.0015, -0.006); g.add(scr);
    const lt = canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#1b1c1e'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8e8e2'; c.font = 'bold 40px sans-serif'; c.fillText(k.toUpperCase(), 18, 46); });
    const lab = mesh(new THREE.PlaneGeometry(0.016, 0.016), decal(lt.t, 0.5)); lab.position.set(cx, H / 2, 0.0204); g.add(lab);
  }
  // tabliczka z symbolem (4/3, środek tandem)
  const sym = canvasTex(256, 96, (c, w, h) => {
    c.fillStyle = '#e8e6de'; c.fillRect(0, 0, w, h); c.strokeStyle = '#111'; c.fillStyle = '#111'; c.lineWidth = 3;
    const bw = 60, x0 = 38; for (let i = 0; i < (two ? 3 : 2); i++) c.strokeRect(x0 + i * bw, 20, bw, 56);
    const arr = (x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); const a = Math.atan2(y2 - y1, x2 - x1); c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - 9 * Math.cos(a - 0.4), y2 - 9 * Math.sin(a - 0.4)); c.lineTo(x2 - 9 * Math.cos(a + 0.4), y2 - 9 * Math.sin(a + 0.4)); c.fill(); };
    arr(x0 + 15, 76, x0 + 15, 20); arr(x0 + 45, 20, x0 + 45, 76);                      // lewe: P→B, A→T (skrzyżowane uproszczone)
    if (two) { c.beginPath(); c.moveTo(x0 + bw + 15, 76); c.lineTo(x0 + bw + 15, 56); c.lineTo(x0 + bw + 45, 56); c.lineTo(x0 + bw + 45, 76); c.stroke(); c.font = 'bold 14px sans-serif'; c.fillText('⊥', x0 + bw + 10, 36); c.fillText('⊥', x0 + bw + 40, 36); }
    const xr = x0 + (two ? 2 : 1) * bw; arr(xr + 15, 76, xr + 45, 20); arr(xr + 45, 76, xr + 15, 20);
    c.font = 'bold 16px sans-serif'; c.fillText('A', x0 + bw + 10, 16); c.fillText('B', x0 + bw + 40, 16); c.fillText('P', x0 + bw + 10, 92); c.fillText('T', x0 + bw + 40, 92);
    c.fillText(two ? 'a' : '', 12, 54); c.fillText(two ? 'b' : 'a', w - 26, 54);
  });
  const plate = mesh(new THREE.PlaneGeometry(L * 0.8, L * 0.3), decal(sym.t)); plate.position.set(0, H / 2, W / 2 + 0.0003); g.add(plate);
  for (const [x, z] of [[-L / 2 + 0.008, -W / 2 + 0.006], [-L / 2 + 0.008, W / 2 - 0.006], [L / 2 - 0.008, -W / 2 + 0.006], [L / 2 - 0.008, W / 2 - 0.006]]) { const b = mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.004, 16), F.dark); b.position.set(x, H + 0.002, z); g.add(b); }
  const setSpool = (s) => {
    for (const k of Object.keys(ov)) { const on = k === 'a' ? s > 0.05 : s < -0.05; ov[k].position.x = (k === 'a' ? 1 : -1) * (L / 2 + 0.046 + 0.024 - (on ? 0.003 : 0)); leds[k].material.emissiveIntensity = on ? 2.2 : 0; }
  };
  setSpool(0);
  g.userData = { type, center, L: L + 2 * 0.07, H: H + 0.05, W, setSpool, mass: 1.6,
    ports: { P: port(EN ? 'P — pressure' : 'P — ciśnienie', DOMAIN.fluid, 'NG6'), T: port(EN ? 'T — tank' : 'T — zbiornik', DOMAIN.fluid, 'NG6'), A: port('A', DOMAIN.fluid, 'NG6'), B: port('B', DOMAIN.fluid, 'NG6'),
      a: port(EN ? 'Coil a (24 V DC, 30 W)' : 'Cewka a (24 V DC, 30 W)', DOMAIN.el, 'DIN 43650'), ...(two ? { b: port(EN ? 'Coil b (24 V DC, 30 W)' : 'Cewka b (24 V DC, 30 W)', DOMAIN.el, 'DIN 43650') } : {}) } };
  return g;
}

export function manifold({ W = 0.11, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), L = 0.11, H = 0.04;
  g.name = name || (EN ? 'NG6 subplate (aluminium)' : 'Płyta przyłączeniowa NG6 (aluminium)');
  const b = mesh(new THREE.BoxGeometry(L, H, W), F.alu); b.position.y = H / 2; g.add(b);
  // przyłącza G 1/4: A, B z przodu (+z); P, T z boku (−x); gniazdo zaworu bezpieczeństwa (+x); manometr i przetwornik na górze
  const at = {};
  for (const [k, x, z, nx] of [['A', 0.02, W / 2, 0], ['B', -0.02, W / 2, 0], ['P', -L / 2, -0.035, -1], ['T', -L / 2, 0.02, -1]]) {
    const side = nx !== 0, ring = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.0015, 24).rotateX(Math.PI / 2), F.dark);
    if (side) { ring.rotation.y = Math.PI / 2; ring.position.set(x - 0.00075, H / 2, z); at[k] = new THREE.Vector3(x - 0.0015, H / 2, z); }
    else { ring.position.set(x, H / 2, z + 0.00075); at[k] = new THREE.Vector3(x, H / 2, z + 0.0015); }
    g.add(ring);
    const lt = canvasTex(32, 32, (c, w, h) => { c.fillStyle = '#c4c8cc'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 26px sans-serif'; c.fillText(k, 7, 26); });
    const lab = mesh(new THREE.PlaneGeometry(0.008, 0.008), decal(lt.t, 0.5));
    if (side) { lab.rotation.y = -Math.PI / 2; lab.position.set(x - 0.0003, H - 0.006, z); } else lab.position.set(x, H - 0.006, z + 0.0003);
    g.add(lab);
  }
  at.relief = new THREE.Vector3(L / 2, H / 2, -0.012); at.gauge = new THREE.Vector3(-L / 2 + 0.01, H, -W / 2 + 0.015); at.sensor = new THREE.Vector3(-L / 2 + 0.012, H, W / 2 - 0.015); at.valve = new THREE.Vector3(0.006, H, 0);
  g.userData = { L, H, W, at, mass: 0.85 * W / 0.07, ports: { P: port('P (G 1/4)', DOMAIN.fluid, 'gwint'), T: port('T (G 1/4)', DOMAIN.fluid, 'gwint'), A: port('A (G 1/4)', DOMAIN.fluid, 'gwint'), B: port('B (G 1/4)', DOMAIN.fluid, 'gwint'), valve: port(EN ? 'NG6 face' : 'Powierzchnia NG6', DOMAIN.fluid, 'NG6') } };
  return g;
}
