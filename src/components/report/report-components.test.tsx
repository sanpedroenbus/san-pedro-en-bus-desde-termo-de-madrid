import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PROBLEM_CATEGORIES, PROBLEM_CATEGORY, PROBLEMS } from "@/lib/domain/problems";
import { ROUTE_LABELS, ROUTES } from "@/lib/domain/routes";
import type { Report } from "@/lib/domain/reports";
import { messages as esMessages } from "@/lib/i18n/messages/es";
import { getProblemLabel } from "./problem-label";
import { ProblemSelector } from "./problem-selector";
import { RecentReportRow } from "./recent-report-row";
import { ReportForm } from "./report-form";
import { RoutePicker } from "./route-picker";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("RoutePicker", () => {
  it("renders every route and marks the selected one as pressed", () => {
    render(<RoutePicker label="Ruta" onChange={vi.fn()} value={ROUTES[0]} />);

    for (const route of ROUTES) {
      expect(screen.getByRole("button", { name: ROUTE_LABELS[route] })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: ROUTE_LABELS[ROUTES[0]] })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: ROUTE_LABELS[ROUTES[1]] })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with the clicked route", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoutePicker label="Ruta" onChange={onChange} value={ROUTES[0]} />);

    await user.click(screen.getByRole("button", { name: ROUTE_LABELS[ROUTES[2]] }));

    expect(onChange).toHaveBeenCalledWith(ROUTES[2]);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("ProblemSelector", () => {
  it("renders all 16 problems across their 5 categories regardless of which are selected", () => {
    render(<ProblemSelector dictionary={esMessages} label="¿Qué pasó?" onChange={vi.fn()} value={[]} />);

    for (const category of PROBLEM_CATEGORIES) {
      expect(screen.getByText(esMessages.problemCategories[category])).toBeInTheDocument();
    }
    for (const problem of PROBLEMS) {
      expect(screen.getByRole("button", { name: getProblemLabel(esMessages, problem) })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button")).toHaveLength(PROBLEMS.length);
  });

  it("groups each problem under its declared category", () => {
    render(<ProblemSelector dictionary={esMessages} label="¿Qué pasó?" onChange={vi.fn()} value={[]} />);

    for (const category of PROBLEM_CATEGORIES) {
      const legend = screen.getByText(esMessages.problemCategories[category]);
      const group = legend.closest("fieldset");
      expect(group).not.toBeNull();
      const problemsInCategory = PROBLEMS.filter((problem) => PROBLEM_CATEGORY[problem] === category);
      for (const problem of problemsInCategory) {
        expect(within(group as HTMLElement).getByRole("button", { name: getProblemLabel(esMessages, problem) })).toBeInTheDocument();
      }
    }
  });

  it("supports multi-select: adds and removes problems independently", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const first = PROBLEMS[0];
    const second = PROBLEMS[1];

    const { rerender } = render(<ProblemSelector dictionary={esMessages} label="¿Qué pasó?" onChange={onChange} value={[]} />);

    await user.click(screen.getByRole("button", { name: getProblemLabel(esMessages, first) }));
    expect(onChange).toHaveBeenLastCalledWith([first]);

    rerender(<ProblemSelector dictionary={esMessages} label="¿Qué pasó?" onChange={onChange} value={[first]} />);
    await user.click(screen.getByRole("button", { name: getProblemLabel(esMessages, second) }));
    expect(onChange).toHaveBeenLastCalledWith([first, second]);

    rerender(<ProblemSelector dictionary={esMessages} label="¿Qué pasó?" onChange={onChange} value={[first, second]} />);
    expect(screen.getByRole("button", { name: getProblemLabel(esMessages, first) })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: getProblemLabel(esMessages, first) }));
    expect(onChange).toHaveBeenLastCalledWith([second]);
  });
});

describe("RecentReportRow", () => {
  function report(partial: Partial<Report>): Report {
    return {
      id: "report-1",
      route: "CEDROS",
      unit: null,
      problems: ["hacinados"],
      createdAt: new Date("2026-07-05T12:00:00Z"),
      hiddenAt: null,
      ...partial,
    };
  }

  it("shows the route, the unit code, and problem chips instead of a heat-state badge", () => {
    render(<RecentReportRow dictionary={esMessages} locale="es" report={report({ unit: "51", problems: ["hacinados", "cucarachas"] })} />);

    expect(screen.getByText("CEDROS")).toBeInTheDocument();
    expect(screen.getByText("51")).toBeInTheDocument();
    expect(screen.getByText(getProblemLabel(esMessages, "hacinados"))).toBeInTheDocument();
    expect(screen.getByText(getProblemLabel(esMessages, "cucarachas"))).toBeInTheDocument();
    expect(screen.queryByText(/fresco|calor|infierno/i)).not.toBeInTheDocument();
  });

  it("shows the no-unit copy when the report has no unit", () => {
    render(<RecentReportRow dictionary={esMessages} locale="es" report={report({ unit: null })} />);
    expect(screen.getByText(esMessages.explore.noUnit)).toBeInTheDocument();
  });

  it("truncates to two visible problem chips and shows a +N overflow badge for the rest", () => {
    render(
      <RecentReportRow
        dictionary={esMessages}
        locale="es"
        report={report({ problems: ["hacinados", "cucarachas", "acoso"] })}
      />,
    );

    expect(screen.getByText(getProblemLabel(esMessages, "hacinados"))).toBeInTheDocument();
    expect(screen.getByText(getProblemLabel(esMessages, "cucarachas"))).toBeInTheDocument();
    expect(screen.queryByText(getProblemLabel(esMessages, "acoso"))).not.toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });
});

describe("ReportForm", () => {
  beforeEach(() => {
    push.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: () => Promise.resolve({ ok: true }) }));
  });

  it("shows the missing-problems reminder and keeps submission disabled until a problem is selected", async () => {
    const user = userEvent.setup();
    render(<ReportForm dictionary={esMessages} locale="es" />);

    expect(screen.getByText(esMessages.reportForm.invalid)).toBeInTheDocument();
    expect(screen.getByTestId("submit-report")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: getProblemLabel(esMessages, PROBLEMS[0]) }));

    expect(screen.getByTestId("submit-report")).toBeEnabled();
  });

  it("asks for confirmation before submitting a report without a unit, then submits with unit: null on confirm", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true, report: { id: "report-1" }, undoToken: "undo-1" }),
    });
    vi.stubGlobal("fetch", fetch);

    render(<ReportForm dictionary={esMessages} locale="es" />);
    await user.click(screen.getByRole("button", { name: getProblemLabel(esMessages, PROBLEMS[0]) }));
    await user.click(screen.getByTestId("submit-report"));

    expect(screen.getByRole("dialog", { name: esMessages.reportForm.missingUnit.title })).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: esMessages.reportForm.missingUnit.confirm }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/reports",
      expect.objectContaining({
        body: JSON.stringify({ route: ROUTES[0], problems: [PROBLEMS[0]], unit: null }),
      }),
    );
  });
});
