# Laboratorium filtrów (`labs/filters.html`)

Potok kamery z laboratoriów wodnych (Battle, `js/render/sea/look.js` — `LookPipeline`) na wybranej scenie.
Grafika z Battle (preferowana, CLAUDE.md).

- **Filtry:** ekspozycja (ręczna lub automatyczna), tone mapping (ACES, AgX, Hable), kontrast, nasycenie,
  vibrance, temperatura, odcień, poświata, winieta, ziarno, aberracja chromatyczna, zniekształcenie obiektywu,
  krople i brud na obiektywie, flara słońca, wyostrzanie. Gotowe ustawienia: Game clean, Cinematic, Bodycam.
- **Profile:** w oknie Kamera (sekcja Profiles) nazwa + Save profile / Delete profile; profil to cały wygląd (suwaki,
  tone mapping, automatyczna ekspozycja), zapisany w przeglądarce (`localStorage["gameLab.lookProfiles.v1"]`,
  `{ nazwa: look }`). Zapisane profile wybiera się z listy na pasku narzędzi; zmiana suwaka odznacza profil. Te same profile wybiera
  edytor sceny (Środowisko → Wygląd kamery) i laboratorium skórek.
- **Porównanie:** czysty obraz po lewej, przesuwany podział.
- **Koszt:** każdy efekt wyłączany po kolei; ile milisekund dodaje do klatki.
- **Sceny** (`js/labs/filters/scenes/`): ORP Błyskawica, ORP Orzeł, platforma Super 300 (morze), pociąg na torze (ląd).
  Nowa scena: plik eksportujący `{ id, label, surface: 'sea' | 'land', build(stage) → { root, size, target, update?, dispose? } }`
  i wpis w `SCENES` w `filters.js`.
- **Scena bazowa** (`js/labs/shared/stage.js`): niebo SkyKit z mapą otoczenia z tego samego nieba, słońce z cieniem,
  morze WaterKit lub płaski grunt; oświetlenie: popołudnie, południe, zmierzch, zachmurzenie.
- Pogoda i starzenie zostają w laboratorium wyglądu (`labs/look.html`).
- Modele Space nie są jeszcze scenami: ich kity potrzebują `three-global.js`, który zmienia oświetlenie całej strony.
