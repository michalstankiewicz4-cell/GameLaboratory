# Edytor sceny — zmiany

Wersja: `ui/data/versions.js` (`editor/index.html`). `x.y.z` — y: nowa funkcja, z: poprawka. Krótki wpis także w głównym
`CHANGELOG.md`.

## 0.48.0 — 2026-11-21

### Dodane
- **Star system** (Ciała niebieskie): cały układ planetarny z laboratorium układów (zasób „system”) z krążącymi orbitami;
  światło w kosmosie od jego gwiazdy.
- **Przedmioty bohatera (światło)**: latarka, lampa naftowa, światło chemiczne, zapalniczka, ekran telefonu — ze swoim
  światłem i migotaniem.

## 0.47.0 — 2026-11-21

### Dodane
- Środowisko → **Roślinność**: lasy, zagajniki i trawa z laboratorium roślin (zasób „vegetation”) na terenie lądu sceny,
  według biomów terenu; API `env { vegetation }`, lekarz sceny zgłasza brak zasobu i roślinność bez terenu.

## 0.46.0 — 2026-11-21

### Dodane
- ▶ Graj: **zmienna pogoda** — scena ze światłem z zasobu pogody z włączoną zmienną pogodą (laboratorium wyglądu) sama
  zmienia pogodę w grze (`js/scene/weather.js`); po Stop wraca pogoda z zasobu.

## 0.45.0 — 2026-11-20

### Dodane
- ▶ Graj: dźwięki maszyn złomowiska (agregat, zgniatanie, ogień, cewka pieca, wylew, przenośnik, sztabki) i przeładowarki
  (hydraulika, szczęki, ładunek); Błyskawica i Abrams z dźwiękiem turbiny.

## 0.44.0 — 2026-11-20

### Dodane
- Środowisko: **Muzyka** i **Muzyka akcji** (nastroje, piosenki, zapisane w laboratorium muzyki) — w ▶ Graj muzyka akcji
  po wybuchach i strzałach przez 20 s; API `env { music, musicAction }`, `music { play | action }`.

## 0.43.0 — 2026-11-20

### Dodane
- ▶ Graj: UI gry ze sceny gra dźwięki swojej skórki (szyna interfejsu, Opcje → Dźwięk → Interface); kwestie dialogu
  głosem postaci (`voices` w UI albo `voice` w poleceniu API `ui say`).

## 0.42.0 — 2026-11-20

### Dodane
- ▶ Graj: dźwięki modeli (drzwi, właz, podwozie, klapy — zdarzenia `onSound`) w miejscu części; część robocza modelu
  (drzwi, właz, owiewka, rampa) jako akcja **work** (klawisze 1…9, API `act`).
- Silniki pojazdów z danych modeli (`info.sounds.engine`).
- Podgląd zasięgu dźwięku: przy zaznaczonym obiekcie z dźwiękiem dwie kule — pełna głośność i granica słyszalności
  (10%); suwak **Zasięg dźwięku** w oknie Właściwości (pole `soundRange`; 0 — domyślny dla dźwięku), API `set { soundRange }`.

## 0.41.0 — 2026-11-20

### Dodane
- Okno Właściwości obiektu: **Dźwięk** (gotowe dźwięki po kategoriach, tła miejsc, zapisane w laboratorium efektów
  dźwiękowych) — gra w ▶ Graj w miejscu obiektu. W grze także silniki pojazdów, strzały, wybuchy i dźwięk efektów.
- API: `sound` w `add` / `set`, polecenie `sound`.

## 0.40.0 — 2026-11-20

### Dodane
- ▶ Graj: mikser silnika (`js/audio/mixer.js`) bierze głośności z ustawień gracza (Opcje → Dźwięk UI gry), słuchacz
  dźwięku przestrzennego podąża za kamerą.

## 0.39.1 — 2026-11-20

### Zmienione
- Budynki miasta: zasób `building` z budynkiem Warszawy z OpenStreetMap (pole `landmark`, z laboratorium miasta) stawia
  ten budynek.

## 0.39.0 — 2026-11-20

