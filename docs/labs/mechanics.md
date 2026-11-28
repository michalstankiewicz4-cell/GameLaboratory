# Laboratorium mechaniki (`labs/mechanics.html`)

Z Tornado.io (przeniesione 2026-11-26), kategoria **Maszyny i mechanika**. Modele: [`../models/mech.md`](../models/mech.md).
Pliki laboratorium (`js/labs/mechanics/`): `mechanics.js` (scena, tryby, wybór, kamera, okna, API), maszyna i instalacja — model
`js/models/mech/assemblies/engine-layout/`, fizyka układu — `js/behaviors/land/mech/engine-layout.js`; `physics-mode.js` (tryb Fizyka: okno Opis, kontrole brył zderzeń, hitboxy),
`items-mode.js` (tryb Przedmioty: stół, ustawienia), katalog przedmiotów `items.js` (pliki w `items/`), obok łoża: zegar
`clock.js`, automatyka `automation.js`, stanowiska `trigger.js`, `hydraulic-station.js`, `fountain-station.js`,
`optics-station.js`; języki `lang.js`, `lang-en.js`. Scena: wspólna scena bazowa laboratoriów `js/labs/shared/stage.js` (niebo, światło z pogodą, mgła, płaski grunt), hala (posadzka i lampy) z modelu układu silnika. Strona po
angielsku z tekstami polskimi w `data-pl`; dane przedmiotów i maszyny po polsku — w języku angielskim tłumaczone
słownikiem (sekcja „Języki”). Uzupełnione z Tornado.io 2026-11-28 (mechanika 0.12.0–0.20.0: zamiana ruchu, łożyska,
śruby, zegar, czujniki i PID, płyny, optyka; doktor — `clash`).
Suwaki Silnik, Hamulec, Obudowy, Reset mocowań i Hitboksy — w oknie **Machine** (w Tornado.io były na pasku).

`labs/mechanics.html`, skrypt `js/labs/mechanics/mechanics.js`, modele MechKit `js/models/mech/mechkit.js`, napęd
`js/behaviors/land/mech/drive.js` (środowisko ląd).

Kategoria 1 — **transmisja ruchu**. Dwa tryby (przełącznik na pasku):

## Przedmioty

Każdy przedmiot osobno na stole (na statywie z czopem wzdłuż osi obrotu; silnik i oprawa łożyska — na blacie). Okno
**Przedmioty** — wybór, okno **Ustawienia** — parametry przedmiotu i prędkość obrotu podglądu, okno **Element** —
wyliczone dane, ostrzeżenia i porty. Katalog: `js/labs/mechanics/items.js` (`ITEMS`: `params` i `build(p)`).

| Przedmiot | Ustawienia | Ostrzeżenia |
| --- | --- | --- |
| Zębatka walcowa | zęby, moduł, kąt przyporu, szerokość, otwór, materiał, otwory odciążające, piasta | podcięcie stopy (z < 2/sin²α), za duży otwór |
| Para zębatek | zęby obu kół, moduł, szerokość, materiał koła | — (przełożenie, odległość osi, wskaźnik przyporu) |
| Przekładnia planetarna | zęby słonecznego i satelitów, liczba satelitów, moduł, szerokość | warunek montażu (zs + zr)/n, kolizja satelitów |
| Koło koronowe | zęby, moduł, szerokość, wieniec, materiał | — |
| Koło łańcuchowe | zęby, łańcuch 06B / 08A / 10A / 12A, materiał | mniej niż 13 zębów (efekt wielokąta) |
| Napęd łańcuchowy | zęby obu kół, łańcuch, odległość osi | — (liczba ogniw parzysta, odległość dobrana) |
| Koło pasowe | średnica, profil SPZ / SPA / SPB, liczba rowków, materiał | średnica poniżej zalecanej |
| Napęd pasowy | średnice, profil, liczba pasów, odległość osi | kąt opasania poniżej 120° |
| Wał | długość, średnica, materiał, rowek wpustu | — |
| Łożysko w oprawie | otwór (UCP204–208), wysokość osi | — |
| Sprzęgło kłowe | średnica, gwiazda (92 Sh A, 98 Sh A, 64 Sh D) | — |
| Sprzęgło kołnierzowe | średnica, liczba śrub | — |
| Przegub Cardana | kąt łamania, podwójny (układ Z) | — (przełożenie chwilowe na żywo) |
| Silnik elektryczny | moc 0,18–7,5 kW (wielkość IEC), bieguny, kolor | — |
| Hamulec tarczowy | średnica, grubość, otwory | — |
| Wyłącznik | rodzaj (krzywkowy, główny, dźwigniowy), bieguny, prąd | — (stan 0 / I na żywo) |
| Potencjometr | rezystancja, charakterystyka (B / A), kolor pokrętła | — (położenie, napięcie suwaka) |
| Przycisk 22 mm | kolor, chwilowy / z podtrzymaniem, styk NO / NC, podświetlenie, grzybkowy | — (styk na żywo) |
| Falownik z pokrętłem | moc, częstotliwość maks., rampa, bieguny silnika | — (zadana i wyjściowa Hz, U/f, obroty) |
| Grzybek bezpieczeństwa | styki (1 NC, 2 NC, 1 NC + 1 NO) | — (zatrzaśnięty / zwolniony) |
| Lampka sygnalizacyjna | kolor, zasilanie 24 V / 230 V | — (świeci / zgaszona) |
| Przełącznik wyboru | pozycje 0–I / I–0–II, powrót sprężyną, rączka | — (pozycja, styki) |
| Wyłącznik krańcowy | dźwignia z rolką / popychacz | — (najechany, styki NO / NC) |
| Stycznik | prąd AC-3, cewka, styk pomocniczy | — (cewka, styki główne i pomocniczy) |
| Przewód | przekrój, kolor izolacji, długość | — (rezystancja, obciążalność, spadek napięcia) |
| Źródło zasilania AC (umowne) | fazy, napięcie, częstotliwość, prąd maks. | — (wyjście, napięcie szczytowe) |
| Źródło zasilania DC (umowne) | napięcie, prąd maks. | — (wyjście) |

