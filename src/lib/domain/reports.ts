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

// A unit code is either a bus unit number ("51", "099") or a full licence
// plate ("SJB1234") — both are accepted in the same field. Normalized to
// uppercase alphanumeric with all whitespace stripped, 1-10 characters.
const UNIT_CODE_MAX_LENGTH = 10;
const UNIT_CODE_PATTERN = /^[A-Z0-9]{1,10}$/;

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
  const stripped = value.replace(/\s+/g, "").toUpperCase();
  if (!stripped) return null;
  if (stripped.length > UNIT_CODE_MAX_LENGTH) return null;
  if (!UNIT_CODE_PATTERN.test(stripped)) return null;
  return stripped;
}

export function parseReportInput(input: unknown) {
  return reportInputSchema.safeParse(input);
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
