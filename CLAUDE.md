# Zasady pracy w GameLaboratory

- Odpowiadaj po polsku.
- Nigdy nie dodawaj własnych pomysłów — tylko je proponuj; implementuj to, o co poproszono.

- Po każdym zadaniu: commit i push na `main` (jedyna gałąź). Gdy zadań jest kilka i taniej jest je połączyć, łączyć, a wysyłać po połączonej pracy.

## Co jest w repozytorium

- Tylko laboratoria i ich strona startowa (`index.html`), z modelami, środowiskami i narzędziami, których używają. Gier nie przenosimy.
- Źródła (z historią): Space, Battle, aTrain (tabor i fizyka), NeuroLabPA (SDF Walkers, laboratorium języka, laboratorium obrazów), artchecker (silnik ekspertyzy w laboratorium sztuki: `js/render/art/exam/`), zestaw UI ze Space i menu/HUD z Battle (UI gry: `js/gameui/`), Hive Hunger (laboratorium bloków: BlockKit `js/models/blocks/`, ciecze i gaz w kosmosie `js/behaviors/space/`); SDF Morgue z artefaktu claude.ai.
- Jedna wersja Three.js: r186, moduły ES (`vendor/three/`, dodatki w `vendor/three/addons/`).
- Laboratoria z Battle importują r186 bezpośrednio. Kity i laboratoria ze Space ładują go przez `js/core/three-global.js` (globalne `THREE`, potem skrypty jako `type="module"`) — zawsze w grafice Battle (tryb legacy r128 usunięty w 0.12.0).

## Układ folderów

- `editor/` — edytor sceny („Warsztat”), osobny folder z własną budową (`editor/js/core/`, `editor/js/world/`, `editor/js/ui/`, `editor/js/i18n/`), wersją (`ui/data/versions.js`, klucz `editor/index.html`) i `CHANGELOG.md`; języki angielski (domyślny, `<html data-lang-default="en">`) i polski (`editor/js/i18n/en.js`, `pl.js` — każdy nowy tekst w obu). Opis: `editor/README.md`. Gra w edytorze (▶ Graj): `editor/js/play/`. Silnik wspólny: `js/scene/` (scena jako dane, prefabrykaty, zachowania w scenie `behaviors.js`, API dla AI `api.js` — polecenia JSON na scenie, zasoby z nazwą `assets.js` — ustawienia zapisane w laboratorium pod nazwą, np. morze z laboratorium wody, ląd z laboratorium lądu, pogoda i światło z laboratorium wyglądu, wygląd kamery z laboratorium filtrów, niebo kosmosu z laboratorium ciał niebieskich; kosmos `space.js` — kity ze Space ładowane przy pierwszej potrzebie).
- `labs/` — strony laboratoriów; `js/labs/<lab>/` — skrypty laboratorium we własnym folderze, główny plik `<lab>.js` (np. `js/labs/vehicles-space/vehicles-space.js`); wspólne skrypty laboratoriów — `js/labs/shared/`.
- `js/models/` — modele (geometria, materiały, światła, części); nie wiedzą, w jakim środowisku są. Statki-roboty (MarineKit) — `js/models/marine/`.
- Ludzie mają osobne laboratorium (`labs/human.html`) i osobny folder modeli (`js/models/human/`) — oddzielone od laboratorium życia (zwierzęta i inne formy życia, `js/models/life/`). Oba stoją na LifeKit (`js/models/life/lifekit.js`). Postacie człekokształtne z SDF i pixel artu (generator zombie, SDF Walkers, Kostnica SDF): `js/models/human/zombie/`.
- `js/envs/space|land|water/` — środowiska i ich prawa (kosmos bez grawitacji, ląd z grawitacją, woda z wypornością); `js/envs/sky/` — niebo i deszcz, wspólne dla lądu i wody.
- Jaskinie (CaveKit, `js/models/caves/`) i przedmioty bohatera dające światło (GearKit, `js/models/gear/`) to modele; sposoby widzenia (oko, noktowizor, lornetka) — warstwa obrazu `js/render/vision.js`. Jeziorka w jaskiniach (woda i lawa) są ogólne — ich styl wybiera się w laboratorium wody (tam też lawa).
- `js/behaviors/` — zachowania (napęd i ruch) podpinane do modeli; każde deklaruje, w których środowiskach działa.
- `ui/` — całe UI (opis: `ui/README.md`): `ui/ui.css` (jedno wejście), `ui/style/` (tokeny, czcionki, kontrolki, motywy `space.css` i `sea.css`), `ui/shell/` (dziennik, pasek menu, paski, okna, okna standardowe, wydajność, konsola, karta ładowania, przełącznik środowiska), `ui/data/` (katalog, wersje), `ui/pages/` (style stron).
- `js/render/`, `js/audio/`, `js/labkit/` — wspólne warstwy. Materiały (PBR, starzenie): MatKit `js/render/materials/matkit.js`, laboratorium `labs/materials.html` — nowe materiały brać stąd.
- `js/gameui/` — UI gry jako dane (ekrany menu, HUD, okna gry, okno dialogowe; format `gamelab-ui`), ze skórkami gier (`js/gameui/skins.js`, arkusze `js/gameui/css/`) oddzielonymi od wyglądu laboratoriów; laboratorium: `labs/gameui.html` (opis `docs/labs/gameui.md`).
- `tools/` — narzędzia (doktor modeli, kitcheck, `paths.py` — sprawdzanie ścieżek).
- `docs/` — dokumentacja w układzie kodu (mapa: `docs/README.md`): `docs/labs/` (laboratoria), `docs/models/` (modele), `docs/scene/` (silnik sceny), `docs/behaviors/` (zachowania), `docs/tools/` (narzędzia), `docs/guides/` (przewodniki, renderowanie, pułapki), `docs/history/` (historia sprzed przeniesienia, wykonany remanent).
- Nazwy plików i folderów małymi literami, słowa łączone myślnikiem (`solar-system.js`, `vehicles-water.html`); w kodzie nazwy mówią, co robią teraz (np. `LabKit.autoHideWindows`, nie dawne „hud”).

