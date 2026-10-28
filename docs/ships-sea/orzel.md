# ORP Orzeł (1939, as delivered) — research sheet

Model: `js/shipkit/ships/orzel.js` · viewer: `labs/ship.html` (pick *ORP Orzeł* in the top bar) · kit: `js/shipkit/`.
Configuration: the boat as handed over by De Schelde at Vlissingen on 2 February 1939 and as she sailed in September 1939
(before the May 1940 work at Rosyth). She was lost with all hands on her seventh patrol in the North Sea, declared lost
on 11 June 1940; the wreck has not been found.

## Published figures used

| Item | Value |
|---|---|
| Builder | N.V. Koninklijke Maatschappij De Schelde, Vlissingen, yard no. 205; contract 29 Jan 1936 (The Hague) |
| Dates | laid down 14 Aug 1936 · launched 15 Jan 1938 · first sea trip 23 Aug 1938 · commissioned 2 Feb 1939 · Gdynia 10 Feb 1939 |
| Length / beam / draught | 84.00 m / 6.70 m / 4.17 m (fully equipped) |
| Displacement | 1,110 t surfaced / 1,473 t submerged |
| Hull | double hull; pressure hull 14 mm plating (16 mm at the tower), frames outside the pressure hull — 160 × 65 mm channels every 550 mm; welded tower and bulkheads; no bilge keels (she rolled heavily) |
| Machinery | 2 Sulzer 6QD42 diesels, 4,740 hp · 2 Brown Boveri electric motors, 550 hp each · 2 batteries of 100 cells · 2 shafts |
| Speed | 19.4 kn surfaced on trials (20 kn contract) · 9 kn submerged |
| Range | 7,000 nm at 10 kn · 100 nm at 5 kn submerged (20 h) · 90 days |
| Diving | 80 m contract, 100 m maximum (97 m reached on patrol) · emergency dive ~50 s · periscope depth 10–12 m |
| Torpedoes | 12 × 550 mm (liners for 533 mm): 4 bow, 4 stern, 4 in two trainable twin mounts between the hulls, fore and aft of the tower; 20 torpedoes |
| Guns | 1 × 105 mm/41 Bofors in a shielded mount forward of the tower, 125 rounds · 1 × 2 40 mm/56 Bofors wz.36, in a watertight well in the tower, raised hydraulically, 1,200 rounds · a 13.2 mm Hotchkiss was planned but probably never fitted (two Lewis guns were used instead) |
| Crew | 60 (6 officers, 54 petty officers and ratings); 63 in wartime |
| Markings | tactical number 85A in large figures on the tower; bronze letters of the name on the tower (painted over in war); bronze bell (~20 kg) on the back of the tower |
| Other | net cutter on the bow (partly sheared off in an accident in autumn 1938); hydraulically worked hatches, periscopes and vent flaps; the class was close to the Dutch O 19 boats built at the same time |

## Sources

