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


## Przegląd lekarza sceny (2026-11-25)

Przegląd statyczny `js/scene/doctor.js` i dokumentacji `docs/scene/doctor.md`. Lekarz pracuje na danych sceny, działa bez Three.js i DOM, zgłasza problemy wraz z opcjonalnymi poleceniami naprawy; niczego sam nie zmienia. Reguły w kodzie odpowiadają opisowi w dokumentacji. Sprawdza m.in. zasoby, prefabrykaty, zachowania, środowisko, położenie, orbity, nakładanie obrysów i koszt.

- **Nie znalazłem potwierdzonego błędu w logice** podczas tego przeglądu statycznego.
- **Ograniczenie pomiaru jest jawne:** gdy część kitów nie zdąży się zbudować, obrysy i koszt tych modeli są pomijane, a wynik zawiera `not-built` oraz `skipped`. Warto przy odczytywaniu kosztu pamiętać, że w takim wyniku suma może być niepełna.
- **Nie uruchamiałem edytora ani lekarza** i nie sprawdzałem na żywo proponowanych poprawek Cofnij/Ponów.

Pliki: [doctor.js](https://github.com/michalstankiewicz4-cell/GameLaboratory/blob/main/js/scene/doctor.js), [dokumentacja lekarza sceny](https://github.com/michalstankiewicz4-cell/GameLaboratory/blob/main/docs/scene/doctor.md).

**ChatGPT — podsumowanie (2026-11-25):** lekarz sceny ma wyraźnie określoną rolę odrębną od doktora modeli i raportuje, kiedy nie mógł wykonać pomiaru. W przeglądzie statycznym nie wyszła usterka wymagająca zgłoszenia.
