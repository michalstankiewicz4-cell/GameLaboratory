// Kosmos w scenie: kity ze Space (ShipKit — statki, dron, stacja; BodyKit — niebo; SystemKit — gotowe tła) ładowane
// dopiero wtedy, gdy scena ich potrzebuje (powierzchnia „kosmos” albo model z rodziny space). Kity są pisane pod
// globalne THREE: najpierw js/core/three-global.js (window.THREE z pomocnikami LIGHT_SCALE i srgbColor — kity
// z Battle i TrainKit, które czytają window.THREE przy załadowaniu, są już wtedy załadowane), potem kity w kolejności.
const SHIP_FILES = ['codewing', 'scribe', 'swarmer', 'haven'];
let loading = null;

export const spaceReady = () => !!(window.ShipKit && window.BodyKit && window.SystemKit && window.BodyKit.GAME_KINDS && window.BodyKit.GAME_KINDS.sky);

export function loadSpace() {
  if (!loading) loading = (async () => {
    await import('../core/three-global.js');
    await import('../models/ships-space/shipkit.js');
    for (const f of SHIP_FILES) await import(`../models/ships-space/ships/${f}.js`);
    await import('../models/bodies/bodykit.js');
    await import('../models/bodies/kinds/sky.js');
    await import('../envs/space/systemkit/systemkit.js');
    if (window.LabLog) window.LabLog.add('info', 'Space kits loaded (ShipKit, BodyKit sky, SystemKit)');
  })();
  return loading;
}

// tła: gotowe z SystemKit (id, np. "crimson") i niebo zapisane w laboratorium ciał niebieskich (zasób „sky”)
// env.sky: '' — „Deep field”, 'preset:<id>' — gotowe tło, '<nazwa>' — zasób
export const SKY_PRESET = 'preset:';
export function skyPresets() { return spaceReady() ? window.SystemKit.SKIES.map((s) => ({ id: s.id, name: s.name, none: !!s.none, values: s.values })) : []; }
