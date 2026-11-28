// Podajnik z przenośnikiem taśmowym (środowisko ląd): magazyn pionowy (stos skrzynek spada grawitacyjnie na stół),
// popychacz na tłoczysku wypycha dolną skrzynkę na taśmę, taśma niesie ją tarciem (poślizg, gdy prędkości się różnią),
// na końcu skrzynka spada do pojemnika i wraca na górę magazynu. Ruch wzdłuż linii (x) i w pionie (y), styki jednostronne.
//   const cv = createConveyor({ xFeed, beltX0, beltX1, s, m, n })
//   cv.step(dt, { xPusher, pusherH, vPusher, vBelt }) → { mPush, Fpush }   (masa i opór pchanych skrzynek — do siłownika)
//   cv.boxes: [{ x, y, v, vy, st: 'chute' | 'line' | 'fall' | 'bin' }]
import { G } from './fluid.js';
export const ENV = ['land'];

export function createConveyor({ xFeed = 0, beltX0 = 0.1, beltX1 = 0.8, s = 0.06, m = 0.4, n = 4, muTable = 0.3, muBelt = 0.6, binY = -0.12, binX = 0.08 } = {}) {
  const boxes = []; for (let i = 0; i < n; i++) boxes.push({ x: xFeed, y: i * s, v: 0, vy: 0, st: 'chute', t: 0 });
  const st = { delivered: 0, slip: 0, onBelt: 0, Fbelt: 0 };
  function step(dt, { xPusher = -1, pusherH = s * 0.8, vPusher = 0, vBelt = 0 } = {}) {
    let mPush = 0, Fpush = 0; st.onBelt = 0; st.Fbelt = 0;
    const line = boxes.filter((b) => b.st === 'line').sort((a, b) => a.x - b.x);
    // popychacz: styk z tyłem pierwszej skrzynki w jego zasięgu (łańcuch stykających się skrzynek pchany razem)
    let front = xPusher;
    for (const b of line) {
      if (b.x - s / 2 < front - 1e-6 && b.x + s / 2 > xPusher - 0.02) {
        b.x = front + s / 2; b.v = Math.max(b.v, vPusher); front = b.x + s / 2;
        mPush += m; const onB = b.x > beltX0; Fpush += onB ? muBelt * m * G * Math.sign(b.v - vBelt) : muTable * m * G * Math.sign(b.v || 1);
      }
    }
    // swobodny ruch po stole (tarcie hamuje) i po taśmie (tarcie ciągnie do prędkości taśmy)
    for (const b of line) {
      const onB = b.x > beltX0, target = onB ? vBelt : 0, a = (onB ? muBelt : muTable) * G, dv = target - b.v;
      if (onB) { st.onBelt++; st.Fbelt += Math.abs(dv) > a * dt ? muBelt * m * G : 0; }
      b.v += Math.abs(dv) <= a * dt ? dv : Math.sign(dv) * a * dt;
      b.x += b.v * dt;
      if (b.x > beltX1) { b.st = 'fall'; b.vy = 0; }                       // środek ciężkości za bębnem — skrzynka spada
    }
    // skrzynki na linii nie przenikają się (zderzenie niesprężyste — wspólna prędkość)
    line.sort((a, b) => a.x - b.x);
    for (let i = 1; i < line.length; i++) { const a = line[i - 1], b = line[i]; if (b.st !== 'line' || a.st !== 'line') continue; if (b.x - a.x < s) { const vm = (a.v + b.v) / 2; if (a.v > b.v) { a.v = b.v = vm; } const c = (a.x + b.x) / 2; a.x = c - s / 2; b.x = c + s / 2; } }
    // spadanie do pojemnika, po chwili powrót na górę magazynu
    for (const b of boxes) {
      if (b.st === 'fall') { b.vy -= G * dt; b.y += b.vy * dt; b.x += b.v * dt; b.v *= 0.995; if (b.x > beltX1 + binX) { b.x = beltX1 + binX; b.v = 0; } if (b.y <= binY) { b.y = binY; b.vy = 0; b.v = 0; b.st = 'bin'; b.t = 0; st.delivered++; } }
      else if (b.st === 'bin') { b.t += dt; if (b.t > 1.5) { const top = Math.max(0, ...boxes.filter((o) => o.st === 'chute').map((o) => o.y + s)); b.st = 'chute'; b.x = xFeed; b.y = top + s; b.v = b.vy = 0; } }
    }
    // magazyn: stos opada — dolna skrzynka na stół, na skrzynkę w gnieździe albo na wierzch popychacza
    const chute = boxes.filter((b) => b.st === 'chute').sort((a, b) => a.y - b.y);
    const slotBox = boxes.some((b) => b.st === 'line' && Math.abs(b.x - xFeed) < s * 0.98), pusherIn = xPusher > xFeed - s / 2 + 0.002;
    let floor = slotBox ? s : pusherIn ? pusherH : 0;
    for (const b of chute) {
      b.vy -= G * dt; b.y += b.vy * dt;
      if (b.y <= floor) { b.y = floor; b.vy = 0; if (floor === 0) { b.st = 'line'; b.v = 0; b.x = xFeed; } }
      floor = b.y + s;
    }
    return { mPush, Fpush };
  }
  return { boxes, state: st, step, s };
}
