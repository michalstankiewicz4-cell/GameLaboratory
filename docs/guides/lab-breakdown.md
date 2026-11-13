# Rozbiór laboratoriów (plan, 2026-11-06)

Każde laboratorium rozkładamy na części, które trafiają do wspólnych szuflad silnika; laboratorium zostaje
**edytorem jednego rodzaju zasobu**, a wszystko składa się w edytorze sceny. Ten dokument to spis: co jest w każdym
laboratorium, co już leży we wspólnych szufladach, co jest pomieszane w kodzie laboratorium i dokąd ma iść.
Kod się przy tym spisie nie zmienia. Plan silnika: [`engine-architecture.md`](engine-architecture.md); silnik sceny:
[`../scene/README.md`](../scene/README.md); zachowania: [`../behaviors/README.md`](../behaviors/README.md).

## Zasady

- **Szuflady:** model (`js/models/` — geometria, materiały, części; nie wie o środowisku), zachowanie
  (`js/behaviors/<środowisko>/` — napęd i ruch, prawdziwa fizyka, bez sceny), środowisko (`js/envs/` — powierzchnia,
  niebo, woda, prawa), obraz (`js/render/` — potok kamery, filtry, widzenie), zasób z nazwą (`js/scene/assets.js` —
  ustawienia zapisane w laboratorium), prefabrykat (`js/scene/prefabs.js` — model, który da się postawić w scenie),
  zachowanie w scenie (`js/scene/behaviors.js` — podpięcie).
- **Laboratorium po rozbiorze:** wspólna scena bazowa, okna i pasek jak dziś, własny kod tylko do edycji swojego
  zasobu (suwaki, podgląd, zapis pod nazwą).
- **Kolejność:** jedno laboratorium naraz, wtedy, gdy edytor sceny czegoś z niego potrzebuje. Najpierw to, co edytor
  już pokazuje.
- **Bez zmiany wyglądu:** rozbiór przenosi kod; to, co widać w laboratorium, ma zostać takie samo (doktor modeli
  i kitcheck przed i po).

## Stan dziś (skrót)

| Szuflada | Już jest | Brakuje |
|---|---|---|
| modele | kity okrętów, pojazdów drogowych, tramwaju, pociągu, samolotu, budowli, broni, statków kosmicznych, ciał niebieskich, życia, ludzi, roślin, jaskiń, przedmiotów, baz, bloków (BlockKit, 0.64.0); materiały MatKit (0.63.0) | materiały modeli z MatKit (rodzina po rodzinie) |
| zachowania | okręt na wodzie, mała jednostka na wodzie (MarineKit, amfibia), jazda po lądzie (siłami), lądowanie, lot, koło na szynie (skład, tramwaj), ciąg w próżni, orbita, ciecze i gaz w kosmosie (0.64.0) | chód (LifeKit), zanurzenie |
| środowiska | woda (WaterKit), ląd (LandKit, RegionKit), niebo dzienne (SkyKit, RainKit), powierzchnia planety (SurfaceKit), układy (SystemKit) | jedno niebo kosmosu w środowiskach; trzy osobne nieba do połączenia (niżej) |
| obraz | potok kamery (LookPipeline), filtry, PostPipeline, widzenie | jeden potok — zrobione (0.56.0) |
| zasoby z nazwą | morze (woda), ląd (ląd), pogoda i światło (wygląd), wygląd kamery (filtry), niebo kosmosu (ciała niebieskie), materiał (materiały), UI gry i skórka UI (UI gry), bryła z bloków (bloki — zasób modelu, pole `asset`) | jaskinia, roślinność, układ, wariant modelu |
| prefabrykaty | okręty, drogowe, tramwaj, pociąg, Spitfire, budowle, broń, statki kosmiczne, MarineKit, łaziki, moduły baz, ciała niebieskie, rośliny, jaskinie, ludzie, stwory, bryły z bloków | przedmioty bohatera, wynik edytora stworów i transformatora |

## Laboratoria — co i dokąd

