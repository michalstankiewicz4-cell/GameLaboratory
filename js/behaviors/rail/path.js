// Zachowanie „koło na szynie” — tor z dowolnej ścieżki (np. z OpenStreetMap) dla fizyki z aTrain (physics.js).
// Ścieżka (punkty osi toru) jest przepróbkowana co `step` m i wygładzona, potem zamieniona na ciąg łuków i prostych
// (łuk z każdego punktu w kierunku stycznej wygładzonej osi trafia dokładnie w kolejny punkt) — szyny są ich równoległymi kopiami w odległości ±RAIL_HALF od osi. Ten sam opis toru dostaje
// fizyka (odcinki szyn do kontaktu koło–szyna) i grafika (path-track.js: szyny, podkłady).
import { RAIL_HALF } from "../../models/train/data.js";

// pts: [[x, z] lub [x, z, y]…] — oś toru; zwraca { base (odcinki szyn do createSim), segs (oś: łuki i proste),
//   station(s) → { px, pz, tx, tz }, height(s), L, routes }
export function pathTrack(pts, { step = 2, smooth = 4 } = {}) {
  // przepróbkowanie po długości
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L0 = cum[cum.length - 1], n = Math.max(2, Math.round(L0 / step)), Q = [];
  let j = 0;
  for (let k = 0; k <= n; k++) {
    const s = L0 * k / n; while (j < pts.length - 2 && cum[j + 1] < s) j++;
    const t = (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1), a = pts[j], b = pts[j + 1];
    Q.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (a[2] ?? 0) + ((b[2] ?? 0) - (a[2] ?? 0)) * t]);
  }
  // wygładzenie (średnia ruchoma, końce na miejscu) — także wysokości: tor bez skoków
  for (let it = 0; it < smooth; it++) {
    const P = Q.map((p) => p.slice());
    for (let i = 2; i < Q.length - 2; i++) for (let c = 0; c < 3; c++) Q[i][c] = (P[i - 2][c] + 2 * P[i - 1][c] + 3 * P[i][c] + 2 * P[i + 1][c] + P[i + 2][c]) / 9;
  }
  // łuki: w każdym punkcie styczna z wygładzonej osi (różnica centralna), łuk z punktu i w jej kierunku trafia w punkt i+1;
  // na stykach odcinków załamanie stycznej jest znikome (oś gładka) — bez narastającego „wężykowania”
  const tan = Q.map((p, i) => { const a = Q[Math.max(0, i - 1)], b = Q[Math.min(Q.length - 1, i + 1)], x = b[0] - a[0], z = b[1] - a[1], l = Math.hypot(x, z) || 1; return [x / l, z / l]; });
  const segs = [];
  let tx, tz, s = 0;
  for (let i = 0; i < Q.length - 1; i++) {
    tx = tan[i][0]; tz = tan[i][1];
    const ax = Q[i][0], az = Q[i][1], dx = Q[i + 1][0] - ax, dz = Q[i + 1][1] - az, d2 = dx * dx + dz * dz;
    if (d2 < 1e-6) continue;
    const k = 2 * (tx * dz - tz * dx) / d2;   // krzywizna (dodatnia: w lewo, ku +normalnej (−tz, tx))
    if (Math.abs(k) < 1e-5) {
      const len = Math.sqrt(d2); segs.push({ kind: 'line', ax, az, tx: dx / len, tz: dz / len, len, s0: s, y0: Q[i][2], y1: Q[i + 1][2] });
      s += len;
    } else {
      const r = 1 / Math.abs(k), sg = Math.sign(k), cx = ax - tz * sg * r, cz = az + tx * sg * r;
      const th0 = Math.atan2(az - cz, ax - cx); let dth = Math.atan2(Q[i + 1][1] - cz, Q[i + 1][0] - cx) - th0;
      while (dth > Math.PI) dth -= 2 * Math.PI; while (dth < -Math.PI) dth += 2 * Math.PI;
      const len = Math.abs(dth) * r;
      segs.push({ kind: 'arc', cx, cz, r, th0, dth, sg, len, s0: s, y0: Q[i][2], y1: Q[i + 1][2] });
      s += len;
    }
  }
  const L = s;
  const find = (s) => { let lo = 0, hi = segs.length - 1; s = Math.max(0, Math.min(L, s)); while (lo < hi) { const m = (lo + hi + 1) >> 1; if (segs[m].s0 <= s) lo = m; else hi = m - 1; } return segs[lo]; };
  const station = (s) => {
    const g = find(s), u = Math.max(0, Math.min(g.len, s - g.s0));
    if (g.kind === 'line') return { px: g.ax + g.tx * u, pz: g.az + g.tz * u, tx: g.tx, tz: g.tz };
    const th = g.th0 + g.sg * u / g.r, px = g.cx + g.r * Math.cos(th), pz = g.cz + g.r * Math.sin(th);
    return { px, pz, tx: -Math.sin(th) * g.sg, tz: Math.cos(th) * g.sg };
  };
  const height = (s) => { const g = find(s), f = Math.max(0, Math.min(1, (s - g.s0) / (g.len || 1))); return g.y0 + (g.y1 - g.y0) * f; };
  // odcinki szyn (format physics.js: line / arc z th0 < th1) — obie szyny każdego odcinka osi
  const base = [];
  for (const g of segs) for (const side of [1, -1]) {
    if (g.kind === 'line') {
      const ox = -g.tz * side * RAIL_HALF, oz = g.tx * side * RAIL_HALF;
      base.push({ kind: 'line', ax: g.ax + ox, az: g.az + oz, dx: g.tx, dz: g.tz, len: g.len, clips: [], vOff: 0 });
    } else {
      const r = g.r - g.sg * side * RAIL_HALF, a = g.th0, b = g.th0 + g.sg * g.dth * g.sg;   // ten sam środek, ten sam kąt
      const th0 = Math.min(a, a + g.dth), th1 = Math.max(a, a + g.dth);
      base.push({ kind: 'arc', cx: g.cx, cz: g.cz, r, th0, th1, mid: (th0 + th1) / 2, len: (th1 - th0) * r, clips: [], vOff: 0 });
      void b;
    }
  }
  return { base, segs, station, height, L, routes: [{ at: station, L }] };
}
