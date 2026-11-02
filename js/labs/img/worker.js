// Laboratorium obrazów · wątek treningowy. Silnik (autograd, WASM SIMD, WebGPU) wspólny z laboratorium języka.
importScripts('../lang/engine.js', '../lang/wasm.js', '../lang/gpu.js');

// Rozmiar i kolory danych przychodzą ze strony (cmd 'data'): 16×16 × 16 odcieni szarości albo 64×40 × 256 kolorów palety.
// N: pikseli w obrazku; LV: wartości piksela (odcienie albo numery kolorów palety). Sieci ciągłe (VAE, GAN, dyfuzja,
// klasyfikator) widzą obrazek jako D = N × CH liczb: odcień (CH = 1) albo R, G, B koloru z palety (CH = 3).
let W = 16, H = 16, N = 256, LV = 16, CH = 1, D = 256, PAL = null, LUT = null;
const COLOR = () => !!PAL;
let cats = [], train = [], val = [], running = null;
const models = {};
const post = m => self.postMessage(m);
const randInt = n => Math.floor(Math.random() * n);
const now = () => performance.now();

// Dane: dla każdej kategorii tablica pikseli (n × 256, wartości 0..15). 90% do nauki, 10% do sprawdzania.
function setData(list, cfg) {
  if (cfg) {
    W = cfg.w; H = cfg.h; N = W * H; LV = cfg.levels;
    PAL = cfg.palette ? Float32Array.from(cfg.palette.flat(), v => v / 255) : null; CH = PAL ? 3 : 1; D = N * CH;
    LUT = PAL ? paletteLUT(PAL) : null;
  }
  cats = list.map(c => c.name); train = []; val = [];
  list.forEach((c, ci) => {
    const n = c.pix.length / N, nv = Math.max(1, Math.round(n * .1));
    for (let i = 0; i < n; i++) (i >= n - nv ? val : train).push({ c: ci, p: c.pix.subarray(i * N, (i + 1) * N) });
  });
  for (const k in models) delete models[k];
  return { cats, train: train.length, val: val.length };
}
// Najbliższy kolor palety dla każdego koloru RGB (po 5 bitów na kanał): sieci ciągłe rysują RGB, my wybieramy kolor.
function paletteLUT(pal) {
  const lut = new Uint8Array(32768);
  for (let k = 0; k < 32768; k++) {
    const r = ((k >> 10) + .5) / 32, g = (((k >> 5) & 31) + .5) / 32, b = ((k & 31) + .5) / 32; let best = 0, bd = Infinity;
    for (let i = 0; i < 256; i++) { const dr = pal[i * 3] - r, dg = pal[i * 3 + 1] - g, db = pal[i * 3 + 2] - b, dd = dr * dr * .3 + dg * dg * .59 + db * db * .11; if (dd < bd) { bd = dd; best = i; } }
    lut[k] = best;
  }
  return lut;
}
const q5 = v => Math.max(0, Math.min(31, (v * 32) | 0));
// Stały zestaw do sprawdzania: po równo z każdej kategorii.
function valSet(S) { const out = [], per = Math.ceil(S / cats.length); cats.forEach((_, ci) => out.push(...val.filter(v => v.c === ci).slice(0, per))); return out.slice(0, S); }

function pick(probs, temp) {
  const w = Array.from(probs, p => Math.pow(Math.max(p, 1e-12), 1 / temp)), s = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * s; for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; } return w.length - 1;
}
function softmax(lg) { let mx = -Infinity; for (const v of lg) mx = Math.max(mx, v); const e = Array.from(lg, v => Math.exp(v - mx)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); }

// ---------- krok 1: statystyka pikseli ----------
// Dla każdej kategorii i każdego z 256 miejsc liczymy, jak często występuje każdy odcień.
// Każdy piksel losujemy osobno: model nie wie nic o sąsiadach, więc kształty się rozpadają.
function trainStats() {
  const C = cats.length, cnt = new Float64Array(C * N * LV), alpha = .5;
  for (const { c, p } of train) for (let i = 0; i < N; i++) cnt[(c * N + i) * LV + p[i]]++;
  const P = new Float32Array(C * N * LV);
  for (let k = 0; k < C * N; k++) { let s = 0; for (let v = 0; v < LV; v++) s += cnt[k * LV + v] + alpha; for (let v = 0; v < LV; v++) P[k * LV + v] = (cnt[k * LV + v] + alpha) / s; }
  const loss = set => { let l = 0; for (const { c, p } of set) for (let i = 0; i < N; i++) l -= Math.log(P[(c * N + i) * LV + p[i]]); return l / (set.length * N); };
  const m = { kind: 'stats', P, count: C * N * LV };
  m.sample = (c, temp) => { const o = new Uint8Array(N); for (let i = 0; i < N; i++) o[i] = pick(P.subarray((c * N + i) * LV, (c * N + i + 1) * LV), temp); return o; };
  models.stats = m;
  const mean = cats.map((_, c) => Array.from({ length: N }, (_, i) => {
    if (!COLOR()) { let s = 0; for (let v = 0; v < LV; v++) s += v * P[(c * N + i) * LV + v]; return s; }
    let r = 0, g = 0, b = 0; for (let v = 0; v < LV; v++) { const p = P[(c * N + i) * LV + v]; r += p * PAL[v * 3]; g += p * PAL[v * 3 + 1]; b += p * PAL[v * 3 + 2]; }
    return LUT[(q5(r) << 10) | (q5(g) << 5) | q5(b)];
  }));
  const res = { kind: 'stats', step: 1, train: loss(train), val: loss(val), params: m.count, samples: cats.map((_, c) => Array.from(m.sample(c, 1))), mean };
  post({ type: 'progress', ...res }); post({ type: 'done', ...res });
}

