// CityKit — dachy na dowolnym obrysie:
//   flat     dach płaski z attyką (parapet: wysokość attyki, 0 — bez; od środka odsunięta o 0,25 m)
//   hip      kopertowy: połacie od okapu w górę, obrys odsuwany do środka (prostokąt — kalenica, inne — płaski szczyt,
//            gdy dalej się nie da)
//   gable    dwuspadowy dla prostokątów (kalenica wzdłuż dłuższego boku, szczyty murowane); inny obrys — kopertowy
//   mansard  mansardowy: stroma dolna połać (70°), łagodna górna (pitch), okap jak gzyms
//   pyramid  ostrosłup do środka ciężkości obrysu (namiotowy, iglica, stożek z mapy); wysokość — roof.height
//   dome     kopuła: pierścienie obrysu zwężane do środka po ćwiartce koła; wysokość — roof.height
// roof.height > 0 — wysokość dachu w metrach (z mapy) zamiast spadku. Okap (overhang) wysunięty poza mur; spód połaci
// widoczny pod okapem. Obrys z dziedzińcami (części budynków z mapy) — zawsze dach płaski.
import { facadeFrame } from './geo.js';
import { insetPolygon, maxInset, triangulate, isRect, edgesOf, centroidOf } from './footprint.js';
import { wq, worldUV } from './mesh.js';

const rad = (d) => d * Math.PI / 180;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// wielokąt poziomy (y) z góry albo od spodu
function cap(geo, m, poly, y, up = true, tile = 1, holes = []) {
  const t = triangulate(poly, holes), n = [0, up ? 1 : -1, 0], all = poly.concat(...holes);
  for (let i = 0; i < t.length; i += 3) {
    const p = [t[i], t[i + 1], t[i + 2]].map((k) => [all[k][0], y, all[k][1]]);
    geo.tri(m, p, n, p.map((q) => worldUV(q, n, tile)));
  }
}
// pas połaci między krawędzią i dolnego pierścienia (y0) a krawędzią i górnego (y1); spód też (okap)
function ring(geo, m, lo, y0, hi, y1, under) {
  const n = lo.length;
  for (let i = 0; i < n; i++) {
    const a = [lo[i][0], y0, lo[i][1]], b = [lo[(i + 1) % n][0], y0, lo[(i + 1) % n][1]];
    const c = [hi[(i + 1) % n][0], y1, hi[(i + 1) % n][1]], d = [hi[i][0], y1, hi[i][1]];
    let nn = cross(sub(b, a), sub(d, a)); if (Math.hypot(...nn) < 1e-9) nn = cross(sub(c, b), sub(a, b));
    nn = unit(nn); if (nn[1] < 0) nn = nn.map((x) => -x);
    if (Math.hypot(c[0] - d[0], c[2] - d[2]) < 1e-3) { geo.tri(m, [a, b, c], nn, [a, b, c].map((q) => worldUV(q, nn, 1))); continue; }   // krawędź zeszła się w punkt (kalenica, narożnik) — trójkąt
    wq(geo, m, [a, b, c, d], nn);
    // spód połaci 0,1 m niżej (dach ma grubość: okap widać od spodu, czoło zamyka szczelinę)
    if (under) wq(geo, under, [a, b, c, d].map((p) => [p[0], p[1] - 0.1, p[2]]), nn.map((x) => -x));
  }
}
// deska (czoło okapu, deska szczytowa): pas a–b pionowo w dół o h, lico na zewnątrz n, tył 3 cm do środka i spód
// (widać je spod okapu)
function board(geo, m, a, b, h, n) {
  const dn = (p) => [p[0], p[1] - h, p[2]], t = (p) => [p[0] - n[0] * 0.03, p[1], p[2] - n[2] * 0.03];
  wq(geo, m, [a, b, dn(b), dn(a)], n);
  wq(geo, m, [t(a), t(b), t(dn(b)), t(dn(a))], [-n[0], 0, -n[2]]);
  wq(geo, m, [dn(a), dn(b), t(dn(b)), t(dn(a))], [0, -1, 0]);
}
// czoło okapu: deska pod krawędzią pierścienia
function fascia(geo, m, poly, y, h) {
  for (const e of edgesOf(poly)) board(geo, m, [e.a[0], y, e.a[1]], [e.b[0], y, e.b[1]], h, [e.nrm[0], 0, e.nrm[1]]);
}

