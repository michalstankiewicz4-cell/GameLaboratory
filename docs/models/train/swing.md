# PESA Swing 120Na (TramKit)

Tramwaj niskopodłogowy Tramwajów Warszawskich (186 szt., 2010–2013), jednokierunkowy, w barwach warszawskich.
Plik: `js/models/train/trams/swing.js`, rejestr: `js/models/train/trams/tramkit.js` (`window.TramKit`).

## Wymiary

| | |
|---|---|
| długość · szerokość · wysokość | 30,12 · 2,40 · ok. 3,5 m |
| człony | 5: A (kabina), C, E na wózkach stałych; B, D podwieszone |
| podłoga | 0,35 m nad główką szyny (100% niskiej podłogi) |
| wózek | rozstaw osi 1,8 m, koła Ø 600 mm, rozstaw toru 1435 mm |
| drzwi | po prawej: 4 dwuskrzydłowe, 1 jednoskrzydłowe |

## Jak jest zbudowany

- **Człony to osobne grupy** — w grze każdy ustawia się na łuku toru (`opts.poses`), w laboratorium stoją prosto.
  Harmonijki między nimi rozciągają się między czołami członów co klatkę.
- Burty: pas dolny czerwony (fartuchy, nad kołami wózków podniesione), pas okien z przyciemnianymi szybami, dach żółty;
  sufit ze świetlówkami, siedzenia, żółte poręcze; drzwi odskokowo-przesuwne (`work`).
- Czoło: zaokrąglony nos, czarna maska z szybą, wyświetlacz linii (17 Tarchomin Kościelny), reflektory, światła dzienne,
  kierunkowskazy, lusterka na wysięgnikach, osłona sprzęgu; kabina z pulpitem, fotelem i nastawnikiem.
- Tył: ściana z oknem, numer linii, lampy. Dach: klimatyzatory, przetwornice, rezystory hamowania; pantograf
  jednoramienny na członie C (`pantograph` 0/1 — podnosi).
- Wózki: rama, zestawy kołowe (koła z obrzeżem, tarcza z otworami), maźnice, sprężyny gumowe, silniki trakcyjne, piasecznice.

## Doktor modeli

Bez błędów i ostrzeżeń (zostają drobne „seethrough” nosa i igły — info).
