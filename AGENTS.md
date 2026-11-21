# Verification gate

Install with `npm ci`; use `npm start` for the browser and `npm run headless -- <args>` for the CLI. Run `npm test` for focused checks and `npm run verify` for completion.

Before changing simulation or contract behavior, read `docs/requirements/Phase1.md` sections A–E and `GLOSSARY.md`; use `Phase2.md` for the standard numbers already implemented in this ticket.

Keep gameplay in `src/sim`, using fixed 60 Hz steps and seeded randomness. Browser and headless consume the same core; publish tuning through `src/sim/tuning.ts`.

Before reporting completion, run `npm run verify` on the final code. Completion requires exit 0 for build, all tests, and byte-for-byte replay. If verification fails, fix the cause and rerun; report a blocker when an external dependency prevents success. A failing gate blocks a success report. The Claude Code Stop hook enforces the same gate with exit 2.
