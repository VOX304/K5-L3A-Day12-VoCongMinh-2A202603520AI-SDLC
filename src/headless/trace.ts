import { InputTimeline } from '../sim/input.js';
import { Simulation } from '../sim/simulation.js';
import type { EndLine, GameEvent, InputFrame, Scenario, Snapshot } from '../sim/types.js';

export interface TraceOptions {
  seed: number;
  ticks: number;
  snapshotEvery: number;
  scenario?: Scenario;
  frames?: readonly InputFrame[];
}

export function* trace(options: TraceOptions): Generator<Snapshot | GameEvent | EndLine> {
  const sim = new Simulation(options.seed, options.scenario);
  const inputs = new InputTimeline(options.frames ?? []);
  yield sim.snapshot();
  while (sim.tick < options.ticks && sim.state === 'playing') {
    const { events } = sim.step(inputs.at(sim.tick));
    yield* events;
    if (sim.tick % options.snapshotEvery === 0) yield sim.snapshot();
  }
  yield sim.end();
}
