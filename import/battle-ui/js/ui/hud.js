// In-game HUD: wave/score line, kill feed, banners, torpedo warning, ship panel (HP, telegraph, rudder),
// weapon panel (turret reloads, torpedoes, repair), crosshair, ship labels, damage popups and a minimap.
import * as THREE from '../../vendor/three.module.js';
import { h } from './dom.js';
import { t } from '../i18n/index.js';
import { THROTTLE, KNOTS, EDGE, U } from '../world/constants.js';

const V = new THREE.Vector3();

export function createHud(root) {
  const top = h('div', { id: 'top' });
  const feed = h('div', { id: 'feed' });
  const banner = h('div', { id: 'banner', hidden: true });
  const warn = h('div', { id: 'warn', hidden: true });
  const hpFill = h('i'), hpText = h('span', { class: 'hpt' });
  const shipName = h('div', { class: 'sname' });
  const tele = h('div', { class: 'tele' }, THROTTLE.map(() => h('i'))).valueOf();
  const speed = h('div', { class: 'spd' });
  const rudderMk = h('i');
  const rudder = h('div', { class: 'rudder' }, rudderMk);
  const panel = h('div', { id: 'ship' }, shipName, h('div', { class: 'hpbar' }, hpFill, hpText), h('div', { class: 'nav' }, tele, speed, rudder));
  const guns = h('div', { class: 'wslot' });
  const torps = h('div', { class: 'wslot' });
  const rep = h('div', { class: 'wslot' });
  const depth = h('div', { class: 'wslot', hidden: true });
  const weapons = h('div', { id: 'weap' }, guns, torps, rep, depth);
  // optics overlay: periscope (one round view) or binoculars (two overlapping round views), hairlines, bearing
  const bearing = h('div', { class: 'brg' });
  const scope = h('div', { id: 'scope', hidden: true }, h('div', { class: 'mask' }), h('div', { class: 'ring' }), h('div', { class: 'hair h' }), h('div', { class: 'hair v' }), bearing);
  const cross = h('div', { id: 'cross', hidden: true }, h('b'), h('span'));
  const labels = h('div', { id: 'labels' });
  const pops = h('div', { id: 'pops' });
  const mini = h('canvas', { id: 'mini', width: 180, height: 180 });
  const fps = h('div', { id: 'fps', hidden: true });
  const hint = h('div', { id: 'hint' });
  const gunInfo = h('div', { id: 'gunInfo', hidden: true });
  // salvo camera: the picture is rendered into the main canvas, then copied here so it sits above HUD overlays
  const pipCanvas = h('canvas', { width: 320, height: 180 });
  const pipBox = h('div', { id: 'pip', hidden: true }, pipCanvas, h('span', {}, ''));
  const game = h('div', { id: 'hud', hidden: true }, labels, pops, top, feed, banner, warn, panel, weapons, cross, mini, hint, gunInfo, pipBox);
  game.prepend(scope);
  root.append(game, fps);

  let optic = null;
  // Is a screen point inside the visible part of the optics (one circle, or one of the two binocular circles)?
  const inOptic = (x, y) => {
    const m = Math.min(innerWidth, innerHeight) / 100, cx = innerWidth / 2, cy = innerHeight / 2;
    if (optic === 'scope') return Math.hypot(x - cx, y - cy) < 41 * m;
    return Math.hypot(x - (cx - 17 * m), y - cy) < 38 * m || Math.hypot(x - (cx + 17 * m), y - cy) < 38 * m;
  };
  const lab = new Map();           // ship id -> element
  let bannerT = 0, feedItems = [];

  function showBanner(text, sub, time = 2.6) {
    banner.replaceChildren(h('b', {}, text), sub ? h('span', {}, sub) : null);
    banner.hidden = false; bannerT = time;
  }
  function addFeed(text, cls) {
    const el = h('div', { class: cls || '' }, text);
    feed.prepend(el); feedItems.push({ el, t: 6 });
    while (feed.children.length > 6) feed.lastChild.remove();
  }

  function slotBar(el, label, key, frac, state, extra) {
    el.className = 'wslot ' + state;
    const fill = h('i');
    fill.style.width = `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;      // CSSOM, allowed under style-src 'self'
    el.replaceChildren(h('em', {}, key), h('b', {}, label), h('div', { class: 'bar' }, fill), extra ? h('span', {}, extra) : null);
  }

  // Projects world (x,y,z) to CSS pixels; returns null when behind the camera.
  function project(cam, x, y, z) {
    V.set(x, y, z).project(cam);
    if (V.z > 1) return null;
    return { x: (V.x + 1) / 2 * innerWidth, y: (1 - V.y) / 2 * innerHeight };
  }

  return {
    show(on) { game.hidden = !on; if (!on) { lab.forEach((e) => e.remove()); lab.clear(); pops.replaceChildren(); } },
    showFps(on) { fps.hidden = !on; },
    // Gun camera: reticle style and the info line under it (zoom, how to take mouse control).
    setGunView(on) { cross.classList.toggle('gun', on); gunInfo.hidden = !on; if (!on) this.setOptic(null); },
    // kind: 'scope' | 'bino' | null
    setOptic(kind) {
      if (optic === kind) return;
      optic = kind; scope.hidden = !kind;
      scope.classList.toggle('bino', kind === 'bino');
    },
    // Salvo camera frame (the picture itself is drawn into the canvas); the kill feed moves below it.
    setPip(on) { if (pipBox.hidden === on) { pipBox.hidden = !on; feed.classList.toggle('low', on); pipBox.lastChild.textContent = t('hud.pip'); } },
    // Copies the salvo camera picture (x, y from the top-left of the main canvas, w × h) into the frame.
    copyPip(src, x, y, w, h) {
      if (pipCanvas.width !== w) { pipCanvas.width = w; pipCanvas.height = h; }
      pipCanvas.getContext('2d').drawImage(src, x, y, w, h, 0, 0, w, h);
    },
    setBearing(deg) { bearing.textContent = String(Math.round(((deg % 360) + 360) % 360)).padStart(3, '0') + '°'; },
    setFps(s) { fps.textContent = s; },
    banner: showBanner,
    feed: addFeed,

    // Slow-rate text update (about 10×/s).
    text(world, weapon, keys) {
      const S = world.S, p = world.player, cls = p.cls;
      const mm = Math.floor(S.time / 60), ss = String(Math.floor(S.time % 60)).padStart(2, '0');
      top.replaceChildren(
        h('span', {}, t('hud.wave', { n: S.wave || '-' })),
        h('span', {}, t('hud.enemies', { n: S.enemiesLeft })),
        h('span', {}, t('hud.score', { n: S.score })),
        h('span', {}, `${mm}:${ss}`));
      if (S.breather > 0 && S.wave > 0) top.append(h('span', { class: 'gold' }, t('hud.next', { s: Math.ceil(S.breather) })));
      shipName.textContent = `${t('cls.' + cls.key)} · ${t('hud.you')}`;
      hpFill.style.width = `${Math.max(0, p.hp / p.maxHp) * 100}%`;
      hpFill.className = p.hp / p.maxHp < 0.3 ? 'low' : '';
      hpText.textContent = `${Math.ceil(Math.max(0, p.hp))} / ${p.maxHp}` + (p.fires.length ? '  🔥' + p.fires.length : '');
      [...tele.children].forEach((c, i) => { c.className = i === p.throttle ? 'on' : ''; c.textContent = t('tele.' + i); });
      speed.textContent = `${(p.speed * KNOTS).toFixed(1)} ${t('hud.kn')}`;
      rudderMk.style.left = `${50 - p.rudder * 46}%`;

      const ready = p.turrets.filter((tr) => tr.reload <= 0).length;
      const minR = Math.min(...p.turrets.map((tr) => tr.reload));
      const frac = 1 - minR / cls.guns.reload;
      const wet = p.sub && p.sub.y < -0.6;                  // submarine deck gun is under water
      slotBar(guns, t('w.guns'), '1', wet ? 0 : ready ? 1 : frac, (weapon === 'guns' ? 'sel ' : '') + (ready && !wet ? 'ok' : ''), wet ? t('w.underwater') : ready ? `${ready}/${p.turrets.length}` : `${minR.toFixed(1)}s`);
      if (cls.torps) {
        const r = p.torpReload;
        slotBar(torps, t('w.torps'), '2', 1 - r / cls.torps.reload, (weapon === 'torps' ? 'sel ' : '') + (r <= 0 ? 'ok' : ''), r <= 0 ? `×${cls.torps.n}` : `${r.toFixed(0)}s`);
        torps.hidden = false;
      } else torps.hidden = true;
      const rp = p.repair;
      if (p.sub) {
        const lv = p.sub.level;
        slotBar(depth, t('w.depth.' + lv), keys.depth, p.sub.batt, p.sub.batt > 0.25 ? 'ok' : '', `${t('w.batt')} ${Math.round(p.sub.batt * 100)}%`);
        depth.hidden = false;
      } else depth.hidden = true;
      slotBar(rep, t('w.repair'), keys.repair, rp.active > 0 ? rp.active / 10 : 1 - rp.cd / cls.repair.cd, rp.charges > 0 && rp.cd <= 0 ? 'ok' : '', rp.active > 0 ? t('w.active') : rp.cd > 0 ? `${rp.cd.toFixed(0)}s` : `×${rp.charges}`);

      warn.hidden = !(S.threat > 0);
      if (S.threat > 0) warn.textContent = t('hud.torpWarn', { d: Math.round(S.threat) });
      hint.textContent = t('hud.hint', { repair: keys.repair });
      hint.hidden = S.time > 30;                     // controls reminder only at the start of a run
      if (keys.gun) gunInfo.textContent = t(keys.locked ? (p.sub ? 'hud.scopeOn' : keys.zoom >= 1.5 ? 'hud.binoOn' : 'hud.gunOn') : 'hud.gunClick', { z: keys.zoom.toFixed(1) });
    },

    // Per-frame: banners, feed fade, crosshair, labels, popups, minimap.
    frame(dt, world, cam, aim, weapon, mouse) {
      if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) banner.hidden = true; }
      feedItems = feedItems.filter((f) => { f.t -= dt; if (f.t < 1) f.el.style.opacity = Math.max(0, f.t); if (f.t <= 0) f.el.remove(); return f.t > 0; });
      const p = world.player, S = world.S;

      // crosshair
      cross.hidden = !aim || !p.alive;
      if (aim && p.alive) {
        cross.style.transform = `translate(${mouse.px}px,${mouse.py}px)`;
        const d = Math.hypot(aim.x - p.x, aim.z - p.z);
        const g = p.cls.guns;
        const tt = weapon === 'torps' && p.cls.torps ? d / p.cls.torps.speed : Math.min(d, g.range) / g.speed;
        cross.lastChild.textContent = `${(d / 1000).toFixed(1)} km · ${tt.toFixed(1)}s`;
        cross.classList.toggle('far', d > (weapon === 'torps' && p.cls.torps ? p.cls.torps.range : g.range));
      }

      // ship labels
      const seen = new Set();
      for (const s of world.ships) {
        if (s === p || !s.alive) continue;
        seen.add(s.id);
        let el = lab.get(s.id);
        if (!el) {
          el = h('div', { class: 'lab ' + s.side }, h('span'), h('div', { class: 'bar' }, h('i')));
          labels.append(el); lab.set(s.id, el);
        }
        const q = project(cam, s.x, s.cls.H + 4 * U + s.cls.L * 0.15, s.z);
        if (!q) { el.hidden = true; continue; }
        // periscope: only labels inside the round view
        if (optic && !inOptic(q.x, q.y)) { el.hidden = true; continue; }   // only labels inside the optics' view
        el.hidden = false;
        el.style.transform = `translate(${q.x}px,${q.y}px)`;
        el.firstChild.textContent = `${t('cls.short.' + s.cls.key)} ${s.name}`;
        el.lastChild.firstChild.style.width = `${s.hp / s.maxHp * 100}%`;
        el.classList.toggle('hit', s.hitFlash > 0);
      }
      for (const [id, el] of lab) if (!seen.has(id)) { el.remove(); lab.delete(id); }

      // damage popups
      while (S.popups.length) {
        const pp = S.popups.shift();
        const txt = pp.kind === 'cit' ? t('pop.cit', { d: pp.dmg }) : pp.kind === 'torp' ? t('pop.torp', { d: pp.dmg }) : pp.kind === 'fire' ? t('pop.fire', { d: pp.dmg }) : pp.kind === 'charge' ? t('pop.charge', { d: pp.dmg }) : `-${pp.dmg}`;
        const el = h('div', { class: 'pop ' + (pp.mine ? 'mine ' : 'onme ') + pp.kind }, txt);
        pops.append(el);
        el._w = { x: pp.x, z: pp.z, t: 0 };
      }
      for (const el of [...pops.children]) {
        const w = el._w; w.t += dt;
        const q = project(cam, w.x, 6 * U, w.z);
        if (w.t > 1.6 || !q) { el.remove(); continue; }
        el.style.transform = `translate(${q.x}px,${q.y - w.t * 40}px)`;
        el.style.opacity = String(Math.min(1, 2 * (1.6 - w.t)));
      }

      // minimap
      const c = mini.getContext('2d'), W = mini.width, k = W / (EDGE * 2.2), o = W / 2;
      c.fillStyle = '#0d2c40'; c.fillRect(0, 0, W, W);
      c.strokeStyle = '#2f5a70'; c.strokeRect(o - EDGE * k, o - EDGE * k, EDGE * 2 * k, EDGE * 2 * k);
      c.fillStyle = '#6f8a5a';
      for (const l of world.islands.lumps) { c.beginPath(); c.ellipse(o + l.x * k, o + l.z * k, l.rx * k * 0.95, l.rz * k * 0.95, 0, 0, 7); c.fill(); }
      c.strokeStyle = 'rgba(220,240,240,.35)';
      c.beginPath(); c.arc(o + p.x * k, o + p.z * k, p.cls.guns.range * k, 0, 7); c.stroke();
      for (const tp of world.combat.torps) { c.fillStyle = tp.owner.side === 'player' ? '#cfe' : '#f88'; c.fillRect(o + tp.x * k - 1, o + tp.z * k - 1, 2, 2); }
      for (const s of world.ships) {
        if (!s.alive && s !== p) continue;
        const x = o + s.x * k, y = o + s.z * k;
        c.save(); c.translate(x, y); c.rotate(-s.th);
        c.fillStyle = s === p ? '#f2f2e0' : '#ff5a4a';
        c.beginPath(); c.moveTo(0, 5); c.lineTo(3, -4); c.lineTo(-3, -4); c.closePath(); c.fill();
        c.restore();
      }
      // camera view direction marker
      c.strokeStyle = 'rgba(255,255,255,.5)';
    },
  };
}
