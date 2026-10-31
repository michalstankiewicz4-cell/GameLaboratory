// SDF Morgue lab (labs/morgue.html): rolls a specimen, sways the head, shows its card. The head itself — shaders,
// specimen, palette, renderer — is the model js/models/life/zombie/sdf-head.js. From the "SDF Morgue" artifact.
import { makeZombie, paletteArray, shirtRamp, createRenderer } from "../models/life/zombie/sdf-head.js";

const $ = (id) => document.getElementById(id);
const cv = $("cv"), gl = cv.getContext("webgl2", { antialias: false });
const fail = (msg) => { $("err").textContent = msg; $("err").hidden = false; };

function describe(z) {
  const eyes = z.eyeL === 0 ? "left missing" : z.eyeR === 0 ? "right missing" : "both, " + z.eye.name;
  const rows = [["Skin", z.skin.name], ["Eyes", eyes], ["Jaw", z.jaw > 0.14 ? "gaping" : z.jaw > 0.1 ? "ajar" : "clenched"],
    ["Skull", z.boneR ? "exposed, cracked" : "intact"], ["Teeth", z.missing >= 0 ? "one upper missing" : "full set"],
    ["Wound", z.wound > 0 ? "left cheek" : "right cheek"], ["Clothing", z.shirt.name], ["Tilt", Math.round(z.tilt * 57.3) + "°"]];
  const dl = $("sheet"); dl.textContent = "";
  for (const [k, v] of rows) { const dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = k; dd.textContent = v; dl.append(dt, dd); }
  const sw = $("sw"); sw.textContent = "";
  for (const c of [...z.skin.c, ...shirtRamp(z.shirt.h), z.eye.c]) { const s = document.createElement("span"); s.style.background = "rgb(" + c + ")"; sw.appendChild(s); }   // CSSOM: allowed by the page's CSP
  $("seedLabel").textContent = "SPECIMEN #" + z.seed;
}

if (!gl) fail("This browser does not support WebGL2, so the shader cannot start.");
else {
  try {
    const R = createRenderer(gl), angEl = $("ang"), spinEl = $("spin"), outEl = $("outline");
    let Z = makeZombie(4417), pal = paletteArray(Z);
    describe(Z);
    const showRes = () => { $("resLabel").textContent = R.res + "×" + R.res + " PX"; };
    const showAng = () => { $("angV").textContent = angEl.value + "°"; };
    showRes(); showAng();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) spinEl.checked = false;
    $("roll").addEventListener("click", () => { Z = makeZombie(1 + Math.floor(Math.random() * 99999)); pal = paletteArray(Z); describe(Z); });
    angEl.addEventListener("input", () => { spinEl.checked = false; showAng(); });
    $("res").addEventListener("change", (e) => { R.resize(+e.target.value); showRes(); });
    const loop = (time) => {
      let ang = angEl.value * Math.PI / 180;
      if (spinEl.checked) { ang = 0.24 + 0.8 * Math.sin(time * 0.0006); angEl.value = Math.round(ang * 57.3); showAng(); }
      R.draw(Z, pal, ang, outEl.checked);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    window.__morgue = { get zombie() { return Z; } };   // for tests
  } catch (e) { fail("Shader error: " + e.message); }
}
