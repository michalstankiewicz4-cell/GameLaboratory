# Laboratorium dźwięku · efekty i otoczenie (`labs/sound-effects.html`)

Efekty dźwiękowe i dźwięk miejsc tworzone na żywo z kodu, bez plików. Kit: **SfxKit** (`js/audio/sfx/sfxkit.js`);
strona: `js/labs/sound-effects/sound-effects.js`, arkusz `ui/pages/audio.css` (wspólny dla grupy dźwięku). Gra przez
mikser silnika (`js/audio/mixer.js`, [`../audio/README.md`](../audio/README.md)): efekty na szynie efektów, dźwięki
ciągłe i tła na szynie otoczenia. Grupa dźwięku: muzyka ([`sound.md`](sound.md)) · efekty · mowa
([`sound-speech.md`](sound-speech.md)).

## Dźwięki

| Rodzaj | Parametry | Skąd |
|---|---|---|
| wybuch | wielkość, odległość, odłamki | nowy: trzask, kula ognia (szum brązowy), uderzenie w powietrzu, grzmot po wybuchu, opadające odłamki |
| strzał / działo | kaliber, odległość, echo | Battle (dźwięki gry: `gun`) + trzask i pogłos |
| grzmot | odległość | RainKit / aTrain (szum brązowy z falującą obwiednią), blisko — trzask |
| plusk | wielkość | Battle (`splash`) + krople |
| uderzenie | materiał (metal, drewno, ciężki, łańcuch), siła | aTrain: stuk sprzęgu, podkładu, zderzaka, łańcucha — składowe nieharmoniczne, siła zmienia barwę |
| trafienie | pancerz, siła | Battle (`hit`) + dzwonienie pancerza |
| ptak | gatunek (wróbel, bogatka, kos, mewa, wrona, sowa), wysokość | nowy |
| interfejs | rodzaj (klik, dzwonek, naprawa, alarm, pik, tyk, przekaźnik, otwarcie, zamknięcie, klawisz, potwierdzenie, odmowa), ton, poziom | Battle (`click`, `bell`, `repair`) + nowe; dźwięki skórek UI gry ([gameui.md](gameui.md)) |
| drzwi / właz | rodzaj (samochód, właz, autobus — pneumatyka, drewniane), otwarcie / zamknięcie, siła | nowy: zamek, zawias, uderzenie skrzydła o ramę; dźwięki modeli |
| agregat hydrauliczny ∿ | obciążenie | nowy: silnik, pompa łopatkowa, szum oleju; maszyny, przeładowarka |
| turbina ∿ | obroty, obciążenie, wielkość (gazowa … parowa) | nowy: gwizd łopatek, przepływ, huk; Błyskawica, Abrams |
| koła na szynach ∿ | prędkość, długość szyny, rozstaw wózka, stuki | aTrain: toczenie i stuk-stuk na stykach |
| zgniatanie | materiał (puszka, złom, papier), siła | nowy: trzaski blachy, jęk, dobicie; zgniatarki |
| hydraulika / serwo | czas, ton, blokada na końcu | nowy: pompa, olej w przewodach, blokada (aTrain: zderzak); podwozie, klapy |
| wiatr ∿ | siła, porywy | nowy |
| deszcz ∿ | natężenie | szum + krople (jak warstwa deszczu MusicKit) |
| fale morza ∿ | siła, okres fali | nowy |
| strumień ∿ | przepływ | nowy: szum przez rezonatory przeskakujące po częstotliwościach |
| ogień ∿ | wielkość | nowy: huk i trzaski |
| świerszcze ∿ | gęstość | nowy |
| ruch w mieście ∿ | natężenie | nowy: szum, przejeżdżające auta (stereo), czasem klakson |
| silnik ∿ | obroty, obciążenie, cylindry | nowy: zapłony (obroty / 60 × cylindry / 2) przez przester i filtr |
| koło na szynie (pisk) ∿ | siła | aTrain (pisk obrzeża koła) |
| buczenie prądu ∿ | sieć 50 / 60 Hz, poziom | nowy |

∿ — dźwięk ciągły (Start / Stop, parametry na żywo); pozostałe — jednorazowe (Play, spacja; „Repeat every 2 s”).

Kategoria **Mechanizmy** (drzwi, hydraulika) — dźwięki, które modele zgłaszają zdarzeniami (`onSound`,
[`../audio/README.md`](../audio/README.md)). Każdy dźwięk ma w kicie odległość pełnej głośności (`REF`: wybuch 40 m,
strzał 25 m, drzwi 8 m…) — w scenie cichnie z odległością od kamery.

## Tła miejsc

Warstwy grające razem: dźwięki ciągłe i jednorazowe co kilka sekund (od–do), w losowym miejscu w stereo. Gotowe:
las za dnia (wiatr, kos, bogatka, strumień), park w mieście (ruch, wróble, wrony, wiatr), brzeg morza (fale, wiatr,
mewy), burza (deszcz, porywisty wiatr, grzmoty), letnia noc (świerszcze, wiatr, sowa), ognisko (ogień, świerszcze,
wiatr). Poziomy warstw, usuwanie, „+ Add the chosen sound”; zapis — zasób **ambience**.

## Okna

**Dźwięk** (lista w kategoriach, parametry, głośność, zapis — zasób **sound**), **Tło miejsca**, **W przestrzeni**
(źródło przeciągane wokół słuchacza — dźwięk przestrzenny miksera, jak obiekty w scenie), **Mikser** (głośności gracza
i poziomy szyn), **Opis (JSON)**. W środku spektrogram i fala z wyjścia miksera.

## API dla AI

`window.SfxApi`: `play(opis | id, { at })`, `start(opis)` → uchwyt (`set`, `volume`, `stop`), `ambience(opis | id)`,
`sounds` (rodzaje z parametrami), `ambiences`, `stop()`, `save(nazwa, opis)` → zasób `sound`. Zakładka **API**.
