import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.fn();
vi.mock("sonner", () => ({ toast }));

const { messages: esMessages } = await import("@/lib/i18n/messages/es");

const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36";

function setEnvironment({ userAgent, standalone = false }: { userAgent: string; standalone?: boolean }) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: standalone && query === "(display-mode: standalone)" }));
}

function fireBeforeInstallPrompt(outcome: "accepted" | "dismissed" = "accepted") {
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  });
  window.dispatchEvent(event);
  return event;
}

// Fresh module per test: the captured prompt event is module state.
async function loadModule() {
  vi.resetModules();
  return import("./install-prompt");
}

describe("install prompt", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    localStorage.clear();
    toast.mockReset();
  });

  afterEach(() => {
    cleanup?.();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("offers the native install button once Chromium has fired beforeinstallprompt", async () => {
    setEnvironment({ userAgent: ANDROID_UA });
    const { captureInstallPrompt, offerInstall } = await loadModule();
    cleanup = captureInstallPrompt();
    const event = fireBeforeInstallPrompt();

    expect(event.defaultPrevented).toBe(true);
    offerInstall(esMessages);

    expect(toast).toHaveBeenCalledTimes(1);
    const [title, options] = toast.mock.calls[0];
    expect(title).toBe(esMessages.installPrompt.title);
    expect(options.description).toBe(esMessages.installPrompt.description);
    expect(options.action.label).toBe(esMessages.installPrompt.add);

    options.action.onClick();
    expect(event.prompt).toHaveBeenCalledTimes(1);
  });

  it("shows Share-menu instructions on iOS, which has no install API", async () => {
    setEnvironment({ userAgent: IPHONE_UA });
    const { offerInstall } = await loadModule();

    offerInstall(esMessages);

    const [, options] = toast.mock.calls[0];
    expect(options.description).toBe(esMessages.installPrompt.iosDescription);
    expect(options.action).toBeUndefined();
  });

  it("stays silent when already installed, on browsers that can't install, or after the rider said no", async () => {
    setEnvironment({ userAgent: IPHONE_UA, standalone: true });
    let mod = await loadModule();
    mod.offerInstall(esMessages);

    setEnvironment({ userAgent: ANDROID_UA }); // no beforeinstallprompt fired
    mod = await loadModule();
    mod.offerInstall(esMessages);

    expect(toast).not.toHaveBeenCalled();

    setEnvironment({ userAgent: IPHONE_UA });
    mod = await loadModule();
    mod.offerInstall(esMessages);
    toast.mock.calls[0][1].cancel.onClick();
    mod.offerInstall(esMessages);

    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("remembers a dismissal from the native install dialog too", async () => {
    setEnvironment({ userAgent: ANDROID_UA });
    const { captureInstallPrompt, offerInstall } = await loadModule();
    cleanup = captureInstallPrompt();
    fireBeforeInstallPrompt("dismissed");

    offerInstall(esMessages);
    await toast.mock.calls[0][1].action.onClick();
    await vi.waitFor(() => expect(localStorage.getItem("sanpedroenbus:installPromptDismissed")).toBe("1"));
  });
});
