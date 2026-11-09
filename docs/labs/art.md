# Laboratorium sztuki (`labs/art.html`)

Obrazy 2D na płótnie (canvas) — do gier z obrazami i znaczkami oraz do zwykłych obrazów dla AI. Kit: **ArtKit**
(`js/render/art/artkit.js`, bez Three.js) i **ArtExam** (`js/render/art/exam/`, silnik ekspertyzy z gry artchecker,
przeniesiony z historią); strona: `js/labs/art/art.js`, `ui/pages/art.css`. Ze sceną (edytor) na razie niepołączone.

Dwa tryby na pasku: **Paint** (ArtKit — malowanie obrazu) i **Examine** (ArtExam — obiekt do ekspertyzy: oryginał albo
fałszerstwo, oglądany pod lampami).

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

- **Spękania** (`cracks`): rowek pęknięcia i podwinięte brzegi wysepek farby (cupping) — w świetle bocznym jedna
  strona rowka jaśnieje, druga ciemnieje, zależnie od kierunku światła.
- **Pod lampą** (`view`): ten sam obraz w świetle dziennym, bocznym (sam relief), UV (stary werniks świeci
  zielonkawo, bez werniksu — ciemny fiolet), podczerwieni (farba przezroczysta, widać rysunek pod spodem, lekko
  przesunięty — poprawki autora) i RTG (gęstość: kryjące farby i metalowe podłoże jasne, spękania ciemne).

Liczba śladów techniki nie zależy od rozmiaru obrazu (ślady rosną z obrazem) — ten sam spec w 512 i 2048 px wygląda
tak samo, tylko ostrzej.

## Podgląd

Kółko myszy — zoom wokół kursora do 32×; przeciąganie — przesuwanie; dwuklik — dopasuj. Na pasku: Fit, 1:1, 4×
(pociągnięcia), 16× (włosie, splot płótna), „Sharp pixels” (ostre piksele przy powiększeniu).

## Examine — ekspertyza (ArtExam)

Obiekty z gry o odróżnianiu oryginałów od fałszerstw. Każdy egzemplarz jest oryginałem albo powstał jedną z metod
fałszerstwa (profil), która zostawia **zdrady** — widać je tylko w niektórych widokach.

| Obiekt | Widoki | Profile fałszerstw | Opis |
|---|---|---|---|
| obraz olejny (fikcyjni artyści, sceny z regionami: pigmenty, kierunek pędzla, gęstość) | dzienne, boczne, UV, IR, RTG, spękania, odwrocie; mikroskop (klik) | giclée, współczesna kopia, stare płótno, siatka, podrobione papiery | niżej |
| fragment obrazu (`fragment`) — oddarty róg, ubytki farby | jak obraz | fałszerstwo z wybranymi zdradami (pigment, odwrocie, UV, spękania, faktura, sygnatura, styl, IR, RTG, mikroskop) | niżej |
| popiersie z brązu (`sculpt`, 3D) | dzienne, UV, RTG (wnętrze odlewu) | surmoulage, cold cast (żywica), współczesny odlew, odlew z epoki, papiery | pomiary w `object.measure` |
| popiersie z marmuru (`marble`, 3D) | dzienne, UV, RTG | CNC postarzane kwasem, odlew z żywicy, kopia warsztatowa, papiery | [art/marble.md](art/marble.md) |
| banknot (`notes`) — z przechyleniem (hologram, farba zmienna optycznie, obraz utajony) | dzienne, boczne, przechodzące (znak wodny, nitka, recto-verso), UV, IR | inkjet, laser, offset, wybielony, hq | [art/banknote.md](art/banknote.md) |
| moneta (`coin`) | dzienne, rant, boczne | odlew, bita, stalowa, galwaniczna | [art/coin.md](art/coin.md) |
| znaczek (`stamp`) | dzienne, kąpiel znaku wodnego, odwrocie | faksymile, podgumowany, fałszywy przedruk, litografia | [art/stamp.md](art/stamp.md) |
| rękopis (`manuscript`) | dzienne, przechodzące, odwrocie | współczesny atrament, herbata, faksymile, dopisek | [art/manuscript.md](art/manuscript.md) |

Obraz: pigmenty mają daty (`js/render/art/exam/pigments.js`; np. biel tytanowa od 1921, błękit ftalocyjaninowy od
1935) — pigment młodszy niż obraz to anachronizm. RTG liczy jasność z gęstości pigmentów regionu (biel ołowiowa
najjaśniejsza), podczerwień pokazuje rysunek pod farbą (u kopii z siatki — siatkę), światło boczne — fakturę pociągnięć
w kierunku regionu (u kopii płaską albo pod złym kątem), spękania — naturalne nieregularne albo sztuczną siatkę.

