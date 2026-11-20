// UI gry · skórki: wygląd UI gry oddzielony od wyglądu laboratoriów (ui/style/tokens.css). Skórka to zestaw tokenów
// (zmienne CSS --g-*) i podstawa z własnym arkuszem (materiał, ramki, przyciski): 'space' — zestaw UI ze Space
// (js/gameui/css/skin-space.css), 'battle' — menu i HUD z Battle (skin-battle.css), 'engine' — wygląd silnika.
// Skórki zapisane pod nazwą to zasób „uiskin” (js/scene/assets.js): { base, tokens: { nazwa: wartość }, sounds? }.
// Dźwięki skórki (sounds): zdarzenie UI → dźwięk interfejsu SfxKit (sound 'ui': kind, pitch, level) albo null (cisza);
// grają na szynie interfejsu miksera (js/gameui/sounds.js) — kosmiczna piszczy, Battle klika metalem, silnik tyka.

export const TOKENS = {
  font: 'Body font', fontHead: 'Heading font', text: 'Text', dim: 'Dim text', head: 'Headings', accent: 'Accent',
  ok: 'Good', warn: 'Warning', err: 'Danger', panel: 'Panel', line: 'Frame', glow: 'Frame glow', backdrop: 'Menu backdrop',
  btn: 'Button', btnHover: 'Button (hover)', radius: 'Corner radius',
};
// zdarzenia UI z dźwiękiem (js/gameui/sounds.js)
export const UI_EVENTS = {
  click: ['Button click', 'Kliknięcie przycisku'], hover: ['Pointer over a button', 'Najechanie na przycisk'],
  open: ['Menu screen or window opens', 'Otwarcie ekranu menu albo okna'], close: ['Window closes', 'Zamknięcie okna'],
  back: ['Back in the menu', 'Powrót w menu'], type: ['Dialogue text appears', 'Pisanie tekstu dialogu'],
  choice: ['Dialogue choice', 'Wybór w dialogu'], buy: ['Upgrade bought', 'Kupione ulepszenie'], deny: ['Cannot buy', 'Nie da się kupić'],
  banner: ['Banner', 'Baner'], log: ['Event log entry', 'Wpis w dzienniku'],
};
// rodzaje dźwięku interfejsu (SfxKit ui.kind, w tej kolejności)
export const UI_KINDS = [['Click', 'Klik'], ['Bell', 'Dzwonek'], ['Repair', 'Naprawa'], ['Alarm', 'Alarm'], ['Blip', 'Pik'], ['Tick', 'Tyk'],
  ['Relay', 'Przekaźnik'], ['Open', 'Otwarcie'], ['Close', 'Zamknięcie'], ['Key', 'Klawisz'], ['Confirm', 'Potwierdzenie'], ['Deny', 'Odmowa']];
const U = (kind, pitch = 1, level = 1) => ({ sound: 'ui', params: { kind, pitch, level } });
// rodzaje (SfxKit ui.kind): 0 klik, 1 dzwonek, 2 naprawa, 3 alarm, 4 pik, 5 tyk, 6 przekaźnik, 7 otwarcie, 8 zamknięcie,
// 9 klawisz, 10 potwierdzenie, 11 odmowa
export const SKIN_SOUNDS = {
  space: { click: U(4), hover: U(4, 1.6, 0.35), open: U(7, 1.2), close: U(8, 1.2), back: U(4, 0.75), type: U(4, 1.9, 0.25), choice: U(10, 1.1), buy: U(2, 1.2), deny: U(11), banner: U(1, 1.2, 0.8), log: U(4, 1.3, 0.5) },
  battle: { click: U(6), hover: U(5, 0.8, 0.4), open: U(6, 0.7), close: U(6, 0.9, 0.7), back: U(6, 0.85), type: U(9, 1, 0.8), choice: U(6, 0.75), buy: U(2), deny: U(11, 0.8), banner: U(1), log: U(9, 1.1, 0.6) },
  engine: { click: U(5), hover: U(5, 1.5, 0.3), open: U(7), close: U(8), back: U(5, 0.8), type: U(5, 1.8, 0.25), choice: U(10), buy: U(10, 1.2), deny: U(11, 1.1), banner: U(4, 0.9), log: U(5, 1.2, 0.6) },
};
export const FONTS = ['"Roboto Condensed", "Arial Narrow", sans-serif', '"Antonio", "Arial Narrow", sans-serif', '"Oswald", "Arial Narrow", sans-serif',
  '"Space Grotesk", system-ui, sans-serif', 'ui-monospace, Consolas, monospace', '"IBM Plex Mono", ui-monospace, monospace', 'Georgia, serif'];

export const SKINS = {
  space: { label: 'Space (blue material, glowing frames)', tokens: {
    font: FONTS[0], fontHead: FONTS[1], text: '#eef1ff', dim: '#93a6ff', head: '#96a8ff', accent: '#f8bb56', ok: '#0bd99a', warn: '#f8bb56', err: '#d05b69',
    panel: 'rgb(0 2 12 / .9)', line: '#1c3bb4', glow: 'rgb(40 80 255 / .45)', backdrop: 'rgb(0 0 8 / .6)', btn: '#050a24', btnHover: '#0b1650', radius: '12px' } },
  battle: { label: 'Battle (naval, brass on dark steel)', tokens: {
    font: FONTS[4], fontHead: FONTS[4], text: '#d4e0e6', dim: '#8fa6b2', head: '#f0c070', accent: '#f0c070', ok: '#4fbf6a', warn: '#f0a080', err: '#d0402a',
    panel: 'rgb(5 14 22 / .82)', line: '#2c4c60', glow: 'transparent', backdrop: 'rgb(4 10 16 / .62)', btn: 'rgb(16 34 48 / .92)', btnHover: '#1c3446', radius: '0px' } },
  engine: { label: 'Engine (the labs\' dark glass and gold)', tokens: {
    font: FONTS[3], fontHead: FONTS[3], text: '#e8eaee', dim: '#9aa3ad', head: '#e7c27a', accent: '#e7c27a', ok: '#6fcf8e', warn: '#e7c27a', err: '#e0675f',
    panel: 'rgb(14 18 24 / .86)', line: 'rgb(255 255 255 / .14)', glow: 'transparent', backdrop: 'rgb(6 8 12 / .55)', btn: 'rgb(255 255 255 / .06)', btnHover: 'rgb(231 194 122 / .18)', radius: '8px' } },
};

// skórka: id gotowej albo { base, tokens, sounds } (zapisana) → { base, tokens, sounds } (pełne; dźwięk null — cisza)
export function resolveSkin(skin) {
  if (typeof skin === 'string') skin = SKINS[skin] ? { base: skin } : { base: 'space' };
  const base = SKINS[skin.base] ? skin.base : 'space';
  return { base, tokens: { ...SKINS[base].tokens, ...(skin.tokens || {}) }, sounds: { ...SKIN_SOUNDS[base], ...(skin.sounds || {}) } };
}
// nałożenie na element UI gry: podstawa (arkusz) i tokeny jako zmienne CSS (przez CSSOM, bez atrybutu style w HTML)
export function applySkin(el, skin) {
  const s = resolveSkin(skin);
  el.dataset.skin = s.base;
  for (const k of Object.keys(TOKENS)) el.style.setProperty('--g-' + k, s.tokens[k]);
  return s;
}
