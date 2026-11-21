// ShipKit · effects — efekty wspólne każdego statku: strzały, fala skanu, świecący napis, uszkodzenia (miejsca, iskry, odłamki, wybuch).
// Część ShipKit (js/models/ships-space/shipkit.js — API i definicje statków); moduł ES, wspólne THREE z three-global.js.
import { THREE } from '../../../core/three-global.js';
import { canvas, clamp, fbm, rng } from './util.js';
import { trackTextures } from './shared.js';
import { effectsPart } from './blocks.js';

// =====================================================================
// SHARED EFFECTS — every ship gets these for free (see buildShipModel):
//   • action helpers a ship can use: laser bolts, a scan wave, glowing
//     text; a ship lists its own actions in `actions` and handles them in
//     `act(id, on)`,
//   • OFFLINE mode (engines and lights off; the ship dims its own parts),
//   • procedural damage: scorch marks, smoke, sparks, embers, flickering
//     lights and, when badly hit, small parts breaking off.
// =====================================================================
let _fxTex = null;
function fxTextures() {             // soft smoke puff + ragged scorch mark, shared
  if (_fxTex) return _fxTex;
  const blob = (seed, fn) => {
    const rand = rng(seed), n = fbm(rand, 5, 5, 4);
    const [c, ctx] = canvas(128, 128), img = ctx.createImageData(128, 128), d = img.data;
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const r = Math.hypot(x - 64, y - 64) / 64, i = (y * 128 + x) * 4;
      const [cr, cg, cb, a] = fn(r, n(x / 128, y / 128));
      d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = clamp(a, 0, 1) * 255;
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
  };
  _fxTex = {
    smoke: blob(55, (r, n) => { const a = clamp(1 - r, 0, 1); return [255, 255, 255, a * a * (0.55 + (n - 0.5) * 1.6)]; }),
    scorch: blob(57, (r, n) => [22, 15, 10, (1 - r) * 1.7 - (n - 0.5) * 1.3 - 0.25]),
  };
  trackTextures(_fxTex.smoke, _fxTex.scorch);
  return _fxTex;
}

// Glowing text on a transparent canvas (for the drone's print()), cached.
const _textTex = new Map();
function textTexture(text, color = "#ffb45a") {
  const key = text + color;
  if (_textTex.has(key)) return _textTex.get(key);
  const [c, ctx] = canvas(512, 128);
  ctx.font = '700 72px "Oswald", "Arial Narrow", sans-serif';
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = color; ctx.shadowBlur = 24; ctx.fillStyle = color;
  ctx.fillText(text, 256, 66); ctx.shadowBlur = 0; ctx.fillStyle = "#fff4dc"; ctx.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(c);
  _textTex.set(key, t);
  if (_textTex.size > 24) {                    // arbitrary texts: keep the cache small
    const [oldKey, oldTex] = _textTex.entries().next().value;
    _textTex.delete(oldKey); oldTex.dispose();
  }
  return t;
}

// Effects that leave the ship (bolts, scan waves, print clouds) live under
// env.fxRoot when the caller gives one — in the game, the scene, so a
// turning ship doesn't drag its own shots along — otherwise under the
// ship. Positions/directions are given in ship space and converted here;
// sizes and speeds follow the ship's world scale. Objects placed outside
// the ship are remembered in env.owned so disposeShipModel frees them.
function fxHost(ship, env) {
  const root = (env && env.fxRoot) || effectsPart(ship);
  const toRoot = new THREE.Matrix4(), a = new THREE.Vector3(), b = new THREE.Vector3();
  return {
    root,
    add(...objs) {
      for (const o of objs) o.userData.shipkit = true;   // authored for sRGB output + tone mapping
      root.add(...objs); if (root !== ship && env) env.owned.push(...objs);
    },
    // ship-space point -> root space (in place); returns ship/root scale ratio
    point(v) {
      ship.updateMatrixWorld(true); root.updateMatrixWorld(true);
      toRoot.copy(root.matrixWorld).invert();
      v.applyMatrix4(ship.matrixWorld).applyMatrix4(toRoot);
      return ship.getWorldScale(a).x / root.getWorldScale(b).x;
    },
    // world-space point -> root space (in place)
    worldPoint(v) { root.updateMatrixWorld(true); return root.worldToLocal(v); },
    // ship-space direction -> root space (in place, normalized)
    dir(v) { return v.transformDirection(ship.matrixWorld).transformDirection(toRoot); },
  };
}

