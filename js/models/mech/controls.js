// MechKit — sterowanie: wyłączniki, potencjometr, przycisk, falownik z pokrętłem. Elementy obsługiwane na modelu:
// części do kliknięcia albo przeciągnięcia mają userData.control = nazwa; model zwraca stan i metody:
//   press(nazwa) / release(nazwa) / drag(nazwa, dy) — dy: przesunięcie myszy w pikselach (w górę ujemne), tick(dt) — animacje
// Przód obudowy patrzy w +z, montaż na płycie y = 0. Wymiary prawdziwe (otwór 22,5 mm na przyciski i lampki itd.).
import * as THREE from '../../../vendor/three/three.module.js';
import { materials } from './mechkit.js';

const TAU = Math.PI * 2;
const mesh = (g, m, shadow = true) => { const o = new THREE.Mesh(g, m); o.castShadow = shadow; o.receiveShadow = true; return o; };
const plastic = (color, rough = 0.45) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
let P = null;
// ---------------- właściwości elektryczne (userData.elec) ----------------
// Każde urządzenie niesie swoje dane elektryczne — obwód (js/behaviors/land/mech/circuit.js) i laboratorium tylko je czytają.
// contacts: styki z numerami zacisków wg EN 60947 ('13-14': 'NO' — zwierny, '11-12': 'NC' — rozwierny,
// przy przełączniku — położenie, w którym styk jest zamknięty)
const parseVolts = (v) => { const m = /^(\d+(?:[.,]\d+)?)\s*(AC|DC)?/i.exec(String(v)); return { U: m ? parseFloat(m[1].replace(',', '.')) : 230, kind: m && m[2] ? m[2].toUpperCase() : 'AC' }; };
export const ELEC = {
  contactor: { pullIn: 0.85, dropOut: 0.6, tClose: 0.02, VA: { inrush: 70, hold: 8 } },   // cewka: zadziała ≥ 85 % Un po 20 ms, odpada < 60 % Un (EN 60947-4-1)
  inverter: { eta: 0.97, standby: 15, pfIn: 0.95, Uin: 400, supply: 24, diOn: 15, aiMax: 10, boot: 0.5 },   // sprawność, pobór jałowy (W), cos φ wejścia; 24 V DC na wejścia DI (aktywne ≥ 15 V, IEC 61131-2 typ 1), AI 0–10 V, rozruch (s)
  lamp: { P: 1, on: 0.5 },                                                                    // lampka LED: moc (W), świeci od 50 % Un
};

export function plastics() {
  if (P) return P;
  P = {
    grey: plastic(0xd4d4cc, 0.55),      // RAL 7035 — obudowy
    dark: plastic(0x2a2c2f, 0.5), black: plastic(0x141516, 0.35),
    red: plastic(0xc8221c, 0.35), green: plastic(0x1f8a3a, 0.35), yellow: plastic(0xe8c21c, 0.4), blue: plastic(0x1f56b0, 0.35), white: plastic(0xeeeeea, 0.4),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd8dadc, roughness: 0.15, metalness: 1 }),
  };
  return P;
}
export const BUTTON_COLORS = { green: 'zielony (start)', red: 'czerwony (stop)', yellow: 'żółty', blue: 'niebieski (reset)', black: 'czarny', white: 'biały' };
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { t, c }; };

/* ---------------- obudowa natynkowa ---------------- */
// puszka z tworzywa: korpus, pokrywa z zaokrąglonym obrzeżem, 4 wkręty; front w +z, środek frontu w (0, h/2, d)
export function enclosure({ w = 0.08, h = 0.08, d = 0.06, mat = 'grey' } = {}) {
  const Pm = plastics(), M = materials(), g = new THREE.Group(); g.name = 'Obudowa natynkowa IP65';
  const body = mesh(new THREE.BoxGeometry(w, h, d - 0.006), Pm[mat]); body.position.set(0, h / 2, (d - 0.006) / 2); g.add(body);
  const lid = mesh(new THREE.BoxGeometry(w - 0.002, h - 0.002, 0.006), Pm[mat]); lid.position.set(0, h / 2, d - 0.003); g.add(lid);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const s = mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.0012, 16).rotateX(Math.PI / 2), M.steel); s.position.set(sx * (w / 2 - 0.007), h / 2 + sy * (h / 2 - 0.007), d + 0.0005); g.add(s);
  }
  for (const sx of [-1, 1]) { const foot = mesh(new THREE.BoxGeometry(0.012, 0.004, d * 0.6), Pm[mat]); foot.position.set(sx * (w / 2 + 0.005), 0.002, d * 0.4); g.add(foot); }
  g.userData.front = new THREE.Vector3(0, h / 2, d);
  return g;
}

