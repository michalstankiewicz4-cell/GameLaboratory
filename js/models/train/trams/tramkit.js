// TramKit — tramwaje (moduły ES z three r186 z vendor, także window.TramKit dla laboratoriów). Ten sam interfejs co RoadKit:
// buildTram(id) → { def, group, sections, update(t, dt, opts), setPaint, dispose }; opts: speed, poses (człony na łuku),
// work (drzwi), pantograph, lights, brake. Opis: docs/models/train/swing.md.
import * as swing from './swing.js';

export const TRAMS = { swing };
export const TRAM_IDS = Object.keys(TRAMS);
export const tramInfo = (id) => TRAMS[id].info;
export function buildTram(id, opt) { return TRAMS[id].build(opt); }
export function disposeTram(v) { if (v.group.parent) v.group.parent.remove(v.group); v.dispose(); }
if (typeof window !== 'undefined') window.TramKit = { TRAMS, TRAM_IDS, list: TRAM_IDS.map((id) => TRAMS[id].info), tramInfo, buildTram, disposeTram };
