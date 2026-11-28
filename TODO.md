# GameLaboratory — do zrobienia

Propozycje czekające na decyzję i rzeczy odłożone. Zrobione przenoś do `CHANGELOG.md`.

## Następne w planie (`docs/guides/lab-breakdown.md`, „Kolejność — następne”)
- [ ] Punkt 9 — materiał z PatientZero (z historią): środowisko „organizm”, laboratorium tkanek, laboratorium patogenów.
  Na koniec (właściciel, 2026-11-21).
- Kreator budynków — etap 2 (CityExplorer: budynki z obrysów OSM z CityKit) odłożony: gry CityExplorer już nie
  rozwijamy (właściciel, 2026-11-21). Etap 1 — laboratorium miasta (0.82.0–0.83.0, adresy 0.89.1).

## Teren i pogoda — dalsze etapy (właściciel, 2026-11-21)
Etapy 1–3 zrobione (0.100.0–0.104.0: cienie nierówności, nawierzchnia i ściółka, laboratorium skał i skały na terenie).
- [ ] **Etap 4 — krzaki i kaktusy** (laboratorium roślin): leszczyna, głóg, tarnina; borówka, wrzos, paprocie;
  kosodrzewina; krzewy pustynne (kreozot, kolczaste, kępy suchych traw); kaktusy.
- [ ] **Etap 5 — nowe biomy** (laboratorium lądu): tajga i tundra, góry (alpejski), step i sawanna, mokradła — grunt,
  roślinność, skały. Duże: dzielić na części.
- [ ] **Rzeczy niesione wiatrem** (jak w GTA): liście, gazety, śmieci, kurz — efekt, nie obiekty gry; lista z włączaniem
  i wyłączaniem zależnie od środowiska (miasto, las, pustynia).
- [ ] **Wir pyłowy / piaskowy** (dust devil) przy tornadzie i pogodzie.
- [ ] **Kałuże po deszczu** z odbiciami; **odbicie trąby powietrznej** (lejek i wirująca chmura) w wodzie.
- [ ] **Cienie**: ostre i ciemne przy styku, miękkie i jaśniejsze dalej (PCSS), cień kontaktowy, jakość cieni w opcjach;
  prześwity słońca przez korony; przeświecanie liścia pod słońce i kartki.

## Do obgadania — tematy od właściciela (2026-11-21…26)
Listy pojęć do omówienia: co warto, gdzie (które laboratorium), ile kosztuje. ✔ — jest, ◐ — częściowo, ○ — brak.
- **Cienie i światło**: ◐ okluzja otoczenia (teren: widoczność nieba z mapy wysokości; MatKit: mapy AO; brak SSAO /
  GTAO / HBAO+), ○ PCSS, ○ kaskady cieni (CSM), ○ cienie kontaktowe, ○ GI (VXGI, SDF), ○ ray tracing, ✔ mapy cieni,
  ○ światło wolumetryczne / snopy (god rays), ○ mgła wolumetryczna (froxele), ○ profile IES.
- **Materiały**: ◐ przeświecanie / SSS (trawa pod światło; brak SSS skóry, liści, wosku), ◐ transmisja i refrakcja
  (woda), ○ kaustyka, ◐ paralaksa (fasady CityKit; brak POM w MatKit), ✔ filtrowanie anizotropowe (jakość silnika),
  ○ odbicia anizotropowe, ✔ clearcoat (statki), ○ iryzacja cienkiej warstwy, ◐ odbicia (mapa otoczenia z nieba,
  odbicia morza; brak SSR i sond odbić), ✔ triplanar (RockKit), ◐ kalkomanie (uszkodzenia), ○ teksturowanie
  stochastyczne, ✔ starzenie (mech na górnych ścianach skał, MatKit).
- **Atmosfera**: ◐ niebo (SkyKit: niebo z pogodą; nie fizyczne rozpraszanie Rayleigha i Mie), ✔ ACES i bloom (potok
  kamery: także AgX, Hable).
