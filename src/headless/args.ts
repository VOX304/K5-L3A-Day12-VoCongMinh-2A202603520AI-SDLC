import { ValidationError } from './validation.js';

export interface CliOptions {
  seed: number;
  night: 1;
  ticks: number;
  out: string;
  snapshotEvery: number;
  scenario?: string;
  inputs?: string;
}

const flags = new Set(['seed', 'night', 'ticks', 'out', 'snapshot-every', 'scenario', 'inputs']);

function integer(raw: string | undefined, flag: string, minimum: number): number {
  if (raw === undefined || !/^-?\d+$/.test(raw)) throw new ValidationError(`--${flag} requires an integer`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum) throw new ValidationError(`--${flag} requires a safe integer >= ${minimum}`);
  return value;
}

export function parseArgs(args: readonly string[]): CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]!;
    const name = flag.slice(2);
    if (!flag.startsWith('--') || !flags.has(name)) throw new ValidationError(`Unknown argument: ${flag}`);
    if (values.has(name)) throw new ValidationError(`Duplicate argument: ${flag}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--') || !value.trim()) throw new ValidationError(`Missing value for ${flag}`);
    values.set(name, value);
  }
  const seed = integer(values.get('seed'), 'seed', Number.MIN_SAFE_INTEGER);
  if (integer(values.get('night'), 'night', 1) !== 1) throw new ValidationError('--night supports only 1 in this ticket');
  const ticks = integer(values.get('ticks'), 'ticks', 0);
  const snapshotEvery = integer(values.get('snapshot-every') ?? '10', 'snapshot-every', 1);
  const out = values.get('out');
  if (!out) throw new ValidationError('--out is required');
  const options: CliOptions = { seed, night: 1, ticks, out, snapshotEvery };
  for (const field of ['inputs', 'scenario'] as const) {
    const value = values.get(field);
    if (value !== undefined) options[field] = value;
  }
  return options;
}
