// Zakładka API w konsoli (ui/shell/console.js): polecenia JSON dla sceny (js/scene/api.js) wpisane ręcznie albo
// wklejone od AI. Ctrl+Enter wykonuje; wyniki — najnowsze na górze; każde polecenie trafia też do dziennika strony.
const { t } = window.EditorI18n;
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

export function createApiConsole(api) {
  const box = el('div', 'apiBox');
  const input = el('textarea', 'apiIn'); input.spellcheck = false; input.rows = 3;
  input.placeholder = '{"cmd": "add", "prefab": "sea/orzel", "pos": [40, 0, 20]}';
  input.setAttribute('aria-label', t('api.input'));
  const run = el('button', 'btn', t('api.run')); run.type = 'button'; run.title = t('api.run.tip');
  const help = el('button', 'btn', t('api.help')); help.type = 'button'; help.title = t('api.help.tip');
  const clear = el('button', 'btn', t('api.clear')); clear.type = 'button';
  const tools = el('div', 'apiTools'); tools.append(run, help, clear, el('span', 'apiNote', t('api.note')));
  const out = el('div', 'apiOut');
  box.append(input, tools, out);

  const short = (c) => (Array.isArray(c) ? c.map((x) => x && x.cmd).join(', ') : (c && c.cmd) || '?');
  function exec(text) {
    let cmd; try { cmd = JSON.parse(text); } catch (e) { show(text, { ok: false, error: t('api.notJson', { msg: e.message }) }); return; }
    const res = api.run(cmd);
    show(JSON.stringify(cmd), res);
    const bad = [].concat(res).filter((r) => !r.ok);
    if (window.LabLog) window.LabLog.add(bad.length ? 'warn' : 'info', 'API ' + short(cmd) + (bad.length ? ': ' + bad.map((r) => r.error).join('; ') : ''));
  }
  function show(cmdText, res) {
    const ok = [].concat(res).every((r) => r.ok);
    const item = el('div', 'apiItem' + (ok ? '' : ' bad'));
    const head = el('div', 'apiCmd', cmdText.length > 400 ? cmdText.slice(0, 400) + '…' : cmdText);
    head.title = t('api.again'); head.onclick = () => { input.value = cmdText; input.focus(); };
    item.append(head, el('pre', 'apiRes', JSON.stringify(res, null, 1)));
    out.prepend(item); while (out.childElementCount > 60) out.lastChild.remove();
  }
  run.onclick = () => { const v = input.value.trim(); if (v) exec(v); };
  help.onclick = () => exec('{"cmd": "help"}');
  clear.onclick = () => out.replaceChildren();
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run.onclick(); } });

  const spec = { id: 'api', title: 'API', titlePl: 'API', el: box };
  if (window.LabConsole) window.LabConsole.addTab(spec); else (window.LabConsoleTabs = window.LabConsoleTabs || []).push(spec);
  return { exec };
}
