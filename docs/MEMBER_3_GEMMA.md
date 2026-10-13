# Member 3 — Gemma Integration Developer Context

**Your role:** Integrate Google's Gemma model to analyze Git repository state, generate intelligent diagnoses, and produce structured recovery plans.

---

## What's Already Done

✅ Project structure with npm workspaces  
✅ Shared TypeScript types in `@git-cure/shared`  
✅ CLI ready to send repository state  
✅ Dashboard ready to display AI-generated diagnoses  
✅ Mock data showing expected output format  

---

## Your Workspace

**Primary directory:** `services/gemma/`

```
services/gemma/
├── src/
│   └── index.ts                      # Entry point (build from here)
├── package.json
└── tsconfig.json
```

**You will create:**
```
services/gemma/
├── src/
│   ├── index.ts                      # Main API exports
│   ├── client.ts                     # Gemma API client setup
│   ├── prompts.ts                    # Structured prompts for Gemma
│   ├── parser.ts                     # Parse Gemma responses into types
│   ├── planner.ts                    # Generate recovery plans
│   └── validator.ts                  # Validate AI outputs
├── .env.example                      # API key template (no real keys!)
└── README.md                         # Setup instructions
```

---

## Your Tasks

### Phase 1: Gemma Client Setup (Priority)

**Set up Gemma API client:**

1. **Install Gemma SDK:**
```bash
cd services/gemma
npm install @google/generative-ai
npm install --save-dev dotenv
```

2. **Create `.env.example` in `services/gemma/`:**
```env
GEMMA_API_KEY=your_api_key_here
GEMMA_MODEL=gemma-2-9b-it
```

3. **Create `src/client.ts`:**
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMMA_API_KEY;
if (!API_KEY) {
  throw new Error('GEMMA_API_KEY not found in environment variables');
}

const genAI = new GoogleGenerativeAI(API_KEY);

export const gemmaModel = genAI.getGenerativeModel({ 
  model: process.env.GEMMA_MODEL || 'gemma-2-9b-it' 
});
```

### Phase 2: Structured Prompts

**Create diagnostic prompts in `src/prompts.ts`:**

```typescript
import type { RepositoryStatus } from '@git-cure/shared';

export function buildDiagnosisPrompt(repoStatus: RepositoryStatus): string {
  return `You are a Git diagnostics expert. Analyze this repository state and provide a structured diagnosis.

Repository Status:
- Branch: ${repoStatus.currentBranch}
- Working Tree: ${repoStatus.workingTreeStatus}
- Staged files: ${repoStatus.stagedCount}
- Unstaged files: ${repoStatus.unstagedCount}
- Untracked files: ${repoStatus.untrackedCount}
- Conflicted files: ${repoStatus.conflictedCount}

Respond in JSON format:
{
  "issue": "brief problem statement",
  "rootCause": "detailed explanation of why this happened",
  "riskLevel": "green|amber|red|destructive",
  "confidence": 0.0-1.0,
  "affectedFiles": ["file1", "file2"],
  "recommendedActions": ["action1", "action2"]
}

Focus on:
1. What specific Git problem exists
2. How the user likely got into this state
3. Risk level of potential recovery actions
4. Clear next steps

Respond ONLY with valid JSON, no additional text.`;
}

export function buildRecoveryPlanPrompt(
  repoStatus: RepositoryStatus,
  diagnosis: any
): string {
  return `You are a Git recovery expert. Generate a step-by-step recovery plan.

Current Problem:
${diagnosis.issue}

Root Cause:
${diagnosis.rootCause}

Repository State:
- Branch: ${repoStatus.currentBranch}
- Conflicted files: ${repoStatus.conflictedCount}
- Dirty working tree: ${repoStatus.stagedCount + repoStatus.unstagedCount > 0}

Generate 3-7 recovery steps as JSON array:
[
  {
    "stepId": "step-1",
    "description": "Clear description of what this step does",
    "command": "git command to execute",
    "commandExplanation": "Why we're running this command",
    "riskLevel": "green|amber|red|destructive",
    "requiresApproval": true|false,
    "expectedOutcome": "What should happen after this step",
    "rollback": {
      "canGuaranteeRestoration": true|false,
      "warningMessage": "what might be lost"
    }
  }
]

Guidelines:
- Start with low-risk information gathering commands
- Create snapshots before destructive operations
- Require approval for anything that modifies history
- Explain technical commands in plain language
- Order steps from safest to riskiest

Respond ONLY with valid JSON array, no additional text.`;
}
```

### Phase 3: Response Parser

**Create `src/parser.ts` to validate AI responses:**

```typescript
import type { DiagnosticResult, RecoveryStep, RiskLevel } from '@git-cure/shared';

