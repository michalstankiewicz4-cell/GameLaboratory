/* The loading card (ui/shell/loader.css): a ring, a plain sentence, the step being done, a bar with a percentage.
   - At the start of a page: any card already in the page when this script runs. Until the lab reports its own steps,
     the card shows the page's own progress: the scripts as they load and run ("Loading shipkit.js", the share of the
     page's scripts done), then "Building the scene" until the page has loaded, then "Drawing the first frame".
     A card marked data-auto fades by itself after the first two frames; any other card: the lab calls LabLoad.done().
   - LabLoad.step(name, fraction) → promise: the lab's own step on the card that is up (the bar shows the fraction,
     0..1); awaiting it lets the card be drawn before the next step's work blocks the page.
   - LabLoad.run(title, async (step) => { await step('Heightmap', 0.1); …; await step('Sea', 0.8); … }) shows the
     card over a running lab while something long is done, then fades it. A function that reports no steps gets a
     bar that runs back and forth. Returns the function's result.
   Every finished card and every step is written to the console window (ui/shell/console.js) with its time. */
(function () {
"use strict";
const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const log = (msg) => { if (window.LabLog) window.LabLog.add("load", msg); };
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
let cur = null;   // the card that is up: { el, title, step, bar, pct, own (the lab reports its steps), t0, last }

function take(card) {
  const box = card.querySelector(".labLoadCard");
  let pct = card.querySelector(".labLoadPct");
  if (!pct) { pct = el("span", "labLoadPct"); box.append(pct); }
  return { el: card, title: (card.querySelector(".labLoadCard > b") || {}).textContent || "", step: card.querySelector(".labLoadStep"),
    bar: card.querySelector(".labLoadBar > i"), pct, own: false, t0: performance.now(), last: "" };
}
function show(c, name, frac) {
  if (name != null && c.step) c.step.textContent = name;
  if (frac != null && c.bar) { const p = Math.max(0, Math.min(1, frac)); c.bar.style.width = (p * 100).toFixed(1) + "%"; c.pct.textContent = Math.round(p * 100) + " %"; }
}
function fade(c) {
  log(`${c.title.replace(/…$/, "")}: ready in ${Math.round(performance.now() - c.t0)} ms`);
  c.el.style.opacity = "0"; setTimeout(() => c.el.remove(), 700);
}

// ---------- the start card: the page's own progress until the lab reports its steps ----------
const start = document.querySelector(".labLoad");
if (start) {
  cur = take(start);
  const loaded = new Set();
  let lastFile = "";
  document.addEventListener("load", (e) => {   // a script's load event comes after it has run (modules too)
    if (e.target.tagName === "SCRIPT" && e.target.src) { loaded.add(e.target); lastFile = e.target.src.split("/").pop(); }
  }, true);
  const tick = setInterval(() => {
    const c = cur;
    if (!c || c.el !== start || !start.isConnected) return clearInterval(tick);
    if (c.own) return;
    const all = document.querySelectorAll("script[src]").length || 1;
    if (document.readyState === "complete") show(c, "Drawing the first frame", 0.95);
    else if (document.readyState === "interactive" && loaded.size >= all) show(c, "Building the scene", 0.85);
    else show(c, lastFile ? "Loading " + lastFile : "Loading the page", 0.05 + 0.75 * Math.min(1, loaded.size / all));
  }, 100);
  if (start.hasAttribute("data-auto")) {
    const hide = () => frames().then(() => { if (cur && cur.el === start) { show(cur, "Ready", 1); fade(cur); cur = null; } });
    if (document.readyState === "complete") hide(); else addEventListener("load", hide);
  }
}

window.LabLoad = {
  step(name, frac) {
    if (!cur) return Promise.resolve();
    cur.own = true; show(cur, name, frac);
    if (name && name !== cur.last) { cur.last = name; log(`${cur.title.replace(/…$/, "")} · ${name}`); }
    return frames();
  },
  done() { if (cur) { show(cur, "Ready", 1); fade(cur); cur = null; } },
  async run(title, fn) {
    const c = el("div", "labLoad labLoadOver"), box = el("div", "labLoadCard"), bar = el("span", "labLoadBar");
    bar.append(el("i")); box.append(el("i", "labSpin"), el("b", null, title), el("span", "labLoadStep"), bar); c.append(box);
    if (cur) { cur.el.remove(); cur = null; }
    document.body.append(c);
    const me = cur = take(c); me.own = true;
    await frames();
    try { return await fn((name, frac) => (cur === me ? window.LabLoad.step(name, frac) : Promise.resolve())); }
    finally { if (cur === me) { show(me, "Ready", 1); fade(me); cur = null; } }
  },
};
})();
