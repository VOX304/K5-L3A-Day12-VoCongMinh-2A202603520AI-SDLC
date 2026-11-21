import { spawnSync } from 'node:child_process';

/** Run the same gate from npm, CI and the agent Stop hook. */
function verify(cwd = process.cwd()) {
  for (const script of ['build', 'test', 'determinism']) {
    // Script names are fixed here. cmd is needed to launch npm.cmd on Windows.
    const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm';
    const args = process.platform === 'win32' ? ['/d', '/s', '/c', `npm run ${script}`] : ['run', script];
    const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
    if (result.error || result.status !== 0) {
      console.error(`Verification FAILED at ${script}: ${result.error?.message ?? `exit ${result.status}`}`);
      return 1;
    }
  }
  console.log('Verification PASS: build + tests + determinism');
  return 0;
}

process.exitCode = verify();
