# GameLaboratory — do zrobienia

Propozycje czekające na decyzję i rzeczy odłożone. Zrobione przenoś do `CHANGELOG.md`.

## Następne w planie (`docs/guides/lab-breakdown.md`, „Kolejność”)
- [ ] **Punkt 7 — lekarz sceny** (następny): sprawdza układ sceny, czego nie widać w pojedynczym modelu — obiekt w złym
  środowisku (drzewo na morzu, okręt na lądzie, łazik w kosmosie), pod gruntem albo w powietrzu, obiekty wchodzące
  jeden w drugi, brakujące zasoby z nazwą, zachowanie niepasujące do modelu albo środowiska, koszt sceny (trójkąty,
  wywołania rysowania) względem budżetu. Jak doktor modeli: uniwersalny, zgłasza i proponuje poprawki, niczego nie
  przestawia po cichu; w API polecenie `check` (lista problemów dla AI).
- [ ] Punkt 8 — materiał z Hive Hunger (z historią): laboratorium bloków, statki roju, laboratorium efektów, drzewka
  technologiczne.
- [ ] Punkt 9 — materiał z PatientZero (z historią): środowisko „organizm”, laboratorium tkanek, laboratorium patogenów.

## Pomysły (właściciel, czekają na decyzję)
- [ ] **Wiki w menu Pomoc**: artykuły o laboratoriach, modelach, środowiskach i zjawiskach, z małymi ilustracjami
  generowanymi w laboratoriach (`ArtApi`) — bez wysokiej rozdzielczości i efektów, chyba że ilustracja tego wymaga.
- [ ] **Laboratorium sztuki — tryb 3D**: obraz jako płaszczyzna 3D (mapa normalnych z wysokości farby, mapa szorstkości:
  werniks błyszczy, sucha farba matowa), obracanie obrazu i ruchome światło, nierówny barwnik w pociągnięciu (grubość,
  nasycenie, ziarno pigmentu), rama 3D (profil listwy, UV wzdłuż listwy) ze złoceniem (złoto płatkowe na czerwonym
  bolusie, wytarte krawędzie, patyna w zagłębieniach). Po scaleniu ze sceną — obraz w ramie na ścianę.
- [ ] **Laboratorium lądu — przełącznik „Okrągła”**: generator lądu na kuli (zastąpi drugie źródło lądu — z planety);
  wraca z nim skok (skreślony z punktu 6).
- [ ] **Widok mapy zawiniętej jako torus** (kształt, nie tylko topologia).
- [ ] **Laboratorium UI gry** (właściciel, 2026-11-13; kiedy i na jakim poziomie — do ustalenia): nakładka na scenę
  z menu gry, HUD, oknami i ekranami (start, pauza, ekwipunek). Propozycja miejsca w schemacie: UI gry jako dane
  sceny (jak prefabrykaty i zachowania), rysowane warstwą nad widokiem w ▶ Graj edytora i w laboratorium UI;
  własna skórka gry oddzielona od wyglądu laboratoriów (tokeny jak `ui/style/tokens.css`, ale osobne), elementy
  reagują na zdarzenia (`js/core/events.js`) i stan gry; w API polecenia dla AI. Materiał: HUD i okna ze Space,
  menu z Battle i Hive Hunger. Propozycja kolejności: po lekarzu sceny i Hive Hunger (wtedy są gry z HUD do porównania).
- [ ] **Laboratorium animacji** (do rozważenia): chód ludzi i stworów jako zachowanie, animacje modeli.
- [ ] **Grawitacja statków w kosmosie** (propozycja do decyzji): statki w scenie przyciągane przez ciała niebieskie,
  jak orbity.
- [ ] **Zasoby z nazwą dla jaskiń i roślin**: ustawienia z laboratoriów zapisane pod nazwą i użyte w scenie (jak ląd
  i morze).

## Język
- [ ] Przetłumaczyć okna laboratoriów na polski (teraz po polsku są pasek menu, strona startowa, tytuły okien standardowych, konsola i okno Wydajność).

## Pociąg (zachowanie „koło na szynie”)
- [ ] Dźwięki pociągu z aTrain (tarcie kół, łańcuch, sprzęg, styki szyn, zderzaki, koło o podkład).
- [ ] Dym i iskry z aTrain.
- [ ] Teren z aTrain: góra, skarpa, morze, las (fizyka zna go przez `sim.groundH`).
- [ ] Pogoda z aTrain.