## Fizyka

- Fizyka jest częścią środowiska — nie ma osobnego laboratorium fizyki.
- Trzy środowiska, każde ze swoimi prawami: próżnia (ciąg, orbity), woda (wyporność, fale, opór), ląd (grawitacja, tarcie, kontakt z podłożem, szyny).
- Zachowanie testuje się w laboratorium środowiska, do którego należy (np. koło na szynie — ląd). Zachowania przechodzące między ośrodkami — przez przełącznik środowiska w laboratorium danej rodziny modeli.

## Podział materiału (decyzje)

- Środowisko ląd = laboratorium lądu z Battle; woda = laboratorium wody z Battle. Ze Space (surface, marine) można uzupełnić tylko to, czego Battle nie ma.
- Części modelu (sprężyny, podwozie, wózki, zestawy kołowe, sprzęgi) należą do modelu (`js/models/`), bo będą podłączane.
- Tory kolejowe to modele budowli lądowych (`js/models/structures/railway/`); nabrzeża i falochrony — `structures/coastal/`, platforma — `structures/offshore/`.
- Pociąg (TrainKit, `js/models/train/`): dane w `data.js` (wymiary, profil koła, zderzaki, sprzęgi) są wspólne dla modelu i przyszłego zachowania „koło na szynie” (środowisko ląd). Oglądany w laboratorium pojazdów. Fizyka i rozjazdy z aTrain są przeniesione jako zachowanie „koło na szynie” (`js/behaviors/rail/`: `physics.js` — obliczenia bez zmian, `rail.js` — podpięcie do modelu); sieć torowa z rozjazdami: `js/models/structures/railway/network.js`. Fizyka musi pozostać prawdziwa: żadnego przyklejania do toru ani warunków logicznych zamiast sił.

## Przełącznik środowiska

