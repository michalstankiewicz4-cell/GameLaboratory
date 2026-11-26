// Items Lab — deformation mode (from Tornado.io's deformation lab): steel 200 l drums as DeformKit shells
// (js/behaviors/land/deform/) under steel press blocks. The barrel is JunkKit's model (it knows nothing of the
// deformation); its sparse shell comes from its data (info.shell → js/models/junkyard/shells.js).
// Two set-ups (rigs.js): the board (five barrels, each under its own press) and the container (seven barrels in two
// layers, one press). The press speed from zero (cm/s); lift the presses; start over; the walls' opacity; the colliders
// (preview.js); a click grabs a barrel (grab.js). Fixed physics step, in step with the barrels' threads.
//   createDeformMode({ scene, camera, canvas, orbit, ui }) → { enter(), leave(), frame(dt), cams, api }
//   ui: { $, el, status, save, S } — the lab's helpers and state (S.dScene, S.dSpeed, S.dAlpha, S.dDebug)
import * as THREE from '../../../../vendor/three/three.module.js';
import { makeMaterial, PRESETS } from '../../../render/materials/matkit.js';
import { applyTextures } from '../../../models/junkyard/textures.js';
import { buildRigs, GAP, CR } from './rigs.js';
import { createPreview } from './preview.js';
import { createGrab } from './grab.js';

const H = 1 / 60;      // fixed physics step (the sheet behaves the same at any frame rate)
const LIFT = 0.2;      // lifting the presses: 20 cm/s
export const SCENES = { board: 'Board', container: 'Container' };
export const INFO = {
  board: 'Steel 200 l drums (1 mm sheet, Ø 572 mm, 880 mm tall) under steel press blocks: upright, tilted 23°, 45° and 68° (in concrete cradles) and on its side (between wedges). The press speed sets how fast the blocks come down — from zero, when they stand.',
  container: 'An open container (inside 2.2 × 1.3 m, walls 1.6 m) with seven drums in two layers: upright, lying across and along; the upper ones lie on the lower and tilt as they fell. One press for the whole container crushes the upper layer into the lower; Walls sets how see-through the container is.',
};
const CAMS = {
  board: { Board: { yaw: 0.35, pitch: 0.32, dist: 13, t: [0, 0.6, 0] }, Upright: { yaw: 0.6, pitch: 0.2, dist: 3.4, t: [-2 * GAP, 0.5, 0] }, '23°': { yaw: 0.6, pitch: 0.2, dist: 3.4, t: [-GAP, 0.5, 0] },
    '45°': { yaw: 0.6, pitch: 0.2, dist: 3.4, t: [0, 0.5, 0] }, '68°': { yaw: 0.6, pitch: 0.2, dist: 3.4, t: [GAP, 0.5, 0] }, 'On its side': { yaw: 0.6, pitch: 0.2, dist: 3.4, t: [2 * GAP, 0.4, 0] } },
  container: { Container: { yaw: 0.55, pitch: 0.42, dist: 5.2, t: [0, 0.8, 0] }, Side: { yaw: 0, pitch: 0.12, dist: 4.6, t: [0, 0.8, 0] }, 'From above': { yaw: 0, pitch: 1.35, dist: 4.4, t: [0, 0.6, 0] } },
};
const overlap = (a, b, e) => a[0] - e < b[3] && b[0] - e < a[3] && a[1] - e < b[4] && b[1] - e < a[4] && a[2] - e < b[5] && b[2] - e < a[5];

