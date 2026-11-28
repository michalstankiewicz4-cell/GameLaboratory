// LiquidKit — wygląd cieczy (warstwa obrazu, bez fizyki): woda i olej jako materiały fizyczne z załamaniem światła
// (transmission, ior), pochłanianiem w głębi (attenuation) i falującą powierzchnią (mapa normalnych z szumu bez szwów,
// przesuwana w czasie); strumień cieczy z dyszy lub kranu — ciągła struga po torze balistycznym (przekrój z ciągłości:
// r = r₀·√(v₀ / v)), rozpad na krople (wydłużone wzdłuż prędkości), rozbryzg i kręgi na powierzchni.
//   const w = waterMaterial()            — materiał wody (powierzchnia faluje: tickLiquids(dt) raz na klatkę)
//   const j = createJet({ d, material }) — j.group do sceny; j.update(dt, { origin, dir, v, floorY, on, g })
//   createRipples(material?)             — kręgi na powierzchni: r.add(x, y, z, siła); r.update(dt)
import * as THREE from '../../../vendor/three/three.module.js';

const G0 = 9.81, TEX = [];
// mapa normalnych z sumy fal o całkowitych częstotliwościach (kafel bez szwów)
function rippleNormalTex(seed = 1, size = 256, waves = 18) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), img = x.createImageData(size, size), h = new Float32Array(size * size);
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const W = []; for (let i = 0; i < waves; i++) { const k = 1 + Math.floor(rnd() * 6), a = rnd() * Math.PI * 2; W.push([Math.round(Math.cos(a) * k), Math.round(Math.sin(a) * k), rnd() * Math.PI * 2, 1 / (k + 0.5)]); }
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { let v = 0; for (const [kx, ky, ph, am] of W) v += am * Math.sin((kx * i + ky * j) / size * Math.PI * 2 + ph); h[j * size + i] = v; }
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const dx = h[j * size + ((i + 1) % size)] - h[j * size + ((i - 1 + size) % size)], dy = h[((j + 1) % size) * size + i] - h[((j - 1 + size) % size) * size + i];
    const nx = -dx * 2, ny = -dy * 2, nz = 1, l = Math.hypot(nx, ny, nz), o = (j * size + i) * 4;
    img.data[o] = (nx / l * 0.5 + 0.5) * 255; img.data[o + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[o + 2] = (nz / l * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace;
  return t;
}
let BASE = null;
const baseTex = () => BASE || (BASE = rippleNormalTex(7));
// tekstura z przesuwem (własne przesunięcie, wspólny obraz); speed — [u, v] na sekundę
function animTex(repeat = 1, speed = [0.02, 0.013]) { const t = baseTex().clone(); t.needsUpdate = true; t.repeat.set(repeat, repeat); t.userData.speed = speed; TEX.push(t); return t; }
export function tickLiquids(dt) { for (const t of TEX) { t.offset.x = (t.offset.x + t.userData.speed[0] * dt) % 1; t.offset.y = (t.offset.y + t.userData.speed[1] * dt) % 1; } }

// woda: kolor przy grubej warstwie z pochłaniania (czerwony ginie najszybciej) — przejrzysta, lekko błękitna w głębi
export function waterMaterial({ repeat = 3, speed = [0.03, 0.02], tint = 0x6fb8d8, depth = 0.6, normal = 0.35 } = {}) {
  return new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.05, ior: 1.333, attenuationColor: new THREE.Color(tint), attenuationDistance: depth,
    specularIntensity: 1, normalMap: animTex(repeat, speed), normalScale: new THREE.Vector2(normal, normal), transparent: true, opacity: 1, side: THREE.FrontSide, envMapIntensity: 1.2 });
}
// olej hydrauliczny HLP: bursztynowy, gęsty, gładka powierzchnia
export function oilMaterial({ depth = 0.03 } = {}) {
  return new THREE.MeshPhysicalMaterial({ color: 0xfff2d0, metalness: 0, roughness: 0.04, transmission: 0.92, thickness: 0.01, ior: 1.47, attenuationColor: new THREE.Color(0xb8781a), attenuationDistance: depth,
    specularIntensity: 1, normalMap: animTex(2, [0.004, 0.003]), normalScale: new THREE.Vector2(0.08, 0.08), transparent: true });
}
// płynąca struga: mapa normalnych przesuwana wzdłuż strugi (prędkość ustawiana co klatkę)
function streamMaterial(kind = 'water') {
  const m = kind === 'oil' ? oilMaterial() : waterMaterial({ repeat: 1, speed: [0, 0], normal: 0.6 });
  m.normalMap.repeat.set(1, 6); return m;
}

