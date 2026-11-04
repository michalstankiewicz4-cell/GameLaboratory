# Fizyka

Cała fizyka to własny silnik w JavaScripcie z aTrain — tu zachowanie „koło na szynie” (środowisko ląd):
`js/behaviors/rail/physics.js` (obliczenia bez zmian; liczby taboru w `js/models/train/data.js`) i `rail.js`
(podpięcie do modelu składu). Sieć torowa: `js/models/structures/railway/network.js`. Laboratorium: pojazdy,
zakładka Train. Liczona na CPU. Nic nie jest prowadzone po szynach „na sztywno” — pojazdy utrzymują się na torze wyłącznie dzięki kontaktowi kół z szynami.

## Całkowanie

- Ciała sztywne (masa, tensor bezwładności, kwaterniony), półjawny Euler.
- Krok **H = 1/2400 s**; w każdej klatce wykonuje się tyle kroków, ile wynika z czasu rzeczywistego.
- Siły kontaktowe metodą kary (sprężyna + tłumik), tarcie Coulomba rozwiązywane impulsowo (6 iteracji na krok).

## Pojazdy

| | Lokomotywa | Wagon |
|---|---|---|
| Długość pudła | 9,0 m | 9,4 m |
| Rozstaw osi | 4,6 m | 5,6 m |
| Promień koła | 0,50 m | 0,46 m |
| Masa domyślna | 18 t | 12 t |
| Napęd | obie osie | — |

- Każdy zestaw kołowy to osobne ciało (1200 kg) połączone z pudłem przez usprężynowanie pionowe, poprzeczne i wzdłużne z tłumieniem, z odbojami (ugięcie 80 mm, odbicie 100 mm).
- Rozstaw wewnętrzny kół 1360 mm, szerokość toru 1435 mm.

## Kontakt koło–szyna

- Profil koła opisany 37 próbkami (z obrzeżem); szyna jako funkcja odległości (SDF) na odcinkach prostych i łukowych.
- Kontakt liczony dla każdej próbki osobno: sztywność 5·10⁹ N/m na metr szerokości, tłumienie 1,5·10⁷.
- Współczynnik tarcia stal–stal μ = 0,33. Poślizg kół i przytarcie obrzeży powstają same z sił.
- Siatka przestrzenna (komórka 2 m) wybiera kandydujące odcinki szyn; zwykła szyna ma szybką ścieżkę obliczeń.
- **Luz obrzeży** zmienia położenie profilu koła względem szyny dla wszystkich kół naraz.

## Napęd i hamulec

- Silnik: stała siła do 4 m/s, powyżej stała moc (z obrotów kół). Regulator PI dąży do prędkości zadanej.
- Moment zanika między 100 a 115 km/h prędkości obwodowej koła (ogranicznik obrotów) — chroni przed rozbieganiem się kół po wykolejeniu.
- Hamulec: ciśnienie narasta ze stałą czasową 3 s, opada 4 s; maks. 3500 N·m na zestaw.
- Blokada kół: bardzo duży moment hamujący — koła stoją, skład sunie po szynach na tarciu.

## Zderzaki i zderzenia pudeł

- Zderzaki talerzowe na wszystkich czołach; para styka się z każdą parą z innego pojazdu (także z odczepionymi wagonami).
- Skok 2 × 105 mm, sztywność 7,5·10⁵ N/m, tłumienie 3·10⁴; po wyczerpaniu skoku twardy ogranicznik. Tarcie talerzy μ = 0,15.
- Gdy zderzaki się miną (najazd skośny, wykolejenie), działa kolizja prostopadłościanów pudeł.
- Narożniki pudeł opierają się o grunt (μ = 0,5) przy przewróceniu.

## Sprzęg kłowy (lokomotywa – wagon 1)

- Dwie głowice po 150 kg na przekładni ciągłowo-zderzakowej, luz sprzęgu 20 mm.
- Kieł (knuckle) ma własny stopień swobody obrotu: otwarty do 1,6 rad, z ryglem i tarciem.
- Przy najeździe czoło drugiej głowicy naciska na ogon kła i domyka go — sprzęgnięcie wynika z kontaktu, nie z warunku logicznego.
- Przycisk „rozprzęgnij” podnosi dźwignię (zwalnia rygiel); pod naciągiem rygiel trzyma tarcie.