### Dodane
- Budynki miasta (CityKit z laboratorium miasta): rodzina „Budynki miasta”, `city/<rodzaj>`, z wersją daleką (wypalona
  fasada z paralaksą) i polem `asset` (budynek zapisany w laboratorium). Okna budynków świecą po zmroku (z pory dnia
  światła sceny).

## 0.38.0 — 2026-11-20

### Dodane
- Szczegóły z odległości (LOD): modele z wersją daleką przełączają się na nią daleko od kamery (próg z wielkości modelu
  × ustawienie gracza w grze); w grze także poziom jakości silnika gracza (tekstury, gęstość efektów, detal wody,
  zasięg widzenia, cienie drobnych części) — po Stop pełna jakość.

## 0.37.0 — 2026-11-20

### Dodane
- ▶ Graj z ustawieniami gracza (`js/gameui/settings.js`, menu Grafika i Sterowanie UI gry): rozdzielczość, wygładzanie,
  cienie i ich jakość, światła dynamiczne, poświata, jasność, nasycenie, licznik klatek; czułość myszy; klawisze
  czynności (zmienione w menu Sterowanie — sterowanie bierze kody klawiszy z ustawień). Po Stop — wygląd edytora.

## 0.36.0 — 2026-11-20

### Dodane
- W grze: opony, beczki, puszki i garnki toczą się (walce); przeładowarka czuje, w co uderza (odrzut), a wysięgnik
  i ramię wyginają się w łuk pod ładunkiem.

### Poprawione
- Maszyny, platforma, ogrodzenie i skup w skali obiektu zderzają się w swojej wielkości (wcześniej zderzacze miały
  wielkość modelu w skali 1).

## 0.35.1 — 2026-11-19

### Poprawione
- Zgniatarka do puszek (JunkKit v1.0.1): niższa ścianka kosza od strony zgniatarki — w grze puszki z zsypu wpadają do kosza.

## 0.35.0 — 2026-11-19 (złomowisko w grze)

### Dodane
- W grze (▶ Graj): **przeładowarka z chwytakiem** jeździ i chwyta (zachowanie `grapple`: W/S, A/D, ←/→ obrót, ↑/↓
  wysięgnik, R/F ramię, Spacja chwytak; akcja `grab`), **przedmioty** złomowiska są bryłami sztywnymi (`item`: spadają,
  przewracają się, układają), **maszyny** pracują (`machine`: zgniatarki, piece, linia odlewnicza; akcje `run`, `power`,
  `pour`, `diverter`; piec indukcyjny wylewa do linii odlewniczej stojącej przy wylewie), platforma, ogrodzenie i skup
  są bryłami (`solid`). Wszystko na wspólnym świecie przedmiotów; sztabki i puszki zgniecione znikają po „Stop”.
- Linia stanu: ładunek przeładowarki; stan maszyny, gdy gracz ją wybrał.

## 0.34.0 — 2026-11-19 (złomowisko)

### Dodane
- Rodzina modeli **Złomowisko** (JunkKit, z gry Złomowisko): przedmioty (opony, puszki, garnek, gazety, karton, beczka,
  sztabki), maszyny (piec na papier, zgniatarki, piec indukcyjny, linia odlewnicza), platforma, ogrodzenie z bramą,
  punkt skupu i przeładowarka z chwytakiem; spód modelu w punkcie obiektu; „Otwórz w laboratorium” — przedmioty,
  budowle albo pojazdy (ląd).

## 0.33.1 — 2026-11-14

### Dodane
- Podziemie: „Poświata w jaskini” (domyślnie włączona; wyłączona — prawdziwa ciemność).

## 0.33.0 — 2026-11-14 (podziemie)

### Dodane
- Powierzchnia **Podziemie**: cała plansza to jaskinia z laboratorium jaskiń (wybór w oknie Środowisko, `env.cave`);
  bez nieba i słońca. Model *Jaskinia* bierze zapisaną jaskinię (pole „Jaskinia” w oknie Obiekt).

## 0.32.0 — 2026-11-14 (uszkodzenia statków)

### Zmienione
- Dym, iskry, ogniki, spalenizna i wybuch statków (ShipKit) rysuje laboratorium efektów; polecenie `effect` zna
  `smoke`, `sparks`, `explosion`, `scorch`, `ember`.

## 0.31.1 — 2026-11-14

