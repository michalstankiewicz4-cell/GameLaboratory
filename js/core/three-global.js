/* =======================================================================
   three-global.js — Three.js r186 (vendor/three) as the global `THREE`
   for the kits and labs that came from Space (written for r128) and
   their tools (model doctor, kitcheck). Their kits are written against a
   global THREE and talk to each other through window (window.ShipKit,
   window.BodyKit…); they load as modules after this one
   (<script type="module">, in document order).

   One look everywhere — the graphics of the labs from Battle: plain r186
   (colour management, physical lights, plain render targets). For values
   written under r128 the kits use two helpers:
   - THREE.LIGHT_SCALE (π): physical lights shine π times weaker than the
     old legacy lights, so a power written for r128 is multiplied by it;
   - THREE.srgbColor(hex): a colour given in sRGB, as a linear colour.
   Their own shaders (BodyKit, ShipKit's glows, the sky) give out a colour
   ready for the screen; the camera pipeline expects a linear one, so the
   end of every ShaderMaterial converts it from sRGB to linear. A shader
   that already gives out linear colour: material.userData.linearOutput = true.
   (Until 0.12.0 a "legacy r128" mode lived here as well — patched light
   chunks and r128-style render targets — for the doctor and kitcheck only.)
   ======================================================================= */
import * as T from "../../vendor/three/three.module.js";
import { OrbitControls } from "../../vendor/three/addons/controls/OrbitControls.js";
import { Pass, FullScreenQuad } from "../../vendor/three/addons/postprocessing/Pass.js";
import { UnrealBloomPass } from "../../vendor/three/addons/postprocessing/UnrealBloomPass.js";
import { CopyShader } from "../../vendor/three/addons/shaders/CopyShader.js";
import { LuminosityHighPassShader } from "../../vendor/three/addons/shaders/LuminosityHighPassShader.js";
import { FXAAShader } from "../../vendor/three/addons/shaders/FXAAShader.js";

window.GameLabGraphics = "battle";   // read by LabKit (js/labkit/labkit.js) and the ship lab

class ShaderMaterial extends T.ShaderMaterial {
  constructor(p) {
    super(p);
    this.onBeforeCompile = (sh) => {
      if (this.userData.linearOutput) return;
      const i = sh.fragmentShader.lastIndexOf("}");
      if (i > 0) sh.fragmentShader = sh.fragmentShader.slice(0, i) + "  gl_FragColor.rgb = pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(2.2));\n" + sh.fragmentShader.slice(i);
    };
  }
}

const THREE = Object.assign({}, T, { ShaderMaterial, OrbitControls, Pass, FullScreenQuad, UnrealBloomPass, CopyShader, LuminosityHighPassShader, FXAAShader });
THREE.Pass.FullScreenQuad = FullScreenQuad;
THREE.LIGHT_SCALE = Math.PI;
THREE.srgbColor = (c) => new T.Color(c);
window.THREE = THREE;
