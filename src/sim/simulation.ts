import { defaultInput, pressedButtons } from './input.js';
import { SeededRandom } from './random.js';
import { distanceXZ, LANTERN_POSITIONS, MOTE_POINTS, nearestUnlit } from './night1.js';
import { ShadePopulation } from './shades.js';
import { TUNING } from './tuning.js';
import type { Button, EndLine, GameEvent, GameState, InputState, Lantern, Mote, Scenario, Snapshot, Vec2, Vec3 } from './types.js';

// Absorb accumulated floating-point error at exact terrain/height boundaries.
const PHYSICS_EPSILON = 1e-12;

export function movementDirection(move: Vec2, yawDegrees: number): Vec2 {
  const length = Math.hypot(...move);
  const scale = length > 1 ? 1 / length : 1;
  const x = move[0] * scale;
  const z = move[1] * scale;
  const theta = (yawDegrees % 360) * Math.PI / 180;
  return [x * Math.cos(theta) + z * Math.sin(theta), -x * Math.sin(theta) + z * Math.cos(theta)];
}

function rounded(value: number): number {
  const result = Math.round(value * 1000) / 1000;
  return Object.is(result, -0) ? 0 : result;
}

/** Pure gameplay state. No browser, Node, Three.js, timers or IO. */
export class Simulation {
  tick = 0;
  state: GameState = 'playing';
  score = 0;
  readonly player: { pos: Vec3; flames: number; carried: number; vel: Vec3; grounded: boolean; invulnTicks: number; respawnTicks: number };
  readonly random: SeededRandom;
  private readonly startingTime: number;
  readonly lanterns: Lantern[];
  readonly enemies: ShadePopulation;
  private pulseReadyTick = 0;
  motes: (Mote & { expires: number | undefined })[] = [];
  private nextMoteId = 1;
  private readonly randomMotes: boolean;
  private previousInput = defaultInput();

  constructor(seed: number, scenario: Scenario = {}) {
    this.random = new SeededRandom(seed);
    this.startingTime = scenario.time_left_s ?? TUNING.night1_duration_s;
    this.player = {
      pos: [...(scenario.player?.pos ?? [0, 0, 0])],
      flames: scenario.player?.flames ?? TUNING.flames,
      carried: Math.min(scenario.player?.carried ?? 0, TUNING.carry_capacity),
      vel: [0, 0, 0],
      grounded: false,
      invulnTicks: 0,
      respawnTicks: 0,
    };
    this.lanterns = LANTERN_POSITIONS.map((base, index) => {
      const id = 'L' + (index + 1);
      const patch = scenario.lanterns?.find(lantern => lantern.id === id);
      const deposited = Math.min(patch?.deposited ?? 0, TUNING.lantern_cost);
      const lit = patch?.lit ?? deposited === TUNING.lantern_cost;
      return { id, pos: [...(patch?.pos ?? base)], lit, deposited: lit ? TUNING.lantern_cost : deposited };
    });
    this.randomMotes = scenario.random_motes ?? true;
    if (scenario.motes) {
      for (const pos of scenario.motes) this.addMote(pos);
    } else if (this.randomMotes) {
      for (let i = 0; i < TUNING.initial_motes; i++) this.spawnMote();
    }
    this.enemies = new ShadePopulation(scenario, this.random);
    this.player.grounded = this.onIsland() && this.player.pos[1] === 0;
  }

  get timeLeftSeconds(): number {
    return Math.max(0, this.startingTime - this.tick / TUNING.ticks_per_second);
  }