### Zmienione
- Okno Obiekt: „Efekt strzału” w grupach Lot i W miejscu, z odznakami wielkości przy nazwie.

## 0.31.0 — 2026-11-14 (fala skanu i efekty roju)

### Dodane
- Akcja „skan” statków w ▶ Graj rysuje falę skanu z laboratorium efektów; polecenie `effect` zna nowe efekty
  (laser, przebijacz, burza, holowanie, cięcie, pole, skok, znacznik, tunel, skan).

## 0.30.0 — 2026-11-14 (efekt strzału)

### Dodane
- Statki, które strzelają: okno Obiekt — „Efekt strzału” (efekt z laboratorium efektów albo zapisany), pole `shot`
  w danych sceny i w API; w ▶ Graj akcja „ogień” rysuje wybrany efekt.

## 0.29.0 — 2026-11-13 (efekty)

### Dodane
- Efekty z laboratorium efektów w scenie: polecenie API `effect` (strzał, kula plazmy, odłamki, błyskawica, piorun
  łańcuchowy, kula cieczy, czarna dziura albo zapisany efekt) — zdarzenie `effect`, świat je rysuje.

## 0.28.0 — 2026-11-13 (zasób modelu)

### Dodane
- Okno Obiekt: model z rodziny Bloki wybiera bryłę zapisaną w laboratorium bloków („Bryła z bloków”, albo model
  domyślny); zapis bryły w laboratorium przebudowuje ją w edytorze. API: `add` / `set` z `asset`.

## 0.27.0 — 2026-11-13 (bryły z bloków)

### Dodane
- Rodzina prefabrykatów **Bloki** (laboratorium bloków): planetoida, sześcian, dwie kule, pas skał, kulki testowe.

## 0.26.0 — 2026-11-13 (UI gry w ▶ Graj)

### Dodane
- Właściwości środowiska: **UI gry** (zasób z laboratorium UI gry); w ▶ Graj nakładka: menu, HUD ze stanem gracza,
  okna, dialogi; Esc otwiera pauzę UI. API: `env.ui`, polecenie `ui`.

## 0.25.0 — 2026-11-13 (Badaj, kafelek lekarza sceny)

### Zmienione
- Przycisk lekarza sceny: **Badaj** (EN: Examine); w oknie — **Zbadaj scenę**.

### Dodane
- `editor/index.html?doctor` (kafelek „Lekarz sceny” na stronie startowej): edytor od razu z oknem lekarza i badaniem.

## 0.24.0 — 2026-11-13 (lekarz sceny)

### Dodane
- Przycisk **Sprawdź** i okno **Lekarz sceny**: problemy w scenie (model w złym środowisku, pod gruntem albo
  w powietrzu, obiekty wchodzące w siebie, brakujące zasoby z nazwą, zachowania niepasujące do modelu lub środowiska,
  orbity, koszt ponad budżet), kliknięcie zaznacza obiekt, **Popraw** wykonuje proponowaną poprawkę (Cofnij ją
  odwraca). Sprawdza samo po każdej zmianie, niczego nie zmienia samo.
- API: polecenie `check`.

## 0.23.0 — 2026-11-07 (słońce i czarna dziura w kosmosie)

### Dodane
- Kosmos: słońce postawione w scenie oświetla planety i statki; czarna dziura soczewkuje obraz; słońce ma flarę
  i promienie światła.

## 0.22.0 — 2026-11-07 (budowa bazy)

### Dodane
- **Budowa bazy**: moduł bazy jako hologram pod kursorem (turkusowy — pasuje, czerwony — nie, z powodem w linii stanu),
  kliknięcie stawia, R obraca, Esc kończy; zachowanie **Budowa** — w grze moduł rośnie przez czas budowy.

### Poprawione
- Zwykły grunt (ląd bez terenu) znów widoczny.

## 0.21.0 — 2026-11-07 (lądowanie)

### Dodane
- Zachowanie **Lądowanie** dla statków kosmicznych nad lądem (domyślne na lądzie): spacja — silniki podnośne, W / S —
  silnik główny, strzałki — pochylenie i kurs, Q / E — przechył; w linii stanu wysokość i prędkość pionowa.

## 0.20.3 — 2026-11-07

