/* =======================================================================
   LABKIT · STANDARD WINDOWS — the windows every lab has, the same everywhere
   =======================================================================
   A classic script, after the lab's panels and before ui/windows.js:
     <script src="../ui/labwin.js"></script>
     <script src="../ui/windows.js"></script>
   An element with data-std="…" becomes one of the standard windows — the same title (English and Polish), the same
   side and the same place in the order on every page; the lab puts its own controls inside:
     info     Description · Opis           left, first      the model: .stdName, .stdSub, .stdText, table.specs, ol.src
     camera   Camera · Kamera              right, 1st       views, auto-rotate, the camera's look
     light    Light and weather · Światło i pogoda   right, 2nd
     perf     Performance · Wydajność      right, last      filled here (below); the lab's own settings go under it
   The lab's own windows (data-window) stand on the left, after Description; a second big one may stand on the right
   (data-side="right"), above Camera, Light and Performance.

   window.LabPerf — the Performance window's numbers, one implementation for every lab:
     LabPerf.begin(renderer)       at the start of a frame (resets renderer.info: several passes counted together)
     LabPerf.end(renderer[, cpuMs]) after the frame is drawn: frames per second, frame time, CPU per frame, triangles and
                                   draw calls, the render resolution, the graph; also the bottom bar's #fps
     LabPerf.model(group, buildMs) the model's numbers (triangles, vertices, meshes, materials, textures, build time);
                                   or LabPerf.modelRows([[label, value], …]) for a lab that counts its own
   ui/labwin.css: the look of what is inside these windows. */
