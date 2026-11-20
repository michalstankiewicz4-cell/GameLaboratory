# CityKit — budynki miasta (`js/models/city/`)

Proceduralne budynki na dowolnym obrysie. Metry, y w górę, podstawa w y = 0, obrys wyśrodkowany, front (krawędź
`front`) patrzy na −z. Laboratorium: [`../labs/city.md`](../labs/city.md); w scenie prefabrykaty `city/<rodzaj>`.

| Plik | Co robi |
|---|---|
| `citykit.js` | wejście: `buildBuilding(opis, { detail, ppm })` → `{ group, spec, layout, info, stats, tiles, setLit, dispose }`; `setNight(0…1)`, `setPom(tak/nie)`, `clearBakes()`, `facadeKey(opis)`; pamięć wypalonych kafelków |
| `types.js` | rodzaje (`TYPES`: house, tenement, block, tower, office, market), `normalizeSpec` — opis uzupełniony z rodzaju i sprawdzony |
| `footprint.js` | obrys: gotowe kształty, `cleanPolygon` (orientacja, wyśrodkowanie), krawędzie z normalnymi, odsunięcie do środka (dachy), podział na trójkąty |
| `layout.js` | układ fasad: moduły na ścianach, rodzaje komórek parteru, elementy komórek (otwory, bryły), `cellHash` / `windowLight` |
| `mesh.js` | geometria: `near` (siatki), `far` (prostokąty z kafelkami), `top` (gzyms wieńczący, dach) |
| `roof.js` | dachy: płaski z attyką, kopertowy, dwuspadowy, mansardowy |
| `bake.js` | wypalanie kafelków na procesorze (bez WebGL) |
| `facade-material.js` | materiał kafelka z paralaksą, materiały wersji bliskiej, `NIGHT`, `POM` |
| `geo.js` | zbieranie trójkątów po materiale, układ ściany → świat |

## Opis budynku

```json
{ "type": "tenement", "seed": 1, "footprint": { "shape": "corner", "w": 24, "d": 20, "cut": 6 }, "front": 2,
  "floors": 5, "floorH": 3.4, "groundH": 4.3, "bay": 2.9, "module": ["window"],
  "window": { "style": "punched", "w": 1.2, "h": 2.0, "sill": 0.8, "mullions": 1, "transom": true, "depth": 0.28 },
  "ground": { "front": "shop", "sides": "window", "entrances": 1 },
  "bands": { "plinth": 0.6, "cornice": true, "floors": true, "top": true },
  "roof": { "type": "mansard", "pitch": 28, "overhang": 0.35 }, "lit": 0.4 }
```

Brakujące pola biorą się z rodzaju. `wall` — opis MatKit (gotowy albo z laboratorium materiałów). `footprint.points`
— własny obrys `[[x, z], …]` (`shape: "custom"`). Pełna lista pól: komentarz w `types.js`.

## Układ fasad (wspólny dla obu wersji)

Ściana (krawędź obrysu) dzieli się na `n` modułów piętra (przęsła z `module` × `bay`), rozciągniętych do jej długości
(`s` blisko 1); za krótka ściana jest gładka. Komórka = moduł × kondygnacja. Elementy komórki w jej układzie (u wzdłuż
ściany, v w górę, z na zewnątrz od lica): **otwór** (wnęka, szyba, rama, słupki, ślemię, drzwi) i **bryła** (parapet,
płyta i balustrada balkonu, cokół, gzymsy; `band` — pas przez całą ścianę). Wersja bliska buduje z nich siatki
(mur wokół otworów, ościeża, pasy jako jedna bryła na ścianę z pełnymi narożnikami), wypalanie — mapy kafelka.
Rodzaje komórek: `upper` (piętro), `plain` (gładka ściana), `g:shop`, `g:window`, `g:glass`, `g:door`, `g:wall`.

## Wypalanie i paralaksa

`bakeTile` rysuje elementy komórki w rzucie na lico muru (domyślnie 64 px/m): albedo (A — maska muru), normalne
z różnic wysokości z fakturą muru MatKit (A — wysokość 0…1 w zakresie głębokości komórki), AO / szorstkość /
metaliczność (A — numer okna × 16). Kafelki są wspólne dla budynków o tym samym wyglądzie fasady (`facadeKey`: bez
obrysu, liczby pięter, dachu i ziarna). Materiał: `MeshStandardMaterial` z `onBeforeCompile` — rama styczna z pochodnych
w ekranie (gradient u i v na powierzchni → przesunięcie UV na metr wysokości), marsz promienia od płaszczyzny
najwyżej wystającego elementu w głąb (8–64 kroki, więcej przy dużej głębokości i patrzeniu z ukosa) z dopasowaniem
między krokami; mapy czytane `textureGrad` z pochodnymi pierwotnego UV (bez schodków mipmap na krawędziach wnęk).
Okno nocą: numer okna z mapy + komórka z UV (piętra) albo z atrybutu `aCell` (parter) → `cityHash` jak w JS.

## Ograniczenia (dziś)

- Dach dwuspadowy tylko na prostokącie; kopertowy na L / U kończy się płaskim szczytem, gdzie dalej się nie da.
- Balkony w wersji dalekiej nie rzucają cienia (płaska ściana) i z bliska pod ostrym kątem mają smugi paralaksy —
  wersja daleka jest na odległość.
- Gzymsy na rogach wklęsłych zachodzą na siebie (wypukłe są domknięte).
