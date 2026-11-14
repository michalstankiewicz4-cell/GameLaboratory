// Spis modeli: podgląd modeli (models.html) i doktor modeli (tools/doctor.mjs) biorą listę stąd.
// Każdy wpis: { id, label, group, load: () => import(moduł) } — moduł eksportuje build(lod) i info.
export const MODELS = [
  { id: 'tire-car', label: 'Opona samochodowa', group: 'Przedmioty', load: () => import('./items/tire-car.js') },
  { id: 'tire-bike', label: 'Opona rowerowa', group: 'Przedmioty', load: () => import('./items/tire-bike.js') },
  { id: 'tire-tractor', label: 'Opona traktorowa', group: 'Przedmioty', load: () => import('./items/tire-tractor.js') },
  { id: 'can', label: 'Puszka aluminiowa', group: 'Przedmioty', load: () => import('./items/can.js') },
  { id: 'can-crushed', label: 'Puszka zgnieciona', group: 'Przedmioty', load: () => import('./items/can-crushed.js') },
  { id: 'pot', label: 'Garnek', group: 'Przedmioty', load: () => import('./items/pot.js') },
  { id: 'newspapers', label: 'Gazety (związane)', group: 'Przedmioty', load: () => import('./items/newspapers.js') },
  { id: 'box', label: 'Karton zamknięty', group: 'Przedmioty', load: () => import('./items/box.js') },
  { id: 'barrel', label: 'Beczka metalowa', group: 'Przedmioty', load: () => import('./items/barrel.js') },
  { id: 'platform', label: 'Platforma', group: 'Otoczenie', load: () => import('./world/platform.js') },
  { id: 'furnace-paper', label: 'Piec na papier', group: 'Maszyny', load: () => import('./machines/furnace-paper.js') },
  { id: 'can-crusher', label: 'Zgniatarka do puszek', group: 'Maszyny', load: () => import('./machines/can-crusher.js') },
  { id: 'metal-crusher', label: 'Zgniatarka do metalu', group: 'Maszyny', load: () => import('./machines/metal-crusher.js') },
  { id: 'induction-furnace', label: 'Piec indukcyjny', group: 'Maszyny', load: () => import('./machines/induction-furnace.js') },
  { id: 'ingot', label: 'Sztabka', group: 'Przedmioty', load: () => import('./items/ingot.js') },
  { id: 'casting-line', label: 'Linia odlewnicza', group: 'Maszyny', load: () => import('./machines/casting-line.js') },
];
