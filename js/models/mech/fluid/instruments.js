// FluidKit — pomiar i dysza:
//   gauge          — manometr glicerynowy Ø 63 (obudowa nierdzewna, przyłącze dolne radialne G 1/4): tarcza ze skalą,
//                    wskazówka setValue(p [bar]). Początek: koniec gwintu, oś przyłącza +y, tarcza w +z.
//   pressureSensor — przetwornik ciśnienia 4–20 mA (nierdzewny, G 1/4, złącze M12). Początek: koniec gwintu, oś +y.
//   nozzle         — dysza mosiężna (sześciokąt, stożek, otwór Ø d). Początek: koniec gwintu, wylot w +y.
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, TAU, mesh, port, canvasTex, decal, plastic } from '../common.js';
import { latheY, hexY, fluidMaterials } from './util.js';

export function gauge({ range = 100, d = 0.063, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), R = d / 2;
  g.name = name || `${EN ? 'Pressure gauge' : 'Manometr'} 0–${range} bar Ø${Math.round(d * 1000)}`;
  const thr = mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.01, 20), F.brass); thr.position.y = 0.005; thr.userData.doctorOk = 'clash'; g.add(thr);
  const hex = mesh(hexY(0.014, 0.01), F.brass); hex.position.y = 0.015; g.add(hex);
  const stem = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.008, 16), F.brass); stem.position.y = 0.024; g.add(stem);
  const cy = 0.028 + R, face = new THREE.Group(); face.position.set(0, cy, 0); g.add(face);
  const caseM = mesh(latheY([[0, 0], [R, 0], [R, 0.027], [R - 0.003, 0.027], [R - 0.003, 0.002], [0, 0.002]], 48).rotateX(Math.PI / 2), F.stainless); caseM.position.z = -0.013; face.add(caseM);   // kubek: dno z tyłu, otwarty z przodu (szyba)
  const bezel = mesh(new THREE.TorusGeometry(R - 0.0015, 0.002, 10, 48), F.stainless); bezel.position.z = 0.0145; face.add(bezel);
  const dial = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#f7f6f1'; c.fillRect(0, 0, w, h); c.translate(w / 2, h / 2); c.fillStyle = '#111'; c.strokeStyle = '#111';
    const a0 = -225 * Math.PI / 180, span = 270 * Math.PI / 180, step = range <= 10 ? 1 : range <= 60 ? 5 : range <= 160 ? 10 : 25;
    for (let v = 0; v <= range + 1e-6; v += step / 5) { const a = a0 + span * v / range, big = Math.abs(v / step - Math.round(v / step)) < 1e-6; c.lineWidth = big ? 5 : 2; const r1 = 205, r2 = big ? 172 : 188; c.beginPath(); c.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); c.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); c.stroke(); if (big) { c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(Math.round(v)), Math.cos(a) * 140, Math.sin(a) * 140); } }
    c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.fillText('bar', 0, 70); c.font = '22px sans-serif'; c.fillText('Cl. 1,6 · EN 837-1', 0, 110);
  });
  const dm = mesh(new THREE.CircleGeometry(R - 0.003, 48), new THREE.MeshStandardMaterial({ map: dial.t, roughness: 0.5 })); dm.position.z = 0; face.add(dm);
  const needle = new THREE.Group(); needle.position.z = 0.0012; face.add(needle);
  const nd = mesh(new THREE.BoxGeometry(0.0012, R * 0.82, 0.0006), plastic(0x1a1a1a, 0.4)); nd.position.y = R * 0.32; needle.add(nd);
  const hub = mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.0012, 16).rotateX(Math.PI / 2), plastic(0x1a1a1a, 0.4)); needle.add(hub);
  const glass = mesh(new THREE.CircleGeometry(R - 0.002, 48), F.glass, false); glass.position.z = 0.012; face.add(glass);
  const setValue = (p) => { const u = Math.max(0, Math.min(1.04, p / range)); needle.rotation.z = -((-225 + 270 * u) * Math.PI / 180) - Math.PI / 2; };
  setValue(0);
  g.userData = { range, d, setValue, H: cy + R, mass: 0.22, ports: { p: port(EN ? 'Connection G 1/4 (bottom)' : 'Przyłącze G 1/4 (dół)', DOMAIN.fluid, 'gwint') } };
  return g;
}

