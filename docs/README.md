# GameLaboratory — dokumentacja

Mapa dokumentacji. Zasady pracy: [`../CLAUDE.md`](../CLAUDE.md); zmiany: [`../CHANGELOG.md`](../CHANGELOG.md);
UI (paski, okna, konsola, karta ładowania, style): [`../ui/README.md`](../ui/README.md).

Układ folderów jest taki sam jak w kodzie:

| Folder | Co w nim jest | Kod |
|---|---|---|
| `labs/` | jeden dokument na laboratorium | `labs/*.html`, `js/labs/<lab>/` |
| `models/` | modele używane przez kilka laboratoriów | `js/models/` |
| `scene/` | silnik sceny: scena jako dane, prefabrykaty, zachowania w scenie, API dla AI, zasoby z nazwą, lekarz sceny | `js/scene/` |
| `behaviors/` | zachowania (napęd i ruch modeli w środowiskach) | `js/behaviors/` |
| `tools/` | narzędzia | `tools/` |
| `guides/` | jak korzystać z laboratoriów, renderowanie, znane pułapki | — |
| `history/` | historia sprzed przeniesienia i wykonany remanent | — |

## Silnik i edytor sceny

| Co | Dokument |
|---|---|
| Plan silnika (schemat, rola edytora, kolejność) | [guides/engine-architecture.md](guides/engine-architecture.md) |
| Rozbiór laboratoriów: co z każdego idzie do modeli, zachowań, środowisk i zasobów | [guides/lab-breakdown.md](guides/lab-breakdown.md) |
| Edytor sceny („Warsztat”, `editor/index.html`): obsługa, budowa, format sceny, API dla AI | [../editor/README.md](../editor/README.md), zmiany: [../editor/CHANGELOG.md](../editor/CHANGELOG.md) |
| Silnik sceny (`js/scene/`) | [scene/README.md](scene/README.md) |
| Lekarz sceny (`js/scene/doctor.js`) | [scene/doctor.md](scene/doctor.md) |
| Zachowania (`js/behaviors/`): okręt i mała jednostka na wodzie, jazda po lądzie, lądowanie, lot, koło na szynie, ciąg w próżni, orbita, ciecze i gaz w kosmosie | [behaviors/README.md](behaviors/README.md) |

## Laboratoria

W kolejności kategorii z menu Narzędzia i strony startowej (`ui/data/catalog.js`, `cat`); grupy (`group`) — w nawiasie.

