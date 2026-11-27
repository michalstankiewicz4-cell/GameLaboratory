// Generatory liczb losowych z ziarnem — jedno miejsce dla tych, które dają te same liczby (modele, tekstury, muzyka,
// pogoda zależą od ciągu liczb: inny algorytm zmieniłby ich wygląd, więc każdy wariant zostaje dokładnie taki, jaki był).
//   lcg(seed)          kongruencyjny (1664525, 1013904223), ziarno 0 → 1          (rośliny, skały, budynki z części, regiony, pixel art)
//   lcgRaw(seed)       to samo bez zamiany ziarna 0                                 (efekty uszkodzeń, ShipKit, nabrzeża)
//   mulberry32(seed)   Mulberry32                                                   (morze, głowy SDF, chodzące, ekspertyza, bloki, pogoda, wyładowania)
//   mulberry32nz(seed) Mulberry32, ziarno 0 → 1                                     (muzyka, życie, jaskinie)
//   xorshift32(seed)   xorshift 13 / 17 / 5 (przesunięcie 17 ze znakiem), ziarno 0 → 1 (MatKit, laboratorium sztuki)
// Każdy zwraca funkcję () → liczba z [0, 1).
export function lcg(seed) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
export function lcgRaw(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
export function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function mulberry32nz(seed) { return mulberry32((seed >>> 0) || 1); }
export function xorshift32(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
