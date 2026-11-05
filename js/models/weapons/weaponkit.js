// WeaponKit — broń ręczna bohatera (moduły ES z three r186 z vendor, także window.WeaponKit). Ten sam interfejs co inne
// kity: buildWeapon(id) → { group, parts, info, update(t, dt, { fire }), dispose }. Początek w chwycie (prawa dłoń),
// +z — wylot lufy. Opis: docs/models/weapons/README.md.
import * as beryl from './beryl.js';
import * as bomb250 from './bomb250.js';

export const WEAPONS = { beryl, bomb250 };
export const WEAPON_IDS = Object.keys(WEAPONS);
export const weaponInfo = (id) => WEAPONS[id].info;
export function buildWeapon(id, opt) { return WEAPONS[id].build(opt); }
if (typeof window !== 'undefined') window.WeaponKit = { WEAPONS, WEAPON_IDS, weaponInfo, buildWeapon };