function hip(geo, L, base, y, pitch, rmax, under) {
  const r = Math.max(0, rmax), topRing = insetPolygon(base, r) || base, k = Math.tan(rad(pitch));
  ring(geo, 'roof', base, y, topRing, y + r * k, under);
  if (Math.abs(areaOf(topRing)) > 0.05) cap(geo, 'roof', topRing, y + r * k);
  return y + r * k;
}
const areaOf = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };

export function roof(geo, L) {
  const S = L.S, R = S.roof, H = L.H, poly = L.poly, tile = S.wall.tile || 2, holes = L.holes || [];
  cap(geo, 'slab', poly, -0.02, false, 1, holes);   // spód budynku (zamknięta bryła; stoi na gruncie; 2 cm niżej niż dno wnęk drzwi)
  const type = holes.length ? 'flat' : R.type;
  if (type === 'flat') {
    cap(geo, 'roof', poly, R.parapet > 0 ? H + 0.02 : H, true, 1, holes);
    const p = R.parapet;
    if (p > 0) {
      for (const e of L.edges) { const F = facadeFrame(e); wq(geo, 'wall', [F.P(0, H, 0), F.P(e.len, H, 0), F.P(e.len, H + p, 0), F.P(0, H + p, 0)], F.D(0, 0, 1), tile); }
      const inner = insetPolygon(poly, 0.25);
      if (inner) {
        ring(geo, 'trim', poly, H + p, inner, H + p);   // wierzch attyki
        // lico wewnętrzne attyki
        for (const e of edgesOf(inner)) { const F = facadeFrame(e); wq(geo, 'wall', [F.P(0, H, 0), F.P(e.len, H, 0), F.P(e.len, H + p, 0), F.P(0, H + p, 0)], F.D(0, 0, -1), tile); }
      }
      // attyka nad dziedzińcem: wierzch i lico od strony dachu 0,25 m od muru
      for (const e of L.edges.slice(L.edges.length - holes.reduce((s, h) => s + h.length, 0))) {
        const F = facadeFrame(e);
        wq(geo, 'trim', [F.P(0, H + p, 0), F.P(e.len, H + p, 0), F.P(e.len, H + p, -0.25), F.P(0, H + p, -0.25)], [0, 1, 0]);
        wq(geo, 'wall', [F.P(0, H, -0.25), F.P(e.len, H, -0.25), F.P(e.len, H + p, -0.25), F.P(0, H + p, -0.25)], F.D(0, 0, -1), tile);
      }
    }
    return;
  }
  if (type === 'pyramid' || type === 'dome') { peaked(geo, poly, H, R, type === 'dome'); return; }
  const o = R.overhang, eave = (o > 0 && insetPolygon(poly, -o)) || poly;
  const k = R.height > 0 ? R.height / Math.max(0.5, maxInset(poly)) : Math.tan(rad(R.pitch));   // wysokość z mapy albo spadek
  if (R.type === 'gable' && isRect(poly)) { gable(geo, L, o, k); return; }
  if (R.type === 'mansard') {
    // okap jak gzyms: płyta pozioma od muru do krawędzi okapu
    if (eave !== poly) { ring(geo, 'roof', eave, H, poly, H); ring(geo, 'trim', poly, H - 0.12, eave, H - 0.12); fascia(geo, 'trim', eave, H, 0.12); }
    const rmax = maxInset(poly), r1 = Math.min(1.4, rmax * 0.5), ring1 = insetPolygon(poly, r1) || poly, y1 = H + r1 * Math.tan(rad(70));
    ring(geo, 'roof', poly, H, ring1, y1);
    hip(geo, L, ring1, y1, Math.atan(k) * 180 / Math.PI, maxInset(ring1));
    return;
  }
  // kopertowy (i dwuspadowy na obrysie innym niż prostokąt): połać od okapu (niżej o o·tg) do szczytu
  const ye = H - o * k;
  hip(geo, L, eave, ye, Math.atan(k) * 180 / Math.PI, maxInset(eave), 'roof');
  if (eave !== poly) fascia(geo, 'trim', eave, ye, 0.15);
}

