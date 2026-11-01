/* The bottom bar's frame counter (ui/bars.css): for a lab that does not write #fps itself, <span id="fps" data-auto>
   shows the page's frames per second, counted once a second. A classic script, after the bar. */
(function () {
"use strict";
const out = document.querySelector("#fps[data-auto]");
if (!out) return;
let n = 0, t0 = performance.now();
(function tick(now) {
  n++;
  if (now - t0 >= 1000) { out.textContent = Math.round(n * 1000 / (now - t0)) + " fps"; n = 0; t0 = now; }
  requestAnimationFrame(tick);
})(t0);
})();
