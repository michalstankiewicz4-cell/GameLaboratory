// UI gry · dziennik zdarzeń (ze Space, js/ui/hud/eventLog.js): każda wiadomość gry, najnowsza na górze, z godziną;
// rodzaj (info, gain, alert) wybiera barwę. Tekst zawsze przez textContent — wiadomości mogą zawierać dane gracza.
// Tu bez ikon SVG gry i bez stałego id: dziennik to element HUD (js/gameui/hud.js, typ "log"), może być ich kilka.
import { h } from './dom.js';

const KINDS = ['info', 'gain', 'alert'];
const clockText = (d) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');

// createLog({ max, fade }) → { el, add(msg, kind), clear() }; fade [s] — wpis znika po czasie (0 — zostaje)
export function createLog({ max = 60, fade = 0 } = {}) {
  const list = h('ol', { class: 'gLog' });
  function add(msg, kind = 'info') {
    const k = KINDS.includes(kind) ? kind : 'info';
    const li = h('li', { class: k + ' fresh' }, h('span', { class: 't' }, clockText(new Date())), h('span', { class: 'm' }, String(msg)));
    li.addEventListener('animationend', (e) => { if (e.animationName === 'gFresh') li.classList.remove('fresh'); });
    list.prepend(li); list.scrollTop = 0;
    while (list.children.length > max) list.lastElementChild.remove();
    if (fade > 0) setTimeout(() => { li.classList.add('gone'); setTimeout(() => li.remove(), 600); }, fade * 1000);
  }
  return { el: list, add, clear: () => list.replaceChildren() };
}
