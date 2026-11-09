# Weryfikacja banknotów

Plik: `js/render/art/exam/kinds/banknote.js` (z gry artchecker, przeniesiony z historią; w laboratorium sztuki: Examine) · rodzaj w rejestrze: `notes`

**Obiekt:** 100 florenów Banku Narodowego Arkadii (waluta fikcyjna), 14 × 7,2 cm. W grze opisu tego trybu nie było —
ten plik spisano z kodu.

## Zabezpieczenia (zdrady)
Papier i wymiary · druk wklęsły (wypukłość, światło boczne) · znak wodny i nitka zabezpieczająca (pod światło) ·
recto-verso · hologram i farba zmienna optycznie (przechylanie) · obraz utajony · mikrodruk · struktura druku
(mikroskop) · numer seryjny · lampa UV · podczerwień (IR: część farb znika, jak w prawdziwych banknotach) ·
detektor magnetyczny.

## Metody fałszerstwa (profile)
| Profil | Opis |
|---|---|
| `inkjet` | wydruk z drukarki atramentowej na zwykłym papierze — zdradza się prawie wszystkim |
| `laser` | kolorowa kopia z drukarki laserowej |
| `offset` | fałszerstwo offsetowe z naklejonym hologramem |
| `bleach` | wybielony banknot 10 FL z nadrukiem nominału 100 (papier i znak wodny prawdziwe) |
| `hq` | wysokiej jakości fałszerstwo z drukiem wklęsłym — zdradza się tylko kilkoma cechami |

Widoki w laboratorium: dzienne, światło boczne, przechodzące, UV, podczerwień.