### Zmienione
- Ląd z planety: barwa gruntu planety (regolit, rdza, bazalt) i morze lawy na planetach lawowych.

## 0.20.2 — 2026-11-07

### Zmienione
- Ląd z planety bez atmosfery (Luna, Mercury): domyślne niebo — kosmosu; z atmosferą — niebo dzienne w jej odcieniu.

## 0.20.1 — 2026-11-07

### Zmienione
- Ląd z planety (zasób „ląd” z laboratorium lądu z gruntem planety): edytor najpierw ładuje kity BodyKit.

## 0.20.0 — 2026-11-07 (akcje statków jako zdarzenia)

### Dodane
- **Akcje statków kosmicznych w grze**: klawisze 1…9 (lista w linii stanu po ▶) — ogień, skan, druk, wyłączenie,
  zniszczenie i własne akcje statku. Każda akcja to zdarzenie „action” na szynie zdarzeń (zapis w dzienniku konsoli).
- API: `act` (akcja obiektu w czasie gry), `actions` (lista akcji), `events` (ostatnie zdarzenia).

## 0.19.0 — 2026-11-07 (orbity)

### Dodane
- Zachowanie **Orbita** dla ciał niebieskich: w grze (▶) ciało krąży pod grawitacją środka — wybranego we
  Właściwościach („Krąży wokół”) albo najbliższego cięższego ciała (czarna dziura > słońce, pulsar > olbrzym > planeta >
  księżyc, planetoida, kometa); okres w sekundach (domyślnie 60). Księżyc wokół planety, która krąży wokół słońca.

## 0.18.0 — 2026-11-07 (ludzie i stwory)

### Dodane
- Rodziny **Ludzie** (Human I, Human II z laboratorium ludzi) i **Stwory** (Plains strider z laboratorium życia) —
  parametry domyślne, na postoju oddychają i się rozglądają (chód „idle”); chodzenie jako zachowanie — później.

## 0.17.0 — 2026-11-07 (ciała niebieskie)

### Dodane
- Rodzina **Ciała niebieskie** (23 ciała z laboratorium ciał niebieskich: planety lawowe, ziemiopodobne, lodowe,
  pustynne, w chmurach, księżyce, bez atmosfery, gazowe olbrzymy, pierścienie, pulsar, słońce, kometa, planetoida,
  czarna dziura) — model o promieniu 50 m (wielkość skalą obiektu), oświetlony słońcem sceny, obraca się.

## 0.16.1 — 2026-11-07

### Poprawione
- Dwuklik w wiersz modelu (dodawanie modelu) nie zaznacza już tekstu.

## 0.16.0 — 2026-11-07 (dodawanie modelu: zakładki z ikonkami)

### Zmienione
- **Dodawanie modelu** w oknie Scena: zamiast jednej długiej listy — zakładki kategorii z ikonkami (podpowiedź: nazwa
  kategorii i liczba modeli), pod nimi modele kategorii, każdy z przyciskiem + (albo dwuklik).

## 0.15.0 — 2026-11-07 (moduły bazy)

### Dodane
- Rodzina **Moduły bazy** (BaseKit z laboratorium budynków): lądowisko, habitat, panele słoneczne, kopalnia, rafineria,
  magazyn — gotowe, z pracującymi światłami i wiertłem; ładowane z kitami ze Space przy pierwszej potrzebie.

## 0.14.0 — 2026-11-07 (rośliny i jaskinie)

### Dodane
- Rodzina **Rośliny** (8 gatunków z laboratorium roślin: świerk, sosna, brzoza, dąb, palma daktylowa, akacja,
  jałowiec, łoboda) — jedna roślina gatunku, z wiatrem w liściach; rodzina **Jaskinie** (jaskinia z ustawień
  domyślnych laboratorium jaskiń: korytarze, komory, nacieki, jeziorka).

## 0.13.0 — 2026-11-06 (morze zna teren)

### Zmienione
- Morze przy terenie z laboratorium lądu zna teren: płycizny, przybój, barwy i prądy wód, lód, olej, boje na granicy
  mapy (wspólna scena bazowa, jak w laboratorium lądu).

## 0.12.0 — 2026-11-06 (łaziki)

