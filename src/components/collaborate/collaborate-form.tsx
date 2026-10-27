"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  COLLABORATION_INTERESTS,
  normalizeEmail,
  normalizeWhatsapp,
  type CollaborationInterest,
} from "@/lib/domain/collaborators";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type Field = "interests" | "contact" | "email" | "whatsapp" | "consent";
type Errors = Partial<Record<Field | "form", string>>;

const FIELD_IDS: Record<Field, string> = {
  interests: "collaborate-interest-mapeo",
  contact: "collaborate-email",
  email: "collaborate-email",
  whatsapp: "collaborate-whatsapp",
  consent: "collaborate-consent",
};

const INPUT_CLASS =
  "min-h-11 rounded-md border border-border bg-background px-3 py-2 text-base text-foreground outline-none transition focus:border-primary focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-primary aria-[invalid=true]:border-danger";

export function CollaborateForm({ dictionary }: { dictionary: Dictionary }) {
  const copy = dictionary.collaborate;
  const [interests, setInterests] = useState<CollaborationInterest[]>([]);
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  useEffect(() => {
    // Preselect the project the rider came from (?interes=seguimiento). Deferred
    // to a callback like ReportForm's storage read: the URL is client-only here.
    const timeout = setTimeout(() => {
      const requested = new URLSearchParams(window.location.search).get("interes");
      const match = COLLABORATION_INTERESTS.find((interest) => interest === requested);
      if (match) setInterests([match]);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  function validate(): Errors {
    const next: Errors = {};
    if (interests.length === 0) next.interests = copy.errors.missingInterest;
    if (!email.trim() && !whatsapp.trim()) next.contact = copy.errors.missingContact;
    if (email.trim() && !normalizeEmail(email)) next.email = copy.errors.invalidEmail;
    if (whatsapp.trim() && !normalizeWhatsapp(whatsapp)) next.whatsapp = copy.errors.invalidWhatsapp;
    if (!consent) next.consent = copy.errors.missingConsent;
    return next;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    const firstInvalid = (Object.keys(FIELD_IDS) as Field[]).find((field) => nextErrors[field]);
    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus();
      return;
    }

    setStatus("submitting");
    try {
      const response = await fetch("/api/collaborators", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, whatsapp, interests, consent }),
      });
      const payload = (await response.json()) as { ok: boolean; reason?: string };
      if (payload.ok) {
        setStatus("done");
        return;
      }
      setErrors({ form: payload.reason === "rate_limited" ? copy.errors.rateLimited : copy.errors.failed });
    } catch {
      setErrors({ form: copy.errors.failed });
    }
    setStatus("idle");
  }

  if (status === "done") {
    return (
      <p className="rounded-md border border-primary bg-primary/10 p-4 text-sm font-semibold text-foreground" role="status">
        {copy.success}
      </p>
    );
  }

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={(event) => void submit(event)}>
      <fieldset className="flex flex-col gap-2" aria-describedby={errors.interests ? "collaborate-interests-error" : undefined}>
        <legend className="mb-2 text-sm font-semibold">{copy.interestsLegend}</legend>
        {COLLABORATION_INTERESTS.map((interest) => (
          <label
            className="flex min-h-11 cursor-pointer gap-3 rounded-md border border-border bg-surface-raised p-3 transition duration-200 ease-out hover:bg-surface has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
            key={interest}
          >
            <input
              checked={interests.includes(interest)}
              className="mt-0.5 size-[18px] shrink-0 accent-[var(--primary)] outline-none"
              id={`collaborate-interest-${interest}`}
              onChange={(event) =>
                setInterests((current) =>
                  event.target.checked ? [...current, interest] : current.filter((value) => value !== interest),
                )
              }
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-semibold text-foreground">{copy.interests[interest].title}</span>
              <span className="mt-1 block text-sm leading-5 text-muted">{copy.interests[interest].description}</span>
            </span>
          </label>
        ))}
        {errors.interests ? (
          <span className="text-sm text-danger" id="collaborate-interests-error">
            {errors.interests}
          </span>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold">{copy.contactLegend}</legend>
        <p className="-mt-1 text-sm text-muted">{copy.contactHelp}</p>
        <label className="flex flex-col gap-2" htmlFor="collaborate-email">
          <span className="text-sm font-semibold">{copy.email}</span>
          <input
            aria-describedby={errors.email || errors.contact ? "collaborate-contact-error" : undefined}
            aria-invalid={Boolean(errors.email || errors.contact)}
            autoCapitalize="none"
            autoComplete="email"
            className={INPUT_CLASS}
            id="collaborate-email"
            inputMode="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.emailPlaceholder}
            spellCheck={false}
            type="email"
            value={email}
          />
        </label>
        <label className="flex flex-col gap-2" htmlFor="collaborate-whatsapp">
          <span className="text-sm font-semibold">{copy.whatsapp}</span>
          <input
            aria-describedby={errors.whatsapp ? "collaborate-whatsapp-error" : undefined}
            aria-invalid={Boolean(errors.whatsapp)}
            autoComplete="tel"
            className={INPUT_CLASS}
            id="collaborate-whatsapp"
            inputMode="tel"
            name="whatsapp"
            onChange={(event) => setWhatsapp(event.target.value)}
            placeholder={copy.whatsappPlaceholder}
            type="tel"
            value={whatsapp}
          />
        </label>
        {errors.email || errors.contact ? (
          <span className="text-sm text-danger" id="collaborate-contact-error">
            {errors.email ?? errors.contact}
          </span>
        ) : null}
        {errors.whatsapp ? (
          <span className="text-sm text-danger" id="collaborate-whatsapp-error">
            {errors.whatsapp}
          </span>
        ) : null}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-foreground" htmlFor="collaborate-consent">
          <input
            aria-describedby={errors.consent ? "collaborate-consent-error" : undefined}
            aria-invalid={Boolean(errors.consent)}
            checked={consent}
            className="mt-0.5 size-[18px] shrink-0 accent-[var(--primary)]"
            id="collaborate-consent"
            onChange={(event) => setConsent(event.target.checked)}
            type="checkbox"
          />
          {copy.consent}
        </label>
        {errors.consent ? (
          <span className="text-sm text-danger" id="collaborate-consent-error">
            {errors.consent}
          </span>
        ) : null}
        <p className="text-xs leading-5 text-muted">{copy.privacy}</p>
      </div>

      {errors.form ? (
        <p className="text-sm text-danger" role="alert">
          {errors.form}
        </p>
      ) : null}

      <Button disabled={status === "submitting"} type="submit">
        {status === "submitting" ? copy.submitting : copy.submit}
      </Button>
    </form>
  );
}
