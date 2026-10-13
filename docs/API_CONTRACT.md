# API Contract

This document describes the shared TypeScript types and the Socket.IO event protocol that connects the three modules. All types live in `packages/shared/src/types.ts` and are imported via the `@git-cure/shared` workspace alias.

---

## Transport

The CLI engine (`packages/cli`) emits events by calling helper functions in `services/server/src/index.ts`. The server relays them to any connected dashboard over Socket.IO (WebSocket on `ws://127.0.0.1:7432`).

The dashboard (`apps/dashboard`) imports the singleton socket from `apps/dashboard/src/services/socket.ts` and registers listeners for each named event. The only event the dashboard emits is `approval:granted`.

---

## Socket.IO events

Event name constants are defined in both `services/server/src/index.ts` (server) and `apps/dashboard/src/services/socket.ts` (client). Any rename must be made in both files.

### Server → Client

| Event                    | Payload type           | Trigger                                      |
|--------------------------|------------------------|----------------------------------------------|
| `repo:status:updated`    | `RepositoryStatus`     | CLI finishes collecting telemetry            |
| `diagnosis:ready`        | `DiagnosticResult`     | Gemma module returns a validated result      |
| `recovery:plan:ready`    | `RecoveryStep[]`       | CLI builds the recovery plan                 |
| `recovery:step:changed`  | `RecoveryStep`         | Any step status transition                   |
| `snapshot:created`       | `SnapshotMetadata`     | CLI creates a safety snapshot                |
| `log:appended`           | `ExecutionLog`         | Any CLI log entry                            |
| `verification:complete`  | `VerificationResult[]` | Post-execution health checks finish          |
| `session:started`        | `{ sessionId, startedAt }` | Recovery session begins               |
| `session:ended`          | `{ sessionId, endedAt, reason }` | Recovery session ends           |

### Client → Server

| Event               | Payload                         | Effect                                       |
|---------------------|---------------------------------|----------------------------------------------|
| `approval:granted`  | `{ stepId, approvedAt }`        | CLI engine unblocks the matching step        |

---

## Types

### `RiskLevel`

```typescript
type RiskLevel = "green" | "amber" | "red" | "destructive";
```

Used on `DiagnosticResult` and `RecoveryStep` to encode how dangerous a situation or command is.

---

### `RepositoryStatus`

Produced by: **CLI engine**
Consumed by: **Gemma module**, **Dashboard**

| Field               | Type      | Description                                  |
|---------------------|-----------|----------------------------------------------|
| `repoPath`          | string    | Absolute repository root path                |
| `repoName`          | string    | Derived from repoPath last segment           |
| `currentBranch`     | string    | Checked-out branch name                      |
| `headCommit`        | string    | Full SHA-1 of HEAD                           |
| `isDetachedHead`    | boolean   | HEAD pointing to commit rather than ref      |
| `workingTreeStatus` | string    | Human label: "clean", "dirty", "merging"     |
| `stagedCount`       | number    | Files in the index                           |
| `unstagedCount`     | number    | Tracked files with unstaged changes          |
| `untrackedCount`    | number    | Untracked files                              |
| `conflictedCount`   | number    | Files with unresolved conflicts              |
| `collectedAt`       | string    | ISO 8601 timestamp                           |

---

### `DiagnosticResult`

Produced by: **Gemma module**
Consumed by: **CLI engine** (recovery planning), **Dashboard**

| Field               | Type        | Description                              |
|---------------------|-------------|------------------------------------------|
| `issue`             | string      | Short label for the detected problem     |
| `rootCause`         | string      | Plain-language explanation from Gemma    |
| `riskLevel`         | RiskLevel   | Overall severity                         |
| `confidence`        | number?     | 0–1 model confidence score, if emitted   |
| `affectedFiles`     | string[]    | Paths involved in the issue              |
| `recommendedActions`| string[]    | Ordered list of suggested actions        |

---

### `RecoveryStep`

Produced by: **Gemma module** (via CLI engine)
Consumed by: **CLI engine** (execution), **Dashboard** (display + approval)

| Field               | Type          | Description                                          |
|---------------------|---------------|------------------------------------------------------|
| `stepId`            | string        | Stable unique ID within a plan                       |
| `description`       | string        | What this step does                                  |
| `command`           | string?       | Shell command, if applicable                         |
| `commandExplanation`| string        | Why the command is safe (or not)                     |
| `riskLevel`         | RiskLevel     | Risk level of this step                              |
| `status`            | StepStatus    | Current execution state                              |
| `requiresApproval`  | boolean       | Must pause for user confirmation                     |
| `rollback`          | RollbackStep? | Structured undo strategy for mutating steps          |

`StepStatus` values: `"pending"` `"awaiting-approval"` `"running"` `"completed"` `"skipped"` `"failed"`

---

### `RollbackStep`

Embedded in `RecoveryStep.rollback`. Present only for steps that mutate the repository.

| Field                      | Type     | Description                                                    |
|----------------------------|----------|----------------------------------------------------------------|
| `description`              | string   | Plain-language description of the undo action                  |
| `command`                  | string?  | Git command to run for rollback                                |
| `canGuaranteeRestoration`  | boolean  | False if untracked files, stash conflicts, or force ops mean exact restoration is not guaranteed |
| `warningMessage`           | string?  | Required when `canGuaranteeRestoration` is false; shown in UI  |
| `snapshotId`               | string?  | ID of the snapshot taken before this step ran                  |

**Safety rule:** The dashboard MUST surface `warningMessage` before the user approves any step where `canGuaranteeRestoration` is false. The CLI MUST NOT execute a rollback unless `snapshotId` is set and that snapshot is `active`.

---

### `SnapshotMetadata`

Produced by: **CLI engine**
Consumed by: **Dashboard**

| Field        | Type           | Description                     |
|--------------|----------------|---------------------------------|
| `snapshotId` | string         | Stable unique ID                |
| `createdAt`  | string         | ISO 8601                        |
| `type`       | SnapshotType   | `"stash"` `"backup-branch"` `"tag"` |
| `status`     | SnapshotStatus | `"active"` `"applied"` `"dropped"` `"expired"` |
| `description`| string         | Human-readable note             |

---

### `ExecutionLog`

Produced by: **CLI engine**
Consumed by: **Dashboard**

| Field       | Type      | Description                       |
|-------------|-----------|-----------------------------------|
| `timestamp` | string    | ISO 8601                          |
| `level`     | LogLevel  | `"info"` `"warn"` `"error"` `"debug"` |
| `message`   | string    | Log entry text                    |
| `stepId`    | string?   | Associated recovery step, if any  |

---

### `VerificationResult`

Produced by: **CLI engine** (post-execution checks)
Consumed by: **Dashboard**

| Field         | Type    | Description                     |
|---------------|---------|---------------------------------|
| `checkName`   | string  | What was checked                |
| `passed`      | boolean | Whether the check passed        |
| `explanation` | string  | One-sentence outcome description |

---

## Changing the contract

1. Open a PR or discussion before changing any type.
2. All affected modules must be updated in the same PR.
3. Update `apps/dashboard/src/data/mockData.ts` to match the new shape.
4. Update the Socket.IO event tables in `services/server/src/index.ts`, `apps/dashboard/src/services/socket.ts`, and this document.
5. Update this document.
