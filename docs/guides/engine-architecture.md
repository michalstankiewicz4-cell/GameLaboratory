# Silnik GameLaboratory — schemat (plan)

Plan, do którego zmierzamy: z laboratoriów (modele, środowiska, zachowania, grafika, dźwięk, UI) robimy silnik,
w którym AI buduje grę przez API, a człowiek widzi wynik na żywo — jak w „Warsztacie dla AI” z pierwszej rozmowy
(drzewo obiektów, właściwości, podgląd). Spisane 2026-11-05 na podstawie schematu właściciela; to plan, nie stan kodu.

## Zasada: scena w środku

Scena nie jest jednym z modułów obok grafiki i audio, tylko środkiem silnika. Wszystkie moduły pracują na tej samej
scenie: grafika ją rysuje, fizyka ją przesuwa, audio z niej gra, sieć ją synchronizuje, zapis ją zapisuje, debug
i edytor ją pokazują, AI ją zmienia.

```
                         ┌──────────────── ENGINE: pętla, czas, cykl życia ────────────────┐
 [Input] ──► zdarzenia ─►│  Scripts ─► Physics ─► Animacje ─► Render ─► Post-FX ─► ekran   │
 klawiatura, mysz, pad,  │  (zachowania) (stały krok)   │         ▲        └─► Audio, UI     │
 dotyk, Pointer Lock     │        │         │           ▼         │                          │
                         │        └─────────┴──────► [SCENE] ─────┘                          │
                         │                   obiekty: położenie + składniki                   │
                         │                   (siatka, światło, kamera, kolizja,               │
                         │                    zachowanie, źródło dźwięku, cząsteczki)         │
                         │                   środowisko: niebo, woda, ląd, pogoda, prawa      │
                         └──────────────────────────────┬────────────────────────────────────┘
      ┌────────────────┬──────────────────┬─────────────┼──────────────┬──────────────────┐
  [Assets]        [Events]           [Network]      [Save/Load]     [Jobs/Workers]   [Debug + Editor + API dla AI]
  kity, tekstury, wiadomości         stan sceny,    scena jako      fizyka, AI,      hierarchia, atrybuty,
  dźwięki,        „trafienie” →      zdarzenia      dane (JSON) →   generowanie      statystyki, konsola,
  prefabrykaty,   audio + UI + sieć  (WebRTC,       IndexedDB /     terenu, nauka    AI buduje i zmienia
  postęp ładowania                   Supabase…)     LocalStorage    sieci            scenę przez API
```

## Moduły

| Moduł | Co robi | Uwagi |
|---|---|---|
| **Engine** | pętla i kolejność: wejście → skrypty → fizyka (stały krok, np. 120 Hz) → animacje → render → audio i UI → debug; czas (pauza, zwolnione tempo); cykl życia (ładuj, start, pauza, koniec) | jedna pętla dla wszystkich modułów |
| **Scene** | drzewo obiektów; obiekt = położenie + składniki (siatka, światło, kamera, kolizja, zachowanie, źródło dźwięku, cząsteczki, sprite); środowisko (niebo, woda, ląd, pogoda, prawa fizyki) | scena jako dane (JSON): z niej zapis, edytor, sieć i API dla AI |
| **Graphics** | rysuje scenę: 3D (Three.js r186, WebGL; później renderer WebGPU z Three), 2D (Canvas), post-FX (wygląd kamery, filtry) | efekty, cząsteczki i sprite'y są obiektami sceny, nie wyjściem grafiki |
| **Physics** | stały krok, prawa środowiska: próżnia, woda, ląd | osobno od skryptów |
| **Scripts** | zachowania podpinane do obiektów (strzelanie, sterowanie, AI przeciwników) | korzystają z fizyki i zdarzeń |
| **Audio** | Web Audio: muzyka, efekty, dźwięk przestrzenny ze źródeł w scenie | słuchacz = kamera |
| **UI** | menu, HUD, pasek postępu, okna | czyta stan sceny i zdarzenia |
| **Input** | klawiatura, mysz, pad, dotyk, Pointer Lock → akcje („skok”, „strzał”) | akcje, nie klawisze, żeby dało się zmieniać sterowanie |
| **Assets** | ładowanie, pamięć podręczna, postęp; prefabrykaty (gotowe obiekty z kitów) | |
| **Events** | szyna wiadomości („trafienie” → audio + UI + sieć) | moduły nie wołają się nawzajem |
| **Network** | synchronizacja stanu sceny i zdarzeń; kto liczy (gospodarz czy każdy), wygładzanie ruchu innych graczy | WebRTC (dane), Supabase / Firebase (lobby, łączenie), Cloudflare (pośrednik) |
| **Save/Load** | scena zapisana jako dane → IndexedDB / LocalStorage | nie jest częścią Workers |
| **Jobs/Workers** | ciężkie zadania w tle: fizyka, generowanie terenu, ścieżki, nauka sieci | |
| **Debug + Editor + API dla AI** | hierarchia, atrybuty, statystyki, konsola; edytor sceny; API: AI dodaje obiekt, zmienia parametr, podgląd od razu | to jest „Warsztat” |

## Co już mamy

| Moduł | Gdzie |
|---|---|
| Assets | modele i kity: `js/models/` |
| Scene (środowiska) | `js/envs/` (niebo, woda, ląd, prawa) |
| Scripts | zachowania: `js/behaviors/` (koło na szynie, okręt na wodzie, lot) |
| Graphics + FX | `js/render/` (wygląd kamery, filtry, widzenie) |
| Audio | `js/audio/` (MusicKit) |
| UI i Debug | `ui/shell/` (okna, `LabPerf`, konsola, `LabLog`, karta ładowania) |
| Jobs/Workers | wątki nauki w laboratoriach języka i obrazów |

Brakuje: wspólnej sceny jako danych (dziś każde laboratorium buduje własną scenę Three.js), jednej pętli silnika,
warstwy Input, szyny zdarzeń, zapisu, sieci i edytora sceny z API dla AI.

## Kolejność (propozycja, do decyzji właściciela)

1. Scena jako dane (JSON: obiekty, składniki, środowisko) i jedna wspólna pętla.
2. Laboratorium sceny („Warsztat”): drzewo obiektów, właściwości, podgląd; wstawianie modeli z kitów, środowisk
   i zachowań z laboratoriów.
3. API dla AI na scenie jako danych.
4. Input z akcjami, szyna zdarzeń, zapis.
5. Sieć.
