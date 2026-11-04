# M1A2 Abrams

Czołg podstawowy (General Dynamics Land Systems), w barwach do wyboru: zieleń ochronna, piaskowy CARC, zieleń NATO.

## Wymiary

| | |
|---|---|
| długość z działem naprzód / kadłub | 9,77 / 7,93 m |
| szerokość z osłonami burt · wysokość do dachu wieży | 3,66 · 2,44 m |
| prześwit | 0,48 m |
| koła jezdne | 7 na burtę, Ø 635 mm; koło napędowe z tyłu, napinające z przodu, 2 rolki podtrzymujące |
| gąsienica | T158, szer. 635 mm, podziałka ok. 19 cm, 84 ogniwa; styk z gruntem 4,62 m; rozstaw 2,8 m |
| armata | M256 120 mm L/44; zakres −9°…+20° |
| masa · prędkość | ok. 62 t · 67 km/h |

## Jak jest zbudowany

- **Kadłub**: wanna między gąsienicami (dolna i górna płyta czołowa, płyta tylna z kratą wydechu) i półki nad gąsienicami
  — profile boczne wyciągnięte w poprzek. Pokład z powłoką przeciwpoślizgową, kratki silnika, właz kierowcy z trzema
  peryskopami, wlewy paliwa, liny i ucha holownicze, reflektory z osłonami na błotnikach, światła tylne.
- **Osłony burt**: 9 segmentów na burtę; trzy przednie grubsze (pancerne), dolna krawędź podniesiona z przodu, śruby.
- **Gąsienice**: ogniwa jako siatki instancji (korpus z łącznikami i zębem prowadzącym, poduszki gumowe). Pas biegnie po
  obwiedni kół (otoczka wypukła), przesuwa się z prędkością gąsienicy (przy skręcie burty biegną z różną prędkością);
  koła jezdne podwójne z bandażami, na wahaczach drążków skrętnych, podążają za podłożem — dolny pas się na nim układa.
  Koło napędowe z wieńcami zębatymi, napinające z otworami.
- **Wieża**: graniastosłup z klinowym czołem i niszą, osłona pierścienia, dach przeciwpoślizgowy; celownik działonowego
  (GPS), CITV dowódcy, wieżyczka dowódcy z blokami wizyjnymi i karabinem M2, właz ładowniczego z karabinem M240 na
  pierścieniu, wyrzutnie granatów dymnych (2 × 6), skrzynie na bokach, kosz z ładunkiem na tyle, maszt czujnika wiatru,
  anteny.
- **Armata**: osłona jarzma, osłona termiczna z opaskami, przedmuchiwacz, czujnik wylotu, karabin współosiowy.

## Ruch (`update`)

`speed` (m/s), `turn` (rad/s, dodatni w lewo), `contact(x, z)`, `turret` (rad), `gun` (rad), `lights`, `brake`, `work` (właz dowódcy).
Kadłub kołysze się na płaszczyźnie przez koła jezdne, przysiada przy ruszaniu i hamowaniu.

## Doktor modeli

Bez błędów i ostrzeżeń (zostaje 7 części z igłami — info). Ok. 71 tys. trójkątów.
