// ShipKit · blocks — klocki statków: ogniwa słoneczne, rozpórki, części, poziom szczegółów, silniki z płomieniem, wydech, światła nawigacyjne, kolejka strzałów, przygasanie.
// Część ShipKit (js/models/ships-space/shipkit.js — API i definicje statków); moduł ES, wspólne THREE z three-global.js.
import { THREE } from '../../../core/three-global.js';
import { canvas, rng } from './util.js';
import { additiveSprite, glowTextures, makeParticleMaterial, makePlumeMaterial, shadowed } from './shared.js';

// =====================================================================
// SHIP BUILDING BLOCKS — parts and behaviours more than one ship uses.
// A ship definition composes these instead of re-writing them (see
// docs/labs/vehicles-space.md "Adding a ship": anything a second ship would need goes
// here, not into the ship).
// =====================================================================

// Solar-cell sheet (texture): a grid of blue cells with bus lines and a silver frame.
function makeSolarCells({ size = 512, seed = 31, cols = 8, rows = 4 } = {}) {
  const rand = rng(seed);
  const W = size, H = size / 2, cw = W / cols, ch = H / rows;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#c9ced8"; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = i * cw + 3, y = j * ch + 3, w = cw - 6, h = ch - 6, k = rand() * 0.18;
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, `rgb(${Math.round(34 + k * 120)},${Math.round(56 + k * 140)},${Math.round(130 + k * 200)})`);
    g.addColorStop(1, `rgb(8,16,${Math.round(58 + k * 90)})`);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(210,220,240,0.35)"; ctx.lineWidth = 1;
    for (let b = 1; b < 4; b++) { ctx.beginPath(); ctx.moveTo(x + w * b / 4, y); ctx.lineTo(x + w * b / 4, y + h); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A cylinder spanning from a to b: struts, spokes, booms, antenna feeds.
function strut(a, b, radius, material, segments = 8) {
  const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
  const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, segments), material));
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

// A cache key for a ship's lettering: "" for the defaults (the shared set).
const labelKey = (l) => (l && (l.name || l.sub) ? JSON.stringify([l.name || "", l.sub || ""]) : "");

// Named parts: part("engines") is a Group named "engines" under root, made the
// first time it's asked for. A ship puts each of its sections (hull, wings,
// engines, lights…) in one, so a part can be found by name — in the lab, by
// a tool, later by damage or upgrades. A part is a plain static group: the
// game's merged build merges through it as before.
// The shared effects' part (shots, the scan wave, damage smoke and sparks):
// "effects" under the ship, unless the host gives them a root of their own.
function effectsPart(ship) {
  let g = ship.children.find((c) => c.userData.part && c.name === "effects");
  if (!g) { g = new THREE.Group(); g.name = "effects"; g.userData.part = true; ship.add(g); }
  return g;
}
function partsOf(root) {
  const made = new Map();
  return (name) => {
    if (!made.has(name)) {
      const g = new THREE.Group(); g.name = name; g.userData.part = true;
      root.add(g); made.set(name, g);
    }
    return made.get(name);
  };
}

// Segment-count and bevel helpers bound to a build's `detail`.
function detailHelpers(detail) {
  const seg = (n, min = 3) => Math.max(min, Math.round(n * detail));
  const bevel = (t, sz) => ({ bevelEnabled: true, bevelThickness: t, bevelSize: sz, bevelSegments: seg(3, 1) });
  return { seg, bevel };
}