/* ---------------- wyłącznik ---------------- */
// kind: 'lever' — dźwigniowy (tulejka M12 z nakrętką, dźwignia 20°), 'cam' — krzywkowy obrotowy 0–I (pokrętło, tabliczka),
// 'main' — główny (czerwona rączka na żółtej tabliczce, 0 / I, z kłódką)
export function switchUnit({ kind = 'cam', poles = 3, amps = 16 } = {}) {
  const Pm = plastics(), M = materials(), g = new THREE.Group(), main = kind === 'main';
  const box = enclosure({ w: main ? 0.1 : 0.08, h: main ? 0.12 : 0.08, d: 0.07, mat: 'grey' }); g.add(box);
  const f = box.userData.front, pivot = new THREE.Group(); pivot.position.copy(f); g.add(pivot);
  let on = false, ang = 0;
  const target = () => (kind === 'lever' ? (on ? -0.4 : 0.4) : (on ? -Math.PI / 2 : 0));
  if (kind === 'lever') {
    // tulejka wchodzi 2 mm w pokrywę, nakrętka 0,2 mm nad pokrywą — bez wspólnych płaszczyzn
    const bush = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.014, 24).rotateX(Math.PI / 2), M.steel); bush.position.set(0, 0, 0.005); pivot.add(bush);
    const nut = mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.003, 6).rotateX(Math.PI / 2), M.steel); nut.position.set(0, 0, 0.0017); pivot.add(nut);
    const arm = new THREE.Group(); arm.position.z = 0.011; pivot.add(arm);
    const lever = mesh(new THREE.CylinderGeometry(0.0022, 0.0032, 0.022, 16), Pm.chrome); lever.position.y = 0.011; arm.add(lever);
    const tip = mesh(new THREE.SphereGeometry(0.0034, 16, 12), M.steel); tip.position.y = 0.022; arm.add(tip);
    for (const o of [lever, tip]) o.userData.control = 'toggle';
    const plate = canvasTex(128, 192, (c, w, h) => { c.fillStyle = '#e6e6e0'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('I', 64, 30); c.fillText('O', 64, 164); });
    const pl = mesh(new THREE.PlaneGeometry(0.032, 0.048), new THREE.MeshStandardMaterial({ map: plate.t, roughness: 0.6 })); pl.position.z = 0.0002; pivot.add(pl);   // I u góry, O u dołu — nad i pod dźwignią
    g.userData.anim = (a) => { arm.rotation.x = a; };
  } else {
    const pc = main ? '#e8c21c' : '#e6e6e0';
    const plate = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = pc; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('0', 128, 34); c.fillText('I', 222, 128);   // 0 u góry, I w prawo (obrót o 90° w prawo)
      if (main) { c.font = 'bold 18px sans-serif'; c.fillText('WYŁĄCZNIK GŁÓWNY', 128, 228); }
    });
    const s = main ? 0.064 : 0.048;
    const pl = mesh(new THREE.BoxGeometry(s, s, 0.0015), [Pm.grey, Pm.grey, Pm.grey, Pm.grey, new THREE.MeshStandardMaterial({ map: plate.t, roughness: 0.5 }), Pm.grey]); pl.position.z = 0.00075; pivot.add(pl);
    const knob = new THREE.Group(); knob.position.z = 0.0015; pivot.add(knob);
    const base = mesh(new THREE.CylinderGeometry(main ? 0.017 : 0.013, main ? 0.019 : 0.015, 0.008, 32).rotateX(Math.PI / 2), main ? Pm.red : Pm.black); base.position.z = 0.004; knob.add(base);
    const handle = mesh(new THREE.BoxGeometry(main ? 0.012 : 0.008, main ? 0.05 : 0.034, main ? 0.016 : 0.012), main ? Pm.red : Pm.black); handle.position.z = main ? 0.016 : 0.013; knob.add(handle);
    const mark = mesh(new THREE.BoxGeometry(0.0018, 0.008, 0.0008), Pm.white); mark.position.set(0, (main ? 0.05 : 0.034) / 2 - 0.006, (main ? 0.024 : 0.019) + 0.0004); knob.add(mark);
    for (const o of [base, handle, mark]) o.userData.control = 'toggle';
    g.userData.anim = (a) => { knob.rotation.z = a; };
  }
  g.userData.anim(target()); ang = target();
  const api = {
    get on() { return on; },
    press(c) { if (c === 'toggle') on = !on; }, release() {}, drag() {},
    tick(dt) { const t = target(); ang += (t - ang) * Math.min(1, dt * 18); g.userData.anim(ang); },
  };
  Object.assign(g.userData, { elec: { poles, In: amps, contacts: Object.fromEntries([['1-2', 'I'], ['3-4', 'I'], ['5-6', 'I'], ['7-8', 'I']].slice(0, poles)) }, kind, poles, amps, mass: main ? 0.62 : 0.35, api });
  return g;
}

/* ---------------- potencjometr ---------------- */
// panelowy z pokrętłem Ø 25 mm, skala 0–10 na 270°; taper: 'lin' (B) albo 'log' (A, 10 % przy połowie obrotu)
export function potentiometer({ ohms = 10000, taper = 'lin', knob = 'black' } = {}) {
  const Pm = plastics(), M = materials(), g = new THREE.Group();
  const box = enclosure({ w: 0.08, h: 0.08, d: 0.06 }); g.add(box);
  const f = box.userData.front, pivot = new THREE.Group(); pivot.position.copy(f); g.add(pivot);
  const scale = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#e6e6e0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#111'; c.fillStyle = '#111'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 20px sans-serif';
    for (let k = 0; k <= 50; k++) {   // 270°: od −135° (lewy dół) do +135° (prawy dół), 0 u góry
      const a = (-135 + 270 * k / 50) * Math.PI / 180, r0 = k % 5 ? 98 : 90; c.lineWidth = k % 5 ? 2 : 4;
      c.beginPath(); c.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0); c.lineTo(128 + Math.sin(a) * 108, 128 - Math.cos(a) * 108); c.stroke();
      if (k % 5 === 0) c.fillText(String(k / 5), 128 + Math.sin(a) * 72, 128 - Math.cos(a) * 72);
    }
  });
  const pl = mesh(new THREE.CircleGeometry(0.03, 48), new THREE.MeshStandardMaterial({ map: scale.t, roughness: 0.5 })); pl.position.z = 0.0003; pivot.add(pl);
  const nut = mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.0025, 6).rotateX(Math.PI / 2), M.steel); nut.position.z = 0.0016; pivot.add(nut);
  const kn = new THREE.Group(); kn.position.z = 0.003; pivot.add(kn);
  const body = mesh(new THREE.CylinderGeometry(0.0115, 0.0125, 0.016, 40).rotateX(Math.PI / 2), Pm[knob] || Pm.black); body.position.z = 0.008; kn.add(body);
  const ribs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0012, 0.0012, 0.014), Pm[knob] || Pm.black, 24);
  const m4 = new THREE.Matrix4(); for (let k = 0; k < 24; k++) { const a = k * TAU / 24; m4.makeRotationZ(a).setPosition(Math.sin(a) * 0.0122, Math.cos(a) * 0.0122, 0.008); ribs.setMatrixAt(k, m4); } kn.add(ribs);
  const cap = mesh(new THREE.CylinderGeometry(0.009, 0.0105, 0.002, 40).rotateX(Math.PI / 2), M.alu); cap.position.z = 0.0168; kn.add(cap);
  const line = mesh(new THREE.BoxGeometry(0.0016, 0.0085, 0.0006), Pm.white); line.position.set(0, 0.0045, 0.0181); kn.add(line);
  for (const o of [body, cap, line]) o.userData.control = 'knob';
  let pos = 0.5;   // położenie 0…1
  const apply = () => { kn.rotation.z = -(-135 + 270 * pos) * Math.PI / 180; };
  apply();
  const ratio = () => (taper === 'log' ? (Math.pow(10, 2 * pos) - 1) / 99 : pos);   // log: ok. 10 % przy połowie (krzywa A)
  const api = { get pos() { return pos; }, set pos(v) { pos = Math.max(0, Math.min(1, v)); apply(); }, ratio, press() {}, release() {}, drag(c, dy) { if (c === 'knob') { pos = Math.max(0, Math.min(1, pos - dy / 300)); apply(); } }, tick() {} };
  Object.assign(g.userData, { elec: { R: ohms, taper, terminals: ['1', '2 (suwak)', '3'] }, ohms, taper, mass: 0.22, api });
  return g;
}

