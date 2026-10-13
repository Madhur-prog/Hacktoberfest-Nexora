/**
 * @git-cure/shared — data contracts
 *
 * These types are the single source of truth for communication between the CLI
 * engine, the Gemma diagnostics module, and the dashboard. Change them with a
 * pull request so all three teammates stay in sync.
 *
 * Timestamps are ISO 8601 strings throughout, so they survive JSON serialisation
 * without losing precision.
 */

// ---------------------------------------------------------------------------
// Risk classification
// ---------------------------------------------------------------------------

/** How dangerous a proposed action or detected state is. */
export type RiskLevel = "green" | "amber" | "red" | "destructive";

// ---------------------------------------------------------------------------
// Repository state
// ---------------------------------------------------------------------------

/** A snapshot of the repository's current working-tree state, collected by the
 *  CLI engine and forwarded to both the Gemma module and the dashboard. */
export interface RepositoryStatus {
  /** Absolute path to the repository root. */
  repoPath: string;
  /** Derived from the last component of repoPath (e.g. "my-project"). */
  repoName: string;
  /** Name of the currently checked-out branch. */
  currentBranch: string;
  /** Full SHA-1 of the current HEAD commit. */
  headCommit: string;
  /** True when HEAD points to a commit directly rather than a branch ref. */
  isDetachedHead: boolean;
  /** Human-readable working-tree state, e.g. "clean", "dirty", "merging". */
  workingTreeStatus: string;
  /** Number of files in the index (staged for the next commit). */
  stagedCount: number;
  /** Number of tracked files with unstaged modifications. */
  unstagedCount: number;
  /** Number of files git does not track at all. */
  untrackedCount: number;
  /** Number of files with unresolved merge conflicts. */
  conflictedCount: number;
  /** When the telemetry was collected. */
  collectedAt: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Diagnosis
// ---------------------------------------------------------------------------

/** The structured output produced by the Gemma diagnostics module for one
 *  detected issue in a repository. */
export interface DiagnosticResult {
  /** Short label for the issue, e.g. "Detached HEAD after rebase abort". */
  issue: string;
  /** Gemma's plain-language explanation of why the issue exists. */
  rootCause: string;
  /** How severe or risky the situation is. */
  riskLevel: RiskLevel;
  /**
   * Gemma's confidence in this diagnosis, 0–1.
   * Omitted when the model did not emit a score.
   */
  confidence?: number;
  /** Paths of files directly involved in the issue. */
  affectedFiles: string[];
  /** Ordered list of actions the model recommends. */
  recommendedActions: string[];
}

// ---------------------------------------------------------------------------
// Recovery
// ---------------------------------------------------------------------------

/** Execution state of a single recovery step. */
export type StepStatus =
  | "pending"
  | "awaiting-approval"
  | "running"
  | "completed"
  | "skipped"
  | "failed";

/** One concrete, approvable step in a recovery plan. */
export interface RecoveryStep {
  /** Stable identifier, unique within a recovery plan. */
  stepId: string;
  /** What this step does, written for the developer reading the plan. */
  description: string;
  /**
   * The exact shell command to run, if any.
   * Undefined for steps that are purely informational.
   */
  command?: string;
  /** Explanation of what the command does and why it is safe (or not). */
  commandExplanation: string;
  riskLevel: RiskLevel;
  status: StepStatus;
  /** When true the CLI must pause and wait for the user to confirm before
   *  running this step. Always true for red/destructive commands. */
  requiresApproval: boolean;
  /**
   * Structured rollback strategy for this step.
   * Present only for steps that mutate the repository state.
   * The dashboard MUST display `rollback.warningMessage` (when present)
   * before the user approves any step.
   */
  rollback?: RollbackStep;
}

/**
 * Structured rollback strategy for a RecoveryStep.
 *
 * Safety constraints (enforced by CLI, surfaced by dashboard):
 *   - `canGuaranteeRestoration` MUST be false for any operation that touches
 *     untracked files, force-overwrites index entries, or drops stash contents.
 *   - When false, `warningMessage` MUST be non-empty and displayed before approval.
 *   - The CLI MUST NOT execute the rollback command unless `snapshotId` is set
 *     and that snapshot is still in `active` status.
 *   - A rollback command MUST be in the same allowlist as forward commands.
 */
export interface RollbackStep {
  /** Plain-language description of what undoing this step will do. */
  description: string;
  /**
   * The git command to run to undo the parent step.
   * Absent for purely informational rollbacks (e.g. "restore from backup manually").
   */
  command?: string;
  /**
   * True only when the rollback can exactly restore the working tree to its
   * pre-step state. False when untracked files, stash conflicts, or force
   * operations mean exact restoration is not guaranteed.
   */
  canGuaranteeRestoration: boolean;
  /**
   * REQUIRED when canGuaranteeRestoration is false.
   * Shown in the dashboard approval dialog so the user understands the risk
   * before proceeding. Never claim that a snapshot alone guarantees zero data loss.
   */
  warningMessage?: string;
  /**
   * Snapshot taken immediately before this step was executed.
   * The CLI records this after snapshot creation and before step execution.
   * Absent if the step has not yet run or created no snapshot.
   */
  snapshotId?: string;
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

export type SnapshotType = "stash" | "backup-branch" | "tag";
export type SnapshotStatus = "active" | "applied" | "dropped" | "expired";

/** Metadata for a safety snapshot created before executing a recovery plan. */
export interface SnapshotMetadata {
  snapshotId: string;
  /** When the snapshot was created. */
  createdAt: string; // ISO 8601
  type: SnapshotType;
  status: SnapshotStatus;
  /** Human-readable note, e.g. "pre-recovery-2024-10-13". */
  description: string;
}

// ---------------------------------------------------------------------------
// Execution log
// ---------------------------------------------------------------------------

export type LogLevel = "info" | "warn" | "error" | "debug";

/** One entry written to the CLI execution log during a recovery session. */
export interface ExecutionLog {
  /** When the event occurred. */
  timestamp: string; // ISO 8601
  level: LogLevel;
  message: string;
  /** The stepId this log entry relates to, if any. */
  stepId?: string;
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/** Result of one health check run after executing a recovery step. */
export interface VerificationResult {
  /** What was checked, e.g. "Working tree is clean". */
  checkName: string;
  /** Whether the check passed. */
  passed: boolean;
  /** One sentence explaining the outcome so the user understands it. */
  explanation: string;
}
