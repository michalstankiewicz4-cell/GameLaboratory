// UI gry · pomocnik DOM (z Battle, js/ui/dom.js): elementy bez innerHTML — zgodnie z CSP i bezpiecznie dla tekstów
// z danych gry. Bez tłumaczeń: teksty przychodzą już w języku gry (definicja UI, js/gameui/gameui.js).

// h('div', { class: 'x', on: { click: fn }, hidden: true }, child, 'text', [more])
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === 'hidden') el.hidden = !!v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = (c) => {
    if (Array.isArray(c)) c.forEach(add);
    else if (c !== undefined && c !== null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}

// przycisk; po kliknięciu oddaje fokus, żeby spacja i Enter nie wciskały go znowu w czasie gry
export function btn(text, onClick, cls = '') {
  const b = h('button', { type: 'button', class: cls }, text);
  b.addEventListener('click', (e) => { onClick(e); b.blur(); });
  return b;
}

// wartość ze stanu gry po ścieżce ('ship.hp', 'ammo.0'); liczba podana wprost zostaje liczbą
export function pick(state, path) {
  if (typeof path === 'number') return path;
  if (path == null || path === '') return undefined;
  return String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), state);
}
