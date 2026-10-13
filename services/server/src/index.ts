/**
 * @git-cure/server — local bridge between the CLI engine and the dashboard.
 *
 * Architecture:
 *   - Express handles REST endpoints (health, status polling).
 *   - Socket.IO pushes real-time events to the dashboard without polling.
 *   - The CLI engine and Gemma module emit events by calling functions exported
 *     from this module (integration points are marked INTEGRATION: below).
 *
 * Safety notes:
 *   - This server binds to 127.0.0.1 ONLY — never 0.0.0.0.
 *   - It never executes git commands directly. It only relays events from the
 *     CLI engine (packages/cli) to the dashboard (apps/dashboard).
 *   - API keys are read from environment variables; they are never emitted
 *     to the dashboard over any event.
 *
 * Port: GIT_CURE_PORT env var, default 7432.
 */

import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type {
  RepositoryStatus,
  DiagnosticResult,
  RecoveryStep,
  SnapshotMetadata,
  ExecutionLog,
  VerificationResult,
} from "@git-cure/shared";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.GIT_CURE_PORT ?? "7432", 10);
const HOST = "127.0.0.1"; // never bind to 0.0.0.0

// ---------------------------------------------------------------------------
// Socket.IO event name constants
// Shared with the dashboard — any rename here must be mirrored in
// apps/dashboard/src/services/socket.ts
// ---------------------------------------------------------------------------

export const EVENTS = {
  // Server → client
  REPO_STATUS_UPDATED: "repo:status:updated",
  DIAGNOSIS_READY: "diagnosis:ready",
  RECOVERY_PLAN_READY: "recovery:plan:ready",
  STEP_STATUS_CHANGED: "recovery:step:changed",
  SNAPSHOT_CREATED: "snapshot:created",
  LOG_APPENDED: "log:appended",
  VERIFICATION_COMPLETE: "verification:complete",
  SESSION_STARTED: "session:started",
  SESSION_ENDED: "session:ended",
  // Client → server
  APPROVAL_GRANTED: "approval:granted",
} as const;

export type ServerToClientEvents = {
  [EVENTS.REPO_STATUS_UPDATED]: (payload: RepositoryStatus) => void;
  [EVENTS.DIAGNOSIS_READY]: (payload: DiagnosticResult) => void;
  [EVENTS.RECOVERY_PLAN_READY]: (payload: RecoveryStep[]) => void;
  [EVENTS.STEP_STATUS_CHANGED]: (payload: RecoveryStep) => void;
  [EVENTS.SNAPSHOT_CREATED]: (payload: SnapshotMetadata) => void;
  [EVENTS.LOG_APPENDED]: (payload: ExecutionLog) => void;
  [EVENTS.VERIFICATION_COMPLETE]: (payload: VerificationResult[]) => void;
  [EVENTS.SESSION_STARTED]: (payload: { sessionId: string; startedAt: string }) => void;
  [EVENTS.SESSION_ENDED]: (payload: { sessionId: string; endedAt: string; reason: string }) => void;
};

export type ClientToServerEvents = {
  [EVENTS.APPROVAL_GRANTED]: (payload: { stepId: string; approvedAt: string }) => void;
};

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    // Dashboard dev server origin. Adjust if VITE_API_BASE_URL is different.
    origin: process.env.DASHBOARD_ORIGIN ?? "http://localhost:5173",
    methods: ["GET"],
  },
});

// ---------------------------------------------------------------------------
// REST endpoints
// ---------------------------------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "@git-cure/server",
    version: "0.1.0",
    connectedClients: io.engine.clientsCount,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Socket.IO connection handling
// ---------------------------------------------------------------------------

io.on("connection", (socket) => {
  console.log(`[server] dashboard connected  id=${socket.id}`);

  // INTEGRATION: When the dashboard reconnects, the CLI engine should
  // re-emit the latest RepositoryStatus and RecoveryPlan so the dashboard
  // can hydrate without waiting for the next change.
  // Example: emitRepoStatus(latestStatus);

  // Client → server: dashboard grants approval for a step
  socket.on(EVENTS.APPROVAL_GRANTED, ({ stepId, approvedAt }) => {
    console.log(`[server] approval granted  stepId=${stepId}  at=${approvedAt}`);
    // INTEGRATION: Forward the approval decision to the CLI execution engine.
    // Example: cliEngine.approveStep(stepId);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[server] dashboard disconnected  id=${socket.id}  reason=${reason}`);
  });
});

// ---------------------------------------------------------------------------
// Emitter helpers
// These are the functions the CLI engine calls to push events to the dashboard.
// INTEGRATION: Import and call these from packages/cli once it is implemented.
// ---------------------------------------------------------------------------

export function emitRepoStatus(status: RepositoryStatus): void {
  io.emit(EVENTS.REPO_STATUS_UPDATED, status);
}

export function emitDiagnosisReady(diagnosis: DiagnosticResult): void {
  io.emit(EVENTS.DIAGNOSIS_READY, diagnosis);
}

export function emitRecoveryPlanReady(plan: RecoveryStep[]): void {
  io.emit(EVENTS.RECOVERY_PLAN_READY, plan);
}

export function emitStepStatusChanged(step: RecoveryStep): void {
  io.emit(EVENTS.STEP_STATUS_CHANGED, step);
}

export function emitSnapshotCreated(snapshot: SnapshotMetadata): void {
  io.emit(EVENTS.SNAPSHOT_CREATED, snapshot);
}

export function emitLogAppended(entry: ExecutionLog): void {
  io.emit(EVENTS.LOG_APPENDED, entry);
}

export function emitVerificationComplete(results: VerificationResult[]): void {
  io.emit(EVENTS.VERIFICATION_COMPLETE, results);
}

export function emitSessionStarted(sessionId: string): void {
  io.emit(EVENTS.SESSION_STARTED, { sessionId, startedAt: new Date().toISOString() });
}

export function emitSessionEnded(sessionId: string, reason: string): void {
  io.emit(EVENTS.SESSION_ENDED, { sessionId, endedAt: new Date().toISOString(), reason });
}

// ---------------------------------------------------------------------------
// Demo: send a heartbeat event every 10 s when a dashboard is connected.
// This lets teammates verify the server is alive without any CLI integration.
// Remove when real CLI events are wired in.
// ---------------------------------------------------------------------------

setInterval(() => {
  if (io.engine.clientsCount === 0) return;
  const entry: ExecutionLog = {
    timestamp: new Date().toISOString(),
    level: "debug",
    message: "[demo] server heartbeat — replace with real CLI events",
  };
  emitLogAppended(entry);
}, 10_000);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

httpServer.listen(PORT, HOST, () => {
  console.log(`[server] git-cure local bridge running at http://${HOST}:${PORT}`);
  console.log(`[server] health endpoint: http://${HOST}:${PORT}/health`);
  console.log(`[server] configured origin: ${process.env.DASHBOARD_ORIGIN ?? "http://localhost:5173"}`);
});
