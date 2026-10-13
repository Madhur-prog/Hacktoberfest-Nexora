/**
 * @git-cure/gemma — entry point
 *
 * Phase 3 (Gemma engine) will implement:
 *   - Structured prompt construction from RepositoryStatus telemetry
 *   - Gemma API calls (Google AI SDK or compatible endpoint)
 *   - Schema validation on model output → DiagnosticResult
 *   - Risk classification and confidence scoring
 *   - Recovery recipe generation → RecoveryStep[]
 *   - Retry / fallback logic for malformed model responses
 *
 * Nothing here makes API requests. This file is a placeholder so the
 * workspace resolves and TypeScript is satisfied.
 */

import type { DiagnosticResult, RecoveryStep, RepositoryStatus } from "@git-cure/shared";

// TODO(gemma): implement structured prompt and Gemma API call
export async function diagnose(
  _status: RepositoryStatus
): Promise<DiagnosticResult> {
  throw new Error("diagnose: not yet implemented (Phase 3)");
}

// TODO(gemma): implement recovery plan generation from diagnosis
export async function buildRecoveryPlan(
  _diagnosis: DiagnosticResult
): Promise<RecoveryStep[]> {
  throw new Error("buildRecoveryPlan: not yet implemented (Phase 3)");
}
