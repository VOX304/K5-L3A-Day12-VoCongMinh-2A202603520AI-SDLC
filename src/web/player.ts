import * as THREE from 'three';

export interface PlayerMesh {
  group: THREE.Group;
  light: THREE.PointLight;
  update: (pos: [number, number, number], moveDir?: [number, number]) => void;
}

/**
 * Creates Mây using simple primitives:
 * - Body: #E8E2D0
 * - Scarf: #C8102E
 * - Conical nón lá hat with small hanging lantern
 * - Warm #FFB347 point light
 */
export function createPlayerMesh(): PlayerMesh {
  const group = new THREE.Group();

  // Body #E8E2D0
  const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.7, 8, 16);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: '#E8E2D0',
    roughness: 0.8,
    metalness: 0.05,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.7;
  group.add(body);

  // Scarf #C8102E
  const scarfGeo = new THREE.TorusGeometry(0.34, 0.09, 8, 20);
  const scarfMat = new THREE.MeshStandardMaterial({
    color: '#C8102E',
    roughness: 0.6,
  });
  const scarf = new THREE.Mesh(scarfGeo, scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.15;
  group.add(scarf);

  // Head
  const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({
    color: '#E8E2D0',
    roughness: 0.8,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.45;
  group.add(head);

  // Conical nón lá hat (#C9B48A)
  const hatGeo = new THREE.ConeGeometry(0.85, 0.4, 32);
  const hatMat = new THREE.MeshStandardMaterial({
    color: '#C9B48A',
    roughness: 0.9,
  });
  const hat = new THREE.Mesh(hatGeo, hatMat);
  hat.position.y = 1.75;
  group.add(hat);

  // Small hanging lantern on the hat rim
  const lanternAnchor = new THREE.Group();
  lanternAnchor.position.set(0.42, 1.6, 0.35);

  const cordGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.22, 6);
  const cordMat = new THREE.MeshBasicMaterial({ color: '#6B4A2F' });
  const cord = new THREE.Mesh(cordGeo, cordMat);
  cord.position.y = -0.11;
  lanternAnchor.add(cord);

  const miniLanternGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.14, 8);
  const miniLanternMat = new THREE.MeshStandardMaterial({
    color: '#FFB347',
    emissive: '#FFB347',
    emissiveIntensity: 0.95,
    roughness: 0.3,
  });
  const miniLantern = new THREE.Mesh(miniLanternGeo, miniLanternMat);
  miniLantern.position.y = -0.27;
  lanternAnchor.add(miniLantern);

  // Warm #FFB347 point light
  const light = new THREE.PointLight('#FFB347', 4.5, 9);
  light.position.y = -0.27;
  lanternAnchor.add(light);

  group.add(lanternAnchor);

  function update(pos: [number, number, number], moveDir?: [number, number]) {
    group.position.set(pos[0], pos[1], pos[2]);
    if (moveDir && (Math.abs(moveDir[0]) > 0.01 || Math.abs(moveDir[1]) > 0.01)) {
      const targetYaw = Math.atan2(moveDir[0], moveDir[1]);
      group.rotation.y = targetYaw;
    }
  }

  return { group, light, update };
}
