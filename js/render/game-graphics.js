// Ustawienia grafiki gry (js/core/settings.js, settings.gfx) na rendererze, potoku kamery (js/render/sea/look.js),
// scenie i poziomie jakości silnika (js/render/quality.js) — jak w Battle (js/core/app.js, „settings -> systems”).
// Bez ustawień (null) — grafika laboratoriów i edytora (pełna rozdzielczość, wygładzanie, cienie 2048, światła,
// poświata, pełna jakość).
//
// applyGraphics({ renderer, look, scene, sun, stage, camera }, gfx | null) → zmienione pola jakości silnika:
//   rozdzielczość obrazu (look.setScale), wygładzanie (look.setAA), cienie (renderer.shadowMap; przełączenie przelicza
//   materiały), jakość cieni (mapa słońca), poziom jakości silnika (setQuality: szczegóły modeli, tekstury, efekty,
//   woda, zasięg, cienie drobnych części), detal wody (stage.setWaterDetail), zasięg widzenia (camera.far), potem
//   refresh(scene) — światła, cienie drobnych części, filtrowanie tekstur
// refresh(scene, gfx, maxAniso) — to, co trzeba poprawić na obiektach, które pojawiły się później (ogień, lampy,
//   nowe modele): światła dynamiczne, cienie drobnych części, filtrowanie anizotropowe tekstur
// lookParams(L, gfx) → parametry potoku kamery z ustawieniami: poświata, jasność (× naświetlenie), nasycenie
import { setQuality, QUALITY, anisotropy } from './quality.js';

const FULL = { scale: 1, aa: true, shadows: true, shadowQuality: 'high', lights: true, bloom: true, bright: 1, sat: 1 };
const SMALL = 0.25;   // m — drobna część (promień kuli opisanej) bez cienia przy niższej jakości

export function refresh(scene, gfx, maxAniso = 8) {
  if (!scene) return;
  const on = !gfx || gfx.lights !== false, aniso = anisotropy(maxAniso);
  scene.traverse((o) => {
    if (o.isPointLight || o.isSpotLight) {   // światła dynamiczne: widoczne albo nie (słońce i niebo zostają)
      if (o.userData.gfxVisible === undefined) o.userData.gfxVisible = o.visible;
      o.visible = on ? o.userData.gfxVisible : false;
      if (on) delete o.userData.gfxVisible;
      return;
    }
    if (!o.isMesh) return;
    // cienie drobnych części: małe siatki nie rzucają cienia (wraca, gdy jakość pozwala)
    if (o.userData.gfxCast === undefined && o.castShadow) {
      const g = o.geometry; if (g && !g.boundingSphere) g.computeBoundingSphere();
      const r = g && g.boundingSphere ? g.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) : 1;
      o.userData.gfxCast = r < SMALL ? 'small' : 'big';
    }
    if (o.userData.gfxCast === 'small') o.castShadow = QUALITY.smallShadows;
    // filtrowanie tekstur (jakość tekstur)
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'bumpMap']) {
      const t = m[k]; if (!t) continue;
      if (t.userData.aniso0 === undefined) t.userData.aniso0 = t.anisotropy;   // własne filtrowanie tekstury (przy wysokiej jakości)
      const want = Math.min(t.userData.aniso0, aniso);
      if (t.anisotropy !== want) { t.anisotropy = want; t.needsUpdate = true; }
    }
  });
}
// (dawna nazwa — tylko światła)
export const lights = (scene, gfx) => refresh(scene, gfx);

export function applyGraphics({ renderer, look, scene, sun, stage, camera }, gfx) {
  const g = { ...FULL, ...(gfx || {}) };
  const changed = setQuality(gfx);
  if (look) { look.setScale(g.scale); look.setAA(g.aa); }
  if (renderer && renderer.shadowMap.enabled !== g.shadows) {
    renderer.shadowMap.enabled = g.shadows;   // przełączenie cieni przelicza materiały oświetlone
    if (scene) scene.traverse((o) => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { x.needsUpdate = true; }); });
  }
  if (sun && sun.shadow) {
    const size = g.shadowQuality === 'low' ? 1024 : 2048;
    if (sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  }
  if (stage && stage.setWaterDetail) stage.setWaterDetail(QUALITY.water);
  if (camera) {   // zasięg widzenia: daleka płaszczyzna kamery
    if (camera.userData.farFull === undefined) camera.userData.farFull = camera.far;
    const far = camera.userData.farFull * QUALITY.view;
    if (camera.far !== far) { camera.far = far; camera.updateProjectionMatrix(); }
  }
  refresh(scene, gfx, renderer && renderer.capabilities ? renderer.capabilities.getMaxAnisotropy() : 8);
  return changed;
}

export function lookParams(L, gfx) {
  if (!gfx) return L;
  return { ...L, bloom: gfx.bloom === false ? 0 : L.bloom, exposure: (L.exposure ?? 1) * (gfx.bright ?? 1), saturation: (L.saturation ?? 1) * (gfx.sat ?? 1) };
}