Kolumny: **w szufladach** — z czego laboratorium już korzysta; **pomieszane** — co siedzi w kodzie laboratorium albo
w kicie nie na swoim miejscu; **dokąd** — gdzie to ma trafić; **zasób** — co laboratorium będzie zapisywać pod nazwą
dla edytora; **priorytet** — 1 teraz (edytor tego potrzebuje), 2 potem, 3 kiedyś.

### Środowiska

| Laboratorium | W szufladach | Pomieszane | Dokąd | Zasób | Prio. |
|---|---|---|---|---|---|
| **Woda** (`labs/water.html`, 555 l.) | WaterKit, FoamKit, LandKit, okręty | własna scena, niebo i światło; brzegi, lód, prąd, olej, lawa tylko w laboratorium (scena bazowa ich nie zna) | brzegi i lód do WaterKit / sceny bazowej; scena laboratorium → wspólna scena bazowa | **morze** (jest); później woda z brzegiem i lodem | 1 |
| **Ląd** (`labs/land.html`, 375 l.) | LandKit, RegionKit, SkyKit, WaterKit | własna scena i pętla; mapa (teren, wody, nazwy) i jej ustawienia tylko w laboratorium | teren do sceny bazowej (dziś edytor ma płaski grunt) | **ląd** (teren z ustawień i ziarna) | 1 |
| **Wygląd** (`labs/look.html`, 308 l.) | SkyKit, RainKit, WaterKit, LookPipeline | pora dnia, pogoda, deszcz, wiatr→morze; ujęcia kamery (`CAMS`) w kodzie laboratorium | pogoda i pora → środowisko (`js/envs/sky/`); ujęcia → moduł kamery silnika | **pogoda i światło** (zamiast czterech stałych oświetleń sceny bazowej) | 1 |
| **Filtry** (`labs/filters.html`, 181 l.) | LookPipeline, scena bazowa | profile pod własnym kluczem `gameLab.lookProfiles.v1` | profile → zasoby z nazwą | **wygląd kamery** (rodzaj `look` w `assets.js`) | 1 |
| **Ciała niebieskie** (`labs/bodies.html`, 371 l.) | BodyKit | niebo kosmosu jako „ciało” BodyKit | niebo → `js/envs/space/` (plan „Niebo niezależne od powierzchni”); ciała → prefabrykaty | **niebo kosmosu** (jest); ciało niebieskie (wartości) | 2 |
| **Układy** (`labs/systems.html`, 556 l.) | SystemKit, BodyKit | gotowe tła (`SKIES`) w SystemKit; ruch po orbitach (SystemKit `orbitPoint`) tylko w laboratorium | tła → katalog nieb w środowisku; orbity → zachowanie „orbita” (kosmos) | **układ** (słońca, orbity, ciała) | 3 |
| **Skala** (`labs/scale.html`, 357 l.) | dane gry Space (`js/envs/space/`) | układ gry Space, własny widok 2D/3D | zostaje narzędziem (pokazuje skalę) | — | 3 |
| **Powierzchnia** (`labs/surface.html`, 320 l.) | SurfaceKit, BodyKit, BaseKit, ShipKit | zejście, jazda, skok i budowa bazy — mechaniki gry w SurfaceKit (`ground.js`); własne niebo i pogoda (`surfacekit/sky.js`, `weather.js`) | grunt planety → środowisko; zejście, jazda, skok → zachowania; budowa → narzędzie edytora | **planeta (grunt)**; baza (układ modułów) | 3 |
| **Jaskinie** (`labs/caves.html`, 119 l.) | CaveKit, freecam | — (małe) | jaskinia → prefabrykat albo środowisko „podziemie” | **jaskinia** (ziarno, wielkość) | 2 |

### Pojazdy

