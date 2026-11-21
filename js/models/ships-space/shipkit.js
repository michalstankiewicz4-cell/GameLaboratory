/* =======================================================================
   SHIPKIT — procedural spaceship models (from the game Swarm Protocol)
   =======================================================================
   An ES module (export ShipKit; also window.ShipKit): the ship lab and the other Space labs build
   from it. This file: the ship definitions and the API (buildShipModel, the sky, the environment…);
   its parts in js/models/ships-space/shipkit/: util (rng, noise), plating (hull plating),
   shared (materials, glow textures), effects (shots, scan, damage), blocks (solar cells,
   struts, engines, exhaust, nav lights…), shaping (rounding, sealed joints). The ships
   register themselves from ships/*.js. The ship lab's own script is
   js/labs/vehicles-space/vehicles-space.js.

   Dependencies: THREE from js/core/three-global.js (written for r128) and a DOM
   (<canvas> for texture generation). No OrbitControls, no other libs.

   -----------------------------------------------------------------------
   API (window.ShipKit)
   -----------------------------------------------------------------------
   buildShipModel(id, { detail = 1 })  -> model
       id      "codewing", "scribe" (the drone) or "swarmer" (the swarm ship)
       detail  0.2 .. 2, scales every segment count
               (measured for "codewing": 0.2 ≈ 4.7k tris, 1 ≈ 70k, 2 ≈ 276k)
       model = {
         id, detail,
         group,                 THREE.Group — add it to your scene
         update(t, dt, opts),   call every frame; t = seconds since start,
                                dt = frame delta (s),
                                opts.power 0..1 engine throttle (smooth it
                                yourself), opts.particles false = no exhaust
                                particles (cheap mode for many ships)
         setLights(on),         running/nav lights on/off
         actions,               [{ id, label, kind, enabled }]: the standard set
                                (fire, scan, print, offline — disabled where the
                                ship has no animation for it) + ship extras
         damageEnabled          false if the ship opted out of damage effects
         act(id, on),           run an action / set a toggle
         setDamage(0..1),       procedural damage: scorch marks, smoke, sparks,
                                embers, flickering lights, parts breaking off
         destroyed              true after act("destroy"): the ship blew apart
                                (build a new model to get it back)
         size,                  THREE.Vector3 size of the solid hull (units;
                                plumes/glows/particles excluded)
         radius,                half the size diagonal (units)
       }
   disposeShipModel(model)  removes the group from its parent and frees its
                            geometries + per-model materials (shared cached
                            materials and textures are kept for reuse)
   modelStats(group)        object/figure/triangle/material/texture counts
   SHIP_DEFS                registry; add a ship = push one more entry
   allTextures              Set of every generated texture (anisotropy etc.)
   makePlating / makeBrushed / makeGlow, util.{rng, valueNoise, fbm, ...}
                            generators, reusable for other game objects

   Model conventions: origin at the ship's center, nose along +X, up +Y,
   "codewing" measures 12.06 × 5.78 × 9.76 units (length × height × span). Each model has its own shader uniforms,
   so many instances can animate/throttle independently.

   -----------------------------------------------------------------------
   IN THE GAME SPACE (where this file came from)
   -----------------------------------------------------------------------
   buildShipModel(id, { detail, merge: true, fxRoot: scene }) + makeGameHolder
   (model, length) — +Z forward, scaled; effects placed in the scene. The
   game's detail is Setup's geometry detail × GAME_DETAIL[id] (a swarm ship
   is a speck most of the time); the ship lab's GAME BUILD uses the same. The
   game renders like the labs (sRGB output, ACES, scene.environment from
   makeEnvironment()) and skips userData.shipkit objects in its color
   conversion. Mark animated/toggled parts userData.dynamic (mergeStatic).
   Here: a change to this file bumps the program's version (ui/data/versions.js,
   CHANGELOG.md; CLAUDE.md, "Wersjonowanie"). English comments, no
   trademarked franchise names.
   ======================================================================= */
