# GameLaboratory — dokumentacja

Mapa dokumentacji. Zasady pracy: [`../CLAUDE.md`](../CLAUDE.md); zmiany: [`../CHANGELOG.md`](../CHANGELOG.md);
UI (paski, okna, konsola, karta ładowania, style): [`../ui/README.md`](../ui/README.md).

Układ folderów jest taki sam jak w kodzie:

| Folder | Co w nim jest | Kod |
|---|---|---|
| `labs/` | jeden dokument na laboratorium | `labs/*.html`, `js/labs/<lab>/` |
| `models/` | modele używane przez kilka laboratoriów | `js/models/` |
| `tools/` | narzędzia | `tools/` |
| `guides/` | jak korzystać z laboratoriów, renderowanie, znane pułapki | — |
| `history/` | historia sprzed przeniesienia i wykonany remanent | — |

## Laboratoria

| Laboratorium | Strona | Dokument |
|---|---|---|
| Pojazdy — kosmos (statki, dron, stacja) | `labs/vehicles-space.html` | [labs/vehicles-space.md](labs/vehicles-space.md) |
| Pojazdy — woda (ORP Błyskawica, ORP Orzeł, roboty morskie) | `labs/vehicles-water.html` | [models/ships-sea/blyskawica.md](models/ships-sea/blyskawica.md), [models/ships-sea/orzel.md](models/ships-sea/orzel.md), [models/marine.md](models/marine.md) |
| Pojazdy — ląd (łaziki, amfibia, pociąg, pojazdy drogowe, tramwaj, samolot) | `labs/vehicles-land.html` | [labs/vehicles-land.md](labs/vehicles-land.md), [models/train/fizyka.md](models/train/fizyka.md), [models/train/grafika.md](models/train/grafika.md), [models/road/README.md](models/road/README.md), [models/train/swing.md](models/train/swing.md), [models/air/spitfire.md](models/air/spitfire.md) |
| Ciała niebieskie | `labs/bodies.html` | [labs/bodies.md](labs/bodies.md) |
| Układy | `labs/systems.html` | [labs/systems.md](labs/systems.md) |
| Skala | `labs/scale.html` | [labs/scale.md](labs/scale.md) |
| Skórki | `labs/skins.html` | [labs/skins.md](labs/skins.md) |
| Powierzchnia, budynki | `labs/surface.html`, `labs/buildings.html` | [labs/surface.md](labs/surface.md) |
| Dźwięk | `labs/sound.html` | [labs/sound.md](labs/sound.md) |
| Życie, edytor stworów | `labs/life.html`, `labs/creator.html` | [labs/life.md](labs/life.md) |
| Człowiek | `labs/human.html` | [labs/human.md](labs/human.md) |
| Jaskinie | `labs/caves.html` | [labs/caves.md](labs/caves.md) |
| Przedmioty bohatera | `labs/gear.html` | [labs/gear.md](labs/gear.md) |
| Budowle | `labs/structures.html` | [labs/structures.md](labs/structures.md), [labs/structures/coastal.md](labs/structures/coastal.md), [labs/structures/super300.md](labs/structures/super300.md) |
| Woda | `labs/water.html` | [labs/water.md](labs/water.md) |
| Ląd | `labs/land.html` | [labs/land.md](labs/land.md) |
| Rośliny | `labs/plants.html` | [labs/plants.md](labs/plants.md) |
| Wygląd | `labs/look.html` | [labs/look.md](labs/look.md) |
| Filtry | `labs/filters.html` | [labs/filters.md](labs/filters.md) |
| Transformator | `labs/transform.html` | [labs/transform.md](labs/transform.md) |
| Pixel Studio, generator zombie | `labs/pixel.html`, `labs/zombies.html` | [labs/pixel/README.md](labs/pixel/README.md), [labs/pixel/zombies.md](labs/pixel/zombies.md) |
| Kostnica SDF | `labs/morgue.html` | [labs/morgue.md](labs/morgue.md) |
| SDF Walkers, laboratorium języka, laboratorium obrazów | `labs/walkers.html`, `labs/lang.html`, `labs/img.html` | [labs/walkers/README.md](labs/walkers/README.md), [labs/walkers/ROADMAP.md](labs/walkers/ROADMAP.md), [labs/walkers/notatki/](labs/walkers/notatki/README.md) |

## Narzędzia

| Narzędzie | Strona | Dokument |
|---|---|---|
| Doktor modeli | `tools/doctor.html` | [tools/doctor.md](tools/doctor.md) (broń ręczna: [models/weapons/README.md](models/weapons/README.md)) |
| Kontrola kitów | `tools/kitcheck.html` | sprawdza modele kitów Space z wzorcem `tools/kitcheck.golden.json` |
| Sprawdzenia (przy każdym wypchnięciu) | `tools/paths.py`, `tools/sitemap.py` | [../CLAUDE.md](../CLAUDE.md), „Strona startowa” |

## Przewodniki

- Jak korzystać z laboratoriów z Battle: [guides/using-the-labs.md](guides/using-the-labs.md)
- Renderowanie modeli ShipKit i BodyKit, niebo: [guides/rendering.md](guides/rendering.md)
- Znane pułapki: [guides/gotchas.md](guides/gotchas.md)
- Silnik — schemat i plan (scena w środku, moduły, co już mamy): [guides/engine-architecture.md](guides/engine-architecture.md)

## Historia

- Laboratoria Space sprzed przeniesienia: [history/space-labs.md](history/space-labs.md)
- Mapa laboratoriów z Battle (październik 2026): [history/labs-sea-map.md](history/labs-sea-map.md)
- Doktor: [history/doctor-space.md](history/doctor-space.md), [history/doctor-sea.md](history/doctor-sea.md)
- SDF Walkers (NeuroLabPA): [history/walkers.md](history/walkers.md)
- Remanent kodu i dokumentacji (listopad 2026, wykonany): [history/audit-2026-11.md](history/audit-2026-11.md)
