# Zasady pracy w GameLaboratory

- Odpowiadaj po polsku.
- Nigdy nie dodawaj własnych pomysłów — tylko je proponuj; implementuj to, o co poproszono.

## Co jest w repozytorium

- Tylko laboratoria i ich strona startowa (`index.html`), z modelami, środowiskami i narzędziami, których używają. Gier nie przenosimy.
- Źródła (z historią): Space, Battle, aTrain (tabor i fizyka), NeuroLabPA (SDF Walkers, laboratorium języka); SDF Morgue z artefaktu claude.ai.
- Jedna wersja Three.js: r186, moduły ES (`vendor/three/`, dodatki w `vendor/three/addons/`).
- Laboratoria z Battle importują r186 bezpośrednio. Kity i laboratoria ze Space ładują go przez `js/core/three-global.js` (globalne `THREE`, potem skrypty jako `type="module"`) — zawsze w grafice Battle (tryb legacy r128 usunięty w 0.12.0).

## Układ folderów

- `labs/` — strony laboratoriów; `js/labs/` — ich skrypty.
- `js/models/` — modele (geometria, materiały, światła, części); nie wiedzą, w jakim środowisku są.
- Ludzie mają osobne laboratorium (`labs/human.html`) i osobny folder modeli (`js/models/human/`) — oddzielone od laboratorium życia (zwierzęta i inne formy życia, `js/models/life/`). Oba stoją na LifeKit (`js/models/life/lifekit.js`). Postacie człekokształtne z SDF i pixel artu (generator zombie, SDF Walkers, Kostnica SDF): `js/models/human/zombie/`.
- `js/envs/space|land|water/` — środowiska i ich prawa (kosmos bez grawitacji, ląd z grawitacją, woda z wypornością); `js/envs/sky/` — niebo i deszcz, wspólne dla lądu i wody.
- `js/behaviors/` — zachowania (napęd i ruch) podpinane do modeli; każde deklaruje, w których środowiskach działa.
- `ui/` — całe UI: tokeny, czcionki, kontrolki, okna, przełącznik środowiska, ładowanie, pasek menu, wersje; style stron w `ui/pages/` (opis: `ui/README.md`).
- `js/render/`, `js/audio/`, `js/labkit/` — wspólne warstwy.
- `tools/` — narzędzia (doktor modeli, kitcheck, `paths.py` — sprawdzanie ścieżek); `docs/` — dokumentacja (mapa: `docs/README.md`, historia sprzed przeniesienia: `docs/history/`).

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
- Wspólny komponent: `ui/envswitch.js` + `ui/envswitch.css` (znacznik `<div class="envSwitch" data-current=… data-space=… data-water=… data-land=…>`; pusty adres = wyszarzone).
- Statki: jedno laboratorium (`labs/ship.html` — kosmos, `labs/warship.html` — woda, ląd wyszarzony). Pojazdy: `labs/vehicles.html` — ląd, `labs/marine.html` — woda, kosmos wyszarzony.

## Naprawy modeli

- Modeli nie naprawiamy ręcznie.
- Naprawa odbywa się przez ulepszanie doktora modeli. Doktor ma być uniwersalny — nigdy dostosowany do jednego modelu.
- Jeśli naprawa przez doktora nie jest możliwa, zostaje po stronie gry.
- Jeden doktor dla wszystkich modeli: `tools/doctor.html`, logika `tools/doctor/modeldoctor.js`, źródła modeli `tools/doctor/sources/` (opis: `docs/doctor/README.md`). Wzorzec: `tools/doctor.golden.json` (`python3 tools/doctor.py`, `--update`).
- Pixel Doctor (`js/render/pixel/doctor.js`, w Pixel Studio) jest osobny i dotyczy tylko pixel artu (obrazków 2D): kolory, półprzezroczystość, samotne piksele, pillow shading, banding, kontrast.

## Grafika

- Preferowana grafika: ta z laboratoriów wodnych (Battle: potok kamery `js/render/sea/look.js`, niebo, woda), nie ze Space.
- Laboratoria Space w grafice Battle (zawsze, przez `three-global.js`). Moce świateł pisane pod r128 mnożyć przez `THREE.LIGHT_SCALE`, kolory sRGB z kodu przez `THREE.srgbColor()`, renderować przez `LabKit.imageEffects` / `LabKit.render`. Własny shader, który już oddaje kolor liniowy: `material.userData.linearOutput = true`.

