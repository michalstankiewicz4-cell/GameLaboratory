// Zapisane ustawienia laboratorium (localStorage) — wczytywane ostrożnie: przyjęte są tylko klucze stanu domyślnego,
// o tym samym typie (liczby skończone), a gdzie podano dopuszczalne wartości — z tej listy (albo spełniające warunek).
// Wartość usunięta z programu (scena, nawierzchnia, typ budynku…) albo zepsuta nie wykłada strony: zostaje domyślna.
//   loadState(KEY, DEFAULTS, { klucz: [wartości] | (v) => bool }) → stan
//   pick(stan, DEFAULTS, zmiany, choices) — to samo dla zmian z API (StreetsApi.set…): tylko poprawne pola
export function valid(d, v, c) {
  let ok = typeof d === 'number' ? typeof v === 'number' && Number.isFinite(v) : typeof d === typeof v && v !== null;
  if (ok && c) ok = typeof c === 'function' ? c(v) : c.includes(v);
  return ok;
}
export function pick(S, defaults, o, choices = {}) {
  const bad = [];
  if (o && typeof o === 'object') for (const k of Object.keys(o)) {
    if (!(k in defaults)) { bad.push(k); continue; }
    if (valid(defaults[k], o[k], choices[k])) S[k] = o[k]; else bad.push(k);
  }
  return bad;
}
export function loadState(key, defaults, choices = {}) {
  let saved = null; try { saved = JSON.parse(localStorage.getItem(key) || 'null'); } catch { saved = null; }
  const S = { ...defaults };
  pick(S, defaults, saved, choices);
  return S;
}