/* ---------------- przycisk 22 mm ---------------- */
// chwilowy albo z podtrzymaniem, styk NO (zwierny) albo NC (rozwierny), podświetlenie; obudowa jednootworowa
export function pushButton({ color = 'green', mode = 'momentary', contact = 'NO', lit = false, mushroom = false } = {}) {
  const Pm = plastics(), M = materials(), g = new THREE.Group();
  const box = enclosure({ w: 0.07, h: 0.07, d: 0.065, mat: 'grey' }); g.add(box);
  const f = box.userData.front, pivot = new THREE.Group(); pivot.position.copy(f); g.add(pivot);
  const bezel = mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.006, 40).rotateX(Math.PI / 2), Pm.chrome); bezel.position.z = 0.003; pivot.add(bezel);
  const ring = mesh(new THREE.TorusGeometry(0.0145, 0.0012, 10, 40), Pm.chrome); ring.position.z = 0.006; pivot.add(ring);
  const capMat = (Pm[color] || Pm.green).clone();
  if (lit) { capMat.transparent = true; capMat.opacity = 0.92; capMat.emissive = capMat.color.clone(); capMat.emissiveIntensity = 0; }
  const cap = new THREE.Group(); pivot.add(cap);
  const head = mushroom ? mesh(new THREE.SphereGeometry(0.02, 32, 16, 0, TAU, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.45), capMat) : mesh(new THREE.CylinderGeometry(0.0118, 0.0118, 0.006, 40).rotateX(Math.PI / 2), capMat);
  head.position.z = mushroom ? 0.008 : 0.008; cap.add(head);
  if (mushroom) { const stem = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 32).rotateX(Math.PI / 2), capMat); stem.position.z = 0.006; cap.add(stem); }
  head.userData.control = 'button';
  // blok styków za płytą (widać przy przezroczystej obudowie — tu w środku puszki)
  const blk = mesh(new THREE.BoxGeometry(0.03, 0.032, 0.03), Pm.dark); blk.position.set(f.x, f.y, f.z - 0.026); g.add(blk);
  let down = false, latched = false, depth = 0;
  const pressedNow = () => (mode === 'latch' ? latched : down);
  const closed = () => (contact === 'NO' ? pressedNow() : !pressedNow());
  const api = {
    get pressed() { return pressedNow(); }, get closed() { return closed(); },
    press(c) { if (c !== 'button') return; down = true; if (mode === 'latch') latched = !latched; },
    release() { down = false; }, drag() {},
    tick(dt) { const t = down ? 0.0035 : mode === 'latch' && latched ? 0.002 : 0; depth += (t - depth) * Math.min(1, dt * 30); cap.position.z = -depth; if (lit) capMat.emissiveIntensity = closed() ? 1.6 : 0; },
  };
  Object.assign(g.userData, { elec: { contacts: contact === 'NC' ? { '11-12': 'NC' } : { '13-14': 'NO' } }, color, mode, contact, lit, mass: 0.12, api });
  return g;
}

