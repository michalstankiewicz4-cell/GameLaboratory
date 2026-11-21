// Laboratorium UI gry — podgląd podstawowych kontrolek w bieżącej skórce (js/gameui/css/controls.css): przyciski
// (zwykły, wciśnięty, wyłączony; najechanie — kursorem), suwak, przełącznik, lista wyboru, pole tekstowe, pole wyboru,
// przyciski opcji i zakładki. Okienko w nakładce UI gry (.gui), więc bierze tokeny i arkusz skórki.
// controlsPreview(root) → { show(b), shown, el }
const h = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) { if (k === 'class') e.className = v; else if (k in e) e[k] = v; else e.setAttribute(k, v); }
  for (const k of kids.flat()) if (k != null) e.append(k);
  return e;
};
const row = (label, ...ctl) => h('div', { class: 'pRow' }, h('span', {}, label), ...ctl);

export function controlsPreview(root) {
  const close = h('button', { class: 'gClose', type: 'button', textContent: '✕', title: 'Close' });
  const range = h('input', { type: 'range', min: '0', max: '100', value: '60' }), rangeV = h('b', { textContent: '60' });
  range.oninput = () => { rangeV.textContent = range.value; };
  const toggle = h('input', { type: 'checkbox', class: 'gToggle', checked: true, title: 'Toggle' });
  const pressed = h('button', { type: 'button', class: 'on', textContent: 'Pressed' });
  pressed.onclick = () => pressed.classList.toggle('on');
  const tabNames = ['Ship', 'Cargo', 'Crew'], tabText = ['Hull 82 % · speed 14 kn', 'Ore 12 t · ice 3 t', '4 robots on duty'];
  const tabBody = h('div', { class: 'pTab', textContent: tabText[0] });
  const tabs = h('div', { class: 'gTabs' }, tabNames.map((n, i) => {
    const b = h('button', { type: 'button', textContent: n, class: i ? '' : 'on' });
    b.onclick = () => { [...tabs.children].forEach((x) => x.classList.toggle('on', x === b)); tabBody.textContent = tabText[i]; };
    return b;
  }));
  const el = h('div', { class: 'gPreview', hidden: true },
    h('div', { class: 'gWinHead' }, h('h3', { class: 'gHd', textContent: 'Basic controls' }), close),
    row('Buttons', h('div', { class: 'pBtns' }, h('button', { type: 'button', textContent: 'Button' }), pressed, h('button', { type: 'button', textContent: 'Disabled', disabled: true }))),
    row('Slider', h('div', { class: 'pPick' }, range, rangeV)),
    row('Switch', toggle),
    row('List', h('select', {}, ['Easy', 'Normal', 'Hard'].map((x, i) => h('option', { textContent: x, selected: i === 1 })))),
    row('Text field', h('input', { type: 'text', placeholder: 'Your name', maxLength: 24 })),
    row('Check box', h('div', { class: 'pPick' }, h('label', {}, h('input', { type: 'checkbox', checked: true }), 'Subtitles'), h('label', {}, h('input', { type: 'checkbox' }), 'Hints'))),
    row('Options', h('div', { class: 'pPick' }, ['Low', 'Medium', 'High'].map((x, i) => h('label', {}, h('input', { type: 'radio', name: 'gPrevQ', checked: i === 2 }), x)))),
    tabs, tabBody,
  );
  root.append(el);
  const api = { el, get shown() { return !el.hidden; }, show(b) { el.hidden = !b; if (api.onShow) api.onShow(!el.hidden); } };
  close.onclick = () => api.show(false);
  return api;
}
