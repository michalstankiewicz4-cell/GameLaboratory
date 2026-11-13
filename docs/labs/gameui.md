# Laboratorium UI gry (`labs/gameui.html`)

Interfejs gry jako **dane** nad żywą sceną (scena bazowa: morze i niebo, kamera krąży): ekrany menu, HUD, okna w grze
i okno dialogowe postaci i narratora. Wygląd to **skórka** — oddzielona od wyglądu laboratoriów (ciemne szkło, złoto;
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
| `skins.js` | skórki: tokeny `--g-*`, gotowe `space`, `battle`, `engine`, `applySkin` | nowy |
| `css/gameui.css` | wejście: nakładka, przyciski, okno dialogowe, `@import` części i skórek | nowy |
| `css/menu.css`, `hud.css`, `log.css`, `window.css` | części na tokenach skórki | Battle `css/menu.css`, `css/hud.css`; Space `eventLog.css`, `window.css` |
| `css/skin-space.css` | materiał z ziarnem, przyciski obrysowane, czcionki (`grain.png`) | Space `css/ui/kit.css` |
| `css/skin-battle.css` | płaskie przyciski, mosiężny akcent | wygląd Battle |

Strona z UI gry linkuje `js/gameui/css/gameui.css` (CSP: style tylko z `'self'`; skrypty ustawiają style przez CSSOM).

## Definicja UI (`gamelab-ui`)

```json
{ "format": "gamelab-ui", "version": 1, "name": "Space command", "skin": "space", "start": "main", "pause": "pause",
  "screens": {
    "main": { "title": "SWARM COMMAND", "text": "…", "items": [
      { "label": "New game", "do": "resume" }, { "label": "Options", "do": "screen:options" }, { "label": "About", "do": "screen:about", "sub": true }] },
    "options": { "title": "Options", "items": [
      { "type": "slider", "label": "Music", "bind": "settings.music", "min": 0, "max": 1, "step": 0.05 },
      { "type": "choice", "label": "Graphics", "bind": "settings.gfx", "options": ["Light", "High"] },
      { "type": "toggle", "label": "Show the minimap", "bind": "settings.minimap" }, { "label": "Back", "do": "back" }] } },
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
  `stats` (obiekt → wiersze), `list` (napisy albo `{ name, n }`). Esc zamyka okna.
- **Okno dialogowe:** `ui.say({ who, text, choices, side })` → wybór (indeks) albo −1; bez `who` — narrator (kursywą,
  na środku). Tekst pisany po literze; klik, Enter albo spacja — dalej; wybory klikiem albo 1–9.

## Skórki

Tokeny (`js/gameui/skins.js`): czcionka tekstu i nagłówków, tekst, przygaszony tekst, nagłówki, akcent, dobrze,
ostrzeżenie, niebezpieczeństwo, panel, ramka, poświata ramki, tło menu, przycisk (i po najechaniu), zaokrąglenie.
Gotowe: **space** (niebieski materiał z ziarnem, poświata, Antonio i Roboto Condensed), **battle** (stal i mosiądz,
czcionka o stałej szerokości), **engine** (wygląd laboratoriów). Własna skórka = podstawa + zmienione tokeny, zapisana
pod nazwą jako zasób **uiskin**; całe UI — zasób **ui** (`js/scene/assets.js`).

## Laboratorium

- Pasek: definicja (przykłady i zapisane), skórka, **Menu** (ekran startowy), **Game** (gra z HUD).
- Okna: **Interface** (nazwa i zapis, ekran startowy i pauzy, przyciski ekranów, lista HUD z usuwaniem i dodawaniem,
  okna gry), **Skin** (podstawa, tokeny z próbnikiem barw, zapis), **Game state** (suwaki stanu, symulacja radaru
  i energii, wpisy dziennika, baner), **Dialogue** (postać, tekst, wybory; linia narratora), **Definition (JSON)**
  (cała definicja — ekrany i okna edytuje się tu), Opis, Wydajność.
- Przykłady: dowództwo kosmiczne (skórka Space), bitwa morska (Battle: kadłub, telegraf, ster, celownik), gra
  w scenie (do ▶ Graj edytora, stan `player.*`), prosta gra (skórka silnika).

## API dla AI

`window.GameUIApi`: `load(def)`, `set(stan)` (łączony z obecnym), `show(ekran)`, `hide()`, `open(okno)`, `close(okno)`,
`say({ who, text, choices })` → wybór, `log(tekst, rodzaj)`, `banner(tekst, podpis)`, `def`, `state`, `samples`,
`skins`, `empty()`. Zakładka **API** w konsoli: `{ "method": "say", "arg": { … } }`.

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
