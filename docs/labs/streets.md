# Laboratorium ulic (`labs/streets.html`)

Z Tornado.io (przeniesione 2026-11-26). Próbki tras ze StreetKit ([`../models/streets.md`](../models/streets.md)) na
gruncie sceny bazowej laboratoriów (`js/labs/shared/stage.js`: niebo SkyKit z pogodą, słońce z cieniem), żeby było
widać, jak wyglądają ulice, chodniki i drogi. Ustawienia w przeglądarce (`gameLab.streets.v1`, wczytywane ostrożnie —
`js/labs/shared/saved.js`).

Pliki: `js/labs/streets/` — `streets.js` (okna, kamera, pętla, API), `scenes.js` (próbki i opisy), `build.js`
(składanie próbki: trasa, sygnalizatory, latarnie, znaki, słupki, barierki, ekrany, kładka, przejście, parkingi),
`ground.js` (grunt z otworami nad rampami i klatkami, wzgórze z przekopem do próbki tunelu), `en.js` (angielskie nazwy).

## Próbki

Prosta ulica, łuk, skrzyżowanie (4 wloty, sygnalizatory na wlotach), skrzyżowanie T, aleja, droga wiejska, ścieżka,
słupki, barierki i ekrany, miejsca parkingowe, tunel przez górę (łukowy i z podporami), kładka ze schodami, ze schodami naprzemiennymi i ze schodami i windą, przejście podziemne, tunel pod równym terenem, wiadukt prosty (nad ulicą), wiadukt na łuku (estakada), łącznica (zjazd po pętli), sygnalizator (na słupie i na
wysięgniku), latarnie i znaki (wszystkie rodzaje), droga dla rowerów. Okno Traffic lights (Sygnalizacja):
cykl albo stały stan. Okno Street furniture (Wyposażenie): latarnie wzdłuż ulic (rodzaj, co ile, kiedy świecą — po zmroku, zawsze, nigdy),
znaki na skrzyżowaniach (D-6 przy przejściach, A-7 na bocznym wlocie skrzyżowania T). Okno
Section (Przekrój): pasy, szerokość pasa, nawierzchnia jezdni, oznakowanie, szerokość i nawierzchnia chodnika, wysokość
krawężnika, promień łuku na skrzyżowaniu. Kamery: Orbit, Pedestrian, From above, Driver. W oknie Światło i pogoda — pogoda (także zmienna), wysokość i kierunek
słońca; po zmroku (słońce poniżej 4°) latarnie świecą.

Dla AI: `StreetsApi.scene(id)`, `set({ profile, lanes, laneW, road, marks, walkW, curbH, walk, corner })`, `camera(name)`,
`signal(tryb)` (`cycle` albo stan) → stany sygnalizatorów, `view([x, y, z], odległość, obrót, pochylenie)`; `scenes`,
`profiles`, `surfaces`. `set` przyjmuje tylko znane pola o poprawnych wartościach, odrzucone zwraca w `rejected`.