Grupa **Sterowanie** obsługiwana jest na modelu: klik — dźwignia, przycisk, RUN / STOP; przeciąganie w górę / w dół —
pokrętło (części z `userData.control`, modele w `js/models/mech/controls.js` z `api.press / release / drag / tick`).

## Fizyka

Trzeci tryb: ta sama maszyna liczona fizycznie (`js/behaviors/land/mech/physics.js`). Każda część ma własny kąt i prędkość;
połączenia (te same co w napędzie kinematycznym) są wiązaniami XPBD na kątach (C = θb − f(θa)), rozwiązywanymi tam
i z powrotem po drzewie połączeń, 96 podkroków na klatkę. Silnik (poślizg, moment krytyczny 18 N·m) napędza wirnik,
hamulec (tarcie suche) — tarczę, łożyska mają opór lepki. Prędkość zadaje **regulator przy silniku** (falownik:
pokrętło, RUN / STOP, FWD / REV, rampa 4 s): ω_syn = 4π f / p (silnik 4-biegunowy).

Punkty fizyki (dochodzą po kolei):

1. ✅ Luz w zazębieniu — z geometrii zębów (0,08·m), wiązanie z martwą strefą ±luz/2; zmiana kierunku przechodzi luz.
2. ✅ Sprężystość połączeń — sztywności skrętne z wymiarów i materiałów (wał G·J_p/L, gwiazda wg twardości, zazębienie,
   łańcuch, pas), tłumienie ζ; miękkie (< 10⁵ N·m/rad) — sprężyny jawne, bardzo sztywne — wiązania. Skręcenie i moment
   każdego sprężystego połączenia w oknie Opis.
3. ✅ Poślizg pasa, nierówny bieg łańcucha, straty tarcia. Pas: moment graniczny z Eulera–Eytelweina
   (napięcie wstępne 2 × 300 N, μ 0,3 w rowku klinowym 36°, opasanie 169° → 21,4 N·m na małym kole), pełzanie
   sprężyste do 1,5 %, ponad granicą poślizg (tarcie kinetyczne 0,85 granicy); poślizg mierzony z prędkości kół.
   Łańcuch: efekt wielokąta (z = 18 → prędkość koła biernego waha się o ±0,76 % na każdy ząb). Straty: sprawność
   połączeń (zazębienie walcowe 98 %, łańcuch 97 %, pas 96 %, planetarna 97 %, przegub zależnie od kąta, łożyska) —
   moment silnika rośnie o straty, okno Opis pokazuje straty w W i sprawność całkowitą. Hamulec — wiązanie tarcia
   ograniczone momentem (przy 100 N·m pas się ślizga, wyjście stoi, silnik się kręci).
4. ✅ Bryły zderzeń. Ząb zębatki to wielokąt wypukły — zarys ewolwentowy od stopy do głowy zamknięty cięciwą na
   kole stóp (`MechKit.toothHulls`, ten sam zarys co model); zderzenie zębów dwóch kół — osie rozdzielające (SAT)
   w płaszczyźnie obrotu (`js/behaviors/land/mech/contact.js`). Z brył, nie ze wzoru, wychodzi strefa swobody zazębienia:
   dla kąta koła a — o ile koło b może się obrócić w przód i w tył, zanim ząb dotknie zęba (tabela 48 faz na
   podziałkę, liczona raz przy starcie, ok. 0,1 s na zazębienie). Wiązanie zazębienia ma te granice zamiast stałego
   ±luz/2: luz 20 : 40 — 0,34–0,36 mm wzdłuż przyporu, 16 : 48 i 24 : 40 — 0,25–0,26 mm (nieco więcej niż 0,08·m, bo
   flanki to łamane wpisane w ewolwentę); położenia nominalne bez przenikania. Pole **Hitboksy**: zębatki — bryły
   zębów, walec stóp i walce piast; inne części obrotowe — walce; nieruchome — prostopadłościany.
   - Koła łańcuchowe: zarys wg ISO 606 (gniazdo r_i, kąt osadzenia 140° − 90°/z, bok r_e = 0,008·d₁·(z² + 180),
     głowa d_a — środek tolerancji), ząb niewypukły podzielony na części wypukłe (`MechKit.convexParts`, strzyżenie
     uszu + Hertel–Mehlhorn); rolki łańcucha — walce. Ogniwa leżą w gniazdach (`loopPath().seat`: przesunięcie ogniw
     i faza koła 2). Kontrola na żywo: rolki w pobliżu koła a zęby (SAT) — bez przenikania.
   - Przekładnia planetarna: zęby wewnętrzne korony (`MechKit.ringHulls`, części wypukłe); kontrola na żywo — luz
     każdego satelity ze słonecznym i z koroną (obrót satelity do dotyku w obie strony): ok. ±0,08 mm.
   - Zahaczenia części obrotowych o nieruchome (obudowy, łożyska, podpory, łoże, zacisk): część obrotowa zakreśla
     bryłę obrotową (obrys promieniowy co 1 mm z krawędzi trójkątów), trójkąty części nieruchomych przecinane
     płaszczyznami — jedna kontrola przy starcie obejmuje każdy kąt; zahaczające podświetlone na czerwono.
   - Co kontrole znalazły i poprawiono (w generatorach): korona przekładni planetarnej obrócona o pół podziałki
     (zęby satelitów w zębach korony), ogniwa łańcucha między gniazdami (0,63 podziałki), rolki schodzące z koła
     wchodzące w zęby (stary zarys bez boku r_e), zacisk hamulca jako pełny klocek przez tarczę i wspornik zacisku
     przechodzący przez tarczę (teraz zacisk okracza tarczę: dwie obudowy klocków i mostek; wspornik obok).
