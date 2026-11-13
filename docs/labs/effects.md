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

Soczewki (czarna dziura, kula cieczy) potrzebują obrazu sceny: `fx.render(renderer, scene, camera, draw)` rysuje
scenę do celu (`draw(target)` — w laboratoriach przez potok kamery `LookPipeline`) i zagina go.

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

Statki ShipKit (Codewing, Scribe, Swarmer) nie mają własnego pocisku ani błysku u lufy: akcja „fire” zgłasza strzał
(`model.onShot({ from, to, dir, color, ship })`, świat), a gospodarz rysuje efekt wybrany dla statku — w laboratorium
pojazdów kosmicznych (pod akcjami: Efekt strzału), w edytorze sceny w oknie Obiekt i w API (pole `shot` obiektu:
id efektu albo nazwa zapisanego efektu; bez pola — strzał). `createEffectLibrary(scene, getAsset)` — jeden EffectKit na
wybór; `shotOptions(kind, strzał)` — jak strzał zamienia się w opcje efektu (lot lufa → cel, ścieżka błyskawicy,
odłamki i czarna dziura u celu). Pojazd z dowolnej gry, efekt z dowolnej gry.

## W laboratorium bloków

Ugryzione bloki stałe sypią odłamki (`debris`) w barwie swojego rodzaju.

## Dla AI — `EffectsApi`

- `EffectsApi.play(kind, { from, to | at, dir | path })` — punkty `[x, y, z]`; bez opcji — jak w laboratorium (A → B).
- `EffectsApi.get(kind)`, `EffectsApi.set(kind, liczby)`, `EffectsApi.scale(s)`.
- `EffectsApi.save(nazwa)`, `load(nazwa)`, `saved()` — zasób `effect`; `counts()`, `clear()`.

## Na później

Dym i kurz w wodzie i na lądzie (mogą być związane z pogodą i wiatrem) — `TODO.md`.
