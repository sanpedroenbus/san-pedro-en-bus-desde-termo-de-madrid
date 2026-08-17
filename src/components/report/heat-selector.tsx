"use client";
// forzar recompilación

import { CheckCircle2 } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { PROBLEMS, type Problem } from "@/lib/domain/heat";
import { cn } from "@/lib/utils";

export function HeatSelector({
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
      <div className="flex flex-col gap-2">
        {PROBLEMS.map((problem) => {
          const selected = value.includes(problem);
          const problemLabel = dictionary.problems[toCamelCase(problem)];
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
  );
}

function toCamelCase(snake: string): keyof Dictionary["problems"] {
  const camel = snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return camel as keyof Dictionary["problems"];
}
