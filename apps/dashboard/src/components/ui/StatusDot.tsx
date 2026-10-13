/**
 * StatusDot — a simple inline indicator for health/risk levels.
 * Used inline with text rather than as a standalone badge pill.
 */
import type { RiskLevel } from "../../types";

const dotColor: Record<RiskLevel, string> = {
  green: "bg-gc-accent",
  amber: "bg-gc-warn",
  red: "bg-gc-danger",
  destructive: "bg-gc-danger",
};

interface StatusDotProps {
  level: RiskLevel;
  /** Optional visible label rendered after the dot */
  label?: string;
}

export function StatusDot({ level, label }: StatusDotProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor[level]}`}
        aria-hidden="true"
      />
      {label && <span>{label}</span>}
    </span>
  );
}
