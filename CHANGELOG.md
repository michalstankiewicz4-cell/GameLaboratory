# GameLaboratory — zmiany

Wersja programu i każdego laboratorium: `js/labkit/versions.js`. `x.y.z` — y: nowa funkcja, z: poprawka.
Historia laboratoriów Space sprzed przeniesienia: `labs/CHANGELOG.md`; Battle i aTrain — w historii git.

## Program 0.12.0 — 2026-11-01 (remanent, partia 1: śmieci, błędy, martwy kod)

### Usunięte
- `css/game-ui/` (27 plików interfejsu gry — nic ich nie ładowało), `tools/out/` (27 zrzutów z testów, 3,8 MB —
  teraz w `.gitignore`), `tools/walkers/` (prototypy w Pythonie i składacz artefaktu claude.ai z NeuroLabPA),
  `docs/walkers/gitignore.txt`, nieużywane miniatury `assets/labs/ship.jpg` i `orzel.jpg` (`lab-check.py --thumb`
  zapisuje je teraz do `tools/out/`).
- **Tryb grafiki „legacy r128”** z `js/core/three-global.js` (łatki świateł, bufory jak w r128) — używały go już
  tylko doktor i kitcheck; teraz wszędzie grafika Battle, bez znacznika `<meta name="gamelab-graphics">` (znaczniki
  usunięte ze stron). Odciski kitchecka i doktora liczą geometrię — bez zmian.
- Martwy markup HUD w stronach Space (logo, ramka, podtytuł, złoty pasek, boczne paski) — od okien był schowany.

### Poprawione
- `tools/lab-check.py` działa znowu: strona startowa `index.html` i `labs/warship.html` zamiast adresów z Battle.
- Pasek menu zna `labs/warship.html` (druga strona laboratorium statków, „woda”): nazwa i wersja na pasku; bez osobnej
  pozycji w liście i bez kafelka — wejście przełącznikiem środowiska.
- Tytuły 13 stron Space i kitchecka bez „Swarm Protocol” („Nazwa | GameLaboratory”); domyślny podpis statku
  „GAMELABORATORY // SHIP LAB”; metadane MIDI z MusicKit.
- SDF Walkers: jedna wersja (z `versions.js`), bez osobnego numeru w `js/labs/walkers/version.js`.
- Wersje (z+1): laboratoria Space, okręty, SDF Walkers, doktor, kitcheck.

## Program 0.11.1 — 2026-11-01

### Zmienione (pasek menu)
- Bez menu PLIKI (była tam tylko strona startowa — prowadzi do niej znak GameLaboratory po lewej).
- OPCJE → **Wyczyść zapisane ustawienia** działa na każdej stronie: ustawienia laboratorium zapisane w przeglądarce
  i układ jego okien (na stronie startowej: kolejność, przypięcie, licznik odwiedzin). Oceny w SDF Walkers to dane —
  zostają; język ustawia się osobno.
- POMOC: bez „Klawiatura i mysz” i „Notatki tej strony”; **Dokumentacja** prowadzi do folderu `docs/` (wcześniej do
  nieistniejącego README).
- Bez skrótów klawiszowych w menu (F11, F5) i bez list klawiszy laboratoriów.

## Program 0.11.0 — 2026-11-01

### Dodane
- **Laboratorium człowieka** (`labs/human.html`, v1.0.0) — wydzielone z laboratorium życia (decyzja właściciela:
  ludzie i ich animacja dostają własne laboratorium). Ludzie (Human I, Human II), twarz z minami, chody i warstwy.
  Modele ludzi w osobnym folderze `js/models/human/` (`human.js`, `face.js`, `walk.js`, `data/` — przeniesione
  z `js/models/life/`, z historią); skrypt `js/labs/human.js`; dokumentacja `docs/human.md`.

### Zmienione
- **Laboratorium życia v1.3.0**: pozostałe formy życia (zwierzęta — strider); sekcja twarzy chowa się, gdy stworzenie
  nie ma twarzy; nowy kafelek, opis i frazy (życie, zwierzęta, chód, nogi). `docs/life.md` bez części o ludziach.
