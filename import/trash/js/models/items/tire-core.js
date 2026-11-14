// Wspólny generator opon (samochód, rower, traktor): korpus z grubością (bryła obrotowa z przekroju opony zdjętej
// z felgi — w środku widać pustą komorę między stopkami) i bieżnik z osobnych klocków lub łap na koronie.
// Oś opony = lokalna oś Y. Wymiary w metrach. LOD 0 — pełne szczegóły, LOD 1 — daleko (bez klocków, mniej segmentów).
import * as THREE from '../../../vendor/three/three.module.js';
import { lathe, smooth2, loft, merge, part, V } from '../geom.js';
import { mat, defineMat } from '../materials.js';

/**
 * spec: {
 *   id, rim (promień osadzenia stopki), outer (promień zewnętrzny z bieżnikiem), width (szerokość przekroju),
 *   tread (szerokość bieżnika), depth (wysokość klocka), bead (rozstaw stopek), wall, crown (grubość ścian),
 *   shoulder (0…1 — jak okrągły bark), bulge (0…1 — jak wybrzuszony bok), segs, sideMat, treadMat, text: [napisy na boku],
 *   pattern(add, ctx) — dokłada klocki: add.block(θ0, θ1, y0, y1, { slant, chamfer }) / add.lug(punkty [[θ, y]...], szer., wys.)
 * }
 */
