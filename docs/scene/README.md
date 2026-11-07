# Silnik sceny (`js/scene/`)

Wspólna część silnika: z niej korzysta edytor sceny (`editor/`), a potem laboratoria i gry. Bez interfejsu: dane,
rejestry i polecenia. Plan całości: [`../guides/engine-architecture.md`](../guides/engine-architecture.md); obsługa
edytora: [`../../editor/README.md`](../../editor/README.md).

| Plik | Co | Three.js |
|---|---|---|
| `scene-data.js` | scena jako dane: format `gamelab-scene`, nowa scena, nowy obiekt, `normalize` (sprawdza dane z pliku i z przeglądarki) | nie |
| `prefabs.js` | prefabrykaty: każdy model z kitów, który da się postawić w scenie | tak (kity) |
| `behaviors.js` | zachowania w scenie: podpięcie zachowań z `js/behaviors/` do prefabrykatów | tak |
| `api.js` | API sceny (dla AI): polecenia JSON na danych sceny | nie |
| `assets.js` | zasoby z nazwą: ustawienia zapisane w laboratorium pod nazwą | nie |
| `space.js` | kosmos: kity ze Space ładowane przy pierwszej potrzebie, gotowe tła nieba | nie (ładuje kity) |

Zasada: **dane są jedynym źródłem prawdy.** Okna edytora, uchwyt, API i pliki zmieniają tylko dane (w edytorze:
`editor/js/core/store.js`); świat 3D je odbija. Zachowania w trakcie gry ruszają modele, ale danych nie zmieniają.

## Scena jako dane (`scene-data.js`)

```json
{
  "format": "gamelab-scene", "version": 1, "name": "Harbour",
  "env": { "surface": "sea", "light": "afternoon", "look": "", "sea": "" },
  "objects": [
    { "id": "o…", "name": "ORP Błyskawica", "prefab": "sea/blyskawica", "pos": [0, 0, 0], "rot": [0, 0, 0], "scale": 1, "behavior": "ship" }
  ]
}
```

- `env.surface`: `sea` | `land` | `space`; `env.sky` (każda powierzchnia): `""` (domyślne) | `"day"` | `"preset:<id>"` | nazwa zasobu „niebo”; `env.light`: `afternoon` | `noon` | `dusk` | `overcast` (oświetlenia sceny bazowej
  `js/labs/shared/stage.js`); `env.look`: profil z laboratorium filtrów albo `""`; `env.sea`: zasób „morze” albo `""`.
- `pos` w metrach (Y w górę), `rot` w stopniach (kolejność YXZ: kurs, pochylenie, przechył), `scale` — mnożnik.
- `behavior` (nieobowiązkowe): id zachowania; bez pola — domyślne dla modelu, `""` — stoi w miejscu.
- Zmiana formatu podnosi `VERSION`, a `normalize` przenosi starsze sceny. Nowe nieobowiązkowe pole (jak `behavior`,
  `env.sea`) wersji nie zmienia.

## Prefabrykaty (`prefabs.js`)

Wpis: `{ id, label, family, surface, lab, build() → { root, kit, dispose } }`.

- `id`: `rodzina/model` (`sea/blyskawica`, `road/polonez`, `tram/swing`, `train/loco`, `air/spitfire`,
  `structures/super300`, `weapons/beryl`…); scena zapisuje tylko to id.
- `family`: grupa na liście (`FAMILIES`, nazwy EN/PL); `surface`: gdzie stoi (`sea`, `land`, `air` — nowy samolot
  stawiany jest 30 m nad powierzchnią).
- `lab`: laboratorium, w którym model się robi („Otwórz w laboratorium”).
- `build()`: `root` — grupa Three.js; `kit` — obiekt zwrócony przez kit (wymiary, linie kadłuba, `update` ruchomych
  części), z niego korzystają zachowania; `dispose` — zwolnienie geometrii.
- Rośliny: `plants/<gatunek>` (PlantKit, `SPECIES`) — jedna roślina gatunku (ziarno 1, wielkość 1), `tick` przesuwa czas
  wiatru; jaskinia: `caves/cave` (CaveKit, `CAVE_DEFAULTS`; budowa ok. sekundy; ściany patrzą do środka — z zewnątrz
  widać wnętrze).
- Nowy model: wpis tutaj (jedna linia na kit); kity ze Space (ShipKit, VehicleKit, MarineKit, BaseKit) ładuje `space.js`.
- Moduły bazy: `base/<moduł>` (BaseKit, `MODULES`: `pad`, `hab`, `solar`, `drill`, `refinery`, `depot`) — gotowe
  (`setProgress(1)`), `tick` — światła i ruchome części.

