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
  data: { result: 'lost' | 'won'; reason: 'dawn' | 'no_flames' | 'all_lit' };
}

export interface PlayerHitEvent {
  type: 'event';
  tick: number;
  name: 'player_hit';
  data: { by: 'fall' | 'shade'; flames: number; dropped: number };
}

export interface Mote { id: string; pos: Vec3 }
export interface Lantern extends Mote { lit: boolean; deposited: number }

export interface ShadeView extends Mote {
  state: 'spawning' | 'wander' | 'chase' | 'recoil' | 'stunned';
}

type EventData = {
  pulse: { stunned_ids: string[] };
  shade_spawned: { id: string };
  mote_picked: { carried: number };
  deposit: { lantern_id: string; amount: number; deposited: number };
  lantern_lit: { lantern_id: string };
};
type EntityEvent = { [K in keyof EventData]: { type: 'event'; tick: number; name: K; data: EventData[K] } }[keyof EventData];
export type GameEvent = GameOverEvent | PlayerHitEvent | EntityEvent;

export interface Snapshot {
  type: 'snapshot';
  tick: number;
  sim_tick: number;
  state: GameState;
  time_left_s: number;
  score: number;
  player: { pos: Vec3; flames: number; carried: number };
  lanterns: Lantern[];
  shades: ShadeView[];
  motes_active: number;
  motes: Mote[];
}

export interface EndLine {
  type: 'end';
  ticks: number;
  state: GameState;
  score: number;
}
