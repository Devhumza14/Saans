import type { RiskLevel } from "./engine";

/** Pill colours per personal risk level (AA on their own background). Text is always shown too. */
export const RISK_STYLE: Record<RiskLevel, { bg: string; fg: string; bar: string; label: string }> = {
  low: { bg: "#eef4ea", fg: "#24552f", bar: "#3f9a52", label: "Low" },
  moderate: { bg: "#f7f1de", fg: "#6b5408", bar: "#c9a227", label: "Moderate" },
  high: { bg: "#f9ede1", fg: "#8a4510", bar: "#e07b2c", label: "High" },
  severe: { bg: "#f2e3e3", fg: "#6e1825", bar: "#8a2433", label: "Severe" },
};
