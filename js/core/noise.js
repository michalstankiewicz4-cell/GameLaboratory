// Szum wartości z siatki (2D, zawijany: kafelkuje się na [0, 1)²) — wspólny dla tekstur proceduralnych (ShipKit, TexKit
// pociągów, efekty uszkodzeń). rand — generator z ziarnem (js/core/rng.js), cx × cy — siatka węzłów; wygładzanie
// smoothstep. Ta sama funkcja co dotąd w każdym z tych plików (te same liczby).
//   valueNoise(rand, cx, cy) → (u, v) → wartość z [0, 1)
export function valueNoise(rand, cx, cy) {
  const g = new Float32Array(cx * cy);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  const at = (x, y) => g[((y % cy + cy) % cy) * cx + ((x % cx + cx) % cx)];
  return (u, v) => {
    const fx = u * cx, fy = v * cy, x0 = Math.floor(fx), y0 = Math.floor(fy);
    let tx = fx - x0, ty = fy - y0;
    tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  };
}
