import type { Lantern, Vec3 } from './types.js';

export const LANTERN_POSITIONS: Vec3[] = [
  [0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7],
];

export function ring(radius: number, count: number, offsetDegrees = 0, height = 0): Vec3[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = index * 2 * Math.PI / count + offsetDegrees * Math.PI / 180;
    return [radius * Math.cos(angle), height, radius * Math.sin(angle)];
  });
}

export const MOTE_POINTS = [...ring(12, 8), ...ring(33, 16)];

export function distanceXZ(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

// Lanterns are stored in numeric id order, so equal distances retain the lower id.
export function nearestUnlit(pos: Vec3, lanterns: Lantern[]): Lantern | undefined {
  let nearest: Lantern | undefined;
  let best = Infinity;
  for (const lantern of lanterns) {
    const distance = distanceXZ(pos, lantern.pos);
    if (!lantern.lit && distance < best) {
      best = distance;
      nearest = lantern;
    }
  }
  return nearest;
}
