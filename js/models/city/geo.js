// CityKit — zbieranie geometrii: trójkąty pogrupowane po materiale (jedna siatka i jedno wywołanie rysowania na
// materiał), ściany w układzie fasady (u wzdłuż ściany, v w górę, z na zewnątrz) przeliczane na świat.
import * as THREE from '../../../vendor/three/three.module.js';

export function createGeo() {
  const groups = new Map();
  const g = (m) => { let x = groups.get(m); if (!x) groups.set(m, x = { p: [], n: [], uv: [], cell: null }); return x; };
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3();
  return {
    groups,
    /** Czworokąt p0…p3 (świat) z normalną n; kolejność wierzchołków poprawiana tak, by był widoczny od strony n. */
    quad(m, p, n, uv, cell) {
      A.fromArray(p[1]).sub(B.fromArray(p[0])); C.fromArray(p[2]).sub(B); N.crossVectors(A, C);
      const flip = N.dot(B.fromArray(n)) < 0, o = flip ? [0, 3, 2, 1] : [0, 1, 2, 3];
      const q = g(m);
      for (const i of [o[0], o[1], o[2], o[0], o[2], o[3]]) {
        q.p.push(p[i][0], p[i][1], p[i][2]); q.n.push(n[0], n[1], n[2]); q.uv.push(uv[i][0], uv[i][1]);
        if (cell) (q.cell || (q.cell = [])).push(cell[0], cell[1]);
      }
    },
    /** Trójkąt (świat) z normalną n (odwracany jak quad). */
    tri(m, p, n, uv) {
      A.fromArray(p[1]).sub(B.fromArray(p[0])); C.fromArray(p[2]).sub(B); N.crossVectors(A, C);
      const o = N.dot(B.fromArray(n)) < 0 ? [0, 2, 1] : [0, 1, 2], q = g(m);
      for (const i of o) { q.p.push(p[i][0], p[i][1], p[i][2]); q.n.push(n[0], n[1], n[2]); q.uv.push(uv[i][0], uv[i][1]); }
    },
    /** Siatki: materiał z mats(m) (null — pomijany). */
    meshes(mats) {
      const out = [];
      for (const [m, q] of groups) {
        const mat = mats(m); if (!mat || !q.p.length) continue;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(q.p, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(q.n, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(q.uv, 2));
        if (q.cell) geo.setAttribute('aCell', new THREE.Float32BufferAttribute(q.cell, 2));
        geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, mat); mesh.name = m; mesh.castShadow = mesh.receiveShadow = true;
        out.push(mesh);
      }
      return out;
    },
  };
}

/** Ściana e (krawędź obrysu z layout.js): punkt fasady (u, v, z) → świat [x, y, z]; kierunek (nu, nv, nz) → świat. */
export function facadeFrame(e) {
  const [ax, az] = e.a, [dx, dz] = e.dir, [nx, nz] = e.nrm;
  return {
    P: (u, v, z) => [ax + dx * u + nx * z, v, az + dz * u + nz * z],
    D: (nu, nv, nz2) => [dx * nu + nx * nz2, nv, dz * nu + nz * nz2],
  };
}