// Shots: the ship decides where its guns are and when they fire (act("fire")); what a shot looks like
// is not part of the model — it comes from the effects lab (EffectKit, js/render/effects/), drawn by the
// host. fire(origin, dir, target?) reports one shot to model.onShot({ from, to, dir, color, ship }):
// origin and dir in ship space, or aimed at `target` (a world-space point); `to` without a target is
// where the old bolt would have flown in 1.4 s (`speed` × 1.4 ship units). Everything in world space.
// `color` — the ship's own colour for its shots (a hint the host may use). update(dt) — nothing to move.
function makeShotEmitter(ship, env, color, { speed = 28 } = {}) {
  const ws = new THREE.Vector3();
  return {
    fire(origin, dir, target) {
      if (!env || !env.onShot) return;
      ship.updateMatrixWorld(true);
      const from = origin.clone().applyMatrix4(ship.matrixWorld);
      const k = ship.getWorldScale(ws).x;
      const d = target ? target.clone().sub(from).normalize() : dir.clone().transformDirection(ship.matrixWorld).normalize();
      const to = target ? target.clone() : from.clone().addScaledVector(d, speed * 1.4 * k);
      env.onShot({ from, to, dir: d, color, ship: env.id });
    },
    update() {},
  };
}

// Scans: the ship decides where its sensor sits and how far it reaches (act("scan")); the expanding
// shell itself is not part of the model — it is the effects lab's scan wave (js/render/effects/scan.js),
// drawn by the host. start(position, maxRadius) — both in ship space — reports one scan to
// model.onScan({ at, radius, color, ship }), in world space. update(dt) — nothing to move.
function makeScanEmitter(ship, env, color) {
  const ws = new THREE.Vector3();
  return {
    start(pos, radius = 8) {
      if (!env || !env.onScan) return;
      ship.updateMatrixWorld(true);
      env.onScan({ at: pos.clone().applyMatrix4(ship.matrixWorld), radius: radius * ship.getWorldScale(ws).x, color, ship: env.id });
    },
    update() {},
  };
}

// Break one mesh into `pieces` chunks: triangles are grouped around
// randomly chosen seed triangles (nearest centroid), each group becomes its
// own mesh centered on itself (so it spins around its own middle), placed
// exactly where that part of the original was. The original is hidden.
function fractureMesh(mesh, pieces, rand) {
  const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
  const pos = g.attributes.position, tris = pos.count / 3;
  const comp = (a, i, k) => a.array[i * a.itemSize + k]; // r128 has no getComponent()
  const cent = new Float32Array(tris * 3);
  for (let t = 0; t < tris; t++) for (let k = 0; k < 3; k++) {
    cent[t * 3 + k] = (comp(pos, t * 3, k) + comp(pos, t * 3 + 1, k) + comp(pos, t * 3 + 2, k)) / 3;
  }
  const seeds = [];
  for (let i = 0; i < pieces; i++) seeds.push(Math.floor(rand() * tris));
  const bucket = new Int32Array(tris), counts = new Array(pieces).fill(0);
  for (let t = 0; t < tris; t++) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < pieces; i++) {
      const s = seeds[i];
      const d = (cent[t * 3] - cent[s * 3]) ** 2 + (cent[t * 3 + 1] - cent[s * 3 + 1]) ** 2 + (cent[t * 3 + 2] - cent[s * 3 + 2]) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    bucket[t] = best; counts[best]++;
  }
  const chunks = [];
  for (let i = 0; i < pieces; i++) {
    if (!counts[i]) continue;
    const cg = new THREE.BufferGeometry(), center = new THREE.Vector3();
    for (const name of Object.keys(g.attributes)) {
      const src = g.attributes[name], n = src.itemSize, out = new Float32Array(counts[i] * 3 * n);
      let w = 0;
      for (let t = 0; t < tris; t++) {
        if (bucket[t] !== i) continue;
        for (let v = 0; v < 3; v++) for (let c = 0; c < n; c++) out[w++] = comp(src, t * 3 + v, c);
      }
      cg.setAttribute(name, new THREE.BufferAttribute(out, n));
    }
    for (let t = 0; t < tris; t++) if (bucket[t] === i) center.x += cent[t * 3], center.y += cent[t * 3 + 1], center.z += cent[t * 3 + 2];
    center.divideScalar(counts[i]);
    cg.translate(-center.x, -center.y, -center.z);
    const chunk = new THREE.Mesh(cg, mesh.material);
    chunk.castShadow = chunk.receiveShadow = true;
    chunk.position.copy(center);
    mesh.add(chunk);
    chunks.push(chunk);
  }
  if (g !== mesh.geometry) g.dispose();
  return chunks;
}

