/**
 * Centralised mock data for dashboard development.
 *
 * These values simulate what the CLI engine will eventually supply via its
 * local API and Socket.IO events. Use them while Phases 2 and 3 are in progress.
 *
 * Rules:
 *   - No real paths, credentials, or API keys here.
 *   - Keep the dataset small — it only needs to drive component development.
 *   - Replace with live Socket.IO event data once the server is running.
 */

import type {
  DiagnosticResult,
  ExecutionLog,
  RecoveryStep,
  RepositoryStatus,
  SnapshotMetadata,
  VerificationResult,
} from "@git-cure/shared";

export const mockRepoStatus: RepositoryStatus = {
  repoPath: "/workspace/my-project",
  repoName: "my-project",
  currentBranch: "feat/user-auth",
  headCommit: "a3f8d2c1b9e54f1234567890abcdef0123456789",
  isDetachedHead: false,
  workingTreeStatus: "dirty",
  stagedCount: 2,
  unstagedCount: 4,
  untrackedCount: 1,
  conflictedCount: 1,
  collectedAt: "2024-10-13T09:14:00Z",
};

export const mockDiagnosis: DiagnosticResult = {
  issue: "Merge conflict in shared auth module",
  rootCause:
    "A concurrent change to src/auth/session.ts on main and feat/user-auth modified the same function signature. Git cannot automatically resolve the difference.",
  riskLevel: "amber",
  confidence: 0.91,
  affectedFiles: ["src/auth/session.ts", "src/auth/tokens.ts"],
  recommendedActions: [
    "Inspect conflict markers in src/auth/session.ts",
    "Accept the incoming change for the token refresh signature",
    "Re-run the test suite after resolution",
    "Complete the merge with git merge --continue",
  ],
};

export const mockRecoverySteps: RecoveryStep[] = [
  {
    stepId: "step-1",
    description: "Stash any unrelated working-tree changes before proceeding",
    command: "git stash push -m 'pre-recovery-stash'",
    commandExplanation:
      "Temporarily shelves uncommitted work so it is not affected by the merge resolution.",
    riskLevel: "green",
    status: "completed",
    requiresApproval: false,
    rollback: {
      description: "Pop the stash to restore shelved changes",
      command: "git stash pop",
      canGuaranteeRestoration: false,
      warningMessage:
        "Stash pop may conflict if the working tree was modified between the stash and this rollback. Untracked files were not captured.",
    },
  },
  {
    stepId: "step-2",
    description: "Open the conflicted file for manual review",
    commandExplanation:
      "No command — the developer resolves the conflict markers in their editor.",
    riskLevel: "green",
    status: "completed",
    requiresApproval: false,
  },
  {
    stepId: "step-3",
    description: "Stage the resolved file",
    command: "git add src/auth/session.ts",
    commandExplanation: "Marks the conflict as resolved by staging the file.",
    riskLevel: "green",
    status: "awaiting-approval",
    requiresApproval: false,
  },
  {
    stepId: "step-4",
    description: "Continue the merge",
    command: "git merge --continue",
    commandExplanation:
      "Creates the merge commit with the current index state.",
    riskLevel: "amber",
    status: "pending",
    requiresApproval: true,
    rollback: {
      description: "Abort the in-progress merge to return to the pre-merge state",
      command: "git merge --abort",
      canGuaranteeRestoration: true,
    },
  },
];

export const mockSnapshot: SnapshotMetadata = {
  snapshotId: "snap-20241013-0914",
  createdAt: "2024-10-13T09:14:05Z",
  type: "stash",
  status: "active",
  description: "pre-recovery-2024-10-13",
};

export const mockLogs: ExecutionLog[] = [
  {
    timestamp: "2024-10-13T09:14:00Z",
    level: "info",
    message: "Repository scan started for my-project",
  },
  {
    timestamp: "2024-10-13T09:14:01Z",
    level: "info",
    message: "Telemetry collected — 1 conflict detected",
  },
  {
    timestamp: "2024-10-13T09:14:02Z",
    level: "warn",
    message: "Conflict markers found in src/auth/session.ts",
  },
  {
    timestamp: "2024-10-13T09:14:03Z",
    level: "info",
    message: "Diagnosis forwarded to Gemma module",
  },
  {
    timestamp: "2024-10-13T09:14:04Z",
    level: "info",
    message: "Safety snapshot created — snap-20241013-0914",
    stepId: "step-1",
  },
  {
    timestamp: "2024-10-13T09:14:05Z",
    level: "info",
    message: "step-1 completed: stash pushed",
    stepId: "step-1",
  },
  {
    timestamp: "2024-10-13T09:14:06Z",
    level: "info",
    message: "step-2 completed: manual review noted",
    stepId: "step-2",
  },
  {
    timestamp: "2024-10-13T09:14:07Z",
    level: "info",
    message: "step-3 awaiting approval",
    stepId: "step-3",
  },
];

export const mockVerification: VerificationResult[] = [
  {
    checkName: "No conflict markers remain",
    passed: false,
    explanation: "src/auth/session.ts still contains <<<<<<< markers.",
  },
  {
    checkName: "Working tree is clean",
    passed: false,
    explanation: "4 unstaged changes and 1 untracked file present.",
  },
  {
    checkName: "Tests pass",
    passed: false,
    explanation: "Verification runs after conflict resolution is complete.",
  },
];