// ---------- krok 2: piksel po pikselu (transformer, jak ImageGPT) ----------
// Wejście: [kategoria, piksel 0, piksel 1, …, piksel 254], cel: [piksel 0, …, piksel 255].
// Na pozycji t sieć widzi kategorię i piksele przed t (wiersz po wierszu) i ocenia 16 możliwych odcieni piksela t.
function buildAR(hp) {
  const { layers: L, dim: d, heads: nh } = hp, T = N, Vin = LV + cats.length;
  const one = n => { const t = zeros([n]); t.d.fill(1); return t; };
  const Emb = param([Vin, d], .3), P = param([T, d], .1), params = [Emb, P], blocks = [];
  const s = 1 / Math.sqrt(d), sr = s / Math.sqrt(2 * L);
  for (let l = 0; l < L; l++) {
    const b = { g1: one(d), b1: zeros([d]), Wqkv: param([d, 3 * d], s), bqkv: zeros([3 * d]), Wp: param([d, d], sr), bp: zeros([d]),
      g2: one(d), b2: zeros([d]), W1: param([d, 4 * d], s), c1: zeros([4 * d]), W2: param([4 * d, d], sr / 2), c2: zeros([d]) };
    blocks.push(b); params.push(...Object.values(b));
  }
  const gf = one(d), bf = zeros([d]), Wo = param([d, LV], .01), bo = zeros([LV]);
  params.push(gf, bf, Wo, bo);
  const forward = (X, B, Tw) => {
    let x = addPos(gather(Emb, X), P, Tw); const atts = [];
    for (const b of blocks) {
      const at = causalAttention(addBias(matmul(layerNorm(x, b.g1, b.b1), b.Wqkv), b.bqkv), B, Tw, nh); atts.push(at);
      x = add(x, addBias(matmul(at, b.Wp), b.bp));
      x = add(x, addBias(matmul(gelu(addBias(matmul(layerNorm(x, b.g2, b.b2), b.W1), b.c1)), b.W2), b.c2));
    }
    return { logits: addBias(matmul(layerNorm(x, gf, bf), Wo), bo), atts };
  };
  // hp.ctx i chars: ten sam układ wag co transformer tekstowy, więc działa też silnik GPU
  return { kind: 'ar', hp: { ...hp, ctx: T }, chars: Array.from({ length: LV }, (_, i) => String(i)), E: Emb, params, forward, count: params.reduce((a, p) => a + p.size, 0) };
}
function arBatch(set, idxs) {
  const B = idxs.length, X = new Int32Array(B * N), Y = new Int32Array(B * N);
  idxs.forEach((k, b) => { const { c, p } = set[k]; X[b * N] = LV + c; for (let t = 1; t < N; t++) X[b * N + t] = p[t - 1]; Y.set(p, b * N); });
  return { X, Y };
}
const randBatch = B => arBatch(train, Array.from({ length: B }, () => randInt(train.length)));
// Generowanie z pamięcią kluczy i wartości (KV cache), jak w dużych modelach: każdy narysowany piksel
// liczymy raz, a jego klucze i wartości z każdej warstwy zostają w pamięci. Nowy piksel tylko pyta je uwagą.
// Bez tego każdy krok liczyłby od nowa cały dotychczasowy obrazek (wolniej o ok. 100×). Zwykłe tablice, bez gradientów.
function generate(m, classes, temp, onPart, force) {
  const probs = force ? classes.map(() => []) : null;
  const { layers: L, dim: d, heads: nh } = m.hp, hd = d / nh, sc = 1 / Math.sqrt(hd), P = m.params.map(p => p.d), B = classes.length;
  const Emb = P[0], Pos = P[1], blk = l => P.slice(2 + l * 12, 14 + l * 12), [gf, bf, Wo, bo] = P.slice(2 + L * 12);
  const Kc = Array.from({ length: L }, () => new Float32Array(B * N * d)), Vc = Array.from({ length: L }, () => new Float32Array(B * N * d));
  const out = classes.map(() => new Uint8Array(N)), tok = classes.map(c => LV + c);
  const ln = (x, g, b) => { let mu = 0; for (let j = 0; j < d; j++) mu += x[j]; mu /= d; let v = 0; for (let j = 0; j < d; j++) v += (x[j] - mu) ** 2; const r = 1 / Math.sqrt(v / d + 1e-5); return Float32Array.from(x, (z, j) => (z - mu) * r * g[j] + b[j]); };
  const mv = (x, W, bias, n, mOut) => { const o = Float32Array.from(bias); for (let i = 0; i < n; i++) { const xi = x[i]; if (!xi) continue; for (let j = 0; j < mOut; j++) o[j] += xi * W[i * mOut + j]; } return o; };
  const gl = z => .5 * z * (1 + Math.tanh(.7978845608 * (z + .044715 * z * z * z)));
  for (let t = 0; t < N; t++) {
    for (let b = 0; b < B; b++) {
      let x = new Float32Array(d); for (let j = 0; j < d; j++) x[j] = Emb[tok[b] * d + j] + Pos[t * d + j];
      for (let l = 0; l < L; l++) {
        const [g1, b1, Wqkv, bqkv, Wp, bp, g2, b2, W1, c1, W2, c2] = blk(l), qkv = mv(ln(x, g1, b1), Wqkv, bqkv, d, 3 * d);
        const base = (b * N + t) * d; Kc[l].set(qkv.subarray(d, 2 * d), base); Vc[l].set(qkv.subarray(2 * d), base);
        const at = new Float32Array(d), w = new Float32Array(t + 1);
        for (let h = 0; h < nh; h++) {
          let mx = -Infinity;
          for (let j = 0; j <= t; j++) { let s = 0; const kb = (b * N + j) * d + h * hd; for (let k = 0; k < hd; k++) s += qkv[h * hd + k] * Kc[l][kb + k]; w[j] = s * sc; if (w[j] > mx) mx = w[j]; }
          let sum = 0; for (let j = 0; j <= t; j++) { w[j] = Math.exp(w[j] - mx); sum += w[j]; }
          for (let j = 0; j <= t; j++) { const p = w[j] / sum, vb = (b * N + j) * d + h * hd; for (let k = 0; k < hd; k++) at[h * hd + k] += p * Vc[l][vb + k]; }
        }
        const pr = mv(at, Wp, bp, d, d); for (let j = 0; j < d; j++) x[j] += pr[j];
        const hdn = mv(ln(x, g2, b2), W1, c1, d, 4 * d).map(gl), o2 = mv(hdn, W2, c2, 4 * d, d); for (let j = 0; j < d; j++) x[j] += o2[j];
      }
      const pr = softmax(mv(ln(x, gf, bf), Wo, bo, d, LV)), v = force ? force[b][t] : pick(pr, temp);
      if (probs) probs[b].push(pr);
      out[b][t] = v; tok[b] = v;
    }
    if (onPart && (t % W === W - 1)) onPart(t + 1, out);
  }
  return force ? probs : out;
}
// Wersja bez pamięci kluczy (wolna), zostawiona do porównania szybkości i sprawdzenia zgodności.
function generateSlow(m, classes, temp, onPart) {
  const B = classes.length, seqs = classes.map(c => [LV + c]), out = classes.map(() => new Uint8Array(N));
  for (let t = 0; t < N; t++) {
    const len = t + 1, X = new Int32Array(B * len);
    seqs.forEach((s, b) => X.set(s, b * len));
    const lg = m.forward(X, B, len).logits.d;
    for (let b = 0; b < B; b++) {
      const v = pick(softmax(lg.subarray(((b * len) + len - 1) * LV, ((b * len) + len) * LV)), temp);
      out[b][t] = v; seqs[b].push(v);
    }
    if (onPart && (t % W === W - 1)) onPart(t + 1, out);
  }
  return out;
}
// Uwaga na obrazku: dla jednego obrazka sprawdzającego wagi uwagi wszystkich warstw i głów.
function attnProbe(m) {
  if (COLOR()) return null;                              // 2560 × 2560 wag na głowę: za dużo, by je przesyłać
  const v = val[randInt(val.length)], { X } = arBatch([v], [0]), { atts } = m.forward(X, 1, N);
  return { c: v.c, pix: Array.from(v.p), L: atts.length, nh: m.hp.heads, att: atts.map(a => a.att) };
}
function evalAR(m, set) {
  if (COLOR()) { let l = 0; set.forEach(v => { const { X, Y } = arBatch([v], [0]); l += crossEntropy(m.forward(X, 1, N).logits, Y).d[0]; }); return l / set.length; }   // po jednym: macierze uwagi są duże
  const { X, Y } = arBatch(set, set.map((_, i) => i));
  return crossEntropy(m.forward(X, set.length, N).logits, Y).d[0];
}
// Widok neuronów: próbka wag między pokazanymi kółkami (12 z d, 16 z 4d, wybrane wejścia i 16 wyjść).
const spread = (n, k) => Array.from({ length: Math.min(n, k) }, (_, i) => Math.round(i * (n - 1) / Math.max(1, Math.min(n, k) - 1)));
function weightViz(m) {
  const { layers: L, dim: d } = m.hp, P = m.params.map(p => p.d), di = spread(d, 12), hi = spread(4 * d, 16);
  const ti = [...spread(LV, 6), ...cats.map((_, i) => LV + i).slice(0, 6)], oi = spread(LV, 16);
  const sub = (W, cols, rows, cs) => rows.map(r => cs.map(c => W[r * cols + c]));
  const blocks = Array.from({ length: L }, (_, l) => ({ w1: sub(P[2 + l * 12 + 8], 4 * d, di, hi), w2: sub(P[2 + l * 12 + 10], d, hi, di) }));
  return { tok: ti.map(t => t < LV ? `${COLOR() ? 'kolor' : 'odcień'} ${t}` : cats[t - LV]), emb: sub(P[0], d, ti, di), blocks, wo: sub(P[2 + L * 12 + 2], LV, di, oi), outIdx: oi };
}
function extrasAR(m) {
  const t0 = now(), cls = cats.map((_, i) => i).slice(0, COLOR() ? 4 : cats.length), imgs = generate(m, cls, .8);   // w kolorze 4 obrazki: 2560 kroków każdy
  return { samples: imgs.map(a => Array.from(a)), sampleClasses: cls, attn: attnProbe(m), genMs: now() - t0, wviz: weightViz(m) };
}