5. ✅ Obwód elektryczny (`js/behaviors/land/mech/circuit.js`). Instalacja przy silniku, obsługiwana na modelach:
   źródło X0 3 × 400/230 V 50 Hz (TN-S) → wyłącznik główny Q1 → stycznik K1 → falownik → silnik; sterowanie 230 V:
   L1 → grzybek S0 (NC) → STOP S1 (NC) → START S2 (NO) ∥ styk pomocniczy K1 13-14 (podtrzymanie) → cewka K1 → N,
   lampka H1 „praca” równolegle do cewki; zadawanie częstotliwości potencjometrem R1 (10 kΩ, wejście AI 0–10 V
   = 0–50 Hz). Kable `ControlKit.cable` z przekrojem i długością (W1–W3 5G/4G2,5, W4 4G1,5 do silnika, W5 5×1
   sterowanie, W6 3×0,5 potencjometr). Rozwiązanie co klatkę: sieci z zamkniętych połączeń (union-find), napięcie
   sieci — fazor źródła albo brak, dwa różne fazory w jednej sieci — zwarcie; napięcie odbiornika |V_a − V_b|
   (trójfazowy — najmniejsze międzyprzewodowe). Stycznik: zadziała przy ≥ 85 % Un po 20 ms, odpada < 60 % Un.
   Falownik bez zasilania — wyjście wyłączone, silnik wybiega (moment 0); po powrocie zasilania STOP (nowe RUN).
   Okno Opis: stan styków, napięcie cewki, lampka, pobór falownika (moc, prąd fazowy), napięcie U/f i prąd silnika,
   spadek napięcia w kablach. `MechanicsApi.circuit('power' | 'main' | 'start' | 'stop' | 'estop' | 'test' | 'pot', v)`.
   Praca i kierunek z kasety: przełącznik S3 I-0-II (I — w przód, 0 — stop, II — wstecz; zawsze przez 0) na wejścia
   cyfrowe falownika DI1 / DI2, zasilane z jego wewnętrznych 24 V DC (kabel W7 4×0,5; wejście aktywne ≥ 15 V,
   IEC 61131-2). Falownik w trybie sterowania z zacisków (TERM): RUN i FWD / REV na panelu nie działają, STOP z panelu
   działa. Ochrona przed samoczynnym startem: po włączeniu zasilania (rozruch 0,5 s) albo STOP z panelu praca rusza
   dopiero po przestawieniu S3 na 0 i z powrotem (na wyświetlaczu BLOK). `MechanicsApi.circuit('dir', 'I' | '0' | 'II')`.

## Maszyna

Jedna maszyna na żeliwnym łożu, złożona z elementów połączonych portami:

1. silnik indukcyjny 1,1 kW (falownik — prędkość z suwaka) → sprzęgło kłowe z gwiazdą z poliuretanu → wał 1,
2. para zębatek 20 : 40 (moduł 4, zarys ewolwentowy, α = 20°; mała ze stali, duża z mosiądzu),
3. przekładnia dwustopniowa współosiowa 16 : 48 i 24 : 40 (moduł 3) w obudowie z akrylu na profilach 20 × 20,
4. łańcuch rolkowy 08A (podziałka 12,7 mm) na kołach 18 i 27 zębów — odległość osi dobrana do parzystej liczby ogniw,
5. pas klinowy SPA na kołach Ø 160 i Ø 80 (żeliwo, rowek 36°),
6. sprzęgło kołnierzowe sztywne, wał przegubowy z dwoma przegubami Cardana (25°, układ Z),
7. przekładnia planetarna: słoneczne 24, 3 satelity 24, korona 72 (stała) — i = 4,
8. hamulec tarczowy i tarcza z podziałką na wale wyjściowym.

Suwaki na pasku: **Silnik** (obr/min, od zera), **Hamulec** (N·m na wyjściu), **Obudowy** (przezroczystość akrylu).
Kliknięcie elementu (albo nazwy w oknie Napęd) — okno **Element**: właściwości (wymiary, materiał, masa, bezwładność),
prędkość, kierunek, moment, moc, sprawność od silnika i **porty** — z czym każdy jest połączony, wejście czy wyjście.
Kamera: przeciągnij — obrót, kółko — odległość, W A S D — przesuwanie; przyciski stanowisk w oknie Kamera.

## Elementy i porty

Każdy element ma właściwości i porty (`ports: [{ id, name, kind }]`). Połączenie łączy port jednego elementu z portem
drugiego i ma rodzaj:

| Połączenie | Związek kątów | Sprawność |
| --- | --- | --- |
| wał, sprzęgło | ten sam kąt | 1 / 0,995 |
| zazębienie | θb = −(za/zb)(θa − ψ) + ψ + π + π/zb (ψ — kierunek osi b od osi a: ząb a naprzeciw wrębu b) | 0,98 |
| łańcuch, pas | θb = θa · za/zb (ten sam kierunek; pas skrzyżowany — przeciwny) | 0,97 / 0,95 |
| przegub Cardana | z geometrii: sworzeń b ⟂ sworzeń a i ⟂ osi b — przełożenie zmienia się w czasie obrotu | 0,99 |
| przekładnia planetarna | θjarzma = θsłonecznego · zs/(zs + zr) (Willis, korona stała) | 0,97 |

Napęd przechodzi graf od silnika; część osiągnięta dwiema drogami jest sprawdzana — gdy przełożenia się nie zgadzają,
mechanizm jest zakleszczony i stoi. Prędkość każdej części to pochodna jej kąta po kącie silnika (różnica centralna),
więc działa też dla połączeń o zmiennym przełożeniu.

## Dynamika

Silnik: moment proporcjonalny do poślizgu (prędkość synchroniczna z falownika), ograniczony do 18 N·m. Bezwładność
zredukowana na wał silnika J = Σ Jᵢ·(ωᵢ/ω_s)² (masy i bezwładności z wymiarów elementów). Hamulec obciąża wyjście;
moment przenoszony przez element wynika z mocy hamulca i sprawności połączeń od tego elementu do wyjścia.

## MechKit

`gear` (zarys ewolwentowy, otwory odciążające, piasty), `ringGear`, `sprocket` (gniazda rolek wg ISO 606), `chainLoop`
(ogniwa jako instancje: rolki, płytki wewnętrzne i zewnętrzne, sworznie), `beltLoop` (przekrój SPA prowadzony po drodze,
nadruk przesuwany teksturą), `loopPath` (droga wokół dwóch kół: styczne i łuki), `chainDistance`, `pulley`, `shaft`
(z rowkiem wpustu — widać obrót), `pillowBlock` (oprawa UCP, wysoka — na słupku), `jawCoupling`, `flangeCoupling`,
`yoke`, `cross`, `motor`, `housing`, `tubeHousing`. Materiały z MatKit: stal szlifowana, stal ulepszona, mosiądz, stal
czerniona, żeliwo, aluminium, farba; akryl i guma jako materiały Three.js.