(function () {
"use strict";
const PL = window.LabMenu && window.LabMenu.LANG === "pl";
const t = (en, pl) => (PL ? pl : en);
const STD = {
  info: { side: "left", en: "Description", pl: "Opis" },
  camera: { side: "right", en: "Camera", pl: "Kamera" },
  light: { side: "right", en: "Light and weather", pl: "Światło i pogoda" },
  perf: { side: "right", en: "Performance", pl: "Wydajność" },
};
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

// the standard windows: titles, sides, order (Description first on the left; Camera, Light, Performance on the right)
const found = {};
document.querySelectorAll("[data-std]").forEach((e) => {
  const k = e.dataset.std, s = STD[k]; if (!s) return;
  e.dataset.window = k; e.dataset.side = s.side; e.dataset.title = s.en; e.dataset.titlePl = s.pl;
  e.classList.add("stdWin"); found[k] = e;
});
const firstLeft = [...document.querySelectorAll("[data-window]")].find((e) => e !== found.info && (e.dataset.side || "left") === "left");
if (found.info && firstLeft) firstLeft.before(found.info);
const tail = [...document.querySelectorAll("[data-window]")].pop();
let after = tail;
for (const k of ["camera", "light", "perf"]) if (found[k]) { after.after(found[k]); after = found[k]; }

// ---------- Performance ----------
const perf = found.perf;
let cells = null, graph = null, gctx = null, foot = null;
const hist = new Array(90).fill(0);
if (perf) {
  const stats = (rows) => { const g = el("div", "stdStats"); const o = {}; rows.forEach(([k, label]) => { g.append(el("span", null, label)); o[k] = el("b", null, "–"); g.append(o[k]); }); return [g, o]; };
  const [g1, c1] = stats([["fps", t("Frames per second", "Klatki na sekundę")], ["ms", t("Frame time", "Czas klatki")], ["cpu", t("CPU per frame", "CPU na klatkę")],
    ["tris", t("Triangles drawn", "Rysowane trójkąty")], ["calls", t("Draw calls", "Wywołania rysowania")], ["res", t("Resolution", "Rozdzielczość")]]);
  graph = el("canvas", "stdGraph"); graph.width = 270; graph.height = 44; gctx = graph.getContext("2d");
  const legend = el("div", "stdLegend"); legend.append(el("i", "g1"), "≥50 ", el("i", "g2"), "30–50 ", el("i", "g3"), t("<30 fps · lines: 30 / 60", "<30 kl./s · linie: 30 / 60"));
  const [g2, c2] = stats([["mTris", t("Triangles", "Trójkąty")], ["mVerts", t("Vertices", "Wierzchołki")], ["mMeshes", t("Meshes", "Siatki")],
    ["mMats", t("Materials", "Materiały")], ["mTex", t("Textures", "Tekstury")], ["mBuild", t("Build time", "Czas budowy")]]);
  const own = el("div", "stdOwn"); while (perf.firstChild) own.append(perf.firstChild);
  const mh = el("h3", "stdModelHd", t("Model", "Model")); mh.hidden = g2.hidden = true;   // shown once the lab reports its model
  perf.append(el("h3", null, t("Rendering", "Renderowanie")), g1, graph, legend, mh, g2);
  if (own.childNodes.length) perf.append(own);
  cells = Object.assign(c1, c2); cells.modelGrid = g2; cells.modelHd = mh;
}
function drawGraph() {
  const w = graph.width, h = graph.height;
  gctx.clearRect(0, 0, w, h);
  gctx.strokeStyle = "rgba(127,138,152,.35)"; gctx.lineWidth = 1;
  for (const f of [30, 60]) { const y = h - f / 75 * h; gctx.beginPath(); gctx.moveTo(0, y); gctx.lineTo(w, y); gctx.stroke(); }
  const bw = w / hist.length;
  hist.forEach((f, i) => { const bh = Math.min(1, f / 75) * h; gctx.fillStyle = f >= 50 ? "#f2b84b" : f >= 30 ? "#8ea6fd" : "#e04b50"; gctx.fillRect(i * bw, h - bh, Math.max(1, bw - 1), bh); });
}
let frames = 0, cpuAcc = 0, last = performance.now(), t0 = 0;
const n = (v) => Math.round(v).toLocaleString("en-US");
window.LabPerf = {
  begin(renderer) { t0 = performance.now(); if (renderer) { renderer.info.autoReset = false; renderer.info.reset(); } },
  end(renderer, cpuMs) {
    const now = performance.now();
    frames++; if (cpuMs != null) cpuAcc += cpuMs; else if (t0) cpuAcc += now - t0;
    const elapsed = now - last;
    if (elapsed < 250) return;
    const fps = frames * 1000 / elapsed;
    if (!foot) { foot = document.getElementById("fps"); if (foot) foot.removeAttribute("data-auto"); }
    if (foot) foot.textContent = Math.round(fps) + " fps";
    if (cells) {
      cells.fps.textContent = fps.toFixed(0); cells.ms.textContent = (elapsed / frames).toFixed(1) + " ms";
      cells.cpu.textContent = cpuAcc ? (cpuAcc / frames).toFixed(1) + " ms" : "–";
      if (renderer) {
        cells.tris.textContent = n(renderer.info.render.triangles); cells.calls.textContent = renderer.info.render.calls;
        const c = renderer.domElement; cells.res.textContent = c.width + " × " + c.height;
      }
      hist.push(fps); hist.shift(); drawGraph();
    }
    frames = 0; cpuAcc = 0; last = now;
  },
  model(group, buildMs) {
    if (!cells || !group) return;
    cells.modelHd.hidden = cells.modelGrid.hidden = false;
    let tris = 0, verts = 0, meshes = 0; const mats = new Set(), tex = new Set();
    group.traverse((o) => {
      if (!o.isMesh && !o.isPoints && !o.isLine) return;
      meshes++;
      const g = o.geometry, cnt = o.isInstancedMesh ? o.count : 1;
      if (g && g.attributes.position) { verts += g.attributes.position.count * cnt; if (o.isMesh) tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * cnt; }
      [].concat(o.material || []).forEach((m) => { mats.add(m); for (const k in m) { const v = m[k]; if (v && v.isTexture) tex.add(v); } if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k] && m.uniforms[k].value; if (v && v.isTexture) tex.add(v); } });
    });
    cells.mTris.textContent = n(tris); cells.mVerts.textContent = n(verts); cells.mMeshes.textContent = n(meshes);
    cells.mMats.textContent = mats.size; cells.mTex.textContent = tex.size; cells.mBuild.textContent = buildMs != null ? Math.round(buildMs) + " ms" : "–";
  },
  modelRows(rows) {
    if (!cells) return;
    cells.modelHd.hidden = cells.modelGrid.hidden = false;
    cells.modelGrid.replaceChildren(...rows.flatMap(([k, v]) => [el("span", null, k), el("b", null, String(v))]));
  },
};
})();
