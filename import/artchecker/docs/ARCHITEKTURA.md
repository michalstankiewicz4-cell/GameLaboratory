# Architektura

Gra działa bez kroku budowania: `index.html` ładuje klasyczne skrypty w ustalonej kolejności.
Zmienne najwyższego poziomu (`let`/`const`) są wspólne dla wszystkich skryptów, więc **kolejność `<script>` w `index.html` ma znaczenie**.

```
index.html            szkielet strony + lista skryptów
css/style.css         wygląd
js/version.js         numer wersji (semver)
js/core/              rdzeń niezależny od trybu
  util.js             losowanie z ziarnem, gradienty, geometria, toast
  state.js            stan gry (MODE, P – obiekty na stole, sel, tool, widok)
  tools.js            definicje narzędzi obrazów i zestawy narzędzi trybów
  panel.js            prawy panel: narzędzie, notatnik, checklista
  board2d.js          plansza 2D: render, zoom/pan, bramki zoomu, warstwa mikrodetali
  game.js             oznaczenia, werdykt, nowa partia, przyciski
js/data/              dane (pigmenty, artyści)
js/paint/             silnik obrazów: sceny, widoki (UV, IR, RTG…), obserwacje, próbki
js/modes/             tryby gry (fragment, rzeźby 3D, banknoty, pamięć…)
js/main.js            start – ładowany jako ostatni
docs/                 dokumentacja
```

## Pojęcia
- **Obiekt** (`P[i]`) – rzecz na stole: obraz, banknot, rzeźba… Ma `letter`, `orig` (czy autentyczny), `profile` (metoda fałszerska), `t` (zestaw „zdrad” – które badania go demaskują), `m` (warianty zdrad), `notes` (notatnik), `check` (checklista gracza), `umark` (oznaczenie gracza).
- **Narzędzie** – definicja z `name`, `view` (widok planszy), `gate` (warunek zapisu obserwacji: zoom, obszar, nachylenie), `hint`.
- **Bramka** – obserwacja zapisuje się dopiero, gdy spełniony jest warunek (np. zoom ≥ ×8 i środek widoku na mikrodruku).
- **Profil** – metoda fałszerska: `core` (zawsze zdradza), `opt` (losowo), opcjonalnie warianty.

## Jak dodać nowy tryb
1. Utwórz plik w `js/modes/` z danymi, profilami, funkcją tworzącą partię i obserwacjami.
2. Dopisz `<script>` w `index.html` przed `js/core/game.js`.
3. Dodaj pozycję w menu trybów i wpis w `CHANGELOG.md`, podbij `js/version.js`.
Szczegóły rejestru trybów – patrz sekcja „Rejestr obiektów 2D” (od wersji 1.2.0).