- Kitcheck ładuje ludzi z nowego miejsca i sprawdza też laboratorium człowieka.

## Program 0.10.0 — 2026-10-31

### Zmienione
- **Jeden wygląd wszędzie (styl Battle)**:
  - górne paski laboratoriów Battle bez nazwy, wersji i linków (są na pasku menu: „Laboratorium · nazwa”, wersja,
    NARZĘDZIA) — zostaje tylko sterowanie laboratorium; pusty pasek znika (`css/windows.css`);
  - SDF Walkers i laboratorium języka: kolory, czcionki, przyciski i nagłówki Battle (układ stron bez zmian);
  - skala: górny pasek jak w laboratoriach Battle; skórki: przełącznik skórek (sama makieta interfejsu gry bez zmian);
  - kitcheck i tekstura ziarna w kolorach Battle.
- NeuroLabPA usunięte z listy do zrobienia (repozytorium kasuje właściciel).

## Program 0.9.0 — 2026-10-31

### Dodane
- **Import NeuroLabPA z historią** (16 commitów): dwa nowe laboratoria.
  - **SDF Walkers** (`labs/walkers.html`, v0.23.0 — wersja z NeuroLabPA): całe zombie z funkcji odległości,
    5 animacji × 4 kierunki × 8 klatek, sprite sheet z JSON, edytor cech, oceny i sieć neuronowa ucząca się gustu.
    Model: `js/models/life/zombie/walkers/`; skrypty `js/labs/walkers/`; dane `data/walkers/`; dokumentacja,
    historia zmian i plan: `docs/walkers/`.
  - **Laboratorium języka** (`labs/lang.html`, v0.23.0): sieć uczy się polskiego od zera (bigram → okno → RNN/GRU →
    transformer; CPU, WebAssembly SIMD, WebGPU; tokeny BPE; rozmowa). Skrypty `js/labs/lang/`, teksty `data/lang/`.
  - Oryginał SDF Morgue z NeuroLabPA: `docs/morgue/sdf-morgue-original.html`.
  - Obie strony: wspólny pasek menu, ścieżki dostosowane, czcionki bez Google Fonts (zastępcze). Na razie we
    własnym stylu (przewijane strony) — przejście na okna i styl Battle w `TODO.md`.
- Kafelki, frazy (nowe: sieć neuronowa, język, tekst, transformer, WebGPU), mapa strony.

### Poprawione
- Pasek menu odporny na ogólne style przycisków strony (cień, przesunięcie, litery).

## Program 0.8.0 — 2026-10-31

### Dodane
- **Nowe laboratorium: SDF Morgue** (`labs/morgue.html`, v1.0.0, z artefaktu claude.ai): głowa zombie liczona
  w shaderze — funkcje odległości, raymarching, światło w czterech tonach, kontur z geometrii, pixel art; okaz
  z ziarna i jego karta. Model osobno: `js/models/life/zombie/sdf-head.js` (shadery, okaz, paleta, renderer).
  Styl Battle, okna z opcjami. Kafelek, frazy (nowe: shader, SDF), pasek menu, mapa strony, `docs/morgue.md`.

### Zmienione
- Okna: gdy tytuł okna pochodzi z pierwszej sekcji panelu, ta sekcja nie powtarza go zaraz pod spodem.

## Program 0.7.0 — 2026-10-31

### Zmienione
- **Okna z opcjami we wszystkich laboratoriach** (po próbie w laboratorium roślin): lewy i prawy panel każdego
  laboratorium to pływające okno — przeciąganie za pasek tytułu, ✕, OPCJE → Okna, układ pamiętany w przeglądarce.
  Tytuł okna: pierwsza sekcja panelu. Laboratoria (wersja y+1): ciała niebieskie, budynki, edytor stworów, życie,
  morze, statki, dźwięk, powierzchnia, układy, pojazdy, filtry, ląd, wygląd, Pixel Studio, budowle, transformator,
  okręty, woda, generator zombie; doktor modeli. Skala i skórki nie mają paneli bocznych — bez zmian.
