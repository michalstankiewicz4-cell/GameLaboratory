// CityKit — kreator budynków: domy, kamienice, bloki, wieżowce, biurowce, markety… na dowolnym obrysie (prostokąt,
// L, U, narożnik albo własny wielokąt, np. obrys z mapy). Okna, wejścia, witryny, balkony, gzymsy i dachy rozmieszczane
// proceduralnie z opisu budynku (types.js — dane, JSON). Metry, y w górę, podstawa w y = 0, front (krawędź front)
// patrzy na −z; obrys wyśrodkowany.
//
// Dwie wersje z jednego układu fasad (layout.js):
//   detail 1 (blisko)   — siatki: mur z otworami, wnęki, szyby, ramy, drzwi, balkony, gzymsy (mesh.js)
//   detail < 0,75 (daleko) — ściany płaskie z wypalonymi teksturami (bake.js) i paralaksą (facade-material.js):
//                         kilka prostokątów na ścianę, okna wyglądają na wnęki; nocą świecą te same okna co z bliska
// buildBuilding(spec, { detail, ppm }) → { group, spec, layout, info, stats, dispose }
// setNight(0…1) — światło okien nocą (wszystkie budynki); setPom(tak/nie) — paralaksa w wersji dalekiej
import * as THREE from '../../../vendor/three/three.module.js';
import { normalizeSpec } from './types.js';
import { layout } from './layout.js';
import { createGeo } from './geo.js';
import { near, far, top } from './mesh.js';
import { bakeTile } from './bake.js';
import { tileMaterial, partMaterials, clearPartMaterials, NIGHT, POM } from './facade-material.js';
import { textureRes } from '../../render/quality.js';
import { buildLandmark, LANDMARK_IDS, landmarkInfo, landmarkStyle, OSM_SOURCE } from './landmarks/landmarks.js';

export { TYPES, TYPE_IDS, WINDOW_STYLES, GROUND_KINDS, ROOF_TYPES, BAY_KINDS, normalizeSpec } from './types.js';
export { FOOTPRINTS, footprintPoints } from './footprint.js';
export { NIGHT, POM } from './facade-material.js';
export { LANDMARK_IDS, landmarkInfo, landmarkStyle, OSM_SOURCE };
export const setNight = (k) => { NIGHT.value = Math.max(0, Math.min(1, +k || 0)); };
export const setPom = (on) => { POM.value = on ? 1 : 0; };

// wypalone kafelki: ten sam wygląd fasady (facadeKey: bez obrysu, liczby pięter, dachu, ziarna) — te same mapy i tekstury
const bakes = new Map();
export const facadeKey = (S) => JSON.stringify([S.wall, S.bay, S.module, S.window, S.ground, S.bands, S.balcony, S.floorH, S.groundH]);
/** Kafelki budynku (z pamięci albo wypalone teraz); ms — czas wypalania tych, których nie było. */
export function bakedTiles(L, { ppm = 64 } = {}) {
  // kafelki pięter i gładkiej ściany nie zależą od parteru — wspólne dla części o różnej wysokości parteru
  const S = L.S, upKey = JSON.stringify([S.wall, S.bay, S.module, S.window, S.bands.floors, S.balcony, S.floorH]) + '|' + textureRes(ppm * 4) / 4;
  const px = textureRes(ppm * 4) / 4, base = facadeKey(L.S) + '|' + px, keys = Object.keys(L.cells).filter((k) => !(k === 'upper' && L.S.floors < 2) && !(k === 'plain' && !L.edges.some((e) => e.plain) && !(L.S.attic > 0)));
  const t0 = performance.now(), tiles = {}; let fresh = 0;
  for (const k of keys) {
    const id = (k === 'upper' || k === 'plain' ? upKey : base) + '|' + k;
    let t = bakes.get(id); if (!t) { t = bakeTile(L, k, { ppm: px }); bakes.set(id, t); fresh++; }
    tiles[k] = t;
  }
  return { tiles, ms: fresh ? Math.round(performance.now() - t0) : 0, ppm: px };
}
/** Zwalnia pamięć wypalonych kafelków i wspólne materiały (laboratorium: przed przebudową po zmianie wyglądu). */
export function clearBakes() {
  for (const t of bakes.values()) if (t.tex) t.tex.forEach((x) => x.dispose());
  bakes.clear(); clearPartMaterials();
}