## API (`window.MechanicsApi`)

`mode('items' | 'machine')`, `item(id, ustawienia)`, `items()`, `control(nazwa, 'press' | 'release' | dy)`, `rpm(v)`, `brake(N·m)`, `alpha(0–1)`, `state()`, `elements()`, `select(id)`, `view(cel, odległość, yaw, pitch)`,
`run(sekundy)`, `drive`.


## Dane fizyczne i elektryczne części (przeniesione razem z modelami)

Każda część niesie swoje dane — laboratorium tylko je czyta i dokłada geometrię połączenia oraz schemat instalacji.

- **MechKit** (`js/models/mech/mechkit.js`): `userData.phys` z tabeli `PHYS` — zazębienie (`c` sztywności zęba, `zeta`,
  `eta`, pocienienie zęba `thin`·m → `luz`), wał (`G` wg materiału z `G_MAT`, gotowe `k = G·π·d⁴/(32·L)`), gwiazda
  sprzęgła kłowego (`k` wg twardości), sprzęgło kołnierzowe, łańcuch (`EA`), pas (`EA`, napięcie wstępne `F0`, `mu`,
  kąt rowka, tarcie kinetyczne, pełzanie), przegub Cardana (na krzyżaku), przekładnia planetarna (na koronie i na
  zestawie), łożysko (`drag`). Masa `mass` i bezwładność `J` — jak dotąd. Silnik: `userData.elec` z `MOTOR_ELEC`
  (sprawność, cos φ, prąd znamionowy `In` z mocy, prąd i straty biegu jałowego, napięcie, częstotliwość).
  Faza przekładni planetarnej: `planetPhase(zs, zp, zr, n)` — wspólna dla `planetary()` i laboratorium.
- **ControlKit** (`js/models/mech/controls.js`): `userData.elec` — stycznik (napięcie cewki, progi zadziałania /
  odpadania, czas, moce cewki, styki z numerami zacisków), falownik (sprawność, pobór jałowy, cos φ wejścia,
  napięcie, 24 V na wejścia DI, próg wejścia, AI 0–10 V, rozruch), lampka (napięcie, moc, próg świecenia), przyciski,
  grzybek, przełącznik (styki wg EN 60947), wyłącznik (bieguny, prąd), potencjometr (rezystancja), źródło (napięcie,
  fazowe, częstotliwość, układ sieci). Kabel: `R` żyły, długość, masa.
- **Zachowania** (`js/behaviors/land/mech/`): `drive.js` (sprawność połączenia z `phys.eta` części, która je tworzy),
  `physics.js`, `contact.js`, `circuit.js` — bez stałych części.
- **Zestaw „Układ silnika”** (dane tej maszyny, nie części; właściciel, 2026-11-27 — z laboratorium do modeli):
  `js/models/mech/assemblies/engine-layout/` — `machine.js` (rozmieszczenie na łożu, połączenia portów w napędzie),
  `installation.js` (regulator, urządzenia, kable z długościami z ułożenia, lista połączeń zacisków), wejście
  `engine-layout.js` (`buildEngineLayout({ hall })`). Fizyka układu (luz ze stref brył zębów, sztywności, łańcuch, pas,
  łożyska, krok klatki) — zachowanie `js/behaviors/land/mech/engine-layout.js` (`createEngineLayoutPhysics({ mc })`).
  Korzystają z nich laboratorium mechaniki i scena (`js/scene/mechanics.js`). W laboratorium zostały: okno Opis,
  kontrole brył zderzeń i hitboksy (`js/labs/mechanics/physics-mode.js`).

## Plan — kolejne elementy (2026-11-27)

Oznaczenia: ✅ jest (model, właściwości, porty, fizyka), 🟡 częściowo, ⬜ brak.

### Zasada: każdy element ma własne właściwości i porty

Element = model (`js/models/…`, dane w `userData.phys` / `userData.elec`) + porty z **rodzajem** + zachowanie
w fizyce. Połączyć można tylko porty tego samego rodzaju (albo przez element, który zamienia jeden rodzaj na drugi).
Wtedy kombinacje, których nikt nie zaprogramował jako gotowych urządzeń, działają same — np. wahadło → zapadka →
przekładnia → sprężyna → (próg napięcia) → wyzwolenie kolejnego mechanizmu.

Rodzaje portów (dziedziny) i co przenoszą:

| Port | Wielkości (wysiłek · przepływ) | Teraz |
|---|---|---|
| obrót | moment · prędkość kątowa | ✅ `drive.js` (porty `a`, `b`, `bore`, `mesh`, `chain`, `belt`), `physics.js` |
| przesuw | siła · prędkość liniowa | ✅ `el.dof = 'lin'` (współrzędna w m, J = masa) — listwa, suwak, nakrętka |
| prąd | napięcie · natężenie | ✅ zaciski w `circuit.js` |
| sygnał | wartość logiczna / analogowa (0–10 V, 24 V) | 🟡 wejścia falownika DI / AI; brak ogólnego portu |
| płyn | ciśnienie · przepływ objętościowy | ⬜ |
| światło | promień (kierunek, moc, długość fali) | ⬜ |

Każdy element opisuje w danych: porty wejścia i wyjścia, ich rodzaj, przełożenie / funkcję wejście → wyjście,
straty (sprawność), magazyn energii (jeśli ma), ograniczenia (zakres ruchu, próg, kierunek).

### Do zrobienia w silniku (przed nowymi kategoriami)

1. ✅ Wspólny opis portów w danych modelu (`userData.ports`: nazwa, dziedzina `MechKit.DOMAIN`, złącze) — części
   MechKit; `drive.connect` sprawdza złącza (`COMPAT`, zamiana ruchu `CONVERT`) i ostrzega w konsoli. 🟡 zaciski
   elektryczne — jeszcze w schemacie laboratorium.