| Laboratorium | W szufladach | Pomieszane | Dokąd | Zasób | Prio. |
|---|---|---|---|---|---|
| **Pojazdy · woda** (`labs/vehicles-water.html`, 475 l.) | okręty (ships-sea), MarineKit, WaterKit | MarineKit ma **własne morze** (`makeSea`, nieużywane) i **pływanie w `update()` modelu** (unoszenie na falach, płaty, zanurzenie) — zachowanie w modelu | pływanie MarineKit → `js/behaviors/water/` (obok okrętu); morze MarineKit → usunąć albo połączyć z WaterKit | **wariant okrętu** (wyposażenie, wiek, światła) | 1 |
| **Pojazdy · ląd** (`labs/vehicles-land.html`, 469 l.) | VehicleKit, RoadKit, TramKit, TrainKit, AirKit, koło na szynie, sieć torowa | **jazda `VehicleKit.drive` jest kinematyczna** (prędkość dąży do celu, skręt bez sił) — wbrew zasadzie prawdziwej fizyki; **własny teren** (szum `heightAt`) zamiast LandKit; tramwaj ma fizykę (`rail/tram.js`) — od 1.14.0 laboratorium jej używa | jazda → nowe zachowanie „jazda” w `js/behaviors/` (folder lądu; opony, tarcie, napęd — siłami); teren → LandKit / scena bazowa; tramwaj → zachowanie w scenie | **wariant pojazdu**; **tor** (sieć torowa) | 1 |
| **Pojazdy · kosmos** (`labs/vehicles-space.html`, 425 l.) | ShipKit | akcje statków (strzał, skan, zniszczenie) w ShipKit; własne niebo (`makeSpaceSky`) — czwarte niebo | akcje → zachowania / zdarzenia; niebo → wspólne niebo kosmosu | **wariant statku** (nazwy, szczegółowość, uszkodzenia) | 2 |
| **Transformator** (`labs/transform.html`, 209 l.) | `models/ships-sea/transform.js`, PostPipeline | poziomy szczegółów, strefy trafień, zniszczenia — wspólne dla gier, ale tylko dla okrętów | → `js/render/` (poziomy szczegółów) i silnik (trafienia, zniszczenia) dla każdego modelu | — | 2 |

### Budowle, życie, przedmioty

| Laboratorium | W szufladach | Pomieszane | Dokąd | Zasób | Prio. |
|---|---|---|---|---|---|
| **Budowle** (`labs/structures.html`, 265 l.) | StructKit, LandKit, SkyKit, WaterKit | własna scena z lądem i wodą | scena → wspólna scena bazowa | **wariant budowli** | 2 |
| **Budynki** (`labs/buildings.html`, 99 l.) | BaseKit (Space, globalne THREE) | — (małe) | moduły baz → prefabrykaty (jak statki kosmiczne, `js/scene/space.js`) | — | 2 |
| **Rośliny** (`labs/plants.html`, 308 l.) | PlantKit, ForestKit, LandKit | las, zagajniki i trawa (ForestKit) rozmieszczane według biomu tylko w laboratorium | → środowisko lądu (pokrycie terenu) | **roślinność** (gatunki, gęstość) | 2 |
| **Życie / Edytor stworów / Człowiek** (`life`, `creator`, `human`) | LifeKit, studio (`js/labs/shared/studio.js`) | chód i ruch w LifeKit (model); laboratoria ze Space na globalnym THREE | chód → zachowanie „chód” (ląd); stwory i ludzie → prefabrykaty | **stwór** (projekt z edytora stworów); **człowiek** (wygląd) | 2 |
| **Przedmioty bohatera** (`labs/gear.html`, 127 l.) | GearKit, CaveKit, widzenie (`js/render/vision.js`) | — | przedmioty → prefabrykaty (w ręku postaci); widzenie → kamera gracza | — | 3 |
| **Dźwięk** (`labs/sound.html`, 198 l.) | MusicKit | — | → `js/audio/` jako warstwa silnika (Audio) | **muzyka / dźwięk** | 3 |

### Materiały, grafika, UI (dodane po spisie)

