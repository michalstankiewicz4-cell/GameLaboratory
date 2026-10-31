// Laboratorium pojazdów — rodzina „pociąg”: skład z TrainKit (js/models/train) na sieci torowej
// z aTrain (js/models/structures/railway/network.js), z zachowaniem „koło na szynie” (środowisko ląd,
// js/behaviors/rail): prawdziwa fizyka koło–szyna, rozjazdy, sprzęgi, zderzaki, napęd i hamulec.
// Sterowanie i kamery jak w aTrain (docs/sterowanie.md w jego repozytorium).
import { buildTrain, DEFAULT_TRAIN, BODIES, data } from "../../models/train/trainkit.js";
import { buildNetwork } from "../../models/structures/railway/network.js";
import { trainMaterials } from "../../models/train/materials.js";
import { attachRail, railAnchor, ANCHOR_OFFSET } from "../../behaviors/rail/rail.js";
const THREE = window.THREE;

const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

function start(lab) {
  let train = null, rail = null, net = null, sim = null;
  const panel = el("div", "hidden"), ui = {};
  // ---------- panel: sterowanie z aTrain ----------
  function slider(key, label, min, max, step, value, fmt, onInput, onChange) {
    const l = el("label", "sl"), b = el("b"); l.append(el("span", null, label), b);
    const r = Object.assign(el("input"), { type: "range", min, max, step, value });
    const show = () => { b.textContent = fmt(+r.value); if (window.LabKit) LabKit.paintSlider(r); };
    r.addEventListener("input", () => { show(); onInput && onInput(+r.value); });
    if (onChange) r.addEventListener("change", () => onChange(+r.value));
    show(); ui[key] = r; panel.append(l, r); return r;
  }
  const btn = (key, txt, on) => { const b = el("button", "tBtn", txt); b.addEventListener("click", on); ui[key] = b; return b; };
  const pair = (cls, ...bs) => { const d = el("div", cls); d.append(...bs); panel.append(d); return d; };
  const readout = (key, label) => { const r = el("div", "row"), b = el("b", null, "–"); r.append(el("span", null, label), b); ui[key] = b; panel.append(r); };
  let dir = 1;
  const applyTarget = () => { if (sim) sim.ctrl.target = dir * +ui.target.value / 3.6; };

  panel.append(el("div", "secHd", "DRIVE"));
  slider("target", "Target speed", 0, 80, 1, 0, (v) => (dir < 0 ? "−" : "") + v + " km/h", applyTarget);
  pair("twoBtns",
    btn("dir", "FORWARD", () => { dir = -dir; ui.dir.textContent = dir > 0 ? "FORWARD" : "REVERSE"; ui.dir.classList.toggle("on", dir < 0); ui.target.dispatchEvent(new Event("input")); }),
    btn("restart", "RESTART", () => {
      sim.reset(); ui.target.value = 0; ui.target.dispatchEvent(new Event("input"));
      ui.brake.classList.remove("on"); ui.lock.classList.remove("on");
    }));
  slider("power", "Engine power", 100, 3000, 50, 200, (v) => v + " kW · " + Math.round(v / 4) + " kN", (v) => { if (sim) sim.ctrl.power = v * 1000; });
  const toggle = (key, txt, ctrl) => btn(key, txt, () => { sim.ctrl[ctrl] = !sim.ctrl[ctrl]; ui[key].classList.toggle("on", sim.ctrl[ctrl]); });
  pair("twoBtns", toggle("brake", "BRAKE", "brake"), toggle("lock", "WHEEL LOCK", "lock"));
  readout("rForce", "Tractive force"); readout("rBrake", "Brake cylinder pressure");

  panel.append(el("div", "secHd", "MASSES"));
  [["Locomotive", 10, 18], ["Wagon 1", 5, 12], ["Wagon 2", 5, 12]].forEach(([n, mn, v], i) => slider("m" + i, n, mn, 60, 1, v, (x) => x + " t", (x) => sim && sim.setMass(i, x)));

  panel.append(el("div", "secHd", "TRACK AND COUPLERS"));
  const swLabel = (i) => "SWITCH " + (i + 1) + ": " + (sim && sim.track.switches[i].target ? "STRAIGHT" : "CURVE");
  pair("twoBtns", ...[0, 1].map((i) => btn("sw" + i, "SWITCH " + (i + 1) + ": CURVE", () => {
    const s = sim.track.switches[i]; s.target = s.target ? 0 : 1; ui["sw" + i].textContent = swLabel(i); ui["sw" + i].classList.toggle("on", !!s.target);
  })));
  let cpl2Msg = 0;
  pair("twoBtns",
    btn("cpl1", "COUPLER 1: UNCOUPLE", () => { const k = sim.couplers[0].ka; sim.knuckleLever(!k.lever); }),
    btn("cpl2", "COUPLER 2: UNHOOK", () => { const c = sim.couplers[1]; if (c.hooked) sim.chainHook(false); else if (!sim.chainHook(true)) cpl2Msg = performance.now() + 1800; }));
  slider("gap", "Rail joint gap", 0, 30, 1, 25, (v) => v + " mm", null, (v) => { sim.track.setGap(v / 1000); net.userData.rebuildRails(); });
  const BTB0 = data.BTB, CLR0 = 0.0046;
  slider("clr", "Flange clearance", 0, 15, 0.5, 4.6, (v) => v.toFixed(1) + " mm", (v) => { if (sim) sim.btb = BTB0 + CLR0 - v / 1000; });

  panel.append(el("div", "secHd", "CAMERA"));
  const views = [["", "FREE"], ["loco", "LOCOMOTIVE"], ["side", "LOCO WHEELS"], ["flange", "FLANGE FROM BELOW"], ["c0", "KNUCKLE COUPLER"], ["c1", "CHAIN"], ["sw1", "TURNOUT 1"], ["sw2", "TURNOUT 2"]];
  const camBtns = views.map(([k, t]) => btn("cam" + k, t, () => setFollow(k)));
  for (let i = 0; i < camBtns.length; i += 2) pair("twoBtns", camBtns[i], camBtns[i + 1]);
  camBtns[0].classList.add("on");

  function couplerLabels() {
    const st = sim.knuckleState(), c = sim.couplers[1];
    const t1 = { locked: "COUPLER 1: UNCOUPLE", bound: "COUPLER 1: LOCK JAMMED (UNDER TENSION)", lever: "COUPLER 1: RELEASE THE LEVER", open: "COUPLER 1: OPEN — RUN IN TO COUPLE" }[st];
    if (ui.cpl1.textContent !== t1) ui.cpl1.textContent = t1;
    ui.cpl1.classList.toggle("on", st !== "locked");
    const t2 = c.hooked ? "COUPLER 2: UNHOOK" : c.lifting ? "COUPLER 2: HOOKING…" : performance.now() < cpl2Msg ? "COUPLER 2: HOOK TOO FAR" : "COUPLER 2: HOOK ON";
    if (ui.cpl2.textContent !== t2) ui.cpl2.textContent = t2;
    ui.cpl2.classList.toggle("on", !c.hooked);
  }

  // ---------- kamery śledzące ----------
  const cam = lab.camera, controls = lab.controls;
  const rotY = (v, a) => { const c = Math.cos(a), s = Math.sin(a), x = v.x, z = v.z; v.x = x * c + z * s; v.z = -x * s + z * c; return v; };
  let follow = null; const offLocal = new THREE.Vector3();
  function setFollow(kind) {
    camBtns.forEach((b, i) => b.classList.toggle("on", views[i][0] === kind));
    if (!kind) { follow = null; return; }
    const a = railAnchor(sim, kind);
    controls.target.copy(a.p); cam.position.copy(a.p).add(rotY(new THREE.Vector3().fromArray(ANCHOR_OFFSET[kind]), a.yaw)); controls.update();
    follow = { kind, last: a };
  }

  const role = "Rail: a shunting diesel and two covered wagons — a knuckle coupler, then a chain on a hook — on an oval with two turnouts and a loop. Real wheel–rail physics (from aTrain): nothing holds the train on the track but the contact of the wheels with the rails.";
  lab.addMode({
    name: "Train", tabName: "Train", role, panel,
    target: [-1, 1.6, -50], camera: [-14, 7, -30],
    build() {
      const g = new THREE.Group(); g.name = "pociąg na torze";
      train = buildTrain(DEFAULT_TRAIN); rail = attachRail(train); sim = rail.sim;
      this.rail = rail;   // do testów i narzędzi (sim, sync)
      const flat = new THREE.Mesh(new THREE.PlaneGeometry(1200, 600), trainMaterials().ground);
      flat.rotation.x = -Math.PI / 2; flat.position.set(sim.TRACK.hl + 120, -0.45, 0); flat.receiveShadow = true; g.add(flat);
      net = buildNetwork(sim.track, sim.terrain, sim.TRACK); g.add(net);
      g.add(train);
      applyTarget(); sim.ctrl.power = +ui.power.value * 1000;
      return g;
    },
    rows() {
      const v = train ? train.userData : null;
      const tris = (o) => { let n = 0; o.traverse((m) => { if (m.isMesh && m.geometry) { const gg = m.geometry; n += (gg.index ? gg.index.count : gg.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1); } }); return n; };
      return [["Vehicles", DEFAULT_TRAIN.map((c) => BODIES[c.body].name).join(" · ")],
        ["Length over buffers", v ? v.length.toFixed(2) + " m" : "–"],
        ["Gauge", "1435 mm"], ["Wheels (loco / wagon)", "Ø " + 2 * data.VEH.loco.Rw * 1000 + " / " + 2 * data.VEH.wagon.Rw * 1000 + " mm"],
        ["Couplers", "knuckle · chain on hook"], ["Curve radius", sim ? sim.TRACK.R + " m" : "–"],
        ["Physics step", "1/2400 s"], ["Triangles", v ? Math.round(tris(train)).toLocaleString("en-US") : "–"]];
    },
    update(dt) {
      if (follow) { offLocal.copy(cam.position).sub(controls.target); rotY(offLocal, -follow.last.yaw); }
      rail.update(dt);
      for (let i = 0; i < 2; i++) { const t = swLabel(i); if (ui["sw" + i].textContent !== t) ui["sw" + i].textContent = t; }
      net.userData.update(sim.track.switches);
      couplerLabels();
      const b = sim.vehicles[0].body;
      if (follow) {
        const a = railAnchor(sim, follow.kind); controls.target.copy(a.p);
        cam.position.copy(a.p).add(rotY(offLocal.clone(), a.yaw)); follow.last = a;
      }
      // światło słońca (cień) idzie za lokomotywą
      if (lab.sun) { lab.sun.position.set(b.p[0] + 30, 40, b.p[2] + 20); lab.sun.target.position.set(b.p[0], 0, b.p[2]); lab.sun.target.updateMatrixWorld(); }
      const $ = (id) => document.getElementById(id);
      $("nowSpeed").textContent = sim.broken ? "—" : (sim.st.speed * 3.6).toFixed(1) + " km/h";
      const R = b.R; $("nowTilt").textContent = Math.round(Math.asin(Math.max(-1, Math.min(1, R[3]))) * 57.3) + "° / " + Math.round(Math.asin(Math.max(-1, Math.min(1, R[5]))) * 57.3) + "°";
      ui.rForce.textContent = (sim.st.F / 1000).toFixed(1) + " kN";
      ui.rBrake.textContent = Math.round((sim.ctrl.lock ? 1 : sim.st.brakeP) * 100) + "%";
      $("role").textContent = sim.broken ? "The simulation diverged (infinite values) — press RESTART." : role;
    },
  });
}
if (window.vehicleLab) start(window.vehicleLab); else window.addEventListener("vehiclelab:ready", () => start(window.vehicleLab), { once: true });
