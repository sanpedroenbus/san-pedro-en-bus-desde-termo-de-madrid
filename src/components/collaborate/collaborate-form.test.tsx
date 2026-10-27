import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { messages as esMessages } from "@/lib/i18n/messages/es";
import { CollaborateForm } from "./collaborate-form";

const copy = esMessages.collaborate;

describe("CollaborateForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/");
  });

  it("shows every missing-field error beside its field, focuses the first, and sends nothing", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<CollaborateForm dictionary={esMessages} />);

    await user.click(screen.getByRole("button", { name: copy.submit }));

    expect(screen.getByText(copy.errors.missingInterest)).toBeInTheDocument();
    expect(screen.getByText(copy.errors.missingContact)).toBeInTheDocument();
    expect(screen.getByText(copy.errors.missingConsent)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: new RegExp(copy.interests.mapeo.title) })).toHaveFocus();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("flags an invalid WhatsApp number", async () => {
    const user = userEvent.setup();
    render(<CollaborateForm dictionary={esMessages} />);

    await user.type(screen.getByLabelText(copy.whatsapp), "123");
    await user.click(screen.getByRole("button", { name: copy.submit }));

    expect(screen.getByText(copy.errors.invalidWhatsapp)).toBeInTheDocument();
    expect(screen.getByLabelText(copy.whatsapp)).toHaveAttribute("aria-invalid", "true");
  });

  it("preselects the project from ?interes= and submits, then shows the success message", async () => {
    window.history.replaceState(null, "", "/es/colaborar?interes=seguimiento");
    const user = userEvent.setup();
    const fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ ok: true }) });
    vi.stubGlobal("fetch", fetch);
    render(<CollaborateForm dictionary={esMessages} />);

    await waitFor(() => expect(screen.getByRole("checkbox", { name: new RegExp(copy.interests.seguimiento.title) })).toBeChecked());
    await user.type(screen.getByLabelText(copy.email), "ana@ejemplo.cr");
    await user.click(screen.getByRole("checkbox", { name: copy.consent }));
    await user.click(screen.getByRole("button", { name: copy.submit }));

    expect(await screen.findByRole("status")).toHaveTextContent(copy.success);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      email: "ana@ejemplo.cr",
      whatsapp: "",
      interests: ["seguimiento"],
      consent: true,
    });
  });

  it("explains rate limiting without losing what the rider typed", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: () => Promise.resolve({ ok: false, reason: "rate_limited" }) }));
    render(<CollaborateForm dictionary={esMessages} />);

    await user.click(screen.getByRole("checkbox", { name: new RegExp(copy.interests.mapeo.title) }));
    await user.type(screen.getByLabelText(copy.whatsapp), "8888 8888");
    await user.click(screen.getByRole("checkbox", { name: copy.consent }));
    await user.click(screen.getByRole("button", { name: copy.submit }));

    expect(await screen.findByRole("alert")).toHaveTextContent(copy.errors.rateLimited);
    expect(screen.getByLabelText(copy.whatsapp)).toHaveValue("8888 8888");
  });
});
