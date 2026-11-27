# Laboratorium UI gry (`labs/gameui.html`)

Interfejs gry jako **dane** nad żywą sceną (scena bazowa: morze i niebo, kamera krąży): ekrany menu, HUD, okna w grze
i okno dialogowe postaci i narratora. Wygląd to **skórka** — oddzielona od wyglądu laboratoriów (motywy Dzień i Noc z
`ui/style/tokens.css`). Silnik: `js/gameui/` (bez Three.js, wspólny dla laboratorium, przyszłego ▶ Graj edytora i gier).
Strona: `js/labs/gameui/gameui.js`, przykłady `js/labs/gameui/samples.js`, arkusz `ui/pages/gameui.css`.

Materiał przeniesiony **z historią**: ze Space — zestaw UI (materiał z ziarnem, ramki z poświatą, okno, dziennik
zdarzeń, czcionki Antonio i Roboto Condensed), z Battle — pomocnik DOM, menu (stos ekranów) i HUD (pasek kadłuba,
telegraf, ster, celownik, baner, minimapa). Przerobione na elementy z danych.

## Silnik (`js/gameui/`)

| Plik | Co | Skąd |
|---|---|---|
| `gameui.js` | `createGameUI(parent, def, { state, keys })` — nakładka `.gui`, okna gry, okno dialogowe, klawisze, skala; format `gamelab-ui` | nowy |
| `screens.js` | ekrany menu: stos z cofaniem, przyciski i ustawienia (suwak, przełącznik, wybór) | Battle (menu.js gry) |
| `hud.js` | HUD z danych: 9 kotwic, elementy `bar`, `value`, `text`, `steps`, `dial`, `log`, `banner`, `crosshair`, `minimap` | Battle (hud.js gry) |
| `log.js` | dziennik zdarzeń: wpisy z godziną, rodzaj (info, gain, alert), znikanie | Space (eventLog.js gry) |
| `dom.js` | `h()`, `btn()`, `pick(stan, ścieżka)` — bez innerHTML | Battle (dom.js gry) |
| `skins.js` | skórki: tokeny `--g-*`, gotowe `space`, `battle`, `engine`, `terminal`, `syntax`, `applySkin` | nowy; `terminal`, `syntax` — z laboratorium skórek (Space) |
| `css/gameui.css` | wejście: nakładka, przyciski, okno dialogowe, `@import` części i skórek | nowy |
| `css/menu.css`, `hud.css`, `log.css`, `window.css` | części na tokenach skórki | Battle `css/menu.css`, `css/hud.css`; Space `eventLog.css`, `window.css` |
| `css/skin-space.css` | materiał z ziarnem, przyciski obrysowane, czcionki (`grain.png`) | Space `css/ui/kit.css` |
| `css/skin-battle.css` | płaskie przyciski, mosiężny akcent | wygląd Battle |
| `css/skin-terminal.css`, `css/skin-syntax.css` | zielony ekran CRT z poświatą; kolorowy motyw kodu | laboratorium skórek (Space), [../history/skins.md](../history/skins.md) |
| `css/controls.css` | podstawowe kontrolki w skórce: przyciski, suwak, przełącznik `.gToggle`, lista, pole tekstowe, pole wyboru, opcje, zakładki `.gTabs` | nowy |

Strona z UI gry linkuje `js/gameui/css/gameui.css` (CSP: style tylko z `'self'`; skrypty ustawiają style przez CSSOM).

## Definicja UI (`gamelab-ui`)

```json
{ "format": "gamelab-ui", "version": 1, "name": "Space command", "skin": "space", "start": "main", "pause": "pause",
  "screens": {
    "main": { "title": "SWARM COMMAND", "text": "…", "items": [
      { "label": "New game", "do": "resume" }, { "label": "Options", "do": "screen:options" }, { "label": "About", "do": "screen:about", "sub": true }] },
    "options": { "title": "Options", "items": [
      { "type": "slider", "label": "Music", "bind": "settings.music", "min": 0, "max": 1, "step": 0.05 },
      { "label": "Graphics", "do": "screen:graphics" }, { "label": "Controls", "do": "screen:controls" },
      { "type": "toggle", "label": "Show the minimap", "bind": "settings.minimap" }, { "label": "Back", "do": "back" }] },
    "graphics": "standard", "controls": "standard" },
  "hud": [
    { "id": "hull", "type": "bar", "at": "bl", "label": "Hull", "bind": "ship.hull", "max": "ship.hullMax", "low": 0.3 },
    { "id": "events", "type": "log", "at": "tr", "label": "Event log", "fade": 0 },
    { "id": "map", "type": "minimap", "at": "br", "bind": "radar", "max": 1500 } ],
  "windows": [ { "id": "cargo", "title": "Cargo", "key": "I", "at": "l", "body": [ { "type": "list", "bind": "cargo" } ] } ] }
```

