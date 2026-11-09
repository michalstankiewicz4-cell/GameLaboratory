# Laboratorium sztuki (`labs/art.html`)

Obrazy 2D na płótnie (canvas) — do gier z obrazami i znaczkami oraz do zwykłych obrazów dla AI. Kit: **ArtKit**
(`js/render/art/artkit.js`, bez Three.js); strona: `js/labs/art/art.js`, `ui/pages/art.css`. Ze sceną (edytor) na razie
niepołączone.

## Potok

temat → technika → powierzchnia (podłoże, relief w świetle bocznym, werniks, spękania, wiek) → konwersje → format.

Obraz ma dwie warstwy: **barwę** i **wysokość** (impast, grzbiety włosia, nitki płótna). Wysokość oświetla światło
boczne (`relief`, `light` w stopniach) — przy powiększeniu widać pociągnięcia pędzla i fakturę podłoża.

- **Tematy:** pejzaż, martwa natura, portret, abstrakcja, motyw znaczka (kwiat, ptak), własny obraz (plik albo Ctrl+V).
- **Techniki:** brak (sam temat, jak druk na podłożu), olej (pociągnięcia wzdłuż kształtów, cztery przejścia od dużych
  pędzli do małych, włosie, grudki impastu), akwarela, ołówek (kreskowanie), tusz (kontur i kreskowanie), tusz
  patyczkiem (grube i cienkie linie, przerwy suchego patyka, kleksy), długopis (niebieskie kółeczka bez odrywania,
  grudki z kulki), węgiel i pastel (szerokie pociągnięcia, roztarte, materiał zostaje na grzbietach ziarna podłoża),
  flamaster (równe pasy, nakładające się ciemnieją), puentylizm, rytownictwo (linie o grubości z ciemności).
- **Powierzchnie:** gładka, płótno (splot), papier (włókna), drewno (słoje), pergamin, metal (szczotkowana blacha).
  Podłoże prześwituje przez cienką farbę.
- **Konwersje** (kolejno, na gotowym obrazie): skala szarości, sepia, duotone, negatyw, posteryzacja, paleta z
  ditheringiem (Floyd–Steinberg albo Bayer 4×4), raster (półtony), krawędzie (Sobel), pikseloza, rozmycie,
  wyostrzenie, kontrast i jasność.
- **Formaty:** znaczek pocztowy (margines, ząbkowanie, wartość z pola `text`), złocona rama, passe-partout.

Liczba śladów techniki nie zależy od rozmiaru obrazu (ślady rosną z obrazem) — ten sam spec w 512 i 2048 px wygląda
tak samo, tylko ostrzej.

## Podgląd

Kółko myszy — zoom wokół kursora do 32×; przeciąganie — przesuwanie; dwuklik — dopasuj. Na pasku: Fit, 1:1, 4×
(pociągnięcia), 16× (włosie, splot płótna), „Sharp pixels” (ostre piksele przy powiększeniu).

## Spec (JSON) i API dla AI

Każdy obraz to spec — ten sam spec z tym samym ziarnem daje ten sam obraz:

```json
{ "size": 1024, "aspect": 1.25, "seed": 7, "subject": "landscape", "palette": "natural",
  "technique": "oil", "stroke": 1, "detail": 1, "surface": "canvas", "relief": 0.6, "light": 135,
  "varnish": 0.15, "cracks": 0, "age": 0, "convert": [{ "kind": "halftone", "size": 8 }], "format": "none", "text": "" }
```

- W kodzie: `import { render } from 'js/render/art/artkit.js'` → `render(spec, { image })` → `{ canvas, spec }`.
- Na stronie: `window.ArtApi.render(spec)` → PNG (data URL), `ArtApi.spec()`, `ArtApi.lists` (tematy, techniki,
  powierzchnie, konwersje, formaty, palety), zakładka **API** w konsoli.
- Okno „Format i eksport”: zapis PNG, kopiowanie i wklejanie specu. Ustawienia w przeglądarce: `gameLab.art.v1`.
