> Przeniesione z repozytorium Battle (docs/GUIDE.md), z adresami stron GameLaboratory (w Battle: labs/ship.html, labs/doctor.html, pixel/, pixel/zombies.html).

# Labs guide — how to use them

These labs were the workshop behind the game *Steel Salvo* (repository Battle): each one tries out one part (a ship, the
sea, the look, the land) with every option switchable, so a choice can be made. This guide says what
each lab is for, how to drive it and what to try. Technical details are in the per-lab documents (`docs/*.md`).

## Opening the labs

- **Online:** <https://michalstankiewicz4-cell.github.io/GameLaboratory/> (the start page lists every lab).
- **Locally:** in the repository folder run `py -m http.server 8000` and open `http://localhost:8000/`
  (pages are ES modules: opening the file directly from disk does not work).
- A desktop browser with a real graphics card is assumed; the labs show fps and draw calls, and most have
  "Measure the cost of each effect".

## Common to every lab

| Action | How |
|---|---|
| Orbit the camera | drag with the left mouse button |
| Pan | drag with the right mouse button (Ship, Water, Look, Transformer) |
| Zoom | mouse wheel |
| Camera presets | the buttons under **Camera** |
| Hide the panels (clean view, screenshots) | **H** |
| Keep a result | **Copy settings (JSON)** — paste it into the chat; it is what moves into the game |
| Settings survive a reload | yes (stored in the browser); "Reset" buttons where they exist |

## Ship Lab — `labs/warship.html`

ORP Błyskawica (1937) and ORP Orzeł (1939) at real scale, built from code; pick the ship in the top bar.

- **Camera** presets per ship (Błyskawica: Bow ¾, Bridge, Funnel & tubes, Quarterdeck…; Orzeł: Conning tower, Deck gun,
  40 mm well, Bow and net cutter, Stern and screws…); **F** frames the whole ship; double-click focuses.
- **View**: sea or dry dock, dimensions, 10 m grid, wireframe, auto-rotate, sun height and bearing, exposure.
- **Parts**: switch hull, superstructure, guns, AA, torpedo tubes, fittings on and off.
- **Armament**: train and elevate all mounts, **Action stations** (they sweep), **Stow**.
- **Signal lamp**: type a short message (A–Z, 0–9; SOS by default) and press **Signal with the searchlight** — the
  camera moves in front of the lamp and its round shutter keys the message in Morse; press again to stop.
- **Diving** (Orzeł): *Surfaced*, *Decks awash*, *Periscope depth*, *Deep (40 m)* — she sinks at the real rate (about
  0.3 m/s; tick *Fast* to hurry), the 40 mm goes down into its well, the bow planes rig out, the periscopes come up at
  periscope depth; the status line shows the keel depth and how much periscope is above the sea. The checkboxes raise
  the periscopes, the 40 mm and the planes by hand. Untick *Sea* to see the hull under water; untick *Outer hull* to see
  the pressure hull with its frames, the tube nests and the twin tubes between the hulls.
- **Model**: detail level (rebuilds the ship), triangle and draw-call counts.
- Try: compare the specifications and sources (left) with the model; find something wrong and report it.

## Water Lab — `labs/water.html`

The ship on a procedural sea; two variants **A** and **B** side by side.

- **Compare**: *Split screen* shows A left and B right (drag the divider); *Edit A / Edit B* chooses which one the
  panel changes; *Copy A → B*, *Swap*.
- **Water body**: *Open ocean*, *Fjord* (dark still water between high walls, mirrored), *Lake* (fresh, peaty water,
  low shores), *River* (silty, narrow, with a **current** that slows the ship over the ground — watch the banks),
  *Harbour water* (murky, with oil sheen), *Ice and pack ice* (floes, the lane the ship breaks). *Width*,
  *Walls / banks*, *Current*, *Oil sheen*, *Ice cover*, *Floe size* and *Ice above water* adjust it (oil and ice work
  on any body). Quays, piers, breakwaters and harbours will be in the waterside-buildings lab.
- **Sea state**: presets from calm to gale or each value (wave height, length, choppiness, spread, direction, count).
- **Look**: water colours, sun glitter, ripples, crest foam, reflection, planar reflection (ship and shores mirrored),
  translucent water.
- **Ship and water**: speed, ship motion, bow wave, wake, foam along the hull, wet band, spray; **Foam with memory**
  (whitecaps leave lace that fades, the wake stays for minutes and leaves a calm slick); **Shell splashes** (four columns,
  froth, foam patches and rings that stay where they fell) and **Torpedo track** (a bubble track running across ahead).
  Compare A with the foam memory on and B with it off to see the difference.
- **Performance**: render scale, anti-aliasing, glow, shadows, water mesh, per-pixel normals, time scale,
  *Measure the cost of each effect*.
- Try: Ice at 100 % cover with 60 m floes (pack ice) from the Wake camera; harbour water at a low sun; Fjord at 5 kn with planar reflection; River at 3 kn against a 1.8 m/s current (the shore barely moves);
  the same gale in A and B with different looks.

