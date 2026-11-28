# Laboratorium efektów · ląd (`labs/effects-land.html`)

Strona „ląd” laboratorium efektów (przełącznik środowiska: kosmos — `labs/effects.html`, ląd — ta strona). Realistyczny
ogień: **FireKit** (`js/render/effects/fire/firekit.js`). Strona `js/labs/effects-land/effects-land.js`, arkusz
`ui/pages/effects.css`. W grupie **Efekty** (własny kafelek na stronie startowej i pozycja w menu, 2026-11-28).

## FireKit

Wiele źródeł ognia naraz, wszystko liczone na GPU: każda cząstka zna czas narodzin i swoje losowe liczby, a ruch,
kształt i kolor liczy shader — co klatkę tylko emisja nowych cząstek.

| Warstwa | Jak |
|---|---|
| Płomienie | języki ognia jako pionowe billboardy (oś pochylona z wiatrem); kształt i drganie z szumu, barwa z temperatury (ciemna czerwień → pomarańcz → żółć → biały rdzeń), jasność ponad 1 (poświata w potoku kamery); język rośnie od podstawy i odrywa się u góry, wyższy ogień — szybsze płomienie (wypór ~ √wysokości) |
| Dym | kłęby rosnące i zwalniające z wysokością, obracające się, niesione wiatrem; barwa i gęstość z paliwa; świeży dym od spodu w świetle ognia, nocą ciemny |
| Iskry | żarzące się punkty unoszone ciepłem i wiatrem, migoczą i gasną |
| Światło | kilka świateł punktowych przydzielanych najsilniejszym źródłom blisko kamery, migotanie |

Paliwa (`FUELS`): **drewno** (pomarańczowe płomienie, szary dym, iskry), **trawa** (niskie szybkie płomienie, jasny dym,
dużo iskier), **guma, papa** (okopcone płomienie, gęsty czarny dym), **papier, karton** (jasne krótkie płomienie, mało
dymu, unoszące się iskry).

```js
import { createFire } from '../js/render/effects/fire/firekit.js';
const fire = createFire(scene);                               // { flames, smoke, embers, lights, smokeScale, emberScale, glow }
const s = fire.add({ at: [0, 0, 0], size: [1, 1], height: 1.5, power: 0.9, fuel: 'wood' });
s.set({ power: 0.5 }); s.remove();
fire.update(dt, camera, { wind: [3, 0, 0], light: 1 });      // co klatkę; light — jasność dnia
```

## Sceny w laboratorium

Ognisko (polana z korą PlantKit, kamienie RockKit), płonąca ściana z desek 4 × 3 m (MatKit), opony (JunkKit), pożar
trawy (front ognia, wypalony pas), papier i kartony (JunkKit), duży pożar. Suwaki: paliwo, moc, wysokość, szerokość,
wiatr (siła, kierunek), dym, iskry, jasność; pora dnia i pogoda w oknie Światło. Spacja — rozpal ponownie.

Dla AI: `FireApi.scene(id)`, `set({ fuel, power, height, width, wind, windDir, smoke, sparks, glow })`, `light()`,
`douse()`, `add(source)`, `counts()`.