// Engines: a nacelle with a gold intake ring, a nose cone, a lathed bell,
// a glowing throat, an optional heat ring, a shader plume and a glow
// sprite. Built along local +Y and turned so the intake faces +X and the
// exhaust -X. One set per ship: add() builds an engine, update() drives
// every plume/glow from the throttle. `plumeMat` shares one plume material
// between engines (else each gets its own, e.g. per color).
function makeEngineSet(M, U, seg) {
  const G = glowTextures(), engines = [];
  return {
    add(parent, pos, { radius, length, color, plumeMat = null, heatMat = null, taper = 1.08, intake = 0.12,
                       cone = [0.55, 1.2], bell = [0.42, 1.2], plume = 7, glow = 4.2, res = 1 }) {
      const r = radius, sg = (n, min) => seg(n * res, min);
      const g = new THREE.Group();
      g.add(shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r * taper, length, sg(40, 8), 1), M.engine)));
      const ring = shadowed(new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, r * intake, sg(16, 4), sg(48, 8)), M.gold));
      ring.rotation.x = Math.PI / 2; ring.position.y = length / 2; g.add(ring);
      const nose = shadowed(new THREE.Mesh(new THREE.ConeGeometry(r * cone[0], r * cone[1], sg(32, 6)), M.dark));
      nose.position.y = length / 2 + r * 0.3; g.add(nose);
      const pts = [], steps = sg(16, 3);
      for (let i = 0; i <= steps; i++) { const t = i / steps; pts.push(new THREE.Vector2(r * (0.72 + bell[0] * t * t), -t * r * bell[1])); }
      const bellMesh = shadowed(new THREE.Mesh(new THREE.LatheGeometry(pts, sg(48, 8)), M.bell));
      bellMesh.position.y = -length / 2; g.add(bellMesh);
      const throat = new THREE.Mesh(new THREE.CircleGeometry(r * 0.72, sg(40, 8)), M.throat);
      throat.rotation.x = Math.PI / 2; throat.position.y = -length / 2 - 0.02; g.add(throat);
      if (heatMat) {
        const heat = new THREE.Mesh(new THREE.TorusGeometry(r * 1.05, r * 0.05, sg(8), sg(48, 8)), heatMat);
        heat.rotation.x = Math.PI / 2; heat.position.y = -length / 2 - r * 0.3; g.add(heat);
      }
      const plumeLen = r * plume;
      const plumeGeo = new THREE.CylinderGeometry(r * 0.95, r * 0.08, plumeLen, sg(32, 8), sg(24, 4), true); // wide at the nozzle
      plumeGeo.translate(0, -plumeLen / 2, 0);
      const plumeMesh = new THREE.Mesh(plumeGeo, plumeMat || makePlumeMaterial(color, U));
      plumeMesh.position.y = -length / 2 - r * 0.2;
      plumeMesh.userData.dynamic = true; // toggled on/off: never merged (see mergeStatic)
      g.add(plumeMesh);
      const sprite = additiveSprite(G.engine, color);
      sprite.scale.setScalar(r * glow); sprite.position.y = -length / 2 - r * 0.4; g.add(sprite);
      engines.push({ sprite, plume: plumeMesh, base: r * glow });
      g.rotation.z = -Math.PI / 2; // local +y (intake) -> +x (forward), exhaust toward -x
      g.position.copy(pos);
      parent.add(g);
      return g;
    },
    update(t, power) {
      for (const e of engines) {
        e.sprite.scale.setScalar(e.base * (0.4 + 0.6 * power) * (0.95 + 0.05 * Math.sin(t * 40)));
        e.plume.visible = power > 0.02;
      }
    },
  };
}

// Exhaust particles: recycled Points streaming back (-X) from each emitter
// { pos: [x, y, z], spread, length }, spread growing with age; `rate` is
// [base, random] lifetimes per second, `grow` how much the cone widens.
// update(dt, power, on, offsetY) — offsetY follows a bobbing body.
function makeExhaust(parent, U, { count, seed, emitters, rate = [0.9, 0.6], grow = 1.4 }) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), life = new Float32Array(count), pseed = new Float32Array(count);
  const rand = rng(seed);
  for (let i = 0; i < count; i++) { life[i] = rand(); pseed[i] = rand(); }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("life", new THREE.BufferAttribute(life, 1));
  const points = new THREE.Points(geo, makeParticleMaterial(U));
  points.frustumCulled = false;
  parent.add(points);
  return {
    update(dt, power, on, offsetY = 0) {
      points.visible = on && power > 0.05;
      if (!points.visible) return;
      for (let i = 0; i < count; i++) {
        life[i] += dt * (rate[0] + pseed[i] * rate[1]);
        if (life[i] >= 1) life[i] -= 1;
        const e = emitters[i % emitters.length], l = life[i], spread = e.spread * (0.3 + l * grow), a = pseed[i] * 50 + i;
        pos[i * 3] = e.pos[0] - l * e.length * (0.3 + 0.7 * power);
        pos[i * 3 + 1] = e.pos[1] + Math.cos(a) * spread * pseed[i] + offsetY;
        pos[i * 3 + 2] = e.pos[2] + Math.sin(a) * spread * pseed[i];
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.life.needsUpdate = true;
    },
  };
}