## Waterside Structures Lab — `labs/structures.html`

Static structures in the water at real scale: a jack-up drilling rig (Super 300 class), quay walls, breakwaters. Pick
one in the top bar; *Water depth* is kept per structure.

- **Quay wall**: *Construction* (gravity block wall, steel sheet-pile wall, open piled deck), *Quay length*, *Cope
  level*, *ORP Błyskawica moored alongside*; cameras Overview, From the sea, Along the quay, Bollard and fender,
  Underwater, High.
- **Breakwater**: *Type* (rubble mound with tetrapods, with rock, caissons with a tetrapod berm), *Length*, *Crest level*,
  *Armour unit* (2–25 t); cameras Overview, Seaward slope, Head and light, On the crest, Underwater, High.

The jack-up rig:


- **Jacking**: *Afloat (under tow)* and *Jack up* run the whole sequence (legs down to the seabed, hull up to the air
  gap — or the reverse); *Jacking speed* multiplies the real ≈ 90 ft per hour; *Water depth* and *Air gap*.
- **Drilling**: *Cantilever out* skids the derrick over the stern; *Cranes working* animates the three cranes.
- **Camera**: Overview, Helideck, Drill floor, Leg and jack house, From the sea, Underwater, High.
- **Sea and light**: weather; Day, Low sun, Dusk, Night (obstruction and helideck lights).
- **Left panel**: specifications, sources, the reconstruction note and part toggles.
- Try: float the rig, then jack it up in 110 m of water at ×2000; the Underwater camera with the legs on the seabed;
  Night with a storm.

## Look Lab — `labs/look.html`

How the image is made: ageing of the ship, sky and weather, time of day, lights, and the camera's look.

- **Weather and sky**: seven weathers (clear … storm, rain, sea fog) or each value — cloud cover and density, wind
  (it sets the sea), rain, visibility (fog), haze, lightning; *Lightning strike now*; *Thunder* (sound, arrives after
  distance ÷ 343 m/s); *Squalls*; *Rain on the lens*.
- **Time of day**: Dawn, Morning, Noon, Afternoon, Dusk, Night, a time slider, the moon (new … full); sun height and
  bearing by hand.
- **Lights and guns**: navigation lights (sunset to sunrise / on / off); *Fire a salvo* (**F**) to starboard or port;
  *Signal SOS* with the searchlight.
- **Ageing**: one *Wear* slider and one per effect (corner shading, grime, rust streaks and spots, chipped paint, salt,
  hull plating, wood, brass, canvas).
- **Look**: presets *Game, clean*, *Cinematic*, *Bodycam*; *Compare: clean on the left* (split); tone mapping,
  automatic exposure; every effect (exposure, contrast, saturation, vibrance, temperature, tint, glow, vignette, grain,
  chromatic aberration, lens distortion, water and dirt on the lens, sun glare, sharpen).
- **Camera**: From the escort, Bow wave, Rusty side, Deck aft, High, Bodycam (wide, hand-held); field of view, shake.
- **Performance**: render scale, automatic resolution (keeps ~60 fps), anti-aliasing, shadows, *Measure the cost*.
- Try: Storm at night with lightning and the Bodycam; Sea fog at dawn; full wear on the Rusty side camera.

## Land Lab — `labs/land.html`

Procedural land and sea from a seed; sail through it.

- **Map**: seed (*New random map*, *Generate*), shape (Islands, Archipelago, Coast, Fjords, Highlands), land share
  0–100 %, map size 4–32 km, detail, highest peaks, sea depth, roughness, erosion. The same seed and settings always give
  the same map.
- **Biome**: *Northern*, *Plains* (flat, gently rolling lowland with meadows and fields), *Desert* (dunes, stony
  plateaus, mesas with cliffs) or *Zones* (all three by region; *Zone transition* sets how wide the blend is). Ground
  only — plants and rocks as objects come in their own labs.
- **Water bodies**: *Layout* — one water body everywhere (pick it in *Water*), a river mouth, a lake with a canal, a
  fjord entrance over its sill, a sheltered bay behind a spit, an ice edge, or *Mixed from the seed* (lakes, fjords,
  *Rivers* 0–6, *Ice from the north*). *Transition* sets how wide the blend between two waters is. The list under it
  gives each water's share; the chart tints the water by body and names the waters; the ship's status line says what
  water it is in and the current.
- **Map edge**: *Wrap-around (torus)* — sail out of one edge and you come in at the opposite one — or *Bounded* with a
  buoy line, a mountain range or an invisible wall.
- **Chart**: the whole map; the yellow arrow is the ship, the white lines the camera's view; click to move the ship
  there (if the water is deep enough) or the camera.
- **Ship**: *Sail ORP Błyskawica* — **W/S** engine orders (astern, stop, slow, half, full, flank), **A/D** rudder; the
  ship runs aground in water shallower than 3.5 m and stops at a barrier.
