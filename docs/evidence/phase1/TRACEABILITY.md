# Phase 1 traceability

Status reflects the committed implementation and locally available evidence. ?Partial? means some visible or automated coverage exists while an explicit requirement still lacks proof. Hidden instructor tests and macOS execution are not claimed.

| Requirement | Verification | Result | Status |
|---|---|---|---|
| PRD-0 ?2: one Night 1 circular island with five Great Lanterns | `src/sim/night1.ts`; `tests/lanterns.test.ts`; browser evidence `docs/evidence/phase1/t04-night1.png` | Five L1?L5 lantern positions and a radius-40 island are configured. Browser shows the island and lanterns. | Passed |
| PRD-0 ?2: move, jump, 3D camera | `tests/physics.test.ts`; `tests/headless.test.ts`; `docs/evidence/phase1/t04-browser-check.json` | Fixed-step movement, jump, camera yaw controls and browser input were checked. | Passed |
| PRD-0 ?2: motes appear and can be collected | `tests/lanterns.test.ts`; CLI example in `docs/evidence/ticket-02-03.md` | Spawn schedule, cap, pickup radius, height, capacity, scenario setup and pickup event covered. | Passed |
| PRD-0 ?2: deposit motes to light lanterns | `tests/lanterns.test.ts` | Partial deposits, repeated interaction, tie by id, lighting and event score covered. | Passed |
| PRD-0 ?2: Shades spawn and pursue the player | `tests/shades.test.ts` | Schedule, IDs, detection, chase speed, loss radius, hit, recoil, invulnerability and dropped motes covered. | Passed |
| PRD-0 ?2: Pulse repels shades at a mote cost | `tests/shades.test.ts` | Cost, targets, 3D radius, cooldown, stun, push, score and safe-lantern block covered. | Passed |
| PRD-0 ?2: win, loss and score | `tests/lanterns.test.ts`; `tests/shades.test.ts`; `tests/headless.test.ts` | all_lit victory, dawn, no_flames priority, event score and win bonus tested. | Passed |
| PRD-0 ?2: HUD displays useful information | `docs/evidence/phase1/t04-night1.png`; `docs/evidence/ticket-02-03.md` browser playthrough | Flames, time, lantern count, score, carry, controls and terminal overlays are visible. Browser input replay reached both win and loss. | Passed |
| PRD-0 ?2: replay after win or loss | `docs/evidence/phase1/t04-restart-check.json`; `docs/evidence/ticket-02-03.md` browser playthrough | Restart control was checked after terminal outcomes and a fresh game began. | Passed |
| PRD-0 ?5: source and Windows/macOS/Linux-capable web delivery | `package.json`, `vite.config.ts`, `.github/workflows/ci.yml` | Browser source and cross-platform npm scripts exist. Current local verification ran on Windows. | Partial: macOS/Linux runner status depends on CI results |
| PRD-0 ?5: README install/run, controls, scoring | `README.md` | Three commands, Node requirement, controls, headless example and score formula documented. | Passed |
| PRD-0 ?5: contract and headless mode | `tests/headless.test.ts`; `examples/night1-scenario.json`; `examples/night1-inputs.json` | Contract is generated from tuning. CLI exercises JSONL snapshots, events, validation, and end records. | Passed |
| PRD-0 ?5: proof game meets requirements and assumptions | This traceability file; `docs/evidence/ticket-01.md`; `docs/evidence/ticket-02-03.md`; `docs/evaluation/phase-1.md` | Test/build/replay and accelerated browser evidence recorded. | Partial: no manual unaccelerated full play recording |
| PRD-0 ?5: AI harness retained | `AGENTS.md`, `.claude/settings.json`, `docs/ai-log.md`, git history | Verification gate, stop hook and usage notes are present. | Passed |
| Contract A: root manifest fields and exact tuning | `tests/headless.test.ts` generated-manifest comparison; `npm run verify` | `game.contract.json` must equal `gameContract()` and is regenerated at build. | Passed |
| Contract A: build, run and headless commands on macOS/Linux | `package.json`, `.github/workflows/ci.yml` | npm commands are portable and CI matrix targets Ubuntu and macOS. | Partial until both hosted runners report green |
| Contract B: required CLI arguments, fixed 60 Hz, no GPU, tick/time/position and exit semantics | `tests/headless.test.ts`; `tests/physics.test.ts`; `npm run headless -- ...` | CLI schema/exit and tick fixtures, fixed-step physics, event ordering and rounded output covered. | Passed |
| Contract C: defaults, sparse inputs, increasing frame ticks, normalized movement and button edges | `tests/headless.test.ts`; `tests/simulation.test.ts`; `tests/physics.test.ts` | Input persistence, validation, yaw transform, normalization and edge-triggered jump/interact/pulse exercised. | Passed |
| Contract D: scenario setup for player, random flags, motes, shades, lanterns and time; setup is silent and score-free | `tests/headless.test.ts`; `tests/lanterns.test.ts`; `tests/shades.test.ts` | Scenario validation and fixtures cover supplied entities, ids, lantern patches, lit setup, and no setup reward/events. | Passed |
| Contract E: snapshot/event/end schemas, ordering and rounding | `tests/headless.test.ts`; `tests/lanterns.test.ts`; `tests/shades.test.ts`; evidence JSONL in `docs/evidence/ticket-02-03.md` | Events, snapshots, IDs, terminal reasons, three-decimal coordinates and final end line are exercised. | Passed |
| Contract E: replay determinism | `scripts/determinism.mjs`; `npm run verify` | Two separate compiled CLI processes match byte-for-byte for movement, jump, Night 1 entities and fall fixtures. | Passed |
| Contract E: optional snapshot motes array | `tests/lanterns.test.ts`; `tests/shades.test.ts` | Active motes are emitted as `{id,pos}` and removed entities disappear. | Passed |

## Known evidence gaps

The workflow is configured for Ubuntu and macOS, but this local Windows run cannot establish hosted runner results. Browser proof used accelerated, recorded inputs for the game loop; it does not establish that a new player can complete the game at normal speed. The configured Phase 1 CI verifies build, automated tests and deterministic CLI replay, not a manual browser session. No tag is created by this documentation task.
