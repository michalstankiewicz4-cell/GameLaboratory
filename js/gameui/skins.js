// UI gry · skórki: wygląd UI gry oddzielony od wyglądu laboratoriów (ui/style/tokens.css). Skórka to zestaw tokenów
// (zmienne CSS --g-*) i podstawa z własnym arkuszem (materiał, ramki, przyciski): 'space' — zestaw UI ze Space
// (js/gameui/css/skin-space.css), 'battle' — menu i HUD z Battle (skin-battle.css), 'engine' — wygląd silnika.
// Skórki zapisane pod nazwą to zasób „uiskin” (js/scene/assets.js): { base, tokens: { nazwa: wartość } }.

export const TOKENS = {
  font: 'Body font', fontHead: 'Heading font', text: 'Text', dim: 'Dim text', head: 'Headings', accent: 'Accent',
  ok: 'Good', warn: 'Warning', err: 'Danger', panel: 'Panel', line: 'Frame', glow: 'Frame glow', backdrop: 'Menu backdrop',
  btn: 'Button', btnHover: 'Button (hover)', radius: 'Corner radius',
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

// skórka: id gotowej albo { base, tokens } (zapisana) → { base, tokens } (pełne tokeny)
export function resolveSkin(skin) {
  if (typeof skin === 'string') skin = SKINS[skin] ? { base: skin } : { base: 'space' };
  const base = SKINS[skin.base] ? skin.base : 'space';
  return { base, tokens: { ...SKINS[base].tokens, ...(skin.tokens || {}) } };
}
// nałożenie na element UI gry: podstawa (arkusz) i tokeny jako zmienne CSS (przez CSSOM, bez atrybutu style w HTML)
export function applySkin(el, skin) {
  const s = resolveSkin(skin);
  el.dataset.skin = s.base;
  for (const k of Object.keys(TOKENS)) el.style.setProperty('--g-' + k, s.tokens[k]);
  return s;
}
