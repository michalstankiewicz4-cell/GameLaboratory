# Zasady pracy w GameLaboratory

- Odpowiadaj po polsku.
- Nigdy nie dodawaj własnych pomysłów — tylko je proponuj; implementuj to, o co poproszono.

## Co jest w repozytorium

- Tylko laboratoria i ich strona startowa (`index.html`), z modelami, środowiskami i narzędziami, których używają. Gier nie przenosimy.
- Źródła (z historią): Space, Battle, aTrain (z aTrain tylko modele taboru).
- Jedna wersja Three.js: r186, moduły ES (`vendor/three/`, dodatki w `vendor/three/addons/`).
- Laboratoria z Battle importują r186 bezpośrednio. Kity i laboratoria ze Space ładują go przez `js/core/three-global.js` (globalne `THREE`, potem skrypty jako `type="module"`), który zachowuje ich dawny wygląd z r128: kolory bez konwersji, oświetlenie legacy, bufory pośrednie jak w r128.

## Układ folderów

- `labs/` — strony laboratoriów; `js/labs/` — ich skrypty.
- `js/models/` — modele (geometria, materiały, światła, części); nie wiedzą, w jakim środowisku są.
- `js/envs/space|land|water/` — środowiska i ich prawa (kosmos bez grawitacji, ląd z grawitacją, woda z wypornością).
- `js/behaviors/` — zachowania (napęd i ruch) podpinane do modeli; każde deklaruje, w których środowiskach działa.
- `js/render/`, `js/audio/`, `js/labkit/` — wspólne warstwy.
- `tools/` — narzędzia (doktor modeli, kitcheck); `docs/` — dokumentacja.

## Fizyka

- Fizyka jest częścią środowiska — nie ma osobnego laboratorium fizyki.
- Trzy środowiska, każde ze swoimi prawami: próżnia (ciąg, orbity), woda (wyporność, fale, opór), ląd (grawitacja, tarcie, kontakt z podłożem, szyny).
- Zachowanie testuje się w laboratorium środowiska, do którego należy (np. koło na szynie — ląd). Zachowania przechodzące między ośrodkami — przez przełącznik środowiska w laboratorium danej rodziny modeli.

## Podział materiału (decyzje)

- Środowisko ląd = laboratorium lądu z Battle; woda = laboratorium wody z Battle. Ze Space (surface, marine) można uzupełnić tylko to, czego Battle nie ma.
- Części modelu (sprężyny, podwozie, wózki, zestawy kołowe, sprzęgi) należą do modelu (`js/models/`), bo będą podłączane.
- Tory kolejowe to modele budowli lądowych (`js/models/structures/railway/`).
- Pociąg (TrainKit, `js/models/train/`): dane w `data.js` (wymiary, profil koła, zderzaki, sprzęgi) są wspólne dla modelu i przyszłego zachowania „koło na szynie” (środowisko ląd). Oglądany w laboratorium pojazdów. Fizyka i rozjazdy z aTrain są przeniesione jako zachowanie „koło na szynie” (`js/behaviors/rail/`: `physics.js` — obliczenia bez zmian, `rail.js` — podpięcie do modelu); sieć torowa z rozjazdami: `js/models/structures/railway/network.js`. Fizyka musi pozostać prawdziwa: żadnego przyklejania do toru ani warunków logicznych zamiast sił.

## Przełącznik środowiska

- W laboratorium każdej rodziny modeli przełącznik ma zawsze 3 pozycje: kosmos, woda, ląd. Pozycje, w których rodzina nie ma zachowania, są wyszarzone.
- Wspólny komponent: `js/labkit/envswitch.js` + `css/envswitch.css` (znacznik `<div class="envSwitch" data-current=… data-space=… data-water=… data-land=…>`; pusty adres = wyszarzone).
- Statki: jedno laboratorium (`labs/ship.html` — kosmos, `labs/warship.html` — woda, ląd wyszarzony). Pojazdy: `labs/vehicles.html` — ląd, `labs/marine.html` — woda, kosmos wyszarzony.

## Naprawy modeli

- Modeli nie naprawiamy ręcznie.
- Naprawa odbywa się przez ulepszanie doktora modeli. Doktor ma być uniwersalny — nigdy dostosowany do jednego modelu.
- Jeśli naprawa przez doktora nie jest możliwa, zostaje po stronie gry.
- Jeden doktor dla wszystkich modeli: `tools/doctor.html`, logika `tools/doctor/modeldoctor.js`, źródła modeli `tools/doctor/sources/` (opis: `docs/doctor/README.md`). Wzorzec: `tools/doctor.golden.json` (`python3 tools/doctor.py`, `--update`).
- Pixel Doctor (`js/render/pixel/doctor.js`, w Pixel Studio) jest osobny i dotyczy tylko pixel artu (obrazków 2D): kolory, półprzezroczystość, samotne piksele, pillow shading, banding, kontrast.

## Grafika

- Preferowana grafika: ta z laboratoriów wodnych (Battle: potok kamery `js/render/sea/look.js`, niebo, woda), nie ze Space.
- Laboratoria Space w grafice Battle: znacznik `<meta name="gamelab-graphics" content="battle">` (wszystkie 3D poza kitcheck i doktorem). Moce świateł pisane pod r128 mnożyć przez `THREE.LIGHT_SCALE`, kolory sRGB z kodu przez `THREE.srgbColor()`, renderować przez `LabKit.imageEffects` / `LabKit.render`. Własny shader, który już oddaje kolor liniowy: `material.userData.linearOutput = true`.

## Wersjonowanie

- Program (GameLaboratory) ma swoją wersję, a każde laboratorium i narzędzie — osobną. Jedno miejsce: `js/labkit/versions.js` (`app` i `labs`).
- `x.y.z`: **y** — nowa funkcja (nowe laboratorium podnosi program), **z** — poprawka lub mała zmiana, **x** — duży zwrot.
- Zmiana w laboratorium podnosi wersję tego laboratorium; zmiana strony startowej lub wspólnych warstw (`js/core`, `js/labkit`, `js/render`, wspólne kity) — wersję programu (a wspólnego kitu także laboratoriów, w których zmienia to, co widać).
- Każda zmiana wersji ma wpis w `CHANGELOG.md` (katalog główny). `labs/CHANGELOG.md` to historia laboratoriów Space sprzed przeniesienia.
- Wersje widać: pasek menu (program · laboratorium), strona startowa (program i każdy kafelek), paski laboratoriów z Battle i Pixel Studio (znacznik `data-lab-version`).

## Strona startowa

- Każde laboratorium ma kilka fraz, które je opisują (np. woda, kosmos, planeta, układy) — używa ich filtr laboratoriów na stronie startowej (`PHRASES`, po angielsku `PHRASE_EN`; nowa fraza potrzebuje obu).
- Strona startowa pochodzi z gry kosmicznej (Space).
- Języki: angielski i polski. Wybór w Opcjach (Automatycznie / English / Polski); automatycznie z przeglądarki, a gdy się nie da — angielski. Teksty: `js/labkit/menubar.js` (`t(en, pl)`, `PL_ITEMS`, `window.LabMenu.LANG`) i `index.html` (`data-pl`, `INFO_PL`).
- SEO (angielski i polski): GameLaboratory jako silnik dla AI; miniatura `assets/og-image.jpg` (zrzut strony startowej), `robots.txt`, `sitemap.xml`.
