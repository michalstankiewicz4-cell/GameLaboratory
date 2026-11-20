// CityKit — materiały budynku:
//   tileMaterial(kafelek) — wersja daleka: MeshStandardMaterial z wypalonymi mapami (bake.js) i mapowaniem paralaksy
//     z przesłanianiem (parallax occlusion mapping): promień oka wchodzi w pole wysokości (wnęki okien, parapety,
//     gzymsy, balkony) i trafia w to, co z tego miejsca widać — płaski prostokąt wygląda jak ściana z wnękami.
//     Rama styczna z pochodnych w ekranie (bez stycznych w geometrii): gradient u i v na powierzchni daje przesunięcie
//     UV na metr wysokości. Okna świecą nocą: numer okna z mapy (orm.a), komórka z UV (piętra) albo z atrybutu aCell
//     (parter) → ta sama liczba z ziarna co w wersji bliskiej (layout.js cellHash) → te same okna.
//   partMaterials(spec) — wersja bliska: mur (MatKit), rama, szyba, szyby świecące (trzy barwy), drzwi, płyta, balustrada, dach.
// NIGHT — wspólna noc (0 dzień … 1 noc): mnoży światło okien we wszystkich budynkach (setNight w citykit.js).
import * as THREE from '../../../vendor/three/three.module.js';
import { makeMaterial } from '../../render/materials/matkit.js';
import { anisotropy } from '../../render/quality.js';

export const NIGHT = { value: 0 };
export const POM = { value: 1 };   // paralaksa włączona (0 — same mapy normalnych, porównanie w laboratorium)
export const LIGHT_COLORS = [null, '#ffc477', '#ffe3b8', '#d8ecff'];   // ciepłe, neutralne, chłodne
const LIT_GAIN = 2.4;

const GLSL_HASH = /* glsl */`
float cityHash(uint a, uint b, uint c, uint d) {
  uint h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u) ^ (d * 2654435761u);
  h ^= h >> 16u; h *= 0x7feb352du; h ^= h >> 15u; h *= 0x846ca68bu; h ^= h >> 16u;
  return float(h & 0xffffffu) / 16777216.0;
}`;

const SWAP = ['map_fragment', 'normal_fragment_maps', 'roughnessmap_fragment', 'metalnessmap_fragment', 'aomap_fragment'];
const swapped = (name, uv) => `#undef texture2D\n#define texture2D(t, c) textureGrad(t, c, pomDx, pomDy)\n${THREE.ShaderChunk[name].replaceAll(uv, 'pomUv')}\n#undef texture2D\n#define texture2D texture\n`;
const UVS = { map_fragment: 'vMapUv', normal_fragment_maps: 'vNormalMapUv', roughnessmap_fragment: 'vRoughnessMapUv', metalnessmap_fragment: 'vMetalnessMapUv', aomap_fragment: 'vAoMapUv' };

function dataTex(data, w, h, srgb) {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = anisotropy(); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
  return t;
}

/** Tekstury kafelka (tworzone raz). */
export function tileTextures(tile) {
  if (!tile.tex) tile.tex = [dataTex(tile.albedo, tile.w, tile.h, true), dataTex(tile.nh, tile.w, tile.h), dataTex(tile.orm, tile.w, tile.h)];
  return tile.tex;
}
/** Materiał kafelka z paralaksą: seed, lit — ziarno i część świecących okien budynku. */
export function tileMaterial(tile, { seed = 1, lit = 0.4, ground = false } = {}) {
  const [map, normalMap, orm] = tileTextures(tile);   // tekstury kafelka wspólne dla budynków (citykit.js: pamięć wypalonych)
  const m = new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap: orm, metalnessMap: orm, aoMap: orm, roughness: 1, metalness: 1 });
  const U = { uRange: { value: tile.zhi - tile.zlo }, uTop: { value: tile.zhi }, uNight: NIGHT, uPom: POM, uSeed: { value: seed }, uLit: { value: lit },
    uLight1: { value: new THREE.Color(LIGHT_COLORS[1]) }, uLight2: { value: new THREE.Color(LIGHT_COLORS[2]) }, uLight3: { value: new THREE.Color(LIGHT_COLORS[3]) } };
  m.userData.city = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aCell;\nvarying vec2 vCell;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvCell = aCell;');
    let f = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uRange, uTop, uNight, uPom, uSeed, uLit;
