// Akumulator (środowisko ląd, dziedzina „prąd”): napięcie spoczynkowe z krzywej OCV(SoC) dla chemii ogniwa, spadek na
// rezystancji wewnętrznej (U = OCV − I·R), stan naładowania z całkowania prądu (Peukert dla kwasowo-ołowiowych),
// napięcie odcięcia. Dane katalogowe typowych ogniw (AGM 12 V, Li-ion NMC 18650/21700, LiFePO4).
//   const b = createBattery({ chem: 'agm', series: 2, Ah: 7 })   b.step(dt, I) → { U, soc, … }   b.U(I)
export const ENV = ['land'];
export const CHEM = {
  agm: { name: 'kwasowo-ołowiowy AGM (blok 12 V, 6 ogniw)', cellV: 12, ocv: [[0, 11.6], [0.2, 12.0], [0.5, 12.3], [0.8, 12.6], [1, 12.85]], cut: 10.5, R1Ah: 0.17, peukert: 1.15, wh: 35, rho: 'ok. 35 Wh/kg' },
  nmc: { name: 'litowo-jonowy NMC (ogniwo 3,6 V)', cellV: 3.6, ocv: [[0, 3.0], [0.05, 3.3], [0.1, 3.45], [0.3, 3.6], [0.5, 3.7], [0.7, 3.85], [0.9, 4.03], [1, 4.2]], cut: 3.0, R1Ah: 0.075, peukert: 1.02, wh: 220, rho: 'ok. 220 Wh/kg' },
  lfp: { name: 'litowo-żelazowo-fosforanowy LiFePO4 (ogniwo 3,2 V)', cellV: 3.2, ocv: [[0, 2.5], [0.05, 3.0], [0.1, 3.2], [0.2, 3.25], [0.5, 3.29], [0.8, 3.32], [0.95, 3.4], [1, 3.6]], cut: 2.5, R1Ah: 0.06, peukert: 1.02, wh: 140, rho: 'ok. 140 Wh/kg' },
};
const lerp = (T, x) => { if (x <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) { const [a, va] = T[i - 1], [b, vb] = T[i]; return va + (vb - va) * (x - a) / (b - a); } return T[T.length - 1][1]; };
export function createBattery({ chem = 'agm', series = 2, Ah = 7, soc = 0.9 } = {}) {
  const C = CHEM[chem] || CHEM.agm, R = C.R1Ah / Ah * series;   // rezystancja wewnętrzna pakietu (Ω)
  const st = { soc, I: 0, U: 0, Ah, series, chem, cut: false, Wh: 0, t: 0 };
  const ocv = () => lerp(C.ocv, st.soc) * series;
  const U = (I) => Math.max(0, ocv() - I * R);
  return {
    state: st, C, R, ocv, U, nominal: C.cellV * series, energy: C.cellV * series * Ah,
    step(dt, I) {
      st.t += dt; st.I = I;
      const Ieff = chem === 'agm' && I > 0 ? I * Math.pow(Math.max(1e-6, I) / (Ah / 20), C.peukert - 1) : I;   // Peukert: większy prąd — mniejsza pojemność
      st.soc = Math.max(0, Math.min(1, st.soc - Ieff * dt / 3600 / Ah));
      st.U = U(I); st.Wh += st.U * I * dt / 3600;
      st.cut = st.U < C.cut * series;   // napięcie odcięcia — odbiorniki (BMS / wyłącznik niskiego napięcia) odłączone
      return st;
    },
  };
}
