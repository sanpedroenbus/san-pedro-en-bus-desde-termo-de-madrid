"use client";

import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { useId, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/tooltip";
import { FEEDBACK_TOKENS } from "@/lib/design/tokens";
import type { Problem } from "@/lib/domain/heat";
import type { MetroLine } from "@/lib/domain/lines";
import { METRO_LINES } from "@/lib/domain/lines";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { HeatSelector } from "./heat-selector";
import { LinePicker } from "./line-picker";

type ApiErrorReason = "duplicate" | "invalid" | "rate_limited" | "server_error";

type ApiResponse =
  | { ok: true; report: { id: string }; undoToken: string }
  | { ok: false; reason: ApiErrorReason };

export function ReportForm({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  const router = useRouter();
  const [line, setLine] = useState<MetroLine>(METRO_LINES[0]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [car, setCar] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();
  const carInputRef = useRef<HTMLInputElement>(null);
  void carInputRef;
  const missingProblemsId = useId();

  const normalizedCar = useMemo(() => car.trim(), [car]);
  const busy = submitting || pending;

  function requestSubmission() {
    if (problems.length === 0) {
      toast(dictionary.reportForm.invalid);
      return;
    }
    void submitReport();
  }

  async function submitReport() {
    setSubmitting(true);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ line, problems, car: normalizedCar || null }),
      });
      const payload = (await response.json()) as ApiResponse;

      if (!payload.ok) {
        toast(getSubmissionErrorMessage(payload.reason, dictionary));
        setSubmitting(false);
        return;
      }

      toast.success(dictionary.reportForm.success, {
        action: {
          label: dictionary.reportForm.undo,
          onClick: () => {
            fetch(`/api/reports/${payload.report.id}`, {
              method: "DELETE",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ undoToken: payload.undoToken }),
            }).catch(() => undefined);
          },
        },
        duration: FEEDBACK_TOKENS.undoToastDurationMs,
      });
      setLine(METRO_LINES[0]);
      setProblems([]);
      setCar("");
      startTransition(() => router.push(`/${locale}/explorar`));
    } catch {
      toast(dictionary.reportForm.submitFailed);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <LinePicker label={dictionary.reportForm.line} onChange={setLine} value={line} />
      <HeatSelector dictionary={dictionary} label={dictionary.reportForm.heatState} onChange={setProblems} value={problems} />

      <label className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {dictionary.reportForm.car}
          <InfoTooltip label={dictionary.reportForm.carHelp}>{dictionary.reportForm.carHelp}</InfoTooltip>
        </span>
        <input
          className="min-h-11 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-primary"
          onChange={(event) => setCar(event.target.value)}
          placeholder={dictionary.reportForm.carPlaceholder}
          ref={carInputRef}
          suppressHydrationWarning
          value={car}
        />
      </label>

      <p className="flex items-start gap-2 rounded-md border border-border bg-surface px-3 py-2 text-[0.6875rem] leading-4 text-muted/85">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted/85" />
        <span>{dictionary.reportForm.abuseReminder}</span>
      </p>

      {problems.length === 0 ? (
        <p className="text-xs text-muted" id={missingProblemsId}>
          {dictionary.reportForm.invalid}
        </p>
      ) : null}

      <Button
        className="home-report-action report-submit-action relative min-h-12 overflow-hidden"
        data-testid="submit-report"
        disabled={busy || problems.length === 0}
        onClick={requestSubmission}
        type="button"
      >
        {busy ? <span aria-hidden="true" className="report-button-spinner" /> : null}
        <span>{dictionary.reportForm.submit.calor}</span>
      </Button>
    </div>
  );
}

function getSubmissionErrorMessage(reason: ApiErrorReason, dictionary: Dictionary) {
  if (reason === "duplicate") return dictionary.reportForm.duplicate;
  if (reason === "rate_limited") return dictionary.reportForm.rateLimited;
  if (reason === "invalid") return dictionary.reportForm.invalid;
  return dictionary.reportForm.submitFailed;
}
