// Model doctor — ulice StreetKit (js/models/streets/, z Tornado.io): wszystkie przekroje, skrzyżowania, sygnalizatory,
// latarnie, znaki, słupki, barierki, ekrany, pikietaż, parkingi, wiadukty, tunele, rampa, kładki, przejście podziemne.
// Modele stojące na ziemi (y = 0) mają opts.ground 0 — nikt ich nie ogląda spod gruntu; pod ziemią (rampa, przejście
// podziemne) — bez tego. planeEps 1 cm.
import * as THREE from '../../../vendor/three/three.module.js';
import { countDraw } from './common.js';
import * as K from '../../../js/models/streets/streetkit.js';

const done = (root, opts = {}) => { root.updateMatrixWorld(true); return { root, measured: countDraw(root), opts: { planeEps: 0.01, ...opts } }; };
const LINE = [[-20, 0], [20, 0]], CURVE = [[-20, -8], [0, -4], [14, 8], [18, 22]];
const V3 = [[-95, 0, 0.3], [-65, 0, 2.6], [-38, 0, 6.4], [-16, 0, 7.7], [0, 0, 7.9], [16, 0, 7.7], [38, 0, 6.4], [65, 0, 2.6], [95, 0, 0.3]];
// modele stojące na ziemi (y = 0) — nikt ich nie ogląda spod gruntu; pod ziemią (rampa, przejście podziemne) — bez tego
const st = (id, label, fam, fn, opts = { ground: 0 }) => ({ id: 'streets/' + id, label, sub: 'land · StreetKit', family: 'streets', group: fam, build: () => done(fn(), opts) });

export const models = [
  ...Object.entries(K.PROFILES).map(([k, p]) => st('street-' + k, 'Ulica: ' + p.label, 'street', () => K.buildStreet(LINE, p).group)),
  st('street-curve', 'Ulica na łuku', 'street', () => K.buildStreet(CURVE, K.PROFILES.city).group),
  st('crossing-4', 'Skrzyżowanie 4 wloty', 'street', () => K.buildCrossing(K.PROFILES.city, { arms: 4 }).group),
  st('crossing-3', 'Skrzyżowanie T', 'street', () => K.buildCrossing(K.PROFILES.city, { arms: 3 }).group),
  st('signal', 'Sygnalizator', 'furniture', () => K.buildTrafficLight().group),
  st('signal-arm', 'Sygnalizator na wysięgniku', 'furniture', () => K.buildTrafficLight({ arm: 4 }).group),
  ...Object.entries(K.LAMPS).map(([k, v]) => st('lamp-' + k, 'Latarnia: ' + v.label, 'furniture', () => K.buildLamp(k).group)),
  ...Object.keys(K.SIGNS).map((k) => st('sign-' + k, 'Znak ' + k, 'furniture', () => K.buildSign(k).group)),
  st('sign-D-18-T-29', 'Znak D-18 z T-29', 'furniture', () => K.buildSign('D-18', { tab: 'T-29' }).group),
  ...Object.entries(K.BOLLARDS).map(([k, v]) => st('bollards-' + k, 'Słupki: ' + v.label, 'furniture', () => K.buildBollards([[0, 0], [8, 0]], k, { every: k === 'delineator' ? 4 : undefined }).group)),
  ...Object.entries(K.RAILS).map(([k, v]) => st('rail-' + k, 'Barierka: ' + v.label, 'furniture', () => K.buildRail([[0, 0], [10, 0]], k, { offset: 2 }).group)),
  ...Object.entries(K.NOISE).map(([k, v]) => st('noise-' + k, 'Ekran: ' + v.label, 'furniture', () => K.buildNoiseWall([[0, 0], [12, 0]], k).group)),
  st('milepost-hm', 'Słupek hektometrowy', 'furniture', () => K.buildMilepost(12, 3).group),
  st('milepost-km', 'Słupek kilometrowy', 'furniture', () => K.buildMilepost(12, 0).group),
  ...Object.entries(K.PARKING).map(([k, v]) => st('parking-' + k, 'Parking: ' + v.label, 'street', () => K.buildParking(LINE, k, { inner: 3.25, side: 1, disabled: 2 }).group)),
  st('viaduct', 'Wiadukt prosty', 'structure', () => K.buildViaduct(V3).group),
  st('viaduct-curve', 'Wiadukt na łuku', 'structure', () => K.buildViaduct([[-95, -35, 0.3], [-62, -32, 4.2], [-32, -20, 8.4], [-8, 2, 9.2], [10, 28, 9.4], [34, 46, 8.8], [64, 52, 4.4], [96, 50, 0.3]]).group),
  st('tunnel-arch', 'Tunel łukowy', 'structure', () => K.buildTunnel([[-30, 0], [30, 0]], K.TUNNEL_PROFILE, { ground: () => 12 }).group),
  st('tunnel-box', 'Tunel z podporami', 'structure', () => K.buildTunnel([[-30, 0], [30, 0]], K.TUNNEL_BOX_PROFILE, { type: 'box', ground: () => 7 }).group),
  st('trough', 'Rampa w korycie', 'structure', () => K.buildTrough([[0, 0, -6], [30, 0, -3], [60, 0, 0]]).group, {}),
  st('footbridge', 'Kładka ze schodami', 'structure', () => K.buildFootbridge().group),
  st('footbridge-back', 'Kładka ze schodami naprzemiennymi', 'structure', () => K.buildFootbridge({ stairs: 'switchback' }).group),
  st('footbridge-lift', 'Kładka ze schodami i windą', 'structure', () => K.buildFootbridge({ lift: true }).group),
  st('subway', 'Przejście podziemne', 'structure', () => K.buildSubway().group, {}),
];
