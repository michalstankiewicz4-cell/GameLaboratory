// Opis zderzacza przedmiotu → części wypukłe (te same dla fizyki Rapier i podglądu modeli).
// Opisy (w lokalnym układzie przedmiotu, środek masy w (0,0,0)):
//   { type: 'ring', rIn, rOut, h, segs }      — pierścień z płaskimi bokami (opony): wycinki wypukłe
//   { type: 'cyl', r, h, segs }                — walec (puszka, beczka)
//   { type: 'box', size: [x, y, z] }           — prostopadłościan (gazety, karton)
//   { type: 'cup', r, h, wall, bottom, segs }  — naczynie otwarte od góry (garnek): dno + ścianki z wycinków
//   { type: 'hulls', hulls: [[x,y,z, …], …] }  — dowolne części wypukłe
// Skala [sx, sy, sz] (zgniecenie) mnoży punkty. Wynik: [{ kind: 'hull', points: Float32Array } | { kind: 'box', half: [x,y,z], at: [x,y,z] }]
export function shapeParts(d, s = [1, 1, 1]) {
  const out = [];
  const hull = (pts) => { const a = new Float32Array(pts.length); for (let i = 0; i < pts.length; i += 3) { a[i] = pts[i] * s[0]; a[i + 1] = pts[i + 1] * s[1]; a[i + 2] = pts[i + 2] * s[2]; } out.push({ kind: 'hull', points: a }); };
  const wedge = (r0, r1, y0, y1, a0, a1, sub = 2) => {
    const p = [];
    for (let k = 0; k <= sub; k++) {
      const a = a0 + (a1 - a0) * k / sub, sn = Math.sin(a), cs = Math.cos(a);
      for (const r of [r0, r1]) for (const y of [y0, y1]) p.push(r * sn, y, r * cs);
    }
    hull(p);
  };
  if (d.type === 'ring') {
    const n = d.segs || 12;
    for (let i = 0; i < n; i++) wedge(d.rIn, d.rOut, -d.h / 2, d.h / 2, (i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2);
  } else if (d.type === 'cyl') {
    const n = d.segs || 16, p = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; for (const y of [-d.h / 2, d.h / 2]) p.push(d.r * Math.sin(a), y, d.r * Math.cos(a)); }
    hull(p);
  } else if (d.type === 'box') {
    out.push({ kind: 'box', half: [d.size[0] / 2 * s[0], d.size[1] / 2 * s[1], d.size[2] / 2 * s[2]], at: [0, 0, 0] });
  } else if (d.type === 'cup') {
    const n = d.segs || 12, y0 = -d.h / 2, p = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; for (const y of [y0, y0 + d.bottom]) p.push(d.r * Math.sin(a), y, d.r * Math.cos(a)); }
    hull(p);
    for (let i = 0; i < n; i++) wedge(d.r - d.wall, d.r, y0 + d.bottom * 0.5, d.h / 2, (i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2, 1);
  } else if (d.type === 'hulls') {
    d.hulls.forEach(hull);
  }
  return out;
}
