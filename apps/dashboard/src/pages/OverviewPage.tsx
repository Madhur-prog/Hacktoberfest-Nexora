/**
 * OverviewPage — the main (and currently only) page of the git-cure dashboard.
 *
 * Sections rendered, top to bottom:
 *   1. Top bar — breadcrumb + connection status
 *   2. Wordmark + tagline
 *   3. Repository status tile
 *   4. Diagnosis panel (issue + root cause + confidence + affected files)
 *   5. Recovery plan — step list with status indicators and approval states
 *   6. Snapshot status bar
 *   7. Verification results
 *   8. Live execution log (terminal-style)
 *
 * All data comes from mockData.ts for now.
 * INTEGRATION: Replace mock imports with Socket.IO event state (Phase 2).
 *
 * Design constraints:
 *   - Single mono typeface throughout — this is a developer tool.
 *   - Blinking cursor on the wordmark is the only ambient animation.
 *   - Color communicates state only; no decorative use.
 *   - Left-aligned content block, capped at max-w-3xl, centred on viewport.
 *   - The dashboard never executes shell commands or exposes API keys.
 */

import {
  GitBranch,
  Cpu,
  Archive,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  SkipForward,
  AlertTriangle,
  Terminal,
  ShieldCheck,
  MinusCircle,
} from "lucide-react";
import {
  mockDiagnosis,
  mockLogs,
  mockRecoverySteps,
  mockRepoStatus,
  mockSnapshot,
  mockVerification,
} from "../data/mockData";
import { StatusDot } from "../components/ui/StatusDot";
import type { StepStatus, RiskLevel, LogLevel } from "@git-cure/shared";

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function shortHash(hash: string): string {
  return hash.slice(0, 7);
}

function formatTime(iso: string): string {
  return iso.replace("T", " ").replace("Z", " UTC");
}

// ---------------------------------------------------------------------------
// Step status icon
// ---------------------------------------------------------------------------

function StepIcon({ status }: { status: StepStatus }) {
  const cls = "w-4 h-4 flex-shrink-0";
  switch (status) {
    case "completed":
      return <CheckCircle2 className={`${cls} text-gc-accent`} aria-label="completed" />;
    case "failed":
      return <XCircle className={`${cls} text-gc-danger`} aria-label="failed" />;
    case "running":
      return (
        <Loader2
          className={`${cls} text-gc-warn animate-spin`}
          aria-label="running"
          style={{ animationDuration: "1s" }}
        />
      );
    case "awaiting-approval":
      return <AlertTriangle className={`${cls} text-gc-warn`} aria-label="awaiting approval" />;
    case "skipped":
      return <SkipForward className={`${cls} text-gc-muted`} aria-label="skipped" />;
    case "pending":
    default:
      return <Clock className={`${cls} text-gc-muted`} aria-label="pending" />;
  }
}

// ---------------------------------------------------------------------------
// Risk pill — inline text marker, not a badge
// ---------------------------------------------------------------------------

const riskLabel: Record<RiskLevel, string> = {
  green: "low risk",
  amber: "moderate risk",
  red: "high risk",
  destructive: "destructive",
};

const riskColor: Record<RiskLevel, string> = {
  green: "text-gc-accent",
  amber: "text-gc-warn",
  red: "text-gc-danger",
  destructive: "text-gc-danger",
};

