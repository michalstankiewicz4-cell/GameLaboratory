// Tło drzewka: pole `background` drzewka to nazwa obrazu z laboratorium sztuki (zasób „image”: opis ArtKit,
// js/render/art/artkit.js). Obraz maluje się od nowa z opisu (ten sam opis i ziarno — ten sam obraz), najwyżej 1100 px
// (szerokość widoku płytki), raz na opis; wynik — adres data: (CSP img-src 'self' data:). Bez obrazu — null.
import { getAsset, onAssetsChange } from '../../scene/assets.js';

const cache = new Map();   // opis JSON → Promise<adres>
const MAX = 1100;

/** Adres obrazu tła drzewka (Promise<string|null>); nazwa bez zasobu — null. */
export function treeBackground(name) {
  const d = name ? getAsset('image', name) : null;
  if (!d) return Promise.resolve(null);
  const spec = { ...d, size: Math.min(MAX, +d.size || 1024) }, key = JSON.stringify(spec);
  if (!cache.has(key)) cache.set(key, (async () => {
    const { render } = await import('../../render/art/artkit.js');
    await new Promise((r) => setTimeout(r));   // malowanie trwa: niech strona najpierw się narysuje
    try { return render(spec).canvas.toDataURL('image/jpeg', 0.88); } catch (e) { console.warn('tree background:', e.message); return null; }
  })());
  return cache.get(key);
}

/** Śledzi tło drzewka: get() — bieżący adres (albo null, póki się maluje); po zmianie woła onChange. */
export function backgroundWatcher(getName, onChange) {
  let name = null, url = null;
  onAssetsChange(() => { name = null; });   // obraz zapisany od nowa pod tą samą nazwą
  return {
    get() {
      const n = getName() || '';
      if (n !== name) { name = n; url = null; treeBackground(n).then((u) => { if (name === n) { url = u; onChange?.(u); } }); }
      return url;
    },
  };
}
