# GameLaboratory — do zrobienia

Propozycje czekające na decyzję i rzeczy odłożone. Zrobione przenoś do `CHANGELOG.md`.

## Język
- [ ] Przetłumaczyć panele wewnątrz laboratoriów na polski (teraz po polsku są tylko pasek menu i strona startowa).

## Pociąg (zachowanie „koło na szynie”)
- [ ] Dźwięki pociągu z aTrain (tarcie kół, łańcuch, sprzęg, styki szyn, zderzaki, koło o podkład).
- [ ] Dym i iskry z aTrain.
- [ ] Teren z aTrain: góra, skarpa, morze, las (fizyka zna go przez `sim.groundH`).
- [ ] Pogoda z aTrain.

## Dokumentacja

## Modele — błędy znalezione przez doktora (po stronie gry, chyba że doktor nauczy się je naprawiać)
- [ ] Dziury: talerz anteny (haven), kadłub (swarmer), kadłuby (skimmer, barka, amfibia), półkula (scout).
- [ ] Migotanie zlicowanych ścian z teksturą: hauler, crawler.
- [ ] Wiszące części: scribe (korona), constructor, scout, skimmer, amfibia.
- [ ] Orzeł: działko 40 mm zasłonięte w części łuku.

## Grafika (do oceny)
- [ ] Mgławica w tle laboratorium ciał niebieskich ciemniejsza po przejściu na grafikę Battle.
- [ ] Poświaty silników statków słabsze niż wcześniej.

## Do przeniesienia
- [ ] SDF Walkers i laboratorium języka (z NeuroLabPA): przenieść na okna z opcjami i styl Battle — dziś to przewijane strony we własnym stylu.

## Testy
- [ ] Pełny kitcheck po wersji 0.5.0 (przerwany; doktor przeszedł).

## Z remanentu (do decyzji — `docs/AUDIT.md`, „Stan wykonania”)
- [ ] D6: wspólne pomocnicze `$()` / `el()` (`js/labkit/dom.js`).
- [ ] F3: dane głowy człowieka jako plik `.bin` (wczytywany asynchronicznie).
- [ ] F4: kity Space jako importy ES zamiast globali `window.*`.
- [ ] Narzędzie „Tekstura ziarna”: robiło `grain.png` dla paneli `.mat` gry; laboratoria już go nie używają — zostawić albo usunąć.
- [ ] Laboratorium skórek bez CSP (atrybuty `style=` w makiecie i w `js/labs/skins.js`).

## Pomysły na laboratoria przeniesione z TODO.md w Battle
- [ ] Pixel Studio: edytor i import palet, warstwy, zaznaczanie i przesuwanie, czas klatki, podgląd kafelka 3×3, normalne koron drzew, więcej obiektów 3D.
- [ ] Laboratorium lądu: rzeki i jeziora, klify i skaliste brzegi, porty i miasta, roślinność (drzewa jako impostory), pojazdy naziemne / swobodny spacer przy 100 % lądu, LOD terenu za dalekim gridem.
- [ ] **Laboratorium malowania** (właściciel, na później): schematy malowania i kamuflażu okrętów jako osobne dane (dazzle, Admiralty disruptive, szarość pokojowa, oznaczenia epoki).
- [ ] Orzeł: sprawdzić z rysunkiem profilu/zdjęciami; stan z maja 1940; wariant ORP Sęp; ślad peryskopu w laboratorium wody.
- [ ] Budowle: pomosty i pirsy, porty (dźwigi, magazyny), latarnie morskie; szczegóły platformy (zęby zębatki, oświetlenie pokładu, płomień testu odwiertu); budowle w doktorze modeli.
- [ ] Rośliny: podszyt (paprocie, wrzos, trzcina), martwe drewno, płynne przejście model↔impostor, jesienne impostory, rośliny w laboratorium lądu.
- [ ] **Laboratorium skał** (właściciel, 2026-10-22): głazy, piarg, wychodnie i ściany skalne jako obiekty, rozmieszczane wg biomu i nachylenia.
- [ ] Więcej biomów (tundra, tropiki, wulkany…), potem inne planety (zestawy nieba, wody i biomów).
- [ ] Środowisko: ławice mgły, bryzgi przy silnym wietrze; panele nieba i pogody w laboratorium wody.
- [ ] Właściciel wybiera poziom starzenia i wygląd (do materiałów i ustawień grafiki gier).
- [ ] Proceduralne zniszczenia na hitboxach transformatora: model uszkodzeń, rozprzestrzenianie, odłamki, ogień i dym.
- [ ] Transformator: instancjonowanie powtarzalnych okuć i scalone materiały stanowisk na LOD0 (~30 wywołań rysowania).
- [ ] Laboratorium wody: cienie okrętów na wodzie, widok pod wodą, interakcja z brzegiem; wybór wariantu morza przez właściciela.
- [ ] Błyskawica: sprawdzić położenia z rysunkiem profilu; konfiguracje 1941/1942 jako warianty.
- [ ] Doktor: test obrotu stanowisk, strefy podniesienia/podmuchu, nieużywane materiały.
- [ ] Więcej prawdziwych okrętów w laboratorium.