  step(input: InputState): { events: GameEvent[]; pressed: Button[] } {
    if (this.state !== 'playing') return { events: [], pressed: [] };
    const pressed = pressedButtons(this.previousInput, input);
    this.previousInput = { ...input, move: [...input.move] };
    this.tick += 1;
    const events: GameEvent[] = [];
    this.enemies.expireTimers(this.tick);
    this.motes = this.motes.filter(m => m.expires === undefined || m.expires > this.tick);
    if (this.player.invulnTicks > 0) this.player.invulnTicks -= 1;
    if (this.player.respawnTicks > 0) {
      this.player.respawnTicks -= 1;
      if (this.player.respawnTicks === 0) {
        this.player.pos = [0, 0, 0];
        this.player.vel = [0, 0, 0];
        this.player.grounded = true;
        this.player.invulnTicks = Math.round(TUNING.invuln_s * TUNING.ticks_per_second);
      }
    } else {
      this.move(input, pressed.includes('jump'));
      if (this.player.pos[1] < TUNING.fall_threshold_y - PHYSICS_EPSILON) {
        this.player.carried = 0;
        this.player.flames = Math.max(0, this.player.flames - 1);
        this.player.respawnTicks = this.player.flames > 0 ? TUNING.respawn_ticks : 0;
        this.player.vel = [0, 0, 0];
        events.push({ type: 'event', tick: this.tick, name: 'player_hit', data: { by: 'fall', flames: this.player.flames, dropped: 0 } });
      }
    }
    const active = this.player.respawnTicks === 0 && this.player.flames > 0;
    if (active) {
      this.pickup(events);
      if (pressed.includes('interact')) this.deposit(events);
    }
    const safe = this.lanterns.filter(lantern => lantern.lit);
    this.enemies.updateSafety(safe);
    if (active && pressed.includes('pulse') && this.tick >= this.pulseReadyTick && this.player.carried >= TUNING.pulse_cost) {
      this.player.carried -= TUNING.pulse_cost;
      this.pulseReadyTick = this.tick + TUNING.pulse_cooldown_s * TUNING.ticks_per_second;
      const ids = this.enemies.pulse(this.player.pos, this.tick);
      this.score += ids.length * TUNING.score.per_stun;
      events.push({ type: 'event', tick: this.tick, name: 'pulse', data: { stunned_ids: ids } });
    }
    this.enemies.move(this.player.pos, this.lanterns, safe, this.tick);
    if (active && this.player.invulnTicks === 0 && this.enemies.contact(this.player.pos, safe, this.tick)) {
      this.player.flames--;
      this.player.invulnTicks = TUNING.invuln_s * TUNING.ticks_per_second;
      const dropped = Math.floor(this.player.carried * TUNING.hit_drop_ratio);
      this.player.carried -= dropped;
      for (let i = 0; i < dropped; i++) {
        const angle = this.random.next() * 2 * Math.PI;
        const radius = TUNING.drop_min_radius + this.random.next() * (TUNING.drop_max_radius - TUNING.drop_min_radius);
        this.addMote([this.player.pos[0] + radius * Math.cos(angle), 0, this.player.pos[2] + radius * Math.sin(angle)], this.tick + TUNING.drop_ttl_ticks);
      }
      events.push({ type: 'event', tick: this.tick, name: 'player_hit', data: { by: 'shade', flames: this.player.flames, dropped } });
    }
    if (this.randomMotes && this.tick % TUNING.mote_spawn_interval === 0) this.spawnMote();
    this.enemies.spawn(this.player.pos, safe, this.tick, events);

    if (this.player.flames > 0 && this.lanterns.every(lantern => lantern.lit)) {
      this.state = 'won';
      this.score += Math.floor(this.timeLeftSeconds) * TUNING.score.per_second_left + this.player.flames * TUNING.score.per_flame_left;
      events.push({ type: 'event', tick: this.tick, name: 'game_over', data: { result: 'won', reason: 'all_lit' } });
    } else if (this.player.flames === 0 || this.timeLeftSeconds === 0) {
      this.state = 'lost';
      events.push({ type: 'event', tick: this.tick, name: 'game_over', data: { result: 'lost', reason: this.player.flames === 0 ? 'no_flames' : 'dawn' } });
    }
    return { events, pressed };
  }

  private addMote(pos: Vec3, expires?: number): void {
    this.motes.push({ id: 'M' + this.nextMoteId++, pos: [...pos], expires });
  }