- **Proceduralność**: ✔ szum gradientowy i fBm, ◐ Voronoi / Worley (piana morska), ◐ zniekształcanie domeny (teren),
  ✔ erozja kropli (LandKit; brak termicznej), ○ marching cubes / dual contouring (prawdziwe jaskinie i nawisy), ○ WFC,
  ◐ L-systemy (PlantKit rośnie drzewa własnymi regułami), ✔ SDF i raymarching (postacie SDF), ○ instancjonowanie na GPU
  z compute (WebGL2 nie ma compute — WebGPU), ○ pękanie Voronoi, ◐ IK (nogi zwierząt LifeKit), ○ dynamika drugiego
  rzędu, ○ aktywne ragdolle, ○ boidy (stada, ławice, roje), ◐ animacja w shaderze (wiatr w roślinach; brak VAT).
- **Post-processing**: ✔ bloom, winieta, ziarno, aberracja chromatyczna, wyostrzanie, tonowanie, ◐ wygładzanie (MSAA,
  FXAA w części laboratoriów; brak SMAA, TAA, FSR), ○ głębia ostrości z bokeh, ○ LUT 3D, ○ kontury (Sobel), ○ filtry
  odszumiające (bilateralny, À-Trous) — potrzebne dopiero przy SSAO lub ray tracingu.
- **Dźwięk**: ◐ filtry DSP i obwiednie (SfxKit), ○ synteza modalna (zderzenia z materiału i masy), ○ synteza
  granularna, ○ modelowanie fizyczne (Karplus-Strong, falowody), ◐ pogłos (splotowy w muzyce; brak akustyki
  przestrzeni z geometrii), ○ warstwowanie i przejścia muzyki adaptacyjnej, ○ łańcuchy Markowa i gramatyki muzyczne,
  ✔ synteza formantowa i mowa „gibberish” (VoiceKit), ○ synteza dyfonowa, ○ modulacja głosu stanem postaci,
  ○ lip-sync (wizemy).
- **HLSL / GLSL**: GameLaboratory pisze shadery w GLSL (WebGL2, three.js r186); HLSL dotyczy DirectX — do omówienia,
  czy i jak (np. przy WebGPU: WGSL).

## Pomysły (właściciel, czekają na decyzję)
- [ ] **Wiki w menu Pomoc**: artykuły o laboratoriach, modelach, środowiskach i zjawiskach, z małymi ilustracjami
  generowanymi w laboratoriach (`ArtApi`) — bez wysokiej rozdzielczości i efektów, chyba że ilustracja tego wymaga.
  Język wiki (właściciel, 2026-11-27): proste zwroty objaśniane analogiami, przykładami i porównaniami, a obok nich
  nazwy fachowe (np. materiały i odbicia — PBR), tak żeby zrozumiał każdy, a profesjonalista też się odnalazł.
- [ ] **Wspólny silnik brył sztywnych na lądzie** (właściciel, 2026-11-27): jeden świat brył zamiast dwóch połączonych
  (przedmioty `land/items.js` — impulsy, SAT, krok 1/240 s; odłamki budynków `land/destruct/physics.js` — narożniki,
  wiatr; dziś łącznik `land/bodies-link.js`), z powłokami deformacji jako bryłami miękkimi. Wyniki laboratoriów
  (przedmioty, maszyny złomowiska, przeładowarka, zniszczenie, deformacja) porównane przed i po.
- [ ] **Laboratoria budowli i roślin na wspólnej scenie bazowej** (punkt 3 porządków, 2026-11-27; skały, przedmioty
  i efekty · ląd już przeszły): budowle mają własne morze z płyciznami i przyboją z wysokości budowli (potrzebna
  funkcja sceny bazowej „płycizny z wysokości modelu” bez rysowania terenu), rośliny — własny krajobraz (teren i las),
  który powiela teren i roślinność sceny bazowej.
- [ ] **Zapisane ustawienia laboratoriów przez `js/labs/shared/saved.js`** (właściciel, 2026-11-27): stopniowo, przy
  okazji zmian w danym laboratorium (dziś: mechanika, ulice).
