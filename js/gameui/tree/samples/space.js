// Przykłady: dwa drzewka okna Badania ze Space (js/ui/windows/techTreeData.js), w formacie 'gamelab-tree' (tree.js).
// Widok „płytka drukowana” (pcb.js). Położenia policzone tak jak w Space (liście wachlarzem nad rdzeniem, rodzic nad
// dziećmi, pierścień na poziom). Ulepszenia roju z config.js#TREE: koszt poziomu L = round(cost · growth^L), efekt na
// poziom — speed i power: mnożnik (bazowo 1), heat i cold: próg (bazowo 0), fleet: statki (bazowo 3). Drzewko
// programowania jest całe „wkrótce”. Teksty EN/PL z i18n Space.
export const SPACE_SWARM = {
  "format": "gamelab-tree",
  "version": 1,
  "name": "Space — swarm",
  "view": "pcb",
  "background": "",
  "points": {
    "label": "pts",
    "labelPl": "pkt"
  },
  "branches": {
    "core": {"label":"SWARM","labelPl":"RÓJ","color":"#ffd98f"},
    "hubShield": {"label":"Shielding","labelPl":"Osłony","color":"#4fe3c6"},
    "speed": {"label":"Speed","labelPl":"Prędkość","color":"#f8bb56"},
    "power": {"label":"Bite power","labelPl":"Siła żucia","color":"#c7d0ff"},
    "hubSwarm": {"label":"The swarm","labelPl":"Rój","color":"#ff9ea2"},
  },
  "nodes": [
    {"id":"core","name":"SWARM","namePl":"RÓJ","kind":"core","branch":"core","parents":[],"depth":0,"angle":0,"text":"The swarm's own upgrades.","textPl":"Ulepszenia samego roju.","icon":"core"},
    {"id":"hubShield","name":"Shielding","namePl":"Osłony","kind":"hub","branch":"hubShield","parents":["core"],"depth":1,"angle":-60,"text":"Lets the swarm feed on bodies too hot or too cold for it.","textPl":"Pozwalają rojowi żerować na ciałach za gorących lub za zimnych dla niego.","icon":"shield"},
    {"id":"heat","name":"Heat resistance+","namePl":"Odporność+ (gorąco)","kind":"trait","branch":"hubShield","parents":["hubShield"],"depth":2,"angle":-80,"cost":50,"levels":10,"growth":1.5,"effect":{"heat":0.11},"text":"Feed at full strength on hotter bodies.","textPl":"Pełna siła żerowania na gorętszych ciałach.","icon":"flame"},
    {"id":"cold","name":"Cold resistance-","namePl":"Odporność- (zimno)","kind":"trait","branch":"hubShield","parents":["hubShield"],"depth":2,"angle":-40,"cost":50,"levels":10,"growth":1.5,"effect":{"cold":0.11},"text":"Feed at full strength on colder bodies.","textPl":"Pełna siła żerowania na zimniejszych ciałach.","icon":"snow"},
    {"id":"speed","name":"Speed","namePl":"Prędkość","kind":"trait","branch":"speed","parents":["core"],"depth":1,"angle":0,"cost":40,"levels":12,"growth":1.55,"effect":{"speed":0.16},"text":"Ships fly faster — to an order and in their programs.","textPl":"Statki latają szybciej — na rozkaz i w swoich programach.","icon":"bolt"},
    {"id":"power","name":"Bite power","namePl":"Siła żucia","kind":"trait","branch":"power","parents":["core"],"depth":1,"angle":40,"cost":55,"levels":12,"growth":1.55,"effect":{"power":0.22},"text":"Ships bite harder: more damage per second while feeding.","textPl":"Statki gryzą mocniej: więcej obrażeń na sekundę przy żerowaniu.","icon":"jaw"},
    {"id":"hubSwarm","name":"The swarm","namePl":"Rój","kind":"hub","branch":"hubSwarm","parents":["core"],"depth":1,"angle":80,"text":"How many ships you command.","textPl":"Iloma statkami dowodzisz.","icon":"swarm"},
    {"id":"fleet","name":"Swarm size","namePl":"Wielkość roju","kind":"trait","branch":"hubSwarm","parents":["hubSwarm"],"depth":2,"angle":80,"cost":90,"levels":20,"growth":1.7,"effect":{"fleet":1},"text":"One more ship in the swarm per level.","textPl":"Jeden statek więcej w roju na każdy poziom.","icon":"ships"},
  ],
  "notes": ""
};

