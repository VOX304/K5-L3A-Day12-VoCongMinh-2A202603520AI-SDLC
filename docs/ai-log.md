# AI usage log

Phase 1 used AI as an implementation and review aid. Cost and token totals were not available from the session tooling, so estimates below are broad ranges rather than measured billing.

| Work | Agent | Approximate usage | Result |
|---|---|---:|---|
| Requirements, coordination, implementation review and integration | Claude Opus coordinator | 25k?60k tokens; roughly $0.50?$5 | Broke Phase 1 into tickets, reviewed contract constraints, integrated work and checked evidence. |
| Headless tracer and movement/physics work | Codex gpt-6.1-sol worker | 20k?50k tokens; roughly $0.20?$3 | Added CLI tracing, fixed-step physics, scenarios and verification harness. |
| Night 1 motes, lanterns, shades and pulse | Codex gpt-6.2-astra worker | 20k?50k tokens; roughly $0.50?$5 | Implemented gameplay, focused scenario tests and browser integration. |
| Attempts to get additional implementation/review help | agy Gemini/Sonnet | No reliable estimate; requests hit quota | No completed deliverable attributed to these attempts. |

Dollar ranges are approximate model-cost estimates from broad token assumptions and possible model pricing; actual tokens, provider routing, cache usage and billing were not recorded. They should not be read as invoices.

## How work was kept focused

The work was split into tickets with explicit contract scenarios. The implementation used the existing TypeScript simulation and tuning module, with focused scenario tests and one verification command. A coordinator cross-check independently exercised nine contract scenarios before the Phase 1 release documentation. No measured token telemetry is available to claim an exact saving.

## Errors found and recovery

- The first sandboxed build could not launch esbuild and returned EPERM. Verification was rerun with the allowed process access and passed.
- The initial ticket 01 scaffold lacked jump although PRD-0 section 2 required it. Spec review caught the gap; fixed-step jumping and related physics were added before Phase 1 completion.
- Movement tests exposed accumulated floating-point error at the island boundary, causing an early fall. A small comparison tolerance and boundary regression test corrected it.
- A fatal fall originally scheduled a respawn countdown after the last flame was lost. A focused test caught the state inconsistency; the fatal case now ends immediately.
- During agent work, an agy attempt placed a file at the wrong location. The expected path was checked and the artifact was moved or recreated in the worktree before use.

The task history and evidence files record implementation details. No exact token or cost telemetry was available.
