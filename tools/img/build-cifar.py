#!/usr/bin/env python3
"""Laboratorium obrazów · dane w kolorze 64×40 × 256 kolorów z CIFAR-10 → data/img-color/.

CIFAR-10 (Krizhevsky 2009): 60 000 zdjęć 32×32 w 10 kategoriach. Każde zdjęcie:
- środkowy pas 32×20 (wiersze 6–25; zdjęcia są kwadratowe, obrazek ma proporcje 64:40),
- powiększenie ×2 do 64×40 (bicubic),
- przypisanie każdego piksela do najbliższego z 256 kolorów wspólnej palety (bez ditheringu).
Paletę (256 kolorów) dobiera algorytm median cut z próbki zdjęć wszystkich kategorii: jedna paleta dla całego
zbioru, jak tryb 256 kolorów w starych kartach graficznych. Zapis: jeden PNG z paletą na kategorię, siatka 25 kolumn.

Źródło zdjęć: kopia CIFAR-10 jako pliki JPEG w repozytorium github.com/YoongiKim/CIFAR-10-images
(train/<kategoria>/NNNN.jpg). Uruchomienie (z katalogu repo):
  git clone --depth 1 https://github.com/YoongiKim/CIFAR-10-images /tmp/cifar
  python3 tools/img/build-cifar.py /tmp/cifar
Wymaga: pillow.
"""
import json, os, sys
from PIL import Image

PER = 600                 # zdjęć na kategorię
W, H = 64, 40             # obrazek
COLS = 25                 # obrazków w wierszu pliku PNG
CATS = [('airplane', 'samolot'), ('automobile', 'samochód'), ('bird', 'ptak'), ('cat', 'kot'), ('deer', 'jeleń'),
        ('dog', 'pies'), ('frog', 'żaba'), ('horse', 'koń'), ('ship', 'statek'), ('truck', 'ciężarówka')]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data', 'img-color')


def prep(path):
    im = Image.open(path).convert('RGB')                                   # 32×32
    return im.crop((0, 6, 32, 26)).resize((W, H), Image.BICUBIC)           # 32×20 → 64×40


def main(src):
    os.makedirs(OUT, exist_ok=True)
    imgs = {}
    for en, _ in CATS:
        d = os.path.join(src, 'train', en)
        files = sorted(f for f in os.listdir(d) if f.endswith('.jpg'))[:PER]
        imgs[en] = [prep(os.path.join(d, f)) for f in files]
    # paleta: median cut z mozaiki po 200 zdjęć z każdej kategorii
    sample = [im for en, _ in CATS for im in imgs[en][:200]]
    mos = Image.new('RGB', (W * 40, H * ((len(sample) + 39) // 40)))
    for k, im in enumerate(sample): mos.paste(im, ((k % 40) * W, (k // 40) * H))
    pal_img = mos.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = pal_img.getpalette()[:256 * 3]
    cats = []
    for en, pl in CATS:
        rows = (len(imgs[en]) + COLS - 1) // COLS
        sheet = Image.new('RGB', (COLS * W, rows * H))
        for k, im in enumerate(imgs[en]): sheet.paste(im, ((k % COLS) * W, (k // COLS) * H))
        q = sheet.quantize(palette=pal_img, dither=Image.Dither.NONE)
        q.save(os.path.join(OUT, en + '.png'), optimize=True)
        cats.append({'file': en + '.png', 'name': pl, 'cifar': en, 'count': len(imgs[en])})
        print(en, len(imgs[en]), os.path.getsize(os.path.join(OUT, en + '.png')))
    man = {'source': 'CIFAR-10 (Krizhevsky 2009)', 'w': W, 'h': H, 'colors': 256, 'cols': COLS, 'per': PER,
           'palette': [pal[i:i + 3] for i in range(0, 256 * 3, 3)], 'categories': cats}
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '/tmp/cifar')
