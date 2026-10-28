# Quays and breakwaters — research sheet

Models: `js/structkit/structures/quay.js`, `js/structkit/structures/breakwater.js`, building blocks in
`js/structkit/coastal.js` · lab: `labs/structures.html`. These are **typical** structures, not particular ones: the
construction types, cross-sections and furniture follow common port and coastal engineering practice, and the main
sizes are parameters in the lab.

## Quay wall (nabrzeże)

| Construction | What is modelled |
|---|---|
| Gravity block wall | precast concrete blocks 4 × 2 m laid in courses (joints staggered, each course a little narrower), on a 2 m rubble bed; concrete capping beam 3.2 × 2.2 m |
| Steel sheet-pile wall | U-profile piles (0.6 m wide, 0.42 m deep corrugation) driven below the bed, concrete capping beam; fill behind |
| Open piled deck | 24 m deck slab on cross beams and Ø 1.0 m steel tubular piles in a 6 × 6 m grid (4 rows), over a rock revetment at 1:1.5 |

Furniture: yellow-and-black safety kerb on the edge; tee-head bollards every 15 m, 0.9 m from the edge; cylindrical
rubber fenders Ø 1.4 / 0.8 m × 2.2 m on chains every 15 m (sizes as on Dutch container and tank terminals, see the
Delft paper); recessed ladders every 30 m; two crane rails at a 10.5 m gauge, the seaward one 2.5 m from the edge;
lighting masts every 50 m; a paved apron 70 m deep. Cope level +2.6 m by default (+1.2 … +4.5 m), the berth depth is
the lab's water depth. **ORP Błyskawica** can lie alongside — starboard side to, on the fenders, with bow and stern
lines and two springs to the nearest bollards (she has been a museum ship at a Gdynia quay since 1976).

## Breakwater (falochron)

| Type | Cross-section |
|---|---|
| Rubble mound, rock | quarry-run core with an underlayer (one solid in the model), two layers of armour rock on 1:1.5 slopes both sides and over the crest, a toe berm of rock on the seabed, a concrete crown wall with a recurved parapet and a walkway |
| Rubble mound, tetrapods | the same mound with two layers of tetrapods seaward and on the crest, rock on the quieter lee side |
| Caissons + tetrapod berm | floated-in reinforced-concrete caissons (20 m wide, up to 52 m long, joints between them) on a 4 m rubble bed, a 1.4 m superstructure slab and a wave wall; a tetrapod berm in front against wave reflection — the mixed type now built at Gdańsk (38 caissons, tetrapods seaward); bollards on the lee side |

- **Armour size** from the unit mass (2–25 t): rock nominal diameter (m / 2.65 t·m⁻³)^⅓; tetrapod height from its
  volume (m / 2.4 t·m⁻³), using a 7.8 t unit 2.35 m across and 2.08 m high as the reference shape.
- **Tetrapod shape** (Danel & Anglès d'Auriac, Laboratoire Dauphinois d'Hydraulique, 1950): four tapered legs along the
  tetrahedron's axes from one centre; legs 0.62 h long, 0.44 h thick at the root, 0.26 h at the tip (reconstructed to
  match the 7.8 t unit's outline).
- **Crest** three units wide; crown wall 2.5 m above the crest; crest level +2 … +9 m.
- **Round head** at the seaward end with the armour wrapped around it and a **harbour light**: a red tower and a red
  light — IALA region A, port hand entering harbour.
- **Placement**: units laid on the slopes on a jittered grid with random turns and tilts, two layers (one layer below
  −5 m, where the second would not be seen from above the sea), instanced — a 180 m tetrapod breakwater is ~2,200
  tetrapods and ~4,600 rocks in nine draw calls.

## The sea around them

Each structure gives a height function; the lab bakes it into a texture the sea reads (WaterKit `opt.land`): shallow
turquoise water and surf along the slopes and the toe, waves dying in the shallows, no water drawn over the quay or the
crest.

## Sources

- Wikipedia, Tetrapod (structure) — <https://en.wikipedia.org/wiki/Tetrapod_(structure)>
- Betonblock, tetrapod mould BBTP-7.8 (7.8 t unit 2.35 × 2.35 × 2.08 m) — <https://betonblock.com/en/products/tetrapods/tetrapod-bbtp-7-8>
- Rover Maritime, "38 caissons in 300 days and 300 nights" (Gdańsk mixed breakwater) — <https://www.rovergrupo.com/en/noticia-detalle/38-caissons-in-300-days-and-300-nights>
- Port of Genoa, new breakwater — the caissons (40–67 m long, 25–30 m wide, 22–33 m high) — <https://www.pergenovadigaforanea.it/en/the-caissons.html>
- TU Delft repository, fender systems on quay walls (cylindrical fenders Ø 1400/800 mm × 2200 mm) — <https://repository.tudelft.nl/file/File_e58dee98-a90b-400b-b26c-d329bf7909ec>
- Wikipedia, Breakwater (structure); Wharf; Sheet pile.

## Not modelled yet

Quay: cranes, sheds, rail tracks on the apron, mooring rings and cable drums, storm drains. Breakwater: wave overtopping
and spray, the underlayer as separate stones, armour displaced by storms. Piers and jetties, harbours and lighthouses are
the next structures.