2. 🟡 Fizyka wielu dziedzin: ✅ stopień swobody przesuwu obok obrotu (wiązania przesuw ↔ obrót: listwa, śruba, korba);
   ⬜ ograniczenia
   jednostronne (zapadka, krzywka, zderzak), progi i wyzwalanie (zatrzask), grawitacja dla wahadła.
3. ⬜ Ogólny sygnał (port sygnału + elementy logiczne), łączący czujniki, przekaźniki i wykonawcze.
4. ⬜ Laboratorium jako warsztat: wstawianie przedmiotów z katalogu, łączenie portów, ustawienia w miejscu —
   zamiast jednej zbudowanej maszyny.

### 1. Transmisja ruchu

- Zębatki ✅ walcowe, ✅ listwa zębata z zębnikiem (obrót ↔ przesuw, bryły zębów listwy); ⬜ stożkowe, ślimak i ślimacznica, o zębach skośnych.
- Przekładnie ✅ para walcowa, planetarna; ⬜ ślimakowa, stożkowa, cierna, wielostopniowa skrzynia z biegami.
- Łańcuchy ✅ 08A z kołami (ISO 606, efekt wielokąta); ⬜ inne podziałki, napinacz.
- Pasy napędowe ✅ klinowy SPA (poślizg, pełzanie); ⬜ zębaty, płaski, napinacz.
- Wały ✅ z łożyskami w oprawach, sztywność; ⬜ wał wielowypustowy (przesuw osiowy).
- Łożyska ✅ kulkowe 6205, walcowe NU, stożkowe 30205, wzdłużne 51105, igiełkowe NK, tuleja ślizgowa (dane katalogowe,
  trwałość L10, moment tarcia, koszyk); ⬜ łożyska w maszynie z rodzajem i obciążeniem z fizyki.
- Sprzęgła ✅ kłowe, kołnierzowe, przegub Cardana; ⬜ cierne (włączane), jednokierunkowe, przeciążeniowe, elektromagnetyczne.
- Zamiana ruchu ✅ korba i korbowód z suwakiem, ✅ śruba pociągowa (kulowa / trapezowa, samohamowność) z nakrętką na wózku,
  ✅ listwa zębata; ⬜ mimośród, krzywka z popychaczem.
- Napęd ✅ silnik indukcyjny z falownikiem, hamulec tarczowy.

### 2. Magazynowanie energii

- Sprężyny naciskowe ✅ (przedmiot: sztywność G·d⁴/(8D³n), zblokowanie zwojów, naprężenie z poprawką Wahla, częstotliwość własna,
  wyboczenie; podgląd — ściskanie z przebudową zwojów).
- Sprężyna spiralna w bębnie ✅ (przedmiot i zegar: k = E·b·h³/(12L), zwoje rozwinięte / nawinięte, wypełnienie bębna,
  naprężenie; naciąg zapadką). Sprężyny skrętne śrubowe ✅ (k = E·d⁴/(64·D·n), naprężenie z Ki, zacieśnianie zwojów na
  trzpieniu; podgląd — skręcanie ramienia; w zatrzasku stanowiska).
- Koła zamachowe ✅ (przedmiot: J z wieńca, ramion i piasty, energia ½Jω², naprężenie ρv², prędkość dopuszczalna).
- Akumulatory ✅ elektryczne (AGM, NMC, LiFePO4: napięcie od stanu naładowania, rezystancja wewnętrzna, rozładowanie
  z przyspieszeniem czasu, odcięcie; w stanowisku G1 zasila obwód); ⬜ hydrauliczne — przy kategorii 4.
- Zbiorniki ciśnienia ⬜ (płyn: objętość, ciśnienie, zawór bezpieczeństwa).

### 3. Ruch i sterowanie

- Wahadła ✅ z wychwytem Grahama (przedmiot i zegar; fizyka kontaktu zębów z paletami — `js/behaviors/land/mech/escapement.js`).
- Regulatory ✅ odśrodkowy (Watta) — mechaniczny (przedmiot); ✅ PID jako element sygnału (przedmiot z obiektem; w maszynie U1:
  enkoder → PID → wejście AI falownika, tryb A/M); falownik + potencjometr.
- Dźwignie ✅ (rodzaje 1, 2, 3: przełożenie siły i drogi, reakcja podpory; w stanowisku — napinanie zatrzasku).
- Zawory ⬜ (płyn: odcinający, zwrotny, dławiący, bezpieczeństwa).
- Przekaźniki ✅ stycznik z cewką i stykami (obwód); ✅ przekaźnik czasowy (E, Wi, Bp, R; w maszynie KT1 — RUN falownika po 2 s
  od START, lampka H1 ostrzega); ✅ przekaźnik sygnałowy (wtykowy w gnieździe na szynie DIN, kotwica z czasem zadziałania
  i odpadania, napięcie zadziałania; w stanowisku K2).
- Mechanizmy zapadkowe ✅ zapadka i koło zapadkowe (kąt zapadki z geometrii zarysu), ✅ wychwyt; ✅ zatrzask z wyzwalaczem
  (sprężyna skrętna, zaczep i zapadka z tarciem, elektromagnes; uderzenie w zderzak z odbiciami).
- Sterowanie elektryczne ✅ wyłącznik, przyciski, grzybek, przełącznik, potencjometr, lampka, krańcówka (model),
  stycznik, falownik z wejściami DI / AI.

### 4. Przepływ i transport

- Przewody ✅ elektryczne (pojedyncze, wielożyłowe kable z rezystancją); ✅ węże hydrauliczne (EN 853 1SN / 2SN, zakuwki),
  ✅ wąż przezroczysty (PCV z oplotem — widać płynącą ciecz i pęcherzyki, króćce z karbami, łączy się jak przewód).
- Rury ✅ (Darcy–Weisbach: laminarnie 64/Re, burzliwie Haaland; lepkość od temperatury; rura gięta ze złączkami).
- Źródła płynu ✅ sieć wodociągowa z reduktorem ciśnienia i wodomierzem, zbiornik na wieży (spływ grawitacyjny ρ·g·h).
- Pompy ✅ zębata (przecieki ∝ Δp, moment, pulsacja), tłokowa trzytłoczkowa (wydajność chwilowa), odśrodkowa
  (charakterystyka H(Q), prawa podobieństwa, punkt pracy z krzywą instalacji).
