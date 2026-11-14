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
];