- **Ekrany:** `do` — `screen:<id>`, `back`, `resume` (zamyka menu — gra), `window:<id>`, `event:<nazwa>` (dla gry),
  `quit`. Ustawienia piszą do stanu gry (`bind`). `start` — ekran na starcie (`""` — od razu gra); `pause` — ekran pod
  Esc w grze. Pierwszy ekran stoi po lewej na przyciemnionym tle, następne na środku w ramce (jak w Battle).
- **HUD:** `at` — `tl`, `t`, `tr`, `l`, `c`, `r`, `bl`, `b`, `br` (elementy z tą samą kotwicą jeden pod drugim); `bind`
  — ścieżka w stanie gry; `max` — liczba albo ścieżka; `color` — `ok`, `accent`, `warn`, `err`; `low` — próg barwy
  ostrzeżenia paska; `steps` — etykiety telegrafu; minimapa — punkty `{ x, y, kind: me | ally | enemy }` (metry od gracza).
- **Okna:** `key` — klawisz otwierający; `at` — `c`, `l`, `r`; treść: `text`, `value` (`label`, `bind`, `unit`),
  `stats` (obiekt → wiersze), `list` (napisy albo `{ name, n }`), `tree` (drzewko ulepszeń: `{ type: 'tree', tree:
  'nazwa', points: 'ścieżka' }` — zasób `tree` albo przykład o tej nazwie, widok z pola drzewka `view`; kliknięcie kupuje
  za punkty ze stanu gry i odejmuje je, akcja `buy` z `{ tree, id, level, cost, effects }`; okno z drzewkiem jest
  szersze; `ui.tree(nazwa)` — stan gracza, `ui.buy(nazwa, węzeł)`; opis: [trees.md](trees.md)). Esc zamyka okna.
- **Okno dialogowe:** `ui.say({ who, text, choices, side })` → wybór (indeks) albo −1; bez `who` — narrator (kursywą,
  na środku). Tekst pisany po literze; klik, Enter albo spacja — dalej; wybory klikiem albo 1–9.

## Skórki

Tokeny (`js/gameui/skins.js`): czcionka tekstu i nagłówków, tekst, przygaszony tekst, nagłówki, akcent, dobrze,
ostrzeżenie, niebezpieczeństwo, panel, ramka, poświata ramki, tło menu, przycisk (i po najechaniu), zaokrąglenie.
Gotowe: **space** (niebieski materiał z ziarnem, poświata, Antonio i Roboto Condensed), **battle** (stal i mosiądz,
czcionka o stałej szerokości), **engine** (wygląd laboratoriów), **terminal** (zielony ekran CRT, jedna barwa z poświatą,
napis w ramce, przycisk w negatywie, paski z segmentów, migający kursor w logo) i **syntax** (paleta edytora kodu,
zaokrąglone panele z rozmyciem, paski w gradiencie, logo w przelewającym się gradiencie) — dwa ostatnie z dawnego
laboratorium skórek (1.7.0, [../history/skins.md](../history/skins.md)). **Basic controls** w oknie Skórka pokazuje
podstawowe kontrolki w bieżącej skórce: przyciski (zwykły, wciśnięty, wyłączony; najechanie — kursorem), suwak,
przełącznik, listę wyboru, pole tekstowe, pola wyboru, przyciski opcji i zakładki (`js/labs/gameui/controls-preview.js`,
style `js/gameui/css/controls.css` — także dla gier). Własna skórka = podstawa + zmienione tokeny, zapisana
pod nazwą jako zasób **uiskin**; całe UI — zasób **ui** (`js/scene/assets.js`).

## Dźwięki UI (1.6.0)

`js/gameui/sounds.js`: zdarzenia UI grają dźwięki skórki przez SfxKit (dźwięk `ui`: rodzaj, ton, poziom) na szynie
**interfejsu** miksera silnika (Opcje → Dźwięk → Interface, `settings.audio.ui`).

- Zdarzenia (`UI_EVENTS`): kliknięcie przycisku, najechanie na przycisk, otwarcie ekranu menu albo okna, zamknięcie
  okna albo menu, powrót w menu, pisanie tekstu dialogu (co literę, z odstępem), wybór w dialogu, kupione ulepszenie,
  nie da się kupić, baner, wpis w dzienniku.