// dwuspadowy na prostokącie: dwie połacie, dwa szczyty murowane, okap i wysunięcie nad szczytami
function gable(geo, L, o, k) {
  const S = L.S, H = L.H, E = L.edges, tile = S.wall.tile || 2;
  const long = E[0].len >= E[1].len ? 0 : 1;   // krawędzie long i long+2 — okapowe, pozostałe — szczytowe
  const ea = E[long], eb = E[(long + 2) % 4], half = E[(long + 1) % 4].len / 2, ridge = H + half * k, ye = H - o * k;
  const [dx, dz] = ea.dir, [nx, nz] = ea.nrm;
  // środek kalenicy: między środkami krawędzi okapowych
  const mid = (e) => [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2], ma = mid(ea), mb = mid(eb), c = [(ma[0] + mb[0]) / 2, (ma[1] + mb[1]) / 2];
  const L2 = ea.len / 2 + o;   // pół długości dachu wzdłuż kalenicy (z wysunięciem)
  const at = (along, out, y) => [c[0] + dx * along + nx * out, y, c[1] + dz * along + nz * out];
  for (const s of [1, -1]) {   // połać po stronie ea (s = 1) i eb (s = −1)
    const p = [at(-L2, s * (half + o), ye), at(L2, s * (half + o), ye), at(L2, 0, ridge), at(-L2, 0, ridge)];
    let n = unit([nx * s * k, 1, nz * s * k]);
    wq(geo, 'roof', p, n); wq(geo, 'roof', p.map((q) => [q[0], q[1] - 0.1, q[2]]), n.map((x) => -x));   // spód 0,1 m niżej
    // deski szczytowe pod krawędzią połaci nad szczytami (zamykają grubość dachu) i czoło okapu
    board(geo, 'trim', p[0], p[3], 0.15, [-dx, 0, -dz]); board(geo, 'trim', p[1], p[2], 0.15, [dx, 0, dz]);
    board(geo, 'trim', p[0], p[1], 0.15, [nx * s, 0, nz * s]);
  }
  // szczyty: trójkąty muru nad krawędziami szczytowymi
  for (const e of [E[(long + 1) % 4], E[(long + 3) % 4]]) {
    const F = facadeFrame(e), n = F.D(0, 0, 1), p = [F.P(0, H, 0), F.P(e.len, H, 0), F.P(e.len / 2, ridge, 0)];
    geo.tri('wall', p, n, p.map((q) => worldUV(q, n, tile)));
  }
}

// ostrosłup (iglica, namiot) albo kopuła: pierścienie obrysu zwężane do środka ciężkości; wysokość z mapy albo ze spadku
function peaked(geo, poly, H, R, dome) {
  const c = centroidOf(poly), rh = R.height > 0 ? R.height : maxInset(poly) * Math.tan(rad(R.pitch));
  const lv = dome ? [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => [Math.cos(f * Math.PI / 2), Math.sin(f * Math.PI / 2)]) : [[1, 0], [0, 1]];
  const at = (s) => poly.map(([x, z]) => [c[0] + (x - c[0]) * s, c[1] + (z - c[1]) * s]);
  for (let i = 0; i + 1 < lv.length; i++) {
    const lo = at(lv[i][0]), hi = at(Math.max(lv[i + 1][0], 1e-4));
    ring(geo, 'roof', lo, H + rh * lv[i][1], hi, H + rh * lv[i + 1][1]);
  }
}