- W laboratorium każdej rodziny modeli przełącznik ma zawsze 3 pozycje: kosmos, woda, ląd, i stoi w górnym pasku laboratorium (`.bar`). Pozycje, w których rodzina nie ma zachowania, są wyszarzone.
- Wspólny komponent: `ui/shell/envswitch.js` + `ui/shell/envswitch.css` (znacznik `<div class="envSwitch" data-current=… data-space=… data-water=… data-land=…>`; pusty adres = wyszarzone).
- Grupy laboratoriów (`group`, `tab`/`tabPl` w `ui/data/catalog.js`): pojazdy (kosmos · woda · ląd, złote) i laboratoria kosmosu (ciała niebieskie · układy · skala, śliwkowe `--plum`). Grupa ma wspólne tło kafelków, poświatę w menu Narzędzia, wspólne podświetlenie kafelków i pozycji menu po najechaniu; laboratoria kosmosu mają na pasku przełącznik grupy (`<div class="envSwitch groupSwitch" data-group="space">`, `ui/shell/envswitch.js`).
- Kategorie laboratoriów (`cat` w katalogu, nazwy w `cats`, barwy `--cat-<id>` w tokenach) — drugi rodzaj grupowania: kolorowa kropka i nagłówek w menu Narzędzia, kolorowa krawędź i etykieta na kafelku (podpowiedź z listą, podświetlenie kategorii). Laboratoria w katalogu stoją w kolejności kategorii; nowe laboratorium dostaje `cat` i miejsce w swojej kategorii.
- Pojazdy (wszystko, czym można się poruszać): jedno laboratorium pojazdów — `labs/vehicles-space.html` kosmos (statki, dron, stacja), `labs/vehicles-water.html` woda (okręty i roboty morskie z MarineKit: ślizgacz, barka, nurek), `labs/vehicles-land.html` ląd (łaziki, amfibia, pociąg). Woda i ląd w nim są zwykłe (umowne), z możliwością pobrania z laboratorium wody i lądu. Laboratorium morza usunięte (0.17.0).

## Naprawy modeli

- Modeli nie naprawiamy ręcznie.
- Naprawa odbywa się przez ulepszanie doktora modeli. Doktor ma być uniwersalny — nigdy dostosowany do jednego modelu.
- Jeśli naprawa przez doktora nie jest możliwa, zostaje po stronie gry.
- Jeden doktor dla wszystkich modeli: `tools/doctor.html`, logika `tools/doctor/modeldoctor.js`, źródła modeli `tools/doctor/sources/` (opis: `docs/tools/doctor.md`). Wzorzec: `tools/doctor.golden.json` (`python3 tools/doctor.py`, `--update`).
- Pixel Doctor (`js/render/pixel/doctor.js`, w Pixel Studio) jest osobny i dotyczy tylko pixel artu (obrazków 2D): kolory, półprzezroczystość, samotne piksele, pillow shading, banding, kontrast.

## Grafika

- Preferowana grafika: ta z laboratoriów wodnych (Battle: potok kamery `js/render/sea/look.js`, niebo, woda), nie ze Space.
- Wspólna scena bazowa (`js/labs/shared/stage.js`: niebo SkyKit, światło z pogodą, mgła, morze, teren): edytor sceny i laboratoria filtrów, wyglądu, lądu, wody i pojazdów (kosmos, woda, ląd). Laboratorium dokłada tylko swoje (opis: `docs/scene/README.md`).
- Laboratoria Space w grafice Battle (zawsze, przez `three-global.js`). Moce świateł pisane pod r128 mnożyć przez `THREE.LIGHT_SCALE`, kolory sRGB z kodu przez `THREE.srgbColor()`, renderować przez `LabKit.imageEffects` / `LabKit.render`. Własny shader, który już oddaje kolor liniowy: `material.userData.linearOutput = true`.

## Okna z opcjami

