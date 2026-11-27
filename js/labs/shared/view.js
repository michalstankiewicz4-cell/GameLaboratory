// Widok laboratorium w wolnym środku ekranu (window.LabView — ui/shell/windows.js; bez niego cały ekran):
//   viewSize() → { w, h, x, y }                          rozmiar i położenie widoku
//   fitTo(renderer, camera, ...extra)                     renderer i kamera na rozmiar widoku, extra.resize(w, h) — potok
//                                                         obrazu, widzenie (laboratorium woła to w swoim resize())
export const viewSize = () => (window.LabView && window.LabView.size ? window.LabView.size() : { w: innerWidth, h: innerHeight, x: 0, y: 0 });
export function fitTo(renderer, camera, ...extra) {
  const v = viewSize();
  renderer.setSize(v.w, v.h, false); camera.aspect = v.w / v.h; camera.updateProjectionMatrix();
  for (const x of extra) if (x) x.resize(v.w, v.h);
  return v;
}