- [ ] **Najczęstsze błędy AI** (właściciel, 2026-11-27): dokument w Pomocy (może w wiki) — błędy, które AI (Claude)
  popełnia najczęściej przy modelach i scenach, i które z nich rozwiązuje doktor modeli.
- [ ] **Laboratorium sztuki — tryb 3D**: obraz jako płaszczyzna 3D (mapa normalnych z wysokości farby, mapa szorstkości:
  werniks błyszczy, sucha farba matowa), obracanie obrazu i ruchome światło, nierówny barwnik w pociągnięciu (grubość,
  nasycenie, ziarno pigmentu), rama 3D (profil listwy, UV wzdłuż listwy) ze złoceniem (złoto płatkowe na czerwonym
  bolusie, wytarte krawędzie, patyna w zagłębieniach). Po scaleniu ze sceną — obraz w ramie na ścianę.
- [ ] **Laboratorium lądu — przełącznik „Okrągła”**: generator lądu na kuli (zastąpi drugie źródło lądu — z planety);
  wraca z nim skok (skreślony z punktu 6).
- [ ] **Widok mapy zawiniętej jako torus** (kształt, nie tylko topologia).
- [ ] **Laboratorium scenariusza** (właściciel, 2026-11-13): treści i dialogi podpinane pod postacie i narratora —
  sceny scenariusza, kwestie, wybory, warunki (stan gry, zdarzenia), teksty po angielsku i po polsku; dane jako zasób
  z nazwą, w scenie przypięte do obiektów (postać, narrator), w API dla AI.
- [ ] **Opisy statków i rzeczy w grze** (właściciel, 2026-11-13): opisy modeli i przedmiotów (nazwa, historia, dane)
  pisane przy laboratorium i podpinane pod prefabrykaty — do wiki, podpowiedzi i ekranów gry; może część
  laboratorium scenariusza.
- [ ] **Automatyczna wiki gry** (właściciel, 2026-11-14): wiki tworzona sama z tego, co jest w grze (scena,
  prefabrykaty, zasoby) — wszystkie modele, postacie, rośliny, pojazdy, efekty, drzewka; każda strona: nazwa, opis
  (z „Opisów statków i rzeczy”), miniatura renderowana z modelu, dane (wymiary, prędkość, środowisko, zachowania),
  kategoria, powiązania; łączy się z „Wiki w menu Pomoc” (wiki silnika) i z obrazami z laboratorium sztuki.
- [ ] **System statystyk i stanu gry** (właściciel, 2026-11-14, do przemyślenia): statystyki obiektów (np. HP postaci
  i przeciwników) i matematyka gry (wzory, modyfikatory — np. z drzewek i przedmiotów), połączone z zapisem stanu gry
  (statystyki, położenie obiektów i ich zmiany w czasie). Na schemacie silnika: moduły Rules i Save/Load.
- [ ] **Laboratorium animacji** (do rozważenia): chód ludzi i stworów jako zachowanie, animacje modeli.
- [ ] **Grawitacja statków w kosmosie** (propozycja do decyzji): statki w scenie przyciągane przez ciała niebieskie,
  jak orbity.

## Pełne połączenie laboratoriów — przekształcenie w silnik (właściciel, 2026-11-13)
Cel: każde laboratorium jest edytorem jednej części silnika, a jego wynik trafia do sceny (i do gier) jako prefabrykat
albo zasób z nazwą — bez osobnych światów w laboratoriach. Spis stanu (0.65.0):

- **Już połączone ze sceną:**
  - przez prefabrykaty (modele) — pojazdy: kosmos, woda, ląd; ciała niebieskie, moduły bazy, budowle, rośliny,
    jaskinie, życie (stwory), ludzie i broń, bryły z bloków (domyślne);
  - przez zasoby modelu (pole `asset` obiektu) — bryła z bloków (0.66.0);
  - przez zasoby z nazwą — morze (woda), ląd (ląd), pogoda i światło (wygląd), wygląd kamery (filtry), niebo kosmosu
    (ciała niebieskie), UI gry (UI gry), materiał (materiały), roślinność (rośliny, 0.94.0); układ planetarny (układy) i przedmioty bohatera jako modele (0.95.0).
