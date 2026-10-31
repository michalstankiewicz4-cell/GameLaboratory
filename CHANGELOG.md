# GameLaboratory — zmiany

Wersja programu i każdego laboratorium: `js/labkit/versions.js`. `x.y.z` — y: nowa funkcja, z: poprawka.
Historia laboratoriów Space sprzed przeniesienia: `labs/CHANGELOG.md`; Battle i aTrain — w historii git.

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
