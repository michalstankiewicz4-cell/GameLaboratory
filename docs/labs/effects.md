# Laboratorium efektów (`labs/effects.html`)

Efekty z Hive Hunger (przeniesione z historią, 0.67.0) w kosmosie, bez grawitacji. Kit: **EffectKit**
(`js/render/effects/effects.js`) — wspólne wejście do siedmiu efektów z gry (`js/render/effects/`: `shots.js`,
`orbs.js`, `debris.js`, `lightning.js`, `zaps.js`, `bubbles.js`, `black-holes.js`, tekstury `textures.js`; obliczenia
bez zmian, liczby na klatkę 60 Hz). Strona `js/labs/effects/effects.js`, arkusz `ui/pages/effects.css`; kategoria
w menu i na stronie startowej: **Efekty**.

| Efekt | Id | Gdzie gra | Co robi |
|---|---|---|---|
| Strzał | `shot` | `from` → `to` | jasna smuga z kulistą falą uderzeniową z przodu, przyspiesza w locie, błysk u celu |
| Kula plazmy | `orb` | `from` → `to` | pulsująca poświata, ognisty ogon iskier, wybuch z błyskiem u celu |
| Odłamki | `debris` | `at`, `dir` | chmura punktów wyrzucona z `at` w stronę `dir`, gasnąca |
| Błyskawica | `bolt` | `path` | postrzępiony rdzeń z poświatą stałej szerokości na ekranie |
| Piorun łańcuchowy | `zap` | `path` | skacze od punktu do punktu, z odgałęzieniami i płynącą energią |
| Kula cieczy | `bubble` | `from` → `to` | drgająca kropla, która zagina obraz jak soczewka; rozbryzg u celu |
| Czarna dziura | `hole` | `at` | rośnie, trwa, maleje; zagina obraz wokół siebie (pierścień Einsteina), wciąga odłamki |
| Laser | `laser` | `from` → `to` | czerwony pas z białym rdzeniem i blaskiem u celu (statki laserowe) |
| Promień przebijacza | `piercer` | `from` → `to` | pomarańczowy pas, wokół niego spiralna żółta błyskawica |
| Błyskawica burzy | `storm` | `from` → `to` | rozwidla się przed celem na trzy: do celu i dwie słabsze obok (`side`) |
| Promień ściągający | `tow` | `from` → `to` | zielony wachlarz światła do obrysu holowanej bryły (`size`), smugi |
| Promień tnący | `cutter` | `from` → `to` | płaski promień: dwa czerwone promienie na krawędziach i mgiełka, cięcie w poprzek (`width`) |
| Pole siłowe | `field` | `at` | kula ośmiokątnych komórek w różach, obraca się, mieni |
| Skok w nadprzestrzeń | `warp` | `from`, `dir` | punkt rozpędza się i znika, zostaje smuga w błękitach |
| Znacznik | `marker` | `at` | pulsujący pierścień z kropką, gaśnie |
| Tunel podprzestrzenny | `portal` | `at` | wir otwiera się w lejek smug światła z jasnym rdzeniem i zamyka |
| Fala skanu | `scan` | `at`, `radius` | rosnąca powłoka z jasnym brzegiem i liniami (z ShipKit) |
| Dym | `smoke` | `at`, `dir` | miękkie szare kłęby, unoszą się i rozchodzą (`frames` — jak długo dymi) |
| Iskry | `sparks` | `at`, `dir`, `n` | seria krótkich jasnych iskier z oporem |
| Wybuch | `explosion` | `at`, `radius` | błysk i kule ognia (1.4 s) |
| Spalenizna | `scorch` | `at`, `dir` (normalna) | ciemny poszarpany ślad na powierzchni |
| Ognik | `ember` | `at`, `dir` | migoczący pomarańczowy ognik na powierzchni |

Efekty z gry dzielą się tak, jak je gra wywoływała: z `effects/` (strzały, odłamki, błyskawice, soczewki) i z roju
(`beams.js`, `tows.js`, `cutters.js`, `fields.js`, `warp.js` — w grze metody `Swarm3D` na tablicach statków; tu podaje im
je gospodarz `swarm-fx.js`: każdy grany efekt to jeden „statek”, `frames` — jak długo trwa). Znacznik (`marker.js`)
i tunel (`portal.js`) — ze sceny gry; fala skanu (`scan.js`) — z ShipKit. Wiertło wiertnicy zostaje przy modelu statku.

Soczewki (czarna dziura, kula cieczy) potrzebują obrazu sceny: `fx.render(renderer, scene, camera, draw)` rysuje
scenę do celu (`draw(target)` — w laboratoriach przez potok kamery `LookPipeline`) i zagina go.

## Odznaki

Każdy efekt ma odznaki (`FX_BADGES`, pole `badges` w `FX_KINDS`) — mogą się pokrywać:

