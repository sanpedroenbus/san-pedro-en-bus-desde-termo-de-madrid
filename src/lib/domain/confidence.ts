export type Confidence = "low" | "medium" | "high";

export function getConfidence(reports: Array<{ createdAt: Date }>): Confidence {
  if (reports.length < 3) return "low";
  if (reports.length >= 10) return "high";
  if (reports.length >= 5) return "medium";
  return "low";
}
