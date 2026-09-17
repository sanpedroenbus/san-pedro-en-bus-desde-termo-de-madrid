import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Problem } from "@/lib/domain/problems";

function toCamelCase(snake: string): keyof Dictionary["problems"] {
  const camel = snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return camel as keyof Dictionary["problems"];
}

export function getProblemLabel(dictionary: Dictionary, problem: Problem): string {
  return dictionary.problems[toCamelCase(problem)];
}
