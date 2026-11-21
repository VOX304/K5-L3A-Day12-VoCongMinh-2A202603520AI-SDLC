export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type GameState = 'playing' | 'won' | 'lost';

export interface InputState {
  move: Vec2;
  cam_yaw_deg: number;
  jump: boolean;
  interact: boolean;
  pulse: boolean;
  dash: boolean;
}

export interface InputFrame extends Partial<InputState> { tick: number }
export type Button = 'jump' | 'interact' | 'pulse' | 'dash';

export interface Scenario {
  player?: { pos?: Vec3; carried?: number; flames?: number };
  time_left_s?: number;
  random_motes?: boolean;
  random_shades?: boolean;
  motes?: Vec3[];
  shades?: { id?: string; pos: Vec3 }[];
  lanterns?: { id: string; pos?: Vec3; deposited?: number; lit?: boolean }[];
}

export interface GameOverEvent {
  type: 'event';
  tick: number;
  name: 'game_over';
  data: { result: 'lost'; reason: 'dawn' | 'no_flames' };
}

export interface PlayerHitEvent {
  type: 'event';
  tick: number;
  name: 'player_hit';
  data: { by: 'fall'; flames: number; dropped: number };
}

export type GameEvent = GameOverEvent | PlayerHitEvent;

export interface Snapshot {
  type: 'snapshot';
  tick: number;
  sim_tick: number;
  state: GameState;
  time_left_s: number;
  score: number;
  player: { pos: Vec3; flames: number; carried: number };
  lanterns: [];
  shades: [];
  motes_active: number;
  motes: [];
}

export interface EndLine {
  type: 'end';
  ticks: number;
  state: GameState;
  score: number;
}
