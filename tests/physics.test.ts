import { describe, expect, it } from 'vitest';
import { defaultInput } from '../src/sim/input.js';
import { Simulation } from '../src/sim/simulation.js';

describe('Night 1 jump and fall physics', () => {
  it('jumps at 7 m/s, peaks at 1.225 m after 21 ticks, and lands after 42 ticks', () => {
    const sim = new Simulation(1);
    const input = { ...defaultInput(), jump: true };
    for (let tick = 0; tick < 21; tick++) sim.step(input);
    expect(sim.player.pos[1]).toBeCloseTo(1.225, 12);
    expect(sim.player.vel[1]).toBeCloseTo(0, 12);
    expect(sim.player.grounded).toBe(false);
    for (let tick = 21; tick < 42; tick++) sim.step(input);
    expect(sim.player.pos[1]).toBe(0);
    expect(sim.player.vel[1]).toBe(0);
    expect(sim.player.grounded).toBe(true);
    sim.step(input);
    expect(sim.player.pos[1]).toBe(0); // Holding jump does not bounce on landing.
    sim.step(defaultInput());
    sim.step(input);
    expect(sim.player.pos[1]).toBeGreaterThan(0);
  });

  it('ignores mid-air jump edges and retains full immediate horizontal control', () => {
    const sim = new Simulation(1);
    sim.step({ ...defaultInput(), jump: true, move: [1, 0] });
    sim.step({ ...defaultInput(), move: [-1, 0] });
    const verticalVelocity = sim.player.vel[1];
    sim.step({ ...defaultInput(), jump: true, move: [0, 1] });
    expect(sim.player.vel[1]).toBeCloseTo(verticalVelocity - 20 / 60, 12);
    expect(sim.player.vel[0]).toBe(0);
    expect(sim.player.vel[2]).toBe(6);
    expect(sim.player.pos[0]).toBeCloseTo(0);
    expect(sim.player.pos[2]).toBeCloseTo(0.1);
  });

  it('keeps the radius-40 edge on solid ground and starts falling outside it', () => {
    const sim = new Simulation(1, { player: { pos: [40, 0, 0] } });
    sim.step(defaultInput());
    expect(sim.player.grounded).toBe(true);
    sim.step({ ...defaultInput(), move: [1, 0] });
    expect(sim.player.grounded).toBe(false);
    expect(sim.player.pos[1]).toBeLessThan(0);
  });

  it('reaches the island edge after 400 running steps before falling on step 401', () => {
    const sim = new Simulation(1);
    const input = { ...defaultInput(), move: [1, 0] as [number, number] };
    for (let tick = 0; tick < 400; tick++) sim.step(input);
    expect(sim.player.pos[0]).toBeCloseTo(40, 12);
    expect(sim.player.pos[1]).toBe(0);
    expect(sim.player.grounded).toBe(true);
    sim.step(input);
    expect(sim.player.grounded).toBe(false);
    expect(sim.player.pos[1]).toBeLessThan(0);
  });

  it('does not penalize Y=-10 after 60 falling ticks, then hits below it on tick 61', () => {
    const sim = new Simulation(1, { player: { pos: [41, 0, 0], carried: 7 } });
    for (let tick = 0; tick < 60; tick++) expect(sim.step(defaultInput()).events).toEqual([]);
    expect(sim.player.pos[1]).toBeCloseTo(-10, 12);
    expect(sim.player.flames).toBe(3);
    expect(sim.step(defaultInput()).events).toEqual([
      { type: 'event', tick: 61, name: 'player_hit', data: { by: 'fall', flames: 2, dropped: 0 } },
    ]);
  });

  it('never teleports up from below the island and triggers one hit per fall despite invulnerability', () => {
    const sim = new Simulation(1, { player: { pos: [0, -10, 0], flames: 3, carried: 9 } });
    sim.player.invulnTicks = 90;
    const { events } = sim.step(defaultInput());
    expect(events).toEqual([{ type: 'event', tick: 1, name: 'player_hit', data: { by: 'fall', flames: 2, dropped: 0 } }]);
    expect(sim.player.carried).toBe(0);
    expect(sim.player.respawnTicks).toBe(60);
    for (let tick = 0; tick < 59; tick++) {
      expect(sim.step({ ...defaultInput(), move: [1, 0], jump: true }).events).toEqual([]);
    }
    expect(sim.player.pos[1]).toBeLessThan(-10);
    sim.step({ ...defaultInput(), move: [1, 0] });
    expect(sim.player.pos).toEqual([0, 0, 0]);
    expect(sim.player.vel).toEqual([0, 0, 0]);
    expect(sim.player.invulnTicks).toBe(90);
    expect(sim.player.respawnTicks).toBe(0);
    sim.step(defaultInput());
    expect(sim.player.invulnTicks).toBe(89);
    expect(sim.player.flames).toBe(2);
  });

  it('loses immediately on the final flame, without respawning or duplicate events', () => {
    const sim = new Simulation(1, { player: { pos: [41, -11, 0], flames: 1 } });
    expect(sim.step(defaultInput()).events).toEqual([
      { type: 'event', tick: 1, name: 'player_hit', data: { by: 'fall', flames: 0, dropped: 0 } },
      { type: 'event', tick: 1, name: 'game_over', data: { result: 'lost', reason: 'no_flames' } },
    ]);
    expect(sim.state).toBe('lost');
    expect(sim.player.respawnTicks).toBe(0);
    expect(sim.step(defaultInput()).events).toEqual([]);
    expect(sim.tick).toBe(1);
    expect(sim.player.pos[1]).toBeLessThan(-10);
  });

  it('prioritizes no_flames when a fatal fall and dawn happen on the same tick', () => {
    const sim = new Simulation(1, { player: { pos: [41, -11, 0], flames: 1 }, time_left_s: 1 / 60 });
    expect(sim.step(defaultInput()).events.at(-1)).toEqual(
      { type: 'event', tick: 1, name: 'game_over', data: { result: 'lost', reason: 'no_flames' } },
    );
  });
});
