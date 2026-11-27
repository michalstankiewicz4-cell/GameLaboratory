// Gotowe sceny edytora (lista „Sceny” na pasku narzędzi, editor/js/ui/toolbar.js): każda to funkcja, która buduje dane
// sceny (format gamelab-scene, js/scene/scene-data.js) — wczytana jak plik JSON. Nazwa w i18n: scenes.<id>.
// assets — zasoby, których scena potrzebuje (np. pogoda z tornadem): zapisane przy wczytaniu, gdy ich nie ma.
// Nowa scena = plik w tym folderze + wpis tutaj + tekst scenes.<id> w editor/js/i18n/en.js i pl.js. Opis: editor/README.md.
import { harbour } from './harbour.js';
import { tornadoTown, tornadoTownAssets } from './tornado-town.js';

export const SCENES = [
  { id: 'harbour', build: harbour },
  { id: 'tornadoTown', build: tornadoTown, assets: tornadoTownAssets },
];
