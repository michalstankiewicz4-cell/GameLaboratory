/* =======================================================================
   LabKit — what the labs from Space share around their models: slider
   fills, toggle buttons, the performance counters, the IMAGE EFFECTS
   render (PostKit), the windows fading out when idle and the camera look
   panel (look-panel.js). window.LabKit, loaded as a module after
   js/core/three-global.js. Styles: ui/space.css.
   ======================================================================= */
import "./look-panel.js";   // grafika Battle: panel kamery z laboratoriów wodnych (window.LabLook)
window.LabKit = (function () {
"use strict";
const $ = (id) => document.getElementById(id);

// A range input's gold fill up to its value (ui/space.css reads --fill).
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

// Performance counters (#statFps, #statMs, #statCpu, #statTris, #statCalls)
// and the FPS graph (#fpsGraph), refreshed every 250 ms.
function perfCounters(renderer) {
  const graph = $("fpsGraph"), gctx = graph.getContext("2d"), hist = new Array(90).fill(0);
  let frames = 0, cpuAcc = 0, last = performance.now();
  function draw() {
    const w = graph.width, h = graph.height;
    gctx.clearRect(0, 0, w, h);
    gctx.strokeStyle = "rgba(95,119,247,0.35)"; gctx.lineWidth = 1;
    for (const f of [30, 60]) { const y = h - f / 75 * h; gctx.beginPath(); gctx.moveTo(0, y); gctx.lineTo(w, y); gctx.stroke(); }
    const bw = w / hist.length;
    hist.forEach((f, i) => {
      const bh = Math.min(1, f / 75) * h;
      gctx.fillStyle = f >= 50 ? "#f8bb56" : f >= 30 ? "#8ea6fd" : "#d05b69";
      gctx.fillRect(i * bw, h - bh, Math.max(1, bw - 1), bh);
    });
  }
  return {
    // once a frame: now, and the CPU milliseconds that frame took
    update(now, cpuMs) {
      frames++; cpuAcc += cpuMs;
      const elapsed = now - last;
      if (elapsed < 250) return;
      const fps = frames * 1000 / elapsed;
      $("statFps").textContent = fps.toFixed(0);
      $("statMs").textContent = (elapsed / frames).toFixed(1) + " ms";
      $("statCpu").textContent = (cpuAcc / frames).toFixed(1) + " ms";
      $("statTris").textContent = Math.round(renderer.info.render.triangles).toLocaleString("en-US");
      $("statCalls").textContent = renderer.info.render.calls;
      hist.push(fps); hist.shift(); draw();
      frames = 0; cpuAcc = 0; last = now;
    },
  };
}

// IMAGE EFFECTS (PostKit, shared with the game): the camera's picture, not
// part of the model. PostKit's lab panel owns the switches and presets (a
// preset also sets the render quality: setQuality). render() replaces
// renderer.render; `extra(options)` adds per-lab steps (a sun's flare, a
// black hole's lensing). renderer.info is reset by the caller once a frame
// (several passes are counted together).
// Render sceny: w trybie grafiki Battle przez potok kamery z laboratoriów wodnych (ustawienie „Game clean”, jeden na
// renderer), inaczej zwykłe renderer.render — dla laboratoriów bez panelu obrazu.
function render(renderer, scene, camera) {
  if (window.GameLabGraphics !== "battle" || !window.LabLook) { renderer.render(scene, camera); return; }
  (renderer.__labLook || (renderer.__labLook = window.LabLook.cleanPipeline(renderer))).render(scene, camera);
}

function imageEffects({ renderer, scene, camera, panel, effects, setQuality }) {
  // strona w trybie grafiki Battle: potok kamery z laboratoriów wodnych zamiast PostKit (to samo API)
  if (window.GameLabGraphics === "battle" && window.LabLook) return window.LabLook.battleImageEffects({ renderer, scene, camera, panel });
  const pipe = PostKit.create(renderer);
  renderer.info.autoReset = false;
  const fx = PostKit.labPanel(panel, { effects, setQuality });
  const size = new THREE.Vector3();
  return {
    markCustom: () => fx.markCustom(),
    render(focusPos, focusRadius, extra) {
      fx.tick(performance.now());
      const o = fx.options();
      if (!(o.bloom || o.fxaa || o.filter || o.dof || o.flare || o.lens || o.sharpen || o.rays || o.msaa !== 4)) { renderer.render(scene, camera); return; }
      const dofOn = o.dof && PostKit.sphereOnScreen(camera, focusPos, focusRadius, size, 0.5);
      pipe.render(scene, camera, Object.assign({
        msaa: o.msaa,
        bloom: o.bloom ? { strength: 0.7, threshold: 0.93 } : null,
        fxaa: o.fxaa,
        dof: dofOn ? { amount: 1, size: size.z, strength: 1 } : null,
        filter: o.filter ? { vignette: 0.4, grain: 0.25, aberration: 0.35 } : null,
        sharpen: o.sharpen ? o.sharpenAmount : 0,               // the game's per preset
      }, extra ? extra(o) : null));
    },
  };
}

// The panels fade out after `seconds` without a mouse move, click, scroll
// or key, and come back at the next one (like the game's Setup -> Mouse
// option). Not while the pointer rests on a panel or a field in it has the
// focus (a reader, a typist). Styles: ui/space.css .labIdle.
function autoHideHud(panels, seconds = 5) {
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

return { paintSlider, toggle, makeGlow, perfCounters, imageEffects, autoHideHud, render };
})();
