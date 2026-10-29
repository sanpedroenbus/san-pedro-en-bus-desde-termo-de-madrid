import { describe, expect, it } from "vitest";
import { isProblem, PROBLEM_CATEGORIES, PROBLEM_CATEGORY, PROBLEMS } from "./problems";

describe("problems", () => {
  it("defines exactly twenty distinct problems", () => {
    expect(PROBLEMS).toHaveLength(20);
    expect(new Set(PROBLEMS).size).toBe(20);
  });

  it("validates known problems and rejects everything else", () => {
    for (const problem of PROBLEMS) {
      expect(isProblem(problem)).toBe(true);
    }
    expect(isProblem("fresco")).toBe(false);
    expect(isProblem("calor")).toBe(false);
    expect(isProblem("")).toBe(false);
    expect(isProblem(undefined)).toBe(false);
    expect(isProblem(123)).toBe(false);
  });

  it("defines exactly four distinct categories", () => {
    expect(PROBLEM_CATEGORIES).toHaveLength(4);
    expect(new Set(PROBLEM_CATEGORIES).size).toBe(4);
  });

  it("maps every problem to exactly one valid category with no orphans", () => {
    const mappedProblems = Object.keys(PROBLEM_CATEGORY).sort();
    expect(mappedProblems).toEqual([...PROBLEMS].sort());

    for (const problem of PROBLEMS) {
      expect(PROBLEM_CATEGORIES).toContain(PROBLEM_CATEGORY[problem]);
    }
  });

  it("covers every category with at least one problem", () => {
    for (const category of PROBLEM_CATEGORIES) {
      const problemsInCategory = PROBLEMS.filter((problem) => PROBLEM_CATEGORY[problem] === category);
      expect(problemsInCategory.length).toBeGreaterThan(0);
    }
  });
});
