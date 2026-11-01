# SDF Morgue (`labs/morgue.html`)

Przeniesione z artefaktu claude.ai „SDF Morgue”. Głowa zombie liczona w shaderze WebGL2 jako pixel art.

- **Model:** `js/models/human/zombie/sdf-head.js` — shadery (funkcje odległości: elipsoidy, kapsuły, prostopadłościany,
  gładkie sumy i różnice; raymarching 110 kroków, miękki cień, okluzja, światło brzegowe; światło w 4 tonach),
  okaz z ziarna (`makeZombie`: skóra, oczy, szczęka, odsłonięta czaszka, zęby, rana, ubranie, przechylenie),
  paleta (`paletteArray`), renderer dwuprzebiegowy (`createRenderer`). Materiały: 0 skóra, 1 oczy, 2 usta, 3 zęby,
  4 kość, 5 rana, 6 koszula.
- **Przebiegi:** 1 — dla każdego piksela ton światła, materiał i głębokość; 2 — kolory z palety i kontur tam, gdzie
  zmienia się materiał albo skacze głębokość (kontur tylko do 96 px).
- **Laboratorium:** `js/labs/morgue.js` — losowanie okazu, kąt kamery, kołysanie głowy, kontur, rozdzielczość
  32–256 px, karta okazu z próbkami kolorów. Okna z opcjami jak w innych laboratoriach.
