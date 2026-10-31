// Przekroje toru: szyna (zgodna z modelem kontaktu koło–szyna z aTrain: główka
// R = 300 mm, szyjka, stopka) i podsypka. u — w bok od osi szyny, v — w górę od
// główki szyny [m]. Z aTrain (js/app.js).

export function railProfile() {
  const half = [], out = [];
  half.push([0.075, -0.172], [0.075, -0.155], [0.01, -0.146], [0.008, -0.04], [0.036, -0.034]);
  for (let k = 0; k <= 6; k++) { const th = k / 6 * Math.PI / 2; const u = 0.024 + 0.012 * Math.cos(th), vc = -0.012 + 0.012 * Math.sin(th); half.push([u, vc - u * u / 0.6]); }
  for (let k = 1; k <= 4; k++) { const u = 0.024 - k * 0.012; half.push([u, -u * u / 0.6]); }
  out.push(...half);
  for (let k = half.length - 1; k >= 0; k--) { const [u, v] = half[k]; if (u > 0) out.push([-u, v]); }
  return out;
}

// podsypka (u od osi toru)
export const BALLAST = [[2.1, -0.45], [1.45, -0.26], [-1.45, -0.26], [-2.1, -0.45]];