/* ---------------- falownik z panelem ---------------- */
// przemiennik częstotliwości: radiator, panel z wyświetlaczem (Hz), pokrętło zadawania, RUN / STOP, FWD / REV (kierunek);
// częstotliwość narasta i opada po rampie (czas od 0 do fmax), przy zmianie kierunku przechodzi przez zero po rampie
export function inverter({ kW = 1.1, fmax = 50, ramp = 5 } = {}) {
  const Pm = plastics(), M = materials(), g = new THREE.Group(), k = Math.cbrt(Math.max(0.37, kW) / 1.1);
  const W = 0.1 * k, H = 0.17 * k, D = 0.13 * k;
  const sink = mesh(new THREE.BoxGeometry(W, H, 0.02), M.alu); sink.position.set(0, H / 2, 0.01); g.add(sink);
  const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.002, H * 0.96, 0.03), M.alu, 9); fins.castShadow = true;
  const m4 = new THREE.Matrix4(); for (let i = 0; i < 9; i++) { m4.makeTranslation(-W / 2 + W * (i + 0.5) / 9, H / 2, -0.015); fins.setMatrixAt(i, m4); } g.add(fins);
  const body = mesh(new THREE.BoxGeometry(W * 0.98, H * 0.98, D - 0.02), Pm.dark); body.position.set(0, H / 2, 0.02 + (D - 0.02) / 2); g.add(body);
  const fz = D + 0.0005, panel = new THREE.Group(); panel.position.set(0, H * 0.66, fz); g.add(panel);
  const pw = W * 0.8, ph = H * 0.36;
  const face = mesh(new THREE.BoxGeometry(pw, ph, 0.002), Pm.black); face.position.z = 0.001; panel.add(face);
  const disp = canvasTex(256, 96, () => {});
  const dm = new THREE.MeshStandardMaterial({ map: disp.t, emissive: 0xffffff, emissiveMap: disp.t, emissiveIntensity: 0.9, roughness: 0.3 });
  const screen = mesh(new THREE.PlaneGeometry(pw * 0.78, pw * 0.78 * 96 / 256), dm); screen.position.set(0, ph * 0.26, 0.0022); panel.add(screen);
  const btn = (col, x, label) => {
    const b = mesh(new THREE.CylinderGeometry(0.0055 * k + 0.002, 0.0055 * k + 0.002, 0.003, 24).rotateX(Math.PI / 2), Pm[col]); b.position.set(x, -ph * 0.28, 0.0035); b.userData.control = label; panel.add(b); return b;
  };
  const bRun = btn('green', -pw * 0.3, 'run'), bStop = btn('red', pw * 0.3, 'stop'), bDir = btn('yellow', 0, 'dir'); bDir.position.y = -ph * 0.44;
  const kn = new THREE.Group(); kn.position.set(0, -ph * 0.22, 0.002); panel.add(kn);
  const kb = mesh(new THREE.CylinderGeometry(0.009 * k + 0.002, 0.0095 * k + 0.002, 0.008, 32).rotateX(Math.PI / 2), Pm.dark); kb.position.z = 0.004; kn.add(kb);
  const kl = mesh(new THREE.BoxGeometry(0.0014, 0.006 * k + 0.002, 0.0006), Pm.white); kl.position.set(0, 0.004 * k + 0.001, 0.0083); kn.add(kl);
  for (const o of [kb, kl]) o.userData.control = 'knob';
  const label = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#16181a'; c.fillRect(0, 0, w, h); c.fillStyle = '#c8cccf'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.fillText(`${String(kW).replace('.', ',')} kW  3 × 400 V`, w / 2, 40); });
  const lab = mesh(new THREE.PlaneGeometry(W * 0.7, W * 0.7 / 4), new THREE.MeshStandardMaterial({ map: label.t, roughness: 0.6 })); lab.position.set(0, H * 0.2, fz + 0.0005); g.add(lab);
  const term = mesh(new THREE.BoxGeometry(W * 0.9, H * 0.12, 0.006), Pm.dark); term.position.set(0, H * 0.07, fz); g.add(term);
  let set = 0.6, f = 0, run = false, dir = 1;   // f ze znakiem: + przód (FWD), − wstecz (REV)
  // zasilanie z obwodu (power(v)) i zadawanie: 'panel' — pokrętło, 'ai' — wejście analogowe 0–10 V (ai(v))
  let powered = true, ref = 'panel', ain = 0;
  // sterowanie: 'panel' — RUN / STOP / FWD-REV na panelu, 'terminal' — wejścia cyfrowe DI1 (praca w przód) i DI2
  // (praca wstecz) ze sterowania dwuprzewodowego; ochrona przed samoczynnym startem: po włączeniu zasilania albo
  // STOP z panelu praca rusza dopiero po zdjęciu sygnału (oba wejścia nieaktywne) i ponownym podaniu
  let ctrl = 'panel', di1 = false, di2 = false, armed = false, boot = 0;   // boot: rozruch po włączeniu zasilania (0,5 s)
  const draw = () => {
    const c = disp.c.getContext('2d'); c.fillStyle = '#0b1a10'; c.fillRect(0, 0, 256, 96);
    if (!powered) { c.fillStyle = '#050806'; c.fillRect(0, 0, 256, 96); disp.t.needsUpdate = true; return; }   // bez zasilania — wyświetlacz ciemny
    c.fillStyle = run ? '#5dff8a' : '#2f8a4a'; c.font = 'bold 60px monospace'; c.textAlign = 'right'; c.textBaseline = 'middle';
    c.fillText(Math.abs(f).toFixed(1), 196, 50); c.font = 'bold 26px monospace'; c.fillText('Hz', 248, 62);
    c.font = '18px monospace'; c.textAlign = 'left'; c.fillText(run ? 'RUN' : 'STOP', 8, 20); c.fillText(dir > 0 ? 'FWD' : 'REV', 8, 88);
    if (ref === 'ai') c.fillText('AI', 8, 54);
    if (ctrl === 'terminal') { c.fillText('TERM', 60, 20); if (!armed && (di1 || di2)) { c.fillStyle = '#ffb04a'; c.fillText('BLOK', 60, 88); } }
    disp.t.needsUpdate = true;
  };
  const apply = () => { kn.rotation.z = -(-135 + 270 * set) * Math.PI / 180; };
  apply(); draw();
  let last = '';
  const api = {
    get f() { return f; }, get set() { return (ref === 'ai' ? ain / 10 : set) * fmax; }, get run() { return run; }, get dir() { return dir; },
    get powered() { return powered; }, get ref() { return ref; }, get ain() { return ain; },
    get ctrl() { return ctrl; }, get di() { return [di1, di2]; }, get armed() { return armed; },
    control(m) { ctrl = m === 'terminal' ? 'terminal' : 'panel'; armed = false; last = ''; },
    inputs(a, b) { di1 = !!a; di2 = !!b; },
    // power(v): utrata zasilania — wyjście wyłączone od razu (silnik wybiega), po powrocie STOP (nowe polecenie RUN)
    power(v) { v = !!v; if (v === powered) return; powered = v; armed = false; boot = v ? ELEC.inverter.boot : 0; if (!v) { run = false; f = 0; } last = ''; draw(); },
    reference(r) { ref = r === 'ai' ? 'ai' : 'panel'; last = ''; }, ai(v) { ain = Math.max(0, Math.min(10, v)); },
    press(c) { if (!powered) return; const term = ctrl === 'terminal'; if (c === 'run' && !term) run = true; if (c === 'stop') { run = false; armed = false; } if (c === 'dir' && !term) dir = -dir; if (c === 'run' || c === 'stop' || c === 'dir') { const b = c === 'run' ? bRun : c === 'stop' ? bStop : bDir; b.position.z = 0.002; setTimeout(() => { b.position.z = 0.0035; }, 160); } },
    release() {}, drag(c, dy) { if (c === 'knob') { set = Math.max(0, Math.min(1, set - dy / 300)); apply(); } },
    tick(dt) {
      if (!powered) return;
      if (boot > 0) { boot -= dt; return; }   // rozruch: wejścia czytane dopiero po nim
      if (ctrl === 'terminal') {   // DI1 xor DI2 — praca (oba naraz: stop), DI2 — wstecz
        if (!di1 && !di2) armed = true;
        run = armed && di1 !== di2; if (run) dir = di2 ? -1 : 1;
      }
      const target = run ? dir * (ref === 'ai' ? ain / 10 : set) * fmax : 0, step = fmax / Math.max(0.1, ramp) * dt;
      f = Math.abs(target - f) <= step ? target : f + Math.sign(target - f) * step;
      const s = f.toFixed(1) + run + dir + ref + ctrl + armed + di1 + di2; if (s !== last) { last = s; draw(); }
    },
  };
  Object.assign(g.userData, { elec: { ...ELEC.inverter, kW, fmax }, kW, fmax, ramp, mass: 1.4 * k * k * k, api });
  return g;
}

