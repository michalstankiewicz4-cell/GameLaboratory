# Broń ręczna — WeaponKit

Kod: `js/models/weapons/weaponkit.js` (`window.WeaponKit`), modele w `js/models/weapons/`. Doktor modeli: `tools/doctor/sources/weapons.js`.
`buildWeapon(id)` → `{ group, parts, info, update(t, dt, { fire }), dispose }`. Początek w chwycie pistoletowym (tu prawa
dłoń), +z — wylot lufy, y w górę; 1 j. = 1 m.

## kbs wz. 96 Beryl (`beryl`)
Karabinek 5,56 mm FB „Łucznik” Radom: komora zamkowa z pokrywą i szyną, rączka zamka i przełącznik ognia po prawej,
chwyt pistoletowy z kabłąkiem i spustem, zakrzywiony magazynek 30 nab. z żeberkami, łoże z żeberkami, lufa, blok gazowy
z muszką, rura gazowa, szczerbinka, hamulec wylotowy z otworami, składana kolba rurowa ze stopką. Błysk wylotowy
(`parts.flash`) pokazuje się na 0,05 s po `update(…, { fire: true })`.
`info`: długość 0,943 m, lufa 0,457 m, masa 3,35 kg, szybkostrzelność 700/min, prędkość pocisku 920 m/s, magazynek 30;
punkty `muzzleAt`, `stockAt`, `supportAt` (wylot, stopka kolby, łoże — do ułożenia w dłoniach).
