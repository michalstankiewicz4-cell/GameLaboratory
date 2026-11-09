# Architektura

Gra działa bez kroku budowania: `index.html` ładuje klasyczne skrypty w ustalonej kolejności.
Zmienne najwyższego poziomu (`let`/`const`) są wspólne dla wszystkich skryptów, więc **kolejność `<script>` w `index.html` ma znaczenie**.

```
index.html            szkielet strony, meta SEO/Open Graph, lista skryptów
og-image.jpg, favicon.svg, robots.txt, sitemap.xml – pliki dla wyszukiwarek i udostępniania
css/style.css         wygląd
js/version.js         numer wersji (semver)
js/core/              rdzeń niezależny od trybu
  util.js             losowanie z ziarnem, gradienty, geometria, toast
  state.js            stan gry (MODE, P – obiekty na stole, sel, tool, widok)
  tools.js            definicje narzędzi obrazów i zestawy narzędzi trybów
  panel.js            prawy panel: narzędzie, notatnik, checklista
  board2d.js          plansza 2D: render, zoom/pan, bramki zoomu, warstwa mikrodetali
  layout.js           układ stanowiska: zakładki prawego okna, dok obiektów, zwijane zlecenie
  game.js             oznaczenia, werdykt, nowa partia, przyciski
  home.js             ekran główny: kategorie, podgląd trybu, postęp (localStorage), loader
  homefx.js           efekty menu: artefakty JPG, ziarno, aberracja, migotanie paneli, paralaksa
  wiki.js             wiki eksperta: artykuły z danych trybów + słowniczek (GLOSS)
js/data/              dane (pigmenty, artyści)
js/paint/             silnik obrazów: sceny, widoki (UV, IR, RTG…), obserwacje, próbki
js/core/kinds.js      rejestr obiektów 2D + wspólne nachylenie i tworzenie partii
js/kinds/             rodzaje obiektów 2D (banknot, moneta, znaczek, rękopis…)
js/modes/             tryby gry o własnej mechanice (fragment, pamięć, rzeźby 3D + warianty materiału: marble.js)
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
Menu buduje `js/main.js` (stała `MENU`); rodzaje z rejestru trafiają do grupy „Obiekty” automatycznie.

## Rejestr obiektów 2D
Obiekt, przy którym gracz klasyfikuje każdy egzemplarz (prawdziwy / falsyfikat), dodaje się jednym plikiem w `js/kinds/`:

```js
registerKind({
  id:'coin', label:'Weryfikacja monet', noun:'Moneta',
  W:640, H:320, wcm:12.8,          // rozmiar w jednostkach planszy i szerokość w cm (skala 1 cm)
  tilt:false, focusLabel:'Rant',   // suwak nachylenia; nazwa przycisku przybliżenia
  defs:{...}, sets:[[grupa,[id…]]],// narzędzia (name, view, gate:{z,area,tilt}, probe, hint)
  profiles:{ id:{name, core:[…], opt:[…], modes:{…}} },
  newGame(r){ kindBatch(this, r, p => {/* pola egzemplarza */}) },
  view(p,v)   → canvas IW×IH dla widoku v (użyj kView do buforowania),
  live(p)     → (opcj.) rysowanie na żywo w widoku „normal”, np. przy dużym zoomie,
  area(p,area,v) → czy środek widoku leży w obszarze bramki,
  obs(p,id), why(p,id) → obserwacja i wyjaśnienie zdrady,
  probe(p,lx,ly,id) → (opcj.) kliknięcie sondą, panel(p,id) → (opcj.) HTML w panelu,
  focus(p) → [x,y,w,h] dla przycisku przybliżenia, intro, caseText()
});
```
Potem dopisz `<script src="js/kinds/…">` w `index.html` (przed `js/core/game.js`).

## Planowane tryby (wkrótce)
Aukcja, Śledztwo i Konserwator są w menu jako nieaktywne. Każdy będzie osobnym plikiem w `js/modes/` – opis w `docs/ROADMAPA.md`.
