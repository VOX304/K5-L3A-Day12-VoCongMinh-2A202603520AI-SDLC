import { describe, expect, it } from 'vitest';
import { defaultInput, InputTimeline } from '../src/sim/input.js';
import { SeededRandom } from '../src/sim/random.js';
import { movementDirection, Simulation } from '../src/sim/simulation.js';
import { trace } from '../src/headless/trace.js';

describe('fixed-step simulation', () => {
  it('starts at scenario position without applying tick 0 input or mutating the scenario', () => {
    const pos: [number, number, number] = [1.23456, 2, -3.45678];
    const sim = new Simulation(42, { player: { pos } });
    expect(sim.snapshot()).toMatchObject({ tick: 0, sim_tick: 0, score: 0, player: { pos: [1.235, 2, -3.457] }, shades: [], motes_active: 20 });
    sim.step({ ...defaultInput(), move: [0, 1] });
    expect(sim.snapshot().player.pos).toEqual([1.235, 1.997, -3.357]);
    expect(pos).toEqual([1.23456, 2, -3.45678]);
  });

  it('moves 6 metres in exactly 60 steps and keeps Y unchanged', () => {
    const sim = new Simulation(1);
    for (let k = 0; k < 60; k++) sim.step({ ...defaultInput(), move: [0, 1] });
    expect(sim.snapshot().player.pos).toEqual([0, 0, 6]);
    expect(sim.snapshot()).toMatchObject({ tick: 60, sim_tick: 60, time_left_s: 299 });
  });

  it.each([0, 90, -90, 180, 450, -810])('normalizes diagonal movement at yaw %s', (yaw) => {
    const direction = movementDirection([1, 1], yaw);
    expect(Math.hypot(...direction)).toBeCloseTo(1, 12);
    const sim = new Simulation(1);
    for (let k = 0; k < 60; k++) sim.step({ ...defaultInput(), move: [1, 1], cam_yaw_deg: yaw });
    expect(Math.hypot(sim.player.pos[0], sim.player.pos[2])).toBeCloseTo(6, 10);
  });

  it('uses the contract rotation signs and preserves analog magnitude', () => {
    expect(movementDirection([0, 1], 90)[0]).toBeCloseTo(1);
    expect(movementDirection([1, 0], 90)[1]).toBeCloseTo(-1);
    expect(Math.hypot(...movementDirection([0.3, 0.4], 123))).toBeCloseTo(0.5);
  });

  it('persists sparse fields, defaults to stationary, and recognizes only rising edges', () => {
    const timeline = new InputTimeline([
      { tick: 2, move: [0, 1], jump: true, cam_yaw_deg: 90 },
      { tick: 4, interact: true }, { tick: 6, jump: false }, { tick: 7, jump: true },
    ]);
    const sim = new Simulation(1);
    expect(timeline.at(0)).toEqual(defaultInput());
    const edges: string[][] = [];
    for (let tick = 0; tick < 8; tick++) edges.push(sim.step(timeline.at(tick)).pressed);
    expect(edges).toEqual([[], [], ['jump'], [], ['interact'], [], [], ['jump']]);
    expect(sim.player.pos[0]).toBeCloseTo(0.6);
    expect(sim.player.pos[2]).toBeCloseTo(0);
    expect(timeline.at(8)).toMatchObject({ move: [0, 1], cam_yaw_deg: 90, interact: true });
  });

  it('does not quantize state on every step or expose mutable positions in snapshots', () => {
    const sim = new Simulation(0);
    for (let tick = 0; tick < 60; tick++) sim.step({ ...defaultInput(), move: [1, 1] });
    const snapshot = sim.snapshot();
    expect(snapshot.player.pos).toEqual([4.243, 0, 4.243]);
    snapshot.player.pos[0] = 99;
    expect(sim.player.pos[0]).toBeCloseTo(6 / Math.sqrt(2), 12);
  });

  it('stamps an event k+1, emits it before the same-tick snapshot, and stops at dawn', () => {
    const lines = [...trace({ seed: 2, ticks: 100, snapshotEvery: 1, scenario: { time_left_s: 2 / 60 } })];
    expect(lines.map((line) => line.type)).toEqual(['snapshot', 'snapshot', 'event', 'snapshot', 'end']);
    expect(lines[2]).toEqual({ type: 'event', tick: 2, name: 'game_over', data: { result: 'lost', reason: 'dawn' } });
    expect(lines.at(-1)).toEqual({ type: 'end', ticks: 2, state: 'lost', score: 0 });
  });
});

describe('seeded PRNG', () => {
  it('is repeatable, bounded, and distinguishes seeds without any ambient random source', () => {
    const sequence = (seed: number) => {
      const random = new SeededRandom(seed);
      return Array.from({ length: 100 }, () => random.next());
    };
    const first = sequence(42);
    expect(first).toEqual(sequence(42));
    expect(first).not.toEqual(sequence(43));
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(first.slice(0, 3)).toEqual([0.6011037519201636, 0.44829055899754167, 0.8524657934904099]);
  });
});
