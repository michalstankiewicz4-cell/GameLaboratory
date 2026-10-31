// Pojazd szynowy złożony z części: nadwozie (bodies/), zderzaki, końcówki sprzęgów,
// wsporniki sprężyn, zestawy kołowe, maźnice ze sprężynami, światła. W spoczynku:
// początek układu na główce szyny pod środkiem pudła, oś x wzdłuż toru (przód +x).
// Ruchome części są w userData (do zachowania „koło na szynie”).
import { BUF_EXT, layout } from "./data.js";
import { trainStock } from "./materials.js";
import { wheelset } from "./parts/wheelset.js";
import { springSole, axleboxAndSpring } from "./parts/suspension.js";
import { buffers } from "./parts/buffers.js";
import { couplerEnd, knuckleOnVehicle } from "./parts/couplers.js";
import { buildLoco } from "./bodies/loco.js";
import { buildWoodVan } from "./bodies/wood-van.js";
import { buildSteelVan } from "./bodies/steel-van.js";
const THREE = window.THREE;

// nadwozia: typ podwozia (data.js VEH) i budowniczy
export const BODIES = {
  loco: { type: "loco", name: "Lokomotywa spalinowa", build: buildLoco, index: 0 },
  woodVan: { type: "wagon", name: "Wagon kryty drewniany", build: buildWoodVan, index: 1 },
  steelVan: { type: "wagon", name: "Wagon kryty stalowy", build: buildSteelVan, index: 2 },
};

// front / rear: końcówka sprzęgu 'plain' | 'knuckle' | 'shackle' | 'hook';
// last: ostatni w składzie (czerwone lampy końca składu, wagon stalowy); lights: źródła światła
export function buildVehicle(body, { front = "plain", rear = "plain", last = false, lights = true } = {}) {
  const spec = BODIES[body];
  if (!spec) throw new Error("TrainKit: nieznane nadwozie " + body);
  const S = trainStock(), L = layout(spec.type), d = L.def, y = (h) => h - d.comY;
  const root = new THREE.Group(); root.name = spec.name;
  const g = new THREE.Group(); g.name = "pudło"; g.position.y = d.comY; root.add(g);

  const heads = [], knuckles = [];
  for (const sx of [1, -1]) {
    heads.push(...buffers(g, d.Lb, sx, y));
    const kind = sx > 0 ? front : rear;
    if (kind === "knuckle") { const k = knuckleOnVehicle(d.Lb, sx, y); g.add(k); knuckles.push(k); }
    else couplerEnd(g, d.Lb, sx, kind, y);
  }
  for (const sp of L.springs) springSole(g, spec.type, sp, y);

  // nadwozie z aTrain: oczekuje opisu pojazdu (def, położenia zestawów kołowych)
  const veh = { type: spec.type, def: d, body: { p: [0, 0, 0] }, ws: L.ws.map((w) => ({ p: [w.x, 0, 0], Rw: w.Rw })) };
  const fx = spec.build(S, veh, g, y, spec.index, last);

  const wheelsets = L.ws.map((w) => { const m = wheelset(w.Rw); m.position.set(w.x, w.y, 0); g.add(m); return m; });
  const axleboxes = L.springs.map((sp) => { const w = L.ws.find((v) => Math.sign(v.x) === sp.sx); const a = axleboxAndSpring(sp, w.y); g.add(a); return a; });

  if (lights) {
    if (fx.white) for (const p of fx.white) { const pl = new THREE.PointLight(0xfff0d8, 0.9, 16, 2); pl.position.set(p[0] + 0.3, p[1], p[2]); g.add(pl); }
    if (fx.head) {
      const hl = new THREE.SpotLight(0xfff4e0, 4.5, 160, 0.3, 0.4, 1.1); hl.position.set(fx.head[0] + 0.1, fx.head[1], fx.head[2]);
      hl.target.position.set(fx.head[0] + 40, y(0) - 0.5, 0); g.add(hl, hl.target);
      hl.castShadow = true; hl.shadow.mapSize.set(1024, 1024); hl.shadow.camera.near = 0.5; hl.shadow.camera.far = 160; hl.shadow.bias = -0.0004;
    }
    if (fx.red) for (const p of fx.red) { const pl = new THREE.PointLight(0xff2414, 0.7, 9, 2); pl.position.set(p[0] - 0.25, p[1], p[2]); g.add(pl); }
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  root.userData = { body: g, def: d, type: spec.type, wheelsets, axleboxes, buffers: heads, knuckles, fx, front, rear,
    halfLength: d.Lb / 2 + BUF_EXT };   // od środka do czoła talerza zderzaka
  return root;
}
