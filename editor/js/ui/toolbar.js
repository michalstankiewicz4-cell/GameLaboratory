// Pasek narzędzi (Graj / Stop, uchwyt, nowa scena, zapis i odczyt pliku) i klawisze edytora.
const $ = (id) => document.getElementById(id);
const { t } = window.EditorI18n;

export function createToolbar(store, controls, actions) {
  const setMode = (m) => { controls.setMode(m); [...$('mode').children].forEach((b) => b.classList.toggle('on', b.dataset.m === m)); };
  [...$('mode').children].forEach((b) => b.addEventListener('click', () => setMode(b.dataset.m)));

  $('newScene').addEventListener('click', () => { store.reset(t('scene.newName')); controls.frameAll(); actions.status(t('status.new')); });
  $('saveFile').addEventListener('click', () => {
    const S = store.scene, blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = (S.name || 'scene').replace(/[\\/:*?"<>|]+/g, '').trim().replace(/\s+/g, '-') + '.scene.json';
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    actions.status(t('status.saved'));
  });
  $('loadFile').addEventListener('click', () => $('fileIn').click());
  // Graj / Stop: w grze edycja (pasek, okna Scena i Właściwości) jest wyłączona
  const playBtn = $('play');
  playBtn.addEventListener('click', () => { playBtn.blur(); actions.play.toggle(); });
  actions.play.onChange((on) => {
    playBtn.textContent = t(on ? 'bar.stop' : 'bar.play'); playBtn.title = t(on ? 'bar.stop.tip' : 'bar.play.tip'); playBtn.classList.toggle('on', on);
    document.querySelectorAll('#mode button, #newScene, #saveFile, #loadFile, #treeWin :is(input, select, button), #propsWin :is(input, select, button)').forEach((b) => { b.disabled = on; });
  });
  $('fileIn').addEventListener('change', async () => {
    const f = $('fileIn').files[0]; $('fileIn').value = ''; if (!f) return;
    try { const data = JSON.parse(await f.text()); actions.build(() => { store.load(data); controls.frameAll(); }); actions.status(t('status.opened', { file: f.name })); }
    catch (e) { actions.status(t('status.openFail', { msg: e.message })); if (window.LabLog) window.LabLog.add('error', 'Scene file: ' + e.message); }
  });

  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    const k = e.key.toLowerCase();
    if (actions.play.playing) { if (k === 'escape') actions.play.stop(); return; }   // w grze klawisze ma gracz (play/input.js)
    if (k === 'p' && !e.ctrlKey && !e.metaKey) actions.play.start();
    else if (k === 'w') setMode('translate'); else if (k === 'e') setMode('rotate'); else if (k === 'r') setMode('scale');
    else if (k === 'f') controls.frameSelection();
    else if ((k === 'delete' || k === 'backspace') && store.selectedId) { e.preventDefault(); actions.remove(); }
    else if (k === 'd' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); actions.duplicate(); }
    else if (k === 'escape') store.select(null);
  });
  return { setMode };
}