function trainAR(hp) {
  try { setBackend(hp.device === 'cpu' ? 'js' : 'wasm'); } catch (e) { setBackend('js'); }
  const m = buildAR(hp), opt = new Adam(m.params, hp.lr), job = { stop: false }, vs = valSet(COLOR() ? 4 : 32), ts = train.slice(0, COLOR() ? 4 : 32);
  running = job; models.ar = m;
  const dev = hp.device === 'cpu' ? 'JS' : 'WASM SIMD';
  let step = 0, ema = null, lastVal = evalAR(m, vs), best = { val: lastVal, step: 0, w: m.params.map(p => p.d.slice()) }, tVal = now(), tEx = now(), ms = null;
  const base = () => ({ kind: 'ar', step, train: ema, val: lastVal, params: m.count, bestStep: best.step, ms, device: dev });
  post({ type: 'progress', ...base(), wviz: weightViz(m) });
  const tick = () => {
    if (job.stop || step >= hp.steps) return finish();
    const t0 = now(), s0 = step;
    while (now() - t0 < 80 && step < hp.steps) {
      const { X, Y } = randBatch(hp.batch), loss = crossEntropy(m.forward(X, hp.batch, N).logits, Y);
      opt.zeroGrad(); backward(loss); opt.clip(1);
      opt.lr = hp.lr * (step > hp.steps * .7 ? .2 : 1); opt.step(); step++;
      ema = ema == null ? loss.d[0] : ema * .95 + loss.d[0] * .05;
    }
    ms = (now() - t0) / (step - s0);
    const msg = { type: 'progress', ...base() };
    if (now() - tVal > 3000) { tVal = now(); lastVal = evalAR(m, vs); if (lastVal < best.val - 1e-4) best = { val: lastVal, step, w: m.params.map(p => p.d.slice()) }; Object.assign(msg, base()); }
    if (now() - tEx > (COLOR() ? 60000 : 20000)) { tEx = now(); Object.assign(msg, extrasAR(m)); }
    post(msg); setTimeout(tick, 0);
  };
  const finish = () => {
    let v = evalAR(m, vs), restored = false;
    if (v < best.val - 1e-4) best = { val: v, step, w: null }; else if (v > best.val + .01) { m.params.forEach((p, i) => p.d.set(best.w[i])); v = best.val; restored = true; }
    lastVal = v; running = null;
    post({ type: 'done', ...base(), val: v, train: evalAR(m, ts), restored, ...extrasAR(m) });
  };
  setTimeout(tick, 0);
}


// ======================================================================================
// Kroki 3–5: VAE, GAN, dyfuzja. Rysunek to 256 liczb ciągłych (odcień / 15), kategoria to „jedynka
// na swojej pozycji” (one-hot) doklejona do wejścia. Zwykłe warstwy gęste (MLP): przy 16×16 wystarczą.
// ======================================================================================
function dense(nIn, nOut, sc) { return { W: param([nIn, nOut], sc != null ? sc : Math.sqrt(2 / nIn)), b: zeros([nOut]) }; }
const lin = (x, L) => addBias(matmul(x, L.W), L.b);
const lparams = Ls => Ls.flatMap(L => [L.W, L.b]);
function onehot(cl, C) { const o = new Float32Array(cl.length * C); cl.forEach((c, i) => { if (c >= 0) o[i * C + c] = 1; }); return new T(o, [cl.length, C]); }
function realBatch(set, idxs, sc = 1, sh = 0) {
  const x = new Float32Array(idxs.length * D), cl = idxs.map(k => set[k].c);
  idxs.forEach((k, b) => {
    const p = set[k].p;
    if (COLOR()) for (let i = 0; i < N; i++) { const c = p[i] * 3; for (let j = 0; j < 3; j++) x[b * D + i * 3 + j] = PAL[c + j] * sc + sh; }
    else for (let i = 0; i < N; i++) x[b * D + i] = p[i] / (LV - 1) * sc + sh;
  });
  return { x, cl };
}
const rnd = B => Array.from({ length: B }, () => randInt(train.length));
function gauss(n) { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = randn(); return o; }
// liczby sieci → piksele: odcień albo najbliższy kolor palety
const toPix = (arr, lo = 0, hi = 1) => Array.from({ length: arr.length / D }, (_, b) => {
  const a = arr.subarray(b * D, (b + 1) * D), f = v => (v - lo) / (hi - lo);
  if (!COLOR()) return Array.from(a, v => Math.max(0, Math.min(LV - 1, Math.round(f(v) * (LV - 1)))));
  return Array.from({ length: N }, (_, i) => LUT[(q5(f(a[i * 3])) << 10) | (q5(f(a[i * 3 + 1])) << 5) | q5(f(a[i * 3 + 2]))]);
});
function sigArr(a) { return a.map(v => 1 / (1 + Math.exp(-v))); }

