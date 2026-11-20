// Poziom jakości silnika — jedno miejsce, z którego czytają modele, materiały, efekty, woda i scena (jak poziomy
// jakości w prawdziwych silnikach). Ustawia go gra z ustawień gracza (js/core/settings.js, settings.gfx —
// js/render/game-graphics.js applyGraphics); bez ustawień — pełna jakość laboratoriów i edytora.
//
// QUALITY:
//   lodBias      0,5…2 — odległość przełączania modeli na wersję daleką (× odległość z wielkości modelu; mniej — wcześniej)
//   texture      'high' | 'low' — tekstury: rozdzielczość generowanych map MatKit (× 1 / × 0,5) i filtrowanie
//                anizotropowe (najwyżej 8 / 1)
//   fx           0,25…1 — gęstość efektów (liczba cząstek: odłamki, iskry, ogon kuli plazmy, ogień i dym pieca)
//   water        tak / nie — detal wody (gęstość siatki morza, drobne zmarszczki)
//   view         0,5…1 — zasięg widzenia (daleka płaszczyzna kamery, zasięg cieni)
//   smallShadows tak / nie — drobne części (do 0,25 m) rzucają cień
// setQuality(gfx | null) — z ustawień gracza (null — pełna); onQuality(fn) → odpięcie — fn(QUALITY, co się zmieniło)
export const FULL_QUALITY = { lodBias: 1, texture: 'high', fx: 1, water: true, view: 1, smallShadows: true };
export const QUALITY = { ...FULL_QUALITY };
const subs = new Set();

export function setQuality(gfx) {
  const g = gfx || {}, before = { ...QUALITY };
  QUALITY.lodBias = Number.isFinite(+g.lod) ? Math.max(0.5, Math.min(2, +g.lod)) : FULL_QUALITY.lodBias;
  QUALITY.texture = g.texture === 'low' ? 'low' : 'high';
  QUALITY.fx = Number.isFinite(+g.fx) ? Math.max(0.25, Math.min(1, +g.fx)) : FULL_QUALITY.fx;
  QUALITY.water = g.water !== false;
  QUALITY.view = Number.isFinite(+g.view) ? Math.max(0.5, Math.min(1, +g.view)) : FULL_QUALITY.view;
  QUALITY.smallShadows = g.smallShadows !== false;
  const changed = Object.keys(QUALITY).filter((k) => QUALITY[k] !== before[k]);
  if (changed.length) subs.forEach((f) => f(QUALITY, changed));
  return changed;
}
export function onQuality(fn) { subs.add(fn); return () => subs.delete(fn); }

/** Rozdzielczość generowanej tekstury przy obecnej jakości (najmniej 64). */
export const textureRes = (res) => Math.max(64, Math.round(res * (QUALITY.texture === 'low' ? 0.5 : 1)));
/** Filtrowanie anizotropowe przy obecnej jakości (max — możliwości karty). */
export const anisotropy = (max = 8) => (QUALITY.texture === 'low' ? 1 : Math.min(8, max));
/** Liczba cząstek przy obecnej gęstości efektów (najmniej 1). */
export const fxCount = (n) => Math.max(1, Math.round(n * QUALITY.fx));
