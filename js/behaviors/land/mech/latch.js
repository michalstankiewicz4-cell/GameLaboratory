// Zatrzask z wyzwalaczem i ramię ze sprężyną skrętną (środowisko ląd). Ramię (młotek) na sworzniu: J·θ'' = −k·(θ − θ₀)
// − c·θ' (sprężyna skrętna śrubowa, tłumienie w łożysku); napięte do kąta θz trzyma je zapadka (zaczep na ramieniu
// opiera się o zapadkę — wiązanie jednostronne θ ≥ θz, póki zapadka jest w zaczepie). Wyzwalacz (elektromagnes albo
// ręcznie) podnosi zapadkę — siła potrzebna: z momentu sprężyny, tarcia i kąta zaczepu. Uderzenie w zderzak (θ = θs):
// współczynnik restytucji e. Dźwignia napina ramię: dopóki ją ciągniesz, ramię nie może zejść poniżej kąta od dźwigni.
export const ENV = ['land'];
export function createLatch({ J = 0.002, k = 0.8, th0 = -0.3, thz = 1.2, ths = -0.25, c = 0.002, e = 0.25, mu = 0.15, sear = 10 * Math.PI / 180, rNotch = 0.04 } = {}) {
  const st = { th: ths, w: 0, engaged: false, lifted: false, hits: 0, lastHit: 0, Ehit: 0, fresh: false, push: -Infinity };
  const Mspring = (th) => -k * (th - th0);
  return {
    state: st,
    // siła na zapadce w zaczepie i siła wyzwalania (prostopadle do zapadki, z tarciem i kątem zaczepu)
    hold: () => Math.abs(Mspring(thz)) / rNotch,
    trigger: () => Math.abs(Mspring(thz)) / rNotch * (mu + Math.tan(sear)),
    energy: () => 0.5 * k * ((thz - th0) ** 2 - (ths - th0) ** 2),
    step(dt, { lift = false, push = -Infinity } = {}) {
      st.lifted = lift; st.push = push;
      const n = Math.max(1, Math.ceil(dt / 0.0005)), h = dt / n;
      for (let i = 0; i < n; i++) {
        st.w += h * (Mspring(st.th) - c * st.w) / J; st.th += h * st.w;
        if (st.th < push) { st.th = push; if (st.w < 0) st.w = 0; }   // dźwignia (kontakt jednostronny)
        if (!lift && st.th >= thz - 0.02) st.engaged = st.fresh = true;           // zapadka wskakuje w zaczep (sprężynka zapadki)
        if (lift) st.engaged = false;
        if (st.engaged && st.th < thz) { st.th = thz; if (st.w < 0) st.w = 0; }
        if (st.th < ths) { if (st.w < -0.5) { if (st.fresh) { st.Ehit = 0.5 * J * st.w * st.w; st.fresh = false; } st.hits++; st.lastHit = 0; } st.th = ths; st.w = -st.w * e; }
      }
      st.lastHit += dt;
      return st;
    },
  };
}