uniform vec3 uLight1, uLight2, uLight3;
varying vec2 vCell;
${GLSL_HASH}`);
    f = f.replace('void main() {', `void main() {
  vec2 uv0 = vMapUv, pomDx = dFdx(uv0), pomDy = dFdy(uv0), pomUv = uv0;
  {
    // gradient u i v na powierzchni (przestrzeń widoku): przesunięcie UV na metr wysokości w stronę oka
    vec3 dp1 = dFdx(-vViewPosition), dp2 = dFdy(-vViewPosition), N = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    float D = dot(dp1, cross(dp2, N));
    if (abs(D) > 1e-12 && uPom > 0.5) {
      vec3 gu = (pomDx.x * cross(dp2, N) + pomDy.x * cross(N, dp1)) / D, gv = (pomDx.y * cross(dp2, N) + pomDy.y * cross(N, dp1)) / D;
      vec3 e = normalize(vViewPosition);   // do oka
      float ez = max(dot(e, N), 0.15);
      vec2 k = vec2(dot(gu, e), dot(gv, e)) / ez;              // UV na metr wysokości
      vec2 top = uv0 + k * uTop, stp = -k * uRange;           // od płaszczyzny najwyższego elementu w głąb
      float n = clamp(mix(24.0, 8.0, ez) * max(1.0, uRange / 0.35), 8.0, 64.0), dl = 1.0 / n, d = 0.0, h = textureGrad(normalMap, top, pomDx, pomDy).a, hp = h;
      vec2 p = top, pp = top;
      for (int i = 0; i < 64; i++) {
        if (float(i) >= n || d >= 1.0 - h) break;
        pp = p; hp = h; d += dl; p = top + stp * d; h = textureGrad(normalMap, p, pomDx, pomDy).a;
      }
      // przecięcie między dwoma ostatnimi krokami
      float a = (1.0 - h) - d, b = (1.0 - hp) - (d - dl), t = clamp(b / max(b - a, 1e-5), 0.0, 1.0);
      pomUv = mix(pp, p, t);
    }
  }`);
    for (const c of SWAP) f = f.replace(`#include <${c}>`, swapped(c, UVS[c]));
    f = f.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    float wid = floor(textureGrad(roughnessMap, pomUv, pomDx, pomDy).a * 255.0 / 16.0 + 0.5);
    if (wid > 0.5 && uNight > 0.001) {
      bool gnd = vCell.y > -0.5;
      vec2 cu = floor(pomUv);
      uint cm = gnd ? uint(vCell.y + 0.5) : uint(max(cu.x, 0.0)), fl = gnd ? 0u : uint(max(cu.y, 0.0)) + 1u;
      uint sd = uint(uSeed + 0.5), ed = uint(vCell.x + 0.5), cell = fl * 16u + uint(wid);
      if (cityHash(sd, ed, cm, cell) < uLit) {
        float kc = cityHash(sd + 7919u, ed, cm, cell);
        vec3 lc = kc < 0.6 ? uLight1 : kc < 0.88 ? uLight2 : uLight3;
        totalEmissiveRadiance += lc * ${LIT_GAIN.toFixed(2)} * uNight;
      }
    }
  }`);
    sh.fragmentShader = f;
  };
  m.customProgramCacheKey = () => 'citykit-pom' + (ground ? 'g' : '');
  return m;
}

const partCache = new Map(), matkitOf = new WeakMap();   // materiał muru → wynik MatKit (tekstury do zwolnienia)
function cached(key, make) { let m = partCache.get(key); if (!m) { m = make(); partCache.set(key, m); } return m; }
// szyba świecąca nocą: emisja × NIGHT
function litGlass(glass, color) {
  const m = new THREE.MeshStandardMaterial({ color: glass, roughness: 0.06, metalness: 0.5, emissive: new THREE.Color(color), emissiveIntensity: LIT_GAIN });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = NIGHT;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= uNight;');
  };
  m.customProgramCacheKey = () => 'citykit-litglass';
  return m;
}

/** Materiały wersji bliskiej (wspólne dla budynków o tych samych barwach i murze). */
export function partMaterials(S) {
  const W = S.window, wallKey = JSON.stringify(S.wall);
  const std = (c, r, me = 0) => cached(`s|${c}|${r}|${me}`, () => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: me }));
  return {
    wall: cached('w|' + wallKey, () => { const x = makeMaterial(S.wall, { res: 512 }); matkitOf.set(x.material, x); return x.material; }),
    trim: std(W.frame, 0.45, 0.1),
    glass: std(W.glass, 0.06, 0.5),
    lit1: cached(`l1|${W.glass}`, () => litGlass(W.glass, LIGHT_COLORS[1])),
    lit2: cached(`l2|${W.glass}`, () => litGlass(W.glass, LIGHT_COLORS[2])),
    lit3: cached(`l3|${W.glass}`, () => litGlass(W.glass, LIGHT_COLORS[3])),
    door: std(S.ground.door, 0.55, 0.05),
    slab: std('#a7a39a', 0.9),
    railing: std(S.balcony.railing, 0.45, 0.5),
    roof: std(S.roof.color, 0.85),
  };
}
/** Zwalnia wspólne materiały wersji bliskiej (laboratorium: po zmianie barw). */
export function clearPartMaterials() {
  for (const m of partCache.values()) { if (matkitOf.has(m)) matkitOf.get(m).dispose(); else m.dispose(); }
  partCache.clear();
}
