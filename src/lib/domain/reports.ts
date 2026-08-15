import { z } from "zod";
import { isProblem, type Problem } from "./heat";
import { isMetroLine, type MetroLine } from "./lines";

export type Report = {
  id: string;
  line: MetroLine;
  car: string | null;
  problems: Problem[];
  createdAt: Date;
  hiddenAt?: Date | null;
};

export const DUPLICATE_WINDOW_MINUTES = 12;
export const NO_CAR_ORIGIN_WINDOW_MINUTES = 30;
export const RATE_LIMIT_WINDOW_MINUTES = 10;
export const RATE_LIMIT_MAX_REPORTS = 4;
export const UNDO_WINDOW_SECONDS = 90;

export const reportInputSchema = z.object({
  line: z.string().refine(isMetroLine),
  problems: z.array(z.string().refine(isProblem)).min(1),
  car: z
    .union([z.string().trim().max(20), z.null()])
    .optional()
    .transform((value) => {
      const raw = value ?? "";
      const normalized = normalizeCarCode(raw);
      return normalized;
    }),
});

export type ReportInput = z.infer<typeof reportInputSchema>;

export function normalizeCarCode(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  if (trimmed.length > 20) return null;
  return trimmed;
}

export function formatCarCode(value: string) {
  return value;
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
  if (!isWithinWindow || previous.line !== current.line) return false;

  if (!current.car) {
    return previous.car === null;
  }

  const sameProblems =
    previous.problems.length === current.problems.length &&
    previous.problems.every((p) => current.problems.includes(p));

  return sameProblems && previous.car === current.car;
}
