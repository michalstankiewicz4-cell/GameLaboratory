// Scena prosta (z Tornado.io; laboratorium mechaniki — hala, w której nie ma terenu ani morza) w grafice laboratoriów: renderer z cieniami, niebo SkyKit
// z pogodą i porą dnia, światło słońca i nieba, mapa otoczenia z tego samego nieba, potok kamery LookPipeline
// (ekspozycja, tonemapping, bloom). Widok w wolnym środku między panelami (window.LabView, ui/shell/windows.js).
// createStage(viewEl, { far, shadow }) → { renderer, scene, camera, sun, hemi, look, setSky({ weather, sunEl, sunAz }),
//   follow(target, radius) — cień i słońce wokół punktu, render(), size() }
import * as THREE from '../../../vendor/three/three.module.js';
import { WEATHER, skyUniforms, skyDome, applySky, skyEnvironment } from '../../envs/sky/skykit.js';
import { LookPipeline, LOOK_PRESETS } from '../../render/sea/look.js';

const VS = () => (window.LabView && window.LabView.size ? window.LabView.size() : { w: innerWidth, h: innerHeight, x: 0, y: 0 });

export { WEATHER };
export function createStage(viewEl, { far = 6000, shadow = 2048 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  viewEl.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, far);
  const look = new LookPipeline(renderer); look.set(LOOK_PRESETS.clean);
  const skyU = skyUniforms(), sky = skyDome(skyU, far * 0.6); sky.renderOrder = -1; scene.add(sky);
  scene.fog = new THREE.FogExp2(0xc9d7e2, 0.0012);
  const hemi = new THREE.HemisphereLight(0xdfe6ec, 0x2a3a46, 0.8), sun = new THREE.DirectionalLight(0xfff0d8, 3);
  sun.castShadow = true; sun.shadow.mapSize.set(shadow, shadow); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
  scene.add(hemi, sun, sun.target);
  let envRT = null, envDirty = true, light = null, shadowR = 40;
  const sunDir = new THREE.Vector3(0.4, 0.8, 0.3);

  function setSky({ weather = 'fair', sunEl = 34, sunAz = 215, w = null } = {}) {
    const W = w || WEATHER[weather] || WEATHER.fair;
    light = applySky(skyU, { ...W, sunEl, sunAz, moon: 0.8 });
    sun.color.copy(light.sunColor); sun.intensity = light.sunIntensity; hemi.intensity = light.ambient; hemi.color.copy(light.sky); hemi.groundColor.copy(light.ground);
    sunDir.copy(light.sunDir);
    scene.fog.color.copy(light.fog); scene.fog.density = Math.max(0.0006, Math.min(0.02, light.fogDensity * 1.4));
    scene.environmentIntensity = (0.85 - W.coverage * W.density * 0.45) * (0.1 + 0.9 * light.day);
    look.sunVisible = Math.max(0, 1 - W.coverage * (0.4 + W.density * 0.6)) * light.sunSeen;
    look.set({ exposure: LOOK_PRESETS.clean.exposure * (1 + 2.6 * (1 - light.day)) });
    envDirty = true;
    return light;
  }
  // cień i słońce wokół punktu (kamera gry jeździ po mapie; cień obejmuje promień r)
  function follow(target, r = 40) {
    if (Math.abs(r - shadowR) > r * 0.15 || !sun.shadow.camera.userData.set) {
      shadowR = r;
      Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 8 });
      sun.shadow.camera.updateProjectionMatrix(); sun.shadow.camera.userData.set = true;
    }
    // przyciąganie do siatki tekseli — cień nie migocze przy ruchu
    const step = (2 * shadowR) / sun.shadow.mapSize.x, tx = Math.round(target.x / step) * step, tz = Math.round(target.z / step) * step;
    sun.target.position.set(tx, target.y, tz);
    sun.position.set(tx, target.y, tz).addScaledVector(sunDir, r * 3);
  }
  function size() { return VS(); }
  function resize() { const v = VS(); renderer.setSize(v.w, v.h, false); camera.aspect = v.w / v.h; camera.updateProjectionMatrix(); look.resize(v.w, v.h); }
  addEventListener('resize', resize);
  function render() {
    if (envDirty) { if (envRT) envRT.dispose(); envRT = skyEnvironment(renderer, skyU); scene.environment = envRT.texture; envDirty = false; }
    sky.position.copy(camera.position);
    look.sun(camera, sunDir);
    if (window.LabPerf) window.LabPerf.begin(renderer);
    look.render(scene, camera);
    if (window.LabPerf) window.LabPerf.end(renderer);
  }
  resize();
  return { renderer, scene, camera, sun, hemi, look, sky, setSky, follow, render, resize, size, get light() { return light; }, sunDir };
}
