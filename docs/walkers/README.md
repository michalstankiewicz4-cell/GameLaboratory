> **W GameLaboratory** (przeniesione z repozytorium NeuroLabPA, z historią): SDF Walkers to `labs/walkers.html`
> (skrypty `js/labs/walkers/`, model — shadery, cechy, render — `js/models/human/zombie/walkers/`, dane `data/walkers/`),
> laboratorium języka to `labs/lang.html` (`js/labs/lang/`, teksty `data/lang/`, narzędzia `tools/lang/`).
> Pierwotne SDF Morgue: `docs/morgue/sdf-morgue-original.html`. Ścieżki niżej są obecne (po przeniesieniu).

# SDF Walkers

*Repozytorium NeuroLabPA*

Generator pixel-artowych zombie do gier przeglądarkowych. Postać nie jest rysowana ani generowana przez model graficzny: powstaje z **funkcji odległości (SDF)** liczonych w shaderze WebGL2, a potem jest zamieniana na pixel art (paleta, kontur, dithering).

Strona robi trzy rzeczy:

1. **Generuje zombie**: losowo albo ręcznie w edytorze (22 cechy: płeć, wzrost, budowa, barki, włosy, ubranie, buty, kolory, uszkodzenia…).
2. **Renderuje sprite sheet**: 5 animacji (walk, idle, attack, hit, death) × 4 kierunki × 8 klatek, przezroczyste tło, plus plik JSON dla silnika gry.
3. **Uczy się gustu**: oceniasz zombie (Good / Bad + zła część ciała), a mała sieć neuronowa w przeglądarce uczy się, co Ci się podoba, i steruje losowaniem (Smart roll). Panel *Network view* pokazuje sieć na żywo.

## Uruchomienie

Projekt nie ma żadnego kroku budowania ani zależności. Wystarczy serwer plików statycznych:

```bash
# z katalogu projektu
python -m http.server 8000
# potem http://localhost:8000
```

W VS Code działa też rozszerzenie *Live Server*.

**Wersja online:** https://michalstankiewicz4-cell.github.io/NeuroLabPA/. Stronę publikuje workflow `.github/workflows/static.yml` przy każdym wypchnięciu do gałęzi `main`.

> Otwieranie `index.html` bezpośrednio z dysku (`file://`) też powinno działać, ale serwer jest pewniejszy.

## Gdzie zapisują się oceny

| Gdzie działa strona | Zapis ocen | Eksport plików |
|---|---|---|
| artefakt na claude.ai, oglądany przez właściciela | baza danych artefaktu (kolekcja `ratings`) | okno zapisu claude.ai |
| GitHub Pages / serwer lokalny | `localStorage` przeglądarki (`sdf-walkers-ratings-v2`) | zwykłe pobieranie pliku |

Sieć neuronowa nie jest nigdzie zapisywana: przy każdym otwarciu uczy się od nowa z ocen (trwa to ułamek sekundy). Wytrenowany model można wyeksportować (**Export model**) i wczytać (**Import model**). Plik modelu zawiera listę wejść, więc model z innej wersji generatora zostanie odrzucony, a nie błędnie wczytany.

## Laboratorium języka

Osobna strona `labs/lang.html` (link w nagłówku SDF Walkers): sieć uczy się polskiego od zera, na Twoich plikach .txt, na własnym silniku napisanym w JS (bez bibliotek). Konstrukcje idą w kolejności historycznej, każda naprawia słabość poprzedniej: bigram → sieć z oknem i embeddingami → sieć rekurencyjna (zwykła RNN i GRU) → transformer. Transformer może liczyć na procesorze albo na karcie graficznej (WebGPU). Tekst może być dzielony na litery albo na tokeny BPE, a krok 5 dostraja wytrenowaną sieć do rozmowy i pozwala z nią porozmawiać. Wszystkie mierzone tą samą miarą (błąd na tekście sprawdzającym, bity na znak), więc różnice widać w tabeli porównania.

