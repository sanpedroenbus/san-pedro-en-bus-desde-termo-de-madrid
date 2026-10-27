import { toast } from "sonner";
import { FEEDBACK_TOKENS } from "@/lib/design/tokens";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Chromium-only event, not in the DOM typings.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "sanpedroenbus:installPromptDismissed";
let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Chromium fires beforeinstallprompt once, early in the page's life, so it has
// to be captured at app start and kept until a report is sent.
export function captureInstallPrompt() {
  const onPrompt = (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
  };
  const onInstalled = () => {
    deferredPrompt = null;
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export type InstallMode = "prompt" | "ios";

export function getInstallMode(): InstallMode | null {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone || isDismissed()) return null;
  if (deferredPrompt) return "prompt";
  // iOS has no install API: Share → Add to Home Screen is the only path. iPadOS reports itself as a Mac.
  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  return isIos ? "ios" : null;
}

export function offerInstall(dictionary: Dictionary) {
  const mode = getInstallMode();
  if (!mode) return;
  const copy = dictionary.installPrompt;
  toast(copy.title, {
    description: mode === "ios" ? copy.iosDescription : copy.description,
    action: mode === "prompt" ? { label: copy.add, onClick: () => void promptInstall() } : undefined,
    cancel: { label: copy.dismiss, onClick: dismissInstallPrompt },
    duration: FEEDBACK_TOKENS.installToastDurationMs,
  });
}

async function promptInstall() {
  const event = deferredPrompt;
  if (!event) return;
  deferredPrompt = null; // a prompt event can only be used once
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "dismissed") dismissInstallPrompt();
}

function dismissInstallPrompt() {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Without storage the prompt may reappear after the next report; harmless.
  }
}

function isDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}
