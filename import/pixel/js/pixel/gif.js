// GIF89a encoder for pixel art (no dependencies): one global colour table built from the frames' colours (up to 255
// plus a transparent index), LZW-compressed frames, per-frame delay, transparency with "restore to background"
// disposal (so a transparent sprite animates cleanly), and an endless loop.
export function encodeGIF(frames, { delay = 100, loop = 0, scale = 1 } = {}) {
  const w = frames[0].w * scale, h = frames[0].h * scale;
  // colour table: index 0 is transparent
  const map = new Map(), colors = [[0, 0, 0]];
  for (const f of frames) for (let i = 0; i < f.data.length; i += 4) if (f.data[i + 3] >= 128) {
    const k = (f.data[i] << 16) | (f.data[i + 1] << 8) | f.data[i + 2];
    if (!map.has(k)) { if (colors.length >= 256) continue; map.set(k, colors.length); colors.push([f.data[i], f.data[i + 1], f.data[i + 2]]); }
  }
  let bits = 1; while ((1 << bits) < colors.length) bits++;
  const size = 1 << bits;
  const out = [];
  const b = (v) => out.push(v & 255), w16 = (v) => { b(v); b(v >> 8); }, str = (s) => { for (const ch of s) b(ch.charCodeAt(0)); };
  str('GIF89a'); w16(w); w16(h); b(0x80 | ((bits - 1) << 4) | (bits - 1)); b(0); b(0);
  for (let k = 0; k < size; k++) { const c = colors[k] || [0, 0, 0]; b(c[0]); b(c[1]); b(c[2]); }
  if (frames.length > 1) { b(0x21); b(0xff); b(11); str('NETSCAPE2.0'); b(3); b(1); w16(loop); b(0); }
  const nearest = (r, g, bl) => { let bi = 1, bd = Infinity; for (let k = 1; k < colors.length; k++) { const c = colors[k], d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - bl) ** 2; if (d < bd) { bd = d; bi = k; } } return bi; };
  for (const f of frames) {
    const idx = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = ((Math.floor(y / scale)) * f.w + Math.floor(x / scale)) * 4;
      if (f.data[i + 3] < 128) continue;
      const k = (f.data[i] << 16) | (f.data[i + 1] << 8) | f.data[i + 2];
      idx[y * w + x] = map.has(k) ? map.get(k) : nearest(f.data[i], f.data[i + 1], f.data[i + 2]);
    }
    b(0x21); b(0xf9); b(4); b((2 << 2) | 1); w16(Math.round(delay / 10)); b(0); b(0);   // disposal: restore to background; transparent index 0
    b(0x2c); w16(0); w16(0); w16(w); w16(h); b(0);
    const minCode = Math.max(2, bits); b(minCode);
    const data = lzw(idx, minCode);
    for (let p = 0; p < data.length; p += 255) { const n = Math.min(255, data.length - p); b(n); for (let q = 0; q < n; q++) b(data[p + q]); }
    b(0);
  }
  b(0x3b);
  return new Uint8Array(out);
}

function lzw(idx, minCode) {
  const clear = 1 << minCode, eoi = clear + 1, out = [];
  let size = minCode + 1, next = eoi + 1, cur = 0, nb = 0, dict = new Map();
  const emit = (code) => { cur |= code << nb; nb += size; while (nb >= 8) { out.push(cur & 255); cur >>= 8; nb -= 8; } };
  emit(clear);
  let w = idx[0];
  for (let i = 1; i < idx.length; i++) {
    const k = idx[i], key = w * 4096 + k;
    if (dict.has(key)) { w = dict.get(key); continue; }
    emit(w);
    if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
    else { emit(clear); dict = new Map(); size = minCode + 1; next = eoi + 1; }
    w = k;
  }
  emit(w); emit(eoi);
  if (nb > 0) out.push(cur & 255);
  return out;
}