/* ---------------- grzybek bezpieczeństwa (awaryjne zatrzymanie) ---------------- */
// czerwony grzybek Ø 40 mm na żółtej obudowie; wciśnięcie — zatrzaskuje się (styk NC otwarty), kolejne kliknięcie —
// odblokowanie obrotem (grzybek obraca się i wraca)
export function eStop({ contacts = '1NC' } = {}) {
  const Pm = plastics(), g = new THREE.Group();
  const box = enclosure({ w: 0.08, h: 0.08, d: 0.07, mat: 'yellow' }); g.add(box);
  const f = box.userData.front, pivot = new THREE.Group(); pivot.position.copy(f); g.add(pivot);
  const ring = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#e8c21c'; c.beginPath(); c.arc(128, 128, 126, 0, TAU); c.fill(); c.fillStyle = '#111'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.fillText('STOP', 128, 32); c.fillText('AWARYJNY', 128, 236); });
  const pl = mesh(new THREE.CircleGeometry(0.03, 48), new THREE.MeshStandardMaterial({ map: ring.t, roughness: 0.5 })); pl.position.z = 0.0004; pivot.add(pl);
  const coll = mesh(new THREE.CylinderGeometry(0.0145, 0.016, 0.012, 32).rotateX(Math.PI / 2), Pm.black); coll.position.z = 0.006; pivot.add(coll);
  const cap = new THREE.Group(); pivot.add(cap);
  const head = mesh(new THREE.SphereGeometry(0.02, 40, 16, 0, TAU, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.5), Pm.red); head.position.z = 0.016; cap.add(head);
  const rim = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.004, 40).rotateX(Math.PI / 2), Pm.red); rim.position.z = 0.014; cap.add(rim);
  const arrow = mesh(new THREE.BoxGeometry(0.012, 0.0016, 0.0008), Pm.white); arrow.position.set(0, 0.012, 0.0215); arrow.rotation.z = 0.3; cap.add(arrow);
  for (const o of [head, rim, arrow]) o.userData.control = 'estop';
  let latched = false, depth = 0, twist = 0;
  const api = {
    get latched() { return latched; }, get closed() { return !latched; },
    press(c) { if (c !== 'estop') return; if (latched) { latched = false; twist = 0.6; } else latched = true; },
    release() {}, drag() {},
    tick(dt) { const t = latched ? 0.005 : 0; depth += (t - depth) * Math.min(1, dt * 25); cap.position.z = -depth; twist = Math.max(0, twist - dt * 1.5); cap.rotation.z = -Math.sin(twist * Math.PI / 0.6) * 0.5; },
  };
  Object.assign(g.userData, { elec: { contacts: contacts === '2NC' ? { '11-12': 'NC', '21-22': 'NC' } : contacts === '1NC1NO' ? { '11-12': 'NC', '23-24': 'NO' } : { '11-12': 'NC' } }, contacts, mass: 0.2, api });
  return g;
}

/* ---------------- lampka sygnalizacyjna ---------------- */
export function pilotLamp({ color = 'green', volts = '24DC' } = {}) {
  const Pm = plastics(), g = new THREE.Group();
  const box = enclosure({ w: 0.07, h: 0.07, d: 0.065 }); g.add(box);
  const f = box.userData.front, pivot = new THREE.Group(); pivot.position.copy(f); g.add(pivot);
  const bezel = mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.006, 40).rotateX(Math.PI / 2), Pm.chrome); bezel.position.z = 0.003; pivot.add(bezel);
  const lm = (Pm[color] || Pm.green).clone(); lm.transparent = true; lm.opacity = 0.85; lm.roughness = 0.15; lm.emissive = lm.color.clone(); lm.emissiveIntensity = 0;
  const lens = mesh(new THREE.SphereGeometry(0.0115, 32, 12, 0, TAU, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.55), lm); lens.position.z = 0.006; pivot.add(lens);
  lens.userData.control = 'lamp';
  const light = new THREE.PointLight(lm.color.getHex(), 0, 0.4, 2); light.position.z = 0.02; pivot.add(light);
  let on = false, glow = 0;
  // power(v) — napięcie z obwodu (0…1 względem znamionowego); klik w soczewkę — test lampki (bez obwodu)
  let pw = 0;
  const api = { get on() { return on || pw > 0.5; }, power(v) { pw = v; }, press(c) { if (c === 'lamp') on = !on; }, release() {}, drag() {},
    tick(dt) { glow += ((on ? 1 : Math.min(1, pw * pw)) - glow) * Math.min(1, dt * 20); lm.emissiveIntensity = 2.2 * glow; light.intensity = 0.25 * glow; } };
  Object.assign(g.userData, { elec: { ...ELEC.lamp, ...parseVolts(volts) }, color, volts, mass: 0.06, api });
  return g;
}

/* ---------------- przełącznik wyboru ---------------- */
// 22 mm z rączką; pozycje: '0-I' (90°), 'I-0-II' (po 45° w lewo i w prawo); powrót sprężyną do 0 (opcja)
export function selector({ positions = 'I-0-II', spring = false, handle = 'short' } = {}) {
  const Pm = plastics(), g = new THREE.Group(), three = positions === 'I-0-II';
  const box = enclosure({ w: 0.07, h: 0.07, d: 0.065 }); g.add(box);
  const f = box.userData.front, pivot = new THREE.Group(); pivot.position.copy(f); g.add(pivot);
  const plate = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#16181a'; c.fillRect(0, 0, w, h); c.fillStyle = '#eee'; c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (three) { c.fillText('I', 56, 56); c.fillText('0', 128, 30); c.fillText('II', 200, 56); } else { c.fillText('0', 76, 40); c.fillText('I', 196, 76); }
  });
  const pl = mesh(new THREE.PlaneGeometry(0.036, 0.036), new THREE.MeshStandardMaterial({ map: plate.t, roughness: 0.5 })); pl.position.z = 0.0003; pivot.add(pl);
  const bezel = mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.006, 40).rotateX(Math.PI / 2), Pm.chrome); bezel.position.z = 0.003; pivot.add(bezel);
  const kn = new THREE.Group(); kn.position.z = 0.006; pivot.add(kn);
  const disc = mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.005, 32).rotateX(Math.PI / 2), Pm.black); disc.position.z = 0.0025; kn.add(disc);
  const hl = handle === 'long' ? 0.03 : 0.02, hnd = mesh(new THREE.BoxGeometry(0.0075, hl, 0.011), Pm.black); hnd.position.z = 0.009; kn.add(hnd);
  const mk = mesh(new THREE.BoxGeometry(0.0015, 0.006, 0.0006), Pm.white); mk.position.set(0, hl / 2 - 0.004, 0.0148); kn.add(mk);
  for (const o of [disc, hnd, mk]) o.userData.control = 'selector';
  const P = three ? [['I', Math.PI / 4], ['0', 0], ['II', -Math.PI / 4]] : [['0', Math.PI / 4], ['I', -Math.PI / 4]];
  let idx = three ? 1 : 0, ang = P[idx][1], down = false, side = 2;
  // klik: trójpołożeniowy przechodzi zawsze przez 0 (0 → I → 0 → II → 0 …), nie przeskakuje z I na II
  const api = {
    get pos() { return P[idx][0]; },
    set pos(v) { const i = P.findIndex((p) => p[0] === v); if (i >= 0) idx = i; },
    press(c) { if (c !== 'selector') return; down = true; if (!three) idx = 1 - idx; else if (idx !== 1) { side = idx; idx = 1; } else idx = side === 0 ? 2 : 0; },
    release() { down = false; if (spring) idx = three ? 1 : 0; }, drag() {},
    tick(dt) { ang += (P[idx][1] - ang) * Math.min(1, dt * 18); kn.rotation.z = ang; },
  };
  Object.assign(g.userData, { elec: { contacts: three ? { '13-14': 'I', '23-24': 'II' } : { '13-14': 'I' } }, positions, spring, mass: 0.08, api });
  return g;
}