// Wspólna pętla dla kroków 3–5: krok nauki, sprawdzanie, podglądy, najlepsza wersja.
function genLoop(kind, m, hp, fns) {
  try { setBackend(hp.device === 'cpu' ? 'js' : 'wasm'); } catch (e) { setBackend('js'); }
  const job = { stop: false }, dev = hp.device === 'cpu' ? 'JS' : 'WASM SIMD';
  running = job; models[kind] = m;
  let step = 0, ema = {}, lastVal = fns.val ? fns.val() : null, best = lastVal != null ? { val: lastVal, step: 0, w: m.params.map(p => p.d.slice()) } : null, tVal = now(), tEx = now(), ms = null;
  const base = () => ({ kind, step, train: ema.main, val: lastVal, params: m.count, bestStep: best ? best.step : null, ms, device: dev, stats: { ...ema } });
  post({ type: 'progress', ...base(), ...fns.extras(), wviz: fns.wviz && fns.wviz() });
  const tick = () => {
    if (job.stop || step >= hp.steps) return finish();
    const t0 = now(), s0 = step;
    while (now() - t0 < 80 && step < hp.steps) {
      const r = fns.step(step); step++;
      for (const k in r) ema[k] = ema[k] == null ? r[k] : ema[k] * .97 + r[k] * .03;
    }
    ms = (now() - t0) / (step - s0);
    const msg = { type: 'progress', ...base() };
    if (fns.val && now() - tVal > 1500) { tVal = now(); lastVal = fns.val(); if (lastVal < best.val - 1e-4) best = { val: lastVal, step, w: m.params.map(p => p.d.slice()) }; Object.assign(msg, base()); }
    if (now() - tEx > (COLOR() ? (kind === 'diff' ? 40000 : 15000) : 6000)) { tEx = now(); Object.assign(msg, fns.extras(), { wviz: fns.wviz && fns.wviz() }); }   // w kolorze podglądy są drogie (dyfuzja: T przejść)
    post(msg); setTimeout(tick, 0);
  };
  const finish = () => {
    let restored = false;
    if (fns.val) { let v = fns.val(); if (v > best.val + .002 * Math.abs(best.val)) { m.params.forEach((p, i) => p.d.set(best.w[i])); v = best.val; restored = true; } lastVal = v; }
    running = null;
    post({ type: 'done', ...base(), restored, ...fns.extras(), wviz: fns.wviz && fns.wviz() });
  };
  setTimeout(tick, 0);
}
const vsSet = () => valSet(48);
const wsub = (W, cols, rows, cs) => rows.map(r => cs.map(c => W[r * cols + c]));

// ---------- krok 3: autoenkoder wariacyjny (VAE, Kingma i Welling 2013) ----------
// Koder ściska rysunek (i kategorię) do kilku liczb z: średniej mu i rozrzutu. Dekoder z samego z i kategorii
// odtwarza rysunek. Błąd = jak źle odtworzył + jak daleko rozkład z odbiega od zwykłego rozkładu normalnego.
// Dzięki temu drugiemu składnikowi każdy punkt przestrzeni z daje sensowny rysunek: losujemy z i rysujemy.
function buildVAE(hp) {
  const C = cats.length, H = hp.hidden, Z = hp.z;
  const e1 = dense(D + C, H), em = dense(H, Z, .01), ev = dense(H, Z, .01), d1 = dense(Z + C, H), d2 = dense(H, D, .01);
  const m = { kind: 'vae', hp, params: lparams([e1, em, ev, d1, d2]), L: { e1, em, ev, d1, d2 } };
  m.count = m.params.reduce((a, p) => a + p.size, 0);
  m.encode = (x, ch) => { const h = tanh(lin(concatCols(x, ch), e1)); return { mu: lin(h, em), lv: lin(h, ev) }; };
  m.decode = (z, ch) => lin(tanh(lin(concatCols(z, ch), d1)), d2);
  m.loss = ({ x, cl }, eps) => {
    const B = cl.length, X = new T(x, [B, D]), ch = onehot(cl, C), { mu, lv } = m.encode(X, ch);
    const z = add(mu, mul(expScale(lv, .5), new T(eps || gauss(B * Z), [B, Z])));
    const rec = bceLogits(m.decode(z, ch), x), kl = klNormal(mu, lv);
    return { total: add(rec, scale(kl, hp.beta)), rec: rec.d[0], kl: kl.d[0] };
  };
  m.sample = cl => toPix(sigArr(m.decode(new T(gauss(cl.length * Z), [cl.length, Z]), onehot(cl, C)).d));
  return m;
}
function trainVAE(hp) {
  const m = buildVAE(hp), opt = new Adam(m.params, hp.lr), vs = vsSet(), vb = realBatch(vs, vs.map((_, i) => i)), veps = gauss(vs.length * hp.z), C = cats.length;
  genLoop('vae', m, hp, {
    step: () => { const r = m.loss(realBatch(train, rnd(hp.batch))); opt.zeroGrad(); backward(r.total); opt.clip(5); opt.step(); return { main: r.total.d[0] / D, rec: r.rec / D, kl: r.kl }; },
    val: () => { const r = m.loss(vb, veps); return r.total.d[0] / D; },
    extras: () => {
      const cl = cats.map((_, i) => i), ri = vs.slice(0, 8), rb = realBatch(ri, ri.map((_, i) => i)), { mu } = m.encode(new T(rb.x, [8, D]), onehot(rb.cl, C));
      return { samples: m.sample(cl), recon: { real: toPix(rb.x), rec: toPix(sigArr(m.decode(mu, onehot(rb.cl, C)).d)) } };
    },
    wviz: () => vizMLP([['rysunek + kategoria', D + C], ['ukryta', hp.hidden], ['z (przestrzeń ukryta)', hp.z], ['ukryta', hp.hidden], ['rysunek', D]], [m.L.e1.W, m.L.em.W, m.L.d1.W, m.L.d2.W]),
  });
}
// Mapa przestrzeni ukrytej: siatka rysunków dla z1, z2 od −2,5 do 2,5 (pozostałe wymiary 0), jedna kategoria.
function latentMap(m, c, n = 8) {
  const Z = m.hp.z, z = new Float32Array(n * n * Z);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { z[(i * n + j) * Z] = -2.5 + 5 * j / (n - 1); if (Z > 1) z[(i * n + j) * Z + 1] = -2.5 + 5 * i / (n - 1); }
  return toPix(sigArr(m.decode(new T(z, [n * n, Z]), onehot(Array(n * n).fill(c), cats.length)).d));
}

