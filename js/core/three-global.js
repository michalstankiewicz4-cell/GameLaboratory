/* =======================================================================
   three-global.js — Three.js r186 (vendor/three) as the global `THREE`
   for the labs and kits that came from Space (r128) and aTrain (r147).
   Their kits are written against a global THREE and talk to each other
   through window (window.ShipKit, window.BodyKit…); they load as modules
   after this one (<script type="module">, in document order).

   The source projects' look (same picture as before the move to r186):
   - colours as written: ColorManagement off, so hex colours are not
     converted from sRGB (r128 never converted them);
   - legacy lighting: r128/r147 rendered lights in the "legacy" mode
     (light colour × π, the old distance fall-off, point/spot decay 1 by
     default). r186 has only physical lights, so the light shader chunk is
     patched back to the legacy maths. Only pages that load this module
     get the patch; the Battle labs (native r186) don't load it.
   ======================================================================= */
import * as T from "../../vendor/three/three.module.js";
import { OrbitControls } from "../../vendor/three/addons/controls/OrbitControls.js";
import { Pass, FullScreenQuad } from "../../vendor/three/addons/postprocessing/Pass.js";
import { UnrealBloomPass } from "../../vendor/three/addons/postprocessing/UnrealBloomPass.js";
import { CopyShader } from "../../vendor/three/addons/shaders/CopyShader.js";
import { LuminosityHighPassShader } from "../../vendor/three/addons/shaders/LuminosityHighPassShader.js";
import { FXAAShader } from "../../vendor/three/addons/shaders/FXAAShader.js";

// ---- colours as written (r128 had no colour management)
T.ColorManagement.enabled = false;

// ---- legacy lighting
const C = T.ShaderChunk;
function patch(chunk, from, to) {
  if (!C[chunk].includes(from)) { console.warn("three-global: chunk changed, not patched:", chunk, from); return; }
  C[chunk] = C[chunk].split(from).join(to);
}
patch("lights_pars_begin",
  "float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );\n\tif ( cutoffDistance > 0.0 ) {\n\t\tdistanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );\n\t}\n\treturn distanceFalloff;",
  "if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {\n\t\treturn pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );\n\t}\n\treturn 1.0;");
patch("lights_pars_begin", "light.color = directionalLight.color;", "light.color = directionalLight.color * PI;");
patch("lights_pars_begin", "light.color = pointLight.color;", "light.color = pointLight.color * PI;");
patch("lights_pars_begin", "light.color = spotLight.color;", "light.color = spotLight.color * PI;");
patch("lights_pars_begin", "vec3 irradiance = ambientLightColor;", "vec3 irradiance = ambientLightColor * PI;");
patch("lights_pars_begin", "vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );",
  "vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight ) * PI;");
patch("lights_fragment_maps", "vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;",
  "vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity * PI;");

// point and spot lights: decay 1 by default, as in r128/r147
class PointLight extends T.PointLight { constructor(color, intensity, distance = 0, decay = 1) { super(color, intensity, distance, decay); } }
class SpotLight extends T.SpotLight {
  constructor(color, intensity, distance = 0, angle = Math.PI / 3, penumbra = 0, decay = 1) { super(color, intensity, distance, angle, penumbra, decay); }
}

// renderer: r128's default output was linear; the labs that want sRGB set
// outputColorSpace themselves
class WebGLRenderer extends T.WebGLRenderer {
  constructor(o) { super(o); this.outputColorSpace = T.LinearSRGBColorSpace; }
}

// render targets as in r128: the renderer's tone mapping applies inside
// them and the shaders write the target texture's colour space (sRGB when
// a lab asks for it) into plain RGBA8 storage, so the post-processing
// passes read the same numbers they read under r128. r186 does exactly
// this for targets flagged isXRRenderTarget (tone mapping + output colour
// space from the texture); internalFormat RGBA8 keeps the storage plain.
class WebGLRenderTarget extends T.WebGLRenderTarget {
  constructor(w, h, o = {}) {
    super(w, h, o);
    this.isXRRenderTarget = true;
    if (this.texture.colorSpace === T.NoColorSpace) this.texture.colorSpace = T.LinearSRGBColorSpace;   // r128's default (LinearEncoding)
    if ((o.type == null || o.type === T.UnsignedByteType) && (o.format == null || o.format === T.RGBAFormat)) this.texture.internalFormat = "RGBA8";
  }
}

const THREE = Object.assign({}, T, {
  PointLight, SpotLight, WebGLRenderer, WebGLRenderTarget,
  OrbitControls, Pass, FullScreenQuad, UnrealBloomPass, CopyShader, LuminosityHighPassShader, FXAAShader,
});
THREE.Pass.FullScreenQuad = FullScreenQuad;
window.THREE = THREE;
