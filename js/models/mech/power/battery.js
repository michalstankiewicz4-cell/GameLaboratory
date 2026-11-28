// Akumulator: AGM — bloki 12 V w obudowie z ABS (151 × 65 × 94 mm na 7 Ah, skala z pojemności), klemy z osłonami
// (czerwona +, czarna −), łącznik szeregowy; Li-ion / LiFePO4 — pakiet w koszulce termokurczliwej z BMS i złączem.
// Spód w y = 0. setSoc(soc) — wskaźnik naładowania na etykiecie (kolor paska).
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port, materials, plastic, canvasTex, decal } from '../common.js';

export function battery({ chem = 'agm', series = 2, Ah = 7, name } = {}) {
  const M = materials(), g = new THREE.Group(), V = { agm: 12, nmc: 3.6, lfp: 3.2 }[chem] * series;
  g.name = name || `${EN ? 'Battery' : 'Akumulator'} ${Math.round(V * 10) / 10} V ${Ah} Ah`;
  let label;
  if (chem === 'agm') {
    const k = Math.cbrt(Ah / 7), W = 0.151 * k, D = 0.065 * k, H = 0.094 * k;
    for (let i = 0; i < series; i++) {
      const z = (i - (series - 1) / 2) * (D + 0.004), b = mesh(new THREE.BoxGeometry(W, H, D), plastic(0x2c2e31, 0.5)); b.position.set(0, H / 2, z); g.add(b);
      const lid = mesh(new THREE.BoxGeometry(W - 0.004, 0.004, D - 0.004), plastic(0x3a3c40, 0.45)); lid.position.set(0, H + 0.002, z); g.add(lid);
      for (const [x, col] of [[W / 2 - 0.018, 0xc0262a], [-W / 2 + 0.018, 0x1d1d1f]]) { const t = mesh(new THREE.BoxGeometry(0.012, 0.008, 0.008), M.steelP); t.position.set(x, H + 0.008, z); g.add(t); const c = mesh(new THREE.BoxGeometry(0.016, 0.012, 0.014), plastic(col, 0.5)); c.position.set(x, H + 0.01, z); g.add(c); }
      const lt = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#e9e6dc'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 34px sans-serif'; c.fillText(`12 V ${Ah} Ah`, 14, 50); c.font = '20px sans-serif'; c.fillText('AGM · VRLA', 14, 84); c.fillText(EN ? 'do not short-circuit' : 'nie zwierać', 14, 112); });
      const p = mesh(new THREE.PlaneGeometry(W * 0.7, H * 0.55), decal(lt.t)); p.position.set(0, H * 0.5, z + D / 2 + 0.0002); g.add(p); label = label || p;
    }
    const link = mesh(new THREE.BoxGeometry(0.014, 0.004, D + 0.012), M.brassP); link.position.set(W / 2 - 0.018, H + 0.0165, 0); if (series > 1) g.add(link);
  } else {
    const cells = series, L = 0.07, Dd = 0.021, cols = Math.min(cells, 4), rows = Math.ceil(cells / cols), W = cols * Dd, Dp = rows * Dd, k = Math.max(1, Ah / 5);
    const pack = mesh(new THREE.BoxGeometry(W + 0.004, L * Math.min(1.6, k) + 0.004, Dp + 0.004), plastic(chem === 'lfp' ? 0x2f6b3d : 0x2c57a8, 0.35)); pack.position.y = (L * Math.min(1.6, k) + 0.004) / 2; g.add(pack);
    const bms = mesh(new THREE.BoxGeometry(W, 0.006, Dp * 0.8), plastic(0x1f5a2a, 0.5)); bms.position.y = L * Math.min(1.6, k) + 0.007; g.add(bms);
    const conn = mesh(new THREE.BoxGeometry(0.012, 0.01, 0.008), plastic(0xd8c020, 0.5)); conn.position.set(W / 2 - 0.01, L * Math.min(1.6, k) + 0.015, 0); g.add(conn);
  }
  g.userData = { chem, series, Ah, V, mass: chem === 'agm' ? 2.3 * series * Ah / 7 : series * Ah / 2.5 * 0.048,
    ports: { plus: port(EN ? 'Terminal +' : 'Biegun +', DOMAIN.el, 'zacisk'), minus: port(EN ? 'Terminal −' : 'Biegun −', DOMAIN.el, 'zacisk') } };
  return g;
}