1. [Wikipedia: ORP Orzeł (1938)](https://en.wikipedia.org/wiki/ORP_Orze%C5%82_(1938))
2. [Wikipedia: Orzeł-class submarine](https://en.wikipedia.org/wiki/Orze%C5%82-class_submarine)
3. [navypedia.org: ORZEŁ submarines (1939)](https://navypedia.org/ships/poland/pl_ss_orzel.htm)
4. [Fundacja „Odnaleźć Orła”: technical specification and armament](https://santiodnalezcorla.pl/technical-specification-and-armament-orp-orzel/?lang=en)
5. [moje-morze.pl: ORP „Orzeł” — dar i duma narodu](https://moje-morze.pl/orp-orzel-dar-i-duma-narodu/)
6. [Polska Zbrojna: „Orzeł” i „Sęp” — jak powstawały](https://polska-zbrojna.pl/home/articleshow/21674?t=-Orzel-i-Sep-jak-powstawaly-slynne-okrety-marynarki-wojennej)
7. [smartage.pl: ORP Orzeł (1939) — najsłynniejszy polski okręt podwodny](https://www.smartage.pl/orp-orzel-1939-najslynniejszy-polski-okret-podwodny/)
8. [uboat.net: Orzeł class](https://uboat.net/allies/warships/class.html?ID=228&navy=ORP)

The sources disagree in places (torpedoes carried: 20 or 8; 105 mm designation wz.25 or wz.36; surface speed 19.4 or
20 kn); the sheet keeps the figure most of them give and the model does not depend on it. Photographs and plan drawings
could not be downloaded in the build environment (image hosts are blocked), so the shapes come from the descriptions
above and from the general arrangement of Dutch submarines of the period.

## Reconstruction assumptions

Coordinates: metres, x = starboard, y = up (0 = surfaced waterline), z = forward (0 = amidships).

- **Outer hull**: lofted from line functions — full round sections (superellipse n ≈ 2.4), maximum beam at the
  waterline, a rounded shoulder up to a flat casing deck 3.4 m wide at 2.1 m above the water, sheer rising to 3.2 m at
  the bow; raked stem 2 m forward at the deck with a deep rounded forefoot; overhanging stern 2.4 m. Limber
  (free-flooding) holes in a row under the casing edge, a ballast keel.
- **Pressure hull** (in the lab only, shown when the outer hull is hidden): Ø 5.0 m from 20 m aft to 22 m forward of
  amidships, coned ends, the outside frames as rings every 0.55 m, the tower trunk, the bow and stern tube nests.
- **Conning tower**: a streamlined fairing 18 m long, 3.1 m wide, its front sloping forward over the casing to just
  behind the gun; open bridge at 4.5 m with a bulwark round the forward part, binnacle and voice pipes; periscope
  standard to 7.3 m with the attack and search periscopes (2.8 m travel) and a telescopic radio mast; the 40 mm well
  aft with its cover and a guard rail; doors at the casing; "85A" in white on both sides, the bronze name further aft,
  the bell at the back; the ensign on a staff at the after end. The heights are chosen so the standard is under water
  and the raised periscopes show 3.3 m at periscope depth (keel 12 m).
- **Layout fore to aft**: net cutter (a toothed bar up the stem from the waterline) and the jumping wires to the periscope standard and on
  to a post at the stern · forward torpedo loading hatch · bow hydroplanes (folded up against the casing on the surface,
  rigged out to dive) · forward twin tubes between the hulls (z = 19 m) · 105 mm gun (z = 13.2 m) · tower (z = −7.6 …
  10.6 m) · motor-boat stowage under a cover just behind the tower · aft twin tubes (z = −14.5 m) · engine-room and aft
  torpedo hatches · stern: twin screws Ø 1.7 m on shafts with brackets, stern hydroplanes, rudder under the overhang ·
  bow tube shutters 2 × 2, stern tube shutters 2 × 2. Retractable bollards and capstans on the casing.
- **Training arcs**: 105 mm ±135°, 40 mm ±150°; the twin tubes train abeam to fire through the casing.
- **Paint**: medium grey hull and tower, darker casing deck, black boot-top, red-brown anti-fouling. The pre-war colour
  of the boat is not given by the sources; this is an assumption.

## In the lab

*Diving*: Surfaced, Decks awash (casing at the water), Periscope depth (keel 12 m, periscopes up), Deep (40 m). The
boat sinks at 0.3 m/s, about the real rate (tick *Fast* to skip); the 40 mm mount goes down into its well and the cover
closes, the bow planes rig out, the ensign is struck. The status line gives the keel depth and how much periscope shows.

## Ideas for refinement

- Check the tower, the gun and the hatches against a profile drawing or photographs when they can be used.
- The May 1940 state (Rosyth), and the sister ship ORP Sęp as a variant.
- Periscope wake and spray, diving in the Water Lab (the hull under the WaterKit surface).
