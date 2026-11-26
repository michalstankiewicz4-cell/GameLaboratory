// Klawiszologia — skróty klawiszowe każdej strony (Pomoc → Klawiszologia, ui/shell/menubar.js wczytuje ten moduł przy
// otwarciu okna). Strona — jak w ui/data/versions.js ("labs/look.html", "editor/index.html"); sekcja — { title, keys },
// klawisz — [klawisz, tekst EN, tekst PL] (klawisz napisem albo [EN, PL]). player: true — klawisze gracza z ustawień
// (js/core/settings.js: KEY_ACTIONS i settings.keys — to, co gracz sam przypisał). Nowy skrót w kodzie strony = wpis tu.
// keysFor(strona, język) → [{ title, rows: [[klawisz, tekst]] }] (pusta lista — strona nie ma skrótów)
import { KEY_ACTIONS, keyName, createSettings } from '../../js/core/settings.js';

const SPACE = ['Space', 'Spacja'];
const H = ['H', 'Hide / show the windows', 'Chowa i pokazuje okna'];
const FLY = (where = ['Free flight', 'Swobodny lot']) => ({ title: where, keys: [
  ['W / A / S / D', 'Move forward, left, back, right', 'Naprzód, w lewo, wstecz, w prawo'],
  ['Q / E', 'Down / up', 'W dół / w górę'],
  ['Shift', 'Faster (held)', 'Szybciej (przytrzymany)'],
] });

