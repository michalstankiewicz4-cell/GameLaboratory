# Edytor sceny — zmiany

Wersja: `ui/data/versions.js` (`editor/index.html`). `x.y.z` — y: nowa funkcja, z: poprawka. Krótki wpis także w głównym
`CHANGELOG.md`.

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