export function pressureSensor({ range = 250, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group();
  g.name = name || `${EN ? 'Pressure transmitter' : 'Przetwornik ciśnienia'} 0–${range} bar, 4–20 mA`;
  const thr = mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.012, 20), F.stainless); thr.position.y = 0.006; thr.userData.doctorOk = 'clash'; g.add(thr);
  const hex = mesh(hexY(0.027, 0.012), F.stainless); hex.position.y = 0.018; g.add(hex);
  const body = mesh(latheY([[0, 0], [0.0115, 0], [0.0115, 0.04], [0.009, 0.044], [0, 0.044]], 40), F.stainless); body.position.y = 0.024; g.add(body);
  const m12 = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.012, 24), F.zinc); m12.position.y = 0.074; g.add(m12);
  const lt = canvasTex(512, 64, (c, w, h) => { c.fillStyle = '#d4d8dc'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 22px sans-serif'; c.fillText(`0…${range} bar`, 8, 26); c.font = '18px sans-serif'; c.fillText('4…20 mA · 24 V DC', 8, 52); c.fillText('IP67 · G 1/4', 300, 40); });
  const lab = mesh(new THREE.CylinderGeometry(0.0117, 0.0117, 0.02, 40), new THREE.MeshStandardMaterial({ map: lt.t, roughness: 0.55 })); lab.position.y = 0.044; g.add(lab);   // opaska z tabliczką (bryła zamknięta)
  g.userData = { range, H: 0.08, mass: 0.12, ports: { p: port(EN ? 'Pressure G 1/4' : 'Ciśnienie G 1/4', DOMAIN.fluid, 'gwint'), out: port(EN ? 'Signal 4–20 mA (M12)' : 'Sygnał 4–20 mA (M12)', DOMAIN.sig, 'M12') } };
  return g;
}

export function nozzle({ d = 0.008, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group();
  g.name = name || `${EN ? 'Nozzle' : 'Dysza'} Ø${(d * 1000).toFixed(0)} mm`;
  const thr = mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.012, 24), F.brass); thr.position.y = 0.006; thr.userData.doctorOk = 'clash'; g.add(thr);
  const hex = mesh(hexY(0.024, 0.01), F.brass); hex.position.y = 0.017; g.add(hex);
  const cone = mesh(latheY([[0, 0], [0.011, 0], [Math.max(d / 2 + 0.002, 0.005), 0.022], [d / 2, 0.022], [0, 0.022]], 36), F.brassP); cone.position.y = 0.022; g.add(cone);
  const hole = mesh(new THREE.CircleGeometry(d / 2, 24).rotateX(-Math.PI / 2), F.dark); hole.position.y = 0.0441; g.add(hole);
  g.userData = { d, H: 0.044, mass: 0.06, ports: { in: port(EN ? 'Inlet G 3/8' : 'Wlot G 3/8', DOMAIN.fluid, 'gwint'), jet: port(EN ? 'Jet' : 'Strumień', DOMAIN.fluid, 'wylot') } };
  return g;
}

