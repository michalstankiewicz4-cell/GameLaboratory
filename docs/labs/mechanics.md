# Laboratorium mechaniki (`labs/mechanics.html`)

Z Tornado.io (przeniesione 2026-11-26), kategoria **Maszyny i mechanika**. Modele: [`../models/mech.md`](../models/mech.md).
Pliki laboratorium (`js/labs/mechanics/`): `mechanics.js` (scena, tryby, wybór, kamera, okna, API), maszyna i instalacja — model
`js/models/mech/assemblies/engine-layout/`, fizyka układu — `js/behaviors/land/mech/engine-layout.js`; `physics-mode.js` (tryb Fizyka: okno Opis, kontrole brył zderzeń, hitboxy),
`items-mode.js` (tryb Przedmioty: stół, ustawienia), katalog przedmiotów `items.js` (`items-drive.js`, `items-control.js`,
`items-common.js`). Scena: `js/labs/shared/sky-stage.js` (hala bez terenu: niebo, słońce, potok kamery). Okna i pasek po
angielsku; dane przedmiotów i maszyny (nazwy, właściwości, opisy w oknach Opis i Element) po polsku, jak dane modeli.
Suwaki Silnik, Hamulec, Obudowy i Hitboksy — w oknie **Machine** (w Tornado.io były na pasku).

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