// ---------- krok 4: GAN (Goodfellow i in. 2014) ----------
// Dwie sieci grają przeciwko sobie. Generator z losowego szumu (i kategorii) robi rysunek. Krytyk (dyskryminator)
// dostaje rysunek prawdziwy albo podrobiony i ocenia, czy jest prawdziwy. Krytyk uczy się odróżniać,
// generator uczy się oszukiwać krytyka. Nikt nie mówi generatorowi, jak ma wyglądać rysunek.
function buildGAN(hp) {
  const C = cats.length, H = hp.hidden, Z = hp.noise;
  const g1 = dense(Z + C, H), g2 = dense(H, H), g3 = dense(H, D, .02), k1 = dense(D + C, H), k2 = dense(H, H >> 1), k3 = dense(H >> 1, 1, .02);
  const Ec = param([C, H >> 1], .1);                      // projekcja: wektor każdej kategorii, porównywany z cechami rysunku
  const m = { kind: 'gan', hp, G: lparams([g1, g2, g3]), D: [...lparams([k1, k2, k3]), Ec], L: { g1, g2, g3, k1, k2, k3 } };
  m.params = [...m.G, ...m.D]; m.count = m.params.reduce((a, p) => a + p.size, 0);
  m.gen = (z, ch) => sigmoid(lin(gelu(lin(gelu(lin(concatCols(z, ch), g1)), g2)), g3));
  // ocena krytyka = ogólna „prawdziwość” cech h + zgodność h z wektorem kategorii (dyskryminator projekcyjny, Miyato 2018)
  m.crit = (x, ch, cl) => { const h = gelu(lin(gelu(lin(concatCols(x, ch), k1)), k2)); return add(lin(h, k3), matmul(mul(h, gather(Ec, Int32Array.from(cl))), new T(new Float32Array(H >> 1).fill(1), [H >> 1, 1]))); };
  m.fixed = gauss(cats.length * Z);                       // ten sam szum przez całą naukę: widać, jak zmienia się ten sam rysunek
  m.sample = (cl, z) => toPix(m.gen(new T(z || gauss(cl.length * Z), [cl.length, Z]), onehot(cl, C)).d);
  return m;
}
// Jeden krok gry: najpierw krytyk (prawdziwe → „prawdziwy”, podrobione → „podróbka”), potem generator
// (chce, żeby krytyk uznał jego podróbki za prawdziwe). Dwie sztuczki stabilizujące: lekki szum na wejściu
// krytyka, malejący w trakcie nauki (trudniej mu „wygrać” zbyt szybko), i etykieta 0,9 zamiast 1 dla prawdziwych.
function ganStep(m, oG, oD, hp, frac) {
  const C = cats.length, Z = hp.noise, B = hp.batch, sig = .25 * Math.max(0, 1 - frac / .8);
  const noisy = a => { const o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] + sig * randn(); return o; };
  const ones = new Float32Array(B).fill(.9), zer = new Float32Array(B), one1 = new Float32Array(B).fill(1);
  const { x, cl } = realBatch(train, rnd(B)), ch = onehot(cl, C);
  const fake = m.gen(new T(gauss(B * Z), [B, Z]), ch), fakeD = new T(noisy(fake.d), fake.s);   // kopia bez gradientu do generatora
  const dr = m.crit(new T(noisy(x), [B, D]), ch, cl), df = m.crit(fakeD, ch, cl), lD = add(bceLogits(dr, ones), bceLogits(df, zer));
  oD.zeroGrad(); backward(lD); oD.step();
  const cl2 = rnd(B).map(k => train[k].c), ch2 = onehot(cl2, C), fk = m.gen(new T(gauss(B * Z), [B, Z]), ch2);
  const dg = m.crit(sig ? add(fk, new T(gauss(B * D).map(v => v * sig), fk.s)) : fk, ch2, cl2), lG = bceLogits(dg, one1);
  oG.zeroGrad(); backward(lG); oG.step();
  const mean = a => a.reduce((s, v) => s + 1 / (1 + Math.exp(-v)), 0) / a.length;
  return { main: lG.d[0], d: lD.d[0], pr: mean(dr.d), pf: mean(df.d) };
}
function trainGAN(hp) {
  const m = buildGAN(hp), C = cats.length, Z = hp.noise, oG = new Adam(m.G, hp.lr, .5), oD = new Adam(m.D, hp.lr * .5, .5);
  genLoop('gan', m, hp, {
    step: s => ganStep(m, oG, oD, hp, s / hp.steps),
    extras: () => ({ samples: m.sample(cats.map((_, i) => i), m.fixed) }),
    wviz: () => vizMLP([['szum + kategoria', Z + C], ['ukryta', hp.hidden], ['ukryta', hp.hidden], ['rysunek', D]], [m.L.g1.W, m.L.g2.W, m.L.g3.W]),
  });
}

