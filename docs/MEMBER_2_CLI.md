# Member 2 — CLI Engine Developer Context

**Your role:** Build the core Git diagnostics engine that detects repository problems, creates safety snapshots, executes recovery commands, and emits real-time events.

---

## What's Already Done

✅ Project structure with npm workspaces  
✅ Shared TypeScript types in `@git-cure/shared`  
✅ Socket.IO server placeholder in `services/server`  
✅ Dashboard ready to receive events  
✅ Mock data showing expected output format  

---

## Your Workspace

**Primary directory:** `packages/cli/`

```
packages/cli/
├── src/
│   └── index.ts                      # Entry point (build from here)
├── package.json
└── tsconfig.json
```

**You will create:**
```
packages/cli/
├── src/
│   ├── index.ts                      # CLI entry point
│   ├── telemetry.ts                  # Git status collection
│   ├── detector.ts                   # Problem detection logic
│   ├── executor.ts                   # Command execution engine
│   ├── snapshot.ts                   # Safety snapshot creation
│   ├── validator.ts                  # Pre-execution validation
│   └── types.ts                      # CLI-specific types (if needed)
└── bin/
    └── git-cure                      # CLI executable (optional)
```

---

## Your Tasks

### Phase 1: Git Telemetry (Priority)

**Collect repository state:**

Create `src/telemetry.ts`:

```typescript
import { execSync } from 'child_process';
import type { RepositoryStatus } from '@git-cure/shared';

export async function collectRepoStatus(): Promise<RepositoryStatus> {
  // 1. Get current branch
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  
  // 2. Get HEAD commit
  const headCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  
  // 3. Parse git status --porcelain
  const statusOutput = execSync('git status --porcelain', { encoding: 'utf-8' });
  
  // 4. Count staged, unstaged, untracked, conflicted files
  const lines = statusOutput.split('\n').filter(Boolean);
  const staged = lines.filter(l => l[0] !== '?' && l[0] !== ' ').length;
  const unstaged = lines.filter(l => l[1] !== ' ' && l[1] !== '?').length;
  const untracked = lines.filter(l => l.startsWith('??')).length;
  const conflicted = lines.filter(l => l.startsWith('UU') || l.startsWith('AA')).length;
  
  // 5. Determine working tree status
  let workingTreeStatus = 'clean';
  if (conflicted > 0) workingTreeStatus = 'conflicted';
  else if (staged > 0 || unstaged > 0) workingTreeStatus = 'dirty';
  
  return {
    repoName: path.basename(process.cwd()),
    currentBranch: branch,
    headCommit,
    workingTreeStatus,
    stagedCount: staged,
    unstagedCount: unstaged,
    untrackedCount: untracked,
    conflictedCount: conflicted,
    collectedAt: new Date().toISOString(),
  };
}
```

**Integration:**
```typescript
import { emitRepoStatus } from '../../services/server/src/index';

const status = await collectRepoStatus();
emitRepoStatus(status);
```

### Phase 2: Problem Detection

**Detect common Git issues:**

Create `src/detector.ts`:

```typescript
import type { RepositoryStatus, DiagnosticResult, RiskLevel } from '@git-cure/shared';

export function detectProblems(status: RepositoryStatus): DiagnosticResult | null {
  // Conflict detection
  if (status.conflictedCount > 0) {
    return {
      issue: 'Merge conflict detected',
      rootCause: 'Git attempted to merge changes but found conflicting modifications...',
      riskLevel: 'amber' as RiskLevel,
      confidence: 0.95,
      affectedFiles: getConflictedFiles(), // implement this
      recommendedActions: [
        'Review conflicted files',
        'Resolve conflicts manually or use merge tool',
        'Stage resolved files with git add',
        'Complete merge with git commit',
      ],
    };
  }
  
  // Detached HEAD detection
  if (status.currentBranch === 'HEAD') {
    return {
      issue: 'Detached HEAD state',
      rootCause: 'You are not on any branch...',
      riskLevel: 'amber',
      confidence: 1.0,
      affectedFiles: [],
      recommendedActions: [
        'Create a new branch to save work',
        'Or checkout an existing branch',
      ],
    };
  }
  
  // Add more detection patterns...
  
  return null;
}
```