- Zawory ✅ kulowy (przelot z geometrii kuli), zwrotny, dławiący iglicowy (z zwrotnym), bezpieczeństwa (gradient sprężyny).
- Rozdzielacze ✅ 4/3 NG6 z cewkami, środek tandem, płyta przyłączeniowa.
- Siłowniki ✅ dwustronnego działania ze ściągami (siły, prędkości, wyboczenie Eulera).
- Zbiorniki ✅ zbiornik zasilacza (pojemność, ciepło), akumulator pęcherzowy (p·Vⁿ), wiadro, wskaźnik poziomu z pływakiem.
- Dysze ✅ (prędkość, wydatek, ciąg, wysokość strumienia — struga, krople, kręgi na wodzie).
- Transport ✅ przenośnik taśmowy z magazynem grawitacyjnym i popychaczem.
- Pomiar ✅ manometr, przetwornik 4–20 mA, licznik obrotów z obrotomierzem.

### 5. Optyka i sygnały

- Lustra ✅ (przedmiot „Lustro”, grupa Optyka): płaskie, wklęsłe i wypukłe (sferyczne), Ø 1/2" / 1" / 2", powłoki Al, Ag,
  Au i dielektryczna (odbicie zależne od długości fali), podłoże N-BK7 / UVFS / Zerodur, uchwyt kinematyczny na słupku;
  promienie śledzone geometrycznie (prawo odbicia, bez przybliżenia przyosiowego): ognisko z promieni, aberracja sferyczna,
  astygmatyzm pod kątem. Model: OptiKit `js/models/mech/optics.js`; promienie: `js/behaviors/land/mech/optics.js`.
- Soczewki ✅ (dwuwypukła, płasko-wypukła, płasko-wklęsła, dwuwklęsła; promienie z równania soczewkarza, aberracja sferyczna
  i chromatyczna ze śledzenia), pryzmaty ✅ (równoboczny, prostokątny; Sellmeier, najmniejsze odchylenie, rozszczepienie).
- Czujniki ✅ indukcyjny (B1 — zęby koła 1), ✅ bariera optyczna (B3 — otwory tarczy hamulca), ✅ enkoder (B2 — silnik),
  🟡 krańcówka (model); ✅ czujnik ciśnienia (etap 4), ✅ przepływomierz — rotametr.
- Emitery ✅ laser (405–850 nm, klasa, rozbieżność), źródło LED białe / barwne ze szczeliną.
- Odbiorniki ✅ fotodioda krzemowa z miernikiem (czułość widmowa, fotoprąd, wzmacniacz), ekran.

### 6. Elektronika i sprzęt

- Kamery ⬜.
- Monitory ⬜.
- Kolejne części elektroniczne i sprzęt — do dopisania.

### Kolejność (propozycja)

1. ✅ Porty w danych modeli + przesuw w fizyce + listwa zębata, korba, śruba (zamiana obrót ↔ przesuw) — wszystkie trzy
   tryby: przedmioty (grupa „Zamiana ruchu”), maszyna i fizyka (korba na tarczy z podziałką → suwak z listwą → zębnik
   na śrubie kulowej → nakrętka). Łożyska (6 rodzajów) w przedmiotach.
2. ✅ Sprężyny, koło zamachowe, zapadka, wahadło z wychwytem — pierwsza maszyna „sama z siebie”: zegar — regulator
   (tryby Maszyna i Fizyka; w Fizyce wahadło i koło wychwytowe z kontaktu zębów z paletami, napęd ze sprężyny).
3. ✅ Port sygnału, czujniki, przekaźnik czasowy, regulator.
4. ✅ Płyn: rury, węże, źródła, pompy, zawory, rozdzielacz, siłownik, zbiorniki, dysza, przenośnik — stanowisko
   hydrauliczne z podajnikiem i fontanna z dolewaniem, przelewem i wiadrem.
5. ✅ Optyka: promienie (Snell, Fresnel, Sellmeier), soczewki, lustra, pryzmaty, emitery i odbiorniki — stół optyczny.
6. Warsztat: składanie maszyn z katalogu w laboratorium.
7. Parowóz (w planach).


## Mocowania (śruby) i luźne części

Śruby i lista mocowań (`boltG`, `FIXT` z rolą części) — w modelu `js/models/mech/assemblies/engine-layout/machine.js`;
odkręcanie, ruch luźnych części i siły w łożyskach — w zachowaniu `js/behaviors/land/mech/engine-layout.js`
(`fixtureStep`, `toggleBolt`, `resetBolts`; w scenie ta sama fizyka); okno Opis (`boltRows`) — `physics-mode.js`.

Każda część stała ma śruby mocujące (`MechKit.bolt`, M6…M12, klasa 8.8; miejsca w danych modelu `userData.mounts` —
oprawy łożysk, silnik, wózek nakrętki; podpory laboratorium — w narożnikach stóp). Kliknięcie śruby w trybie Maszyna
lub Fizyka odkręca ją (albo dokręca), przycisk **Reset mocowań** dokręca wszystkie i stawia części na miejsce;
`MechanicsApi.bolts('reset' | 'unscrew' | 'screw', nazwa)`.

Fizyka luźnej części (tryb Fizyka) — moment reakcji z fizyki napędu:
- **Silnik** — moment stojana −T_m; przewraca się wokół krawędzi łap, gdy przekroczy m·g·b (15,5 kg, b = 90 mm →
  11,9 N·m); przechylony > 3° rozłącza sprzęgło kłowe. W tej maszynie pas ślizga się przy ok. 21 N·m na małym kole,
  więc moment silnika nie dochodzi do tej granicy — luźny silnik stoi.
- **Obudowa przekładni planetarnej** — wisi na wałach (łożyska w deklach): moment korony 0,75·T_jarzma kręci nią jak
  wahadłem; ponad m·g·d obraca się na wałach, a jarzmo traci moment (wyjście staje).
- **Wspornik zacisku hamulca** — moment hamowania przewraca go wokół krawędzi stopy; uniesiony > 2° — zacisk schodzi
  z tarczy, hamulec przestaje działać.
