# Rzeźby z marmuru (3D)

Pliki: `js/modes/marble.js` (wariant) + `js/modes/sculpture3d.js` (wspólny silnik 3D) · wariant: `marble`

**Obiekt:** Aleksander Królikowski (1835–1898), „Popiersie Zofii”, 1879, marmur karraryjski, wys. 54,0 cm, 31,5 kg (fikcyjne).
Na postumentach stoi 5 popiersi: 1 oryginał i 4 kopie. Warunki badań zależą od **odległości kamery** i **strony**, z której patrzysz.

## Narzędzia
| Narzędzie | Warunek | Co pokazuje |
|---|---|---|
| Lampa UV | ≤ 2,5 m | stara powierzchnia (matowa, żółtawa, plamista) kontra świeża lub wytrawiona (jasna, fioletowa), żywica (zielonkawa) |
| Patyna w zagłębieniach | ≤ 60 cm | brud w zagłębieniach kontra czysta kopia lub malowana patyna |
| Powierzchnia (kwas) | ≤ 45 cm | wietrzenie tylko na górnych powierzchniach kontra jednolita „cukrowa” szorstkość |
| Waga | – | 31,5 kg w katalogu |
| Pomiar | ≤ 1,6 m | wysokość (54,0 cm) |
| Porównanie z fotografią | ≤ 1,1 m, na wprost | proporcje i ułożenie głowy |
| Sygnatura (tył cokołu) | ≤ 50 cm, z tyłu | kuta i zatarta kontra wycięta maszynowo lub sygnatura warsztatu |
| Ślady obróbki | ≤ 42 cm | szpicak, tarnik, polerowanie kontra równoległe ścieżki frezu CNC lub gładki odlew z pęcherzykami |
| Proweniencja, certyfikat | – | historia i dokumenty |

## Metody fałszerskie (profile)
| Profil | Zdradzają zawsze | Mogą zdradzać |
|---|---|---|
| Kopia frezowana CNC ze skanu 3D, postarzana kwasem | obróbka, kwas, UV | patyna, sygnatura |
| Odlew z żywicy z mączką marmurową | waga, obróbka, UV | patyna, kwas |
| Warsztatowa kopia z epoki (maszyna punktowa) | styl, sygnatura, wymiary | proweniencja, certyfikat |
| Kopia z podrobioną dokumentacją | proweniencja, certyfikat | patyna, sygnatura |

## Jak dodać kolejny materiał rzeźby
Utwórz plik w `js/modes/` i zarejestruj wariant w `SCULPT_VARIANTS` (wzór: `marble.js`): profile, narzędzia (`gate3: {d, az}`), `initQ`, `surface` (materiały Three.js), `inner` (wnętrze w RTG), `markTex`, `refQ`, teksty obserwacji. Wariant sam pojawi się w menu w grupie „Rzeźby 3D”.
