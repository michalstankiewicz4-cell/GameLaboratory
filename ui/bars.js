/* The bottom bar's frame counter (ui/bars.css): <span id="fps" data-auto> shows the page's frames per second, counted
   once a second, until the lab's own counter takes over (LabPerf, ui/labwin.js, removes data-auto). A classic script,
   after the bar. */
(function () {
"use strict";
const out = document.querySelector("#fps[data-auto]");
if (!out) return;
let n = 0, t0 = performance.now();
(function tick(now) {
  if (!out.hasAttribute("data-auto")) return;
  n++;
  if (now - t0 >= 1000) { out.textContent = Math.round(n * 1000 / (now - t0)) + " fps"; n = 0; t0 = now; }
  requestAnimationFrame(tick);
})(t0);
})();
