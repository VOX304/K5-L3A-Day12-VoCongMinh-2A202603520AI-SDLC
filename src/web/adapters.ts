import * as THREE from 'three';

// Removed entities release GPU resources, including when a new simulation is started.
function disposeGroup(group: THREE.Group): void {
  group.removeFromParent();
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

export interface LanternDef {
  id: string;
  pos: [number, number, number];
}

export const GREAT_LANTERNS_NIGHT1: LanternDef[] = [
  { id: 'L1', pos: [0, 0, 25] },
  { id: 'L2', pos: [23.8, 0, 7.7] },
  { id: 'L3', pos: [14.7, 0, -20.2] },
  { id: 'L4', pos: [-14.7, 0, -20.2] },
  { id: 'L5', pos: [-23.8, 0, 7.7] },
];

export interface LanternMeshItem {
  id: string;
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  coreMaterial: THREE.MeshStandardMaterial;
  frameMaterial: THREE.MeshStandardMaterial;
  light: THREE.PointLight;
  safeRing: THREE.Mesh;
  isLit: boolean;
}

export class LanternsManager {
  readonly items: LanternMeshItem[] = [];
  readonly group = new THREE.Group();

  constructor() {
    for (const def of GREAT_LANTERNS_NIGHT1) {
      const itemGroup = new THREE.Group();
      itemGroup.position.set(...def.pos);

      // Wooden base pillar #6B4A2F
      const pillarGeo = new THREE.CylinderGeometry(0.28, 0.35, 2.2, 12);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: '#6B4A2F',
        roughness: 0.9,
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.y = 1.1;
      itemGroup.add(pillar);

      // Frame / cage (unlit #5B5F6E, lit #FFB347)
      const frameGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.3, 8, 1, true);
      const frameMat = new THREE.MeshStandardMaterial({
        color: '#5B5F6E',
        roughness: 0.7,
        wireframe: true,
      });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.y = 2.45;
      itemGroup.add(frame);

      // Lantern roof cone
      const roofGeo = new THREE.ConeGeometry(0.95, 0.45, 8);
      const roofMat = new THREE.MeshStandardMaterial({
        color: '#6B4A2F',
        roughness: 0.85,
      });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 3.3;
      itemGroup.add(roof);

      // Core (unlit #5B5F6E, lit #FFB347 core #FFE9B0)
      const coreGeo = new THREE.SphereGeometry(0.42, 16, 16);
      const coreMat = new THREE.MeshStandardMaterial({
        color: '#5B5F6E',
        roughness: 0.8,
        emissive: '#000000',
        emissiveIntensity: 0,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.y = 2.45;
      itemGroup.add(coreMesh);

      // Warm PointLight
      const light = new THREE.PointLight('#FFB347', 0, 24);
      light.position.y = 2.45;
      itemGroup.add(light);

      // Safe radius visual ring (r=6m)
      const safeRingGeo = new THREE.RingGeometry(5.9, 6.05, 48);
      const safeRingMat = new THREE.MeshBasicMaterial({
        color: '#FFB347',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const safeRing = new THREE.Mesh(safeRingGeo, safeRingMat);
      safeRing.rotation.x = -Math.PI / 2;
      safeRing.position.y = 0.03;
      itemGroup.add(safeRing);

      this.group.add(itemGroup);
      this.items.push({
        id: def.id,
        group: itemGroup,
        coreMesh,
        coreMaterial: coreMat,
        frameMaterial: frameMat,
        light,
        safeRing,
        isLit: false,
      });
    }
  }

  /**
   * Synchronize state from simulation lanterns array if present.
   */
  syncState(simLanterns?: readonly { id: string; lit?: boolean; pos?: [number, number, number] }[]): { litCount: number; totalCount: number } {
    let litCount = 0;
    const totalCount = this.items.length;

    for (const item of this.items) {
      const found = simLanterns?.find((l) => l.id === item.id);
      if (found?.pos) item.group.position.set(...found.pos);
      else item.group.position.set(...GREAT_LANTERNS_NIGHT1.find((def) => def.id === item.id)!.pos);
      const isLit = Boolean(found?.lit);
      item.isLit = isLit;

      if (isLit) {
        litCount += 1;
        item.coreMaterial.color.set('#FFB347');
        item.coreMaterial.emissive.set('#FFE9B0');
        item.coreMaterial.emissiveIntensity = 1.3;
        item.frameMaterial.color.set('#FFB347');
        item.light.intensity = 15;
        (item.safeRing.material as THREE.MeshBasicMaterial).opacity = 0.25;
      } else {
        item.coreMaterial.color.set('#5B5F6E');
        item.coreMaterial.emissive.set('#000000');
        item.coreMaterial.emissiveIntensity = 0;
        item.frameMaterial.color.set('#5B5F6E');
        item.light.intensity = 0;
        (item.safeRing.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }

    return { litCount, totalCount };
  }
}

/**
 * Adapter for rendering motes from simulation state arrays (if present).
 * Mote colors: core #FFF6C2, aura #FFE58A
 */
export class MotesRenderAdapter {
  readonly group = new THREE.Group();
  private readonly meshes = new Map<string, THREE.Group>();

  update(
    motes: readonly { id?: string; pos: [number, number, number]; kind?: string }[] | undefined,
    elapsedSeconds: number,
  ): void {
    if (!motes || motes.length === 0) {
      if (this.meshes.size > 0) {
        for (const mesh of this.meshes.values()) {
          disposeGroup(mesh);
        }
        this.meshes.clear();
      }
      return;
    }

    const currentIds = new Set<string>();

    for (let i = 0; i < motes.length; i++) {
      const mote = motes[i]!;
      const id = mote.id ?? `mote_${i}`;
      currentIds.add(id);

      let item = this.meshes.get(id);
      if (!item) {
        item = new THREE.Group();

        // Core #FFF6C2
        const coreGeo = new THREE.SphereGeometry(0.18, 12, 12);
        const coreMat = new THREE.MeshBasicMaterial({ color: '#FFF6C2' });
        const core = new THREE.Mesh(coreGeo, coreMat);
        item.add(core);

        // Halo / aura #FFE58A
        const auraGeo = new THREE.SphereGeometry(0.32, 12, 12);
        const auraMat = new THREE.MeshBasicMaterial({
          color: '#FFE58A',
          transparent: true,
          opacity: 0.5,
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        item.add(aura);

        // Soft point light
        const light = new THREE.PointLight('#FFE58A', 1.2, 4);
        item.add(light);

        this.meshes.set(id, item);
        this.group.add(item);
      }

      // Floating / bobbing animation
      const bob = Math.sin(elapsedSeconds * 3 + i) * 0.1;
      item.position.set(mote.pos[0], mote.pos[1] + 0.35 + bob, mote.pos[2]);
    }

    // Remove deleted motes
    for (const [id, mesh] of this.meshes.entries()) {
      if (!currentIds.has(id)) {
        disposeGroup(mesh);
        this.meshes.delete(id);
      }
    }
  }
}

/**
 * Adapter for rendering shades from simulation state arrays (if present).
 * Shade colors: body #120A1A, rim #7A3CFF, stunned #3A3450
 */
export class ShadesRenderAdapter {
  readonly group = new THREE.Group();
  private readonly meshes = new Map<
    string,
    {
      group: THREE.Group;
      bodyMesh: THREE.Mesh;
      bodyMat: THREE.MeshStandardMaterial;
      rimMesh: THREE.Mesh;
      rimMat: THREE.MeshBasicMaterial;
    }
  >();

  update(
    shades: readonly { id?: string; pos: [number, number, number]; state?: string }[] | undefined,
    elapsedSeconds: number,
  ): void {
    if (!shades || shades.length === 0) {
      if (this.meshes.size > 0) {
        for (const item of this.meshes.values()) {
          disposeGroup(item.group);
        }
        this.meshes.clear();
      }
      return;
    }

    const currentIds = new Set<string>();

    for (let i = 0; i < shades.length; i++) {
      const shade = shades[i]!;
      const id = shade.id ?? `shade_${i}`;
      currentIds.add(id);

      let item = this.meshes.get(id);
      if (!item) {
        const shadeGroup = new THREE.Group();

        // Body: #120A1A
        const bodyGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: '#120A1A',
          roughness: 0.7,
        });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 0;
        shadeGroup.add(bodyMesh);

        // Rim / aura: #7A3CFF
        const rimGeo = new THREE.SphereGeometry(0.56, 16, 16);
        const rimMat = new THREE.MeshBasicMaterial({
          color: '#7A3CFF',
          wireframe: true,
          transparent: true,
          opacity: 0.6,
        });
        const rimMesh = new THREE.Mesh(rimGeo, rimMat);
        rimMesh.position.y = 0;
        shadeGroup.add(rimMesh);

        item = { group: shadeGroup, bodyMesh, bodyMat, rimMesh, rimMat };
        this.meshes.set(id, item);
        this.group.add(shadeGroup);
      }

      // Update state appearance
      const isStunned = shade.state === 'stunned';
      if (isStunned) {
        item.bodyMat.color.set('#3A3450');
        item.rimMat.color.set('#3A3450');
        item.rimMat.opacity = 0.2;
      } else {
        item.bodyMat.color.set('#120A1A');
        item.rimMat.color.set('#7A3CFF');
        item.rimMat.opacity = 0.6;
      }

      const sway = Math.sin(elapsedSeconds * 4 + i) * 0.05;
      item.group.position.set(shade.pos[0], shade.pos[1] + sway, shade.pos[2]);
    }

    for (const [id, item] of this.meshes.entries()) {
      if (!currentIds.has(id)) {
        disposeGroup(item.group);
        this.meshes.delete(id);
      }
    }
  }
}