import { THREE } from '../../core/three-global.js';
import { canvas, clamp, fbm, paintPixels, rng, valueNoise } from './shipkit/util.js';
import { makeBrushed, makeGlow, makePlating } from './shipkit/plating.js';
import { BLUE, GOLD, additiveSprite, allTextures, glowTextures, makeCoreMaterial, makePlumeMaterial, shadowed, sharedMaterials, trackTextures } from './shipkit/shared.js';
import { createDamageFx, fxHost, fxTextures, makeScanEmitter, makeShotEmitter, textTexture } from './shipkit/effects.js';
import { roundedBoxGeometry, roundedCylinderGeometry, sealJoints, withRounding } from './shipkit/shaping.js';
import { detailHelpers, labelKey, makeEngineSet, makeExhaust, makeNavLights, makeOnlineFader, makeShotQueue, makeSolarCells, partsOf, strut } from './shipkit/blocks.js';

// =====================================================================
// SHIP DEFINITIONS
// One entry per ship type:
//   id        stable key used by buildShipModel(id)
//   name      display name
//   camera    suggested viewer camera position (viewer only)
//   assets()  creates + caches this type's textures/materials (once)
//   build(detail) -> { group, update(t, dt, opts), setLights(on) } (+ optional
//             actions/act, and setDamage(d) for damage stages of its own)
// `detail` (0.2 .. 2) scales every segment count through seg(), so the
// same definition serves both a close-up hero model and cheap swarm LODs.
// The definitions live in js/models/ships-sea/ships/<id>.js, one file per ship,
// loaded after this one; each pushes its entry here (ShipKit.SHIP_DEFS)
// and takes what it needs from ShipKit._ (the building blocks and helpers
// below). To add a ship: a new file of the same shape, added after the
// others on every page that loads ShipKit (docs/labs/vehicles-space.md, "Adding a ship").
// =====================================================================
const SHIP_DEFS = [];

// =====================================================================
// PUBLIC API
// =====================================================================

const FIGURE_NAMES = {
  LatheGeometry: "Lathe (revolved)", BoxGeometry: "Box", SphereGeometry: "Sphere / segment",
  TorusGeometry: "Torus", ExtrudeGeometry: "Extruded shape", TubeGeometry: "Tube along curve",
  CylinderGeometry: "Cylinder", ConeGeometry: "Cone", CircleGeometry: "Circle",
  IcosahedronGeometry: "Icosahedron", OctahedronGeometry: "Octahedron", DodecahedronGeometry: "Dodecahedron",
  TorusKnotGeometry: "Torus knot", EdgesGeometry: "Edges (wire cage)", PlaneGeometry: "Plane",
};

// The action buttons every ship shows, in this order. A ship enables the
// ones it implements by listing them in its build() result's `actions`
// (it may relabel them, e.g. "FIRE CANNONS"); the rest show up disabled,
// so a ship with no extra animation for something simply doesn't list it.
// Ship-specific extra actions (any other id) are appended after these.
// "offline" and "destroy" are implemented here for every ship; a
// definition can switch the shared features off with
// features: { offline: false, damage: false, destroy: false }
// (destroy needs damage: it reuses its smoke and sparks).
const STANDARD_ACTIONS = [
  { id: "fire", label: "FIRE", kind: "trigger" },
  { id: "scan", label: "SCAN", kind: "trigger" },
  { id: "print", label: "PRINT", kind: "trigger" },
  { id: "offline", label: "OFFLINE", kind: "toggle" },
  { id: "destroy", label: "DESTROY", kind: "trigger" },
];

