// Dym i iskry na lądzie — z aTrain (js/app.js, „Efekty: dym, iskry”): cząstki z grawitacją i powietrzem, w metrach
// sceny. Dym unosi się (wypór), zwalnia w powietrzu, rośnie, bierze prędkość źródła i ciemnieje nocą; iskry spadają
// z przyspieszeniem ziemskim i odbijają się od gruntu. Ile ich i skąd — mówi to, co je wyrzuca (np. fizyka pociągu:
// js/render/effects/rail-fx.js — dym z obciążenia silnika, iskry z mocy tarcia kół). Liczby jak w aTrain.
//
// new LandFx(parent, cfg) — cfg: { smokeLand, sparksLand } (LAND_DEFAULTS)
//   (w laboratorium efektów: smokeLand — źródło dymu przez `frames` klatek, rate + rateLoad × load kłębów na sekundę;
//   sparksLand — seria `n` iskier)
//   smoke(at, vel, load) — jeden kłąb: at [x, y, z], vel — prędkość źródła [x, y, z] (m/s), load 0…1 (moc, siła)
//   sparks(at, vel, ground) — jedna iskra: at, vel źródła, ground — wysokość gruntu (odbicie)
//   light — 0…1, jasność dymu (noc: ok. 0.15), step(dt), clear(), dispose(), counts
import * as THREE from '../../../vendor/three/three.module.js';

export const LAND_DEFAULTS = {
  smokeLand: { max: 110, life: 3.2, lifeJitter: 1.8, size: 0.5, sizeLoad: 0.3, grow: 3.6, rise: 1.8, riseLoad: 2.2, buoyancy: 0.35, drag: 1.1, spread: 0.4, carry: 0.75, alpha: 0.5, rate: 2.5, rateLoad: 32, frames: 90, color: 0x575757 },
  sparksLand: { max: 220, life: 0.18, lifeJitter: 0.3, size: 0.06, sizeJitter: 0.04, up: 1, upJitter: 3.5, spread: 3, carry: 0.4, gravity: 9.81, bounce: 0.3, n: 40, color: 0xffaa3c },
};

let TEX = null;
function textures() {
  if (TEX) return TEX;
  const canvas = () => { const c = document.createElement('canvas'); c.width = c.height = 128; return c; };
  // kłąb dymu: miękka plama z szumu (26 plam, ziarno 77 jak w aTrain)
  const p = canvas(), x = p.getContext('2d'); let s = 77;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < 26; i++) {
    const px = 40 + r() * 48, py = 40 + r() * 48, sz = 18 + r() * 26, g = x.createRadialGradient(px, py, 0, px, py, sz);
    g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  }
  // iskra: jasny środek, pomarańczowa otoczka
  const k = canvas(), y = k.getContext('2d'), g = y.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,170,60,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); y.fillStyle = g; y.fillRect(0, 0, 128, 128);
  TEX = { puff: new THREE.CanvasTexture(p), spark: new THREE.CanvasTexture(k) };
  return TEX;
}

// cząstki jako Points z własnym rozmiarem (metry), przezroczystością i barwą na punkt — jedno wywołanie rysowania
function pool(parent, N, tex, additive) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N), col = new Float32Array(N * 3);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { map: { value: tex }, uH: { value: 800 } },
    vertexShader: `attribute float aSize; attribute float aAlpha; attribute vec3 aCol; varying float vA; varying vec3 vC; uniform float uH;
      void main(){ vA = aAlpha; vC = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        bool ortho = projectionMatrix[3][3] > 0.5;
        gl_PointSize = aAlpha <= 0.0 ? 0.0 : aSize * projectionMatrix[1][1] * 0.5 * uH / (ortho ? 1.0 : max(0.1, -mv.z)); }`,
    fragmentShader: `uniform sampler2D map; varying float vA; varying vec3 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC * t.rgb, t.a * vA); }`,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.name = additive ? 'sparks (land)' : 'smoke (land)';
  const vp = new THREE.Vector4();
  pts.onBeforeRender = (renderer) => { renderer.getCurrentViewport(vp); m.uniforms.uH.value = vp.w; };   // rozmiar w pikselach z wysokości obrazu
  parent.add(pts);
  return { N, pts, pos, size, alpha, col, g, m, vel: new Float32Array(N * 3), age: new Float32Array(N).fill(1e9), life: new Float32Array(N).fill(1), s0: new Float32Array(N), next: 0 };
}

