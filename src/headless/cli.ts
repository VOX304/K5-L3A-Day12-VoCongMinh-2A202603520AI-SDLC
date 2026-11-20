import { closeSync, openSync, readFileSync, writeSync } from 'node:fs';
import { parseArgs } from './args.js';
import { trace } from './trace.js';
import { ValidationError, validateInputs, validateScenario } from './validation.js';

function readJson(path: string): unknown {
  try { return JSON.parse(readFileSync(path, 'utf8')) as unknown; }
  catch (error) { throw new ValidationError(`Cannot read JSON ${path}: ${(error as Error).message}`); }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  // Complete validation before creating/truncating the output file.
  const frames = options.inputs === undefined ? [] : validateInputs(readJson(options.inputs));
  const scenario = options.scenario === undefined ? {} : validateScenario(readJson(options.scenario));
  const output = openSync(options.out, 'w');
  try {
    for (const line of trace({ ...options, frames, scenario })) writeSync(output, `${JSON.stringify(line)}\n`);
  } finally { closeSync(output); }
}

try { main(); }
catch (error) {
  process.stderr.write(`headless: ${(error as Error).message}\n`);
  process.exitCode = error instanceof ValidationError ? 2 : 1;
}
