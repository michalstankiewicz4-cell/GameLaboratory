// Zasoby z nazwą: ustawienia zapisane w laboratorium pod nazwą, które edytor sceny (i API) wybiera z listy.
// Silnik, bez Three.js. Laboratorium jest edytorem jednego rodzaju zasobu; scena trzyma tylko nazwę zasobu.
// Pamięć: ta przeglądarka (localStorage[KEY]); inna karta widzi zmianę od razu (zdarzenie 'storage').
//
// { "sea": { "<nazwa>": { …dane }, … }, … }
// Rodzaje:
//   sea — morze z laboratorium wody: stan morza (Hs, Lp, chop, spread, n, dir) i wygląd wody (deep, scatter, shine,
//         ripples, crest, reflect)
//   sky — niebo kosmosu (skybox) z laboratorium ciał niebieskich: wartości ciała „niebo” BodyKit (mgławice, pas
//         Drogi Mlecznej, pył, gwiazdy, barwy, ziarno); wszystkie liczby z suwaków
//   land — ląd z laboratorium lądu: { map — ustawienia terenu LandKit (ziarno, kształt, ląd, rzeźba, głębia, erozja,
//         rozmiar, rozdzielczość, brzeg mapy), water — wody i biomy RegionKit (układ, akwen, rzeki, lód, biom) }
//   weather — pogoda i światło z laboratorium wyglądu: chmury, wiatr, deszcz, widzialność, mgiełka, pora dnia, słońce
//         (wysokość i kierunek), księżyc
//   look — wygląd kamery z laboratorium filtrów (profil potoku js/render/sea/look.js: ekspozycja, tonowanie, kolor,
//         poświata, winieta, ziarno, obiektyw); dawniej własny klucz gameLab.lookProfiles.v1 — przenoszony tu sam
//         przy pierwszym odczycie
//   ui — UI gry z laboratorium UI: definicja 'gamelab-ui' (ekrany menu, HUD, okna gry; js/gameui/gameui.js)
//   material — materiał z laboratorium materiałów: opis MatKit (rodzaj, barwy, kafelek, szorstkość, metaliczność,
//         nierówność, starzenie; js/render/materials/matkit.js)
//   uiskin — skórka UI gry z laboratorium UI: { base: 'space' | 'battle' | 'engine', tokens } (js/gameui/skins.js)
export const KEY = 'gameLab.assets.v1';

export const ASSET_KINDS = {
  sea: { label: 'Sea', labelPl: 'Morze', lab: 'labs/water.html', keys: ['Hs', 'Lp', 'chop', 'spread', 'n', 'dir', 'deep', 'scatter', 'shine', 'ripples', 'crest', 'reflect'] },
  land: { label: 'Land', labelPl: 'Ląd', lab: 'labs/land.html', keys: ['map', 'water'] },
  weather: { label: 'Weather and light', labelPl: 'Pogoda i światło', lab: 'labs/look.html', keys: ['weather', 'coverage', 'density', 'scale', 'haze', 'wind', 'rain', 'vis', 'lightning', 'time', 'sunEl', 'sunAz', 'moon'] },
  look: { label: 'Camera look', labelPl: 'Wygląd kamery', lab: 'labs/filters.html', keys: ['exposure', 'autoExposure', 'autoTarget', 'tone', 'contrast', 'saturation', 'vibrance', 'temperature', 'tint', 'bloom', 'vignette', 'grain', 'ca', 'distortion', 'droplets', 'dirt', 'glare', 'sharpen'] },
  sky: { label: 'Space sky', labelPl: 'Niebo kosmosu', lab: 'labs/bodies.html', keys: null },   // null: każda liczba
  ui: { label: 'Game UI', labelPl: 'UI gry', lab: 'labs/gameui.html', keys: ['format', 'version', 'name', 'skin', 'start', 'pause', 'screens', 'hud', 'windows'] },
  material: { label: 'Material', labelPl: 'Materiał', lab: 'labs/materials.html', keys: ['label', 'kind', 'color', 'color2', 'tile', 'seed', 'roughness', 'metalness', 'bump', 'wear', 'dirt', 'rust', 'brushed', 'panels', 'rivets', 'planks', 'grain', 'cracks', 'grains', 'pores', 'bricks', 'fibres', 'threads', 'trowel'] },
  uiskin: { label: 'Game UI skin', labelPl: 'Skórka UI gry', lab: 'labs/gameui.html', keys: ['base', 'tokens'] },
};

// profile wyglądu kamery sprzed zasobów (laboratorium filtrów do 0.4) — przeniesione raz do rodzaju look
const OLD_LOOK_KEY = 'gameLab.lookProfiles.v1';
function readAll() {
  let all; try { all = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
  try {
    const old = localStorage.getItem(OLD_LOOK_KEY);
    if (old) { all.look = { ...(JSON.parse(old) || {}), ...(all.look || {}) }; localStorage.setItem(KEY, JSON.stringify(all)); localStorage.removeItem(OLD_LOOK_KEY); }
  } catch { /* zostaje stary klucz */ }
  return all;
}
function writeAll(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch { return false; } }
const kindOf = (kind) => ASSET_KINDS[kind] || (() => { throw new Error(`unknown asset kind "${kind}"`); })();

// nazwy zasobów danego rodzaju, alfabetycznie
export const listAssets = (kind) => Object.keys(readAll()[kind] || {}).sort((a, b) => a.localeCompare(b));
export const getAsset = (kind, name) => { const a = (readAll()[kind] || {})[name]; return a ? { ...a } : null; };
// zapis: tylko pola rodzaju (ASSET_KINDS[kind].keys; null — wszystkie liczby); zwraca true, gdy się udało
export function saveAsset(kind, name, data) {
  const k = kindOf(kind), n = String(name || '').trim().slice(0, 40); if (!n) throw new Error('an asset needs a name');
  const clean = {};
  if (k.keys) k.keys.forEach((f) => { if (data[f] != null) clean[f] = data[f]; });
  else Object.keys(data).forEach((f) => { if (Number.isFinite(data[f])) clean[f] = data[f]; });
  const all = readAll(); (all[kind] = all[kind] || {})[n] = clean; return writeAll(all);
}
export function removeAsset(kind, name) { const all = readAll(); if (all[kind]) { delete all[kind][name]; writeAll(all); } }
// zmiana zasobów w innej karcie (np. zapis w laboratorium wody przy otwartym edytorze)
export function onAssetsChange(f) { addEventListener('storage', (e) => { if (e.key === KEY) f(); }); }