### Dodane
- Rodzina **Łaziki** (Scout, Hauler, Crawler, Constructor) — w grze jazda po lądzie: W / S gaz i hamulec, A / D skręt
  (gąsienicowy skręca hamując gąsienicę). Roboty morskie na postoju stoją równo na wodzie (bez sprężyn modelu).

## 0.11.1 — 2026-11-06

### Poprawione
- Samolot: → i E obracają teraz w prawo (wcześniej odwrotnie).

## 0.11.0 — 2026-11-06 (roboty morskie)

### Dodane
- Rodzina **Roboty morskie**: ślizgacz, barka, nurek, amfibia; w grze zachowanie „mała jednostka na wodzie”
  (`js/behaviors/water/craft.js`) — W / S maszyny, A / D ster, ↓ ↑ głębiej / płycej (nurek; na pasku stanu głębokość).

## 0.10.0 — 2026-11-06 (jazda po lądzie)

### Dodane
- Polonez, Abrams i Urbino 18 jeżdżą w grze (zachowanie „jazda po lądzie”, `js/behaviors/land/drive.js`):
  W / S — gaz i hamulec / wsteczny (jak pedał, działa, póki wciśnięty), A / D — skręt. Koła, zawieszenie i światła
  hamowania z modelu.

## 0.9.0 — 2026-11-06 (niebo przy każdej powierzchni)

### Zmienione
- Lista **Niebo** przy każdej powierzchni: domyślne (morze i ląd — dzienne, kosmos — Deep field), dzienne, gotowe tła
  kosmosu, zapisane. Kity ze Space ładują się w tle po starcie.

## 0.8.0 — 2026-11-06 (ląd, pogoda, wygląd kamery z laboratoriów)

### Dodane
- Powierzchnia **Ląd** z listą **Ląd**: płaski grunt albo teren zapisany w laboratorium lądu (`env.land`); morze
  wokół terenu (lista Morze działa i tu). „Na powierzchnię” i nowy model stają na terenie.
- **Światło**: cztery gotowe i pogoda zapisana w laboratorium wyglądu.
- **Wygląd kamery** z zasobów (profile laboratorium filtrów przeniesione do `gameLab.assets.v1`).
- W grze okręty wchodzą na mielizny terenu, samolot ląduje i rozbija się na jego wysokości.

## 0.7.0 — 2026-11-06 (kosmos)

### Dodane
- Powierzchnia **Kosmos** i lista **Niebo** (gotowe tła i niebo zapisane w laboratorium ciał niebieskich).
- Rodzina **Statki kosmiczne**: Codewing, Scribe (dron), Swarmer, Haven (stacja); na postoju świecą i pracują jak
  w laboratorium (`tick`), w grze zachowanie **ciąg w próżni**: W / S silnik główny i wsteczny (dźwignia),
  ↑ ↓ pochylenie, ← → kurs, Q / E przechył; bez klawiszy silniczki zatrzymują obrót.
- Kity ze Space ładują się przy pierwszej potrzebie (karta ładowania „Ładowanie kitów kosmosu”).

## 0.6.0 — 2026-11-05 (morze z laboratorium wody)

### Dodane
- Właściwości → Środowisko → **Morze**: domyślne albo zasób zapisany w laboratorium wody (`js/scene/assets.js`).
  Zapis w laboratorium w innej karcie od razu pojawia się na liście. Pole `env.sea` w scenie (nazwa zasobu).
- Morze z nazwą, którego nie ma w tej przeglądarce: zostaje w scenie, widać domyślne i ostrzeżenie na pasku.
- API: `assets` i `env` z `sea`. Okręty w grze kołyszą się na falach wybranego morza.

## 0.5.0 — 2026-11-05 (cofnij / ponów)

### Dodane
- **Cofnij / Ponów** na pasku narzędzi i klawisze Ctrl+Z, Ctrl+Y (albo Ctrl+Shift+Z). Historia w `js/core/store.js`:
  przed każdą zmianą danych stan sceny, do 100 kroków, tylko w pamięci karty. Pisanie w jednym polu i ciągnięcie
  uchwytu to jeden krok (zmiany tego samego pola w ciągu 0,8 s, każde przeciągnięcie osobno); lista poleceń API to
  jeden krok (`store.group`). Cofnięte usunięcie buduje model od nowa (z kartą ładowania). W czasie gry wyłączone.

