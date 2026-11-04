# Solaris Urbino 18 electric

Autobus przegubowy IV generacji w barwach MZA Warszawa (żółta góra, czerwony dół), linia 175 — Lotnisko Chopina.

## Wymiary

| | |
|---|---|
| długość · szerokość · wysokość (z dachem) | 18,0 · 2,55 · 3,3 m |
| rozstaw osi | 5,9 + 6,05 m; zwis przedni 2,705, tylny 3,345 |
| obrotnica przegubu | 1,55 m za osią 2 |
| podłoga | niska, 0,34 m |
| opony | 275/70 R22.5 (oś 2 i 3 bliźniacze) |

## Jak jest zbudowany

- **Dwa człony** w jednej grupie; tylny na przegubie. Kąt przegubu liczy model (kinematyka naczepy: obrotnica za osią 2,
  oś 3 za obrotnicą), harmonijka między członami gnie się z nim.
- **Burty**: pas dolny czerwony z łukami nadkoli i wycięciami drzwi (drzwi tylko po prawej), pas okien z przyciemnianymi
  szybami i czarnymi słupkami (lufciki), pas górny i dach żółte z zaokrąglonymi krawędziami.
- **Przód**: panel z reflektorami (światła do jazdy dziennej, kierunkowskazy), zderzak, szyba, wyświetlacz linii (LED,
  świeci), lusterka na wysięgnikach, wycieraczki. **Tył**: ściana z oknem, numer linii, lampy, zderzak.
- **Dach**: klimatyzatory z wentylatorami, baterie, falownik.
- **Drzwi** 2-2-2-2: dwa skrzydła odskokowo-przesuwne z szybami i poręczami (`work`).
- **Wnętrze**: przejście środkiem z niską podłogą, wnęki kół, siedzenia przodem do kierunku jazdy, żółte poręcze (pionowe
  i podłużne pod sufitem), sufit ze świetlówkami (nocą świecą), stanowisko kierowcy z kabiną i kasownikiem.

## Ruch (`update`)

`speed`, `steer` (−1..1, dodatni w lewo), `contact(x, z)` (w układzie członu przedniego), `lights`, `brake`, `work` (drzwi).
`articulation()` — bieżący kąt przegubu (dla kolizji w grze).

## Doktor modeli

Bez błędów obróconych ścian; zostają drobne „seethrough” w panelach dolnych przy łukach i igły (info).