// licznik obrotów z obrotomierzem (jak głowica wodomierza): mosiężna obudowa, liczydło bębenkowe (6 cyfr — obroty), wskazówka
// prędkości obr/min na łuku, wałek wejściowy z tyłu (−z) ze sprzęgłem. Początek: koniec wałka (oś +z), tarcza w +z.
// setCount(obroty), setRpm(obr/min).
export function revCounter({ max = 600, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), R = 0.03, D = 0.026;
  g.name = name || `${EN ? 'Revolution counter with tachometer' : 'Licznik obrotów z obrotomierzem'} 0–${max} ${EN ? 'rpm' : 'obr/min'}`;
  const shaft = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.014, 16).rotateX(Math.PI / 2), F.steel); shaft.position.z = 0.007; shaft.userData.doctorOk = 'clash'; g.add(shaft);
  const cpl = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 20).rotateX(Math.PI / 2), F.alu); cpl.position.z = 0.02; g.add(cpl);
  const body = mesh(latheY([[0, 0], [R, 0], [R, D], [R - 0.003, D], [R - 0.003, 0.003], [0, 0.003]], 48).rotateX(Math.PI / 2), F.brassF); body.position.z = 0.026; g.add(body);   // kubek otwarty z przodu (szyba)
  let cnt = 0, rpm = 0;
  const draw = (c, w, h) => {
    c.fillStyle = '#f2efe6'; c.fillRect(0, 0, w, h); c.translate(w / 2, h / 2);
    c.strokeStyle = '#1b2b4a'; c.fillStyle = '#1b2b4a'; c.lineWidth = 3; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i <= 12; i++) { const a = Math.PI * (0.8 + 1.4 * i / 12) - Math.PI / 2 - Math.PI * 0.2 - Math.PI * 0.5; const r1 = 108, r2 = i % 2 ? 98 : 90; c.beginPath(); c.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); c.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); c.stroke(); if (i % 2 === 0) { c.font = 'bold 16px sans-serif'; c.fillText(String(Math.round(max * i / 12)), Math.cos(a) * 74, Math.sin(a) * 74); } }
    const digits = String(Math.floor(cnt) % 1e6).padStart(6, '0');
    for (let i = 0; i < 6; i++) { c.fillStyle = i < 5 ? '#111' : '#a01818'; c.fillRect(-75 + i * 25, 18, 22, 32); c.fillStyle = '#fff'; c.font = 'bold 24px monospace'; c.fillText(digits[i], -64 + i * 25, 35); }
    c.fillStyle = '#1b2b4a'; c.font = '14px sans-serif'; c.fillText(EN ? 'rev  ·  rpm' : 'obr  ·  obr/min', 0, 72);
    const u = Math.min(1.05, rpm / max), a = Math.PI * (0.8 + 1.4 * u) - Math.PI * 1.2; c.strokeStyle = '#c01818'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 96, Math.sin(a) * 96); c.stroke();
    c.fillStyle = '#222'; c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.fill();
  };
  const dial = canvasTex(256, 256, draw);
  const face = mesh(new THREE.CircleGeometry(R - 0.004, 48), new THREE.MeshStandardMaterial({ map: dial.t, roughness: 0.45 })); face.position.z = 0.026 + 0.0032; g.add(face);
  const gl = mesh(new THREE.CircleGeometry(R - 0.003, 48), F.glass, false); gl.position.z = 0.026 + D - 0.002; g.add(gl);
  let last = '';
  const redraw = () => { const k = `${Math.floor(cnt)}|${Math.round(rpm)}`; if (k !== last) { last = k; dial.redraw((c, w, h) => { c.setTransform(1, 0, 0, 1, 0, 0); draw(c, w, h); }); } };
  g.userData = { max, D: 0.026 + D, mass: 0.35, setCount: (n) => { cnt = n; redraw(); }, setRpm: (r) => { rpm = Math.abs(r); redraw(); },
    ports: { shaft: port(EN ? 'Input shaft Ø8 (coupling)' : 'Wałek wejściowy Ø8 (sprzęgło)', DOMAIN.rot, 'sprzęgło'), out: port(EN ? 'Readout: revolutions, rpm' : 'Odczyt: obroty, obr/min', DOMAIN.sig, 'tarcza') } };
  return g;
}