  private spawnMote(): void {
    if (this.motes.length >= TUNING.mote_cap) return;
    const free = MOTE_POINTS.filter(point => !this.motes.some(mote => mote.expires === undefined && distanceXZ(point, mote.pos) < 1e-9));
    if (free.length) this.addMote(free[Math.floor(this.random.next() * free.length)]!);
  }

  private pickup(events: GameEvent[]): void {
    this.motes = this.motes.filter(({ pos }) => {
      if (this.player.carried >= TUNING.carry_capacity || distanceXZ(this.player.pos, pos) > TUNING.pickup_radius + PHYSICS_EPSILON ||
          Math.abs(this.player.pos[1] - pos[1]) > TUNING.contact_height) return true;
      this.player.carried++;
      events.push({ type: 'event', tick: this.tick, name: 'mote_picked', data: { carried: this.player.carried } });
      return false;
    });
  }

  private deposit(events: GameEvent[]): void {
    const lantern = nearestUnlit(this.player.pos, this.lanterns);
    if (!lantern || distanceXZ(this.player.pos, lantern.pos) > TUNING.interact_radius + PHYSICS_EPSILON) return;
    const amount = Math.min(this.player.carried, TUNING.lantern_cost - lantern.deposited);
    if (!amount) return;
    this.player.carried -= amount;
    lantern.deposited += amount;
    this.score += TUNING.score.per_mote * amount;
    events.push({ type: 'event', tick: this.tick, name: 'deposit', data: { lantern_id: lantern.id, amount, deposited: lantern.deposited } });
    if (lantern.deposited === TUNING.lantern_cost) {
      lantern.lit = true;
      this.score += TUNING.score.per_lantern;
      events.push({ type: 'event', tick: this.tick, name: 'lantern_lit', data: { lantern_id: lantern.id } });
    }
  }

  private onIsland(): boolean {
    return Math.hypot(this.player.pos[0], this.player.pos[2]) <= TUNING.island_radius_night1 + PHYSICS_EPSILON;
  }

  private move(input: InputState, jumpPressed: boolean): void {
    const dt = 1 / TUNING.ticks_per_second;
    const [x, z] = movementDirection(input.move, input.cam_yaw_deg);
    this.player.vel[0] = x * TUNING.player_speed;
    this.player.vel[2] = z * TUNING.player_speed;
    if (jumpPressed && this.player.grounded) {
      this.player.vel[1] = TUNING.jump_velocity;
      this.player.grounded = false;
    }
    const previousY = this.player.pos[1];
    this.player.pos[0] += this.player.vel[0] * dt;
    this.player.pos[2] += this.player.vel[2] * dt;
    if (this.player.grounded && this.onIsland()) return;
    this.player.grounded = false;
    // Exact integration under constant gravity; horizontal control stays immediate in air.
    this.player.pos[1] += this.player.vel[1] * dt + TUNING.gravity * dt * dt / 2;
    this.player.vel[1] += TUNING.gravity * dt;
    // Cross the island's top from above; never snap up through its underside.
    if (this.onIsland() && previousY >= 0 && this.player.pos[1] <= PHYSICS_EPSILON && this.player.vel[1] <= 0) {
      this.player.pos[1] = 0;
      this.player.vel[1] = 0;
      this.player.grounded = true;
    }
  }

  snapshot(): Snapshot {
    return {
      type: 'snapshot', tick: this.tick, sim_tick: this.tick, state: this.state,
      time_left_s: this.timeLeftSeconds, score: this.score,
      player: { pos: this.player.pos.map(rounded) as Vec3, flames: this.player.flames, carried: this.player.carried },
      lanterns: this.lanterns.map(l => ({ ...l, pos: l.pos.map(rounded) as Vec3 })),
      shades: this.enemies.shades.map(({ id, pos, state }) => ({ id, pos: pos.map(rounded) as Vec3, state })),
      motes_active: this.motes.length,
      motes: this.motes.map(m => ({ id: m.id, pos: m.pos.map(rounded) as Vec3 })),
    };
  }

  end(): EndLine {
    return { type: 'end', ticks: this.tick, state: this.state, score: this.score };
  }
}