Rzeźby 3D: popiersie na postumencie w scenie Three.js (r186, globalne `THREE` z `js/core/three-global.js`; w grze
r128 z sieci); przeciąganie obraca kamerę wokół popiersia, kółko przybliża (`ArtExam.cam`, `ArtExam.orbit`). Ślady
obróbki, patyna i sygnatura z tyłu cokołu widać po podejściu i obejściu rzeźby. Banknot: suwak **Tilt** (0–90°,
`ArtExam.tilt`, w API `tilt`).

Okno **Examination**: obiekt, artysta (obraz), ziarno, „Made as” (oryginał albo profil), zdrady do zaznaczenia (bez
zaznaczenia — losowane z profilu: główne zawsze, dodatkowe czasem), przyciski widoków, mikroskop.

Kod: skrypty klasyczne ze wspólnymi zmiennymi, jak w grze — kolejność w `ArtExam.SCRIPTS`, ładowane przy pierwszym
wejściu w Examine. `exam.js` zastępuje części gry, których nie przeniesiono (stan planszy, komunikaty, notatnik, nazwy
widoków) i daje API. Teksty obiektów (nazwy zdrad i profili) są po polsku, jak w grze. Historia gry:
[../history/artchecker.md](../history/artchecker.md).

## Spec (JSON) i API dla AI

Każdy obraz to spec — ten sam spec z tym samym ziarnem daje ten sam obraz:

```json
{ "size": 1024, "aspect": 1.25, "seed": 7, "subject": "landscape", "palette": "natural",
  "technique": "oil", "stroke": 1, "detail": 1, "surface": "canvas", "relief": 0.6, "light": 135,
  "varnish": 0.15, "cracks": 0, "age": 0, "view": "normal", "convert": [{ "kind": "halftone", "size": 8 }], "format": "none", "text": "" }
```

- W kodzie: `import { render } from 'js/render/art/artkit.js'` → `render(spec, { image })` → `{ canvas, spec }`.
- Na stronie: `window.ArtApi.render(spec)` → PNG (data URL), `ArtApi.spec()`, `ArtApi.lists` (tematy, techniki,
  powierzchnie, konwersje, formaty, palety), zakładka **API** w konsoli.
- Ekspertyza: `await ArtApi.exam({ kind, seed, artist, profile, tells, views, tilt })` → `{ object, views: { widok: PNG } }`
  (bez `profile` — oryginał; bez `views` — wszystkie widoki), `await ArtApi.examInfo()` — obiekty,
  `ArtApi.examInfo(kind)` — profile, zdrady, widoki (i artyści dla obrazu). W kodzie: `window.ArtExam.make(spec)`,
  `ArtExam.view(v)` → canvas, `ArtExam.micro(x, y)`.
- Okno „Format i eksport”: zapis PNG, kopiowanie i wklejanie specu. Ustawienia w przeglądarce: `gameLab.art.v1`.

## Pomysły (na później)

- **Tryb 3D** (propozycja przyjęta na później): obraz jako płaszczyzna 3D — mapa normalnych z wysokości farby ArtKit
  (impast, włosie, splot), mapa szorstkości (werniks błyszczy, sucha farba matowa); obracanie obrazu myszą i ruchome
  światło (odbicia wędrują po pociągnięciach i fakturze podłoża); nierówny barwnik (grubość i nasycenie w obrębie
  pociągnięcia, ziarno pigmentu); rama 3D — profil listwy wyciągnięty wzdłuż prostokąta, UV wzdłuż listwy, złocenie
  (złoto płatkowe na czerwonym bolusie prześwitującym na wytartych krawędziach, patyna w zagłębieniach). Po scaleniu
  ze sceną — obraz w ramie jako obiekt na ścianę.
- **Ilustracje do wiki** w menu Pomoc (plan: [../guides/lab-breakdown.md](../guides/lab-breakdown.md), „Pomysły na
  później”) — małe obrazki z `ArtApi.render` i `ArtApi.exam`.
- Z banku pomysłów gry artchecker (bank pomysłów i roadmapa w dokumentacji gry, nie przeniesione): meble, datowanie
  archeologiczne, przekrój warstw malarskich, tryb konserwatora — nowe obiekty dopiero, gdy powstaną w grze.
