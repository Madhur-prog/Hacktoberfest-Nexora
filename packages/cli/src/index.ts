/**
 * @git-cure/cli — entry point
 *
 * Phase 2 (CLI engine) will implement:
 *   - Repository inspection via child_process / git CLI
 *   - Working-tree telemetry collection → RepositoryStatus
 *   - Git-state anomaly detection (detached HEAD, merge conflicts, etc.)
 *   - Safety snapshots (stash / backup branch) before any write operation
 *   - Guarded execution of recovery steps with user confirmation
 *   - Post-execution verification
 *   - Serving the collected state to the dashboard over a local HTTP endpoint
 *
 * Nothing here executes real Git commands. This file is a placeholder so the
 * workspace resolves and TypeScript is satisfied.
 */

import type { RepositoryStatus } from "@git-cure/shared";

// TODO(cli): implement git status collection using child_process.execFile
export async function collectRepositoryStatus(
  _repoPath: string
): Promise<RepositoryStatus> {
  throw new Error("collectRepositoryStatus: not yet implemented (Phase 2)");
}

// TODO(cli): implement anomaly detection and handoff to Gemma module
export async function runDiagnostics(_repoPath: string): Promise<void> {
  throw new Error("runDiagnostics: not yet implemented (Phase 2)");
}

// Entry point for future CLI binary
if (require.main === module) {
  console.log(
    "git-cure CLI — Phase 1 scaffold. Implementation begins in Phase 2."
  );
}