## Modele — błędy znalezione przez doktora (po stronie gry, chyba że doktor nauczy się je naprawiać)
- [ ] Dziury: talerz anteny (haven), kadłub (swarmer), kadłuby (skimmer, barka, amfibia), półkula (scout).
- [ ] Migotanie zlicowanych ścian z teksturą: hauler, crawler.
- [ ] Wiszące części: scribe (korona), constructor, scout, skimmer, amfibia.
- [ ] Orzeł: działko 40 mm zasłonięte w części łuku.

## Grafika (do oceny)
- [ ] Mgławica w tle laboratorium ciał niebieskich ciemniejsza po przejściu na grafikę Battle.
- [ ] Poświaty silników statków słabsze niż wcześniej.

## Edytor sceny i okna
- [ ] Zakładki zamiast okien jedno pod drugim (pomysł właściciela, 2026-11-05) — raczej dla innych rzeczy niż okna paneli bocznych, np. dolny panel z zakładkami: Konsola · (później) konsola API dla AI · oś czasu. Do ustalenia, czego dokładnie dotyczy.

## Do przeniesienia
- [ ] SDF Walkers, laboratorium języka i obrazów (z NeuroLabPA): przenieść na okna z opcjami (w tym okna standardowe) — dziś to przewijane strony (`pageFlow`) we własnym stylu.

## Testy
- [ ] Pełny kitcheck po wersji 0.5.0 (przerwany; doktor przeszedł).

## Z remanentu (do decyzji — `docs/history/audit-2026-11.md`, „Stan wykonania”)
- [ ] D6: wspólne pomocnicze `$()` / `el()` (np. nowy plik w `js/labkit/`).
- [ ] F3: dane głowy człowieka jako plik `.bin` (wczytywany asynchronicznie).
- [ ] F4: kity Space jako importy ES zamiast globali `window.*`.
- [ ] Laboratorium skórek bez CSP (atrybuty `style=` w makiecie i w `js/labs/skins/skins.js`).

## Pomysły na laboratoria przeniesione z TODO.md w Battle
- [ ] Pixel Studio: edytor i import palet, warstwy, zaznaczanie i przesuwanie, czas klatki, podgląd kafelka 3×3, normalne koron drzew, więcej obiektów 3D.
- [ ] Laboratorium lądu: rzeki i jeziora, klify i skaliste brzegi, porty i miasta, roślinność (drzewa jako impostory), pojazdy naziemne / swobodny spacer przy 100 % lądu, LOD terenu za dalekim gridem.
- [ ] **Laboratorium malowania** (właściciel, na później): schematy malowania i kamuflażu okrętów jako osobne dane (dazzle, Admiralty disruptive, szarość pokojowa, oznaczenia epoki).
- [ ] Orzeł: sprawdzić z rysunkiem profilu/zdjęciami; stan z maja 1940; wariant ORP Sęp; ślad peryskopu w laboratorium wody.
- [ ] Budowle: pomosty i pirsy, porty (dźwigi, magazyny), latarnie morskie; szczegóły platformy (zęby zębatki, oświetlenie pokładu, płomień testu odwiertu); budowle w doktorze modeli.
- [ ] Rośliny: podszyt (paprocie, wrzos, trzcina), martwe drewno, płynne przejście model↔impostor, jesienne impostory, rośliny w laboratorium lądu.
- [ ] **Laboratorium skał** (właściciel, 2026-10-22): głazy, piarg, wychodnie i ściany skalne jako obiekty, rozmieszczane wg biomu i nachylenia.
- [ ] Więcej biomów (tundra, tropiki, wulkany…), potem inne planety (zestawy nieba, wody i biomów).
- [ ] Środowisko: ławice mgły, bryzgi przy silnym wietrze; okna nieba i pogody w laboratorium wody.
- [ ] Właściciel wybiera poziom starzenia i wygląd (do materiałów i ustawień grafiki gier).
- [ ] Proceduralne zniszczenia na hitboxach transformatora: model uszkodzeń, rozprzestrzenianie, odłamki, ogień i dym.
- [ ] Transformator: instancjonowanie powtarzalnych okuć i scalone materiały stanowisk na LOD0 (~30 wywołań rysowania).
- [ ] Laboratorium wody: cienie okrętów na wodzie, widok pod wodą, interakcja z brzegiem; wybór wariantu morza przez właściciela.
- [ ] Błyskawica: sprawdzić położenia z rysunkiem profilu; konfiguracje 1941/1942 jako warianty.
- [ ] Doktor: test obrotu stanowisk, strefy podniesienia/podmuchu, nieużywane materiały.
- [ ] Więcej prawdziwych okrętów w laboratorium.
