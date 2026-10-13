# Architecture

## Overview

git-cure is a CLI-first tool with a separate, read-only dashboard interface. The two sides communicate exclusively through a lightweight local Socket.IO server — the dashboard never executes git commands.

```
┌──────────────────────────────────────────────────────────────────┐
│  Developer's machine                                             │
│                                                                  │
│  Local Git repository                                            │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────┐                                             │
│  │  CLI engine      │  packages/cli                              │
│  │                  │                                            │
│  │  • git status    │  Reads the repository via the git CLI      │
│  │  • git log       │  through child_process.execFile with an    │
│  │  • git diff      │  argument array — no shell interpolation.  │
│  │  • anomaly scan  │  Never modifies the repo without an        │
│  │  • snapshot      │  explicit approved step.                   │
│  │  • execution     │                                            │
│  └────────┬─────────┘                                            │
│           │  RepositoryStatus                                    │
│           ▼                                                      │
│  ┌─────────────────┐                                             │
│  │  Gemma module    │  services/gemma                            │
│  │                  │                                            │
│  │  • prompt build  │  Constructs a structured prompt from       │
│  │  • API call      │  telemetry, calls Gemma, validates the     │
│  │  • schema valid  │  response against the DiagnosticResult     │
│  │  • risk class    │  schema before forwarding it downstream.   │
│  └────────┬─────────┘                                            │
│           │  DiagnosticResult, RecoveryStep[]                    │
│           ▼                                                      │
│  ┌─────────────────┐                                             │
│  │  Recovery layer  │  packages/cli                              │
│  │                  │                                            │
│  │  • plan build    │  Sequences steps, classifies risk,         │
│  │  • approval gate │  pauses for user sign-off on dangerous     │
│  │  • snapshot      │  commands (requiresApproval: true).        │
│  │  • execution     │  Creates a safety snapshot (stash or       │
│  │  • rollback      │  backup branch) before any write op.       │
│  │  • verification  │  Emits events to the server after each     │
│  └────────┬─────────┘  state change.                            │
│           │  Socket.IO events (127.0.0.1 only)                  │
│           ▼                                                      │
│  ┌─────────────────┐                                             │
│  │  Local server    │  services/server                           │
│  │                  │                                            │
│  │  • /health       │  Express + Socket.IO bridge.               │
│  │  • Socket.IO     │  Binds to 127.0.0.1 only.                  │
│  │  • event relay   │  Relays CLI events to the dashboard;       │
│  │  • approval fwd  │  forwards user approval back to the CLI.   │
│  └────────┬─────────┘  Never executes git commands.             │
│           │  WebSocket (ws://127.0.0.1:7432)                    │
│           ▼                                                      │
│  ┌─────────────────┐                                             │
│  │  Dashboard       │  apps/dashboard                            │
│  │                  │                                            │
│  │  • read-only     │  Connects to the local server via          │
│  │  • presentation  │  socket.io-client, listens to events,      │
│  │  • approval UI   │  and renders the recovery workflow.        │
│  │                  │  The only write it performs is emitting     │
│  │                  │  the approval:granted event.               │
│  └─────────────────┘                                             │
└──────────────────────────────────────────────────────────────────┘
```

## Safety principles

**The dashboard never executes shell commands.** It is a purely presentational layer that subscribes to events from the local server. UI bugs cannot accidentally modify the repository.

**Every destructive step requires explicit user approval.** The CLI engine pauses before any step with `requiresApproval: true` and waits for the dashboard to emit `approval:granted` with the matching `stepId`.

**Snapshots precede write operations.** Before executing a recovery plan, the CLI engine creates a stash or backup branch so any mistake can be undone. The `snapshotId` is recorded in the `RollbackStep` for the matching recovery step.

**Snapshots do not guarantee zero data loss.** Untracked files and files excluded by `.gitignore` are not captured by a stash. The dashboard surfaces this warning whenever `RollbackStep.canGuaranteeRestoration` is `false`.

**Commands run through an allowlist.** The CLI uses `child_process.execFile` with a fixed argument array. No user-supplied string is ever interpolated into a shell command.

**API keys stay server-side.** `GEMMA_API_KEY` is read from the environment in `services/gemma`. It is never sent over Socket.IO events or logged to the dashboard.

## Workspace layout

```
git-cure/
├── apps/dashboard/     @git-cure/dashboard   React + Vite dashboard
├── packages/shared/    @git-cure/shared      Types only, no runtime code
├── packages/cli/       @git-cure/cli         Git telemetry + recovery engine
├── services/gemma/     @git-cure/gemma       Gemma API client + validation
└── services/server/    @git-cure/server      Express + Socket.IO local bridge
```

## Socket.IO event protocol

All events are defined as constants in `services/server/src/index.ts` (server side) and `apps/dashboard/src/services/socket.ts` (client side). The two files must stay in sync.

| Direction        | Event name                | Payload type         |
|-----------------|---------------------------|----------------------|
| server → client | `repo:status:updated`     | `RepositoryStatus`   |
| server → client | `diagnosis:ready`         | `DiagnosticResult`   |
| server → client | `recovery:plan:ready`     | `RecoveryStep[]`     |
| server → client | `recovery:step:changed`   | `RecoveryStep`       |
| server → client | `snapshot:created`        | `SnapshotMetadata`   |
| server → client | `log:appended`            | `ExecutionLog`       |
| server → client | `verification:complete`   | `VerificationResult[]` |
| server → client | `session:started`         | `{ sessionId, startedAt }` |
| server → client | `session:ended`           | `{ sessionId, endedAt, reason }` |
| client → server | `approval:granted`        | `{ stepId, approvedAt }` |

## Key decisions

### Monorepo with npm workspaces
Simple to set up for a hackathon. No Turborepo or Nx needed at this scale.

### TypeScript throughout
All modules share types from `@git-cure/shared`. No runtime schema library in Phase 1 — Zod validation of Gemma output is added in Phase 3 once the response shape is stable.

### Socket.IO over polling
Socket.IO allows the CLI to push events at the moment they occur (step status changes, new log lines, approval requests) rather than requiring the dashboard to poll on a timer. The server also re-emits the latest state on dashboard reconnect.

### Express + Socket.IO on a fixed local port
Port defaults to `7432`, configurable via `GIT_CURE_PORT`. The server binds only to `127.0.0.1` so it cannot be reached from the network.

### No eval, ever
The CLI executes specific, allowlisted git commands using `child_process.execFile` with an argument array. No user input is interpolated into a shell string.