export const SPACE_CODE = {
  "format": "gamelab-tree",
  "version": 1,
  "name": "Space — programming",
  "view": "pcb",
  "background": "",
  "points": {
    "label": "pts",
    "labelPl": "pkt"
  },
  "branches": {
    "core": {"label":"PROGRAMMING","labelPl":"PROGRAMISTYCZNE","color":"#ffd98f"},
    "cpu": {"label":"CPU speed","labelPl":"Szybkość procesora","color":"#4fe3c6"},
    "memory": {"label":"Memory","labelPl":"Pamięć","color":"#f8bb56"},
    "bandwidth": {"label":"Link bandwidth","labelPl":"Przepustowość łącza","color":"#c7d0ff"},
    "threads": {"label":"Threads","labelPl":"Liczba wątków","color":"#ff9ea2"},
  },
  "nodes": [
    {"id":"codeRoot","name":"PROGRAMMING","namePl":"PROGRAMISTYCZNE","kind":"core","branch":"core","parents":[],"depth":0,"angle":0,"text":"Your units' computers: how much and how fast their programs can think.","textPl":"Komputery twoich jednostek: ile i jak szybko mogą myśleć ich programy.","icon":"code"},
    {"id":"cpu","name":"CPU speed","namePl":"Szybkość procesora","kind":"trait","branch":"cpu","parents":["codeRoot"],"depth":1,"angle":-68.6,"soon":true,"text":"More program steps per second.","textPl":"Więcej kroków programu na sekundę.","icon":"chip"},
    {"id":"overclock","name":"Overclock","namePl":"Podkręcanie","kind":"trait","branch":"cpu","parents":["cpu"],"depth":2,"angle":-80,"soon":true,"text":"A short burst of speed, paid for in heat.","textPl":"Krótki zryw szybkości, opłacony ciepłem.","icon":"gauge"},
    {"id":"cache","name":"Cache","namePl":"Pamięć podręczna","kind":"trait","branch":"cpu","parents":["cpu"],"depth":2,"angle":-57.1,"soon":true,"text":"Repeated calculations cost less.","textPl":"Powtarzane obliczenia kosztują mniej.","icon":"layers"},
    {"id":"memory","name":"Memory","namePl":"Pamięć","kind":"trait","branch":"memory","parents":["codeRoot"],"depth":1,"angle":-22.9,"soon":true,"text":"Longer programs, more variables.","textPl":"Dłuższe programy, więcej zmiennych.","icon":"memory"},
    {"id":"stack","name":"Deeper stack","namePl":"Głębszy stos","kind":"trait","branch":"memory","parents":["memory"],"depth":2,"angle":-34.3,"soon":true,"text":"Functions can call each other more deeply.","textPl":"Funkcje mogą się wywoływać głębiej.","icon":"stack"},
    {"id":"compress","name":"Compression","namePl":"Kompresja","kind":"trait","branch":"memory","parents":["memory"],"depth":2,"angle":-11.4,"soon":true,"text":"Programs take less memory.","textPl":"Programy zajmują mniej pamięci.","icon":"compress"},
    {"id":"bandwidth","name":"Link bandwidth","namePl":"Przepustowość łącza","kind":"trait","branch":"bandwidth","parents":["codeRoot"],"depth":1,"angle":22.9,"soon":true,"text":"Control units farther from the station, with less delay.","textPl":"Sterowanie jednostkami dalej od stacji, z mniejszym opóźnieniem.","icon":"antenna"},
    {"id":"relay","name":"Relays","namePl":"Przekaźniki","kind":"trait","branch":"bandwidth","parents":["bandwidth"],"depth":2,"angle":11.4,"soon":true,"text":"Units pass commands on to each other.","textPl":"Jednostki przekazują sobie rozkazy.","icon":"relay"},
    {"id":"range","name":"Control range","namePl":"Zasięg sterowania","kind":"trait","branch":"bandwidth","parents":["bandwidth"],"depth":2,"angle":34.3,"soon":true,"text":"Units stay under control farther away.","textPl":"Jednostki pozostają pod kontrolą dalej od stacji.","icon":"range"},
    {"id":"threads","name":"Threads","namePl":"Liczba wątków","kind":"trait","branch":"threads","parents":["codeRoot"],"depth":1,"angle":68.6,"soon":true,"text":"Run programs on more units at once.","textPl":"Programy na większej liczbie jednostek naraz.","icon":"threads"},
    {"id":"parallel","name":"Parallelism","namePl":"Równoległość","kind":"trait","branch":"threads","parents":["threads"],"depth":2,"angle":57.1,"soon":true,"text":"Units run in parallel without waiting for each other.","textPl":"Jednostki działają równolegle, bez czekania na siebie.","icon":"parallel"},
    {"id":"sync","name":"Synchronization","namePl":"Synchronizacja","kind":"trait","branch":"threads","parents":["threads"],"depth":2,"angle":80,"soon":true,"text":"Units act together at the same moment.","textPl":"Jednostki działają razem, w tej samej chwili.","icon":"sync"},
  ],
  "notes": ""
};
