// Streets Lab — building a sample from StreetKit (js/models/streets/streetkit.js; from Tornado.io's streets lab): the
// route (street, crossing, viaduct, tunnel, underpass), then the traffic lights, lamps and signs, bollards, railings and
// noise walls, mileposts, a subway, a footbridge and parking spaces, as the sample and the windows ask.
//   buildSample({ S, sc, P, holder, ground, parkType }) → { r, lights: [{ tl, phase }], lamps }
//   S — the lab's settings, sc — the sample (scenes.js), P — the cross-section from the Section window, ground — ground.js
import { buildStreet, buildCrossing, buildTrafficLight, SIGNAL_TIMES, buildLamp, LAMPS, buildSign, SIGNS, alongStreet, buildViaduct, VIADUCT_PROFILE, buildBollards, buildRail, buildNoiseWall, buildMilepost, buildMileposts, buildParking, buildTunnel, TUNNEL_PROFILE, TUNNEL_BOX_PROFILE, buildFootbridge, buildTrough, buildSubway } from '../../models/streets/streetkit.js';
import { hill, hillTerrain } from './ground.js';

const ALL = [[1, 0], [0, 1], [-1, 0], [0, -1]];

export function buildSample({ S, sc, P, holder, ground, parkType }) {
  let r;
  if (sc.viaduct) {
    // the deck: the viaduct's cross-section with the lane width and surface from the sliders; a slip road — one wide lane
    const V = { ...VIADUCT_PROFILE, laneW: sc.lanes === 1 ? Math.max(4.5, S.laneW) : S.laneW, lanes: sc.lanes, road: S.road, marks: S.marks ? (sc.lanes === 1 ? { edge: true } : VIADUCT_PROFILE.marks) : null };
    const underHalf = sc.under ? P.lanes * P.laneW / 2 + P.strips.reduce((a, x) => a + x.w, 0) + 1 : 0;
    r = buildViaduct(sc.viaduct, V, { avoid: sc.under ? (x) => Math.abs(x) < underHalf : null, rail: !S.noise });
    // noise walls on top of the deck's barriers (no plinth; the rail is taken off then)
    if (S.noise) for (const sd of [1, -1]) holder.add(buildNoiseWall(sc.viaduct, S.noiseType, { offset: sd * r.barrierAt, y: r.barrierTop, height: S.noiseH, plinth: 0 }).group);
    if (sc.under) holder.add(buildStreet(sc.under, P).group);
  } else if (sc.tunnel) {
    // a hill: a ridge across the road; portals where there are ≥ 2 m of ground above the vault; approaches in a cutting
    const box = sc.tunnel === 'box', TP = { ...(box ? TUNNEL_BOX_PROFILE : TUNNEL_PROFILE), road: S.road, marks: S.marks ? (box ? TUNNEL_BOX_PROFILE : TUNNEL_PROFILE).marks : null };
    const probe = buildTunnel([[-1, 0], [1, 0]], TP, { type: sc.tunnel, lights: false }); const top = probe.top, th = probe.half;
    let Px = 0; while (hill(Px, 0) > top + 2) Px += 0.5;
    r = buildStreet([[-140, 0], [140, 0]], TP);
    const tn = buildTunnel([[-Px, 0], [Px, 0]], TP, { type: sc.tunnel, ground: hill }); holder.add(tn.group);
    holder.add(hillTerrain(Px, th + 1.2));
    r.length = 280; r.width = 2 * th;
  } else if (sc.underpass) {
    // the long profile: ground y = 0, ramps (smoothed) down to the depth D, underground |x| < XC; holes in the ground above the ramps
    const TP = { ...TUNNEL_BOX_PROFILE, road: S.road, marks: S.marks ? TUNNEL_BOX_PROFILE.marks : null }, D = 6.6, XC = 35, XR = 115;
    const yAt = (x) => { const a = Math.abs(x); if (a <= XC) return -D; if (a >= XR) return 0; const t = (a - XC) / (XR - XC); return -D * (1 - t * t * (3 - 2 * t)); };
    const line = []; for (let x = -150; x <= 150; x += 5) line.push([x, 0, yAt(x)]);
    r = buildStreet(line, TP);
    holder.add(buildTunnel([[-XC, 0, -D], [XC, 0, -D]], TP, { type: 'box', ground: () => 0 }).group);
    for (const sd of [-1, 1]) { const ramp = []; for (let x = XC; x <= XR + 0.01; x += 5) ramp.push([sd * x, 0, yAt(x)]); if (sd < 0) ramp.reverse(); const tr = buildTrough(ramp, TP); holder.add(tr.group); r.half = tr.half; }
    ground.holes([[XC - 0.9, XR, -r.half, r.half], [-XR, -(XC - 0.9), -r.half, r.half]]);
    r.length = 300;
  } else r = sc.crossing ? buildCrossing(P, { arms: sc.crossing, arm: 32, corner: S.corner }) : buildStreet(sc.line, P);
  if (!sc.underpass && !sc.subway) ground.holes(null);
  holder.add(r.group); holder.position.y = 0.02;

  // traffic lights: at a crossing on each arm, right of the entering traffic (phases A/B in turn)
  const lights = [], lamps = [];
  const half = P.lanes * P.laneW / 2 + (P.median || 0) / 2, walk = P.strips.reduce((a, x) => a + x.w, 0);
  // the parking lane (the first strip of the section) — the pavement and the furniture start beyond it
  const park = P.strips[0] && P.strips[0].k === 'parking' ? P.strips[0].w : 0, ST = park ? P.strips.slice(1) : P.strips, hp = half + park;
  if (sc.crossing) {
    const R0 = half + S.corner;
    for (let i = 0; i < sc.crossing; i++) {
      const [dx, dz] = ALL[i], tl = buildTrafficLight({ arm: P.lanes > 2 ? half : 0 });
      tl.group.position.set(dx * (R0 + 0.8) + dz * (half + 0.9), 0.14, dz * (R0 + 0.8) - dx * (half + 0.9));
      tl.group.rotation.y = Math.atan2(dx, dz);
      holder.add(tl.group); lights.push({ tl, phase: i % 2 ? SIGNAL_TIMES.half : 0 });
    }
  }
  // lamps and signs
  const edge = hp + (ST[0] && ST[0].k === 'curb' ? ST[0].w : 0) + 0.6, onWalk = ST[0] ? Math.max(0, ST[0].h) : 0;
  const putLamp = (type, x, z, rot) => { const L = buildLamp(type); L.group.position.set(x, onWalk, z); L.group.rotation.y = rot; holder.add(L.group); lamps.push(L); };
  const putSign = (id, x, z, rot, tab = null) => { const sg = buildSign(id, { tab }); sg.group.position.set(x, onWalk, z); sg.group.rotation.y = rot; holder.add(sg.group); };
  if (sc.furniture) {
    Object.keys(LAMPS).forEach((t, i) => { const x = -30 + i * 20; putLamp(t, x, edge, Math.PI); putLamp(t, x + 10, -edge, 0); });
    Object.keys(SIGNS).forEach((id, i) => putSign(id, -33 + i * 5.2, edge + 1.8, 0));
  } else if (S.lamps && !sc.barriers) {
    if (sc.line) for (const sd of [1, -1]) for (const q of alongStreet(sc.line, S.lampEvery, sd * edge, sd > 0 ? S.lampEvery / 2 : S.lampEvery)) putLamp(S.lampType, q.x, q.z, q.rot);
    if (sc.under) for (const sd of [1, -1]) for (const q of alongStreet(sc.under, S.lampEvery, sd * edge, sd > 0 ? S.lampEvery / 2 : S.lampEvery)) if (Math.abs(q.z) > 14) putLamp(S.lampType, q.x, q.z, q.rot);
    if (sc.crossing) {
      const R0 = half + S.corner;
      for (let i = 0; i < sc.crossing; i++) { const [dx, dz] = ALL[i]; for (const q of alongStreet([[dx * R0, dz * R0], [dx * (R0 + 32), dz * (R0 + 32)]], S.lampEvery, edge, 8)) putLamp(S.lampType, q.x, q.z, q.rot); }
    }
  }
  // bollards, railings, noise walls: by the kerb (or the shoulder) and beyond the last strip of the section
  const s0 = ST[0], kerb = hp + (s0 && (s0.k === 'curb' || s0.k === 'shoulder') ? s0.w : 0), walkY = s0 ? Math.max(0, s0.h) : 0, outer = half + walk + 0.6;
  const seg = (x0, x1) => [[x0, 0], [x1, 0]];
  if (sc.barriers) {
    [['steel', -45, -35], ['warsaw', -33, -23], ['chain', -21, -11], ['concrete', -9, -1]].forEach(([t, a, b]) => holder.add(buildBollards(seg(a, b), t, { offset: kerb + 0.45, y: walkY }).group));
    holder.add(buildBollards(seg(33, 45), 'delineator', { offset: kerb + 0.3, y: walkY, every: 3 }).group);
    [['u12a', 1, 15], ['city', 17, 31]].forEach(([t, a, b]) => holder.add(buildRail(seg(a, b), t, { offset: kerb + 0.3, y: walkY }).group));
    holder.add(buildRail(seg(-45, -5), 'guardrail', { offset: -(kerb + 0.35), y: walkY }).group);
    // mileposts: hectometre posts 1–9 and a kilometre post (samples in a row)
    for (let i = 0; i < 10; i++) { const m = buildMilepost(12, (i + 1) % 10); m.group.position.set(-2 + i * 4.6, walkY, -(kerb + 0.5)); holder.add(m.group); }
    [['metal', -45, -16], ['glass', -14, 14], ['mixed', 16, 45]].forEach(([t, a, b]) => holder.add(buildNoiseWall(seg(a, b), t, { offset: -outer, height: S.noiseH }).group));
  } else if (sc.line) {
    for (const sd of [1, -1]) {
      if (S.rails) holder.add(buildRail(sc.line, S.railType, { offset: sd * (kerb + 0.3), y: walkY }).group);
      if (S.bollards) holder.add(buildBollards(sc.line, S.bollardType, { offset: sd * (kerb + (S.rails ? 0.75 : 0.45)), y: walkY }).group);
      if (S.noise) holder.add(buildNoiseWall(sc.line, S.noiseType, { offset: sd * outer, height: S.noiseH }).group);
      if (S.mileposts) holder.add(buildMileposts(sc.line, { offset: sd * (kerb + (S.rails ? 1.1 : 0.6)), y: walkY, start: 12 * 1000 + 950, every: 100 }).group);
    }
  }
  // a pedestrian subway under the street (stairwells beyond the pavement, holes in the ground)
  if (sc.subway) { const sw = buildSubway({ span: 2 * (half + walk) + 1 }); holder.add(sw.group); ground.holes(sw.holes); }
  // a footbridge over the street (the middle above the axis, the stairs beyond the pavement)
  if (sc.footbridge) holder.add(buildFootbridge({ span: 2 * (half + walk) + 1, lift: sc.footbridge === 'lift', stairs: sc.footbridge === 'switchback' ? 'switchback' : 'straight' }).group);
  // parking spaces: the parking lane's markings; a D-18 sign with T-29 at the spaces for disabled people
  if (park && sc.line) {
    for (const sd of [1, -1]) {
      const pk = buildParking(sc.line, parkType(), { inner: half, side: sd, disabled: S.parkDisabled ? (parkType() === 'parallel' ? 1 : 2) : 0 });
      holder.add(pk.group);
      const first = pk.stalls.filter((x) => x.disabled);
      if (first.length) for (const q of alongStreet(sc.line, 1000, sd * (kerb + 0.4), first[0].s)) putSign('D-18', q.x, q.z, q.rot, 'T-29');
    }
  }
  if (S.signs && sc.crossing) {
    // at the crossings D-6 (right of the entering traffic); on a T-junction's side arm A-7 give way
    const R0 = half + S.corner;
    for (let i = 0; i < sc.crossing; i++) {
      const [dx, dz] = ALL[i], d = R0 + 6.5, o = half + 1.4;
      putSign(sc.crossing === 3 && i === 1 ? 'A-7' : 'D-6', dx * d + dz * o, dz * d - dx * o, Math.atan2(dx, dz));
    }
  }
  if (sc.signals) {
    // right-hand traffic: those going −x have their right on −z, those going +x on +z; the signal faces the coming traffic
    const a = buildTrafficLight(); a.group.position.set(-4, 0.14, -(half + 0.9)); a.group.rotation.y = Math.PI / 2; holder.add(a.group); lights.push({ tl: a, phase: 0 });
    const b = buildTrafficLight({ arm: half + 0.6 }); b.group.position.set(4, 0.14, half + 0.9); b.group.rotation.y = -Math.PI / 2; holder.add(b.group); lights.push({ tl: b, phase: 0 });
  }
  return { r, lights, lamps };
}
