// Opona rowerowa 700×35C (ETRTO 37-622, trekkingowa): okrągły przekrój, boki z beżowej gumy (gumwall),
// czarny pas bieżnika z drobnymi klockami w środku i większymi kostkami na barkach. Bez felgi i dętki.
import { buildTire, ringCollider } from './tire-core.js';

const SPEC = {
  id: 'tire-bike', rim: 0.311, outer: 0.3475, width: 0.037, tread: 0.026, depth: 0.0022, bead: 0.021,
  wall: 0.0014, crown: 0.0035, shoulder: 0.95, bulge: 0.5, segs: 128, crownDrop: 0.0016,
  sideColor: '#9a7448', treadBand: 0.0125,
  text: ['37-622 (700x35C)', 'MAX 6 BAR / 85 PSI', 'INFLATE TO 4-6 BAR', 'REFLEX', 'E-BIKE READY 25 KM/H'],
  pattern(add) {
    const N = 120, d = (Math.PI * 2) / N, R = 0.3475;
    for (let i = 0; i < N; i++) {
      const a = i * d;
      // środek: małe klocki 4 × 3 mm, na przemian przesunięte
      const off = (i % 2) ? 0.0022 : -0.0022;
      add.block(a + 0.004 / R, a + d - 0.004 / R, off - 0.0021, off + 0.0021, { slant: 0.4, chamfer: 0.0004 });
      // barki: kostki 6 × 4,5 mm co drugą podziałkę, schodkowo
      if (i % 2 === 0) for (const s of [-1, 1]) {
        const y0 = s > 0 ? 0.0075 : -0.0128, y1 = s > 0 ? 0.0128 : -0.0075;
        add.block(a + 0.003 / R, a + 2 * d - 0.006 / R, y0, y1, { slant: 0.3 * s, chamfer: 0.0005 });
      }
    }
  },
};

export const info = {
  id: 'tire-bike', name: 'Opona rowerowa 700×35C', version: '1.0.0',
  mass: 0.55, material: 'guma',
  crush: { x: 0.08, y: 0.05, z: 0.08 }, minScale: { x: 0.12, y: 0.25, z: 0.12 },
  collider: ringCollider(0.311, 0.3475, 0.035, 16),
};

export function build(lod = 0) { return buildTire(SPEC, lod); }
