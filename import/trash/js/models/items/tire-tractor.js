// Opona traktorowa 18.4-38 (rolnicza, bieżnik R-1): wysokie łapy w jodełkę pod kątem ~45°, zachodzące na środek
// i zawinięte na bark, korpus diagonalny z grubą koroną. Bez felgi. Do podniesienia za ciężka — tylko pojazdem.
import { buildTire, ringCollider } from './tire-core.js';

const R = 0.895, LUG_H = 0.038, N = 23;
const SPEC = {
  id: 'tire-tractor', rim: 0.4826, outer: R, width: 0.470, tread: 0.42, depth: LUG_H, bead: 0.41,
  wall: 0.014, crown: 0.032, shoulder: 0.55, bulge: 0.5, segs: 144,
  text: ['18.4-38', '10 PR', 'R-1  TUBE TYPE', 'AGRICULTURAL TRACTOR', 'MADE IN EU'],
  pattern(add, { Wt }) {
    const d = (Math.PI * 2) / N, yEnd = Wt / 2 + 0.008;
    for (let i = 0; i < N; i++) for (const s of [-1, 1]) {
      // druga strona przesunięta o pół podziałki; łapa zaczyna się za środkiem (zachodzi) i biegnie w łuku na bark
      const a0 = i * d + (s > 0 ? 0 : d / 2), path = [];
      for (let k = 0; k <= 10; k++) {
        const t = k / 10, y = s * (-0.03 + (yEnd + 0.03) * t);
        const ay = Math.abs(y + 0.03 * s);   // odległość od początku łapy
        const arc = 0.62 * ay + 0.55 * ay * ay;   // kąt łapy rośnie ku barkowi (łuk)
        path.push([a0 + arc / R, y]);
      }
      add.lug(path, 0.058, LUG_H);
    }
  },
};

export const info = {
  id: 'tire-tractor', name: 'Opona traktorowa 18.4-38', version: '1.0.0',
  mass: 190, material: 'guma',
  crush: { x: 35, y: 18, z: 35 }, minScale: { x: 0.5, y: 0.4, z: 0.5 },
  collider: ringCollider(0.4826, R, 0.47, 16),
};

export function build(lod = 0) { return buildTire(SPEC, lod); }
