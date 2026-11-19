# Laboratorium drzewek (`labs/trees.html`)

Drzewko ulepszeń albo badań gry jako **dane**, dla dowolnej gry: gałęzie z kolorami, węzły wyrastające z rodziców
(którykolwiek albo wszyscy), koszt i poziomy (każdy droższy), efekt (statystyki gry, które się sumują), teksty po
angielsku i po polsku. Dwa widoki: **promienisty w pixel arcie** (z Hive Hunger — drzewko rośnie w górę od rdzenia,
pierścienie to poziomy) i **płytka drukowana** (z okna Badania Space — ścieżki miedzi nad horyzontem planety). Tło —
obraz z laboratorium sztuki. Gra pokazuje drzewko jako okno UI gry.

Materiał przeniesiony **z historią**:

- z Hive Hunger: dane i stan gracza (`js/core/SkillTree.js` → `js/gameui/tree/tree.js`), widok (`js/ui/TreeView.js` →
  `js/gameui/tree/radial.js`), edytor drzewka (`tools/tree-editor.html` → `js/labs/trees/trees.js`);
- ze Space: widok okna Badania (`js/ui/windows/techTree.js` → `js/gameui/tree/pcb.js`), jego dwa drzewka
  (`techTreeData.js` → `samples/space.js`), style (`css/ui/windows/research.css` → `js/gameui/css/tree.css`) i tło
  (`researchBg.jpg` → `js/gameui/tree/img/research-bg.jpg`).

Wszystko przerobione na format ogólny; drzewka obu gier są przykładami.

## Silnik (`js/gameui/tree/`)

| Plik | Co |
|---|---|
| `tree.js` | TreeKit: format `gamelab-tree`, `KINDS`, `VIEWS`, `emptyTree`, `normalizeTree`, `TreeState` (`level`, `state`, `costOf`, `canBuy`, `buy`, `effects`, `toJSON`, `load`), `checkTree`, `treeStats`; bez Three.js i DOM |
| `radial.js` | `RadialView(root, opts)` — płótno w pikselach sztuki, rozmiar z elementu `root`, podpowiedź `.tree-tip`; ikony 8 × 8 `ICONS` |
| `pcb.js` | `PcbView(root, opts)` — jedno SVG (bez innerHTML i atrybutów style), podpowiedź `.pcb-tip`; ikony 24 × 24 `ICONS` |
| `background.js` | `treeBackground(nazwa)` → adres obrazu (zasób `image` malowany przez ArtKit, raz na opis), `backgroundWatcher` |
| `samples/` | `index.js` (`TREE_SAMPLES`), `hive-hunger.js` (58 węzłów, 20 gałęzi), `space.js` (`SPACE_SWARM`, `SPACE_CODE`) |
| `../css/tree.css` | wygląd obu widoków i okna drzewka w UI gry (linkują go laboratorium drzewek i `gameui.css`) |

Wspólny interfejs widoków: `opts = { getTree, getState, getPoints, onBuy, onPick, pl, pointsName, editing, getBackground }`;
`layout()`, `place(depth, angle)`, `polar(e)`, `nodeAt(e)`, `pos`, `selected`, `marked`, `tip`, `canvas`, `destroy()`.

## Format (`gamelab-tree`)

```json
{ "format": "gamelab-tree", "version": 1, "name": "Space — swarm", "view": "pcb", "background": "",
  "points": { "label": "pts", "labelPl": "pkt" },
  "branches": { "core": { "label": "SWARM", "labelPl": "RÓJ", "color": "#ffd98f" } },
  "nodes": [
    { "id": "core", "name": "SWARM", "kind": "core", "branch": "core", "parents": [], "depth": 0, "angle": 0, "icon": "core" },
    { "id": "hubSwarm", "name": "The swarm", "kind": "hub", "branch": "hubSwarm", "parents": ["core"], "depth": 1, "angle": 80 },
    { "id": "fleet", "name": "Swarm size", "kind": "trait", "branch": "hubSwarm", "parents": ["hubSwarm"], "depth": 2,
      "angle": 80, "cost": 90, "levels": 20, "growth": 1.7, "effect": { "fleet": 1 }, "text": "One more ship…" } ],
  "notes": "" }
```

- `view`: `radial` (pixel art) | `pcb` (płytka) — jak gra pokazuje drzewko.
- `kind`: `core` (kupiony od początku), `hub` (rozgałęzienie: nie kupowane, otwarte, gdy otwarty rodzic), `trait`
  (cecha całości — romb), `unit` (jednostka, budowla — sześciokąt), `prop` (cecha jednostki — kółko).
