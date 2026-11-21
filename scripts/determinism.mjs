import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'dao-den-long-replay-'));
const cases = [
  { name: 'movement', scenario: 'examples/scenario.json', inputs: 'examples/inputs.json', ticks: 240, snapshotEvery: 60 },
  { name: 'jump', scenario: 'examples/scenario.json', inputs: 'examples/jump-inputs.json', ticks: 63, snapshotEvery: 21 },
  { name: 'fall', scenario: 'examples/fall-scenario.json', inputs: 'examples/fall-inputs.json', ticks: 121, snapshotEvery: 1 },
];
try {
  for (const replay of cases) {
    const outputs = ['first', 'second'].map((name) => join(directory, `${replay.name}-${name}.jsonl`));
    for (const output of outputs) {
      const result = spawnSync(process.execPath, [
        'dist/headless/cli.js', '--seed', '42', '--night', '1',
        '--scenario', replay.scenario, '--inputs', replay.inputs,
        '--ticks', String(replay.ticks), '--snapshot-every', String(replay.snapshotEvery), '--out', output,
      ], { encoding: 'utf8' });
      if (result.error || result.status !== 0) throw new Error(result.error?.message ?? `${replay.name}: exit ${result.status}: ${result.stderr}`);
    }
    const first = readFileSync(outputs[0]);
    const second = readFileSync(outputs[1]);
    if (!first.equals(second)) throw new Error(`Determinism FAILED (${replay.name}): replay bytes differ`);
    console.log(`Determinism PASS (${replay.name}): 2 independent runs, ${first.length} identical bytes`);
    console.log(`SHA-256 ${createHash('sha256').update(first).digest('hex')}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