export function parseDiagnosisResponse(response: string): DiagnosticResult {
  try {
    // Extract JSON from response (Gemma might wrap it in markdown)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (!parsed.issue || !parsed.rootCause || !parsed.riskLevel) {
      throw new Error('Missing required fields in diagnosis');
    }
    
    // Validate risk level
    const validRiskLevels: RiskLevel[] = ['green', 'amber', 'red', 'destructive'];
    if (!validRiskLevels.includes(parsed.riskLevel)) {
      parsed.riskLevel = 'amber'; // fallback
    }
    
    return {
      issue: parsed.issue,
      rootCause: parsed.rootCause,
      riskLevel: parsed.riskLevel as RiskLevel,
      confidence: parsed.confidence || 0.8,
      affectedFiles: parsed.affectedFiles || [],
      recommendedActions: parsed.recommendedActions || [],
    };
  } catch (error) {
    console.error('Failed to parse diagnosis:', error);
    
    // Fallback diagnosis
    return {
      issue: 'Failed to parse AI diagnosis',
      rootCause: 'AI response was malformed or incomplete',
      riskLevel: 'amber',
      confidence: 0.5,
      affectedFiles: [],
      recommendedActions: ['Retry analysis', 'Check repository manually'],
    };
  }
}

export function parseRecoveryPlanResponse(response: string): RecoveryStep[] {
  try {
    // Extract JSON array from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }
    
    return parsed.map((step, index) => ({
      stepId: step.stepId || `step-${index + 1}`,
      description: step.description || 'Unknown step',
      command: step.command || null,
      commandExplanation: step.commandExplanation || '',
      riskLevel: step.riskLevel || 'amber',
      status: 'pending',
      requiresApproval: step.requiresApproval ?? (step.riskLevel === 'red' || step.riskLevel === 'destructive'),
      expectedOutcome: step.expectedOutcome || '',
      rollback: step.rollback || {
        canGuaranteeRestoration: false,
        warningMessage: 'Rollback may not restore all state',
      },
    }));
  } catch (error) {
    console.error('Failed to parse recovery plan:', error);
    return [];
  }
}
```

### Phase 4: Main API

**Create `src/index.ts` with exported functions:**

```typescript
import { gemmaModel } from './client';
import { buildDiagnosisPrompt, buildRecoveryPlanPrompt } from './prompts';
import { parseDiagnosisResponse, parseRecoveryPlanResponse } from './parser';
import type { RepositoryStatus, DiagnosticResult, RecoveryStep } from '@git-cure/shared';

/**
 * Analyze repository status and generate diagnosis using Gemma
 */
export async function diagnoseWithGemma(
  repoStatus: RepositoryStatus
): Promise<DiagnosticResult> {
  console.log('🤖 Asking Gemma for diagnosis...');
  
  const prompt = buildDiagnosisPrompt(repoStatus);
  
  try {
    const result = await gemmaModel.generateContent(prompt);
    const response = result.response.text();
    
    console.log('✓ Gemma responded');
    
    const diagnosis = parseDiagnosisResponse(response);
    return diagnosis;
  } catch (error) {
    console.error('Gemma diagnosis failed:', error);
    
    // Fallback to rule-based diagnosis
    return fallbackDiagnosis(repoStatus);
  }
}

/**
 * Generate recovery plan using Gemma
 */
export async function generateRecoveryPlan(
  repoStatus: RepositoryStatus,
  diagnosis: DiagnosticResult
): Promise<RecoveryStep[]> {
  console.log('🤖 Asking Gemma for recovery plan...');
  
  const prompt = buildRecoveryPlanPrompt(repoStatus, diagnosis);
  
  try {
    const result = await gemmaModel.generateContent(prompt);
    const response = result.response.text();
    
    console.log('✓ Gemma responded with recovery plan');
    
    const plan = parseRecoveryPlanResponse(response);
    return plan;
  } catch (error) {
    console.error('Gemma recovery plan failed:', error);
    
    // Fallback to rule-based plan
    return fallbackRecoveryPlan(diagnosis);
  }
}

/**
 * Fallback diagnosis when Gemma API fails
 */