## 0.4.0 — 2026-11-05 (API dla AI)

### Dodane
- Zakładka **API** w konsoli (`js/ui/api-console.js`): polecenie JSON albo lista poleceń, **Wykonaj** (Ctrl+Enter),
  **Polecenia** (`{"cmd": "help"}`), wyniki najnowsze na górze (kliknięcie polecenia wstawia je z powrotem), każde
  polecenie w dzienniku strony. Polecenia z `js/scene/api.js` działają na tym samym stanie co okna i uchwyt.
- `window.sceneApi.run(polecenie)` — to samo dla AI sterującej przeglądarką.

## 0.3.0 — 2026-11-05 (zachowania i „Graj”)

### Dodane
- **▶ Graj / ■ Stop** na pasku narzędzi (klawisz P; Esc zatrzymuje): zachowania (`js/scene/behaviors.js`) ruszają
  modele sceny, gracz steruje wybranym (albo pierwszym z zachowaniem) z klawiatury (`js/play/input.js`), kamera jedzie
  za nim, a linia stanu pokazuje prędkość, maszyny / gaz, wysokość. Okręt: W / S maszyny, A / D ster. Samolot: W / S gaz,
  strzałki — ster wysokości i lotki, Q / E ster kierunku, B hamulce, G podwozie, F klapy.
- W czasie gry edycja wyłączona (uchwyt, wybór kliknięciem, okna Scena i Właściwości); dane sceny się nie zmieniają —
  po „Stop” modele wracają na swoje miejsca, a samolot do pozy postoju.
- Właściwości: lista **Zachowanie** (tylko pasujące do modelu i „Brak”).

## 0.2.2 — 2026-11-05 (konsola: okno albo panel)

### Zmienione
- Przypięta na dole konsola zwęża widok sceny także w trybie okien (Środek).

## 0.2.1 — 2026-11-05 (Środek | Całość)

### Dodane
- Przełącznik **Środek | Całość** na pasku narzędzi: scena w wolnym środku między panelami i konsolą albo na całej
  przestrzeni od paska narzędzi do paska informacji (pod panelami). Widok nie wchodzi już pod paski.

## 0.2.0 — 2026-11-05 (widok między panelami)

### Zmienione
- W trybie Panele widok 3D zajmuje wolny środek między panelami i konsolą (`body.viewFits`), a renderer liczy się
  z rozmiaru widoku, nie okna przeglądarki.

## 0.1.1 — 2026-11-05 (okna albo panele)

### Zmienione
- Okna można przypinać do paneli po bokach (wspólne okna, program 0.30.0); Właściwości w panelu bez zapasu wysokości.

## 0.1.0 — 2026-11-05 (pierwsza wersja)

### Dodane
- Edytor sceny w osobnym folderze `editor/` (strona `editor/index.html`), w menu Narzędzia i na stronie startowej.
- Scena jako dane (`js/scene/scene-data.js`, format `gamelab-scene` w wersji 1) i prefabrykaty z kitów
  (`js/scene/prefabs.js`): okręty (Błyskawica, Orzeł), pojazdy drogowe (Polonez, Abrams, Urbino 18), tramwaj Swing,
  pociąg (lokomotywa, wagony), Spitfire, budowle (Super 300, nabrzeże, falochron), broń (Beryl, bomba 250 lb).
- Okna: Opis, Scena (dodaj model, hierarchia), Właściwości (środowisko albo obiekt: nazwa, model, położenie, kurs,
  pochylenie, przechył, skala, „Na powierzchnię”, Powiel, Usuń, „Otwórz w laboratorium”), Kamera, Wydajność.
- Uchwyt Przesuń / Obróć / Skaluj (TransformControls z Three.js r186), wybór kliknięciem, kadrowanie, klawisze.
- Środowisko: morze albo płaski ląd, cztery oświetlenia z laboratoriów wodnych, wygląd kamery z profili laboratorium filtrów.
- Zapis w przeglądarce (`gameLab.scene.v1`) i do pliku `.scene.json`, otwieranie pliku.
- Angielski (domyślny) i polski: `js/i18n/`.
