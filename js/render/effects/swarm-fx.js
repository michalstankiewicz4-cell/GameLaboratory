// Efekty roju i sceny z Hive Hunger podpięte jako zwykłe efekty: laser, promień przebijacza, błyskawica burzy,
// promień ściągający, promień tnący, pole siłowe, skok w nadprzestrzeń, znacznik, tunel, fala skanu.
// W grze to metody roju (Swarm3D: tablice położeń statków, celów, stanów) — tu gospodarz („rój” efektów) daje im
// te tablice: każdy grany efekt zajmuje jedno miejsce (statek), a jego położenia przychodzą z play(). Obliczenia
// w plikach z gry bez zmian. Liczby na klatkę 60 Hz; położenia w jednostkach efektu (root w effects.js).
import * as THREE from '../../../vendor/three/three.module.js';
import { Beams, makeBeams } from './beams.js';
import { TowBeams } from './tows.js';
import { CutterSheets } from './cutters.js';
import { ForceFields } from './fields.js';
import { Hyperspace } from './warp.js';
import { ClickMarker } from './marker.js';
import { Portal3D } from './portal.js';
import { Lightning3D } from './lightning.js';
import { ScanWaves } from './scan.js';

const MAX = 32;   // efektów jednego rodzaju naraz
const PIERCER_COLORS = { beamColors: ['rgba(110,40,0,1)', 'rgba(255,140,30,1)', 'rgba(255,240,200,1)'], hitColors: ['rgba(255,235,200,1)', 'rgba(255,140,40,0.9)', 'rgba(170,70,0,0.35)'] };

// liczby z Hive Hunger (js/config.js: swarm.laser, swarm.piercer, swarm.storm, swarm.tug, swarm.cutter, swarm.booster,
// swarm.warp, marker, portal) i ShipKit (fala skanu); `frames` — jak długo efekt trwa, gdy gra go laboratorium albo
// scena (w grze — póki statek strzela); `size`, `width`, `side`, `speed` — tego, czego w grze dostarcza rój
export const SWARM_DEFAULTS = {
  laser: { width: 0.5, hitSize: 1.4, frames: 60 },
  piercer: { width: 0.4, hitSize: 1.2, ...PIERCER_COLORS, spiralColor: 0xffe03a, spiralRadius: 0.22, spiralTurns: 0.64, spiralPoints: 10, spiralMaxLength: 90, flashEvery: 3, flashFrames: 5, glowPx: 4, frames: 90 },
  storm: { fork: 0.7, boltColor: 0x6fbaff, flashEvery: 4, flashFrames: 6, sideGlow: 0.6, side: 1, frames: 60 },
  tow: { beamColor: 0x3dff86, streaks: 14, outlineScale: 1.05, outlinePoints: 160, rimMax: 64, size: 2, frames: 150 },
  cutter: { apex: 0.12, hazeSpeed: 1, opacity: 0.85, sheetColor: 0xff2020, edgeColor: 0xff5a4a, width: 3, frames: 120 },
  field: { radius: 1.25, fieldColors: [0xff4fa8, 0xffb3e0], cells: 3, line: 0.05, opacity: 0.7, fill: 0.07, rim: 0.5, spin: 0.004, segments: 32, frames: 240 },
  warp: { frames: 40, accel: 1.16, maxSpeed: 4, trailFade: 25, width: 0.35, color: 0x3a8dff, streakColor: 0xb5ecff, streaks: 6, speed: 0.08 },
  marker: { color: 0x8fd0ff, radius: 1.6, opacity: 0.9, lift: 0.9, lifeFrames: 240, pulseSpeed: 0.12 },
  portal: { closedRadius: 0.7, openRadius: 4, openFrames: 50, closeFrames: 60, pulseFrames: 90, narrowing: 10, narrowFrames: 30, flare: 2.2, streaks: 35, fadeEnd: 0.2,
    color: 0x2f7dff, innerColor: 0x8fe0ff, rimColor: 0x1d46ff, coreColor: 0xd6f2ff, hitRadius: 2.5 },
  scan: { color: 0x4fe3c6, radius: 8, seconds: 1.7 },
};
export const SWARM_KINDS = {
  laser: { label: 'Laser', labelPl: 'Laser', needs: 'from, to' },
  piercer: { label: 'Piercer beam', labelPl: 'Promień przebijacza', needs: 'from, to' },
  storm: { label: 'Storm lightning', labelPl: 'Błyskawica burzy', needs: 'from, to' },
  tow: { label: 'Tractor beam', labelPl: 'Promień ściągający', needs: 'from, to' },
  cutter: { label: 'Cutting sheet', labelPl: 'Promień tnący', needs: 'from, to' },
  field: { label: 'Force field', labelPl: 'Pole siłowe', needs: 'at' },
  warp: { label: 'Hyperspace jump', labelPl: 'Skok w nadprzestrzeń', needs: 'from, dir' },
  marker: { label: 'Marker', labelPl: 'Znacznik', needs: 'at' },
  portal: { label: 'Subspace tunnel', labelPl: 'Tunel podprzestrzenny', needs: 'at' },
  scan: { label: 'Scan wave', labelPl: 'Fala skanu', needs: 'at' },
};