function fallbackDiagnosis(repoStatus: RepositoryStatus): DiagnosticResult {
  if (repoStatus.conflictedCount > 0) {
    return {
      issue: 'Merge conflicts detected',
      rootCause: 'Git attempted to merge changes but found conflicting modifications in the same lines of code.',
      riskLevel: 'amber',
      confidence: 0.95,
      affectedFiles: [],
      recommendedActions: [
        'Review conflicted files',
        'Resolve conflicts manually',
        'Stage resolved files',
        'Complete merge',
      ],
    };
  }
  
  if (repoStatus.currentBranch === 'HEAD') {
    return {
      issue: 'Detached HEAD state',
      rootCause: 'You are not currently on any branch. This can happen after checking out a commit directly.',
      riskLevel: 'amber',
      confidence: 1.0,
      affectedFiles: [],
      recommendedActions: [
        'Create a new branch to save work',
        'Or checkout an existing branch',
      ],
    };
  }
  
  return {
    issue: 'Repository state unclear',
    rootCause: 'Unable to determine specific issue',
    riskLevel: 'green',
    confidence: 0.5,
    affectedFiles: [],
    recommendedActions: ['Check git status manually'],
  };
}

/**
 * Fallback recovery plan when Gemma API fails
 */
function fallbackRecoveryPlan(diagnosis: DiagnosticResult): RecoveryStep[] {
  if (diagnosis.issue.includes('conflict')) {
    return [
      {
        stepId: 'step-1',
        description: 'List conflicted files',
        command: 'git diff --name-only --diff-filter=U',
        commandExplanation: 'Show which files have conflicts',
        riskLevel: 'green',
        status: 'pending',
        requiresApproval: false,
        expectedOutcome: 'See list of files needing manual resolution',
        rollback: {
          canGuaranteeRestoration: true,
          warningMessage: '',
        },
      },
    ];
  }
  
  return [];
}

// Export parser functions for testing
export { parseDiagnosisResponse, parseRecoveryPlanResponse };
```

### Phase 5: Socket.IO Server (Coordination Point)

**You OR Member 2 needs to implement `services/server/src/index.ts`:**

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { 
  RepositoryStatus, 
  DiagnosticResult, 
  RecoveryStep,
  SnapshotMetadata,
  ExecutionLog,
  VerificationResult 
} from '@git-cure/shared';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:5173' }
});

// Event names (must match apps/dashboard/src/services/socket.ts)
export const EVENTS = {
  REPO_STATUS_UPDATED: 'repo:status:updated',
  DIAGNOSIS_READY: 'diagnosis:ready',
  RECOVERY_PLAN_READY: 'recovery:plan:ready',
  STEP_STATUS_CHANGED: 'recovery:step:changed',
  SNAPSHOT_CREATED: 'snapshot:created',
  LOG_APPENDED: 'log:appended',
  VERIFICATION_COMPLETE: 'verification:complete',
  SESSION_STARTED: 'session:started',
  SESSION_ENDED: 'session:ended',
  APPROVAL_GRANTED: 'approval:granted',
} as const;

// Emitter helpers for CLI to use
export function emitRepoStatus(status: RepositoryStatus) {
  io.emit(EVENTS.REPO_STATUS_UPDATED, status);
}

export function emitDiagnosisReady(diagnosis: DiagnosticResult) {
  io.emit(EVENTS.DIAGNOSIS_READY, diagnosis);
}

export function emitRecoveryPlanReady(plan: RecoveryStep[]) {
  io.emit(EVENTS.RECOVERY_PLAN_READY, plan);
}

export function emitStepStatusChanged(step: RecoveryStep) {
  io.emit(EVENTS.STEP_STATUS_CHANGED, step);
}

export function emitSnapshotCreated(snapshot: SnapshotMetadata) {
  io.emit(EVENTS.SNAPSHOT_CREATED, snapshot);
}

export function emitLogAppended(log: ExecutionLog) {
  io.emit(EVENTS.LOG_APPENDED, log);
}

export function emitVerificationComplete(results: VerificationResult[]) {
  io.emit(EVENTS.VERIFICATION_COMPLETE, results);
}

// Listen for approval from dashboard
io.on('connection', (socket) => {
  console.log('Dashboard connected:', socket.id);
  
  socket.on(EVENTS.APPROVAL_GRANTED, (payload: { stepId: string; approvedAt: string }) => {
    console.log('Approval granted for step:', payload.stepId);
    // TODO: Notify CLI engine (Member 2 implements this)
  });
  
  socket.on('disconnect', () => {
    console.log('Dashboard disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 7432;
httpServer.listen(PORT, () => {
  console.log(`✓ git-cure server running on http://localhost:${PORT}`);
});
```

**Start server:**
```bash
npm run dev --workspace=@git-cure/server
```

---

## Testing Strategy

### 1. Test Gemma API Connection

Create `services/gemma/test.ts`:

```typescript
import { diagnoseWithGemma, generateRecoveryPlan } from './src/index';
import type { RepositoryStatus } from '@git-cure/shared';

