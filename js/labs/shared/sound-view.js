// Obraz dźwięku w laboratoriach efektów i mowy: spektrogram przesuwający się w lewo (niskie na dole, głośniej —
// jaśniej) i fala na wierzchu, z wyjścia miksera (js/audio/mixer.js). soundView(kontener, { hint }) → { hint(tak/nie) }.
import { mixer } from '../../audio/mixer.js';

export function soundView(box, { hint = '', bus = 'master' } = {}) {
  const cv = document.createElement('canvas'); cv.className = 'sndView'; box.append(cv);
  const g = cv.getContext('2d'), tip = document.createElement('div'); tip.className = 'sndHint';
  if (hint) { const [a, b] = hint.split('|'); const s = document.createElement('b'); s.textContent = a; tip.append(s, document.createTextNode(b || '')); box.append(tip); }
  const col = (k) => { const css = getComputedStyle(document.documentElement); return css.getPropertyValue(k).trim(); };
  const ACC = col('--accent') || '#f2b84b', W2 = col('--cat-world') || '#36d6b5', BG = col('--bg') || '#0c0f13';
  let freq = null, wave = null, w = 0, h = 0, quiet = 0;
  const fit = () => { const r = box.getBoundingClientRect(), pr = Math.min(2, devicePixelRatio || 1); w = Math.max(1, r.width); h = Math.max(1, r.height); cv.width = w * pr; cv.height = h * pr; g.setTransform(pr, 0, 0, pr, 0, 0); g.fillStyle = BG; g.fillRect(0, 0, w, h); };
  addEventListener('resize', fit); fit();
  function frame() {
    const mx = mixer();
    if (mx.started) {
      const an = mx.analyser(bus);
      if (!freq) { freq = new Uint8Array(an.frequencyBinCount); wave = new Uint8Array(an.fftSize); }
      an.getByteFrequencyData(freq); an.getByteTimeDomainData(wave);
      // przesunięcie o 2 px i nowa kolumna widma (skala logarytmiczna częstotliwości)
      g.drawImage(cv, -2, 0, w, h);
      const top = h * 0.72, n = 96;
      let e = 0;
      for (let i = 0; i < n; i++) {
        const k = Math.min(freq.length - 1, Math.floor(Math.pow(i / n, 2.2) * freq.length * 0.9)), v = freq[k] / 255; e += v;
        g.fillStyle = v < 0.02 ? BG : `hsla(${215 - v * 190}, 80%, ${12 + v * 55}%, 1)`;
        g.fillRect(w - 2, top - (i + 1) * top / n, 2, top / n + 1);
      }
      quiet = e / n < 0.01 ? quiet + 1 : 0;
      // fala w dolnym pasie
      g.fillStyle = BG; g.fillRect(0, top, w, h - top);
      g.beginPath();
      for (let i = 0; i <= 300; i++) { const v = (wave[Math.floor(i / 300 * (wave.length - 1))] - 128) / 128, x = i / 300 * w, y = top + (h - top) / 2 - v * (h - top) * 0.45; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.strokeStyle = ACC; g.lineWidth = 1.4; g.stroke();
      g.fillStyle = W2; g.fillRect(0, top, w, 1);
    }
    tip.style.opacity = mx.started && quiet < 60 ? 0 : 0.85;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { canvas: cv, resize: fit };
}
