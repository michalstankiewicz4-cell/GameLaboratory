// Efekty uszkodzeń i zniszczenia: dym, iskry, ogniki, spalenizna, wybuch (błysk i kule ognia). Z ShipKit
// (js/models/ships-space/shipkit.js, createDamageFx) — statek nie rysuje ich już sam: model zostawia u siebie miejsca
// uszkodzeń (kotwice na częściach, lecą razem z odłamkami), łamanie i odpadanie części, a rysuje to laboratorium
// efektów. Tekstury, shadery i liczby jak w ShipKit; czas w sekundach, krok — klatka 1/60 s.
//
// new DamageFx(parent) — dym, iskry i wybuchy w świecie (parent: grupa sceny albo efektów)
//   smoke(emitters) — klatka dymu: emitters = [{ at, dir, alpha }] (świat), np. aktywne miejsca uszkodzeń
//   sparks(at, dir, n), blast(at, radius), mark(anchor, { on, ember, size, damage }) — spalenizna i ognik przy kotwicy
//   step(), clear(), dispose()
// shipDamage(model, fx) — podpina uszkodzenia statku ShipKit (model.damageSites, model.onDamage) do DamageFx
import * as THREE from '../../../vendor/three/three.module.js';

const DT = 1 / 60;
// z ShipKit: rng, szum, tekstury dymu, spalenizny i poświaty
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function valueNoise(rand, cx, cy) {
  const g = new Float32Array(cx * cy); for (let i = 0; i < g.length; i++) g[i] = rand();
  const at = (x, y) => g[((y % cy + cy) % cy) * cx + ((x % cx + cx) % cx)];
  return (u, v) => { const fx = u * cx, fy = v * cy, x0 = Math.floor(fx), y0 = Math.floor(fy); let tx = fx - x0, ty = fy - y0;
    tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty; };
}
function fbm(rand, bx, by, oct) { const L = []; for (let o = 0; o < oct; o++) L.push(valueNoise(rand, bx << o, by << o));
  return (u, v) => { let s = 0, a = 0.5, n = 0; for (const f of L) { s += f(u, v) * a; n += a; a *= 0.5; } return s / n; }; }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
let TEX = null;
function textures() {
  if (TEX) return TEX;
  const blob = (seed, fn) => {
    const rand = rng(seed), n = fbm(rand, 5, 5, 4), c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d'), img = ctx.createImageData(128, 128), d = img.data;
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const r = Math.hypot(x - 64, y - 64) / 64, i = (y * 128 + x) * 4, [cr, cg, cb, a] = fn(r, n(x / 128, y / 128));
      d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = clamp(a, 0, 1) * 255;
    }
    ctx.putImageData(img, 0, 0); return new THREE.CanvasTexture(c);
  };
  const glow = (inner, mid) => { const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d'), g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner); g.addColorStop(0.25, mid); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); };
  TEX = {
    smoke: blob(55, (r, n) => { const a = clamp(1 - r, 0, 1); return [255, 255, 255, a * a * (0.55 + (n - 0.5) * 1.6)]; }),
    scorch: blob(57, (r, n) => [22, 15, 10, (1 - r) * 1.7 - (n - 0.5) * 1.3 - 0.25]),
    glow: glow('rgba(255,255,255,1)', 'rgba(140,170,255,0.55)'),
  };
  return TEX;
}
const sprite = (map, color) => new THREE.Sprite(new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));

export const DAMAGE_DEFAULTS = {
  smoke: { puffs: 180, rise: 0.12, speed: 0.25, alpha: 1, frames: 300, emitters: 3 },
  sparks: { n: 24, speed: 1.2, drag: 1.8 },
  explosion: { radius: 3, fireballs: 7, color: 0xffe2b0, fire: 0xff6a1a, fire2: 0xffb45a },
  scorch: { size: 0.55, frames: 600 },
  ember: { color: 0xff5a1a, frames: 600 },
};

