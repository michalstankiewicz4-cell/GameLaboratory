# Laboratorium przedmiotów (`labs/items.html`)

Codzienne śmieci w prawdziwej skali i masie: opony (samochodowa 205/55 R16, rowerowa 700×35C, traktorowa 18.4-38),
puszka aluminiowa (cała i zgnieciona), garnek, gazety związane sznurkiem, karton, beczka 200 l, sztabki. Modele
z JunkKit (`js/models/junkyard/`, z gry Złomowisko — repo Trash, z historią); opis każdego: [../models/junkyard.md](../models/junkyard.md).

## Co widać

- Przedmiot na kawałku gruntu pod niebem SkyKit (pogoda i słońce w oknie Światło i pogoda).
- **Model z bliska (LOD 0) i z daleka (LOD 1) obok siebie** — po prawej drugi LOD; przełącznik „Far model” zamienia je.
- Warianty (puszka: piwo, cola, woda; beczka: niebieska, czerwona, oliwkowa; sztabka: aluminium, stal, mieszanka).
- Siatka (wireframe) i **kształt zderzenia** z części wypukłych (`shapes.js`: pierścień opony, walec, prostopadłościan,
  naczynie garnka, bryły) — taki, jaki dostaje silnik fizyki.
- Dane w oknie Przedmiot: wymiary, masa, materiał, opór na zgniecenie w osiach X · Y · Z (kN), do ilu procent da się
  zgnieść, części zderzenia, trójkąty obu LOD, wersja modelu.

Teksty modeli (nazwy w `info`, napisy na teksturach, nazwy części) są po polsku, jak w grze.

## Deformacja (1.2.0, z Tornado.io)

Przełącznik **Item | Deformation** na pasku. Tryb Deformacja: stalowe beczki 200 l jako powłoki z blachy, która się
trwale gniecie (zachowanie DeformKit, [`../behaviors/deform.md`](../behaviors/deform.md)), pod stalowymi blokami prasy.
Beczka to zwykły model JunkKit — nie wie o deformacji; jej rzadka siatka fizyczna powstaje z opisu powłoki w danych
przedmiotu (`info.shell` → `js/models/junkyard/shells.js`, jak zderzacz z `info.collider`).

- **Board** (plansza): pięć beczek — pionowo, pochylone o 23°, 45° i 68° (w betonowych kołyskach w kształcie L) i bokiem
  (między klinami); nad każdą prasa. Prasa zatrzymuje się na podporach albo 2 cm nad ziemią.
- **Container** (kontener): kontener bez dachu (wnętrze 2,2 × 1,3 m, ściany 1,6 m, na dwóch płozach) z siedmioma beczkami
  w dwóch warstwach: dwie stojące, leżąca w poprzek, leżąca wzdłuż, stojąca; na górze leżąca na stojących i pochylona —
  zaczynają nieco wyżej, spadają i układają się same (każda przy ustawianiu podnoszona, aż jest co najmniej 1 cm ponad
  stykiem z już postawionymi). Jedna prasa na cały kontener (szczelina przy ścianach 1,5 cm) zjeżdża do 8 cm nad dno.
  Beczki odpychają się cząstkami; ich siatka fizyczna jest cofnięta o promień styku (2,5 cm), więc osadzony model
  dotyka sąsiada blachą. W kontenerze plastyczność działa też wtedy, gdy prasa naciska przez inne beczki.

Okno **Deformation**: prędkość prasy od zera (cm/s), **Lift the presses** (U — prasy do góry, 20 cm/s; beczki zostają
zgniecione), **Start over** (R — nowe beczki), **Walls** (przezroczystość kontenera), **Colliders** (bryły zderzeń: prasa
czerwona, podpory i ściany żółte; siatka fizyczna beczek z cząstkami, ramki beczek fioletowe, cząstki chwytu zielone),
zgniecenie każdej beczki i wysokość jej prasy. Kliknięcie beczki przykleja ją do kursora (w górę podnosi), kolejne
puszcza; W A S D przesuwają kamerę. Stały krok fizyki 1/60 s, nowy dopiero, gdy wszystkie beczki (każda w swoim wątku)
skończyły poprzedni — gdy wątki nie nadążają, symulacja zwalnia zamiast się rozjeżdżać.

Pliki: `js/labs/items/deform/` — `deform.js` (tryb: krok, okno, API), `rigs.js` (plansza i kontener), `preview.js`
(podgląd zderzaczy), `grab.js` (chwytanie myszą).

Ciśnienie powietrza w beczce nie jest liczone.

## Dla AI

`window.ItemsApi`: `list()`, `await show(id, { variant, lod1, wire, coll, pair })` → dane przedmiotu, `info()`,
`await mode('item' | 'deform')`; `deform`: `speed(cm/s)`, `lift()`, `scene('board' | 'container')`, `alpha(0–1)`,
`reset()`, `state()` (zgniecenie, położenie prasy, cząstki, więzy każdej beczki), `await run(sekundy)` (kroki po kolei,
każdy czeka na wątki beczek).
Adres `labs/items.html?item=<id>` otwiera przedmiot (z edytora sceny: „Otwórz w laboratorium”).
