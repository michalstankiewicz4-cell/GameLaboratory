# Zasady pracy w GameLaboratory

- Odpowiadaj po polsku.
- Nigdy nie dodawaj własnych pomysłów — tylko je proponuj; implementuj to, o co poproszono.

## Co jest w repozytorium

- Tylko laboratoria i ich strona startowa (`index.html`), z modelami, środowiskami i narzędziami, których używają. Gier nie przenosimy.
- Źródła (z historią): Space, Battle, aTrain (z aTrain tylko modele taboru).
- Jedna wersja Three.js: r186, moduły ES (`vendor/three/`).

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

## Naprawy modeli

- Modeli nie naprawiamy ręcznie.
- Naprawa odbywa się przez ulepszanie doktora modeli. Doktor ma być uniwersalny — nigdy dostosowany do jednego modelu.
- Jeśli naprawa przez doktora nie jest możliwa, zostaje po stronie gry.

## Wersjonowanie

- Każde laboratorium będzie miało własne wersjonowanie (do wprowadzenia).

## Strona startowa

- Każde laboratorium ma kilka fraz, które je opisują (np. woda, kosmos, planeta, układy) — pod przyszły filtr laboratoriów.
- Strona startowa pochodzi z gry kosmicznej (Space).