### Phase 3: Safety Snapshots

**Create rollback points before any destructive operation:**

Create `src/snapshot.ts`:

```typescript
import { execSync } from 'child_process';
import type { SnapshotMetadata } from '@git-cure/shared';

export function createSnapshot(description: string): SnapshotMetadata {
  const snapshotId = `cure_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  // Create stash with untracked files
  try {
    execSync('git stash push -u -m "' + snapshotId + '"', { encoding: 'utf-8' });
    
    return {
      snapshotId,
      description,
      type: 'stash',
      status: 'created',
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      snapshotId,
      description,
      type: 'stash',
      status: 'failed',
      createdAt: new Date().toISOString(),
    };
  }
}

export function restoreSnapshot(snapshotId: string): boolean {
  try {
    // Find stash index by message
    const stashList = execSync('git stash list', { encoding: 'utf-8' });
    const stashIndex = stashList.split('\n').findIndex(line => line.includes(snapshotId));
    
    if (stashIndex === -1) return false;
    
    execSync(`git stash pop stash@{${stashIndex}}`, { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}
```

### Phase 4: Command Executor

**Execute recovery steps with validation:**

Create `src/executor.ts`:

```typescript
import { execSync } from 'child_process';
import type { RecoveryStep, ExecutionLog, LogLevel } from '@git-cure/shared';

const ALLOWED_COMMANDS = [
  'git add',
  'git commit',
  'git checkout',
  'git merge',
  'git rebase --continue',
  'git rebase --abort',
  'git reset',
  'git stash',
  'git clean',
];

export function validateCommand(command: string): boolean {
  return ALLOWED_COMMANDS.some(allowed => command.startsWith(allowed));
}

export async function executeStep(step: RecoveryStep): Promise<ExecutionLog> {
  const startTime = new Date().toISOString();
  
  // Validation
  if (!validateCommand(step.command!)) {
    return {
      timestamp: startTime,
      level: 'error' as LogLevel,
      message: `Command blocked: ${step.command}`,
      stepId: step.stepId,
    };
  }
  
  // Wait for approval if required
  if (step.requiresApproval && step.status !== 'approved') {
    return {
      timestamp: startTime,
      level: 'warn' as LogLevel,
      message: `Step ${step.stepId} awaiting approval`,
      stepId: step.stepId,
    };
  }
  
  // Execute
  try {
    const output = execSync(step.command!, { encoding: 'utf-8', cwd: process.cwd() });
    return {
      timestamp: new Date().toISOString(),
      level: 'info' as LogLevel,
      message: `✓ ${step.description}`,
      stepId: step.stepId,
    };
  } catch (error: any) {
    return {
      timestamp: new Date().toISOString(),
      level: 'error' as LogLevel,
      message: `✗ Failed: ${error.message}`,
      stepId: step.stepId,
    };
  }
}
```

### Phase 5: Main CLI Loop

**Wire everything together in `src/index.ts`:**

```typescript
import { collectRepoStatus } from './telemetry';
import { detectProblems } from './detector';
import { createSnapshot } from './snapshot';
import { executeStep } from './executor';
import { 
  emitRepoStatus, 
  emitDiagnosisReady,
  emitRecoveryPlanReady,
  emitStepStatusChanged,
  emitSnapshotCreated,
  emitLogAppended,
} from '../../services/server/src/index';

async function main() {
  console.log('git-cure: analyzing repository...');
  
  // 1. Collect telemetry
  const repoStatus = await collectRepoStatus();
  emitRepoStatus(repoStatus);
  
  // 2. Detect problems
  const diagnosis = detectProblems(repoStatus);
  if (!diagnosis) {
    console.log('✓ No issues detected');
    return;
  }
  emitDiagnosisReady(diagnosis);
  
  // 3. Generate recovery plan (or delegate to Gemma)
  const recoveryPlan = await generateRecoveryPlan(diagnosis);
  emitRecoveryPlanReady(recoveryPlan);
  
  // 4. Create safety snapshot
  const snapshot = createSnapshot('Before recovery execution');
  emitSnapshotCreated(snapshot);
  
  // 5. Execute steps
  for (const step of recoveryPlan) {
    emitStepStatusChanged({ ...step, status: 'running' });
    
    const log = await executeStep(step);
    emitLogAppended(log);
    
    if (log.level === 'error') {
      emitStepStatusChanged({ ...step, status: 'failed' });
      break;
    }
    
    emitStepStatusChanged({ ...step, status: 'completed' });
  }
  
  console.log('✓ Recovery complete');
}

main().catch(console.error);
```

---

## Integration with Gemma (Member 3)

**Option 1: CLI calls Gemma directly**
```typescript
import { diagnoseWithGemma } from '../../services/gemma/src/index';

const diagnosis = await diagnoseWithGemma(repoStatus);
```

**Option 2: CLI generates basic recovery plan, Gemma enhances it**
```typescript
const basicPlan = generateBasicRecoveryPlan(repoStatus);
const enhancedPlan = await enhanceWithGemma(basicPlan);
```

---

## Development Commands

```bash
# Run CLI locally
npm run dev --workspace=@git-cure/cli

# Or use ts-node
cd packages/cli
npx ts-node src/index.ts

# Type checking
npm run typecheck
```

---

## Testing Strategy

1. **Create a test repository:**
```bash
mkdir /tmp/test-repo
cd /tmp/test-repo
git init
# Create conflicts, detached HEAD, etc.
```

2. **Run your CLI against it:**
```bash
cd /tmp/test-repo
node /path/to/packages/cli/src/index.js
```

3. **Verify events in dashboard**

---

## Key Constraints

**MUST DO:**
- ✅ Validate every command before execution
- ✅ Create snapshot before destructive operations
- ✅ Check `requiresApproval` flag and wait for approval
- ✅ Emit events for every state change
- ✅ Handle Git command errors gracefully

**NEVER DO:**
- ❌ Execute commands not in allowlist
- ❌ Skip snapshot creation for destructive operations
- ❌ Execute `requiresApproval` steps without approval
- ❌ Ignore verification failures
- ❌ Execute force push or destructive resets without explicit user confirmation

---

## Integration Points

**With Member 1 (Dashboard):**
- You emit events → server broadcasts → dashboard updates UI
- Dashboard sends `approval:granted` → server forwards → you continue execution

**With Member 3 (Gemma):**
- You collect repo state → pass to Gemma → receive diagnosis
- OR you generate basic plan → Gemma enhances it

---

## Socket.IO Server Setup

Member 3 or you will need to implement `services/server/src/index.ts`:

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:5173' }
});

// Export emitter helpers
export function emitRepoStatus(status: any) {
  io.emit('repo:status:updated', status);
}

export function emitDiagnosisReady(diagnosis: any) {
  io.emit('diagnosis:ready', diagnosis);
}

// ... more emitters

httpServer.listen(7432, () => {
  console.log('Server running on http://localhost:7432');
});
```

---

## Git Workflow

**Branch naming:** `feat/cli-<feature-name>`

Example:
```bash
git checkout -b feat/cli-telemetry
# ... make changes ...
git add .
git commit -m "Implement Git telemetry collection and status parsing"
git push origin feat/cli-telemetry
```

---

## Common Git Commands You'll Use

```bash
# Status parsing
git status --porcelain

# Branch info
git rev-parse --abbrev-ref HEAD

# Conflict files
git diff --name-only --diff-filter=U

# Stash operations
git stash push -u -m "snapshot_id"
git stash list
git stash pop stash@{0}

# Safe reset
git reset --hard HEAD~1  # (only after snapshot!)
```

---

## Current Status

✅ TypeScript types defined  
⏳ Telemetry collection (your task)  
⏳ Problem detection (your task)  
⏳ Snapshot creation (your task)  
⏳ Command executor (your task)  
⏳ Socket.IO integration (coordinate with Member 3)

**Start here:** Implement `collectRepoStatus()` in `src/telemetry.ts` and test it on a real Git repo.