- **Jeden styl paneli — Battle**: w oknie panele laboratoriów Space (`#hud`, `#opt`) wyglądają jak w laboratoriach
  Battle — nagłówki, przyciski, wiersze, suwaki, wykres FPS; dekoracje sci-fi (logo, ramki, paski) schowane.
  Chowanie po bezczynności (LabKit) przygasza okno jak w Battle zamiast je ukrywać.
- Laboratoria Battle mają wspólny pasek menu (dotąd tylko rośliny) — w CSP dopisane `font-src 'self'`.

### Poprawione
- Laboratorium dźwięku nie uruchamiało się od wersji 0.4.0 (`labkit.js` importuje panel wyglądu, a strona ładowała
  go jako zwykły skrypt): LabKit, MusicKit i skrypt laboratorium ładowane jako moduły.

## Program 0.6.0 — 2026-10-31

### Dodane
- **Okna z opcjami laboratorium** (`js/labkit/windows.js`, `css/windows.css`, w stylu laboratoriów Battle): panel
  oznaczony `data-window` (tytuł `data-title`, po polsku `data-title-pl`) staje się pływającym oknem — pasek
  tytułu do przeciągania, ✕ zamyka, OPCJE → Okna otwiera i zamyka; które okna są otwarte i gdzie stoją,
  pamięta przeglądarka (za pierwszym razem tam, gdzie stały panele). Na próbę: **laboratorium roślin v1.1.0**
  (okna „Model” i „Scena”), także ze wspólnym paskiem menu.
- Pasek menu na stronach ze ścisłym CSP (laboratoria z Battle): style przez CSSOM zamiast elementu `<style>`;
  górny pasek laboratoriów Battle przesunięty pod pasek menu.

## Program 0.5.0 — 2026-10-31

### Dodane
- **Pierwsze zachowanie: „koło na szynie”** (`js/behaviors/rail/`, środowisko ląd) — fizyka pociągu z aTrain
  przeniesiona bez zmian w obliczeniach (porównanie z oryginałem: identyczne położenia wszystkich brył po 4 s jazdy).
  Liczby taboru bierze z modelu (`js/models/train/data.js`). `rail.js` podpina fizykę do modelu składu (pudła,
  zestawy kołowe, maźnice i sprężyny, talerze zderzaków, głowice sprzęgu kłowego, ogniwa łańcucha).
- **Sieć torowa z rozjazdami** (`js/models/structures/railway/network.js`): owal z dwoma rozjazdami i pętlą,
  rysowany z tych samych odcinków szyn, na których liczy fizyka (iglice ruchome, dzioby, kierownice, łubki, napędy).
- **Laboratorium pojazdów v1.2.0**: pociąg jeździ — prędkość zadana, kierunek, moc, hamulec, blokada kół, masy,
  zwrotnice, sprzęgi, szczelina styków, luz obrzeży, kamery śledzące (jak w aTrain). Rodziny modeli mogą mieć
  w laboratorium własny panel i krok co klatkę (`addMode({ panel, update })`).
- **Filtr laboratoriów** na stronie startowej: frazy każdego laboratorium jako przyciski (pokazane zostają te,
  które mają wszystkie wybrane frazy; najczęstsze 16, reszta pod „wszystkie frazy”) i pole wyszukiwania
  (nazwa, opis, frazy — po polsku i angielsku, bez znaków diakrytycznych).
- Favicon: znak z paska menu (zaokrąglony kwadrat z gradientem stożkowym).
- **Język: angielski i polski** — OPCJE → Język (Automatycznie / English / Polski, zapamiętane w przeglądarce);
  automatycznie z języków przeglądarki, a gdy żaden nie jest obsługiwany — angielski; `?lang=pl` / `?lang=en`
  w adresie. Przetłumaczone: pasek menu (menu, nazwy laboratoriów, klawisze) i strona startowa (opisy, kafelki).
  Panele wewnątrz laboratoriów są na razie po angielsku.
- **SEO po angielsku i polsku**: GameLaboratory jako silnik dla AI — tytuł, opis, słowa kluczowe, Open Graph
  i Twitter z miniaturą (`assets/og-image.jpg`, zrzut strony startowej 1200×630), dane strukturalne (JSON-LD
  WebApplication), `hreflang` (en, pl, x-default), `robots.txt`, `sitemap.xml`.

