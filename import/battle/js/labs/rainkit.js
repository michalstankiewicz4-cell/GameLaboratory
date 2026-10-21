// RainKit: falling rain around the camera in one draw call. Each drop is a short line (its motion blur) in a box that
// follows the camera and wraps, so the rain never runs out; wind slants it, distance and the fog fade it.
// Units: metres, seconds. rain(u) returns the mesh; set u.uRain (0..1), u.uWindR (m/s, x/z), u.uTimeR every frame.
import * as THREE from '../../vendor/three.module.js';

export function rainUniforms() {
  return {
    uRain: { value: 0 }, uTimeR: { value: 0 }, uWindR: { value: new THREE.Vector2() }, uRainCol: { value: new THREE.Color(0xc8d0d6) },
    uBox: { value: new THREE.Vector3(70, 45, 70) }, uFall: { value: 8.5 }, uStreak: { value: 0.045 },
  };
}

export function rainMesh(u, maxDrops = 24000) {
  const seed = new Float32Array(maxDrops * 2 * 4);
  for (let i = 0; i < maxDrops; i++) {
    const x = Math.random(), y = Math.random(), z = Math.random(), r = Math.random();
    seed.set([x, y, z, r * 0.999], i * 8); seed.set([x, y, z, 1 + r * 0.999], i * 8 + 4);   // w: 0..1 top end, 1..2 bottom end; fract = per-drop random
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(maxDrops * 6), 3));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.NormalBlending, fog: false,
    vertexShader: /* glsl */`
      uniform float uRain, uTimeR, uFall, uStreak; uniform vec2 uWindR; uniform vec3 uBox;
      attribute vec4 aSeed; varying float vA;
      void main() {
        float rnd = fract(aSeed.w), bottom = step(1.0, aSeed.w);
        float fall = uFall * (0.8 + 0.4 * rnd);
        vec3 vel = vec3(uWindR.x, -fall, uWindR.y);
        vec3 p = aSeed.xyz * uBox + vel * uTimeR;
        vec3 origin = cameraPosition - uBox * 0.5;
        p = origin + mod(p - origin, uBox);                       // wrap into the box around the camera
        p -= vel * uStreak * bottom;                              // the tail: where the drop was a moment ago
        float d = length(p - cameraPosition);
        vA = (1.0 - bottom * 0.85) * smoothstep(uBox.x * 0.5, uBox.x * 0.2, d) * smoothstep(0.4, 1.5, d) * step(-0.2, p.y);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uRain; uniform vec3 uRainCol; varying float vA;
      void main() { gl_FragColor = vec4(uRainCol, vA * (0.18 + 0.22 * uRain)); }`,
  });
  const mesh = new THREE.LineSegments(g, m);
  mesh.frustumCulled = false; mesh.renderOrder = 3;
  mesh.setRain = (amount) => { g.setDrawRange(0, Math.round(maxDrops * Math.min(1, amount)) * 2); mesh.visible = amount > 0.005; };
  mesh.setRain(0);
  return mesh;
}
