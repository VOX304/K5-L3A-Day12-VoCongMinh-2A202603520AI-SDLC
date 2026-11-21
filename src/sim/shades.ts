import { distanceXZ, nearestUnlit, ring } from './night1.js';
import type { SeededRandom } from './random.js';
import { TUNING as T } from './tuning.js';
import type { GameEvent, Lantern, Scenario, ShadeView, Vec2, Vec3 } from './types.js';

const EPS = 1e-10;
const SPAWN_POINTS = ring(37, 12, 15, 1);

interface Shade extends ShadeView {
  until: number;
  push: Vec2;
  ejected: boolean;
}

function direction(from: Vec3, to: Vec3): Vec2 {
  const d = distanceXZ(from, to);
  return d === 0 ? [1, 0] : [(to[0] - from[0]) / d, (to[2] - from[2]) / d];
}

function shift(pos: Vec3, dir: Vec2, amount: number): Vec3 {
  return [pos[0] + dir[0] * amount, pos[1], pos[2] + dir[1] * amount];
}

function byId(a: Shade, b: Shade): number {
  const left = /^(.*?)(\d+)$/.exec(a.id);
  const right = /^(.*?)(\d+)$/.exec(b.id);
  if (left && right && left[1] === right[1]) {
    const diff = Number(left[2]) - Number(right[2]);
    if (diff) return diff;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// Clip the movement segment at the first safe circle or island edge.
function travel(shade: Shade, dir: Vec2, amount: number, safe: Lantern[]) {
  if (amount === 0) return;
  const [x,,z] = shade.pos;
  const along = x * dir[0] + z * dir[1];
  const islandExit = -along + Math.sqrt(Math.max(0, along ** 2 + T.island_radius_night1 ** 2 - x*x - z*z));
  let step = Math.min(amount, Math.max(0, islandExit));
  for (const lantern of safe) {
    const dx = x - lantern.pos[0], dz = z - lantern.pos[2];
    const toward = -(dx * dir[0] + dz * dir[1]);
    const discriminant = toward ** 2 - (dx*dx + dz*dz - T.safe_radius ** 2);
    if (toward > 0 && discriminant > EPS) step = Math.min(step, Math.max(0, toward - Math.sqrt(discriminant)));
  }
  shade.pos = shift(shade.pos, dir, step);
}

// End of the connected union of safe circles along a ray starting inside one.
function escapePoint(pos: Vec3, dir: Vec2, safe: Lantern[]): Vec3 {
  const intervals = safe.flatMap(({ pos: center }) => {
    const dx = center[0] - pos[0], dz = center[2] - pos[2];
    const along = dx * dir[0] + dz * dir[1];
    const disc = T.safe_radius ** 2 - (dx * dir[1] - dz * dir[0]) ** 2;
    return disc <= 0 ? [] : [[along - Math.sqrt(disc), along + Math.sqrt(disc)] as Vec2];
  }).sort((a,b) => a[0] - b[0]);
  let distance = 0;
  for (const [start, end] of intervals) {
    if (start > distance + EPS) break;
    distance = Math.max(distance, end);
  }
  return shift(pos, dir, distance);
}

export class ShadePopulation {
  readonly shades: Shade[] = [];
  private readonly scheduled: boolean;
  private readonly ids: Set<string>;
  private nextId = 1;

  constructor(scenario: Scenario, private readonly random: SeededRandom) {
    this.scheduled = scenario.random_shades ?? true;
    this.ids = new Set(scenario.shades?.flatMap(s => s.id ? [s.id] : []));
    for (const s of scenario.shades ?? []) this.add(s.pos, s.id, 'wander', 0);
  }

  private add(pos: Vec3, id: string | undefined, state: Shade['state'], until: number): string {
    if (!id) {
      do { id = 'S' + this.nextId++; } while (this.ids.has(id));
    }
    this.ids.add(id);
    this.shades.push({ id, pos: [...pos], state, until, push: [1,0], ejected: false });
    this.shades.sort(byId);
    return id;
  }

  expireTimers(tick: number) {
    for (const shade of this.shades) {
      if (shade.until && tick >= shade.until) {
        shade.state = 'wander';
        shade.until = 0;
      }
    }
  }

  updateSafety(safe: Lantern[]) {
    for (const shade of this.shades) {
      const inside = safe.find(l => distanceXZ(l.pos, shade.pos) < T.safe_radius - EPS);
      shade.ejected = !!inside;
      if (!inside) continue;
      const outward = direction(inside.pos, shade.pos);
      let dest = escapePoint(shade.pos, outward, safe);
      if (Math.hypot(dest[0], dest[2]) > T.island_radius_night1) {
        dest = escapePoint(shade.pos, direction(shade.pos, [0,0,0]), safe);
      }
      shade.pos = dest;
    }
  }

  pulse(player: Vec3, tick: number): string[] {
    const ids: string[] = [];
    for (const s of this.shades) {
      if (Math.hypot(distanceXZ(s.pos, player), s.pos[1] - player[1] - T.pulse_center_height) > T.pulse_radius + EPS) continue;
      s.state = 'stunned';
      s.until = tick + T.pulse_stun_s * T.ticks_per_second;
      s.push = direction(player, s.pos);
      ids.push(s.id);
    }
    return ids;
  }

  move(player: Vec3, lanterns: Lantern[], safe: Lantern[], tick: number) {
    for (const s of this.shades) {
      if (s.state === 'spawning') continue;
      if (s.state === 'stunned') {
        const age = tick - (s.until - T.pulse_stun_s * T.ticks_per_second);
        if (age < T.pulse_push_ticks) travel(s, s.push, T.pulse_push_m / T.pulse_push_ticks, safe);
        continue;
      }
      if (s.state === 'recoil') {
        travel(s, s.push, T.shade_recoil_m / T.shade_recoil_ticks, safe);
        continue;
      }
      const distance = distanceXZ(s.pos, player);
      if (distance <= T.shade_detect_radius + EPS) s.state = 'chase';
      else if (distance > T.shade_lose_radius + EPS) s.state = 'wander';
      const target = s.state === 'chase' ? player : nearestUnlit(s.pos, lanterns)?.pos;
      if (target) travel(s, direction(s.pos, target), Math.min(distanceXZ(s.pos, target), T.shade_speed / T.ticks_per_second), safe);
    }
  }

  contact(player: Vec3, safe: Lantern[], tick: number): boolean {
    if (safe.some(l => distanceXZ(player, l.pos) <= T.safe_radius + EPS)) return false;
    const attacker = this.shades.find(s => !s.ejected && (s.state === 'chase' || s.state === 'wander') &&
      distanceXZ(s.pos, player) <= T.shade_hit_radius + EPS && Math.abs(s.pos[1] - player[1]) <= T.contact_height);
    if (!attacker) return false;
    attacker.state = 'recoil';
    attacker.push = direction(player, attacker.pos);
    attacker.until = tick + T.shade_recoil_ticks + 1;
    return true;
  }

  spawn(player: Vec3, safe: Lantern[], tick: number, events: GameEvent[]) {
    if (!this.scheduled || tick < T.shade_first_spawn || (tick - T.shade_first_spawn) % T.shade_spawn_interval !== 0) return;
    const free = SPAWN_POINTS.filter(pos => distanceXZ(pos, player) >= T.shade_spawn_distance - EPS &&
      safe.every(l => distanceXZ(l.pos, pos) > T.safe_radius) && this.shades.every(s => distanceXZ(s.pos, pos) > EPS));
    const count = Math.min(tick === T.shade_first_spawn ? 2 : 1, T.shade_cap - this.shades.length, free.length);
    for (let i = 0; i < count; i++) {
      const [pos] = free.splice(Math.floor(this.random.next() * free.length), 1);
      const id = this.add(pos!, undefined, 'spawning', tick + T.shade_spawn_ticks);
      events.push({ type: 'event', tick, name: 'shade_spawned', data: { id } });
    }
  }
}
