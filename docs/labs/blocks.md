# Laboratorium bloków (`labs/blocks.html`)

Bryły z bloków (wokseli), jak w Hive Hunger (przeniesione z historią, 0.64.0). Kit: **BlockKit**
(`js/models/blocks/blockkit.js`, kształty `shapes.js`, siatka `grid.js`); ciecze i gaz w kosmosie — zachowania
`js/behaviors/space/liquids.js`, `gases.js` (siatka sąsiedztwa `grid3d.js`), shader cieczy `js/render/liquid.js`;
strona `js/labs/blocks/blocks.js`, arkusz `ui/pages/blocks.css`. Środowisko: tylko kosmos (bez grawitacji) —
w przełączniku woda i ląd są wyszarzone.

## Bryła to opis

```json
{ "shape": "sphere", "radius": 8, "voxel": 0.5, "seed": 1, "text": "GL",
  "layers": [ { "kind": "rock", "where": "everywhere", "amount": 100 },
              { "kind": "lava", "where": "core", "amount": 100 } ] }
```

- `shape` — `sphere` (planetoida), `cube`, `pair` (dwie kule), `boxes`, `belt` (pas skał), `balls` (kulki testowe,
  po jednej na rodzaj), `text` (napis z `text`).
- `radius` — rozmiar w metrach (1–40), `voxel` — bok bloku (0.1–2 m), `seed` — ziarno (ten sam opis = ta sama bryła).
- `layers` — warstwy po kolei, późniejsze przykrywają wcześniejsze. `where`: `everywhere`, `surface` (warstwa
  wierzchnia), `under` (pod nią), `deep` (głęboko), `core` (jądro), `veins` (żyły), `pools` (jeziorka) — żyły
  i jeziorka to plamy z szumu; `amount` — % danego miejsca.

## Rodzaje bloków

| Rodzaj | Stan | Wygląd |
|---|---|---|
| skała, żelazo, lód, piaskowiec | stały | materiał z MatKit (laboratorium materiałów); w oknie Rodzaje bloków można wybrać inny gotowy albo zapisany |
| woda, lawa | ciecz | shader cieczy; po ugryzieniu krople |
| gaz | gaz | po ugryzieniu chmura |

Rysowane są tylko bloki odsłonięte (po jednym `InstancedMesh` na rodzaj); przez wodę i gaz widać bloki pod spodem.
Bloki stałe mają UV w przestrzeni świata, więc materiał nie rozciąga się na blokach.

## Ugryzienie i luźne

Kliknięcie w bryłę wygryza kulę o zadanym promieniu. Woda i lawa wypadają jako krople, które przyciągają się
(spójność w zasięgu `reach`), odpychają bliżej niż `rest` i są tłumione (`damping`) — zbijają się w pływające
kule. Gaz — chmura, która dryfuje, rośnie i rozpływa się. Liczby jak w Hive Hunger: na krok 1/60 s; laboratorium
liczy je stałym krokiem 60 Hz (najwyżej 6 kroków na klatkę), niezależnie od liczby klatek.

## Dla AI — `BlocksApi`

- `BlocksApi.build(bryła)` → `{ counts }` — buduje bryłę z opisu.
- `BlocksApi.bite([x, y, z], r)` → co wypadło (liczba bloków na rodzaj).
- `BlocksApi.counts()`, `BlocksApi.loose()` — bloki w bryle, luźne krople i gaz.

Zakładka API w konsoli: bryła jako JSON i przycisk budowy.

## W edytorze sceny

Rodzina prefabrykatów **Bloki** (`blocks/sphere`, `blocks/cube`, `blocks/pair`, `blocks/belt`, `blocks/balls`) —
bryły z domyślnymi warstwami, na powierzchni kosmosu.

## Dalej (w planie)

Pozostałe z punktu 8: statki roju, laboratorium efektów, drzewka technologii.