- `parents` + `all`: wystarczy którykolwiek rodzic, z `all: true` — wszyscy. W widoku promienistym połączenie między
  gałęziami przerywane („którykolwiek”) albo ciągłe („wszyscy”).
- `depth` (pierścień, ułamki dozwolone) i `angle` (stopnie od pionu, −110 … 110) — położenie w obu widokach. Płytka:
  pierścienie jak w Space (205, 365, 470, dalej co 105), drzewko głębsze niż 3 ściska się do widoku.
- `cost`, `levels`, `growth`: koszt poziomu L = round(cost · growth^L) (jak ulepszenia Space); `levels: 1` — kupowany raz.
- `effect`: `{ klucz: liczba | true }` na poziom — klucze to statystyki gry (w planie: system statystyk); suma po
  poziomach: `TreeState.effects()`.
- `soon`: widoczny, jeszcze nie do kupienia. `color`: własny kolor węzła (bez — kolor gałęzi). `note`: notatka
  projektanta. `namePl`, `textPl`, `labelPl`: polskie teksty (puste — angielskie). `icon`: nazwa z `ICONS` widoku
  (ikona tylko z jednego zestawu — w drugim widoku węzeł bez ikony).
- `background`: nazwa obrazu (zasób `image` z laboratorium sztuki); bez niej — tło widoku (płytka: horyzont planety).

Stan gracza: `{ levels: { id: poziom }, spent }` (`TreeState.toJSON()` / `load()`; dawne `{ owned: [id] }` też się wczyta).

## Laboratorium

- Pasek: drzewko (przykłady i zapisane), widok (zapisywany z drzewkiem), tryb **Edycja | Próba**, w edycji narzędzia
  **Wybierz** (kliknięcie wybiera, przeciąganie przesuwa: poziom co 0,1, kąt co 1°), **Dodaj** (nowy węzeł wybranego
  rodzaju rośnie z wybranego), **Połącz** (rodzic, potem dziecko; ta sama para jeszcze raz usuwa połączenie). Delete
  usuwa węzeł (dwa razy), Esc — z powrotem do Wybierz.
- Okna: **Drzewko** (nazwa, zapis jako zasób, nowe puste, nazwa punktów EN/PL, tło z listy obrazów, notatki, eksport
  i import JSON), **Węzeł** (wszystkie pola; poziomy i wzrost kosztu; zmiana id poprawia rodziców), **Próba** (punkty,
  kupowanie kliknięciem, zsumowane efekty, liczby drzewka: koszt wszystkich poziomów, najdłuższa i najdroższa droga od
  rdzenia), **Sprawdzenie** (kliknięcie wybiera węzeł; węzły z problemem oznaczone na czerwono), **Gałęzie** (kolor,
  nazwy EN/PL, nowa gałąź, usuwanie nieużywanej).
- W edycji widok pokazuje drzewko „wszystko kupione” (kolory gałęzi), a podpowiedź — poziom, kąt, rodzaj i notatkę.
- Sprawdzenie (`checkTree`): `duplicate-id`, `missing-parent`, `no-parent`, `self-parent`, `cycle` (błędy);
  `no-text`, `no-effect` (do kupienia, a nic nie robi), `unknown-branch`, `unreachable` (każda droga przez węzeł
  „wkrótce” albo nieosiągalny) — ostrzeżenia; `free`, `hub-cost` — informacje.
- Zapis pracy: `localStorage['gamelab.trees']`; zapisane drzewka: zasób z nazwą `tree` (`js/scene/assets.js`).

## W UI gry

Blok okna `{ type: 'tree', tree: 'nazwa', points: 'ścieżka' }` (`js/gameui/gameui.js`): drzewko z zasobu `tree` albo
przykład o tej nazwie, w widoku z pola `view`; kliknięcie kupuje za punkty ze stanu gry (odejmuje je) i zgłasza akcję
`buy` z `{ tree, id, level, cost, effects }`. `ui.tree(nazwa)` — `TreeState` (do zapisu gry), `ui.buy(nazwa, węzeł)`.
Przykład: okno **Research** (klawisz R) w „Space command” laboratorium UI gry. Opis UI gry:
[gameui.md](gameui.md).

## Dla AI

`TreeApi` w konsoli (zakładka API): `get()`, `load(drzewko | "nazwa")`, `check()`, `stats()`, `points(n)`,
`buy("id")` (następny poziom), `effects()`, `reset()`, `mode("edit" | "trial")`, `view("radial" | "pcb")`,
`background("obraz")`, `save("nazwa")`, `saved()`, `samples()`. W laboratorium UI gry: `GameUIApi.tree(nazwa)`,
`GameUIApi.buy(nazwa, węzeł)`.
