# Team Workflow

Three teammates, three modules, three hours. This document tells each person where to work and how to integrate.

---

## Module ownership

### Teammate 1 — Dashboard (`apps/dashboard/`)

**Goal:** Build a presentation interface that shows repository health, diagnosis, recovery steps, risk levels, snapshots, and execution logs in real time. Display rollback warnings before the user grants approval.

**Works with:**
- `apps/dashboard/src/pages/` — add pages as needed
- `apps/dashboard/src/components/` — build shared UI primitives here
- `apps/dashboard/src/services/socket.ts` — Socket.IO client; register listeners and replace stub handlers with real React state updates
- `apps/dashboard/src/services/api.ts` — REST poll functions; keep as a fallback for initial load
- `apps/dashboard/src/data/mockData.ts` — use mock data until Phases 2/3 are done

**Does not touch:**
- `packages/shared/src/types.ts` — only via team agreement
- `packages/cli/`
- `services/gemma/`
- `services/server/src/index.ts` — read it to understand event names, but do not edit it

**Branch example:** `feat/dashboard-recovery-ui`

---

### Teammate 2 — CLI engine (`packages/cli/`)

**Goal:** Collect real `RepositoryStatus` telemetry from the local repository, detect anomalous states, create safety snapshots, execute approved recovery steps, and emit Socket.IO events via the server emitter helpers.

**Works with:**
- `packages/cli/src/` — implement telemetry, detection, execution, rollback logic
- `packages/shared/src/types.ts` — read-only; request changes via PR
- `services/server/src/index.ts` — import and call the `emit*` helper functions

**Integration contract:**
- Produce `RepositoryStatus` in the shape defined in `docs/API_CONTRACT.md`.
- Call `emitRepoStatus(status)` after each telemetry collection.
- Call `emitStepStatusChanged(step)` after every step state transition.
- Create a `SnapshotMetadata` record before any write operation and call `emitSnapshotCreated(snapshot)`.
- Record the `snapshotId` in `RecoveryStep.rollback.snapshotId`.
- Wait for `approval:granted` (forwarded by the server) before running any step with `requiresApproval: true`.
- Stop execution if any step's required checks fail.
- Never execute a command that is not in the approved allowlist.

**Does not touch:**
- `apps/dashboard/`
- `services/gemma/`

**Branch example:** `feat/cli-git-telemetry`

---

### Teammate 3 — Gemma engine (`services/gemma/`)

**Goal:** Turn raw `RepositoryStatus` telemetry into a validated `DiagnosticResult` and a `RecoveryStep[]` plan, with structured `RollbackStep` entries on every mutating step.

**Works with:**
- `services/gemma/src/` — implement prompt construction, API call, schema validation, risk classification
- `packages/shared/src/types.ts` — read-only; request changes via PR

**Integration contract:**
- Accept `RepositoryStatus`, return `DiagnosticResult` and `RecoveryStep[]` in the shapes defined in `docs/API_CONTRACT.md`.
- Validate all Gemma output against the schema before returning — never pass raw model output downstream.
- Set `RollbackStep.canGuaranteeRestoration = false` and provide a non-empty `warningMessage` for every step that touches untracked files or uses force options.
- Do not include `GEMMA_API_KEY` in any returned object or log line.

**Does not touch:**
- `apps/dashboard/`
- `packages/cli/`

**Branch example:** `feat/gemma-diagnosis-prompt`

---

### Server (`services/server/`)

Owned collectively — any teammate may edit it to expose a new emitter helper or adjust the CORS origin. All changes require a short team chat message so no-one is surprised.

---

## Integration sequence

```
Phase 2: Teammate 2 builds CLI telemetry and emits Socket.IO events
             │
             └─▶ Teammate 3 integrates Gemma once RepositoryStatus is stable
                         │
                         └─▶ Teammate 1 replaces mock data with live socket listeners
                                     once both CLI events and Gemma output are stable
```

Teammates 2 and 3 can work in parallel. Teammate 1 can build all UI components against mock data and swap in real data at the end.

---

## Verifying the stack locally

```bash
# 1. Install everything from root
npm install --include=dev

# 2. Start the local bridge server (services/server)
npm run dev:server

# 3. In a separate terminal, verify the health endpoint
curl http://127.0.0.1:7432/health
# Expected: {"status":"ok","service":"@git-cure/server",...}

# 4. Start the dashboard
npm run dev

# 5. Open http://localhost:5173
#    The "mock data" indicator in the top bar should show amber.
#    Connecting to the server will change it to green (Phase 2).
```

---

## Daily rhythm

1. `git pull origin main` before starting any session.
2. Branch from `main`, not from a teammate's branch.
3. Open a draft PR early so teammates can see what you are working on.
4. Post a short update in the team chat before handing off.

---

## When you need to change shared types

1. Write a comment in the team chat explaining the change and why.
2. Get a +1 from at least one other teammate.
3. Open a PR that updates `packages/shared/src/types.ts`, the mock data, the Socket.IO event tables (server + dashboard), and the API contract document together.
4. The other teammates rebase their branches after this PR merges.