## Zachowania w scenie (`behaviors.js`)

`BEHAVIORS[id] = { label, labelPl, env, throttle: [min, max], fits(prefabId), keys, keysPl, create(obj, built, world) }`.
`create` zwraca `{ state, step(dt, input, t), hud(), reset() }` albo `null` (model bez potrzebnych danych).

| id | Dla | Zachowanie | Sterowanie (`input`) |
|---|---|---|---|
| `ship` | `sea/*` | „okręt na wodzie” (`js/behaviors/water/ship.js`) na falach sceny bazowej (`world.waves`) | `throttle` −0,4…1, `rudder` −1…1 |
| `craft` | `marine/*` | „mała jednostka na wodzie” (`js/behaviors/water/craft.js`), woda z falami i dno ze sceny bazowej | `throttle` (dźwignia), `rudder` (ster), `elevator` (głębokość nurka) |
| `drive` | `road/*`, `rovers/*` | „jazda po lądzie” (`js/behaviors/land/drive.js`), grunt i woda ze sceny bazowej | `throttle` −1…1 (pedał), `rudder` (skręt) |
| `thrust` | `space/codewing`, `space/scribe`, `space/swarmer` | „ciąg w próżni” (`js/behaviors/space/thrust.js`) | `throttle` −1…1, `elevator` (pochylenie), `aileron` (kurs), `rudder` (przechył) |
| `flight` | `air/*` | „lot w atmosferze” (`js/behaviors/air/flight.js`), krok fizyki 1/240 s, grunt na wysokości 0 | `throttle` 0…1, `elevator`, `aileron`, `rudder`, `brake`, `gear`, `flaps` |

- Okręty: liczby ruchu z `SHIP_NUMBERS` (masa, moc, prędkość maksymalna), reszta z modelu (`shipDef`: długość,
  szerokość, dziób i rufa).
- Samolot: na ziemi (Y < 3 m) startuje z postoju (`info.rest`), w powietrzu — w locie z 60 % prędkości maksymalnej
  i gazem 70 %. Na rozbiegu trzeba trzymać ster wysokości (samolot z kółkiem ogonowym); bez tego się rozbija — to
  wynik sił, nie błąd.
- `behaviorsFor(prefabId)` — pasujące zachowania; `defaultBehavior` — pierwsze pasujące; `behaviorOf(obj)` — zachowanie
  obiektu w grze (pole albo domyślne, tylko pasujące).
- Nowe zachowanie: plik w `js/behaviors/<środowisko>/` (fizyka, bez sceny) i adapter tutaj.

## API sceny (`api.js`)

`createSceneApi({ store, prefabs, behaviorsFor, lights, assets, hooks })` → `{ run(polecenie | lista | tekst JSON), commands }`.
Polecenia (`help`, `describe`, `prefabs`, `assets`, `add`, `set`, `move`, `remove`, `env`, `select`, `new`, `load`,
`play`, `stop`) i przykłady: [`../../editor/README.md`](../../editor/README.md), „API dla AI”.

- Wynik: `{ ok: true, cmd, … }` albo `{ ok: false, cmd, error }` (błąd mówi, co jest dozwolone).
- Sprawdza: model istnieje, zachowanie pasuje do modelu, liczby, oświetlenie, nazwa zasobu; obiekt po `id` albo
  jednoznacznej `name`.
- Lista poleceń to jeden krok cofania (`hooks.group`); w czasie gry polecenia zmieniające scenę są odrzucane.
- `hooks`: `build(fn)` (zmiana, po której trzeba zbudować modele), `group(fn)`, `play()`, `stop()`, `playing()`.

## Zasoby z nazwą (`assets.js`)

Ustawienia zapisane w laboratorium pod nazwą (`localStorage["gameLab.assets.v1"]`, `{ rodzaj: { nazwa: dane } }`);
scena trzyma tylko nazwę. Inna karta widzi zmianę od razu (`onAssetsChange`).