- **Camera**: Chase, Bridge, Overview, Free flight (**W/A/S/D**, **Q/E** down/up, **Shift** faster, drag to look).
- **Light and weather**: weather, sun height and bearing.
- Try: the river mouth from the Chase camera — sail from the river through the brown plume into the sea; the harbour
  entrance at Transition 60 m and at 1,600 m; Mixed with 4 rivers and 30 % ice in Free flight high up;
  Fjords at 55 % land from the Bridge; Archipelago, bounded by buoys, from the Overview; 100 % land Highlands in
  Free flight; sail off the edge of a wrap-around map.

## Plants Lab — `labs/plants.html`

Trees, palms, shrubs and grass grown from code. Two modes in the top bar.

- **Specimen**: pick a *Species* (spruce, pine, birch, oak, date palm, umbrella thorn acacia, juniper, saltbush);
  *Seed* / *Another one* grows a different individual; *Size*, *Detail*; *Season* turns birch yellow and oak russet;
  *Its impostor beside it* shows the flat stand-in used far away, to compare. Cameras: Orbit, Under the crown, From above.
- **Landscape**: a 2.4 km world with lakes in a *Biome* (northern, plains, desert or zones); *Plants* (density),
  *Grass* (density) and *Grass radius*, *Full models to* (beyond: impostors), *Impostors* off to see the cost of full
  models only. Cameras: Walk (W/A/S/D at eye height), Treetops, Low flight, Overview; drag to look, Q/E down/up, Shift
  faster.
- **Wind**: strength and direction — trees bend, leaves flutter, gusts roll across the grass. **Light and weather**:
  weather, sun height and bearing.
- Try: oak in Specimen with Season at 1 and strong wind; Northern landscape from Walk inside a spruce stand; Plains
  from Treetops with *Full models to* at 30 m and at 400 m; Desert from Low flight over an oasis.

## Transformer — `labs/transform.html`

The lab ship made game-ready: levels of detail and hitboxes.

- **Levels of detail**: the table of LOD0/1/2 (triangles, draw calls); show one level or switch by distance.
- **Fleet test**: up to 24 ships from 100 m to 2 km; compare fps and draw calls with *Use the transformed ships* on and off.
- **Hitboxes**: show them, by kind; **click the ship** to hit the box under the cursor; *Salvo (12 hits)*, *Repair all*,
  hit power.
- **Armament**: train and elevate on every level.

## Model Doctor — `tools/doctor.html`

Checks every lab and game ship for the mistakes that keep coming back.

- **Models**: pick a model (lab ship, its LOD levels, game ships, the test bench).
- **Checks**: the list of findings by severity; click one to light up the pieces (and the source line that added them).
- **Options** and **Budget**: what is checked and the game's limits per ship.
- From the command line: `py tools/doctor.py` (compares with the golden file).

## Pixel Studio — `labs/pixel.html`
Open <https://michalstankiewicz4-cell.github.io/Battle/pixel/>. Pick a mode at the top: **3D model**, **Generate** or **Draw**.
- Set the size on the right (width, height or a preset). The background is always transparent (shown as a checkerboard).
- 3D model: subject, camera preset (Front, ¾, Side, Isometric, Top-down ¾, Top), light side and height, light steps,
  hue shift; *Supersample* 3–4 gives cleaner shapes, *Inner lines* draws edges inside the shape.
- Generate: generator, seed (*Another one*), colour sliders; tiles repeat seamlessly.
- Right panel: palette (Auto = best colours for this image), dither, outline (Selective is softer), clean-up.
- **Edit in Draw** takes the result into the editor. Draw: B pencil, E eraser, G fill, L line, R rectangle, I picker,
  right button erases, Ctrl+Z undo, Space play/pause. *Drawing → text* / *Text → drawing* for sprites as text.
- Pixel Doctor (bottom right): score and findings; **Show** marks the pixels, **Fix** repairs what can be repaired.
- Export: scale, then *PNG frame*, *PNG sprite sheet* or *GIF animation*.
- Settings: *Copy settings* to send the exact setup (e.g. to Claude), *Apply pasted settings* to load one, *Reset* for defaults.
- On a narrow window or a phone everything is one column: preview, then the mode's controls, then output.
Details: `docs/pixel/README.md`.

**Zombie Generator** (`labs/zombies.html`): choose *GPU* or *CPU* in the top bar,
then *Another zombie* or a seed and any trait on
the left; animation, direction, camera, light, style (realistic or pixel art) and the sheet on the right; *PNG sheet*,
*JSON*, *GIF preview*, *All 8 directions (ZIP)* and *Unity slicer (.cs)*. Nothing renders until you press *Start render*. Details: `docs/pixel/zombies.md`.

## When something looks wrong

Take a screenshot (H hides the panels), note the lab, the camera preset and — if possible — *Copy settings (JSON)*,
and send them; that is enough to reproduce it.
