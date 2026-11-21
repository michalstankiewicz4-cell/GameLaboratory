// ShipKit · shared — zasoby wspólne (tworzone przy pierwszej potrzebie, w pamięci dla całej strony / gry): barwy, materiały, tekstury poświaty.
// Część ShipKit (js/models/ships-space/shipkit.js — API i definicje statków); moduł ES, wspólne THREE z three-global.js.
import { THREE } from '../../../core/three-global.js';
import { makeGlow } from './plating.js';

// =====================================================================
// Shared resources (created lazily, cached for the whole page/game)
// =====================================================================
const GOLD = 0xf8bb56, BLUE = 0x5f77f7;
const shadowed = (m) => { m.castShadow = m.receiveShadow = true; return m; };
const allTextures = new Set();     // every generated texture (e.g. to set anisotropy)
const sharedMaterials = new Set(); // cached per ship type, never disposed with a model
const trackTextures = (...ts) => { for (const t of ts) if (t) allTextures.add(t); };
let _glow = null;
function glowTextures() {          // soft sprite textures shared by all ships
  if (_glow) return _glow;
  _glow = {
    engine: makeGlow("rgba(255,255,255,1)", "rgba(140,170,255,0.55)"),
    nav: makeGlow("rgba(255,255,255,1)", "rgba(255,255,255,0.35)"),
    core: makeGlow("rgba(220,230,255,1)", "rgba(95,119,247,0.6)"),
  };
  trackTextures(_glow.engine, _glow.nav, _glow.core);
  return _glow;
}

// Shader factories take U = { uTime, uPower } — one uniform set per built
// model, so every ship instance animates / throttles independently.
function makePlumeMaterial(color, U) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uPower: U.uPower, uColor: { value: new THREE.Color(color) } },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      void main(){
        vUv = uv;
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uTime; uniform float uPower; uniform vec3 uColor;
      varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
      }
      void main(){
        float along = vUv.y;                       // 1 at the nozzle, 0 at the tail end
        float flick = noise(vec2(vUv.x * 12.0, along * 6.0 - uTime * 9.0));
        float shock = 0.5 + 0.5 * sin(along * 38.0 - uTime * 30.0);   // shock diamonds
        float edge = pow(abs(dot(normalize(vN), normalize(vView))), 1.6); // bright core, soft rim
        float a = pow(along, 1.8) * (0.55 + 0.45 * flick) * (0.75 + 0.25 * shock) * edge * uPower;
        vec3 col = mix(uColor, vec3(1.0), pow(along, 5.0) * 0.8);
        gl_FragColor = vec4(col * a * 2.6, 1.0);   // additive: alpha 1, brightness carried by rgb
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

function makeCoreMaterial(U) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uOn: U.uOn || { value: 1 } },
    vertexShader: `
      varying vec3 vN; varying vec3 vView; varying vec3 vPos;
      void main(){
        vN = normalize(normalMatrix * normal); vPos = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0); vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uTime; uniform float uOn; varying vec3 vN; varying vec3 vView; varying vec3 vPos;
      void main(){
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 2.0);
        float scan = 0.5 + 0.5 * sin(vPos.y * 40.0 - uTime * 6.0);           // scrolling "data" lines
        float pulse = 0.75 + 0.25 * sin(uTime * 2.3);
        vec3 base = vec3(0.23, 0.33, 0.95), hot = vec3(0.75, 0.85, 1.0);
        vec3 col = mix(base, hot, fres) * (0.6 + 0.5 * scan) * pulse + fres * 0.6;
        gl_FragColor = vec4(col * (0.05 + 0.95 * uOn), 1.0);         // uOn 0 = offline
      }`,
  });
}

function makeParticleMaterial(U) {
  return new THREE.ShaderMaterial({
    uniforms: { uPower: U.uPower },
    vertexShader: `
      attribute float life; varying float vLife; uniform float uPower;
      void main(){
        vLife = life;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (1.0 - life) * 70.0 * uPower / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vLife;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * (1.0 - vLife) * 0.6;
        vec3 col = mix(vec3(1.0, 0.85, 0.6), vec3(0.4, 0.5, 1.0), vLife);
        gl_FragColor = vec4(col * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

function additiveSprite(map, color = 0xffffff) {
  return new THREE.Sprite(new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
}

export { GOLD, BLUE, shadowed, allTextures, sharedMaterials, trackTextures, _glow, glowTextures, makePlumeMaterial, makeCoreMaterial, makeParticleMaterial, additiveSprite };