```
labs/lang.html              strona laboratorium
ui/pages/lang.css           układ (kolory i czcionki z ui/pages/walkers.css)
js/labs/lang/engine.js      silnik CPU: tensory, autograd, komórki RNN i GRU, klocki transformera, Adam z obcinaniem gradientu, PCA
js/labs/lang/wasm.js        mnożenie macierzy w WebAssembly SIMD (wygenerowane z tools/lang/matmul.wat)
js/labs/lang/gpu.js         silnik GPU (WebGPU, shadery WGSL) dla transformera: nagrany raz cały krok nauki
js/labs/lang/data.js        przykładowy tekst, słownik liter
js/labs/lang/bpe.js         tokenizer BPE: nauka sklejeń, kodowanie i dekodowanie
js/labs/lang/worker.js      trening w tle (Web Worker): bigram, sieć z oknem, RNN/GRU, najlepsza wersja, zapis/wczytanie modelu
js/labs/lang/lang.js        strona: dane, wykres, wizualizacje, porównanie
tools/lang/                 matmul.wat (źródło WASM) i build_wasm.js (kompilacja: npm install wabt@1.0.36, potem node tools/lang/build_wasm.js)
data/lang/                  zestawy przykładowe: grabinski/, wikipedia/, rozmowy/ (manifest.json, opis i licencje w README)
```

Uwaga: Web Worker nie działa z pliku otwartego bezpośrednio (`file://`), laboratorium trzeba uruchomić przez serwer lub GitHub Pages.

## Struktura

```
labs/walkers.html                        strona
ui/pages/walkers.css                     wygląd
ui/versions.js                           numer wersji (labs/walkers.html; js/labs/walkers/version.js go czyta)
js/render/sdf-glsl.js                    funkcje odległości GLSL wspólne z Kostnicą SDF
js/models/human/zombie/walkers/shaders.js  GLSL: przebieg 1 (raymarching SDF), przebieg 2 (paleta, kontur, dithering)
js/models/human/zombie/walkers/traits.js   palety, słowniki cech, animacje, generator okazów z ziarnem
js/models/human/zombie/walkers/render.js   WebGL, renderowanie klatek, sprite sheet i jego JSON
js/labs/walkers/editor.js                edytor cech
js/labs/walkers/preview.js               animowany podgląd 4 kierunków
js/labs/walkers/storage.js               zapis ocen (localStorage)
js/labs/walkers/network.js               sieć: cechy wejściowe, MLP z 7 wyjściami, trening, walidacja, wnioski
js/labs/walkers/io.js                    eksport / import ocen i modelu
js/labs/walkers/grid.js                  siatka oceniania
js/labs/walkers/roll.js                  losowanie (zwykłe i sterowane siecią)
js/labs/walkers/hud.js                   panel Network view
js/labs/walkers/main.js                  start i podpięcie zdarzeń
docs/morgue/sdf-morgue-original.html     pierwsza wersja: sama głowa zombie
docs/walkers/img/                        zrzuty z kolejnych etapów
data/walkers/                            oceny Claude'a i sieć wytrenowana na nich (przycisk Load repo model)
```

Prototyp w Pythonie i składacz artefaktu claude.ai z NeuroLabPA nie zostały przeniesione (są w historii git).

Skrypty są zwykłymi `<script>` (bez modułów ES) i dzielą zmienne globalne, dlatego **kolejność wczytywania w `labs/walkers.html` ma znaczenie**.

## Sieć w skrócie

- Wejście: 56 liczb opisujących zombie (one-hot dla wyborów, liczby dla suwaków, 3 kontrasty kolorów w Oklab).
- Jedna warstwa ukryta (12 neuronów, tanh) i 7 wyjść (sigmoid): `good` oraz po jednym na część ciała (`Head`, `Torso`, `Arms`, `Legs`, `Skin colour`, `Clothes colour`).
- Ocena Good uczy wszystkie części „OK”. Bad z tagami uczy wskazane części. Bad bez tagów uczy tylko `good`; wyjścia części są wtedy maskowane.
- Jakość mierzy 5-krotna walidacja krzyżowa: jak często sieć zgadza się z ocenami, których nie widziała.

## Plany

Zobacz `ROADMAP.md`.

## Wersjonowanie

Wersja jest w `ui/versions.js` (`labs/walkers.html`) i na pasku menu. Zmiany od przeniesienia: `CHANGELOG.md` w katalogu głównym; historia z NeuroLabPA: `docs/history/walkers.md`. Schemat: `0.MINOR.PATCH`. MINOR rośnie przy nowych funkcjach, a każda zmiana listy wejść sieci (nowa cecha) też podnosi MINOR, bo unieważnia wyeksportowane modele.
