// Model doctor — broń ręczna (WeaponKit, js/models/weapons): budowana bez scalania, każda część ma nazwę.
import { countDraw } from './common.js';
import { WEAPON_IDS, weaponInfo, buildWeapon } from '../../../js/models/weapons/weaponkit.js';

export const models = WEAPON_IDS.map((id) => ({
  id: 'weapons/' + id, label: weaponInfo(id).name, sub: 'land · WeaponKit', family: 'weapons',
  build: () => { const v = buildWeapon(id, {}); return { root: v.group, measured: countDraw(v.group), opts: {} }; },
}));
