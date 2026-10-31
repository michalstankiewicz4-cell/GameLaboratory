// Model doctor — the test bench: a deliberately broken model with one mistake for every check.
// Proves each check still finds what it should.
import * as THREE from '../../../vendor/three/three.module.js';

export function testBench() {
  const root = new THREE.Group(), M = (c) => new THREE.MeshStandardMaterial({ color: c });
  const grey = M(0x8a949c), red = M(0xb04030), blue = M(0x3060a0);
  const put = (name, geo, mat, x, y, z, parent = root) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(x, y, z); parent.add(m); return m; };
  const hull = new THREE.Group(); hull.name = 'hull'; hull.userData.part = true; root.add(hull);
  put('hull box', new THREE.BoxGeometry(4, 2, 20), grey, 0, 1, 0, hull);
  const bad = new THREE.BoxGeometry(1, 1, 1); bad.attributes.position.setX(0, NaN);
  bad.boundingBox = new THREE.Box3(new THREE.Vector3(-0.5, -0.5, -0.5), new THREE.Vector3(0.5, 0.5, 0.5)); bad.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.87);   // so three.js itself does not complain
  put('nan box', bad, grey, 0, 2.5, 8);
  const inv = new THREE.BoxGeometry(1, 1, 1); inv.scale(-1, 1, 1);
  put('inside-out box', inv, grey, 0, 2.5, 6);
  put('zfight A', new THREE.BoxGeometry(1, 1, 1), red, 0, 2.5, 4); put('zfight B', new THREE.BoxGeometry(0.6, 1, 0.6), blue, 0.6, 2.5, 4);
  const tube = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 16, 1, true);
  const ti = tube.index.array; for (let i = 0; i < ti.length; i += 3) { const k = ti[i]; ti[i] = ti[i + 1]; ti[i + 1] = k; }
  put('inward tube', tube, grey, -1.2, 2.6, 7);
  const cup = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), cp = cup.attributes.position.array.slice(18);   // a box missing its +x side
  const cupG = new THREE.BufferGeometry(); cupG.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); cupG.computeVertexNormals();
  put('box with a missing side', cupG, grey, 1.4, 2.5, 7);
  put('floating box', new THREE.BoxGeometry(1, 1, 1), grey, 0, 7, 2);
  put('crate under water', new THREE.BoxGeometry(1, 1, 1), grey, 0, -0.5, 0);
  put('fender through the side', new THREE.BoxGeometry(0.5, 0.5, 0.5), grey, 2.1, 1, -2);
  put('hidden box', new THREE.BoxGeometry(0.5, 0.5, 0.5), red, -1, 1, -4);
  put('speck', new THREE.BoxGeometry(0.02, 0.02, 0.02), grey, -1, 2.01, -6);
  const nv = [], N = 12;
  for (let i = 0; i < N; i++) nv.push(-1.5, 2.01, -7 + i * 0.1, 1.5, 2.01, -7 + i * 0.1 + 0.002, 1.5, 2.015, -7 + i * 0.1);
  const sl = new THREE.BufferGeometry(); sl.setAttribute('position', new THREE.Float32BufferAttribute(nv, 3)); sl.computeVertexNormals();
  put('needles', sl, new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.DoubleSide }), 0, 0, 0);
  const mount = new THREE.Group(); mount.name = 'gun mount'; mount.userData.part = true; mount.position.set(0, 2, -9); root.add(mount);
  put('mount base', new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16), grey, 0, 0.2, 0, mount);
  const gun = new THREE.Group(); gun.position.set(0, 0.6, 0); mount.add(gun);
  put('barrel', new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8).rotateX(Math.PI / 2).translate(0, 0, 1.25), grey, 0, 0, 0, gun);
  put('wall in the line of fire', new THREE.BoxGeometry(1.2, 1.4, 0.2), grey, 0, 2.7, -7.6);
  return {
    root, measured: { triangles: 999999, drawCalls: 999, materials: 4 },
    opts: { mounts: [{ name: 'test gun', group: mount, train: mount, guns: [gun], arc: 90 }], waterline: true, below: (n) => n.startsWith('hull'),
      hullSide: (z) => (Math.abs(z) < 10 ? 2 : -1), deck: () => 2, budget: { triangles: 1000, drawCalls: 10, measured: { triangles: 999999, drawCalls: 999 } } },
  };
}

export const models = [{ id: 'test/bench', label: 'Test bench', sub: 'one mistake per check', family: 'test', kind: 'test', build: testBench }];
