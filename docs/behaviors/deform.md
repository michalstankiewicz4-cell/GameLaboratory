# Deformacja blachy — DeformKit (`js/behaviors/land/deform/`)

Zachowanie z Tornado.io (laboratorium deformacji, przeniesione 2026-11-26): powłoka z cienkiej blachy, która się trwale
gniecie (beczka, puszka, karoseria). Środowisko: ląd (grawitacja, grunt). Oglądane w laboratorium przedmiotów, tryb
Deformation ([`../labs/items.md`](../labs/items.md)).

## Model i deformacja są osobno

Model nie wie o deformacji. DeformKit tylko się do niego podpina:

```js
import { createShell, makeBox } from 'js/behaviors/land/deform/shell.js';
import { shellGeometry } from 'js/models/junkyard/shells.js';
const model = barrel.build(0, wariant);                        // czysty model — gdy deformacja niepotrzebna, wystarczy
const sim = shellGeometry(barrel.info.shell).applyMatrix4(M);  // rzadka siatka fizyczna z opisu powłoki przedmiotu
const shell = createShell([sim], { mass: barrel.info.mass, worker: true });
model.matrixAutoUpdate = false; model.matrix.copy(M);
shell.embed(model);                                            // od teraz siatki modelu idą za powłoką
shell.step(dt, { ground: 0, boxes: [prasa, ...podpory] });
```

Bez `createShell` model zostaje sztywny i nic nie kosztuje. Opis powłoki przedmiotu (`info.shell`) to dane modelu, jak
zderzacz (`info.collider`): beczka — `{ type: 'drum', r, h, lid, lidY, rMax, segs: 32, rows: 16, rings: 3, ringsInset: 6 }`
(ściana 32 × 16, dno i wieko wpuszczone; `rMax` — obręcze toczne, do podpór). `shellGeometry(opis, { inset })` — siatka
cofnięta o promień styku (beczki stykające się cząstkami).

## Pliki

| Plik | Co robi |
|---|---|
| `shell-core.js` | obliczenia bez Three.js (główny wątek i wątek): `buildShell(geoms, opts)`, `stepShell(stan, dt, C)`, `DEFAULTS`, `ENVIRONMENTS` |
| `shell.js` | `createShell(siatki, opts)` — powłoka: krok na miejscu albo w wątku, stan, pomiary |
| `embed.js` | osadzanie siatek modelu w siatce fizycznej (współrzędne barycentryczne najbliższego trójkąta i odsunięcie wzdłuż normalnej) |
| `box.js` | `makeBox(half, matrix, friction)` — prostopadłościany zderzeń (prasa `plastic`, podpory, ściany); zderzacze kroku jako liczby |
| `shell-worker.js` | wątek (`worker: true`): jedna powłoka na wątek |

## Metoda (`shell-core.js`)

- Powłoka PBD (position based dynamics) na rzadkiej siatce (cząstki = wierzchołki zgrzane po położeniu, `weld` 2 mm).
  Więzy: krawędzie (rozciąganie — blacha prawie się nie rozciąga), pary naprzeciw krawędzi i cięciwy przez wierzchołek
  (zginanie — sztywność blachy). Rzadka siatka i dużo iteracji (30, 2 podkroki): blacha składa się w fałdy zamiast
  płynąć jak plastelina.
- Plastyczność: nadmiar odkształcenia ponad granicę (`yieldStretch`, `yieldBend`) przechodzi w nową długość spoczynkową
  — tylko przy docisku prostopadłościanem z `plastic` (prasą), nie od samego ciężaru; opcja kroku `yield: true` włącza ją
  też bez docisku (prasa naciska przez inne beczki).
- Utrzymanie kształtu (`shape`): cząstki ciągnięte do kształtu spoczynkowego przesuniętego i obróconego jak beczka
  (dopasowanie kształtu, Müller 2005) — bez tego powłoka uginała się pod własnym ciężarem; przy docisku odchyłka ponad
  `yieldShape` (4 mm) zmienia kształt spoczynkowy. Po zejściu z prasy kształt spoczynkowy przez `relax` (1 s) dopasowuje
  się do odskoku blachy; przyciąganie do kształtu nie ma składowej obrotowej. `stretchLimit` (granica trwałego
  wydłużenia krawędzi) domyślnie wyłączona — kłóci się z utrzymaniem kształtu (beczka po zgnieceniu drga i pełznie).
- Zderzenia: grunt (`ground` — wysokość) i prostopadłościany z tarciem; cząstka wciśnięta w bryłę wychodzi ścianą,
  którą weszła; prasa ma tarcie tylko na ścianie dolnej i górnej. Między powłokami: `others` — cząstki sąsiadów (stan
  z poprzedniego kroku, siatka haszowana); każda powłoka odsuwa swoje cząstki o połowę wcisku (promień styku `radius`).
- Chwyt (`pin: { ids, off, target, k }`): wybrane cząstki ciągnięte do punktu.
- Spoczynek po 0,5 s bez ruchu (`awake` — liczy się tylko obudzona powłoka; `wake()`).

## Wątki

`worker: true`: każda powłoka w swoim wątku, liczą się równolegle; wynik kroku w następnej klatce. Każdy krok idzie do
wątku ze swoimi zderzaczami (położenie prasy i sąsiadów z chwili zlecenia). Kto składa kilka powłok (laboratorium), robi
nowy krok dopiero, gdy `shell.pending` jest fałszywe we wszystkich — prasa i sąsiedzi zawsze sprzed jednego kroku, bez
przeskoków. `settled()` → Promise po wysłanych krokach.

## API powłoki

`createShell(simGeometries, opts)` → `{ embed(obj), step(dt, { ground, boxes, others, yield, pin }), wake(), awake,
threaded, pending, settled(), particles, triangles, radius, bounds() → [ymin, ymax], box() → [xmin, ymin, zmin, xmax,
ymax, zmax], stats() → { particles, constraints, crush }, dispose() }`. Opcje: `mass`, `stretch`, `bend`, `shape`,
`yieldShape`, `relax`, `yieldStretch`, `stretchLimit`, `yieldBend`, `weld`, `substeps`, `iterations`, `friction`,
`radius`, `gravity`, `worker`.

Ciśnienie powietrza w beczce nie jest liczone.
