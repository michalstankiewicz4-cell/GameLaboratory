/* =======================================================================
   LABKIT · LOG — the page's log, for the console window (ui/shell/console.js)
   =======================================================================
   A classic script, the first one in <body>, before ui/shell/menubar.js:
     a <script> of ../ui/shell/log.js
   The most important things that happen on the page: errors (also uncaught ones and files that failed to load), warnings, the console's
   messages, and the loading card's steps and times (ui/shell/loader.js). The first script on every page, so nothing
   early is missed. window.LabLog: entries (oldest first; each: time, level, msg, page), add(level, message),
   on(listener) → off(), clear().
   ======================================================================= */
(function () {
"use strict";
if (window.LabLog) return;
  // kept for this tab until it is closed (sessionStorage gamelab.log), so the log follows you from lab to lab
  const KEY = "gamelab.log", MAX = 600, page = location.pathname.split("/").pop().replace(/\.html$/, "") || "index";
  const entries = [], subs = new Set();
  try { for (const e of JSON.parse(sessionStorage.getItem(KEY) || "[]")) entries.push({ time: new Date(e.time), level: e.level, msg: e.msg, page: e.page }); } catch (e) { /* storage blocked */ }
  let saveT = 0;
  const save = () => { clearTimeout(saveT); saveT = 0; try { sessionStorage.setItem(KEY, JSON.stringify(entries.map((e) => ({ time: e.time.toISOString(), level: e.level, msg: e.msg.slice(0, 600), page: e.page })))); } catch (e) { /* full or blocked */ } };
  addEventListener("pagehide", save);
  const text = (a) => (a instanceof Error ? a.message : typeof a === "object" && a !== null ? (() => { try { return JSON.stringify(a); } catch (e) { return String(a); } })() : String(a));
  const LabLog = window.LabLog = {
    entries,
    add(level, msg) {
      const e = { time: new Date(), level, msg: String(msg).slice(0, 4000), page };
      entries.push(e); if (entries.length > MAX) entries.shift();
      if (!saveT) saveT = setTimeout(save, 400);
      subs.forEach((f) => { try { f(e); } catch (err) { /* a listener's own trouble */ } });
    },
    on(f) { subs.add(f); return () => subs.delete(f); },
    clear() { entries.length = 0; save(); },
  };
  for (const level of ["error", "warn", "info", "log"]) {
    const orig = console[level];
    console[level] = function (...a) { orig.apply(console, a); LabLog.add(level, a.map(text).join(" ")); };
  }
  addEventListener("error", (e) => {
    const el = e.target;
    if (el && el !== window && (el.src || el.href)) LabLog.add("error", "Could not load " + (el.src || el.href));
    else LabLog.add("error", (e.message || "Error") + (e.filename ? ` (${e.filename.split("/").pop()}:${e.lineno})` : ""));
  }, true);
  addEventListener("unhandledrejection", (e) => LabLog.add("error", "Unhandled: " + text(e.reason)));
  LabLog.add("info", "Page opened: " + location.pathname.split("/").slice(-2).join("/"));
  addEventListener("load", () => LabLog.add("info", `Page loaded in ${Math.round(performance.now())} ms`));
})();
