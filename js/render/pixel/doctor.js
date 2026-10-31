// Pixel Doctor: the rules of pixel art as checks. Each finding has a severity, a message, the pixels concerned (for
// the overlay) and, where it can be fixed automatically, a fix. The score starts at 100 and loses points per finding.
//  colours      too many colours for the size (each colour should earn its place)
//  alpha        half-transparent pixels (pixel art is opaque or empty)
//  orphans      single pixels unlike all their neighbours (noise)
//  doubles      L-shaped corners that make 1-px lines look 2 px thick (not pixel-perfect)
//  pillow       shading that just gets lighter towards the middle of the shape, ignoring the light direction
//  banding      steps of different colours running side by side with the same length (reads as stripes, blurs the form)
//  contrast     too little difference between the darkest and the lightest colour
//  noise        too many pixels that differ from most neighbours (busy, unreadable at 1×)
//  silhouette   the shape does not read as one solid mass (holes, specks around it)
import { oklab, removeOrphans, pixelPerfect, quantize, autoPalette, hardAlpha, colorsOf } from './core.js';

const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]], N4 = [[0, -1], [-1, 0], [1, 0], [0, 1]];

export function examine(img, { light = [-1, -1] } = {}) {
  const F = [], W = img.w, H = img.h, area = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (img.alpha(x, y) >= 128) area.push([x, y]);
  if (!area.length) return { score: 0, findings: [{ id: 'empty', sev: 2, msg: 'The image is empty.' }] };
  const L = (x, y) => { const c = img.get(x, y); return oklab(c)[0]; };
  // colours
  const cols = colorsOf([img]), size = Math.sqrt(area.length), maxC = size < 24 ? 12 : size < 48 ? 20 : 32;
  if (cols.length > maxC) F.push({ id: 'colours', sev: cols.length > maxC * 1.6 ? 2 : 1, msg: `${cols.length} colours for a sprite this size — aim for ${maxC} or fewer; similar shades can merge.`, fix: (im) => quantize(im, autoPalette([im], maxC)) });
  // alpha
  const semi = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = img.alpha(x, y); if (a > 0 && a < 255) semi.push([x, y]); }
  if (semi.length) F.push({ id: 'alpha', sev: 1, msg: `${semi.length} half-transparent pixels — make them opaque or empty.`, px: semi, fix: (im) => hardAlpha(im) });
  // orphans
  const orph = [];
  for (const [x, y] of area) {
    const k = img.key(x, y); let same = 0, agree = new Map();
    for (const [dx, dy] of N8) { const xx = x + dx, yy = y + dy, kk = xx < 0 || yy < 0 || xx >= W || yy >= H ? -1 : img.key(xx, yy); if (kk === k) same++; agree.set(kk, (agree.get(kk) || 0) + 1); }
    if (!same && Math.max(...agree.values()) >= 5) orph.push([x, y]);
  }
  if (orph.length) F.push({ id: 'orphans', sev: orph.length > area.length * 0.02 ? 2 : 1, msg: `${orph.length} lone pixels unlike everything around them (noise).`, px: orph, fix: (im) => removeOrphans(im) });
  // doubles on outline-like colours (the darkest colours touching the empty background)
  const edgeK = new Set(); for (const [x, y] of area) for (const [dx, dy] of N4) if (img.alpha(x + dx, y + dy) < 128) { edgeK.add(img.key(x, y)); break; }
  const darkest = [...edgeK].map((k) => [k, oklab([k >> 16, (k >> 8) & 255, k & 255])[0]]).sort((a, b) => a[1] - b[1]).slice(0, 2).map((e) => e[0]);
  const isLine = (k) => darkest.includes(k), dbl = [];
  for (const [x, y] of area) {
    const k = img.key(x, y); if (!isLine(k)) continue;
    const s = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx >= 0 && yy >= 0 && xx < W && yy < H && img.key(xx, yy) === k; };
    let c = 0; for (const [dx, dy] of N8) if (s(dx, dy)) c++;
    if (c === 2 && [[0, -1, 1, 0], [1, 0, 0, 1], [0, 1, -1, 0], [-1, 0, 0, -1]].some(([a, b, c2, d]) => s(a, b) && s(c2, d))) dbl.push([x, y]);
  }
  if (dbl.length > 2) F.push({ id: 'doubles', sev: 1, msg: `${dbl.length} doubled corners in the outline — the lines are not pixel-perfect.`, px: dbl, fix: (im) => pixelPerfect(im, isLine) });
  // pillow shading: lightness follows the distance from the edge, not the light
  const dist = new Float32Array(W * H).fill(0), q = [];
  for (const [x, y] of area) { let edge = false; for (const [dx, dy] of N4) if (img.alpha(x + dx, y + dy) < 128) edge = true; dist[y * W + x] = edge ? 1 : 0; if (edge) q.push([x, y]); }
  for (let qi = 0; qi < q.length; qi++) { const [x, y] = q[qi], d = dist[y * W + x]; for (const [dx, dy] of N4) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H || img.alpha(xx, yy) < 128 || dist[yy * W + xx]) continue; dist[yy * W + xx] = d + 1; q.push([xx, yy]); } }
  const corr = (a, b) => { const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n; let sab = 0, sa = 0, sb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return sa && sb ? sab / Math.sqrt(sa * sb) : 0; };
  const ls = area.map(([x, y]) => L(x, y)), ds = area.map(([x, y]) => dist[y * W + x]), lp = area.map(([x, y]) => x * light[0] + y * light[1]);   // light from the top-left: lighter towards it
  const cPillow = corr(ls, ds), cLight = corr(ls, lp);
  if (area.length > 60 && cPillow > 0.55 && cPillow > Math.abs(cLight) + 0.15) F.push({ id: 'pillow', sev: 2, msg: `Pillow shading: the colour gets lighter towards the middle (r = ${cPillow.toFixed(2)}) instead of following one light (r = ${cLight.toFixed(2)}). Light it from one side.` });
  // banding: two colour boundaries running parallel one pixel apart for 3+ pixels
  const band = [];
  for (const [dxs, dys] of [[1, 0], [0, 1]]) for (let y = 0; y < H - 2 * dys; y++) for (let x = 0; x < W - 2 * dxs; x++) {
    const a = img.key(x, y), b = img.key(x + dxs, y + dys), c = img.key(x + 2 * dxs, y + 2 * dys);
    if (a < 0 || b < 0 || c < 0 || a === b || b === c || a === c) continue;
    let run = 1; for (let s = 1; s < 4; s++) { const px = x + s * dys, py = y + s * dxs; if (px >= W || py >= H) break; if (img.key(px, py) === a && img.key(px + dxs, py + dys) === b && img.key(px + 2 * dxs, py + 2 * dys) === c) run++; else break; }
    if (run >= 3) band.push([x + dxs, y + dys]);
  }
  if (band.length > 3) F.push({ id: 'banding', sev: 1, msg: `Banding in ${band.length} places: steps of different colours run side by side with the same length — offset them or merge a shade.`, px: band });
  // contrast
  const lmin = Math.min(...ls), lmax = Math.max(...ls);
  if (lmax - lmin < 0.35) F.push({ id: 'contrast', sev: 1, msg: `Low contrast (lightness ${lmin.toFixed(2)}…${lmax.toFixed(2)}): add a darker shadow or a lighter highlight.` });
  // noise
  let noisy = 0; for (const [x, y] of area) { const k = img.key(x, y); let diff = 0; for (const [dx, dy] of N8) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; if (img.key(xx, yy) !== k) diff++; } if (diff >= 6) noisy++; }
  if (area.length > 100 && noisy > area.length * 0.22) F.push({ id: 'noise', sev: 1, msg: `${Math.round(noisy / area.length * 100)} % of the pixels differ from most neighbours — busy; use bigger clusters of colour.`, fix: (im) => removeOrphans(im, 4) });
  // silhouette: specks (separate pieces of 1–2 pixels) and pinholes
  const lab = new Int32Array(W * H).fill(-1), parts = [];
  for (const [x, y] of area) { if (lab[y * W + x] >= 0) continue; const id = parts.length, st = [[x, y]]; lab[y * W + x] = id; let n = 0, px = []; while (st.length) { const [a, b] = st.pop(); n++; px.push([a, b]); for (const [dx, dy] of N8) { const xx = a + dx, yy = b + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H || img.alpha(xx, yy) < 128 || lab[yy * W + xx] >= 0) continue; lab[yy * W + xx] = id; st.push([xx, yy]); } } parts.push(px); }
  const specks = parts.filter((p) => p.length <= 2).flat();
  let holes = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (img.alpha(x, y) < 128 && N4.every(([dx, dy]) => img.alpha(x + dx, y + dy) >= 128)) holes.push([x, y]);
  if (specks.length || holes.length > 1) F.push({ id: 'silhouette', sev: 1, msg: `The silhouette has ${specks.length} stray specks and ${holes.length} pinholes — it should read as one mass.`, px: [...specks, ...holes] });
  const score = Math.max(0, 100 - F.reduce((s, f) => s + (f.sev === 2 ? 18 : 8), 0));
  return { score, findings: F, stats: { colours: cols.length, pixels: area.length, pillow: cPillow, light: cLight } };
}
