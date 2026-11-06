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
// (wygląd kamery — profile laboratorium filtrów — ma na razie własny klucz: gameLab.lookProfiles.v1)
export const KEY = 'gameLab.assets.v1';

export const ASSET_KINDS = {
  sea: { label: 'Sea', labelPl: 'Morze', lab: 'labs/water.html', keys: ['Hs', 'Lp', 'chop', 'spread', 'n', 'dir', 'deep', 'scatter', 'shine', 'ripples', 'crest', 'reflect'] },
  sky: { label: 'Space sky', labelPl: 'Niebo kosmosu', lab: 'labs/bodies.html', keys: null },   // null: każda liczba
};

function readAll() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } }
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
