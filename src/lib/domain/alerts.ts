import { ROUTE_LABELS, type Route } from "./routes";

// Push alerts to the project owner (ntfy), not app UI copy.
export const ALERT_MILESTONE_EVERY = 50;
// shortcut: picked without real traffic data; retune once a few weeks of volume exist.
export const ALERT_SPIKE_REPORTS = 10;
export const ALERT_SPIKE_WINDOW_MINUTES = 60;

export type ReportAlert = { title: string; message: string; tags: string[] };

export function getReportAlerts(route: Route, totalReports: number, routeReportsInWindow: number): ReportAlert[] {
  const alerts: ReportAlert[] = [];
  if (totalReports > 0 && totalReports % ALERT_MILESTONE_EVERY === 0) {
    alerts.push({ title: `${totalReports} reportes`, message: `San Pedro en Bus llegó a ${totalReports} reportes.`, tags: ["bus"] });
  }
  // Equality, not >=: alert once when the route crosses the threshold, not on every report after it.
  if (routeReportsInWindow === ALERT_SPIKE_REPORTS) {
    alerts.push({
      title: `Pico de reportes: ${ROUTE_LABELS[route]}`,
      message: `${routeReportsInWindow} reportes en ${ROUTE_LABELS[route]} en los últimos ${ALERT_SPIKE_WINDOW_MINUTES} minutos.`,
      tags: ["warning"],
    });
  }
  return alerts;
}