## Okna z opcjami

- Opcje laboratorium (dawne panele po lewej i prawej) są w pływających oknach otwieranych z OPCJE → Okna: `ui/windows.js` + `ui/windows.css`. Panel dostaje `data-window`, `data-title`, `data-title-pl`, `data-side`. Wszystkie laboratoria z panelami (poza skalą i skórkami) i doktor. Bez `data-title` tytułem jest pierwsza sekcja panelu (`h3` / `.secHd`). Okna bez zapisanego położenia układają się jedno pod drugim po swojej stronie.

## Wygląd (UI)

- Jeden wygląd wszędzie: styl laboratoriów Battle (ciemne szkło, cienka linia, złote nagłówki i kontrolki). Czcionka Space Grotesk, liczby IBM Plex Mono, cienkie paski przewijania bez strzałek. Kolory tylko z tokenów (`ui/tokens.css`).
- Strona linkuje `ui/ui.css`, potem `ui/space.css` lub `ui/sea.css`, potem `ui/pages/<lab>.css`. Bez bloków `<style>` i atrybutów `style=` w stronach (CSP `style-src 'self'`); skrypty ustawiają style przez CSSOM. W CSP potrzebne `font-src 'self'`.
- Pasek menu ładuje własny arkusz `ui/menubar.css` (`<link>`).
- Każde laboratorium ze sceną ma dwa paski jak laboratorium wody (`ui/bars.css`): `.bar` pod paskiem menu (własne kontrolki laboratorium, przełącznik środowiska) i `.foot` na dole (skala, klatki na sekundę, GameLaboratory; `#fps[data-auto]` liczy `ui/bars.js`).
- Ładowanie: karta `.labLoad` z kółkiem, zwykłym zdaniem (nie wielkimi literami), krokiem i paskiem.

## Wersjonowanie

- Program (GameLaboratory) ma swoją wersję, a każde laboratorium i narzędzie — osobną. Jedno miejsce: `ui/versions.js` (`app` i `labs`).
- `x.y.z`: **y** — nowa funkcja (nowe laboratorium podnosi program), **z** — poprawka lub mała zmiana, **x** — duży zwrot.
- Zmiana w laboratorium podnosi wersję tego laboratorium; zmiana strony startowej lub wspólnych warstw (`js/core`, `js/labkit`, `js/render`, wspólne kity) — wersję programu (a wspólnego kitu także laboratoriów, w których zmienia to, co widać).
- Każda zmiana wersji ma wpis w `CHANGELOG.md` (katalog główny). `docs/history/space-labs.md` to historia laboratoriów Space sprzed przeniesienia.
- Wersje widać: pasek menu (program · laboratorium), strona startowa (program i każdy kafelek), paski laboratoriów z Battle i Pixel Studio (znacznik `data-lab-version`).

## Strona startowa

- Rejestr laboratoriów i narzędzi: `ui/catalog.js` (nazwa EN/PL, dokument, opis EN/PL, kit, frazy, klucze ustawień, obrazek kafelka) — czytają go pasek menu, strona startowa i `tools/sitemap.py`. Nowe laboratorium = wpis w katalogu + wersja w `ui/versions.js`, potem `python3 tools/sitemap.py`.
- Każde laboratorium ma kilka fraz, które je opisują (np. woda, kosmos, planeta, układy) — używa ich filtr laboratoriów na stronie startowej (`phrases` w katalogu, po angielsku `phraseEn`; nowa fraza potrzebuje obu).
- Strona startowa pochodzi z gry kosmicznej (Space).
- Języki: angielski i polski. Wybór w Opcjach (Automatycznie / English / Polski); automatycznie z przeglądarki, a gdy się nie da — angielski. Teksty: `ui/menubar.js` (`t(en, pl)`, `window.LabMenu.LANG`), `ui/catalog.js` (`namePl`, `descPl`) i `index.html` (`data-pl`).
- SEO (angielski i polski): GameLaboratory jako silnik dla AI; miniatura `assets/og-image.jpg` (zrzut strony startowej), `robots.txt`, `sitemap.xml` (generowana: `tools/sitemap.py`).
- Sprawdzenia przy każdym wypchnięciu (GitHub Actions `check.yml`): składnia JS, `tools/paths.py --strict`, `tools/sitemap.py --check`.
