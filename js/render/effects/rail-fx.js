// Dym i iskry pociągu z fizyki „koło na szynie” (js/behaviors/rail/physics.js) — jak w aTrain (js/app.js, fxFrame):
// dym z wydechu lokomotywy tym gęstszy, im większa siła napędu (sim.st.F wobec mocy), iskry spod kół z mocy tarcia
// ślizgowego (ws.slipP) i ćwierci mocy tarcia obrzeża (ws.flangeP) — bez warunków logicznych, z sił fizyki.
// Rysuje LandFx (land.js). Ustawienia: LAND_DEFAULTS (laboratorium efektów: Dym (ląd), Iskry (ląd)).
//
// createRailFx(parent, train, cfg?) → { listen(sim, kroki) — po krokach fizyki, przed słuchaczem dźwięku (ten zeruje
//   flangeP; tu zerowane jest slipP); step(dt) — kłęby i iskry w czasie klatki, ruch cząstek; light (0…1, noc ok. 0.15); clear(); dispose() }
//   train — skład z TrainKit (userData.vehicles[0].userData.fx.smoke: wydech w układzie pudła)
import { LandFx } from './land.js';

const SPARK_POWER = 2500;   // W tarcia na iskrę na sekundę (aTrain)
const SPARK_CAP = 40;       // najwięcej zaległych iskier na zestaw kołowy (aTrain)

export function createRailFx(parent, train, cfg) {
  const land = new LandFx(parent, cfg);
  const loco = train && train.userData.vehicles && train.userData.vehicles[0];
  const SMOKE_AT = (loco && loco.userData.fx && loco.userData.fx.smoke) || [1, 2, 0];
  const P = [0, 0, 0], Q = [0, 0, 0];
  let smokeAcc = 0, load = 0, last = null;
  return {
    get light() { return land.light; }, set light(v) { land.light = v; },
    listen(sim, steps = 1) {
      // z tego, co fizyka zebrała w tych krokach (moce tarcia sumowane krok po kroku — średnia: ÷ liczba kroków)
      const n = Math.max(1, steps);
      last = sim; load = Math.min(1, Math.abs(sim.st.F) / Math.max(1, sim.ctrl.power / 4));
      for (const veh of sim.vehicles) for (const ws of veh.ws) ws.sparkP = (ws.slipP || 0) / n + 0.25 * (ws.flangeP || 0) / n;
      for (const b of sim.bodies || []) b.slipP = 0;
    },
    // jak w aTrain: kłęby i iskry wyrzucane w czasie klatki, z mocy z ostatnich kroków fizyki
    step(dt) {
      const sim = last;
      if (sim) {
        const c = land.cfg.smokeLand, lb = sim.vehicles[0].body;
        smokeAcc += dt * (c.rate + c.rateLoad * load);
        if (smokeAcc >= 1) lb.toWorld(SMOKE_AT[0], SMOKE_AT[1], SMOKE_AT[2], P);
        while (smokeAcc >= 1) { smokeAcc -= 1; land.smoke(P, lb.v, load); }
        for (const veh of sim.vehicles) for (const ws of veh.ws) {
          ws.sparkAcc = Math.min(SPARK_CAP, (ws.sparkAcc || 0) + dt * (ws.sparkP || 0) / SPARK_POWER);
          while (ws.sparkAcc >= 1) {
            ws.sparkAcc -= 1;
            ws.toWorld(0, -ws.Rw + 0.02, Math.random() < 0.5 ? 0.75 : -0.75, Q);
            land.sparks(Q, ws.v, 0);   // grunt: główka szyny (y = 0)
          }
        }
      }
      land.step(dt);
    },
    get counts() { return land.counts; },
    clear() { land.clear(); smokeAcc = 0; },
    dispose() { land.dispose(); },
  };
}
