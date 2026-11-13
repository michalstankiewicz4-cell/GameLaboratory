// Okno „Lekarz sceny” w edytorze: lista problemów z js/scene/doctor.js (przez API — to samo, co polecenie "check"),
// kliknięcie wiersza zaznacza obiekt, „Popraw” wykonuje proponowane polecenie API (jako krok historii — Cofnij działa).
// Sprawdza na przycisk i po każdej zmianie sceny (z opóźnieniem); niczego nie poprawia sam.
const { t } = window.EditorI18n;
const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

export function createDoctorPanel(store, api, actions) {
  const list = $('docList'), sum = $('docSum');
  let timer = 0, last = null;
  function check() {
    const r = api.run({ cmd: 'check' });
    if (!r.ok) { sum.textContent = r.error; return; }
    last = r; render(r);
  }
  function render(r) {
    const c = r.counts;
    sum.textContent = r.issues.length ? t('doc.sum', { e: c.error, w: c.warn, i: c.info }) : t('doc.clean');
    if (r.cost) sum.textContent += ' · ' + t('doc.cost', { tris: Math.round(r.cost.tris / 1000), bt: Math.round(r.cost.budget.tris / 1000), draws: r.cost.draws, bd: r.cost.budget.draws });
    list.replaceChildren();
    for (const q of r.issues) {
      const row = el('div', 'docRow ' + q.level);
      const head = el('div', 'docHead');
      head.append(el('b', 'docLvl', t('doc.' + q.level)), el('span', 'docCode', q.code));
      if (q.name) head.append(el('span', 'docObj', q.name));
      row.append(head, el('div', 'docText', q.text));
      if (q.object) { row.title = t('doc.select'); row.addEventListener('click', (e) => { if (!e.target.closest('button')) store.select(q.object); }); }
      if (q.fix) {
        const b = el('button', 'btn', t('doc.fix')); b.type = 'button'; b.title = JSON.stringify(q.fix);
        b.addEventListener('click', () => {
          const res = api.run(Array.isArray(q.fix) ? q.fix : [q.fix]), bad = [].concat(res).filter((x) => !x.ok);
          if (window.LabLog) window.LabLog.add(bad.length ? 'warn' : 'info', 'Scene doctor fix ' + JSON.stringify(q.fix) + (bad.length ? ': ' + bad.map((x) => x.error).join('; ') : ''));
          actions.status(bad.length ? bad[0].error : t('doc.fixed'));
          soon(50);
        });
        row.append(b);
      }
      list.append(row);
    }
  }
  function soon(ms = 600) { clearTimeout(timer); timer = setTimeout(check, ms); }
  $('docCheck').addEventListener('click', check);
  $('docOpen').addEventListener('click', () => { if (window.LabWindows) window.LabWindows.show('doctor', true); check(); });
  store.on((what) => { if (what !== 'select') soon(); });
  return { check, get last() { return last; } };
}