/* ---------------- wyłącznik krańcowy ---------------- */
// korpus z odlewu (aluminium, malowany), głowica z dźwignią i rolką albo popychaczem; styki 1NO + 1NC
export function limitSwitch({ actuator = 'roller' } = {}) {
  const Pm = plastics(), M = materials(), g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(0.031, 0.065, 0.03), Pm.yellow); body.position.set(0, 0.0325, 0.015); g.add(body);
  const cover = mesh(new THREE.BoxGeometry(0.029, 0.04, 0.002), Pm.dark); cover.position.set(0, 0.03, 0.031); g.add(cover);
  const gland = mesh(new THREE.CylinderGeometry(0.007, 0.008, 0.012, 16), Pm.black); gland.position.set(0, -0.006, 0.015); g.add(gland);
  const head = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 24).rotateX(Math.PI / 2), M.alu); head.position.set(0, 0.075, 0.015); g.add(head);
  const arm = new THREE.Group(); arm.position.set(0, 0.075, 0.027); g.add(arm);
  let parts;
  if (actuator === 'roller') {
    const lever = mesh(new THREE.BoxGeometry(0.004, 0.04, 0.003), M.steel); lever.position.y = 0.02; arm.add(lever);
    const roll = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 24).rotateZ(Math.PI / 2), Pm.black); roll.position.set(0, 0.04, 0); arm.add(roll);
    parts = [lever, roll];
  } else {
    const pl = mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.016, 16), M.steel); pl.position.y = 0.008; arm.position.set(0, 0.083, 0.015); arm.add(pl);   // popychacz wychodzi z głowicy
    const tip = mesh(new THREE.SphereGeometry(0.004, 12, 8), M.steel); tip.position.y = 0.016; arm.add(tip); parts = [pl, tip];
  }
  for (const o of parts) o.userData.control = 'actuator';
  let down = false, a = 0;
  const api = { get actuated() { return down; }, press(c) { if (c === 'actuator') down = true; }, release() { down = false; }, drag() {},
    tick(dt) { a += ((down ? 1 : 0) - a) * Math.min(1, dt * 25); if (actuator === 'roller') arm.rotation.z = -0.5 * a; else arm.position.y = 0.083 - 0.004 * a; } };
  Object.assign(g.userData, { actuator, mass: 0.16, api });
  return g;
}

/* ---------------- stycznik ---------------- */
// na szynie DIN 35 mm; cewka 24 V DC albo 230 V AC; styki główne 3 × NO (AC-3) + pomocniczy; klik w okienko — test
// (jak zasilona cewka): kotwica i wskaźnik przesuwają się
export function contactor({ amps = 12, coil = '230AC', aux = '1NO' } = {}) {
  const Pm = plastics(), M = materials(), g = new THREE.Group(), w = amps > 18 ? 0.054 : 0.045;
  const rail = mesh(new THREE.BoxGeometry(0.16, 0.035, 0.0075), M.steel); rail.position.set(0, 0.0175, 0.00375); g.add(rail);
  const body = mesh(new THREE.BoxGeometry(w, 0.082, 0.07), Pm.grey); body.position.set(0, 0.041, 0.0425); g.add(body);
  const front = mesh(new THREE.BoxGeometry(w * 0.86, 0.04, 0.016), Pm.grey); front.position.set(0, 0.041, 0.0855); g.add(front);
  for (const y of [0.0065, 0.0755]) for (let i = 0; i < 3; i++) { const sc = mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.002, 12).rotateX(Math.PI / 2), M.steel); sc.position.set((i - 1) * w * 0.3, y, 0.0778); g.add(sc); }
  const lab = canvasTex(256, 128, (c, ww, hh) => { c.fillStyle = '#d4d4cc'; c.fillRect(0, 0, ww, hh); c.fillStyle = '#111'; c.font = 'bold 24px sans-serif'; c.textAlign = 'center'; c.fillText(`AC-3 ${amps} A`, 128, 40); c.font = '20px sans-serif'; c.fillText(coil === '230AC' ? 'cewka 230 V AC' : 'cewka 24 V DC', 128, 76); c.fillText('1 3 5  →  2 4 6', 128, 108); });
  const lh = Math.min(w * 0.4, 0.017), lb = mesh(new THREE.PlaneGeometry(w * 0.8, lh), new THREE.MeshStandardMaterial({ map: lab.t, roughness: 0.6 })); lb.position.set(0, 0.022 + lh / 2, 0.0942); g.add(lb);   // mieści się na froncie (0,021…0,061)   // tabliczka 0,7 mm przed frontem — bez migotania
  const win = mesh(new THREE.BoxGeometry(0.012, 0.012, 0.0015), Pm.black); win.position.set(0, 0.055, 0.0938); g.add(win);
  const ind = mesh(new THREE.BoxGeometry(0.008, 0.004, 0.002), Pm.yellow); ind.position.set(0, 0.058, 0.0945); g.add(ind);
  for (const o of [win, ind, front]) o.userData.control = 'test';
  let coilOn = false, test = false, a = 0;
  // coil(v) — stan kotwicy z obwodu (cewka zasilona); klik w okienko — ręczne wciśnięcie kotwicy (test)
  const api = { get on() { return coilOn || test; }, get test() { return test; }, coil(v) { coilOn = !!v; }, press(c) { if (c === 'test') test = !test; }, release() {}, drag() {},
    tick(dt) { a += ((coilOn || test ? 1 : 0) - a) * Math.min(1, dt * 30); ind.position.y = 0.058 - 0.006 * a; } };
  Object.assign(g.userData, { elec: { ...ELEC.contactor, coilU: parseVolts(coil).U, coilKind: parseVolts(coil).kind, In: amps, contacts: { '1-2': 'NO', '3-4': 'NO', '5-6': 'NO', ...(aux === '1NC' ? { '21-22': 'NC' } : { '13-14': 'NO' }) } }, amps, coil, aux, mass: amps > 18 ? 0.55 : 0.36, api });
  return g;
}

