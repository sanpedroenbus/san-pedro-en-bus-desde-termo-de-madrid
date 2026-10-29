import "server-only";
import { ALERT_SPIKE_WINDOW_MINUTES, getReportAlerts } from "@/lib/domain/alerts";
import type { Route } from "@/lib/domain/routes";
import { countReportsForAlerts } from "./reports-repository";

const NTFY_TIMEOUT_MS = 5_000;

// Pushes milestone/spike alerts to the owner's ntfy topic. Off unless NTFY_TOPIC
// is set. Alerts carry counts and route names only: never report or contact data.
export async function sendReportAlerts(route: Route, now = new Date()) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;
  const since = new Date(now.getTime() - ALERT_SPIKE_WINDOW_MINUTES * 60_000);
  const { total, routeRecent } = await countReportsForAlerts(route, since);
  const server = process.env.NTFY_SERVER || "https://ntfy.sh";
  await Promise.all(
    getReportAlerts(route, total, routeRecent).map(async (alert) => {
      // JSON publishing, so accented route names survive (ntfy headers are not UTF-8 safe).
      const response = await fetch(server, {
        method: "POST",
        body: JSON.stringify({ topic, ...alert }),
        signal: AbortSignal.timeout(NTFY_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`ntfy responded ${response.status}`);
    }),
  );
}
