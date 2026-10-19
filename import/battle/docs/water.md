# Water lab (`labs/water.html`, `js/labs/water.js`, `js/labs/waterkit.js`)

A test bench for the look of the sea and its interaction with a ship, before any of it goes into the game. The ship is
ORP Błyskawica from ShipKit at 1:1; units are metres and seconds. The ship stays at the origin heading +z and the sea
streams past it at the ship's speed (`uShift`), so ship-relative effects are computed in the ship's frame.

## What can be compared

Two variants, **A** and **B**, each with its own sea state, look and interaction switches. "Split screen" draws A on
the left and B on the right (draggable divider); "Edit A/B" picks which one the panel changes; "Copy A → B" and "Swap".
Settings are remembered in the browser (localStorage) and "Copy settings (JSON)" gives them to paste back into the chat.

- **Sea state** (`SEAS`): calm (Beaufort 2), moderate (4), rough (6), gale (8), long swell; or custom: significant wave
  height Hs, peak wavelength, choppiness, directional spread, direction relative to the bow, number of waves (4–16).
- **Look** (`LOOKS`): North Atlantic, Baltic grey, tropical, storm slate; or custom: deep colour, scatter colour, sun
  glitter, ripples, crest foam, reflection strength, planar reflection of the ship, translucent water.
- **Ship and water**: speed 0–39 kn, ship motion (heave, pitch, roll), bow wave and Kelvin waves, wake foam, foam along
  the hull, wet band on the hull, bow spray.
- **Light**: sun height and bearing, exposure, time speed. **Cameras**: bow ¾, bow wave, side at the waterline, stern ¾,
  wake from above, far, bridge (rides with the ship).
- **Performance**: water mesh (17k–307k triangles), per-pixel wave normals, render scale, MSAA, glow, ship shadows, and
  "Measure the cost of each effect": fps with everything on, then with each effect off in turn (ms saved per frame).

## How it works (`waterkit.js`)

- **Waves**: a sum of Gerstner waves built from the sea state (`waveSet`): wavelengths spread around the peak, longer
  ones higher, directions inside the spread, seeded phases, scaled so that Hs = 4·√(ΣA²/2); steepness Q from the
  choppiness. The same function exists in GLSL (`GLSL_WAVES`) and JS (`gerstner`, `heightAt` inverts the sideways shift),
  so the ship floats on what is drawn.
- **Surface**: a polar grid centred under the camera (rings grow geometrically: dense near, sparse to 6 km), displaced
  in the vertex shader; normals analytic (per vertex or per pixel), plus two scrolling ripple normal maps.
- **Shading**: Fresnel mix of the water body and the sky (same gradient and sun as the sky dome) or the planar
  reflection (the ship rendered mirrored in the waterline into a half-resolution target, distorted by the normals);
  subsurface tint through crests towards the sun; sun glitter; crest foam from the Gerstner fold; fog to the horizon.
- **Ship interaction**: hull half-breadth at the waterline from ShipKit lines in a 1-D texture; bow wave crest along the
  flare, Kelvin transverse waves (wavelength 2πv²/g inside the 19.47° wedge) and divergent crests as real displacement;
  turbulent wake, Kelvin arm foam and hull contact foam in the shader; the hull material gets a wet, darker, glossier
  band up to where the water reaches (`addWetHull`).
- **Motion**: heave, pitch and roll targets from the surface heights along and across the hull (a long ship averages
  short waves out), followed by damped springs (periods 5.5 / 4.8 / 8.5 s); running trim and squat at speed.
- **Spray**: CPU particles from the stem, continuous at speed and in bursts when the bow slams into a crest; air
  streams aft past the ship.

## Not yet

Underwater view and caustics, ship shadows on the water, foam that persists from frame to frame (a foam map), true
screen-space refraction, shore and island interaction, the game's ocean replaced by this one (after the owner picks a
variant).