const mockStatus: RepositoryStatus = {
  repoName: 'test-repo',
  currentBranch: 'main',
  headCommit: 'abc123',
  workingTreeStatus: 'conflicted',
  stagedCount: 0,
  unstagedCount: 3,
  untrackedCount: 0,
  conflictedCount: 2,
  collectedAt: new Date().toISOString(),
};

async function test() {
  const diagnosis = await diagnoseWithGemma(mockStatus);
  console.log('Diagnosis:', diagnosis);
  
  const plan = await generateRecoveryPlan(mockStatus, diagnosis);
  console.log('Recovery Plan:', plan);
}

test();
```

Run: `npx ts-node test.ts`

### 2. Test Response Parsing

Create unit tests for `parser.ts`:

```typescript
import { parseDiagnosisResponse, parseRecoveryPlanResponse } from './src/parser';

const mockResponse = `{
  "issue": "Merge conflict",
  "rootCause": "Conflicting changes",
  "riskLevel": "amber",
  "confidence": 0.9,
  "affectedFiles": ["file1.ts"],
  "recommendedActions": ["Resolve conflicts"]
}`;

console.log(parseDiagnosisResponse(mockResponse));
```

---

## Development Commands

```bash
# Run Gemma service locally
npm run dev --workspace=@git-cure/gemma

# Or use ts-node
cd services/gemma
npx ts-node src/index.ts

# Type checking
npm run typecheck
```

---

## Key Constraints

**MUST DO:**
- ✅ Never commit real API keys (use `.env`, add to `.gitignore`)
- ✅ Validate all AI responses before passing to CLI
- ✅ Handle API failures gracefully with fallbacks
- ✅ Parse JSON responses defensively
- ✅ Set reasonable confidence scores

**NEVER DO:**
- ❌ Commit `.env` files with real keys
- ❌ Trust AI output without validation
- ❌ Let malformed responses crash the system
- ❌ Generate commands outside Git's safe subset
- ❌ Skip fallback logic for API failures

---

## Prompt Engineering Tips

1. **Use JSON schema in prompts** → Better structured responses
2. **Give examples** → More consistent output format
3. **Set constraints** → "Respond ONLY with JSON"
4. **Add context** → Include relevant repo state
5. **Request explanations** → "Explain in plain language"

---

## Integration Points

**With Member 2 (CLI):**
- CLI calls `diagnoseWithGemma(repoStatus)` → you return diagnosis
- CLI calls `generateRecoveryPlan(repoStatus, diagnosis)` → you return steps

**With Member 1 (Dashboard):**
- You generate data → CLI emits via server → dashboard displays it
- No direct communication

---

## Gemma API Reference

**Get API key:** [Google AI Studio](https://aistudio.google.com/apikey)

**Models:**
- `gemma-2-9b-it` → 9B parameter instruction-tuned (recommended)
- `gemma-2-27b-it` → 27B parameter (more capable, slower)

**Rate limits:** Check Google AI Studio docs

**Cost:** Gemma via Google AI is free for testing (as of 2024)

---

## Git Workflow

**Branch naming:** `feat/gemma-<feature-name>`

Example:
```bash
git checkout -b feat/gemma-diagnosis
# ... make changes ...
git add .
git commit -m "Add Gemma-powered Git diagnosis generation"
git push origin feat/gemma-diagnosis
```

---

## Environment Setup

1. **Create `.env` in `services/gemma/`:**
```bash
GEMMA_API_KEY=your_actual_key_here
GEMMA_MODEL=gemma-2-9b-it
```

2. **Add to `.gitignore` (already done):**
```
.env
.env.local
```

3. **Update `.env.example`:**
```bash
GEMMA_API_KEY=your_api_key_here
GEMMA_MODEL=gemma-2-9b-it
```

---

## Current Status

✅ TypeScript types defined  
✅ Mock data showing expected format  
⏳ Gemma client setup (your task)  
⏳ Prompt engineering (your task)  
⏳ Response parsing (your task)  
⏳ Socket.IO server (coordinate with Member 2)

**Start here:** Install `@google/generative-ai`, set up API key, test basic Gemma connectivity with a simple prompt.
