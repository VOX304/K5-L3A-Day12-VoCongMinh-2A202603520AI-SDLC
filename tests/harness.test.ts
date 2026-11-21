import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const directory = mkdtempSync(join(tmpdir(), 'dao-den-long-gate-'));
afterAll(() => rmSync(directory, { recursive: true, force: true }));
const hook = resolve('scripts/stop-hook.mjs');
const verify = resolve('scripts/verify.mjs');

describe('agent verification harness', () => {
  it.each([0, 1])('maps verifier exit %s to the correct Stop hook allow/block decision', (exit) => {
    const project = join(directory, `hook-${exit}`);
    mkdirSync(join(project, 'scripts'), { recursive: true });
    writeFileSync(join(project, 'scripts/verify.mjs'), `process.exit(${exit});\n`);
    const result = spawnSync(process.execPath, [hook], {
      env: { ...process.env, CLAUDE_PROJECT_DIR: project }, encoding: 'utf8',
      input: JSON.stringify({ stop_hook_active: false }),
    });
    expect(result.status).toBe(exit === 0 ? 0 : 2);
    if (exit !== 0) expect(result.stderr).toContain('Stop blocked: npm run verify failed');
  });

  it('fails verification on a red npm test and never reaches determinism', () => {
    const project = join(directory, 'red-gate');
    mkdirSync(project);
    writeFileSync(join(project, 'package.json'), JSON.stringify({
      scripts: {
        build: 'node -e "process.exit(0)"',
        test: 'node -e "process.exit(1)"',
        determinism: 'node -e "require(\'fs\').writeFileSync(\'should-not-exist\',\'ran\')"',
      },
    }));
    const result = spawnSync(process.execPath, [verify], { cwd: project, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Verification FAILED at test');
    expect(existsSync(join(project, 'should-not-exist'))).toBe(false);
  });

  it('blocks Stop on a real failed assertion, then allows it after the assertion is fixed', () => {
    const project = join(directory, 'hook-assertion');
    mkdirSync(join(project, 'scripts'), { recursive: true });
    copyFileSync(verify, join(project, 'scripts/verify.mjs'));
    writeFileSync(join(project, 'package.json'), JSON.stringify({
      scripts: {
        build: 'node -e "process.exit(0)"',
        test: 'node assertion.mjs',
        determinism: 'node -e "require(\'fs\').writeFileSync(\'replayed\',\'ran\')"',
      },
    }));
    const assertion = join(project, 'assertion.mjs');
    const runHook = () => spawnSync(process.execPath, [hook], {
      cwd: project, env: { ...process.env, CLAUDE_PROJECT_DIR: project }, encoding: 'utf8',
      input: JSON.stringify({ stop_hook_active: true }),
    });
    writeFileSync(assertion, "import assert from 'node:assert/strict'; assert.equal(1, 2);\n");
    const red = runHook();
    expect(red.status).toBe(2);
    expect(red.stderr).toContain('Verification FAILED at test');
    expect(red.stderr).toContain('Stop blocked');
    expect(existsSync(join(project, 'replayed'))).toBe(false);
    writeFileSync(assertion, "import assert from 'node:assert/strict'; assert.equal(1, 1);\n");
    const green = runHook();
    expect(green.status).toBe(0);
    expect(green.stdout).toContain('Verification PASS: build + tests + determinism');
    expect(existsSync(join(project, 'replayed'))).toBe(true);
  }, 20_000);

  it('registers the tested gate as a synchronous Claude Stop command', () => {
    const settings = JSON.parse(readFileSync('.claude/settings.json', 'utf8'));
    expect(settings.hooks.Stop[0].hooks[0]).toMatchObject({
      type: 'command', command: 'node "${CLAUDE_PROJECT_DIR}/scripts/stop-hook.mjs"',
    });
    expect(settings.hooks.Stop[0].hooks[0].async).not.toBe(true);
  });
});
