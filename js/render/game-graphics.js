// Ustawienia grafiki gry (js/gameui/settings.js, settings.gfx) na rendererze, potoku kamery (js/render/sea/look.js)
// i scenie — jak w Battle (js/core/app.js, „settings -> systems”). Bez ustawień (null) — grafika laboratoriów
// i edytora (pełna rozdzielczość, wygładzanie, cienie 2048, światła, poświata).
//
// applyGraphics({ renderer, look, scene, sun }, gfx | null) — rozdzielczość obrazu (look.setScale), wygładzanie
//   (look.setAA), cienie (renderer.shadowMap; przełączenie przelicza materiały), jakość cieni (mapa słońca), światła
//   dynamiczne (światła punktowe i reflektory w scenie: widoczne albo nie; słońce i niebo zostają)
// lights(scene, gfx) — samo przełączenie świateł (światła, które pojawiły się później: ogień, lampy)
// lookParams(L, gfx) → parametry potoku kamery z ustawieniami: poświata, jasność (× naświetlenie), nasycenie
const FULL = { scale: 1, aa: true, shadows: true, shadowQuality: 'high', lights: true, bloom: true, bright: 1, sat: 1 };

export function lights(scene, gfx) {
  const on = !gfx || gfx.lights !== false;
  if (scene) scene.traverse((o) => {
    if (!(o.isPointLight || o.isSpotLight)) return;
    if (o.userData.gfxVisible === undefined) o.userData.gfxVisible = o.visible;
    o.visible = on ? o.userData.gfxVisible : false;
    if (on) delete o.userData.gfxVisible;
  });
}

export function applyGraphics({ renderer, look, scene, sun }, gfx) {
  const g = { ...FULL, ...(gfx || {}) };
  if (look) { look.setScale(g.scale); look.setAA(g.aa); }
  if (renderer && renderer.shadowMap.enabled !== g.shadows) {
    renderer.shadowMap.enabled = g.shadows;   // przełączenie cieni przelicza materiały oświetlone
    if (scene) scene.traverse((o) => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { x.needsUpdate = true; }); });
  }
  if (sun && sun.shadow) {
    const size = g.shadowQuality === 'low' ? 1024 : 2048;
    if (sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  }
  lights(scene, gfx);
}

export function lookParams(L, gfx) {
  if (!gfx) return L;
  return { ...L, bloom: gfx.bloom === false ? 0 : L.bloom, exposure: (L.exposure ?? 1) * (gfx.bright ?? 1), saturation: (L.saturation ?? 1) * (gfx.sat ?? 1) };
}