| Laboratorium | W szufladach | Pomieszane | Dokąd | Zasób | Priorytet |
|---|---|---|---|---|---|
| **Materiały** (`labs/materials.html`, 219 l., 0.63.0) | MatKit (`js/render/materials/`) | — | materiały modeli i sceny z MatKit; powierzchnie 2D sztuki | **materiał** (jest) | 1 |
| **Sztuka** (`labs/art.html`, 252 l., 0.57.0) | ArtKit, silnik ekspertyzy (`js/render/art/exam/`) | powierzchnie 2D (papier, drewno, metal) liczone osobno od MatKit | powierzchnie → MatKit; obraz → zasób i obiekt sceny (tryb 3D) | **obraz** (w planie) | 2 |
| **UI gry** (`labs/gameui.html`, 326 l., 0.61.0) | `js/gameui/` (ekrany, HUD, okna, dialog, skórki) | — | w scenie `env.ui`, nakładka w ▶ Graj (0.62.0) | **UI gry**, **skórka UI** (są) | — |
| **Bloki** (`labs/blocks.html`, 220 l., 0.64.0) | BlockKit (`js/models/blocks/`), ciecze i gaz (`js/behaviors/space/`), MatKit | — | bryły → prefabrykaty; bryła z laboratorium → zasób z nazwą, pole `asset` obiektu (0.66.0) | **bryła z bloków** (jest) | — |

### Zostają, jakie są (narzędzia)

Skórki (UI), Pixel Studio i generator zombie (2D, zasoby do gier 2D — gdy będzie scena 2D), Kostnica SDF, SDF Walkers,
laboratoria języka i obrazów (osobne silniki), doktor modeli, kitcheck.

## Rzeczy wspólne, które wyszły przy spisie

1. **Cztery nieba:** dzienne SkyKit (Battle), niebo powierzchni planety (`surfacekit/sky.js`), niebo kosmosu
   BodyKit, `ShipKit.makeSpaceSky` (laboratorium statków). Docelowo dwa (dzienne i kosmosu) w `js/envs/`, wybierane
   niezależnie od powierzchni ([plan](engine-architecture.md), „Niebo niezależne od powierzchni”).
2. **Dwa systemy światła:** cztery stałe oświetlenia sceny bazowej (`LIGHTS`) i pogoda z porą dnia laboratorium
   wyglądu — połączyć w zasób **pogoda i światło**.
3. **Dwa morza:** WaterKit (Battle) i `MarineKit.makeSea` (Space, nieużywane) — *morze MarineKit usunięte w 0.41.0*.
4. **Zachowania w modelach:** `VehicleKit.drive` (kinematyczne), pływanie w `MarineKit.update`, chód w LifeKit, akcje
   w ShipKit, zejście i jazda w SurfaceKit — model ma tylko pokazywać; ruch → `js/behaviors/`.
5. **Każde laboratorium ma własną scenę i pętlę** — docelowo wspólna scena bazowa (`js/labs/shared/stage.js` jest
   zaczątkiem; korzystają z niej filtry, wygląd, ląd, woda, pojazdy (kosmos, woda, ląd) i edytor).
6. **Dwa sposoby ładowania Three.js:** moduły (Battle) i globalne `THREE` (Space, `three-global.js`) — kity ze Space
   można ładować w edytorze przy pierwszej potrzebie (`js/scene/space.js`); docelowo moduły wszędzie.
7. **Dwa potoki obrazu:** LookPipeline / PostPipeline (Battle) i LabKit + PostKit (Space).
   *(0.54.0: efekty kosmosu PostKit — soczewkowanie, flara, promienie — także w LookPipeline, `js/render/space-fx.js`;
   0.55.0: laboratoria ze Space już
   rysowały przez LookPipeline (panel `js/labkit/look-panel.js`), teraz z efektami kosmosu — jeden potok. PostKit usunięty: 0.56.0)*
8. **Wygląd kamery pod osobnym kluczem** — do zasobów z nazwą.

## Kolejność (propozycja)

1. **Zasoby, których edytor już potrzebuje:** wygląd kamery do `assets.js` (filtry), pogoda i światło (wygląd),
   ląd (laboratorium lądu, z terenem w scenie bazowej). *(zrobione w 0.37.0; zostały: deszcz i błyskawice w scenie
   bazowej, płycizny morza przy terenie)*
2. **Niebo niezależne od powierzchni** (plan w `engine-architecture.md`) — przy tym niebo kosmosu do `js/envs/space/`.
   *(wybór nieba przy każdej powierzchni: 0.38.0; zostało: przeniesienie kodu nieba kosmosu, niebo ze zdjęcia)*
