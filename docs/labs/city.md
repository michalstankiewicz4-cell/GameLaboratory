# Laboratorium miasta (`labs/city.html`)

Kreator budynków dla gier: domy, kamienice, bloki, wieżowce, biurowce i markety na dowolnym obrysie, z oknami,
wejściami, witrynami, balkonami, gzymsami i dachami rozmieszczanymi proceduralnie z krótkiego opisu. Kit: **CityKit**
(`js/models/city/`, opis: [`../models/city.md`](../models/city.md)); strona: `js/labs/city/city.js`, arkusz
`ui/pages/city.css`. Scena bazowa (`js/labs/shared/stage.js`): niebo, grunt, słońce z cieniem, pora dnia i pogoda.

Osobne laboratorium — **Laboratorium budynków** (`labs/buildings.html`, BaseKit) to moduły bazy z gry kosmicznej
(z animacjami budowy) i zostaje bez zmian.

## Dwie wersje budynku

- **Blisko — siatka:** mur z otworami, wnęki okien (ościeża), szyby, ramy, słupki, ślemiona, drzwi, parapety, płyty
  i balustrady balkonów, cokół, gzymsy, dach. Siatki zgrupowane po materiale (kilka wywołań rysowania na budynek).
- **Daleko — wypalona fasada z paralaksą:** ściany to płaskie prostokąty (piętra — jeden na ścianę, kafelek
  powtarzany; parter — jeden na moduł), a fasada jest wypalona w tekstury: barwa, normalne, wysokość, AO /
  szorstkość / metaliczność i numer okna. Shader (parallax occlusion mapping) prowadzi promień oka w pole wysokości,
  więc okna wyglądają na wnęki, a parapety, gzymsy i balkony — na wystające. Kamienica: ok. 7 000 trójkątów blisko,
  ok. 170 daleko; blok 31 000 → 76; wieżowiec 78 000 → 188.
- **Z odległości (jak w grze):** obie wersje, przełączane w odległości „Switch at” (domyślnie 2 × promień budynku,
  od 40 do 150 m — dalej siatka z bliska tylko migocze drobnymi ramami) z zapasem ±10 %. W edytorze sceny przełącza świat (prefabrykaty `city/*` z `lod: true`).
- Nocą świecą okna — **te same** blisko i daleko: o oknie decyduje liczba z ziarna (ziarno, ściana, moduł,
  kondygnacja, okno), liczona tak samo w JS i w shaderze. Część świecących — suwak „Lit windows”; trzy barwy światła.

## Okna

- **Budynek:** szerokość, głębokość, ramię (L, U), ścięcie narożnika, kondygnacje, wysokość piętra i parteru, ściana
  frontu (wejścia, witryny), ziarno; zapis pod nazwą — zasób **building** (`js/scene/assets.js`).
- **Fasada:** mur (gotowy materiał MatKit albo zapisany w laboratorium materiałów), barwa muru, szerokość przęsła,
  układ piętra (okno, okno + balkon, balkon, dwa okna + pas muru…), okna (rodzaj: pojedyncze, pasmowe, ściana
  kurtynowa; szerokość, wysokość, parapet, słupki, głębokość wnęki, ślemię, barwy ramy i szyby), balkony.
- **Parter i gzymsy:** front i pozostałe ściany (witryny, okna, przeszklenie, mur), liczba wejść, barwa drzwi, cokół,
  gzyms nad parterem, pasy między piętrami, gzyms wieńczący.
- **Dach:** płaski z attyką, dwuspadowy (prostokąt; inny obrys — kopertowy), kopertowy, mansardowy; spadek, okap,
  attyka, barwa.
- **Wypalona fasada:** rozdzielczość (32 / 64 / 128 px na metr; jakość tekstur silnika „niska” — połowa), paralaksa
  włącz / wyłącz (porównanie z samą mapą normalnych), odległość przełączania, liczby (kafelki, czas wypalania,
  pamięć tekstur), podgląd map wybranego kafelka (klik — PNG).
- **Opis (JSON)**, **Kamera** (front, narożnik, bok, z góry, daleko), **Światło i pogoda** (pogoda, pora dnia,
  świecące okna), **Wydajność**.

## Obrys

Gotowe: prostokąt, L, U, narożnik ze ściętym rogiem. **Draw outline** — rysowanie na gruncie: klik dodaje
wierzchołek (siatka co 0,5 m), Enter, klik w pierwszy punkt albo „Finish outline” zamyka, Backspace cofa, Esc
przerywa. Obrys jest wyśrodkowywany i ustawiany przeciwnie do ruchu wskazówek zegara; front — krawędź 0.
Ten sam format przyjmie obrys z mapy (np. OSM w grze CityExplorer — następny krok).

