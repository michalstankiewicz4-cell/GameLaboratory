// Opona samochodowa 205/55 R16 (letnia, bieżnik kierunkowy): 4 rowki obwodowe, żebro środkowe z nacięciami,
// klocki pośrednie z rowkami poprzecznymi w kształcie V, klocki barkowe. Bez felgi — tak leży na wysypisku.
import { buildTire, ringCollider } from './tire-core.js';

const SPEC = {
  id: 'tire-car', rim: 0.2032, outer: 0.316, width: 0.214, tread: 0.172, depth: 0.0075, bead: 0.165,
  wall: 0.0085, crown: 0.019, shoulder: 0.25, bulge: 0.56, segs: 128,
  text: ['205/55 R16 91V', 'TUBELESS', 'RADIAL', 'M+S', 'DOT 2419'],
  pattern(add, { Wt }) {
    const N = 66, d = (Math.PI * 2) / N;
    for (let i = 0; i < N; i++) {
      const a = i * d;
      // żebro środkowe, nacięcia skośne co podziałkę
      add.block(a + 0.0012 / 0.316, a + d - 0.0012 / 0.316, -0.0255, 0.0255, { slant: 0.55 });
      for (const s of [-1, 1]) {
        // klocki pośrednie (rowek poprzeczny 4 mm, skos w V — lustrzany po obu stronach)
        const y0 = s > 0 ? 0.0365 : -0.0610, y1 = s > 0 ? 0.0610 : -0.0365;
        add.block(a + 0.002 / 0.316, a + d - 0.002 / 0.316, y0, y1, { slant: 0.95 * s });
        // klocki barkowe (rowek 6 mm), co druga podziałka z nacięciem
        const b0 = s > 0 ? 0.0712 : -Wt / 2 - 0.004, b1 = s > 0 ? Wt / 2 + 0.004 : -0.0712;
        add.block(a + 0.003 / 0.316, a + d - 0.003 / 0.316, b0, b1, { slant: 0.25 * s });
      }
    }
  },
};

export const info = {
  id: 'tire-car', name: 'Opona samochodowa 205/55 R16', version: '1.0.0',
  mass: 8.6,                               // kg
  material: 'guma',
  // opór na zgniecenie [kN] wzdłuż lokalnych osi (Y = oś opony): bok składa się łatwiej niż bieżnik
  crush: { x: 4.5, y: 2.2, z: 4.5 }, minScale: { x: 0.4, y: 0.3, z: 0.4 },
  collider: ringCollider(0.203, 0.316, 0.205, 12),
};

export function build(lod = 0) { return buildTire(SPEC, lod); }
