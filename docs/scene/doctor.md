# Lekarz sceny (`js/scene/doctor.js`)

Sprawdza **układ sceny** — to, czego nie widać w pojedynczym modelu (pojedynczy model sprawdza doktor modeli,
[`../tools/doctor.md`](../tools/doctor.md)). Jak doktor modeli: uniwersalny (reguły dla rodzin i środowisk, nie dla
jednego modelu), **zgłasza i proponuje poprawki, niczego nie przestawia sam**. Silnik bez Three.js i bez DOM: działa
w edytorze, w API dla AI i w grach. Plan: [`../guides/lab-breakdown.md`](../guides/lab-breakdown.md), punkt 7.

## Gdzie

- **API:** `{"cmd": "check"}` (nieobowiązkowo `"budget": { "tris": …, "draws": … }`) → `{ issues, counts, cost, skipped }`.
- **Edytor sceny:** przycisk **Badaj** na pasku narzędzi (kafelek **Lekarz sceny** na stronie startowej i w menu
  Narzędzia otwiera edytor od razu z tym oknem: `editor/index.html?doctor`; wersja — wersja edytora) i okno **Lekarz sceny** (OPCJE → Okna): lista problemów,
  kliknięcie zaznacza obiekt, **Popraw** wykonuje proponowane polecenie API jako jeden krok (Cofnij je odwraca).
  Okno sprawdza scenę samo po każdej zmianie (z opóźnieniem).
- **W kodzie:** `checkScene(scene, ctx)` — `ctx` opisany w nagłówku pliku (prefabrykaty, zachowania, zasoby, a ze świata
  nieobowiązkowo: grunt i woda sceny bazowej, obrys i koszt zbudowanego modelu). Bez pomiarów świata (np. gra bez
  edytora) lekarz sprawdza same dane; to, czego nie mógł sprawdzić, podaje w `skipped`.

## Problem

`{ code, level, object?, name?, text, fix? }` — `level`: `error` (scena nie zadziała tak, jak wygląda), `warn`
(prawdopodobnie błąd), `info` (do wiadomości); `fix` — polecenie albo lista poleceń API do wykonania osobno.

| Kod | Poziom | Co | Poprawka |
|---|---|---|---|
| `missing-asset` | błąd | środowisko wskazuje zasób z nazwą, którego nie ma (ląd, morze, niebo, wygląd kamery, pogoda) | domyślne (`""`, gotowe światło) |
| `unused-asset` | uwaga | ląd ustawiony, a powierzchnia nie jest lądem | — |
| `unknown-prefab` | błąd | model, którego nie ma w prefabrykatach (nie zbuduje się) | `remove` |
| `behavior-misfit` | błąd | wybrane zachowanie nie pasuje do modelu | bez zachowania |
| `wrong-env` | błąd / ostrz. | model w złym środowisku: okręt na lądzie (mapa lądu bez wody pod nim), drzewo albo pojazd w wodzie, model lądowy w kosmosie, samolot bez powietrza, ciało niebieskie nad morzem lub lądem, statek bez zachowania dla tej powierzchni | — (wybór należy do autora) |
| `wrong-surface` | błąd | wszystkie modele potrzebują tej samej innej powierzchni | `env surface` |
| `behavior-env` | ostrz. | zachowanie działa w innym środowisku niż scena (gdy model nie jest już zgłoszony jako `wrong-env`) | pasujące zachowanie, jeśli model je ma |
| `under-ground` / `floating` | ostrz. | punkt zaczepienia modelu lądowego pod gruntem albo nad nim (więcej niż 0,6 m; teren z laboratorium lądu albo płaski grunt); okręt poza linią wody (więcej niż 1,5 m); samolot pod gruntem | położenie na gruncie / na wodzie |
| `overlap` | ostrz. (jaskinia: uwaga) | obiekty wchodzące jeden w drugi: obrysy zachodzą na ponad 15 % mniejszego | mniejszy odsunięty w poziomie |
| `orbit` | błąd / ostrz. | orbita wokół obiektu, którego nie ma; nic cięższego do krążenia | środek wybierany sam |
| `scale` | uwaga | skala poniżej 0,02 albo powyżej 50 (zachowania liczą w prawdziwych metrach) | — |
| `duplicate-name` | uwaga | kilka obiektów o tej samej nazwie (API potrzebuje `id`) | — |
| `cost` | ostrz. | trójkąty albo wywołania rysowania ponad budżet (domyślnie 2 mln, 1500), z trzema najcięższymi obiektami | — |
| `not-built` | uwaga | modele jeszcze się budują (kity ze Space): obrysy i koszt pominięte | — |

Grunt i powietrze liczone są po **punkcie zaczepienia** modelu (tak stawia go edytor), nie po obrysie — korzenie
roślin i fundamenty bywają poniżej. Obrys w świecie: obrys modelu w jego układzie (liczony raz przy budowie) obrócony
i przesunięty danymi obiektu (`worldBox`), więc wynik nie zależy od tego, czy gra trwa. Koszt: trójkąty (instancje
razem) i wywołania rysowania (siatka × grupy materiałów), liczone przy budowie modelu.

## Przykład

```json
{ "cmd": "check" }
```
```json
{ "ok": true, "cmd": "check", "counts": { "error": 1, "warn": 2, "info": 0 },
  "issues": [
    { "code": "wrong-env", "level": "error", "object": "o…", "name": "Sub on land", "text": "ORP Orzeł stands on dry land at (0, 0): it needs water (the land map has none here)" },
    { "code": "floating", "level": "warn", "object": "o…", "name": "Flying car", "text": "FSO Polonez 1500 hangs 9 m above the ground at (-40, 0)",
      "fix": { "cmd": "set", "id": "o…", "pos": [-40, 0, 0] } },
    { "code": "overlap", "level": "warn", "object": "o…", "name": "Car A", "text": "Car A goes into Car B (66 % of the smaller one's outline)",
      "fix": { "cmd": "set", "id": "o…", "pos": [-37.52, 0, 30] } }],
  "cost": { "tris": 190218, "draws": 666, "budget": { "tris": 2000000, "draws": 1500 } }, "skipped": [] }
```

## Dalej (pomysły)

Nowa reguła = funkcja w `checkScene` (kod, poziom, tekst, poprawka) i wiersz w tabeli wyżej. Możliwe następne: obiekt
poza mapą lądu, pojazd szynowy poza torem, moduły bazy za blisko siebie (zasady budowy z `editor/js/world/placer.js`),
światła i cienie ponad budżet.
