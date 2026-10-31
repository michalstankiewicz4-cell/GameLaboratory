// Tabor — ostoja wagonu (wspólna dla wagonów). Z aTrain (js/stock.js).
// ---- ostoja wagonu (wspólna): podłużnice, czołownice, podłoga, ściągi, klocki, stopnie ----
const THREE = window.THREE;

export function wagonFrame(S, veh, g, y, i) {
  const { mat, SM, TX, part, put, BX, CX, CY, CZ, tube, strip, handrail, decal, steps, brakeHose, brakeShoe, fitUV, roundedBox, TK } = S;
  const d = veh.def, Lb = d.Lb, H = Lb / 2, fr = part(g, 'ostoja'), under = part(g, 'podwozie');
  for (const sz of [1, -1]) BX(fr, SM.iron, Lb - 0.36, 0.3, 0.14, 0, y(1.12), sz * 1.05, 0.012, 3);
  for (const sx of [1, -1]) BX(fr, SM.iron, 0.18, 0.44, 2.92, sx * (H - 0.09), y(1.08), 0, 0.02, 0.8);
  BX(fr, SM.floor, Lb - 0.36, 0.08, 2.84, 0, y(1.31), 0, 0, 1.4);
  for (const sz of [0.96, -0.96]) {                                               // ściągi z kozłami (końce w podłużnicach)
    tube(under, SM.iron, [[H - 0.9, y(1.0), sz], [1.0, y(0.6), sz], [-1.0, y(0.6), sz], [-H + 0.9, y(1.0), sz]], 0.022, 6);
    for (const sx of [1, -1]) CY(under, SM.iron, 0.025, 0.4, sx * 1.0, y(0.8), sz, 8);
  }
  for (const ws of veh.ws) {
    const xw = ws.p[0] - veh.body.p[0], Rw = ws.Rw;
    for (const sz of [1, -1]) for (const side of [1, -1]) brakeShoe(under, xw, side, Rw, y(Rw), sz * 0.75, y(1.27));
  }
  for (const sx of [1, -1]) { brakeHose(fr, sx * H, sx, y(0.98), 0.42); for (const sz of [1, -1]) steps(fr, sx * (H - 0.45), y(1.27), sz * 1.2, sz); }
}