- Opcje laboratorium są w pływających oknach otwieranych z OPCJE → Okna: `ui/shell/windows.js` + `ui/shell/windows.css`. Panel dostaje `data-window`, `data-title`, `data-title-pl`, `data-side`. Wszystkie laboratoria z opcjami (poza skalą i skórkami) i doktor. Bez `data-title` tytułem jest pierwsza sekcja panelu (`h3` / `.secHd`). Okna bez zapisanego położenia układają się jedno pod drugim po swojej stronie, a gdy kolumna się zapełni — w następnej kolumnie obok. Okno albo panel: pinezka na pasku tytułu przypina okno do panelu po jego stronie (kolumna między paskami, okna jedno pod drugim, przewijana) i z powrotem; przełącznik **Okna | Panele** na pasku narzędzi (po prawej, przed Konsolą) robi to dla wszystkich naraz; zapamiętane w przeglądarce. **Panele** to prawdziwe panele przy krawędziach (okna jako sekcje, `body.lmPanels`), a konsola dokuje się na dole pośrodku, między nimi. Konsola ma też własną pinezkę (⤓ / ⤒): przypięta na dole albo pływająca, niezależnie od trybu; kliknięcie **Okna | Panele** przywraca jej ustawienie z przełącznika. Wolny środek: zmienne `--viewL`, `--viewR`, `--viewB` i `window.LabView` (`insets()`, `onChange()`); strona z `<body class="viewFits">` wstawia tam swój `#view` i liczy renderer z jego rozmiaru (`LabView.size()` → `{ w, h, x, y }`; zmiana rozmiaru widoku wysyła zdarzenie `resize`; nakładki nad widokiem — klasa `.viewLayer`): edytor sceny i wszystkie laboratoria 3D z oknami; bez tego (widok na cały ekran) — skala, skórki, dźwięk, Pixel Studio, generator zombie, Kostnica SDF. Taka strona ma na pasku drugi przełącznik **Środek | Całość**: scena w wolnym środku albo na całej przestrzeni od paska narzędzi do paska informacji, pod panelami (`body.vfFull`, `gamelab.viewfit`).
- Okna standardowe (`ui/shell/labwin.js`, `data-std`), wszędzie te same: **Opis** (lewa, pierwsze), **Kamera**, **Światło i pogoda**, **Wydajność** (prawa, w tej kolejności). Wydajność jest generowana w jednym miejscu (`LabPerf`, `ui/shell/perf.js`: klatki, czas klatki, CPU, trójkąty, wywołania rysowania, rozdzielczość, wykres, Model); statystyki modelu idą do niej. Własne okna laboratorium po lewej, za Opisem; drugie duże może stać po prawej, nad wspólnymi. Laboratorium pokazuje tylko te okna standardowe, które mają u niego sens. Wyjątki bez okien standardowych: doktor modeli, skala, skórki, SDF Walkers, laboratorium języka i obrazów.

## Wygląd (UI)

- Jeden wygląd wszędzie: styl laboratoriów Battle (ciemne szkło, cienka linia, złote nagłówki i kontrolki). Czcionka Space Grotesk, liczby IBM Plex Mono, cienkie paski przewijania bez strzałek. Kolory tylko z tokenów (`ui/style/tokens.css`).
- Strona linkuje `ui/ui.css`, potem `ui/style/space.css` lub `ui/style/sea.css`, potem `ui/pages/<lab>.css`. Bez bloków `<style>` i atrybutów `style=` w stronach (CSP `style-src 'self'`); skrypty ustawiają style przez CSSOM. W CSP potrzebne `font-src 'self'`.
- Arkusze paska menu i konsoli (`ui/shell/menubar.css`, `console.css`) są w `ui/ui.css` (strona startowa linkuje je sama), żeby pasek menu rysował się od razu ze stroną.
- Każda strona (laboratoria, narzędzia, strona startowa) ma dwa paski jak laboratorium wody (`ui/shell/bars.css`): `.bar` pod paskiem menu (własne kontrolki laboratorium, przełącznik środowiska) i `.foot` na dole (skala, klatki na sekundę, GameLaboratory; `#fps[data-auto]` liczy `ui/shell/bars.js`). Paski i wszystko na nich są zdefiniowane tylko w `ui/shell/bars.css` (stałe wysokości, nieprzezroczyste tło) — arkusze laboratoriów ich nie stylują; w paskach nie ma nazwy, wersji ani linków (są na pasku menu). OPCJE → Paski: pasek narzędzi i pasek informacyjny, domyślnie włączone (`body.lmNoBar`, `body.lmNoFoot`). Strona przewijana jak dokument (języka, obrazów, SDF Walkers, narzędzia) ma `<body class="pageFlow">`: zaczyna się pod paskami i kończy nad dolnym.
- Ładowanie: karta `.labLoad` z kółkiem, zwykłym zdaniem (nie wielkimi literami), nazwą etapu, paskiem i procentem (`ui/shell/loader.js`). Przy starcie sama pokazuje postęp strony; laboratorium zgłasza własne etapy `LabLoad.step(nazwa, ułamek)`, a długie operacje w trakcie pracy (powyżej ok. 1 s) idą przez `LabLoad.run(tytuł, async step => …)`.
- Nawigacja: na każdej stronie pierwsze na pasku narzędzi są cofnij · domek (strona startowa) · ponów (historia przeglądarki, `ui/shell/nav.js`, ładowany przez pasek menu).
- Gdy na pasku narzędzi zabraknie miejsca, przyciski mogą być ikonkami z podpowiedzią (tooltip).
- Kolejność na pasku narzędzi: nawigacja, potem przełącznik laboratoriów (środowiska lub grupy) albo przycisk do powiązanego laboratorium (skórki → filtry), dopiero potem listy rozwijane i inne kontrolki laboratorium.
- Konsola: przycisk po prawej na pasku narzędzi otwiera okno z dziennikiem strony (`ui/shell/console.js`; dziennik `window.LabLog` — `ui/shell/log.js`, pierwszy skrypt każdej strony): błędy, ostrzeżenia, komunikaty, etapy ładowania — najnowsze na górze, data i czas, strona, filtr; dziennik zostaje do zamknięcia karty (`sessionStorage`). Zakładki: pierwsza Dziennik, strona dodaje własne (`window.LabConsole.addTab`, np. API w edytorze sceny). Na każdej stronie, także startowej (ma oba paski).

