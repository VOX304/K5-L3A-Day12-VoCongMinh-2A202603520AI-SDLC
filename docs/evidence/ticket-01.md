# Ticket 01 — verification evidence

Verified on Windows with Node v24.14.0 and npm 11.21.2, 2026-11-21. Physics is in commit `d824ccd`; the verification harness and this report are committed together. This records ticket 01 only, not completion of Phase 1.

`npm run verify` exited **0** on the final implementation. The build typechecked the browser/headless TypeScript and produced the Vite bundle. Actual verification output (excerpt):

```text
vite v7.3.8 building client environment for production...
✓ 10 modules transformed.
✓ built in 1.35s

 Test Files  4 passed (4)
      Tests  78 passed (78)
   Start at  11:19:16
   Duration  6.73s (transform 406ms, setup 0ms, import 562ms, tests 10.70s, environment 1ms)

Determinism PASS (movement): 2 independent runs, 1037 identical bytes
SHA-256 fac0d3098d22a764d33fcf8f115f127caa30100835be175436a79c1669aee17d
Determinism PASS (jump): 2 independent runs, 842 identical bytes
SHA-256 b04a882a4b1f3411511919a0633e373b925b22d0e7f99229478f252174598a36
Determinism PASS (fall): 2 independent runs, 25741 identical bytes
SHA-256 2bc23d0467070856527e5e42ac3a5906d491c53371b3502577e89994dd77fcae
Verification PASS: build + tests + determinism
```

The replay gate launches two separate compiled CLI processes per fixture and compares their output buffers byte-for-byte. Movement/jump use `examples/scenario.json`; fall uses `examples/fall-scenario.json`. No network or GPU is needed after installing dependencies. Local sandboxed esbuild spawning initially failed with EPERM; rerunning with the authorized permissions succeeded. Linux/macOS verification is configured in CI and has not been executed locally.

Physics coverage checks 7 m/s jump velocity, −20 m/s² gravity, peak at tick 21, landing at tick 42, held-button and mid-air edge handling, full air control, radius-40 boundaries, falling below −10, loss of all carried motes, one fall hit despite invulnerability, 60 waiting ticks, origin/zero-velocity respawn, 90 invulnerability ticks, fatal fall, and no_flames priority over dawn. Contract tests verify fall events use v1.0 fields without `lost`.

Review found two errors in the interrupted changes. New assertions first failed because accumulated 0.1 m movement started falling at tick 400, and because a fatal fall still scheduled a respawn timer. Boundary tolerance now preserves the exact 40 m edge, and fatal falls leave no respawn pending. Both regressions passed in the gate above; earlier movement assertions were updated only where gravity now changes Y.

The registered synchronous Claude Stop hook runs the same verifier and maps failure to exit **2**, following the [official hook exit behavior](https://code.claude.com/docs/en/hooks#exit-code-2-behavior-per-event). `tests/harness.test.ts` exercises the actual hook and verifier in a temporary project: an `assert.equal(1, 2)` test blocks Stop and prevents replay; correcting it to `assert.equal(1, 1)` allows Stop with exit **0** after all three stages. The test also sends `stop_hook_active:true` to confirm continued turns still require a passing gate. No bypass is used.

Reproduce the standalone jump trace:

```sh
node dist/headless/cli.js --seed 42 --night 1 --inputs examples/jump-inputs.json --ticks 63 --snapshot-every 21 --out jump.jsonl
```

This command exited 0 and wrote these actual JSONL lines (the default player starts at the origin):

```jsonl
{"type":"snapshot","tick":0,"sim_tick":0,"state":"playing","time_left_s":300,"score":0,"player":{"pos":[0,0,0],"flames":3,"carried":0},"lanterns":[],"shades":[],"motes_active":0,"motes":[]}
{"type":"snapshot","tick":21,"sim_tick":21,"state":"playing","time_left_s":299.65,"score":0,"player":{"pos":[0,1.225,2.1],"flames":3,"carried":0},"lanterns":[],"shades":[],"motes_active":0,"motes":[]}
{"type":"snapshot","tick":42,"sim_tick":42,"state":"playing","time_left_s":299.3,"score":0,"player":{"pos":[2.1,0,2.1],"flames":3,"carried":0},"lanterns":[],"shades":[],"motes_active":0,"motes":[]}
{"type":"snapshot","tick":63,"sim_tick":63,"state":"playing","time_left_s":298.95,"score":0,"player":{"pos":[4.2,0,2.1],"flames":3,"carried":0},"lanterns":[],"shades":[],"motes_active":0,"motes":[]}
{"type":"end","ticks":63,"state":"playing","score":0}
```

Remaining work belongs to later tickets: motes, lanterns, enemies, scoring/winning and a complete playable Phase 1. Browser rendering and actual Claude UI hook invocation were not exercised in this resumption; the shared simulation, compiled CLI, hook process, and registration were checked automatically. No hidden tests, release tag, push, or independent review are claimed. AI assistance resumed the interrupted implementation, reviewed diffs, added boundary and hook regressions, ran the gate, and preserved the original scaffold; token/cost telemetry was unavailable.
