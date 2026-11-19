# Laboratorium przedmiotów (`labs/items.html`)

Codzienne śmieci w prawdziwej skali i masie: opony (samochodowa 205/55 R16, rowerowa 700×35C, traktorowa 18.4-38),
puszka aluminiowa (cała i zgnieciona), garnek, gazety związane sznurkiem, karton, beczka 200 l, sztabki. Modele
z JunkKit (`js/models/junkyard/`, z gry Złomowisko — repo Trash, z historią); opis każdego: [../models/junkyard.md](../models/junkyard.md).

## Co widać

- Przedmiot na kawałku gruntu pod niebem SkyKit (pogoda i słońce w oknie Światło i pogoda).
- **Model z bliska (LOD 0) i z daleka (LOD 1) obok siebie** — po prawej drugi LOD; przełącznik „Far model” zamienia je.
- Warianty (puszka: piwo, cola, woda; beczka: niebieska, czerwona, oliwkowa; sztabka: aluminium, stal, mieszanka).
- Siatka (wireframe) i **kształt zderzenia** z części wypukłych (`shapes.js`: pierścień opony, walec, prostopadłościan,
  naczynie garnka, bryły) — taki, jaki dostaje silnik fizyki.
- Dane w oknie Przedmiot: wymiary, masa, materiał, opór na zgniecenie w osiach X · Y · Z (kN), do ilu procent da się
  zgnieść, części zderzenia, trójkąty obu LOD, wersja modelu.

Teksty modeli (nazwy w `info`, napisy na teksturach, nazwy części) są po polsku, jak w grze.

## Dla AI

`window.ItemsApi`: `list()`, `await show(id, { variant, lod1, wire, coll, pair })` → dane przedmiotu, `info()`.
Adres `labs/items.html?item=<id>` otwiera przedmiot (z edytora sceny: „Otwórz w laboratorium”).