export class DamageFx {
  constructor(parent, cfg = DAMAGE_DEFAULTS) {
    const T = textures(); this.cfg = cfg; this.parent = parent; this.rand = rng(101); this.t = 0;
    this.group = new THREE.Group(); this.group.name = 'damage effects'; parent.add(this.group);
    // dym: miękkie szare kłęby, zwykłe mieszanie, unoszą się i rozchodzą
    const N = this.SMOKE = cfg.smoke.puffs, g = new THREE.BufferGeometry();
    this.sPos = new Float32Array(N * 3); this.sLife = new Float32Array(N).fill(1); this.sAlpha = new Float32Array(N); this.sVel = new Float32Array(N * 3); this.sRate = new Float32Array(N);
    for (let i = 0; i < N; i++) { this.sLife[i] = this.rand(); this.sRate[i] = 0.25 + this.rand() * 0.2; }
    g.setAttribute('position', new THREE.BufferAttribute(this.sPos, 3)); g.setAttribute('life', new THREE.BufferAttribute(this.sLife, 1)); g.setAttribute('alpha', new THREE.BufferAttribute(this.sAlpha, 1));
    this.smokePts = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { uTex: { value: T.smoke } },
      vertexShader: `
        attribute float life; attribute float alpha; varying float vLife; varying float vAlpha;
        void main(){
          vLife = life; vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (0.35 + life * 1.8) * 420.0 / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uTex; varying float vLife; varying float vAlpha;
        void main(){
          float a = texture2D(uTex, gl_PointCoord).a * vAlpha * (1.0 - vLife) * smoothstep(0.0, 0.12, vLife);
          gl_FragColor = vec4(mix(vec3(0.34, 0.31, 0.29), vec3(0.06), vLife), a * 0.95);
        }`,
      transparent: true, depthWrite: false,
    }));
    this.smokePts.frustumCulled = false; this.group.add(this.smokePts);
    // iskry: krótko żyjące punkty w seriach, z oporem
    const K = this.SPARKS = 220, kg = new THREE.BufferGeometry();
    this.kPos = new Float32Array(K * 3); this.kLife = new Float32Array(K).fill(1); this.kVel = new Float32Array(K * 3); this.kRate = new Float32Array(K); this.kNext = 0;
    kg.setAttribute('position', new THREE.BufferAttribute(this.kPos, 3)); kg.setAttribute('life', new THREE.BufferAttribute(this.kLife, 1));
    this.sparkPts = new THREE.Points(kg, new THREE.ShaderMaterial({
      vertexShader: `
        attribute float life; varying float vLife;
        void main(){
          vLife = life;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (1.0 - life) * 70.0 / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vLife;
        void main(){
          float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * (1.0 - vLife);
          gl_FragColor = vec4(mix(vec3(1.0, 0.96, 0.8), vec3(1.0, 0.42, 0.08), vLife) * a * 2.0, 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.sparkPts.frustumCulled = false; this.group.add(this.sparkPts);
    this.emitters = []; this.blasts = []; this.marks = new Map();
    this.decalGeo = new THREE.CircleGeometry(1, 20);
    this.decalMat = new THREE.MeshBasicMaterial({ map: T.scorch, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  }
  /** Dym z tych emiterów w tej klatce: [{ at, dir, alpha }] (świat). */
  smoke(emitters) { this.emitters = emitters || []; }
  /** Seria iskier z `at` w stronę `dir` (świat). */
  sparks(at, dir, n = this.cfg.sparks.n) {
    const r = this.rand, sp0 = this.cfg.sparks.speed;
    for (let j = 0; j < n; j++) {
      const i = this.kNext = (this.kNext + 1) % this.SPARKS;
      this.kPos[i * 3] = at.x; this.kPos[i * 3 + 1] = at.y; this.kPos[i * 3 + 2] = at.z;
      const sp = sp0 + r() * 2.2;
      this.kVel[i * 3] = (dir.x + (r() - 0.5) * 1.4) * sp; this.kVel[i * 3 + 1] = (dir.y + (r() - 0.5) * 1.4) * sp; this.kVel[i * 3 + 2] = (dir.z + (r() - 0.5) * 1.4) * sp;
      this.kLife[i] = 0; this.kRate[i] = 1.4 + r() * 2.2;
    }
  }
  /** Wybuch w `at` o promieniu `radius`: błysk i kule ognia (1.4 s). */
  blast(at, radius = this.cfg.explosion.radius) {
    const T = textures(), c = this.cfg.explosion, r = this.rand;
    const flash = sprite(T.glow, c.color); flash.position.copy(at); this.group.add(flash);
    const fires = []; for (let i = 0; i < c.fireballs; i++) { const f = sprite(T.glow, i % 2 ? c.fire : c.fire2); f.visible = false; this.group.add(f);
      fires.push({ s: f, off: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(radius * 0.8), delay: r() * 0.35 }); }
    this.blasts.push({ at: at.clone(), radius, flash, fires, t: 0 });
  }
  /** Spalenizna i ognik przy kotwicy (obiekt na części statku, +z na zewnątrz): { on, ember, size, damage }. */
  mark(anchor, m) {
    let k = this.marks.get(anchor);
    if (!k) {
      const decal = new THREE.Mesh(this.decalGeo, this.decalMat); decal.position.z = 0.012;
      const ember = sprite(textures().glow, this.cfg.ember.color); ember.position.z = 0.05;
      anchor.add(decal, ember); k = { decal, ember, phase: this.marks.size * 3 }; this.marks.set(anchor, k);
    }
    k.decal.visible = !!m.on && m.scorch !== false; k.decal.scale.setScalar((m.size || this.cfg.scorch.size) * (0.6 + 0.9 * (m.damage ?? 1)));
    k.ember.visible = !!m.on && !!m.ember; k.on = m.on;
  }
  unmark(anchor) { const k = this.marks.get(anchor); if (k) { anchor.remove(k.decal, k.ember); k.ember.material.dispose(); this.marks.delete(anchor); } }
  /** Jedna klatka (1/60 s). */
  step() {
    const dt = DT; this.t += dt; const r = this.rand;
    for (const [, k] of this.marks) if (k.ember.visible) k.ember.scale.setScalar(0.35 + 0.25 * Math.sin(this.t * 17 + k.phase) * Math.sin(this.t * 7 + k.phase));
    // dym (jak w ShipKit: każdy kłąb po swoim życiu wraca do jednego z emiterów)
    const E = this.emitters, N = this.SMOKE, S = this.cfg.smoke;
    this.smokePts.visible = E.length > 0 || this.sAlpha.some((a, i) => a > 0 && this.sLife[i] < 1);
    for (let i = 0; i < N; i++) {
      this.sLife[i] += dt * this.sRate[i];
      if (this.sLife[i] >= 1) {
        this.sLife[i] -= 1;
        const e = E.length ? E[i % E.length] : null;
        if (!e) { this.sAlpha[i] = 0; continue; }
        this.sPos[i * 3] = e.at.x + e.dir.x * 0.05; this.sPos[i * 3 + 1] = e.at.y + e.dir.y * 0.05; this.sPos[i * 3 + 2] = e.at.z + e.dir.z * 0.05;
        const sp = S.speed + r() * 0.25;
        this.sVel[i * 3] = e.dir.x * sp + (r() - 0.5) * 0.12; this.sVel[i * 3 + 1] = e.dir.y * sp + S.rise + (r() - 0.5) * 0.12; this.sVel[i * 3 + 2] = e.dir.z * sp + (r() - 0.5) * 0.12;
        this.sAlpha[i] = (e.alpha ?? 1) * S.alpha;
      }
      this.sPos[i * 3] += this.sVel[i * 3] * dt; this.sPos[i * 3 + 1] += this.sVel[i * 3 + 1] * dt; this.sPos[i * 3 + 2] += this.sVel[i * 3 + 2] * dt;
    }
    const sg = this.smokePts.geometry.attributes; sg.position.needsUpdate = sg.life.needsUpdate = sg.alpha.needsUpdate = true;
    // iskry
    const drag = Math.max(0, 1 - dt * this.cfg.sparks.drag);
    for (let i = 0; i < this.SPARKS; i++) {
      if (this.kLife[i] >= 1) continue;
      this.kLife[i] = Math.min(1, this.kLife[i] + dt * this.kRate[i]);
      this.kVel[i * 3] *= drag; this.kVel[i * 3 + 1] *= drag; this.kVel[i * 3 + 2] *= drag;
      this.kPos[i * 3] += this.kVel[i * 3] * dt; this.kPos[i * 3 + 1] += this.kVel[i * 3 + 1] * dt; this.kPos[i * 3 + 2] += this.kVel[i * 3 + 2] * dt;
    }
    const kg = this.sparkPts.geometry.attributes; kg.position.needsUpdate = kg.life.needsUpdate = true;
    // wybuchy: błysk 0.9 s, kule ognia 1.4 s po swoich opóźnieniach
    for (const b of this.blasts) {
      b.t += dt;
      b.flash.material.opacity = Math.max(0, 1 - b.t / 0.9); b.flash.scale.setScalar(b.radius * (0.8 + 4 * Math.min(1, b.t / 0.35))); b.flash.visible = b.t < 0.9;
      for (const f of b.fires) {
        const k = (b.t - f.delay) / 1.4; f.s.visible = k > 0 && k < 1; if (!f.s.visible) continue;
        f.s.position.copy(f.off).multiplyScalar(1 + k * 1.5).add(b.at); f.s.scale.setScalar(b.radius * (0.4 + 1.3 * Math.sqrt(k)));
        f.s.material.opacity = (1 - k) * (0.8 + 0.2 * Math.sin(this.t * 30));
      }
      if (b.t > 1.8) { b.done = true; this.group.remove(b.flash, ...b.fires.map((f) => f.s)); b.flash.material.dispose(); b.fires.forEach((f) => f.s.material.dispose()); }
    }
    this.blasts = this.blasts.filter((b) => !b.done);
  }
  get counts() { return { smoke: this.emitters.length, sparks: Array.from(this.kLife).filter((l) => l < 1).length, blasts: this.blasts.length, marks: [...this.marks.values()].filter((k) => k.on).length }; }
  clear() { this.emitters = []; this.sAlpha.fill(0); this.kLife.fill(1); for (const b of this.blasts) b.t = 99; this.step(); for (const a of [...this.marks.keys()]) this.unmark(a); }
  dispose() { this.clear(); this.parent.remove(this.group); this.smokePts.geometry.dispose(); this.smokePts.material.dispose(); this.sparkPts.geometry.dispose(); this.sparkPts.material.dispose(); }
}

// Uszkodzenia statku ShipKit rysowane przez DamageFx: co klatkę miejsca uszkodzeń (model.damageSites — kotwice na
// częściach: spalenizna i ognik, dym z aktywnych), iskry i wybuch ze zdarzeń modelu (model.onDamage).
export function shipDamage(model, fx) {
  const w = new THREE.Vector3(), n = new THREE.Vector3();
  model.onDamage = (e) => { if (e.type === 'sparks') fx.sparks(e.at, e.dir, e.n); else if (e.type === 'blast') fx.blast(e.at, e.radius); };
  return {
    step() {
      const d = model.damageView ? model.damageView() : null; if (!d) return;
      const em = [];
      for (const s of d.sites) {
        fx.mark(s.anchor, { on: s.on, ember: s.ember, size: s.size, damage: d.damage });
        if (s.on && d.particles) { s.anchor.getWorldPosition(w); n.set(0, 0, 1).transformDirection(s.anchor.matrixWorld); em.push({ at: w.clone(), dir: n.clone(), alpha: 0.35 + 0.65 * d.damage }); }
      }
      fx.smoke(em);
    },
    dispose() { const d = model.damageView ? model.damageView() : null; if (d) for (const s of d.sites) fx.unmark(s.anchor); fx.smoke([]); model.onDamage = null; },
  };
}
