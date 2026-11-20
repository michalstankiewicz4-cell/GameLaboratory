// Wygięcie belki w łuk (z gry Złomowisko, js/vehicle/truck.js#bowMaterial): materiał części przesuwa wierzchołki
// w dół o 4·u·(1 − u)·uBow (u — położenie wzdłuż belki 0…długość, końce zostają na miejscu). Wysięgnik i ramię
// przeładowarki uginają się pod ciężarem (zachowanie land/grapple.js ustawia uBow z kąta ugięcia).
// bowMaterial(mesh, długość) → { value } (uBow, m) i mesh.userData.bowRestore() — przywraca materiał.
export function bowMaterial(mesh, L) {
  const u = { value: 0 }, orig = mesh.material, m = orig.clone();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBow = u; sh.uniforms.uLen = { value: L };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uBow; uniform float uLen;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat bu = clamp(transformed.z / uLen, 0.0, 1.0); transformed.y -= 4.0 * bu * (1.0 - bu) * uBow;');
  };
  m.customProgramCacheKey = () => 'bow-' + L;
  mesh.material = m;
  mesh.userData.bowRestore = () => { mesh.material = orig; m.dispose(); };
  return u;
}
