// Regulator odśrodkowy Watta (środowisko ląd): kule na ramionach zawieszonych na osi wrzeciona. Ramię długości L
// odchylone o φ od pionu: równanie wahadła stożkowego φ'' = sin φ·(ω²·cos φ − g/L) − c·φ' (masa ramion pominięta,
// ograniczniki ramion). Równowaga: cos φ = g / (ω²·L) — poniżej ω₀ = √(g/L) kule wiszą na ogranicznikach.
// Tuleja (przez łączniki długości l, zaczepione na ramionach w odległości a od osi zawieszenia) podnosi się z φ.
export const ENV = ['land'];
export function createGovernor({ L = 0.12, a = 0.06, l = 0.06, phiMin = 0.18, phiMax = 1.1, c = 4 } = {}) {
  const g = 9.81, st = { phi: phiMin, w: 0, lift: 0 };
  const sleeveY = (phi) => -a * Math.cos(phi) - Math.sqrt(Math.max(0, l * l - (a * Math.sin(phi)) ** 2));   // tuleja względem zawieszenia
  const y0 = sleeveY(phiMin);
  return {
    state: st, L, a, l, omega0: Math.sqrt(g / L), sleeveY,
    step(omega, dt) {
      const n = Math.max(1, Math.ceil(dt / 0.002)), h = dt / n;
      for (let i = 0; i < n; i++) {
        st.w += h * (Math.sin(st.phi) * (omega * omega * Math.cos(st.phi) - g / L) - c * st.w);
        st.phi += h * st.w;
        if (st.phi < phiMin) { st.phi = phiMin; if (st.w < 0) st.w = 0; }
        if (st.phi > phiMax) { st.phi = phiMax; if (st.w > 0) st.w = 0; }
      }
      st.lift = sleeveY(st.phi) - y0;
      return st;
    },
    equilibrium: (omega) => { const c0 = g / (omega * omega * L); return c0 >= Math.cos(phiMin) ? phiMin : Math.min(phiMax, Math.acos(c0)); },
  };
}
