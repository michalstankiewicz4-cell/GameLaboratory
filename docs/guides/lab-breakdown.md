# Rozbiór laboratoriów — co zostało (plan od 2026-11-06, skrócony 2026-11-20)

Każde laboratorium rozkładamy na części, które trafiają do wspólnych szuflad silnika; laboratorium zostaje
**edytorem jednego rodzaju zasobu**, a wszystko składa się w edytorze sceny. Ten dokument trzyma tylko to, co zostało
do zrobienia; zrobione punkty (0.37.0–0.87.0: zasoby z nazwą, niebo przy każdej powierzchni, zachowania wyjęte
z modeli, wspólna scena bazowa, prefabrykaty, orbity i akcje statków, lekarz sceny, materiał z Hive Hunger, dźwięk)
są w [`../../CHANGELOG.md`](../../CHANGELOG.md). Plan silnika: [`engine-architecture.md`](engine-architecture.md);
silnik sceny: [`../scene/README.md`](../scene/README.md); zachowania: [`../behaviors/README.md`](../behaviors/README.md).

## Zasady

- **Szuflady:** model (`js/models/` — geometria, materiały, części; nie wie o środowisku), zachowanie
  (`js/behaviors/<środowisko>/` — napęd i ruch, prawdziwa fizyka, bez sceny), środowisko (`js/envs/`), obraz
  (`js/render/`), dźwięk (`js/audio/`), zasób z nazwą (`js/scene/assets.js`), prefabrykat (`js/scene/prefabs.js`),
  zachowanie w scenie (`js/scene/behaviors.js`).
- **Laboratorium po rozbiorze:** wspólna scena bazowa, okna i pasek jak dziś, własny kod tylko do edycji swojego
  zasobu (suwaki, podgląd, zapis pod nazwą).
- **Kolejność:** jedno laboratorium naraz, wtedy, gdy edytor sceny czegoś z niego potrzebuje.
- **Bez zmiany wyglądu:** rozbiór przenosi kod; to, co widać, zostaje takie samo (doktor modeli i kitcheck przed i po).

## Co zostało, według szuflad

| Szuflada | Brakuje |
|---|---|
| modele | materiały modeli z MatKit (rodzina po rodzinie) |
| zachowania | chód (LifeKit — dziś w modelu), zanurzenie okrętu podwodnego; zejście, jazda i skok z SurfaceKit (`ground.js` — mechaniki gry w kicie) |
| środowiska | niebo kosmosu w `js/envs/space/` (dziś „ciało” BodyKit), niebo ze zdjęcia; brzegi, lód, prąd, olej i lawa z laboratorium wody w scenie bazowej; deszcz i błyskawice z zapisanej pogody w scenie bazowej |
| zasoby z nazwą | roślinność krajobrazu (las, zagajniki, trawa — ForestKit), układ (słońca, orbity, ciała), ciało niebieskie, planeta (grunt), baza (układ modułów), tor (sieć torowa), stwór (edytor stworów), człowiek, wariant modelu (okrętu, pojazdu, statku, budowli), obraz w scenie (tryb 3D sztuki), muzyka w scenie |
| prefabrykaty | przedmioty bohatera (w ręku postaci, światło w jaskini), wynik edytora stworów i transformatora |

## Co zostało, według laboratoriów

| Laboratorium | Co zostało | Dokąd |
|---|---|---|
| **Woda** | brzegi, lód, prąd, olej, lawa tylko w laboratorium | WaterKit / scena bazowa |
| **Ciała niebieskie** | niebo kosmosu jako ciało BodyKit | `js/envs/space/` |
| **Układy** | gotowe tła (`SKIES`) w SystemKit | katalog nieb środowiska; zasób **układ** |
| **Powierzchnia** | zejście, jazda, skok i budowa bazy w SurfaceKit; własne niebo i pogoda (`surfacekit/sky.js`, `weather.js`) | zachowania; budowa → narzędzie edytora; niebo i pogoda → wspólne |
| **Pojazdy · kosmos** | własne niebo `ShipKit.makeSpaceSky` | wspólne niebo kosmosu |
| **Transformator** | poziomy szczegółów, strefy trafień i zniszczenia tylko dla okrętów | `js/render/` i silnik — dla każdego modelu |
| **Budowle** | własna scena z lądem i wodą | wspólna scena bazowa; zasób **wariant budowli** |
| **Rośliny** | las, zagajniki i trawa rozmieszczane według biomu tylko w laboratorium | pokrycie terenu lądu w scenie |
| **Życie, edytor stworów, człowiek** | chód w LifeKit; laboratoria na globalnym THREE | zachowanie „chód” (ląd); zasoby **stwór**, **człowiek** |
| **Przedmioty bohatera** | — | prefabrykaty; widzenie → kamera gracza |
| **Sztuka** | powierzchnie 2D (papier, drewno, metal) liczone osobno od MatKit | MatKit; obraz → zasób i obiekt sceny (tryb 3D) |

Zostają narzędziami: skórki, Pixel Studio i generator zombie (2D — gdy będzie scena 2D), Kostnica SDF, SDF Walkers,
laboratoria języka i obrazów (osobne silniki), skala, doktor modeli, kitcheck.

## Rzeczy wspólne

1. **Nieba:** dziś cztery (dzienne SkyKit, niebo powierzchni `surfacekit/sky.js`, niebo kosmosu BodyKit,
   `ShipKit.makeSpaceSky`); docelowo dwa (dzienne i kosmosu) w `js/envs/` ([plan](engine-architecture.md),
   „Niebo niezależne od powierzchni”).
2. **Zachowania w modelach:** chód w LifeKit, zejście i jazda w SurfaceKit — model ma tylko pokazywać; ruch → `js/behaviors/`.
3. **Własna scena laboratorium** zamiast wspólnej sceny bazowej (`js/labs/shared/stage.js`): budowle, rośliny,
   powierzchnia i laboratoria ze Space.
4. **Dwa sposoby ładowania Three.js:** moduły (Battle) i globalne `THREE` (Space, `three-global.js`) — docelowo moduły
   wszędzie (`TODO.md`, „Z remanentu”, F4).

## Kolejność — następne

1. **Materiał z PatientZero** (repozytorium `michalstankiewicz4-cell/PatientZero`; przeniesienie **z historią**), na
   potem (właściciel, 2026-11-20):
   1. **środowisko „organizm”** — czwarte obok kosmosu, wody i lądu, ze swoimi prawami: przepływ płynów (krew, chłonka,
      bijące serce — `js/flow.js`), dyfuzja, odpowiedź odpornościowa;
   2. **laboratorium tkanek** — narządy i tkanki (serce, wątroba, nerka — `js/render/tissue.js`, `cells.js`,
      `biome.js`) jako teren tego środowiska, zapis pod nazwą (jak ląd);
   3. **laboratorium patogenów** — bakterie, wirusy, grzyb, nowotwór jako modele z zachowaniami (ruch z przepływem,
      kolonie, rozmnażanie, mutacje);
   plansze to płaska scena oglądana z góry (kamera ortograficzna) w tym samym silniku Three.js — bez osobnej sceny
   2D na canvasie (canvas 2D tylko w interfejsie, jak w grze).
2. Reszta tabel wyżej — gdy edytor sceny będzie jej potrzebował. Pomysły właściciela na laboratoria (wiki w menu
   Pomoc, laboratorium scenariusza, tryb 3D sztuki, okrągły ląd, animacje…) — w `TODO.md`.
