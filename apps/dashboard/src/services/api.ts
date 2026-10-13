/**
 * Dashboard API service layer — Phase 1 placeholder.
 *
 * These functions define the interface the dashboard will use once the CLI
 * engine exposes a local HTTP endpoint (Phase 2 / 3). For now every function
 * returns mock data so component development can proceed independently.
 *
 * When integrating:
 *   1. Replace the mock imports with real fetch() calls to GIT_CURE_PORT.
 *   2. Keep the function signatures identical so callers need no changes.
 *   3. Remove the "MOCK:" comments as each function becomes real.
 */

import type {
  DiagnosticResult,
  ExecutionLog,
  RecoveryStep,
  RepositoryStatus,
} from "../types";

import {
  mockDiagnosis,
  mockLogs,
  mockRecoverySteps,
  mockRepoStatus,
} from "../data/mockData";

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

/** Fetch the current state of the repository the CLI is watching. */
export async function getRepositoryStatus(): Promise<RepositoryStatus> {
  // MOCK: returns static telemetry — replace with GET /api/repo/status
  return Promise.resolve(mockRepoStatus);
}

/** Trigger a fresh repository scan. */
export async function scanRepository(): Promise<void> {
  // MOCK: no-op — replace with POST /api/repo/scan
  console.info("[api] scanRepository: not yet implemented");
  return Promise.resolve();
}

// ---------------------------------------------------------------------------
// Diagnosis
// ---------------------------------------------------------------------------

/** Get the latest AI diagnosis from the Gemma module. */
export async function getLatestDiagnosis(): Promise<DiagnosticResult> {
  // MOCK: returns static diagnosis — replace with GET /api/diagnosis/latest
  return Promise.resolve(mockDiagnosis);
}

// ---------------------------------------------------------------------------
// Recovery
// ---------------------------------------------------------------------------

/** Get the current recovery plan steps. */
export async function getRecoveryPlan(): Promise<RecoveryStep[]> {
  // MOCK: returns static steps — replace with GET /api/recovery/plan
  return Promise.resolve(mockRecoverySteps);
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

/** Get the execution log for the current session. */
export async function getActivityHistory(): Promise<ExecutionLog[]> {
  // MOCK: returns static log — replace with GET /api/activity
  return Promise.resolve(mockLogs);
}