// ---------- krok 5: dyfuzja (Ho i in. 2020, DDPM) ----------
// Nauka: do rysunku dodajemy losową ilość szumu (krok t z T) i każemy sieci zgadnąć czysty rysunek spod szumu.
// (Oryginalny DDPM zgaduje sam szum; to ta sama metoda, inna parametryzacja, łatwiejsza dla małej sieci.)
// Rysowanie: startujemy z czystego szumu i T razy robimy mały krok w stronę zgadniętego rysunku.
// Kategorię czasem (10%) ukrywamy, więc sieć umie też rysować „bez podpowiedzi”. Przy rysowaniu mieszamy obie
// odpowiedzi: im większa siła podpowiedzi (guidance), tym wyraźniej rysunek pasuje do kategorii.
function schedule(T) {
  const s = .008, f = t => Math.cos(((t / T) + s) / (1 + s) * Math.PI / 2) ** 2, ab = [1], beta = [0];
  for (let t = 1; t <= T; t++) { ab.push(f(t) / f(0)); beta.push(Math.min(.999, 1 - ab[t] / ab[t - 1])); }
  return { ab, beta, T };
}
function tEmb(ts, dim = 32) { const o = new Float32Array(ts.length * dim); ts.forEach((t, i) => { for (let k = 0; k < dim / 2; k++) { const f = t * Math.exp(-Math.log(1000) * k / (dim / 2)); o[i * dim + k] = Math.sin(f); o[i * dim + dim / 2 + k] = Math.cos(f); } }); return o; }
function buildDiff(hp) {
  const C = cats.length, H = hp.hidden, CE = 32;
  const cemb = param([C + 1, CE], .3), l1 = dense(D + 32 + CE, H), l2 = dense(H, H), l3 = dense(H, H), l4 = dense(H, D, .01);
  const m = { kind: 'diff', hp, params: [cemb, ...lparams([l1, l2, l3, l4])], L: { l1, l2, l3, l4 }, sch: schedule(hp.T) };
  m.count = m.params.reduce((a, p) => a + p.size, 0);
  m.eps = (xt, ts, cl) => {   // przewidywany czysty rysunek dla x_t w kroku t i kategorii (C = „bez kategorii”)
    const B = ts.length, inp = concatCols(concatCols(new T(xt, [B, D]), new T(tEmb(ts), [B, 32])), gather(cemb, Int32Array.from(cl, c => c < 0 ? C : c)));
    return lin(gelu(lin(gelu(lin(gelu(lin(inp, l1)), l2)), l3)), l4);
  };
  m.loss = ({ x, cl }, ts, noise, drop = .1) => {
    const B = cl.length, { ab } = m.sch, xt = new Float32Array(B * D);
    for (let b = 0; b < B; b++) { const a = Math.sqrt(ab[ts[b]]), s = Math.sqrt(1 - ab[ts[b]]); for (let i = 0; i < D; i++) xt[b * D + i] = a * x[b * D + i] + s * noise[b * D + i]; }
    return mse(m.eps(xt, ts, cl.map(c => Math.random() < drop ? -1 : c)), x);
  };
  // rysowanie: T kroków odszumiania; frames: stan rysunku co kilka kroków (do animacji)
  m.sample = (cl, guide, onFrame) => {
    const { ab, beta, T: TT } = m.sch, B = cl.length; let x = gauss(B * D);
    for (let t = TT; t >= 1; t--) {
      const ts = Array(2 * B).fill(t), xx = new Float32Array(2 * B * D); xx.set(x); xx.set(x, B * D);
      const e = m.eps(xx, ts, [...cl, ...cl.map(() => -1)]).d, nx = new Float32Array(B * D);
      const at = 1 - beta[t], abt = ab[t], abp = ab[t - 1];
      for (let i = 0; i < B * D; i++) {
        const eu = e[B * D + i];
        let x0 = eu + guide * (e[i] - eu); x0 = Math.max(-1, Math.min(1, x0));            // podpowiedź: od „bez kategorii” w stronę „z kategorią”
        const mean = Math.sqrt(abp) * beta[t] / (1 - abt) * x0 + Math.sqrt(at) * (1 - abp) / (1 - abt) * x[i];
        nx[i] = mean + (t > 1 ? Math.sqrt(beta[t] * (1 - abp) / (1 - abt)) * randn() : 0);
      }
      x = nx;
      if (onFrame && (t % Math.max(1, TT / 10 | 0) === 0 || t === 1)) onFrame(TT - t + 1, x);
    }
    return toPix(x, -1, 1);
  };
  // Rysowanie z kilkoma podpowiedziami naraz (Liu i in. 2022, „composable diffusion”): dla każdego obrazka
  // lista kategorii z wagą dla każdego piksela. W każdym kroku sieć zgaduje rysunek osobno dla każdej kategorii
  // i bez kategorii, a my składamy: bez kategorii + siła × Σ waga · (z kategorią − bez kategorii).
  // Mieszanie: te same wagi w całym obrazku. Obszary: waga zależy od miejsca (góra kot, dół drzewo).
  m.sampleW = (items, guide, onFrame, seed) => {
    const { ab, beta, T: TT } = m.sch, B = items.length, K = items[0].conds.length, R = B * (K + 1);
    const gs = items.map(() => seed != null ? seededGauss(seed) : randn);       // ten sam szum dla każdego obrazka: widać samą zmianę podpowiedzi
    let x = new Float32Array(B * D); for (let b = 0; b < B; b++) for (let i = 0; i < D; i++) x[b * D + i] = gs[b]();
    const cls = []; items.forEach(it => { it.conds.forEach(c => cls.push(c.c)); cls.push(-1); });
    for (let t = TT; t >= 1; t--) {
      const xx = new Float32Array(R * D);
      for (let b = 0; b < B; b++) for (let k = 0; k <= K; k++) xx.set(x.subarray(b * D, (b + 1) * D), (b * (K + 1) + k) * D);
      const e = m.eps(xx, Array(R).fill(t), cls).d, nx = new Float32Array(B * D), at = 1 - beta[t], abt = ab[t], abp = ab[t - 1];
      for (let b = 0; b < B; b++) for (let i = 0; i < D; i++) {
        const u = e[(b * (K + 1) + K) * D + i]; let acc = 0;
        items[b].conds.forEach((c, k) => { acc += c.w[(i / CH) | 0] * (e[(b * (K + 1) + k) * D + i] - u); });
        const x0 = Math.max(-1, Math.min(1, u + guide * acc)), xi = x[b * D + i];
        const mean = Math.sqrt(abp) * beta[t] / (1 - abt) * x0 + Math.sqrt(at) * (1 - abp) / (1 - abt) * xi;
        nx[b * D + i] = mean + (t > 1 ? Math.sqrt(beta[t] * (1 - abp) / (1 - abt)) * gs[b]() : 0);
      }
      x = nx;
      if (onFrame && (t % Math.max(1, TT / 10 | 0) === 0 || t === 1)) onFrame(TT - t + 1, x);
    }
    return toPix(x, -1, 1);
  };
  return m;
}
// Losowanie z ziarnem: ten sam początek daje ten sam ciąg liczb (do porównań „przy tym samym szumie”).
function seededGauss(seed) {
  let s = (seed >>> 0) || 1;
  const u = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s + .5) / 4294967296; };
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}
// Wyobraźnia: mieszanie dwóch kategorii (VAE, GAN, dyfuzja) i obszary malowane pędzlem (dyfuzja).
function softHot(c1, c2, a) { const o = new Float32Array(cats.length); o[c1] += 1 - a; o[c2] += a; return o; }
function blurMask(mask) {   // łagodna granica obszarów: 3×3 średnia, żeby szew się zszył
  const o = new Float32Array(N), r = COLOR() ? 2 : 1;   // w 64×40 szerzej: obszar ma więcej pikseli
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < H && xx >= 0 && xx < W) { s += mask[yy * W + xx]; n++; } } o[y * W + x] = s / n; }
  return o;
}
function imagine(q, onFrame) {
  const md = models[q.kind]; if (!md) throw new Error('Najpierw naucz tę sieć.');
  const seed = q.seed || (1 + randInt(1e9)), steps = [0, 1 / 6, 2 / 6, .5, 4 / 6, 5 / 6, 1], C = cats.length;
  if (md.kind === 'vae' || md.kind === 'gan') {
    const Z = md.kind === 'vae' ? md.hp.z : md.hp.noise, g = seededGauss(seed), z = Float32Array.from({ length: Z }, g);
    const run = list => { const n = list.length, zz = new Float32Array(n * Z), ch = new Float32Array(n * C); list.forEach((a, i) => { zz.set(z, i * Z); ch.set(softHot(q.c1, q.c2, a), i * C); });
      const Zt = new T(zz, [n, Z]), Ct = new T(ch, [n, C]); return md.kind === 'vae' ? toPix(sigArr(md.decode(Zt, Ct).d)) : toPix(md.gen(Zt, Ct).d); };
    return { main: run([q.a])[0], strip: run(steps), seed };
  }
  const uni = a => [{ c: q.c1, w: new Float32Array(N).fill(1 - a) }, { c: q.c2, w: new Float32Array(N).fill(a) }];
  if (q.mask) {
    const w2 = blurMask(q.mask), w1 = w2.map(v => 1 - v);
    return { main: md.sampleW([{ conds: [{ c: q.c1, w: w1 }, { c: q.c2, w: w2 }] }], q.guide, onFrame, seed)[0], seed, region: true };
  }
  const main = md.sampleW([{ conds: uni(q.a) }], q.guide, onFrame, seed)[0];
  return { main, strip: md.sampleW(steps.map(a => ({ conds: uni(a) })), q.guide, null, seed), seed };
}
function trainDiff(hp) {
  const m = buildDiff(hp), opt = new Adam(m.params, hp.lr), vs = vsSet(), vb = realBatch(vs, vs.map((_, i) => i), 2, -1);
  const vt = vs.map((_, i) => 1 + (i * 37) % hp.T), vn = gauss(vs.length * D);
  genLoop('diff', m, hp, {
    step: () => { const b = realBatch(train, rnd(hp.batch), 2, -1), ts = b.cl.map(() => 1 + randInt(hp.T)), l = m.loss(b, ts, gauss(hp.batch * D)); opt.zeroGrad(); backward(l); opt.clip(1); opt.step(); return { main: l.d[0] }; },
    val: () => m.loss(vb, vt, vn, 0).d[0],
    extras: () => {
      const frames = [], cl = cats.map((_, i) => i), samples = m.sample(cl, 2, (k, x) => { if (frames.length < 11) frames.push(toPix(x.subarray(0, D * 4), -1, 1)); });
      return { samples, frames };
    },
    wviz: () => vizMLP([['zaszumiony rysunek + krok t + kategoria', D + 64], ['ukryta', hp.hidden], ['ukryta', hp.hidden], ['ukryta', hp.hidden], ['przewidziany szum', D]], [m.L.l1.W, m.L.l2.W, m.L.l3.W, m.L.l4.W]),
  });
}
// Próbka wag do widoku neuronów: 12 lub 16 kółek na kolumnę.
function vizMLP(cols, Ws) {
  const idx = cols.map(([, n], i) => spread(n, i === 0 || i === cols.length - 1 ? 12 : 16));
  return { cols: cols.map(([label, n], i) => ({ label, n, show: idx[i].length })), mats: Ws.map((W, i) => wsub(W.d, cols[i + 1][1], idx[i], idx[i + 1])) };
}