// Merge the static meshes of a built ship to cut draw calls: meshes
// sharing a material are baked into one geometry, per "unit" — the root
// plus every object marked userData.dynamic (anything the ship animates
// by transform or toggles on/off), each merged in its own local space so
// its animation still works. A mesh with children, an instanced mesh, or
// a material used only once is left alone.
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const units = [root];
  root.traverse((o) => { if (o !== root && o.userData.dynamic) units.push(o); });
  for (const unit of units) {
    const inv = new THREE.Matrix4().copy(unit.matrixWorld).invert();
    const byMat = new Map();
    (function walk(o) {
      for (const c of o.children) {
        if (c.userData.dynamic) continue;                 // its own unit
        if (c.isMesh && !c.isInstancedMesh && !c.children.length && !Array.isArray(c.material)
            && c.geometry && c.geometry.attributes.position) {
          if (!byMat.has(c.material)) byMat.set(c.material, []);
          byMat.get(c.material).push(c);
        }
        walk(c);
      }
    })(unit);
    for (const [mat, meshes] of byMat) {
      if (meshes.length < 2) continue;
      const parts = meshes.map((m) => {
        const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
        return g;
      });
      const names = ["position", "normal", "uv"].filter((n) => parts.some((g) => g.attributes[n]));
      const total = parts.reduce((a, g) => a + g.attributes.position.count, 0);
      const merged = new THREE.BufferGeometry();
      for (const n of names) {
        const size = n === "uv" ? 2 : 3, out = new Float32Array(total * size);
        let off = 0;
        for (const g of parts) {
          const a = g.attributes[n];
          if (a) out.set(a.array.subarray(0, a.count * size), off);  // missing uv stays 0
          off += g.attributes.position.count * size;
        }
        merged.setAttribute(n, new THREE.BufferAttribute(out, size));
      }
      parts.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = mesh.receiveShadow = true;
      unit.add(mesh);
      for (const m of meshes) { m.parent.remove(m); m.geometry.dispose(); }
    }
  }
}