- [ ] **Materiały → modele i scena:** modele biorą materiały z MatKit (rodzina po rodzinie, doktor modeli, porównanie
  obrazów); w scenie i w API pole materiału obiektu (podmiana np. kadłuba na zardzewiałą stal).
- [ ] **Materiały ↔ sztuka:** powierzchnie 2D laboratorium sztuki z generatora MatKit (ten sam papier, drewno, metal
  w 2D i 3D).
- [ ] **Sztuka → scena:** obraz z laboratorium sztuki jako zasób (zrobione w 0.74.0: zasób `image`) i obiekt sceny (płaszczyzna z fakturą farby, rama 3D
  ze złoceniem — tryb 3D sztuki).
- [ ] **Rozległe jaskinie** (właściciel, 2026-11-14): jaskinia dzielona na kawałki liczone wokół gracza (dziś CaveKit liczy
  całą jaskinię naraz, do ok. 2,4 mln próbek — przy dużej jaskini oczka siatki rosną i ściany tracą szczegóły);
  wejście do jaskini wycięte w terenie lądu — połączenie lądu i podziemia.
- [ ] **Łączenie terenów zamiast osobnego laboratorium** (właściciel, 2026-11-14): połączenia w jednym generatorze
  (morze z ujściem rzeki, rzeka w górach) robi laboratorium lądu; między generatorami — operacje sceny:
  - obiekt **„wejście jaskini”**: postawiony na terenie lądu sam wycina otwór w zboczu i łączy się z jaskinią;
  - **reguły styków w lekarzu sceny** (uniwersalne, zgłasza i proponuje poprawkę): dziura albo szczelina między
    terenami (wejście jaskini nie dochodzi do powierzchni), uskok wysokości na styku, niezgodny poziom wody
    (jezioro w jaskini a morze obok), rzeka kończąca się w niczym, obiekt wiszący nad otworem albo wbity w ścianę
    jaskini, światło przeciekające tam, gdzie go nie powinno być (słońce w jaskini); później — wygląd z kilku ujęć
    (porównanie zrzutów).
- [x] **Powierzchnia (surface):** rozliczona (właściciel, 2026-11-28): zostaje osobnym laboratorium w grupie terenu
  (ląd · jaskinie · powierzchnia) — ma glob, ląd na kuli, niebo układu, zejście, jazdę i bazę, których ląd nie ma.
- [ ] **Edytor stworów (creator), transformator (transform):** wynik jako prefabrykat sceny.
- [ ] **Postacie SDF i pixel art** (generator zombie, Kostnica SDF, SDF Walkers, Pixel Studio): postacie i sprite'y jako
  zasoby (np. dla gier 2D i HUD); laboratoria języka i obrazów — rozstrzygnąć, czy należą do silnika.
- [ ] **Skala (scale):** jednostki i skala sceny (kosmos: prawdziwe odległości a model) — wspólne ustawienie silnika.
- [ ] **Silnik bez laboratoriów:** jedno wejście dla gier (scena + zasoby + zachowania + UI gry + zdarzenia) — gra
  ładuje scenę i gra, bez edytora; opis API silnika w jednym miejscu (`docs/guides/engine-architecture.md`).

## Materiały (laboratorium materiałów, 0.63.0)
- [ ] Przenieść materiały modeli na MatKit stopniowo, rodzina po rodzinie (doktor modeli, porównanie obrazów):
  budowle (`js/models/structures/materials.js`), okręty (`js/render/sea/materials.js`, `js/models/ships-sea/materials.js`),
  pojazdy, statki kosmiczne; potem teren i powierzchnie 2D laboratorium sztuki.
- [ ] Złocenie ramy; faktura farby jako mapa nierówności.