- Ponowne połączenie (Reset) — w bieżącym położeniu (sprzęgło / korona chwyta tam, gdzie stoją: przesunięcie fazy).
- **Siły promieniowe w łożyskach**: z momentów w połączeniach — zazębienie (obwodowa T/r_p i rozpór F_t·tg 20°,
  odpycha koła), łańcuch (cięgno czynne T/R ciągnie koła ku sobie), pas (2·F0), ciężar wału z kołami; siła na kole
  dzieli się dźwignią na dwie najbliższe podpory jego wału. Luźna oprawa (odkręcony cały zestaw śrub: łapy oprawy
  albo płyta słupka): trzyma ją ciężar i tarcie o łoże (μ = 0,2); większa siła — oprawa pełznie (v = F/C_D) albo się
  unosi, a z nią wał i koła. Skutki: pas — rozstaw osi maleje → napięcie EA·2Δa/L spada → moment graniczny maleje
  (luźny dolny wał pasa unosi się ok. 4 mm, napięcie 300 → ok. 40 N, pas się ślizga); łańcuch — skrócenie rozstawu
  o 4 mm → przeskakuje po zębach; zazębienie — rozsunięcie ponad 1,2·m → zęby wychodzą z przyporu.

## Języki (polski i angielski)

- Język z paska menu (`window.LabMenu.LANG`: Opcje → Język albo `?lang=en` / `?lang=pl`). Strona GameLaboratory jest po
  angielsku z tekstami polskimi w `data-pl` (treść), `data-tip-pl` (podpowiedź), `data-aria-pl` i `data-<tryb>-pl`
  (opisy trybów w oknie Opis); dane modeli i katalogu są po polsku.
- `js/labs/mechanics/lang.js`: `T(pl, en)` — tekst w kodzie w obu językach; `tr(tekst)` — tekst polski tłumaczony
  słownikiem `lang-en.js` (najpierw cały, potem fragmentami, najdłuższe pierwsze, na granicach słów; wynik w pamięci
  podręcznej); `LOC` — zapis liczb; `translateDom()` — statyczne teksty strony w bieżącym języku.
- `tr` działa przy wyświetlaniu: pomocnik `el()` (treść i podpowiedź), nazwa wybranego elementu, wyjścia suwaków,
  wiersze okna Wydajność (`perfRows`). Nowy tekst po polsku w nazwie, właściwości albo wierszu — wpis w `lang-en.js`
  (albo `T(pl, en)` w kodzie, gdy zdanie składa się z liczb i słów, jak „82 z 82”).
- Podpisy na modelach ControlKit (tabliczki, wyświetlacze) czytają `window.LabMenu.LANG` same.
- API (`MechanicsApi`) zwraca nazwy po polsku, niezależnie od języka strony.

## Zegar — regulator (tryby Maszyna i Fizyka)

- Na posadzce za końcem łoża (kamery „Zegar” i „Wychwyt zegara”). Mechanizm między płytami z mosiądzu: bęben ze
  sprężyną (96 zębów) → koło centralne 80 / zębnik 12 (1 obr/h, minuty) → koło trzecie 75 / zębnik 10 → koło
  wychwytowe 30 zębów / zębnik 10 (1 obr/min, sekundnik); przekładnia wskazań 12 : 1 (tarcza godzinowa). Wahadło
  sekundowe (okres 2 s, długość dobrana jako wahadło fizyczne), tarcza szkieletowa, okna w płycie nad paletami.
- Maszyna: kinematyka (wahadło sinusoidalnie, koło przeskakuje pół podziałki na uderzenie). Fizyka: `createEscapement`
  — dwa ciała (wahadło z kotwicą, koło z mechanizmem zredukowanym na jego oś), kontakt wierzchołków zębów z paletami
  (łuk spoczynkowy, pochylnia impulsowa), uderzenie niesprężyste, tarcie; napęd — moment sprężyny przez przekładnię
  (480 : 1, sprawność 0,82). Amplituda ustala się sama (ok. 2°); przy słabej sprężynie zegar staje. Nakręcanie —
  klik w kwadrat wałka bębna (ćwierć obrotu, zapadka).
- Pliki: modele `js/models/mech/clock/` (ClockKit; materiały i pomocniki — `js/models/mech/common.js`, `wheels.js`, `escapement.js`,
  `springs.js`, `ratchet.js`, `flywheel.js`, `dial.js`, `regulator.js`, `index.js`), fizyka wychwytu
  `js/behaviors/land/mech/escapement.js`, złożenie w laboratorium `js/labs/mechanics/clock.js`.
- Katalog przedmiotów podzielony na pliki: `js/labs/mechanics/items/` (`transmission.js`, `energy.js`,
  `timekeeping.js`, `mechanisms.js`, `signals.js`, `controls.js`, `power.js`, `fluid.js`, `optics.js`, `photonics.js`,
  pomocniki `util.js`, kolizje przegubu `cardan.js`); `items.js` — kategorie planu (`CATS`) i lista.
- API: `MechanicsApi.clock()`, `runClock(s)`, `windClock(obroty)`.

## Etap 3 — sygnały (tryby Przedmioty, Maszyna, Fizyka)

- Przedmioty: czujnik indukcyjny (zasięg z rozmiaru i materiału celu, histereza, impulsy z zębów obracanego koła —
  odległość czoła od prawdziwego zarysu), enkoder inkrementalny (A, B, Z, zliczanie ×4, kierunek), bariera optyczna
  (wiązka przerywana obracającą się chorągiewką — test promienia), przekaźnik czasowy (funkcje E, Wi, Bp, R; obsługa na
  modelu), regulator PID z obiektem (falownik z rampą + silnik z poślizgiem), regulator odśrodkowy Watta (wahadło stożkowe).
- Maszyna i Fizyka (`js/labs/mechanics/automation.js`): B1 nad kołem 1, B2 na tylnym końcu wału silnika, B3 przy tarczy
  hamulca; w Fizyce KT1 w obwodzie (+24 V falownika → KT1 15–18 → S3: RUN po 2 s od START) i U1 (PID: PV z B2, wyjście
  0–10 V na AI falownika; A/M — ręcznie śledzi R1, automatycznie trzyma zadaną mimo obciążenia hamulcem).
