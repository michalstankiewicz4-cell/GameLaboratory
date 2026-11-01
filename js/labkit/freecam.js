// A free camera for looking around inside a model (a cave, a building): all by mouse — drag to look, wheel to move
// forward and back, right-drag to move sideways and up — and W/A/S/D, Q/E (down/up), Shift (faster) for those who
// prefer keys. No collisions: it flies through walls.
//   const cam = new FreeCam(camera, canvas, { speed: 4 }); cam.place(pos, yaw, pitch); each frame: cam.update(dt)
import * as THREE from '../../vendor/three/three.module.js';

export class FreeCam {
  constructor(camera, el, { speed = 4 } = {}) {
    this.camera = camera; this.el = el; this.speed = speed; this.enabled = true;
    this.pos = camera.position.clone(); this.yaw = 0; this.pitch = 0; this.keys = new Set(); this.push = 0;
    let drag = null;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => { if (!this.enabled) return; drag = { x: e.clientX, y: e.clientY, b: e.button }; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      if (drag.b === 0) { this.yaw -= dx * 0.004; this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch - dy * 0.004)); }
      else { const r = this.right(), s = this.speed * 0.01; this.pos.addScaledVector(r, -dx * s); this.pos.y += dy * s; }
    });
    const up = () => { drag = null; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => { if (!this.enabled) return; e.preventDefault(); this.push += -Math.sign(e.deltaY) * this.speed * 0.35; }, { passive: false });
    addEventListener('keydown', (e) => { if (e.target.closest && e.target.closest('input, select, textarea')) return; this.keys.add(e.code); });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }
  forward() { return new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch)); }
  right() { return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); }
  place(pos, yaw = this.yaw, pitch = 0) { this.pos.copy(pos); this.yaw = yaw; this.pitch = pitch; this.push = 0; this.update(0); }
  lookAt(target) {
    const d = target.clone().sub(this.pos); this.yaw = Math.atan2(-d.x, -d.z); this.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  }
  update(dt) {
    if (this.enabled) {
      const k = this.keys, s = this.speed * (k.has('ShiftLeft') || k.has('ShiftRight') ? 3 : 1) * dt, f = this.forward(), r = this.right();
      if (k.has('KeyW')) this.pos.addScaledVector(f, s);
      if (k.has('KeyS')) this.pos.addScaledVector(f, -s);
      if (k.has('KeyA')) this.pos.addScaledVector(r, -s);
      if (k.has('KeyD')) this.pos.addScaledVector(r, s);
      if (k.has('KeyE')) this.pos.y += s;
      if (k.has('KeyQ')) this.pos.y -= s;
      if (this.push) { const m = this.push * Math.min(1, dt * 8); this.pos.addScaledVector(f, m); this.push -= m; if (Math.abs(this.push) < 1e-3) this.push = 0; }
    }
    this.camera.position.copy(this.pos);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