## Efekty
- [ ] **Dym i kurz w wodzie i na lądzie** (właściciel, 2026-11-13: na później; może być związane z pogodą i wiatrem):
  efekty, które w każdym środowisku zachowują się inaczej (w kosmosie bez grawitacji, na lądzie opadają i unosi je
  wiatr, w wodzie bąble idą w górę).

## Język
- [ ] **Laboratorium tłumaczenia:** tłumaczenie gry (teksty UI, dialogi, opisy) na języki; podstawowe: polski,
  angielski, ukraiński. Dwa rodzaje przekształcenia gry: LTR (od lewej do prawej) i RTL (od prawej do lewej —
  odwrócony układ UI, kierunek tekstu).
- [ ] **Przełącznik kierunku LTR / RTL dla graczy z zagranicy — w grach i laboratoriach** (właściciel, 2026-11-21: na
  końcu, gdy projekt przestanie się mocno zmieniać). Jedna wersja dla obu kierunków, bez osobnej wersji RTL: atrybut
  `dir="rtl"` na stronie (i na nakładce UI gry), przeglądarka odwraca układ, który jest pisany właściwościami logicznymi
  CSS (zasada w `CLAUDE.md`, „Wygląd (UI)”). Do zrobienia wtedy: wybór kierunku w Opcjach laboratoriów i w Opcjach UI gry
  (automatycznie z języka albo ręcznie), przejście starych arkuszy (`left`/`right` → odpowiedniki logiczne), miejsca, gdzie
  kierunek ma znaczenie (paski postępu, strzałki, suwaki, kolejność przycisków), sprawdzenie zrzutów w obu kierunkach.
- [ ] Przetłumaczyć okna laboratoriów na polski (teraz po polsku są pasek menu, strona startowa, tytuły okien standardowych, konsola i okno Wydajność).

## Modele — błędy znalezione przez doktora (po stronie gry, chyba że doktor nauczy się je naprawiać)
- [ ] Dziury: talerz anteny (haven), kadłuby (skimmer, barka, amfibia), półkula (scout). (Kadłub swarmera to był fałszywy alarm — nierówna skala, doktor 1.5.1.)
- [ ] Migotanie zlicowanych ścian z teksturą: hauler, crawler; z Tornado.io (laboratorium mechaniki): hamulec tarczowy (`mech/brake`, `mech/brake-1`), falownik 7,5 kW (`mech/vfd-1`).
- [ ] Wiszące części: scribe (korona), constructor, scout, skimmer, amfibia.
- [ ] Orzeł: działko 40 mm zasłonięte w części łuku.
- [ ] Rośliny (PlantKit): otwarte końce pni i gałęzi — doktor widzi tył kory przez otwór (`seethrough`; pień w ziemi, końce gałęzi w liściach).

## Grafika (do oceny)
- [ ] Mgławica w tle laboratorium ciał niebieskich ciemniejsza po przejściu na grafikę Battle.
- [ ] Poświaty silników statków słabsze niż wcześniej.

## Edytor sceny i okna
- [ ] Zakładki zamiast okien jedno pod drugim (pomysł właściciela, 2026-11-05) — raczej dla innych rzeczy niż okna paneli bocznych, np. dolny panel z zakładkami: Konsola · (później) konsola API dla AI · oś czasu. Do ustalenia, czego dokładnie dotyczy. Stan (2026-11-27): konsola ma zakładki (Dziennik i własne strony, np. API w edytorze) i rodzaje wpisów jako zakładki z ikonami.

## Do przeniesienia
- [ ] SDF Walkers, laboratorium języka i obrazów (z NeuroLabPA): przenieść na okna z opcjami (w tym okna standardowe) — dziś to przewijane strony (`pageFlow`) we własnym układzie (kolory już z tokenów — motywy Dzień i Noc).

## Z remanentu (listopad 2026, do decyzji)
- [ ] D6: wspólne pomocnicze `$()` / `el()` (np. nowy plik w `js/labkit/`).
- [ ] F3: dane głowy człowieka jako plik `.bin` (wczytywany asynchronicznie).

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