export const PAGES = {
  'editor/index.html': [
    { title: ['Editing', 'Edycja'], keys: [
      ['P', 'Play (▶ Play)', 'Graj (▶ Graj)'],
      ['W / E / R', 'Move, rotate, scale (the handle)', 'Przesuń, obróć, skaluj (uchwyt)'],
      ['F', 'Frame the selected object', 'Pokaż wybrany obiekt'],
      ['Delete, Backspace', 'Remove the selected object', 'Usuń wybrany obiekt'],
      ['Ctrl+D', 'Duplicate', 'Powiel'],
      ['Ctrl+Z', 'Undo', 'Cofnij'],
      ['Ctrl+Y, Ctrl+Shift+Z', 'Redo', 'Ponów'],
      ['Esc', 'Select the environment', 'Wybierz środowisko'],
      H,
    ] },
    { title: ['Placing base modules', 'Stawianie modułów bazy'], keys: [
      ['R', 'Turn the module by 45°', 'Obróć moduł o 45°'],
      [['Esc, right click', 'Esc, prawy przycisk'], 'Stop placing', 'Koniec stawiania'],
    ] },
    { title: ['API console', 'Konsola API'], keys: [['Ctrl+Enter', 'Run the commands', 'Wykonaj polecenia']] },
    { title: ['▶ Play', '▶ Graj'], player: true, keys: [
      ['1 … 9', 'The player\'s actions in order (listed in the status line)', 'Akcje gracza po kolei (lista w linii stanu)'],
      ['Esc', 'Stop (unless the game UI takes it: pause, a window, a dialogue)', 'Zatrzymaj (chyba że weźmie go UI gry: pauza, okno, dialog)'],
    ] },
  ],
  'labs/look.html': [{ title: ['Look lab', 'Laboratorium wyglądu'], keys: [['F', 'Fire a salvo', 'Salwa'], H] }],
  'labs/water.html': [{ title: ['Water lab', 'Laboratorium wody'], keys: [H] }],
  'labs/land.html': [
    { title: ['Land lab', 'Laboratorium lądu'], keys: [H] },
    FLY(),
    { title: ['Sailing (a ship on the water)', 'Żegluga (okręt na wodzie)'], keys: [
      ['W / S', 'Throttle a step up / down', 'Gaz o stopień w górę / w dół'],
      ['A / D', 'Rudder left / right (held)', 'Ster w lewo / w prawo (przytrzymany)'],
    ] },
  ],
  'labs/plants.html': [{ title: ['Plants lab', 'Laboratorium roślin'], keys: [H] }, FLY(['Landscape', 'Krajobraz'])],
  'labs/structures.html': [
    { title: ['Structures lab', 'Laboratorium budowli'], keys: [H] },
    { title: ['Junkyard machines', 'Maszyny złomowiska'], keys: [['R / F', 'Tilt the crucible (held)', 'Przechyl tygiel (przytrzymany)']] },
  ],
  'labs/transform.html': [{ title: ['Transformer', 'Transformator'], keys: [H] }],
  'labs/caves.html': [FLY(['Inside the cave', 'W jaskini'])],
  'labs/gear.html': [FLY(['Camera', 'Kamera'])],
  'labs/vehicles-water.html': [
    { title: ['Vehicle lab · water', 'Laboratorium pojazdów · woda'], keys: [['F', 'Frame the ship', 'Pokaż okręt'], H] },
    { title: ['Marine robots', 'Roboty morskie'], keys: [
      ['W / A / S / D', 'Steer', 'Sterowanie'],
      ['Q / E', 'Dive / rise (the diver)', 'Zanurzenie / wynurzenie (nurek)'],
    ] },
  ],
  'labs/vehicles-land.html': [
    { title: ['Driving', 'Jazda'], keys: [
      ['W / S', 'Throttle / back (switches the auto drive off)', 'Gaz / wstecz (wyłącza jazdę samą)'],
      ['A / D', 'Steer left / right', 'Skręt w lewo / w prawo'],
    ] },
    { title: ['Landing a spaceship', 'Lądowanie statku'], keys: [
      [SPACE, 'Lift engines', 'Silniki podnośne'],
      ['W / S', 'Main engine', 'Silnik główny'],
      ['A / D', 'Heading', 'Kurs'],
    ] },
    { title: ['Grapple loader (junkyard)', 'Przeładowarka (złomowisko)'], keys: [
      ['W / S', 'Drive forward / back', 'Jazda naprzód / wstecz'],
      ['A / D', 'Steer', 'Skręt'],
      [['← / →', '← / →'], 'Slew the crane', 'Obrót żurawia'],
      [['↑ / ↓', '↑ / ↓'], 'Boom up / down', 'Wysięgnik w górę / w dół'],
      ['F / R', 'Stick out / in', 'Ramię od siebie / do siebie'],
      [SPACE, 'Open / close the jaws', 'Otwórz / zamknij chwytak'],
    ] },
  ],
  'labs/surface.html': [
    { title: ['On the ground', 'Na gruncie'], keys: [
      ['W / ↑, S / ↓', 'Forward / back', 'Naprzód / wstecz'],
      ['A / ←, D / →', 'Turn left / right', 'Skręt w lewo / w prawo'],
      ['Shift', 'Faster (held)', 'Szybciej (przytrzymany)'],
    ] },
    { title: ['Building the base', 'Budowa bazy'], keys: [
      ['B', 'Build (the first module) / cancel', 'Buduj (pierwszy moduł) / przerwij'],
      ['R', 'Turn the module', 'Obróć moduł'],
      ['Esc', 'Cancel building', 'Przerwij budowę'],
      ['Delete', 'Remove the module under the pointer', 'Usuń moduł pod kursorem'],
    ] },
  ],
  'labs/items.html': [{ title: ['Items lab · Deformation', 'Laboratorium przedmiotów · Deformacja'], keys: [
    ['R', 'Start over (new barrels, presses up)', 'Od nowa (nowe beczki, prasy do góry)'],
    ['U', 'Lift the presses', 'Podnieś prasy'],
    ['W / A / S / D', 'Move the camera', 'Przesuwanie kamery'],
  ] }],
  'labs/blocks.html': [{ title: ['Blocks lab', 'Laboratorium bloków'], keys: [['Shift', 'While biting: the left button orbits (held)', 'Przy gryzieniu: lewy przycisk obraca widok (przytrzymany)']] }],
  'labs/city.html': [{ title: ['Drawing a footprint', 'Rysowanie obrysu'], keys: [
    ['Enter', 'Finish the footprint', 'Zakończ obrys'],
    ['Backspace', 'Remove the last point', 'Usuń ostatni punkt'],
    ['Esc', 'Cancel', 'Anuluj'],
  ] }],
  'labs/trees.html': [{ title: ['Editing the tree', 'Edycja drzewka'], keys: [
    ['Delete', 'Remove the selected node', 'Usuń wybrany węzeł'],
    ['Esc', 'Back to the select tool', 'Powrót do wybierania'],
  ] }],
  'labs/effects-land.html': [{ title: ['Effects lab · land', 'Laboratorium efektów · ląd'], keys: [[SPACE, 'Light the fire again', 'Rozpal ogień ponownie']] }],
  'labs/effects.html': [{ title: ['Effects lab', 'Laboratorium efektów'], keys: [[SPACE, 'Play the effect', 'Odtwórz efekt']] }],
  'labs/sound.html': [{ title: ['Music', 'Muzyka'], keys: [[SPACE, 'Play / pause', 'Graj / pauza']] }],
  'labs/sound-effects.html': [{ title: ['Sound effects', 'Efekty dźwiękowe'], keys: [[SPACE, 'Play the sound', 'Zagraj dźwięk']] }],
  'labs/sound-speech.html': [{ title: ['Speech', 'Mowa'], keys: [['Ctrl+Enter', 'Say the text', 'Powiedz tekst']] }],
  'labs/pixel.html': [
    { title: ['Pixel Studio', 'Pixel Studio'], keys: [[SPACE, 'Play / stop the animation', 'Odtwórz / zatrzymaj animację']] },
    { title: ['Draw mode', 'Tryb „Draw”'], keys: [
      ['B', 'Pencil', 'Ołówek'], ['E', 'Eraser', 'Gumka'], ['G', 'Fill', 'Wypełnienie'], ['L', 'Line', 'Linia'], ['R', 'Rectangle', 'Prostokąt'], ['I', 'Colour picker', 'Pipeta'],
      ['Ctrl+Z', 'Undo', 'Cofnij'], ['Ctrl+Shift+Z', 'Redo', 'Ponów'],
    ] },
  ],
  'labs/art.html': [{ title: ['Art lab', 'Laboratorium sztuki'], keys: [['Ctrl+V', 'Paste an image (anywhere on the page)', 'Wklej obraz (w dowolnym miejscu strony)']] }],
  'labs/lang.html': [{ title: ['Language lab', 'Laboratorium języka'], keys: [['Enter', 'Send the message', 'Wyślij wiadomość']] }],
  'labs/img.html': [{ title: ['Image lab', 'Laboratorium obrazów'], keys: [[['Enter, Space', 'Enter, Spacja'], 'Pick the focused image', 'Wybierz zaznaczony obraz']] }],
  'labs/walkers.html': [{ title: ['The HUD (its title bar focused)', 'Panel HUD (gdy jego pasek tytułu ma fokus)'], keys: [
    [['Arrows', 'Strzałki'], 'Move it (Shift — farther)', 'Przesuń (Shift — dalej)'],
    ['+ / −', 'Wider / narrower', 'Szerszy / węższy'],
  ] }],
};

export function keysFor(page, lang = 'en') {
  const L = lang === 'pl' ? 1 : 0, txt = (k) => (Array.isArray(k) ? k[L] : k);
  const out = [];
  for (const s of PAGES[page] || []) {
    let rows = s.keys.map((k) => [txt(k[0]), k[1 + L]]);
    if (s.player) {   // klawisze gracza: to, co jest teraz w ustawieniach (gracz może je zmienić), przed resztą sekcji
      let keys = null; try { keys = createSettings().data.keys; } catch (e) { /* storage blocked */ }
      rows = [...KEY_ACTIONS.map((a) => [keyName((keys && keys[a.id]) || a.key), L ? a.labelPl : a.label]), ...rows];
    }
    out.push({ title: txt(s.title), rows });
  }
  return out;
}
