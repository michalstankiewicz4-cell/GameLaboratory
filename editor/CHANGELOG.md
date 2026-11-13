# Edytor sceny — zmiany

Wersja: `ui/data/versions.js` (`editor/index.html`). `x.y.z` — y: nowa funkcja, z: poprawka. Krótki wpis także w głównym
`CHANGELOG.md`.

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