function stats(group) {
  let tris = 0, calls = 0; const mats = new Set();
  group.traverse((o) => { if (!o.isMesh) return; tris += o.geometry.attributes.position.count / 3; calls++; mats.add(o.material); });
  return { triangles: Math.round(tris), drawCalls: calls, materials: mats.size };
}

// mats — wspólna pamięć materiałów kafelków (części jednego budynku z mapy: te same materiały, scalane siatki)
export function buildBuilding(spec0 = {}, { detail = 1, ppm = 64, mats = null } = {}) {
  const t0 = performance.now(), S = normalizeSpec(spec0), L = layout(S), geo = createGeo(), parts = partMaterials(S);
  const farMode = detail < 0.75;
  let baked = null;
  if (farMode) { baked = bakedTiles(L, { ppm }); far(geo, L); } else near(geo, L);
  top(geo, L);
  const tileMats = [];
  const group = new THREE.Group(); group.name = 'building: ' + S.type;
  group.position.y = S.base;   // część zaczynająca się wyżej (budynek z mapy)
  for (const m of geo.meshes((k) => {
    if (k.startsWith('tile:')) {
      const t = baked.tiles[k.slice(5)]; if (!t) return null;
      if (mats && mats.has(t)) return mats.get(t);
      const mt = tileMaterial(t, { seed: S.seed, lit: S.lit, ground: k.startsWith('tile:g:') });
      if (mats) mats.set(t, mt); else tileMats.push(mt);
      return mt;
    }
    return parts[k] || parts.trim;
  })) group.add(m);
  let windows = 0;
  for (const e of L.edges) for (let r = 0; r < S.floors; r++) {
    const n = e.plain ? 0 : e.n;
    for (let i = 0; i < n; i++) windows += (L.cells[r ? 'upper' : 'g:' + e.ground[i]] || []).filter((f) => f.t === 'open').length;
  }
  const box = new THREE.Box3().setFromObject(group), size = box.getSize(new THREE.Vector3());
  const area = Math.abs(L.poly.reduce((s, a, i) => { const b = L.poly[(i + 1) % L.poly.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2);
  const info = { type: S.type, size: size.toArray(), height: L.H, roofTop: box.max.y, floors: S.floors, area, walls: L.edges.length, modules: L.edges.reduce((s, e) => s + e.n, 0), windows, far: farMode };
  const st = { ...stats(group), buildMs: Math.round(performance.now() - t0), bakeMs: baked ? baked.ms : 0, textureBytes: baked ? Object.values(baked.tiles).reduce((s, t) => s + t.w * t.h * 12, 0) : 0 };
  return {
    group, spec: S, layout: L, info, stats: st, tiles: baked ? baked.tiles : null,
    /** Zmiana części świecących okien bez przebudowy (wersja daleka; bliska — przebudowa). */
    setLit(k) { for (const m of tileMats) m.userData.city.uLit.value = k; },
    dispose() { group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); tileMats.forEach((m) => m.dispose()); },
  };
}

/** Budynek z opisu: z mapy (spec.landmark — bryła z OpenStreetMap, styl z opisu) albo zwykły (buildBuilding). */
export function build(spec, opts = {}) {
  return spec && spec.landmark && LANDMARK_IDS.includes(spec.landmark) ? buildLandmark(spec.landmark, { ...opts, style: spec, build: buildBuilding }) : buildBuilding(spec, opts);
}
