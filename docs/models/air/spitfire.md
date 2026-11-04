# Supermarine Spitfire Mk I (1940) — AirKit

Kod: `js/models/air/spitfire.js`, kit `js/models/air/airkit.js` (`window.AirKit`). Oglądany w laboratorium pojazdów (ląd).
Układ: +Z przód, +X lewe skrzydło, Y w górę; 1 j. = 1 m. Na ziemi stoi na kołach głównych i ogonowym (`info.rest`).

## Bryła
- Kadłub z przekrojów (loft), malowanie RAF 1940: Dark Earth / Dark Green z góry, Sky od spodu.
- Skrzydło eliptyczne z profilu NACA 22xx (grubość 13 % → 9,4 %, wznios 6°), lotki z osią zawiasu, klapy krokodylowe,
  chłodnica i chłodnica oleju pod skrzydłami, wyloty karabinów, rurka Pitota, światła pozycyjne.
- Znaki: kokardy B na górze i A pod skrzydłami (dopasowane do powierzchni skrzydła), A1 na kadłubie, litery „QV” i „K”,
  pasy na statecznik.
- Usterzenie: statecznik poziomy ze sterami wysokości, pionowy ze sterem kierunku, światło ogonowe.
- Kabina: wiatrochron, przesuwana owiewka (praca „Owiewka”), fotel, tablica przyrządów, celownik, drążek.
- Śmigło trójpłatowe z kołpakiem i rozmyciem tarczy przy obrotach; podwozie główne chowane na zewnątrz, kółko ogonowe skręcane.

## Sterowanie modelem
`update(t, dt, { throttle, aileron, elevator, rudder, flaps, gear, work, lights, speed })` — tylko wygląd (obroty śmigła,
wychylenia sterów, klapy, podwozie, owiewka, światła).

## Liczby lotu (`info.flight`)
Powierzchnia 22,48 m², rozpiętość 11,23 m, cięciwa średnia 2,08 m, masa 2700 kg, moc 770 kW, śmigło (ciąg statyczny,
sprawność), współczynniki nośnej, oporu, przeciągnięcia, momentów i podwozia (koła ze sprężyną, tłumieniem, hamulcami).
Czyta je zachowanie **„lot w atmosferze”** (`js/behaviors/air/flight.js`, środowisko ląd): bryła sztywna 6 stopni swobody,
siły aerodynamiczne z kąta natarcia i ślizgu, ciąg z mocy, momenty stateczności i sterów, koła na sprężynach.
Start, lot i lądowanie wynikają wyłącznie z sił.

## Plan AirKit
- Śmigłowiec PZL W-3 Sokół (z własnym zachowaniem lotu wirnika).
- Boeing (samolot pasażerski).
- F-15 (odrzutowy).