## Wersjonowanie

- Program (GameLaboratory) ma swoją wersję, a każde laboratorium i narzędzie — osobną. Jedno miejsce: `ui/data/versions.js` (`app` i `labs`).
- `x.y.z`: **y** — nowa funkcja (nowe laboratorium podnosi program), **z** — poprawka lub mała zmiana, **x** — duży zwrot.
- Zmiana w laboratorium podnosi wersję tego laboratorium; zmiana strony startowej lub wspólnych warstw (`js/core`, `js/labkit`, `js/render`, wspólne kity) — wersję programu (a wspólnego kitu także laboratoriów, w których zmienia to, co widać).
- Każda zmiana wersji ma wpis w `CHANGELOG.md` (katalog główny). `docs/history/space-labs.md` to historia laboratoriów Space sprzed przeniesienia.
- Wersje widać: pasek menu (program · laboratorium), strona startowa (program i każdy kafelek).

## Strona startowa

- Rejestr laboratoriów i narzędzi: `ui/data/catalog.js` (nazwa EN/PL, dokument, opis EN/PL, kit, frazy, klucze ustawień, obrazek kafelka) — czytają go pasek menu, strona startowa i `tools/sitemap.py`. Nowe laboratorium = wpis w katalogu + wersja w `ui/data/versions.js`, potem `python3 tools/sitemap.py`.
- Każde laboratorium ma kilka fraz, które je opisują (np. woda, kosmos, planeta, układy) — używa ich filtr laboratoriów na stronie startowej (`phrases` w katalogu, po angielsku `phraseEn`; nowa fraza potrzebuje obu).
- Strona startowa pochodzi z gry kosmicznej (Space).
- Języki: angielski i polski. Wybór w Opcjach (Automatycznie / English / Polski); automatycznie z przeglądarki, a gdy się nie da — angielski. Teksty: `ui/shell/menubar.js` (`t(en, pl)`, `window.LabMenu.LANG`), `ui/data/catalog.js` (`namePl`, `descPl`) i `index.html` (`data-pl`).
- SEO (angielski i polski): GameLaboratory jako silnik dla AI; miniatura `assets/og-image.jpg` (zrzut strony startowej), `robots.txt`, `sitemap.xml` (generowana: `tools/sitemap.py`).
- Sprawdzenia przy każdym wypchnięciu (GitHub Actions `check.yml`): składnia JS, `tools/paths.py --strict`, `tools/sitemap.py --check`.
