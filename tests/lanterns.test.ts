import { expect, it } from 'vitest';
import { trace } from '../src/headless/trace.js';
import type { InputFrame, Scenario } from '../src/sim/types.js';

function run(scenario: Scenario, ticks = 1, frames: InputFrame[] = []) {
  return [...trace({ seed: 42, ticks, snapshotEvery: 1, frames, scenario: { random_motes: false, random_shades: false, ...scenario } })];
}

it('picks up at both inclusive limits, skips motes beyond them, and leaves overflow on the ground', () => {
  const rows = run({ player: { carried: 9 }, motes: [[1.001,0,0], [0,1.501,0], [1,1.5,0], [0,0,0]] });
  expect(rows[1]).toEqual({ type: 'event', tick: 1, name: 'mote_picked', data: { carried: 10 } });
  expect(rows[2]).toMatchObject({ score: 0, motes_active: 3, motes: [{ id: 'M1' }, { id: 'M2' }, { id: 'M4' }] });
});

it('persists partial deposits, picks before interacting, and resolves a distance tie by id', () => {
  const rows = run({ player: { carried: 4 }, motes: [[1.2,0,0]], lanterns: [
    { id: 'L2', pos: [-1,0,0] }, { id: 'L1', pos: [1,0,0], deposited: 5 },
  ] }, 4, [{ tick: 0, interact: true }, { tick: 1, interact: false, move: [1,0] }, { tick: 3, interact: true }]);
  expect(rows.filter(r => r.type === 'event').map(r => [r.name, r.data])).toEqual([
    ['deposit', { lantern_id: 'L1', amount: 4, deposited: 9 }], ['mote_picked', { carried: 1 }],
    ['deposit', { lantern_id: 'L1', amount: 1, deposited: 10 }], ['lantern_lit', { lantern_id: 'L1' }],
  ]);
  expect(rows.at(-1)).toMatchObject({ score: 150 });
});

it.each([[1 / 60, 0], [4.2, 8]])('wins at all_lit with %s initial seconds, including dawn ties', (time, timeBonus) => {
  const rows = run({ time_left_s: time, player: { carried: 2 }, lanterns: [
    { id: 'L1', pos: [2,0,0], deposited: 9 }, ...['L2','L3','L4','L5'].map(id => ({ id, lit: true })),
  ] }, 10, [{ tick: 0, interact: true }]);
  expect(rows[0]).toMatchObject({ score: 0, tick: 0 });
  expect(rows[3]).toMatchObject({ name: 'game_over', data: { result: 'won', reason: 'all_lit' } });
  expect(rows[4]).toMatchObject({ player: { carried: 1 }, score: 260 + timeBonus });
});

it('seeds 20 distinct sites and fills the four remaining sites at 240-tick intervals', () => {
  const rows = [...trace({ seed: 1, ticks: 1200, snapshotEvery: 240, scenario: { random_shades: false } })];
  const snaps = rows.filter(row => row.type === 'snapshot');
  expect(snaps.map(s => s.motes_active)).toEqual([20,21,22,23,24,24]);
  expect(new Set(snaps[0]!.motes.map(m => m.pos.join(','))).size).toBe(20);
});
