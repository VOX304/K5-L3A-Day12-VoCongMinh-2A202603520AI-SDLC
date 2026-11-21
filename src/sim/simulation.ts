import { defaultInput, pressedButtons } from './input.js';
import { SeededRandom } from './random.js';
import { TUNING } from './tuning.js';
import type { Button, EndLine, GameEvent, GameState, InputState, Scenario, Snapshot, Vec2, Vec3 } from './types.js';

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
  private previousInput = defaultInput();

  constructor(seed: number, scenario: Scenario = {}) {
    this.random = new SeededRandom(seed);
    this.startingTime = scenario.time_left_s ?? TUNING.night1_duration_s;
    this.player = {
      pos: [...(scenario.player?.pos ?? [0, 0, 0])],
      flames: scenario.player?.flames ?? TUNING.flames,
      carried: scenario.player?.carried ?? 0,
      vel: [0, 0, 0],
      grounded: false,
      invulnTicks: 0,
      respawnTicks: 0,
    };
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
    if (this.player.flames === 0 || this.timeLeftSeconds === 0) {
      this.state = 'lost';
      events.push({ type: 'event', tick: this.tick, name: 'game_over', data: { result: 'lost', reason: this.player.flames === 0 ? 'no_flames' : 'dawn' } });
    }
    return { events, pressed };
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
      lanterns: [], shades: [], motes_active: 0, motes: [],
    };
  }

  end(): EndLine {
    return { type: 'end', ticks: this.tick, state: this.state, score: this.score };
  }
}