// Navigation lights: glow sprites, "steady" (gentle pulse) or "strobe"
// (short flash; `phase` offsets it). defs: [{ color, pos: [x, y, z], size, kind, phase }]
// Each light is a small lens in its colour (always there) and a glow
// sprite; switched off (setVisible(false), offline, damage flicker) the
// glow fades out in ~0.15 s and the lens goes dark — the fitting stays.
function makeNavLights(parent, defs) {
  const G = glowTextures();
  // lenses that blink alike share a material (and so merge into one mesh in the game's build)
  const lensMats = new Map();
  const lensMat = (d) => {
    const key = d.color + "/" + (d.kind || "steady") + "/" + (d.kind === "strobe" ? d.phase || 0 : 0);
    if (!lensMats.has(key)) {
      const c = new THREE.Color(d.color);
      lensMats.set(key, { mat: new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.18), emissive: c, emissiveIntensity: 0, roughness: 0.18, metalness: 0.2 }),
        kind: d.kind || "steady", phase: d.phase || 0 });
    }
    return lensMats.get(key);
  };
  const lights = defs.map((d) => {
    const s = additiveSprite(G.nav, d.color);
    s.position.set(d.pos[0], d.pos[1], d.pos[2]); s.scale.setScalar(d.size || 0.6);
    parent.add(s);
    // the lens: dark tinted glass when off, lit from inside when on
    const lens = new THREE.Mesh(new THREE.SphereGeometry((d.size || 0.6) * 0.11, 12, 8), lensMat(d).mat);
    lens.position.copy(s.position);
    lens.userData.navLens = true;
    parent.add(lens);
    return { s, kind: d.kind || "steady", phase: d.phase || 0 };
  });
  let on = true, level = 1, last = null;
  return {
    update(t) {
      const dt = last === null ? 0 : Math.max(0, Math.min(0.1, t - last)); last = t;
      level += ((on ? 1 : 0) - level) * Math.min(1, dt * 14);
      const blink = (n) => n.kind === "strobe" ? (((t * 0.8 + n.phase) % 1) < 0.06 ? 1 : 0.05) : 0.75 + 0.25 * Math.sin(t * 3);
      for (const n of lights) { n.s.material.opacity = blink(n) * level; n.s.visible = level > 0.01; }
      for (const m of lensMats.values()) m.mat.emissiveIntensity = blink(m) * level * 2.2;
    },
    setVisible(v) { on = !!v; },
  };
}

// Timed shots for act("fire"): schedule([{ delay, ...data }]) queues them
// relative to the current time; run(t, fn) calls fn(shot) for every one due.
function makeShotQueue() {
  const q = [];
  let now = 0;
  return {
    schedule(shots) { for (const sh of shots) q.push({ ...sh, at: now + sh.delay }); },
    run(t, fn) { now = t; while (q.length && q[0].at <= t) fn(q.shift()); },
  };
}

// Offline state for a ship's own parts: set(on) from act("offline"),
// update(dt) eases a 0..1 "online" level (1 = running) that the ship
// multiplies its glows, spins and emissive strengths by.
function makeOnlineFader(rate = 2) {
  let off = false, level = 1;
  return {
    set(on) { off = !!on; },
    get offline() { return off; },
    update(dt) { level += ((off ? 0 : 1) - level) * Math.min(1, dt * rate); return level; },
  };
}

export { makeSolarCells, strut, labelKey, effectsPart, partsOf, detailHelpers, makeEngineSet, makeExhaust, makeNavLights, makeShotQueue, makeOnlineFader };