3. **Zachowania z modeli:** jazda po lądzie siłami (nowe zachowanie lądu w `js/behaviors/`) zamiast `VehicleKit.drive`,
   pływanie MarineKit; potem pojazdy drogowe, łaziki i MarineKit jako prefabrykaty z zachowaniem.
   *(jazda po lądzie siłami: 0.39.0 — łaziki i pojazdy drogowe w laboratorium, pojazdy drogowe w edytorze; pływanie
   MarineKit i amfibia: 0.40.0 — w laboratoriach i w edytorze; tramwaj na torze i kołowanie samolotu w laboratorium: 1.14.0–1.15.0; łaziki jako prefabrykaty
   i MarineKit bez własnego morza i sprężyn: 0.41.0 — punkt zrobiony)*
4. **Wspólna scena bazowa w laboratoriach środowisk i pojazdów** (woda, ląd, wygląd, pojazdy) — laboratorium
   pokazuje swój zasób na tej samej scenie co edytor.
   *(wygląd i ląd: 0.41.1 — bez zmiany obrazu; morze edytora zna teren. Woda i pojazdy · woda: 0.42.1 — niebo SkyKit
   zamiast gradientu, wygląd do dopracowania. Pojazdy · ląd i kosmos: 0.42.2 — punkt zrobiony; wygląd do
   dopracowania)*
5. **Reszta prefabrykatów:** moduły baz, rośliny, jaskinie, ciała niebieskie, ludzie i stwory (z chodem).
   *(rośliny i jaskinie: 0.43.0; moduły bazy: 0.44.0; ciała niebieskie: 0.45.0; ludzie i stwory: 0.46.0 — stoją,
   chód jako zachowanie później. Do rozważenia (pytanie użytkownika): laboratorium animacji)*
6. **Kosmos dalej:** orbity (układy), powierzchnia planety, akcje statków jako zdarzenia.
   *(orbity: 0.47.0 — zachowanie „orbita”; akcje statków jako zdarzenia: 0.48.0 — szyna `js/core/events.js`. Ląd z planety:
   0.49.0 — teren z planety jako drugie źródło lądu, `js/envs/land/planet.js`. Niebo planety: 0.50.0. Grunt i lawa planety: 0.51.0. Lądowanie: 0.52.0 (zachowanie, laboratorium pojazdów — ląd). Budowa bazy: 0.53.0 (narzędzie edytora `editor/js/world/placer.js`, zachowanie „budowa”). Jazda — „jazda po lądzie” łazików. Skok
   skreślony (wraca z okrągłą planetą). Punkt zrobiony)*
   Później (pomysły użytkownika): przełącznik **Okrągła** w laboratorium lądu (generator lądu na kuli — zastąpi
   drugie źródło) i widok mapy zawiniętej jako **torus** (kształt, nie tylko topologia).
7. **Lekarz sceny** *(zrobiony w 0.60.0: `js/scene/doctor.js`, opis `docs/scene/doctor.md`)* (na końcu, gdy są prefabrykaty i zachowania): sprawdza układ sceny, czego nie widać w pojedynczym
   modelu — obiekt w złym środowisku (drzewo na morzu, okręt na lądzie, łazik w kosmosie), pod gruntem albo
   w powietrzu, obiekty wchodzące jeden w drugi, brakujące zasoby z nazwą, zachowanie niepasujące do modelu albo
   środowiska, koszt sceny (trójkąty, wywołania rysowania) względem budżetu. Jak doktor modeli: uniwersalny, zgłasza
   i proponuje poprawki, niczego nie przestawia po cichu; w API polecenie `check` (lista problemów dla AI).