export function buildTire(spec, lod = 0) {
  const { rim: Rb, outer: R, width: W, tread: Wt, depth, bead: Wb } = spec;
  const Rg = R - depth;                     // korona korpusu = dno rowków
  const H = Rg - Rb;
  const sh = spec.shoulder ?? 0.3, bu = spec.bulge ?? 0.55;
  // przekrój — połowa zewnętrzna od środka korony do stopki: [y, r]
  const half = [
    [0, Rg],
    [Wt * 0.25, Rg - 0.0008 * H / 0.1],
    [Wt * 0.5, Rg - 0.004 * H / 0.1],
    [Wt * 0.5 + (W - Wt) * 0.5 * (0.35 + 0.35 * sh), Rg - H * (0.08 + 0.12 * sh)],
    [W * 0.5 - 0.004 * H / 0.1, Rg - H * 0.3],
    [W * 0.5, Rb + H * bu],
    [W * 0.5 - (W - Wb) * 0.18, Rb + H * 0.22],
    [Wb * 0.5 + (W - Wb) * 0.06, Rb + H * 0.07],
    [Wb * 0.5, Rb],
  ];
  const n = lod ? 2 : 3;
  const hs = smooth2(half, n);                 // od korony do stopki
  // pełny obrys zewnętrzny: lewa stopka → korona → prawa stopka (w układzie [r, y])
  const outer = hs.slice().reverse().map(([y, r]) => [r, -y]).concat(hs.slice(1).map(([y, r]) => [r, y]));
  // obrys wewnętrzny: przesunięcie do środka komory o grubość (korona grubsza, stopka najgrubsza)
  const cx = (Rb + Rg) * 0.5 + H * 0.05;
  const thick = (r) => {
    const t = THREE.MathUtils.smoothstep(r, Rb + H * 0.6, Rg);
    const b = 1 - THREE.MathUtils.smoothstep(r, Rb, Rb + H * 0.12);
    return spec.wall + (spec.crown - spec.wall) * t + spec.wall * 0.9 * b;
  };
  const inner = outer.map(([r, y], i) => {
    const a = outer[Math.max(0, i - 1)], b = outer[Math.min(outer.length - 1, i + 1)];
    let nr = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nr, ny) || 1; nr /= l; ny /= l;
    if (nr * (cx - r) + ny * (0 - y) < 0) { nr = -nr; ny = -ny; }   // do środka komory
    const t = thick(r);
    return [r + nr * t, y + ny * t];
  });
  // stopka: zaokrąglony czubek (toe) — wewnętrzny koniec stopki przy feldze
  const loop = outer.concat(inner.slice().reverse());
  const segs = lod ? Math.max(24, (spec.segs / 4) | 0) : spec.segs;
  const carcass = lathe(loop, segs, { closed: true });
  // miejsce napisów na boku (v profilu): zewnętrzne punkty z r w paśmie napisów
  const arc = carcass.userData.arc, bands = [];
  const r0 = Rb + H * 0.18, r1 = Rb + H * 0.62;
  for (const side of [-1, 1]) {
    let lo = 1, hi = 0;
    outer.forEach(([r, y], i) => { if (Math.sign(y) === side && r >= r0 && r <= r1) { lo = Math.min(lo, arc[i]); hi = Math.max(hi, arc[i]); } });
    bands.push([lo, hi, side]);
  }
  const sideId = defineMat('tireSide-' + spec.id, { color: spec.sideColor || '#1c1c1e', roughness: 0.86, metalness: 0, tex: 'tireSide', bands, text: spec.text || [], circ: 2 * Math.PI * (r0 + r1) / 2, arcLen: carcass.userData.arcLen });
  const g = new THREE.Group(); g.name = spec.id;
  g.add(part('korpus', carcass, mat(sideId)));
  if (lod) {
    // daleko: bieżnik jako gładka korona o pełnym promieniu
    const crownRing = lathe(smooth2([[Rg - spec.crown * 0.6, -Wt / 2], [R - depth * 0.5, -Wt / 2], [R, -Wt * 0.25], [R, Wt * 0.25], [R - depth * 0.5, Wt / 2], [Rg - spec.crown * 0.6, Wt / 2]], 2), segs);
    g.add(part('bieżnik', crownRing, mat(spec.treadMat || 'rubberTread')));
    return g;
  }
  // bieżnik: klocki
  const topR = (y) => R - (spec.crownDrop ?? depth * 0.5) * Math.pow(Math.min(1, Math.abs(y) / (Wt / 2)), 2);
  const baseR = (y) => {   // korpus pod klockiem (z zagłębieniem, żeby klocek siedział w korpusie)
    const ay = Math.abs(y);
    if (ay <= Wt / 2) return Rg - 0.004 * H / 0.1 * Math.pow(ay / (Wt / 2), 2) - 0.0015;
    // bark: interpolacja z przekroju
    for (let i = 1; i < hs.length; i++) if (hs[i][0] >= ay) { const [y0, r0_] = hs[i - 1], [y1, r1_] = hs[i]; return r0_ + (r1_ - r0_) * (ay - y0) / (y1 - y0) - 0.0015; }
    return Rb;
  };
  const P = (th, y, r) => V(r * Math.sin(th), y, r * Math.cos(th));
  const blocks = [];
  const add = {
    /** klocek: zakres kąta θ0…θ1 (na środku), zakres y0…y1, slant — przesunięcie łuku na metr szerokości */
    block(th0, th1, y0, y1, { slant = 0, chamfer = 0.0012, steps = 2 } = {}) {
      const ys = [], ny = 4;
      for (let k = 0; k <= ny; k++) ys.push(y0 + (y1 - y0) * k / ny);
      const rings = [];
      for (let s = 0; s <= steps; s++) {
        const f = s / steps;
        const ring = [];
        // przekrój w płaszczyźnie (y, r) przy danym kącie; skos: kąt przesunięty proporcjonalnie do y
        const thAt = (y) => th0 + (th1 - th0) * f + slant * (y - y0) / R;
        const c = (s === 0 || s === steps) ? 0 : 0;
        ring.push(P(thAt(y0), y0, baseR(y0)));
        ring.push(P(thAt(y1), y1, baseR(y1)));
        ring.push(P(thAt(y1), y1, topR(y1) - chamfer));
        for (let k = ny - 1; k >= 1; k--) { const y = ys[k]; ring.push(P(thAt(y), y, topR(y) + c)); }
        ring.push(P(thAt(y0), y0, topR(y0) - chamfer));
        rings.push(ring);
      }
      blocks.push(loft(rings));
    },
    /** łapa (opony rolnicze): linia środkowa [[θ, y], ...], szerokość (m, w łuku), wysokość nad korpusem */
    lug(path, w, h) {
      const rings = [];
      for (let i = 0; i < path.length; i++) {
        const [th, y] = path[i];
        const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
        // kierunek w metrach na powierzchni: (łuk, y)
        let ds = (b[0] - a[0]) * R, dy = b[1] - a[1]; const l = Math.hypot(ds, dy) || 1; ds /= l; dy /= l;
        const ox = -dy * w / 2, oy = ds * w / 2;   // prostopadle, w łuku i y
        const L = [th + ox / R, y + oy], Rr = [th - ox / R, y - oy];
        const rb = (yy) => baseR(yy) - 0.004, rt = (yy) => baseR(yy) + 0.0015 + h;
        const tp = 0.18;   // zwężenie łapy ku górze (trapez)
        const Lt = [th + ox * (1 - tp) / R, y + oy * (1 - tp)], Rt = [th - ox * (1 - tp) / R, y - oy * (1 - tp)];
        rings.push([P(L[0], L[1], rb(L[1])), P(Rr[0], Rr[1], rb(Rr[1])), P(Rt[0], Rt[1], rt(Rt[1])), P(Lt[0], Lt[1], rt(Lt[1]))]);
      }
      blocks.push(loft(rings));
    },
  };
  spec.pattern(add, { R, Rg, Rb, W, Wt, depth, topR, baseR });
  g.add(part('bieżnik', merge(blocks), mat(spec.treadMat || 'rubberTread')));
  return g;
}

/** Zderzacz opony: pierścień z płaskimi bokami (pączek bez bieżnika) — wypukłe wycinki pierścienia. */
export function ringCollider(rIn, rOut, h, segs = 12) {
  return { type: 'ring', rIn, rOut, h, segs };
}
