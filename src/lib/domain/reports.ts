import { z } from "zod";
import { isProblem, type Problem } from "./problems";
import { isRoute, type Route } from "./routes";

export type Report = {
  id: string;
  route: Route;
  unit: string | null;
  problems: Problem[];
  createdAt: Date;
  hiddenAt?: Date | null;
};

export const DUPLICATE_WINDOW_MINUTES = 12;
export const NO_UNIT_ORIGIN_WINDOW_MINUTES = 30;
export const RATE_LIMIT_WINDOW_MINUTES = 10;
export const RATE_LIMIT_MAX_REPORTS = 4;
export const UNDO_WINDOW_SECONDS = 90;

// A unit code is either a bus unit number (1-3 digits, "51") or a licence
// plate. Every plate on these routes starts with "SJB" and only the digits
// identify the bus, so the prefix is optional on input and plates are stored
// as "SJB" + digits without leading zeros: "SJB 014285", "sjb-14285" and
// "14285" all become "SJB14285". 4-6 digits is a plate, 1-3 a unit number.
const PLATE_PREFIX = "SJB";
const UNIT_INPUT_PATTERN = /^(SJB)?(\d+)$/;
const UNIT_NUMBER_MAX_DIGITS = 3;
const PLATE_MIN_DIGITS = 4;
const PLATE_MAX_DIGITS = 6;
// Matches the reports.unit CHECK constraint: what can already be stored.
const STORED_UNIT_PATTERN = /^[A-Z0-9]{1,10}$/;

export const reportInputSchema = z.object({
  route: z.string().refine(isRoute),
  problems: z.array(z.string().refine(isProblem)).min(1),
  unit: z
    .union([z.string().trim().max(20), z.null()])
    .optional()
    .transform((value) => {
      const raw = value ?? "";
      return normalizeUnitCode(raw);
    }),
});

export type ReportInput = z.infer<typeof reportInputSchema>;

export function normalizeUnitCode(value: string): string | null {
  const match = UNIT_INPUT_PATTERN.exec(value.replace(/[\s.-]+/g, "").toUpperCase());
  if (!match) return null;
  const [, prefix, rawDigits] = match;
  const digits = rawDigits.replace(/^0+/, "");
  if (digits.length >= PLATE_MIN_DIGITS && digits.length <= PLATE_MAX_DIGITS) return PLATE_PREFIX + digits;
  if (!prefix && digits.length >= 1 && digits.length <= UNIT_NUMBER_MAX_DIGITS) return digits;
  return null;
}

// For looking up existing units (explorer, unit API), not for new reports:
// codes stored before the current format (0004 left non-matching ones as-is,
// e.g. "SJ0912") must stay findable, so fall back to the stored shape.
export function normalizeUnitLookup(value: string): string | null {
  const upper = value.trim().toUpperCase();
  return normalizeUnitCode(upper) ?? (STORED_UNIT_PATTERN.test(upper) ? upper : null);
}

export function parseReportInput(input: unknown) {
  return reportInputSchema.safeParse(input);
}

// Shared by the Supabase and in-memory dashboard paths so "filter by problem"
// means the same thing (any overlap, not "contains all selected problems")
// everywhere it's applied.
export function reportMatchesProblems(report: Pick<Report, "problems">, selectedProblems: Problem[]): boolean {
  if (selectedProblems.length === 0) return true;
  return report.problems.some((problem) => selectedProblems.includes(problem));
}

export function isDuplicateCandidate(
  current: ReportInput,
  previous: Report,
  now = new Date(),
  windowMinutes = DUPLICATE_WINDOW_MINUTES,
) {
  const ageMs = now.getTime() - previous.createdAt.getTime();
  const isWithinWindow = ageMs >= 0 && ageMs <= windowMinutes * 60_000;
  if (!isWithinWindow || previous.route !== current.route) return false;

  if (!current.unit) {
    return previous.unit === null;
  }

  const sameProblems =
    previous.problems.length === current.problems.length &&
    previous.problems.every((p) => current.problems.includes(p));

  return sameProblems && previous.unit === current.unit;
}
