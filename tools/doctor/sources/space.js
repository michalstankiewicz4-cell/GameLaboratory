// Model doctor — models from Space: every kit's models, built unmerged (detail 1): ships and the station (ShipKit),
// base modules (BaseKit), rovers (VehicleKit), vessels (MarineKit). The kits are classic scripts on window,
// loaded by the page after js/core/three-global.js.
import { countDraw } from './common.js';

function kit(name) { const k = window[name]; if (!k) throw new Error('model doctor: ' + name + ' not loaded'); return k; }
const wrap = (root) => ({ root, measured: countDraw(root), opts: {} });

export function models() {
  const out = [];
  const SK = window.ShipKit, BK = window.BaseKit, VK = window.VehicleKit, MK = window.MarineKit;
  if (SK) SK.SHIP_DEFS.forEach((d) => out.push({ id: 'space/ship/' + d.id, label: d.name || d.id, sub: 'space · ShipKit', family: 'space',
    build: () => wrap(kit('ShipKit').buildShipModel(d.id, { detail: 1 }).group) }));
  if (BK) BK.MODULES.forEach((d) => out.push({ id: 'space/base/' + d.id, label: d.name || d.id, sub: 'land · BaseKit', family: 'space',
    build: () => { const m = kit('BaseKit').buildModule(d.id, { detail: 1 }); m.setProgress(1); return wrap(m.group); } }));
  if (VK) VK.VEHICLES.forEach((d) => out.push({ id: 'space/vehicle/' + d.id, label: d.name || d.id, sub: 'land · VehicleKit', family: 'space',
    build: () => wrap(kit('VehicleKit').buildVehicle(d.id, { detail: 1 }).group) }));
  if (MK) MK.VESSELS.forEach((d) => out.push({ id: 'space/vessel/' + d.id, label: d.name || d.id, sub: 'water · MarineKit', family: 'space',
    build: () => wrap(kit('MarineKit').buildVessel(d.id, { detail: 1 }).group) }));
  return out;
}