| Kategoria | Laboratorium | Strona | Dokument |
|---|---|---|---|
| Pojazdy | Pojazdy — kosmos (statki, dron, stacja) *(grupa pojazdów)* | `labs/vehicles-space.html` | [labs/vehicles-space.md](labs/vehicles-space.md) |
| | Pojazdy — woda (ORP Błyskawica, ORP Orzeł, roboty morskie) | `labs/vehicles-water.html` | [models/ships-sea/blyskawica.md](models/ships-sea/blyskawica.md), [models/ships-sea/orzel.md](models/ships-sea/orzel.md), [models/marine.md](models/marine.md) |
| | Pojazdy — ląd (łaziki, amfibia, pociąg, pojazdy drogowe, tramwaj, samolot) | `labs/vehicles-land.html` | [labs/vehicles-land.md](labs/vehicles-land.md), [models/train/fizyka.md](models/train/fizyka.md), [models/train/grafika.md](models/train/grafika.md), [models/road/README.md](models/road/README.md), [models/train/swing.md](models/train/swing.md), [models/air/spitfire.md](models/air/spitfire.md) |
| Kosmos | Ciała niebieskie *(grupa kosmosu)* | `labs/bodies.html` | [labs/bodies.md](labs/bodies.md) |
| | Układy *(grupa kosmosu)* | `labs/systems.html` | [labs/systems.md](labs/systems.md) |
| | Skala *(grupa kosmosu)* | `labs/scale.html` | [labs/scale.md](labs/scale.md) |
| | Powierzchnia, budynki | `labs/surface.html`, `labs/buildings.html` | [labs/surface.md](labs/surface.md) |
| Świat | Woda | `labs/water.html` | [labs/water.md](labs/water.md) |
| | Ląd *(grupa terenu)* | `labs/land.html` | [labs/land.md](labs/land.md) |
| | Jaskinie *(grupa terenu; jaskinia jako obiekt albo teren planszy — podziemie)* | `labs/caves.html` | [labs/caves.md](labs/caves.md) |
| | Wygląd | `labs/look.html` | [labs/look.md](labs/look.md) |
| | Filtry | `labs/filters.html` | [labs/filters.md](labs/filters.md) |
| | Budowle | `labs/structures.html` | [labs/structures.md](labs/structures.md), [labs/structures/coastal.md](labs/structures/coastal.md), [labs/structures/super300.md](labs/structures/super300.md) |
| | Rośliny | `labs/plants.html` | [labs/plants.md](labs/plants.md) |
| Życie i postacie | Życie, edytor stworów | `labs/life.html`, `labs/creator.html` | [labs/life.md](labs/life.md) |
| | Człowiek | `labs/human.html` | [labs/human.md](labs/human.md) |
| | Przedmioty bohatera | `labs/gear.html` | [labs/gear.md](labs/gear.md) |
| | Kostnica SDF | `labs/morgue.html` | [labs/morgue.md](labs/morgue.md) |
| | SDF Walkers | `labs/walkers.html` | [labs/walkers/README.md](labs/walkers/README.md), [labs/walkers/roadmap.md](labs/walkers/roadmap.md), [labs/walkers/notatki/](labs/walkers/notatki/README.md) |
| Materiały i grafika | Materiały (MatKit: PBR, starzenie) | `labs/materials.html`, `js/render/materials/` | [labs/materials.md](labs/materials.md) |
| | Sztuka (obrazy 2D, ekspertyza) | `labs/art.html`, `js/render/art/` | [labs/art.md](labs/art.md) (obiekty: [labs/art/](labs/art/)) |
| | Pixel Studio | `labs/pixel.html` | [labs/pixel/README.md](labs/pixel/README.md) |
| | Generator zombie | `labs/zombies.html` | [labs/zombies.md](labs/zombies.md) |
| Woksele | Bloki (BlockKit: bryły z wokseli, ciecze i gaz) | `labs/blocks.html`, `js/models/blocks/` | [labs/blocks.md](labs/blocks.md) |
| Efekty | Efekty (EffectKit: 22 efekty z odznakami — strzały, plazma, odłamki, błyskawice, czarne dziury, promienie, pola, skok, tunel, fala skanu, dym, iskry, wybuch, spalenizna, ognik) | `labs/effects.html`, `js/render/effects/` | [labs/effects.md](labs/effects.md) |
| UI i dźwięk | UI gry (menu, HUD, okna, dialogi, skórki) | `labs/gameui.html`, `js/gameui/` | [labs/gameui.md](labs/gameui.md) |
| UI i dźwięk | drzewka ulepszeń i badań (format `gamelab-tree`, widok promienisty, próba, sprawdzanie) | `labs/trees.html`, `js/gameui/tree/` | [labs/trees.md](labs/trees.md) |
| | Skórki | `labs/skins.html` | [labs/skins.md](labs/skins.md) |
| | Dźwięk | `labs/sound.html` | [labs/sound.md](labs/sound.md) |
| AI | Laboratorium języka, laboratorium obrazów | `labs/lang.html`, `labs/img.html` | [labs/walkers/README.md](labs/walkers/README.md) (wspólny dokument z SDF Walkers) |

## Narzędzia

| Narzędzie | Strona | Dokument |
|---|---|---|
| Lekarz sceny | `editor/index.html?doctor` | [scene/doctor.md](scene/doctor.md) |
| Transformator (poziomy szczegółów, strefy trafień) | `labs/transform.html` | [labs/transform.md](labs/transform.md) |
| Doktor modeli | `tools/doctor.html` | [tools/doctor.md](tools/doctor.md) (broń ręczna: [models/weapons/README.md](models/weapons/README.md)) |
| Kontrola kitów | `tools/kitcheck.html` | sprawdza modele kitów Space z wzorcem `tools/kitcheck.golden.json` |
| Sprawdzenia (przy każdym wypchnięciu) | `tools/paths.py`, `tools/sitemap.py` | [../CLAUDE.md](../CLAUDE.md), „Strona startowa” |

## Przewodniki

- Jak korzystać z laboratoriów z Battle: [guides/using-the-labs.md](guides/using-the-labs.md)
- Renderowanie modeli ShipKit i BodyKit, niebo: [guides/rendering.md](guides/rendering.md)
- Znane pułapki: [guides/gotchas.md](guides/gotchas.md)
- Silnik — schemat i plan (scena w środku, moduły, co już mamy): [guides/engine-architecture.md](guides/engine-architecture.md)
- Edytor sceny („Warsztat”): [../editor/README.md](../editor/README.md)

## Historia

- Laboratoria Space sprzed przeniesienia: [history/space-labs.md](history/space-labs.md)
- Mapa laboratoriów z Battle (październik 2026): [history/labs-sea-map.md](history/labs-sea-map.md)
- Doktor: [history/doctor-space.md](history/doctor-space.md), [history/doctor-sea.md](history/doctor-sea.md)
- SDF Walkers (NeuroLabPA): [history/walkers.md](history/walkers.md)
- Remanent kodu i dokumentacji (listopad 2026, wykonany): [history/audit-2026-11.md](history/audit-2026-11.md)
