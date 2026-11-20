import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { gameContract } from '../src/sim/tuning.js';
import { parseArgs } from '../src/headless/args.js';
import { validateInputs, validateScenario } from '../src/headless/validation.js';

const directory = mkdtempSync(join(tmpdir(), 'dao-den-long-'));
afterAll(() => rmSync(directory, { recursive: true, force: true }));
let fileNumber = 0;

function file(content: unknown, raw = false): string {
  const path = join(directory, `fixture-${fileNumber++}.json`);
  writeFileSync(path, raw ? content as string : JSON.stringify(content));
  return path;
}

function run(extra: string[] = [], ticks = 120) {
  const out = join(directory, `trace-${fileNumber++}.jsonl`);
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/headless/cli.ts', '--seed', '42', '--night', '1', '--ticks', String(ticks), '--out', out, ...extra], { encoding: 'utf8' });
  return { ...result, out };
}

function lines(path: string): Record<string, any>[] {
  return readFileSync(path, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
}

describe('headless process scenarios', () => {
  it('emits tick 0 then snapshots every 10 ticks and the final end, with no input standing still', () => {
    const result = run([], 25);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
    const output = lines(result.out);
    expect(output.map((line) => line.tick ?? line.ticks)).toEqual([0, 10, 20, 25]);
    expect(output[2]).toMatchObject({ sim_tick: 20, player: { pos: [0, 0, 0] } });
    expect(output.at(-1)).toEqual({ type: 'end', ticks: 25, state: 'playing', score: 0 });
  });

  it('executes exactly N steps, applies frame k during step k, and rounds scenario coordinates', () => {
    const scenario = file({ player: { pos: [1.23456, 0, 2], carried: 4, flames: 2 }, time_left_s: 50 });
    const inputs = file({ frames: [{ tick: 0, move: [0, 1] }, { tick: 10, cam_yaw_deg: 90 }, { tick: 20, move: [0, 0] }, { tick: 25, move: [1, 0] }] });
    const result = run(['--scenario', scenario, '--inputs', inputs, '--snapshot-every', '5'], 25);
    expect(result.status).toBe(0);
    const output = lines(result.out);
    expect(output[0]).toMatchObject({ tick: 0, time_left_s: 50, player: { pos: [1.235, 0, 2], carried: 4, flames: 2 } });
    expect(output.at(-2)).toMatchObject({ tick: 25, sim_tick: 25, player: { pos: [2.235, 0, 3] } });
    expect(output.at(-2)!.time_left_s).toBe(50 - 25 / 60);
  });

  it('produces a snapshot and end only for zero steps', () => {
    const result = run(['--inputs', file({ frames: [{ tick: 0, move: [1, 1] }] })], 0);
    expect(result.status).toBe(0);
    const output = lines(result.out);
    expect(output).toHaveLength(2);
    expect(output[0]).toMatchObject({ tick: 0, player: { pos: [0, 0, 0] } });
    expect(output[1]).toEqual({ type: 'end', ticks: 0, state: 'playing', score: 0 });
  });

  it('emits game_over on k+1 and a mandatory final end if dawn precedes the requested limit', () => {
    const result = run(['--scenario', file({ time_left_s: 1 / 60 }), '--snapshot-every', '1'], 60);
    expect(result.status).toBe(0);
    const output = lines(result.out);
    expect(output[1]).toEqual({ type: 'event', tick: 1, name: 'game_over', data: { result: 'lost', reason: 'dawn' } });
    expect(output[2]).toMatchObject({ type: 'snapshot', tick: 1, state: 'lost', time_left_s: 0 });
    expect(output[3]).toEqual({ type: 'end', ticks: 1, state: 'lost', score: 0 });
  });

  it.each([
    ['--scenario', '{'], ['--inputs', '{'],
    ['--scenario', '[]'], ['--inputs', '{"frames":{}}'],
    ['--inputs', '{"frames":[{"tick":0},{"tick":0}]}'],
    ['--inputs', '{"frames":[{"tick":2},{"tick":1}]}'],
    ['--inputs', '{"frames":[{"tick":0,"move":[2,0]}]}'],
    ['--inputs', '{"frames":[{"tick":0,"jump":1}]}'],
    ['--scenario', '{"player":{"pos":[0,0]}}'],
    ['--scenario', '{"motes":[[0,0,"bad"]]}'],
    ['--scenario', '{"shades":[{}]}'],
    ['--scenario', '{"lanterns":[{"id":"L1","lit":"yes"}]}'],
  ])('exits 2 with stderr on invalid %s %s', (flag, invalid) => {
    const result = run([flag, file(invalid, true)]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('headless:');
    expect(result.stdout).toBe('');
    expect(readdirSync(directory)).not.toContain(result.out.split(/[\\/]/).at(-1));
  });

  it('returns exit 2 for a missing input file and preserves an existing output on validation failure', () => {
    const out = file('preserve me', true);
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/headless/cli.ts', '--seed', '1', '--night', '1', '--ticks', '2', '--inputs', join(directory, 'missing.json'), '--out', out], { encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(readFileSync(out, 'utf8')).toBe('preserve me');
  });

  it('returns a nonzero exit and stderr for an output IO error', () => {
    const result = run([], 1);
    expect(result.status).toBe(0);
    const failed = spawnSync(process.execPath, ['--import', 'tsx', 'src/headless/cli.ts', '--seed', '1', '--night', '1', '--ticks', '1', '--out', directory], { encoding: 'utf8' });
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain('headless:');
  });

  it('is byte-for-byte deterministic across two independent Node processes', () => {
    const inputs = file({ frames: [{ tick: 0, move: [1, 1], cam_yaw_deg: -43.2 }, { tick: 80, cam_yaw_deg: 93 }, { tick: 130, move: [0.3, -0.5] }] });
    const scenario = file({ player: { pos: [-5.123456, 0, 7.891234] } });
    const first = run(['--inputs', inputs, '--scenario', scenario, '--snapshot-every', '3'], 240);
    const second = run(['--inputs', inputs, '--scenario', scenario, '--snapshot-every', '3'], 240);
    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
    expect(readFileSync(first.out).equals(readFileSync(second.out))).toBe(true);
  });
});

describe('validation and published contract', () => {
  const required = ['--seed', '-42', '--night', '1', '--ticks', '0', '--out', 'trace.jsonl'];
  it('accepts a negative integer seed and default snapshot interval', () => {
    expect(parseArgs(required)).toMatchObject({ seed: -42, ticks: 0, snapshotEvery: 10 });
  });
  it.each([
    [], ['--wat', '1'], ['--seed'], ['--seed', '1.2'],
    [...required, '--night', '1'], [...required, '--snapshot-every', '0'],
    required.map((part) => part === '-42' ? 'NaN' : part),
    required.map((part, i) => i === 3 ? '2' : part),
    required.map((part, i) => i === 5 ? '-1' : part),
    required.map((part, i) => i === 5 ? '9007199254740992' : part),
  ])('rejects invalid CLI arguments %#', (...args) => {
    expect(() => parseArgs(args as string[])).toThrow();
  });
  it.each([
    null, {}, { frames: [null] }, { frames: [{ tick: -1 }] },
    { frames: [{ tick: 0.5 }] }, { frames: [{ tick: 0, move: [0] }] },
    { frames: [{ tick: 0, cam_yaw_deg: Infinity }] },
    { frames: [{ tick: 0, pulse: null }] },
  ])('rejects invalid input shapes %#', (value) => {
    expect(() => validateInputs(value)).toThrow();
  });
  it.each([
    null, { player: null }, { player: { carried: -1 } }, { player: { flames: 1.2 } },
    { time_left_s: -1 }, { random_motes: 0 }, { shades: 'bad' },
    { lanterns: [{ id: '' }] }, { motes: [[0, NaN, 0]] },
  ])('rejects invalid scenario shapes %#', (value) => {
    expect(() => validateScenario(value)).toThrow();
  });
  it('accepts the v1.0 example scenario while deferring all entity mechanics', () => {
    const scenario = { player: { pos: [0, 0, 0], carried: 0, flames: 3 }, random_motes: false, random_shades: false, motes: [[0, 0, 5]], shades: [{ pos: [10, 0, 0] }], lanterns: [{ id: 'L1', pos: [0, 0, 25], deposited: 0 }], time_left_s: 300 };
    expect(validateScenario(scenario)).toEqual(scenario);
  });
  it('keeps the generated game.contract.json in sync with the single tuning module', () => {
    expect(JSON.parse(readFileSync('game.contract.json', 'utf8'))).toEqual(gameContract());
  });
});
