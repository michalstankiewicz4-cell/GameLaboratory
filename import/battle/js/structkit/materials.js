// StructKit materials (PBR) for offshore and waterside structures. "leg" paints itself by world height: marine growth
// in the splash zone and below, the leg colour above — it stays right while the legs are jacked up and down.
import * as THREE from '../../vendor/three.module.js';
import { grimeTex } from '../render/materials.js';

export function structMaterials(scheme = {}) {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3, ...o });
  const m = {
    hull: std(scheme.hull ?? 0x8e9497, { map: grimeTex(), side: THREE.DoubleSide }),          // hull and main deck plating
    deck: std(0x5f6566, { roughness: 0.85, metalness: 0.2, side: THREE.DoubleSide }),
    white: std(0xe6e5df, { roughness: 0.55, metalness: 0.1, map: grimeTex() }),               // quarters, drill floor house
    yellow: std(scheme.yellow ?? 0xe0a51c, { roughness: 0.5, metalness: 0.2, map: grimeTex() }), // cranes, jack houses, handrails
    red: std(0xb3271e, { roughness: 0.5, metalness: 0.15 }),
    orange: std(0xf06a12, { roughness: 0.45, metalness: 0.05 }),                                 // lifeboats (survival craft)
    heli: std(0x3c5a3e, { roughness: 0.85, metalness: 0.1 }),                                    // helideck surface
    metal: std(0x585e63, { roughness: 0.45, metalness: 0.7 }),
    dark: std(0x1d2124, { roughness: 0.6, metalness: 0.4 }),
    glass: std(0x1f2d36, { roughness: 0.08, metalness: 0.6 }),
    silo: std(0xd8d5cc, { roughness: 0.5, metalness: 0.2, map: grimeTex() }),
    rope: std(0x2c2c2c, { roughness: 0.9, metalness: 0.2 }),
    lampRed: new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.4, 0.3) }),
    lampGreen: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 5, 0.8) }),
    lampWhite: new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.8, 4.2) }),
  };
  // coastal works: concrete, quarry rock, rubber fenders, quay lamps — all with marine growth below the water
  m.concrete = splash(std(0xa9a69c, { roughness: 0.9, metalness: 0, map: grimeTex() }), 'concrete');
  m.armour = splash(std(0xb3b0a6, { roughness: 0.92, metalness: 0, map: grimeTex() }), 'armour');
  m.rock = splash(std(0x77726a, { roughness: 0.95, metalness: 0, map: grimeTex() }), 'rock');
  m.core = splash(std(0x4f4b45, { roughness: 1, metalness: 0 }), 'core');
  m.steelPile = splash(std(0x4a3c32, { roughness: 0.7, metalness: 0.5, map: grimeTex() }), 'pile');
  m.paving = std(0x8d8a83, { roughness: 0.9, metalness: 0, map: grimeTex() });
  m.rubber = std(0x161616, { roughness: 0.85, metalness: 0 });
  m.kerb = std(0xd9b21c, { roughness: 0.6, metalness: 0.1 });
  m.lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.6, 3.6) });
  // legs: colour by world height — growth below the splash zone, a rust-stained band, then the leg colour
  const leg = std(scheme.leg ?? 0xd9a21b, { roughness: 0.55, metalness: 0.35, map: grimeTex() });
  leg.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying float vWY;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = 'varying float vWY;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      if (vWY < -0.6) diffuseColor.rgb = mix(vec3(0.16, 0.2, 0.12), vec3(0.08, 0.1, 0.08), clamp(-vWY / 30.0, 0.0, 1.0));
      else if (vWY < 2.5) diffuseColor.rgb = mix(vec3(0.22, 0.17, 0.12), diffuseColor.rgb, smoothstep(0.5, 2.5, vWY));`);
  };
  leg.customProgramCacheKey = () => 'structkit-leg';
  m.leg = leg;
  return m;
}

// Wet, weed-covered and darker below the water line, a dark wet band in the splash zone (world height).
export function splash(mat, key) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying float vWY;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n{ vec4 wq = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nwq = instanceMatrix * wq;\n#endif\nvWY = (modelMatrix * wq).y; }');
    sh.fragmentShader = 'varying float vWY;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      if (vWY < -0.4) diffuseColor.rgb = mix(diffuseColor.rgb * vec3(0.45, 0.55, 0.42), vec3(0.07, 0.09, 0.07), clamp(-vWY / 25.0, 0.0, 0.8));
      else if (vWY < 1.6) diffuseColor.rgb *= mix(0.45, 1.0, smoothstep(-0.4, 1.6, vWY));`);
  };
  mat.customProgramCacheKey = () => 'structkit-splash-' + key;
  return mat;
}