// ======================================================================================
// Zgadywanie, co jest na rysunku. Metoda 1: sieć, która umie rysować, jako „zgadywacz” (klasyfikator generatywny).
// Dla każdej kategorii liczymy, jak bardzo rysunek zaskakuje model (bity na piksel przy tej kategorii).
// Wzór Bayesa przy równych szansach kategorii: P(kategoria | rysunek) ∝ P(rysunek | kategoria).
// Model nigdy nie uczył się rozpoznawać: umie to, bo nauczył się, jak wyglądają rysunki każdej kategorii.
// ======================================================================================
function genScores(kind, pixList) {
  const C = cats.length, md = models[kind];
  if (!md) return null;
  return pixList.map(pix => {
    const lp = new Float64Array(C);
    if (kind === 'stats') { for (let c = 0; c < C; c++) { let s = 0; for (let i = 0; i < N; i++) s += Math.log(md.P[(c * N + i) * LV + pix[i]]); lp[c] = s; } }
    else {
      // wszystkie kategorie naraz; w kolorze po jednej (macierze uwagi 2560 × 2560 na kategorię)
      const step = COLOR() ? 1 : C;
      for (let c0 = 0; c0 < C; c0 += step) {
      const n = Math.min(step, C - c0), X = new Int32Array(n * N);
      for (let k = 0; k < n; k++) { X[k * N] = LV + c0 + k; for (let t = 1; t < N; t++) X[k * N + t] = pix[t - 1]; }
      const lg = md.forward(X, n, N).logits.d;
      for (let k = 0; k < n; k++) { const c = c0 + k; let s = 0; for (let t = 0; t < N; t++) { const o = (k * N + t) * LV; let mx = -Infinity; for (let j = 0; j < LV; j++) mx = Math.max(mx, lg[o + j]); let z = 0; for (let j = 0; j < LV; j++) z += Math.exp(lg[o + j] - mx); s += lg[o + pix[t]] - mx - Math.log(z); } lp[c] = s; }
      }
    }
    let mx = -Infinity; for (const v of lp) mx = Math.max(mx, v);
    const e = Array.from(lp, v => Math.exp(v - mx)), z = e.reduce((a, b) => a + b, 0);
    return { probs: e.map(v => v / z), bits: Array.from(lp, v => -v / N / Math.LN2) };
  });
}
// Trafność na rysunkach sprawdzających: po `per` z każdej kategorii (dla kroku 2 mniej, bo to 12 przejść sieci na rysunek).
function genAccuracy(kind, per, id) {
  const set = []; cats.forEach((_, c) => set.push(...val.filter(v => v.c === c).slice(0, per)));
  let ok = 0, done = 0; const conf = cats.map(() => new Array(cats.length).fill(0)), t0 = now();
  for (const v of set) {
    const r = genScores(kind, [v.p])[0], g = r.probs.indexOf(Math.max(...r.probs));
    conf[v.c][g]++; if (g === v.c) ok++; done++;
    if (now() - t0 > 400 && done % 12 === 0) post({ type: 'accProgress', id, kind, done, n: set.length });
  }
  return { kind, acc: ok / set.length, n: set.length, conf };
}


// Metoda 2: zwykły klasyfikator (dyskryminacyjny). Sieć gęsta 256 → 256 → 128 → 12 uczona wprost na pytanie
// „która kategoria?”. Rysować nie umie: wie tylko, po czym odróżnić kategorie od siebie.
function buildClf(hp) {
  const C = cats.length, l1 = dense(D, hp.hidden), l2 = dense(hp.hidden, hp.hidden >> 1), l3 = dense(hp.hidden >> 1, C, .01);
  const m = { kind: 'clf', hp, params: lparams([l1, l2, l3]), L: { l1, l2, l3 } };
  m.count = m.params.reduce((a, p) => a + p.size, 0);
  m.logits = x => lin(gelu(lin(gelu(lin(x, l1)), l2)), l3);
  m.probs = pixList => { const B = pixList.length, x = realBatch(pixList.map(p => ({ p, c: 0 })), pixList.map((_, i) => i)).x; const lg = m.logits(new T(x, [B, D])).d; return pixList.map((_, b) => softmax(lg.subarray(b * C, (b + 1) * C))); };
  return m;
}
function clfAccuracy(m, set) { let ok = 0; for (let i = 0; i < set.length; i += 200) { const part = set.slice(i, i + 200), pr = m.probs(part.map(v => v.p)); pr.forEach((p, k) => { if (p.indexOf(Math.max(...p)) === part[k].c) ok++; }); } return ok / set.length; }
function trainClf(hp) {
  try { setBackend('wasm'); } catch (e) { setBackend('js'); }
  const m = buildClf(hp), opt = new Adam(m.params, hp.lr), job = { stop: false }; let step = 0, ema = null, tR = 0;
  models.clf = m; running = job;
  const tick = () => {
    const t0 = now();
    while (now() - t0 < 80 && step < hp.steps && !job.stop) {
      const idx = rnd(hp.batch), { x, cl } = realBatch(train, idx), l = crossEntropy(m.logits(new T(x, [hp.batch, D])), Int32Array.from(cl));
      opt.zeroGrad(); backward(l); opt.lr = hp.lr * (step > hp.steps * .7 ? .2 : 1); opt.step(); step++;
      ema = ema == null ? l.d[0] : ema * .97 + l.d[0] * .03;
    }
    const doneNow = step >= hp.steps || job.stop;
    if (doneNow || now() - tR > 700) { tR = now(); post({ type: 'clfProgress', step, steps: hp.steps, loss: ema, acc: doneNow ? clfAccuracy(m, val) : null, params: m.count, done: doneNow }); }
    if (doneNow) { running = null; return; }
    setTimeout(tick, 0);
  };
  setTimeout(tick, 0);
}

