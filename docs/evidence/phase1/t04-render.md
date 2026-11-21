# Ticket 04 — Night 1 browser render evidence

Verified 2026-11-21 on Windows, Node v24.14.0, npm 11.21.2.
Implementation commit: `0f9ea72`.

## Checks

- Existing `node_modules` was present; no dependency changes or install needed.
- `npm run build`: exit 0; TypeScript headless/web and Vite production build passed (13 modules). Vite reports its advisory warning for the ~508 kB Three.js bundle.
- `npm test`: exit 0; 2 files, 62 tests passed.
- The initial sandbox build could not spawn esbuild (`EPERM`); build and tests passed when rerun with approved process access.
- `git diff --check`: passed.
- Build regenerated `game.contract.json` with line-ending-only differences; restored to HEAD. No changes to sim, headless, dependencies, or contract.

## Browser

Vite: `npm start -- --port 5174 --strictPort`, URL http://localhost:5174/.
Orca browser viewport: 1280 × 720. No application console errors after fresh reload.

- [Scene and HUD](t04-night1.png): actual base simulation, grass/sand island, sea/fog, primitive Mây with scarf/hat/lantern, unlit Great Lanterns, timer, flames, carry, score.
- [Loss overlay](t04-loss.png): actual simulation dawn transition, with test harness setting tick to 17999 then allowing the next normal simulation step to reach tick 18000.
- [Win overlay fixture](t04-win-fixture.png): **presentation fixture only**; injected `state='won'` and score 123 into the browser instance. This is not evidence of a complete winning playthrough.
- [Browser checks](t04-browser-check.json): input observation verified D movement, Space/E/Q mapping, mouse yaw, right-click pulse, blur clearing inputs. Adapter fixtures verified lantern lit color/position, mote creation/removal/GPU disposal, stunned shade color, missing-array fallback, and dawn loss overlay.
- [Restart checks](t04-restart-check.json): restart created a fresh playing simulation with cleared input/yaw; win presentation reflected fixture score. Browser reloaded afterward to remove all injected instrumentation/state.

Input observations temporarily wrapped `Simulation.prototype.step` in browser memory, then dispatched keyboard/mouse events. The first mouse assertion ran before a rendered frame at 100 ms; the complete check passed with 800 ms waits. No instrumentation or fixtures are shipped in source.

## Scope and integration limits

This branch is based on ticket 01. Its simulation currently implements movement and dawn loss, with empty lantern/mote/shade arrays; jump, fall, collection, deposit, pulse effects, enemies, and win rules belong to other tickets. The render forwards their inputs and reads their optional state arrays, but a complete winning playthrough cannot be verified until those simulation tickets are integrated. The five standard Night 1 lanterns are shown as unlit fallback geometry while the base sim has no lantern array; existing state positions/lit flags take precedence when present.

The renderer includes no gameplay rules and never assigns simulation score, health, positions, entity arrays, or terminal state. It uses a fixed 60 Hz accumulator with player interpolation, drops hidden-tab elapsed time, and clears held inputs on blur/hide/restart. Entity removal disposes GPU geometry/materials so replay does not retain removed mote/shade resources.

Controls: WASD/arrows move relative to camera, left drag rotates camera, Space jump, E interact, Q/right mouse pulse. Right and forward movement follow the screen axes; the sim still receives its standard world rotation via `cam_yaw_deg`.