// przepływomierz — rotametr: rurka szklana stożkowa (wąsko u dołu) ze skalą l/min, pływak nierdzewny prowadzony na
// pręcie, głowice mosiężne z przyłączami G 1/2 (dół — wlot, góra — wylot), cztery pręty osłony. Woda w rurce widoczna.
// Początek: koniec przyłącza dolnego, oś +y. setFloat(h [m od dołu skali]); scale: [[Q l/min, h m], …] — opis podziałki.
export function rotameter({ L = 0.1, Df = 0.012, scale = [], Qmax = 10, name } = {}) {
  const F = fluidMaterials(), g = new THREE.Group(), R = 0.011, hb = 0.022, y0 = 0.012 + hb;   // y0 — dół szklanej rurki
  g.name = name || `${EN ? 'Rotameter' : 'Rotametr'} 0–${Math.round(Qmax * 10) / 10} l/min`;
  for (const [y, s] of [[0, 1], [y0 + L, -1]]) {
    const thr = mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.012, 24), F.brassF); thr.position.y = s > 0 ? 0.006 : y0 + L + hb + 0.006; thr.userData.doctorOk = 'clash'; g.add(thr);
    const head = mesh(new THREE.BoxGeometry(0.034, hb, 0.034), F.brassF); head.position.y = s > 0 ? 0.012 + hb / 2 : y0 + L + hb / 2; g.add(head);
  }
  const tube = mesh(latheY([[0, 0], [R, 0], [R, L], [0, L]], 40), F.glass, false); tube.position.y = y0; tube.userData.doctorOk = 'seethrough'; g.add(tube);
  const water = mesh(new THREE.CylinderGeometry(R - 0.0015, R - 0.0015 - 0.0012, L, 32), F.water, false); water.position.y = y0 + L / 2; water.userData.doctorOk = 'clash'; g.add(water);
  for (const [x, z] of [[0.014, 0.014], [-0.014, 0.014], [0.014, -0.014], [-0.014, -0.014]]) { const r = mesh(new THREE.CylinderGeometry(0.0016, 0.0016, L, 10), F.stainless); r.position.set(x, y0 + L / 2, z); g.add(r); }
  const guide = mesh(new THREE.CylinderGeometry(0.0012, 0.0012, L, 8), F.stainless); guide.position.y = y0 + L / 2; guide.userData.doctorOk = 'clash'; g.add(guide);
  // pływak: stożek z kołnierzem (odczyt na górnej krawędzi kołnierza)
  const fl = new THREE.Group(); g.add(fl);
  const fb = mesh(latheY([[0.0013, 0], [Df * 0.18, 0], [Df / 2, Df * 0.75], [Df / 2, Df * 0.95], [Df * 0.35, Df * 1.15], [0.0013, Df * 1.15]], 28), F.stainless); fb.userData.doctorOk = 'clash'; fl.add(fb);
  // skala na płytce za rurką (przodem do +z): kreski z podziałki
  const sc = canvasTex(96, 512, (c, w, h) => { c.fillStyle = '#f4f2ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 22px sans-serif'; for (const [q, hh] of scale) { const y = h - 4 - hh / L * (h - 8); c.fillRect(0, y - 1.5, 30, 3); c.fillText(String(q), 36, y + 8); } c.font = '18px sans-serif'; c.fillText('l/min', 18, 22); });
  const plate = mesh(new THREE.BoxGeometry(0.03, L, 0.002), [F.stainless, F.stainless, F.stainless, F.stainless, new THREE.MeshStandardMaterial({ map: sc.t, roughness: 0.5 }), F.stainless]); plate.position.set(0, y0 + L / 2, -0.0135); g.add(plate);
  const setFloat = (h) => { fl.position.y = y0 + Math.max(0, Math.min(L - Df * 0.95, h)) - Df * 0.95; fl.position.y = Math.max(y0, fl.position.y); };
  setFloat(0);
  g.userData = { L, Df, H: y0 + L + hb + 0.012, y0, setFloat, mass: 0.6, ports: { in: port(EN ? 'Inlet G 1/2 (bottom)' : 'Wlot G 1/2 (dół)', DOMAIN.fluid, 'gwint'), out: port(EN ? 'Outlet G 1/2 (top)' : 'Wylot G 1/2 (góra)', DOMAIN.fluid, 'gwint') } };
  return g;
}