// Procedural damage, attached by buildShipModel to every model.
// Damage sites are sampled once (seeded) on the ship's big solid meshes:
// a random triangle, a random point on it, its outward normal. Each site
// carries a scorch decal and an ember glow as children of that mesh (so
// they follow any animation), and emits smoke and spark bursts. Small
// parts are the debris candidates. setDamage(0..1) decides how much of
// it shows; update() animates it.
// env: the model's env — the shockwave of the final blast is reported like a scan (env.onScan, orange)
function createDamageFx(ship, radius, env = null) {
  const rand = rng(101);
  ship.updateMatrixWorld(true);
  const big = [], small = [];
  ship.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry || !o.geometry.attributes.position) return;
    const m = o.material;
    if (!m || m.isShaderMaterial || m.transparent || m.blending === THREE.AdditiveBlending) return;
    o.geometry.computeBoundingSphere();
    const s = new THREE.Vector3();
    o.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), s);
    const r = o.geometry.boundingSphere.radius * Math.max(s.x, s.y, s.z);
    if (r > radius * 0.3) big.push({ o, r });
    else if (r < radius * 0.12) small.push(o);
  });

  // --- damage sites: anchors on the ship's parts (+z out of the surface) that fly off with the debris; the
  // scorch mark, ember, smoke and sparks at them are the effects lab's (js/render/effects/damage.js, damageView())
  const sites = [], SITES = 8;
  const pickBig = () => {
    let x = rand() * big.reduce((a, b) => a + b.r, 0);
    for (const b of big) if ((x -= b.r) <= 0) return b.o;
    return big[0].o;
  };
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  for (let i = 0; i < SITES && big.length; i++) {
    const o = pickBig(), g = o.geometry, pos = g.attributes.position, idx = g.index;
    const tri = Math.floor(rand() * (idx ? idx.count : pos.count) / 3);
    const at = (k) => (idx ? idx.getX(tri * 3 + k) : tri * 3 + k);
    va.fromBufferAttribute(pos, at(0)); vb.fromBufferAttribute(pos, at(1)); vc.fromBufferAttribute(pos, at(2));
    let u = rand(), v = rand(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const p = va.clone().addScaledVector(vb.clone().sub(va), u).addScaledVector(vc.clone().sub(va), v);
    const n = vb.clone().sub(va).cross(vc.clone().sub(va)).normalize();
    if (!isFinite(n.x) || n.lengthSq() === 0) n.set(0, 1, 0);
    if (n.dot(p.clone().sub(g.boundingSphere.center)) < 0) n.negate();
    const anchor = new THREE.Object3D(); anchor.name = "damage site";
    const size = 0.38 + rand() * 0.34;
    anchor.position.copy(p);
    anchor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    o.add(anchor);
    sites.push({ o, anchor, size, on: false, ember: false, n, sparkT: rand() * 2, world: new THREE.Vector3(), dir: new THREE.Vector3() });
  }

  // --- sparks: a burst at a site is reported (env.onDamage, world space); the effects lab draws it
  const sw = new THREE.Vector3(), sd = new THREE.Vector3();
  const burst = (s, n) => {
    if (!env || !env.onDamage) return;
    ship.updateMatrixWorld(true);
    env.onDamage({ type: "sparks", at: sw.copy(s.world).applyMatrix4(ship.matrixWorld).clone(), dir: sd.copy(s.dir).transformDirection(ship.matrixWorld).clone(), n, ship: env.id });
  };
  let particlesOn = true;

  // --- debris: small parts that break off, in a fixed (seeded) order
  for (let i = small.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [small[i], small[j]] = [small[j], small[i]]; }
  const loose = small.slice(0, 6).map((o) => ({ o, off: false }));
  const shipCenter = new THREE.Vector3();

  // --- final destruction: flash, fireball, shockwave, then the ship comes
  // apart — its top-level parts (engines, eye, crown, wings…) fly off whole,
  // the big hull pieces are fractured first. Burning sites stay attached to
  // the chunk they landed on, so the wreckage trails smoke.
  const builtParts = new Set(ship.children);  // snapshot before any effect objects are added below
  // the flash and fireballs of the blast: reported (env.onDamage { type: "blast" }), drawn by the effects lab
  const shock = makeScanEmitter(ship, env, 0xff8a3c);   // the shockwave: the effects lab's scan wave, orange
  const flying = [];
  let boomT = -1;
  function breakApart() {
    // parts = children of the group that holds most of the ship (the
    // drone keeps everything in a bobbing `body` group, codewing doesn't)
    const meshCount = (o) => { let n = 0; o.traverse((c) => { if (c.isMesh) n++; }); return n; };
    let parts = ship.children.filter((c) => builtParts.has(c));   // not the effects added since
    const total = meshCount(ship);
    for (;;) {
      const g = parts.find((c) => !c.isMesh && c.children.length && meshCount(c) > total * 0.5);
      if (!g) break;
      parts = parts.filter((c) => c !== g).concat(g.children.slice());
    }
    parts = parts.filter((o) => (o.isMesh || (o.isGroup && meshCount(o) > 0)) && !o.isPoints && !o.isSprite && o.visible);
    ship.updateMatrixWorld(true);
    const pieces = [];
    for (const o of parts) {
      const solid = o.isMesh && !o.isInstancedMesh && o.material && !o.material.transparent && !o.material.isShaderMaterial;
      let r = 0;
      if (solid) { o.geometry.computeBoundingSphere(); const sc = new THREE.Vector3(); o.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), sc); r = o.geometry.boundingSphere.radius * Math.max(sc.x, sc.y, sc.z); }
      if (solid && r > radius * 0.3) {
        const chunks = fractureMesh(o, 6 + Math.floor(rand() * 4), rand);
        o.updateMatrixWorld(true);
        for (const s of sites) if (s.o === o) {      // move burning sites onto the nearest chunk
          const lp = s.anchor.position;
          let best = chunks[0], bd = Infinity;
          for (const c of chunks) { const d = c.position.distanceToSquared(lp); if (d < bd) { bd = d; best = c; } }
          best.attach(s.anchor); s.o = best;
        }
        for (const c of chunks) { ship.attach(c); pieces.push(c); }
        o.visible = false;
      } else { ship.attach(o); pieces.push(o); }
    }
    const tmpC = new THREE.Vector3();
    for (const o of pieces) {
      new THREE.Box3().setFromObject(o).getCenter(tmpC);
      ship.worldToLocal(tmpC);
      const out = tmpC.lengthSq() > 1e-4 ? tmpC.clone().normalize() : new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
      flying.push({ o, v: out.multiplyScalar(0.45 + rand() * 1.0).add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.35)),
        spin: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(), spinRate: 0.3 + rand() * 1.5 });
    }
  }

  let damage = 0, active = 0;
  const shipInv = new THREE.Matrix4();
  return {
    explode() {
      if (boomT >= 0) return;
      boomT = 0;
      this.setDamage(1);
      loose.forEach((l) => { l.off = true; l.o.visible = true; });   // no more separate break-offs
      ship.updateMatrixWorld(true);
      if (env && env.onDamage) env.onDamage({ type: "blast", at: new THREE.Vector3().setFromMatrixPosition(ship.matrixWorld), radius: radius * ship.getWorldScale(sw).x, ship: env.id });
      shock.start(new THREE.Vector3(), radius * 1.8);
      for (const s of sites) { ship.updateMatrixWorld(true); s.anchor.getWorldPosition(s.world); ship.worldToLocal(s.world); s.dir.copy(s.world).normalize(); burst(s, 36); }
    },
    get destroyed() { return boomT >= 0; },
    setDamage(d) {
      damage = d;
      active = d <= 0 ? 0 : Math.ceil(d * sites.length);
      sites.forEach((s, i) => {
        s.on = i < active;
        s.ember = s.on && d > 0.45 && i % 2 === 0;
      });
      const wantOff = d >= 0.7 ? Math.round((d - 0.6) / 0.4 * loose.length) : 0;
      loose.forEach((l, i) => {
        if (i < wantOff && !l.off) {          // break off: keep its world pose, fly away
          l.parent = l.o.parent; l.pos = l.o.position.clone(); l.quat = l.o.quaternion.clone(); l.scale = l.o.scale.clone();
          ship.attach(l.o);
          l.v = l.o.position.clone().sub(shipCenter).normalize().multiplyScalar(0.7)
            .add(new THREE.Vector3(rand() - 0.5, rand() - 0.2, rand() - 0.5).multiplyScalar(0.5));
          l.spin = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
          l.spinRate = 1 + rand() * 3; l.age = 0; l.off = true;
        } else if (i >= wantOff && l.off) {   // repaired: back where it was
          l.parent.add(l.o); l.o.position.copy(l.pos); l.o.quaternion.copy(l.quat); l.o.scale.copy(l.scale);
          l.o.visible = true; l.off = false;
        }
      });
    },
    get damage() { return damage; },
    // what the effects lab draws: the sites (anchor, on, ember, size), the damage, whether particles are on
    view() { return { sites: sites.map((s) => ({ anchor: s.anchor, on: s.on, ember: s.ember, size: s.size })), damage, particles: particlesOn, destroyed: boomT >= 0 }; },
    update(t, dt, particles = true) {
      particlesOn = particles;
      if (boomT >= 0) {
        const before = boomT;
        boomT += dt;
        if (before < 0.12 && boomT >= 0.12) breakApart();
        shock.update(dt);
        const drag = Math.max(0, 1 - dt * 0.18);
        for (const f of flying) {
          f.o.position.addScaledVector(f.v, dt);
          f.v.multiplyScalar(drag);
          f.o.rotateOnAxis(f.spin, f.spinRate * dt);
        }
      }
      shipInv.copy(ship.matrixWorld).invert();
      for (let i = 0; i < active; i++) {                // site positions in ship space
        const s = sites[i];
        s.anchor.getWorldPosition(s.world).applyMatrix4(shipInv);
        s.dir.copy(s.n).transformDirection(s.o.matrixWorld).transformDirection(shipInv);
        if (damage > 0.25 && (s.sparkT -= dt) <= 0) {
          s.sparkT = 0.12 + rand() * (1.8 - damage * 1.5);
          if (particlesOn) burst(s, 10 + Math.floor(rand() * 18 * damage));
        }
      }
      for (const l of loose) {
        if (!l.off || !l.o.visible || !l.v) continue;
        l.o.position.addScaledVector(l.v, dt);
        l.o.rotateOnAxis(l.spin, l.spinRate * dt);
        if ((l.age += dt) > 6) l.o.visible = false;
      }
      // smoke and sparks: the effects lab (damageView, onDamage)
    },
  };
}

export { _fxTex, fxTextures, _textTex, textTexture, fxHost, makeShotEmitter, makeScanEmitter, fractureMesh, createDamageFx };
