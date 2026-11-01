/* =======================================================================
   GAMELABORATORY · CATALOG — every lab and tool, in one place
   =======================================================================
   A classic script, before ui/menubar.js (and the start page). Read by the
   menu bar (lists, names, Help → this lab's notes, Options → reset saved
   settings), the start page (tiles: picture, description, phrases for the
   filter) and tools/sitemap.py (sitemap.xml). A new lab: one entry here and
   its version in ui/versions.js (then python3 tools/sitemap.py).
   Fields: file, name / namePl, doc, page (a second page of another lab: no
   entry of its own in the lists), desc / descPl, kind ("lab" | "tool"), kit,
   phrases (Polish; their English in phraseEn — a new phrase needs both),
   saved (localStorage key prefixes), art (the tile: bg + svg, or img).
   The JSON between the markers is read by tools/sitemap.py — keep it JSON.
   ======================================================================= */
window.GameLabCatalog =
/*JSON*/{
  "start": {
    "saved": ["labsHub."]
  },
  "labs": [
    {
      "file": "labs/ship.html",
      "name": "Ship lab",
      "namePl": "Laboratorium statków",
      "doc": "docs/ship.md",
      "desc": "Ships in space and at sea — switch the environment. Space: ships, the drone and the station: build, shape, rename, light, animate. Water: real warships at true scale, ORP Błyskawica and the submarine ORP Orzeł.",
      "descPl": "Statki w kosmosie i na morzu — przełącz środowisko. Kosmos: statki, dron i stacja: buduj, kształtuj, nazywaj, oświetlaj, animuj. Woda: prawdziwe okręty w prawdziwej skali, ORP Błyskawica i okręt podwodny ORP Orzeł.",
      "kind": "game",
      "kit": "ShipKit · ShipKit (sea)",
      "phrases": ["kosmos", "woda", "statki", "okręty", "okręt podwodny", "Orzeł", "stacja", "dron", "światła"],
      "saved": ["shipLab."],
      "art": {
        "bg": ["#1b2a5e", "#0f1630"],
        "svg": "<path d=\"M38 58 L118 45 L166 54 L118 66 Z\" fill=\"url(#g)\" opacity=\".95\"/><path d=\"M92 49 L70 28 L84 28 L110 47 Z M92 62 L70 80 L84 80 L110 63 Z\" fill=\"#9fb4ff\" opacity=\".55\"/><circle cx=\"38\" cy=\"58\" r=\"9\" fill=\"#5be0ff\" opacity=\".35\"/><circle cx=\"38\" cy=\"58\" r=\"4\" fill=\"#d8f6ff\"/><path d=\"M14 58 H32\" stroke=\"#5be0ff\" stroke-width=\"3\" stroke-linecap=\"round\" opacity=\".6\"/>"
      }
    },
    {
      "file": "labs/warship.html",
      "name": "Ship lab · water",
      "namePl": "Laboratorium statków · woda",
      "doc": "docs/ships-sea/blyskawica.md",
      "page": true
    },
    {
      "file": "labs/bodies.html",
      "name": "Body lab",
      "namePl": "Laboratorium ciał niebieskich",
      "doc": "docs/bodies.md",
      "desc": "Planets, suns, giants, rocks, comets and black holes, every slider of their shaders.",
      "descPl": "Planety, słońca, olbrzymy, skały, komety i czarne dziury — każdy suwak ich shaderów.",
      "kind": "game",
      "kit": "BodyKit",
      "phrases": ["kosmos", "planety", "słońca", "czarne dziury", "komety"],
      "art": {
        "bg": ["#3b1d4f", "#140d24"],
        "svg": "<circle cx=\"100\" cy=\"52\" r=\"28\" fill=\"url(#g)\"/><path d=\"M100 24 A28 28 0 0 1 100 80 A16 28 0 0 0 100 24\" fill=\"#0b0716\" opacity=\".55\"/><ellipse cx=\"100\" cy=\"54\" rx=\"56\" ry=\"12\" fill=\"none\" stroke=\"#f6c9ff\" stroke-width=\"2.5\" opacity=\".7\" transform=\"rotate(-12 100 54)\"/><circle cx=\"160\" cy=\"24\" r=\"3\" fill=\"#fff\" opacity=\".7\"/><circle cx=\"34\" cy=\"78\" r=\"2\" fill=\"#fff\" opacity=\".5\"/>"
      }
    },
    {
      "file": "labs/systems.html",
      "name": "System lab",
      "namePl": "Laboratorium układów",
      "doc": "docs/systems.md",
      "desc": "Whole star systems from the bodies: presets and a seeded generator.",
      "descPl": "Całe układy gwiezdne z ciał niebieskich: gotowe zestawy i generator z ziarna.",
      "kind": "lab",
      "kit": "SystemKit",
      "phrases": ["kosmos", "układy", "orbity", "gwiazdy"],
      "art": {
        "bg": ["#2c2312", "#120f08"],
        "svg": "<circle cx=\"100\" cy=\"50\" r=\"9\" fill=\"#ffd27a\"/><circle cx=\"100\" cy=\"50\" r=\"16\" fill=\"#ffd27a\" opacity=\".18\"/><g fill=\"none\" stroke=\"#f2b84b\" stroke-width=\"1.4\" opacity=\".55\"><ellipse cx=\"100\" cy=\"50\" rx=\"34\" ry=\"13\"/><ellipse cx=\"100\" cy=\"50\" rx=\"58\" ry=\"23\"/><ellipse cx=\"100\" cy=\"50\" rx=\"84\" ry=\"34\"/></g><circle cx=\"134\" cy=\"50\" r=\"4\" fill=\"#8be0ff\"/><circle cx=\"58\" cy=\"66\" r=\"5\" fill=\"#ff9a6b\"/><circle cx=\"168\" cy=\"30\" r=\"6\" fill=\"#c7b2ff\"/>"
      }
    },
    {
      "file": "labs/scale.html",
      "name": "Scale lab",
      "namePl": "Laboratorium skali",
      "doc": "docs/scale.md",
      "desc": "Sizes side by side: ships, bodies and distances, to keep the world in proportion.",
      "descPl": "Rozmiary obok siebie: statki, ciała niebieskie i odległości, żeby świat trzymał proporcje.",
      "kind": "lab",
      "kit": "scale",
      "phrases": ["kosmos", "skala", "proporcje"],
      "art": {
        "bg": ["#173236", "#0a1517"],
        "svg": "<g fill=\"none\" stroke=\"url(#g)\" stroke-width=\"2.5\"><circle cx=\"46\" cy=\"58\" r=\"8\"/><circle cx=\"86\" cy=\"54\" r=\"14\"/><circle cx=\"140\" cy=\"46\" r=\"26\"/></g><path d=\"M24 84 H180\" stroke=\"#9fe8de\" stroke-width=\"2\"/><g stroke=\"#9fe8de\" stroke-width=\"2\"><path d=\"M24 84 V76\"/><path d=\"M43.5 84 V80\"/><path d=\"M63 84 V76\"/><path d=\"M82.5 84 V80\"/><path d=\"M102 84 V76\"/><path d=\"M121.5 84 V80\"/><path d=\"M141 84 V76\"/><path d=\"M160.5 84 V80\"/><path d=\"M180 84 V76\"/></g>"
      }
    },
    {
      "file": "labs/skins.html",
      "name": "Skin lab",
      "namePl": "Laboratorium skórek",
      "doc": "docs/skins.md",
      "desc": "Other looks for the game's interface, tried on a mock-up.",
      "descPl": "Inne wyglądy interfejsu gry, przymierzane na makiecie.",
      "kind": "lab",
      "kit": "UI",
      "phrases": ["interfejs", "wygląd"],
      "saved": ["gameLab.skins"],
      "art": {
        "bg": ["#3a1830", "#160a14"],
        "svg": "<rect x=\"34\" y=\"22\" width=\"92\" height=\"58\" rx=\"8\" fill=\"#1d1328\" stroke=\"#ff8bd1\" stroke-width=\"2\"/><rect x=\"34\" y=\"22\" width=\"92\" height=\"12\" rx=\"6\" fill=\"#ff8bd1\" opacity=\".5\"/><rect x=\"74\" y=\"38\" width=\"92\" height=\"52\" rx=\"8\" fill=\"#16182a\" stroke=\"#8b9cff\" stroke-width=\"2\"/><rect x=\"74\" y=\"38\" width=\"92\" height=\"12\" rx=\"6\" fill=\"#8b9cff\" opacity=\".5\"/><g><circle cx=\"92\" cy=\"68\" r=\"7\" fill=\"#36d6b5\"/><circle cx=\"112\" cy=\"68\" r=\"7\" fill=\"#f2b84b\"/><circle cx=\"132\" cy=\"68\" r=\"7\" fill=\"#ff6b8b\"/><circle cx=\"152\" cy=\"68\" r=\"7\" fill=\"#8b9cff\"/></g>"
      }
    },
    {
      "file": "labs/surface.html",
      "name": "Surface lab",
      "namePl": "Laboratorium powierzchni",
      "doc": "docs/surface.md",
      "desc": "Land on a planet: terrain from its own look, sky, weather, day and night, a base.",
      "descPl": "Ląd na planecie: teren z jej własnego wyglądu, niebo, pogoda, dzień i noc, baza.",
      "kind": "game",
      "kit": "SurfaceKit",
      "phrases": ["ląd", "planeta", "lądowanie", "baza", "pogoda"],
      "saved": ["gameLab.bases"],
      "art": {
        "bg": ["#16304a", "#0b1420"],
        "svg": "<circle cx=\"150\" cy=\"30\" r=\"10\" fill=\"#ffd9a0\"/><path d=\"M0 74 Q40 54 78 66 T150 62 T200 70 V100 H0 Z\" fill=\"#2c5a4a\"/><path d=\"M0 84 Q50 70 100 80 T200 78 V100 H0 Z\" fill=\"#1d3f35\"/><path d=\"M84 66 a12 12 0 0 1 24 0 Z\" fill=\"#9fe8de\"/><rect x=\"95\" y=\"20\" width=\"2\" height=\"46\" fill=\"#f2b84b\" opacity=\".6\"/>"
      }
    },
    {
      "file": "labs/buildings.html",
      "name": "Building lab",
      "namePl": "Laboratorium budynków",
      "doc": "docs/surface.md",
      "desc": "The base's modules one by one: built, as a hologram, under construction.",
      "descPl": "Moduły bazy jeden po drugim: zbudowane, jako hologram, w budowie.",
      "kind": "game",
      "kit": "BaseKit",
      "phrases": ["ląd", "baza", "budynki", "moduły"],
      "art": {
        "bg": ["#2a2a14", "#12120a"],
        "svg": "<path d=\"M20 82 H180\" stroke=\"#5c5a3a\" stroke-width=\"2\"/><path d=\"M40 82 a22 22 0 0 1 44 0 Z\" fill=\"url(#g)\"/><rect x=\"92\" y=\"54\" width=\"34\" height=\"28\" rx=\"3\" fill=\"#cfc28a\" opacity=\".85\"/><rect x=\"132\" y=\"62\" width=\"40\" height=\"20\" rx=\"3\" fill=\"#8a8158\"/><g stroke=\"#36d6b5\" stroke-width=\"1.5\" fill=\"none\" stroke-dasharray=\"3 3\"><rect x=\"136\" y=\"34\" width=\"34\" height=\"22\" rx=\"3\"/></g>"
      }
    },
    {
      "file": "labs/vehicles.html",
      "name": "Vehicle lab",
      "namePl": "Laboratorium pojazdów",
      "doc": "docs/vehicles.md",
      "desc": "Robot rovers: suspension, wheels and tracks, dust, lamps. A train that drives: a shunting diesel and two wagons on an oval with turnouts, with real wheel–rail physics.",
      "descPl": "Łaziki-roboty: zawieszenie, koła i gąsienice, kurz, lampy. Pociąg, który jeździ: lokomotywa manewrowa i dwa wagony na owalu z rozjazdami, z prawdziwą fizyką koło–szyna.",
      "kind": "lab",
      "kit": "VehicleKit · TrainKit",
      "phrases": ["ląd", "pojazdy", "łaziki", "koła", "gąsienice", "pociąg", "tor"],
      "art": {
        "bg": ["#3a2a12", "#160f06"],
        "svg": "<rect x=\"50\" y=\"44\" width=\"100\" height=\"22\" rx=\"6\" fill=\"url(#g)\"/><rect x=\"70\" y=\"30\" width=\"36\" height=\"16\" rx=\"4\" fill=\"#ffdca0\" opacity=\".8\"/><path d=\"M128 44 V22\" stroke=\"#ffdca0\" stroke-width=\"2.5\"/><circle cx=\"128\" cy=\"20\" r=\"4\" fill=\"#ffdca0\"/><g fill=\"#1a1208\" stroke=\"#f2b84b\" stroke-width=\"3\"><circle cx=\"64\" cy=\"72\" r=\"10\"/><circle cx=\"100\" cy=\"72\" r=\"10\"/><circle cx=\"136\" cy=\"72\" r=\"10\"/></g><path d=\"M14 84 H186\" stroke=\"#5a4320\" stroke-width=\"2\"/>"
      }
    },
    {
      "file": "labs/sound.html",
      "name": "Sound lab",
      "namePl": "Laboratorium dźwięku",
      "doc": "docs/sound.md",
      "desc": "The game's music, made live from layers and a seed: drones, pads, chimes, whispers, a robot's voice.",
      "descPl": "Muzyka gry tworzona na żywo z warstw i ziarna: burdony, plamy, dzwonki, szepty, głos robota.",
      "kind": "lab",
      "kit": "MusicKit",
      "phrases": ["dźwięk", "muzyka"],
      "saved": ["soundLab."],
      "art": {
        "bg": ["#1f1840", "#0b0818"],
        "svg": "<g fill=\"none\" stroke-linecap=\"round\"><path d=\"M18 44 V56\" stroke=\"#36d6b5\" stroke-width=\"2.2\" opacity=\"0.525\"/><path d=\"M22.6 26.61905486672678 V73.38094513327322\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.7422618141659152\"/><path d=\"M27.2 16.33244614410112 V83.66755385589889\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.870844423198736\"/><path d=\"M31.799999999999997 16.613191587785153 V83.38680841221485\" stroke=\"#36d6b5\" stroke-width=\"2.2\" opacity=\"0.8673351051526856\"/><path d=\"M36.4 25.652195991217393 V74.3478040087826\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.7543475501097826\"/><path d=\"M41 37.54328236833426 V62.45671763166574\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.6057089703958218\"/><path d=\"M45.599999999999994 42.359795783242234 V57.640204216757766\" stroke=\"#36d6b5\" stroke-width=\"2.2\" opacity=\"0.5455025527094721\"/><path d=\"M50.199999999999996 41.774032526376715 V58.225967473623285\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.5528245934202911\"/><path d=\"M54.8 40.4737913384299 V59.5262086615701\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.5690776082696263\"/><path d=\"M59.4 33.6302228410456 V66.3697771589544\" stroke=\"#36d6b5\" stroke-width=\"2.2\" opacity=\"0.65462221448693\"/><path d=\"M64 31.889564309920857 V68.11043569007914\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.6763804461259892\"/><path d=\"M68.6 38.7069812597759 V61.2930187402241\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.5911627342528012\"/><path d=\"M73.19999999999999 35.38888167229133 V64.61111832770867\" stroke=\"#36d6b5\" stroke-width=\"2.2\" opacity=\"0.6326389790963584\"/><path d=\"M77.8 20.247264086663645 V79.75273591333635\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.8219091989167044\"/><path d=\"M82.39999999999999 11.082670043112977 V88.91732995688702\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.9364666244610877\"/><path d=\"M87 12.632565464129058 V87.36743453587094\" stroke=\"#36d6b5\" stroke-width=\"2.2\" opacity=\"0.9170929316983868\"/><path d=\"M91.6 24.585259859291735 V75.41474014070826\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.7676842517588534\"/><path d=\"M96.19999999999999 41.68946906627234 V58.31053093372766\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.5538816366715957\"/><path d=\"M100.8 31.50764153167958 V68.49235846832042\" stroke=\"#36d6b5\" stroke-width=\"2.2\" opacity=\"0.6811544808540052\"/><path d=\"M105.39999999999999 24.783365641958092 V75.21663435804192\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.7652079294755239\"/><path d=\"M110 27.33129532012908 V72.66870467987093\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.7333588084983865\"/><path d=\"M114.6 35.39147797834034 V64.60852202165967\" stroke=\"#36d6b5\" stroke-width=\"2.2\" opacity=\"0.6326065252707458\"/><path d=\"M119.19999999999999 42.58956450801383 V57.41043549198617\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.5426304436498272\"/><path d=\"M123.8 43.666744131541456 V56.333255868458544\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.5291656983557318\"/><path d=\"M128.39999999999998 37.52236702106481 V62.47763297893519\" stroke=\"#36d6b5\" stroke-width=\"2.2\" opacity=\"0.6059704122366899\"/><path d=\"M133 27.877806521130463 V72.12219347886953\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.7265274184858692\"/><path d=\"M137.6 21.1895620944689 V78.8104379055311\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.8101304738191388\"/><path d=\"M142.2 22.964536940537663 V77.03546305946233\" stroke=\"#36d6b5\" stroke-width=\"2.2\" opacity=\"0.7879432882432793\"/><path d=\"M146.79999999999998 34.52035507370054 V65.47964492629946\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.6434955615787432\"/><path d=\"M151.39999999999998 36.002456274638206 V63.997543725361794\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.6249692965670224\"/><path d=\"M156 19.802719458157615 V80.19728054184239\" stroke=\"#36d6b5\" stroke-width=\"2.2\" opacity=\"0.8274660067730298\"/><path d=\"M160.6 11.733887612941004 V88.266112387059\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.9283264048382375\"/><path d=\"M165.2 14.768444808650273 V85.23155519134973\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.8903944398918716\"/><path d=\"M169.79999999999998 26.530139473793124 V73.46986052620687\" stroke=\"#36d6b5\" stroke-width=\"2.2\" opacity=\"0.7433732565775859\"/><path d=\"M174.39999999999998 40.68256113662587 V59.31743886337413\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.5664679857921766\"/><path d=\"M179 37.59936975210632 V62.40063024789368\" stroke=\"#9fb4ff\" stroke-width=\"2.2\" opacity=\"0.605007878098671\"/></g><path d=\"M14 50 Q40 20 66 50 T118 50 T170 50 T190 50\" fill=\"none\" stroke=\"#f2b84b\" stroke-width=\"1.8\" opacity=\".8\"/>"
      }
    },
    {
      "file": "labs/marine.html",
      "name": "Sea lab",
      "namePl": "Laboratorium morza",
      "doc": "docs/marine.md",
      "desc": "The sea and under it: waves, a seabed, an island, robot vessels.",
      "descPl": "Morze i to, co pod nim: fale, dno, wyspa, pojazdy-roboty.",
      "kind": "lab",
      "kit": "MarineKit",
      "phrases": ["woda", "morze", "pod wodą", "pojazdy"],
      "art": {
        "bg": ["#0f3550", "#081722"],
        "svg": "<path d=\"M64 52 H140 L128 66 H76 Z\" fill=\"url(#g)\"/><rect x=\"92\" y=\"38\" width=\"22\" height=\"14\" rx=\"3\" fill=\"#c9f1ff\" opacity=\".85\"/><path d=\"M0 64 Q25 56 50 64 T100 64 T150 64 T200 64 V100 H0 Z\" fill=\"#1f6d8f\" opacity=\".75\"/><path d=\"M0 74 Q25 68 50 74 T100 74 T150 74 T200 74 V100 H0 Z\" fill=\"#164f6a\"/><g fill=\"#c9f1ff\" opacity=\".6\"><circle cx=\"60\" cy=\"86\" r=\"2.5\"/><circle cx=\"68\" cy=\"80\" r=\"1.6\"/><circle cx=\"150\" cy=\"88\" r=\"2\"/></g>"
      }
    },
    {
      "file": "labs/creator.html",
      "name": "Creature editor",
      "namePl": "Edytor stworów",
      "doc": "docs/life.md",
      "desc": "Build a creature: drag its spine into shape, give it pairs of legs anywhere — it walks, on any number of legs.",
      "descPl": "Zbuduj stwora: wygnij jego kręgosłup, daj mu pary nóg gdziekolwiek — chodzi, na dowolnej liczbie nóg.",
      "kind": "lab",
      "kit": "LifeKit",
      "phrases": ["życie", "stwory", "chód", "nogi"],
      "saved": ["creatorLab."],
      "art": {
        "bg": ["#2a2416", "#110e08"],
        "svg": "<path d=\"M40 60 Q70 30 110 42 T170 34\" fill=\"none\" stroke=\"#e8c79a\" stroke-width=\"10\" stroke-linecap=\"round\"/><g stroke=\"#e8c79a\" stroke-width=\"4\" stroke-linecap=\"round\"><path d=\"M75 44 L68 80 M95 42 L100 80 M125 40 L118 80 M145 38 L152 80\"/></g><g fill=\"#f8bb56\"><circle cx=\"40\" cy=\"60\" r=\"5\"/><circle cx=\"80\" cy=\"40\" r=\"5\"/><circle cx=\"120\" cy=\"41\" r=\"5\"/><circle cx=\"170\" cy=\"34\" r=\"5\"/></g><g fill=\"#36d6b5\"><circle cx=\"75\" cy=\"44\" r=\"4\"/><circle cx=\"145\" cy=\"38\" r=\"4\"/></g>"
      }
    },
    {
      "file": "labs/life.html",
      "name": "Life lab",
      "namePl": "Laboratorium życia",
      "doc": "docs/life.md",
      "desc": "Life forms from blocks: a skeleton, bodies that bend at the joints, moving in their medium — animals on four legs. Humans have their own lab.",
      "descPl": "Formy życia z bloków: szkielet, ciała zginające się w stawach, ruch w swoim ośrodku — zwierzęta na czterech nogach. Ludzie mają własne laboratorium.",
      "kind": "lab",
      "kit": "LifeKit",
      "phrases": ["życie", "zwierzęta", "chód", "nogi"],
      "art": {
        "bg": ["#203a2e", "#0b1611"],
        "svg": "<g fill=\"none\" stroke=\"#e8d2b8\" stroke-width=\"6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M64 56 Q100 44 136 56 M74 58 L66 92 M90 54 L94 92 M114 54 L108 92 M128 58 L136 92 M136 56 Q150 44 156 30\"/></g><circle cx=\"158\" cy=\"26\" r=\"7\" fill=\"#e8d2b8\"/><path d=\"M0 92 H200\" stroke=\"#5fd0a0\" stroke-width=\"2\" opacity=\".5\"/><g stroke=\"#5fd0a0\" stroke-width=\"1.5\" opacity=\".45\"><path d=\"M30 92 V86 M60 92 V86 M140 92 V86 M170 92 V86\"/></g>"
      }
    },
    {
      "file": "labs/human.html",
      "name": "Human lab",
      "namePl": "Laboratorium człowieka",
      "doc": "docs/human.md",
      "desc": "Humans from blocks: a skeleton, a body that bends at the joints, a face with expressions; standing, walking, running, with layers on top of any gait.",
      "descPl": "Ludzie z bloków: szkielet, ciało zginające się w stawach, twarz z minami; stanie, chód, bieg, z warstwami na każdym chodzie.",
      "kind": "lab",
      "kit": "LifeKit · human",
      "phrases": ["człowiek", "postać", "chód", "twarz", "animacja"],
      "art": {
        "bg": ["#2e2636", "#120e17"],
        "svg": "<g fill=\"none\" stroke=\"#e8d2b8\" stroke-width=\"7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M100 40 V66 M100 66 L88 92 M100 66 L114 90 M100 46 L84 62 M100 46 L118 58\"/></g><circle cx=\"100\" cy=\"27\" r=\"9\" fill=\"#e8d2b8\"/><path d=\"M0 92 H200\" stroke=\"#5fd0a0\" stroke-width=\"2\" opacity=\".5\"/><g stroke=\"#5fd0a0\" stroke-width=\"1.5\" opacity=\".45\"><path d=\"M30 92 V86 M60 92 V86 M140 92 V86 M170 92 V86\"/></g>"
      }
    },
    {
      "file": "labs/structures.html",
      "name": "Structures lab",
      "namePl": "Laboratorium budowli",
      "doc": "docs/structures.md",
      "desc": "Waterside structures at real scale: a jack-up drilling rig, a quay, a breakwater.",
      "descPl": "Budowle nad wodą w prawdziwej skali: platforma wiertnicza typu jack-up, nabrzeże, falochron.",
      "kind": "lab",
      "kit": "StructKit",
      "phrases": ["woda", "ląd", "budowle", "platforma", "nabrzeże"],
      "saved": ["gameLab.structures."],
      "art": {
        "img": "assets/labs/structures.jpg"
      }
    },
    {
      "file": "labs/water.html",
      "name": "Water lab",
      "namePl": "Laboratorium wody",
      "doc": "docs/water.md",
      "desc": "Sea states from calm to gale, reflections, foam, bow wave, wake, spray, ship motion — with the cost of every effect.",
      "descPl": "Stany morza od ciszy do sztormu, odbicia, piana, fala dziobowa, kilwater, bryzgi, kołysanie okrętu — z kosztem każdego efektu.",
      "kind": "game",
      "kit": "WaterKit",
      "phrases": ["woda", "morze", "fale", "piana", "kilwater"],
      "saved": ["gameLab.water."],
      "art": {
        "img": "assets/labs/water.jpg"
      }
    },
    {
      "file": "labs/land.html",
      "name": "Land lab",
      "namePl": "Laboratorium lądu",
      "doc": "docs/land.md",
      "desc": "Procedural land and sea from 0 to 100 % land: islands, coasts, fjords, erosion, beaches, surf.",
      "descPl": "Proceduralny ląd i morze od 0 do 100 % lądu: wyspy, wybrzeża, fiordy, erozja, plaże, przybój.",
      "kind": "game",
      "kit": "LandKit",
      "phrases": ["ląd", "teren", "wyspy", "wybrzeże", "erozja"],
      "saved": ["gameLab.land."],
      "art": {
        "img": "assets/labs/land.jpg"
      }
    },
    {
      "file": "labs/plants.html",
      "name": "Plants lab",
      "namePl": "Laboratorium roślin",
      "doc": "docs/plants.md",
      "desc": "Trees, palms, shrubs and grass grown from code, moving in the wind.",
      "descPl": "Drzewa, palmy, krzewy i trawa wyhodowane z kodu, poruszane wiatrem.",
      "kind": "lab",
      "kit": "PlantKit",
      "phrases": ["ląd", "rośliny", "drzewa", "trawa", "wiatr"],
      "saved": ["gameLab.plants."],
      "art": {
        "img": "assets/labs/plants.jpg"
      }
    },
    {
      "file": "labs/look.html",
      "name": "Look lab",
      "namePl": "Laboratorium wyglądu",
      "doc": "docs/look.md",
      "desc": "Sky, seven weathers, time of day, procedural ageing of surfaces, graphics filters.",
      "descPl": "Niebo, siedem pogód, pora dnia, proceduralne starzenie powierzchni, filtry grafiki.",
      "kind": "game",
      "kit": "SkyKit",
      "phrases": ["niebo", "pogoda", "pora dnia", "starzenie", "filtry"],
      "saved": ["gameLab.look."],
      "art": {
        "img": "assets/labs/look.jpg"
      }
    },
    {
      "file": "labs/filters.html",
      "name": "Filters lab",
      "namePl": "Laboratorium filtrów",
      "doc": "docs/filters.md",
      "desc": "The camera look from the water labs on a choice of scenes — exposure, tone mapping, colour, glow, vignette, grain, lens effects, sharpening; compared with the clean image, with the cost of every effect.",
      "descPl": "Wygląd kamery z laboratoriów wodnych na wybranych scenach — ekspozycja, mapowanie tonów, kolor, poświata, winieta, ziarno, efekty obiektywu, wyostrzenie; w porównaniu z czystym obrazem, z kosztem każdego efektu.",
      "kind": "lab",
      "kit": "LookPipeline",
      "phrases": ["filtry", "grafika", "kamera", "obraz", "efekty", "tone mapping"],
      "saved": ["gameLab.filters."],
      "art": {
        "bg": ["#1c2436", "#0b0e16"],
        "svg": "<defs><linearGradient id=\"fl\" x1=\"0\" x2=\"1\"><stop offset=\"0\" stop-color=\"#5b8cff\"/><stop offset=\".5\" stop-color=\"#36d6b5\"/><stop offset=\"1\" stop-color=\"#f2b84b\"/></linearGradient></defs><circle cx=\"78\" cy=\"50\" r=\"30\" fill=\"none\" stroke=\"url(#g)\" stroke-width=\"3\" opacity=\".8\"/><circle cx=\"122\" cy=\"50\" r=\"30\" fill=\"url(#fl)\" opacity=\".35\"/><circle cx=\"100\" cy=\"50\" r=\"12\" fill=\"#fff\" opacity=\".85\"/><path d=\"M30 86 H170\" stroke=\"#9fb4ff\" stroke-width=\"2\" opacity=\".5\"/>"
      }
    },
    {
      "file": "labs/pixel.html",
      "name": "Pixel Studio",
      "namePl": "Pixel Studio",
      "doc": "docs/pixel/README.md",
      "desc": "Pixel art with a transparent background: 3D models rendered to pixels, generated sprites and tiles, a pixel editor; palettes, dither, outline; PNG, sprite sheets, GIF. With its own Pixel Doctor.",
      "descPl": "Pixel art z przezroczystym tłem: modele 3D renderowane do pikseli, generowane sprite'y i kafelki, edytor pikseli; palety, dithering, obrys; PNG, arkusze sprite'ów, GIF. Z własnym Pixel Doctorem.",
      "kind": "lab",
      "kit": "Pixel Studio",
      "phrases": ["pixel art", "sprite", "2D", "animacja", "paleta", "GIF"],
      "saved": ["gameLab.pixel."],
      "art": {
        "bg": ["#1d2b22", "#0b120d"],
        "svg": "<rect x=\"80\" y=\"14\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"90\" y=\"14\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"80\" y=\"24\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"90\" y=\"24\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"70\" y=\"34\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"80\" y=\"34\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"90\" y=\"34\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"100\" y=\"34\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"60\" y=\"44\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"70\" y=\"44\" width=\"10\" height=\"10\" fill=\"#13261a\"/><rect x=\"80\" y=\"44\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"90\" y=\"44\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"100\" y=\"44\" width=\"10\" height=\"10\" fill=\"#13261a\"/><rect x=\"110\" y=\"44\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"60\" y=\"54\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"70\" y=\"54\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"80\" y=\"54\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"90\" y=\"54\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"100\" y=\"54\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"110\" y=\"54\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"70\" y=\"64\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"100\" y=\"64\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"60\" y=\"74\" width=\"10\" height=\"10\" fill=\"#8be07a\"/><rect x=\"110\" y=\"74\" width=\"10\" height=\"10\" fill=\"#8be07a\"/>"
      }
    },
    {
      "file": "labs/zombies.html",
      "name": "Zombie Generator",
      "namePl": "Generator zombie",
      "doc": "docs/pixel/zombies.md",
      "desc": "Original zombies from a seed, animated in 8 directions, exported as Unity sprite sheets (JSON, slicer script, ZIP).",
      "descPl": "Oryginalne zombie z ziarna, animowane w 8 kierunkach, eksportowane jako arkusze sprite'ów dla Unity (JSON, skrypt cięcia, ZIP).",
      "kind": "lab",
      "kit": "Pixel Studio",
      "phrases": ["zombie", "postać", "sprite", "animacja", "Unity"],
      "saved": ["gameLab.zombies."],
      "art": {
        "bg": ["#2a2020", "#120b0b"],
        "svg": "<rect x=\"86\" y=\"12\" width=\"8\" height=\"8\" fill=\"#9db07c\"/><rect x=\"94\" y=\"12\" width=\"8\" height=\"8\" fill=\"#9db07c\"/><rect x=\"102\" y=\"12\" width=\"8\" height=\"8\" fill=\"#9db07c\"/><rect x=\"78\" y=\"20\" width=\"8\" height=\"8\" fill=\"#9db07c\"/><rect x=\"86\" y=\"20\" width=\"8\" height=\"8\" fill=\"#e8e04a\"/><rect x=\"94\" y=\"20\" width=\"8\" height=\"8\" fill=\"#9db07c\"/><rect x=\"102\" y=\"20\" width=\"8\" height=\"8\" fill=\"#9db07c\"/><rect x=\"110\" y=\"20\" width=\"8\" height=\"8\" fill=\"#e8e04a\"/><rect x=\"86\" y=\"28\" width=\"8\" height=\"8\" fill=\"#9db07c\"/><rect x=\"94\" y=\"28\" width=\"8\" height=\"8\" fill=\"#5a1b1b\"/><rect x=\"102\" y=\"28\" width=\"8\" height=\"8\" fill=\"#9db07c\"/><rect x=\"94\" y=\"36\" width=\"8\" height=\"8\" fill=\"#4b5a6e\"/><rect x=\"86\" y=\"44\" width=\"8\" height=\"8\" fill=\"#4b5a6e\"/><rect x=\"94\" y=\"44\" width=\"8\" height=\"8\" fill=\"#4b5a6e\"/><rect x=\"102\" y=\"44\" width=\"8\" height=\"8\" fill=\"#4b5a6e\"/><rect x=\"78\" y=\"52\" width=\"8\" height=\"8\" fill=\"#4b5a6e\"/><rect x=\"94\" y=\"52\" width=\"8\" height=\"8\" fill=\"#4b5a6e\"/><rect x=\"110\" y=\"52\" width=\"8\" height=\"8\" fill=\"#4b5a6e\"/><rect x=\"86\" y=\"60\" width=\"8\" height=\"8\" fill=\"#4b5a6e\"/><rect x=\"102\" y=\"60\" width=\"8\" height=\"8\" fill=\"#4b5a6e\"/><rect x=\"86\" y=\"68\" width=\"8\" height=\"8\" fill=\"#3a3a44\"/><rect x=\"102\" y=\"68\" width=\"8\" height=\"8\" fill=\"#3a3a44\"/><rect x=\"86\" y=\"76\" width=\"8\" height=\"8\" fill=\"#3a3a44\"/><rect x=\"102\" y=\"76\" width=\"8\" height=\"8\" fill=\"#3a3a44\"/>"
      }
    },
    {
      "file": "labs/morgue.html",
      "name": "SDF Morgue",
      "namePl": "Kostnica SDF",
      "doc": "docs/morgue.md",
      "desc": "A zombie head computed in a shader: distance functions, raymarching, light in four tones and outlines from geometry, as pixel art. Every roll is a new specimen from a seed.",
      "descPl": "Głowa zombie liczona w shaderze: funkcje odległości, raymarching, światło w czterech tonach i kontur z geometrii, jako pixel art. Każde losowanie to nowy okaz z ziarna.",
      "kind": "lab",
      "kit": "SDF head",
      "phrases": ["zombie", "pixel art", "shader", "SDF", "postać"],
      "art": {
        "bg": ["#1e1b2b", "#15131f"],
        "svg": "<ellipse cx=\"100\" cy=\"46\" rx=\"26\" ry=\"28\" fill=\"#68805a\"/><ellipse cx=\"100\" cy=\"66\" rx=\"18\" ry=\"14\" fill=\"#9cac70\"/><circle cx=\"90\" cy=\"42\" r=\"6\" fill=\"#26223a\"/><circle cx=\"110\" cy=\"40\" r=\"5\" fill=\"#26223a\"/><circle cx=\"110\" cy=\"40\" r=\"2.4\" fill=\"#faee96\"/><rect x=\"92\" y=\"66\" width=\"16\" height=\"6\" fill=\"#1e0a16\"/><rect x=\"94\" y=\"66\" width=\"3\" height=\"3\" fill=\"#d6c896\"/><rect x=\"99\" y=\"66\" width=\"3\" height=\"3\" fill=\"#d6c896\"/><rect x=\"104\" y=\"66\" width=\"3\" height=\"3\" fill=\"#d6c896\"/><path d=\"M70 96 Q100 76 130 96\" fill=\"#4b3d6b\"/>"
      }
    },
    {
      "file": "labs/walkers.html",
      "name": "SDF Walkers",
      "namePl": "SDF Walkers",
      "doc": "docs/walkers/README.md",
      "desc": "Whole zombies built from distance functions, five animations in four directions, sprite sheets with JSON; rate batches and a small neural network learns your taste and steers the rolls.",
      "descPl": "Całe zombie z funkcji odległości, pięć animacji w czterech kierunkach, sprite sheety z JSON; oceniasz partie, a mała sieć neuronowa uczy się Twojego gustu i steruje losowaniem.",
      "kind": "lab",
      "kit": "SDF Walkers",
      "phrases": ["zombie", "pixel art", "sprite", "animacja", "SDF", "sieć neuronowa"],
      "saved": ["sdf-walkers-hud"],
      "art": {
        "bg": ["#1e1b2b", "#15131f"],
        "svg": "<g transform=\"translate(30 18)\"><rect x=\"6\" y=\"0\" width=\"10\" height=\"10\" fill=\"#9cac70\"/><rect x=\"4\" y=\"10\" width=\"14\" height=\"22\" fill=\"#6b5b95\"/><rect x=\"5\" y=\"32\" width=\"5\" height=\"14\" fill=\"#3a3550\"/><rect x=\"12\" y=\"32\" width=\"5\" height=\"18\" fill=\"#3a3550\"/></g><g transform=\"translate(70 20)\"><rect x=\"6\" y=\"0\" width=\"10\" height=\"10\" fill=\"#9cac70\"/><rect x=\"4\" y=\"10\" width=\"14\" height=\"22\" fill=\"#4f7aa8\"/><rect x=\"5\" y=\"32\" width=\"5\" height=\"18\" fill=\"#3a3550\"/><rect x=\"12\" y=\"32\" width=\"5\" height=\"14\" fill=\"#3a3550\"/></g><g transform=\"translate(110 18)\"><rect x=\"6\" y=\"0\" width=\"10\" height=\"10\" fill=\"#9cac70\"/><rect x=\"4\" y=\"10\" width=\"14\" height=\"22\" fill=\"#5f9e7a\"/><rect x=\"5\" y=\"32\" width=\"5\" height=\"14\" fill=\"#3a3550\"/><rect x=\"12\" y=\"32\" width=\"5\" height=\"18\" fill=\"#3a3550\"/></g><g transform=\"translate(150 20)\"><rect x=\"6\" y=\"0\" width=\"10\" height=\"10\" fill=\"#9cac70\"/><rect x=\"4\" y=\"10\" width=\"14\" height=\"22\" fill=\"#a8583a\"/><rect x=\"5\" y=\"32\" width=\"5\" height=\"18\" fill=\"#3a3550\"/><rect x=\"12\" y=\"32\" width=\"5\" height=\"14\" fill=\"#3a3550\"/></g><circle cx=\"100\" cy=\"86\" r=\"3\" fill=\"#f2b84b\"/><circle cx=\"86\" cy=\"86\" r=\"3\" fill=\"#9cac70\"/><circle cx=\"114\" cy=\"86\" r=\"3\" fill=\"#9cac70\"/><path d=\"M86 86 H114\" stroke=\"#9cac70\" stroke-width=\"1\"/>"
      }
    },
    {
      "file": "labs/lang.html",
      "name": "Language lab",
      "namePl": "Laboratorium języka",
      "doc": "docs/walkers/README.md",
      "desc": "A network learns Polish from zero, letter by letter, on your texts: bigram, a window with embeddings, RNN and GRU, a transformer — on the CPU, in WebAssembly or WebGPU; BPE tokens, tuning for a conversation.",
      "descPl": "Sieć uczy się polskiego od zera, litera po literze, na Twoich tekstach: bigram, okno z embeddingami, RNN i GRU, transformer — na procesorze, w WebAssembly albo WebGPU; tokeny BPE, dostrajanie do rozmowy.",
      "kind": "lab",
      "kit": "own JS engine",
      "phrases": ["język", "tekst", "sieć neuronowa", "transformer", "WebGPU"],
      "art": {
        "bg": ["#1b2030", "#11141d"],
        "svg": "<text x=\"100\" y=\"44\" text-anchor=\"middle\" font-family=\"monospace\" font-size=\"20\" fill=\"#9cac70\">ą ę ł ó ś ż</text><rect x=\"30\" y=\"76\" width=\"20\" height=\"6\" fill=\"#f2b84b\" opacity=\"0.4\"/><rect x=\"60\" y=\"68.8\" width=\"20\" height=\"13.2\" fill=\"#f2b84b\" opacity=\"0.52\"/><rect x=\"90\" y=\"61.6\" width=\"20\" height=\"20.4\" fill=\"#f2b84b\" opacity=\"0.64\"/><rect x=\"120\" y=\"54.400000000000006\" width=\"20\" height=\"27.599999999999998\" fill=\"#f2b84b\" opacity=\"0.76\"/><rect x=\"150\" y=\"47.2\" width=\"20\" height=\"34.8\" fill=\"#f2b84b\" opacity=\"0.88\"/>"
      }
    }
  ],
  "tools": [
    {
      "file": "tools/doctor.html",
      "name": "Model doctor",
      "namePl": "Doktor modeli",
      "doc": "docs/doctor/README.md",
      "desc": "Every model of every lab — space, sea, land, rail — examined for the repeating mistakes: inside-out shapes, holes, flicker, floating pieces, guns firing into their own ship, fittings through the hull.",
      "descPl": "Każdy model każdego laboratorium — kosmos, morze, ląd, kolej — badany pod kątem powtarzających się błędów: odwrócone bryły, dziury, migotanie, wiszące części, działa strzelające we własny okręt, okucia przez kadłub.",
      "kind": "tool",
      "kit": "ModelDoctor",
      "phrases": ["narzędzie", "modele", "błędy", "kosmos", "woda", "ląd"],
      "art": {
        "img": "assets/labs/doctor.jpg"
      }
    },
    {
      "file": "labs/transform.html",
      "name": "Transformer",
      "namePl": "Transformator",
      "doc": "docs/transform.md",
      "desc": "A lab ship made game-ready: levels of detail, hitboxes, shader damage, fleet performance test.",
      "descPl": "Statek z laboratorium przygotowany do gry: poziomy szczegółów, hitboxy, uszkodzenia w shaderze, test wydajności floty.",
      "kind": "tool",
      "kit": "transform",
      "phrases": ["narzędzie", "LOD", "hitboxy", "wydajność"],
      "art": {
        "img": "assets/labs/transform.jpg"
      }
    },
    {
      "file": "tools/kitcheck.html",
      "name": "Kit check",
      "namePl": "Kontrola kitów",
      "doc": "CLAUDE.md",
      "desc": "The safety net: every model's fingerprint against the golden file, every lab for errors.",
      "descPl": "Siatka bezpieczeństwa: odcisk każdego modelu porównany ze wzorcem, każde laboratorium sprawdzone pod kątem błędów.",
      "kind": "tool",
      "kit": "kitcheck",
      "phrases": ["narzędzie", "testy"],
      "art": {
        "bg": ["#123024", "#08140f"],
        "svg": "<rect x=\"58\" y=\"24\" width=\"12\" height=\"12\" rx=\"3\" fill=\"none\" stroke=\"#36d6b5\" stroke-width=\"2\"/><path d=\"M61 30 l3 3 l6 -7\" stroke=\"#36d6b5\" stroke-width=\"2.4\" fill=\"none\" stroke-linecap=\"round\"/><rect x=\"80\" y=\"27\" width=\"70\" height=\"6\" rx=\"3\" fill=\"#9fe8de\" opacity=\".5\"/><rect x=\"58\" y=\"44\" width=\"12\" height=\"12\" rx=\"3\" fill=\"none\" stroke=\"#36d6b5\" stroke-width=\"2\"/><path d=\"M61 50 l3 3 l6 -7\" stroke=\"#36d6b5\" stroke-width=\"2.4\" fill=\"none\" stroke-linecap=\"round\"/><rect x=\"80\" y=\"47\" width=\"56\" height=\"6\" rx=\"3\" fill=\"#9fe8de\" opacity=\".5\"/><rect x=\"58\" y=\"64\" width=\"12\" height=\"12\" rx=\"3\" fill=\"none\" stroke=\"#36d6b5\" stroke-width=\"2\"/><path d=\"M61 70 l3 3 l6 -7\" stroke=\"#36d6b5\" stroke-width=\"2.4\" fill=\"none\" stroke-linecap=\"round\"/><rect x=\"80\" y=\"67\" width=\"42\" height=\"6\" rx=\"3\" fill=\"#9fe8de\" opacity=\".5\"/>"
      }
    },
    {
      "file": "tools/grainTexture.html",
      "name": "Grain texture",
      "namePl": "Tekstura ziarna",
      "doc": "README.md",
      "desc": "Regenerates the film grain the interface panels use.",
      "descPl": "Generuje od nowa ziarno filmowe, którego używają panele interfejsu.",
      "kind": "tool",
      "kit": "texture",
      "phrases": ["narzędzie", "tekstura"],
      "art": {
        "bg": ["#24242a", "#101014"],
        "svg": "<g fill=\"#d8dbe4\"><circle cx=\"0\" cy=\"0\" r=\"0.6\" opacity=\"0.15\"/><circle cx=\"73\" cy=\"38\" r=\"0.95\" opacity=\"0.23333333333333334\"/><circle cx=\"146\" cy=\"78\" r=\"1.2999999999999998\" opacity=\"0.31666666666666665\"/><circle cx=\"19\" cy=\"20\" r=\"1.65\" opacity=\"0.4\"/><circle cx=\"92\" cy=\"64\" r=\"2\" opacity=\"0.4833333333333333\"/><circle cx=\"165\" cy=\"87\" r=\"0.6\" opacity=\"0.5666666666666667\"/><circle cx=\"38\" cy=\"35\" r=\"0.95\" opacity=\"0.65\"/><circle cx=\"111\" cy=\"62\" r=\"1.2999999999999998\" opacity=\"0.15\"/><circle cx=\"184\" cy=\"14\" r=\"1.65\" opacity=\"0.23333333333333334\"/><circle cx=\"57\" cy=\"45\" r=\"2\" opacity=\"0.31666666666666665\"/><circle cx=\"130\" cy=\"78\" r=\"0.6\" opacity=\"0.4\"/><circle cx=\"3\" cy=\"13\" r=\"0.95\" opacity=\"0.4833333333333333\"/><circle cx=\"76\" cy=\"50\" r=\"1.2999999999999998\" opacity=\"0.5666666666666667\"/><circle cx=\"149\" cy=\"89\" r=\"1.65\" opacity=\"0.65\"/><circle cx=\"22\" cy=\"30\" r=\"2\" opacity=\"0.15\"/><circle cx=\"95\" cy=\"73\" r=\"0.6\" opacity=\"0.23333333333333334\"/><circle cx=\"168\" cy=\"95\" r=\"0.95\" opacity=\"0.31666666666666665\"/><circle cx=\"41\" cy=\"42\" r=\"1.2999999999999998\" opacity=\"0.4\"/><circle cx=\"114\" cy=\"68\" r=\"1.65\" opacity=\"0.4833333333333333\"/><circle cx=\"187\" cy=\"19\" r=\"2\" opacity=\"0.5666666666666667\"/><circle cx=\"60\" cy=\"49\" r=\"0.6\" opacity=\"0.65\"/><circle cx=\"133\" cy=\"81\" r=\"0.95\" opacity=\"0.15\"/><circle cx=\"6\" cy=\"15\" r=\"1.2999999999999998\" opacity=\"0.23333333333333334\"/><circle cx=\"79\" cy=\"51\" r=\"1.65\" opacity=\"0.31666666666666665\"/><circle cx=\"152\" cy=\"89\" r=\"2\" opacity=\"0.4\"/><circle cx=\"25\" cy=\"29\" r=\"0.6\" opacity=\"0.4833333333333333\"/><circle cx=\"98\" cy=\"71\" r=\"0.95\" opacity=\"0.5666666666666667\"/><circle cx=\"171\" cy=\"15\" r=\"1.2999999999999998\" opacity=\"0.65\"/><circle cx=\"44\" cy=\"38\" r=\"1.65\" opacity=\"0.15\"/><circle cx=\"117\" cy=\"86\" r=\"2\" opacity=\"0.23333333333333334\"/><circle cx=\"190\" cy=\"13\" r=\"0.6\" opacity=\"0.31666666666666665\"/><circle cx=\"63\" cy=\"65\" r=\"0.95\" opacity=\"0.4\"/><circle cx=\"136\" cy=\"96\" r=\"1.2999999999999998\" opacity=\"0.4833333333333333\"/><circle cx=\"9\" cy=\"29\" r=\"1.65\" opacity=\"0.5666666666666667\"/><circle cx=\"82\" cy=\"64\" r=\"2\" opacity=\"0.65\"/><circle cx=\"155\" cy=\"1\" r=\"0.6\" opacity=\"0.15\"/><circle cx=\"28\" cy=\"40\" r=\"0.95\" opacity=\"0.23333333333333334\"/><circle cx=\"101\" cy=\"81\" r=\"1.2999999999999998\" opacity=\"0.31666666666666665\"/><circle cx=\"174\" cy=\"24\" r=\"1.65\" opacity=\"0.4\"/><circle cx=\"47\" cy=\"46\" r=\"2\" opacity=\"0.4833333333333333\"/><circle cx=\"120\" cy=\"93\" r=\"0.6\" opacity=\"0.5666666666666667\"/><circle cx=\"193\" cy=\"19\" r=\"0.95\" opacity=\"0.65\"/><circle cx=\"66\" cy=\"70\" r=\"1.2999999999999998\" opacity=\"0.15\"/><circle cx=\"139\" cy=\"0\" r=\"1.65\" opacity=\"0.23333333333333334\"/><circle cx=\"12\" cy=\"32\" r=\"2\" opacity=\"0.31666666666666665\"/><circle cx=\"85\" cy=\"66\" r=\"0.6\" opacity=\"0.4\"/><circle cx=\"158\" cy=\"2\" r=\"0.95\" opacity=\"0.4833333333333333\"/><circle cx=\"31\" cy=\"40\" r=\"1.2999999999999998\" opacity=\"0.5666666666666667\"/><circle cx=\"104\" cy=\"80\" r=\"1.65\" opacity=\"0.65\"/><circle cx=\"177\" cy=\"22\" r=\"2\" opacity=\"0.15\"/><circle cx=\"50\" cy=\"66\" r=\"0.6\" opacity=\"0.23333333333333334\"/><circle cx=\"123\" cy=\"89\" r=\"0.95\" opacity=\"0.31666666666666665\"/><circle cx=\"196\" cy=\"37\" r=\"1.2999999999999998\" opacity=\"0.4\"/><circle cx=\"69\" cy=\"64\" r=\"1.65\" opacity=\"0.4833333333333333\"/><circle cx=\"142\" cy=\"16\" r=\"2\" opacity=\"0.5666666666666667\"/><circle cx=\"15\" cy=\"47\" r=\"0.6\" opacity=\"0.65\"/><circle cx=\"88\" cy=\"80\" r=\"0.95\" opacity=\"0.15\"/><circle cx=\"161\" cy=\"15\" r=\"1.2999999999999998\" opacity=\"0.23333333333333334\"/><circle cx=\"34\" cy=\"52\" r=\"1.65\" opacity=\"0.31666666666666665\"/><circle cx=\"107\" cy=\"91\" r=\"2\" opacity=\"0.4\"/><circle cx=\"180\" cy=\"32\" r=\"0.6\" opacity=\"0.4833333333333333\"/><circle cx=\"53\" cy=\"75\" r=\"0.95\" opacity=\"0.5666666666666667\"/><circle cx=\"126\" cy=\"97\" r=\"1.2999999999999998\" opacity=\"0.65\"/><circle cx=\"199\" cy=\"44\" r=\"1.65\" opacity=\"0.15\"/><circle cx=\"72\" cy=\"70\" r=\"2\" opacity=\"0.23333333333333334\"/><circle cx=\"145\" cy=\"21\" r=\"0.6\" opacity=\"0.31666666666666665\"/><circle cx=\"18\" cy=\"51\" r=\"0.95\" opacity=\"0.4\"/><circle cx=\"91\" cy=\"83\" r=\"1.2999999999999998\" opacity=\"0.4833333333333333\"/><circle cx=\"164\" cy=\"17\" r=\"1.65\" opacity=\"0.5666666666666667\"/><circle cx=\"37\" cy=\"53\" r=\"2\" opacity=\"0.65\"/><circle cx=\"110\" cy=\"91\" r=\"0.6\" opacity=\"0.15\"/><circle cx=\"183\" cy=\"31\" r=\"0.95\" opacity=\"0.23333333333333334\"/><circle cx=\"56\" cy=\"73\" r=\"1.2999999999999998\" opacity=\"0.31666666666666665\"/><circle cx=\"129\" cy=\"17\" r=\"1.65\" opacity=\"0.4\"/><circle cx=\"2\" cy=\"40\" r=\"2\" opacity=\"0.4833333333333333\"/><circle cx=\"75\" cy=\"88\" r=\"0.6\" opacity=\"0.5666666666666667\"/><circle cx=\"148\" cy=\"15\" r=\"0.95\" opacity=\"0.65\"/><circle cx=\"21\" cy=\"67\" r=\"1.2999999999999998\" opacity=\"0.15\"/><circle cx=\"94\" cy=\"98\" r=\"1.65\" opacity=\"0.23333333333333334\"/><circle cx=\"167\" cy=\"31\" r=\"2\" opacity=\"0.31666666666666665\"/><circle cx=\"40\" cy=\"66\" r=\"0.6\" opacity=\"0.4\"/><circle cx=\"113\" cy=\"3\" r=\"0.95\" opacity=\"0.4833333333333333\"/><circle cx=\"186\" cy=\"42\" r=\"1.2999999999999998\" opacity=\"0.5666666666666667\"/><circle cx=\"59\" cy=\"83\" r=\"1.65\" opacity=\"0.65\"/><circle cx=\"132\" cy=\"26\" r=\"2\" opacity=\"0.15\"/><circle cx=\"5\" cy=\"48\" r=\"0.6\" opacity=\"0.23333333333333334\"/><circle cx=\"78\" cy=\"95\" r=\"0.95\" opacity=\"0.31666666666666665\"/><circle cx=\"151\" cy=\"21\" r=\"1.2999999999999998\" opacity=\"0.4\"/><circle cx=\"24\" cy=\"72\" r=\"1.65\" opacity=\"0.4833333333333333\"/><circle cx=\"97\" cy=\"2\" r=\"2\" opacity=\"0.5666666666666667\"/><circle cx=\"170\" cy=\"34\" r=\"0.6\" opacity=\"0.65\"/><circle cx=\"43\" cy=\"68\" r=\"0.95\" opacity=\"0.15\"/><circle cx=\"116\" cy=\"4\" r=\"1.2999999999999998\" opacity=\"0.23333333333333334\"/><circle cx=\"189\" cy=\"42\" r=\"1.65\" opacity=\"0.31666666666666665\"/><circle cx=\"62\" cy=\"82\" r=\"2\" opacity=\"0.4\"/><circle cx=\"135\" cy=\"24\" r=\"0.6\" opacity=\"0.4833333333333333\"/><circle cx=\"8\" cy=\"68\" r=\"0.95\" opacity=\"0.5666666666666667\"/><circle cx=\"81\" cy=\"91\" r=\"1.2999999999999998\" opacity=\"0.65\"/><circle cx=\"154\" cy=\"39\" r=\"1.65\" opacity=\"0.15\"/><circle cx=\"27\" cy=\"66\" r=\"2\" opacity=\"0.23333333333333334\"/><circle cx=\"100\" cy=\"18\" r=\"0.6\" opacity=\"0.31666666666666665\"/><circle cx=\"173\" cy=\"49\" r=\"0.95\" opacity=\"0.4\"/><circle cx=\"46\" cy=\"82\" r=\"1.2999999999999998\" opacity=\"0.4833333333333333\"/><circle cx=\"119\" cy=\"17\" r=\"1.65\" opacity=\"0.5666666666666667\"/><circle cx=\"192\" cy=\"54\" r=\"2\" opacity=\"0.65\"/><circle cx=\"65\" cy=\"93\" r=\"0.6\" opacity=\"0.15\"/><circle cx=\"138\" cy=\"34\" r=\"0.95\" opacity=\"0.23333333333333334\"/><circle cx=\"11\" cy=\"77\" r=\"1.2999999999999998\" opacity=\"0.31666666666666665\"/><circle cx=\"84\" cy=\"99\" r=\"1.65\" opacity=\"0.4\"/><circle cx=\"157\" cy=\"46\" r=\"2\" opacity=\"0.4833333333333333\"/><circle cx=\"30\" cy=\"72\" r=\"0.6\" opacity=\"0.5666666666666667\"/><circle cx=\"103\" cy=\"23\" r=\"0.95\" opacity=\"0.65\"/><circle cx=\"176\" cy=\"53\" r=\"1.2999999999999998\" opacity=\"0.15\"/><circle cx=\"49\" cy=\"85\" r=\"1.65\" opacity=\"0.23333333333333334\"/><circle cx=\"122\" cy=\"19\" r=\"2\" opacity=\"0.31666666666666665\"/><circle cx=\"195\" cy=\"55\" r=\"0.6\" opacity=\"0.4\"/><circle cx=\"68\" cy=\"93\" r=\"0.95\" opacity=\"0.4833333333333333\"/><circle cx=\"141\" cy=\"33\" r=\"1.2999999999999998\" opacity=\"0.5666666666666667\"/><circle cx=\"14\" cy=\"75\" r=\"1.65\" opacity=\"0.65\"/><circle cx=\"87\" cy=\"19\" r=\"2\" opacity=\"0.15\"/><circle cx=\"160\" cy=\"42\" r=\"0.6\" opacity=\"0.23333333333333334\"/><circle cx=\"33\" cy=\"90\" r=\"0.95\" opacity=\"0.31666666666666665\"/><circle cx=\"106\" cy=\"17\" r=\"1.2999999999999998\" opacity=\"0.4\"/><circle cx=\"179\" cy=\"69\" r=\"1.65\" opacity=\"0.4833333333333333\"/><circle cx=\"52\" cy=\"0\" r=\"2\" opacity=\"0.5666666666666667\"/><circle cx=\"125\" cy=\"33\" r=\"0.6\" opacity=\"0.65\"/><circle cx=\"198\" cy=\"68\" r=\"0.95\" opacity=\"0.15\"/><circle cx=\"71\" cy=\"5\" r=\"1.2999999999999998\" opacity=\"0.23333333333333334\"/><circle cx=\"144\" cy=\"44\" r=\"1.65\" opacity=\"0.31666666666666665\"/><circle cx=\"17\" cy=\"85\" r=\"2\" opacity=\"0.4\"/><circle cx=\"90\" cy=\"28\" r=\"0.6\" opacity=\"0.4833333333333333\"/><circle cx=\"163\" cy=\"50\" r=\"0.95\" opacity=\"0.5666666666666667\"/><circle cx=\"36\" cy=\"97\" r=\"1.2999999999999998\" opacity=\"0.65\"/><circle cx=\"109\" cy=\"23\" r=\"1.65\" opacity=\"0.15\"/><circle cx=\"182\" cy=\"74\" r=\"2\" opacity=\"0.23333333333333334\"/><circle cx=\"55\" cy=\"4\" r=\"0.6\" opacity=\"0.31666666666666665\"/><circle cx=\"128\" cy=\"36\" r=\"0.95\" opacity=\"0.4\"/><circle cx=\"1\" cy=\"70\" r=\"1.2999999999999998\" opacity=\"0.4833333333333333\"/><circle cx=\"74\" cy=\"6\" r=\"1.65\" opacity=\"0.5666666666666667\"/><circle cx=\"147\" cy=\"44\" r=\"2\" opacity=\"0.65\"/></g>"
      }
    }
  ],
  "phraseEn": {
    "2D": "2D",
    "GIF": "GIF",
    "LOD": "LOD",
    "Orzeł": "Orzeł",
    "Unity": "Unity",
    "animacja": "animation",
    "baza": "base",
    "budowle": "structures",
    "budynki": "buildings",
    "błędy": "errors",
    "chód": "gait",
    "czarne dziury": "black holes",
    "człowiek": "human",
    "dron": "drone",
    "drzewa": "trees",
    "dźwięk": "sound",
    "efekty": "effects",
    "erozja": "erosion",
    "fale": "waves",
    "filtry": "filters",
    "grafika": "graphics",
    "gwiazdy": "stars",
    "gąsienice": "tracks",
    "hitboxy": "hitboxes",
    "interfejs": "interface",
    "kamera": "camera",
    "kilwater": "wake",
    "komety": "comets",
    "kosmos": "space",
    "koła": "wheels",
    "ląd": "land",
    "lądowanie": "landing",
    "modele": "models",
    "moduły": "modules",
    "morze": "sea",
    "muzyka": "music",
    "nabrzeże": "quay",
    "narzędzie": "tool",
    "niebo": "sky",
    "nogi": "legs",
    "obraz": "image",
    "okręt podwodny": "submarine",
    "okręty": "warships",
    "orbity": "orbits",
    "paleta": "palette",
    "piana": "foam",
    "pixel art": "pixel art",
    "planeta": "planet",
    "planety": "planets",
    "platforma": "platform",
    "pociąg": "train",
    "pod wodą": "underwater",
    "pogoda": "weather",
    "pojazdy": "vehicles",
    "pora dnia": "time of day",
    "postać": "character",
    "proporcje": "proportions",
    "rośliny": "plants",
    "skala": "scale",
    "sprite": "sprite",
    "stacja": "station",
    "starzenie": "ageing",
    "statki": "ships",
    "stwory": "creatures",
    "słońca": "suns",
    "tekstura": "texture",
    "teren": "terrain",
    "testy": "tests",
    "tone mapping": "tone mapping",
    "tor": "track",
    "trawa": "grass",
    "twarz": "face",
    "układy": "systems",
    "wiatr": "wind",
    "woda": "water",
    "wybrzeże": "coast",
    "wydajność": "performance",
    "wygląd": "look",
    "wyspy": "islands",
    "zombie": "zombie",
    "shader": "shader",
    "SDF": "SDF",
    "zwierzęta": "animals",
    "sieć neuronowa": "neural network",
    "język": "language",
    "tekst": "text",
    "transformer": "transformer",
    "WebGPU": "WebGPU",
    "łaziki": "rovers",
    "światła": "lights",
    "życie": "life"
  }
}/*END*/;
