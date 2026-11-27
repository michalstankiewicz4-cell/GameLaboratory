# Budynki z części — HouseKit (`js/models/houses/`)

Z Tornado.io (przeniesione 2026-11-26). Budynki złożone z prawdziwych części do zniszczenia (DestructKit,
[`../behaviors/destruct.md`](../behaviors/destruct.md)): fundament, ściany dzielone przez otwory na filary, podokienniki
i nadproża, ramy okien i szyby, drzwi, stropy, szczyty, połacie dachu, attyka, komin. Każda część ma materiał (z niego
wzór pękania), grubość, wielokąt w swoim układzie i to, na czym stoi (`supports`: części albo grunt −1) — z tego statyka:
dach spada, gdy znikną ściany pod nim. Metry, y w górę, środek obrysu w (0, 0, 0), front patrzy na +z. Oglądane
w laboratorium miasta, tryb Destruction.

## Rodzaje (`housekit.js`, `HOUSE_TYPES`)

| id | budynek |
|---|---|
| `cottage` | parterowy dom z czerwonej cegły na fundamencie, strop drewniany, dach dwuspadowy z dachówki, komin |
| `kostka` | piętrowy dom z lat 70.: mur z cegły pod tynkiem, stropy betonowe, płaski dach z papy z attyką |
| `barn` | drewniana stodoła z desek ułożonych pionowo, duże wrota, wysoki dach z blachy falistej |
| `garage` | garaż z pustaków z blaszaną bramą i dachem jednospadowym z blachy |
| `shed` | mała drewniana szopa na narzędzia, dach z papy |
| `block` | czteropiętrowy blok z prefabrykowanych płyt betonowych, rzędy okien, płaski dach |

`buildHouse(type, { seed })` → `{ type, name, size: [W, H, D], parts: [Part], tint }`.
Część: `{ id, name, mat, poly: [[x, y]], t, pos: [x, y, z], quat: [x, y, z, w], anchor: 'bottom' | 'sides' | 'perimeter',
supports: [id | -1], need (ułamek podpór, który musi zostać), fixed (nie pęka: fundament) }`.

## Budynki Warszawy z części (`landmark-house.js`)

Budynki z laboratorium miasta (CityKit, `js/models/city/landmarks/` — Warszawa z OpenStreetMap): te same dane co model
w laboratorium (obrysy części, wysokości, piętra, styl: mur, okna, barwy) przeliczone na części. Każda część z mapy daje
ściany po krawędziach obrysu kondygnacjami (okna wybite w murze albo ściana osłonowa z paneli), stropy (obrys podzielony
na kawałki wypukłe, dziedzińce pominięte) i dach (płaski — górny strop; spadzisty, ostrosłup, kopuła — trójkąty od
krawędzi do szczytu). Kondygnacja stoi na stropie poprzedniej; część zaczynająca się wyżej — na górnych stropach części
pod nią. Materiały z opisu CityKit rejestrowane w DestructKit (`registerMat`) — barwy i tekstury MatKit jak w laboratorium.
`LANDMARKS` (`{ id: nazwa }`), `landmarkHouse(id)` → jak `buildHouse`.

Doktor modeli: `houses/<rodzaj>` (każda część jako osobna siatka, jak przed zniszczeniem; `ground: 0`).

## Lista (`catalog.js`)

`HOUSES { id: { name, namePl, note, notePl } }` i `buildHouse(id, { seed })` — jedna lista budynków z części (rodzaje HouseKit
i `lm:<budynek z mapy>`), z której biorą tryb Destruction laboratorium miasta i prefabrykaty sceny (`houses/<rodzaj>`,
`houses/lm-<budynek>`, `js/scene/prefabs-houses.js`).
