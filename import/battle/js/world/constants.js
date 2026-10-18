// World constants and ship class definitions.
// Units: 1 u ≈ 10 m. Heading `th`: forward = (sin th, cos th); turning left = th increasing.

export const EDGE = 330;              // playable half-size of the sea (ships are pushed back beyond it)
export const SAFE_R = 70;             // radius around the start kept free of islands
export const KNOTS = 4;               // display factor: u/s -> "knots"

const DEG = Math.PI / 180;
const FWD = { c: 0, w: 150 * DEG };           // forward turret arc (centre, half-width)
const AFT = { c: Math.PI, w: 150 * DEG };     // aft turret arc

// Throttle telegraph: index 0 = astern, 1 = stop, 2..5 = 1/4 .. full.
export const THROTTLE = [-0.25, 0, 0.25, 0.5, 0.75, 1];
export const THROTTLE_STOP = 1;

// Ship classes. turrets: local mount z, height y, arc, barrels. guns: shared battery stats.
export const CLASSES = {
  dd: {
    key: 'dd', L: 10, W: 1.3, H: 0.8, hp: 1700, speed: 9.5, accel: 3.2, turn: 0.42, rudderT: 0.6,
    turrets: [
      { z: 3.2, y: 0, arc: FWD, barrels: 1, size: 0.55 },
      { z: -3.7, y: 0, arc: AFT, barrels: 1, size: 0.55 },
    ],
    guns: { reload: 2.8, speed: 46, range: 115, dmg: 130, disp: 5, apex: 0.1, fire: 0.1, cit: 0, traverse: 1.6, cal: 0.3 },
    torps: { n: 4, reload: 24, speed: 20, range: 150, dmg: 1100, spread: 12 * DEG },
    repair: { charges: 2, heal: 0.18, cd: 50 },
  },
  ca: {
    key: 'ca', L: 14, W: 1.85, H: 1.0, hp: 3600, speed: 7.8, accel: 2.2, turn: 0.3, rudderT: 0.8,
    turrets: [
      { z: 4.7, y: 0, arc: FWD, barrels: 2, size: 0.75 },
      { z: 3.2, y: 0.45, arc: FWD, barrels: 2, size: 0.75 },
      { z: -4.9, y: 0, arc: AFT, barrels: 2, size: 0.75 },
    ],
    guns: { reload: 6.5, speed: 52, range: 155, dmg: 260, disp: 7, apex: 0.12, fire: 0.07, cit: 0.08, traverse: 0.9, cal: 0.42 },
    torps: { n: 2, reload: 45, speed: 18, range: 110, dmg: 1000, spread: 8 * DEG },
    repair: { charges: 3, heal: 0.2, cd: 45 },
  },
  bb: {
    key: 'bb', L: 19, W: 2.8, H: 1.25, hp: 7800, speed: 6.2, accel: 1.4, turn: 0.2, rudderT: 1.2,
    turrets: [
      { z: 6.7, y: 0, arc: FWD, barrels: 3, size: 1.05 },
      { z: 4.7, y: 0.6, arc: FWD, barrels: 3, size: 1.05 },
      { z: -5.4, y: 0.6, arc: AFT, barrels: 3, size: 1.05 },
      { z: -7.3, y: 0, arc: AFT, barrels: 3, size: 1.05 },
    ],
    guns: { reload: 13, speed: 58, range: 195, dmg: 820, disp: 10, apex: 0.15, fire: 0.04, cit: 0.12, traverse: 0.45, cal: 0.6 },
    torps: null,
    repair: { charges: 4, heal: 0.22, cd: 60 },
  },
  ss: {
    key: 'ss', L: 9, W: 1.15, H: 0.55, hp: 1500, speed: 7.2, accel: 2.0, turn: 0.34, rudderT: 0.7, sub: true,
    turrets: [{ z: 2.0, y: 0, arc: FWD, barrels: 1, size: 0.42 }],
    guns: { reload: 3.6, speed: 40, range: 80, dmg: 90, disp: 6, apex: 0.1, fire: 0.06, cit: 0, traverse: 1.4, cal: 0.25 },
    torps: { n: 4, reload: 16, speed: 22, range: 175, dmg: 1300, spread: 7 * DEG, bow: true },
    repair: { charges: 2, heal: 0.18, cd: 50 },
  },
};
export const CLASS_KEYS = ['dd', 'ca', 'bb', 'ss'];

// Submarine depth levels: target keel offset (u), max speed factor, battery drain per second (negative = charge),
// and how close an enemy must be to detect the boat.
export const DEPTHS = [
  { name: 'surface', y: 0, speed: 1, drain: -1 / 60, detect: Infinity },
  { name: 'periscope', y: -1.3, speed: 0.75, drain: 1 / 150, detect: 55 },
  { name: 'deep', y: -4.2, speed: 0.6, drain: 1 / 100, detect: 26 },
];
export const DIVE_RATE = 0.7;                  // u/s vertical speed when changing depth
// Depth charges dropped by destroyers on a detected submerged submarine.
export const CHARGE = { fuse: 1.6, radius: 8, dmg: 520, cd: 2.6, dropR: 6 };

// Fire (burning) parameters.
export const FIRE = { max: 2, time: 18, dps: 0.0028 };
