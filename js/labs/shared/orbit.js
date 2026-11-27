// Kamera orbitalna laboratoriów: stan (cel, odległość, obrót, pochylenie) i wspólne wzory — obrót przeciąganiem, przybliżanie
// kółkiem (wykładniczo), położenie kamery na sferze wokół celu, przesuwanie W A S D. Zdarzenia myszy zostają
// w laboratorium (kliknięcia, wybór, sterowanie na modelu są różne), laboratorium woła tylko rotate / zoomBy / place.
//   createOrbit({ target, dist, yaw, pitch, pitchMin, pitchMax, distMin, distMax, rot, tilt, zoom, …własne pola })
//     → orbit: te pola (target — THREE.Vector3) i
//       rotate(dx, dy)        przeciąganie o dx, dy pikseli (yaw −= dx·rot, pitch += dy·tilt w granicach)
//       zoomBy(deltaY)        kółko: dist · exp(deltaY · zoom) w granicach
//       place(camera, lift)   kamera na sferze wokół celu (lift — dodatkowa wysokość celu) i patrzy na cel
//       position(camera, lift) samo położenie na sferze (laboratorium samo kieruje kamerę)
//       pan(forward, side, v) przesunięcie celu w płaszczyźnie (W A S D) o v w kierunku patrzenia
import * as THREE from '../../../vendor/three/three.module.js';

export function createOrbit(o = {}) {
  const { pitchMin = -0.05, pitchMax = 1.5, distMin = 0.1, distMax = 4000, rot = 0.005, tilt = 0.004, zoom = 0.0011, ...rest } = o;
  const orbit = Object.assign({ target: new THREE.Vector3(), dist: 10, yaw: 0.7, pitch: 0.2 }, rest);
  orbit.limits = { pitchMin, pitchMax, distMin, distMax, rot, tilt, zoom };
  orbit.rotate = (dx, dy) => { const L = orbit.limits; orbit.yaw -= dx * L.rot; orbit.pitch = Math.max(L.pitchMin, Math.min(L.pitchMax, orbit.pitch + dy * L.tilt)); };
  orbit.zoomBy = (deltaY) => { const L = orbit.limits; orbit.dist = Math.min(L.distMax, Math.max(L.distMin, orbit.dist * Math.exp(deltaY * L.zoom))); };
  orbit.place = (camera, lift = 0) => {
    const c = Math.cos(orbit.pitch), t = orbit.target;
    camera.position.set(t.x + Math.sin(orbit.yaw) * c * orbit.dist, t.y + lift + Math.sin(orbit.pitch) * orbit.dist, t.z + Math.cos(orbit.yaw) * c * orbit.dist);
    camera.lookAt(t.x, t.y + lift, t.z);
  };
  orbit.position = (camera, lift = 0) => {   // samo położenie (laboratorium patrzy kamerą po swojemu)
    const c = Math.cos(orbit.pitch), t = orbit.target;
    camera.position.set(t.x + Math.sin(orbit.yaw) * c * orbit.dist, t.y + lift + Math.sin(orbit.pitch) * orbit.dist, t.z + Math.cos(orbit.yaw) * c * orbit.dist);
  };
  orbit.pan = (f, s, v) => { const fx = -Math.sin(orbit.yaw), fz = -Math.cos(orbit.yaw); orbit.target.x += (fx * f - fz * s) * v; orbit.target.z += (fz * f + fx * s) * v; };
  return orbit;
}
