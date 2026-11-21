# Phase 1 evaluation

## Passed

The final ticket 03 verification ran on Windows with Node 24.14.0 and npm 11.21.2. `npm run verify` exited 0 with build/typecheck, 95 tests, and four deterministic replay fixtures. The Night 1 replay fixture produced 10,176 identical bytes across two independent CLI processes. CI is configured to run the same gate on `ubuntu-latest` and `macos-latest`.

The headless suite covers mote collection and capacity, partial deposits and lighting, scoring and all_lit, dawn, shade spawning and IDs, pursuit and hit/drop/invulnerability, no_flames, pulse costs/cooldown/stun/push/score, and safe lanterns. The browser uses the shared simulation. An accelerated browser input replay reached both a win and a no_flames loss after restart; the HUD reflected the terminal state and score. See [ticket 02?03 evidence](../evidence/ticket-02-03.md).

## Not demonstrated

CI matrix results on hosted Ubuntu and macOS are not included in the local Windows verification evidence. Browser playthroughs used accelerated inputs and do not demonstrate normal-speed manual completion. No hidden grader was run. The earlier ticket 04 screenshot recorded a win presentation fixture, not a gameplay win; ticket 02?03 subsequently added a full-simulation browser win using accelerated inputs.

## Risks for Phase 2

Phase 2 will add multiple maps and mechanics, which can change geometry, encounter timing, and entity interactions. Preserve the v1.0 Phase 1 behavior and byte replay while extending scenario support. The Night 1 browser result validates the current shared-core wiring, but automated tests remain the strongest evidence for exact boundaries and schedules. Continue testing map transitions and preserve deterministic seeded random calls. Tuning additions must stay generated from the simulation module. This phase intentionally has no dash, pause, drifters, charms, or later-night rules.

No release tag was created in this task. The traceability matrix records platform and normal-speed browser evidence gaps explicitly.
