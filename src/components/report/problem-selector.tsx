"use client";

import { CheckCircle2 } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { PROBLEM_CATEGORIES, PROBLEM_CATEGORY, PROBLEMS, type Problem, type ProblemCategory } from "@/lib/domain/problems";
import { cn } from "@/lib/utils";
import { getProblemLabel } from "./problem-label";

const PROBLEMS_BY_CATEGORY: Record<ProblemCategory, Problem[]> = PROBLEM_CATEGORIES.reduce(
  (acc, category) => {
    acc[category] = PROBLEMS.filter((problem) => PROBLEM_CATEGORY[problem] === category);
    return acc;
  },
  {} as Record<ProblemCategory, Problem[]>,
);

export function ProblemSelector({
  dictionary,
  label,
  value,
  onChange,
}: {
  dictionary: Dictionary;
  label: string;
  value: Problem[];
  onChange: (problems: Problem[]) => void;
}) {
  function toggle(problem: Problem) {
    if (value.includes(problem)) {
      onChange(value.filter((p) => p !== problem));
    } else {
      onChange([...value, problem]);
    }
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="flex flex-col gap-4">
        {PROBLEM_CATEGORIES.map((category) => (
          <fieldset className="flex flex-col gap-2" key={category}>
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {dictionary.problemCategories[category]}
            </legend>
            <div className="flex flex-col gap-2">
              {PROBLEMS_BY_CATEGORY[category].map((problem) => {
                const selected = value.includes(problem);
                const problemLabel = getProblemLabel(dictionary, problem);
                return (
                  <button
                    aria-pressed={selected}
                    className={cn(
                      "selection-flow flex min-h-11 items-center gap-3 rounded-md border border-border bg-surface-raised px-3 py-2.5 text-left text-sm transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      selected ? "border-primary bg-primary/10 font-medium" : "text-foreground hover:bg-surface",
                    )}
                    key={problem}
                    onClick={() => toggle(problem)}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition duration-200 ease-out",
                        selected ? "border-primary bg-primary" : "border-border",
                      )}
                    >
                      {selected ? <CheckCircle2 className="size-[13px] text-white" strokeWidth={3} /> : null}
                    </span>
                    {problemLabel}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </fieldset>
  );
}
