// Język laboratorium mechaniki: polski i angielski (wybór z paska menu — Opcje → Język; ?lang=en / ?lang=pl).
//   T(pl, en) — tekst w bieżącym języku; tr(tekst) — tekst polski przetłumaczony słownikiem (lang-en.js): najpierw cały,
//   potem fragmentami (najdłuższe pierwsze, na granicach słów); LOC — zapis liczb (pl-PL: przecinek, en-US: kropka);
//   translateDom() — statyczne teksty strony: po polsku data-pl (treść), data-tip-pl (podpowiedź), data-aria-pl,
//   data-<tryb>-pl; po angielsku data-en, data-title-en, data-aria-en, data-<tryb>-en
import { EN_DICT } from './lang-en.js';

export const LANG = (typeof window !== 'undefined' && window.LabMenu && window.LabMenu.LANG) || 'pl';
export const EN = LANG !== 'pl';
export const T = (pl, en) => (EN ? en : pl);
export const LOC = EN ? 'en-US' : 'pl-PL';
export const num = (v, d = 0, min = 0) => v.toLocaleString(LOC, { minimumFractionDigits: min, maximumFractionDigits: d });

const DICT = new Map(Object.entries(EN_DICT));
for (const [k, v] of [...DICT]) if (/^\p{Ll}/u.test(k)) { const K = k[0].toUpperCase() + k.slice(1); if (!DICT.has(K)) DICT.set(K, v[0].toUpperCase() + v.slice(1)); }
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const L = '\\p{L}';
const FRAG = new RegExp([...DICT.keys()].sort((a, b) => b.length - a.length)
  .map((k) => `${/^\p{L}/u.test(k) ? `(?<![${L}])` : ''}${esc(k)}${/\p{L}$/u.test(k) ? `(?![${L}])` : ''}`).join('|'), 'gu');
const cache = new Map();
export function tr(s) {
  if (!EN || typeof s !== 'string' || !s) return s;
  let r = cache.get(s); if (r !== undefined) return r;
  r = DICT.get(s.trim());
  if (r === undefined) r = s.replace(FRAG, (m) => DICT.get(m)).replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2');
  if (cache.size > 4000) cache.clear();
  cache.set(s, r); return r;
}

// strona GameLaboratory jest po angielsku z data-pl (treść), data-tip-pl (podpowiedź), data-aria-pl, data-<tryb>-pl;
// strona z Tornado.io — po polsku z data-en: translateDom ustawia to, co pasuje do bieżącego języka
export function translateDom(root = document) {
  if (!EN) {
    document.documentElement.lang = 'pl';
    for (const e of root.querySelectorAll('[data-pl]')) if (e.tagName !== 'TITLE') e.textContent = e.dataset.pl;
    for (const e of root.querySelectorAll('[data-tip-pl]')) e.title = e.dataset.tipPl;
    for (const e of root.querySelectorAll('[data-aria-pl]')) e.setAttribute('aria-label', e.dataset.ariaPl);
    for (const e of root.querySelectorAll('[data-items-pl]')) for (const k of ['items', 'machine', 'physics']) if (e.dataset[k + 'Pl']) e.dataset[k] = e.dataset[k + 'Pl'];
    const tp = document.querySelector('title[data-pl]'); if (tp) document.title = tp.dataset.pl;
    return;
  }
  document.documentElement.lang = 'en';
  for (const e of root.querySelectorAll('[data-en]')) e.textContent = e.dataset.en;
  for (const e of root.querySelectorAll('[data-title-en]')) e.title = e.dataset.titleEn;
  for (const e of root.querySelectorAll('[data-aria-en]')) e.setAttribute('aria-label', e.dataset.ariaEn);
  for (const e of root.querySelectorAll('[data-items-en]')) for (const k of ['items', 'machine', 'physics']) if (e.dataset[k + 'En']) e.dataset[k] = e.dataset[k + 'En'];
  const t = document.querySelector('title[data-en]'); if (t) document.title = t.dataset.en;
}
