# Laboratorium drzewek (`labs/trees.html`)

Drzewko ulepszeń albo badań gry jako **dane**, dla dowolnej gry: gałęzie z kolorami, węzły wyrastające z rodziców
(którykolwiek albo wszyscy), koszt, efekt (statystyki gry, które się sumują), teksty po angielsku i po polsku.
Widok promienisty w pixel arcie: drzewko rośnie w górę od rdzenia, pierścienie za nim to poziomy.

Materiał przeniesiony **z historią** z Hive Hunger: dane i stan gracza (`js/core/SkillTree.js` → `js/gameui/tree/tree.js`),
widok (`js/ui/TreeView.js` → `js/gameui/tree/radial.js`), edytor drzewka (`tools/tree-editor.html` →
`js/labs/trees/trees.js`). Przerobione na format ogólny; drzewko Hive Hunger jest przykładem
(`js/gameui/tree/samples/hive-hunger.js`).

## Silnik (`js/gameui/tree/`)

| Plik | Co |
|---|---|
| `tree.js` | TreeKit: format `gamelab-tree`, `emptyTree`, `normalizeTree`, `TreeState` (kupione, `state`, `canBuy`, `buy`, `effects`, `toJSON`, `load`), `checkTree`, `treeStats`; bez Three.js i DOM |
| `radial.js` | `RadialView(root, { getTree, getState, getPoints, onBuy, onPick, pl, pointsName, editing })` — płótno w pikselach sztuki, rozmiar z elementu `root`, podpowiedź `.tree-tip`, `polar(e)` i `place(depth, angle)` dla edytora; ikony 8 × 8 `ICONS` |
| `samples/hive-hunger.js` | drzewko Hive Hunger (58 węzłów, 20 gałęzi) |

## Format (`gamelab-tree`)

```json
{ "format": "gamelab-tree", "version": 1, "name": "Hive Hunger", "background": "",
  "points": { "label": "points", "labelPl": "punkty" },
  "branches": { "core": { "label": "Hive", "labelPl": "", "color": "#ffd65c" }, "units": { "label": "Units", "color": "#78ff8c" } },
  "nodes": [
    { "id": "core", "name": "Hive core", "kind": "core", "branch": "core", "parents": [], "depth": 0, "angle": 0, "icon": "core" },
    { "id": "units1", "name": "Brood I", "kind": "trait", "branch": "units", "parents": ["core"], "depth": 1, "angle": -62,
      "cost": 40, "effect": { "count": 10 }, "text": "+10 units", "icon": "units" } ],
  "notes": "" }
```

- `kind`: `core` (kupiony od początku), `trait` (cecha całości — romb), `unit` (jednostka, budowla — sześciokąt),
  `prop` (cecha jednostki — kółko).
- `parents` + `all`: wystarczy którykolwiek rodzic, z `all: true` — wszyscy. Na widoku: połączenie między gałęziami
  przerywane („którykolwiek”) albo ciągłe („wszyscy”).
- `depth` (pierścień, ułamki dozwolone) i `angle` (stopnie od pionu, −110 … 110) — położenie.
- `effect`: `{ klucz: liczba | true }` — klucze to statystyki gry (w planie: system statystyk), liczby się sumują
  (`TreeState.effects()`).
- `soon`: widoczny, jeszcze nie do kupienia. `color`: własny kolor węzła (bez — kolor gałęzi). `note`: notatka
  projektanta. `namePl`, `textPl`, `labelPl`: polskie teksty (puste — angielskie).
- `background`: nazwa obrazu tła (etap 2: z laboratorium sztuki); na razie tylko zapisana.

## Laboratorium

- Pasek: drzewko (przykłady i zapisane), tryb **Edycja | Próba**, w edycji narzędzia **Wybierz** (kliknięcie wybiera,
  przeciąganie przesuwa: poziom co 0,1, kąt co 1°), **Dodaj** (nowy węzeł wybranego rodzaju rośnie z wybranego),
  **Połącz** (rodzic, potem dziecko; ta sama para jeszcze raz usuwa połączenie). Delete usuwa węzeł (dwa razy), Esc —
  z powrotem do Wybierz.
- Okna: **Drzewko** (nazwa, zapis jako zasób, nowe puste, nazwa punktów EN/PL, tło, notatki, eksport i import JSON),
  **Węzeł** (wszystkie pola węzła; zmiana id poprawia rodziców), **Próba** (punkty, kupowanie kliknięciem, zsumowane
  efekty, liczby drzewka: koszt całości, najdłuższa i najdroższa droga od rdzenia), **Sprawdzenie** (kliknięcie
  wybiera węzeł; węzły z problemem migają na czerwono), **Gałęzie** (kolor, nazwy EN/PL, nowa gałąź, usuwanie
  nieużywanej).
- Sprawdzenie (`checkTree`): `duplicate-id`, `missing-parent`, `no-parent`, `self-parent`, `cycle` (błędy);
  `no-text`, `no-effect` (do kupienia, a nic nie robi), `unknown-branch`, `unreachable` (każda droga przez węzeł
  „wkrótce” albo nieosiągalny) — ostrzeżenia; `free` — informacja.
- Zapis pracy: `localStorage['gamelab.trees']`; zapisane drzewka: zasób z nazwą `tree` (`js/scene/assets.js`).

## Dla AI

`TreeApi` w konsoli (zakładka API): `get()`, `load(drzewko | "nazwa")`, `check()`, `stats()`, `points(n)`,
`buy("id")`, `effects()`, `reset()`, `mode("edit" | "trial")`, `save("nazwa")`, `saved()`, `samples()`.

## Dalej (etap 2, `TODO.md`)

Widok „płytka drukowana” z badań Space z jego dwoma drzewkami; drzewko jako okno w UI gry i w API sceny; tło z obrazu
laboratorium sztuki.
