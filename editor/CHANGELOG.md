# Edytor sceny — zmiany

Wersja: `ui/data/versions.js` (`editor/index.html`). `x.y.z` — y: nowa funkcja, z: poprawka. Krótki wpis także w głównym
`CHANGELOG.md`.

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
