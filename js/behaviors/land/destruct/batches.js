// Rysowanie wszystkich części i odłamków: jeden BatchedMesh na materiał (jedno wywołanie rysowania na materiał,
// niezależnie od liczby kawałków). Każdy kawałek: własna siatka w batchu i jedna instancja z macierzą i barwą.
// Pamięć rośnie sama (podwaja się), a zwolnione miejsca odzyskuje optimize().
// GPU: nieprzezroczyste batche bez odrzucania kawałków poza kadrem na CPU (karta rysuje wszystkie widoczne kawałki —
// bez pętli po dziesiątkach tysięcy części przy każdym przebiegu obrazu i cieni); szkło zostaje sortowane (przezroczyste).
// Zmiana macierzy lub barwy kawałka wysyła na kartę tylko jego wiersz tekstury (js/render/partial-upload.js).
// createBatches(scene) → { add(geometry, matId, matrix, color?) → handle, set(handle, matrix), color(handle, c),
//   remove(handle), prepare(matId), stats() → { geoms, verts, draws }, clear() }
import * as THREE from '../../../../vendor/three/three.module.js';
import { renderMaterial, MATS } from '../../../models/houses/materials.js';
import { touchTex } from '../../../render/partial-upload.js';

// macierz instancji = 4 teksele RGBA (16 liczb), barwa = 1 teksel (szerokość tekstur jest wielokrotnością 4)
function setM(mesh, iid, M) { mesh.setMatrixAt(iid, M); touchTex(mesh._matricesTexture, iid * 16, 16); }
function setC(mesh, iid, c) { mesh.setColorAt(iid, c); touchTex(mesh._colorsTexture, iid * 4, 4); }

export function createBatches(scene) {
  const B = new Map();   // matId → { mesh, verts, idx, inst, liveV, liveI, dead }
  const W = new THREE.Color(1, 1, 1);
  function make(matId, maxI = 512, maxV = 65536, maxX = 131072) {
    const mesh = new THREE.BatchedMesh(maxI, maxV, maxX, renderMaterial(matId));
    mesh.castShadow = !MATS[matId].glass; mesh.receiveShadow = true; mesh.name = 'batch-' + matId;
    const glass = !!MATS[matId].glass;
    mesh.perObjectFrustumCulled = glass; mesh.sortObjects = glass;
    mesh.frustumCulled = false;   // kawałki rozlatują się po całej mapie — granice batcha i tak obejmują świat
    scene.add(mesh);
    return { mesh, maxI, maxV, maxX, usedV: 0, usedX: 0, n: 0, dead: 0 };
  }
  function grow(b, matId, needV, needX) {
    // najpierw odzysk zwolnionego miejsca, potem większe bufory
    if (b.dead > 0) { b.mesh.optimize(); b.dead = 0; recount(b); }
    if (b.usedV + needV <= b.maxV && b.usedX + needX <= b.maxX && b.n < b.maxI) return;
    while (b.usedV + needV > b.maxV || b.usedX + needX > b.maxX) { b.maxV *= 2; b.maxX *= 2; }
    b.mesh.setGeometrySize(b.maxV, b.maxX);
    if (b.n >= b.maxI) { b.maxI *= 2; b.mesh.setInstanceCount(b.maxI); }
  }
  function recount(b) {
    let v = 0, x = 0;
    for (const g of b.mesh._geometryInfo) if (g.active) { v = Math.max(v, g.vertexStart + g.reservedVertexCount); x = Math.max(x, g.indexStart + g.reservedIndexCount); }
    b.usedV = v; b.usedX = x;
  }
  return {
    add(geo, matId, matrix, color) {
      let b = B.get(matId); if (!b) { b = make(matId); B.set(matId, b); }
      const nv = geo.attributes.position.count, nx = geo.index.count;
      if (b.usedV + nv > b.maxV || b.usedX + nx > b.maxX || b.n >= b.maxI) grow(b, matId, nv, nx);
      if (b.n >= b.maxI) { b.maxI *= 2; b.mesh.setInstanceCount(b.maxI); }
      const gid = b.mesh.addGeometry(geo), iid = b.mesh.addInstance(gid);
      b.usedV += nv; b.usedX += nx; b.n++;
      setM(b.mesh, iid, matrix); setC(b.mesh, iid, color || W);
      return { b, gid, iid, matId };
    },
    // batch materiału gotowy zawczasu (tekstury MatKit liczone przy ładowaniu, nie przy pierwszym kawałku)
    prepare(matId) { if (!B.has(matId)) B.set(matId, make(matId)); },
    set(h, matrix) { setM(h.b.mesh, h.iid, matrix); },
    color(h, c) { setC(h.b.mesh, h.iid, c); },
    visible(h, on) { if (h && !h.dead) h.b.mesh.setVisibleAt(h.iid, on); },
    remove(h) { if (!h || h.dead) return; h.b.mesh.deleteGeometry(h.gid); h.b.n--; h.b.dead++; h.dead = true; },
    stats() { let geoms = 0, verts = 0; for (const b of B.values()) { geoms += b.n; verts += b.usedV; } return { geoms, verts, draws: B.size }; },
    clear() { for (const b of B.values()) { scene.remove(b.mesh); b.mesh.dispose(); } B.clear(); },
    meshes: () => [...B.values()].map((b) => b.mesh),
  };
}