/* ---------------- strumień ---------------- */
export function createJet({ d = 0.008, kind = 'water', seg = 64, radial = 14, drops = 160, breakRatio = 0.3 } = {}) {
  const group = new THREE.Group(), mat = streamMaterial(kind);
  // struga: pierścienie wzdłuż toru, pozycje liczone co klatkę
  const nV = (seg + 1) * (radial + 1), pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), uv = new Float32Array(nV * 2), idx = [];
  for (let i = 0; i < seg; i++) for (let k = 0; k < radial; k++) { const a = i * (radial + 1) + k, b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  for (let i = 0; i <= seg; i++) for (let k = 0; k <= radial; k++) { const o = (i * (radial + 1) + k) * 2; uv[o] = k / radial; uv[o + 1] = i / seg; }
  const geo = new THREE.BufferGeometry(); geo.setIndex(idx); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const stream = new THREE.Mesh(geo, mat); stream.visible = false; stream.frustumCulled = false; stream.userData.doctorOk = 'clash'; group.add(stream);
  // krople po rozpadzie strugi i rozbryzgu: kule wydłużane wzdłuż prędkości
  const dm = waterMaterial({ repeat: 1, normal: 0.2 }), dropMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), kind === 'oil' ? oilMaterial() : dm, drops);
  dropMesh.frustumCulled = false; dropMesh.userData.doctorOk = 'clash'; group.add(dropMesh);
  { const z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < drops; i++) dropMesh.setMatrixAt(i, z); }   // bez kropel na starcie (obwiednia modelu)
  const D = Array.from({ length: drops }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: 0, life: -1, splash: false }));
  const ripples = createRipples(); group.add(ripples.group);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
  let spawnAcc = 0, flowS = 0, seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
  const spawn = (p, v, r, splash) => { const o = D.find((x) => x.life < 0); if (!o) return; o.p.copy(p); o.v.copy(v); o.r = r; o.life = 0; o.splash = splash; };
  // origin, dir (jednostkowy), v — prędkość wylotu [m/s], floorY — wysokość powierzchni, na którą spada
  function update(dt, { origin, dir, v, floorY = -Infinity, on = true, g = G0 }) {
    const r0 = d / 2, V0 = dir.clone().normalize().multiplyScalar(v), active = on && v > 0.05;
    // koniec strugi: przy wznoszeniu — gdy prędkość spadnie do breakRatio·v₀ (słup się rozpada), inaczej — powierzchnia
    const yAt = (t) => origin.y + V0.y * t - g * t * t / 2, tHit = (() => { const a = -g / 2, b = V0.y, c = origin.y - floorY; const disc = b * b - 4 * a * c; return disc < 0 ? 0 : (-b - Math.sqrt(disc)) / (2 * a); })();
    let tEnd = isFinite(tHit) && tHit > 0 ? tHit : 2, broken = false;
    if (V0.y > 0) { const vb = breakRatio * v; const tb = (V0.y - Math.sqrt(Math.max(0, vb * vb - (V0.x ** 2 + V0.z ** 2)))) / g; if (vb * vb > V0.x ** 2 + V0.z ** 2 && tb < tEnd) { tEnd = Math.max(0.001, tb); broken = true; } }
    const lenMax = 0.6 + 120 * d; let len = 0;   // struga opadająca rozpada się po długości ok. (0,6 m + 120 d)
    stream.visible = active;
    if (active) {
      const P = (t) => tmp.set(origin.x + V0.x * t, yAt(t), origin.z + V0.z * t);
      let prev = P(0).clone(), tCut = tEnd;
      for (let i = 1; i <= 40; i++) { const t = tEnd * i / 40, p = P(t).clone(); len += p.distanceTo(prev); prev = p; if (len > lenMax) { tCut = t; broken = true; break; } }
      tEnd = tCut;
      const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3();
      for (let i = 0; i <= seg; i++) {
        const t = tEnd * i / seg, c = P(t).clone(); T.set(V0.x, V0.y - g * t, V0.z); const sp = Math.max(0.05 * v, T.length()); T.normalize();
        let r = r0 * Math.min(2.2, Math.sqrt(v / sp)); if (broken && i > seg * 0.85) r *= 1 - (i - seg * 0.85) / (seg * 0.15) * 0.7;   // zwężenie przed rozpadem
        N.copy(Math.abs(T.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : up).cross(T).normalize(); B.crossVectors(T, N);
        for (let k = 0; k <= radial; k++) {
          const a = k / radial * Math.PI * 2, w = 1 + 0.06 * Math.sin(a * 3 + i * 0.7 + flowS * 40), cx = Math.cos(a), sy = Math.sin(a), o = (i * (radial + 1) + k) * 3;   // drobne falowanie powierzchni strugi
          pos[o] = c.x + (N.x * cx + B.x * sy) * r * w; pos[o + 1] = c.y + (N.y * cx + B.y * sy) * r * w; pos[o + 2] = c.z + (N.z * cx + B.z * sy) * r * w;
          nor[o] = N.x * cx + B.x * sy; nor[o + 1] = N.y * cx + B.y * sy; nor[o + 2] = N.z * cx + B.z * sy;
        }
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true; geo.computeBoundingSphere();
      flowS += v * dt; mat.normalMap.offset.y = -flowS / Math.max(0.05, len) * 6 % 1;
      // krople: z końca strugi (rozpad) albo rozbryzg przy powierzchni
      const pe = P(tEnd).clone(), ve = new THREE.Vector3(V0.x, V0.y - g * tEnd, V0.z), rate = broken ? 120 : 45;
      spawnAcc += dt * rate * Math.min(1, v / 2);
      while (spawnAcc > 1) {
        spawnAcc -= 1;
        if (broken) spawn(pe, ve.clone().add(new THREE.Vector3(rnd() * 0.25 * v, rnd() * 0.15 * v, rnd() * 0.25 * v)), r0 * (0.6 + 0.6 * (rnd() + 0.5)), false);
        else spawn(pe.clone().setY(floorY + 0.002), new THREE.Vector3(rnd() * 0.6, 0.3 + 0.5 * (rnd() + 0.5), rnd() * 0.6).multiplyScalar(Math.min(1.5, Math.abs(ve.y) * 0.35)), r0 * 0.35, true);
      }
      if (!broken && Math.random() < dt * 8) ripples.add(pe.x, floorY + 0.0005, pe.z, Math.min(1, v / 3));
    }
    // ruch kropel (grawitacja), uderzenie w powierzchnię → krąg i drobny rozbryzg
    for (let i = 0; i < drops; i++) {
      const o = D[i];
      if (o.life < 0) { m4.makeScale(0, 0, 0); dropMesh.setMatrixAt(i, m4); continue; }
      o.life += dt; o.v.y -= g * dt; o.p.addScaledVector(o.v, dt);
      if (o.p.y < floorY) { if (!o.splash) { ripples.add(o.p.x, floorY + 0.0005, o.p.z, Math.min(1, o.r / r0 * 0.5)); if (Math.random() < 0.35) spawn(o.p.clone().setY(floorY + 0.002), new THREE.Vector3(rnd() * 0.4, 0.5 + rnd() * 0.3, rnd() * 0.4).multiplyScalar(Math.min(1.2, -o.v.y * 0.3)), o.r * 0.4, true); } o.life = -1; m4.makeScale(0, 0, 0); dropMesh.setMatrixAt(i, m4); continue; }
      if (o.life > 4) { o.life = -1; continue; }
      const sp = o.v.length(), st = 1 + Math.min(2.5, sp * 0.25);   // kropla wydłużona w kierunku ruchu
      q.setFromUnitVectors(up, sp > 1e-4 ? tmp.copy(o.v).divideScalar(sp) : up); sc.set(o.r / Math.sqrt(st), o.r * st, o.r / Math.sqrt(st));
      m4.compose(o.p, q, sc); dropMesh.setMatrixAt(i, m4);
    }
    dropMesh.instanceMatrix.needsUpdate = true;
    ripples.update(dt);
  }
  return { group, update, material: mat };
}

/* ---------------- kręgi na powierzchni ---------------- */
export function createRipples(n = 24) {
  const group = new THREE.Group(), rings = [];
  const tex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 8; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 8); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  for (let i = 0; i < n; i++) {
    const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0, alphaMap: tex, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    const geo = new THREE.RingGeometry(0.2, 1, 32, 1); const uv = geo.attributes.uv, p = geo.attributes.position; for (let k = 0; k < uv.count; k++) { const r = Math.hypot(p.getX(k), p.getY(k)); uv.setXY(k, (r - 0.2) / 0.8, 0.5); }
    const o = new THREE.Mesh(geo.rotateX(-Math.PI / 2), m); o.visible = false; o.scale.setScalar(1e-4); o.userData.doctorOk = 'clash'; o.renderOrder = 2; group.add(o); rings.push({ o, t: -1, s: 1 });
  }
  let next = 0;
  return { group,
    add(x, y, z, s = 1) { const r = rings[next]; next = (next + 1) % n; r.o.position.set(x, y, z); r.t = 0; r.s = s; r.o.visible = true; },
    update(dt) { for (const r of rings) { if (r.t < 0) continue; r.t += dt; const life = 1.2; if (r.t > life) { r.t = -1; r.o.visible = false; continue; } const R = 0.004 + 0.12 * r.t * (0.6 + 0.4 * r.s); r.o.scale.set(R, 1, R); r.o.material.opacity = 0.45 * r.s * (1 - r.t / life) ** 1.5; } } };
}