| Odznaka | Znaczy | Efekty |
|---|---|---|
| **Lot** (`flight`) | z punktu do punktu (`from` → `to`, ścieżka) | strzał, kula plazmy, kula cieczy, błyskawica, piorun łańcuchowy, laser, przebijacz, burza, holowanie, cięcie, skok |
| **W miejscu** (`spot`) | w jednym punkcie (`at`) | odłamki, czarna dziura, pole siłowe, znacznik, tunel, fala skanu |
| **Punktowy** (`point`) | punkt, linia, mała rzecz | strzał, kula plazmy, kula cieczy, błyskawica, piorun łańcuchowy, laser, przebijacz, burza, skok, znacznik, tunel |
| **Obszarowy** (`area`) | chmura, pole, fala, rozwidlenie, wachlarz, płaszczyzna | kula plazmy (wybuch), kula cieczy (rozbryzg), odłamki, czarna dziura, burza, holowanie, cięcie, pole siłowe, tunel, fala skanu |

W laboratorium okno **Efekty**: lista z odznakami; kliknięte odznaki u góry filtrują (efekty z wszystkimi wybranymi).
Dla AI: `EffectsApi.find('flight', 'area')` → efekty z tymi odznakami.

## Laboratorium

Na pasku: efekt, Graj (albo spacja), Powtarzaj, Wyczyść. Znaczniki: A (skąd, niebieski) i B (dokąd, pomarańczowy);
w tle bryła z bloków — na niej widać soczewki. Okno **Efekt**: skala (metry na jednostkę efektu; w Hive Hunger blok
ma 0.5), każda liczba efektu na suwaku (barwy — wybór koloru), „Wróć do domyślnych”, zapis pod nazwą.

## Zapis pod nazwą — efekt dla sceny

Zasób `effect` (`js/scene/assets.js`): `{ kind, scale, values }`. W edytorze sceny polecenie API:

```json
{ "cmd": "effect", "effect": "orb", "from": [-20, 5, 0], "to": "Rock" }
```

`effect` — id efektu albo nazwa zapisanego efektu; punkty — `[x, y, z]` w metrach albo obiekt sceny (id lub nazwa:
jego położenie teraz, w grze tam, gdzie go niesie zachowanie). Polecenie wysyła zdarzenie `effect` na szynę
(`js/core/events.js`), a świat edytora je rysuje (jeden EffectKit na zapisany efekt, stały krok 1/60 s).

## Strzały statków

Statki ShipKit (Codewing, Scribe, Swarmer) nie mają własnego pocisku ani błysku u lufy (rozbłysk oka Scribe zostaje —
to część statku), a wszystkie z Haven nie mają własnej fali skanu: akcja „scan” zgłasza skan
(`model.onScan({ at, radius, color, ship })`), a gospodarz rysuje falę skanu z laboratorium efektów. Strzały: akcja „fire” zgłasza strzał
(`model.onShot({ from, to, dir, color, ship })`, świat), a gospodarz rysuje efekt wybrany dla statku — w laboratorium
pojazdów kosmicznych (pod akcjami: Efekt strzału), w edytorze sceny w oknie Obiekt i w API (pole `shot` obiektu:
id efektu albo nazwa zapisanego efektu; bez pola — strzał). `createEffectLibrary(scene, getAsset)` — jeden EffectKit na
wybór; `shotOptions(kind, strzał)` — jak strzał zamienia się w opcje efektu (lot lufa → cel, ścieżka błyskawicy,
odłamki i czarna dziura u celu). Pojazd z dowolnej gry, efekt z dowolnej gry.

## Uszkodzenia statków

Dym, iskry, ogniki, spalenizna, błysk i kule ognia przy uszkodzeniu i zniszczeniu statku ShipKit to efekty z
laboratorium efektów (`js/render/effects/damage.js`, `DamageFx`). Statek zostawia u siebie miejsca uszkodzeń —
kotwice na częściach, które lecą razem z odłamkami — oraz łamanie i odpadanie części (to sam model, nie efekt).
`model.damageView()` → `{ sites: [{ anchor, on, ember, size }], damage, particles }`, `model.onDamage({ type:
"sparks", at, dir, n } | { type: "blast", at, radius })`; `shipDamage(model, fx)` je podpina (laboratorium pojazdów,
edytor sceny). Fala uderzeniowa zniszczenia — przez `model.onScan` (pomarańczowa fala).

## W laboratorium bloków

Ugryzione bloki stałe sypią odłamki (`debris`) w barwie swojego rodzaju.

## Dla AI — `EffectsApi`

- `EffectsApi.play(kind, { from, to | at, dir | path })` — punkty `[x, y, z]`; bez opcji — jak w laboratorium (A → B).
- `EffectsApi.get(kind)`, `EffectsApi.set(kind, liczby)`, `EffectsApi.scale(s)`.
- `EffectsApi.save(nazwa)`, `load(nazwa)`, `saved()` — zasób `effect`; `counts()`, `clear()`.

## Na później

Dym i kurz w wodzie i na lądzie (mogą być związane z pogodą i wiatrem) — `TODO.md`.