// „rój” dla metod z gry: położenia statków (pos), cele (beamTo), kto strzela (firing), kto jest ukryty (hidden)
function makeHost(root, cfg) {
  return { scene: root, cfg, count: MAX, pos: new Float32Array(MAX * 3), beamTo: new Float32Array(MAX * 3), firing: new Uint8Array(MAX),
    hidden: new Uint8Array(MAX).fill(1), kindStart: () => 0, stormClock: 0, disposeDrills() {} };
}
const across = (d) => new THREE.Vector3(Math.abs(d.y) < 0.9 ? 0 : 1, Math.abs(d.y) < 0.9 ? 1 : 0, 0).cross(d).normalize();

export function createSwarmEffects(root, S) {
  // step(camera, worldCamera): camera — położenie kamery w jednostkach efektu (promienie, znaczniki), worldCamera — w świecie (tunel)
  const cfg = { laser: S.laser, piercer: S.piercer, storm: S.storm, tug: S.tow, cutter: S.cutter, booster: S.field, warp: S.warp };
  const h = Object.assign(makeHost(root, cfg), Beams, TowBeams, CutterSheets, ForceFields, Hyperspace);
  // laser i przebijacz: pasy z blaskiem u celu (makeBeams); błyskawice przebijacza i burzy (Lightning3D)
  h.beams = makeBeams(MAX, S.laser); h.piercerBeams = makeBeams(MAX, S.piercer);
  root.add(h.beams.band, h.beams.hits, h.piercerBeams.band, h.piercerBeams.hits);
  h.piercerBolts = new Lightning3D(root, { life: S.piercer.flashFrames, jag: 0.02, pieces: 1, glowPx: S.piercer.glowPx }); h.piercerClock = 0; h.piercers = MAX;
  h.stormBolts = new Lightning3D(root, { life: S.storm.flashFrames, jag: 0.25, pieces: 4 });
  // holowanie: bryła jako chmura „bloków” na kuli (`size`) — obrys widziany z holownika
  h.towBeams = []; h.tows = [];
  const frag = { planet: { s: 0.5 }, fragOf: [], cells: [], exposedOf: (f) => f.cells, worldCenter: (k, out) => out.copy(frag.cells[k].f.pos).add(frag.cells[k].o) };
  h.fragments = () => frag; h.fragmentById = (id) => live.tow.find((e) => e.f.id === id)?.f || null;
  // skok: tablice stanu skoku z gry
  Object.assign(h, { warpT: new Float32Array(MAX), warpFrom: new Float32Array(MAX * 3), warpDir: new Float32Array(MAX * 3), warpDelay: new Int32Array(MAX).fill(-1),
    dir: new Float32Array(MAX * 3), look: new Float32Array(MAX * 3), speed: S.warp.speed, trails: [], started: [] });
  h.boosters = MAX;
  const scans = new ScanWaves(root, S.scan);
  const live = { laser: [], piercer: [], storm: [], tow: [], cutter: [], field: [], marker: [], portal: [] };
  let cam = null, fragId = 1;
  const used = () => new Set(Object.values(live).flat().map((e) => e.slot).filter((s) => s != null));
  const slot = () => { const u = used(); for (let i = 0; i < MAX; i++) if (!u.has(i) && h.warpT[i] === 0) return i; return -1; };
  const put = (arr, i, v) => { arr[i * 3] = v.x; arr[i * 3 + 1] = v.y; arr[i * 3 + 2] = v.z; };

  function play(kind, o, v) {
    const c = S[kind];
    switch (kind) {
      case 'laser': case 'piercer': case 'storm': case 'cutter': case 'tow': {
        const i = slot(); if (i < 0) return false;
        const e = { slot: i, age: 0, from: v(o.from), to: v(o.to) };
        if (kind === 'tow') {   // bryła holowana: punkty na kuli `size` wokół celu
          e.f = { id: fragId++, pos: e.to.clone(), dead: false, cells: [] };
          const n = 120, r = o.size != null ? o.size : c.size;
          for (let k = 0; k < n; k++) { const y = 1 - (2 * k + 1) / n, rr = Math.sqrt(1 - y * y), a = k * 2.399963; frag.fragOf[frag.cells.length] = e.f.id; e.f.cells.push(frag.cells.length); frag.cells.push({ f: e.f, o: new THREE.Vector3(Math.cos(a) * rr * r, y * r, Math.sin(a) * rr * r) }); }
        }
        live[kind].push(e); return true;
      }
      case 'field': case 'marker': case 'portal': {
        const at = v(o.at);
        if (kind === 'field') { const i = slot(); if (i < 0) return false; live.field.push({ slot: i, age: 0, at }); return true; }
        if (kind === 'marker') { const m = new ClickMarker(root, c); m.show(at, false, cam || { position: new THREE.Vector3(0, 0, 1e4) }); live.marker.push({ m, age: 0 }); return true; }
        const p = new Portal3D(root, at, c); p.pulse(o.frames || c.pulseFrames); live.portal.push({ p, age: 0, toward: o.toward ? v(o.toward) : null }); return true;
      }
      case 'warp': {
        const i = slot(); if (i < 0) return false;
        const from = v(o.from), d = o.dir ? v(o.dir).normalize() : (o.to ? v(o.to).sub(from).normalize() : new THREE.Vector3(1, 0, 0));
        put(h.pos, i, from); h.hidden[i] = 0; h.startWarp(i, d.x, d.y, d.z); return true;
      }
      case 'scan': scans.start(v(o.at), o.radius != null ? o.radius : S.scan.radius, o.color != null ? o.color : S.scan.color); return true;
      default: return false;
    }
  }

  function step(camera, worldCamera = camera) {
    cam = camera; h.stormClock++;
    for (const k of Object.keys(live)) { live[k].forEach((e) => e.age++); }
    const end = (k, life) => { live[k] = live[k].filter((e) => e.age <= life(e)); };
    end('laser', () => S.laser.frames); end('piercer', () => S.piercer.frames); end('storm', () => S.storm.frames);
    end('tow', () => S.tow.frames); end('cutter', () => S.cutter.frames); end('field', () => S.field.frames);
    // statki i cele z grających efektów
    h.firing.fill(0);
    for (const e of [...live.laser, ...live.piercer, ...live.storm, ...live.tow, ...live.cutter]) { put(h.pos, e.slot, e.from); put(h.beamTo, e.slot, e.to); }
    for (const e of live.field) put(h.pos, e.slot, e.at);
    // laser i przebijacz (Beams.drawBeams, renderPiercers)
    const isL = new Set(live.laser.map((e) => e.slot)), isP = new Set(live.piercer.map((e) => e.slot));
    for (const i of isP) h.firing[i] = 1;
    h.drawBeams(h.beams, camera, (i) => isL.has(i));
    h.drawBeams(h.piercerBeams, camera, (i) => isP.has(i));
    h.renderPiercers(camera);
    // burza (renderStorms): rozwidlenie do celu i dwie boczne do punktów obok
    h.stormList = () => live.storm.map((e) => { const d = e.to.clone().sub(e.from).normalize(), u = across(d).multiplyScalar(S.storm.side), w = new THREE.Vector3().crossVectors(d, u);
      return [e.slot, e.to.x, e.to.y, e.to.z, [e.to.x + u.x, e.to.y + u.y, e.to.z + u.z, e.to.x + w.x, e.to.y + w.y, e.to.z + w.z]]; });
    h.renderStorms(camera);
    // holowanie (renderTows)
    h.tows = live.tow.map((e) => [e.slot, e.f.id]); h.renderTows();
    // cięcie (renderCutters): rząd w poprzek kierunku, `width` w każdą stronę
    h.cutList = () => live.cutter.map((e) => { const d = e.to.clone().sub(e.from).normalize(), u = across(d).multiplyScalar(S.cutter.width);
      return [e.slot, e.to.x - u.x, e.to.y - u.y, e.to.z - u.z, e.to.x + u.x, e.to.y + u.y, e.to.z + u.z]; });
    const showOnly = (list) => { const on = new Set(list.map((e) => e.slot)); for (let i = 0; i < MAX; i++) h.hidden[i] = on.has(i) ? 0 : 1; };
    showOnly(live.cutter); h.renderCutters();
    // pola (renderFields): widoczne tylko miejsca z polem
    showOnly(live.field); h.renderFields();
    // skok (stepWarp jak u gościa — bez losowego czekania; renderTrails)
    h.stepWarp(true); h.renderTrails(camera);
    // znaczniki, tunele, fale skanu
    for (const e of live.marker) e.m.update();
    live.marker = live.marker.filter((e) => { if (e.age > S.marker.lifeFrames + 2) { root.remove(e.m.group); return false; } return true; });
    for (const e of live.portal) e.p.update(worldCamera, e.toward ? e.toward.clone().applyMatrix4(root.matrixWorld) : worldCamera.position);
    live.portal = live.portal.filter((e) => { if (e.age > 30 && e.p.openness <= 0 && e.p.target === 0) { e.p.dispose(); return false; } return true; });
    scans.update();
  }
  return {
    play, step,
    counts: () => ({ ...Object.fromEntries(Object.entries(live).map(([k, a]) => [k, a.length])), warp: h.trails.length + Array.from(h.warpT).filter((x) => x > 0).length, scan: scans.list.length }),
    clear() { for (const k of Object.keys(live)) live[k] = []; scans.clear(); h.warpT.fill(0); h.trails.length = 0; },
  };
}