- Zestawy skórek (`SKIN_SOUNDS`): **space** — piknięcia, szum otwarcia i zamknięcia; **battle** — metalowe przekaźniki
  i klawisze dalekopisu; **engine** — ciche tyknięcia. Rodzaje (`UI_KINDS`): klik, dzwonek, naprawa, alarm, pik, tyk,
  przekaźnik, otwarcie, zamknięcie, klawisz, potwierdzenie, odmowa. Własne — pole `sounds` skórki (zasób uiskin;
  `null` — cisza); w laboratorium okno **Skórka → Sounds** (lista na zdarzenie, ▶ — odsłuch).
- **Głosy postaci**: `say({ who, text, voice })` — głos kwestii (gotowy VoiceKit: narrator, robot, villager, child,
  giant, radio, android, ghost, albo zasób **voice** z laboratorium mowy); bez `voice` — `voices[who]` z definicji UI
  (`"voices": { "Station AI": "android" }`); bez głosu — dźwięk pisania skórki. Głos gra na szynie mowy, milknie przy
  następnej kwestii albo wyborze. Laboratorium: okno **Dialog → Voice**; API sceny: `ui { say: { who, text, voice } }`.
- `ui.sounds` — `{ on, play(zdarzenie), voice(tekst, głos), stopVoice() }` (`on = false` — UI bez dźwięku).

## Laboratorium

- Pasek: definicja (przykłady i zapisane), skórka, **Menu** (ekran startowy), **Game** (gra z HUD).
- Okna: **Interface** (nazwa i zapis, ekran startowy i pauzy, przyciski ekranów, lista HUD z usuwaniem i dodawaniem,
  okna gry), **Skin** (podstawa, tokeny z próbnikiem barw, zapis), **Game state** (suwaki stanu, symulacja radaru
  i energii, wpisy dziennika, baner), **Dialogue** (postać, tekst, wybory; linia narratora), **Definition (JSON)**
  (cała definicja — ekrany i okna edytuje się tu), Opis, Wydajność.
- Przykłady: dowództwo kosmiczne (skórka Space), bitwa morska (Battle: kadłub, telegraf, ster, celownik), gra
  w scenie (do ▶ Graj edytora, stan `player.*`), prosta gra (skórka silnika).

## API dla AI

`window.GameUIApi`: `load(def)`, `set(stan)` (łączony z obecnym), `show(ekran)`, `hide()`, `open(okno)`, `close(okno)`, `tree(nazwa)`, `buy(nazwa, węzeł)`,
`say({ who, text, choices })` → wybór, `log(tekst, rodzaj)`, `banner(tekst, podpis)`, `def`, `state`, `samples`,
`skins`, `empty()`. Zakładka **API** w konsoli: `{ "method": "say", "arg": { … } }`.

## Ustawienia gry: grafika i sterowanie (1.3.0 – 1.4.0)

Ustawienia gracza są w magazynie silnika `js/core/settings.js` (z Battle — tam pod tą samą ścieżką — z historią):
`createSettings()` — zapis w przeglądarce (`gamelab.settings.v1`, wspólny dla laboratorium UI gry i ▶ Graj edytora),
każda zmiana przez `sanitize()` (liczby w zakresie, znane słowa).

- **`settings.gfx`** — `scale` (rozdzielczość obrazu 0,5…1), `aa` (wygładzanie), `shadows` (cienie), `shadowQuality`
  (`high` / `low` — mapa cieni 2048 / 1024), `lights` (oświetlenie dynamiczne: światła punktowe i reflektory — ogień,
  lampy, światła pozycyjne; słońce i niebo zostają), `bloom` (poświata), `bright` (jasność 0,6…2), `sat` (nasycenie
  0…1,6), `showFps` (licznik klatek w rogu UI); **poziom jakości silnika** (`js/render/quality.js`, opis:
  [../guides/rendering.md](../guides/rendering.md), „Poziom jakości silnika”): `lod` (odległość szczegółów modeli
  0,5…2), `texture` (`high` / `low` — tekstury; rozdzielczość map od następnego wczytania, filtrowanie od razu), `fx`
  (gęstość efektów 0,25…1), `water` (detal wody), `view` (zasięg widzenia 0,5…1), `smallShadows` (cienie drobnych
  części). Zestawy `GFX_PRESETS`: **high** i **light** (Battle; light — dla słabszych komputerów: także bliższe
  przełączanie szczegółów, tekstury niskie, połowa efektów, woda bez detalu, zasięg 0,7, bez cieni drobnych części).
