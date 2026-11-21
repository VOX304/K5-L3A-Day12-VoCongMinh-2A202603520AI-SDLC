import type { InputFrame, Scenario, Vec2, Vec3 } from '../sim/types.js';

export class ValidationError extends Error {}

function record(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function finite(value: unknown, path: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new ValidationError(`${path} must be a finite number`);
}

function integer(value: unknown, path: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new ValidationError(`${path} must be a non-negative safe integer`);
  }
}

function boolean(value: unknown, path: string): asserts value is boolean {
  if (typeof value !== 'boolean') throw new ValidationError(`${path} must be a boolean`);
}

function vector(value: unknown, size: number, path: string): number[] {
  if (!Array.isArray(value) || value.length !== size) throw new ValidationError(`${path} must have ${size} coordinates`);
  value.forEach((coordinate, index) => finite(coordinate, `${path}[${index}]`));
  return value as number[];
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new ValidationError(`${path} must be an array`);
  return value;
}

function id(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new ValidationError(`${path} must be a non-empty string`);
}

export function validateInputs(value: unknown): InputFrame[] {
  const root = record(value, 'inputs');
  let previous = -1;
  return array(root.frames, 'inputs.frames').map((value, index) => {
    const path = `inputs.frames[${index}]`;
    const frame = record(value, path);
    integer(frame.tick, `${path}.tick`);
    if (frame.tick <= previous) throw new ValidationError(`${path}.tick must be strictly increasing`);
    previous = frame.tick;
    const result: InputFrame = { tick: frame.tick };
    if ('move' in frame) {
      const move = vector(frame.move, 2, `${path}.move`) as Vec2;
      if (move.some((part) => part < -1 || part > 1)) throw new ValidationError(`${path}.move components must be in [-1, 1]`);
      result.move = [...move];
    }
    if ('cam_yaw_deg' in frame) {
      finite(frame.cam_yaw_deg, `${path}.cam_yaw_deg`);
      result.cam_yaw_deg = frame.cam_yaw_deg;
    }
    for (const button of ['jump', 'interact', 'pulse', 'dash'] as const) {
      if (button in frame) {
        boolean(frame[button], `${path}.${button}`);
        result[button] = frame[button];
      }
    }
    return result;
  });
}

/** Validate the scenario before initializing the simulation. */
export function validateScenario(value: unknown): Scenario {
  const root = record(value, 'scenario');
  const scenario: Scenario = {};
  if ('player' in root) {
    const player = record(root.player, 'scenario.player');
    scenario.player = {};
    if ('pos' in player) scenario.player.pos = [...vector(player.pos, 3, 'scenario.player.pos')] as Vec3;
    for (const field of ['carried', 'flames'] as const) {
      if (field in player) {
        integer(player[field], `scenario.player.${field}`);
        scenario.player[field] = player[field];
      }
    }
  }
  if ('time_left_s' in root) {
    finite(root.time_left_s, 'scenario.time_left_s');
    if (root.time_left_s < 0) throw new ValidationError('scenario.time_left_s must be non-negative');
    scenario.time_left_s = root.time_left_s;
  }
  for (const field of ['random_motes', 'random_shades'] as const) {
    if (field in root) {
      boolean(root[field], `scenario.${field}`);
      scenario[field] = root[field];
    }
  }
  if ('motes' in root) {
    scenario.motes = array(root.motes, 'scenario.motes').map((entry, index) =>
      [...vector(entry, 3, `scenario.motes[${index}]`)] as Vec3);
  }
  if ('shades' in root) {
    scenario.shades = array(root.shades, 'scenario.shades').map((entry, index) => {
      const path = `scenario.shades[${index}]`;
      const shade = record(entry, path);
      const result: { pos: Vec3; id?: string } = { pos: [...vector(shade.pos, 3, `${path}.pos`)] as Vec3 };
      if ('id' in shade) { id(shade.id, `${path}.id`); result.id = shade.id; }
      return result;
    });
  }
  if ('lanterns' in root) {
    scenario.lanterns = array(root.lanterns, 'scenario.lanterns').map((entry, index) => {
      const path = `scenario.lanterns[${index}]`;
      const lantern = record(entry, path);
      id(lantern.id, `${path}.id`);
      const result: NonNullable<Scenario['lanterns']>[number] = { id: lantern.id };
      if ('pos' in lantern) result.pos = [...vector(lantern.pos, 3, `${path}.pos`)] as Vec3;
      if ('lit' in lantern) { boolean(lantern.lit, `${path}.lit`); result.lit = lantern.lit; }
      if ('deposited' in lantern) { integer(lantern.deposited, `${path}.deposited`); result.deposited = lantern.deposited; }
      return result;
    });
  }
  return scenario;
}