export function createDeformMode({ scene, camera, canvas, orbit, ui }) {
  const { S, $, el, status, save } = ui;
  const holder = new THREE.Group(); holder.visible = false; scene.add(holder);
  let mats = null, barrel = null, set = { rigs: [], presses: [], walls: [] }, lifting = false, acc = 0, statT = 0, active = false;
  const preview = createPreview(scene), grab = createGrab(camera, canvas);

  async function ready() {
    if (!barrel) barrel = await import('../../../models/junkyard/items/barrel.js');
    if (!mats) mats = {
      steel: makeMaterial(PRESETS.plate, { res: 512 }).material,
      concrete: makeMaterial(PRESETS.concrete, { res: 512 }).material,
      paint: makeMaterial({ ...PRESETS.hull, color: '#2f5d8a', color2: '#1d3a57', tile: 2 }, { res: 512 }).material,
    };
  }
  function dispose() {
    for (const r of set.rigs) r.shell.dispose();
    holder.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });   // geometry per build; the materials are shared (MatKit, JunkKit)
    holder.clear(); set = { rigs: [], presses: [], walls: [] }; lifting = false; grab.release();
  }
  function build() {
    dispose();
    set = buildRigs(S.dScene, { holder, barrel, mats });
    for (const r of set.rigs) r.model.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    applyTextures(); applyAlpha(); preview.build(set, S.dDebug); stats();
  }
  function applyAlpha() {
    const p = mats.paint, a = S.dAlpha, see = a < 0.999;
    if (p.transparent !== see) { p.transparent = see; p.needsUpdate = true; }
    p.opacity = a; p.depthWrite = !see;
    holder.traverse((o) => { if (o.userData.wall) o.castShadow = a > 0.5; });
  }
  const topY = () => Math.max(...set.rigs.map((r) => r.shell.bounds()[1]));
  function simStep(h) {
    const v = S.dSpeed / 100;   // cm/s → m/s
    for (const P of set.presses) {
      P.moving = lifting ? P.y < P.y0 : v > 0 && P.y > P.stop;
      if (P.moving) { P.y = lifting ? Math.min(P.y0, P.y + LIFT * h) : Math.max(P.stop, P.y - v * h); P.box.set(P.matrix(P)); P.mesh.matrix.copy(P.box.matrix); }
      else P.box.set(P.box.matrix);   // standing: the previous place = this one (friction without sliding)
    }
    if (lifting && set.presses.every((P) => P.y >= P.y0)) { lifting = false; api.speed(0); }   // up — they stand until the slider moves
    const rigs = set.rigs, many = rigs.length > 1 && rigs[0].press === rigs[1].press;   // the container: the barrels touch each other
    const boxes = many ? rigs.map((r) => r.shell.box()) : null, e = CR * 2 + 0.02;
    rigs.forEach((r, i) => {
      const P = r.press;
      if (P.moving && P.y < r.shell.bounds()[1] + 0.02) r.shell.wake();
      let others = null;
      if (many) {
        others = [];
        rigs.forEach((o, j) => { if (j !== i && overlap(boxes[i], boxes[j], e)) { others.push(o.shell.particles); if (o.shell.awake && !r.shell.awake) r.shell.wake(); } });
      }
      const pin = grab.pin(r); if (pin) r.shell.wake();
      // in the container the press pushes through other barrels — plasticity once it comes down onto them
      r.shell.step(h, { ground: r.ground, boxes: [P.box, ...r.supports], others, yield: many && P.moving && !lifting && P.y < topY() + 0.02, pin });
    });
  }
  function stats() {
    const rows = set.rigs.map((r) => { const s = r.shell.stats(); return [r.set.label, `${Math.round(s.crush * 100)} % · press ${(r.press.y * 100).toFixed(0)} cm`]; });
    $('dStats').replaceChildren(...rows.flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: b })]));
    const s0 = set.rigs[0] ? set.rigs[0].shell.stats() : null;
    if (window.LabPerf && s0) window.LabPerf.modelRows([['Barrels', String(set.rigs.length)], ['Particles per barrel', s0.particles.toLocaleString('en')], ['Constraints per barrel', s0.constraints.toLocaleString('en')], ['Computing now', set.rigs.filter((r) => r.shell.awake).length + ' / ' + set.rigs.length]]);
    status(grab.current ? 'The barrel is stuck to the pointer — click to let go' : lifting ? 'The presses are going up' : S.dSpeed > 0 ? (set.presses.every((P) => P.y <= P.stop) ? 'The presses are down — “Lift the presses” or “Start over”' : 'The presses are coming down') : 'The presses stand — set the press speed');
  }
  function setCam(v) { Object.assign(orbit, { yaw: v.yaw, pitch: v.pitch, dist: v.dist }); orbit.target.set(...v.t); }
  function cams() {
    const C = CAMS[S.dScene];
    $('cams').replaceChildren(...Object.entries(C).map(([k, v]) => { const b = el('button', { type: 'button', textContent: k }); b.onclick = () => setCam(v); return b; }));
    setCam(Object.values(C)[0]);
  }
  function setScene(sc) {
    S.dScene = SCENES[sc] ? sc : 'board'; save();
    $('dScene').value = S.dScene; $('dAlphaRow').hidden = S.dScene !== 'container';
    $('itNote').textContent = INFO[S.dScene];
    build(); cams();
  }
  function lift() { lifting = true; set.rigs.forEach((r) => r.shell.wake()); }
  const fmtSpeed = (v) => (v ? `${v.toFixed(1)} cm/s` : 'stop'), fmtAlpha = (a) => `${Math.round(a * 100)} %`;

  /* ---------------- controls (window Deformation, the bar's set-up list) ---------------- */
  $('dScene').replaceChildren(...Object.entries(SCENES).map(([k, v]) => el('option', { value: k, textContent: v })));
  $('dScene').onchange = () => setScene($('dScene').value);
  $('dSpeed').value = S.dSpeed; $('dSpeedV').textContent = fmtSpeed(S.dSpeed);
  $('dSpeed').oninput = () => { S.dSpeed = +$('dSpeed').value; $('dSpeedV').textContent = fmtSpeed(S.dSpeed); save(); };
  $('dAlpha').value = S.dAlpha; $('dAlphaV').textContent = fmtAlpha(S.dAlpha);
  $('dAlpha').oninput = () => { S.dAlpha = +$('dAlpha').value; $('dAlphaV').textContent = fmtAlpha(S.dAlpha); applyAlpha(); save(); };
  $('dDebug').checked = S.dDebug;
  $('dDebug').onchange = () => { S.dDebug = $('dDebug').checked; save(); preview.build(set, S.dDebug); };
  $('dLift').onclick = () => lift();
  $('dReset').onclick = () => build();
  addEventListener('keydown', (e) => {
    if (!active || e.target.closest('input,select,textarea')) return;
    if (e.code === 'KeyR') build();
    if (e.code === 'KeyU') lift();
  });

  const api = {
    speed(v) { S.dSpeed = v; $('dSpeed').value = v; $('dSpeedV').textContent = fmtSpeed(v); save(); return v; },
    lift() { lift(); },
    scene(sc) { setScene(sc); return this.state(); },
    alpha(a) { S.dAlpha = a; $('dAlpha').value = a; $('dAlphaV').textContent = fmtAlpha(a); applyAlpha(); save(); return a; },
    reset() { build(); return this.state(); },
    state: () => set.rigs.map((r) => ({ set: r.set.label, press: +r.press.y.toFixed(3), stop: +r.press.stop.toFixed(3), ...r.shell.stats(), awake: r.shell.awake })),
    get rigs() { return set.rigs; },
    // run(seconds) → Promise: the steps one by one, each waiting for the barrels' threads
    async run(sec = 1) { for (let t = 0; t < sec; t += H) { simStep(H); await Promise.all(set.rigs.map((r) => r.shell.settled())); } return this.state(); },
  };

  return {
    api, cams, get grab() { return grab; },
    async enter() { active = true; await ready(); holder.visible = true; setScene(S.dScene); },
    leave() { active = false; dispose(); holder.visible = false; preview.build(null, false); status(''); },
    // a click (not a drag) on the view: grab or let go
    click(e) { if (grab.current) { grab.release(); status('Let go'); } else if (grab.pick(e, set.rigs)) status('The barrel is stuck to the pointer — click to let go'); },
    move(e) { grab.aim(e); },
    frame(dt) {
      // a new step only when every barrel has finished the last one (the press and the neighbours a barrel sees are always
      // from one step back); when the threads cannot keep up, the simulation slows down instead of drifting apart
      acc += dt; let n = 0;
      while (acc >= H && n < 3 && !set.rigs.some((r) => r.shell.pending)) { simStep(H); acc -= H; n++; }
      if (acc > H) acc = H;   // no catching up
      if ((statT += dt) > 0.25) { statT = 0; stats(); }
      preview.sync(grab.current);
    },
  };
}
