import { spawnSync } from 'node:child_process';

// The command runs at the Claude project root; keep the root explicit when provided.
const result = spawnSync(process.execPath, ['scripts/verify.mjs'], {
  cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  stdio: 'inherit',
});
if (result.error || result.status !== 0) {
  console.error(`Stop blocked: npm run verify failed${result.error ? ` (${result.error.message})` : ''}. Fix the failure and rerun verification before finishing.`);
  process.exitCode = 2;
}