// Build one ship model. Returns a model handle:
//   { id, detail, group, update(t, dt, opts), setLights(on), size, radius }
// group: THREE.Group, origin at the ship's center, nose along +X, up +Y.
// Options:
//   detail   0.2 .. 2, scales every segment count
//   merge    true: merge static meshes (far fewer draw calls — use in the game)
//   fxRoot   an Object3D (e.g. the scene) for effects that leave the ship
//   envMap   environment map for the ship's reflective materials
// round, seal (0..1): rounded edges and sealed joints (see SHAPING; sealStyle
// "fillet" — the joint rounded — or "bead" — a line of sealant); 0 = the
// model exactly as its definition builds it (the game's default).
// labels { name, sub }: the lettering on a hull that has any (the codewing,
// the station); omitted = the ship's own.
function buildShipModel(id, { detail = 1, merge = false, fxRoot = null, envMap = null, round = 0, seal = 0, sealStyle = "fillet", labels = null } = {}) {
  const def = SHIP_DEFS.find((d) => d.id === id);
  if (!def) throw new Error("ShipKit: unknown ship id " + id);
  const env = { id, fxRoot, owned: [], labels, onShot: null, onScan: null, onDamage: null };   // shots, scans, sparks and blasts: reported to the host
  // arc segments: more for a stronger rounding and a higher detail (each box costs (2k+1)² quads a face)
  const k = Math.max(1, Math.min(3, Math.round(round * 3 * detail)));
  const built = withRounding(round, k, () => def.build(detail, env));
  if (seal > 0) sealJoints(built.group, seal, detail, sealStyle);
  built.group.userData.shipkit = true; // a host's color management can skip ShipKit models
  if (merge) mergeStatic(built.group);
  if (envMap) built.group.traverse((o) => {
    for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
      if (m.isMeshStandardMaterial && m.envMap !== envMap) { m.envMap = envMap; m.needsUpdate = true; }
    }
  });
  // Size of the solid hull only: engine plumes, glow sprites and particles
  // are effects and would inflate the box.
  built.group.updateMatrixWorld(true);
  const box = new THREE.Box3();
  built.group.traverse((o) => {
    if (!o.isMesh || (o.material && o.material.blending === THREE.AdditiveBlending)) return;
    box.union(new THREE.Box3().setFromObject(o));
  });
  const size = box.getSize(new THREE.Vector3()), radius = size.length() / 2;

  // Everything below is shared by every ship type: offline mode, damage
  // effects and flickering lights, on top of the ship's own actions.
  const features = { offline: true, damage: true, destroy: true, ...(def.features || {}) };
  if (!features.damage) features.destroy = false;
  const fx = features.damage ? createDamageFx(built.group, radius, env)
    : { damage: 0, setDamage() {}, update() {} };
  const own = built.actions || [];
  const actions = STANDARD_ACTIONS.map((a) => {
    const mine = own.find((x) => x.id === a.id);
    const shared = a.id === "offline" || a.id === "destroy";
    return { ...a, ...(mine || {}), enabled: shared ? features[a.id] : !!mine };
  }).concat(own.filter((x) => !STANDARD_ACTIONS.some((a) => a.id === x.id)).map((x) => ({ kind: "trigger", ...x, enabled: true })));
  const st = { offline: false, lights: true, shown: true, flickerT: 0 };
  const showLights = (on) => { if (on !== st.shown) { st.shown = on; built.setLights(on); } };
  const model = {
    id, detail, group: built.group, size, radius, _owned: env.owned,
    // act("fire") reports each shot here ({ from, to, dir, color, ship }, world space); the host draws it
    // with an effect from the effects lab (js/render/effects/) — the model has no shot of its own
    get onShot() { return env.onShot; }, set onShot(fn) { env.onShot = fn || null; },
    // act("scan") reports each scan here ({ at, radius, color, ship }, world space): the effects lab's scan wave
    get onScan() { return env.onScan; }, set onScan(fn) { env.onScan = fn || null; },
    // damage: sparks at the damage sites and the final blast are reported here ({ type: "sparks", at, dir, n } |
    // { type: "blast", at, radius }, world space); damageView() — the sites (anchors on the parts: scorch, ember,
    // smoke), the damage, whether particles are on. The effects lab draws them (js/render/effects/damage.js)
    get onDamage() { return env.onDamage; }, set onDamage(fn) { env.onDamage = fn || null; },
    damageView: () => (fx.view ? fx.view() : null),
    // [{ id, label, kind: "trigger" | "toggle", enabled }] — see STANDARD_ACTIONS
    actions,
    damageEnabled: features.damage,
    get offline() { return st.offline; },
    get destroyed() { return !!fx.destroyed; },
    get damage() { return fx.damage; },
    update(t, dt, opts = {}) {
      const dead = st.offline || !!fx.destroyed;
      const power = dead ? 0 : (opts.power === undefined ? 1 : opts.power);
      built.update(t, dt, { ...opts, power });
      // lights: off when offline; flicker when badly damaged
      if (!st.lights || dead) showLights(false);
      else if (fx.damage > 0.4) {
        if ((st.flickerT -= dt) <= 0) {
          st.flickerT = 0.04 + Math.random() * 0.3;
          showLights(Math.random() > fx.damage * 0.5);
        }
      } else showLights(true);
      fx.update(t, dt, opts.particles !== false);
    },
    setLights(on) { st.lights = on; },
    // Trigger an action, or set a toggle (on = true/false). "offline" is
    // handled here and passed on so the ship can dim its own parts.
    act(actionId, on) {
      const a = actions.find((x) => x.id === actionId);
      if (!a || !a.enabled || fx.destroyed) return;  // not available / nothing left to act
      if (actionId === "destroy") {                   // the ship powers down as it blows apart
        if (built.act) built.act("offline", true);
        if (built.setDamage) built.setDamage(1);
        fx.explode();
        return;
      }
      if (actionId === "offline") st.offline = on === undefined ? !st.offline : !!on;
      if (built.act) built.act(actionId, actionId === "offline" ? st.offline : on);
    },
    // 0 = pristine, 1 = wrecked; a ship with damage stages of its own
    // (built.setDamage, e.g. the station's breach) gets it too
    setDamage(d) {
      if (fx.destroyed) return;
      fx.setDamage(clamp(d, 0, 1));
      if (built.setDamage) built.setDamage(clamp(d, 0, 1));
    },
  };
  return model;
}

