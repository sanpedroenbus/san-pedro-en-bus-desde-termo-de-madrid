"use client";

import { useEffect } from "react";
import { captureInstallPrompt } from "./install-prompt";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
    }
    return captureInstallPrompt();
  }, []);

  return null;
}