## Łańcuch na haku (wagon 1 – wagon 2)

- 5 ogniw jako osobne ciała (3 kg), kontakt ogniwo–ogniwo i ogniwo–hak, 10 podkroków na krok.
- „Zdejmij z haka” / „Załóż” — siła „ręki” podnosi ostatnie ogniwo nad dziób haka lub je opuszcza.

## Teren

- Podkłady to fizyczne prostopadłościany — po wykolejeniu koła uderzają w nie.
- Podsypka jako pole wysokości, poza nią grunt z `sim.groundH` (w aTrain: mapa wysokości z górą, skarpą i dnem morza; w laboratorium pojazdów płaski, bo tego terenu nie przeniesiono): miękki grunt z oporem toczenia. Wykolejone koła i narożniki pudeł opierają się o rzeczywistą wysokość gruntu w danym miejscu.

## Bezpieczniki

- Jeśli pojawi się wartość nieskończona (NaN), symulacja zatrzymuje się i wyświetla komunikat; pętla rysowania działa dalej, więc przycisk Restart zawsze odpowiada.

## Tor z dowolnej ścieżki i tramwaj (od programu 0.24.0)

Obliczenia kontaktu, zawieszenia, napędu i hamulca są te same; dochodzą wejścia, z których korzysta gra (CityExplorer):

- **`js/behaviors/rail/path.js` — `pathTrack(punkty)`**: oś toru (np. z OpenStreetMap) przepróbkowana i wygładzona
  (także wysokości), zamieniona na łuki i proste — w każdym punkcie styczna wygładzonej osi, łuk trafia w kolejny punkt
  (bez narastającego „wężykowania” na zaszumionych danych). Szyny to łuki/proste równoległe w ±`RAIL_HALF`.
  Zwraca odcinki szyn dla fizyki (`base`), opis osi (`segs`, `station(s)`, `height(s)`, `L`) i trasy podkładów (`routes`).
- **`createSim({ track, consist, gaps, s0, hinges, power })`** (`physics.js`): bez opcji — owal i skład z aTrain jak dotąd
  (sprawdzone: ten sam wynik co przed zmianą). Z opcjami: pojazdy z `consist` ustawione od czoła na torze (pudło i
  zestawy kołowe na osi, wózek może być poza środkiem pudła — `bx`), **przeguby** (dwa punkty na wspólnej pionowej osi,
  sprężyna z tłumieniem; człony połączone przegubem nie zderzają się ze sobą), napęd na zestawach kołowych wszystkich
  pojazdów z `def.driven` (w składzie z aTrain: lokomotywa), `sim.onStep(sim)` — siły z warstwy świata (spadek toru,
  kozły oporowe) dodawane przed całkowaniem. Fizyka liczy w płaskim układzie toru (główka szyny y = 0); wysokość toru
  dodaje warstwa świata przy rysowaniu, a spadek — jako siłę ciężaru wzdłuż osi.
- **`js/behaviors/rail/tram.js`**: tramwaj z TramKit w tej fizyce — człony na wózkach stałych (PESA Swing 120Na: A, C, E)
  jako pojazdy z dwoma zestawami kołowymi na zawieszeniu I stopnia, człony podwieszone (B, D) na przegubach; liczby w
  `info.phys` modelu (`js/models/train/trams/swing.js`). `tramPoses` — pozy członów dla modelu (z przechyłem).
- **`js/models/structures/railway/path-track.js`**: szyny (przekrój z `profile.js`, ten sam co w kontakcie), opcjonalnie
  podkłady i podsypka, wzdłuż tego samego opisu toru.

Próba: łuk R = 25 m — tramwaj przejeżdża przy 15 km/h, przy 36 km/h wykoleja się (siłami, nie warunkiem); prosta z
szumem ±15 cm w punktach osi — 30 km/h bez zejścia z szyn. Koszt: ok. 0,2–0,3 s obliczeń na 1 s jazdy (krok 1/2400 s).
