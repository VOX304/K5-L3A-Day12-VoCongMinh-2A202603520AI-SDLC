import { defaultInput, pressedButtons } from './input.js';
import { SeededRandom } from './random.js';
import { TUNING } from './tuning.js';
import type { Button, EndLine, GameEvent, GameState, InputState, Scenario, Snapshot, Vec2, Vec3 } from './types.js';

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
  readonly player: { pos: Vec3; flames: number; carried: number };
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
    };
  }

  get timeLeftSeconds(): number {
    return Math.max(0, this.startingTime - this.tick / TUNING.ticks_per_second);
  }

  step(input: InputState): { events: GameEvent[]; pressed: Button[] } {
    if (this.state !== 'playing') return { events: [], pressed: [] };
    const pressed = pressedButtons(this.previousInput, input);
    this.previousInput = { ...input, move: [...input.move] };
    const [x, z] = movementDirection(input.move, input.cam_yaw_deg);
    const distance = TUNING.player_speed / TUNING.ticks_per_second;
    this.player.pos[0] += x * distance;
    this.player.pos[2] += z * distance;
    this.tick += 1;

    const events: GameEvent[] = [];
    if (this.timeLeftSeconds === 0) {
      this.state = 'lost';
      events.push({ type: 'event', tick: this.tick, name: 'game_over', data: { result: 'lost', reason: 'dawn' } });
    }
    return { events, pressed };
  }

  snapshot(): Snapshot {
    return {
      type: 'snapshot', tick: this.tick, sim_tick: this.tick, state: this.state,
      time_left_s: this.timeLeftSeconds, score: this.score,
      player: { ...this.player, pos: this.player.pos.map(rounded) as Vec3 },
      lanterns: [], shades: [], motes_active: 0, motes: [],
    };
  }

  end(): EndLine {
    return { type: 'end', ticks: this.tick, state: this.state, score: this.score };
  }
}