- **`settings.mouse`** — `rotSens`, `zoomSens` (czułość obracania i przybliżania kamery 0,2…3).
- **`settings.keys`** — czynność → kod klawisza (`KeyboardEvent.code`, niezależny od układu klawiatury): `forward`,
  `back`, `left`, `right`, `yawLeft`, `yawRight`, `up`, `down`, `rollLeft`, `rollRight`, `brake`, `lift`, `gear`,
  `flaps`, `stickIn`, `stickOut` (`KEY_ACTIONS` — nazwy EN / PL i klawisze domyślne).
- Inne proste pola (np. `music`, `sound`, `minimap`) — ustawienia danej gry, zostają w magazynie.

**Menu:** pozycje ekranu `{ type: 'presets', bind: 'settings.gfx' }` (zestaw naraz) i `{ type: 'keys', bind:
'settings.keys' }` (klik i wciśnięcie klawisza; Esc — bez zmiany; ten sam klawisz dla dwóch czynności — barwa
niebezpieczeństwa), opcja wyboru jako `{ value, label }`, akcja `reset:gfx` / `reset:mouse` / `reset:keys`. Gotowe
ekrany: w definicji `"screens": { "graphics": "standard", "controls": "standard", "audio": "standard" }` (`SETTINGS_SCREENS`; „audio” — Dźwięk: głośność ogólna, muzyki, otoczenia, efektów, mowy, wyciszenie — szyny miksera `js/audio/mixer.js`) — przykłady
mają je w Opcjach albo w pauzie.

**UI z magazynem:** `createGameUI(parent, def, { settings })` — dane magazynu w stanie gry pod `settings` (zawsze
z magazynu), zmiana w menu → magazyn → akcja `settings`; `ui.fps(n)` — licznik klatek. **Grafika na scenie:**
`js/render/game-graphics.js` — `applyGraphics({ renderer, look, scene, sun }, gfx)` (rozdzielczość i wygładzanie potoku
kamery, cienie, mapa cieni słońca, światła dynamiczne), `lookParams(L, gfx)` (poświata, jasność, nasycenie w potoku
kamery), `lights(scene, gfx)`. Laboratorium pokazuje zmiany od razu na scenie za UI; ▶ Graj stosuje je w grze (także
klawisze i czułość myszy), po Stop edytor wraca do swojego wyglądu.

## UI gry w scenie (edytor, ▶ Graj)

Scena wskazuje UI polem **`env.ui`** — nazwą UI zapisanego tutaj (zasób `ui`): w edytorze lista **UI gry** w oknie
Właściwości środowiska, w API `{"cmd": "env", "ui": "<nazwa>"}`. W ▶ Graj UI przykrywa widok
(`editor/js/play/gameui-play.js`):

- **Stan gry** (co 0,1 s): `player` — `name`, `speed`, `unit`, `throttle` (−1…1), `throttlePct`, `alt`, `vs`,
  `landed`, `crashed`, `stall`, `aground`, `progress` (z linii stanu zachowania gracza); `scene` — `name`, `surface`,
  `objects`; `time` (s gry); `radar` — `[{ x, y, kind: me | body | other, name }]` (metry od gracza, do minimapy).
- **Zdarzenia:** akcje statków (`action` na szynie) — wpis w dzienniku; akcje UI `event:<nazwa>` i wybory
  w dialogu — zdarzenie **`ui`** na szynie (`{ name }` albo `{ choice }`), `quit` — koniec gry (powrót do edycji).
- **Esc:** zamyka dialog i okna, cofa w menu, a w grze otwiera ekran pauzy; bez ekranu pauzy Esc kończy grę jak
  dotąd.
- **API:** `{"cmd": "ui", "say": { "who", "text", "choices" }}` (wybór przychodzi jako zdarzenie `ui`), `log`, `banner`,
  `show`, `hide`, `open`, `close` — w czasie gry.
- **Lekarz sceny:** brakujące UI (`env.ui` bez zapisanego zasobu) — błąd `missing-asset`.
- Przykład **Scene play** (skórka Space): nazwa gracza, prędkość z jednostką zachowania (`unitBind`), ciąg, wysokość,
  dziennik, radar, pauza z powrotem do edytora, okno pomocy (H).

## Dalej (pomysły)

Dialogi z laboratorium scenariusza (`TODO.md`); kadłub, amunicja i inne wartości gry, gdy zachowania je podadzą.
