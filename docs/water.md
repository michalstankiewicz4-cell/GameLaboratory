# Water lab (`labs/water.html`, `js/labs/water.js`, `js/envs/water/waterkit.js`)

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

## Foam with memory (`js/envs/water/foamkit.js`)

A **foam map** keeps the foam of a 1.5 km square of sea (1024² float texels, 1.5 m each) in the water's own frame, so
foam stays where it was made and drifts with the water while the ship sails on. The window follows the ship in whole
texels (no blur), 70 % of it astern for the wake. Every frame one GPU pass updates three densities:

- **Active breaking** (R): where the fold of the Gerstner surface (Σ Q·k·A·sin θ) passes a threshold; dense froth that
  lives ~0.45 s. Crests break in segments (a noise fixed in the water jitters the threshold).
- **Residual foam** (G): left behind by the breaking; it lives `1 + 3.2·Hs` s (~5 s at Beaufort 4, ~20 s in a gale).
- **Ship foam** (B): the turbulent wake (a source ~30 m long behind the stern; the memory makes the trail), the foam
  lines the bow wave leaves along the hull, shell splashes and torpedo tracks; lives 150 s and spreads sideways
  (diffusion 1.6 m²/s). Long after it stops showing as foam it still **calms the ripples**: the slick behind a ship.

The water shader draws the densities through a **bubble-raft pattern** (two scales of Voronoi borders): dense foam is
solid, thinning foam keeps only the network (lace), and in a gale the rafts stretch along the wind into **wind rows**.
Far away (beyond ~500 m) the pattern turns into its average so it does not shimmer. Outside the window the old
analytic crests and wake are drawn. The Kelvin arms and the foam right at the hull stay analytic (they belong to the
ship, not to the water's history).

**Whitecap calibration.** The wind follows from the significant wave height of a developed sea (Hs ≈ 0.0246·U²) and the
whitecap coverage from Monahan & O'Muircheartaigh (1980): W = 3.84·10⁻⁶·U^3.41. The fold is close to normal with
σ² = Σ(Q·k·A)²/2, so the threshold is set at the quantile that makes 42 % of W actively breaking (the rest is
residual); the residual starts dense enough to stay over half opaque for 3.6 s, whatever its life, and then turns to
lace. `tools/lab-check.py` measures the coverage (texels with foam over half opaque, after 40 s) and fails outside
±35 % of Monahan.

| Sea (Hs) | Wind U | Monahan | Measured | Actively breaking |
|---|---|---|---|---|
| Moderate (1.2 m) | 7.0 m/s | 0.29 % | 0.27 % | 0.11 % |
| Gale (6 m) | 15.6 m/s | 4.5 % | 5.6 % | 2.2 % |

**Shell splashes and torpedo tracks** (buttons in *Ship and water*): a salvo of four splashes 70–330 m out — a column of
spray falling back over ~4 s, froth and a foam patch that spreads and stays, rings running out across the water; a
torpedo running across ahead at 45 kn leaves its bubble track, which stays for minutes.

Inspired by the two-stage foam and the calibration of [Open Water](https://github.com/Leonxlnx/open-water) (Leonxlnx,
MIT); written anew here for ships (they have no ships, no wake).

## Water bodies

`WATER_BODIES` in WaterKit: each body is a sea state, a look and a shore. *Open ocean* has no shore. *Fjord*, *Lake*
and *River* get a wrap-around channel from LandKit (`generateWaterway`: width, wall/bank height, steepness, depth,
meander) drawn by the terrain meshes and read by the sea for shallows and surf (`waterMaterial(u, { land })`). The ship
stays at the origin; the water streams past at the speed through the water (`uShift`), the shore at the speed over the
ground (`uLandOff` = speed − current), so in a river the banks pass slower going upstream. A river's current also draws
foam streaks along the flow (`uCurrent`, more in the shallows). Still bodies (fjord, lake) switch the planar reflection
on: the walls and banks are mirrored with the ship. Short waves fade with distance in the wave shader (they aliased
into rings on the polar grid); this helps the ocean far away too.

| Body | Sea | Look | Shore |
|---|---|---|---|
| Open ocean | moderate | North Atlantic | — |
| Fjord | cat's-paws, 0.1 m | dark and still | 800 m wide, walls ~650 m, steep |
| Lake | short wind chop, 0.25 m | fresh, peaty | 1.8 km wide, low hills |
| River | ripples | silty | 240 m wide, low banks, current 1.8 m/s |
| Harbour water | sheltered, 0.15 m | murky, with **oil** sheen | — (quays, piers, breakwaters: waterside-buildings lab) |
| Ice and pack ice | swell under the floes | arctic | — ; **floes** cover 70 %, 18 m, 0.35 m above the water |

**Oil** (`uOil`, any body): patches drifting with the water; the film calms the ripples, dulls the foam and shows
thin-film colours that change with the film's thickness and the viewing angle (strongest at grazing angles).

**Ice** (`uIce`: cover, floe size, freeboard, lane; `GLSL_ICE`): floes are warped Voronoi cells in the water's frame (they
drift with it) — snow-covered or bare blue-grey ice with wet rims, lit by the sun and the sky; cover near 100 % with
large floes gives pack ice with thin leads. Ice damps the waves (the floes ride the swell) and the floes stand above the
water by the freeboard. Behind the bow the ship leaves a **lane**: broken ice (brash) in open water, widening astern.
Submerged ice shows turquoise right beside the floes.

**Mixed by region** (`waterMaterial(u, { land, regions })` with RegionKit's `GLSL_REGIONS`): instead of one body for the
whole sea, a region map gives every place a blend of the six bodies and a flow; the shader takes the look (deep and
scatter colours, glitter, ripples, crest foam, reflection), the share of the open sea's waves that gets in, oil, ice
cover and the current (ripples, foam and oil drift with it; foam streaks run along it) from that blend. Far away the
floes are drawn as their average cover (they flickered as a pattern smaller than a pixel). Used by the Land Lab — see
`docs/land.md`, *Water bodies by region*.

## Not yet

Underwater view and caustics, ship shadows on the water, true
screen-space refraction, shore and island interaction, the game's ocean replaced by this one (after the owner picks a
variant).