// Free a model's GPU resources: all geometries + per-model materials.
// Shared (cached) materials and all textures are kept for reuse.
function disposeShipModel(model) {
  if (model.group.parent) model.group.parent.remove(model.group);
  for (const o of model._owned || []) {          // effects placed outside the ship (fxRoot)
    if (o.parent) o.parent.remove(o);
    o.traverse((c) => { if (c.geometry) c.geometry.dispose(); if (c.material && !sharedMaterials.has(c.material)) c.material.dispose(); });
  }
  model.group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) if (!sharedMaterials.has(m)) m.dispose();
  });
}

// Technical statistics of a built model (object / figure / triangle counts,
// materials, shaders, textures + GPU memory estimate).
function modelStats(root) {
  const st = { objects: 0, meshes: 0, instanced: 0, copies: 0, sprites: 0, lines: 0, points: 0, particles: 0,
               triangles: 0, vertices: 0, figures: {}, materials: new Set(), shaders: 0, textures: new Set() };
  root.traverse((o) => {
    if (o === root || o.type === "Group") return;
    st.objects++;
    const k = o.isInstancedMesh ? o.count : 1;
    if (o.isInstancedMesh) { st.instanced++; st.copies += o.count; }
    else if (o.isMesh) st.meshes++;
    else if (o.isSprite) st.sprites++;
    else if (o.isLineSegments || o.isLine) st.lines++;
    else if (o.isPoints) { st.points++; st.particles += o.geometry.attributes.position.count; }
    if (o.geometry && !o.isSprite && !o.isPoints) {
      const g = o.geometry, name = FIGURE_NAMES[g.type] || g.type;
      st.figures[name] = (st.figures[name] || 0) + k;
      st.vertices += g.attributes.position.count * k;
      if (o.isMesh) st.triangles += (g.index ? g.index.count / 3 : g.attributes.position.count / 3) * k;
    }
    for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
      st.materials.add(m);
      for (const key of ["map", "roughnessMap", "bumpMap", "emissiveMap", "metalnessMap", "normalMap"]) if (m[key]) st.textures.add(m[key]);
    }
  });
  st.shaders = [...st.materials].filter((m) => m.isShaderMaterial).length;
  const images = new Set([...st.textures].map((t) => t.image));
  st.texCount = images.size;
  st.texMB = [...images].reduce((a, im) => a + (im ? im.width * im.height * 4 * 4 / 3 : 0), 0) / 1048576; // RGBA8 + mips
  return st;
}

