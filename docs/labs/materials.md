# Laboratorium materiałów (`labs/materials.html`)

Jedna biblioteka materiałów dla wszystkich laboratoriów i gier. Kit: **MatKit** (`js/render/materials/matkit.js`);
strona: `js/labs/materials/materials.js`, arkusz `ui/pages/materials.css`. Podgląd na bryłach (kula, sześcian, płyta,
walec, węzeł, wszystkie naraz) w scenie bazowej (niebo, grunt, słońce z cieniem, odbicia z nieba), ze słońcem do
przesuwania (okno Światło) — nierówności widać w świetle bocznym.

## Materiał to opis

```json
{ "kind": "plate", "color": "#6d6a66", "color2": "#3a2f28", "tile": 2, "seed": 1,
  "roughness": 0.6, "metalness": 0.7, "bump": 1, "wear": 0.4, "dirt": 0.4, "rust": 0.7, "panels": 3, "rivets": 1 }
```

- `kind` — rodzaj powierzchni: `metal` (gładki albo szczotkowany: `brushed`), `plate` (blacha: `panels`, `rivets`),
  `paint` (malowany metal: odpryski do metalu), `wood` (`planks`, `grain`), `rock` (`cracks`, `grains`), `concrete`
  (`pores`), `brick` (`bricks`), `paper` (`fibres`), `fabric` (`threads`), `plaster` (`trowel`), `ice` (`cracks`).
- `color`, `color2` — barwa główna i druga (fugi, słoje, zaprawa, metal pod farbą…); `tile` — ile metrów ma jeden
  kafelek (powtórzenia na modelu); `roughness`, `metalness`, `bump` (siła nierówności).
- **Starzenie:** `wear` — rysy, a na farbie odpryski do gołego metalu; `dirt` — brud w zagłębieniach i plamami;
  `rust` — plamy rdzy i zacieki w dół (szorstka, nie metaliczna).
- `seed` — ziarno: ten sam opis i ziarno dają ten sam materiał.

Gotowe (`PRESETS`): blacha, stal szczotkowana, zardzewiała stal, malowany kadłub, aluminium, miedź, złoto, deski,
pokład okrętu (tek), granit, piaskowiec, beton, cegła, papier, płótno, tynk, lód. Zapisane pod nazwą — zasób
**material** (`js/scene/assets.js`).

## Mapy

Generator (`generate(opis, res)`) liczy na kafelku zawiniętym (szum, komórki spękań i wzory łączą się na brzegach):
barwę, wysokość, szorstkość, metaliczność i zacienienie zagłębień (AO, z wysokości). `makeMaterial(opis, { res })` →
`MeshStandardMaterial` z mapą barwy (sRGB), mapą normalnych (z wysokości, siła `bump`) i jedną teksturą AO /
szorstkość / metaliczność (kanały R, G, B — jak czyta je Three.js); `material.userData.tile` — metry na kafelek.
`canvases(mapy)` — podglądy map (okno Mapy: klik — PNG, „Tiled 3 × 3” — sprawdzenie, że nie ma szwów).
Czas: kafelek 512 px ok. 0,5 s; 1024 i 2048 px — z kartą ładowania.

## API dla AI

`window.MaterialApi`: `make(opis)` → opis po sprawdzeniu (i podgląd), `def`, `presets`, `kinds` (rodzaje i ich pola),
`maps()` → mapy jako PNG, `save(nazwa)` → zasób `material`. Zakładka **API** w konsoli: opis jako JSON.

## Dalej (plan)

Materiały dziś powstają w wielu miejscach: ok. 30 plików modeli tworzy własne, budowle mają
`js/models/structures/materials.js`, okręty `js/render/sea/materials.js` (z Battle: brud, pokład), teren — barwy
skał LandKit, laboratorium sztuki — powierzchnie 2D (płótno, papier, drewno, pergamin, metal). Przenoszenie na MatKit
**stopniowo**, rodzina po rodzinie, z doktorem modeli i porównaniem obrazów (podmiana zmienia wygląd). Potem: bloki
laboratorium bloków (Hive Hunger) z materiałów, tryb 3D laboratorium sztuki (faktura farby jako mapa nierówności),
złocenie ramy (złoto płatkowe na bolusie), wybór poziomu starzenia dla gier (`TODO.md`).
