# Night 1 gameplay verification

Windows, 2026-11-21. Installed with `npm ci`. Each ticket passed `npm run verify` before its commit. The manifest was generated from the simulation tuning during the build.

## Verification output

Ticket 02, commit `8d7e9fc`, exit 0 (excerpt):

```text
 Test Files  5 passed (5)
      Tests  83 passed (83)
Determinism PASS (movement): 2 independent runs, 2467 identical bytes
Determinism PASS (jump): 2 independent runs, 1986 identical bytes
Determinism PASS (fall): 2 independent runs, 60633 identical bytes
Verification PASS: build + tests + determinism
```

Ticket 03, exit 0 (excerpt):

```text
vite v7.3.8 building client environment for production...
✓ 15 modules transformed.
✓ built in 1.71s
 Test Files  6 passed (6)
      Tests  95 passed (95)
Determinism PASS (movement): 2 independent runs, 2467 identical bytes
Determinism PASS (jump): 2 independent runs, 1986 identical bytes
Determinism PASS (night1): 2 independent runs, 10176 identical bytes
SHA-256 354f8f7bc44bb5ceb5acf675961d441d4d299d0645dda13bba061cc4ac288b91
Determinism PASS (fall): 2 independent runs, 60633 identical bytes
Verification PASS: build + tests + determinism
```

## Headless scenario coverage

| Scenario | Assertions |
|---|---|
| Pickup at capacity | Inclusive XZ and height limits, outside misses, overflow retains its ID, pickup score zero |
| Partial deposits | Two rising edges, progress persistence, distance tie resolves to L1, exact deposit and lighting score |
| Final lantern (two time fixtures) | Silent setup, excess carry retained, win at dawn and with time remaining, flame and whole-second bonuses |
| Scheduled motes | Twenty distinct initial positions, spawn at multiples of 240, skip when all 24 sites are occupied |
| Scheduled shades | Two at 300, then one per 480, cap six, spawn distance, stable IDs with reserved scenario ID |
| Detection | Inclusive 12 m, chase speed, hysteresis until beyond 18 m |
| Contact | Numeric ID order, height gate, one flame per tick, ring drops, 60 recoil steps and hit again after 90 ticks |
| Drop expiry | Mote present through age 479, removed at age 480 |
| Fatal contact | Immediate no_flames takes priority over simultaneous dawn |
| Pulse targets | 3D height boundary, center overlap pushes +X, numeric ID order, cost, score, 15 push ticks and 120 stunned ticks |
| Pulse cooldown | Miss still costs three, early and unaffordable presses ignored, next eligible edge at 180 ticks |
| Safe lantern | Lighting ejects an inside shade, holds approaching shades at the edge, prevents contact |
| Mote cap | Spawn from 29 to 30, skip next schedule |
| Recover dropped mote | Pickup while invulnerable, after the damage step |
| Spawning grace | No scheduled shade at 299, stationary through 329, moves at 330 |
| Same-tick actions | Pickup, then deposit, then affordability check for pulse |

Fixtures run through the headless trace in `tests/lanterns.test.ts` and `tests/shades.test.ts`. Existing CLI tests cover dawn loss, invalid files and fall deaths. Ticket 01’s empty-entity expectation was updated for the populated default map. Scheduled shades use the SPEC’s 30-tick spawning period. Safe ejection reaches the boundary in the lighting tick, within the 30-tick limit.

## One headless run

```sh
npm run headless -- --seed 42 --night 1 --scenario examples/night1-scenario.json --inputs examples/night1-inputs.json --ticks 500 --snapshot-every 30 --out dist/night1-evidence.jsonl
```

Exit 0. Events and end record from the same file, in order:

```jsonl
{"type":"event","tick":1,"name":"mote_picked","data":{"carried":10}}
{"type":"event","tick":1,"name":"player_hit","data":{"by":"shade","flames":2,"dropped":5}}
{"type":"event","tick":2,"name":"pulse","data":{"stunned_ids":["S1"]}}
{"type":"event","tick":18,"name":"deposit","data":{"lantern_id":"L1","amount":1,"deposited":10}}
{"type":"event","tick":18,"name":"lantern_lit","data":{"lantern_id":"L1"}}
{"type":"event","tick":300,"name":"shade_spawned","data":{"id":"S2"}}
{"type":"event","tick":300,"name":"shade_spawned","data":{"id":"S3"}}
{"type":"event","tick":360,"name":"game_over","data":{"result":"lost","reason":"dawn"}}
{"type":"end","ticks":360,"state":"lost","score":115}
```

## Browser playthrough

Started Vite with `npm start -- --port 5189 --strictPort` and opened the game in Orca’s embedded browser. A temporary check accelerated the live game by calling the original fixed-step function with recorded movement and button inputs. Both runs used the normal restart button, default seed 1, default map, timers, enemies and inventory. Gameplay state and scores came from the simulation.

| Browser result | Observed outcome |
|---|---|
| Win | At tick 17386 the HUD showed 5 / 5 lanterns, two flames, 00:10 remaining, and the victory overlay with 1215 points. There were 89 pickups, 10 deposits, five lighting events, six shade spawns, 12 pulses and one hit. |
| Loss after restart | Holding right through successive falls produced no_flames at tick 1503 and the defeat overlay with score 0. |
| Fresh reload | The canvas and HUD returned with three flames, 0 / 5 lights, zero score and empty inventory. |

These accelerated input replays exercise the browser simulation, adapters, HUD and restart. They do not measure real-time rendering performance or manual play difficulty. Vite reported its existing bundle-size advisory. Verification ran locally on Windows.
