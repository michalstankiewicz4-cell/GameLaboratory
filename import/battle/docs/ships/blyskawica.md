# ORP Błyskawica (1937, as built) — research sheet

Model: `js/shipkit/ships/blyskawica.js` · viewer: `labs/ship.html` · kit: `js/shipkit/`.
Configuration: the ship as completed by J. Samuel White & Co., Cowes, in 1937 (before the 1940–41 refits and the 1942 British 4-inch rearmament).

## Published figures used

| Item | Value |
|---|---|
| Length overall / waterline / between perpendiculars | 114.0 / 111.0 / 109.0 m |
| Beam | 11.26 m |
| Draught fwd / aft | 3.15 / 3.45 m |
| Hull depth amidships | 6.48 m |
| Displacement | 2,011 t standard · 2,144 t normal · ~2,400 t full |
| Machinery | 3 Admiralty 3-drum boilers (+1 auxiliary), 2 Parsons geared turbines, 2 shafts, 54,000 shp |
| Speed | 39 kn design; 39.6 kn trials |
| Range / crew | 3,500 nm at 15 kn / 192 peacetime |
| Main battery | 7 × 120 mm/50 Bofors wz.34/36 — 3 twin + 1 single |
| AA | 2 × 2 40 mm/56 Bofors wz.36, 4 × 2 13.2 mm Hotchkiss wz.30 |
| Torpedoes | 2 × 3 tubes |
| ASW / mines | 2 depth-charge racks, 2 pairs of mine rails (44 mines) |

## Sources

1. [Wikipedia: ORP Błyskawica](https://en.wikipedia.org/wiki/ORP_B%C5%82yskawica)
2. [naval-encyclopedia.com: Grom class destroyers](https://naval-encyclopedia.com/ww2/poland/grom-class-destroyers.php)
3. [navypedia.org: GROM destroyers (1937)](https://www.navypedia.org/ships/poland/pl_dd_grom.htm)
4. [opisybroni.pl: ORP „Błyskawica”](https://opisybroni.pl/orp-blyskawica/)
5. [portalstoczniowy.pl: ORP Błyskawica before the war](https://portalstoczniowy.pl/en/orp-blyskawica-przed-wojna-uzbrojenie/)

Photographs and plan drawings could not be downloaded in the build environment (image hosts are blocked), so the layout comes from the text descriptions above and general knowledge of the class.

## Reconstruction assumptions

Coordinates: metres, x = starboard, y = up (0 = waterline), z = forward (0 = amidships). `zOf(d) = 57 − d` converts distance from the stem.

- **Hull**: lofted from line functions (half-breadth, bilge, draught, flare, deck height). Raked stem (~2.6 m), cruiser-like rounded stern; forecastle break 58 m from the stem; forecastle deck ~2.35 m above the main deck with sheer towards the bow. Bilge keels, two shafts with A-brackets, Ø 3.2 m propellers, single rudder.
- **Layout fore to aft**: A twin 120 mm (17 m from the stem) · B single 120 mm superfiring on a deckhouse · wheelhouse and open bridge with wind deflector, 4 m rangefinder tower, searchlight tower · tripod foremast (top ~27 m) · single raked funnel with cap (top 15.8 m) · boats either side of the funnel · 40 mm twin (59.6 m) · torpedo tubes 1 (64.5 m) · 40 mm twin (70.8 m) · torpedo tubes 2 · aft deckhouse with mainmast, searchlight, rangefinder and 13.2 mm Hotchkiss sponsons · X twin 120 mm superfiring · Y twin 120 mm on the quarterdeck · mine rails, depth-charge racks, flagstaff with the ensign, name on the transom.
- Heights of deckhouses, mount sizes and the exact longitudinal positions are estimates that fit the figures above; they are not measured from the builder's plans.
- Paint: medium grey, darker decks, black boot-top, red anti-fouling.

## Ideas for refinement

- Check positions against a profile drawing (e.g. a published plan in Polish naval literature) when one is available.
- Add the 1940–41 and 1942 configurations as variants.