function RiskMarker({ level }: { level: RiskLevel }) {
  return (
    <span className={`text-xs ${riskColor[level]}`} aria-label={`risk: ${riskLabel[level]}`}>
      {riskLabel[level]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Log level color
// ---------------------------------------------------------------------------

const logColor: Record<LogLevel, string> = {
  info: "text-gc-muted",
  warn: "text-gc-warn",
  error: "text-gc-danger",
  debug: "text-gc-border",
};

const logPrefix: Record<LogLevel, string> = {
  info: "info ",
  warn: "warn ",
  error: "err  ",
  debug: "dbg  ",
};

// ---------------------------------------------------------------------------
// Section wrapper — consistent spacing + optional heading
// ---------------------------------------------------------------------------

function Section({
  heading,
  icon,
  children,
}: {
  heading: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-gc-muted">{icon}</span>
        <h2 className="text-xs text-gc-muted tracking-wide">{heading}</h2>
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// OverviewPage
// ---------------------------------------------------------------------------

export function OverviewPage() {
  return (
    <div className="min-h-screen bg-gc-bg flex flex-col font-mono">
      {/* Top bar */}
      <header className="border-b border-gc-border px-6 py-3 flex items-center justify-between flex-shrink-0">
        <span className="text-gc-muted text-xs">
          git-cure
          <span className="mx-2 text-gc-border select-none">/</span>
          overview
        </span>
        {/* Connection status — INTEGRATION: reflect real socket.connected state */}
        <span className="flex items-center gap-1.5 text-xs text-gc-muted">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-gc-warn"
            aria-hidden="true"
          />
          mock data
        </span>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-14 max-w-3xl w-full mx-auto">
        {/* ---------------------------------------------------------------- */}
        {/* Wordmark                                                         */}
        {/* ---------------------------------------------------------------- */}
        <div className="mb-14 select-none">
          <h1 className="text-5xl font-semibold tracking-tight text-gc-text leading-none">
            git
            <span className="text-gc-accent">-cure</span>
            <span
              className="inline-block w-[3px] h-[1em] bg-gc-accent ml-1 align-middle animate-blink"
              aria-hidden="true"
            />
          </h1>
          <p className="mt-4 text-gc-muted text-sm leading-relaxed max-w-[58ch]">
            Local Git repository doctor. Detects broken states, explains root
            causes, and guides you through safe, step-by-step recovery — powered
            by Gemma.
          </p>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Repository status                                                */}
        {/* ---------------------------------------------------------------- */}
        <Section heading="repository" icon={<GitBranch size={13} aria-hidden />}>
          <div className="border border-gc-border rounded bg-gc-surface px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gc-text">{mockRepoStatus.repoName}</span>
              <StatusDot level="amber" />
              <span className="text-xs text-gc-muted">{mockRepoStatus.workingTreeStatus}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gc-muted">
              <div className="flex gap-2">
                <dt className="w-14 flex-shrink-0">branch</dt>
                <dd className="text-gc-text truncate">{mockRepoStatus.currentBranch}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-14 flex-shrink-0">HEAD</dt>
                <dd className="text-gc-text">{shortHash(mockRepoStatus.headCommit)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-14 flex-shrink-0">staged</dt>
                <dd className="text-gc-text">{mockRepoStatus.stagedCount}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-14 flex-shrink-0">unstaged</dt>
                <dd className="text-gc-text">{mockRepoStatus.unstagedCount}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-14 flex-shrink-0">untracked</dt>
                <dd className="text-gc-text">{mockRepoStatus.untrackedCount}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-14 flex-shrink-0">conflicts</dt>
                <dd className="text-gc-danger font-medium">{mockRepoStatus.conflictedCount}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-gc-border">
              collected {formatTime(mockRepoStatus.collectedAt)}
            </p>
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Diagnosis                                                        */}
        {/* ---------------------------------------------------------------- */}
        <Section heading="diagnosis" icon={<Cpu size={13} aria-hidden />}>
          <div className="border border-gc-border rounded bg-gc-surface px-5 py-4">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-sm text-gc-text">{mockDiagnosis.issue}</span>
              <StatusDot level={mockDiagnosis.riskLevel} />
              {mockDiagnosis.confidence !== undefined && (
                <span className="text-xs text-gc-muted ml-auto flex-shrink-0">
                  {Math.round(mockDiagnosis.confidence * 100)}% confidence
                </span>
              )}
            </div>
            <p className="text-xs text-gc-muted leading-relaxed mb-4 max-w-[62ch]">
              {mockDiagnosis.rootCause}
            </p>
            <div className="mb-3">
              <p className="text-xs text-gc-muted mb-1.5">affected files</p>
              <ul className="space-y-0.5">
                {mockDiagnosis.affectedFiles.map((f) => (
                  <li key={f} className="text-xs text-gc-text">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs text-gc-muted mb-1.5">recommended actions</p>
              <ol className="space-y-0.5 list-decimal list-inside">
                {mockDiagnosis.recommendedActions.map((a, i) => (
                  <li key={i} className="text-xs text-gc-muted">
                    <span className="text-gc-text">{a}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Recovery plan                                                    */}
        {/* ---------------------------------------------------------------- */}
        <Section heading="recovery plan" icon={<ShieldCheck size={13} aria-hidden />}>
          <div className="border border-gc-border rounded overflow-hidden">
            {mockRecoverySteps.map((step, idx) => {
              const isLast = idx === mockRecoverySteps.length - 1;
              return (
                <div
                  key={step.stepId}
                  className={`bg-gc-surface px-5 py-4 flex gap-4 ${
                    !isLast ? "border-b border-gc-border" : ""
                  } ${step.status === "awaiting-approval" ? "ring-1 ring-inset ring-gc-warn/40" : ""}`}
                >
                  {/* Step icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    <StepIcon status={step.status} />
                  </div>

                  {/* Step body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap mb-1">
                      <span
                        className={`text-sm ${
                          step.status === "pending" || step.status === "skipped"
                            ? "text-gc-muted"
                            : "text-gc-text"
                        }`}
                      >
                        {step.description}
                      </span>
                      <RiskMarker level={step.riskLevel} />
                    </div>

                    {step.command && (
                      <code className="block text-xs text-gc-text bg-gc-bg px-2 py-1 rounded mb-2 w-fit max-w-full overflow-x-auto">
                        {step.command}
                      </code>
                    )}

                    <p className="text-xs text-gc-muted leading-relaxed max-w-[58ch]">
                      {step.commandExplanation}
                    </p>

                    {/* Approval notice */}
                    {step.status === "awaiting-approval" && (
                      <div className="mt-3 flex items-start gap-2 text-xs text-gc-warn">
                        <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" aria-hidden />
                        <span>
                          Requires approval before execution. The CLI engine is waiting for
                          confirmation.
                          {/* INTEGRATION: emit APPROVAL_GRANTED event via socket.ts */}
                        </span>
                      </div>
                    )}

                    {/* Rollback warning */}
                    {step.rollback && !step.rollback.canGuaranteeRestoration && (
                      <div className="mt-2 flex items-start gap-2 text-xs text-gc-muted border-t border-gc-border/50 pt-2">
                        <MinusCircle size={12} className="flex-shrink-0 mt-0.5" aria-hidden />
                        <span>{step.rollback.warningMessage}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Snapshot                                                         */}
        {/* ---------------------------------------------------------------- */}
        <Section heading="safety snapshot" icon={<Archive size={13} aria-hidden />}>
          <div className="border border-gc-border rounded bg-gc-surface px-5 py-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gc-text">{mockSnapshot.description}</span>
                <span className="text-xs text-gc-accent">{mockSnapshot.status}</span>
              </div>
              <dl className="flex gap-4 text-xs text-gc-muted">
                <div className="flex gap-1.5">
                  <dt>type</dt>
                  <dd className="text-gc-text">{mockSnapshot.type}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>id</dt>
                  <dd className="text-gc-text">{mockSnapshot.snapshotId}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>created</dt>
                  <dd className="text-gc-text">{formatTime(mockSnapshot.createdAt)}</dd>
                </div>
              </dl>
            </div>
          </div>
          <p className="mt-2 text-xs text-gc-border max-w-[62ch] leading-relaxed">
            This snapshot does not guarantee zero data loss. Untracked files and files excluded
            by .gitignore are not captured by a stash.
          </p>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Verification results                                             */}
        {/* ---------------------------------------------------------------- */}
        <Section heading="verification" icon={<CheckCircle2 size={13} aria-hidden />}>
          <div className="border border-gc-border rounded overflow-hidden">
            {mockVerification.map((v, idx) => {
              const isLast = idx === mockVerification.length - 1;
              return (
                <div
                  key={v.checkName}
                  className={`bg-gc-surface px-5 py-3 flex items-start gap-3 text-xs ${
                    !isLast ? "border-b border-gc-border" : ""
                  }`}
                >
                  {v.passed ? (
                    <CheckCircle2
                      size={13}
                      className="text-gc-accent flex-shrink-0 mt-0.5"
                      aria-label="passed"
                    />
                  ) : (
                    <XCircle
                      size={13}
                      className="text-gc-muted flex-shrink-0 mt-0.5"
                      aria-label="not passed"
                    />
                  )}
                  <div>
                    <p className={v.passed ? "text-gc-text mb-0.5" : "text-gc-muted mb-0.5"}>
                      {v.checkName}
                    </p>
                    <p className="text-gc-muted leading-relaxed">{v.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Execution log                                                    */}
        {/* ---------------------------------------------------------------- */}
        <Section heading="execution log" icon={<Terminal size={13} aria-hidden />}>
          <div
            className="border border-gc-border rounded bg-gc-bg px-0 py-3 overflow-y-auto max-h-64"
            aria-label="Execution log"
            role="log"
            aria-live="polite"
          >
            {mockLogs.map((entry, idx) => (
              <div
                key={idx}
                className="px-4 py-0.5 flex gap-3 text-xs leading-5 hover:bg-gc-surface/50"
              >
                <span className="text-gc-border flex-shrink-0 w-22 hidden sm:block">
                  {entry.timestamp.replace("T", " ").slice(0, 19)}
                </span>
                <span
                  className={`flex-shrink-0 w-8 ${logColor[entry.level]}`}
                  aria-label={entry.level}
                >
                  {logPrefix[entry.level]}
                </span>
                <span className="text-gc-muted flex-1">
                  {entry.stepId && (
                    <span className="text-gc-border mr-2">[{entry.stepId}]</span>
                  )}
                  {entry.message}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gc-border">
            {/* INTEGRATION: replace with live Socket.IO log stream */}
            showing {mockLogs.length} mock entries · real-time via Socket.IO in Phase 2
          </p>
        </Section>
      </main>
    </div>
  );
}
