// ShipKit materials (PBR). The hull material paints itself by height: red anti-fouling below the waterline,
// a black boot-top band, then the hull grey — crisp lines independent of the mesh resolution.
import * as THREE from '../../../vendor/three/three.module.js';
import { grimeTex, deckTex } from '../../render/sea/materials.js';

export function shipMaterials(scheme) {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.25, ...o });
  const m = {
    paint: std(scheme.upper, { map: grimeTex(), side: THREE.DoubleSide }),
    deck: std(scheme.deck, { roughness: 0.85, metalness: 0.1, side: THREE.DoubleSide }),
    wooddeck: std(0xc9b48e, { roughness: 0.9, metalness: 0, map: deckTex() }),
    metal: std(scheme.metal ?? 0x4a4f55, { roughness: 0.42, metalness: 0.7 }),
    dark: std(0x1c1f23, { roughness: 0.55, metalness: 0.4 }),
    canvas: std(0xd8d0bc, { roughness: 0.95, metalness: 0 }),
    white: std(0xe8e6de, { roughness: 0.6, metalness: 0.05 }),
    wood: std(0x8a6a44, { roughness: 0.85, metalness: 0 }),
    bronze: std(0xb08a4a, { roughness: 0.35, metalness: 0.9 }),
    glass: std(0x203038, { roughness: 0.08, metalness: 0.6 }),
    lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.3, 1.9) }),
    rope: std(0x2a2a2a, { roughness: 0.9, metalness: 0.2 }),
    red: std(0xb02a22, { roughness: 0.6, metalness: 0.1 }),
  };
  // hull: colour bands by local height (y = 0 is the waterline)
  const hull = std(scheme.hull, { map: grimeTex() });
  const below = new THREE.Color(scheme.antifouling), boot = new THREE.Color(scheme.boot);
  hull.onBeforeCompile = (sh) => {
    sh.uniforms.uBelow = { value: below }; sh.uniforms.uBoot = { value: boot }; sh.uniforms.uBootTop = { value: scheme.bootTop ?? 0.4 };
    sh.vertexShader = 'varying float vLocalY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalY = position.y;');
    sh.fragmentShader = 'uniform vec3 uBelow, uBoot; uniform float uBootTop; varying float vLocalY;\n' + sh.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\nif (vLocalY < -0.05) diffuseColor.rgb = uBelow; else if (vLocalY < uBootTop) diffuseColor.rgb = uBoot;');
  };
  m.hull = hull;
  return m;
}