// ---------- krok 2 na karcie graficznej ----------
let gpuEng = null;
// Zgodność: ten sam start i te same rysunki, jeden krok nauki na CPU i na GPU.
async function gpuSelfTest() {
  if (!gpuEng || gpuEng.lost) gpuEng = await GPUEngine.create();
  setBackend('wasm');
  const hp = { layers: 2, dim: 32, heads: 4 }, mC = buildAR(hp), mG = buildAR(hp), { X, Y } = randBatch(2);
  mG.params.forEach((p, i) => p.d.set(mC.params[i].d));
  const opt = new Adam(mC.params, .003), loss = crossEntropy(mC.forward(X, 2, N).logits, Y);
  opt.zeroGrad(); backward(loss); opt.clip(1); opt.step();
  gpuEng.dev.pushErrorScope('validation');
  const g = new GPUTransformer(gpuEng, mG, 2, 1); g.steps([{ X, Y }], .003, 1);
  const err = await gpuEng.dev.popErrorScope(); if (err) throw new Error('WebGPU: ' + err.message);
  const lossG = await g.lastLoss(); await g.pull();
  let diff = 0; mG.params.forEach((p, i) => { for (let j = 0; j < p.size; j++) diff = Math.max(diff, Math.abs(p.d[j] - mC.params[i].d[j])); });
  return { name: gpuEng.name, lossC: loss.d[0], lossG, diff };
}
async function trainARGPU(hp) {
  if (!gpuEng || gpuEng.lost) gpuEng = await GPUEngine.create();
  setBackend('wasm');
  const m = buildAR(hp), job = { stop: false }, vs = valSet(COLOR() ? 2 : 32), ts = train.slice(0, COLOR() ? 2 : 32), S = vs.length;
  running = job; models.ar = m;
  const g = new GPUTransformer(gpuEng, m, hp.batch, S), vXY = arBatch(vs, vs.map((_, i) => i)), tXY = arBatch(ts, ts.map((_, i) => i));
  const evalLoss = async ({ X, Y }) => { const r = await g.evalRows(X, Y); let l = 0; for (const v of r) l += v; return l / r.length; };
  let step = 0, ema = null, lastVal = await evalLoss(vXY), best = { val: lastVal, step: 0 }, tVal = now(), tEx = now(), k = 1, ms = null;
  g.snapshot();
  const dev = 'GPU · ' + gpuEng.name;
  const base = () => ({ kind: 'ar', step, train: ema, val: lastVal, params: m.count, bestStep: best.step, ms, device: dev });
  post({ type: 'progress', ...base(), wviz: weightViz(m) });
  while (!job.stop && step < hp.steps) {
    const n = Math.min(k, hp.steps - step), t0 = now();
    g.steps(Array.from({ length: n }, () => randBatch(hp.batch)), hp.lr * (step > hp.steps * .7 ? .2 : 1), 1);
    const L = await g.lastLoss(); step += n;
    ms = (now() - t0) / n; k = Math.max(1, Math.min(64, Math.round(200 / ms)));
    ema = ema == null ? L : ema * Math.pow(.95, n) + L * (1 - Math.pow(.95, n));
    const msg = { type: 'progress' };
    if (now() - tVal > 2000) { tVal = now(); lastVal = await evalLoss(vXY); if (lastVal < best.val - 1e-4) { best = { val: lastVal, step }; g.snapshot(); } }
    if (now() - tEx > (COLOR() ? 60000 : 20000)) { tEx = now(); await g.pull(); Object.assign(msg, extrasAR(m)); }
    post({ ...msg, ...base() });
    await new Promise(r => setTimeout(r, 0));
  }
  let v = await evalLoss(vXY), restored = false;
  if (v < best.val - 1e-4) best = { val: v, step }; else if (v > best.val + .01) { g.restore(); v = best.val; restored = true; }
  await g.pull(); lastVal = v; running = null;
  post({ type: 'done', ...base(), val: v, train: await evalLoss(tXY), restored, ...extrasAR(m) });
}

self.onmessage = e => {
  const m = e.data;
  try {
    if (m.cmd === 'data') { if (running) running.stop = true; post({ type: 'ready', ...setData(m.cats, m.cfg) }); }
    else if (m.cmd === 'train') {
      if (running) running.stop = true;
      if (m.kind === 'stats') trainStats();
      else if (m.kind === 'vae') trainVAE(m.hp);
      else if (m.kind === 'gan') trainGAN(m.hp);
      else if (m.kind === 'diff') trainDiff(m.hp);
      else if (m.hp.device === 'gpu') trainARGPU(m.hp).catch(err => { running = null; post({ type: 'error', msg: 'GPU: ' + (err.message || err) }); });
      else trainAR(m.hp);
    }
    else if (m.cmd === 'stop') { if (running) running.stop = true; }
    else if (m.cmd === 'trainClf') { if (running) running.stop = true; trainClf(m.hp); }
    else if (m.cmd === 'guess') post({ type: 'guess', id: m.id, clf: models.clf ? { probs: models.clf.probs([m.pix])[0] } : null, stats: (genScores('stats', [m.pix]) || [null])[0], ar: (genScores('ar', [m.pix]) || [null])[0] });
    else if (m.cmd === 'accuracy') post({ type: 'accuracy', id: m.id, ...(m.kind === 'clf' ? { kind: 'clf', acc: clfAccuracy(models.clf, val), n: val.length } : genAccuracy(m.kind, m.per, m.id)) });
    else if (m.cmd === 'valImage') { const v = val[randInt(val.length)]; post({ type: 'valImage', pix: Array.from(v.p), c: v.c }); }
    else if (m.cmd === 'imagine') { const r = imagine(m, (k, x) => post({ type: 'imgFrame', id: m.id, img: toPix(x, -1, 1)[0] })); post({ type: 'imagined', id: m.id, ...r }); }
    else if (m.cmd === 'latent') { const md = models.vae; if (!md) throw new Error('Najpierw naucz VAE.'); post({ type: 'latent', c: m.c, n: 8, imgs: latentMap(md, m.c) }); }
    else if (m.cmd === 'gputest') gpuSelfTest().then(r => post({ type: 'gputest', ok: true, ...r }), err => post({ type: 'gputest', ok: false, msg: String(err.message || err) }));
    else if (m.cmd === 'generate') {
      const md = models[m.kind]; if (!md) throw new Error('Najpierw naucz model.');
      if (md.kind === 'stats') post({ type: 'gen', id: m.id, done: true, n: N, imgs: m.classes.map(c => Array.from(md.sample(c, m.temp))) });
      else if (md.kind === 'vae' || md.kind === 'gan') post({ type: 'gen', id: m.id, done: true, n: N, imgs: md.sample(m.classes) });
      else if (md.kind === 'diff') { const out = md.sample(m.classes, m.guide, (k, x) => post({ type: 'gen', id: m.id, n: N, noisy: true, imgs: toPix(x, -1, 1) })); post({ type: 'gen', id: m.id, done: true, n: N, imgs: out }); }
      else { const out = generate(md, m.classes, m.temp, (n, o) => post({ type: 'gen', id: m.id, n, imgs: o.map(a => Array.from(a)) })); post({ type: 'gen', id: m.id, done: true, n: N, imgs: out.map(a => Array.from(a)) }); }
    }
  } catch (err) { post({ type: 'error', msg: String(err && err.message || err) }); }
};
