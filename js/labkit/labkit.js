/* =======================================================================
   LabKit — what the labs from Space share around their models: slider
   fills, toggle buttons, the performance counters, the IMAGE EFFECTS
   render (LookPipeline with the space effects), the windows fading out when idle and the camera look
   panel (look-panel.js). window.LabKit, loaded as a module after
   js/core/three-global.js. Styles: ui/style/space.css.
   ======================================================================= */
import "./look-panel.js";   // grafika Battle: panel kamery z laboratoriów wodnych (window.LabLook)
window.LabKit = (function () {
"use strict";
const $ = (id) => document.getElementById(id);

// A range input's gold fill up to its value (ui/style/space.css reads --fill).
function paintSlider(s) {
  s.style.setProperty("--fill", ((s.value - s.min) / (s.max - s.min) * 100) + "%");
}

// An on/off button (.tBtn): flips state[key], lights up, calls apply(on).
function toggle(id, state, key, apply) {
  const b = $(id);
  b.addEventListener("click", () => { state[key] = !state[key]; b.classList.toggle("on", state[key]); apply(state[key]); });
}

// Soft radial glow sprite texture.
function makeGlow(inner = "rgba(255,255,255,1)", mid = "rgba(255,200,120,0.5)") {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d"), g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(0.25, mid); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// IMAGE EFFECTS: the camera's picture, not part of the model — the camera look of the water labs (LookPipeline,
// look-panel.js) with the space effects (js/render/space-fx.js). render(focusPos, focusRadius, extra) replaces
// renderer.render; `extra(options)` adds per-lab steps (a sun's flare, a black hole's lensing). (PostKit, the
// Space game's post-processing, was removed in 0.56.0.)
// Render sceny: w trybie grafiki Battle przez potok kamery z laboratoriów wodnych (ustawienie „Game clean”, jeden na
// renderer), inaczej zwykłe renderer.render — dla laboratoriów bez panelu obrazu.
function render(renderer, scene, camera) {
  if (!window.LabLook) { renderer.render(scene, camera); return; }
  (renderer.__labLook || (renderer.__labLook = window.LabLook.cleanPipeline(renderer))).render(scene, camera);
}

function imageEffects({ renderer, scene, camera, panel }) {
  // potok kamery z laboratoriów wodnych (LookPipeline, js/labkit/look-panel.js) z efektami kosmosu (js/render/space-fx.js)
  return window.LabLook.battleImageEffects({ renderer, scene, camera, panel });
}

// Every window of the page (data-window, ui/shell/windows.js) fades out after `seconds` without a mouse move, click,
// scroll or key, and comes back at the next one (like the game's Setup -> Mouse option). Not while the pointer rests
// on a window or a field in it has the focus (a reader, a typist). Styles: ui/style/space.css .labIdle.
function autoHideWindows(seconds = 5) {
  const panels = [...document.querySelectorAll("[data-window]")];
  let last = performance.now(), hidden = false, over = 0;
  const show = () => {
    last = performance.now();
    if (hidden) { hidden = false; panels.forEach((p) => p.classList.remove("labIdle")); }
  };
  ["pointermove", "pointerdown", "wheel", "keydown", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, show, { capture: true, passive: true }));
  panels.forEach((p) => {
    p.addEventListener("pointerenter", () => { over++; });
    p.addEventListener("pointerleave", () => { over = Math.max(0, over - 1); });
  });
  setInterval(() => {
    if (hidden || over > 0 || performance.now() - last < seconds * 1000) return;
    const a = document.activeElement;
    if (a && panels.some((p) => p.contains(a)) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
    hidden = true;
    panels.forEach((p) => p.classList.add("labIdle"));
  }, 250);
}

return { paintSlider, toggle, makeGlow, imageEffects, autoHideWindows, render };
})();