/* ---------------- przewód ---------------- */
// linka H07V-K (Cu): izolacja PVC w kolorze, końce odizolowane z tulejkami (kolory tulejek DIN 46228-4)
export const WIRE_COLORS = { brown: ['#7a4a26', 'brązowy (L1)'], black: ['#1b1b1d', 'czarny (L2)'], grey: ['#7d8085', 'szary (L3)'], blue: ['#1f56b0', 'niebieski (N)'], pe: ['#2f9a3f', 'żółto-zielony (PE)'], red: ['#c8221c', 'czerwony (+ DC)'], dblue: ['#14306b', 'granatowy (− DC)'], white: ['#ececec', 'biały (sterowanie)'] };
const FERRULE = { 0.5: 0xf2f2f2, 0.75: 0x9a9da2, 1: 0xd8302a, 1.5: 0x1b1b1d, 2.5: 0x2a5fc0, 4: 0x8a8d92, 6: 0xe8c21c, 10: 0xd8302a, 16: 0x2a5fc0 };
export function wire({ mm2 = 1.5, color = 'brown', len = 0.5 } = {}) {
  const M = materials(), g = new THREE.Group();
  const dCu = 2 * Math.sqrt(mm2 / Math.PI) / 1000, dIns = dCu * 1.35 + 0.0016;
  const L = Math.max(0.1, len), span = Math.min(L * 0.75, 0.6);
  // łuk w płaszczyźnie (x, y): końce na stole, środek uniesiony — długość krzywej ≈ L
  const sag = Math.sqrt(Math.max(0, (L * L - span * span))) * 0.42;
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-span / 2, 0, 0), new THREE.Vector3(-span / 4, sag * 0.8, 0.02), new THREE.Vector3(0, sag, 0), new THREE.Vector3(span / 4, sag * 0.8, -0.02), new THREE.Vector3(span / 2, 0, 0)]);
  const RS = 12, tg = new THREE.TubeGeometry(curve, 64, dIns / 2, RS, false), pe = color === 'pe';
  const ins = new THREE.MeshStandardMaterial({ color: pe ? 0xffffff : (WIRE_COLORS[color] || WIRE_COLORS.brown)[0], roughness: 0.5, vertexColors: pe });
  if (pe) {   // żółto-zielony: dwa zielone paski wzdłuż przewodu na żółtej izolacji (kolor wierzchołków po obwodzie)
    const n = tg.attributes.position.count, col = new Float32Array(n * 3), Yc = new THREE.Color('#d8c21c'), Gc = new THREE.Color('#2f9a3f');
    for (let i = 0; i < n; i++) { const j = i % (RS + 1), c = (j % 6) < 3 ? Gc : Yc; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const tube = new THREE.Mesh(tg, ins); tube.castShadow = true; g.add(tube);
  for (const s of [-1, 1]) {   // tulejki na końcach
    const p = curve.getPoint(s < 0 ? 0 : 1), t = curve.getTangent(s < 0 ? 0 : 1).multiplyScalar(s < 0 ? -1 : 1);
    const fe = new THREE.Group(); fe.position.copy(p); fe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), t); g.add(fe);
    const col = mesh(new THREE.CylinderGeometry(dIns / 2 + 0.0006, dIns / 2 + 0.0004, 0.006, 16), new THREE.MeshStandardMaterial({ color: FERRULE[mm2] ?? 0x888888, roughness: 0.4 })); col.position.y = 0.003; fe.add(col);
    const tb = mesh(new THREE.CylinderGeometry(dCu / 2 + 0.0003, dCu / 2 + 0.0003, 0.01, 12), M.steel); tb.position.y = 0.011; fe.add(tb);
  }
  const R = 0.0178 * L / mm2;   // Ω (Cu, 20 °C)
  Object.assign(g.userData, { mm2, color, len: L, R, dIns, mass: L * (mm2 * 8.9e-3 + Math.PI * (dIns * dIns - dCu * dCu) / 4 * 1400) });
  return g;
}

/* ---------------- kabel wielożyłowy ---------------- */
// przewód w powłoce (np. 5G2,5 — 5 żył po 2,5 mm², z żółto-zieloną): powłoka PVC wzdłuż krzywej przez punkty
// (w układzie rodzica), średnica z żył: d_żyły = 2√(S/π)·1,35 + 1,6 mm, pęk ≈ 2,2–2,6 d_żyły, powłoka 1 mm
export function cable({ points, cores = 5, mm2 = 2.5, color = 'grey', name } = {}) {
  const pts = points.map((p) => p.clone()), curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const dCore = 2 * Math.sqrt(mm2 / Math.PI) / 1000 * 1.35 + 0.0016, D = dCore * (cores <= 2 ? 2 : cores === 3 ? 2.16 : cores === 4 ? 2.42 : 2.7) + 0.002;
  const L = curve.getLength(), seg = Math.max(16, Math.round(L / 0.01));
  const mat = new THREE.MeshStandardMaterial({ color: color === 'black' ? 0x1c1d1f : color === 'orange' ? 0xd86a1c : 0x8f9396, roughness: 0.62 });
  const g = new THREE.Group(); g.name = name || `Przewód ${cores}×${String(mm2).replace('.', ',')} mm²`;
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, D / 2, 14, false), mat); tube.castShadow = true; g.add(tube);
  for (const t of [0, 1]) {   // dławiki na końcach (wejście do urządzenia)
    const p = curve.getPoint(t), d = curve.getTangent(t);
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(D / 2 + 0.0025, D / 2 + 0.0035, 0.012, 6), new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.5 }));
    gl.position.copy(p); gl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.add(gl);
  }
  const R = 0.0178 * L / mm2;   // Ω na żyłę (Cu, 20 °C)
  Object.assign(g.userData, { cores, mm2, len: L, D, R, mass: L * (cores * mm2 * 8.9e-3 + Math.PI * D * 0.001 * 1400) });
  return g;
}

