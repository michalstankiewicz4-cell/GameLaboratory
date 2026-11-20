// Właściwości przedmiotów złomowiska (z gry Złomowisko, js/items/catalog.js i js/items/items.js — z historią): to, co
// fizyczne — metal (temperatura topnienia, gęstość: piec indukcyjny), palenie (czas w piecu na papier), zgniatanie do
// innego modelu (puszka → puszka zgnieciona), sztabka, guma (tarcie opon). Ceny skupu zostają w grze (ekonomia gry).
// Bryła przedmiotu w świecie przedmiotów (js/behaviors/land/items.js) — prostopadłościan z półwymiarów zderzacza gry
// (halfExtents, jak zgniatarki w grze), kształt — walec dla opon, beczek, puszek i garnków (shapeOf).
// Przedmioty jako bryły świata przedmiotów (tworzenie, zamiana, żarzenie): js/behaviors/land/junk-items.js (itemKit).

// metal: rodzaj stopu do pieca indukcyjnego (temperatura topnienia °C, gęstość kg/m³); burn: pali się w piecu na papier [s]
export const METALS = { aluminium: { melt: 660, density: 2700 }, steel: { melt: 1450, density: 7850 } };
export const KINDS = {
  'tire-car': { rubber: true },
  'tire-bike': { rubber: true },
  'tire-tractor': { rubber: true },
  can: { metal: 'aluminium', crushTo: 'can-crushed' },
  'can-crushed': { metal: 'aluminium' },
  pot: { metal: 'steel' },
  newspapers: { burn: 40 },
  box: { burn: 18 },
  barrel: { metal: 'steel' },
  ingot: { ingot: true },
  'ingot-small': { ingot: true },
};
export const propsOf = (kind) => KINDS[kind] || {};
/** Metal przedmiotu (do pieca indukcyjnego) i jego temperatura topnienia. */
export function metalOf(kind) { const m = propsOf(kind).metal; return m ? { id: m, ...METALS[m] } : null; }

/** Półwymiary przedmiotu w jego układzie ze zderzacza gry (info.collider) i skali. */
export function halfExtents(info, s = [1, 1, 1]) {
  const c = info.collider;
  let h;
  if (c.type === 'ring') h = [c.rOut, c.h / 2, c.rOut];
  else if (c.type === 'cyl' || c.type === 'cup') h = [c.r, c.h / 2, c.r];
  else if (c.type === 'box') h = c.size.map((x) => x / 2);
  else { const p = c.hulls[0]; h = [0, 0, 0]; for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) h[k] = Math.max(h[k], Math.abs(p[i + k])); }
  return [h[0] * s[0], h[1] * s[1], h[2] * s[2]];
}

/** Kształt bryły przedmiotu w świecie przedmiotów: walec (oś y) z zderzacza gry ring / cyl / cup, inaczej prostopadłościan. */
export function shapeOf(info) {
  const c = info.collider;
  if (c.type === 'ring') return { type: 'cyl', hollow: c.rIn / c.rOut };
  if (c.type === 'cyl' || c.type === 'cup') return { type: 'cyl' };
  return { type: 'box' };
}