| Rodzaj | Laboratorium | Pola |
|---|---|---|
| `sea` | woda ([`../labs/water.md`](../labs/water.md)) | `Hs`, `Lp`, `chop`, `spread`, `n`, `dir`, `deep`, `scatter`, `shine`, `ripples`, `crest`, `reflect` |
| `land` | ląd ([`../labs/land.md`](../labs/land.md)) | `map` (ustawienia terenu LandKit), `water` (wody i biomy RegionKit) |
| `weather` | wygląd ([`../labs/look.md`](../labs/look.md)) | `weather`, `coverage`, `density`, `scale`, `haze`, `wind`, `rain`, `vis`, `lightning`, `time`, `sunEl`, `sunAz`, `moon` |
| `look` | filtry ([`../labs/filters.md`](../labs/filters.md)) | profil potoku kamery (`LOOK_DEFAULTS` w `js/render/sea/look.js`); dawny klucz `gameLab.lookProfiles.v1` przenosi się sam |
| `sky` | ciała niebieskie ([`../labs/bodies.md`](../labs/bodies.md)), Niebo | wszystkie liczby nieba BodyKit (mgławice, pas, pył, gwiazdy, barwy, ziarno) |

- Funkcje: `listAssets(kind)`, `getAsset(kind, name)`, `saveAsset(kind, name, data)` (tylko pola rodzaju),
  `removeAsset`, `onAssetsChange(f)`.
- Zasoby są w tej przeglądarce: scena z nazwą zasobu, którego tu nie ma, pokazuje ustawienie domyślne i ostrzega.
- Nowy rodzaj: wpis w `ASSET_KINDS` (pola, laboratorium), zapis w laboratorium, wybór w edytorze i w `env` API.

## Kosmos (`space.js`)

Kity ze Space (ShipKit, BodyKit z niebem, SystemKit z gotowymi tłami) są pisane pod globalne THREE, więc ładują się
dopiero, gdy scena ich potrzebuje: `loadSpace()` importuje `js/core/three-global.js`, potem kity po kolei;
`spaceReady()` mówi, czy są. Prefabrykat z `needs: 'space'` czeka na nie (edytor: karta ładowania), powierzchnia
`space` tak samo. Gotowe tła: `skyPresets()` (z `SystemKit.SKIES`); w `env.sky` z przedrostkiem `preset:`.
MarineKit (roboty morskie, rodzina `marine`), VehicleKit (łaziki, rodzina `rovers`) i BaseKit (moduły bazy, rodzina `base`) ładują się razem z kitami ze Space. Statki ShipKit: jednostka = 1 m, dziób obrócony na +Z (`makeGameHolder` w skali 1); `tick(t, dt)` — światła
i silniki na postoju. Liczby ruchu (`SPACE_NUMBERS` w `behaviors.js`) są założone.

## Scena bazowa laboratoriów (`js/labs/shared/stage.js`)

Edytor i laboratoria (filtry, wygląd, ląd, woda, pojazdy: kosmos, woda, ląd) stoją na tej samej scenie: niebo SkyKit, słońce i światło rozproszone,
mgła, morze WaterKit, płaski grunt albo teren LandKit z wodami RegionKit, mapa otoczenia z nieba.

- `createStage(renderer, scene, opts)`; `opts`: `envEvery` (odświeżanie mapy otoczenia, 0,3 s), `skyRadius` (4000 m),
  `seaRadius` (6000 m), `clouds` (dryf chmur [x, y]), `shiftSpeed` (przesuwanie fal, 4 m/s), `fogHeight` (mgła rzednie
  z wysokością kamery).
- Powierzchnia `setSurface`, niebo `setSkyMode`, światło `setLight(id | pogoda)`, morze `setSea(zasób)`, ląd
  `setLand({ map, water })` albo `setWorld(T)` (świat już wygenerowany), kadłub wycięty z wody `setShip`.
- Morze przy terenie zna teren (płycizny, przybój, barwy i prądy wód, lód, olej); fale powtarzają się co rozmiar mapy.
- Kosmos: `setSurface('space')` i `setSkyMode('space')`, odbicia `setSpaceEnvironment` (mapa ShipKit), niebo daje
  strona (ciało nieba BodyKit — edytor, pojazdy · kosmos).
- Laboratorium z własną wodą albo gruntem (woda: warianty A i B; pojazdy · woda: zwykła tafla; pojazdy · ląd: zwykły grunt) wyłącza morze sceny
  (`setSurface('none')`) i bierze z niej tylko niebo, światło i mgłę.
- Klatka: `update(dt, camera)` albo osobno `tick(dt)` (czas, fale, chmury) i `follow(camera)` (niebo i morze za
  kamerą, teren, mgła, mapa otoczenia) — laboratorium z własną kamerą ustawia ją między nimi.
