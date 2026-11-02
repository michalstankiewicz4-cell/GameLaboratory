/* The loading card shown while a lab builds its first scene (ui/loader.css). For a lab that does not remove the card
   itself: <div class="labLoad" data-auto>…</div> right after the menu bar, then this script. The card fades once the
   page has loaded and drawn two frames (the first frame often still builds). */
(function () {
"use strict";
const card = document.querySelector(".labLoad[data-auto]");
if (!card) return;
const hide = () => requestAnimationFrame(() => requestAnimationFrame(() => { card.style.opacity = "0"; setTimeout(() => card.remove(), 700); }));
if (document.readyState === "complete") hide(); else addEventListener("load", hide);
})();
