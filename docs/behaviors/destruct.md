# Zniszczenie — DestructKit (`js/behaviors/land/destruct/`)

Zachowanie z Tornado.io (laboratorium zniszczeń, przeniesione 2026-11-26): budynki z części, które pękają tak, jak są
zbudowane. Środowisko: ląd. Oglądane w laboratorium miasta, tryb Destruction ([`../labs/city.md`](../labs/city.md));
budynki z części: HouseKit ([`../models/houses.md`](../models/houses.md)).

## Zasady

- Budynek = części (HouseKit): każda to wielokąt wypukły wyciągnięty na grubość, z materiałem i podporami.
- Materiał (`materials.js`) wybiera wzór pękania (`patterns.js`): mur — warstwy i cegły, beton — Woronoj, deski — wzdłuż
  słojów, szkło — promieniście, dachówka — rzędy, blacha — arkusze, belka — odcinki. Materiał niesie też gęstość,
  wytrzymałość (`hp` — ile uderzeń w N·s na m² przekroju wytrzyma), próg wiatru (`wind` — szyby pierwsze, ściany
  ostatnie), barwę przełomu (`frac`) i wygląd (MatKit).
- Statyka (`statics.js`): część stoi, dopóki stoi to, na czym się opiera (`need` — ułamek podpór, który musi zostać);
  kawałki pękniętej części trzymają się, dopóki łączą się (wspólną krawędzią) z podporą. Część bez podparcia spada
  w całości i pęka o ziemię.
- Odłamki to bryły sztywne (`physics.js`: grawitacja, opór powietrza, wiatr, grunt, spoczynek); za dużo odłamków —
  najmniejsze leżące najdłużej znikają (pył). Drobny gruz tylko do oglądania liczy karta (`chips.js`), poza fizyką.
- Uderzenia, wiatr, zderzenia (`impacts.js`): uderzenie w punkcie (impuls, promień) zabiera wytrzymałość częściom
  w zasięgu; wiatr ponad progiem materiału niszczy części (dachówki, blacha i szyby odlatują w całości); szybka, ciężka
  bryła (rzucony przedmiot, gruz, spadająca część) niszczy część albo się od niej odbija.
- Rysowanie (`batches.js`): jeden BatchedMesh na materiał (bez odrzucania części na CPU — karta rysuje; szkło
  sortowane), zmiany wysyłane na kartę częściowo (`js/render/partial-upload.js`). Budynki ukryte (`hidden`) trafiają na
  kartę dopiero przy pierwszym uszkodzeniu, po kawałku (budżet czasu na klatkę) — do tego czasu gra może pokazywać
  model z laboratorium miasta (`onReveal` mówi, kiedy go schować).
- Pożary (`burn.js`): palą się tylko materiały z polem `burn` (deski, strop, belki, ramy, drzwi, papa), palne przedmioty
  (`ITEM_BURN`: gazety, kartony, opony), drewniane odłamki, drzewa i trawa; niepalne nie przenoszą ognia. Wygląd —
  FireKit. `createBurning({ world, fire, terrain, forest, wind })` potrzebuje siatki terenu i lasu (w Tornado.io — gra);
  przeniesione razem z silnikiem, w laboratorium jeszcze nieużyte.
- Nie poprawiamy wyglądu pojedynczych budynków ręcznie — poprawka idzie do wzoru albo do HouseKit, ogólnie.

## Pliki

| Plik | Co robi |
|---|---|
| `world.js` | `createWorld(scene, opts)` — świat: budynki, odłamki, krok, rysowanie, liczby; składa resztę |
| `statics.js` | pękanie części i statyka (podpory, odpadanie kawałków, spadanie, rozbicie o ziemię) |
| `impacts.js` | uderzenie w punkcie, wiatr, zderzenia brył z częściami |
| `physics.js` | bryła sztywna (`makeBody`, `stepBody`, `applyImpulse`, `wake`) |
| `physics-link.js`, `physics-worker.js` | krok brył w osobnym wątku (`opts.physicsWorker` — adres modułu środowiska z `ground(x, z)` i `wind(stan, x, y, z, out)`) |
| `patterns.js` | wzory pękania wg materiału (`fracture`) |
| `geom2d.js`, `extrude.js` | wielokąty 2D (przycinanie, Woronoj, styk) i wyciąganie części na grubość |
| `materials.js` | materiały części (`MATS`, `registerMat` — np. budynki z laboratorium miasta) i ich wygląd |
| `batches.js`, `chips.js` | rysowanie części i odłamków, drobny gruz |
| `burn.js` | pożary |

## API świata

`createWorld(scene, { ground, wind, maxFragments, chips, physicsWorker })` → `{ addHouse(house, { x, z, rot, hidden }),
addObject(obj3d, { m, pts, r, A, size, kind, sleep }), hit(punkt, J, { radius }), windDamage(x, z, R, speedAt, dt),
update(dt, { sync }), sync(), removeBody(b), stats(), clear(), query(x, z, r), breakPart, drop, reveal, setChar,
onBreak(fn), onFragment(fn), onReveal(fn), bodies, buildings, batches, env, wake, maxFragments, time, physicsThread }`.

Bryła: `{ p, q, v, w, m, r, A, size, state: 'active' | 'sleep' | 'held', kind: 'frag' | 'part' | 'item', mat }`.
`dispose()` — jak `clear()` i drobny gruz zdjęty ze sceny (koniec gry w scenie).

W scenie (edytor, ▶ Graj): zachowanie „Zniszczenie” (`js/scene/destruct.js`, opis w [`../scene/README.md`](../scene/README.md)).