export class LandFx {
  constructor(parent, cfg = LAND_DEFAULTS) {
    this.cfg = { smokeLand: { ...LAND_DEFAULTS.smokeLand, ...(cfg.smokeLand || {}) }, sparksLand: { ...LAND_DEFAULTS.sparksLand, ...(cfg.sparksLand || {}) } };
    const T = textures();
    this.group = new THREE.Group(); this.group.name = 'land smoke and sparks'; parent.add(this.group);
    this.sm = pool(this.group, Math.max(1, Math.round(this.cfg.smokeLand.max)), T.puff, false);
    this.sp = pool(this.group, Math.max(1, Math.round(this.cfg.sparksLand.max)), T.spark, true);
    this.ground = new Float32Array(this.sp.N);
    this.light = 1;
    // dym: barwa sRGB → liniowa (obraz liczony liniowo; aTrain pisał 0.34 wprost do obrazu sRGB — ta sama szarość);
    // iskry: barwa wprost — mnożniki aTrain (3.0, 1.6 − t, 0.5 − 0.4 t) dają jasność ponad 1 (poświata)
    const rgb = (h) => ({ r: ((h >> 16) & 255) / 255, g: ((h >> 8) & 255) / 255, b: (h & 255) / 255 });
    this.smokeRGB = new THREE.Color(this.cfg.smokeLand.color); this.sparkRGB = rgb(this.cfg.sparksLand.color);
  }
  _spawn(pl, at, vx, vy, vz, life, s0) {
    const i = pl.next; pl.next = (i + 1) % pl.N;
    pl.pos[i * 3] = at[0]; pl.pos[i * 3 + 1] = at[1]; pl.pos[i * 3 + 2] = at[2]; pl.vel[i * 3] = vx; pl.vel[i * 3 + 1] = vy; pl.vel[i * 3 + 2] = vz;
    pl.age[i] = 0; pl.life[i] = life; pl.s0[i] = s0; return i;
  }
  /** Jeden kłąb dymu z `at`, ze źródła o prędkości `vel`, przy obciążeniu `load` 0…1. */
  smoke(at, vel = [0, 0, 0], load = 0) {
    const c = this.cfg.smokeLand, r = Math.random;
    this._spawn(this.sm, at, vel[0] * c.carry + (r() - 0.5) * c.spread, c.rise + c.riseLoad * load + r() * c.spread, vel[2] * c.carry + (r() - 0.5) * c.spread,
      c.life + r() * c.lifeJitter, c.size + load * c.sizeLoad);
  }
  /** Jedna iskra z `at`, ze źródła o prędkości `vel`; odbija się od gruntu na wysokości `ground`. */
  sparks(at, vel = [0, 0, 0], ground = -Infinity) {
    const c = this.cfg.sparksLand, r = Math.random;
    const i = this._spawn(this.sp, at, vel[0] * c.carry + (r() - 0.5) * c.spread, c.up + r() * c.upJitter, vel[2] * c.carry + (r() - 0.5) * c.spread,
      c.life + r() * c.lifeJitter, c.size + r() * c.sizeJitter);
    this.ground[i] = ground;
  }
  /** Ruch cząstek o `dt` sekund (bez alokacji). */
  step(dt) {
    const S = this.sm, c = this.cfg.smokeLand, dsm = Math.exp(-c.drag * dt), sh = this.smokeRGB, light = this.light;
    for (let i = 0; i < S.N; i++) {
      const a = S.age[i] += dt, t = a / S.life[i], k = i * 3;
      if (t >= 1) { S.alpha[i] = 0; continue; }
      S.vel[k] *= dsm; S.vel[k + 2] *= dsm; S.vel[k + 1] = S.vel[k + 1] * dsm + c.buoyancy * dt;
      S.pos[k] += S.vel[k] * dt; S.pos[k + 1] += S.vel[k + 1] * dt; S.pos[k + 2] += S.vel[k + 2] * dt;
      S.size[i] = S.s0[i] + t * c.grow; S.alpha[i] = c.alpha * Math.min(1, t * 8) * Math.pow(1 - t, 1.4);
      const f = (1 + 0.1 / 0.34 * t) * light;   // aTrain: (0.34 + 0.1 t) × jasność
      S.col[k] = sh.r * f; S.col[k + 1] = sh.g * f; S.col[k + 2] = sh.b * f * 1.03;
    }
    const P = this.sp, q = this.cfg.sparksLand, kc = this.sparkRGB;
    for (let i = 0; i < P.N; i++) {
      const a = P.age[i] += dt, t = a / P.life[i], k = i * 3;
      if (t >= 1) { P.alpha[i] = 0; continue; }
      P.vel[k + 1] -= q.gravity * dt;
      P.pos[k] += P.vel[k] * dt; P.pos[k + 1] += P.vel[k + 1] * dt; P.pos[k + 2] += P.vel[k + 2] * dt;
      if (P.pos[k + 1] < this.ground[i]) { P.pos[k + 1] = this.ground[i]; P.vel[k + 1] *= -q.bounce; }
      // barwa jak w aTrain (3.0, 1.6 − t, 0.5 − 0.4 t przy pomarańczowej iskrze), skalowana barwą z ustawień
      P.size[i] = P.s0[i]; P.alpha[i] = 1 - t;
      P.col[k] = 3.0 * kc.r; P.col[k + 1] = (1.6 - t) / 0.667 * kc.g; P.col[k + 2] = Math.max(0, 0.5 - 0.4 * t) / 0.235 * kc.b;
    }
    for (const pl of [S, P]) { const g = pl.g.attributes; g.position.needsUpdate = g.aSize.needsUpdate = g.aAlpha.needsUpdate = g.aCol.needsUpdate = true; }
  }
  get counts() { const live = (pl) => { let n = 0; for (let i = 0; i < pl.N; i++) if (pl.age[i] < pl.life[i]) n++; return n; }; return { smokeLand: live(this.sm), sparksLand: live(this.sp) }; }
  clear() { for (const pl of [this.sm, this.sp]) { pl.age.fill(1e9); pl.alpha.fill(0); pl.g.attributes.aAlpha.needsUpdate = true; } }
  dispose() { for (const pl of [this.sm, this.sp]) { pl.g.dispose(); pl.m.dispose(); } this.group.removeFromParent(); }
}
