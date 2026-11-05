// Scene editor · languages. A classic script after en.js and pl.js and before ui/shell/windows.js, so the windows get
// their titles in the right language. The language is the menu bar's (OPTIONS → Language); the editor page sets
// <html data-lang-default="en">, so until Polish is chosen it is English.
//   data-i18n="key"        → the element's text
//   data-i18n-tip="key"    → its title (tooltip)
//   data-i18n-win="key"    → a window's title (data-title)
// Scripts: EditorI18n.t('key', { name: … }) — {name} in the text is replaced.
(function () {
  'use strict';
  const L = window.EditorLang || {}, lang = (window.LabMenu && window.LabMenu.LANG) === 'pl' ? 'pl' : 'en';
  const t = (key, vars) => {
    let s = (L[lang] && L[lang][key]) ?? (L.en && L.en[key]) ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  };
  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
    root.querySelectorAll('[data-i18n-tip]').forEach((e) => { e.title = t(e.dataset.i18nTip); });
    root.querySelectorAll('[data-i18n-win]').forEach((e) => { e.dataset.title = t(e.dataset.i18nWin); delete e.dataset.titlePl; });
  }
  document.documentElement.lang = lang;
  apply();
  window.EditorI18n = { lang, t, apply };
})();
