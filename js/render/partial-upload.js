// Częściowe wysyłanie danych na kartę graficzną: gdy zmienia się jedna instancja (macierz odłamka, przedmiotu,
// drzewa) albo kilka wierzchołków (spalona trawa), na GPU idzie tylko ten kawałek, a nie cały bufor co klatkę.
//   touchAttr(attribute, start, count)   BufferAttribute / InstancedBufferAttribute; start, count w liczbach (nie
//                                        w elementach). Gdy zakresów przybywa, zlewa je w jeden ciągły.
//   touchTex(texture, start, count)      DataTexture RGBA (macierze i barwy BatchedMesh); zakres musi leżeć w jednym
//                                        wierszu tekstury. Do pierwszego wysłania i przy zbyt wielu zakresach — całość.
const LIMIT = 256;

export function touchAttr(a, start, count) {
  const R = a.updateRanges;
  if (R.length >= LIMIT) {   // jeden zakres od najmniejszego do największego — dalej wysyła się ciągły kawałek bufora
    let lo = start, hi = start + count;
    for (const r of R) { lo = Math.min(lo, r.start); hi = Math.max(hi, r.start + r.count); }
    a.clearUpdateRanges(); a.addUpdateRange(lo, hi - lo);
  } else a.addUpdateRange(start, count);
  a.needsUpdate = true;
}

export function touchTex(t, start, count) {
  if (!t.onUpdate || !t.onUpdate.partial) {   // znacznik: tekstura już raz wysłana w całości
    const f = () => { t.userData.sent = true; t.userData.full = false; }; f.partial = true; t.onUpdate = f;
  }
  const U = t.userData;
  if (U.sent && !U.full) {
    if (t.updateRanges.length >= LIMIT) { t.clearUpdateRanges(); U.full = true; }   // za dużo — cała tekstura naraz
    else t.addUpdateRange(start, count);
  }
  t.needsUpdate = true;
}