// The labs' reflection sky: an equirectangular nebula with stars, a warm
// sun (gives metal a strong highlight) and a cool rim source. The ship and
// body labs use it as their sky and environment; the game uses it as the
// environment map so its ships and planets are lit like in the labs.
function makeSpaceSky(w = 2048, h = 1024) {
  const rand = rng(11);
  const [c, ctx] = canvas(w, h);
  const n1 = fbm(rand, 6, 3, 6), n2 = fbm(rand, 3, 2, 5);
  paintPixels(ctx, w, h, (u, v) => {
    const a = n1(u, v), b = n2(u, v);
    const neb = Math.pow(clamp((a - 0.42) * 2.4, 0, 1), 2.2);
    const neb2 = Math.pow(clamp((b - 0.48) * 2.6, 0, 1), 2);
    const lat = 1 - Math.abs(v - 0.5) * 1.6;
    return [
      clamp(4 + neb * 70 * lat + neb2 * 90, 0, 255),
      clamp(6 + neb * 40 * lat + neb2 * 30, 0, 255),
      clamp(16 + neb * 150 * lat + neb2 * 110, 0, 255),
    ];
  });
  for (let i = 0; i < 2600; i++) {
    const x = rand() * w, y = rand() * h, r = rand() < 0.97 ? rand() * 0.9 + 0.3 : rand() * 1.8 + 1;
    const t = rand();
    ctx.fillStyle = t < 0.2 ? "#ffd9a8" : t < 0.4 ? "#b8c8ff" : "#ffffff";
    ctx.globalAlpha = 0.4 + rand() * 0.6; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const sun = (x, y, r, col) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.08, col); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  sun(w * 0.18, h * 0.36, 260, "rgba(255,190,110,0.85)");
  sun(w * 0.68, h * 0.55, 200, "rgba(110,140,255,0.6)");
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

// A prefiltered environment map from makeSpaceSky(), for scene.environment
// (or buildShipModel's envMap option).
// The game builds each model at Setup's geometry detail × this (the ship
// lab's GAME BUILD too, so the lab shows what the game shows). Other
// players' units go lower still (the game's own code).
const GAME_DETAIL = { swarmer: 0.5, haven: 0.7, scribe: 1 };

function makeEnvironment(renderer) {
  const sky = makeSpaceSky(1024, 512);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(sky).texture;
  sky.dispose(); pmrem.dispose();
  return env;
}

// Game wrapper: turns the model to the game's convention (forward = +Z)
// and scales it to `length` units. Move/rotate `holder`, not model.group.
function makeGameHolder(model, length) {
  const holder = new THREE.Group(), inner = new THREE.Group();
  inner.rotation.y = -Math.PI / 2;                 // +X nose -> +Z forward
  inner.scale.setScalar(length / model.size.x);
  inner.add(model.group);
  holder.add(inner);
  return holder;
}

// Generate a ship type's textures and materials ahead of time (the first
// build costs ~1 s of CPU) — e.g. while a start screen is showing.
function prewarm(ids) {
  glowTextures(); fxTextures();
  for (const id of ids) { const d = SHIP_DEFS.find((x) => x.id === id); if (d) d.assets(); }
}

window.ShipKit = {
  // the internals the ship files build with (js/models/ships-sea/ships/*.js) — not a public API
  _: { GOLD, BLUE, additiveSprite, buildShipModel, canvas, clamp, detailHelpers, fxHost, fxTextures, glowTextures, labelKey, makeShotEmitter, makeBrushed, makeCoreMaterial, makeEngineSet, makeExhaust, makeGameHolder, makeNavLights, makeOnlineFader, makePlating, makePlumeMaterial, makeScanEmitter, makeShotQueue, makeSolarCells, mergeStatic, partsOf, rng, shadowed, sharedMaterials, strut, textTexture, trackTextures },
  SHIP_DEFS, GAME_DETAIL, buildShipModel, disposeShipModel, modelStats, makeGameHolder, prewarm, mergeStatic,
  makeSpaceSky, makeEnvironment,
  makeShotEmitter, makeScanEmitter, textTexture, fxTextures, // action/effect helpers for ship defs
  // building blocks for ship definitions (see "SHIP BUILDING BLOCKS")
  detailHelpers, partsOf, withRounding, sealJoints, roundedBoxGeometry, roundedCylinderGeometry, makeEngineSet, makeExhaust, makeNavLights, makeShotQueue, makeOnlineFader, makeSolarCells, strut,
  STANDARD_ACTIONS,
  allTextures,                      // Set of every generated texture
  isSharedMaterial: (m) => sharedMaterials.has(m),
  // lower-level generators, reusable for other game objects:
  makePlating, makeBrushed, makeGlow,
  util: { rng, valueNoise, fbm, canvas, paintPixels, clamp },
};

// moduł ES: kit do importu (window.ShipKit zostaje dla stron i skryptów, które go czytają)
export const ShipKit = window.ShipKit;
export default ShipKit;