8. **Materiał z Hive Hunger** (repozytorium `michalstankiewicz4-cell/Hive-Hunger`; przeniesienie **z historią**, jak
   Space, Battle i aTrain), po lekarzu sceny, w tej kolejności:
   1. *(zrobione w 0.64.0: `labs/blocks.html`, opis `docs/labs/blocks.md`)* **laboratorium bloków (wokseli)** — z edytora wokseli (`tools/voxel-editor.html`) i `js/three` (`liquidShader.js`,
      `Liquids.js`, `Gases.js`): bloki stałe w różnych kolorach i rodzajach (skała, żelazo…) jako model (kit bloków
      w `js/models/`), ciecze (woda, lawa) i gazy jako zachowania w kosmosie (spójność kropel, kłęby, odbicia od
      bloków); w edytorze sceny — bryły z bloków (budowa poziomów);
   2. ~~**statki roju**~~ — nie przenosimy (właściciel, 2026-11-14: w grze to tylko kolorowe kreski); ich efekty
      (promienie, holowanie, cięcie, pola, skok) są już w laboratorium efektów (0.69.0);
   3. *(zrobione w 0.67.0: `labs/effects.html`, opis `docs/labs/effects.md`)* **laboratorium efektów** (`js/three/effects`): strzały, wybuchy, cząsteczki — odpowiedź na zdarzenia (np. akcja
      `fire`);
   4. **drzewka technologiczne** (`tools/tree-editor.html`) — później: dane gry jako zasób z nazwą i narzędzie do ich
      edycji.
9. **Materiał z PatientZero** (repozytorium `michalstankiewicz4-cell/PatientZero`; przeniesienie **z historią**), po
   Hive Hunger:
   1. **środowisko „organizm”** — czwarte obok kosmosu, wody i lądu, ze swoimi prawami: przepływ płynów (krew, chłonka,
      bijące serce — `js/flow.js`), dyfuzja, odpowiedź odpornościowa;
   2. **laboratorium tkanek** — narządy i tkanki (serce, wątroba, nerka — `js/render/tissue.js`, `cells.js`,
      `biome.js`) jako teren tego środowiska, zapis pod nazwą (jak ląd);
   3. **laboratorium patogenów** — bakterie, wirusy, grzyb, nowotwór jako modele z zachowaniami (ruch z przepływem,
      kolonie, rozmnażanie, mutacje);
   plansze to płaska scena oglądana z góry (kamera ortograficzna) w tym samym silniku Three.js — bez osobnej sceny
   2D na canvasie (canvas 2D tylko w interfejsie, jak w grze).

## Pomysły na później (laboratoria)

- **Pełne połączenie wszystkich laboratoriów i przekształcenie w silnik** (pomysł użytkownika, 2026-11-13): każde
  laboratorium jest edytorem jednej części silnika, a wynik trafia do sceny i gier jako prefabrykat albo zasób
  z nazwą; na końcu jedno wejście dla gier bez edytora. Spis stanu i kroki — `TODO.md`, „Pełne połączenie laboratoriów”.

- **Wiki w menu Pomoc** (pomysł użytkownika): artykuły o laboratoriach, modelach, środowiskach i zjawiskach (np.
  metody ekspertyzy, techniki malarskie), z ilustracjami generowanymi w laboratoriach (laboratorium sztuki: `ArtApi`) —
  małe obrazki, bez wysokiej rozdzielczości i efektów, chyba że ilustracja tego wymaga. Wzór: wiki eksperta w grze
  artchecker (ilustracje generowane w piaskownicy).
- **Laboratorium scenariusza** (pomysł użytkownika, 2026-11-13): treści i dialogi podpinane pod postacie i narratora;
  z nim **opisy statków i rzeczy w grze** (szczegóły w `TODO.md`).
- **Laboratorium UI gry** *(zrobione w 0.61.0: `labs/gameui.html`, `js/gameui/`, opis `docs/labs/gameui.md`)* (pomysł użytkownika, 2026-11-13): nakładka na scenę z menu gry, HUD i ekranami — UI gry
  jako dane sceny, warstwa nad widokiem w ▶ Graj, własna skórka gry oddzielona od wyglądu laboratoriów; kiedy i na
  jakim poziomie — do ustalenia (szczegóły w `TODO.md`).
- **Laboratorium sztuki — tryb 3D** (propozycja przyjęta na później, opis: [../labs/art.md](../labs/art.md),
  „Pomysły”): obraz jako płaszczyzna 3D z mapą normalnych z wysokości farby ArtKit i mapą szorstkości, obracanie
  obrazu i ruchome światło, nierówny barwnik w pociągnięciu, rama 3D (profil listwy, UV wzdłuż listwy) ze złoceniem.