/* ---------------- umowne źródło zasilania ---------------- */
// blok z gniazdami wyjściowymi, wyłącznikiem i wyświetlaczem (AC: przebieg sinusoidy, DC: wartość); umowne — nie model
// konkretnego urządzenia, tylko „skąd bierze się prąd” w maszynie
export function powerSource({ kind = 'AC', volts = 230, phases = 1, hz = 50, amps = 16 } = {}) {
  const Pm = plastics(), M = materials(), g = new THREE.Group(), ac = kind === 'AC';
  const body = mesh(new THREE.BoxGeometry(0.16, 0.1, 0.12), ac ? Pm.dark : Pm.blue); body.position.set(0, 0.05, 0.06); g.add(body);
  const face = mesh(new THREE.BoxGeometry(0.15, 0.09, 0.002), Pm.black); face.position.set(0, 0.05, 0.1205); g.add(face);
  const disp = canvasTex(256, 112, () => {});
  const dm = new THREE.MeshStandardMaterial({ map: disp.t, emissive: 0xffffff, emissiveMap: disp.t, emissiveIntensity: 0.9, roughness: 0.3 });
  const scr = mesh(new THREE.PlaneGeometry(0.085, 0.037), dm); scr.position.set(-0.025, 0.07, 0.1223); g.add(scr);
  const sw = new THREE.Group(); sw.position.set(0.05, 0.072, 0.1215); g.add(sw);
  const swb = mesh(new THREE.BoxGeometry(0.018, 0.026, 0.006), Pm.black); swb.position.z = 0.003; sw.add(swb);
  const rocker = mesh(new THREE.BoxGeometry(0.014, 0.022, 0.006), Pm.red); rocker.position.z = 0.007; sw.add(rocker);
  for (const o of [swb, rocker]) o.userData.control = 'power';
  const terms = ac ? (phases === 3 ? ['L1', 'L2', 'L3', 'N', 'PE'] : ['L', 'N', 'PE']) : ['+', '−'];
  const tcol = { L1: 0x7a4a26, L2: 0x1b1b1d, L3: 0x7d8085, L: 0x7a4a26, N: 0x1f56b0, PE: 0x2f9a3f, '+': 0xc8221c, '−': 0x14306b };
  terms.forEach((t, i) => {
    const x = -0.06 + i * (0.12 / Math.max(1, terms.length - 1)) * (terms.length > 1 ? 1 : 0);
    const sock = mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.008, 20).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: tcol[t], roughness: 0.4 })); sock.position.set(x, 0.022, 0.124); g.add(sock);
    const hole = mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.0012, 12).rotateX(Math.PI / 2), M.steel); hole.position.set(x, 0.022, 0.1285); g.add(hole);
  });
  const lab = canvasTex(512, 48, (c, w, h) => { c.fillStyle = '#0d0e10'; c.fillRect(0, 0, w, h); c.fillStyle = '#c8cccf'; c.font = 'bold 26px sans-serif'; c.textAlign = 'left'; c.fillText(terms.join('     '), 24, 34); });
  const lb = mesh(new THREE.PlaneGeometry(0.15, 0.014), new THREE.MeshStandardMaterial({ map: lab.t, roughness: 0.6 })); lb.position.set(0, 0.038, 0.1223); g.add(lb);   // podpis gniazd 0,8 mm przed panelem
  let on = false, t = 0, last = -1;
  const draw = () => {
    const c = disp.c.getContext('2d'); c.fillStyle = '#071017'; c.fillRect(0, 0, 256, 112);
    c.fillStyle = on ? '#7fd8ff' : '#2c5566'; c.font = 'bold 30px monospace'; c.textAlign = 'left';
    c.fillText(ac ? `${volts} V ~${hz} Hz` : `${volts.toFixed(1)} V =`, 8, 34);
    c.font = '18px monospace'; c.fillText(on ? `WŁ  maks. ${amps} A` : 'WYŁ', 8, 104);
    if (ac && on) {   // przebieg: ćwierć sekundy przewija się w czasie (umownie zwolniony 25 ×)
      for (let ph = 0; ph < phases; ph++) {
        c.strokeStyle = ['#ffb066', '#9fe8ff', '#d0d0d0'][ph]; c.lineWidth = 2; c.beginPath();
        for (let x = 0; x < 240; x++) { const y = 66 - 18 * Math.sin(TAU * (x / 120 - t * hz / 25) - ph * TAU / 3); x ? c.lineTo(8 + x, y) : c.moveTo(8, y); }
        c.stroke();
      }
    } else if (!ac && on) { c.strokeStyle = '#9fe8ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(8, 60); c.lineTo(248, 60); c.stroke(); }
    disp.t.needsUpdate = true;
  };
  draw();
  const api = { get on() { return on; }, press(c) { if (c === 'power') { on = !on; draw(); } }, release() {}, drag() {},
    tick(dt) { t += dt; rocker.rotation.x = on ? -0.25 : 0.25; if (ac && on && Math.floor(t * 15) !== last) { last = Math.floor(t * 15); draw(); } } };
  Object.assign(g.userData, { elec: { U: volts, f: kind === 'AC' ? hz : 0, phases, In: amps, system: kind === 'AC' && phases === 3 ? 'TN-S' : kind, Uph: kind === 'AC' && phases === 3 ? volts / Math.sqrt(3) : volts }, kind, volts, phases, hz, amps, mass: 2.5, api });
  return g;
}

export const ControlKit = { enclosure, switchUnit, potentiometer, pushButton, inverter, eStop, pilotLamp, selector, limitSwitch, contactor, wire, cable, powerSource, plastics, BUTTON_COLORS, WIRE_COLORS, ELEC };