- Fizyka: `js/behaviors/land/mech/` — `signal.js` (szyna sygnałów z historią), `sensors.js` (czujniki, profil zarysu),
  `timer-relay.js`, `pid.js` (anti-windup, przejście bezuderzeniowe), `governor.js`. Modele: `js/models/mech/sensors/`,
  `relays/`, `regulators/`, wspólne pomocniki i materiały `js/models/mech/common.js`.
- API: `MechanicsApi.simulate(s)` (bieżący tryb bez rysowania), `pid('auto' | 'sv', v)`.

## Stanowisko zatrzasku (tryby Maszyna i Fizyka)

- `js/labs/mechanics/trigger.js`: płyta z wspornikiem, zatrzask z wyzwalaczem, dźwignia napinająca na osi ramienia,
  akumulator G1 (2 × 12 V AGM 7 Ah), szyna DIN z przekaźnikiem K2, żółty przycisk S4 (WYZWÓL).
- Obwód: G1 + → S4 13–14 → cewka K2 A1–A2; styk K2 11–14 → elektromagnes Y1 (20 W) — zwalnia zapadkę.
- Fizyka: rozładowanie G1 (`js/behaviors/land/mech/battery.js`), kotwica K2 z czasami (`relay.js`), ramię zatrzasku ze sprężyną,
  zaczepem, zapadką i zderzakiem (`latch.js`). Maszyna: 5-sekundowy cykl kinematyczny (napięcie → wyzwolenie).
- Obsługa na modelu: klik dźwigni — napnij, przytrzymanie S4 — wyzwól.
- Modele: `js/models/mech/mechanisms/` (dźwignia, zatrzask), `power/` (akumulator), `relays/signal.js`, sprężyna skrętna
  w `clock/springs.js`.

## Etap 4 — płyny (tryby Przedmioty, Maszyna, Fizyka)

- Przedmioty: kategoria „Przepływ i transport” (rury i węże, źródła płynu, pompy, zawory, rozdzielacze, siłowniki,
  zbiorniki, dysze, transport) oraz przetwornik ciśnienia z manometrem i licznik obrotów w „Czujnikach”.
- Stanowisko hydrauliczne (`js/labs/mechanics/hydraulic-station.js`): zasilacz (silnik M2 → latarnia → pompa zębata,
  zawór bezpieczeństwa 60 bar, manometr P1, przetwornik B4), rozdzielacz 4/3 (Y3a / Y3b), zawór dławiąco-zwrotny na B,
  siłownik Ø32/18 × 150 z popychaczem, magazyn kartonów, przenośnik M3 z licznikiem obrotów, pojemnik; powrót T — wąż
  przezroczysty z olejem. Fizyka: sieć węzłów z ciśnieniami (`hydraulics.js`, krok niejawny), oś (`hydraulic-axis.js`),
  kartony (`conveyor.js`). AUTO (S5): przełączanie od ciśnienia B4; ręcznie — przyciski awaryjne cewek.
- Fontanna (`js/labs/mechanics/fountain-station.js`): pompa odśrodkowa M4, zawór zwrotny, kulowy, dysza; przyłącze
  wodociągowe z reduktorem i wodomierzem, kran nad zbiornikiem (klik pokrętła), przelew Ø25 → wąż przezroczysty → wiadro,
  pływak. Fizyka: punkt pracy pompy (`fountain.js`), bilans poziomu (dopływ z kranu, przelew), wydatek sieci (`mains`).
- Wygląd cieczy: LiquidKit `js/render/fluid/liquid.js` — materiały z załamaniem i pochłanianiem, falująca powierzchnia,
  struga z ciągłości, rozpad na krople, rozbryzg i kręgi na wodzie.
- Modele: FluidKit `js/models/mech/fluid/`; obliczenia: `js/behaviors/land/mech/fluid.js`. API: `MechanicsApi.device(id, nazwa, akcja)`.

## Etap 5 — optyka (tryby Przedmioty, Maszyna, Fizyka)

- Przedmioty (grupa „Optyka”): soczewka, pryzmat, laser, źródło LED ze szczeliną, fotodioda z miernikiem (obok lustra);
  w „Czujnikach” — przepływomierz (rotametr).
- Stół optyczny (`js/labs/mechanics/optics-station.js`): laser 650 nm → soczewka f = 100 mm na szynie (przeciąganie) → lustro
  45° → fotodioda (moc, fotoprąd); białe LED ze szczeliną → pryzmat F2 ustawiony śledzeniem na najmniejsze odchylenie → ekran
  z widmem. S8 — laser, S9 — LED. Fontanna ma rotametr na pionie tłocznym.
- Fizyka promieni: `js/behaviors/land/mech/raytrace.js` (szkła — wzór Sellmeiera, załamanie Snella w wektorach, Fresnel, całkowite
  wewnętrzne odbicie, czułość krzemu), wiązki — `js/render/optics/beams.js`; modele OptiKit `js/models/mech/optics/`.

## Doktor — złożenie (czy modele nie wchodzą jeden w drugi)

- `python3 tools/doctor.py --scene labs/mechanics.html`: strona wystawia `window.LabScene` (`prepare`, `root`,
  `components` — osobne modele), doktor sprawdza „clash”: wierzchołki części jednego modelu głęboko (≥ 0,3 mm we
  wszystkich kierunkach) w zamkniętej bryle innego modelu. Pasowanie zgłoszone na części (`userData.doctorOk = 'clash'`,
  np. trzpień śruby w otworze gwintowanym) nie jest kolizją.
- Poprawione przy tym: faza wyciągnięć do środka (MechKit `extrude`, `common.slab` — obrys i otwory nominalne; zęby kół
  i wały w otworach już się nie przenikają), korbowód — oczka współosiowe ze sworzniami, łapy opraw UCP płaskie pod
  podkładki (M10), stopy obudowy przekładni i podstawa suwaka (śruby poza profilami i słupkiem), wał 4 kończy się
  przed słupkiem podpory wału 5, mostek zacisku hamulca na obudowach klocków, rowki łoża jako cienkie paski na wierzchu.
