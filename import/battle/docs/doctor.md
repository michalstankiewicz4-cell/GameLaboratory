# Model doctor (`labs/doctor.html`, `js/labs/modeldoctor.js`, `tools/doctor.py`)

A deterministic check for the repeating mistakes of models built by code. Ported from the owner's *Space* repo
(`tools/modeldoctor.js`, `tools/kitcheck.html`) and extended for a naval game: gun arcs, waterline, hull side and the
in-game budget. It examines every ShipKit lab model and every game class model (`js/world/models.js`).

## Use

- **Page** `labs/doctor.html` (also linked from the labs start screen and the Ship Lab bar). Left: the models with their
  counts (red = errors, amber = warnings, blue = info), the checks (filter), options. Right: the findings, grouped by
  check. Click a finding: its pieces turn red (the rest fades); for a gun arc the mount is trained to the blocked bearing
  and the line of fire is drawn. `?model=lab/blyskawica` opens one model.
- **Headless** `py tools/doctor.py` prints every finding and fails when the test bench misses a check, a model's
  fingerprint or finding counts differ from `tools/doctor.golden.json`, or the page logs errors.
  A change meant to alter a model: check the diff, then `py tools/doctor.py --update` and commit the golden file with
  the change. `--shots` saves `tools/out/doctor-*.png`.
- **API** `examine(root, opts)` in `js/labs/modeldoctor.js` works on any THREE object; `window.doctorReport` holds the
  results as plain data.

Lab models are built **unmerged** (`KIT.unmerged = true` in `js/shipkit/geom.js`: one mesh per piece, and each piece
remembers the source line that added it, e.g. `parts.js:104 ← blyskawica.js:265`). Game models are merged box lists;
the page splits them back into single boxes (`explodeBoxes`) and names them by position.

## Checks

Only solid meshes count (visible, opaque standard / physical / lambert / phong / basic materials).

| Check | Severity | What | How |
|---|---|---|---|
| nan | error | positions that aren't numbers | any non-finite vertex |
| inverted | error | a closed shape built inside-out (outside culled) | negative signed volume in the geometry's own space; closed shapes only (box, closed cylinder, sphere, torus, extrusion, split boxes) |
| arc | warning (AA: info) | a gun's line of fire hits the own ship inside its training arc | each mount trained through ±arc in 5° steps, guns level; a ray from each gun along its barrel, as long as the barrel; thin pieces (rails, wires, rods) do not count as obstacles. Tells the blocked bearings and what blocks them |
| zfight | warning | two pieces' faces in one plane, overlapping: they flicker | triangles bucketed by plane (lab: 2 cm, otherwise 0.06 % of the model), 2D overlap of shrunk triangles. Skipped: same untextured material, `polygonOffset` decals. Tells the plane's normal and a point on it |
| floating | warning | a piece that touches nothing of the main body | boxes grown by the tolerance (0.4 % of the model), connected groups; all but the biggest |
| waterline | warning | a piece above the hull reaching below y = 0 | box below −tolerance; the hull, screws, rudder and keels are allowed |
| poke | warning | a fitting sticking out through the hull side | vertices between the waterline and the deck edge further out than the hull's half-breadth (ShipKit `sideAt`) |
| budget | warning | the merged model is over the in-game per-ship budget | triangles and draw calls of the normal (merged) build against the sliders (default 25k / 40) |
| hidden | info | a piece entirely inside another (drawn for nothing) | every sampled vertex inside a closed piece (ray parity, odd direction, hits on shared edges counted once) |
| speck | info | a piece under 0.3 % of the model | its box |
| sliver | info | needle triangles that shade badly | area / longest edge² < 0.002; rods (length > 30 × radius) are exempt |

Allow-list what is meant: `userData.doctorOk = 'speck'` (or an array, or `'*'`) on the piece or any ancestor.
"Show allow-listed pieces" on the page reports them anyway.

**Test bench** (`test/bench`): a small model with one deliberate mistake per check. Every check must find something
there, so a check that silently stops working is noticed (`tools/doctor.py` fails).

## First run (2026-10-19, v0.6.0)

**ORP Błyskawica** — before: 5 arc warnings + 1 AA info, 24 zfight, 9 hidden, 4 speck, 2 sliver groups; after the fixes
only the budget warning is left (33k triangles, 99 draw calls: the lab model needs a lower level of detail before it can
be a game ship).
- Arcs: forecastle ventilators stood in A's and Y's line of fire (moved forward of the muzzles / outboard aft of Y);
  B fired into A's roof (B now on a 0.35 m barbette); the measured training arcs are now in the model data
  (A 145°, B 140°, X 145°, Y 135°, forward 40 mm 135°).
- Stowed torpedo tubes 1 ran into the forward 40 mm platform (moved 0.9 m aft).
- Flicker: houses sharing the bottom plane of the deck plates, deck plates flush with the house sides, tube rings 1.5 cm
  off the tube, searchlight lens 1 cm off the drum, shield hatch, shelter window, 40 mm pedestal, break doors.
- Wheelhouse windows were a straight row inside the rounded front (6 hidden): they now follow the curve.
- 13.2 mm guns are small by nature: allow-listed for `speck`.

**Game models** — before: destroyer 2 arc / 9 zfight / 4 hidden, cruiser 1 arc / 10 zfight, battleship 2 arc / 6 zfight,
submarine 1 zfight; fixed in v0.7.1, all four are now clean:
- AA mounts are placed only where the whole mount (base, shield, raised barrels) clears everything already on deck —
  turrets, deckhouses, funnels, boats, secondaries — on the deck or on a deckhouse roof. Before, the destroyer's
  forward pair stood inside the bridge and others overlapped torpedo mounts, boats and secondaries.
- Deckhouses, funnels and torpedo mounts reach 10–20 cm into the hull (staggered), so their bottoms no longer share the
  deck plane; the anchor windlass is left out where it would sit under the forward turret (destroyer, cruiser); the
  flagstaff stands right at the stern, out of the aft gun's line of fire; the submarine's sail nose is 2 cm lower.
- Training arcs where the barrels reached the bridge or a pedestal at the end of the arc (`js/world/constants.js`):
  destroyer A ±145°, cruiser B (raised) ±130°, battleship B (raised) ±135°, battleship Y ±145°.
- Doctor: a box's needle triangles (a wire) and the hull's flat extruded cap no longer count as slivers.

## Next

- Sweep check: a mount's own body (not just the barrel line) colliding while it trains (torpedo tubes, AA).
- Elevation sweep for superfiring mounts (blast interlock zones), muzzle-blast clearance.
- Unused materials and textures; draw calls per visible metre.