## Budynki Warszawy (OpenStreetMap)

Na liście budynków grupa **Warsaw (OpenStreetMap)**, budynki pod adresami (bez nazw własnych): pl. Defilad 1
(z iglicą), Al. Jerozolimskie 54 (dworzec, dach na słupach), Złota 44, Emilii Plater 49, Chmielna 69, pl. Europejski 1,
rondo ONZ 1, Twarda 2/4, Chłodna 51 — te, które narzędzie znalazło w mapie. Bryła jest z mapy: obrys budynku i jego części (Simple 3D Buildings) z wysokością,
początkiem nad gruntem, kształtem i wysokością dachu, kolorami muru i dachu. Wygląd jest nasz — styl budynku CityKit
(mur, okna, parter, gzymsy; okna Fasada, Parter i gzymsy, barwa dachu), z wersją bliską i wypaloną daleką. Pola
obrysu, kondygnacji, frontu i rodzaju dachu znikają (są z mapy). Zapis pod nazwą zapamiętuje budynek i styl.
Dane: © współtwórcy OpenStreetMap (ODbL), pobierane narzędziem `tools/city-osm.mjs` ([`../models/city.md`](../models/city.md)).

## Zniszczenie (1.3.0, z Tornado.io)

Przełącznik **Building | Destruction** na pasku. Tryb Destruction: budynek z części (HouseKit — dom z cegły, „kostka”,
stodoła, garaż, szopa, blok z wielkiej płyty — albo budynek Warszawy z tego laboratorium przeliczony na części) w świecie
zniszczeń DestructKit ([`../behaviors/destruct.md`](../behaviors/destruct.md), [`../models/houses.md`](../models/houses.md))
na gruncie laboratorium. Każda część pęka według swojego materiału (mur na warstwy i cegły, beton na płaty, deski wzdłuż
słojów, szyba promieniście od uderzenia, dachówka rzędami, blacha arkuszami) i stoi, dopóki stoi to, na czym się opiera.

- Narzędzia na pasku (klawisze 1 2 3), kliknięcie budynku: **Hit** — uderzenie w punkcie (impuls, promień), **Throw** —
  rzut z kamery przedmiotem złomowiska albo kamieniem (prawdziwa masa i prędkość; tor balistyczny w punkt, zderzenie
  liczy świat), **Tornado** — trąba w tym miejscu (wiatr i rdzeń z suwaków, wir na miarę `set({ rc, top, vmax })`);
  *Go through the building* — trąba idzie przez budynek, *Stop* ją wyłącza. Szyby pękają od wiatru pierwsze, dachówki
  i blacha odlatują, mury padają ostatnie.
- **Rebuild** (B) — budynek od nowa. Okno **Destruction**: budynek, ziarno, *Another one*, **Village** (sześć różnych
  budynków obok siebie — do rzutów i przejścia trąby), kolory materiałów, lista materiałów z liczbą części.
- Okno **Debris**: tempo czasu, limit odłamków (najmniejsze leżące najdłużej znikają), pauza.
- Opis: części całe / wszystkie, zniszczone (objętość), odłamki, w ruchu, w spoczynku, wymiary; Wydajność: siatki
  w batchach, wierzchołki, batche (materiały), czas budowy.

Pliki: `js/labs/city/destruct/` — `destruct.js` (tryb: narzędzia, krok, okna, API), `houses.js` (budynki i angielskie
nazwy części i materiałów), `missiles.js` (przedmioty do rzucania).

## API dla AI

`window.CityApi`: `make(opis)` → opis po sprawdzeniu (i budynek), `spec`, `types`, `footprints`, `info` (wymiary,
okna, trójkąty i wywołania obu wersji), `save(nazwa)` → zasób `building`, `night(0…1)`, `mode('building' | 'destruct')`; `destruct`: `build(rodzaj, ziarno)`,
`village()`, `hit([x, y, z], [jx, jy, jz], promień)`, `sweep()`, `stop()`, `tornadoAt(x, z)`, `simulate(sekundy)` (bez
rysowania, krokami 1/30 s), `stats()`, `types`, `world`. Zakładka **API** w konsoli.
Adres `labs/city.html?type=<rodzaj>` otwiera rodzaj (edytor sceny: „Otwórz w laboratorium”), `?landmark=<id>` —
budynek Warszawy; `CityApi.make({ landmark: 'defilad-1', … })` (identyfikator — adres), `CityApi.landmarks` — lista.
