// JunkKit — modele ze Złomowiska (repo Trash, z historią): przedmioty, maszyny, otoczenie i pojazd, budowane kodem
// w prawdziwej skali (metry, kg), bez DOM (działają w Node — doktor modeli). Każdy moduł eksportuje build(lod, wariant)
// i info { id, name, version, mass, material, crush, minScale, collider, variants? }; materiały — materials.js (dane),
// tekstury proceduralne w przeglądarce — textures.js (applyTextures, MatKit), zderzacz → części wypukłe — shapes.js.
// Gdzie oglądane: przedmioty — laboratorium przedmiotów (labs/items.html), maszyny i otoczenie — laboratorium budowli
// (labs/structures.html), pojazd — laboratorium pojazdów, ląd. W edytorze sceny: rodzina prefabrykatów „Junkyard”.
// Wpis: { id, name (EN), namePl, group: 'items' | 'machines' | 'world' | 'vehicle', load: () => import(moduł) }.
export const GROUPS = {
  items: { label: 'Items', labelPl: 'Przedmioty' },
  machines: { label: 'Machines', labelPl: 'Maszyny' },
  world: { label: 'Surroundings', labelPl: 'Otoczenie' },
  vehicle: { label: 'Vehicle', labelPl: 'Pojazd' },
};
export const MODELS = [
  { id: 'tire-car', name: 'Car tyre', namePl: 'Opona samochodowa', group: 'items', load: () => import('./items/tire-car.js') },
  { id: 'tire-bike', name: 'Bicycle tyre', namePl: 'Opona rowerowa', group: 'items', load: () => import('./items/tire-bike.js') },
  { id: 'tire-tractor', name: 'Tractor tyre', namePl: 'Opona traktorowa', group: 'items', load: () => import('./items/tire-tractor.js') },
  { id: 'can', name: 'Aluminium can', namePl: 'Puszka aluminiowa', group: 'items', load: () => import('./items/can.js') },
  { id: 'can-crushed', name: 'Crushed can', namePl: 'Puszka zgnieciona', group: 'items', load: () => import('./items/can-crushed.js') },
  { id: 'pot', name: 'Cooking pot', namePl: 'Garnek', group: 'items', load: () => import('./items/pot.js') },
  { id: 'newspapers', name: 'Newspapers (tied)', namePl: 'Gazety (związane)', group: 'items', load: () => import('./items/newspapers.js') },
  { id: 'box', name: 'Closed cardboard box', namePl: 'Karton zamknięty', group: 'items', load: () => import('./items/box.js') },
  { id: 'barrel', name: 'Steel drum', namePl: 'Beczka metalowa', group: 'items', load: () => import('./items/barrel.js') },
  { id: 'ingot', name: 'Ingot', namePl: 'Sztabka', group: 'items', load: () => import('./items/ingot.js') },
  { id: 'ingot-small', name: 'Small ingot', namePl: 'Mała sztabka', group: 'items', load: () => import('./items/ingot-small.js') },
  { id: 'furnace-paper', name: 'Paper furnace', namePl: 'Piec na papier', group: 'machines', load: () => import('./machines/furnace-paper.js') },
  { id: 'can-crusher', name: 'Can crusher', namePl: 'Zgniatarka do puszek', group: 'machines', load: () => import('./machines/can-crusher.js') },
  { id: 'metal-crusher', name: 'Metal crusher', namePl: 'Zgniatarka do metalu', group: 'machines', load: () => import('./machines/metal-crusher.js') },
  { id: 'induction-furnace', name: 'Induction furnace', namePl: 'Piec indukcyjny', group: 'machines', load: () => import('./machines/induction-furnace.js') },
  { id: 'casting-line', name: 'Casting line', namePl: 'Linia odlewnicza', group: 'machines', load: () => import('./machines/casting-line.js') },
  { id: 'platform', name: 'Platform', namePl: 'Platforma', group: 'world', load: () => import('./world/platform.js') },
  { id: 'fence', name: 'Fence with a gate', namePl: 'Ogrodzenie', group: 'world', load: () => import('./world/fence.js') },
  { id: 'buyback', name: 'Buyback point', namePl: 'Punkt skupu', group: 'world', load: () => import('./world/buyback.js') },
  { id: 'grapple-truck', name: 'Grapple loader', namePl: 'Pojazd z chwytakiem', group: 'vehicle', load: () => import('./vehicle/grapple-truck.js') },
];
export const junkEntry = (id) => MODELS.find((m) => m.id === id) || null;
export const junkName = (m, pl) => (pl ? m.namePl : m.name);