### Zmienione
- **Doktor modeli v1.0.1**: części lustrzane (ujemna skala) czytane z kolejnością wierzchołków, z jaką rysuje je
  three.js — znika fałszywe migotanie tarczy koła ze znacznikiem w wagonach (`docs/doctor/README.md`).
- Strona startowa: bez „In the game” (statystyka i znaczniki — gier tu nie ma; znacznik zostaje tylko narzędziom);
  fraza „Orzeł” w laboratorium statków.
- Z aTrain nie przeniesiono (na razie): dźwięków, dymu i iskier, terenu z górą i morzem, pogody, przystanku.

## Program 0.4.0 — 2026-10-31

### Zmienione
- **Wszystkie laboratoria 3D ze Space w grafice Battle** (v1.1.0): ciała niebieskie, układy, powierzchnia, skala,
  budynki, pojazdy, morze, stwory, życie; statki v1.2.0. Skins i sound (bez sceny 3D) bez zmian.
- `three-global.js` (tryb Battle): własne shadery kitów Space oddają kolor gotowy do wyświetlenia — na końcu
  shadera przeliczany z sRGB na liniowy (bez tego planety były sprane, a poświaty statków przejaskrawione);
  `THREE.LIGHT_SCALE` (π w trybie Battle) dla mocy świateł pisanych pod r128 i `THREE.srgbColor()` zamiast ręcznego
  `.convertSRGBToLinear()` w kitach (LifeKit, stwory).
- `LabKit.render()`: laboratoria bez panelu obrazu renderują w trybie Battle przez potok kamery („Game clean”).
- Znane: delikatna mgławica w tle laboratorium ciał niebieskich jest ciemniejsza (ciemne tony nieba po przeliczeniu).

## Program 0.3.0 — 2026-10-31

### Dodane
- **Tryb grafiki Battle dla laboratoriów Space**: znacznik `<meta name="gamelab-graphics" content="battle">` na stronie.
  `js/core/three-global.js` daje wtedy czyste r186 (zarządzanie kolorem, fizyczne światła, zwykłe bufory), a
  `LabKit.imageEffects` renderuje przez potok kamery z laboratoriów wodnych (`js/labkit/look-panel.js`) zamiast
  PostKit — to samo API, panel „Camera look” z gotowymi ustawieniami i suwakami.
- **Laboratorium statków v1.1.0** (`labs/ship.html`, kosmos): pierwsze w grafice Battle. Światła ×π (fizyczne światła
  świecą π razy słabiej niż w trybie legacy r128), kolory gry bez ręcznej konwersji z sRGB.

## Program 0.2.0 — 2026-10-31

### Dodane
- **Laboratorium filtrów** `labs/filters.html` **v0.1.0**: potok kamery z laboratoriów wodnych (Battle) na wybranej
  scenie — ORP Błyskawica, ORP Orzeł, platforma Super 300, pociąg na torze; gotowe ustawienia, porównanie z czystym
  obrazem, koszt każdego efektu, cztery oświetlenia. Opis: `docs/filters.md`.
- **Wersjonowanie**: wersja programu i osobna wersja każdego laboratorium i narzędzia (`js/labkit/versions.js`),
  widoczne na pasku menu, na stronie startowej (program i każdy kafelek) i w paskach laboratoriów z Battle.
- `js/core/three-window.js`: r186 jako `window.THREE` bez łatek wyglądu r128 (TrainKit na stronach z grafiką Battle).

## Program 0.1.0 — 2026-10-31

Pierwsze wydanie na GitHub Pages. Wszystkie laboratoria i narzędzia w **v1.0.0**.
- Laboratoria ze Space, Battle i aTrain (modele taboru) przeniesione z historią, na Three.js r186.
- Strona startowa ze Space z frazami przy każdym laboratorium; przełącznik środowiska (kosmos · woda · ląd).
- Jeden doktor modeli dla kosmosu, morza i pociągu; Pixel Studio z własnym Pixel Doctorem.
- TrainKit (pociąg z aTrain) i tor w laboratorium pojazdów.
