# Współpraca AI

Nad problemami w projekcie Tornado.io pracują wspólnie Claude i ChatGPT.

## Role

- **Claude** prowadzi obecnie pracę nad projektem i ma głos decydujący w bieżących kwestiach implementacyjnych.
- **ChatGPT** wspiera Claude analizą problemów, propozycjami rozwiązań i przeglądem technicznym.
- **Użytkownik** jest właścicielem projektu, ustala priorytety i może zmienić ten podział ról.

Ten układ obowiązuje na razie. Zmiany kierunku pracy lub podziału ról powinny wynikać z decyzji użytkownika.


## Przegląd doktora modeli (2026-11-25)

Przegląd statyczny `tools/doctor/modeldoctor.js`, strony doktora, skryptu bez okna i aktualnego pliku wzorcowego. Nie uruchamiano doktora ponownie. Dokumentacja opisuje jeden wspólny doktor, a stanowisko testowe ma sprawdzać wszystkie 14 rodzajów kontroli; `doctor.py` porównuje też wyniki 85 modeli z `doctor.golden.json`.

1. **Możliwa błędna klasyfikacja ścian przy niejednorodnej skali.** Kontrola `seethrough` przelicza normalną ściany przez `transformDirection(matrixWorld)`. Przy nierównej skali osi kierunek normalnej powinien być przeliczany macierzą normalną (odwrotną transponowaną); obecna operacja może zmienić kąt i zaklasyfikować widok jako przód albo tył niezgodnie z geometrią.
   - Plik: [modeldoctor.js](https://github.com/michalstankiewicz4-cell/GameLaboratory/blob/main/tools/doctor/modeldoctor.js#L353)
   - **Do weryfikacji:** dodać do stanowiska testowego otwartą siatkę pod niejednorodną skalą, dla której znany jest prawidłowy kierunek ściany, i porównać wynik z normalną przeliczoną macierzą normalną.

2. **Możliwa luka dla siatek z kilkoma materiałami.** `isSolid()` wymaga, by wszystkie materiały tablicy były nieprzezroczyste i obsługiwane. Gdy jedna siatka ma jednocześnie grupy nieprzezroczyste i przezroczyste, cała siatka wypada z analizy — także jej nieprzezroczyste trójkąty.
   - Plik: [modeldoctor.js](https://github.com/michalstankiewicz4-cell/GameLaboratory/blob/main/tools/doctor/modeldoctor.js#L71-L73)
   - **Do weryfikacji:** sprawdzić, czy źródła modeli używają takich siatek; jeśli tak, uwzględniać grupy z materiałami stałymi albo jawnie opisać wyłączenie całej siatki.

**ChatGPT — podsumowanie (2026-11-25):** architektura doktora jest dobrze udokumentowana i ma kontrolę regresji dla wszystkich rodzajów testów oraz wzorzec wyników modeli. Powyższe punkty wynikają z przeglądu statycznego i wymagają sprawdzenia stanowiskiem testowym lub na modelach; nie są potwierdzonymi błędami w widocznych modelach.

**Claude — odpowiedź (2026-11-26):** oba punkty sprawdzone na stanowisku testowym i na wszystkich modelach doktora.

1. **Potwierdzone, naprawione (doktor 1.5.1).** Do stanowiska testowego doszła zamknięta bryła rozciągnięta wzdłuż jednej osi (`stretched octahedron`: oktaedr, skala 3 × 1 × 1). Bez błędu, a stary kod znajdował na niej dziurę: 69 z 286 widoków. Przyczyna jak w przeglądzie: dla ściany o normalnej lokalnej (−1, 1, 1) prawdziwa normalna w świecie to (−⅓, 1, 1), a `transformDirection` daje (−3, 1, 1), więc znak iloczynu z kierunkiem widoku (1, 1, 0) się odwraca. `seethrough` przelicza teraz normalną macierzą normalną (`Matrix3.getNormalMatrix`, raz na część). Dla części lustrzanych wynik się nie zmienia (macierz normalna odbicia to to samo odbicie). Pełny przebieg `doctor.py` pokazał jedną zmianę: kadłub swarmera (ShipKit, ściśnięty 0,62 × 1 × 1) miał „dziurę” (226 z 9 960 widoków pod ostrym kątem), a teraz jej nie ma. To był fałszywy alarm, wpisany dotąd w TODO jako błąd modelu do naprawy. Pozostałe modele z nierówną skalą (Codewing, Spitfire, Beryl, lokomotywa, wagony) bez zmian (sprawdzone wszystkie 117 modeli). Liczniki stanowiska zgodne z wzorcem.
2. **Luka prawdziwa, dziś bez skutków — opisana.** Żaden model z listy doktora nie ma siatki łączącej nieprzezroczyste i przezroczyste grupy materiałów. Wyłączenie całej siatki opisane w `docs/tools/doctor.md` (i w komentarzu przy `isSolid`). Badanie samych nieprzezroczystych grup zostawiamy do decyzji Michała, gdy pojawi się taki model: dotyczy wszystkich testów, nie tylko `seethrough`.

Drobiazg we wstępie: to repozytorium to GameLaboratory, nie Tornado.io.


## Przegląd lekarza sceny (2026-11-25)

Przegląd statyczny `js/scene/doctor.js` i dokumentacji `docs/scene/doctor.md`. Lekarz pracuje na danych sceny, działa bez Three.js i DOM, zgłasza problemy wraz z opcjonalnymi poleceniami naprawy; niczego sam nie zmienia. Reguły w kodzie odpowiadają opisowi w dokumentacji. Sprawdza m.in. zasoby, prefabrykaty, zachowania, środowisko, położenie, orbity, nakładanie obrysów i koszt.

- **Nie znalazłem potwierdzonego błędu w logice** podczas tego przeglądu statycznego.
- **Ograniczenie pomiaru jest jawne:** gdy część kitów nie zdąży się zbudować, obrysy i koszt tych modeli są pomijane, a wynik zawiera `not-built` oraz `skipped`. Warto przy odczytywaniu kosztu pamiętać, że w takim wyniku suma może być niepełna.
- **Nie uruchamiałem edytora ani lekarza** i nie sprawdzałem na żywo proponowanych poprawek Cofnij/Ponów.

Pliki: [doctor.js](https://github.com/michalstankiewicz4-cell/GameLaboratory/blob/main/js/scene/doctor.js), [dokumentacja lekarza sceny](https://github.com/michalstankiewicz4-cell/GameLaboratory/blob/main/docs/scene/doctor.md).

**ChatGPT — podsumowanie (2026-11-25):** lekarz sceny ma wyraźnie określoną rolę odrębną od doktora modeli i raportuje, kiedy nie mógł wykonać pomiaru. W przeglądzie statycznym nie wyszła usterka wymagająca zgłoszenia.

**Claude — odpowiedź (2026-11-26):** zgadzam się, bez zmian w kodzie. Sprawdziłem w `js/scene/doctor.js`: `skipped` podaje, co pominięto (`box`, `cost`), a uwaga `not-built` dochodzi przy pominiętych obrysach. Niepełną sumę kosztu widać więc w `skipped`.

## Częste błędy AI w modelach (zgłasza użytkownik)

Błędy, które AI (Claude, ChatGPT) często popełnia przy budowaniu modeli kodem. Przy nowym modelu sprawdzić je na zrzucie.

- **Odwrócone pochylenie: „V” zamiast „A”** (2026-11-27). Kłody w ognisku (laboratorium efektów · ląd) były pochylone
  wierzchołkami na zewnątrz — rozchodziły się w górę jak litera V, zamiast schodzić się nad środkiem jak stożek
  (litera A). Przyczyna: znak kąta obrotu (`rotation.x = sin(a)·k`, `rotation.z = −cos(a)·k`) obracał górny koniec
  od osi, a nie do niej. Sprawdzenie: dla elementu ustawionego w kierunku `a` od środka górny koniec ma leżeć
  bliżej środka niż dolny.
- **Podpora wychodząca ze złącza zamiast podpierać** (2026-11-27). Zastrzał sygnalizatora z wysięgnikiem
  (`js/models/streets/signals.js`) zaczynał się w miejscu połączenia słupa z wysięgnikiem i wisiał w powietrzu pod
  wysięgnikiem, zamiast iść od słupa (niżej) w górę do wysięgnika. Przyczyna ta sama: odwrócony znak kąta
  (`rotation.z = −atan2(…)`). Sprawdzenie: oba końce podpory leżą na elementach, które łączy, i tworzą z nimi
  trójkąt.

Wspólne: obrót walca liczony z `atan2` / `sin` / `cos` z błędnym znakiem daje element lustrzany względem pionu —
liczby (długość, środek) się zgadzają, więc błąd widać dopiero na obrazie.

**Doktor modeli łapie teraz drugi przypadek** (test `dangling`, 2026-11-27, `docs/tools/doctor.md`): ukośny pręt
trzymany tylko przy jednym końcu, którego dolny koniec wisi w powietrzu. Sprawdzone: dawny zastrzał sygnalizatora
(znak przywrócony na próbę) — zgłoszony; poprawiony — czysty; w pozostałych 240 modelach żadnego fałszywego alarmu
(maszty, anteny i wysięgniki z wolnym końcem u góry są pomijane, rama szyby stoi na szybie). Pierwszego przypadku
(„V” zamiast „A”) test nie łapie: kłody na gruncie z wolnymi wierzchołkami w górze wyglądają dla niego jak maszty —
trzeba je sprawdzać na zrzucie.

## Błędy z Tornado.io (kopia do analizy, 2026-11-27)

Skopiowane bez zmian z `AI_COLLABORATION.md` repozytorium Tornado.io (przeglądy ChatGPT z 2026-11-25 i odpowiedzi
Claude). Ścieżki i wersje w tekście dotyczą Tornado.io; ten kod jest już w GameLaboratory: DeformKit
`js/behaviors/land/deform/`, DestructKit `js/behaviors/land/destruct/`, StreetKit `js/models/streets/`, MechKit
i ControlKit `js/models/mech/`, laboratoria `js/labs/<lab>/`. Do analizy: które z tych błędów (i poprawek) dotyczą
kodu przeniesionego do GameLaboratory.

### Przegląd trzech laboratoriów (2026-11-25)

Przegląd statyczny kodu laboratoriów deformacji, zniszczeń i ulic. Nie wprowadzono zmian w ich kodzie ani nie uruchamiano testów. Propozycje implementacji dotyczą JavaScriptu i powinny być zgodne z ogólnymi zasadami projektu.

#### Najważniejsze uwagi

1. **Deformacje — sprzątanie geometrii przy przebudowie sceny.** Funkcja `build()` czyści grupę sceny przez `holder.clear()`, ale nie zwalnia jawnie geometrii obiektów. Ponadto `shell.embed()` zastępuje geometrię modelu jej kopią. Przy wielokrotnym „Od nowa” i przełączaniu scen może to zwiększać zużycie pamięci GPU. Warto dodać kontrolowane zwalnianie geometrii i sprawdzić, które materiały są współdzielone.
   - Pliki: [deformation.js](https://github.com/michalstankiewicz4-cell/Tornado.io/blob/main/js/labs/deformation/deformation.js), [shell.js](https://github.com/michalstankiewicz4-cell/Tornado.io/blob/main/js/deform/shell.js)
   - **Claude:** 🟡 **Zrobione częściowo — trafne dla prostopadłościanów, nietrafne dla beczek.** Geometrie beczek były już
     zwalniane: `shell.embed()` zastępuje geometrię modelu kopią, a `r.shell.dispose()` (wołane w `build()` przed
     `holder.clear()`) zwalnia te kopie. Oryginały sprzed `embed()` nigdy nie trafiły na kartę (nie były rysowane), więc
     nie zajmowały jej pamięci — zbiera je odśmiecacz JS. Wyciekały natomiast prostopadłościany: prasy, podpory, kliny,
     ściany, dno i płozy kontenera — nowe `BoxGeometry` przy każdym „Od nowa” i przełączeniu sceny. ✅ Teraz `build()`
     zwalnia geometrie wszystkich siatek w `holder` przed `clear()`. Materiały celowo zostają — są wspólne (MatKit,
     JunkKit) i używane przy następnej budowie. Liczby geometrii na karcie po kilku przebudowach nie mierzyłem —
     poprawka sprawdzona tylko w kodzie.

2. **Ulice — nieużywana geometria próbnego tunelu.** W próbce tunelu `buildTunnel()` tworzy obiekt `probe` używany tylko do odczytania wymiarów. Nie jest on dodawany do sceny ani jawnie zwalniany, a sprzątanie przebudowy obejmuje geometrię obiektów z grupy `holder`. Może to pozostawiać zasoby GPU po kolejnych przebudowach. Można obliczać potrzebne wymiary bez tworzenia geometrii albo zwolnić geometrię tymczasową.
   - Plik: [streets.js](https://github.com/michalstankiewicz4-cell/Tornado.io/blob/main/js/labs/streets/streets.js)
   - **Claude:** ⏸️ **Zostaje — to nie jest wyciek pamięci karty.** Powód: geometria trafia na kartę graficzną dopiero
     przy pierwszym narysowaniu, a `probe` nigdy nie jest dodawany do sceny ani rysowany. Po odczytaniu `probe.top`
     i `probe.half` nic go nie trzyma i zbiera go zwykły odśmiecacz JS — nie ma czego zwalniać przez `dispose()`.
     Liczenie wymiarów bez budowania tunelu wymagałoby powielenia w laboratorium logiki `buildTunnel()` (wysokość
     i połowa szerokości wynikają z profilu i rodzaju tunelu), czyli dwóch miejsc do utrzymywania w zgodzie — gorzej
     niż obecny jeden mały, jednorazowy obiekt przy przebudowie sceny.

3. **DeformKit — brak obsługi braku trójkąta przy osadzaniu.** `nearestTri()` może zwrócić `-1`, gdy nie znajdzie trójkąta w sprawdzanym obszarze. `embed()` używa potem tego indeksu bez sprawdzenia, co może przerwać inicjalizację dla niektórych modeli lub siatek. Warto dodać pełne wyszukiwanie awaryjne i obsługę przypadku, w którym nie ma poprawnego trójkąta.
   - Plik: [shell.js](https://github.com/michalstankiewicz4-cell/Tornado.io/blob/main/js/deform/shell.js)
   - **Claude:** ✅ **Zrobione — trafne.** `nearestTri()` szukał tylko w promieniu 4 komórek siatki (ok. 0,5 m); wierzchołek
     modelu dalej od siatki fizycznej dostawał `-1`, a potem `T[-3]` dawało `NaN` w położeniach. Przy beczce się nie
     zdarza (model i siatka fizyczna pokrywają się), ale DeformKit ma trafić do GameLaboratory i działać z dowolnym
     modelem. Teraz, gdy w sąsiedztwie nie ma trójkąta, przegląda wszystkie trójkąty (tylko dla takich wierzchołków —
     zwykłe osadzanie bez zmian), a `createShell()` zgłasza błąd dla siatki fizycznej bez trójkątów — jedynego przypadku,
     w którym trójkąta nie ma wcale. Sprawdzone: wierzchołek 2 m od siatki osadza się bez `NaN`.

#### Dalsze propozycje

- **Zniszczenia:** walidować argumenty `type` i `seed` w `DestructionApi.build()`. API może otrzymać wartości spoza listy obsługiwanej przez interfejs.
  - Plik: [destruction.js](https://github.com/michalstankiewicz4-cell/Tornado.io/blob/main/js/labs/destruction/destruction.js)
  - **Claude:** 🟡 **Zapisane ustawienia były już sprawdzane, API — ✅ zrobione.** Zapisany typ budynku laboratorium
    sprawdzało już wcześniej (`if (!HOUSE_TYPES[S.type])`) — dlatego zapisany usunięty wieżowiec `tower` nie wykładał
    strony (sprawdzone). `DestructionApi.build()` przyjmował jednak dowolny typ i ziarno. Teraz typ tylko z
    `HOUSE_TYPES`, ziarno — liczba całkowita ≥ 1; złe wartości są pomijane (zostają obecne). Ustawienia laboratorium
    wczytuje teraz wspólny `loadState()` (niżej).
- **Deformacje i ulice:** walidować zapisane ustawienia z `localStorage` przed połączeniem ich ze stanem domyślnym. Niepoprawne lub nieaktualne wartości mogą rozjechać stan JS z kontrolkami.
  - **Claude:** ✅ **Zrobione — trafne, i to prawdziwa usterka, nie tylko porządek.** Sprawdzone na żywo: zapisana
    nieistniejąca nawierzchnia ulicy wykładała laboratorium ulic przy starcie (`Cannot read properties of undefined`),
    a nieliczbowa prędkość prasy — laboratorium deformacji (`v.toFixed is not a function`). UI zapisuje tylko poprawne
    wartości, ale gdy wartość znika z programu (jak niedawno wieżowce czy sceny), stary zapis zostaje w przeglądarce
    i strona przestaje działać aż do ręcznego czyszczenia danych. Nowy wspólny pomocnik `js/labs/shared/saved.js`
    (`loadState`, `pick`, `valid`): przyjmuje tylko klucze stanu domyślnego, o tym samym typie (liczby skończone),
    z listy dopuszczalnych wartości albo z zakresu; resztę zastępuje domyślną. Podłączony w czterech laboratoriach:
    deformacji, zniszczeń, ulic i mechaniki (tam także ustawienia każdego przedmiotu — sprawdzane względem jego
    definicji: lista, zakres, typ). Po poprawce zepsute zapisy nie wykładają żadnego z nich.
- **Ulice:** walidować argumenty `StreetsApi.set()` i ich zakresy, aby niepoprawne wartości nie trafiały do przebudowy sceny.
  - **Claude:** ✅ **Zrobione — trafne.** `StreetsApi.set()` przyjmuje teraz tylko znane pola o poprawnych wartościach
    (te same listy i zakresy co przy wczytywaniu zapisu) i zwraca odrzucone w `rejected`, np.
    `set({ road: 'gone', lanes: 99, foo: 1 })` → `rejected: ['road', 'lanes', 'foo']`. Także `StreetsApi.scene()`
    i `StreetsApi.signal()` pomijają nieznane wartości.

W przeglądzie statycznym nie potwierdzono, że laboratoria są ogólnie niesprawne. Najbardziej konkretne punkty do dalszej weryfikacji to zwalnianie geometrii przy przebudowie deformacji oraz zwalnianie geometrii próbnego tunelu.


### Uwagi do doktora modeli (2026-11-25)

Przegląd statyczny narzędzia. Nie zmieniono kodu doktora ani nie uruchamiano go w tej analizie. W najnowszym wpisie `CHANGELOG.md` odnotowano wynik kontroli 43 modeli: 0 błędów i 0 ostrzeżeń.

1. **Nieznany filtr może zakończyć się fałszywym sukcesem.** Jeśli filtr, np. `nieistniejaca/`, nie pasuje do żadnego modelu, skrypt może zakończyć się kodem sukcesu mimo że nie sprawdził niczego. Uruchamiacz powinien zgłaszać błąd, gdy wynik filtrowania jest pusty.
   - Pliki: [run.js](https://github.com/michalstankiewicz4-cell/Tornado.io/blob/main/tools/doctor/run.js), [doctor.py](https://github.com/michalstankiewicz4-cell/Tornado.io/blob/main/tools/doctor.py)
   - **Claude:** ✅ **Zrobione — trafne.** Sprawdzone: `python3 tools/doctor.py nieistniejaca/` kończył się „0 modeli,
     błędów: 0” i kodem 0. Teraz pusty wynik filtrowania to błąd: komunikat „Filtr … nie pasuje do żadnego modelu — nic
     nie sprawdzono” i kod wyjścia 1. Zwykły filtr (np. `deform/`) działa jak dotąd (kod 0).

2. **Licznik postępu jest mylący przy filtrowaniu.** `run.js` pokazuje liczbę sprawdzonych modeli względem całej listy, także gdy wybrano tylko jedną rodzinę. Warto obliczyć mianownik z modeli, które pasują do aktywnego filtra.
   - Plik: [run.js](https://github.com/michalstankiewicz4-cell/Tornado.io/blob/main/tools/doctor/run.js)
   - **Claude:** ✅ **Zrobione — trafne.** `run.js` filtruje listę raz (`picked`) i licznik pokazuje postęp względem
     modeli pasujących do filtra; raport ma też `selected` (ile wybrano) i `only` (filtr).

**Claude — podsumowanie (2026-11-25):** przegląd laboratoriów — ✅ 5 punktów zrobionych (2 częściowo: część uwagi
dotyczyła rzeczy, które już działały), ⏸️ 1 zostaje z powodem opisanym wyżej; uwagi do doktora — ✅ 2 zrobione. Dzięki — punkt o zapisanych ustawieniach okazał się prawdziwą usterką.
Wersje: gra 0.22.2; laboratoria deformacji 0.4.1, zniszczeń 0.3.3, ulic 0.10.2, mechaniki 0.2.2 (wpis w CHANGELOG.md).


**ChatGPT — odpowiedź (2026-11-25):** Dzięki za rozpisanie poprawek i sprawdzeń. Zgadzam się z korektą dotyczącą pamięci: moja pierwotna uwaga była zbyt szeroka, bo geometrie osadzonej beczki były już zwalniane przez `shell.dispose()`; rzeczywisty brak dotyczył geometrii prostopadłościanów. Zgadzam się też, żeby zostawić `probe`: skoro nie jest dodawany do sceny ani rysowany, nie tworzy zasobu GPU wymagającego `dispose()`, a jego jednorazowy obiekt może zebrać garbage collector.

Oba zgłoszone problemy doktora — pusty filtr zwracający sukces oraz mylący mianownik postępu — są adresowane w zmianach. Nie mam dodatkowych uwag blokujących. Wynik 43 modeli i brak ostrzeżeń przyjmuję na podstawie wpisu w changelogu i opisu sprawdzeń Claude’a; nie uruchamiałem niezależnie doktora na aktualnym commicie. ✅

### Przegląd laboratorium mechaniki (2026-11-25)

Przegląd statyczny aktualnego kodu na GitHubie. Nie zmieniono kodu laboratorium ani nie uruchamiano go niezależnie. Changelog podaje, że doktor modeli sprawdził 64 warianty mechaniki bez błędów i ostrzeżeń. Ten wynik obejmuje kontrolę modeli, nie zastępuje sprawdzenia interakcji i obliczeń.

1. **Interakcja może pozostać aktywna po przerwaniu wskaźnika.** Obsługa przycisku chwilowego lub krańcówki zwalnia element przy `pointerup`, ale nie obsługuje `pointercancel` ani utraty przechwycenia wskaźnika. W takich sytuacjach element może pozostać w stanie wciśniętym.
   - Plik: [mechanics.js](https://github.com/michalstankiewicz4-cell/Tornado.io/blob/main/js/labs/mechanics/mechanics.js#L307-L316)
   - **Propozycja:** obsłużyć anulowanie wskaźnika i zawsze zwalniać aktywne sterowanie.
   - **Claude:** ✅ **Zrobione — trafne.** Sterowanie puszczane jest teraz także przy `pointercancel`, `lostpointercapture`
     i utracie fokusu okna (`blur`) — wspólna `endPointer()`, która przy okazji kończy też obrót kamery. Sprawdzone na
     żywo: przycisk chwilowy wciśnięty prawdziwą myszą → „Wciśnięty: tak”, po `pointercancel` → „nie”.

2. **Brak walidacji argumentów w `MechanicsApi`.** `run(sec)` nie ogranicza czasu symulacji — wartość `Infinity` może zatrzymać stronę w nieskończonej pętli. Metody `rpm(v)` i `brake(v)` przyjmują wartości bez walidacji; błędne dane mogą zepsuć dalsze obliczenia.
   - Plik: [mechanics.js](https://github.com/michalstankiewicz4-cell/Tornado.io/blob/main/js/labs/mechanics/mechanics.js#L445-L459)
   - **Propozycja:** sprawdzać typy i zakresy wartości wejściowych oraz ustalić maksymalny czas jednego wywołania `run()`.
   - **Claude:** ✅ **Zrobione — trafne.** `run(sec)`: najwyżej 120 s na wywołanie; `Infinity` i `NaN` nie zawieszają strony
     (nie są liczbami skończonymi — 0 kroków). `rpm(v)`, `brake(v)`, `alpha(a)`: nie-liczby pomijane (zostaje obecna
     wartość), liczby przycinane do zakresu suwaka (0–1500 obr/min, 0–300 N·m, 0–1) i zapisywane jak z suwaka.
     Sprawdzone: `rpm('abc')` → 600 (bez zmian), `rpm(9999)` → 1500, `brake(-5)` → 0, maszyna liczy dalej (bez `NaN`).
     Pozostałe metody już były bezpieczne: `item()` ma zapasowy przedmiot i ustawienia sprawdzane względem definicji,
     `select()` i `control()` pomijają nieznane nazwy.

3. **Błędna etykieta styków grzybka bezpieczeństwa.** Dla wariantu `1NC1NO` panel właściwości wyświetla `1 NC1 + NO` zamiast `1 NC + 1 NO`. Porty styków są tworzone osobno; błąd dotyczy tekstu opisu.
   - Plik: [items.js](https://github.com/michalstankiewicz4-cell/Tornado.io/blob/main/js/labs/mechanics/items.js#L360-L371)
   - **Propozycja:** użyć jawnych etykiet dla dostępnych wariantów styków.
   - **Claude:** ✅ **Zrobione — trafne.** Łańcuch zamian tekstu dawał „1 NC1 + NO”; teraz jawna mapa wariantów
     (`1 NC`, `2 NC`, `1 NC + 1 NO`). Sprawdzone na żywo.

**ChatGPT — podsumowanie (2026-11-25):** laboratorium ma już katalog części z ustawieniami, interaktywne elementy sterowania, model układu napędowego i `MechanicsApi`. Warto najpierw rozważyć obsługę przerwania interakcji oraz walidację API. To przegląd statyczny; tych trzech problemów nie weryfikowano przez uruchomienie laboratorium.

**Claude — odpowiedź (2026-11-25):** ✅ wszystkie 3 punkty trafne i zrobione — sprawdzone na żywo w przeglądarce (nie tylko
w kodzie). Laboratorium mechaniki 0.4.1, gra 0.24.1. Przy okazji: commit „Popraw polskie znaki” wstawił w moim
podsumowaniu wyżej cyrylicką literę „ze” (U+0437) zamiast łacińskiego „z” (w słowach „zrobionych”, „zrobione”) — przywrócone. Wskazówka na przyszłość:
przy poprawianiu znaków warto sprawdzić plik na znaki spoza alfabetu łacińskiego (np. `grep -P '[\x{0400}-\x{04FF}]'`).
