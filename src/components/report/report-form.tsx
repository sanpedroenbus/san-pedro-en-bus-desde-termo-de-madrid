"use client";

import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/tooltip";
import { FEEDBACK_TOKENS } from "@/lib/design/tokens";
import { normalizeUnitCode } from "@/lib/domain/reports";
import type { Problem } from "@/lib/domain/problems";
import type { Route } from "@/lib/domain/routes";
import { ROUTES } from "@/lib/domain/routes";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { ProblemSelector } from "./problem-selector";
import { clearReportCooldown, getReportCooldownRemainingMs, markReportSubmitted, REPORT_COOLDOWN_MS } from "./report-cooldown";
import { RoutePicker } from "./route-picker";

type ApiErrorReason = "duplicate" | "invalid" | "rate_limited" | "server_error";

type ApiResponse =
  | { ok: true; report: { id: string }; undoToken: string }
  | { ok: false; reason: ApiErrorReason };

export function ReportForm({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  const router = useRouter();
  const [route, setRoute] = useState<Route>(ROUTES[0]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [unit, setUnit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);
  const unitInputRef = useRef<HTMLInputElement>(null);
  const missingUnitDialogRef = useRef<HTMLDialogElement>(null);
  const cooldownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missingUnitTitleId = useId();
  const missingUnitDescriptionId = useId();

  const normalizedUnit = useMemo(() => normalizeUnitCode(unit), [unit]);
  const unitError = unit && !normalizedUnit ? dictionary.reportForm.unitInvalid : null;
  const busy = submitting || pending;
  const onCooldown = cooldownRemainingMs > 0;

  useEffect(() => {
    // Deferred to a callback (not called synchronously in the effect body) to
    // avoid the cascading-render lint warning -- localStorage is only
    // readable client-side anyway, so this can't run during the initial
    // server-rendered pass.
    const checkTimeout = setTimeout(() => {
      const remaining = getReportCooldownRemainingMs();
      if (remaining <= 0) return;
      setCooldownRemainingMs(remaining);
      cooldownTimeoutRef.current = setTimeout(() => setCooldownRemainingMs(0), remaining);
    }, 0);
    return () => {
      clearTimeout(checkTimeout);
      if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
    };
  }, []);

  function startCooldown() {
    if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
    markReportSubmitted();
    setCooldownRemainingMs(REPORT_COOLDOWN_MS);
    cooldownTimeoutRef.current = setTimeout(() => setCooldownRemainingMs(0), REPORT_COOLDOWN_MS);
  }

  function cancelCooldown() {
    if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
    clearReportCooldown();
    setCooldownRemainingMs(0);
  }

  function requestSubmission() {
    if (onCooldown) {
      toast(dictionary.reportForm.rateLimited);
      return;
    }

    if (problems.length === 0) {
      toast(dictionary.reportForm.invalid);
      return;
    }

    if (unitError) {
      toast(unitError);
      return;
    }

    if (!normalizedUnit) {
      openDialog(missingUnitDialogRef.current);
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
        body: JSON.stringify({ route, problems, unit: normalizedUnit }),
      });
      const payload = (await response.json()) as ApiResponse;

      if (!payload.ok) {
        toast(getSubmissionErrorMessage(payload.reason, dictionary));
        setSubmitting(false);
        return;
      }

      startCooldown();
      toast.success(dictionary.reportForm.success, {
        action: {
          label: dictionary.reportForm.undo,
          onClick: () => {
            fetch(`/api/reports/${payload.report.id}`, {
              method: "DELETE",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ undoToken: payload.undoToken }),
            })
              .then((response) => response.json())
              .then((body: { ok: boolean }) => {
                if (body.ok) cancelCooldown();
              })
              .catch(() => undefined);
          },
        },
        duration: FEEDBACK_TOKENS.undoToastDurationMs,
      });
      setRoute(ROUTES[0]);
      setProblems([]);
      setUnit("");
      startTransition(() => router.push(`/${locale}/explorar`));
    } catch {
      toast(dictionary.reportForm.submitFailed);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <RoutePicker label={dictionary.reportForm.route} onChange={setRoute} value={route} />
      <ProblemSelector dictionary={dictionary} label={dictionary.reportForm.problems} onChange={setProblems} value={problems} />

      <label className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {dictionary.reportForm.unit}
          <InfoTooltip label={dictionary.reportForm.unitHelp}>{dictionary.reportForm.unitHelp}</InfoTooltip>
        </span>
        <input
          className="min-h-11 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-primary"
          onChange={(event) => setUnit(event.target.value)}
          placeholder={dictionary.reportForm.unitPlaceholder}
          ref={unitInputRef}
          suppressHydrationWarning
          value={unit}
        />
        {unitError ? <span className="text-sm text-danger">{unitError}</span> : null}
      </label>

      <p className="flex items-start gap-2 rounded-md border border-border bg-surface px-3 py-2 text-[0.6875rem] leading-4 text-muted/85">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted/85" />
        <span>{dictionary.reportForm.abuseReminder}</span>
      </p>

      {problems.length === 0 ? <p className="text-xs text-muted">{dictionary.reportForm.invalid}</p> : null}

      <Button
        className="home-report-action report-submit-action relative min-h-12 overflow-hidden"
        data-testid="submit-report"
        disabled={busy || onCooldown || problems.length === 0 || Boolean(unitError)}
        onClick={requestSubmission}
        type="button"
      >
        {busy ? <span aria-hidden="true" className="report-button-spinner" /> : null}
        <span>{dictionary.reportForm.submit}</span>
      </Button>

      <dialog
        aria-describedby={missingUnitDescriptionId}
        aria-labelledby={missingUnitTitleId}
        className="fixed left-1/2 top-1/2 z-[var(--z-modal)] max-h-[calc(100dvh-2rem)] w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-surface-raised p-0 text-foreground shadow-[var(--shadow-popover)] backdrop:bg-foreground/30"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog(missingUnitDialogRef.current);
        }}
        ref={missingUnitDialogRef}
      >
        <div className="p-4 sm:p-5">
          <h2 className="text-base font-semibold" id={missingUnitTitleId}>
            {dictionary.reportForm.missingUnit.title}
          </h2>
          <p className="mt-2 text-sm leading-5 text-muted" id={missingUnitDescriptionId}>
            {dictionary.reportForm.missingUnit.description}
          </p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              onClick={() => {
                closeDialog(missingUnitDialogRef.current);
                void submitReport();
              }}
              type="button"
              variant="secondary"
            >
              {dictionary.reportForm.missingUnit.confirm}
            </Button>
            <Button
              autoFocus
              onClick={() => {
                closeDialog(missingUnitDialogRef.current);
                requestAnimationFrame(() => unitInputRef.current?.focus());
              }}
              type="button"
            >
              {dictionary.reportForm.missingUnit.addUnit}
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function openDialog(dialog: HTMLDialogElement | null) {
  if (!dialog || dialog.open) return;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }
  dialog.setAttribute("open", "");
}

function closeDialog(dialog: HTMLDialogElement | null) {
  if (!dialog?.open) return;
  if (typeof dialog.close === "function") {
    dialog.close();
    return;
  }
  dialog.removeAttribute("open");
}

function getSubmissionErrorMessage(reason: ApiErrorReason, dictionary: Dictionary) {
  if (reason === "duplicate") return dictionary.reportForm.duplicate;
  if (reason === "rate_limited") return dictionary.reportForm.rateLimited;
  if (reason === "invalid") return dictionary.reportForm.invalid;
  return dictionary.reportForm.submitFailed;
}
